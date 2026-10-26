// Records the CommandBar flow in the web playground (scripted mock): a WebM via Playwright's recorder
// and a GIF encoded from screenshot frames (no system ffmpeg needed).
import { chromium } from 'playwright'
import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifenc
import pngjs from 'pngjs'
const { PNG } = pngjs
import { readdirSync, renameSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'assets', 'recordings')
mkdirSync(out, { recursive: true })
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const size = { width: 420, height: 520 }
const url = (state) => `${base}/playground/command-bar?embed=1&presentation=sheet&frame=none&state=${state}`

async function flow(page, onFrame) {
  await page.goto(url('idle'), { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-ready="true"]')
  await onFrame(900)
  const input = page.getByLabel('Command input')
  await input.click()
  for (const ch of 'remind me to buy milk tomorrow') {
    await input.press(ch === ' ' ? 'Space' : ch)
    await onFrame(70)
  }
  await onFrame(500)
  await page.goto(url('thinking'), { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-ready="true"]')
  await onFrame(1400)
  await page.goto(url('tool'), { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-ready="true"]')
  await onFrame(2600)
}

const browser = await chromium.launch()
// 1) WebM through the built-in recorder
{
  for (const f of readdirSync(out)) if (f.endsWith('.webm')) rmSync(resolve(out, f))
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 2, recordVideo: { dir: out, size: { width: size.width * 2, height: size.height * 2 } } })
  const page = await context.newPage()
  await flow(page, (ms) => page.waitForTimeout(ms))
  await context.close()
  const webm = readdirSync(out).find((f) => f.endsWith('.webm'))
  renameSync(resolve(out, webm), resolve(out, 'command-bar-web.webm'))
}
// 2) GIF from frames (~10 fps)
{
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const frames = []
  const capture = async (ms) => {
    const n = Math.max(1, Math.round(ms / 100))
    for (let i = 0; i < n; i++) {
      frames.push({ png: await page.screenshot({ type: 'png' }), delay: 100 })
      await page.waitForTimeout(100)
    }
  }
  await flow(page, capture)
  await context.close()
  const gif = GIFEncoder()
  for (const f of frames) {
    const { width, height, data } = PNG.sync.read(f.png)
    const palette = quantize(data, 128)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, width, height, { palette, delay: f.delay })
  }
  gif.finish()
  writeFileSync(resolve(out, 'command-bar-web.gif'), gif.bytes())
  console.log(`wrote command-bar-web.webm and command-bar-web.gif (${frames.length} frames)`)
}
await browser.close()
