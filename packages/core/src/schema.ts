import type { z } from 'zod'
import { matchEnum, parseDate, parseMoney, parseNumber } from './parse'

export interface FieldInfo {
  name: string
  /** Base type after unwrapping optional/nullable/default. */
  type: 'string' | 'number' | 'boolean' | 'enum' | 'date' | 'array' | 'object' | 'unknown'
  optional: boolean
  options?: string[]
  description?: string
}

type AnyDef = { type?: string; innerType?: unknown; entries?: Record<string, string>; options?: string[]; description?: string }
const defOf = (s: unknown): AnyDef => ((s as { def?: AnyDef }).def ?? (s as { _def?: AnyDef })._def ?? {}) as AnyDef

/** Describe a flat zod object (zod 4) so components can build prompts, confidence and refinements. */
export function describeSchema(schema: z.ZodObject<z.ZodRawShape>): FieldInfo[] {
  const shape = (schema as unknown as { shape: Record<string, unknown> }).shape ?? {}
  return Object.entries(shape).map(([name, field]) => {
    let f: unknown = field
    let optional = false
    let description = (field as { description?: string }).description
    for (let i = 0; i < 5; i++) {
      const d = defOf(f)
      if (d.type === 'optional' || d.type === 'nullable' || d.type === 'default' || d.type === 'nullish') {
        optional = true
        description ??= (f as { description?: string }).description
        f = d.innerType
      } else break
    }
    const d = defOf(f)
    const t = d.type
    const info: FieldInfo = { name, type: 'unknown', optional, description: description ?? (f as { description?: string }).description }
    if (t === 'enum') {
      info.type = 'enum'
      info.options = d.entries ? Object.values(d.entries) : d.options
    } else if (t === 'string') info.type = (info.description ?? '').toLowerCase().includes('date') ? 'date' : 'string'
    else if (t === 'number' || t === 'int') info.type = 'number'
    else if (t === 'boolean') info.type = 'boolean'
    else if (t === 'date') info.type = 'date'
    else if (t === 'array') info.type = 'array'
    else if (t === 'object') info.type = 'object'
    return info
  })
}

export interface RefinedField {
  value: unknown
  confidence: number
  /** Deterministic correction applied (enum fuzzy match, number/date parsing). */
  corrected?: boolean
}

export interface RefineOptions {
  aliases?: Record<string, Record<string, string[]>>
  now?: Date
  /** Read ambiguous numeric dates (05/10/2026) as day then month. Unambiguous ones (25/10/2026) are always read right. */
  dayFirst?: boolean
}

/**
 * Normalize a model-produced object field by field with deterministic parsers:
 * enums are fuzzy-matched, numbers/money parsed, dates resolved from phrases. Returns per-field confidence.
 */
export function refineObject(fields: FieldInfo[], raw: Record<string, unknown>, options: RefineOptions = {}): { object: Record<string, unknown>; fields: Record<string, RefinedField>; confidence: number } {
  const object: Record<string, unknown> = { ...raw }
  const result: Record<string, RefinedField> = {}
  let sum = 0
  let n = 0
  for (const f of fields) {
    const v = raw[f.name]
    let r: RefinedField = { value: v, confidence: v === undefined || v === null || v === '' ? (f.optional ? 0.5 : 0) : 0.9 }
    if (v !== undefined && v !== null && v !== '') {
      if (f.type === 'enum' && f.options?.length) {
        const m = matchEnum(String(v), f.options, { aliases: options.aliases?.[f.name] })
        r = m ? { value: m.value, confidence: m.via === 'exact' ? 1 : m.score, corrected: m.value !== v } : { value: undefined, confidence: 0 }
      } else if (f.type === 'number' && typeof v !== 'number') {
        const money = parseMoney(String(v))
        const num = money?.amount ?? parseNumber(String(v))
        r = num === null ? { value: undefined, confidence: 0 } : { value: num, confidence: 0.85, corrected: true }
      } else if (f.type === 'date') {
        const d = typeof v === 'string' ? parseDate(v, { now: options.now, dayFirst: options.dayFirst }) : null
        r = d ? { value: d.date.toISOString(), confidence: d.precision === 'minute' ? 0.9 : 0.8, corrected: d.date.toISOString() !== v } : typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? { value: new Date(v).toISOString(), confidence: 0.85 } : { value: v, confidence: 0.4 }
      } else if (f.type === 'boolean' && typeof v !== 'boolean') {
        r = { value: /^(true|yes|y|1)$/i.test(String(v)), confidence: 0.7, corrected: true }
      } else if (f.type === 'string') {
        r = { value: String(v).trim(), confidence: 0.9 }
      }
    }
    object[f.name] = r.value
    result[f.name] = r
    if (!f.optional || r.value !== undefined) {
      sum += r.confidence
      n++
    }
  }
  return { object, fields: result, confidence: n ? sum / n : 0 }
}

/** Short field list for prompts: `merchant (text), amount (number), category (one of: food, travel)`. */
export function describeForPrompt(fields: FieldInfo[]): string {
  return fields
    .map((f) => {
      const kind = f.type === 'enum' ? `one of: ${f.options?.join(', ')}` : f.type === 'number' ? 'number' : f.type === 'date' ? 'date or phrase' : f.type === 'boolean' ? 'true/false' : 'text'
      return `${f.name} (${kind}${f.optional ? ', optional' : ''}${f.description ? `; ${f.description}` : ''})`
    })
    .join(', ')
}
