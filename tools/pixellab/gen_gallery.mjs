// Auto-generate the ASSETS gallery in docs/seasonal-tile-system/index.html FROM the actual
// assets on disk + the planned-subject roster, so the doc can never drift from what was
// really generated and adding a subject needs no hand-editing.
//
//   node tools/pixellab/gen_gallery.mjs
//
// What it emits (between the <!-- AUTOGALLERY:START/END --> markers in the Assets tab):
//   • every category from tools/pixellab/roster.mjs as a group, with a done/total counter;
//   • each subject that HAS art -> three stacked rows (key frames · idles · transitions),
//     plus a per-season CANDIDATE strip (hidden behind the "Show candidates" toggle) that
//     reveals the alternates each key frame was picked from, the chosen one badged;
//   • each subject with NO art yet -> a placeholder card (four dashed season slots) so the
//     set's progress is visible as it fills in.
// Category/size come from tools/pixellab/subjects/<slug>.mjs; "in-game" from the
// seasonalArt.ts registry. Candidates are matched to their chosen frame BY HASH. Everything
// is referenced by relative path (never base64).
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = process.cwd();
const DOC = "docs/seasonal-tile-system/index.html";
const ASSETS = "docs/seasonal-tile-system/assets";
const CANDS = "docs/seasonal-tile-system/assets/candidates";
const SUBJECTS_DIR = "tools/pixellab/subjects";

const SEASON_ORDER = ["spring", "summer", "autumn", "baremound", "winter"];
const CAND_SEASONS = ["spring", "summer", "autumn", "baremound", "winter"];
const TRANS_ORDER = ["spring-summer", "summer-autumn", "autumn-baremound", "baremound-winter", "autumn-winter"];
const TRANS_LABEL = {
  "spring-summer": "spring→summer", "summer-autumn": "summer→autumn",
  "autumn-winter": "autumn→winter", "autumn-baremound": "autumn→bare", "baremound-winter": "bare→winter",
};
// Category order + display label (groups render in this order; subjects keep roster order).
const CAT = {
  "tree-deciduous": ["Trees — deciduous", 0], "tree-evergreen": ["Trees — evergreen", 1],
  "grass": ["Grass / groundcover", 2], "grain": ["Grain", 3],
  "produce-veg": ["Vegetables", 4], "produce-fruit": ["Fruit", 5], "flower": ["Flowers", 6],
  "bird": ["Birds", 7], "herd": ["Herd · Cattle · Mounts", 8], "mineral": ["Mine / ore", 9],
  "aquatic": ["Fish / aquatic", 10], "special": ["Special", 11],
};

const has = (p) => existsSync(join(ROOT, p));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const md5 = (p) => createHash("md5").update(readFileSync(join(ROOT, p))).digest("hex");

// Subjects integrated in-game = the dirs in the seasonalArt REGISTRY.
function integratedDirs() {
  const src = readFileSync(join(ROOT, "src/textures/seasonal/seasonalArt.ts"), "utf8");
  const region = src.slice(src.indexOf("REGISTRY"), src.indexOf("BAKED_SEASONAL_KEYS"));
  return new Set([...region.matchAll(/dir:\s*"([^"]+)"/g)].map((m) => m[1]));
}

async function meta(subject) {
  const cfgPath = `${SUBJECTS_DIR}/${subject}.mjs`;
  if (!has(cfgPath)) return {};
  try {
    const cfg = (await import(pathToFileURL(join(ROOT, cfgPath)).href)).default;
    return { size: cfg.size, decimateTo: cfg.decimateTo };
  } catch {
    return {};
  }
}

function figures(items) {
  return items.map(({ src, cap, cls }) =>
    `          <figure${cls ? ` class="${cls}"` : ""}><img src="${src}" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`
  ).join("\n");
}

// All candidate files for a subject, grouped by season: { season: [{src, i, chosen}] }.
function candidatesFor(slug, candFiles, files) {
  const out = {};
  for (const season of CAND_SEASONS) {
    const re = new RegExp(`^${slug}-${season}-c(\\d+)\\.png$`);
    const hits = candFiles
      .map((f) => ({ f, m: f.match(re) }))
      .filter((x) => x.m)
      .map((x) => ({ src: `assets/candidates/${x.f}`, i: Number(x.m[1]), path: `${CANDS}/${x.f}` }))
      .sort((a, b) => a.i - b.i);
    if (!hits.length) continue;
    const canonical = `${slug}-${season}.png`;
    const chosenHash = files.includes(canonical) ? md5(`${ASSETS}/${canonical}`) : null;
    out[season] = hits.map((h) => ({ src: h.src, i: h.i, chosen: chosenHash !== null && md5(h.path) === chosenHash }));
  }
  return out;
}

function realCard({ slug, name, cat, files, animFiles, cands, m, integrated }) {
  const stills = SEASON_ORDER
    .filter((season) => files.includes(`${slug}-${season}.png`))
    .map((season) => ({ src: `assets/${slug}-${season}.png`, cap: season === "summer" ? "summer · anchor" : season }));
  const idles = ["spring", "summer", "autumn", "winter"]
    .filter((season) => animFiles.includes(`${slug}-idle-${season}.gif`))
    .map((season) => ({ src: `assets/anim/${slug}-idle-${season}.gif`, cap: `${season} idle` }));
  const trans = TRANS_ORDER
    .filter((t) => animFiles.includes(`${slug}-${t}.gif`))
    .map((t) => ({ src: `assets/anim/${slug}-${t}.gif`, cap: TRANS_LABEL[t] }));

  const sizeChip = m.size ? ` <span class="pill info">${m.decimateTo ? `${m.size}→${m.decimateTo}px` : `${m.size}px`}</span>` : "";
  const liveChip = integrated.has(slug) ? ` <span class="pill ok">in-game</span>` : ` <span class="pill idle">art only</span>`;

  // Candidate strip (hidden unless the page toggle is on).
  const candSeasons = Object.keys(cands);
  let candBlock = "";
  if (candSeasons.length) {
    const groups = CAND_SEASONS.filter((s) => cands[s]).map((season) => {
      const list = cands[season];
      const figs = figures(list.map((c) => ({
        src: c.src, cap: `#${c.i}${c.chosen ? " ✓" : ""}`, cls: `cand${c.chosen ? " chosen" : ""}`,
      })));
      return [
        `            <div class="candseason">`,
        `              <p class="candlab">${esc(season)} <span class="muted">· ${list.length} candidate${list.length === 1 ? "" : "s"}, chosen ✓</span></p>`,
        `              <div class="tiles candrow">`, figs, `              </div>`,
        `            </div>`,
      ].join("\n");
    });
    candBlock = [
      `          <div class="cands">`,
      `            <p class="candnote">Other candidates per key frame — only <b>Summer</b> is a true pick-of-N (generate-with-style); other seasons are single chained edits unless re-rolled.</p>`,
      groups.join("\n"),
      `          </div>`,
    ].join("\n");
  } else {
    candBlock = `          <div class="cands"><p class="candnote">No candidate set archived for this subject (single-pick edits).</p></div>`;
  }

  const parts = [
    `        <article class="subject" id="subj-${slug}">`,
    `          <h3>${esc(name)} <span class="pill ok">${esc(cat)}</span>${sizeChip}${liveChip}</h3>`,
    `          <p class="rowlab">Season key frames</p>`,
    `          <div class="tiles">`, figures(stills), `          </div>`,
  ];
  if (idles.length) {
    parts.push(`          <p class="rowlab">Idle animations</p>`, `          <div class="tiles">`, figures(idles), `          </div>`);
  }
  if (trans.length) {
    parts.push(`          <p class="rowlab">Transitions</p>`, `          <div class="tiles">`, figures(trans), `          </div>`);
  }
  parts.push(candBlock, `        </article>`);
  return parts.join("\n");
}

function placeholderCard({ slug, name, cat, note }) {
  const slots = ["spring", "summer", "autumn", "winter"]
    .map((s) => `          <figure class="ph"><div class="phbox"></div><figcaption>${s}</figcaption></figure>`)
    .join("\n");
  return [
    `        <article class="subject placeholder" id="subj-${slug}">`,
    `          <h3>${esc(name)} <span class="pill idle">planned</span>${note ? ` <span class="pill warn">${esc(note)}</span>` : ""}</h3>`,
    `          <p class="rowlab">Season key frames</p>`,
    `          <div class="tiles">`, slots, `          </div>`,
    `        </article>`,
  ].join("\n");
}

async function build() {
  const roster = (await import(pathToFileURL(join(ROOT, "tools/pixellab/roster.mjs")).href)).default;
  const files = readdirSync(join(ROOT, ASSETS)).filter((f) => f.endsWith(".png"));
  const candFiles = has(CANDS) ? readdirSync(join(ROOT, CANDS)).filter((f) => f.endsWith(".png")) : [];
  const animFiles = has(`${ASSETS}/anim`) ? readdirSync(join(ROOT, ASSETS, "anim")) : [];
  const integrated = integratedDirs();

  // Group roster by category, in CAT order; subjects keep roster order within a group.
  const cats = [...new Set(roster.map((r) => r.category))]
    .sort((a, b) => (CAT[a]?.[1] ?? 99) - (CAT[b]?.[1] ?? 99));

  let doneTotal = 0;
  const blocks = [];
  for (const catKey of cats) {
    const subs = roster.filter((r) => r.category === catKey);
    const [catLabel] = CAT[catKey] || [catKey, 99];
    const done = subs.filter((r) => files.includes(`${r.slug}-summer.png`)).length;
    doneTotal += done;
    blocks.push(
      `        <h2 class="cat-group" id="cat-${catKey}">${esc(catLabel)} <span class="cat-prog">${done} / ${subs.length}</span></h2>`
    );
    for (const r of subs) {
      if (files.includes(`${r.slug}-summer.png`)) {
        const m = await meta(r.slug);
        const cands = candidatesFor(r.slug, candFiles, files);
        blocks.push(realCard({ slug: r.slug, name: r.name, cat: catLabel, files, animFiles, cands, m, integrated }));
      } else {
        blocks.push(placeholderCard({ slug: r.slug, name: r.name, cat: catLabel, note: r.note }));
      }
    }
  }

  return { html: blocks.join("\n"), done: doneTotal, total: roster.length };
}

const { html, done, total } = await build();
const docPath = join(ROOT, DOC);
const doc = readFileSync(docPath, "utf8");
const START = "<!-- AUTOGALLERY:START -->", END = "<!-- AUTOGALLERY:END -->";
const i = doc.indexOf(START), j = doc.indexOf(END);
if (i === -1 || j === -1) {
  console.error(`ERROR: markers ${START} / ${END} not found in ${DOC}.`);
  process.exit(1);
}
const next = doc.slice(0, i + START.length) + "\n" + html + "\n        " + doc.slice(j);
writeFileSync(docPath, next, "utf8");
console.log(`gallery: ${done}/${total} subjects have art -> ${DOC}`);
