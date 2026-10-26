import { useCallback } from 'react'
import { experimental_generateSpeech as generateSpeech } from 'ai'
import { useOndai } from '../context'
import type { ProviderId } from '../types'
import { useTask, type TaskController } from './use-task'

export interface SpeakState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  isSynthesizing: boolean
  /** Returns audio bytes (WAV on Apple). Play them with expo-audio / expo-av. */
  synthesize: (text: string, options?: { language?: string; voice?: string }) => Promise<{ audio: Uint8Array; mediaType: string }>
}

/** On-device text-to-speech (AVSpeechSynthesizer on iOS). */
export function useSpeak(options: { localOnly?: boolean; provider?: ProviderId; component?: string } = {}): SpeakState {
  const ondai = useOndai()
  const task = useTask(options.component)
  const synthesize = useCallback(
    async (text: string, opts: { language?: string; voice?: string } = {}) =>
      task.execute(
        'speech',
        async (ctx) => {
          const model = ctx.resolved.adapter.speechModel!({ language: opts.language })
          const r = await generateSpeech({ model, text, voice: opts.voice, abortSignal: ctx.signal })
          return { audio: r.audio.uint8Array, mediaType: r.audio.mediaType }
        },
        { localOnly: options.localOnly, provider: options.provider },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, ondai, options.localOnly, options.provider],
  )
  return { ...task, isSynthesizing: task.status === 'thinking', synthesize }
}
