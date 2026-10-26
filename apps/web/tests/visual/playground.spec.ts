import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface Item { name: string }
const index = JSON.parse(readFileSync(join(process.cwd(), 'public', 'r', 'registry.json'), 'utf8')) as { items: Item[] }

/** One embedded screenshot per component × review state, read from the component's own playground definition. */
for (const item of index.items) {
  test.describe(item.name, () => {
    test(`review states`, async ({ page }) => {
      await page.goto(`/playground/${item.name}?embed=1&motion=off&clock=manual`)
      await page.waitForSelector('[data-ready="true"]', { timeout: 60_000 })
      const states = await page.evaluate(() => (window as unknown as { __ondaiPlayground?: { review: string[]; freeze: Record<string, number> } }).__ondaiPlayground)
      expect(states?.review?.length).toBeGreaterThan(0)
      for (const state of states!.review) {
        const t = states!.freeze[state] ?? 0
        await page.goto(`/playground/${item.name}?embed=1&motion=off&clock=manual&state=${state}&t=${t}`)
        await page.waitForSelector('[data-ready="true"]', { timeout: 60_000 })
        await page.waitForTimeout(300)
        const frame = page.locator('[data-testid="playground-frame"]').first()
        await expect(frame).toHaveScreenshot(`${item.name}-${state}.png`)
      }
    })
  })
}
