import { useCallback, useRef, useState } from 'react'
import { estimateTokens, streamText, truncateToBudget, useOndai, useTask, type TaskController } from '@ondai/core'
import { cleanTranslation, findLanguage, translateSystem, type TranslateLanguage } from './prompts'

export interface UseTranslateOptions {
  /** The languages codes resolve against (names for the prompt). Defaults to `translateLanguages`. */
  languages?: TranslateLanguage[]
  localOnly?: boolean
  component?: string
  /** Extra guidance ("this is a chat message", "use the informal you"). */
  instructions?: string
  onDone?: (translation: string, to: string) => void
}

export interface TranslateState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  translation: string
  /** The text and languages of the last run (or swap). */
  source: string
  from: string | null
  to: string | null
  isBusy: boolean
  run: (text: string, to: string, from: string) => Promise<string>
  /**
   * Swap the languages without a model call: the translation becomes the source and the source becomes the
   * translation. Returns the new pair, or null when there is nothing to swap yet.
   */
  swap: () => { source: string; from: string; to: string } | null
}

/** Translate text between languages, streamed from the on-device model. */
export function useTranslate(options: UseTranslateOptions = {}): TranslateState {
  const ondai = useOndai()
  const task = useTask(options.component ?? 'translate')
  const [translation, setTranslation] = useState('')
  const [source, setSource] = useState('')
  const [pair, setPair] = useState<{ from: string | null; to: string | null }>({ from: null, to: null })
  const optionsRef = useRef(options)
  optionsRef.current = options

  const run = useCallback(
    async (text: string, to: string, from: string) => {
      const o = optionsRef.current
      setTranslation('')
      setSource(text)
      setPair({ from, to })
      return task.execute(
        'text',
        async (ctx) => {
          const window = ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget
          const system = [translateSystem(findLanguage(from, o.languages), findLanguage(to, o.languages)), o.instructions].filter(Boolean).join(' ')
          const res = streamText({
            model: ctx.resolved.adapter.languageModel!(),
            system,
            // Half the window for the input, the rest for the translation (which can run longer).
            prompt: truncateToBudget(text, Math.max(300, Math.floor((window - 400) / 2))),
            abortSignal: ctx.signal,
            temperature: 0.1,
            onError: () => {},
          })
          let acc = ''
          for await (const part of res.fullStream) {
            if (part.type === 'text-delta') {
              ctx.firstToken()
              acc += part.text
              setTranslation(cleanTranslation(acc))
              ctx.tokens(estimateTokens(acc))
              ctx.setStatus('streaming')
            } else if (part.type === 'error') throw part.error
          }
          const out = cleanTranslation(acc)
          setTranslation(out)
          o.onDone?.(out, to)
          return out
        },
        { localOnly: o.localOnly },
      )
    },
    [task, ondai],
  )

  const swap = useCallback(() => {
    if (!translation || !pair.from || !pair.to || task.status === 'thinking' || task.status === 'streaming') return null
    const next = { source: translation, from: pair.to, to: pair.from }
    setTranslation(source)
    setSource(translation)
    setPair({ from: next.from, to: next.to })
    return next
  }, [translation, source, pair, task.status])

  return {
    ...task,
    translation,
    source,
    from: pair.from,
    to: pair.to,
    isBusy: task.status === 'thinking' || task.status === 'streaming',
    run,
    swap,
    reset: () => {
      task.reset()
      setTranslation('')
      setPair({ from: null, to: null })
    },
  }
}
