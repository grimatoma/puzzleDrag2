import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Isolated config so the config-doc generator runs under vitest's module loader
// in the SAME environment as the real test suite (react plugin transform +
// localStorage mock), which resolves the constants↔balance↔tileCollection import
// cycle that plain esbuild / vite SSR cannot — while `include` stays scoped to the
// generator so this never joins the normal suite.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tools/config-doc/*.gen.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
    testTimeout: 30000,
  },
});
