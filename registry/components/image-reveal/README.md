# ImageReveal

An image arriving the way a diffusion model makes it: grain over a blurred field, resolved step by step.

```bash
npx ondai add image-reveal
```

```tsx
import { ImageReveal } from '@/components/ondai/image-reveal'

<ImageReveal source={{ uri }} width={320} height={220} mode="ascii" progress={busy ? 'auto' : 1} />
```

Docs: https://ondai.dev/docs/components/image-reveal
