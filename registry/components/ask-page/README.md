# AskPage

Ask about the page on screen. The answer streams in grounded in its text, with tap-to-jump quotes and follow-ups, and says when the page does not hold it.

```bash
npx ondai add ask-page
```

```tsx
import { AskPage } from '@/components/ondai/ask-page'

<AskPage text={article.body} pageTitle={article.title} onJump={(q) => scrollTo(q.start)} suggestions={['What changed?']} />
```

Docs: https://ondai.dev/docs/components/ask-page
