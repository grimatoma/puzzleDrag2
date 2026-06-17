import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";
import { seasonalSubjects } from "./tools/vite/seasonalSubjects.mjs";

// Multi-page build:
//   /         → the game (index.html → main.jsx, pulls in Phaser)
//   /b/       → the Dev Panel (b/index.html → src/balanceEntry.jsx)
//   /story/   → the Story Tree Editor (story/index.html)
// Each page builds its own HTML + JS bundle. The Dev Panel bundle is
// independent of Phaser/the game runtime and could be deployed standalone
// (the two apps share state only via localStorage).
//
// Two deploy targets from the SAME (production) build, selected by DEV_DEPLOY:
//   • prod (default) → minified, base /puzzleDrag2/,     outDir dist/
//   • dev (DEV_DEPLOY=1) → UNMINIFIED, base /puzzleDrag2/dev/, outDir dist/dev/
// Both are *production* builds (import.meta.env.DEV === false) so runtime
// behaviour is identical — the dev target only drops minification so the
// shipped bundles stay readable for debugging in a live environment.
// `npm run build` emits both into a single dist/ tree (prod at the root, dev
// under dist/dev/) so the existing GitHub Pages deploy ships them together.
export default defineConfig(() => {
  const devDeploy = process.env.DEV_DEPLOY === "1" || process.env.DEV_DEPLOY === "true";
  const outDir = devDeploy ? "dist/dev" : "dist";
  const base = process.env.BASE_PATH || (devDeploy ? "/puzzleDrag2/dev/" : "/puzzleDrag2/");

  return {
    plugins: [
      react(),
      // Discover public/seasonal-tiles/<tileKey>/ folders -> `virtual:seasonal-subjects`
      seasonalSubjects(),
      // Pre-compress all JS/CSS assets with gzip and brotli for fast static serving
      compression({ algorithm: "gzip", ext: ".gz" }),
      compression({ algorithm: "brotliCompress", ext: ".br" }),
      // Bundle analyzer: <outDir>/stats.html after every build
      visualizer({ filename: `${outDir}/stats.html`, gzipSize: true, brotliSize: true }),
    ],
    base,
    build: {
      outDir,
      // Prod target ships minified JS (phaser ~1.4MB instead of ~7MB raw); the
      // dev target keeps it readable. Sourcemaps are emitted for both as
      // separate .map files — browsers only fetch them when DevTools is open,
      // so they add no runtime cost for players.
      minify: devDeploy ? false : "esbuild",
      sourcemap: true,
      // dist/ (prod) is built first by `npm run build`, then dist/dev/ — each
      // build only empties its own outDir, so the dev pass never wipes prod.
      emptyOutDir: true,
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
  };
});
