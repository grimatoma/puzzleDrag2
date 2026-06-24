// Weather & sky — animated variants (idle rebuild).
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds). The caller
// clears, translates to centre, scales by S/64, sets lineCap/lineJoin="round",
// and calls us; we draw at origin within a ~-24..+24 design box (positive y is
// DOWN, sky baseline ≈ y 22). Everything is deterministic in `t` (NO Math.random,
// NO Date) and loops seamlessly via `loopPhase`/`pingPong`/`breathe`/`beat`.
//
// The static silhouette & palette mirror src/textures/categories/weather.ts —
// identity is preserved; the MOTION is rebuilt to lead with real deformation
// (cloud swell/squash, a real lightning discharge cycle, a sleepy moon nod,
// breathing fog) with glints/sparkles demoted to secondary accents. Two shapes
// are rebuilt per the review: the comet head/tail (was blank at rest + a
// magnifying-ring head) and the rainbow end-clouds (highlight strokes crossed
// the interior as X's).

import {
  TAU,
  clamp01,
  lerp,
  breathe,
  loopPhase,
  pingPong,
  beat,
  twinkle,
  easeInOutSine,
  easeOutCubic,
  easeOutBack,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// Shared cloud body (matches the categories file). `cy` shifts the whole body
// vertically; `sx`/`sy` scale it about its own mid for a swell/shiver, drawn
// around a save/scale by the caller. Kept identical in silhouette to the static
// draw so identity reads the same.
// ---------------------------------------------------------------------------
function cloudBody(
  ctx: CanvasRenderingContext2D,
  cy: number,
  top: string,
  mid: string,
  bot: string,
  stroke: string,
  highlight: string,
): void {
  const body = ctx.createLinearGradient(0, -16 + cy, 0, 8 + cy);
  body.addColorStop(0, top);
  body.addColorStop(0.6, mid);
  body.addColorStop(1, bot);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-18, 2 + cy);
  ctx.arc(-12, -2 + cy, 8, Math.PI * 0.7, Math.PI * 1.8);
  ctx.arc(-2, -8 + cy, 11, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(12, -4 + cy, 9, Math.PI * 1.3, Math.PI * 0.2);
  ctx.lineTo(18, 2 + cy);
  ctx.bezierCurveTo(18, 6 + cy, -18, 6 + cy, -18, 2 + cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(-3, -9 + cy, 8, 4, -0.2, 0, TAU);
  ctx.fill();
}

// A clean little puffy cloud (three lobes) used by the rainbow ends. Rebuilt so
// the soft highlight is an inset cap on the TOP lobes — never a stroke crossing
// the body (the old version drew an X through the interior).
function puffCloud(ctx: CanvasRenderingContext2D, squash: number): void {
  ctx.save();
  ctx.scale(1 + squash * 0.12, 1 - squash * 0.12);
  const g = ctx.createLinearGradient(0, 6, 0, 20);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#c4d0da");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(-5, 14, 5, 0, TAU);
  ctx.arc(2, 12, 6, 0, TAU);
  ctx.arc(7, 15, 4.5, 0, TAU);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8c98a4";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Soft top sheen — small ellipse caps sitting ON the lobes, clipped to the
  // body so nothing crosses the interior.
  ctx.save();
  ctx.beginPath();
  ctx.arc(-5, 14, 5, 0, TAU);
  ctx.arc(2, 12, 6, 0, TAU);
  ctx.arc(7, 15, 4.5, 0, TAU);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(1, 9, 6, 2.4, -0.15, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 1. Rain cloud — a SWELL-AND-POUR cycle: the cloud inhales (squash + darken)
//    to charge, then bursts a denser sheet of rain that splashes at the
//    baseline; rests, repeats. Bob couples the shadowless sky body to the swell.
// ---------------------------------------------------------------------------
function animRainCloud(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 2.6;
  const ph = loopPhase(t, period);
  // Charge: ease the cloud's swell up over the first ~45% (inhale), then a quick
  // squash-release that pushes the burst.
  const charge = ph < 0.45 ? easeInOutSine(ph / 0.45) : 1 - easeInOutSine(clamp01((ph - 0.45) / 0.25));
  // Pour intensity peaks right after the release and tapers through the rest.
  const pour = beat(t, period, 0.6, -0.42); // 0 at rest, eased 0→1→0 around the burst
  const swell = charge * 0.09; // ±9% body squash
  const sink = charge * 2.0; // body dips as it fills
  const bob = -charge * 0.8 + Math.sin(t * 1.3) * 0.5; // subtle idle bob under the swell

  // Rain sheet — four columns; density & alpha rise with `pour`. Each streak
  // loops its Y via loopPhase so the fall tiles exactly.
  const cols: Array<[number, number, number]> = [
    [-12, 0.0, 19],
    [-5, 0.5, 24],
    [4, 0.8, 20],
    [12, 0.28, 26],
  ];
  const span = 17;
  const startY = 5 + sink + bob;
  ctx.lineWidth = 2;
  cols.forEach(([x, phase, speed], i) => {
    const local = loopPhase(t, span / speed, phase);
    const y = startY + local * span;
    const fall = Math.sin(local * Math.PI); // fade in at top, out near baseline
    const a = (0.18 + 0.5 * fall) * (0.35 + pour * 0.65);
    if (a > 0.02) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = i % 2 ? "#6db0ec" : "#3a78c0";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 9);
      ctx.stroke();
    }
    // Splash: a tiny dash kicks up at the baseline when a drop "lands" (local
    // near the bottom) and the cloud is pouring.
    const landed = clamp01((local - 0.82) / 0.18);
    const sa = landed * (0.25 + pour * 0.6);
    if (sa > 0.03) {
      const splY = startY + span + 1.5;
      ctx.globalAlpha = sa * (1 - landed) * 4 * 0.6 + sa * 0.15;
      ctx.strokeStyle = "rgba(150,196,236,1)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 4, splY);
      ctx.lineTo(x - 6, splY - 2.5);
      ctx.moveTo(x - 2, splY);
      ctx.lineTo(x, splY - 2.5);
      ctx.stroke();
      ctx.lineWidth = 2;
    }
  });
  ctx.globalAlpha = 1;

  // Cloud body — darkens as it charges (mid/bottom go moodier on the swell).
  const k = charge;
  ctx.save();
  ctx.translate(0, -2 + sink * 0.5);
  ctx.scale(1 + swell, 1 - swell * 0.7);
  ctx.translate(0, 2);
  cloudBody(
    ctx,
    bob,
    "#cdd6de",
    k > 0.001 ? mix("#8c98a4", "#6c7886", k) : "#8c98a4",
    k > 0.001 ? mix("#5e6a76", "#46525e", k) : "#5e6a76",
    "#3e4a56",
    "rgba(255,255,255,0.4)",
  );
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. Snow cloud — 3-4 BIGGER hexagonal flakes tumble & drift, fading in/out;
//    the cloud gives a periodic "shiver" puff (a quick squash beat) as if
//    shaking flakes loose.
// ---------------------------------------------------------------------------
function animSnowCloud(ctx: CanvasRenderingContext2D, t: number): void {
  // Shiver: most of the cycle at rest, a single quick squash that shakes flakes
  // loose, then settle.
  const shiver = beat(t, 3.4, 0.18);
  const swell = shiver * 0.06;
  const bob = breathe(t, 2.4, 0.7);

  // Bigger hexagonal flakes (4), tumbling. Sized 2.6–3.6 so they read at ~56px.
  const flakes: Array<[number, number, number, number]> = [
    [-11, 5, 3.4, 0.0],
    [1, 7, 3.0, 0.31],
    [10, 4, 3.6, 0.62],
    [-3, 8, 2.6, 0.83],
  ];
  const span = 19;
  flakes.forEach(([fx, baseY, r, phase], idx) => {
    const local = loopPhase(t, 3.0, phase); // slow fall, staggered
    const y = baseY + bob + local * span;
    const fade = Math.sin(local * Math.PI);
    // Drift sideways + a small extra kick on the shiver beat.
    const x = fx + Math.sin(t * 1.3 + idx * 1.7) * 2.6 + shiver * (idx % 2 ? 2 : -2);
    const rot = t * (0.7 + idx * 0.13) + idx;

    ctx.globalAlpha = clamp01(0.25 + fade * 0.75);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // Six spokes + bright filled core: a readable snowflake, not an asterisk.
    ctx.strokeStyle = "rgba(224,240,252,0.95)";
    ctx.lineWidth = 1.2;
    for (let a = 0; a < Math.PI; a += Math.PI / 3) {
      const cx = Math.cos(a) * r;
      const cy = Math.sin(a) * r;
      ctx.beginPath();
      ctx.moveTo(-cx, -cy);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      // Little barbs near the tips so the flake reads as crystalline.
      ctx.beginPath();
      ctx.moveTo(cx * 0.62, cy * 0.62);
      ctx.lineTo(cx * 0.62 - cy * 0.22, cy * 0.62 + cx * 0.22);
      ctx.moveTo(cx * 0.62, cy * 0.62);
      ctx.lineTo(cx * 0.62 + cy * 0.22, cy * 0.62 - cx * 0.22);
      ctx.stroke();
    }
    ctx.fillStyle = "#eaf4ff";
    ctx.beginPath();
    ctx.arc(0, 0, 1.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  });
  ctx.globalAlpha = 1;

  // Cloud body — quick shiver squash.
  ctx.save();
  ctx.translate(0, -2);
  ctx.scale(1 + swell, 1 - swell * 0.7);
  ctx.translate(0, 2);
  cloudBody(
    ctx,
    bob,
    "#f2f6fa",
    "#c4d0da",
    "#94a4b2",
    "#5e6e7c",
    "rgba(255,255,255,0.6)",
  );
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. Lightning — a real DISCHARGE cycle: anticipation (cloud darkens & charges,
//    bolt dim) → snap (white-hot strike + glow burst) → afterglow (fade out),
//    rest, repeat. The jag is rebuilt each cycle from the cycle index (NOT
//    Math.random) so successive strikes LOOK re-randomized while staying
//    deterministic & seamless.
// ---------------------------------------------------------------------------
function lightningJag(cycle: number): Array<[number, number]> {
  // A vertical zig-zag from the cloud (y≈0) down to y≈24, x jittered by a hash
  // of the cycle so each strike traces a different path. Returns spine points;
  // the ribbon is built around them by the caller.
  const pts: Array<[number, number]> = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const fy = i / steps;
    const y = fy * 24;
    // Deterministic pseudo-noise: incommensurate sines seeded by cycle & node.
    const n =
      Math.sin(cycle * 12.9898 + i * 78.233) * 0.6 +
      Math.sin(cycle * 4.1 + i * 1.7) * 0.4;
    const x = 2 + n * 5 * (1 - fy * 0.25); // narrows toward the tip
    pts.push([x, y]);
  }
  return pts;
}

function animLightning(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 1.9;
  const ph = loopPhase(t, period);
  const cycle = Math.floor((t / period) % 1024); // which strike — drives the jag

  // Envelope: charge (0..0.55) → snap (0.55..0.62) → afterglow decay → rest.
  let strike: number;
  let charge: number;
  if (ph < 0.55) {
    charge = easeInOutSine(ph / 0.55); // building tension
    strike = 0;
  } else if (ph < 0.62) {
    charge = 1;
    strike = easeOutCubic((ph - 0.55) / 0.07); // snap to full
  } else {
    charge = clamp01(1 - (ph - 0.62) / 0.2);
    strike = Math.max(0, 1 - (ph - 0.62) / 0.32); // afterglow tail
  }
  // A couple of sub-flickers riding the afterglow so the strike feels electric.
  const flick = strike > 0.05 ? strike * (0.7 + 0.3 * Math.abs(Math.sin(t * 47 + cycle))) : 0;
  const drift = Math.sin(t * 0.9) * 1.6;
  const jag = lightningJag(cycle);

  ctx.save();
  ctx.translate(drift, 0);

  // Storm cloud — darkens as it charges, lit faintly from below at the snap.
  const lit = strike;
  const body = ctx.createLinearGradient(0, -18, 0, 4);
  body.addColorStop(0, mix("#7a8694", "#9aa6b4", lit * 0.5));
  body.addColorStop(0.6, mix("#4a5664", charge > 0 ? "#3a4654" : "#4a5664", charge * 0.6));
  body.addColorStop(1, mix("#2e3844", "#43505e", lit * 0.7));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.arc(-12, -6, 8, Math.PI * 0.7, Math.PI * 1.8);
  ctx.arc(-2, -12, 11, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(12, -8, 9, Math.PI * 1.3, Math.PI * 0.2);
  ctx.lineTo(18, -2);
  ctx.bezierCurveTo(18, 2, -18, 2, -18, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1c2630";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(-3, -13, 8, 3.5, -0.2, 0, TAU);
  ctx.fill();

  // Glow burst behind the bolt at the snap.
  if (flick > 0.001) {
    const gr = 16 + flick * 8;
    const glow = ctx.createRadialGradient(jag[2][0], 11, 2, jag[2][0], 11, gr);
    glow.addColorStop(0, `rgba(255,245,170,${0.6 * flick})`);
    glow.addColorStop(1, "rgba(255,235,120,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(jag[2][0], 11, gr, 0, TAU);
    ctx.fill();
  }

  // Bolt ribbon — dim & thin between strikes (a charged filament), blazing at
  // the snap. Built as a stroked polyline along the re-randomized jag so it
  // genuinely re-strikes a new path each cycle.
  const rest = 0.16; // faint visible filament at rest so it never fully vanishes
  const boltA = rest + flick * 0.84;
  ctx.globalAlpha = boltA;
  ctx.strokeStyle = "#ffd43b";
  ctx.lineWidth = 2.4 + flick * 1.4;
  ctx.beginPath();
  ctx.moveTo(jag[0][0], jag[0][1]);
  for (let i = 1; i < jag.length; i++) ctx.lineTo(jag[i][0], jag[i][1]);
  ctx.stroke();
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = boltA * 0.8;
  ctx.beginPath();
  ctx.moveTo(jag[0][0], jag[0][1]);
  for (let i = 1; i < jag.length; i++) ctx.lineTo(jag[i][0], jag[i][1]);
  ctx.stroke();

  // White-hot core — only at the strike.
  if (flick > 0.02) {
    ctx.globalAlpha = flick;
    ctx.strokeStyle = "rgba(255,250,210,0.95)";
    ctx.lineWidth = 1.1 + flick * 0.8;
    ctx.beginPath();
    ctx.moveTo(jag[0][0], jag[0][1]);
    for (let i = 1; i < jag.length; i++) ctx.lineTo(jag[i][0], jag[i][1]);
    ctx.stroke();
    // A forked branch off the mid node for extra spark.
    const m = jag[3];
    ctx.beginPath();
    ctx.moveTo(jag[2][0], jag[2][1]);
    ctx.lineTo(m[0] + 4 + (cycle % 3) - 1, m[1] - 1);
    ctx.lineTo(m[0] + 7 + (cycle % 2), m[1] + 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. Comet — REBUILT. The head is ANCHORED in-frame and visible at t=0 (a
//    bloomed core, NOT a magnifying-glass ring); it bobs gently and the tail
//    flickers & tapers. A streak/dash is a PERIODIC EVENT (a quick lunge that
//    stretches the tail and slings sparkles) — never an empty rest frame.
// ---------------------------------------------------------------------------
function animComet(ctx: CanvasRenderingContext2D, t: number): void {
  // Head sits up-right of centre, drifting on a small Lissajous so it always
  // reads as a hovering comet (anchored — never flies off-screen).
  const hx = 6 + Math.sin(t * 0.8) * 2.2;
  const hy = -6 + Math.sin(t * 1.1 + 1.0) * 1.8;

  // Lunge beat: rest, then a quick dart along the tail axis that stretches the
  // tail and brightens everything (the "shooting" moment).
  const lunge = beat(t, 3.0, 0.5);
  const dash = easeOutBack(lunge, 1.6); // overshoot on the dart
  const headDX = dash * 3.0; // head leaps forward a touch on the lunge
  const headDY = -dash * 2.0;

  ctx.save();
  ctx.rotate(0.3);
  ctx.translate(hx + headDX, hy + headDY);

  // Tail axis points back-left (down-left in this rotated frame). Length flickers
  // and EXTENDS on the lunge. Built as a tapering quad fanning from the head.
  const flick = 0.85 + Math.sin(t * 9) * 0.1 + Math.sin(t * 5.3) * 0.05;
  const tailLen = (20 + dash * 16) * flick;
  const tx = -tailLen;
  const ty = tailLen * 0.92;
  const tail = ctx.createLinearGradient(0, 0, tx, ty);
  tail.addColorStop(0, "rgba(150,215,255,0.85)");
  tail.addColorStop(0.4, "rgba(90,160,240,0.40)");
  tail.addColorStop(1, "rgba(140,180,255,0)");
  ctx.fillStyle = tail;
  // Fan: wide at the head, pinching to a point — a flame-like taper, not a quad.
  const w0 = 5.5;
  ctx.beginPath();
  ctx.moveTo(0, -w0);
  ctx.quadraticCurveTo(tx * 0.4, ty * 0.4 - w0 * 0.6, tx, ty);
  ctx.quadraticCurveTo(tx * 0.4 + 2, ty * 0.4 + w0 * 0.7, w0 * 0.5, w0);
  ctx.closePath();
  ctx.fill();
  // A brighter inner streak down the tail core (flickers harder).
  const core = ctx.createLinearGradient(0, 0, tx * 0.7, ty * 0.7);
  core.addColorStop(0, `rgba(220,240,255,${0.55 * flick})`);
  core.addColorStop(1, "rgba(180,220,255,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(0, -2.2);
  ctx.quadraticCurveTo(tx * 0.35, ty * 0.35 - 1.5, tx * 0.7, ty * 0.7);
  ctx.quadraticCurveTo(tx * 0.35 + 1, ty * 0.35 + 1.5, 2, 2.2);
  ctx.closePath();
  ctx.fill();

  // Bloomed head — soft outer bloom + bright core, NO hard ring/stroke (the old
  // 1.4px stroke read as a magnifying-glass rim). Pure radial falloff.
  const bloomR = 12 + dash * 2 + Math.sin(t * 5) * 0.8;
  const bloom = ctx.createRadialGradient(0, 0, 1.5, 0, 0, bloomR);
  bloom.addColorStop(0, "rgba(220,245,255,0.9)");
  bloom.addColorStop(0.45, "rgba(150,210,255,0.45)");
  bloom.addColorStop(1, "rgba(120,190,255,0)");
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(0, 0, bloomR, 0, TAU);
  ctx.fill();

  const head = ctx.createRadialGradient(-1.6, -1.8, 0.6, 0, 0, 7.5);
  head.addColorStop(0, "#ffffff");
  head.addColorStop(0.5, "#dcefff");
  head.addColorStop(1, "rgba(90,160,232,0.65)");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, TAU);
  ctx.fill();
  // Crisp hot centre.
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(-1.4, -1.6, 2.4, 0, TAU);
  ctx.fill();

  // Sparkles flung along the tail; they accelerate outward on the lunge and
  // twinkle (clean 4-point stars, staggered).
  const sparks: Array<[number, number, number]> = [
    [-9, 9, 0.0],
    [-15, 15, 0.4],
    [-4, 5, 0.7],
    [-20, 19, 0.2],
  ];
  sparks.forEach(([sx, sy, off], idx) => {
    const fling = 1 + dash * 0.6;
    const tw = twinkle(t, 1.6, off + idx * 0.13);
    const a = (0.3 + 0.6 * tw) * (0.4 + flick * 0.4);
    sparkle(ctx, sx * fling, sy * fling, 1.4 + tw * 1.1, a, "220,240,255");
  });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. Sun cloud — best in module; polish only. Ray pulse is now SYNCED to the
//    sun's breathe (one heartbeat), and the foreground cloud drifts on a gentle
//    ARC (x + a coupled y) instead of a flat slide.
// ---------------------------------------------------------------------------
function animSunCloud(ctx: CanvasRenderingContext2D, t: number): void {
  const heart = breathe(t, 2.6, 1, 0); // -1..1 shared heartbeat

  ctx.save();
  ctx.translate(-6, -8);

  // Rays rotate slowly; length pulses in time with the sun's breathe.
  ctx.save();
  ctx.rotate(t * 0.3);
  ctx.strokeStyle = "#f5b820";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const pulse = 1 + heart * 0.16; // synced (was a free 2.5Hz wobble)
    const inner = 12;
    const outer = 17 * pulse;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.restore();

  // Sun disc — breathes on the same heartbeat.
  const sb = 1 + heart * 0.04;
  const sun = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11 * sb);
  sun.addColorStop(0, "#fff3a0");
  sun.addColorStop(0.6, "#ffce40");
  sun.addColorStop(1, "#f0991a");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(0, 0, 10 * sb, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#c87810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // Foreground cloud drifts on an arc (rises slightly as it slides right).
  const dx = Math.sin(t * 0.8) * 2.5;
  const dy = -Math.abs(Math.sin(t * 0.8)) * 0.8 + Math.sin(t * 1.6) * 0.4;
  ctx.save();
  ctx.translate(dx, dy);
  const body = ctx.createLinearGradient(0, -4, 0, 16);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.6, "#e6edf3");
  body.addColorStop(1, "#c0ccd6");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-12, 12);
  ctx.arc(-8, 8, 7, Math.PI * 0.7, Math.PI * 1.8);
  ctx.arc(2, 3, 9, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(14, 7, 7.5, Math.PI * 1.3, Math.PI * 0.2);
  ctx.lineTo(20, 12);
  ctx.bezierCurveTo(20, 16, -12, 16, -12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8c98a4";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 3, -0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. Rainbow — REBUILT end-clouds (clean puffs, no X-stroke) that bounce gently
//    out of phase; a soft sheen DRAWS ON along the arc (a moving bright window)
//    over a subtle overall shimmer.
// ---------------------------------------------------------------------------
function animRainbow(ctx: CanvasRenderingContext2D, t: number): void {
  const bands = ["#e23b3b", "#ef8d2e", "#f5c842", "#5aa84a", "#3a78c8", "#7a3ec0"];
  const cx = 0;
  const cy = 12;

  // Subtle overall shimmer.
  const shimmer = 0.85 + Math.sin(t * 1.4) * 0.12;

  // Base bands.
  ctx.lineWidth = 3.2;
  ctx.globalAlpha = shimmer;
  bands.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.arc(cx, cy, 21 - i * 3.2, Math.PI, TAU);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // Sheen window sweeping along the arc (PI..2PI), eased there-and-back so it
  // "draws on" and retreats seamlessly rather than teleporting.
  const sweep = pingPong(t, 4.2); // 0..1 eased
  const centerA = Math.PI + sweep * Math.PI;
  const win = Math.PI * 0.16;
  ctx.lineWidth = 3.6;
  bands.forEach((_, i) => {
    const r = 21 - i * 3.2;
    // Two passes for a feathered core; intensity peaks mid-window.
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, centerA - win, centerA + win);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, centerA - win * 0.4, centerA + win * 0.4);
    ctx.stroke();
    ctx.lineWidth = 3.6;
  });
  ctx.globalAlpha = 1;

  // End clouds — rebuilt clean puffs, bobbing out of phase so the rainbow feels
  // buoyed between them.
  const bobL = Math.sin(t * 1.3) * 1.3;
  const bobR = Math.sin(t * 1.3 + Math.PI) * 1.3;
  ctx.save();
  ctx.translate(-18, bobL);
  puffCloud(ctx, 0.5 + 0.5 * Math.sin(t * 1.3));
  ctx.restore();
  ctx.save();
  ctx.translate(18, bobR);
  puffCloud(ctx, 0.5 + 0.5 * Math.sin(t * 1.3 + Math.PI));
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. Crescent moon — the lit-limb highlight is moved to the OUTER lower-left
//    edge (where light actually catches the crescent — was on the dark inner
//    edge). Adds a slow sleepy NOD (eased rock about the moon centre) and
//    staggered star-bursts; the halo still breathes as a secondary accent.
// ---------------------------------------------------------------------------
function animCrescentMoon(ctx: CanvasRenderingContext2D, t: number): void {
  // Sleepy nod: a slow eased rock about the moon centre (pingPong dwells at the
  // turns) layered on the static -0.35 tilt, so it reads as a drowsy bob rather
  // than a metronome.
  const nod = (pingPong(t, 5.0) - 0.5) * 0.13 - 0.35;

  ctx.save();
  ctx.rotate(nod);

  // Breathing glow halo (secondary accent).
  const haloR = 22 + breathe(t, 2.8, 2.2);
  const haloA = 0.18 + (0.5 + 0.5 * Math.sin((t / 2.8) * TAU)) * 0.16;
  const halo = ctx.createRadialGradient(0, 0, 12, 0, 0, haloR);
  halo.addColorStop(0, `rgba(255,243,200,${haloA})`);
  halo.addColorStop(1, "rgba(255,243,200,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, TAU);
  ctx.fill();

  // Crescent — full disc minus offset disc (identical silhouette to static).
  const moon = ctx.createRadialGradient(-2, -2, 3, 0, 0, 20);
  moon.addColorStop(0, "#fff7d4");
  moon.addColorStop(0.6, "#f3e08a");
  moon.addColorStop(1, "#d6b840");
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, TAU);
  ctx.arc(8, -4, 15, 0, TAU, true);
  ctx.fillStyle = moon;
  ctx.fill("evenodd");
  ctx.strokeStyle = "#b09020";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 17, Math.PI * 0.42, Math.PI * 1.62);
  ctx.stroke();

  // Soft craters.
  ctx.fillStyle = "rgba(190,160,60,0.4)";
  ([[-9, 6, 2.2], [-12, -3, 1.6], [-5, 11, 1.4]] as Array<[number, number, number]>).forEach(
    ([crx, cry, r]) => {
      ctx.beginPath();
      ctx.arc(crx, cry, r, 0, TAU);
      ctx.fill();
    },
  );

  // LIT LIMB — a bright rim hugging the OUTER lower-left edge of the crescent
  // (radius ≈ 16.5, the sunlit limb), clipped to the crescent so it never
  // crosses the dark cutout. This was previously drawn at r=14 on the inner
  // side (the dark edge) — the review's "wrong edge" bug.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, TAU);
  ctx.arc(8, -4, 15, 0, TAU, true);
  ctx.clip("evenodd");
  const limbA = 0.5 + 0.18 * Math.sin((t / 2.8) * TAU); // gentle shimmer on the limb
  ctx.strokeStyle = `rgba(255,255,240,${clamp01(limbA)})`;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, 16.4, Math.PI * 0.5, Math.PI * 1.55);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // Twinkling stars — staggered bursts (clean 4-point sparkles).
  const stars: Array<[number, number, number, number]> = [
    [13, -12, 3.4, 0.0],
    [16, 6, 2.6, 0.5],
    [4, -16, 2.0, 0.85],
  ];
  stars.forEach(([sx, sy, r, off]) => {
    const tw = twinkle(t, 2.4, off);
    sparkle(ctx, sx, sy, r * (0.55 + tw * 0.7), 0.35 + tw * 0.65, "255,243,192");
  });
}

// ---------------------------------------------------------------------------
// 8. Fog — was a pure horizontal conveyor. Now the whole bank BREATHES
//    vertically (rises/sinks) while each band UNDULATES (its midline rolls as a
//    travelling wave), with a faint silhouette behind to sell depth/volume.
// ---------------------------------------------------------------------------
function animFog(ctx: CanvasRenderingContext2D, t: number): void {
  const breath = breathe(t, 3.6, 1.6); // whole-bank vertical breathing

  // Faint volumetric silhouette behind the bands (a soft mass that swells), so
  // the wisps read as fog over something rather than free-floating lines.
  const sg = ctx.createRadialGradient(0, 6, 4, 0, 6, 26 + breath);
  sg.addColorStop(0, "rgba(196,208,220,0.16)");
  sg.addColorStop(1, "rgba(196,208,220,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(0, 6 + breath * 0.5, 24, 16 + breath, 0, 0, TAU);
  ctx.fill();

  // base bands: [y, alpha, speed, phase]
  const bands: Array<[number, number, number, number]> = [
    [-12, 0.30, 3.5, 0.0],
    [-2, 0.38, 2.2, 0.4],
    [8, 0.52, 4.0, 0.7],
    [18, 0.42, 2.8, 0.2],
  ];
  const wrap = 13;

  bands.forEach(([y, alpha, speed, phase], i) => {
    const w = 28 + (i % 2) * 6;
    const dx = Math.sin(t * (speed / 10) + phase * TAU) * wrap;
    const x = -16 + dx;
    const yb = y + breath * (0.5 + (i % 2) * 0.4); // bands breathe at slightly different rates
    const fade = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (speed / 12) + phase * 4));
    const a = alpha * fade;
    const g = ctx.createLinearGradient(x, yb, x + w, yb);
    g.addColorStop(0, "rgba(200,212,224,0)");
    g.addColorStop(0.5, `rgba(176,190,204,${a})`);
    g.addColorStop(1, "rgba(200,212,224,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 5;
    // Undulating midline: a travelling wave rolls the band as it drifts (not a
    // flat slide). Sample a few control points so the crest moves through it.
    const k = t * 1.6 + phase * TAU;
    ctx.beginPath();
    ctx.moveTo(x, yb + Math.sin(k) * 1.8);
    ctx.bezierCurveTo(
      x + w * 0.3,
      yb + Math.sin(k + 1.0) * 2.4,
      x + w * 0.7,
      yb + Math.sin(k + 2.2) * 2.4,
      x + w,
      yb + Math.sin(k + 3.4) * 1.8,
    );
    ctx.stroke();
  });

  // Brighter wisps on top, drifting opposite for parallax + their own undulation.
  const wisps: Array<[number, number, number, number]> = [
    [2, 22, 3.0, 0.5],
    [13, 18, 4.5, 0.9],
    [-7, 20, 2.4, 0.1],
  ];
  ctx.lineWidth = 2;
  wisps.forEach(([y, w, speed, phase]) => {
    const dx = -Math.sin(t * (speed / 11) + phase * TAU) * wrap * 0.8;
    const x = -12 + dx;
    const yb = y + breath * 0.7;
    const fade = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * (speed / 13) + phase * 5));
    const g = ctx.createLinearGradient(x, yb, x + w, yb);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(255,255,255,${0.45 * fade})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = g;
    const k = t * 1.9 + phase * TAU;
    ctx.beginPath();
    ctx.moveTo(x, yb + Math.sin(k) * 1.3);
    ctx.bezierCurveTo(
      x + w * 0.3,
      yb + Math.sin(k + 1.1) * 1.8,
      x + w * 0.7,
      yb + Math.sin(k + 2.3) * 1.8,
      x + w,
      yb + Math.sin(k + 3.5) * 1.3,
    );
    ctx.stroke();
  });
}

// ---------------------------------------------------------------------------
// Small local helper: blend two #rrggbb colors by k (0..1). Used for the
// charge-darken / strike-lighten passes. Deterministic, stub-safe.
// ---------------------------------------------------------------------------
function mix(a: string, b: string, k: number): string {
  const u = clamp01(k);
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(lerp(ar, br, u));
  const g = Math.round(lerp(ag, bg, u));
  const bl = Math.round(lerp(ab, bb, u));
  return `rgb(${r},${g},${bl})`;
}

export const ANIMATIONS: Record<
  string,
  (ctx: CanvasRenderingContext2D, t: number) => void
> = {
  weather_rain_cloud: animRainCloud,
  weather_snow_cloud: animSnowCloud,
  weather_lightning: animLightning,
  weather_comet: animComet,
  weather_sun_cloud: animSunCloud,
  weather_rainbow: animRainbow,
  weather_crescent_moon: animCrescentMoon,
  weather_fog: animFog,
};
