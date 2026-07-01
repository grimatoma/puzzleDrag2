#!/usr/bin/env node
/**
 * AI playtest & auto-balance harness — CLI entry.
 *
 * Drives the REAL game reducer (no Phaser/canvas/DOM) over N seeded runs per
 * zone and writes a balance report + a cost-matrix-compatible change-list.
 *
 * Usage:
 *   node tools/playtest/cli.mjs --zones home --runs 10 --seed 1 --out reference/docs/playtest
 *   npm run playtest -- --zones home,meadow --runs 20 --seed 1234
 *
 * Flags: --zones <csv>  --runs <n>  --seed <n>  --policy <name>
 *        --rows <n>  --cols <n>  --out <dir>  --no-write  --campaign  --progression
 *        --apply [--apply-from <path>] [--format] [--no-snapshot] [--accept-snapshot]
 *
 * --no-write is a DRY RUN: the CLI still loads/simulates/reports/applies in memory
 * but writes NOTHING to disk (no report splicing, no baseline promotion, no
 * snapshot regen, no constants edit). It logs what it WOULD have written. CI runs
 * `node tools/playtest/cli.mjs --no-write` as an end-to-end smoke of the plumbing.
 *
 * --apply CLOSES the balance loop: it writes a proposed change-list.json (from a
 * prior run, default <out>/change-list.json) BACK into src/constants.ts via the
 * codemod in src/playtest/applyPatch.ts. It then runs the harness drift-guard
 * test in CHECK mode (`vitest run`) — a moved snapshot FAILS LOUDLY so a human
 * reviews the balance change. Pass --accept-snapshot to instead REGENERATE the
 * snapshot (`vitest run -u`), accepting the fixed-seed metric movement as the
 * reviewable record. No hand-editing of constants.
 *
 * --campaign switches to the sequential progression sim (src/playtest/campaign.ts):
 * one persistent state, runs carried forward, measuring runs-to-coin-milestone +
 * tier pacing for the FIRST zone in --zones. Writes campaign-report.md /
 * campaign-metrics.json instead of the per-run report.
 *
 * --progression switches to the CODE-DERIVED spine (src/playtest/progression.ts):
 * no runs played — it derives fresh-save reachability + the per-zone siloed
 * progression oracle + softlock detection straight from MAP_NODES/BUILDINGS/RECIPES.
 * Writes progression.json + progression-report.md AND, when the dashboard exists,
 * refreshes the code-derived data block inlined between the SPINE markers in
 * reference/docs/balance/progression-timeline.html (so the doc cannot drift).
 *
 * The harness logic lives in importable TS under src/playtest/. This file is
 * thin glue: it loads that TS through Vite's SSR pipeline (the same compiler the
 * app build uses — so enums, .js→.ts specifiers, everything resolves exactly as
 * shipped) and does the argv + filesystem work.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileP = promisify(execFile);
// The same plugin vite.config.js / vitest.config.js register — provides the
// `virtual:seasonal-subjects` module that the texture registry imports.
import { seasonalSubjects } from "../vite/seasonalSubjects.mjs";

// Minimal localStorage shim so state/persistence.ts loads cleanly in Node
// (loadSavedState returns null → fresh state). Mirrors src/__tests__/setup.ts.
const _store = {};
globalThis.localStorage = {
  getItem: (k) => (k in _store ? _store[k] : null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { for (const k of Object.keys(_store)) delete _store[k]; },
  key: (i) => Object.keys(_store)[i] ?? null,
  get length() { return Object.keys(_store).length; },
};

function parseArgs(argv) {
  const out = { zones: ["home"], runs: 10, seed: 1, policy: "greedy", macro: "floor", rows: 6, cols: 6, outDir: "reference/docs/playtest", write: true, campaign: false, progression: false, compare: false, optimize: false, accept: false, apply: false, applyFrom: null, format: false, snapshot: true, acceptSnapshot: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => argv[++i];
    switch (a) {
      case "--zones": out.zones = val().split(",").map((z) => z.trim()).filter(Boolean); break;
      case "--runs": out.runs = Math.max(1, parseInt(val(), 10) || 1); break;
      case "--seed": out.seed = parseInt(val(), 10) || 0; break;
      case "--policy": out.policy = val(); break;
      case "--macro": out.macro = val(); break;
      case "--rows": out.rows = Math.max(3, parseInt(val(), 10) || 6); break;
      case "--cols": out.cols = Math.max(3, parseInt(val(), 10) || 6); break;
      case "--out": out.outDir = val(); break;
      case "--no-write": out.write = false; break;
      case "--campaign": out.campaign = true; break;
      case "--progression": out.progression = true; break;
      case "--compare": out.compare = true; break;
      case "--optimize": out.optimize = true; break;
      case "--accept": out.accept = true; break;
      case "--apply": out.apply = true; break;
      case "--apply-from": out.applyFrom = val(); break;
      case "--format": out.format = true; break;
      case "--no-snapshot": out.snapshot = false; break;
      case "--accept-snapshot": out.acceptSnapshot = true; break;
      default:
        if (a.startsWith("--")) console.warn(`[playtest] ignoring unknown flag: ${a}`);
    }
  }
  return out;
}

function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(2); }

// Replace the bytes between the NAME:START and NAME:END block-comment markers
// (e.g. SPINE, DIFF) with `payload`; returns html unchanged if absent. The exact
// marker byte sequence must appear ONLY at the real assignment in the target file
// (never in prose), or the wrong span is rewritten.
function replaceMarkerBlock(html, name, payload) {
  const START = `/* ${name}:START */`;
  const END = `/* ${name}:END */`;
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a < 0 || b <= a) return html;
  return html.slice(0, a) + `${START}\n${payload}\n${END}` + html.slice(b + END.length);
}

// ── Apply mode: write a proposed change-list back into constants.ts ──────────
async function runApply(args) {
  const { applyChangeList, summarizeApply } = await import("./applyChangeList.mjs");
  const patchPath = path.resolve(process.cwd(), args.applyFrom ?? path.join(args.outDir, "change-list.json"));
  console.log(`\npuzzleDrag2 — applying balance patch from ${path.relative(process.cwd(), patchPath)}${args.write ? "" : "  (dry run: --no-write)"}`);
  // --no-write is a DRY RUN: applyChangeList computes the resolved edits but
  // writes nothing to constants.ts (write:false), and the snapshot step below is
  // skipped entirely.
  const res = await applyChangeList({ patchPath, write: args.write, format: args.format });
  summarizeApply(res);
  if (!res.ok) { process.exitCode = 1; return; }

  // DRY RUN: nothing was written; the snapshot test would only be meaningful
  // against a mutated tree, so skip it and report what WOULD have happened.
  if (!args.write) {
    if (res.applied.length) {
      console.log(`\n[apply] (dry run) would write ${res.applied.length} edit(s) to constants.ts; skipped.`);
      const wouldSnapshot = args.snapshot;
      console.log(`[apply] (dry run) would ${wouldSnapshot ? (args.acceptSnapshot ? "REGENERATE (vitest run -u)" : "CHECK (vitest run)") : "SKIP"} the harness drift-guard snapshot; skipped.`);
    }
    return;
  }

  // A balance edit moves the fixed-seed harness metrics BY DESIGN. By default we
  // run the drift-guard test in CHECK mode (`vitest run`, no -u): a moved snapshot
  // FAILS LOUDLY, forcing a human to review the balance change before accepting.
  // Only --accept-snapshot regenerates (`vitest run -u`), recording the movement
  // as the reviewable snapshot diff. --no-snapshot skips the step entirely.
  if (args.snapshot && res.applied.length) {
    const regen = args.acceptSnapshot;
    const vitestArgs = ["vitest", "run", "src/__tests__/playtest-harness.test.ts", ...(regen ? ["-u"] : [])];
    console.log(`\n[apply] ${regen ? "regenerating" : "checking"} harness drift-guard snapshot (${vitestArgs.join(" ")})…`);
    try {
      const { stdout } = await execFileP(
        "npx", vitestArgs,
        { cwd: process.cwd(), maxBuffer: 64 * 1024 * 1024 },
      );
      console.log(stdout.trim().split("\n").slice(-4).join("\n"));
      if (regen) {
        console.log(`[apply] snapshot updated — review src/__tests__/__snapshots__/ alongside the constants diff.`);
      } else {
        console.log(`[apply] snapshot check PASSED — metrics unchanged by this edit (no snapshot movement).`);
      }
    } catch (e) {
      if (regen) {
        console.warn(`[apply] snapshot regen reported issues (review manually):\n${String(e.stdout || e.message || "").slice(-1000)}`);
      } else {
        // Expected on a real balance edit: the snapshot moved. Fail loudly so a
        // human reviews it. Re-run with --accept-snapshot to accept the movement.
        console.error(`\n[apply] ✗ drift-guard snapshot CHANGED — this balance edit moves the fixed-seed metrics.\n` +
          `[apply]   Review the effect, then re-run with --accept-snapshot to accept & regenerate the snapshot\n` +
          `[apply]   (or drop the constants change). Vitest output:\n${String(e.stdout || e.message || "").slice(-1000)}`);
        process.exitCode = 1;
      }
    }
  } else if (res.applied.length) {
    console.log(`\n[apply] note: harness snapshot NOT checked/regenerated (--no-snapshot). ` +
      `Verify with \`npx vitest run src/__tests__/playtest-harness.test.ts\` (or \`-u\` to accept).`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply) { await runApply(args); return; }
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: "error",
    plugins: [seasonalSubjects()],
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true },
    appType: "custom",
  });

  let report;
  let campaign;
  let progression;
  let comparison;
  let optimization;
  try {
    const mod = await server.ssrLoadModule("/src/playtest/index.ts");
    if (args.optimize) {
      optimization = mod.optimize(mod.spreadObjective());
    } else if (args.compare) {
      comparison = mod.runComparison({
        zoneId: args.zones[0], runs: args.runs, seed: args.seed, rows: args.rows, cols: args.cols,
      });
    } else if (args.progression) {
      const spine = mod.buildProgressionSpine();
      // Diff the fresh spine against the committed baseline (the last reviewed
      // state) so a balance pass sees what moved. Baseline lives OUTSIDE the
      // git-ignored playtest dir so it persists across runs.
      const baselinePath = path.resolve(process.cwd(), "reference/docs/balance/progression.baseline.json");
      let baseline = null;
      try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); } catch { /* none yet */ }
      const diff = mod.diffSpines(baseline, spine);
      progression = {
        spine, diff, baselinePath, hadBaseline: !!baseline,
        // The diff to embed after establishing/accepting a baseline (baseline == current).
        unchangedDiff: mod.diffSpines(spine, spine),
        reportMarkdown: mod.renderProgressionReport(spine) + "\n\n" + mod.renderProgressionDiff(diff),
      };
    } else if (args.campaign) {
      campaign = mod.runCampaign({
        zoneId: args.zones[0], runs: args.runs, seed: args.seed,
        policy: args.policy, macro: args.macro, rows: args.rows, cols: args.cols,
      });
    } else {
      report = mod.runPlaytest({
        zones: args.zones, runs: args.runs, seed: args.seed,
        policy: args.policy, rows: args.rows, cols: args.cols,
      });
    }
  } finally {
    await server.close();
  }

  // ── Optimize mode: search knobs toward a goal, emit an appliable change-list ─
  if (optimization) {
    const o = optimization;
    const edits = Object.entries(o.changeList);
    console.log(`\npuzzleDrag2 optimizer — family-value spread objective\n`);
    console.log(`  loss ${fmt(o.before)} → ${fmt(o.after)} over ${o.passes} pass(es) · ${o.acceptable ? "✓ in band" : "⚠ not fully in band"}`);
    console.log(`  proposed ${edits.length} edit(s):`);
    for (const [p, v] of edits) console.log(`     ${p} → ${v}`);
    if (!args.write) { console.log("\n(--no-write: skipped file output)\n"); return; }
    const outDir = path.resolve(process.cwd(), args.outDir);
    await mkdir(outDir, { recursive: true });
    // Write the proposal as a change-list.json so `npm run playtest:apply` writes
    // it back to constants.ts — closing the loop: optimize → apply → re-sim.
    await writeFile(path.join(outDir, "change-list.json"), JSON.stringify(o.changeList, null, 2) + "\n", "utf8");
    await writeFile(path.join(outDir, "optimize-report.json"), JSON.stringify(o, null, 2) + "\n", "utf8");
    console.log(`\n  wrote change-list.json (apply with: npm run playtest:apply), optimize-report.json → ${args.outDir}\n`);
    return;
  }

  // ── Compare mode: same seeds across the floor↔ceiling policy bracket ─────
  if (comparison) {
    const { rows } = comparison;
    console.log(`\npuzzleDrag2 policy bracket — zone ${args.zones[0]}, ${args.runs} run(s), seed ${args.seed}\n`);
    for (const r of rows) {
      console.log(`  ${r.label.padEnd(8)} [${r.policy}/${r.macro}] · tier ${r.finalTier} · net/run ${fmt(r.netCoinsPerRunMean)} · bal ${fmt(r.finalBalance)}` +
        (r.stall ? ` · stall ${r.stall}` : ""));
    }
    const tiers = rows.map((r) => r.finalTier);
    console.log(`\n  progression spread: tier ${Math.min(...tiers)} → ${Math.max(...tiers)} (Δ${Math.max(...tiers) - Math.min(...tiers)})`);
    if (!args.write) { console.log("\n(--no-write: skipped file output)\n"); return; }
    const outDir = path.resolve(process.cwd(), args.outDir);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "compare-report.md"), comparison.reportMarkdown + "\n", "utf8");
    await writeFile(path.join(outDir, "compare.json"), JSON.stringify(comparison, null, 2) + "\n", "utf8");
    console.log(`\n  wrote compare-report.md, compare.json → ${args.outDir}\n`);
    return;
  }

  // ── Progression mode: the code-derived spine + softlock oracle + diff ────
  if (progression) {
    const { spine, diff } = progression;
    const o = spine.oracle;
    console.log(`\npuzzleDrag2 progression spine — code-derived (no runs played)\n`);
    console.log(`  fresh-save reachable: ${o.freshSaveReachable.join(", ")}`);
    console.log(`  playable boards: ${o.freshSavePlayableBoards.join(", ") || "(none)"}`);
    if (o.softlock) {
      console.log(`  ⛔ SOFTLOCK: home stuck at ${o.softlock.stuckTierName} (tier ${o.softlock.stuckTier}); ` +
        `${o.softlock.blockedRung} needs ${o.softlock.primaryMissing.join(", ")}`);
    } else {
      console.log(`  ✓ no softlock detected (home can climb its full ladder)`);
    }
    for (const w of o.walls) {
      console.log(`  wall · ${w.zone}: ${w.wall.reachedName} → ${w.wall.toName} blocked on ${w.wall.missing.map((m) => m.key).join(", ")}`);
    }
    // Cross-run diff vs the committed baseline.
    console.log(`\n  ${diff.unchanged ? "✓" : "⚠"} ${diff.headline}`);
    for (const c of diff.changes.slice(0, 12)) {
      const arrow = c.kind === "changed" ? `${c.before} → ${c.after}` : c.kind === "added" ? `+ ${c.after}` : `− ${c.before}`;
      console.log(`     [${c.severity}] ${c.name}: ${arrow}`);
    }
    if (diff.changes.length > 12) console.log(`     …and ${diff.changes.length - 12} more (see progression-diff.md)`);

    if (!args.write) { console.log("\n(--no-write: skipped file output)\n"); return; }
    const outDir = path.resolve(process.cwd(), args.outDir);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "progression.json"), JSON.stringify(spine, null, 2) + "\n", "utf8");
    await writeFile(path.join(outDir, "progression-report.md"), progression.reportMarkdown + "\n", "utf8");
    await writeFile(path.join(outDir, "progression-diff.json"), JSON.stringify(diff, null, 2) + "\n", "utf8");
    console.log(`\n  wrote progression.json, progression-report.md, progression-diff.json → ${args.outDir}`);

    // Establish the baseline on first run; promote current → baseline on --accept.
    // After either, the embedded diff is "unchanged" (baseline == current).
    let embeddedDiff = diff;
    const establishing = !progression.hadBaseline;
    if (establishing || args.accept) {
      await writeFile(progression.baselinePath, JSON.stringify(spine, null, 2) + "\n", "utf8");
      embeddedDiff = progression.unchangedDiff; // baseline now == current → no pending changes
      console.log(`  ${establishing ? "established" : "accepted → updated"} baseline progression.baseline.json`);
    }

    // Refresh the inlined, code-derived data blocks in the dashboard so the
    // self-contained HTML never drifts. Two marker pairs: SPINE (current spine)
    // and DIFF (changes-vs-baseline). The exact "/* X:START */" byte sequence
    // must appear ONLY at the real assignment — never in prose — or this rewrites
    // the wrong span.
    const dashPath = path.resolve(process.cwd(), "reference/docs/balance/progression-timeline.html");
    try {
      let html = await readFile(dashPath, "utf8");
      const before = html;
      html = replaceMarkerBlock(html, "SPINE", `const SPINE = ${JSON.stringify(spine)};`);
      html = replaceMarkerBlock(html, "DIFF", `const DIFF = ${JSON.stringify(embeddedDiff)};`);
      if (html !== before) {
        await writeFile(dashPath, html, "utf8");
        console.log(`  refreshed SPINE + DIFF data blocks in progression-timeline.html`);
      } else {
        console.log(`  progression-timeline.html data blocks already current`);
      }
    } catch { /* dashboard not present yet — fine */ }
    console.log("");
    return;
  }

  // ── Campaign mode: progression pacing for a single zone ──────────────────
  if (campaign) {
    const m = campaign.metrics;
    console.log(`\npuzzleDrag2 campaign — zone ${m.zoneId}, up to ${args.runs} run(s), seed ${args.seed}\n`);
    console.log(`  start ${m.startCoins}c → ${m.runsPlayed} run(s) → ${fmt(m.finalBalance)}c · tier ${m.finalTier}${m.stalledOnEntry ? " · ⚠ stalled on entry" : ""}`);
    console.log(`  net coins/run: mean ${fmt(m.netCoinsPerRun.mean)} ± ${fmt(m.netCoinsPerRun.stdev)} (median ${fmt(m.netCoinsPerRun.median)}) · income trend r=${fmt(m.incomeTrendCorrelation)}`);
    for (const ms of m.coinMilestones) {
      console.log(`  ${ms.label}: ${ms.runIndex < 0 ? "not reached" : `run ${ms.runIndex}`}${ms.target ? ` (band ${ms.target[0]}–${ms.target[1]}, ${ms.verdict})` : ""}`);
    }
    if (m.tierStall) {
      const gated = m.tierStall.missing.filter((x) => x.source !== "farm").map((x) => `${x.key}(${x.source})`);
      console.log(`  stall → ${m.tierStall.toName}: missing ${m.tierStall.missing.map((x) => `${x.key}×${x.need - x.have}`).join(", ")}${gated.length ? `  ⚠ off-farm: ${gated.join(", ")}` : ""}`);
    }
    if (!args.write) { console.log("\n(--no-write: skipped file output)\n"); return; }
    const outDir = path.resolve(process.cwd(), args.outDir);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "campaign-report.md"), campaign.reportMarkdown + "\n", "utf8");
    await writeFile(path.join(outDir, "campaign-metrics.json"), JSON.stringify(m, null, 2) + "\n", "utf8");
    console.log(`\n  wrote campaign-report.md, campaign-metrics.json → ${args.outDir}\n`);
    return;
  }

  // Console summary.
  console.log(`\npuzzleDrag2 AI playtest — policy ${args.policy}, ${args.runs} run(s)/zone, seed ${args.seed}\n`);
  for (const z of report.metrics.zones) {
    const cr = z.coinsPerRun, cc = z.chainCoinsPerRun, ct = z.coinsPerTurn;
    console.log(`  ${z.zoneId}: entered ${z.entered}/${z.runs} · coins/run ${fmt(cr.mean)} (chain ${fmt(cc.mean)}, min ${fmt(cr.min)}, max ${fmt(cr.max)}) · coins/turn ${fmt(ct.mean)} · turns ${fmt(z.turnsPlayed.mean)}`);
    const yields = Object.entries(z.resourceYieldMean).sort(([a], [b]) => a.localeCompare(b));
    if (yields.length) console.log(`     yields/run: ${yields.map(([k, v]) => `${k} ${fmt(v)}`).join(", ")}`);
  }
  const sp = report.metrics.spread;
  console.log(`\n  family-value spread: ratio ${fmt(sp.ratio)}× (max ${fmt(sp.max)}, min ${fmt(sp.min)}, median ${fmt(sp.median)})${sp.flagged ? "  ⚠ flagged" : ""}`);
  const pearls = sp.entries.find((e) => e.resourceKey === "pearls");
  const pie = sp.entries.find((e) => e.resourceKey === "pie");
  if (pearls) console.log(`     pearls realized/tile ${fmt(pearls.realizedValuePerTile)} [${pearls.flag}]`);
  if (pie) console.log(`     pie    realized/tile ${fmt(pie.realizedValuePerTile)} [${pie.flag}]`);
  console.log(`  proposed change-list: ${report.changeList.count} edit(s)`);

  if (!args.write) { console.log("\n(--no-write: skipped file output)\n"); return; }

  const outDir = path.resolve(process.cwd(), args.outDir);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "report.md"), report.reportMarkdown, "utf8");
  await writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report.metrics, null, 2) + "\n", "utf8");
  await writeFile(path.join(outDir, "change-list.md"), report.changeList.markdown + "\n", "utf8");
  await writeFile(path.join(outDir, "change-list.json"), report.changeList.json + "\n", "utf8");
  console.log(`\n  wrote report.md, metrics.json, change-list.md, change-list.json → ${args.outDir}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
