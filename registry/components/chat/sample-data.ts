import type { ChatMessage } from '@ondai/core'

export const chatSuggestions = ['Plan a slow Saturday in Lyon', 'Reply to Priya about Friday', 'What did I note about the budget?']

export const sampleReply =
  'Start late at Les Halles Paul Bocuse for coffee and a praline tart, then walk the old town in Vieux Lyon while it is quiet. After lunch, take the funicular up to Fourvière for the view, and finish with an early dinner at a bouchon near Saint-Jean.'

export const sampleConversation: ChatMessage[] = [
  { id: 'u1', role: 'user', text: 'Plan a slow Saturday in Lyon' },
  { id: 'a1', role: 'assistant', text: sampleReply, status: 'done', thoughtMs: 840 },
]
