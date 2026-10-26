import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { SmartInput } from './smart-input'
import { expenseAliases, expenseSchema, sampleParsed, sampleUtterance } from './sample-data'

export default definePlayground({
  name: 'smart-input',
  title: 'SmartInput',
  category: 'input',
  description: 'Text, voice or photo fills your zod form on device, with per-field confidence and confirm/undo.',
  component: SmartInput,
  controls: {
    presentation: select(['field', 'composer', 'overlay', 'card'], 'field', 'Presentation'),
    confidenceStyle: select(['highlight', 'badge', 'underline'], 'highlight', 'Confidence'),
    voice: boolean(true, 'Voice'),
    camera: boolean(true, 'Camera'),
    placeholder: text('Describe the expense…', 'Placeholder'),
  },
  variantKeys: ['presentation', 'confidenceStyle'],
  states: {
    idle: {},
    thinking: { script: mockScript.thinking(60_000), props: { initialText: sampleUtterance, autoRun: true } },
    filled: { script: mockScript.thinking(700).object(sampleParsed), props: { initialText: sampleUtterance, autoRun: true }, freezeAt: 1500, description: 'Enum fuzzy-matched (Food & drinks → food), date parsed from "yesterday".' },
    'low-confidence': { script: mockScript.thinking(500).object({ merchant: 'Lui', amount: 'twenty-ish', category: 'stuff' }), props: { initialText: 'spent some money at lui', autoRun: true }, freezeAt: 1200 },
    error: { script: mockScript.error('invalid-output'), props: { initialText: sampleUtterance, autoRun: true } },
    refusal: { script: mockScript.refusal(), props: { initialText: sampleUtterance, autoRun: true } },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' } },
  },
  review: ['idle', 'thinking', 'filled'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p) => <SmartInput {...(p as object)} schema={expenseSchema} aliases={expenseAliases} instructions="Expenses app." onVoice={async () => sampleUtterance} onCamera={async () => 'LUIGI TRATTORIA  TOTAL 24.50 EUR  CARD'} />,
})
