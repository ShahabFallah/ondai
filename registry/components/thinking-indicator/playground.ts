import { definePlayground, select, text } from '@ondai/playground'
import { ThinkingIndicator } from './thinking-indicator'

export default definePlayground({
  name: 'thinking-indicator',
  title: 'ThinkingIndicator',
  category: 'primitive',
  description: 'Dots, a metallic breathing orb, a sweeping line, or a light sweep: four calm ways to say the model is working.',
  component: ThinkingIndicator,
  controls: {
    variant: select(['dots', 'orb', 'line', 'sweep'], 'dots', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    state: select(['thinking', 'listening', 'speaking'], 'thinking', 'State'),
    label: text('Thinking', 'Label'),
  },
  variantKeys: ['variant', 'size', 'state'],
  states: {
    thinking: { props: { state: 'thinking' }, description: 'Slow breath, a swirl under the surface, the halo pulses with it.' },
    listening: { props: { state: 'listening' }, description: 'Slower breath; the halo swells outward.' },
    speaking: { props: { state: 'speaking' }, description: 'Short rhythmic pulses, two or three per second.' },
    'no-label': { props: { label: '' } },
  },
  review: ['thinking'],
  frame: { width: 280, padding: 24, background: 'bg' },
})
