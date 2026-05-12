/**
 * Phase 10.4 — Rat hazard (pure logic).
 *
 * Spawn condition: Farm biome only, inventory.grass_hay > 50 AND inventory.grain_wheat > 50.
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

const PLANT_KEYS = new Set(["grass_hay", "grain_wheat", "grain", "berry"]);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Roll for a rat spawn on a fillBoard call.
 * Returns `{ row, col, age: 0 }` on success, `null` otherwise.
 *
 * @param {object} state
 * @param {() => number} [rng]
 * @returns {{ row: number, col: number, age: number } | null}
 */
export function rollRatSpawn(state, rng = Math.random) {
  if (!RATS_HAZARD_ENABLED) return null;
  if (state.biome !== "farm") return null;
  const inv = state.inventory ?? {};
  if ((inv.grass_hay ?? 0) <= RAT_SPAWN_THRESHOLDS.grass_hay) return null;
  if ((inv.grain_wheat ?? 0) <= RAT_SPAWN_THRESHOLDS.grain_wheat) return null;
  const rats = state.hazards?.rats ?? [];
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
  let row, col, tries = 0;
  do {
    row = Math.floor(rng() * rows);
    col = Math.floor(rng() * cols);
    const t = grid[row]?.[col];
    if (t && !t.rubble && !t.gas && !t.frozen
        && !rats.some((r) => r.row === row && r.col === col)) {
      break;
    }
  } while (++tries < 32);
  return { row, col, age: 0 };
}

/**
 * Advance all rats by one turn: each eats one adjacent plant tile and ages +1.
 *
 * @param {object} state
 * @returns {object}
 */
export function tickRats(state) {
  if (!state.hazards?.rats?.length) return state;
  const grid = state.grid ? state.grid.map((r) => r.map((t) => ({ ...t }))) : state.grid;
  const rats = state.hazards.rats.map((rat) => {
    if (!grid) return { ...rat, age: rat.age + 1 };
    const rows = grid.length;
    const cols = grid[0].length;
    const adj = [
      [rat.row - 1, rat.col],
      [rat.row + 1, rat.col],
      [rat.row, rat.col - 1],
      [rat.row, rat.col + 1],
    ].filter(([r, c]) => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
      const k = grid[r][c].key;
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
  return { ...state, grid, hazards: { ...state.hazards, rats } };
}

/**
 * Attempt to clear a rat chain from a COMMIT_CHAIN action.
 * Returns a state patch `{ hazards, coins, _ratFloater }` if valid, or null
 * if the chain is invalid (< 3 rats, or mixed tile types).
 *
 * @param {object} state
 * @param {Array<{key: string, row: number, col: number}>} chain
 * @returns {object|null}
 */
export function tryClearRatChain(state, chain) {
  if (chain.length < 3) return null;
  if (!chain.every((t) => t.key === "rat")) return null;

  const existingRats = state.hazards?.rats ?? [];
  const cleared = chain.filter((c) =>
    existingRats.some((r) => r.row === c.row && r.col === c.col),
  );
  const remaining = existingRats.filter(
    (r) => !chain.some((c) => c.row === r.row && c.col === r.col),
  );

  const baseReward = (cleared.length || chain.length) * RAT_CLEAR_REWARD_PER;
  // Ratcatcher worker (or any future hazardCoinMultiplier-on-rats worker)
  // scales the coin reward. Default multiplier is 1× when no buff.
  let mult = 1;
  try {
    mult = computeWorkerEffects(state).hazardCoinMultiplier?.rats ?? 1;
  } catch { /* aggregator unavailable — fall back to 1× */ }
  const reward = Math.round(baseReward * mult);
  return {
    hazards: { ...state.hazards, rats: remaining },
    coins: (state.coins ?? 0) + reward,
    _ratFloater: `Pest cleared! +${reward}◉`,
  };
}
