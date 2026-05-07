/**
 * Phase 11.2 — Keyboard chain construction.
 *
 * handleKeyboard(state, ev) is a pure state reducer: given the current game
 * state and a keyboard event {key}, it returns the next state.  No DOM or
 * Phaser dependencies so it is fully testable in Vitest.
 *
 * Clamp chosen over wrap so a screen-reader user always hears predictable
 * cell coordinates (e.g. pressing Left at column 0 still reads "column 0").
 */
import { COLS, ROWS, UPGRADE_THRESHOLDS, BIOMES } from "../../constants.js";
import { isAdjacent, canExtendChain } from "../../utils.js";

// Arrow-key deltas — clamp at edges (no wrap).
const ARROWS = {
  ArrowUp:    (r, c) => [Math.max(0, r - 1), c],
  ArrowDown:  (r, c) => [Math.min(ROWS - 1, r + 1), c],
  ArrowLeft:  (r, c) => [r, Math.max(0, c - 1)],
  ArrowRight: (r, c) => [r, Math.min(COLS - 1, c + 1)],
};

function setCursor(state, cursor) {
  return {
    ...state,
    settings: { ...state.settings, keyboardCursor: cursor },
  };
}

function tryAddTile(state) {
  const { row, col } = state.settings.keyboardCursor;
  const tile = state.grid?.[row]?.[col];
  if (!tile || !tile.key) return state;

  const chain = state.chain ?? [];
  const last = chain[chain.length - 1];

  if (last) {
    // Must be adjacent to last chain tile
    if (!isAdjacent(last, { row, col })) {
      // Reject — chain unchanged, annotation for caller
      return state;
    }
    // Must extend chain (same resource key)
    if (!canExtendChain(chain, tile)) {
      return state;
    }
    // Prevent adding same tile twice
    if (chain.some((t) => t.row === row && t.col === col)) {
      return state;
    }
  }

  return { ...state, chain: [...chain, { row, col, key: tile.key }] };
}

/**
 * Commit the current keyboard chain through the same inventory math as
 * the COMMIT_CHAIN reducer in state.js.  Returns updated state with chain
 * cleared.
 */
function commitFromKeyboard(state) {
  const chain = state.chain ?? [];
  if (chain.length < 1) return { ...state, chain: [] };

  const chainKey = chain[0]?.key;
  if (!chainKey) return { ...state, chain: [] };

  const threshold = UPGRADE_THRESHOLDS[chainKey];
  const upgrades = threshold ? Math.floor(chain.length / threshold) : 0;
  const gained = chain.length - upgrades;

  const inv = { ...(state.inventory ?? {}) };
  if (gained > 0) inv[chainKey] = (inv[chainKey] ?? 0) + gained;

  const res = Object.values(BIOMES)
    .flatMap((b) => b.resources ?? [])
    .find((r) => r.key === chainKey);
  if (res?.next && upgrades > 0) {
    inv[res.next] = (inv[res.next] ?? 0) + upgrades;
  }

  return { ...state, inventory: inv, chain: [] };
}

/**
 * Pure keyboard handler.  Returns the next game state.
 *
 * @param {object} state - current game state
 * @param {object} ev    - keyboard event-like: { key: string }
 * @returns {object} next state
 */
export function handleKeyboard(state, ev) {
  const cur = state.settings?.keyboardCursor ?? { row: 0, col: 0, active: false };

  // Tab toggles the cursor in/out of the board
  if (ev.key === "Tab") {
    return setCursor(state, { ...cur, active: !cur.active });
  }

  // All other keys require cursor to be active
  if (!cur.active) return state;

  // Arrow keys move the cursor (clamped, no wrap)
  if (ARROWS[ev.key]) {
    const [r, c] = ARROWS[ev.key](cur.row, cur.col);
    return setCursor(state, { ...cur, row: r, col: c });
  }

  // Space adds the focused tile to the chain (if valid)
  if (ev.key === " ") return tryAddTile(state);

  // Enter commits the chain
  if (ev.key === "Enter") return commitFromKeyboard(state);

  // Escape cancels the chain
  if (ev.key === "Escape") {
    return { ...state, chain: [] };
  }

  return state;
}
