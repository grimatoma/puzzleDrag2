// Board policies for the playtest auto-player.
//
// A policy decides which available chain to collect each turn. Until M2 a policy
// saw ONLY the chain list — too blind to represent real play, where the choice of
// what to chain is steered by what the player is saving toward. The interface is
// now STATE-AWARE: a policy receives the live reducer state, the zone, the full
// board, and the run's RNG, so it can reason about goals (e.g. "chase the resource
// the next tier rung still needs") — while staying a pure function of that context.
//
// These board policies are the PER-CHAIN layer (the lowest-leverage decision in
// the game). The high-leverage macro decisions — build order, worker hiring,
// tier-up timing, crafting, zone/biome choice — are modelled separately in the
// campaign's macro-policy layer (M2b). Together they form the floor↔ceiling
// bracket the optimizer (M3) must keep balance acceptable across.

import type { Chain, Grid } from "./board.js";
import { enumerateChains, applyCollapse } from "./board.js";
import { mulberry32 } from "./prng.js";
import type { GameState } from "../types/state.js";
import { producedResource } from "../game/producedResource.js";
import { settlementTier, currentTierDef } from "../features/zones/data.js";
import { zoneInventory } from "../state/zoneInventory.js";
import { inventoryQty } from "../types/inventory.js";

/** Everything a board policy may read when choosing a chain. Read-only. */
export interface PolicyContext {
  /** Valid chains on the current board (size >= 3). Non-empty when a policy is called. */
  chains: Chain[];
  /** Live reducer state mid-run. Treat as read-only. */
  state: GameState;
  /** The zone being played (for tier-cost / inventory lookups). */
  zoneId: string;
  /** The full board, for adjacency / lookahead reasoning. */
  grid: Grid;
  /** The run's seeded RNG, for policies that sample. */
  rng: () => number;
  /** Turns left in this run. */
  turnsRemaining: number;
}

/** A policy picks one chain from `ctx.chains`, or null if none playable. */
export type Policy = (ctx: PolicyContext) => Chain | null;

/** Pick the chain maximising `score`; ties broken by stable board order. */
function bestBy(chains: Chain[], score: (c: Chain) => number): Chain | null {
  if (!chains.length) return null;
  let best = chains[0];
  let bestScore = score(best);
  for (let i = 1; i < chains.length; i++) {
    const s = score(chains[i]);
    if (s > bestScore) {
      best = chains[i];
      bestScore = s;
    }
  }
  return best;
}

/**
 * Greedy: collect the longest available chain. Ties broken by highest tile value,
 * then by stable board order (top-left first) so the choice is fully deterministic
 * for a fixed board. This is the FLOOR policy — naive, no strategic intent.
 */
export const greedyLongest: Policy = ({ chains }) => {
  if (!chains.length) return null;
  let best = chains[0];
  for (let i = 1; i < chains.length; i++) {
    const c = chains[i];
    if (
      c.length > best.length ||
      (c.length === best.length && c.tileValue > best.tileValue)
    ) {
      best = c;
    }
  }
  return best;
};

/**
 * Value-greedy: collect the highest board-tile-value chain (length × tileValue),
 * ties broken toward the longer chain. A distinct play style — a coin-chaser who
 * ignores which RESOURCE a chain yields.
 */
export const greedyValue: Policy = ({ chains }) =>
  bestBy(chains, (c) => c.length * c.tileValue + c.length * 1e-6);

/**
 * Need-aware climb (a ceiling building block): if the next settlement tier rung
 * still needs a resource, prefer chains whose produced resource is one of those
 * shortfalls; otherwise fall back to greedy-longest. This is the first policy that
 * reads STATE to steer chain choice toward a goal — exactly the strategic intent a
 * naive bot lacks.
 */
export const needAwareClimb: Policy = (ctx) => {
  const { chains, state, zoneId } = ctx;
  const next = currentTierDef(zoneId, settlementTier(state, zoneId) + 1);
  const needs = (next?.upgradeCost?.resources ?? {}) as Record<string, number>;
  if (Object.keys(needs).length) {
    const inv = zoneInventory(state, zoneId);
    const short = new Set(
      Object.entries(needs)
        .filter(([k, need]) => inventoryQty(inv, k) < need)
        .map(([k]) => k),
    );
    if (short.size) {
      const helpful = chains.filter((c) => {
        const res = producedResource({ key: c.key });
        return res != null && short.has(res);
      });
      if (helpful.length) return greedyLongest({ ...ctx, chains: helpful });
    }
  }
  return greedyLongest(ctx);
};

// ── Lookahead search (board-level ceiling) ─────────────────────────────────────
// A stronger-than-greedy board policy: for each candidate first move, simulate
// the resulting board and greedily roll it out a few plies, scoring by total
// board-coins (≈ the reducer's floor(len × tileValue) chain-coin formula). Picks
// the move with the best continuation — it can prefer a shorter chain now that
// sets up better chains later. Board-level only: the full reducer-level search
// (which would surface MACRO exploits) needs the deferred state.ts RNG injection.

/** Heuristic board-coin value of a chain (length × tile value). */
function chainValue(c: Chain): number {
  return c.length * c.tileValue;
}

/** Refill pool for speculative lookahead = the keys currently on the board. */
function poolFromGrid(grid: Grid): string[] {
  const keys: string[] = [];
  for (const row of grid) for (const cell of row) if (cell) keys.push(cell.res.key);
  return keys.length ? keys : ["tile_grass_grass"];
}

/** Greedy rollout value of a board over `depth` plies, using a LOCAL rng. */
function rolloutValue(grid: Grid, pool: readonly string[], rng: () => number, depth: number): number {
  let g = grid;
  let total = 0;
  for (let d = 0; d < depth; d++) {
    const chains = enumerateChains(g);
    if (!chains.length) break;
    let best = chains[0];
    for (let i = 1; i < chains.length; i++) if (chainValue(chains[i]) > chainValue(best)) best = chains[i];
    total += chainValue(best);
    g = applyCollapse(g, best.cells, rng, pool);
  }
  return total;
}

/**
 * Search: 1-ply branch over every candidate move + a greedy rollout of the
 * resulting board. Deterministic and side-effect-free — each rollout uses its
 * OWN fixed-seed rng, so the search never consumes the run's rng stream (the
 * real board fills still come from the run's seeded clock).
 */
export const searchPolicy: Policy = ({ chains, grid }) => {
  if (!chains.length) return null;
  const pool = poolFromGrid(grid);
  const DEPTH = 4;
  let best = chains[0];
  let bestScore = -Infinity;
  for (const c of chains) {
    const rng = mulberry32(0x9e3779b9); // fixed seed → reproducible, run-rng-safe
    const after = applyCollapse(grid, c.cells, rng, pool);
    const score = chainValue(c) + rolloutValue(after, pool, rng, DEPTH - 1);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
};

/** Registry of named policies, for CLI `--policy <name>` selection. */
export const POLICIES: Record<string, Policy> = {
  greedy: greedyLongest,
  value: greedyValue,
  climb: needAwareClimb,
  search: searchPolicy,
};
