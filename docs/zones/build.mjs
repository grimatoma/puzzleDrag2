#!/usr/bin/env node
// docs/zones — generator. Emits the self-contained atlas (and, later, per-zone docs)
// from the data layer + shared engine. Run: node docs/zones/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ZONES } from "./data/zones.mjs";
import { META, PRINCIPLES, TOPOLOGIES, MECHANIC_SOURCING, REGIONS } from "./data/world.mjs";
import { buildAtlas } from "./lib/atlas.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(__dir, p), "utf8");

const styles = read("lib/styles.css");
const engine = read("lib/engine.js");

// ── sanity checks: keep the data honest before we render ───────────────────────
// Base/board resources every zone can produce early (so they never gate-lock a rung).
const BASE_RES = new Set([
  "plank", "block", "iron_bar", "gold_bar", "copper_bar", "coke", "cut_gem",
  "hay_bundle", "flour", "fish_fillet", "pearls", "sea_shells", "fish_oil",
  "honey", "eggs", "meat", "milk", "horseshoe", "hide", "dates", "amber", "cured_meat",
]);
const norm = (s) => s.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");

const problems = [];
const topoIds = new Set(TOPOLOGIES.map((t) => t.id));
const usedTopo = new Set();
for (const z of ZONES) {
  if (!topoIds.has(z.topology)) problems.push(`${z.id}: unknown topology "${z.topology}"`);
  if (usedTopo.has(z.topology)) problems.push(`${z.id}: topology "${z.topology}" already used (must be unique)`);
  usedTopo.add(z.topology);
  for (let i = 1; i < z.tiers.length; i++) {
    if (z.tiers[i].plots <= z.tiers[i - 1].plots) problems.push(`${z.id}: tier ${i} plots not increasing`);
  }
  if (z.tiers[0].cost) problems.push(`${z.id}: tier 0 should be free/founding`);
  if (z.landmarkStages && z.landmarkStages.length !== z.tiers.length) {
    problems.push(`${z.id}: ${z.landmarkStages.length} landmark stages for ${z.tiers.length} tiers (should match)`);
  }
  // every gating resource must be a base resource OR a documented "new resource" (no undocumented/typo gates)
  const declared = new Set((z.newResources || []).flatMap((r) => norm(r.name).split("_").length > 2 ? [norm(r.name)] : [norm(r.name)]));
  // also accept multi-word notes like "Hide & amber" by including each base word
  for (const r of (z.newResources || [])) for (const w of norm(r.name).split("_")) if (w) declared.add(w);
  for (const t of z.tiers) {
    for (const k of Object.keys(t.cost?.res || {})) {
      if (!BASE_RES.has(k) && !declared.has(k)) problems.push(`${z.id}: tier "${t.id}" gates on "${k}" but it's neither a base resource nor a documented newResource (softlock/typo risk)`);
    }
  }
}
if (problems.length) { console.error("Data problems:\n  " + problems.join("\n  ")); process.exit(1); }

const html = buildAtlas({ ZONES, META, PRINCIPLES, TOPOLOGIES, MECHANIC_SOURCING, REGIONS, styles, engine });
writeFileSync(join(__dir, "index.html"), html);
console.log(`✓ atlas → docs/zones/index.html (${(html.length / 1024).toFixed(0)} KB, ${ZONES.length} zones, ${TOPOLOGIES.length} topologies)`);
