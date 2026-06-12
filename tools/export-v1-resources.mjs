/**
 * export-v1-resources.mjs — companion to export-v1-tiles.mjs.
 *
 * export-v1-tiles.mjs pulls the BOARD-TILE textures (cache key `tile_tile_*`).
 * This tool pulls the OTHER half of the Phaser cache: the RESOURCE / TOOL / item
 * icons (cache key `tile_<key>` where <key> does NOT itself start with `tile_` —
 * e.g. `tile_flour`, `tile_bread`, `tile_axe`). React draws these next to every
 * inventory row, stockpile chip, craft input and market line; the Godot port had
 * no art for them and fell back to text ledgers — the dominant "looks unfinished"
 * signal across the menus. Exporting them lets the Godot UI show the SAME icons.
 *
 * Like the tile textures these are Canvas-2D procedural drawings rasterised at
 * scene init, not files on disk, so driving the live app is the only way out.
 *
 * Usage:
 *   npm run dev                          # start the Vite dev server first
 *   node tools/export-v1-resources.mjs   # writes godot/assets/resources/*.png
 *
 * Options:
 *   --base=<url>    dev server base (default http://localhost:5173/puzzleDrag2/)
 *   --out=<dir>     output dir     (default godot/assets/resources)
 *   --scenario=<id> board scenario that boots Phaser (default board-farm-idle)
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

const BASE = arg("base", "http://localhost:5173/puzzleDrag2/");
const OUT_DIR = resolve(__dirname, "..", "..", "puzzleDrag2-godot", arg("out", "assets/resources"));
const SCENARIO = arg("scenario", "board-farm-idle");

// Resource/inventory keys the Godot port references in its ledgers (mirror of the
// economy in godot/scripts/Constants.gd + RecipeConfig/BuildingConfig). The export
// fails loudly if any is missing from the Phaser cache (renamed/removed upstream).
const REQUIRED_KEYS = [
  "flour", "bread", "eggs", "hay_bundle", "plank", "block",
  "supplies", "horseshoe", "honey", "meat", "milk", "coke",
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1, // native texture resolution, no HiDPI doubling
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

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
  await page.waitForFunction(
    () => window.__phaserScene?.textures?.list && window.__phaserScene?.grid?.flat?.().filter(Boolean).length >= 36,
    null,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(300);

  // Pull every NON-tile icon out of the cache. Cache key `tile_<key>` -> `<key>.png`,
  // keeping only keys whose recovered <key> does NOT start with `tile_` (those are
  // board tiles, handled by export-v1-tiles.mjs) and is not a `_sel` variant.
  const { exported, skippedZero } = await page.evaluate(() => {
    const tm = window.__phaserScene.textures;
    const exported = {};
    const skippedZero = [];
    for (const cacheKey of Object.keys(tm.list)) {
      if (cacheKey.startsWith("__")) continue;
      if (!cacheKey.startsWith("tile_")) continue;
      if (cacheKey.endsWith("_sel")) continue;
      const key = cacheKey.slice("tile_".length); // recover canonical item key
      if (key.startsWith("tile_")) continue; // board tiles -> export-v1-tiles.mjs
      const src = tm.get(cacheKey).getSourceImage();
      if (!src || !src.width || !src.height) {
        skippedZero.push(cacheKey);
        continue;
      }
      const c = document.createElement("canvas");
      c.width = src.width;
      c.height = src.height;
      c.getContext("2d").drawImage(src, 0, 0);
      exported[key] = { dataUrl: c.toDataURL("image/png"), w: src.width, h: src.height };
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
    console.error("! no resource icon textures found in the Phaser cache — nothing to write");
    process.exit(1);
  }

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
    JSON.stringify({ source: "phaser", scenario: SCENARIO, count: keys.length, icons: manifest }, null, 2) + "\n",
  );

  if (skippedZero.length) console.warn(`  (skipped ${skippedZero.length} zero-size textures: ${skippedZero.slice(0, 5).join(", ")}…)`);

  const missing = REQUIRED_KEYS.filter((k) => !(k in exported));
  if (missing.length) {
    console.error(`\n! MISSING required resource icons: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`\n✓ exported ${keys.length} resource icon(s) to ${OUT_DIR}`);
  console.log(`✓ all ${REQUIRED_KEYS.length} required resource icons present`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
