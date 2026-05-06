import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || "/puzzleDrag2/",
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
    setupFiles: ["src/__tests__/setup.js"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
