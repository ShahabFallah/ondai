import { z } from 'zod'

export const toneSchema = z.object({
  tone: z.string(),
  formality: z.number(),
  note: z.string().default(''),
})
export type ToneOutput = z.infer<typeof toneSchema>
