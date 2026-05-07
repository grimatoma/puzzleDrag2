/**
 * Phase 10.2 — Per-season tile pool modifier
 * Tests written FIRST (red phase).
 */
import { describe, it, expect } from "vitest";
import { SEASON_POOL_MODS, BIOMES, SEASON_EFFECTS } from "../constants.js";
import { getEffectivePool } from "../features/farm/pool.js";
import { createInitialState } from "../state.js";

const BASE = BIOMES.farm.pool;
const cnt = (arr, k) => arr.filter((x) => x === k).length;

function farmAt(season) {
  const s = createInitialState();
  return getEffectivePool({ ...s, biome: "farm", season });
}

// ── SEASON_POOL_MODS constants locked ─────────────────────────────────────────

describe("10.2 — SEASON_POOL_MODS constants", () => {
  it("spring berry +1", () => expect(SEASON_POOL_MODS.Spring.berry).toBe(1));
  it("summer wheat +1", () => expect(SEASON_POOL_MODS.Summer.grain_wheat).toBe(1));
  it("autumn log +2",  () => expect(SEASON_POOL_MODS.Autumn.wood_log).toBe(2));
  it("winter stone +1", () => expect(SEASON_POOL_MODS.Winter.mine_stone).toBe(1));
  it("winter hay -1", () => expect(SEASON_POOL_MODS.Winter.grass_hay).toBe(-1));
});

// ── Pool counts by season ─────────────────────────────────────────────────────

describe("10.2 — getEffectivePool seasonal counts", () => {
  it("spring pool has +1 berry over base", () => {
    expect(cnt(farmAt("Spring"), "berry")).toBe(cnt(BASE, "berry") + 1);
  });

  it("spring hay is unchanged", () => {
    expect(cnt(farmAt("Spring"), "grass_hay")).toBe(cnt(BASE, "grass_hay"));
  });

  it("summer pool has +1 wheat over base", () => {
    expect(cnt(farmAt("Summer"), "grain_wheat")).toBe(cnt(BASE, "grain_wheat") + 1);
  });

  it("autumn pool has +2 log over base", () => {
    expect(cnt(farmAt("Autumn"), "wood_log")).toBe(cnt(BASE, "wood_log") + 2);
  });

  it("winter pool has +1 stone over base", () => {
    expect(cnt(farmAt("Winter"), "mine_stone")).toBe(cnt(BASE, "mine_stone") + 1);
  });

  it("winter pool has -1 hay (clamped at min 1)", () => {
    expect(cnt(farmAt("Winter"), "grass_hay")).toBe(Math.max(1, cnt(BASE, "grass_hay") - 1));
  });

  it("pool never collapses below 9 entries", () => {
    expect(farmAt("Winter").length).toBeGreaterThanOrEqual(9);
  });
});

// ── Worker pool_weight stacks additively ─────────────────────────────────────

describe("10.2 — worker pool_weight additive stacking", () => {
  it("autumn (+2) + worker (+1) = base+3 log", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      season: "Autumn",
      _workerEffects: { effectivePoolWeights: { wood_log: 1 } },
    };
    expect(cnt(getEffectivePool(s), "wood_log")).toBe(cnt(BASE, "wood_log") + 2 + 1);
  });
});

// ── Mine biome ignores farm season mods ──────────────────────────────────────

describe("10.2 — Mine biome ignores farm season mods", () => {
  it("mine spring pool — berry count unchanged", () => {
    const s = { ...createInitialState(), biome: "mine", season: "Spring" };
    const mineBase = BIOMES.mine.pool;
    expect(cnt(getEffectivePool(s), "berry")).toBe(cnt(mineBase, "berry"));
  });
});

// ── Locked: SEASON_EFFECTS unchanged ─────────────────────────────────────────

describe("10.2 — SEASON_EFFECTS locked (not touched)", () => {
  it("winter min-chain locked at 5", () => expect(SEASON_EFFECTS.Winter.minChain).toBe(5));
  it("spring +20% locked", () => expect(SEASON_EFFECTS.Spring.harvestBonus).toBe(0.20));
  it("summer 2× orders locked", () => expect(SEASON_EFFECTS.Summer.orderMult).toBe(2));
  it("autumn 2× upgrades locked", () => expect(SEASON_EFFECTS.Autumn.upgradeMult).toBe(2));
});
