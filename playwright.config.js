import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  // Single worker on CI. Every spec boots the whole game (multiple Phaser/WebGL
  // contexts); running specs in parallel starved each other's boot/render and
  // blew the 30s budget (menu / cuj-tools / crafting timed out at boot or on the
  // first interaction). The CI `e2e` job is sharded across 3 runners (see
  // .github/workflows/ci.yml), so serial-within-shard still finishes in a few
  // minutes while removing the boot contention. Local leaves workers at the
  // Playwright default for speed.
  workers: process.env.CI ? 1 : undefined,
  // CI gets 2 retries to absorb residual interaction flake (a slow render
  // occasionally missing the 30s budget) without masking a genuine, reproducible
  // failure (which fails all attempts). Local stays at 0 for fast, honest feedback.
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
    {
      // Desktop layout coverage. The mobile project drives the full suite at
      // 844×390 (touch/isMobile); this project re-runs a small SMOKE subset at a
      // wide desktop viewport (no touch, dsf 1) so the ≥1024px CSS layout branch
      // (the `max-[1024px]` overrides in prototype.tsx flip off here) is actually
      // exercised behaviorally. Scoped via testMatch to a couple of specs so it
      // doesn't 2× the whole suite — smoke covers boot/HUD/nav-presence and menu;
      // navigation covers view/modal routing across the desktop layout.
      name: 'desktop',
      testMatch: /(smoke|navigation)\.spec\.ts$/,
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 1024 },
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
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
