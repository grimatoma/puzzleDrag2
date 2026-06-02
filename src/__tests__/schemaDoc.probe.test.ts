/**
 * Characterization / probe test for Zod 4.4.x introspection API.
 *
 * This file documents the exact Zod-4 internal properties that
 * schemaDoc.ts relies on. If a Zod upgrade changes these internals,
 * this test will fail loudly before any consumer breaks.
 *
 * Version pinned: zod@^4.4.3
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zoneOverrideSchema } from "../config/schemas/zone.js";
import { tileItemSchema } from "../config/schemas/item.js";

describe("Zod 4 introspection — schemaDoc.probe", () => {
  // ─── shape enumeration ──────────────────────────────────────────────────────

  it("object.shape is a public Record<field, ZodType> in declaration order", () => {
    const s = z.object({ a: z.string(), b: z.number(), c: z.boolean() });
    expect(typeof s.shape).toBe("object");
    expect(Object.keys(s.shape)).toEqual(["a", "b", "c"]);
  });

  // ─── .description getter ────────────────────────────────────────────────────

  it(".description getter returns the describe() text on the outer schema", () => {
    const plain = z.string().describe("hello");
    expect(plain.description).toBe("hello");
  });

  it(".description on optional().describe() is on the outer wrapper, inner has none", () => {
    const s = z.string().optional().describe("outer desc");
    expect(s.description).toBe("outer desc");
    // The inner (unwrapped) schema has no description
    const inner = s._zod.def.innerType as z.ZodString;
    expect(inner.description).toBeUndefined();
  });

  it(".description is undefined if .describe() was not called", () => {
    const s = z.string().optional();
    expect(s.description).toBeUndefined();
  });

  // ─── type tags ──────────────────────────────────────────────────────────────

  it("type tag is on schema.type (not just _zod.def.type)", () => {
    expect(z.string().type).toBe("string");
    expect(z.number().type).toBe("number");
    expect(z.boolean().type).toBe("boolean");
    expect(z.null().type).toBe("null");
    expect(z.unknown().type).toBe("unknown");
    expect(z.any().type).toBe("any");
  });

  it("optional, default, nullable types", () => {
    expect(z.string().optional()._zod.def.type).toBe("optional");
    expect(z.string().default("x")._zod.def.type).toBe("default");
    expect(z.string().nullable()._zod.def.type).toBe("nullable");
  });

  it("literal type tag and values array", () => {
    const lit = z.literal("tile");
    expect(lit._zod.def.type).toBe("literal");
    expect(lit._zod.def.values).toEqual(["tile"]);
  });

  it("enum type tag and entries object", () => {
    const en = z.enum(["a", "b", "c"]);
    expect(en._zod.def.type).toBe("enum");
    expect(en._zod.def.entries).toEqual({ a: "a", b: "b", c: "c" });
  });

  it("array type tag and element field", () => {
    const arr = z.array(z.string());
    expect(arr._zod.def.type).toBe("array");
    expect(arr._zod.def.element.type).toBe("string");
  });

  it("record type tag with keyType and valueType", () => {
    const rec = z.record(z.string(), z.number());
    expect(rec._zod.def.type).toBe("record");
    expect(rec._zod.def.keyType.type).toBe("string");
    expect(rec._zod.def.valueType.type).toBe("number");
  });

  it("union type tag and options array", () => {
    const un = z.union([z.string(), z.null()]);
    expect(un._zod.def.type).toBe("union");
    expect(un._zod.def.options).toHaveLength(2);
  });

  it("discriminatedUnion is also tagged 'union' with options array", () => {
    const du = z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("a") }),
      z.object({ kind: z.literal("b") }),
    ]);
    expect(du._zod.def.type).toBe("union");
    expect(du._zod.def.options).toHaveLength(2);
  });

  it("tuple type tag", () => {
    const tup = z.tuple([z.string(), z.number()]);
    expect(tup._zod.def.type).toBe("tuple");
  });

  it("object type tag", () => {
    expect(z.object({ x: z.string() })._zod.def.type).toBe("object");
  });

  // ─── optional / default unwrapping ──────────────────────────────────────────

  it("optional wrapper: innerType is accessible via _zod.def.innerType", () => {
    const s = z.string().optional();
    expect(s._zod.def.type).toBe("optional");
    expect(s._zod.def.innerType.type).toBe("string");
  });

  it("default wrapper: innerType and defaultValue accessible in _zod.def", () => {
    const s = z.string().default("fallback");
    expect(s._zod.def.type).toBe("default");
    expect(s._zod.def.innerType.type).toBe("string");
    expect(s._zod.def.defaultValue).toBe("fallback");
  });

  it("nullable wrapper: innerType accessible in _zod.def", () => {
    const s = z.string().nullable();
    expect(s._zod.def.type).toBe("nullable");
    expect(s._zod.def.innerType.type).toBe("string");
  });

  // ─── number constraints ──────────────────────────────────────────────────────

  it("number.isInt reflects .int() constraint", () => {
    expect(z.number().isInt).toBe(false);
    expect(z.number().int().isInt).toBe(true);
  });

  it("number.minValue and .maxValue reflect .min()/.max() bounds", () => {
    const n = z.number().min(1).max(10);
    expect(n.minValue).toBe(1);
    expect(n.maxValue).toBe(10);
  });

  it("number without min/max has ±Infinity sentinels", () => {
    const n = z.number();
    expect(n.minValue).toBe(-Infinity);
    expect(n.maxValue).toBe(Infinity);
  });

  it("number.int() without explicit min has minValue === -MAX_SAFE_INTEGER (int floor)", () => {
    const n = z.number().int();
    // This is the int-floor sentinel, not a user-supplied min
    expect(n.minValue).toBe(-9007199254740991);
  });

  it("number.int().min(0) has user-supplied minValue 0", () => {
    const n = z.number().int().min(0);
    expect(n.minValue).toBe(0);
    expect(n.isInt).toBe(true);
  });

  // ─── passthrough vs strict ───────────────────────────────────────────────────

  it(".passthrough() sets catchall type to 'unknown'", () => {
    const s = z.object({ x: z.string() }).passthrough();
    expect(s._zod.def.catchall?._zod.def.type).toBe("unknown");
  });

  it(".strict() sets catchall type to 'never'", () => {
    const s = z.object({ x: z.string() }).strict();
    expect(s._zod.def.catchall?._zod.def.type).toBe("never");
  });

  it("plain z.object() has no catchall (undefined)", () => {
    const s = z.object({ x: z.string() });
    expect(s._zod.def.catchall).toBeUndefined();
  });

  // ─── real schema fixtures ────────────────────────────────────────────────────

  it("zoneOverrideSchema: shape has expected fields", () => {
    const fields = Object.keys(zoneOverrideSchema.shape);
    expect(fields).toContain("name");
    expect(fields).toContain("baseTurns");
    expect(fields).toContain("upgradeMap");
    expect(fields).toContain("seasonDrops");
  });

  it("zoneOverrideSchema.upgradeMap has description 'Replaced wholesale' on outer optional", () => {
    const upgradeMap = zoneOverrideSchema.shape.upgradeMap;
    // .describe() is on the optional wrapper
    expect(upgradeMap.description).toBe("Replaced wholesale");
  });

  it("zoneOverrideSchema.baseTurns is optional with int + min(1) number inside", () => {
    const baseTurns = zoneOverrideSchema.shape.baseTurns;
    expect(baseTurns._zod.def.type).toBe("optional");
    const inner = baseTurns._zod.def.innerType;
    expect(inner.type).toBe("number");
    expect(inner.isInt).toBe(true);
    expect(inner.minValue).toBe(1);
  });

  it("zoneOverrideSchema is strict (catchall = never)", () => {
    expect(zoneOverrideSchema._zod.def.catchall?._zod.def.type).toBe("never");
  });

  it("tileItemSchema.label has description 'Display name in UI, wiki, and tooltips'", () => {
    const label = tileItemSchema.shape.label;
    expect(label.description).toBe("Display name in UI, wiki, and tooltips");
  });

  it("tileItemSchema.kind is z.literal('tile')", () => {
    const kind = tileItemSchema.shape.kind;
    expect(kind._zod.def.type).toBe("literal");
    expect(kind._zod.def.values).toEqual(["tile"]);
  });

  it("tileItemSchema is passthrough (catchall = unknown)", () => {
    expect(tileItemSchema._zod.def.catchall?._zod.def.type).toBe("unknown");
  });
});
