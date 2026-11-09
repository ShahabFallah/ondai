import { definePlayground, select } from '@ondai/playground'
import { AvailabilityGateDemo } from './availability-gate.demo'

export default definePlayground({
  name: 'availability-gate',
  title: 'AvailabilityGate',
  category: 'primitive',
  description: 'Renders children only when the on-device model is ready; otherwise a quiet empty state or download progress.',
  component: AvailabilityGateDemo,
  controls: { variant: select(['card', 'inline', 'fullscreen'], 'card', 'Variant') },
  variantKeys: ['variant'],
  states: {
    ready: {},
    'not-eligible': { availability: { status: 'unavailable', reason: 'device-not-eligible' } },
    'not-enabled': { availability: { status: 'unavailable', reason: 'not-enabled' } },
    preparing: { availability: { status: 'preparing', provider: 'llama', progress: 0.37 } },
    'unsupported-os': { availability: { status: 'unavailable', reason: 'unsupported-os' } },
  },
  review: ['ready', 'not-eligible', 'preparing'],
  frame: { width: 360, padding: 24, background: 'bg' },
})
