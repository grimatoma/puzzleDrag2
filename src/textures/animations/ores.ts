// Animated mining-ore icons. Each function redraws the COMPLETE icon at time `t`
// (elapsed seconds), centered at origin within a ~-24..+24 box. The caller
// handles clear / save / translate / scale / lineCap / restore. Motion is
// derived purely from `t` and from indices (no Math.random) so frames are
// deterministic; sweeps and pulses loop seamlessly via Math.sin/cos and modulo.
//
// Each icon mirrors the static silhouette / veins / colors of the matching key
// in `src/textures/categories/ores.ts`, then layers an animated overlay:
//  - glint/sheen sweeps are CLIPPED to the rock silhouette and draw a moving
//    bright diagonal band so the highlight never escapes the rock;
//  - sparkles twinkle on a sin-driven cycle.

const TAU = Math.PI * 2;

// Small 4-point sparkle/specular star centered at (x, y) — matches categories.
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0 || r <= 0) return;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.closePath();
  ctx.fill();
}

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

function shadow(ctx: CanvasRenderingContext2D, rx: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, rx, 4.5, 0, 0, TAU);
  ctx.fill();
}

// A bright diagonal sweep band (perpendicular to direction `ang`) whose center
// offset `phase` runs from one side of the rock to the other. Must be called
// inside an active clip to the rock silhouette. `width` = band half-width.
function sweepBand(
  ctx: CanvasRenderingContext2D,
  phase: number, // -1..1 normalized position across the rock
  reach: number, // half the diagonal extent the band travels (px)
  ang: number, // sweep travel direction (radians)
  width: number,
  color: string,
): void {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  // Band center along the travel direction.
  const cx = dx * phase * reach;
  const cy = dy * phase * reach;
  // Perpendicular axis spans the band length.
  const px = -dy;
  const py = dx;
  const span = 40;
  const grad = ctx.createLinearGradient(
    cx - dx * width,
    cy - dy * width,
    cx + dx * width,
    cy + dy * width,
  );
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - dx * width + px * span, cy - dy * width + py * span);
  ctx.lineTo(cx + dx * width + px * span, cy + dy * width + py * span);
  ctx.lineTo(cx + dx * width - px * span, cy + dy * width - py * span);
  ctx.lineTo(cx - dx * width - px * span, cy - dy * width - py * span);
  ctx.closePath();
  ctx.fill();
}

// Looping triangle wave in -1..1 (period = `period` seconds) for sweep phase
// that re-enters from the same side each cycle (seamless reset off-screen).
function sweepPhase(t: number, period: number, offset = 0): number {
  const u = (((t / period + offset) % 1) + 1) % 1; // 0..1
  return u * 2 - 1; // -1..1
}

// ---------------------------------------------------------------------------

const COAL_HULL: Array<[number, number]> = [
  [-15, -2], [-12, -11], [-3, -14], [6, -13], [14, -6],
  [16, 4], [11, 14], [1, 18], [-9, 16], [-16, 7],
];

function animCoal(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 17);

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

  // Faint ember-red glow pulsing deep within (clipped to the chunk).
  const ember = 0.18 + (Math.sin(t * 1.7) * 0.5 + 0.5) * 0.42;
  const emY = 4 + Math.sin(t * 0.9) * 1.2;
  const glow = ctx.createRadialGradient(0, emY, 1, 0, emY, 13);
  glow.addColorStop(0, `rgba(255,96,40,${ember})`);
  glow.addColorStop(0.6, `rgba(190,40,20,${ember * 0.4})`);
  glow.addColorStop(1, "rgba(120,20,10,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, emY, 13, 0, TAU);
  ctx.fill();

  // Slow moving glint across the glossy facets.
  sweepBand(ctx, sweepPhase(t, 3.6), 24, -0.7, 5, "rgba(190,190,210,0.5)");
  ctx.restore();

  // Specular glints (one twinkles as the sweep passes).
  const tw = 0.6 + (Math.sin(t * 2.1) * 0.5 + 0.5) * 0.35;
  sparkle(ctx, -6, -9, 2.6, tw);
  sparkle(ctx, 7, -4, 2, 0.55);
  sparkle(ctx, -2, 7, 1.5, 0.45);
}

// ---------------------------------------------------------------------------

const IRON_HULL: Array<[number, number]> = [
  [-16, 0], [-13, -10], [-4, -14], [5, -13], [13, -8],
  [16, 2], [12, 12], [3, 18], [-7, 16], [-15, 9],
];

function animIron(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 17);

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
  veins.forEach(([pts, lw]) => {
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, "#8a3a1c");
    g.addColorStop(0.5, "#c4582a");
    g.addColorStop(1, "#7a3018");
    ctx.strokeStyle = g;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  speckle(ctx, 11, 13, 2, "rgba(160,70,36,0.85)", 1.5);
  speckle(ctx, 9, 12, 2, "rgba(36,30,26,0.5)", 1.2);

  // Bright specular glint sweeping across the rusty veins.
  sweepBand(ctx, sweepPhase(t, 2.8), 26, -0.55, 4.5, "rgba(255,220,180,0.6)");
  ctx.restore();

  // Metallic specular dots on veins.
  ctx.fillStyle = "rgba(255,210,170,0.8)";
  [[-3, -3, 1], [6, 7, 0.9], [-7, -9, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  });

  // Tiny sparkle twinkling on a vein.
  const tw = (Math.sin(t * 3.3) * 0.5 + 0.5) ** 2;
  sparkle(ctx, -3, -3, 1.8 + tw * 0.8, 0.4 + tw * 0.5);

  ctx.strokeStyle = "rgba(220,212,200,0.45)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -3);
  ctx.bezierCurveTo(-10, -11, 0, -14, 6, -12);
  ctx.stroke();
}

// ---------------------------------------------------------------------------

const COPPER_HULL: Array<[number, number]> = [
  [-16, 2], [-12, -9], [-3, -14], [7, -12], [15, -5],
  [16, 6], [9, 15], [-1, 18], [-10, 14], [-16, 8],
];

function animCopper(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 17);

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
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, "#a8521c");
    g.addColorStop(0.5, "#ff8a3a");
    g.addColorStop(1, "#c0541a");
    ctx.strokeStyle = g;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // Green patina (verdigris) flecks — subtle shimmer in alpha (offset per fleck).
  const patina: Array<[number, number, number, number]> = [
    [-8, 4, 2.2, 0], [10, 5, 1.8, 1.3], [-2, -7, 1.6, 2.6],
    [6, 11, 1.7, 0.8], [-11, -3, 1.4, 3.4],
  ];
  patina.forEach(([x, y, r, ph]) => {
    const shimmer = 0.6 + (Math.sin(t * 2.2 + ph) * 0.5 + 0.5) * 0.35;
    ctx.fillStyle = `rgba(48,176,140,${shimmer})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0.4, 0, TAU);
    ctx.fill();
  });
  speckle(ctx, 9, 12, 2, "rgba(210,120,50,0.8)", 1.3);
  speckle(ctx, 7, 11, 2, "rgba(34,28,24,0.5)", 1.1);

  // Warm metallic glint sweeping the copper veins.
  sweepBand(ctx, sweepPhase(t, 3.0), 26, -0.5, 4.5, "rgba(255,224,170,0.58)");
  ctx.restore();

  ctx.fillStyle = "rgba(255,225,180,0.85)";
  [[-2, -1, 1.1], [8, 8, 0.9], [3, -7, 0.8]].forEach(([x, y, r]) => {
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
}

// ---------------------------------------------------------------------------

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
  shadow(ctx, 16);

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

  const bumps: Array<[number, number, number]> = [
    [-7, -6, 4.5], [4, -7, 4], [9, 0, 3.6], [-9, 4, 3.6],
    [0, 3, 4.2], [6, 8, 3.2], [-3, 10, 3],
  ];
  bumps.forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
    g.addColorStop(0, "rgba(255,248,190,0.9)");
    g.addColorStop(0.6, "rgba(245,193,40,0)");
    g.addColorStop(1, "rgba(120,72,4,0.35)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(110,66,4,0.45)";
  ctx.lineWidth = 1.2;
  [[[-3, -10], [-1, -2], [-5, 6]], [[8, -5], [4, 2], [7, 9]]].forEach((line) => {
    ctx.beginPath();
    line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });

  // Two bright glints travelling across the lustrous bumps (offset phases).
  sweepBand(ctx, sweepPhase(t, 2.4), 24, -0.6, 4, "rgba(255,252,210,0.7)");
  sweepBand(ctx, sweepPhase(t, 2.4, 0.5), 24, -0.6, 3, "rgba(255,244,170,0.5)");
  ctx.restore();

  // Bright specular glints with a periodic twinkle (it's gold — extra shiny).
  const tw = (Math.sin(t * 2.6) * 0.5 + 0.5) ** 3;
  sparkle(ctx, -6, -7, 3 + tw * 1.4, 0.95);
  sparkle(ctx, 8, 1, 2.2, 0.7 + tw * 0.25);
  sparkle(ctx, -1, 9, 1.6, 0.55);
  // A wandering twinkle that pops at random-feeling spots (deterministic).
  const wi = Math.floor(t / 0.9) % 3;
  const spots: Array<[number, number]> = [[3, -4], [9, 5], [-9, 2]];
  const wf = (Math.sin((t / 0.9) * Math.PI) ** 2);
  const [sx, sy] = spots[wi];
  sparkle(ctx, sx, sy, 1.4 + wf * 1.6, wf * 0.9);
}

// ---------------------------------------------------------------------------

const SILVER_HULL: Array<[number, number]> = [
  [-16, 1], [-12, -10], [-2, -14], [6, -13], [15, -6],
  [16, 5], [10, 14], [0, 18], [-9, 15], [-16, 8],
];

function animSilver(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 17);

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
  streaks.forEach(([pts, lw]) => {
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, "#b6b8c0");
    g.addColorStop(0.5, "#ffffff");
    g.addColorStop(1, "#9a9ca6");
    ctx.strokeStyle = g;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  speckle(ctx, 9, 12, 2, "rgba(235,238,245,0.85)", 1.3);
  speckle(ctx, 8, 11, 2, "rgba(32,30,36,0.5)", 1.1);

  // Crisp white glint sweeping the silver streaks.
  sweepBand(ctx, sweepPhase(t, 2.5), 26, -0.55, 3.6, "rgba(255,255,255,0.72)");
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  [[-3, -2, 1.2], [7, 7, 0.9], [4, -8, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  });

  // Quick twinkle that snaps brightly then fades.
  const tw = (Math.sin(t * 4.0) * 0.5 + 0.5) ** 4;
  sparkle(ctx, 7, 7, 1.4 + tw * 1.8, 0.4 + tw * 0.55);

  ctx.strokeStyle = "rgba(224,222,230,0.5)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.bezierCurveTo(-9, -11, 1, -14, 7, -12);
  ctx.stroke();
}

// ---------------------------------------------------------------------------

const OBSIDIAN_HULL: Array<[number, number]> = [
  [-4, -20], [6, -12], [13, 2], [9, 14], [-2, 19],
  [-12, 11], [-15, -2], [-9, -12],
];

function animObsidian(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 15);

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

  // Purple/white sheen band sweeping down the glassy shard (vertical travel).
  const ph = sweepPhase(t, 3.2);
  const dx = Math.cos(1.45);
  const dy = Math.sin(1.45);
  const cx = dx * ph * 24;
  const cy = dy * ph * 24;
  const px = -dy;
  const py = dx;
  const span = 32;
  const width = 5;
  const grad = ctx.createLinearGradient(cx - dx * width, cy - dy * width, cx + dx * width, cy + dy * width);
  grad.addColorStop(0, "rgba(160,120,255,0)");
  grad.addColorStop(0.4, "rgba(160,120,255,0.4)");
  grad.addColorStop(0.5, "rgba(235,225,255,0.6)");
  grad.addColorStop(0.6, "rgba(160,120,255,0.4)");
  grad.addColorStop(1, "rgba(160,120,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - dx * width + px * span, cy - dy * width + py * span);
  ctx.lineTo(cx + dx * width + px * span, cy + dy * width + py * span);
  ctx.lineTo(cx + dx * width - px * span, cy + dy * width - py * span);
  ctx.lineTo(cx - dx * width - px * span, cy - dy * width - py * span);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Static glossy specular streak down the glass.
  ctx.strokeStyle = "rgba(200,180,255,0.55)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-2, -16);
  ctx.bezierCurveTo(-6, -6, -4, 6, -3, 15);
  ctx.stroke();

  // Sharp specular glint that flares as the sheen passes the top facet.
  const flare = (Math.sin(t * (TAU / 3.2)) * 0.5 + 0.5) ** 3;
  sparkle(ctx, 4, -8, 2.6 + flare * 1.6, 0.6 + flare * 0.35);
  sparkle(ctx, -7, 2, 1.8, 0.55);
}

// ---------------------------------------------------------------------------

const SULFUR_BASE: Array<[number, number]> = [
  [-15, 8], [-9, 4], [2, 6], [12, 3], [16, 9], [13, 18], [-2, 20], [-14, 17],
];

function animSulfur(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 16);

  const base = ctx.createLinearGradient(0, 8, 0, 22);
  base.addColorStop(0, "#5a544a");
  base.addColorStop(1, "#2e2a22");
  ctx.fillStyle = base;
  rockPath(ctx, SULFUR_BASE);
  ctx.fill();
  ctx.strokeStyle = "#1c1812";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  rockPath(ctx, SULFUR_BASE);
  ctx.clip();
  speckle(ctx, 8, 13, 13, "rgba(20,16,10,0.5)", 1.2);
  ctx.restore();

  // Soft pulsing glow behind the crystal cluster.
  const pulse = 0.5 + Math.sin(t * 2.0) * 0.5; // 0..1
  const glow = ctx.createRadialGradient(0, -6, 1, 0, -6, 16);
  glow.addColorStop(0, `rgba(255,238,120,${0.12 + pulse * 0.3})`);
  glow.addColorStop(0.6, `rgba(232,192,32,${0.05 + pulse * 0.12})`);
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
  crystals.forEach((c, ci) => {
    const w = c.w;
    // Per-crystal shimmer brightens the lit face slightly (offset phase).
    const sh = (Math.sin(t * 2.4 + ci * 1.1) * 0.5 + 0.5) * 0.12;
    const left = ctx.createLinearGradient(c.x - w, c.base, c.x, c.top);
    left.addColorStop(0, "#e8c020");
    left.addColorStop(1, `rgba(255,${Math.round(240 + sh * 90)},${Math.round(154 + sh * 200)},1)`);
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

  // Faint sparkle twinkling on the tallest crystal tips.
  const tw = (Math.sin(t * 3.1) * 0.5 + 0.5) ** 2;
  sparkle(ctx, -5, -14, 2.8 + tw * 1.0, 0.7 + tw * 0.25);
  sparkle(ctx, 5, -11, 2, 0.6);
  sparkle(ctx, 9, -3, 1.6, 0.45 + tw * 0.3);
}

// ---------------------------------------------------------------------------

const CRYSTAL_HULL: Array<[number, number]> = [
  [-16, 0], [-12, -11], [-2, -14], [7, -13], [15, -7],
  [16, 4], [11, 14], [1, 18], [-8, 15], [-16, 8],
];
const CRYSTAL_CAVITY: Array<[number, number]> = [
  [-3, -12], [3, -10], [6, -3], [4, 6], [6, 13],
  [-1, 16], [-5, 9], [-7, 1], [-5, -6],
];

function animCrystalVein(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 17);

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
  shards.forEach(([x, base, top, w]) => {
    const left = ctx.createLinearGradient(x - w, base, x, top);
    left.addColorStop(0, "#7fe8e0");
    left.addColorStop(1, "#e6ffff");
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

  // Breathing inner glow — radius + brightness pulse.
  const breath = Math.sin(t * 1.6) * 0.5 + 0.5; // 0..1
  const glowR = 9 + breath * 6;
  const glowA = 0.3 + breath * 0.45;
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, glowR);
  glow.addColorStop(0, `rgba(180,255,250,${glowA})`);
  glow.addColorStop(0.55, `rgba(120,232,224,${glowA * 0.4})`);
  glow.addColorStop(1, "rgba(170,255,250,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-9, -14, 18, 32);
  ctx.restore();

  ctx.strokeStyle = "#141008";
  ctx.lineWidth = 1.6;
  rockPath(ctx, CRYSTAL_CAVITY);
  ctx.stroke();

  ctx.strokeStyle = "rgba(214,206,196,0.45)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -3);
  ctx.bezierCurveTo(-10, -11, -3, -14, 4, -13);
  ctx.stroke();

  // Sparkles twinkling on the crystal tips (offset phases, brighten with breath).
  const tips: Array<[number, number, number, number]> = [
    [0, -9, 2.8, 0], [-3, 0, 1.8, 1.6], [3, 5, 1.5, 3.0], [2, -3, 1.4, 4.4],
  ];
  tips.forEach(([x, y, r, ph]) => {
    const tw = (Math.sin(t * 3.4 + ph) * 0.5 + 0.5) ** 2;
    sparkle(ctx, x, y, r + tw * 1.2, (0.45 + breath * 0.3) * (0.4 + tw * 0.6));
  });
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
