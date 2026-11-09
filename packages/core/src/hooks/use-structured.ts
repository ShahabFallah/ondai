import { useCallback, useEffect, useRef, useState } from 'react'
import { generateText, NoObjectGeneratedError, Output } from 'ai'
import type { z } from 'zod'
import { truncateToBudget } from '../budget'
import { useOndai } from '../context'
import { OndaiError } from '../errors'
import type { ProviderId } from '../types'
import { useTask, type TaskController } from './use-task'
import { rejectsSchema, withJsonInstructions } from '../structured-prompt'

export { rejectsSchema, withJsonInstructions }

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
          const applyRefine = (value: T): { value: T; conf?: number } => {
            if (!o.refine) return { value }
            const r = o.refine(value, input)
            if (r && typeof r === 'object' && 'object' in (r as object) && !(o.schema.safeParse(r).success && !('confidence' in (r as object)))) {
              const rr = r as { object: T; confidence?: number }
              return { value: rr.object, conf: rr.confidence }
            }
            return { value: r as T }
          }
          /** Strict parse failed (e.g. an off-list enum from a model without constrained decoding): refine the raw JSON, then validate. */
          const recover = (e: unknown): { value: T; conf: number } | null => {
            const raw = NoObjectGeneratedError.isInstance(e) ? e.text : e instanceof OndaiError && typeof e.raw === 'string' ? e.raw : undefined
            if (!raw) return null
            const json = extractJson(raw)
            if (!json) return null
            const refined = applyRefine(json as T)
            const parsed = o.schema.safeParse(refined.value)
            if (!parsed.success) return null
            return { value: parsed.data, conf: Math.min(0.8, refined.conf ?? 0.8) }
          }
          // Providers that reject or ignore a response schema get it in the instructions instead.
          let mode: 'schema' | 'prompt' = ctx.resolved.adapter.structuredOutput ?? 'schema'
          const promptAttempt = async (budget: number) => {
            const result = await generateText({
              model: ctx.resolved.adapter.languageModel!(),
              system: withJsonInstructions(system, o.schema),
              prompt: truncateToBudget(input, budget),
              abortSignal: ctx.signal,
              temperature: o.temperature ?? 0,
            })
            const json = extractJson(result.text)
            const parsed = json ? o.schema.safeParse(json) : null
            if (parsed?.success) return parsed.data
            // Not valid as it stands: `recover` refines the raw JSON and validates again.
            throw new OndaiError('invalid-output', 'The model reply did not match the schema.', { raw: result.text, provider: ctx.resolved.provider })
          }
          const attempt = async (budget: number): Promise<T> => {
            if (mode === 'prompt') return promptAttempt(budget)
            try {
              return await schemaAttempt(budget)
            } catch (e) {
              if (!rejectsSchema(e)) throw e
              mode = 'prompt'
              return promptAttempt(budget)
            }
          }
          const schemaAttempt = async (budget: number) => {
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
          let recovered = false
          try {
            out = await attempt(o.inputBudget ?? Math.max(256, window - 768))
          } catch (e) {
            const kind = ondai.classify(e, ctx.resolved.provider)
            const rec = kind === 'invalid-output' ? recover(e) : null
            if (rec) {
              out = rec.value
              conf = rec.conf
              recovered = true
            } else {
              if (kind !== 'context-overflow' && kind !== 'invalid-output') throw e
              // Exactly one retry: smaller budget, fresh session.
              conf = 0.7
              try {
                out = await attempt(Math.max(256, Math.floor(((o.inputBudget ?? window) - 768) / 2)))
              } catch (e2) {
                const rec2 = ondai.classify(e2, ctx.resolved.provider) === 'invalid-output' ? recover(e2) : null
                if (!rec2) throw e2
                out = rec2.value
                conf = Math.min(conf, rec2.conf)
                recovered = true
              }
            }
          }
          if (!recovered) {
            const r = applyRefine(out)
            out = r.value
            if (r.conf !== undefined) conf = Math.min(conf, r.conf)
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

/** Pull the first JSON object out of model text (handles code fences and preambles). */
export function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const v = JSON.parse(cleaned.slice(start, end + 1))
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function buildInstructions<T>(instructions?: string, examples?: Array<{ input: string; output: T }>): string | undefined {
  if (!examples?.length) return instructions
  const shots = examples.map((e) => `Input: ${e.input}\nOutput: ${JSON.stringify(e.output)}`).join('\n\n')
  return `${instructions ?? ''}\n\nExamples:\n${shots}`.trim()
}
