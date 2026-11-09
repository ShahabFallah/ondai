import { z } from 'zod'

/** Structured output for providers without schema-guided decoding (see `ProviderAdapter.structuredOutput`). */

/** A provider saying it cannot take a response schema (as opposed to a reply that failed one). */
export function rejectsSchema(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  return /(not|n't) support[^.]*(responseFormat|response format|schema|structured|json mode)/i.test(msg)
}

/** The schema as JSON Schema text, or '' when it cannot be represented (e.g. a transform). */
function jsonSchemaOf(schema: z.ZodType<unknown>): string {
  try {
    return JSON.stringify(z.toJSONSchema(schema, { unrepresentable: 'any' }))
  } catch {
    return ''
  }
}

/** The instructions plus the JSON Schema of the expected reply, for providers without schema-guided decoding. */
export function withJsonInstructions(system: string | undefined, schema: z.ZodType<unknown>): string {
  const shape = jsonSchemaOf(schema)
  const rule = shape
    ? `Reply with one JSON object and nothing else: no prose, no code fences. It must match this JSON Schema:\n${shape}`
    : 'Reply with one JSON object and nothing else: no prose, no code fences.'
  return `${system ? `${system}\n\n` : ''}${rule}`
}
