import { getSchemaTypeName } from "../config/schemas/schemaTypeName.js";
/**
 * schemaDoc.ts — Pure Zod-4 introspection engine.
 *
 * Converts a Zod object schema into a structured `SchemaDoc` that lists each
 * field's name, human-readable type string, optionality, default, and doc
 * string.  No React, no DOM — safe to import anywhere.
 *
 * Zod 4 API facts (pinned by src/__tests__/schemaDoc.probe.test.ts, zod@^4.4.3):
 *  - schema.type             — string tag e.g. "string", "number", "object", "optional"
 *  - schema._zod.def         — raw definition object
 *  - schema._zod.def.type    — same tag as schema.type (both exist)
 *  - schema.description      — public getter returning .describe() text (or undefined)
 *  - object.shape            — Record<field, ZodType>, declaration order preserved
 *  - optional wrapper        — { type:"optional", innerType: ZodType }
 *  - default wrapper         — { type:"default",  innerType: ZodType, defaultValue: unknown }
 *  - nullable wrapper        — { type:"nullable",  innerType: ZodType }
 *  - literal                 — { type:"literal",  values: unknown[] }
 *  - enum                    — { type:"enum",     entries: Record<string,string> }
 *  - array                   — { type:"array",    element: ZodType }
 *  - record                  — { type:"record",   keyType: ZodType, valueType: ZodType }
 *  - union                   — { type:"union",    options: ZodType[] }
 *  - tuple                   — { type:"tuple",    items: ZodType[] }
 *  - number min/max          — schema.minValue / schema.maxValue (direct props, -Infinity/Infinity when unset)
 *  - number.isInt            — boolean (false unless .int() was called)
 *  - passthrough             — _zod.def.catchall._zod.def.type === "unknown"
 *  - strict                  — _zod.def.catchall._zod.def.type === "never"
 *  - plain object            — _zod.def.catchall === undefined  (strip mode)
 */

// ─── Public interface ─────────────────────────────────────────────────────────

export interface FieldDoc {
  /** Field name as declared in the schema. */
  field: string;
  /** Human-readable type string. */
  type: string;
  /** True if wrapped in .optional() OR .default(). */
  optional: boolean;
  /** Present only when a .default() was applied. */
  default?: unknown;
  /** .describe() text (checked on outer schema then inner after unwrapping). */
  description?: string;
  /** Present when this field is itself a Zod object — its sub-fields, one level deep. */
  children?: FieldDoc[];
}

export interface SchemaDoc {
  /** Top-level object fields in declaration order. */
  fields: FieldDoc[];
  /** True if the object allows unknown keys (.passthrough()); false for .strict()/strip. */
  passthrough: boolean;
  /** The object schema's own .describe() text, if any. */
  description?: string;
}

/**
 * Introspect a Zod object schema (may be wrapped in optional/default) into a
 * `SchemaDoc`.
 *
 * @throws {Error} if, after unwrapping wrappers, the root is not a Zod object.
 */
export function describeSchema(schema: unknown): SchemaDoc {
  const root = unwrap(schema as ZodLike).schema;

  if (!isZodObject(root)) {
    const tag = getTag(root);
    throw new Error(
      `describeSchema: expected a Zod object schema at the root, got "${tag}". ` +
        "Pass a z.object({…}) schema (optionally wrapped in .optional()/.default()).",
    );
  }

  const def = (root as ZodLike)._zod.def as unknown as ZodObjectDef;
  const shape: Record<string, ZodLike> = def.shape as Record<string, ZodLike>;

  const fields: FieldDoc[] = Object.entries(shape).map(([field, fieldSchema]) => {
    const desc = readDescription(fieldSchema);
    const { schema: inner, optional, defaultValue, hasDefault } = unwrap(fieldSchema);
    const entry: FieldDoc = {
      field,
      type: typeString(inner),
      optional,
      description: desc,
    };
    if (hasDefault) {
      entry.default = defaultValue;
    }
    if (isZodObject(inner)) {
      try {
        entry.children = describeSchema(inner).fields;
      } catch {
        // leave children undefined on introspection failure
      }
    }
    return entry;
  });

  return {
    fields,
    passthrough: isPassthrough(root as ZodLike),
    description: readDescription(root as ZodLike),
  };
}

// ─── Internal types ───────────────────────────────────────────────────────────

// Minimal structural types for Zod 4 internals — just enough for introspection.
// We avoid importing from zod/v4 internals to stay stable; we read raw _zod.def.

interface ZodLike {
  type?: string;
  description?: string;
  // Number-specific direct props
  minValue?: number;
  maxValue?: number;
  isInt?: boolean;
  _zod: {
    def: Record<string, unknown>;
  };
}

interface ZodObjectDef {
  type: "object";
  shape: Record<string, unknown>;
  catchall?: ZodLike;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return the Zod type tag string. */
function getTag(schema: unknown): string {
  if (schema == null || typeof schema !== "object") return "non-schema";
  const s = schema as ZodLike;
  return (s.type as string) ?? ((s._zod?.def?.type as string) ?? "unknown");
}

/** True if `schema` is a Zod object. */
function isZodObject(schema: unknown): boolean {
  return getTag(schema) === "object";
}

interface UnwrapResult {
  schema: ZodLike;
  optional: boolean;
  hasDefault: boolean;
  defaultValue: unknown;
}

/**
 * Peel off optional / default / nullable wrappers.
 *
 * - optional → optional = true, unwrap to innerType
 * - default  → optional = true, capture defaultValue, unwrap to innerType
 * - nullable → NOT removed here (we want to reflect it in the type string as "…| null")
 *
 * We only unwrap optional/default, not nullable.  typeString() handles nullable
 * by appending " | null" after recursing into the inner type.
 */
function unwrap(schema: ZodLike): UnwrapResult {
  let s = schema;
  let optional = false;
  let hasDefault = false;
  let defaultValue: unknown = undefined;

  for (;;) {
    const tag = getTag(s);
    if (tag === "optional") {
      optional = true;
      s = (s._zod.def as { innerType: ZodLike }).innerType;
    } else if (tag === "default") {
      optional = true;
      hasDefault = true;
      defaultValue = (s._zod.def as { defaultValue: unknown }).defaultValue;
      s = (s._zod.def as { innerType: ZodLike }).innerType;
    } else {
      break;
    }
  }

  return { schema: s, optional, hasDefault, defaultValue };
}

/**
 * Read the description from a schema.
 *
 * .describe() stores its text in the registry so that `schema.description` is
 * a public getter.  When the caller writes `.optional().describe("…")`, the
 * description sits on the optional wrapper; the inner schema has none.
 * We check the outer schema first and return the first non-empty string found
 * while unwrapping optional/default/nullable layers.
 */
function readDescription(schema: ZodLike): string | undefined {
  let s: ZodLike | undefined = schema;
  while (s != null) {
    if (s.description) return s.description;
    const tag = getTag(s);
    if (tag === "optional" || tag === "default" || tag === "nullable") {
      s = (s._zod.def as { innerType: ZodLike }).innerType;
    } else {
      break;
    }
  }
  return undefined;
}

/**
 * True if the object schema allows unknown keys (.passthrough()).
 *
 * In Zod 4:
 *  - .passthrough() → catchall = ZodUnknown  (type = "unknown")
 *  - .strict()      → catchall = ZodNever    (type = "never")
 *  - plain object   → catchall = undefined   (strip mode, not passthrough)
 */
function isPassthrough(objectSchema: ZodLike): boolean {
  const def = objectSchema._zod.def as unknown as ZodObjectDef;
  const catchall = def.catchall;
  if (!catchall) return false;
  return getTag(catchall) === "unknown";
}

// ─── Type-string builder ──────────────────────────────────────────────────────

// safeint min/max — set by .int() when no explicit min/max is given.
const SAFEINT_MIN = -9007199254740991;
const SAFEINT_MAX = 9007199254740991;

/**
 * Build a human-readable type string for a schema.
 *
 * Rules (nullable is handled inline: append " | null" after unwrapping).
 * Unrecognised types fall back to "unknown" without throwing.
 */
export function typeString(schema: unknown): string {
  if (schema == null || typeof schema !== "object") return "unknown";

  const registered = getSchemaTypeName(schema);
  if (registered) return registered;

  const s = schema as ZodLike;
  const tag = getTag(s);

  switch (tag) {
    case "string":
      return "string";

    case "number":
      return numberTypeString(s);

    case "boolean":
      return "boolean";

    case "null":
      return "null";

    case "unknown":
    case "any":
      return tag;

    case "literal": {
      const values = (s._zod.def as { values: unknown[] }).values;
      if (values.length === 1) {
        const v = values[0];
        return typeof v === "string" ? `"${v}"` : String(v);
      }
      // Multi-value literal (rare) — join them
      return values
        .map((v) => (typeof v === "string" ? `"${v}"` : String(v)))
        .join(" | ");
    }

    case "enum": {
      const entries = (s._zod.def as { entries: Record<string, string> }).entries;
      return "enum: " + Object.values(entries).join(" | ");
    }

    case "array": {
      const element = (s._zod.def as { element: ZodLike }).element;
      return typeString(element) + "[]";
    }

    case "record": {
      const def = s._zod.def as { keyType: ZodLike; valueType: ZodLike };
      const keyTs = typeString(def.keyType);
      const valueTs = typeString(def.valueType);
      if (keyTs === "string") {
        return `record<${keyTs}, ${valueTs}>`;
      }
      if (!isVerboseEnumType(keyTs) && !isVerboseEnumType(valueTs)) {
        return `PartialRecord<${keyTs}, ${valueTs}>`;
      }
      return `record<${keyTs}, ${valueTs}>`;
    }

    case "object":
      // Nested objects: just "object" (do not recurse into fields for type string)
      return "object";

    case "nullable": {
      const inner = (s._zod.def as { innerType: ZodLike }).innerType;
      return typeString(inner) + " | null";
    }

    case "union": {
      const options = (s._zod.def as { options: ZodLike[] }).options;
      return options.map(typeString).join(" | ");
    }

    case "tuple": {
      const items = (s._zod.def as { items: ZodLike[] }).items;
      return `[${items.map(typeString).join(", ")}]`;
    }

    case "optional": {
      // If typeString is called on an optional after unwrapping, just return inner
      const inner = (s._zod.def as { innerType: ZodLike }).innerType;
      return typeString(inner);
    }

    case "default": {
      const inner = (s._zod.def as { innerType: ZodLike }).innerType;
      return typeString(inner);
    }

    case "never":
      return "never";

    default:
      return "unknown";
  }
}

/** Long inlined native-enum strings — prefer catalog type aliases when possible. */
function isVerboseEnumType(typeStr: string): boolean {
  return typeStr.startsWith("enum:");
}

/** Build the number type string: "number", "number (int)", "number (int, ≥1)", etc. */
function numberTypeString(s: ZodLike): string {
  const isInt = s.isInt === true;
  const rawMin = s.minValue ?? -Infinity;
  const rawMax = s.maxValue ?? Infinity;

  // Treat the .int() floor/ceiling sentinels as "no user constraint"
  const hasMin = rawMin !== -Infinity && rawMin !== SAFEINT_MIN;
  const hasMax = rawMax !== Infinity && rawMax !== SAFEINT_MAX;

  const parts: string[] = [];
  if (isInt) parts.push("int");

  if (hasMin && hasMax) {
    parts.push(`${rawMin}–${rawMax}`);
  } else if (hasMin) {
    parts.push(`≥${rawMin}`);
  } else if (hasMax) {
    parts.push(`≤${rawMax}`);
  }

  if (parts.length === 0) return "number";
  return `number (${parts.join(", ")})`;
}
