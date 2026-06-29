// Orchestrator: run N seeded runs per zone, compute metrics, and assemble the
// human report + cost-matrix change-list. Pure (no fs/argv) so it is importable
// by both the CLI (via Vite SSR) and the Vitest snapshot test.

import { simulateZone, type RunResult, type ZoneAggregate } from "./run.js";
import { POLICIES } from "./policy.js";
import { familyValueSpread, coinBandDiff, type FamilyValueSpread, type CoinBandDiff } from "./metrics.js";
import { buildSpreadChangeList, type ChangeListResult } from "./emitChangeList.js";

export interface PlaytestConfig {
  zones: string[];
  runs: number;
  seed: number;
  policy?: string;
  rows?: number;
  cols?: number;
}

export interface ZoneReport {
  aggregate: ZoneAggregate;
  coinBand: CoinBandDiff;
}

export interface PlaytestReport {
  config: Required<Omit<PlaytestConfig, "rows" | "cols">> & { rows: number; cols: number };
  zones: ZoneReport[];
  runsByZone: Record<string, RunResult[]>;
  spread: FamilyValueSpread;
  changeList: ChangeListResult;
  /** Machine-readable, snapshot-stable metrics summary. */
  metrics: PlaytestMetrics;
  /** Human-readable Markdown report. */
  reportMarkdown: string;
}

export interface PlaytestMetrics {
  config: PlaytestReport["config"];
  zones: Array<{
    zoneId: string;
    runs: number;
    entered: number;
    coinsPerRun: ZoneAggregate["coinsPerRun"];
    chainCoinsPerRun: ZoneAggregate["chainCoinsPerRun"];
    coinsPerTurn: ZoneAggregate["coinsPerTurn"];
    turnsPlayed: ZoneAggregate["turnsPlayed"];
    chainsPlayed: ZoneAggregate["chainsPlayed"];
    resourceYieldMean: Record<string, number>;
    coinBand: CoinBandDiff;
  }>;
  spread: {
    ratio: number;
    median: number;
    min: number;
    max: number;
    flagged: boolean;
    entries: Array<{
      resourceKey: string;
      realizedValuePerTile: number;
      flag: string;
      resourceValue: number;
      tilesPerResource: number;
    }>;
  };
  changeList: { count: number; patch: Record<string, number> };
}

/** Derive `runs` deterministic seeds from a base seed. */
export function seedsFor(seed: number, runs: number): number[] {
  return Array.from({ length: runs }, (_, i) => seed + i);
}

function round(n: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Run the whole harness and return every artifact. No I/O. */
export function runPlaytest(config: PlaytestConfig): PlaytestReport {
  const rows = config.rows ?? 6;
  const cols = config.cols ?? 6;
  const policyName = config.policy ?? "greedy";
  const policy = POLICIES[policyName] ?? POLICIES.greedy;
  const seeds = seedsFor(config.seed, config.runs);

  const zones: ZoneReport[] = [];
  const runsByZone: Record<string, RunResult[]> = {};
  for (const zoneId of config.zones) {
    const { aggregate, runs } = simulateZone({ zoneId, seeds, policy, rows, cols });
    zones.push({ aggregate, coinBand: coinBandDiff(aggregate) });
    runsByZone[zoneId] = runs;
  }

  const spread = familyValueSpread();
  const changeList = buildSpreadChangeList(spread);

  const fullConfig = { zones: config.zones, runs: config.runs, seed: config.seed, policy: policyName, rows, cols };

  const metrics: PlaytestMetrics = {
    config: fullConfig,
    zones: zones.map((z) => ({
      zoneId: z.aggregate.zoneId,
      runs: z.aggregate.runs,
      entered: z.aggregate.entered,
      coinsPerRun: z.aggregate.coinsPerRun,
      chainCoinsPerRun: z.aggregate.chainCoinsPerRun,
      coinsPerTurn: z.aggregate.coinsPerTurn,
      turnsPlayed: z.aggregate.turnsPlayed,
      chainsPlayed: z.aggregate.chainsPlayed,
      resourceYieldMean: z.aggregate.resourceYieldMean,
      coinBand: z.coinBand,
    })),
    spread: {
      ratio: round(spread.ratio),
      median: round(spread.median),
      min: round(spread.min),
      max: round(spread.max),
      flagged: spread.flagged,
      entries: spread.entries.map((e) => ({
        resourceKey: e.resourceKey,
        realizedValuePerTile: round(e.realizedValuePerTile),
        flag: e.flag,
        resourceValue: e.resourceValue,
        tilesPerResource: e.tilesPerResource,
      })),
    },
    changeList: { count: changeList.count, patch: JSON.parse(changeList.json) as Record<string, number> },
  };

  return {
    config: fullConfig,
    zones,
    runsByZone,
    spread,
    changeList,
    metrics,
    reportMarkdown: renderReport(metrics),
  };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Render the human Markdown report from the metrics summary. */
export function renderReport(m: PlaytestMetrics): string {
  const L: string[] = [];
  L.push("# puzzleDrag2 — AI playtest report");
  L.push("");
  L.push(`Policy \`${m.config.policy}\` · ${m.config.runs} run(s)/zone · base seed ${m.config.seed} · board ${m.config.rows}×${m.config.cols}.`);
  L.push("");
  L.push("## Per-zone economy");
  L.push("");
  L.push("| Zone | Entered | Coins/run (mean·med·min·max) | Chain coins/run | Coins/turn | Turns | Chains | Coin band |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const z of m.zones) {
    const cr = z.coinsPerRun, cc = z.chainCoinsPerRun, ct = z.coinsPerTurn, tp = z.turnsPlayed, ch = z.chainsPlayed;
    const band = z.coinBand.target ? `${z.coinBand.target[0]}–${z.coinBand.target[1]} (${z.coinBand.verdict})` : "—";
    L.push(`| ${z.zoneId} | ${z.entered}/${z.runs} | ${fmt(cr.mean)}·${fmt(cr.median)}·${fmt(cr.min)}·${fmt(cr.max)} | ${fmt(cc.mean)} | ${fmt(ct.mean)} | ${fmt(tp.mean)} | ${fmt(ch.mean)} | ${band} |`);
  }
  L.push("");
  L.push("_Coins/run = chain coins + one-time quest/achievement rewards (every run starts from a fresh save). Chain coins/run = Σ floor(len × tileValue) only._");
  L.push("");
  // Resource yields per zone.
  for (const z of m.zones) {
    const keys = Object.keys(z.resourceYieldMean).sort();
    if (!keys.length) continue;
    L.push(`### ${z.zoneId} — mean resource units/run`);
    L.push("");
    L.push(keys.map((k) => `\`${k}\` ${fmt(z.resourceYieldMean[k])}`).join(" · "));
    L.push("");
  }
  L.push("## Family-value spread (audit metric)");
  L.push("");
  L.push(`Realized value-per-tile = \`ITEMS[resource].value / TILES_PER_RESOURCE[tile]\`. ` +
    `Spread ratio **${fmt(m.spread.ratio)}×** (max ${fmt(m.spread.max)} / min ${fmt(m.spread.min)}), median ${fmt(m.spread.median)}. ` +
    (m.spread.flagged ? "**Flagged**: ratio exceeds the outlier factor." : "Within band."));
  L.push("");
  L.push("| Resource | Value | Tiles/unit | Realized/tile | Flag |");
  L.push("|---|---|---|---|---|");
  for (const e of m.spread.entries) {
    L.push(`| ${e.resourceKey} | ${e.resourceValue} | ${e.tilesPerResource} | ${fmt(e.realizedValuePerTile)} | ${e.flag === "normal" ? "" : e.flag} |`);
  }
  L.push("");
  L.push(`## Proposed change-list — ${m.changeList.count} edit(s)`);
  L.push("");
  if (m.changeList.count === 0) {
    L.push("No outliers beyond the band. See `change-list.md` (empty).");
  } else {
    L.push("Compress premium-resource outliers toward the band ceiling. Full document in `change-list.md`; machine patch in `change-list.json`.");
    L.push("");
    L.push("```json");
    L.push(JSON.stringify(m.changeList.patch, null, 2));
    L.push("```");
  }
  L.push("");
  return L.join("\n");
}

export * from "./run.js";
export * from "./metrics.js";
export * from "./emitChangeList.js";
export * from "./board.js";
export * from "./policy.js";
export * from "./macro.js";
export * from "./payload.js";
export * from "./prng.js";
export * from "./campaign.js";
export * from "./progression.js";
