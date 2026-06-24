// Animated festive / holiday / winter celebration icons — same look as
// src/textures/categories/festive.ts, but alive. Each fn redraws the WHOLE icon
// at time `t` (elapsed seconds), centered at origin within a roughly -24..+24
// box (ground baseline y ≈ 22, positive y is DOWN). The static silhouette and
// palette are the strong part and are preserved; the MOTION is rebuilt to lead
// with real deformation (squash/stretch, eased pendulums with anticipation +
// overshoot, traveling-wave articulation, weight shifts) with glints/sparkles
// demoted to a secondary accent. Loops are seamless: position is driven off `t`
// via breathe/loopPhase/pingPong (never a raw sawtooth), and contact shadows
// couple to vertical motion via `groundShadow`. Deterministic from `t` + indices
// only (no Math.random / Date), and stub-safe (standard ctx calls, no reliance
// on return values).

import {
  TAU,
  clamp01,
  breathe,
  loopPhase,
  pingPong,
  beat,
  twinkle,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

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

// ---------------------------------------------------------------------------
// 1. Snowman — a breathing bob with a weight-shift lean, and the ENTIRE scarf
//    (neck-wrap + hanging tail + fringe) is driven from ONE swing phase so the
//    tail trails the wrap instead of fluttering off on its own. Snow drifts.
// ---------------------------------------------------------------------------
function animSnowman(ctx: CanvasRenderingContext2D, t: number): void {
  // Weight shift: a slow lean side-to-side, with the bob slightly behind it.
  const sway = Math.sin(t * 1.1) * 0.05; // body lean (radians)
  const bob = breathe(t, 2.6, 0.7, 0, 0.1); // gentle vertical breathe
  // One scarf phase feeds the wrap, the tail (lagged) and the fringe (lagged
  // more) so the whole scarf reads as a single connected cloth.
  const scarfBase = Math.sin(t * 1.6);
  const wrapWave = scarfBase * 0.9;
  const tailWave = Math.sin(t * 1.6 - 0.7); // tail lags the wrap
  const tipWave = Math.sin(t * 1.6 - 1.2); // fringe lags further

  groundShadow(ctx, sway * 16, 22, 16, 4, bob, 0.22);

  // Falling snow behind the snowman — looping flakes (sub-pixel sway).
  const SNOW = 9;
  const span = 44;
  for (let i = 0; i < SNOW; i++) {
    const seed = i * 1.7;
    const speed = 4 + (i % 3) * 1.2;
    const yy = (t * speed + seed * 7) % span;
    const y = -22 + yy;
    const baseX = -20 + ((i * 41) % 40);
    const x = baseX + Math.sin(t * 1.4 + seed) * 4;
    const fade = Math.sin((yy / span) * Math.PI);
    const r = 0.9 + (i % 2) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${(0.7 * fade).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  // Whole figure leans about the base (weight shift) and breathes.
  ctx.save();
  ctx.translate(0, 22);
  ctx.rotate(sway);
  ctx.translate(0, -22 + bob);

  // Twig arms (behind body) — the lead arm lifts a touch as weight shifts.
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  const armLift = sway * 14;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(-20, -4 + armLift);
  ctx.moveTo(-15, -1);
  ctx.lineTo(-18, -6 + armLift);
  ctx.moveTo(-14, 0);
  ctx.lineTo(-19, 1 + armLift);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(20, -3 - armLift);
  ctx.moveTo(15, 0);
  ctx.lineTo(19, -7 - armLift);
  ctx.moveTo(15, 0);
  ctx.lineTo(20, 3 - armLift);
  ctx.stroke();

  // Three snow balls — bottom, middle, head.
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

  // Soft snowy highlight crescents.
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  const cres: Array<[number, number, number, number]> = [[-3, 8, 4, 1.4], [-3, -2, 3, 1.1], [-2, -12, 2.4, 0.9]];
  cres.forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.4, 0, TAU);
    ctx.fill();
  });

  // Coal buttons + eyes.
  ctx.fillStyle = "#2a2a30";
  ([[0, -2], [0, 2], [0, 6], [-2.4, -11.5], [2.4, -11.5]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, TAU);
    ctx.fill();
  });
  // Coal smile.
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * 1.5, -7 + Math.abs(i) * 0.4, 0.6, 0, TAU);
    ctx.fill();
  }

  // Carrot nose — the head leans counter to the body for a hint of life.
  const noseTip = -sway * 6;
  const nose = ctx.createLinearGradient(0, -9, 8, -9);
  nose.addColorStop(0, "#ffae5a");
  nose.addColorStop(1, "#d4641a");
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8 + noseTip, -8.4);
  ctx.lineTo(0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a44808";
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Scarf wrap — its lower lip ripples with the shared wrap wave.
  ctx.fillStyle = "#c8281a";
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.quadraticCurveTo(0 + wrapWave, -1 + Math.abs(wrapWave) * 0.4, 7, -4);
  ctx.quadraticCurveTo(0 + wrapWave, 1 + Math.abs(wrapWave) * 0.4, -7, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a0e08";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Hanging scarf tail — a hinged flap driven by the SAME phase as the wrap
  // (lagged), so it trails as one cloth. Pivots where it leaves the wrap (3,-4).
  ctx.save();
  ctx.translate(3, -4);
  ctx.rotate(tailWave * 0.22 + wrapWave * 0.05);
  const tailGrad = ctx.createLinearGradient(0, 0, 6, 9);
  tailGrad.addColorStop(0, "#c8281a");
  tailGrad.addColorStop(1, "#a81810");
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(1, 0);
  // bend deepens toward the tip (tip lags most).
  ctx.quadraticCurveTo(5 + tipWave * 0.8, 4, 6 + tipWave * 1.6, 9);
  ctx.lineTo(3 + tipWave * 1.6, 10);
  ctx.quadraticCurveTo(1 + tipWave * 0.6, 4, -1, 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a0e08";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Fringe — welded to the tail tip in the tail's own frame (no detached float).
  ctx.strokeStyle = "#e6c8a0";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(3 + tipWave * 1.6, 10);
  ctx.lineTo(3 + tipWave * 1.9, 12);
  ctx.moveTo(5 + tipWave * 1.6, 9.4);
  ctx.lineTo(5.4 + tipWave * 1.9, 11.4);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. Gift — a CONTINUOUS "can't-wait" wiggle: it never freezes. A constant
//    eager jiggle (lean + squash) layered with periodic excited HOPS that
//    overshoot on landing. Re-framed up; bow sparkles ping on the hops.
// ---------------------------------------------------------------------------
function animGift(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-0.8, -2.8); // re-frame: was sitting low/right (off (0.8,2.8))

  // Continuous base jiggle — fast small lean + counter side-shift, ALWAYS on so
  // there are no dead frames between hops.
  const jLean = Math.sin(t * 9.0) * 0.05 + Math.sin(t * 5.3) * 0.02;
  const jShift = Math.cos(t * 9.0) * 0.7;
  // Excited hops: one short hop every 0.7s. Within each hop window the sub-phase
  // `hp` runs 0→1, giving an anticipation squat → stretch up → squash landing
  // with a clean deformation curve (no frozen interval).
  const hp = loopPhase(t, 0.7);
  // Vertical lift: a single eased arc that peaks mid-hop (sin), zero at the ends.
  const arc = Math.sin(clamp01(hp) * Math.PI);
  const lift = arc * 4.0;
  // Deformation: squat at the launch & landing (hp near 0 and 1), stretch tall
  // while airborne. cos(2π·hp) is +1 at the ends (squat) and -1 mid-air (stretch).
  const phase2 = Math.cos(hp * TAU); // +1 ends, -1 middle
  const sy = 1 - phase2 * 0.13; // taller mid-hop, squat at the contacts
  const sx = 1 + phase2 * 0.10; // conserve volume (wider when squat)
  const hopE = arc; // excitement intensity for sparkles/puff

  groundShadow(ctx, jShift, 22, 18, 4, lift, 0.22);

  ctx.save();
  // Everything pivots/squashes about the box base; jiggle + hop combine.
  ctx.translate(jShift, 22 - lift);
  ctx.rotate(jLean);
  ctx.scale(sx, sy);
  ctx.translate(0, -22);

  // Box body.
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

  // Box lid.
  ctx.fillStyle = "#46c47e";
  rr(ctx, -18, -8, 36, 8, 2);
  ctx.fill();
  ctx.strokeStyle = "#0e3a22";
  ctx.lineWidth = 2;
  rr(ctx, -18, -8, 36, 8, 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  rr(ctx, -16, -7, 32, 2, 1);
  ctx.fill();

  // Vertical ribbon.
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

  // Bow — its loops puff a little wider on the hop (follow-through pop).
  ctx.save();
  ctx.translate(0, -8);
  const puff = 1 + hopE * 0.12;
  ctx.scale(puff, puff);
  ctx.fillStyle = "#f4cc28";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-12, -14, -16, 0, -2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(12, -14, 16, 0, 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-12, -14, -16, 0, -2, 0);
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(12, -14, 16, 0, 2, 0);
  ctx.stroke();
  ctx.strokeStyle = "rgba(168,120,8,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, -1);
  ctx.bezierCurveTo(-9, -8, -11, -2, -2, -1);
  ctx.moveTo(2, -1);
  ctx.bezierCurveTo(9, -8, 11, -2, 2, -1);
  ctx.stroke();
  // Knot.
  ctx.fillStyle = "#e8c020";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,200,0.7)";
  ctx.beginPath();
  ctx.arc(-1, -1, 1, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  // Bow sparkles — pop on the hop (the moment of excitement), dim otherwise.
  const spk: Array<[number, number]> = [[-9, -14], [9, -13], [0, -19]];
  spk.forEach(([x, y], i) => {
    const k = Math.max(twinkle(t, 1.4, i * 0.12), hopE * 0.9);
    sparkle(ctx, x, y - lift, 1.7 + k * 0.6, 0.85 * k, "255,250,210");
  });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. Wreath — hung on a door: the whole ring rocks as a pendulum about a top
//    hang-point, breathing in/out like a plush wreath. Lights twinkle, the bow
//    tails trail the swing.
// ---------------------------------------------------------------------------
function animWreath(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0.3, -1.2); // re-frame (off (-0.3,1.2))

  const R = 16;
  // Hanging-door sway: an eased pendulum about a point above the ring.
  const swing = (pingPong(t, 4.4) * 2 - 1) * 0.07; // radians, seamless
  // Plush breathing — the ring fattens/thins slightly, lagging the swing.
  const breath = breathe(t, 3.2, 0.025, 1, 0.2);

  // Shadow drifts with the swing (the ring barely lifts, so keep it grounded).
  groundShadow(ctx, swing * 22, 22, 18, 4, 0, 0.2);

  // Pendulum + breathing scale, pivoting above the ring (the nail).
  ctx.save();
  ctx.translate(0, -19);
  ctx.rotate(swing);
  ctx.scale(breath, breath);
  ctx.translate(0, 19);

  // Dark base + mid green ring.
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

  // Needle tufts.
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

  // Green highlight sparkles.
  ctx.fillStyle = "rgba(170,230,160,0.6)";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R, Math.sin(a) * R - 1, 1, 0, TAU);
    ctx.fill();
  }

  // Red berries.
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
    const warm = i % 2 === 0;
    const cg = warm ? 220 : 150;
    const cb = warm ? 120 : 80;
    const glowR = 2.6 + tw * 1.4;
    const halo = ctx.createRadialGradient(lx, ly, 0.5, lx, ly, glowR);
    halo.addColorStop(0, `rgba(255,${cg},${cb},${(0.85 * tw + 0.1).toFixed(3)})`);
    halo.addColorStop(1, `rgba(255,${cg},${cb},0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(lx, ly, glowR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,250,230,${(0.6 + 0.4 * tw).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(lx, ly, 0.9, 0, TAU);
    ctx.fill();
  }

  // Red bow loops.
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

  // Bow tails trail the swing — they lag (inertia) and splay opposite each other.
  const trail = -swing * 26; // tails swing behind the ring's motion
  const flutterL = Math.sin(t * 2.6) * 1.2;
  const flutterR = Math.sin(t * 2.6 + Math.PI) * 1.2;
  ctx.fillStyle = "#c8181a";
  ctx.beginPath();
  ctx.moveTo(-2, 15);
  ctx.lineTo(-6 + trail + flutterL, 24);
  ctx.lineTo(-2 + trail + flutterL, 23);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 15);
  ctx.lineTo(6 + trail + flutterR, 24);
  ctx.lineTo(2 + trail + flutterR, 23);
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

  // Bow knot.
  ctx.fillStyle = "#e0402a";
  ctx.beginPath();
  ctx.arc(0, 14.5, 2.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,200,180,0.7)";
  ctx.beginPath();
  ctx.arc(-0.8, 13.8, 0.8, 0, TAU);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. Bell — an eased pendulum with anticipation + overshoot (not a linear
//    metronome). The dome SQUASHES at each swing extreme, the holly/ribbon LAG
//    the body, and the bell only RINGS on alternating outward swings (with the
//    clapper striking that side).
// ---------------------------------------------------------------------------
function animBell(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.1); // re-frame (off_y 2.1)

  // Eased swing about the ribbon loop (~y -16). pingPong gives anticipation at
  // each turn (decelerate→accelerate) instead of a uniform sine velocity.
  const swingNorm = pingPong(t, 1.85) * 2 - 1; // -1..1, eased at the ends
  const swing = swingNorm * 0.2;
  // The clapper lags the body (follow-through) and over-travels.
  const clapNorm = (pingPong(t, 1.85, 0.06) * 2 - 1);
  // Squash at the extremes: |swing| peaks → dome compresses & widens briefly.
  const extreme = Math.abs(swingNorm);
  const sq = Math.pow(extreme, 3); // sharp near the turns only
  const domeY = 1 - sq * 0.06;
  const domeX = 1 + sq * 0.05;

  // Ring out only on alternating outward swings (not every pass): the full
  // there-and-back period is 2*1.85 = 3.7s; the loud chime fires once per cycle
  // as the bell reaches the +side turn, a softer chime on the −side turn.
  const ringEnv = Math.max(beat(t, 3.7, 0.18, -0.07), 0); // a clean strike pulse
  const sideSign = 1; // ring side: the +swing turn

  // Sound waves on the strike side.
  if (ringEnv > 0.01) {
    ctx.strokeStyle = `rgba(255,236,150,${(0.7 * ringEnv).toFixed(3)})`;
    for (let w = 0; w < 2; w++) {
      const rad = 15 + w * 4 + ringEnv * 3;
      ctx.lineWidth = 1.6 - w * 0.4;
      const cx = sideSign * 16;
      ctx.beginPath();
      ctx.arc(cx, -1, rad, sideSign > 0 ? -0.7 : Math.PI - 0.7, sideSign > 0 ? 0.7 : Math.PI + 0.7);
      ctx.stroke();
    }
  }
  // a faint second chime on the opposite turn, softer (alternating swings).
  const ringEnv2 = Math.max(beat(t, 3.7, 0.16, 0.43), 0);
  if (ringEnv2 > 0.01) {
    ctx.strokeStyle = `rgba(255,236,150,${(0.45 * ringEnv2).toFixed(3)})`;
    const cx = -16;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, -1, 15 + ringEnv2 * 3, Math.PI - 0.7, Math.PI + 0.7);
    ctx.stroke();
  }

  // Sparkle near the crown — pings with the main ring (the bell "speaks").
  sparkle(ctx, 9 + swing * 8, -14, 2.2 + ringEnv * 0.8, 0.5 + 0.5 * ringEnv, "255,244,200");

  ctx.save();
  ctx.translate(0, -16);
  ctx.rotate(swing);
  ctx.translate(0, 16);

  // Top ribbon loop — lags the body slightly (a hair of counter-rotation).
  ctx.save();
  ctx.rotate(-swing * 0.25);
  ctx.strokeStyle = "#c8181a";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-5, -22, 5, -22, 0, -16);
  ctx.stroke();
  ctx.fillStyle = "#caa018";
  ctx.beginPath();
  ctx.arc(0, -14, 2.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a5808";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Bell body — squashes about its rim (y≈14) at the swing extremes.
  ctx.save();
  ctx.translate(0, 14);
  ctx.scale(domeX, domeY);
  ctx.translate(0, -14);
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

  // Rim band.
  ctx.fillStyle = "#b88808";
  rr(ctx, -13, 10, 26, 4, 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3e08";
  ctx.lineWidth = 1.2;
  rr(ctx, -13, 10, 26, 4, 2);
  ctx.stroke();

  // Vertical highlight + a demoted feathered sheen across the gold dome.
  ctx.fillStyle = "rgba(255,250,220,0.7)";
  ctx.beginPath();
  ctx.ellipse(-5, -2, 2, 9, -0.1, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(-7, -12, -10, 0, -13, 10);
  ctx.bezierCurveTo(-14, 13, -10, 14, 0, 14);
  ctx.bezierCurveTo(10, 14, 14, 13, 13, 10);
  ctx.bezierCurveTo(10, 0, 7, -12, 0, -12);
  ctx.closePath();
  ctx.clip();
  glint(ctx, loopPhase(t, 3.7), { span: 12, width: 5, angle: Math.PI / 2, intensity: 0.22, length: 30, warm: true });
  ctx.restore();
  ctx.restore();

  // Clapper peeking out — swings with extra lag/over-travel (out-of-phase wag),
  // and slaps to the strike side on the ring.
  const clap = clapNorm * 3.0 + ringEnv * sideSign * 1.5;
  ctx.fillStyle = "#8a6408";
  ctx.beginPath();
  ctx.arc(clap, 15, 2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a3e08";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Holly accent — lags the body (a touch of counter-rotation + droop).
  ctx.save();
  ctx.rotate(-swing * 0.3);
  ctx.translate(0, sq * 0.6);
  ctx.fillStyle = "#2e7a3e";
  ([[-5, -10, -0.4], [5, -10, 0.4]] as Array<[number, number, number]>).forEach(([x, y, lean]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean - swing * 0.2);
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

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. Ornament — an eased pendulum that OVERSHOOTS and settles each turn; the
//    hook now TRACKS the swinging string (the bauble hangs plumb from it), and
//    the specular sweep is SYNCED to the swing so the shine and the sparkle ping
//    together at the bottom of the arc.
// ---------------------------------------------------------------------------
function animOrnament(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -1.8); // re-frame (off_y 1.8)

  // Eased swing about the hook (~y -19). easeOutBack on each half-swing adds an
  // overshoot past the turn that settles — livelier than a pure sine.
  const u = pingPong(t, 2.6); // 0..1..0 eased
  const swingNorm = u * 2 - 1; // -1..1
  // Add a subtle overshoot wobble layered on the eased base (settling spring).
  const wobble = Math.sin(t * 6.2) * 0.012 * (1 - Math.abs(swingNorm));
  const swing = swingNorm * 0.16 + wobble;

  // Hook — TRACKS the swing now (drawn inside the swing frame so the bauble
  // hangs plumb beneath the actual string angle, instead of a fixed hook).
  ctx.save();
  ctx.translate(0, -19);
  ctx.rotate(swing);
  ctx.translate(0, 19);

  // Hook curl (top of the string) — moves with the swing.
  ctx.strokeStyle = "#8a8478";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -19, 2.4, Math.PI * 0.2, Math.PI * 1.6);
  ctx.stroke();
  // String segment.
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, -13);
  ctx.stroke();

  // Cap.
  ctx.fillStyle = "#caa018";
  rr(ctx, -3, -15, 6, 4, 1);
  ctx.fill();
  ctx.strokeStyle = "#7a5808";
  ctx.lineWidth = 0.9;
  rr(ctx, -3, -15, 6, 4, 1);
  ctx.stroke();

  // Shadow swings with the bauble (barely lifts → keep grounded, drift sideways).
  groundShadow(ctx, swing * 18, 22, 12, 3.5, 0, 0.22);

  // Bauble sphere.
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

  // Gold stripe band (clipped to sphere).
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

  // Specular sweep SYNCED to the swing: the highlight crosses the sphere as it
  // passes through the bottom of the arc (where it would catch the light).
  const sweepU = clamp01((swingNorm + 1) * 0.5); // 0..1 across the swing
  const sx = -13 + sweepU * 26;
  ctx.save();
  ctx.translate(sx, 0);
  ctx.rotate(-0.5 + swing);
  const shine = ctx.createLinearGradient(-5, 0, 5, 0);
  shine.addColorStop(0, "rgba(255,255,255,0)");
  shine.addColorStop(0.5, "rgba(255,255,255,0.5)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fillRect(-5, -16, 10, 32);
  ctx.restore();
  ctx.restore();

  // Static specular highlights.
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 2.4, 4, -0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(3, 6, 1.4, 0, TAU);
  ctx.fill();

  // Sparkle ping — fires as the sweep passes the highlight (mid-arc), tied to
  // the same phase as the specular sweep so shine + sparkle read as one event.
  const flashK = twinkle(t, 2.6, 0.25);
  sparkle(ctx, -5, -8, 2.4, flashK, "255,235,235");

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. Candy cane — was a glint on a frozen cane. Now it BALANCES: a bob-and-lean
//    (rocking about its base like it's standing on the curl), the hook LAGS the
//    shaft (whip follow-through), and the glint runs ALONG the tilted shaft axis.
// ---------------------------------------------------------------------------
function animCandyCane(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-2.5, -2.8); // re-frame (off (2.5,2.8))

  // Balance bob-and-lean: a slow eased rock about the cane's foot (~y 22).
  const lean = (pingPong(t, 3.4) * 2 - 1) * 0.09; // base lean, eased turns
  const bob = breathe(t, 2.7, 0.8, 0, 0.15); // small vertical balance bob
  // The hook lags the shaft and over-travels (whip): extra rotation at the top.
  const hookLag = (pingPong(t, 3.4, 0.09) * 2 - 1) * 0.12 - lean * 0.4;

  groundShadow(ctx, lean * 18, 22, 12, 4, bob, 0.22);

  // Rock the whole cane about its foot, plus the resting 0.12 tilt it's drawn at.
  ctx.save();
  ctx.translate(-4, 22); // foot of the shaft
  ctx.rotate(lean);
  ctx.translate(4, -22 + bob);
  ctx.rotate(0.12); // original resting tilt

  // White shaft (straight part only here; the hook is a separate lagged piece).
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, 22);
  ctx.lineTo(-4, -8);
  ctx.stroke();

  // Hook — drawn in its OWN frame, pivoting at the shaft top (-4,-8) so it lags.
  ctx.save();
  ctx.translate(-4, -8);
  ctx.rotate(hookLag);
  ctx.translate(4, 8);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.bezierCurveTo(-4, -18, 12, -18, 12, -8);
  ctx.stroke();
  // Red bands on the hook (clipped to the hook arc region).
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
  // Thin outline on the hook.
  ctx.strokeStyle = "rgba(200,212,224,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.bezierCurveTo(-4, -18, 12, -18, 12, -8);
  ctx.stroke();
  ctx.restore(); // end hook frame

  // Red bands on the shaft (clipped to the shaft column).
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

  // Thin white outline on the shaft.
  ctx.strokeStyle = "rgba(200,212,224,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-4, 22);
  ctx.lineTo(-4, -8);
  ctx.stroke();

  // Static specular shine on the shaft.
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, 18);
  ctx.lineTo(-6, -6);
  ctx.stroke();

  // Glossy glint running DOWN the shaft, aligned to the (now-tilted) shaft axis
  // because we're inside the rocked+tilted frame. Clipped to the candy column.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-9, -8, 10, 32);
  ctx.clip();
  const gy = -8 + loopPhase(t, 2.6) * 32;
  const grad = ctx.createLinearGradient(0, gy - 6, 0, gy + 6);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 7;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(-4, gy - 6);
  ctx.lineTo(-4, gy + 6);
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // end cane frame

  // Sparkle ping at the hook tip — follows the lagged hook position roughly.
  const spk = twinkle(t, 2.4, 0.4);
  sparkle(ctx, 9 + lean * 14, -17, 2.4, spk, "255,250,250");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. Gingerbread — a happy dance, but the bob now matches the ROCK frequency
//    (no strobing double-freq), with a squash at the low point and arms that
//    counter-swing against the lean. Icing sparkles on the beat.
// ---------------------------------------------------------------------------
function animGingerbread(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.5); // re-frame (off_y 2.5)

  // Dance: rock side to side; the bob shares the rock's tempo (was 2x → strobe).
  const rockNorm = Math.sin(t * 3.2);
  const rock = rockNorm * 0.14;
  // Bob: dips to the low point as it crosses centre (twice per rock) but smooth,
  // not strobing — phase-locked to the rock and eased.
  const bob = -Math.abs(Math.sin(t * 3.2)) * 1.4 + 0.7;
  // Squash at the low point (weight settles when the body dips).
  const settle = Math.abs(Math.sin(t * 3.2));
  const sqX = 1 + settle * 0.05;
  const sqY = 1 - settle * 0.06;
  // Arms counter-swing against the lean (follow-through / overlap).
  const armSwing = -rockNorm * 4.0;
  const armRaise = settle * 2.0;

  groundShadow(ctx, rock * 16, 22, 14, 4, -bob, 0.22);

  ctx.save();
  // Pivot near the feet so the rock looks like a dance; squash about the feet.
  ctx.translate(0, 20);
  ctx.rotate(rock);
  ctx.scale(sqX, sqY);
  ctx.translate(0, -20 + bob);

  ctx.fillStyle = "#a86a32";
  // Head.
  ctx.beginPath();
  ctx.arc(0, -13, 7, 0, TAU);
  ctx.fill();
  // Body.
  rr(ctx, -7, -6, 14, 16, 5);
  ctx.fill();
  // Arms — counter-swing & lift (drawn as deformed limbs, tips move with armSwing).
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.bezierCurveTo(-16, -4 - armRaise, -18 + armSwing, 4 - armRaise, -14 + armSwing, 7 - armRaise);
  ctx.bezierCurveTo(-12, 5, -9, 2, -7, 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7, -4);
  ctx.bezierCurveTo(16, -4 + armRaise, 18 + armSwing, 4 + armRaise, 14 + armSwing, 7 + armRaise);
  ctx.bezierCurveTo(12, 5, 9, 2, 7, 2);
  ctx.closePath();
  ctx.fill();
  // Legs.
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

  // Outline (head + body).
  ctx.strokeStyle = "#6a3c14";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -13, 7, 0, TAU);
  ctx.stroke();
  rr(ctx, -7, -6, 14, 16, 5);
  ctx.stroke();

  // Baked highlight.
  ctx.fillStyle = "rgba(255,220,160,0.4)";
  ctx.beginPath();
  ctx.arc(-2, -15, 2.4, 0, TAU);
  ctx.fill();

  // Icing trim — collar + cuffs (cuffs follow the arms).
  ctx.strokeStyle = "#fff8f0";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.quadraticCurveTo(-3, -7, 0, -5);
  ctx.quadraticCurveTo(3, -7, 6, -5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14 + armSwing, 6 - armRaise);
  ctx.lineTo(-11 + armSwing * 0.7, 3 - armRaise);
  ctx.moveTo(14 + armSwing, 6 + armRaise);
  ctx.lineTo(11 + armSwing * 0.7, 3 + armRaise);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, 18);
  ctx.lineTo(-4, 18);
  ctx.moveTo(8, 18);
  ctx.lineTo(4, 18);
  ctx.stroke();

  // Icing eyes + smile.
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

  // Gumdrop buttons.
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

  // Icing sparkles — twinkle along the trim, on the dance beat.
  const spk: Array<[number, number, number]> = [[0, -6, 0], [-12, 5, 1.3], [12, 5, 2.6]];
  spk.forEach(([x, y, off]) => {
    const k = twinkle(t, 1.6, off * 0.2);
    sparkle(ctx, x, y, 1.8, k, "255,250,240");
  });

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 8. Holly — was DEAD (the leaf rotate was a constant). Now the two leaves
//    counter-sway from their base joints with a TIP-CURL (a traveling bend that
//    runs to the leaf point), the berry cluster jiggles (each berry on its own
//    bob), and the whole sprig is nudged up. Glints demoted to a sparkle ping.
// ---------------------------------------------------------------------------
function animHolly(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -5.7); // re-frame: was sitting far low (off_y 5.7)
  ctx.scale(1.08, 1.08); // small nudge in size to fill the box

  // A gentle overall breeze + per-leaf counter-sway about the cluster base.
  const breeze = Math.sin(t * 1.5);
  groundShadow(ctx, breeze * 5, 24, 13, 3.5, 0, 0.2);

  // Two leaves. Each sways from its base joint with an opposite phase, and a
  // tip-curl bends the OUTER half of the leaf (articulated, not whole-rotated).
  const leans: number[] = [-0.5, 0.5];
  leans.forEach((lean, li) => {
    const dir = li === 0 ? 1 : -1;
    const sway = Math.sin(t * 1.6 + li * Math.PI) * 0.10; // counter-sway
    const curl = Math.sin(t * 2.0 + li * Math.PI + 0.6) * 1.6; // tip-curl amount

    ctx.save();
    // Pivot at the cluster base (where the leaf attaches, ~origin), sway there.
    ctx.rotate(lean * 0.6 + sway * dir);

    const g = ctx.createLinearGradient(0, -12, lean * 18, 14);
    g.addColorStop(0, "#3a9a4a");
    g.addColorStop(1, "#16622a");
    ctx.fillStyle = g;
    // Serrated leaf shape — the tip (near y=-14) is pulled sideways by `curl`
    // and the upper control points follow, so the point curls rather than the
    // whole blade pivoting rigidly.
    ctx.beginPath();
    ctx.moveTo(0 + curl, -14);
    ctx.bezierCurveTo(4 + curl * 0.7, -11, 2, -8, 6, -7);
    ctx.bezierCurveTo(3, -4, 5, -1, 7, 1);
    ctx.bezierCurveTo(3, 2, 4, 6, 3, 9);
    ctx.bezierCurveTo(1, 11, -1, 11, -3, 9);
    ctx.bezierCurveTo(-4, 6, -3, 2, -7, 1);
    ctx.bezierCurveTo(-5, -1, -3, -4, -6, -7);
    ctx.bezierCurveTo(-2, -8, -4 + curl * 0.7, -11, 0 + curl, -14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0e3a18";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Midrib follows the curl up to the tip.
    ctx.strokeStyle = "rgba(160,220,150,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(0, -4, curl, -12);
    ctx.stroke();
    // Side veins.
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

    // Demoted leaf sheen — a feathered sweep clipped to the leaf (secondary).
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0 + curl, -14);
    ctx.bezierCurveTo(4 + curl * 0.7, -11, 2, -8, 6, -7);
    ctx.bezierCurveTo(3, -4, 5, -1, 7, 1);
    ctx.bezierCurveTo(3, 2, 4, 6, 3, 9);
    ctx.bezierCurveTo(1, 11, -1, 11, -3, 9);
    ctx.bezierCurveTo(-4, 6, -3, 2, -7, 1);
    ctx.bezierCurveTo(-5, -1, -3, -4, -6, -7);
    ctx.bezierCurveTo(-2, -8, -4 + curl * 0.7, -11, 0 + curl, -14);
    ctx.closePath();
    ctx.clip();
    glint(ctx, loopPhase(t, 3.6, li * 0.5), { span: 8, width: 4, angle: 0.5, intensity: 0.2, length: 26 });
    ctx.restore();

    ctx.restore();
  });

  // Cluster of red berries — each jiggles on its own little bob (overlap), so
  // the cluster reads as soft fruit, not a frozen triangle.
  const berries: Array<[number, number, number]> = [[-2.5, 2, 3], [2.5, 1, 3], [0, 5, 3]];
  berries.forEach(([bx, by, r], i) => {
    const jx = Math.sin(t * 2.4 + i * 2.1) * 0.6 + breeze * 0.6;
    const jy = Math.cos(t * 2.2 + i * 1.7) * 0.5;
    const x = bx + jx;
    const y = by + jy;
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
    // Static base highlight (moves with the berry).
    ctx.fillStyle = "rgba(255,220,200,0.8)";
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 0.8, 0, TAU);
    ctx.fill();
    // Sequential clean sparkle — each berry pings in turn (secondary accent).
    const k = twinkle(t, 2.4, i / 3);
    sparkle(ctx, x - 1, y - 1.2, 2.0, k, "255,235,225");
  });

  ctx.restore();
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
