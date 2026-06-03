/**
 * Closed inventory maps — counts only for catalog keys, never `Record<string, number>`.
 */
/* eslint-disable no-redeclare -- TypeScript overload signatures */

import type { InventoryKey, RecipeInputKey, ResourceKey } from "./catalogKeys.js";

export type { InventoryKey, RecipeInputKey } from "./catalogKeys.js";
import { isInventoryKey, RESOURCE_KEY_VALUES } from "./catalogKeys.js";

const RESOURCE_KEY_SET = new Set<string>(RESOURCE_KEY_VALUES);

/** Player inventory counts keyed by catalog id. */
export type Inventory = Partial<Record<InventoryKey, number>>;

/** Per-settlement resource pools — keys are zone/settlement ids. */
export type ZoneInventoryMap = Record<string, Inventory>;

/** Per-settlement fractional chain progress. */
export type ZoneResourceProgressMap = Record<string, Partial<Record<ResourceKey, number>>>;

export function inventoryGet(inv: Inventory, key: InventoryKey): number {
  return inv[key] ?? 0;
}

/** Read a recipe/craft input count (may be tile or resource during migration). */
export function quantityFor(inv: Inventory, key: RecipeInputKey): number {
  return (inv as Partial<Record<RecipeInputKey, number>>)[key] ?? 0;
}

/** Read inventory count; `key` must be a catalog id (prefer enum members in new code). */
export function inventoryQty(inv: Inventory | undefined, key: InventoryKey): number;
export function inventoryQty(inv: Inventory | undefined, key: RecipeInputKey): number;
export function inventoryQty(inv: Inventory | undefined, key: string): number;
export function inventoryQty(inv: Inventory | undefined, key: string): number {
  if (!inv) return 0;
  return quantityFor(inv, key as RecipeInputKey);
}

/** Immutable write; drops the slot when amount is 0. */
export function inventoryPut(inv: Inventory, key: InventoryKey, amount: number): Inventory;
export function inventoryPut(inv: Inventory, key: RecipeInputKey, amount: number): Inventory;
export function inventoryPut(inv: Inventory, key: string, amount: number): Inventory;
export function inventoryPut(inv: Inventory, key: string, amount: number): Inventory {
  const next = { ...inv } as Partial<Record<RecipeInputKey, number>>;
  if (amount === 0) delete next[key as RecipeInputKey];
  else next[key as RecipeInputKey] = amount;
  return next as Inventory;
}

/** In-place write for reducer drafts that already cloned `inventory`. */
export function inventoryPutMut(inv: Inventory, key: InventoryKey, amount: number): void;
export function inventoryPutMut(inv: Inventory, key: RecipeInputKey, amount: number): void;
export function inventoryPutMut(inv: Inventory, key: string, amount: number): void;
export function inventoryPutMut(inv: Inventory, key: string, amount: number): void {
  const slot = inv as Partial<Record<RecipeInputKey, number>>;
  if (amount === 0) delete slot[key as RecipeInputKey];
  else slot[key as RecipeInputKey] = amount;
}

export function inventorySet(inv: Inventory, key: InventoryKey, amount: number): Inventory {
  return { ...inv, [key]: amount };
}

export function inventoryAdd(inv: Inventory, key: InventoryKey, delta: number): Inventory {
  return inventorySet(inv, key, inventoryGet(inv, key) + delta);
}

/**
 * Coerce a loaded save's inventory object to {@link Inventory}, dropping unknown keys.
 */
export function parseInventory(raw: Record<string, unknown> | null | undefined): Inventory {
  if (!raw || typeof raw !== "object") return {};
  const out: Inventory = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isInventoryKey(k)) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) out[k] = n;
  }
  return out;
}

/** True when a loaded object is a legacy flat inventory (pre zone-keyed saves). */
export function isFlatInventory(raw: Record<string, unknown>): boolean {
  for (const k of Object.keys(raw)) {
    if (isInventoryKey(k)) return true;
  }
  return false;
}

/** Coerce save JSON to per-zone inventory buckets. Legacy flat saves land on `home`. */
export function parseZoneInventories(raw: unknown): ZoneInventoryMap {
  if (!raw || typeof raw !== "object") return { home: {} };
  const rec = raw as Record<string, unknown>;
  if (isFlatInventory(rec)) return { home: parseInventory(rec) };
  const out: ZoneInventoryMap = {};
  for (const [zoneId, inv] of Object.entries(rec)) {
    if (inv && typeof inv === "object" && !Array.isArray(inv)) {
      out[zoneId] = parseInventory(inv as Record<string, unknown>);
    }
  }
  if (Object.keys(out).length === 0) out.home = {};
  return out;
}

/** Coerce save JSON to per-zone resourceProgress. Legacy flat saves land on `home`. */
export function parseZoneResourceProgress(raw: unknown): ZoneResourceProgressMap {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  const isFlat = Object.keys(rec).some((k) => isInventoryKey(k) || RESOURCE_KEY_SET.has(k));
  if (isFlat) {
    const progress: Partial<Record<ResourceKey, number>> = {};
    for (const [k, v] of Object.entries(rec)) {
      if (!RESOURCE_KEY_SET.has(k)) continue;
      const n = Number(v);
      if (Number.isFinite(n) && n !== 0) progress[k as ResourceKey] = n;
    }
    return Object.keys(progress).length ? { home: progress } : {};
  }
  const out: ZoneResourceProgressMap = {};
  for (const [zoneId, prog] of Object.entries(rec)) {
    if (!prog || typeof prog !== "object" || Array.isArray(prog)) continue;
    const bucket: Partial<Record<ResourceKey, number>> = {};
    for (const [k, v] of Object.entries(prog as Record<string, unknown>)) {
      if (!RESOURCE_KEY_SET.has(k)) continue;
      const n = Number(v);
      if (Number.isFinite(n) && n !== 0) bucket[k as ResourceKey] = n;
    }
    if (Object.keys(bucket).length) out[zoneId] = bucket;
  }
  return out;
}

/** Recipe/building cost maps use the same closed key set as inventory inputs. */
export type ItemQuantityMap = Partial<Record<InventoryKey, number>>;
