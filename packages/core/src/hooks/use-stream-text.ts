import { useCallback, useEffect, useRef, useState } from 'react'
import { streamText } from 'ai'
import { estimateTokens, truncateToBudget } from '../budget'
import { useOndai } from '../context'
import { OndaiError } from '../errors'
import type { ProviderId } from '../types'
import { useTask, type TaskController } from './use-task'

export interface UseStreamTextOptions {
  system?: string
  /** Default prompt for `run()` and for `auto`. */
  prompt?: string
  /** Run automatically on mount and whenever `prompt` changes. */
  auto?: boolean
  localOnly?: boolean
  provider?: ProviderId
  component?: string
  maxOutputTokens?: number
  temperature?: number
  /** Input tokens reserved for the prompt; longer prompts are truncated (default: policy budget - 512). */
  inputBudget?: number
  onDone?: (text: string) => void
}

export interface StreamTextState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  text: string
  isStreaming: boolean
  isThinking: boolean
  isBusy: boolean
  run: (prompt?: string, extra?: { system?: string }) => Promise<string>
}

/** Stream text from the best on-device model. */
export function useStreamText(options: UseStreamTextOptions = {}): StreamTextState {
  const ondai = useOndai()
  const task = useTask(options.component)
  const [text, setText] = useState('')
  const optionsRef = useRef(options)
  optionsRef.current = options

  const run = useCallback(
    async (promptOverride?: string, extra?: { system?: string }) => {
      const o = optionsRef.current
      const prompt = promptOverride ?? o.prompt ?? ''
      if (!prompt.trim()) throw new OndaiError('invalid-output', 'Nothing to send.')
      setText('')
      return task.execute(
        'text',
        async (ctx) => {
          const budget = o.inputBudget ?? Math.max(512, (ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget) - 512)
          const model = ctx.resolved.adapter.languageModel!()
          const result = streamText({
            model,
            system: extra?.system ?? o.system,
            prompt: truncateToBudget(prompt, budget),
            abortSignal: ctx.signal,
            maxOutputTokens: o.maxOutputTokens,
            temperature: o.temperature,
            onError: () => {},
          })
          let acc = ''
          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              ctx.firstToken()
              acc += part.text
              setText(acc)
              ctx.tokens(estimateTokens(acc))
              ctx.setStatus('streaming')
            } else if (part.type === 'error') {
              throw part.error
            }
          }
          o.onDone?.(acc)
          return acc
        },
        { localOnly: o.localOnly, provider: o.provider },
      )
    },
    [task, ondai],
  )

  useEffect(() => {
    if (options.auto && options.prompt) void run().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.auto, options.prompt])

  return {
    ...task,
    text,
    isStreaming: task.status === 'streaming',
    isThinking: task.status === 'thinking',
    isBusy: task.status === 'thinking' || task.status === 'streaming',
    run,
    reset: () => {
      task.reset()
      setText('')
    },
  }
}
