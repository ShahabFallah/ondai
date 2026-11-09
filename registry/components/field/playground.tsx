import { definePlayground, number, select, text } from '@ondai/playground'
import { Button } from '../button/button'
import { Field } from './field'

export default definePlayground({
  name: 'field',
  title: 'Field',
  category: 'primitive',
  description: 'Text field in an IonBorder: quiet when idle, lit only while the AI works on it. Optional confidence styling.',
  component: Field,
  controls: {
    size: select(['md', 'lg'], 'md', 'Size'),
    confidenceStyle: select(['highlight', 'badge', 'underline', 'none'], 'highlight', 'Confidence style'),
    confidence: number(0.9, { min: 0, max: 1, step: 0.05, label: 'Confidence' }),
    label: text('Merchant', 'Label'),
    placeholder: text("Where did you spend?", 'Placeholder'),
    value: text("Luigi's Trattoria", 'Value'),
  },
  variantKeys: ['size', 'confidenceStyle'],
  states: {
    idle: { props: { state: 'idle', confidence: undefined } },
    focus: { props: { state: 'focus', confidence: undefined } },
    thinking: { props: { state: 'thinking', confidence: undefined } },
    filled: { props: { state: 'done' } },
    error: { props: { state: 'error', error: 'Could not read the merchant name.', confidence: undefined } },
    'with-key': { props: { state: 'idle', confidence: undefined }, description: 'A titled key in the right slot: the text shrinks, the key stays whole.' },
  },
  review: ['idle', 'thinking', 'filled'],
  frame: { width: 360, padding: 24, background: 'bg' },
  render: (p, { state }) => <Field {...(p as object)} right={state === 'with-key' ? <Button title="Fill in" size="sm" variant="raised" onPress={() => {}} /> : undefined} />,
})
