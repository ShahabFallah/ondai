import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select } from '@ondai/playground'
import { SmartReplyDemo } from './smart-reply.demo'
import { sampleReplies } from './sample-data'

export default definePlayground({
  name: 'smart-reply',
  title: 'SmartReply',
  category: 'text',
  description: 'Three reply suggestions for the last message: chips, a stack, or ghost text inside the input.',
  component: SmartReplyDemo,
  controls: {
    presentation: select(['chips', 'stack', 'ghost'], 'chips', 'Presentation'),
    tone: select(['neutral', 'friendly', 'formal', 'brief'], 'neutral', 'Tone'),
    showTone: boolean(false, 'Tone picker'),
  },
  variantKeys: ['presentation'],
  states: {
    thinking: { script: mockScript.thinking(60_000) },
    done: { script: mockScript.thinking(600).object({ replies: sampleReplies }), freezeAt: 1500 },
    error: { script: mockScript.error('unknown') },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' } },
  },
  review: ['thinking', 'done'],
  frame: { width: 380, padding: 20, background: 'bg' },
})
