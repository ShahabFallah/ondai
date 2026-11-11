// The product film for the top of the README (and the site): a phone rises, the on-device models' marks
// orbit it, four real components work on its screen, and it ends on the wordmark.
//
//   node scripts/record-film.mjs [--theme light|dark] [--keep]
//
// Needs the web app on PLAYWRIGHT_BASE_URL (default :3000). Opens /stills/film?theme=<t>&manual=1 (the
// scene itself is apps/web/app/stills/film/Film.tsx), waits until its four playground embeds are loaded,
// starts a CDP Page.startScreencast, starts the film's clock and records it in real time. ffmpeg assembles
// the frames on their timestamps (like scripts/loops.mjs) and fades the end card back to the first frame,
// so the loop is seamless. Writes, per theme, into assets/film/:
//   ondai-film-<theme>.mp4         1920 × 1080, H.264, yuv420p, faststart
//   ondai-film-<theme>.gif         960 wide, 20 fps, for the GitHub README (kept under GIF_LIMIT)
//   ondai-film-<theme>-poster.jpg  1920 × 1080, one frame from the agent shot
/* global window */
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const outDir = resolve(root, 'assets', 'film')
const tmpRoot = process.env.FILM_TMP ?? join(tmpdir(), 'ondai-film')
const ffmpeg = process.env.FFMPEG ?? '/opt/homebrew/bin/ffmpeg'

const args = process.argv.slice(2)
const flag = (k) => {
  const i = args.indexOf(k)
  return i >= 0 ? args.splice(i, 2)[1] : undefined
}
const themeArg = flag('--theme')
const keep = args.includes('--keep')

const VIEW = { width: 1920, height: 1080 }
const FADE = 0.6 // s, end card back to the first frame
const POSTER_AT = 7.15 // s: the agent waiting on its approval card
const GIF = { width: 960, fps: 20 }
const GIF_LIMIT = 8 * 1024 * 1024
const THEMES = ['light', 'dark'].filter((t) => !themeArg || t === themeArg)

mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] })

for (const theme of THEMES) {
  const dir = join(tmpRoot, theme)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  // Warm the route and the four embeds once, so the recorded load is from cache.
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const url = `${base}/stills/film?theme=${theme}&manual=1`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 })
  await page.waitForFunction(() => window.__filmReady === true, null, { timeout: 180000 })
  await page.reload({ waitUntil: 'networkidle', timeout: 180000 })
  await page.waitForFunction(() => window.__filmReady === true, null, { timeout: 180000 })
  await page.waitForTimeout(1200)
  const length = await page.evaluate(() => window.__filmLength)

  const cdp = await ctx.newCDPSession(page)
  const frames = []
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`)
    writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, ts: metadata.timestamp })
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: VIEW.width, maxHeight: VIEW.height, everyNthFrame: 1 })
  await page.waitForTimeout(500)
  const startMs = await page.evaluate(() => window.__filmStart())
  await page.waitForTimeout(length * 1000 + 300)
  await cdp.send('Page.stopScreencast')
  await ctx.close()

  const start = startMs / 1000
  const end = start + length
  // The frame showing at the start (the last one before it), then every frame up to the end.
  const before = frames.filter((f) => f.ts <= start).at(-1)
  const used = [...(before ? [{ ...before, ts: start }] : []), ...frames.filter((f) => f.ts > start && f.ts < end)]
  if (used.length < 30) throw new Error(`only ${used.length} frames for ${theme}`)
  const lines = []
  for (let i = 0; i < used.length; i++) {
    const next = i + 1 < used.length ? used[i + 1].ts : end
    lines.push(`file '${used[i].file}'`, `duration ${Math.max(1 / 120, next - used[i].ts).toFixed(4)}`)
  }
  lines.push(`file '${used.at(-1).file}'`)
  writeFileSync(join(dir, 'list.txt'), lines.join('\n'))
  const gaps = used.slice(1).map((f, i) => f.ts - used[i].ts)
  console.log(`${theme}: ${used.length} frames over ${length}s (avg ${(used.length / length).toFixed(1)} fps, worst gap ${(Math.max(...gaps) * 1000).toFixed(0)} ms)`)

  // 1. MP4: 30 fps on the real timestamps, then the end card fades back to the opening frame.
  const fit = `scale=${VIEW.width}:${VIEW.height}:flags=lanczos,fps=30,format=yuv420p`
  const vf = `[0:v]${fit},setpts=PTS-STARTPTS[a];[1:v]${fit},setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=${FADE}:offset=${(length - FADE).toFixed(3)}[v]`
  const mp4 = resolve(outDir, `ondai-film-${theme}.mp4`)
  execFileSync(ffmpeg, [
    '-loglevel', 'error', '-y',
    '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
    '-loop', '1', '-t', String(FADE + 0.1), '-i', used[0].file,
    '-filter_complex', vf, '-map', '[v]',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-tune', 'film', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    mp4,
  ])

  // 2. Poster.
  const poster = resolve(outDir, `ondai-film-${theme}-poster.jpg`)
  execFileSync(ffmpeg, ['-loglevel', 'error', '-y', '-ss', String(POSTER_AT), '-i', mp4, '-frames:v', '1', '-q:v', '2', poster])

  // 3. GIF: one palette for the whole film (diff-weighted), ordered dither so still areas stay still between
  // frames, only changed rectangles re-encoded. Steps down if it comes out over the limit.
  const gif = resolve(outDir, `ondai-film-${theme}.gif`)
  const tries = [
    { colors: 192, bayer: 4 },
    { colors: 128, bayer: 4 },
    { colors: 128, bayer: 3, fps: 18 },
    { colors: 96, bayer: 3, fps: 16 },
  ]
  for (const t of tries) {
    const fps = t.fps ?? GIF.fps
    const pre = `fps=${fps},scale=${GIF.width}:-1:flags=lanczos`
    execFileSync(ffmpeg, [
      '-loglevel', 'error', '-y', '-i', mp4,
      '-filter_complex', `[0:v]${pre},split[a][b];[a]palettegen=max_colors=${t.colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=${t.bayer}:diff_mode=rectangle`,
      '-loop', '0', gif,
    ])
    const size = statSync(gif).size
    console.log(`  gif ${t.colors} colours, bayer ${t.bayer}, ${fps} fps: ${(size / 1024 / 1024).toFixed(2)} MB`)
    if (size <= GIF_LIMIT) break
  }

  if (!keep) rmSync(dir, { recursive: true, force: true })
  const mb = (f) => `${(statSync(f).size / 1024 / 1024).toFixed(2)} MB`
  console.log(`wrote ${theme}: mp4 ${mb(mp4)}, gif ${mb(gif)}, poster ${mb(poster)}`)
}
await browser.close()
