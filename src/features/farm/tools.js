/**
 * Phase 10.1 — Farm tools pure logic.
 * Animation lives in GameScene; this file is pure state transforms.
 *
 * Locked rule: tools NEVER tick state.turnsUsed.
 *
 * §5 lists "1 Wood" for Rake; implementation uses `plank` because the
 * §6 wood chain names the base tile "log" and the first upgrade "plank" —
 * plank is what the player can actually hold at workshop-build time.
 *
 * §6 Cat tool counter deferred per Phase 10.4 design note;
 * chain-3-rats is the locked Phase 10 removal path.
 */

/**
 * Apply a pending board tool (rake / axe) — pure.
 * Clears the matching tile key from every non-locked cell and credits inventory.
 * Returns the updated state.
 *
 * @param {object} state
 * @returns {object}
 */
export function applyToolPending(state) {
  const id = state.toolPending;
  if (!id) return state;
  if (id === "rake") return _clearKey(state, "hay");
  if (id === "axe") return _clearKey(state, "log");
  // fertilizer is handled at fillBoard time, not here
  return { ...state, toolPending: null };
}

/**
 * Clear all non-hazard-locked tiles of the given key and add them to inventory.
 */
function _clearKey(state, key) {
  let collected = 0;
  const grid = state.grid.map((row) =>
    row.map((t) => {
      if (t.key === key && !t.rubble && !t.gas && !t.frozen && t.key !== "rat") {
        collected += 1;
        return { ...t, key: null, _emptied: true };
      }
      return t;
    }),
  );
  const inventory = {
    ...state.inventory,
    [key]: (state.inventory[key] ?? 0) + collected,
  };
  return { ...state, grid, inventory, toolPending: null };
}
