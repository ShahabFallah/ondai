import { chunk, estimateTokens, keywordScore } from '@ondai/core'

/** The model's whole reply when the page does not hold the answer. */
export const NOT_IN_PAGE = 'NOT_IN_PAGE'

export const askPageInstructions = [
  'You answer questions about one page of text. Use only the page; never use outside knowledge.',
  'Reply in exactly this format, with no preamble:',
  'ANSWER: <the answer in 1 to 3 short sentences>',
  'QUOTE: <a short phrase copied word for word from the page that supports the answer>',
  'QUOTE: <optional second phrase>',
  'FOLLOW: <a short follow-up question this page can answer>',
  'FOLLOW: <optional second follow-up question>',
  `If the page does not contain the answer, reply with exactly: ${NOT_IN_PAGE}`,
].join('\n')

export function askPagePrompt(page: string, question: string, title?: string): string {
  return `${title ? `Page title: ${title}\n` : ''}Page:\n"""\n${page}\n"""\n\nQuestion: ${question.trim()}`
}

/** One parsed reply. `quotes` are the model's raw phrases; `locateQuote` grounds them in the page. */
export interface ParsedAnswer {
  answer: string
  quotes: string[]
  followUps: string[]
  notFound: boolean
}

const label = /^\s*(ANSWER|QUOTE|FOLLOW(?:[- ]?UP)?)\s*:\s*/i
const unquote = (s: string) => s.trim().replace(/^["“”'‘’«»]+|["“”'‘’«»]+$/g, '').trim()
const notFoundAnswer = /\b(not (in|on|mentioned in|covered (in|by)|stated in) (this|the) (page|text|document))|(the (page|text|document) does(n't| not) (say|mention|cover|contain))/i

/**
 * Parse a streamed or finished reply. Text before any label counts as the answer, so a small model that
 * skips `ANSWER:` still reads. While the reply could still become the not-found marker, it shows nothing.
 */
export function parseAnswer(raw: string, streaming = false): ParsedAnswer {
  const text = raw.replace(/\r\n/g, '\n').trim()
  const upper = text.toUpperCase().replace(/\s+/g, '_')
  if (upper.startsWith(NOT_IN_PAGE) || (streaming && text && NOT_IN_PAGE.startsWith(upper))) {
    return { answer: '', quotes: [], followUps: [], notFound: !streaming || upper.startsWith(NOT_IN_PAGE) }
  }
  const answer: string[] = []
  const quotes: string[] = []
  const followUps: string[] = []
  let section: 'answer' | 'quote' | 'follow' = 'answer'
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const m = line.match(label)
    // A label still being typed on the last line ("QUO") is held back rather than shown as answer text.
    if (!m && streaming && i === lines.length - 1 && i > 0 && /^\s*[A-Z]{1,8}$/.test(line)) return
    if (m) section = m[1]!.toUpperCase() === 'ANSWER' ? 'answer' : m[1]!.toUpperCase() === 'QUOTE' ? 'quote' : 'follow'
    const body = m ? line.slice(m[0].length) : line
    if (section === 'answer') answer.push(body)
    else if (section === 'quote') {
      const q = unquote(body)
      if (q) quotes.push(q)
    } else {
      const f = body.trim().replace(/^[-•*]\s*/, '')
      if (f) followUps.push(f.endsWith('?') || streaming ? f : `${f}?`)
    }
  })
  const joined = answer.join(' ').replace(/\s+/g, ' ').trim()
  const notFound = !streaming && !quotes.length && notFoundAnswer.test(joined)
  return { answer: notFound ? '' : joined, quotes, followUps: followUps.slice(0, 3), notFound }
}

/** A quote found in the page: the page's own words and where they sit, for highlighting and scrolling. */
export interface PageQuote {
  text: string
  start: number
  end: number
  /** `exact` matched word for word; `near` is the page sentence closest to a paraphrased quote. */
  match: 'exact' | 'near'
}

const fold = (c: string) => c.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"')

/** Find a quote in the page, ignoring case and spacing; fall back to the closest sentence. Returns null when it is not there. */
export function locateQuote(page: string, quote: string): PageQuote | null {
  const q = unquote(quote).replace(/\s+/g, ' ').replace(/[.…]+$/, '')
  if (q.length < 3) return null
  // Collapse whitespace in the page while keeping a map back to the original offsets.
  let flat = ''
  const map: number[] = []
  let space = false
  for (let i = 0; i < page.length; i++) {
    const ch = page[i]!
    if (/\s/.test(ch)) {
      if (!space && flat) {
        flat += ' '
        map.push(i)
      }
      space = true
    } else {
      flat += fold(ch)
      map.push(i)
      space = false
    }
  }
  const at = flat.indexOf(fold(q))
  if (at >= 0) {
    const start = map[at]!
    const end = map[at + q.length - 1]! + 1
    return { text: page.slice(start, end), start, end, match: 'exact' }
  }
  let best: PageQuote | null = null
  let bestScore = 0.6
  const re = /[^.!?\n]+[.!?]?/g
  for (let m = re.exec(page); m; m = re.exec(page)) {
    const sentence = m[0].trim()
    if (sentence.length < 8) continue
    const score = keywordScore(q, sentence)
    if (score > bestScore) {
      const start = m.index + m[0].indexOf(sentence)
      bestScore = score
      best = { text: sentence, start, end: start + sentence.length, match: 'near' }
    }
  }
  return best
}

/**
 * The parts of a long page most relevant to the question, in page order, within `maxTokens`. Short pages
 * come back whole. `trimmed` says whether anything was left out.
 */
export function excerptForQuestion(page: string, question: string, maxTokens: number): { text: string; trimmed: boolean } {
  if (estimateTokens(page) <= maxTokens) return { text: page, trimmed: false }
  const parts = chunk(page, { maxTokens: Math.max(80, Math.floor(maxTokens / 4)) })
  const ranked = parts.map((p, i) => ({ p, i, score: keywordScore(question, p) + (i === 0 ? 0.05 : 0) })).sort((a, b) => b.score - a.score)
  const keep = new Set<number>()
  let used = 0
  for (const r of ranked) {
    const t = estimateTokens(r.p)
    if (used + t > maxTokens) continue
    keep.add(r.i)
    used += t
  }
  return { text: parts.filter((_, i) => keep.has(i)).join('\n\n…\n\n'), trimmed: true }
}
