import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

// Multi-page build:
//   /         → the game (index.html → main.jsx, pulls in Phaser)
//   /b/       → the Dev Panel (b/index.html → src/balanceEntry.jsx)
// Each page builds its own HTML + JS bundle. The Dev Panel bundle is
// independent of Phaser/the game runtime and could be deployed standalone
// (the two apps share state only via localStorage).
export default defineConfig({
  plugins: [
    react(),
    // Installable PWA + offline support. registerType:"prompt" → the app shows
    // an in-app "new version — reload" toast (src/pwa/UpdatePrompt.tsx) instead
    // of silently swapping the cached build out from under the player.
    // devOptions.enabled:false → the dev server never registers a service
    // worker, so `npm run dev` is always fresh (no stale cache, no incognito).
    VitePWA({
      registerType: "prompt",
      injectRegister: false, // registered explicitly via useRegisterSW in React
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Hearthlands",
        short_name: "Hearthlands",
        description: "A cozy drag-chain puzzle settlement builder.",
        theme_color: "#e9dfc6",
        background_color: "#e9dfc6",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the app shell (content-hashed by Vite, so each deploy busts
        // cleanly). Art/audio are runtime-cached on demand below rather than
        // bloating the install.
        globPatterns: ["**/*.{js,css,html}", "favicon.svg", "pwa-192.png", "pwa-512.png", "pwa-maskable-512.png", "apple-touch-icon.png"],
        globIgnores: ["**/stats.html", "**/*.map"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // unminified phaser vendor chunk (~7 MB; build has minify:false)
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Don't SPA-fallback the dev tools or any file-looking request.
        navigateFallbackDenylist: [/\/b\//, /\/story\//, /stats\.html$/, /\/[^/?]+\.[^/?]+$/],
        runtimeCaching: [
          {
            urlPattern: ({ sameOrigin, request }) =>
              sameOrigin && ["image", "audio", "font"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "hearth-runtime",
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
    // Pre-compress all JS/CSS assets with gzip and brotli for fast static serving
    compression({ algorithm: "gzip", ext: ".gz" }),
    compression({ algorithm: "brotliCompress", ext: ".br" }),
    // Bundle analyzer: dist/stats.html after every build
    visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true }),
  ],
  base: process.env.BASE_PATH || "/puzzleDrag2/",
  build: {
    minify: false,
    sourcemap: true,
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
});
