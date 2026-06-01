/**
 * Dev Panel override targets must exist in live catalog tables.
 * In development builds, unknown ids throw immediately; production skips them.
 */

export function rejectUnknownOverrideTarget(section: string, id: string): void {
  if (import.meta.env.DEV) {
    throw new Error(`Unknown balance override target: ${section}.${id}`);
  }
}

/** Throw in DEV when patch keys are absent from a live catalog id set. */
export function rejectUnknownOverrideKeys(
  section: string,
  keys: Iterable<string>,
  known: ReadonlySet<string>,
): void {
  if (!import.meta.env.DEV) return;
  for (const key of keys) {
    if (!known.has(key)) rejectUnknownOverrideTarget(section, key);
  }
}
