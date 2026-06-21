// Phase 5b — Type-tier workers slice.
//
// Handles WORKERS/HIRE and WORKERS/FIRE action types. Hire deducts the
// per-type coin/resource cost plus 1 Villager (housing capacity) and increments
// the hired count (capped at maxCount). Fire decrements (no coin/resource
// refund) but returns the 1 Villager to the pool.
import { TYPE_WORKER_MAP, defaultWorkersSlice, nextHireCost, nextHireResourceCost } from "./data.js";
import { inventoryPut, inventoryQty } from "../../types/inventory.js";
import { inventoryZone, zoneInventory } from "../../state/zoneInventory.js";
import type { Action, GameState } from "../../types/state.js";

export const initial = defaultWorkersSlice();

export function reduce(state: GameState, action: Action): GameState {
  if (action.type === "WORKERS/HIRE") {
    const payload = (action.payload ?? {}) as { id?: string };
    const id = payload.id ?? "";
    const def = TYPE_WORKER_MAP[id];
    if (!def) return state;

    const hired = (state.workers?.hired ?? {}) as Record<string, number>;
    const cur = hired[id] ?? 0;
    if (cur >= def.maxCount) return state;

    // Phase 6 — sequential cost ramp. The N-th hire (0-indexed) is priced
    // by `nextHireCost`: flat by default, linear when `coinsStep` is set,
    // geometric when `coinsMult` is set.
    const cost = nextHireCost(def, cur);
    if ((state.coins ?? 0) < cost) return state;
    // Villager gate — every hire occupies one Villager (housing capacity granted
    // by built Housing Blocks). No Villager available → no hire.
    if ((state.villagers ?? 0) < 1) return state;
    const resourceCost = nextHireResourceCost(def, cur);
    const hireZone = inventoryZone(state);
    const inv = zoneInventory(state, hireZone);
    for (const [key, amount] of Object.entries(resourceCost) as [string, number][]) {
      if (inventoryQty(inv, key) < amount) return state;
    }
    let nextInventory = { ...inv };
    for (const [key, amount] of Object.entries(resourceCost) as [string, number][]) {
      nextInventory = inventoryPut(nextInventory, key, inventoryQty(nextInventory, key) - amount);
    }

    return {
      ...state,
      coins: state.coins - cost,
      villagers: (state.villagers ?? 0) - 1,
      inventory: { ...state.inventory, [hireZone]: nextInventory },
      workers: {
        ...(state.workers ?? {}),
        hired: { ...hired, [id]: cur + 1 },
      },
    };
  }

  if (action.type === "WORKERS/FIRE") {
    const payload = (action.payload ?? {}) as { id?: string };
    const id = payload.id ?? "";
    const def = TYPE_WORKER_MAP[id];
    if (!def) return state;
    const hired = (state.workers?.hired ?? {}) as Record<string, number>;
    const cur = hired[id] ?? 0;
    if (cur <= 0) return state;
    // Firing frees the Villager back into the hiring pool (capacity refund).
    return {
      ...state,
      villagers: (state.villagers ?? 0) + 1,
      workers: {
        ...(state.workers ?? {}),
        hired: { ...hired, [id]: cur - 1 },
      },
    };
  }

  return state;
}
