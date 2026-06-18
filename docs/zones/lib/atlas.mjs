// docs/zones — atlas page generator. Builds the self-contained overview doc (index.html)
// from the zone specs + world meta. Inlines the shared CSS + engine + a minimal ZONE_DATA blob.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ramp = (cols) => `<span class="miniramp">${cols.map((c) => `<i style="background:${c}"></i>`).join("")}</span>`;
const fullRamp = (name, cols) => `<div class="ramp"><span class="rl">${esc(name)}</span>${cols.map((c) => `<i style="background:${c}"></i>`).join("")}</div>`;

function cost(c) {
  if (!c) return `<span class="pill ok">free / founding</span>`;
  const res = c.res ? Object.entries(c.res).map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`).join(", ") : "";
  return `${c.coins.toLocaleString()}¢${res ? " · " + esc(res) : ""}`;
}

function zoneCard(z, topoById) {
  const topo = topoById[z.topology];
  const plots = z.tiers.map((t) => t.plots);
  const ladder = z.tiers.map((t) =>
    `<div class="rung"><span class="rn">${esc(t.name)}</span><span class="rp">${t.plots} plots</span></div>`
  ).join("");
  const tierRows = z.tiers.map((t, i) =>
    `<tr><td><b>${esc(t.name)}</b></td><td class="num">${t.plots}</td><td>${esc((t.unlocks || []).join(", "))}</td><td>${cost(t.cost)}</td><td>${esc(t.change)}</td></tr>`
  ).join("");
  const buildings = z.buildings.map((b) => `<span class="tagk">${esc(b.name)}</span>`).join(" ");
  const hazards = z.hazards.map((h) =>
    `<div class="haz"><span class="pill ${h.src}">${h.src}</span> <b>${esc(h.name)}</b> — ${esc(h.effect)} <i>Counter:</i> ${esc(h.counter)}</div>`
  ).join("");
  const newRes = (z.newResources && z.newResources.length)
    ? `<div class="zsub">New resources <span style="font-weight:400;text-transform:none">— and where they come from (no softlocks)</span></div>` +
      z.newResources.map((r) => `<div class="haz"><b>${esc(r.name)}</b> — ${esc(r.source)}</div>`).join("")
    : "";
  const ramps = z.tiles.ramps.map((r) => ramp(r.cols)).join("");
  const sigTiles = z.tiles.signature.map((s) => `<li><b>${esc(s.name)}</b> — ${esc(s.desc)}</li>`).join("");
  const accent = z.env.palette.accent, accent2 = z.env.palette.roof, glow = z.env.palette.glow;
  return `
  <section class="zone" id="zone-${z.id}" style="--z-accent:${accent};--z-accent2:${accent2};--z-glow:${glow}">
    <div class="ztop">
      <div class="art">
        <canvas data-zone="${z.id}" data-w="920" data-h="300" role="img" aria-label="${esc(z.name)} establishing shot"></canvas>
        <div class="artctl">
          <label>Grow</label>
          <input type="range" min="0" max="100" value="42" data-grow-for="${z.id}" aria-label="grow ${esc(z.name)}">
          <span class="grow-end">camp → capital</span>
        </div>
      </div>
      <div class="zbody">
        <div class="zhdr"><span class="zno">${String(z.order).padStart(2, "0")}</span><h3 class="zname">${z.emoji} ${esc(z.name)}</h3></div>
        <div class="ztag">${esc(z.tagline)}</div>
        <div class="zmeta">
          <span class="tagk">${esc(z.env.biome)}</span>
          <span class="tagk">${esc(topo.name)}</span>
          <span class="tagk">Lv ${z.level}+</span>
          <span class="tagk">${plots[0]}→${plots[plots.length - 1]} plots · ${z.tiers.length} rungs</span>
        </div>
        <div class="zrow"><span class="lbl">Mood</span><span>${esc(z.env.mood)}</span></div>
        <div class="zrow"><span class="lbl">Grows by</span><span>${esc(topo.grow)}</span></div>
        <div class="zrow"><span class="lbl">Frontier</span><span>The progress bar is ${esc(z.env.frontier)}.</span></div>

        <div class="zsub">Tier ladder</div>
        <div class="ladder">${ladder}</div>

        <div class="zsub">Themed buildings</div>
        <div>${buildings}</div>
        ${newRes}

        <div class="zsub">Signature mechanic</div>
        <p style="font-size:.9rem;margin:.2rem 0">${esc(z.signature)}</p>

        <div class="zsub">Hazards <span style="font-weight:400;text-transform:none">— reused from the game + new</span></div>
        ${hazards}

        <div class="zsub">Boss</div>
        <div class="boss"><b>${z.boss.emoji} ${esc(z.boss.name)}</b> <span class="pill ${z.boss.src}">${z.boss.src}</span> — ${esc(z.boss.mechanic)}<br><span style="color:var(--muted)"><i>Alt idea:</i> ${esc(z.boss.newAlt)}</span></div>

        <div class="zsub">Tile set — palette &amp; signature pieces</div>
        <div class="miniramps">${ramps}</div>
        <ul style="font-size:.82rem;margin:.4rem 0 0;padding-left:1.1rem">${sigTiles}</ul>
      </div>
    </div>
    <details style="border-top:1px solid var(--line)">
      <summary style="cursor:pointer;padding:.6rem 1.25rem;font:700 .82rem/1 var(--mono);color:var(--muted)">▾ full tier ladder — plots · unlocks · cost · what changes</summary>
      <div style="padding:0 1.25rem 1rem">
        <table><thead><tr><th>Rung</th><th class="num">Plots</th><th>Unlocks (new this rung)</th><th>Upgrade cost</th><th>What visibly changes</th></tr></thead><tbody>${tierRows}</tbody></table>
      </div>
    </details>
  </section>`;
}

export function buildAtlas({ ZONES, META, PRINCIPLES, TOPOLOGIES, MECHANIC_SOURCING, REGIONS, styles, engine }) {
  const topoById = Object.fromEntries(TOPOLOGIES.map((t) => [t.id, t]));
  const sorted = [...ZONES].sort((a, b) => a.order - b.order);

  const zoneData = Object.fromEntries(sorted.map((z) => [z.id, { topology: z.topology, name: z.name, palette: z.env.palette }]));

  const toc = sorted.map((z) =>
    `<a class="toccard" href="#zone-${z.id}" style="border-left-color:${z.env.palette.accent}"><span class="e">${z.emoji}</span><span><span class="tt">${esc(z.name)}</span><br><span class="ts">${esc(topoById[z.topology].name)}</span></span></a>`
  ).join("");

  const principles = PRINCIPLES.map((p) => `<div class="card g"><h4>${esc(p.k)}</h4><p style="font-size:.88rem;margin:.2rem 0">${esc(p.d)}</p></div>`).join("");

  const topoRows = TOPOLOGIES.map((t, i) => {
    const z = sorted.find((zz) => zz.topology === t.id);
    return `<tr><td><b>${esc(t.name)}</b></td><td>${z ? z.emoji + " " + esc(z.name) : "—"}</td><td>${esc(t.gist)}</td><td>${esc(t.grow)}</td></tr>`;
  }).join("");

  const plotRows = sorted.map((z) =>
    `<tr><td>${z.emoji} <b>${esc(z.name)}</b></td><td>${esc(topoById[z.topology].name)}</td><td class="num">${z.level}+</td><td class="num">${z.tiers.length}</td><td>${z.tiers.map((t) => t.plots).join(" → ")}</td></tr>`
  ).join("");

  const journeyRows = sorted.map((z) => {
    const reg = REGIONS.find((r) => r.id === z.region);
    return `<tr><td class="num">${z.order}</td><td>${z.emoji} <b>${esc(z.name)}</b></td><td>${reg ? esc(reg.name) : esc(z.region)}</td><td class="num">${z.level}+</td><td>${esc(z.tagline)}</td></tr>`;
  }).join("");

  const totalPlots = sorted.reduce((s, z) => s + z.tiers[z.tiers.length - 1].plots, 0);
  const newMech = MECHANIC_SOURCING.newMechanicsIntroduced.length;

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(META.title)} — ${esc(META.project)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800;9..144,900&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${styles}</style>
</head><body><div class="page">
  <header class="hero">
    <h1>The Zone Atlas — Ten Worlds That Grow</h1>
    <p class="sub">${esc(META.subtitle)} Each zone is a different <b>environment</b> and a different <b>logic of growth</b> — built on the <a href="../town-layout/">town-layout</a> foundation (roads-first, the wilderness as the progress bar, a landmark that levels up in place), then taken somewhere new. The art here is a flat-color / vector mockup; pixel art is generated once a layout locks.</p>
    <p class="meta">${esc(META.project)} · <span class="pill warn">Proposal — Pass 1 of the build-out</span> · ${esc(META.date)}</p>
    <div class="chips"><span class="chip">10 distinct growth topologies</span><span class="chip">${totalPlots} plots at full size</span><span class="chip">${newMech} new hazards/boss mechanics</span><span class="chip">Reuses the game's real hazards &amp; bosses</span><span class="chip">Drag “Grow” on any card</span></div>
  </header>

  <p class="lead">This atlas proposes ten settlement zones for ${esc(META.project)}. Every one is unique in <b>look</b> and in <b>how it grows</b> — a stilt-town strung over black water, a forge-town terraced up a live volcano, a city of crystal caverns, a sky-port on floating isles, a haunted ruin you reclaim from the fog. They share one craft bar (below) and the same authored-map contract as the home town, so each can become a real, playable, growing place. <b>Drag the “Grow” slider</b> on any card to watch a foothold become a capital (double-click to let it breathe on its own).</p>

  <h2>The ten worlds</h2>
  <div class="tocgrid">${toc}</div>

  <h2>How they grow — ten different layout logics</h2>
  <p>Variety of <b>layout style</b> is a hard requirement: no two zones grow the same way. Each claims exactly one growth topology — the menu of ten is the spine of the whole set.</p>
  <table><thead><tr><th>Topology</th><th>Zone</th><th>What it is</th><th>How it grows</th></tr></thead><tbody>${topoRows}</tbody></table>

  <h2>The zones</h2>
  <div class="zgrid">
${sorted.map((z) => zoneCard(z, topoById)).join("\n")}
  </div>

  <h2>Scale at a glance — the plot &amp; rung curves</h2>
  <p>Each zone starts tiny (tier 0 doubles as its tutorial) and grows in meaningful jumps. Rung counts (4–5) and full-size plot caps (14–26) vary so each zone has its own sense of scale; the grand capital is deliberately the largest. Endpoint grandeur is intentional too — frontier outposts crown at a Town or Hold, while the trade hubs and the capital crown at a Capital. Every gating resource is producible by the rung before it spends it (see each zone's “new resources” note) — no softlocks.</p>
  <table><thead><tr><th>Zone</th><th>Topology</th><th class="num">Lv</th><th class="num">Rungs</th><th>Plot curve</th></tr></thead><tbody>${plotRows}</tbody></table>

  <h2>Looking to the game — hazards &amp; bosses, reused and extended</h2>
  <p>Per the brief, every zone first <b>reuses real mechanics from the game</b> where they fit, then extends with new ones — so the challenge vocabulary is grounded, not invented in a vacuum.</p>
  <div class="grid">
    <div class="card"><h4>Reused hazards</h4><p style="font-size:.86rem">${MECHANIC_SOURCING.reusedHazards.map(esc).join(" · ")}</p></div>
    <div class="card"><h4>Reused bosses</h4><p style="font-size:.86rem">${MECHANIC_SOURCING.reusedBosses.map(esc).join(" · ")}</p></div>
    <div class="card g"><h4>New mechanics introduced (${newMech})</h4><p style="font-size:.86rem">${MECHANIC_SOURCING.newMechanicsIntroduced.map(esc).join(" · ")}</p></div>
  </div>

  <h2>Where they sit in the world — one long journey</h2>
  <p>These slot into and extend the existing world (Hearthlands → Greenfields → Wilds → Stoneholds → Coast → Deep → Capital), weaving new regions between the old ones into a single progression from the cozy home town to a golden capital.</p>
  <table><thead><tr><th class="num">#</th><th>Zone</th><th>Region</th><th class="num">Lv</th><th>Hook</th></tr></thead><tbody>${journeyRows}</tbody></table>

  <h2>The craft bar — what every zone is reviewed against</h2>
  <p>These six principles, inherited from the town-layout foundation, are non-negotiable. A zone build that breaks one fails review and gets iterated. They are the “same quality bar” the brief asks for.</p>
  <div class="grid">${principles}</div>

  <h2>From proposal to playable — the build-out plan</h2>
  <div class="box"><b>This atlas is Pass 1.</b> Each zone then becomes its own interactive doc with a live top-down <b>Grow play-through</b> on the real <code>40×30 @ 32px</code> game grid, a <b>tile inventory</b> (the art backlog), and an <b>art bible</b> — exactly like <a href="../town-layout/">town-layout</a> — then is critically reviewed against the craft bar, iterated to a high bar, and merged. Advancements found building one zone are back-ported to the others (the shared engine that draws these cards is the cross-pollination mechanism: improve it once, every zone benefits).</p></div>
  <ol>
    <li><b>Lock the ladder</b> — rung names + plot curve (done, above) per zone.</li>
    <li><b>Author roads → frontage</b> in the per-zone mockup with its own growth topology (flat colours first).</li>
    <li><b>Verify the layout headlessly</b> — no plot overlaps a plot / road / landmark; per-rung reveal counts equal the ladder.</li>
    <li><b>Port coordinates</b> into <code>src/ui/town/townMaps.ts</code> (stable, additive lot indices).</li>
    <li><b>Fill the tile / prop manifest</b> — the art shopping list in the inventory tab.</li>
    <li><b>Generate the tiles</b> (PixelLab) and handle terrain boundaries (autotiler) — only once positions are final.</li>
    <li><b>Wire the scene + verify in-game.</b></li>
  </ol>

  <p class="statline">${sorted.length} zones · ${TOPOLOGIES.length} topologies · ${sorted.reduce((s, z) => s + z.tiers.length, 0)} rungs · ${totalPlots} plots at full size · ${sorted.reduce((s, z) => s + z.hazards.length, 0)} hazards · ${sorted.length} bosses · generated from <code>docs/zones/data/</code> · ${esc(META.date)}</p>
</div>
<script>window.ZONE_DATA=${JSON.stringify(zoneData)};</script>
<script>${engine}</script>
</body></html>`;
}
