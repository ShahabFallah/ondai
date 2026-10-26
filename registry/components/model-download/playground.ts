import { definePlayground, number, select, text } from '@ondai/playground'
import { ModelDownload } from './model-download'

export default definePlayground({
  name: 'model-download',
  title: 'ModelDownload',
  category: 'primitive',
  description: 'A thin ion progress line, ring or card with a mono percentage while a model downloads.',
  component: ModelDownload,
  controls: {
    variant: select(['bar', 'ring', 'card'], 'bar', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    progress: number(0.42, { min: 0, max: 1, step: 0.01, label: 'Progress' }),
    label: text('Preparing model', 'Label'),
    detail: text('1.2 GB · Wi-Fi only', 'Detail'),
  },
  variantKeys: ['variant', 'size'],
  states: { preparing: {}, done: { props: { progress: 1, label: 'Ready' } } },
  review: ['preparing'],
  frame: { width: 320, padding: 24, background: 'bg' },
})
