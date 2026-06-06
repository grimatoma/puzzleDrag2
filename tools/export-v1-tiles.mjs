/**
 * export-v1-tiles.mjs — asset-pipeline Stage 2 bootstrap (see
 * docs/godot-migration-plan.html §assets-stage2).
 *
 * Drives the existing Phaser web app headlessly, extracts every board-tile
 * texture from Phaser's runtime texture cache, and writes each one as a named
 * PNG ready to drop into the Godot project (res://assets/tiles/<key>.png).
 *
 * The Phaser textures are Canvas 2D procedural drawings rasterised at scene
 * init — they are not files on disk, so this is the only way to get them out.
 * Run ONCE to seed the folder, and only re-run if a v1 texture is intentionally
 * changed in the Phaser codebase before v2 (animated sprites) replaces it.
 *
 * Usage:
 *   npm run dev                      # start the Vite dev server first
 *   node tools/export-v1-tiles.mjs   # writes godot/assets/tiles/*.png
 *
 * Naming. Phaser stores a board tile under cache key `tile_<itemKey>` (plus a
 * highlighted `_sel` variant), where <itemKey> is itself `tile_<cat>_<name>`
 * (e.g. item `tile_grass_grass` -> cache `tile_tile_grass_grass`). This script
 * strips the one-level cache prefix and writes the PNG under the canonical item
 * key (`tile_grass_grass.png`) — exactly the string in Godot's
 * Constants.STRING_KEYS — and skips the `_sel` variants (Godot draws its own
 * selection ring). Resource/tool/UI textures (item keys without a `tile_`
 * prefix, e.g. `flour`) are board upgrade icons, not board tile types, and are
 * excluded; Godot renders those via native UI.
 *
 * Options (all optional):
 *   --base=<url>    dev server base (default http://localhost:5173/puzzleDrag2/)
 *   --out=<dir>     output dir     (default godot/assets/tiles)
 *   --scenario=<id> visual scenario that boots the board (default board-farm-idle)
 */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const BASE = arg("base", "http://localhost:5173/puzzleDrag2/");
const OUT_DIR = resolve(__dirname, "..", arg("out", "godot/assets/tiles"));
const SCENARIO = arg("scenario", "board-farm-idle");

// The 10 Farm board tiles the Godot M3 slice references (mirror of
// Constants.STRING_KEYS in godot/scripts/Constants.gd). The export fails if any
// of these is missing from the Phaser cache, so a renamed/removed tile is loud.
const REQUIRED_KEYS = [
  "tile_grass_grass",
  "tile_grain_wheat",
  "tile_bird_pheasant",
  "tile_veg_carrot",
  "tile_fruit_apple",
  "tile_flower_pansy",
  "tile_tree_oak",
  "tile_herd_pig",
  "tile_cattle_cow",
  "tile_mount_horse",
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1, // native texture resolution, no HiDPI doubling
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Deterministic + quiet, mirroring tools/capture-wiki-screens.mjs.
  await page.addInitScript(() => {
    window.__HEARTH_VISUAL_TESTING__ = true;
    window.__HEARTH_DISABLE_DIALOGS__ = true;
    let seed = 123456789;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    Date.now = () => 1_700_000_000_000;
    window.localStorage.clear();
    window.localStorage.setItem("hearth.tutorial.seen", "1");
  });

  const url = `${BASE}?visual=${encodeURIComponent(SCENARIO)}`;
  console.log(`> loading ${url}`);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__hearthVisual?.ready);
  // Board scenario: wait for the grid + textures to be fully populated.
  await page.waitForFunction(
    () => window.__phaserScene?.textures?.list && window.__phaserScene?.grid?.flat?.().filter(Boolean).length >= 36,
    null,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(300);

  // Pull every board-tile-type texture out of the live Phaser cache as a PNG.
  // Cache key `tile_<itemKey>` -> filename `<itemKey>.png`; `_sel` variants and
  // non-board textures (item key without a `tile_` prefix) are dropped.
  const { exported, skippedZero } = await page.evaluate(() => {
    const tm = window.__phaserScene.textures;
    const exported = {};
    const skippedZero = [];
    for (const cacheKey of Object.keys(tm.list)) {
      if (cacheKey.startsWith("__")) continue; // __DEFAULT/__MISSING/__WHITE/__NORMAL
      if (!cacheKey.startsWith("tile_")) continue; // only board-tile textures
      if (cacheKey.endsWith("_sel")) continue; // selection handled by Godot's ring
      const itemKey = cacheKey.slice("tile_".length); // recover canonical item key
      if (!itemKey.startsWith("tile_")) continue; // drop resource/tool upgrade icons
      const src = tm.get(cacheKey).getSourceImage();
      if (!src || !src.width || !src.height) {
        skippedZero.push(cacheKey);
        continue;
      }
      const c = document.createElement("canvas");
      c.width = src.width;
      c.height = src.height;
      c.getContext("2d").drawImage(src, 0, 0);
      exported[itemKey] = { dataUrl: c.toDataURL("image/png"), w: src.width, h: src.height };
    }
    return { exported, skippedZero };
  });

  await browser.close();

  if (errors.length) {
    console.error("! page errors during load:", errors);
    process.exit(1);
  }

  const keys = Object.keys(exported).sort();
  if (keys.length === 0) {
    console.error("! no board-tile textures found in the Phaser cache — nothing to write");
    process.exit(1);
  }

  // Fresh-seed the dir so removed tiles don't linger between runs.
  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of readdirSync(OUT_DIR)) {
    if (f.endsWith(".png")) rmSync(resolve(OUT_DIR, f));
  }

  const manifest = {};
  for (const key of keys) {
    const { dataUrl, w, h } = exported[key];
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    writeFileSync(resolve(OUT_DIR, `${key}.png`), buf);
    manifest[key] = { w, h, bytes: buf.length };
    console.log(`  wrote ${key}.png  ${w}x${h}  (${buf.length} bytes)`);
  }
  writeFileSync(
    resolve(OUT_DIR, "manifest.json"),
    JSON.stringify({ source: "phaser", scenario: SCENARIO, count: keys.length, tiles: manifest }, null, 2) + "\n",
  );

  if (skippedZero.length) console.warn(`  (skipped ${skippedZero.length} zero-size textures: ${skippedZero.slice(0, 5).join(", ")}…)`);

  // Completeness gate: every Godot-referenced Farm tile must have shipped.
  const missing = REQUIRED_KEYS.filter((k) => !(k in exported));
  if (missing.length) {
    console.error(`\n! MISSING required Farm tile textures: ${missing.join(", ")}`);
    console.error("  (the Phaser tile key may have been renamed — update Constants.gd + REQUIRED_KEYS)");
    process.exit(1);
  }

  console.log(`\n✓ exported ${keys.length} texture(s) to ${OUT_DIR}`);
  console.log(`✓ all ${REQUIRED_KEYS.length} required Farm tiles present`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
