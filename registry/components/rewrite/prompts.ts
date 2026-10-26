export type RewriteMode = 'shorten' | 'expand' | 'friendlier' | 'formal' | 'fix' | 'custom'

export const rewriteModes: Array<{ id: RewriteMode; label: string }> = [
  { id: 'shorten', label: 'Shorten' },
  { id: 'expand', label: 'Expand' },
  { id: 'friendlier', label: 'Friendlier' },
  { id: 'formal', label: 'Formal' },
  { id: 'fix', label: 'Fix grammar' },
]

export const rewriteInstructions: Record<Exclude<RewriteMode, 'custom'>, string> = {
  shorten: 'Rewrite the text to be about half as long. Keep the meaning, names and numbers. Return only the rewritten text.',
  expand: 'Rewrite the text with a bit more detail and warmth, at most twice as long. Keep names and numbers. Return only the rewritten text.',
  friendlier: 'Rewrite the text in a warm, friendly tone. Keep the meaning, names and numbers. Return only the rewritten text.',
  formal: 'Rewrite the text in a clear, professional tone. Keep the meaning, names and numbers. Return only the rewritten text.',
  fix: 'Fix spelling, grammar and punctuation only. Do not change the meaning or tone. Return only the corrected text.',
}

export function rewriteSystem(mode: RewriteMode, custom?: string): string {
  return mode === 'custom' ? `${custom ?? 'Rewrite the text.'} Return only the rewritten text.` : rewriteInstructions[mode]
}

/** Strip quotes/preambles small models sometimes add. */
export function cleanRewrite(text: string): string {
  return text
    .trim()
    .replace(/^(here('s| is)[^:]*:\s*)/i, '')
    .replace(/^["“](.*)["”]$/s, '$1')
    .trim()
}
