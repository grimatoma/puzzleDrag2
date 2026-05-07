import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";
import { SPECIES_MAP } from "../features/species/data.js";

describe("Phase 5.7 — Free moves per season", () => {
  const base = initialState();

  it("A: chaining turkey grants +2 freeMoves, ONCE per chain (not per tile)", () => {
    const a0 = {
      ...base,
      species: {
        ...base.species,
        discovered: { ...base.species.discovered, turkey: true },
        activeByCategory: { ...base.species.activeByCategory, bird: "turkey" },
      },
    };
    const a1 = rootReducer(a0, { type: "CHAIN_COMMIT", payload: { key: "turkey", length: 3 } });
    expect(a1.species.freeMoves).toBe(2);
  });

  it("B: a second turkey chain stacks", () => {
    const a0 = {
      ...base,
      species: {
        ...base.species,
        discovered: { ...base.species.discovered, turkey: true },
        activeByCategory: { ...base.species.activeByCategory, bird: "turkey" },
      },
    };
    const a1 = rootReducer(a0, { type: "CHAIN_COMMIT", payload: { key: "turkey", length: 3 } });
    const b1 = rootReducer(a1, { type: "CHAIN_COMMIT", payload: { key: "turkey", length: 5 } });
    expect(b1.species.freeMoves).toBe(4);
  });

  it("C: chaining a non-free-move species does NOT increment", () => {
    const a0 = {
      ...base,
      species: {
        ...base.species,
        discovered: { ...base.species.discovered, turkey: true },
        activeByCategory: { ...base.species.activeByCategory, bird: "turkey" },
      },
    };
    const c1 = rootReducer(a0, { type: "CHAIN_COMMIT", payload: { key: "hay", length: 12 } });
    expect(c1.species.freeMoves).toBe(0);
  });

  it("D: LOCKED — turkey active but never chained → freeMoves stays at 0", () => {
    const d0 = {
      ...base,
      species: {
        ...base.species,
        discovered: { ...base.species.discovered, turkey: true },
        activeByCategory: { ...base.species.activeByCategory, bird: "turkey" },
      },
    };
    let d = d0;
    for (let i = 0; i < 5; i++) {
      d = rootReducer(d, { type: "CHAIN_COMMIT", payload: { key: "hay", length: 6 } });
    }
    expect(d.species.freeMoves).toBe(0);
  });

  it("E: END_TURN with freeMoves > 0 consumes a free move, turnsUsed unchanged", () => {
    const e0 = { ...base, turnsUsed: 0, species: { ...base.species, freeMoves: 2 } };
    const e1 = rootReducer(e0, { type: "END_TURN" });
    expect(e1.species.freeMoves).toBe(1);
    expect(e1.turnsUsed).toBe(0);
  });

  it("F: END_TURN with no free moves increments turnsUsed normally", () => {
    const f0 = { ...base, turnsUsed: 3, species: { ...base.species, freeMoves: 0 } };
    const f1 = rootReducer(f0, { type: "END_TURN" });
    expect(f1.species.freeMoves).toBe(0);
    expect(f1.turnsUsed).toBe(4);
  });

  it("G: CLOSE_SEASON resets freeMoves to 0", () => {
    const g0 = { ...base, species: { ...base.species, freeMoves: 4 } };
    const g1 = rootReducer(g0, { type: "CLOSE_SEASON" });
    expect(g1.species.freeMoves).toBe(0);
  });

  it("H: clover grants +2, melon grants +5 per spec", () => {
    expect(SPECIES_MAP.clover.effects.freeMoves).toBe(2);
    expect(SPECIES_MAP.melon.effects.freeMoves).toBe(5);
  });
});
