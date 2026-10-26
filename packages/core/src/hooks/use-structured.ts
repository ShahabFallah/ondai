import { useCallback, useEffect, useRef, useState } from 'react'
import { generateText, Output } from 'ai'
import type { z } from 'zod'
import { truncateToBudget } from '../budget'
import { useOndai } from '../context'
import { OndaiError } from '../errors'
import type { ProviderId } from '../types'
import { useTask, type TaskController } from './use-task'

export interface UseStructuredOptions<T> {
  schema: z.ZodType<T>
  /** System instructions. Keep them short and task-shaped; the model is small. */
  instructions?: string
  /** Default input for `run()` and `auto`. */
  input?: string
  auto?: boolean
  /** Few-shot examples appended to the instructions. */
  examples?: Array<{ input: string; output: T }>
  localOnly?: boolean
  provider?: ProviderId
  component?: string
  temperature?: number
  inputBudget?: number
  /** Post-process / normalize the parsed object (e.g. matchEnum on fields). Return confidence 0..1. */
  refine?: (object: T, input: string) => { object: T; confidence?: number } | T
  onDone?: (object: T) => void
}

export interface StructuredState<T> extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  object: T | null
  /** Streaming partial objects are not supported by on-device providers; always null today. */
  partial: Partial<T> | null
  isLoading: boolean
  /** 1 = parsed and validated first try; lower after retries or refinements. */
  confidence: number | null
  run: (input?: string) => Promise<T>
}

/** Structured output with Zod, with one budget-aware retry and deterministic refinement. */
export function useStructured<T>(options: UseStructuredOptions<T>): StructuredState<T> {
  const ondai = useOndai()
  const task = useTask(options.component)
  const [object, setObject] = useState<T | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const run = useCallback(
    async (inputOverride?: string) => {
      const o = optionsRef.current
      const input = inputOverride ?? o.input ?? ''
      if (!input.trim()) throw new OndaiError('invalid-output', 'Nothing to parse.')
      setObject(null)
      setConfidence(null)
      return task.execute(
        'structured',
        async (ctx) => {
          const window = ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget
          const system = buildInstructions(o.instructions, o.examples)
          const attempt = async (budget: number) => {
            const result = await generateText({
              model: ctx.resolved.adapter.languageModel!(),
              system,
              prompt: truncateToBudget(input, budget),
              output: Output.object({ schema: o.schema }),
              abortSignal: ctx.signal,
              temperature: o.temperature ?? 0,
            })
            return result.output as T
          }
          let conf = 1
          let out: T
          try {
            out = await attempt(o.inputBudget ?? Math.max(256, window - 768))
          } catch (e) {
            const kind = ondai.classify(e, ctx.resolved.provider)
            if (kind !== 'context-overflow' && kind !== 'invalid-output') throw e
            // Exactly one retry: smaller budget, fresh session.
            conf = 0.7
            out = await attempt(Math.max(256, Math.floor(((o.inputBudget ?? window) - 768) / 2)))
          }
          if (o.refine) {
            const r = o.refine(out, input)
            if (r && typeof r === 'object' && 'object' in (r as object) && !(o.schema.safeParse(r).success && !('confidence' in (r as object)))) {
              const rr = r as { object: T; confidence?: number }
              out = rr.object
              if (rr.confidence !== undefined) conf = Math.min(conf, rr.confidence)
            } else out = r as T
          }
          setObject(out)
          setConfidence(conf)
          o.onDone?.(out)
          return out
        },
        { localOnly: o.localOnly, provider: o.provider },
      )
    },
    [task, ondai],
  )

  useEffect(() => {
    if (options.auto && options.input) void run().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.auto, options.input])

  return {
    ...task,
    object,
    partial: null,
    confidence,
    isLoading: task.status === 'thinking' || task.status === 'streaming',
    run,
    reset: () => {
      task.reset()
      setObject(null)
      setConfidence(null)
    },
  }
}

export function buildInstructions<T>(instructions?: string, examples?: Array<{ input: string; output: T }>): string | undefined {
  if (!examples?.length) return instructions
  const shots = examples.map((e) => `Input: ${e.input}\nOutput: ${JSON.stringify(e.output)}`).join('\n\n')
  return `${instructions ?? ''}\n\nExamples:\n${shots}`.trim()
}
