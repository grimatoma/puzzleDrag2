// Generates the PWA icon set (+ favicon.svg) from the Hearthlands hearth mark.
//
// Rasterizes SVG → PNG with the already-installed Playwright Chromium, so it
// needs no native image deps (sharp / ImageMagick). Run once, and again after
// tweaking the mark:
//
//   node tools/gen-pwa-icons.mjs
//
// Outputs into public/ (copied to the site root at build): pwa-192.png,
// pwa-512.png, pwa-maskable-512.png, apple-touch-icon.png, favicon.svg.
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pub = resolve(root, "public");
mkdirSync(pub, { recursive: true });

// The hearth mark, authored around the origin in a ~120×134 unit box (mirrors
// the boot splash in index.html). Logs rotate about their own centre.
const MARK = `
  <ellipse cx="0" cy="6" rx="50" ry="46" fill="#ffb24a" opacity="0.38"/>
  <ellipse cx="0" cy="53" rx="40" ry="7" fill="#3c2814" opacity="0.16"/>
  <rect x="-38" y="42" width="76" height="13" rx="6.5" fill="#6e4a2c" transform="rotate(-8 0 48)"/>
  <rect x="-38" y="42" width="76" height="13" rx="6.5" fill="#825b37" transform="rotate(9 0 48)"/>
  <path d="M -26,42 C -36,8 -20,-16 0,-56 C 20,-16 36,8 26,42 C 14,54 -14,54 -26,42 Z" fill="#e0631f"/>
  <path d="M -17,42 C -24,12 -12,-8 0,-38 C 12,-8 24,12 17,42 C 9,52 -9,52 -17,42 Z" fill="#ffaa2b"/>
  <path d="M -9,42 C -13,18 -6,2 0,-20 C 6,2 13,18 9,42 C 5,49 -5,49 -9,42 Z" fill="#ffe49a"/>
`;

// coverage = fraction of the icon the mark spans. Maskable needs a safe margin
// because the OS may crop the icon to a circle/squircle.
function svg(size, coverage) {
  const scale = (100 * coverage) / 134; // mark box is 134 units on its tall side
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="78%">
      <stop offset="0%" stop-color="#f6efe0"/>
      <stop offset="58%" stop-color="#e9dfc6"/>
      <stop offset="100%" stop-color="#ddd0b1"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#bg)"/>
  <g transform="translate(50 53) scale(${scale})">${MARK}</g>
</svg>`;
}

const targets = [
  { file: "pwa-192.png", size: 192, coverage: 0.82 },
  { file: "pwa-512.png", size: 512, coverage: 0.82 },
  { file: "pwa-maskable-512.png", size: 512, coverage: 0.6 },
  { file: "apple-touch-icon.png", size: 180, coverage: 0.78 },
];

// favicon stays vector (crisp at every size)
writeFileSync(resolve(pub, "favicon.svg"), svg(512, 0.82).trim() + "\n");
console.log("wrote public/favicon.svg");

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${svg(t.size, t.coverage)}</body></html>`,
    { waitUntil: "load" },
  );
  await page.screenshot({
    path: resolve(pub, t.file),
    clip: { x: 0, y: 0, width: t.size, height: t.size },
  });
  console.log("wrote public/" + t.file);
}
await browser.close();
console.log("done");
