// Animated drinks & beverages — same look as src/textures/categories/drinks.ts, but alive.
// Each fn redraws the WHOLE icon at time `t` (seconds). Loops are seamless via
// `loopPhase`/`pingPong`/`breathe` (drive position off `t`, never a raw sawtooth)
// and shadows couple to vertical motion via `groundShadow`.
//
// Module theme: the VESSELS are 100% rigid glass/ceramic — the first draft read
// like a shelf of statues because only the liquid moved. The rebuild gives every
// vessel a tiny eased BOB/TILT (a "settle" the contents react to) so none reads
// frozen, then leads with real contents deformation (sloshing clipped to the
// bowl, climbing menisci, popping foam, curling steam) with glints/sparkles
// demoted to a secondary accent. Silhouettes, palettes and gloss are preserved
// from the static draw — only MOTION and FRAMING change.

import {
  TAU,
  breathe,
  loopPhase,
  pingPong,
  beat,
  twinkle,
  easeInOutSine,
  easeOutBack,
  easeOutCubic,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// Shared steam: one rising wisp that CURLS (an S-bend that scrolls upward), born
// near the surface, fading in at birth and out near the top so the loop tiles.
// `curl` skews the bend direction so two wisps offset (and counter-curl) instead
// of running as parallel ribbons. `lean` shifts the whole column with the breath.
function steamWisp(
  ctx: CanvasRenderingContext2D,
  t: number,
  baseX: number,
  topY: number,
  bottomY: number,
  sway: number,
  alpha: number,
  period: number,
  offset: number,
  curl: number,
  lean: number,
): void {
  const p = loopPhase(t, period, offset); // 0..1, seamless
  const h = bottomY - topY;
  const fade = Math.sin(p * Math.PI); // 0 at the ends, 1 mid-rise
  const a = alpha * fade;
  if (a <= 0.01) return;
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  const segs = 10;
  let started = false;
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    // Rise: the whole wisp travels up as p increases.
    const y = bottomY - f * h - p * h * 0.55;
    if (y < topY - 3) break;
    // A scrolling S-bend (two phase-shifted lobes) gives a real curl, widening
    // as it climbs; `curl` flips/serpentines the lobe so wisps don't parallel.
    const wob =
      Math.sin(f * Math.PI * 1.6 + t * 2.2 + offset * 6) * sway * (0.3 + f) +
      Math.sin(f * Math.PI * 3 + curl) * sway * 0.5 * f;
    const x = baseX + lean + wob + curl * f * 1.4;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.lineCap = "butt";
}

// ---------------------------------------------------------------------------
// drink_coffee — the BEST steam, but it was parallel ribbons over a static cup.
// Now: a slow heat-breath bob the whole cup rides on, two counter-curling wisps
// offset in time, and the comma handle closed + thickened into a real loop.
function animCoffee(ctx: CanvasRenderingContext2D, t: number): void {
  // Heat-breath: a gentle eased rise/fall (the warm cup "exhales").
  const breath = breathe(t, 3.4, 0.7); // ±0.7u vertical
  const lean = Math.sin(t * 1.1) * 1.1; // steam column drifts with the breath

  groundShadow(ctx, 0, 22, 19, 4.5, -breath, 0.22);

  // Steam first (behind the cup) — two wisps, offset in phase AND counter-curled.
  steamWisp(ctx, t, -5, -23, -6, 3.6, 0.5, 2.6, 0.0, +1.3, lean);
  steamWisp(ctx, t, 6, -23, -6, 3.2, 0.46, 2.6, 0.45, -1.3, lean);

  ctx.save();
  ctx.translate(0, breath * 0.4); // cup rides the breath a touch (rigid vessel)

  // Saucer
  ctx.fillStyle = "#eef0f4";
  ctx.beginPath();
  ctx.ellipse(0, 17, 19, 4.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#a8acb8";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#d6dae2";
  ctx.beginPath();
  ctx.ellipse(0, 16.5, 9, 2.2, 0, 0, TAU);
  ctx.fill();

  // Handle — CLOSED loop, thicker (was an open comma). Drawn before the body so
  // the body rim overlaps it cleanly.
  ctx.strokeStyle = "#9a9eaa";
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.arc(13.5, 2, 6, -1.45, 1.45);
  ctx.stroke();
  ctx.strokeStyle = "#7a7e8a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(13.5, 2, 7.6, -1.4, 1.4);
  ctx.arc(13.5, 2, 4.4, 1.4, -1.4, true);
  ctx.stroke();

  // Cup body
  const cup = ctx.createLinearGradient(-13, 0, 13, 0);
  cup.addColorStop(0, "#ffffff");
  cup.addColorStop(0.5, "#f0f2f6");
  cup.addColorStop(1, "#c4c8d2");
  ctx.fillStyle = cup;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.bezierCurveTo(-13, 12, -10, 16, 0, 16);
  ctx.bezierCurveTo(10, 16, 13, 12, 13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a7e8a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Coffee surface
  const surf = ctx.createRadialGradient(-3, -6, 1, 0, -4, 14);
  surf.addColorStop(0, "#7a4a26");
  surf.addColorStop(0.6, "#4a2810");
  surf.addColorStop(1, "#2a1508");
  ctx.fillStyle = surf;
  ctx.beginPath();
  ctx.ellipse(0, -4, 12, 3.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#2a1508";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Crema sheen — drifts + breathes on the surface (clipped to the coffee).
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -4, 11.5, 3.4, 0, 0, TAU);
  ctx.clip();
  const shimX = pingPong(t, 3.0) * 6 - 3; // -3..+3 eased
  const shimA = 0.4 + Math.sin(t * 2.0) * 0.14;
  ctx.fillStyle = `rgba(200,150,90,${shimA})`;
  ctx.beginPath();
  ctx.ellipse(shimX, -5, 5, 1.6, -0.2 + Math.sin(t) * 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Cup specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -1);
  ctx.bezierCurveTo(-10, 5, -9, 10, -6, 13);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drink_tea — recentred UP (sat ~9u low), a SECOND wisp so frame 0 isn't a dead
// seam, and a real pendulum tea-bag: the tag swings from the string anchor with
// eased follow-through (the tag lags the string, overshoots, settles).
function animTea(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -8.5); // re-frame: off_y +9.1 → lift up

  const breath = breathe(t, 3.6, 0.6);
  const lean = Math.sin(t * 1.0) * 1.0;

  groundShadow(ctx, 0, 22, 19, 4.5, -breath, 0.22);

  // Two wisps now (the single wisp left no steam at t=0 on one side).
  steamWisp(ctx, t, -4, -23, -6, 3.2, 0.44, 2.8, 0.0, +1.1, lean);
  steamWisp(ctx, t, 5, -23, -6, 3.0, 0.4, 2.8, 0.5, -1.1, lean);

  ctx.save();
  ctx.translate(0, breath * 0.4);

  // Saucer
  ctx.fillStyle = "#f3ede2";
  ctx.beginPath();
  ctx.ellipse(0, 17, 19, 4.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#c0b49a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#e2d8c4";
  ctx.beginPath();
  ctx.ellipse(0, 16.5, 9, 2.2, 0, 0, TAU);
  ctx.fill();

  // Cup body
  const cup = ctx.createLinearGradient(-13, 0, 13, 0);
  cup.addColorStop(0, "#fffaf0");
  cup.addColorStop(0.5, "#f4ecdc");
  cup.addColorStop(1, "#cbbfa6");
  ctx.fillStyle = cup;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.bezierCurveTo(-13, 12, -10, 16, 0, 16);
  ctx.bezierCurveTo(10, 16, 13, 12, 13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a8c70";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Handle
  ctx.strokeStyle = "#bcaa88";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(14, 2, 5.5, -1.1, 1.1);
  ctx.stroke();

  // Amber tea surface
  const surf = ctx.createRadialGradient(-3, -6, 1, 0, -4, 14);
  surf.addColorStop(0, "#e6a040");
  surf.addColorStop(0.6, "#bf6e1c");
  surf.addColorStop(1, "#8a4810");
  ctx.fillStyle = surf;
  ctx.beginPath();
  ctx.ellipse(0, -4, 12, 3.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a3e0e";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // tea surface sheen — gentle eased shimmer (clipped to the tea)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -4, 11.5, 3.4, 0, 0, TAU);
  ctx.clip();
  const teaShimX = pingPong(t, 3.2, 0.2) * 5 - 2.5;
  ctx.fillStyle = `rgba(255,225,160,${0.45 + Math.sin(t * 1.8) * 0.12})`;
  ctx.beginPath();
  ctx.ellipse(teaShimX, -5, 5, 1.6, -0.2, 0, TAU);
  ctx.fill();
  // a faint ripple ring where the bag dips disturbs the surface
  const ripA = beat(t, 3.4, 0.5, 0.55) * 0.25;
  if (ripA > 0.01) {
    ctx.strokeStyle = `rgba(255,235,180,${ripA})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(6, -4, 6 - ripA * 6 + 3, 1.8, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // Tea-bag PENDULUM: the string hangs from a fixed anchor at the rim; the tag
  // swings with eased follow-through, lagging the string so it whips a little.
  const swing = pingPong(t, 3.4) * 2 - 1; // -1..1 eased there-and-back
  const ang = swing * 0.5; // string angle (radians)
  const tagLag = (pingPong(t, 3.4, 0.06) * 2 - 1) * 0.5; // tag lags the string
  const anchorX = 9;
  const anchorY = -5;
  const len = 11;
  const tagX = anchorX + Math.sin(ang) * len;
  const tagY = anchorY + Math.cos(ang) * len;

  ctx.strokeStyle = "#d8cab0";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.quadraticCurveTo(anchorX + Math.sin(ang) * len * 0.5 + swing * 1.2, anchorY + len * 0.5, tagX, tagY);
  ctx.stroke();

  ctx.save();
  ctx.translate(tagX, tagY);
  ctx.rotate(ang + tagLag); // follow-through: tag whips past the string angle
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(3, 0);
  ctx.lineTo(3, 6);
  ctx.lineTo(-3, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c0a868";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(150,110,40,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-1.5, 3);
  ctx.lineTo(1.5, 3);
  ctx.stroke();
  ctx.restore();

  // Cup specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -1);
  ctx.bezierCurveTo(-10, 5, -9, 10, -6, 13);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drink_beer — bubbles + foam were sub-pixel. Now: bigger/faster bubbles that
// visibly stream and pop, foam-puff pops (a puff briefly swells then relaxes), a
// slowly CREEPING head (rises as carbonation builds, then resets on a long
// loop), and a small mug bob the whole thing settles on.
function animBeer(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -1.5); // light reframe (off ~3.4,5.1) — mostly footprint

  const bob = breathe(t, 2.6, 0.7); // mug settles
  // Head creeps up over a long loop, then eases back (carbonation building).
  const headCreep = easeInOutSine(pingPong(t, 6.0)) * 2.2;

  groundShadow(ctx, 0, 22, 15, 4, -bob, 0.22);

  ctx.save();
  ctx.translate(0, bob * 0.4);

  // Mug glass body
  const glass = ctx.createLinearGradient(-12, 0, 12, 0);
  glass.addColorStop(0, "rgba(235,245,250,0.45)");
  glass.addColorStop(0.5, "rgba(210,228,235,0.2)");
  glass.addColorStop(1, "rgba(180,205,215,0.4)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(12, -10);
  ctx.closePath();
  ctx.fill();

  // Beer fill (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(12, -10);
  ctx.closePath();
  ctx.clip();
  const beer = ctx.createLinearGradient(0, -8, 0, 20);
  beer.addColorStop(0, "#ffcf4a");
  beer.addColorStop(0.5, "#f0a012");
  beer.addColorStop(1, "#c87808");
  ctx.fillStyle = beer;
  ctx.fillRect(-13, -8, 26, 30);

  // Rising bubbles — bigger, faster, growing as they climb, popping at the head.
  const beerBubbles: Array<[number, number, number]> = [
    [-6, 1.6, 0.0], [-2, 1.2, 0.32], [3, 1.5, 0.62], [7, 1.3, 0.15],
    [0, 1.8, 0.82], [-8, 1.1, 0.46], [5, 1.4, 0.9], [-4, 1.2, 0.55],
  ];
  const bottomB = 18;
  const topB = -8 + headCreep;
  beerBubbles.forEach(([bx, br, phase]) => {
    const p = loopPhase(t, 1.6, phase); // faster than before (was 0.4 speed)
    const y = bottomB - p * (bottomB - topB);
    const grow = 1 + p * 0.5; // swells as it rises
    const a = 0.75 * Math.min(1, (1 - p) * 3.2);
    const wob = Math.sin(t * 3.4 + phase * 8) * 1.0;
    ctx.fillStyle = `rgba(255,247,205,${a})`;
    ctx.beginPath();
    ctx.arc(bx + wob, y, br * grow, 0, TAU);
    ctx.fill();
  });
  ctx.restore();

  // Foamy head — rides the creep; individual puffs POP (swell then relax).
  ctx.save();
  ctx.translate(0, bob * 0.3 - headCreep);
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.bezierCurveTo(-13, -14, -8, -15, -6, -12);
  ctx.bezierCurveTo(-4, -17, 2, -16, 3, -12);
  ctx.bezierCurveTo(6, -16, 12, -14, 12, -8);
  ctx.bezierCurveTo(8, -6, -8, -6, -12, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e0d4b8";
  ctx.lineWidth = 1;
  ctx.stroke();

  // foam puffs — each pops on its own staggered beat (anticipation in `beat`).
  const foamBubbles: Array<[number, number, number, number]> = [
    [-8, -10, 1.6, 0.0], [-2, -12, 2.0, 0.25], [4, -11, 1.6, 0.55], [9, -9, 1.4, 0.8],
  ];
  foamBubbles.forEach(([fx, fy, fr, ph]) => {
    const pop = beat(t, 2.4, 0.4, ph); // 0 at rest, a single swell
    const jr = fr * (1 + pop * 0.35);
    ctx.fillStyle = `rgba(255,255,255,${0.85 + pop * 0.15})`;
    ctx.beginPath();
    ctx.arc(fx, fy - pop * 0.8, jr, 0, TAU);
    ctx.fill();
  });
  ctx.restore();

  // Glass outline + rim
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(12, -10);
  ctx.stroke();

  // Handle
  ctx.strokeStyle = "#9ab0bc";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(13, 4, 6.5, -1.0, 1.0);
  ctx.stroke();
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(13, 4, 8.2, -1.0, 1.0);
  ctx.arc(13, 4, 4.8, 1.0, -1.0, true);
  ctx.stroke();

  // Specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.bezierCurveTo(-10, 4, -10, 11, -8, 16);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drink_juice — near-dead (garnish bob 0.5px, glass rigid). Now: the orange
// slice NODS like it's sliding off the rim (eased dip + tilt with overshoot), a
// real straw glint sweeps the length, bigger streaming bubbles, and a small
// glass settle so the vessel isn't frozen.
function animJuice(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(2.0, -2.0); // re-frame (off -2.3,3.2)

  const settle = breathe(t, 2.8, 0.5); // glass settle (rigid vessel, tiny)

  groundShadow(ctx, 0, 22, 12, 4, -settle, 0.22);

  ctx.save();
  ctx.translate(0, settle * 0.35);

  // Straw (behind glass top, leaning)
  ctx.save();
  ctx.strokeStyle = "#e85a8a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(5, -18);
  ctx.lineTo(-1, 8);
  ctx.stroke();
  // straw glint — a bright bead that sweeps down the straw (seamless ping-pong).
  const gp = loopPhase(t, 2.2);
  const gx = 5 + (-1 - 5) * gp;
  const gy = -18 + (8 - -18) * gp;
  ctx.strokeStyle = "#fff0f5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(5, -18);
  ctx.lineTo(-1, 8);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${0.85 * Math.sin(gp * Math.PI)})`;
  ctx.beginPath();
  ctx.arc(gx, gy, 1.7, 0, TAU);
  ctx.fill();
  ctx.lineCap = "butt";
  ctx.restore();

  // Tall glass body (slightly tapered)
  const glass = ctx.createLinearGradient(-10, 0, 10, 0);
  glass.addColorStop(0, "rgba(235,245,250,0.5)");
  glass.addColorStop(0.5, "rgba(210,228,235,0.25)");
  glass.addColorStop(1, "rgba(180,205,215,0.45)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(9, -12);
  ctx.closePath();
  ctx.fill();

  // Juice fill (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(9, -12);
  ctx.closePath();
  ctx.clip();
  const juice = ctx.createLinearGradient(0, -8, 0, 20);
  juice.addColorStop(0, "#ffb02e");
  juice.addColorStop(0.5, "#ff8a14");
  juice.addColorStop(1, "#e06808");
  ctx.fillStyle = juice;
  ctx.fillRect(-12, -8, 24, 30);

  // rising bubbles — more of them, faster, streaming and growing toward the top
  // so the fizz reads at a glance (was too sparse/slow to notice).
  const juiceBubbles: Array<[number, number, number]> = [
    [-5, 1.4, 0.1], [3, 1.6, 0.5], [-1, 1.2, 0.75], [6, 1.4, 0.3], [1, 1.1, 0.95],
    [-7, 1.1, 0.62], [4, 1.3, 0.18], [-3, 1.0, 0.4], [7, 1.2, 0.86],
  ];
  juiceBubbles.forEach(([bx, br, phase]) => {
    const p = loopPhase(t, 1.5, phase); // faster rise
    const y = 16 - p * 24;
    const grow = 1 + p * 0.4;
    const a = 0.78 * Math.min(1, (1 - p) * 3.2);
    ctx.fillStyle = `rgba(255,237,194,${a})`;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 3.4 + phase * 7) * 1.1, y, br * grow, 0, TAU);
    ctx.fill();
  });

  // surface ripple — wavy lighter band that bobs
  const surfY = -8 + Math.sin(t * 2) * 0.6;
  ctx.fillStyle = "#ffc658";
  ctx.beginPath();
  ctx.ellipse(0, surfY, 9.4 + Math.sin(t * 2.4) * 0.6, 2.6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Glass outline
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(9, -12);
  ctx.stroke();
  // Glass rim
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -12, 9, 2.4, 0, 0, TAU);
  ctx.stroke();

  // Specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.bezierCurveTo(-8, 2, -8, 10, -7, 16);
  ctx.stroke();
  ctx.lineCap = "butt";

  // Orange slice on the rim — NODS: an eased dip + tilt with a little overshoot,
  // as if it keeps starting to slide and catching itself.
  const nodPhase = loopPhase(t, 2.6);
  const nodDip = nodPhase < 0.45 ? easeOutBack(nodPhase / 0.45, 1.8) : easeInOutSine(1 - (nodPhase - 0.45) / 0.55);
  ctx.save();
  ctx.translate(-9, -12 + nodDip * 3.4); // bigger dip so the nod reads at a glance
  ctx.rotate(-0.3 - nodDip * 0.28); // dips its outer edge as it nods
  // peel
  ctx.fillStyle = "#ff9420";
  ctx.beginPath();
  ctx.arc(0, 0, 7, -0.2, Math.PI + 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c86010";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // flesh
  ctx.fillStyle = "#ffd070";
  ctx.beginPath();
  ctx.arc(0, 0, 5.4, -0.1, Math.PI + 0.1);
  ctx.closePath();
  ctx.fill();
  // segments
  ctx.strokeStyle = "rgba(255,160,40,0.8)";
  ctx.lineWidth = 0.8;
  for (let a = 0; a <= 5; a++) {
    const ang = (a / 5) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * 5.2, Math.sin(ang) * 5.2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drink_smoothie — lively but the flecks swam too fast/wide. Now: the seeds
// SETTLE (drift down and slow near the bottom on an eased fall, narrower spread),
// the cream dollop jiggles, and exactly ONE sparkle pings per loop.
function animSmoothie(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -1.2); // re-frame (off 0.0,1.2)

  const settle = breathe(t, 3.0, 0.45);

  groundShadow(ctx, 0, 22, 12, 4, -settle, 0.22);

  ctx.save();
  ctx.translate(0, settle * 0.3);

  // Straw (behind, leaning)
  ctx.save();
  ctx.strokeStyle = "#34c0c0";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(6, -22);
  ctx.lineTo(-2, 6);
  ctx.stroke();
  ctx.strokeStyle = "#e0fafa";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, -22);
  ctx.lineTo(-2, 6);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();

  // Glass body (curvy tumbler)
  const glass = ctx.createLinearGradient(-11, 0, 11, 0);
  glass.addColorStop(0, "rgba(235,245,250,0.4)");
  glass.addColorStop(0.5, "rgba(210,228,235,0.18)");
  glass.addColorStop(1, "rgba(180,205,215,0.4)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.bezierCurveTo(-12, 0, -11, 10, -10, 16);
  ctx.bezierCurveTo(-10, 21, 10, 21, 10, 16);
  ctx.bezierCurveTo(11, 10, 12, 0, 10, -10);
  ctx.closePath();
  ctx.fill();

  // Smoothie fill (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.bezierCurveTo(-12, 0, -11, 10, -10, 16);
  ctx.bezierCurveTo(-10, 21, 10, 21, 10, 16);
  ctx.bezierCurveTo(11, 10, 12, 0, 10, -10);
  ctx.closePath();
  ctx.clip();
  const sm = ctx.createLinearGradient(0, -8, 0, 20);
  sm.addColorStop(0, "#ff8ab8");
  sm.addColorStop(0.5, "#e8487e");
  sm.addColorStop(1, "#b8245a");
  ctx.fillStyle = sm;
  ctx.fillRect(-13, -8, 26, 30);

  // thick bubbles surfacing slowly
  const smBubbles: Array<[number, number, number]> = [
    [-5, 1.6, 0.0], [4, 1.9, 0.4], [-1, 1.4, 0.7], [7, 1.5, 0.2],
  ];
  smBubbles.forEach(([bx, br, phase]) => {
    const p = loopPhase(t, 4.6, phase); // slow surfacing
    const y = 16 - p * 24;
    const a = 0.5 * Math.min(1, (1 - p) * 3);
    ctx.fillStyle = `rgba(255,200,225,${a})`;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 1.4 + phase * 6) * 0.5, y, br, 0, TAU);
    ctx.fill();
  });

  // surface ellipse — wobbles: the level bobs AND tilts so it reads as a thick
  // churning surface rather than a frozen disc (the missing "unmistakable" cue).
  const smTilt = Math.sin(t * 2.0) * 0.07;
  const smY = -8 + Math.sin(t * 1.6) * 0.8;
  ctx.fillStyle = "#ffa8cc";
  ctx.beginPath();
  ctx.ellipse(0, smY, 9.6 + Math.sin(t * 2.4) * 0.7, 2.6, smTilt, 0, TAU);
  ctx.fill();
  // a lighter crest sliding across the surface with the tilt.
  ctx.fillStyle = "rgba(255,210,232,0.7)";
  ctx.beginPath();
  ctx.ellipse(Math.sin(t * 2.0) * 3.5, smY - 0.6, 4, 1.2, smTilt, 0, TAU);
  ctx.fill();

  // berry seed flecks — SETTLE: each falls on an eased loop, slowing toward the
  // bottom, with a slow swirl drift so the churn reads (was near-static).
  ctx.fillStyle = "rgba(120,16,50,0.65)";
  for (let i = 0; i < 9; i++) {
    const ph = (i * 0.37) % 1;
    const fall = easeOutCubic(loopPhase(t, 4.0, ph)); // faster, fast top slow bottom
    const fy = -6 + fall * 13; // -6..7, decelerating
    const fx = -7 + i * 1.75 + Math.sin(i * 1.3 + t * 1.2) * 1.8; // visible swirl drift
    ctx.beginPath();
    ctx.arc(fx, fy, 1.0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Glass outline + rim
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.bezierCurveTo(-12, 0, -11, 10, -10, 16);
  ctx.bezierCurveTo(-10, 21, 10, 21, 10, 16);
  ctx.bezierCurveTo(11, 10, 12, 0, 10, -10);
  ctx.stroke();

  // Dollop / swirl of cream on top — jiggles (squash & stretch about its base).
  const jig = 1 + Math.sin(t * 3.0) * 0.06;
  ctx.save();
  ctx.translate(0, -9);
  ctx.scale(1 / jig, jig);
  ctx.translate(0, 9);
  ctx.fillStyle = "#fff4f8";
  ctx.beginPath();
  ctx.moveTo(-7, -9);
  ctx.bezierCurveTo(-8, -14, -2, -14, -2, -10);
  ctx.bezierCurveTo(-1, -16, 6, -15, 5, -10);
  ctx.bezierCurveTo(8, -12, 9, -8, 6, -8);
  ctx.bezierCurveTo(2, -7, -4, -7, -7, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e8d4dc";
  ctx.lineWidth = 1;
  ctx.stroke();
  // dollop highlight
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-1, -12, 2, 1.2, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();

  // ONE clean sparkle pings near the dollop per loop (was a thin twinkle cross).
  sparkle(ctx, 7, -14, 1.3 + twinkle(t, 3.0) * 1.4, twinkle(t, 3.0), "255,245,250");

  // Glass rim line
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, -10, 10, 2.4, 0, Math.PI, 0);
  ctx.stroke();

  // Specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.bezierCurveTo(-9, 2, -9, 10, -7, 15);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drink_water — the GOLD STANDARD (Ship). Keep its independent ice clink +
// bubbles + sweep; the only adds: a CAUSE/EFFECT ripple where an ice cube
// settles into the surface, and a 2nd face tone on the cubes (a cool back face)
// so they read 3-D.
function animWater(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -3.0); // gentle reframe (off 0.0,4.4)

  groundShadow(ctx, 0, 22, 12, 4, 0, 0.2);

  // Glass body (tapered tumbler)
  const glass = ctx.createLinearGradient(-11, 0, 11, 0);
  glass.addColorStop(0, "rgba(225,240,248,0.55)");
  glass.addColorStop(0.5, "rgba(200,225,235,0.25)");
  glass.addColorStop(1, "rgba(175,205,218,0.5)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.fill();

  // Water fill (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.clip();
  const water = ctx.createLinearGradient(0, -8, 0, 20);
  water.addColorStop(0, "rgba(150,210,235,0.7)");
  water.addColorStop(0.5, "rgba(90,175,215,0.7)");
  water.addColorStop(1, "rgba(50,140,190,0.8)");
  ctx.fillStyle = water;
  ctx.fillRect(-13, -8, 26, 30);

  // The lead ice cube bobs on this phase; we reuse it to drive the surface ripple
  // so the cause (cube dipping) and effect (rings) are coupled.
  const leadDip = Math.sin(t * 1.9); // matches ice[0]'s vertical sine
  // surface ellipse — gentle ripple; the surface dips a hair when the cube sinks.
  ctx.fillStyle = "rgba(190,230,245,0.8)";
  ctx.beginPath();
  ctx.ellipse(0, -8 + Math.sin(t * 1.8) * 0.4 + leadDip * 0.3, 9.6, 2.4, 0, 0, TAU);
  ctx.fill();
  // cause/effect ripple ring: expands+fades right after the lead cube plunges
  // (when leadDip swings downward through its trough).
  const plunge = beat(t, (TAU / 1.9), 0.4, 0.5); // one ring per cube cycle
  if (plunge > 0.01) {
    ctx.strokeStyle = `rgba(220,242,252,${plunge * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-4, -8, 2 + plunge * 8, 1 + plunge * 2.2, 0, 0, TAU);
    ctx.stroke();
  }

  // Ice cubes — bob and clink (each rocks with its own phase). Now drawn with a
  // lit front face + a cooler back face so they read as solid blocks.
  const ice: Array<[number, number, number, number]> = [
    [-4, -2, 0.2, 0.0], [5, 2, -0.3, 1.6], [-1, 7, 0.1, 3.0],
  ];
  ice.forEach(([ix, iy, rot, ph]) => {
    ctx.save();
    // bigger bob + rock so the ice visibly clinks/jostles (was easy to miss).
    ctx.translate(ix + Math.sin(t * 1.4 + ph) * 1.1, iy + Math.sin(t * 1.9 + ph) * 1.3);
    ctx.rotate(rot + Math.sin(t * 1.6 + ph) * 0.14);
    // back/under face (cooler tone) — offset so a corner of it shows.
    ctx.fillStyle = "rgba(150,195,225,0.5)";
    ctx.beginPath();
    ctx.rect(-3, -3, 8, 8);
    ctx.fill();
    // front/lit face
    ctx.fillStyle = "rgba(235,248,255,0.65)";
    ctx.beginPath();
    ctx.rect(-4, -4, 8, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // ice inner highlight
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.lineTo(-2, 2);
    ctx.lineTo(3, 2);
    ctx.stroke();
    ctx.restore();
  });

  // small rising bubbles
  const waterBubbles: Array<[number, number, number]> = [
    [7, 1.0, 0.0], [-6, 0.9, 0.5], [2, 0.7, 0.8],
  ];
  waterBubbles.forEach(([bx, br, phase]) => {
    const p = loopPhase(t, 2.0, phase);
    const y = 16 - p * 24;
    const a = 0.7 * Math.min(1, (1 - p) * 3);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 3 + phase * 7) * 0.5, y, br, 0, TAU);
    ctx.fill();
  });
  ctx.restore();

  // Glass outline + rim
  ctx.strokeStyle = "#7a9aa8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(10, -14);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -14, 10, 2.4, 0, 0, TAU);
  ctx.stroke();

  // Specular streak — base
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.bezierCurveTo(-9, 0, -9, 9, -8, 16);
  ctx.stroke();
  ctx.lineCap = "butt";

  // Clean glint sweeping across the glass and looping (clip to the glass).
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.clip();
  glint(ctx, loopPhase(t, 3.4), { span: 14, width: 5, angle: -0.18, intensity: 0.32, length: 44 });
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drink_wine — was one rigid disc rotating in place, and it poked past the glass
// walls. Now: the whole glass tilts (rigid vessel rock), and the wine is a
// phase-LAGGED wall-climbing slosh — the surface tilts opposite the glass and
// the liquid piles up the leading wall — all CLIPPED to the bowl so nothing
// escapes the silhouette.
function animWine(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.0); // re-frame (off 0.0,3.1)

  // Glass rock: a slow eased tilt about the foot.
  const glassTilt = Math.sin(t * 1.0) * 0.05; // radians

  groundShadow(ctx, glassTilt * 30, 22, 12, 4, 0, 0.22);

  ctx.save();
  ctx.translate(0, 19); // pivot at the foot
  ctx.rotate(glassTilt);
  ctx.translate(0, -19);

  // Stem
  ctx.strokeStyle = "rgba(200,215,222,0.85)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, 18);
  ctx.stroke();
  // Foot / base
  ctx.fillStyle = "rgba(220,232,238,0.85)";
  ctx.beginPath();
  ctx.ellipse(0, 19, 9, 2.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#9ab0bc";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Bowl glass
  const glass = ctx.createLinearGradient(-12, 0, 12, 0);
  glass.addColorStop(0, "rgba(235,245,250,0.5)");
  glass.addColorStop(0.5, "rgba(210,228,235,0.22)");
  glass.addColorStop(1, "rgba(180,205,215,0.45)");
  ctx.fillStyle = glass;
  const bowlPath = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(-12, -16);
    c.bezierCurveTo(-12, -2, -8, 4, 0, 4);
    c.bezierCurveTo(8, 4, 12, -2, 12, -16);
    c.closePath();
  };
  bowlPath(ctx);
  ctx.fill();

  // Wine — CLIPPED to the bowl so the slosh can climb the walls without leaking.
  ctx.save();
  bowlPath(ctx);
  ctx.clip();
  const wine = ctx.createLinearGradient(0, -8, 0, 6);
  wine.addColorStop(0, "#a01838");
  wine.addColorStop(0.6, "#6e0e26");
  wine.addColorStop(1, "#3a0414");
  ctx.fillStyle = wine;
  ctx.fillRect(-13, -8, 26, 16);

  // Wall-climbing slosh: the surface tilts OPPOSITE the glass (phase-lagged), and
  // we draw it as a tilted polygon whose high side rides up the leading wall.
  // A bit more amplitude so the swirl reads as an active drink, not a still pour.
  const surfTilt = -glassTilt * 1.6 + Math.sin(t * 1.3 - 0.5) * 0.1; // lags glass
  const cy = -8 + Math.cos(t * 1.3) * 0.7;
  const dx = 12;
  const dyL = -Math.sin(surfTilt) * dx; // left-edge lift
  const dyR = Math.sin(surfTilt) * dx; // right-edge lift
  ctx.fillStyle = "#c42848";
  ctx.beginPath();
  ctx.moveTo(-dx, cy + dyL);
  ctx.quadraticCurveTo(0, cy - 1.4, dx, cy + dyR);
  ctx.lineTo(dx, 8);
  ctx.lineTo(-dx, 8);
  ctx.closePath();
  ctx.fill();
  // surface highlight band — a traveling glint that sweeps across the surface as
  // the wine swirls (the clearest "this is moving" cue at a glance).
  const glintX = Math.sin(t * 1.3 - 0.5) * 6.5;
  ctx.fillStyle = "rgba(235,110,140,0.6)";
  ctx.beginPath();
  ctx.ellipse(glintX, cy - 0.5, 4.5, 1.3, surfTilt, 0, TAU);
  ctx.fill();
  // a brighter crest where the wine piles against the leading wall.
  const crestX = surfTilt > 0 ? 9 : -9;
  ctx.fillStyle = "rgba(170,28,60,0.4)";
  ctx.beginPath();
  ctx.ellipse(crestX, cy + Math.abs(dyR) * 0.4, 4.5, 2.4, surfTilt, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Glass outline + rim
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 2;
  bowlPath(ctx);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -16, 12, 3, 0, 0, TAU);
  ctx.stroke();

  // Glossy sheen on bowl — base
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.bezierCurveTo(-9, -6, -8, -1, -5, 2);
  ctx.stroke();
  ctx.lineCap = "butt";

  // Specular sheen sweeping the bowl (clip to the bowl, feathered).
  ctx.save();
  bowlPath(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 4.0), { span: 12, width: 6, angle: -0.3, intensity: 0.3, length: 30 });
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drink_milk — the DEADEST (0.57): its shimmer was occluded by the opaque fill.
// Now: a settling BOB the whole bottle rides on; a visible CREAM MENISCUS that
// climbs the inner wall as the milk settles; a real SHOULDER GLINT (drawn over
// the glass, not buried under milk); and a CAP JIGGLE that pops on a beat.
function animMilk(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -1.0); // re-frame (off 0.0,1.1)

  const bob = breathe(t, 3.0, 0.7); // settling bob (rigid bottle)
  const capPop = beat(t, 3.0, 0.3, 0.05); // a tiny cap jiggle just after the settle

  groundShadow(ctx, 0, 22, 13, 4, -bob, 0.22);

  ctx.save();
  ctx.translate(0, bob * 0.4);

  // Bottle body — rounded shoulders, narrow neck
  const body = ctx.createLinearGradient(-11, 0, 11, 0);
  body.addColorStop(0, "rgba(235,245,250,0.92)");
  body.addColorStop(0.5, "rgba(210,228,235,0.6)");
  body.addColorStop(1, "rgba(170,195,205,0.8)");
  ctx.fillStyle = body;
  const bottlePath = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(-4, -18);
    c.lineTo(-4, -12);
    c.bezierCurveTo(-11, -8, -11, -4, -11, 0);
    c.lineTo(-11, 16);
    c.bezierCurveTo(-11, 21, 11, 21, 11, 16);
    c.lineTo(11, 0);
    c.bezierCurveTo(11, -4, 11, -8, 4, -12);
    c.lineTo(4, -18);
    c.closePath();
  };
  bottlePath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#5a6a72";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Milk fill (clipped to body)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(11, 0);
  ctx.closePath();
  ctx.clip();
  const milk = ctx.createLinearGradient(0, -4, 0, 20);
  milk.addColorStop(0, "#ffffff");
  milk.addColorStop(0.5, "#fbf8f2");
  milk.addColorStop(1, "#ede6d8");
  ctx.fillStyle = milk;
  ctx.fillRect(-12, -6, 26, 28); // top a touch above the surface so the bob never gaps

  // Milk SURFACE — bobs clearly (the level sways) and TILTS a touch so the white
  // milk isn't a frozen white-on-white slab. A cool shadow band just under the
  // surface line gives the level real contrast against the opaque milk (the old
  // white-on-white ellipse was invisible — the core "dead" defect).
  const slosh = Math.sin(t * 1.9) * 0.06; // surface tilt (radians), the lead motion
  const surfY = -4 - bob * 0.7; // bigger level sway so the bob actually reads
  // shaded trough just below the surface — this is what makes the level visible.
  ctx.fillStyle = "rgba(196,210,222,0.55)";
  ctx.beginPath();
  ctx.ellipse(0, surfY + 1.6, 10.6, 2.4, slosh, 0, TAU);
  ctx.fill();
  // milk surface disc — faintly cool so it reads as a meniscus, not blank milk.
  ctx.fillStyle = "#f4f7fb";
  ctx.beginPath();
  ctx.ellipse(0, surfY, 11, 3, slosh, 0, TAU);
  ctx.fill();
  // CREAM MENISCUS — a creamy rim that climbs the inner walls as the milk
  // settles (reads as the liquid wetting the glass); darker so it's visible.
  const climb = (bob + 0.7) * 0.5; // 0..~0.7, rises with the settle
  ctx.strokeStyle = `rgba(214,224,234,${0.7 + capPop * 0.2})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, surfY, 10.4, 2.6 + climb, slosh, 0, TAU);
  ctx.stroke();
  // bright crest catching the light on the rising side of the slosh.
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(-4 + slosh * 40, surfY - 0.6, 3.6, 1.3, slosh, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Glass specular streak — base
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -6);
  ctx.bezierCurveTo(-9, 2, -9, 10, -7, 16);
  ctx.stroke();
  ctx.lineCap = "butt";

  // SHOULDER GLINT — a real feathered sheen on the glass shoulder, drawn ON TOP
  // of the bottle (clipped to its silhouette) so it isn't occluded by the fill.
  ctx.save();
  bottlePath(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.6), { span: 14, width: 6, angle: -0.5, intensity: 0.42, length: 34 });
  ctx.restore();

  // Neck collar
  ctx.fillStyle = "#dde6ea";
  ctx.beginPath();
  ctx.rect(-4.5, -13, 9, 2);
  ctx.fill();
  ctx.strokeStyle = "#5a6a72";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Red-and-white checked cap — JIGGLES: a tiny squash + rock on the pop beat,
  // pivoting at the neck.
  ctx.save();
  ctx.translate(0, -17);
  ctx.rotate(capPop * 0.06 * Math.sin(t * 9));
  ctx.scale(1 + capPop * 0.06, 1 - capPop * 0.05);
  ctx.translate(0, 17);
  const capW = 5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-capW, -22, capW * 2, 5);
  ctx.clip();
  ctx.fillStyle = "#f4ece0";
  ctx.fillRect(-capW, -22, capW * 2, 5);
  ctx.fillStyle = "#d8344a";
  for (let cx = -capW; cx < capW; cx += 2.5) {
    for (let cy = -22; cy < -17; cy += 2.5) {
      if (Math.round((cx + cy) / 2.5) % 2 === 0) {
        ctx.fillRect(cx, cy, 2.5, 2.5);
      }
    }
  }
  ctx.restore();
  // Cap rounded top
  ctx.fillStyle = "#d8344a";
  ctx.beginPath();
  ctx.ellipse(0, -22, capW, 1.8, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = "#8a1a2a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(-capW, -22, capW * 2, 5);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  drink_coffee: animCoffee,
  drink_tea: animTea,
  drink_beer: animBeer,
  drink_juice: animJuice,
  drink_smoothie: animSmoothie,
  drink_water: animWater,
  drink_wine: animWine,
  drink_milk: animMilk,
};
