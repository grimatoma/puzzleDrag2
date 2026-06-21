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
  // 47 → 48: the home zone was re-laddered from the 6-rung PC2 Camp→Manor curve
  // to the 4-rung Outpost→Hamlet→Village→City town-layout design (3/6/12/20), and
  // every lot was repositioned roads-first. Old rungs fold pairwise into the new
  // ladder, so remap any saved home settlement tier into the new 0..3 range
  // (Camp/Settlement keep their index; Village+Town → Village; City+Manor → City).
  // Built-lot indices are left untouched: each new rung has ≥ the plots its
  // absorbed old rungs had, so no placed building is orphaned (it simply sits at
  // its new authored position — the intended relayout). Guards are by hand because
  // the tests tsconfig runs with `strictNullChecks: false`.
  47: (save) => {
    const OLD_HOME_TIER_TO_NEW = [0, 1, 2, 2, 3, 3];
    const settlements = save.settlements;
    if (settlements && typeof settlements === "object") {
      const home = (settlements as Record<string, unknown>).home;
      if (home && typeof home === "object") {
        const t = (home as Record<string, unknown>).tier;
        if (typeof t === "number") {
          const mapped = OLD_HOME_TIER_TO_NEW[Math.max(0, Math.min(5, Math.floor(t)))] ?? 3;
          return {
            ...save,
            settlements: {
              ...(settlements as Record<string, unknown>),
              home: { ...(home as Record<string, unknown>), tier: mapped },
            },
            version: 48,
          };
        }
      }
    }
    return { ...save, version: 48 };
  },
  // 48 → 49: home lots were re-laid into aligned frontage rows (no schema-shape
  // change). Pure version bump — buildings remain keyed by stable lot index; the
  // bump just retires 48-era saves so none renders a building on a moved lot.
  48: (save) => ({ ...save, version: 49 }),
  // 49 → 50: added the Town Hall "Tithes & Provisions" civic economy. Seed the
  // new `civicEconomy` slice on old saves so the Town Hall opens with a fresh
  // (claimable) cooldown and no pending provisions.
  49: (save) => ({
    ...save,
    civicEconomy: { lastClaimedAt: null, pendingProvisions: {} },
    version: 50,
  }),
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
