/**
 * Pure helpers for boss board modifiers.
 * No Phaser references — state-side only.
 */

import type { GameState, BossState } from "../../types/state.js";
import { inventoryZone, zoneInventory } from "../../state/zoneInventory.js";

export interface BossModifierParams {
  n?: number;
  count?: number;
  hidden?: number;
  boost?: string[];
  factor?: number;
  burnAfter?: number;
  /** heat_tiles: how many fresh heat tiles ignite each turn (and seed the board). */
  spawnPerTurn?: number;
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
 * Pick `want` distinct cells from a rows×cols grid, shuffled with `rng`.
 * Fisher-Yates over a row-major pool — deterministic for a given rng sequence.
 */
function pickDistinctCells(rows: number, cols: number, want: number, rng: () => number): CellCoord[] {
  const all: CellCoord[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) all.push({ row: r, col: c });
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = all[i]; all[i] = all[j]; all[j] = tmp;
  }
  return all.slice(0, Math.min(Math.max(0, want), all.length));
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
    const cells = pickDistinctCells(rows, cols, want, rng);
    for (const { row: r, col: c } of cells) grid[r][c][flag] = true;
    return type === "rubble_blocks" ? { rubble: cells } : { hidden: cells };
  }

  if (type === "heat_tiles") {
    // Seed the board with the per-turn allotment so the drake is visibly active
    // from turn one; tickModifier ignites further tiles each turn.
    const seed = params.spawnPerTurn ?? params.count ?? 0;
    const cells = pickDistinctCells(rows, cols, seed, rng);
    for (const { row: r, col: c } of cells) grid[r][c].heat = true;
    return { heat: cells.map(({ row, col }) => ({ row, col, age: 0 })) };
  }

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
 * For heat_tiles: ages every heat tile, burns a random stored resource for any
 * tile that has been alight past `burnAfter` (then the tile burns out), and
 * ignites `spawnPerTurn` fresh tiles on still-cool cells so the heat spreads.
 * Returns { newState }.
 */
export function tickModifier(state: GameState, modifier: BossModifier): TickModifierResult {
  if (modifier.type !== "heat_tiles") return { newState: state };

  // `modifierState` is the runtime BossInstance side-channel that BossState
  // doesn't declare; read it via a narrowing cast at the boundary.
  const bossState = state.boss as (BossState & { modifierState?: { heat?: HeatEntry[] } }) | null | undefined;
  const heat: HeatEntry[] = (bossState?.modifierState?.heat ?? []).map((h: HeatEntry) => ({ ...h, age: h.age + 1 }));
  const surviving: HeatEntry[] = [];
  const heatZone = inventoryZone(state);
  const inv: Record<string, number> = { ...zoneInventory(state, heatZone) };

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

  // Ignite this turn's fresh tiles on cells that aren't already alight.
  const spawnPerTurn = modifier.params.spawnPerTurn ?? 0;
  if (spawnPerTurn > 0) {
    const rows = state.grid?.length ?? 6;
    const cols = state.grid?.[0]?.length ?? 6;
    const occupied = new Set(surviving.map((h) => `${h.row},${h.col}`));
    const free: CellCoord[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!occupied.has(`${r},${c}`)) free.push({ row: r, col: c });
    }
    const want = Math.min(spawnPerTurn, free.length);
    for (let i = 0; i < want; i++) {
      const j = Math.floor(Math.random() * free.length);
      const cell = free.splice(j, 1)[0];
      surviving.push({ row: cell.row, col: cell.col, age: 0 });
    }
  }

  return {
    newState: {
      ...state,
      inventory: { ...state.inventory, [heatZone]: inv },
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
