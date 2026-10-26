import { useCallback, useRef, useState } from 'react'
import { estimateTokens, streamText, truncateToBudget, useOndai, useTask, type TaskController } from '@ondai/core'
import { cleanRewrite, rewriteSystem, type RewriteMode } from './prompts'

export interface UseRewriteOptions {
  component?: string
  localOnly?: boolean
  /** Extra guidance ("this is a chat message", "keep under 280 characters"). */
  instructions?: string
}

export interface RewriteState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  result: string
  original: string
  mode: RewriteMode | null
  isBusy: boolean
  run: (text: string, mode: RewriteMode, custom?: string) => Promise<string>
}

/** Shorten, expand, change tone or fix grammar, streamed from the on-device model. */
export function useRewrite(options: UseRewriteOptions = {}): RewriteState {
  const ondai = useOndai()
  const task = useTask(options.component ?? 'rewrite')
  const [result, setResult] = useState('')
  const [original, setOriginal] = useState('')
  const [mode, setMode] = useState<RewriteMode | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const run = useCallback(
    async (text: string, m: RewriteMode, custom?: string) => {
      setResult('')
      setOriginal(text)
      setMode(m)
      return task.execute(
        'text',
        async (ctx) => {
          const window = ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget
          const res = streamText({
            model: ctx.resolved.adapter.languageModel!(),
            system: [rewriteSystem(m, custom), optionsRef.current.instructions].filter(Boolean).join(' '),
            prompt: truncateToBudget(text, Math.max(300, Math.floor((window - 400) / 2))),
            abortSignal: ctx.signal,
            temperature: m === 'fix' ? 0 : 0.4,
            onError: () => {},
          })
          let acc = ''
          for await (const part of res.fullStream) {
            if (part.type === 'text-delta') {
              ctx.firstToken()
              acc += part.text
              setResult(cleanRewrite(acc))
              ctx.tokens(estimateTokens(acc))
              ctx.setStatus('streaming')
            } else if (part.type === 'error') throw part.error
          }
          const out = cleanRewrite(acc)
          setResult(out)
          return out
        },
        { localOnly: optionsRef.current.localOnly },
      )
    },
    [task, ondai],
  )

  return {
    ...task,
    result,
    original,
    mode,
    isBusy: task.status === 'thinking' || task.status === 'streaming',
    run,
    reset: () => {
      task.reset()
      setResult('')
      setMode(null)
    },
  }
}
