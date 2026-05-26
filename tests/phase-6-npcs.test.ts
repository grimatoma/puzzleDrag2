// Phase 6 — NPC bonds, gifts, dialog.
// Migrated from npc-6.1, npc-6.2, npc-6.3 tests.
import { describe, it, expect } from "vitest";
import { gainBond, decayBond, payOrder } from "../src/features/npcs/bond.js";
import { createInitialState, rootReducer } from "../src/state.js";

describe("Phase 6 — bond math", () => {
  it("gainBond increases bond", () => {
    const next = gainBond(5, 0.3);
    expect(next).toBeCloseTo(5.3, 5);
  });

  it("gainBond caps at 10", () => {
    const next = gainBond(9.9, 0.5);
    expect(next).toBeLessThanOrEqual(10);
  });

  it("decayBond above 5 decreases toward 5", () => {
    const next = decayBond(7);
    expect(next).toBeLessThan(7);
    expect(next).toBeGreaterThanOrEqual(5);
  });

  it("decayBond at exactly 5 stays 5", () => {
    expect(decayBond(5)).toBe(5);
  });

  it("decayBond below 5 stays put (no upward drift)", () => {
    const v = decayBond(3);
    expect(v).toBeLessThanOrEqual(5);
  });
});

describe("Phase 6 — payOrder bond modifier", () => {
  it("neutral bond (5) pays base reward", () => {
    const paid = payOrder({ baseReward: 100 }, 5);
    expect(paid).toBe(100);
  });

  it("high bond (8) pays more than base", () => {
    const paid = payOrder({ baseReward: 100 }, 8);
    expect(paid).toBeGreaterThan(100);
  });
});

describe("Phase 6 — fresh state NPC bonds", () => {
  it("fresh state has bond 5 for wren", () => {
    const s = createInitialState();
    expect(s.npcs.bonds.wren).toBe(5);
  });

  it("fresh state has bonds for all 5 NPCs", () => {
    const s = createInitialState();
    for (const npc of ["wren", "mira", "tomas", "bram", "liss"]) {
      expect(s.npcs.bonds[npc]).toBe(5);
    }
  });

  it("CLOSE_SEASON decays bonds above 5", () => {
    const s = { ...createInitialState(), npcs: { ...createInitialState().npcs, bonds: { wren: 8, mira: 5, tomas: 5, bram: 5, liss: 5 } } };
    const next = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(next.npcs.bonds.wren).toBeLessThan(8);
  });
});
