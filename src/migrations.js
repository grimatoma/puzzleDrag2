/**
 * Save-file migration pipeline.
 * Each step takes a raw parsed save object and returns { state, version }.
 * The pipeline is applied sequentially when a save is loaded.
 */

const CURRENT_VERSION = 4;

/**
 * Migrate a raw save object to the current schema.
 * Returns { state, version } where state is the migrated object.
 */
export function migrateState(raw) {
  let state = { ...raw };
  let version = raw.version ?? 0;

  // v0→v1: no-op (pre-versioning)
  // v1→v2: no-op
  // v2→v3: no-op

  // v3→v4: seed state.workers if missing; seed pool=1 if absent
  if (version < 4) {
    if (!state.workers) {
      state.workers = { hired: { hilda:0, pip:0, wila:0, tuck:0, osric:0, dren:0 }, debt: 0, pool: 1 };
    } else {
      state.workers = {
        hired: { hilda:0, pip:0, wila:0, tuck:0, osric:0, dren:0,
          ...(state.workers.hired ?? {}) },
        debt: state.workers.debt ?? 0,
        pool: state.workers.pool ?? 1,
      };
    }
    version = 4;
  }

  return { state, version };
}
