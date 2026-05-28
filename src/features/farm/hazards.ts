/**
 * Phase 10.7 — Farm hazards: Fire
 * Phase 10.8 — Farm hazards: Wolves (tickWolves)
 *
 * Single-active Farm hazard cap: only one of rats / fire / wolves active
 * at a time (rats managed separately via rats.js; fire and wolves here).
 *
 * §6 fire spawn: 4% per fillBoard on Farm biome, cap 3 cells, never co-spawns
 * with rats or wolves (single-active cap).
 * §6 wolves spawn: 6% per fillBoard when egg > 30 OR turkey > 5, cap 2.
 */

import { isFireHazardEnabled } from "../../featureFlags.js";
import type { GameState } from "../../types/state.js";

// ─── Hazard metadata (player-facing) ─────────────────────────────────────────

export const FARM_HAZARD_META: Record<string, { name: string; description: string; clearInstruction: string }> = {
  fire: {
    name: "Fire",
    description: "A fire has broken out in the fields, spreading to adjacent tiles each turn and burning resources away.",
    clearInstruction: "Chain any fire tiles to extinguish them and earn a small coin bonus per tile cleared.",
  },
  wolf: {
    name: "Wolves",
    description: "A pack of wolves has crept into the farm and is devouring your bird tiles one by one.",
    clearInstruction: "Use a Rifle (Workshop recipe) to drive them off, or a Hound to scatter them temporarily.",
  },
  rats: {
    name: "Rats",
    description: "Rats have invaded the granary! They eat plant tiles adjacent to them every turn.",
    clearInstruction: "Chain 3 or more rat tiles together to clear them and earn 5 coins per rat removed.",
  },
};

// ─── Fire hazard ──────────────────────────────────────────────────────────────

const FIRE_SPAWN_RATE   = 0.04;
const FIRE_SPREAD_RATE  = 0.50;
const FIRE_MAX_CELLS    = 3;
const WOLF_SPAWN_RATE   = 0.06;
const WOLF_MAX_ACTIVE   = 2;
const WOLF_BIRD_KEYS    = new Set<string>(["eggs", "tile_bird_turkey"]);

export interface FireCell { row: number; col: number }
export interface FireHazard { cells: FireCell[] }
export interface Wolf { row: number; col: number; scared: boolean }
export interface WolfHazard { list: Wolf[]; scaredTurnsRemaining?: number }

interface FarmHazardsState {
  rats?: Array<{ row: number; col: number; age?: number }>;
  fire?: FireHazard | null;
  wolves?: WolfHazard | null;
  [k: string]: unknown;
}

interface FarmGridCell {
  key?: string | null;
  _burned?: boolean;
  _eaten?: boolean;
  [k: string]: unknown;
}

export type FarmHazardSpawn =
  | { kind: "fire"; cells: FireCell[] }
  | { kind: "wolf"; row: number; col: number; scared: boolean };

/**
 * Roll for a Farm hazard spawn.
 */
export function rollFarmHazard(
  state: GameState,
  rng: () => number = Math.random,
  allowedHazards: string[] = ["fire", "wolf", "rats"],
): FarmHazardSpawn | null {
  if (state.biome !== "farm") return null;
  if (state.boss) return null;

  // Single-active cap: if any farm hazard is active, no new spawn
  const rats = state.hazards?.rats ?? [];
  const fire = state.hazards?.fire;
  const wolves = state.hazards?.wolves;

  // Fire spawn gate
  if (isFireHazardEnabled() && allowedHazards.includes("fire") && !fire && (rats.length === 0) && !wolves) {
    const fireRead = fire as FireHazard | null | undefined;
    if ((fireRead?.cells?.length ?? 0) < FIRE_MAX_CELLS) {
      if (rng() < FIRE_SPAWN_RATE) {
        const grid = state.grid;
        if (grid && grid.length > 0) {
          const row = Math.floor(rng() * grid.length);
          const col = Math.floor(rng() * grid[0].length);
          return { kind: "fire", cells: [{ row, col }] };
        }
        return { kind: "fire", cells: [{ row: 0, col: 0 }] };
      }
    }
  }

  // Wolf spawn gate (independent roll, but still single-active cap)
  if (allowedHazards.includes("wolf") && !wolves && rats.length === 0 && !fire) {
    const inv: Record<string, number> = state.inventory ?? {};
    const birdRich = (inv.eggs ?? 0) > 30 || (inv.tile_bird_turkey ?? 0) > 5;
    if (birdRich) {
      const wolvesRead = wolves as WolfHazard | null | undefined;
      const wolvesCount = (wolvesRead?.list?.length ?? 0);
      if (wolvesCount < WOLF_MAX_ACTIVE && rng() < WOLF_SPAWN_RATE) {
        const grid = state.grid;
        const row = grid ? Math.floor(rng() * grid.length) : 0;
        const col = grid ? Math.floor(rng() * grid[0].length) : 0;
        return { kind: "wolf", row, col, scared: false };
      }
    }
  }

  return null;
}

/**
 * Advance fire state by one turn.
 * Each fire cell rolls 50% to spread to an orthogonal-adjacent free cell.
 */
export function tickFire(state: GameState, rng: () => number = Math.random): GameState {
  const hazards = (state.hazards ?? {}) as FarmHazardsState;
  if (!hazards.fire) return state;
  const fire = hazards.fire;
  const cells = fire.cells ?? [];
  if (cells.length === 0) return state;

  if (!state.grid) return state;
  const grid: FarmGridCell[][] = (state.grid as unknown as FarmGridCell[][]).map((r: FarmGridCell[]) => r.map((t: FarmGridCell) => ({ ...t })));
  const rows = grid.length;
  const cols = grid[0].length;

  const occupied = new Set<string>(cells.map((c) => `${c.row},${c.col}`));
  let newCells: FireCell[] = [...cells];

  for (const cell of cells) {
    // Each fire cell: 50% chance to spread to one adjacent free cell
    if (rng() >= FIRE_SPREAD_RATE) continue;

    const candidates: FireCell[] = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cell.row + dr;
      const nc = cell.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (occupied.has(`${nr},${nc}`)) continue;
      candidates.push({ row: nr, col: nc });
    }
    if (candidates.length === 0) continue;

    const pick = candidates[Math.floor(rng() * candidates.length)];
    const key = `${pick.row},${pick.col}`;
    occupied.add(key);
    newCells = [...newCells, pick];
    // Destroy resource at the spread position
    grid[pick.row][pick.col] = { ...grid[pick.row][pick.col], key: null, _burned: true };
  }

  return {
    ...state,
    grid,
    hazards: { ...state.hazards, fire: { ...fire, cells: newCells } },
  } as GameState;
}

/**
 * Advance wolf state by one turn.
 * - Decrement scaredTurnsRemaining; when it hits 0, clear all scared flags.
 * - Non-scared wolves consume one adjacent bird tile.
 */
export function tickWolves(state: GameState): GameState {
  const hazards = (state.hazards ?? {}) as FarmHazardsState;
  if (!hazards.wolves) return state;
  const wolves = hazards.wolves;
  const list: Wolf[] = wolves.list ?? [];

  // Scared countdown
  let scaredTurns = wolves.scaredTurnsRemaining ?? 0;
  let newList: Wolf[] = list;

  if (scaredTurns > 0) {
    scaredTurns -= 1;
    if (scaredTurns === 0) {
      newList = list.map((w: Wolf) => ({ ...w, scared: false }));
    }
  }

  // Non-scared wolves eat adjacent birds
  const grid: FarmGridCell[][] | undefined = state.grid ? state.grid.map((r: FarmGridCell[]) => r.map((t: FarmGridCell) => ({ ...t }))) : state.grid;
  if (grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    newList = newList.map((wolf: Wolf) => {
      if (wolf.scared) return wolf;
      const adj: Array<[number, number]> = ([
        [wolf.row - 1, wolf.col],
        [wolf.row + 1, wolf.col],
        [wolf.row, wolf.col - 1],
        [wolf.row, wolf.col + 1],
      ] as Array<[number, number]>).filter(([r, c]) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
        const k = grid[r][c].key;
        return !!k && WOLF_BIRD_KEYS.has(k);
      });
      if (adj.length) {
        const [r, c] = adj[0];
        grid[r][c] = { ...grid[r][c], key: null, _eaten: true };
      }
      return wolf;
    });
  }

  return {
    ...state,
    grid: grid ?? state.grid,
    hazards: {
      ...state.hazards,
      wolves: { ...wolves, list: newList, scaredTurnsRemaining: scaredTurns },
    },
  } as GameState;
}

interface ChainCell { key?: string | null; row: number; col: number }

/**
 * Attempt to extinguish fire tiles in a chain.
 * Returns a state patch `{ hazards, coinsBonus }` or null if no fire in chain.
 */
export function tryExtinguishFire(state: GameState, chain: ChainCell[]): { hazards: FarmHazardsState; coinsBonus: number } | null {
  const hazards = (state.hazards ?? {}) as FarmHazardsState;
  const fireCells: FireCell[] = hazards.fire?.cells ?? [];
  if (fireCells.length === 0) return null;

  const fireTiles = chain.filter((t: ChainCell) => t.key === "fire");
  if (fireTiles.length === 0) return null;

  const remaining = fireCells.filter(
    (c: FireCell) => !fireTiles.some((t: ChainCell) => t.row === c.row && t.col === c.col),
  );

  return {
    hazards: {
      ...hazards,
      fire: remaining.length > 0 && hazards.fire ? { ...hazards.fire, cells: remaining } : null,
    },
    coinsBonus: fireTiles.length * 2,
  };
}
