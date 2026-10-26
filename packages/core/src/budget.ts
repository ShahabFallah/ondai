/**
 * Small-model engineering helpers. Assume a 4,096-token worst case.
 * Token estimates are heuristics (no tokenizer on device before iOS 26.4).
 */

/** Rough token estimate: ~4 chars/token for Latin text, ~1.5 chars/token for CJK. */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let cjk = 0
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0
    if ((c >= 0x3000 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af) || (c >= 0xf900 && c <= 0xfaff)) cjk++
  }
  const latin = text.length - cjk
  return Math.ceil(latin / 4 + cjk / 1.5)
}

export interface ChunkOptions {
  /** Max tokens per chunk. */
  maxTokens: number
  /** Tokens of overlap between consecutive chunks. */
  overlapTokens?: number
}

/** Split text into chunks on paragraph, then sentence, then word boundaries. */
export function chunk(text: string, options: ChunkOptions): string[] {
  const max = Math.max(32, options.maxTokens)
  const overlap = Math.max(0, options.overlapTokens ?? 0)
  const clean = text.replace(/\r\n/g, '\n').trim()
  if (!clean) return []
  if (estimateTokens(clean) <= max) return [clean]

  const units = splitUnits(clean, max)
  const chunks: string[] = []
  let current: string[] = []
  let currentTokens = 0
  for (const u of units) {
    const t = estimateTokens(u)
    if (currentTokens + t > max && current.length) {
      chunks.push(current.join(' ').trim())
      if (overlap > 0) {
        const kept: string[] = []
        let keptTokens = 0
        for (let i = current.length - 1; i >= 0 && keptTokens < overlap; i--) {
          const piece = current[i]!
          kept.unshift(piece)
          keptTokens += estimateTokens(piece)
        }
        current = kept
        currentTokens = keptTokens
      } else {
        current = []
        currentTokens = 0
      }
    }
    current.push(u)
    currentTokens += t
  }
  if (current.length) chunks.push(current.join(' ').trim())
  return chunks.filter(Boolean)
}

function splitUnits(text: string, max: number): string[] {
  const out: string[] = []
  for (const para of text.split(/\n{2,}/)) {
    if (estimateTokens(para) <= max) {
      out.push(para.trim())
      continue
    }
    for (const sentence of para.split(/(?<=[.!?。！？])\s+/)) {
      if (estimateTokens(sentence) <= max) {
        out.push(sentence.trim())
        continue
      }
      // Hard split long sentences by words.
      const words = sentence.split(/\s+/)
      let buf: string[] = []
      for (const w of words) {
        buf.push(w)
        if (estimateTokens(buf.join(' ')) >= max * 0.9) {
          out.push(buf.join(' '))
          buf = []
        }
      }
      if (buf.length) out.push(buf.join(' '))
    }
  }
  return out.filter(Boolean)
}

/** Trim text to a token budget, keeping the start (or the end with `keep: 'end'`). */
export function truncateToBudget(text: string, maxTokens: number, keep: 'start' | 'end' = 'start'): string {
  if (estimateTokens(text) <= maxTokens) return text
  const approxChars = maxTokens * 4
  return keep === 'start' ? text.slice(0, approxChars).trimEnd() + '…' : '…' + text.slice(-approxChars).trimStart()
}

export interface MapReduceOptions<T> {
  /** Tokens available for the content of one map call (after prompt overhead). */
  maxTokens: number
  map: (chunkText: string, index: number, total: number) => Promise<T>
  reduce: (partials: T[]) => Promise<T>
  /** Called before each step, for progress UI. */
  onProgress?: (done: number, total: number) => void
  /** Run map calls sequentially (default: on-device models are single-session). */
  concurrency?: number
}

/** Map over chunks, then reduce. Short input skips the reduce step. */
export async function mapReduce<T>(text: string, options: MapReduceOptions<T>): Promise<T> {
  const parts = chunk(text, { maxTokens: options.maxTokens, overlapTokens: Math.floor(options.maxTokens * 0.05) })
  if (parts.length <= 1) return options.map(parts[0] ?? text, 0, 1)
  const results: T[] = []
  const concurrency = Math.max(1, options.concurrency ?? 1)
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < parts.length) {
      const i = next++
      results[i] = await options.map(parts[i]!, i, parts.length)
      done++
      options.onProgress?.(done, parts.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, parts.length) }, worker))
  return options.reduce(results)
}
