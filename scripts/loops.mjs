// Short looping videos of the AI components at work, in the site's default variant (bevel). The docs
// sidebar's hover card and the landing page's component wall play them; the WebP thumbs are their posters.
//
//   node scripts/loops.mjs [name ...] [--theme light|dark] [--keep]
//
// Needs the web app on PLAYWRIGHT_BASE_URL (default :3000). Each loop opens `/playground/<name>?embed=1`
// on the real clock with motion on, so the scripted mock plays the component from the start (thinking,
// streaming, the answer). The frame is measured on the settled state like scripts/thumbs.mjs (the
// component's painted bounds plus a margin, square), the screen is recorded with CDP Page.startScreencast,
// and ffmpeg assembles the frames on their real timestamps, holds the end, and fades back to the first
// frame so the loop is seamless.
// Writes apps/web/public/loops/{light,dark}/<name>.mp4 (H.264, SIZE x SIZE, no audio).
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const outDir = resolve(root, 'apps', 'web', 'public', 'loops')
const tmpRoot = process.env.LOOPS_TMP ?? join(tmpdir(), 'ondai-loops')
const ffmpeg = process.env.FFMPEG ?? '/opt/homebrew/bin/ffmpeg'
const index = JSON.parse(readFileSync(resolve(root, 'registry', 'registry.json'), 'utf8'))

const args = process.argv.slice(2)
const flag = (k) => {
  const i = args.indexOf(k)
  return i >= 0 ? args.splice(i, 2)[1] : undefined
}
const themeArg = flag('--theme')
const keep = args.includes('--keep')
const only = args.filter((a) => !a.startsWith('--'))

const VARIANT = 'bevel'
const SIZE = 640 // output px, square
const SCALE = 2 // the page is zoomed this much (CDP screencasts at 1 frame px per css px, whatever the device scale)
const MIN_FRAME = 240 * SCALE // px
const TPS = 12 // mock tokens per second: slow enough to watch the answer arrive
const HOLD = 1.2 // s on the finished state before fading back
const FADE = 0.45 // s
const VIEW = { width: 1100 * SCALE, height: 1300 * SCALE }
const THEMES = [
  { dir: 'light', theme: 'paper', bg: '#EDEDEF' },
  { dir: 'dark', theme: 'void', bg: '#111114' },
].filter((t) => !themeArg || t.dir === themeArg)

// Which state plays the component at work from the start (default `done`), and how long it runs (ms).
const stateFor = {
  'smart-input': 'filled',
  'semantic-search': 'results',
  'prompt-composer': 'busy',
  chat: 'streaming',
  'assistant-message': 'done',
  'inline-suggest': 'suggesting',
  'voice-memo': 'done',
  'tool-confirm-card': 'running',
  'agent-run': 'running',
  'scan-to-data': 'done',
  'photo-caption': 'done',
  'text-to-event': 'done',
  'tone-check': 'suggesting',
}
const runFor = { 'agent-run': 6500, chat: 6000, 'assistant-message': 6000, summarize: 5500, rewrite: 5000, translate: 5000, 'ask-page': 6000, 'voice-memo': 6000 }
const DEFAULT_RUN = 4500
// Components driven by props alone have no scripted run: play their states in turn instead ([state, ms]).
const sequenceFor = {
  'assistant-message': [['thinking', 1000], ['tool', 1400], ['streaming', 900], ['done', 2400]],
  'prompt-composer': [['empty', 900], ['typed', 1200], ['busy', 1600], ['attachments', 1800]],
}

const isAi = (item) => !(item.categories ?? []).some((c) => c === 'primitive' || c === 'fx')
const items = index.items.filter((item) => isAi(item) && (!only.length || only.includes(item.name)))

const urlFor = (name, theme) => {
  const item = index.items.find((i) => i.name === name)
  const runsOn = item?.meta?.ondai?.runsOn
  const qs = new URLSearchParams({ embed: '1', accent: 'mono', theme, variant: VARIANT, ...(runsOn?.length && !runsOn.includes('apple') && runsOn.includes('nano') ? { device: 'nano' } : {}), motion: 'system', clock: 'real', tps: String(TPS), state: sequenceFor[name]?.[0][0] ?? stateFor[name] ?? 'done' })
  return `${base}/playground/${name}?${qs}`
}
const css = (bg) => `
  html { zoom: ${SCALE}; }
  html, body { background: ${bg} !important; overflow: hidden !important; }
  nextjs-portal { display: none !important; }
  [data-embed] > div > section { padding: 320px 0 !important; }
  [data-embed] > div > section > div { background: transparent !important; box-shadow: none !important; outline: none !important; border-color: transparent !important; }
  [data-testid='playground-frame'] { background: transparent !important; }
  /* Screencast only sends a frame when something repaints; this keeps it at the display rate. */
  body::after { content: ''; position: fixed; left: 0; top: 0; width: 2px; height: 2px; background: currentColor; opacity: 0.002; animation: loops-tick 1s linear infinite; }
  @keyframes loops-tick { from { transform: translateX(0); } to { transform: translateX(1px); } }
`

// Same measure as scripts/thumbs.mjs: the union of everything that paints, in page css px.
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
  return { x: x0 + scrollX, y: y0 + scrollY, w: x1 - x0, h: y1 - y0 }
}

// The page's own CSS, in before first paint.
function injectCss(c) {
  const add = () => {
    const s = document.createElement('style')
    s.textContent = c
    document.head.appendChild(s)
  }
  if (document.head) add()
  else document.addEventListener('DOMContentLoaded', add)
}

async function ready(page, name) {
  try {
    await page.waitForSelector('[data-ready="true"]', { timeout: 60000 })
  } catch {
    console.log('  (ready timeout)', name)
  }
}

const browser = await chromium.launch()
for (const t of THEMES) mkdirSync(resolve(outDir, t.dir), { recursive: true })

for (const item of items) {
  const seq = sequenceFor[item.name]
  const run = seq ? seq.reduce((n, [, ms]) => n + ms, 0) : runFor[item.name] ?? DEFAULT_RUN
  for (const t of THEMES) {
    const url = urlFor(item.name, t.theme)

    // 1. Frame: measured once the run has settled, so the finished state fits.
    const measurer = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1 })
    await measurer.addInitScript(injectCss, css(t.bg))
    await measurer.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    await ready(measurer, item.name)
    let box
    if (seq) {
      // A sequence: the union of every state's bounds.
      for (const [i, [state, ms]] of seq.entries()) {
        if (i) await measurer.evaluate((value) => window.postMessage({ type: 'ondai:state', value }, location.origin), state)
        await measurer.waitForTimeout(ms)
        const b = await measurer.evaluate(measure)
        if (!b) continue
        if (!box) box = b
        else {
          const x = Math.min(box.x, b.x), y = Math.min(box.y, b.y)
          box = { x, y, w: Math.max(box.x + box.w, b.x + b.w) - x, h: Math.max(box.y + box.h, b.y + b.h) - y }
        }
      }
    } else {
      await measurer.waitForTimeout(run)
      box = await measurer.evaluate(measure)
    }
    await measurer.close()
    if (!box) {
      console.log('  (no stage)', item.name)
      continue
    }
    const pad = Math.max(28, Math.max(box.w, box.h) * 0.1)
    const side = Math.max(MIN_FRAME, Math.max(box.w, box.h) + pad * 2)
    const clip = { x: Math.max(0, box.x + box.w / 2 - side / 2), y: Math.max(0, box.y + box.h / 2 - side / 2), side }

    // 2. Record: the screencast runs from before navigation; frames before the component is ready are dropped.
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    await page.addInitScript(injectCss, css(t.bg))
    const cdp = await ctx.newCDPSession(page)
    const dir = join(tmpRoot, `${item.name}-${t.dir}`)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    const frames = []
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const file = join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`)
      writeFileSync(file, Buffer.from(data, 'base64'))
      frames.push({ file, ts: metadata.timestamp })
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
    })
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEW.width, maxHeight: VIEW.height, everyNthFrame: 1 })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await ready(page, item.name)
    const startTs = Date.now() / 1000
    if (seq) {
      for (const [i, [state, ms]] of seq.entries()) {
        if (i) await page.evaluate((value) => window.postMessage({ type: 'ondai:state', value }, location.origin), state)
        await page.waitForTimeout(ms)
      }
    } else await page.waitForTimeout(run)
    await cdp.send('Page.stopScreencast')
    await ctx.close()

    const used = frames.filter((f) => f.ts >= startTs - 0.05)
    if (used.length < 2) {
      console.log('  (no frames)', item.name, t.dir)
      continue
    }
    // 3. Assemble on real timestamps, hold the end, fade back to the first frame.
    const lines = []
    for (let i = 0; i < used.length; i++) {
      const next = i + 1 < used.length ? used[i + 1].ts : used[i].ts + HOLD
      lines.push(`file '${used[i].file}'`, `duration ${Math.max(1 / 60, next - used[i].ts).toFixed(4)}`)
    }
    lines.push(`file '${used.at(-1).file}'`)
    writeFileSync(join(dir, 'list.txt'), lines.join('\n'))
    const length = used.at(-1).ts + HOLD - used[0].ts
    const cx = Math.round(clip.x), cy = Math.round(clip.y), cs = Math.round(clip.side)
    const fit = `crop=${cs}:${cs}:${cx}:${cy},scale=${SIZE}:${SIZE}:flags=lanczos,fps=30,format=yuv420p`
    const vf = `[0:v]${fit},setpts=PTS-STARTPTS[a];[1:v]${fit},setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=${FADE}:offset=${(length - FADE).toFixed(3)}[v]`
    const out = resolve(outDir, t.dir, `${item.name}.mp4`)
    execFileSync(ffmpeg, [
      '-loglevel', 'error', '-y',
      '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
      '-loop', '1', '-t', String(FADE + 0.1), '-i', used[0].file,
      '-filter_complex', vf, '-map', '[v]',
      '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
      out,
    ])
    if (!keep) rmSync(dir, { recursive: true, force: true })
    console.log('wrote', `${t.dir}/${item.name}.mp4`, `${(statSync(out).size / 1024).toFixed(0)} KB`, `${length.toFixed(1)}s`, `(${Math.round(clip.side / SCALE)}px frame)`)
  }
}
await browser.close()
