/**
 * Deterministic helpers beat the model: parse dates, money and numbers in code and fuzzy-match
 * model output to the app's own enums.
 */

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>()
  const t = ` ${s} `
  for (let i = 0; i < t.length - 1; i++) {
    const b = t.slice(i, i + 2)
    m.set(b, (m.get(b) ?? 0) + 1)
  }
  return m
}

/** Sørensen–Dice similarity over character bigrams (0..1). */
export function similarity(a: string, b: string): number {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const ba = bigrams(na)
  const bb = bigrams(nb)
  let inter = 0
  for (const [k, v] of ba) inter += Math.min(v, bb.get(k) ?? 0)
  let sa = 0
  let sb = 0
  for (const v of ba.values()) sa += v
  for (const v of bb.values()) sb += v
  return (2 * inter) / (sa + sb)
}

export interface MatchEnumOptions {
  /** Minimum similarity to accept (default 0.5). */
  threshold?: number
  /** Optional aliases per option, e.g. { groceries: ['food', 'supermarket'] }. */
  aliases?: Record<string, string[]>
}

export interface EnumMatch<T extends string> {
  value: T
  score: number
  /** How it matched: exact, alias, prefix, contains or fuzzy. */
  via: 'exact' | 'alias' | 'prefix' | 'contains' | 'fuzzy'
}

/** Fuzzy-match a model string to one of the app's own options. Returns null below threshold. */
export function matchEnum<T extends string>(
  input: string | null | undefined,
  options: readonly T[],
  opts: MatchEnumOptions = {},
): EnumMatch<T> | null {
  if (!input || !options.length) return null
  const q = normalizeText(input)
  if (!q) return null
  const threshold = opts.threshold ?? 0.5
  let best: EnumMatch<T> | null = null
  const consider = (value: T, score: number, via: EnumMatch<T>['via']) => {
    if (!best || score > best.score) best = { value, score, via }
  }
  for (const o of options) {
    const no = normalizeText(o)
    if (no === q) return { value: o, score: 1, via: 'exact' }
    for (const alias of opts.aliases?.[o] ?? []) {
      const na = normalizeText(alias)
      if (na === q) consider(o, 0.98, 'alias')
      else if (na.includes(q) || q.includes(na)) consider(o, 0.85, 'alias')
    }
    if (no.startsWith(q) || q.startsWith(no)) consider(o, 0.9, 'prefix')
    else if (no.includes(q) || q.includes(no)) consider(o, 0.8, 'contains')
    consider(o, similarity(q, no), 'fuzzy')
  }
  const b = best as EnumMatch<T> | null
  return b && b.score >= threshold ? b : null
}

/** Match several comma/newline separated values to options, de-duplicated, in input order. */
export function matchEnumList<T extends string>(
  input: string | string[] | null | undefined,
  options: readonly T[],
  opts: MatchEnumOptions = {},
): T[] {
  if (!input) return []
  const parts = Array.isArray(input) ? input : input.split(/[,\n;]+/)
  const out: T[] = []
  for (const p of parts) {
    const m = matchEnum(p, options, opts)
    if (m && !out.includes(m.value)) out.push(m.value)
  }
  return out
}

// ---------------------------------------------------------------- numbers & money

const numberWords: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000, a: 1, an: 1, dozen: 12, half: 0.5, couple: 2,
}

/** Parse "1,200", "1.200,50", "3.5k", "twenty five", "a dozen". Returns null when nothing numeric. */
export function parseNumber(input: string | number | null | undefined): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  if (!input) return null
  const s = input.trim().toLowerCase()
  const m = s.match(/-?\d[\d.,\s]*(?:[kKmM]\b)?/)
  if (m) {
    let raw = m[0].replace(/\s/g, '')
    const suffix = raw.match(/[km]$/)?.[0]
    raw = raw.replace(/[km]$/, '')
    // Decide decimal separator: last separator wins if followed by exactly 1–2 digits.
    const lastSep = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(','))
    if (lastSep > -1) {
      const frac = raw.slice(lastSep + 1)
      const int = raw.slice(0, lastSep).replace(/[.,]/g, '')
      raw = frac.length > 0 && frac.length <= 2 ? `${int}.${frac}` : `${int}${frac}`
    }
    const n = parseFloat(raw)
    if (Number.isFinite(n)) return suffix === 'k' ? n * 1000 : suffix === 'm' ? n * 1_000_000 : n
  }
  // Number words.
  const words = s.replace(/-/g, ' ').split(/\s+/)
  let total = 0
  let current = 0
  let seen = false
  for (const w of words) {
    if (w === 'a' || w === 'an') continue
    const v = numberWords[w]
    if (v === undefined) {
      if (w === 'and') continue
      if (seen) break
      continue
    }
    seen = true
    if (v === 100) current = Math.max(1, current) * 100
    else if (v === 1000) {
      total += Math.max(1, current) * 1000
      current = 0
    } else current += v
  }
  return seen ? total + current : null
}

const currencySymbols: Record<string, string> = {
  $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR', '₩': 'KRW', '₺': 'TRY', '₽': 'RUB', 'R$': 'BRL', 'A$': 'AUD', 'C$': 'CAD', CHF: 'CHF',
}

export interface Money {
  amount: number
  currency?: string
}

/** Parse "€12.50", "$1,200", "12,50 €", "USD 30", "30 dollars", "1.2k". */
export function parseMoney(input: string | null | undefined): Money | null {
  if (!input) return null
  const s = input.trim()
  let currency: string | undefined
  for (const [sym, code] of Object.entries(currencySymbols)) if (s.includes(sym)) currency = code
  const iso = s.match(/\b(USD|EUR|GBP|JPY|INR|AUD|CAD|CHF|SEK|NOK|DKK|PLN|BRL|MXN|CNY|KRW|TRY)\b/i)
  if (iso) currency = iso[1]!.toUpperCase()
  const word = s.match(/\b(dollars?|euros?|pounds?|yen|bucks|quid)\b/i)?.[1]?.toLowerCase()
  if (!currency && word) currency = { dollar: 'USD', dollars: 'USD', bucks: 'USD', euro: 'EUR', euros: 'EUR', pound: 'GBP', pounds: 'GBP', quid: 'GBP', yen: 'JPY' }[word]
  const amount = parseNumber(s.replace(/\b(USD|EUR|GBP|JPY|INR|AUD|CAD|CHF|SEK|NOK|DKK|PLN|BRL|MXN|CNY|KRW|TRY)\b/i, ''))
  if (amount === null) return null
  return currency ? { amount, currency } : { amount }
}

// ---------------------------------------------------------------- dates

export interface ParseDateOptions {
  /** Reference "now" (default: new Date()). */
  now?: Date
  /** 0 = Sunday, 1 = Monday (default 1). */
  weekStartsOn?: 0 | 1
  /** Prefer future dates for bare weekdays/times (default true). */
  forward?: boolean
}

export interface ParsedDate {
  date: Date
  /** `day` when no time was given. */
  precision: 'day' | 'minute'
  /** The substring that produced the date. */
  matched: string
}

const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function parseTime(s: string): { h: number; m: number; matched: string } | null {
  const t = s.toLowerCase()
  const named: Array<[RegExp, number, number]> = [
    [/\bnoon\b|\bmidday\b|\bafter lunch\b|\blunch(time)?\b/, 12, 0],
    [/\bmidnight\b/, 0, 0],
    [/\b(in the )?morning\b/, 9, 0],
    [/\b(in the )?afternoon\b/, 15, 0],
    [/\b(in the )?evening\b|\btonight\b/, 19, 0],
    [/\bend of (the )?day\b|\beod\b/, 17, 0],
  ]
  for (const [re, h, m] of named) {
    const mm = t.match(re)
    if (mm) return { h, m, matched: mm[0] }
  }
  const mm = t.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b(?!\s*(?:\/|-|\.)\d)/)
  if (!mm) return null
  let h = parseInt(mm[1]!, 10)
  const m = mm[2] ? parseInt(mm[2], 10) : 0
  const ap = mm[3]?.replace(/\./g, '')
  if (!ap && !mm[2]) return null // bare number without am/pm or minutes is not a time
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23 || m > 59) return null
  return { h, m, matched: mm[0] }
}

/** Parse natural-language dates deterministically. Returns null if nothing recognizable. */
export function parseDate(input: string | null | undefined, options: ParseDateOptions = {}): ParsedDate | null {
  if (!input) return null
  const now = options.now ?? new Date()
  const forward = options.forward ?? true
  const text = input.trim()
  const lower = text.toLowerCase()
  let date: Date | null = null
  let matched = ''
  let precision: ParsedDate['precision'] = 'day'

  // ISO / numeric
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/)
  if (iso) {
    date = new Date(+iso[1]!, +iso[2]! - 1, +iso[3]!, iso[4] ? +iso[4] : 0, iso[5] ? +iso[5] : 0)
    matched = iso[0]
    if (iso[4]) precision = 'minute'
  }
  const slash = !date && text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (slash) {
    const y = slash[3] ? (slash[3].length === 2 ? 2000 + +slash[3] : +slash[3]) : now.getFullYear()
    date = new Date(y, +slash[1]! - 1, +slash[2]!)
    matched = slash[0]
  }
  // Month name day [year]  /  day month [year]
  const mn = months.map((m) => m.slice(0, 3)).join('|')
  const m1 = date ? null : lower.match(new RegExp(`\\b(${mn})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`))
  const m2 = date || m1 ? null : lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${mn})[a-z]*\\.?(?:,?\\s+(\\d{4}))?`))
  const mm = m1 ?? m2
  if (mm) {
    const monthIdx = months.findIndex((x) => x.startsWith(m1 ? mm[1]! : mm[2]!))
    const day = +(m1 ? mm[2]! : mm[1]!)
    const y = mm[3] ? +mm[3] : now.getFullYear()
    date = new Date(y, monthIdx, day)
    if (!mm[3] && forward && date < startOfDay(now)) date.setFullYear(y + 1)
    matched = mm[0]
  }
  // Relative words
  if (!date) {
    const rel: Array<[RegExp, (d: Date) => void]> = [
      [/\bday after tomorrow\b/, (d) => d.setDate(d.getDate() + 2)],
      [/\btoday\b|\btonight\b/, () => {}],
      [/\btomorrow\b/, (d) => d.setDate(d.getDate() + 1)],
      [/\byesterday\b/, (d) => d.setDate(d.getDate() - 1)],
      [/\bnext week\b/, (d) => d.setDate(d.getDate() + 7)],
      [/\bnext month\b/, (d) => d.setMonth(d.getMonth() + 1)],
      [/\bnext year\b/, (d) => d.setFullYear(d.getFullYear() + 1)],
      [/\bend of (the )?month\b/, (d) => d.setMonth(d.getMonth() + 1, 0)],
    ]
    for (const [re, fn] of rel) {
      const mm = lower.match(re)
      if (mm) {
        date = startOfDay(now)
        fn(date)
        matched = mm[0]
        break
      }
    }
  }
  // "in 3 days/weeks/hours/minutes", "3 days from now"
  if (!date) {
    const mm = lower.match(/\b(?:in\s+)?(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(minute|hour|day|week|month|year)s?(?:\s+from now)?\b/)
    if (mm && (lower.includes('in ') || lower.includes('from now'))) {
      const n = parseNumber(mm[1]!) ?? 1
      const d = new Date(now)
      const unit = mm[2]!
      if (unit === 'minute') { d.setMinutes(d.getMinutes() + n); precision = 'minute' }
      else if (unit === 'hour') { d.setHours(d.getHours() + n); precision = 'minute' }
      else if (unit === 'day') d.setDate(d.getDate() + n)
      else if (unit === 'week') d.setDate(d.getDate() + n * 7)
      else if (unit === 'month') d.setMonth(d.getMonth() + n)
      else d.setFullYear(d.getFullYear() + n)
      date = precision === 'day' ? startOfDay(d) : d
      matched = mm[0]
    }
  }
  // Weekdays: "friday", "next friday", "this friday"
  if (!date) {
    const mm = lower.match(/\b(next|this|on)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/)
    if (mm) {
      const target = weekdays.findIndex((w) => w.startsWith(mm[2]!.slice(0, 3)))
      const d = startOfDay(now)
      let delta = (target - d.getDay() + 7) % 7
      if (mm[1] === 'next') delta = delta === 0 ? 7 : delta + (delta <= 0 ? 7 : 0)
      else if (delta === 0 && forward && mm[1] !== 'this') delta = 7
      if (mm[1] === 'next' && delta < 7) delta += 0
      d.setDate(d.getDate() + delta)
      date = d
      matched = mm[0].trim()
    }
  }

  const time = parseTime(lower)
  if (time) {
    if (!date) {
      date = startOfDay(now)
      date.setHours(time.h, time.m)
      if (forward && date <= now) date.setDate(date.getDate() + 1)
    } else {
      date.setHours(time.h, time.m, 0, 0)
    }
    precision = 'minute'
    matched = matched ? `${matched} ${time.matched}`.trim() : time.matched
  }
  if (!date || Number.isNaN(date.getTime())) return null
  return { date, precision, matched }
}
