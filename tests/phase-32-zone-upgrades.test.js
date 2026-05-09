// Phase 32 — Zone-aware chain upgrade redirect.
// Validates the pure helper `nextResourceForZone` from features/zones/data.js
// without bringing Phaser into the test (the GameScene wiring is exercised
// via a thin shim).
import { describe, it, expect } from "vitest";
import {
  ZONES,
  ZONE_TO_TILE_CATEGORIES,
  TILE_CATEGORY_TO_ZONE_CATEGORY,
  ZONE_UPGRADE_TARGET_GOLD,
  nextResourceForZone,
} from "../src/features/zones/data.js";
import { CATEGORY_OF, TILE_TYPES } from "../src/features/tileCollection/data.js";
import { BIOMES } from "../src/constants.js";

const farmResources = BIOMES.farm.resources;

function findResource(key) {
  return farmResources.find((r) => r.key === key);
}

describe("Phase 32 — TILE_CATEGORY_TO_ZONE_CATEGORY reverse mapping", () => {
  it("bird (singular tile category) maps to birds (plural zone category)", () => {
    expect(TILE_CATEGORY_TO_ZONE_CATEGORY.bird).toBe("birds");
  });

  it("trees tile category maps to trees zone category (wood excluded — it's a resource not a tile)", () => {
    expect(TILE_CATEGORY_TO_ZONE_CATEGORY.trees).toBe("trees");
    expect(TILE_CATEGORY_TO_ZONE_CATEGORY.wood).toBeUndefined();
  });

  it("every tile category in the mapping has a zone counterpart", () => {
    for (const [tileCat, zoneCat] of Object.entries(TILE_CATEGORY_TO_ZONE_CATEGORY)) {
      expect(ZONE_TO_TILE_CATEGORIES[zoneCat]).toContain(tileCat);
    }
  });
});

describe("Phase 32 — nextResourceForZone returns null when the zone has no override", () => {
  it("returns null when zoneId is missing", () => {
    const r = nextResourceForZone({
      currentRes: findResource("grass_hay"),
      zoneId: null,
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
    });
    expect(r).toBeNull();
  });

  it("returns null for a resource whose category is not in the zone upgradeMap", () => {
    // Home (basic farm) has no `flowers` source in upgradeMap.
    const flowerRes = findResource("flower_pansy");
    const r = nextResourceForZone({
      currentRes: flowerRes,
      zoneId: "home",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
    });
    expect(r).toBeNull();
  });

  it("returns null when the upgrade target is the gold sentinel", () => {
    // Home: fruits -> gold
    const fruitRes = findResource("fruit_apple");
    const r = nextResourceForZone({
      currentRes: fruitRes,
      zoneId: "home",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
    });
    expect(r).toBeNull();
    // Sanity-check: the zone really does say "gold" for fruits.
    expect(ZONES.home.upgradeMap.fruits).toBe(ZONE_UPGRADE_TARGET_GOLD);
  });
});

describe("Phase 32 — nextResourceForZone redirects per the zone upgradeMap", () => {
  it("Home chain of grass spawns a bird tile (per base farm spec)", () => {
    const grassRes = findResource("grass_hay");
    const r = nextResourceForZone({
      currentRes: grassRes,
      zoneId: "home",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
    });
    expect(r).toBeTruthy();
    expect(CATEGORY_OF[r.key]).toBe("bird");
  });

  it("Home chain of vegetables redirects to fruits (instead of veg .next chain)", () => {
    const vegRes = findResource("veg_carrot");
    const r = nextResourceForZone({
      currentRes: vegRes,
      zoneId: "home",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
    });
    expect(r).toBeTruthy();
    expect(CATEGORY_OF[r.key]).toBe("fruits");
  });

  it("returns null for flowers on a zone whose upgradeMap has no flowers entry", () => {
    // Flowers are in ZONE_CATEGORIES but no current zone configures them.
    // nextResourceForZone returns null and the caller falls back to native .next chain.
    const flowerRes = findResource("flower_pansy");
    const r = nextResourceForZone({
      currentRes: flowerRes,
      zoneId: "orchard",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
    });
    expect(r).toBeNull();
    expect(ZONES.orchard.upgradeMap.flowers).toBeUndefined();
  });
});

describe("Phase 32 — nextResourceForZone honours the player's active species", () => {
  it("prefers the active species when one is set for the target category", () => {
    // Home: grass -> birds. Force an active bird species.
    const allBirds = TILE_TYPES.filter((t) => t.category === "bird");
    expect(allBirds.length).toBeGreaterThan(1);
    const desired = allBirds[allBirds.length - 1];
    const tileCollectionActive = { bird: desired.id };
    const r = nextResourceForZone({
      currentRes: findResource("grass_hay"),
      zoneId: "home",
      biomeResources: farmResources,
      tileCollectionActive,
      categoryOf: CATEGORY_OF,
    });
    // Resolution prefers the active species when the resource exists on the
    // biome; some species are visual-only so we accept either the active key
    // or any bird as a safe lower bound.
    if (farmResources.some((res) => res.key === desired.id)) {
      expect(r.key).toBe(desired.id);
    } else {
      expect(CATEGORY_OF[r.key]).toBe("bird");
    }
  });
});
