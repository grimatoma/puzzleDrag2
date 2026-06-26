// Animated mining-ore icons — same static silhouettes / palettes / veins / gloss
// as `src/textures/categories/ores.ts`, but alive. Each fn redraws the WHOLE icon
// at time `t` (seconds), centred at origin within a ~-24..+24 box; the caller does
// clear / save / translate / scale / lineCap / restore.
//
// This is the per-icon idle REBUILD (sibling of `crops.ts`). The first draft was a
// glint wipe + sparkles painted on a statue: every ore had a measured 0px body
// delta, five were recolours of one grey ball, the overlay cracks floated on top,
// and the old `sweepPhase` triangle teleported at the wrap. The fixes here:
//   - lead with REAL body deformation — a breathing squash so the SILHOUETTE moves
//     (cracks/veins/facets live INSIDE the scaled transform, so they breathe too);
//   - couple `groundShadow` to that vertical motion (bigger body → heavier shadow);
//   - drive every sweep/pulse off `loopPhase`/`pingPong`/`beat`/`breathe` so loops
//     tile exactly (no teleport), with eased timing + anticipation/overshoot;
//   - differentiate the idle per material (coal smoulders, iron's rust pulses in a
//     travelling wave, copper's patina blooms, gold jiggles, silver flashes its
//     streaks, obsidian sways + refracts, sulfur ripples, the geode awakens);
//   - demote glint/sparkle to a SECONDARY accent via the shared feathered helpers.
//
// Stub-safe: deterministic from `t` + indices (no Math.random / Date), only standard
// ctx path/transform/gradient calls.

import {
  TAU,
  breathe,
  loopPhase,
  pingPong,
  beat,
  twinkle,
  clamp01,
  easeOutBack,
  easeInOutSine,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// Local helpers (shape drawing kept identical to the static art).

// Trace an irregular bumpy rock silhouette into the current path (straight edges).
function rockPath(ctx: CanvasRenderingContext2D, verts: Array<[number, number]>): void {
  ctx.beginPath();
  verts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

// Scatter small facet/speckle dots over a rock (deterministic golden-angle spiral).
function speckle(
  ctx: CanvasRenderingContext2D,
  count: number,
  spread: number,
  cy: number,
  color: string,
  maxR: number,
): void {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996;
    const rad = spread * Math.sqrt((i + 0.5) / count);
    const x = Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad * 0.82;
    const r = maxR * (0.45 + ((i * 7) % 5) / 9);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

// A gentle breathing squash about a pivot (positive y is DOWN). Wider as it
// "inhales" (amt>0), a touch shorter, anchored at the ground-contact pivotY so the
// chunk swells against the floor rather than scaling about thin air. Caller wraps
// the body draw between save/restore.
function squashAbout(ctx: CanvasRenderingContext2D, pivotY: number, amt: number): void {
  ctx.translate(0, pivotY);
  ctx.scale(1 + amt, 1 - amt * 0.6);
  ctx.translate(0, -pivotY);
}

// ---------------------------------------------------------------------------
// ore_coal — re-framed up; the chunk breathes (silhouette + cracks scale together)
// and a buried ember SMOULDERS with a periodic crackle pop instead of a slow
// bruise-pulse. Twinkle-stars dropped in favour of a single feathered glint.
const COAL_HULL: Array<[number, number]> = [
  [-15, -2], [-12, -11], [-3, -14], [6, -13], [14, -6],
  [16, 4], [11, 14], [1, 18], [-9, 16], [-16, 7],
];

function animCoal(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -5); // re-frame: was sitting ~5.8u low

  // Slow heave + a sharper crackle that briefly swells the chunk as the ember pops.
  const heave = breathe(t, 3.4, 0.03);
  const crackle = beat(t, 2.6, 0.22) * 0.025;
  const grow = heave + crackle;

  groundShadow(ctx, 0, 27, 16, 4.5, -grow * 60, 0.24);

  ctx.save();
  squashAbout(ctx, 18, grow);

  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#5a5862");
  body.addColorStop(0.5, "#2c2a32");
  body.addColorStop(1, "#0a090d");
  ctx.fillStyle = body;
  rockPath(ctx, COAL_HULL);
  ctx.fill();
  ctx.strokeStyle = "#040305";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, COAL_HULL);
  ctx.clip();

  const facets: Array<[Array<[number, number]>, string]> = [
    [[[-12, -10], [-1, -13], [-3, -3], [-13, -1]], "rgba(120,120,135,0.55)"],
    [[[2, -12], [13, -6], [8, 2], [0, -2]], "rgba(80,80,95,0.5)"],
    [[[-10, 2], [-1, 0], [-4, 12], [-12, 7]], "rgba(60,60,72,0.5)"],
    [[[2, 2], [12, 4], [6, 14], [0, 9]], "rgba(95,95,110,0.45)"],
  ];
  facets.forEach(([poly, col]) => {
    ctx.fillStyle = col;
    rockPath(ctx, poly);
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(5,4,8,0.7)";
  ctx.lineWidth = 1;
  [[[-3, -13], [-3, -3], [-4, 12]], [[13, -6], [0, -2], [6, 14]]].forEach((line) => {
    ctx.beginPath();
    line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });

  // Ember: a low resting smoulder (incommensurate breaths) that FLARES on the
  // crackle pop, swelling its radius — reads as heat breathing through the seam.
  const pop = beat(t, 2.6, 0.22);
  const smoulder = 0.16 + (breathe(t, 1.7, 0.5, 0.5) + breathe(t, 0.9, 0.18, 0)) * 0.5;
  const ember = clamp01(smoulder) * 0.5 + pop * 0.4;
  const emY = 5 + breathe(t, 2.2, 1.0);
  const emR = 11 + pop * 4;
  const glow = ctx.createRadialGradient(0, emY, 1, 0, emY, emR);
  glow.addColorStop(0, `rgba(255,120,48,${ember})`);
  glow.addColorStop(0.55, `rgba(196,48,20,${ember * 0.42})`);
  glow.addColorStop(1, "rgba(120,20,10,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, emY, emR, 0, TAU);
  ctx.fill();

  // A single tiny spark lifts off the seam at the top of each pop.
  if (pop > 0.05) {
    sparkle(ctx, -1, emY - 6 - pop * 5, 1.2 + pop * 1.2, pop * 0.8, "255,180,90");
  }

  // Demoted feathered anthracite sheen across the glossy facets (secondary).
  glint(ctx, loopPhase(t, 3.8), { span: 18, width: 6, angle: -0.7, intensity: 0.26, length: 40 });
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ore_iron — re-framed up; breathes, and the rust veins glow in a TRAVELLING WAVE
// (a band of heat sweeps left→right along the haematite) that flares brightest as
// the feathered specular crosses. No more lone glint wipe on a frozen body.
const IRON_HULL: Array<[number, number]> = [
  [-16, 0], [-13, -10], [-4, -14], [5, -13], [13, -8],
  [16, 2], [12, 12], [3, 18], [-7, 16], [-15, 9],
];

function animIron(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -5);

  const grow = breathe(t, 3.0, 0.028);
  const sweep = loopPhase(t, 2.8); // 0..1 specular pass left→right
  const sweepX = -16 + sweep * 32; // band centre in body-x

  groundShadow(ctx, 0, 27, 16, 4.5, -grow * 60, 0.24);

  ctx.save();
  squashAbout(ctx, 18, grow);

  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#9a948c");
  body.addColorStop(0.55, "#6a655e");
  body.addColorStop(1, "#383430");
  ctx.fillStyle = body;
  rockPath(ctx, IRON_HULL);
  ctx.fill();
  ctx.strokeStyle = "#241f1b";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, IRON_HULL);
  ctx.clip();

  ctx.fillStyle = "rgba(40,36,32,0.32)";
  rockPath(ctx, [[2, -6], [14, 0], [8, 12], [0, 6]]);
  ctx.fill();

  const veins: Array<[Array<[number, number]>, number]> = [
    [[[-13, -4], [-6, -1], [2, -4], [11, -1]], 3.4],
    [[[-10, 8], [-2, 5], [6, 9], [13, 6]], 2.8],
    [[[-8, -10], [-2, -7], [4, -11]], 2.2],
  ];
  // Heat-band: each vein segment brightens by its distance from the sweep centre,
  // so a glow ripples along the rust rather than the whole vein blinking at once.
  veins.forEach(([pts, lw]) => {
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, y0] = pts[s];
      const [x1, y1] = pts[s + 1];
      const midX = (x0 + x1) / 2;
      const heat = clamp01(1 - Math.abs(midX - sweepX) / 9);
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      const lit = `rgb(${Math.round(196 + heat * 50)},${Math.round(88 + heat * 70)},${Math.round(42 + heat * 40)})`;
      g.addColorStop(0, "#8a3a1c");
      g.addColorStop(0.5, lit);
      g.addColorStop(1, "#7a3018");
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  });
  ctx.lineCap = "butt";

  speckle(ctx, 11, 13, 2, "rgba(160,70,36,0.85)", 1.5);
  speckle(ctx, 9, 12, 2, "rgba(36,30,26,0.5)", 1.2);

  // Bright specular glint sweeping with the heat-band (feathered, body-clipped).
  glint(ctx, sweep, { span: 18, width: 5, angle: -0.55, intensity: 0.34, length: 40, warm: true });
  ctx.restore();

  // Metallic specular dots on the veins; the one under the sweep flares to a spark.
  ctx.fillStyle = "rgba(255,210,170,0.8)";
  ([[-3, -3, 1], [6, 7, 0.9], [-7, -9, 0.8]] as Array<[number, number, number]>).forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  });
  const flareX = -3;
  const flare = clamp01(1 - Math.abs(flareX - sweepX) / 6);
  sparkle(ctx, flareX, -3, 1.6 + flare * 1.4, 0.35 + flare * 0.55, "255,220,180");

  // Rock rim highlight (welded to the body, breathes with it).
  ctx.strokeStyle = "rgba(220,212,200,0.45)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -3);
  ctx.bezierCurveTo(-10, -11, 0, -14, 6, -12);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ore_copper — re-framed up; breathes, and the verdigris patina BLOOMS organically
// (each fleck swells + brightens on its own slow phase), with the warm veins
// flaring as the feathered sweep crosses. The nice shimmer is brought forward.
const COPPER_HULL: Array<[number, number]> = [
  [-16, 2], [-12, -9], [-3, -14], [7, -12], [15, -5],
  [16, 6], [9, 15], [-1, 18], [-10, 14], [-16, 8],
];

function animCopper(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -5);

  const grow = breathe(t, 3.2, 0.028);
  const sweep = loopPhase(t, 3.0);
  const sweepX = -16 + sweep * 32;

  groundShadow(ctx, 0, 27, 16, 4.5, -grow * 60, 0.24);

  ctx.save();
  squashAbout(ctx, 18, grow);

  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#969088");
  body.addColorStop(0.55, "#666058");
  body.addColorStop(1, "#34302b");
  ctx.fillStyle = body;
  rockPath(ctx, COPPER_HULL);
  ctx.fill();
  ctx.strokeStyle = "#221e1a";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, COPPER_HULL);
  ctx.clip();

  ctx.fillStyle = "rgba(38,34,30,0.3)";
  rockPath(ctx, [[3, -4], [14, 2], [6, 13], [-1, 7]]);
  ctx.fill();

  const veins: Array<[Array<[number, number]>, number]> = [
    [[[-13, -2], [-5, 1], [4, -3], [13, 1]], 3.6],
    [[[-9, 9], [0, 6], [9, 10]], 2.8],
    [[[-6, -10], [1, -6], [9, -9]], 2.4],
  ];
  veins.forEach(([pts, lw]) => {
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, y0] = pts[s];
      const [x1, y1] = pts[s + 1];
      const midX = (x0 + x1) / 2;
      const heat = clamp01(1 - Math.abs(midX - sweepX) / 9);
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      const lit = `rgb(255,${Math.round(138 + heat * 70)},${Math.round(58 + heat * 50)})`;
      g.addColorStop(0, "#a8521c");
      g.addColorStop(0.5, lit);
      g.addColorStop(1, "#c0541a");
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  });
  ctx.lineCap = "butt";

  // Verdigris patina blooms: radius + alpha swell on each fleck's own slow cycle
  // (offset phases) so the green creeps and recedes like oxidation breathing.
  const patina: Array<[number, number, number, number]> = [
    [-8, 4, 2.2, 0], [10, 5, 1.8, 0.26], [-2, -7, 1.6, 0.52],
    [6, 11, 1.7, 0.16], [-11, -3, 1.4, 0.68],
  ];
  patina.forEach(([x, y, r, ph]) => {
    const bloom = breathe(t, 4.2, 0.5, 0.5, ph); // 0..1
    const rr = r * (0.78 + bloom * 0.5);
    const grad = ctx.createRadialGradient(x, y, 0.4, x, y, rr);
    grad.addColorStop(0, `rgba(74,200,160,${0.55 + bloom * 0.35})`);
    grad.addColorStop(0.7, `rgba(48,176,140,${0.4 + bloom * 0.3})`);
    grad.addColorStop(1, "rgba(40,150,120,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, rr, rr * 0.82, 0.4, 0, TAU);
    ctx.fill();
  });
  speckle(ctx, 9, 12, 2, "rgba(210,120,50,0.8)", 1.3);
  speckle(ctx, 7, 11, 2, "rgba(34,28,24,0.5)", 1.1);

  glint(ctx, sweep, { span: 18, width: 5, angle: -0.5, intensity: 0.32, length: 40, warm: true });
  ctx.restore();

  ctx.fillStyle = "rgba(255,225,180,0.85)";
  ([[-2, -1, 1.1], [8, 8, 0.9], [3, -7, 0.8]] as Array<[number, number, number]>).forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  });

  ctx.strokeStyle = "rgba(218,210,198,0.45)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -1);
  ctx.bezierCurveTo(-9, -10, 1, -13, 8, -11);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ore_gold_nugget — re-framed up; a soft springy squash-jiggle (the liveliest ore,
// now with a moving body), the pillow-shaded bumps relit from ONE top-left key, and
// the wandering twinkle turned into a clean PING that hops between facets.
function goldPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.bezierCurveTo(-16, -9, -8, -14, -2, -12);
  ctx.bezierCurveTo(2, -16, 11, -13, 12, -6);
  ctx.bezierCurveTo(18, -4, 17, 6, 12, 9);
  ctx.bezierCurveTo(14, 16, 4, 19, -1, 16);
  ctx.bezierCurveTo(-6, 20, -15, 15, -13, 8);
  ctx.bezierCurveTo(-18, 4, -17, -1, -13, -2);
  ctx.closePath();
}

function animGoldNugget(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -5);

  // Jiggle beat: rest, then a quick squash that springs back (easeOutBack settle).
  const jig = loopPhase(t, 2.8);
  const kick = jig < 0.4 ? Math.sin(easeOutBack(jig / 0.4, 2.4) * Math.PI) : 0;
  const grow = breathe(t, 3.6, 0.02) + kick * 0.05;

  groundShadow(ctx, 0, 26, 15, 4.2, -grow * 60, 0.24);

  ctx.save();
  squashAbout(ctx, 17, grow);

  const body = ctx.createRadialGradient(-5, -6, 3, 2, 6, 26);
  body.addColorStop(0, "#fff4b0");
  body.addColorStop(0.45, "#f5c128");
  body.addColorStop(0.8, "#c88810");
  body.addColorStop(1, "#7a4c04");
  ctx.fillStyle = body;
  goldPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#5a3604";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  goldPath(ctx);
  ctx.clip();

  // Bumps relit from ONE key (top-left): bright crescent offset toward the light,
  // a dark crescent on the lower-right — replaces the centred pillow-shading.
  const bumps: Array<[number, number, number]> = [
    [-7, -6, 4.5], [4, -7, 4], [9, 0, 3.6], [-9, 4, 3.6],
    [0, 3, 4.2], [6, 8, 3.2], [-3, 10, 3],
  ];
  bumps.forEach(([x, y, r]) => {
    // shaded base
    const shade = ctx.createRadialGradient(x + r * 0.4, y + r * 0.4, 0.5, x, y, r);
    shade.addColorStop(0, "rgba(120,72,4,0.4)");
    shade.addColorStop(0.7, "rgba(200,136,16,0)");
    shade.addColorStop(1, "rgba(120,72,4,0.3)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    // top-left highlight
    const hx = x - r * 0.42;
    const hy = y - r * 0.42;
    const lit = ctx.createRadialGradient(hx, hy, 0.4, hx, hy, r * 0.9);
    lit.addColorStop(0, "rgba(255,250,200,0.95)");
    lit.addColorStop(0.6, "rgba(255,232,140,0.25)");
    lit.addColorStop(1, "rgba(255,232,140,0)");
    ctx.fillStyle = lit;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.9, 0, TAU);
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(110,66,4,0.45)";
  ctx.lineWidth = 1.2;
  [[[-3, -10], [-1, -2], [-5, 6]], [[8, -5], [4, 2], [7, 9]]].forEach((line) => {
    ctx.beginPath();
    line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });

  // Two offset feathered sheens travelling across the lustrous bumps (it's gold).
  glint(ctx, loopPhase(t, 2.4), { span: 20, width: 5, angle: -0.6, intensity: 0.34, length: 38, warm: true });
  glint(ctx, loopPhase(t, 2.4, 0.5), { span: 20, width: 4, angle: -0.6, intensity: 0.22, length: 38, warm: true });
  ctx.restore();

  // Steady specular anchors (top-left key) + a clean wandering PING that hops
  // facet→facet once per beat (a single bright pop, not a constant shimmer).
  sparkle(ctx, -6, -7, 2.6, 0.9, "255,250,210");
  sparkle(ctx, 8, 1, 1.8, 0.6, "255,244,180");
  const spots: Array<[number, number]> = [[3, -4], [9, 5], [-9, 2], [-1, 9]];
  const idx = Math.floor(loopPhase(t, 3.6) * spots.length) % spots.length;
  const ping = twinkle(t, 0.9);
  const [px, py] = spots[idx];
  sparkle(ctx, px, py, 1.3 + ping * 1.8, ping * 0.9, "255,252,220");
  ctx.restore(); // squash
  ctx.restore(); // outer translate(0,-5) — was leaking, drifting the nugget off-cell
}

// ---------------------------------------------------------------------------
// ore_silver — re-framed up; breathes, the bright streaks FLASH as the mirror sweep
// crosses them (high-contrast specular travelling along), and a cool blue rim
// brightens behind the sweep — the low-contrast frozen body now reads as polished.
const SILVER_HULL: Array<[number, number]> = [
  [-16, 1], [-12, -10], [-2, -14], [6, -13], [15, -6],
  [16, 5], [10, 14], [0, 18], [-9, 15], [-16, 8],
];

function animSilver(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -5);

  const grow = breathe(t, 3.1, 0.026);
  const sweep = loopPhase(t, 2.5);
  const sweepX = -16 + sweep * 32;

  groundShadow(ctx, 0, 27, 16, 4.5, -grow * 60, 0.24);

  ctx.save();
  squashAbout(ctx, 18, grow);

  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#9c9aa0");
  body.addColorStop(0.55, "#6b696f");
  body.addColorStop(1, "#37363b");
  ctx.fillStyle = body;
  rockPath(ctx, SILVER_HULL);
  ctx.fill();
  ctx.strokeStyle = "#211f24";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, SILVER_HULL);
  ctx.clip();

  ctx.fillStyle = "rgba(34,32,38,0.32)";
  rockPath(ctx, [[2, -5], [14, 1], [7, 13], [-1, 6]]);
  ctx.fill();

  const streaks: Array<[Array<[number, number]>, number]> = [
    [[[-13, -3], [-4, 0], [5, -4], [13, 0]], 3.6],
    [[[-10, 8], [-1, 5], [8, 9]], 2.8],
    [[[-5, -11], [2, -7], [10, -10]], 2.4],
  ];
  // Each streak segment flashes to near-white as the mirror sweep passes it.
  streaks.forEach(([pts, lw]) => {
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, y0] = pts[s];
      const [x1, y1] = pts[s + 1];
      const midX = (x0 + x1) / 2;
      const flash = clamp01(1 - Math.abs(midX - sweepX) / 7);
      const peak = Math.round(214 + flash * 41);
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "#b6b8c0");
      g.addColorStop(0.5, `rgb(${peak},${peak},${Math.min(255, peak + 6)})`);
      g.addColorStop(1, "#9a9ca6");
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  });
  ctx.lineCap = "butt";

  speckle(ctx, 9, 12, 2, "rgba(235,238,245,0.85)", 1.3);
  speckle(ctx, 8, 11, 2, "rgba(32,30,36,0.5)", 1.1);

  // Cool blue rim glow trailing behind the bright sweep (gives silver its temperature).
  const rimA = 0.18 + Math.sin(sweep * Math.PI) * 0.18;
  ctx.strokeStyle = `rgba(150,180,230,${rimA})`;
  ctx.lineWidth = 2.4;
  rockPath(ctx, SILVER_HULL);
  ctx.stroke();

  glint(ctx, sweep, { span: 18, width: 4.5, angle: -0.55, intensity: 0.4, length: 40 });
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ([[-3, -2, 1.2], [7, 7, 0.9], [4, -8, 0.8]] as Array<[number, number, number]>).forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  });

  // A streak-tip spark snaps bright as the sweep clears the right edge.
  const snapX = 7;
  const snap = clamp01(1 - Math.abs(snapX - sweepX) / 6);
  sparkle(ctx, snapX, 7, 1.4 + snap * 1.8, 0.4 + snap * 0.55, "240,248,255");

  ctx.strokeStyle = "rgba(224,222,230,0.5)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.bezierCurveTo(-9, -11, 1, -14, 7, -12);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ore_obsidian — re-framed & recentred; the glassy shard SWAYS on an eased pivot at
// its base (no whole-sprite spin, no seam teleport), a caustic tip-flare pings at
// the point, and TWO offset refractive sheens drift down the glass.
const OBSIDIAN_HULL: Array<[number, number]> = [
  [-4, -20], [6, -12], [13, 2], [9, 14], [-2, 19],
  [-12, 11], [-15, -2], [-9, -12],
];

function animObsidian(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0.5, -3); // re-frame: off ≈ (-0.5, +2.8)

  // Eased tilt-sway: rock about the base contact point, decelerating at each turn
  // (pingPong → no triangle teleport). A slow breathe rides on top.
  const sway = (pingPong(t, 4.6) * 2 - 1) * 0.07;
  const grow = breathe(t, 3.4, 0.022);

  groundShadow(ctx, sway * 12, 26, 13, 4, -grow * 50, 0.22);

  ctx.save();
  ctx.translate(0, 18);
  ctx.rotate(sway);
  ctx.scale(1 + grow, 1 - grow * 0.5);
  ctx.translate(0, -18);

  const body = ctx.createLinearGradient(-12, -16, 12, 16);
  body.addColorStop(0, "#3a3450");
  body.addColorStop(0.45, "#15121f");
  body.addColorStop(1, "#020103");
  ctx.fillStyle = body;
  rockPath(ctx, OBSIDIAN_HULL);
  ctx.fill();
  ctx.strokeStyle = "#010002";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, OBSIDIAN_HULL);
  ctx.clip();

  const facets: Array<[Array<[number, number]>, string]> = [
    [[[-4, -20], [6, -12], [-1, -2], [-9, -12]], "rgba(120,90,180,0.42)"],
    [[[6, -12], [13, 2], [4, 6], [-1, -2]], "rgba(60,46,96,0.5)"],
    [[[-9, -12], [-1, -2], [-7, 6], [-15, -2]], "rgba(90,70,140,0.32)"],
    [[[4, 6], [9, 14], [-2, 19], [-7, 6], [-1, -2]], "rgba(20,16,30,0.5)"],
  ];
  facets.forEach(([poly, col]) => {
    ctx.fillStyle = col;
    rockPath(ctx, poly);
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(150,120,210,0.4)";
  ctx.lineWidth = 1;
  [[[-1, -2], [4, 6]], [[-1, -2], [-7, 6]], [[-1, -2], [-9, -12]]].forEach((line) => {
    ctx.beginPath();
    line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });

  // Two refractive sheens drifting DOWN the glass on offset phases — purple-tinted
  // and white, so the light reads as bending through the volcanic glass.
  glint(ctx, loopPhase(t, 3.2), { span: 18, width: 5, angle: 1.45, intensity: 0.34, length: 44 });
  glint(ctx, loopPhase(t, 3.2, 0.45), { span: 16, width: 4, angle: 1.2, intensity: 0.2, length: 40 });
  ctx.restore();

  // Static glossy specular streak down the glass (welded, sways with the shard).
  ctx.strokeStyle = "rgba(200,180,255,0.55)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-2, -16);
  ctx.bezierCurveTo(-6, -6, -4, 6, -3, 15);
  ctx.stroke();

  // Caustic tip-flare: a bright point pings at the apex on a periodic beat.
  const flare = beat(t, 3.0, 0.3);
  sparkle(ctx, 1, -17, 1.8 + flare * 2.4, 0.4 + flare * 0.55, "230,215,255");
  sparkle(ctx, -7, 2, 1.6, 0.5, "200,180,255");
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ore_sulfur — re-framed; the crystal cluster breathes, the per-crystal lit-face
// shimmer becomes a TRAVELLING WAVE across the cluster, a spark drifts up off the
// tips, and the muddy base is re-rendered cleaner/cooler.
const SULFUR_BASE: Array<[number, number]> = [
  [-15, 8], [-9, 4], [2, 6], [12, 3], [16, 9], [13, 18], [-2, 20], [-14, 17],
];

function animSulfur(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-0.5, -4); // re-frame: off ≈ (+0.5, +4.0)

  const grow = breathe(t, 3.3, 0.024);

  groundShadow(ctx, 0, 27, 16, 4.5, -grow * 50, 0.24);

  // Re-rendered base: deeper, cleaner cool-grey matrix (less muddy than the old fill).
  const base = ctx.createLinearGradient(0, 4, 0, 22);
  base.addColorStop(0, "#4a463e");
  base.addColorStop(1, "#221f19");
  ctx.fillStyle = base;
  rockPath(ctx, SULFUR_BASE);
  ctx.fill();
  ctx.strokeStyle = "#161208";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  rockPath(ctx, SULFUR_BASE);
  ctx.clip();
  speckle(ctx, 8, 13, 13, "rgba(16,12,6,0.55)", 1.2);
  // a faint warm bounce from the crystals onto the base lip
  ctx.fillStyle = "rgba(180,150,40,0.12)";
  rockPath(ctx, [[-9, 4], [2, 6], [12, 3], [10, 9], [-2, 10], [-9, 8]]);
  ctx.fill();
  ctx.restore();

  // Crystal cluster breathes as one (scaled about the base contact).
  ctx.save();
  ctx.translate(0, 10);
  ctx.scale(1 + grow, 1 - grow * 0.4);
  ctx.translate(0, -10);

  // Soft pulsing glow behind the cluster, in step with the breathe.
  const glowA = 0.14 + (breathe(t, 2.0, 0.5, 0.5)) * 0.3;
  const glow = ctx.createRadialGradient(0, -6, 1, 0, -6, 16);
  glow.addColorStop(0, `rgba(255,238,120,${glowA})`);
  glow.addColorStop(0.6, `rgba(232,192,32,${glowA * 0.4})`);
  glow.addColorStop(1, "rgba(232,192,32,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -6, 16, 0, TAU);
  ctx.fill();

  type Crystal = { x: number; base: number; top: number; w: number };
  const crystals: Crystal[] = [
    { x: -9, base: 9, top: -3, w: 4.5 },
    { x: 9, base: 8, top: -5, w: 4.5 },
    { x: -1, base: 11, top: -7, w: 4 },
    { x: 4, base: 10, top: -13, w: 5 },
    { x: -5, base: 10, top: -16, w: 5.5 },
  ];
  crystals.forEach((c) => {
    const w = c.w;
    // Travelling wave: brightness peak sweeps left→right across the cluster by x.
    const wavePos = (loopPhase(t, 2.6) * 2 - 1) * 11; // -11..+11 sweep centre
    const sh = clamp01(1 - Math.abs(c.x - wavePos) / 8) * 0.22;
    const left = ctx.createLinearGradient(c.x - w, c.base, c.x, c.top);
    left.addColorStop(0, "#e8c020");
    left.addColorStop(1, `rgb(255,${Math.round(240 + sh * 60)},${Math.round(154 + sh * 200)})`);
    const right = ctx.createLinearGradient(c.x, c.top, c.x + w, c.base);
    right.addColorStop(0, "#f0d040");
    right.addColorStop(1, "#b88a0c");

    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(c.x - w, c.base);
    ctx.lineTo(c.x, c.base + 1);
    ctx.lineTo(c.x, c.top + 4);
    ctx.lineTo(c.x - w + 1, c.top + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(c.x + w, c.base);
    ctx.lineTo(c.x, c.base + 1);
    ctx.lineTo(c.x, c.top + 4);
    ctx.lineTo(c.x + w - 1, c.top + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff4b0";
    ctx.beginPath();
    ctx.moveTo(c.x - w + 1, c.top + 5);
    ctx.lineTo(c.x, c.top);
    ctx.lineTo(c.x, c.top + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d6a814";
    ctx.beginPath();
    ctx.moveTo(c.x + w - 1, c.top + 5);
    ctx.lineTo(c.x, c.top);
    ctx.lineTo(c.x, c.top + 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#7a5604";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x - w, c.base);
    ctx.lineTo(c.x - w + 1, c.top + 5);
    ctx.lineTo(c.x, c.top);
    ctx.lineTo(c.x + w - 1, c.top + 5);
    ctx.lineTo(c.x + w, c.base);
    ctx.stroke();
    ctx.strokeStyle = "rgba(122,86,4,0.6)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(c.x, c.base + 1);
    ctx.lineTo(c.x, c.top);
    ctx.stroke();
  });

  // Tip sparks that ride the wave; the lead tip flares brightest.
  const wavePos = (loopPhase(t, 2.6) * 2 - 1) * 11;
  ([[-5, -14], [5, -11], [9, -3]] as Array<[number, number]>).forEach(([x, y]) => {
    const lit = clamp01(1 - Math.abs(x - wavePos) / 7);
    sparkle(ctx, x, y, 1.6 + lit * 1.6, 0.45 + lit * 0.5, "255,244,170");
  });

  // A single ember-like spark drifts UP off the tallest tip and fades (loops).
  const dp = loopPhase(t, 3.4);
  const dy = -16 - dp * 9;
  const dx = -5 + Math.sin(dp * Math.PI * 2) * 2;
  sparkle(ctx, dx, dy, 1.0 + (1 - dp) * 0.8, Math.sin(dp * Math.PI) * 0.7, "255,236,140");
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ore_crystal_vein — re-framed up; the deadest ore now AWAKENS: the inner glow
// pulses and BLEEDS onto the rock rim around the split, the shards shimmer in a
// travelling wave, a caustic flare pings from the cavity, and the whole geode
// breathes ~1.02.
const CRYSTAL_HULL: Array<[number, number]> = [
  [-16, 0], [-12, -11], [-2, -14], [7, -13], [15, -7],
  [16, 4], [11, 14], [1, 18], [-8, 15], [-16, 8],
];
const CRYSTAL_CAVITY: Array<[number, number]> = [
  [-3, -12], [3, -10], [6, -3], [4, 6], [6, 13],
  [-1, 16], [-5, 9], [-7, 1], [-5, -6],
];

function animCrystalVein(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -5);

  const grow = breathe(t, 3.4, 0.02); // ~1.02 body breathe
  // Inner light "heartbeat": a slow pulse with an eased swell (the awakening).
  const pulseRaw = breathe(t, 2.4, 0.5, 0.5);
  const breath = easeInOutSine(clamp01(pulseRaw));

  groundShadow(ctx, 0, 27, 16, 4.5, -grow * 60, 0.24);

  ctx.save();
  squashAbout(ctx, 18, grow);

  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#928c84");
  body.addColorStop(0.55, "#625d56");
  body.addColorStop(1, "#322e29");
  ctx.fillStyle = body;
  rockPath(ctx, CRYSTAL_HULL);
  ctx.fill();
  ctx.strokeStyle = "#201c18";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, CRYSTAL_HULL);
  ctx.clip();
  speckle(ctx, 10, 13, 2, "rgba(30,26,22,0.5)", 1.2);
  speckle(ctx, 6, 11, 1, "rgba(180,172,162,0.4)", 1);

  // Glow BLEEDS out of the cavity onto the surrounding rock (clipped to the rock,
  // a wide soft halo centred on the slot) — the rim catches the inner light.
  const bleedA = 0.1 + breath * 0.3;
  const bleed = ctx.createRadialGradient(0, 1, 2, 0, 1, 20);
  bleed.addColorStop(0, `rgba(150,255,244,${bleedA})`);
  bleed.addColorStop(0.5, `rgba(110,226,218,${bleedA * 0.4})`);
  bleed.addColorStop(1, "rgba(150,255,244,0)");
  ctx.fillStyle = bleed;
  ctx.beginPath();
  ctx.arc(0, 1, 20, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  rockPath(ctx, CRYSTAL_CAVITY);
  ctx.clip();

  const cav = ctx.createRadialGradient(0, 2, 1, 0, 2, 16);
  cav.addColorStop(0, "#0e3a40");
  cav.addColorStop(1, "#06141a");
  ctx.fillStyle = cav;
  ctx.fillRect(-9, -14, 18, 32);

  const shards: Array<[number, number, number, number]> = [
    [-4, 14, 1, 3],
    [4, 14, -1, 3],
    [-1, 15, -7, 3.6],
    [2, 14, -4, 2.8],
    [0, 15, -11, 4],
  ];
  // Shard shimmer travels up the cluster: the tip nearest the wave-front whitens.
  const waveY = 16 - loopPhase(t, 2.8) * 30; // sweeps from base up to the tips
  shards.forEach(([x, base, top, w]) => {
    const lit = clamp01(1 - Math.abs(top - waveY) / 9);
    const left = ctx.createLinearGradient(x - w, base, x, top);
    left.addColorStop(0, "#7fe8e0");
    left.addColorStop(1, `rgb(${Math.round(230 + lit * 25)},255,255)`);
    const right = ctx.createLinearGradient(x, top, x + w, base);
    right.addColorStop(0, "#9af0ea");
    right.addColorStop(1, "#3aa8b0");

    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(x - w, base);
    ctx.lineTo(x, base + 1);
    ctx.lineTo(x, top + 4);
    ctx.lineTo(x - w + 1, top + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(x + w, base);
    ctx.lineTo(x, base + 1);
    ctx.lineTo(x, top + 4);
    ctx.lineTo(x + w - 1, top + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f4ffff";
    ctx.beginPath();
    ctx.moveTo(x - w + 1, top + 5);
    ctx.lineTo(x, top);
    ctx.lineTo(x, top + 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(20,90,98,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w, base);
    ctx.lineTo(x - w + 1, top + 5);
    ctx.lineTo(x, top);
    ctx.lineTo(x + w - 1, top + 5);
    ctx.lineTo(x + w, base);
    ctx.stroke();
  });

  // Breathing inner glow — radius + brightness pulse (the awakening core).
  const glowR = 9 + breath * 6;
  const glowA = 0.3 + breath * 0.45;
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, glowR);
  glow.addColorStop(0, `rgba(180,255,250,${glowA})`);
  glow.addColorStop(0.55, `rgba(120,232,224,${glowA * 0.4})`);
  glow.addColorStop(1, "rgba(170,255,250,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-9, -14, 18, 32);
  ctx.restore();

  // Cavity rim — brightens slightly with the breath (lit from within).
  ctx.strokeStyle = `rgba(${Math.round(20 + breath * 90)},${Math.round(16 + breath * 130)},${Math.round(8 + breath * 90)},${0.7 + breath * 0.2})`;
  ctx.lineWidth = 1.6;
  rockPath(ctx, CRYSTAL_CAVITY);
  ctx.stroke();

  ctx.strokeStyle = "rgba(214,206,196,0.45)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -3);
  ctx.bezierCurveTo(-10, -11, -3, -14, 4, -13);
  ctx.stroke();

  // Caustic flare pings from the cavity mouth on a beat; tip sparkles ride the wave.
  const flarePop = beat(t, 3.2, 0.28);
  sparkle(ctx, 0, -9, 2.2 + flarePop * 2.2 + breath * 0.8, 0.45 + flarePop * 0.5, "200,255,250");
  const tips: Array<[number, number]> = [[-3, 0], [3, 5], [2, -3]];
  tips.forEach(([x, y]) => {
    const lit = clamp01(1 - Math.abs(y - waveY) / 8);
    sparkle(ctx, x, y, 1.3 + lit * 1.1, (0.4 + breath * 0.3) * (0.5 + lit * 0.5), "210,255,250");
  });
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  ore_coal: animCoal,
  ore_iron: animIron,
  ore_copper: animCopper,
  ore_gold_nugget: animGoldNugget,
  ore_silver: animSilver,
  ore_obsidian: animObsidian,
  ore_sulfur: animSulfur,
  ore_crystal_vein: animCrystalVein,
};
