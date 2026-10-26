# SemanticSearch

Search by meaning over the app's own records with a local vector index and hybrid keyword matching, showing why each result matched.

```bash
npx ondai add semantic-search
```

```tsx
import { SemanticSearch } from '@/components/ondai/semantic-search'
import { sqliteStorage } from '@ondai/core/expo'
import { openDatabaseAsync } from 'expo-sqlite'

<SemanticSearch
  items={notes.map((n) => ({ id: n.id, text: n.body, metadata: n }))}
  storage={sqliteStorage({ open: openDatabaseAsync })}
  presentation="bar" resultStyle="list"
  onSelect={(hit) => router.push(`/notes/${hit.id}`)}
/>
```

Docs: https://ondai.dev/docs/components/semantic-search
