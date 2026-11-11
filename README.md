<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-light.svg" />
    <img src="assets/brand/wordmark-dark.svg" alt="ondai" width="220" />
  </picture>
</p>

<h3 align="center">AI components for on-device foundation models.</h3>

<p align="center">
  Production-ready UI that runs on the model already inside the phone.<br/>
  Apple Intelligence and Gemini Nano, wired into components you own.
</p>

<p align="center">
  <a href="https://ondai.dev"><img alt="ondai.dev" src="https://img.shields.io/badge/ondai.dev-docs-0d0d0f?style=flat-square" /></a>
  <a href="https://ondai.dev/docs/device-support"><img alt="Apple Intelligence" src="https://img.shields.io/badge/Apple%20Intelligence-supported-0d0d0f?style=flat-square&logo=apple&logoColor=white" /></a>
  <a href="https://ondai.dev/docs/device-support"><img alt="Gemini Nano" src="https://img.shields.io/badge/Gemini%20Nano-supported-0d0d0f?style=flat-square&logo=google&logoColor=white" /></a>
  <a href="https://ondai.dev/docs/installation"><img alt="React Native" src="https://img.shields.io/badge/React%20Native-Expo-0d0d0f?style=flat-square&logo=react&logoColor=white" /></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0d0d0f?style=flat-square" /></a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/film/ondai-film-dark.gif" />
    <img src="assets/film/ondai-film-light.gif" alt="A phone rises as the on-device models circle it; inside, Ondai components take a request, run an agent with an approval, search by meaning and turn a voice memo into to-dos." width="100%" />
  </picture>
</p>

---

Every phone shipping today carries a capable foundation model. Ondai turns it into product: commands that take action, agents that ask before they act, search that understands meaning, forms that fill themselves, voice that becomes tasks. Each component is a complete feature (the UI, the prompts, the schema, every state from thinking to refusal), and the code lands in your repo, so it is yours to shape.

- **On-device first.** Requests run on Apple Intelligence or Gemini Nano. No API bill, no data leaving the phone, and it works in airplane mode. A cloud model joins only if you allow it.
- **One router, every model.** `@ondai/core` picks the best model the device has for each capability (text, structured output, tools, vision, speech) and falls back to the next one on its own.
- **Built for small models.** Prompts budgeted for a 4K context, output validated with zod, streaming, and calm states for refusals and devices without a model.
- **Designed to the last state.** Eight skins, light and dark, every state designed, accessible, reduced motion respected.

## Components

| | |
| --- | --- |
| **Act and chat** | [Command bar](https://ondai.dev/docs/components/command-bar) · [Agent run](https://ondai.dev/docs/components/agent-run) · [Tool confirm card](https://ondai.dev/docs/components/tool-confirm-card) · [Chat](https://ondai.dev/docs/components/chat) · [Assistant message](https://ondai.dev/docs/components/assistant-message) · [Prompt composer](https://ondai.dev/docs/components/prompt-composer) |
| **Search and ask** | [Semantic search](https://ondai.dev/docs/components/semantic-search) · [Ask page](https://ondai.dev/docs/components/ask-page) · [Natural filter](https://ondai.dev/docs/components/natural-filter) |
| **See and hear** | [Voice memo](https://ondai.dev/docs/components/voice-memo) · [Voice input](https://ondai.dev/docs/components/voice-input) · [Scan to data](https://ondai.dev/docs/components/scan-to-data) · [Photo caption](https://ondai.dev/docs/components/photo-caption) |
| **Fill and organize** | [Smart input](https://ondai.dev/docs/components/smart-input) · [Text to event](https://ondai.dev/docs/components/text-to-event) · [Auto tag](https://ondai.dev/docs/components/auto-tag) · [Inline suggest](https://ondai.dev/docs/components/inline-suggest) |
| **Write and rewrite** | [Summarize](https://ondai.dev/docs/components/summarize) · [Rewrite](https://ondai.dev/docs/components/rewrite) · [Translate](https://ondai.dev/docs/components/translate) · [Tone check](https://ondai.dev/docs/components/tone-check) · [Smart reply](https://ondai.dev/docs/components/smart-reply) |

Browse them live, in every variant and state, at **[ondai.dev/docs/components](https://ondai.dev/docs/components)**.

## Quickstart

```bash
npx ondai init                 # pnpm dlx · yarn dlx · bunx work too
npx ondai add command-bar      # the component and everything it needs, in components/ondai/
```

```tsx
import { CommandBar, defineActions, defineAction } from '@/components/ondai/command-bar'

const actions = defineActions([
  defineAction({ id: 'email.send', title: 'Send email', risk: 'high', params: z.object({ to: z.string(), subject: z.string() }), run: (p) => mail.send(p) }),
])

<CommandBar actions={actions} presentation="spotlight" variant="bevel" />
```

`init` writes the provider, the polyfills and `ondai.json`, and installs through `expo install` so native modules match your SDK. The models are native modules, so build a development client (`npx expo prebuild` or EAS). Full guide: **[ondai.dev/docs/installation](https://ondai.dev/docs/installation)**.

## Runs on

| Device | Model |
| --- | --- |
| iPhone 15 Pro and newer, iPad and Mac with Apple silicon (iOS 26, Apple Intelligence on) | Apple Foundation Models |
| Pixel 9 and newer, Galaxy S26, and other Android 14+ phones with AICore | Gemini Nano |
| Anything, if you opt in | A cloud model of your choice |

Measured on Apple silicon: about 360 ms to the first token and 86 tokens per second. Device lists: [device support](https://ondai.dev/docs/device-support).

## What's next

Ondai starts with React Native and Expo. The same components, prompts and router are coming to more of the stack:

- **More platforms:** SwiftUI, Jetpack Compose, and the web with the browser's built-in model.
- **More models:** Llama, Gemma and Qwen through llama.cpp and LiteRT, for phones without a built-in model.
- **More components:** an agent sheet, smart paste, redact private data, explain this, key points, and natural date input.
- **More ways in:** a Figma kit, and an MCP server so your coding assistant can add components for you.

## Built on

[Callstack react-native-ai](https://github.com/callstackincubator/ai) · [Vercel AI SDK](https://ai-sdk.dev) · [Expo](https://expo.dev) · [Reanimated](https://docs.swmansion.com/react-native-reanimated/)

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) (setup, checks, and the checklist for a new component) and the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately: [SECURITY.md](SECURITY.md).

```bash
pnpm install && pnpm dev      # the website and every component preview at http://localhost:3000
```

## License

[MIT](LICENSE)
