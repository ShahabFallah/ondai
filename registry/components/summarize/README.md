# Summarize

The gist of long text: card, inline, sheet or tooltip. Streams, and map-reduces input that does not fit the on-device context.

```bash
npx ondai add summarize
```

```tsx
import { Summarize } from '@/components/ondai/summarize'

<Summarize text={thread.text} presentation="card" length="bullets" emphasis="plain" />
```

Docs: https://ondai.dev/docs/components/summarize
