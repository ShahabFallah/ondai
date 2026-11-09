import { mockScript } from '@ondai/core/mock'
import { Bookmark, CircleCheck, CirclePlus, ListPlus, Tags } from 'lucide-react-native'
import { boolean, definePlayground, number, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import type { AutoTagIcons, AutoTagLabels } from './auto-tag'
import { AutoTagDemo } from './auto-tag.demo'
import { sampleTagAnswer } from './sample-data'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<AutoTagIcons>> = {
  default: {},
  alternate: { header: Tags, add: CirclePlus, accepted: CircleCheck, tag: Bookmark, addAll: ListPlus, empty: Tags },
  none: { header: null, add: null, accepted: null, tag: null, addAll: null, empty: null },
}

const copy: Record<string, Partial<AutoTagLabels>> = {
  default: {},
  terse: { title: 'Tags', thinking: 'Reading', suggested: 'Ideas', pending: 'new', addAll: 'All', empty: 'No fit.' },
  italiano: { title: 'Tag suggeriti', thinking: 'Cerco i tag', suggested: 'Suggeriti', pending: 'suggeriti', addAll: 'Aggiungi tutti', empty: 'Nessun tag della lista va bene.', add: 'Aggiungi tag', remove: 'Togli tag' },
}

export default definePlayground({
  name: 'auto-tag',
  title: 'AutoTag',
  category: 'organize',
  description: "Tag and category suggestions constrained to the app's own list, fuzzy-matched after the model answers. A card of chips, inline ghosts or a dropdown.",
  component: AutoTagDemo,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['chips', 'inlineGhost', 'dropdown'], 'chips', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    multi: boolean(true, 'Multi-select (Add all)'),
    max: number(3, { min: 1, max: 5, step: 1, label: 'Max suggestions' }),
    showBadge: boolean(true, 'Badge'),
  },
  variantKeys: ['variant', 'presentation', 'size'],
  states: {
    thinking: { script: mockScript.thinking(60_000) },
    done: { script: mockScript.thinking(500).object(sampleTagAnswer), freezeAt: 1500, description: '"Travel", "work stuff", "finances" are matched to travel, work, finance.' },
    accepted: { script: mockScript.thinking(500).object(sampleTagAnswer), freezeAt: 1500, props: { initialSelected: ['travel'] }, description: 'One suggestion accepted, two still suggested.' },
    empty: { script: mockScript.thinking(400).object({ tags: [] }), freezeAt: 1200, description: 'Nothing on the list fits: the empty line (renderEmpty replaces it).' },
    error: { script: mockScript.error('invalid-output') },
    unavailable: { availability: { status: 'unavailable', reason: 'not-enabled' } },
  },
  review: ['thinking', 'done', 'accepted'],
  frame: { width: 400, height: 440, padding: 16, background: 'bg', center: false },
  render: (p) => {
    const { tint, radius, icons, labels, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <AutoTagDemo
        {...(rest as object)}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
      />
    )
  },
})
