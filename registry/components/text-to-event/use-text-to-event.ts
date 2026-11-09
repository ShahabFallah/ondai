import { useCallback, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { normalizeText, parseDate, useStructured, type StructuredState } from '@ondai/core'
import { eventInstructions } from './prompts'

/** What the model is asked for: words copied from the message. Dates and times are resolved in code. */
export const eventSchema = z.object({
  title: z.string(),
  date: z.string().optional(),
  time: z.string().optional(),
  place: z.string().optional(),
  people: z.array(z.string()).optional(),
})
export type RawEvent = z.infer<typeof eventSchema>

export type EventFieldName = 'title' | 'date' | 'time' | 'place' | 'people'
export const eventFieldNames: readonly EventFieldName[] = ['title', 'date', 'time', 'place', 'people']

/** The editable event. `date` is `YYYY-MM-DD`, `time` is `HH:mm` (none means all day). */
export interface EventDraft {
  title: string
  date?: string
  time?: string
  place?: string
  people: string[]
}

/** The event handed to your calendar code. */
export interface CalendarEvent extends EventDraft {
  /** Local start: the date at the time, or the start of the day when `allDay`. */
  start: Date
  allDay: boolean
}

export interface EventFieldInfo {
  /** 0 to 1. Edited and chosen values are 1. */
  confidence: number
  /** For an ambiguous date: the days it could mean (`YYYY-MM-DD`), the current one first. */
  candidates?: string[]
  /** What the message said, when it could not be read ("sometime soon"). */
  raw?: string
}

export interface RefineEventOptions {
  /** Reference day for "next Friday" and "tomorrow". Defaults to now. */
  now?: Date
  /** Read 05/06 as 5 June rather than May 6. Unambiguous dates (25/10) are always read right. */
  dayFirst?: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')
/** `YYYY-MM-DD` in local time. */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** A local Date from `YYYY-MM-DD` (and `HH:mm`). */
export function toLocalDate(day: string, time?: string): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const [h, min] = time ? (time.split(':').map(Number) as [number, number]) : [0, 0]
  return new Date(y, m - 1, d, h, min)
}
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const weekdayRe = /\bnext\s+(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i
const vagueTime = /\b(morning|afternoon|evening|tonight|noon|midday|lunch|ish|around|about|roughly)\b|ish\b/i
const notPeople = new Set(['me', 'i', 'you', 'us', 'we', 'myself', 'everyone', 'the team'])

/** Turn the model's copied words into an event, field by field, with confidence and the days an unclear date could mean. */
export function refineEvent(raw: Partial<RawEvent> | Record<string, unknown>, source: string, options: RefineEventOptions = {}): { draft: EventDraft; fields: Record<EventFieldName, EventFieldInfo> } {
  const now = options.now ?? new Date()
  const r = raw as Record<string, unknown>
  const said = normalizeText(source)
  const grounded = (v: string) => !!v && said.includes(normalizeText(v))

  // Title: the model writes it, so it is not checked against the message.
  const titleRaw = str(r.title)
  const title = titleRaw || ''
  const titleConf = titleRaw ? 0.9 : 0

  // Date: read the copied phrase; without one, try the message itself, less sure.
  const datePhrase = str(r.date)
  const parse = (p: string, dayFirst = options.dayFirst) => parseDate(p, { now, dayFirst })
  let dateConf = 0
  let date: string | undefined
  let candidates: string[] | undefined
  let dateRaw: string | undefined
  let fromPhrase = parse(datePhrase)
  // Only when the model found an event at all: "thanks for yesterday" names a day but is not one.
  const fromSource = !datePhrase && titleRaw ? parse(source) : null
  // A phrase that only carried a time ("8pm") is not a day.
  if (fromPhrase && !/\d{1,2}[/.-]\d|\d{4}|[a-z]{3}/i.test(fromPhrase.matched.replace(/\b(am|pm)\b/gi, ''))) fromPhrase = null
  const parsed = fromPhrase ?? fromSource
  const phrase = datePhrase || fromSource?.matched || ''
  if (parsed) {
    date = isoDay(parsed.date)
    dateConf = fromPhrase ? (grounded(datePhrase) ? 0.95 : 0.85) : 0.7
    // "next Friday" said early in the week: this Friday or the one after.
    const wk = phrase.match(weekdayRe)
    if (wk) {
      const monIndex = (d: Date) => (d.getDay() + 6) % 7
      if (monIndex(parsed.date) > monIndex(now) && parsed.date.getTime() - now.getTime() < 7 * 86_400_000) {
        const later = new Date(parsed.date)
        later.setDate(later.getDate() + 7)
        candidates = [date, isoDay(later)]
      }
    }
    // "Thursday or Friday"
    if (!candidates && /\s+or\s+/i.test(phrase)) {
      const days = [...new Set(phrase.split(/\s+or\s+/i).map((p) => parse(p)).filter((d): d is NonNullable<typeof d> => !!d).map((d) => isoDay(d.date)))]
      if (days.length > 1) candidates = days
    }
    // 05/06: May 6 or 5 June.
    const num = !candidates ? phrase.match(/\b(\d{1,2})[/.-](\d{1,2})\b/) : null
    if (num && +num[1]! <= 12 && +num[2]! <= 12 && num[1] !== num[2]) {
      const a = parse(phrase, false)
      const b = parse(phrase, true)
      if (a && b && isoDay(a.date) !== isoDay(b.date)) {
        const first = options.dayFirst ? b : a
        const second = options.dayFirst ? a : b
        candidates = [isoDay(first.date), isoDay(second.date)]
      }
    }
    if (candidates) dateConf = 0.45
  } else if (datePhrase) {
    dateRaw = datePhrase
    dateConf = 0.25
  }

  // Time: from its own phrase, else from the date phrase ("Friday at 8").
  const timePhrase = str(r.time)
  let time: string | undefined
  let timeConf = 0
  let timeRaw: string | undefined
  const t = timePhrase ? parseDate(timePhrase, { now }) : null
  const fromDate = !t && parsed?.precision === 'minute' ? parsed : null
  const at = t?.precision === 'minute' ? t : fromDate
  if (at) {
    time = `${pad(at.date.getHours())}:${pad(at.date.getMinutes())}`
    timeConf = vagueTime.test(timePhrase || phrase) ? 0.6 : at === t ? (grounded(timePhrase) ? 0.95 : 0.85) : 0.8
  } else if (timePhrase) {
    timeRaw = timePhrase
    timeConf = 0.25
  }

  // Place and people: copied words, so check they are in the message.
  const placeRaw = str(r.place)
  const place = placeRaw || undefined
  const placeConf = place ? (grounded(place) ? 0.9 : 0.55) : 0
  const list = Array.isArray(r.people) ? r.people.map(str) : str(r.people).split(/\s*(?:,|\band\b|&)\s*/i)
  const people = [...new Set(list.map((p) => p.trim()).filter((p) => p && !notPeople.has(p.toLowerCase())))]
  const peopleConf = people.length ? Math.min(...people.map((p) => (grounded(p) ? 0.9 : 0.55))) : 0

  return {
    draft: { title, date, time, place, people },
    fields: {
      title: { confidence: titleConf },
      date: { confidence: dateConf, candidates, raw: dateRaw },
      time: { confidence: timeConf, raw: timeRaw },
      place: { confidence: placeConf },
      people: { confidence: peopleConf },
    },
  }
}

/** The finished event, or null while it has no title or day. */
export function toCalendarEvent(draft: EventDraft): CalendarEvent | null {
  if (!draft.title.trim() || !draft.date) return null
  return { ...draft, title: draft.title.trim(), start: toLocalDate(draft.date, draft.time), allDay: !draft.time }
}

export interface UseTextToEventOptions extends RefineEventOptions {
  /** Extra instructions after the built-in ones ("Messages are in Italian."). */
  instructions?: string
  /** Called when the event changes: after a run, an edit or a choice. */
  onChange?: (draft: EventDraft) => void
  component?: string
  localOnly?: boolean
}

export interface TextToEventState extends Omit<StructuredState<RawEvent>, 'object' | 'run' | 'partial'> {
  /** The event so far (empty until a run finishes). */
  draft: EventDraft | null
  fields: Record<EventFieldName, EventFieldInfo>
  /** The finished event, or null while it has no title or day. */
  event: CalendarEvent | null
  /** `extract` while the model reads; `empty` when the message holds no event. */
  phase: 'idle' | 'extract' | 'done' | 'empty' | 'error'
  /** The text that was read. */
  source: string
  run: (text: string) => Promise<EventDraft | null>
  /** Set a field. Strings for `date` and `time` are read like the model's ("fri", "8pm"). */
  set: (name: EventFieldName, value: string | string[]) => void
  /** Pick one of an ambiguous date's candidates. */
  choose: (day: string) => void
}

const emptyFields = (): Record<EventFieldName, EventFieldInfo> => ({ title: { confidence: 0 }, date: { confidence: 0 }, time: { confidence: 0 }, place: { confidence: 0 }, people: { confidence: 0 } })
const coercePeople = (o: Record<string, unknown>) => (typeof o.people === 'string' ? { ...o, people: o.people.split(/\s*(?:,|\band\b|&)\s*/i).filter(Boolean) } : o)

/** A message becomes a calendar event: one structured call, then dates, times and names checked on device. */
export function useTextToEvent(options: UseTextToEventOptions = {}): TextToEventState {
  const { now, dayFirst, instructions, onChange, component = 'text-to-event', localOnly } = options
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [fields, setFields] = useState(emptyFields)
  const [phase, setPhase] = useState<TextToEventState['phase']>('idle')
  const [source, setSource] = useState('')
  const optsRef = useRef({ now, dayFirst, onChange })
  optsRef.current = { now, dayFirst, onChange }
  const partial = useMemo(() => eventSchema.partial(), [])
  const structured = useStructured<Partial<RawEvent>>({
    schema: partial,
    instructions: eventInstructions(instructions),
    component,
    localOnly,
    // A model that writes people as one string ("Sara and Tom") still parses.
    refine: (obj) => coercePeople(obj as Record<string, unknown>) as Partial<RawEvent>,
  })

  const commit = useCallback((next: EventDraft) => {
    setDraft(next)
    optsRef.current.onChange?.(next)
  }, [])

  const run = useCallback(
    async (text: string) => {
      setSource(text)
      setPhase('extract')
      setDraft(null)
      setFields(emptyFields())
      try {
        const obj = await structured.run(text)
        const r = refineEvent(coercePeople(obj as Record<string, unknown>), text, { now: optsRef.current.now, dayFirst: optsRef.current.dayFirst })
        if (!r.draft.title && !r.draft.date) {
          setPhase('empty')
          return null
        }
        setFields(r.fields)
        commit(r.draft)
        setPhase('done')
        return r.draft
      } catch (e) {
        setPhase('error')
        throw e
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structured.run, commit],
  )

  const set = useCallback(
    (name: EventFieldName, value: string | string[]) => {
      if (!draft) return
      const next: EventDraft = { ...draft }
      const info: EventFieldInfo = { confidence: 1 }
      const text = Array.isArray(value) ? value.join(', ') : value.trim()
      if (name === 'people') next.people = (Array.isArray(value) ? value : value.split(/\s*,\s*/)).map((p) => p.trim()).filter(Boolean)
      else if (name === 'title') next.title = text
      else if (name === 'place') next.place = text || undefined
      else if (name === 'date') {
        const d = text ? parseDate(text, { now: optsRef.current.now, dayFirst: optsRef.current.dayFirst }) : null
        next.date = d ? isoDay(d.date) : undefined
        if (!d && text) Object.assign(info, { confidence: 0.25, raw: text })
      } else {
        const d = text ? parseDate(text, { now: optsRef.current.now }) : null
        next.time = d?.precision === 'minute' ? `${pad(d.date.getHours())}:${pad(d.date.getMinutes())}` : undefined
        if (!next.time && text) Object.assign(info, { confidence: 0.25, raw: text })
      }
      setFields((f) => ({ ...f, [name]: text ? info : { confidence: 0 } }))
      commit(next)
    },
    [draft, commit],
  )

  const choose = useCallback(
    (day: string) => {
      if (!draft) return
      setFields((f) => ({ ...f, date: { confidence: 1 } }))
      commit({ ...draft, date: day })
    },
    [draft, commit],
  )

  const { object: _o, partial: _p, run: _r, ...rest } = structured
  return {
    ...rest,
    draft,
    fields,
    event: draft ? toCalendarEvent(draft) : null,
    phase,
    source,
    run,
    set,
    choose,
    reset: () => {
      structured.reset()
      setDraft(null)
      setFields(emptyFields())
      setPhase('idle')
      setSource('')
    },
  }
}
