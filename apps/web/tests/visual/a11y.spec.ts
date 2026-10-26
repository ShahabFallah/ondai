import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/** axe on the review grid and the flagship playground page. Serious/critical issues fail the run. */
for (const url of ['/review?theme=void&motion=off&clock=manual', '/playground/command-bar?state=idle&motion=off']) {
  test(`axe · ${url}`, async ({ page }) => {
    await page.goto(url)
    await page.waitForSelector('[data-ready="true"]', { timeout: 60_000 })
    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} nodes · ${v.help}`)).toEqual([])
  })
}
