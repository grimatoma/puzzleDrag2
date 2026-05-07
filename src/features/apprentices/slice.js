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
    if (!checkRequirement(w, state)) return state;

    // hireCost may be a flat coin number (legacy) or an object { worker, <resource>: n, ... }
    let newCoins = state.coins;
    let newInventory = state.inventory ? { ...state.inventory } : {};
    if (typeof w.hireCost === "number") {
      if ((state.coins ?? 0) < w.hireCost) return state;
      newCoins = state.coins - w.hireCost;
    } else if (w.hireCost && typeof w.hireCost === "object") {
      // Object hireCost: { worker: 1, <resource>: n, ... }
      // "worker" key is satisfied by pool gate above; other keys deducted from inventory
      for (const [res, amt] of Object.entries(w.hireCost)) {
        if (res === "worker") continue; // satisfied by pool slot
        const have = (state.inventory?.[res] ?? 0);
        if (have < amt) return state; // insufficient goods
        newInventory[res] = have - amt;
      }
    }

    return {
      ...state,
      coins: newCoins,
      inventory: newInventory,
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
