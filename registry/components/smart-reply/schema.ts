import { z } from 'zod'

export const repliesSchema = z.object({ replies: z.array(z.string()).min(1).max(5) })
export type Replies = z.infer<typeof repliesSchema>
