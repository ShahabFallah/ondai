# @ondai/core

The runtime behind Ondai's components: a capability router over on-device models, the hooks the components use, and small-model helpers.

```bash
npx expo install @ondai/core @ondai/tokens
# the providers you want (each is an optional peer dependency)
npx expo install @react-native-ai/apple   # Apple Foundation Models, iOS 26+
npx expo install @react-native-ai/adk     # Gemini Nano, Android with AICore
```

```tsx
import { Platform } from 'react-native'
import { createOndai, OndaiProvider, type ProviderAdapter } from '@ondai/core'

// Load each provider only on its own platform: the other one's native module is not there.
const providers: Record<string, ProviderAdapter> = {}
if (Platform.OS === 'ios')
  providers.apple = require('@ondai/core/apple').appleAdapter(require('@react-native-ai/apple'))
if (Platform.OS === 'android')
  providers.nano = require('@ondai/core/adk').nanoAdapter(require('@react-native-ai/adk'))

const ondai = createOndai({ providers, policy: { order: ['apple', 'nano'], allowCloud: false } })

export default function App() {
  return <OndaiProvider value={ondai}>{/* your app */}</OndaiProvider>
}
```

- **Router.** Components ask for a capability (`text`, `structured`, `tools`, `vision`, `embeddings`, `transcription`). The router picks the first ready provider that has it, and moves on to the next one if a provider fails before answering.
- **Hooks.** `useStreamText`, `useStructured`, `useToolAgent`, `useChat`, `useEmbeddings`, `useTranscribe`, `useLocalModel`, `useTask`.
- **Mock.** `@ondai/core/mock` is a scripted provider that runs the same code paths, for tests, previews and Expo Go.
- **Native.** The Apple and Gemini Nano providers are native modules: they need a development build (`npx expo prebuild` or EAS), not Expo Go.

Docs: https://ondai.dev/docs/core

MIT licensed.
