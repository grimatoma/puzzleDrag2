// The campaign loop: progression PACING, not per-run economy.
//
// `simulateRun` (run.ts) measures one fresh run in isolation — it sets coins to
// 1,000,000 and reads DELTAS, so affordability never matters. The campaign does
// the opposite: it keeps ONE persistent reducer state and plays many runs in
// sequence, carrying real coins + inventory forward, so we can answer "how many
// runs does it take to afford the next thing?" — the time-to-content question
// the per-run harness can't.
//
// Everything still goes through the REAL reducer: FARM/ENTER → CHAIN_COLLECTED* →
// CLOSE_SEASON each run (so the season-end coin bonus and entry cost are real),
// then a spend step that dispatches the real TIER_UP action when the next rung is
// affordable. The whole campaign runs inside ONE seeded Math.random override so a
// given seed is byte-reproducible.
//
// v1 scope (documented, not hidden):
//   • Drives the FARM board only (FARM/ENTER), so the zone must have a farm board
//     (home / meadow / orchard). Mine/fish campaigns are a future extension.
//   • Does NOT simulate crafting, building, keepers, or multiple zones. The home
//     tier ladder is gated on crafted (`bread`) and cross-zone (`block`, `coke`,
//     `silver_bar`) resources a farm-only campaign cannot earn, so it legitimately
//     STALLS before tier 1 — and the report surfaces that stall (with the missing
//     inputs classified by source) as a finding, rather than faking progress.
//   • The clean, fully-real signal here is the COIN economy: runs-to-afford each
//     settlement-founding price (the coin curve), plus per-run net-coin stats.

import { createInitialState, rootReducer } from "../state.js";
import { FARM_TILE_POOL, RECIPES, getItem } from "../constants.js";
import { producedResource } from "../game/producedResource.js";
import { inventoryQty } from "../types/inventory.js";
import { zoneInventory } from "../state/zoneInventory.js";
import {
  isSettlementFounded,
  settlementTier,
  maxTier,
  currentTierDef,
  SETTLEMENT_FOUNDING_GROWTH,
  zoneHasBoard,
} from "../features/zones/data.js";
import { progressionTarget } from "./targets.js";
import type { GameState } from "../types/state.js";
import type { Action } from "../types/actionPayloads.js";
import { withSeededRandom } from "./prng.js";
import { makeBoard, enumerateChains, applyCollapse, type Grid } from "./board.js";
import { greedyLongest, POLICIES, type Policy } from "./policy.js";
import { buildChainCollectedPayload } from "./payload.js";

export interface CampaignConfig {
  zoneId: string;
  /** Maximum sequential runs to simulate. */
  runs: number;
  seed: number;
  policy?: string;
  rows?: number;
  cols?: number;
  /** Coin balances to measure runs-to-afford. Default: the founding ladder. */
  coinMilestones?: Array<{ label: string; coins: number }>;
  maxReshuffle?: number;
}

/** One run's contribution to the campaign, all read from real state. */
export interface RunRecord {
  runIndex: number;
  /** Pure chain coins this run (seasonStats.coins before CLOSE_SEASON). */
  chainCoins: number;
  /** Bankroll change across the whole run (entry − , chain + , season bonus +). */
  netCoins: number;
  /** Coin balance after the run AND the spend step. */
  balanceAfter: number;
  turnsPlayed: number;
  /** Settlement tier after this run's spend step. */
  tierAfter: number;
}

export interface Milestone {
  kind: "coin" | "tier";
  label: string;
  /** 1-based run at which it was reached, or -1 if never within `runs`. */
  runIndex: number;
  /** Cumulative turns spent to get there (−1 if never). */
  turns: number;
  /** Target band from PROGRESSION_TARGETS, when one exists. */
  target?: [number, number];
  /** "below" (faster than band) | "within" | "above" (slower) | "unreached" | "no-target". */
  verdict: "below" | "within" | "above" | "unreached" | "no-target";
}

export type ResourceSource = "farm" | "crafted" | "other-zone" | "coins";

export interface StallInput {
  key: string;
  label: string;
  need: number;
  have: number;
  source: ResourceSource;
}

/** Why progression stopped: the first tier rung the campaign could not afford. */
export interface TierStall {
  fromTier: number;
  toTier: number;
  toName: string;
  missing: StallInput[];
}

export interface CampaignStats {
  mean: number;
  median: number;
  /** Population standard deviation (reliability of a per-run figure). */
  stdev: number;
  min: number;
  max: number;
}

export interface CampaignMetrics {
  config: Required<Omit<CampaignConfig, "maxReshuffle">> & { maxReshuffle: number };
  zoneId: string;
  runsPlayed: number;
  startCoins: number;
  finalBalance: number;
  finalTier: number;
  /** True when the campaign ended early because it could not afford entry. */
  stalledOnEntry: boolean;
  netCoinsPerRun: CampaignStats;
  chainCoinsPerRun: CampaignStats;
  /**
   * Pearson correlation between run index and net coins/run. ≈0 = a flat economy
   * (each run earns the same); >0 = a snowball (later runs earn more); <0 = decay.
   * The research's CORREL snowball test, adapted to a single-player campaign.
   */
  incomeTrendCorrelation: number;
  coinMilestones: Milestone[];
  tierMilestones: Milestone[];
  tierStall: TierStall | null;
  resourceYieldMeanPerRun: Record<string, number>;
  /** Per-run records (deterministic; pinned by the snapshot test). */
  runs: RunRecord[];
}

export interface CampaignReport {
  metrics: CampaignMetrics;
  reportMarkdown: string;
}

function round(n: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function statsOf(xs: number[]): CampaignStats {
  if (!xs.length) return { mean: 0, median: 0, stdev: 0, min: 0, max: 0 };
  const sorted = [...xs].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const mid = Math.floor(n / 2);
  const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return { mean, median, stdev: Math.sqrt(variance), min: sorted[0], max: sorted[n - 1] };
}

/** Pearson r between two equal-length series; 0 when undefined (n<2 or no variance). */
function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

// Founding switched to a resource basket in Phase 2, but the COIN-accumulation
// curve is still the cleanest fully-real progression signal — so the harness
// keeps measuring runs-to-bank this geometric set of coin balances (the same
// numbers that used to be the founding prices).
const FOUNDING_COIN_CURVE_BASE = 300;

/** First `count` coin checkpoints: round(base · growth^(k-1)). */
function foundingCoinLadder(count: number): Array<{ label: string; coins: number }> {
  const out: Array<{ label: string; coins: number }> = [];
  for (let k = 1; k <= count; k++) {
    const coins = Math.round(FOUNDING_COIN_CURVE_BASE * Math.pow(SETTLEMENT_FOUNDING_GROWTH, k - 1));
    out.push({ label: `found settlement #${k + 1} (${coins}c)`, coins });
  }
  return out;
}

/** Resources the farm board can actually produce (for stall-source classification). */
const FARM_PRODUCIBLE: ReadonlySet<string> = new Set(
  FARM_TILE_POOL.map((k) => producedResource({ key: k })).filter((r): r is string => !!r),
);

const RECIPE_OUTPUTS: ReadonlySet<string> = new Set(
  Object.values(RECIPES as Record<string, { item?: string }>)
    .map((r) => r.item)
    .filter((i): i is string => !!i),
);

/** Where a missing tier-cost resource would have to come from. */
function classifyResource(key: string): ResourceSource {
  if (FARM_PRODUCIBLE.has(key)) return "farm";
  if (RECIPE_OUTPUTS.has(key)) return "crafted";
  return "other-zone";
}

type SetupState = GameState & { activeZone?: string; mapCurrent?: string };

/**
 * Play one farm run on the persistent state and return it advanced through
 * CLOSE_SEASON, plus the run's chain coins and turns. Mutates nothing outside the
 * returned state (the reducer is pure).
 */
function playOneRun(
  state: GameState,
  zoneId: string,
  rng: () => number,
  pool: readonly string[],
  policy: Policy,
  rows: number,
  cols: number,
  maxReshuffle: number,
): { state: GameState; entered: boolean; chainCoins: number; turnsPlayed: number } {
  let s = rootReducer(state, {
    type: "FARM/ENTER",
    payload: { selectedTiles: [], useFertilizer: false },
  });
  if (!s.farmRun) return { state, entered: false, chainCoins: 0, turnsPlayed: 0 };

  let grid: Grid = makeBoard(pool, rng, rows, cols);
  let reshuffles = 0;
  while (s.farmRun && s.farmRun.turnsRemaining > 0) {
    const chains = enumerateChains(grid);
    if (!chains.length) {
      if (++reshuffles > maxReshuffle) break;
      grid = makeBoard(pool, rng, rows, cols);
      continue;
    }
    const chain = policy({ chains, state: s, zoneId, grid, rng, turnsRemaining: s.farmRun.turnsRemaining });
    if (!chain) break;
    s = rootReducer(s, { type: "CHAIN_COLLECTED", payload: buildChainCollectedPayload(chain) });
    grid = applyCollapse(grid, chain.cells, rng, pool);
  }

  const chainCoins = s.seasonStats?.coins ?? 0;
  const turnsPlayed = s.turnsUsed ?? 0;
  s = rootReducer(s, { type: "CLOSE_SEASON" } as Action);
  return { state: s, entered: true, chainCoins, turnsPlayed };
}

/** Spend step: tier up the zone as many rungs as the bankroll + inventory allow. */
function applySpendPolicy(state: GameState, zoneId: string): { state: GameState; tiersGained: number } {
  let s = state;
  let gained = 0;
  while (settlementTier(s, zoneId) < maxTier(zoneId)) {
    const before = settlementTier(s, zoneId);
    s = rootReducer(s, { type: "TIER_UP", payload: { zoneId } } as Action);
    if (settlementTier(s, zoneId) === before) break; // unaffordable → done
    gained++;
  }
  return { state: s, tiersGained: gained };
}

function flatZoneInv(state: GameState, zoneId: string): Record<string, number> {
  return { ...((state.inventory?.[zoneId] as Record<string, number> | undefined) ?? {}) };
}

/** Run the whole campaign and return every artifact. No I/O. */
export function runCampaign(config: CampaignConfig): CampaignReport {
  const zoneId = config.zoneId;
  const rows = config.rows ?? 6;
  const cols = config.cols ?? 6;
  const policyName = config.policy ?? "greedy";
  const policy = POLICIES[policyName] ?? greedyLongest;
  const maxReshuffle = config.maxReshuffle ?? 64;
  const coinMilestones = config.coinMilestones ?? foundingCoinLadder(4);

  const result = withSeededRandom(config.seed, (rng) => {
    const s0 = createInitialState() as SetupState;
    s0.activeZone = zoneId;
    s0.mapCurrent = zoneId;
    // Non-home farm zones aren't founded by default; found directly so entry is
    // allowed (setup on a state we own, not a dispatched action). Home is always
    // founded. We deliberately do NOT inflate coins — affordability is the point.
    if (zoneId !== "home" && !isSettlementFounded(s0, zoneId)) {
      s0.settlements = { ...s0.settlements, [zoneId]: { founded: true, tier: 0 } };
    }

    let s: GameState = s0;
    const startCoins = s.coins ?? 0;
    const runs: RunRecord[] = [];
    const balances: number[] = [startCoins];
    const chainCoinsArr: number[] = [];
    const netCoinsArr: number[] = [];
    const resourceTotals: Record<string, number> = {};
    let cumulativeTurns = 0;
    let stalledOnEntry = false;
    // runIndex (1-based) → cumulative turns, for milestone turn lookups.
    const turnsAtRun: number[] = [];

    const hasFarm = zoneHasBoard(zoneId, "farm");
    if (hasFarm) {
      for (let i = 1; i <= config.runs; i++) {
        const balBefore = s.coins ?? 0;
        const invBefore = flatZoneInv(s, zoneId);
        const run = playOneRun(s, zoneId, rng, FARM_TILE_POOL, policy, rows, cols, maxReshuffle);
        if (!run.entered) { stalledOnEntry = true; break; }
        s = run.state;

        // Resource yield this run (post-close, pre-spend), for the yield mean.
        const invAfter = flatZoneInv(s, zoneId);
        for (const [k, v] of Object.entries(invAfter)) {
          const delta = v - (invBefore[k] ?? 0);
          if (delta > 0) resourceTotals[k] = (resourceTotals[k] ?? 0) + delta;
        }

        const spend = applySpendPolicy(s, zoneId);
        s = spend.state;

        const balanceAfter = s.coins ?? 0;
        cumulativeTurns += run.turnsPlayed;
        balances.push(balanceAfter);
        chainCoinsArr.push(run.chainCoins);
        netCoinsArr.push(balanceAfter - balBefore);
        turnsAtRun.push(cumulativeTurns);
        runs.push({
          runIndex: i,
          chainCoins: run.chainCoins,
          netCoins: balanceAfter - balBefore,
          balanceAfter,
          turnsPlayed: run.turnsPlayed,
          tierAfter: settlementTier(s, zoneId),
        });
      }
    }

    return {
      s, startCoins, runs, balances, chainCoinsArr, netCoinsArr,
      resourceTotals, turnsAtRun, stalledOnEntry, hasFarm,
    };
  });

  const { s, startCoins, runs, chainCoinsArr, netCoinsArr, resourceTotals, turnsAtRun, stalledOnEntry, hasFarm } = result;
  const tgt = progressionTarget(zoneId);

  // Coin milestones: first run whose post-spend balance reaches the threshold.
  const coinMs: Milestone[] = coinMilestones.map((m) => {
    const idx = runs.findIndex((r) => r.balanceAfter >= m.coins);
    const band = tgt?.coinMilestones?.find((c) => c.coins === m.coins)?.runs;
    const runIndex = idx >= 0 ? runs[idx].runIndex : -1;
    return {
      kind: "coin" as const,
      label: m.label,
      runIndex,
      turns: idx >= 0 ? turnsAtRun[idx] : -1,
      target: band,
      verdict: verdictFor(runIndex, band),
    };
  });

  // Tier milestones: the run at which each rung was first reached.
  const tierMs: Milestone[] = [];
  for (let tier = 1; tier <= maxTier(zoneId); tier++) {
    const idx = runs.findIndex((r) => r.tierAfter >= tier);
    const def = currentTierDef(zoneId, tier);
    const band = tgt?.tierRuns?.find((t) => t.tier === tier)?.runs;
    const runIndex = idx >= 0 ? runs[idx].runIndex : -1;
    tierMs.push({
      kind: "tier",
      label: def?.name ?? `tier ${tier}`,
      runIndex,
      turns: idx >= 0 ? turnsAtRun[idx] : -1,
      target: band,
      verdict: verdictFor(runIndex, band),
    });
  }

  const finalTier = settlementTier(s, zoneId);
  const tierStall = computeTierStall(s, zoneId, finalTier);

  const resourceYieldMeanPerRun: Record<string, number> = {};
  const enteredRuns = runs.length || 1;
  for (const [k, v] of Object.entries(resourceTotals)) {
    resourceYieldMeanPerRun[k] = round(v / enteredRuns);
  }

  const metrics: CampaignMetrics = {
    config: { zoneId, runs: config.runs, seed: config.seed, policy: config.policy ?? "greedy", rows: config.rows ?? 6, cols: config.cols ?? 6, coinMilestones, maxReshuffle: config.maxReshuffle ?? 64 },
    zoneId,
    runsPlayed: runs.length,
    startCoins,
    finalBalance: s.coins ?? 0,
    finalTier,
    stalledOnEntry: stalledOnEntry || !hasFarm,
    netCoinsPerRun: roundStats(statsOf(netCoinsArr)),
    chainCoinsPerRun: roundStats(statsOf(chainCoinsArr)),
    incomeTrendCorrelation: round(pearson(runs.map((r) => r.runIndex), netCoinsArr)),
    coinMilestones: coinMs,
    tierMilestones: tierMs,
    tierStall,
    resourceYieldMeanPerRun,
    runs: runs.map((r) => ({ ...r, chainCoins: round(r.chainCoins), netCoins: round(r.netCoins), balanceAfter: round(r.balanceAfter) })),
  };

  return { metrics, reportMarkdown: renderCampaignReport(metrics, hasFarm) };
}

function verdictFor(runIndex: number, band?: [number, number]): Milestone["verdict"] {
  if (!band) return runIndex < 0 ? "unreached" : "no-target";
  if (runIndex < 0) return "unreached";
  if (runIndex < band[0]) return "below";
  if (runIndex > band[1]) return "above";
  return "within";
}

function roundStats(s: CampaignStats): CampaignStats {
  return { mean: round(s.mean), median: round(s.median), stdev: round(s.stdev), min: round(s.min), max: round(s.max) };
}

/** The first rung the campaign can't afford, with the missing inputs classified. */
function computeTierStall(state: GameState, zoneId: string, tier: number): TierStall | null {
  if (tier >= maxTier(zoneId)) return null;
  const next = currentTierDef(zoneId, tier + 1);
  if (!next) return null;
  const cost = next.upgradeCost ?? {};
  const coinCost = cost.coins ?? 0;
  const resCost = cost.resources ?? {};
  const inv = zoneInventory(state, zoneId);
  const missing: StallInput[] = [];
  if ((state.coins ?? 0) < coinCost) {
    missing.push({ key: "coins", label: "Coins", need: coinCost, have: state.coins ?? 0, source: "coins" });
  }
  for (const [key, need] of Object.entries(resCost)) {
    const have = inventoryQty(inv, key);
    if (have < need) {
      const def = getItem(key) as { label?: string } | undefined;
      missing.push({ key, label: def?.label ?? key, need, have, source: classifyResource(key) });
    }
  }
  if (!missing.length) return null;
  return { fromTier: tier, toTier: tier + 1, toName: next.name, missing };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Render the human Markdown campaign report from the metrics. */
export function renderCampaignReport(m: CampaignMetrics, hasFarm = true): string {
  const L: string[] = [];
  L.push(`# puzzleDrag2 — campaign pacing report (${m.zoneId})`);
  L.push("");
  L.push(`Policy \`${m.config.policy}\` · up to ${m.config.runs} sequential run(s) · seed ${m.config.seed} · board ${m.config.rows}×${m.config.cols}.`);
  L.push("");
  if (!hasFarm) {
    L.push(`> **${m.zoneId} has no farm board** — the v1 campaign only drives farm boards. No runs simulated.`);
    L.push("");
    return L.join("\n");
  }
  L.push(`Start coins **${m.startCoins}** → after ${m.runsPlayed} run(s) **${fmt(m.finalBalance)}** · settlement tier **${m.finalTier}**${m.stalledOnEntry ? " · ⚠ stalled (could not afford entry)" : ""}.`);
  L.push("");

  L.push("## Per-run economy");
  L.push("");
  const nc = m.netCoinsPerRun, cc = m.chainCoinsPerRun;
  L.push(`- Net coins/run: mean **${fmt(nc.mean)}**, median ${fmt(nc.median)}, stdev ${fmt(nc.stdev)} (min ${fmt(nc.min)}, max ${fmt(nc.max)})`);
  L.push(`- Chain coins/run: mean ${fmt(cc.mean)}, median ${fmt(cc.median)}, stdev ${fmt(cc.stdev)}`);
  L.push(`- Income trend correlation (run index × net coins): **${fmt(m.incomeTrendCorrelation)}** ${snowballNote(m.incomeTrendCorrelation)}`);
  L.push("");

  L.push("## Coin pacing — runs to afford");
  L.push("");
  L.push("| Milestone | Reached at run | Turns | Target band | Verdict |");
  L.push("|---|---|---|---|---|");
  for (const ms of m.coinMilestones) {
    const at = ms.runIndex < 0 ? "—" : `${ms.runIndex}`;
    const turns = ms.turns < 0 ? "—" : `${ms.turns}`;
    const band = ms.target ? `${ms.target[0]}–${ms.target[1]}` : "—";
    L.push(`| ${ms.label} | ${at} | ${turns} | ${band} | ${ms.verdict} |`);
  }
  L.push("");

  L.push("## Tier progression");
  L.push("");
  if (m.tierMilestones.every((t) => t.runIndex < 0)) {
    L.push(`No tier rungs reached in ${m.runsPlayed} run(s).`);
  } else {
    L.push("| Tier | Reached at run | Turns | Verdict |");
    L.push("|---|---|---|---|");
    for (const t of m.tierMilestones) {
      L.push(`| ${t.label} | ${t.runIndex < 0 ? "—" : t.runIndex} | ${t.turns < 0 ? "—" : t.turns} | ${t.verdict} |`);
    }
  }
  L.push("");

  if (m.tierStall) {
    const st = m.tierStall;
    L.push(`### Progression stall → **${st.toName}** (tier ${st.fromTier}→${st.toTier})`);
    L.push("");
    L.push("The campaign cannot climb past this rung. Missing inputs:");
    L.push("");
    L.push("| Input | Need | Have | Source |");
    L.push("|---|---|---|---|");
    for (const mi of st.missing) {
      L.push(`| ${mi.label} | ${mi.need} | ${mi.have} | ${sourceNote(mi.source)} |`);
    }
    L.push("");
    const offFarm = st.missing.filter((x) => x.source !== "farm");
    if (offFarm.length) {
      L.push(`**Finding:** this rung is gated on ${offFarm.map((x) => `\`${x.key}\` (${x.source})`).join(", ")} — not earnable from the ${m.zoneId} farm board. ` +
        `A farm-only player is hard-blocked here; progression requires crafting and/or another zone. Confirm that gate is intended.`);
      L.push("");
    }
  }

  const yields = Object.entries(m.resourceYieldMeanPerRun).sort(([a], [b]) => a.localeCompare(b));
  if (yields.length) {
    L.push("## Mean resource units/run");
    L.push("");
    L.push(yields.map(([k, v]) => `\`${k}\` ${fmt(v)}`).join(" · "));
    L.push("");
  }
  return L.join("\n");
}

function snowballNote(r: number): string {
  if (r > 0.5) return "(strong upward — later runs earn more)";
  if (r > 0.2) return "(mild upward)";
  if (r < -0.2) return "(downward — income decays)";
  return "(flat — each run earns about the same)";
}

function sourceNote(s: ResourceSource): string {
  switch (s) {
    case "farm": return "farm board ✓";
    case "crafted": return "crafted (recipe)";
    case "other-zone": return "another zone";
    case "coins": return "coins";
  }
}
