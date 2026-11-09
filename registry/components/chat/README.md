# Chat

A complete on-device conversation: streamed turns with their trace, stop mid-reply, retry, and history trimmed to the model's context.

```bash
npx ondai add chat
```

```tsx
import { Chat } from '@/components/ondai/chat'

<Chat system="You are a helpful assistant inside a notes app. Be brief." suggestions={['Plan a slow Saturday in Lyon', 'What did I note about the budget?']} />
```

Docs: https://ondai.dev/docs/components/chat
