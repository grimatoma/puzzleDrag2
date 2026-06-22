// Headless frame-capture for the animated CANVAS icons (the Dev Panel "Icons" tab
// library). Renders each `(ctx,t)=>void` animation faithfully in a real browser
// canvas (same translate/scale wrapper the Dev Panel uses) at high resolution and
// writes per-frame PNGs to docs/canvas-tile-review/frames/<key>/f##.png.
//
// Run (dev server must be up):  node tools/icon-review/capture.mjs
// Env: DEV_ORIGIN (default http://localhost:5199), APP_BASE (default /puzzleDrag2/),
//      N (frames, default 16), SPAN (seconds sampled, default 4), SCALE (px/unit,
//      default 8 -> 512px), KEY_LIMIT (cap for smoke test), ONLY (comma keys/prefixes).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";

const ORIGIN = process.env.DEV_ORIGIN || "http://localhost:5199";
const APP_BASE = process.env.APP_BASE || "/puzzleDrag2/";
const OUT = "docs/canvas-tile-review/frames";
const N = Number(process.env.N || 16);
const SPAN = Number(process.env.SPAN || 4.0);
const SCALE = Number(process.env.SCALE || 8);
const BOX = 64;
const LIMIT = Number(process.env.KEY_LIMIT || 0);
const ONLY = (process.env.ONLY || "").split(",").map(s => s.trim()).filter(Boolean);

const IMPORTS = [APP_BASE + "src/textures/iconAnimations.ts", APP_BASE + "src/textures/iconAnimations.js"];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
page.on("pageerror", e => console.error("PAGEERR", e.message));
await page.goto(ORIGIN + APP_BASE + "b/", { waitUntil: "load", timeout: 60000 });

let keys = await page.evaluate(async (imports) => {
  let m = null, err = "";
  for (const p of imports) { try { m = await import(p); break; } catch (e) { err = String(e); } }
  if (!m) return { error: err };
  return { keys: [...m.ANIMATED_ICON_KEYS] };
}, IMPORTS);
if (keys.error) { console.error("import failed:", keys.error); await browser.close(); process.exit(1); }
keys = keys.keys;
if (ONLY.length) keys = keys.filter(k => ONLY.some(o => k === o || k.startsWith(o)));
if (LIMIT) keys = keys.slice(0, LIMIT);
console.log("animated keys to capture:", keys.length);

let done = 0;
for (const key of keys) {
  const frames = await page.evaluate(async ({ key, N, SPAN, SCALE, BOX, imports }) => {
    let m = null;
    for (const p of imports) { try { m = await import(p); break; } catch (e) { /* try next */ } }
    const fn = m.iconAnimation(key);
    if (!fn) return null;
    const S = BOX * SCALE;
    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const ctx = c.getContext("2d");
    const out = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * SPAN;
      ctx.clearRect(0, 0, S, S);
      ctx.save();
      ctx.translate(S / 2, S / 2);
      ctx.scale(SCALE, SCALE);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      try { fn(ctx, t); } catch (e) { /* leave frame as-is */ }
      ctx.restore();
      out.push(c.toDataURL("image/png"));
    }
    return out;
  }, { key, N, SPAN, SCALE, BOX, imports: IMPORTS });
  if (!frames) { console.log("NO-FN", key); continue; }
  const dir = `${OUT}/${key}`;
  mkdirSync(dir, { recursive: true });
  frames.forEach((d, i) => writeFileSync(`${dir}/f${String(i).padStart(2, "0")}.png`, Buffer.from(d.split(",")[1], "base64")));
  done++;
  if (done % 20 === 0) console.log(`  …${done}/${keys.length}`);
}
console.log(`captured ${done} icons -> ${OUT}`);
await browser.close();
