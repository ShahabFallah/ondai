// Stageshow pictures for the site, built on /stills/stage/<shot> (apps/web/components/stage/shots) and shot at 2x.
//   hero, hero-sm   transparent PNGs (omitBackground, real alpha), palette-quantised with sharp:
//                   public/img/stills/<shot>-<light|dark>.png
//   docs-*          4:3 pictures for the Docs menu, on their own ground, designed at 360 x 270 and shot at 4x
//                   (1440 x 1080, like the nav stills), as WebP (cwebp -q 88):
//                   public/img/stills/<shot>-<light|dark>.webp
// Usage: node scripts/render-hero.mjs [shot ...]   (needs the web app on PLAYWRIGHT_BASE_URL, default :3000)
import { chromium } from 'playwright'
import sharp from 'sharp'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const out = resolve(root, 'apps', 'web', 'public', 'img', 'stills')
mkdirSync(out, { recursive: true })

const sizes = {
  hero: [1040, 810],
  'hero-sm': [390, 720],
  ...Object.fromEntries(['installation', 'how-it-works', 'core', 'providers', 'theming', 'device-support'].map((d) => [`docs-${d}`, [360, 270]])),
}
const only = process.argv.slice(2)
const browser = await chromium.launch()
for (const [shot, [width, height]] of Object.entries(sizes)) {
  if (only.length && !only.includes(shot)) continue
  const transparent = shot.startsWith('hero')
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: transparent ? 2 : 4, colorScheme: theme })
    await page.goto(`${base}/stills/stage/${shot}?theme=${theme}`, { waitUntil: 'load', timeout: 120000 })
    await page.waitForSelector('[data-shot-ready="true"]', { timeout: 120000 })
    await page.waitForTimeout(500)
    const raw = resolve(out, `.${shot}-${theme}.raw.png`)
    await page.screenshot({ path: raw, clip: { x: 0, y: 0, width, height }, omitBackground: transparent })
    await page.close()
    if (transparent) {
      const png = resolve(out, `${shot}-${theme}.png`)
      await sharp(raw).png({ palette: true, quality: 92, effort: 10, dither: 0.6, compressionLevel: 9 }).toFile(png)
      console.log('wrote', `${shot}-${theme}.png`, `${Math.round(statSync(png).size / 1024)} KB`)
    } else {
      const webp = resolve(out, `${shot}-${theme}.webp`)
      execFileSync('cwebp', ['-quiet', '-q', '88', '-m', '6', '-sharp_yuv', raw, '-o', webp])
      console.log('wrote', `${shot}-${theme}.webp`, `${Math.round(statSync(webp).size / 1024)} KB`)
    }
    rmSync(raw)
  }
}
await browser.close()
