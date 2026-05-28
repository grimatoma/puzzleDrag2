/**
 * Pure helpers for boss board modifiers.
 * No Phaser references — state-side only.
 */

import type { GameState, BossState } from "../../types/state.js";

export interface BossModifierParams {
  n?: number;
  count?: number;
  hidden?: number;
  boost?: string[];
  factor?: number;
  burnAfter?: number;
}

export interface BossModifier {
  type: string;
  params: BossModifierParams;
}

interface ModifierGridCell {
  frozen?: boolean;
  rubble?: boolean;
  hidden?: boolean;
  heat?: boolean;
  [k: string]: unknown;
}

export interface CellCoord { row: number; col: number }

export interface HeatEntry { row: number; col: number; age: number }

export interface ModifierState {
  frozenColumns?: number[];
  rubble?: CellCoord[];
  hidden?: CellCoord[];
  heat?: HeatEntry[];
  boost?: string[];
  factor?: number;
}

/**
 * Apply a modifier to a freshly-generated grid, returning the modifierState bag.
 * Mutates tile objects in grid to add overlay flags.
 */
export function applyModifierToFreshGrid(grid: ModifierGridCell[][] | null | undefined, modifier: BossModifier, rng: () => number): ModifierState {
  const { type, params } = modifier;
  if (!grid || grid.length === 0) {
    // Empty grid — return shape-correct modifier state
    if (type === "freeze_columns") return { frozenColumns: [] };
    if (type === "rubble_blocks") return { rubble: [] };
    if (type === "hide_resources") return { hidden: [] };
    if (type === "heat_tiles") return { heat: [] };
    if (type === "respawn_boost") return { boost: params.boost, factor: params.factor };
    return {};
  }

  const rows = grid.length;
  const cols = grid[0].length;

  if (type === "freeze_columns") {
    const picked = new Set<number>();
    while (picked.size < (params.n ?? 0)) picked.add(Math.floor(rng() * cols));
    const frozenColumns = [...picked];
    for (const row of grid) for (const c of frozenColumns) row[c].frozen = true;
    return { frozenColumns };
  }

  if (type === "rubble_blocks" || type === "hide_resources") {
    const want: number = (params.count ?? params.hidden ?? 0);
    const flag: "rubble" | "hidden" = type === "rubble_blocks" ? "rubble" : "hidden";
    // Build a pool of all grid positions, shuffle with rng, take 'want'
    const allCells: CellCoord[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) allCells.push({ row: r, col: c });
    // Fisher-Yates shuffle using rng
    for (let i = allCells.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = allCells[i]; allCells[i] = allCells[j]; allCells[j] = tmp;
    }
    const cells = allCells.slice(0, Math.min(want, allCells.length));
    for (const { row: r, col: c } of cells) grid[r][c][flag] = true;
    return type === "rubble_blocks" ? { rubble: cells } : { hidden: cells };
  }

  if (type === "heat_tiles") return { heat: [] };

  if (type === "respawn_boost") return { boost: params.boost, factor: params.factor };

  return {};
}

/**
 * tileIsChainable — returns false for frozen, rubble, or hidden tiles.
 * modifier parameter accepted for API compatibility but tile flags are checked directly.
 */
export function tileIsChainable(tile: ModifierGridCell | null | undefined): boolean {
  return !!tile && !(tile.frozen || tile.rubble || tile.hidden);
}

export interface TickModifierResult { newState: GameState }

/**
 * tickModifier — advances modifier state one turn.
 * For heat_tiles: increments ages, burns at burnAfter threshold.
 * Returns { newState }.
 */
export function tickModifier(state: GameState, modifier: BossModifier): TickModifierResult {
  if (modifier.type !== "heat_tiles") return { newState: state };

  // `modifierState` is the runtime BossInstance side-channel that BossState
  // doesn't declare; read it via a narrowing cast at the boundary.
  const bossState = state.boss as (BossState & { modifierState?: { heat?: HeatEntry[] } }) | null | undefined;
  const heat: HeatEntry[] = (bossState?.modifierState?.heat ?? []).map((h: HeatEntry) => ({ ...h, age: h.age + 1 }));
  const surviving: HeatEntry[] = [];
  const inv: Record<string, number> = { ...(state.inventory ?? {}) };

  for (const h of heat) {
    if (h.age > (modifier.params.burnAfter ?? Infinity)) {
      const keys = Object.keys(inv).filter((k) => (inv[k] ?? 0) > 0);
      if (keys.length) {
        const k = keys[Math.floor(Math.random() * keys.length)];
        inv[k] = Math.max(0, inv[k] - 1);
      }
    } else {
      surviving.push(h);
    }
  }

  return {
    newState: {
      ...state,
      inventory: inv,
      boss: {
        ...(state.boss ?? {}),
        modifierState: {
          ...(bossState?.modifierState ?? {}),
          heat: surviving,
        },
      },
    } as unknown as GameState,
  };
}

/**
 * clearModifier — strips every overlay flag from all tiles in the grid.
 * Called once on boss resolution.
 */
export function clearModifier(grid: ModifierGridCell[][] | null | undefined): ModifierGridCell[][] | null | undefined {
  if (!grid) return grid;
  for (const row of grid) {
    for (const t of row) {
      delete t.frozen;
      delete t.rubble;
      delete t.hidden;
      delete t.heat;
    }
  }
  return grid;
}
