// Component renders on the mock, one per registry component.
//
//   node scripts/thumbs.mjs [name ...]          light + dark WebP, the docs index hover card
//                                               -> apps/web/public/thumbs/{light,dark}/<name>.webp
//   node scripts/thumbs.mjs --png [name ...]    the original dark PNGs (960x600, the nav menu)
//                                               -> apps/web/public/thumbs/<name>.png
//
// Needs the web app on PLAYWRIGHT_BASE_URL (default :3000). Renders `/playground/<name>?embed=1` with the
// monochrome accent and a frozen clock. The WebP set is square (SIZE x SIZE px): the script measures the
// component's painted bounds, frames them with a margin so nothing is cut, and picks the device scale
// factor so that frame lands on SIZE pixels exactly (2x or more for every component, no resampling).
// The background is flat and matches the card the docs index draws it on (components/docs/docs.css).
import { chromium } from 'playwright'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const outDir = resolve(root, 'apps', 'web', 'public', 'thumbs')
const index = JSON.parse(readFileSync(resolve(root, 'registry', 'registry.json'), 'utf8'))
const args = process.argv.slice(2)
const legacy = args.includes('--png')
const only = args.filter((a) => !a.startsWith('--'))

// States that read best as a still (default state otherwise).
const stateFor = { 'model-download': 'preparing', sheet: 'open', 'on-device-badge': 'thinking', 'ion-border': 'beam', 'thinking-indicator': 'thinking', 'voice-input': 'listening', 'agent-avatar': 'idle', 'image-reveal': 'half', 'scan-to-data': 'done', 'command-bar': 'idle', chat: 'done', 'assistant-message': 'done', 'prompt-composer': 'attachments', 'agent-run': 'idle', 'inline-suggest': 'suggesting', 'voice-memo': 'done', 'border-beam': 'working', 'liquid-metal': 'working', 'bot-avatar': 'family' }
const queryFor = { 'thinking-indicator': 'variant=orb&size=lg', 'model-download': 't=2400' }
// The WebP set (docs index) prefers finished states and the plain chip bot, and keeps to black and white.
const webpStateFor = { ...stateFor, 'agent-run': 'running', 'auto-tag': 'done', 'smart-reply': 'done', 'semantic-search': 'results', summarize: 'done', 'streaming-text': 'streaming', 'smart-input': 'filled', rewrite: 'done', 'bot-avatar': 'idle' }
const webpQueryFor = { ...queryFor, 'bot-avatar': 'type=chip&size=128', summarize: 'motion=system&clock=real', rewrite: 'motion=system&clock=real', 'streaming-text': 'motion=system&clock=real' }
// Streamed states run on the real clock; wait for the stream to finish (ms).
const settleFor = { summarize: 6000, rewrite: 6000, 'streaming-text': 6000 }
// The sample picture in ImageReveal is coloured; the docs index is monochrome.
const filterFor = { 'image-reveal': 'grayscale(1)' }

const items = index.items.filter((item) => !only.length || only.includes(item.name))
const urlFor = (name, extra = {}, states = stateFor, queries = queryFor) => {
  const qs = new URLSearchParams({ embed: '1', motion: 'off', clock: 'manual', t: '1200', ...extra })
  if (queries[name]) for (const [k, v] of new URLSearchParams(queries[name])) qs.set(k, v)
  if (states[name]) qs.set('state', states[name])
  return `${base}/playground/${name}?${qs}`
}
async function open(page, url, name) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
  try {
    await page.waitForSelector('[data-ready="true"]', { timeout: 60000 })
  } catch {
    console.log('  (ready timeout)', name)
  }
  await page.waitForTimeout(400)
}

const browser = await chromium.launch()

if (legacy) {
  mkdirSync(outDir, { recursive: true })
  const W = 480, H = 300
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
  for (const item of items) {
    await open(page, urlFor(item.name), item.name)
    await page.addStyleTag({ content: 'html,body{background:#0E1013 !important;overflow:hidden} nextjs-portal{display:none !important} [data-embed] > div > section{align-items:center;min-height:100vh}' })
    await page.waitForTimeout(100)
    await page.screenshot({ path: `${outDir}/${item.name}.png`, clip: { x: 0, y: 0, width: W, height: H } })
    console.log('wrote', `${item.name}.png`)
  }
  await browser.close()
  process.exit(0)
}

const SIZE = 800 // output px, square
const MIN_FRAME = 240 // css px: the smallest frame, so tiny parts are not blown past 3.3x
const QUALITY = 0.9
// Flat grounds, kept in step with .docs-index-card in components/docs/docs.css.
const THEMES = [
  { dir: 'light', theme: 'paper', bg: '#EDEDEF' },
  { dir: 'dark', theme: 'void', bg: '#111114' },
]
const VIEW = { width: 1100, height: 1300 }
const css = (bg, filter = '') => `
  html, body { background: ${bg} !important; overflow: hidden !important; }
  nextjs-portal { display: none !important; }
  [data-embed] > div > section { padding: 320px 0 !important; }
  [data-embed] > div > section > div { background: transparent !important; box-shadow: none !important; outline: none !important; border-color: transparent !important; }
  [data-testid='playground-frame'] { background: transparent !important; }
  ${filter ? `[data-embed] > div > section > div { filter: ${filter}; }` : ''}
`

// Union of everything that paints: text, media, and boxes with a fill, border or shadow that are not the
// stage itself. Returns css px in page coordinates.
function measure() {
  const stage = document.querySelector('[data-embed] section > div')
  if (!stage) return null
  const sr = stage.getBoundingClientRect()
  const stageArea = sr.width * sr.height
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const add = (r) => {
    if (r.width < 1 || r.height < 1) return
    x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom)
  }
  const visible = (el) => {
    const s = getComputedStyle(el)
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.02
  }
  const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim() || !n.parentElement || !visible(n.parentElement)) continue
    const range = document.createRange()
    range.selectNodeContents(n)
    for (const r of range.getClientRects()) add(r)
  }
  for (const el of stage.querySelectorAll('*')) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width * r.height >= stageArea * 0.92) continue
    const tag = el.tagName.toLowerCase()
    if (tag === 'svg' || tag === 'img' || tag === 'canvas' || tag === 'video') { add(r); continue }
    const s = getComputedStyle(el)
    const fill = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent'
    const image = s.backgroundImage !== 'none'
    const border = ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(s[`border${side}Width`]) > 0 && !s[`border${side}Color`].endsWith(', 0)'))
    if (fill || image || border || s.boxShadow !== 'none') add(r)
  }
  if (!Number.isFinite(x0)) return { x: sr.left, y: sr.top, w: sr.width, h: sr.height }
  // Whole stage painted (a full-screen demo): keep its rounded edge in frame.
  return { x: x0 + scrollX, y: y0 + scrollY, w: x1 - x0, h: y1 - y0 }
}

const measurer = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1 })
const encoder = await browser.newPage()
for (const t of THEMES) mkdirSync(resolve(outDir, t.dir), { recursive: true })

for (const item of items) {
  for (const t of THEMES) {
    // AI components in the site's default variant; core UI keeps its own default.
    const variant = (item.categories ?? []).some((c) => c === 'primitive' || c === 'fx') ? {} : { variant: 'bevel' }
    const runsOn = item.meta?.ondai?.runsOn
    if (runsOn?.length && !runsOn.includes('apple') && runsOn.includes('nano')) variant.device = 'nano'
    const url = urlFor(item.name, { theme: t.theme, accent: 'mono', ...variant }, webpStateFor, webpQueryFor)
    await open(measurer, url, item.name)
    await measurer.addStyleTag({ content: css(t.bg, filterFor[item.name]) })
    await measurer.waitForTimeout(150 + (settleFor[item.name] ?? 0))
    const box = await measurer.evaluate(measure)
    if (!box) {
      console.log('  (no stage)', item.name)
      continue
    }
    const pad = Math.max(28, Math.max(box.w, box.h) * 0.1)
    const side = Math.max(MIN_FRAME, Math.max(box.w, box.h) + pad * 2)
    const clip = { x: box.x + box.w / 2 - side / 2, y: box.y + box.h / 2 - side / 2, width: side, height: side }

    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SIZE / side })
    const page = await ctx.newPage()
    await open(page, url, item.name)
    await page.addStyleTag({ content: css(t.bg, filterFor[item.name]) })
    await page.waitForTimeout(150 + (settleFor[item.name] ?? 0))
    const png = await page.screenshot({ clip, type: 'png' })
    await ctx.close()

    const dataUrl = await encoder.evaluate(
      async ({ b64, size, q }) => {
        const img = new Image()
        img.src = `data:image/png;base64,${b64}`
        await img.decode()
        const c = document.createElement('canvas')
        c.width = size
        c.height = size
        const g = c.getContext('2d')
        g.imageSmoothingQuality = 'high'
        g.drawImage(img, 0, 0, size, size)
        return c.toDataURL('image/webp', q)
      },
      { b64: png.toString('base64'), size: SIZE, q: QUALITY },
    )
    const file = resolve(outDir, t.dir, `${item.name}.webp`)
    writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
    console.log('wrote', `${t.dir}/${item.name}.webp`, `(${Math.round(side)}px frame, ${(SIZE / side).toFixed(2)}x)`)
  }
}
await browser.close()
