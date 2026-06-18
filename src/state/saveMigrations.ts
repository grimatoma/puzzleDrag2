// Save-migration ladder. Replaces the old "discard the save on any version
// mismatch" behaviour with an ordered chain of pure `version -> version + 1`
// transforms, so an existing player who reloads after a shipped shape change
// keeps their progress instead of starting over.
//
// This module is intentionally pure: no `localStorage`, no `console`, no
// Phaser. The caller (`loadSavedState`) does the I/O and logging. Keeping it
// side-effect free means the whole ladder is unit-testable in the node/vitest
// env with no canvas.
//
// Contract for adding a migrator when you bump SAVE_SCHEMA_VERSION:
//   1. bump SAVE_SCHEMA_VERSION in constants.ts,
//   2. add a MIGRATIONS[oldVersion] entry below that upgrades old -> new and
//      sets `version` to oldVersion + 1,
//   3. add a fixture under src/__tests__/fixtures/saves/ + a migrator test.
// Saves with no migrator path (gaps, forward versions, corrupt/no version) are
// still discarded — fail-safe, never a silent half-upgrade.

import { SAVE_SCHEMA_VERSION } from "../constants.js";

/**
 * A pure transform that upgrades a save from `from` to `from + 1`.
 * MUST NOT mutate its input and MUST set `version` to `from + 1` on its output.
 */
export type SaveMigrator = (save: Record<string, unknown>) => Record<string, unknown>;

/**
 * Ordered ladder. Key = the version the save is AT before the migrator runs.
 * `MIGRATIONS[n]` upgrades a v(n) save to v(n+1). One entry per
 * SAVE_SCHEMA_VERSION bump; rungs must be contiguous up to the current version.
 */
export const MIGRATIONS: Record<number, SaveMigrator> = {
  // 45 -> 46: the Hearthkeeping idle layer (src/features/embergarden) adds the
  // persisted `embergarden` field. Old saves simply lack it; default it so the
  // accrual reducer/`createFreshState` shape is satisfied. `lastTickAt: null`
  // means "first foreground tick just stamps, accrues nothing" — an existing
  // player doesn't get a windfall from the migration itself.
  45: (save) => ({
    ...save,
    version: 46,
    embergarden: (save as { embergarden?: unknown }).embergarden ?? {
      warmth: 0,
      lifetimeWarmth: 0,
      hearthlight: 0,
      levels: {},
      lastTickAt: null,
    },
  }),
};

export type MigrateResult =
  | { ok: true; save: Record<string, unknown> }
  | { ok: false; reason: "no-version" | "forward-version" | "missing-migrator" };

/**
 * Forward-only apply loop. Returns the upgraded save (whose `version` equals
 * SAVE_SCHEMA_VERSION) or a typed failure the caller can log + discard on.
 *
 * - Forward-only: a save from a newer build (`v > current`) is rejected as
 *   `forward-version`; never run a migrator backward.
 * - Gap = fail safe: a missing rung while `v < current` returns
 *   `missing-migrator` → caller discards. Never half-migrate.
 * - Identity for current: `v === current` skips the loop and returns the save
 *   untouched (the "loads unchanged" guarantee).
 */
export function migrateSave(raw: Record<string, unknown>): MigrateResult {
  const v = raw.version;
  if (typeof v !== "number" || !Number.isFinite(v)) return { ok: false, reason: "no-version" };
  if (v > SAVE_SCHEMA_VERSION) return { ok: false, reason: "forward-version" };
  let cur = raw;
  let ver = v;
  while (ver < SAVE_SCHEMA_VERSION) {
    const step = MIGRATIONS[ver];
    if (!step) return { ok: false, reason: "missing-migrator" };
    cur = step(cur);
    if (cur.version !== ver + 1) {
      // Defensive: a migrator that forgets to bump `version` would otherwise
      // spin forever. Force the version forward so the loop always terminates.
      cur = { ...cur, version: ver + 1 };
    }
    ver += 1;
  }
  return { ok: true, save: cur };
}
