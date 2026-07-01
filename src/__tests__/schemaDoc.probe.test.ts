/**
 * Zod-4 internals canary for schemaDoc.ts.
 *
 * schemaDoc.ts introspects Zod schemas through a handful of PRIVATE internal
 * accessors (documented in that file's header). Those accessors are the only
 * thing standing between the Dev-Panel wiki "schema" tab and a Zod upgrade that
 * quietly reshapes `_zod.def`. This suite is a compact tripwire: it exercises
 * one representative case per accessor family the consumer relies on, so a Zod
 * major-version bump that moves/renames any of them fails here loudly — well
 * before the cosmetic consumer breaks.
 *
 * It is deliberately NOT an exhaustive per-type characterization: schemaDoc's
 * own unit tests cover the type-string permutations. Keep this lean.
 *
 * Version pinned: zod@^4.4.3
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Zod 4 internals canary — schemaDoc accessors", () => {
  it("public shape + type-tag accessors (schema.shape / schema.type / _zod.def.type)", () => {
    // describeSchema reads object.shape as an ordered public Record, and getTag
    // reads the tag from BOTH schema.type and _zod.def.type.
    const s = z.object({ a: z.string(), b: z.number() });
    expect(Object.keys(s.shape)).toEqual(["a", "b"]);
    expect(s.type).toBe("object");
    expect(s._zod.def.type).toBe("object");
    expect(z.string().type).toBe("string");
    expect(z.string()._zod.def.type).toBe("string");
  });

  it("wrapper unwrapping: optional/default/nullable expose innerType + defaultValue", () => {
    // unwrap()/unwrapStructural()/readDescription() all peel wrappers via
    // _zod.def.innerType; default also carries _zod.def.defaultValue.
    const opt = z.string().optional();
    expect(opt._zod.def.type).toBe("optional");
    expect((opt._zod.def as { innerType: { type: string } }).innerType.type).toBe("string");

    const def = z.string().default("fallback");
    expect(def._zod.def.type).toBe("default");
    expect((def._zod.def as { defaultValue: unknown }).defaultValue).toBe("fallback");

    expect(z.string().nullable()._zod.def.type).toBe("nullable");
  });

  it(".description getter surfaces describe() text (used by readDescription)", () => {
    expect(z.string().describe("hello").description).toBe("hello");
    expect(z.string().optional().description).toBeUndefined();
  });

  it("compound-type payload accessors (literal/enum/array/record/union/tuple)", () => {
    // typeString() reads a distinct payload field per compound type. If any of
    // these field names move, the wiki type strings silently corrupt.
    expect((z.literal("tile")._zod.def as { values: unknown[] }).values).toEqual(["tile"]);
    expect((z.enum(["a", "b"])._zod.def as { entries: Record<string, string> }).entries).toEqual({ a: "a", b: "b" });
    expect((z.array(z.string())._zod.def as { element: { type: string } }).element.type).toBe("string");

    const rec = z.record(z.string(), z.number())._zod.def as { keyType: { type: string }; valueType: { type: string } };
    expect(rec.keyType.type).toBe("string");
    expect(rec.valueType.type).toBe("number");

    expect((z.union([z.string(), z.null()])._zod.def as { options: unknown[] }).options).toHaveLength(2);
    expect((z.tuple([z.string(), z.number()])._zod.def as { items: unknown[] }).items).toHaveLength(2);
  });

  it("number bounds accessors (minValue/maxValue/isInt) incl. int-floor sentinel", () => {
    // numberTypeString() reads these direct props and must distinguish a real
    // user min from the .int() safe-integer floor sentinel.
    const n = z.number().min(1).max(10);
    expect(n.minValue).toBe(1);
    expect(n.maxValue).toBe(10);
    expect(n.isInt).toBe(false);
    expect(z.number().int().isInt).toBe(true);
    // The int-floor sentinel schemaDoc treats as "no user min".
    expect(z.number().int().minValue).toBe(-9007199254740991);
  });

  it("object mode discriminated by _zod.def.catchall (passthrough vs strict vs strip)", () => {
    // isPassthrough() keys entirely off the catchall's inner tag.
    expect(z.object({ x: z.string() }).passthrough()._zod.def.catchall?._zod.def.type).toBe("unknown");
    expect(z.object({ x: z.string() }).strict()._zod.def.catchall?._zod.def.type).toBe("never");
    expect(z.object({ x: z.string() })._zod.def.catchall).toBeUndefined();
  });
});
