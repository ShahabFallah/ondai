import { describe, expect, it } from 'vitest'
import { generateText, streamText, Output, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { createOndai } from '../router'
import { withToolPolicy } from '../tools'
import { manualClock, mockAdapter, mockScript } from './index'

describe('scripted model via AI SDK v6', () => {
  it('generateText returns scripted text', async () => {
    const a = mockAdapter({ script: mockScript.thinking(10).stream('Hello there world') })
    const r = await generateText({ model: a.languageModel!(), prompt: 'hi' })
    expect(r.text).toBe('Hello there world')
    expect(r.usage.outputTokens).toBeGreaterThan(0)
  })

  it('streamText streams deltas in order and finishes', async () => {
    const clock = manualClock()
    const a = mockAdapter({ script: mockScript.stream('one two three', 10, 'word'), clock })
    const result = streamText({ model: a.languageModel!(), prompt: 'count' })
    const chunks: string[] = []
    const reader = (async () => {
      for await (const part of result.fullStream) if (part.type === 'text-delta') chunks.push(part.text)
    })()
    await clock.runUntil(reader)
    expect(chunks.join('')).toBe('one two three')
    expect(chunks.length).toBe(3)
  })

  it('Output.object parses scripted objects with zod', async () => {
    const schema = z.object({ title: z.string(), amount: z.number(), category: z.enum(['food', 'travel']) })
    const a = mockAdapter({ script: mockScript.object({ title: 'Lunch', amount: 12.5, category: 'food' }) })
    const r = await generateText({ model: a.languageModel!(), prompt: 'lunch 12.50', output: Output.object({ schema }) })
    expect(r.output).toEqual({ title: 'Lunch', amount: 12.5, category: 'food' })
  })

  it('tool calls run JS tools through the policy wrapper, then continue the loop', async () => {
    let ran: unknown = null
    const tools = withToolPolicy(
      { createTask: tool({ description: 'Create a task', inputSchema: z.object({ title: z.string() }), execute: async (i) => (ran = i, { ok: true }) }) },
      { meta: { createTask: { policy: 'ask' } }, onConfirm: (p) => p.confirm() },
    )
    const a = mockAdapter({
      script: (call) => (call.callIndex === 0 ? mockScript.toolCall('createTask', { title: 'Buy milk' }) : mockScript.text('Done: Buy milk')),
    })
    const r = await generateText({ model: a.languageModel!(), tools, prompt: 'add buy milk', stopWhen: stepCountIs(3) })
    expect(ran).toEqual({ title: 'Buy milk' })
    expect(r.text).toBe('Done: Buy milk')
    expect(r.steps.flatMap((s) => s.toolResults)[0]?.output).toEqual({ ok: true })
  })

  it('error scripts throw classified errors', async () => {
    const a = mockAdapter({ script: mockScript.error('refusal') })
    await expect(generateText({ model: a.languageModel!(), prompt: 'x' })).rejects.toThrow(/declined/)
    const ondai = createOndai({ providers: { mock: a } })
    try {
      await generateText({ model: a.languageModel!(), prompt: 'x' })
    } catch (e) {
      expect(ondai.classify(e)).toBe('refusal')
    }
  })
})

describe('router', () => {
  it('follows policy order, skips cloud unless allowed, and surfaces preparing', async () => {
    const apple = mockAdapter({ simulate: 'unavailable' })
    const nano = mockAdapter({ simulate: 'nano', availability: { status: 'preparing', provider: 'nano', progress: 0.4 } })
    const llama = mockAdapter({ simulate: 'llama' })
    const cloud = mockAdapter({ simulate: 'cloud', simulated: false })
    const ondai = createOndai({ providers: { apple, nano, llama, cloud } })
    const r = await ondai.resolve('text')
    expect(r.provider).toBe('llama')
    const noLlama = createOndai({ providers: { apple, nano, cloud } })
    await expect(noLlama.resolve('text')).rejects.toThrow()
    expect((await noLlama.availability('text')).status).toBe('preparing')
    const allow = createOndai({ providers: { apple, cloud }, policy: { allowCloud: true } })
    expect((await allow.resolve('text')).provider).toBe('cloud')
    await expect(allow.resolve('text', { localOnly: true })).rejects.toThrow()
  })
  it('routes by capability and caches availability until refresh', async () => {
    let checks = 0
    const a = mockAdapter({ capabilities: ['text'] })
    const orig = a.availability
    a.availability = async () => (checks++, orig())
    const ondai = createOndai({ providers: { apple: a } })
    await ondai.resolve('text')
    await ondai.resolve('text')
    expect(checks).toBe(1)
    await expect(ondai.resolve('embeddings')).rejects.toThrow()
    await ondai.refresh()
    expect(checks).toBe(2)
  })
})
