import { z } from 'zod'

/** Structured output for providers without schema-guided decoding (see `ProviderAdapter.structuredOutput`). */

/** A provider saying it cannot take a response schema (as opposed to a reply that failed one). */
export function rejectsSchema(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  return /(not|n't) support[^.]*(responseFormat|response format|schema|structured|json mode)/i.test(msg)
}

/** The instructions plus the JSON Schema of the expected reply, for providers without schema-guided decoding. */
export function withJsonInstructions(system: string | undefined, schema: z.ZodType<unknown>): string {
  let shape = ''
  try {
    shape = JSON.stringify(z.toJSONSchema(schema, { unrepresentable: 'any' }))
  } catch {
    shape = ''
  }
  const rule = shape
    ? `Reply with one JSON object and nothing else: no prose, no code fences. It must match this JSON Schema:\n${shape}`
    : 'Reply with one JSON object and nothing else: no prose, no code fences.'
  return `${system ? `${system}\n\n` : ''}${rule}`
}
