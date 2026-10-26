import { boolean, definePlayground, select, text } from '@ondai/playground'
import { SemanticSearchDemo } from './semantic-search.demo'

export default definePlayground({
  name: 'semantic-search',
  title: 'SemanticSearch',
  category: 'search',
  description: 'Search by meaning over your own records: a local vector index plus keyword matching, with "why it matched".',
  component: SemanticSearchDemo,
  controls: {
    presentation: select(['bar', 'spotlight', 'header'], 'bar', 'Presentation'),
    resultStyle: select(['list', 'cards', 'grouped'], 'list', 'Results'),
    showWhy: boolean(true, 'Why it matched'),
    placeholder: text('Search by meaning…', 'Placeholder'),
  },
  variantKeys: ['presentation', 'resultStyle'],
  states: {
    idle: {},
    results: { props: { initialQuery: 'trips and tickets', autoRun: true }, freezeAt: 800 },
    'keywords-only': { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { initialQuery: 'lasagna', autoRun: true }, description: 'No embeddings on this device: keyword search still works.' },
    empty: { props: { initialQuery: 'quantum chromodynamics', autoRun: true }, freezeAt: 800 },
  },
  review: ['idle', 'results'],
  frame: { width: 380, padding: 20, background: 'bg' },
})
