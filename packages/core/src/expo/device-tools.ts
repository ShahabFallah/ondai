import { tool } from 'ai'
import { z } from 'zod'
import type { ToolMeta } from '../tools'

/**
 * Ready-made tools for the phone's Calendar and Reminders, for `AgentRun`, `useToolAgent` and the command bar.
 * Reads run on their own; anything that writes asks first (`policy: 'ask'`), so a ToolConfirmCard shows the
 * event or reminder before it is saved.
 *
 * Pass the module in, so core keeps no native import:
 *
 *   import * as Calendar from 'expo-calendar/legacy'
 *   const { tools, meta } = calendarTools(Calendar)
 */

/** The subset of `expo-calendar/legacy` these tools use (duck-typed; expo-calendar is an optional peer). */
export interface CalendarModuleLike {
  EntityTypes: { EVENT: string; REMINDER: string }
  requestCalendarPermissionsAsync(): Promise<{ granted: boolean }>
  requestRemindersPermissionsAsync?(): Promise<{ granted: boolean }>
  getCalendarsAsync(entityType?: string): Promise<Array<{ id: string; title?: string; allowsModifications?: boolean }>>
  getDefaultCalendarAsync?(): Promise<{ id: string }>
  getEventsAsync(calendarIds: string[], startDate: Date, endDate: Date): Promise<Array<{ title: string; startDate: string | Date; endDate: string | Date; location?: string | null; allDay?: boolean }>>
  createEventAsync(calendarId: string, details: Record<string, unknown>): Promise<string>
  createReminderAsync?(calendarId: string, details: Record<string, unknown>): Promise<string>
}

export interface DeviceToolsOptions {
  /** How many days ahead `calendarListEvents` may read (default 14). */
  maxDays?: number
  /** Most events returned in one read, to fit a small model's context (default 25). */
  maxEvents?: number
}

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
/** A local date and time from `YYYY-MM-DD` and `HH:MM`. */
const localDate = (date: string, time = '09:00') => {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1, h ?? 9, min ?? 0)
}

async function need(granted: Promise<{ granted: boolean }> | undefined, what: string) {
  if (!granted || !(await granted).granted) throw new Error(`${what} permission was not granted`)
}

async function writableCalendar(Calendar: CalendarModuleLike) {
  if (Calendar.getDefaultCalendarAsync) {
    try {
      return (await Calendar.getDefaultCalendarAsync()).id
    } catch {
      /* Android has no default calendar: pick a writable one below. */
    }
  }
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const c = cals.find((x) => x.allowsModifications) ?? cals[0]
  if (!c) throw new Error('No calendar on this device')
  return c.id
}

/** Read the calendar, add events, add reminders. Returns `tools` and their `meta` (titles and policies). */
export function calendarTools(Calendar: CalendarModuleLike, options: DeviceToolsOptions = {}) {
  const maxDays = options.maxDays ?? 14
  const maxEvents = options.maxEvents ?? 25

  const tools = {
    calendarListEvents: tool({
      description: 'List the user’s calendar events from today for a number of days. Also returns today’s date.',
      inputSchema: z.object({ days: z.number().describe(`How many days ahead, 1 to ${maxDays}`) }),
      execute: async ({ days }) => {
        await need(Calendar.requestCalendarPermissionsAsync(), 'Calendar')
        const from = new Date()
        from.setHours(0, 0, 0, 0)
        const to = new Date(from.getTime() + Math.min(Math.max(1, days), maxDays) * 86400000)
        const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
        const events = await Calendar.getEventsAsync(cals.map((c) => c.id), from, to)
        return {
          today: `${ymd(new Date())} (${new Date().toLocaleDateString('en', { weekday: 'long' })})`,
          events: events.slice(0, maxEvents).map((e) => {
            const s = new Date(e.startDate)
            const end = new Date(e.endDate)
            return { title: e.title, date: ymd(s), start: e.allDay ? 'all day' : hm(s), end: e.allDay ? '' : hm(end), location: e.location ?? undefined }
          }),
        }
      },
    }),
    calendarCreateEvent: tool({
      description: 'Create an event in the user’s calendar. Dates and times are local.',
      inputSchema: z.object({
        title: z.string(),
        date: z.string().describe('YYYY-MM-DD'),
        time: z.string().optional().describe('HH:MM, 24-hour; leave out for an all-day event'),
        minutes: z.number().optional().describe('Length in minutes, default 60'),
        location: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async ({ title, date, time, minutes, location, notes }) => {
        await need(Calendar.requestCalendarPermissionsAsync(), 'Calendar')
        const start = localDate(date, time ?? '00:00')
        const end = time ? new Date(start.getTime() + (minutes ?? 60) * 60000) : new Date(start.getTime() + 86400000)
        const id = await Calendar.createEventAsync(await writableCalendar(Calendar), { title, startDate: start, endDate: end, allDay: !time, location, notes })
        return { ok: true, id, when: time ? `${date} ${time}` : `${date}, all day` }
      },
    }),
    remindersCreate: tool({
      description: 'Add a reminder (a to-do) to the user’s Reminders.',
      inputSchema: z.object({
        title: z.string().describe('The to-do, starting with a verb'),
        dueDate: z.string().optional().describe('YYYY-MM-DD'),
        dueTime: z.string().optional().describe('HH:MM, 24-hour'),
        notes: z.string().optional(),
      }),
      execute: async ({ title, dueDate, dueTime, notes }) => {
        if (!Calendar.createReminderAsync || !Calendar.requestRemindersPermissionsAsync) throw new Error('Reminders are available on iOS')
        await need(Calendar.requestRemindersPermissionsAsync(), 'Reminders')
        const lists = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER)
        const list = lists.find((l) => l.allowsModifications) ?? lists[0]
        if (!list) throw new Error('No Reminders list on this device')
        const id = await Calendar.createReminderAsync(list.id, { title, notes, dueDate: dueDate ? localDate(dueDate, dueTime) : undefined })
        return { ok: true, id }
      },
    }),
  }

  const meta: Record<keyof typeof tools, ToolMeta> = {
    calendarListEvents: { title: 'Read your calendar', policy: 'auto', risk: 'low', keywords: ['calendar', 'schedule', 'free', 'busy', 'week', 'meeting'] },
    calendarCreateEvent: { title: 'Add to your calendar', policy: 'ask', risk: 'medium', keywords: ['event', 'meeting', 'book', 'schedule', 'invite'] },
    remindersCreate: { title: 'Add a reminder', policy: 'ask', risk: 'medium', keywords: ['remind', 'todo', 'task', 'remember'] },
  }

  return { tools, meta }
}
