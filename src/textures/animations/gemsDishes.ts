// Gems & dishes — animated variants.
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds). The caller
// clears, translates to center, scales, sets lineCap/lineJoin="round", and
// calls us; we only draw at origin (0,0) within a ~-24..+24 box. Everything is
// deterministic in `t` (no Math.random) and loops seamlessly (modulo / sin).
//
// Self-contained: no imports. Shapes/colors mirror
// src/textures/categories/gems.ts and dishes.ts so identity reads the same —
// just alive (a shine sweep + twinkles for gems, steam/bubbles/drips for food).

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// 4-point sparkle star centered at (x, y) — mirrors gems.ts `sparkle`.
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
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

// A bright diagonal "shine" band swept across the current clip region. `phase`
// in [0,1) loops the band from upper-left to lower-right. Width ~ box span.
function shineSweep(ctx: CanvasRenderingContext2D, phase: number, intensity: number): void {
  // Band travels along the diagonal from (-30,-30) toward (30,30).
  const travel = -34 + phase * 68;
  ctx.save();
  ctx.translate(travel, travel * 0.2);
  ctx.rotate(-Math.PI / 4);
  const grad = ctx.createLinearGradient(-8, 0, 8, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, `rgba(255,255,255,${intensity})`);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-8, -40, 16, 80);
  ctx.restore();
}

// Twinkle alpha that pulses: peaks once per `period` seconds, offset by `off`.
function twinkle(t: number, period: number, off: number): number {
  const ph = ((t / period + off) % 1 + 1) % 1;
  // Sharp-ish pulse: bright briefly, dim most of the cycle.
  const s = Math.sin(ph * Math.PI);
  return s * s * s;
}

// ---------------------------------------------------------------------------
// GEMS — static silhouette + facets, then a clipped shine sweep + twinkles,
// with the whole gem gently "breathing" (scale).
// ---------------------------------------------------------------------------

function rubyShape(ctx: CanvasRenderingContext2D): void {
  ctx.moveTo(0, -16);
  ctx.lineTo(16, -8);
  ctx.lineTo(18, -2);
  ctx.lineTo(0, 22);
  ctx.lineTo(-18, -2);
  ctx.lineTo(-16, -8);
  ctx.closePath();
}

function rubyBody(ctx: CanvasRenderingContext2D): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(-4, -6, 2, 0, 2, 24);
  body.addColorStop(0, "#ff6a7a");
  body.addColorStop(0.5, "#d4143a");
  body.addColorStop(1, "#6a0418");
  ctx.fillStyle = body;
  ctx.beginPath();
  rubyShape(ctx);
  ctx.fill();
  ctx.strokeStyle = "#3a020e";
  ctx.lineWidth = 2;
  ctx.stroke();

  const table = ctx.createLinearGradient(0, -16, 0, -4);
  table.addColorStop(0, "#ffb0bc");
  table.addColorStop(1, "#e23a54");
  ctx.fillStyle = table;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(9, -6);
  ctx.lineTo(0, -2);
  ctx.lineTo(-9, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(58,2,14,0.7)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(58,2,14,0.6)";
  ctx.lineWidth = 1.2;
  [[-16, -8], [16, -8]].forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx < 0 ? -9 : 9, -6);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-16, -8);
  ctx.lineTo(0, -16);
  ctx.lineTo(16, -8);
  ctx.stroke();

  ctx.strokeStyle = "rgba(58,2,14,0.55)";
  ctx.lineWidth = 1.1;
  [[-18, -2], [-9, -6], [0, -2], [9, -6], [18, -2]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(0, 22);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(255,170,185,0.5)";
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.lineTo(0, -2);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.moveTo(-3, -13);
  ctx.lineTo(3, -12);
  ctx.lineTo(-1, -6);
  ctx.closePath();
  ctx.fill();
}

function animRuby(ctx: CanvasRenderingContext2D, t: number): void {
  const breathe = 1 + Math.sin(t * 1.6) * 0.025;
  ctx.save();
  ctx.scale(breathe, breathe);
  rubyBody(ctx);

  // Shine sweep clipped to silhouette.
  ctx.save();
  ctx.beginPath();
  rubyShape(ctx);
  ctx.clip();
  shineSweep(ctx, (t / 2.6) % 1, 0.55);
  ctx.restore();

  sparkle(ctx, 8, -10, 3.2 * (0.6 + 0.4 * twinkle(t, 1.7, 0)), 0.95);
  sparkle(ctx, -5, 6, 2 * (0.6 + 0.4 * twinkle(t, 2.1, 0.5)), 0.7);
  ctx.restore();
}

function sapphireShape(ctx: CanvasRenderingContext2D): void {
  ctx.moveTo(0, -16);
  ctx.lineTo(14, -10);
  ctx.lineTo(18, 0);
  ctx.lineTo(0, 22);
  ctx.lineTo(-18, 0);
  ctx.lineTo(-14, -10);
  ctx.closePath();
}

function sapphireBody(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(-4, -6, 2, 0, 2, 24);
  body.addColorStop(0, "#6aa8ff");
  body.addColorStop(0.5, "#1a48c8");
  body.addColorStop(1, "#06143f");
  ctx.fillStyle = body;
  ctx.beginPath();
  sapphireShape(ctx);
  ctx.fill();
  ctx.strokeStyle = "#040a26";
  ctx.lineWidth = 2;
  ctx.stroke();

  const table = ctx.createLinearGradient(0, -15, 0, 0);
  table.addColorStop(0, "#a8c8ff");
  table.addColorStop(1, "#2a5ce0");
  ctx.fillStyle = table;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(8, -2);
  ctx.lineTo(0, 2);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(4,10,38,0.7)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(4,10,38,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, -10);
  ctx.lineTo(0, -15);
  ctx.lineTo(14, -10);
  ctx.stroke();
  [[-14, -10], [14, -10]].forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx < 0 ? -8 : 8, -2);
    ctx.stroke();
  });

  ctx.strokeStyle = "rgba(4,10,38,0.55)";
  ctx.lineWidth = 1.1;
  [[-18, 0], [-8, -2], [0, 2], [8, -2], [18, 0]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(0, 22);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(150,190,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(8, -2);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(-3, -12);
  ctx.lineTo(3, -11);
  ctx.lineTo(-1, -5);
  ctx.closePath();
  ctx.fill();
}

function animSapphire(ctx: CanvasRenderingContext2D, t: number): void {
  const breathe = 1 + Math.sin(t * 1.5 + 1) * 0.025;
  ctx.save();
  ctx.scale(breathe, breathe);
  sapphireBody(ctx);

  ctx.save();
  ctx.beginPath();
  sapphireShape(ctx);
  ctx.clip();
  shineSweep(ctx, (t / 2.9 + 0.3) % 1, 0.5);
  ctx.restore();

  sparkle(ctx, 7, -9, 3 * (0.6 + 0.4 * twinkle(t, 1.9, 0.2)), 0.9);
  sparkle(ctx, -6, 8, 2 * (0.6 + 0.4 * twinkle(t, 2.3, 0.7)), 0.7);
  ctx.restore();
}

function emeraldDims(): { w: number; h: number; c: number; outline: Array<[number, number]> } {
  const w = 14;
  const h = 19;
  const c = 5;
  const outline: Array<[number, number]> = [
    [-w + c, -h], [w - c, -h],
    [w, -h + c], [w, h - c],
    [w - c, h], [-w + c, h],
    [-w, h - c], [-w, -h + c],
  ];
  return { w, h, c, outline };
}

function emeraldShape(ctx: CanvasRenderingContext2D): void {
  const { outline } = emeraldDims();
  outline.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function emeraldBody(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const { w, h, c, outline } = emeraldDims();
  const body = ctx.createLinearGradient(-w, -h, w, h);
  body.addColorStop(0, "#5ce29a");
  body.addColorStop(0.5, "#0e9c52");
  body.addColorStop(1, "#04401f");
  ctx.fillStyle = body;
  ctx.beginPath();
  emeraldShape(ctx);
  ctx.fill();
  ctx.strokeStyle = "#022914";
  ctx.lineWidth = 2;
  ctx.stroke();

  const inset = 4;
  const iw = w - inset;
  const ih = h - inset;
  const ic = c - 2;
  const inner: Array<[number, number]> = [
    [-iw + ic, -ih], [iw - ic, -ih],
    [iw, -ih + ic], [iw, ih - ic],
    [iw - ic, ih], [-iw + ic, ih],
    [-iw, ih - ic], [-iw, -ih + ic],
  ];
  ctx.strokeStyle = "rgba(2,41,20,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  inner.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.stroke();

  const table = ctx.createLinearGradient(0, -ih, 0, ih);
  table.addColorStop(0, "#aef0c8");
  table.addColorStop(1, "#1fb866");
  ctx.fillStyle = table;
  const tw = iw - 3;
  const th = ih - 3;
  ctx.beginPath();
  ctx.moveTo(-tw, -th);
  ctx.lineTo(tw, -th);
  ctx.lineTo(tw, th);
  ctx.lineTo(-tw, th);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(2,41,20,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = "rgba(2,41,20,0.5)";
  ctx.lineWidth = 1;
  outline.forEach(([x, y], i) => {
    const [ix, iy] = inner[i];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ix, iy);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.moveTo(-tw + 1, -th + 1);
  ctx.lineTo(-1, -th + 1);
  ctx.lineTo(-tw + 1, -2);
  ctx.closePath();
  ctx.fill();
}

function animEmerald(ctx: CanvasRenderingContext2D, t: number): void {
  const breathe = 1 + Math.sin(t * 1.7 + 2) * 0.022;
  ctx.save();
  ctx.scale(breathe, breathe);
  emeraldBody(ctx);

  ctx.save();
  ctx.beginPath();
  emeraldShape(ctx);
  ctx.clip();
  shineSweep(ctx, (t / 3.1 + 0.6) % 1, 0.5);
  ctx.restore();

  const { w, h } = emeraldDims();
  const tw = (w - 4) - 3;
  const th = (h - 4) - 3;
  sparkle(ctx, tw - 2, th - 3, 2.6 * (0.6 + 0.4 * twinkle(t, 1.8, 0.1)), 0.9);
  sparkle(ctx, -3, -1, 1.6 * (0.6 + 0.4 * twinkle(t, 2.4, 0.6)), 0.6);
  ctx.restore();
}

function amethystBody(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 17, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  type Point = { x: number; base: number; top: number; w: number; lean: number };
  const points: Point[] = [
    { x: -10, base: 20, top: -2, w: 5, lean: -0.18 },
    { x: 10, base: 20, top: 0, w: 5, lean: 0.18 },
    { x: 0, base: 22, top: -18, w: 6.5, lean: 0 },
    { x: -3, base: 20, top: -8, w: 4, lean: -0.05 },
  ];

  points.forEach((p) => {
    const tx = p.x + p.lean * 22;
    const tipY = p.top;
    const w = p.w;

    const left = ctx.createLinearGradient(p.x - w, 0, p.x, 0);
    left.addColorStop(0, "#7a3ab0");
    left.addColorStop(1, "#b878e8");
    const right = ctx.createLinearGradient(p.x, 0, p.x + w, 0);
    right.addColorStop(0, "#9a58d0");
    right.addColorStop(1, "#4a1878");

    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(p.x - w, p.base);
    ctx.lineTo(p.x, p.base + 1.5);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx - w + 1, tipY + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(p.x + w, p.base);
    ctx.lineTo(p.x, p.base + 1.5);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx + w - 1, tipY + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#caa0f0";
    ctx.beginPath();
    ctx.moveTo(tx - w + 1, tipY + 4);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx, tipY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6a2aa0";
    ctx.beginPath();
    ctx.moveTo(tx + w - 1, tipY + 4);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx, tipY + 5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#2e0c52";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p.x - w, p.base);
    ctx.lineTo(tx - w + 1, tipY + 4);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx + w - 1, tipY + 4);
    ctx.lineTo(p.x + w, p.base);
    ctx.stroke();
    ctx.strokeStyle = "rgba(46,12,82,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.base + 1.5);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx, tipY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(240,220,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - w + 1.5, p.base - 1);
    ctx.lineTo(tx - w + 2, tipY + 5);
    ctx.stroke();
  });
}

function animAmethyst(ctx: CanvasRenderingContext2D, t: number): void {
  const breathe = 1 + Math.sin(t * 1.4) * 0.02;

  // Soft glow pulse around the cluster (drawn behind the crystals).
  const glow = 0.18 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.8));
  const g = ctx.createRadialGradient(0, 4, 4, 0, 4, 26);
  g.addColorStop(0, `rgba(190,120,255,${glow})`);
  g.addColorStop(1, "rgba(190,120,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 4, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(breathe, breathe);
  amethystBody(ctx);
  ctx.restore();

  sparkle(ctx, 0, -16, 3 * (0.6 + 0.4 * twinkle(t, 1.6, 0)), 0.95);
  sparkle(ctx, -10, -1, 2 * (0.6 + 0.4 * twinkle(t, 2.0, 0.4)), 0.7);
  sparkle(ctx, 10, 1, 1.8 * (0.6 + 0.4 * twinkle(t, 2.2, 0.8)), 0.7);
}

function animOpal(ctx: CanvasRenderingContext2D, t: number): void {
  const breathe = 1 + Math.sin(t * 1.3) * 0.02;
  ctx.save();
  ctx.scale(breathe, breathe);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Milky cabochon dome.
  const body = ctx.createRadialGradient(-5, -5, 2, 0, 2, 22);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.6, "#e8eef4");
  body.addColorStop(1, "#aab8c8");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6a7888";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Iridescent color flecks — shift hue + drift positions under the cabochon.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 16, 0, 0, Math.PI * 2);
  ctx.clip();

  // Base flecks (from gems.ts) with animated hue + gentle drift.
  const flecks: Array<{ x: number; y: number; rx: number; ry: number; hue: number; a: number }> = [
    { x: -6, y: -4, rx: 5, ry: 4, hue: 205, a: 0.55 },
    { x: 6, y: -2, rx: 4.5, ry: 5, hue: 150, a: 0.55 },
    { x: -2, y: 8, rx: 5, ry: 4, hue: 325, a: 0.5 },
    { x: 9, y: 8, rx: 3.5, ry: 3.5, hue: 45, a: 0.5 },
    { x: -10, y: 5, rx: 3.5, ry: 4, hue: 260, a: 0.5 },
    { x: 2, y: -9, rx: 4, ry: 3, hue: 165, a: 0.5 },
    { x: 8, y: -8, rx: 3, ry: 3, hue: 15, a: 0.45 },
  ];
  flecks.forEach((f, i) => {
    const drift = t * 0.6 + i * 1.3;
    const dx = Math.cos(drift) * 2.2;
    const dy = Math.sin(drift * 0.8) * 1.8;
    const hue = (f.hue + t * 50 + i * 12) % 360;
    const a = f.a * (0.7 + 0.3 * Math.sin(t * 1.5 + i));
    ctx.fillStyle = `hsla(${hue},85%,62%,${a})`;
    ctx.beginPath();
    ctx.ellipse(f.x + dx, f.y + dy, f.rx, f.ry, Math.PI * 0.2 + drift * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // Opalescent haze to mute the flecks.
  const haze = ctx.createRadialGradient(-5, -5, 2, 0, 2, 20);
  haze.addColorStop(0, "rgba(255,255,255,0.45)");
  haze.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Glossy specular dome highlight.
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-6, -6, 4, 2.5, -0.5, 0, Math.PI * 2);
  ctx.fill();

  sparkle(ctx, 8, -7, 2.6 * (0.6 + 0.4 * twinkle(t, 1.9, 0.3)), 0.85);
  sparkle(ctx, -8, 8, 1.8 * (0.6 + 0.4 * twinkle(t, 2.3, 0.7)), 0.65);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// DISHES — full dish + warm motion (steam, bubbles, drips, glints).
// ---------------------------------------------------------------------------

// A rising, dissipating steam wisp. `phase` in [0,1) loops; the wisp fades in
// from the surface, rises, and fades out near the top. `sx` is the base x, `sw`
// the horizontal sway amplitude, `baseY` the surface y.
function steamWisp(
  ctx: CanvasRenderingContext2D,
  phase: number,
  sx: number,
  sw: number,
  baseY: number,
  topY: number,
): void {
  const y0 = baseY - (baseY - topY) * phase;
  // Fade in over first 20%, hold, fade out over last 30%.
  let alpha: number;
  if (phase < 0.2) alpha = phase / 0.2;
  else if (phase > 0.7) alpha = (1 - phase) / 0.3;
  else alpha = 1;
  alpha *= 0.5;
  const sway = Math.sin(phase * Math.PI * 3 + sx) * sw;
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, baseY);
  ctx.bezierCurveTo(
    sx - sw + sway, baseY - (baseY - y0) * 0.4,
    sx + sw + sway, baseY - (baseY - y0) * 0.7,
    sx - 2 + sway, y0,
  );
  ctx.stroke();
}

function animSoup(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 21, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rising, dissipating steam wisps.
  steamWisp(ctx, (t / 2.4) % 1, -7, 4, -2, -22);
  steamWisp(ctx, (t / 2.4 + 0.5) % 1, 7, 4, -2, -22);
  steamWisp(ctx, (t / 2.8 + 0.25) % 1, 0, 3.5, -4, -24);

  // Bowl body
  const bowl = ctx.createLinearGradient(0, 2, 0, 20);
  bowl.addColorStop(0, "#fbfbf6");
  bowl.addColorStop(0.5, "#e2e2da");
  bowl.addColorStop(1, "#a8a8a0");
  ctx.fillStyle = bowl;
  ctx.beginPath();
  ctx.moveTo(-21, 2);
  ctx.bezierCurveTo(-19, 18, 19, 18, 21, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#6a6a62";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, 5);
  ctx.bezierCurveTo(-14, 13, -8, 16, -2, 16);
  ctx.stroke();

  // Soup surface — gently rippling (ellipse y-radius breathes).
  const ripple = 7 + Math.sin(t * 2.2) * 0.5;
  const surf = ctx.createRadialGradient(-4, -2, 2, 0, 0, 22);
  surf.addColorStop(0, "#ffc864");
  surf.addColorStop(0.6, "#e88a2c");
  surf.addColorStop(1, "#b85e14");
  ctx.fillStyle = surf;
  ctx.beginPath();
  ctx.ellipse(0, 1, 21, ripple, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a4a10";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Floating bits bob slightly with the ripple.
  const bits: Array<[number, number, string, number]> = [
    [-8, 0, "#e8542c", 0], [4, 2, "#5a9a2e", 1], [9, -1, "#e8542c", 2],
    [-3, 3, "#5a9a2e", 3], [-12, 1, "#f0c020", 4],
  ];
  bits.forEach(([bx, by, c, i]) => {
    const bob = Math.sin(t * 2.2 + i * 1.2) * 0.8;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(bx, by + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Surface sheen drifts.
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7 + Math.sin(t * 1.1) * 2, -1, 5, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function animStew(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 22, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Steam wisps rising from the surface.
  steamWisp(ctx, (t / 2.6) % 1, -6, 4, -6, -24);
  steamWisp(ctx, (t / 2.6 + 0.5) % 1, 8, 4, -6, -23);

  // Cauldron body
  const pot = ctx.createRadialGradient(-6, -2, 3, 0, 4, 24);
  pot.addColorStop(0, "#5a5a64");
  pot.addColorStop(0.5, "#3a3a44");
  pot.addColorStop(1, "#16161c");
  ctx.fillStyle = pot;
  ctx.beginPath();
  ctx.moveTo(-20, -6);
  ctx.bezierCurveTo(-24, 4, -20, 20, -8, 22);
  ctx.bezierCurveTo(0, 24, 8, 24, 12, 22);
  ctx.bezierCurveTo(24, 18, 24, 2, 20, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pot rim
  ctx.fillStyle = "#48484f";
  ctx.beginPath();
  ctx.ellipse(0, -6, 21, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Faint warmth glow over the stew surface (pulses).
  const warm = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 2.0));
  const wg = ctx.createRadialGradient(0, -6, 1, 0, -6, 18);
  wg.addColorStop(0, `rgba(255,160,60,${warm})`);
  wg.addColorStop(1, "rgba(255,160,60,0)");

  // Stew surface
  const stew = ctx.createRadialGradient(-4, -8, 2, 0, -6, 18);
  stew.addColorStop(0, "#a8682c");
  stew.addColorStop(0.6, "#7a3e14");
  stew.addColorStop(1, "#4a220a");
  ctx.fillStyle = stew;
  ctx.beginPath();
  ctx.ellipse(0, -6, 18, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.ellipse(0, -6, 18, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Chunks
  const chunks: Array<[number, number, number, string]> = [
    [-9, -7, 3, "#8a4a1c"], [2, -8, 3.2, "#9a5a24"], [9, -6, 2.6, "#c87a30"],
    [-3, -5, 2.2, "#5a8a2e"], [6, -4, 2, "#d8a838"],
  ];
  chunks.forEach(([cx, cy, cr, c]) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cr, cr * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,20,8,0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Surfacing-and-popping bubbles (clipped to the stew surface).
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -6, 18, 4.6, 0, 0, Math.PI * 2);
  ctx.clip();
  const bubbles: Array<[number, number, number]> = [
    [-12, -6, 1.4], [11, -7, 1.2], [-1, -9, 1], [4, -5, 1.3], [-6, -5, 1.1], [8, -8, 1.2],
  ];
  bubbles.forEach(([bx, by, br], i) => {
    // Each bubble grows then pops, looping.
    const ph = ((t / 1.6 + i * 0.37) % 1 + 1) % 1;
    const grow = ph < 0.8 ? ph / 0.8 : 1;
    const fade = ph < 0.8 ? 0.55 : Math.max(0, (1 - ph) / 0.2) * 0.55;
    // Bubble drifts up a touch as it grows.
    const r = br * (0.3 + 0.7 * grow);
    ctx.fillStyle = `rgba(255,220,170,${fade})`;
    ctx.beginPath();
    ctx.arc(bx, by - grow * 1.5, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Handles
  ctx.strokeStyle = "#16161c";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(-21, 2, 3.4, -0.6, Math.PI + 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(21, 2, 3.4, -Math.PI - 0.6, 0.6);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.bezierCurveTo(-17, 10, -12, 18, -5, 20);
  ctx.stroke();
}

function animHoneyPot(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 17, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pot body
  const pot = ctx.createRadialGradient(-5, -2, 3, 0, 4, 22);
  pot.addColorStop(0, "#e8b878");
  pot.addColorStop(0.5, "#c08838");
  pot.addColorStop(1, "#7a4c14");
  ctx.fillStyle = pot;
  ctx.beginPath();
  ctx.moveTo(-13, -6);
  ctx.bezierCurveTo(-19, -2, -18, 16, -8, 20);
  ctx.bezierCurveTo(0, 23, 8, 23, 16, 18);
  ctx.bezierCurveTo(20, 10, 19, -2, 13, -6);
  ctx.bezierCurveTo(8, -9, -8, -9, -13, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a2c08";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rim / collar
  const rim = ctx.createLinearGradient(0, -12, 0, -4);
  rim.addColorStop(0, "#d8a858");
  rim.addColorStop(1, "#9a6824");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.ellipse(0, -8, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a2c08";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Honey surface inside rim
  const honey = ctx.createRadialGradient(-3, -9, 1, 0, -8, 12);
  honey.addColorStop(0, "#ffd24a");
  honey.addColorStop(0.7, "#f0a818");
  honey.addColorStop(1, "#c87a0c");
  ctx.fillStyle = honey;
  ctx.beginPath();
  ctx.ellipse(0, -8, 11, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Surface glint sweeps across the honey pool.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -8, 11, 3.4, 0, 0, Math.PI * 2);
  ctx.clip();
  const gx = -11 + ((t / 2.5) % 1) * 22;
  const gg = ctx.createLinearGradient(gx - 4, 0, gx + 4, 0);
  gg.addColorStop(0, "rgba(255,255,210,0)");
  gg.addColorStop(0.5, "rgba(255,255,210,0.7)");
  gg.addColorStop(1, "rgba(255,255,210,0)");
  ctx.fillStyle = gg;
  ctx.fillRect(-12, -12, 24, 8);
  ctx.restore();

  // "HONEY" band label
  ctx.fillStyle = "#f6e8c0";
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.bezierCurveTo(-6, 5, 6, 5, 12, 2);
  ctx.lineTo(12, 10);
  ctx.bezierCurveTo(6, 13, -6, 13, -12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b89a5a";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(200,140,20,0.7)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-1, 4.5);
  ctx.lineTo(2, 6);
  ctx.lineTo(2, 9);
  ctx.lineTo(-1, 10.5);
  ctx.lineTo(-4, 9);
  ctx.lineTo(-4, 6);
  ctx.closePath();
  ctx.stroke();

  // Wooden dipper
  ctx.save();
  ctx.translate(7, -10);
  ctx.rotate(0.4);
  ctx.strokeStyle = "#8a5a20";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(2, -16);
  ctx.stroke();
  ctx.fillStyle = "#a87436";
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3a10";
  ctx.lineWidth = 0.8;
  [-3, -1, 1, 3].forEach((gy) => {
    ctx.beginPath();
    ctx.moveTo(-4, gy);
    ctx.lineTo(4, gy);
    ctx.stroke();
  });
  ctx.restore();

  // Honey drip off the rim — slowly stretches, drops, then loops.
  // phase 0..0.7: stretch a hanging strand; 0.7..1: a droplet falls away.
  const dph = (t / 3.2) % 1;
  const ax = -11; // anchor x at the rim
  const ay = -7;  // anchor y at the rim
  const stretch = Math.min(dph / 0.7, 1);
  const strandLen = 4 + stretch * 9;
  // Hanging strand
  ctx.fillStyle = "#f5b81c";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.bezierCurveTo(ax - 2, ay + 5, ax - 2, ay + strandLen, ax, ay + strandLen + 2);
  ctx.bezierCurveTo(ax + 2, ay + strandLen, ax + 2, ay + 5, ax, ay);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,235,150,0.7)";
  ctx.beginPath();
  ctx.ellipse(ax - 0.5, ay + strandLen * 0.5, 0.8, strandLen * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Falling droplet during the back end of the cycle.
  if (dph > 0.7) {
    const fall = (dph - 0.7) / 0.3;
    const dy = ay + strandLen + 2 + fall * 14;
    const da = 1 - fall;
    ctx.fillStyle = `rgba(245,184,28,${0.6 + 0.4 * da})`;
    ctx.beginPath();
    ctx.ellipse(ax, dy, 2.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,235,150,${0.6 * da})`;
    ctx.beginPath();
    ctx.arc(ax - 0.7, dy - 0.8, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pot highlight
  ctx.fillStyle = "rgba(255,250,220,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, 4, 2.6, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function animCake(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 20, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Plate
  ctx.fillStyle = "#e6e6ec";
  ctx.beginPath();
  ctx.ellipse(0, 20, 20, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a8a8b2";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Front face
  const front = ctx.createLinearGradient(0, -8, 0, 18);
  front.addColorStop(0, "#fff4dc");
  front.addColorStop(1, "#f0d8a0");
  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.moveTo(-16, 16);
  ctx.lineTo(14, 16);
  ctx.lineTo(14, -2);
  ctx.lineTo(-16, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b8945a";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Cream / jam layers
  ctx.fillStyle = "#ff8aa0";
  ctx.fillRect(-16, 2, 30, 3);
  ctx.fillStyle = "#fff0d0";
  ctx.fillRect(-16, 9, 30, 3);
  ctx.strokeStyle = "rgba(180,140,90,0.4)";
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-16, 2, 30, 3);
  ctx.strokeRect(-16, 9, 30, 3);

  // sponge crumb dots
  ctx.fillStyle = "rgba(200,160,100,0.5)";
  for (let i = 0; i < 12; i++) {
    const cx = -14 + (i * 2.6) + Math.sin(i * 2) * 1;
    const cy = (i % 2 === 0) ? -0.5 : 7.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Frosted top
  const ice = ctx.createLinearGradient(0, -10, 0, 0);
  ice.addColorStop(0, "#fff8f0");
  ice.addColorStop(1, "#f6d6e0");
  ctx.fillStyle = ice;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.bezierCurveTo(-14, -8, 12, -8, 14, -2);
  ctx.bezierCurveTo(6, -5, -8, -5, -16, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff8f0";
  [-9, -1, 7].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(dx - 3, -3);
    ctx.bezierCurveTo(dx - 3, 2, dx + 3, 2, dx + 3, -3);
    ctx.closePath();
    ctx.fill();
  });
  ctx.strokeStyle = "#e8b8c8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.bezierCurveTo(-14, -8, 12, -8, 14, -2);
  ctx.stroke();

  // A faint candle-like shimmer above the cake (warm flicker glow).
  const flick = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(t * 6.0 + Math.sin(t * 11) * 0.6));
  const fg = ctx.createRadialGradient(6, -20, 0, 6, -20, 7);
  fg.addColorStop(0, `rgba(255,210,120,${flick})`);
  fg.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(6, -20, 7, 0, Math.PI * 2);
  ctx.fill();

  // Cherry on top
  const cherry = ctx.createRadialGradient(-2, -12, 1, 0, -10, 6);
  cherry.addColorStop(0, "#ff6a6a");
  cherry.addColorStop(0.6, "#d81a2a");
  cherry.addColorStop(1, "#7a0810");
  ctx.fillStyle = cherry;
  ctx.beginPath();
  ctx.arc(-1, -10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a0410";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Glossy glint sweeping across the cherry.
  ctx.save();
  ctx.beginPath();
  ctx.arc(-1, -10, 5, 0, Math.PI * 2);
  ctx.clip();
  const cgx = -6 + ((t / 2.2) % 1) * 10;
  const cgg = ctx.createLinearGradient(cgx - 2.5, 0, cgx + 2.5, 0);
  cgg.addColorStop(0, "rgba(255,255,255,0)");
  cgg.addColorStop(0.5, "rgba(255,255,255,0.85)");
  cgg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = cgg;
  ctx.fillRect(-6, -15, 12, 10);
  ctx.restore();

  // Fixed glossy spot + a twinkle sparkle.
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-3, -12, 1.4, 0, Math.PI * 2);
  ctx.fill();
  sparkle(ctx, 2, -13, 2.2 * (0.5 + 0.5 * twinkle(t, 1.8, 0.2)), 0.9);

  // cherry stem
  ctx.strokeStyle = "#5a8a26";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-1, -14);
  ctx.quadraticCurveTo(4, -20, 6, -22);
  ctx.stroke();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  gem_ruby: animRuby,
  gem_sapphire: animSapphire,
  gem_emerald: animEmerald,
  gem_amethyst: animAmethyst,
  gem_opal: animOpal,
  dish_soup: animSoup,
  dish_stew: animStew,
  dish_honey_pot: animHoneyPot,
  dish_cake: animCake,
};
