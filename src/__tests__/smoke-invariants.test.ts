// Promote SMOKE_INVARIANTS (previously only logged to the browser console
// at game init via runSelfTests) into a CI-gated vitest suite. Each
// invariant becomes its own test so the report shows the failing one.
import { describe, it, expect, beforeEach } from "vitest";
import { SMOKE_INVARIANTS } from "../smokeTests.js";

describe("smoke invariants", () => {
  beforeEach(() => global.localStorage.clear());

  for (const inv of SMOKE_INVARIANTS) {
    it(inv.name, () => {
      expect(inv.check()).toBe(true);
    });
  }
});
