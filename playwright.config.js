import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
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
