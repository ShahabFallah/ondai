# VoiceMemo

Talk, and get the memo back as something to act on: a title, a two-line summary and the to-dos you mentioned, ticked and ready to add. All on device.

```bash
npx ondai add voice-memo
```

```tsx
import { VoiceMemo } from '@/components/ondai/voice-memo'

<VoiceMemo onAdd={(todos) => reminders.add(todos)} addLabel="Add to Reminders" />
```

Docs: https://ondai.dev/docs/components/voice-memo
