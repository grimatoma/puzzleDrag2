// Animated arcane icons — same jewel-tone look as src/textures/categories/arcane.ts,
// but alive. Each fn redraws the WHOLE icon at time `t` (seconds). The static
// geometry/palette is the strong part and is preserved; the MOTION and FRAMING are
// rebuilt to lead with real deformation (bob/rock/squash/float/pour) with glints &
// glows demoted to a secondary accent. Loops tile exactly because every position is
// driven from `loopPhase`/`pingPong`/`breathe`/`beat` (never a raw sawtooth), and the
// contact shadows couple to vertical motion via `groundShadow`. The default
// "static body + animated overlay" pattern is gone: every body moves.

import {
  TAU,
  clamp01,
  lerp,
  breathe,
  loopPhase,
  pingPong,
  beat,
  easeInOutSine,
  easeOutCubic,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// arcane_candle — the benchmark flame deformation, but now LOOP-CLEAN: the sway/
// flicker sines are retuned to integer multiples of one base frequency so they
// share a single period, and a periodic GUST beat leans the flame, gutters it
// (shorter + dimmer), then lets it recover with a small overshoot. Embers ride a
// deterministic per-index loopPhase. Re-centred down ~2.6u (off_y -2.6).
function animCandle(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, 2.6); // re-frame: was sitting ~2.6u high

  // One base period (1.2s); all flame sines are integer multiples of it → the
  // whole flicker tiles seamlessly instead of beating against itself forever.
  const base = (t / 1.2) * TAU;
  const idle = Math.sin(base * 2) * 1.0 + Math.sin(base * 5) * 0.45; // organic jitter, loops
  const flickIdle = Math.sin(base * 4) * 0.09 + Math.sin(base * 7) * 0.045;

  // Gust beat: every ~3.6s a wind shoves the flame (lean), it gutters (collapses
  // short + dim), then it RECOVERS with a brief flare taller than rest before
  // settling — a real shove → duck → spring, not a metronome.
  const gustCycle = loopPhase(t, 3.6);
  const g = beat(t, 3.6, 0.32); // shove window (0→1→0)
  const gustLean = g * 4.2; // hard lean during the gust
  const gutter = g * (0.55 + 0.25 * Math.sin(base * 9)); // height collapse on gust
  // Recover flare: a damped overshoot right after the gust window ends. Kept
  // SMALL (0.06) so the post-gust recovery never blooms into a white-out that
  // pops against the calmer rest frame on loop.
  const recover = gustCycle > 0.32 && gustCycle < 0.6
    ? Math.sin(((gustCycle - 0.32) / 0.28) * Math.PI) * 0.06
    : 0;

  const sway = idle + gustLean * easeInOutSine(g);
  const flick = 0.92 + flickIdle - gutter * 0.5 + recover;
  const flameTipY = -23 - (flick - 0.92) * 6 + gutter * 5; // shorter when guttering
  // Glow pulse: lower base + gentler flick coupling so the halo breathes warmly
  // without ever clipping to a bloom. Peaks well under the old ~0.8 white-out.
  const glowPulse = 0.46 + Math.sin(base * 3) * 0.1 + (flick - 0.92) * 0.55 - gutter * 0.5;

  // Contact shadow brightens/sharpens a touch as the flame flares.
  groundShadow(ctx, 0, 23, 13, 3.5, 0, 0.24 + Math.max(0, flick - 0.95) * 0.2);

  // Warm flame glow (pulsing, follows the sway)
  const glow = ctx.createRadialGradient(sway * 0.5, -16, 1, sway * 0.5, -14, 20);
  glow.addColorStop(0, `rgba(255,210,120,${clamp01(glowPulse)})`);
  glow.addColorStop(0.5, "rgba(255,160,60,0.25)");
  glow.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sway * 0.5, -14, 20, 0, TAU);
  ctx.fill();

  // Brass holder base
  const baseGrad = ctx.createLinearGradient(0, 12, 0, 22);
  baseGrad.addColorStop(0, "#e6c24a");
  baseGrad.addColorStop(0.5, "#b8902a");
  baseGrad.addColorStop(1, "#6a4e12");
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.moveTo(-11, 22);
  ctx.bezierCurveTo(-13, 16, -7, 14, -6, 13);
  ctx.lineTo(6, 13);
  ctx.bezierCurveTo(7, 14, 13, 16, 11, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2808";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Holder cup
  ctx.fillStyle = "#caa238";
  ctx.beginPath();
  ctx.moveTo(-6, 13);
  ctx.lineTo(-5, 7);
  ctx.lineTo(5, 7);
  ctx.lineTo(6, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2808";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Brass highlight
  ctx.fillStyle = "rgba(255,245,200,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, 18, 1.4, 3.5, 0.2, 0, TAU);
  ctx.fill();

  // Candle wax body
  const wax = ctx.createLinearGradient(-5, 0, 5, 0);
  wax.addColorStop(0, "#fff6e2");
  wax.addColorStop(0.5, "#f4e2c0");
  wax.addColorStop(1, "#cdb488");
  ctx.fillStyle = wax;
  ctx.beginPath();
  ctx.moveTo(-5, 7);
  ctx.lineTo(-5, -10);
  ctx.bezierCurveTo(-5, -12, 5, -12, 5, -10);
  ctx.lineTo(5, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a8258";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Wax top rim + drip
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, -10, 5, 1.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(-4, 5);
  ctx.stroke();

  // Wick — bends toward the flame's lean.
  ctx.strokeStyle = "#2a2018";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.quadraticCurveTo(sway * 0.18, -12, sway * 0.3, -14);
  ctx.stroke();

  // Rising embers — deterministic per-index loop (no Math.random).
  for (let i = 0; i < 4; i++) {
    const ph = loopPhase(t, 1.4, i * 0.27);
    const ex = sway + Math.sin(ph * TAU + i) * 2.2 + (i - 1.5) * 0.8;
    const ey = -16 - ph * 14;
    const ea = (1 - ph) * 0.8 * Math.max(0, Math.sin(ph * Math.PI));
    ctx.fillStyle = `rgba(255,200,110,${ea})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 0.7 + (1 - ph) * 0.5, 0, TAU);
    ctx.fill();
  }

  // Flame (outer) — real deformation: the tip sways, the body leans into the
  // gust (control points shear), the height collapses while guttering.
  const cx = sway * 0.4;
  const tipX = sway * 1.15;
  const flame = ctx.createRadialGradient(cx, -16, 1, cx, -15, 7);
  flame.addColorStop(0, "#fff7d0");
  flame.addColorStop(0.4, "#ffcf60");
  flame.addColorStop(0.8, "#ff8a28");
  flame.addColorStop(1, "rgba(255,100,20,0.2)");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(tipX, flameTipY);
  ctx.bezierCurveTo(-5 + cx + gustLean * 0.3, -18, -4 + cx, -11, 0, -10);
  ctx.bezierCurveTo(4 + cx + gustLean * 0.3, -11, 5 + cx, -18, tipX, flameTipY);
  ctx.closePath();
  ctx.fill();

  // Flame inner bright core — taller when the flame is tall, ducks on a gust.
  // Coupling toned down so the core stays a warm white, never a flat blow-out.
  ctx.fillStyle = `rgba(255,255,255,${clamp01(0.72 + (flick - 0.92) * 0.7 - gutter * 0.6)})`;
  ctx.beginPath();
  ctx.ellipse(cx * 0.6, -14, 1.6, Math.max(1, 3.0 + (flick - 0.92) * 4 - gutter * 3), 0, 0, TAU);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// arcane_potion_red — was a frozen flask. Now the whole bottle BOBS and gently
// ROCKS about its base, the liquid surface SLOSHES with follow-through (it lags
// and over-tilts opposite the rock), the body counter-shifts, and a bubble pops
// at the surface on a beat with a clean sparkle. Re-centred up ~4.3u (off_y +4.3).
function animPotionRed(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -4.3); // re-frame: was sitting ~4.3u low

  const bob = Math.sin((t / 1.7) * TAU) * 1.3; // gentle vertical bob
  const rock = Math.sin((t / 2.3) * TAU) * 0.05; // body rock about the base
  const slosh = Math.sin((t / 2.3) * TAU - 0.9) * 1.7; // liquid lags the rock (follow-through)
  const glowPulse = 0.4 + Math.sin((t / 1.7) * TAU) * 0.14;

  groundShadow(ctx, 0, 23, 13, 3.5, bob, 0.25);

  // Outer glow (pulsing) — drawn in world space so the aura stays put.
  const glow = ctx.createRadialGradient(0, 8, 2, 0, 8, 26);
  glow.addColorStop(0, `rgba(255,70,90,${glowPulse})`);
  glow.addColorStop(0.6, "rgba(255,40,60,0.18)");
  glow.addColorStop(1, "rgba(255,40,60,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 8, 26, 0, TAU);
  ctx.fill();

  // Bob + rock about the round bottom (~y=18).
  ctx.save();
  ctx.translate(0, bob);
  ctx.translate(0, 18);
  ctx.rotate(rock);
  ctx.translate(0, -18);

  const flask = (): void => {
    ctx.beginPath();
    ctx.moveTo(-3, -14);
    ctx.lineTo(-3.5, -4);
    ctx.bezierCurveTo(-14, 0, -14, 18, 0, 20);
    ctx.bezierCurveTo(14, 18, 14, 0, 3.5, -4);
    ctx.lineTo(3, -14);
    ctx.closePath();
  };

  // Glass body
  flask();
  ctx.fillStyle = "rgba(210,235,245,0.22)";
  ctx.fill();

  // Liquid (clipped) — the body shifts a hair against the slosh.
  ctx.save();
  flask();
  ctx.clip();
  const liquid = ctx.createRadialGradient(-3 + slosh * 0.4, 4, 2, 0, 10, 18);
  liquid.addColorStop(0, "#ff8a8a");
  liquid.addColorStop(0.5, "#e02838");
  liquid.addColorStop(1, "#700818");
  ctx.fillStyle = liquid;
  ctx.beginPath();
  ctx.rect(-15 + slosh * 0.5, 0, 30, 24);
  ctx.fill();

  // Sloshing surface: a tilted, lagging meniscus (the follow-through made real).
  ctx.strokeStyle = "rgba(255,200,200,0.65)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, 0.8 + slosh * 0.7);
  ctx.quadraticCurveTo(0, 2.4 - slosh * 0.5, 11, 0.8 - slosh * 0.7);
  ctx.stroke();
  // A thin lighter band above it sells liquid depth.
  ctx.fillStyle = "rgba(255,150,160,0.35)";
  ctx.beginPath();
  ctx.moveTo(-12, 1.2 + slosh * 0.7);
  ctx.quadraticCurveTo(0, 3.0 - slosh * 0.5, 12, 1.2 - slosh * 0.7);
  ctx.lineTo(12, 5 - slosh * 0.5);
  ctx.quadraticCurveTo(0, 6 - slosh * 0.3, -12, 5 + slosh * 0.5);
  ctx.closePath();
  ctx.fill();

  // Rising bubbles — deterministic loop, drift toward the surface (~y=1.5).
  const surfaceY = 1.5;
  for (let i = 0; i < 5; i++) {
    const ph = loopPhase(t, 2.6, (i * 0.41) % 1);
    const startY = 17;
    const by = lerp(startY, surfaceY, easeOutCubic(ph));
    const wob = Math.sin(ph * 8 + i) * 1.3 + slosh * 0.3;
    const bx = ((i % 5) - 2) * 2.4 + wob;
    const baseR = 0.8 + (i % 3) * 0.35;
    const pop = ph > 0.85 ? (ph - 0.85) / 0.15 : 0;
    const r = baseR * (1 + pop * 0.6);
    const alpha = 0.7 * (1 - pop);
    if (alpha <= 0.02) continue;
    ctx.fillStyle = `rgba(255,220,220,${alpha})`;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, TAU);
    ctx.fill();
  }
  // Bubble-pop sparkle beat: once per cycle a bubble bursts at the surface.
  const popBeat = beat(t, 2.6, 0.18, 0.82);
  if (popBeat > 0.01) {
    sparkle(ctx, 2 + slosh, surfaceY - 0.5, 1.4 + popBeat * 0.8, popBeat * 0.8, "255,225,225");
  }
  ctx.restore();

  // Glass outline
  flask();
  ctx.strokeStyle = "#2a3a44";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Specular streak (demoted, follows the glass)
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.bezierCurveTo(-11, 8, -10, 14, -6, 17);
  ctx.stroke();

  // Cork
  const cork = ctx.createLinearGradient(-4, -20, 4, -20);
  cork.addColorStop(0, "#c89858");
  cork.addColorStop(0.5, "#a67838");
  cork.addColorStop(1, "#6a4a1c");
  ctx.fillStyle = cork;
  ctx.beginPath();
  ctx.moveTo(-4, -14);
  ctx.lineTo(-4.5, -21);
  ctx.lineTo(4.5, -21);
  ctx.lineTo(4, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a280c";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Neck band
  ctx.strokeStyle = "#2a3a44";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3.4, -13);
  ctx.lineTo(3.4, -13);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// arcane_potion_blue — the deadest of the set and visually bottom-heavy (a
// half-empty cone). Fixes: the liquid is RAISED to fill most of the cone, a
// FIZZING COLUMN streams up the centre, and a periodic REACTION SURGE squashes
// the flask + bumps the level + flares the glow. Re-centred up ~7.4u (off_y +7.4).
function animPotionBlue(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -7.4); // re-frame: was sitting ~7.4u low

  // Reaction surge: rest, then a quick swell that springs back (one beat).
  const surge = beat(t, 3.2, 0.42); // 0 at rest, 0→1→0 during a reaction
  const squashX = 1 + surge * 0.07; // flask bulges wide on the surge
  const squashY = 1 - surge * 0.06;
  const levelRise = surge * 3.2; // liquid jumps during the reaction
  const glowPulse = 0.42 + Math.sin((t / 2.4) * TAU + 1) * 0.12 + surge * 0.22;

  groundShadow(ctx, 0, 23, 15, 3.5, -surge * 1.5, 0.25);

  // Outer glow (pulsing, flares with the surge)
  const glow = ctx.createRadialGradient(0, 10, 2, 0, 10, 26);
  glow.addColorStop(0, `rgba(80,170,255,${glowPulse})`);
  glow.addColorStop(0.6, "rgba(40,120,255,0.18)");
  glow.addColorStop(1, "rgba(40,120,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 10, 26, 0, TAU);
  ctx.fill();

  // Squash about the wide base (~y=20).
  ctx.save();
  ctx.translate(0, 20);
  ctx.scale(squashX, squashY);
  ctx.translate(0, -20);

  const flask = (): void => {
    ctx.beginPath();
    ctx.moveTo(-3.5, -16);
    ctx.lineTo(-3.5, -6);
    ctx.lineTo(-15, 18);
    ctx.bezierCurveTo(-15, 21, -13, 22, -10, 22);
    ctx.lineTo(10, 22);
    ctx.bezierCurveTo(13, 22, 15, 21, 15, 18);
    ctx.lineTo(3.5, -6);
    ctx.lineTo(3.5, -16);
    ctx.closePath();
  };

  // Glass body
  flask();
  ctx.fillStyle = "rgba(210,235,245,0.22)";
  ctx.fill();

  // Liquid (clipped) — RAISED: surface now sits up near the shoulders (~y=-2),
  // not down at y=7. The reaction surge lifts it further.
  ctx.save();
  flask();
  ctx.clip();
  const surfaceY = -1.5 - levelRise;
  const liquid = ctx.createRadialGradient(-4, 12, 2, 0, 18, 22);
  liquid.addColorStop(0, "#8ad6ff");
  liquid.addColorStop(0.5, "#2884e0");
  liquid.addColorStop(1, "#0a2c80");
  ctx.fillStyle = liquid;
  ctx.beginPath();
  ctx.rect(-16, surfaceY, 32, 26 - surfaceY);
  ctx.fill();

  // Sloshing surface highlight (lifts with the surge).
  const wobble = Math.sin((t / 1.6) * TAU) * 0.8;
  ctx.strokeStyle = "rgba(200,235,255,0.65)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-9, surfaceY + 0.4 + wobble * 0.3);
  ctx.quadraticCurveTo(0, surfaceY + 1.8 + wobble, 9, surfaceY + 0.4 - wobble * 0.3);
  ctx.stroke();

  // FIZZING COLUMN: a dense ribbon of fine bubbles boiling up the centre line,
  // tighter and faster than the old scattered bubbles. Surges during a reaction.
  const fizzCount = 10;
  for (let i = 0; i < fizzCount; i++) {
    const ph = loopPhase(t, 1.1 + (i % 3) * 0.25, (i / fizzCount) % 1);
    const by = lerp(21, surfaceY + 0.5, ph);
    const sway = Math.sin(ph * TAU * 2 + i) * (1.3 + (by - surfaceY) * 0.06);
    const bx = sway + (i % 2 === 0 ? 0.6 : -0.6);
    const r = (0.5 + (i % 3) * 0.25) * (1 + surge * 0.5);
    const a = (0.45 + 0.4 * Math.sin(ph * Math.PI)) * (0.7 + surge * 0.3);
    ctx.fillStyle = `rgba(220,240,255,${clamp01(a)})`;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, TAU);
    ctx.fill();
  }
  // Reaction froth at the surface during the surge.
  if (surge > 0.05) {
    for (let i = 0; i < 4; i++) {
      const fx = (i - 1.5) * 3.2 + Math.sin(t * 6 + i) * 1.2;
      ctx.fillStyle = `rgba(220,245,255,${surge * 0.6})`;
      ctx.beginPath();
      ctx.arc(fx, surfaceY + Math.sin(i * 1.7) * 0.8, 1.0 + surge * 0.8, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  // Glass outline
  flask();
  ctx.strokeStyle = "#243846";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Specular streak (demoted)
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 6);
  ctx.bezierCurveTo(-12, 12, -13, 17, -11, 20);
  ctx.stroke();

  // Neck rim
  ctx.strokeStyle = "#243846";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-4.5, -16);
  ctx.lineTo(4.5, -16);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// arcane_crystal_ball — the internal swirl is genuine but `t*0.5` never looped
// and the claws were faint scratches. Fixes: PHASE-LOCK the spin to a sub-turn
// that exploits the swirl's 3-fold symmetry (rotate exactly TAU/3 per loop → the
// galaxy tiles), add a SCRYING PULSE (breathing aura + a periodic bright flare),
// and THICKEN the cradle claws. Re-centred up ~2.6u (off_y +2.6).
function animCrystalBall(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.6); // re-frame: was sitting ~2.6u low

  // The three swirl arms are offset by 2.1 rad; a full TAU/3 turn maps arm→arm,
  // so driving the angle as loopPhase * (TAU/3) makes the rotation seamless.
  const spin = loopPhase(t, 6.0) * (TAU / 3);
  const sparkSpin = loopPhase(t, 9.0) * (TAU / 3);
  // Scrying pulse: a slow breath plus a periodic brighter flare (a "vision").
  const breath = breathe(t, 3.4, 0.12, 0.5);
  const scry = beat(t, 5.5, 0.5); // bright flare event
  const auraPulse = breath + scry * 0.3;

  groundShadow(ctx, 0, 23, 16, 3.5, 0, 0.28);

  // Ornate stand base
  const base = ctx.createLinearGradient(0, 14, 0, 24);
  base.addColorStop(0, "#caa24a");
  base.addColorStop(1, "#6a4a18");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.lineTo(12, 22);
  ctx.lineTo(8, 16);
  ctx.lineTo(-8, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2608";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Stand claws — THICKENED into proper cradling talons (was 2.6px scratches),
  // with a darker base stroke + a lit edge so they read as gold metal.
  ([-8, 0, 8] as number[]).forEach((cx) => {
    ctx.strokeStyle = "#5a3e12";
    ctx.lineWidth = 4.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx * 0.5, 16);
    ctx.quadraticCurveTo(cx, 11, cx * 0.92, 4);
    ctx.stroke();
    ctx.strokeStyle = "#caa24a";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx * 0.5, 16);
    ctx.quadraticCurveTo(cx, 11, cx * 0.92, 4);
    ctx.stroke();
    // Claw tip catching the ball.
    ctx.fillStyle = "#e6c24a";
    ctx.beginPath();
    ctx.arc(cx * 0.92, 4, 1.5, 0, TAU);
    ctx.fill();
  });
  ctx.lineCap = "butt";

  // Glow behind ball (scrying aura, pulses)
  const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, 22);
  glow.addColorStop(0, `rgba(150,110,255,${clamp01(auraPulse)})`);
  glow.addColorStop(0.6, "rgba(110,80,230,0.2)");
  glow.addColorStop(1, "rgba(110,80,230,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, 22, 0, TAU);
  ctx.fill();

  // Glass sphere
  const sphere = ctx.createRadialGradient(-5, -8, 2, 0, -2, 16);
  sphere.addColorStop(0, "#3a2c66");
  sphere.addColorStop(0.7, "#241a4a");
  sphere.addColorStop(1, "#0e0826");
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, TAU);
  ctx.fill();

  // Swirling galaxy inside (rotating, clipped) — brightens on a scry flare.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = `rgba(180,140,255,${clamp01(0.6 + scry * 0.35)})`;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let u = 0; u < Math.PI * 2.4; u += 0.2) {
      const r = 1.5 + u * 2;
      const a = u + i * 2.1 + spin;
      const px = Math.cos(a) * r;
      const py = -2 + Math.sin(a) * r * 0.7;
      if (u === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Star sparks inside — rotate with the locked spin so they tile too.
  const sparks: Array<[number, number, number]> = [
    [-6, -7, 1.2], [5, -5, 1], [2, 2, 1.4], [-4, 3, 0.9], [7, -9, 0.8],
  ];
  sparks.forEach(([sx, sy, sr], i) => {
    const ang = sparkSpin;
    const rx = sx * Math.cos(ang) - (sy + 2) * Math.sin(ang);
    const ry = sx * Math.sin(ang) + (sy + 2) * Math.cos(ang) - 2;
    const tw = 0.5 + 0.5 * Math.abs(Math.sin((t / 1.0) * TAU * 0.4 + i * 1.7));
    sparkle(ctx, rx, ry, sr * (0.7 + tw * 0.6), 0.4 + 0.5 * tw + scry * 0.2, "235,225,255");
  });
  ctx.restore();

  // A demoted feathered sheen drifts across the polished glass (clipped to the
  // sphere, low intensity — a secondary accent, not a hard streak).
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, TAU);
  ctx.clip();
  ctx.translate(0, -2);
  glint(ctx, loopPhase(t, 5.0), { span: 12, width: 6, intensity: 0.22, length: 30 });
  ctx.restore();

  // Sphere outline
  ctx.strokeStyle = "#1a0e3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, TAU);
  ctx.stroke();

  // Specular streak (fixed glass highlight)
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, -2, 10, Math.PI * 1.1, Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, -9, 2.4, 3.4, -0.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// arcane_runestone — was near-dead (a frozen stone, runes only brightness-
// pulsed). Now the tablet FLOATS (a slow bob + slight tilt, shadow couples), the
// shimmer sweep is brighter and loop-clean, and the three runes IGNITE STROKE-BY-
// STROKE in sequence: each lights with a flare + a spark at its tip, holds, then
// the cycle repeats. Re-centred up ~2.8u (off_y +2.8).
function animRunestone(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.8); // re-frame: was sitting ~2.8u low

  const bob = breathe(t, 3.0, 1.6, 0); // slow levitation
  // Tilt demoted to a barely-there drift: the LIFE is in the runes' glow cycle,
  // not a stiff whole-body pendulum (which read as the sprite being rotated).
  const tilt = Math.sin((t / 5.4) * TAU) * 0.012;

  groundShadow(ctx, 0, 23, 15, 3.5, bob, 0.28);

  // Float + tilt the whole tablet about its centre.
  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(tilt);

  const tablet = (): void => {
    ctx.beginPath();
    ctx.moveTo(-11, -19);
    ctx.lineTo(10, -20);
    ctx.lineTo(12, 6);
    ctx.lineTo(9, 21);
    ctx.lineTo(-9, 22);
    ctx.lineTo(-12, 2);
    ctx.closePath();
  };

  // Stone tablet
  const stone = ctx.createLinearGradient(0, -20, 0, 22);
  stone.addColorStop(0, "#8a8e96");
  stone.addColorStop(0.5, "#5e636c");
  stone.addColorStop(1, "#3a3e46");
  ctx.fillStyle = stone;
  tablet();
  ctx.fill();
  ctx.strokeStyle = "#23262c";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top bevel highlight
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, -17);
  ctx.lineTo(9, -18);
  ctx.stroke();

  // Surface cracks
  ctx.strokeStyle = "rgba(30,32,38,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.lineTo(-3, -6);
  ctx.lineTo(-7, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -8);
  ctx.lineTo(4, 4);
  ctx.stroke();

  // Magical shimmer sweeping the tablet — brighter and loop-clean (loopPhase).
  ctx.save();
  tablet();
  ctx.clip();
  const sweep = -24 + loopPhase(t, 3.6) * 60; // -24..36, tiles exactly
  const shimmer = ctx.createLinearGradient(sweep - 12, -20, sweep + 12, 20);
  shimmer.addColorStop(0, "rgba(150,210,255,0)");
  shimmer.addColorStop(0.5, "rgba(180,228,255,0.28)");
  shimmer.addColorStop(1, "rgba(150,210,255,0)");
  ctx.fillStyle = shimmer;
  ctx.fillRect(-13, -21, 27, 45);
  ctx.restore();

  // The runes are alive in their OWN right: each carved glyph breathes through a
  // continuous glow cycle (never latching to a flat-lit hold), and a brighter
  // "charge" wave travels rune 0→1→2 on a beat so the energy reads as flowing
  // through the stone rather than the slab being rocked. `lit(i)` is rune i's
  // 0..1 glow — it loops seamlessly (pure periodic helpers, no hold-then-snap).
  const lit = (i: number): number => {
    // Continuous gentle breath, phase-staggered per rune (≈0.32 base..0.7 idle).
    const breath = 0.5 + 0.18 * Math.sin(((t / 1.8) - i * 0.22) * TAU);
    // A travelling charge surge that sweeps through the three runes in turn.
    const surge = beat(t, 3.2, 0.3, (i * 0.18) % 1);
    return clamp01(0.32 + breath * 0.45 + surge * 0.4);
  };

  const drawRune = (i: number, body: () => void, sparkAt: [number, number]): void => {
    const p = lit(i);
    ctx.save();
    ctx.strokeStyle = `rgba(122,208,255,${clamp01(0.35 + 0.65 * p)})`;
    ctx.lineWidth = 2 + p * 0.7;
    ctx.lineCap = "round";
    // A soft halo under the stroke (stub-safe: no shadowBlur reliance) by
    // stroking a faint wider pass first — wider/brighter on the surge.
    ctx.save();
    ctx.strokeStyle = `rgba(130,200,255,${clamp01(0.3 * p)})`;
    ctx.lineWidth = 4.5 + p * 2.2;
    body();
    ctx.restore();
    body();
    ctx.restore();
    // Charge spark at the rune's tip right as its surge peaks.
    const igniteBeat = beat(t, 3.2, 0.12, (i * 0.18) % 1);
    if (igniteBeat > 0.01) {
      sparkle(ctx, sparkAt[0], sparkAt[1], 1.3 + igniteBeat * 0.9, igniteBeat * 0.9, "190,230,255");
    }
  };

  // Rune 1 (arrow-like)
  drawRune(0, () => {
    ctx.beginPath();
    ctx.moveTo(-5, -12);
    ctx.lineTo(-5, 0);
    ctx.moveTo(-5, -8);
    ctx.lineTo(-1, -11);
    ctx.moveTo(-5, -4);
    ctx.lineTo(-1, -1);
    ctx.stroke();
  }, [-5, -12]);
  // Rune 2 (angular)
  drawRune(1, () => {
    ctx.beginPath();
    ctx.moveTo(4, -10);
    ctx.lineTo(4, 4);
    ctx.moveTo(4, -10);
    ctx.lineTo(8, -6);
    ctx.lineTo(4, -2);
    ctx.stroke();
  }, [8, -6]);
  // Rune 3 (cross mark)
  drawRune(2, () => {
    ctx.beginPath();
    ctx.moveTo(-3, 8);
    ctx.lineTo(2, 14);
    ctx.moveTo(2, 8);
    ctx.lineTo(-3, 14);
    ctx.stroke();
  }, [0, 11]);

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// arcane_magic_dust — the WORST framing (everything jammed upper-right, off_x
// +7.1, off_y +4.6) on a frozen pouch. Fixes: RE-CENTRE the whole composition,
// then make the pour real — the pouch TILTS to pour on a beat (squashing as it
// tips), a DUST STREAM falls along an arc (deterministic particle loop, gated by
// the pour), and sparkles pop along the stream + settle below.
function animMagicDust(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  // Re-frame: shift the action left & up so it's centred, not crammed upper-right.
  ctx.translate(-6.0, -3.2);

  // The pouch is ALWAYS alive: a continuous gentle bob + a breathing belly
  // squash (period 2.0s) so the body itself moves, not just an overlay. The pour
  // beat is now a secondary accent on top of that.
  const bob = breathe(t, 2.0, 1.3, 0); // vertical float, loops
  const breathS = breathe(t, 2.0, 0.04, 0, 0.1); // belly inflate/deflate

  // Pour beat: rest, then tip to pour, recover. `beat` gates the dust STREAM so
  // the spill only flows on the pour; the body keeps bobbing the whole time.
  const pour = beat(t, 4.0, 0.55); // 0 at rest, 0→1→0 while pouring
  const tip = pour * 0.42; // radians the pouch rotates to pour
  const squash = 1 + pour * 0.08 + breathS; // pour bulge + continuous breath

  // Glow: a single periodic driver tied to the bob period so it RETURNS to its
  // frame-1 value each loop (no endless swell), with a small flare while pouring.
  const glowPulse = clamp01(0.46 + Math.sin((t / 2.0) * TAU) * 0.1 + pour * 0.16);

  groundShadow(ctx, 2, 23, 13, 3.5, bob, 0.25);

  const glow = ctx.createRadialGradient(8, 2, 2, 8, 2, 22);
  glow.addColorStop(0, `rgba(255,220,120,${glowPulse})`);
  glow.addColorStop(0.6, "rgba(255,200,80,0.16)");
  glow.addColorStop(1, "rgba(255,200,80,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(8, 2, 22, 0, TAU);
  ctx.fill();

  // Bob the whole pouch, then tip + squash about its lower body (~(-3, 16)) so
  // the mouth swings toward the spill during a pour.
  ctx.save();
  ctx.translate(0, bob);
  ctx.translate(-3, 16);
  ctx.rotate(tip);
  ctx.scale(squash, 2 - squash);
  ctx.translate(3, -16);

  // Pouch body
  const pouch = ctx.createRadialGradient(-6, 6, 2, -3, 10, 18);
  pouch.addColorStop(0, "#9a7a4a");
  pouch.addColorStop(0.6, "#6a4e26");
  pouch.addColorStop(1, "#3e2c12");
  ctx.fillStyle = pouch;
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.bezierCurveTo(-16, 2, -14, 20, -3, 21);
  ctx.bezierCurveTo(8, 22, 12, 10, 6, 0);
  ctx.bezierCurveTo(2, -5, -4, -7, -9, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#241808";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cloth folds
  ctx.strokeStyle = "rgba(40,28,12,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.quadraticCurveTo(-9, 12, -3, 19);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.quadraticCurveTo(5, 12, 2, 19);
  ctx.stroke();

  // Cloth highlight
  ctx.fillStyle = "rgba(255,235,180,0.25)";
  ctx.beginPath();
  ctx.ellipse(-7, 6, 2, 7, -0.3, 0, TAU);
  ctx.fill();

  // Drawstring tie + mouth
  ctx.strokeStyle = "#caa24a";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-9, -5);
  ctx.quadraticCurveTo(-1, -8, 6, -1);
  ctx.stroke();
  ctx.fillStyle = "#caa24a";
  ctx.beginPath();
  ctx.arc(-2, -6, 2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a5a10";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore(); // end pouch tip/squash

  // DUST STREAM: a falling arc of motes from the mouth (~(6,-1)) outward and
  // down. Each mote rides its own loopPhase along the arc; the stream only flows
  // while pouring (amount = pour), so at rest the pouch is closed and quiet.
  const sx0 = 6;
  const sy0 = -1;
  const streamN = 16;
  for (let i = 0; i < streamN; i++) {
    const ph = loopPhase(t, 0.9, (i / streamN) % 1);
    const flow = clamp01(pour * 1.4 - ph * 0.15); // head of stream leads
    if (flow <= 0.02) continue;
    // Arc: launches up-right out of the mouth, then falls.
    const dx = sx0 + ph * 12;
    const dy = sy0 - 4 * ph + ph * ph * 16; // up then down (gravity)
    const wob = Math.sin(ph * 7 + i) * 1.4;
    const r = (0.6 + (1 - ph) * 1.0) * (0.6 + flow * 0.6);
    ctx.fillStyle = `rgba(255,225,130,${clamp01((0.4 + (1 - ph) * 0.5) * flow)})`;
    ctx.beginPath();
    ctx.arc(dx + wob * 0.4, dy, r, 0, TAU);
    ctx.fill();
  }

  // Dust motes CONTINUOUSLY lifting out of the mouth (ambient, always present
  // even at rest) — this is the always-on "magic dust" life, drifting up and
  // fading, so the pouch reads as active without depending on the pour beat.
  for (let i = 0; i < 7; i++) {
    const ph = loopPhase(t, 2.2, (i * 0.37) % 1);
    const mx = 3 + (i % 3 - 1) * 2.2 + Math.sin(ph * 5 + i) * 3 + bob * 0.3;
    const my = -3 + bob - ph * 15;
    const ma = Math.max(0, Math.sin(ph * Math.PI)) * 0.8;
    if (ma <= 0.02) continue;
    ctx.fillStyle = `rgba(255,236,156,${ma})`;
    ctx.beginPath();
    ctx.arc(mx, my, 0.7 + (1 - ph) * 0.7, 0, TAU);
    ctx.fill();
  }

  // Sparkles popping along the stream + settling in the spill — staggered beats
  // synced to the pour so they fire as dust lands.
  const sparkSpots: Array<[number, number, number]> = [
    [10, 2, 0.0],
    [14, 7, 0.25],
    [17, 11, 0.5],
    [7, -8, 0.7],
  ];
  sparkSpots.forEach(([px, py, off]) => {
    const b = beat(t, 4.0, 0.16, (0.45 + off) % 1) * clamp01(pour * 2);
    const idle = pingPong(t, 3.0, off) * 0.3; // a faint always-on glimmer
    const a = Math.max(b, idle * 0.5);
    if (a > 0.02) sparkle(ctx, px, py, 1.6 + b * 1.0, a, "255,246,200");
  });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// arcane_pentacle — was a rigid 360° hubcap spin of a 5-fold-symmetric sigil
// (so it just looked like a wheel). Rebuilt as a RITUAL: the rings COUNTER-ROTATE
// in gentle opposed oscillations (no full turn), the pentagram DRAWS ON point by
// point each cycle, and the five points IGNITE in sequence with sparks, finishing
// in a whole-sigil pulse before fading to re-draw. Framing was already centred.
function animPentacle(ctx: CanvasRenderingContext2D, t: number): void {
  const glowPulse = 0.4 + Math.sin((t / 3.0) * TAU) * 0.12;

  // Opposed gentle oscillations — the "counter-rotate" without a hubcap spin.
  const outerRot = Math.sin((t / 4.0) * TAU) * 0.14;
  const innerRot = -Math.sin((t / 3.2) * TAU) * 0.18;

  // Ritual cycle (a TRUE loop, not a one-shot): the pentagram INSCRIBES over the
  // first ~45%, HOLDS fully drawn + pulsing through the middle, then UN-INSCRIBES
  // back to an empty disc over the last ~22% — so drawProg returns to 0 at the
  // wrap and the bright completed frame never hard-cuts to a blank first frame.
  const cycle = loopPhase(t, 5.0);
  const drawProg = (() => {
    if (cycle < 0.45) return easeInOutSine(cycle / 0.45); // inscribe 0→1
    if (cycle < 0.78) return 1; // hold fully drawn
    return easeInOutSine(1 - (cycle - 0.78) / 0.22); // un-inscribe 1→0
  })();
  const holdPulse = beat(t, 5.0, 0.22, 0.5); // a bright pulse during the hold

  // Outer ambient glow (pulsing, flares on the ritual pulse)
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
  glow.addColorStop(0, `rgba(150,110,255,${clamp01(glowPulse + holdPulse * 0.3)})`);
  glow.addColorStop(0.6, "rgba(120,90,240,0.18)");
  glow.addColorStop(1, "rgba(120,90,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, TAU);
  ctx.fill();

  const litCol = (a: number): string => `rgba(185,160,255,${clamp01(a)})`;

  // Outer ring — counter-rotating, drawn as a sweep that grows with the ritual
  // so it "inscribes" rather than just sitting there.
  ctx.save();
  ctx.rotate(outerRot);
  ctx.strokeStyle = litCol(0.75 + holdPulse * 0.25);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + TAU * drawProg);
  ctx.stroke();
  // Rune ticks between the rings appear with the draw.
  ctx.strokeStyle = litCol(0.6 + holdPulse * 0.3);
  ctx.lineWidth = 1;
  const ticks = Math.floor(12 * drawProg + 0.001);
  for (let i = 0; i < ticks; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 14.5, Math.sin(a) * 14.5);
    ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
    ctx.stroke();
  }
  ctx.restore();

  // Inner ring — counter-rotates the other way.
  ctx.save();
  ctx.rotate(innerRot);
  ctx.strokeStyle = litCol(0.7 + holdPulse * 0.25);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 14.5, Math.PI / 2, Math.PI / 2 + TAU * drawProg);
  ctx.stroke();
  ctx.restore();

  // Pentagram — DRAWN ON: the 5-stroke path (order 0,2,4,1,3,close) appears edge
  // by edge as `drawProg` advances, instead of the whole star spinning.
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * TAU;
    pts.push([Math.cos(a) * 13, Math.sin(a) * 13]);
  }
  const order = [0, 2, 4, 1, 3, 0]; // 5 edges, closing back to start
  const edges = 5;
  const drawn = drawProg * edges; // how many edges are visible
  ctx.strokeStyle = litCol(0.85 + holdPulse * 0.15);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let e = 0; e < edges; e++) {
    const seg = clamp01(drawn - e);
    if (seg <= 0) break;
    const [ax, ay] = pts[order[e]];
    const [bx, by] = pts[order[e + 1]];
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(lerp(ax, bx, seg), lerp(ay, by, seg));
    ctx.stroke();
  }

  // Faint inner fill — fades in only once the star is essentially complete.
  if (drawProg > 0.92) {
    const fillA = (drawProg - 0.92) / 0.08;
    ctx.beginPath();
    for (let k = 0; k <= edges; k++) {
      const [px, py] = pts[order[k]];
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(150,120,255,${clamp01(0.12 * fillA + holdPulse * 0.1)})`;
    ctx.fill();
  }

  // Sequential point-ignite: each star point catches in turn as the draw reaches
  // it, then all five flare together on the hold pulse.
  for (let i = 0; i < 5; i++) {
    const [px, py] = pts[i];
    // Which draw-fraction this point gets reached at (points are hit in `order`).
    const orderIndex = order.indexOf(i);
    const reachAt = orderIndex / edges;
    const local = clamp01((drawProg - reachAt) * 6); // fast catch when reached
    const ignite = beat(t, 5.0, 0.08, (reachAt * 0.55) % 1); // spark at the moment
    const a = 0.3 * local + 0.6 * ignite + holdPulse * 0.6;
    if (a > 0.02) sparkle(ctx, px, py, 1.4 + ignite * 1.1 + holdPulse * 0.6, a, "230,220,255");
  }

  // Orbiting sparks circling the sigil — gentle opposed drift (not a rigid spin),
  // present once the ritual has mostly drawn.
  for (let i = 0; i < 5; i++) {
    const a = -pingPong(t, 8.0) * 1.2 + (i / 5) * TAU;
    const orbitR = 20 + Math.sin((t / 1.7) * TAU + i) * 1.5;
    const ox = Math.cos(a) * orbitR;
    const oy = Math.sin(a) * orbitR;
    const tw = (0.4 + 0.4 * Math.sin((t / 2.5) * TAU + i * 2.0)) * clamp01(drawProg * 1.5);
    if (tw > 0.02) {
      ctx.fillStyle = `rgba(200,180,255,${clamp01(0.8 * tw)})`;
      ctx.beginPath();
      ctx.arc(ox, oy, 0.8 + tw * 0.6, 0, TAU);
      ctx.fill();
    }
  }
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  arcane_candle: animCandle,
  arcane_potion_red: animPotionRed,
  arcane_potion_blue: animPotionBlue,
  arcane_crystal_ball: animCrystalBall,
  arcane_runestone: animRunestone,
  arcane_magic_dust: animMagicDust,
  arcane_pentacle: animPentacle,
};
