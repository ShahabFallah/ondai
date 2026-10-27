// Menu thumbnails: one PNG per component, a real render of its default state on the mock.
// Usage: node scripts/thumbs.mjs [name ...]   (needs the web app on PLAYWRIGHT_BASE_URL, default :3000)
import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const out = resolve(root, 'apps', 'web', 'public', 'thumbs')
mkdirSync(out, { recursive: true })
const index = JSON.parse(readFileSync(resolve(root, 'registry', 'registry.json'), 'utf8'))
const only = process.argv.slice(2)
// States that read best as a still (default state otherwise).
const stateFor = { 'model-download': 'preparing', sheet: 'open', 'on-device-badge': 'thinking', 'ion-border': 'beam', 'thinking-indicator': 'thinking', 'voice-input': 'listening', 'agent-avatar': 'idle', 'image-reveal': 'half', 'scan-to-data': 'done', 'command-bar': 'idle' }
const queryFor = { 'thinking-indicator': 'variant=orb&size=lg', 'model-download': 't=2400' }
const browser = await chromium.launch()
const W = 480, H = 300
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
for (const item of index.items) {
  if (only.length && !only.includes(item.name)) continue
  const state = stateFor[item.name] ?? ''
  const qs = new URLSearchParams({ embed: '1', motion: 'off', clock: 'manual', t: '1200' })
  if (queryFor[item.name]) for (const [k, v] of new URLSearchParams(queryFor[item.name])) qs.set(k, v)
  if (state) qs.set('state', state)
  await page.goto(`${base}/playground/${item.name}?${qs}`, { waitUntil: 'networkidle', timeout: 120000 })
  try { await page.waitForSelector('[data-ready="true"]', { timeout: 60000 }) } catch { console.log('  (ready timeout)', item.name) }
  await page.waitForTimeout(300)
  await page.addStyleTag({ content: 'html,body{background:#0E1013 !important;overflow:hidden} nextjs-portal{display:none !important} [data-embed] > div > section{align-items:center;min-height:100vh}' })
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${out}/${item.name}.png`, clip: { x: 0, y: 0, width: W, height: H } })
  console.log('wrote', `${item.name}.png`)
}
await browser.close()
