import type { ModelMessage } from 'ai'
import type { AiState } from '@ondai/tokens'
import { estimateTokens, truncateToBudget } from './budget'
import type { OndaiError } from './errors'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Assistant turns only: where the reply is in its life. */
  status?: AiState
  /** Assistant turns only: time from send to the first token. */
  thoughtMs?: number
  error?: OndaiError
}

/** Keep the newest turns that fit the budget; the first kept turn is always a user turn. */
export function fitHistory(messages: ChatMessage[], budget: number): ModelMessage[] {
  const kept: ChatMessage[] = []
  let used = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!
    if (!m.text) continue
    const cost = estimateTokens(m.text) + 4
    if (used + cost > budget && kept.length) break
    kept.unshift(m)
    used += cost
  }
  while (kept.length && kept[0]!.role !== 'user') kept.shift()
  return kept.map((m, i) => ({ role: m.role, content: i === kept.length - 1 && m.role === 'user' ? truncateToBudget(m.text, budget) : m.text }))
}

