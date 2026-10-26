# SmartInput

Text, voice or photo fills your zod form on device, with per-field confidence, deterministic refinement and confirm/undo.

```bash
npx ondai add smart-input
```

```tsx
import { SmartInput } from '@/components/ondai/smart-input'
import { z } from 'zod'

const expense = z.object({
  merchant: z.string(),
  amount: z.number(),
  category: z.enum(['food', 'transport', 'home', 'other']),
  date: z.string().describe('date').optional(),
})

<SmartInput schema={expense} presentation="field" onFill={(values) => form.reset(values)} aliases={{ category: { food: ['lunch', 'dinner'] } }} />
```

Docs: https://ondai.dev/docs/components/smart-input
