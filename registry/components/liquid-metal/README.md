# Liquid metal

A ring of liquid metal around a button, a mic or an avatar, glowing while the model works. libraries.dev's metal-fx (MIT, shader from Paper Shaders, Apache-2.0): Skia on iOS and Android, WebGL on web.

```bash
npx ondai add liquid-metal
```

```tsx
import { LiquidMetal } from '@/components/ondai/liquid-metal'

<LiquidMetal active={isListening} shape="circle">
  <MicButton />
</LiquidMetal>
```

Docs: https://ondai.dev/docs/components/liquid-metal
