import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

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
      output: {
        manualChunks: {
          "vendor/phaser": ["phaser"],
          "vendor/react": ["react", "react-dom"],
        },
      },
    },
  },
});
