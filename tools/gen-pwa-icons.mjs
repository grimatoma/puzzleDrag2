// tools/gen-pwa-icons.mjs
//
// Rasterizes the Hearthlands hearth logo into the PWA install icons under
// public/icons/. The hearth/flame artwork is lifted verbatim from the boot
// splash in index.html, so the installed-app icon matches the loading screen.
//
// Uses Playwright's bundled Chromium (already a devDependency for the visual
// tests) to render the SVG at exact pixel sizes — no extra image tooling.
//
//   node tools/gen-pwa-icons.mjs
//
// Commit the generated PNGs + favicon.svg; re-run only when the logo changes.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// The hearth + flame in its own coordinate space (~x[-40..40], y[-56..55]),
// copied from the #boot-splash SVG in index.html.
const HEARTH = `
  <ellipse cx="0" cy="6" rx="50" ry="46" fill="#ffb24a" opacity="0.5"/>
  <ellipse cx="0" cy="53" rx="40" ry="7" fill="rgba(60,40,20,0.16)"/>
  <rect x="-38" y="42" width="76" height="13" rx="6.5" fill="#6e4a2c" transform="rotate(-8)"/>
  <rect x="-38" y="42" width="76" height="13" rx="6.5" fill="#825b37" transform="rotate(9)"/>
  <path d="M -26,42 C -36,8 -20,-16 0,-56 C 20,-16 36,8 26,42 C 14,54 -14,54 -26,42 Z" fill="#e0631f"/>
  <path d="M -17,42 C -24,12 -12,-8 0,-38 C 12,-8 24,12 17,42 C 9,52 -9,52 -17,42 Z" fill="#ffaa2b"/>
  <path d="M -9,42 C -13,18 -6,2 0,-20 C 6,2 13,18 9,42 C 5,49 -5,49 -9,42 Z" fill="#ffe49a"/>
`;

// Build the icon SVG in a 100×100 space.
//   maskable=false → rounded "app tile" with transparent corners.
//   maskable=true  → full-bleed background, hearth shrunk into the central
//                    safe zone so OS masking never clips it.
function svg({ maskable }) {
  const h = maskable ? 52 : 66;       // hearth height in the 100-unit space
  const s = h / 111;                  // hearth local bbox is ~111 tall
  const rx = maskable ? 0 : 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="78%">
      <stop offset="0%" stop-color="#f6efe0"/>
      <stop offset="55%" stop-color="#ecdfc3"/>
      <stop offset="100%" stop-color="#d8c4a0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" rx="${rx}" fill="url(#bg)"/>
  <g transform="translate(50 50) scale(${s.toFixed(4)})">${HEARTH}</g>
</svg>`;
}

const TARGETS = [
  { file: "pwa-192.png", size: 192, maskable: false },
  { file: "pwa-512.png", size: 512, maskable: false },
  { file: "pwa-192-maskable.png", size: 192, maskable: true },
  { file: "pwa-512-maskable.png", size: 512, maskable: true },
  // iOS masks the corners itself and renders transparency as black, so the
  // apple-touch-icon is full-bleed (maskable styling).
  { file: "apple-touch-icon.png", size: 180, maskable: true },
];

const browser = await chromium.launch();
try {
  for (const t of TARGETS) {
    const page = await browser.newPage({
      viewport: { width: t.size, height: t.size },
      deviceScaleFactor: 1,
    });
    const markup = svg({ maskable: t.maskable }).replace(
      'viewBox="0 0 100 100"',
      `width="${t.size}" height="${t.size}" viewBox="0 0 100 100"`,
    );
    await page.setContent(
      `<!doctype html><meta charset="utf8"><style>*{margin:0;padding:0}html,body{width:${t.size}px;height:${t.size}px}</style>${markup}`,
      { waitUntil: "load" },
    );
    const el = await page.$("svg");
    // omitBackground keeps the rounded-tile corners transparent.
    const buf = await el.screenshot({ omitBackground: true });
    writeFileSync(resolve(outDir, t.file), buf);
    await page.close();
    console.log(`  ✓ ${t.file} (${t.size}×${t.size})`);
  }
  // Crisp vector favicon for desktop browser tabs.
  writeFileSync(resolve(outDir, "favicon.svg"), `${svg({ maskable: false }).trim()}\n`);
  console.log("  ✓ favicon.svg");
} finally {
  await browser.close();
}
console.log(`PWA icons written to ${outDir}`);
