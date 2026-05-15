// Item / resource upgrade chain helpers.
//
// In src/constants.js each ITEMS[key] entry can carry a `next` field that
// names the result of an "upgrade" promotion (the per-tile chain mechanic
// — collect enough of the resource and it promotes to next). Two items
// can land on the same upgrade target (e.g. several vegetables → "soup"),
// so the graph is technically a forest of DAGs rather than disjoint chains.
//
// `computeItemChains(items)` walks the .next pointers and returns:
//
//   {
//     chains: [
//       { rootId, depth, totalValue, members: [{ id, value, threshold, next, label, color, biome, kind }] }
//     ],
//     terminalCount,    // how many items have no .next (the chain endpoints)
//     branchedCount,    // how many target ids have ≥2 incoming .next pointers
//     orphanCount,      // items that aren't part of any chain (no .next and no incoming)
//   }
//
// Pure module; takes the items map + the upgradeThresholds map as inputs,
// so tests can drive synthetic catalogs without touching the real ones.

const safeNumber = (n, fallback = 0) => (Number.isFinite(n) ? n : fallback);

/** Build a Map(item.next → [incoming ids]) so we can spot branch points. */
function incomingMap(items) {
  const map = new Map();
  for (const [id, item] of Object.entries(items || {})) {
    const target = item?.next;
    if (typeof target !== "string" || !target || target === id) continue;
    if (!map.has(target)) map.set(target, []);
    map.get(target).push(id);
  }
  return map;
}

/** Items whose `.next` is set but nobody points at them are chain roots. */
export function findChainRoots(items) {
  const incoming = incomingMap(items);
  const roots = [];
  for (const [id, item] of Object.entries(items || {})) {
    if (typeof item?.next !== "string" || !item.next) continue;
    if (item.next === id) continue;          // self-loop: not a real root
    if (incoming.has(id)) continue;
    roots.push(id);
  }
  roots.sort();
  return roots;
}

/** Walk a chain from `rootId` following .next pointers (cycle-safe). */
export function walkChain(rootId, items, thresholds = {}) {
  if (!items || !items[rootId]) return [];
  const members = [];
  const seen = new Set();
  let id = rootId;
  while (id && items[id] && !seen.has(id)) {
    seen.add(id);
    const item = items[id];
    members.push({
      id,
      label: item.label || id,
      color: item.color,
      kind: item.kind,
      biome: item.biome,
      value: safeNumber(item.value, 0),
      threshold: safeNumber(thresholds[id], 0),
      next: typeof item.next === "string" ? item.next : null,
    });
    id = typeof item.next === "string" ? item.next : null;
  }
  return members;
}

/** Build the chain forest. See module header for the shape. */
export function computeItemChains(items, thresholds = {}) {
  const roots = findChainRoots(items);
  const chains = roots.map((rootId) => {
    const members = walkChain(rootId, items, thresholds);
    const totalValue = members.reduce((s, m) => s + m.value, 0);
    return { rootId, depth: members.length, totalValue, members };
  });
  const incoming = incomingMap(items);
  let terminalCount = 0;
  let branchedCount = 0;
  for (const item of Object.values(items || {})) {
    if (!item || typeof item.next === "string" && item.next) continue;
    terminalCount += 1;
  }
  for (const ids of incoming.values()) if (ids.length > 1) branchedCount += 1;
  let orphanCount = 0;
  for (const [id, item] of Object.entries(items || {})) {
    const hasNext = typeof item?.next === "string" && item.next;
    const hasIncoming = incoming.has(id);
    if (!hasNext && !hasIncoming) orphanCount += 1;
  }
  // Stable sort: longest chains first, then by root id.
  chains.sort((a, b) => (b.depth - a.depth) || a.rootId.localeCompare(b.rootId));
  return { chains, terminalCount, branchedCount, orphanCount };
}

/** Sources (incoming .next pointers) for a given target id. */
export function chainSourcesFor(targetId, items) {
  const incoming = incomingMap(items);
  return [...(incoming.get(targetId) || [])].sort();
}
