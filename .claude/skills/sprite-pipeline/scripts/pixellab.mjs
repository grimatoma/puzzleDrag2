#!/usr/bin/env node
// sprite-pipeline — PixelLab CLI + importable module.
//
// Moves the async create -> poll -> download loop OUT of the agent's token budget.
// Instead of hand-running MCP tools, polling N times, and curl-ing download URLs,
// the agent runs ONE command and gets back saved PNGs. Crucially, the OBJECT flow
// commands read/emit image files directly, so base64 frames never pass through an
// LLM (hand-emitted base64 corrupts).
//
//   node pixellab.mjs balance
//   node pixellab.mjs create --desc "<text>" --out <path.png>            # legacy map-object still
//   node pixellab.mjs create-object --desc "<text>" --out-dir <dir>     # review pack of candidates
//                            [--size 32] [--view top-down] [--style a.png,b.png]
//   node pixellab.mjs select-frames --object <id> --indices 3,17 --out-dir <dir>
//   node pixellab.mjs state --object <id> --desc "<edit>" --out <path.png> [--seed N]
//   node pixellab.mjs animate --object <id> --desc "<motion>" --out-dir <dir>
//                            [--frames 8] [--start <png>] [--end <png>] [--name <name>]
//   node pixellab.mjs object --id <id> [--preview]                      # raw get_object (debug)
//
// The OBJECT flow is the KEYFRAME backbone of the sprite pipeline (Stage 2 only):
//   create-object  -> one review pack (many candidate seeds, ONE call)
//   select-frames  -> promote the audited winner(s); each becomes its own object
//   state          -> derive a variant (season/damage/etc.) FROM an object —
//                     image-conditioned, so size/silhouette/identity carry over
//
// ANIMATION IS NOT DONE HERE. The sprite-pipeline animates idles + transitions
// BY HAND IN ASEPRITE (references/aseprite-execution.md); PixelLab's job ends at
// the keyframe stills. `animate`/`fetch-anim` below are an out-of-pipeline ESCAPE
// HATCH (v3 motion / keyframe interpolation) for prototyping in OTHER contexts —
// do NOT use them to produce shipped pipeline motion.
//
// The PixelLab MCP server is a STATELESS JSON-RPC-over-HTTP endpoint (no session
// handshake). Responses are SSE-framed; there is no structured field payload, so we
// parse the human-readable text at result.content[0].text.
//
// Token: $PIXELLAB_TOKEN, else the `pixellab` server config in ~/.claude.json. NEVER
// logged or printed. Node built-ins only (global `fetch`, Node 18+).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MCP_URL = "https://api.pixellab.ai/mcp";
const POLL_INTERVAL_MS = 5000; // 5s — don't tight-loop; map objects finish in ~30-90s.
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min sane ceiling.

// ── Token lookup ─────────────────────────────────────────────────────────────
// Prefer $PIXELLAB_TOKEN. Otherwise scan ~/.claude.json for a server config object
// keyed "pixellab" with headers.Authorization = "Bearer <token>". The token is a
// secret — it is never returned in any user-facing string or logged.
function loadToken() {
  const fromEnv = process.env.PIXELLAB_TOKEN;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  const claudeJsonPath = path.join(homedir(), ".claude.json");
  let raw;
  try {
    raw = readFileSync(claudeJsonPath, "utf8");
  } catch {
    die(
      `no $PIXELLAB_TOKEN and could not read ${claudeJsonPath} to find the pixellab token.`,
    );
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    die(`failed to parse ${claudeJsonPath}: ${e.message}`);
  }

  // The pixellab server config can live under a few shapes/locations across Claude
  // Code versions (top-level mcpServers, per-project mcpServers, etc). Recursively
  // find the first object keyed "pixellab" that has headers.Authorization.
  const auth = findPixellabAuth(data);
  if (!auth) {
    die(
      `no $PIXELLAB_TOKEN and no pixellab server config with headers.Authorization found in ${claudeJsonPath}.`,
    );
  }
  // Strip a leading "Bearer " (case-insensitive) if present.
  return auth.replace(/^Bearer\s+/i, "").trim();
}

// Walk the parsed ~/.claude.json looking for a "pixellab"-keyed server object whose
// value has headers.Authorization. Returns the Authorization string or null.
function findPixellabAuth(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findPixellabAuth(item);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key, val] of Object.entries(node)) {
    if (
      key === "pixellab" &&
      val &&
      typeof val === "object" &&
      val.headers &&
      typeof val.headers === "object" &&
      typeof val.headers.Authorization === "string"
    ) {
      return val.headers.Authorization;
    }
    const hit = findPixellabAuth(val);
    if (hit) return hit;
  }
  return null;
}

// ── JSON-RPC over HTTP (SSE-framed responses) ────────────────────────────────
let rpcId = 0;

// Parse an SSE body: lines like `event: message\ndata: {json}`. Concatenate the
// `data:` payload(s) and JSON.parse. We take the LAST data block (the result).
function parseSse(body) {
  const dataLines = [];
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }
  if (dataLines.length === 0) {
    // Some responses may be plain JSON, not SSE-framed — try the whole body.
    const trimmed = body.trim();
    if (trimmed.startsWith("{")) return JSON.parse(trimmed);
    throw new Error(`no SSE data line in response:\n${body.slice(0, 400)}`);
  }
  // Each `data:` block is a standalone JSON-RPC frame; the result frame is last.
  return JSON.parse(dataLines[dataLines.length - 1]);
}

// Call one MCP tool. Returns result.content[0].text (the human-readable result).
// Throws on transport errors, JSON-RPC errors, or result.isError.
async function callTool(token, name, args) {
  const id = ++rpcId;
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${name}: ${body.slice(0, 400)}`);
  }

  let frame;
  try {
    frame = parseSse(body);
  } catch (e) {
    throw new Error(`failed to parse ${name} response: ${e.message}`);
  }

  if (frame.error) {
    throw new Error(
      `JSON-RPC error from ${name}: ${frame.error.message || JSON.stringify(frame.error)}`,
    );
  }
  const result = frame.result;
  if (!result || !Array.isArray(result.content) || !result.content[0]) {
    throw new Error(`${name}: unexpected result shape: ${JSON.stringify(frame).slice(0, 400)}`);
  }
  const text = result.content[0].text ?? "";
  if (result.isError) {
    throw new Error(`${name} reported an error: ${text}`);
  }
  return text;
}

// ── Text-field extraction ────────────────────────────────────────────────────
// The result text is human-readable, not structured. Pull `key: value` fields.
function field(text, key) {
  // Match "<key>: <value>" up to end of line. key is a literal, anchored to line
  // start (after optional indent) so e.g. field(text,"id") can't be hijacked by an
  // "object_id:" line.
  const re = new RegExp(`(?:^|\\n)[^\\S\\n]*${escapeRe(key)}\\s*:\\s*(.+)`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Public API ───────────────────────────────────────────────────────────────

// Returns the number of remaining generations (proves auth end-to-end).
export async function getBalance(token = loadToken()) {
  const text = await callTool(token, "get_balance", {});
  const raw = field(text, "generations_remaining");
  if (raw === null) {
    throw new Error(`get_balance: no generations_remaining in:\n${text}`);
  }
  const n = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) {
    throw new Error(`get_balance: could not parse generations_remaining from "${raw}"`);
  }
  return n;
}

// Create a single map object, poll until completed, download the PNG to `out`.
// Returns the absolute path written.
export async function generateStill({
  desc,
  out,
  width = 32,
  height = 32,
  view = "low top-down",
  outline = "selective outline",
  shading = "medium shading",
  detail = "medium detail",
  token = loadToken(),
  log = () => {},
} = {}) {
  if (!desc) throw new Error("generateStill: `desc` is required");
  if (!out) throw new Error("generateStill: `out` is required");
  const outAbs = path.resolve(out);

  // 1. create
  log(`creating map object (${width}x${height}, view="${view}") ...`);
  const createText = await callTool(token, "create_map_object", {
    description: desc,
    width,
    height,
    view,
    outline,
    shading,
    detail,
  });
  const objectId = field(createText, "id");
  if (!objectId) {
    throw new Error(`create_map_object: no id in result:\n${createText}`);
  }
  log(`created object ${objectId} — polling ...`);

  // 2. poll get_map_object until "completed" (or timeout).
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let downloadUrl = null;
  while (true) {
    const text = await callTool(token, "get_map_object", { object_id: objectId });
    const status = field(text, "status") || "";
    if (/completed/i.test(status)) {
      downloadUrl = field(text, "download");
      if (!downloadUrl) {
        throw new Error(`get_map_object: completed but no download URL:\n${text}`);
      }
      log(`status: completed`);
      break;
    }
    log(`status: ${status || "processing"} (waiting ${POLL_INTERVAL_MS / 1000}s)`);
    if (Date.now() >= deadline) {
      throw new Error(
        `timed out after ${POLL_TIMEOUT_MS / 1000}s waiting for object ${objectId} (last status: ${status})`,
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }

  // 3. download (map objects auto-delete after 8h — grab it now).
  log(`downloading -> ${outAbs}`);
  const dl = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!dl.ok) {
    throw new Error(`download failed: HTTP ${dl.status} from ${downloadUrl}`);
  }
  const buf = Buffer.from(await dl.arrayBuffer());
  // Guard against a 200-with-error-body landing in the .png.
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error(`download did not return a PNG (${buf.length} bytes) from ${downloadUrl}`);
  }
  writeFileSync(outAbs, buf);
  return outAbs;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Object workflow (the consistency backbone) ───────────────────────────────
// 1-direction objects are PERSISTENT (unlike map objects, which auto-delete in
// 8h) and support derived STATES + v3 ANIMATION — including interpolation
// between two provided frames. This is what keeps a family of seasonal
// keyframes the same size/silhouette/identity.

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Download a URL to outAbs and verify it's a PNG. Presigned storage URLs can
// reject an extra Authorization header, so try authed first, then bare.
async function downloadPng(url, outAbs, token) {
  for (const headers of [{ Authorization: `Bearer ${token}` }, {}]) {
    const dl = await fetch(url, { headers });
    if (!dl.ok) continue;
    const buf = Buffer.from(await dl.arrayBuffer());
    if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIG)) {
      mkdirSync(path.dirname(outAbs), { recursive: true });
      writeFileSync(outAbs, buf);
      return outAbs;
    }
  }
  throw new Error(`download did not return a PNG from ${url}`);
}

function fileToB64(p) {
  return readFileSync(path.resolve(p)).toString("base64");
}

// Every https URL in a response text, with trailing punctuation stripped.
function allUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s"')\]]+/g)].map((m) =>
    m[0].replace(/[.,;]+$/, ""),
  );
}

// Poll get_object until its status matches `until` (regex). Returns the final
// response text. Throws on "failed" status or timeout.
export async function pollObject(
  objectId,
  {
    until = /completed|review/i,
    token = loadToken(),
    log = () => {},
    timeoutMs = POLL_TIMEOUT_MS,
    intervalMs = POLL_INTERVAL_MS,
  } = {},
) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const text = await callTool(token, "get_object", {
      object_id: objectId,
      include_preview: false,
    });
    const status = field(text, "status") || "";
    if (until.test(status)) return text;
    if (/failed/i.test(status)) {
      throw new Error(`object ${objectId} failed:\n${text}`);
    }
    log(`status: ${status || "processing"} (waiting ${intervalMs / 1000}s)`);
    if (Date.now() >= deadline) {
      throw new Error(
        `timed out after ${timeoutMs / 1000}s waiting for object ${objectId} (last status: ${status})`,
      );
    }
    await sleep(intervalMs);
  }
}

// Create a 1-direction object (a review pack of candidate seeds at tile sizes).
// stylePaths: PNG files (each <=256px) passed as style references — this is how
// shipped sibling tiles ACTUALLY condition the generation (max 8 at <=85px).
// Downloads every candidate frame to outDir/cand_NN.png.
// Returns { objectId, status, candidates: [{ index, path, url }] }.
export async function createObject({
  desc,
  outDir,
  size = 32,
  view = "top-down",
  stylePaths = [],
  token = loadToken(),
  log = () => {},
} = {}) {
  if (!desc) throw new Error("createObject: `desc` is required");
  if (!outDir) throw new Error("createObject: `outDir` is required");
  const args = { description: desc, view };
  if (stylePaths.length > 0) {
    args.style_images = stylePaths.map((p) => ({
      base64: fileToB64(p),
      format: "png",
      type: "base64",
    }));
  } else {
    args.size = size;
  }
  log(`creating 1-direction object (${stylePaths.length} style refs) ...`);
  const createText = await callTool(token, "create_1_direction_object", args);
  const objectId = field(createText, "id");
  if (!objectId) throw new Error(`create_1_direction_object: no id in:\n${createText}`);
  log(`created object ${objectId} — polling ...`);

  const text = await pollObject(objectId, { token, log });
  const status = field(text, "status") || "";
  const candidates = await downloadObjectFrames(text, objectId, outDir, token, log);
  return { objectId, status, candidates };
}

// Pull candidate/rotation frame URLs out of a get_object response and download
// them to outDir/cand_NN.png in listed order.
async function downloadObjectFrames(text, objectId, outDir, token, log) {
  const urls = allUrls(text).filter((u) => /\.png(\?|$)/i.test(u) || /frame|rotation|image|candidate/i.test(u));
  if (urls.length === 0) {
    throw new Error(`get_object ${objectId}: no frame URLs found in:\n${text.slice(0, 800)}`);
  }
  const outDirAbs = path.resolve(outDir);
  const out = [];
  for (let i = 0; i < urls.length; i++) {
    const p = path.join(outDirAbs, `cand_${String(i).padStart(2, "0")}.png`);
    await downloadPng(urls[i], p, token);
    out.push({ index: i, path: p, url: urls[i] });
  }
  log(`downloaded ${out.length} frame(s) -> ${outDirAbs}`);
  return out;
}

// Promote review-pack frames to standalone completed objects.
// Returns [{ index, objectId, path }] (path = downloaded PNG per selection).
export async function selectFrames({
  objectId,
  indices,
  outDir,
  token = loadToken(),
  log = () => {},
} = {}) {
  if (!objectId) throw new Error("selectFrames: `objectId` is required");
  if (!indices || indices.length === 0) throw new Error("selectFrames: `indices` is required");
  const text = await callTool(token, "select_object_frames", {
    object_id: objectId,
    indices,
  });
  // Response lists the new object ids (one per kept frame). Grab every UUID
  // that isn't the review object's own id, in order.
  const uuids = [...text.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)]
    .map((m) => m[0])
    .filter((u) => u !== objectId);
  const newIds = [...new Set(uuids)];
  if (newIds.length === 0) {
    throw new Error(`select_object_frames: no new object ids in:\n${text}`);
  }
  log(`promoted ${newIds.length} frame(s): ${newIds.join(", ")}`);
  const out = [];
  for (let i = 0; i < newIds.length; i++) {
    const id = newIds[i];
    let entry = { index: indices[i], objectId: id, path: null };
    if (outDir) {
      const t = await pollObject(id, { token, log, until: /completed/i });
      const p = path.join(path.resolve(outDir), `${id}.png`);
      const urls = allUrls(t).filter((u) => /\.png(\?|$)/i.test(u));
      if (urls.length > 0) {
        await downloadPng(urls[0], p, token);
        entry.path = p;
      }
    }
    out.push(entry);
  }
  return out;
}

// Derive a variant (season, damage, growth stage …) FROM an existing object.
// Image-conditioned: keeps the source's size/composition/identity, applies the
// edit. Returns { objectId, path } (downloads the state's frame to `out`).
export async function createState({
  objectId,
  desc,
  out,
  seed,
  token = loadToken(),
  log = () => {},
} = {}) {
  if (!objectId) throw new Error("createState: `objectId` is required");
  if (!desc) throw new Error("createState: `desc` is required");
  if (!out) throw new Error("createState: `out` is required");
  const args = { object_id: objectId, edit_description: desc };
  if (seed !== undefined) args.seed = seed;
  log(`creating object state from ${objectId} ...`);
  const text = await callTool(token, "create_object_state", args);
  const uuids = [...text.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)]
    .map((m) => m[0])
    .filter((u) => u !== objectId);
  const stateId = uuids[0];
  if (!stateId) throw new Error(`create_object_state: no new object id in:\n${text}`);
  log(`state object ${stateId} — polling ...`);
  const t = await pollObject(stateId, { token, log, until: /completed/i });
  const urls = allUrls(t).filter((u) => /\.png(\?|$)/i.test(u));
  if (urls.length === 0) throw new Error(`state ${stateId}: no frame URL in:\n${t.slice(0, 800)}`);
  const outAbs = path.resolve(out);
  await downloadPng(urls[0], outAbs, token);
  return { objectId: stateId, path: outAbs };
}

// Animate an object with v3. Text mode animates the object's own idle frame
// (stays on-model). Interpolation mode (--start/--end PNGs) generates REAL
// inbetweens from startPath to endPath — the fix for season transitions.
// Downloads the finished frames to outDir/NN.png.
// `name` is REQUIRED: animations attach to the object as named blocks, and the
// name is how we find OUR animation (an object can hold several).
// Returns { animationName, frames: [paths] }.
export async function animateObject({
  objectId,
  desc,
  outDir,
  frames,
  startPath,
  endPath,
  name,
  token = loadToken(),
  log = () => {},
} = {}) {
  if (!objectId) throw new Error("animateObject: `objectId` is required");
  if (!desc) throw new Error("animateObject: `desc` is required");
  if (!outDir) throw new Error("animateObject: `outDir` is required");
  if (!name) throw new Error("animateObject: `name` is required (used to locate the finished animation on the object)");
  const args = {
    object_id: objectId,
    animation_description: desc,
    mode: "v3",
    display_name: name,
  };
  if (frames !== undefined) args.frame_count = frames;
  if (startPath) args.custom_start_frame_base64 = fileToB64(startPath);
  if (endPath) args.end_frame_base64 = fileToB64(endPath);
  log(`queueing v3 animation "${name}" on ${objectId}${endPath ? " (interpolation)" : ""} ...`);
  const text = await callTool(token, "animate_object", args);
  log(text.split(/\r?\n/).slice(0, 6).join(" | "));
  return fetchAnimation({ objectId, name, outDir, token, log });
}

// Poll get_object until the named animation has its frames listed, then
// download them to outDir/NN.png. Resume-safe: call it again any time for an
// animation that was queued earlier (no new generation spend).
export async function fetchAnimation({
  objectId,
  name,
  outDir,
  token = loadToken(),
  log = () => {},
} = {}) {
  if (!objectId) throw new Error("fetchAnimation: `objectId` is required");
  if (!name) throw new Error("fetchAnimation: `name` is required");
  if (!outDir) throw new Error("fetchAnimation: `outDir` is required");
  const deadline = Date.now() + POLL_TIMEOUT_MS * 2; // animations can take minutes (and stall at 95%)
  let anim = null;
  while (true) {
    const t = await callTool(token, "get_object", {
      object_id: objectId,
      include_preview: false,
    });
    anim = parseAnimations(t).find((a) => a.name === name) || null;
    if (anim && anim.urls.length > 0) break;
    if (Date.now() >= deadline) {
      throw new Error(`timed out waiting for animation "${name}" on ${objectId}; last:\n${t.slice(0, 1200)}`);
    }
    const pending = (t.match(/^pending jobs.*$/im) || [])[0] || "no pending-jobs line";
    log(`animation "${name}" not ready (${pending.trim()}) — waiting ${POLL_INTERVAL_MS / 1000}s`);
    await sleep(POLL_INTERVAL_MS);
  }

  const outDirAbs = path.resolve(outDir);
  const out = [];
  for (let i = 0; i < anim.urls.length; i++) {
    const p = path.join(outDirAbs, `${String(i).padStart(2, "0")}.png`);
    await downloadPng(anim.urls[i], p, token);
    out.push(p);
  }
  log(`downloaded ${out.length} animation frame(s) -> ${outDirAbs}`);
  return { animationName: name, frames: out };
}

// Parse the `animations (N groups):` section of a get_object response into
// [{ name, group, frames, urls }]. Frame URLs come as a TEMPLATE —
//   unknown: https://…/animations/<animId>/unknown/{i}.png  (i=0..8)
// — which we expand into the concrete 0..N urls.
function parseAnimations(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  let cur = null;
  for (const line of lines) {
    const head = line.match(/^  (.+?) \[group: ([0-9a-f-]{36})\]\s*$/i);
    if (head) {
      cur = { name: head[1].trim(), group: head[2], frames: 0, urls: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    const fr = line.match(/^\s+frames:\s*(\d+)/i);
    if (fr) cur.frames = Number(fr[1]);
    const tpl = line.match(/(https?:\/\/\S*\{i\}\S*)\s+\(i=0\.\.(\d+)\)/i);
    if (tpl) {
      const n = Number(tpl[2]);
      for (let i = 0; i <= n; i++) cur.urls.push(tpl[1].replace("{i}", String(i)));
    }
  }
  return out;
}

// Raw get_object passthrough (debug: inspect a response shape).
export async function getObjectRaw(objectId, { preview = false, token = loadToken() } = {}) {
  return callTool(token, "get_object", {
    object_id: objectId,
    include_preview: preview,
  });
}

// Download every base/candidate frame of an existing object to outDir/cand_NN.png
// (review packs list 64 candidates; completed objects list their rotation frame).
// Resume helper: lets a run pick a pack back up without re-creating the object.
export async function fetchObjectFrames(objectId, outDir, { token = loadToken(), log = () => {} } = {}) {
  const text = await pollObject(objectId, { token, log });
  const status = field(text, "status") || "";
  const candidates = await downloadObjectFrames(text, objectId, outDir, token, log);
  return { objectId, status, candidates };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function die(msg) {
  console.error(`pixellab: ${msg}`);
  process.exit(1);
}

function parseFlags(argv) {
  // Map of --flag value (and --flag=value). Bare positionals collected too.
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("--")) {
          flags[a.slice(2)] = true; // boolean flag
        } else {
          flags[a.slice(2)] = next;
          i++;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

const USAGE = `Usage:
  node pixellab.mjs balance
  node pixellab.mjs create --desc "<text>" --out <path.png>            (legacy map-object still)
       [--width 32] [--height 32] [--view "low top-down"]
       [--outline "selective outline"] [--shading "medium shading"]
       [--detail "medium detail"]
  node pixellab.mjs create-object --desc "<text>" --out-dir <dir>      (review pack of candidates)
       [--size 32] [--view top-down] [--style a.png,b.png]
  node pixellab.mjs select-frames --object <id> --indices 3,17 [--out-dir <dir>]
  node pixellab.mjs state --object <id> --desc "<edit>" --out <path.png> [--seed N]
  node pixellab.mjs animate --object <id> --desc "<motion>" --name <name> --out-dir <dir>
       [--frames 8] [--start <png>] [--end <png>]
  node pixellab.mjs fetch-anim --object <id> --name <name> --out-dir <dir>   (resume a queued animation)
  node pixellab.mjs fetch-frames --object <id> --out-dir <dir>         (re-download candidates/base)
  node pixellab.mjs object --id <id> [--preview]                       (raw get_object, debug)

Object-flow results print one JSON line on stdout (progress goes to stderr).`;

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const { flags } = parseFlags(argv.slice(1));

  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    console.log(USAGE);
    process.exit(cmd ? 0 : 1);
  }

  if (cmd === "balance") {
    const n = await getBalance();
    console.log(`generations_remaining: ${n}`);
    return;
  }

  if (cmd === "create") {
    if (!flags.desc) die(`create requires --desc\n\n${USAGE}`);
    if (!flags.out) die(`create requires --out\n\n${USAGE}`);
    const opts = {
      desc: String(flags.desc),
      out: String(flags.out),
      log: (m) => console.error(`pixellab: ${m}`), // progress -> stderr
    };
    if (flags.width !== undefined) opts.width = Number(flags.width);
    if (flags.height !== undefined) opts.height = Number(flags.height);
    if (flags.view !== undefined) opts.view = String(flags.view);
    if (flags.outline !== undefined) opts.outline = String(flags.outline);
    if (flags.shading !== undefined) opts.shading = String(flags.shading);
    if (flags.detail !== undefined) opts.detail = String(flags.detail);

    const saved = await generateStill(opts);
    // Last stdout line is the saved absolute path so a caller can capture it.
    console.log(saved);
    return;
  }

  const log = (m) => console.error(`pixellab: ${m}`); // progress -> stderr

  if (cmd === "create-object") {
    if (!flags.desc) die(`create-object requires --desc\n\n${USAGE}`);
    if (!flags["out-dir"]) die(`create-object requires --out-dir\n\n${USAGE}`);
    const opts = {
      desc: String(flags.desc),
      outDir: String(flags["out-dir"]),
      log,
    };
    if (flags.size !== undefined) opts.size = Number(flags.size);
    if (flags.view !== undefined) opts.view = String(flags.view);
    if (flags.style !== undefined) {
      opts.stylePaths = String(flags.style).split(",").map((s) => s.trim()).filter(Boolean);
    }
    const result = await createObject(opts);
    console.log(JSON.stringify(result));
    return;
  }

  if (cmd === "select-frames") {
    if (!flags.object) die(`select-frames requires --object\n\n${USAGE}`);
    if (!flags.indices) die(`select-frames requires --indices\n\n${USAGE}`);
    const result = await selectFrames({
      objectId: String(flags.object),
      indices: String(flags.indices).split(",").map((s) => Number(s.trim())),
      outDir: flags["out-dir"] ? String(flags["out-dir"]) : undefined,
      log,
    });
    console.log(JSON.stringify(result));
    return;
  }

  if (cmd === "state") {
    if (!flags.object) die(`state requires --object\n\n${USAGE}`);
    if (!flags.desc) die(`state requires --desc\n\n${USAGE}`);
    if (!flags.out) die(`state requires --out\n\n${USAGE}`);
    const opts = {
      objectId: String(flags.object),
      desc: String(flags.desc),
      out: String(flags.out),
      log,
    };
    if (flags.seed !== undefined) opts.seed = Number(flags.seed);
    const result = await createState(opts);
    console.log(JSON.stringify(result));
    return;
  }

  if (cmd === "animate") {
    if (!flags.object) die(`animate requires --object\n\n${USAGE}`);
    if (!flags.desc) die(`animate requires --desc\n\n${USAGE}`);
    if (!flags["out-dir"]) die(`animate requires --out-dir\n\n${USAGE}`);
    if (!flags.name) die(`animate requires --name (locates the finished animation on the object)\n\n${USAGE}`);
    const opts = {
      objectId: String(flags.object),
      desc: String(flags.desc),
      outDir: String(flags["out-dir"]),
      name: String(flags.name),
      log,
    };
    if (flags.frames !== undefined) opts.frames = Number(flags.frames);
    if (flags.start !== undefined) opts.startPath = String(flags.start);
    if (flags.end !== undefined) opts.endPath = String(flags.end);
    const result = await animateObject(opts);
    console.log(JSON.stringify(result));
    return;
  }

  if (cmd === "fetch-anim") {
    if (!flags.object) die(`fetch-anim requires --object\n\n${USAGE}`);
    if (!flags.name) die(`fetch-anim requires --name\n\n${USAGE}`);
    if (!flags["out-dir"]) die(`fetch-anim requires --out-dir\n\n${USAGE}`);
    const result = await fetchAnimation({
      objectId: String(flags.object),
      name: String(flags.name),
      outDir: String(flags["out-dir"]),
      log,
    });
    console.log(JSON.stringify(result));
    return;
  }

  if (cmd === "object") {
    if (!flags.id) die(`object requires --id\n\n${USAGE}`);
    const text = await getObjectRaw(String(flags.id), { preview: Boolean(flags.preview) });
    console.log(text);
    return;
  }

  if (cmd === "fetch-frames") {
    if (!flags.object) die(`fetch-frames requires --object\n\n${USAGE}`);
    if (!flags["out-dir"]) die(`fetch-frames requires --out-dir\n\n${USAGE}`);
    const result = await fetchObjectFrames(String(flags.object), String(flags["out-dir"]), { log });
    console.log(JSON.stringify(result));
    return;
  }

  die(`unknown command "${cmd}"\n\n${USAGE}`);
}

// Guard the CLI so the module stays importable.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => {
    // e.message must never carry the token; all throw sites above use the URL/text,
    // not the Authorization header.
    die(e.message || String(e));
  });
}
