// M0 spike: exercises Apple Foundation Models step by step and logs raw results and errors.
import { generateText, streamText, Output, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { estimateTokens, type Ondai } from '@ondai/core'

const raw = (e: unknown) => (e instanceof Error ? { name: e.name, message: e.message, code: (e as { code?: string }).code } : e)
const log = (step: string, data: unknown) => console.log(`[spike] ${step} ${JSON.stringify(data)}`)

export async function runSpike(ondai: Ondai) {
  const r = await ondai.resolve('text')
  log('provider', { provider: r.provider, locality: r.locality })
  const steps: Array<[string, () => Promise<unknown>]> = [
    ['generate-plain', async () => (await generateText({ model: r.adapter.languageModel!(), prompt: 'Say hello in three words.' })).text],
    ['generate-system', async () => (await generateText({ model: r.adapter.languageModel!(), system: 'You are concise.', prompt: 'Name three fruits.' })).text],
    [
      'stream-plain',
      async () => {
        const t0 = Date.now()
        let ttft = 0
        let text = ''
        const res = streamText({ model: r.adapter.languageModel!(), prompt: 'Describe a sunrise over the sea in two sentences.', onError: () => {} })
        for await (const part of res.fullStream) {
          if (part.type === 'text-delta') {
            if (!ttft) ttft = Date.now() - t0
            text += part.text
          } else if (part.type === 'error') throw part.error
        }
        const ms = Date.now() - t0
        return { text, ms, ttft, tokens: estimateTokens(text), tps: Math.round((estimateTokens(text) / Math.max(1, ms - ttft)) * 1000) }
      },
    ],
    [
      'structured',
      async () =>
        (
          await generateText({
            model: r.adapter.languageModel!(),
            prompt: 'Lunch with Sam at Luigi\'s, 24.50 euros, paid by card.',
            system: 'Extract the expense.',
            output: Output.object({ schema: z.object({ title: z.string(), amount: z.number(), currency: z.string(), category: z.enum(['food', 'travel', 'other']) }) }),
          })
        ).output,
    ],
    [
      'tool',
      async () => {
        const tools = { getWeather: tool({ description: 'Get the weather for a city', inputSchema: z.object({ city: z.string() }), execute: async ({ city }) => ({ city, forecast: 'sunny, 21°C' }) }) }
        const res = await generateText({ model: r.adapter.languageModel!({ tools }), tools, prompt: 'What is the weather in Lisbon?', stopWhen: stepCountIs(3) })
        return { text: res.text, calls: res.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName)), results: res.steps.flatMap((s) => s.toolResults.map((x) => x.output)) }
      },
    ],
  ]
  for (const [name, fn] of steps) {
    const t0 = Date.now()
    try {
      const out = await fn()
      log(name, { ok: true, ms: Date.now() - t0, out })
    } catch (e) {
      log(name, { ok: false, ms: Date.now() - t0, error: raw(e), kind: ondai.classify(e, r.provider) })
    }
  }
  log('done', {})
}
