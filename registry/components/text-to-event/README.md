# TextToEvent

A pasted or selected message becomes a calendar event: title, date, time, place and people fill in one by one with per-field confidence, stay editable, then go to the calendar.

```bash
npx ondai add text-to-event
```

```tsx
import { TextToEvent } from '@/components/ondai/text-to-event'
import * as Calendar from 'expo-calendar'

<TextToEvent
  onAdd={async (e) => {
    const end = new Date(e.start.getTime() + 60 * 60 * 1000)
    await Calendar.createEventAsync(calendarId, { title: e.title, startDate: e.start, endDate: end, allDay: e.allDay, location: e.place, notes: e.people.join(', ') })
  }}
/>
```

Docs: https://ondai.dev/docs/components/text-to-event
