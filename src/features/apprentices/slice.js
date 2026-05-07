import { WORKER_MAP, totalHired, housingCapacity, checkRequirement } from "./data.js";

export const initial = {
  hiredApprentices: [],
  idleHistory: [],
};

// Legacy: keep seedHireSeq so state.js can still call it
let hireSeq = 1;
export function seedHireSeq(savedApprentices) {
  for (const h of (savedApprentices || [])) {
    if (typeof h.id === "number" && h.id >= hireSeq) hireSeq = h.id + 1;
  }
}

export function reduce(state, action) {
  // ─── Phase 4 APP/HIRE ──────────────────────────────────────────────────
  if (action.type === "APP/HIRE") {
    const id = action.payload?.id;
    const w  = WORKER_MAP[id];
    if (!w) return state;
    const cur = state.workers?.hired?.[id] ?? 0;
    if (cur >= w.maxCount) return state;                              // per-worker cap
    if (totalHired(state) >= housingCapacity(state)) return state;   // housing cap
    if ((state.workers?.pool ?? 0) < 1) return state;               // pool gate (4.6)
    if ((state.coins ?? 0) < w.hireCost) return state;
    if (!checkRequirement(w, state)) return state;
    return {
      ...state,
      coins: state.coins - w.hireCost,
      workers: {
        ...state.workers,
        hired: { ...state.workers.hired, [id]: cur + 1 },
        pool: (state.workers.pool ?? 1) - 1,
      },
      bubble: { id: Date.now(), npc: "mira",
        text: `${w.name} joins the crew! (${cur + 1} of ${w.maxCount})`, ms: 1800 },
    };
  }

  // ─── Phase 4 APP/FIRE ──────────────────────────────────────────────────
  if (action.type === "APP/FIRE") {
    const id  = action.payload?.id;
    const cur = state.workers?.hired?.[id] ?? 0;
    if (cur <= 0) return state;
    return {
      ...state,
      workers: {
        ...state.workers,
        hired: { ...state.workers.hired, [id]: cur - 1 },
        // No pool refund on fire (locked)
      },
      bubble: { id: Date.now(), npc: "mira",
        text: `Let go a ${WORKER_MAP[id]?.name ?? "worker"}.`, ms: 1500 },
    };
  }

  return state;
}
