// Icon review render harness.
//
// Renders every reviewable canvas icon (the in-use, non-legacy entries of
// ICON_REGISTRY) to a high-resolution PNG with diagnostic overlays, plus a
// per-module contact sheet, and emits a manifest classifying each key as
// in-use / alias-target / removal-candidate. Drives the live Vite dev server
// and import()s the real source modules, so renders match the game exactly.
//
// Usage (dev server must be running at $ICON_BASE, default localhost:5173):
//   node tools/render-icons.mjs --mode before                 # all modules
//   node tools/render-icons.mjs --mode after --module fruits  # one module
//   node tools/render-icons.mjs --manifest                    # just print/refresh manifest
//
// Output (gitignored working dir):
//   icon-review/<mode>/<module>/<key>.png
//   icon-review/sheets/<module>.png
//   icon-review/manifest.json
//
// "before" snapshots are disposable — the tracker embeds base64 thumbnails, so
// icon-review/before/ can be deleted once a category is signed off.

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.ICON_BASE || "http://localhost:5173/puzzleDrag2/";
const OUT = resolve("icon-review");

const args = process.argv.slice(2);
const opt = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true);
};
const MODE = opt("mode", "before");          // before | after
const MODULE_FILTER = opt("module", null);   // restrict to one module
const MANIFEST_ONLY = opt("manifest", false);

// Module spread order MUST mirror iconRegistry.ts so the "owning module" of a
// key (last writer wins) matches which file the fix should edit.
const MODULE_ORDER = [
  "grass", "grain", "vegetables", "fruits", "flowers", "trees", "birds",
  "herdAnimals", "cattle", "mounts", "toolsFarm", "toolsMine", "toolsPortal",
  "toolsSea", "existingFarm", "existingMine", "craftedProducts", "characters",
  "charactersV2",
  "mapNodes", "decorations", "playerTools", "craftingStations", "hazards",
  "tileCategories", "mineHazards", "fish", "recipes", "uiElements",
  "missingItems", "achievements", "quests", "currencies", "fixed-icons",
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("[console.error]", m.text()); });
await page.goto(BASE, { waitUntil: "domcontentloaded" });

// ---- Build manifest in the page (module ownership + usage classification) ----
const manifest = await page.evaluate(async (MODULE_ORDER) => {
  const reg = await import("/puzzleDrag2/src/textures/iconRegistry.js");
  const usage = await import("/puzzleDrag2/src/balanceManager/iconUsage.js");
  const REG = reg.ICON_REGISTRY;
  const used = usage.getUsedIconKeys();

  // key -> owning module (last module in spread order that defines the key).
  const owner = {};
  for (const mod of MODULE_ORDER) {
    const m = await import(`/puzzleDrag2/src/textures/categories/${mod}.js`);
    for (const k of Object.keys(m.ICONS || {})) owner[k] = mod;
  }

  // Alias detection: an "unused" key whose draw fn is shared with a used key is
  // actually live via an alias (e.g. bomb -> dynamite share one draw).
  const drawToKeys = new Map();
  for (const [k, e] of Object.entries(REG)) {
    if (!drawToKeys.has(e.draw)) drawToKeys.set(e.draw, []);
    drawToKeys.get(e.draw).push(k);
  }

  const rows = [];
  for (const [key, entry] of Object.entries(REG)) {
    if (key.startsWith("legacy_") || entry.archive) continue;
    const directlyUsed = used.has(key);
    const siblings = drawToKeys.get(entry.draw) || [];
    const aliasUsed = !directlyUsed && siblings.some((s) => used.has(s));
    let status;
    if (directlyUsed) status = "in-use";
    else if (aliasUsed) status = "alias-target";
    else status = "removal-candidate";
    rows.push({
      key,
      module: owner[key] || "?",
      label: entry.label || key,
      color: entry.color || "#888",
      status,
      sharedWith: siblings.filter((s) => s !== key),
    });
  }
  rows.sort((a, b) => (a.module + a.key).localeCompare(b.module + b.key));
  return rows;
}, MODULE_ORDER);

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));

const byStatus = manifest.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log("manifest:", JSON.stringify(byStatus), "total", manifest.length);

if (MANIFEST_ONLY) { await browser.close(); process.exit(0); }

// ---- Render one diagnostic PNG per icon ----
// Render every non-legacy/non-archive icon (the manifest already excludes those),
// regardless of usage status, so the tracker shows a real before/after for every
// card instead of a "–" placeholder. The manifest still tags each row in-use /
// alias-target / removal-candidate, so the "unused?" chip is preserved — only the
// preview boxes get filled. Pass --reviewable-only to render the old in-use +
// alias-target subset.
const REVIEWABLE_ONLY = opt("reviewable-only", false);
const reviewable = manifest.filter(
  (r) => (!REVIEWABLE_ONLY || r.status !== "removal-candidate") &&
         (!MODULE_FILTER || r.module === MODULE_FILTER),
);

async function renderKey(key) {
  return page.evaluate(async ({ key }) => {
    const paint = await import("/puzzleDrag2/src/textures/paintIcon.js");
    // Diagnostic full render: split bg + 64-box boundary + crosshair.
    const TOTAL = 384, CONTENT = 288, PAD = (TOTAL - CONTENT) / 2;
    const c = document.createElement("canvas"); c.width = TOTAL; c.height = TOTAL;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#efe8da"; ctx.fillRect(0, 0, TOTAL / 2, TOTAL);
    ctx.fillStyle = "#23262b"; ctx.fillRect(TOTAL / 2, 0, TOTAL / 2, TOTAL);
    ctx.save(); ctx.translate(PAD, PAD); paint.paintIcon(ctx, key, CONTENT); ctx.restore();
    ctx.strokeStyle = "rgba(255,0,200,0.55)"; ctx.lineWidth = 1;
    ctx.strokeRect(PAD + 0.5, PAD + 0.5, CONTENT - 1, CONTENT - 1);
    ctx.strokeStyle = "rgba(128,128,128,0.35)";
    ctx.beginPath(); ctx.moveTo(TOTAL / 2, PAD); ctx.lineTo(TOTAL / 2, TOTAL - PAD);
    ctx.moveTo(PAD, TOTAL / 2); ctx.lineTo(TOTAL - PAD, TOTAL / 2); ctx.stroke();
    // Clean thumbnail for the tracker (checker bg, no overlay).
    const TS = 104;
    const t = document.createElement("canvas"); t.width = TS; t.height = TS;
    const tx = t.getContext("2d");
    tx.fillStyle = "#e3ddd0"; tx.fillRect(0, 0, TS, TS);
    tx.fillStyle = "#cfc7b7"; tx.fillRect(0, 0, TS / 2, TS / 2); tx.fillRect(TS / 2, TS / 2, TS / 2, TS / 2);
    paint.paintIcon(tx, key, TS);
    return { full: c.toDataURL("image/png"), thumb: t.toDataURL("image/png") };
  }, { key });
}

const dir = `${OUT}/${MODE}`;
let n = 0;
for (const r of reviewable) {
  const { full, thumb } = await renderKey(r.key);
  const modDir = `${dir}/${r.module}`;
  mkdirSync(modDir, { recursive: true });
  writeFileSync(`${modDir}/${r.key}.png`, Buffer.from(full.split(",")[1], "base64"));
  writeFileSync(`${modDir}/${r.key}.thumb.png`, Buffer.from(thumb.split(",")[1], "base64"));
  n++;
}
console.log(`rendered ${n} icons (+thumbs) -> ${dir}`);

// ---- Per-module contact sheets (overview pass) ----
const modules = MODULE_FILTER ? [MODULE_FILTER] : [...new Set(reviewable.map((r) => r.module))];
mkdirSync(`${OUT}/sheets`, { recursive: true });
for (const mod of modules) {
  const keys = reviewable.filter((r) => r.module === mod).map((r) => r.key);
  if (!keys.length) continue;
  const dataUrl = await page.evaluate(async ({ keys, mod }) => {
    const paint = await import("/puzzleDrag2/src/textures/paintIcon.js");
    const CELL = 132, COLS = 6, PAD = 10, LABEL = 16;
    const rows = Math.ceil(keys.length / COLS);
    const W = COLS * CELL, H = rows * (CELL + LABEL) + PAD;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#d9d2c4"; ctx.fillRect(0, 0, W, H);
    keys.forEach((key, i) => {
      const cx = (i % COLS) * CELL, cy = Math.floor(i / COLS) * (CELL + LABEL) + PAD;
      // checker cell so transparency + stray fills are visible
      ctx.fillStyle = (Math.floor(i / COLS) + (i % COLS)) % 2 ? "#cfc7b7" : "#e3ddd0";
      ctx.fillRect(cx, cy, CELL, CELL);
      ctx.save(); ctx.translate(cx + CELL / 2 - 50, cy + CELL / 2 - 50);
      paint.paintIcon(ctx, key, 100); ctx.restore();
      ctx.fillStyle = "#3a352c"; ctx.font = "11px monospace"; ctx.textAlign = "center";
      ctx.fillText(key.length > 20 ? key.slice(0, 19) + "…" : key, cx + CELL / 2, cy + CELL + 11);
    });
    return c.toDataURL("image/png");
  }, { keys, mod });
  writeFileSync(`${OUT}/sheets/${mod}.png`, Buffer.from(dataUrl.split(",")[1], "base64"));
}
console.log(`wrote ${modules.length} contact sheet(s) -> ${OUT}/sheets`);

await browser.close();
