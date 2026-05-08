// Coverage round 6: decorations slice + bosses modifiers helpers.
// decorations was at 91% with branch-coverage gaps in the cost loops;
// bosses/modifiers was at 75% with branches missing in the empty-grid
// fallbacks, modifier branches, and clearModifier.

import { describe, it, expect } from "vitest";
import { reduce as decoReduce } from "../features/decorations/slice.js";
import { DECORATIONS } from "../features/decorations/data.js";
import {
  applyModifierToFreshGrid,
  tileIsChainable,
  tickModifier,
  clearModifier,
} from "../features/bosses/modifiers.js";

// ─── decorations slice ──────────────────────────────────────────────────────
describe("decorations slice — coverage gaps", () => {
  const baseState = (over = {}) => ({
    coins: 1000,
    inventory: { grass_hay: 50, mine_stone: 50, wood_plank: 50, berry: 50 },
    influence: 0,
    built: { decorations: {} },
    ...over,
  });

  it("non-BUILD_DECORATION action returns state unchanged", () => {
    const s0 = baseState();
    expect(decoReduce(s0, { type: "NOPE" })).toBe(s0);
  });

  it("unknown decoration id returns state unchanged", () => {
    const s0 = baseState();
    const s1 = decoReduce(s0, { type: "BUILD_DECORATION", payload: { id: "no_such" } });
    expect(s1).toBe(s0);
  });

  it("rejects when coins are short", () => {
    const s0 = baseState({ coins: 0 });
    const s1 = decoReduce(s0, { type: "BUILD_DECORATION", payload: { id: "violet_bed" } });
    expect(s1).toBe(s0);
  });

  it("rejects when inventory resource is short", () => {
    const s0 = baseState({ inventory: { grass_hay: 0 } });
    const s1 = decoReduce(s0, { type: "BUILD_DECORATION", payload: { id: "violet_bed" } });
    expect(s1).toBe(s0);
  });

  it("violet_bed: deducts coins + hay, +20 influence, increments built count", () => {
    const s0 = baseState();
    const s1 = decoReduce(s0, { type: "BUILD_DECORATION", payload: { id: "violet_bed" } });
    const def = DECORATIONS.violet_bed;
    const loc = s1.mapCurrent ?? "home";
    expect(s1.coins).toBe(1000 - def.cost.coins);
    expect(s1.inventory.grass_hay).toBe(50 - def.cost.grass_hay);
    expect(s1.influence).toBe(def.influence);
    expect(s1.built[loc]?.decorations?.violet_bed).toBe(1);
  });

  it("repeat builds stack the count", () => {
    let s = baseState();
    s = decoReduce(s, { type: "BUILD_DECORATION", payload: { id: "violet_bed" } });
    s = decoReduce(s, { type: "BUILD_DECORATION", payload: { id: "violet_bed" } });
    const loc = s.mapCurrent ?? "home";
    expect(s.built[loc]?.decorations?.violet_bed).toBe(2);
    expect(s.influence).toBe(DECORATIONS.violet_bed.influence * 2);
  });

  it("apple_sapling: multi-resource cost path is honoured", () => {
    const s0 = baseState();
    const s1 = decoReduce(s0, { type: "BUILD_DECORATION", payload: { id: "apple_sapling" } });
    expect(s1.inventory.wood_plank).toBe(50 - DECORATIONS.apple_sapling.cost.wood_plank);
    expect(s1.inventory.berry).toBe(50 - DECORATIONS.apple_sapling.cost.berry);
  });

  it("missing built / inventory slices fall back gracefully", () => {
    const s0 = { coins: 500, inventory: { grass_hay: 10 } };
    const s1 = decoReduce(s0, { type: "BUILD_DECORATION", payload: { id: "violet_bed" } });
    const loc = s1.mapCurrent ?? "home";
    expect(s1.built[loc]?.decorations?.violet_bed).toBe(1);
  });
});

// ─── bosses/modifiers helpers ────────────────────────────────────────────────
describe("bosses/modifiers — coverage gaps", () => {
  const makeGrid = (rows = 3, cols = 3) =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ key: "x" })),
    );

  it("empty grid: freeze_columns returns an empty list", () => {
    const r = applyModifierToFreshGrid([], { type: "freeze_columns", params: { n: 2 } }, () => 0);
    expect(r).toEqual({ frozenColumns: [] });
  });

  it("empty grid: rubble_blocks returns an empty list", () => {
    const r = applyModifierToFreshGrid([], { type: "rubble_blocks", params: { count: 4 } }, () => 0);
    expect(r).toEqual({ rubble: [] });
  });

  it("empty grid: hide_resources returns an empty list", () => {
    const r = applyModifierToFreshGrid([], { type: "hide_resources", params: { hidden: 4 } }, () => 0);
    expect(r).toEqual({ hidden: [] });
  });

  it("empty grid: heat_tiles returns an empty list", () => {
    const r = applyModifierToFreshGrid([], { type: "heat_tiles", params: {} }, () => 0);
    expect(r).toEqual({ heat: [] });
  });

  it("empty grid: respawn_boost returns boost+factor", () => {
    const r = applyModifierToFreshGrid([], { type: "respawn_boost", params: { boost: ["x"], factor: 1.5 } }, () => 0);
    expect(r).toEqual({ boost: ["x"], factor: 1.5 });
  });

  it("freeze_columns marks the picked columns frozen on every row", () => {
    const grid = makeGrid(3, 4);
    // Sequence rng so the inner Set acquisition advances (avoid infinite loop).
    const seq = [0, 0.5, 0.25, 0.75];
    let i = 0;
    const rng = () => seq[(i++) % seq.length];
    const r = applyModifierToFreshGrid(grid, { type: "freeze_columns", params: { n: 2 } }, rng);
    expect(r.frozenColumns.length).toBe(2);
    for (const c of r.frozenColumns) {
      for (const row of grid) expect(row[c].frozen).toBe(true);
    }
  });

  it("rubble_blocks selects 'count' tiles and flags them rubble", () => {
    const grid = makeGrid(3, 3);
    const r = applyModifierToFreshGrid(grid, { type: "rubble_blocks", params: { count: 2 } }, () => 0.1);
    expect(r.rubble).toHaveLength(2);
    for (const { row, col } of r.rubble) expect(grid[row][col].rubble).toBe(true);
  });

  it("hide_resources flags tiles as hidden", () => {
    const grid = makeGrid(3, 3);
    const r = applyModifierToFreshGrid(grid, { type: "hide_resources", params: { hidden: 3 } }, () => 0.1);
    expect(r.hidden).toHaveLength(3);
    for (const { row, col } of r.hidden) expect(grid[row][col].hidden).toBe(true);
  });

  it("unknown modifier type returns an empty bag", () => {
    const grid = makeGrid(3, 3);
    const r = applyModifierToFreshGrid(grid, { type: "no_such_modifier", params: {} }, () => 0);
    expect(r).toEqual({});
  });

  it("tileIsChainable: false for frozen / rubble / hidden / null; true otherwise", () => {
    expect(tileIsChainable(null)).toBe(false);
    expect(tileIsChainable({ frozen: true })).toBe(false);
    expect(tileIsChainable({ rubble: true })).toBe(false);
    expect(tileIsChainable({ hidden: true })).toBe(false);
    expect(tileIsChainable({ key: "x" })).toBe(true);
  });

  it("tickModifier: non-heat modifier returns state unchanged", () => {
    const state = { boss: { modifierState: { frozenColumns: [0, 1] } } };
    const r = tickModifier(state, { type: "freeze_columns", params: { n: 2 } });
    expect(r.newState).toBe(state);
  });

  it("tickModifier: heat tile under burnAfter survives, ages by 1", () => {
    const state = {
      inventory: { wheat: 5 },
      boss: { modifierState: { heat: [{ row: 0, col: 0, age: 0 }] } },
    };
    const r = tickModifier(state, { type: "heat_tiles", params: { burnAfter: 2 } });
    expect(r.newState.boss.modifierState.heat).toHaveLength(1);
    expect(r.newState.boss.modifierState.heat[0].age).toBe(1);
  });

  it("tickModifier: heat tile past burnAfter consumes inventory and is removed", () => {
    const state = {
      inventory: { grass_hay: 5 },
      boss: { modifierState: { heat: [{ row: 0, col: 0, age: 5 }] } },
    };
    const r = tickModifier(state, { type: "heat_tiles", params: { burnAfter: 2 } });
    expect(r.newState.boss.modifierState.heat).toHaveLength(0);
    expect(r.newState.inventory.grass_hay).toBe(4);
  });

  it("clearModifier: removes overlay flags from every tile in the grid", () => {
    const grid = makeGrid(2, 2);
    grid[0][0].frozen = true;
    grid[0][1].rubble = true;
    grid[1][0].hidden = true;
    grid[1][1].heat = true;
    clearModifier(grid);
    for (const row of grid) for (const t of row) {
      expect(t.frozen).toBeUndefined();
      expect(t.rubble).toBeUndefined();
      expect(t.hidden).toBeUndefined();
      expect(t.heat).toBeUndefined();
    }
  });

  it("clearModifier: null grid returns null", () => {
    expect(clearModifier(null)).toBeNull();
  });
});
