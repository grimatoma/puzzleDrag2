// Author the canonical game-design doc SET as self-contained HTML files under
// reference/docs/game-design/. This replaces the old single town1-2-economy-design.html
// monolith, which had become a decision-journal-in-a-spec (the same fact stated
// 4–6 times, inline status tags, a Gaps tab braided through the design).
//
// The discipline (see .claude/skills/design-doc): one artifact per job.
//   - The DESIGN docs (overview / systems / towns / buildings / meta-money) state
//     DECISIONS ONLY, present tense — no status tags, no per-section aphorisms,
//     every concept in exactly one home (referenced, not re-derived, elsewhere).
//   - The STATUS doc (status.html) is the ONLY place build-state lives.
//   - Hard numbers live in the Balance Profile (reference/docs/balance/), the
//     code (src/constants.ts) and the playtest harness — not duplicated here.
//
// Shared chrome (head, CSS, hero, cross-doc nav, tab script) is defined once
// below so the six pages stay visually identical and regenerable. The emitted
// .html files are still fully self-contained (no build step to view them).
//
// Run: `node reference/tools/build-game-design-docs.mjs`

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "docs", "game-design");

// Order of the set, used for the cross-doc nav row under every hero.
const NAV = [
  { slug: "index", label: "Overview" },
  { slug: "systems", label: "Systems & economy" },
  { slug: "towns", label: "The seven towns" },
  { slug: "buildings", label: "Buildings & tools" },
  { slug: "meta-money", label: "Meta & money" },
  { slug: "status", label: "Build status" },
];

const CSS = `
  :root{
    --ink:#2c2417; --muted:#7a6c54; --line:#e4d9c2; --bg:#fbf6ec;
    --paper:#fffdf6; --code:#f1e8d6;
    --accent:#bf7a1e; --accent2:#4f7a3a;
    --shadow:0 1px 2px rgba(50,36,12,.06), 0 6px 20px -10px rgba(50,36,12,.22);
    --ok:#3f9142; --warn:#d97312; --info:#1d6fb8; --danger:#b5341f; --idle:#9a8d75;
    --serif:"Fraunces",Georgia,"Times New Roman",serif;
    --sans:"IBM Plex Sans",system-ui,-apple-system,sans-serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    font:400 16px/1.64 var(--sans); color:var(--ink); margin:0;
    background:
      radial-gradient(1200px 520px at 80% -8%, color-mix(in srgb,var(--accent) 10%,transparent), transparent 60%),
      radial-gradient(1000px 460px at -10% 4%, color-mix(in srgb,var(--accent2) 9%,transparent), transparent 55%),
      linear-gradient(180deg, #fbf6ec 0%, #f3ebda 100%);
    background-attachment:fixed; background-color:#fbf6ec;
  }
  a{color:var(--accent);text-decoration:none;} a:hover{text-decoration:underline;}
  code{background:var(--code);padding:.08rem .36rem;border-radius:4px;font:.82em var(--mono);color:#6a5532;}
  .page{max-width:1100px;margin:0 auto;padding:1.5rem 1.25rem 5rem;}

  header.hero{
    border-bottom:3px solid var(--accent); padding:1.5rem 1.6rem 1.2rem; margin-bottom:1.2rem;
    background:linear-gradient(135deg, color-mix(in srgb,var(--accent) 10%,transparent), color-mix(in srgb,var(--accent2) 7%,transparent));
    border-radius:14px 14px 6px 6px; box-shadow:var(--shadow);
  }
  header.hero h1{font:800 2.6rem/1.08 var(--serif);letter-spacing:-.015em;margin:.1rem 0 .35rem;color:var(--ink);}
  .sub{color:var(--muted);font-size:1.05rem;margin:.2rem 0 .75rem;max-width:72ch;}
  .meta{font-size:.8rem;color:var(--muted);margin:.4rem 0 .7rem;}
  .chips{display:flex;flex-wrap:wrap;gap:.4rem;}
  .chip{font-size:.76rem;font-weight:600;padding:.2rem .6rem;border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,#fff);color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 30%,#fff);}

  .docnav{display:flex;flex-wrap:wrap;gap:.3rem;margin:.1rem 0 1.5rem;font-family:var(--sans);}
  .docnav a{font-size:.82rem;font-weight:600;padding:.32rem .7rem;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--muted);}
  .docnav a:hover{color:var(--accent);border-color:var(--accent);text-decoration:none;}
  .docnav a.here{background:var(--accent);color:#fff;border-color:var(--accent);}

  nav.tabs{display:flex;flex-wrap:wrap;gap:.35rem;border-bottom:2px solid var(--line);margin:.1rem 0 1.7rem;}
  nav.tabs .tab{font:700 1rem/1 var(--serif);letter-spacing:-.01em;padding:.62rem 1.05rem;cursor:pointer;color:var(--muted);background:transparent;border:1px solid transparent;border-bottom:none;border-radius:11px 11px 0 0;margin-bottom:-2px;transition:color .14s,background .14s,border-color .14s;}
  nav.tabs .tab:hover{color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent);}
  nav.tabs .tab.active{color:var(--ink);background:var(--paper);border-color:var(--line);border-top:3px solid var(--accent);box-shadow:0 -5px 16px -9px rgba(50,36,12,.30);}
  html.tabs-on main>.panel{display:none;}
  html.tabs-on main>.panel.active{display:block;}

  main{min-width:0;}
  section{scroll-margin-top:1rem;}
  h2{font:800 1.8rem/1.15 var(--serif);letter-spacing:-.01em;margin-top:0;border-bottom:1px solid var(--line);padding-bottom:.25rem;color:var(--ink);}
  section + section h2{margin-top:2.4rem;}
  h3{font:600 1.24rem/1.25 var(--serif);margin-top:1.5rem;color:var(--ink);}
  h4{font:700 .82rem/1.3 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin:1.2rem 0 .3rem;}
  p,li{margin:.45rem 0;}
  .lead{font-size:1.06rem;color:#43381f;max-width:74ch;}

  table{border-collapse:collapse;width:100%;margin:.9rem 0;font-size:.86rem;background:var(--paper);border-radius:10px;overflow:hidden;box-shadow:var(--shadow);}
  th,td{border:1px solid var(--line);padding:.46rem .65rem;text-align:left;vertical-align:top;}
  th{background:color-mix(in srgb,var(--accent) 9%,#fff);color:var(--ink);font-weight:700;}
  tbody tr:nth-child(even){background:color-mix(in srgb,var(--bg) 60%,#fff);}
  td.num{font-family:var(--mono);font-size:.82rem;text-align:right;white-space:nowrap;}
  td.c{text-align:center;}

  .box{background:color-mix(in srgb,var(--accent2) 7%,#fff);border-left:4px solid var(--accent2);padding:.75rem 1.05rem;margin:1.1rem 0;border-radius:0 8px 8px 0;box-shadow:var(--shadow);}
  .box.warn{background:color-mix(in srgb,var(--danger) 7%,#fff);border-left-color:var(--danger);}
  .box.tip{background:color-mix(in srgb,var(--ok) 8%,#fff);border-left-color:var(--ok);}
  .box.story{background:color-mix(in srgb,var(--accent) 8%,#fff);border-left-color:var(--accent);}
  .box.money{background:color-mix(in srgb,var(--info) 8%,#fff);border-left-color:var(--info);}
  .box b{font-family:var(--serif);}

  .pill{display:inline-block;font-size:.7rem;font-weight:700;padding:.1rem .5rem;border-radius:999px;color:#fff;white-space:nowrap;}
  .pill.ok{background:var(--ok);} .pill.warn{background:var(--warn);} .pill.info{background:var(--info);}
  .pill.danger{background:var(--danger);} .pill.idle{background:var(--idle);}
  .legend{font-size:.78rem;color:var(--muted);margin:.4rem 0;display:flex;gap:.8rem;flex-wrap:wrap;align-items:center;}
  .legend .sw{display:inline-block;width:.8rem;height:.8rem;border-radius:3px;vertical-align:-1px;margin-right:.25rem;}
  .bd{display:inline-block;font-size:.66rem;font-weight:700;padding:.05rem .4rem;border-radius:999px;border:1px solid;margin-right:.2rem;white-space:nowrap;}
  .bd.f{color:var(--accent2);border-color:color-mix(in srgb,var(--accent2) 45%,#fff);background:color-mix(in srgb,var(--accent2) 10%,#fff);}
  .bd.m{color:#8a6d3b;border-color:#cda96a;background:color-mix(in srgb,#8a6d3b 10%,#fff);}
  .bd.fi{color:var(--info);border-color:color-mix(in srgb,var(--info) 45%,#fff);background:color-mix(in srgb,var(--info) 10%,#fff);}

  .card{background:var(--paper);border:1px solid var(--line);border-left:6px solid var(--accent);border-radius:10px;padding:.7rem 1.1rem;margin:.85rem 0;box-shadow:var(--shadow);transition:transform .14s,box-shadow .14s;}
  .card.g{border-left-color:var(--accent2);}
  .card.r{border-left-color:var(--danger);}
  .card.b{border-left-color:var(--info);}
  .card h3{margin:.1rem 0 .3rem;font-size:1.08rem;}
  .card:hover{transform:translateY(-2px);box-shadow:0 2px 4px rgba(50,36,12,.08),0 12px 28px -12px rgba(50,36,12,.3);}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin:1rem 0;}
  .grid .card{margin:0;}
  a.card{display:block;color:inherit;}
  a.card:hover{text-decoration:none;}
  a.card .more{font-size:.8rem;color:var(--accent);font-weight:600;}

  .town{background:var(--paper);border:1px solid var(--line);border-top:4px solid var(--accent);border-radius:12px;padding:.4rem 1.15rem 1rem;margin:1.1rem 0;box-shadow:var(--shadow);}
  .town.farm{border-top-color:var(--accent2);}
  .town.mine{border-top-color:#8a6d3b;}
  .town.fish{border-top-color:var(--info);}
  .town.cap{border-top-color:var(--danger);}
  .town h3{display:flex;flex-wrap:wrap;align-items:baseline;gap:.5rem;}
  .town h3 .tn{font-size:.72rem;font-weight:700;color:#fff;background:var(--accent);border-radius:999px;padding:.08rem .55rem;font-family:var(--sans);}
  .town.farm h3 .tn{background:var(--accent2);} .town.mine h3 .tn{background:#8a6d3b;}
  .town.fish h3 .tn{background:var(--info);} .town.cap h3 .tn{background:var(--danger);}
  .town dl{display:grid;grid-template-columns:max-content 1fr;gap:.2rem .9rem;margin:.6rem 0;font-size:.9rem;}
  .town dt{font-weight:700;color:var(--accent);font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;padding-top:.18rem;}
  .town.farm dt{color:var(--accent2);} .town.fish dt{color:var(--info);} .town.cap dt{color:var(--danger);}
  .town dd{margin:0;}

  ol.play{counter-reset:step;list-style:none;padding-left:0;margin:.8rem 0;}
  ol.play>li{position:relative;padding:.15rem 0 .8rem 2.6rem;margin:0;border-left:2px dashed var(--line);margin-left:.9rem;}
  ol.play>li:last-child{border-left:2px dashed transparent;}
  ol.play>li::before{counter-increment:step;content:counter(step);position:absolute;left:-.95rem;top:0;width:1.9rem;height:1.9rem;border-radius:50%;background:var(--accent);color:#fff;font:700 .9rem/1.9rem var(--serif);text-align:center;box-shadow:var(--shadow);}
  ol.play.g>li::before{background:var(--accent2);}

  .diagram{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:1.1rem;margin:1.1rem 0;overflow-x:auto;box-shadow:var(--shadow);}
  .diagram .cap{font-size:.8rem;color:var(--muted);margin:.2rem 0 .7rem;}
  .filterbar{display:flex;flex-wrap:wrap;gap:.35rem;margin:.6rem 0 .2rem;align-items:center;}
  .filterbar .lbl{font-size:.8rem;color:var(--muted);margin-right:.2rem;}
  .filterbar button{font:600 .8rem/1 var(--sans);padding:.34rem .65rem;border:1px solid var(--line);background:var(--paper);border-radius:7px;cursor:pointer;color:var(--ink);transition:background .14s,color .14s,border-color .14s;}
  .filterbar button:hover{border-color:var(--accent);color:var(--accent);}
  .filterbar button.on{background:var(--accent);color:#fff;border-color:var(--accent);}

  details{border:1px solid var(--line);border-radius:10px;padding:.2rem .9rem;margin:.85rem 0;background:var(--paper);box-shadow:var(--shadow);}
  details>summary{cursor:pointer;font:600 1.02rem/1.3 var(--serif);padding:.45rem 0;color:var(--ink);}

  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
  header.hero{animation:fadeUp .55s cubic-bezier(.21,.61,.35,1) both;}
  html.tabs-on main>.panel.active{animation:fadeUp .4s cubic-bezier(.21,.61,.35,1) both;}

  @media (max-width:820px){
    header.hero h1{font-size:2rem;}
    nav.tabs{gap:.2rem;}
    nav.tabs .tab{padding:.5rem .7rem;font-size:.88rem;}
    .town dl{grid-template-columns:1fr;gap:.05rem;}
    .town dt{padding-top:.5rem;}
  }
  @media (prefers-reduced-motion:reduce){ html{scroll-behavior:auto;} *{animation:none!important;transition:none!important;} .card:hover{transform:none;} }
  @media print{ nav.tabs,.filterbar,.docnav{display:none;} details{border:0;box-shadow:none;} a{color:inherit;} body{background:#fff;} header.hero,table,.box,.diagram,.card,.town,details{box-shadow:none;} html.tabs-on main>.panel{display:block!important;} }
`;

const SCRIPT = `
  (function(){
    var root=document.documentElement;
    var tabs=[].slice.call(document.querySelectorAll('nav.tabs .tab'));
    var panels=[].slice.call(document.querySelectorAll('main > .panel'));
    if(!tabs.length||!panels.length) return;
    root.classList.add('tabs-on');
    function resolve(id){
      for(var i=0;i<panels.length;i++){
        if(panels[i].id===id) return {panel:panels[i],section:null};
        var sec=id&&panels[i].querySelector('#'+(window.CSS&&CSS.escape?CSS.escape(id):id));
        if(sec) return {panel:panels[i],section:sec};
      }
      return null;
    }
    function activate(id,push,scrollToSection){
      var hit=resolve(id)||{panel:panels[0],section:null};
      panels.forEach(function(p){p.classList.toggle('active',p===hit.panel);});
      tabs.forEach(function(t){
        var on=t.getAttribute('data-tab')===hit.panel.id;
        t.classList.toggle('active',on); t.setAttribute('aria-selected',on?'true':'false');
      });
      if(scrollToSection&&hit.section) hit.section.scrollIntoView({block:'start'});
      else window.scrollTo(0,0);
      if(push){var h='#'+id; if(location.hash!==h) history.pushState(null,'',h);}
    }
    tabs.forEach(function(t){t.addEventListener('click',function(){activate(t.getAttribute('data-tab'),true,false);});});
    document.addEventListener('click',function(e){
      var a=e.target.closest('a[href^="#"]'); if(!a) return;
      var id=a.getAttribute('href').slice(1);
      if(resolve(id)){e.preventDefault(); activate(id,true,true);}
    });
    window.addEventListener('popstate',function(){activate((location.hash||'').slice(1),false,true);});
    activate((location.hash||'').slice(1),false,true);
  })();
  (function(){
    var bar=document.querySelector('.filterbar'); if(!bar) return;
    bar.addEventListener('click',function(e){
      var btn=e.target.closest('button'); if(!btn) return;
      bar.querySelectorAll('button').forEach(function(b){b.classList.remove('on');});
      btn.classList.add('on');
      var f=btn.dataset.filter;
      document.querySelectorAll('#status-table tbody tr').forEach(function(tr){
        tr.style.display=(f==='all'||tr.dataset.status===f)?'':'none';
      });
    });
  })();
`;

function docnav(current) {
  const links = NAV.map((n) => {
    const href = n.slug === "index" ? "index.html" : n.slug + ".html";
    const cls = n.slug === current ? ' class="here"' : "";
    return `<a href="${href}"${cls}>${n.label}</a>`;
  }).join("\n      ");
  return `  <nav class="docnav" aria-label="Game-design docs">\n      ${links}\n  </nav>`;
}

function tabsNav(tabs) {
  if (!tabs || !tabs.length) return "";
  const btns = tabs
    .map(
      (t) =>
        `    <button class="tab" role="tab" data-tab="${t.id}">${t.label}</button>`,
    )
    .join("\n");
  return `  <nav class="tabs" role="tablist" aria-label="Sections">\n${btns}\n  </nav>`;
}

function page({ slug, title, sub, desc, chips, tabs, body }) {
  const chipHtml = (chips || [])
    .map((c) => `<span class="chip">${c}</span>`)
    .join("\n      ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${desc}">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800;9..144,900&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="page">

  <header class="hero">
    <h1>${title}</h1>
    <p class="sub">${sub}</p>
    <div class="chips">
      ${chipHtml}
    </div>
  </header>

${docnav(slug)}

${tabsNav(tabs)}

  <main>
${body}
  </main>
</div>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

// ─── shared diagram fragments (reused verbatim from the original doc) ────────

const LOOP_SVG = `      <div class="diagram">
        <svg viewBox="0 0 900 300" width="100%" role="img" aria-label="Core loop: play the board, harvest, spend on growth, bigger yield, back to play.">
          <defs><marker id="a1" markerWidth="11" markerHeight="11" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 Z" fill="var(--accent)"/></marker></defs>
          <g font-family="IBM Plex Sans, sans-serif" font-size="13">
            <rect x="40" y="110" width="190" height="84" rx="12" fill="color-mix(in srgb,var(--accent2) 15%,#fff)" stroke="var(--accent2)"/>
            <text x="135" y="146" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="16" fill="var(--ink)">Play the board</text>
            <text x="135" y="168" text-anchor="middle" fill="var(--muted)">drag chains · merge tiles</text>
            <rect x="355" y="26" width="190" height="84" rx="12" fill="color-mix(in srgb,var(--accent) 14%,#fff)" stroke="var(--accent)"/>
            <text x="450" y="62" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="16" fill="var(--ink)">Harvest</text>
            <text x="450" y="84" text-anchor="middle" fill="var(--muted)">materials · coins · XP</text>
            <rect x="670" y="110" width="195" height="84" rx="12" fill="color-mix(in srgb,var(--accent) 14%,#fff)" stroke="var(--accent)"/>
            <text x="767" y="140" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="16" fill="var(--ink)">Spend on growth</text>
            <text x="767" y="161" text-anchor="middle" fill="var(--muted)">build · hire · upgrade</text>
            <text x="767" y="178" text-anchor="middle" fill="var(--muted)">raise the town</text>
            <rect x="355" y="194" width="190" height="84" rx="12" fill="color-mix(in srgb,var(--accent2) 15%,#fff)" stroke="var(--accent2)"/>
            <text x="450" y="230" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="16" fill="var(--ink)">Bigger yield</text>
            <text x="450" y="252" text-anchor="middle" fill="var(--muted)">board produces more</text>
            <path d="M230,135 C290,95 320,80 353,70" fill="none" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#a1)"/>
            <path d="M547,70 C590,80 620,95 668,130" fill="none" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#a1)"/>
            <path d="M765,194 C720,234 600,250 547,240" fill="none" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#a1)"/>
            <path d="M353,240 C300,250 250,232 175,196" fill="none" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#a1)"/>
            <text x="450" y="158" text-anchor="middle" fill="var(--muted)" font-style="italic" font-size="12">the loop compounds</text>
          </g>
        </svg>
        <p class="cap">The same four beats repeat in every town, at every scale — your first chain to your last monument.</p>
      </div>`;

const STACK_SVG = `      <div class="diagram">
        <svg viewBox="0 0 900 200" width="100%" role="img" aria-label="Farm feeds the mine which together feed the fishery.">
          <defs><marker id="sf" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="var(--accent)"/></marker></defs>
          <g font-family="IBM Plex Sans, sans-serif" font-size="12">
            <rect x="30" y="70" width="200" height="74" rx="12" fill="color-mix(in srgb,var(--accent2) 15%,#fff)" stroke="var(--accent2)"/>
            <text x="130" y="96" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="15" fill="var(--ink)">Farm</text>
            <text x="130" y="116" text-anchor="middle" fill="var(--muted)">free base · makes food</text>
            <text x="130" y="132" text-anchor="middle" fill="var(--muted)" font-size="10.5">always playable</text>
            <rect x="350" y="70" width="200" height="74" rx="12" fill="color-mix(in srgb,#8a6d3b 15%,#fff)" stroke="#8a6d3b"/>
            <text x="450" y="96" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="15" fill="var(--ink)">Mine</text>
            <text x="450" y="116" text-anchor="middle" fill="var(--muted)">food → expedition turns</text>
            <text x="450" y="132" text-anchor="middle" fill="var(--muted)" font-size="10.5">pays out ore &amp; metal</text>
            <rect x="670" y="70" width="200" height="74" rx="12" fill="color-mix(in srgb,var(--info) 13%,#fff)" stroke="var(--info)"/>
            <text x="770" y="96" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="15" fill="var(--ink)">Fishery</text>
            <text x="770" y="116" text-anchor="middle" fill="var(--muted)">food (bait) + metal (tackle)</text>
            <text x="770" y="132" text-anchor="middle" fill="var(--muted)" font-size="10.5">pays out the rare catch</text>
            <line x1="230" y1="100" x2="348" y2="100" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#sf)"/>
            <text x="289" y="92" text-anchor="middle" fill="var(--accent)" font-size="10.5">food</text>
            <line x1="550" y1="100" x2="668" y2="100" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#sf)"/>
            <text x="609" y="92" text-anchor="middle" fill="var(--accent)" font-size="10.5">metal</text>
            <path d="M130,144 C130,180 760,180 770,146" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#sf)"/>
            <text x="450" y="178" text-anchor="middle" fill="var(--accent2)" font-size="10.5" font-style="italic">farm food also feeds the fishery (bait)</text>
          </g>
        </svg>
        <p class="cap">The puzzles stack, and earlier boards never idle — later boards keep buying from them.</p>
      </div>`;

const WEB_SVG = `      <div class="diagram">
        <svg viewBox="0 0 1000 600" width="100%" role="img" aria-label="Hub-and-spoke economy map: faucets pour into a central pool; sinks drain from it; a flywheel arrow loops growth back to the board.">
          <defs>
            <marker id="fIn" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent2)"/></marker>
            <marker id="sOut" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)"/></marker>
            <marker id="fly" markerWidth="12" markerHeight="12" refX="7" refY="3.4" orient="auto"><path d="M0,0 L7,3.4 L0,6.8 Z" fill="var(--accent)"/></marker>
          </defs>
          <g font-family="IBM Plex Sans, sans-serif" font-size="11.5">
            <text x="128" y="40" text-anchor="middle" font-family="Fraunces, serif" font-weight="800" font-size="15" fill="var(--accent2)">FAUCETS · value in</text>
            <text x="500" y="40" text-anchor="middle" font-family="Fraunces, serif" font-weight="800" font-size="15" fill="var(--ink)">WHAT YOU HOLD</text>
            <text x="872" y="40" text-anchor="middle" font-family="Fraunces, serif" font-weight="800" font-size="15" fill="var(--accent)">SINKS · value out</text>
            <g>
              <rect x="22" y="64" width="212" height="44" rx="9" fill="color-mix(in srgb,var(--accent2) 20%,#fff)" stroke="var(--accent2)" stroke-width="1.6"/>
              <text x="128" y="83" text-anchor="middle" font-weight="800" fill="var(--ink)">Board production</text>
              <text x="128" y="99" text-anchor="middle" fill="var(--muted)">chaining — the engine</text>
              <rect x="22" y="118" width="212" height="38" rx="9" fill="color-mix(in srgb,var(--accent2) 12%,#fff)" stroke="var(--accent2)"/><text x="128" y="142" text-anchor="middle" fill="var(--ink)">Refining stations</text>
              <rect x="22" y="166" width="212" height="38" rx="9" fill="color-mix(in srgb,var(--accent2) 12%,#fff)" stroke="var(--accent2)"/><text x="128" y="190" text-anchor="middle" fill="var(--ink)">Houses → Villagers</text>
              <rect x="22" y="214" width="212" height="38" rx="9" fill="color-mix(in srgb,var(--accent2) 12%,#fff)" stroke="var(--accent2)"/><text x="128" y="238" text-anchor="middle" fill="var(--ink)">Timed depots (idle)</text>
              <rect x="22" y="262" width="212" height="38" rx="9" fill="color-mix(in srgb,var(--accent2) 12%,#fff)" stroke="var(--accent2)"/><text x="128" y="286" text-anchor="middle" fill="var(--ink)">Daily · civic tax</text>
              <rect x="22" y="310" width="212" height="38" rx="9" fill="color-mix(in srgb,var(--accent2) 12%,#fff)" stroke="var(--accent2)"/><text x="128" y="334" text-anchor="middle" fill="var(--ink)">Quests · achievements</text>
              <rect x="22" y="358" width="212" height="38" rx="9" fill="color-mix(in srgb,var(--accent2) 12%,#fff)" stroke="var(--accent2)"/><text x="128" y="382" text-anchor="middle" fill="var(--ink)">Boss / festival rewards</text>
              <rect x="22" y="406" width="212" height="38" rx="9" fill="color-mix(in srgb,var(--info) 14%,#fff)" stroke="var(--info)" stroke-dasharray="4 3"/><text x="128" y="430" text-anchor="middle" fill="var(--ink)">IAP (optional jump)</text>
            </g>
            <rect x="402" y="120" width="196" height="372" rx="14" fill="color-mix(in srgb,var(--idle) 10%,#fff)" stroke="var(--muted)" stroke-width="1.6"/>
            <rect x="420" y="146" width="160" height="40" rx="8" fill="#fff" stroke="var(--accent2)"/><text x="500" y="166" text-anchor="middle" font-weight="700" fill="var(--ink)">Materials</text><text x="500" y="180" text-anchor="middle" fill="var(--muted)" font-size="10">per-town · the main one</text>
            <rect x="420" y="194" width="160" height="36" rx="8" fill="#fff" stroke="var(--info)"/><text x="500" y="217" text-anchor="middle" font-weight="700" fill="var(--ink)">Coins <tspan fill="var(--muted)" font-weight="400" font-size="10">· cash layer</tspan></text>
            <rect x="420" y="238" width="160" height="36" rx="8" fill="#fff" stroke="var(--line)"/><text x="500" y="261" text-anchor="middle" font-weight="700" fill="var(--ink)">Villagers</text>
            <rect x="420" y="282" width="160" height="36" rx="8" fill="#fff" stroke="var(--line)"/><text x="500" y="305" text-anchor="middle" font-weight="700" fill="var(--ink)">Tools <tspan fill="var(--muted)" font-weight="400" font-size="10">· global</tspan></text>
            <rect x="420" y="326" width="160" height="44" rx="8" fill="#fff" stroke="var(--line)"/><text x="500" y="346" text-anchor="middle" font-weight="700" fill="var(--ink)">Meta</text><text x="500" y="361" text-anchor="middle" fill="var(--muted)" font-size="10">XP · runes · tokens</text>
            <text x="500" y="410" text-anchor="middle" fill="var(--muted)" font-style="italic" font-size="10.5">everything flows</text><text x="500" y="425" text-anchor="middle" fill="var(--muted)" font-style="italic" font-size="10.5">through the pool</text>
            <g>
              <rect x="766" y="64" width="212" height="40" rx="9" fill="color-mix(in srgb,var(--accent) 12%,#fff)" stroke="var(--accent)"/><text x="872" y="83" text-anchor="middle" fill="var(--ink)">Tile upgrades</text><text x="872" y="97" text-anchor="middle" fill="var(--muted)" font-size="10">(a chain)</text>
              <rect x="766" y="116" width="212" height="44" rx="9" fill="color-mix(in srgb,var(--accent) 22%,#fff)" stroke="var(--accent)" stroke-width="1.8"/><text x="872" y="135" text-anchor="middle" font-weight="800" fill="var(--ink)">Worker hires</text><text x="872" y="151" text-anchor="middle" fill="var(--danger)" font-size="10.5">◆ Villager + coins + mat</text>
              <rect x="766" y="172" width="212" height="40" rx="9" fill="color-mix(in srgb,var(--accent) 12%,#fff)" stroke="var(--accent)"/><text x="872" y="191" text-anchor="middle" fill="var(--ink)">Buildings → unlock tools</text><text x="872" y="205" text-anchor="middle" fill="var(--muted)" font-size="10">(materials)</text>
              <rect x="766" y="224" width="212" height="40" rx="9" fill="color-mix(in srgb,var(--info) 12%,#fff)" stroke="var(--info)"/><text x="872" y="243" text-anchor="middle" fill="var(--ink)">Town tiers · tile unlocks</text><text x="872" y="257" text-anchor="middle" fill="var(--muted)" font-size="10">(coins)</text>
              <rect x="766" y="276" width="212" height="40" rx="9" fill="color-mix(in srgb,var(--info) 12%,#fff)" stroke="var(--info)"/><text x="872" y="300" text-anchor="middle" fill="var(--ink)">Caravan founding (coins)</text>
              <rect x="766" y="328" width="212" height="40" rx="9" fill="color-mix(in srgb,var(--accent) 12%,#fff)" stroke="var(--accent)"/><text x="872" y="352" text-anchor="middle" fill="var(--ink)">Expedition rations</text>
              <rect x="766" y="380" width="212" height="40" rx="9" fill="color-mix(in srgb,var(--accent) 12%,#fff)" stroke="var(--accent)"/><text x="872" y="404" text-anchor="middle" fill="var(--ink)">Win-task baskets</text>
              <rect x="766" y="432" width="212" height="40" rx="9" fill="color-mix(in srgb,var(--accent) 12%,#fff)" stroke="var(--accent)"/><text x="872" y="456" text-anchor="middle" fill="var(--ink)">Crafting (tools, refines)</text>
            </g>
            <g stroke="var(--accent2)" stroke-width="1.3" opacity=".5" fill="none">
              <line x1="234" y1="86" x2="400" y2="166" marker-end="url(#fIn)"/><line x1="234" y1="137" x2="400" y2="180" marker-end="url(#fIn)"/>
              <line x1="234" y1="185" x2="400" y2="210" marker-end="url(#fIn)"/><line x1="234" y1="233" x2="400" y2="250" marker-end="url(#fIn)"/>
              <line x1="234" y1="281" x2="400" y2="290" marker-end="url(#fIn)"/><line x1="234" y1="329" x2="400" y2="330" marker-end="url(#fIn)"/>
              <line x1="234" y1="377" x2="400" y2="350" marker-end="url(#fIn)"/><line x1="234" y1="425" x2="400" y2="380" marker-end="url(#fIn)"/>
            </g>
            <g stroke="var(--accent)" stroke-width="1.3" opacity=".5" fill="none">
              <line x1="600" y1="166" x2="764" y2="84" marker-end="url(#sOut)"/><line x1="600" y1="185" x2="764" y2="138" marker-end="url(#sOut)"/>
              <line x1="600" y1="210" x2="764" y2="192" marker-end="url(#sOut)"/><line x1="600" y1="240" x2="764" y2="244" marker-end="url(#sOut)"/>
              <line x1="600" y1="280" x2="764" y2="296" marker-end="url(#sOut)"/><line x1="600" y1="320" x2="764" y2="348" marker-end="url(#sOut)"/>
              <line x1="600" y1="350" x2="764" y2="400" marker-end="url(#sOut)"/><line x1="600" y1="390" x2="764" y2="452" marker-end="url(#sOut)"/>
            </g>
            <path d="M872,116 C872,556 872,566 560,566 C300,566 120,566 120,460 L120,448" fill="none" stroke="var(--accent)" stroke-width="3" marker-end="url(#fly)" opacity=".92"/>
            <rect x="338" y="552" width="324" height="30" rx="8" fill="color-mix(in srgb,var(--accent) 14%,#fff)" stroke="var(--accent)"/>
            <text x="500" y="572" text-anchor="middle" font-weight="700" fill="var(--ink)" font-size="12">THE FLYWHEEL · growth → more board yield → repeat</text>
          </g>
        </svg>
        <p class="cap">Faucets (green) pour into what you hold; sinks (ochre = materials, blue = coins) drain it; the thick arc is the loop that matters.</p>
        <p class="legend">
          <span><span class="sw" style="background:var(--accent2)"></span>faucet</span>
          <span><span class="sw" style="background:var(--accent)"></span>materials sink</span>
          <span><span class="sw" style="background:var(--info)"></span>coin sink</span>
          <span><span class="sw" style="background:var(--idle)"></span>what you hold</span>
        </p>
      </div>`;

const ARC_SVG = `      <div class="diagram">
        <svg viewBox="0 0 1000 320" width="100%" role="img" aria-label="Seven towns left to right, growing in size, founded by caravan; board stacks grow; town 6 is the mine-only exception; town 7 is the finale.">
          <defs><marker id="tw" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="var(--muted)"/></marker></defs>
          <g font-family="IBM Plex Sans, sans-serif" font-size="10.5">
            <rect x="14" y="202" width="120" height="70" rx="9" fill="color-mix(in srgb,var(--accent2) 16%,#fff)" stroke="var(--accent2)"/>
            <text x="74" y="222" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="12" fill="var(--ink)">1 Hearthwood</text>
            <text x="74" y="238" text-anchor="middle" fill="var(--accent2)" font-weight="700">Farm</text>
            <text x="74" y="253" text-anchor="middle" fill="var(--muted)">win: caravan</text>
            <text x="74" y="266" text-anchor="middle" fill="var(--muted)" font-size="9.5">~6 plots</text>
            <rect x="154" y="186" width="120" height="86" rx="9" fill="color-mix(in srgb,#8a6d3b 16%,#fff)" stroke="#8a6d3b"/>
            <text x="214" y="206" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="12" fill="var(--ink)">2 Two Rivers</text>
            <text x="214" y="222" text-anchor="middle" fill="#8a6d3b" font-weight="700">Farm+Mine</text>
            <text x="214" y="237" text-anchor="middle" fill="var(--muted)">win: grand order</text>
            <text x="214" y="250" text-anchor="middle" fill="var(--muted)" font-size="9.5">no hazards · ~10</text>
            <rect x="294" y="170" width="120" height="102" rx="9" fill="color-mix(in srgb,#8a6d3b 16%,#fff)" stroke="#8a6d3b"/>
            <text x="354" y="190" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="12" fill="var(--ink)">3 Cracked Quarry</text>
            <text x="354" y="206" text-anchor="middle" fill="#8a6d3b" font-weight="700">Farm+Mine</text>
            <text x="354" y="221" text-anchor="middle" fill="var(--muted)">win: boss</text>
            <text x="354" y="234" text-anchor="middle" fill="var(--danger)" font-size="9.5">cave hazards · ~13</text>
            <rect x="434" y="154" width="120" height="118" rx="9" fill="color-mix(in srgb,var(--info) 13%,#fff)" stroke="var(--info)"/>
            <text x="494" y="174" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="12" fill="var(--ink)">4 Saltspray</text>
            <text x="494" y="190" text-anchor="middle" fill="var(--info)" font-weight="700">+Fish</text>
            <text x="494" y="205" text-anchor="middle" fill="var(--muted)">win: regatta</text>
            <text x="494" y="218" text-anchor="middle" fill="var(--muted)" font-size="9.5">tides · ~15</text>
            <rect x="574" y="138" width="120" height="134" rx="9" fill="color-mix(in srgb,var(--accent2) 16%,#fff)" stroke="var(--accent2)"/>
            <text x="634" y="158" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="12" fill="var(--ink)">5 Greenmeadow</text>
            <text x="634" y="174" text-anchor="middle" fill="#8a6d3b" font-weight="700">Farm+Mine</text>
            <text x="634" y="189" text-anchor="middle" fill="var(--muted)">win: great build</text>
            <text x="634" y="202" text-anchor="middle" fill="var(--danger)" font-size="9.5">rats · ~17</text>
            <rect x="714" y="122" width="120" height="150" rx="9" fill="color-mix(in srgb,#8a6d3b 16%,#fff)" stroke="#8a6d3b"/>
            <text x="774" y="142" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="12" fill="var(--ink)">6 Deepdelve</text>
            <text x="774" y="158" text-anchor="middle" fill="#8a6d3b" font-weight="700">Mine only</text>
            <text x="774" y="173" text-anchor="middle" fill="var(--muted)">win: shipment</text>
            <text x="774" y="186" text-anchor="middle" fill="var(--danger)" font-size="9.5">no farm · ~16</text>
            <rect x="854" y="104" width="132" height="168" rx="9" fill="color-mix(in srgb,var(--danger) 12%,#fff)" stroke="var(--danger)"/>
            <text x="920" y="126" text-anchor="middle" font-weight="800" font-family="Fraunces, serif" font-size="12" fill="var(--ink)">7 Old Capital</text>
            <text x="920" y="142" text-anchor="middle" fill="var(--danger)" font-weight="700">all boards</text>
            <text x="920" y="157" text-anchor="middle" fill="var(--muted)">win: monument</text>
            <text x="920" y="170" text-anchor="middle" fill="var(--muted)" font-size="9.5">needs all 6 · biggest</text>
            <g stroke="var(--muted)" stroke-width="2" fill="none">
              <line x1="134" y1="232" x2="152" y2="226" marker-end="url(#tw)"/>
              <line x1="274" y1="216" x2="292" y2="210" marker-end="url(#tw)"/>
              <line x1="414" y1="200" x2="432" y2="194" marker-end="url(#tw)"/>
              <line x1="554" y1="184" x2="572" y2="178" marker-end="url(#tw)"/>
              <line x1="694" y1="168" x2="712" y2="162" marker-end="url(#tw)"/>
              <line x1="834" y1="152" x2="852" y2="146" marker-end="url(#tw)"/>
            </g>
            <text x="500" y="298" text-anchor="middle" fill="var(--muted)" font-size="10.5" font-style="italic">the frontier the map suggests as difficulty ramps — open any reachable site, develop several at once · all required for the finale</text>
          </g>
        </svg>
        <p class="cap">Sizes are the design target. Plot counts and costs are tuned in the Balance Profile and the playtest harness.</p>
      </div>`;

// ─── 1. OVERVIEW (index.html) — single scroll, the read-first hub ───────────

const overview = `  <main>
    <section id="what">
      <h2>What the game is</h2>
      <p class="lead">puzzleDrag2 is a cozy <b>match-merge farming &amp; settlement</b> game. On a small board you <b>drag chains of matching tiles</b>; each chain harvests resources <em>and</em> merges tiles into better ones. You spend what you grow to build up a settlement — and you outfit a <b>caravan</b> to roll out and found new towns across the map, <b>opening and developing several at your own pace</b>. Each town stacks a new board on the last and grows bigger and harder, but the heart never changes: <b>drag, harvest, grow, complete, move on.</b></p>
      <div class="box story"><b>The fantasy.</b> You arrive at a cold hearth in a forgotten vale and someone hands you the tongs. You re-light the farm, build a caravan, and head out across the map to found new towns — a mining valley, a hazard-ridden quarry, a harbor, a rat-plagued meadow, a deep dark delve — until you raise the Old Capital and wake the kingdom.</div>
    </section>

    <section id="loop">
      <h2>The core loop</h2>
      <p>Everything is one compounding loop: <b>play the board</b> to <b>harvest</b>; <b>spend the harvest on growth</b>; growth makes the board <b>produce more</b>; the next round is bigger. Every system in this set either feeds that flywheel or is fed by it.</p>
${LOOP_SVG}
    </section>

    <section id="stack">
      <h2>Boards build on each other</h2>
      <p>The backbone — and what keeps it from being "the same board over and over": <b>a new board type is always <em>fed by</em> the boards before it.</b> The farm makes food; food buys mine expeditions; farm food (bait) plus mine metal (tackle) fund the fishery. So every town with a mine also has a farm, and every fishery town has a farm and a mine. The one deliberate exception is <b>Deepdelve</b> — a mine with no farm; see <a href="towns.html#deepdelve">The seven towns</a>.</p>
${STACK_SVG}
    </section>

    <section id="shape">
      <h2>The shape of a session &amp; the long arc</h2>
      <p><b>A session</b> is one visit to a board: a small budget of <b>turns</b> (~10), each chain spends one, whatever you harvest banks into <em>that town's</em> stockpile, and the visit ends when turns run out. <b>Each town is a long project</b>, not a handful of sessions — finishing one takes real effort. But it is <b>effort-gated, not time-gated</b>: you are never stuck waiting on a clock. The time between sessions hands you <b>free tools</b> (timed depots, daily, civic) to go faster — or, if you would rather not wait, you <b>craft those tools now by spending extra materials</b>.</p>
      <p><b>The long arc</b> is a <b>map of seven towns</b>, all required for the finale but openable in any order the map allows. You found each by caravan, build it up, and beat its signature task — but you need not finish one before opening the next: <b>several towns can be in progress at once and you switch between them freely</b>. Difficulty is <b>cozy early, ramping late</b>: the early sites are forgiving, and the rising founding cost plus the map's outward-expanding reach keep the harder, farther sites for later — a cozy unfurling, not a forced order. <b>Workers, coins, tools and Villagers travel with you</b>; each town's materials are its own.</p>
    </section>

    <section id="map">
      <h2>The rest of the set</h2>
      <p>This overview is the pitch and the map. The focused docs below each carry one part of the design, so each can be read — and discussed — on its own.</p>
      <div class="grid">
        <a class="card" href="systems.html"><h3>Systems &amp; economy</h3><p>The board &amp; chain, the two chain knobs, the three currencies, the faucets↔sinks map, workers &amp; hiring, tools, expeditions &amp; hazards.</p><span class="more">Open →</span></a>
        <a class="card g" href="towns.html"><h3>The seven towns</h3><p>Founding by caravan, the full required path, each town's crux, win task &amp; signature building, and cross-zone exports.</p><span class="more">Open →</span></a>
        <a class="card" href="buildings.html"><h3>Buildings &amp; tools</h3><p>The common / specialized / pick roster, the building→tool unlock, and the slot tension &amp; removal rules.</p><span class="more">Open →</span></a>
        <a class="card b" href="meta-money.html"><h3>Meta &amp; money</h3><p>The always-on systems that wrap the loop — story, quests, daily, civic, bosses — and the free-to-play monetization model.</p><span class="more">Open →</span></a>
        <a class="card r" href="status.html"><h3>Build status</h3><p>What is built, half-wired, or still to build, plus the open numbers. The one place implementation status lives.</p><span class="more">Open →</span></a>
      </div>
      <div class="box"><b>Where the numbers live.</b> This set states design <em>decisions</em>. Hard numbers — turn budgets, costs, exchange rates, plot counts — live in the <a href="../balance/index.html">Balance Profile</a>, the code (<code>src/constants.ts</code>), and the playtest harness, so they cannot drift from a prose copy.</div>
    </section>
  </main>`;

// ─── 2. SYSTEMS & ECONOMY (systems.html) — tabbed ───────────────────────────

const systemsTabs = [
  { id: "board", label: "The board" },
  { id: "currencies", label: "Currencies" },
  { id: "flow", label: "The flow" },
  { id: "workers", label: "Workers &amp; tools" },
  { id: "provision", label: "Provisioning" },
];

const systems = `  <div class="panel" id="board" role="tabpanel" aria-label="The board">
    <section id="chain">
      <h2>The board &amp; the chain</h2>
      <p>The board is a <b>6×6 grid</b> of tiles from a few <b>families</b>. You play by <b>dragging through a run of touching, same-family tiles</b> — three or more, in any of 8 directions, no reuse. Release and the chain resolves; the board collapses and refills; one turn is spent.</p>
      <div class="box"><b>Every chain does two things at once</b> — the core decision of the game:
        <ul style="margin:.4rem 0 0;">
          <li><b>It harvests</b> — a chain of <code>N</code> tiles banks <code>floor(N ÷ divisor)</code> of that material. Longer chain → more goods.</li>
          <li><b>It merges</b> — a long-enough chain promotes a tile up its ladder (grass→bird, grain→vegetable…). Longer chain → a better board.</li>
        </ul>
        You cannot max both at once. Reading the board for the best chain <em>is</em> the puzzle.</div>
    </section>
    <section id="knobs">
      <h2>The two chain knobs</h2>
      <p>Every chain is read by two independent length gates, and that is where the long-game optimization lives:</p>
      <table>
        <thead><tr><th>Knob</th><th>What it controls</th><th>Starts</th><th>Bought down by</th><th>Floor</th></tr></thead>
        <tbody>
          <tr><td><b>Yield divisor</b></td><td>tiles needed per 1 unit of material</td><td>high (stingy)</td><td>workers</td><td class="num">~3</td></tr>
          <tr><td><b>Upgrade threshold</b></td><td>tiles needed to promote a tile a tier</td><td>high</td><td>workers</td><td class="num">~3</td></tr>
        </tbody>
      </table>
      <p>Both start high and <b>workers buy them down toward a floor</b> (see <a href="#workers">Workers &amp; tools</a>). Cheap staples (grass, grain) hit the floor with a few hires; premium lines (flowers, gems, gold) start far higher and need many workers and time — so the accelerator is real but self-limiting. This is the depth knob behind the whole production curve, and the design keeps that depth rather than flattening it.</p>
    </section>
    <section id="tiles">
      <h2>Researching new tiles</h2>
      <p>The board's vocabulary grows over the run: you <b>research, buy, or earn new tile types</b>, each with its own <b>unique ability</b> (a special yield, a chain effect, a hazard-clearer, a wildcard). They arrive from a <b>research track</b> (materials + time), the <b>coin "unlock a tile" sink</b>, or <b>rewards</b> (achievements, win-tasks, boss/festival drops). An unlock is <b>permanent and global</b>, so your kit of board pieces deepens alongside your buildings and tools — a third axis of identity. New tiles keep the 6×6 puzzle fresh as the towns stack and give coins and materials a meaningful, non-grindy, one-time sink.</p>
    </section>
  </div>

  <div class="panel" id="currencies" role="tabpanel" aria-label="Currencies">
    <section id="three">
      <h2>Three currencies, deliberately unequal</h2>
      <p class="lead">The economy runs on three currencies that are <b>not</b> interchangeable — so your farming stays targeted, rather than earning a catch-all that buys anything. Materials and coins bridge only through a costly Market; Villagers come only from Houses.</p>
      <div class="grid">
        <div class="card g"><h3>Materials — the main currency</h3><p>Per-town, board-grown (crops, ore, fish and their refined goods). They pay for <b>buildings, win-tasks, expedition rations, and refining.</b> They do not travel between towns, so each town's farming is purposeful — there is no super-currency that buys everything.</p></div>
        <div class="card b"><h3>Coins — the cash layer</h3><p>The money economy: <b>worker wages, town-tier upgrades, tile unlocks, caravan founding,</b> and the <b>Market</b>. Earned by selling surplus at the Market, plus quests, daily, civic and bosses. Because coins are global and portable, they are what funds <a href="towns.html#founding">opening a new town</a> — so founding never depends on a town's own materials. Coins travel with you.</p></div>
        <div class="card"><h3>Villagers — the worker currency</h3><p>Your population, <b>produced by Houses</b>. Spent (with coins and materials) to hire workers — see <a href="#workers">Workers &amp; tools</a>. A constrained, valuable resource, and the one optional-IAP lever (see <a href="meta-money.html#money">Meta &amp; money</a>).</p></div>
        <div class="card b"><h3>The Market — the coin ↔ material bridge</h3><p><b>Sell surplus → coins</b> (an outlet for overflow and lopsided builds) and <b>buy materials → coins</b>, priced <b>deliberately high</b> so coins never cheaply replace farming. The escape hatch that lets you run a specialized build and just buy what you chose to skip — a release valve, not a bypass.</p></div>
      </div>
      <div class="box"><b>Why the split.</b> Materials are what you grow and spend to build; coins are the cash for wages, unlocks and flexibility; Villagers are population. Keeping them separate, with the Market bridge priced high, is what makes progression feel like an accomplishment rather than a wallet check.</div>
    </section>
  </div>

  <div class="panel" id="flow" role="tabpanel" aria-label="The flow">
    <section id="web">
      <h2>The faucets ↔ sinks map</h2>
      <p>Every faucet pours into a shared pool of what you hold; every sink drains it; the loop that matters is the flywheel arc — growth buying more board yield.</p>
${WEB_SVG}
    </section>
    <section id="loops">
      <h2>The three loops that matter</h2>
      <div class="grid">
        <div class="card g"><h3>1 · Reinvestment (flywheel)</h3><p>Board → materials → <b>tile upgrades + workers</b> → the board yields more. The engine; it compounds. Steeper worker baskets plus the chain-knob floors keep it from trivialising itself.</p></div>
        <div class="card g"><h3>2 · Growth</h3><p>Materials → <b>buildings (+ Houses for Villagers)</b> → more plots, new tools, new families. How a town gets wider — and where the build-choice strategy lives (see <a href="buildings.html">Buildings &amp; tools</a>).</p></div>
        <div class="card"><h3>3 · Provisioning</h3><p>Food → <b>expedition turns</b> → ore/fish → refine → build. In Deepdelve, timed depots and shipping replace the farm under scarcity (see <a href="#provision">Provisioning</a>).</p></div>
      </div>
    </section>
  </div>

  <div class="panel" id="workers" role="tabpanel" aria-label="Workers and tools">
    <section id="hiring">
      <h2>Workers, Villagers &amp; hiring</h2>
      <p>Workers are the multiplier: each hire <b>permanently buys down the chain knobs</b> (see <a href="#knobs">The two chain knobs</a>) or adds an ability. They are <b>global</b> — they follow you to every town. Hiring is gated two ways:</p>
      <div class="grid">
        <div class="card g"><h3>Houses produce Villagers</h3><p>Your population is a global pool, raised by building <b>Houses</b>. Your worker count is capped by how many Houses you have raised — population gates <em>how many</em>.</p></div>
        <div class="card"><h3>A hire costs Villager + coins + materials</h3><p>Each hire spends a <b>Villager</b> (from your Houses), <b>coins</b> (wages) <b>and materials</b>, with the <b>material cost scaling per profession</b>: the more workers already in a line (miners, farmers…), the costlier the next. Over-stacking one profession self-limits — late workers are a real investment.</p></div>
      </div>
      <div class="box"><b>One home for this rule.</b> Houses competing for building slots, and the rule for removing a House, are part of the build-choice strategy and live in <a href="buildings.html#houses">Buildings &amp; tools</a>.</div>
    </section>
    <section id="tools">
      <h2>Tools &amp; the building → tool unlock</h2>
      <p><b>Tools</b> are board powers you craft and spend — clear a tile, shuffle, drop a bomb, find ore, clear a hazard. Your <b>tool inventory is global</b>: one kit across every town. The design ties tools to buildings — <b>building a building unlocks its tool, globally, to be crafted</b>, and a few buildings <b>generate</b> a tool on a timer. So your town layout decides your kit. The full building→tool map is in <a href="buildings.html#roster">Buildings &amp; tools</a>.</p>
    </section>
  </div>

  <div class="panel" id="provision" role="tabpanel" aria-label="Provisioning">
    <section id="expeditions">
      <h2>Expeditions, hazards &amp; timed supply</h2>
      <p><b>Expedition boards</b> (mine, fishery) make you <b>pack what an earlier board produced to buy turns</b>: spend farm food (and, for the fishery, mine metal) to depart, play till it runs out, and <b>keep everything you gathered</b> (a soft fail, never a wipe). That exchange rate is the single biggest pacing dial in the game.</p>
      <p><b>Hazards</b> arrive gradually, matching the cozy-to-ramp difficulty: none in the first two towns, then cave-ins, gas and moles, then tides, rats, and combinations — they eat tiles or block you and force a response.</p>
      <div class="box"><b>Timed generation is a helper, never a gate.</b> Some buildings <b>generate a small, capped batch every few hours</b> — supplies or a tool — the free way to speed up between sessions. Nothing is time-locked: if you do not want to wait, <b>craft the same tool now by spending materials</b>. It is the spine of the farm-less Deepdelve (its Supply Depot) and a gentle boost everywhere else.</p></div>
    </section>
  </div>`;

// ─── 3. THE SEVEN TOWNS (towns.html) — tabbed ───────────────────────────────

const townsTabs = [
  { id: "path", label: "The path" },
  { id: "early", label: "Towns 1–2" },
  { id: "late", label: "Towns 3–7" },
];

const towns = `  <div class="panel" id="path" role="tabpanel" aria-label="The path">
    <section id="founding">
      <h2>Founding by caravan</h2>
      <p>You open a new town by <b>outfitting a caravan</b> and rolling it out to a site on the map. The caravan is paid in <b>coins — the global cash layer</b>, never a town's own materials, so founding can never depend on a place you have not opened yet. (The <b>Caravan Yard</b> you raise in Town 1 makes every later founding cheaper.)</p>
      <p>Founding is <b>non-linear</b>, gated only by <b>reach and coins</b>. You can open any site the map lets you reach — one adjacent to a town you have already settled — as soon as you can afford it; you do <b>not</b> have to finish the town you are in first. Several towns can be <b>in progress at once</b>, and you <b>switch between them freely</b>; if a town is not grabbing you, leave it and develop another, then come back. The coin cost <b>rises with each town you open</b>, and the map's reach <b>expands outward</b> from where you have settled — so the harder, farther sites naturally come later. The order is a cozy unfurling, never a forced sequence. Home is where you start, auto-founded for free; every town after is caravan-founded.</p>
    </section>
    <section id="arc">
      <h2>The seven-town map</h2>
      <p class="lead">Seven towns, <b>all required for the finale</b> but openable in any order the map allows. Every town adds at most one new board (<span class="bd f">Farm</span> → <span class="bd m">Mine</span> → <span class="bd fi">Fish</span>), one <b>crux</b>, one <b>win task</b> (varied — not always a boss), and a <b>thematic signature building</b>. The left-to-right ordering below is the frontier the map <em>suggests</em> as difficulty ramps — not a forced sequence.</p>
${ARC_SVG}
      <table>
        <thead><tr><th>#</th><th>Town</th><th>Boards</th><th>Slots</th><th>Unique hook</th><th>Crux</th><th>Win task</th><th>Signature building</th></tr></thead>
        <tbody>
          <tr><td class="c">1</td><td><b>Hearthwood</b></td><td><span class="bd f">F</span></td><td class="num">~6</td><td>gentle (teacher)</td><td>learn the loop</td><td>build the Caravan</td><td>Caravan Yard</td></tr>
          <tr><td class="c">2</td><td><b>Two Rivers</b></td><td><span class="bd f">F</span><span class="bd m">M</span></td><td class="num">~10</td><td>none (calm)</td><td>farm→mine link</td><td>fill a grand order</td><td>Quartermaster's Hall</td></tr>
          <tr><td class="c">3</td><td><b>Cracked Quarry</b></td><td><span class="bd f">F</span><span class="bd m">M</span></td><td class="num">~13</td><td>cave hazards</td><td>mine hazard mgmt</td><td>capstone boss</td><td>Pit Canteen</td></tr>
          <tr><td class="c">4</td><td><b>Saltspray</b></td><td><span class="bd f">F</span><span class="bd m">M</span><span class="bd fi">Fi</span></td><td class="num">~15</td><td>tides</td><td>the full stack</td><td>the Regatta</td><td>Bait Shack</td></tr>
          <tr><td class="c">5</td><td><b>Greenmeadow</b></td><td><span class="bd f">F</span><span class="bd m">M</span></td><td class="num">~17</td><td>rats</td><td>farm hazard at scale</td><td>raise a great building</td><td>Cattery</td></tr>
          <tr><td class="c">6</td><td><b>Deepdelve</b></td><td><span class="bd m">M</span></td><td class="num">~16</td><td>no farm — supply</td><td>provision under scarcity</td><td>fill the great shipment</td><td>Supply Depot</td></tr>
          <tr><td class="c">7</td><td><b>Old Capital</b></td><td><span class="bd f">F</span><span class="bd m">M</span><span class="bd fi">Fi</span></td><td class="num">biggest</td><td>everything</td><td>the capstone</td><td>build the Monument</td></tr>
        </tbody>
      </table>
      <div class="box tip"><b>Unlock order is strategy.</b> Each town's signature building, once that town is <b>complete</b>, can be raised in your other towns for a cross-zone bonus — a Pit Canteen adds +2 ration-turns in any mine; a Supply Depot adds an idle drip anywhere. So choosing which town to finish first is a real decision, not just a sequence. The full export roster is in <a href="buildings.html#specialized">Buildings &amp; tools</a>.</div>
    </section>
  </div>

  <div class="panel" id="early" role="tabpanel" aria-label="Towns 1 and 2">
    <section id="t1">
      <div class="town farm">
        <h3><span class="tn">Town 1</span> Hearthwood Vale — the farm</h3>
        <dl>
          <dt>Boards</dt><dd><span class="bd f">Farm</span> only — the free base board.</dd>
          <dt>Crux</dt><dd>The tutorial hub. Teaches every verb — chain, refine, fill orders, raise a House and hire a worker, tier up — with no pressure. Your home forever.</dd>
          <dt>Hook</dt><dd>None by design: the gentle teacher.</dd>
          <dt>Size</dt><dd><b>~6 slots</b> — so you already feel the build choice: Mill / Bakery / Kitchen / Granary fill most of it; one or two left for a House or a yield building.</dd>
          <dt>Win task</dt><dd><b>Build your first caravan</b> (at the Caravan Yard) — this opens the map, so you can roll out and found any reachable site. The win is the bridge onward.</dd>
        </dl>
        <ol class="play">
          <li><b>First chains.</b> Drag 3+ touching tiles; each banks crops and, if long, merges a tile up a tier.</li>
          <li><b>Refine.</b> Grain → Mill → flour → Bakery → <b>bread</b>; Field Kitchen turns grain into rations; Granary stores it.</li>
          <li><b>People &amp; workers.</b> Raise a <b>House</b> for Villagers, then hire your first <b>worker</b> (see <a href="systems.html#hiring">hiring</a>).</li>
          <li><b>Build the caravan.</b> Save up the coins, outfit your caravan at the Caravan Yard, and roll out to your first new site (Two Rivers sits just over the ridge).</li>
        </ol>
      </div>
    </section>
    <section id="t2">
      <div class="town mine">
        <h3><span class="tn">Town 2</span> Two Rivers — the connection</h3>
        <dl>
          <dt>Boards</dt><dd><span class="bd f">Farm</span> <span class="bd m">Mine</span> — the first stacked town, one shared stockpile.</dd>
          <dt>Crux</dt><dd>The whole point: <b>the farm feeds the mine.</b> A calm valley where farm food first buys mine expeditions; the mine pays out ore; ore refines into metal. No hazards — just learn the link.</dd>
          <dt>Hook</dt><dd><b>None — no hazards.</b> The safe town where the supply chain clicks.</dd>
          <dt>Size</dt><dd>~10 slots.</dd>
          <dt>Win task</dt><dd><b>Fill a grand order</b> — a shipment needing both bread and iron, proving you can run both boards. Its signature <b>Quartermaster's Hall</b> exports better food→ration packing to later mines.</dd>
        </dl>
        <ol class="play g">
          <li><b>Found &amp; bootstrap.</b> Caravan in; workers, tools and Villagers came with you, materials start empty.</li>
          <li><b>Run the farm board.</b> Free turns: chain grain, build the Field Kitchen, make rations.</li>
          <li><b>Open the mine.</b> Spend rations to depart; chain stone and iron; keep everything mined when food runs out.</li>
          <li><b>Refine &amp; connect.</b> Smelter ore → metal; watch the farm refill the pantry while the mine empties it.</li>
          <li><b>Fill the grand order.</b> Assemble bread + iron, complete it, build the caravan, roll on.</li>
        </ol>
      </div>
    </section>
  </div>

  <div class="panel" id="late" role="tabpanel" aria-label="Towns 3 to 7">
    <section id="t3plus">
      <h2>Towns 3–7 — the full required path</h2>
      <div class="town mine">
        <h3><span class="tn">Town 3</span> Cracked Quarry — hazards arrive</h3>
        <dl>
          <dt>Boards</dt><dd><span class="bd f">Farm</span> <span class="bd m">Mine</span> — same stack, now dangerous.</dd>
          <dt>Crux</dt><dd>The farm→mine loop under pressure: <b>cave-ins, gas, moles</b> eat tiles and force efficient chains plus hazard tools (the Powderworks' bombs).</dd>
          <dt>Win task</dt><dd><b>Defeat the capstone boss</b> (e.g. Old Stoneface). Signature <b>Pit Canteen</b> (+2 ration-turns underground) exports to any mine — a prime build-order pick.</dd>
        </dl>
      </div>
      <div class="town fish">
        <h3><span class="tn">Town 4</span> Saltspray Harbor — the fishery</h3>
        <dl>
          <dt>Boards</dt><dd><span class="bd f">Farm</span> <span class="bd m">Mine</span> <span class="bd fi">Fish</span> — the full stack: fishing needs farm bait + mine tackle.</dd>
          <dt>Crux</dt><dd>The supply chain at full depth; tides shift the board.</dd>
          <dt>Win task</dt><dd><b>The Regatta</b> — a festival (cured-fish haul + a built Wharf), not a fight. Signature <b>Bait Shack</b> exports +fishing.</dd>
        </dl>
      </div>
      <div class="town farm">
        <h3><span class="tn">Town 5</span> Greenmeadow — the rich farm &amp; the rats</h3>
        <dl>
          <dt>Boards</dt><dd><span class="bd f">Farm</span> <span class="bd m">Mine</span> — a deep farm with its own mine.</dd>
          <dt>Crux</dt><dd>Abundance is the threat: as the stockpile climbs, <b>rats</b> eat adjacent crops — farm-side hazard management while you still run the mine.</dd>
          <dt>Win task</dt><dd><b>Raise a great building</b> (Cathedral / Great Granary) on a deep basket while keeping rats down. Signature <b>Cattery</b> exports rat protection (a Cat tool) to any farm.</dd>
        </dl>
      </div>
      <div class="town mine" id="deepdelve">
        <h3><span class="tn">Town 6</span> Deepdelve — the mine with no farm</h3>
        <dl>
          <dt>Boards</dt><dd><span class="bd m">Mine</span> only — breaks the stacking rule on purpose.</dd>
          <dt>Crux</dt><dd>The planning town. No farm, so you ration a scarce, capped supply income: <b>Supply Depots</b> drip rations every few hours, and you <b>ship</b> baskets in by caravan from your farm towns. Sequencing, not grinding.</dd>
          <dt>Win task</dt><dd><b>Fill the great shipment</b> under that scarcity. Signature <b>Supply Depot</b> exports the idle drip everywhere — the most coveted cross-zone unlock.</dd>
        </dl>
      </div>
      <div class="town cap">
        <h3><span class="tn">Town 7</span> The Old Capital — the finale</h3>
        <dl>
          <dt>Boards</dt><dd><span class="bd f">Farm</span> <span class="bd m">Mine</span> <span class="bd fi">Fish</span> — everything, largest scale.</dd>
          <dt>Crux</dt><dd>The capstone. <b>Requires all six prior towns complete</b>; brings the whole toolkit plus every exported building to bear.</dd>
          <dt>Win task</dt><dd><b>Build the grand Monument</b> — the longest basket in the game. Finishing it wins the run.</dd>
        </dl>
      </div>
      <div class="box"><b>Varied win tasks.</b> Caravan-build, grand order, boss, regatta, great building, great shipment, monument — completion never feels rote, and the finale is gated on all six prior towns.</div>
    </section>
  </div>`;

// ─── 4. BUILDINGS & TOOLS (buildings.html) — tabbed ─────────────────────────

const buildingsTabs = [
  { id: "model", label: "The model" },
  { id: "roster", label: "The roster" },
];

const buildings = `  <div class="panel" id="model" role="tabpanel" aria-label="The model">
    <section id="kinds">
      <h2>Common, specialized &amp; clear-named</h2>
      <p class="lead">Two kinds of buildings, and every name says what it does:</p>
      <ul>
        <li><b>Common</b> — the board's core chain (Mill, Bakery, Smelter, Wharf…), available in any town with that board. These are the must-builds.</li>
        <li><b>Specialized</b> — one thematic signature per town, tied to its core idea. Once that town is <b>complete</b>, its signature can be raised in your other towns for a cross-zone bonus — so unlock order is strategy (see <a href="towns.html#arc">The seven towns</a>).</li>
      </ul>
    </section>
    <section id="slots">
      <h2>Slots &lt; buildings — the build choice</h2>
      <p>After the core chain, only a few discretionary slots remain — and <b>Houses compete for them too</b> (more Villagers vs. more abilities). The gap <b>widens as towns grow</b>: slots lag the building menu, so later towns force harder, sharper specialization. Because a building unlocks its tool globally and permanently (see <a href="systems.html#tools">Tools</a>), the choice is about pacing and per-town identity, not permanent loss.</p>
    </section>
    <section id="houses">
      <h2>Houses &amp; removal</h2>
      <div class="grid">
        <div class="card g"><h3>Houses → Villagers</h3><p>Each House produces <b>Villagers</b>, the global worker-currency pool. How hiring spends them lives in <a href="systems.html#hiring">Systems → hiring</a>; here, a House simply costs a slot.</p></div>
        <div class="card"><h3>The slot tension</h3><p>A House competes with ability and yield buildings: a wide worker base, or rich abilities? A real per-town call.</p></div>
        <div class="card r"><h3>Removal rule</h3><p>Tear down <b>discretionary</b> buildings to re-plan a town. Two limits: <b>major / functionality-unlocking buildings are permanent</b> once built (the Hearth, board-openers, a signature, anything that unlocked new functionality); and a House cannot be removed if it would drop <b>Villagers below the number in use</b> — build one elsewhere first, since the pool is global. <b>Building upgrades</b> (levelling a building for a stronger effect) are a parked, later concept.</p></div>
      </div>
    </section>
  </div>

  <div class="panel" id="roster" role="tabpanel" aria-label="The roster">
    <section id="common">
      <h2>The building roster</h2>
      <h4>Common — the core chain (by board)</h4>
      <table>
        <thead><tr><th>Board</th><th>Building</th><th>What it does</th><th>Tool unlocked</th></tr></thead>
        <tbody>
          <tr><td rowspan="6"><span class="bd f">Farm</span></td><td>Hearth</td><td>the town's heart (prebuilt, free slot)</td><td>—</td></tr>
          <tr><td>Granary</td><td>stores crops, raises the cap</td><td>shuffle</td></tr>
          <tr><td>Mill</td><td>grinds grain → flour</td><td>scythe (clear)</td></tr>
          <tr><td>Bakery</td><td>bakes flour → bread</td><td>—</td></tr>
          <tr><td>Field Kitchen</td><td>cooks grain → travel rations</td><td>—</td></tr>
          <tr><td>House</td><td>produces <b>Villagers</b> (worker currency)</td><td>—</td></tr>
          <tr><td rowspan="4"><span class="bd m">Mine</span></td><td>Mine Head</td><td>opens the shaft — run expeditions</td><td>—</td></tr>
          <tr><td>Ore Store</td><td>stores ore, raises the cap</td><td>—</td></tr>
          <tr><td>Smelter</td><td>melts ore → metal bars</td><td>—</td></tr>
          <tr><td>Smithy</td><td>forges bars → mining tools</td><td>pick · hammer · drill</td></tr>
          <tr><td rowspan="3"><span class="bd fi">Fish</span></td><td>Wharf</td><td>launches fishing trips</td><td>—</td></tr>
          <tr><td>Net Loft</td><td>weaves nets &amp; tackle</td><td>net · gaff</td></tr>
          <tr><td>Smokehouse</td><td>cures the catch → rations &amp; goods</td><td>—</td></tr>
        </tbody>
      </table>
    </section>
    <section id="specialized">
      <h2>Specialized — one signature per town</h2>
      <p>★ = exportable to your other towns once that town is complete (the cross-zone mechanic; see <a href="towns.html#arc">The seven towns</a>).</p>
      <table>
        <thead><tr><th>Town</th><th>Signature building</th><th>What it does</th><th>Export bonus elsewhere</th></tr></thead>
        <tbody>
          <tr><td>1 Hearthwood</td><td><b>Caravan Yard</b></td><td>outfits the caravans that found new towns (Town 1's win)</td><td>★ cheaper founding</td></tr>
          <tr><td>2 Two Rivers</td><td><b>Quartermaster's Hall</b></td><td>packs farm food into mine rations efficiently</td><td>★ +ration packing in any mine</td></tr>
          <tr><td>3 Cracked Quarry</td><td><b>Pit Canteen</b></td><td>feeds miners underground: +2 free ration-turns / expedition</td><td>★ +2 ration-turns in any mine</td></tr>
          <tr><td>4 Saltspray</td><td><b>Bait Shack</b></td><td>breeds bait for richer catches</td><td>★ +fish yield in any harbor</td></tr>
          <tr><td>5 Greenmeadow</td><td><b>Cattery</b></td><td>raises mousers that clear rats</td><td>★ rat protection (Cat tool) in any farm</td></tr>
          <tr><td>6 Deepdelve</td><td><b>Supply Depot</b></td><td>brews a capped batch of rations every few hours</td><td>★ idle ration drip in any town</td></tr>
          <tr><td>7 Old Capital</td><td><b>The Monument</b></td><td>the endgame build — winning the run</td><td>— (finale)</td></tr>
        </tbody>
      </table>
    </section>
    <section id="pick">
      <h2>Pick — ability buildings that compete for spare slots</h2>
      <table>
        <thead><tr><th>Building</th><th>What it does</th><th>Tool</th></tr></thead>
        <tbody>
          <tr><td>Tool Shed</td><td>crafts basic farm tools</td><td>hoe · rake</td></tr>
          <tr><td>Sawmill</td><td>cuts logs → planks</td><td>axe</td></tr>
          <tr><td>Stable</td><td>raises mounts</td><td>saddle</td></tr>
          <tr><td>Bee Yard</td><td>keeps bees for honey</td><td>bee</td></tr>
          <tr><td>Powderworks</td><td>mixes black powder → bombs (clears cave-ins)</td><td>bomb (timed)</td></tr>
          <tr><td>Survey Post</td><td>scouts the rock — reveals rich ore</td><td>ore-finder</td></tr>
          <tr><td>Counting House</td><td>collects a coin bonus each season</td><td>—</td></tr>
          <tr><td>Field / Mine Warden</td><td>keeps your tile layout between visits</td><td>—</td></tr>
        </tbody>
      </table>
      <p style="font-size:.82rem;color:var(--muted);">Names are the clear-named design target. The authoritative roster, counts and costs live in the code (<code>src/constants.ts</code>) and the <a href="../balance/index.html">Balance Profile</a>; which types exist today vs. are still to add is tracked in <a href="status.html">Build status</a>.</p>
    </section>
  </div>`;

// ─── 5. META & MONEY (meta-money.html) — tabbed ─────────────────────────────

const metaTabs = [
  { id: "meta", label: "Meta systems" },
  { id: "money", label: "Monetization" },
];

const metaMoney = `  <div class="panel" id="meta" role="tabpanel" aria-label="Meta systems">
    <section id="wrap">
      <h2>The systems that wrap the loop</h2>
      <p class="lead">Around the board sits a ring of always-on systems. None is the game, but each shapes how it feels.</p>
      <div class="grid">
        <div class="card g"><h3>Story — the sequencer</h3><p>Thresholds (a total, a building, a win task) unlock the next town, boss summons and rare materials. Decides <em>when</em> each part opens.</p></div>
        <div class="card"><h3>Achievements</h3><p>Passive counters → mostly coins, a few special tools. A one-way faucet rewarding mastery and breadth.</p></div>
        <div class="card"><h3>Quests</h3><p>Seasonal goals → coins + XP. A target beyond "play till turns end."</p></div>
        <div class="card"><h3>Daily login</h3><p>A streak of coins + tools. Pure retention.</p></div>
        <div class="card"><h3>Civic tax &amp; timed depots</h3><p>Time plus how much you have built → coins, tool provisions and the idle ration drip. The day-cadence layer (the drip rule lives in <a href="systems.html#expeditions">Provisioning</a>).</p></div>
        <div class="card"><h3>Workers &amp; tools</h3><p>The flywheel's accelerator and your board powers — both global. Fully described in <a href="systems.html#workers">Systems → Workers &amp; tools</a>.</p></div>
        <div class="card r"><h3>Bosses → runes</h3><p>Beating a boss pays coins + a rune. With the finale gated on all towns, what runes and tokens ultimately buy is an open question (see <a href="status.html">Build status</a>).</p></div>
      </div>
    </section>
  </div>

  <div class="panel" id="money" role="tabpanel" aria-label="Monetization">
    <section id="model">
      <h2>Monetization — a free core, optional jumps, never gates</h2>
      <p>A <b>free-to-play core</b> (the seven-town arc and finale), monetised three ways: <b>rewarded ads</b>, <b>optional IAP</b>, and <b>paid expansion villages</b>. The game wants real play, so every paid thing <b>accelerates or adds content</b> — it never buys the win.</p>
      <h3>Rewarded video — opt-in, the player presses the button</h3>
      <p>The primary, cozy-friendly ad model: you <em>choose</em> to watch for a reward, never interrupted mid-puzzle. Each is <b>frequency-capped</b> so it stays a treat, and each only accelerates the free, effort-gated path — ads speed the wait, they do not open a gate.</p>
      <div class="grid">
        <div class="card b"><h3>Daily toolcrate / bundle</h3><p>One free watch a day for a small tool or material bundle — the everyday reason to come back.</p></div>
        <div class="card b"><h3>Skip a craft / cooldown</h3><p>Watch instead of spending materials to skip a tool or building wait — the ad version of the accelerant the pacing already allows.</p></div>
        <div class="card b"><h3>Boost a win-task reward</h3><p>On finishing a town's signature win-task, watch to boost the payout — a reward at a high-value moment.</p></div>
        <div class="card b"><h3>Board-run yield boost</h3><p>Watch before a session to lift that run's yield (e.g. +X% harvest) — a self-chosen push, tuned so it never feels mandatory.</p></div>
      </div>
      <h3>IAP — convenience &amp; content</h3>
      <div class="grid">
        <div class="card b"><h3>Buy Villagers</h3><p>Extra Villagers — jump your worker count without grinding Houses. Building Houses stays the free path.</p></div>
        <div class="card b"><h3>Toolcrate / coin packs</h3><p>A bundle of tools or coins — a convenience boost, nothing you cannot craft or earn.</p></div>
        <div class="card b"><h3>Remove forced ads</h3><p>One-time purchase. Clears any interstitials; rewarded opt-ins stay available for those who still want them.</p></div>
        <div class="card g"><h3>Expansion villages ★</h3><p>The big lever: new zones beyond the free core — new mechanics, signature buildings, tilesets and story. <b>Hybrid unlock</b>: earn each in-game <em>or</em> buy-to-unlock-now. Reuses the zone-atlas pipeline; the core seven stay complete.</p></div>
      </div>
      <div class="box"><b>No banners.</b> Persistent banners eat the mobile board real-estate the readability gate protects, cheapen the cozy feel, and earn little next to rewarded video. Forced interstitials: minimise to none; if ever, only at a natural map-return break, capped, never mid-puzzle.</div>
      <div class="box money"><b>The rule:</b> every paid thing is <b>earnable by playing or is extra content</b>. We sell <b>time, convenience and new worlds</b> — never gates or wins.</div>
    </section>
  </div>`;

// ─── 6. BUILD STATUS (status.html) — the only status home ───────────────────

const status = `  <main>
    <section id="intro">
      <h2>Build status &amp; open questions</h2>
      <p class="lead">The design set states the target. This page is the only place implementation <em>status</em> lives: what is in code, what is half-wired, what is still to build, and the numbers still open. Filter:</p>
      <div class="filterbar">
        <span class="lbl">Show:</span>
        <button class="on" data-filter="all">All</button>
        <button data-filter="build">To build</button>
        <button data-filter="wire">Half-wired</button>
        <button data-filter="ask">Open number/question</button>
      </div>
      <table id="status-table">
        <thead><tr><th>Seam</th><th>Kind</th><th>What's going on</th></tr></thead>
        <tbody>
          <tr data-status="build"><td><b>Additive board stacking</b></td><td><span class="pill warn">build</span></td><td>A town hosts multiple boards (farm+mine, +fish) sharing one stockpile; the fishery fed by farm + mine. Today zones are single-board.</td></tr>
          <tr data-status="build"><td><b>Villagers + House model</b></td><td><span class="pill warn">build</span></td><td>Houses produce <b>Villagers</b> (the worker currency); hiring spends a <b>Villager + coins + materials</b>, materials scaling per profession; the House removal rule.</td></tr>
          <tr data-status="build"><td><b>Currency split</b></td><td><span class="pill warn">build</span></td><td>Three currencies: materials (build, win-task, hire), coins (wages, tiers, tile unlocks, founding, Market), Villagers (from Houses, spent on hires).</td></tr>
          <tr data-status="wire"><td><b>The Market — buy side</b></td><td><span class="pill info">half-wired</span></td><td>Selling surplus → coins exists; add the <b>buy</b> side (coins → materials, priced high) without undercutting farming.</td></tr>
          <tr data-status="build"><td><b>Chain-knob floors + buy-down</b></td><td><span class="pill warn">build</span></td><td>Floor the yield divisor + upgrade threshold (~3) and let workers buy both down. (Keep the depth.)</td></tr>
          <tr data-status="build"><td><b>New &amp; renamed buildings</b></td><td><span class="pill warn">build</span></td><td>Add the new types (Caravan Yard, Quartermaster's Hall, Pit Canteen, Bait Shack, Cattery, Supply Depot, Field Kitchen, Mine Head, Ore Store, Net Loft) and rename the unclear ones.</td></tr>
          <tr data-status="build"><td><b>Specialized → cross-zone unlock</b></td><td><span class="pill warn">build</span></td><td>A town's signature becomes buildable elsewhere once complete (the +2 Pit Canteen, the Supply Depot drip…).</td></tr>
          <tr data-status="build"><td><b>Tile research &amp; acquisition</b></td><td><span class="pill warn">build</span></td><td>Research / buy / earn new tile types, each with a unique ability; one-time global unlocks via a research track + the coin sink + rewards.</td></tr>
          <tr data-status="build"><td><b>Building removal + permanence</b></td><td><span class="pill warn">build</span></td><td>Remove discretionary buildings; major / functionality buildings permanent; the House rule. Building <em>upgrades</em> parked for later.</td></tr>
          <tr data-status="build"><td><b>Building → tool unlock + timed grant</b></td><td><span class="pill warn">build</span></td><td>Make "build unlocks the recipe / generates on a timer" universal. (Also the <code>/b/</code> wiki update.)</td></tr>
          <tr data-status="build"><td><b>Monetization hooks</b></td><td><span class="pill warn">build</span></td><td>Rewarded-ad hooks (daily toolcrate, skip-cooldown, boost win-task, maybe run-yield); IAP (Buy Villagers, toolcrate, remove-ads); hybrid expansion villages. No banners.</td></tr>
          <tr data-status="build"><td><b>Non-linear founding</b></td><td><span class="pill warn">build</span></td><td>Remove the hard "complete your first settlement before founding the next" gate (<code>src/state.ts:779</code>) so any map-adjacent, affordable site can be opened mid-progress. The code already does coin-founding, parallel settlements &amp; free fast-travel — this gate is the only blocker to opening/switching freely.</td></tr>
          <tr data-status="build"><td><b>Reachability gate only</b></td><td><span class="pill warn">build</span></td><td>Remove the hard <code>requiresZoneTier</code> prereqs (<code>src/features/zones/data.ts:442</code>); gate founding on <b>map reachability + the rising coin cost only</b> — no completion prereq and no extra progress threshold. The expanding map reach is the ramp.</td></tr>
          <tr data-status="wire"><td><b>Caravan = the founding act (coins only)</b></td><td><span class="pill info">half-wired</span></td><td>Founding is a coin dispatch today and <code>caravan_post</code> is the market/sell building. Surface founding as "outfit a caravan" paid in <b>coins only</b> — never a target town's own materials (the no-softlock rule); the Caravan Yard discounts it.</td></tr>
          <tr data-status="build"><td><b>Finale = all zones complete</b></td><td><span class="pill warn">build</span></td><td>The Old Capital should require <b>every prior town complete</b>. Today it unlocks on 3 Hearth-Tokens (one per settlement <em>type</em>, <code>src/features/zones/data.ts:589</code>) — widen the gate so all required towns must be finished.</td></tr>
          <tr data-status="build"><td><b>Town 1 to ~6 slots</b></td><td><span class="pill warn">build</span></td><td>Shrink the home map so the build-choice bites with real early scarcity.</td></tr>
          <tr data-status="wire"><td><b>Expedition enforcement</b></td><td><span class="pill info">half-wired</span></td><td>Food→turns + Kitchen exist; expeditions aren't fully turn-budgeted everywhere — needed for the stack.</td></tr>
          <tr data-status="wire"><td><b>Runes / hearth tokens</b></td><td><span class="pill info">half-wired</span></td><td>Earned but unspent; the portal is unfinished. With the finale gated on all towns, decide what they're for.</td></tr>
          <tr data-status="wire"><td><b>Castle / NPC orders</b></td><td><span class="pill info">half-wired</span></td><td>Order/donation sinks without reward gates — could become the Town 2 "grand order" win.</td></tr>
          <tr data-status="ask"><td><b>Pacing numbers</b></td><td><span class="pill idle">number</span></td><td>Idle cadence chosen — now set the actual lengths: turns/run, days/town, depot rates, founding waits.</td></tr>
          <tr data-status="ask"><td><b>Farm→mine exchange rate</b></td><td><span class="pill idle">number</span></td><td>How much farming funds one descent — the master pacing dial for the stacked towns.</td></tr>
          <tr data-status="ask"><td><b>Worker + win-task baskets</b></td><td><span class="pill idle">number</span></td><td>How steep the hire baskets get; how big each town's win-task basket is vs. its output.</td></tr>
          <tr data-status="ask"><td><b>Fish-town specifics</b></td><td><span class="pill idle">question</span></td><td>Deferred (T4). When ready: how fishing reads vs. mining; the bait/tackle exchange.</td></tr>
        </tbody>
      </table>
    </section>

    <section id="next">
      <h2>What this unlocks</h2>
      <ol>
        <li><b>Build the seams</b> (the <span class="pill warn">build</span> rows) so the code matches the model — additive boards, the Villager/currency split, the building roster and the chain-knob floors are the big ones.</li>
        <li><b>Tune Towns 1–2 in the sim</b> — the <span class="pill idle">number</span> rows (pacing, exchange rate, baskets) against the playtest harness.</li>
        <li><b>Then extend outward</b> — fish specifics, later-town numbers, monetization balancing.</li>
      </ol>
    </section>

    <details>
      <summary>What is decided vs. still open</summary>
      <p style="font-size:.86rem;color:var(--muted);"><b>Decided this pass:</b> the currency split (materials &gt; coins), Villagers-from-Houses, limited slots + removal, keeping the chain-knob depth, idle pacing, cozy→ramp difficulty, the seven-town path with thematic/exportable signature buildings, and optional-only monetization. <b>Still to build:</b> everything in the <span class="pill warn">build</span> rows above. <b>Grounded in code today:</b> board/chain rules, production lines, the zones and their ladders/plots/gating, the buildings and costs, the civic building→tool seed, global tools, worker curves, the bosses, the hearth-token finale. Hard numbers live in the <a href="../balance/index.html">Balance Profile</a> and the Dev Panel.</p>
    </details>
  </main>`;

// ─── emit ────────────────────────────────────────────────────────────────────

const FILES = [
  {
    file: "index.html",
    html: page({
      slug: "index",
      title: "puzzleDrag2 — Game Design",
      sub: "The whole game as one picture: the compounding core loop, the stacked-board economy, and the seven-town path. Start here, then open a focused doc below.",
      desc: "The canonical puzzleDrag2 game-design overview — core loop, stacked boards, the seven-town arc, and a map of the focused design docs.",
      chips: ["match-merge farming", "stacked boards", "7 towns · all required", "materials &gt; coins", "choose your buildings"],
      body: overview,
    }),
  },
  {
    file: "systems.html",
    html: page({
      slug: "systems",
      title: "Systems &amp; economy",
      sub: "How you play and how value moves: the board &amp; chain, the two chain knobs, the three currencies, the faucets↔sinks map, workers &amp; hiring, tools, and provisioning.",
      desc: "puzzleDrag2 systems & economy — the chain, the two knobs, the three-currency model, the faucets/sinks map, workers, tools and expeditions.",
      chips: ["6×6 chain", "two chain knobs", "materials · coins · Villagers", "costly Market"],
      tabs: systemsTabs,
      body: systems,
    }),
  },
  {
    file: "towns.html",
    html: page({
      slug: "towns",
      title: "The seven towns",
      sub: "A caravan-founded map of seven towns — all required for the finale but openable in any order you can reach — each adding one board, one crux, one win task and a thematic signature building that exports across zones.",
      desc: "puzzleDrag2's seven-town path — founding by caravan, each town's crux, win task and signature building, and the cross-zone export mechanic.",
      chips: ["7 towns · all required", "founded by caravan", "varied win tasks", "exportable signatures"],
      tabs: townsTabs,
      body: towns,
    }),
  },
  {
    file: "buildings.html",
    html: page({
      slug: "buildings",
      title: "Buildings &amp; tools",
      sub: "Common core-chain buildings, one specialized signature per town, and the ability buildings that compete for spare slots — plus how buildings unlock tools and how removal works.",
      desc: "puzzleDrag2 buildings & tools — the common/specialized/pick roster, the building→tool unlock, slot tension and the removal/permanence rules.",
      chips: ["clear-named", "building → tool", "slots &lt; buildings", "exportable signatures"],
      tabs: buildingsTabs,
      body: buildings,
    }),
  },
  {
    file: "meta-money.html",
    html: page({
      slug: "meta-money",
      title: "Meta &amp; money",
      sub: "The always-on systems that wrap the loop — story, achievements, quests, daily, civic, bosses — and a free-to-play model that sells time, convenience and new worlds, never wins.",
      desc: "puzzleDrag2 meta systems & monetization — story, quests, daily, civic, bosses, and the rewarded-ad / IAP / expansion-village model.",
      chips: ["story sequencer", "rewarded video", "optional IAP", "expansion villages", "no banners"],
      tabs: metaTabs,
      body: metaMoney,
    }),
  },
  {
    file: "status.html",
    html: page({
      slug: "status",
      title: "Build status &amp; open questions",
      sub: "The single home for implementation status: what is in code, what is half-wired, what is still to build, and the numbers still open.",
      desc: "puzzleDrag2 build status — what is built, half-wired or to build for the game-design model, plus the open balance numbers.",
      chips: ["to build", "half-wired", "open numbers"],
      body: status,
    }),
  },
];

mkdirSync(outDir, { recursive: true });
for (const { file, html } of FILES) {
  writeFileSync(join(outDir, file), html);
  console.log("wrote", join("reference/docs/game-design", file));
}
console.log(`\n${FILES.length} game-design docs written to ${outDir}`);
