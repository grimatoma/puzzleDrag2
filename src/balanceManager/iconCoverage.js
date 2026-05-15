// Icon coverage audit — confirms every ITEMS entry has a renderable
// procedural icon in ICON_REGISTRY (or falls back to a known fallback
// strategy). The game's renderer falls back to a placeholder square
// when an icon is missing, so this audit's job is to surface that
// silent fallback before it ships.
//
// Pure module; takes the items map + icon registry as args so the
// suite can drive synthetic catalogs.

import { ITEMS } from "../constants.js";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";

/**
 * For each item, decide whether an icon entry exists. The lookup tries:
 *   1. `item.iconKey`     (explicit override)
 *   2. the item's own id  (default: textures register under the id)
 *
 * Returns:
 *   {
 *     ok:        [{ id, iconKey, source }]      // 'iconKey' / 'id'
 *     missing:   [{ id, label, iconKey }]
 *     total:     N,
 *   }
 */
export function auditIconCoverage({ items = ITEMS, registry = ICON_REGISTRY } = {}) {
  const ok = [];
  const missing = [];
  for (const [id, item] of Object.entries(items || {})) {
    const candidateKey = item?.iconKey || id;
    if (registry && Object.prototype.hasOwnProperty.call(registry, candidateKey)) {
      ok.push({ id, iconKey: candidateKey, source: item?.iconKey ? "iconKey" : "id" });
      continue;
    }
    missing.push({ id, label: item?.label || id, iconKey: candidateKey });
  }
  ok.sort((a, b) => a.id.localeCompare(b.id));
  missing.sort((a, b) => a.id.localeCompare(b.id));
  return { ok, missing, total: ok.length + missing.length };
}

/** Single-number coverage ratio (0..1). */
export function coverageRatio(audit) {
  if (!audit || audit.total === 0) return 1;
  return audit.ok.length / audit.total;
}
