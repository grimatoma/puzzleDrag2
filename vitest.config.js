import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { seasonalSubjects } from "./tools/vite/seasonalSubjects.mjs";

export default defineConfig({
  plugins: [react(), seasonalSubjects()],
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.js",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "src/**/*.test.js",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    exclude: ["tests/fixtures/**", "node_modules/**", "tests/e2e/**"],
    setupFiles: ["src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "src/utils.ts",
        "src/state.ts",
        "src/features/**",
        // Highest-risk logic dirs — core game rules, reducer helpers, and
        // balance config — now measured by the gate (health review #6). These
        // already sit comfortably above threshold; including them stops future
        // regressions in the riskiest code from sliding past the coverage gate.
        "src/game/**",
        "src/state/**",
        "src/config/**",
        // Central data/logic modules the gate was blind to (health review §4):
        // the resource/zone data table, the story engine, market pricing, and
        // the router's known-views/modals map. Regressions here (a dangling
        // resource key, a broken beat trigger, a bad price, an unroutable view)
        // now count against the gate instead of sliding past it.
        "src/constants.ts",
        "src/story.ts",
        "src/market.ts",
        "src/router.ts",
      ],
      // Spec scopes the gate to logic; React UI components and slice glue
      // for unrendered/legacy panels aren't part of the 70% target. Non-code
      // files (docs/schemas co-located under the included dirs) are excluded so
      // the V8 provider doesn't try to parse them as JS. The cartography slice
      // is a live, wired feature (biome-entry gating) so it is NO LONGER
      // excluded (health review §4); townsfolk stays out — it's a thin .tsx
      // re-export already caught by the blanket jsx/tsx exclude.
      exclude: ["**/*.{jsx,tsx}", "**/*.md", "**/*.json", "src/features/townsfolk/**"],
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
    },
  },
});
