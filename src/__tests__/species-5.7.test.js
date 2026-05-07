import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";
import { TILE_TYPES_MAP } from "../features/tileCollection/data.js";

describe("Phase 5.7 — Free moves per season", () => {
  const base = initialState();

  it("A: chaining turkey grants +2 freeMoves, ONCE per chain (not per tile)", () => {
    const a0 = {
      ...base,
      tileCollection: {
        ...base.tileCollection,
        discovered: { ...base.tileCollection.discovered, bird_turkey: true },
        activeByCategory: { ...base.tileCollection.activeByCategory, bird: "bird_turkey" },
      },
    };
    const a1 = rootReducer(a0, { type: "CHAIN_COMMIT", payload: { key: "bird_turkey", length: 3 } });
    expect(a1.tileCollection.freeMoves).toBe(2);
  });

  it("B: a second turkey chain stacks", () => {
    const a0 = {
      ...base,
      tileCollection: {
        ...base.tileCollection,
        discovered: { ...base.tileCollection.discovered, bird_turkey: true },
        activeByCategory: { ...base.tileCollection.activeByCategory, bird: "bird_turkey" },
      },
    };
    const a1 = rootReducer(a0, { type: "CHAIN_COMMIT", payload: { key: "bird_turkey", length: 3 } });
    const b1 = rootReducer(a1, { type: "CHAIN_COMMIT", payload: { key: "bird_turkey", length: 5 } });
    expect(b1.tileCollection.freeMoves).toBe(4);
  });

  it("C: chaining a non-free-move tile type does NOT increment", () => {
    const a0 = {
      ...base,
      tileCollection: {
        ...base.tileCollection,
        discovered: { ...base.tileCollection.discovered, bird_turkey: true },
        activeByCategory: { ...base.tileCollection.activeByCategory, bird: "bird_turkey" },
      },
    };
    const c1 = rootReducer(a0, { type: "CHAIN_COMMIT", payload: { key: "grass_hay", length: 12 } });
    expect(c1.tileCollection.freeMoves).toBe(0);
  });

  it("D: LOCKED — turkey active but never chained → freeMoves stays at 0", () => {
    const d0 = {
      ...base,
      tileCollection: {
        ...base.tileCollection,
        discovered: { ...base.tileCollection.discovered, bird_turkey: true },
        activeByCategory: { ...base.tileCollection.activeByCategory, bird: "bird_turkey" },
      },
    };
    let d = d0;
    for (let i = 0; i < 5; i++) {
      d = rootReducer(d, { type: "CHAIN_COMMIT", payload: { key: "grass_hay", length: 6 } });
    }
    expect(d.tileCollection.freeMoves).toBe(0);
  });

  it("E: END_TURN with freeMoves > 0 consumes a free move, turnsUsed unchanged", () => {
    const e0 = { ...base, turnsUsed: 0, tileCollection: { ...base.tileCollection, freeMoves: 2 } };
    const e1 = rootReducer(e0, { type: "END_TURN" });
    expect(e1.tileCollection.freeMoves).toBe(1);
    expect(e1.turnsUsed).toBe(0);
  });

  it("F: END_TURN with no free moves increments turnsUsed normally", () => {
    const f0 = { ...base, turnsUsed: 3, tileCollection: { ...base.tileCollection, freeMoves: 0 } };
    const f1 = rootReducer(f0, { type: "END_TURN" });
    expect(f1.tileCollection.freeMoves).toBe(0);
    expect(f1.turnsUsed).toBe(4);
  });

  it("G: CLOSE_SEASON resets freeMoves to 0", () => {
    const g0 = { ...base, tileCollection: { ...base.tileCollection, freeMoves: 4 } };
    const g1 = rootReducer(g0, { type: "CLOSE_SEASON" });
    expect(g1.tileCollection.freeMoves).toBe(0);
  });

  it("H: clover grants +2, melon grants +5 per spec", () => {
    expect(TILE_TYPES_MAP.bird_clover.effects.freeMoves).toBe(2);
    expect(TILE_TYPES_MAP.bird_melon.effects.freeMoves).toBe(5);
  });
});
