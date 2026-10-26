import type { ThreadMessage } from './use-smart-reply'

export const sampleThread: ThreadMessage[] = [
  { from: 'them', text: 'Hey! Are we still on for Friday at noon?' },
  { from: 'me', text: 'Yes, venue is confirmed.' },
  { from: 'them', text: 'Great. Can you bring the revised budget printout, and do you want me to pick you up?' },
]

export const sampleReplies = ['Yes, I\'ll bring it. A ride would be great, thanks!', 'I\'ll bring the printout, but I\'ll drive myself.', 'Sure. What time would you pick me up?']
