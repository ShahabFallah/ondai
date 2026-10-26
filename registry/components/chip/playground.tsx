import { View } from 'react-native'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { Chip } from './chip'

export default definePlayground({
  name: 'chip',
  title: 'Chip',
  category: 'primitive',
  description: 'Compact selectable pill for tags, filters, suggestions and replies.',
  component: Chip,
  controls: {
    variant: select(['soft', 'outline', 'solid', 'ghost'], 'soft', 'Variant'),
    size: select(['sm', 'md'], 'md', 'Size'),
    label: text('Groceries', 'Label'),
    meta: text('', 'Meta'),
    removable: boolean(false, 'Removable'),
  },
  variantKeys: ['variant', 'size'],
  states: { idle: {}, selected: { props: { selected: true } }, ghost: { props: { ghost: true } } },
  review: ['idle', 'selected'],
  frame: { width: 320, padding: 24, background: 'bg' },
  render: (p) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Chip variant={p.variant} size={p.size} label={p.label} meta={p.meta || undefined} selected={p.selected as boolean} ghost={p.ghost as boolean} onPress={() => {}} onRemove={p.removable ? () => {} : undefined} />
      <Chip variant={p.variant} size={p.size} label="Transport" onPress={() => {}} />
      <Chip variant={p.variant} size={p.size} label="Dining" meta="12" onPress={() => {}} />
    </View>
  ),
})
