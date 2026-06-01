import { z } from "zod";

/**
 * Validate a balance override section. Throws on any invalid shape (all-or-nothing).
 * Use when applying patches so bad Dev Panel / draft data cannot partially mutate live tables.
 */
export function parseOverrideSection<T>(
  section: string,
  schema: z.ZodType<T>,
  raw: unknown,
): T {
  const result = schema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  throw new Error(
    `Invalid balance overrides (${section}):\n${z.prettifyError(result.error)}`,
  );
}

/** Like {@link parseOverrideSection} but returns undefined when the section is absent. */
export function parseOptionalOverrideSection<T>(
  section: string,
  schema: z.ZodType<T>,
  raw: unknown,
): T | undefined {
  if (raw === undefined || raw === null) return undefined;
  return parseOverrideSection(section, schema, raw);
}
