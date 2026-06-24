// Animated farm-baby pets — same chibi silhouettes/palettes as
// src/textures/categories/pets.ts, but alive with characterful idles.
//
// Each fn redraws the WHOLE icon at elapsed seconds `t`. The rebuild kills the
// old "rigid whole-body vertical bob + one wiggling appendage" recipe that every
// mammal shared: the torso now SQUASHES & STRETCHES, motion is eased with
// anticipation/overshoot/follow-through (the 12 principles), most icons rest on
// a pose and deliver a periodic MOMENT (`beat`) instead of a constant metronome,
// and the contact shadow reacts to vertical motion via `groundShadow`. Loops are
// seamless in `t` (a separate system inserts the rest pause), driven off
// `loopPhase`/`pingPong`/`breathe`/`beat` so cycles tile exactly. Framing is
// nudged with `ctx.translate` per the per-icon review so subjects sit centred.

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
  easeOutBack,
  easeOutElastic,
  groundShadow,
} from "./_anim.js";

// --------------------------------------------------------------- shared bits
// Soft rosy cheek blush.
function blush(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = "rgba(255,140,150,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.7, 0, 0, TAU);
  ctx.fill();
}

// Big round eye with a white highlight dot. `open` 0..1 squashes for a blink;
// below ~0.16 it collapses to a happy lash line. `iris`/`pupil` recolour for the
// cat (green) and frog; default is the dark chibi eye.
function cuteEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  open: number,
  lash = "#1a1208",
): void {
  if (open < 0.16) {
    ctx.strokeStyle = lash;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y + r * 0.5, x + r, y);
    ctx.stroke();
    return;
  }
  const oy = Math.max(open, 0.06);
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * oy, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.4 * oy, r * 0.4, 0, TAU);
  ctx.fill();
}

// Returns 1 while open, dips toward 0 for a brief blink each `period` seconds.
// Continuous in `t` (no teleport) so the loop stays seamless.
function blinkOpen(t: number, period: number, phase: number): number {
  const p = loopPhase(t, period, phase / period);
  if (p < 0.05) return Math.abs(Math.cos((p / 0.05) * Math.PI));
  return 1;
}

// A single eased hop envelope over its own cycle: a crouch-anticipation dip, a
// launch arc into the air, then an overshoot squash on landing that settles.
// Returns the pieces a body needs to deform & leave the ground.
interface Hop {
  /** Vertical offset (negative = up off the ground). */
  lift: number;
  /** Body x-scale (>1 = wide/squashed, <1 = narrow/stretched tall). */
  sx: number;
  /** Body y-scale (>1 = tall/stretched, <1 = short/squashed). */
  sy: number;
  /** 0..1 — how grounded the contact is (1 = planted, 0 = airborne apex). */
  planted: number;
}
function hopCycle(t: number, period: number, height: number, offset = 0): Hop {
  const u = loopPhase(t, period, offset);
  // Phases (fractions of the cycle): rest → crouch → launch → air → land → settle.
  if (u < 0.22) {
    // Rest pose.
    return { lift: 0, sx: 1, sy: 1, planted: 1 };
  }
  if (u < 0.34) {
    // Anticipation: crouch down & squash wide.
    const k = easeInOutSine((u - 0.22) / 0.12);
    return { lift: 0, sx: 1 + 0.16 * k, sy: 1 - 0.18 * k, planted: 1 };
  }
  if (u < 0.5) {
    // Launch + airborne: stretch tall and rise on an eased arc.
    const k = (u - 0.34) / 0.16; // 0..1 up
    const arc = Math.sin(k * Math.PI); // 0→1→0 over the flight (apex at mid)
    const stretch = clamp01(1 - k * 1.6); // stretch fades after the kick
    return {
      lift: -height * arc,
      sx: 1 - 0.18 * stretch,
      sy: 1 + 0.22 * stretch,
      planted: 1 - arc,
    };
  }
  if (u < 0.6) {
    // Falling back toward the ground.
    const k = (u - 0.5) / 0.1;
    const arc = Math.sin((1 - k) * (Math.PI / 2)); // 1→0
    return { lift: -height * arc * 0.7, sx: 1, sy: 1, planted: 1 - arc * 0.6 };
  }
  if (u < 0.74) {
    // Landing impact: squash wide, then spring back (elastic overshoot).
    const k = (u - 0.6) / 0.14;
    const e = easeOutElastic(k, 0.34); // 0→…→1
    const squash = (1 - e) * 0.22; // big at impact, rings out
    return { lift: 0, sx: 1 + squash, sy: 1 - squash, planted: 1 };
  }
  return { lift: 0, sx: 1, sy: 1, planted: 1 };
}

// --------------------------------------------------------------------------- cat
// off=(3.2,2.6) → nudge up-left. Lead with a real breathing torso (ellipse
// squash about the seat) + a slow, eased tail-flick that lifts slowly, snaps,
// then settles (curling the whole tail), with ear twitches and blinks as accents.
function animCat(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-3.2, -2.6);

  const br = breathe(t, 2.6, 1, 0); // -1..1 slow breath
  const squashX = 1 + br * 0.04;
  const squashY = 1 - br * 0.035;
  // Tail-flick: rest, then a slow lift, a snap over, and an eased settle.
  const flick = beat(t, 5.2, 0.5);
  const flickEased = easeOutBack(flick, 1.4) * (flick > 0 ? 1 : 0);
  const earTwitch = beat(t, 4.4, 0.16, 0.55);
  const open = blinkOpen(t, 4.2, 0);

  groundShadow(ctx, 0, 22, 13, 4, -br * 1.2, 0.22);

  // Curled tail behind the body — the flick travels the length (base steady, tip
  // sweeps up and curls). Articulated via the control points, not a whole rotate.
  const tip = flickEased; // 0..~1.1
  ctx.strokeStyle = "#d86a18";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(11, 14);
  ctx.bezierCurveTo(
    20 + tip * 1.5,
    12 - tip * 3,
    19 - tip * 4,
    2 - tip * 8,
    11 - tip * 6,
    4 - tip * 9,
  );
  ctx.stroke();
  ctx.lineCap = "butt";

  // Body — breathes (the torso itself deforms; no rigid translate).
  ctx.save();
  ctx.translate(0, 20);
  ctx.scale(squashX, squashY);
  ctx.translate(0, -20);
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#ffb04a");
  bg.addColorStop(0.6, "#ec8a1e");
  bg.addColorStop(1, "#a85a0c");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.bezierCurveTo(-13, 12, -10, 20, 0, 20);
  ctx.bezierCurveTo(10, 20, 13, 12, 9, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a2c06";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,56,6,0.55)";
  ctx.lineWidth = 1.4;
  ([[-6, 8, -8, 12], [0, 10, 0, 15], [6, 8, 8, 12]] as Array<[number, number, number, number]>).forEach(
    ([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    },
  );
  ctx.fillStyle = "#ffc06a";
  ctx.beginPath();
  ctx.ellipse(-4, 19, 3, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, 19, 3, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a2c06";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Head — rides the breath (lifts a touch as the chest expands), slight follow.
  ctx.save();
  ctx.translate(0, -br * 0.7);
  const hg = ctx.createRadialGradient(-3, -10, 2, 0, -6, 14);
  hg.addColorStop(0, "#ffba56");
  hg.addColorStop(1, "#e8841a");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, -6, 11, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a2c06";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ears — twitch occasionally about their base.
  ([-1, 1] as number[]).forEach((side) => {
    ctx.save();
    ctx.translate(side * 8, -13);
    ctx.rotate(side * earTwitch * 0.28);
    ctx.translate(-side * 8, 13);
    ctx.fillStyle = "#e8841a";
    ctx.beginPath();
    ctx.moveTo(side * 5, -14);
    ctx.lineTo(side * 10, -20);
    ctx.lineTo(side * 11, -12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5a2c06";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "#ffb8b0";
    ctx.beginPath();
    ctx.moveTo(side * 6, -14);
    ctx.lineTo(side * 9, -18);
    ctx.lineTo(side * 9.5, -13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.strokeStyle = "rgba(120,56,6,0.5)";
  ctx.lineWidth = 1.2;
  ([[-2, -15, -2, -11], [2, -15, 2, -11], [0, -16, 0, -12]] as Array<[number, number, number, number]>).forEach(
    ([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    },
  );

  // Green eyes — blink (drawn with the cat's own iris colours).
  ([-4, 4] as number[]).forEach((ex) => {
    if (open < 0.16) {
      ctx.strokeStyle = "#102a10";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ex - 2.4, -6);
      ctx.quadraticCurveTo(ex, -4.5, ex + 2.4, -6);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = "#3fae4a";
    ctx.beginPath();
    ctx.ellipse(ex, -6, 2.4, 3 * open, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#102a10";
    ctx.beginPath();
    ctx.ellipse(ex, -6, 1, 2.4 * open, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex - 0.8, -7.2, 0.8, 0, TAU);
    ctx.fill();
  });

  ctx.fillStyle = "#d05a64";
  ctx.beginPath();
  ctx.moveTo(-1.6, -1.5);
  ctx.lineTo(1.6, -1.5);
  ctx.lineTo(0, 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a2c06";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0.2);
  ctx.quadraticCurveTo(-2.5, 2, -4, 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0.2);
  ctx.quadraticCurveTo(2.5, 2, 4, 0.5);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,44,6,0.6)";
  ctx.lineWidth = 0.8;
  ([[-3, -2, -12, -3], [-3, -1, -12, 0], [3, -2, 12, -3], [3, -1, 12, 0]] as Array<
    [number, number, number, number]
  >).forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  blush(ctx, -6, -2, 2.4);
  blush(ctx, 6, -2, 2.4);
  ctx.restore();

  ctx.restore();
}

// --------------------------------------------------------------------------- dog
// off=(1.4,4.0) → nudge up. Panting torso squash (quick breath), a BURSTY tail
// wag (a flurry then a beat of rest, not a perpetual blur), an eager head-tilt,
// and the floppy ears now HANG from a pivot at the head crown and swing with the
// tilt (the old vertical ellipses read as horns).
function animDog(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-1.4, -4);

  const pant = breathe(t, 0.9, 1, 0); // fast pant
  const squashX = 1 + Math.max(0, pant) * 0.05 + Math.max(0, -pant) * 0.02;
  const squashY = 1 - Math.max(0, pant) * 0.05;
  // Bursty wag: a flurry of fast wags inside a beat, then rest.
  const wagBurst = beat(t, 3.0, 0.6);
  const wag = Math.sin(t * 22) * wagBurst;
  // Head-tilt: a slow, curious lean that holds at each side (eased dwell).
  const tilt = (pingPong(t, 4.6) * 2 - 1) * 0.16;
  const tongueP = 1 + Math.max(0, pant) * 0.22; // pants out on the exhale
  const open = blinkOpen(t, 3.4, 0.5);

  groundShadow(ctx, 0, 22, 13, 4, -Math.max(0, pant) * 1.4, 0.22);

  // Wagging tail (articulated: base anchored, tip sweeps).
  ctx.strokeStyle = "#8a5a2c";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(10, 12);
  ctx.quadraticCurveTo(18 + wag * 4, 8 - Math.abs(wag) * 2, 16 + wag * 6, -1 - wag * 2);
  ctx.stroke();
  ctx.lineCap = "butt";

  // Body — pants (torso deforms).
  ctx.save();
  ctx.translate(0, 20);
  ctx.scale(squashX, squashY);
  ctx.translate(0, -20);
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#b07e44");
  bg.addColorStop(0.6, "#8a5a2c");
  bg.addColorStop(1, "#5a3614");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.bezierCurveTo(-13, 12, -10, 20, 0, 20);
  ctx.bezierCurveTo(10, 20, 13, 12, 9, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1f0a";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#f0d8a8";
  ctx.beginPath();
  ctx.ellipse(0, 13, 5, 6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#c89858";
  ctx.beginPath();
  ctx.ellipse(-4, 19, 3, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, 19, 3, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1f0a";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Head + floppy ears — tilt about the neck.
  ctx.save();
  ctx.translate(0, -6);
  ctx.rotate(tilt);
  ctx.translate(0, 6);

  // Floppy ears HANG from the crown (pivot at top) and swing with the tilt +
  // their own lag, so they read as droopy ears, not upright horns.
  ([-1, 1] as number[]).forEach((side) => {
    const swing = side * (tilt * 1.4) + Math.sin(t * 4 + side) * 0.05;
    ctx.save();
    ctx.translate(side * 9, -12); // pivot near the head crown
    ctx.rotate(side * 0.5 + swing); // splay outward then hang down
    ctx.fillStyle = "#6a4220";
    ctx.beginPath();
    // A drooping lobe drawn hanging DOWN-and-out from the pivot.
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(side * 1, 7, side * 1, 14, side * -1, 16);
    ctx.bezierCurveTo(side * -5, 14, side * -5, 5, side * -2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a1f0a";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  });

  const hg = ctx.createRadialGradient(-3, -10, 2, 0, -6, 14);
  hg.addColorStop(0, "#b88a50");
  hg.addColorStop(1, "#8a5a2c");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, -6, 11, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1f0a";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#f0d8a8";
  ctx.beginPath();
  ctx.ellipse(0, -1, 6, 5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1f0a";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  cuteEye(ctx, -4, -8, 2.2, open);
  cuteEye(ctx, 4, -8, 2.2, open);

  ctx.fillStyle = "#2a1608";
  ctx.beginPath();
  ctx.ellipse(0, -3, 2.4, 1.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(-0.8, -3.6, 0.7, 0, TAU);
  ctx.fill();

  // Tongue — lolls and pants with the breath (lengthens on the exhale).
  ctx.strokeStyle = "#3a1f0a";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(0, 1.5);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, 1.5);
  ctx.scale(1, tongueP);
  ctx.translate(0, -1.5);
  ctx.fillStyle = "#f08a90";
  ctx.beginPath();
  ctx.moveTo(-2.4, 1.5);
  ctx.bezierCurveTo(-2.4, 5.5, 2.4, 5.5, 2.4, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c0606a";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 1.8);
  ctx.lineTo(0, 4.5);
  ctx.stroke();
  ctx.restore();

  blush(ctx, -7, -3, 2.4);
  blush(ctx, 7, -3, 2.4);
  ctx.restore();

  ctx.restore();
}

// ------------------------------------------------------------------------ rabbit
// off=(1.8,-0.4) → tiny up-left. The textbook rigid bob is replaced by a real
// HOP: crouch anticipation → tall stretched launch → airborne apex (shadow
// shrinks) → wide squash landing that springs back (overshoot). Ears lag the
// body as follow-through; nose wiggles at rest.
function animRabbit(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-1.8, 0.4);

  const h = hopCycle(t, 3.0, 11);
  const nose = Math.sin(t * 6.0) * 0.5 * h.planted;
  // Ears lag the body's vertical move (overlap/follow-through).
  const earLag = -h.lift * 0.18;
  const earTwitch = beat(t, 4.5, 0.16, 0.4);
  const open = blinkOpen(t, 3.6, 1.0);

  groundShadow(ctx, 0, 22, 12, 4, h.lift, 0.24);

  ctx.save();
  ctx.translate(0, h.lift);

  // Long ears — anchored at the head crown, swing back with the launch (lag) and
  // twitch occasionally.
  ([-1, 1] as number[]).forEach((side) => {
    ctx.save();
    ctx.translate(side * 5, -8);
    ctx.rotate(side * earTwitch * 0.18 + side * earLag * 0.02);
    ctx.translate(-side * 5, 8);
    ctx.translate(0, earLag); // ears drag down a touch as the body shoots up
    ctx.fillStyle = "#fdf6ee";
    ctx.beginPath();
    ctx.ellipse(side * 5, -16, 3.4, 10, side * 0.18, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#c8b8a8";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "#ffc0cc";
    ctx.beginPath();
    ctx.ellipse(side * 5, -16, 1.6, 7.5, side * 0.18, 0, TAU);
    ctx.fill();
    ctx.restore();
  });

  // Fluffy tail.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(11, 14, 4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#d8cabb";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Body — squashes/stretches with the hop, about the ground contact.
  ctx.save();
  ctx.translate(0, 20);
  ctx.scale(h.sx, h.sy);
  ctx.translate(0, -20);
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(0.7, "#f4ece2");
  bg.addColorStop(1, "#d8cabb");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.bezierCurveTo(-12, 12, -9, 20, 0, 20);
  ctx.bezierCurveTo(9, 20, 12, 12, 8, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b8a898";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fdf6ee";
  ctx.beginPath();
  ctx.ellipse(-4, 19, 3, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, 19, 3, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b8a898";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Head.
  const hg = ctx.createRadialGradient(-3, -8, 2, 0, -5, 13);
  hg.addColorStop(0, "#ffffff");
  hg.addColorStop(1, "#ece2d4");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, -5, 10, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b8a898";
  ctx.lineWidth = 2;
  ctx.stroke();

  cuteEye(ctx, -4, -6, 2.2, open);
  cuteEye(ctx, 4, -6, 2.2, open);

  ctx.save();
  ctx.translate(nose, 0);
  ctx.fillStyle = "#f08a98";
  ctx.beginPath();
  ctx.moveTo(-1.4, -1);
  ctx.lineTo(1.4, -1);
  ctx.lineTo(0, 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#b8a898";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, 0.4);
  ctx.lineTo(0, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(-2, 3, -3, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(2, 3, 3, 2);
  ctx.stroke();
  blush(ctx, -6, -2, 2.4);
  blush(ctx, 6, -2, 2.4);
  ctx.restore();

  ctx.restore();
}

// ------------------------------------------------------------------------- chick
// off=(0,3.1) → nudge up. The peck is now PECK-AND-PERK: a small anticipation
// lift, a quick drive down, a wide squash on contact with the ground, then a
// perk back up — plus a fast wing shimmy and fuzz shiver.
function animChick(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -3.1);

  // Peck beat over a 3.6s cycle: anticipation up, plunge down, contact, perk.
  const pu = loopPhase(t, 3.6);
  let peckY = 0;
  let sx = 1;
  let sy = 1;
  if (pu < 0.12) {
    // Anticipation: rise & stretch slightly before the strike.
    const k = easeInOutSine(pu / 0.12);
    peckY = -2 * k;
    sx = 1 - 0.04 * k;
    sy = 1 + 0.05 * k;
  } else if (pu < 0.22) {
    // Plunge down into the peck (accelerating).
    const k = (pu - 0.12) / 0.1;
    peckY = lerp(-2, 5, k * k); // accelerating plunge into the peck
  } else if (pu < 0.34) {
    // Contact: squash wide against the ground, then start back.
    const k = (pu - 0.22) / 0.12;
    const e = easeOutBack(k, 2.0);
    peckY = lerp(5, 0, e);
    const sq = (1 - Math.abs(2 * k - 1)) * 0.14; // peak squash mid-contact
    sx = 1 + sq;
    sy = 1 - sq;
  } // else rest

  const wing = Math.sin(t * 11.0) * 0.16 + beat(t, 3.6, 0.18, 0.5) * 0.2;
  const fuzz = Math.sin(t * 7.0) * 0.6;
  const open = blinkOpen(t, 3.8, 0.4);

  groundShadow(ctx, 0, 22, 12, 4, 0, 0.22);

  // Feet stay grounded.
  ctx.strokeStyle = "#f0a020";
  ctx.lineWidth = 1.8;
  ([-3, 3] as number[]).forEach((fx) => {
    ctx.beginPath();
    ctx.moveTo(fx, 18);
    ctx.lineTo(fx, 21);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx - 2, 22);
    ctx.lineTo(fx, 21);
    ctx.lineTo(fx + 2, 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx, 21);
    ctx.lineTo(fx, 22.5);
    ctx.stroke();
  });

  ctx.save();
  ctx.translate(0, peckY);
  // Squash the body about its base (just above the feet).
  ctx.translate(0, 18);
  ctx.scale(sx, sy);
  ctx.translate(0, -18);

  const bg = ctx.createRadialGradient(-3, -2, 3, 0, 2, 18);
  bg.addColorStop(0, "#fff6b0");
  bg.addColorStop(0.6, "#ffe04a");
  bg.addColorStop(1, "#e8b020");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 2, 16, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#c88a14";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * TAU;
    const r = 16 + Math.sin(a * 12 + fuzz) * 0.8;
    const x = Math.cos(a) * r;
    const y = 2 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Wing shimmy (fast small flutter about its shoulder).
  ctx.save();
  ctx.translate(9, 3);
  ctx.rotate(wing);
  ctx.translate(-9, -3);
  ctx.fillStyle = "#f8cc30";
  ctx.beginPath();
  ctx.ellipse(9, 3, 4, 6, 0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#c88a14";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  cuteEye(ctx, -4, -2, 2.4, open);
  cuteEye(ctx, 4, -2, 2.4, open);

  ctx.fillStyle = "#f0901a";
  ctx.beginPath();
  ctx.moveTo(-2.4, 3);
  ctx.lineTo(2.4, 3);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b86a10";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  blush(ctx, -8, 1, 2.6);
  blush(ctx, 8, 1, 2.6);

  // Top fuzz tuft flutters.
  ctx.strokeStyle = "#f8cc30";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ([-2, 0, 2] as number[]).forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(dx, -14);
    ctx.lineTo(dx * 1.6 + fuzz * 1.4, -19);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  ctx.restore();

  ctx.restore();
}

// ----------------------------------------------------------------------- duckling
// off=(-0.6,5.4) → nudge up. The rigid rock+slide is replaced by an
// ALTERNATING-FOOT weight shift: weight rolls onto one foot (that side dips &
// plants, the body leans and squashes toward it) while the other foot lifts to
// step, then it alternates. A waddle that pushes off feet rather than sliding.
function animDuckling(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0.6, -5.4);

  const step = Math.sin(t * 3.0); // -1..1 weight side (right when >0)
  const lean = step * 0.09; // body leans toward the loaded foot
  const shiftX = step * 1.2; // body sways a touch over the stance foot
  const sx = 1 + Math.abs(step) * 0.05; // squash wider as weight lands
  const sy = 1 - Math.abs(step) * 0.05;
  // Bill open/close occasionally (a quiet peep).
  const billOpen = beat(t, 4.0, 0.16) * 2.4;
  const open = blinkOpen(t, 3.7, 0.8);

  groundShadow(ctx, shiftX * 0.6, 22, 13, 4, 0, 0.22);

  // Webbed feet — the LOADED foot plants flat, the FREE foot lifts to step.
  ctx.fillStyle = "#f0901a";
  ([-4, 4] as Array<number>).forEach((fx) => {
    const loaded = fx > 0 ? step > 0 : step < 0; // this foot bears the weight?
    const lift = loaded ? 0 : Math.abs(step) * 3; // free foot lifts
    ctx.save();
    ctx.translate(0, -lift);
    ctx.beginPath();
    ctx.moveTo(fx - 3, 22);
    ctx.lineTo(fx, 18);
    ctx.lineTo(fx + 3, 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#b86a10";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  });

  // Body — leans & squashes toward the planted foot (no rigid translate).
  ctx.save();
  ctx.translate(shiftX, 0);
  ctx.translate(0, 18);
  ctx.rotate(lean);
  ctx.scale(sx, sy);
  ctx.translate(0, -18);

  const bg = ctx.createRadialGradient(-3, 2, 3, 0, 6, 18);
  bg.addColorStop(0, "#fff8c0");
  bg.addColorStop(0.6, "#ffe66a");
  bg.addColorStop(1, "#eec034");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, 6, 14, 13, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#cc9a1e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 30; i++) {
    const a = (i / 30) * TAU;
    const rr = 1 + Math.sin(a * 11) * 0.06;
    const x = Math.cos(a) * 14 * rr;
    const y = 6 + Math.sin(a) * 13 * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = "#ffe66a";
  ctx.beginPath();
  ctx.moveTo(12, 2);
  ctx.quadraticCurveTo(18, -2, 15, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#cc9a1e";
  ctx.lineWidth = 1;
  ctx.stroke();

  const hg = ctx.createRadialGradient(-3, -8, 2, 0, -6, 12);
  hg.addColorStop(0, "#fff8c0");
  hg.addColorStop(1, "#ffe04a");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(-3, -6, 9, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#cc9a1e";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Flat bill — opens with a lower half dropping.
  ctx.fillStyle = "#f0901a";
  ctx.beginPath();
  ctx.ellipse(-12, -4 - billOpen * 0.5, 5, 3, -0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b86a10";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (billOpen > 0.2) {
    ctx.fillStyle = "#f0901a";
    ctx.beginPath();
    ctx.ellipse(-12, -4 + billOpen * 0.9, 4.4, 2.4, -0.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#b86a10";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.strokeStyle = "#b86a10";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-16, -4);
  ctx.lineTo(-9, -4);
  ctx.stroke();

  cuteEye(ctx, -4, -7, 2.2, open);
  blush(ctx, -7, -3, 2.4);
  ctx.restore();

  ctx.restore();
}

// --------------------------------------------------------------------------- lamb
// off=(-0.2,4.8) → nudge up. The dead wool body now JIGGLES (each cloud bump
// wobbles its radius on a traveling wave), the lamb periodically DIPS to graze
// (head & body lower together) and gives a quick wool-SHAKE (side wobble). Legs
// stay planted.
function animLamb(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0.2, -4.8);

  const breath = breathe(t, 2.4, 1, 0);
  // Graze dip: settle, then lower the head/body to nibble and rise back.
  const graze = beat(t, 5.6, 0.42) * 1;
  const grazeY = easeInOutSine(graze) * 5;
  // Wool shake: a quick wobble burst (a damped shimmy).
  const shakeBurst = beat(t, 7.0, 0.22, 0.6);
  const shake = Math.sin(t * 30) * shakeBurst * 1.4;
  const earFlick = beat(t, 4.5, 0.16, 0.3);
  const open = blinkOpen(t, 4.0, 1.4);

  groundShadow(ctx, shake * 0.4, 22, 15, 4, -breath * 0.8, 0.22);

  // Legs stay planted.
  ctx.fillStyle = "#3a2c20";
  ctx.fillRect(-7, 16, 3, 6);
  ctx.fillRect(-1, 17, 3, 6);
  ctx.fillRect(5, 16, 3, 6);
  ctx.strokeStyle = "#1f160e";
  ctx.lineWidth = 1;
  ctx.strokeRect(-7, 16, 3, 6);
  ctx.strokeRect(-1, 17, 3, 6);
  ctx.strokeRect(5, 16, 3, 6);

  // Woolly body — the cloud outline DEFORMS: each bump's radius rides a wave, so
  // the wool jiggles instead of holding rigid; the whole mass drops to graze.
  ctx.save();
  ctx.translate(shake, grazeY + breath * 0.3);
  const bg = ctx.createRadialGradient(-3, 0, 3, 0, 4, 18);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(0.7, "#f2eee8");
  bg.addColorStop(1, "#d8d0c4");
  ctx.fillStyle = bg;
  const bumps = 13;
  const cx = 0;
  const cy = 5;
  const br = 13;
  ctx.beginPath();
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * TAU;
    const wob = 1 + Math.sin(t * 4 + i * 1.3) * 0.06 + breath * 0.02; // per-bump jiggle
    const r = (br + 2.4) * wob;
    const x = cx + Math.cos(a) * r * 1.15;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const pa = ((i - 0.5) / bumps) * TAU;
      const pwob = 1 + Math.sin(t * 4 + (i - 0.5) * 1.3) * 0.06;
      const px = cx + Math.cos(pa) * (r + 2.6) * 1.15 * pwob;
      const py = cy + Math.sin(pa) * (r + 2.6) * pwob;
      ctx.quadraticCurveTo(px, py, x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c0b6a8";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = "rgba(180,168,152,0.6)";
  ctx.lineWidth = 0.9;
  ([[-6, 2], [2, -2], [6, 4], [-2, 6], [-8, 8]] as Array<[number, number]>).forEach(([wx, wy]) => {
    ctx.beginPath();
    ctx.arc(wx, wy, 2.2, 0.4, Math.PI * 1.6);
    ctx.stroke();
  });
  ctx.restore();

  // Head — dips to graze with the body and gives the same shake.
  ctx.save();
  ctx.translate(shake * 0.8, grazeY + breath * 0.4);
  ctx.fillStyle = "#f0e2cc";
  ctx.beginPath();
  ctx.ellipse(-7, -8, 7, 7.5, -0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#c8b89a";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Floppy ears — flick about the head.
  ([-1, 1] as number[]).forEach((side) => {
    ctx.save();
    ctx.translate(-7, -10);
    ctx.rotate(side * earFlick * 0.3 + side * shake * 0.02);
    ctx.translate(7, 10);
    ctx.fillStyle = "#e0d0b8";
    ctx.beginPath();
    ctx.ellipse(-7 + side * 7, -10, 4, 2.4, side * 0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#c8b89a";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  });

  ctx.fillStyle = "#ffffff";
  ([-9, -6, -3] as number[]).forEach((fx) => {
    ctx.beginPath();
    ctx.arc(fx, -13, 2.6, 0, TAU);
    ctx.fill();
  });
  ctx.strokeStyle = "#d8d0c4";
  ctx.lineWidth = 0.8;
  ([-9, -6, -3] as number[]).forEach((fx) => {
    ctx.beginPath();
    ctx.arc(fx, -13, 2.6, 0, TAU);
    ctx.stroke();
  });

  cuteEye(ctx, -9, -8, 2, open);
  cuteEye(ctx, -4, -8, 2, open);

  ctx.fillStyle = "#b089a0";
  ctx.beginPath();
  ctx.ellipse(-7, -4, 2, 1.4, 0, 0, TAU);
  ctx.fill();
  blush(ctx, -11, -5, 2.2);
  blush(ctx, -3, -5, 2.2);
  ctx.restore();

  ctx.restore();
}

// ------------------------------------------------------------------------- piglet
// off=(2.6,3.8) → nudge up-left. Lead with the CURLY TAIL (a springy lead that
// boings on a beat), give the frozen torso a breathing/bouncing body (squash),
// flop the ears following the bounce, and snuffle the snout (fast twitch).
function animPiglet(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-2.6, -3.8);

  const breath = breathe(t, 2.0, 1, 0);
  // Body gives a light bounce on a beat (a happy little hop in place) + breath.
  const bounce = -beat(t, 2.8, 0.42) * 2.2;
  const sx = 1 + breath * 0.04 + Math.max(0, -bounce) * 0.02;
  const sy = 1 - breath * 0.035 + Math.max(0, bounce) * 0.0;
  // Curly tail — leads: a springy boing on a beat (elastic), plus idle wiggle.
  const tailBoing = beat(t, 2.8, 0.4) * easeOutElastic(beat(t, 2.8, 0.4), 0.3);
  const tailWig = Math.sin(t * 6.0) * 0.5 + tailBoing * 2;
  const earFlop = Math.sin(t * 4.0 + 0.5) * 0.1 + bounce * 0.04;
  const snout = Math.sin(t * 9.0) * 0.5 + beat(t, 3.4, 0.2, 0.5) * 0.6;
  const open = blinkOpen(t, 3.9, 0.2);

  groundShadow(ctx, 0, 22, 14, 4, -bounce - breath * 0.6, 0.22);

  // Curly tail — wiggles & boings (the lead action).
  ctx.save();
  ctx.translate(11, 4);
  ctx.rotate(tailWig * 0.12);
  ctx.translate(-11, -4);
  ctx.strokeStyle = "#e08a98";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(11, 8);
  ctx.bezierCurveTo(17 + tailWig * 0.6, 6, 14 - tailWig * 0.8, 1, 18 + tailWig, 0 + tailWig * 0.8);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();

  // Body — breathes & bounces (torso deforms).
  ctx.save();
  ctx.translate(0, bounce);
  ctx.translate(0, 20);
  ctx.scale(sx, sy);
  ctx.translate(0, -20);
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#ffd2da");
  bg.addColorStop(0.6, "#f3a4b2");
  bg.addColorStop(1, "#cc7888");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.bezierCurveTo(-13, 12, -10, 20, 0, 20);
  ctx.bezierCurveTo(10, 20, 13, 12, 9, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a5060";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#b86878";
  ctx.beginPath();
  ctx.ellipse(-4, 19, 3, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, 19, 3, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#9a5060";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Head — follows the bounce.
  ctx.save();
  ctx.translate(0, bounce * 1.05);
  const hg = ctx.createRadialGradient(-3, -10, 2, 0, -6, 13);
  hg.addColorStop(0, "#ffd2da");
  hg.addColorStop(1, "#f0a0ae");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, -6, 11, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#9a5060";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Big ears flop about their base.
  ([-1, 1] as number[]).forEach((side) => {
    ctx.save();
    ctx.translate(side * 7, -13);
    ctx.rotate(side * earFlop);
    ctx.translate(-side * 7, 13);
    ctx.fillStyle = "#f0a0ae";
    ctx.beginPath();
    ctx.moveTo(side * 6, -14);
    ctx.lineTo(side * 12, -18);
    ctx.lineTo(side * 10, -9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#9a5060";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  });

  // Snout snuffles.
  ctx.save();
  ctx.translate(snout, 0);
  ctx.fillStyle = "#e889a0";
  ctx.beginPath();
  ctx.ellipse(0, -1, 5.5, 4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#9a5060";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#9a5060";
  ctx.beginPath();
  ctx.ellipse(-2, -1, 0.9, 1.4, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, -1, 0.9, 1.4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  cuteEye(ctx, -4, -8, 2.2, open);
  cuteEye(ctx, 4, -8, 2.2, open);
  blush(ctx, -7, -3, 2.6);
  blush(ctx, 7, -3, 2.6);
  ctx.restore();

  ctx.restore();
}

// ------------------------------------------------------------------------ goat kid
// off=(-1.0,2.8). FIRST fix the broken composition: the static head is jammed
// into the body (head ellipse at (-8,-6) overlaps body at (1,6)) and the eyes at
// (-10,-6)/(-5,-6) sit too close (cross-eyed). Here the head is lifted up-and-out
// of the torso and the eyes are re-spaced, then animated with a playful HEAD-BUTT
// tease: a slow pull-back wind-up, a quick butt forward-down, and a recoil
// settle. Breathing torso underneath.
function animGoatKid(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(1.0, -2.8);

  const breath = breathe(t, 2.6, 1, 0);
  const sx = 1 + breath * 0.035;
  const sy = 1 - breath * 0.03;
  // Head-butt tease: rest, slow pull-back (anticipation), quick thrust, recoil.
  const bu = loopPhase(t, 4.4);
  let butt = 0; // forward-down thrust amount
  let rear = 0; // pull-back amount
  if (bu > 0.3 && bu < 0.46) {
    rear = easeInOutSine((bu - 0.3) / 0.16); // wind up back
  } else if (bu >= 0.46 && bu < 0.56) {
    const k = (bu - 0.46) / 0.1;
    rear = 1 - k;
    butt = easeOutCubic(k); // snap forward-down
  } else if (bu >= 0.56 && bu < 0.74) {
    const k = (bu - 0.56) / 0.18;
    butt = (1 - easeOutBack(k, 2.2)) * 1; // recoil back with overshoot ring-out
  }
  const headTilt = -rear * 0.22 + butt * 0.34; // nose up on wind-up, down on butt
  const headX = rear * 2 - butt * 3;
  const headY = -rear * 2 + butt * 3;
  const earFlick = beat(t, 4.0, 0.16);
  const tailFlick = Math.sin(t * 6.0) * 0.3 + beat(t, 4.4, 0.18, 0.46) * 0.5;
  const open = blinkOpen(t, 3.8, 0.6);

  groundShadow(ctx, 0, 22, 14, 4, -breath * 0.7, 0.22);

  // Legs planted.
  ctx.fillStyle = "#9a6a3a";
  ctx.fillRect(-7, 16, 3, 6);
  ctx.fillRect(-1, 17, 3, 6);
  ctx.fillRect(5, 16, 3, 6);
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 1;
  ctx.strokeRect(-7, 16, 3, 6);
  ctx.strokeRect(-1, 17, 3, 6);
  ctx.strokeRect(5, 16, 3, 6);

  // Body — breathes (torso deforms about its base). Shifted right so the head
  // sits up-LEFT of it instead of buried inside it.
  ctx.save();
  ctx.translate(0, 16);
  ctx.scale(sx, sy);
  ctx.translate(0, -16);
  const bg = ctx.createRadialGradient(0, 0, 3, 3, 4, 18);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(0.7, "#f2ede4");
  bg.addColorStop(1, "#d6ccbc");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(4, 7, 12, 10.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b8a890";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#a9743e";
  ctx.beginPath();
  ctx.ellipse(9, 9, 5.5, 4.6, 0.2, 0, TAU);
  ctx.fill();

  // Stubby tail flicks.
  ctx.save();
  ctx.translate(14, 2);
  ctx.rotate(tailFlick);
  ctx.translate(-14, -2);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(14, 2);
  ctx.lineTo(19, -1);
  ctx.lineTo(16, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b8a890";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // Head — lifted up-and-LEFT, clear of the body, and butts on the tease. Pivot
  // at the neck (where it meets the shoulder) so the butt swings, not slides.
  ctx.save();
  ctx.translate(-3 + headX, -7 + headY); // neck pivot, raised out of the torso
  ctx.rotate(headTilt);

  const hg = ctx.createRadialGradient(-7, -6, 2, -5, -2, 12);
  hg.addColorStop(0, "#c79360");
  hg.addColorStop(1, "#9a6a3a");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(-6, -4, 8, 8, -0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = "#f4ece0";
  ctx.beginPath();
  ctx.ellipse(-10, 0, 4, 3.4, 0, 0, TAU);
  ctx.fill();

  // Little horns.
  ctx.strokeStyle = "#d8c4a0";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -11);
  ctx.quadraticCurveTo(-10, -16, -7, -17);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -11);
  ctx.quadraticCurveTo(-3, -16, 0, -16);
  ctx.stroke();
  ctx.lineCap = "butt";

  // Ears — flick about the head sides.
  ctx.save();
  ctx.translate(-13, -6);
  ctx.rotate(earFlick * 0.3);
  ctx.translate(13, 6);
  ctx.fillStyle = "#9a6a3a";
  ctx.beginPath();
  ctx.ellipse(-13, -6, 4, 2.4, 0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(1, -7);
  ctx.rotate(-earFlick * 0.3);
  ctx.translate(-1, 7);
  ctx.fillStyle = "#9a6a3a";
  ctx.beginPath();
  ctx.ellipse(1, -7, 4, 2.4, -0.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // Eyes — re-spaced wider (was cross-eyed) so the kid looks ahead, not inward.
  cuteEye(ctx, -9, -4, 2, open);
  cuteEye(ctx, -3, -4, 2, open);

  ctx.fillStyle = "#5a3a24";
  ctx.beginPath();
  ctx.ellipse(-10, 0, 1.6, 1.2, 0, 0, TAU);
  ctx.fill();
  // Tiny goatee.
  ctx.strokeStyle = "#f4ece0";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, 3);
  ctx.lineTo(-10, 7);
  ctx.stroke();
  ctx.lineCap = "butt";
  blush(ctx, -11, -2, 2.2);
  ctx.restore();

  ctx.restore();
}

// ----------------------------------------------------------------------- hedgehog
// off=(-0.2,4.2) → nudge up. Best static craft, near-dead motion. Add a real
// BREATHING dome (the dome squashes & the spikes scale radially with the breath,
// anchored at their base), a nose SNIFF (fast twitch), and a periodic STARTLED
// spike-bristle BEAT — all spikes shoot out and the body flinches, then settles.
function animHedgehog(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0.2, -4.2);

  const breath = (Math.sin(t * 1.8) + 1) * 0.5; // 0..1 slow breath
  // Startle beat: a sharp bristle where every spike shoots out & the body recoils.
  const startle = beat(t, 6.4, 0.18, 0.55);
  const spikeRaise = breath * 1.2 + startle * 4; // base breath + big bristle
  const domeSq = 1 + breath * 0.04 + startle * 0.05; // dome widens
  const domeSy = 1 - breath * 0.03 - startle * 0.04; // ...and flattens on flinch
  const flinch = -startle * 1.0; // small upward recoil
  const sniff = Math.sin(t * 9.0) * 0.6;
  const open = blinkOpen(t, 4.0, 0.3);

  groundShadow(ctx, 0, 22, 15, 4, -breath * 0.6, 0.22);

  ctx.save();
  ctx.translate(0, flinch);
  // Squash the whole quilled mass about its base so spikes + dome breathe as one.
  ctx.translate(0, 14);
  ctx.scale(domeSq, domeSy);
  ctx.translate(0, -14);

  // Spiky back — each spike's TIP extends radially with the breath/bristle.
  const spikeBase = "#6a4a2a";
  const spikeTip = "#43301c";
  for (let layer = 0; layer < 2; layer++) {
    const rad = 15 - layer * 4;
    const yoff = -layer * 2;
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const bx = Math.cos(a) * rad;
      const by = 4 + yoff + Math.sin(a) * rad;
      const tipLen = 6 + spikeRaise;
      const tx = Math.cos(a) * (rad + tipLen);
      const ty = 4 + yoff + Math.sin(a) * (rad + tipLen);
      const perp = a + Math.PI / 2;
      ctx.fillStyle = i % 2 === 0 ? spikeBase : spikeTip;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(perp) * 2.4, by + Math.sin(perp) * 2.4);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx - Math.cos(perp) * 2.4, by - Math.sin(perp) * 2.4);
      ctx.closePath();
      ctx.fill();
    }
  }

  const bg = ctx.createRadialGradient(-3, 0, 3, 0, 4, 16);
  bg.addColorStop(0, "#7a5836");
  bg.addColorStop(0.7, "#5a3e22");
  bg.addColorStop(1, "#3a2614");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-15, 6);
  ctx.bezierCurveTo(-15, -8, 15, -8, 15, 6);
  ctx.bezierCurveTo(12, 14, -12, 14, -15, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1c0e";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = "#e8c89a";
  ctx.beginPath();
  ctx.ellipse(0, 11, 8, 4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Face — sits in front of the breathing mass (its own gentle bob with breath).
  ctx.save();
  ctx.translate(0, flinch * 0.6 + (breath - 0.5) * 0.4);
  ctx.fillStyle = "#e8c89a";
  ctx.beginPath();
  ctx.ellipse(-12, 4, 7, 6, -0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b89868";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Snout sniffs (twitches left/right).
  ctx.save();
  ctx.translate(sniff, 0);
  ctx.fillStyle = "#d8b888";
  ctx.beginPath();
  ctx.ellipse(-18, 5, 3, 2.4, -0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b89868";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#3a2414";
  ctx.beginPath();
  ctx.arc(-20.5, 4.5, 1.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(-21, 4, 0.6, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#c8a878";
  ctx.beginPath();
  ctx.arc(-9, -1, 2.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b89868";
  ctx.lineWidth = 1;
  ctx.stroke();

  cuteEye(ctx, -13, 3, 2, open);
  cuteEye(ctx, -9, 4, 1.8, open);

  ctx.fillStyle = "#d8b888";
  ctx.beginPath();
  ctx.ellipse(-4, 13, 2.4, 1.8, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, 13, 2.4, 1.8, 0, 0, TAU);
  ctx.fill();
  blush(ctx, -15, 6, 2.2);
  ctx.restore();

  ctx.restore();
}

// --------------------------------------------------------------------------- frog
// off=(0,5.6) → nudge up. Already one of the better idles (a real crouch). Deepen
// & VARY the squash (the throat puff swells the belly on a beat, breath varies),
// add EYE SWIVELS (pupils track around + eyes occasionally hood), and a
// TELEGRAPHED mini-hop: crouch anticipation → stretched launch → overshoot land.
function animFrog(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -5.6);

  // Throat puff: a varied swell on a beat (deeper than the old constant sine).
  const puff = beat(t, 2.6, 0.5);
  // Mini-hop: rest → crouch (squash) → launch (stretch) → small air → land.
  const hu = loopPhase(t, 5.0);
  let lift = 0;
  let hsx = 1;
  let hsy = 1;
  if (hu < 0.18) {
    // Crouch anticipation: press down & squash wide.
    const k = easeInOutSine(hu / 0.18);
    hsx = 1 + 0.14 * k;
    hsy = 1 - 0.16 * k;
  } else if (hu < 0.3) {
    // Launch: stretch tall and rise on an arc.
    const k = (hu - 0.18) / 0.12;
    const arc = Math.sin(k * Math.PI);
    lift = -7 * arc;
    const st = clamp01(1 - k);
    hsx = 1 - 0.14 * st;
    hsy = 1 + 0.18 * st;
  } else if (hu < 0.42) {
    // Land: squash & spring back (overshoot rings out).
    const k = (hu - 0.3) / 0.12;
    const e = easeOutElastic(k, 0.36);
    const sq = (1 - e) * 0.18;
    hsx = 1 + sq;
    hsy = 1 - sq;
  }
  // Combine breathing squash with the hop squash.
  const squashY = hsy * (1 - puff * 0.04);
  const squashX = hsx * (1 + puff * 0.04);
  // Eye swivel: pupils drift around a small loop, occasionally hood (blink).
  const eyeP = loopPhase(t, 6.4);
  const eyeDX = Math.cos(eyeP * TAU) * 1.0;
  const eyeDY = Math.sin(eyeP * TAU * 2) * 0.6;
  const open = blinkOpen(t, 3.5, 1.2);

  groundShadow(ctx, 0, 22, 16, 4.5, lift, 0.24);

  ctx.save();
  ctx.translate(0, lift);
  ctx.translate(0, 20);
  ctx.scale(squashX, squashY);
  ctx.translate(0, -20);

  ctx.fillStyle = "#5fa838";
  ([-1, 1] as number[]).forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 11, 16);
    ctx.lineTo(side * 19, 20);
    ctx.lineTo(side * 17, 22);
    ctx.lineTo(side * 11, 19);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e5a18";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  const bg = ctx.createRadialGradient(-3, 2, 3, 0, 6, 18);
  bg.addColorStop(0, "#9fd85a");
  bg.addColorStop(0.6, "#6cb83a");
  bg.addColorStop(1, "#3f8420");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, 8, 16, 12, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#27531a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pale belly — swells with the throat puff (varied, deeper than before).
  ctx.fillStyle = "#e4f0b0";
  ctx.beginPath();
  ctx.ellipse(0, 13 + puff * 0.8, 9 + puff * 1.8, 6 + puff * 2.0, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#6cb83a";
  ([-5, 5] as number[]).forEach((fx) => {
    ctx.beginPath();
    ctx.ellipse(fx, 18, 3.4, 2.2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#2e5a18";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "#2e5a18";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(fx - 1.5, 19.5);
    ctx.lineTo(fx - 1.5, 17.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx + 1.5, 19.5);
    ctx.lineTo(fx + 1.5, 17.5);
    ctx.stroke();
  });

  // Big bulging eyes — pupils swivel; lids drop on blink.
  ([-7, 7] as number[]).forEach((ex) => {
    ctx.fillStyle = "#7cc245";
    ctx.beginPath();
    ctx.arc(ex, -8, 6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#27531a";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (open < 0.16) {
      ctx.fillStyle = "#5fa838";
      ctx.beginPath();
      ctx.arc(ex, -8, 5.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#27531a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ex - 4.5, -8);
      ctx.lineTo(ex + 4.5, -8);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = "#fffce0";
    ctx.beginPath();
    ctx.arc(ex, -8, 3.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#1a1208";
    ctx.beginPath();
    ctx.ellipse(ex + eyeDX, -7 + eyeDY, 2.2, 2.2 * open, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex - 1 + eyeDX, -8.4 + eyeDY, 1, 0, TAU);
    ctx.fill();
  });

  ctx.fillStyle = "#2e5a18";
  ctx.beginPath();
  ctx.arc(-2, 0, 0.8, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2, 0, 0.8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#27531a";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 4, 9, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.lineCap = "butt";
  blush(ctx, -9, 6, 2.6);
  blush(ctx, 9, 6, 2.6);
  ctx.restore();

  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  pet_cat: animCat,
  pet_dog: animDog,
  pet_rabbit: animRabbit,
  pet_chick: animChick,
  pet_duckling: animDuckling,
  pet_lamb: animLamb,
  pet_piglet: animPiglet,
  pet_goat_kid: animGoatKid,
  pet_hedgehog: animHedgehog,
  pet_frog: animFrog,
};
