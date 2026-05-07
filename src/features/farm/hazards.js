/**
 * Phase 10.7 — Farm hazards: Fire
 * Phase 10.8 — Farm hazards: Wolves (tickWolves)
 *
 * Single-active Farm hazard cap: only one of rats / fire / wolves active
 * at a time (rats managed separately via rats.js; fire and wolves here).
 *
 * §6 fire spawn: 4% per fillBoard on Farm biome, cap 3 cells, never co-spawns
 * with rats or wolves (single-active cap).
 * §6 wolves spawn: 6% per fillBoard when egg > 30 OR turkey > 5, cap 2.
 */

import { FIRE_HAZARD_ENABLED } from "../../featureFlags.js";

// ─── Hazard metadata (player-facing) ─────────────────────────────────────────

export const FARM_HAZARD_META = {
  fire: {
    name: "Fire",
    description: "A fire has broken out in the fields, spreading to adjacent tiles each turn and burning resources away.",
    clearInstruction: "Chain any fire tiles to extinguish them and earn a small coin bonus per tile cleared.",
  },
  wolf: {
    name: "Wolves",
    description: "A pack of wolves has crept into the farm and is devouring your bird tiles one by one.",
    clearInstruction: "Use a Rifle (Workshop recipe) to drive them off, or a Hound to scatter them temporarily.",
  },
  rats: {
    name: "Rats",
    description: "Rats have invaded the granary! They eat plant tiles adjacent to them every turn.",
    clearInstruction: "Chain 3 or more rat tiles together to clear them and earn 5 coins per rat removed.",
  },
};

// ─── Fire hazard ──────────────────────────────────────────────────────────────

const FIRE_SPAWN_RATE   = 0.04;
const FIRE_SPREAD_RATE  = 0.50;
const FIRE_MAX_CELLS    = 3;
const WOLF_SPAWN_RATE   = 0.06;
const WOLF_MAX_ACTIVE   = 2;
const WOLF_BIRD_KEYS    = new Set(["bird_egg", "bird_turkey", "bird_clover"]);

/**
 * Roll for a Farm hazard spawn.
 * Returns `{ kind: "fire", cells: [{row, col}] }` or
 *         `{ kind: "wolf", row, col, scared: false }` or null.
 *
 * @param {object} state
 * @param {() => number} [rng]
 * @returns {object|null}
 */
export function rollFarmHazard(state, rng = Math.random) {
  if (state.biome !== "farm") return null;
  if (state.boss) return null;

  // Single-active cap: if any farm hazard is active, no new spawn
  const rats = state.hazards?.rats ?? [];
  const fire = state.hazards?.fire;
  const wolves = state.hazards?.wolves;

  // Fire spawn gate
  if (FIRE_HAZARD_ENABLED && !fire && (rats.length === 0) && !wolves) {
    if ((fire?.cells?.length ?? 0) < FIRE_MAX_CELLS) {
      if (rng() < FIRE_SPAWN_RATE) {
        const grid = state.grid;
        if (grid && grid.length > 0) {
          const row = Math.floor(rng() * grid.length);
          const col = Math.floor(rng() * grid[0].length);
          return { kind: "fire", cells: [{ row, col }] };
        }
        return { kind: "fire", cells: [{ row: 0, col: 0 }] };
      }
    }
  }

  // Wolf spawn gate (independent roll, but still single-active cap)
  if (!wolves && rats.length === 0 && !fire) {
    const inv = state.inventory ?? {};
    const birdRich = (inv.bird_egg ?? 0) > 30 || (inv.bird_turkey ?? 0) > 5;
    if (birdRich) {
      const wolvesCount = (wolves?.list?.length ?? 0);
      if (wolvesCount < WOLF_MAX_ACTIVE && rng() < WOLF_SPAWN_RATE) {
        const grid = state.grid;
        const row = grid ? Math.floor(rng() * grid.length) : 0;
        const col = grid ? Math.floor(rng() * grid[0].length) : 0;
        return { kind: "wolf", row, col, scared: false };
      }
    }
  }

  return null;
}

/**
 * Advance fire state by one turn.
 * Each fire cell rolls 50% to spread to an orthogonal-adjacent free cell.
 *
 * @param {object} state
 * @param {() => number} [rng]
 * @returns {object}
 */
export function tickFire(state, rng = Math.random) {
  if (!state.hazards?.fire) return state;
  const fire = state.hazards.fire;
  const cells = fire.cells ?? [];
  if (cells.length === 0) return state;

  if (!state.grid) return state;
  const grid = state.grid.map((r) => r.map((t) => ({ ...t })));
  const rows = grid.length;
  const cols = grid[0].length;

  const occupied = new Set(cells.map((c) => `${c.row},${c.col}`));
  let newCells = [...cells];

  for (const cell of cells) {
    // Each fire cell: 50% chance to spread to one adjacent free cell
    if (rng() >= FIRE_SPREAD_RATE) continue;

    const candidates = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cell.row + dr;
      const nc = cell.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (occupied.has(`${nr},${nc}`)) continue;
      candidates.push({ row: nr, col: nc });
    }
    if (candidates.length === 0) continue;

    const pick = candidates[Math.floor(rng() * candidates.length)];
    const key = `${pick.row},${pick.col}`;
    occupied.add(key);
    newCells = [...newCells, pick];
    // Destroy resource at the spread position
    grid[pick.row][pick.col] = { ...grid[pick.row][pick.col], key: null, _burned: true };
  }

  return {
    ...state,
    grid,
    hazards: { ...state.hazards, fire: { ...fire, cells: newCells } },
  };
}

/**
 * Advance wolf state by one turn.
 * - Decrement scaredTurnsRemaining; when it hits 0, clear all scared flags.
 * - Non-scared wolves consume one adjacent bird tile.
 *
 * @param {object} state
 * @returns {object}
 */
export function tickWolves(state) {
  if (!state.hazards?.wolves) return state;
  const wolves = state.hazards.wolves;
  const list = wolves.list ?? [];

  // Scared countdown
  let scaredTurns = wolves.scaredTurnsRemaining ?? 0;
  let newList = list;

  if (scaredTurns > 0) {
    scaredTurns -= 1;
    if (scaredTurns === 0) {
      newList = list.map((w) => ({ ...w, scared: false }));
    }
  }

  // Non-scared wolves eat adjacent birds
  const grid = state.grid ? state.grid.map((r) => r.map((t) => ({ ...t }))) : state.grid;
  if (grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    newList = newList.map((wolf) => {
      if (wolf.scared) return wolf;
      const adj = [
        [wolf.row - 1, wolf.col],
        [wolf.row + 1, wolf.col],
        [wolf.row, wolf.col - 1],
        [wolf.row, wolf.col + 1],
      ].filter(([r, c]) =>
        r >= 0 && r < rows && c >= 0 && c < cols &&
        WOLF_BIRD_KEYS.has(grid[r][c].key),
      );
      if (adj.length) {
        const [r, c] = adj[0];
        grid[r][c] = { ...grid[r][c], key: null, _eaten: true };
      }
      return wolf;
    });
  }

  return {
    ...state,
    grid: grid ?? state.grid,
    hazards: {
      ...state.hazards,
      wolves: { ...wolves, list: newList, scaredTurnsRemaining: scaredTurns },
    },
  };
}

/**
 * Attempt to extinguish fire tiles in a chain.
 * Returns a state patch `{ hazards, coinsBonus }` or null if no fire in chain.
 *
 * @param {object} state
 * @param {Array<{key: string, row: number, col: number}>} chain
 * @returns {{ hazards: object, coinsBonus: number } | null}
 */
export function tryExtinguishFire(state, chain) {
  const fireCells = state.hazards?.fire?.cells ?? [];
  if (fireCells.length === 0) return null;

  const fireTiles = chain.filter((t) => t.key === "fire");
  if (fireTiles.length === 0) return null;

  const remaining = fireCells.filter(
    (c) => !fireTiles.some((t) => t.row === c.row && t.col === c.col),
  );

  return {
    hazards: {
      ...state.hazards,
      fire: remaining.length > 0 ? { ...state.hazards.fire, cells: remaining } : null,
    },
    coinsBonus: fireTiles.length * 2,
  };
}
