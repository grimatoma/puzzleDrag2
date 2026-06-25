// Seasonal-TILE review harness — companion to render-icons.mjs.
//
// public/seasonal-tiles/<subject>/<sheet>.png are horizontal frame strips
// (frame size = image height). This re-emits each sheet as a review strip:
// every frame composited (nearest-neighbour, integer upscale) onto a CELL x CELL
// cell over a two-tone backdrop so transparency / edge fringing / off-center
// pad is visible. Each output strip is N cells wide and the report CSS-animates
// it via steps(N).
//
//   icon-review/seasonal/<subject>/<sheet>.png   (frame strip)
//   icon-review/seasonal/_manifest.json
//
// Usage (dev server at $ICON_BASE serving /puzzleDrag2/seasonal-tiles/...):
//   node reference/tools/render-seasonal.mjs
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readdirSync, statSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const BASE = process.env.ICON_BASE || "http://localhost:5173/puzzleDrag2/";
const OUT = resolve("icon-review/seasonal");
const ROOT = resolve("public/seasonal-tiles");
const TARGET = 144;  // cell px; frames upscaled by floor(TARGET/src) (>=1, integer)

function pngDim(f) { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }

const subjects = readdirSync(ROOT).filter((s) => statSync(join(ROOT, s)).isDirectory());
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(BASE, { waitUntil: "domcontentloaded" });

const manifest = [];
let total = 0;
for (const sub of subjects) {
  const dir = join(ROOT, sub);
  const sheets = readdirSync(dir).filter((f) => f.endsWith(".png"));
  const entry = { subject: sub, sheets: [] };
  for (const sheet of sheets) {
    const { w, h } = pngDim(join(dir, sheet));
    const frames = Math.max(1, Math.round(w / h));
    const scale = Math.max(1, Math.floor(TARGET / h));
    const cell = h * scale;
    const url = `${BASE}seasonal-tiles/${sub}/${sheet}`;
    const dataUrl = await page.evaluate(async ({ url, frames, fh: h, cell, scale }) => {
      const img = await new Promise((res, rej) => {
        const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url;
      });
      const c = document.createElement("canvas");
      c.width = cell * frames; c.height = cell;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < frames; i++) {
        const x0 = i * cell;
        ctx.fillStyle = "#2a2d33"; ctx.fillRect(x0, 0, cell, cell);
        ctx.fillStyle = "#efe8da";
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + cell, 0); ctx.lineTo(x0, cell); ctx.closePath(); ctx.fill();
        ctx.drawImage(img, i * h, 0, h, h, x0, 0, h * scale, h * scale);
        ctx.strokeStyle = "rgba(0,0,0,0.30)"; ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, 0.5, cell - 1, cell - 1);
      }
      return c.toDataURL("image/png");
    }, { url, frames, fh: h, cell, scale });
    const outDir = `${OUT}/${sub}`;
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}/${sheet}`, Buffer.from(dataUrl.split(",")[1], "base64"));
    entry.sheets.push({ sheet, frames, srcPx: h, cell });
    total++;
  }
  manifest.push(entry);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/_manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`rendered ${total} seasonal strips across ${subjects.length} subjects -> ${OUT}`);
await browser.close();
