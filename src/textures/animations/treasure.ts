// Treasure, loot & rewards — animated variants.
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds). The caller
// clears, translates to center, scales, sets lineCap/lineJoin="round", and
// calls us; we only draw at origin (0,0) within a ~-24..+24 box. Everything is
// deterministic in `t` (no Math.random) and loops seamlessly (modulo / sin).
//
// Self-contained: no imports. Shapes/colors mirror
// src/textures/categories/treasure.ts so identity reads the same — just alive:
// glints sweep across gold, gems twinkle, sparkles ping, glows breathe.

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Soft drop shadow — mirrors treasure.ts `drawShadow`.
function drawShadow(ctx: CanvasRenderingContext2D, w = 16, h = 4): void {
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Four-pointed sparkle star — mirrors treasure.ts `sparkle`, with alpha.
function sparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
  color = "255,253,224",
): void {
  if (r <= 0 || alpha <= 0) return;
  ctx.fillStyle = `rgba(${color},${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.closePath();
  ctx.fill();
}

// A bright diagonal "glint" band swept across the current clip region. `phase`
// in [0,1) loops the band from upper-left toward lower-right. Call this AFTER
// clipping to the gold shape so the streak stays contained.
function glintSweep(ctx: CanvasRenderingContext2D, phase: number, intensity: number): void {
  const travel = -34 + phase * 68;
  ctx.save();
  ctx.translate(travel, travel * 0.2);
  ctx.rotate(-Math.PI / 4);
  const grad = ctx.createLinearGradient(-7, 0, 7, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, `rgba(255,255,255,${intensity})`);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-7, -42, 14, 84);
  ctx.restore();
}

// Twinkle alpha that pulses: peaks once per `period` seconds, offset by `off`
// (in cycle fraction). Bright briefly, dim most of the cycle.
function twinkle(t: number, period: number, off: number): number {
  const ph = (((t / period + off) % 1) + 1) % 1;
  const s = Math.sin(ph * Math.PI);
  return s * s * s;
}

// Smooth 0..1 breathing wave.
function breathe(t: number, period: number, off = 0): number {
  return 0.5 + 0.5 * Math.sin((t / period + off) * Math.PI * 2);
}

// ---------------------------------------------------------------------------
// 1. treasure_chest_open — gold inside shimmers; glow pulses; sparkles rise.
// ---------------------------------------------------------------------------
function animChestOpen(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 18, 4);

  // Inner glow rising from the chest — pulses in radius + intensity.
  const glowPulse = breathe(t, 1.8);
  const glowR = 20 + glowPulse * 4;
  const glowA = 0.6 + glowPulse * 0.4;
  const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, glowR);
  glow.addColorStop(0, `rgba(255,235,140,${0.85 * glowA})`);
  glow.addColorStop(0.5, `rgba(240,180,40,${0.35 * glowA})`);
  glow.addColorStop(1, "rgba(240,180,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Box body
  const wood = ctx.createLinearGradient(0, 2, 0, 20);
  wood.addColorStop(0, "#a8703a");
  wood.addColorStop(0.5, "#7a4a1c");
  wood.addColorStop(1, "#4a2a0c");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.lineTo(18, 2);
  ctx.lineTo(17, 18);
  ctx.lineTo(-17, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1606";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Vertical metal bands on body
  const band = ctx.createLinearGradient(0, 2, 0, 18);
  band.addColorStop(0, "#fff4c0");
  band.addColorStop(0.5, "#e0a020");
  band.addColorStop(1, "#8a5a10");
  ctx.fillStyle = band;
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  [-12, 12].forEach((bx) => {
    ctx.beginPath();
    ctx.rect(bx - 3, 2, 6, 16);
    ctx.fill();
    ctx.stroke();
  });

  // Open lid tilted back
  ctx.save();
  ctx.translate(0, 1);
  ctx.rotate(-0.32);
  const lid = ctx.createLinearGradient(0, -16, 0, -2);
  lid.addColorStop(0, "#5a3210");
  lid.addColorStop(1, "#8a5424");
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.moveTo(-18, -3);
  ctx.bezierCurveTo(-19, -16, 19, -16, 18, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1606";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(180,130,70,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.bezierCurveTo(-8, -9, 8, -9, 14, -4);
  ctx.stroke();
  ctx.restore();

  // Overflowing gold coins
  const coins: Array<[number, number, number]> = [
    [-11, 0, 4], [-3, -2, 4.5], [6, -1, 4], [12, 1, 3.5],
    [-7, 3, 4], [2, 2, 4.5], [10, 4, 4], [-13, 4, 3.5], [0, 5, 4],
  ];
  coins.forEach(([x, y, r]) => {
    const cg = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
    cg.addColorStop(0, "#fff4c0");
    cg.addColorStop(0.6, "#f0b81c");
    cg.addColorStop(1, "#8a5a0c");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5e3c06";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(94,60,6,0.6)";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Shimmer over the coin pile — clip to the coin region and sweep a glint.
  ctx.save();
  ctx.beginPath();
  coins.forEach(([x, y, r]) => ctx.rect(x - r, y - r, r * 2, r * 2));
  ctx.clip();
  glintSweep(ctx, (t / 1.6) % 1, 0.5);
  ctx.restore();

  // Front rim of box over coins
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.rect(-18, 6, 36, 2.5);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rising sparkles — three motes loop upward out of the chest, fading at top.
  for (let i = 0; i < 3; i++) {
    const ph = ((t / 2 + i / 3) % 1 + 1) % 1;
    const x = [-5, 9, 0][i] + Math.sin((ph + i) * Math.PI * 2) * 2;
    const y = 0 - ph * 16; // from chest top (~0) up to ~ -16
    const a = Math.sin(ph * Math.PI); // fade in/out across the rise
    sparkle(ctx, x, y, 1.4 + a * 0.8, a * 0.95);
  }
}

// ---------------------------------------------------------------------------
// 2. treasure_coin_stack — glint sweeps the coins; periodic sparkle twinkles.
// ---------------------------------------------------------------------------
function animCoinStack(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 16, 4);

  // Leaning coin (behind, to the right)
  ctx.save();
  ctx.translate(13, 6);
  ctx.rotate(0.5);
  const leanG = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
  leanG.addColorStop(0, "#fff4c0");
  leanG.addColorStop(0.6, "#f0b81c");
  leanG.addColorStop(1, "#8a5a0c");
  ctx.fillStyle = leanG;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(94,60,6,0.7)";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 4 : 1.8;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Stack of coins (bottom to top)
  const layers: Array<[number, number]> = [[0, 16], [-1, 11], [1, 6], [-1, 1], [0, -4]];
  layers.forEach(([cx, cy], i) => {
    const g = ctx.createLinearGradient(-12, cy, 12, cy);
    g.addColorStop(0, "#8a5a0c");
    g.addColorStop(0.5, "#f0b81c");
    g.addColorStop(1, "#c8860c");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx - 12, cy - 4);
    ctx.ellipse(cx, cy - 4, 12, 4, 0, Math.PI, 0, true);
    ctx.lineTo(cx + 12, cy);
    ctx.ellipse(cx, cy, 12, 4, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e3c06";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const top = ctx.createRadialGradient(cx - 3, cy - 5, 1, cx, cy - 4, 12);
    top.addColorStop(0, "#fff4c0");
    top.addColorStop(0.6, "#f0c430");
    top.addColorStop(1, "#c8860c");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (i === layers.length - 1) {
      ctx.fillStyle = "rgba(94,60,6,0.7)";
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Bright glint sweeping across the whole stack — clip to the coin column.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-13, -9, 26, 30);
  ctx.clip();
  glintSweep(ctx, (t / 2) % 1, 0.6);
  ctx.restore();

  // Specular streak on top coin (static base highlight)
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-4, -6, 3, 1.2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Periodic twinkles
  sparkle(ctx, -8, -8, 1.8, twinkle(t, 1.6, 0));
  sparkle(ctx, 6, -1, 1.3, twinkle(t, 1.6, 0.5));
}

// ---------------------------------------------------------------------------
// 3. treasure_gold_key — specular glint travels the key; sparkle pings the bow.
// ---------------------------------------------------------------------------
function animGoldKey(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 13, 3.5);
  ctx.save();
  ctx.rotate(-0.5);
  const gold = ctx.createLinearGradient(0, -18, 0, 18);
  gold.addColorStop(0, "#fff4c0");
  gold.addColorStop(0.5, "#e0a020");
  gold.addColorStop(1, "#8a5a10");

  // The whole key body is drawn into a path we can both fill and re-use as clip.
  const drawKeyPath = (): void => {
    // Bow ring
    ctx.moveTo(7, -12);
    ctx.arc(0, -12, 7, 0, Math.PI * 2);
    // Side lobes
    [[-7, -12], [7, -12], [0, -20]].forEach(([x, y]) => {
      ctx.moveTo(x + 2.6, y);
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    });
    // Shaft (rounded rect approx as rect for clip)
    ctx.moveTo(-1.8, -5);
    ctx.rect(-1.8, -5, 3.6, 20);
    // Collar
    ctx.moveTo(2.6, 0);
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    // Bit / teeth
    ctx.moveTo(1.8, 9);
    ctx.lineTo(8, 9);
    ctx.lineTo(8, 12);
    ctx.lineTo(5, 12);
    ctx.lineTo(5, 14.5);
    ctx.lineTo(8, 14.5);
    ctx.lineTo(8, 15);
    ctx.lineTo(1.8, 15);
    ctx.closePath();
  };

  // Bow / handle
  ctx.fillStyle = gold;
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -12, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Inner hole
  ctx.fillStyle = "rgba(58,36,6,0.9)";
  ctx.beginPath();
  ctx.arc(0, -12, 3.2, 0, Math.PI * 2);
  ctx.fill();
  // Decorative side lobes
  ctx.fillStyle = gold;
  [[-7, -12], [7, -12], [0, -20]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Shaft
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.roundRect(-1.8, -5, 3.6, 20, 1.4);
  ctx.fill();
  ctx.stroke();
  // Collar ring
  ctx.beginPath();
  ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Bit / teeth
  ctx.beginPath();
  ctx.moveTo(1.8, 9);
  ctx.lineTo(8, 9);
  ctx.lineTo(8, 12);
  ctx.lineTo(5, 12);
  ctx.lineTo(5, 14.5);
  ctx.lineTo(8, 14.5);
  ctx.lineTo(8, 15);
  ctx.lineTo(1.8, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Static specular streak along shaft
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-0.6, -4);
  ctx.lineTo(-0.6, 12);
  ctx.stroke();

  // Travelling glint — clip to the key body, sweep vertically top→bottom.
  ctx.save();
  ctx.beginPath();
  drawKeyPath();
  ctx.clip();
  const ph = (t / 2.2) % 1;
  const gy = -22 + ph * 44;
  const gg = ctx.createLinearGradient(0, gy - 6, 0, gy + 6);
  gg.addColorStop(0, "rgba(255,255,255,0)");
  gg.addColorStop(0.5, "rgba(255,255,255,0.8)");
  gg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gg;
  ctx.fillRect(-12, gy - 6, 24, 12);
  ctx.restore();

  ctx.restore();

  // Sparkle pinging at the bow + a smaller one at the teeth
  sparkle(ctx, -8, -14, 1.8 + twinkle(t, 1.5, 0) * 0.8, 0.5 + twinkle(t, 1.5, 0) * 0.5);
  sparkle(ctx, 7, 10, 1.3, twinkle(t, 1.5, 0.55));
}

// ---------------------------------------------------------------------------
// 4. treasure_crown — gems twinkle at staggered phases; glint sweeps the band.
// ---------------------------------------------------------------------------
function animCrown(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 17, 4);
  const gold = ctx.createLinearGradient(0, -14, 0, 12);
  gold.addColorStop(0, "#fff4c0");
  gold.addColorStop(0.5, "#e0a020");
  gold.addColorStop(1, "#8a5a10");
  ctx.fillStyle = gold;

  const crownPath = (): void => {
    ctx.moveTo(-16, 8);
    ctx.lineTo(-16, -2);
    ctx.lineTo(-9, 2);
    ctx.lineTo(-8, -12);
    ctx.lineTo(-3, 1);
    ctx.lineTo(0, -14);
    ctx.lineTo(3, 1);
    ctx.lineTo(8, -12);
    ctx.lineTo(9, 2);
    ctx.lineTo(16, -2);
    ctx.lineTo(16, 8);
    ctx.closePath();
  };

  // Crown band + points
  ctx.beginPath();
  crownPath();
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Base band
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.rect(-16, 4, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, 5.5);
  ctx.lineTo(14, 5.5);
  ctx.stroke();

  // Glint sweep over the gold crown + band — clip to both shapes.
  ctx.save();
  ctx.beginPath();
  crownPath();
  ctx.rect(-16, 4, 32, 6);
  ctx.clip();
  glintSweep(ctx, (t / 2.4) % 1, 0.55);
  ctx.restore();

  // Pearls atop each point
  [[-8, -13], [0, -15], [8, -13]].forEach(([x, y]) => {
    ctx.fillStyle = "#fff8ec";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#bca878";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(x - 0.6, y - 0.6, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Gems in the band — center ruby, side sapphires, each with a twinkle overlay.
  const gem = (x: number, y: number, c0: string, c1: string, c2: string, r: number, tw: number): void => {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
    g.addColorStop(0, c0);
    g.addColorStop(0.6, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(40,10,20,0.7)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // twinkle highlight on the gem
    if (tw > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${tw * 0.85})`;
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      sparkle(ctx, x, y, r * (0.7 + tw * 0.6), tw * 0.7);
    }
  };
  gem(0, 7, "#ff8a8a", "#c8181a", "#5a0408", 3.2, twinkle(t, 1.8, 0));
  gem(-9, 7, "#9cd0f8", "#2a6ac8", "#0a2a68", 2.4, twinkle(t, 1.8, 0.33));
  gem(9, 7, "#9cd0f8", "#2a6ac8", "#0a2a68", 2.4, twinkle(t, 1.8, 0.66));

  sparkle(ctx, -3, -10, 1.8, twinkle(t, 1.6, 0.2));
  sparkle(ctx, 6, -6, 1.4, twinkle(t, 1.6, 0.7));
}

// ---------------------------------------------------------------------------
// 5. treasure_ring — central gem flares/sparkles; glint runs round the band.
// ---------------------------------------------------------------------------
function animRing(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 13, 3.5);
  const gold = ctx.createLinearGradient(0, -4, 0, 18);
  gold.addColorStop(0, "#fff4c0");
  gold.addColorStop(0.5, "#e0a020");
  gold.addColorStop(1, "#8a5a10");

  // Band — filled torus
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(0, 8, 11.2, 0, Math.PI * 2);
  ctx.arc(0, 8, 6.6, 0, Math.PI * 2, true);
  ctx.fill("evenodd");
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 8, 11.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 8, 6.6, 0, Math.PI * 2);
  ctx.stroke();
  // Static band sheen
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 8, 9.6, Math.PI * 0.7, Math.PI * 1.05);
  ctx.stroke();

  // Travelling glint running around the band — clip to the torus ring.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 8, 11.2, 0, Math.PI * 2);
  ctx.arc(0, 8, 6.6, 0, Math.PI * 2, true);
  ctx.clip("evenodd");
  const a = (t / 2) * Math.PI * 2;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 8, 9, a, a + Math.PI * 0.35);
  ctx.stroke();
  ctx.restore();

  // Setting (prongs)
  ctx.fillStyle = "#8a5a10";
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(6, -2);
  ctx.lineTo(4, -8);
  ctx.lineTo(-4, -8);
  ctx.closePath();
  ctx.fill();

  // Large red gem on top, with a pulsing flare.
  const gemPath = (): void => {
    ctx.moveTo(0, -14);
    ctx.lineTo(5.5, -9);
    ctx.lineTo(3, -2);
    ctx.lineTo(-3, -2);
    ctx.lineTo(-5.5, -9);
    ctx.closePath();
  };
  const flare = breathe(t, 1.6);
  const gem = ctx.createRadialGradient(-1.5, -10, 0.5, 0, -8, 7);
  gem.addColorStop(0, "#ffb0b0");
  gem.addColorStop(0.5, "#d8201c");
  gem.addColorStop(1, "#6a0408");
  ctx.fillStyle = gem;
  ctx.beginPath();
  gemPath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Gem facets
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5.5, -9);
  ctx.lineTo(5.5, -9);
  ctx.moveTo(0, -14);
  ctx.lineTo(0, -2);
  ctx.stroke();
  // Pulsing inner flare clipped to the gem
  ctx.save();
  ctx.beginPath();
  gemPath();
  ctx.clip();
  ctx.fillStyle = `rgba(255,210,210,${0.25 + flare * 0.5})`;
  ctx.beginPath();
  ctx.arc(-1, -9, 2.2 + flare * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Gem glint dot
  ctx.fillStyle = `rgba(255,255,255,${0.6 + flare * 0.4})`;
  ctx.beginPath();
  ctx.arc(-2, -10, 1, 0, Math.PI * 2);
  ctx.fill();

  // Sparkle ping off the gem at the flare peak
  sparkle(ctx, 0, -9, 2 + flare * 2.2, flare * flare * 0.9);
  sparkle(ctx, 7, -8, 1.8, twinkle(t, 1.7, 0.3));
  sparkle(ctx, -7, -5, 1.3, twinkle(t, 1.7, 0.8));
}

// ---------------------------------------------------------------------------
// 6. treasure_goblet — gold + gems glint; red drink surface shimmers gently.
// ---------------------------------------------------------------------------
function animGoblet(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 13, 4);
  const gold = ctx.createLinearGradient(-10, 0, 10, 0);
  gold.addColorStop(0, "#8a5a10");
  gold.addColorStop(0.4, "#fff4c0");
  gold.addColorStop(0.6, "#e0a020");
  gold.addColorStop(1, "#8a5a10");

  // Base
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.ellipse(0, 19, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Stem
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(-2.5, 6);
  ctx.lineTo(2.5, 6);
  ctx.lineTo(3, 16);
  ctx.lineTo(-3, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Stem knob
  ctx.beginPath();
  ctx.arc(0, 11, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cup bowl
  const bowlPath = (): void => {
    ctx.moveTo(-11, -8);
    ctx.bezierCurveTo(-11, 4, -6, 8, 0, 8);
    ctx.bezierCurveTo(6, 8, 11, 4, 11, -8);
    ctx.closePath();
  };
  ctx.fillStyle = gold;
  ctx.beginPath();
  bowlPath();
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Glint sweep over the bowl gold — clip to the bowl.
  ctx.save();
  ctx.beginPath();
  bowlPath();
  ctx.clip();
  glintSweep(ctx, (t / 2.2) % 1, 0.5);
  ctx.restore();

  // Red drink at the rim — shimmering surface (subtle vertical bob + glint sweep).
  const bob = Math.sin(t * 2) * 0.4;
  const drink = ctx.createLinearGradient(0, -9 + bob, 0, -5 + bob);
  drink.addColorStop(0, "#ff5a4a");
  drink.addColorStop(1, "#8a0c0c");
  ctx.fillStyle = drink;
  ctx.beginPath();
  ctx.ellipse(0, -8 + bob, 10.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a0408";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Drifting drink-surface glint
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -8 + bob, 10.5, 2.6, 0, 0, Math.PI * 2);
  ctx.clip();
  const gx = -8 + ((t / 2.5) % 1) * 16;
  ctx.fillStyle = "rgba(255,200,180,0.6)";
  ctx.beginPath();
  ctx.ellipse(gx, -8.5 + bob, 3, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Gems on the bowl — twinkle overlays.
  const gem = (x: number, y: number, tw: number): void => {
    const g = ctx.createRadialGradient(x - 0.6, y - 0.6, 0.3, x, y, 2.4);
    g.addColorStop(0, "#9cd0f8");
    g.addColorStop(0.6, "#2a6ac8");
    g.addColorStop(1, "#0a2a68");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - 2.4);
    ctx.lineTo(x + 2.4, y);
    ctx.lineTo(x, y + 2.4);
    ctx.lineTo(x - 2.4, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(10,20,50,0.7)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    if (tw > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${tw * 0.8})`;
      ctx.beginPath();
      ctx.arc(x - 0.5, y - 0.5, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  gem(0, -1, twinkle(t, 1.7, 0));
  gem(-6, -3, twinkle(t, 1.7, 0.33));
  gem(6, -3, twinkle(t, 1.7, 0.66));

  // Bowl specular streak
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, -3, 1.6, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  sparkle(ctx, 8, -7, 1.6, twinkle(t, 1.5, 0.15));
  sparkle(ctx, -9, 0, 1.2, twinkle(t, 1.5, 0.6));
}

// ---------------------------------------------------------------------------
// 7. treasure_gold_bars — glints sweep across stacked bars; sparkle twinkles.
// ---------------------------------------------------------------------------
function animGoldBars(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 18, 4);

  // Draw one bar; returns the front-face path points so we can clip per-bar.
  const bar = (ox: number, oy: number, glintPhase: number): void => {
    // Top face
    const top = ctx.createLinearGradient(0, oy - 6, 0, oy - 1);
    top.addColorStop(0, "#fff4c0");
    top.addColorStop(1, "#e0a020");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(ox - 11, oy - 1);
    ctx.lineTo(ox - 8, oy - 6);
    ctx.lineTo(ox + 12, oy - 6);
    ctx.lineTo(ox + 9, oy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e3c06";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // Front face
    const front = ctx.createLinearGradient(0, oy - 1, 0, oy + 8);
    front.addColorStop(0, "#f4c430");
    front.addColorStop(0.5, "#d09014");
    front.addColorStop(1, "#8a5a0c");
    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(ox - 11, oy - 1);
    ctx.lineTo(ox + 9, oy - 1);
    ctx.lineTo(ox + 8, oy + 7);
    ctx.lineTo(ox - 10, oy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right face
    const side = ctx.createLinearGradient(ox + 8, 0, ox + 13, 0);
    side.addColorStop(0, "#c8860c");
    side.addColorStop(1, "#8a5a0c");
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(ox + 9, oy - 1);
    ctx.lineTo(ox + 12, oy - 6);
    ctx.lineTo(ox + 11, oy + 2);
    ctx.lineTo(ox + 8, oy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Stamp mark
    ctx.strokeStyle = "rgba(94,60,6,0.7)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.rect(ox - 5, oy + 1, 9, 4);
    ctx.stroke();
    // Top sheen
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(ox - 2, oy - 3.5, 4, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glint sweeping across this bar's front face — clipped so it stays in.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ox - 11, oy - 1);
    ctx.lineTo(ox + 9, oy - 1);
    ctx.lineTo(ox + 8, oy + 7);
    ctx.lineTo(ox - 10, oy + 7);
    ctx.closePath();
    ctx.clip();
    const gx = ox - 13 + glintPhase * 26;
    const gg = ctx.createLinearGradient(gx - 5, 0, gx + 5, 0);
    gg.addColorStop(0, "rgba(255,255,255,0)");
    gg.addColorStop(0.5, "rgba(255,255,255,0.7)");
    gg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(ox - 13, oy - 2, 26, 11);
    ctx.restore();
  };

  // Staggered glint phases per bar so the shine cascades across the stack.
  bar(-7, 16, (t / 2.2) % 1);
  bar(8, 16, ((t / 2.2 + 0.33) % 1));
  bar(0, 6, ((t / 2.2 + 0.66) % 1));

  sparkle(ctx, -6, 1, 1.8, twinkle(t, 1.6, 0));
  sparkle(ctx, 9, 3, 1.3, twinkle(t, 1.6, 0.5));
}

// ---------------------------------------------------------------------------
// 8. treasure_gem_pile — gems twinkle at offset phases; soft glow breathes.
// ---------------------------------------------------------------------------
function animGemPile(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 17, 4);

  // Soft glow breathing over the pile.
  const gp = breathe(t, 2.2);
  const glow = ctx.createRadialGradient(0, 8, 2, 0, 8, 18);
  glow.addColorStop(0, `rgba(255,255,255,${0.12 + gp * 0.16})`);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 8, 18, 0, Math.PI * 2);
  ctx.fill();

  const gem = (
    x: number, y: number, r: number, rot: number,
    c0: string, c1: string, c2: string, outline: string, tw: number,
  ): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, c0);
    g.addColorStop(0.5, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    const shape = (): void => {
      ctx.moveTo(-r * 0.5, -r);
      ctx.lineTo(r * 0.5, -r);
      ctx.lineTo(r, -r * 0.2);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, -r * 0.2);
      ctx.closePath();
    };
    ctx.beginPath();
    shape();
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    // facet lines
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.2);
    ctx.lineTo(r, -r * 0.2);
    ctx.moveTo(-r * 0.5, -r);
    ctx.lineTo(0, r);
    ctx.moveTo(r * 0.5, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    // base glint
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.4, 0.8, 0, Math.PI * 2);
    ctx.fill();
    // twinkle flare clipped to gem
    if (tw > 0.02) {
      ctx.save();
      ctx.beginPath();
      shape();
      ctx.clip();
      ctx.fillStyle = `rgba(255,255,255,${tw * 0.55})`;
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.4, r * 0.45 * (0.6 + tw), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // sparkle popping above the gem at its twinkle peak
    if (tw > 0.3) sparkle(ctx, x, y - r * 0.5, 1.4 + tw, tw * 0.8);
  };

  // Back row
  gem(-8, 6, 6, -0.2, "#b0f0c0", "#28b050", "#0a4a20", "#063015", twinkle(t, 2.0, 0));
  gem(9, 7, 6, 0.25, "#c8b0f8", "#7a3ad0", "#3a0c78", "#26064a", twinkle(t, 2.0, 0.2));
  // Front row
  gem(-3, 11, 6.5, 0.1, "#ffb0b0", "#d8201c", "#6a0408", "#3a0408", twinkle(t, 2.0, 0.4));
  gem(6, 12, 6, -0.18, "#9cd0f8", "#2a6ac8", "#0a2a68", "#06183f", twinkle(t, 2.0, 0.6));
  // Top small gem
  gem(1, 2, 5, 0.05, "#fff0a0", "#f0b81c", "#8a5a0c", "#5e3c06", twinkle(t, 2.0, 0.8));

  sparkle(ctx, -10, 2, 1.8, twinkle(t, 1.7, 0.1));
  sparkle(ctx, 11, 3, 1.4, twinkle(t, 1.7, 0.5));
  sparkle(ctx, 2, 14, 1.2, twinkle(t, 1.7, 0.85));
}

// ---------------------------------------------------------------------------
// 9. treasure_map — edges flutter; red X pulses; dotted path shimmers.
// ---------------------------------------------------------------------------
function animMap(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 18, 4);

  // Slight flutter of the top/bottom edges.
  const fl = Math.sin(t * 1.6) * 0.9;
  const fl2 = Math.sin(t * 1.6 + 1.0) * 0.9;

  // Parchment sheet
  const paper = ctx.createLinearGradient(0, -14, 0, 16);
  paper.addColorStop(0, "#f6e2b0");
  paper.addColorStop(0.5, "#e8c982");
  paper.addColorStop(1, "#cba85e");
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.moveTo(-15, -13 + fl);
  ctx.bezierCurveTo(-12, -15 - fl, 12, -15 + fl, 15, -13 - fl);
  ctx.lineTo(15, 13 + fl2);
  ctx.bezierCurveTo(12, 15 - fl2, -12, 15 + fl2, -15, 13 - fl2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a6a32";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Aged edge stains
  ctx.fillStyle = "rgba(150,110,50,0.3)";
  ctx.beginPath();
  ctx.ellipse(-13, -8, 3, 5, 0.3, 0, Math.PI * 2);
  ctx.ellipse(12, 9, 3.5, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Curled rolls left & right
  const roll = ctx.createLinearGradient(0, 0, 6, 0);
  roll.addColorStop(0, "#cba85e");
  roll.addColorStop(1, "#a8854a");
  ctx.fillStyle = roll;
  [-15, 13].forEach((rx) => {
    ctx.beginPath();
    ctx.ellipse(rx, 0, 3, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6a32";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });

  // Coastline doodle
  ctx.strokeStyle = "rgba(120,90,40,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, 8);
  ctx.bezierCurveTo(-6, 4, -3, 9, 1, 5);
  ctx.bezierCurveTo(4, 2, 8, 6, 10, 2);
  ctx.stroke();

  // Dotted path leading to X — each dot shimmers in sequence (a crawling glow).
  const path: Array<[number, number]> = [[-9, -7], [-6, -4], [-2, -5], [1, -2], [4, -4], [6, -1]];
  path.forEach(([x, y], i) => {
    const tw = twinkle(t, 1.6, (i / path.length) * -1);
    ctx.fillStyle = "#7a3a14";
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
    if (tw > 0.02) {
      ctx.fillStyle = `rgba(255,240,180,${tw * 0.85})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Red X marks the spot — pulses in size + brightness.
  const xp = breathe(t, 1.2);
  const cx = 7.5;
  const cy = -1.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1 + xp * 0.12, 1 + xp * 0.12);
  ctx.strokeStyle = `rgb(${200 + Math.round(xp * 40)},${24 + Math.round(xp * 30)},${20 + Math.round(xp * 20)})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-2.5, -2.5);
  ctx.lineTo(2.5, 2.5);
  ctx.moveTo(2.5, -2.5);
  ctx.lineTo(-2.5, 2.5);
  ctx.stroke();
  ctx.restore();
  // sparkle pinging at the X peak
  sparkle(ctx, cx, cy, 1.4 + xp * 1.6, xp * xp * 0.85, "255,160,140");

  // Compass rose top-left
  ctx.strokeStyle = "rgba(120,90,40,0.6)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(-8, -7, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(120,90,40,0.7)";
  ctx.beginPath();
  ctx.moveTo(-8, -11);
  ctx.lineTo(-7, -7);
  ctx.lineTo(-8, -3);
  ctx.lineTo(-9, -7);
  ctx.closePath();
  ctx.fill();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  treasure_chest_open: animChestOpen,
  treasure_coin_stack: animCoinStack,
  treasure_gold_key: animGoldKey,
  treasure_crown: animCrown,
  treasure_ring: animRing,
  treasure_goblet: animGoblet,
  treasure_gold_bars: animGoldBars,
  treasure_gem_pile: animGemPile,
  treasure_map: animMap,
};
