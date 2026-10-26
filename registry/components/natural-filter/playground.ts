import { mockScript } from '@ondai/core/mock'
import { definePlayground, select, text } from '@ondai/playground'
import { NaturalFilterDemo } from './natural-filter.demo'
import { sampleFilterAnswer, sampleQuery } from './sample-data'

export default definePlayground({
  name: 'natural-filter',
  title: 'NaturalFilter',
  category: 'search',
  description: '"cheap Italian open now" becomes a typed filter object with editable chips. Bar, sheet, or chips only.',
  component: NaturalFilterDemo,
  controls: {
    presentation: select(['bar', 'sheet', 'inline'], 'bar', 'Presentation'),
    chipStyle: select(['soft', 'outline'], 'soft', 'Chip style'),
    placeholder: text('Search in your own words…', 'Placeholder'),
  },
  variantKeys: ['presentation', 'chipStyle'],
  states: {
    idle: {},
    thinking: { script: mockScript.thinking(60_000), props: { initialQuery: sampleQuery, autoRun: true } },
    done: { script: mockScript.thinking(600).object(sampleFilterAnswer), props: { initialQuery: sampleQuery, autoRun: true }, freezeAt: 1500, description: '"cheap" → $, "2km" → 2, "Italian" → italian.' },
    error: { script: mockScript.error('unknown'), props: { initialQuery: sampleQuery, autoRun: true } },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { initialQuery: sampleQuery } },
  },
  review: ['idle', 'done'],
  frame: { width: 380, padding: 20, background: 'bg' },
})
