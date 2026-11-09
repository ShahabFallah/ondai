# AssistantMessage

One reply from the on-device model: a trace of what it did, the answer streaming in, its sources, and copy or retry. Includes UserMessage for the person's turns.

```bash
npx ondai add assistant-message
```

```tsx
import { AssistantMessage, UserMessage } from '@/components/ondai/assistant-message'

<UserMessage text={question} />
<AssistantMessage text={reply.text} status={reply.status} thoughtMs={reply.thoughtMs} steps={steps} sources={sources} onRetry={retry} />
```

Docs: https://ondai.dev/docs/components/assistant-message
