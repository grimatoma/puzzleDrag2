import type { GameState } from "../types/state.js";

/** Fill-bias arm uses `fillBiasTarget` (+ optional magic charges), not a separate flag. */
export function isFillBiasArmed(state: GameState | null | undefined): boolean {
  if (!state) return false;
  return !!(state.fillBiasTarget || (state.magicFertilizerCharges ?? 0) > 0);
}

export function disarmFillBias(state: GameState): GameState {
  if (!isFillBiasArmed(state)) return state;
  let next: GameState = { ...state, fillBiasTarget: null, magicFertilizerCharges: 0 };
  if (state.fillBiasTarget != null) {
    next = {
      ...next,
      tools: { ...next.tools, fertilizer: (Number(next.tools?.fertilizer) || 0) + 1 },
    };
  }
  return next;
}
