#!/usr/bin/env node
// sprite-pipeline — Godot integration engine.
//
// This is the ENGINE for updating the Godot tile assets — it is intentionally NOT a stage of the
// pixel/sprite pipeline. The pipeline (stages 0–4) produces the per-frame PNGs + preview GIFs and
// stops there; pushing those frames into the Godot project is a separate, on-demand step. The
// repo-level standalone entrypoint is `tools/update-godot-tiles.mjs` (`npm run godot:update-tiles`),
// which imports `main` from here. You can also run this file directly.
//
// One command that owns the whole "frames -> v2 SpriteFrames .tres + in-engine verify" dance,
// replacing ~5 hand-run steps and the import-sidecar gotcha that bit us. It:
//
//   1. resolves a Godot 4.6 binary (--godot | $GODOT_BIN | `godot` on PATH),
//   2. builds the work list (which idles to pack) from pipeline.json or explicit CLI pairs,
//   3. runs `godot --headless --path godot --import`, then verifies every frame PNG got a
//      `NN.png.import` sidecar — re-importing ONCE if any are missing (THE FIX: the first
//      --import on a fresh .godot/ cache can silently skip newly-written nested PNGs),
//   4. reverts godot/project.godot (--import strips touch/stretch settings from it),
//   5. packs each work item via tools/assemble_tres.gd (res:// paths, fps, anim "idle"),
//   6. verifies all built .tres via tools/verify_sf.gd (idle/loop/frames),
//   7. prints a summary and exits 0 on success, non-zero on any failure.
//
// Node built-ins only (plus the sibling manifest.mjs seam). Invoke from anywhere — paths are resolved
// against the repo root.
//
//   node integrate.mjs [--godot <path>] [--list] [<framesDir> <outTres> [<framesDir2> <outTres2> ...]]
//
// framesDir/outTres overrides are relative to the v2 dir (godot/assets/tiles/v2/) or absolute.
// With no override pairs, the work list is derived from pipeline.json (loaded + schema-validated via
// manifest.mjs; integrate REFUSES to proceed on invalid data).
//
//   --list   dry-run: build + validate the pipeline, derive the work list, print it as pretty JSON,
//            and exit 0 — all BEFORE resolving a Godot binary or importing/packing. Lets you exercise
//            and inspect the work-list derivation with no Godot installed (mirrors build_viewer --plan).

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as manifest from "./manifest.mjs";

// ── Layout constants ─────────────────────────────────────────────────────────
// This script lives at <repo>/.claude/skills/sprite-pipeline/scripts/integrate.mjs.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..", "..");
const GODOT_PROJECT_DIR = path.join(REPO_ROOT, "godot");
const V2_DIR = path.join(GODOT_PROJECT_DIR, "assets", "tiles", "v2");
const PIPELINE_JSON = path.join(V2_DIR, "pipeline.json");
const PROJECT_GODOT_REL = "godot/project.godot"; // for `git checkout --`
// res:// prefix for anything under the v2 dir.
const V2_RES_PREFIX = "res://assets/tiles/v2";

function die(msg) {
  console.error(`integrate: ${msg}`);
  process.exit(1);
}

// ── 1. Resolve the Godot binary ──────────────────────────────────────────────
function resolveGodot(cliPath) {
  const candidate = cliPath || process.env.GODOT_BIN || "godot";
  // If it looks like a path (has a separator) require it to exist; a bare name
  // (e.g. "godot") is resolved on PATH by execFileSync, so probe it with --version.
  const looksLikePath = candidate.includes("/") || candidate.includes("\\");
  if (looksLikePath) {
    if (!existsSync(candidate)) {
      die(
        `Godot binary not found at "${candidate}". ` +
          `Pass --godot <path> or set $GODOT_BIN.`,
      );
    }
    return candidate;
  }
  // Bare name: verify it's actually runnable on PATH.
  try {
    execFileSync(candidate, ["--version"], { stdio: "ignore" });
  } catch {
    die(
      `could not run "${candidate}" (no Godot on PATH). ` +
        `Pass --godot <path> or set $GODOT_BIN.`,
    );
  }
  return candidate;
}

// ── 2. Build the work list ───────────────────────────────────────────────────
// A work item: { name, framesDirAbs, framesDirRel, outTresAbs, outTresRel }
// where *Rel is relative to the v2 dir (used to derive res:// paths).

// Translate a v2-relative path -> res:// path under the v2 dir.
function v2RelToRes(rel) {
  const posix = rel.split(path.sep).join("/").replace(/^\.?\//, "");
  return `${V2_RES_PREFIX}/${posix}`;
}

// Normalise an override path (absolute or v2-relative) into both forms.
function toWorkPaths(p) {
  const abs = path.isAbsolute(p) ? p : path.join(V2_DIR, p);
  const rel = path.relative(V2_DIR, abs);
  return { abs, rel };
}

// Is the keyframe an idle's `for` key points at approved?
// Searches the item's master + children for an entry whose id === key, then checks the
// keyframe-level approval signal: approved = a candidate has been selected (`selected` non-null);
// candidate-level status lives in pipeline.history.json and is not needed here. This matches
// build_viewer's projection, which derives keyframe status "approved" from `selected !== null`.
function keyframeApproved(item, key) {
  const entries = [item.master, ...(item.children || [])].filter(Boolean);
  const kf = entries.find((e) => e && e.id === key);
  if (!kf) return false;
  return kf.selected !== null && kf.selected !== undefined;
}

// Derive a work item from an idle animation's gif path, by convention:
//   gif  = sets/birch/previews/tile_tree_birch_autumn.gif
//   name = <for keyId>            e.g. tile_tree_birch_autumn
//   dir  = path before /previews/  e.g. sets/birch
//   framesDir = <dir>/frames/<name>, outTres = <dir>/<name>.tres
function deriveFromIdle(anim) {
  const name = anim.for;
  const gif = anim.gif || "";
  const marker = "/previews/";
  const idx = gif.indexOf(marker);
  if (idx < 0) {
    console.warn(
      `integrate: idle for "${name}" has gif="${gif}" with no /previews/ segment — skipping`,
    );
    return null;
  }
  const dir = gif.slice(0, idx); // e.g. sets/birch
  const framesRel = `${dir}/frames/${name}`;
  const outRel = `${dir}/${name}.tres`;
  return {
    name,
    framesDirAbs: path.join(V2_DIR, ...framesRel.split("/")),
    framesDirRel: framesRel,
    outTresAbs: path.join(V2_DIR, ...outRel.split("/")),
    outTresRel: outRel,
  };
}

function workListFromPipeline() {
  if (!existsSync(PIPELINE_JSON)) {
    die(`pipeline.json not found at ${PIPELINE_JSON}`);
  }
  let data;
  try {
    data = manifest.loadPipeline(PIPELINE_JSON);
  } catch (e) {
    die(`failed to parse pipeline.json: ${e.message}`);
  }
  // Refuse to proceed on invalid on-disk data (consistent with build_viewer/serve_viewer). integrate
  // does not need history — only the spec drives the work list — so validate the pipeline alone.
  // Validate the object we'll actually iterate (loaded once above), not a fresh re-parse.
  const errs = manifest.validateDoc(
    data,
    manifest.loadSchema(PIPELINE_JSON),
    "pipelineDoc",
  );
  if (errs.length) {
    console.error(
      `integrate: refusing to proceed — invalid pipeline data (${errs.length} error(s)):`,
    );
    for (const e of errs) console.error(`  ${e}`);
    die("pipeline.json failed schema validation.");
  }
  const work = [];
  for (const item of data.items || []) {
    for (const anim of item.animations || []) {
      if (anim.kind !== "idle") continue;
      if (anim.status !== "generated") continue;
      if (!keyframeApproved(item, anim.for)) {
        console.warn(
          `integrate: idle for "${anim.for}" is not approved — skipping`,
        );
        continue;
      }
      const w = deriveFromIdle(anim);
      if (w) work.push(w);
    }
  }
  return work;
}

function workListFromOverrides(pairs) {
  if (pairs.length % 2 !== 0) {
    die(
      `override args must come in <framesDir> <outTres> pairs (got ${pairs.length})`,
    );
  }
  const work = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const fr = toWorkPaths(pairs[i]);
    const out = toWorkPaths(pairs[i + 1]);
    work.push({
      name: path.basename(out.abs, ".tres"),
      framesDirAbs: fr.abs,
      framesDirRel: fr.rel,
      outTresAbs: out.abs,
      outTresRel: out.rel,
    });
  }
  return work;
}

// Drop work items whose framesDir is absent on disk (logged, not fatal).
function filterExistingFrames(work) {
  const kept = [];
  for (const w of work) {
    if (!existsSync(w.framesDirAbs)) {
      console.warn(
        `integrate: framesDir missing, skipping "${w.name}" (${w.framesDirAbs})`,
      );
      continue;
    }
    kept.push(w);
  }
  return kept;
}

// ── Godot invocations ────────────────────────────────────────────────────────
function runGodot(godot, args, label) {
  try {
    const out = execFileSync(godot, args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out };
  } catch (e) {
    // execFileSync throws on non-zero exit; surface captured output.
    const out = [e.stdout, e.stderr].filter(Boolean).join("\n");
    return { ok: false, out, status: e.status, label };
  }
}

function godotImport(godot) {
  return runGodot(
    godot,
    ["--headless", "--path", "godot", "--import"],
    "import",
  );
}

// ── 3. Import + sidecar retry (THE FIX) ──────────────────────────────────────
// Every NN.png under a target framesDir must have a sibling NN.png.import or load()
// fails. The first --import on a cold cache can miss newly-added nested PNGs; a
// second pass creates them. Return the list of frame PNGs still missing a sidecar.
function missingSidecars(work) {
  const missing = [];
  for (const w of work) {
    let names;
    try {
      names = readdirSync(w.framesDirAbs);
    } catch {
      continue;
    }
    for (const n of names) {
      if (!n.toLowerCase().endsWith(".png")) continue;
      const sidecar = path.join(w.framesDirAbs, `${n}.import`);
      if (!existsSync(sidecar)) {
        missing.push(path.join(w.framesDirAbs, n));
      }
    }
  }
  return missing;
}

function importWithSidecarRetry(godot, work) {
  console.log("integrate: importing (godot --import) ...");
  let res = godotImport(godot);
  if (!res.ok) {
    console.error(res.out);
    die(`first --import failed (exit ${res.status})`);
  }
  let missing = missingSidecars(work);
  if (missing.length > 0) {
    console.log(
      `integrate: ${missing.length} frame PNG(s) missing .import sidecars after first pass — re-importing once (the known cold-cache gotcha)`,
    );
    res = godotImport(godot);
    if (!res.ok) {
      console.error(res.out);
      die(`second --import failed (exit ${res.status})`);
    }
    missing = missingSidecars(work);
  } else {
    console.log("integrate: all frame sidecars present after first import.");
  }
  if (missing.length > 0) {
    die(
      `frame PNGs still missing .import sidecars after two import passes:\n  ` +
        missing.join("\n  ") +
        `\nCannot load these as textures — aborting.`,
    );
  }
}

// ── 4. Revert project.godot ──────────────────────────────────────────────────
// --import rewrites godot/project.godot (strips touch/stretch settings). Restore it.
function revertProjectGodot() {
  try {
    execFileSync("git", ["checkout", "--", PROJECT_GODOT_REL], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log(`integrate: reverted ${PROJECT_GODOT_REL}.`);
  } catch (e) {
    const out = [e.stdout, e.stderr].filter(Boolean).join("\n").trim();
    die(`git checkout -- ${PROJECT_GODOT_REL} failed${out ? `: ${out}` : ""}`);
  }
}

// ── 5. Pack each work item ───────────────────────────────────────────────────
function pipelineFps() {
  try {
    const data = manifest.loadPipeline(PIPELINE_JSON);
    const fps = data?.settings?.fps;
    if (typeof fps === "number" && fps > 0) return fps;
  } catch {
    /* fall through to default */
  }
  return 10;
}

function packOne(godot, w, fps) {
  const framesRes = v2RelToRes(w.framesDirRel);
  const outRes = v2RelToRes(w.outTresRel);
  const res = runGodot(
    godot,
    [
      "--headless",
      "--path",
      "godot",
      "--script",
      "res://tools/assemble_tres.gd",
      "--",
      framesRes,
      outRes,
      String(fps),
      "idle",
    ],
    "assemble",
  );
  // assemble_tres.gd prints its own status line; surface output regardless.
  if (res.out) process.stdout.write(res.out.endsWith("\n") ? res.out : res.out + "\n");
  if (!res.ok) {
    die(`assemble_tres failed for "${w.name}" (exit ${res.status})`);
  }
  return outRes;
}

// ── 6. Verify all built .tres ────────────────────────────────────────────────
function verifyAll(godot, tresResPaths) {
  const res = runGodot(
    godot,
    [
      "--headless",
      "--path",
      "godot",
      "--script",
      "res://tools/verify_sf.gd",
      "--",
      ...tresResPaths,
    ],
    "verify",
  );
  if (res.out) process.stdout.write(res.out.endsWith("\n") ? res.out : res.out + "\n");
  return res.ok;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  let godot = null;
  let list = false;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--godot") {
      godot = argv[++i];
      if (!godot) die("--godot requires a path argument");
    } else if (a.startsWith("--godot=")) {
      godot = a.slice("--godot=".length);
    } else if (a === "--list") {
      list = true;
    } else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node integrate.mjs [--godot <path>] [--list] [<framesDir> <outTres> ...]",
      );
      process.exit(0);
    } else {
      rest.push(a);
    }
  }
  return { godot, list, overridePairs: rest };
}

function main() {
  const { godot: godotArg, list, overridePairs } = parseArgs(process.argv.slice(2));

  // Build + validate the work list BEFORE touching Godot, so --list (dry-run) needs no binary.
  let work =
    overridePairs.length > 0
      ? workListFromOverrides(overridePairs)
      : workListFromPipeline();

  work = filterExistingFrames(work);

  // --list: print the derived work list as pretty JSON and exit, before resolving Godot or
  // importing/packing. Mirrors build_viewer.mjs --plan: a no-binary inspection/verification hook.
  if (list) {
    console.log(JSON.stringify(work, null, 2));
    process.exit(0);
  }

  if (work.length === 0) {
    die("no work items to pack (nothing approved/generated, or all framesDirs missing).");
  }

  const godot = resolveGodot(godotArg);

  console.log(
    `integrate: ${work.length} idle(s) to pack: ${work.map((w) => w.name).join(", ")}`,
  );

  // 3. import (+ retry), 4. revert project.godot
  importWithSidecarRetry(godot, work);
  revertProjectGodot();

  // 5. pack
  const fps = pipelineFps();
  const built = [];
  for (const w of work) {
    const outRes = packOne(godot, w, fps);
    built.push({ name: w.name, outRes, outTresAbs: w.outTresAbs });
  }

  // 6. verify
  const verifyOk = verifyAll(
    godot,
    built.map((b) => b.outRes),
  );

  // 7. summary
  console.log("\n── integrate summary ───────────────────────────────");
  console.log(`packed ${built.length} SpriteFrames (fps=${fps}, anim=idle):`);
  for (const b of built) {
    const frameCount = (() => {
      try {
        return readdirSync(
          work.find((w) => w.name === b.name).framesDirAbs,
        ).filter((n) => n.toLowerCase().endsWith(".png")).length;
      } catch {
        return "?";
      }
    })();
    console.log(`  • ${b.name}  (${frameCount} frames)  -> ${b.outRes}`);
  }
  console.log(`verify: ${verifyOk ? "PASS" : "FAIL"}`);
  console.log("─────────────────────────────────────────────────────");

  if (!verifyOk) {
    die("verify_sf.gd reported failures — see output above.");
  }
  console.log("integrate: done.");
}

export { main };

// Run when invoked directly (`node integrate.mjs ...`); stay a no-op when imported as a module
// (e.g. by tools/update-godot-tiles.mjs, which re-exports this entrypoint).
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
