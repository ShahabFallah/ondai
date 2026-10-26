export type SummaryLength = 'oneLine' | 'bullets' | 'paragraph'

export const summarizeInstructions: Record<SummaryLength, string> = {
  oneLine: 'Summarize the text in one plain sentence of at most 20 words. No preamble.',
  bullets: 'Summarize the text as 3 to 5 short bullet points. Start each line with "- ". No preamble, no headings.',
  paragraph: 'Summarize the text in one short paragraph of 2 to 4 sentences. No preamble.',
}

export const mapInstructions = 'Write 2 to 4 short bullet points with the key facts of this part. Start each line with "- ". No preamble.'

export const reduceInstructions: Record<SummaryLength, string> = {
  oneLine: 'These are notes from parts of one document. Combine them into one plain sentence of at most 20 words. No preamble.',
  bullets: 'These are notes from parts of one document. Combine them into 3 to 5 short bullet points starting with "- ". No preamble.',
  paragraph: 'These are notes from parts of one document. Combine them into one short paragraph of 2 to 4 sentences. No preamble.',
}

/** Deterministic cleanup of small-model output. */
export function cleanSummary(text: string, length: SummaryLength): string {
  let s = text.trim().replace(/^(summary|tl;dr|here is[^:]*):\s*/i, '')
  if (length === 'bullets') {
    s = s
      .split('\n')
      .map((l) => l.trim().replace(/^[•*\-–]\s*/, ''))
      .filter(Boolean)
      .map((l) => `- ${l}`)
      .join('\n')
  }
  return s
}
