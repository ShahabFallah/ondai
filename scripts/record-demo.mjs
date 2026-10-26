// Records the CommandBar flow in the web playground (mock provider) to WebM, then MP4 + GIF via Playwright's ffmpeg.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { readdirSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'assets', 'recordings')
mkdirSync(out, { recursive: true })
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const size = { width: 420, height: 560 }
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: size, deviceScaleFactor: 2, recordVideo: { dir: out, size: { width: size.width * 2, height: size.height * 2 } } })
const page = await context.newPage()
// idle → typed query → thinking → tool preview, all on the scripted mock
await page.goto(`${base}/playground/command-bar?embed=1&presentation=sheet&frame=none&state=idle`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-ready="true"]')
await page.waitForTimeout(1200)
const input = page.getByLabel('Command input')
await input.click()
await input.pressSequentially('remind me to buy milk tomorrow', { delay: 55 })
await page.waitForTimeout(600)
await page.goto(`${base}/playground/command-bar?embed=1&presentation=sheet&frame=none&state=tool`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-ready="true"]')
await page.waitForTimeout(3600)
await context.close()
await browser.close()
const webm = readdirSync(out).find((f) => f.endsWith('.webm'))
renameSync(resolve(out, webm), resolve(out, 'command-bar-web.webm'))
const ffmpegDir = readdirSync(resolve(homedir(), 'Library/Caches/ms-playwright')).find((d) => d.startsWith('ffmpeg'))
const ffmpeg = resolve(homedir(), 'Library/Caches/ms-playwright', ffmpegDir, readdirSync(resolve(homedir(), 'Library/Caches/ms-playwright', ffmpegDir)).find((f) => f.startsWith('ffmpeg')))
if (existsSync(ffmpeg)) {
  execFileSync(ffmpeg, ['-y', '-i', resolve(out, 'command-bar-web.webm'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', resolve(out, 'command-bar-web.mp4')], { stdio: 'ignore' })
  execFileSync(ffmpeg, ['-y', '-i', resolve(out, 'command-bar-web.webm'), '-vf', 'fps=15,scale=420:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5', '-loop', '0', resolve(out, 'command-bar-web.gif')], { stdio: 'ignore' })
  console.log('wrote command-bar-web.webm / .mp4 / .gif')
} else console.log('ffmpeg not found; wrote command-bar-web.webm only')
