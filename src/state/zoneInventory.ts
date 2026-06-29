/**
 * Per-settlement inventory access. Resources live in `state.inventory[zoneId]`;
 * coins, tools, workers, level, and knowledge stay global on GameState.
 */
import type { ResourceKey } from "../types/catalogKeys.js";
import type { Inventory } from "../types/inventory.js";
import { isFlatInventory } from "../types/inventory.js";
import type { GameState } from "../types/state.js";

export type { ZoneInventoryMap, ZoneResourceProgressMap } from "../types/inventory.js";

/** Settlement whose inventory bucket reads/writes should target. */
export function inventoryZone(
  state: Pick<GameState, "farmRun" | "activeZone" | "mapCurrent">,
): string {
  const runZone = state.farmRun?.zoneId;
  if (typeof runZone === "string" && runZone) return runZone;
  if (typeof state.activeZone === "string" && state.activeZone) return state.activeZone;
  if (typeof state.mapCurrent === "string" && state.mapCurrent) return state.mapCurrent;
  return "home";
}

export function zoneInventory(state: GameState, zoneId?: string): Inventory {
  const z = zoneId ?? inventoryZone(state);
  return state.inventory?.[z] ?? {};
}

export function zoneResourceProgress(
  state: GameState,
  zoneId?: string,
): Partial<Record<ResourceKey, number>> {
  const z = zoneId ?? inventoryZone(state);
  return state.resourceProgress?.[z] ?? {};
}

export function withZoneInventory(
  state: GameState,
  inv: Inventory,
  zoneId?: string,
): GameState {
  const z = zoneId ?? inventoryZone(state);
  return { ...state, inventory: { ...state.inventory, [z]: inv } };
}

export function updateZoneInventory(
  state: GameState,
  updater: (inv: Inventory) => Inventory,
  zoneId?: string,
): GameState {
  const z = zoneId ?? inventoryZone(state);
  return withZoneInventory(state, updater(zoneInventory(state, z)), z);
}

export function inventoryForStory(
  gameState: Pick<GameState, "inventory" | "farmRun" | "activeZone" | "mapCurrent"> | { inventory?: GameState["inventory"] } | null | undefined,
): Record<string, number> {
  if (!gameState?.inventory) return {};
  if (isFlatInventory(gameState.inventory as Record<string, unknown>)) {
    return gameState.inventory as Record<string, number>;
  }
  return zoneInventory(gameState as GameState) as Record<string, number>;
}
