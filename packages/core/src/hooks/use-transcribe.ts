import { useCallback, useState } from 'react'
import { experimental_transcribe as transcribe } from 'ai'
import { useOndai } from '../context'
import type { ProviderId } from '../types'
import { useTask, type TaskController } from './use-task'

export interface TranscribeResult {
  text: string
  segments: Array<{ text: string; startSecond: number; endSecond: number }>
  durationInSeconds?: number
}

export interface TranscribeState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  text: string
  isTranscribing: boolean
  transcribe: (audio: Uint8Array | ArrayBuffer | string, options?: { language?: string }) => Promise<TranscribeResult>
}

/** On-device speech-to-text (Apple SpeechAnalyzer on iOS 26+). Audio is WAV/PCM bytes or base64. */
export function useTranscribe(options: { localOnly?: boolean; provider?: ProviderId; component?: string } = {}): TranscribeState {
  const ondai = useOndai()
  const task = useTask(options.component)
  const [text, setText] = useState('')
  const run = useCallback(
    async (audio: Uint8Array | ArrayBuffer | string, opts: { language?: string } = {}) =>
      task.execute(
        'transcription',
        async (ctx) => {
          const model = ctx.resolved.adapter.transcriptionModel!({ language: opts.language })
          const r = await transcribe({ model, audio: audio instanceof ArrayBuffer ? new Uint8Array(audio) : audio, abortSignal: ctx.signal })
          setText(r.text)
          return { text: r.text, segments: r.segments, durationInSeconds: r.durationInSeconds }
        },
        { localOnly: options.localOnly, provider: options.provider },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, ondai, options.localOnly, options.provider],
  )
  return { ...task, text, isTranscribing: task.status === 'thinking', transcribe: run, reset: () => (task.reset(), setText('')) }
}
