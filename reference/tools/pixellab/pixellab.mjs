// Seasonal tile pipeline over PixelLab's v2 REST endpoints.
//
//   generateWithStyle  -> POST /v2/generate-with-style-v2   (new subject in the anchor's style)
//   editWithText       -> POST /v2/edit-images-v2           (chainable seasonal edit of any PNG)
//   animateTransition  -> POST /v2/animate-with-text-v3     (start+end interpolation; deferred)
//
// All three are async: POST returns a background job id, then we poll
// GET /v2/background-jobs/{id} until the image(s) land (base64 in last_response).
//
// Auth: the bearer token is read at runtime from the configured `pixellab` MCP
// entry in ~/.claude.json (or PIXELLAB_TOKEN env override). It is never logged.
//
// CLI:
//   node tools/pixellab/pixellab.mjs gen  --style a.png[,b.png] --desc "..." --size 128 --out out.png
//   node tools/pixellab/pixellab.mjs edit --src in.png --desc "..." --out out.png
//   node tools/pixellab/pixellab.mjs anim --start a.png --end b.png --action "..." --frames 8 --out dir/

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const BASE = 'https://api.pixellab.ai/v2';

function getToken() {
  if (process.env.PIXELLAB_TOKEN) return process.env.PIXELLAB_TOKEN.trim();
  const cfg = readFileSync(join(homedir(), '.claude.json'), 'utf8');
  const m = cfg.match(/Bearer\s+([0-9a-fA-F-]{36})/);
  if (!m) throw new Error('PixelLab token not found (set PIXELLAB_TOKEN or configure the pixellab MCP).');
  return m[1];
}
const HEADERS = { Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' };

// --- image helpers ---------------------------------------------------------
function readPng(path) {
  const buf = readFileSync(path);
  // PNG IHDR: width @ byte 16, height @ byte 20 (big-endian uint32)
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { base64: buf.toString('base64'), width, height };
}
const sizedImage = (path) => { const i = readPng(path); return { image: { type: 'base64', base64: i.base64, format: 'png' }, width: i.width, height: i.height }; };
const bareFrame = (path) => { const i = readPng(path); return { type: 'base64', base64: i.base64, format: 'png' }; };

function saveB64(b64, path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(String(b64).replace(/^data:image\/png;base64,/, ''), 'base64'));
  return path;
}

// --- API plumbing ----------------------------------------------------------
async function post(endpoint, body) {
  const r = await fetch(BASE + endpoint, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error('POST ' + endpoint + ' -> ' + r.status + '\n' + text.slice(0, 1400));
  return JSON.parse(text);
}
const jobIdOf = (j) => j.background_job_id || j.id || j.job_id;

async function pollJob(jobId, { intervalMs = 3000, timeoutMs = 540000 } = {}) {
  const start = Date.now();
  for (;;) {
    const r = await fetch(BASE + '/background-jobs/' + jobId, { headers: HEADERS });
    const j = await r.json();
    const st = String(j.status || '').toLowerCase();
    const pending = ['processing', 'pending', 'queued', 'running', 'in_progress', 'started', 'created'].includes(st);
    if (!pending) {
      if (/fail|error|cancel/.test(st)) throw new Error('job ' + jobId + ' ' + st + ': ' + JSON.stringify(j).slice(0, 900));
      return j; // terminal success (label may be "completed"/"success"/...)
    }
    if (Date.now() - start > timeoutMs) throw new Error('job ' + jobId + ' timed out (last status: ' + st + ')');
    await new Promise((res) => setTimeout(res, intervalMs));
  }
}

// last_response shape varies per endpoint; pull base64 PNG(s) wherever they live.
function collectImages(lastResponse) {
  const out = [];
  const push = (v) => {
    if (!v) return;
    if (typeof v === 'string') out.push(v);
    else if (v.base64) out.push(v.base64);
    else if (v.image && v.image.base64) out.push(v.image.base64);
  };
  const lr = lastResponse || {};
  if (Array.isArray(lr.images)) lr.images.forEach(push);
  else if (Array.isArray(lr.frames)) lr.frames.forEach(push);
  else if (lr.image) push(lr.image);
  else if (lr.images) push(lr.images);
  return out;
}

// --- high-level steps ------------------------------------------------------
export async function generateWithStyle({ stylePaths, description, size = 128, styleDescription, out }) {
  const job = await post('/generate-with-style-v2', {
    style_images: stylePaths.map(sizedImage),
    description,
    image_size: { width: size, height: size },
    no_background: true,
    ...(styleDescription ? { style_description: styleDescription } : {}),
  });
  const done = await pollJob(jobIdOf(job));
  const imgs = collectImages(done.last_response);
  const saved = imgs.map((b, i) => saveB64(b, imgs.length > 1 ? out.replace(/\.png$/, `_${i}.png`) : out));
  return { jobId: jobIdOf(job), usage: job.usage, saved, rawKeys: Object.keys(done.last_response || {}) };
}

export async function editWithText({ srcPath, description, size = 128, out }) {
  const job = await post('/edit-images-v2', {
    method: 'edit_with_text',
    edit_images: [sizedImage(srcPath)],
    image_size: { width: size, height: size },
    description,
    no_background: true,
  });
  const done = await pollJob(jobIdOf(job));
  const imgs = collectImages(done.last_response);
  const saved = imgs.map((b, i) => saveB64(b, imgs.length > 1 ? out.replace(/\.png$/, `_${i}.png`) : out));
  return { jobId: jobIdOf(job), usage: job.usage, saved, rawKeys: Object.keys(done.last_response || {}) };
}

export async function animateTransition({ startPath, endPath, action, frameCount = 8, outDir, seed }) {
  const body = { first_frame: bareFrame(startPath), action, frame_count: frameCount, no_background: true };
  if (endPath) body.last_frame = bareFrame(endPath);
  if (seed != null) body.seed = seed;
  const job = await post('/animate-with-text-v3', body);
  const done = await pollJob(jobIdOf(job));
  const imgs = collectImages(done.last_response);
  const saved = imgs.map((b, i) => saveB64(b, join(outDir, `frame_${String(i).padStart(2, '0')}.png`)));
  return { jobId: jobIdOf(job), usage: job.usage, saved, rawKeys: Object.keys(done.last_response || {}) };
}

// --- CLI -------------------------------------------------------------------
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      a[k] = v;
    }
  }
  return a;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('pixellab.mjs')) {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = parseArgs(rest);
  try {
    let r;
    if (cmd === 'gen') r = await generateWithStyle({ stylePaths: (a.style || '').split(',').filter(Boolean), description: a.desc, size: +(a.size || 128), styleDescription: a.styleDesc, out: a.out });
    else if (cmd === 'edit') r = await editWithText({ srcPath: a.src, description: a.desc, size: +(a.size || 128), out: a.out });
    else if (cmd === 'anim') r = await animateTransition({ startPath: a.start, endPath: a.end, action: a.action, frameCount: +(a.frames || 8), outDir: a.out, seed: a.seed != null ? +a.seed : undefined });
    else { console.log('usage: pixellab.mjs <gen|edit|anim> --flags'); process.exit(1); }
    console.log(JSON.stringify({ ok: true, ...r }, null, 2));
  } catch (e) {
    console.error('ERROR: ' + e.message);
    process.exit(1);
  }
}
