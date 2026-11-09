import { z } from 'zod'

export const receiptSchema = z.object({
  merchant: z.string(),
  total: z.number(),
  currency: z.string().optional(),
  date: z.string().describe('date').optional(),
  category: z.enum(['food', 'groceries', 'transport', 'shopping', 'health', 'other']).optional(),
  paymentMethod: z.enum(['card', 'cash', 'other']).optional(),
})

export const businessCardSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
})

export const eventSchema = z.object({
  title: z.string(),
  date: z.string().describe('date').optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

export const presets = { receipt: receiptSchema, businessCard: businessCardSchema, event: eventSchema } as const
export type ScanPreset = keyof typeof presets | 'custom'

/**
 * Words a receipt or a model uses for the preset's own enum values, so "restaurant" lands on `food` and "VISA"
 * on `card`. Your `aliases` are added to these, value by value.
 */
export const presetAliases: Partial<Record<ScanPreset, Record<string, Record<string, string[]>>>> = {
  receipt: {
    category: {
      food: ['restaurant', 'trattoria', 'pizzeria', 'ristorante', 'cafe', 'coffee', 'bakery', 'dining', 'takeaway', 'meal', 'lunch', 'dinner', 'breakfast'],
      groceries: ['grocery', 'supermarket', 'market', 'supermercato'],
      transport: ['taxi', 'uber', 'train', 'metro', 'fuel', 'petrol', 'parking', 'flight', 'airline', 'travel'],
      shopping: ['retail', 'clothing', 'store', 'shop', 'electronics'],
      health: ['pharmacy', 'farmacia', 'doctor', 'clinic', 'dentist', 'hospital'],
    },
    paymentMethod: {
      card: ['visa', 'mastercard', 'amex', 'american express', 'maestro', 'debit', 'credit', 'contactless', 'apple pay', 'google pay', 'carta', 'bancomat'],
      cash: ['contanti', 'cash'],
    },
  },
}

/** Preset aliases with yours added on top. */
export function mergeAliases(base: Record<string, Record<string, string[]>> | undefined, extra: Record<string, Record<string, string[]>> | undefined): Record<string, Record<string, string[]>> | undefined {
  if (!base) return extra
  if (!extra) return base
  const out: Record<string, Record<string, string[]>> = {}
  for (const field of new Set([...Object.keys(base), ...Object.keys(extra)])) {
    const a = base[field] ?? {}
    const b = extra[field] ?? {}
    out[field] = {}
    for (const value of new Set([...Object.keys(a), ...Object.keys(b)])) out[field][value] = [...(a[value] ?? []), ...(b[value] ?? [])]
  }
  return out
}
