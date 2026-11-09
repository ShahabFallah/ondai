// Site stills: real components composited over the generated photographs on /stills/<scene>, shot at 2x
// in light and dark, then written as WebP to apps/web/public/img/stills/<scene>-<theme>.webp.
// Usage: node scripts/render-stills.mjs [scene ...]   (needs the web app on PLAYWRIGHT_BASE_URL, default :3000, and cwebp)
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const out = resolve(root, 'apps', 'web', 'public', 'img', 'stills')
mkdirSync(out, { recursive: true })

const sizes = { 'nav-ai': [720, 540], 'nav-core': [720, 540], 'nav-all': [720, 540] }
const only = process.argv.slice(2)
const browser = await chromium.launch()
for (const [scene, [width, height]] of Object.entries(sizes)) {
  if (only.length && !only.includes(scene)) continue
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme })
    await page.goto(`${base}/stills/${scene}?theme=${theme}`, { waitUntil: 'load', timeout: 120000 })
    await page.waitForSelector('[data-still-ready="true"]', { timeout: 120000 })
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
    await page.waitForTimeout(400)
    const png = resolve(out, `.${scene}-${theme}.png`)
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width, height } })
    await page.close()
    const webp = resolve(out, `${scene}-${theme}.webp`)
    execFileSync('cwebp', ['-quiet', '-q', '88', '-m', '6', '-sharp_yuv', png, '-o', webp])
    rmSync(png)
    console.log('wrote', `${scene}-${theme}.webp`)
  }
}
await browser.close()
