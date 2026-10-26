import { definePlayground, select, text } from '@ondai/playground'
import { ThinkingIndicator } from './thinking-indicator'

export default definePlayground({
  name: 'thinking-indicator',
  title: 'ThinkingIndicator',
  category: 'primitive',
  description: 'Dots, a breathing orb, a sweeping line, or a light sweep: four calm ways to say the model is working.',
  component: ThinkingIndicator,
  controls: {
    variant: select(['dots', 'orb', 'line', 'sweep'], 'dots', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    label: text('Thinking', 'Label'),
  },
  variantKeys: ['variant', 'size'],
  states: {
    thinking: {},
    'no-label': { props: { label: '' } },
  },
  review: ['thinking'],
  frame: { width: 280, padding: 24, background: 'bg' },
})
