// Builds review-batch definitions for the icon/tile audit workflow.
// Reads the three render manifests and writes one JSON per batch plus an index,
// chunked so no agent reviews more than CAP items at once.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("icon-review");
const ABS = (p) => resolve(p).replace(/\\/g, "/");
const OUT = `${ROOT}/batches`;
mkdirSync(OUT, { recursive: true });
const CAP = 14;

const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
const index = [];
function emit(id, batch) {
  writeFileSync(`${OUT}/${id}.json`, JSON.stringify(batch, null, 2));
  index.push({ id, kind: batch.kind, group: batch.group, count: batch.items.length });
}

/* ---- A. icon stills (from manifest.json) ---- */
const stills = JSON.parse(readFileSync(`${ROOT}/manifest.json`, "utf8"));
const byMod = {};
for (const r of stills) (byMod[r.module] ??= []).push(r);
for (const [mod, rows] of Object.entries(byMod)) {
  const safe = mod.replace(/[^a-z0-9_-]/gi, "_");
  const sheet = `${ROOT}/sheets/${safe}.png`;
  const parts = chunk(rows, CAP);
  parts.forEach((rs, i) => {
    emit(`still__${safe}__${i}`, {
      kind: "icon-still",
      group: mod === "?" ? "(aliases)" : mod,
      sheetPath: existsSync(sheet) ? ABS(sheet) : null,
      part: parts.length > 1 ? `${i + 1}/${parts.length}` : null,
      items: rs.map((r) => ({
        key: r.key, label: r.label, status: r.status, color: r.color,
        sharedWith: r.sharedWith || [],
        imagePath: ABS(`${ROOT}/before/${safe}/${r.key}.png`),
        thumbPath: ABS(`${ROOT}/before/${safe}/${r.key}.thumb.png`),
      })),
    });
  });
}

/* ---- B. icon animations (from anims/_manifest.json) ---- */
const anims = JSON.parse(readFileSync(`${ROOT}/anims/_manifest.json`, "utf8"));
const animByMod = {};
for (const r of anims) (animByMod[r.module] ??= []).push(r);
for (const [mod, rows] of Object.entries(animByMod)) {
  const parts = chunk(rows, CAP);
  parts.forEach((rs, i) => {
    emit(`anim__${mod}__${i}`, {
      kind: "icon-anim",
      group: mod,
      part: parts.length > 1 ? `${i + 1}/${parts.length}` : null,
      items: rs.map((r) => ({
        key: r.key, color: r.color, frames: r.frames,
        stripPath: ABS(`${ROOT}/anims/${mod}/${r.key}.png`),
      })),
    });
  });
}

/* ---- C. seasonal (from seasonal/_manifest.json) ---- */
const seasonal = JSON.parse(readFileSync(`${ROOT}/seasonal/_manifest.json`, "utf8"));
const FULL = new Set(["tile_bird_chicken", "tile_tree_willow", "tile_veg_carrot"]);
const summerOnly = [];
for (const s of seasonal) {
  if (FULL.has(s.subject)) {
    emit(`seasonal-full__${s.subject}`, {
      kind: "seasonal-anim",
      group: s.subject,
      items: s.sheets.map((sh) => ({
        key: `${s.subject}/${sh.sheet.replace(".png", "")}`,
        subject: s.subject, sheet: sh.sheet, frames: sh.frames, srcPx: sh.srcPx,
        stripPath: ABS(`${ROOT}/seasonal/${s.subject}/${sh.sheet}`),
      })),
    });
  } else {
    const fam = s.subject.split("_")[1] || "misc";
    summerOnly.push({ ...s, fam });
  }
}
const byFam = {};
for (const s of summerOnly) (byFam[s.fam] ??= []).push(s);
for (const [fam, subs] of Object.entries(byFam)) {
  const parts = chunk(subs, CAP);
  parts.forEach((ss, i) => {
    emit(`seasonal-still__${fam}__${i}`, {
      kind: "seasonal-still",
      group: `tile_${fam}_*`,
      part: parts.length > 1 ? `${i + 1}/${parts.length}` : null,
      items: ss.map((s) => {
        const sh = s.sheets[0];
        return {
          key: s.subject, subject: s.subject, sheet: sh.sheet,
          frames: sh.frames, srcPx: sh.srcPx,
          stripPath: ABS(`${ROOT}/seasonal/${s.subject}/${sh.sheet}`),
        };
      }),
    });
  });
}

writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 2));
const byKind = index.reduce((a, b) => ((a[b.kind] = (a[b.kind] || 0) + 1), a), {});
console.log("batches:", JSON.stringify(byKind), "total", index.length);
console.log("items:", index.reduce((a, b) => a + b.count, 0));
