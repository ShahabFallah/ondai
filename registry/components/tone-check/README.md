# ToneCheck

Reads the tone of a draft as you type (friendly, neutral, blunt or tense, casual to formal) and offers a one-tap softer rewrite when it reads off.

```bash
npx ondai add tone-check
```

```tsx
import { ToneCheck } from '@/components/ondai/tone-check'

<ToneCheck value={draft} onAccept={setDraft} />
```

Docs: https://ondai.dev/docs/components/tone-check
