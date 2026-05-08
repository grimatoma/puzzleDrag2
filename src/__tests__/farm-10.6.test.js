/**
 * Phase 10.6 — Bird Cage + Scythe (full)
 * Tests written FIRST (red phase).
 */
import { describe, it, expect } from "vitest";
import { WORKSHOP_RECIPES } from "../constants.js";
import { createInitialState, rootReducer } from "../state.js";

function makeGridWith(items) {
  // items: array of {key, count}; fill rest with 'mine_dirt'
  const grid = Array.from({ length: 2 }, () =>
    Array.from({ length: 4 }, () => ({ key: "mine_dirt" })),
  );
  let idx = 0;
  for (const { key, count } of items) {
    for (let i = 0; i < count && idx < 8; i++, idx++) {
      const r = Math.floor(idx / 4);
      const c = idx % 4;
      grid[r][c] = { key };
    }
  }
  return grid;
}

// ── Recipe locked ─────────────────────────────────────────────────────────────

describe("10.6 — WORKSHOP_RECIPES", () => {
  it("bird_cage costs 1 hay", () => {
    expect(WORKSHOP_RECIPES.bird_cage.inputs.grass_hay).toBe(1);
  });

  it("scythe_full costs 1 stone", () => {
    expect(WORKSHOP_RECIPES.scythe_full.inputs.mine_stone).toBe(1);
  });
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe("10.6 — initial tool counts", () => {
  it("bird_cage starts at 0", () => expect(createInitialState().tools.bird_cage).toBe(0));
  it("scythe_full starts at 0", () => expect(createInitialState().tools.scythe_full).toBe(0));
});

// ── USE_TOOL bird_cage ────────────────────────────────────────────────────────

describe("10.6 — USE_TOOL bird_cage", () => {
  it("collects all 3 egg tiles into inventory", () => {
    const grid = makeGridWith([{ key: "bird_egg", count: 3 }, { key: "grass_hay", count: 4 }]);
    const s0 = {
      ...createInitialState(),
      grid,
      tools: { ...createInitialState().tools, bird_cage: 1 },
      inventory: { ...createInitialState().inventory, bird_egg: 0 },
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "bird_cage" } });
    expect(s1.inventory.bird_egg).toBe(3);
    expect(s1.tools.bird_cage).toBe(0);
  });

  it("does NOT consume a turn", () => {
    const grid = makeGridWith([{ key: "bird_egg", count: 2 }]);
    const s0 = {
      ...createInitialState(),
      grid,
      tools: { ...createInitialState().tools, bird_cage: 1 },
      turnsUsed: 4,
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "bird_cage" } });
    expect(s1.turnsUsed).toBe(4);
  });

  it("refunds when no egg tiles (tool count unchanged)", () => {
    const grid = makeGridWith([{ key: "grass_hay", count: 6 }]);
    const s0 = {
      ...createInitialState(),
      grid,
      tools: { ...createInitialState().tools, bird_cage: 1 },
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "bird_cage" } });
    expect(s1.tools.bird_cage).toBe(1);
  });
});

// ── USE_TOOL scythe_full ──────────────────────────────────────────────────────

describe("10.6 — USE_TOOL scythe_full", () => {
  it("collects all 5 grain tiles into inventory", () => {
    const grid = makeGridWith([{ key: "grain", count: 5 }, { key: "grass_hay", count: 2 }]);
    const s0 = {
      ...createInitialState(),
      grid,
      tools: { ...createInitialState().tools, scythe_full: 1 },
      inventory: { ...createInitialState().inventory, grain: 0 },
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "scythe_full" } });
    expect(s1.inventory.grain).toBe(5);
    expect(s1.tools.scythe_full).toBe(0);
  });

  it("does NOT consume a turn", () => {
    const grid = makeGridWith([{ key: "grain", count: 3 }]);
    const s0 = {
      ...createInitialState(),
      grid,
      tools: { ...createInitialState().tools, scythe_full: 1 },
      turnsUsed: 5,
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "scythe_full" } });
    expect(s1.turnsUsed).toBe(5);
  });

  it("Phase-1 Scythe (key 'clear') is NOT affected", () => {
    const grid = makeGridWith([{ key: "grain", count: 5 }, { key: "grass_hay", count: 2 }]);
    const s0 = {
      ...createInitialState(),
      grid,
      tools: { ...createInitialState().tools, clear: 1, scythe_full: 1 },
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "scythe_full" } });
    expect(s1.tools.clear).toBe(1); // Phase-1 Scythe untouched
    expect(s1.tools.scythe_full).toBe(0);
  });
});
