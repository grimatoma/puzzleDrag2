/**
 * Focused tests for the two EXPORTED pure functions in
 * `src/game/producedResource.ts` that its co-located `producedResource.test.ts`
 * does NOT cover: the reverse resource→tile lookup and the CHAIN_UPDATE payload
 * builder. Both are pulled out of GameScene precisely so they can be tested
 * without booting Phaser, yet only `producedResource` had a co-located test.
 *
 * (The third export, `producedResource`, is already covered by
 * `src/game/producedResource.test.ts` and is not re-tested here.)
 */
import { describe, it, expect } from "vitest";
import {
  producingTileForResource,
  producedResource,
  buildChainUpdatePayload,
  type ChainUpdateArgs,
} from "../game/producedResource.js";
import { getItem } from "../constants.js";

describe("producingTileForResource (reverse resource → producing tile)", () => {
  it("maps a terminal resource back to its canonical lowest-tier producing tile", () => {
    // Exact values verified against the live TILE_TYPES catalog.
    expect(producingTileForResource("flour")).toEqual({ id: "tile_grain_wheat", displayName: "Wheat" });
    expect(producingTileForResource("hay_bundle")).toEqual({ id: "tile_grass_grass", displayName: "Grass" });
    expect(producingTileForResource("plank")).toEqual({ id: "tile_tree_oak", displayName: "Oak" });
    expect(producingTileForResource("iron_bar")).toEqual({ id: "tile_mine_iron_ore", displayName: "Ore" });
  });

  it("is a true inverse of producedResource for the tile it returns", () => {
    // Whatever tile it names as the producer must actually produce that resource.
    for (const resKey of ["flour", "hay_bundle", "plank", "iron_bar", "eggs", "soup"]) {
      const producer = producingTileForResource(resKey);
      expect(producer, `no producer found for ${resKey}`).not.toBeNull();
      expect(producedResource({ key: producer!.id })).toBe(resKey);
    }
  });

  it("returns null for a resource no board tile produces and for meta-currencies", () => {
    expect(producingTileForResource("zzz_not_a_resource")).toBeNull();
    expect(producingTileForResource("coins")).toBeNull(); // meta-currency, not a produced resource
    expect(producingTileForResource("")).toBeNull();
  });

  it("returns a stable (cached) result across repeated calls", () => {
    const a = producingTileForResource("flour");
    const b = producingTileForResource("flour");
    expect(a).toEqual(b);
  });
});

describe("buildChainUpdatePayload", () => {
  /** A path whose tiles all produce from `res.key` (index 0 drives the payload). */
  const wheatPath = (n: number): ChainUpdateArgs["path"] =>
    Array.from({ length: n }, () => ({ res: { key: "tile_grain_wheat", label: "Wheat" } }));

  it("returns an all-empty, VALID payload for a zero-length path", () => {
    const out = buildChainUpdatePayload({
      path: [],
      nextUpgradeTile: () => null,
      effectiveMinChain: 3,
    });
    expect(out).toEqual({
      count: 0,
      upgrades: 0,
      valid: true, // n === 0 is treated as valid (no in-progress chain)
      minChain: 3,
      nextTileProgress: null,
      resourceKey: null,
      resourceLabel: null,
      tileKey: null,
      tileLabel: null,
    });
  });

  it("computes upgrades = floor(count / threshold) and the produced resource for a valid chain", () => {
    // threshold 5 for tile_grain_wheat, chain of 12 → floor(12/5) = 2 upgrades.
    const out = buildChainUpdatePayload({
      path: wheatPath(12),
      nextUpgradeTile: () => ({ key: "tile_grain_corn", label: "Corn" }),
      effectiveThresholds: { tile_grain_wheat: 5 },
      effectiveMinChain: 3,
    });
    expect(out.count).toBe(12);
    expect(out.upgrades).toBe(2);
    expect(out.valid).toBe(true);
    expect(out.minChain).toBe(3);
    expect(out.nextTileProgress).toEqual({
      current: 12,
      threshold: 5,
      targetLabel: "Corn",
      targetKey: "tile_grain_corn",
    });
    // The chain tile is wheat; its produced resource is flour (family default).
    expect(out.tileKey).toBe("tile_grain_wheat");
    expect(out.resourceKey).toBe("flour");
    expect(out.resourceLabel).toBe(getItem("flour")!.label);
  });

  it("marks a chain shorter than effectiveMinChain as invalid", () => {
    const out = buildChainUpdatePayload({
      path: wheatPath(2),
      nextUpgradeTile: () => ({ key: "tile_grain_corn", label: "Corn" }),
      effectiveThresholds: { tile_grain_wheat: 5 },
      effectiveMinChain: 3,
    });
    expect(out.valid).toBe(false); // 2 < 3
    expect(out.count).toBe(2);
    expect(out.upgrades).toBe(0); // floor(2/5)
  });

  it("omits nextTileProgress when nextUpgradeTile yields nothing", () => {
    const out = buildChainUpdatePayload({
      path: wheatPath(8),
      nextUpgradeTile: () => null, // no upgrade target
      effectiveThresholds: { tile_grain_wheat: 5 },
      effectiveMinChain: 3,
    });
    expect(out.nextTileProgress).toBeNull();
    expect(out.upgrades).toBe(0); // no `next` ⇒ upgrade count short-circuits to 0
    expect(out.count).toBe(8);
    expect(out.valid).toBe(true);
  });

  it("falls back to UPGRADE_THRESHOLDS for the progress bar but NOT for the upgrade count", () => {
    // When effectiveThresholds omits the resource, the progress-bar threshold
    // falls back to the real UPGRADE_THRESHOLDS (wheat = 5), so nextTileProgress
    // is still shown — but `upgrades` reads ONLY the passed (empty) map, so it
    // short-circuits to 0. This asymmetry is intentional scene behaviour.
    const out = buildChainUpdatePayload({
      path: wheatPath(8),
      nextUpgradeTile: () => ({ key: "tile_grain_corn", label: "Corn" }),
      effectiveThresholds: {}, // wheat absent from the override map
      effectiveMinChain: 3,
    });
    expect(out.nextTileProgress).toEqual({
      current: 8,
      threshold: 5, // real UPGRADE_THRESHOLDS.tile_grain_wheat
      targetLabel: "Corn",
      targetKey: "tile_grain_corn",
    });
    expect(out.upgrades).toBe(0); // upgradeCountForChain saw the empty override → 0
  });

  it("uses the resource key/label directly when the tile has no produced resource", () => {
    // A special-output tile (producedResource → null) still reports its own key.
    const out = buildChainUpdatePayload({
      path: [{ res: { key: "tile_special_dirt", label: "Dirt Tile" } }],
      nextUpgradeTile: () => null,
      effectiveThresholds: {},
      effectiveMinChain: 3,
    });
    expect(producedResource({ key: "tile_special_dirt" })).toBeNull(); // sanity
    expect(out.resourceKey).toBe("tile_special_dirt");
    expect(out.resourceLabel).toBe("Dirt Tile");
    expect(out.tileKey).toBe("tile_special_dirt");
  });
});
