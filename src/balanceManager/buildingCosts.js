// Building cost analysis — sums every BUILDINGS[*].cost across the
// catalog and emits both per-building totals and a per-resource roll-up
// of everything a "full town" requires. Helpful when tuning the build
// economy: if the total ramp suddenly demands 400 wood_plank, is that
// proportional to the per-session yield?
//
// Pure module — takes its catalogs as arguments with defaults sourced
// from src/constants.js.

import { BUILDINGS, ITEMS } from "../constants.js";

function isPureCurrency(key) {
  return key === "coins" || key === "runes" || key === "embers" || key === "coreIngots" || key === "gems";
}

/**
 * Returns `{ perBuilding, perResource, totals }`.
 *
 * - perBuilding: [{ id, name, level, costs: { resource: qty, ... } }, ...]
 *   sorted by level then id.
 * - perResource: [{ key, qty, usedBy: ['mill', 'bakery', ...], label }, ...]
 *   sorted by qty descending; pure currencies bucket separately.
 * - totals: { coins, runes, embers, coreIngots, gems, resourceCount }
 *   the kingdom-wide currency totals plus how many *resource* keys appear.
 */
export function analyseBuildingCosts({ buildings = BUILDINGS, items = ITEMS } = {}) {
  const perBuilding = [];
  const resourceTotals = new Map();   // resourceKey → qty
  const usedBy = new Map();           // resourceKey → Set<buildingId>
  const totals = { coins: 0, runes: 0, embers: 0, coreIngots: 0, gems: 0, resourceCount: 0 };

  for (const b of Array.isArray(buildings) ? buildings : Object.values(buildings || {})) {
    if (!b || !b.id) continue;
    const costs = b.cost || {};
    const flattened = {};
    for (const [key, qty] of Object.entries(costs)) {
      if (!Number.isFinite(qty) || qty <= 0) continue;
      flattened[key] = qty;
      if (isPureCurrency(key)) {
        totals[key] = (totals[key] || 0) + qty;
      } else {
        resourceTotals.set(key, (resourceTotals.get(key) || 0) + qty);
        if (!usedBy.has(key)) usedBy.set(key, new Set());
        usedBy.get(key).add(b.id);
      }
    }
    perBuilding.push({
      id: b.id,
      name: b.name || b.label || b.id,
      level: Number.isFinite(b.lv) ? b.lv : null,
      biome: b.biome || null,
      costs: flattened,
      coins: Number.isFinite(costs.coins) ? costs.coins : 0,
    });
  }
  perBuilding.sort((a, b) => (a.level - b.level) || a.id.localeCompare(b.id));

  const perResource = [...resourceTotals.entries()]
    .map(([key, qty]) => ({
      key, qty,
      label: items?.[key]?.label || key,
      usedBy: [...(usedBy.get(key) || [])].sort(),
    }))
    .sort((a, b) => (b.qty - a.qty) || a.key.localeCompare(b.key));
  totals.resourceCount = perResource.length;
  return { perBuilding, perResource, totals };
}
