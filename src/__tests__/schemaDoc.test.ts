/**
 * Unit tests for src/balanceManager/schemaDoc.ts
 *
 * Coverage:
 *  1. Hand-built Zod schemas — every type rule documented in the spec.
 *  2. Real schemas — zoneOverrideSchema and tileItemSchema fixture assertions.
 *  3. Error path — non-object root throws a clear message.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { describeSchema, typeString } from "../balanceManager/schemaDoc.js";
import { zoneOverrideSchema } from "../config/schemas/zone.js";
import { tileItemSchema } from "../config/schemas/item.js";

// ─── Hand-built schema type rules ─────────────────────────────────────────────

describe("schemaDoc — type strings (hand-built schemas)", () => {
  it("string → 'string'", () => {
    const doc = describeSchema(z.object({ x: z.string() }));
    expect(doc.fields[0].type).toBe("string");
  });

  it("number → 'number'", () => {
    const doc = describeSchema(z.object({ x: z.number() }));
    expect(doc.fields[0].type).toBe("number");
  });

  it("number.int() → 'number (int)'", () => {
    const doc = describeSchema(z.object({ x: z.number().int() }));
    expect(doc.fields[0].type).toBe("number (int)");
  });

  it("number.min(1) → 'number (≥1)'", () => {
    const doc = describeSchema(z.object({ x: z.number().min(1) }));
    expect(doc.fields[0].type).toBe("number (≥1)");
  });

  it("number.max(10) → 'number (≤10)'", () => {
    const doc = describeSchema(z.object({ x: z.number().max(10) }));
    expect(doc.fields[0].type).toBe("number (≤10)");
  });

  it("number.min(1).max(10) → 'number (1–10)'", () => {
    const doc = describeSchema(z.object({ x: z.number().min(1).max(10) }));
    expect(doc.fields[0].type).toBe("number (1–10)");
  });

  it("number.int().min(1) → 'number (int, ≥1)'", () => {
    const doc = describeSchema(z.object({ x: z.number().int().min(1) }));
    expect(doc.fields[0].type).toBe("number (int, ≥1)");
  });

  it("number.int().min(0).max(100) → 'number (int, 0–100)'", () => {
    const doc = describeSchema(z.object({ x: z.number().int().min(0).max(100) }));
    expect(doc.fields[0].type).toBe("number (int, 0–100)");
  });

  it("number.int() without explicit min/max → 'number (int)' (no safeint sentinels in output)", () => {
    const doc = describeSchema(z.object({ x: z.number().int() }));
    expect(doc.fields[0].type).toBe("number (int)");
    // Safeint sentinels must not leak into output
    expect(doc.fields[0].type).not.toContain("9007");
  });

  it("boolean → 'boolean'", () => {
    const doc = describeSchema(z.object({ x: z.boolean() }));
    expect(doc.fields[0].type).toBe("boolean");
  });

  it("string literal → '\"tile\"'", () => {
    const doc = describeSchema(z.object({ x: z.literal("tile") }));
    expect(doc.fields[0].type).toBe('"tile"');
  });

  it("number literal → '42'", () => {
    const doc = describeSchema(z.object({ x: z.literal(42) }));
    expect(doc.fields[0].type).toBe("42");
  });

  it("enum → 'enum: a | b | c'", () => {
    const doc = describeSchema(z.object({ x: z.enum(["a", "b", "c"]) }));
    expect(doc.fields[0].type).toBe("enum: a | b | c");
  });

  it("array of strings → 'string[]'", () => {
    const doc = describeSchema(z.object({ x: z.array(z.string()) }));
    expect(doc.fields[0].type).toBe("string[]");
  });

  it("array of numbers → 'number[]'", () => {
    const doc = describeSchema(z.object({ x: z.array(z.number()) }));
    expect(doc.fields[0].type).toBe("number[]");
  });

  it("record<string, string> → 'record<string, string>'", () => {
    const doc = describeSchema(z.object({ x: z.record(z.string(), z.string()) }));
    expect(doc.fields[0].type).toBe("record<string, string>");
  });

  it("record<string, number> → 'record<string, number>'", () => {
    const doc = describeSchema(z.object({ x: z.record(z.string(), z.number()) }));
    expect(doc.fields[0].type).toBe("record<string, number>");
  });

  it("nested record → 'record<string, record<string, number>>'", () => {
    const doc = describeSchema(
      z.object({ x: z.record(z.string(), z.record(z.string(), z.number())) }),
    );
    expect(doc.fields[0].type).toBe("record<string, record<string, number>>");
  });

  it("nested object → 'object' (no recursion into field names)", () => {
    const doc = describeSchema(z.object({ x: z.object({ a: z.string() }) }));
    expect(doc.fields[0].type).toBe("object");
  });

  it("union string|null → 'string | null'", () => {
    const doc = describeSchema(z.object({ x: z.union([z.string(), z.null()]) }));
    expect(doc.fields[0].type).toBe("string | null");
  });

  it("nullable string (z.string().nullable()) → 'string | null'", () => {
    const doc = describeSchema(z.object({ x: z.string().nullable() }));
    expect(doc.fields[0].type).toBe("string | null");
  });

  it("z.null() field → 'null'", () => {
    const doc = describeSchema(z.object({ x: z.null() }));
    expect(doc.fields[0].type).toBe("null");
  });

  it("z.unknown() field → 'unknown'", () => {
    const doc = describeSchema(z.object({ x: z.unknown() }));
    expect(doc.fields[0].type).toBe("unknown");
  });

  it("z.any() field → 'any'", () => {
    const doc = describeSchema(z.object({ x: z.any() }));
    expect(doc.fields[0].type).toBe("any");
  });
});

// ─── Optionality and defaults ─────────────────────────────────────────────────

describe("schemaDoc — optionality and defaults", () => {
  it("plain field → optional: false, no default", () => {
    const doc = describeSchema(z.object({ x: z.string() }));
    expect(doc.fields[0].optional).toBe(false);
    expect(doc.fields[0].default).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(doc.fields[0], "default")).toBe(false);
  });

  it(".optional() field → optional: true, no default property", () => {
    const doc = describeSchema(z.object({ x: z.string().optional() }));
    expect(doc.fields[0].optional).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(doc.fields[0], "default")).toBe(false);
  });

  it(".default(value) field → optional: true, default present", () => {
    const doc = describeSchema(z.object({ x: z.string().default("hello") }));
    expect(doc.fields[0].optional).toBe(true);
    expect(doc.fields[0].default).toBe("hello");
  });

  it(".default(0) → optional: true, default: 0", () => {
    const doc = describeSchema(z.object({ x: z.number().default(0) }));
    expect(doc.fields[0].optional).toBe(true);
    expect(doc.fields[0].default).toBe(0);
  });

  it("type string is derived from inner (unwrapped) schema for optional fields", () => {
    const doc = describeSchema(z.object({ x: z.number().int().min(1).optional() }));
    expect(doc.fields[0].type).toBe("number (int, ≥1)");
    expect(doc.fields[0].optional).toBe(true);
  });
});

// ─── Description / doc strings ────────────────────────────────────────────────

describe("schemaDoc — description strings", () => {
  it("field with .describe() → description set", () => {
    const doc = describeSchema(z.object({ x: z.string().describe("My doc") }));
    expect(doc.fields[0].description).toBe("My doc");
  });

  it("field without .describe() → description undefined", () => {
    const doc = describeSchema(z.object({ x: z.string() }));
    expect(doc.fields[0].description).toBeUndefined();
  });

  it(".optional().describe() puts description on outer wrapper — still captured", () => {
    const doc = describeSchema(
      z.object({ x: z.string().optional().describe("outer doc") }),
    );
    expect(doc.fields[0].description).toBe("outer doc");
    expect(doc.fields[0].optional).toBe(true);
  });

  it(".describe() on inner then .optional() — description from inner is captured", () => {
    const doc = describeSchema(
      z.object({ x: z.string().describe("inner doc").optional() }),
    );
    // Outer optional has no describe; we should still find the inner describe
    expect(doc.fields[0].description).toBe("inner doc");
  });

  it("object-level .describe() is captured in SchemaDoc.description", () => {
    const s = z.object({ x: z.string() }).describe("The whole object");
    const doc = describeSchema(s);
    expect(doc.description).toBe("The whole object");
  });

  it("object without .describe() → SchemaDoc.description is undefined", () => {
    const doc = describeSchema(z.object({ x: z.string() }));
    expect(doc.description).toBeUndefined();
  });
});

// ─── passthrough / strict ─────────────────────────────────────────────────────

describe("schemaDoc — passthrough flag", () => {
  it(".passthrough() → passthrough: true", () => {
    const doc = describeSchema(z.object({ x: z.string() }).passthrough());
    expect(doc.passthrough).toBe(true);
  });

  it(".strict() → passthrough: false", () => {
    const doc = describeSchema(z.object({ x: z.string() }).strict());
    expect(doc.passthrough).toBe(false);
  });

  it("plain z.object() → passthrough: false (strip mode)", () => {
    const doc = describeSchema(z.object({ x: z.string() }));
    expect(doc.passthrough).toBe(false);
  });
});

// ─── Field declaration order ──────────────────────────────────────────────────

describe("schemaDoc — field declaration order", () => {
  it("fields are returned in declaration order", () => {
    const doc = describeSchema(
      z.object({ c: z.string(), a: z.number(), b: z.boolean() }),
    );
    expect(doc.fields.map((f) => f.field)).toEqual(["c", "a", "b"]);
  });
});

// ─── Error path ───────────────────────────────────────────────────────────────

describe("schemaDoc — error handling", () => {
  it("throws a clear error when given z.string() (not an object)", () => {
    expect(() => describeSchema(z.string())).toThrow(/expected a Zod object schema/i);
  });

  it("throws a clear error when given z.number()", () => {
    expect(() => describeSchema(z.number())).toThrow(/expected a Zod object schema/i);
  });

  it("throws a clear error when given z.array(z.string())", () => {
    expect(() => describeSchema(z.array(z.string()))).toThrow(/expected a Zod object schema/i);
  });

  it("throws a clear error when given null", () => {
    expect(() => describeSchema(null)).toThrow(/expected a Zod object schema/i);
  });

  it("error message includes the actual type tag", () => {
    try {
      describeSchema(z.string());
    } catch (e) {
      expect((e as Error).message).toMatch(/string/);
    }
  });
});

// ─── Real schema fixtures ─────────────────────────────────────────────────────

describe("schemaDoc — zoneOverrideSchema (real)", () => {
  it("returns exactly the expected 9 fields", () => {
    const doc = describeSchema(zoneOverrideSchema);
    const names = doc.fields.map((f) => f.field);
    expect(names).toEqual([
      "name",
      "hasFarm",
      "hasMine",
      "hasWater",
      "buildings",
      "baseTurns",
      "entryCost",
      "upgradeMap",
      "seasonDrops",
    ]);
  });

  it("upgradeMap has description 'Replaced wholesale'", () => {
    const doc = describeSchema(zoneOverrideSchema);
    const upgradeMap = doc.fields.find((f) => f.field === "upgradeMap");
    expect(upgradeMap?.description).toBe("Replaced wholesale");
  });

  it("upgradeMap is optional", () => {
    const doc = describeSchema(zoneOverrideSchema);
    const upgradeMap = doc.fields.find((f) => f.field === "upgradeMap");
    expect(upgradeMap?.optional).toBe(true);
  });

  it("upgradeMap type is a record string->string", () => {
    const doc = describeSchema(zoneOverrideSchema);
    const upgradeMap = doc.fields.find((f) => f.field === "upgradeMap");
    expect(upgradeMap?.type).toBe("record<string, string>");
  });

  it("baseTurns is optional, type 'number (int, ≥1)'", () => {
    const doc = describeSchema(zoneOverrideSchema);
    const baseTurns = doc.fields.find((f) => f.field === "baseTurns");
    expect(baseTurns?.optional).toBe(true);
    expect(baseTurns?.type).toBe("number (int, ≥1)");
  });

  it("name is optional string", () => {
    const doc = describeSchema(zoneOverrideSchema);
    const name = doc.fields.find((f) => f.field === "name");
    expect(name?.optional).toBe(true);
    expect(name?.type).toBe("string");
  });

  it("passthrough is false (strict schema)", () => {
    const doc = describeSchema(zoneOverrideSchema);
    expect(doc.passthrough).toBe(false);
  });
});

describe("schemaDoc — tileItemSchema (real)", () => {
  it("includes 'label' field with description 'Display name in UI, wiki, and tooltips'", () => {
    const doc = describeSchema(tileItemSchema);
    const label = doc.fields.find((f) => f.field === "label");
    expect(label).toBeTruthy();
    expect(label?.description).toBe("Display name in UI, wiki, and tooltips");
  });

  it("kind field has type '\"tile\"' (string literal)", () => {
    const doc = describeSchema(tileItemSchema);
    const kind = doc.fields.find((f) => f.field === "kind");
    expect(kind?.type).toBe('"tile"');
  });

  it("kind field is not optional", () => {
    const doc = describeSchema(tileItemSchema);
    const kind = doc.fields.find((f) => f.field === "kind");
    expect(kind?.optional).toBe(false);
  });

  it("passthrough is true", () => {
    const doc = describeSchema(tileItemSchema);
    expect(doc.passthrough).toBe(true);
  });

  it("tileItemSchema has its own description 'Board tile entry in ITEMS'", () => {
    const doc = describeSchema(tileItemSchema);
    expect(doc.description).toBe("Board tile entry in ITEMS");
  });

  it("'next' field (union string|null, optional) is typed as 'string | null'", () => {
    const doc = describeSchema(tileItemSchema);
    const next = doc.fields.find((f) => f.field === "next");
    expect(next?.type).toBe("string | null");
    expect(next?.optional).toBe(true);
  });
});

// ─── typeString standalone ────────────────────────────────────────────────────

describe("typeString standalone — edge cases", () => {
  it("null input → 'unknown'", () => {
    expect(typeString(null)).toBe("unknown");
  });

  it("non-schema object → 'unknown'", () => {
    expect(typeString({})).toBe("unknown");
  });

  it("z.never() → 'never'", () => {
    expect(typeString(z.never())).toBe("never");
  });

  it("unrecognised tag → 'unknown'", () => {
    // Build a synthetic schema-like object with unknown type tag
    const fakeSchema = { type: "totally_unknown_type", _zod: { def: { type: "totally_unknown_type" } } };
    expect(typeString(fakeSchema)).toBe("unknown");
  });
});
