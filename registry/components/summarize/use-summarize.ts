import { useCallback, useRef, useState } from 'react'
import { generateText, streamText } from '@ondai/core'
import { estimateTokens, mapReduce, useOndai, useTask, type TaskController } from '@ondai/core'
import { cleanSummary, mapInstructions, reduceInstructions, summarizeInstructions, type SummaryLength } from './prompts'

export interface UseSummarizeOptions {
  length?: SummaryLength
  /** Input tokens for a single pass; longer input goes through map-reduce. */
  maxInputTokens?: number
  localOnly?: boolean
  component?: string
  onDone?: (summary: string) => void
}

export interface SummarizeState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  summary: string
  isBusy: boolean
  /** Map-reduce progress for long input: [done, total]. */
  progress: [number, number] | null
  run: (text: string) => Promise<string>
  /** Estimated tokens of the last input. */
  inputTokens: number
}

/** TL;DR of any text. Streams for short input; map-reduces long input in chunks that fit the on-device model. */
export function useSummarize(options: UseSummarizeOptions = {}): SummarizeState {
  const ondai = useOndai()
  const task = useTask(options.component ?? 'summarize')
  const [summary, setSummary] = useState('')
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [inputTokens, setInputTokens] = useState(0)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const run = useCallback(
    async (text: string) => {
      const o = optionsRef.current
      const length = o.length ?? 'bullets'
      setSummary('')
      setProgress(null)
      setInputTokens(estimateTokens(text))
      return task.execute(
        'text',
        async (ctx) => {
          const window = ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget
          const budget = o.maxInputTokens ?? Math.max(400, window - 600)
          const model = () => ctx.resolved.adapter.languageModel!()
          const streamFinal = async (system: string, prompt: string) => {
            const res = streamText({ model: model(), system, prompt, abortSignal: ctx.signal, temperature: 0.2, onError: () => {} })
            let acc = ''
            for await (const part of res.fullStream) {
              if (part.type === 'text-delta') {
                ctx.firstToken()
                acc += part.text
                setSummary(cleanSummary(acc, length))
                ctx.tokens(estimateTokens(acc))
                ctx.setStatus('streaming')
              } else if (part.type === 'error') throw part.error
            }
            return cleanSummary(acc, length)
          }
          let out: string
          if (estimateTokens(text) <= budget) {
            out = await streamFinal(summarizeInstructions[length], text)
          } else {
            const notes = await mapReduce<string>(text, {
              maxTokens: budget,
              onProgress: (done, total) => setProgress([done, total]),
              map: async (chunkText) => (await generateText({ model: model(), system: mapInstructions, prompt: chunkText, abortSignal: ctx.signal, temperature: 0.2 })).text,
              reduce: async (parts) => parts.join('\n'),
            })
            setProgress(null)
            out = await streamFinal(reduceInstructions[length], notes)
          }
          setSummary(out)
          o.onDone?.(out)
          return out
        },
        { localOnly: o.localOnly },
      )
    },
    [task, ondai],
  )

  return {
    ...task,
    summary,
    progress,
    inputTokens,
    isBusy: task.status === 'thinking' || task.status === 'streaming',
    run,
    reset: () => {
      task.reset()
      setSummary('')
      setProgress(null)
    },
  }
}
