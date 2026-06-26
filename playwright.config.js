import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  // CI gets 2 retries: these specs drive real clicks through the React → Phaser
  // bridge under 2-worker contention, so a slow boot/render can intermittently
  // blow the 30s budget (e.g. menu.spec's multi-tab journey). Retries absorb that
  // interaction flake without masking a genuine, reproducible failure (which fails
  // all attempts). Local stays at 0 for fast, honest feedback.
  retries: process.env.CI ? 2 : 0,
  // `list` for live CI logs; `html` (never auto-open) writes a browsable report
  // to playwright-report/ that the CI `e2e` job uploads as an artifact on failure.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173/puzzleDrag2/',
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'iphone-landscape',
      use: {
        ...devices['iPhone 13 landscape'],
        // Override to Chromium so we only need the chromium browser installed
        browserName: 'chromium',
        viewport: { width: 844, height: 390 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: 'node ./node_modules/vite/bin/vite.js',
    url: 'http://localhost:5173/puzzleDrag2/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
