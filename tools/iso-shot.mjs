// Screenshot helper for the iso building gallery.
// Usage:
//   node tools/iso-shot.mjs gallery                 → /tmp/iso/gallery.png
//   node tools/iso-shot.mjs <key>                   → before/after isolated crops for one building
//   node tools/iso-shot.mjs <key> zoom              → 2x zoom of the "after" crop
// Assumes the dev server is running at http://localhost:5173/puzzleDrag2/iso/.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.ISO_BASE || "http://localhost:5173/puzzleDrag2/iso/";
const OUT = "/tmp/iso";
mkdirSync(OUT, { recursive: true });

const arg = process.argv[2] || "gallery";
const zoom = process.argv[3] === "zoom";

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
page.on("console", (m) => { if (m.type() === "error") console.log("  [console.error]", m.text()); });
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

async function settle() {
  await page.waitForTimeout(900); // let SVG + animations mount
}

if (arg === "gallery") {
  await page.setViewportSize({ width: 1280, height: 2200 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await settle();
  await page.screenshot({ path: `${OUT}/gallery.png`, fullPage: true });
  console.log(`wrote ${OUT}/gallery.png`);
} else {
  const key = arg;
  await page.setViewportSize({ width: 1100, height: 720 });
  await page.goto(`${BASE}?building=${key}`, { waitUntil: "networkidle" });
  await settle();
  const before = page.locator(`[data-building="${key}"][data-side="before"]`);
  const after = page.locator(`[data-building="${key}"][data-side="after"]`);
  if (await before.count()) {
    await before.screenshot({ path: `${OUT}/${key}-before.png` });
    console.log(`wrote ${OUT}/${key}-before.png`);
  }
  if (await after.count()) {
    await after.screenshot({ path: `${OUT}/${key}-after.png` });
    console.log(`wrote ${OUT}/${key}-after.png`);
    if (zoom) {
      // re-screenshot the after box at higher dpr for close inspection
      const box = await after.boundingBox();
      if (box) {
        await page.screenshot({
          path: `${OUT}/${key}-after-zoom.png`,
          clip: { x: box.x + box.width * 0.18, y: box.y + box.height * 0.12, width: box.width * 0.64, height: box.height * 0.7 },
        });
        console.log(`wrote ${OUT}/${key}-after-zoom.png`);
      }
    }
  }
}

await browser.close();
