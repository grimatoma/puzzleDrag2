import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js", "src/**/*.test.js"],
    exclude: ["tests/fixtures/**", "node_modules/**", "tests/e2e/**"],
    setupFiles: ["src/__tests__/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/utils.js", "src/state.js", "src/features/**"],
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
    },
  },
});
