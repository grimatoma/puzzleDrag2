// docs/zones — headless verify harness. Loads a generated doc, reports console/page errors,
// confirms every zone canvas actually painted (non-blank), and writes review screenshots.
// Usage: node docs/zones/verify.mjs [relativeHtmlPath]
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] || "index.html";
const htmlPath = resolve(__dir, target);
const url = pathToFileURL(htmlPath).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
const errors = [], warns = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); if (m.type() === "warning") warns.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + (e.message || e)));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1600); // let canvases animate a few frames

// confirm each zone canvas painted something (sample non-transparent pixels)
const painted = await page.evaluate(() => {
  const out = {};
  document.querySelectorAll("canvas[data-zone],canvas[data-layout]").forEach((cv) => {
    cv.dataset.zone = cv.dataset.zone || cv.dataset.layout;
    const ctx = cv.getContext("2d");
    let nz = 0;
    try { const d = ctx.getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4 * 997) if (d[i] > 8) nz++; } catch (e) { nz = -1; }
    out[cv.dataset.zone] = nz;
  });
  return out;
});

const outDir = join(__dir, "_review");
import("node:fs").then((fs) => fs.mkdirSync(outDir, { recursive: true }));
await page.screenshot({ path: join(outDir, "atlas-full.png"), fullPage: true });
// a couple of close-ups
const ids = Object.keys(painted);
for (const id of [ids[0], ids[1], ids[6], ids[7]].filter(Boolean)) {
  const el = await page.$(`#zone-${id}`);
  if (el) await el.screenshot({ path: join(outDir, `zone-${id}.png`) });
}

await browser.close();
const blanks = Object.entries(painted).filter(([, v]) => v <= 0).map(([k]) => k);
console.log("painted (non-blank pixel samples per zone):", JSON.stringify(painted));
console.log(blanks.length ? "⚠ BLANK canvases: " + blanks.join(", ") : "✓ all zone canvases painted");
console.log(errors.length ? "⚠ console errors:\n  " + errors.join("\n  ") : "✓ no console/page errors");
if (warns.length) console.log("(warnings: " + warns.length + ")");
console.log("screenshots → docs/zones/_review/");
if (errors.length || blanks.length) process.exit(1);
