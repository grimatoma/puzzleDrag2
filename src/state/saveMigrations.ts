/**
 * Forward-only save migration ladder.
 *
 * Replaces the old "discard on version mismatch" gate with an ordered set of
 * pure `version → version+1` transforms. An old save reachable through the
 * ladder is upgraded in place (the player keeps their progress) instead of
 * being wiped. Saves with no migration path (a missing rung, a forward/unknown
 * version, or a missing/non-numeric `version`) are still discarded by the
 * caller — the ladder never half-migrates.
 *
 * Pure module: no `localStorage`, no `console`, no Phaser. The caller
 * (`loadSavedState`) owns logging + storage side-effects.
 *
 * Adding a SAVE_SCHEMA_VERSION bump:
 *   1. Bump `SAVE_SCHEMA_VERSION` in `constants.ts`.
 *   2. Add a `MIGRATIONS[oldVersion]` entry here that upgrades old → new and
 *      sets `version` to oldVersion + 1.
 *   3. Add a fixture under `src/__tests__/fixtures/saves/` + a migrator test.
 */
import { SAVE_SCHEMA_VERSION } from "../constants.js";

/** A pure transform that upgrades a save from `from` to `from + 1`. Must not mutate its input. */
export type SaveMigrator = (save: Record<string, unknown>) => Record<string, unknown>;

/**
 * Ordered ladder. Key = the version the save is AT before the migrator runs.
 * `MIGRATIONS[n]` upgrades a v(n) save to v(n+1) and MUST set `version` to n+1
 * on its output. Add one entry per SAVE_SCHEMA_VERSION bump; rungs must be
 * contiguous up to the current version.
 */
export const MIGRATIONS: Record<number, SaveMigrator> = {
  // 45 → 46: schema bump only. This rung originally seeded the "Fiber Crush"
  // `fiber` slice (since removed); it stays as a pure version bump so old v45
  // saves can still walk the chain up to the current version. (Any orphan
  // `fiber` field on a pre-existing v46 save is harmless — nothing reads it.)
  45: (save) => ({ ...save, version: 46 }),
  // 46 → 47: this version originally added the Hearthkeeping idle layer's
  // `embergarden` field, but that feature was removed too. The rung is kept as a
  // no-op version bump (and strips any leftover `embergarden`) so saves written
  // by the idle-layer build still load instead of being discarded as a forward
  // version — we never roll a shipped SAVE_SCHEMA_VERSION backward.
  46: (save) => {
    const { embergarden: _removed, ...rest } = save as Record<string, unknown> & { embergarden?: unknown };
    void _removed;
    return { ...rest, version: 47 };
  },
};

export type MigrateFailReason = "no-version" | "forward-version" | "missing-migrator";

// The sibling fields are declared optional on both members so callers can read
// `result.reason` / `result.save` without relying on discriminant narrowing —
// the tests tsconfig runs with `strictNullChecks: false`, where that narrowing
// is unreliable.
export type MigrateResult =
  | { ok: true; save: Record<string, unknown>; reason?: undefined }
  | { ok: false; save?: undefined; reason: MigrateFailReason };

/**
 * Forward-only apply loop. Returns the upgraded save (version ===
 * SAVE_SCHEMA_VERSION) or a typed failure the caller can log + discard on.
 *
 * - `no-version`      — `version` is missing or not a number.
 * - `forward-version` — save is from a NEWER build; never run a migrator backward.
 * - `missing-migrator` — a rung below current has no entry; fail safe, do not half-migrate.
 *
 * A `version === SAVE_SCHEMA_VERSION` save skips the loop and is returned
 * untouched (the "current save loads unchanged" guarantee).
 */
export function migrateSave(raw: Record<string, unknown>): MigrateResult {
  const v = raw.version;
  if (typeof v !== "number") return { ok: false, reason: "no-version" };
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
