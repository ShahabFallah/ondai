export function autoTagInstructions(tags: string[], max: number, extra?: string): string {
  return [`Pick up to ${max} tags for the text from this list only: ${tags.join(', ')}.`, 'Return JSON with a "tags" array. Pick nothing if none fit.', extra].filter(Boolean).join(' ')
}
