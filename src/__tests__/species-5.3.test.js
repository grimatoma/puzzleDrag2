import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";

describe("Phase 5.3 — SET_ACTIVE_SPECIES toggle", () => {
  const base = initialState();
  // Pre-discover meadow_grass and wheat for replacement tests.
  // Mark tutorial as seen so it doesn't auto-start on the first dispatch
  // and break strict same-reference assertions.
  const seeded = {
    ...base,
    tutorial: { ...(base.tutorial ?? {}), seen: true, active: false },
    species: {
      ...base.species,
      discovered: { ...base.species.discovered, meadow_grass: true, wheat: true },
    },
  };

  it("A: replace within category — singleton invariant", () => {
    const a1 = rootReducer(seeded, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "grass", speciesId: "meadow_grass" },
    });
    expect(a1.species.activeByCategory.grass).toBe("meadow_grass");
    expect(a1.species.activeByCategory.wood).toBe("log");
    expect(a1.species.activeByCategory.berry).toBe("berry");
  });

  it("toggle back to hay — slot still holds exactly one id", () => {
    const a1 = rootReducer(seeded, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "grass", speciesId: "meadow_grass" },
    });
    const a2 = rootReducer(a1, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "grass", speciesId: "hay" },
    });
    expect(a2.species.activeByCategory.grass).toBe("hay");
  });

  it("B: null clears the slot", () => {
    const b1 = rootReducer(seeded, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "grass", speciesId: null },
    });
    expect(b1.species.activeByCategory.grass).toBeNull();
  });

  it("C: undiscovered species → strict no-op (same ref)", () => {
    const c1 = rootReducer(seeded, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "grass", speciesId: "spiky_grass" },
    });
    expect(c1).toBe(seeded);
  });

  it("D: cross-category mismatch → strict no-op", () => {
    const d1 = rootReducer(seeded, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "grass", speciesId: "wheat" },
    });
    expect(d1).toBe(seeded);
  });

  it("E: unknown category → strict no-op", () => {
    const e1 = rootReducer(seeded, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "fish", speciesId: "hay" },
    });
    expect(e1).toBe(seeded);
  });

  it("F: setting the same active species → strict no-op (no ref churn)", () => {
    const f1 = rootReducer(seeded, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "grass", speciesId: "hay" },
    });
    expect(f1).toBe(seeded);
  });

  it("G: filling a previously-null slot (grain starts null)", () => {
    const grainSeed = {
      ...seeded,
      species: {
        ...seeded.species,
        discovered: { ...seeded.species.discovered, wheat: true },
      },
    };
    const g1 = rootReducer(grainSeed, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "grain", speciesId: "wheat" },
    });
    expect(g1.species.activeByCategory.grain).toBe("wheat");
  });

  it("H: toggling grass does not touch other categories", () => {
    const h1 = rootReducer(seeded, {
      type: "SET_ACTIVE_SPECIES",
      payload: { category: "grass", speciesId: "meadow_grass" },
    });
    for (const c of ["wood", "berry", "bird", "grain"]) {
      expect(h1.species.activeByCategory[c]).toBe(seeded.species.activeByCategory[c]);
    }
  });
});
