import { z } from 'zod'

/** Fallback for providers without tool calling: structured choice of an action id plus the free-text argument. */
export const actionChoiceSchema = (ids: [string, ...string[]]) =>
  z.object({
    action: z.enum(ids),
    /** The remainder of the request the action needs (title, query, etc.). */
    argument: z.string(),
  })
