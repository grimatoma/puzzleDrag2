/**
 * Unit tests for src/balanceManager/wiki/conceptEntities.ts
 *
 * Coverage:
 *  1. Real zone entry lookup
 *  2. Real tile entry lookup
 *  3. Unknown key → null
 *  4. Unknown concept id → null
 *  5. conceptForKey — resolves representative real keys per major concept
 *  6. conceptForKey — unknown key → null
 *  7. conceptForKey — round-trip: every concept's first entry resolves
 */

import { describe, it, expect } from "vitest";
import { getEntity, conceptForKey } from "../balanceManager/wiki/conceptEntities.js";
import { ZONES } from "../features/zones/data.js";
import { ITEMS } from "../constants.js";
import { CONCEPTS } from "../balanceManager/wiki/concepts.js";

// ─── Resolve a real zone id from the live map ─────────────────────────────────
const realZoneId = Object.keys(ZONES)[0];

// ─── Resolve a real tile key from the live ITEMS map ─────────────────────────
const tilesConcept = CONCEPTS.find((c) => c.id === "tiles")!;
const firstTileEntry = tilesConcept.getEntries()[0];
const realTileKey = firstTileEntry?.key;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getEntity — zones", () => {
  it("returns the zone object for a real zone id", () => {
    expect(realZoneId).toBeDefined();
    const result = getEntity("zones", realZoneId);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
    // Zone objects have an id field that matches the key
    expect((result as Record<string, unknown>).id).toBe(realZoneId);
  });

  it("returns null for an unknown zone key", () => {
    expect(getEntity("zones", "__does_not_exist__")).toBeNull();
  });
});

describe("getEntity — tiles", () => {
  it("returns the item object for a real tile key", () => {
    expect(realTileKey).toBeDefined();
    const result = getEntity("tiles", realTileKey!);
    expect(result).not.toBeNull();
    const item = ITEMS[realTileKey as keyof typeof ITEMS] as Record<string, unknown> | undefined;
    expect(result).toEqual(item);
  });

  it("returns null for an unknown tile key", () => {
    expect(getEntity("tiles", "__no_such_tile__")).toBeNull();
  });
});

describe("getEntity — unknown concept", () => {
  it("returns null for an unrecognised concept id", () => {
    expect(getEntity("__unknown_concept__", "anything")).toBeNull();
  });
});

// ─── conceptForKey tests ──────────────────────────────────────────────────────

// Resolve real keys from live maps to avoid hardcoding fragile ids.
const realZoneId2 = Object.keys(ZONES)[0];
const tilesConcept2 = CONCEPTS.find((c) => c.id === "tiles")!;
const realTileKey2 = tilesConcept2.getEntries()[0]?.key;
const recipesConcept = CONCEPTS.find((c) => c.id === "recipes")!;
const realRecipeKey = recipesConcept.getEntries()[0]?.key;
const buildingsConcept = CONCEPTS.find((c) => c.id === "buildings")!;
const realBuildingKey = buildingsConcept.getEntries()[0]?.key;
const npcsConcept = CONCEPTS.find((c) => c.id === "npcs")!;
const realNpcKey = npcsConcept.getEntries()[0]?.key;

describe("conceptForKey — resolves representative real keys", () => {
  it("resolves a real tile key to 'tiles'", () => {
    expect(realTileKey2).toBeDefined();
    const conceptId = conceptForKey(realTileKey2!);
    expect(conceptId).not.toBeNull();
    // Must resolve to a concept whose getEntity returns non-null for this key
    expect(getEntity(conceptId!, realTileKey2!)).not.toBeNull();
    // Tile keys start with "tile_" so should resolve to "tiles"
    expect(conceptId).toBe("tiles");
  });

  it("resolves a real recipe key to 'recipes'", () => {
    expect(realRecipeKey).toBeDefined();
    const conceptId = conceptForKey(realRecipeKey!);
    expect(conceptId).not.toBeNull();
    expect(getEntity(conceptId!, realRecipeKey!)).not.toBeNull();
  });

  it("resolves a real zone id to 'zones'", () => {
    expect(realZoneId2).toBeDefined();
    const conceptId = conceptForKey(realZoneId2);
    expect(conceptId).not.toBeNull();
    expect(conceptId).toBe("zones");
  });

  it("resolves a real building id to 'buildings'", () => {
    expect(realBuildingKey).toBeDefined();
    const conceptId = conceptForKey(realBuildingKey!);
    expect(conceptId).not.toBeNull();
    expect(conceptId).toBe("buildings");
  });

  it("resolves a real npc id to 'npcs'", () => {
    expect(realNpcKey).toBeDefined();
    const conceptId = conceptForKey(realNpcKey!);
    expect(conceptId).not.toBeNull();
    expect(conceptId).toBe("npcs");
  });

  it("returns null for an unknown key", () => {
    expect(conceptForKey("__totally_unknown_key_xyz__")).toBeNull();
  });
});

// ─── conceptForKey round-trip property ───────────────────────────────────────

describe("conceptForKey — round-trip (every concept's first entry resolves)", () => {
  it("for every concept with entries: conceptForKey(firstEntry.key) resolves to a concept whose getEntity is non-null", () => {
    const failures: string[] = [];

    for (const concept of CONCEPTS) {
      const entries = concept.getEntries();
      if (entries.length === 0) continue; // nothing to check

      const firstEntry = entries[0];
      const resolvedConceptId = conceptForKey(firstEntry.key);

      if (resolvedConceptId === null) {
        failures.push(
          `concept "${concept.id}": conceptForKey("${firstEntry.key}") returned null`,
        );
        continue;
      }

      // The resolved concept must be able to look up this key
      const entity = getEntity(resolvedConceptId, firstEntry.key);
      if (entity === null) {
        failures.push(
          `concept "${concept.id}": conceptForKey("${firstEntry.key}") → "${resolvedConceptId}", but getEntity("${resolvedConceptId}", "${firstEntry.key}") is null`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `${failures.length} concept(s) failed the round-trip:\n` +
          failures.map((f) => `  - ${f}`).join("\n"),
      );
    }
  });
});

// ─── Drift guard: every concept with entries must resolve via getEntity ────────

describe("getEntity — drift guard (concepts ↔ conceptEntities parity)", () => {
  it("resolves at least the first entry for every concept that has entries", () => {
    const failures: string[] = [];

    for (const concept of CONCEPTS) {
      const entries = concept.getEntries();
      if (entries.length === 0) continue; // nothing to check for empty concepts

      const firstEntry = entries[0];
      const result = getEntity(concept.id, firstEntry.key);

      if (result === null) {
        failures.push(
          `concept "${concept.id}": getEntity returned null for first key "${firstEntry.key}"`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `${failures.length} concept(s) failed to resolve via getEntity — ` +
          `concepts.ts and conceptEntities.ts have drifted:\n` +
          failures.map((f) => `  - ${f}`).join("\n"),
      );
    }
  });
});
