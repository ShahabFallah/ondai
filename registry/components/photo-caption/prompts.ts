export type CaptionTone = 'plain' | 'warm' | 'playful'

const toneHints: Record<CaptionTone, string> = {
  plain: 'The caption is plain and factual.',
  warm: 'The caption is warm and personal, like a post to friends.',
  playful: 'The caption is playful and light, with no emoji or hashtags.',
}

/**
 * One pass, two outputs: the model writes a caption line then an alt text line, so both stream in from a
 * single call (a small on-device model does better with one clear format than with JSON).
 */
export function captionInstructions(tone: CaptionTone = 'plain', extra?: string): string {
  return [
    'You describe photos. Reply with exactly two lines and nothing else.',
    'Line 1 starts with "Caption: " and is a short caption of at most 20 words.',
    toneHints[tone],
    'Line 2 starts with "Alt: " and is accessibility alt text: what is in the photo, its setting and any visible text, objective, at most 125 characters.',
    'The alt text never starts with "image of" or "photo of" and never guesses who a person is.',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

export const captionPrompt = 'Describe this photo.'

const altPrefix = /^\s*(an?\s+)?(image|photo|picture|photograph)\s+(of|showing)\s+/i

/** Deterministic cleanup of alt text: no "image of" preamble, no quotes, a capital first letter. */
export function cleanAlt(text: string): string {
  let s = text.trim().replace(/^["“]|["”]$/g, '').replace(altPrefix, '')
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1)
  return s
}

/** Deterministic cleanup of the caption: no quotes, no hashtags a small model sometimes adds. */
export function cleanCaption(text: string): string {
  return text.trim().replace(/^["“]|["”]$/g, '').replace(/\s*(#\w+\s*)+$/, '').trim()
}

export interface ParsedCaption {
  caption: string
  alt: string
  /** Which line the stream is in right now. */
  writing: 'caption' | 'alt'
}

/**
 * Split the streamed "Caption: …\nAlt: …" reply. Works on partial text, so each output can stream into its
 * own field. A reply with no labels is treated as the caption; a lone second line as the alt text.
 */
export function parseCaption(raw: string): ParsedCaption {
  const text = raw.replace(/\r/g, '')
  const altAt = text.search(/(^|\n)\s*\**\s*alt(\s*text)?\s*\**\s*:/i)
  let captionPart = altAt >= 0 ? text.slice(0, altAt) : text
  let altPart = altAt >= 0 ? text.slice(altAt).replace(/^\s*\**\s*alt(\s*text)?\s*\**\s*:\s*/i, '') : ''
  captionPart = captionPart.replace(/^\s*\**\s*caption\s*\**\s*:\s*/i, '')
  if (altAt < 0) {
    // No "Alt:" label: a second line, once complete, is the alt text.
    const lines = captionPart.split('\n').filter((l) => l.trim())
    // A second line that could still become "Alt:" (a label mid-stream) is held back.
    const pending = lines.length > 1 && /^\s*\**\s*a(l(t(\s*t(e(xt?)?)?)?)?)?\s*$/i.test(lines[1]!)
    if (lines.length > 1 && !pending) {
      captionPart = lines[0]!
      altPart = lines.slice(1).join(' ')
    }
  }
  return { caption: cleanCaption(captionPart.split('\n')[0] ?? ''), alt: cleanAlt(altPart.split('\n').join(' ')), writing: altAt >= 0 || altPart ? 'alt' : 'caption' }
}
