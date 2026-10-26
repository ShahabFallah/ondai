import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select } from '@ondai/playground'
import { StreamingTextDemo } from './streaming-text.demo'

const sample = 'Three unread messages. Sam confirmed Friday at noon, Priya sent the revised budget, and the venue asked for a final headcount by Wednesday.'

export default definePlayground({
  name: 'streaming-text',
  title: 'StreamingText',
  category: 'primitive',
  description: 'Token-by-token text with a soft accent caret. New chunks fade in; nothing jumps.',
  component: StreamingTextDemo,
  controls: {
    size: select(['sm', 'md', 'lg', 'xl'], 'md', 'Size'),
    mono: boolean(false, 'Mono'),
    caret: boolean(true, 'Caret'),
  },
  variantKeys: ['size'],
  states: {
    idle: { props: { autoRun: false }, description: 'Placeholder.' },
    thinking: { script: mockScript.thinking(60_000), description: 'Waiting for the first token.' },
    streaming: { script: mockScript.thinking(200).stream(sample, 40), freezeAt: 1400, description: 'Mid-stream with caret.' },
    done: { script: mockScript.stream(sample, 400), freezeAt: 4000 },
  },
  review: ['streaming', 'done'],
  frame: { width: 360, padding: 24, background: 'surface' },
})
