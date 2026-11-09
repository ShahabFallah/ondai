import { Briefcase, CircleX, Clock, CookingPot, FileQuestion, HeartPulse, House, Plane, StickyNote, TextSearch, User } from 'lucide-react-native'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { useSkin, useTheme } from '@ondai/tokens/react'
import { skinHasWells } from '../surface/surface'
import type { SemanticSearchIcons, SemanticSearchLabels } from './semantic-search'
import { SemanticSearchDemo } from './semantic-search.demo'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<SemanticSearchIcons>> = {
  default: {},
  alternate: { search: TextSearch, clear: CircleX, result: StickyNote, recent: Clock, empty: FileQuestion },
  'by kind': {},
  none: { search: null, clear: null, result: null, recent: null, empty: null },
}

const kindIcons = { travel: Plane, work: Briefcase, health: HeartPulse, home: House, recipes: CookingPot, personal: User } as const

/** One icon per note kind, through the `renderIcon` slot. */
function KindIcon({ kind }: { kind?: string }) {
  const t = useTheme()
  const s = useSkin()
  const Icon = kindIcons[kind as keyof typeof kindIcons] ?? StickyNote
  return <Icon size={16} strokeWidth={1.75} color={skinHasWells(s.skin) ? s.tile.ink : t.colors.textSecondary} />
}

const copy: Record<string, Partial<SemanticSearchLabels>> = {
  default: {},
  terse: { placeholder: 'Search notes', title: 'Notes', recent: 'Lately', searching: 'Looking', emptyTitle: 'No notes', emptyHint: 'Try other words.', matches: 'Has', byMeaning: 'Meaning', keywordsOnly: 'Keywords' },
  italiano: {
    placeholder: 'Cerca per significato…',
    title: 'Cerca',
    recent: 'Recenti',
    searching: 'Cerco per significato',
    indexing: 'Indicizzo sul dispositivo',
    of: 'di',
    items: 'elementi',
    emptyTitle: 'Niente di simile',
    emptyHint: 'Prova altre parole, o meno parole.',
    matches: 'Contiene',
    similar: 'simile',
    result: 'risultato',
    results: 'risultati',
    byMeaning: 'Per significato',
    keywordsOnly: 'Solo parole chiave',
    other: 'Altro',
    clear: 'Cancella',
    inputLabel: 'Cerca',
  },
}

export default definePlayground({
  name: 'semantic-search',
  title: 'SemanticSearch',
  category: 'search',
  description: 'Search by meaning over your own records: a local vector index plus keyword matching, with "why it matched".',
  component: SemanticSearchDemo,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['bar', 'spotlight', 'header'], 'bar', 'Presentation'),
    resultStyle: select(['list', 'cards', 'grouped'], 'list', 'Results'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    showWhy: boolean(true, 'Why it matched'),
    highlight: boolean(true, 'Highlight matches'),
    recent: boolean(true, 'Recent searches'),
    showBadge: boolean(true, 'Badge'),
    placeholder: text('Search by meaning…', 'Placeholder'),
  },
  variantKeys: ['variant', 'presentation', 'resultStyle', 'size'],
  states: {
    idle: { description: 'Empty field: recent searches, one tap to run again.' },
    results: { props: { initialQuery: 'flight train or cabin', autoRun: true }, freezeAt: 800 },
    'keywords-only': { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { initialQuery: 'lasagna', autoRun: true }, description: 'No embeddings on this device: keyword search still works.' },
    empty: { props: { initialQuery: 'quantum chromodynamics', autoRun: true }, freezeAt: 800, description: 'Nothing close: the empty state (renderEmpty replaces it).' },
  },
  review: ['idle', 'results'],
  frame: { width: 400, height: 600, padding: 16, background: 'bg', center: false },
  render: (p) => {
    const { tint, radius, icons, labels, placeholder, recent, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <SemanticSearchDemo
        {...(rest as object)}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        renderIcon={icons === 'by kind' ? (h) => <KindIcon kind={h.metadata?.kind} /> : undefined}
        labels={copy[labels as string]}
        // The placeholder control only speaks for itself while the copy set leaves it alone.
        placeholder={labels === 'default' || placeholder !== 'Search by meaning…' ? (placeholder as string) : undefined}
        recent={recent ? ['flights in november', 'what did Jordan move', 'gift ideas for Sam'] : undefined}
      />
    )
  },
})
