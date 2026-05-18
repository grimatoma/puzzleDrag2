// Phase 5b — Type-tier workers slice.
//
// Handles WORKERS/HIRE and WORKERS/FIRE action types. Hire deducts the
// per-type coin/resource cost and increments the hired count (capped at maxCount).
// Fire decrements with no refund.
import { TYPE_WORKER_MAP, defaultWorkersSlice, nextHireCost, nextHireResourceCost } from "./data.js";

export const initial = defaultWorkersSlice();

export function reduce(state, action) {
  if (action.type === "WORKERS/HIRE") {
    const id = action.payload?.id;
    const def = TYPE_WORKER_MAP[id];
    if (!def) return state;

    const hired = state.workers?.hired ?? {};
    const cur = hired[id] ?? 0;
    if (cur >= def.maxCount) return state;

    // Phase 6 — sequential cost ramp. The N-th hire (0-indexed) is priced
    // by `nextHireCost`: flat by default, linear when `coinsStep` is set,
    // geometric when `coinsMult` is set.
    const cost = nextHireCost(def, cur);
    if ((state.coins ?? 0) < cost) return state;
    const resourceCost = nextHireResourceCost(def, cur);
    const inv = state.inventory ?? {};
    for (const [key, amount] of Object.entries(resourceCost)) {
      if ((inv[key] ?? 0) < amount) return state;
    }
    const nextInventory = { ...inv };
    for (const [key, amount] of Object.entries(resourceCost)) {
      nextInventory[key] = (nextInventory[key] ?? 0) - amount;
    }

    return {
      ...state,
      coins: state.coins - cost,
      inventory: nextInventory,
      workers: {
        ...(state.workers ?? {}),
        hired: { ...hired, [id]: cur + 1 },
      },
    };
  }

  if (action.type === "WORKERS/FIRE") {
    const id = action.payload?.id;
    const def = TYPE_WORKER_MAP[id];
    if (!def) return state;
    const hired = state.workers?.hired ?? {};
    const cur = hired[id] ?? 0;
    if (cur <= 0) return state;
    return {
      ...state,
      workers: {
        ...(state.workers ?? {}),
        hired: { ...hired, [id]: cur - 1 },
      },
    };
  }

  return state;
}
