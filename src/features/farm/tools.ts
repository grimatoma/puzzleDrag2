/**
 * Phase 10.1 — Farm tools pure logic.
 * Animation lives in GameScene; this file is pure state transforms.
 *
 * Tap-target tools (rake, axe, bomb, magic_wand) use bespoke GameScene handlers;
 * instant `clear_all` tools read tile keys from ITEMS / power params.
 */

import type { GameState } from "../../types/state.js";

interface ToolGridCell {
  key?: string | null;
  rubble?: boolean;
  gas?: boolean;
  frozen?: boolean;
  _emptied?: boolean;
  [k: string]: unknown;
}

interface ToolHostState {
  grid?: ToolGridCell[][];
  inventory?: Record<string, number>;
  toolPending?: string | null;
}

/** Board tools that arm on USE_TOOL and resolve on tap (not instant clear_all). */
function cellMatchesClearTarget(t: ToolGridCell, targetKey: string): boolean {
  if (!t.key || t.rubble || t.gas || t.frozen || t.key === "rat") return false;
  if (targetKey === "*") return true;
  return t.key === targetKey;
}

/**
 * Clear every board cell matching targetKey (or all tile types when targetKey is "*").
 */
export function clearTilesOfKey(state: GameState, targetKey: string): { state: GameState; collected: number } {
  // eslint-disable-next-line no-restricted-syntax -- pre-existing HostState cast; tracked for follow-up cleanup
  const s = state as unknown as ToolHostState;
  if (!targetKey || !s.grid) {
    return { state, collected: 0 };
  }

  const byKey: Record<string, number> = {};
  const grid: ToolGridCell[][] = s.grid.map((row: ToolGridCell[]) =>
    row.map((t: ToolGridCell) => {
      if (!cellMatchesClearTarget(t, targetKey)) return t;
      if (t.key) byKey[t.key] = (byKey[t.key] ?? 0) + 1;
      return { ...t, key: null, _emptied: true };
    }),
  );

  const collected = Object.values(byKey).reduce((sum: number, n: number) => sum + n, 0);
  let inventory: Record<string, number> = s.inventory ?? {};
  for (const [k, n] of Object.entries(byKey)) {
    inventory = { ...inventory, [k]: (inventory[k] ?? 0) + n };
  }

  return {
    state: { ...state, grid, inventory } as GameState,
    collected,
  };
}

/**
 * Apply a pending board tool — pure reducer helper (tests / legacy paths).
 */
export function applyToolPending(state: GameState): GameState {
  // eslint-disable-next-line no-restricted-syntax -- pre-existing HostState cast; tracked for follow-up cleanup
  const s = state as unknown as ToolHostState;
  const id = s.toolPending;
  if (!id) return state;
  return { ...state, toolPending: null } as GameState;
}
