/**
 * Tests for src/balanceManager/wiki/lede.ts
 *
 * TDD — written before the implementation. Uses real keys from live maps; no fakes.
 *
 * Coverage:
 *  1. resource lede mentions "resource"
 *  2. recipe lede mentions craft/recipe
 *  3. tile lede mentions "tile"
 *  4. building lede mentions "building"
 *  5. zone lede mentions "zone"
 *  6. npc lede mentions "townsperson"
 *  7. worker lede mentions "worker"
 *  8. ability lede mentions "attribute"
 *  9. toolPower lede mentions "tool power"
 * 10. hazard lede mentions "hazard"
 * 11. boss lede mentions "boss"
 * 12. season lede mentions "season"
 * 13. settlementBiome lede mentions "biome"
 * 14. category lede mentions "category"
 * 15. tileDiscoveryMethod lede mentions "discovery"
 * 16. view lede mentions "view"
 * 17. modal lede mentions "modal"
 * 18. non-WIRED status appended to lede (bosses → PARTIAL)
 * 19. null entity does not throw
 * 20. deterministic: same args → same string on two calls
 * 21. unknown concept does not throw
 */

import { describe, it, expect } from "vitest";
import { ledeFor } from "./lede.js";
import { getEntity } from "./conceptEntities.js";
import { canonicalRecipeEntries } from "../recipeCatalog.js";
import { CONCEPTS } from "./concepts.js";
import { conceptForKey } from "./conceptEntities.js";

// ─── Real key resolution (mirrors approach in relations.test.ts) ──────────────

// A real resource: bread is a canonical resource with a known recipe
const realResourceKey = "bread";
const realResourceEntity = getEntity("resources", realResourceKey) as Record<string, unknown>;

// A real recipe: rec_bread is confirmed via status.test.ts
const realRecipeKey = "rec_bread";
const realRecipeEntity = getEntity("recipes", realRecipeKey) as Record<string, unknown>;

// A real tile with a `next` field (mirrors relations.test.ts approach)
const tilesConcept = CONCEPTS.find((c) => c.id === "tiles")!;
const allTiles = tilesConcept.getEntries();
const tileWithNext = allTiles.find((e) => {
  const entity = getEntity("tiles", e.key) as Record<string, unknown> | null;
  return entity?.next != null && typeof entity.next === "string";
});
const realTileKey = tileWithNext!.key;
const realTileEntity = getEntity("tiles", realTileKey) as Record<string, unknown>;

// A real building: bakery is confirmed via status.test.ts
const realBuildingKey = "bakery";
const realBuildingEntity = getEntity("buildings", realBuildingKey) as Record<string, unknown>;

// A real zone with buildings
const { ZONES } = await import("../../features/zones/data.js");
const zoneWithBuildings = Object.entries(ZONES).find(
  ([, z]) =>
    Array.isArray((z as Record<string, unknown>).buildings) &&
    ((z as Record<string, unknown>).buildings as string[]).length > 0,
);
const realZoneKey = zoneWithBuildings![0];
const realZoneEntity = zoneWithBuildings![1] as Record<string, unknown>;

// A real NPC (first key)
const { NPC_DATA } = await import("../../features/npcs/data.js");
const realNpcKey = Object.keys(NPC_DATA)[0]!;
const realNpcEntity = getEntity("npcs", realNpcKey) as Record<string, unknown> | null;

// A real worker with abilities
const { TYPE_WORKERS } = await import("../../features/workers/data.js");
const workerWithAbilities = TYPE_WORKERS.find(
  (w) => Array.isArray(w.abilities) && w.abilities.length > 0,
)!;
const realWorkerKey = workerWithAbilities.id;
const realWorkerEntity = getEntity("workers", realWorkerKey) as Record<string, unknown>;

// A real ability
const { ABILITIES } = await import("../../config/abilities.js");
const realAbilityKey = (ABILITIES as Array<{ id: string }>)[0]!.id;
const realAbilityEntity = getEntity("abilities", realAbilityKey) as Record<string, unknown>;

// A real tool power
const { TOOL_POWERS } = await import("../../config/toolPowers.js");
const realToolPowerKey = (TOOL_POWERS as Array<{ id: string }>)[0]!.id;
const realToolPowerEntity = getEntity("toolPowers", realToolPowerKey) as Record<string, unknown>;

// A real hazard (mine — cave_in confirmed WIRED)
const realHazardKey = "cave_in";
const realHazardEntity = getEntity("hazards", realHazardKey) as Record<string, unknown>;

// A real boss
const { BOSSES } = await import("../../features/bosses/data.js");
const realBossKey = (BOSSES as Array<{ id: string }>)[0]!.id;
const realBossEntity = getEntity("bosses", realBossKey) as Record<string, unknown>;

// A real season (uses name field)
const { SEASONS } = await import("../../constants.js");
const realSeasonKey = (SEASONS as Array<{ name: string }>)[0]!.name;
const realSeasonEntity = getEntity("seasons", realSeasonKey) as Record<string, unknown>;

// A real settlementBiome
const { SETTLEMENT_BIOMES } = await import("../../constants.js");
const allSettlementBiomes = Object.values(SETTLEMENT_BIOMES).flat() as Array<{ id: string }>;
const realSettlementBiomeKey = allSettlementBiomes[0]!.id;
const realSettlementBiomeEntity = getEntity("settlementBiomes", realSettlementBiomeKey) as Record<string, unknown>;

// A real category
const { ZONE_CATEGORIES } = await import("../../features/zones/data.js");
const realCategoryKey = (ZONE_CATEGORIES as string[])[0]!;
const realCategoryEntity = getEntity("categories", realCategoryKey) as Record<string, unknown>;

// A real tileDiscoveryMethod
const { TILE_DISCOVERY_METHODS } = await import("../../config/tileDiscoveryMethods.js");
const realTileDiscoveryKey = (TILE_DISCOVERY_METHODS as Array<{ id: string }>)[0]!.id;
const realTileDiscoveryEntity = getEntity("tileDiscoveryMethods", realTileDiscoveryKey) as Record<string, unknown>;

// A real view and modal
const { KNOWN_VIEWS, KNOWN_MODALS } = await import("../../router.js");
const realViewKey = [...KNOWN_VIEWS][0]!;
const realViewEntity = getEntity("views", realViewKey) as Record<string, unknown>;
const realModalKey = [...KNOWN_MODALS][0]!;
const realModalEntity = getEntity("modals", realModalKey) as Record<string, unknown>;

// ─── Per-concept lede tests ───────────────────────────────────────────────────

describe("ledeFor — resources", () => {
  it("mentions 'resource' in the lede", () => {
    const lede = ledeFor("resources", realResourceKey, realResourceEntity);
    expect(lede).toMatch(/resource/i);
  });

  it("is a non-empty string", () => {
    const lede = ledeFor("resources", realResourceKey, realResourceEntity);
    expect(lede.length).toBeGreaterThan(0);
  });
});

describe("ledeFor — recipes", () => {
  it("mentions 'craft' or 'recipe' in the lede", () => {
    const lede = ledeFor("recipes", realRecipeKey, realRecipeEntity);
    expect(lede).toMatch(/craft|recipe/i);
  });

  it("is a non-empty string", () => {
    const lede = ledeFor("recipes", realRecipeKey, realRecipeEntity);
    expect(lede.length).toBeGreaterThan(0);
  });
});

describe("ledeFor — tiles", () => {
  it("mentions 'tile' in the lede", () => {
    const lede = ledeFor("tiles", realTileKey, realTileEntity);
    expect(lede).toMatch(/tile/i);
  });

  it("is a non-empty string", () => {
    const lede = ledeFor("tiles", realTileKey, realTileEntity);
    expect(lede.length).toBeGreaterThan(0);
  });
});

describe("ledeFor — buildings", () => {
  it("mentions 'building' in the lede", () => {
    const lede = ledeFor("buildings", realBuildingKey, realBuildingEntity);
    expect(lede).toMatch(/building/i);
  });
});

describe("ledeFor — zones", () => {
  it("mentions 'zone' in the lede", () => {
    const lede = ledeFor("zones", realZoneKey, realZoneEntity);
    expect(lede).toMatch(/zone/i);
  });
});

describe("ledeFor — npcs", () => {
  it("mentions 'townsperson' in the lede", () => {
    const lede = ledeFor("npcs", realNpcKey, realNpcEntity);
    expect(lede).toMatch(/townsperson/i);
  });
});

describe("ledeFor — workers", () => {
  it("mentions 'worker' in the lede", () => {
    const lede = ledeFor("workers", realWorkerKey, realWorkerEntity);
    expect(lede).toMatch(/worker/i);
  });
});

describe("ledeFor — abilities", () => {
  it("mentions 'attribute' in the lede", () => {
    const lede = ledeFor("abilities", realAbilityKey, realAbilityEntity);
    expect(lede).toMatch(/attribute/i);
  });
});

describe("ledeFor — toolPowers", () => {
  it("mentions 'tool power' in the lede", () => {
    const lede = ledeFor("toolPowers", realToolPowerKey, realToolPowerEntity);
    expect(lede).toMatch(/tool power/i);
  });
});

describe("ledeFor — hazards", () => {
  it("mentions 'hazard' in the lede", () => {
    const lede = ledeFor("hazards", realHazardKey, realHazardEntity);
    expect(lede).toMatch(/hazard/i);
  });
});

describe("ledeFor — bosses", () => {
  it("mentions 'boss' in the lede", () => {
    const lede = ledeFor("bosses", realBossKey, realBossEntity);
    expect(lede).toMatch(/boss/i);
  });
});

describe("ledeFor — seasons", () => {
  it("mentions 'season' in the lede", () => {
    const lede = ledeFor("seasons", realSeasonKey, realSeasonEntity);
    expect(lede).toMatch(/season/i);
  });
});

describe("ledeFor — settlementBiomes", () => {
  it("mentions 'biome' in the lede", () => {
    const lede = ledeFor("settlementBiomes", realSettlementBiomeKey, realSettlementBiomeEntity);
    expect(lede).toMatch(/biome/i);
  });
});

describe("ledeFor — categories", () => {
  it("mentions 'category' in the lede", () => {
    const lede = ledeFor("categories", realCategoryKey, realCategoryEntity);
    expect(lede).toMatch(/category/i);
  });
});

describe("ledeFor — tileDiscoveryMethods", () => {
  it("mentions 'discovery' in the lede", () => {
    const lede = ledeFor("tileDiscoveryMethods", realTileDiscoveryKey, realTileDiscoveryEntity);
    expect(lede).toMatch(/discovery/i);
  });
});

describe("ledeFor — views", () => {
  it("mentions 'view' in the lede", () => {
    const lede = ledeFor("views", realViewKey, realViewEntity);
    expect(lede).toMatch(/view/i);
  });
});

describe("ledeFor — modals", () => {
  it("mentions 'modal' in the lede", () => {
    const lede = ledeFor("modals", realModalKey, realModalEntity);
    expect(lede).toMatch(/modal/i);
  });
});

// ─── Status suffix ────────────────────────────────────────────────────────────

describe("ledeFor — status suffix", () => {
  it("appends (PARTIAL) for a non-WIRED concept (bosses)", () => {
    const lede = ledeFor("bosses", realBossKey, realBossEntity);
    expect(lede).toMatch(/\(PARTIAL\)/);
  });

  it("does NOT append a status suffix for a WIRED entity", () => {
    const lede = ledeFor("resources", realResourceKey, realResourceEntity);
    expect(lede).not.toMatch(/\(WIRED\)/);
  });

  it("appends (WIRED) for mine hazards (entity-level override)", () => {
    // cave_in has entity-level WIRED override even though concept is PARTIAL
    const lede = ledeFor("hazards", "cave_in", realHazardEntity);
    // WIRED → no suffix
    expect(lede).not.toMatch(/\(WIRED\)/);
    expect(lede).not.toMatch(/\(PARTIAL\)/);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("ledeFor — edge cases", () => {
  it("does not throw on null entity", () => {
    expect(() => ledeFor("tiles", "nope", null)).not.toThrow();
  });

  it("returns a non-empty string for null entity", () => {
    const lede = ledeFor("tiles", "nope", null);
    expect(lede.length).toBeGreaterThan(0);
  });

  it("does not throw for an unknown concept", () => {
    expect(() => ledeFor("__unknown__", "any_key", null)).not.toThrow();
  });

  it("is deterministic: same args produce identical output on two calls", () => {
    const a = ledeFor("resources", realResourceKey, realResourceEntity);
    const b = ledeFor("resources", realResourceKey, realResourceEntity);
    expect(a).toBe(b);
  });

  it("is deterministic: same recipe args produce identical output on two calls", () => {
    const a = ledeFor("recipes", realRecipeKey, realRecipeEntity);
    const b = ledeFor("recipes", realRecipeKey, realRecipeEntity);
    expect(a).toBe(b);
  });
});
