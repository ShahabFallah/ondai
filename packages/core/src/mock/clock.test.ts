import { describe, expect, it } from 'vitest'
import { manualClock } from './clock'

describe('manualClock', () => {
  it('advances through chained sleeps, timing each from when it was queued', async () => {
    const clock = manualClock()
    let steps = 0
    void (async () => {
      for (let i = 0; i < 10; i++) {
        await clock.sleep(100)
        steps++
      }
    })()
    await clock.advance(550)
    expect(steps).toBe(5)
    expect(clock.now()).toBe(550)
    await clock.advance(500)
    expect(steps).toBe(10)
  })

  it('lets a sleep queued after an awaited promise (a tool) come due within the same advance', async () => {
    const clock = manualClock()
    const log: string[] = []
    const tool = async () => ({ ok: true })
    void (async () => {
      await clock.sleep(600)
      log.push('call 1')
      await tool()
      await clock.sleep(600)
      log.push('call 2')
      await clock.sleep(600)
      log.push('answer')
    })()
    await clock.advance(1300)
    expect(log).toEqual(['call 1', 'call 2'])
    await clock.advance(1000)
    expect(log).toEqual(['call 1', 'call 2', 'answer'])
  })
})
