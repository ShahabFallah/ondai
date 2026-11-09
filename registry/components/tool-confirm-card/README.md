# ToolConfirmCard

Approval for any tool call: the call as a trace line, then a card with its parameters and deny or confirm.

```bash
npx ondai add tool-confirm-card
```

```tsx
import { ToolConfirmCard } from '@/components/ondai/tool-confirm-card'

const agent = useToolAgent({ tools, meta: { sendEmail: { policy: 'ask', risk: 'high' } } })

<ToolConfirmCard pending={agent.pendingConfirmation} presentation="card" />
```

Docs: https://ondai.dev/docs/components/tool-confirm-card
