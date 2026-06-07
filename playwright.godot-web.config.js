import { defineConfig } from "@playwright/test";

// Dedicated config for the Godot Web (HTML5/WASM) boot smoke. Serves the
// post-export `godot/dist/` via tools/serve-godot-dist.mjs and boots it in
// headless Chromium to prove the engine actually initializes (WASM + pck load,
// the main scene's _ready runs). Mirrors the webServer + baseURL shape of
// playwright.config.js, pointed at the static dist server instead of Vite.
//
// The timeout is generous (120s) because WASM streaming compilation + pck load
// is slow under headless software rendering. The spec itself waits on the
// window.__hearthGodotReady beacon (flipped at the end of Main.gd's _ready).
export default defineConfig({
  testDir: "./tests/godot-web",
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4327/",
    trace: "retain-on-failure",
    headless: true,
    browserName: "chromium",
  },
  projects: [
    {
      name: "chromium",
      use: {
        viewport: { width: 1280, height: 1024 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: "node tools/serve-godot-dist.mjs",
    url: "http://localhost:4327/",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
