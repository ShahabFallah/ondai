import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { describeSchema, refineObject } from './schema'

describe('schema helpers', () => {
  const schema = z.object({
    merchant: z.string(),
    amount: z.number(),
    category: z.enum(['food', 'transport', 'home']),
    date: z.string().describe('date').optional(),
    note: z.string().optional(),
  })
  it('describes zod 4 objects', () => {
    const f = describeSchema(schema)
    expect(f.map((x) => `${x.name}:${x.type}:${x.optional}`)).toEqual(['merchant:string:false', 'amount:number:false', 'category:enum:false', 'date:date:true', 'note:string:true'])
    expect(f[2]!.options).toEqual(['food', 'transport', 'home'])
  })
  it('refines with deterministic parsers and confidence', () => {
    const r = refineObject(describeSchema(schema), { merchant: ' Luigi ', amount: '€24.50', category: 'Food & drinks', date: 'yesterday' }, { now: new Date(2026, 9, 26) })
    expect(r.object.merchant).toBe('Luigi')
    expect(r.object.amount).toBe(24.5)
    expect(r.object.category).toBe('food')
    expect(String(r.object.date)).toContain('2026-10-2')
    expect(r.fields.category!.corrected).toBe(true)
    expect(r.confidence).toBeGreaterThan(0.7)
    const bad = refineObject(describeSchema(schema), { merchant: 'x', amount: 'none', category: 'spaceship' })
    expect(bad.object.category).toBeUndefined()
    expect(bad.fields.amount!.confidence).toBe(0)
  })
})
