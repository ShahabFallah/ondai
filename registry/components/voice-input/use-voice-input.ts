import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Easing, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'
import { useLocalModel, useTranscribe, type Availability } from '@ondai/core'

/**
 * Audio capture is not part of the registry allowlist, so the app injects it.
 * Wrap expo-audio, react-native-audio-record or your own native module in this shape.
 */
export interface Recorder {
  start(): Promise<void>
  /** Resolves with WAV/PCM bytes or a base64 string for `useTranscribe`. */
  stop(): Promise<Uint8Array | string>
  /** Subscribe to the input level (0–1, ~20–60 Hz). Returns an unsubscribe. */
  onLevel?(cb: (level: number) => void): () => void
}

export type VoiceInputStatus = 'idle' | 'listening' | 'thinking' | 'done' | 'unavailable' | 'error'

export interface UseVoiceInputOptions {
  /** Audio capture. Without one a simulated recorder runs (synthetic level, empty buffer), so demos and the mock just work. */
  recorder?: Recorder
  /** BCP-47 language hint for the transcription model. */
  language?: string
  onTranscript?: (text: string) => void
  localOnly?: boolean
  component?: string
}

export interface VoiceInputState {
  status: VoiceInputStatus
  /** Smoothed input level 0–1 as a Reanimated shared value (read it on the UI thread, never in render). */
  level: SharedValue<number>
  transcript: string
  start: () => Promise<void>
  /** Stops capture and transcribes. Resolves with the transcript ('' on error). */
  stop: () => Promise<string>
  reset: () => void
  error: Error | null
  availability: Availability | undefined
  /** True when no recorder was injected and the simulated one is running. */
  simulated: boolean
}

type Phase = 'idle' | 'listening' | 'thinking' | 'done'

/** Push-to-talk: capture with the injected recorder, transcribe on device with `useTranscribe`, expose a UI-thread level. */
export function useVoiceInput(options: UseVoiceInputOptions = {}): VoiceInputState {
  const { recorder, language, onTranscript, localOnly, component = 'voice-input' } = options
  const model = useLocalModel('transcription', { localOnly })
  const tr = useTranscribe({ localOnly, component })
  const rec = useMemo(() => recorder ?? simulatedRecorder(), [recorder])
  const [phase, setPhase] = useState<Phase>('idle')
  const [recError, setRecError] = useState<Error | null>(null)
  const level = useSharedValue(0)
  const unsubRef = useRef<(() => void) | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript
  const mounted = useRef(true)

  const setPhaseSafe = useCallback((p: Phase) => {
    phaseRef.current = p
    if (mounted.current) setPhase(p)
  }, [])
  // Read through a function so TypeScript does not narrow the ref across awaits.
  const phaseIs = (p: Phase) => phaseRef.current === p
  const levelTo = (v: number, ms: number) => {
    level.value = withTiming(v, { duration: ms, easing: Easing.out(Easing.cubic) })
  }

  const detach = useCallback(() => {
    unsubRef.current?.()
    unsubRef.current = null
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      // Defer so React StrictMode's simulated unmount/remount does not stop a capture that just started.
      setTimeout(() => {
        if (mounted.current) return
        detach()
        if (phaseRef.current === 'listening') void rec.stop().catch(() => {})
      }, 0)
    }
  }, [rec, detach])

  const unavailable = tr.status === 'unavailable' || tr.error?.kind === 'unavailable' || model.availability?.status === 'unavailable'

  const start = useCallback(async () => {
    if (phaseRef.current === 'listening' || phaseRef.current === 'thinking') return
    if (model.availability?.status === 'unavailable') return
    setRecError(null)
    tr.reset()
    setPhaseSafe('listening')
    try {
      await rec.start()
    } catch (e) {
      setRecError(e instanceof Error ? e : new Error(String(e)))
      setPhaseSafe('idle')
      return
    }
    if (!phaseIs('listening')) return
    detach()
    unsubRef.current = rec.onLevel?.((l) => levelTo(Math.max(0, Math.min(1, l)), 80)) ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, model.availability?.status, detach, setPhaseSafe])

  const stop = useCallback(async () => {
    if (!phaseIs('listening')) return tr.text
    detach()
    setPhaseSafe('thinking')
    levelTo(0, 320)
    try {
      const audio = await rec.stop()
      if (!phaseIs('thinking')) return ''
      const r = await tr.transcribe(audio, { language })
      if (!phaseIs('thinking')) return ''
      setPhaseSafe('done')
      onTranscriptRef.current?.(r.text)
      return r.text
    } catch (e) {
      if (!(e && typeof e === 'object' && 'kind' in e)) setRecError(e instanceof Error ? e : new Error(String(e)))
      setPhaseSafe('idle')
      return ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, tr.transcribe, language, detach, setPhaseSafe])

  const reset = useCallback(() => {
    detach()
    if (phaseIs('listening')) void rec.stop().catch(() => {})
    tr.reset()
    setRecError(null)
    levelTo(0, 200)
    setPhaseSafe('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, tr.reset, detach, setPhaseSafe])

  const status: VoiceInputStatus =
    phase === 'listening' || phase === 'thinking' ? phase : phase === 'done' ? 'done' : unavailable ? 'unavailable' : tr.error || recError ? 'error' : 'idle'

  return {
    status,
    level,
    transcript: phase === 'done' ? tr.text : '',
    start,
    stop,
    reset,
    error: tr.error ?? recError,
    availability: model.availability,
    simulated: !recorder,
  }
}

export interface SimulatedRecorderOptions {
  /** Level sample interval in ms (default 50). */
  intervalMs?: number
  /** Seed for the synthetic speech envelope (deterministic per seed). */
  seed?: number
  /** How long `stop()` takes to hand back audio. `Infinity` never resolves (demos of the thinking state). */
  stopDelayMs?: number
}

/**
 * A recorder that captures nothing: it emits a smoothed, speech-like level (syllables, words, pauses)
 * and resolves `stop()` with an empty buffer, so the mock transcription model can answer.
 */
export function simulatedRecorder(options: SimulatedRecorderOptions = {}): Recorder {
  const { intervalMs = 50, seed = 1, stopDelayMs = 0 } = options
  const listeners = new Set<(level: number) => void>()
  let timer: ReturnType<typeof setInterval> | null = null
  let startedAt = 0
  let noise = 0
  let rnd = mulberry(seed)
  const tickLevel = () => {
    const ms = Date.now() - startedAt
    noise = noise * 0.82 + (rnd() - 0.5) * 0.36
    const l = speechLevel(ms, seed) + noise * 0.14
    const v = Math.max(0.02, Math.min(1, l))
    for (const cb of listeners) cb(v)
  }
  return {
    async start() {
      startedAt = Date.now()
      rnd = mulberry(seed)
      noise = 0
      if (timer) clearInterval(timer)
      timer = setInterval(tickLevel, intervalMs)
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
      if (!Number.isFinite(stopDelayMs)) return new Promise<Uint8Array>(() => {})
      return new Promise<Uint8Array>((resolve) => setTimeout(() => resolve(new Uint8Array(0)), stopDelayMs))
    },
    onLevel(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
  }
}

/** Deterministic speech-like envelope in 0–1 for a time offset: syllables (~5 Hz) inside words (~1.2 Hz) inside phrases with pauses. */
export function speechLevel(ms: number, seed = 1): number {
  const s = seed * 0.37
  const syl = 0.5 + 0.5 * Math.sin((ms / 190) * Math.PI * 2 + s)
  const word = 0.55 + 0.45 * Math.sin((ms / 830) * Math.PI * 2 + s * 2.1)
  const phraseWave = Math.sin((ms / 3600) * Math.PI * 2 + s * 3.3)
  const phrase = phraseWave > -0.6 ? 1 : 0.12 + 0.88 * Math.max(0, (phraseWave + 0.8) / 0.2)
  return 0.08 + 0.86 * Math.pow(syl, 0.8) * word * phrase
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
