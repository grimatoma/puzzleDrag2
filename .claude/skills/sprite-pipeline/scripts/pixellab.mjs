#!/usr/bin/env node
// sprite-pipeline — PixelLab still-image CLI + importable module.
//
// Moves the async create -> poll -> download loop OUT of the agent's token budget.
// Instead of hand-running create_map_object, polling get_map_object N times, and
// curl-ing the download URL, the agent runs ONE command and gets back a saved PNG.
//
//   node pixellab.mjs balance
//   node pixellab.mjs create --desc "<text>" --out <path.png> [--width 32] [--height 32]
//                            [--view "low top-down"] [--outline "selective outline"]
//                            [--shading "medium shading"] [--detail "medium detail"]
//
// The PixelLab MCP server is a STATELESS JSON-RPC-over-HTTP endpoint (no session
// handshake). Responses are SSE-framed; there is no structured field payload, so we
// parse the human-readable text at result.content[0].text.
//
// Token: $PIXELLAB_TOKEN, else the `pixellab` server config in ~/.claude.json. NEVER
// logged or printed. Node built-ins only (global `fetch`, Node 18+).

import { readFileSync, writeFileSync } from "node:fs";
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
  // Match "<key>: <value>" up to end of line. key is a literal.
  const re = new RegExp(`${escapeRe(key)}\\s*:\\s*(.+)`, "i");
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
  writeFileSync(outAbs, buf);
  return outAbs;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
  node pixellab.mjs create --desc "<text>" --out <path.png>
       [--width 32] [--height 32] [--view "low top-down"]
       [--outline "selective outline"] [--shading "medium shading"]
       [--detail "medium detail"]`;

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
