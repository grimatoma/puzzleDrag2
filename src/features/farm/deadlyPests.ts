/**
 * "Deadly to pests" tag from REFERENCE_CATALOG §7.
 *
 * When a chain contains a tile of one of these species, every rat
 * orthogonally-adjacent to any chain cell is exterminated (with a small
 * coin reward, mirroring tryClearRatChain's per-rat payout).
 *
 * Catalog entries:
 *   tile_tree_cypress
 *   tile_veg_beet
 *   tile_bird_phoenix
 */
import { RAT_CLEAR_REWARD_PER } from "../../constants.js";
import { hasTag } from "../tileCollection/tags.js";
import type { GameState } from "../../types/state.js";

interface Rat { row: number; col: number }

interface DeadlyHostState {
  hazards?: { rats?: Rat[]; [k: string]: unknown };
  coins?: number;
}

interface ChainCell { key?: string | null; row: number; col: number }

export interface DeadlyPestsPatch {
  hazards: { rats: Rat[]; [k: string]: unknown };
  coins: number;
  _deadlyKills: number;
  _deadlyFloater: string;
}

/** Returns true if the given tile key is "deadly to pests". */
export function isDeadlyToPests(key: string | null | undefined): boolean {
  if (!key) return false;
  return hasTag(key, "deadly_pests");
}

/**
 * If `chain` includes any deadly_pests tile, removes every rat that's
 * orthogonally adjacent to a chain cell. Returns a state patch
 * `{ hazards, coins, _deadlyKills }` or null if no kills happen.
 *
 * Pure — does not mutate state.
 */
export function tryDeadlyPestsKill(state: GameState, chain: ChainCell[]): DeadlyPestsPatch | null {
  const s = state as unknown as DeadlyHostState;
  if (!Array.isArray(chain) || chain.length === 0) return null;
  const hasDeadly = chain.some((t: ChainCell) => isDeadlyToPests(t?.key));
  if (!hasDeadly) return null;

  const rats: Rat[] = s.hazards?.rats ?? [];
  if (rats.length === 0) return null;

  // Build set of chain cells for O(1) lookup
  const chainCells = new Set<string>(chain.map((t: ChainCell) => `${t.row},${t.col}`));
  const isAdj = (r: Rat): boolean => {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 0]]) {
      if (chainCells.has(`${r.row + dr},${r.col + dc}`)) return true;
    }
    return false;
  };

  const killed = rats.filter(isAdj);
  if (killed.length === 0) return null;

  const remaining: Rat[] = rats.filter((r: Rat) => !isAdj(r));
  const reward = killed.length * RAT_CLEAR_REWARD_PER;

  return {
    hazards: { ...(s.hazards ?? {}), rats: remaining },
    coins: (s.coins ?? 0) + reward,
    _deadlyKills: killed.length,
    _deadlyFloater: `Pest culled! +${reward}◉`,
  };
}
