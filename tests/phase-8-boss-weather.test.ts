// Phase 8 — Boss encounters.
// Migrated from src/__tests__/boss-8.1, boss-8.2, boss-8.3, portal-8.6 tests.
// The weather/portal/decoration systems the original phase promised were never
// built; the only surviving unique invariant is that a fresh save starts with
// no active boss. (CLOSE_SEASON reset semantics are covered as a strict
// superset by tests/phase-38-post-calendar-cleanup.ts.)
import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/state.js";

describe("Phase 8 — fresh state boss slot", () => {
  it("fresh state starts with no active boss", () => {
    const s = createInitialState();
    expect(s.boss).toBeNull();
  });
});
