import { expect, test } from '@playwright/test'

/** The review grid: every component's review states in Void and Paper, motion off, manual clock. */
for (const theme of ['void', 'paper'] as const) {
  test(`review grid · ${theme}`, async ({ page }) => {
    await page.goto(`/review?theme=${theme}&motion=off&clock=manual`)
    await page.waitForSelector('[data-ready="true"]', { timeout: 60_000 })
    await page.waitForTimeout(500)
    // Every component's states on one tall page: a full-page capture needs well over the default 5 s.
    await expect(page).toHaveScreenshot(`review-${theme}.png`, { fullPage: true, timeout: 60_000 })
  })
}
