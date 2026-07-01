// tests/smoke-invariants.test.ts — shape check for the in-game smoke shim.
// SMOKE_INVARIANTS runs at scene init via runSelfTests() as a lightweight
// (<50ms) console check; this test guards its shape so the shim can't silently
// rot. (Extracted from the retired tests/phase-12-infra.test.ts.)
import { describe, it, expect } from "vitest";

describe("SMOKE_INVARIANTS", () => {
  it(
    "exposes a SMOKE_INVARIANTS list for the in-game shim",
    { timeout: 20_000 },
    async () => {
      const mod = await import("../src/smokeTests.js");
      expect(Array.isArray(mod.SMOKE_INVARIANTS)).toBe(true);
      expect(mod.SMOKE_INVARIANTS.length).toBeGreaterThanOrEqual(5);
      for (const inv of mod.SMOKE_INVARIANTS) {
        expect(typeof inv.name).toBe("string");
        expect(typeof inv.check).toBe("function");
      }
    },
  );
});
