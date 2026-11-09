import { describe, expect, it } from 'vitest'
import { fitHistory, type ChatMessage } from '../history'

const turn = (role: ChatMessage['role'], text: string, id = text): ChatMessage => ({ id, role, text })

describe('fitHistory', () => {
  it('keeps the whole conversation when it fits', () => {
    const h = [turn('user', 'hi'), turn('assistant', 'hello'), turn('user', 'plan friday')]
    expect(fitHistory(h, 1000).map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
  })

  it('drops the oldest turns first and starts on a user turn', () => {
    const long = 'word '.repeat(200)
    const h = [turn('user', long, 'a'), turn('assistant', long, 'b'), turn('user', 'and lunch?', 'c')]
    const out = fitHistory(h, 120)
    expect(out).toHaveLength(1)
    expect(out[0]).toEqual({ role: 'user', content: 'and lunch?' })
  })

  it('skips empty replies (a cancelled turn)', () => {
    const h = [turn('user', 'one'), turn('assistant', ''), turn('user', 'two')]
    expect(fitHistory(h, 1000).map((m) => m.content)).toEqual(['one', 'two'])
  })
})
