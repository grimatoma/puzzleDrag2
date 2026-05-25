/**
 * Tests for the fractional resource-progress mechanic introduced in PR 3.
 *
 * Chain tiles no longer enter state.inventory directly. Instead, each
 * chained tile contributes to state.resourceProgress[resourceKey], rolling
 * over into state.inventory[resourceKey] each time the running total crosses
 * UPGRADE_THRESHOLDS[tileKey].
 *
 * All tests drive via CHAIN_COLLECTED with an explicit `resourceKey` in the
 * payload — matching what GameScene.js dispatches after Task B.
 */

import { describe, it, expect } from "vitest";
import { gameReducer } from "../state.js";
import {
  UPGRADE_THRESHOLDS,
  TILE_FAMILY_RESOURCE,
  TILES_WITH_CUSTOM_OUTPUT,
  tileFamilyResource,
} from "../constants.js";

// tile_grass_hay threshold is 6
const HAY_THRESHOLD = UPGRADE_THRESHOLDS["tile_grass_hay"]; // 6

function minState(overrides = {}) {
  return {
    biomeKey: "farm",
    view: "board",
    coins: 100,
    level: 1,
    xp: 0,
    turnsUsed: 0,
    seasonsCycled: 1, // Summer — no seasonal modifiers
    inventory: {},
    resourceProgress: {},
    orders: [],
    tools: { clear: 0, basic: 0, rare: 0, shuffle: 0 },
    built: {},
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    _hintsShown: {},
    almanac: { xp: 0, level: 1 },
    ...overrides,
  };
}

function dispatchHayChain(state, chainLength) {
  return gameReducer(state, {
    type: "CHAIN_COLLECTED",
    payload: {
      key: "tile_grass_hay",
      gained: chainLength,
      upgrades: 0,
      value: 1,
      chainLength,
      resourceKey: "hay_bundle",
    },
  });
}

describe("resourceProgress — accumulation (no rollover)", () => {
  it("chain of 4 hay: progress === 4, inventory.hay_bundle absent, tile key absent", () => {
    expect(HAY_THRESHOLD).toBe(6); // guard: confirm threshold hasn't changed
    const s0 = minState();
    const s1 = dispatchHayChain(s0, 4);
    expect(s1.resourceProgress.hay_bundle).toBe(4);
    expect(s1.inventory.hay_bundle).toBeFalsy();
    expect(s1.inventory.tile_grass_hay).toBeUndefined();
  });
});

describe("resourceProgress — rollover (single)", () => {
  it("chain of 7 hay (threshold 6): inventory += 1, progress === 1", () => {
    const s0 = minState();
    const s1 = dispatchHayChain(s0, 7);
    expect(s1.resourceProgress.hay_bundle).toBe(1); // 7 % 6 = 1
    expect(s1.inventory.hay_bundle).toBe(1);
  });
});

describe("resourceProgress — multi-rollover", () => {
  it("chain of 13 hay: inventory += 2, progress === 1 (13 % 6 = 1, floor(13/6) = 2)", () => {
    const s0 = minState();
    const s1 = dispatchHayChain(s0, 13);
    expect(s1.resourceProgress.hay_bundle).toBe(1); // 13 % 6 = 1
    expect(s1.inventory.hay_bundle).toBe(2);
  });
});

describe("resourceProgress — cross-chain persistence", () => {
  it("two chains of 4 each → running total 8: inventory === 1, progress === 2", () => {
    // First chain: progress 0 → 4 (no rollover)
    const s1 = dispatchHayChain(minState(), 4);
    expect(s1.resourceProgress.hay_bundle).toBe(4);
    expect(s1.inventory.hay_bundle).toBeFalsy();

    // Second chain: progress 4 + 4 = 8 → floor(8/6)=1 rollover, 8%6=2 remainder
    const s2 = dispatchHayChain(s1, 4);
    expect(s2.resourceProgress.hay_bundle).toBe(2);
    expect(s2.inventory.hay_bundle).toBe(1);
  });
});

describe("resourceProgress — TILES_WITH_CUSTOM_OUTPUT (tile_special_dirt)", () => {
  it("chain without resourceKey writes nothing to resourceProgress", () => {
    // tile_special_dirt is in TILES_WITH_CUSTOM_OUTPUT; GameScene dispatches
    // CHAIN_COLLECTED WITHOUT a resourceKey for custom-output tiles.
    // Asserting that omitting resourceKey leaves resourceProgress untouched
    // is the unit-testable equivalent of the custom-output guard.
    const s0 = minState({ resourceProgress: { dirt: 0 } });
    const s1 = gameReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: {
        key: "tile_special_dirt",
        gained: 4,
        upgrades: 0,
        value: 1,
        chainLength: 4,
        // resourceKey intentionally absent — matches what producedResource()
        // returns null for TILES_WITH_CUSTOM_OUTPUT members.
      },
    });
    // resourceProgress.dirt must be unchanged (still 0 / falsy)
    expect(s1.resourceProgress.dirt ?? 0).toBe(0);
    // dirt must not appear in inventory either
    expect(s1.inventory.dirt).toBeUndefined();
  });
});

describe("resourceProgress — cap interaction", () => {
  it("rollover capped at inventory cap; cap floater fires once", () => {
    // Pre-load hay_bundle to 199 (one below cap of 200). A multi-unit rollover
    // that tries to add 2 units (201 total) triggers the cap floater because
    // the check is `cur + amount > cap` (strictly greater than).
    //
    // Setup: progress = 5, chain of 13 → progress 5+13 = 18, floor(18/6) = 3
    // rollovers. addCappedResourceMut(inv, cf, floaters, "hay_bundle", 3, 200):
    //   cur = 199, amount = 3, next = min(200, 202) = 200, 202 > 200 → floater.
    const RESOURCE_CAP = 200; // RESOURCE_CAP_BASE from constants
    const s0 = minState({
      inventory: { hay_bundle: RESOURCE_CAP - 1 }, // 199
      resourceProgress: { hay_bundle: 5 },
      seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0, capFloaters: {} },
      floaters: [],
    });
    const s1 = dispatchHayChain(s0, 13);
    expect(s1.inventory.hay_bundle).toBe(RESOURCE_CAP);
    // capFloaters flag set so a second overflow this season stays silent
    expect(s1.seasonStats?.capFloaters?.hay_bundle).toBe(true);
    // At least one "stash full" floater emitted
    expect(s1.floaters?.some((f) => /stash full/.test(f.text))).toBe(true);
  });

  it("second overflow same season emits no additional floater", () => {
    const RESOURCE_CAP = 200;
    const s0 = minState({
      inventory: { hay_bundle: RESOURCE_CAP }, // already at cap
      resourceProgress: { hay_bundle: 5 },
      seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0, capFloaters: { hay_bundle: true } },
      floaters: [],
    });
    const s1 = dispatchHayChain(s0, 1);
    // Still capped
    expect(s1.inventory.hay_bundle).toBe(RESOURCE_CAP);
    // No new cap floater (capFloater flag already set)
    const capFloaterCount = s1.floaters?.filter((f) => /stash full/.test(f.text)).length ?? 0;
    expect(capFloaterCount).toBe(0);
  });
});

// ─── Task #4: BIOME_GOLD_TILE regression guards ───────────────────────────────
//
// GameScene.nextUpgradeTile() requires a live Phaser Scene context
// (this.biome(), this.registry, etc.) and cannot be directly unit-tested without
// Phaser, which requires `window` — not available in the Vitest jsdom environment.
//
// Instead we verify the underlying constant invariants that BIOME_GOLD_TILE and
// producedResource() rely on. The full upgrade-spawn integration
// (zone upgradeMap → BIOME_GOLD_TILE sentinel → nextUpgradeTile → board spawn)
// must be verified via the visual test suite (npm run test:visual).

describe("BIOME_GOLD_TILE — invariant guards (constants only, no Phaser)", () => {
  it("'fruit' family in TILE_FAMILY_RESOURCE maps to 'pie'", () => {
    // BIOME_GOLD_TILE.farm = "tile_fruit_golden_apple", which is a fruit tile.
    expect(TILE_FAMILY_RESOURCE["fruit"]).toBe("pie");
  });

  it("tile_fruit_golden_apple: tileFamilyResource returns 'pie'", () => {
    // Guards that the family lookup succeeds for the farm gold tile.
    // (producedResource() in GameScene.js delegates to this pure helper.)
    expect(tileFamilyResource("tile_fruit_golden_apple")).toBe("pie");
  });

  it("tile_fruit_golden_apple is NOT in TILES_WITH_CUSTOM_OUTPUT", () => {
    // If it were, producedResource() would return null and progress would
    // never accumulate for chained golden apples.
    expect(TILES_WITH_CUSTOM_OUTPUT.has("tile_fruit_golden_apple")).toBe(false);
  });

  it("tile_mine_gold: tileFamilyResource returns 'gold_bar' (mine biome gold tile)", () => {
    // BIOME_GOLD_TILE.mine = "tile_mine_gold".
    expect(tileFamilyResource("tile_mine_gold")).toBe("gold_bar");
  });

  it("tile_fruit_golden_apple has the expected upgrade threshold (7)", () => {
    // Regression guard: threshold for golden apple is 7 (same as other fruits).
    // If this changes unintentionally, progress rollover math will be wrong.
    expect(UPGRADE_THRESHOLDS["tile_fruit_golden_apple"]).toBe(7);
  });
});
