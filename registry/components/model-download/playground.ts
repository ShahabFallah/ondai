import { definePlayground, number, select, text } from '@ondai/playground'
import { ModelDownload } from './model-download'

export default definePlayground({
  name: 'model-download',
  title: 'ModelDownload',
  category: 'primitive',
  description: 'A thin progress line, ring or card with a tabular percentage while a model downloads.',
  component: ModelDownload,
  controls: {
    variant: select(['bar', 'ring', 'card'], 'bar', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    progress: number(0.42, { min: 0, max: 1, step: 0.01, label: 'Progress' }),
    label: text('Getting the model ready', 'Label'),
    detail: text('0.8 of 2.0 GB', 'Detail'),
  },
  variantKeys: ['variant', 'size'],
  states: {
    preparing: {},
    starting: { props: { progress: undefined, detail: 'Waiting for Wi-Fi' } },
    cancellable: { props: { variant: 'card', onCancel: () => {} } },
    done: { props: { progress: 1, label: 'Ready to go', detail: '2.0 GB, runs offline' } },
  },
  review: ['preparing'],
  frame: { width: 320, padding: 24, background: 'bg' },
})
