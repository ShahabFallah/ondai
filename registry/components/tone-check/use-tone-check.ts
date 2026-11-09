import { useCallback, useRef, useState } from 'react'
import { estimateTokens, generateText, Output, rejectsSchema, streamText, truncateToBudget, useOndai, useTask, type TaskContext, type TaskController } from '@ondai/core'
import { cleanNote, cleanSofter, normalizeFormality, parseToneLines, softenSystem, toneSystem, toTone, type Tone, type ToneReading } from './prompts'
import { toneSchema } from './schema'

export interface UseToneCheckOptions {
  component?: string
  localOnly?: boolean
  /** Extra guidance ("this is a work chat", "the reader is a customer"). */
  instructions?: string
  /** Tones that count as off and earn a softer suggestion. */
  offTones?: Tone[]
  /** Write the softer version right after an off reading (default true). Off: call `soften()` yourself. */
  autoSoften?: boolean
}

export interface ToneCheckState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  /** The latest reading. Kept while a newer check runs, so a meter can move from it. */
  reading: ToneReading | null
  /** The text the reading belongs to. */
  checked: string
  /** The softer version, streamed. Empty until there is one. */
  suggestion: string
  /** What the model is doing now. */
  phase: 'reading' | 'softening' | null
  /** The reading's tone is one of `offTones`. */
  isOff: boolean
  isBusy: boolean
  /** Read the tone of `text` (and, with `autoSoften`, write a softer version when it is off). */
  check: (text: string) => Promise<ToneReading>
  /** Write a softer version of `text` (defaults to the last checked text). */
  soften: (text?: string) => Promise<string>
  /** Drop the suggestion, keep the reading. */
  dismiss: () => void
}

const defaultOff: Tone[] = ['blunt', 'tense']

/** Reads the tone of a draft on device, and offers a softer rewrite when it is blunt or tense. */
export function useToneCheck(options: UseToneCheckOptions = {}): ToneCheckState {
  const ondai = useOndai()
  const task = useTask(options.component ?? 'tone-check')
  const [reading, setReading] = useState<ToneReading | null>(null)
  const [checked, setChecked] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [phase, setPhase] = useState<ToneCheckState['phase']>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const lastText = useRef('')

  const budget = (ctx: TaskContext) => Math.max(300, Math.floor(((ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget) - 400) / 2))

  const read = useCallback(
    async (ctx: TaskContext, text: string): Promise<ToneReading> => {
      const model = ctx.resolved.adapter.languageModel!()
      const system = toneSystem(optionsRef.current.instructions)
      const prompt = truncateToBudget(text, budget(ctx))
      // Schema-guided first where the provider takes a schema; three plain lines otherwise.
      if (ctx.resolved.adapter.capabilities.has('structured') && ctx.resolved.adapter.structuredOutput !== 'prompt') {
        try {
          const r = await generateText({ model, system: `${system} Return JSON with "tone", "formality" and "note".`, prompt, output: Output.object({ schema: toneSchema }), abortSignal: ctx.signal, temperature: 0 })
          return { tone: toTone(r.output.tone), formality: normalizeFormality(r.output.formality), note: cleanNote(r.output.note ?? '') }
        } catch (e) {
          if (ondai.classify(e, ctx.resolved.provider) !== 'invalid-output' && !rejectsSchema(e)) throw e
        }
      }
      const r = await generateText({ model, system: `${system} Answer in three lines: "tone: <tone>", "formality: <0 to 1>", "note: <note>".`, prompt, abortSignal: ctx.signal, temperature: 0 })
      return parseToneLines(r.text)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ondai],
  )

  const write = useCallback(
    async (ctx: TaskContext, text: string): Promise<string> => {
      setPhase('softening')
      setSuggestion('')
      const res = streamText({ model: ctx.resolved.adapter.languageModel!(), system: softenSystem(optionsRef.current.instructions), prompt: truncateToBudget(text, budget(ctx)), abortSignal: ctx.signal, temperature: 0.4, onError: () => {} })
      let acc = ''
      for await (const part of res.fullStream) {
        if (part.type === 'text-delta') {
          ctx.firstToken()
          acc += part.text
          setSuggestion(cleanSofter(acc))
          ctx.tokens(estimateTokens(acc))
          ctx.setStatus('streaming')
        } else if (part.type === 'error') throw part.error
      }
      const out = cleanSofter(acc)
      setSuggestion(out)
      return out
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ondai],
  )

  const check = useCallback(
    async (text: string) => {
      lastText.current = text
      setSuggestion('')
      setPhase('reading')
      try {
        return await task.execute(
          'text',
          async (ctx) => {
            const r = await read(ctx, text)
            ctx.firstToken()
            setReading(r)
            setChecked(text)
            const o = optionsRef.current
            if ((o.autoSoften ?? true) && (o.offTones ?? defaultOff).includes(r.tone)) await write(ctx, text)
            return r
          },
          { localOnly: optionsRef.current.localOnly },
        )
      } finally {
        if (lastText.current === text) setPhase(null)
      }
    },
    [task, read, write],
  )

  const soften = useCallback(
    async (text?: string) => {
      const src = text ?? lastText.current
      try {
        return await task.execute('text', (ctx) => write(ctx, src), { localOnly: optionsRef.current.localOnly })
      } finally {
        setPhase(null)
      }
    },
    [task, write],
  )

  const isOff = !!reading && (options.offTones ?? defaultOff).includes(reading.tone)

  return {
    ...task,
    reading,
    checked,
    suggestion,
    phase,
    isOff,
    isBusy: task.status === 'thinking' || task.status === 'streaming',
    check,
    soften,
    dismiss: () => setSuggestion(''),
    reset: () => {
      task.reset()
      setReading(null)
      setChecked('')
      setSuggestion('')
      setPhase(null)
    },
  }
}
