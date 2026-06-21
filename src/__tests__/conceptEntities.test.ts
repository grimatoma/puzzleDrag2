/**
 * Unit tests for src/balanceManager/wiki/conceptEntities.ts
 *
 * Coverage:
 *  1. Real zone entry lookup
 *  2. Real tile entry lookup
 *  3. Unknown key → null
 *  4. Unknown concept id → null
 *  5. getEntity kind-awareness — cross-kind lookups return null
 *  6. conceptForKey — item kinds resolve to correct concept, not "tiles" for all
 *  7. conceptForKey — resolves representative real keys per major concept
 *  8. conceptForKey — unknown key → null
 *  9. conceptForKey — round-trip: every concept's first entry resolves
 * 10. Ownership round-trip: every entry for every concept resolves via conceptForKey
 *     (with a KNOWN_COLLISIONS allowlist for genuinely ambiguous keys)
 * 11. parseWikiFocus — prefixed format resolves correctly
 * 12. parseWikiFocus — bare-key fallback resolves via conceptForKey
 * 13. parseWikiFocus — null/empty → null
 * 14. parseWikiFocus — unknown prefix falls back to bare-key path
 * 15. Drift guard: every concept with entries resolves via getEntity
 */

import { describe, it, expect } from "vitest";
import { getEntity, conceptForKey, parseWikiFocus } from "../balanceManager/wiki/conceptEntities.js";
import { ZONES } from "../features/zones/data.js";
import { ITEMS } from "../constants.js";
import { CONCEPTS } from "../balanceManager/wiki/concepts.js";

// ─── Resolve a real zone id from the live map ─────────────────────────────────
const realZoneId = Object.keys(ZONES)[0];

// ─── Resolve real item keys from the live ITEMS map ──────────────────────────
const tilesConcept = CONCEPTS.find((c) => c.id === "tiles")!;
const firstTileEntry = tilesConcept.getEntries()[0];
const realTileKey = firstTileEntry?.key;

const resourcesConcept = CONCEPTS.find((c) => c.id === "resources")!;
const firstResourceEntry = resourcesConcept.getEntries()[0];
const realResourceKey = firstResourceEntry?.key;

const toolsConcept = CONCEPTS.find((c) => c.id === "tools")!;
const firstToolEntry = toolsConcept.getEntries()[0];
const realToolKey = firstToolEntry?.key;

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
    // getEntity merges tile-collection type metadata (category/tier/…) on top of
    // the ITEMS row, so the result is a superset of the raw item — assert it
    // contains every ITEMS field rather than an exact match.
    expect(result).toMatchObject(item!);
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

// ─── Part A: getEntity kind-awareness ────────────────────────────────────────

describe("getEntity — kind-awareness (cross-kind lookups)", () => {
  it("getEntity('tiles', <resource key>) returns null — resource must not resolve as tile", () => {
    expect(realResourceKey).toBeDefined();
    // Before the fix, tiles/resources/tools all returned ITEMS[key] without checking kind.
    // After the fix, getEntity("tiles", resourceKey) returns null.
    expect(getEntity("tiles", realResourceKey!)).toBeNull();
  });

  it("getEntity('resources', <resource key>) returns the item — matching kind", () => {
    expect(realResourceKey).toBeDefined();
    const result = getEntity("resources", realResourceKey!);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("resource");
  });

  it("getEntity('tools', <tile key>) returns null — tile must not resolve as tool", () => {
    expect(realTileKey).toBeDefined();
    expect(getEntity("tools", realTileKey!)).toBeNull();
  });

  it("getEntity('tiles', <tool key>) returns null — tool must not resolve as tile", () => {
    expect(realToolKey).toBeDefined();
    expect(getEntity("tiles", realToolKey!)).toBeNull();
  });

  it("getEntity('resources', <tile key>) returns null — tile must not resolve as resource", () => {
    expect(realTileKey).toBeDefined();
    expect(getEntity("resources", realTileKey!)).toBeNull();
  });

  it("getEntity('tools', <tool key>) returns the item — matching kind", () => {
    expect(realToolKey).toBeDefined();
    const result = getEntity("tools", realToolKey!);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("tool");
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

describe("conceptForKey — item kinds resolve correctly (not all to 'tiles')", () => {
  it("resolves a real tile key to 'tiles'", () => {
    expect(realTileKey2).toBeDefined();
    expect(conceptForKey(realTileKey2!)).toBe("tiles");
  });

  it("resolves a real resource key to 'resources', not 'tiles'", () => {
    expect(realResourceKey).toBeDefined();
    // Before the fix, every resource key incorrectly resolved to "tiles"
    // because getEntity("tiles", key) returned ITEMS[key] without kind check.
    expect(conceptForKey(realResourceKey!)).toBe("resources");
  });

  it("resolves a real tool key to 'tools', not 'tiles' or 'resources'", () => {
    expect(realToolKey).toBeDefined();
    expect(conceptForKey(realToolKey!)).toBe("tools");
  });
});

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

// ─── Strong ownership round-trip: every entry for every concept ───────────────
//
// For every concept, every entry's key must resolve back to that concept via
// conceptForKey — EXCEPT for keys in KNOWN_COLLISIONS, where multiple concepts
// share the same key and CONCEPTS order determines the winner.
//
// KNOWN_COLLISIONS documents the genuinely ambiguous keys. For these, we assert
// only that conceptForKey returns SOME valid concept (not necessarily the one
// the entry belongs to) and that getEntity resolves it.
//
// Entries that belong to a concept which is NOT the first in CONCEPTS order for
// that key are also listed — they correctly "lose" to the earlier concept.

// Keys that genuinely collide across concepts (CONCEPTS order determines winner).
// Format: key → winning concept (first in CONCEPTS order that resolves it).
//
// Found collisions:
//   forge        → zones (zone) + buildings (building); zones is 5th, buildings is 8th → zones wins
//   portal       → buildings (building) + views (view); buildings is 8th, views is 17th → buildings wins
//   explosives   → tools (tool item) + toolPowers (toolPower); tools is 3rd, toolPowers is 14th → tools wins
//   water_pump   → tools (tool item) + toolPowers (toolPower); tools is 3rd, toolPowers is 14th → tools wins
//
// All other collisions (tool keys in recipes, resource keys in recipes) resolve correctly
// because tools (3rd) and resources (2nd) come before recipes (7th) in CONCEPTS order.
const KNOWN_COLLISIONS: Record<string, string> = {
  forge: "zones",
  portal: "buildings",
  explosives: "tools",
  water_pump: "tools",
  // "fish" is both the Harbor board-kind key and a tile category; `categories`
  // precedes `boardKinds` in CONCEPTS order, so it wins the bare-key round-trip.
  // Board-kind nav uses the prefixed "boardKinds:fish" focus, so this is benign.
  fish: "categories",
};

describe("conceptForKey — strong ownership round-trip (every entry in every concept)", () => {
  it("every entry's key resolves to its own concept, or to a known collision winner", () => {
    const failures: string[] = [];

    for (const concept of CONCEPTS) {
      const entries = concept.getEntries();
      if (entries.length === 0) continue;

      for (const entry of entries) {
        const key = entry.key;
        const resolvedConceptId = conceptForKey(key);

        if (resolvedConceptId === null) {
          // Keys in KNOWN_COLLISIONS that belong to a concept other than the winner
          // will still resolve to SOME concept — if resolvedConceptId is null,
          // that's an outright failure regardless.
          failures.push(
            `concept "${concept.id}", key "${key}": conceptForKey returned null`,
          );
          continue;
        }

        // If the resolved concept matches the entry's own concept, all good.
        if (resolvedConceptId === concept.id) continue;

        // If the key is a known collision, verify it resolves to the expected winner.
        if (key in KNOWN_COLLISIONS) {
          const expectedWinner = KNOWN_COLLISIONS[key];
          if (resolvedConceptId !== expectedWinner) {
            failures.push(
              `concept "${concept.id}", key "${key}": KNOWN_COLLISIONS says winner is "${expectedWinner}" but got "${resolvedConceptId}"`,
            );
          }
          // Also verify getEntity resolves on the winner
          if (getEntity(resolvedConceptId, key) === null) {
            failures.push(
              `concept "${concept.id}", key "${key}": collision winner "${resolvedConceptId}" but getEntity("${resolvedConceptId}", "${key}") is null`,
            );
          }
          continue;
        }

        // Not a known collision — this is an unexpected mismatch. The key resolved to
        // a different concept than expected. Report it so the KNOWN_COLLISIONS list
        // can be updated if needed.
        failures.push(
          `concept "${concept.id}", key "${key}": conceptForKey resolved to "${resolvedConceptId}" (not "${concept.id}"). ` +
            `If this is an intentional collision, add "${key}" to KNOWN_COLLISIONS.`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `${failures.length} ownership round-trip failure(s):\n` +
          failures.map((f) => `  - ${f}`).join("\n"),
      );
    }
  });
});

// ─── parseWikiFocus tests ─────────────────────────────────────────────────────

describe("parseWikiFocus — prefixed format", () => {
  it("parses '<conceptId>:<entityKey>' → { conceptId, entityKey }", () => {
    expect(realTileKey).toBeDefined();
    const result = parseWikiFocus(`tiles:${realTileKey}`);
    expect(result).not.toBeNull();
    expect(result?.conceptId).toBe("tiles");
    expect(result?.entityKey).toBe(realTileKey);
  });

  it("parses a resource prefixed focus correctly", () => {
    expect(realResourceKey).toBeDefined();
    const result = parseWikiFocus(`resources:${realResourceKey}`);
    expect(result).not.toBeNull();
    expect(result?.conceptId).toBe("resources");
    expect(result?.entityKey).toBe(realResourceKey);
  });

  it("parses a zone prefixed focus correctly", () => {
    expect(realZoneId).toBeDefined();
    const result = parseWikiFocus(`zones:${realZoneId}`);
    expect(result).not.toBeNull();
    expect(result?.conceptId).toBe("zones");
    expect(result?.entityKey).toBe(realZoneId);
  });
});

describe("parseWikiFocus — bare-key fallback", () => {
  it("falls back to conceptForKey for a bare tile key (no prefix)", () => {
    expect(realTileKey).toBeDefined();
    const result = parseWikiFocus(realTileKey!);
    expect(result).not.toBeNull();
    expect(result?.conceptId).toBe("tiles");
    expect(result?.entityKey).toBe(realTileKey);
  });

  it("falls back to conceptForKey for a bare zone key (no prefix)", () => {
    expect(realZoneId).toBeDefined();
    const result = parseWikiFocus(realZoneId);
    expect(result).not.toBeNull();
    expect(result?.conceptId).toBe("zones");
    expect(result?.entityKey).toBe(realZoneId);
  });
});

describe("parseWikiFocus — null / empty inputs", () => {
  it("returns null for null focus", () => {
    expect(parseWikiFocus(null)).toBeNull();
  });

  it("returns null for empty string focus", () => {
    expect(parseWikiFocus("")).toBeNull();
  });

  it("returns null for an unknown key with no prefix", () => {
    expect(parseWikiFocus("__totally_unknown_key__")).toBeNull();
  });
});

describe("parseWikiFocus — unknown prefix falls back to bare-key path", () => {
  it("treats an unresolvable prefix as a bare key (graceful fallback)", () => {
    // "__unknown__:someKey" — the prefix is not a known concept, so the colon
    // split fails and the whole string is used as a bare key lookup.
    const result = parseWikiFocus("__unknown__:someKey");
    // The whole string "__unknown__:someKey" is not a known key → null
    expect(result).toBeNull();
  });

  it("returns null for a garbled focus with an unknown prefix", () => {
    expect(parseWikiFocus("notaconcept:notakey")).toBeNull();
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
