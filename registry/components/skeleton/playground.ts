import { boolean, definePlayground, number, select } from '@ondai/playground'
import { Skeleton } from './skeleton'

export default definePlayground({
  name: 'skeleton',
  title: 'Skeleton',
  category: 'primitive',
  description: 'Loading placeholder with a faint ion shimmer.',
  component: Skeleton,
  controls: {
    lines: number(3, { min: 1, max: 6, step: 1, label: 'Lines' }),
    height: number(14, { min: 8, max: 64, step: 2, label: 'Height' }),
    radius: select(['sm', 'md', 'lg', 'pill'], 'sm', 'Radius'),
    shimmer: boolean(true, 'Shimmer'),
  },
  variantKeys: ['radius'],
  states: { loading: {}, static: { props: { shimmer: false } } },
  review: ['loading'],
  frame: { width: 320, padding: 24, background: 'surface' },
})
