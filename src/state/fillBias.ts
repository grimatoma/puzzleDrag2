/** Fill-bias arm uses `fillBiasTarget` (+ optional magic charges), not a separate flag. */
export function isFillBiasArmed(state: any) {
  if (!state) return false;
  return !!(state.fillBiasTarget || (state.magicFertilizerCharges ?? 0) > 0);
}

export function disarmFillBias(state: any) {
  if (!isFillBiasArmed(state)) return state;
  let next = { ...state, fillBiasTarget: null, magicFertilizerCharges: 0 };
  if (state.fillBiasTarget != null) {
    next = {
      ...next,
      tools: { ...next.tools, fertilizer: (next.tools?.fertilizer ?? 0) + 1 },
    };
  }
  return next;
}
