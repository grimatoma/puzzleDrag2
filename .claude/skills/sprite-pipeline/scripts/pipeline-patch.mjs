#!/usr/bin/env node
// sprite-pipeline — three-file bookkeeping CLI.
//
// The orchestrator records candidate lifecycle (generated/approved/rejected), the approved `selected`
// idx + paired `selectedPath`, animation status+gif, and the run mode. Under the three-file split
// (see manifest.mjs) those fields live in TWO sibling files under `godot/assets/tiles/v2/`:
//
//   • pipeline.json          — spec + state. Keyframes keep `selected` + `selectedPath` (+ optional
//                              `comment`); animations keep `status`/`gif`/`storyboard` (+ optional
//                              `comment`); `settings` holds the run mode + the `reviewState`
//                              pause/resume handshake; the top-level `runState` is the orchestrator's
//                              progress broadcast to the viewer. NO candidates here.
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
//   node pipeline-patch.mjs reject-all       <item> <key> "<reason>"
//   node pipeline-patch.mjs animate-done      <item> <selector> <gifPath> [storyboardPath]
//   node pipeline-patch.mjs set-mode          (autonomous | gated)
//   node pipeline-patch.mjs run-state         <idle|running|waiting|done> ["<detail>"]
//   node pipeline-patch.mjs clear-comment     <item> <keyOrSelector>
//   node pipeline-patch.mjs await-review      [--timeout <seconds>] [--interval <seconds>]
//   node pipeline-patch.mjs show              [item]
//
// Human-gate plumbing: `run-state` broadcasts the orchestrator's current stage to the viewer (e.g.
// "Stage 2: generating grass candidates (2/4)"). `await-review` is the blocking gate — it sets
// `settings.reviewState = "reviewing"`, polls both files printing each human decision as it lands,
// and returns when the viewer flips reviewState to "resume" (final machine-readable diff on the
// AWAIT_REVIEW_RESULT line; exit 3 + partial diff on timeout). `reject-all` marks every candidate of
// a keyframe `failed` ("none of these are good — regenerate fresh"; `failed` is RE-SEEDED by
// build_viewer's gap-fill planner, unlike terminal `rejected`) and clears the selection.
// `clear-comment` deletes consumed human feedback from a keyframe or animation so the viewer's
// "feedback pending" indicator clears.
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

// A keyframe is the item's master or one of its children, matched by id. matchKeyframe returns
// null on a miss (for callers that fall through to animations); findKeyframe dies on a miss.
function matchKeyframe(item, keyId) {
  const entries = [item.master, ...(item.children || [])].filter(Boolean);
  return entries.find((e) => e && e.id === keyId) || null;
}

function findKeyframe(item, keyId) {
  const kf = matchKeyframe(item, keyId);
  if (!kf) {
    const entries = [item.master, ...(item.children || [])].filter(Boolean);
    die(`no keyframe "${keyId}" in item "${item.id}" (have: ${entries.map((e) => e.id).join(", ")})`);
  }
  return kf;
}

// Match an animation by selector: an idle's `for`, or a transition as
// `<from>__to__<to>` or just `<to>`. matchAnimation returns null on a miss; findAnimation dies.
function matchAnimation(item, selector) {
  for (const a of item.animations || []) {
    if (a.kind === "idle" && a.for === selector) return a;
    if (a.kind === "transition") {
      if (`${a.from}__to__${a.to}` === selector) return a;
      if (a.to === selector) return a;
    }
  }
  return null;
}

function findAnimation(item, selector) {
  const anim = matchAnimation(item, selector);
  if (!anim) die(`no animation matching "${selector}" in item "${item.id}"`);
  return anim;
}

// Canonical selector for an animation (used as the stable diff/snapshot key and in show output).
function animationSelector(a) {
  return a.kind === "idle" ? a.for : `${a.from}__to__${a.to}`;
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

// reject-all: "none of these are good — regenerate fresh". Every candidate recorded for the keyframe
// flips to "failed" (+ shared reason) in HISTORY — `failed` (unlike terminal `rejected`) is RE-SEEDED
// by build_viewer's gap-fill planner, so the whole batch gets retried. The keyframe's selection state
// (selected/selectedPath/source/objectId) is cleared in PIPELINE. Writes history FIRST, then pipeline.
function cmdRejectAll(args) {
  const [itemId, keyId, ...reasonParts] = args;
  if (!itemId || !keyId) die('reject-all <item> <key> "<reason>"');
  const reason = reasonParts.join(" ").trim();
  if (!reason) die("reject-all requires a <reason> (recorded on every candidate as the audit trail)");
  const { pipeline, history } = loadAll();
  const kf = findKeyframe(findItem(pipeline, itemId), keyId);
  const cands = candidateList(history, itemId, keyId);
  if (!cands.length) die(`no candidates recorded on ${itemId}/${keyId} — nothing to reject`);
  for (const cand of cands) {
    cand.status = "failed";
    cand.reason = reason;
  }
  kf.selected = null;
  kf.selectedPath = null;
  kf.source = null;
  kf.objectId = null;
  manifest.writeHistory(PIPELINE_JSON, history);
  manifest.writePipeline(PIPELINE_JSON, pipeline);
  console.log(`rejected-all ${itemId}/${keyId} (${cands.length} candidate(s) -> failed, selection cleared): ${reason}`);
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

// run-state: the orchestrator's progress broadcast, e.g. `run-state running "Stage 2: generating
// grass candidates (2/4)"`. Lives at PIPELINE top level so the viewer can show it. Pipeline only.
const RUN_STATUSES = ["idle", "running", "waiting", "done"];

function cmdRunState(args) {
  const [status, ...detailParts] = args;
  if (!RUN_STATUSES.includes(status)) die(`run-state (${RUN_STATUSES.join(" | ")}) ["<detail>"]`);
  const detail = detailParts.join(" ").trim();
  const { pipeline } = loadAll();
  const runState = { status };
  if (detail) runState.detail = detail;
  runState.updatedAt = new Date().toISOString();
  pipeline.runState = runState;
  manifest.writePipeline(PIPELINE_JSON, pipeline);
  console.log(`runState = ${status}${detail ? ` — ${detail}` : ""}`);
}

// clear-comment: the orchestrator consumed a piece of human feedback; delete the `comment` so the
// viewer's "feedback pending" indicator clears. <keyOrSelector> is tried as a keyframe id first,
// then as an animation selector. Pipeline only. Idempotent: an already-clear target is not an error.
function cmdClearComment(args) {
  const [itemId, keyOrSelector] = args;
  if (!itemId || !keyOrSelector) die("clear-comment <item> <keyOrSelector>");
  const { pipeline } = loadAll();
  const item = findItem(pipeline, itemId);
  let target = matchKeyframe(item, keyOrSelector);
  let kindLabel = "keyframe";
  if (!target) {
    target = matchAnimation(item, keyOrSelector);
    kindLabel = "animation";
  }
  if (!target) die(`no keyframe or animation matching "${keyOrSelector}" in item "${itemId}"`);
  const hadComment = typeof target.comment === "string";
  delete target.comment;
  manifest.writePipeline(PIPELINE_JSON, pipeline);
  console.log(hadComment
    ? `cleared comment on ${kindLabel} ${itemId}/${keyOrSelector}`
    : `no comment on ${kindLabel} ${itemId}/${keyOrSelector} (already clear)`);
}

// ── await-review (the blocking human gate) ──────────────────────────────────────────
// Snapshot the review-relevant state: per keyframe {selected, comment, prompt}, per history candidate
// {status, reason}, per animation {status, comment} — keyed `<itemId>/<keyId-or-selector>` (ids never
// contain "/"). Snapshots are plain data so two of them diff cleanly.
function takeSnapshot(pipeline, history) {
  const snap = { keyframes: {}, candidates: {}, animations: {} };
  for (const item of pipeline.items || []) {
    if (!item || typeof item !== "object") continue;
    for (const kf of [item.master, ...(item.children || [])].filter(Boolean)) {
      const key = `${item.id}/${kf.id}`;
      snap.keyframes[key] = {
        selected: Number.isInteger(kf.selected) ? kf.selected : null,
        comment: typeof kf.comment === "string" ? kf.comment : null,
        prompt: typeof kf.prompt === "string" ? kf.prompt : null,
      };
      const perCand = {};
      for (const cand of candidateList(history, item.id, kf.id)) {
        if (!cand || !Number.isInteger(cand.idx)) continue;
        perCand[cand.idx] = {
          status: typeof cand.status === "string" ? cand.status : null,
          reason: typeof cand.reason === "string" ? cand.reason : null,
        };
      }
      snap.candidates[key] = perCand;
    }
    for (const a of item.animations || []) {
      if (!a || typeof a !== "object") continue;
      snap.animations[`${item.id}/${animationSelector(a)}`] = {
        status: typeof a.status === "string" ? a.status : null,
        comment: typeof a.comment === "string" ? a.comment : null,
      };
    }
  }
  return snap;
}

// Split a snapshot key back into [itemId, keyOrSelector] (ids never contain "/").
function splitSnapKey(key) {
  const i = key.indexOf("/");
  return [key.slice(0, i), key.slice(i + 1)];
}

// The AWAIT_REVIEW_RESULT payload: each list is the diff of `cur` vs the STARTING snapshot.
function diffSummary(start, cur) {
  const out = { approved: [], rejectedAll: [], failedCandidates: [], comments: [], animations: [], promptEdits: [] };
  for (const [snapKey, kf] of Object.entries(cur.keyframes)) {
    const [item, key] = splitSnapKey(snapKey);
    const prev = start.keyframes[snapKey] || { selected: null, comment: null, prompt: null };
    if (kf.selected !== null && kf.selected !== prev.selected) out.approved.push({ item, key, idx: kf.selected });
    if (kf.comment !== null && kf.comment !== prev.comment) out.comments.push({ item, key, comment: kf.comment });
    if (kf.prompt !== null && prev.prompt !== null && kf.prompt !== prev.prompt) out.promptEdits.push({ item, key, prompt: kf.prompt });
    const prevCands = start.candidates[snapKey] || {};
    const curCands = cur.candidates[snapKey] || {};
    const idxs = Object.keys(curCands);
    let newlyFailed = 0;
    for (const idx of idxs) {
      const cand = curCands[idx];
      const before = prevCands[idx];
      if (cand.status === "failed" && (!before || before.status !== "failed")) {
        newlyFailed += 1;
        out.failedCandidates.push({ item, key, idx: Number(idx), reason: cand.reason });
      }
    }
    // rejected-all = the keyframe's whole candidate pool is now "failed" and wasn't before.
    const allFailedNow = idxs.length > 0 && idxs.every((idx) => curCands[idx].status === "failed");
    const prevIdxs = Object.keys(prevCands);
    const allFailedBefore = prevIdxs.length > 0 && prevIdxs.every((idx) => prevCands[idx].status === "failed");
    if (allFailedNow && !allFailedBefore && newlyFailed > 0) out.rejectedAll.push({ item, key });
  }
  for (const [snapKey, anim] of Object.entries(cur.animations)) {
    const [item, selector] = splitSnapKey(snapKey);
    const prev = start.animations[snapKey] || { status: null, comment: null };
    if (anim.status !== prev.status || anim.comment !== prev.comment) {
      out.animations.push({ item, selector, status: anim.status, comment: anim.comment });
    }
  }
  return out;
}

// Human-readable one-liners for what changed between two consecutive poll ticks. Candidate status
// lines are only printed for failed/rejected (an approval already prints via the selection change).
function tickLines(prev, cur) {
  const lines = [];
  for (const [snapKey, kf] of Object.entries(cur.keyframes)) {
    const [item, key] = splitSnapKey(snapKey);
    const before = prev.keyframes[snapKey] || { selected: null, comment: null, prompt: null };
    if (kf.selected !== before.selected) {
      lines.push(kf.selected !== null ? `approved ${item}/${key} idx=${kf.selected}` : `selection cleared ${item}/${key}`);
    }
    if (kf.comment !== before.comment) {
      lines.push(kf.comment !== null ? `comment on ${item}/${key}: ${JSON.stringify(kf.comment)}` : `comment cleared ${item}/${key}`);
    }
    if (before.prompt !== null && kf.prompt !== before.prompt) lines.push(`prompt edited ${item}/${key}`);
    const prevCands = prev.candidates[snapKey] || {};
    const curCands = cur.candidates[snapKey] || {};
    const idxs = Object.keys(curCands);
    const changed = idxs.filter((idx) => {
      const b = prevCands[idx];
      return (!b || b.status !== curCands[idx].status) && ["failed", "rejected"].includes(curCands[idx].status);
    });
    const allFailedNow = idxs.length > 0 && idxs.every((idx) => curCands[idx].status === "failed");
    if (allFailedNow && changed.length > 1 && changed.every((idx) => curCands[idx].status === "failed")) {
      lines.push(`rejected-all ${item}/${key}`);
    } else {
      for (const idx of changed) lines.push(`candidate ${curCands[idx].status} ${item}/${key} idx=${idx}`);
    }
  }
  for (const [snapKey, anim] of Object.entries(cur.animations)) {
    const [item, selector] = splitSnapKey(snapKey);
    const before = prev.animations[snapKey] || { status: null, comment: null };
    if (anim.status !== before.status) lines.push(`animation ${anim.status} ${item}/${selector}`);
    if (anim.comment !== before.comment && anim.comment !== null) {
      lines.push(`comment on animation ${item}/${selector}: ${JSON.stringify(anim.comment)}`);
    }
  }
  return lines;
}

// await-review: block until the human resumes from the viewer. Sets the reviewState handshake to
// "reviewing" (+ a generic "waiting" runState unless the orchestrator already broadcast a more
// specific one), then polls both files, narrating each decision as it lands. The viewer flips
// `settings.reviewState` to "resume" -> we delete the handshake, print the machine-readable diff on
// the AWAIT_REVIEW_RESULT line, exit 0. On timeout: reviewState is left as-is, the partial diff is
// printed in the same format, exit 3. A transient read failure (mid-write race) skips that tick.
async function cmdAwaitReview(args) {
  let timeoutSec = 3600;
  let intervalSec = 2;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--timeout") {
      timeoutSec = Number(args[++i]);
      if (!Number.isFinite(timeoutSec) || timeoutSec <= 0) die("--timeout requires a positive number of seconds");
    } else if (args[i] === "--interval") {
      intervalSec = Number(args[++i]);
      if (!Number.isFinite(intervalSec) || intervalSec <= 0) die("--interval requires a positive number of seconds");
    } else {
      die(`await-review: unknown argument "${args[i]}" — await-review [--timeout <seconds>] [--interval <seconds>]`);
    }
  }
  const { pipeline, history } = loadAll();
  const schema = manifest.loadSchema(PIPELINE_JSON);
  pipeline.settings = pipeline.settings || {};
  pipeline.settings.reviewState = "reviewing";
  // Broadcast "waiting" — but don't clobber a more specific detail already set via `run-state waiting`.
  if (!pipeline.runState || pipeline.runState.status !== "waiting") {
    pipeline.runState = { status: "waiting", detail: "awaiting human review in pixelGen", updatedAt: new Date().toISOString() };
  }
  manifest.writePipeline(PIPELINE_JSON, pipeline);
  console.log("await-review: waiting for decisions (resume from the viewer or Ctrl+C)");

  const startSnap = takeSnapshot(pipeline, history);
  let prevSnap = startSnap;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    await sleep(Math.min(intervalSec * 1000, Math.max(deadline - Date.now(), 0)));
    let curPipeline;
    let curHistory;
    try {
      curPipeline = manifest.loadPipeline(PIPELINE_JSON);
      curHistory = manifest.loadHistory(PIPELINE_JSON);
    } catch {
      continue; // mid-write race — skip this tick, retry next interval
    }
    const curSnap = takeSnapshot(curPipeline, curHistory);
    for (const line of tickLines(prevSnap, curSnap)) console.log(line);
    prevSnap = curSnap;
    if (curPipeline.settings && curPipeline.settings.reviewState === "resume") {
      // Consume the handshake (refusing, as everywhere, to mutate invalid data) and report the diff.
      const errs = manifest.validateDoc(curPipeline, schema, "pipelineDoc");
      if (errs.length) die(`pipeline.json became invalid during review — refusing to mutate:\n  ${errs.join("\n  ")}`);
      delete curPipeline.settings.reviewState;
      manifest.writePipeline(PIPELINE_JSON, curPipeline);
      console.log(`AWAIT_REVIEW_RESULT ${JSON.stringify(diffSummary(startSnap, curSnap))}`);
      return;
    }
  }
  console.error(`await-review: timed out after ${timeoutSec}s (reviewState left as-is)`);
  console.log(`AWAIT_REVIEW_RESULT ${JSON.stringify(diffSummary(startSnap, prevSnap))}`);
  process.exit(3);
}

// show: read-only. Use loadMerged so each keyframe's `candidates` are spliced in from history, then
// display settings (+ reviewState) + runState + per-keyframe selected/candidate counts/comment +
// per-animation status/comment. No write.
function cmdShow(args) {
  const [itemId] = args;
  // Validate the on-disk pair (loadAll) before reading the merged view, so `show` also refuses to
  // operate on invalid data. The merged shape itself is NOT schema-valid (it re-adds candidates).
  loadAll();
  const data = manifest.loadMerged(PIPELINE_JSON);
  const items = itemId ? [findItem(data, itemId)] : data.items || [];
  const review = data.settings?.reviewState ? ` reviewState=${data.settings.reviewState}` : "";
  console.log(`settings: humanApproval=${data.settings?.humanApproval} autonomous=${data.settings?.autonomous} candidates=${data.settings?.candidates}${review}`);
  if (data.runState) {
    const rs = data.runState;
    console.log(`runState: ${rs.status}${rs.detail ? ` — ${rs.detail}` : ""}${rs.updatedAt ? ` (updatedAt ${rs.updatedAt})` : ""}`);
  }
  for (const item of items) {
    console.log(`\nitem ${item.id}`);
    for (const kf of [item.master, ...(item.children || [])].filter(Boolean)) {
      const n = (kf.candidates || []).length;
      const comment = typeof kf.comment === "string" ? `  comment=${JSON.stringify(kf.comment)}` : "";
      console.log(`  ${kf === item.master ? "master" : "child "} ${kf.id}  selected=${kf.selected}  candidates=${n}${comment}`);
    }
    for (const a of item.animations || []) {
      const comment = typeof a.comment === "string" ? `  comment=${JSON.stringify(a.comment)}` : "";
      console.log(`  ${a.kind.padEnd(10)} ${animationSelector(a)}  status=${a.status}${comment}`);
    }
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────────
const USAGE = `Usage:
  node pipeline-patch.mjs record-candidate <item> <key> <idx> <path> [status] [llm] [--source hand|pixellab] [--object <uuid>] [--review-object <uuid>]
  node pipeline-patch.mjs approve          <item> <key> <idx>
  node pipeline-patch.mjs reject           <item> <key> <idx> "<reason>"
  node pipeline-patch.mjs reject-all       <item> <key> "<reason>"          all candidates -> failed (re-seeded), selection cleared
  node pipeline-patch.mjs animate-done     <item> <selector> <gifPath> [storyboardPath]
  node pipeline-patch.mjs set-mode         (autonomous | gated)
  node pipeline-patch.mjs run-state        (idle | running | waiting | done) ["<detail>"]
  node pipeline-patch.mjs clear-comment    <item> <keyOrSelector>           consume human feedback (keyframe id, else animation selector)
  node pipeline-patch.mjs await-review     [--timeout <seconds>] [--interval <seconds>]
                                           block until the viewer resumes; prints AWAIT_REVIEW_RESULT <json>
                                           (defaults: timeout 3600, interval 2; exit 3 + partial diff on timeout)
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
    case "reject-all": return cmdRejectAll(args);
    case "animate-done": return cmdAnimateDone(args);
    case "set-mode": return cmdSetMode(args);
    case "run-state": return cmdRunState(args);
    case "clear-comment": return cmdClearComment(args);
    case "await-review": return cmdAwaitReview(args);
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
  // await-review is async (poll loop); every other command resolves synchronously. Funnel a rejected
  // promise through die() so an async failure still exits non-zero with the pipeline-patch prefix.
  Promise.resolve(main()).catch((e) => die(e instanceof Error ? e.message : String(e)));
}
