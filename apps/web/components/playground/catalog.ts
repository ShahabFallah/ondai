import { manifest, type ManifestEntry } from '@ondai/registry/manifest'

/** Category order shared by the sidebar and the gallery. Categories not listed here are appended. */
export const categoryOrder: ReadonlyArray<readonly [string, string]> = [
  ['agentic', 'Agentic'],
  ['input', 'Input'],
  ['text', 'Text'],
  ['search', 'Search'],
  ['organize', 'Organize'],
  ['vision', 'Vision'],
  ['voice', 'Voice'],
  ['feed', 'Feed'],
  ['primitive', 'Primitives'],
]

/** One short line per component, for cards and page leads. */
export const taglines: Record<string, string> = {
  'agent-avatar': 'A face that thinks back.',
  'auto-tag': 'Tags picked from your own list.',
  'availability-gate': 'Waits until the model is ready.',
  button: 'Six variants, one quiet button.',
  chip: 'Tags, filters and quick replies.',
  'command-bar': 'Say it. The app does it.',
  field: 'Inputs that know their confidence.',
  'image-reveal': 'Pixels settle as progress rises.',
  'ion-border': 'The light that means thinking.',
  'key-hint': 'Mono key caps for shortcuts.',
  'latency-chip': 'Milliseconds and tokens, at a glance.',
  'model-download': 'Progress while the model lands.',
  'natural-filter': 'Plain words become typed filters.',
  'on-device-badge': 'Says where inference runs.',
  rewrite: 'Shorter, kinder, fixed. On device.',
  'scan-to-data': 'A photo becomes structured data.',
  'semantic-search': 'Search by meaning, stay local.',
  sheet: 'Bottom sheet, spotlight or fullscreen.',
  skeleton: 'Loading, with a little shimmer.',
  'smart-input': 'Talk or snap to fill forms.',
  'smart-reply': 'Three replies, one tap away.',
  'streaming-text': 'Token by token, caret included.',
  summarize: 'The long thread, in a line.',
  'thinking-indicator': 'Calm signs of a busy model.',
  'tool-confirm-card': 'Approve before the agent acts.',
  'voice-input': 'Push to talk, transcribed locally.',
}

export const taglineFor = (name: string, description = '') => taglines[name] ?? description.split(/[.:]/)[0] + '.'

export type CatalogItem = Pick<ManifestEntry, 'name' | 'title' | 'category'> & { line: string }
export type CatalogGroup = { id: string; title: string; items: CatalogItem[] }

/** Components with a playground, grouped in category order. */
export function catalogGroups(): CatalogGroup[] {
  const items = manifest.filter((m) => m.hasPlayground)
  const known = categoryOrder.map(([id]) => id)
  const extra = [...new Set(items.map((m) => m.category))].filter((c) => !known.includes(c)).map((c) => [c, c.charAt(0).toUpperCase() + c.slice(1)] as const)
  return [...categoryOrder, ...extra]
    .map(([id, title]) => ({
      id,
      title,
      items: items.filter((m) => m.category === id).map((m) => ({ name: m.name, title: m.title, category: m.category, line: taglineFor(m.name, m.description) })),
    }))
    .filter((g) => g.items.length)
}
