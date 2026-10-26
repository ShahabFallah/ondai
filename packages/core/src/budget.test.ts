import { describe, expect, it } from 'vitest'
import { chunk, estimateTokens, mapReduce, truncateToBudget } from './budget'

describe('budget', () => {
  it('estimates tokens', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('hello world!')).toBe(3)
    expect(estimateTokens('こんにちは')).toBe(4)
  })
  it('chunks on paragraph and sentence boundaries with overlap', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here and it is reasonably long.`).join(' ')
    const parts = chunk(text, { maxTokens: 100, overlapTokens: 10 })
    expect(parts.length).toBeGreaterThan(3)
    for (const p of parts) expect(estimateTokens(p)).toBeLessThanOrEqual(115)
    expect(parts[1]).toContain(parts[0]!.split(' ').slice(-3).join(' ').split('.')[0]!.slice(0, 5))
  })
  it('truncates', () => {
    expect(truncateToBudget('short', 100)).toBe('short')
    expect(truncateToBudget('x'.repeat(1000), 10).length).toBeLessThan(60)
  })
  it('map-reduces long input and skips reduce for short input', async () => {
    const calls: number[] = []
    const r = await mapReduce('a short text', {
      maxTokens: 100,
      map: async (t, i) => (calls.push(i), t.length),
      reduce: async (xs) => xs.reduce((a, b) => a + b, 0) * -1,
    })
    expect(r).toBe(12)
    const long = 'word '.repeat(2000)
    const r2 = await mapReduce(long, { maxTokens: 200, map: async () => 1, reduce: async (xs) => xs.length })
    expect(r2).toBeGreaterThan(5)
  })
})
