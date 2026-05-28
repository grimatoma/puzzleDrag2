/**
 * Phase 10.4 — Rat hazard (pure logic).
 *
 * Spawn condition: Farm biome only, inventory.tile_grass_hay > 50 AND inventory.tile_grain_wheat > 50.
 * Spawn rate: 10% per fillBoard call, cap 4 active.
 * Behaviour: each rat eats one orthogonally-adjacent plant tile per turn.
 * Counter: chain 3+ rat tiles → clear them, +5◉ per rat (no inventory yield).
 *
 * §6 Cat tool counter explicitly deferred; chain-3-rats is the locked
 * Phase 10 removal path.
 */

import { RAT_SPAWN_THRESHOLDS, RAT_CLEAR_REWARD_PER } from "../../constants.js";
import { RATS_HAZARD_ENABLED } from "../../featureFlags.js";
import { hasTag } from "../tileCollection/tags.js";
import { computeWorkerEffects } from "../workers/aggregate.js";
import { effectiveRatSpawnRate } from "./attractsRats.js";
import type { GameState } from "../../types/state.js";

const PLANT_KEYS = new Set<string>(["tile_grass_hay", "tile_grain_wheat", "tile_fruit_blackberry"]);

export interface Rat {
  row: number;
  col: number;
  age: number;
}

export interface GridCell {
  key?: string | null;
  rubble?: boolean;
  gas?: boolean;
  frozen?: boolean;
  _eaten?: boolean;
}

interface FarmHazardsState {
  rats?: Rat[];
  [k: string]: unknown;
}

interface ChainCell { key?: string | null; row: number; col: number }

interface WorkerEffectsView {
  hazardCoinMultiplier?: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Roll for a rat spawn on a fillBoard call.
 * Returns `{ row, col, age: 0 }` on success, `null` otherwise.
 */
export function rollRatSpawn(state: GameState, rng: () => number = Math.random): Rat | null {
  if (!RATS_HAZARD_ENABLED) return null;
  if (state.biome !== "farm") return null;
  const inv: Record<string, number> = state.inventory ?? {};
  if ((inv.tile_grass_hay ?? 0) <= RAT_SPAWN_THRESHOLDS.tile_grass_hay) return null;
  if ((inv.tile_grain_wheat ?? 0) <= RAT_SPAWN_THRESHOLDS.tile_grain_wheat) return null;
  const rats: Rat[] = (state.hazards?.rats ?? []) as Rat[];
  if (rats.length >= RAT_SPAWN_THRESHOLDS.maxActive) return null;
  // Catalog §7: tiles tagged "attracts_rats" (Manna, Jackfruit) bump the
  // spawn rate by ATTRACT_RATE_BONUS each, capped at 1.0.
  const rate = effectiveRatSpawnRate(RAT_SPAWN_THRESHOLDS.perFillRate, state.grid);
  if (rng() >= rate) return null;

  // Pick a random non-special, non-rat cell
  const grid = state.grid;
  if (!grid || !grid.length) return { row: 0, col: 0, age: 0 };
  const rows = grid.length;
  const cols = grid[0].length;
  let row = 0, col = 0, tries = 0;
  do {
    row = Math.floor(rng() * rows);
    col = Math.floor(rng() * cols);
    const t = grid[row]?.[col];
    if (t && !t.rubble && !t.gas && !t.frozen
        && !rats.some((r: Rat) => r.row === row && r.col === col)) {
      break;
    }
  } while (++tries < 32);
  return { row, col, age: 0 };
}

/**
 * Advance all rats by one turn: each eats one adjacent plant tile and ages +1.
 */
export function tickRats(state: GameState): GameState {
  if (!state.hazards?.rats?.length) return state;
  const grid: GridCell[][] | undefined = state.grid ? state.grid.map((r: GridCell[]) => r.map((t: GridCell) => ({ ...t }))) : state.grid;
  const rats: Rat[] = (state.hazards.rats as Rat[]).map((rat: Rat) => {
    if (!grid) return { ...rat, age: rat.age + 1 };
    const rows = grid.length;
    const cols = grid[0].length;
    const adj: Array<[number, number]> = ([
      [rat.row - 1, rat.col],
      [rat.row + 1, rat.col],
      [rat.row, rat.col - 1],
      [rat.row, rat.col + 1],
    ] as Array<[number, number]>).filter(([r, c]) => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
      const k = grid[r][c].key;
      if (!k) return false;
      // Catalog §7: certain species are "avoided by rats" — rats won't eat them.
      if (hasTag(k, "avoids_rats")) return false;
      return PLANT_KEYS.has(k);
    });
    if (adj.length) {
      const [r, c] = adj[0]; // deterministic — first in list
      grid[r][c] = { ...grid[r][c], key: null, _eaten: true };
    }
    return { ...rat, age: rat.age + 1 };
  });
  return { ...state, grid, hazards: { ...state.hazards, rats } } as GameState;
}

export interface RatChainPatch {
  hazards: FarmHazardsState;
  coins: number;
  _ratFloater: string;
}

/**
 * Attempt to clear a rat chain from a COMMIT_CHAIN action.
 * Returns a state patch `{ hazards, coins, _ratFloater }` if valid, or null
 * if the chain is invalid (< 3 rats, or mixed tile types).
 */
export function tryClearRatChain(state: GameState, chain: ChainCell[]): RatChainPatch | null {
  if (chain.length < 3) return null;
  if (!chain.every((t: ChainCell) => t.key === "rat")) return null;

  const existingRats: Rat[] = (state.hazards?.rats ?? []) as Rat[];
  const cleared = chain.filter((c: ChainCell) =>
    existingRats.some((r: Rat) => r.row === c.row && r.col === c.col),
  );
  const remaining: Rat[] = existingRats.filter(
    (r: Rat) => !chain.some((c: ChainCell) => c.row === r.row && c.col === r.col),
  );

  const baseReward = (cleared.length || chain.length) * RAT_CLEAR_REWARD_PER;
  // Ratcatcher worker (or any future hazardCoinMultiplier-on-rats worker)
  // scales the coin reward. Default multiplier is 1× when no buff.
  let mult = 1;
  try {
    const eff = computeWorkerEffects(state) as WorkerEffectsView;
    mult = eff.hazardCoinMultiplier?.rats ?? 1;
  } catch { /* aggregator unavailable — fall back to 1× */ }
  const reward = Math.round(baseReward * mult);
  return {
    hazards: { ...state.hazards, rats: remaining },
    coins: (state.coins ?? 0) + reward,
    _ratFloater: `Pest cleared! +${reward}◉`,
  };
}
