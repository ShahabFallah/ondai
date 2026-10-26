import { matchEnum, similarity } from './parse'

export interface EvalFixture<I = unknown, E = unknown> {
  id: string
  input: I
  expected: E
  tags?: string[]
  note?: string
}

export type MatchResult = boolean | { pass: boolean; detail?: string }
export type EvalMatcher<O, E> = (output: O, expected: E, fixture: EvalFixture<unknown, E>) => MatchResult

export interface EvalResult<O = unknown, E = unknown> {
  id: string
  pass: boolean
  durationMs: number
  output?: O
  expected: E
  detail?: string
  error?: string
  tags?: string[]
}

export interface EvalReport<O = unknown, E = unknown> {
  component: string
  provider: string
  device?: string
  at: string
  total: number
  passed: number
  failed: number
  passRate: number
  threshold: number
  ok: boolean
  meanLatencyMs: number
  results: EvalResult<O, E>[]
}

export interface RunEvalsOptions<I, E, O> {
  component: string
  provider: string
  device?: string
  fixtures: EvalFixture<I, E>[]
  run: (input: I, fixture: EvalFixture<I, E>) => Promise<O>
  match: EvalMatcher<O, E>
  /** Pass rate required for `ok` (default 0.85). */
  threshold?: number
  onProgress?: (done: number, total: number, last: EvalResult<O, E>) => void
  /** Stop after this many fixtures (for quick device runs). */
  limit?: number
  now?: () => number
}

export async function runEvals<I, E, O>(options: RunEvalsOptions<I, E, O>): Promise<EvalReport<O, E>> {
  const now = options.now ?? (() => Date.now())
  const fixtures = options.limit ? options.fixtures.slice(0, options.limit) : options.fixtures
  const results: EvalResult<O, E>[] = []
  for (const f of fixtures) {
    const t0 = now()
    let r: EvalResult<O, E>
    try {
      const output = await options.run(f.input, f)
      const m = options.match(output, f.expected, f as EvalFixture<unknown, E>)
      const pass = typeof m === 'boolean' ? m : m.pass
      r = { id: f.id, pass, durationMs: now() - t0, output, expected: f.expected, detail: typeof m === 'object' ? m.detail : undefined, tags: f.tags }
    } catch (e) {
      r = { id: f.id, pass: false, durationMs: now() - t0, expected: f.expected, error: e instanceof Error ? e.message : String(e), tags: f.tags }
    }
    results.push(r)
    options.onProgress?.(results.length, fixtures.length, r)
  }
  const passed = results.filter((r) => r.pass).length
  const threshold = options.threshold ?? 0.85
  const passRate = results.length ? passed / results.length : 0
  return {
    component: options.component,
    provider: options.provider,
    device: options.device,
    at: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate,
    threshold,
    ok: passRate >= threshold,
    meanLatencyMs: results.length ? Math.round(results.reduce((a, r) => a + r.durationMs, 0) / results.length) : 0,
    results,
  }
}

const deepEq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

/** Reusable matchers for fixtures. */
export const matchers = {
  exact: <T>(o: T, e: T): boolean => o === e,
  deepEqual: (o: unknown, e: unknown): boolean => deepEq(o, e),
  includes: (o: string, e: string): boolean => o.toLowerCase().includes(e.toLowerCase()),
  oneOf: <T>(o: T, e: T[]): boolean => e.includes(o),
  /** Model output fuzzy-matches the expected enum option. */
  enumOf:
    <T extends string>(options: readonly T[]) =>
    (o: string, e: T): MatchResult => {
      const m = matchEnum(o, options)
      return { pass: m?.value === e, detail: m ? `${o} → ${m.value} (${m.score.toFixed(2)})` : `${o} → no match` }
    },
  /** Compare selected fields; strings fuzzily (≥0.8), numbers within tolerance, others deep-equal. */
  fields:
    (keys: string[], opts: { tolerance?: number; minSimilarity?: number } = {}) =>
    (o: Record<string, unknown>, e: Record<string, unknown>): MatchResult => {
      const bad: string[] = []
      for (const k of keys) {
        const a = o?.[k]
        const b = e?.[k]
        if (typeof b === 'number' && typeof a === 'number') {
          if (Math.abs(a - b) > (opts.tolerance ?? 0.01)) bad.push(`${k}: ${a} ≠ ${b}`)
        } else if (typeof b === 'string' && typeof a === 'string') {
          if (similarity(a, b) < (opts.minSimilarity ?? 0.8)) bad.push(`${k}: "${a}" ≠ "${b}"`)
        } else if (!deepEq(a, b)) bad.push(`${k}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`)
      }
      return { pass: bad.length === 0, detail: bad.join('; ') || undefined }
    },
  /** Sets compared ignoring order (e.g. tags). */
  sameSet: (o: unknown[], e: unknown[]): MatchResult => {
    const a = [...new Set(o.map(String))].sort()
    const b = [...new Set(e.map(String))].sort()
    return { pass: deepEq(a, b), detail: deepEq(a, b) ? undefined : `${a.join(',')} ≠ ${b.join(',')}` }
  },
  /** At least `min` of the expected items present (precision-tolerant). */
  overlap:
    (min: number) =>
    (o: unknown[], e: unknown[]): MatchResult => {
      const set = new Set(o.map(String))
      const hit = e.filter((x) => set.has(String(x))).length
      return { pass: hit >= Math.min(min, e.length), detail: `${hit}/${e.length} expected present` }
    },
  dateSameDay: (o: string | Date, e: string | Date): boolean => {
    const a = new Date(o)
    const b = new Date(e)
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  },
}
