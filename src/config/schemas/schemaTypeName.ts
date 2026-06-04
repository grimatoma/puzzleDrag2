import type { z } from "zod";

/**
 * Registry of human-readable type aliases for Zod schemas.
 *
 * Used by the Dev Panel wiki (`schemaDoc.typeString`) so catalog enums and
 * composed farm-board shapes render as `ZoneCategoryId` / `FarmUpgradeMap`
 * instead of inlined `enum: birds | cattle | …` lists.
 */
const TYPE_NAMES = new WeakMap<object, string>();

/** Attach a wiki / docs display name to a schema (returns the same instance). */
export function schemaTypeName<T extends z.ZodType>(name: string, schema: T): T {
  TYPE_NAMES.set(schema as object, name);
  return schema;
}

/** Resolve a registered display name, unwrapping optional/default/nullable shells. */
export function getSchemaTypeName(schema: unknown): string | undefined {
  if (schema == null || typeof schema !== "object") return undefined;

  let current: unknown = schema;
  for (;;) {
    const name = TYPE_NAMES.get(current as object);
    if (name) return name;

    const tag =
      (current as { type?: string }).type ??
      ((current as { _zod?: { def?: { type?: string } } })._zod?.def?.type as
        | string
        | undefined);

    if (tag === "optional" || tag === "default" || tag === "nullable") {
      current = (
        current as { _zod: { def: { innerType: unknown } } }
      )._zod.def.innerType;
      continue;
    }
    break;
  }
  return undefined;
}
