import { describe, expect, it } from 'vitest'
import { createVectorIndex, keywordScore } from './vector'
import { runEvals, matchers } from './evals'
import { withToolPolicy, preselectTools } from './tools'

describe('vector index', () => {
  it('ranks by cosine and hybrid', async () => {
    const idx = createVectorIndex({ dimension: 3 })
    await idx.ready
    await idx.add([
      { id: 'a', vector: [1, 0, 0], text: 'cheap italian pizza' },
      { id: 'b', vector: [0, 1, 0], text: 'sushi bar open late' },
      { id: 'c', vector: [0.9, 0.1, 0], text: 'pasta and wine' },
    ])
    expect(idx.search([1, 0, 0], { k: 2 }).map((h) => h.id)).toEqual(['a', 'c'])
    const hy = idx.searchHybrid([0, 1, 0], 'late sushi', { k: 1 })
    expect(hy[0]!.id).toBe('b')
    expect(hy[0]!.why.terms).toContain('sushi')
    await idx.remove(['a'])
    expect(idx.size()).toBe(2)
    await expect(idx.add([{ id: 'x', vector: [1, 2] }])).rejects.toThrow()
  })
  it('keyword score', () => {
    expect(keywordScore('italian cheap', 'cheap italian pizza')).toBe(1)
    expect(keywordScore('thai', 'cheap italian pizza')).toBe(0)
  })
})

describe('evals', () => {
  it('runs fixtures and computes pass rate', async () => {
    const report = await runEvals({
      component: 'auto-tag',
      provider: 'mock',
      fixtures: [
        { id: '1', input: 'milk and eggs', expected: 'groceries' },
        { id: '2', input: 'uber', expected: 'transport' },
      ],
      run: async (input) => (input.includes('milk') ? 'Groceries' : 'dining'),
      match: matchers.enumOf(['groceries', 'transport', 'dining']),
    })
    expect(report.total).toBe(2)
    expect(report.passed).toBe(1)
    expect(report.ok).toBe(false)
    expect((matchers.sameSet(['a', 'b'], ['b', 'a']) as { pass: boolean }).pass).toBe(true)
    expect((matchers.fields(['amount'], { tolerance: 0.1 })({ amount: 1.05 }, { amount: 1 }) as { pass: boolean }).pass).toBe(true)
  })
})

describe('tool policy', () => {
  it('asks before running and passes edited input', async () => {
    let pendingTitle = ''
    const tools = withToolPolicy(
      { sendEmail: { description: 'Send an email', execute: async (i: { to: string }) => `sent to ${i.to}` } },
      {
        meta: { sendEmail: { policy: 'ask', risk: 'high' } },
        onConfirm: (p) => {
          pendingTitle = p.title
          p.confirm({ to: 'edited@example.com' })
        },
      },
    )
    expect(await tools.sendEmail.execute!({ to: 'a@b.c' })).toBe('sent to edited@example.com')
    expect(pendingTitle).toBe('Send Email')
  })
  it('blocks never and cancels', async () => {
    const tools = withToolPolicy(
      { wipe: { execute: async (_i: unknown) => 'boom' }, pay: { execute: async (_i: unknown) => 'paid' } },
      { meta: { wipe: { policy: 'never' }, pay: { policy: 'ask' } }, onConfirm: (p) => p.cancel('no') },
    )
    await expect(tools.wipe.execute!({})).rejects.toThrow(/not allowed/)
    await expect(tools.pay.execute!({})).rejects.toThrow(/no/)
  })
  it('preselects tools by keywords', async () => {
    const tools = Object.fromEntries(
      ['createTask', 'deleteTask', 'openSettings', 'sendMessage', 'addExpense', 'searchNotes', 'toggleDarkMode'].map((n) => [
        n,
        { description: `${n} does ${n.toLowerCase()}` },
      ]),
    )
    const picked = await preselectTools(tools, 'add a new expense for lunch', { k: 3 })
    expect(Object.keys(picked)).toContain('addExpense')
    expect(Object.keys(picked).length).toBe(3)
  })
})
