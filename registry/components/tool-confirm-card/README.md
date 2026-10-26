# ToolConfirmCard

Approval for any tool call: action, parameters and risk level, with approve / edit / cancel.

```bash
npx ondai add tool-confirm-card
```

```tsx
import { ToolConfirmCard } from '@/components/ondai/tool-confirm-card'

const agent = useToolAgent({ tools, meta: { sendEmail: { policy: 'ask', risk: 'high' } } })

<ToolConfirmCard pending={agent.pendingConfirmation} presentation="card" />
```

Docs: https://ondai.dev/docs/components/tool-confirm-card
