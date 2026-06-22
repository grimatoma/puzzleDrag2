// Reconstruct the gitignored icon-review/ working dir FROM the committed
// reference/docs/icon-review.html, so the tracker can be regenerated without the working
// dir (which is .gitignored and disposable). The committed HTML is the only
// surviving copy of the historical "before" thumbnails and per-key review
// notes, so a clean rebuild from an empty dir would destroy them.
//
// What it writes (only under icon-review/, never tracked files):
//   icon-review/notes.json                         per-key { review, note }
//   icon-review/{before,after}/<module>/<key>.thumb.png   decoded base64 thumbs
//
// base64 -> Buffer -> base64 is byte-identical, so build-icon-tracker.mjs
// re-embeds the exact same bytes => no spurious diff for untouched cards.
//
// Modes:
//   node tools/reconstruct-icon-review.mjs
//       Extract notes.json + every real (non-placeholder) before/after thumb.
//   node tools/reconstruct-icon-review.mjs --restore-except key1,key2,...
//       Re-write committed thumb bytes for every key EXCEPT the listed ones.
//       Run this AFTER a full `render-icons` pass to revert the nondeterministic
//       churn on untouched cards, keeping only the freshly-rendered keys fresh.
//
// Always rewrites notes.json from the committed HTML (the historical baseline);
// new review notes that parallel agents add live in icon-review/notes.<mod>.json
// and are merged later by build-icon-tracker.mjs (this tool never touches those).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("icon-review");

const args = process.argv.slice(2);
const fromArg = (() => {
  const i = args.indexOf("--from");
  return i === -1 ? null : args[i + 1];
})();
// Source of truth: the PRISTINE committed HTML, not a freshly-rebuilt one. Pass
// --from to point at a saved committed copy when reference/docs/icon-review.html has
// already been rebuilt this session.
const HTML = resolve(fromArg || "reference/docs/icon-review.html");
const exceptArg = (() => {
  const i = args.indexOf("--restore-except");
  return i === -1 ? null : (args[i + 1] || "");
})();
const RESTORE_MODE = exceptArg !== null;
const exceptKeys = new Set((exceptArg || "").split(",").map((s) => s.trim()).filter(Boolean));

const html = readFileSync(HTML, "utf8");

// Map every article to its enclosing <section id="MODULE"> by byte offset.
const sections = [...html.matchAll(/<section id="([^"]+)">/g)].map((m) => ({ at: m.index, id: m[1] }));
const moduleAt = (idx) => {
  let mod = "?";
  for (const s of sections) { if (s.at <= idx) mod = s.id; else break; }
  return mod;
};

const unescapeHtml = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

// Split into article chunks (no nesting, so first-match fields are this article's).
const articleRe = /<article class="icon" data-review="([a-z]+)" data-usage="([a-z-]+)">/g;
const starts = [];
let m;
while ((m = articleRe.exec(html))) starts.push({ at: m.index, review: m[1], usage: m[2] });

const isPng = (src) => typeof src === "string" && src.startsWith("data:image/png;base64,");
const b64of = (src) => src.slice(src.indexOf(",") + 1);

const notes = {};
let wroteThumbs = 0, restored = 0, skipped = 0;

for (let i = 0; i < starts.length; i++) {
  const start = starts[i].at;
  const end = i + 1 < starts.length ? starts[i + 1].at : html.length;
  const chunk = html.slice(start, end);

  const key = (chunk.match(/<code>([^<]+)<\/code>/) || [])[1];
  if (!key) continue;
  const mod = moduleAt(start);
  const imgs = [...chunk.matchAll(/<img src="([^"]+)"/g)].map((x) => x[1]);
  const before = imgs[0];
  const after = imgs[1];
  const review = starts[i].review;
  const noteM = chunk.match(/<p class="note">([\s\S]*?)<\/p>/);
  const note = noteM ? unescapeHtml(noteM[1]) : "";

  // Historical notes.json (baseline). Only keep meaningful entries.
  if (!RESTORE_MODE && (review !== "pending" || note)) {
    notes[key] = { review, ...(note ? { note } : {}) };
  }

  // Thumbs.
  const keep = exceptKeys.has(key); // in restore mode, don't clobber fresh renders
  for (const [mode, src] of [["before", before], ["after", after]]) {
    if (!isPng(src)) continue; // placeholder -> nothing committed to restore
    if (RESTORE_MODE && keep) { skipped++; continue; }
    const modDir = `${ROOT}/${mode}/${mod}`;
    mkdirSync(modDir, { recursive: true });
    writeFileSync(`${modDir}/${key}.thumb.png`, Buffer.from(b64of(src), "base64"));
    if (RESTORE_MODE) restored++; else wroteThumbs++;
  }
}

if (!RESTORE_MODE) {
  mkdirSync(ROOT, { recursive: true });
  writeFileSync(`${ROOT}/notes.json`, JSON.stringify(notes, null, 2));
  console.log(`reconstruct: notes.json (${Object.keys(notes).length} keys) + ${wroteThumbs} committed thumbs from ${starts.length} articles`);
} else {
  console.log(`reconstruct --restore-except (${exceptKeys.size} kept fresh): restored ${restored} committed thumbs, skipped ${skipped}`);
}
