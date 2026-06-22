// docs/zones — per-zone doc generator (Pass 2). Builds the self-contained interactive zone doc:
//   • Layout — a live top-down Grow play-through on the real 40×30 @ 32px grid (ports to townMaps.ts)
//   • Tile inventory — the art backlog (terrain, roads, landmark, signature structures, props, FX)
//   • Art bible — palette ramps + the craft principles + the zone's art notes
// Inlines the shared CSS + layout engine + a merged LAYOUT_DATA blob (geometry + palette + tier text).

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const swatch = (cols) => `<svg viewBox="0 0 ${cols.length * 10} 10" preserveAspectRatio="none" style="width:80%;height:34px">${cols.map((c, i) => `<rect x="${i * 10}" y="0" width="10" height="10" fill="${c}"/>`).join("")}</svg>`;
const ramp = (name, cols) => `<div class="ramp"><span class="rl">${esc(name)}</span>${cols.map((c) => `<i style="background:${c}"></i>`).join("")}</div>`;
const cost = (c) => !c ? `free / founding` : `${c.coins.toLocaleString()}¢${c.res ? " · " + Object.entries(c.res).map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`).join(", ") : ""}`;

function invItem(name, desc, cols, tags) {
  return `<div class="inv-item"><div class="art">${cols ? swatch(cols) : ""}</div><div class="nm">${esc(name)}</div><div class="ds">${esc(desc)}</div><div class="tags">${(tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>`;
}

function inventory(z, topo) {
  const P = z.env.palette, R = z.tiles.ramps;
  const cats = [];
  // terrain families from the palette ramps
  cats.push({ h: "Terrain", d: "Base ground + the special surface. Each material needs edge / corner / diagonal transition tiles so nothing butts edge-to-edge (autotiler).",
    items: R.map((r) => invItem(r.name, "Flat fill + transition set (8-way edges & corners).", r.cols, ["1×1", "autotile", "~6 variants"])) });
  // frontier (the receding wilderness)
  cats.push({ h: "Frontier — the progress bar", d: `The receding ${esc(z.env.frontier)}.`,
    items: [
      invItem("Frontier dressing", `${z.env.biome} wilderness scatter that recedes as the town grows (cleared one way, never re-wilds).`, [P.dark, P.ground, P.ground2], ["scatter", "tier-gated"]),
      invItem("Cleared / buildable pad", "The freshly-cleared ground a new plot sits on — the visible reward of each clear.", [P.ground, P.ground2], ["1×1"]),
    ] });
  // roads
  cats.push({ h: "Roads & connectors", d: "Laid first; buildings front them. The network only extends each rung (immutable once laid).",
    items: [
      invItem("Main route (autotile)", "Straight / corner / T / cross / end pieces; surface upgrades dirt → cobble with the town.", [P.path, P.cobble || P.path], ["autotile", "tier surface"]),
      invItem("Branch lane (autotile)", "Narrower secondary route opened at higher rungs.", [P.path], ["autotile"]),
      invItem("Door → street stub", "Short desire-line from each lot's frontage to the route — lived-in connectivity.", [P.path], ["1×1"]),
    ] });
  // landmark staged
  cats.push({ h: "Landmark (staged)", d: "One bounded focal hub that levels up in place — never grows over its neighbours.",
    items: (z.landmarkStages || []).map((s, i) => invItem(s, `Stage ${i + 1} — appears at the ${z.tiers[i] ? z.tiers[i].name : "rung " + (i + 1)} rung.`, [P.wall, P.accent, P.glow], ["landmark", "staged"])) });
  // signature structures
  cats.push({ h: "Signature structures", d: "The pieces that make this zone unmistakably itself.",
    items: z.tiles.signature.map((s) => invItem(s.name, s.desc, [P.ground, P.accent, P.roof], ["signature"])) });
  // buildings
  cats.push({ h: "Buildings", d: "Themed plot art; each fronts a route at a setback.",
    items: z.buildings.slice(0, 8).map((b) => invItem(b.name, b.role, [P.wall, P.roof, P.accent], ["plot art"])) });
  // props + FX
  cats.push({ h: "Props, life & FX", d: "Density and life rise each rung; ambient particles sell the mood.",
    items: [
      invItem("Props & dressing", "Signpost, lamp, planter, cart, market-stall — cumulative by rung.", [P.wall, P.accent], ["props"]),
      invItem("Townsfolk & critters", `NPC routines + ${(z.env.ambient || []).slice(0, 2).join(", ")} — the #1 aliveness multiplier.`, [P.accent, P.roof], ["animated"]),
      invItem("Ambient FX", `${(z.env.ambient || []).join(", ")}; day / dusk lighting.`, [P.glow, P.surface], ["FX", "anim"]),
    ] });
  return cats.map((c) => `<h3>${esc(c.h)}</h3><p style="color:var(--muted);font-size:.88rem;margin:.1rem 0 .4rem">${c.d}</p><div class="inv-grid">${c.items.join("")}</div>`).join("");
}

export function buildPage({ zone: z, layout, topo, styles, layoutEngine, principles }) {
  const P = z.env.palette;
  const merged = { ...layout, palette: P, tiers: z.tiers.map((t) => ({ name: t.name, plots: t.plots, caption: t.change })) };
  const tierBtns = z.tiers.map((t, i) => `<button data-tier="${i}"${i === 0 ? ' class="on"' : ""}>${esc(t.name)}<span class="n">${t.plots} plots</span></button>`).join("");
  const tierRows = z.tiers.map((t) => `<tr><td><b>${esc(t.name)}</b></td><td class="num">${t.plots}</td><td>${esc((t.unlocks || []).join(", "))}</td><td>${esc(cost(t.cost))}</td><td>${esc(t.change)}</td></tr>`).join("");
  const ramps = z.tiles.ramps.map((r) => ramp(r.name, r.cols)).join("");
  const hazards = z.hazards.map((h) => `<li><span class="pill ${h.src}">${h.src}</span> <b>${esc(h.name)}</b> — ${esc(h.effect)}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(z.name)} — Zone build-out</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800;9..144,900&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${styles}</style>
</head><body style="--z-accent:${P.accent};--z-accent2:${P.roof};--z-glow:${P.glow}"><div class="page">
  <p class="backlink"><a href="../">← Zone Atlas</a></p>
  <header class="hero" style="border-bottom-color:${P.accent}">
    <h1>${z.emoji} ${esc(z.name)}</h1>
    <p class="sub">${esc(z.tagline)} <b>${esc(topo.name)}</b> — ${esc(topo.grow)}</p>
    <p class="meta">${esc(z.env.mood)} · <span class="pill warn">Layout mockup — flat colour; pixel art generated once it locks</span></p>
    <div class="chips"><span class="chip">${esc(z.env.biome)}</span><span class="chip">Lv ${z.level}+</span><span class="chip">${z.tiers.map((t) => t.plots).join(" → ")} plots</span><span class="chip">${z.tiers.length} rungs</span></div>
  </header>

  <nav class="tabs" id="tabs">
    <button data-tab="layout" class="on">Layout play-through</button>
    <button data-tab="tiles">Tile inventory</button>
    <button data-tab="bible">Art bible</button>
  </nav>

  <div class="panel on" id="panel-layout">
    <div class="stage">
      <div class="ctrls">
        <div class="tierbtns" data-tierbtn-for="${z.id}">${tierBtns}</div>
        <button class="ctl grow" data-grow-for="${z.id}">Grow&nbsp;▸</button>
        <div class="toggles">
          <label><input type="checkbox" data-toggle-for="${z.id}" data-toggle="showBuildings"> placeholder buildings</label>
          <label><input type="checkbox" data-toggle-for="${z.id}" data-toggle="labels" checked> plot labels</label>
        </div>
      </div>
      <div class="canvas-wrap"><canvas data-layout="${z.id}" width="1280" height="960" role="img" aria-label="${esc(z.name)} top-down layout"></canvas></div>
      <p class="caption" data-caption-for="${z.id}"></p>
      <div class="legend">
        <span class="sw"><span class="swatch" style="background:${P.ground}"></span>cleared ground</span>
        <span class="sw"><span class="swatch" style="background:${P.frontierFill || P.surface}"></span>frontier (${esc(z.env.frontier.split(",")[0])})</span>
        <span class="sw"><span class="swatch" style="background:${P.path}"></span>route</span>
        <span class="sw"><span class="swatch" style="background:${P.accent}"></span>street frontage edge</span>
      </div>
      <p class="statline" data-stat-for="${z.id}"></p>
    </div>
    <div class="box"><b>Roads-first, on the real grid.</b> Routes are laid per rung; each lot is placed <i>beside</i> a route at a fixed setback, facing it (a road never targets a building's centre). The wilderness frontier recedes as the network grows, and the landmark levels up in place. Geometry is verified collision-free headlessly (<code>layoutVerify.mjs</code>) so it ports 1:1 into <code>src/ui/town/townMaps.ts</code>.</div>
    <h2>The tier ladder</h2>
    <table><thead><tr><th>Rung</th><th class="num">Plots</th><th>Unlocks (new this rung)</th><th>Upgrade cost</th><th>What visibly changes</th></tr></thead><tbody>${tierRows}</tbody></table>
    <h2>Signature mechanic</h2>
    <p class="lead">${esc(z.signature)}</p>
    <h2>Hazards &amp; boss</h2>
    <ul>${hazards}</ul>
    <p><b>Boss — ${z.boss.emoji} ${esc(z.boss.name)}</b> <span class="pill ${z.boss.src}">${z.boss.src}</span>: ${esc(z.boss.mechanic)}</p>
  </div>

  <div class="panel" id="panel-tiles">
    <p class="lead">The art backlog for ${esc(z.name)} — what the tileset must provide once the layout above is locked. Swatches show the intended palette; generate the pixel art with PixelLab and bridge every terrain boundary with transition tiles (autotiler).</p>
    ${inventory(z, topo)}
  </div>

  <div class="panel" id="panel-bible">
    <h2>Palette</h2>
    <div class="ramps">${ramps}</div>
    <h2>Mood &amp; light</h2>
    <p class="lead">${esc(z.env.mood)}</p>
    <p><b>Frontier:</b> ${esc(z.env.frontier)}. <b>Ambient:</b> ${(z.env.ambient || []).map(esc).join(", ")}.</p>
    <h2>The craft bar — every rung is reviewed against these</h2>
    <div class="grid">${principles.map((p) => `<div class="card g"><h4>${esc(p.k)}</h4><p style="font-size:.86rem;margin:.2rem 0">${esc(p.d)}</p></div>`).join("")}</div>
    <h2>New resources</h2>
    ${(z.newResources && z.newResources.length) ? `<ul>${z.newResources.map((r) => `<li><b>${esc(r.name)}</b> — ${esc(r.source)}</li>`).join("")}</ul>` : "<p>None — this zone trades in base/board resources only.</p>"}
  </div>

  <p class="statline">Generated from <code>docs/zones/data/</code> · layout verified collision-free · ${esc(z.tiles.signature.length)} signature tiles · ${z.tiers.length} rungs · ${z.tiers.at(-1).plots} plots at full size</p>
</div>
<script>window.LAYOUT_DATA=${JSON.stringify({ [z.id]: merged })};</script>
<script>${layoutEngine}</script>
<script>
(function(){var tabs=document.getElementById("tabs");tabs.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var t=b.dataset.tab;tabs.querySelectorAll("button").forEach(function(x){x.classList.toggle("on",x===b);});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-"+t);});if(location.hash!=="#"+t)history.replaceState(null,"","#"+t);});
var h=location.hash.replace("#","");if(h){var btn=tabs.querySelector('[data-tab="'+h+'"]');if(btn)btn.click();}
})();
</script>
</body></html>`;
}
