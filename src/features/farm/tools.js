/**
 * Phase 10.1 — Farm tools pure logic.
 * Animation lives in GameScene; this file is pure state transforms.
 *
 * Tap-target tools (rake, axe, bomb, magic_wand) use bespoke GameScene handlers;
 * instant `clear_all` tools read tile keys from ITEMS / power params.
 */

/** Board tools that arm on USE_TOOL and resolve on tap (not instant clear_all). */
export const TAP_TARGET_TOOL_IDS = new Set(["bomb", "rake", "axe", "magic_wand"]);

function cellMatchesClearTarget(t, targetKey) {
  if (!t.key || t.rubble || t.gas || t.frozen || t.key === "rat") return false;
  if (targetKey === "*") return true;
  return t.key === targetKey;
}

/**
 * Clear every board cell matching targetKey (or all tile types when targetKey is "*").
 *
 * @param {object} state
 * @param {string} targetKey
 * @returns {{ state: object, collected: number }}
 */
export function clearTilesOfKey(state, targetKey) {
  if (!targetKey || !state.grid) {
    return { state, collected: 0 };
  }

  /** @type {Record<string, number>} */
  const byKey = {};
  const grid = state.grid.map((row) =>
    row.map((t) => {
      if (!cellMatchesClearTarget(t, targetKey)) return t;
      byKey[t.key] = (byKey[t.key] ?? 0) + 1;
      return { ...t, key: null, _emptied: true };
    }),
  );

  const collected = Object.values(byKey).reduce((sum, n) => sum + n, 0);
  let inventory = state.inventory ?? {};
  for (const [k, n] of Object.entries(byKey)) {
    inventory = { ...inventory, [k]: (inventory[k] ?? 0) + n };
  }

  return {
    state: { ...state, grid, inventory },
    collected,
  };
}

/**
 * Apply a pending board tool — pure reducer helper (tests / legacy paths).
 *
 * @param {object} state
 * @returns {object}
 */
export function applyToolPending(state) {
  const id = state.toolPending;
  if (!id) return state;
  return { ...state, toolPending: null };
}
