# SmartReply

Three reply suggestions for the last message in a thread: chips, a stack, or ghost text inside the input, with an optional tone picker.

```bash
npx ondai add smart-reply
```

```tsx
import { SmartReply } from '@/components/ondai/smart-reply'

<SmartReply thread={messages} presentation="chips" onSelect={(text) => composer.setText(text)} />
```

Docs: https://ondai.dev/docs/components/smart-reply
