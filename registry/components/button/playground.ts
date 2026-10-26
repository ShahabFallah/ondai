import { boolean, definePlayground, select, text } from '@ondai/playground'
import { Button } from './button'

export default definePlayground({
  name: 'button',
  title: 'Button',
  category: 'primitive',
  description: 'Minimal button. Monochrome by default; the accent variant is reserved for the single primary AI action.',
  component: Button,
  controls: {
    variant: select(['solid', 'soft', 'outline', 'ghost', 'accent', 'danger'], 'solid', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    title: text('Summarize', 'Title'),
    loading: boolean(false, 'Loading'),
    disabled: boolean(false, 'Disabled'),
  },
  variantKeys: ['variant', 'size'],
  states: { idle: {}, loading: { props: { loading: true } } },
  review: ['idle'],
  frame: { width: 280, padding: 24, background: 'bg' },
})
