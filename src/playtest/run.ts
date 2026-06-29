// The run loop: drive the REAL reducer through a full farm run, deterministically.
//
// FARM/ENTER → CHAIN_COLLECTED* → CLOSE_SEASON, all through `rootReducer`
// (= rawReducer, pure, no persistence/side-effects — exactly what the unit tests
// use). Every economic number (coins, resource units, turns) comes from reading
// state AFTER the genuine reducer ran; the harness never re-implements the coin
// or income math. The whole run (including createInitialState, which seeds
// saveSeed/marketSeed from Math.random) executes under a seeded Math.random
// override so two runs with the same seed are byte-identical.

import { createInitialState, rootReducer } from "../state.js";
import { FARM_TILE_POOL } from "../constants.js";
import { isSettlementFounded } from "../features/zones/data.js";
import type { GameState } from "../types/state.js";
import type { Action } from "../types/actionPayloads.js";
import { withSeededRandom } from "./prng.js";
import { makeBoard, enumerateChains, applyCollapse } from "./board.js";
import { greedyLongest, type Policy } from "./policy.js";
import { buildChainCollectedPayload } from "./payload.js";

/** Result of a single seeded run. All numbers are diffed from real state. */
export interface RunResult {
  zoneId: string;
  seed: number;
  entered: boolean;
  /** Why entry failed, when `entered` is false. */
  reason?: string;
  turnBudget: number;
  /** Turns actually consumed (reducer's turnsUsed before CLOSE_SEASON). */
  turnsPlayed: number;
  chainsPlayed: number;
  /** Board regenerations triggered by a no-moves stall (mirrors the scene's
   *  free auto-shuffle). High counts hint at a broken board/enumerator. */
  reshuffles: number;
  /** Pure chain coins earned (state.coins delta after entry, before close). */
  coinsEarned: number;
  /** seasonStats.coins captured BEFORE CLOSE_SEASON (which resets it). */
  seasonCoins: number;
  harvests: number;
  upgrades: number;
  /** Whole resource units rolled into inventory this run, keyed by resource. */
  resourceUnits: Record<string, number>;
  /** True when the run ended via CLOSE_SEASON landing back in town. */
  endedViaClose: boolean;
}

export interface SimulateRunOpts {
  zoneId: string;
  seed: number;
  policy?: Policy;
  rows?: number;
  cols?: number;
  /** Safety cap on consecutive no-move board regenerations before bailing. */
  maxReshuffle?: number;
}

/** Loose handle for the few setup fields not on the strict GameState surface. */
type SetupState = GameState & { activeZone?: string; mapCurrent?: string };

/** Deep-copy a plain inventory map (numbers only) for before/after diffing. */
function snapshotInventory(inv: GameState["inventory"]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [zone, items] of Object.entries(inv ?? {})) {
    out[zone] = { ...(items as Record<string, number>) };
  }
  return out;
}

/** Sum (after − before) per resource key across every zone. */
function diffInventory(
  before: Record<string, Record<string, number>>,
  after: GameState["inventory"],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [zone, items] of Object.entries(after ?? {})) {
    for (const [k, v] of Object.entries(items as Record<string, number>)) {
      const delta = (v ?? 0) - (before[zone]?.[k] ?? 0);
      if (delta !== 0) out[k] = (out[k] ?? 0) + delta;
    }
  }
  return out;
}

/**
 * Simulate one full farm run for `zoneId` under `seed`. v1 drives the FARM board
 * (biome "farm", FARM_TILE_POOL). Non-home zones are founded directly on the
 * start state (test-style setup) rather than threading FOUND_SETTLEMENT.
 */
export function simulateRun(opts: SimulateRunOpts): RunResult {
  const { zoneId, seed } = opts;
  const policy = opts.policy ?? greedyLongest;
  const rows = opts.rows ?? 6;
  const cols = opts.cols ?? 6;
  const maxReshuffle = opts.maxReshuffle ?? 64;
  const pool = FARM_TILE_POOL;

  return withSeededRandom(seed, (rng) => {
    const s0 = createInitialState() as SetupState;
    // Target this zone and make it playable. We OWN this start state, so direct
    // mutation here is setup, not a dispatched action.
    s0.activeZone = zoneId;
    s0.mapCurrent = zoneId;
    if (zoneId !== "home" && !isSettlementFounded(s0, zoneId)) {
      s0.settlements = { ...s0.settlements, [zoneId]: { founded: true, tier: 0 } };
    }
    // Plenty of coins so entry cost / any founding never blocks a run — we
    // measure coin DELTAs, so a large starting balance is invisible to metrics.
    s0.coins = 1_000_000;

    let s: GameState = s0;
    s = rootReducer(s, { type: "FARM/ENTER", payload: { selectedTiles: [], useFertilizer: false } });

    if (!s.farmRun) {
      return {
        zoneId, seed, entered: false,
        reason: (s.bubble?.text as string | undefined) ?? "FARM/ENTER produced no farmRun",
        turnBudget: 0, turnsPlayed: 0, chainsPlayed: 0, reshuffles: 0,
        coinsEarned: 0, seasonCoins: 0, harvests: 0, upgrades: 0,
        resourceUnits: {}, endedViaClose: false,
      };
    }

    const turnBudget = s.farmRun.turnBudget ?? 0;
    const coinsAfterEnter = s.coins;
    const invAfterEnter = snapshotInventory(s.inventory);

    let grid = makeBoard(pool, rng, rows, cols);
    let chainsPlayed = 0;
    let reshuffles = 0;

    while (s.farmRun && s.farmRun.turnsRemaining > 0) {
      const chains = enumerateChains(grid);
      if (!chains.length) {
        // No valid move: the real game reshuffles for free. Mirror with a board
        // regen (deterministic via rng). Bail if it never settles.
        if (++reshuffles > maxReshuffle) break;
        grid = makeBoard(pool, rng, rows, cols);
        continue;
      }
      const chain = policy({ chains, state: s, zoneId, grid, rng, turnsRemaining: s.farmRun.turnsRemaining });
      if (!chain) break;
      const payload = buildChainCollectedPayload(chain);
      s = rootReducer(s, { type: "CHAIN_COLLECTED", payload });
      chainsPlayed++;
      grid = applyCollapse(grid, chain.cells, rng, pool);
    }

    // Snapshot metrics BEFORE close — CLOSE_SEASON resets turnsUsed + seasonStats.
    const turnsPlayed = s.turnsUsed ?? 0;
    const coinsEarned = s.coins - coinsAfterEnter;
    const seasonCoins = s.seasonStats?.coins ?? 0;
    const harvests = s.seasonStats?.harvests ?? 0;
    const upgrades = s.seasonStats?.upgrades ?? 0;
    const resourceUnits = diffInventory(invAfterEnter, s.inventory);

    s = rootReducer(s, { type: "CLOSE_SEASON" } as Action);
    const endedViaClose = s.farmRun === null && s.view === "town";

    return {
      zoneId, seed, entered: true,
      turnBudget, turnsPlayed, chainsPlayed, reshuffles,
      coinsEarned, seasonCoins, harvests, upgrades,
      resourceUnits, endedViaClose,
    };
  });
}

export interface ZoneAggregate {
  zoneId: string;
  runs: number;
  entered: number;
  /** Total coins/run (chain coins + one-time quest/achievement rewards). */
  coinsPerRun: Stats;
  /** Pure chain coins/run = Σ floor(len × tileValue) (seasonStats.coins). */
  chainCoinsPerRun: Stats;
  coinsPerTurn: Stats;
  turnsPlayed: Stats;
  chainsPlayed: Stats;
  /** Mean whole resource units produced per run, keyed by resource. */
  resourceYieldMean: Record<string, number>;
}

export interface Stats { mean: number; median: number; min: number; max: number }

function stats(xs: number[]): Stats {
  if (!xs.length) return { mean: 0, median: 0, min: 0, max: 0 };
  const sorted = [...xs].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { mean: sum / sorted.length, median, min: sorted[0], max: sorted[sorted.length - 1] };
}

export interface SimulateZoneOpts {
  zoneId: string;
  seeds: number[];
  policy?: Policy;
  rows?: number;
  cols?: number;
}

/** Run a zone across many seeds and aggregate. Also returns the raw runs. */
export function simulateZone(opts: SimulateZoneOpts): { aggregate: ZoneAggregate; runs: RunResult[] } {
  const runs = opts.seeds.map((seed) =>
    simulateRun({ zoneId: opts.zoneId, seed, policy: opts.policy, rows: opts.rows, cols: opts.cols }),
  );
  const entered = runs.filter((r) => r.entered);
  const resourceTotals: Record<string, number> = {};
  for (const r of entered) {
    for (const [k, v] of Object.entries(r.resourceUnits)) resourceTotals[k] = (resourceTotals[k] ?? 0) + v;
  }
  const resourceYieldMean: Record<string, number> = {};
  if (entered.length) {
    for (const [k, v] of Object.entries(resourceTotals)) resourceYieldMean[k] = v / entered.length;
  }
  const aggregate: ZoneAggregate = {
    zoneId: opts.zoneId,
    runs: runs.length,
    entered: entered.length,
    coinsPerRun: stats(entered.map((r) => r.coinsEarned)),
    chainCoinsPerRun: stats(entered.map((r) => r.seasonCoins)),
    coinsPerTurn: stats(entered.map((r) => (r.turnsPlayed ? r.coinsEarned / r.turnsPlayed : 0))),
    turnsPlayed: stats(entered.map((r) => r.turnsPlayed)),
    chainsPlayed: stats(entered.map((r) => r.chainsPlayed)),
    resourceYieldMean,
  };
  return { aggregate, runs };
}
