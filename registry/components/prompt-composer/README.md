# PromptComposer

Where a person writes to the on-device model: a growing field, attachments, the model badge and a send key that becomes stop while it answers.

```bash
npx ondai add prompt-composer
```

```tsx
import { PromptComposer } from '@/components/ondai/prompt-composer'

<PromptComposer onSubmit={chat.send} busy={chat.isBusy} onStop={chat.stop} onAttach={pickPhoto} attachments={files} onRemoveAttachment={removeFile} />
```

Docs: https://ondai.dev/docs/components/prompt-composer
