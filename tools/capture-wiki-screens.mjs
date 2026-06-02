/**
 * capture-wiki-screens.mjs — one-off tool to capture static screenshots of the
 * named visual scenarios embedded in wiki content pages, so the wiki can show
 * still images instead of live interactive game iframes.
 *
 * Usage: node tools/capture-wiki-screens.mjs [baseURL]
 *   baseURL defaults to http://localhost:5173/puzzleDrag2/ (the Vite dev server).
 *
 * Mirrors the determinism + freeze recipe from tests/visual/desktop-smoke.spec.ts
 * so the captures match the visual goldens' polish. Output PNGs are written to
 * src/balanceManager/wiki/assets/game-screens/<id>.png and committed.
 */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../src/balanceManager/wiki/assets/game-screens");
const BASE = process.argv[2] ?? "http://localhost:5173/puzzleDrag2/";
const VISUAL_FIXED_NOW = 1_700_000_000_000;

// Scenarios embedded in src/balanceManager/content/**. board* scenarios render
// on the Phaser canvas and need the extra grid wait.
const SCENARIOS = [
  { id: "town-home-built-out", board: false },
  { id: "board-season-winter-wheel", board: true },
  { id: "board-farm-idle", board: true },
  { id: "map-current-home", board: false },
  { id: "crafting-bakery", board: false },
  { id: "townsfolk-bosses", board: false },
];

async function capture(page, scenario) {
  await page.addInitScript(({ fixedNow }) => {
    window.__HEARTH_VISUAL_TESTING__ = true;
    window.__HEARTH_DISABLE_DIALOGS__ = true;
    let seed = 123456789;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    Date.now = () => fixedNow;
    window.localStorage.clear();
    window.localStorage.setItem("hearth.tutorial.seen", "1");
  }, { fixedNow: VISUAL_FIXED_NOW });

  await page.goto(`${BASE}?visual=${encodeURIComponent(scenario.id)}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__hearthVisual?.ready);
  await page.evaluate(() => window.__hearthVisual.ready);
  await page.waitForSelector('[data-visual-root="app"]');
  if (scenario.board) {
    await page.waitForFunction(() => window.__phaserScene?.grid?.flat?.().filter(Boolean).length >= 36);
    await page.evaluate(() => window.__hearthVisual.syncScene());
  }
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__hearthVisual.freeze());
  await page.waitForTimeout(150);

  const out = resolve(OUT_DIR, `${scenario.id}.png`);
  await page.locator('[data-visual-root="app"]').screenshot({
    path: out,
    animations: "disabled",
    caret: "hide",
    timeout: 60_000,
  });
  console.log(`captured ${scenario.id} -> ${out}`);
}

(async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  // 4:3-ish desktop viewport, matching the goldens' framing.
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const scenario of SCENARIOS) {
    await capture(page, scenario);
  }
  await browser.close();
  if (errors.length) {
    console.error("page errors:", errors);
    process.exit(1);
  }
  console.log("done");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
