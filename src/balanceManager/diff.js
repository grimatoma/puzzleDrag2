// Balance-draft diff helpers.
//
// The Balance Manager loads its starting draft from a merge of
// `balance.json` (committed) + a localStorage draft. When the designer
// makes edits and asks "what would actually change if I downloaded this
// draft and replaced balance.json?", these helpers answer that question:
// they produce a per-section breakdown of added / modified / removed
// entries, plus a flat list of paths suitable for review or PR notes.
//
// Comparison strategy:
//   - The top level is treated as a known set of sections (resources,
//     recipes, …). Top-level keys are processed independently.
//   - Inside each section, every key is compared via `valueDiff`. For
//     primitives that's deep-equality on the value; for objects, a single
//     entry can produce its own nested "added / modified / removed" list.
//
// Pure module: no React or DOM dependencies; safe to import from tests
// and from non-DOM code paths.

const STRUCTURAL_KEYS = new Set([
  "upgradeThresholds", "items", "recipes", "buildings",
  "tilePowers", "tileUnlocks", "tileDescriptions",
  "zones", "workers", "keepers", "expedition", "biomes",
  "tuning", "npcs", "story", "flags", "bosses",
  "achievements", "dailyRewards",
]);

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Compare a single key's value between baseline and draft. Returns either
 * `null` (no change) or `{ status, baseline, draft, sub }` where
 *   status: "added" | "removed" | "modified"
 *   sub:    optional `{ added, removed, modified }` lists for nested keys
 *           when both sides are plain objects.
 */
export function valueDiff(baseline, draft) {
  const hasA = baseline !== undefined;
  const hasB = draft !== undefined;
  if (!hasA && !hasB) return null;
  if (!hasA && hasB) return { status: "added", baseline: undefined, draft };
  if (hasA && !hasB) return { status: "removed", baseline, draft: undefined };
  if (deepEqual(baseline, draft)) return null;
  const out = { status: "modified", baseline, draft };
  if (isPlainObject(baseline) && isPlainObject(draft)) {
    const sub = sectionDiff(baseline, draft);
    if (sub.added.length || sub.removed.length || sub.modified.length) out.sub = sub;
  }
  return out;
}

/**
 * Compare two objects key-by-key. Returns lists of added/removed/modified keys.
 */
export function sectionDiff(baseline = {}, draft = {}) {
  const keys = new Set([...Object.keys(baseline || {}), ...Object.keys(draft || {})]);
  const added = [];
  const removed = [];
  const modified = [];
  for (const k of keys) {
    const d = valueDiff(baseline?.[k], draft?.[k]);
    if (!d) continue;
    if (d.status === "added") added.push({ key: k, value: d.draft });
    else if (d.status === "removed") removed.push({ key: k, value: d.baseline });
    else modified.push({ key: k, baseline: d.baseline, draft: d.draft, sub: d.sub });
  }
  const order = (a, b) => a.key.localeCompare(b.key);
  added.sort(order); removed.sort(order); modified.sort(order);
  return { added, removed, modified };
}

/**
 * Top-level "what changed?" comparator. Sections without changes are
 * omitted. Top-level non-structural fields (e.g. version) are folded
 * into a `_root` pseudo-section.
 *
 * Returns `{ sections: { [name]: sectionDiff }, totals: { added, removed, modified } }`.
 */
export function draftDiff(baseline = {}, draft = {}) {
  const out = { sections: {}, totals: { added: 0, removed: 0, modified: 0 } };
  const roots = new Set([...Object.keys(baseline || {}), ...Object.keys(draft || {})]);
  const root = { added: [], removed: [], modified: [] };
  for (const k of roots) {
    if (STRUCTURAL_KEYS.has(k)) {
      const section = sectionDiff(baseline[k] || {}, draft[k] || {});
      if (section.added.length || section.removed.length || section.modified.length) {
        out.sections[k] = section;
        out.totals.added += section.added.length;
        out.totals.removed += section.removed.length;
        out.totals.modified += section.modified.length;
      }
    } else {
      const d = valueDiff(baseline[k], draft[k]);
      if (!d) continue;
      if (d.status === "added") root.added.push({ key: k, value: d.draft });
      else if (d.status === "removed") root.removed.push({ key: k, value: d.baseline });
      else root.modified.push({ key: k, baseline: d.baseline, draft: d.draft, sub: d.sub });
    }
  }
  if (root.added.length || root.removed.length || root.modified.length) {
    out.sections._root = root;
    out.totals.added += root.added.length;
    out.totals.removed += root.removed.length;
    out.totals.modified += root.modified.length;
  }
  return out;
}

/** True if the two drafts are deep-equal (no changes to commit). */
export function draftEqual(a, b) {
  return deepEqual(a, b);
}

/** Format the diff totals into a one-line summary ("3 added · 1 modified"). */
export function summariseTotals(totals) {
  const bits = [];
  if (totals.added) bits.push(`${totals.added} added`);
  if (totals.modified) bits.push(`${totals.modified} modified`);
  if (totals.removed) bits.push(`${totals.removed} removed`);
  return bits.length ? bits.join(" · ") : "No changes vs baseline";
}
