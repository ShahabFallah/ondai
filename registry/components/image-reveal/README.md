# ImageReveal

An image that resolves out of a churning mosaic or an ASCII field as progress rises. The loader for anything the model draws or reads.

```bash
npx ondai add image-reveal
```

```tsx
import { ImageReveal } from '@/components/ondai/image-reveal'

<ImageReveal source={{ uri }} width={320} height={220} mode="ascii" progress={busy ? 'auto' : 1} />
```

Docs: https://ondai.dev/docs/components/image-reveal
