/**
 * export-tool-icons.mjs — companion to export-v1-resources.mjs for TOOL icons.
 *
 * Tool icons (bomb, axe, scythe, …) are drawn procedurally by paintIcon() on demand
 * and are NOT pre-rasterised into Phaser's texture cache, so the texture-cache export
 * (export-v1-resources.mjs) can't see them. This drives the live Vite app, dynamically
 * imports the canonical paintIcon module from the dev server's module graph, paints each
 * tool key onto a 90px canvas, and writes godot/assets/resources/<key>.png — the SAME
 * folder the resource icons land in, so UiKit.make_icon() picks them up unchanged.
 *
 * Usage:
 *   npm run dev                       # start the Vite dev server first
 *   node tools/export-tool-icons.mjs  # appends tool PNGs to godot/assets/resources/
 */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const BASE = arg("base", "http://localhost:5173/puzzleDrag2/");
const OUT_DIR = resolve(__dirname, "..", arg("out", "godot/assets/resources"));
const SCENARIO = arg("scenario", "board-farm-idle");

// The tools the Godot ToolConfig references (godot/scripts/ToolConfig.gd). paintIcon
// uses the tool key itself as the icon key.
const TOOL_KEYS = [
  "bomb", "rake", "sickle", "auger", "blast_charge",
  "axe", "scythe", "stone_hammer", "drill", "magnet",
  // Tools PR1 — catalog-parity board tools (reuse existing ToolEffects powers).
  "bird_cage", "scythe_full", "hoe", "iron_pick",
  "plough", "fruit_picker", "herders_crook", "milk_churn", "saddle",
  "coal_hammer", "gold_pick", "trimmer", "bee", "coal_transmuter",
  // Tools PR2 — new powers (transform_random_n / reshuffle_board / clear_hazard).
  "basic", "rare", "shuffle", "cat", "terrier",
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.addInitScript(() => {
    window.__HEARTH_VISUAL_TESTING__ = true;
    window.__HEARTH_DISABLE_DIALOGS__ = true;
    window.localStorage.setItem("hearth.tutorial.seen", "1");
  });

  const url = `${BASE}?visual=${encodeURIComponent(SCENARIO)}`;
  console.log(`> loading ${url}`);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__hearthVisual?.ready);

  // Dynamically import the canonical icon painter straight out of Vite's module graph,
  // then paint each tool key onto a transparent 90px canvas.
  const { exported, failed } = await page.evaluate(async ({ keys, base }) => {
    const mod = await import(`${base}src/textures/paintIcon.ts`);
    const paintIcon = mod.paintIcon;
    const exported = {};
    const failed = [];
    for (const key of keys) {
      try {
        const c = document.createElement("canvas");
        c.width = 90; c.height = 90;
        const ctx = c.getContext("2d");
        paintIcon(ctx, key, 90);
        // Reject a blank paint (paintIcon falls back to nothing for unknown keys).
        const data = ctx.getImageData(0, 0, 90, 90).data;
        let nonEmpty = false;
        for (let i = 3; i < data.length; i += 4) { if (data[i] !== 0) { nonEmpty = true; break; } }
        if (!nonEmpty) { failed.push(key); continue; }
        exported[key] = c.toDataURL("image/png");
      } catch (e) {
        failed.push(`${key} (${e})`);
      }
    }
    return { exported, failed };
  }, { keys: TOOL_KEYS, base: BASE });

  await browser.close();

  if (errors.length) console.warn("! page errors:", errors.slice(0, 3));

  const keys = Object.keys(exported);
  if (keys.length === 0) {
    console.error("! no tool icons painted — paintIcon import path or keys wrong");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const key of keys) {
    const buf = Buffer.from(exported[key].split(",")[1], "base64");
    writeFileSync(resolve(OUT_DIR, `${key}.png`), buf);
    console.log(`  wrote ${key}.png  (${buf.length} bytes)`);
  }
  if (failed.length) console.warn(`  (no art for: ${failed.join(", ")})`);
  console.log(`\n✓ exported ${keys.length} tool icon(s) to ${OUT_DIR}`);
})().catch((err) => { console.error(err); process.exit(1); });
