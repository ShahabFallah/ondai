// Renders assets/brand/og.html to og.png (1200×630) and a GitHub social preview (1280×640).
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const browser = await chromium.launch()
for (const [w, h, out] of [[1200, 630, 'og.png'], [1280, 640, 'github-social-preview.png']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  await page.goto(`file://${root}/assets/brand/og.html`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${root}/assets/brand/${out}` })
  console.log('wrote', out)
}
await browser.close()
