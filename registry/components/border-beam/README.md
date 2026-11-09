# Border beam

A light that travels around a card's border while the model works. libraries.dev's border beam (MIT): Skia shader on iOS and Android, its CSS version on web.

```bash
npx ondai add border-beam
```

```tsx
import { BorderBeam } from '@/components/ondai/border-beam'

<BorderBeam active={isThinking} radius="lg">
  <Card />
</BorderBeam>
```

Docs: https://ondai.dev/docs/components/border-beam
