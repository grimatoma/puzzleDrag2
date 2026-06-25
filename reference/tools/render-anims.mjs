// Icon-ANIMATION review harness — companion to render-icons.mjs.
//
// For every key in ICON_ANIMATIONS, renders N frames sampled across a fixed
// time window into a single horizontal FRAME-STRIP PNG (each frame CELL x CELL,
// composited on a subtle two-tone background so transparency/stray fills are
// visible). The strip doubles as (a) a montage a reviewer can read frame-to-
// frame and (b) a sprite-strip the report CSS-animates via steps(N).
//
//   icon-review/anims/<module>/<key>.png        (frame strip, N cells wide)
//   icon-review/anims/_manifest.json            (key -> {module,color,frames,cell})
//
// Usage (dev server at $ICON_BASE, default localhost:5173):
//   node reference/tools/render-anims.mjs
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.ICON_BASE || "http://localhost:5173/puzzleDrag2/";
const OUT = resolve("icon-review");
const CELL = 112;          // px per frame (design box 64 upscaled ~1.75x)
const N = 14;              // frames per strip
const DT = 0.32;           // seconds between sampled frames (~4.2s window)

// key -> {module,color} from the still manifest (already written by render-icons).
let meta = {};
try {
  for (const r of JSON.parse(readFileSync(`${OUT}/manifest.json`, "utf8")))
    meta[r.key] = { module: r.module, color: r.color };
} catch { /* manifest optional */ }

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(BASE, { waitUntil: "domcontentloaded" });

const keys = await page.evaluate(async () => {
  const a = await import("/puzzleDrag2/src/textures/iconAnimations.js");
  return [...a.ANIMATED_ICON_KEYS];
});
console.log("animated keys:", keys.length);

const manifest = [];
let n = 0;
for (const key of keys) {
  const color = meta[key]?.color || "#9a8";
  const module = (meta[key]?.module || "unknown").replace(/[^a-z0-9_-]/gi, "_");
  const dataUrl = await page.evaluate(async ({ key, color, CELL, N, DT }) => {
    const anim = await import("/puzzleDrag2/src/textures/iconAnimations.js");
    const { ICON_DESIGN_BOX } = await import("/puzzleDrag2/src/textures/paintIcon.js");
    const fn = anim.iconAnimation(key);
    const c = document.createElement("canvas");
    c.width = CELL * N; c.height = CELL;
    const ctx = c.getContext("2d");
    for (let i = 0; i < N; i++) {
      const x0 = i * CELL;
      // two-tone backdrop: light top-left wedge, dark elsewhere
      ctx.fillStyle = "#2a2d33"; ctx.fillRect(x0, 0, CELL, CELL);
      ctx.fillStyle = "#efe8da";
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + CELL, 0); ctx.lineTo(x0, CELL); ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.translate(x0, 0);
      // replicate paintDrawIntoCell: faint disc tint + center + scale
      ctx.save();
      ctx.beginPath(); ctx.arc(CELL / 2, CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = color + "22"; ctx.fill();
      ctx.restore();
      ctx.translate(CELL / 2, CELL / 2);
      const s = CELL / ICON_DESIGN_BOX; ctx.scale(s, s);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      try { if (fn) fn(ctx, i * DT); } catch (e) { /* skip broken */ }
      ctx.restore();
      // frame divider
      ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, 0.5, CELL - 1, CELL - 1);
    }
    return c.toDataURL("image/png");
  }, { key, color, CELL, N, DT });
  const modDir = `${OUT}/anims/${module}`;
  mkdirSync(modDir, { recursive: true });
  writeFileSync(`${modDir}/${key}.png`, Buffer.from(dataUrl.split(",")[1], "base64"));
  manifest.push({ key, module, color, frames: N, cell: CELL, dt: DT });
  n++;
}
mkdirSync(`${OUT}/anims`, { recursive: true });
writeFileSync(`${OUT}/anims/_manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`rendered ${n} animation strips -> ${OUT}/anims`);
await browser.close();
