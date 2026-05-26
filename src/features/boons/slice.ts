// Boon-tree slice. Owns `state.boons` (a map of `{ [boonId]: true }`) and the
// `BOON/PURCHASE` action, which deducts the boon's cost in Embers or Core
// Ingots and marks the boon owned. Per CLAUDE.md's slice-action footgun rule,
// BOON/PURCHASE is registered in SLICE_PRIMARY_ACTIONS over in src/state.js so
// the coreReducer falls through and this slice's handler is the only one.
//
// Boons themselves are kingdom-wide ownership but path-gated visibility: see
// boonIsUnlocked in data.js.

import { boonById, boonIsUnlocked, canAffordBoon } from "./data.js";
import type { Action, GameState } from "../../types/state.js";

export const initial = { boons: {} as Record<string, boolean> };

interface BoonHostState {
  embers?: number;
  coreIngots?: number;
  boons?: Record<string, boolean>;
  bubble?: { id: number; npc: string; text: string; ms: number } | null;
}

export function reduce(state: GameState, action: Action): GameState {
  const s = state as unknown as BoonHostState;
  switch (action.type) {
    case "BOON/PURCHASE": {
      const id = action.payload?.id ?? action.id;
      const boon = id ? boonById(id) : null;
      if (!boon || !id) return state;
      if (s?.boons?.[id]) return state;            // already owned
      if (!boonIsUnlocked(state, boon)) return state;  // wrong keeper path / no flag
      if (!canAffordBoon(state, boon)) return state;   // can't afford
      const cost = boon.cost ?? {};
      return {
        ...state,
        embers: (s.embers ?? 0) - (cost.embers ?? 0),
        coreIngots: (s.coreIngots ?? 0) - (cost.coreIngots ?? 0),
        boons: { ...(s.boons ?? {}), [id]: true },
        bubble: { id: Date.now(), npc: "wren", text: `Boon claimed: ${boon.name}.`, ms: 2200 },
      } as GameState;
    }
    default:
      return state;
  }
}
