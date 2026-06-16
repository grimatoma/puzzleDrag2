/**
 * Decouple of the income knob (economy balance pass).
 *
 * `TILES_PER_RESOURCE` is the INCOME divisor (how many collected tiles yield one
 * inventory resource), split out from `UPGRADE_THRESHOLDS` (how many chained tiles
 * upgrade a board tile to its next type). The CHAIN_COLLECTED reducer accumulates
 * resource progress against TILES_PER_RESOURCE; board-tier upgrades + tile discovery
 * + the HUD "next tile" bar keep using UPGRADE_THRESHOLDS.
 *
 * These tests pin the contract:
 *   1. The two maps are SEPARATE objects, seeded equal — so introducing the split
 *      changes no behavior. Tuning one later must not require touching the other.
 *   2. The reducer income path divides by TILES_PER_RESOURCE.
 */

import { describe, it, expect } from "vitest";
import { inv, zoneProgress } from "../testUtils/inventory.js";
import { gameReducer } from "../state.js";
import { UPGRADE_THRESHOLDS, TILES_PER_RESOURCE } from "../constants.js";

describe("TILES_PER_RESOURCE — decoupled income divisor", () => {
  it("is a distinct object from UPGRADE_THRESHOLDS (mutating one must not touch the other)", () => {
    expect(TILES_PER_RESOURCE).not.toBe(UPGRADE_THRESHOLDS);
  });

  it("is seeded equal to UPGRADE_THRESHOLDS (the split is behavior-neutral at introduction)", () => {
    // Same key set …
    expect(Object.keys(TILES_PER_RESOURCE).sort()).toEqual(
      Object.keys(UPGRADE_THRESHOLDS).sort(),
    );
    // … and same value for every key.
    for (const [k, v] of Object.entries(UPGRADE_THRESHOLDS)) {
      expect(TILES_PER_RESOURCE[k], `divisor for ${k}`).toBe(v);
    }
  });

  it("the CHAIN_COLLECTED reducer rolls income over at TILES_PER_RESOURCE[tileKey]", () => {
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
