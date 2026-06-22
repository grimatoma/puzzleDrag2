/**
 * Phase 9.2 — Mysterious Ore mechanic
 *
 * Once per mine session a single Mysterious Ore tile spawns on the board
 * with a 5-turn countdown. Chain it with ≥ 2 Dirt tiles → +1 Rune.
 * If the countdown expires the tile degrades to plain Dirt.
 */

import type { GameState } from "../../types/state.js";

export const MYSTERIOUS_ORE_TURNS = 5;
export const REQUIRED_DIRT_IN_CHAIN = 2;

interface OreGridCell {
  key?: string | null;
  rubble?: boolean;
  gas?: boolean;
  frozen?: boolean;
  hidden?: boolean;
  [k: string]: unknown;
}

export interface MysteriousOreState {
  row: number;
  col: number;
  turnsRemaining: number;
}

interface ChainCell { key?: string | null }

/**
 * Spawn a Mysterious Ore tile somewhere on the mine board.
 * No-op if already active or biome is not "mine".
 */
export function spawnMysteriousOre(state: GameState, rng: () => number = Math.random): GameState {
  if (state.biome !== "mine") return state;
  if (state.mysteriousOre) return state; // already active — one at a time
  if (!state.grid) return state;

  const rows = state.grid.length;
  const cols = state.grid[0].length;
  const grid = state.grid;

  const blocked = (r: number, c: number): boolean => {
    const t = grid[r][c];
    return !!(t && (t.rubble || t.gas || t.frozen || t.hidden));
  };

  let r = 0, c = 0, tries = 0;
  do {
    r = Math.floor(rng() * rows);
    c = Math.floor(rng() * cols);
    tries++;
  } while (blocked(r, c) && tries < 32);

  const newGrid: OreGridCell[][] = state.grid.map((row: OreGridCell[], ri: number) =>
    row.map((tile: OreGridCell, ci: number) =>
      ri === r && ci === c ? { ...tile, key: "mysterious_ore" } : tile,
    ),
  );

  return {
    ...state,
    grid: newGrid,
    mysteriousOre: { row: r, col: c, turnsRemaining: MYSTERIOUS_ORE_TURNS },
  } as GameState;
}

/**
 * Tick the countdown by 1. At 0, degrade the tile to Dirt.
 */
export function tickMysteriousOre(state: GameState): GameState {
  if (!state.mysteriousOre) return state;
  // GameState's `mysteriousOre` field has `turnsRemaining?: number`; the slice
  // always seeds it on spawn, so default to 0 at the read boundary.
  const ore = state.mysteriousOre as unknown as MysteriousOreState;
  const next = (ore.turnsRemaining ?? 0) - 1;
  if (next > 0) {
    return {
      ...state,
      mysteriousOre: { ...ore, turnsRemaining: next },
    } as GameState;
  }
  // Expire — degrade tile to plain Dirt
  const { row, col } = ore;
  if (!state.grid) return state;
  const grid: OreGridCell[][] = state.grid.map((rowArr: OreGridCell[], ri: number) =>
    rowArr.map((t: OreGridCell, ci: number) =>
      ri === row && ci === col ? { ...t, key: "tile_special_dirt" } : t,
    ),
  );
  return { ...state, grid, mysteriousOre: null } as GameState;
}

/**
 * Returns true if the chain contains the Mysterious Ore tile AND
 * at least REQUIRED_DIRT_IN_CHAIN dirt tiles. `supportReduce` (from Rune Seeker
 * workers) lowers the required dirt count, floored at 1.
 */
export function isMysteriousChainValid(chain: ChainCell[], supportReduce = 0): boolean {
  const hasOre = chain.some((t: ChainCell) => t.key === "mysterious_ore");
  const dirtCnt = chain.filter((t: ChainCell) => t.key === "tile_special_dirt").length;
  const required = Math.max(1, REQUIRED_DIRT_IN_CHAIN - (supportReduce | 0));
  return hasOre && dirtCnt >= required;
}
