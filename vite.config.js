import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

// Multi-page build:
//   /         → the game (index.html → main.jsx, pulls in Phaser)
//   /b/       → the Balance Manager (b/index.html → src/balanceEntry.jsx)
// Each page builds its own HTML + JS bundle. The Balance Manager bundle is
// independent of Phaser/the game runtime and could be deployed standalone
// (the two apps share state only via localStorage).
export default defineConfig({
  plugins: [
    react(),
    // Pre-compress all JS/CSS assets with gzip and brotli for fast static serving
    compression({ algorithm: "gzip", ext: ".gz" }),
    compression({ algorithm: "brotliCompress", ext: ".br" }),
    // Bundle analyzer: dist/stats.html after every build
    visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true }),
  ],
  base: process.env.BASE_PATH || "/puzzleDrag2/",
  build: {
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
        // when an entry never imports it (the Balance Manager's bundle).
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
