/**
 * "Deadly to pests" tag from REFERENCE_CATALOG §7.
 *
 * When a chain contains a tile of one of these species, every rat
 * orthogonally-adjacent to any chain cell is exterminated (with a small
 * coin reward, mirroring tryClearRatChain's per-rat payout).
 *
 * Catalog entries:
 *   tree_cypress
 *   veg_beet
 *   bird_phoenix
 */
import { RAT_CLEAR_REWARD_PER } from "../../constants.js";

const DEADLY_KEYS = new Set(["tree_cypress", "veg_beet", "bird_phoenix"]);

/** Returns true if the given resource key is "deadly to pests". */
export function isDeadlyToPests(key) {
  return DEADLY_KEYS.has(key);
}

/**
 * If `chain` includes any deadly_pests tile, removes every rat that's
 * orthogonally adjacent to a chain cell. Returns a state patch
 * `{ hazards, coins, _deadlyKills }` or null if no kills happen.
 *
 * Pure — does not mutate state.
 *
 * @param {object} state
 * @param {Array<{key:string,row:number,col:number}>} chain
 * @returns {object|null}
 */
export function tryDeadlyPestsKill(state, chain) {
  if (!Array.isArray(chain) || chain.length === 0) return null;
  const hasDeadly = chain.some((t) => DEADLY_KEYS.has(t?.key));
  if (!hasDeadly) return null;

  const rats = state.hazards?.rats ?? [];
  if (rats.length === 0) return null;

  // Build set of chain cells for O(1) lookup
  const chainCells = new Set(chain.map((t) => `${t.row},${t.col}`));
  const isAdj = (r) => {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 0]]) {
      if (chainCells.has(`${r.row + dr},${r.col + dc}`)) return true;
    }
    return false;
  };

  const killed = rats.filter(isAdj);
  if (killed.length === 0) return null;

  const remaining = rats.filter((r) => !isAdj(r));
  const reward = killed.length * RAT_CLEAR_REWARD_PER;

  return {
    hazards: { ...state.hazards, rats: remaining },
    coins: (state.coins ?? 0) + reward,
    _deadlyKills: killed.length,
    _deadlyFloater: `Pest culled! +${reward}◉`,
  };
}
