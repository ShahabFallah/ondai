import { z } from 'zod'
import { tool, type ToolMeta } from '@ondai/core'

/** A small calendar-and-places agent, enough to show every step state. The tools resolve locally with sample data. */
export const sampleGoal = 'Find a quiet dinner spot near Priya’s office on Friday and invite her'

export const sampleTools = {
  searchPlaces: tool({
    description: 'Search nearby restaurants and cafes',
    inputSchema: z.object({ query: z.string(), near: z.string() }),
    execute: async ({ near }) => ({ results: [{ name: 'Luigi’s Trattoria', distance: '300 m from ' + near, quiet: true }] }),
  }),
  checkCalendar: tool({
    description: 'List free slots on a day',
    inputSchema: z.object({ day: z.string() }),
    execute: async () => ({ free: ['19:30', '20:00'] }),
  }),
  createEvent: tool({
    description: 'Create a calendar event and invite people',
    inputSchema: z.object({ title: z.string(), when: z.string(), where: z.string(), invite: z.string() }),
    execute: async ({ invite }) => ({ ok: true, invited: invite }),
  }),
}

export const sampleMeta: Record<string, ToolMeta> = {
  searchPlaces: { title: 'Searched quiet places near Priya’s office', policy: 'auto', risk: 'low' },
  checkCalendar: { title: 'Checked your Friday evening', policy: 'auto', risk: 'low' },
  createEvent: { title: 'Create the event and invite Priya', policy: 'ask', risk: 'medium' },
}

export const sampleAnswer = 'Booked Friday at 19:30 at Luigi’s Trattoria, 300 m from Priya’s office, and sent her the invite.'
