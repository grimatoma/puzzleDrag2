// Regression tests for the BIOMES data split (Task 3b):
//   biome.tiles — kind:"tile" entries only
//   biome.resources — kind:"resource" entries only
//   biome.resourceOrderPool — resource keys produced by chaining biome tiles
//   resourceByKey — canonical single impl via ITEMS lookup
//   makeOrder — order pool is now resource-keyed

import { describe, it, expect } from "vitest";
import { BIOMES, ITEMS } from "../constants.js";
import { resourceByKey, makeOrder } from "../state/helpers.js";

describe("BIOMES data split — tiles vs resources", () => {
  for (const [biomeName, biome] of Object.entries(BIOMES)) {
    it(`BIOMES.${biomeName}.tiles contains only kind:"tile" entries`, () => {
      expect(Array.isArray(biome.tiles)).toBe(true);
      expect(biome.tiles.length).toBeGreaterThan(0);
      for (const entry of biome.tiles) {
        expect(entry.kind, `${entry.key} in ${biomeName}.tiles`).toBe("tile");
      }
    });

    it(`BIOMES.${biomeName}.resources contains only kind:"resource" entries`, () => {
      expect(Array.isArray(biome.resources)).toBe(true);
      expect(biome.resources.length).toBeGreaterThan(0);
      for (const entry of biome.resources) {
        expect(entry.kind, `${entry.key} in ${biomeName}.resources`).toBe("resource");
      }
    });

    it(`BIOMES.${biomeName}.tiles and .resources are disjoint`, () => {
      const tileKeys = new Set(biome.tiles.map((t) => t.key));
      for (const r of biome.resources) {
        expect(tileKeys.has(r.key), `${r.key} should not appear in both`).toBe(false);
      }
    });
  }
});

describe("BIOMES.farm.resourceOrderPool", () => {
  it("is non-empty", () => {
    expect(Array.isArray(BIOMES.farm.resourceOrderPool)).toBe(true);
    expect(BIOMES.farm.resourceOrderPool.length).toBeGreaterThan(0);
  });

  it("every entry has kind:\"resource\" in ITEMS", () => {
    for (const key of BIOMES.farm.resourceOrderPool) {
      expect(ITEMS[key]?.kind, `${key} in farm.resourceOrderPool`).toBe("resource");
    }
  });

  it("contains no duplicates", () => {
    const pool = BIOMES.farm.resourceOrderPool;
    expect(new Set(pool).size).toBe(pool.length);
  });
});

describe("BIOMES.mine.resourceOrderPool", () => {
  it("is non-empty", () => {
    expect(BIOMES.mine.resourceOrderPool.length).toBeGreaterThan(0);
  });

  it("every entry is a resource key", () => {
    for (const key of BIOMES.mine.resourceOrderPool) {
      expect(ITEMS[key]?.kind).toBe("resource");
    }
  });
});

describe("BIOMES.fish.resourceOrderPool", () => {
  it("is non-empty", () => {
    expect(BIOMES.fish.resourceOrderPool.length).toBeGreaterThan(0);
  });

  it("every entry is a resource key", () => {
    for (const key of BIOMES.fish.resourceOrderPool) {
      expect(ITEMS[key]?.kind).toBe("resource");
    }
  });
});

describe("canonical resourceByKey via ITEMS", () => {
  it("returns a tile def for a tile key", () => {
    const r = resourceByKey("tile_grass_grass");
    expect(r).not.toBeNull();
    expect(r.key).toBe("tile_grass_grass");
    expect(r.kind).toBe("tile");
  });

  it("returns a resource def for a resource key", () => {
    const r = resourceByKey("hay_bundle");
    expect(r).not.toBeNull();
    expect(r.key).toBe("hay_bundle");
    expect(r.kind).toBe("resource");
  });

  it("returns null for an unknown key", () => {
    expect(resourceByKey("nonexistent_key_xyz")).toBeNull();
  });

  it("returns null for falsy input", () => {
    expect(resourceByKey(null)).toBeNull();
    expect(resourceByKey("")).toBeNull();
    expect(resourceByKey(undefined)).toBeNull();
  });
});

describe("makeOrder — resource-keyed order pool", () => {
  it("order key is always a resource (kind:\"resource\")", () => {
    // Run makeOrder 20 times; each returned key must be a resource.
    for (let i = 0; i < 20; i++) {
      const order = makeOrder("farm", 1);
      expect(order.key, `order.key="${order.key}" should be resource`).toBeDefined();
      const item = ITEMS[order.key];
      // Crafted-item orders may produce crafted resource keys not necessarily
      // matching kind:"resource" (at level < 3 crafted path is off).
      // We're at level 1 so the crafted branch is skipped.
      expect(item?.kind, `ITEMS["${order.key}"].kind`).toBe("resource");
    }
  });

  it("mine order key is a mine resource", () => {
    for (let i = 0; i < 10; i++) {
      const order = makeOrder("mine", 1);
      // Should not be a tile key
      const item = ITEMS[order.key];
      if (item) expect(item.kind).not.toBe("tile");
    }
  });
});
