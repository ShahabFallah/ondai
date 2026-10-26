export type ReplyTone = 'neutral' | 'friendly' | 'formal' | 'brief'

export const replyTones: Array<{ id: ReplyTone; label: string }> = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'formal', label: 'Formal' },
  { id: 'brief', label: 'Brief' },
]

export function smartReplyInstructions(count: number, tone: ReplyTone, extra?: string): string {
  const toneText = { neutral: 'natural', friendly: 'warm and friendly', formal: 'polite and professional', brief: 'very short (under 8 words)' }[tone]
  return [
    `You suggest replies the user could send. Write ${count} different ${toneText} replies to the last message, each one sentence, from the user's point of view.`,
    'They should differ in intent (for example: agree, ask a question, decline politely). No numbering, no quotes.',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

/** Fallback when structured output is unavailable: one reply per line. */
export function parseReplyLines(text: string, count: number): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').replace(/^["“](.*)["”]$/, '$1').trim())
    .filter((l) => l.length > 1)
    .slice(0, count)
}
