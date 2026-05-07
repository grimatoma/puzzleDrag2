import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";

describe("Phase 5.3 — SET_ACTIVE_TILE toggle", () => {
  const base = initialState();
  // Pre-discover meadow_grass and wheat for replacement tests.
  // Mark tutorial as seen so it doesn't auto-start on the first dispatch
  // and break strict same-reference assertions.
  const seeded = {
    ...base,
    tutorial: { ...(base.tutorial ?? {}), seen: true, active: false },
    tileCollection: {
      ...base.tileCollection,
      discovered: { ...base.tileCollection.discovered, meadow_grass: true, wheat: true },
    },
  };

  it("A: replace within category — singleton invariant", () => {
    const a1 = rootReducer(seeded, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: "meadow_grass" },
    });
    expect(a1.tileCollection.activeByCategory.grass).toBe("meadow_grass");
    expect(a1.tileCollection.activeByCategory.wood).toBe("log");
    expect(a1.tileCollection.activeByCategory.berry).toBe("berry");
  });

  it("toggle back to hay — slot still holds exactly one id", () => {
    const a1 = rootReducer(seeded, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: "meadow_grass" },
    });
    const a2 = rootReducer(a1, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: "hay" },
    });
    expect(a2.tileCollection.activeByCategory.grass).toBe("hay");
  });

  it("B: null clears the slot", () => {
    const b1 = rootReducer(seeded, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: null },
    });
    expect(b1.tileCollection.activeByCategory.grass).toBeNull();
  });

  it("C: undiscovered tile type → strict no-op (same ref)", () => {
    const c1 = rootReducer(seeded, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: "spiky_grass" },
    });
    expect(c1).toBe(seeded);
  });

  it("D: cross-category mismatch → strict no-op", () => {
    const d1 = rootReducer(seeded, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: "wheat" },
    });
    expect(d1).toBe(seeded);
  });

  it("E: unknown category → strict no-op", () => {
    const e1 = rootReducer(seeded, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "fish", tileId: "hay" },
    });
    expect(e1).toBe(seeded);
  });

  it("F: setting the same active tile type → strict no-op (no ref churn)", () => {
    const f1 = rootReducer(seeded, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: "hay" },
    });
    expect(f1).toBe(seeded);
  });

  it("G: filling a previously-null slot (grain starts null)", () => {
    const grainSeed = {
      ...seeded,
      tileCollection: {
        ...seeded.tileCollection,
        discovered: { ...seeded.tileCollection.discovered, wheat: true },
      },
    };
    const g1 = rootReducer(grainSeed, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grain", tileId: "wheat" },
    });
    expect(g1.tileCollection.activeByCategory.grain).toBe("wheat");
  });

  it("H: toggling grass does not touch other categories", () => {
    const h1 = rootReducer(seeded, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: "meadow_grass" },
    });
    for (const c of ["wood", "berry", "bird", "grain"]) {
      expect(h1.tileCollection.activeByCategory[c]).toBe(seeded.tileCollection.activeByCategory[c]);
    }
  });
});
