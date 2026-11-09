export type Tone = 'friendly' | 'neutral' | 'blunt' | 'tense'

/** The tones in meter order, warm to sharp. */
export const tones: Tone[] = ['friendly', 'neutral', 'blunt', 'tense']

/** What the model read: the tone, how formal it sounds (0 casual, 1 formal) and a short note on how it may land. */
export interface ToneReading {
  tone: Tone
  formality: number
  note: string
}

/** Where each tone sits on the warm-to-sharp meter (0..1). */
export const tonePosition: Record<Tone, number> = { friendly: 0.125, neutral: 0.375, blunt: 0.625, tense: 0.875 }

export const toneInstructions =
  'You read the tone of a message someone is about to send. Pick one tone: friendly (warm, kind), neutral (plain, matter of fact), blunt (curt, demanding or careless of the reader) or tense (annoyed, angry, anxious or passive aggressive). Rate formality from 0 (very casual) to 1 (very formal). Add a note of at most 8 words on how it may land with the reader.'

export const softenInstructions =
  'Rewrite the message so it reads warmer and calmer. Keep the meaning, every request, names and numbers, the same language and about the same length. Do not add apologies that were not there. Return only the rewritten message.'

export function toneSystem(extra?: string): string {
  return [toneInstructions, extra].filter(Boolean).join(' ')
}

export function softenSystem(extra?: string): string {
  return [softenInstructions, extra].filter(Boolean).join(' ')
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5)

/** Formality as 0..1, whether the model wrote 0.7, 7 (of 10) or 70 (percent). */
export function normalizeFormality(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  if (n > 10) return clamp01(n / 100)
  if (n > 1) return clamp01(n / 10)
  return clamp01(n)
}

/** Map near-misses small models write ("warm", "harsh", "angry") onto the four tones. */
export function toTone(word: string): Tone {
  const w = word.toLowerCase()
  if (/tense|angry|annoy|anxious|hostile|passive|aggress|upset|frustrat|irritat/.test(w)) return 'tense'
  if (/blunt|curt|harsh|rude|demand|abrupt|terse|cold|direct/.test(w)) return 'blunt'
  if (/friend|warm|kind|positive|cheer|polite|grateful/.test(w)) return 'friendly'
  return 'neutral'
}

/** Fallback when structured output is unavailable: `tone: …`, `formality: …`, `note: …` lines. */
export function parseToneLines(text: string): ToneReading {
  const field = (key: string) => text.match(new RegExp(`${key}\\s*[:=-]\\s*(.+)`, 'i'))?.[1]?.trim() ?? ''
  const toneWord = field('tone') || text
  const f = parseFloat(field('formality').replace(',', '.'))
  return { tone: toTone(toneWord), formality: normalizeFormality(Number.isNaN(f) ? 0.5 : f), note: cleanNote(field('note')) }
}

export function cleanNote(note: string): string {
  return note
    .trim()
    .replace(/^["“](.*)["”]$/s, '$1')
    .replace(/\.$/, '')
    .trim()
}

/** Strip quotes and preambles small models sometimes add to a rewrite. */
export function cleanSofter(text: string): string {
  return text
    .trim()
    .replace(/^(here('s| is)[^:]*:\s*)/i, '')
    .replace(/^["“](.*)["”]$/s, '$1')
    .trim()
}
