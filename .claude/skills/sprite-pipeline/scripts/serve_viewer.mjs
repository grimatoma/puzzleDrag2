#!/usr/bin/env node
// sprite-pipeline — the pixelGen viewer control server.
//
// One small node:http server that does two jobs:
//   1. Static-serves the built pixelGen viewer + the v2 asset tree, so the page at
//      /pixelGen/index.html, its /pixelGen/data.json, and the `../sets/...` -> /sets/... asset URLs
//      all resolve from a single document root (godot/assets/tiles/v2).
//   2. Accepts the viewer's POST decisions and PATCHES the three-file model in place. Under the new
//      split, a keyframe's *preference* (`selected`/`selectedPath`/`comment`) lives in
//      `pipeline.json`, but the candidate *records* (`status`/`reason`) live in the
//      `pipeline.history.json` sidecar. So a patch locates an item by `itemId` and a keyframe by
//      `keyId` (master then children) in the pipeline, resolves that keyframe's candidate list out of
//      history, mutates whichever file(s) the action owns, and writes ONLY those files back
//      atomically (temp file + rename), pretty-printed with a trailing newline. All load/validate/
//      write goes through the shared `manifest.mjs` seam.
//
//   Which file each action dirties:
//     select   → pipeline.json only          (sets key.selected)
//     approve  → pipeline.json + history.json (sets key.selected + key.selectedPath; candidate→approved)
//     regen    → history.json only           (each flagged candidate → failed + reason)
//     comment  → pipeline.json only          (sets key.comment)
//   When both are dirty (approve) we write history FIRST, then pipeline, so the watcher's rebuild
//   always ends on a consistent pair.
//
// data.json freshness: on startup we run one build, then spawn `build_viewer.mjs --watch` as a
// child so any change to pipeline.json/pipeline.history.json — including our own patches —
// auto-rebuilds pixelGen/data.json and the viewer re-polls. The child is cleaned up on SIGINT/SIGTERM.
//
// Architecture mirrors tools/serve-godot-dist.mjs (createServer, MIME map, path-traversal guard,
// $PORT). Node built-ins only (http, fs, path, url, child_process). No npm deps.
//
//   node serve_viewer.mjs [--root <dir>] [--pipeline <path>] [--port <n>]
//
// Defaults:
//   --root      godot/assets/tiles/v2          (document root; pixelGen/ + sets/ live under it)
//   --pipeline  <root>/pipeline.json           (the file patched in place; sidecars derived from it)
//   --port      8100  (override via $PORT)

import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import * as manifest from "./manifest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ -> sprite-pipeline/ -> skills/ -> .claude/ -> repo (or worktree) root.
const repoRoot = resolve(__dirname, "..", "..", "..", "..");
const buildViewerPath = join(__dirname, "build_viewer.mjs");

// ── arg parsing ────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { root: null, pipeline: null, port: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") out.root = argv[++i];
    else if (a === "--pipeline") out.pipeline = argv[++i];
    else if (a === "--port") out.port = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log("usage: node serve_viewer.mjs [--root <dir>] [--pipeline <path>] [--port <n>]");
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const docRoot = resolve(args.root || join(repoRoot, "godot", "assets", "tiles", "v2"));
const pipelinePath = resolve(args.pipeline || join(docRoot, "pipeline.json"));
const port = args.port || Number(process.env.PORT) || 8100;

// MIME map — covers the viewer shell (.html/.css/.js/.json), the generated art (.png/.gif), and the
// odd .svg/.ico. Anything else falls back to octet-stream.
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
};

function contentType(filePath) {
  return MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
}

// ── small response helpers ───────────────────────────────────────────────────────────────────
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}
function sendText(res, code, msg) {
  res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(msg);
}

// ── three-file patch primitives ──────────────────────────────────────────────────────────────
// Find an item by id in pipeline.items.
function findItem(pipeline, itemId) {
  const items = Array.isArray(pipeline.items) ? pipeline.items : [];
  return items.find((it) => it && typeof it === "object" && it.id === itemId) || null;
}

// Find a keyframe by id within an item: master first, then children[].
function findKey(item, keyId) {
  if (item.master && typeof item.master === "object" && item.master.id === keyId) {
    return item.master;
  }
  const children = Array.isArray(item.children) ? item.children : [];
  return children.find((c) => c && typeof c === "object" && c.id === keyId) || null;
}

// Resolve { item, key, histCands } from a body's itemId/keyId, or an { error: {code,msg} } describing
// the miss. `key` is the keyframe object inside `pipeline` (preference fields live here); `histCands`
// is that keyframe's candidate array inside `history` (the record fields live there). `histCands`
// aliases into the loaded history tree, so mutating its elements and then writing `history` persists.
function resolveTarget(pipeline, history, body) {
  if (typeof body.itemId !== "string" || body.itemId === "") {
    return { error: { code: 400, msg: "missing or invalid itemId" } };
  }
  if (typeof body.keyId !== "string" || body.keyId === "") {
    return { error: { code: 400, msg: "missing or invalid keyId" } };
  }
  const item = findItem(pipeline, body.itemId);
  if (!item) return { error: { code: 404, msg: `item not found: ${body.itemId}` } };
  const key = findKey(item, body.keyId);
  if (!key) return { error: { code: 404, msg: `key not found: ${body.keyId}` } };
  const perItem = history && typeof history === "object" ? history[item.id] : null;
  const histCands =
    perItem && typeof perItem === "object" && Array.isArray(perItem[key.id]) ? perItem[key.id] : [];
  return { item, key, histCands };
}

// Match a candidate by its `idx` FIELD (not array position), so we stay consistent with
// build_viewer/viewer/integrate, which all key off `idx`. `histCands` is the keyframe's history list.
function candidateAt(histCands, idx) {
  if (!Number.isInteger(idx)) return null;
  return histCands.find((c) => c && c.idx === idx) || null;
}

// ── the four patch actions ────────────────────────────────────────────────────────────────────
// Each receives { key, histCands, body } and either returns { error } on a validation miss, or
// mutates the file(s) it owns in place and returns a `dirty` map naming which file(s) changed:
//   { dirty: { pipeline: bool, history: bool } }
// The handler writes ONLY the files flagged dirty (history first, then pipeline). `key` lives in the
// loaded pipeline; `histCands` aliases into the loaded history, so mutations there persist on write.
const ACTIONS = {
  // preference only — set key.selected in pipeline. No history change.
  select({ key, histCands, body }) {
    if (!Number.isInteger(body.idx)) return { error: { code: 400, msg: "idx must be an integer" } };
    if (!candidateAt(histCands, body.idx)) {
      return { error: { code: 400, msg: `idx out of range: ${body.idx}` } };
    }
    key.selected = body.idx;
    return { dirty: { pipeline: true, history: false } };
  },

  // select + record the chosen candidate's path in pipeline, AND mark it approved in history.
  approve({ key, histCands, body }) {
    if (!Number.isInteger(body.idx)) return { error: { code: 400, msg: "idx must be an integer" } };
    const cand = candidateAt(histCands, body.idx);
    if (!cand) return { error: { code: 400, msg: `idx out of range: ${body.idx}` } };
    key.selected = body.idx;
    key.selectedPath = typeof cand.path === "string" ? cand.path : null;
    cand.status = "approved";
    return { dirty: { pipeline: true, history: true } };
  },

  // flag one or more candidates for regenerate → history status "failed" + reason (gap-fill rule 4
  // re-seeds). Pipeline is untouched.
  regen({ histCands, body }) {
    if (!Array.isArray(body.idxs) || body.idxs.length === 0) {
      return { error: { code: 400, msg: "idxs must be a non-empty array" } };
    }
    // Validate every index up front so the patch is all-or-nothing.
    for (const idx of body.idxs) {
      if (!Number.isInteger(idx) || !candidateAt(histCands, idx)) {
        return { error: { code: 400, msg: `idx out of range: ${idx}` } };
      }
    }
    for (const idx of body.idxs) {
      const cand = candidateAt(histCands, idx);
      cand.status = "failed";
      cand.reason = "human: flagged for regenerate";
    }
    return { dirty: { pipeline: false, history: true } };
  },

  // attach / overwrite a free-text review comment on the keyframe (pipeline only).
  comment({ key, body }) {
    if (body.comment == null) return { error: { code: 400, msg: "missing comment" } };
    key.comment = String(body.comment);
    return { dirty: { pipeline: true, history: false } };
  },
};

// ── POST body reader (size-capped, defensive JSON parse) ───────────────────────────────────────
// Resolves a discriminated result so the caller can answer with a clean status (never a socket
// reset): { ok:true, value } on success, or { ok:false, code, msg } on overflow / transport error.
// On overflow we stop buffering and drain the rest of the request without destroying the socket, so
// the 413 response flushes normally.
const MAX_BODY = 64 * 1024; // 64 KB
function readBody(req) {
  return new Promise((resolvePromise) => {
    let size = 0;
    const chunks = [];
    let settled = false;
    let overflow = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolvePromise(result);
    };
    req.on("data", (chunk) => {
      if (overflow) return; // already over cap — drain & discard the remainder.
      size += chunk.length;
      if (size > MAX_BODY) {
        overflow = true;
        chunks.length = 0; // free what we buffered.
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (overflow) finish({ ok: false, code: 413, msg: "payload too large (cap 64KB)" });
      else finish({ ok: true, value: Buffer.concat(chunks).toString("utf8") });
    });
    req.on("error", (err) => finish({ ok: false, code: 400, msg: `read error: ${err.message}` }));
  });
}

// ── POST /api/<action> handler ─────────────────────────────────────────────────────────────────
async function handleApi(req, res, action) {
  if (req.method !== "POST") {
    sendText(res, 405, "405 Method Not Allowed");
    return;
  }
  const fn = ACTIONS[action];
  if (!fn) {
    sendText(res, 404, `404 Unknown action: ${action}`);
    return;
  }

  const read = await readBody(req);
  if (!read.ok) {
    sendText(res, read.code, `${read.code} ${read.msg}`);
    return;
  }

  let body;
  try {
    body = JSON.parse(read.value || "");
  } catch {
    sendText(res, 400, "400 Bad Request: malformed JSON");
    return;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    sendText(res, 400, "400 Bad Request: body must be a JSON object");
    return;
  }

  // Load BOTH files (history sidecar reads as {} when absent) and schema-validate each on-disk doc
  // before touching anything — mirror build_viewer's gate so a corrupt pair can't be patched into a
  // worse state. We validate the on-disk pipeline/history (never a merged shape).
  let pipeline;
  let history;
  try {
    pipeline = manifest.loadPipeline(pipelinePath);
    history = manifest.loadHistory(pipelinePath);
    const schema = manifest.loadSchema(pipelinePath);
    const errs = [
      ...manifest.validateDoc(pipeline, schema, "pipelineDoc"),
      ...manifest.validateDoc(history, schema, "historyDoc"),
    ];
    if (errs.length) {
      sendText(res, 500, `500 invalid pipeline data: ${errs.join("; ")}`);
      return;
    }
  } catch (err) {
    sendText(res, 500, `500 pipeline data unreadable: ${err.message}`);
    return;
  }

  const target = resolveTarget(pipeline, history, body);
  if (target.error) {
    sendText(res, target.error.code, `${target.error.code} ${target.error.msg}`);
    return;
  }

  const result = fn({ key: target.key, histCands: target.histCands, body });
  if (result.error) {
    sendText(res, result.error.code, `${result.error.code} ${result.error.msg}`);
    return;
  }

  // Write ONLY the files the action dirtied. When both changed (approve), write history FIRST then
  // pipeline so the watcher's rebuild always ends on a consistent pair (selectedPath ↔ approved
  // status). The `histCands` array aliases into `history`, so its mutations are already reflected.
  const dirty = result.dirty || {};
  try {
    if (dirty.history) manifest.writeHistory(pipelinePath, history);
    if (dirty.pipeline) manifest.writePipeline(pipelinePath, pipeline);
  } catch (err) {
    sendText(res, 500, `500 could not write pipeline data: ${err.message}`);
    return;
  }

  // The spawned --watch child rebuilds data.json; the viewer re-polls. Nothing more to do here.
  sendJson(res, 200, { ok: true, action, itemId: body.itemId, keyId: body.keyId });
}

// ── static GET/HEAD handler ────────────────────────────────────────────────────────────────────
function handleStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "405 Method Not Allowed");
    return;
  }

  // Strip query/hash, default "/" → /pixelGen/index.html, decode percent-escapes.
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || "/").split("?")[0].split("#")[0]);
  } catch {
    sendText(res, 400, "400 Bad Request: bad URL encoding");
    return;
  }
  if (urlPath === "/" || urlPath === "") urlPath = "/pixelGen/index.html";

  // Resolve INSIDE docRoot and reject path-traversal (a leading-".." escape).
  const resolved = normalize(join(docRoot, urlPath));
  if (resolved !== docRoot && !resolved.startsWith(docRoot + sep)) {
    sendText(res, 403, "403 Forbidden");
    return;
  }

  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    sendText(res, 404, "404 Not Found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentType(resolved),
    "Cache-Control": "no-store",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(resolved).pipe(res);
}

// ── server ─────────────────────────────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  const pathname = (req.url || "/").split("?")[0].split("#")[0];

  // /api/* → POST patch endpoints; everything else → static GET/HEAD.
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const action = pathname.replace(/^\/api\/?/, "");
    handleApi(req, res, action).catch((err) => {
      // Never let an unexpected throw crash the process or hang the socket.
      try {
        sendText(res, 500, `500 Internal Server Error: ${err.message}`);
      } catch {
        /* response already sent */
      }
    });
    return;
  }

  try {
    handleStatic(req, res);
  } catch (err) {
    try {
      sendText(res, 500, `500 Internal Server Error: ${err.message}`);
    } catch {
      /* ignore */
    }
  }
});

server.on("error", (err) => {
  console.error(`serve_viewer: server error: ${err.message}`);
  cleanup(1);
});

// ── build_viewer child (--watch) ────────────────────────────────────────────────────────────────
let watchChild = null;

function startWatchChild() {
  watchChild = spawn("node", [buildViewerPath, "--pipeline", pipelinePath, "--watch"], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  watchChild.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`serve_viewer: build_viewer --watch exited (code=${code}, signal=${signal})`);
    }
    watchChild = null;
  });
  watchChild.on("error", (err) => {
    console.error(`serve_viewer: could not spawn build_viewer --watch: ${err.message}`);
  });
}

// ── lifecycle ────────────────────────────────────────────────────────────────────────────────
let shuttingDown = false;
function cleanup(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (watchChild) {
    try {
      watchChild.kill();
    } catch {
      /* ignore */
    }
    watchChild = null;
  }
  try {
    server.close();
  } catch {
    /* ignore */
  }
  process.exit(code);
}
process.on("SIGINT", () => cleanup(0));
process.on("SIGTERM", () => cleanup(0));

// ── main ───────────────────────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(pipelinePath)) {
    console.error(`serve_viewer: pipeline.json not found: ${pipelinePath}`);
    process.exit(1);
  }
  if (!existsSync(buildViewerPath)) {
    console.error(`serve_viewer: build_viewer.mjs not found: ${buildViewerPath}`);
    process.exit(1);
  }

  // 1) one-shot build so data.json + the template are present before we serve.
  try {
    const { execFileSync } = await import("node:child_process");
    execFileSync("node", [buildViewerPath, "--pipeline", pipelinePath], { stdio: "inherit" });
  } catch (err) {
    console.error(`serve_viewer: initial build_viewer run failed: ${err.message}`);
    process.exit(1);
  }

  // 2) spawn the watcher so future pipeline.json edits (incl. our patches) rebuild data.json.
  startWatchChild();

  // 3) serve.
  server.listen(port, () => {
    console.log(`serve_viewer: docRoot   ${docRoot}`);
    console.log(`serve_viewer: pipeline  ${pipelinePath}`);
    console.log(`serve_viewer: listening on http://localhost:${port}/  (viewer at /pixelGen/)`);
  });
}

main();
