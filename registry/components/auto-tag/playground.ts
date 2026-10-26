import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, number, select } from '@ondai/playground'
import { AutoTagDemo } from './auto-tag.demo'
import { sampleTagAnswer } from './sample-data'

export default definePlayground({
  name: 'auto-tag',
  title: 'AutoTag',
  category: 'organize',
  description: "Tag and category suggestions constrained to the app's own list, fuzzy-matched after the model answers. Chips, inline ghosts or a dropdown.",
  component: AutoTagDemo,
  controls: {
    presentation: select(['chips', 'inlineGhost', 'dropdown'], 'chips', 'Presentation'),
    multi: boolean(true, 'Multi-select'),
    max: number(3, { min: 1, max: 5, step: 1, label: 'Max suggestions' }),
  },
  variantKeys: ['presentation'],
  states: {
    thinking: { script: mockScript.thinking(60_000) },
    done: { script: mockScript.thinking(500).object(sampleTagAnswer), freezeAt: 1500, description: '"Travel", "work stuff", "finances" are matched to travel, work, finance.' },
    error: { script: mockScript.error('invalid-output') },
    unavailable: { availability: { status: 'unavailable', reason: 'not-enabled' } },
  },
  review: ['thinking', 'done'],
  frame: { width: 380, padding: 20, background: 'bg' },
})
