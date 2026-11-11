// Link previews (Open Graph). Renders /stills/og/<name> (apps/web/app/stills/og) at 1200×630, 2x, into
// apps/web/public/og/<name>.jpg: `site` for the site and the repository, one per AI component.
//
//   node scripts/render-og.mjs [name ...]
//
// Needs the web app on PLAYWRIGHT_BASE_URL (default :3000). Also writes assets/brand/github-social-preview.png
// (upload it in the repository settings: Social preview).
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const out = resolve(root, 'apps', 'web', 'public', 'og')
mkdirSync(out, { recursive: true })

const registry = JSON.parse(readFileSync(resolve(root, 'registry', 'registry.json'), 'utf8'))
const ai = registry.items.filter((i) => !(i.categories ?? []).some((c) => c === 'primitive' || c === 'fx')).map((i) => i.name)
const only = process.argv.slice(2)
const names = ['site', ...ai].filter((n) => !only.length || only.includes(n))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2, colorScheme: 'light' })
for (const name of names) {
  await page.goto(`${base}/stills/og/${name}`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r))))))
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 90 })
  if (name === 'site') await page.screenshot({ path: resolve(root, 'assets', 'brand', 'github-social-preview.png') })
  console.log('wrote', `og/${name}.jpg`)
}
await browser.close()
