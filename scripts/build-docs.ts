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
  summarize: {
    imports: `import { Summarize } from '@/components/ondai/summarize'`,
    code: `<Summarize text={thread.text} presentation="card" length="bullets" style="plain" />`,
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

for (const item of manifest.items) {
  const u = usage[item.name]
  const o = item.meta.ondai
  const variants = Object.entries(o.variants)
  const runsOn = o.runsOn ?? ['apple', 'nano', 'llama', 'cloud']
  const lines: string[] = []
  lines.push('---', `title: ${JSON.stringify(item.title)}`, `description: ${JSON.stringify(item.description)}`, '---', '')
  if (u) lines.push(`<ComponentPreview name="${item.name}" state="${u.previewState ?? ''}" height={${u.height ?? 400}}${u.previewQuery ? ` query="${u.previewQuery}"` : ''} />`, '')
  lines.push('## Install', '', '```bash', `npx ondai add ${item.name}`, '```', '')
  if (u) lines.push('## Usage', '', '```tsx', u.imports, '', u.code, '```', '')
  if (u?.notes?.length) lines.push(...u.notes.map((n) => `- ${n}`), '')
  if (variants.length) {
    lines.push('## Variants', '', '| Prop | Options |', '| --- | --- |')
    for (const [k, v] of variants) lines.push(`| \`${k}\` | ${v.map((x) => `\`${x}\``).join(', ')} |`)
    lines.push('', 'Every variant is live in the [playground](/playground/' + item.name + ').', '')
  }
  lines.push('## Runs on', '', '| Capability | Apple FM | Gemini Nano | Llama | Cloud |', '| --- | --- | --- | --- | --- |')
  const cap = o.capabilities.length ? o.capabilities.join(', ') : 'none (pure UI)'
  lines.push(`| ${cap} | ${runsOn.includes('apple') ? '✅' : '—'} | ${runsOn.includes('nano') ? '✅' : '—'} | ${runsOn.includes('llama') ? '✅' : '—'} | ${runsOn.includes('cloud') ? '✅' : '—'} |`, '')
  if (o.budget) lines.push('## Token budget', '', `Input budget: **${o.budget.input} tokens**. ${o.budget.strategy}`, '')
  lines.push('## Fallback', '', o.capabilities.length ? 'When no provider is ready the component renders the unavailable state (`AvailabilityGate` copy) and, where a deterministic path exists, keeps working without the model.' : 'Pure UI: no model required.', '')
  lines.push('## Eval score', '', existsSync(join(root, 'evals', item.name, 'fixtures.json')) ? `Fixtures: \`evals/${item.name}/fixtures.json\`.` : '', '')
  lines.push('## Files', '', ...item.registryDependencies.length ? [`Registry dependencies: ${item.registryDependencies.map((d) => `[${d}](/docs/components/${d})`).join(', ')}`, ''] : [], `npm dependencies: ${item.dependencies.map((d) => `\`${d}\``).join(', ') || 'none'}`, '')
  writeFileSync(join(docsDir, `${item.name}.mdx`), lines.join('\n'))
  const readme = ['# ' + item.title, '', item.description, '', '```bash', `npx ondai add ${item.name}`, '```', '', ...(u ? ['```tsx', u.imports, '', u.code, '```', ''] : []), `Docs: https://ondai.dev/docs/components/${item.name}`, '']
  writeFileSync(join(root, 'registry', 'components', item.name, 'README.md'), readme.join('\n'))
}
console.log(`docs: ${manifest.items.length} component pages`)
