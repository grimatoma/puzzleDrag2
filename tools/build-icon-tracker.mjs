// Build the icon-review status tracker (docs/icon-review.html) from:
//   - icon-review/manifest.json           (from render-icons.mjs)
//   - icon-review/notes.json   (optional)  per-key review notes the loop appends
//   - icon-review/{before,after}/<mod>/<key>.thumb.png  (base64-embedded)
//
// The output is a single self-contained HTML file (thumbnails inlined), so the
// gitignored icon-review/ working dir — including the disposable "before" PNGs —
// can be deleted afterward and the tracker still shows before/after.
//
//   node tools/build-icon-tracker.mjs

import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("icon-review");
const manifest = JSON.parse(readFileSync(`${ROOT}/manifest.json`, "utf8"));
// Merge notes.json plus any per-module notes.<module>.json (parallel agents
// each write their own file to avoid races; later files win on key conflict).
const notes = {};
if (existsSync(`${ROOT}/notes.json`)) Object.assign(notes, JSON.parse(readFileSync(`${ROOT}/notes.json`, "utf8")));
for (const f of readdirSync(ROOT)) {
  if (/^notes\..+\.json$/.test(f)) {
    try { Object.assign(notes, JSON.parse(readFileSync(`${ROOT}/${f}`, "utf8"))); } catch { /* skip bad file */ }
  }
}

// Logical tab groups (cluster the 33 modules into a readable handful).
const GROUPS = {
  Crops: ["grass", "grain", "vegetables", "fruits", "flowers"],
  "Flora & World": ["trees", "mapNodes", "decorations"],
  Animals: ["birds", "herdAnimals", "cattle", "mounts", "fish"],
  Tools: ["toolsFarm", "toolsMine", "toolsPortal", "toolsSea", "playerTools"],
  Crafted: ["craftedProducts", "craftingStations", "recipes"],
  Biome: ["existingFarm", "existingMine", "tileCategories"],
  "Chars & Hazards": ["characters", "hazards", "mineHazards"],
  "Chars v2": ["charactersV2"],
  Systems: ["uiElements", "fixed-icons", "currencies", "achievements", "quests", "missingItems"],
};

const b64 = (mode, mod, key) => {
  const p = `${ROOT}/${mode}/${mod}/${key}.thumb.png`;
  return existsSync(p) ? `data:image/png;base64,${readFileSync(p).toString("base64")}` : null;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// review state: pending (default) | ok | fixed | removed
const reviewOf = (key) => notes[key]?.review || "pending";
const STATE_CHIP = {
  pending: ["#8a8170", "Pending"], ok: ["#3f7d4e", "Reviewed · OK"],
  fixed: ["#b06a1f", "Fixed"], removed: ["#a23b3b", "Removed"],
};
const USAGE_CHIP = {
  "in-use": ["#3f6d7d", "in-use"], "alias-target": ["#6a5aa0", "alias"],
  "removal-candidate": ["#a23b3b", "unused?"],
};

const rows = manifest.slice().sort((a, b) => (a.module + a.key).localeCompare(b.module + b.key));
const total = rows.length;
const done = rows.filter((r) => reviewOf(r.key) !== "pending").length;

const placeholder = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='104' height='104'><rect width='104' height='104' fill='#e3ddd0'/><text x='52' y='56' font-size='11' fill='#a39a86' text-anchor='middle' font-family='monospace'>—</text></svg>`,
);

function cell(r) {
  const before = b64("before", r.module, r.key) || placeholder;
  const after = b64("after", r.module, r.key) || placeholder;
  const rv = reviewOf(r.key);
  const [sc, sl] = STATE_CHIP[rv];
  const [uc, ul] = USAGE_CHIP[r.status] || ["#888", r.status];
  const note = notes[r.key]?.note ? `<p class="note">${esc(notes[r.key].note)}</p>` : "";
  const shared = r.sharedWith?.length ? `<span class="shared">↔ ${esc(r.sharedWith.join(", "))}</span>` : "";
  return `<article class="icon" data-review="${rv}" data-usage="${r.status}">
    <div class="ba"><figure><img src="${before}" alt="before ${esc(r.key)}" loading="lazy"><figcaption>before</figcaption></figure>
    <figure><img src="${after}" alt="after ${esc(r.key)}" loading="lazy"><figcaption>after</figcaption></figure></div>
    <div class="meta"><code>${esc(r.key)}</code>
      <div class="chips"><span class="chip" style="--c:${sc}">${sl}</span><span class="chip ghost" style="--c:${uc}">${ul}</span></div>
      <div class="sub">${esc(r.label)} ${shared}</div>${note}</div>
  </article>`;
}

function panel(name, mods, idx) {
  const groupRows = rows.filter((r) => mods.includes(r.module));
  const gDone = groupRows.filter((r) => reviewOf(r.key) !== "pending").length;
  const sections = mods.map((mod) => {
    const mr = groupRows.filter((r) => r.module === mod);
    if (!mr.length) return "";
    const md = mr.filter((r) => reviewOf(r.key) !== "pending").length;
    return `<section id="${mod}"><h3>${mod} <span class="count">${md}/${mr.length}</span></h3>
      <div class="grid">${mr.map(cell).join("")}</div></section>`;
  }).join("");
  return `<div class="panel${idx === 0 ? " active" : ""}" id="g-${idx}">
    <div class="ghead"><h2>${name}</h2><span class="count">${gDone}/${groupRows.length} reviewed</span></div>${sections}</div>`;
}

const tabs = Object.entries(GROUPS).map(([name, mods], i) => {
  const gr = rows.filter((r) => mods.includes(r.module));
  const gd = gr.filter((r) => reviewOf(r.key) !== "pending").length;
  return `<button class="tab${i === 0 ? " active" : ""}" data-tab="g-${i}">${name} <em>${gd}/${gr.length}</em></button>`;
}).join("");
const panels = Object.entries(GROUPS).map(([name, mods], i) => panel(name, mods, i)).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Icon Review Tracker</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,800&family=IBM+Plex+Sans:wght@400;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
:root{--bg:#1c1a17;--bg2:#24211c;--card:#2c2823;--ink:#efe7d8;--mut:#a99f8c;--line:#3a352d;--acc:#d98a3c;--acc2:#7fae6a;}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 80% -10%,#2c2820,var(--bg));color:var(--ink);font-family:"IBM Plex Sans",system-ui,sans-serif;line-height:1.5}
header.top{padding:28px 30px 18px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#262219,transparent)}
h1{font-family:Fraunces,serif;font-weight:800;font-size:2.5rem;margin:0 0 4px;letter-spacing:-.02em}
.lede{color:var(--mut);max-width:70ch;margin:0}
.bar{height:8px;border-radius:6px;background:#352f27;margin:14px 0 6px;overflow:hidden;max-width:520px}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2));width:${total ? (100 * done / total).toFixed(1) : 0}%}
.barlbl{color:var(--mut);font-size:.85rem}
.tabs{display:flex;flex-wrap:wrap;gap:6px;padding:14px 30px;position:sticky;top:0;background:rgba(28,26,23,.94);backdrop-filter:blur(6px);border-bottom:1px solid var(--line);z-index:5}
.tab{font:inherit;color:var(--mut);background:#2a261f;border:1px solid var(--line);border-radius:999px;padding:7px 14px;cursor:pointer;transition:.15s}
.tab em{font-style:normal;opacity:.7;font-size:.82em;font-family:"JetBrains Mono",monospace}
.tab:hover{color:var(--ink)}
.tab.active{color:#1c1a17;background:var(--acc);border-color:var(--acc);font-weight:600}
.filters{display:flex;gap:8px;align-items:center;padding:10px 30px;flex-wrap:wrap;border-bottom:1px solid var(--line)}
.filters label{color:var(--mut);font-size:.85rem}
.filters select{font:inherit;background:#2a261f;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:5px 8px}
main{padding:8px 30px 60px}
.panel{display:none}.panel.active{display:block}
.ghead{display:flex;align-items:baseline;gap:14px;margin:18px 0 6px}
.ghead h2{font-family:Fraunces,serif;font-size:1.6rem;margin:0}
.count{color:var(--mut);font-family:"JetBrains Mono",monospace;font-size:.85rem}
section h3{font-family:"JetBrains Mono",monospace;font-size:1rem;color:var(--acc);border-top:1px solid var(--line);padding-top:16px;margin:22px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.icon{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.ba{display:flex;gap:8px}
.ba figure{margin:0;flex:1;text-align:center}
.ba img{width:100%;max-width:104px;border-radius:8px;display:block;margin:0 auto;image-rendering:auto}
.ba figcaption{font-size:.7rem;color:var(--mut);margin-top:2px;font-family:"JetBrains Mono",monospace}
.meta{margin-top:8px}
.meta code{font-family:"JetBrains Mono",monospace;font-size:.78rem;color:var(--ink);word-break:break-all}
.chips{display:flex;gap:5px;margin:6px 0}
.chip{font-size:.68rem;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--c);color:#fff}
.chip.ghost{background:transparent;color:var(--c);border:1px solid var(--c)}
.sub{font-size:.78rem;color:var(--mut)}
.shared{font-family:"JetBrains Mono",monospace;font-size:.72rem;opacity:.8}
.note{font-size:.8rem;color:#e7d9c2;background:#332c22;border-left:3px solid var(--acc);padding:6px 8px;margin:8px 0 0;border-radius:0 6px 6px 0}
footer{color:var(--mut);font-size:.8rem;padding:20px 30px;border-top:1px solid var(--line)}
@media print{.tabs,.filters{position:static}.panel{display:block!important}.tab{display:none}}
</style></head><body>
<header class="top">
  <h1>Icon Review Tracker</h1>
  <p class="lede">Per-icon review status, notes, and before/after for every reviewable canvas icon (in-use + alias targets). Archived/legacy icons are excluded. Generated from <code>icon-review/manifest.json</code> — re-run <code>node tools/build-icon-tracker.mjs</code> after each pass.</p>
  <div class="bar"><i></i></div>
  <div class="barlbl">${done} / ${total} reviewed &middot; ${rows.filter(r=>reviewOf(r.key)==="fixed").length} fixed &middot; ${rows.filter(r=>reviewOf(r.key)==="removed").length} removed</div>
</header>
<nav class="tabs">${tabs}</nav>
<div class="filters">
  <label>Review <select id="fReview"><option value="">all</option><option>pending</option><option>ok</option><option>fixed</option><option>removed</option></select></label>
  <label>Usage <select id="fUsage"><option value="">all</option><option value="in-use">in-use</option><option value="alias-target">alias</option><option value="removal-candidate">unused?</option></select></label>
</div>
<main>${panels}</main>
<footer>House style: see <code>docs/icon-style-guide.html</code>. Full diagnostic renders (split bg + 64-box bounds) live in <code>icon-review/&lt;before|after&gt;/&lt;module&gt;/&lt;key&gt;.png</code>.</footer>
<script>
const tabs=[...document.querySelectorAll('.tab')],panels=[...document.querySelectorAll('.panel')];
function show(id){tabs.forEach(t=>t.classList.toggle('active',t.dataset.tab===id));panels.forEach(p=>p.classList.toggle('active',p.id===id));}
tabs.forEach(t=>t.addEventListener('click',()=>{show(t.dataset.tab);location.hash=t.dataset.tab;}));
if(location.hash){const el=document.querySelector(location.hash);const p=el&&el.closest('.panel');if(p)show(p.id);else if(document.getElementById(location.hash.slice(1)))show(location.hash.slice(1));if(el&&el.scrollIntoView)el.scrollIntoView();}
const fr=document.getElementById('fReview'),fu=document.getElementById('fUsage');
function flt(){const r=fr.value,u=fu.value;document.querySelectorAll('.icon').forEach(c=>{const ok=(!r||c.dataset.review===r)&&(!u||c.dataset.usage===u);c.style.display=ok?'':'none';});}
fr.onchange=fu.onchange=flt;
</script></body></html>`;

writeFileSync(resolve("docs/icon-review.html"), html);
console.log(`wrote docs/icon-review.html — ${done}/${total} reviewed`);
