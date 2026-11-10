import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/** axe on the review grid and the flagship component's embed (the standalone playground page now redirects to the docs). Serious/critical issues fail the run. */
for (const url of ['/review?theme=void&motion=off&clock=manual', '/playground/command-bar?embed=1&state=idle&motion=off']) {
  test(`axe · ${url}`, async ({ page }) => {
    await page.goto(url)
    await page.waitForSelector('[data-ready="true"]', { timeout: 60_000 })
    await page.waitForTimeout(500)
    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} nodes · ${v.help} · ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)).toEqual([])
  })
}
