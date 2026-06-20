import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";
import { seasonalSubjects } from "./tools/vite/seasonalSubjects.mjs";

// Same value drives Vite's `base` and the PWA manifest's start_url/scope, so
// an installed app always launches into the deployed sub-path. `/puzzleDrag2/`
// is the GitHub Pages base; CI/forks can override via BASE_PATH.
const BASE = process.env.BASE_PATH || "/puzzleDrag2/";

// Multi-page build:
//   /         → the game (index.html → main.jsx, pulls in Phaser)
//   /b/       → the Dev Panel (b/index.html → src/balanceEntry.jsx)
// Each page builds its own HTML + JS bundle. The Dev Panel bundle is
// independent of Phaser/the game runtime and could be deployed standalone
// (the two apps share state only via localStorage).
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Discover public/seasonal-tiles/<tileKey>/ folders -> `virtual:seasonal-subjects`
    seasonalSubjects(),
    // Pre-compress all JS/CSS assets with gzip and brotli for fast static serving
    compression({ algorithm: "gzip", ext: ".gz" }),
    compression({ algorithm: "brotliCompress", ext: ".br" }),
    // Bundle analyzer: dist/stats.html after every build
    visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true }),
    // Installable PWA: emits manifest.webmanifest + a Workbox service worker
    // that precaches the build for offline play. `autoUpdate` means a new
    // deploy is picked up and applied automatically the next time the player
    // is online — no manual "update available" prompt. Emits sw.js /
    // workbox-*.js / registerSW.js at the dist ROOT (not dist/assets/), so the
    // phase-12-build asset guardrails are unaffected.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Static assets not reachable from the JS import graph that must still be
      // precached (paths are relative to publicDir).
      includeAssets: ["icons/apple-touch-icon.png", "icons/favicon.svg"],
      manifest: {
        name: "Hearthlands",
        short_name: "Hearthlands",
        description: "A cozy drag-to-chain farming and town-building puzzle.",
        lang: "en",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        orientation: "any",
        background_color: "#e9dfc6",
        theme_color: "#e9dfc6",
        // Relative srcs resolve against the manifest URL (…/manifest.webmanifest),
        // so they stay correct regardless of BASE.
        icons: [
          { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/pwa-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the app shell + all game art for full offline play. The
        // analyzer report and sourcemaps are excluded.
        globPatterns: ["**/*.{js,css,html,svg,png,gif,webp,woff,woff2}"],
        globIgnores: ["**/stats.html", "**/*.map"],
        // Phaser's vendor chunk is ~1.5MB raw; lift the 2MB default so it is
        // precached rather than silently skipped (which would break offline).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Offline SPA navigations fall back to the game shell, except the
        // standalone Dev Panel (/b/) and Story Editor (/story/) routes.
        navigateFallback: `${BASE}index.html`,
        navigateFallbackDenylist: [new RegExp(`^${BASE}b/`), new RegExp(`^${BASE}story/`)],
      },
      // Keep the service worker out of the dev server to avoid stale-cache
      // surprises while developing; it only activates in production builds.
      devOptions: { enabled: false },
    }),
  ],
  base: BASE,
  build: {
    // Minify production builds (`vite build`) to shrink the shipped JS. Dev
    // (`vite serve`) stays unminified + sourcemapped so the Dev Panel's
    // Animations-Demo bridge and other dev tooling remain readable.
    minify: command === "build",
    sourcemap: command !== "build",
    rollupOptions: {
      // Keep the main entry keyed `index` so its chunk lands as `index-*.js`
      // (preserves the existing build-test guardrails that look it up by name).
      input: {
        index: resolve(__dirname, "index.html"),
        balance: resolve(__dirname, "b/index.html"),
        story: resolve(__dirname, "story/index.html"),
      },
      output: {
        // Function form so Rollup doesn't pre-create a chunk for phaser
        // when an entry never imports it (the Dev Panel's bundle).
        // The object form pulled phaser into the shared chunk's interop
        // helpers and made `/b/` fetch all 1.4MB of phaser at load.
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) return "vendor/phaser";
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")
              || id.includes("node_modules/scheduler")) return "vendor/react";
        },
      },
    },
  },
}));
