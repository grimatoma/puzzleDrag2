#!/usr/bin/env node
// sprite-pipeline — build the static review viewer.
//
// Reads the three-file spec via manifest.mjs: `godot/assets/tiles/v2/pipeline.json` (global settings +
// a flat list of hierarchical items, each a master + children + animations) plus its
// `pipeline.history.json` candidate-log sidecar, merged so each keyframe regains its `candidates`.
// Both files are schema-validated (pipeline.schema.json) before anything is emitted — the build
// REFUSES to proceed on invalid data. A missing sidecar is tolerated: the build degrades (empty
// candidates; approved urls resolved from each keyframe's `selectedPath`). Emits a browser-facing
// projection into <out>/: a `data.json` plus a copy of the `viewer/` template (index.html + viewer.css
// + viewer.js). Open <out>/index.html (served — the page fetches data.json) to eyeball the whole
// family.
//
// Node built-ins only (fs, path, url) — no npm deps, no build step.
//
//   node build_viewer.mjs [--pipeline <file>] [--out <dir>] [--plan] [--watch]
//
// Defaults target this Godot game:
//   --pipeline  godot/assets/tiles/v2/pipeline.json   (the source of truth)
//   --out       godot/assets/tiles/v2/pixelGen        (built site; lives under the same v2/ tree so
//                                                      it can reference generated assets by RELATIVE
//                                                      path)
//
// Paths inside pipeline.json (candidate `path`, animation `gif`, item `priors`, `styleSpec`) are
// relative to pipeline.json's own dir (v2/). We resolve them against that dir, then rewrite to a
// path relative to <out> (e.g. `../sets/birch/previews/...`) so they resolve when served. A URL is
// emitted only when the underlying file exists on disk; otherwise it is null.
//
// Flags:
//   --plan   print a JSON array of structural gap-fill actions (no data.json, no template copy).
//   --watch  after the initial build, watch pipeline.json + pipeline.history.json + the v2 asset tree
//            and re-emit data.json on change (debounced). Runs until killed.
//
// Idempotent + non-destructive: re-running just refreshes data.json + the template copy. Do NOT
// commit the built pixelGen/ output — it is a generated artifact (.gitignore covers it).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as manifest from "./manifest.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// scripts/ and viewer/ are siblings under the skill dir.
const VIEWER_SRC = path.resolve(HERE, "..", "viewer");

// ── arg parsing ────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    pipeline: "godot/assets/tiles/v2/pipeline.json",
    out: "godot/assets/tiles/v2/pixelGen",
    plan: false,
    watch: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pipeline") out.pipeline = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    // `--sets` is accepted for back-compat but is informational only: the input is now
    // pipeline.json (default beside the v2 tree). Prefer the explicit --pipeline.
    else if (a === "--sets") out.sets = argv[++i];
    else if (a === "--plan") out.plan = true;
    else if (a === "--watch") out.watch = true;
    else if (a === "--help" || a === "-h") {
      console.log(
        "usage: node build_viewer.mjs [--pipeline <file>] [--out <dir>] [--plan] [--watch]"
      );
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

// POSIX-style relative path (forward slashes) so it works as a URL when served, on any OS.
const relUrl = (fromDir, toPath) => path.relative(fromDir, toPath).split(path.sep).join("/");

// Resolve a pipeline-relative path to a URL relative to the out dir, but only if the file exists.
// `baseDir` is pipeline.json's own dir (paths in the file are relative to it). Returns null when the
// path is missing/blank or the file isn't on disk.
function assetUrl(rel, baseDir, outDir) {
  if (typeof rel !== "string" || rel === "") return null;
  const abs = path.resolve(baseDir, rel);
  if (!isFile(abs)) return null;
  return relUrl(outDir, abs);
}

// ── projection: pipeline.json -> data.json shape ─────────────────────────────────────────────
const num = (v, dflt = null) => (typeof v === "number" ? v : dflt);
const str = (v, dflt = "") => (typeof v === "string" ? v : dflt);

// Project one master/child keyframe entry into the flattened `keys[]` row.
function projectKey(entry, role, basePrompt, baseDir, outDir) {
  const id = str(entry.id);
  const ownPrompt = str(entry.prompt);
  const prompt = basePrompt && ownPrompt ? `${basePrompt}, ${ownPrompt}` : basePrompt || ownPrompt;

  const rawCands = Array.isArray(entry.candidates) ? entry.candidates : [];
  const candidates = rawCands.map((c) => ({
    idx: num(c.idx, null),
    url: assetUrl(c.path, baseDir, outDir),
    status: str(c.status, "generated"),
    llm: typeof c.llm === "string" ? c.llm : null,
    reason: typeof c.reason === "string" ? c.reason : null,
  }));

  const selected =
    typeof entry.selected === "number" && Number.isFinite(entry.selected) ? entry.selected : null;

  // The approved candidate's url, looked up by idx === selected (fall back to array position).
  let approvedUrl = null;
  if (selected !== null) {
    const sel = candidates.find((c) => c.idx === selected) ?? candidates[selected] ?? null;
    approvedUrl = sel ? sel.url : null;
    // Degraded-mode fallback: when the history sidecar is absent the merged `candidates` array is
    // empty, so the lookup above yields null even though a keyframe IS approved. Resolve the url from
    // the keyframe's own `selectedPath` instead. This NEVER fires in the normal (sidecar-present)
    // case, so `data.json` stays byte-identical. `selectedPath` is only consumed here to compute
    // `approvedUrl` — it is not added to the emitted projection object.
    if (approvedUrl === null) {
      approvedUrl = assetUrl(entry.selectedPath, baseDir, outDir);
    }
  }

  // Derived status: approved (a candidate is selected) / review (candidates exist, none chosen) /
  // pending (no candidates yet).
  let status;
  if (selected !== null) status = "approved";
  else if (candidates.length > 0) status = "review";
  else status = "pending";

  return { id, role, prompt, selected, approvedUrl, status, candidates };
}

// Build the projected item, returning both the item object and a key-id -> projected-key map (used
// to resolve animation poster urls).
function projectItem(item, settings, baseDir, outDir) {
  const basePrompt = str(item.basePrompt);
  const canvas = item.canvas && typeof item.canvas === "object" ? item.canvas : settings.canvas;

  const keys = [];
  const byId = new Map();

  if (item.master && typeof item.master === "object") {
    const k = projectKey(item.master, "master", basePrompt, baseDir, outDir);
    keys.push(k);
    byId.set(k.id, k);
  }
  for (const child of Array.isArray(item.children) ? item.children : []) {
    if (!child || typeof child !== "object") continue;
    const k = projectKey(child, "child", basePrompt, baseDir, outDir);
    keys.push(k);
    byId.set(k.id, k);
  }

  const animations = [];
  for (const a of Array.isArray(item.animations) ? item.animations : []) {
    if (!a || typeof a !== "object") continue;
    const kind = str(a.kind);
    const frames = num(a.frames, null);
    const status = str(a.status, "pending");
    const gifUrl = assetUrl(a.gif, baseDir, outDir);

    if (kind === "idle") {
      const forId = str(a.for);
      const k = byId.get(forId);
      animations.push({
        id: `${forId}__idle`,
        kind: "idle",
        for: forId,
        frames,
        motion: str(a.motion),
        status,
        gifUrl,
        posterUrl: k ? k.approvedUrl : null,
      });
    } else if (kind === "transition") {
      const fromId = str(a.from);
      const toId = str(a.to);
      const kFrom = byId.get(fromId);
      const kTo = byId.get(toId);
      animations.push({
        id: `${fromId}__to__${toId}`,
        kind: "transition",
        from: fromId,
        to: toId,
        frames,
        physics: str(a.physics),
        status,
        gifUrl,
        posterFromUrl: kFrom ? kFrom.approvedUrl : null,
        posterToUrl: kTo ? kTo.approvedUrl : null,
      });
    }
  }

  const projected = {
    id: str(item.id),
    basePrompt,
    canvas,
    keys,
    animations,
  };
  return { projected, byId };
}

// Build the full data.json projection object from the parsed pipeline + its base dir.
function buildData(pipeline, baseDir, outDir) {
  const rawSettings =
    pipeline.settings && typeof pipeline.settings === "object" ? pipeline.settings : {};
  const settings = {
    canvas:
      rawSettings.canvas && typeof rawSettings.canvas === "object"
        ? rawSettings.canvas
        : { width: 32, height: 32, safeArea: 2 },
    fps: num(rawSettings.fps, 10),
    candidates: num(rawSettings.candidates, 4),
    humanApproval: rawSettings.humanApproval === true,
    autonomous: rawSettings.autonomous === true,
  };

  const items = [];
  const totals = { items: 0, keyframes: 0, animations: 0, approved: 0, pending: 0, generated: 0 };

  for (const item of Array.isArray(pipeline.items) ? pipeline.items : []) {
    if (!item || typeof item !== "object") continue;
    const { projected } = projectItem(item, settings, baseDir, outDir);
    items.push(projected);

    totals.items += 1;
    totals.keyframes += projected.keys.length;
    totals.animations += projected.animations.length;
    for (const k of projected.keys) {
      if (k.status === "approved") totals.approved += 1;
      else if (k.status === "pending") totals.pending += 1;
    }
    for (const a of projected.animations) {
      if (a.status === "generated") totals.generated += 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    settings,
    totals,
    items,
  };
}

// ── structural gap-fill plan (manifest-schema.md §"Gap-fill is structural") ───────────────────
// Diffs pipeline.json against itself by SHAPE to decide the next actions. Operates on the raw
// pipeline (not the projection) so it can see candidate `status` and counts directly.
function buildPlan(pipeline) {
  const rawSettings =
    pipeline.settings && typeof pipeline.settings === "object" ? pipeline.settings : {};
  const targetCandidates = num(rawSettings.candidates, 4);
  const actions = [];

  const isApproved = (entry) =>
    entry &&
    typeof entry === "object" &&
    typeof entry.selected === "number" &&
    entry.selected !== null;
  const cands = (entry) => (entry && Array.isArray(entry.candidates) ? entry.candidates : []);
  const nonFailedCount = (entry) => cands(entry).filter((c) => c && c.status !== "failed").length;

  for (const item of Array.isArray(pipeline.items) ? pipeline.items : []) {
    if (!item || typeof item !== "object") continue;
    const itemId = str(item.id);
    const master = item.master && typeof item.master === "object" ? item.master : null;
    const masterApproved = isApproved(master);

    // Rule 1: a master still being chosen (not yet approved) with fewer than `candidates` non-failed
    // candidates -> generate the remainder. An APPROVED master is full: a candidate has been picked,
    // so we stop accumulating seeds (this is why the migrated birch yields no action).
    if (master && !masterApproved) {
      const have = nonFailedCount(master);
      if (have < targetCandidates) {
        actions.push({
          action: "generate-master",
          itemId,
          keyId: str(master.id),
          count: targetCandidates - have,
        });
      }
    }
    // Rule 4 (master): re-seed each failed candidate (regardless of approval — a failed seed left a
    // gap on disk that should be regenerated).
    if (master) {
      for (const c of cands(master)) {
        if (c && c.status === "failed") {
          actions.push({ action: "reseed", itemId, keyId: str(master.id), idx: num(c.idx, null) });
        }
      }
    }

    // Rule 2: child with no candidates AND an approved master -> generate it.
    // Rule 4 (child): re-seed each failed candidate.
    for (const child of Array.isArray(item.children) ? item.children : []) {
      if (!child || typeof child !== "object") continue;
      const childId = str(child.id);
      if (cands(child).length === 0) {
        if (masterApproved) {
          actions.push({
            action: "generate-child",
            itemId,
            keyId: childId,
            count: targetCandidates,
          });
        }
      } else {
        for (const c of cands(child)) {
          if (c && c.status === "failed") {
            actions.push({ action: "reseed", itemId, keyId: childId, idx: num(c.idx, null) });
          }
        }
      }
    }

    // Rule 3: animation whose referenced keyframes are approved and whose status is pending.
    const keyById = new Map();
    if (master) keyById.set(str(master.id), master);
    for (const child of Array.isArray(item.children) ? item.children : []) {
      if (child && typeof child === "object") keyById.set(str(child.id), child);
    }
    for (const a of Array.isArray(item.animations) ? item.animations : []) {
      if (!a || typeof a !== "object") continue;
      if (str(a.status, "pending") !== "pending") continue;
      let refIds;
      let animId;
      if (a.kind === "idle") {
        refIds = [str(a.for)];
        animId = `${str(a.for)}__idle`;
      } else if (a.kind === "transition") {
        refIds = [str(a.from), str(a.to)];
        animId = `${str(a.from)}__to__${str(a.to)}`;
      } else {
        continue;
      }
      const allApproved = refIds.every((id) => isApproved(keyById.get(id)));
      if (allApproved) {
        actions.push({ action: "animate", itemId, animation: animId });
      }
    }
  }

  return actions;
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

// ── validated load (three-file model) ─────────────────────────────────────────────────────────
// Load the on-disk pipeline + history sidecar, schema-validate BOTH against pipeline.schema.json, and
// return the MERGED view (candidates spliced back onto each keyframe) for the projection/plan code.
// The script REFUSES to proceed on invalid data: any schema error is printed to stderr and the process
// exits non-zero. A missing history sidecar is NOT an error — `loadHistory` returns `{}` (which
// validates clean) and the build proceeds in degraded mode (empty candidates, urls resolved from
// each keyframe's `selectedPath`). We validate the on-disk `loadPipeline` result, never the merged one
// (the merged keyframes re-carry `candidates`, which the strict pipelineDoc schema forbids).
function loadValidated(pipelinePath) {
  const pipeline = manifest.loadPipeline(pipelinePath);
  const history = manifest.loadHistory(pipelinePath);
  const schema = manifest.loadSchema(pipelinePath);
  const errs = [
    ...manifest.validateDoc(pipeline, schema, "pipelineDoc"),
    ...manifest.validateDoc(history, schema, "historyDoc"),
  ];
  if (errs.length) {
    console.error(`refusing to build — invalid pipeline data (${errs.length} error(s)):`);
    for (const e of errs) console.error(`  ${e}`);
    process.exit(1);
  }
  // Reuse the already-parsed + validated pipeline/history to build the merged shape via the shared
  // manifest.mergeInto helper, rather than re-reading the files a third time or duplicating the splice.
  return manifest.mergeInto(pipeline, history);
}

// ── build (emit data.json + copy template) ───────────────────────────────────────────────────
function emit(pipelinePath, baseDir, outDir, { copyTemplate } = { copyTemplate: true }) {
  const pipeline = loadValidated(pipelinePath);
  const data = buildData(pipeline, baseDir, outDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "data.json"), JSON.stringify(data, null, 2) + "\n");
  if (copyTemplate) copyTree(VIEWER_SRC, outDir);
  return data;
}

// ── watch ──────────────────────────────────────────────────────────────────────────────────
// Watch pipeline.json + the v2 asset tree; debounce; re-emit data.json. fs.watch recursive is
// supported on Windows + macOS; on Linux we fall back to a non-recursive watch on the tree root
// (still catches pipeline.json edits, the common case).
function startWatch(pipelinePath, baseDir, outDir) {
  let timer = null;
  const rebuild = () => {
    timer = null;
    try {
      const data = emit(pipelinePath, baseDir, outDir, { copyTemplate: false });
      console.log(`rebuilt data.json (${data.totals.items} items)`);
    } catch (err) {
      console.error(`watch rebuild failed: ${err.message}`);
    }
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(rebuild, 200);
  };

  const watchers = [];
  // The pipeline.json file itself.
  try {
    watchers.push(fs.watch(pipelinePath, schedule));
  } catch (err) {
    console.error(`could not watch ${pipelinePath}: ${err.message}`);
  }
  // The history sidecar — edits to it change the merged candidates, so they must rebuild data.json.
  // The recursive v2 watch below already covers it on Win/macOS; this explicit watch adds robustness
  // (and covers the Linux non-recursive fallback). Tolerate the sidecar being absent.
  const histPath = manifest.historyPath(pipelinePath);
  try {
    if (isFile(histPath)) watchers.push(fs.watch(histPath, schedule));
  } catch (err) {
    console.error(`could not watch ${histPath}: ${err.message}`);
  }
  // The v2 asset tree (recursive where supported).
  try {
    watchers.push(fs.watch(baseDir, { recursive: true }, schedule));
  } catch {
    // Recursive watch unsupported on this platform — watch the dir root non-recursively.
    try {
      watchers.push(fs.watch(baseDir, schedule));
    } catch (err) {
      console.error(`could not watch ${baseDir}: ${err.message}`);
    }
  }

  console.log(`watching ${relUrl(process.cwd(), pipelinePath)} + asset tree — Ctrl-C to stop`);
  const close = () => {
    for (const w of watchers) {
      try {
        w.close();
      } catch {
        /* ignore */
      }
    }
    process.exit(0);
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

// ── main ───────────────────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  const pipelinePath = path.resolve(args.pipeline);
  const outDir = path.resolve(args.out);
  const baseDir = path.dirname(pipelinePath);

  if (!isFile(pipelinePath)) {
    console.error(`--pipeline file not found: ${pipelinePath}`);
    process.exit(1);
  }

  // --plan: just print the structural gap-fill actions; emit nothing. Validates spec + history first
  // (loadValidated exits non-zero on schema errors), then plans off the merged view.
  if (args.plan) {
    let pipeline;
    try {
      pipeline = loadValidated(pipelinePath);
    } catch (err) {
      console.error(`pipeline.json unreadable: ${err.message}`);
      process.exit(1);
    }
    const plan = buildPlan(pipeline);
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (!isDir(VIEWER_SRC)) {
    console.error(`viewer template not found beside script: ${VIEWER_SRC}`);
    process.exit(1);
  }

  let data;
  try {
    data = emit(pipelinePath, baseDir, outDir, { copyTemplate: true });
  } catch (err) {
    console.error(`pipeline.json unreadable: ${err.message}`);
    process.exit(1);
  }
  const t = data.totals;
  console.log(
    `pixelGen: ${t.items} item(s), ${t.keyframes} keyframe(s), ${t.animations} animation(s) ` +
      `(${t.approved} approved, ${t.pending} pending keyframes, ${t.generated} animations generated)`
  );
  console.log(`  data.json + viewer template -> ${outDir}`);
  console.log(`  serve the out dir's parent and open ${path.join(outDir, "index.html")}`);

  if (args.watch) startWatch(pipelinePath, baseDir, outDir);
}

main();
