// Builds the icon/tile visual-audit HTML report from the workflow results.
// Inputs:
//   icon-review/audit-results.json   = the workflow's `results` array
//   icon-review/batches/<id>.json    = authoritative per-item image paths
// Output:
//   reference/docs/icon-tile-audit/index.html
//   reference/docs/icon-tile-audit/assets/<kind>/<file>.png  (copied art)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

const RR = resolve("icon-review");
const DOC = resolve("reference/docs/icon-tile-audit");
const ASSETS = `${DOC}/assets`;
mkdirSync(ASSETS, { recursive: true });

const pngDim = (f) => { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const results = JSON.parse(readFileSync(`${RR}/audit-results.json`, "utf8"));

// kind -> asset subdir
const SUB = { "icon-still": "still", "icon-anim": "anim", "seasonal-still": "seasonal", "seasonal-anim": "seasonal" };
for (const k of new Set(Object.values(SUB))) mkdirSync(`${ASSETS}/${k}`, { recursive: true });

const rows = [];
let copied = 0, missing = 0;
for (const res of results) {
  const batchPath = `${RR}/batches/${res.batchId}.json`;
  if (!existsSync(batchPath)) continue;
  const batch = JSON.parse(readFileSync(batchPath, "utf8"));
  const byKey = {};
  for (const it of batch.items) byKey[it.key] = it;
  for (const r of res.rows) {
    const it = byKey[r.id];
    if (!it) { rows.push({ ...r, kind: res.kind, group: res.group, status: "?", asset: null }); continue; }
    // choose source image: still -> thumb (clean), anim/seasonal -> strip
    const src = res.kind === "icon-still" ? it.thumbPath : it.stripPath;
    let asset = null, frames = it.frames || 1, cw = 0, ch = 0, anim = "none";
    if (src && existsSync(src)) {
      const sub = SUB[res.kind];
      const fname = `${sub}__${r.id.replace(/[^a-z0-9_-]/gi, "_")}.png`;
      copyFileSync(src, `${ASSETS}/${sub}/${fname}`);
      const { w, h } = pngDim(src);
      cw = res.kind === "icon-still" ? w : Math.round(w / frames);
      ch = h;
      asset = `assets/${sub}/${fname}`;
      copied++;
      if (res.kind === "icon-anim") anim = "alt";
      else if (res.kind === "seasonal-anim") anim = it.sheet && it.sheet.startsWith("trans-") ? "alt" : "fwd";
    } else { missing++; }
    rows.push({
      id: r.id, kind: res.kind, group: res.group, status: it.status || (res.kind === "icon-still" ? "?" : "tile"),
      verdict: r.verdict, reads_as: r.reads_as, critique: r.critique,
      proposed_change: r.proposed_change, comment: r.comment,
      asset, frames, cw, ch, anim,
    });
  }
}

// --- stats ---
const kinds = ["icon-still", "icon-anim", "seasonal-still", "seasonal-anim"];
const verdicts = ["broken", "major", "minor", "good"];
const stat = {};
for (const k of kinds) stat[k] = { broken: 0, major: 0, minor: 0, good: 0, total: 0 };
for (const r of rows) { if (stat[r.kind]) { stat[r.kind][r.verdict] = (stat[r.kind][r.verdict] || 0) + 1; stat[r.kind].total++; } }
const grand = { broken: 0, major: 0, minor: 0, good: 0, total: rows.length };
for (const r of rows) grand[r.verdict] = (grand[r.verdict] || 0) + 1;

const VCOL = { broken: "#c0392b", major: "#e07b1a", minor: "#c9a227", good: "#3a8a4f" };
const KLABEL = { "icon-still": "Vector icon (still)", "icon-anim": "Vector icon (animation)", "seasonal-still": "Board tile (still)", "seasonal-anim": "Board tile (animated)" };

// priority list: broken + major, sorted
const priority = rows.filter((r) => r.verdict === "broken" || r.verdict === "major")
  .sort((a, b) => (a.verdict === b.verdict ? a.id.localeCompare(b.id) : a.verdict === "broken" ? -1 : 1));

function cell(r, i) {
  let media;
  if (!r.asset) media = `<div class="noimg">no image</div>`;
  else if (r.kind === "icon-still") media = `<img loading="lazy" src="${r.asset}" alt="${esc(r.id)}">`;
  else {
    const dur = (r.frames * (r.kind === "seasonal-anim" ? 0.16 : 0.13)).toFixed(2);
    const dir = r.anim === "alt" ? "alternate" : "normal";
    const w = r.cw * r.frames;
    media = `<div class="vp" style="width:${r.cw}px;height:${r.ch}px"><img class="film" loading="lazy" src="${r.asset}" style="--w:${w}px;--dur:${dur}s;--steps:${r.frames};animation-direction:${dir}"></div>`;
  }
  const stt = r.status && r.status !== "?" && r.status !== "tile" ? `<span class="tag s-${r.status.replace(/[^a-z]/gi, "")}">${esc(r.status)}</span>` : "";
  return `<tr data-kind="${r.kind}" data-verdict="${r.verdict}" data-status="${esc(r.status)}" data-group="${esc(r.group)}" data-search="${esc((r.id + " " + r.group + " " + r.reads_as + " " + r.critique).toLowerCase())}">
    <td class="c-img">${media}</td>
    <td class="c-id"><code>${esc(r.id)}</code><div class="meta"><span class="kbadge k-${r.kind}">${KLABEL[r.kind]}</span> ${stt}<span class="grp">${esc(r.group)}</span></div></td>
    <td class="c-v"><span class="v" style="background:${VCOL[r.verdict]}">${r.verdict}</span></td>
    <td class="c-reads">${esc(r.reads_as)}</td>
    <td class="c-crit">${esc(r.critique)}</td>
    <td class="c-prop">${r.proposed_change ? esc(r.proposed_change) : '<span class="dash">—</span>'}</td>
    <td class="c-com">${esc(r.comment)}</td>
  </tr>`;
}

const groups = [...new Set(rows.map((r) => r.group))].sort();

function statBar(s) {
  if (!s.total) return "";
  const seg = verdicts.map((v) => s[v] ? `<span style="width:${(s[v] / s.total * 100).toFixed(1)}%;background:${VCOL[v]}" title="${v}: ${s[v]}"></span>` : "").join("");
  return `<div class="bar">${seg}</div>`;
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>puzzleDrag2 — Icon &amp; Tile Visual Audit</title>
<style>
:root{--bg:#f4f1ea;--card:#fffdf8;--ink:#2c2a26;--mut:#7a746a;--line:#e2dccf;--accent:#3a5a78}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
header{padding:28px 32px 18px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#fffdf8,#f4f1ea)}
h1{margin:0 0 4px;font-size:26px;letter-spacing:-.3px}
.sub{color:var(--mut);font-size:14px;max-width:980px}
.wrap{padding:22px 32px 80px}
.dash{color:var(--mut)}
.cards{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0 8px}
.scard{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;min-width:210px;flex:1}
.scard h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:var(--mut)}
.scard .big{font-size:24px;font-weight:700}
.bar{display:flex;height:10px;border-radius:6px;overflow:hidden;margin-top:10px;background:#eee}
.bar span{display:block;height:100%}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0 0;font-size:13px;color:var(--mut)}
.legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.controls{position:sticky;top:0;z-index:5;background:rgba(244,241,234,.96);backdrop-filter:blur(6px);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:18px 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.controls select,.controls input{font:14px inherit;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)}
.controls input[type=search]{min-width:240px;flex:1}
.controls .count{margin-left:auto;color:var(--mut);font-size:13px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px}
thead th{position:sticky;top:var(--head-top,64px);background:#efeadf;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:var(--mut);padding:10px;border-bottom:1px solid var(--line);z-index:2}
tbody tr{border-bottom:1px solid var(--line);content-visibility:auto;contain-intrinsic-size:140px}
tbody tr:hover{background:#fbf8f0}
td{padding:10px;vertical-align:top}
.c-img{width:128px;text-align:center}
.c-img>img{image-rendering:pixelated;max-width:120px;max-height:120px;border-radius:6px;background:#ece6d8}
.vp{overflow:hidden;display:inline-block;border-radius:6px}
.film{display:block;image-rendering:pixelated;animation-name:film;animation-duration:var(--dur);animation-timing-function:steps(var(--steps));animation-iteration-count:infinite}
@keyframes film{from{transform:translateX(0)}to{transform:translateX(calc(-1*var(--w)))}}
.noimg{color:var(--mut);font-size:12px;padding:30px 4px}
.c-id{width:172px}.c-id code{font:12px ui-monospace,Menlo,Consolas,monospace;word-break:break-all}
.meta{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.kbadge{font-size:10px;padding:2px 6px;border-radius:5px;color:#fff;white-space:nowrap}
.k-icon-still{background:#5a6b8c}.k-icon-anim{background:#7a5a8c}.k-seasonal-still{background:#4f7a5a}.k-seasonal-anim{background:#2f7a6e}
.grp{font-size:11px;color:var(--mut)}
.tag{font-size:10px;padding:2px 6px;border-radius:5px;background:#e8e2d4;color:#6a6357}
.s-inuse{background:#dcebe0;color:#2c6b3c}.s-removalcandidate{background:#f0e2dc;color:#9a4a2c}.s-aliastarget{background:#e6e2f0;color:#5a4a8c}
.c-v{width:78px}
.v{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#fff;padding:3px 8px;border-radius:6px}
.c-reads{width:150px;font-weight:600}
.c-crit{min-width:260px}.c-prop{min-width:180px;color:#7a4a2c}.c-com{min-width:180px;color:var(--mut);font-size:13px}
details.prio{margin:14px 0;background:#fff6f2;border:1px solid #f0d8cc;border-radius:12px;padding:6px 16px}
details.prio summary{cursor:pointer;font-weight:700;padding:8px 0}
.prio ul{margin:6px 0 12px;padding-left:18px}.prio li{margin:3px 0}
.prio code{font:12px ui-monospace,monospace}
.prio .v{font-size:10px;padding:1px 6px;margin-right:6px}
.method{color:var(--mut);font-size:13px;margin-top:8px;max-width:980px}
</style></head><body>
<header>
  <h1>puzzleDrag2 — Icon &amp; Tile Visual Audit</h1>
  <div class="sub">Full visual QA of every rendered icon, board tile, animation and still. Each item was rendered to PNG and viewed by an independent reviewer agent against a readability / subject-accuracy / pixel-craft / motion rubric. ${grand.total} items reviewed.</div>
  <div class="legend">${verdicts.map((v) => `<span><i style="background:${VCOL[v]}"></i>${v} (${grand[v] || 0})</span>`).join("")}</div>
</header>
<div class="wrap">
  <div class="cards">
    ${kinds.map((k) => `<div class="scard"><h3>${KLABEL[k]}</h3><div class="big">${stat[k].total}</div>${statBar(stat[k])}<div class="legend" style="margin-top:8px">${verdicts.filter((v) => stat[k][v]).map((v) => `<span><i style="background:${VCOL[v]}"></i>${stat[k][v]}</span>`).join("")}</div></div>`).join("")}
  </div>

  <details class="prio" open>
    <summary>⚠ Priority — ${priority.length} items flagged broken or major</summary>
    <ul>
      ${priority.map((r) => `<li><span class="v" style="background:${VCOL[r.verdict]}">${r.verdict}</span><code>${esc(r.id)}</code> — ${esc(r.reads_as)}. ${esc(r.proposed_change || r.critique)}</li>`).join("\n")}
    </ul>
  </details>

  <div class="controls">
    <select id="fk"><option value="">All kinds</option>${kinds.map((k) => `<option value="${k}">${KLABEL[k]}</option>`).join("")}</select>
    <select id="fv"><option value="">All verdicts</option>${verdicts.map((v) => `<option value="${v}">${v}</option>`).join("")}</select>
    <select id="fs"><option value="">All status</option><option>in-use</option><option>removal-candidate</option><option>alias-target</option><option>tile</option></select>
    <select id="fg"><option value="">All groups</option>${groups.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}</select>
    <input id="fq" type="search" placeholder="search id / critique…">
    <span class="count" id="count"></span>
  </div>

  <table><thead><tr>
    <th>Art</th><th>ID / kind</th><th>Verdict</th><th>Reads as</th><th>Critique</th><th>Proposed change</th><th>Comment</th>
  </tr></thead><tbody id="tb">
  ${rows.map(cell).join("\n")}
  </tbody></table>
  <p class="method">Method: vector icons rendered via the game's real <code>paintIcon</code> on a split light/dark field at 2× DPR; animations sampled to 14-frame strips; board tiles sliced from the shipped <code>public/seasonal-tiles</code> spritesheets (frame size = sheet height) and nearest-neighbour upscaled. Animated cells loop live (icon idles &amp; transitions play in-page).</p>
</div>
<script>
const tb=document.getElementById('tb');const rowsEl=[...tb.children];
const fk=document.getElementById('fk'),fv=document.getElementById('fv'),fs=document.getElementById('fs'),fg=document.getElementById('fg'),fq=document.getElementById('fq'),count=document.getElementById('count');
function apply(){const k=fk.value,v=fv.value,s=fs.value,g=fg.value,q=fq.value.trim().toLowerCase();let n=0;
 for(const tr of rowsEl){const ok=(!k||tr.dataset.kind===k)&&(!v||tr.dataset.verdict===v)&&(!s||tr.dataset.status===s)&&(!g||tr.dataset.group===g)&&(!q||tr.dataset.search.includes(q));tr.style.display=ok?'':'none';if(ok)n++;}
 count.textContent=n+' / '+rowsEl.length+' shown';}
[fk,fv,fs,fg].forEach(e=>e.onchange=apply);fq.oninput=apply;apply();
// Pin the table head flush below the sticky controls bar (its height varies with wrap).
const ctrls=document.querySelector('.controls');
const syncHeadTop=()=>document.documentElement.style.setProperty('--head-top',ctrls.offsetHeight+'px');
syncHeadTop();new ResizeObserver(syncHeadTop).observe(ctrls);addEventListener('resize',syncHeadTop);
</script>
</body></html>`;

writeFileSync(`${DOC}/index.html`, html);
console.log(`report: ${DOC}/index.html`);
console.log(`rows: ${rows.length}  images copied: ${copied}  missing: ${missing}`);
console.log(`verdicts: ${JSON.stringify(grand)}`);
console.log(`priority (broken+major): ${priority.length}`);
