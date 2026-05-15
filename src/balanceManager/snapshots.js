// Named draft snapshots — small store on top of localStorage that lets a
// designer save the current Balance Manager draft under a friendly name
// (e.g. "easy", "tight economy", "speedrun") and reload it later. Useful
// for keeping multiple tuning presets in flight without trampling the
// committed balance.json or losing in-progress experiments.
//
// Storage layout: a single localStorage key holds an object keyed by
// snapshot name:
//
//   { [name]: { savedAt: <iso>, version: 1, draft: <full draft doc> } }
//
// All API functions are pure (or in the case of `read*` / `write*`, fail
// silently when localStorage is unavailable) so they're trivial to unit
// test against an in-memory fake.

export const SNAPSHOTS_KEY = "hearth.balance.snapshots";
export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_NAME_MAX = 60;

/** Validate / canonicalise a user-supplied snapshot name. */
export function normaliseSnapshotName(name) {
  const trimmed = String(name ?? "").trim();
  if (trimmed.length === 0) return { ok: false, name: "", message: "Snapshot name is required." };
  if (trimmed.length > SNAPSHOT_NAME_MAX) {
    return { ok: false, name: trimmed.slice(0, SNAPSHOT_NAME_MAX), message: `Snapshot name must be ${SNAPSHOT_NAME_MAX} characters or fewer.` };
  }
  return { ok: true, name: trimmed, message: "" };
}

/** Read every snapshot from a storage handle (defaulting to localStorage). */
export function readSnapshots(storage) {
  const store = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!store) return {};
  try {
    const raw = store.getItem(SNAPSHOTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [name, entry] of Object.entries(parsed)) {
      if (!name || typeof entry !== "object" || !entry || typeof entry.draft !== "object") continue;
      out[name] = {
        savedAt: typeof entry.savedAt === "string" ? entry.savedAt : null,
        version: Number.isFinite(entry.version) ? entry.version : SNAPSHOT_VERSION,
        draft: entry.draft,
      };
    }
    return out;
  } catch { return {}; }
}

function writeSnapshots(map, storage) {
  const store = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!store) return false;
  try {
    if (!map || Object.keys(map).length === 0) {
      store.removeItem(SNAPSHOTS_KEY);
    } else {
      store.setItem(SNAPSHOTS_KEY, JSON.stringify(map));
    }
    return true;
  } catch { return false; }
}

/** List snapshots sorted by `savedAt` descending (newest first). */
export function listSnapshots(storage) {
  const map = readSnapshots(storage);
  return Object.entries(map)
    .map(([name, entry]) => ({ name, savedAt: entry.savedAt, version: entry.version }))
    .sort((a, b) => {
      const av = a.savedAt || "";
      const bv = b.savedAt || "";
      if (av === bv) return a.name.localeCompare(b.name);
      return av < bv ? 1 : -1;
    });
}

/** Persist a snapshot under the given name. Returns `{ ok, name, message }`. */
export function saveSnapshot(name, draft, storage, now = () => new Date().toISOString()) {
  const check = normaliseSnapshotName(name);
  if (!check.ok) return check;
  if (!draft || typeof draft !== "object") return { ok: false, name: check.name, message: "Cannot save an empty draft." };
  const map = readSnapshots(storage);
  let serialised;
  try {
    serialised = JSON.parse(JSON.stringify(draft));
  } catch { return { ok: false, name: check.name, message: "Draft contains a value that cannot be serialised to JSON." }; }
  map[check.name] = { savedAt: now(), version: SNAPSHOT_VERSION, draft: serialised };
  if (!writeSnapshots(map, storage)) return { ok: false, name: check.name, message: "Could not write to localStorage." };
  return { ok: true, name: check.name, message: "" };
}

/** Load and return a snapshot's draft (or `null` if not found). */
export function loadSnapshot(name, storage) {
  const map = readSnapshots(storage);
  const entry = map[name];
  if (!entry || typeof entry.draft !== "object") return null;
  try { return JSON.parse(JSON.stringify(entry.draft)); } catch { return null; }
}

/** Delete a snapshot. Returns true if one was actually removed. */
export function deleteSnapshot(name, storage) {
  const map = readSnapshots(storage);
  if (!Object.prototype.hasOwnProperty.call(map, name)) return false;
  delete map[name];
  writeSnapshots(map, storage);
  return true;
}

/** Move a snapshot from one name to another. */
export function renameSnapshot(oldName, newName, storage) {
  const check = normaliseSnapshotName(newName);
  if (!check.ok) return check;
  const map = readSnapshots(storage);
  if (!Object.prototype.hasOwnProperty.call(map, oldName)) {
    return { ok: false, name: check.name, message: "Snapshot to rename does not exist." };
  }
  if (oldName === check.name) return { ok: true, name: check.name, message: "" };
  if (Object.prototype.hasOwnProperty.call(map, check.name)) {
    return { ok: false, name: check.name, message: "A snapshot with that name already exists." };
  }
  map[check.name] = map[oldName];
  delete map[oldName];
  writeSnapshots(map, storage);
  return { ok: true, name: check.name, message: "" };
}
