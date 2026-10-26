/**
 * Headless eval runners: the same logic the hooks use, callable without React so fixtures run in Node (mock)
 * and on device (real provider) through the Gallery.
 */
import { z } from 'zod'
import { describeSchema, generateText, matchEnumList, matchers, Output, refineObject, runEvals, streamText, tool, stepCountIs, type EvalFixture, type EvalReport, type Ondai } from '@ondai/core/headless'

type Obj = Record<string, unknown>
const asObjFixtures = (f: unknown) => f as EvalFixture<string, Obj>[]
import { fixtureSets, type FixtureComponent } from './index'

type Runner = (ondai: Ondai, onProgress?: (done: number, total: number) => void, limit?: number) => Promise<EvalReport>

const expenseSchema = z.object({ merchant: z.string(), amount: z.number(), currency: z.string().optional(), category: z.enum(['food', 'transport', 'home', 'health', 'fun', 'other']), date: z.string().describe('date').optional(), note: z.string().optional() })
const expenseAliases = { category: { food: ['lunch', 'dinner', 'coffee', 'restaurant', 'groceries'], transport: ['uber', 'taxi', 'train', 'bus', 'fuel'], fun: ['movie', 'concert', 'game', 'cinema'] } }
const filterSchema = z.object({ cuisine: z.enum(['italian', 'japanese', 'mexican', 'indian', 'thai', 'american']).optional(), price: z.enum(['$', '$$', '$$$']).optional(), openNow: z.boolean().optional(), maxDistanceKm: z.number().optional(), minRating: z.number().optional(), sort: z.enum(['rating', 'distance', 'price']).optional() })
const filterAliases = { cuisine: { italian: ['pizza', 'pasta'], japanese: ['sushi', 'ramen'], mexican: ['tacos'] }, price: { $: ['cheap', 'budget'], $$$: ['fancy', 'expensive', 'upscale'] } }
const receiptSchema = z.object({ merchant: z.string(), total: z.number(), currency: z.string().optional(), date: z.string().describe('date').optional(), category: z.enum(['food', 'groceries', 'transport', 'shopping', 'health', 'other']).optional(), paymentMethod: z.enum(['card', 'cash', 'other']).optional() })
const noteTags = ['work', 'personal', 'finance', 'travel', 'health', 'ideas', 'recipes', 'family']
const actionIds = ['task.create', 'expense.add', 'email.send', 'screen.settings', 'screen.inbox', 'screen.expenses', 'item.budget-q4', 'theme.toggle'] as const
const actionDescriptions: Record<(typeof actionIds)[number], string> = {
  'task.create': 'Create task. Add a task to your list. Keywords: todo, remind, add, new',
  'expense.add': 'Add expense. Log money you spent. Keywords: spent, paid, cost, euro, dollar',
  'email.send': 'Send email. Send a message from your account. Keywords: mail, message, write',
  'screen.settings': 'Settings screen. Keywords: preferences, theme, account',
  'screen.inbox': 'Inbox screen. Keywords: mail, messages',
  'screen.expenses': 'Expenses screen. Keywords: money, budget, spending',
  'item.budget-q4': 'Open the Q4 budget spreadsheet',
  'theme.toggle': 'Toggle dark mode. Keywords: theme, light, dark, appearance',
}

async function structuredRun<S extends z.ZodObject<z.ZodRawShape>>(ondai: Ondai, schema: S, system: string, input: string, aliases?: Record<string, Record<string, string[]>>) {
  const r = await ondai.resolve('structured')
  const fields = describeSchema(schema)
  const partial = (schema as unknown as { partial: () => z.ZodObject<z.ZodRawShape> }).partial()
  let raw: Record<string, unknown>
  try {
    const res = await generateText({ model: r.adapter.languageModel!(), system, prompt: input, output: Output.object({ schema: partial }), temperature: 0 })
    raw = res.output as Record<string, unknown>
  } catch (e) {
    const text = (e as { text?: string }).text
    const m = text?.match(/\{[\s\S]*\}/)
    if (!m) throw e
    raw = JSON.parse(m[0]) as Record<string, unknown>
  }
  return refineObject(fields, raw, { aliases }).object
}

export const runners: Record<FixtureComponent, Runner> = {
  summarize: (ondai, onProgress, limit) =>
    runEvals({
      component: 'summarize',
      provider: 'auto',
      fixtures: fixtureSets.summarize,
      limit,
      onProgress,
      run: async (input) => {
        const r = await ondai.resolve('text')
        const res = await generateText({ model: r.adapter.languageModel!(), system: 'Summarize the text as 3 to 5 short bullet points. Start each line with "- ". No preamble.', prompt: input, temperature: 0.2 })
        return res.text
      },
      match: (out, expected) => {
        const missing = expected.filter((k) => !out.toLowerCase().includes(k.toLowerCase()))
        return { pass: missing.length <= Math.floor(expected.length / 3), detail: missing.length ? `missing: ${missing.join(', ')}` : undefined }
      },
    }),
  'smart-input': (ondai, onProgress, limit) =>
    runEvals({
      component: 'smart-input',
      provider: 'auto',
      fixtures: asObjFixtures(fixtureSets['smart-input']),
      limit,
      onProgress,
      run: (input) => structuredRun(ondai, expenseSchema, 'Extract the expense fields from the text and return JSON only. Leave out fields the text does not mention.', input, expenseAliases),
      match: (out: Obj, expected: Obj) => matchers.fields(Object.keys(expected), { tolerance: 0.01, minSimilarity: 0.6 })(out, expected),
    }),
  'auto-tag': (ondai, onProgress, limit) =>
    runEvals({
      component: 'auto-tag',
      provider: 'auto',
      fixtures: fixtureSets['auto-tag'],
      limit,
      onProgress,
      run: async (input) => {
        const r = await ondai.resolve('structured')
        const res = await generateText({ model: r.adapter.languageModel!(), system: `Pick up to 3 tags for the text from this list only: ${noteTags.join(', ')}. Return JSON with a "tags" array.`, prompt: input, output: Output.object({ schema: z.object({ tags: z.array(z.string()) }) }), temperature: 0 })
        return matchEnumList(res.output.tags, noteTags)
      },
      match: (out, expected) => matchers.overlap(1)(out, expected),
    }),
  'natural-filter': (ondai, onProgress, limit) =>
    runEvals({
      component: 'natural-filter',
      provider: 'auto',
      fixtures: asObjFixtures(fixtureSets['natural-filter']),
      limit,
      onProgress,
      run: (input) => structuredRun(ondai, filterSchema, 'Turn the restaurant search request into filters and return JSON only. Only set a field when clearly implied.', input, filterAliases),
      match: (out: Obj, expected: Obj) => matchers.fields(Object.keys(expected), { tolerance: 0.01, minSimilarity: 0.7 })(out, expected),
    }),
  'smart-reply': (ondai, onProgress, limit) =>
    runEvals({
      component: 'smart-reply',
      provider: 'auto',
      fixtures: fixtureSets['smart-reply'],
      limit,
      onProgress,
      run: async (input) => {
        const r = await ondai.resolve('structured')
        const res = await generateText({ model: r.adapter.languageModel!(), system: 'Write 3 different one-sentence replies to the last message from the user\'s point of view. Return JSON with a "replies" array.', prompt: input, output: Output.object({ schema: z.object({ replies: z.array(z.string()).min(1).max(5) }) }), temperature: 0.6 })
        return res.output.replies
      },
      match: (out, expected) => {
        const joined = out.join(' ').toLowerCase()
        const missing = expected.mustMention.filter((m) => !joined.includes(m.toLowerCase()))
        return { pass: out.length >= expected.minReplies && missing.length === 0, detail: missing.length ? `missing: ${missing.join(', ')}` : `${out.length} replies` }
      },
    }),
  'command-bar': (ondai, onProgress, limit) =>
    runEvals({
      component: 'command-bar',
      provider: 'auto',
      fixtures: fixtureSets['command-bar'],
      limit,
      onProgress,
      run: async (input) => {
        const toolsOk = (await ondai.availability('tools')).status === 'ready'
        if (toolsOk) {
          const r = await ondai.resolve('tools')
          const tools = Object.fromEntries(actionIds.map((id) => [id.replace(/[^a-zA-Z0-9_]/g, '_'), tool({ description: actionDescriptions[id], inputSchema: z.object({ argument: z.string().optional() }), execute: async () => 'ok' })]))
          const res = await generateText({ model: r.adapter.languageModel!({ tools }), tools, system: 'You are the command bar of this app. Call exactly one tool that best matches the request.', prompt: input, stopWhen: stepCountIs(2), temperature: 0 })
          const name = res.steps.flatMap((s) => s.toolCalls)[0]?.toolName
          return actionIds.find((id) => id.replace(/[^a-zA-Z0-9_]/g, '_') === name) ?? 'none'
        }
        const r = await ondai.resolve('structured')
        const res = await generateText({ model: r.adapter.languageModel!(), system: `Choose the single best action id for the request and return JSON only. Actions: ${actionIds.map((id) => `${id}: ${actionDescriptions[id]}`).join('; ')}`, prompt: input, output: Output.object({ schema: z.object({ action: z.enum(actionIds) }) }), temperature: 0 })
        return res.output.action
      },
      match: matchers.exact,
    }),
  'scan-to-data': (ondai, onProgress, limit) =>
    runEvals({
      component: 'scan-to-data',
      provider: 'auto',
      fixtures: asObjFixtures(fixtureSets['scan-to-data']),
      limit,
      onProgress,
      run: (input) => structuredRun(ondai, receiptSchema, 'The text is OCR from a receipt. The total is the final amount paid. Extract the fields and return JSON only.', input),
      match: (out: Obj, expected: Obj) => matchers.fields(Object.keys(expected), { tolerance: 0.01, minSimilarity: 0.6 })(out, expected),
    }),
  rewrite: (ondai, onProgress, limit) =>
    runEvals({
      component: 'rewrite',
      provider: 'auto',
      fixtures: fixtureSets.rewrite,
      limit,
      onProgress,
      run: async (input) => {
        const r = await ondai.resolve('text')
        const system = { fix: 'Fix spelling, grammar and punctuation only. Return only the corrected text.', shorten: 'Rewrite the text to be about half as long. Return only the rewritten text.', formal: 'Rewrite the text in a clear, professional tone. Return only the rewritten text.' }[input.mode as 'fix' | 'shorten' | 'formal']
        const res = streamText({ model: r.adapter.languageModel!(), system, prompt: input.text, temperature: 0.2 })
        let out = ''
        for await (const d of res.textStream) out += d
        return { text: out, ratio: out.length / input.text.length }
      },
      match: (out, expected) => {
        const missing = expected.mustContain.filter((m) => !out.text.toLowerCase().includes(m.toLowerCase()))
        return { pass: missing.length === 0 && out.ratio <= expected.maxLengthRatio, detail: `ratio ${out.ratio.toFixed(2)}${missing.length ? `; missing ${missing.join(', ')}` : ''}` }
      },
    }),
}

export async function runAll(ondai: Ondai, onProgress?: (component: string, done: number, total: number) => void, limit?: number): Promise<EvalReport[]> {
  const out: EvalReport[] = []
  for (const [name, runner] of Object.entries(runners)) out.push(await runner(ondai, (d, t) => onProgress?.(name, d, t), limit))
  return out
}
