import { mockScript } from '@ondai/core/mock'
import { CircleX, CornerDownLeft, Funnel, ListFilter, Pizza, TextSearch } from 'lucide-react-native'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import type { NaturalFilterIcons, NaturalFilterLabels } from './natural-filter'
import { NaturalFilterDemo } from './natural-filter.demo'
import { sampleFilterAnswer, sampleQuery } from './sample-data'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<NaturalFilterIcons>> = {
  default: {},
  alternate: { search: TextSearch, clear: CircleX, edit: ListFilter, submit: CornerDownLeft, row: Pizza, empty: Funnel },
  none: { search: null, row: null, empty: null, submit: null },
}

const copy: Record<string, Partial<NaturalFilterLabels>> = {
  default: {},
  terse: { placeholder: 'Describe it', thinking: 'Reading', clearFilters: 'Reset', emptyTitle: 'Nothing', emptyHint: 'Loosen a filter.', result: 'place', results: 'places', sheetTitle: 'Refine', done: 'OK' },
  italiano: {
    placeholder: 'Cerca a parole tue…',
    thinking: 'Trasformo la richiesta in filtri',
    submit: 'Filtra',
    clear: 'Cancella',
    clearFilters: 'Azzera',
    editFilters: 'Modifica filtri',
    sheetTitle: 'Filtri',
    done: 'Fatto',
    any: 'Qualsiasi',
    yes: 'Sì',
    no: 'No',
    not: 'Non',
    tapToChange: 'tocca per cambiare',
    remove: 'Rimuovi',
    emptyTitle: 'Nessun risultato',
    emptyHint: 'Prova a togliere un filtro.',
    result: 'risultato',
    results: 'risultati',
    inputLabel: 'Cerca',
  },
}

const thaiAnswer = { cuisine: 'thai', openNow: true }

export default definePlayground({
  name: 'natural-filter',
  title: 'NaturalFilter',
  category: 'search',
  description: '"cheap Italian open now" becomes a typed filter object with editable chips. Bar, sheet, or chips only.',
  component: NaturalFilterDemo,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['bar', 'sheet', 'inline'], 'bar', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    chipStyle: select(['soft', 'outline'], 'outline', 'Chip style (clean)'),
    showBadge: boolean(true, 'Badge'),
    placeholder: text('Search in your own words…', 'Placeholder'),
  },
  variantKeys: ['variant', 'presentation', 'size'],
  states: {
    idle: {},
    thinking: { script: mockScript.thinking(60_000), props: { initialQuery: sampleQuery, autoRun: true } },
    done: { script: mockScript.thinking(600).object(sampleFilterAnswer), props: { initialQuery: sampleQuery, autoRun: true }, freezeAt: 1500, description: '"cheap" → $, "2km" → 2, "Italian" → italian.' },
    empty: { script: mockScript.thinking(400).object(thaiAnswer), props: { initialQuery: 'thai, open now', autoRun: true }, freezeAt: 1200, description: 'The filters leave nothing: the empty state (renderEmpty replaces it).' },
    error: { script: mockScript.error('unknown'), props: { initialQuery: sampleQuery, autoRun: true } },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { initialQuery: sampleQuery } },
  },
  review: ['idle', 'done'],
  frame: { width: 400, height: 520, padding: 16, background: 'bg', center: false },
  render: (p) => {
    const { tint, radius, icons, labels, placeholder, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <NaturalFilterDemo
        {...(rest as object)}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        placeholder={labels === 'default' || placeholder !== 'Search in your own words…' ? (placeholder as string) : undefined}
      />
    )
  },
})
