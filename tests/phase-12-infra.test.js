// tests/phase-12-infra.test.js — meta-test for the runner itself.
import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 12.1 — test runner", () => {
  it("exposes Vitest globals", () => {
    expect(typeof describe).toBe("function");
    expect(typeof it).toBe("function");
    expect(typeof expect).toBe("function");
  });

  it("has a test file per phase 0..11", () => {
    const files = readdirSync(resolve(process.cwd(), "tests"))
      .filter(f => f.endsWith(".test.js"));
    for (let n = 0; n <= 11; n++) {
      const found = files.some(f => f.startsWith(`phase-${n}-`));
      expect(found, `expected tests/phase-${n}-*.test.js`).toBe(true);
    }
  });

  it("rejects test files that violate the naming convention", () => {
    const re = /^phase-\d+-[a-z0-9-]+\.test\.js$/;
    const files = readdirSync(resolve(process.cwd(), "tests"))
      .filter(f => f.endsWith(".test.js"));
    for (const f of files) expect(f, `bad name: ${f}`).toMatch(re);
  });

  it("exposes a SMOKE_INVARIANTS list for the in-game shim", async () => {
    const mod = await import("../src/smokeTests.js");
    expect(Array.isArray(mod.SMOKE_INVARIANTS)).toBe(true);
    expect(mod.SMOKE_INVARIANTS.length).toBeGreaterThanOrEqual(5);
    for (const inv of mod.SMOKE_INVARIANTS) {
      expect(typeof inv.name).toBe("string");
      expect(typeof inv.check).toBe("function");
    }
  });
});
