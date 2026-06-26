// Animated workshop / crafting hand tools — same look as
// src/textures/categories/workshopTools.ts, but alive and "in use".
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds), origin-centred
// in the 64px design box (content ≈ −24..+24, ground baseline ≈ y 22). The
// caller has cleared, translated to centre, scaled, and set lineCap/lineJoin
// = "round"; we only draw around the origin.
//
// The static silhouettes/palettes are the strong part and are preserved. The
// motion is rebuilt to lead with ARTICULATION rather than a rigid whole-tool
// rotate/slide: the moving part pivots at its base, every strike has
// anticipation → snap → recoil (the 12 principles via `windupOvershoot`/
// `easeOutBack`/`easeOutElastic`), and contact shadows couple to the vertical
// motion via `groundShadow`. Glints are demoted to a feathered secondary accent
// (shared `glint`), and several icons were re-framed to kill the dead air the
// review flagged (drill/saw/wrench floated badly off-centre).
//
// Loops are seamless: every position is driven off `t` through `loopPhase`/
// `beat`/`pingPong`/`breathe` (never a raw sawtooth used as a position). Pure
// and deterministic — no `Math.random`, no `Date`.

import {
  TAU,
  clamp01,
  lerp,
  easeInOutSine,
  easeOutCubic,
  easeOutBack,
  easeOutElastic,
  loopPhase,
  beat,
  windupOvershoot,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// ---- local drawing helpers (no shared equivalent) --------------------------

// Wood handle — fills a grained rounded bar from (x1,y1) to (x2,y2). Identical
// to the static draw so the handle reads the same when articulated.
function woodHandle(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
): void {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
  g.addColorStop(0, "#7a4a18");
  g.addColorStop(0.5, "#a87838");
  g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.fillRect(0, -width / 2, len, width);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(0, -width / 2, len, width);
  ctx.strokeStyle = "rgba(26,14,4,0.4)";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(len * 0.1 * i, -width / 2 + 0.5);
    ctx.lineTo(len * 0.1 * i + len * 0.7, -width / 2 + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

// Small specular gleam on metal (preserved from the static art).
function metalGleam(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.4, r * 0.8, -0.4, 0, TAU);
  ctx.fill();
}

// Warm metal-on-metal impact burst: a hot core, a soft halo, and four rays.
// `a` 0..1 alpha, `size` ray length. Warmer than the cool diamond `sparkle`,
// so it reads as a tool strike rather than a magic twinkle.
function impactSpark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  a: number,
  rot: number,
): void {
  if (a <= 0 || size <= 0) return;
  const k = clamp01(a);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // Soft halo.
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.1);
  halo.addColorStop(0, `rgba(255,236,180,${0.5 * k})`);
  halo.addColorStop(1, "rgba(255,236,180,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.1, 0, TAU);
  ctx.fill();
  // Rays.
  ctx.strokeStyle = `rgba(255,240,196,${0.85 * k})`;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * TAU + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * size * 0.25, Math.sin(ang) * size * 0.25);
    ctx.lineTo(Math.cos(ang) * size, Math.sin(ang) * size);
    ctx.stroke();
  }
  // Hot core.
  ctx.fillStyle = `rgba(255,255,238,${k})`;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// A few falling debris specks (sawdust / grit) at colour `col`, emitted from
// (ox,oy) with a per-cycle fall. `emit` 0..1 gates density to the work stroke.
function fallDebris(
  ctx: CanvasRenderingContext2D,
  t: number,
  ox: number,
  oy: number,
  spread: number,
  emit: number,
  col: string,
  count = 5,
): void {
  if (emit <= 0.02) return;
  for (let i = 0; i < count; i++) {
    const fall = loopPhase(t, 0.9, i * 0.17);
    const sx = ox + (i / Math.max(1, count - 1) - 0.5) * spread;
    const sy = oy + fall * 13;
    const a = (1 - fall) * 0.55 * emit;
    if (a <= 0.02) continue;
    ctx.fillStyle = `rgba(${col},${a})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.9 + (i % 2) * 0.5, 0, TAU);
    ctx.fill();
  }
}

// ----------------------------------------------------------------------------
// 1. HAMMER — pivots at the HANDLE BASE (not the icon centre): anticipation
//    lift → fast snap down → recoil bounce, with a spark on the rotated
//    striking face and a shadow that squashes on impact.
// ----------------------------------------------------------------------------
function animHammer(ctx: CanvasRenderingContext2D, t: number): void {
  // Strike beat: rest cocked, a sharp swing, then a damped bounce-back.
  const period = 1.4;
  const ph = loopPhase(t, period);
  // swing 0 = cocked/raised, 1 = struck. Anticipation dip then overshoot+settle.
  const swing = 0.5 + 0.5 * windupOvershoot(ph < 0.7 ? ph / 0.7 : 1, 0.22, 2.6);
  const rest = -0.16; // resting back-tilt (cocked)
  const ang = rest + swing * 0.72; // rotates down toward the work

  // Impact lands as the head bottoms out (end of the wind-up).
  const impact = beat(t, period, 0.16, -0.06);

  // Pivot is the handle BASE, down by the grip, recentred slightly up/left.
  const pivotX = -2;
  const pivotY = 16;

  // Shadow squashes (wider, darker) on the blow.
  groundShadow(ctx, 2, 23, 14 + impact * 5, 4, -impact * 2, 0.26);

  ctx.save();
  ctx.translate(-2.5, -1.5); // re-frame off=(3.5,1.8)
  ctx.translate(pivotX, pivotY);
  ctx.rotate(ang);
  ctx.translate(-pivotX, -pivotY);

  woodHandle(ctx, 2, -8, -4, 22, 5);

  ctx.save();
  ctx.translate(2, -12);
  const headG = ctx.createLinearGradient(0, -7, 0, 7);
  headG.addColorStop(0, "#e8e8f0");
  headG.addColorStop(0.45, "#9a9aa4");
  headG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.moveTo(2, -7);
  ctx.lineTo(15, -6);
  ctx.lineTo(15, 6);
  ctx.lineTo(2, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.moveTo(2, -6);
  ctx.lineTo(2, 6);
  ctx.bezierCurveTo(-8, 7, -16, 3, -18, -4);
  ctx.lineTo(-13, -5);
  ctx.bezierCurveTo(-11, 0, -7, 2, -3, 1);
  ctx.lineTo(-3, -1);
  ctx.bezierCurveTo(-7, -2, -11, -4, -13, -8);
  ctx.lineTo(-18, -7);
  ctx.bezierCurveTo(-15, -4, -10, -6, 2, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-18, -5.5);
  ctx.lineTo(-12, -6.5);
  ctx.stroke();
  metalGleam(ctx, 9, -2, 6);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(4, -5, 9, 1.4);

  // Spark on the rotated striking face (local to the head, so it travels with
  // the swing instead of floating in icon space).
  if (impact > 0) {
    impactSpark(ctx, 15, 3, 3 + impact * 3.5, impact * 0.95, ph * 7);
  }
  ctx.restore();

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 2. SAW — re-centred on the kerf; an asymmetric push (fast) / draw (slow)
//    stroke with a periodic catch-judder, and sawdust kicked from the teeth.
// ----------------------------------------------------------------------------
function animSaw(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 1.0;
  const ph = loopPhase(t, period);
  // Asymmetric stroke: fast power push (cut), slow draw-back. drive −1..1.
  let stroke: number;
  if (ph < 0.4) {
    stroke = lerp(-1, 1, easeOutCubic(ph / 0.4)); // fast forward power stroke
  } else {
    stroke = lerp(1, -1, easeInOutSine((ph - 0.4) / 0.6)); // slow draw back
  }
  // Catch-judder: a quick stutter mid-cut when the teeth bite.
  const judder = beat(t, period, 0.1, -0.34) * 0.7 * Math.sin(t * 70);
  const dx = stroke * 5.5 + judder;

  // Re-frame: was sitting ~8.8 low and ~3.6 right; lift + nudge left so the
  // kerf (teeth line) sits near the ground baseline and the blade is in-frame.
  groundShadow(ctx, -2, 22, 18, 4, 0, 0.24);

  ctx.save();
  ctx.translate(-3.6, -8.8);
  ctx.rotate(-0.12);
  ctx.translate(dx, 0);

  // Blade (points up-right).
  ctx.save();
  ctx.translate(-4, 0);
  const bladeG = ctx.createLinearGradient(0, -8, 0, 8);
  bladeG.addColorStop(0, "#f0f0f6");
  bladeG.addColorStop(0.5, "#b4b4bc");
  bladeG.addColorStop(1, "#5a5a62");
  ctx.fillStyle = bladeG;
  ctx.beginPath();
  ctx.moveTo(-2, -6);
  ctx.lineTo(28, -2);
  ctx.lineTo(28, 6);
  ctx.lineTo(-2, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "#7a7a82";
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 10; i++) {
    const x = -1 + i * 3;
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x + 1.5, 6);
    ctx.lineTo(x + 0.4, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(26, -1.2);
  ctx.stroke();
  ctx.restore();

  // Wooden D-grip (back/left).
  ctx.save();
  ctx.translate(-6, 0);
  const gripG = ctx.createLinearGradient(-12, 0, 0, 0);
  gripG.addColorStop(0, "#7a4a18");
  gripG.addColorStop(0.5, "#a87838");
  gripG.addColorStop(1, "#3a2008");
  ctx.fillStyle = gripG;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-14, -12, -16, 12, 0, 9);
  ctx.lineTo(0, 4);
  ctx.bezierCurveTo(-9, 6, -8, -5, 0, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,235,200,0.4)";
  ctx.beginPath();
  ctx.ellipse(-10, -2, 1.6, 4, 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Sawdust from the kerf — emitted under the teeth, in the re-framed space, and
  // pulsing strongest on the forward power stroke. The kerf stays put (the blade
  // slides through it) so dust falls from a fixed cut point, not off-frame.
  const emit = clamp01(0.35 + Math.max(0, stroke) * 0.65);
  ctx.save();
  ctx.translate(-3.6, -8.8);
  ctx.rotate(-0.12);
  fallDebris(ctx, t, 8 + dx * 0.4, 11, 18, emit, "214,178,120", 6);
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3. DRILL — re-centred; sells REAL rotation via cycling motion-blur arcs on a
//    spinning chuck/bit while the BIT jitters (the body is steady), plus a
//    grinding spark at the tip.
// ----------------------------------------------------------------------------
function animDrill(ctx: CanvasRenderingContext2D, t: number): void {
  // Body breathes a hair with the motor; the bit gets the high-freq jitter.
  const bx = Math.sin(t * 39) * 0.35;
  const by = Math.cos(t * 33) * 0.3;
  const spin = loopPhase(t, 0.16); // fast rotation phase for the bit/chuck

  // Re-frame: worst framing (off ≈ 5.2,7.9) — lift up and nudge left.
  groundShadow(ctx, -2, 23, 17, 4, 0, 0.24);

  ctx.save();
  ctx.translate(-5.2, -7.9);
  ctx.rotate(-0.08);

  // Body (steady — only a faint motor tremor).
  ctx.save();
  ctx.translate(bx * 0.4, by * 0.4);
  const bodyG = ctx.createLinearGradient(0, -10, 0, 4);
  bodyG.addColorStop(0, "#ffc24a");
  bodyG.addColorStop(0.5, "#e08a18");
  bodyG.addColorStop(1, "#7a4408");
  ctx.fillStyle = bodyG;
  ctx.strokeStyle = "#3a2208";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -8);
  ctx.lineTo(6, -9);
  ctx.bezierCurveTo(12, -9, 12, 2, 6, 3);
  ctx.lineTo(-12, 4);
  ctx.bezierCurveTo(-18, 4, -20, -6, -16, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,245,200,0.4)";
  ctx.beginPath();
  ctx.ellipse(-6, -5, 8, 2, -0.05, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#2a2a30";
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.lineTo(-4, 2);
  ctx.lineTo(-2, 22);
  ctx.lineTo(-12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,120,130,0.5)";
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-11, 8 + i * 3);
    ctx.lineTo(-3, 8 + i * 3);
    ctx.stroke();
  }
  ctx.fillStyle = "#46464e";
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.lineTo(0, 5);
  ctx.lineTo(-1, 9);
  ctx.lineTo(-4, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Chuck — gives a real sense of spin: the highlight band cycles around it.
  const chuckG = ctx.createLinearGradient(0, -6, 0, 2);
  chuckG.addColorStop(0, "#e0e0e8");
  chuckG.addColorStop(0.5, "#9a9aa4");
  chuckG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = chuckG;
  ctx.beginPath();
  ctx.moveTo(8, -7);
  ctx.lineTo(16, -5);
  ctx.lineTo(16, 0);
  ctx.lineTo(8, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Cycling specular flash sweeping the chuck face = rotation read.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(8, -7);
  ctx.lineTo(16, -5);
  ctx.lineTo(16, 0);
  ctx.lineTo(8, 2);
  ctx.closePath();
  ctx.clip();
  const flashX = lerp(8, 16, spin);
  const flashG = ctx.createLinearGradient(flashX - 2, 0, flashX + 2, 0);
  flashG.addColorStop(0, "rgba(255,255,255,0)");
  flashG.addColorStop(0.5, "rgba(255,255,255,0.7)");
  flashG.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = flashG;
  ctx.fillRect(flashX - 2, -8, 4, 12);
  ctx.restore();

  // The bit — translate to the bit base, apply the high-freq jitter HERE only.
  ctx.save();
  ctx.translate(16, -2);
  ctx.translate(bx, by);
  // Steel shaft.
  ctx.strokeStyle = "#8a8a94";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();
  // Rotating motion-blur arcs around the bit axis: two faint elliptical arcs
  // whose vertical squash cycles with `spin`, reading as a turning helix rather
  // than scrolling flutes.
  const sq = 0.4 + 0.6 * Math.abs(Math.sin(spin * Math.PI));
  ctx.strokeStyle = "rgba(210,210,222,0.5)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const cxx = 2 + i * 3;
    ctx.beginPath();
    ctx.ellipse(cxx, 0, 1.5, 2.4 * sq, 0, 0, TAU);
    ctx.stroke();
  }
  // Bright spin-blur streaks (fade with the phase).
  const blur = 0.25 + 0.35 * Math.abs(Math.cos(spin * Math.PI));
  ctx.strokeStyle = `rgba(255,255,255,${blur})`;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(1, -1.2);
  ctx.lineTo(9, -1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, 1.2);
  ctx.lineTo(9, 1.2);
  ctx.stroke();
  // Grinding spark at the biting tip (rides with the bit jitter).
  const tipPulse = 0.5 + 0.5 * Math.sin(t * 30);
  if (tipPulse > 0.25) {
    impactSpark(ctx, 10, 0, 2 + tipPulse * 2.2, tipPulse * 0.8, spin * TAU);
  }
  ctx.restore();

  metalGleam(ctx, 12, -4, 4);
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 4. SCISSORS — widen the spread, then SNAP shut fast with an overshoot recoil,
//    and a glint at the pivot on the cut.
// ----------------------------------------------------------------------------
function animScissors(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 1.1;
  const ph = loopPhase(t, period);
  // open 0 = shut, 1 = wide. Ease wide open, then a fast SNAP closed with a
  // tiny rebound (overshoot back open) — the snip.
  let open: number;
  if (ph < 0.6) {
    open = easeInOutSine(ph / 0.6); // spread wide
  } else {
    // fast close with elastic rebound at the bottom
    open = 1 - easeOutBack((ph - 0.6) / 0.4, 2.4);
  }
  open = clamp01(open);
  const spread = open * 0.42; // wider than the old ±0.16 nudge
  // Snip moment: the instant the blades meet.
  const snip = beat(t, period, 0.1, -0.04);

  groundShadow(ctx, 0, 23, 12, 4, 0, 0.22);

  ctx.save();
  ctx.translate(0.2, -1.4); // off=(-0.2,1.4)
  ctx.rotate(-0.2);

  const bladeG = ctx.createLinearGradient(0, -18, 0, 2);
  bladeG.addColorStop(0, "#f0f0f6");
  bladeG.addColorStop(0.55, "#b0b0ba");
  bladeG.addColorStop(1, "#56565e");

  // --- Left arm rotates about the pivot (0,2).
  ctx.save();
  ctx.translate(0, 2);
  ctx.rotate(-spread);
  ctx.translate(0, -2);
  ctx.fillStyle = bladeG;
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.8;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(1.5, 2);
  ctx.bezierCurveTo(0, -8, -5, -16, -8, -22);
  ctx.bezierCurveTo(-4, -18, -1, -9, 4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-1, -3);
  ctx.bezierCurveTo(-3, -11, -5, -16, -7, -20);
  ctx.stroke();
  ctx.strokeStyle = "#1a4a8a";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(-7, 12, 5, 6, 0.3, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(150,200,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(-7, 12, 4, 5, 0.3, -1, 1.4);
  ctx.stroke();
  ctx.strokeStyle = "#1a4a8a";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.lineTo(-2, 1);
  ctx.stroke();
  ctx.restore();

  // --- Right arm.
  ctx.save();
  ctx.translate(0, 2);
  ctx.rotate(spread);
  ctx.translate(0, -2);
  ctx.fillStyle = bladeG;
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.8;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-1.5, 2);
  ctx.bezierCurveTo(0, -8, 5, -16, 8, -22);
  ctx.bezierCurveTo(4, -18, 1, -9, -4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(1, -3);
  ctx.bezierCurveTo(3, -11, 5, -16, 7, -20);
  ctx.stroke();
  ctx.strokeStyle = "#1a4a8a";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(7, 12, 5, 6, -0.3, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(150,200,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(7, 12, 4, 5, -0.3, 1.7, 4.1);
  ctx.stroke();
  ctx.strokeStyle = "#1a4a8a";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(4, 6);
  ctx.lineTo(2, 1);
  ctx.stroke();
  ctx.restore();

  // Pivot bolt.
  ctx.fillStyle = "#6a6a72";
  ctx.beginPath();
  ctx.arc(0, 2, 2.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(-0.8, 1.2, 1, 0, TAU);
  ctx.fill();

  // Pivot glint on the snap (clean cool sparkle suits the steel + blue loops).
  if (snip > 0) {
    sparkle(ctx, 0, 2, 1.4 + snip * 2.2, snip * 0.9, "230,242,255");
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 5. WRENCH — re-centred; the HEX/bolt stays FIXED on the ground while the
//    handle torques up, hits a hard stop with a recoil kickback, and the open
//    jaw flexes a hair under load.
// ----------------------------------------------------------------------------
function animWrench(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 1.5;
  const ph = loopPhase(t, period);
  // Torque: wind on the load, hit a hard stop, snap back (ratchet reset).
  let turn: number;
  if (ph < 0.62) {
    turn = easeInOutSine(ph / 0.62); // haul on the bolt
  } else {
    // hard stop + recoil kick, then quick reset
    turn = 1 - easeOutBack((ph - 0.62) / 0.38, 3.0);
  }
  turn = clamp01(turn);
  const osc = lerp(-0.06, 0.34, turn); // handle swings UP under load
  // The hard stop pings as the load peaks.
  const stop = beat(t, period, 0.08, 0.55);
  // Jaw flex: the open-end jaw opens a hair under torque.
  const flex = turn * 0.6;

  // The hex bolt is the fixed pivot. In the rotated frame it sits at (0,21).
  // Re-frame: off ≈ (2.0,8.9) — lift the whole thing up so the bolt is grounded.
  groundShadow(ctx, 0, 22, 9, 3.5, 0, 0.24);

  ctx.save();
  ctx.translate(-2, -2.9); // partial re-centre; the bolt-pivot translate adds the rest
  ctx.rotate(-0.62);
  ctx.save(); // capture the rotated-but-unturned frame; the fixed hex socket draws here
  // Everything but the hex turns about the bolt at (0,21).
  ctx.translate(0, 21);
  ctx.rotate(osc);
  ctx.translate(0, -21);

  const g = ctx.createLinearGradient(-7, 0, 7, 0);
  g.addColorStop(0, "#e8e8f0");
  g.addColorStop(0.5, "#9a9aa4");
  g.addColorStop(1, "#3a3a42");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 2;
  // Shaft.
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.lineTo(3, 20);
  ctx.lineTo(-3, 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Open-end jaw (C-shape) — the upper lip flexes open by `flex`.
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.lineTo(-9 - flex, -6);
  ctx.lineTo(-5 - flex, -10);
  ctx.lineTo(-2, -6);
  ctx.lineTo(2, -6);
  ctx.lineTo(5 + flex, -10);
  ctx.lineTo(9 + flex, -6);
  ctx.lineTo(4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Box jaw ring (turns with the handle).
  ctx.beginPath();
  ctx.ellipse(0, 21, 7, 6, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(-2.5, 4, 1.6, 14);
  metalGleam(ctx, -4, -4, 4);

  // Demoted feathered sheen on the shaft (secondary accent), clipped tight.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.lineTo(3, 20);
  ctx.lineTo(-3, 20);
  ctx.closePath();
  ctx.clip();
  glint(ctx, loopPhase(t, 3.2), { span: 9, width: 5, angle: Math.PI / 2, intensity: 0.28, length: 24 });
  ctx.restore();
  ctx.restore(); // end handle rotation — back to the rotated-but-unturned frame

  // The HEX socket stays FIXED (does not turn with the handle): drawn after,
  // in the rotated frame, at the bolt centre.
  ctx.translate(0, 21);
  ctx.fillStyle = "#26262c";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - Math.PI / 2;
    const px = Math.cos(a) * 3.4;
    const py = Math.sin(a) * 3.4;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Hard-stop spark at the hex on the bite.
  if (stop > 0) {
    impactSpark(ctx, 0, 0, 2 + stop * 2.5, stop * 0.7, ph * 5);
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 6. SCREWDRIVER — sells AXIAL rotation (handle ribs cycle across the barrel,
//    not a whole-tool tilt) with a press-down anticipation and a thick
//    tip-tick ring at the bit.
// ----------------------------------------------------------------------------
function animScrewdriver(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 1.0;
  const ph = loopPhase(t, period);
  const spin = loopPhase(t, 0.34); // axial rotation phase (ribs cycle on this)
  // Press anticipation: a small wind-back then a push DOWN along the shaft.
  const press = windupOvershoot(ph < 0.6 ? ph / 0.6 : 1, 0.2, 1.8);
  const drop = press * 1.6; // axial press depth
  // Each engaged turn ticks the screw.
  const tick = beat(t, period, 0.12, 0.0);

  groundShadow(ctx, 0, 23, 9, 3.5, -drop * 0.3, 0.22);

  ctx.save();
  ctx.translate(-1.2, -2.2); // off=(1.2,2.2)
  ctx.rotate(0.5);
  ctx.translate(0, drop); // axial press

  // Handle (bulbous, ribbed). The ribs scroll around the barrel = axial spin.
  const hG = ctx.createLinearGradient(-6, 0, 6, 0);
  hG.addColorStop(0, "#ff8a5a");
  hG.addColorStop(0.5, "#d8401c");
  hG.addColorStop(1, "#7a1408");
  ctx.fillStyle = hG;
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.bezierCurveTo(-8, -22, 8, -22, 6, -18);
  ctx.lineTo(5, -2);
  ctx.bezierCurveTo(5, 2, -5, 2, -5, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0808";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Ribs cycle horizontally across the (clipped) barrel: as a rib runs off one
  // edge another enters — reads as the handle turning on its long axis.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.bezierCurveTo(-8, -22, 8, -22, 6, -18);
  ctx.lineTo(5, -2);
  ctx.bezierCurveTo(5, 2, -5, 2, -5, -2);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 5; i++) {
    // Position wraps across the barrel width [-5.5, 5.5].
    const u = (spin + i / 5) % 1;
    const x = lerp(-5.5, 5.5, u);
    // A rib near the silhouette edge is dim (foreshortened); brightest centre.
    const edge = 1 - Math.abs(x) / 5.5;
    ctx.strokeStyle = `rgba(58,8,8,${0.25 + 0.4 * edge})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, -19);
    ctx.lineTo(x * 0.85, -1);
    ctx.stroke();
    // A thin highlight rib trailing the dark one — the lit side of the barrel.
    ctx.strokeStyle = `rgba(255,200,170,${0.35 * edge})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 0.9, -19);
    ctx.lineTo(x * 0.85 + 0.8, -1);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-3, -12, 1.6, 6, 0, 0, TAU);
  ctx.fill();

  // Steel shaft.
  const sG = ctx.createLinearGradient(-3, 0, 3, 0);
  sG.addColorStop(0, "#e8e8f0");
  sG.addColorStop(0.5, "#a0a0aa");
  sG.addColorStop(1, "#46464e");
  ctx.fillStyle = sG;
  ctx.fillRect(-2.4, -2, 4.8, 18);
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-2.4, -2, 4.8, 18);
  // Flat-head tip.
  ctx.fillStyle = "#c8c8d0";
  ctx.beginPath();
  ctx.moveTo(-2.4, 16);
  ctx.lineTo(2.4, 16);
  ctx.lineTo(3, 21);
  ctx.lineTo(-3, 21);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(-1.4, -1, 1.2, 15);

  // Thick tip-tick ring — a bold arc that rotates with the spin and flares on
  // each engaged tick (was an invisible thin tick).
  const ringA = 0.3 + tick * 0.6;
  ctx.strokeStyle = `rgba(255,255,255,${ringA})`;
  ctx.lineWidth = 1.6 + tick * 1.4;
  const base = spin * TAU;
  for (let i = 0; i < 3; i++) {
    const a = base + (i / 3) * TAU;
    ctx.beginPath();
    ctx.arc(0, 21, 4.4, a, a + 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 7. PAINTBRUSH — commits a DIRECTIONAL stroke (fast load-up one way, slow lift
//    the other) with the wet smear anchored UNDER the bristle tip and the
//    bristles dragging/splaying against the travel.
// ----------------------------------------------------------------------------
function animPaintbrush(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 1.6;
  const ph = loopPhase(t, period);
  // Directional stroke: a committed fast drag right, then a slower lift back
  // left (asymmetric speed). pos −1..1 along the painted surface.
  let pos: number;
  let speed: number; // 0..1 instantaneous stroke speed (drives smear/splay)
  if (ph < 0.42) {
    const u = ph / 0.42;
    pos = lerp(-1, 1, easeOutCubic(u)); // fast committed drag
    speed = 1 - u * 0.4;
  } else {
    const u = (ph - 0.42) / 0.58;
    pos = lerp(1, -1, easeInOutSine(u)); // slow lift/reset
    speed = 0.35 * Math.sin(u * Math.PI);
  }
  const lift = ph < 0.42 ? 0 : Math.sin(((ph - 0.42) / 0.58) * Math.PI) * 1.4; // lifts off on the return

  ctx.save();
  ctx.translate(1.1, -2.1); // off=(-1.1,2.1)
  ctx.rotate(0.42);

  // Wet smear ANCHORED under the bristle tip (≈ y 24 local), trailing the
  // stroke direction. Persistent paint band that the tip travels along.
  const tipX = pos * 6;
  const dir = ph < 0.42 ? 1 : -1;
  const smearA = 0.3 * clamp01(speed);
  if (smearA > 0.02) {
    const band = ctx.createLinearGradient(tipX - dir * 12, 0, tipX, 0);
    band.addColorStop(0, "rgba(58,130,216,0)");
    band.addColorStop(1, `rgba(58,130,216,${smearA})`);
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.ellipse(tipX - dir * 5, 24, 9, 2.4, 0, 0, TAU);
    ctx.fill();
  }
  // A small persistent wet patch directly under the tip.
  ctx.fillStyle = "rgba(42,106,200,0.28)";
  ctx.beginPath();
  ctx.ellipse(tipX, 24, 4, 1.8, 0, 0, TAU);
  ctx.fill();

  // The brush travels with the stroke and lifts slightly on the return.
  ctx.save();
  ctx.translate(pos * 4.2, -lift);
  // Lean INTO the drag (leads), then the bristles drag behind (follow-through).
  ctx.rotate(dir * 0.1 * clamp01(speed));

  woodHandle(ctx, 0, -22, 0, -2, 5);

  // Ferrule.
  const fG = ctx.createLinearGradient(-5, 0, 5, 0);
  fG.addColorStop(0, "#d8d8e0");
  fG.addColorStop(0.5, "#9a9aa4");
  fG.addColorStop(1, "#46464e");
  ctx.fillStyle = fG;
  ctx.fillRect(-5, -4, 10, 9);
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-5, -4, 10, 9);
  ctx.strokeStyle = "rgba(26,26,30,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(5, 0);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(-4, -3, 1.6, 7);

  // Bristles — splay AGAINST the travel direction (drag), more at speed.
  const splay = -dir * (1.6 + clamp01(speed) * 2.4);
  const brG = ctx.createLinearGradient(0, 5, 0, 22);
  brG.addColorStop(0, "#6a4a20");
  brG.addColorStop(0.4, "#3a82d8");
  brG.addColorStop(1, "#1a4a9a");
  ctx.fillStyle = brG;
  ctx.beginPath();
  ctx.moveTo(-5, 5);
  ctx.lineTo(5, 5);
  ctx.lineTo(4 + splay, 16);
  ctx.bezierCurveTo(3 + splay, 22, -3 + splay, 22, -4 + splay, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#102a5a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,40,80,0.5)";
  ctx.lineWidth = 0.7;
  for (let i = -3; i <= 3; i += 1.5) {
    ctx.beginPath();
    ctx.moveTo(i, 6);
    ctx.lineTo(i * 0.7 + splay, 20);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(180,215,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-1.5 + splay * 0.3, 12, 1.4, 5, 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 8. NAIL — was near-dead. Now a periodic drive-down TAP: anticipation lift →
//    fast dip → recoil settle, with a spark on the head on the blow and a
//    shadow that squashes under the hit.
// ----------------------------------------------------------------------------
function animNail(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 1.3;
  const ph = loopPhase(t, period);
  // Drive cycle: rest, a small lift (anticipation), a sharp dip as it's struck,
  // then a damped recoil back to rest. `dip` in design units along the nail.
  let dip: number;
  if (ph < 0.5) {
    dip = -1.4 * Math.sin((ph / 0.5) * Math.PI * 0.5); // ease up (anticipation)
  } else if (ph < 0.62) {
    dip = lerp(-1.4, 3.2, easeOutCubic((ph - 0.5) / 0.12)); // snap DOWN (struck)
  } else {
    dip = 3.2 * easeOutElastic(1 - (ph - 0.62) / 0.38); // recoil settle
  }
  // Strike spark fires as the head is hit.
  const hit = beat(t, period, 0.1, 0.5);

  // Shadow squashes wider/darker under the blow.
  groundShadow(ctx, 0, 24, 7 + hit * 4, 3, -dip * 0.2, 0.24);

  ctx.save();
  ctx.translate(-2.6, -2.2); // off=(2.6,2.2)
  ctx.rotate(0.32);
  ctx.translate(0, dip); // the whole nail drives down along its axis

  // Flat head.
  const headG = ctx.createLinearGradient(-7, 0, 7, 0);
  headG.addColorStop(0, "#e8e8f0");
  headG.addColorStop(0.5, "#a0a0aa");
  headG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.ellipse(0, -18, 7, 3, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-2, -18.5, 3, 1.2, 0, 0, TAU);
  ctx.fill();

  // Shaft tapering to a point.
  const shaftG = ctx.createLinearGradient(-3, 0, 3, 0);
  shaftG.addColorStop(0, "#e0e0e8");
  shaftG.addColorStop(0.5, "#9a9aa4");
  shaftG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = shaftG;
  ctx.beginPath();
  ctx.moveTo(-3, -16);
  ctx.lineTo(3, -16);
  ctx.lineTo(1, 18);
  ctx.lineTo(0, 23);
  ctx.lineTo(-1, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(-1.4, -15);
  ctx.lineTo(-0.4, -15);
  ctx.lineTo(-0.4, 16);
  ctx.lineTo(-1, 16);
  ctx.closePath();
  ctx.fill();

  // Spark on the struck head (local, so it rides the dip).
  if (hit > 0) {
    impactSpark(ctx, 0, -19, 2.5 + hit * 3, hit * 0.9, ph * 6);
  }
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  wtool_hammer: animHammer,
  wtool_saw: animSaw,
  wtool_drill: animDrill,
  wtool_scissors: animScissors,
  wtool_wrench: animWrench,
  wtool_screwdriver: animScrewdriver,
  wtool_paintbrush: animPaintbrush,
  wtool_nail: animNail,
};
