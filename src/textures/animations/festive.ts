// Animated festive / holiday / winter celebration icons.
//
// Self-contained Canvas-2D animation fns (no imports / no shared exports).
// Each fn redraws the COMPLETE icon at time `t` (elapsed seconds), centered at
// origin (0,0) within a roughly -24..+24 box. The caller handles clear / save /
// translate / scale / lineCap / restore. Motion is derived purely from `t` and
// from indices (no Math.random) so frames are deterministic, and loops are made
// seamless via Math.sin/cos and modulo.

const TAU = Math.PI * 2;

// Local rounded-rect helper (mirrors the source-icon convention).
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShadow(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, TAU);
  ctx.fill();
}

// Twinkly four-point sparkle, fades in/out with `k` (0..1).
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, k: number): void {
  if (k <= 0.001) return;
  const a = Math.max(0, Math.min(1, k));
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = `rgba(255,255,255,${(0.9 * a).toFixed(3)})`;
  const r = s * a;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.25, -r * 0.25);
  ctx.lineTo(r, 0);
  ctx.lineTo(r * 0.25, r * 0.25);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.25, r * 0.25);
  ctx.lineTo(-r, 0);
  ctx.lineTo(-r * 0.25, -r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 1. Snowman — falling snow drifts down + sideways, scarf tail flutters,
//    subtle breathing bob.
// ---------------------------------------------------------------------------
function animSnowman(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 16, 4);

  // Falling snow behind the snowman — looping flakes.
  const SNOW = 9;
  const span = 44; // vertical wrap distance
  for (let i = 0; i < SNOW; i++) {
    const seed = i * 1.7;
    const speed = 4 + (i % 3) * 1.2;
    // Vertical position wraps seamlessly via modulo.
    const yy = ((t * speed + seed * 7) % span);
    const y = -22 + yy;
    // Horizontal sway, plus per-flake column offset.
    const baseX = -20 + ((i * 41) % 40);
    const x = baseX + Math.sin(t * 1.4 + seed) * 4;
    // Fade in near top, out near bottom.
    const fade = Math.sin((yy / span) * Math.PI);
    const r = 0.9 + (i % 2) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${(0.7 * fade).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  // Breathing bob — whole figure gently rises/sinks.
  const bob = Math.sin(t * 1.6) * 0.6;
  ctx.save();
  ctx.translate(0, bob);

  // Twig arms (behind body)
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(-20, -4);
  ctx.moveTo(-15, -1);
  ctx.lineTo(-18, -6);
  ctx.moveTo(-14, 0);
  ctx.lineTo(-19, 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(20, -3);
  ctx.moveTo(15, 0);
  ctx.lineTo(19, -7);
  ctx.moveTo(15, 0);
  ctx.lineTo(20, 3);
  ctx.stroke();

  // Three snow balls — bottom, middle, head
  const balls: Array<[number, number, number]> = [
    [0, 12, 11],
    [0, 1, 8.5],
    [0, -10, 6.5],
  ];
  balls.forEach(([cx, cy, r]) => {
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 1, cx, cy, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.6, "#eef4fa");
    g.addColorStop(1, "#c2d2e2");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#9bb0c6";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });

  // Soft snowy highlight crescents
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  const cres: Array<[number, number, number, number]> = [[-3, 8, 4, 1.4], [-3, -2, 3, 1.1], [-2, -12, 2.4, 0.9]];
  cres.forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.4, 0, TAU);
    ctx.fill();
  });

  // Coal buttons + eyes
  ctx.fillStyle = "#2a2a30";
  ([[0, -2], [0, 2], [0, 6], [-2.4, -11.5], [2.4, -11.5]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, TAU);
    ctx.fill();
  });
  // Coal smile
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * 1.5, -7 + Math.abs(i) * 0.4, 0.6, 0, TAU);
    ctx.fill();
  }

  // Carrot nose
  const nose = ctx.createLinearGradient(0, -9, 8, -9);
  nose.addColorStop(0, "#ffae5a");
  nose.addColorStop(1, "#d4641a");
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, -8.4);
  ctx.lineTo(0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a44808";
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Scarf wrap
  ctx.fillStyle = "#c8281a";
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.quadraticCurveTo(0, -1, 7, -4);
  ctx.quadraticCurveTo(0, 1, -7, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a0e08";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Hanging scarf tail — flutters in the breeze.
  const flutter = Math.sin(t * 3.2) * 2.4;
  const flutter2 = Math.sin(t * 3.2 + 0.9) * 1.4;
  ctx.fillStyle = "#c8281a";
  ctx.beginPath();
  ctx.moveTo(4, -4);
  ctx.quadraticCurveTo(8 + flutter2, 0, 9 + flutter, 4);
  ctx.lineTo(6 + flutter, 5);
  ctx.quadraticCurveTo(4 + flutter2, 0, 2, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a0e08";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Scarf fringe (follows the tail tip)
  ctx.strokeStyle = "#e6c8a0";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(6 + flutter, 5); ctx.lineTo(6 + flutter, 7);
  ctx.moveTo(8 + flutter, 4.6); ctx.lineTo(8.4 + flutter, 6.6);
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. Gift — box does an excited shake/wobble every couple of seconds; bow
//    sparkles.
// ---------------------------------------------------------------------------
function animGift(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 18, 4);

  // Burst cycle: a short shake roughly every 2.4s.
  const period = 2.4;
  const phase = t % period;
  const active = phase < 0.7 ? (1 - phase / 0.7) : 0; // decaying envelope
  const shakeX = Math.sin(t * 38) * 1.6 * active;
  const wobble = Math.sin(t * 34 + 0.5) * 0.06 * active;

  ctx.save();
  // Wobble pivots about the box base.
  ctx.translate(0, 22);
  ctx.rotate(wobble);
  ctx.translate(shakeX, -22);

  // Box body
  const box = ctx.createLinearGradient(0, -4, 0, 22);
  box.addColorStop(0, "#3aa86a");
  box.addColorStop(1, "#1c6e42");
  ctx.fillStyle = box;
  rr(ctx, -16, -2, 32, 24, 2);
  ctx.fill();
  ctx.strokeStyle = "#0e3a22";
  ctx.lineWidth = 2;
  rr(ctx, -16, -2, 32, 24, 2);
  ctx.stroke();

  // Box lid
  ctx.fillStyle = "#46c47e";
  rr(ctx, -18, -8, 36, 8, 2);
  ctx.fill();
  ctx.strokeStyle = "#0e3a22";
  ctx.lineWidth = 2;
  rr(ctx, -18, -8, 36, 8, 2);
  ctx.stroke();
  // Lid highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  rr(ctx, -16, -7, 32, 2, 1);
  ctx.fill();

  // Vertical ribbon
  ctx.fillStyle = "#e8c020";
  rr(ctx, -4, -8, 8, 30, 1);
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 1;
  rr(ctx, -4, -8, 8, 30, 1);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,200,0.55)";
  rr(ctx, -3, -8, 2, 30, 1);
  ctx.fill();

  // Bow loops
  ctx.fillStyle = "#f4cc28";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-12, -22, -16, -8, -2, -8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(12, -22, 16, -8, 2, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-12, -22, -16, -8, -2, -8);
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(12, -22, 16, -8, 2, -8);
  ctx.stroke();
  ctx.strokeStyle = "rgba(168,120,8,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, -9); ctx.bezierCurveTo(-9, -16, -11, -10, -2, -9);
  ctx.moveTo(2, -9); ctx.bezierCurveTo(9, -16, 11, -10, 2, -9);
  ctx.stroke();

  // Bow knot
  ctx.fillStyle = "#e8c020";
  ctx.beginPath();
  ctx.arc(0, -8, 3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,200,0.7)";
  ctx.beginPath();
  ctx.arc(-1, -9, 1, 0, TAU);
  ctx.fill();

  ctx.restore();

  // Bow sparkles — staggered twinkles around the bow.
  const spk: Array<[number, number, number]> = [[-9, -14, 0], [9, -13, 1.1], [0, -19, 2.2]];
  spk.forEach(([x, y, off]) => {
    const k = Math.pow(Math.max(0, Math.sin(t * 3 + off)), 3);
    sparkle(ctx, x, y, 2.6, k);
  });
}

// ---------------------------------------------------------------------------
// 3. Wreath — tiny warm lights twinkle at staggered phases; bow tails sway.
// ---------------------------------------------------------------------------
function animWreath(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 18, 4);
  const R = 16;

  // Dark base + mid green ring
  ctx.strokeStyle = "#143a1c";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(0, -1, R, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "#1f5a2e";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, -1, R, 0, TAU);
  ctx.stroke();

  // Needle tufts
  ctx.lineCap = "round";
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU;
    const cx = Math.cos(a) * R;
    const cy = Math.sin(a) * R - 1;
    const outR = 4 + (i % 3);
    const nx = Math.cos(a + 0.3) * outR;
    const ny = Math.sin(a + 0.3) * outR;
    ctx.strokeStyle = i % 2 === 0 ? "#2e7a3e" : "#3a8a48";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + nx, cy + ny);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const cx = Math.cos(a) * R;
    const cy = Math.sin(a) * R - 1;
    ctx.strokeStyle = "#2e7a3e";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - Math.cos(a) * 4, cy - Math.sin(a) * 4);
    ctx.stroke();
  }

  // Green highlight sparkles
  ctx.fillStyle = "rgba(170,230,160,0.6)";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R, Math.sin(a) * R - 1, 1, 0, TAU);
    ctx.fill();
  }

  // Red berries
  const berryPts: Array<[number, number]> = [[-12, 6], [-7, 9], [-13, 0], [10, -10], [13, -3]];
  berryPts.forEach(([x, y]) => {
    ctx.fillStyle = "#d4281a";
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,200,180,0.7)";
    ctx.beginPath();
    ctx.arc(x - 0.5, y - 0.6, 0.6, 0, TAU);
    ctx.fill();
  });

  // Twinkling warm lights around the ring at staggered phases.
  const LIGHTS = 10;
  for (let i = 0; i < LIGHTS; i++) {
    const a = (i / LIGHTS) * TAU + 0.2;
    const lx = Math.cos(a) * R;
    const ly = Math.sin(a) * R - 1;
    const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.9);
    // Warm hue alternates between gold and red-orange.
    const warm = i % 2 === 0;
    const cr = warm ? 255 : 255;
    const cg = warm ? 220 : 150;
    const cb = warm ? 120 : 80;
    const glowR = 2.6 + tw * 1.4;
    const halo = ctx.createRadialGradient(lx, ly, 0.5, lx, ly, glowR);
    halo.addColorStop(0, `rgba(${cr},${cg},${cb},${(0.85 * tw + 0.1).toFixed(3)})`);
    halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(lx, ly, glowR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,250,230,${(0.6 + 0.4 * tw).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(lx, ly, 0.9, 0, TAU);
    ctx.fill();
  }

  // Red bow with swaying tails.
  ctx.fillStyle = "#c8181a";
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-12, 6, -14, 18, -2, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(12, 6, 14, 18, 2, 16);
  ctx.closePath();
  ctx.fill();

  // Bow tails sway side to side (opposite phases).
  const swayL = Math.sin(t * 2.2) * 1.8;
  const swayR = Math.sin(t * 2.2 + Math.PI) * 1.8;
  ctx.fillStyle = "#c8181a";
  ctx.beginPath();
  ctx.moveTo(-2, 15);
  ctx.lineTo(-6 + swayL, 24);
  ctx.lineTo(-2 + swayL, 23);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 15);
  ctx.lineTo(6 + swayR, 24);
  ctx.lineTo(2 + swayR, 23);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#7a0e08";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-12, 6, -14, 18, -2, 16);
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(12, 6, 14, 18, 2, 16);
  ctx.stroke();

  // Bow knot
  ctx.fillStyle = "#e0402a";
  ctx.beginPath();
  ctx.arc(0, 14.5, 2.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,200,180,0.7)";
  ctx.beginPath();
  ctx.arc(-0.8, 13.8, 0.8, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 4. Bell — bell swings, clapper swings (offset), sound-wave arcs ring out at
//    swing peaks, plus a sparkle.
// ---------------------------------------------------------------------------
function animBell(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 14, 4);

  // Swing about the top ribbon loop (~y -16).
  const swing = Math.sin(t * 3.4) * 0.18; // radians

  // Sound waves ring out when the bell is near a swing extreme (|sin|≈1).
  const ring = Math.abs(Math.sin(t * 3.4));
  const ringK = Math.pow(Math.max(0, ring - 0.55) / 0.45, 1.5);
  const sideSign = Math.sin(t * 3.4) >= 0 ? 1 : -1;
  if (ringK > 0.01) {
    ctx.strokeStyle = `rgba(255,236,150,${(0.7 * ringK).toFixed(3)})`;
    for (let w = 0; w < 2; w++) {
      const rad = 16 + w * 4;
      ctx.lineWidth = 1.6 - w * 0.4;
      const cx = sideSign * 16;
      ctx.beginPath();
      ctx.arc(cx, 0, rad, sideSign > 0 ? -0.7 : Math.PI - 0.7, sideSign > 0 ? 0.7 : Math.PI + 0.7);
      ctx.stroke();
    }
  }

  // Sparkle near the crown.
  const spk = Math.pow(Math.max(0, Math.sin(t * 2.6 + 0.5)), 3);
  sparkle(ctx, 9, -12, 2.4, spk);

  ctx.save();
  ctx.translate(0, -16);
  ctx.rotate(swing);
  ctx.translate(0, 16);

  // Top ribbon loop
  ctx.strokeStyle = "#c8181a";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-5, -22, 5, -22, 0, -16);
  ctx.stroke();
  // Crown cap
  ctx.fillStyle = "#caa018";
  ctx.beginPath();
  ctx.arc(0, -14, 2.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a5808";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bell body
  const body = ctx.createLinearGradient(-12, 0, 12, 0);
  body.addColorStop(0, "#fff0a0");
  body.addColorStop(0.4, "#f0c828");
  body.addColorStop(0.7, "#c89818");
  body.addColorStop(1, "#8a6408");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(-7, -12, -10, 0, -13, 10);
  ctx.bezierCurveTo(-14, 13, -10, 14, 0, 14);
  ctx.bezierCurveTo(10, 14, 14, 13, 13, 10);
  ctx.bezierCurveTo(10, 0, 7, -12, 0, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3e08";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rim band
  ctx.fillStyle = "#b88808";
  rr(ctx, -13, 10, 26, 4, 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3e08";
  ctx.lineWidth = 1.2;
  rr(ctx, -13, 10, 26, 4, 2);
  ctx.stroke();

  // Vertical highlight
  ctx.fillStyle = "rgba(255,250,220,0.7)";
  ctx.beginPath();
  ctx.ellipse(-5, -2, 2, 9, -0.1, 0, TAU);
  ctx.fill();

  // Clapper peeking out — swings with extra offset for an out-of-phase wag.
  const clap = Math.sin(t * 3.4 - 0.9) * 2.2;
  ctx.fillStyle = "#8a6408";
  ctx.beginPath();
  ctx.arc(clap, 15, 2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a3e08";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Holly accent
  ctx.fillStyle = "#2e7a3e";
  ([[-5, -10, -0.4], [5, -10, 0.4]] as Array<[number, number, number]>).forEach(([x, y, lean]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#0e3a18";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
  });
  ctx.fillStyle = "#d4281a";
  ([[-1.5, -11], [1.5, -11], [0, -9]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, TAU);
    ctx.fill();
  });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. Ornament — swings like a pendulum from its string; specular shine sweeps;
//    sparkle.
// ---------------------------------------------------------------------------
function animOrnament(ctx: CanvasRenderingContext2D, t: number): void {
  // Pendulum swing about the hook (~y -19).
  const swing = Math.sin(t * 1.7) * 0.16;

  // Hook + string (fixed at top, string follows the swing).
  ctx.strokeStyle = "#8a8478";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -19, 2.4, Math.PI * 0.2, Math.PI * 1.6);
  ctx.stroke();

  ctx.save();
  ctx.translate(0, -19);
  ctx.rotate(swing);
  ctx.translate(0, 19);

  // String segment
  ctx.strokeStyle = "#8a8478";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, -13);
  ctx.stroke();

  // Cap
  ctx.fillStyle = "#caa018";
  rr(ctx, -3, -15, 6, 4, 1);
  ctx.fill();
  ctx.strokeStyle = "#7a5808";
  ctx.lineWidth = 0.9;
  rr(ctx, -3, -15, 6, 4, 1);
  ctx.stroke();

  drawShadow(ctx, 12, 3.5);

  // Bauble sphere
  const g = ctx.createRadialGradient(-4, -6, 2, 1, 0, 16);
  g.addColorStop(0, "#ff8a8a");
  g.addColorStop(0.45, "#d4281a");
  g.addColorStop(1, "#5a0808");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Gold stripe band (clipped to sphere)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, TAU);
  ctx.clip();
  ctx.fillStyle = "#f0c828";
  ctx.beginPath();
  ctx.moveTo(-14, 1);
  ctx.quadraticCurveTo(0, -3, 14, 1);
  ctx.quadraticCurveTo(0, 5, -14, 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#fff0a0";
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(i * 4, 1 - Math.cos(i * 0.5) * 0.6, 0.9, 0, TAU);
    ctx.fill();
  }

  // Specular shine sweeps across the sphere (still clipped).
  const sweep = ((t * 0.5) % 1); // 0..1 loop
  const sx = -13 + sweep * 26;
  ctx.save();
  ctx.translate(sx, 0);
  ctx.rotate(-0.5);
  const shine = ctx.createLinearGradient(-5, 0, 5, 0);
  shine.addColorStop(0, "rgba(255,255,255,0)");
  shine.addColorStop(0.5, "rgba(255,255,255,0.55)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fillRect(-5, -16, 10, 32);
  ctx.restore();
  ctx.restore();

  // Static specular highlights
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 2.4, 4, -0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(3, 6, 1.4, 0, TAU);
  ctx.fill();

  ctx.restore();

  // Sparkle ping near the top highlight.
  const spk = Math.pow(Math.max(0, Math.sin(t * 2.3)), 3);
  sparkle(ctx, -5 + swing * 8, -25, 2.6, spk);
}

// ---------------------------------------------------------------------------
// 6. Candy cane — bright glossy glint sweeps down the stripes on a loop;
//    sparkle ping at the hook.
// ---------------------------------------------------------------------------
function animCandyCane(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 12, 4);
  ctx.save();
  ctx.rotate(0.12);

  // White cane base
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, 22);
  ctx.lineTo(-4, -8);
  ctx.bezierCurveTo(-4, -18, 12, -18, 12, -8);
  ctx.stroke();

  // Red bands on shaft (clipped to shaft column)
  ctx.save();
  ctx.beginPath();
  ctx.rect(-9, -8, 12, 32);
  ctx.clip();
  ctx.strokeStyle = "#d4281a";
  ctx.lineWidth = 3;
  for (let y = -8; y < 24; y += 7) {
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(6, y - 8);
    ctx.stroke();
  }
  ctx.restore();

  // Red bands on hook
  ctx.save();
  ctx.beginPath();
  ctx.arc(4, -8, 12, Math.PI, TAU);
  ctx.rect(-4, -20, 16, 12);
  ctx.clip();
  ctx.strokeStyle = "#d4281a";
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + i * 0.45;
    const x1 = 4 + Math.cos(a) * 4;
    const y1 = -8 + Math.sin(a) * 4;
    const x2 = 4 + Math.cos(a) * 16;
    const y2 = -8 + Math.sin(a) * 16;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  // Thin white outline
  ctx.strokeStyle = "rgba(200,212,224,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-4, 22);
  ctx.lineTo(-4, -8);
  ctx.bezierCurveTo(-4, -18, 12, -18, 12, -8);
  ctx.stroke();

  // Static specular shine on shaft
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, 18);
  ctx.lineTo(-6, -6);
  ctx.stroke();

  // Sweeping glossy glint — a bright band travelling down the shaft, clipped to
  // the cane's straight column so the light stays contained on the candy.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-9, -8, 10, 32);
  ctx.clip();
  const sweep = ((t * 0.45) % 1); // loop
  const gy = -8 + sweep * 32;
  const grad = ctx.createLinearGradient(0, gy - 6, 0, gy + 6);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.85)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 7;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(-4, gy - 6);
  ctx.lineTo(-4, gy + 6);
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // Sparkle ping at the hook tip (outside the rotated frame, near top).
  const spk = Math.pow(Math.max(0, Math.sin(t * 2.4 + 1.0)), 3);
  sparkle(ctx, 11, -19, 2.6, spk);
}

// ---------------------------------------------------------------------------
// 7. Gingerbread — happy little wiggle/dance (slight rotation + bob); icing
//    sparkle.
// ---------------------------------------------------------------------------
function animGingerbread(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 14, 4);

  // Dance: rock side to side + bob up and down.
  const rock = Math.sin(t * 3.6) * 0.13;
  const bob = Math.sin(t * 7.2) * 0.8;

  ctx.save();
  // Pivot near the feet so the rock looks like a dance.
  ctx.translate(0, 20);
  ctx.rotate(rock);
  ctx.translate(0, -20 + bob);

  ctx.fillStyle = "#a86a32";
  // Head
  ctx.beginPath();
  ctx.arc(0, -13, 7, 0, TAU);
  ctx.fill();
  // Body
  rr(ctx, -7, -6, 14, 16, 5);
  ctx.fill();
  // Arms
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.bezierCurveTo(-16, -4, -18, 4, -14, 7);
  ctx.bezierCurveTo(-12, 5, -9, 2, -7, 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7, -4);
  ctx.bezierCurveTo(16, -4, 18, 4, 14, 7);
  ctx.bezierCurveTo(12, 5, 9, 2, 7, 2);
  ctx.closePath();
  ctx.fill();
  // Legs
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.bezierCurveTo(-9, 16, -10, 20, -6, 22);
  ctx.bezierCurveTo(-3, 20, -2, 14, -1, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 8);
  ctx.bezierCurveTo(9, 16, 10, 20, 6, 22);
  ctx.bezierCurveTo(3, 20, 2, 14, 1, 10);
  ctx.closePath();
  ctx.fill();

  // Outline
  ctx.strokeStyle = "#6a3c14";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -13, 7, 0, TAU);
  ctx.stroke();
  rr(ctx, -7, -6, 14, 16, 5);
  ctx.stroke();

  // Baked highlight
  ctx.fillStyle = "rgba(255,220,160,0.4)";
  ctx.beginPath();
  ctx.arc(-2, -15, 2.4, 0, TAU);
  ctx.fill();

  // Icing trim
  ctx.strokeStyle = "#fff8f0";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.quadraticCurveTo(-3, -7, 0, -5);
  ctx.quadraticCurveTo(3, -7, 6, -5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, 6); ctx.lineTo(-11, 3);
  ctx.moveTo(14, 6); ctx.lineTo(11, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, 18); ctx.lineTo(-4, 18);
  ctx.moveTo(8, 18); ctx.lineTo(4, 18);
  ctx.stroke();

  // Icing eyes + smile
  ctx.fillStyle = "#fff8f0";
  ctx.beginPath();
  ctx.arc(-2.4, -14, 1.1, 0, TAU);
  ctx.arc(2.4, -14, 1.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#fff8f0";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -12, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Gumdrop buttons
  ([[0, 0, "#d4281a"], [0, 5, "#2e9a4a"]] as Array<[number, number, string]>).forEach(([x, y, col]) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(x - 0.6, y - 0.6, 0.6, 0, TAU);
    ctx.fill();
  });

  // Icing sparkles — twinkle along the trim.
  const spk: Array<[number, number, number]> = [[0, -6, 0], [-12, 5, 1.3], [12, 5, 2.6]];
  spk.forEach(([x, y, off]) => {
    const k = Math.pow(Math.max(0, Math.sin(t * 3 + off)), 3);
    sparkle(ctx, x, y, 2.0, k);
  });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 8. Holly — red berries glint/shine in sequence; leaves shimmer faintly.
// ---------------------------------------------------------------------------
function animHolly(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 14, 3.5);

  // Faint leaf shimmer — a slowly travelling brightness factor.
  const leans: number[] = [-0.5, 0.5];
  leans.forEach((lean, li) => {
    const g = ctx.createLinearGradient(0, -12, lean * 18, 14);
    g.addColorStop(0, "#3a9a4a");
    g.addColorStop(1, "#16622a");
    ctx.fillStyle = g;
    ctx.save();
    ctx.rotate(lean * 0.6);
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.bezierCurveTo(4, -11, 2, -8, 6, -7);
    ctx.bezierCurveTo(3, -4, 5, -1, 7, 1);
    ctx.bezierCurveTo(3, 2, 4, 6, 3, 9);
    ctx.bezierCurveTo(1, 11, -1, 11, -3, 9);
    ctx.bezierCurveTo(-4, 6, -3, 2, -7, 1);
    ctx.bezierCurveTo(-5, -1, -3, -4, -6, -7);
    ctx.bezierCurveTo(-2, -8, -4, -11, 0, -14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0e3a18";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Shimmer band sweeping across the leaf (clipped to leaf shape).
    ctx.save();
    ctx.clip();
    const phase = (t * 0.4 + li * 0.5) % 1;
    const sy = -14 + phase * 25;
    const sh = ctx.createLinearGradient(0, sy - 5, 0, sy + 5);
    sh.addColorStop(0, "rgba(200,255,190,0)");
    sh.addColorStop(0.5, "rgba(200,255,190,0.35)");
    sh.addColorStop(1, "rgba(200,255,190,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(-8, sy - 5, 16, 10);
    ctx.restore();

    // Midrib
    ctx.strokeStyle = "rgba(160,220,150,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 8);
    ctx.stroke();
    // Side veins
    ctx.strokeStyle = "rgba(14,58,24,0.5)";
    ctx.lineWidth = 0.7;
    [-6, 0, 6].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(4, y - 2);
      ctx.moveTo(0, y);
      ctx.lineTo(-4, y - 2);
      ctx.stroke();
    });
    ctx.restore();
  });

  // Red berries with sequential glints.
  const berries: Array<[number, number, number]> = [[-2.5, 2, 3], [2.5, 1, 3], [0, 5, 3]];
  berries.forEach(([x, y, r], i) => {
    const bg = ctx.createRadialGradient(x - 1, y - 1, 0.5, x, y, r);
    bg.addColorStop(0, "#ff6a52");
    bg.addColorStop(0.6, "#d4281a");
    bg.addColorStop(1, "#7a0e08");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#5a0808";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Static base highlight
    ctx.fillStyle = "rgba(255,220,200,0.8)";
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 0.8, 0, TAU);
    ctx.fill();
    // Sequential glint — each berry pings in turn.
    const k = Math.pow(Math.max(0, Math.sin(t * 2.6 - i * (TAU / 3))), 4);
    if (k > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${(0.9 * k).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x - 1, y - 1.2, 1.1 * k + 0.4, 0, TAU);
      ctx.fill();
      sparkle(ctx, x - 1, y - 1.2, 2.2, k * 0.8);
    }
  });
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  festive_snowman: animSnowman,
  festive_gift: animGift,
  festive_wreath: animWreath,
  festive_bell: animBell,
  festive_ornament: animOrnament,
  festive_candy_cane: animCandyCane,
  festive_gingerbread: animGingerbread,
  festive_holly: animHolly,
};
