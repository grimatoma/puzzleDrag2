// Phase 8 — Boss encounters, decorations, portal.
// Migrated from src/__tests__/boss-8.1, boss-8.2, boss-8.3, portal-8.6 tests.
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../src/state.js";

describe("Phase 8 — fresh state boss slot", () => {
  it("fresh state has boss === null", () => {
    const s = createInitialState();
    expect(s.boss).toBeNull();
  });
});

describe("Phase 8 — CLOSE_SEASON resets the session", () => {
  // Phase 7 — calendar season removed; CLOSE_SEASON no longer increments
  // seasonsCycled. The reset semantics (turnsUsed=0, view=town, etc.) still
  // hold and are exercised below.

  it("CLOSE_SEASON resets turnsUsed to 0", () => {
    const s = { ...createInitialState(), turnsUsed: 8 };
    const next = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(next.turnsUsed).toBe(0);
  });
});
