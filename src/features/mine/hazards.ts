/**
 * Phase 9.3 / 9.5 / 9.6 — Mine hazards
 *
 * Hazards spawn at 5% per fillBoard in Mine biome, never in Farm, never
 * when a boss is active, and never when another hazard is already active.
 *
 * Pool weights (total 100): cave_in 25, gas_vent 40, lava 20, mole 15
 */

import { computeWorkerEffects } from "../workers/aggregate.js";
import type { GameState } from "../../types/state.js";

export const HAZARD_BASE_RATE = 0.05;

export interface MineGridCell {
  key?: string | null;
  rubble?: boolean;
  lava?: boolean;
  consumed?: boolean;
  [k: string]: unknown;
}

export interface CaveInHazard { row: number }
export interface GasVentHazard { row: number; col: number; turnsRemaining: number }
export interface LavaCell { row: number; col: number }
export interface LavaHazard { cells: LavaCell[]; turnsToSpread?: number }
export interface MoleHazard { row: number; col: number; turnsRemaining: number }

interface MineHazardsState {
  caveIn?: CaveInHazard | null;
  gasVent?: GasVentHazard | null;
  lava?: LavaHazard | null;
  mole?: MoleHazard | null;
  [k: string]: unknown;
}

interface WorkerEffectsView {
  hazardSpawnReduce?: Record<string, number>;
}

export interface HazardDef {
  id: string;
  name: string;
  description: string;
  clearInstruction: string;
  weight: number;
  durationTurns?: number;
  spawn: (grid: MineGridCell[][], rng: () => number) => Record<string, unknown>;
  look: { icon: string };
}

export const HAZARDS: HazardDef[] = [
  {
    id: "cave_in",
    name: "Cave-In",
    description: "A tunnel collapse has buried an entire row in rubble, blocking all tiles in that row.",
    clearInstruction: "Chain 3 or more stone tiles adjacent to the rubble row to clear the debris.",
    weight: 25,
    spawn(grid: MineGridCell[][], rng: () => number) {
      const row = Math.floor(rng() * grid.length);
      return { caveIn: { row } };
    },
    look: { icon: "🪨" },
  },
  {
    id: "gas_vent",
    name: "Gas Vent",
    description: "Poisonous gas seeps through a crack, spreading a noxious cloud over nearby tiles.",
    clearInstruction: "Chain through any tiles in the gas cloud to disperse it before the 3-turn timer expires.",
    weight: 40,
    durationTurns: 3,
    spawn(grid: MineGridCell[][], rng: () => number) {
      const row = Math.floor(rng() * (grid.length - 1));
      const col = Math.floor(rng() * (grid[0].length - 1));
      return { gasVent: { row, col, turnsRemaining: 3 } };
    },
    look: { icon: "💨" },
  },
  {
    id: "lava",
    name: "Lava Flow",
    description: "A lava seam has cracked open, spreading molten rock that destroys any resource it touches.",
    clearInstruction: "There is no direct counter — lava spreads each turn. Mine all resources away from its path before it reaches them.",
    weight: 20,
    spawn(grid: MineGridCell[][], rng: () => number) {
      const row = Math.floor(rng() * grid.length);
      const col = Math.floor(rng() * grid[0].length);
      return { lava: { cells: [{ row, col }], turnsToSpread: 1 } };
    },
    look: { icon: "🌋" },
  },
  {
    id: "mole",
    name: "Giant Mole",
    description: "A monstrous mole is tunnelling through the mine, consuming adjacent resource tiles as it burrows.",
    clearInstruction: "Wait — the mole moves on a 3-turn cycle and hops to a new position. Clear tiles from its current path to limit damage.",
    weight: 15,
    spawn(grid: MineGridCell[][], rng: () => number) {
      const row = Math.floor(rng() * grid.length);
      const col = Math.floor(rng() * grid[0].length);
      return { mole: { row, col, turnsRemaining: 3 } };
    },
    look: { icon: "🐭" },
  },
];

function hazardsActive(state: GameState): number {
  // `Hazards` on GameState has an open index sig; the narrow per-hazard fields
  // we care about land on MineHazardsState — cast the value, not the state.
  const h = (state.hazards ?? {}) as MineHazardsState;
  return (h.caveIn ? 1 : 0) + (h.gasVent ? 1 : 0) + (h.lava ? 1 : 0) + (h.mole ? 1 : 0);
}

/**
 * Roll for a hazard spawn. Returns a hazard descriptor or null.
 */
export function rollHazard(state: GameState, rng: () => number = Math.random, allowedHazards: string[] = ["cave_in", "gas_vent", "lava", "mole"]): Record<string, unknown> | null {
  if (state.biome !== "mine") return null;
  if (state.boss) return null;
  if (hazardsActive(state) > 0) return null;

  // Apply base rate check
  const rate = HAZARD_BASE_RATE;
  if (rng() >= rate) return null;

  // Filter by allowedHazards and pick by weight
  const pool = HAZARDS.filter((h) => allowedHazards.includes(h.id));
  if (pool.length === 0) return null;

  const total = pool.reduce((a: number, h: HazardDef) => a + h.weight, 0);
  let r = rng() * total;
  let picked = pool[0];
  for (const h of pool) {
    r -= h.weight;
    if (r <= 0) {
      picked = h;
      break;
    }
  }

  // Canary reduces gas_vent spawn probability; Sapper does the same for
  // cave_in. Both go through hazardSpawnReduce in the worker aggregator.
  if (picked.id === "gas_vent" || picked.id === "cave_in") {
    const workerEffects = computeWorkerEffects(state) as WorkerEffectsView;
    const reduce = workerEffects.hazardSpawnReduce ?? {};
    const reduceR = reduce[picked.id];
    if (reduceR && rng() < reduceR) return null;
  }

  return { id: picked.id, ...picked.spawn((state.grid ?? []) as MineGridCell[][], rng) };
}

/**
 * Returns true if a tile is blocked by a hazard (rubble or lava).
 * Gas tiles remain chainable (chaining is the counter).
 */
export function tileBlockedByHazard(tile: MineGridCell | null | undefined): boolean {
  return !!(tile && (tile.rubble || tile.lava));
}

/**
 * Advance hazard state by one turn.
 * - Gas vent: tick down; at 0 costs a turn and clears.
 * - Lava: spread to a random orthogonally-adjacent free cell.
 * - Mole: decrement timer; consume an adjacent tile; hop on 0.
 */
export function tickHazards(state: GameState, rng: () => number = Math.random): GameState {
  let next = state;
  next = _tickGasVent(next);
  next = _tickLava(next, rng);
  next = _tickMole(next, rng);
  return next;
}

function _tickGasVent(state: GameState): GameState {
  const hazards = (state.hazards ?? {}) as MineHazardsState;
  if (!hazards.gasVent) return state;
  const v = hazards.gasVent;
  if (v.turnsRemaining > 1) {
    return {
      ...state,
      hazards: {
        ...hazards,
        gasVent: { ...v, turnsRemaining: v.turnsRemaining - 1 },
      },
    } as GameState;
  }
  // Expired: costs 1 turn
  return {
    ...state,
    hazards: { ...hazards, gasVent: null },
    turnsUsed: (state.turnsUsed ?? 0) + 1,
    _hazardFloater: "You cough through it.",
  } as GameState;
}

function _tickLava(state: GameState, rng: () => number): GameState {
  const hazards = (state.hazards ?? {}) as MineHazardsState;
  if (!hazards.lava) return state;
  const lava = hazards.lava;

  // If no grid, bail
  const gridRaw = state.grid as MineGridCell[][] | undefined;
  if (!gridRaw) return state;

  const rows = gridRaw.length;
  const cols = gridRaw[0].length;
  const cells: LavaCell[] = lava.cells;

  // Build set of occupied lava cells
  const occupied = new Set<string>(cells.map((c) => `${c.row},${c.col}`));

  // Collect all free orthogonal neighbours of any lava cell
  const candidates: LavaCell[] = [];
  for (const cell of cells) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cell.row + dr;
      const nc = cell.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const key = `${nr},${nc}`;
      if (!occupied.has(key)) {
        candidates.push({ row: nr, col: nc });
        occupied.add(key); // avoid duplicates in candidates
      }
    }
  }

  if (candidates.length === 0) {
    // No room to spread — stay put
    return state;
  }

  // Pick one candidate
  const pick = candidates[Math.floor(rng() * candidates.length)];
  const newCells = [...cells, pick];

  // Clear the tile at the new lava position (destroy resource)
  const grid: MineGridCell[][] = gridRaw.map((row: MineGridCell[], ri: number) =>
    row.map((t: MineGridCell, ci: number) =>
      ri === pick.row && ci === pick.col ? { ...t, key: "lava" } : t,
    ),
  );

  return {
    ...state,
    grid,
    hazards: {
      ...hazards,
      lava: { ...lava, cells: newCells },
    },
  } as GameState;
}

function _tickMole(state: GameState, rng: () => number): GameState {
  const hazards = (state.hazards ?? {}) as MineHazardsState;
  if (!hazards.mole) return state;
  const mole = hazards.mole;

  const gridRaw = state.grid as MineGridCell[][] | undefined;
  if (!gridRaw) return state;
  const rows = gridRaw.length;
  const cols = gridRaw[0].length;

  // On timer > 0: decrement and consume one adjacent tile
  if (mole.turnsRemaining > 0) {
    const newTurns = mole.turnsRemaining - 1;

    // Collect non-consumed, non-rubble orthogonal neighbours
    const adj: LavaCell[] = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = mole.row + dr;
      const nc = mole.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const t = gridRaw[nr][nc];
      if (!t.consumed && !t.rubble) adj.push({ row: nr, col: nc });
    }

    let grid: MineGridCell[][] = gridRaw;
    if (adj.length > 0) {
      const target = adj[Math.floor(rng() * adj.length)];
      grid = gridRaw.map((row: MineGridCell[], ri: number) =>
        row.map((t: MineGridCell, ci: number) =>
          ri === target.row && ci === target.col ? { ...t, consumed: true } : t,
        ),
      );
    }

    return {
      ...state,
      grid,
      hazards: {
        ...hazards,
        mole: { ...mole, turnsRemaining: newTurns },
      },
    } as GameState;
  }

  // turnsRemaining === 0: hop to a random free adjacent cell
  const freeAdj: LavaCell[] = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = mole.row + dr;
    const nc = mole.col + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const t = gridRaw[nr][nc];
    if (!t.rubble && !t.consumed) freeAdj.push({ row: nr, col: nc });
  }

  let newPos: LavaCell;
  if (freeAdj.length > 0) {
    newPos = freeAdj[Math.floor(rng() * freeAdj.length)];
  } else {
    // Fully boxed — stay put
    newPos = { row: mole.row, col: mole.col };
  }

  return {
    ...state,
    hazards: {
      ...hazards,
      mole: { row: newPos.row, col: newPos.col, turnsRemaining: 3 },
    },
  } as GameState;
}

interface ChainCell { key?: string | null; row: number; col: number }

/**
 * Attempt to clear a cave-in by chaining 3+ stone tiles in an adjacent row.
 */
export function clearCaveIn(state: GameState, chain: ChainCell[]): GameState {
  const hazards = (state.hazards ?? {}) as MineHazardsState;
  if (!hazards.caveIn) return state;
  const targetRow = hazards.caveIn.row;
  const stoneCount = chain.filter((t: ChainCell) => t.key === "tile_mine_stone").length;
  const nearRow = chain.some((t: ChainCell) => Math.abs(t.row - targetRow) === 1);
  if (stoneCount < 3 || !nearRow) return state;
  return { ...state, hazards: { ...hazards, caveIn: null } } as GameState;
}
