import { definePlayground, select } from '@ondai/playground'
import { SheetDemo } from './sheet.demo'

export default definePlayground({
  name: 'sheet',
  title: 'Sheet',
  category: 'primitive',
  description: 'Animated container: bottom sheet, floating spotlight panel or fullscreen. Glass or solid.',
  component: SheetDemo,
  controls: {
    presentation: select(['sheet', 'spotlight', 'fullscreen'], 'sheet', 'Presentation'),
    variant: select(['glass', 'solid'], 'glass', 'Variant'),
  },
  variantKeys: ['presentation', 'variant'],
  states: { open: {}, closed: { props: { open: false } } },
  review: ['open'],
  frame: { width: 360, padding: 0, background: 'bg' },
})
