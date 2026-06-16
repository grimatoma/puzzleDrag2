// Auto-generate the subject gallery in docs/seasonal-tile-system/index.html FROM the
// actual assets on disk, so the doc can never drift from what was really generated and
// adding a subject needs no hand-editing.
//
//   node tools/pixellab/gen_gallery.mjs
//
// What it does: scans docs/seasonal-tile-system/assets/ for every "<subject>-summer.png"
// (the canonical anchor), then for each subject collects its season stills + transition
// and idle GIFs, reads its category/size from tools/pixellab/subjects/<subject>.mjs, and
// marks it "in-game" if its tileKey has a public/seasonal-tiles/<tileKey>/ folder. The
// result is spliced between the <!-- AUTOGALLERY:START --> / <!-- AUTOGALLERY:END -->
// markers in index.html. Everything is referenced by relative path (never base64).
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = process.cwd();
const DOC = "docs/seasonal-tile-system/index.html";
const ASSETS = "docs/seasonal-tile-system/assets";
const SUBJECTS_DIR = "tools/pixellab/subjects";

const SEASON_ORDER = ["spring", "summer", "autumn", "baremound", "winter"];
const TRANS_ORDER = ["spring-summer", "summer-autumn", "autumn-baremound", "baremound-winter", "autumn-winter"];
const TRANS_LABEL = {
  "spring-summer": "spring→summer", "summer-autumn": "summer→autumn",
  "autumn-winter": "autumn→winter", "autumn-baremound": "autumn→bare", "baremound-winter": "bare→winter",
};
// Category order + display label (subjects sort by this, then name).
const CAT = {
  "tree-deciduous": ["deciduous tree", 0], "tree-evergreen": ["evergreen tree", 1],
  "grass": ["groundcover", 2], "grain": ["grain", 3],
  "produce-veg": ["vegetable", 4], "produce-fruit": ["fruit", 5], "flower": ["flower", 6],
  "bird": ["bird", 7], "herd": ["herd / mount", 8], "mineral": ["mineral", 9],
  "aquatic": ["aquatic", 10], "special": ["special", 11],
};

const has = (p) => existsSync(join(ROOT, p));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Subjects integrated in-game = tile keys with a public/seasonal-tiles/<tileKey>/ folder
// that ships (at least) the summer anchor frame — the engine auto-discovers these.
function integratedKeys() {
  const dir = "public/seasonal-tiles";
  if (!has(dir)) return new Set();
  return new Set(
    readdirSync(join(ROOT, dir), { withFileTypes: true })
      .filter((d) => d.isDirectory() && has(`${dir}/${d.name}/idle-summer.png`))
      .map((d) => d.name),
  );
}

async function meta(subject) {
  const cfgPath = `${SUBJECTS_DIR}/${subject}.mjs`;
  if (!has(cfgPath)) return { category: null, size: null };
  try {
    const cfg = (await import(pathToFileURL(join(ROOT, cfgPath)).href)).default;
    return { category: cfg.category, size: cfg.size, decimateTo: cfg.decimateTo, tileKey: cfg.tileKey };
  } catch {
    return { category: null, size: null };
  }
}

function figures(items) {
  return items.map(({ src, cap }) =>
    `          <figure><img src="${src}" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`
  ).join("\n");
}

async function build() {
  const files = readdirSync(join(ROOT, ASSETS));
  const subjects = files
    .filter((f) => /-summer\.png$/.test(f) && !/_cand_/.test(f))
    .map((f) => f.replace(/-summer\.png$/, ""));
  const integrated = integratedKeys();
  const animFiles = has(`${ASSETS}/anim`) ? readdirSync(join(ROOT, ASSETS, "anim")) : [];

  const rows = [];
  for (const s of subjects) {
    const m = await meta(s);
    const [catLabel, catOrder] = CAT[m.category] || [m.category || "tile", 99];
    rows.push({ s, m, catLabel, catOrder });
  }
  rows.sort((a, b) => a.catOrder - b.catOrder || a.s.localeCompare(b.s));

  const blocks = rows.map(({ s, m, catLabel }) => {
    const stills = SEASON_ORDER
      .filter((season) => files.includes(`${s}-${season}.png`))
      .map((season) => ({ src: `assets/${s}-${season}.png`, cap: season === "summer" ? "summer · anchor" : season }));
    const trans = TRANS_ORDER
      .filter((t) => animFiles.includes(`${s}-${t}.gif`))
      .map((t) => ({ src: `assets/anim/${s}-${t}.gif`, cap: TRANS_LABEL[t] }));
    const idles = ["spring", "summer", "autumn", "winter"]
      .filter((season) => animFiles.includes(`${s}-idle-${season}.gif`))
      .map((season) => ({ src: `assets/anim/${s}-idle-${season}.gif`, cap: `${season} idle` }));

    const sizeChip = m.size ? ` <span class="pill info">${m.decimateTo ? `${m.size}→${m.decimateTo}px` : `${m.size}px`}</span>` : "";
    const liveChip = integrated.has(m.tileKey) ? ` <span class="pill ok">in-game</span>` : ` <span class="pill idle">art only</span>`;
    const name = s.charAt(0).toUpperCase() + s.slice(1);

    const parts = [
      `        <article class="subject" id="subj-${s}">`,
      `          <h3>${esc(name)} <span class="pill ok">${esc(catLabel)}</span>${sizeChip}${liveChip}</h3>`,
      `          <div class="tiles">`,
      figures(stills),
      `          </div>`,
    ];
    if (trans.length || idles.length) {
      parts.push(`          <div class="tiles">`, figures([...trans, ...idles]), `          </div>`);
    }
    parts.push(`        </article>`);
    return parts.join("\n");
  });

  return { html: blocks.join("\n"), count: rows.length, names: rows.map((r) => r.s) };
}

const { html, count, names } = await build();
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
console.log(`gallery: ${count} subjects [${names.join(", ")}] -> ${DOC}`);
