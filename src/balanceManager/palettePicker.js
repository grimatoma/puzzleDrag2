// Pure colour-palette analysis over the ITEMS catalog.
//
// Every tile / resource carries a `color` (hex RGB integer) used by the
// texture generator. As the catalog grows it's easy to accidentally pick
// a colour that's perceptually identical to another tile — players then
// can't tell them apart on the board. This helper finds those clashes
// and emits a sortable list.
//
// Distance metric: Euclidean in RGB. The colour space isn't quite right
// for human perception (CIEDE2000 would be), but it's accurate enough
// for "is this colour suspiciously close to that one?" and stays a
// pure function with no extra deps.

import { ITEMS } from "../constants.js";

function unpackRgb(value) {
  if (!Number.isFinite(value)) return null;
  const n = Math.max(0, Math.min(0xffffff, Math.trunc(value)));
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function distanceRgb(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function hexString(value) {
  if (!Number.isFinite(value)) return "#000000";
  return "#" + value.toString(16).padStart(6, "0").slice(-6);
}

/**
 * For each item, compute the perceptually-close peers across the catalog.
 * Returns `[{ id, label, color, hex, kind, biome, peers: [{ id, label, distance }] }]`.
 * `threshold` (default 30) is the maximum RGB-Euclidean distance treated as a clash.
 */
export function findColorClashes({ items = ITEMS, threshold = 30 } = {}) {
  const entries = Object.entries(items || {})
    .map(([id, item]) => {
      const rgb = unpackRgb(item?.color);
      if (!rgb) return null;
      return {
        id, label: item.label || id, color: item.color,
        rgb, hex: hexString(item.color), kind: item.kind || "—", biome: item.biome || null,
      };
    })
    .filter(Boolean);

  const out = entries.map((a) => {
    const peers = [];
    for (const b of entries) {
      if (b.id === a.id) continue;
      const d = distanceRgb(a.rgb, b.rgb);
      if (d > threshold) continue;
      peers.push({ id: b.id, label: b.label, distance: Number(d.toFixed(2)), hex: b.hex });
    }
    peers.sort((x, y) => x.distance - y.distance);
    return { id: a.id, label: a.label, color: a.color, hex: a.hex, kind: a.kind, biome: a.biome, peers };
  });
  out.sort((a, b) => b.peers.length - a.peers.length || a.id.localeCompare(b.id));
  return out;
}

/** Aggregate stats — useful as a header summary. */
export function paletteSummary({ items = ITEMS, threshold = 30 } = {}) {
  const clashes = findColorClashes({ items, threshold });
  const withPeers = clashes.filter((c) => c.peers.length > 0);
  let total = 0;
  for (const c of withPeers) total += c.peers.length;
  return {
    totalItems: clashes.length,
    clashingItems: withPeers.length,
    totalClashes: total / 2,            // each clash pair counted twice above
    threshold,
  };
}

/** Coarse colour-family bucket for swatch grouping. */
export function colourFamily(value) {
  const rgb = unpackRgb(value);
  if (!rgb) return "other";
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (max - min < 20) {
    if (luminance > 0.75) return "white";
    if (luminance < 0.2) return "black";
    return "gray";
  }
  if (r === max && g >= b) return r > 200 && g > 150 ? "yellow" : "red";
  if (r === max && b > g) return "magenta";
  if (g === max && r >= b) return r > 150 ? "olive" : "green";
  if (g === max && b > r) return "teal";
  if (b === max) {
    if (r >= g && r > 60) return "purple";
    return "blue";
  }
  return "other";
}

export { hexString };
