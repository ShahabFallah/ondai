# PhotoCaption

A photo in; a caption and accessibility alt text out, written by the on-device vision model. Streamed, editable, copyable, and handed back as alt text.

```bash
npx ondai add photo-caption
```

```tsx
import { PhotoCaption } from '@/components/ondai/photo-caption'

<PhotoCaption
  image={{ uri: asset.uri, base64: asset.base64 }}
  tone="warm"
  onUseAlt={(alt) => post.setAltText(alt)}
/>
```

Docs: https://ondai.dev/docs/components/photo-caption
