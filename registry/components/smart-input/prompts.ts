import { describeForPrompt, type FieldInfo } from '@ondai/core'

export function smartFormInstructions(fields: FieldInfo[], extra?: string): string {
  return [
    'Extract the fields from the user text and return JSON only.',
    `Fields: ${describeForPrompt(fields)}.`,
    'Leave a field out if the text does not mention it. Never invent values. Copy numbers and names exactly as written.',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}
