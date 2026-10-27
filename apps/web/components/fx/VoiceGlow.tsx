'use client'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { clamp01, ease, ION, mixRgb, rgba, toRgb, useCanvasLoop } from './visible'

/**
 * VoiceGlow: light rising from the bottom edge of the input it wraps.
 *
 * Canvas 2D on top of the child (pointer-events: none), clipped to the child's rounded box.
 * The bloom is a stack of soft horizontal gradients in the three colours plus a white core, widest at
 * the base, drifting slowly sideways; its height follows `level` through an attack/release envelope
 * (~60 ms / ~250 ms). While `processing` the bloom narrows into a beam sweeping left and right.
 * `active=false` fades everything out over ~400 ms. A faint outer glow spills under the box.
 */

export interface VoiceGlowProps {
  /** Input level 0–1 (number or getter). Ignored when `stream` is given. */
  level?: number | (() => number)
  /** A microphone stream; an AnalyserNode is built and RMS of the time-domain samples drives the glow. */
  stream?: MediaStream | null
  /** The reply is being thought through: the bloom becomes a sweeping beam. */
  processing?: boolean
  /** Default true. False fades the glow out. */
  active?: boolean
  colors?: [string, string, string]
  /** Overall intensity 0–1. Default 0.85. */
  strength?: number
  /** Corner radius of the child box. Read from `getComputedStyle(child).borderRadius` when omitted. */
  radius?: number
  className?: string
  children: ReactNode
}

const PAD = 48
const ATTACK = 0.06
const RELEASE = 0.25

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

/** Draw a unit radial gradient stretched to an ellipse. */
function ellipseGlow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: [number, number, number], a: number, white = false) {
  if (rx <= 0 || ry <= 0 || a <= 0.002) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  if (white) {
    g.addColorStop(0, `rgba(255,255,255,${Math.min(1, a)})`)
    g.addColorStop(0.3, rgba(col, a * 0.6))
    g.addColorStop(1, rgba(col, 0))
  } else {
    g.addColorStop(0, rgba(col, a))
    g.addColorStop(0.4, rgba(col, a * 0.45))
    g.addColorStop(1, rgba(col, 0))
  }
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

export function VoiceGlow({ level, stream, processing = false, active = true, colors, strength = 0.85, radius, className, children }: VoiceGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const live = useRef({ level, processing, active, colors, strength, radius })
  live.current = { level, processing, active, colors, strength, radius }

  const sim = useRef({ env: 0, on: 0, proc: 0, sweep: 0, buf: null as Float32Array<ArrayBuffer> | null, analyser: null as AnalyserNode | null, w: 0, h: 0, cssRadius: 0 })

  // Keep the canvas around the child's own box (not the wrapper) plus padding, and remember its border radius.
  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    if (!box || !canvas) return
    const measure = () => {
      const child = (box.firstElementChild as HTMLElement | null) ?? box
      const wr = box.getBoundingClientRect()
      const r = child.getBoundingClientRect()
      sim.current.w = r.width
      sim.current.h = r.height
      const br = parseFloat(getComputedStyle(child).borderRadius || '0')
      sim.current.cssRadius = Number.isFinite(br) ? br : 0
      canvas.style.left = `${r.left - wr.left - PAD}px`
      canvas.style.top = `${r.top - wr.top - PAD}px`
      canvas.style.width = `${r.width + PAD * 2}px`
      canvas.style.height = `${r.height + PAD * 2}px`
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    if (box.firstElementChild) ro.observe(box.firstElementChild)
    return () => ro.disconnect()
  }, [])

  // Microphone analyser.
  useEffect(() => {
    if (!stream) return
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ac = new Ctx()
    const analyser = ac.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0
    const src = ac.createMediaStreamSource(stream)
    src.connect(analyser)
    const s = sim.current
    s.analyser = analyser
    s.buf = new Float32Array(analyser.fftSize)
    if (ac.state === 'suspended') void ac.resume().catch(() => {})
    return () => {
      s.analyser = null
      s.buf = null
      src.disconnect()
      void ac.close().catch(() => {})
    }
  }, [stream])

  useCanvasLoop(canvasRef, {
    draw(ctx, _cw, _ch, t, dt) {
      const s = sim.current
      const L = live.current
      const w = s.w
      const h = s.h
      if (w <= 0 || h <= 0) return

      // Level: analyser RMS, or the prop.
      let want = 0
      if (s.analyser && s.buf) {
        s.analyser.getFloatTimeDomainData(s.buf)
        let sum = 0
        for (let i = 0; i < s.buf.length; i++) sum += s.buf[i] * s.buf[i]
        want = clamp01(Math.sqrt(sum / s.buf.length) * 4.5)
      } else if (typeof L.level === 'function') want = clamp01(L.level())
      else if (typeof L.level === 'number') want = clamp01(L.level)

      s.env = ease(s.env, want, dt, want > s.env ? ATTACK : RELEASE)
      s.on = ease(s.on, L.active ? 1 : 0, dt, 0.13)
      s.proc = ease(s.proc, L.processing ? 1 : 0, dt, 0.16)
      if (s.proc > 0.01) s.sweep += dt * 1.5
      if (s.on < 0.004) return

      const palette = (L.colors ?? ION).map(toRgb) as [[number, number, number], [number, number, number], [number, number, number]]
      const k = clamp01(L.strength) * s.on
      const r = L.radius ?? s.cssRadius
      const env = s.env
      const bloomMix = 1 - s.proc
      const blend = mixRgb(mixRgb(palette[0], palette[1], 0.5), palette[2], 0.3)

      ctx.translate(PAD, PAD)
      ctx.globalCompositeOperation = 'lighter'

      // Soft glow spilling under the box (not clipped).
      const spill = 0.16 * k * (0.5 + env * 0.5 * bloomMix + s.proc * 0.4)
      ellipseGlow(ctx, w / 2, h + 2, w * 0.55, 16 + h * 0.5 * env, blend, spill)

      ctx.save()
      roundedRect(ctx, 0, 0, w, h, r)
      ctx.clip()

      // Bloom: three colours stacked, widest at the base, drifting sideways; white core; bright base line.
      if (bloomMix > 0.01) {
        const H = h * (0.22 + 0.95 * env)
        const ka = k * bloomMix
        for (let i = 0; i < 3; i++) {
          const drift = Math.sin(t * (0.23 + i * 0.07) + i * 2.1) * w * 0.12
          const x = w * (0.22 + 0.28 * i) + drift
          const rx = w * (0.42 + 0.1 * Math.sin(t * 0.31 + i))
          const ry = H * (0.85 + 0.2 * Math.sin(t * 0.9 + i * 1.7))
          ellipseGlow(ctx, x, h + H * 0.1, rx, ry, palette[i], 0.5 * ka * (0.55 + env * 0.45))
        }
        const coreX = w / 2 + Math.sin(t * 0.37) * w * 0.08
        ellipseGlow(ctx, coreX, h + 2, w * 0.28, H * 0.5, mixRgb(palette[0], palette[1], 0.5), 0.5 * ka * (0.4 + env * 0.6), true)
        // The source: a thin bright line along the bottom edge.
        const line = ctx.createLinearGradient(0, 0, w, 0)
        line.addColorStop(0, rgba(palette[0], 0))
        line.addColorStop(0.2, rgba(palette[0], 0.9 * ka))
        line.addColorStop(0.5, `rgba(255,255,255,${0.9 * ka})`)
        line.addColorStop(0.8, rgba(palette[2], 0.9 * ka))
        line.addColorStop(1, rgba(palette[2], 0))
        ctx.fillStyle = line
        ctx.fillRect(0, h - 1.5, w, 1.5)
      }

      // Processing beam: a narrow column sweeping left and right, with a chromatic split and a tail.
      if (s.proc > 0.01) {
        const kb = k * s.proc
        const u = 0.5 + 0.42 * Math.sin(s.sweep)
        const vel = Math.cos(s.sweep)
        const x = w * u
        const H = h * 0.95
        const tail = -vel * w * 0.12
        ellipseGlow(ctx, x + tail, h, w * 0.14, H * 0.8, blend, 0.28 * kb)
        ellipseGlow(ctx, x - 5, h, w * 0.06, H, palette[0], 0.5 * kb)
        ellipseGlow(ctx, x + 5, h, w * 0.06, H, palette[2], 0.5 * kb)
        ellipseGlow(ctx, x, h, w * 0.045, H * 0.9, palette[1], 0.55 * kb)
        ellipseGlow(ctx, x, h, w * 0.02, H * 0.6, palette[1], 0.9 * kb, true)
        const line = ctx.createLinearGradient(x - w * 0.2, 0, x + w * 0.2, 0)
        line.addColorStop(0, 'rgba(255,255,255,0)')
        line.addColorStop(0.5, `rgba(255,255,255,${0.95 * kb})`)
        line.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = line
        ctx.fillRect(x - w * 0.2, h - 1.5, w * 0.4, 1.5)
      }

      ctx.restore()
    },
  })

  return (
    <div className={className} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: 'absolute', left: -PAD, top: -PAD, pointerEvents: 'none', display: 'block', zIndex: 1 }}
      />
      <div ref={boxRef} style={{ position: 'relative', zIndex: 0 }}>
        {children}
      </div>
    </div>
  )
}

export interface Microphone {
  stream: MediaStream | null
  /** Current input level 0–1, read on demand (no re-renders). */
  level: () => number
  /** Call from a user gesture: asks for the microphone. */
  start: () => Promise<void>
  /** Releases the tracks. */
  stop: () => void
  error: string | null
  active: boolean
}

/** Microphone access with a ref-backed level getter. `start` must come from a user gesture. */
export function useMicrophone(): Microphone {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audio = useRef<{ ac: AudioContext; analyser: AnalyserNode; buf: Float32Array<ArrayBuffer>; src: MediaStreamAudioSourceNode } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const teardown = useCallback(() => {
    const a = audio.current
    if (a) {
      a.src.disconnect()
      void a.ac.close().catch(() => {})
      audio.current = null
    }
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
  }, [])

  const stop = useCallback(() => {
    teardown()
    setStream(null)
  }, [teardown])

  const start = useCallback(async () => {
    setError(null)
    if (streamRef.current) return
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not available')
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      streamRef.current = s
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        const ac = new Ctx()
        const analyser = ac.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0
        const src = ac.createMediaStreamSource(s)
        src.connect(analyser)
        audio.current = { ac, analyser, buf: new Float32Array(analyser.fftSize), src }
        if (ac.state === 'suspended') await ac.resume().catch(() => {})
      }
      s.getTracks().forEach((tr) => tr.addEventListener('ended', stop))
      setStream(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone blocked')
    }
  }, [stop])

  const level = useCallback(() => {
    const a = audio.current
    if (!a) return 0
    a.analyser.getFloatTimeDomainData(a.buf)
    let sum = 0
    for (let i = 0; i < a.buf.length; i++) sum += a.buf[i] * a.buf[i]
    return clamp01(Math.sqrt(sum / a.buf.length) * 4.5)
  }, [])

  useEffect(() => teardown, [teardown])

  return { stream, level, start, stop, error, active: stream !== null }
}

export default VoiceGlow
