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
