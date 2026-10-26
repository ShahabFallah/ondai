# LatencyChip

Dev-only metrics pill: latency, tokens per second, provider.

```bash
npx ondai add latency-chip
```

```tsx
import { LatencyChip } from '@/components/ondai/latency-chip'

<LatencyChip latencyMs={metrics.latencyMs} tokensPerSecond={metrics.tokensPerSecond} provider="apple" />
```

Docs: https://ondai.dev/docs/components/latency-chip
