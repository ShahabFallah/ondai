import { useCallback, useRef, useState } from 'react'
import { estimateTokens, streamText, useOndai, useTask, type TaskController } from '@ondai/core'
import { askPageInstructions, askPagePrompt, excerptForQuestion, locateQuote, parseAnswer, type PageQuote } from './prompts'

export interface UseAskPageOptions {
  /** Page tokens sent in one pass; a longer page is cut to the parts that best match the question. */
  maxInputTokens?: number
  /** At most this many quotes are kept (default 3). */
  maxQuotes?: number
  /** Keep quotes the model paraphrased, matched to the closest page sentence (default true). */
  nearQuotes?: boolean
  localOnly?: boolean
  component?: string
  onDone?: (result: AskPageResult) => void
}

export interface AskPageResult {
  question: string
  answer: string
  /** Quotes grounded in the page, with their offsets. */
  quotes: PageQuote[]
  followUps: string[]
  /** The page does not hold the answer. */
  notFound: boolean
}

export interface AskPageState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'>, AskPageResult {
  isBusy: boolean
  /** The page was longer than the budget and only its most relevant parts were read. */
  trimmed: boolean
  ask: (page: string, question: string, title?: string) => Promise<AskPageResult>
}

const empty: AskPageResult = { question: '', answer: '', quotes: [], followUps: [], notFound: false }

/** Ask about the page on screen: a streamed answer grounded in its text, the quotes behind it, follow-ups, or "not in this page". */
export function useAskPage(options: UseAskPageOptions = {}): AskPageState {
  const ondai = useOndai()
  const task = useTask(options.component ?? 'ask-page')
  const [result, setResult] = useState<AskPageResult>(empty)
  const [trimmed, setTrimmed] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const ask = useCallback(
    async (page: string, question: string, title?: string) => {
      const o = optionsRef.current
      const q = question.trim()
      setResult({ ...empty, question: q })
      setTrimmed(false)
      return task.execute(
        'text',
        async (ctx) => {
          const window = ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget
          const budget = o.maxInputTokens ?? Math.max(300, window - 700)
          const excerpt = excerptForQuestion(page, q, budget)
          setTrimmed(excerpt.trimmed)
          const ground = (quotes: string[]) => {
            const seen = new Set<number>()
            const out: PageQuote[] = []
            for (const raw of quotes) {
              const hit = locateQuote(page, raw)
              if (!hit || seen.has(hit.start) || (hit.match === 'near' && o.nearQuotes === false)) continue
              seen.add(hit.start)
              out.push(hit)
            }
            return out.sort((a, b) => a.start - b.start).slice(0, o.maxQuotes ?? 3)
          }
          const res = streamText({ model: ctx.resolved.adapter.languageModel!(), system: askPageInstructions, prompt: askPagePrompt(excerpt.text, q, title), abortSignal: ctx.signal, temperature: 0.1, onError: () => {} })
          let acc = ''
          for await (const part of res.fullStream) {
            if (part.type === 'text-delta') {
              ctx.firstToken()
              acc += part.text
              const p = parseAnswer(acc, true)
              setResult({ question: q, answer: p.answer, quotes: ground(p.quotes), followUps: p.followUps, notFound: p.notFound })
              ctx.tokens(estimateTokens(acc))
              if (p.answer) ctx.setStatus('streaming')
            } else if (part.type === 'error') throw part.error
          }
          const p = parseAnswer(acc)
          // Nothing usable came back at all: treat it as not in the page rather than an empty answer.
          const notFound = p.notFound || !p.answer
          const out: AskPageResult = { question: q, answer: notFound ? '' : p.answer, quotes: notFound ? [] : ground(p.quotes), followUps: notFound ? [] : p.followUps.filter((f) => f.toLowerCase() !== q.toLowerCase()), notFound }
          setResult(out)
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
    ...result,
    trimmed,
    isBusy: task.status === 'thinking' || task.status === 'streaming',
    ask,
    reset: () => {
      task.reset()
      setResult(empty)
      setTrimmed(false)
    },
  }
}
