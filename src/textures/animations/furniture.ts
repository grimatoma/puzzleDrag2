// Animated furniture icons. Each function redraws the WHOLE icon at time `t`
// (elapsed seconds), centered at origin (0,0) within a roughly -24..+24 box.
// The caller handles clear / save / translate / scale / lineCap / lineJoin /
// restore. Motion is derived purely from `t` and from indices (no Math.random)
// so frames are deterministic; loops are seamless via Math.sin/cos and modulo.
//
// Each draw matches its static counterpart in
// `src/textures/categories/furniture.ts` — same colors and shapes, but alive.

// Local rounded-rect helper (per-file path builder, matching the static icons).
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function woodH(ctx: CanvasRenderingContext2D, x0: number, x1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "#c08a4a");
  g.addColorStop(0.5, "#8a5424");
  g.addColorStop(1, "#5a3414");
  return g;
}

function woodV(ctx: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#c08a4a");
  g.addColorStop(0.5, "#8a5424");
  g.addColorStop(1, "#5a3414");
  return g;
}

function drawShadow(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Fireplace — flames flicker/dance, glow pulses, embers drift up.
// ---------------------------------------------------------------------------
function animFireplace(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 22, 4);
  // Stone surround
  const stone = ctx.createLinearGradient(0, -16, 0, 22);
  stone.addColorStop(0, "#b8b2a4");
  stone.addColorStop(1, "#7a746a");
  ctx.fillStyle = stone;
  rr(ctx, -20, -10, 40, 32, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wooden mantel across the top
  ctx.fillStyle = woodH(ctx, -22, 22);
  rr(ctx, -22, -16, 44, 7, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Mantel highlight
  ctx.fillStyle = "rgba(255,224,160,0.4)";
  rr(ctx, -21, -15, 42, 1.6, 0.8);
  ctx.fill();
  // Brick mortar lines on surround
  ctx.strokeStyle = "rgba(58,56,48,0.45)";
  ctx.lineWidth = 0.7;
  [-3, 5, 13].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-20, y); ctx.lineTo(20, y);
    ctx.stroke();
  });
  ([[-12, -9, -3], [-6, 5, 13], [10, -9, -3], [4, 5, 13]] as const).forEach(([x, y0, y1]) => {
    ctx.beginPath();
    ctx.moveTo(x, y0); ctx.lineTo(x, y1);
    ctx.stroke();
  });
  // Firebox opening — dark arch
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.lineTo(-12, 0);
  ctx.arc(0, 0, 12, Math.PI, 0, false);
  ctx.lineTo(12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Warm fire glow — pulses with the flicker.
  const glowPulse = 0.85 + Math.sin(t * 6.0) * 0.1 + Math.sin(t * 11.0) * 0.05;
  const glowR = 18 + Math.sin(t * 4.5) * 1.6;
  const glow = ctx.createRadialGradient(0, 14, 2, 0, 14, glowR);
  glow.addColorStop(0, `rgba(255,170,60,${glowPulse})`);
  glow.addColorStop(0.6, "rgba(255,120,40,0.4)");
  glow.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 14, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Logs
  ctx.strokeStyle = "#6a4218";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 20); ctx.lineTo(6, 18);
  ctx.moveTo(-6, 20); ctx.lineTo(8, 22);
  ctx.stroke();
  // Log ends
  ctx.fillStyle = "#a87a3a";
  ctx.beginPath();
  ctx.arc(-8, 20, 2, 0, Math.PI * 2);
  ctx.arc(8, 22, 2, 0, Math.PI * 2);
  ctx.fill();

  // Crackling flames — each gets its own seed for wobble + height variance.
  const flame = (cx: number, cy: number, s: number, phase: number): void => {
    const wob = Math.sin(t * 6.3 + phase) * 1.3 + Math.sin(t * 10.7 + phase * 1.7) * 0.6;
    const stretch = 1 + Math.sin(t * 7.1 + phase) * 0.18 + Math.sin(t * 13.0 + phase) * 0.08;
    const tipY = cy - s * 2.4 * stretch;
    const tipX = cx + wob;
    const g = ctx.createLinearGradient(cx, tipY, cx, cy);
    g.addColorStop(0, "#fffbe0");
    g.addColorStop(0.45, "#ffd24a");
    g.addColorStop(1, "#e8501a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.bezierCurveTo(cx + s, cy - s, cx + s * 0.7, cy, cx, cy);
    ctx.bezierCurveTo(cx - s * 0.7, cy, cx - s, cy - s, tipX, tipY);
    ctx.closePath();
    ctx.fill();
  };
  flame(0, 18, 4.5, 0);
  flame(-5, 19, 3, 2.1);
  flame(5, 19, 3, 4.3);

  // Spark embers drifting up — each loops from base to top then fades/restarts.
  ([[-2, 0.9, 0], [3, 0.8, 1.3], [-4, 0.7, 2.6], [1, 0.6, 3.9]] as const).forEach(([x, r, phase], i) => {
    const cyc = (t * 0.55 + phase) % 1; // 0..1 rising
    const ey = 16 - cyc * 16;           // from ~16 up to ~0
    const ex = x + Math.sin(t * 3.0 + phase + i) * 1.4;
    const alpha = Math.sin(cyc * Math.PI) * 0.85; // fade in/out across the rise
    ctx.fillStyle = `rgba(255,210,120,${alpha})`;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// Lamp — shade glow breathes/flickers warmly (gentle, steady).
// ---------------------------------------------------------------------------
function animLamp(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 13, 4);
  // Gentle warm breathing with a faint flicker overlay.
  const breathe = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 5.4) * 0.04;
  const glowA = 0.7 + breathe;
  const glowR = 20 + Math.sin(t * 1.8) * 1.2;

  // Warm glow halo behind shade
  const glow = ctx.createRadialGradient(0, -8, 3, 0, -8, glowR);
  glow.addColorStop(0, `rgba(255,210,110,${glowA})`);
  glow.addColorStop(1, "rgba(255,210,110,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -8, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Base plate
  ctx.fillStyle = "#5a4218";
  ctx.beginPath();
  ctx.ellipse(0, 20, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const base = ctx.createLinearGradient(0, 14, 0, 20);
  base.addColorStop(0, "#a8843a");
  base.addColorStop(1, "#6a4e18");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-7, 20);
  ctx.bezierCurveTo(-5, 14, 5, 14, 7, 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Brass stem
  const stem = ctx.createLinearGradient(-2, 0, 2, 0);
  stem.addColorStop(0, "#e8c860");
  stem.addColorStop(0.5, "#b8902a");
  stem.addColorStop(1, "#7a5e18");
  ctx.fillStyle = stem;
  rr(ctx, -1.6, 0, 3.2, 16, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a2c08";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Stem knob
  ctx.fillStyle = "#d8b048";
  ctx.beginPath();
  ctx.arc(0, 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5e18";
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Glowing shade (trapezoid) — brightness tracks the breathing.
  const lift = breathe * 0.9; // shift gradient brighter as it breathes
  const shade = ctx.createLinearGradient(0, -18, 0, -2);
  shade.addColorStop(0, "#fff0c0");
  shade.addColorStop(0.5, lift > 0.05 ? "#ffe08c" : "#ffd87a");
  shade.addColorStop(1, "#f0a838");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(-7, -2);
  ctx.lineTo(-11, -2);
  ctx.lineTo(-7, -18);
  ctx.lineTo(7, -18);
  ctx.lineTo(11, -2);
  ctx.lineTo(7, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b87a18";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Shade rim trims
  ctx.strokeStyle = "rgba(184,122,24,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, -18); ctx.lineTo(7, -18);
  ctx.moveTo(-11, -2); ctx.lineTo(11, -2);
  ctx.stroke();
  // Shade highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(-4, -16);
  ctx.lineTo(-1, -16);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-8, -4);
  ctx.closePath();
  ctx.fill();
  // Warm light pooling under the shade — pulses with breathing.
  ctx.fillStyle = `rgba(255,225,150,${0.5 + breathe})`;
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Clock — pendulum bob swings side to side; minute hand creeps slowly.
// ---------------------------------------------------------------------------
function animClock(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 11, 3);
  // Wooden case (rounded top, long pendulum box)
  ctx.fillStyle = woodV(ctx, -22, 22);
  ctx.beginPath();
  ctx.moveTo(-11, -10);
  ctx.arc(0, -10, 11, Math.PI, 0, false);
  ctx.lineTo(11, 18);
  ctx.lineTo(-11, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Crown finial
  ctx.fillStyle = "#9a6630";
  ctx.beginPath();
  ctx.arc(0, -21, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Clock face
  ctx.fillStyle = "#f6efdc";
  ctx.beginPath();
  ctx.arc(0, -9, 8.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Hour ticks
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = 7;
    const r2 = 8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, -9 + Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, -9 + Math.sin(a) * r2);
    ctx.stroke();
  }
  // Hands — minute hand sweeps slowly (full loop every ~60s); hour hand stays up.
  const cx = 0;
  const cy = -9;
  const minAng = -Math.PI / 2 + (t / 60) * Math.PI * 2; // start pointing up, rotate
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 5);                       // hour hand up
  ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(minAng) * 5.4, cy + Math.sin(minAng) * 5.4); // minute hand
  ctx.stroke();
  // Center pin
  ctx.fillStyle = "#3a1e08";
  ctx.beginPath();
  ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Pendulum window (dark) in lower case
  ctx.fillStyle = "#3a2210";
  rr(ctx, -6, 2, 12, 14, 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pendulum — swings about the pivot at (0, 2). Seamless via sin.
  const swing = Math.sin(t * 3.0) * 0.32; // radians, ~±18°
  const px = 0;
  const py = 2;        // pivot
  const len = 11;      // rod length to bob center
  const bx = px + Math.sin(swing) * len;
  const by = py + Math.cos(swing) * len;
  // Rod
  ctx.strokeStyle = "#c8a850";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(bx, by);
  ctx.stroke();
  // Brass bob
  const bob = ctx.createRadialGradient(bx - 1, by - 1, 1, bx, by, 4);
  bob.addColorStop(0, "#ffe9a0");
  bob.addColorStop(1, "#a8842a");
  ctx.fillStyle = bob;
  ctx.beginPath();
  ctx.arc(bx, by, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5e1a";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Table — candle flame flickers + glow pulses.
// ---------------------------------------------------------------------------
function animTable(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 20, 4);
  // Legs
  ctx.fillStyle = woodH(ctx, -3, 3);
  rr(ctx, -14, 2, 4, 19, 1.4);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = woodH(ctx, -3, 3);
  rr(ctx, 10, 2, 4, 19, 1.4);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Apron under tabletop
  ctx.fillStyle = "#6a3e18";
  rr(ctx, -15, 2, 30, 4, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Round tabletop
  const top = ctx.createLinearGradient(0, -4, 0, 4);
  top.addColorStop(0, "#c89858");
  top.addColorStop(0.5, "#a8703a");
  top.addColorStop(1, "#7a4a1e");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Tabletop grain rings
  ctx.strokeStyle = "rgba(58,30,8,0.4)";
  ctx.lineWidth = 0.7;
  [10, 14].forEach((r) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.29, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Tabletop highlight
  ctx.fillStyle = "rgba(255,224,170,0.4)";
  ctx.beginPath();
  ctx.ellipse(-6, -1.5, 6, 1.6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Candle on top
  ctx.fillStyle = "#fff6e0";
  rr(ctx, -2, -12, 4, 11, 1);
  ctx.fill();
  ctx.strokeStyle = "#d8b878";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Candle drip highlight
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-1, -11); ctx.lineTo(-1, -2);
  ctx.stroke();

  // Warm flame glow — pulses with the flicker.
  const glowPulse = 0.6 + Math.sin(t * 6.5) * 0.14 + Math.sin(t * 12.0) * 0.06;
  const glowR = 9 + Math.sin(t * 5.0) * 1.0;
  const glow = ctx.createRadialGradient(0, -14, 1, 0, -14, glowR);
  glow.addColorStop(0, `rgba(255,200,90,${glowPulse})`);
  glow.addColorStop(1, "rgba(255,200,90,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -14, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Flame — wobble + height variance.
  const wob = Math.sin(t * 6.7) * 0.8 + Math.sin(t * 11.3) * 0.4;
  const stretch = 1 + Math.sin(t * 7.5) * 0.16 + Math.sin(t * 13.7) * 0.07;
  const tipY = -12 - 6 * stretch;
  const tipX = wob;
  const flame = ctx.createLinearGradient(0, tipY, 0, -12);
  flame.addColorStop(0, "#fffbe0");
  flame.addColorStop(0.5, "#ffd24a");
  flame.addColorStop(1, "#e8701a");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.bezierCurveTo(2.4, -15, 2, -12, 0, -12);
  ctx.bezierCurveTo(-2, -12, -2.4, -15, tipX, tipY);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Mirror — soft specular sheen sweeps diagonally across the glass on a loop.
// ---------------------------------------------------------------------------
function animMirror(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 14, 4);
  // Standing feet
  ctx.strokeStyle = "#9a7a2a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 18); ctx.lineTo(-10, 22);
  ctx.moveTo(6, 18); ctx.lineTo(10, 22);
  ctx.moveTo(0, 16); ctx.lineTo(0, 19);
  ctx.stroke();
  // Gold ornate oval frame
  const frame = ctx.createLinearGradient(-14, 0, 14, 0);
  frame.addColorStop(0, "#f0d878");
  frame.addColorStop(0.5, "#c8a032");
  frame.addColorStop(1, "#8a6a1a");
  ctx.fillStyle = frame;
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a4410";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner frame bevel
  ctx.strokeStyle = "rgba(255,245,200,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -2, 12.2, 17, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Mirror glass
  const glass = ctx.createLinearGradient(-9, -18, 9, 14);
  glass.addColorStop(0, "#d8eef4");
  glass.addColorStop(0.5, "#a8c8d8");
  glass.addColorStop(1, "#7a9eb0");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a7a88";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Static base sheens (faint, so the glass never looks bare)
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.lineTo(-3, -14);
  ctx.lineTo(4, 8);
  ctx.lineTo(0, 10);
  ctx.closePath();
  ctx.fill();

  // Sweeping specular sheen — clip to the glass ellipse, sweep a bright diagonal
  // band across it. Offset loops seamlessly via a sawtooth (modulo) on t.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 15, 0, 0, Math.PI * 2);
  ctx.clip();
  // Travel from lower-left off-screen to upper-right off-screen and wrap.
  const period = 4.5;
  const phase = ((t % period) / period); // 0..1
  const travel = -18 + phase * 36;        // band center moves -18 -> +18
  // The band runs along the glass diagonal (top-left to bottom-right).
  const ang = Math.atan2(32, 18); // glass gradient diagonal
  ctx.translate(0, -2);
  ctx.rotate(ang - Math.PI / 2);
  const band = ctx.createLinearGradient(travel - 9, 0, travel + 9, 0);
  band.addColorStop(0, "rgba(255,255,255,0)");
  band.addColorStop(0.5, "rgba(255,255,255,0.55)");
  band.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = band;
  ctx.fillRect(-24, -28, 48, 56);
  ctx.restore();

  // Ornate crown scroll at top of frame
  ctx.fillStyle = "#e0c860";
  ctx.beginPath();
  ctx.arc(0, -22, 3, Math.PI, 0, false);
  ctx.fill();
  ctx.strokeStyle = "#5a4410";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Frame stud accents
  ctx.fillStyle = "#fff5c8";
  ([[-12, -2], [12, -2], [0, -20], [0, 16]] as const).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// Bookshelf — restrained idle: a gentle highlight shimmer travels along the
// book spines, plus one slow dust mote drifting.
// ---------------------------------------------------------------------------
function animBookshelf(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 17, 4);
  // Outer cabinet frame
  ctx.fillStyle = woodV(ctx, -20, 22);
  rr(ctx, -15, -20, 30, 42, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner recessed back
  ctx.fillStyle = "#4a2c12";
  rr(ctx, -12, -17, 24, 36, 1.5);
  ctx.fill();
  // Shelf boards
  ctx.fillStyle = "#7a4a1e";
  [-5, 7].forEach((y) => {
    rr(ctx, -12, y, 24, 3, 1);
    ctx.fill();
    ctx.strokeStyle = "#3a1e08";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  // Book spine helper — `shine` (0..1) adds a soft moving highlight.
  const book = (x: number, yTop: number, w: number, h: number, color: string, lean: number, shine: number): void => {
    ctx.save();
    ctx.translate(x, yTop + h);
    ctx.rotate(lean);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, color);
    g.addColorStop(0.5, color);
    g.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = g;
    rr(ctx, -w / 2, -h, w, h, 1);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // top band
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    rr(ctx, -w / 2 + 0.6, -h + 1.2, w - 1.2, 1.4, 0.5);
    ctx.fill();
    // moving shimmer highlight
    if (shine > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${0.22 * shine})`;
      rr(ctx, -w / 2 + 0.6, -h + 2, w - 1.2, h - 3, 0.8);
      ctx.fill();
    }
    ctx.restore();
  };

  // A horizontal shimmer position sweeps across the shelf left->right and wraps.
  const sweep = ((t * 0.18) % 1) * 30 - 15; // -15..+15 (matches book x range)
  const shineFor = (x: number): number => {
    const d = Math.abs(x - sweep);
    return d < 5 ? (1 - d / 5) : 0;
  };

  // Top row of books
  book(-9, -16, 4, 11, "#c8483a", 0, shineFor(-9));
  book(-4.5, -16, 3.6, 11, "#3a78b8", 0, shineFor(-4.5));
  book(-0.5, -16, 4, 11, "#e0a838", 0, shineFor(-0.5));
  book(4, -16, 3.4, 11, "#5aa05a", 0, shineFor(4));
  book(8.4, -15, 3.6, 10, "#9a5ad0", 0.18, shineFor(8.4));
  // Middle row of books
  book(-9, -4, 4, 10, "#3a8866", 0, shineFor(-9));
  book(-4.5, -4, 3.6, 10, "#d06aa0", 0, shineFor(-4.5));
  book(-0.5, -4, 4, 10, "#c8483a", 0, shineFor(-0.5));
  book(4, -4, 3.4, 10, "#e0a838", 0, shineFor(4));
  book(8, -4, 4, 10, "#3a78b8", 0, shineFor(8));
  // Bottom row — a leaning stack + stacked flat books
  book(-9, 8, 4, 10, "#9a5ad0", 0, shineFor(-9));
  book(-4.5, 8, 3.6, 10, "#5aa05a", 0, shineFor(-4.5));
  book(0, 9, 8, 3, "#a8703a", 0, 0);
  book(0, 12, 7, 3, "#c8483a", 0, 0);
  // Small plant pot on bottom-right
  ctx.fillStyle = "#b8542a";
  rr(ctx, 7, 13, 6, 5, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#5a8028";
  ([[8, 11], [10, 10], [12, 11]] as const).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 1.8, 3, x < 10 ? -0.5 : 0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // One slow dust mote drifting up and sideways, looping seamlessly.
  const cyc = (t * 0.16) % 1;
  const mx = -6 + Math.sin(t * 0.7) * 3;
  const my = 16 - cyc * 30;
  const ma = Math.sin(cyc * Math.PI) * 0.35;
  ctx.fillStyle = `rgba(255,240,200,${ma})`;
  ctx.beginPath();
  ctx.arc(mx, my, 0.8, 0, Math.PI * 2);
  ctx.fill();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  furn_fireplace: animFireplace,
  furn_lamp: animLamp,
  furn_clock: animClock,
  furn_table: animTable,
  furn_mirror: animMirror,
  furn_bookshelf: animBookshelf,
};
