// Building cost analysis — sums every BUILDINGS[*].cost across the
// catalog and emits both per-building totals and a per-resource roll-up
// of everything a "full town" requires. Helpful when tuning the build
// economy: if the total ramp suddenly demands 400 plank, is that
// proportional to the per-session yield?
//
// Pure module — takes its catalogs as arguments with defaults sourced
// from src/constants.js.

import { BUILDINGS, ITEMS } from "../constants.js";

export interface BuildingCostRow {
  id: string;
  name?: string;
  label?: string;
  lv?: number;
  biome?: string;
  cost?: Record<string, unknown>;
  [extra: string]: unknown;
}

interface BuildingCostItem {
  label?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseBuildingCostRow(value: unknown): BuildingCostRow | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    ...value,
    id: value.id,
    name: typeof value.name === "string" ? value.name : undefined,
    label: typeof value.label === "string" ? value.label : undefined,
    lv: typeof value.lv === "number" ? value.lv : undefined,
    biome: typeof value.biome === "string" ? value.biome : undefined,
    cost: isRecord(value.cost) ? value.cost : {},
  };
}

function isPureCurrency(key: string): boolean {
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
export function analyseBuildingCosts({ buildings = BUILDINGS, items = ITEMS }: { buildings?: unknown; items?: unknown } = {}) {
  const perBuilding: Array<{ id: string; name: string; level: number | null; biome: string | null; costs: Record<string, number>; coins: number }> = [];
  const resourceTotals = new Map<string, number>();   // resourceKey → qty
  const usedBy = new Map<string, Set<string>>();       // resourceKey → Set<buildingId>
  const totals: Record<string, number> = { coins: 0, runes: 0, embers: 0, coreIngots: 0, gems: 0, resourceCount: 0 };

  const buildingList: unknown[] = Array.isArray(buildings) ? buildings : Object.values(isRecord(buildings) ? buildings : {});
  for (const rawB of buildingList) {
    const b = parseBuildingCostRow(rawB);
    if (!b) continue;
    const costs = b.cost || {};
    const flattened: Record<string, number> = {};
    for (const [key, qty] of Object.entries(costs)) {
      if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) continue;
      flattened[key] = qty;
      if (isPureCurrency(key)) {
        totals[key] = (totals[key] || 0) + qty;
      } else {
        resourceTotals.set(key, (resourceTotals.get(key) || 0) + qty);
        if (!usedBy.has(key)) usedBy.set(key, new Set());
        usedBy.get(key)!.add(b.id);
      }
    }
    perBuilding.push({
      id: b.id,
      name: b.name || b.label || b.id,
      level: typeof b.lv === "number" && Number.isFinite(b.lv) ? b.lv : null,
      biome: b.biome || null,
      costs: flattened,
      coins: typeof costs.coins === "number" && Number.isFinite(costs.coins) ? costs.coins : 0,
    });
  }
  perBuilding.sort((a, b) => ((a.level ?? 0) - (b.level ?? 0)) || a.id.localeCompare(b.id));

  const itemsMap = isRecord(items) ? items as Record<string, BuildingCostItem> : {};
  const perResource = [...resourceTotals.entries()]
    .map(([key, qty]) => ({
      key, qty,
      label: itemsMap?.[key]?.label || key,
      usedBy: [...(usedBy.get(key) || [])].sort(),
    }))
    .sort((a, b) => (b.qty - a.qty) || a.key.localeCompare(b.key));
  totals["resourceCount"] = perResource.length;
  return { perBuilding, perResource, totals };
}
