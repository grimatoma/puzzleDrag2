// One-shot favicon rasterizer: renders public/favicon.svg to the PNG sizes
// browsers and iOS home-screen need, plus a multi-size favicon.ico.
// Run: node tools/gen-favicon.mjs   (uses the Playwright chromium already installed)
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "public/favicon.svg"), "utf8");

const PNG_SIZES = [16, 32, 48, 180, 192, 512];
const ICO_SIZES = [16, 32, 48];

const browser = await chromium.launch();
const page = await browser.newPage();

// Render the SVG onto a transparent canvas at each exact pixel size and
// return PNG bytes as base64 (high-quality smoothing for the downscales).
const pngs = await page.evaluate(async ({ svg, sizes }) => {
  const url = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  const img = new Image();
  img.src = url;
  await img.decode();
  const out = {};
  for (const s of sizes) {
    const c = document.createElement("canvas");
    c.width = s; c.height = s;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, s, s);
    ctx.drawImage(img, 0, 0, s, s);
    out[s] = c.toDataURL("image/png").split(",")[1];
  }
  return out;
}, { svg, sizes: PNG_SIZES });

await browser.close();

const buf = {};
for (const s of PNG_SIZES) buf[s] = Buffer.from(pngs[s], "base64");

// Write the standalone PNG assets.
writeFileSync(resolve(root, "public/favicon-16.png"), buf[16]);
writeFileSync(resolve(root, "public/favicon-32.png"), buf[32]);
writeFileSync(resolve(root, "public/apple-touch-icon.png"), buf[180]);
writeFileSync(resolve(root, "public/icon-192.png"), buf[192]);
writeFileSync(resolve(root, "public/icon-512.png"), buf[512]);

// Assemble a multi-size .ico (PNG-encoded entries — supported since Vista).
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);          // reserved
  header.writeUInt16LE(1, 2);          // type: icon
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  const dataChunks = [];
  entries.forEach((e, i) => {
    const d = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, d + 0); // width (0 == 256)
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, d + 1); // height
    dir.writeUInt8(0, d + 2);          // palette
    dir.writeUInt8(0, d + 3);          // reserved
    dir.writeUInt16LE(1, d + 4);       // color planes
    dir.writeUInt16LE(32, d + 6);      // bits per pixel
    dir.writeUInt32LE(e.buf.length, d + 8);
    dir.writeUInt32LE(offset, d + 12);
    offset += e.buf.length;
    dataChunks.push(e.buf);
  });
  return Buffer.concat([header, dir, ...dataChunks]);
}

const ico = buildIco(ICO_SIZES.map((s) => ({ size: s, buf: buf[s] })));
writeFileSync(resolve(root, "public/favicon.ico"), ico);

console.log("favicon assets written:");
for (const s of PNG_SIZES) console.log(`  ${s}px png: ${buf[s].length} bytes`);
console.log(`  favicon.ico: ${ico.length} bytes (${ICO_SIZES.join("/")})`);
