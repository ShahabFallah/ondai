import { definePlayground, number, select, text } from '@ondai/playground'
import { LatencyChip } from './latency-chip'

export default definePlayground({
  name: 'latency-chip',
  title: 'LatencyChip',
  category: 'primitive',
  description: 'Dev-only metrics pill: latency, tokens per second, provider.',
  component: LatencyChip,
  controls: {
    size: select(['sm', 'md'], 'sm', 'Size'),
    latencyMs: number(142, { min: 0, max: 5000, step: 1, label: 'Latency ms' }),
    tokensPerSecond: number(38, { min: 0, max: 200, step: 1, label: 'tok/s' }),
    provider: text('apple', 'Provider'),
  },
  variantKeys: ['size'],
  states: { default: {} },
  review: ['default'],
  frame: { width: 240, padding: 24, background: 'bg' },
})
