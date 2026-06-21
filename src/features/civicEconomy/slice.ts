// Civic Economy reducer slice — Town Hall claims + care-package payout.
//
// Owns two actions (both registered in SLICE_PRIMARY_ACTIONS so they run even
// though coreReducer has no handler for them):
//   - CIVIC/CLAIM             — gated by the real-clock cooldown; pays coin tax
//                               immediately and queues the provisions roster as a
//                               pending care-package (then bumps the board nonce
//                               so a fresh board seeds the crate tile).
//   - CIVIC/OPEN_CARE_PACKAGE — fired when the player matches the crate on the
//                               board; deposits the queued tools into the bag.
//
// Referential equality is preserved for rejected/no-op actions (cooldown not
// elapsed, or no pending provisions) — the core reducer relies on this.

import type { Action, GameState } from "../../types/state.js";
import { civicClaimReady, provisionsRoster, taxYield } from "./data.js";

export interface CivicEconomyState {
  /** Wall-clock ms of the last Town Hall collection, or null if never claimed. */
  lastClaimedAt: number | null;
  /** Free tools awaiting board pickup (keyed tool id → count). */
  pendingProvisions: Record<string, number>;
}

export const initial: { civicEconomy: CivicEconomyState } = {
  civicEconomy: { lastClaimedAt: null, pendingProvisions: {} },
};

function toolCountOf(tools: GameState["tools"] | undefined, key: string): number {
  const raw = (tools as Record<string, number | boolean | undefined> | undefined)?.[key];
  return typeof raw === "number" ? raw : 0;
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "CIVIC/CLAIM": {
      const now = (action as { payload?: { now?: number } }).payload?.now ?? Date.now();
      if (!civicClaimReady(state, now)) return state; // cooldown not elapsed — no-op

      const tax = taxYield(state);
      const roster = provisionsRoster(state);
      const current = state.civicEconomy ?? initial.civicEconomy;

      const pendingProvisions = { ...current.pendingProvisions };
      for (const [tool, amount] of Object.entries(roster)) {
        pendingProvisions[tool] = (pendingProvisions[tool] ?? 0) + amount;
      }

      const hasProvisions = Object.keys(pendingProvisions).length > 0;
      return {
        ...state,
        coins: (state.coins ?? 0) + tax,
        civicEconomy: { lastClaimedAt: now, pendingProvisions },
        // Seed the care-package crate onto a fresh board only when something is
        // actually queued; an empty roster shouldn't disturb the current board.
        ...(hasProvisions ? { _boardNonce: (state._boardNonce ?? 0) + 1 } : {}),
      };
    }

    case "CIVIC/OPEN_CARE_PACKAGE": {
      const current = state.civicEconomy ?? initial.civicEconomy;
      const pending = current.pendingProvisions ?? {};
      if (Object.keys(pending).length === 0) return state; // nothing queued — no-op

      const tools = { ...state.tools } as Record<string, number | boolean | undefined>;
      for (const [tool, amount] of Object.entries(pending)) {
        tools[tool] = toolCountOf(state.tools, tool) + amount;
      }
      return {
        ...state,
        tools: tools as GameState["tools"],
        civicEconomy: { ...current, pendingProvisions: {} },
      };
    }

    default:
      return state;
  }
}
