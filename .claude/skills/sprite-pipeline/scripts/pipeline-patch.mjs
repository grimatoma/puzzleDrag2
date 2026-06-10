#!/usr/bin/env node
// sprite-pipeline — pipeline.json bookkeeping CLI.
//
// The orchestrator records candidate lifecycle (generated/approved/rejected),
// the approved `selected` idx, animation status+gif, and the run mode into the
// single source of truth, `godot/assets/tiles/v2/pipeline.json`. Hand-editing
// that JSON mid-run is the most error-prone surface in an autonomous run (a
// dropped comma silently breaks the whole pipeline). This CLI does the edits
// safely: parse -> mutate the exact node -> ATOMIC write (temp + rename),
// preserving 2-space formatting and a trailing newline.
//
//   node pipeline-patch.mjs record-candidate <item> <key> <idx> <path> [status] [llm]
//   node pipeline-patch.mjs approve          <item> <key> <idx>
//   node pipeline-patch.mjs reject           <item> <key> <idx> "<reason>"
//   node pipeline-patch.mjs animate-done      <item> <selector> <gifPath>
//   node pipeline-patch.mjs set-mode          (autonomous | gated)
//   node pipeline-patch.mjs show              [item]
//
// <key>      = a keyframe id (the item's master id or one of its children ids).
// <selector> = an idle's `for` id, or a transition as `<from>__to__<to>` (or just `<to>`).
// All paths recorded are written verbatim (use v2-relative paths, e.g.
// items/<id>/<key>/00.png) — they are only pointers (see manifest-schema.md).
//
// Node built-ins only. Resolves pipeline.json against the repo root, like integrate.mjs.

import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..", "..");
const PIPELINE_JSON = path.join(REPO_ROOT, "godot", "assets", "tiles", "v2", "pipeline.json");

function die(msg) {
  console.error(`pipeline-patch: ${msg}`);
  process.exit(1);
}

// ── Load / save ───────────────────────────────────────────────────────────────
function load() {
  if (!existsSync(PIPELINE_JSON)) die(`pipeline.json not found at ${PIPELINE_JSON}`);
  try {
    return JSON.parse(readFileSync(PIPELINE_JSON, "utf8"));
  } catch (e) {
    die(`failed to parse pipeline.json: ${e.message}`);
  }
}

// Atomic write: stringify (2-space + trailing newline, matching the hand-authored
// file), write a temp sibling, then rename over the original so a crash can never
// leave a half-written pipeline.json.
function save(data) {
  const out = JSON.stringify(data, null, 2) + "\n";
  const tmp = `${PIPELINE_JSON}.tmp-${process.pid}`;
  writeFileSync(tmp, out);
  renameSync(tmp, PIPELINE_JSON);
}

// ── Node lookup ───────────────────────────────────────────────────────────────
function findItem(data, itemId) {
  const item = (data.items || []).find((i) => i && i.id === itemId);
  if (!item) die(`no item "${itemId}" in pipeline.json (have: ${(data.items || []).map((i) => i.id).join(", ")})`);
  return item;
}

// A keyframe is the item's master or one of its children, matched by id.
function findKeyframe(item, keyId) {
  const entries = [item.master, ...(item.children || [])].filter(Boolean);
  const kf = entries.find((e) => e && e.id === keyId);
  if (!kf) die(`no keyframe "${keyId}" in item "${item.id}" (have: ${entries.map((e) => e.id).join(", ")})`);
  return kf;
}

function findCandidate(kf, idx) {
  return (kf.candidates || []).find((c) => c && c.idx === idx) || null;
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

// ── Commands ──────────────────────────────────────────────────────────────────
function cmdRecordCandidate(args) {
  const [itemId, keyId, idxRaw, p, status = "generated", llm] = args;
  if (!itemId || !keyId || idxRaw === undefined || !p) {
    die("record-candidate <item> <key> <idx> <path> [status] [llm]");
  }
  const idx = Number(idxRaw);
  if (!Number.isInteger(idx)) die(`idx must be an integer (got "${idxRaw}")`);
  const data = load();
  const kf = findKeyframe(findItem(data, itemId), keyId);
  kf.candidates = kf.candidates || [];
  let cand = findCandidate(kf, idx);
  if (!cand) {
    cand = { idx, path: p, status };
    kf.candidates.push(cand);
    kf.candidates.sort((a, b) => a.idx - b.idx);
  } else {
    cand.path = p;
    cand.status = status;
  }
  if (llm) cand.llm = llm;
  save(data);
  console.log(`recorded ${itemId}/${keyId} candidate idx=${idx} status=${status}${llm ? ` llm=${llm}` : ""}`);
}

function cmdApprove(args) {
  const [itemId, keyId, idxRaw] = args;
  if (!itemId || !keyId || idxRaw === undefined) die("approve <item> <key> <idx>");
  const idx = Number(idxRaw);
  if (!Number.isInteger(idx)) die(`idx must be an integer (got "${idxRaw}")`);
  const data = load();
  const kf = findKeyframe(findItem(data, itemId), keyId);
  const cand = findCandidate(kf, idx);
  if (!cand) die(`no candidate idx=${idx} on ${itemId}/${keyId} — record-candidate it first`);
  cand.status = "approved";
  cand.llm = "pass";
  kf.selected = idx;
  save(data);
  console.log(`approved ${itemId}/${keyId} idx=${idx} (selected=${idx})`);
}

function cmdReject(args) {
  const [itemId, keyId, idxRaw, ...reasonParts] = args;
  if (!itemId || !keyId || idxRaw === undefined) die('reject <item> <key> <idx> "<reason>"');
  const idx = Number(idxRaw);
  if (!Number.isInteger(idx)) die(`idx must be an integer (got "${idxRaw}")`);
  const reason = reasonParts.join(" ").trim();
  if (!reason) die("reject requires a <reason> (kept inline as the audit trail)");
  const data = load();
  const kf = findKeyframe(findItem(data, itemId), keyId);
  const cand = findCandidate(kf, idx);
  if (!cand) die(`no candidate idx=${idx} on ${itemId}/${keyId} — record-candidate it first`);
  cand.status = "rejected";
  cand.llm = "fail";
  cand.reason = reason;
  if (kf.selected === idx) kf.selected = null;
  save(data);
  console.log(`rejected ${itemId}/${keyId} idx=${idx}: ${reason}`);
}

function cmdAnimateDone(args) {
  const [itemId, selector, gif] = args;
  if (!itemId || !selector || !gif) die("animate-done <item> <selector> <gifPath>");
  const data = load();
  const anim = findAnimation(findItem(data, itemId), selector);
  anim.status = "generated";
  anim.gif = gif;
  save(data);
  console.log(`animation ${itemId}/${selector} -> generated, gif=${gif}`);
}

function cmdSetMode(args) {
  const [mode] = args;
  if (mode !== "autonomous" && mode !== "gated") die("set-mode (autonomous | gated)");
  const data = load();
  data.settings = data.settings || {};
  if (mode === "autonomous") {
    data.settings.humanApproval = false;
    data.settings.autonomous = true;
  } else {
    data.settings.humanApproval = true;
    data.settings.autonomous = false;
  }
  save(data);
  console.log(`mode = ${mode} (humanApproval=${data.settings.humanApproval}, autonomous=${data.settings.autonomous})`);
}

function cmdShow(args) {
  const [itemId] = args;
  const data = load();
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

// ── CLI ───────────────────────────────────────────────────────────────────────
const USAGE = `Usage:
  node pipeline-patch.mjs record-candidate <item> <key> <idx> <path> [status] [llm]
  node pipeline-patch.mjs approve          <item> <key> <idx>
  node pipeline-patch.mjs reject           <item> <key> <idx> "<reason>"
  node pipeline-patch.mjs animate-done     <item> <selector> <gifPath>
  node pipeline-patch.mjs set-mode         (autonomous | gated)
  node pipeline-patch.mjs show             [item]`;

function main() {
  const [cmd, ...args] = process.argv.slice(2);
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
