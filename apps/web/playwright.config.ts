import { defineConfig, devices } from '@playwright/test'

/**
 * Visual regression against the local playground. Baselines are generated on macOS Chromium;
 * CI runs the same suite on a macOS runner so anti-aliasing matches (see docs/RUNNING.md).
 */
export default defineConfig({
  testDir: './tests/visual',
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.003, animations: 'disabled' } },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    ...devices['Desktop Chrome'],
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: 'pnpm dev', url: 'http://localhost:3000/review?component=key-hint', reuseExistingServer: true, timeout: 180_000 },
})
