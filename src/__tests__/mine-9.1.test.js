import { describe, it, expect } from "vitest";
import { BIOMES, MINE_TILE_POOL, FARM_TILE_POOL, UPGRADE_THRESHOLDS } from "../constants.js";
import { createInitialState, rootReducer as reduce } from "../state.js";
import { upgradeCountForChain } from "../utils.js";

describe("Phase 9.1 — Stone/ore/coal/ingot resource chain + Mine biome setup", () => {
  // ── Pool shape locked exactly ─────────────────────────────────────────────
  it("MINE_TILE_POOL is a 9-entry array", () => {
    expect(Array.isArray(MINE_TILE_POOL)).toBe(true);
    expect(MINE_TILE_POOL.length).toBe(9);
  });

  it("MINE_TILE_POOL contains all 5 mine base resources", () => {
    const baseSet = new Set(MINE_TILE_POOL);
    for (const k of ["stone", "ore", "coal", "dirt", "gem"]) {
      expect(baseSet.has(k)).toBe(true);
    }
  });

  it("stone weighted ×3", () => {
    expect(MINE_TILE_POOL.filter((k) => k === "stone").length).toBe(3);
  });

  it("dirt weighted ×2", () => {
    expect(MINE_TILE_POOL.filter((k) => k === "dirt").length).toBe(2);
  });

  it("gem weighted ×1 (rare)", () => {
    expect(MINE_TILE_POOL.filter((k) => k === "gem").length).toBe(1);
  });

  // ── BIOMES wiring ─────────────────────────────────────────────────────────
  it("BIOMES.mine.tilePool === MINE_TILE_POOL", () => {
    expect(BIOMES.mine).toBeTruthy();
    expect(BIOMES.mine.tilePool).toBe(MINE_TILE_POOL);
  });

  it("FARM_TILE_POOL exists and is distinct from MINE_TILE_POOL", () => {
    expect(Array.isArray(FARM_TILE_POOL)).toBe(true);
    expect(BIOMES.farm.tilePool).toBe(FARM_TILE_POOL);
    expect(FARM_TILE_POOL).not.toBe(MINE_TILE_POOL);
  });

  // ── Threshold table (locked from Phase 1 / GAME_SPEC §4) ─────────────────
  it("stone → cobble at 8", () => {
    expect(UPGRADE_THRESHOLDS.stone).toBe(8);
  });
  it("cobble → block at 6", () => {
    expect(UPGRADE_THRESHOLDS.cobble).toBe(6);
  });
  it("ore → ingot at 6", () => {
    expect(UPGRADE_THRESHOLDS.ore).toBe(6);
  });
  it("coal → coke at 7", () => {
    expect(UPGRADE_THRESHOLDS.coal).toBe(7);
  });
  it("gem → cutgem at 5", () => {
    expect(UPGRADE_THRESHOLDS.gem).toBe(5);
  });
  it("ingot is terminal — no threshold", () => {
    expect(UPGRADE_THRESHOLDS.ingot).toBeUndefined();
  });
  it("gold is terminal — no threshold", () => {
    expect(UPGRADE_THRESHOLDS.gold).toBeUndefined();
  });

  // ── Default biome + SET_BIOME swaps active pool ──────────────────────────
  it("default biome is farm", () => {
    const s = createInitialState();
    expect(s.biome).toBe("farm");
  });

  it("SET_BIOME flips state.biome at season boundary", () => {
    let s = createInitialState();
    s = reduce(s, { type: "ADVANCE_SEASON" });
    s = reduce(s, { type: "SET_BIOME", id: "mine" });
    expect(s.biome).toBe("mine");
  });

  it("mid-season SET_BIOME is no-op", () => {
    let mid = createInitialState();
    mid = { ...mid, turnsUsed: 4 };
    const before = JSON.stringify(mid);
    const after = reduce(mid, { type: "SET_BIOME", id: "mine" });
    expect(JSON.stringify(after)).toBe(before);
  });

  // ── Shared inventory ──────────────────────────────────────────────────────
  it("8-stone chain in mine biome → 7 stone + 1 cobble (threshold 8)", () => {
    let g = createInitialState();
    g = { ...g, biome: "mine", inventory: { ...g.inventory, stone: 0 } };
    g = reduce(g, {
      type: "COMMIT_CHAIN",
      chain: Array(8).fill({ key: "stone" }),
    });
    expect(g.inventory.stone).toBe(7);
    expect(g.inventory.cobble).toBe(1);
  });

  it("no separate mine inventory bag", () => {
    let g = createInitialState();
    g = { ...g, biome: "mine" };
    g = reduce(g, {
      type: "COMMIT_CHAIN",
      chain: Array(8).fill({ key: "stone" }),
    });
    expect(g.inventory.mine).toBeUndefined();
  });

  // ── upgradeCountForChain honours mine thresholds without code changes ──────
  it("8 stone = 1 cobble upgrade", () => {
    expect(upgradeCountForChain(8, "stone")).toBe(1);
  });
  it("16 stone = 2 cobble upgrades", () => {
    expect(upgradeCountForChain(16, "stone")).toBe(2);
  });
  it("6 ore = 1 ingot", () => {
    expect(upgradeCountForChain(6, "ore")).toBe(1);
  });
  it("7 coal = 1 coke", () => {
    expect(upgradeCountForChain(7, "coal")).toBe(1);
  });
  it("5 gem = 1 cutgem", () => {
    expect(upgradeCountForChain(5, "gem")).toBe(1);
  });
});
