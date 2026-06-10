#!/usr/bin/env node
// sprite-pipeline — three-file bookkeeping CLI.
//
// The orchestrator records candidate lifecycle (generated/approved/rejected), the approved `selected`
// idx + paired `selectedPath`, animation status+gif, and the run mode. Under the three-file split
// (see manifest.mjs) those fields live in TWO sibling files under `godot/assets/tiles/v2/`:
//
//   • pipeline.json          — spec + state. Keyframes keep `selected` + `selectedPath` (+ optional
//                              `comment`); animations keep `status`/`gif`/`storyboard`; `settings`
//                              holds the run mode. NO candidates here.
//   • pipeline.history.json  — the candidate/attempt log sidecar, keyed itemId -> keyframeId ->
//                              candidate[] (`{idx,path,status,llm?,reason?}`, matched by `idx` FIELD).
//                              A missing sidecar reads as `{}`.
//   • pipeline.schema.json   — the JSON Schema validated on load (refuse to mutate invalid data).
//
// This CLI mirrors serve_viewer's patch-split exactly: each command writes ONLY the file(s) it owns,
// and `approve` writes history FIRST then pipeline so the pair always ends consistent. All
// load/validate/write goes through the shared `manifest.mjs` seam (atomic temp-file + rename).
//
//   node pipeline-patch.mjs record-candidate <item> <key> <idx> <path> [status] [llm] [--source hand|pixellab] [--object <uuid>] [--review-object <uuid>]
//   node pipeline-patch.mjs approve          <item> <key> <idx>
//   node pipeline-patch.mjs reject           <item> <key> <idx> "<reason>"
//   node pipeline-patch.mjs animate-done      <item> <selector> <gifPath> [storyboardPath]
//   node pipeline-patch.mjs set-mode          (autonomous | gated)
//   node pipeline-patch.mjs show              [item]
//
// Candidate `source`: every candidate is `hand` (authored/edited in Aseprite — the home-grown path)
// or `pixellab` (AI review-pack / state). Both sources share ONE pool per keyframe and compete at
// the G2 gate (e.g. 2 hand + 2 pixellab → pick the best). `--source` defaults to `pixellab` when an
// `--object` is given, else `hand`. `approve` denormalizes the winner's `source` onto the keyframe.
// PixelLab object ids (`objectId` = its own object, `reviewObjectId` = the review pack it came from)
// are PixelLab-only — absent on hand candidates. `objectId` denormalizes onto the keyframe so a
// PixelLab `state` child can derive from it; a hand keyframe has no objectId (derive its children by
// hand in Aseprite). `reject` of the selected candidate clears source/objectId with selected/path.
// The pipeline runs fully WITHOUT PixelLab — hand candidates alone are a complete run.
//
// <key>      = a keyframe id (the item's master id or one of its children ids).
// <selector> = an idle's `for` id, or a transition as `<from>__to__<to>` (or just `<to>`).
// All paths recorded are written verbatim (use v2-relative paths, e.g.
// items/<id>/<key>/00.png) — they are only pointers (see manifest-schema.md).
//
// A `--pipeline <path>` flag (anywhere in argv) overrides the default pipeline.json location; the
// history + schema sidecars are derived from it. Used for testing against a fixture.
//
// Node built-ins only. Resolves pipeline.json against the repo root, like integrate.mjs.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as manifest from "./manifest.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..", "..");
const DEFAULT_PIPELINE_JSON = path.join(REPO_ROOT, "godot", "assets", "tiles", "v2", "pipeline.json");

function die(msg) {
  console.error(`pipeline-patch: ${msg}`);
  process.exit(1);
}

// ── Load / validate ─────────────────────────────────────────────────────────────
// Load BOTH on-disk files (history sidecar reads as {} when absent) and schema-validate each before
// returning, mirroring the sibling scripts' gate. If either is invalid we refuse to mutate already-bad
// data and exit non-zero. A missing history sidecar ({}) validates clean.
function loadAll() {
  let pipeline;
  let history;
  let schema;
  try {
    pipeline = manifest.loadPipeline(PIPELINE_JSON);
    history = manifest.loadHistory(PIPELINE_JSON);
    schema = manifest.loadSchema(PIPELINE_JSON);
  } catch (e) {
    die(`could not read pipeline/history/schema (${PIPELINE_JSON}): ${e.message}`);
  }
  const errs = [
    ...manifest.validateDoc(pipeline, schema, "pipelineDoc"),
    ...manifest.validateDoc(history, schema, "historyDoc"),
  ];
  if (errs.length) {
    die(`invalid pipeline/history data — refusing to mutate:\n  ${errs.join("\n  ")}`);
  }
  return { pipeline, history };
}

// ── Node lookup (pipeline.json) ──────────────────────────────────────────────────
function findItem(pipeline, itemId) {
  const item = (pipeline.items || []).find((i) => i && i.id === itemId);
  if (!item) {
    die(`no item "${itemId}" in pipeline.json (have: ${(pipeline.items || []).map((i) => i.id).join(", ")})`);
  }
  return item;
}

// A keyframe is the item's master or one of its children, matched by id.
function findKeyframe(item, keyId) {
  const entries = [item.master, ...(item.children || [])].filter(Boolean);
  const kf = entries.find((e) => e && e.id === keyId);
  if (!kf) die(`no keyframe "${keyId}" in item "${item.id}" (have: ${entries.map((e) => e.id).join(", ")})`);
  return kf;
}

// Match an animation by selector: an idle's `for`, or a transition as
// `<from>__to__<to>` or just `<to>`.
function findAnimation(item, selector) {
  for (const a of item.animations || []) {
    if (a.kind === "idle" && a.for === selector) return a;
    if (a.kind === "transition") {
      if (`${a.from}__to__${a.to}` === selector) return a;
      if (a.to === selector) return a;
    }
  }
  die(`no animation matching "${selector}" in item "${item.id}"`);
}

// ── History lookup (pipeline.history.json) ────────────────────────────────────────
// Get (creating the nested {} -> [] path if missing) the candidate array for item/key in history.
function ensureCandidateList(history, itemId, keyId) {
  if (!history[itemId] || typeof history[itemId] !== "object") history[itemId] = {};
  if (!Array.isArray(history[itemId][keyId])) history[itemId][keyId] = [];
  return history[itemId][keyId];
}

// Read-only: the candidate array for item/key (or [] if none recorded yet).
function candidateList(history, itemId, keyId) {
  const perItem = history && typeof history === "object" ? history[itemId] : null;
  return perItem && typeof perItem === "object" && Array.isArray(perItem[keyId]) ? perItem[keyId] : [];
}

// Match a candidate by its `idx` FIELD (not array position), consistent with serve_viewer/integrate.
function findCandidate(cands, idx) {
  return (cands || []).find((c) => c && c.idx === idx) || null;
}

// ── Commands ──────────────────────────────────────────────────────────────────────
// record-candidate: verify the keyframe exists in pipeline.json (for the "no such item/key" errors),
// then add-or-update the candidate in HISTORY. Writes history only — pipeline is left byte-unchanged.
function cmdRecordCandidate(args) {
  // Pull the optional --source / --object / --review-object flags out of the positional args.
  const positional = [];
  let objectId = null;
  let reviewObjectId = null;
  let source = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--object") {
      objectId = args[++i];
      if (!objectId) die("--object requires a <uuid>");
    } else if (args[i] === "--review-object") {
      reviewObjectId = args[++i];
      if (!reviewObjectId) die("--review-object requires a <uuid>");
    } else if (args[i] === "--source") {
      source = args[++i];
      if (source !== "hand" && source !== "pixellab") die('--source must be "hand" or "pixellab"');
    } else {
      positional.push(args[i]);
    }
  }
  const [itemId, keyId, idxRaw, p, status = "generated", llm] = positional;
  if (!itemId || !keyId || idxRaw === undefined || !p) {
    die("record-candidate <item> <key> <idx> <path> [status] [llm] [--source hand|pixellab] [--object <uuid>] [--review-object <uuid>]");
  }
  const idx = Number(idxRaw);
  if (!Number.isInteger(idx)) die(`idx must be an integer (got "${idxRaw}")`);
  // Source defaults: an --object implies a PixelLab candidate; otherwise it's a hand candidate
  // (the home-grown Aseprite path). Pass --source explicitly to be unambiguous.
  if (!source) source = objectId ? "pixellab" : "hand";
  const { pipeline, history } = loadAll();
  // Validate the keyframe target against pipeline (errors out if item/key is unknown).
  findKeyframe(findItem(pipeline, itemId), keyId);
  const cands = ensureCandidateList(history, itemId, keyId);
  let cand = findCandidate(cands, idx);
  if (!cand) {
    cand = { idx, path: p, status };
    cands.push(cand);
    cands.sort((a, b) => a.idx - b.idx);
  } else {
    cand.path = p;
    cand.status = status;
  }
  cand.source = source;
  if (llm) cand.llm = llm;
  if (objectId) cand.objectId = objectId;
  if (reviewObjectId) cand.reviewObjectId = reviewObjectId;
  manifest.writeHistory(PIPELINE_JSON, history);
  console.log(`recorded ${itemId}/${keyId} candidate idx=${idx} source=${source} status=${status}${llm ? ` llm=${llm}` : ""}${objectId ? ` objectId=${objectId}` : ""}`);
}

// approve: flip the candidate to approved/pass in HISTORY, and set the keyframe's selected +
// selectedPath in PIPELINE. Writes history FIRST, then pipeline (consistent pair).
function cmdApprove(args) {
  const [itemId, keyId, idxRaw] = args;
  if (!itemId || !keyId || idxRaw === undefined) die("approve <item> <key> <idx>");
  const idx = Number(idxRaw);
  if (!Number.isInteger(idx)) die(`idx must be an integer (got "${idxRaw}")`);
  const { pipeline, history } = loadAll();
  const kf = findKeyframe(findItem(pipeline, itemId), keyId);
  const cand = findCandidate(candidateList(history, itemId, keyId), idx);
  if (!cand) die(`no candidate idx=${idx} on ${itemId}/${keyId} — record-candidate it first`);
  cand.status = "approved";
  cand.llm = "pass";
  kf.selected = idx;
  kf.selectedPath = typeof cand.path === "string" ? cand.path : null;
  // Denormalize the winning candidate's source + PixelLab object id onto the keyframe.
  // `source` records whether the chosen keyframe is hand-authored or PixelLab. `objectId`
  // (PixelLab only) is the handle a PixelLab `state` child derives from; null for a hand
  // keyframe — its children are hand-derived in Aseprite instead.
  kf.source = typeof cand.source === "string" ? cand.source : (cand.objectId ? "pixellab" : "hand");
  kf.objectId = typeof cand.objectId === "string" ? cand.objectId : null;
  manifest.writeHistory(PIPELINE_JSON, history);
  manifest.writePipeline(PIPELINE_JSON, pipeline);
  console.log(`approved ${itemId}/${keyId} idx=${idx} (selected=${idx}, source=${kf.source}${kf.objectId ? `, objectId=${kf.objectId}` : ""})`);
}

// reject: flip the candidate to rejected/fail (+ reason) in HISTORY. If that idx was the keyframe's
// current selection, also clear selected + selectedPath in PIPELINE. Writes history always; pipeline
// only when the selection was cleared.
function cmdReject(args) {
  const [itemId, keyId, idxRaw, ...reasonParts] = args;
  if (!itemId || !keyId || idxRaw === undefined) die('reject <item> <key> <idx> "<reason>"');
  const idx = Number(idxRaw);
  if (!Number.isInteger(idx)) die(`idx must be an integer (got "${idxRaw}")`);
  const reason = reasonParts.join(" ").trim();
  if (!reason) die("reject requires a <reason> (kept inline as the audit trail)");
  const { pipeline, history } = loadAll();
  const kf = findKeyframe(findItem(pipeline, itemId), keyId);
  const cand = findCandidate(candidateList(history, itemId, keyId), idx);
  if (!cand) die(`no candidate idx=${idx} on ${itemId}/${keyId} — record-candidate it first`);
  // "rejected" is terminal: unlike the viewer's regen (which marks "failed"), a rejected candidate
  // is NOT re-seeded by build_viewer's gap-fill planner and still occupies its candidate slot.
  cand.status = "rejected";
  cand.llm = "fail";
  cand.reason = reason;
  let clearedSelection = false;
  if (kf.selected === idx) {
    kf.selected = null;
    kf.selectedPath = null;
    kf.objectId = null;
    kf.source = null;
    clearedSelection = true;
  }
  manifest.writeHistory(PIPELINE_JSON, history);
  if (clearedSelection) manifest.writePipeline(PIPELINE_JSON, pipeline);
  console.log(`rejected ${itemId}/${keyId} idx=${idx}: ${reason}`);
}

// animate-done: animations live in PIPELINE; set status/gif (+ optional storyboard). Pipeline only.
function cmdAnimateDone(args) {
  const [itemId, selector, gif, storyboard] = args;
  if (!itemId || !selector || !gif) die("animate-done <item> <selector> <gifPath> [storyboardPath]");
  const { pipeline } = loadAll();
  const anim = findAnimation(findItem(pipeline, itemId), selector);
  anim.status = "generated";
  anim.gif = gif;
  if (storyboard) anim.storyboard = storyboard;
  manifest.writePipeline(PIPELINE_JSON, pipeline);
  console.log(`animation ${itemId}/${selector} -> generated, gif=${gif}${storyboard ? `, storyboard=${storyboard}` : ""}`);
}

// set-mode: run mode lives in PIPELINE settings. Pipeline only.
function cmdSetMode(args) {
  const [mode] = args;
  if (mode !== "autonomous" && mode !== "gated") die("set-mode (autonomous | gated)");
  const { pipeline } = loadAll();
  pipeline.settings = pipeline.settings || {};
  if (mode === "autonomous") {
    pipeline.settings.humanApproval = false;
    pipeline.settings.autonomous = true;
  } else {
    pipeline.settings.humanApproval = true;
    pipeline.settings.autonomous = false;
  }
  manifest.writePipeline(PIPELINE_JSON, pipeline);
  console.log(`mode = ${mode} (humanApproval=${pipeline.settings.humanApproval}, autonomous=${pipeline.settings.autonomous})`);
}

// show: read-only. Use loadMerged so each keyframe's `candidates` are spliced in from history, then
// display settings + per-keyframe selected/candidate counts + per-animation status. No write.
function cmdShow(args) {
  const [itemId] = args;
  // Validate the on-disk pair (loadAll) before reading the merged view, so `show` also refuses to
  // operate on invalid data. The merged shape itself is NOT schema-valid (it re-adds candidates).
  loadAll();
  const data = manifest.loadMerged(PIPELINE_JSON);
  const items = itemId ? [findItem(data, itemId)] : data.items || [];
  console.log(`settings: humanApproval=${data.settings?.humanApproval} autonomous=${data.settings?.autonomous} candidates=${data.settings?.candidates}`);
  for (const item of items) {
    console.log(`\nitem ${item.id}`);
    for (const kf of [item.master, ...(item.children || [])].filter(Boolean)) {
      const n = (kf.candidates || []).length;
      console.log(`  ${kf === item.master ? "master" : "child "} ${kf.id}  selected=${kf.selected}  candidates=${n}`);
    }
    for (const a of item.animations || []) {
      const sel = a.kind === "idle" ? a.for : `${a.from}__to__${a.to}`;
      console.log(`  ${a.kind.padEnd(10)} ${sel}  status=${a.status}`);
    }
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────────
const USAGE = `Usage:
  node pipeline-patch.mjs record-candidate <item> <key> <idx> <path> [status] [llm] [--source hand|pixellab] [--object <uuid>] [--review-object <uuid>]
  node pipeline-patch.mjs approve          <item> <key> <idx>
  node pipeline-patch.mjs reject           <item> <key> <idx> "<reason>"
  node pipeline-patch.mjs animate-done     <item> <selector> <gifPath> [storyboardPath]
  node pipeline-patch.mjs set-mode         (autonomous | gated)
  node pipeline-patch.mjs show             [item]

  --pipeline <path>   (leading option, before the command) override the pipeline.json location
                      — history/schema sidecars are derived from it`;

// Pull an optional leading `--pipeline <path>` off the front of argv, returning the resolved path +
// the remaining args. It is honored ONLY before the subcommand, so a free-text positional later (e.g.
// a reject reason of literally "--pipeline") is never mistaken for the flag. Sidecars are derived
// from this path by manifest.mjs.
function extractPipelineFlag(argv) {
  let pipelineOverride = null;
  let i = 0;
  while (i < argv.length && argv[i] === "--pipeline") {
    pipelineOverride = argv[i + 1];
    if (!pipelineOverride) die("--pipeline requires a <path>");
    i += 2;
  }
  return { pipelineOverride, rest: argv.slice(i) };
}

// Resolved once main() parses argv; all commands read this module-level constant.
let PIPELINE_JSON = DEFAULT_PIPELINE_JSON;

function main() {
  const { pipelineOverride, rest } = extractPipelineFlag(process.argv.slice(2));
  if (pipelineOverride) PIPELINE_JSON = path.resolve(pipelineOverride);
  const [cmd, ...args] = rest;
  switch (cmd) {
    case "record-candidate": return cmdRecordCandidate(args);
    case "approve": return cmdApprove(args);
    case "reject": return cmdReject(args);
    case "animate-done": return cmdAnimateDone(args);
    case "set-mode": return cmdSetMode(args);
    case "show": return cmdShow(args);
    case undefined:
    case "-h":
    case "--help":
      console.log(USAGE);
      process.exit(cmd ? 0 : 1);
      break;
    default:
      die(`unknown command "${cmd}"\n\n${USAGE}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
