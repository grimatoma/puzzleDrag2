import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  timeout: 420_000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report/visual", open: "never" }]],
  snapshotPathTemplate: "{testDir}/__goldens__/{projectName}/{arg}{ext}",
  outputDir: "test-results/visual",
  use: {
    baseURL: "http://localhost:5173/puzzleDrag2/",
    trace: "retain-on-failure",
    headless: true,
    browserName: "chromium",
  },
  projects: [
    {
      name: "desktop",
      use: {
        viewport: { width: 1280, height: 1024 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "iphone-landscape",
      use: {
        ...devices["iPhone 13 landscape"],
        browserName: "chromium",
        viewport: { width: 844, height: 390 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "iphone-portrait",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: "node ./node_modules/vite/bin/vite.js",
    url: "http://localhost:5173/puzzleDrag2/",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
