// Policy-bracket comparison — run the SAME seeds under several agents and show
// the spread side by side.
//
// Sim-derived balance is only trustworthy if it holds across how DIFFERENTLY
// players play. An "agent" pairs a board policy (per-chain choice) with a macro
// policy (build/craft/tier decisions); this harness runs each agent through the
// same campaign and tabulates progression + economy so balance can be judged
// against the whole FLOOR↔CEILING bracket, not one bot. The optimizer (M3)
// consumes exactly this: a change is only acceptable if every agent stays in band.
//
// Pure (no fs/argv): the CLI renders it, the optimizer reads the rows.

import { runCampaign } from "./campaign.js";

/** A play style = a board policy + a between-run macro policy. */
export interface AgentSpec {
  label: string;
  policy?: string; // board policy name (policy.ts POLICIES); default "greedy"
  macro?: string;  // macro policy name (macro.ts MACROS); default "floor"
}

/** Naive end: longest-chain board play, greedy tier-up, never builds/crafts. */
export const FLOOR_AGENT: AgentSpec = { label: "floor", policy: "greedy", macro: "floor" };
/** Near-optimal end: need-aware board play + build→craft→tier macro. */
export const CEILING_AGENT: AgentSpec = { label: "ceiling", policy: "climb", macro: "climb" };

/** The default two-ended bracket. Archetypes can be inserted between later. */
export const DEFAULT_BRACKET: AgentSpec[] = [FLOOR_AGENT, CEILING_AGENT];

export interface ComparisonConfig {
  zoneId: string;
  runs: number;
  seed: number;
  rows?: number;
  cols?: number;
}

export interface ComparisonRow {
  label: string;
  policy: string;
  macro: string;
  finalTier: number;
  runsPlayed: number;
  finalBalance: number;
  netCoinsPerRunMean: number;
  /** 1-based run at which founding-#2 (300c) was reached, or -1. */
  firstMilestoneRun: number;
  /** Short "rung: missing" summary, or null when not stalled. */
  stall: string | null;
}

export interface ComparisonResult {
  config: ComparisonConfig;
  rows: ComparisonRow[];
  reportMarkdown: string;
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Run every agent through the same campaign and tabulate the spread. */
export function runComparison(config: ComparisonConfig, agents: AgentSpec[] = DEFAULT_BRACKET): ComparisonResult {
  const rows: ComparisonRow[] = agents.map((a) => {
    const m = runCampaign({
      zoneId: config.zoneId,
      runs: config.runs,
      seed: config.seed,
      policy: a.policy,
      macro: a.macro,
      rows: config.rows,
      cols: config.cols,
    }).metrics;
    return {
      label: a.label,
      policy: a.policy ?? "greedy",
      macro: a.macro ?? "floor",
      finalTier: m.finalTier,
      runsPlayed: m.runsPlayed,
      finalBalance: m.finalBalance,
      netCoinsPerRunMean: round(m.netCoinsPerRun.mean),
      firstMilestoneRun: m.coinMilestones[0]?.runIndex ?? -1,
      stall: m.tierStall
        ? `${m.tierStall.toName}: ${m.tierStall.missing.map((x) => `${x.key}×${x.need - x.have}`).join(", ")}`
        : null,
    };
  });
  return { config, rows, reportMarkdown: renderComparison(config, rows) };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Render the side-by-side bracket table as Markdown. */
export function renderComparison(config: ComparisonConfig, rows: ComparisonRow[]): string {
  const L: string[] = [];
  L.push(`# puzzleDrag2 — policy bracket (${config.zoneId})`);
  L.push("");
  L.push(`${config.runs} sequential run(s) · seed ${config.seed} · same seed across every agent.`);
  L.push("");
  L.push("| Agent | Policy | Macro | Final tier | Net coins/run | Balance | Founding#2 @run | Stall |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    L.push(
      `| ${r.label} | ${r.policy} | ${r.macro} | ${r.finalTier} | ${fmt(r.netCoinsPerRunMean)} | ` +
        `${fmt(r.finalBalance)} | ${r.firstMilestoneRun < 0 ? "—" : r.firstMilestoneRun} | ${r.stall ?? "—"} |`,
    );
  }
  L.push("");
  const tiers = rows.map((r) => r.finalTier);
  const spread = Math.max(...tiers) - Math.min(...tiers);
  L.push(
    `**Progression spread:** floor reaches tier ${Math.min(...tiers)}, ceiling tier ${Math.max(...tiers)} ` +
      `(Δ${spread}). Balance should keep the FLOOR un-stuck and the CEILING un-trivialised across this band.`,
  );
  L.push("");
  return L.join("\n");
}
