import { View } from 'react-native'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { Chip } from './chip'

const reply = 'Friday works for me, but could we push it to half past seven so I can get there from work?'

export default definePlayground({
  name: 'chip',
  title: 'Chip',
  category: 'primitive',
  description: 'Compact selectable pill for tags, filters, suggestions and replies. Skins turn it into a small key, a glossy sweet, a steel plate or a lit pill.',
  component: Chip,
  controls: {
    skin: select(skinNames, 'clean', 'Skin'),
    variant: select(['soft', 'outline', 'solid', 'ghost'], 'soft', 'Variant'),
    size: select(['sm', 'md'], 'md', 'Size'),
    label: text('Groceries', 'Label'),
    meta: text('', 'Meta'),
    removable: boolean(false, 'Removable'),
    primary: boolean(false, 'Primary paint'),
  },
  variantKeys: ['skin', 'variant', 'size'],
  states: {
    idle: {},
    selected: { props: { selected: true } },
    ghost: { props: { ghost: true } },
    wrapping: { description: 'Multiline: a long reply wraps, the first one in the primary paint.' },
  },
  review: ['idle', 'selected', 'wrapping'],
  frame: { width: 320, padding: 24, background: 'bg' },
  render: (p, { state }) =>
    state === 'wrapping' ? (
      <View style={{ gap: 8, alignItems: 'flex-start' }}>
        <Chip skin={p.skin} size={p.size} label={reply} multiline primary onPress={() => {}} />
        <Chip skin={p.skin} size={p.size} label="Sounds good" multiline onPress={() => {}} />
        <Chip skin={p.skin} size={p.size} label="Can we talk tomorrow instead? Today got away from me." multiline onPress={() => {}} />
      </View>
    ) : (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip skin={p.skin} variant={p.variant} size={p.size} label={p.label} meta={p.meta || undefined} selected={p.selected as boolean} primary={p.primary} ghost={p.ghost as boolean} onPress={() => {}} onRemove={p.removable ? () => {} : undefined} />
        <Chip skin={p.skin} variant={p.variant} size={p.size} label="Transport" onPress={() => {}} onRemove={p.removable ? () => {} : undefined} />
        <Chip skin={p.skin} variant={p.variant} size={p.size} label="Dining" meta="12" selected onPress={() => {}} />
      </View>
    ),
})
