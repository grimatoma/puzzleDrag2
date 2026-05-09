/**
 * Fish biome — Pearl rune-capture mechanic.
 *
 * Mirror of `features/mine/mysterious_ore.js`. Once per fish session a
 * single Pearl tile spawns on the board with a `PEARL_TURNS`-turn
 * countdown. Chain it with ≥ `REQUIRED_FISH_IN_CHAIN` other fish-category
 * tiles before the timer expires → +1 Rune. If the timer runs out, the
 * tile degrades back into kelp.
 *
 * The pearl tile shares the existing `fish_pearl` resource entry used
 * by the oyster icon (no separate sprite — fish_pearl is a special
 * non-spawnable resource used only when conditionally seeded here).
 */

export const PEARL_TURNS = 5;
export const REQUIRED_FISH_IN_CHAIN = 2;
export const PEARL_KEY = "fish_pearl";

/** Resource keys that count as "fish" for the rune-capture chain rule. */
const FISH_CATEGORY_KEYS = new Set([
  "fish_sardine",
  "fish_mackerel",
  "fish_clam",
  "fish_oyster",
  "fish_kelp",
  "fish_raw",
]);

/**
 * Spawn a Pearl tile somewhere on the fish board.
 * No-op if a pearl is already active or the player isn't on the fish biome.
 */
export function spawnPearl(state, rng = Math.random) {
  if (state.biome !== "fish") return state;
  if (state.fishPearl) return state;
  if (!Array.isArray(state.grid) || state.grid.length === 0) return state;

  const rows = state.grid.length;
  const cols = state.grid[0]?.length ?? 0;
  if (cols === 0) return state;

  const blocked = (r, c) => {
    const t = state.grid[r]?.[c];
    return !t || t.frozen || t.rubble || t.hidden;
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

  const grid = state.grid.map((row, ri) =>
    row.map((tile, ci) =>
      ri === r && ci === c ? { ...tile, key: PEARL_KEY } : tile,
    ),
  );

  return {
    ...state,
    grid,
    fishPearl: { row: r, col: c, turnsRemaining: PEARL_TURNS },
  };
}

/**
 * Tick the pearl countdown by 1. At 0, degrade the tile back to kelp
 * and clear the pearl slot.
 */
export function tickPearl(state) {
  if (!state.fishPearl) return state;
  const next = state.fishPearl.turnsRemaining - 1;
  if (next > 0) {
    return {
      ...state,
      fishPearl: { ...state.fishPearl, turnsRemaining: next },
    };
  }
  // Expire — degrade tile to kelp.
  const { row, col } = state.fishPearl;
  const grid = Array.isArray(state.grid)
    ? state.grid.map((rowArr, ri) =>
        rowArr.map((t, ci) =>
          ri === row && ci === col ? { ...t, key: "fish_kelp" } : t,
        ),
      )
    : state.grid;
  return { ...state, grid, fishPearl: null };
}

/**
 * True iff the chain contains the pearl tile AND at least
 * REQUIRED_FISH_IN_CHAIN other fish-category tiles.
 */
export function isPearlChainValid(chain) {
  if (!Array.isArray(chain) || chain.length === 0) return false;
  const hasPearl = chain.some((t) => t.key === PEARL_KEY);
  if (!hasPearl) return false;
  const fishCount = chain.filter((t) => FISH_CATEGORY_KEYS.has(t.key)).length;
  return fishCount >= REQUIRED_FISH_IN_CHAIN;
}
