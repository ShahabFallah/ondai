import { describe, expect, it, vi } from 'vitest'
import { calendarTools, type CalendarModuleLike } from './device-tools'

function fakeCalendar(): CalendarModuleLike & { created: Array<Record<string, unknown>>; reminders: Array<Record<string, unknown>> } {
  const created: Array<Record<string, unknown>> = []
  const reminders: Array<Record<string, unknown>> = []
  return {
    created,
    reminders,
    EntityTypes: { EVENT: 'event', REMINDER: 'reminder' },
    requestCalendarPermissionsAsync: vi.fn(async () => ({ granted: true })),
    requestRemindersPermissionsAsync: vi.fn(async () => ({ granted: true })),
    getCalendarsAsync: vi.fn(async (t?: string) => [{ id: t === 'reminder' ? 'list-1' : 'cal-1', allowsModifications: true }]),
    getDefaultCalendarAsync: vi.fn(async () => ({ id: 'cal-1' })),
    getEventsAsync: vi.fn(async () => [{ title: 'Standup', startDate: new Date(2026, 10, 16, 9, 30), endDate: new Date(2026, 10, 16, 9, 45) }]),
    createEventAsync: vi.fn(async (_id: string, d: Record<string, unknown>) => (created.push(d), 'ev-1')),
    createReminderAsync: vi.fn(async (_id: string, d: Record<string, unknown>) => (reminders.push(d), 'rem-1')),
  }
}
const run = (t: { execute?: unknown }, input: unknown) => (t.execute as (i: unknown, o: unknown) => Promise<Record<string, unknown>>)(input, { toolCallId: 't', messages: [] })

describe('calendarTools', () => {
  it('reads events as short local lines with today', async () => {
    const { tools } = calendarTools(fakeCalendar())
    const out = await run(tools.calendarListEvents, { days: 3 })
    expect(out.today).toMatch(/^\d{4}-\d{2}-\d{2} \(/)
    expect(out.events).toEqual([{ title: 'Standup', date: '2026-11-16', start: '09:30', end: '09:45', location: undefined }])
  })
  it('creates a timed event in the default calendar, and an all-day one without a time', async () => {
    const cal = fakeCalendar()
    const { tools } = calendarTools(cal)
    await run(tools.calendarCreateEvent, { title: 'Focus', date: '2026-11-18', time: '19:30', minutes: 45 })
    await run(tools.calendarCreateEvent, { title: 'Holiday', date: '2026-12-24' })
    expect(cal.created[0]).toMatchObject({ title: 'Focus', allDay: false })
    expect((cal.created[0]!.endDate as Date).getTime() - (cal.created[0]!.startDate as Date).getTime()).toBe(45 * 60000)
    expect(cal.created[1]).toMatchObject({ title: 'Holiday', allDay: true })
  })
  it('adds a reminder with a due date', async () => {
    const cal = fakeCalendar()
    const { tools } = calendarTools(cal)
    await run(tools.remindersCreate, { title: 'Call mom', dueDate: '2026-11-17', dueTime: '18:00' })
    expect(cal.reminders[0]).toMatchObject({ title: 'Call mom' })
    expect((cal.reminders[0]!.dueDate as Date).getHours()).toBe(18)
  })
  it('asks before writing, reads on its own', () => {
    const { meta } = calendarTools(fakeCalendar())
    expect(meta.calendarListEvents.policy).toBe('auto')
    expect(meta.calendarCreateEvent.policy).toBe('ask')
    expect(meta.remindersCreate.policy).toBe('ask')
  })
  it('stops when permission is refused', async () => {
    const cal = fakeCalendar()
    cal.requestCalendarPermissionsAsync = async () => ({ granted: false })
    await expect(run(calendarTools(cal).tools.calendarListEvents, { days: 1 })).rejects.toThrow(/permission/)
  })
})
