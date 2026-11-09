// The landing page reels: real components on the scripted mock, typed into like a person would, with a
// camera that pushes in on the input while typing and eases out to the answer.
//
//   node scripts/record-reels.mjs [name ...] [--theme light|dark] [--keep]
//
// Needs the web app on PLAYWRIGHT_BASE_URL (default :3000). Each reel opens /capture/<name>?theme=..&w=..
// (apps/web/app/capture), drives it, and records the screen at 2x with CDP Page.startScreencast (JPEG q95).
// Frames are assembled with ffmpeg on their real timestamps, then the content dips out and the first
// frame fades back in, so the loop is seamless. Writes apps/web/public/reels/<name>-<theme>.{mp4,webm,jpg} (the jpg is the first frame, the poster)
// and <name>-<theme>-still.jpg (the answer, shown instead of the video under reduced motion).
// --keep leaves the JPEG frames in $REELS_TMP (default: the OS temp dir) for inspection.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const outDir = resolve(root, 'apps', 'web', 'public', 'reels')
const tmpRoot = process.env.REELS_TMP ?? join(tmpdir(), 'ondai-reels')
const ffmpeg = process.env.FFMPEG ?? '/opt/homebrew/bin/ffmpeg'
const FPS = 30

const args = process.argv.slice(2)
const flag = (k) => {
  const i = args.indexOf(k)
  return i >= 0 ? args.splice(i, 2)[1] : undefined
}
const themeArg = flag('--theme')
const keep = args.includes('--keep')
const only = args.filter((a) => !a.startsWith('--'))
const themes = themeArg ? [themeArg] : ['light', 'dark']

// A seeded random, so every take types with the same rhythm.
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** Driving helpers handed to each reel. */
function director(page) {
  const rand = rng(7)
  const cam = {
    focus: (selector, opts) => page.evaluate(([a, b]) => window.__reel.focus(a, b), [selector, opts]),
    to: (c, ms) => page.evaluate(([a, b]) => window.__reel.to(a, b), [c, ms]),
    reset: (ms) => page.evaluate((m) => window.__reel.reset(m), ms),
    fade: (o, ms) => page.evaluate(([a, b]) => window.__reel.fade(a, b), [o, ms]),
  }
  return {
    page,
    cam,
    wait: (ms) => page.waitForTimeout(ms),
    /** Types like a quick typist: 25-55 ms a key, a beat after a word, a longer one after a comma. */
    async type(text, speed = 1) {
      for (const ch of text) {
        await page.keyboard.type(ch)
        let d = 24 + rand() * 30
        if (ch === ' ') d += 14 + rand() * 26
        if (/[,.?]/.test(ch)) d += 80
        if (rand() < 0.04) d += 90
        await page.waitForTimeout(d * speed)
      }
    },
    /** Focuses a field without a visible mouse (there is none in a headless capture). */
    focusInput: (selector) => page.locator(selector).first().focus(),
    /** Moves a scripted reel on (a message arrives). */
    cue: () => page.evaluate(() => window.dispatchEvent(new Event('reel:next'))),
    click: (selector) => page.locator(selector).first().click(),
    waitFor: (selector, timeout = 15000) => page.waitForSelector(selector, { timeout }),
    waitText: (text, timeout = 15000) => page.getByText(text, { exact: false }).first().waitFor({ timeout }),
  }
}

// Each reel: the capture viewport (CSS px, the card's aspect), the component column width, the device
// scale (so the frame lands near twice its size on the page), and the take.
const COL = '[data-capture-col]'
// Pacing: the action starts at once (the poster is the empty first frame, so a slow start reads as a still),
// typing is brisk, camera moves are 0.5-0.7 s, holds are just long enough to read. The page plays them at
// 1.15x on top (components/home/ReelVideo.tsx).
const reels = {
  'command-bar': {
    size: [600, 375],
    w: 430,
    scale: 2.6,
    async run(d) {
      const push = d.cam.focus(`${COL} input`, { fill: 0.94, max: 1.32, ms: 650 })
      await d.focusInput(`${COL} input`)
      await d.wait(220)
      await d.type('Remind me to call Sam tomorrow')
      await d.wait(220)
      await push
      await d.page.keyboard.press('Enter')
      await d.cam.focus(`${COL} input`, { s: 1.08, ms: 600, y: 0.24 })
      await d.waitText('Call Sam · tomorrow')
      await d.cam.focus(COL, { fill: 0.9, fillH: 0.62, max: 1.3, ms: 600 })
      await d.wait(1100)
    },
  },
  'smart-reply': {
    size: [380, 484],
    w: 330,
    scale: 2,
    async run(d) {
      await d.wait(150)
      await d.cue()
      await d.cam.focus(COL, { fill: 0.96, fillH: 0.9, max: 1.12, ms: 550 })
      await d.waitText('Sure. What time')
      await d.cam.focus('[data-testid="reel-replies"]', { fill: 0.96, max: 1.16, ms: 600, y: 0.58 })
      await d.wait(650)
      await d.click("text=Yes, I'll bring it. A ride would be great, thanks!")
      await d.wait(120)
      await d.cam.reset(650)
      await d.wait(1000)
    },
  },
  'auto-tag': {
    size: [380, 444],
    w: 330,
    scale: 2,
    async run(d) {
      const push = d.cam.focus(`${COL} textarea`, { fill: 0.96, max: 1.14, ms: 600, y: 0.42 })
      await d.focusInput(`${COL} textarea`)
      await d.wait(200)
      await d.type('Train to Lyon for the workshop,')
      await d.wait(560)
      await d.type(' expense the tickets.')
      await push
      await d.wait(520)
      await d.cam.focus('[data-testid="reel-tags"]', { fill: 0.96, max: 1.2, ms: 550, y: 0.56 })
      await d.click('[aria-label="Add tag travel"]')
      await d.wait(200)
      await d.click('[aria-label="Add tag work"]')
      await d.wait(200)
      await d.click('[aria-label="Add tag finance"]')
      await d.wait(900)
    },
  },
  rewrite: {
    size: [640, 366],
    w: 440,
    scale: 2.4,
    async run(d) {
      const push = d.cam.focus(`${COL} textarea`, { fill: 0.92, max: 1.3, ms: 650, y: 0.45 })
      await d.focusInput(`${COL} textarea`)
      await d.wait(200)
      await d.type('got ur budget. marketing looks low, talk tmrw?')
      await push
      await d.wait(180)
      void d.cam.reset(450)
      await d.wait(180)
      await d.click('text=Formal')
      // Pull back so the whole answer card fits as it streams in (the column is centred in the frame).
      await d.cam.to({ s: 0.88, x: 640 * 0.06, y: -4 }, 600)
      await d.waitText('Use this')
      await d.wait(900)
      await d.click('text=Use this')
      await d.wait(100)
      await d.cam.focus(`${COL} textarea`, { fill: 0.9, max: 1.2, ms: 600, y: 0.42 })
      await d.wait(500)
    },
  },
  'smart-input': {
    size: [480, 416],
    w: 380,
    scale: 2,
    async run(d) {
      const push = d.cam.focus(`${COL} input`, { fill: 0.94, max: 1.2, ms: 650 })
      await d.focusInput(`${COL} input`)
      await d.wait(200)
      await d.type('Lunch with Sam at Nopa, 24 dollars')
      await push
      await d.wait(200)
      await d.page.keyboard.press('Enter')
      await d.cam.reset(600)
      await d.waitText('Merchant')
      await d.wait(150)
      await d.cam.focus(COL, { fill: 0.9, fillH: 0.88, max: 1.12, ms: 600 })
      await d.wait(1200)
    },
  },
  'natural-filter': {
    size: [600, 350],
    w: 420,
    scale: 2.4,
    async run(d) {
      const push = d.cam.focus(`${COL} input`, { fill: 0.92, max: 1.3, ms: 650, y: 0.4 })
      await d.focusInput(`${COL} input`)
      await d.wait(200)
      await d.type('cheap italian open now within 2 km')
      await push
      await d.wait(200)
      await d.page.keyboard.press('Enter')
      await d.cam.reset(600)
      await d.waitText('Within 2 km')
      await d.wait(100)
      await d.cam.focus(COL, { fill: 0.92, fillH: 0.9, max: 1.14, ms: 600 })
      await d.wait(1200)
    },
  },
}

async function record(browser, name, theme) {
  const reel = reels[name]
  const [W, H] = reel.size
  const SCALE = reel.scale ?? 2
  // Output size, even on both sides for yuv420p.
  const OW = Math.round((W * SCALE) / 2) * 2
  const OH = Math.round((H * SCALE) / 2) * 2
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, colorScheme: theme, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  page.on('pageerror', (e) => console.log(`  [${name}] pageerror: ${e.message}`))
  await page.goto(`${base}/capture/${name}?theme=${theme}&w=${reel.w}`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForSelector('[data-ready="true"]', { timeout: 60000 })
  await page.waitForFunction(() => window.__reel)
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
  // Let fonts and the first entrance settle before the take.
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(900)
  // The stage before the take (the poster and the loop's first frame) is the empty component.

  const dir = join(tmpRoot, `${name}-${theme}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const frames = []
  const cdp = await context.newCDPSession(page)
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`)
    frames.push({ file, ts: metadata.timestamp })
    writeFileSync(file, Buffer.from(data, 'base64'))
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: OW, maxHeight: OH, everyNthFrame: 1 })
  // Nudge a repaint so the first frame arrives even on a still screen.
  await page.evaluate(() => window.__reel.to({}, 0))
  await page.waitForTimeout(100)
  const t0 = Date.now()
  const d = director(page)
  await reel.run(d)
  // The loop: the answer dips out to the empty stage, and the encoder fades the first frame back in.
  await d.cam.fade(0, 320)
  await d.wait(60)
  const wall = (Date.now() - t0) / 1000
  await cdp.send('Page.stopScreencast')
  await page.waitForTimeout(150)
  await context.close()

  // Concat list on real timestamps; the last frame holds until the take ended.
  const start = frames[0].ts
  const lines = []
  for (let i = 0; i < frames.length; i++) {
    const next = i + 1 < frames.length ? frames[i + 1].ts : start + wall
    lines.push(`file '${frames[i].file}'`, `duration ${Math.max(0.001, next - frames[i].ts).toFixed(4)}`)
  }
  lines.push(`file '${frames.at(-1).file}'`)
  writeFileSync(join(dir, 'list.txt'), lines.join('\n'))
  const span = frames.at(-1).ts - start
  console.log(`  ${name}-${theme}: ${frames.length} frames over ${span.toFixed(2)}s (${(frames.length / span).toFixed(1)} fps captured), take ${wall.toFixed(2)}s`)

  // Master: constant 30 fps, then a 0.5 s fade back into the first frame for the loop.
  const master = join(dir, 'master.mp4')
  const fade = 0.35
  const tail = 0.15
  const vf = `[0:v]fps=${FPS},scale=${OW}:${OH}:flags=lanczos,hue=s=0,format=yuv420p,settb=1/${FPS},setpts=N/${FPS}/TB,tpad=stop_mode=clone:stop_duration=${fade + 0.1}[a];[1:v]fps=${FPS},scale=${OW}:${OH}:flags=lanczos,hue=s=0,format=yuv420p,settb=1/${FPS},setpts=N/${FPS}/TB[b];[a][b]xfade=transition=fade:duration=${fade}:offset=${wall.toFixed(3)}[v]`
  execFileSync(ffmpeg, ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'), '-loop', '1', '-t', String(tail + fade), '-i', frames[0].file, '-filter_complex', vf, '-map', '[v]', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-r', String(FPS), master])

  mkdirSync(outDir, { recursive: true })
  const out = join(outDir, `${name}-${theme}`)
  execFileSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', master, '-c:v', 'libx264', '-crf', '20', '-preset', 'veryslow', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', `${out}.mp4`])
  execFileSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', master, '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', '-an', `${out}.webm`])
  execFileSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', master, '-frames:v', '1', '-q:v', '2', `${out}.jpg`])
  // The answer as a still, for visitors who ask for reduced motion (just before the loop dips out).
  execFileSync(ffmpeg, ['-loglevel', 'error', '-y', '-ss', (wall - 0.75).toFixed(2), '-i', master, '-frames:v', '1', '-q:v', '2', `${out}-still.jpg`])
  const kb = (f) => (statSync(f).size / 1024).toFixed(0)
  console.log(`    -> ${name}-${theme}.mp4 ${kb(`${out}.mp4`)} KB, .webm ${kb(`${out}.webm`)} KB, .jpg ${kb(`${out}.jpg`)} KB`)
  if (!keep) rmSync(dir, { recursive: true, force: true })
}

const browser = await chromium.launch()
for (const name of Object.keys(reels).filter((n) => !only.length || only.includes(n))) {
  for (const theme of themes) await record(browser, name, theme)
}
await browser.close()
