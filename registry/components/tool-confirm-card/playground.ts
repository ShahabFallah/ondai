import { boolean, definePlayground, select } from '@ondai/playground'
import type { PendingConfirmation } from '@ondai/core'
import { ToolConfirmCard } from './tool-confirm-card'

const pending = (risk: PendingConfirmation['risk']): PendingConfirmation => ({
  id: 'p1',
  toolName: 'sendEmail',
  title: 'Send email',
  description: 'Sends a message from your account.',
  input: { to: 'priya@example.com', subject: 'Revised budget', body: 'Thanks Priya, approved. See you Friday.' },
  risk,
  confirm: () => {},
  cancel: () => {},
})

export default definePlayground({
  name: 'tool-confirm-card',
  title: 'ToolConfirmCard',
  category: 'agentic',
  description: 'Approval for any tool call: action, parameters and risk level. Approve, edit or cancel.',
  component: ToolConfirmCard,
  controls: {
    presentation: select(['card', 'sheet', 'banner'], 'card', 'Presentation'),
    editable: boolean(true, 'Editable'),
  },
  variantKeys: ['presentation'],
  states: {
    confirm: { props: { pending: pending('medium') } },
    'high-risk': { props: { pending: pending('high') } },
    'low-risk': { props: { pending: { ...pending('low'), toolName: 'openScreen', title: 'Open Settings', description: undefined, input: {} } } },
  },
  review: ['confirm', 'high-risk'],
  frame: { width: 380, padding: 20, background: 'bg' },
})
