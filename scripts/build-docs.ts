/** Generates content/docs/components/<name>.mdx and registry/components/<name>/README.md from meta.json + usage snippets. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(readFileSync(join(root, 'registry', 'registry.json'), 'utf8')) as { items: Array<{ name: string; title: string; description: string; dependencies: string[]; registryDependencies: string[]; categories: string[]; docs?: string; meta: { ondai: { capabilities: string[]; variants: Record<string, string[]>; budget?: { input: number; strategy: string }; runsOn?: string[] } } }> }
const docsDir = join(root, 'apps', 'web', 'content', 'docs', 'components')
mkdirSync(docsDir, { recursive: true })

const usage: Record<string, { imports: string; code: string; previewState?: string; previewQuery?: string; height?: number; notes?: string[] }> = {
  'command-bar': {
    imports: `import { CommandBar, defineActions, defineAction } from '@/components/ondai/command-bar'\nimport { z } from 'zod'`,
    code: `const actions = defineActions([
  defineAction({
    id: 'task.create', title: 'Create task', keywords: ['todo', 'remind'],
    params: z.object({ title: z.string(), due: z.string().optional() }),
    preview: (p) => \`Create task · \${p.title}\`,
    run: (p) => tasks.add(p),
  }),
  defineAction({ id: 'email.send', title: 'Send email', risk: 'high', params: z.object({ to: z.string(), subject: z.string() }), run: sendEmail }),
])

<CommandBar actions={actions} presentation="spotlight" variant="glass" open={open} onOpenChange={setOpen} />`,
    previewState: 'tool',
    height: 520,
    notes: ['Ladder: on-device tool calling → structured enum choice → keyword search. Something always answers.', 'Actions with `risk: "high"` pause in a ToolConfirmCard before running.', 'Use `routesToActions(routes, router.push)` to expose expo-router screens.'],
  },
  'smart-input': {
    imports: `import { SmartInput } from '@/components/ondai/smart-input'\nimport { z } from 'zod'`,
    code: `const expense = z.object({
  merchant: z.string(),
  amount: z.number(),
  category: z.enum(['food', 'transport', 'home', 'other']),
  date: z.string().describe('date').optional(),
})

<SmartInput schema={expense} presentation="field" onFill={(values) => form.reset(values)} aliases={{ category: { food: ['lunch', 'dinner'] } }} />`,
    previewState: 'filled',
    previewQuery: 'presentation=overlay',
    height: 560,
    notes: ['Enums are fuzzy-matched, numbers and money parsed, dates resolved from phrases ("yesterday") in code after the model answers.', 'Per-field confidence drives highlight / badge / underline styles and confirm/undo.', 'For react-hook-form: `form.apply((name, value) => setValue(name, value))`.'],
  },
  'scan-to-data': {
    imports: `import { ScanToData } from '@/components/ondai/scan-to-data'\nimport TextRecognition from '@react-native-ml-kit/text-recognition'`,
    code: `<ScanToData
  preset="receipt"
  ocr={async (img) => (await TextRecognition.recognize(img.uri)).text}
  onData={(receipt) => expenses.add(receipt)}
/>`,
    previewState: 'done',
    height: 620,
    notes: ['OCR runs on device through the `ocr` function you pass (ML Kit, Apple Vision). The model only sees text, which also keeps the request inside the 4K budget.', 'Presets: `receipt`, `businessCard`, `event`; or `preset="custom"` with your own zod schema.'],
  },
  chat: {
    imports: `import { Chat } from '@/components/ondai/chat'`,
    code: `<Chat system="You are a helpful assistant inside a notes app. Be brief." suggestions={['Plan a slow Saturday in Lyon', 'What did I note about the budget?']} />`,
    previewState: 'done',
    height: 560,
    notes: ['Built on `useChat()` from `@ondai/core`: history is trimmed to the model context, oldest turns first.', 'Compose your own screen from PromptComposer and AssistantMessage when you need a different layout.'],
  },
  'prompt-composer': {
    imports: `import { PromptComposer } from '@/components/ondai/prompt-composer'`,
    code: `<PromptComposer onSubmit={chat.send} busy={chat.isBusy} onStop={chat.stop} onAttach={pickPhoto} attachments={files} onRemoveAttachment={removeFile} />`,
    previewState: 'attachments',
    height: 260,
    notes: ['Enter sends on web and hardware keyboards; Shift+Enter adds a line.', 'While `busy`, the raised send key becomes a stop key.'],
  },
  'assistant-message': {
    imports: `import { AssistantMessage, UserMessage } from '@/components/ondai/assistant-message'`,
    code: `<UserMessage text={question} />
<AssistantMessage text={reply.text} status={reply.status} thoughtMs={reply.thoughtMs} steps={steps} sources={sources} onRetry={retry} />`,
    previewState: 'done',
    height: 380,
    notes: ['The trace reads "Thought for 1.2s" from the time to the first word; tool steps fold under it.'],
  },
  'agent-run': {
    imports: `import { AgentRun } from '@/components/ondai/agent-run'\nimport { tool } from '@ondai/core'\nimport { z } from 'zod'`,
    code: `<AgentRun
  goal="Find a quiet dinner spot near Priya’s office on Friday and invite her"
  tools={{ searchPlaces, checkCalendar, createEvent }}
  meta={{ createEvent: { title: 'Create the event and invite Priya', policy: 'ask', risk: 'medium' } }}
/>`,
    previewState: 'running',
    height: 420,
    notes: ['Tools with `policy: \'ask\'` stop at an approval card before they run.', 'Built on `useToolAgent()`; Apple and Gemini Nano run the tool loop on device.'],
  },
  'inline-suggest': {
    imports: `import { InlineSuggest } from '@/components/ondai/inline-suggest'`,
    code: `<InlineSuggest context="A message to Priya about Friday’s dinner" value={text} onChangeText={setText} />`,
    previewState: 'suggesting',
    height: 220,
    notes: ['The model runs only after a pause in typing, and a guess for older text is never shown.'],
  },
  'voice-memo': {
    imports: `import { VoiceMemo } from '@/components/ondai/voice-memo'`,
    code: `<VoiceMemo onAdd={(todos) => reminders.add(todos)} addLabel="Add to Reminders" />`,
    previewState: 'done',
    height: 480,
    notes: ['Recording, transcription and reading all run on the device; the schema is exported as `memoSchema`.'],
  },
  'border-beam': {
    imports: `import { BorderBeam } from '@/components/ondai/border-beam'`,
    code: `<BorderBeam active={isThinking} radius="lg">
  <Card />
</BorderBeam>`,
    previewState: 'working',
    height: 220,
    notes: ['libraries.dev’s border beam (MIT, Jakub Antalik): a Skia shader on iOS and Android, its CSS version on web.', 'Needs `@shopify/react-native-skia` (included in Expo Go).'],
  },
  'liquid-metal': {
    imports: `import { LiquidMetal } from '@/components/ondai/liquid-metal'`,
    code: `<LiquidMetal active={isListening} shape="circle">
  <MicButton />
</LiquidMetal>`,
    previewState: 'working',
    height: 200,
    notes: ['libraries.dev’s metal-fx (MIT); the material is Paper Shaders’ liquidMetal (Apache-2.0, NOTICE included).', 'Needs `@shopify/react-native-skia` (included in Expo Go).'],
  },
  'bot-avatar': {
    imports: `import { BotAvatar } from '@/components/ondai/bot-avatar'`,
    code: `<BotAvatar state={isWorking ? 'working' : 'default'} size={64} />`,
    previewState: 'family',
    height: 260,
    notes: ['libraries.dev’s bot avatars (MIT): 18 bodies plus Ondai’s chrome chip.', 'Needs `@shopify/react-native-skia` (included in Expo Go).'],
  },
  surface: {
    imports: `import { Surface } from '@/components/ondai/surface'`,
    code: `<Surface elevation="card" style={{ padding: 16 }}>
  <Text>Follows the theme: solid, glass, or Liquid Glass on iOS 26</Text>
</Surface>`,
    height: 200,
  },
  summarize: {
    imports: `import { Summarize } from '@/components/ondai/summarize'`,
    code: `<Summarize text={thread.text} presentation="card" length="bullets" emphasis="plain" />`,
    previewState: 'done',
    height: 360,
    notes: ['Short input streams in one pass; long input is chunked, summarized per chunk and reduced (progress shown).', '`useSummarize()` exposes the same logic headlessly.'],
  },
  rewrite: {
    imports: `import { Rewrite } from '@/components/ondai/rewrite'`,
    code: `<Rewrite value={draft} onAccept={setDraft} presentation="toolbar" resultView="diff" />`,
    previewState: 'done',
    previewQuery: 'resultView=diff',
    height: 460,
    notes: ['Modes: shorten, expand, friendlier, formal, fix grammar, or `custom` with your own instruction.', 'Result views: replace, word-level diff, or side by side.'],
  },
  'smart-reply': {
    imports: `import { SmartReply } from '@/components/ondai/smart-reply'`,
    code: `<SmartReply thread={messages} presentation="chips" onSelect={(text) => composer.setText(text)} />`,
    previewState: 'done',
    height: 400,
    notes: ['Only the last six messages are sent, trimmed from the start.', 'The `ghost` presentation shows the first suggestion as faded text inside the input; Tab or the arrow accepts it.'],
  },
  'auto-tag': {
    imports: `import { AutoTag } from '@/components/ondai/auto-tag'`,
    code: `<AutoTag text={note.body} tags={allTags} selected={note.tags} onChange={setTags} presentation="chips" max={3} />`,
    previewState: 'done',
    height: 360,
    notes: ['The model can only pick from your list; results are fuzzy-matched back to it, so "Travel" becomes `travel`.'],
  },
  'semantic-search': {
    imports: `import { SemanticSearch } from '@/components/ondai/semantic-search'\nimport { sqliteStorage } from '@ondai/core/expo'\nimport { openDatabaseAsync } from 'expo-sqlite'`,
    code: `<SemanticSearch
  items={notes.map((n) => ({ id: n.id, text: n.body, metadata: n }))}
  storage={sqliteStorage({ open: openDatabaseAsync })}
  presentation="bar" resultStyle="list"
  onSelect={(hit) => router.push(\`/notes/\${hit.id}\`)}
/>`,
    previewState: 'results',
    height: 420,
    notes: ['Embeddings come from Apple NLContextualEmbedding (512 dims, iOS 17+) or a llama embedding model; without them, keyword search still works.', 'Hybrid scoring blends cosine similarity and keyword overlap; "why it matched" shows the terms.'],
  },
  'natural-filter': {
    imports: `import { NaturalFilter } from '@/components/ondai/natural-filter'\nimport { z } from 'zod'`,
    code: `const filters = z.object({ cuisine: z.enum(['italian', 'japanese']).optional(), price: z.enum(['$', '$$', '$$$']).optional(), openNow: z.boolean().optional() })

<NaturalFilter schema={filters} presentation="bar" onChange={(f) => setFilter(f)}>
  <RestaurantList filter={filter} />
</NaturalFilter>`,
    previewState: 'done',
    height: 520,
    notes: ['Chips are editable (tap an enum chip to cycle values) and removable.'],
  },
  'tool-confirm-card': {
    imports: `import { ToolConfirmCard } from '@/components/ondai/tool-confirm-card'`,
    code: `const agent = useToolAgent({ tools, meta: { sendEmail: { policy: 'ask', risk: 'high' } } })

<ToolConfirmCard pending={agent.pendingConfirmation} presentation="card" />`,
    previewState: 'confirm',
    height: 360,
    notes: ['Works with provider-executed tool loops (Apple, Nano) because approval happens inside the tool\'s execute.'],
  },
  'availability-gate': { imports: `import { AvailabilityGate } from '@/components/ondai/availability-gate'`, code: `<AvailabilityGate capability="text" variant="card">\n  <YourAiFeature />\n</AvailabilityGate>`, previewState: 'not-eligible', height: 300 },
  'on-device-badge': { imports: `import { OnDeviceBadge } from '@/components/ondai/on-device-badge'`, code: `<OnDeviceBadge size="sm" state={status} />`, previewState: 'thinking', height: 160 },
  'ion-border': { imports: `import { IonBorder } from '@/components/ondai/ion-border'`, code: `<IonBorder active={isThinking} variant="beam" radius="lg" glow>\n  <YourCard />\n</IonBorder>`, previewState: 'beam', height: 240, notes: ['`variant`: `sweep` (the slow gradient light), `beam` (a bright comet with a tail and an outer halo), `pulse` (the whole ring breathes).'] },
  'streaming-text': { imports: `import { StreamingText } from '@/components/ondai/streaming-text'`, code: `<StreamingText text={text} streaming={isStreaming} />`, previewState: 'streaming', height: 220 },
  'thinking-indicator': { imports: `import { ThinkingIndicator } from '@/components/ondai/thinking-indicator'`, code: `<ThinkingIndicator variant="orb" size="lg" state="thinking" label="Thinking" />`, previewState: 'thinking', previewQuery: 'variant=orb&size=lg', height: 180, notes: ['The `orb` is a metallic sphere with a drifting highlight; `state` (`thinking`, `listening`, `speaking`) changes its rhythm.'] },
  skeleton: { imports: `import { Skeleton } from '@/components/ondai/skeleton'`, code: `<Skeleton lines={3} />`, previewState: 'loading', height: 200 },
  'key-hint': { imports: `import { KeyHint } from '@/components/ondai/key-hint'`, code: `<KeyHint keys={['cmd', 'K']} />`, previewState: 'default', height: 140 },
  'latency-chip': { imports: `import { LatencyChip } from '@/components/ondai/latency-chip'`, code: `<LatencyChip latencyMs={metrics.latencyMs} tokensPerSecond={metrics.tokensPerSecond} provider="apple" />`, previewState: 'default', height: 140 },
  'model-download': { imports: `import { ModelDownload } from '@/components/ondai/model-download'`, code: `<ModelDownload progress={0.42} variant="bar" label="Preparing model" detail="1.2 GB · Wi-Fi only" />`, previewState: 'preparing', height: 200 },
  chip: { imports: `import { Chip } from '@/components/ondai/chip'`, code: `<Chip label="Groceries" selected onPress={toggle} />`, previewState: 'idle', height: 160 },
  button: { imports: `import { Button } from '@/components/ondai/button'`, code: `<Button title="Summarize" variant="solid" onPress={run} />`, previewState: 'idle', height: 160 },
  sheet: { imports: `import { Sheet } from '@/components/ondai/sheet'`, code: `<Sheet open={open} onClose={close} presentation="sheet" variant="glass">…</Sheet>`, previewState: 'open', height: 560 },
  'voice-input': {
    imports: `import { VoiceInput, type Recorder } from '@/components/ondai/voice-input'`,
    code: `// Audio capture is yours to provide (expo-audio, react-native-audio-record, your own module).
const recorder: Recorder = {
  start: () => audio.start(),
  stop: () => audio.stop(), // resolves WAV/PCM bytes
  onLevel: (cb) => audio.subscribeLevel(cb),
}

<VoiceInput recorder={recorder} presentation="pill" visual="bars" onTranscript={(text) => setQuery(text)} />`,
    previewState: 'listening',
    height: 320,
    notes: ['Transcription runs on device through `useTranscribe` (Apple SpeechAnalyzer on iOS 26). Without a `recorder` a simulated one runs, so the mock and the playground work out of the box.', '`mode="hold"` is push-to-talk; `mode="tap"` toggles. `visual` is `bars` (a rippling waveform) or `glow` (a bloom rising from the bottom edge).'],
  },
  'agent-avatar': {
    imports: `import { AgentAvatar } from '@/components/ondai/agent-avatar'`,
    code: `<AgentAvatar size={64} shape="blob" state={isThinking ? 'thinking' : 'idle'} interactive />`,
    previewState: 'idle',
    height: 260,
    notes: ['States: `idle` (glances around and blinks), `thinking` (looks up with an orbiting light), `speaking` (mouth moves), `sleeping` (eyes closed, slow breathing).', 'On web, `interactive` makes the eyes follow the pointer.'],
  },
  'image-reveal': {
    imports: `import { ImageReveal } from '@/components/ondai/image-reveal'`,
    code: `<ImageReveal source={{ uri }} width={320} height={220} mode="ascii" progress={busy ? 'auto' : 1} />`,
    previewState: 'revealing',
    height: 320,
    notes: ['`progress` is 0–1 from your own pipeline, or `"auto"` to loop while you wait. `mode="ascii"` suits scans and documents; `mosaic` suits pictures.', 'ScanToData uses it while OCR and extraction run.'],
  },
  field: { imports: `import { Field } from '@/components/ondai/field'`, code: `<Field label="Merchant" value={v} onChangeText={setV} state={status} confidence={0.9} />`, previewState: 'filled', height: 200 },
}

/** The shared look and customization props of an AI component, read from its source. */
function customizeSection(name: string, title: string): string[] {
  const file = join(root, 'registry', 'components', name, `${name}.tsx`)
  if (!existsSync(file)) return []
  const src = readFileSync(file, 'utf8')
  if (!/\bvariant\?: SkinInput\b/.test(src)) return []
  const lab = src.match(/export const (\w+Labels)\b[^=]*= \{([\s\S]*?)\n\}/)
  const ico = src.match(/export interface (\w+Icons) \{([\s\S]*?)\n\}/)
  const keys = (body: string) => [...body.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]!)
  const labelKeys = lab ? keys(lab[2]!) : []
  const iconKeys = ico ? keys(ico[2]!) : []
  const labelLine = labelKeys.length ? `  labels={{ ${labelKeys[0]}: '…'${labelKeys[1] ? `, ${labelKeys[1]}: '…'` : ''} }}` : ''
  const iconLine = iconKeys.length ? `  icons={{ ${iconKeys[0]}: Search${iconKeys[1] ? `, ${iconKeys[1]}: null` : ''} }}` : ''
  const out = [
    '## Customize',
    '',
    'Every AI component takes the same look and customization props, so it fits your app rather than ours.',
    '',
    '```tsx',
    `<${title}`,
    '  variant="pop"',
    '  tint="#FF5A5F"',
    '  size="lg"',
    '  radius={12}',
    ...(iconLine ? [iconLine] : []),
    ...(labelLine ? [labelLine] : []),
    '/>',
    '```',
    '',
    '| Prop | What it does |',
    '| --- | --- |',
    '| `variant` | The look of the whole component: `clean`, `minimal`, `glass`, `pop`, `candy`, `metal`, `shine`, `bevel` |',
    '| `size` | `sm`, `md`, `lg`; type, rows, icons and keys scale together |',
    '| `tint` | Any colour; the variant paints its keys, tiles and glow in it |',
    '| `radius` | Corner radius of the container |',
  ]
  if (iconKeys.length) out.push(`| \`icons\` | Replace any icon (a lucide component, an element, or \`null\` to hide it): ${iconKeys.map((k) => `\`${k}\``).join(', ')} |`)
  if (labelKeys.length) out.push(`| \`labels\` | Every visible and spoken string; defaults are exported as \`${lab![1]}\`: ${labelKeys.map((k) => `\`${k}\``).join(', ')} |`)
  const slots = [...new Set([...src.matchAll(/^\s+(render[A-Z]\w*)\?:/gm)].map((m) => m[1]!))]
  if (slots.length) out.push(`| Slots | Draw a part yourself: ${slots.map((k) => `\`${k}\``).join(', ')} |`)
  if (/\bstyles\?: Partial</.test(src)) out.push('| `styles` | Style any named part |')
  out.push('')
  return out
}

for (const item of manifest.items) {
  const u = usage[item.name]
  const o = item.meta.ondai
  const variants = Object.entries(o.variants)
  const lines: string[] = []
  lines.push('---', `title: ${JSON.stringify(item.title)}`, `description: ${JSON.stringify(item.description)}`, '---', '')
  if (u) lines.push(`<ComponentPreview name="${item.name}" state="${u.previewState ?? ''}" height={${u.height ?? 400}}${u.previewQuery ? ` query="${u.previewQuery}"` : ''} />`, '')
  lines.push('## Install', '', '```bash', `npx ondai add ${item.name}`, '```', '')
  if (u) lines.push('## Usage', '', '```tsx', u.imports, '', u.code, '```', '')
  if (u?.notes?.length) lines.push(...u.notes.map((n) => `- ${n}`), '')
  lines.push(...customizeSection(item.name, item.title))
  if (variants.length) {
    lines.push('## Variants', '', '| Prop | Options |', '| --- | --- |')
    for (const [k, v] of variants) lines.push(`| \`${k}\` | ${v.map((x) => `\`${x}\``).join(', ')} |`)
    lines.push('')
  }
  if (o.budget) lines.push('## Token budget', '', `Input budget: **${o.budget.input} tokens**. ${o.budget.strategy}`, '')
  lines.push('## Fallback', '', o.capabilities.length ? 'When no provider is ready the component renders the unavailable state (`AvailabilityGate` copy) and, where a deterministic path exists, keeps working without the model.' : 'Pure UI: no model required.', '')
  if (existsSync(join(root, 'evals', item.name, 'fixtures.json'))) lines.push('## Eval score', '', `Fixtures: \`evals/${item.name}/fixtures.json\`.`, '')
  lines.push('## Files', '', ...item.registryDependencies.length ? [`Registry dependencies: ${item.registryDependencies.map((d) => `[${d}](/docs/components/${d})`).join(', ')}`, ''] : [], `npm dependencies: ${item.dependencies.map((d) => `\`${d}\``).join(', ') || 'none'}`, '')
  writeFileSync(join(docsDir, `${item.name}.mdx`), lines.join('\n'))
  const readme = ['# ' + item.title, '', item.description, '', '```bash', `npx ondai add ${item.name}`, '```', '', ...(u ? ['```tsx', u.imports, '', u.code, '```', ''] : []), `Docs: https://ondai.dev/docs/components/${item.name}`, '']
  writeFileSync(join(root, 'registry', 'components', item.name, 'README.md'), readme.join('\n'))
}
console.log(`docs: ${manifest.items.length} component pages`)
