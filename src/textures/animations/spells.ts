// Animated spell icons — same glow-disc look as src/textures/categories/spells.ts,
// but alive. Each fn redraws the WHOLE icon at time `t` (seconds). The caller
// handles clear/save/translate-to-centre/scale/lineCap/lineJoin/restore; draw at
// origin within a ~-24..+24 box.
//
// The motion is rebuilt to lead with real shape life rather than a frozen body
// under a sliding light: the fireball breathes/flares asymmetrically and streams
// its tail as a traveling wave; the ice facets shimmer-sweep and recrystallize on
// a beat; the bolt periodically DISCHARGES along a freshly-jagged (but
// deterministic) path; heal is a scale heartbeat that emits motes per lub-dub;
// the shield membrane breathes and takes periodic impact ripples; poison sloshes
// with surface tension and sheds a gravity-accelerated drip; wind is replaced by
// L→R traveling gust streaks + tumbling leaves (no whole-sprite rotation); the
// arcane missile drives a propulsion squash-stretch with an eased ring overshoot.
//
// Pure & deterministic from `t` and indices only — NO Math.random, NO Date.
// Loops tile seamlessly via the shared phase/wave helpers.

import {
  TAU,
  clamp01,
  lerp,
  loopPhase,
  pingPong,
  breathe,
  beat,
  easeInOutSine,
  easeOutCubic,
  easeOutBack,
  easeOutElastic,
  glint,
  sparkle,
} from "./_anim.js";

// A tiny deterministic hash → 0..1, so a "re-randomized" jag is reproducible
// from a cycle INDEX (never Math.random). Cheap fract(sin) noise.
function hash01(n: number): number {
  const s = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return s - Math.floor(s);
}

// ---------------------------------------------------------------------------
// spell_fireball — recoloured to a saturated orange/red (the old tail/glow read
// muddy brown). The orb BREATHES ASYMMETRICALLY (taller-then-wider, off-centre
// so it never reads as a rigid circle) and FLARES on a slow beat. The tail
// streams as a traveling wave (phase scrolls up-left), the tongues lick on their
// own offsets, embers rise and fade. Grounded glow → no shadow.
function animFireball(ctx: CanvasRenderingContext2D, t: number): void {
  // Two incommensurate breaths give a living, non-metronomic flicker.
  const breath = breathe(t, 1.05, 1, 0); // -1..1 slow
  const flick = 0.5 + 0.5 * Math.sin(t * 7.3); // 0..1 fast
  const flare = beat(t, 3.4, 0.4); // periodic surge 0..1
  // Asymmetric scale: width and height breathe out of phase → it pulses like
  // combustion, not a balloon.
  const sx = 1 + breath * 0.06 + flare * 0.1;
  const sy = 1 - breath * 0.05 + flare * 0.14;

  // Outer heat glow (breathes with the flare). Warmer, more saturated stops.
  const gR = 24 + flare * 3 + breath * 1.5;
  const glow = ctx.createRadialGradient(2, 2, 2, 2, 2, gR);
  glow.addColorStop(0, `rgba(255,176,72,${0.62 + flare * 0.22})`);
  glow.addColorStop(0.5, "rgba(255,96,24,0.3)");
  glow.addColorStop(1, "rgba(255,64,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(2, 2, gR, 0, TAU);
  ctx.fill();

  // Flaming tail streaming up-left as a TRAVELING WAVE — the control points
  // scroll along a sine so the flame appears to flow off the orb, not wag rigidly.
  const wavePh = loopPhase(t, 0.9) * TAU;
  const tw1 = Math.sin(wavePh) * 2.4;
  const tw2 = Math.sin(wavePh - 1.1) * 2.4;
  ctx.save();
  ctx.fillStyle = "rgba(255,122,30,0.6)";
  ctx.beginPath();
  ctx.moveTo(-2, -10);
  ctx.quadraticCurveTo(-18, -16 + tw1, -22, -8 + tw2);
  ctx.quadraticCurveTo(-12, -10 + tw2 * 0.5, -6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,196,86,0.52)";
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.quadraticCurveTo(-22, 2 - tw2, -24, 10 - tw1);
  ctx.quadraticCurveTo(-14, 6 - tw1 * 0.5, -6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Licking flame tongues — each licks upward on its own phase (overlap), height
  // pumping with the global flare.
  ctx.fillStyle = "#ff8a26";
  const tongues: Array<[number, number, number, number]> = [
    [-6, -14, -0.4, 0],
    [6, -14, 0.3, 1],
    [13, -4, 0.9, 2],
    [11, 8, 1.6, 3],
    [-11, 6, -1.6, 4],
  ];
  tongues.forEach(([tx, ty, lean, i]) => {
    const lick = Math.sin(t * 8.5 + i * 1.7) * 0.32;
    const len = 8 + Math.sin(t * 10 + i) * 2 + flare * 3;
    const l = lean + lick;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(l) * len,
      ty + Math.sin(l) * len - 6 - lick * 4,
      tx + Math.cos(l) * 4,
      ty + Math.sin(l) * 4 + 6,
    );
    ctx.quadraticCurveTo(tx - 3, ty + 2, tx, ty);
    ctx.closePath();
    ctx.fill();
  });

  // The orb itself — asymmetric breathe about its own centre (2,2). The fill is
  // re-saturated (deeper, redder base instead of muddy brown).
  ctx.save();
  ctx.translate(2, 2);
  ctx.scale(sx, sy);
  ctx.translate(-2, -2);

  const oR = 13;
  const body = ctx.createRadialGradient(-3, -4, 2, 2, 2, 15);
  body.addColorStop(0, "#fff7cc");
  body.addColorStop(0.35, "#ffd040");
  body.addColorStop(0.7, "#ff6418");
  body.addColorStop(1, "#b41a04");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(2, 2, oR, 0, TAU);
  ctx.fill();

  // Bright inner core (flares with the surge).
  const core = ctx.createRadialGradient(-2, -3, 1, -1, -2, 8 + flare * 2);
  core.addColorStop(0, `rgba(255,255,242,${0.85 + flare * 0.15})`);
  core.addColorStop(0.6, "rgba(255,224,128,0.5)");
  core.addColorStop(1, "rgba(255,184,64,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(-1, -2, 8 + flare * 2, 0, TAU);
  ctx.fill();

  // Swirling heat curls inside (clipped) — rotate slowly so the orb churns.
  ctx.save();
  ctx.beginPath();
  ctx.arc(2, 2, oR, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = `rgba(255,128,24,${0.42 + flick * 0.3})`;
  ctx.lineWidth = 1.4;
  const sw = t * 1.5;
  ctx.beginPath();
  ctx.arc(4, 6, 6, sw + Math.PI * 0.2, sw + Math.PI * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-2, 4, 3, -sw + Math.PI * 1.1, -sw + Math.PI * 2.2);
  ctx.stroke();
  // Demoted feathered sheen on the orb (warm), travelling slowly.
  glint(ctx, loopPhase(t, 2.9), { span: 12, width: 6, intensity: 0.24, length: 34, warm: true });
  ctx.restore();
  ctx.restore();

  // Rising / fading ember sparks (outside the squash so they don't smear).
  ctx.fillStyle = "#ffdc82";
  const embers: Array<[number, number, number]> = [
    [15, -10, 0],
    [12, -14, 1],
    [18, -2, 2],
    [-14, -10, 3],
    [16, 12, 4],
    [-9, 12, 5],
  ];
  embers.forEach(([ex, baseY, i]) => {
    const ph = loopPhase(t, 1.43, i / embers.length);
    const rise = ph * 22;
    const ey = baseY + 12 - rise;
    const a = Math.sin(ph * Math.PI) * 0.9;
    const r = 1 + i * 0.12;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(ex + Math.sin(t * 3 + i) * 2, ey, r, 0, TAU);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// spell_ice_shard — the crystals are no longer 100% static: a SHIMMER-SWEEP
// crosses the facets (a clipped highlight travels per shard), a RECRYSTALLIZE pop
// scales the whole cluster up with an elastic settle on a beat, and a FROST BURST
// of sparkles fires with the pop. The old hard center "zipper" line is replaced
// by an off-axis facet edge that fades with the sweep.
function animIceShard(ctx: CanvasRenderingContext2D, t: number): void {
  const shimmer = pingPong(t, 2.6); // 0..1 travelling sweep position
  const pop = beat(t, 4.2, 0.34); // recrystallize surge 0..1
  const popScale = 1 + easeOutElastic(pop) * 0.06 - pop * 0.02; // springy grow

  // Frosty glow (brightens on the pop).
  const gR = 24 + pop * 2;
  const glow = ctx.createRadialGradient(0, 2, 2, 0, 2, gR);
  glow.addColorStop(0, `rgba(150,225,255,${0.45 + pop * 0.3})`);
  glow.addColorStop(0.55, "rgba(90,180,255,0.24)");
  glow.addColorStop(1, "rgba(90,180,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 2, gR, 0, TAU);
  ctx.fill();

  const shardPath = (cx: number, topY: number, w: number, botY: number): void => {
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx + w, topY + (botY - topY) * 0.32);
    ctx.lineTo(cx + w * 0.45, botY);
    ctx.lineTo(cx - w * 0.45, botY);
    ctx.lineTo(cx - w, topY + (botY - topY) * 0.32);
    ctx.closePath();
  };
  const makeGrad = (cx: number, topY: number, botY: number): CanvasGradient => {
    const g = ctx.createLinearGradient(cx - 6, topY, cx + 6, botY);
    g.addColorStop(0, "#f0fbff");
    g.addColorStop(0.45, "#a8e2ff");
    g.addColorStop(1, "#3a86c8");
    return g;
  };

  // Each crystal: fill, stroke, then a per-facet shimmer-sweep clipped to it so
  // the light reads as travelling THROUGH the ice (the life the note asks for).
  const drawShard = (
    cx: number,
    topY: number,
    w: number,
    botY: number,
    edge: string,
    edgeW: number,
    sweepOffset: number,
  ): void => {
    ctx.fillStyle = makeGrad(cx, topY, botY);
    shardPath(cx, topY, w, botY);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = edgeW;
    shardPath(cx, topY, w, botY);
    ctx.stroke();
    // Shimmer band sweeping down the facet (clipped tightly to the shard).
    ctx.save();
    shardPath(cx, topY, w, botY);
    ctx.clip();
    const sweepY = lerp(topY - 4, botY + 4, clamp01(shimmer + sweepOffset) % 1);
    const band = ctx.createLinearGradient(cx, sweepY - 7, cx, sweepY + 7);
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.5, `rgba(255,255,255,${0.32 + pop * 0.3})`);
    band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.fillRect(cx - w - 2, sweepY - 7, (w + 2) * 2, 14);
    ctx.restore();
  };

  // Recrystallize: scale the whole cluster about its base.
  ctx.save();
  ctx.translate(0, 18);
  ctx.scale(popScale, popScale);
  ctx.translate(0, -18);

  drawShard(-9, -2, 5, 18, "#2a6aa0", 1.2, 0.33);
  drawShard(10, 0, 5, 20, "#2a6aa0", 1.2, 0.66);
  drawShard(0, -18, 7, 22, "#27608f", 1.6, 0.0);

  // Facet edge highlight — OFF the centre axis (kills the hard "zipper") and
  // fades in/out with the sweep so it reads as a glinting edge, not a seam.
  const edgeA = 0.3 + shimmer * 0.5;
  ctx.strokeStyle = `rgba(255,255,255,${edgeA})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2.5, -15);
  ctx.lineTo(-1, 0);
  ctx.lineTo(-2.5, 19);
  ctx.stroke();
  // A second, lighter facet to give the crystal volume (replaces the symmetric V).
  ctx.strokeStyle = `rgba(220,245,255,${0.28 + (1 - shimmer) * 0.35})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(3, 4);
  ctx.lineTo(1, -13);
  ctx.lineTo(-3, 4);
  ctx.stroke();
  ctx.restore();

  // Frost burst — clean sparkles that PING with the recrystallize pop, plus a low
  // idle twinkle so it's never fully dead between pops.
  const burst: Array<[number, number, number, number]> = [
    [-10, -8, 2.4, 0.0],
    [11, -6, 2.0, 0.18],
    [5, 14, 1.7, 0.42],
    [-7, 12, 1.6, 0.6],
    [8, 4, 1.4, 0.8],
    [-3, -3, 1.3, 0.35],
  ];
  burst.forEach(([sx, sy, s, off]) => {
    const idle = 0.18 * (0.5 + 0.5 * Math.sin(t * 3.4 + off * 9));
    const burstA = pop * Math.sin(clamp01((pop + off) % 1) * Math.PI);
    const a = idle + burstA * 0.7;
    const r = s * (0.7 + a);
    sparkle(ctx, sx, sy, r, a, "232,250,255");
  });
}

// ---------------------------------------------------------------------------
// spell_lightning — was a lit decal: the bolt never changed path. Now it
// DISCHARGES periodically (anticipation dim → snap-bright → afterglow) and the
// jag is RE-RANDOMIZED-LOOKING each cycle, derived deterministically from the
// integer cycle index (hash01), never Math.random. The white-core registration
// bug (scale 0.7 left-shifted it) is fixed by scaling about the bolt's own x.
function animLightning(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 1.9;
  const ph = loopPhase(t, period); // 0..1 within a discharge cycle
  const cycle = Math.floor(t / period); // which strike → re-rolls the jag

  // Discharge envelope: dim wind-up, instantaneous snap, exponential afterglow.
  let energy: number;
  if (ph < 0.12) {
    energy = 0.12 + easeInOutSine(ph / 0.12) * 0.18; // anticipation flicker
  } else if (ph < 0.2) {
    energy = 1; // the snap — full brightness
  } else {
    energy = Math.exp(-(ph - 0.2) * 4.5) * 0.9 + 0.08; // afterglow + idle floor
  }
  const bright = 0.3 + energy * 0.7;

  // Build a jagged path from a fixed spine, perturbed by per-segment deterministic
  // offsets that change with `cycle` → each strike LOOKS freshly forked. A small
  // settle of the perturbation right after the snap reads as the arc steadying.
  const spine: Array<[number, number]> = [
    [4, -22],
    [-6, -4],
    [2, -2],
    [-8, 22],
    [8, -4],
    [0, -6],
    [10, -22],
  ];
  const settle = ph < 0.2 ? 1 : easeOutCubic((ph - 0.2) / 0.3) * 0.4 + 0.6;
  const jag = (x: number, y: number, i: number): [number, number] => {
    const jx = (hash01(cycle * 7.1 + i * 2.3) - 0.5) * 5 * settle;
    const jy = (hash01(cycle * 3.7 + i * 5.9) - 0.5) * 3.5 * settle;
    return [x + jx, y + jy];
  };
  const jagged: Array<[number, number]> = spine.map(([x, y], i) => jag(x, y, i));

  const bolt = (pts: Array<[number, number]>): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  };

  // Electric glow bursts with the discharge.
  const gR = 22 + energy * 5;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, gR);
  glow.addColorStop(0, `rgba(160,215,255,${0.36 + energy * 0.44})`);
  glow.addColorStop(0.5, "rgba(80,140,255,0.26)");
  glow.addColorStop(1, "rgba(60,120,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, gR, 0, TAU);
  ctx.fill();

  // Wide blue base.
  ctx.fillStyle = "#3a86ff";
  bolt(jagged);
  ctx.fill();

  // Bright white-blue core — narrowed by scaling about its OWN centroid x (≈1)
  // instead of x=0, so it no longer shifts left off the base.
  ctx.save();
  ctx.globalAlpha = bright;
  const cxBolt = 1; // mean x of the bolt path
  ctx.translate(cxBolt, 0);
  ctx.scale(0.62, 1);
  ctx.translate(-cxBolt, 0);
  const core = ctx.createLinearGradient(-8, -22, 8, 22);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.5, "#cfe6ff");
  core.addColorStop(1, "#9ec8ff");
  ctx.fillStyle = core;
  bolt(jagged);
  ctx.fill();
  ctx.restore();

  // Slim bright centreline tracing the jag (follows the re-rolled path).
  ctx.strokeStyle = `rgba(255,255,255,${0.55 + energy * 0.45})`;
  ctx.lineWidth = 1.8 + energy * 0.8;
  ctx.beginPath();
  ctx.moveTo(jagged[0][0], jagged[0][1]);
  ctx.lineTo(jagged[1][0], jagged[1][1]);
  ctx.lineTo(jagged[2][0], jagged[2][1]);
  ctx.lineTo(jagged[3][0], jagged[3][1]);
  ctx.stroke();

  // Crackling forks branching off mid-joints — their reach scales with energy and
  // their direction re-rolls per cycle (so the forks dance, not jitter in place).
  ctx.strokeStyle = `rgba(180,220,255,${0.4 + energy * 0.5})`;
  ctx.lineWidth = 1.4;
  const forks: Array<[number, number, number]> = [
    [jagged[1][0], jagged[1][1], 11],
    [jagged[2][0], jagged[2][1], 13],
    [jagged[0][0], jagged[0][1], 17],
  ];
  ctx.beginPath();
  forks.forEach(([fx, fy, seed]) => {
    const ang = hash01(cycle * 4.3 + seed) * TAU;
    const reach = (3 + energy * 5) * (0.6 + hash01(cycle + seed) * 0.6);
    const ex = fx + Math.cos(ang) * reach;
    const ey = fy + Math.sin(ang) * reach * 0.7;
    const bx = ex + Math.cos(ang + 1.8) * reach * 0.4;
    const by = ey + Math.sin(ang + 1.8) * reach * 0.4;
    ctx.moveTo(fx, fy);
    ctx.lineTo(ex, ey);
    ctx.lineTo(bx, by);
  });
  ctx.stroke();

  // Spark sparkles at the bolt ends — pop with the discharge (clean stars, not a
  // lollipop dot).
  const endA = energy;
  sparkle(ctx, jagged[0][0], jagged[0][1], 1.4 + endA * 1.2, 0.3 + endA * 0.6, "220,240,255");
  sparkle(ctx, jagged[3][0], jagged[3][1], 1.4 + endA * 1.2, 0.3 + endA * 0.6, "220,240,255");
}

// ---------------------------------------------------------------------------
// spell_heal — the cross now BREATHES with a heartbeat SCALE (a lub-dub: two
// quick beats then a rest), not just an alpha throb. On each lub-dub it emits a
// burst of motes that rise and fade. Grounded glow → no shadow.
function animHeal(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 2.2;
  const ph = loopPhase(t, period);
  // Lub-dub: a strong beat then a softer second beat, then rest.
  const lub = beat(t, period, 0.12, 0.0);
  const dub = beat(t, period, 0.12, 0.18) * 0.6;
  const heart = lub + dub; // 0..~1 heartbeat envelope
  const scale = 1 + heart * 0.1; // SCALE pulse (the real deformation)
  const breath = 0.5 + 0.5 * Math.sin(t * 1.7); // slow glow shimmer

  // Healing aura (swells on each beat).
  const gR = 24 + heart * 3 + breath * 1;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, gR);
  glow.addColorStop(0, `rgba(150,255,170,${0.5 + heart * 0.3})`);
  glow.addColorStop(0.5, "rgba(70,210,110,0.26)");
  glow.addColorStop(1, "rgba(50,200,90,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, gR, 0, TAU);
  ctx.fill();

  const arm = 14;
  const half = 5;
  const plus = (): void => {
    ctx.beginPath();
    ctx.roundRect(-half, -arm, half * 2, arm * 2, 3);
    ctx.roundRect(-arm, -half, arm * 2, half * 2, 3);
  };

  // The cross — scaled by the heartbeat about its centre.
  ctx.save();
  ctx.scale(scale, scale);

  const body = ctx.createLinearGradient(-arm, -arm, arm, arm);
  body.addColorStop(0, "#bdffcf");
  body.addColorStop(0.5, "#46d878");
  body.addColorStop(1, "#1f9a4a");
  ctx.fillStyle = body;
  plus();
  ctx.fill();
  ctx.strokeStyle = "#147a38";
  ctx.lineWidth = 1.6;
  plus();
  ctx.stroke();

  // Inner highlight — brightens on the beat.
  ctx.fillStyle = `rgba(255,255,255,${0.4 + heart * 0.4})`;
  ctx.beginPath();
  ctx.roundRect(-2, -arm + 2, 4, arm * 2 - 4, 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.2 + heart * 0.2})`;
  ctx.beginPath();
  ctx.roundRect(-arm + 2, -2, arm * 2 - 4, 4, 2);
  ctx.fill();
  ctx.restore();

  // Motes — released in a burst at each lub. Their life clock is tied to the beat
  // index so they spawn from the cross and float up (clean 4-point sparkles).
  const motes: Array<[number, number]> = [
    [-14, 0.05],
    [15, 0.32],
    [9, 0.55],
    [-18, 0.78],
    [12, 0.2],
    [-7, 0.62],
  ];
  motes.forEach(([mx, off], i) => {
    const mph = (ph + off) % 1; // staggered life
    const rise = easeOutCubic(mph);
    const my = 12 - rise * 30;
    // Gate emission to the early (beat) part of the life so motes pulse out with
    // the heartbeat rather than streaming continuously.
    const a = Math.sin(mph * Math.PI) * (mph < 0.6 ? 1 : 0.5) * 0.85;
    const drift = Math.sin(t * 2 + i * 1.3) * 2;
    sparkle(ctx, mx * (0.5 + rise * 0.5) + drift, my, 1.3 + a, a, "234,255,240");
  });
}

// ---------------------------------------------------------------------------
// spell_shield_bubble — the cleanest craft, kept; the dome now DEFORMS. It
// breathes (a gentle non-uniform scale, wider-then-taller), and takes a periodic
// IMPACT RIPPLE: a struck point squashes inward and a ring of disturbance races
// across the membrane. The hex shimmer + orbiting highlight are kept as accents.
function animShieldBubble(ctx: CanvasRenderingContext2D, t: number): void {
  const R = 18;
  const breath = breathe(t, 2.4, 1, 0); // -1..1 membrane breath
  const sx = 1 + breath * 0.05;
  const sy = 1 - breath * 0.04;
  const shimmer = 0.5 + 0.5 * Math.sin(t * 6);

  // Periodic impact: a beat fires, defining a struck point on the rim and a ripple
  // that expands from it. Deterministic strike angle per cycle index.
  const impactPeriod = 3.6;
  const impact = beat(t, impactPeriod, 0.45);
  const impactCycle = Math.floor(t / impactPeriod);
  const strikeAng = hash01(impactCycle * 2.7) * TAU;
  const px0 = Math.cos(strikeAng) * R;
  const py0 = Math.sin(strikeAng) * R;
  // Inward dent at the struck point (squash), springing back.
  const dent = easeOutBack(impact, 2.0) * 2.4;

  // Outer rim glow (pulses; flares on impact).
  const rimPulse = 0.5 + 0.5 * Math.sin(t * 3);
  const glow = ctx.createRadialGradient(0, 0, R - 4, 0, 0, R + 7 + rimPulse * 2 + impact * 3);
  glow.addColorStop(0, "rgba(120,200,255,0)");
  glow.addColorStop(0.7, `rgba(120,200,255,${0.25 + rimPulse * 0.22 + impact * 0.2})`);
  glow.addColorStop(1, "rgba(80,160,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, R + 7 + rimPulse * 2 + impact * 3, 0, TAU);
  ctx.fill();

  // The membrane breathes (non-uniform scale about centre); a dent is applied by
  // nudging the whole dome slightly off the struck point.
  ctx.save();
  ctx.translate(-Math.cos(strikeAng) * dent * 0.4, -Math.sin(strikeAng) * dent * 0.4);
  ctx.scale(sx, sy);

  // Translucent dome fill.
  const dome = ctx.createRadialGradient(-5, -6, 2, 0, 0, R);
  dome.addColorStop(0, "rgba(220,245,255,0.45)");
  dome.addColorStop(0.6, "rgba(120,190,255,0.22)");
  dome.addColorStop(1, "rgba(70,150,255,0.32)");
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();

  // Hex pattern (clipped) — shimmer in opacity; brightens along the ripple front.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = `rgba(150,210,255,${0.35 + shimmer * 0.35})`;
  ctx.lineWidth = 1;
  const hexR = 5;
  const hexW = hexR * Math.sqrt(3);
  // Ripple radius expands from the struck point across the dome during the impact.
  const rippleR = impact > 0 ? easeOutCubic(impact) * (R * 2) : -1;
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const hx = col * hexW + (row % 2 ? hexW / 2 : 0);
      const hy = row * hexR * 1.5;
      const local = Math.sin(t * 5 - (hx + hy) * 0.18) * 0.5 + 0.5;
      let cellA = 0.4 + local * 0.5;
      if (rippleR >= 0) {
        const d = Math.hypot(hx - px0, hy - py0);
        const front = 1 - Math.min(1, Math.abs(d - rippleR) / 6);
        cellA = Math.min(1, cellA + front * impact * 0.9);
      }
      ctx.globalAlpha = cellA;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * TAU;
        const hpx = hx + Math.cos(a) * hexR;
        const hpy = hy + Math.sin(a) * hexR;
        if (i === 0) ctx.moveTo(hpx, hpy);
        else ctx.lineTo(hpx, hpy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // Sweeping highlight orbiting the rim (kept, drive off loopPhase so it tiles).
  const sweepA = loopPhase(t, 3.9) * TAU;
  const ssx = Math.cos(sweepA) * (R - 2);
  const ssy = Math.sin(sweepA) * (R - 2);
  const sweep = ctx.createRadialGradient(ssx, ssy, 0, ssx, ssy, 10);
  sweep.addColorStop(0, "rgba(255,255,255,0.55)");
  sweep.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sweep;
  ctx.beginPath();
  ctx.arc(ssx, ssy, 10, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Rim ring (bright). On impact a flattened dent shows where it was struck: draw
  // the ring as two arcs that skip a small indented wedge at the struck angle.
  ctx.strokeStyle = "#bfe6ff";
  ctx.lineWidth = 2.2;
  if (dent > 0.3) {
    const gapHalf = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, R, strikeAng + gapHalf, strikeAng - gapHalf + TAU);
    ctx.stroke();
    // The dented wedge pulled inward.
    ctx.beginPath();
    ctx.arc(-Math.cos(strikeAng) * dent, -Math.sin(strikeAng) * dent, R, strikeAng - gapHalf, strikeAng + gapHalf);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.stroke();
  }

  // Specular highlight arc + glint (static accents).
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, R - 4, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-7, -9, 2.4, 4, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Impact sparks — fire at the struck point when an impact lands (plus a faint
  // idle twinkle on the rim).
  const idleSparks: Array<[number, number, number]> = [
    [13, -12, 0],
    [-15, -8, 1],
    [16, 8, 2],
  ];
  idleSparks.forEach(([spx, spy, i]) => {
    const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 2.1);
    ctx.fillStyle = `rgba(200,235,255,${0.3 + tw * 0.3})`;
    ctx.beginPath();
    ctx.arc(spx, spy, 1 + tw * 0.6, 0, TAU);
    ctx.fill();
  });
  if (impact > 0.05) {
    sparkle(ctx, px0, py0, 2 + impact * 2, impact, "210,238,255");
    sparkle(ctx, px0 * 1.18, py0 * 1.18, 1.4 + impact * 1.4, impact * 0.7, "210,238,255");
  }
}

// ---------------------------------------------------------------------------
// spell_poison — re-centred UP (the blob sat ~6.5u low). The blob now JIGGLES /
// SLOSHES with surface tension (the teardrop's lobes wobble out of phase, a
// non-uniform breath), the inner bubbles rise & pop, and a bigger drip forms,
// detaches, and falls GRAVITY-ACCELERATED (eased-in), then resets.
function animPoison(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -6); // re-frame up (off_y +6.5)

  const slosh = breathe(t, 1.6, 1, 0); // -1..1 surface-tension wobble
  const wob2 = Math.sin(t * 2.7 + 1.0); // a second, faster lobe wobble
  const sx = 1 + slosh * 0.05;
  const sy = 1 - slosh * 0.045;

  const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);

  // Toxic glow.
  const gR = 24 + pulse * 1.5;
  const glow = ctx.createRadialGradient(0, 4, 2, 0, 4, gR);
  glow.addColorStop(0, `rgba(150,255,90,${0.45 + pulse * 0.25})`);
  glow.addColorStop(0.5, "rgba(110,210,40,0.26)");
  glow.addColorStop(1, "rgba(90,180,30,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 4, gR, 0, TAU);
  ctx.fill();

  // The droplet body — its control points are nudged by the slosh so the surface
  // ripples (a living blob with surface tension), wrapped in a gentle squash.
  ctx.save();
  ctx.translate(0, 4);
  ctx.scale(sx, sy);
  ctx.translate(0, -4);

  const w = slosh * 1.6; // left/right wobble of the wide lobes
  const w2 = wob2 * 1.2;
  const drop = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(-3 + w2, -8, -13 - w, -2, -13 - w, 8);
    ctx.bezierCurveTo(-13 - w, 17, -6, 22 + w2 * 0.5, 0, 22);
    ctx.bezierCurveTo(6, 22 - w2 * 0.5, 13 + w, 17, 13 + w, 8);
    ctx.bezierCurveTo(13 + w, -2, 3 - w2, -8, 0, -18);
    ctx.closePath();
  };
  const body = ctx.createRadialGradient(-4, 2, 2, 0, 8, 18);
  body.addColorStop(0, "#d4ff7a");
  body.addColorStop(0.45, "#7ad828");
  body.addColorStop(1, "#2e6a0c");
  ctx.fillStyle = body;
  drop();
  ctx.fill();
  ctx.strokeStyle = "#1c4a08";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Bubbles inside — rise and pop on a loop (clipped to the wobbling blob).
  ctx.save();
  drop();
  ctx.clip();
  const bubbles: Array<[number, number, number]> = [
    [-4, 2.4, 0],
    [4, 1.8, 1],
    [-2, 1.4, 2],
    [5, 1.2, 3],
    [-6, 1.1, 4],
  ];
  bubbles.forEach(([bx, br, i]) => {
    const bph = loopPhase(t, 1.67, i / bubbles.length);
    const by = 20 - bph * 26;
    const grow = bph < 0.85 ? 1 : 1 + (bph - 0.85) * 4;
    const a = bph < 0.85 ? 0.7 : 0.7 * (1 - (bph - 0.85) / 0.15);
    const aa = Math.max(0, a);
    const wx = bx + Math.sin(t * 3 + i) * 1.2 + w * 0.4;
    ctx.globalAlpha = aa;
    ctx.fillStyle = "rgba(210,255,140,1)";
    ctx.beginPath();
    ctx.arc(wx, by, br * grow, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = aa * 0.6;
    ctx.strokeStyle = "rgba(40,90,10,1)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(wx, by, br * grow, 0, TAU);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  // Specular streak (slides a touch with the slosh).
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-5 + w * 0.5, 0, 2.2, 6, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Dripping droplet — forms & swells at the tip, then detaches and falls with
  // GRAVITY (easeInCubic-style acceleration), fading out, then resets.
  const dph = loopPhase(t, 2.3);
  ctx.save();
  if (dph < 0.5) {
    const grow = dph / 0.5;
    const dy = 22 + grow * 4;
    const dh = 9 + grow * 4; // swells bigger than before
    const wIn = 4 + grow * 1.5;
    ctx.fillStyle = "#7ad828";
    ctx.beginPath();
    ctx.moveTo(-1, dy);
    ctx.bezierCurveTo(-wIn, dy + dh * 0.45, -wIn, dy + dh, -1, dy + dh + 1);
    ctx.bezierCurveTo(2 + (wIn - 4), dy + dh, 2 + (wIn - 4), dy + dh * 0.45, -1, dy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1c4a08";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    const f = (dph - 0.5) / 0.5;
    const fall = f * f; // gravity acceleration
    const dy = 26 + fall * 26;
    ctx.globalAlpha = Math.max(0, 1 - f * 0.85);
    ctx.fillStyle = "#7ad828";
    ctx.beginPath();
    // Slightly stretched as it accelerates (motion smear).
    ctx.moveTo(-1, dy);
    ctx.bezierCurveTo(-4, dy + 5, -4, dy + 10 + fall * 3, -1, dy + 11 + fall * 3);
    ctx.bezierCurveTo(2, dy + 10 + fall * 3, 2, dy + 5, -1, dy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1c4a08";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  // Tiny floating toxic motes — bob and twinkle.
  const motes: Array<[number, number, number, number]> = [
    [14, -8, 1.4, 0],
    [-15, -4, 1.2, 1],
    [16, 6, 1.1, 2],
    [-12, 12, 0.9, 3],
  ];
  motes.forEach(([mx, my, mr, i]) => {
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.6);
    ctx.fillStyle = `rgba(170,240,90,${0.5 + tw * 0.4})`;
    ctx.beginPath();
    ctx.arc(mx, my + Math.sin(t * 1.8 + i) * 2, mr * (0.7 + tw * 0.5), 0, TAU);
    ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// spell_wind — THE BRIEF'S #1 NAMED FAILURE. The old version rigidly ROTATED the
// whole glyph (a spinning logo). Replaced entirely: horizontal GUST STREAKS that
// TRAVEL left→right (each streak fades in, sweeps across, fades out, on its own
// phase) with the classic curl hook at the head, plus LEAVES that tumble along on
// the wind (translate L→R + spin about their own centre + a vertical bob). No
// whole-sprite rotation anywhere.
function animWind(ctx: CanvasRenderingContext2D, t: number): void {
  // Soft airy glow (kept; the silhouette/palette stays).
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  glow.addColorStop(0, "rgba(210,245,255,0.45)");
  glow.addColorStop(0.6, "rgba(160,215,235,0.18)");
  glow.addColorStop(1, "rgba(150,210,230,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, TAU);
  ctx.fill();

  ctx.lineCap = "round";

  // Each gust streak: a horizontal curved stroke that travels L→R. The head ends
  // in a small curl (the wind hook). `lane` sets its y, `speed` its period, and
  // alpha eases in over the first part of travel and out at the end so streaks
  // don't pop. Position is driven off loopPhase → seamless.
  const drawGust = (
    laneY: number,
    period: number,
    offset: number,
    width: number,
    col: string,
    curl: boolean,
  ): void => {
    const p = loopPhase(t, period, offset); // 0..1 across the icon
    const headX = lerp(-26, 26, p); // travels left→right
    const len = 16; // streak length
    const tailX = headX - len;
    // Fade in/out at the edges.
    const a = Math.sin(clamp01(p) * Math.PI);
    if (a <= 0.01) return;
    // Gentle vertical undulation so air feels buoyant.
    const yWave = Math.sin(p * Math.PI * 2 + offset * 6) * 2;
    const y = laneY + yWave;

    ctx.strokeStyle = col.replace("ALPHA", (a * 0.95).toFixed(3));
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(tailX, y + 1.5);
    ctx.quadraticCurveTo(headX - len * 0.5, y - 1.5, headX, y);
    if (curl) {
      // A little hook at the leading edge — the signature wind curl.
      ctx.quadraticCurveTo(headX + 5, y - 1, headX + 4, y - 5);
      ctx.quadraticCurveTo(headX + 2.5, y - 8, headX - 1, y - 6);
    }
    ctx.stroke();
  };

  // Three main lanes at different heights/speeds + a faint depth streak.
  drawGust(-10, 1.5, 0.0, 3, "rgba(220,248,255,ALPHA)", true);
  drawGust(2, 1.9, 0.45, 3, "rgba(190,235,250,ALPHA)", true);
  drawGust(13, 1.65, 0.7, 2.4, "rgba(170,225,245,ALPHA)", false);
  drawGust(-3, 2.3, 0.25, 1, "rgba(120,180,210,ALPHA)", false);

  // Tumbling leaves — translate along the wind (L→R) and SPIN about their own
  // centre (this is per-leaf articulation, not a rotation of the whole icon),
  // with a bobbing y. They wrap seamlessly via loopPhase.
  const leaf = (lx: number, ly: number, rot: number, a: number): void => {
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(-4, 0, 4, 0);
    g.addColorStop(0, "#9ed64a");
    g.addColorStop(1, "#4f8a1e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.bezierCurveTo(4, -2, 4, 2, 0, 4);
    ctx.bezierCurveTo(-4, 2, -4, -2, 0, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e5410";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 4);
    ctx.stroke();
    ctx.restore();
  };
  const leaves: Array<[number, number, number]> = [
    // [laneY, period, phaseOffset]
    [-6, 2.6, 0.0],
    [8, 3.1, 0.4],
    [16, 2.9, 0.72],
  ];
  leaves.forEach(([laneY, period, off], i) => {
    const p = loopPhase(t, period, off);
    const lx = lerp(-26, 26, p);
    const ly = laneY + Math.sin(p * Math.PI * 3 + i) * 4; // tumble-bob
    const rot = p * TAU * 2 + i; // spins as it crosses
    const a = Math.sin(clamp01(p) * Math.PI); // fade at the edges
    leaf(lx, ly, rot, a);
  });
}

// ---------------------------------------------------------------------------
// spell_arcane_missile — re-centred (off=(2.7,-2.0)) and given real propulsion.
// The orb does a PROPULSION SQUASH-STRETCH (stretches along travel as it surges,
// squashes on the rebound) on a beat; the orbital ring tilt OVERSHOOTS and settles
// (easeOutBack) instead of a bare sine; the tail streams as a traveling wave;
// orbiting sparks trail it.
function animArcaneMissile(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-2.7, 2.0); // re-frame (off=(2.7,-2.0))

  const period = 2.1;
  // Propulsion surge: a thrust beat → stretch along the up-right travel axis,
  // then a small squash rebound.
  const thrust = beat(t, period, 0.4);
  const surge = easeOutBack(thrust, 1.6); // overshoots → punchy push
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  const flick = 0.5 + 0.5 * Math.sin(t * 11);

  // Travel axis ≈ up-right (orb sits at 4,-2; tail trails down-left). Stretch along
  // it, squash perpendicular.
  const stretch = 1 + surge * 0.14;
  const squash = 1 - surge * 0.1;
  const axis = -Math.PI / 4; // up-right

  // Arcane aura (swells with thrust).
  const gR = 24 + pulse * 2 + thrust * 2;
  const glow = ctx.createRadialGradient(4, -2, 2, 4, -2, gR);
  glow.addColorStop(0, `rgba(200,140,255,${0.55 + thrust * 0.2})`);
  glow.addColorStop(0.5, "rgba(150,80,240,0.3)");
  glow.addColorStop(1, "rgba(130,70,230,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(4, -2, gR, 0, TAU);
  ctx.fill();

  // Streaming energy tail as a TRAVELING WAVE (control points scroll on a sine);
  // it lengthens on the thrust.
  const wavePh = loopPhase(t, 0.85) * TAU;
  const wv = Math.sin(wavePh) * 2.4;
  const wv2 = Math.sin(wavePh - 1.0) * 2.4;
  const ext = 1 + surge * 0.25;
  ctx.save();
  const tail = ctx.createLinearGradient(4, -2, -22, 18);
  tail.addColorStop(0, `rgba(190,120,255,${0.55 + flick * 0.3})`);
  tail.addColorStop(1, "rgba(150,80,240,0)");
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(-2, -6);
  ctx.quadraticCurveTo(-16 + wv, 4, -22 * ext, 18 * ext + wv2);
  ctx.quadraticCurveTo(-10, 10 + wv2 * 0.5, 2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(235,200,255,${0.5 + flick * 0.4})`;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(-12 + wv, 6, -20 * ext, 16 * ext + wv2);
  ctx.stroke();
  ctx.restore();

  // The orb — squash-stretched about its centre (4,-2) along the travel axis.
  // translate to centre → rotate into axis frame → scale → rotate back → undo
  // translate, so the subsequent arc at (4,-2) deforms in place.
  ctx.save();
  ctx.translate(4, -2);
  ctx.rotate(axis);
  ctx.scale(stretch, squash);
  ctx.rotate(-axis);
  ctx.translate(-4, 2);

  const oR = 11;
  const body = ctx.createRadialGradient(0, -6, 2, 4, -2, 13);
  body.addColorStop(0, "#fbeaff");
  body.addColorStop(0.35, "#cf8aff");
  body.addColorStop(0.7, "#8a3ce0");
  body.addColorStop(1, "#42107a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(4, -2, oR, 0, TAU);
  ctx.fill();

  // Bright pulsing core.
  const core = ctx.createRadialGradient(1, -5, 1, 2, -4, 7 + pulse * 2);
  core.addColorStop(0, `rgba(255,255,255,${0.85 + pulse * 0.15})`);
  core.addColorStop(0.5, "rgba(230,180,255,0.5)");
  core.addColorStop(1, "rgba(200,140,255,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(2, -4, 7 + pulse * 2, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Orbital ring — its tilt OVERSHOOTS to a target and settles, on a slow beat,
  // so it snaps round rather than sweeping like a metronome.
  const ringBeat = pingPong(t, 3.2);
  const ringTilt = lerp(-0.9, -0.1, easeOutBack(ringBeat, 1.4));
  ctx.strokeStyle = "rgba(220,170,255,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(4, -2, 12, 4.5, ringTilt, 0, TAU);
  ctx.stroke();

  // Sparks orbiting / trailing the orb (clean 4-point sparkles).
  const orbit: Array<[number, number, number]> = [
    [3, 14, 0],
    [2.4, 11, 2.1],
    [2.2, 13, 4.2],
    [1.8, 16, 1.0],
  ];
  orbit.forEach(([s, rad, phase]) => {
    const a = loopPhase(t, 2.85, phase / TAU) * TAU;
    const ssx = 4 + Math.cos(a) * rad;
    const ssy = -2 + Math.sin(a) * rad * 0.55;
    const tw = 0.5 + 0.5 * Math.sin(t * 5 + phase);
    sparkle(ctx, ssx, ssy, s * (0.7 + tw * 0.5), 0.5 + tw * 0.45, "243,230,255");
  });
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  spell_fireball: animFireball,
  spell_ice_shard: animIceShard,
  spell_lightning: animLightning,
  spell_heal: animHeal,
  spell_shield_bubble: animShieldBubble,
  spell_poison: animPoison,
  spell_wind: animWind,
  spell_arcane_missile: animArcaneMissile,
};
