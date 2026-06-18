// Hearthkeeping (idle layer) slice. Owns `state.embergarden` and the three
// EMBERGARDEN/* actions. Per CLAUDE.md's slice-action footgun, all three are
// registered in SLICE_PRIMARY_ACTIONS in src/state.ts so the coreReducer falls
// through (it has no case for them) and this slice's handler actually runs.
//
// Discipline mirrored from the LOGIN_TICK reducer case: TIME IS INJECTED via the
// action payload (`now`), never read from `Date.now()` here — so the reducer
// stays pure/deterministic, unit-testable with no canvas, and referential-
// equality no-op semantics hold (a zero/negative-delta tick returns the SAME
// `state` reference, which lets rawReducer short-circuit and avoids spurious
// re-renders / re-persists).

import type { Action, GameState } from "../../types/state.js";
import {
  GENERATORS,
  generatorCost,
  generatorUnlocked,
  totalWarmthPerSec,
  OFFLINE_CAP_SECONDS,
  hearthlightFromLifetime,
  REKINDLE_MIN_LIFETIME_WARMTH,
} from "./data.js";

export interface EmbergardenState {
  warmth: number;            // spendable; resets on Rekindle
  lifetimeWarmth: number;    // accrued since last Rekindle (drives prestige)
  hearthlight: number;       // permanent prestige currency (never reset)
  levels: Record<string, number>; // generator id -> level
  lastTickAt: number | null; // epoch ms of last accrual; null = uninitialised
}

export function freshEmbergarden(): EmbergardenState {
  return { warmth: 0, lifetimeWarmth: 0, hearthlight: 0, levels: {}, lastTickAt: null };
}

export const initial = {
  embergarden: freshEmbergarden(),
};

/**
 * Settle Warmth produced between `eg.lastTickAt` and `now`. Pure; clamps
 * elapsed time to the offline cap and is idempotent for zero/negative deltas
 * (clock skew / NTP jumps never subtract Warmth or move `lastTickAt` backward).
 */
function accrue(eg: EmbergardenState, now: number): EmbergardenState {
  if (eg.lastTickAt == null) return { ...eg, lastTickAt: now }; // first run: just stamp
  const elapsedSec = (now - eg.lastTickAt) / 1000;
  if (elapsedSec <= 0) return eg;                               // idempotent / clock skew → no change
  const cappedSec = Math.min(elapsedSec, OFFLINE_CAP_SECONDS);  // offline cap
  const rate = totalWarmthPerSec(eg.levels, eg.hearthlight);
  const gained = rate * cappedSec;
  if (gained <= 0) return { ...eg, lastTickAt: now };           // no generators yet → just advance the clock
  return {
    ...eg,
    warmth: eg.warmth + gained,
    lifetimeWarmth: eg.lifetimeWarmth + gained,
    lastTickAt: now,
  };
}

export function reduce(state: GameState, action: Action): GameState {
  const eg = state.embergarden as EmbergardenState | undefined;
  switch (action.type) {
    case "EMBERGARDEN/TICK": {
      if (!eg) return state;
      const now = action.payload?.now;
      if (typeof now !== "number" || !Number.isFinite(now)) return state;
      const next = accrue(eg, now);
      if (next === eg) return state; // preserve referential equality on no-op
      return { ...state, embergarden: next };
    }

    case "EMBERGARDEN/BUY_GENERATOR": {
      if (!eg) return state;
      const id = action.payload?.id;
      const def = id ? GENERATORS.find((g) => g.id === id) : undefined;
      if (!def || !id) return state;
      // Accrue up to `now` first so a purchase doesn't drop pending Warmth.
      const acc = typeof action.payload?.now === "number" ? accrue(eg, action.payload.now) : eg;
      if (!generatorUnlocked(def, acc.lifetimeWarmth)) return state; // milestone-gated
      const level = acc.levels[id] ?? 0;
      const cost = generatorCost(def, level);
      if (acc.warmth < cost) return state;                          // can't afford
      return {
        ...state,
        embergarden: {
          ...acc,
          warmth: acc.warmth - cost,
          levels: { ...acc.levels, [id]: level + 1 },
        },
      };
    }

    case "EMBERGARDEN/REKINDLE": {
      if (!eg) return state;
      const acc = typeof action.payload?.now === "number" ? accrue(eg, action.payload.now) : eg;
      if (acc.lifetimeWarmth < REKINDLE_MIN_LIFETIME_WARMTH) return state; // gated
      const gained = hearthlightFromLifetime(acc.lifetimeWarmth);
      if (gained <= 0) return state;
      return {
        ...state,
        embergarden: {
          warmth: 0,
          lifetimeWarmth: 0,                       // reset the cycle
          hearthlight: acc.hearthlight + gained,   // PERMANENT — never reset
          levels: {},                              // generators reset
          lastTickAt: acc.lastTickAt,              // keep the clock so the next tick deltas correctly
        },
      };
    }

    default:
      return state;
  }
}
