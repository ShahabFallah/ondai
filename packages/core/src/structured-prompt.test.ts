import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { rejectsSchema, withJsonInstructions } from './structured-prompt'

describe('rejectsSchema', () => {
  it('spots a provider that cannot take a response schema', () => {
    expect(rejectsSchema(new Error('ADK does not support responseFormat.schema yet. Use JSON mode without a schema or omit responseFormat.'))).toBe(true)
    expect(rejectsSchema(new Error("This model doesn't support structured output"))).toBe(true)
  })
  it('leaves other failures alone', () => {
    expect(rejectsSchema(new Error('No object generated: response did not match schema.'))).toBe(false)
    expect(rejectsSchema(new Error('MODEL_UNAVAILABLE'))).toBe(false)
  })
})

describe('withJsonInstructions', () => {
  it('appends the JSON Schema of the reply to the instructions', () => {
    const s = withJsonInstructions('Tag the note.', z.object({ tags: z.array(z.enum(['work', 'travel'])) }))
    expect(s.startsWith('Tag the note.\n\nReply with one JSON object')).toBe(true)
    expect(s).toContain('"tags"')
    expect(s).toContain('"travel"')
  })
})
