// Build a self-contained, committable snapshot of the sprite-pipeline review viewer into
// `docs/pixel-pipeline-viewer/`, so it deploys to GitHub Pages alongside the docs site
// (`tools/build-docs.mjs` mirrors every tracked file under `docs/` into `dist/docs/`).
//
// Why a wrapper instead of `build_viewer.mjs` directly: that builder emits a viewer whose
// asset URLs are RELATIVE paths back into `godot/assets/tiles/v2/` (e.g.
// `../sets/birch/previews/...`). Those paths don't exist under the deployed `docs/` tree, so
// the images would 404 on Pages. This wrapper runs the builder into a temp dir, then COPIES
// every referenced asset into `docs/pixel-pipeline-viewer/assets/<path-under-v2>/` and rewrites
// the `data.json` URLs to point at those local copies — producing a fully self-contained static
// site that needs no `godot/` tree at runtime.
//
// The viewer degrades to read-only on a static host: its control-server POSTs (/api/*) 404 and
// comments fall back to localStorage (see viewer.js header), which is exactly what we want for a
// published review snapshot.
//
// Node built-ins only (no npm deps). Re-runnable + idempotent: it wipes and rebuilds the output.
//
//   node tools/build-pixel-pipeline-viewer.mjs

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const V2 = join(repoRoot, "godot", "assets", "tiles", "v2");
const PIPELINE = join(V2, "pipeline.json");
const BUILDER = join(
  repoRoot,
  ".claude",
  "skills",
  "sprite-pipeline",
  "scripts",
  "build_viewer.mjs",
);
const OUT = join(repoRoot, "docs", "pixel-pipeline-viewer");

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};
const toPosix = (p) => p.split(sep).join("/");

if (!isFile(PIPELINE)) {
  console.error(`pipeline.json not found: ${PIPELINE}`);
  process.exit(1);
}
if (!isFile(BUILDER)) {
  console.error(`build_viewer.mjs not found: ${BUILDER}`);
  process.exit(1);
}

// 1. Build the viewer into a throwaway temp dir. Its asset URLs are relative to this dir.
const tmp = mkdtempSync(join(tmpdir(), "pixel-viewer-"));
execFileSync("node", [BUILDER, "--pipeline", PIPELINE, "--out", tmp], {
  stdio: "inherit",
});

// 2. Deep-walk data.json; any string that resolves (against tmp) to a real file inside V2 is an
//    asset reference — copy it under OUT/assets/<path-relative-to-V2> and rewrite to that URL.
const data = JSON.parse(readFileSync(join(tmp, "data.json"), "utf8"));
const copied = new Set();

function rewrite(value) {
  if (typeof value === "string" && value !== "") {
    const abs = resolve(tmp, value);
    const rel = relative(V2, abs);
    // Inside V2 (no leading "..", not absolute) and a real file → committed asset reference.
    if (rel !== "" && !rel.startsWith("..") && !isAbsolute(rel) && isFile(abs)) {
      const relPosix = toPosix(rel);
      const dest = join(OUT, "assets", rel);
      if (!copied.has(relPosix)) {
        mkdirSync(dirname(dest), { recursive: true });
        cpSync(abs, dest);
        copied.add(relPosix);
      }
      return `assets/${relPosix}`;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewrite(v);
    return out;
  }
  return value;
}

// Fresh output each run.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const rewritten = rewrite(data);

// 3. Copy the static template (index.html, viewer.css, viewer.js) and write the rewritten data.
for (const f of ["index.html", "viewer.css", "viewer.js"]) {
  const src = join(tmp, f);
  if (existsSync(src)) cpSync(src, join(OUT, f));
}
writeFileSync(join(OUT, "data.json"), JSON.stringify(rewritten, null, 2) + "\n");

rmSync(tmp, { recursive: true, force: true });

console.log(
  `[pixel-pipeline-viewer] ${data.totals.items} item(s), ${copied.size} asset(s) → ${toPosix(
    relative(repoRoot, OUT),
  )}/`,
);
console.log("  remember to `git add docs/pixel-pipeline-viewer` so it deploys to Pages.");
