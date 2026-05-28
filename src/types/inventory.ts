/**
 * Closed inventory maps — counts only for catalog keys, never `Record<string, number>`.
 */
/* eslint-disable no-redeclare -- TypeScript overload signatures */

import type { InventoryKey, RecipeInputKey } from "./catalogKeys.js";

export type { InventoryKey, RecipeInputKey } from "./catalogKeys.js";
import { isInventoryKey } from "./catalogKeys.js";

/** Player inventory counts keyed by catalog id. */
export type Inventory = Partial<Record<InventoryKey, number>>;

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

/** Recipe/building cost maps use the same closed key set as inventory inputs. */
export type ItemQuantityMap = Partial<Record<InventoryKey, number>>;
