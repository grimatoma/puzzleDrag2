/**
 * Unit tests for src/balanceManager/wiki/relations.ts
 *
 * Uses real keys from live maps — no fakes or stubs.
 */

import { describe, it, expect } from "vitest";
import { relationsFor } from "./relations.js";
import { getEntity, conceptForKey } from "./conceptEntities.js";
import { ZONES } from "../../features/zones/data.js";
import { CONCEPTS } from "./concepts.js";
import { NPC_DATA } from "../../features/npcs/data.js";
import { canonicalRecipeEntries } from "../recipeCatalog.js";

// ─── Resolve real keys from live maps ────────────────────────────────────────

// A zone with at least one building
const zoneWithBuildings = Object.entries(ZONES).find(
  ([, z]) => Array.isArray((z as Record<string, unknown>).buildings) &&
    ((z as Record<string, unknown>).buildings as string[]).length > 0,
);
const realZoneId = zoneWithBuildings![0];
const realZoneEntity = zoneWithBuildings![1] as Record<string, unknown>;

// A real recipe with station and inputs (bakery makes bread)
const bakeryRecipes = canonicalRecipeEntries().filter(([, r]) => r.station === "bakery");
const [realRecipeId, realRecipeDto] = bakeryRecipes[0]!;

// A real tile with a `next` field
const tilesConcept = CONCEPTS.find((c) => c.id === "tiles")!;
const allTiles = tilesConcept.getEntries();
const tileWithNext = allTiles.find((e) => {
  const entity = getEntity("tiles", e.key) as Record<string, unknown> | null;
  return entity?.next != null && typeof entity.next === "string";
});
const realTileKey = tileWithNext!.key;
const realTileEntity = getEntity("tiles", realTileKey) as Record<string, unknown>;

// A real resource that is a recipe input (flour is used in many bakery recipes)
const recipesList = canonicalRecipeEntries();
const resourcesInRecipes = new Set<string>();
const resourcesAsOutput = new Set<string>();
for (const [recId, rec] of recipesList) {
  for (const k of Object.keys(rec.inputs)) {
    if (conceptForKey(k) === "resources") resourcesInRecipes.add(k);
  }
  if (conceptForKey(rec.item) === "resources") resourcesAsOutput.add(rec.item);
  void recId;
}
const realResourceInput = [...resourcesInRecipes][0]!;
const realResourceOutput = [...resourcesAsOutput][0]!;

// A real NPC with loves/likes
const realNpcId = Object.keys(NPC_DATA)[0]!;
const realNpcData = (NPC_DATA as Record<string, { loves: string[]; likes: string[] }>)[realNpcId];

// ─── Zone → Buildings ─────────────────────────────────────────────────────────

describe("relationsFor — zones", () => {
  it("returns a 'Buildings' group with resolving links for a zone with buildings", () => {
    const groups = relationsFor("zones", realZoneId, realZoneEntity);
    const buildingGroup = groups.find((g) => g.title === "Buildings");
    expect(buildingGroup, "Expected a 'Buildings' group").not.toBeUndefined();
    expect(buildingGroup!.links.length).toBeGreaterThan(0);
    // All links must resolve via getEntity
    for (const link of buildingGroup!.links) {
      expect(link.conceptId).toBe("buildings");
      expect(getEntity(link.conceptId, link.key)).not.toBeNull();
    }
  });

  it("all building links have a non-empty label", () => {
    const groups = relationsFor("zones", realZoneId, realZoneEntity);
    const buildingGroup = groups.find((g) => g.title === "Buildings")!;
    for (const link of buildingGroup.links) {
      expect(link.label.length).toBeGreaterThan(0);
    }
  });
});

// ─── Recipe → Station / Output / Ingredients ──────────────────────────────────

describe("relationsFor — recipes", () => {
  const recipeEntity = getEntity("recipes", realRecipeId) as Record<string, unknown>;

  it("includes a 'Station' group pointing to the correct building", () => {
    const groups = relationsFor("recipes", realRecipeId, recipeEntity);
    const stationGroup = groups.find((g) => g.title === "Station");
    expect(stationGroup, "Expected a 'Station' group").not.toBeUndefined();
    expect(stationGroup!.links).toHaveLength(1);
    expect(stationGroup!.links[0].conceptId).toBe("buildings");
    expect(stationGroup!.links[0].key).toBe(realRecipeDto.station);
    expect(getEntity("buildings", stationGroup!.links[0].key)).not.toBeNull();
  });

  it("includes an 'Output' group whose link uses the correct item concept", () => {
    const groups = relationsFor("recipes", realRecipeId, recipeEntity);
    const outputGroup = groups.find((g) => g.title === "Output");
    expect(outputGroup, "Expected an 'Output' group").not.toBeUndefined();
    expect(outputGroup!.links).toHaveLength(1);
    const outputLink = outputGroup!.links[0];
    // The concept must match what conceptForKey would return
    const expectedConcept = conceptForKey(realRecipeDto.item);
    expect(outputLink.conceptId).toBe(expectedConcept);
    expect(outputLink.key).toBe(realRecipeDto.item);
    expect(getEntity(outputLink.conceptId, outputLink.key)).not.toBeNull();
  });

  it("includes an 'Ingredients' group with at least one resolving link", () => {
    const groups = relationsFor("recipes", realRecipeId, recipeEntity);
    const ingredientsGroup = groups.find((g) => g.title === "Ingredients");
    expect(ingredientsGroup, "Expected an 'Ingredients' group").not.toBeUndefined();
    expect(ingredientsGroup!.links.length).toBeGreaterThan(0);
    for (const link of ingredientsGroup!.links) {
      expect(link.conceptId).not.toBeNull();
      expect(getEntity(link.conceptId, link.key)).not.toBeNull();
    }
  });

  it("ingredient output concept is 'resources' when the output is a resource", () => {
    const groups = relationsFor("recipes", realRecipeId, recipeEntity);
    const outputGroup = groups.find((g) => g.title === "Output")!;
    // bread is a resource
    if (realRecipeDto.item === "bread" || conceptForKey(realRecipeDto.item) === "resources") {
      expect(outputGroup.links[0].conceptId).toBe("resources");
    }
  });
});

// ─── Tile → Produces ──────────────────────────────────────────────────────────

describe("relationsFor — tiles (next → Produces)", () => {
  it("returns a 'Produces' group linking to the resource", () => {
    const groups = relationsFor("tiles", realTileKey, realTileEntity);
    const producesGroup = groups.find((g) => g.title === "Produces");
    expect(producesGroup, `Expected 'Produces' group for tile ${realTileKey}`).not.toBeUndefined();
    expect(producesGroup!.links).toHaveLength(1);
    const link = producesGroup!.links[0];
    expect(link.key).toBe(realTileEntity.next);
    expect(getEntity(link.conceptId, link.key)).not.toBeNull();
  });
});

// ─── Resource — Used in recipes / Crafted by ─────────────────────────────────

describe("relationsFor — resources (recipe cross-refs)", () => {
  it("returns a 'Used in recipes' group for a resource that appears as a recipe input", () => {
    const entity = getEntity("resources", realResourceInput) as Record<string, unknown> | null;
    const groups = relationsFor("resources", realResourceInput, entity);
    const usedInGroup = groups.find((g) => g.title === "Used in recipes");
    expect(usedInGroup, `Expected 'Used in recipes' group for resource ${realResourceInput}`).not.toBeUndefined();
    expect(usedInGroup!.links.length).toBeGreaterThan(0);
    for (const link of usedInGroup!.links) {
      expect(link.conceptId).toBe("recipes");
      expect(getEntity(link.conceptId, link.key)).not.toBeNull();
    }
  });

  it("returns a 'Crafted by' group for a resource that is a recipe output", () => {
    const entity = getEntity("resources", realResourceOutput) as Record<string, unknown> | null;
    const groups = relationsFor("resources", realResourceOutput, entity);
    const craftedByGroup = groups.find((g) => g.title === "Crafted by");
    expect(craftedByGroup, `Expected 'Crafted by' group for resource ${realResourceOutput}`).not.toBeUndefined();
    expect(craftedByGroup!.links.length).toBeGreaterThan(0);
    for (const link of craftedByGroup!.links) {
      expect(link.conceptId).toBe("recipes");
      expect(getEntity(link.conceptId, link.key)).not.toBeNull();
    }
  });
});

// ─── NPC → Loves / Likes ─────────────────────────────────────────────────────

describe("relationsFor — npcs", () => {
  it("returns 'Loves' and 'Likes' groups for a real NPC", () => {
    const entity = getEntity("npcs", realNpcId) as Record<string, unknown> | null;
    const groups = relationsFor("npcs", realNpcId, entity);
    const lovesGroup = groups.find((g) => g.title === "Loves");
    const likesGroup = groups.find((g) => g.title === "Likes");
    expect(lovesGroup, "Expected 'Loves' group").not.toBeUndefined();
    expect(likesGroup, "Expected 'Likes' group").not.toBeUndefined();
  });

  it("Loves group links match the NPC's loves list", () => {
    const entity = getEntity("npcs", realNpcId) as Record<string, unknown> | null;
    const groups = relationsFor("npcs", realNpcId, entity);
    const lovesGroup = groups.find((g) => g.title === "Loves")!;
    // Every key in lovesGroup.links must come from realNpcData.loves
    for (const link of lovesGroup.links) {
      expect(realNpcData.loves).toContain(link.key);
      expect(getEntity(link.conceptId, link.key)).not.toBeNull();
    }
  });

  it("Likes group links match the NPC's likes list", () => {
    const entity = getEntity("npcs", realNpcId) as Record<string, unknown> | null;
    const groups = relationsFor("npcs", realNpcId, entity);
    const likesGroup = groups.find((g) => g.title === "Likes")!;
    for (const link of likesGroup.links) {
      expect(realNpcData.likes).toContain(link.key);
      expect(getEntity(link.conceptId, link.key)).not.toBeNull();
    }
  });
});

// ─── Fail-safe: bogus references are dropped ─────────────────────────────────

describe("relationsFor — fail-safe (bogus references yield no links)", () => {
  it("drops a building reference that does not resolve", () => {
    const fakeEntity: Record<string, unknown> = {
      id: "fake_zone",
      buildings: ["__nope__", "__also_bogus__"],
    };
    const groups = relationsFor("zones", "fake_zone", fakeEntity);
    // Either the Buildings group is absent, or it has zero links
    const buildingGroup = groups.find((g) => g.title === "Buildings");
    if (buildingGroup) {
      expect(buildingGroup.links).toHaveLength(0);
    }
  });

  it("drops a station reference that does not resolve", () => {
    const fakeRecipe: Record<string, unknown> = {
      id: "fake_recipe",
      station: "__no_such_station__",
      item: "bread",
      inputs: { flour: 1 },
    };
    const groups = relationsFor("recipes", "fake_recipe", fakeRecipe);
    const stationGroup = groups.find((g) => g.title === "Station");
    // Station group should not appear (the bogus key doesn't resolve)
    expect(stationGroup).toBeUndefined();
  });

  it("valid links in a mixed array survive while bogus ones are dropped", () => {
    const entity = getEntity("zones", realZoneId) as Record<string, unknown>;
    const realBuilding = ((entity.buildings as string[]).find(
      (b) => getEntity("buildings", b) !== null,
    ))!;
    const fakeEntity: Record<string, unknown> = {
      ...entity,
      buildings: [realBuilding, "__bogus__"],
    };
    const groups = relationsFor("zones", realZoneId, fakeEntity);
    const buildingGroup = groups.find((g) => g.title === "Buildings")!;
    // Only the real building survives
    expect(buildingGroup.links.every((l) => getEntity(l.conceptId, l.key) !== null)).toBe(true);
    // "__bogus__" must not appear
    expect(buildingGroup.links.find((l) => l.key === "__bogus__")).toBeUndefined();
  });

  it("returns no groups for an unknown concept", () => {
    const groups = relationsFor("__no_such_concept__", "any_key", {});
    expect(groups).toHaveLength(0);
  });
});
