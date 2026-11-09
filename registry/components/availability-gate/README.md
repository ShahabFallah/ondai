# AvailabilityGate

Renders children only when the on-device model is ready; otherwise a quiet empty state with a way to turn it on.

```bash
npx ondai add availability-gate
```

```tsx
import { AvailabilityGate } from '@/components/ondai/availability-gate'

<AvailabilityGate capability="text" variant="card">
  <YourAiFeature />
</AvailabilityGate>
```

Docs: https://ondai.dev/docs/components/availability-gate
