/**
 * Fish biome — Pearl rune-capture mechanic.
 *
 * Mirror of `features/mine/mysterious_ore.js`. Once per fish session a
 * single Pearl tile spawns on the board with a `PEARL_TURNS`-turn
 * countdown. Chain it with ≥ `REQUIRED_FISH_IN_CHAIN` other fish-category
 * tiles before the timer expires → +1 Rune. If the timer runs out, the
 * tile degrades back into kelp.
 *
 * The pearl tile shares the existing `tile_special_giant_pearl` resource entry used
 * by the oyster icon (no separate sprite — tile_special_giant_pearl is a special
 * non-spawnable resource used only when conditionally seeded here).
 */

import type { GameState } from "../../types/state.js";

export const PEARL_TURNS = 5;
export const REQUIRED_FISH_IN_CHAIN = 2;
export const PEARL_KEY = "tile_special_giant_pearl";

/** Resource keys that count as "fish" for the rune-capture chain rule. */
const FISH_CATEGORY_KEYS = new Set<string>([
  "tile_fish_sardine",
  "tile_fish_mackerel",
  "tile_fish_clam",
  "tile_fish_oyster",
  "tile_fish_kelp",
  "fish_fillet",
]);

interface PearlGridCell {
  key?: string | null;
  frozen?: boolean;
  rubble?: boolean;
  hidden?: boolean;
  [k: string]: unknown;
}

export interface PearlState {
  row: number;
  col: number;
  turnsRemaining: number;
}

interface ChainCell { key?: string | null }

/**
 * Spawn a Pearl tile somewhere on the fish board.
 * No-op if a pearl is already active or the player isn't on the fish biome.
 */
export function spawnPearl(state: GameState, rng: () => number = Math.random): GameState {
  if (state.biome !== "fish") return state;
  if (state.fishPearl) return state;
  if (!Array.isArray(state.grid) || state.grid.length === 0) return state;

  const rows = state.grid.length;
  const cols = state.grid[0]?.length ?? 0;
  if (cols === 0) return state;
  const grid = state.grid;

  const blocked = (r: number, c: number): boolean => {
    const t = grid[r]?.[c];
    return !t || !!t.frozen || !!t.rubble || !!t.hidden;
  };

  let r = 0;
  let c = 0;
  let tries = 0;
  do {
    r = Math.floor(rng() * rows);
    c = Math.floor(rng() * cols);
    tries += 1;
  } while (blocked(r, c) && tries < 32);

  if (blocked(r, c)) return state; // gave up — no clear spot

  const newGrid: PearlGridCell[][] = state.grid.map((row: PearlGridCell[], ri: number) =>
    row.map((tile: PearlGridCell, ci: number) =>
      ri === r && ci === c ? { ...tile, key: PEARL_KEY } : tile,
    ),
  );

  return {
    ...state,
    grid: newGrid,
    fishPearl: { row: r, col: c, turnsRemaining: PEARL_TURNS },
  } as GameState;
}

/**
 * Tick the pearl countdown by 1. At 0, degrade the tile back to kelp
 * and clear the pearl slot.
 */
export function tickPearl(state: GameState): GameState {
  if (!state.fishPearl) return state;
  // GameState's `fishPearl` field has `turnsRemaining?: number`; the slice
  // always seeds it on spawn, so default to 0 at the read boundary.
  const fishPearl = state.fishPearl as unknown as PearlState;
  const next = (fishPearl.turnsRemaining ?? 0) - 1;
  if (next > 0) {
    return {
      ...state,
      fishPearl: { ...fishPearl, turnsRemaining: next },
    } as GameState;
  }
  // Expire — degrade tile to kelp.
  const { row, col } = fishPearl;
  const grid = Array.isArray(state.grid)
    ? state.grid.map((rowArr: PearlGridCell[], ri: number) =>
        rowArr.map((t: PearlGridCell, ci: number) =>
          ri === row && ci === col ? { ...t, key: "tile_fish_kelp" } : t,
        ),
      )
    : state.grid;
  return { ...state, grid, fishPearl: null } as GameState;
}

/**
 * True iff the chain contains the pearl tile AND at least
 * REQUIRED_FISH_IN_CHAIN other fish-category tiles. `supportReduce` (from Rune
 * Seeker workers) lowers the required fish count, floored at 1.
 */
export function isPearlChainValid(chain: ChainCell[], supportReduce = 0): boolean {
  if (!Array.isArray(chain) || chain.length === 0) return false;
  const hasPearl = chain.some((t: ChainCell) => t.key === PEARL_KEY);
  if (!hasPearl) return false;
  const fishCount = chain.filter((t: ChainCell) => !!t.key && FISH_CATEGORY_KEYS.has(t.key)).length;
  const required = Math.max(1, REQUIRED_FISH_IN_CHAIN - (supportReduce | 0));
  return fishCount >= required;
}
