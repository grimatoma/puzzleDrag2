/**
 * Income-divisor contract (economy balance pass).
 *
 * `TILES_PER_RESOURCE` is the INCOME divisor (how many collected tiles yield one
 * inventory resource), decoupled from `UPGRADE_THRESHOLDS` (how many chained
 * tiles upgrade a board tile to its next type). The CHAIN_COLLECTED reducer
 * accumulates resource progress against TILES_PER_RESOURCE; board-tier upgrades
 * + tile discovery + the HUD "next tile" bar keep using UPGRADE_THRESHOLDS.
 *
 * New contract after tier-scaling was introduced:
 *   1. The two maps are SEPARATE objects — mutating one must not touch the other.
 *   2. TILES_PER_RESOURCE is a SUPERSET of UPGRADE_THRESHOLDS keys: it also
 *      contains keys for TILE_TYPES ids not in UPGRADE_THRESHOLDS (e.g. `block`,
 *      `iron_bar`). Legacy keys without a TILE_TYPES entry keep their original
 *      UPGRADE_THRESHOLDS value unchanged.
 *   3. Tier-0 tiles have a divisor equal to lineBase(category) — backward
 *      compatible with the original flat thresholds for the canonical tier-0 tile
 *      of each category.
 *   4. Rarer variants (tier > 0) have a strictly higher divisor than tier-0 of the
 *      same category: more tiles needed per resource for harder-to-chain variants.
 *   5. The reducer income path divides by TILES_PER_RESOURCE.
 */

import { describe, it, expect } from "vitest";
import { inv, zoneProgress } from "../testUtils/inventory.js";
import { gameReducer } from "../state.js";
import { UPGRADE_THRESHOLDS, TILES_PER_RESOURCE, tileFamily } from "../constants.js";
import { lineBase, categoryOfTileKey, PRODUCTION_LINES } from "../config/productionLines.js";
import { TILE_TYPES } from "../features/tileCollection/data.js";

describe("TILES_PER_RESOURCE — decoupled income divisor", () => {
  it("is a distinct object from UPGRADE_THRESHOLDS (mutating one must not touch the other)", () => {
    expect(TILES_PER_RESOURCE).not.toBe(UPGRADE_THRESHOLDS);
  });

  it("is a superset of UPGRADE_THRESHOLDS and preserves legacy keys", () => {
    // Every UPGRADE_THRESHOLDS key must still be present in TILES_PER_RESOURCE.
    for (const k of Object.keys(UPGRADE_THRESHOLDS)) {
      expect(TILES_PER_RESOURCE, `TILES_PER_RESOURCE must contain ${k}`).toHaveProperty(k);
    }

    // TILES_PER_RESOURCE has MORE keys (e.g. TILE_TYPES ids like block, iron_bar).
    expect(Object.keys(TILES_PER_RESOURCE).length).toBeGreaterThan(
      Object.keys(UPGRADE_THRESHOLDS).length,
    );

    // Legacy keys that have NO TILE_TYPES entry preserve their UPGRADE_THRESHOLDS
    // value unchanged (the build function seeds from UPGRADE_THRESHOLDS and only
    // overwrites keys present in TILE_TYPES).
    const tileTypeIds = new Set(TILE_TYPES.map((t) => t.id));
    for (const [k, v] of Object.entries(UPGRADE_THRESHOLDS)) {
      if (!tileTypeIds.has(k)) {
        expect(
          TILES_PER_RESOURCE[k],
          `legacy key ${k} (no TILE_TYPES entry) must keep its UPGRADE_THRESHOLDS value`,
        ).toBe(v);
      }
    }
  });

  it("tier-0 tiles have divisor equal to lineBase(category)", () => {
    // For every tile in TILE_TYPES that has tier 0 and a known category,
    // the divisor must equal lineBase(category).
    const tier0Tiles = TILE_TYPES.filter((t) => (Number(t.tier) || 0) === 0);
    for (const t of tier0Tiles) {
      const cat = categoryOfTileKey(t.id);
      if (!cat) continue; // no production line for this tile
      expect(
        TILES_PER_RESOURCE[t.id],
        `tier-0 tile ${t.id} (${cat}) divisor must equal lineBase`,
      ).toBe(lineBase(cat));
    }
  });

  it("rarer variants (tier > 0) have a strictly higher divisor than tier-0 of the same category", () => {
    // Concrete example: fish category.
    //   tile_fish_sardine  tier-0  → lineBase("fish") = 5
    //   tile_fish_oyster   tier-1  → lineBase("fish") + 1 = 6
    expect(TILES_PER_RESOURCE["tile_fish_oyster"]).toBeGreaterThan(
      TILES_PER_RESOURCE["tile_fish_sardine"],
    );

    // Bird category:
    //   tile_bird_chicken  tier-1  → lineBase("bird") + 1 = 7
    //   tile_bird_goose    tier-2  → lineBase("bird") + 2 = 8
    expect(TILES_PER_RESOURCE["tile_bird_goose"]).toBeGreaterThan(
      TILES_PER_RESOURCE["tile_bird_chicken"],
    );

    // General invariant: every tier>0 tile must have a higher divisor than
    // lineBase(effectiveLine), where effectiveLine is the production line
    // actually used for pricing (family if it has a line, else display category).
    // Cross-category tiles like tile_bird_clover (display: flowers, family: bird)
    // are priced by the bird line, not the flowers line.
    const higherTierTiles = TILE_TYPES.filter((t) => (Number(t.tier) || 0) > 0);
    for (const t of higherTierTiles) {
      const displayCat = categoryOfTileKey(t.id);
      if (!displayCat) continue;
      const fam = tileFamily(t.id);
      const effectiveCat = fam && PRODUCTION_LINES[fam] ? fam : displayCat;
      const base = lineBase(effectiveCat);
      expect(
        TILES_PER_RESOURCE[t.id],
        `tier-${t.tier} tile ${t.id} (line: ${effectiveCat}) divisor must exceed lineBase(${effectiveCat})=${base}`,
      ).toBeGreaterThan(base);
    }
  });

  it("the CHAIN_COLLECTED reducer rolls income over at TILES_PER_RESOURCE[tileKey]", () => {
    // grass tier-0: divisor = lineBase("grass") = 6, unchanged from the original
    // UPGRADE_THRESHOLDS value, so this test still passes unmodified.
    const divisor = TILES_PER_RESOURCE["tile_grass_grass"];
    const state = {
      biomeKey: "farm",
      view: "board",
      coins: 100,
      turnsUsed: 0,
      seasonsCycled: 1,
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
    // A chain exactly one over the divisor → +1 resource, remainder 1.
    const next = gameReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: {
        key: "tile_grass_grass",
        gained: divisor + 1,
        upgrades: 0,
        value: 1,
        chainLength: divisor + 1,
        resourceKey: "hay_bundle",
      },
    });
    expect(inv(next).hay_bundle).toBe(1);
    expect(zoneProgress(next).hay_bundle).toBe(1);
  });
});
