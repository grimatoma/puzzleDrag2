/**
 * Unit tests for src/balanceManager/wiki/conceptSchemas.ts
 *
 * Coverage:
 *  1. Spot checks — specific concept ids return expected kind/schema.
 *  2. Exhaustive coverage test — every CONCEPTS id is either mapped to a
 *     valid ConceptSchema (introspects without throwing) or is in the
 *     known-null allowlist.  A newly-added concept without a mapping
 *     decision will fail here.
 */

import { describe, it, expect } from "vitest";
import { schemaForConcept } from "../balanceManager/wiki/conceptSchemas.js";
import { describeSchema } from "../balanceManager/schemaDoc.js";
import { CONCEPTS } from "../balanceManager/wiki/concepts.js";

// ─── Spot checks ──────────────────────────────────────────────────────────────

describe("conceptSchemas — spot checks", () => {
  it("'zones' → kind: 'override', schema introspects with zone fields", () => {
    const cs = schemaForConcept("zones");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("override");
    const doc = describeSchema(cs!.schema);
    const fieldNames = doc.fields.map((f) => f.field);
    expect(fieldNames).toContain("upgradeMap");
    expect(fieldNames).toContain("baseTurns");
  });

  it("'tiles' → kind: 'definition', schema introspects with tile fields", () => {
    const cs = schemaForConcept("tiles");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
    const doc = describeSchema(cs!.schema);
    const fieldNames = doc.fields.map((f) => f.field);
    expect(fieldNames).toContain("label");
    expect(fieldNames).toContain("kind");
    expect(fieldNames).toContain("biome");
  });

  it("'resources' → kind: 'definition'", () => {
    const cs = schemaForConcept("resources");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
  });

  it("'tools' → kind: 'definition'", () => {
    const cs = schemaForConcept("tools");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
  });

  it("'settlementBiomes' → kind: 'definition'", () => {
    const cs = schemaForConcept("settlementBiomes");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
  });

  it("'recipes' → kind: 'definition', includes item and station fields", () => {
    const cs = schemaForConcept("recipes");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
    const doc = describeSchema(cs!.schema);
    const fieldNames = doc.fields.map((f) => f.field);
    expect(fieldNames).toContain("item");
    expect(fieldNames).toContain("station");
    expect(fieldNames).toContain("inputs");
  });

  it("'buildings' → kind: 'definition'", () => {
    const cs = schemaForConcept("buildings");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
  });

  it("'bosses' → kind: 'override'", () => {
    const cs = schemaForConcept("bosses");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("override");
  });

  it("'workers' → kind: 'override'", () => {
    const cs = schemaForConcept("workers");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("override");
  });

  it("'npcs' → kind: 'override', introspects with npc fields", () => {
    const cs = schemaForConcept("npcs");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("override");
    const doc = describeSchema(cs!.schema);
    const fieldNames = doc.fields.map((f) => f.field);
    expect(fieldNames).toContain("displayName");
  });

  it("'abilities' → kind: 'definition'", () => {
    const cs = schemaForConcept("abilities");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
  });

  it("'toolPowers' → kind: 'definition'", () => {
    const cs = schemaForConcept("toolPowers");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
  });

  it("'hazards' → kind: 'definition', schema introspects with look field", () => {
    const cs = schemaForConcept("hazards");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
    const doc = describeSchema(cs!.schema);
    const fieldNames = doc.fields.map((f) => f.field);
    expect(fieldNames).toContain("look");
    expect(fieldNames).toContain("spawn");
  });

  it("'achievements' → kind: 'definition', schema introspects with look field", () => {
    const cs = schemaForConcept("achievements");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
    const doc = describeSchema(cs!.schema);
    const fieldNames = doc.fields.map((f) => f.field);
    expect(fieldNames).toContain("look");
    expect(fieldNames).toContain("counter");
  });

  it("'categories' → null (no schema)", () => {
    expect(schemaForConcept("categories")).toBeNull();
  });

  it("'seasons' → kind: 'definition', schema introspects with grouped look fields", () => {
    const cs = schemaForConcept("seasons");
    expect(cs).not.toBeNull();
    expect(cs!.kind).toBe("definition");
    const doc = describeSchema(cs!.schema);
    const fieldNames = doc.fields.map((f) => f.field);
    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("look");
  });

  it("'views' → null (no schema)", () => {
    expect(schemaForConcept("views")).toBeNull();
  });

  it("'modals' → null (no schema)", () => {
    expect(schemaForConcept("modals")).toBeNull();
  });

  it("'tileDiscoveryMethods' → null (no schema)", () => {
    expect(schemaForConcept("tileDiscoveryMethods")).toBeNull();
  });

  it("unknown concept id → null", () => {
    expect(schemaForConcept("nonExistentConcept")).toBeNull();
  });
});

// ─── Exhaustive coverage test ─────────────────────────────────────────────────

/**
 * Concepts that intentionally have no Zod schema.
 * When a new concept is added to CONCEPTS, the developer MUST add it either
 * to the schemaForConcept() switch or to this allowlist — otherwise this test
 * fails, surfacing the oversight.
 */
const KNOWN_NULL_CONCEPTS: ReadonlySet<string> = new Set([
  "categories",
  "views",
  "modals",
  "tileDiscoveryMethods",
  // Board kinds (Farm/Mine/Harbor) render from live BIOMES config via
  // BoardKindDetail + LiveConfigFallback; no Zod schema, like categories.
  "boardKinds",
  // Registered schema-less for now — the article falls back to LiveConfigFallback.
  // RICH reward cards / schemas land in a later task.
  "keepers",
  "boons",
  "dailyRewards",
]);

describe("conceptSchemas — exhaustive CONCEPTS coverage", () => {
  it("every concept id is either mapped to a valid schema or is in the known-null allowlist", () => {
    const failures: string[] = [];

    for (const concept of CONCEPTS) {
      const id = concept.id;
      const result = schemaForConcept(id);

      if (result === null) {
        if (!KNOWN_NULL_CONCEPTS.has(id)) {
          failures.push(
            `"${id}" returned null from schemaForConcept but is not in KNOWN_NULL_CONCEPTS. ` +
              "Add it to the switch in conceptSchemas.ts, or add it to KNOWN_NULL_CONCEPTS.",
          );
        }
        // null + in allowlist = correct
      } else {
        // Should introspect without throwing
        try {
          const doc = describeSchema(result.schema);
          if (!Array.isArray(doc.fields)) {
            failures.push(`"${id}" — describeSchema returned no fields array`);
          }
        } catch (e) {
          failures.push(`"${id}" — describeSchema threw: ${(e as Error).message}`);
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `conceptSchemas coverage failures:\n${failures.map((f) => `  - ${f}`).join("\n")}`,
      );
    }
  });
});
