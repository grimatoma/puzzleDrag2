/** Test helpers for per-zone inventory assertions and fixtures. */
import type { GameState } from "../types/state.js";
import type { Inventory } from "../types/inventory.js";
import { inventoryZone, zoneInventory } from "../state/zoneInventory.js";

export const DEFAULT_INV_ZONE = "home";

export function inv(
  state: Pick<GameState, "inventory"> & Partial<Pick<GameState, "farmRun" | "activeZone" | "mapCurrent">>,
  zone?: string,
): Inventory {
  const z = zone ?? inventoryZone(state as GameState);
  return zoneInventory(state as GameState, z);
}

export function withInv(state: GameState, patch: Inventory, zone?: string): GameState {
  const z = zone ?? inventoryZone(state);
  return {
    ...state,
    inventory: { ...state.inventory, [z]: { ...inv(state, z), ...patch } },
  };
}

/** Merge a flat inventory patch into the default zone bucket (common in tests). */
export function patchInventory(state: GameState, patch: Inventory, zone?: string): GameState {
  return withInv(state, patch, zone);
}

export function zoneProgress(
  state: Pick<GameState, "resourceProgress"> & Partial<Pick<GameState, "farmRun" | "activeZone" | "mapCurrent">>,
  zone?: string,
): Partial<Record<string, number>> {
  const z = zone ?? inventoryZone(state as GameState);
  return state.resourceProgress?.[z] ?? {};
}
