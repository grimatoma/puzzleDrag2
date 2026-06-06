// Render docs/parity-matrix.json -> docs/godot-parity-matrix.html.
//
// The JSON is the source of truth for Godot-vs-React parity (one row per React
// surface). This script reads it and writes a single self-contained HTML page
// (inline CSS/JS, only a CDN webfont link) styled in the repo's house "journal"
// theme — a sortable + filterable parity table with a rolled-up header banner.
//
// Deterministic: no Date.now()/random, so the output diffs cleanly when the
// underlying JSON changes. No network access at build time (the font link is
// resolved by the browser, not at build). Validated by check-parity-matrix.mjs.
//
// Style mirrors the other .mjs tools in this folder (build-docs.mjs,
// export-v1-tiles.mjs): Node ESM, node: built-ins only, no deps.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const dataPath = join(repoRoot, "docs", "parity-matrix.json");
const outPath = join(repoRoot, "docs", "godot-parity-matrix.html");

// --- load -------------------------------------------------------------------

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const milestones = data.milestones ?? [];
const rows = data.rows ?? [];

const CATEGORIES = ["slice", "view", "modal", "system", "golden", "infra"];
const STATUSES = ["full", "partial", "absent"];
const STATUS_PILL = { full: "ok", partial: "warn", absent: "danger" };
const STATUS_LABEL = { full: "full", partial: "partial", absent: "absent" };

const milestoneTitle = Object.fromEntries(milestones.map((m) => [m.id, m.title]));
// Stable milestone display order (any unknown ids appended in first-seen order).
const MILESTONE_ORDER = milestones.map((m) => m.id);
function milestoneRank(id) {
  const i = MILESTONE_ORDER.indexOf(id);
  return i === -1 ? MILESTONE_ORDER.length : i;
}

// --- rollups ----------------------------------------------------------------

function blankCounts() {
  return { full: 0, partial: 0, absent: 0, total: 0 };
}

const totals = blankCounts();
const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, blankCounts()]));
const byMilestone = Object.fromEntries(MILESTONE_ORDER.map((m) => [m, blankCounts()]));

for (const r of rows) {
  const st = r.godot_status;
  totals.total++;
  if (st in totals) totals[st]++;
  const cat = byCategory[r.category];
  if (cat) {
    cat.total++;
    if (st in cat) cat[st]++;
  }
  const ms = byMilestone[r.target_milestone];
  if (ms) {
    ms.total++;
    if (st in ms) ms[st]++;
  }
}

// "Parity %" — weight full as 1.0, partial as 0.5, absent as 0.
const parityScore = totals.full + totals.partial * 0.5;
const parityPct = totals.total ? Math.round((parityScore / totals.total) * 100) : 0;

// --- html helpers -----------------------------------------------------------

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusPill(st) {
  return `<span class="pill ${STATUS_PILL[st] || "idle"}">${esc(STATUS_LABEL[st] || st)}</span>`;
}

function chips(list) {
  return (list || [])
    .map((v) => `<span class="vchip">${esc(v)}</span>`)
    .join("");
}

// A row, tagged with data-* so the client filters/sorts purely in the DOM.
function rowHtml(r) {
  return (
    `<tr data-cat="${esc(r.category)}" data-status="${esc(r.godot_status)}" data-ms="${esc(r.target_milestone)}" ` +
    `data-name="${esc(String(r.feature_or_screen).toLowerCase())}">` +
    `<td class="c-feat"><span class="feat">${esc(r.feature_or_screen)}</span>` +
    (r.note ? `<span class="note">${esc(r.note)}</span>` : "") +
    `</td>` +
    `<td class="c-cat"><span class="cat cat-${esc(r.category)}">${esc(r.category)}</span></td>` +
    `<td class="c-status">${statusPill(r.godot_status)}</td>` +
    `<td class="c-ms"><span class="ms">${esc(r.target_milestone)}</span></td>` +
    `<td class="c-verified">${chips(r.verified_by)}</td>` +
    `</tr>`
  );
}

// Sort rows by milestone rank, then category order, then feature name — stable
// and deterministic so the rendered HTML diffs meaningfully.
const sortedRows = rows.slice().sort((a, b) => {
  const mr = milestoneRank(a.target_milestone) - milestoneRank(b.target_milestone);
  if (mr) return mr;
  const cr = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
  if (cr) return cr;
  return String(a.feature_or_screen).localeCompare(String(b.feature_or_screen));
});

// Grouped-by-milestone rendering: a banner subhead row per milestone, then its rows.
function groupedTbody() {
  const out = [];
  for (const m of MILESTONE_ORDER) {
    const group = sortedRows.filter((r) => r.target_milestone === m);
    if (!group.length) continue;
    const c = byMilestone[m];
    out.push(
      `<tr class="group" data-ms="${esc(m)}">` +
        `<td colspan="5"><span class="gms">${esc(m)}</span>` +
        `<span class="gtitle">${esc(milestoneTitle[m] || "")}</span>` +
        `<span class="gcount">${c.full}/${c.total} full · ${c.partial} partial · ${c.absent} absent</span>` +
        `</td></tr>`
    );
    for (const r of group) out.push(rowHtml(r));
  }
  return out.join("\n");
}

// Flat (sortable) rendering: all rows, no group headers.
function flatTbody() {
  return sortedRows.map(rowHtml).join("\n");
}

// --- summary cards ----------------------------------------------------------

function statBar(c) {
  const seg = (n, cls) =>
    n > 0
      ? `<span class="seg ${cls}" style="flex:${n}" title="${cls}: ${n}"></span>`
      : "";
  return (
    `<span class="bar">${seg(c.full, "full")}${seg(c.partial, "partial")}${seg(c.absent, "absent")}</span>`
  );
}

function categoryCards() {
  return CATEGORIES.map((cat) => {
    const c = byCategory[cat];
    return (
      `<div class="card statcard">` +
      `<h3>${esc(cat)} <span class="cardtotal">${c.total}</span></h3>` +
      statBar(c) +
      `<div class="statline">` +
      `<span class="s-full">${c.full} full</span>` +
      `<span class="s-partial">${c.partial} partial</span>` +
      `<span class="s-absent">${c.absent} absent</span>` +
      `</div></div>`
    );
  }).join("\n");
}

// --- page -------------------------------------------------------------------

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- GENERATED by tools/build-parity-matrix.mjs from docs/parity-matrix.json.
     Do NOT edit by hand — edit the JSON and re-run the build. -->
<title>Godot Parity Matrix — Deep Crystal</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800;9..144,900&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#2a2218; --muted:#7a6f5d; --line:#e6ddcb; --bg:#fbf7ee;
    --paper:#fffdf6; --code:#f1e9d6;
    --accent:#b45309;       /* dominant — harvest amber */
    --accent2:#3f6f4f;      /* secondary — field green */
    --shadow:0 1px 2px rgba(60,40,8,.06), 0 8px 26px -14px rgba(60,40,8,.28);
    --ok:#3f8f47; --warn:#c97a16; --absent:#b5341f; --info:#1f6f8b; --idle:#9b8f78;
    --serif:"Fraunces",Georgia,"Times New Roman",serif;
    --sans:"IBM Plex Sans",system-ui,-apple-system,sans-serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    font:400 15.5px/1.6 var(--sans); color:var(--ink); margin:0;
    background:
      radial-gradient(1200px 520px at 82% -8%, color-mix(in srgb,var(--accent) 10%,transparent), transparent 60%),
      radial-gradient(1000px 460px at -8% 2%, color-mix(in srgb,var(--accent2) 9%,transparent), transparent 55%),
      linear-gradient(180deg, var(--bg) 0%, #f3ecdd 100%);
    background-attachment:fixed; background-color:var(--bg);
  }
  a{color:var(--accent);text-decoration:none;} a:hover{text-decoration:underline;}
  code{background:var(--code);padding:.08rem .36rem;border-radius:4px;font:.84em var(--mono);color:#6b5638;}
  .page{max-width:1240px;margin:0 auto;padding:1.5rem 1.25rem 5rem;}

  /* hero / banner */
  header.hero{
    border-bottom:3px solid var(--accent); padding:1.4rem 1.6rem 1.2rem; margin-bottom:1.3rem;
    background:linear-gradient(135deg, color-mix(in srgb,var(--accent) 9%,transparent), color-mix(in srgb,var(--accent2) 7%,transparent));
    border-radius:16px 16px 6px 6px; box-shadow:var(--shadow);
  }
  header.hero h1{font:800 2.6rem/1.05 var(--serif);letter-spacing:-.015em;margin:.1rem 0 .35rem;color:var(--ink);}
  .sub{color:var(--muted);font-size:1.02rem;margin:.2rem 0 .9rem;max-width:74ch;}
  .meta{font-size:.78rem;color:var(--muted);margin:.3rem 0 1rem;font-family:var(--mono);}

  /* big parity readout */
  .parity{display:flex;align-items:flex-end;gap:1.1rem;flex-wrap:wrap;margin:.4rem 0 .9rem;}
  .parity .big{font:800 3.4rem/1 var(--serif);color:var(--accent);letter-spacing:-.02em;}
  .parity .biglbl{font-size:.82rem;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.5rem;}
  .parity .totals{font-size:.9rem;color:var(--ink);margin-bottom:.55rem;}
  .parity .totals b{font-family:var(--serif);}
  .progress{height:16px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--absent) 22%,#fff);
    border:1px solid var(--line);box-shadow:inset 0 1px 2px rgba(60,40,8,.12);display:flex;margin:.2rem 0 .2rem;}
  .progress .pfull{background:var(--ok);} .progress .ppartial{background:var(--warn);}
  .plegend{font-size:.76rem;color:var(--muted);display:flex;gap:1rem;flex-wrap:wrap;margin-top:.4rem;}
  .plegend i{display:inline-block;width:.7rem;height:.7rem;border-radius:3px;margin-right:.3rem;vertical-align:-1px;}

  /* summary cards */
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.85rem;margin:1.1rem 0 1.6rem;}
  .card{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:.7rem .9rem;box-shadow:var(--shadow);}
  .statcard h3{font:700 1.05rem/1.2 var(--serif);margin:.1rem 0 .5rem;color:var(--ink);text-transform:capitalize;display:flex;justify-content:space-between;align-items:baseline;}
  .cardtotal{font:800 1.2rem var(--serif);color:var(--accent);}
  .bar{display:flex;height:9px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--idle) 18%,#fff);margin:.1rem 0 .5rem;}
  .bar .seg.full{background:var(--ok);} .bar .seg.partial{background:var(--warn);} .bar .seg.absent{background:var(--absent);}
  .statline{font-size:.74rem;display:flex;gap:.6rem;flex-wrap:wrap;color:var(--muted);}
  .s-full{color:var(--ok);font-weight:600;} .s-partial{color:var(--warn);font-weight:600;} .s-absent{color:var(--absent);font-weight:600;}

  /* controls */
  .controls{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:.7rem .9rem;box-shadow:var(--shadow);margin:0 0 1rem;}
  .filterbar{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;margin:.25rem 0;}
  .filterbar .lbl{font-size:.74rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;min-width:5.2rem;}
  .filterbar button{font:600 .78rem/1 var(--sans);padding:.32rem .6rem;border:1px solid var(--line);background:var(--paper);border-radius:7px;cursor:pointer;color:var(--ink);transition:background .14s,color .14s,border-color .14s;text-transform:capitalize;}
  .filterbar button:hover{border-color:var(--accent);color:var(--accent);}
  .filterbar button.on{background:var(--accent);color:#fff;border-color:var(--accent);}
  .filterbar input[type=search]{font:400 .82rem var(--sans);padding:.34rem .55rem;border:1px solid var(--line);border-radius:7px;min-width:200px;background:var(--paper);color:var(--ink);}
  .toggles{display:flex;gap:.5rem;align-items:center;font-size:.78rem;color:var(--muted);margin-top:.35rem;}
  .toggles label{cursor:pointer;}
  .count{font-size:.78rem;color:var(--muted);margin-left:auto;font-family:var(--mono);}

  /* table */
  table{border-collapse:collapse;width:100%;margin:.3rem 0;font-size:.86rem;background:var(--paper);border-radius:12px;overflow:hidden;box-shadow:var(--shadow);}
  thead th{position:sticky;top:0;background:color-mix(in srgb,var(--accent) 12%,#fff7ec);color:var(--ink);font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;padding:.5rem .7rem;text-align:left;border-bottom:2px solid var(--line);cursor:pointer;user-select:none;white-space:nowrap;}
  thead th .arrow{opacity:.4;font-size:.7rem;}
  thead th.sorted .arrow{opacity:1;color:var(--accent);}
  td{border-bottom:1px solid var(--line);padding:.5rem .7rem;text-align:left;vertical-align:top;}
  tbody tr:not(.group):hover{background:color-mix(in srgb,var(--accent) 5%,#fff);}
  .feat{font-weight:600;display:block;color:var(--ink);}
  .note{display:block;color:var(--muted);font-size:.78rem;margin-top:.15rem;line-height:1.45;}
  .c-cat,.c-status,.c-ms{white-space:nowrap;}
  .cat{display:inline-block;font-size:.72rem;font-weight:700;padding:.1rem .45rem;border-radius:6px;text-transform:capitalize;border:1px solid var(--line);background:#fff;color:var(--muted);}
  .cat-system{color:#7a4a16;background:color-mix(in srgb,var(--accent) 12%,#fff);border-color:color-mix(in srgb,var(--accent) 35%,#fff);}
  .cat-view{color:#1f6f8b;background:color-mix(in srgb,var(--info) 12%,#fff);border-color:color-mix(in srgb,var(--info) 35%,#fff);}
  .cat-modal{color:#5a4a8a;background:#efeafb;border-color:#d9d0f0;}
  .cat-slice{color:#3f6f4f;background:color-mix(in srgb,var(--accent2) 13%,#fff);border-color:color-mix(in srgb,var(--accent2) 35%,#fff);}
  .cat-golden{color:#8a6a16;background:#f7efd6;border-color:#e4d6a6;}
  .cat-infra{color:#6b5638;background:var(--code);border-color:#ddd0b4;}
  .pill{display:inline-block;font-size:.72rem;font-weight:700;padding:.12rem .55rem;border-radius:999px;color:#fff;}
  .pill.ok{background:var(--ok);} .pill.warn{background:var(--warn);} .pill.danger{background:var(--absent);} .pill.idle{background:var(--idle);}
  .ms{font:600 .8rem var(--mono);color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,#fff);padding:.08rem .4rem;border-radius:5px;border:1px solid color-mix(in srgb,var(--accent) 25%,#fff);}
  .vchip{display:inline-block;font:400 .72rem var(--mono);background:var(--code);color:#6b5638;padding:.1rem .42rem;border-radius:5px;border:1px solid #e0d4b8;margin:.08rem .18rem .08rem 0;white-space:nowrap;}

  /* milestone group rows */
  tr.group td{background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 8%,#fff8ee),transparent);border-top:2px solid color-mix(in srgb,var(--accent) 25%,#fff);padding:.4rem .7rem;}
  tr.group .gms{font:800 .9rem var(--serif);color:var(--accent);margin-right:.6rem;}
  tr.group .gtitle{font-weight:600;color:var(--ink);}
  tr.group .gcount{float:right;font:400 .76rem var(--mono);color:var(--muted);}

  .footnote{font-size:.78rem;color:var(--muted);margin-top:1.3rem;line-height:1.55;}
  .footnote code{font-size:.92em;}

  @media (max-width:820px){
    header.hero h1{font-size:2rem;}
    .note{font-size:.74rem;}
    thead th{font-size:.7rem;}
    .filterbar .lbl{min-width:auto;width:100%;}
    .count{margin-left:0;}
  }
  @media (prefers-reduced-motion:reduce){ html{scroll-behavior:auto;} *{animation:none!important;transition:none!important;} }
  @media print{
    .controls{display:none;}
    thead th{cursor:default;position:static;}
    body{background:#fff;}
    header.hero,table,.card{box-shadow:none;}
    tbody tr.hidden-print{display:table-row!important;}
  }
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
  header.hero{animation:fadeUp .5s cubic-bezier(.21,.61,.35,1) both;}
</style>
</head>
<body>
<div class="page">

  <header class="hero">
    <h1>Godot Parity Matrix</h1>
    <p class="sub">Live status of the Godot 4 port against the React + Phaser game, one row per React surface (slice / view / modal / system / golden / infra). This is the queryable replacement for the prose progress tracker — the <strong>source of truth</strong> is <code>docs/parity-matrix.json</code>; this page is generated from it.</p>
    <p class="meta">generated_from: ${esc(data.generated_from || "")} · rebuild: <code>node tools/build-parity-matrix.mjs</code> · CI guard: <code>node tools/check-parity-matrix.mjs</code></p>

    <div class="parity">
      <div>
        <div class="biglbl">Parity</div>
        <div class="big">${parityPct}%</div>
      </div>
      <div style="flex:1;min-width:280px;">
        <div class="totals"><b>${totals.total}</b> rows · <b style="color:var(--ok)">${totals.full}</b> full · <b style="color:var(--warn)">${totals.partial}</b> partial · <b style="color:var(--absent)">${totals.absent}</b> absent</div>
        <div class="progress" role="img" aria-label="${parityPct}% parity">
          <div class="pfull" style="flex:${totals.full}"></div>
          <div class="ppartial" style="flex:${totals.partial}"></div>
        </div>
        <div class="plegend">
          <span><i style="background:var(--ok)"></i>full = logic + UI ported &amp; verified</span>
          <span><i style="background:var(--warn)"></i>partial = logic done / UI or art pending</span>
          <span><i style="background:var(--absent)"></i>absent = not started</span>
          <span style="color:var(--muted)">(parity weights full 1.0, partial 0.5)</span>
        </div>
      </div>
    </div>

    <div class="grid">
${categoryCards()}
    </div>
  </header>

  <div class="controls">
    <div class="filterbar">
      <span class="lbl">Category</span>
      <button class="on" data-fkind="cat" data-fval="all">all</button>
${CATEGORIES.map((c) => `      <button data-fkind="cat" data-fval="${c}">${c}</button>`).join("\n")}
    </div>
    <div class="filterbar">
      <span class="lbl">Status</span>
      <button class="on" data-fkind="status" data-fval="all">all</button>
${STATUSES.map((s) => `      <button data-fkind="status" data-fval="${s}">${s}</button>`).join("\n")}
    </div>
    <div class="filterbar">
      <span class="lbl">Milestone</span>
      <button class="on" data-fkind="ms" data-fval="all">all</button>
${MILESTONE_ORDER.map((m) => `      <button data-fkind="ms" data-fval="${m}">${m}</button>`).join("\n")}
    </div>
    <div class="filterbar">
      <span class="lbl">Search</span>
      <input type="search" id="q" placeholder="filter by name or note…" aria-label="Search rows">
      <span class="count" id="rowcount">${rows.length} / ${rows.length} rows</span>
    </div>
    <div class="toggles">
      <label><input type="checkbox" id="groupToggle" checked> Group by milestone</label>
    </div>
  </div>

  <table id="matrix">
    <thead>
      <tr>
        <th data-sort="name">Feature / screen <span class="arrow">↕</span></th>
        <th data-sort="cat">Category <span class="arrow">↕</span></th>
        <th data-sort="status">Godot <span class="arrow">↕</span></th>
        <th data-sort="ms">Milestone <span class="arrow">↕</span></th>
        <th data-sort="verified">Verified by</th>
      </tr>
    </thead>
    <tbody id="grouped">
${groupedTbody()}
    </tbody>
    <tbody id="flat" hidden>
${flatTbody()}
    </tbody>
  </table>

  <p class="footnote">
    <strong>How this stays honest.</strong> Every milestone PR flips the rows it closes and fills <code>verified_by</code> with the real artifact names it added.
    <code>tools/check-parity-matrix.mjs</code> (CI) parses the JSON and fails if any <code>full</code> row references a <code>run_*.gd</code> suite that does not exist on disk — so the matrix cannot drift ahead of reality.
    <code>verified_by</code> entries prefixed <code>e2e:</code> / <code>golden:</code> / <code>ci:</code> / <code>gdunit4:</code> are forward-looking artifact names for not-yet-done rows and are not validated.
  </p>

</div>

<script>
  // Pure client-side filter + sort over the matrix rows. No external deps.
  (function(){
    var grouped = document.getElementById('grouped');
    var flat = document.getElementById('flat');
    var table = document.getElementById('matrix');
    var qInput = document.getElementById('q');
    var rowcount = document.getElementById('rowcount');
    var groupToggle = document.getElementById('groupToggle');
    var state = { cat:'all', status:'all', ms:'all', q:'', grouped:true, sort:null, dir:1 };

    function dataRows(tbody){ return [].slice.call(tbody.querySelectorAll('tr:not(.group)')); }

    function matches(tr){
      if(state.cat !== 'all' && tr.dataset.cat !== state.cat) return false;
      if(state.status !== 'all' && tr.dataset.status !== state.status) return false;
      if(state.ms !== 'all' && tr.dataset.ms !== state.ms) return false;
      if(state.q){
        var hay = (tr.dataset.name + ' ' + tr.textContent).toLowerCase();
        if(hay.indexOf(state.q) === -1) return false;
      }
      return true;
    }

    function apply(){
      var active = state.grouped ? grouped : flat;
      grouped.hidden = !state.grouped;
      flat.hidden = state.grouped;
      var shown = 0, total = 0;
      dataRows(active).forEach(function(tr){
        total++;
        var ok = matches(tr);
        tr.style.display = ok ? '' : 'none';
        if(ok) shown++;
      });
      // Hide group headers whose rows are all filtered out.
      if(state.grouped){
        [].slice.call(grouped.querySelectorAll('tr.group')).forEach(function(g){
          var any = false, n = g.nextElementSibling;
          while(n && !n.classList.contains('group')){
            if(n.style.display !== 'none'){ any = true; break; }
            n = n.nextElementSibling;
          }
          g.style.display = any ? '' : 'none';
        });
      }
      rowcount.textContent = shown + ' / ' + total + ' rows';
    }

    // filter buttons
    [].slice.call(document.querySelectorAll('.filterbar button')).forEach(function(btn){
      btn.addEventListener('click', function(){
        var kind = btn.dataset.fkind;
        document.querySelectorAll('.filterbar button[data-fkind="'+kind+'"]').forEach(function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        state[kind] = btn.dataset.fval;
        apply();
      });
    });

    qInput.addEventListener('input', function(){ state.q = qInput.value.trim().toLowerCase(); apply(); });

    groupToggle.addEventListener('change', function(){ state.grouped = groupToggle.checked; apply(); });

    // column sort (operates on the flat tbody; switches off grouping)
    var statusRank = { full:0, partial:1, absent:2 };
    var msList = [${MILESTONE_ORDER.map((m) => `'${m}'`).join(",")}];
    function keyOf(tr, col){
      if(col === 'status') return statusRank[tr.dataset.status] != null ? statusRank[tr.dataset.status] : 9;
      if(col === 'ms'){ var i = msList.indexOf(tr.dataset.ms); return i === -1 ? 99 : i; }
      if(col === 'cat') return tr.dataset.cat;
      if(col === 'verified') return tr.querySelector('.c-verified').textContent;
      return tr.dataset.name;
    }
    [].slice.call(table.querySelectorAll('thead th[data-sort]')).forEach(function(th){
      th.addEventListener('click', function(){
        var col = th.dataset.sort;
        state.dir = (state.sort === col) ? -state.dir : 1;
        state.sort = col;
        table.querySelectorAll('thead th').forEach(function(h){ h.classList.remove('sorted'); });
        th.classList.add('sorted');
        // force flat view for sorting
        state.grouped = false; groupToggle.checked = false;
        var rows = dataRows(flat);
        rows.sort(function(a,b){
          var ka = keyOf(a,col), kb = keyOf(b,col);
          if(ka < kb) return -1*state.dir;
          if(ka > kb) return 1*state.dir;
          return a.dataset.name < b.dataset.name ? -1 : 1;
        });
        rows.forEach(function(r){ flat.appendChild(r); });
        apply();
      });
    });

    apply();
  })();
</script>
</body>
</html>
`;

writeFileSync(outPath, html);
console.log(
  `parity-matrix: wrote ${outPath}\n` +
    `  rows=${rows.length}  full=${totals.full}  partial=${totals.partial}  absent=${totals.absent}  parity=${parityPct}%`
);
