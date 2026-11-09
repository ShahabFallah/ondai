# InlineSuggest

A text field that offers the rest of the sentence as ghost text while the person types, from the on-device model. Tab or the Add key takes it.

```bash
npx ondai add inline-suggest
```

```tsx
import { InlineSuggest } from '@/components/ondai/inline-suggest'

<InlineSuggest context="A message to Priya about Friday’s dinner" value={text} onChangeText={setText} />
```

Docs: https://ondai.dev/docs/components/inline-suggest
