# ModelDownload

A thin progress line, ring or card with a tabular percentage while a model downloads.

```bash
npx ondai add model-download
```

```tsx
import { ModelDownload } from '@/components/ondai/model-download'

<ModelDownload progress={0.42} variant="bar" label="Preparing model" detail="1.2 GB · Wi-Fi only" />
```

Docs: https://ondai.dev/docs/components/model-download
