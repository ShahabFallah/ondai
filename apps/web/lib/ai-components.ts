import { manifest, type ManifestEntry } from '@ondai/registry/manifest'

/**
 * The site shows AI components only. Core UI (primitives and effects) stays in the registry and keeps its
 * docs pages, but no list, menu or count on the site points at it.
 */

const CORE_CATEGORIES = new Set(['primitive', 'fx'])

export const isAiComponent = (m: Pick<ManifestEntry, 'category'>) => !CORE_CATEGORIES.has(m.category)

/** Every AI component with a playground, in registry order. */
export const aiComponents = manifest.filter((m) => m.hasPlayground && isAiComponent(m))

/** The variant every AI component is shown in by default on the site. */
export const DEFAULT_VARIANT = 'bevel'

/** `ScanToData` -> `Scan to data`: the code name, spaced, for people. */
export function displayTitle(title: string) {
  const words = title.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ')
  return words.map((w, i) => (i === 0 ? w : w.toLowerCase())).join(' ')
}

/**
 * The AI components grouped by what they do, for the Components menu and the components page. Each group
 * names a lead component, whose loop the menu plays.
 */
export const GROUPS = [
  { id: 'write', title: 'Write and rewrite', categories: ['text'], lead: 'rewrite' },
  { id: 'fill', title: 'Fill and organize', categories: ['input', 'organize'], lead: 'smart-input' },
  { id: 'search', title: 'Search and ask', categories: ['search'], lead: 'ask-page' },
  { id: 'see', title: 'See and hear', categories: ['vision', 'voice'], lead: 'scan-to-data' },
  { id: 'act', title: 'Act and chat', categories: ['agentic', 'chat'], lead: 'command-bar' },
] as const

export type GroupId = (typeof GROUPS)[number]['id']

/** The group a component belongs to (by its registry category). */
export function groupOf(category: string): GroupId {
  return (GROUPS.find((g) => (g.categories as readonly string[]).includes(category)) ?? GROUPS[GROUPS.length - 1]!).id
}

/** "Summarize, Rewrite, Translate and 2 more": a group's members in a line. */
export function membersLine(titles: string[], max = 3) {
  if (titles.length <= max + 1) return titles.length > 1 ? `${titles.slice(0, -1).join(', ')} and ${titles.at(-1)}` : (titles[0] ?? '')
  return `${titles.slice(0, max).join(', ')} and ${titles.length - max} more`
}
