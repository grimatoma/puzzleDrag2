// Combination tests — the value proposition of the unified catalog is that
// stacked abilities across buildings + workers + tiles produce predictable
// channel sums. These tests stack realistic scenarios.

import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { aggregateAbilities } from "../config/abilitiesAggregate.js";
import { TILE_TYPES_BY_CATEGORY } from "../features/tileCollection/data.js";

function ctx() { return { speciesByCategory: TILE_TYPES_BY_CATEGORY }; }

describe("Combination — building + worker + tile abilities stack on shared channels", () => {
  it("worker season_bonus + building season_bonus both contribute coins", () => {
    const out = aggregateAbilities([
      { kind: "worker", abilities: [{ id: "season_bonus", params: { resource: "coins", amount: 30 } }], weight: 1 },
      { kind: "building", abilities: [{ id: "season_bonus", params: { resource: "coins", amount: 20 } }], weight: 1 },
    ], ctx());
    expect(out.seasonBonus.coins).toBe(50);
  });

  it("multiple buildings with grant_tool stack on seasonEndTools", () => {
    const out = aggregateAbilities([
      { kind: "building", abilities: [{ id: "grant_tool", params: { tool: "bomb", amount: 2 } }], weight: 1 },
      { kind: "building", abilities: [{ id: "grant_tool", params: { tool: "bomb", amount: 3 } }], weight: 1 },
      { kind: "building", abilities: [{ id: "grant_tool", params: { tool: "shovel", amount: 1 } }], weight: 1 },
    ], ctx());
    expect(out.seasonEndTools.bomb).toBe(5);
    expect(out.seasonEndTools.shovel).toBe(1);
  });

  it("tile coin_bonus_flat + tile coin_bonus_per_tile contribute to separate channels", () => {
    const out = aggregateAbilities([
      { kind: "tile", abilities: [{ id: "coin_bonus_flat", params: { amount: 5 } }], weight: 1 },
      { kind: "tile", abilities: [{ id: "coin_bonus_per_tile", params: { amount: 2 } }], weight: 1 },
    ], ctx());
    expect(out.coinBonusFlat).toBe(5);
    expect(out.coinBonusPerTile).toBe(2);
  });

  it("worker (fractional weight) + tile (full weight) on threshold_reduce stack on the same key", () => {
    const out = aggregateAbilities([
      { kind: "worker", abilities: [{ id: "threshold_reduce", params: { target: "grass_hay", amount: 4 } }], weight: 0.5 },
      { kind: "tile", abilities: [{ id: "threshold_reduce", params: { target: "grass_hay", amount: 1 } }], weight: 1 },
    ], ctx());
    expect(out.thresholdReduce.grass_hay).toBe(3); // (4*0.5) + (1*1)
  });
});

describe("Combination — full season-end with built buildings", () => {
  function withBuilt(state, ids) {
    const map = state.mapCurrent ?? "home";
    const builtForMap = { ...(state.built?.[map] ?? {}) };
    for (const id of ids) builtForMap[id] = true;
    return { ...state, built: { ...state.built, [map]: builtForMap } };
  }

  it("housing × 3 increases the townsfolk pool by 3 at season end", () => {
    let s = createInitialState();
    s = withBuilt(s, ["hearth", "housing", "housing2", "housing3"]);
    s = { ...s, townsfolk: { ...s.townsfolk, debt: 0, pool: 1 } };
    const before = s.townsfolk.pool;
    const after = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(after.townsfolk.pool - before).toBe(3);
  });

  it("powder_store grants 2 bombs at season end via grant_tool ability", () => {
    let s = createInitialState();
    s = withBuilt(s, ["hearth", "powder_store"]);
    s = { ...s, tools: { ...s.tools, bomb: 0 }, townsfolk: { ...s.townsfolk, debt: 0 } };
    const after = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(after.tools.bomb).toBe(2);
  });

  it("silo on farm preserves the board between sessions via preserve_board ability", () => {
    let s = createInitialState();
    s = withBuilt(s, ["hearth", "silo"]);
    const grid = [["grass_hay"]];
    s = {
      ...s,
      biomeKey: "farm",
      grid,
      townsfolk: { ...s.townsfolk, debt: 0 },
      farm: { savedField: null },
    };
    const after = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(after.farm.savedField).toBeTruthy();
    expect(after.farm.savedField.tiles).toEqual(grid);
  });
});

describe("Combination — boundary cases", () => {
  it("a malformed ability instance (missing id) is ignored", () => {
    const out = aggregateAbilities([
      { abilities: [{ params: { target: "x", amount: 1 } }], weight: 1 },
    ], ctx());
    expect(out.thresholdReduce).toEqual({});
  });

  it("an unknown ability id is silently skipped", () => {
    const out = aggregateAbilities([
      { abilities: [{ id: "totally_made_up", params: {} }], weight: 1 },
    ], ctx());
    expect(out.thresholdReduce).toEqual({});
  });

  it("weight clamps to [0, 1]", () => {
    const out1 = aggregateAbilities([
      { abilities: [{ id: "free_moves", params: { count: 4 } }], weight: -1 },
    ], ctx());
    expect(out1.freeMoves).toBe(0);
    const out2 = aggregateAbilities([
      { abilities: [{ id: "free_moves", params: { count: 4 } }], weight: 5 },
    ], ctx());
    expect(out2.freeMoves).toBe(4); // clamped to 1.0
  });
});
