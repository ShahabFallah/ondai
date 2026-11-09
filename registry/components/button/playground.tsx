import { View } from 'react-native'
import { ArrowRight, ArrowUp } from 'lucide-react-native'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { Button } from './button'

const all = ['solid', 'raised', 'outline', 'soft', 'ghost', 'accent', 'danger'] as const

export default definePlayground({
  name: 'button',
  title: 'Button',
  category: 'primitive',
  description: 'Minimal button. Ink by default, a soft raised key, secondary variants that take the theme material; skins turn it into a pushable key, glossy candy, a liquid-metal ring or a shine.',
  component: Button,
  controls: {
    skin: select(skinNames, 'clean', 'Skin'),
    variant: select(all, 'solid', 'Role'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    title: text('Submit', 'Title'),
    loading: boolean(false, 'Loading'),
    disabled: boolean(false, 'Disabled'),
  },
  variantKeys: ['skin', 'variant', 'size'],
  states: { idle: {}, held: { props: { pressed: true }, description: 'Held down from outside (`pressed`), as hold-to-talk does: pop sinks, candy squashes.' }, loading: { props: { loading: true } }, all: { description: 'Every role side by side.' } },
  review: ['idle', 'all'],
  frame: { width: 360, padding: 24, background: 'bg' },
  render: (p, { state }) =>
    state === 'all' ? (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
          {all.map((v) => (
            <Button key={v} skin={p.skin} variant={v} size={p.size} title={v[0]!.toUpperCase() + v.slice(1)} onPress={() => {}} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Button skin={p.skin} variant="solid" size={p.size} title="Continue" iconRight={ArrowRight} onPress={() => {}} />
          <Button skin={p.skin} variant="solid" size={p.size} icon={ArrowUp} accessibilityLabel="Send" onPress={() => {}} />
          <Button skin={p.skin} variant="raised" size={p.size} icon={ArrowUp} accessibilityLabel="Send" onPress={() => {}} />
        </View>
      </View>
    ) : (
      <Button skin={p.skin} variant={p.variant} size={p.size} title={p.title} loading={p.loading as boolean} disabled={p.disabled} pressed={p.pressed as boolean | undefined} onPress={() => {}} />
    ),
})
