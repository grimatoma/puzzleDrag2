/**
 * Phase 9.2 — Mysterious Ore mechanic
 *
 * Once per mine session a single Mysterious Ore tile spawns on the board
 * with a 5-turn countdown. Chain it with ≥ 2 Dirt tiles → +1 Rune.
 * If the countdown expires the tile degrades to plain Dirt.
 */

export const MYSTERIOUS_ORE_TURNS = 5;
export const REQUIRED_DIRT_IN_CHAIN = 2;

/**
 * Spawn a Mysterious Ore tile somewhere on the mine board.
 * No-op if already active or biome is not "mine".
 * @param {object} state - game state
 * @param {() => number} [rng] - random function (0..1)
 * @returns {object} updated state
 */
export function spawnMysteriousOre(state, rng = Math.random) {
  if (state.biome !== "mine") return state;
  if (state.mysteriousOre) return state; // already active — one at a time

  const rows = state.grid.length;
  const cols = state.grid[0].length;

  const blocked = (r, c) => {
    const t = state.grid[r][c];
    return !!(t && (t.rubble || t.gas || t.frozen || t.hidden));
  };

  let r, c, tries = 0;
  do {
    r = Math.floor(rng() * rows);
    c = Math.floor(rng() * cols);
    tries++;
  } while (blocked(r, c) && tries < 32);

  const grid = state.grid.map((row, ri) =>
    row.map((tile, ci) =>
      ri === r && ci === c ? { ...tile, key: "mysterious_ore" } : tile,
    ),
  );

  return {
    ...state,
    grid,
    mysteriousOre: { row: r, col: c, turnsRemaining: MYSTERIOUS_ORE_TURNS },
  };
}

/**
 * Tick the countdown by 1. At 0, degrade the tile to Dirt.
 * @param {object} state
 * @returns {object} updated state
 */
export function tickMysteriousOre(state) {
  if (!state.mysteriousOre) return state;
  const next = state.mysteriousOre.turnsRemaining - 1;
  if (next > 0) {
    return {
      ...state,
      mysteriousOre: { ...state.mysteriousOre, turnsRemaining: next },
    };
  }
  // Expire — degrade tile to plain Dirt
  const { row, col } = state.mysteriousOre;
  const grid = state.grid.map((rowArr, ri) =>
    rowArr.map((t, ci) =>
      ri === row && ci === col ? { ...t, key: "mine_dirt" } : t,
    ),
  );
  return { ...state, grid, mysteriousOre: null };
}

/**
 * Returns true if the chain contains the Mysterious Ore tile AND
 * at least REQUIRED_DIRT_IN_CHAIN dirt tiles.
 * @param {Array<{key:string}>} chain
 * @returns {boolean}
 */
export function isMysteriousChainValid(chain) {
  const hasOre = chain.some((t) => t.key === "mysterious_ore");
  const dirtCnt = chain.filter((t) => t.key === "mine_dirt").length;
  return hasOre && dirtCnt >= REQUIRED_DIRT_IN_CHAIN;
}
