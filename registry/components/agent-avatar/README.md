# AgentAvatar

The assistant's face in your app's AI states (idle, thinking, speaking, sleeping), drawn by BotAvatar from libraries.dev.

```bash
npx ondai add agent-avatar
```

```tsx
import { AgentAvatar } from '@/components/ondai/agent-avatar'

<AgentAvatar size={64} shape="blob" state={isThinking ? 'thinking' : 'idle'} interactive />
```

Docs: https://ondai.dev/docs/components/agent-avatar
