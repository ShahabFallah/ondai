# Bot avatar

A glossy little body with eyes that blinks, glances, hops while the model works and sleeps when idle. libraries.dev's bot avatars (MIT): Skia on iOS and Android, canvas on web.

```bash
npx ondai add bot-avatar
```

```tsx
import { BotAvatar } from '@/components/ondai/bot-avatar'

<BotAvatar state={isWorking ? 'working' : 'default'} size={64} />
```

Docs: https://ondai.dev/docs/components/bot-avatar
