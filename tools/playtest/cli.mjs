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
import path from "node:path";
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
  const out = { zones: ["home"], runs: 10, seed: 1, policy: "greedy", rows: 6, cols: 6, outDir: "reference/docs/playtest", write: true, campaign: false, progression: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => argv[++i];
    switch (a) {
      case "--zones": out.zones = val().split(",").map((z) => z.trim()).filter(Boolean); break;
      case "--runs": out.runs = Math.max(1, parseInt(val(), 10) || 1); break;
      case "--seed": out.seed = parseInt(val(), 10) || 0; break;
      case "--policy": out.policy = val(); break;
      case "--rows": out.rows = Math.max(3, parseInt(val(), 10) || 6); break;
      case "--cols": out.cols = Math.max(3, parseInt(val(), 10) || 6); break;
      case "--out": out.outDir = val(); break;
      case "--no-write": out.write = false; break;
      case "--campaign": out.campaign = true; break;
      case "--progression": out.progression = true; break;
      default:
        if (a.startsWith("--")) console.warn(`[playtest] ignoring unknown flag: ${a}`);
    }
  }
  return out;
}

function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(2); }

async function main() {
  const args = parseArgs(process.argv.slice(2));
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
  try {
    const mod = await server.ssrLoadModule("/src/playtest/index.ts");
    if (args.progression) {
      const spine = mod.buildProgressionSpine();
      progression = { spine, reportMarkdown: mod.renderProgressionReport(spine) };
    } else if (args.campaign) {
      campaign = mod.runCampaign({
        zoneId: args.zones[0], runs: args.runs, seed: args.seed,
        policy: args.policy, rows: args.rows, cols: args.cols,
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

  // ── Progression mode: the code-derived spine + softlock oracle ───────────
  if (progression) {
    const { spine } = progression;
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
    if (!args.write) { console.log("\n(--no-write: skipped file output)\n"); return; }
    const outDir = path.resolve(process.cwd(), args.outDir);
    await mkdir(outDir, { recursive: true });
    const json = JSON.stringify(spine, null, 2) + "\n";
    await writeFile(path.join(outDir, "progression.json"), json, "utf8");
    await writeFile(path.join(outDir, "progression-report.md"), progression.reportMarkdown + "\n", "utf8");
    console.log(`\n  wrote progression.json, progression-report.md → ${args.outDir}`);
    // Refresh the inlined, code-derived data block in the dashboard (if present),
    // so the self-contained HTML can never drift from the constants.
    const dashPath = path.resolve(process.cwd(), "reference/docs/balance/progression-timeline.html");
    try {
      const html = await readFile(dashPath, "utf8");
      const START = "/* SPINE:START */";
      const END = "/* SPINE:END */";
      const a = html.indexOf(START), b = html.indexOf(END);
      if (a >= 0 && b > a) {
        const block = `${START}\nconst SPINE = ${JSON.stringify(spine)};\n${END}`;
        const next = html.slice(0, a) + block + html.slice(b + END.length);
        if (next !== html) {
          await writeFile(dashPath, next, "utf8");
          console.log(`  refreshed SPINE data block in progression-timeline.html`);
        } else {
          console.log(`  progression-timeline.html SPINE block already current`);
        }
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
