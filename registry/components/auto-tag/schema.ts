import { z } from 'zod'

export const tagsSchema = (tags: readonly string[]) => z.object({ tags: z.array(tags.length ? z.enum(tags as [string, ...string[]]) : z.string()).max(8) })
