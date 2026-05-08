// Phase 5b — Type-tier workers slice.
//
// Handles WORKERS/HIRE and WORKERS/FIRE action types. Hire deducts the
// per-type coin cost and increments the hired count (capped at maxCount).
// Fire decrements with no refund.
import { TYPE_WORKER_MAP, defaultWorkersSlice } from "./data.js";

export const initial = defaultWorkersSlice();

export function reduce(state, action) {
  if (action.type === "WORKERS/HIRE") {
    const id = action.payload?.id;
    const def = TYPE_WORKER_MAP[id];
    if (!def) return state;

    const hired = state.workers?.hired ?? {};
    const cur = hired[id] ?? 0;
    if (cur >= def.maxCount) return state;

    const cost = def.hireCost?.coins ?? 0;
    if ((state.coins ?? 0) < cost) return state;

    return {
      ...state,
      coins: state.coins - cost,
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
