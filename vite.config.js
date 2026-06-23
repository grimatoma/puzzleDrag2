import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";
import { seasonalSubjects } from "./tools/vite/seasonalSubjects.mjs";

// Drives Vite's `base` and the PWA service worker's navigation fallback so an
// installed app stays scoped to the deployed sub-path. `/puzzleDrag2/` is the
// GitHub Pages base; CI/forks can override via BASE_PATH.
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
    // Installable PWA: adds a Workbox service worker that precaches the build
    // for offline play. The web app manifest + icons already live in the repo
    // (public/site.webmanifest, public/icon-*.png, favicons — linked from
    // index.html), so `manifest: false` keeps those authoritative and this
    // plugin contributes ONLY the service worker. `prompt` means a freshly
    // deployed SW installs but *waits* instead of silently reloading mid-run;
    // src/appUpdate.ts polls for it, surfaces a "refresh" banner, and applies it
    // via SKIP_WAITING when the player taps Refresh. (Installed PWAs that stay
    // resident rarely re-check on their own, which is how players got stranded
    // on a stale build — the poller fixes that.) Emits sw.js / workbox-*.js /
    // registerSW.js at the dist ROOT (not dist/assets/), so the phase-12-build
    // asset guardrails are unaffected.
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      // Use the hand-authored public/site.webmanifest instead of generating one.
      manifest: false,
      workbox: {
        // Precache the app shell + all game art (incl. the manifest, favicons
        // and app icons) for full offline play. Analyzer report + maps excluded.
        globPatterns: ["**/*.{js,css,html,svg,png,gif,webp,ico,woff,woff2,webmanifest}"],
        globIgnores: ["**/stats.html", "**/*.map"],
        // Phaser's vendor chunk is ~1.5MB raw; lift the 2MB default so it is
        // precached rather than silently skipped (which would break offline).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Offline SPA navigations fall back to the game shell, except the
        // standalone Dev Panel (/b/), Story Editor (/story/) and Docs (/docs/)
        // routes. Those are independent static apps, not game routes: without
        // the denylist a navigation that misses the precache (e.g. a stale
        // refresh) would be served the game shell, which then boots the game
        // *under* the docs path (e.g. /docs/#/town?modal=menu) instead of the
        // docs page.
        navigateFallback: `${BASE}index.html`,
        navigateFallbackDenylist: [
          new RegExp(`^${BASE}b/`),
          new RegExp(`^${BASE}story/`),
          new RegExp(`^${BASE}docs/`),
        ],
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
