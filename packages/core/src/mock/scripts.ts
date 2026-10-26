import type { Availability, OndaiErrorKind, UnavailableReason } from '../types'

export type MockStep =
  | { type: 'thinking'; ms: number }
  | { type: 'stream'; text: string; tps: number; by: 'word' | 'char' | 'token' }
  | { type: 'text'; text: string }
  | { type: 'object'; value: unknown; delayMs: number }
  | { type: 'toolCall'; name: string; input: Record<string, unknown>; result?: unknown; delayMs: number }
  | { type: 'error'; kind: OndaiErrorKind; message?: string; delayMs: number }
  | { type: 'delay'; ms: number }

export interface MockScript {
  steps: MockStep[]
  availability?: Availability
  /** Deterministic jitter seed. */
  seed?: number
  /** Reported context window (tokens). */
  contextWindow?: number
  /** Embedding dimension for the mock embedding model. */
  embeddingDimension?: number
}

export class MockScriptBuilder {
  readonly steps: MockStep[] = []
  availability?: Availability
  seed = 1
  contextWindow = 4096

  thinking(ms = 1200): this {
    this.steps.push({ type: 'thinking', ms })
    return this
  }
  /** Stream text at `tps` tokens/second (default 40). */
  stream(text: string, tps = 40, by: 'word' | 'char' | 'token' = 'token'): this {
    this.steps.push({ type: 'stream', text, tps, by })
    return this
  }
  text(text: string): this {
    this.steps.push({ type: 'text', text })
    return this
  }
  object(value: unknown, delayMs = 0): this {
    this.steps.push({ type: 'object', value, delayMs })
    return this
  }
  toolCall(name: string, input: Record<string, unknown>, result?: unknown, delayMs = 300): this {
    this.steps.push({ type: 'toolCall', name, input, result, delayMs })
    return this
  }
  error(kind: OndaiErrorKind = 'unknown', message?: string, delayMs = 0): this {
    this.steps.push({ type: 'error', kind, message, delayMs })
    return this
  }
  refusal(message = 'The on-device model declined this request.'): this {
    return this.error('refusal', message)
  }
  delay(ms: number): this {
    this.steps.push({ type: 'delay', ms })
    return this
  }
  withSeed(seed: number): this {
    this.seed = seed
    return this
  }
  withContextWindow(tokens: number): this {
    this.contextWindow = tokens
    return this
  }
  unavailable(reason: UnavailableReason = 'device-not-eligible', detail?: string): this {
    this.availability = { status: 'unavailable', reason, detail, provider: 'mock' }
    return this
  }
  preparing(progress?: number): this {
    this.availability = { status: 'preparing', provider: 'mock', progress }
    return this
  }
  build(): MockScript {
    return { steps: this.steps.slice(), availability: this.availability, seed: this.seed, contextWindow: this.contextWindow }
  }
}

/** Fluent script factory: `mockScript.thinking(800).stream('Hello world', 40)`. */
export const mockScript = {
  thinking: (ms?: number) => new MockScriptBuilder().thinking(ms),
  stream: (text: string, tps?: number, by?: 'word' | 'char' | 'token') => new MockScriptBuilder().stream(text, tps, by),
  text: (text: string) => new MockScriptBuilder().text(text),
  object: (value: unknown, delayMs?: number) => new MockScriptBuilder().object(value, delayMs),
  toolCall: (name: string, input: Record<string, unknown>, result?: unknown, delayMs?: number) =>
    new MockScriptBuilder().toolCall(name, input, result, delayMs),
  error: (kind?: OndaiErrorKind, message?: string, delayMs?: number) => new MockScriptBuilder().error(kind, message, delayMs),
  refusal: (message?: string) => new MockScriptBuilder().refusal(message),
  unavailable: (reason?: UnavailableReason, detail?: string) => new MockScriptBuilder().unavailable(reason, detail),
  preparing: (progress?: number) => new MockScriptBuilder().preparing(progress),
  empty: () => new MockScriptBuilder(),
}

export type MockScriptInput = MockScript | MockScriptBuilder

export function toScript(input: MockScriptInput | undefined): MockScript {
  if (!input) return { steps: [] }
  return input instanceof MockScriptBuilder ? input.build() : input
}

/** Split text into pseudo-tokens (≈ 4 chars) so streaming looks like a real model. */
export function tokenizeForStream(text: string, by: 'word' | 'char' | 'token'): string[] {
  if (by === 'char') return [...text]
  if (by === 'word') return text.split(/(?<=\s)/)
  const out: string[] = []
  for (const word of text.split(/(?<=\s)/)) {
    if (word.length <= 5) out.push(word)
    else for (let i = 0; i < word.length; i += 4) out.push(word.slice(i, i + 4))
  }
  return out
}

/** Small seeded PRNG (mulberry32) for deterministic jitter. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
