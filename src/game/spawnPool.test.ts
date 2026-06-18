import { describe, it, expect } from "vitest";
import { buildSpawnPool, resolveUpgradeTile, type SpawnPoolInput } from "./spawnPool.js";
import { ZONE_UPGRADE_TARGET_GOLD } from "../features/zones/data.js";

/** Count occurrences of a key in a pool. */
const count = (pool: string[], k: string): number => pool.filter((x) => x === k).length;

/** Minimal SpawnPoolInput with no-op modifiers; override per test. */
function input(overrides: Partial<SpawnPoolInput>): SpawnPoolInput {
  return {
    basePool: [],
    biomeKey: "mine", // non-farm by default → skips the session filter
    sessionSelectedTiles: [],
    spawnBias: null,
    fertilizer: { armed: false, targetKey: null },
    biomeTileKeys: [],
    poolWeights: {},
    tileCollectionActive: null,
    seasonName: null,
    ...overrides,
  };
}

describe("buildSpawnPool", () => {
  it("does not mutate the caller's basePool", () => {
    const base = ["tile_grass_grass", "tile_grass_grass"];
    buildSpawnPool(input({ basePool: base, spawnBias: { tile_grass_grass: 2 } }));
    expect(base).toEqual(["tile_grass_grass", "tile_grass_grass"]);
  });

  describe("session-selected-tiles filter (farm only)", () => {
    it("drops pool keys whose category is not in the selected zone-categories", () => {
      const out = buildSpawnPool(
        input({
          basePool: ["tile_grass_grass", "tile_grain_wheat"],
          biomeKey: "farm",
          sessionSelectedTiles: ["grass"], // expands to tile-category {grass}
        }),
      );
      expect(out).toEqual(["tile_grass_grass"]); // grain dropped
    });

    it("keeps category-less pool keys (passes them through the filter)", () => {
      const out = buildSpawnPool(
        input({
          basePool: ["tile_grass_grass", "no_category_key"],
          biomeKey: "farm",
          sessionSelectedTiles: ["grass"],
        }),
      );
      expect(out.sort()).toEqual(["no_category_key", "tile_grass_grass"]);
    });

    it("falls back to the unfiltered pool when the filter would empty it", () => {
      const out = buildSpawnPool(
        input({
          basePool: ["tile_grain_wheat"],
          biomeKey: "farm",
          sessionSelectedTiles: ["grass"], // would drop the only grain tile
        }),
      );
      expect(out).toEqual(["tile_grain_wheat"]);
    });

    it("ignores the filter on non-farm biomes", () => {
      const out = buildSpawnPool(
        input({
          basePool: ["tile_grass_grass", "tile_grain_wheat"],
          biomeKey: "mine",
          sessionSelectedTiles: ["grass"],
        }),
      );
      expect(out.sort()).toEqual(["tile_grain_wheat", "tile_grass_grass"]);
    });
  });

  describe("boss spawn bias", () => {
    it("adds round((factor-1)*baseCount) extra copies per key", () => {
      // a appears twice → factor 3 adds round(2*2)=4 → total 6.
      const out = buildSpawnPool(input({ basePool: ["a", "a", "b"], spawnBias: { a: 3 } }));
      expect(count(out, "a")).toBe(6);
      expect(count(out, "b")).toBe(1);
    });

    it("rounds fractional additions", () => {
      // a×3, factor 1.5 → round(3*0.5)=round(1.5)=2 extra → total 5.
      const out = buildSpawnPool(input({ basePool: ["a", "a", "a"], spawnBias: { a: 1.5 } }));
      expect(count(out, "a")).toBe(5);
    });

    it("is a no-op for factor <= 1 (never removes copies)", () => {
      const out = buildSpawnPool(input({ basePool: ["a", "a"], spawnBias: { a: 0.5 } }));
      expect(count(out, "a")).toBe(2);
    });
  });

  describe("fertilizer bias", () => {
    it("doubles the default seedling-tier keys present in the pool", () => {
      const out = buildSpawnPool(
        input({
          basePool: ["seedling", "seedling", "tile_grass_hay", "other"],
          biomeKey: "farm",
          fertilizer: { armed: true, targetKey: null },
        }),
      );
      expect(count(out, "seedling")).toBe(4); // 2 → 4
      expect(count(out, "tile_grass_hay")).toBe(2); // 1 → 2
      expect(count(out, "other")).toBe(1); // untouched
    });

    it("uses a validated target key (its tile_ variant) when armed with a target", () => {
      const out = buildSpawnPool(
        input({
          basePool: ["tile_foo", "x"],
          fertilizer: { armed: true, targetKey: "foo" },
          biomeTileKeys: ["tile_foo"], // validates tile_foo (not bare foo)
        }),
      );
      expect(count(out, "tile_foo")).toBe(2);
      expect(count(out, "x")).toBe(1);
    });

    it("doubles nothing when the target key validates to nothing real", () => {
      const out = buildSpawnPool(
        input({
          basePool: ["zzz_fake", "y"],
          fertilizer: { armed: true, targetKey: "zzz_fake" },
          biomeTileKeys: [], // neither zzz_fake nor tile_zzz_fake is a biome tile
        }),
      );
      // zzz_fake/tile_zzz_fake aren't resources → biasKeys empty → no change.
      expect(out.sort()).toEqual(["y", "zzz_fake"]);
    });

    it("does nothing when not armed", () => {
      const out = buildSpawnPool(
        input({ basePool: ["seedling"], fertilizer: { armed: false, targetKey: null } }),
      );
      expect(count(out, "seedling")).toBe(1);
    });
  });

  it("applies pool-weight modifiers (applySpawnPoolModifiers is wired)", () => {
    const out = buildSpawnPool(input({ basePool: ["a"], poolWeights: { b: 2 } }));
    expect(count(out, "a")).toBe(1);
    expect(count(out, "b")).toBe(2); // category-less b added by weight
  });

  it("never returns an empty pool when the base is non-empty", () => {
    expect(
      buildSpawnPool(
        input({ basePool: ["tile_grain_wheat"], biomeKey: "farm", sessionSelectedTiles: ["grass"] }),
      ).length,
    ).toBeGreaterThan(0);
  });
});

describe("resolveUpgradeTile", () => {
  const WHEAT = { key: "tile_grain_wheat", label: "Wheat" };
  const GRASS = { key: "tile_grass_grass", label: "Grass" };
  const GOLD = { key: "tile_fruit_golden_apple", label: "Golden Apple" };

  it("resolves the player's active tile in the target zone-category", () => {
    // grass (zoneCat grass) → upgradeMap → grain; active grain tile = wheat.
    const r = resolveUpgradeTile({
      tileKey: "tile_grass_grass",
      biomeTiles: [GRASS, WHEAT],
      upgradeMap: { grass: "grain" },
      tileCollectionActive: { grain: "tile_grain_wheat" },
      goldTileKey: null,
    });
    expect(r).toBe(WHEAT);
  });

  it("falls back to the first biome tile in a target tile-category", () => {
    const r = resolveUpgradeTile({
      tileKey: "tile_grass_grass",
      biomeTiles: [GRASS, WHEAT], // WHEAT is category 'grain'
      upgradeMap: { grass: "grain" },
      tileCollectionActive: null,
      goldTileKey: null,
    });
    expect(r).toBe(WHEAT);
  });

  it("honors the GOLD sentinel by returning the biome gold tile", () => {
    const r = resolveUpgradeTile({
      tileKey: "tile_grass_grass",
      biomeTiles: [GRASS, GOLD],
      upgradeMap: { grass: ZONE_UPGRADE_TARGET_GOLD },
      tileCollectionActive: null,
      goldTileKey: "tile_fruit_golden_apple",
    });
    expect(r).toBe(GOLD);
  });

  it("returns null for the GOLD sentinel when the biome has no gold tile", () => {
    expect(
      resolveUpgradeTile({
        tileKey: "tile_grass_grass",
        biomeTiles: [GRASS],
        upgradeMap: { grass: ZONE_UPGRADE_TARGET_GOLD },
        tileCollectionActive: null,
        goldTileKey: null,
      }),
    ).toBeNull();
  });

  describe("returns null", () => {
    const baseArgs = {
      biomeTiles: [GRASS, WHEAT],
      upgradeMap: { grass: "grain" } as Record<string, string | undefined>,
      tileCollectionActive: null,
      goldTileKey: null,
    };

    it("for a tile with custom output", () => {
      expect(resolveUpgradeTile({ ...baseArgs, tileKey: "tile_special_dirt" })).toBeNull();
    });

    it("for an empty / category-less tile key", () => {
      expect(resolveUpgradeTile({ ...baseArgs, tileKey: "" })).toBeNull();
      expect(resolveUpgradeTile({ ...baseArgs, tileKey: "no_category_key" })).toBeNull();
    });

    it("when there is no upgradeMap", () => {
      expect(resolveUpgradeTile({ ...baseArgs, tileKey: "tile_grass_grass", upgradeMap: null })).toBeNull();
    });

    it("when the source zone-category has no upgrade target", () => {
      expect(
        resolveUpgradeTile({ ...baseArgs, tileKey: "tile_grass_grass", upgradeMap: { grain: "trees" } }),
      ).toBeNull();
    });
  });
});
