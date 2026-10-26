import { describe, expect, it } from 'vitest'
import { createOndai } from '@ondai/core/headless'
import { mockAdapter, mockScript } from '@ondai/core/mock'
import { runners } from './runners'

/** Smoke test: every runner executes end to end against the scripted mock (scores are not meaningful here). */
describe('eval runners (mock)', () => {
  it('run every fixture set without throwing', async () => {
    const adapter = mockAdapter({
      script: (call) => (call.responseFormat?.type === 'json' ? mockScript.object({ merchant: 'x', amount: 1, category: 'food', tags: ['work'], replies: ['ok', 'sure'], action: 'task.create', total: 1 }) : mockScript.text('- Friday budget Wednesday Thursday')),
    })
    const ondai = createOndai({ providers: { mock: adapter }, policy: { order: ['mock'] } })
    for (const [name, run] of Object.entries(runners)) {
      const report = await run(ondai, undefined, 2)
      expect(report.component).toBe(name)
      expect(report.total).toBeGreaterThan(0)
    }
  })
})
