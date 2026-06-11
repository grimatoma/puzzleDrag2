#!/usr/bin/env node
// PixelLab Studio — Godot integration engine.
//
// Packs exported frames under `godot/assets/tiles/v2/items/<slug>/` into Godot 4.6 SpriteFrames `.tres`
// using the Godot headless runtime. It:
//
//   1. Resolves a Godot 4.6 binary (--godot | $GODOT_BIN | `godot` on PATH),
//   2. Builds the work list from `studio-export.json` manifests or explicit CLI pairs,
//   3. Runs `godot --headless --path godot --import`, then verifies every frame PNG got a
//      `NN.png.import` sidecar (re-importing once if any are missing to fix the cold-cache gotcha),
//   4. Reverts touch/stretch settings changes in `godot/project.godot` caused by --import,
//   5. Packs each animation via `tools/assemble_tres.gd` (res:// paths, fps, anim "idle"),
//   6. Verifies all built `.tres` via `tools/verify_sf.gd` (idle/loop/frames),
//   7. Prints a summary and exits 0 on success.
//
// Invoke from anywhere — paths are resolved relative to the repo root.
//
//   node tools/integrate.mjs [--godot <path>] [--list] [<framesDir> <outTres> [<framesDir2> <outTres2> ...]]
//
// framesDir/outTres overrides are relative to the v2 dir (godot/assets/tiles/v2/) or absolute.
// With no override pairs, the work list is derived by scanning all exported studio-export.json manifests.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ── Layout constants ─────────────────────────────────────────────────────────
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const GODOT_PROJECT_DIR = path.join(REPO_ROOT, "godot");
const V2_DIR = path.join(GODOT_PROJECT_DIR, "assets", "tiles", "v2");
const PROJECT_GODOT_REL = "godot/project.godot";
const V2_RES_PREFIX = "res://assets/tiles/v2";

function die(msg) {
  console.error(`integrate: ${msg}`);
  process.exit(1);
}

// ── 1. Resolve the Godot binary ──────────────────────────────────────────────
function resolveGodot(cliPath) {
  const candidate = cliPath || process.env.GODOT_BIN || "godot";
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
function v2RelToRes(rel) {
  const posix = rel.split(path.sep).join("/").replace(/^\.?\//, "");
  return `${V2_RES_PREFIX}/${posix}`;
}

function toWorkPaths(p) {
  const abs = path.isAbsolute(p) ? p : path.join(V2_DIR, p);
  const rel = path.relative(V2_DIR, abs);
  return { abs, rel };
}

function workListFromExports() {
  const work = [];
  const itemsDir = path.join(V2_DIR, "items");
  if (!existsSync(itemsDir)) {
    console.warn(`integrate: items directory missing (${itemsDir}) — no exported assets to pack`);
    return [];
  }

  const slugs = readdirSync(itemsDir);
  for (const slug of slugs) {
    const itemDir = path.join(itemsDir, slug);
    try {
      if (!statSync(itemDir).isDirectory()) continue;
    } catch {
      continue;
    }

    const manifestPath = path.join(itemDir, "studio-export.json");
    if (!existsSync(manifestPath)) continue;

    try {
      const data = JSON.parse(readFileSync(manifestPath, "utf8"));
      const objectSlug = data?.object?.slug || slug;
      const animations = data?.animations || [];

      for (const anim of animations) {
        if (!Array.isArray(anim.frames) || anim.frames.length === 0) continue;

        let tresName;
        if (anim.kind === "idle" && anim.for) {
          tresName = `tile_${objectSlug}_${anim.for}`;
        } else {
          tresName = anim.name;
        }

        const framesRel = `items/${objectSlug}/frames/${tresName}`;
        const outRel = `items/${objectSlug}/${tresName}.tres`;

        work.push({
          name: tresName,
          framesDirAbs: path.join(V2_DIR, ...framesRel.split("/")),
          framesDirRel: framesRel,
          outTresAbs: path.join(V2_DIR, ...outRel.split("/")),
          outTresRel: outRel,
          fps: anim.fps || 10,
        });
      }
    } catch (e) {
      console.warn(`integrate: failed to load manifest at ${manifestPath}: ${e.message}`);
    }
  }

  return work;
}

function workListFromOverrides(pairs) {
  if (pairs.length % 2 !== 0) {
    die(`override args must come in <framesDir> <outTres> pairs (got ${pairs.length})`);
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
      fps: 10, // default override fallback
    });
  }
  return work;
}

function filterExistingFrames(work) {
  const kept = [];
  for (const w of work) {
    if (!existsSync(w.framesDirAbs)) {
      console.warn(`integrate: framesDir missing, skipping "${w.name}" (${w.framesDirAbs})`);
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
    const out = [e.stdout, e.stderr].filter(Boolean).join("\n");
    return { ok: false, out, status: e.status, label };
  }
}

function godotImport(godot) {
  return runGodot(godot, ["--headless", "--path", "godot", "--import"], "import");
}

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
    console.log(`integrate: ${missing.length} frame PNG(s) missing .import sidecars after first pass — re-importing once (known cold-cache gotcha)`);
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

function packOne(godot, w) {
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
      String(w.fps),
      "idle",
    ],
    "assemble",
  );
  if (res.out) process.stdout.write(res.out.endsWith("\n") ? res.out : res.out + "\n");
  if (!res.ok) {
    die(`assemble_tres failed for "${w.name}" (exit ${res.status})`);
  }
  return outRes;
}

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
      console.log("Usage: node tools/integrate.mjs [--godot <path>] [--list] [<framesDir> <outTres> ...]");
      process.exit(0);
    } else {
      rest.push(a);
    }
  }
  return { godot, list, overridePairs: rest };
}

export function main() {
  const { godot: godotArg, list, overridePairs } = parseArgs(process.argv.slice(2));

  let work =
    overridePairs.length > 0
      ? workListFromOverrides(overridePairs)
      : workListFromExports();

  work = filterExistingFrames(work);

  if (list) {
    console.log(JSON.stringify(work, null, 2));
    process.exit(0);
  }

  if (work.length === 0) {
    die("no work items to pack (no exported animations found, or all framesDirs missing).");
  }

  const godot = resolveGodot(godotArg);

  console.log(`integrate: ${work.length} animation(s) to pack: ${work.map((w) => w.name).join(", ")}`);

  importWithSidecarRetry(godot, work);
  revertProjectGodot();

  const built = [];
  for (const w of work) {
    const outRes = packOne(godot, w);
    built.push({ name: w.name, outRes, outTresAbs: w.outTresAbs, framesDirAbs: w.framesDirAbs });
  }

  const verifyOk = verifyAll(
    godot,
    built.map((b) => b.outRes),
  );

  console.log("\n── integrate summary ───────────────────────────────");
  console.log(`packed ${built.length} SpriteFrames:`);
  for (const b of built) {
    const frameCount = (() => {
      try {
        return readdirSync(b.framesDirAbs).filter((n) => n.toLowerCase().endsWith(".png")).length;
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

// Run directly if invoked as main entrypoint
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
