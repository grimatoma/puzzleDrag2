// Fish biome — tide cycle. Tide flips between "high" and "low" every
// TIDE_PERIOD turns spent on the fish board. On flip, the bottom row of
// the grid is replaced: high tide spawns surface fish (sardines, mackerel),
// low tide exposes shellfish + kelp.
//
// State shape (under state.fish):
//   tide:     "high" | "low"   — current tide state
//   tideTurn: number           — turns elapsed under the current tide
//
// The slice reacts to committed board actions: it ticks tideTurn whenever the player is
// on the fish biome, and flips + mutates the bottom row when tideTurn
// crosses TIDE_PERIOD. We do NOT touch turnsUsed — that's coreReducer's
// responsibility — only the tide bookkeeping and grid bottom row.

import { FISH_TILE_POOL, BIOMES } from "../../constants.js";

export const TIDE_PERIOD = 3;

// Resources that surface during each tide. High tide = pelagic fish,
// low tide = shellfish + kelp. fish_oyster is rare and cross-tide.
export const HIGH_TIDE_POOL = ["fish_sardine", "fish_sardine", "fish_mackerel", "fish_mackerel", "fish_kelp"];
export const LOW_TIDE_POOL = ["fish_clam", "fish_clam", "fish_kelp", "fish_kelp", "fish_oyster"];

export const initial = {
  fish: { tide: "high", tideTurn: 0 },
};

function resourceByKey(key) {
  for (const biome of Object.values(BIOMES)) {
    const r = biome.resources.find((x) => x.key === key);
    if (r) return r;
  }
  return null;
}

/**
 * Replace the bottom row of `grid` with tiles drawn from `pool`. Returns
 * a new grid (does not mutate). Tiles that don't exist in `state.grid` are
 * left as-is — this slice doesn't know how to construct tile objects, so
 * we only update the `key` on existing bottom-row cells. The next collapse
 * pass in GameScene will rebuild the visual layer from `state.grid`.
 */
function mutateBottomRow(grid, pool) {
  if (!Array.isArray(grid) || grid.length === 0) return grid;
  const rows = grid.length;
  const bottomIdx = rows - 1;
  const row = grid[bottomIdx];
  if (!Array.isArray(row)) return grid;
  const newRow = row.map((cell) => {
    if (!cell) return cell;
    const pickKey = pool[Math.floor(Math.random() * pool.length)];
    const next = resourceByKey(pickKey);
    if (!next) return cell;
    // Preserve any non-resource fields (selected, frozen, etc.) — we only
    // swap the resource. Cell shape varies between Phaser tiles and pure
    // grid snapshots, so we shallow-clone and overwrite the resource ref.
    return { ...cell, res: next, key: next.key };
  });
  return grid.map((r, i) => (i === bottomIdx ? newRow : r));
}

export function reduce(state, action) {
  if (!state.fish) return state;
  if (action.type !== "END_TURN" && action.type !== "CHAIN_COLLECTED" && action.type !== "FISH/FORCE_TIDE_FLIP") {
    return state;
  }
  // FISH/FORCE_TIDE_FLIP is a debug/test affordance.
  if (action.type === "FISH/FORCE_TIDE_FLIP") {
    const nextTide = state.fish.tide === "high" ? "low" : "high";
    const pool = nextTide === "high" ? HIGH_TIDE_POOL : LOW_TIDE_POOL;
    return {
      ...state,
      fish: { tide: nextTide, tideTurn: 0 },
      grid: mutateBottomRow(state.grid, pool),
    };
  }
  // Only tick + maybe flip when the player is actively on the fish board.
  if (state.biomeKey !== "fish") return state;
  if (state.lastBoardActionConsumedFreeMove) return state;
  if (action.type === "CHAIN_COLLECTED" && (action.payload?.noTurn || action.payload?.gains)) return state;
  // Tide bookkeeping ticks once per committed, turn-consuming board action.
  const nextTideTurn = (state.fish.tideTurn ?? 0) + 1;
  if (nextTideTurn < TIDE_PERIOD) {
    return { ...state, fish: { ...state.fish, tideTurn: nextTideTurn } };
  }
  // Tide flips. Mutate bottom row using the *new* tide's pool.
  const nextTide = state.fish.tide === "high" ? "low" : "high";
  const pool = nextTide === "high" ? HIGH_TIDE_POOL : LOW_TIDE_POOL;
  return {
    ...state,
    fish: { tide: nextTide, tideTurn: 0 },
    grid: mutateBottomRow(state.grid, pool),
    bubble: {
      id: Date.now(),
      npc: "wren",
      text: nextTide === "high" ? "🌊 Tide rises — sardines run." : "🐚 Tide falls — clams surface.",
      ms: 2000,
      priority: 2,
    },
  };
}

// Re-export for tests + UI.
export { FISH_TILE_POOL };
