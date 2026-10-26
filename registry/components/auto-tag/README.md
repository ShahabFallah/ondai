# AutoTag

Tag and category suggestions constrained to the app's own list, fuzzy-matched after the model answers.

```bash
npx ondai add auto-tag
```

```tsx
import { AutoTag } from '@/components/ondai/auto-tag'

<AutoTag text={note.body} tags={allTags} selected={note.tags} onChange={setTags} presentation="chips" max={3} />
```

Docs: https://ondai.dev/docs/components/auto-tag
