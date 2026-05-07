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
      // Spec scopes the gate to logic; React UI components and slice glue
      // for unrendered/legacy panels aren't part of the 70% target.
      exclude: ["**/*.jsx", "src/features/cartography/**", "src/features/townsfolk/**"],
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
    },
  },
});
