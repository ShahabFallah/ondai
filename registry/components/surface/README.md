# Surface

The container every card-shaped component draws with: solid, blurred glass, or the platform's own material (Liquid Glass on iOS 26, Material 3 on Android).

```bash
npx ondai add surface
```

```tsx
import { Surface } from '@/components/ondai/surface'

<Surface elevation="card" style={{ padding: 16 }}>
  <Text>Follows the theme: solid, glass, or Liquid Glass on iOS 26</Text>
</Surface>
```

Docs: https://ondai.dev/docs/components/surface
