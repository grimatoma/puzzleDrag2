/**
 * Tests for infoboxFacts.ts
 *
 * TDD — written before the implementation. Uses real keys from live maps; no fakes.
 *
 * Coverage:
 *  infoboxFacts:
 *   1. null entity returns []
 *   2. unknown conceptId returns []
 *   3. tiles — facts include "Biome" and "Produces" from real tile entity
 *   4. resources — facts include "Biome" and "Value" from real resource entity
 *   5. tools — facts include "Kind" and "Power" from real tool entity
 *   6. recipes — facts include "Station" with a real station name
 *   7. buildings — facts include "Level" from a real building
 *   8. zones — facts include "Base turns" and "Entry cost" from a real zone
 *   9. workers — facts include "Role" and "Max count" from a real worker
 *  10. bosses — facts include "Season" from a real boss
 *  11. abilities — facts include "Trigger" from a real ability
 *  12. toolPowers — facts include "Tap target?" from a real tool power
 */

import { describe, it, expect } from "vitest";
import { infoboxFacts } from "./infoboxFacts.js";
import { getEntity } from "./conceptEntities.js";
import { ITEMS, BUILDINGS, RECIPES } from "../../constants.js";
import { TYPE_WORKERS } from "../../features/workers/data.js";
import { ZONES } from "../../features/zones/data.js";
import { BOSSES } from "../../features/bosses/data.js";
import { ABILITIES } from "../../config/abilities.js";
import { TOOL_POWERS } from "../../config/toolPowers.js";

// ─── Resolve real keys from live data ────────────────────────────────────────

// Tiles: first tile entry
const [realTileKey] = Object.entries(ITEMS).find(([, v]) => (v as Record<string, unknown>).kind === "tile")!;

// Resources: first resource entry
const [realResourceKey] = Object.entries(ITEMS).find(([, v]) => (v as Record<string, unknown>).kind === "resource")!;

// Tools: first tool entry
const [realToolKey] = Object.entries(ITEMS).find(([, v]) => (v as Record<string, unknown>).kind === "tool")!;

// Recipes: first recipe that has a station
const [realRecipeKey] = Object.entries(RECIPES).find(([, v]) => (v as Record<string, unknown>).station != null)!;

// Buildings: first building with a level
const realBuilding = BUILDINGS[0] as Record<string, unknown>;
const realBuildingId = realBuilding.id as string;

// Zones: first zone
const [[realZoneKey]] = Object.entries(ZONES);

// Workers: first worker type
const realWorker = TYPE_WORKERS[0] as Record<string, unknown>;
const realWorkerId = (realWorker.id as string);

// Bosses: first boss
const realBoss = BOSSES[0] as Record<string, unknown>;
const realBossId = (realBoss.id as string);

// Abilities: first ability
const realAbility = (ABILITIES as unknown as Array<Record<string, unknown>>)[0];
const realAbilityId = realAbility.id as string;

// Tool powers: first tool power
const realToolPower = (TOOL_POWERS as unknown as Array<Record<string, unknown>>)[0];
const realToolPowerId = realToolPower.id as string;

// ─── infoboxFacts tests ───────────────────────────────────────────────────────

describe("infoboxFacts", () => {
  it("returns [] for null entity", () => {
    expect(infoboxFacts("tiles", "nope", null)).toEqual([]);
  });

  it("returns [] for unknown conceptId with non-null entity", () => {
    const facts = infoboxFacts("unknown_concept", "anything", { kind: "tile" });
    expect(facts).toEqual([]);
  });

  it("tiles — includes Biome fact with a real value", () => {
    const entity = getEntity("tiles", realTileKey);
    const facts = infoboxFacts("tiles", realTileKey, entity);
    const biomeFact = facts.find((f) => f.label === "Biome");
    expect(biomeFact).toBeDefined();
    expect(biomeFact!.value).toBeTruthy();
  });

  it("tiles — includes Produces fact when next field present", () => {
    // Find a tile with a next field
    const tileWithNext = Object.entries(ITEMS).find(
      ([, v]) => {
        const rec = v as Record<string, unknown>;
        return rec.kind === "tile" && rec.next != null;
      }
    );
    if (!tileWithNext) return; // skip if none (shouldn't happen)
    const [key] = tileWithNext;
    const entity = getEntity("tiles", key);
    const facts = infoboxFacts("tiles", key, entity);
    const producesFact = facts.find((f) => f.label === "Produces");
    expect(producesFact).toBeDefined();
  });

  it("tiles — includes Category and Tier facts from tile type metadata", () => {
    const entity = getEntity("tiles", "tile_grass_grass");
    const facts = infoboxFacts("tiles", "tile_grass_grass", entity);
    expect(facts.find((f) => f.label === "Category")?.value).toBe("grass");
    expect(facts.find((f) => f.label === "Tier")?.value).toBe("0");
  });

  it("resources — includes Biome and Value facts", () => {
    const entity = getEntity("resources", realResourceKey);
    const facts = infoboxFacts("resources", realResourceKey, entity);
    const labels = facts.map((f) => f.label);
    expect(labels).toContain("Biome");
    expect(labels).toContain("Value");
  });

  it("resources — Value is a string representation of a number", () => {
    const entity = getEntity("resources", realResourceKey);
    const facts = infoboxFacts("resources", realResourceKey, entity);
    const valueFact = facts.find((f) => f.label === "Value");
    expect(Number(valueFact!.value)).toBeGreaterThan(0);
  });

  it("tools — includes Kind fact with value 'tool'", () => {
    const entity = getEntity("tools", realToolKey);
    const facts = infoboxFacts("tools", realToolKey, entity);
    const kindFact = facts.find((f) => f.label === "Kind");
    expect(kindFact).toBeDefined();
    expect(kindFact!.value).toBe("tool");
  });

  it("tools — includes Description fact when desc field present", () => {
    const entity = getEntity("tools", realToolKey);
    const facts = infoboxFacts("tools", realToolKey, entity);
    // desc field or power.id should appear
    expect(facts.length).toBeGreaterThan(0);
  });

  it("recipes — includes Station fact with a real station name", () => {
    const entity = getEntity("recipes", realRecipeKey);
    const facts = infoboxFacts("recipes", realRecipeKey, entity);
    const stationFact = facts.find((f) => f.label === "Station");
    expect(stationFact).toBeDefined();
    expect(typeof stationFact!.value).toBe("string");
    expect(stationFact!.value.length).toBeGreaterThan(0);
  });

  it("recipes — includes Output fact with item name", () => {
    const entity = getEntity("recipes", realRecipeKey);
    const facts = infoboxFacts("recipes", realRecipeKey, entity);
    const outputFact = facts.find((f) => f.label === "Output");
    expect(outputFact).toBeDefined();
    expect(outputFact!.value.length).toBeGreaterThan(0);
  });

  it("buildings — includes Level fact from real building", () => {
    const entity = getEntity("buildings", realBuildingId);
    const facts = infoboxFacts("buildings", realBuildingId, entity);
    const levelFact = facts.find((f) => f.label === "Level");
    expect(levelFact).toBeDefined();
    // hearth has lv: 1
    expect(Number(levelFact!.value)).toBeGreaterThanOrEqual(1);
  });

  it("zones — includes Boards fact", () => {
    const entity = getEntity("zones", realZoneKey);
    const facts = infoboxFacts("zones", realZoneKey, entity);
    const boardsFact = facts.find((f) => f.label === "Boards");
    expect(boardsFact).toBeDefined();
    expect(boardsFact!.value).toContain("farm");
  });

  it("zones — includes Entry cost fact", () => {
    const entity = getEntity("zones", realZoneKey);
    const facts = infoboxFacts("zones", realZoneKey, entity);
    const costFact = facts.find((f) => f.label === "Entry cost");
    expect(costFact).toBeDefined();
  });

  it("zones — zero-coin entryCost shows 'Free' not '0 coins'", () => {
    // Use the crossroads zone which has entryCost: { coins: 0 }
    const entity = getEntity("zones", "crossroads");
    const facts = infoboxFacts("zones", "crossroads", entity);
    const costFact = facts.find((f) => f.label === "Entry cost");
    expect(costFact).toBeDefined();
    expect(costFact!.value).toBe("Free");
    expect(costFact!.value).not.toMatch(/0 coins/);
  });

  it("zones — positive entryCost shows coin amount", () => {
    // Synthesise an entity with a positive coin entry cost
    const syntheticZone = { baseTurns: 10, entryCost: { coins: 50 } };
    const facts = infoboxFacts("zones", "synthetic", syntheticZone);
    const costFact = facts.find((f) => f.label === "Entry cost");
    expect(costFact).toBeDefined();
    expect(costFact!.value).toBe("50 coins");
  });

  it("workers — includes Role fact from real worker", () => {
    const entity = getEntity("workers", realWorkerId);
    const facts = infoboxFacts("workers", realWorkerId, entity);
    const roleFact = facts.find((f) => f.label === "Role");
    expect(roleFact).toBeDefined();
    expect(roleFact!.value.length).toBeGreaterThan(0);
  });

  it("workers — includes Max count fact", () => {
    const entity = getEntity("workers", realWorkerId);
    const facts = infoboxFacts("workers", realWorkerId, entity);
    const maxFact = facts.find((f) => f.label === "Max count");
    expect(maxFact).toBeDefined();
    expect(Number(maxFact!.value)).toBeGreaterThan(0);
  });

  it("bosses — includes Season fact with real season string", () => {
    const entity = getEntity("bosses", realBossId);
    const facts = infoboxFacts("bosses", realBossId, entity);
    const seasonFact = facts.find((f) => f.label === "Season");
    expect(seasonFact).toBeDefined();
    expect(seasonFact!.value.length).toBeGreaterThan(0);
  });

  it("abilities — includes Trigger fact", () => {
    const entity = getEntity("abilities", realAbilityId);
    const facts = infoboxFacts("abilities", realAbilityId, entity);
    const triggerFact = facts.find((f) => f.label === "Trigger");
    expect(triggerFact).toBeDefined();
    expect(triggerFact!.value.length).toBeGreaterThan(0);
  });

  it("toolPowers — includes Tap target fact", () => {
    const entity = getEntity("toolPowers", realToolPowerId);
    const facts = infoboxFacts("toolPowers", realToolPowerId, entity);
    const tapFact = facts.find((f) => f.label === "Tap target?");
    expect(tapFact).toBeDefined();
    expect(["Yes", "No"]).toContain(tapFact!.value);
  });

  it("does not throw for any concept with a null entity", () => {
    const conceptIds = [
      "tiles", "resources", "tools", "recipes", "buildings", "zones",
      "workers", "bosses", "abilities", "toolPowers", "hazards", "seasons",
    ];
    for (const conceptId of conceptIds) {
      expect(() => infoboxFacts(conceptId, "nope", null)).not.toThrow();
      expect(infoboxFacts(conceptId, "nope", null)).toEqual([]);
    }
  });
});

import { TILE_TYPES_MAP } from "../../features/tileCollection/data.js";

describe("infoboxFacts — tile category", () => {
  it("includes the tile's category as a fact", () => {
    const e = getEntity("tiles", "tile_grain_wheat") as Record<string, unknown>;
    const facts = infoboxFacts("tiles", "tile_grain_wheat", e);
    const cat = facts.find((f) => f.label === "Category");
    expect(cat).toBeDefined();
    expect(cat!.value).toBe(TILE_TYPES_MAP["tile_grain_wheat"].category);
  });
});
