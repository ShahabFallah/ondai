// Design-review contact sheets: one PNG per component with every review state in Void and Paper.
import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const out = resolve(root, 'docs', 'design-review')
mkdirSync(out, { recursive: true })
const index = JSON.parse(readFileSync(resolve(root, 'registry', 'registry.json'), 'utf8'))
const only = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 })
for (const item of index.items) {
  if (only.length && !only.includes(item.name)) continue
  await page.goto(`${base}/review?component=${item.name}&motion=off&clock=manual`, { waitUntil: 'networkidle', timeout: 120000 })
  try { await page.waitForSelector('[data-ready="true"]', { timeout: 60000 }) } catch { console.log('  (ready timeout)', item.name) }
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/${item.name}.png`, fullPage: true })
  console.log('wrote', `${item.name}.png`)
}
await browser.close()
