import { z } from 'zod'

export const expenseSchema = z.object({
  merchant: z.string(),
  amount: z.number(),
  currency: z.string().optional(),
  category: z.enum(['food', 'transport', 'home', 'health', 'fun', 'other']),
  date: z.string().describe('date').optional(),
  note: z.string().optional(),
})

export const expenseAliases = { category: { food: ['lunch', 'dinner', 'coffee', 'restaurant', 'groceries'], transport: ['uber', 'taxi', 'train', 'bus', 'fuel'], fun: ['movie', 'concert', 'game'] } }

export const sampleUtterance = "Lunch with Sam at Luigi's yesterday, 24.50 euros, I paid by card"

export const sampleParsed = { merchant: "Luigi's", amount: 24.5, currency: 'EUR', category: 'Food & drinks', date: 'yesterday', note: 'Lunch with Sam, paid by card' }
