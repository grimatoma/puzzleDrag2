/**
 * Tests for the Golden Coin tile (tile_coin_golden).
 *
 * The Golden Coin is a treasure-family mine tile that pays out coins directly
 * when chained instead of producing a resource:
 *   - It has `next: null` and no TILE_FAMILY_RESOURCE family, so
 *     producedResource() returns null → no resourceProgress is credited.
 *   - Its TILE_TYPES entry carries a `coin_bonus_per_tile` ability (amount 20),
 *     which expands into effects.coinBonusPerTile and is read by the
 *     CHAIN_COLLECTED coin-hook (state.ts) to add coins per chained tile.
 *   - It is deliberately absent from MINE_TILE_POOL, so it never spawns
 *     naturally.
 */

import { describe, it, expect } from "vitest";
import { inv, patchInventory } from "../testUtils/inventory.js";
import { gameReducer } from "../state.js";
import { ITEMS, MINE_TILE_POOL, tileFamilyResource } from "../constants.js";
import { producedResource } from "../game/producedResource.js";
import { TILE_TYPES_MAP } from "../features/tileCollection/data.js";

function minState(overrides = {}) {
  const base = {
    biomeKey: "mine",
    view: "board",
    coins: 100,
    level: 1,
    xp: 0,
    turnsUsed: 0,
    seasonsCycled: 1, // Summer — no seasonal modifiers
    inventory: { home: {} },
    resourceProgress: {},
    mapCurrent: "home",
    activeZone: "home",
    farmRun: null,
    orders: [],
    tools: { clear: 0, basic: 0, rare: 0, shuffle: 0 },
    built: {},
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    _hintsShown: {},
    almanac: { xp: 0, level: 1 },
  };
  const { inventory: invOverride, resourceProgress: progOverride, ...rest } = overrides;
  let state = { ...base, ...rest };
  if (invOverride && typeof invOverride === "object") {
    state = patchInventory(state, invOverride);
  }
  if (progOverride && typeof progOverride === "object") {
    state = { ...state, resourceProgress: { home: progOverride } };
  }
  return state;
}

function dispatchCoinChain(state, chainLength) {
  return gameReducer(state, {
    type: "CHAIN_COLLECTED",
    payload: {
      key: "tile_coin_golden",
      gained: chainLength,
      upgrades: 0,
      value: ITEMS.tile_coin_golden.value,
      chainLength,
      resourceKey: producedResource({ key: "tile_coin_golden" }),
    },
  });
}

describe("Golden Coin tile — definition", () => {
  it("is a mine tile that produces no resource", () => {
    const item = ITEMS.tile_coin_golden;
    expect(item).toBeTruthy();
    expect(item.kind).toBe("tile");
    expect(item.biome).toBe("mine");
    expect(item.next).toBeNull();
    // No tile family → no default produced resource.
    expect(tileFamilyResource("tile_coin_golden")).toBeNull();
    expect(producedResource({ key: "tile_coin_golden" })).toBeNull();
  });

  it("carries a coin_bonus_per_tile effect", () => {
    expect(TILE_TYPES_MAP.tile_coin_golden?.effects?.coinBonusPerTile).toBe(20);
  });

  it("does not spawn naturally (absent from MINE_TILE_POOL)", () => {
    expect(MINE_TILE_POOL).not.toContain("tile_coin_golden");
  });
});

describe("Golden Coin tile — chaining grants coins", () => {
  it("pays out coins and credits no resourceProgress", () => {
    const s0 = minState();
    const s1 = dispatchCoinChain(s0, 3);
    // The chain payout (tracked in seasonStats.coins, isolated from later
    // story-beat / hazard rewards) is base + per-tile hook:
    //   base = max(1, floor(gained * value)); hook = 20 per tile * chain.
    const value = ITEMS.tile_coin_golden.value;
    const expectedPayout = Math.max(1, Math.floor(3 * value)) + 20 * 3;
    expect(s1.seasonStats.coins).toBe(expectedPayout);
    // The coin balance increases.
    expect(s1.coins).toBeGreaterThan(s0.coins);
    // No resource is accumulated for a coin tile.
    expect(s1.resourceProgress?.home ?? {}).toEqual({});
    // Tiles never enter inventory.
    expect(inv(s1).tile_coin_golden).toBeUndefined();
  });

  it("longer chains pay out more (per-tile scaling)", () => {
    const short = dispatchCoinChain(minState(), 3).seasonStats.coins;
    const long = dispatchCoinChain(minState(), 6).seasonStats.coins;
    expect(long).toBeGreaterThan(short);
  });
});
