import { definePlayground, select, text } from '@ondai/playground'
import { OnDeviceBadge } from './on-device-badge'

export default definePlayground({
  name: 'on-device-badge',
  title: 'OnDeviceBadge',
  category: 'primitive',
  description: 'A quiet pill that says where inference runs. The dot glows only while the AI works.',
  component: OnDeviceBadge,
  controls: {
    variant: select(['pill', 'icon', 'text'], 'pill', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    label: text('', 'Label override'),
  },
  variantKeys: ['variant', 'size'],
  states: {
    idle: { props: { state: 'idle' } },
    thinking: { props: { state: 'thinking' }, description: 'Dot pulses with a soft glow.' },
    nano: { props: { state: 'idle', provider: 'nano', locality: 'on-device' } },
    llama: { props: { state: 'idle', provider: 'llama', locality: 'local' } },
    cloud: { props: { state: 'idle', provider: 'cloud', locality: 'cloud' } },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { state: 'idle' } },
  },
  review: ['idle', 'thinking', 'llama', 'cloud'],
  frame: { width: 280, padding: 24, background: 'bg' },
})
