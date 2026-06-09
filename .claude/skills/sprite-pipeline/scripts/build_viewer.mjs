#!/usr/bin/env node
// sprite-pipeline — build the static review viewer.
//
// Scans the per-set directories (each `sets/<set>/manifest.json` + its outputs), works out which
// declared keyframes / idles / transitions are present on disk vs still pending, and emits a
// self-contained review site into <out>/: a `data.json` (the scan result) plus a copy of the
// `viewer/` template (index.html + viewer.css + viewer.js). Open <out>/index.html (served — the
// page fetches data.json) to eyeball the whole family, comment per asset, and copy the comments
// out to drive the next pass.
//
// Node built-ins only (fs, path, url) — no npm deps, no build step.
//
//   node build_viewer.mjs [--sets <dir>] [--out <dir>]
//
// Defaults target this Godot game:
//   --sets  godot/assets/tiles/v2/sets        (one subdir per set, each with manifest.json)
//   --out   godot/assets/tiles/v2/_viewer     (built site; lives under the same v2/ tree so it
//                                              can reference generated assets by RELATIVE path)
//
// The out dir sits beside `sets/` under v2/, so every asset path in data.json is written relative
// to <out> (e.g. `../sets/birch/previews/tile_tree_birch_autumn.gif`) and resolves when served.
//
// Idempotent + non-destructive: re-running just refreshes data.json + the template copy. Do NOT
// commit the built _viewer/ output — it is a generated artifact.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// scripts/ and viewer/ are siblings under the skill dir.
const VIEWER_SRC = path.resolve(HERE, "..", "viewer");

// ── arg parsing ────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { sets: "godot/assets/tiles/v2/sets", out: "godot/assets/tiles/v2/_viewer" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sets") out.sets = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log("usage: node build_viewer.mjs [--sets <dir>] [--out <dir>]");
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

// ── small fs helpers ───────────────────────────────────────────────────────────────────────
const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// POSIX-style relative path (forward slashes) so it works as a URL when served, on any OS.
const relUrl = (fromDir, toPath) => path.relative(fromDir, toPath).split(path.sep).join("/");

// ── per-set scan ───────────────────────────────────────────────────────────────────────────
// Read one manifest and resolve every declared id to {present-on-disk | pending}, plus the
// relative asset paths the viewer needs. `outDir` is where data.json lands (paths are relative
// to it). An asset is `generated` when its primary file exists; `pending` (placeholder) when the
// id is declared but absent; `approved` only if the manifest row opts in (`approved: true`) —
// approval isn't part of the manifest schema yet, so it's surfaced if present but never invented.

function statusFor(present, declaredApproved) {
  if (!present) return "pending";
  return declaredApproved ? "approved" : "generated";
}

function scanSet(setDir, outDir) {
  const manifestPath = path.join(setDir, "manifest.json");
  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch (err) {
    return { set: path.basename(setDir), error: `manifest unreadable: ${err.message}`, assets: [] };
  }

  const setName = typeof manifest.set === "string" ? manifest.set : path.basename(setDir);
  const keyframesDir = path.join(setDir, "keyframes");
  const previewsDir = path.join(setDir, "previews");

  // keyframe id -> its still path on disk (or null). Used both for keyframe cards and as the
  // poster still for the idle that animates that keyframe.
  const keyframePng = (id) => {
    const p = path.join(keyframesDir, `${id}.png`);
    return isFile(p) ? p : null;
  };
  const previewGif = (id) => {
    const p = path.join(previewsDir, `${id}.gif`);
    return isFile(p) ? p : null;
  };

  const assets = [];

  // Keyframes — a base still per declared id.
  for (const kf of Array.isArray(manifest.keyframes) ? manifest.keyframes : []) {
    if (!kf || typeof kf.id !== "string") continue;
    const png = keyframePng(kf.id);
    const basePrompt = typeof manifest.basePrompt === "string" ? manifest.basePrompt : "";
    const ownPrompt = typeof kf.prompt === "string" ? kf.prompt : "";
    const prompt = basePrompt && ownPrompt ? `${basePrompt}, ${ownPrompt}` : basePrompt || ownPrompt;
    assets.push({
      id: kf.id,
      kind: "keyframe",
      status: statusFor(!!png, kf.approved === true),
      group: typeof kf.group === "string" ? kf.group : null,
      generator: typeof kf.generator === "string" ? kf.generator : null,
      prompt,
      png: png ? relUrl(outDir, png) : null,
    });
  }

  // Idles — a looping animation for a keyframe; previews/<for>.gif, poster = the keyframe still.
  for (const idle of Array.isArray(manifest.idles) ? manifest.idles : []) {
    if (!idle || typeof idle.for !== "string") continue;
    const gif = previewGif(idle.for);
    const poster = keyframePng(idle.for);
    assets.push({
      id: `${idle.for}__idle`,
      kind: "idle",
      for: idle.for,
      status: statusFor(!!gif, idle.approved === true),
      frames: typeof idle.frames === "number" ? idle.frames : null,
      motion: typeof idle.motion === "string" ? idle.motion : "",
      gif: gif ? relUrl(outDir, gif) : null,
      poster: poster ? relUrl(outDir, poster) : null,
    });
  }

  // Transitions — a tween from one keyframe to another; previews/<from>__to__<to>.gif.
  for (const tr of Array.isArray(manifest.transitions) ? manifest.transitions : []) {
    if (!tr || typeof tr.from !== "string" || typeof tr.to !== "string") continue;
    const transId = `${tr.from}__to__${tr.to}`;
    const gif = previewGif(transId);
    const posterFrom = keyframePng(tr.from);
    const posterTo = keyframePng(tr.to);
    assets.push({
      id: transId,
      kind: "transition",
      from: tr.from,
      to: tr.to,
      status: statusFor(!!gif, tr.approved === true),
      frames: typeof tr.frames === "number" ? tr.frames : null,
      physics: typeof tr.physics === "string" ? tr.physics : "",
      gif: gif ? relUrl(outDir, gif) : null,
      posterFrom: posterFrom ? relUrl(outDir, posterFrom) : null,
      posterTo: posterTo ? relUrl(outDir, posterTo) : null,
    });
  }

  const counts = assets.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, generated: 0, pending: 0, approved: 0 }
  );

  return { set: setName, dir: relUrl(outDir, setDir), styleSpec: manifest.styleSpec || null, counts, assets };
}

// ── template copy (no recursion needed; viewer/ is flat, but handle subdirs defensively) ─────
function copyTree(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(dstDir, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ── main ───────────────────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  const setsDir = path.resolve(args.sets);
  const outDir = path.resolve(args.out);

  if (!isDir(setsDir)) {
    console.error(`--sets dir not found: ${setsDir}`);
    process.exit(1);
  }
  if (!isDir(VIEWER_SRC)) {
    console.error(`viewer template not found beside script: ${VIEWER_SRC}`);
    process.exit(1);
  }

  // One section per set: any immediate subdir that has a manifest.json.
  const setDirs = fs
    .readdirSync(setsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(setsDir, e.name))
    .filter((d) => isFile(path.join(d, "manifest.json")))
    .sort();

  fs.mkdirSync(outDir, { recursive: true });
  const sets = setDirs.map((d) => scanSet(d, outDir));

  const totals = sets.reduce(
    (acc, s) => {
      if (s.counts) {
        acc.generated += s.counts.generated;
        acc.pending += s.counts.pending;
        acc.approved += s.counts.approved;
        acc.total += s.counts.total;
      }
      return acc;
    },
    { generated: 0, pending: 0, approved: 0, total: 0 }
  );

  const data = {
    generatedAt: new Date().toISOString(),
    setsRoot: relUrl(outDir, setsDir),
    totals,
    sets,
  };

  fs.writeFileSync(path.join(outDir, "data.json"), JSON.stringify(data, null, 2) + "\n");
  copyTree(VIEWER_SRC, outDir);

  console.log(
    `sprite-viewer: ${sets.length} set(s), ${totals.total} asset(s) ` +
      `(${totals.generated} generated, ${totals.pending} pending, ${totals.approved} approved)`
  );
  console.log(`  data.json + viewer template -> ${outDir}`);
  console.log(`  serve the out dir's parent and open ${path.join(outDir, "index.html")}`);
}

main();
