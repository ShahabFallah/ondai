# AgentRun

An agent doing a job on the device, step by step: each tool call with its time, approval before anything risky runs, and the answer at the end.

```bash
npx ondai add agent-run
```

```tsx
import { AgentRun } from '@/components/ondai/agent-run'
import { tool } from '@ondai/core'
import { z } from 'zod'

<AgentRun
  goal="Find a quiet dinner spot near Priya’s office on Friday and invite her"
  tools={{ searchPlaces, checkCalendar, createEvent }}
  meta={{ createEvent: { title: 'Create the event and invite Priya', policy: 'ask', risk: 'medium' } }}
/>
```

Docs: https://ondai.dev/docs/components/agent-run
