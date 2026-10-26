import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { CommandBar } from './command-bar'
import { sampleActions } from './sample-data'

const createTask = (call: { callIndex: number }) =>
  call.callIndex === 0 ? mockScript.thinking(900).toolCall('task_create', { title: 'Buy milk', due: 'tomorrow' }) : mockScript.text('Done.')

export default definePlayground({
  name: 'command-bar',
  title: 'CommandBar',
  category: 'agentic',
  description: 'Spotlight for your app: a natural-language request becomes one of your registered actions, chosen on device, with a preview and confirmation for risky actions.',
  component: CommandBar,
  controls: {
    presentation: select(['spotlight', 'sheet', 'inline', 'pill', 'fullscreen'], 'spotlight', 'Presentation'),
    variant: select(['glass', 'solid', 'minimal'], 'glass', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    showVoice: boolean(true, 'Voice button'),
    showKeyHints: boolean(true, 'Key hints'),
    grouped: boolean(true, 'Grouped'),
    placeholder: text('Ask or do anything…', 'Placeholder'),
  },
  variantKeys: ['presentation', 'variant', 'size'],
  states: {
    idle: { props: { initialQuery: '' } },
    focus: { props: { initialQuery: 'add' }, description: 'Suggestions filter as you type.' },
    thinking: { script: mockScript.thinking(60_000), props: { initialQuery: 'remind me to buy milk tomorrow', autoRun: true } },
    tool: { script: createTask, props: { initialQuery: 'remind me to buy milk tomorrow', autoRun: true }, freezeAt: 1500, description: 'The model picked an action; the preview row slides in.' },
    confirm: {
      script: (call) => (call.callIndex === 0 ? mockScript.thinking(700).toolCall('email_send', { to: 'priya@example.com', subject: 'Revised budget', body: 'Approved, thanks.' }) : mockScript.text('Sent.')),
      props: { initialQuery: 'email priya that the budget is approved', autoRun: true },
      freezeAt: 1200,
      description: 'Risky actions ask first.',
    },
    done: { script: createTask, props: { initialQuery: 'remind me to buy milk tomorrow', autoRun: true }, freezeAt: 4000 },
    error: { script: mockScript.error('unknown'), props: { initialQuery: 'do the thing', autoRun: true } },
    refusal: { script: mockScript.refusal(), props: { initialQuery: 'something the model declines', autoRun: true } },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { initialQuery: 'add expense 24.50 at luigi' }, description: 'No model: keyword search still works.' },
  },
  review: ['idle', 'thinking', 'tool', 'confirm'],
  frame: { width: 420, height: 560, padding: 0, background: 'bg', center: false },
  render: (p) => <CommandBar {...(p as object)} actions={sampleActions} inline open recent={['task.create', 'screen.inbox']} onVoice={async () => 'open settings'} />,
})
