import { OndaiError } from './errors'
import { similarity, normalizeText } from './parse'

export type ToolPolicy = 'auto' | 'ask' | 'never'
export type ToolRisk = 'low' | 'medium' | 'high'

export interface ToolLike {
  description?: string
  execute?: (input: any, options?: any) => unknown | Promise<unknown>
  [key: string]: unknown
}

export interface ToolMeta {
  title?: string
  policy?: ToolPolicy
  risk?: ToolRisk
  keywords?: string[]
}

export interface PendingConfirmation {
  id: string
  toolName: string
  title: string
  description?: string
  input: Record<string, unknown>
  risk: ToolRisk
  confirm(editedInput?: Record<string, unknown>): void
  cancel(reason?: string): void
}

export interface ToolPolicyOptions {
  /** Per-tool metadata (policy, risk, title). */
  meta?: Record<string, ToolMeta>
  defaultPolicy?: ToolPolicy
  /** Called when a tool needs approval; the UI shows a ToolConfirmCard and calls confirm/cancel. */
  onConfirm?: (pending: PendingConfirmation) => void
  /** Auto-cancel after this many ms (default 120 000). */
  timeoutMs?: number
  /** Called before/after every execution, for the step timeline. */
  onStep?: (step: ToolStep) => void
}

export interface ToolStep {
  id: string
  toolName: string
  status: 'pending' | 'awaiting-confirmation' | 'running' | 'done' | 'error' | 'cancelled'
  input: Record<string, unknown>
  output?: unknown
  error?: string
  startedAt: number
  endedAt?: number
}

let counter = 0
const nextId = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`

/**
 * Wrap a tool set so every `execute` goes through the policy. Works with provider-executed loops
 * (Apple, ADK) because the native session simply awaits the JS promise.
 */
export function withToolPolicy<T extends Record<string, ToolLike>>(tools: T, options: ToolPolicyOptions = {}): T {
  const out: Record<string, ToolLike> = {}
  for (const [name, tool] of Object.entries(tools)) {
    const meta = options.meta?.[name] ?? {}
    const policy = meta.policy ?? options.defaultPolicy ?? 'auto'
    if (!tool.execute) {
      out[name] = tool
      continue
    }
    const original = tool.execute
    out[name] = {
      ...tool,
      execute: async (input: Record<string, unknown>, execOptions?: unknown) => {
        const step: ToolStep = { id: nextId(), toolName: name, status: 'pending', input, startedAt: Date.now() }
        options.onStep?.({ ...step })
        if (policy === 'never') {
          options.onStep?.({ ...step, status: 'cancelled', endedAt: Date.now(), error: 'blocked by policy' })
          throw new OndaiError('tool-error', `${name} is not allowed`)
        }
        let finalInput = input
        if (policy === 'ask') {
          options.onStep?.({ ...step, status: 'awaiting-confirmation' })
          finalInput = await new Promise<Record<string, unknown>>((resolve, reject) => {
            const timer = setTimeout(() => reject(new OndaiError('cancelled', 'Confirmation timed out')), options.timeoutMs ?? 120_000)
            const pending: PendingConfirmation = {
              id: step.id,
              toolName: name,
              title: meta.title ?? humanize(name),
              description: tool.description,
              input,
              risk: meta.risk ?? 'medium',
              confirm: (edited) => {
                clearTimeout(timer)
                resolve(edited ?? input)
              },
              cancel: (reason) => {
                clearTimeout(timer)
                reject(new OndaiError('cancelled', reason ?? 'Cancelled'))
              },
            }
            if (!options.onConfirm) {
              clearTimeout(timer)
              reject(new OndaiError('tool-error', `${name} requires confirmation but no handler is set`))
              return
            }
            options.onConfirm(pending)
          }).catch((e) => {
            options.onStep?.({ ...step, status: 'cancelled', endedAt: Date.now(), error: e instanceof Error ? e.message : String(e) })
            throw e
          })
        }
        options.onStep?.({ ...step, status: 'running', input: finalInput })
        try {
          const output = await original(finalInput, execOptions)
          options.onStep?.({ ...step, status: 'done', input: finalInput, output, endedAt: Date.now() })
          return output
        } catch (e) {
          options.onStep?.({ ...step, status: 'error', input: finalInput, error: e instanceof Error ? e.message : String(e), endedAt: Date.now() })
          throw e
        }
      },
    }
  }
  return out as T
}

export function humanize(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

export interface PreselectOptions {
  k?: number
  meta?: Record<string, ToolMeta>
  /** Optional embeddings for re-ranking: returns one vector per text. */
  embed?: (texts: string[]) => Promise<number[][]>
}

/** Pick the top-k tools for a query by keyword/fuzzy score (and embeddings when provided). */
export async function preselectTools<T extends Record<string, ToolLike>>(tools: T, query: string, options: PreselectOptions = {}): Promise<Partial<T>> {
  const k = options.k ?? 5
  const names = Object.keys(tools)
  if (names.length <= k) return tools
  const q = normalizeText(query)
  const qTokens = q.split(' ').filter(Boolean)
  const scored = names.map((name) => {
    const t = tools[name]!
    const meta = options.meta?.[name]
    const hay = normalizeText(`${humanize(name)} ${t.description ?? ''} ${(meta?.keywords ?? []).join(' ')}`)
    const hayTokens = new Set(hay.split(' '))
    let overlap = 0
    for (const tok of qTokens) if (hayTokens.has(tok) || [...hayTokens].some((h) => h.startsWith(tok) && tok.length > 2)) overlap++
    const score = (qTokens.length ? overlap / qTokens.length : 0) * 0.7 + similarity(q, hay) * 0.3
    return { name, score, hay }
  })
  if (options.embed) {
    try {
      const [qv, ...tv] = await options.embed([query, ...scored.map((s) => s.hay)])
      scored.forEach((s, i) => {
        const v = tv[i]
        if (qv && v) s.score = s.score * 0.5 + cosineSim(qv, v) * 0.5
      })
    } catch {
      /* embeddings optional */
    }
  }
  scored.sort((a, b) => b.score - a.score)
  const picked = scored.slice(0, k).map((s) => s.name)
  const out: Partial<T> = {}
  for (const n of picked) (out as Record<string, ToolLike>)[n] = tools[n]!
  return out
}

function cosineSim(a: number[], b: number[]): number {
  let d = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    d += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  return na && nb ? d / Math.sqrt(na * nb) : 0
}
