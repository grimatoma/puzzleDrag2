/**
 * Phase 9.3 / 9.5 / 9.6 — Mine hazards
 *
 * Hazards spawn at 5% per fillBoard in Mine biome, never in Farm, never
 * when a boss is active, and never when another hazard is already active.
 *
 * Pool weights (total 100): cave_in 25, gas_vent 40, lava 20, mole 15
 */

import { computeWorkerEffects } from "../workers/aggregate.js";

export const HAZARD_BASE_RATE = 0.05;

export const HAZARDS = [
  {
    id: "cave_in",
    name: "Cave-In",
    description: "A tunnel collapse has buried an entire row in rubble, blocking all tiles in that row.",
    clearInstruction: "Chain 3 or more stone tiles adjacent to the rubble row to clear the debris.",
    weight: 25,
    spawn(grid, rng) {
      const row = Math.floor(rng() * grid.length);
      return { caveIn: { row } };
    },
  },
  {
    id: "gas_vent",
    name: "Gas Vent",
    description: "Poisonous gas seeps through a crack, spreading a noxious cloud over nearby tiles.",
    clearInstruction: "Chain through any tiles in the gas cloud to disperse it before the 3-turn timer expires.",
    weight: 40,
    durationTurns: 3,
    spawn(grid, rng) {
      const row = Math.floor(rng() * (grid.length - 1));
      const col = Math.floor(rng() * (grid[0].length - 1));
      return { gasVent: { row, col, turnsRemaining: 3 } };
    },
  },
  {
    id: "lava",
    name: "Lava Flow",
    description: "A lava seam has cracked open, spreading molten rock that destroys any resource it touches.",
    clearInstruction: "There is no direct counter — lava spreads each turn. Mine all resources away from its path before it reaches them.",
    weight: 20,
    spawn(grid, rng) {
      const row = Math.floor(rng() * grid.length);
      const col = Math.floor(rng() * grid[0].length);
      return { lava: { cells: [{ row, col }], turnsToSpread: 1 } };
    },
  },
  {
    id: "mole",
    name: "Giant Mole",
    description: "A monstrous mole is tunnelling through the mine, consuming adjacent resource tiles as it burrows.",
    clearInstruction: "Wait — the mole moves on a 3-turn cycle and hops to a new position. Clear tiles from its current path to limit damage.",
    weight: 15,
    spawn(grid, rng) {
      const row = Math.floor(rng() * grid.length);
      const col = Math.floor(rng() * grid[0].length);
      return { mole: { row, col, turnsRemaining: 3 } };
    },
  },
];

function hazardsActive(state) {
  const h = state.hazards ?? {};
  return (h.caveIn ? 1 : 0) + (h.gasVent ? 1 : 0) + (h.lava ? 1 : 0) + (h.mole ? 1 : 0);
}

/**
 * Roll for a hazard spawn. Returns a hazard descriptor or null.
 * @param {object} state
 * @param {() => number} [rng]
 * @param {string[]} [allowedHazards]
 * @returns {object|null}
 */
export function rollHazard(state, rng = Math.random, allowedHazards = ["cave_in", "gas_vent", "lava", "mole"]) {
  if (state.biome !== "mine") return null;
  if (state.boss) return null;
  if (hazardsActive(state) > 0) return null;

  // Apply base rate check
  let rate = HAZARD_BASE_RATE;
  if (rng() >= rate) return null;

  // Filter by allowedHazards and pick by weight
  const pool = HAZARDS.filter((h) => allowedHazards.includes(h.id));
  if (pool.length === 0) return null;

  const total = pool.reduce((a, h) => a + h.weight, 0);
  let r = rng() * total;
  let picked = pool[0];
  for (const h of pool) {
    r -= h.weight;
    if (r <= 0) {
      picked = h;
      break;
    }
  }

  // Canary reduces gas_vent spawn probability; Sapper does the same for
  // cave_in. Both go through hazardSpawnReduce in the worker aggregator.
  if (picked.id === "gas_vent" || picked.id === "cave_in") {
    const workerEffects = computeWorkerEffects(state);
    const reduce = workerEffects.hazardSpawnReduce ?? {};
    const r = reduce[picked.id];
    if (r && rng() < r) return null;
  }

  return { id: picked.id, ...picked.spawn(state.grid ?? [], rng) };
}

/**
 * Returns true if a tile is blocked by a hazard (rubble or lava).
 * Gas tiles remain chainable (chaining is the counter).
 * @param {object} tile
 * @returns {boolean}
 */
export function tileBlockedByHazard(tile) {
  return !!(tile && (tile.rubble || tile.lava));
}

/**
 * Advance hazard state by one turn.
 * - Gas vent: tick down; at 0 costs a turn and clears.
 * - Lava: spread to a random orthogonally-adjacent free cell.
 * - Mole: decrement timer; consume an adjacent tile; hop on 0.
 * @param {object} state
 * @param {() => number} [rng]
 * @returns {object}
 */
export function tickHazards(state, rng = Math.random) {
  let next = state;
  next = _tickGasVent(next);
  next = _tickLava(next, rng);
  next = _tickMole(next, rng);
  return next;
}

function _tickGasVent(state) {
  if (!state.hazards?.gasVent) return state;
  const v = state.hazards.gasVent;
  if (v.turnsRemaining > 1) {
    return {
      ...state,
      hazards: {
        ...state.hazards,
        gasVent: { ...v, turnsRemaining: v.turnsRemaining - 1 },
      },
    };
  }
  // Expired: costs 1 turn
  return {
    ...state,
    hazards: { ...state.hazards, gasVent: null },
    turnsUsed: (state.turnsUsed ?? 0) + 1,
    _hazardFloater: "You cough through it.",
  };
}

function _tickLava(state, rng) {
  if (!state.hazards?.lava) return state;
  const lava = state.hazards.lava;

  // If no grid, bail
  if (!state.grid) return state;

  const rows = state.grid.length;
  const cols = state.grid[0].length;
  const cells = lava.cells;

  // Build set of occupied lava cells
  const occupied = new Set(cells.map((c) => `${c.row},${c.col}`));

  // Collect all free orthogonal neighbours of any lava cell
  const candidates = [];
  for (const cell of cells) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cell.row + dr;
      const nc = cell.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const key = `${nr},${nc}`;
      if (!occupied.has(key)) {
        candidates.push({ row: nr, col: nc });
        occupied.add(key); // avoid duplicates in candidates
      }
    }
  }

  if (candidates.length === 0) {
    // No room to spread — stay put
    return state;
  }

  // Pick one candidate
  const pick = candidates[Math.floor(rng() * candidates.length)];
  const newCells = [...cells, pick];

  // Clear the tile at the new lava position (destroy resource)
  const grid = state.grid.map((row, ri) =>
    row.map((t, ci) =>
      ri === pick.row && ci === pick.col ? { ...t, key: "lava" } : t,
    ),
  );

  return {
    ...state,
    grid,
    hazards: {
      ...state.hazards,
      lava: { ...lava, cells: newCells },
    },
  };
}

function _tickMole(state, rng) {
  if (!state.hazards?.mole) return state;
  const mole = state.hazards.mole;

  if (!state.grid) return state;
  const rows = state.grid.length;
  const cols = state.grid[0].length;

  // On timer > 0: decrement and consume one adjacent tile
  if (mole.turnsRemaining > 0) {
    const newTurns = mole.turnsRemaining - 1;

    // Collect non-consumed, non-rubble orthogonal neighbours
    const adj = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = mole.row + dr;
      const nc = mole.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const t = state.grid[nr][nc];
      if (!t.consumed && !t.rubble) adj.push({ row: nr, col: nc });
    }

    let grid = state.grid;
    if (adj.length > 0) {
      const target = adj[Math.floor(rng() * adj.length)];
      grid = state.grid.map((row, ri) =>
        row.map((t, ci) =>
          ri === target.row && ci === target.col ? { ...t, consumed: true } : t,
        ),
      );
    }

    return {
      ...state,
      grid,
      hazards: {
        ...state.hazards,
        mole: { ...mole, turnsRemaining: newTurns },
      },
    };
  }

  // turnsRemaining === 0: hop to a random free adjacent cell
  const freeAdj = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = mole.row + dr;
    const nc = mole.col + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const t = state.grid[nr][nc];
    if (!t.rubble && !t.consumed) freeAdj.push({ row: nr, col: nc });
  }

  let newPos;
  if (freeAdj.length > 0) {
    newPos = freeAdj[Math.floor(rng() * freeAdj.length)];
  } else {
    // Fully boxed — stay put
    newPos = { row: mole.row, col: mole.col };
  }

  return {
    ...state,
    hazards: {
      ...state.hazards,
      mole: { row: newPos.row, col: newPos.col, turnsRemaining: 3 },
    },
  };
}

/**
 * Attempt to clear a cave-in by chaining 3+ stone tiles in an adjacent row.
 * @param {object} state
 * @param {Array<{key:string, row:number, col:number}>} chain
 * @returns {object}
 */
export function clearCaveIn(state, chain) {
  if (!state.hazards?.caveIn) return state;
  const targetRow = state.hazards.caveIn.row;
  const stoneCount = chain.filter((t) => t.key === "mine_stone").length;
  const nearRow = chain.some((t) => Math.abs(t.row - targetRow) === 1);
  if (stoneCount < 3 || !nearRow) return state;
  return { ...state, hazards: { ...state.hazards, caveIn: null } };
}
