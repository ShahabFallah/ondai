import { definePlayground, select, text } from '@ondai/playground'
import { ThinkingIndicator } from './thinking-indicator'

export default definePlayground({
  name: 'thinking-indicator',
  title: 'ThinkingIndicator',
  category: 'primitive',
  description: 'A shimmering sentence, a chrome orb that breathes, dots, a line or a sweep: calm ways to say the model is working.',
  component: ThinkingIndicator,
  controls: {
    variant: select(['shimmer', 'orb', 'dots', 'line', 'sweep'], 'shimmer', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    state: select(['thinking', 'listening', 'speaking'], 'thinking', 'State'),
    label: text('Reading the thread', 'Label'),
  },
  variantKeys: ['variant', 'size', 'state'],
  states: {
    thinking: { props: { state: 'thinking' }, description: 'Slow breath, a swirl under the surface, the halo pulses with it.' },
    listening: { props: { state: 'listening' }, description: 'Slower breath; the halo swells outward.' },
    speaking: { props: { state: 'speaking' }, description: 'Short rhythmic pulses, two or three per second.' },
    orb: { props: { variant: 'orb', size: 'lg', label: '' }, description: 'The chrome orb on its own.' },
    'no-label': { props: { label: '' } },
  },
  review: ['thinking', 'orb'],
  frame: { width: 280, padding: 24, background: 'bg' },
})
