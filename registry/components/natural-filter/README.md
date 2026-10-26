# NaturalFilter

A natural-language search request becomes a typed filter/sort object with editable chips.

```bash
npx ondai add natural-filter
```

```tsx
import { NaturalFilter } from '@/components/ondai/natural-filter'
import { z } from 'zod'

const filters = z.object({ cuisine: z.enum(['italian', 'japanese']).optional(), price: z.enum(['$', '$$', '$$$']).optional(), openNow: z.boolean().optional() })

<NaturalFilter schema={filters} presentation="bar" onChange={(f) => setFilter(f)}>
  <RestaurantList filter={filter} />
</NaturalFilter>
```

Docs: https://ondai.dev/docs/components/natural-filter
