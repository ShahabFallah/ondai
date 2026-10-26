# CommandBar

Spotlight for your app: natural language becomes one of your registered actions or routes, chosen by on-device tool calling, with preview and confirmation.

```bash
npx ondai add command-bar
```

```tsx
import { CommandBar, defineActions, defineAction } from '@/components/ondai/command-bar'
import { z } from 'zod'

const actions = defineActions([
  defineAction({
    id: 'task.create', title: 'Create task', keywords: ['todo', 'remind'],
    params: z.object({ title: z.string(), due: z.string().optional() }),
    preview: (p) => `Create task · ${p.title}`,
    run: (p) => tasks.add(p),
  }),
  defineAction({ id: 'email.send', title: 'Send email', risk: 'high', params: z.object({ to: z.string(), subject: z.string() }), run: sendEmail }),
])

<CommandBar actions={actions} presentation="spotlight" variant="glass" open={open} onOpenChange={setOpen} />
```

Docs: https://ondai.dev/docs/components/command-bar
