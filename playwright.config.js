import { defineConfig, devices } from '@playwright/test';

const host = '127.0.0.1';
const port = 5173;
const baseURL = `http://${host}:${port}/puzzleDrag2/`;
const viteCommand = `VITE_E2E=1 "${process.execPath}" ./node_modules/vite/bin/vite.js --host ${host} --port ${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        viewport: { width: 1280, height: 900 },
      },
    },
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
    command: viteCommand,
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    timeout: 60_000,
  },
});
