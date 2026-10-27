# AgentAvatar

A living face for the on-device assistant: a soft, lit body whose eyes glance and blink. Idle, thinking, speaking and sleeping; blob, square, pill or drop.

```bash
npx ondai add agent-avatar
```

```tsx
import { AgentAvatar } from '@/components/ondai/agent-avatar'

<AgentAvatar size={64} shape="blob" state={isThinking ? 'thinking' : 'idle'} interactive />
```

Docs: https://ondai.dev/docs/components/agent-avatar
