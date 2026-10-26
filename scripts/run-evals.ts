/** Runs the eval fixtures in Node against the scripted mock (CI smoke) and writes a report to evals/results/. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createOndai } from '@ondai/core/headless'
import { mockAdapter, mockScript } from '@ondai/core/mock'
import { runAll } from '../evals/runners'

const adapter = mockAdapter({ script: (call) => (call.responseFormat?.type === 'json' ? mockScript.object({}) : mockScript.text('')) })
const ondai = createOndai({ providers: { mock: adapter }, policy: { order: ['mock'] } })
const reports = await runAll(ondai, (c, d, t) => process.stdout.write(`\r${c} ${d}/${t}   `))
const dir = resolve(import.meta.dirname, '..', 'evals', 'results')
mkdirSync(dir, { recursive: true })
const file = join(dir, `mock-${new Date().toISOString().slice(0, 10)}.json`)
writeFileSync(file, JSON.stringify(reports, null, 2))
console.log(`\nwrote ${file}`)
for (const r of reports) console.log(`${r.component.padEnd(16)} ${r.passed}/${r.total}`)
