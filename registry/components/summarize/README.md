# Summarize

A TL;DR for long text: card, inline, sheet or tooltip. Streams, and map-reduces input that does not fit the on-device context.

```bash
npx ondai add summarize
```

```tsx
import { Summarize } from '@/components/ondai/summarize'

<Summarize text={thread.text} presentation="card" length="bullets" style="plain" />
```

Docs: https://ondai.dev/docs/components/summarize
