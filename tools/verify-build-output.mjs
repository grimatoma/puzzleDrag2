#!/usr/bin/env node
// tools/verify-build-output.mjs — post-build guardrails for dist/.
//
// Ported from the retired tests/phase-12-build.test.ts. That test ran a full
// `npm run build` INSIDE the vitest process to inspect dist/ — which belongs in
// the build job, not the unit loop. This standalone script inspects the
// ALREADY-BUILT dist/ directory and exits non-zero (with a clear message) if any
// chunk / bundle / PWA invariant is violated.
//
// Assumes dist/ already exists — CI runs it AFTER `npm run build`.
//   $ npm run build && node tools/verify-build-output.mjs

import {
  readdirSync,
  readFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const distDir = resolve(root, "dist");
const assetsDir = resolve(distDir, "assets");

const failures = [];
const fail = (msg) => failures.push(msg);

// Recursively list all files under a directory, returning relative paths
// (forward-slash separated), or [] if the directory does not exist.
function listFilesRecursive(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      for (const sub of listFilesRecursive(full)) results.push(entry + "/" + sub);
    } else {
      results.push(entry);
    }
  }
  return results;
}

// ── Precondition ─────────────────────────────────────────────────────────────
if (!existsSync(distDir)) {
  console.error(
    "verify-build-output: dist/ does not exist. Run `npm run build` first.",
  );
  process.exit(1);
}
if (!existsSync(assetsDir)) {
  console.error("verify-build-output: dist/assets/ does not exist — build looks incomplete.");
  process.exit(1);
}

const assetFiles = listFilesRecursive(assetsDir);
const gz = (relPath) => gzipSync(readFileSync(resolve(assetsDir, relPath))).length;

// ── dist/ shell ──────────────────────────────────────────────────────────────
if (!existsSync(resolve(distDir, "index.html"))) {
  fail("dist/index.html is missing");
}

// ── Vendor chunk splitting ───────────────────────────────────────────────────
const phaserChunk = assetFiles.find(
  (f) => /phaser/i.test(f) && f.endsWith(".js") && !f.endsWith(".map"),
);
if (!phaserChunk) fail("expected a phaser-named vendor chunk under dist/assets/");

const reactChunk = assetFiles.find(
  (f) => /react/i.test(f) && f.endsWith(".js") && !f.endsWith(".map"),
);
if (!reactChunk) fail("expected a react-named vendor chunk under dist/assets/");

// ── Main entry chunk ─────────────────────────────────────────────────────────
const entryChunk = assetFiles.find(
  (f) => /^index-/.test(f) && f.endsWith(".js") && !f.includes("phaser"),
);
if (!entryChunk) {
  fail("expected a main index-*.js entry chunk under dist/assets/");
} else {
  const size = gz(entryChunk);
  if (size >= 2 * 1024 * 1024) {
    fail(`main entry chunk too large: ${size} bytes gzipped (budget 2MB)`);
  }
}

// ── Phaser chunk size budget ─────────────────────────────────────────────────
const phaserVendor = assetFiles.find(
  (f) =>
    /phaser/i.test(f) &&
    f.endsWith(".js") &&
    !f.endsWith(".map") &&
    !f.startsWith("phaser-C"),
);
if (!phaserVendor) {
  fail("phaser vendor chunk should exist (for the size budget check)");
} else {
  const size = gz(phaserVendor);
  if (size >= 400 * 1024) {
    fail(`phaser chunk too large: ${size} bytes gzipped (budget 400KB)`);
  }
}

// ── The /b/ Dev Panel bundle must NOT pull in phaser ─────────────────────────
// The Dev Panel builds to its own HTML + JS (vite input `balance`); phaser is
// deliberately kept out of it (see vite.config.js manualChunks). Confirm none of
// the scripts/modulepreloads the /b/ page references is the phaser chunk.
const bIndexPath = resolve(distDir, "b/index.html");
if (!existsSync(bIndexPath)) {
  fail("dist/b/index.html is missing (Dev Panel bundle not built)");
} else {
  const bHtml = readFileSync(bIndexPath, "utf8");
  const referenced = [...bHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const pullsPhaser = referenced.some((ref) => /phaser/i.test(ref));
  if (pullsPhaser) {
    fail(
      "the /b/ Dev Panel bundle references a phaser chunk — it must stay phaser-free",
    );
  }
}

// ── Total first-load JS+CSS budget ───────────────────────────────────────────
{
  const codeAssets = assetFiles.filter(
    (f) => (f.endsWith(".js") || f.endsWith(".css")) && !f.endsWith(".map"),
  );
  const total = codeAssets.reduce((sum, f) => sum + gz(f), 0);
  if (total >= 5 * 1024 * 1024) {
    fail(`total gzipped JS+CSS too large: ${total} bytes (ceiling 5MB)`);
  }
}

// ── Pre-compressed .gz / .br siblings for significant assets ─────────────────
{
  const codeAssets = assetFiles.filter((f) => {
    if (!((f.endsWith(".js") || f.endsWith(".css")) && !f.endsWith(".map"))) return false;
    return statSync(resolve(assetsDir, f)).size > 1024; // skip tiny shims
  });
  for (const f of codeAssets) {
    if (!assetFiles.includes(f + ".gz")) fail(`${f}.gz missing (pre-compression)`);
    if (!assetFiles.includes(f + ".br")) fail(`${f}.br missing (pre-compression)`);
  }
}

// ── Bundle analyzer output ───────────────────────────────────────────────────
if (!existsSync(resolve(distDir, "stats.html"))) {
  fail("dist/stats.html (bundle analyzer) is missing");
}

// ── No sourcemaps leak into the production build ─────────────────────────────
{
  const map = assetFiles.find(
    (f) => f.endsWith(".js.map") || f.endsWith(".css.map"),
  );
  if (map) fail(`unexpected sourcemap in prod build: ${map}`);
}

// ── index.html modulepreload hints ───────────────────────────────────────────
{
  const html = readFileSync(resolve(distDir, "index.html"), "utf8");
  if (!/rel="modulepreload"/.test(html)) {
    fail('dist/index.html has no rel="modulepreload" hints');
  }
}

// ── Installable web app manifest + icons ─────────────────────────────────────
{
  const manifestPath = resolve(distDir, "site.webmanifest");
  if (!existsSync(manifestPath)) {
    fail("dist/site.webmanifest is missing");
  } else {
    const m = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (!m.name) fail("site.webmanifest has no name");
    if (m.display !== "standalone") fail('site.webmanifest display is not "standalone"');
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    if (!sizes.includes("192x192")) fail("site.webmanifest missing a 192x192 icon");
    if (!sizes.includes("512x512")) fail("site.webmanifest missing a 512x512 icon");
    for (const ic of m.icons ?? []) {
      if (!existsSync(resolve(distDir, ic.src))) fail(`declared icon ${ic.src} not emitted`);
    }
  }
}

// ── Service worker + registration shim linked from index.html ────────────────
{
  if (!existsSync(resolve(distDir, "sw.js"))) fail("dist/sw.js is missing");
  if (!existsSync(resolve(distDir, "registerSW.js"))) fail("dist/registerSW.js is missing");
  const html = readFileSync(resolve(distDir, "index.html"), "utf8");
  if (!/rel="manifest"/.test(html)) fail('dist/index.html has no rel="manifest" link');
  if (!/registerSW\.js/.test(html)) fail("dist/index.html does not link registerSW.js");
  if (!/rel="apple-touch-icon"/.test(html)) fail('dist/index.html has no apple-touch-icon link');
}

// ── SW navigateFallback denylist covers the standalone apps ──────────────────
{
  const swPath = resolve(distDir, "sw.js");
  if (existsSync(swPath)) {
    const sw = readFileSync(swPath, "utf8");
    for (const route of ["b", "story", "docs"]) {
      // Forward slashes are escaped in the serialized RegExp source (\/).
      if (!sw.includes(`puzzleDrag2\\/${route}\\/`)) {
        fail(`sw.js navigateFallbackDenylist should cover /${route}/`);
      }
    }
  }
}

// ── SW stays out of dist/assets/ (or the asset guardrails above miss it) ─────
{
  if (assetFiles.some((f) => f === "sw.js" || /(^|\/)workbox-/.test(f))) {
    fail("service worker / workbox runtime leaked into dist/assets/");
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length > 0) {
  console.error(`verify-build-output: ${failures.length} invariant(s) violated:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log("verify-build-output: all dist/ invariants hold ✓");
