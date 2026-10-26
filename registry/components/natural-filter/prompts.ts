import { describeForPrompt, type FieldInfo } from '@ondai/core'

export function naturalFilterInstructions(fields: FieldInfo[], extra?: string): string {
  return ['Turn the search request into filters. Return JSON only with these fields:', describeForPrompt(fields) + '.', 'Only set a field when the request clearly implies it. Never guess.', extra].filter(Boolean).join(' ')
}
