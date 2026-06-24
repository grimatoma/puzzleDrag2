// Reef — animated sea creatures & harbor icons for the Fish/Harbor biome.
// Same look as the static icons in `src/textures/categories/reef.ts`, but alive.
// Each fn redraws the WHOLE icon at time `t` (seconds) and loops seamlessly via
// `loopPhase`/`pingPong`/`breathe`/`beat` (drive position off `t`, never a raw
// sawtooth). The first-draft idles moved rigid bodies by a global transform
// (starfish 360° spin, crab side-slide, seahorse centre-hinge rock) over a
// frozen silhouette; this rebuild leads with REAL deformation — a traveling
// S-flex, per-arm curls, an eased jet pulse, an alternating-leg gait — applies
// the 12 principles (eased timing, anticipation, overshoot, follow-through),
// couples shadows to vertical motion via `groundShadow`, and rebuilds the
// lighthouse beam into one front-sweeping beacon flash. Silhouettes & palettes
// are preserved; only MOTION and FRAMING change.

import {
  TAU,
  lerp,
  breathe,
  loopPhase,
  pingPong,
  beat,
  easeInOutSine,
  easeOutBack,
  groundShadow,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// reef_jellyfish — the bell does an EASED jet-propulsion pulse (quick contract +
// rise on a beat, slow relaxed sink) instead of a metronomic squash; the
// tentacles and oral arms trail with overlap (they lag the bell), and a ground
// shadow now couples to the rise so it reads as swimming, not bobbing in place.
function animJellyfish(ctx: CanvasRenderingContext2D, t: number): void {
  // Jet cycle: a brief eased contraction (the power stroke) then a long glide.
  const period = 2.6;
  const jet = beat(t, period, 0.34); // 0 at rest, eased 0→1→0 during the stroke
  // Bell squashes flatter+wider on the power stroke, then eases back to relaxed.
  const sx = 1 + jet * 0.14; // wider when it jets
  const sy = 1 - jet * 0.16; // flatter when it jets
  // Thrust lifts the creature during the stroke and it sinks slowly between.
  const glide = (loopPhase(t, period) - 0.5) * 2; // slow -1..1 drift
  const lift = jet * 5.5 - glide * 1.6; // rises on the jet, sinks on the glide
  const bob = -lift;

  groundShadow(ctx, 0, 24, 11, 3, lift, 0.22);

  ctx.save();
  ctx.translate(0, bob);

  // Soft glow behind the bell — pulses brighter on the power stroke.
  const glowR = 23 + jet * 4;
  const glowA = 0.5 + jet * 0.22;
  const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, glowR);
  glow.addColorStop(0, `rgba(120,200,255,${glowA})`);
  glow.addColorStop(0.5, "rgba(90,160,240,0.2)");
  glow.addColorStop(1, "rgba(90,160,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, glowR, 0, TAU);
  ctx.fill();

  // Trailing tentacles — a traveling wave that LAGS the bell (overlap/follow-
  // through): they stretch and stream out as the bell jets up.
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  const trail = lift * 0.5; // tentacles drift down/behind as the bell lifts
  const strands = [-9, -5, -1, 3, 7];
  strands.forEach((sxp, i) => {
    ctx.strokeStyle = i % 2 === 0 ? "rgba(150,210,255,0.85)" : "rgba(190,160,240,0.8)";
    const dir = i % 2 === 0 ? 1 : -1;
    const lag = i * 0.45;
    const w1 = Math.sin(t * 2.6 - 0.6 + lag) * 4 * dir;
    const w2 = Math.sin(t * 2.6 - 1.4 + lag) * 4.4 * dir;
    const w3 = Math.sin(t * 2.6 - 2.2 + lag) * 3.2 * dir;
    ctx.beginPath();
    ctx.moveTo(sxp, 4);
    ctx.bezierCurveTo(
      sxp + 4 * dir + w1, 10 + trail * 0.4,
      sxp - 4 * dir + w2, 16 + trail * 0.7,
      sxp + 2 * dir + w3, 22 + trail,
    );
    ctx.stroke();
  });

  // Short frilly oral arms — sway, lagging slightly behind the bell.
  ctx.strokeStyle = "rgba(220,200,255,0.9)";
  ctx.lineWidth = 2.2;
  [-4, 0, 4].forEach((sxp, i) => {
    const w = Math.sin(t * 2.8 - 0.5 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(sxp, 4);
    ctx.quadraticCurveTo(sxp + 2 + w, 9 + trail * 0.3, sxp + w * 0.6, 14 + trail * 0.5);
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // Bell — translucent dome, squash/stretch about its rim.
  ctx.save();
  ctx.translate(0, 4);
  ctx.scale(sx, sy);
  ctx.translate(0, -4);
  const bell = ctx.createRadialGradient(-3, -8, 2, 0, -4, 16);
  bell.addColorStop(0, "rgba(220,245,255,0.95)");
  bell.addColorStop(0.55, "rgba(120,185,245,0.8)");
  bell.addColorStop(1, "rgba(70,120,210,0.7)");
  ctx.fillStyle = bell;
  ctx.strokeStyle = "rgba(60,100,180,0.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, 4);
  ctx.bezierCurveTo(-15, -16, 15, -16, 14, 4);
  // scalloped lower rim — flexes inward as the bell contracts (jet).
  const r = jet * 2.2;
  ctx.bezierCurveTo(11, 8 - r, 9, 1, 6, 6 - r);
  ctx.bezierCurveTo(3, 1, 0, 8 - r, -3, 4);
  ctx.bezierCurveTo(-6, 8 - r, -9, 1, -11, 6 - r);
  ctx.bezierCurveTo(-13, 7, -13, 6, -14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Inner bell tint markings
  ctx.fillStyle = "rgba(150,120,220,0.4)";
  ([[-5, -4], [3, -5], [-1, -1]] as Array<[number, number]>).forEach(([mx, my]) => {
    ctx.beginPath();
    ctx.ellipse(mx, my, 2.4, 3.4, 0, 0, TAU);
    ctx.fill();
  });
  // Bell specular highlight
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-6, -8, 2.4, 4.5, -0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(3, -9, 1.2, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// reef_octopus — re-centred UP (sat ~7u low); the arms now curl with real
// amplitude from the BASE while the suckered tips barely travel (anchored
// follow-through), the head gently bobs, and the gloss that read as a horn is
// softened to a rounder low-contrast sheen.
function animOctopus(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -6.8); // re-frame: was sitting ~7u low (off_y +6.8)

  // Head bobs gently (eased breathing, not a bare sine slam).
  const bob = breathe(t, 2.4, 1.5);

  groundShadow(ctx, 0, 28.8, 16, 4, bob, 0.24);

  // Tentacles — curl with a wave that PEAKS at the base/mid and tapers to the
  // tip, so the arms flex strongly while the suckered tips stay near their rest.
  const tentacles: Array<[number, number, number, number, number, number]> = [
    [-12, 4, -22, 14, -16, 22],
    [-7, 8, -12, 18, -6, 23],
    [-2, 9, -2, 18, -4, 24],
    [3, 9, 4, 18, 2, 24],
    [8, 8, 13, 18, 8, 23],
    [13, 4, 22, 14, 17, 22],
  ];
  tentacles.forEach(([x1, y1, cx, cy, x2, y2], i) => {
    const dir = x1 < 0 ? -1 : 1; // outer arms curl outward
    const ph = t * 2.4 + i * 0.85;
    // Mid control sweeps the most (the curl); the tip lags and is damped.
    const wMid = Math.sin(ph) * 6 * (1 + Math.abs(x1) / 22);
    const curlY = Math.cos(ph) * 2.2;
    const wTip = Math.sin(ph - 0.9) * 1.8 * dir; // tip barely moves, lags the curl
    const cxA = cx + wMid;
    const cyA = cy + curlY;
    const x2A = x2 + wTip;
    const y2A = y2 + Math.sin(ph - 0.5) * 1.0;
    const g = ctx.createLinearGradient(x1, y1, x2A, y2A);
    g.addColorStop(0, "#b066d6");
    g.addColorStop(1, "#7a2aa6");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#4a1066";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x1 - 2, y1 + bob);
    ctx.quadraticCurveTo(cxA - 2, cyA, x2A, y2A);
    ctx.quadraticCurveTo(x2A + 2, y2A + 1, x2A + 2, y2A - 1);
    ctx.quadraticCurveTo(cxA + 3, cyA, x1 + 2, y1 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // suckers — ride along the curling arm
    ctx.fillStyle = "rgba(255,210,240,0.7)";
    for (let s = 0.45; s <= 0.85; s += 0.2) {
      const sxx = lerp(x1, x2A, s) + wMid * 0.25 * (1 - s);
      const syy = lerp(y1 + bob, y2A, s);
      ctx.beginPath();
      ctx.arc(sxx, syy, 1.1, 0, TAU);
      ctx.fill();
    }
  });

  ctx.save();
  ctx.translate(0, bob);

  // Head — domed mantle.
  const head = ctx.createRadialGradient(-4, -8, 2, 0, -2, 18);
  head.addColorStop(0, "#d49aee");
  head.addColorStop(0.55, "#a050d0");
  head.addColorStop(1, "#5a1888");
  ctx.fillStyle = head;
  ctx.strokeStyle = "#4a1066";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.bezierCurveTo(-16, -16, 16, -16, 14, 6);
  ctx.bezierCurveTo(8, 12, -8, 12, -14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Mantle gloss — a soft rounded sheen that hugs the dome (no longer a tall
  // tilted ellipse that poked up like a horn).
  const gloss = ctx.createRadialGradient(-4, -7, 1, -4, -7, 7);
  gloss.addColorStop(0, "rgba(255,255,255,0.4)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.ellipse(-4, -7, 5, 4.5, -0.2, 0, TAU);
  ctx.fill();

  // Blink: brief periodic closure (~every 3.2s), eased.
  const blinkPhase = t % 3.2;
  const blinking = blinkPhase < 0.16;
  const lid = blinking ? Math.sin((1 - Math.abs(blinkPhase - 0.08) / 0.08) * (Math.PI / 2)) : 0;

  // Eyes
  ([-6, 6] as number[]).forEach((ex) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, -2, 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#4a1066";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#0a1018";
    ctx.beginPath();
    ctx.arc(ex + (ex < 0 ? 0.6 : -0.6), -1, 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(ex - 0.6, -2.8, 0.9, 0, TAU);
    ctx.fill();
    if (lid > 0) {
      ctx.fillStyle = "#a050d0";
      ctx.beginPath();
      ctx.ellipse(ex, -2, 4.2, 4.2 * lid, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  });

  // Little smile
  ctx.strokeStyle = "rgba(74,16,102,0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 3, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// reef_crab — re-centred up; the whole rigid side-slide is replaced by a body
// TILT (rock about the contact point) with an alternating-leg gait (two leg
// groups step out of phase, planting and lifting) and a staggered single-claw
// THREAT display: one claw rears and snaps on a beat, then the other later —
// rather than both buzzing in sync. Eye stalks wiggle as secondary motion.
function animCrab(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -3); // re-frame: was sitting ~3u low (off_y +3.0)

  // Body rocks with a gentle eased tilt (rotation about the contact point),
  // bobbing slightly with the gait instead of sliding sideways.
  const tilt = pingPong(t, 2.2) * 2 - 1; // -1..1 eased
  const rot = tilt * 0.07;
  const gaitBob = Math.abs(tilt) * 0.8;

  groundShadow(ctx, 0, 25 - gaitBob, 18, 4, gaitBob, 0.26);

  ctx.save();
  ctx.translate(0, 9 - gaitBob);
  ctx.rotate(rot);
  ctx.translate(0, -9);

  // Legs — three per side. Two interleaved groups step out of phase: a planted
  // group holds while the swing group lifts and reaches (an alternating gait).
  ctx.strokeStyle = "#7a1c08";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  const legs: Array<[number, number, number, number, number, number]> = [
    [-9, 6, -18, 8, -20, 14],
    [-10, 9, -18, 14, -19, 19],
    [-8, 11, -14, 17, -13, 21],
    [9, 6, 18, 8, 20, 14],
    [10, 9, 18, 14, 19, 19],
    [8, 11, 14, 17, 13, 21],
  ];
  legs.forEach(([x1, y1, x2, y2, x3, y3], i) => {
    const group = (i % 2 === 0) ? 0 : Math.PI; // interleave swing/stance
    const step = Math.sin(t * 4 + group); // -1..1 gait cycle
    const swing = Math.max(0, step); // only lifts on the swing half
    const reach = (x3 < 0 ? -1 : 1) * step * 1.6; // foot reaches forward/back
    const lift = swing * 2.2; // foot lifts off the ground
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x2, y2 - lift * 0.4, x3 + reach, y3 - lift);
    ctx.stroke();
  });

  // Claws — staggered single-claw threat display. Each claw rears (anticipation
  // dip) then snaps with an overshoot; the right leads, the left follows half a
  // cycle later, so they never buzz in unison.
  const clawFill = (cx: number): CanvasGradient => {
    const g = ctx.createRadialGradient(cx - 2, -2, 1, cx, 0, 9);
    g.addColorStop(0, "#ff9a5a");
    g.addColorStop(0.6, "#e0541c");
    g.addColorStop(1, "#9a2c08");
    return g;
  };
  // Per-claw display envelope over a 2.8s cycle: anticipation → rear+snap → ease back.
  const display = (offset: number): { rear: number; snap: number } => {
    const u = loopPhase(t, 2.8, offset);
    if (u < 0.12) {
      // anticipation: claw dips/coils slightly before the strike
      const a = u / 0.12;
      return { rear: -0.12 * Math.sin(a * (Math.PI / 2)), snap: 0 };
    }
    if (u < 0.5) {
      // strike: rear up high with an overshoot, claw springs OPEN then SHUT
      const a = (u - 0.12) / 0.38;
      const rear = easeOutBack(a, 2.4) * 1.0;
      const snap = Math.sin(a * Math.PI); // open at the apex, shut by the end
      return { rear, snap };
    }
    // recover: ease back down to rest
    const a = (u - 0.5) / 0.5;
    return { rear: (1 - easeInOutSine(a)) * 1.0, snap: 0 };
  };

  ([[-1, 0.0], [1, 0.5]] as Array<[number, number]>).forEach(([s, off]) => {
    const { rear, snap } = display(off);
    const open = snap * 6; // pixels the upper finger lifts when it gapes
    ctx.save();
    ctx.translate(s * 16, -2 - rear * 6); // claw rears upward on the display
    ctx.rotate(s * rear * 0.4); // and rotates outward in threat
    ctx.scale(s, 1);
    // upper arm
    ctx.strokeStyle = "#9a2c08";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.quadraticCurveTo(-2, 2, 2, -4);
    ctx.stroke();
    // pincer body
    ctx.fillStyle = clawFill(0);
    ctx.strokeStyle = "#5a1404";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(2, -4, 8, 6, -0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // pincer fingers — upper finger gapes open by `open`.
    ctx.beginPath();
    ctx.moveTo(7, -8 - open);
    ctx.quadraticCurveTo(13, -10 - open, 12, -4 - open);
    ctx.quadraticCurveTo(9, -5 - open * 0.5, 6, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.quadraticCurveTo(12, 0, 11, 3);
    ctx.quadraticCurveTo(7, 1, 4, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // Body — wide rounded carapace.
  const body = ctx.createRadialGradient(-4, -2, 2, 0, 2, 18);
  body.addColorStop(0, "#ff8c52");
  body.addColorStop(0.55, "#e0541c");
  body.addColorStop(1, "#9a2c08");
  ctx.fillStyle = body;
  ctx.strokeStyle = "#5a1404";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.bezierCurveTo(-16, -8, -8, -12, 0, -12);
  ctx.bezierCurveTo(8, -12, 16, -8, 16, 2);
  ctx.bezierCurveTo(12, 9, -12, 9, -16, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Carapace highlight band
  ctx.strokeStyle = "rgba(255,220,180,0.6)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.quadraticCurveTo(0, -10, 11, -4);
  ctx.stroke();
  // Little texture bumps
  ctx.fillStyle = "rgba(90,20,4,0.4)";
  ([[-7, 2], [0, 4], [7, 2]] as Array<[number, number]>).forEach(([bx, by]) => {
    ctx.beginPath();
    ctx.arc(bx, by, 1.2, 0, TAU);
    ctx.fill();
  });

  // Eye stalks — perk up and wiggle, leaning into the rock direction.
  ctx.strokeStyle = "#9a2c08";
  ctx.lineWidth = 2;
  const stalkWig = Math.sin(t * 4.5) * 1.2 + tilt * 1.2;
  const eyeX = (ex: number): number => ex + (ex < 0 ? -1 : 1) * stalkWig * 0.5;
  ([-5, 5] as number[]).forEach((ex) => {
    ctx.beginPath();
    ctx.moveTo(ex, -10);
    ctx.lineTo(eyeX(ex), -16);
    ctx.stroke();
  });
  ([-5, 5] as number[]).forEach((ex) => {
    const tx = eyeX(ex);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(tx, -17, 2.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#5a1404";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#0a1018";
    ctx.beginPath();
    ctx.arc(tx, -17, 1.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(tx - 0.6, -17.6, 0.5, 0, TAU);
    ctx.fill();
  });
  ctx.lineCap = "butt";

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// reef_seahorse — the dead centre-hinge rock is replaced by a real S-spine flex:
// a traveling bend runs head→tail so the body undulates, the curled tail uncurls
// and re-curls, and the dorsal fin is slowed from a freq-14 buzz to a gentle
// traveling ripple. Re-framed slightly and given a soft hover bob.
function animSeahorse(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(1.9, -1.9); // re-frame: off (-1.9, +1.9)

  // Hover bob (gentle, eased) + a slow S-flex phase that travels down the spine.
  const bob = breathe(t, 2.2, 1.6);
  const flex = Math.sin(t * 1.5); // -1..1 spine flex driver

  groundShadow(ctx, 0, 22, 11, 3, bob, 0.22);

  ctx.save();
  ctx.translate(0, bob);

  // Body — S-curve. The control points shift on the flex so the curve undulates
  // (the back arches more / less, the tail swings) instead of the whole sprite
  // pivoting about its centre.
  const a = flex; // head-region phase
  const b = Math.sin(t * 1.5 - 0.9); // belly/tail lags (traveling wave)
  const g = ctx.createLinearGradient(-8, -18, 8, 18);
  g.addColorStop(0, "#ffe070");
  g.addColorStop(0.5, "#f0b028");
  g.addColorStop(1, "#b07808");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#7a4e08";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-12, -16 + a * 0.8);
  ctx.quadraticCurveTo(-2, -22 + a * 1.2, 4 + a * 1.5, -14);
  // back arches with the head-phase
  ctx.bezierCurveTo(10 + a * 2.2, -4, 6 + b * 2, 6, 2 + b * 2.4, 12);
  // curled tail uncurls/recurls with the lagging tail-phase
  ctx.bezierCurveTo(0 + b * 2, 18 + b * 1.5, 8 + b * 1.5, 20 + b, 8 + b * 2, 14);
  ctx.bezierCurveTo(8 + b * 1.5, 10, 3 + b, 10, 4 + b, 14);
  ctx.bezierCurveTo(1 + b, 8, 0, 0, -4 - a * 0.6, -6);
  ctx.bezierCurveTo(-6 - a * 0.4, -10, -8, -12, -8, -14 + a * 0.6);
  ctx.lineTo(-12, -16 + a * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Snout — tracks the head bend.
  ctx.strokeStyle = "#7a4e08";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -15 + a * 0.7);
  ctx.lineTo(-15, -15 + a * 1.1);
  ctx.stroke();
  ctx.lineCap = "butt";

  // Dorsal fin — a slow traveling ripple (was a freq-14 buzz, ~8× too fast).
  ctx.fillStyle = "rgba(255,240,170,0.8)";
  ctx.strokeStyle = "#b07808";
  ctx.lineWidth = 1;
  const f1 = Math.sin(t * 5.0) * 1.4;
  const f2 = Math.sin(t * 5.0 - 0.7) * 1.6;
  const f3 = Math.sin(t * 5.0 - 1.4) * 1.4;
  const fx = a * 1.6; // fin sits on the arching back
  ctx.beginPath();
  ctx.moveTo(5 + fx, -12);
  ctx.quadraticCurveTo(12 + f1 + fx, -8, 10 + f1 + fx, -2);
  ctx.quadraticCurveTo(13 + f2 + fx, -5, 9 + f2 + fx, 2);
  ctx.quadraticCurveTo(11 + f3 + fx, -2, 6 + fx, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body ridge segments
  ctx.strokeStyle = "rgba(122,78,8,0.5)";
  ctx.lineWidth = 1;
  for (let s = 0; s < 4; s++) {
    const yy = -8 + s * 4;
    const sh = lerp(a, b, s / 3) * 0.8; // ridges shear with the local flex
    ctx.beginPath();
    ctx.moveTo(-5 + s * 0.5 + sh, yy);
    ctx.lineTo(2 - s * 0.5 + sh, yy + 1);
    ctx.stroke();
  }
  // Head crest bumps
  ctx.fillStyle = "#f0b028";
  ctx.strokeStyle = "#7a4e08";
  ctx.lineWidth = 0.9;
  ([[-4, -20], [0, -19]] as Array<[number, number]>).forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx + a * 1.0, cy + a * 1.0, 1.6, 0, TAU);
    ctx.fill();
    ctx.stroke();
  });
  // Eye
  const ex = -6 + a * 0.8;
  const ey = -14 + a * 0.6;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ex, ey, 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0a1018";
  ctx.beginPath();
  ctx.arc(ex, ey, 1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(ex - 0.5, ey - 0.5, 0.4, 0, TAU);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// reef_starfish — the rigid 360° pinwheel spin is KILLED. The arms now curl with
// real deformation on staggered phases (a slow living writhe) under a gentle
// ±tilt oscillation (so it never reads as a continuous spin), letting the
// outward-traveling twinkle wave finally show as clean sparkles.
function animStarfish(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.5); // re-frame: off (0, +2.5)

  // Per-arm curl: each arm tip swings on its own phase; a slow ±tilt rocks the
  // whole star a few degrees (NOT a full rotation).
  const tilt = Math.sin(t * 0.5) * 0.16; // small oscillation, ±~9°
  const armCurl = (i: number): number => Math.sin(t * 1.3 - i * 1.05) * 0.18; // radians

  groundShadow(ctx, 0, 24, 18, 4, 0, 0.24);

  ctx.save();
  ctx.rotate(tilt);

  const arms = 5;
  const outer = 20;
  const inner = 8;
  // Build the outline from arm tips (curled) and valleys, so the silhouette
  // actually deforms rather than rotating rigidly.
  const tipAngle = (i: number): number => -Math.PI / 2 + (i * 2 * Math.PI) / arms + armCurl(i);
  const valleyAngle = (i: number): number => -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / arms;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < arms; i++) {
    const at = tipAngle(i);
    pts.push([Math.cos(at) * outer, Math.sin(at) * outer]);
    const av = valleyAngle(i);
    pts.push([Math.cos(av) * inner, Math.sin(av) * inner]);
  }
  const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 22);
  g.addColorStop(0, "#ffb060");
  g.addColorStop(0.6, "#f07820");
  g.addColorStop(1, "#b04808");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#7a2c04";
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else {
      const [px, py] = pts[i - 1];
      ctx.quadraticCurveTo((px + x) / 2 + x * 0.05, (py + y) / 2 + y * 0.05, x, y);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Arm ridge lines — follow each arm's curl.
  ctx.strokeStyle = "rgba(122,44,4,0.4)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < arms; i++) {
    const at = tipAngle(i);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(at) * (outer - 4), Math.sin(at) * (outer - 4));
    ctx.stroke();
  }

  // Bumpy texture — an outward-traveling twinkle wave, now as clean sparkles
  // (lead point) over dim base dots. This is the detail the spin used to bury.
  for (let i = 0; i < arms; i++) {
    const at = tipAngle(i);
    for (let s = 0.3; s <= 0.85; s += 0.2) {
      const bx = Math.cos(at) * outer * s;
      const by = Math.sin(at) * outer * s;
      const wave = Math.sin(t * 4 - s * 6 - i * 1.2);
      const lift = Math.max(0, wave);
      if (lift > 0.55) {
        sparkle(ctx, bx, by, 1.2 + lift * 1.1, 0.35 + lift * 0.5, "255,240,200");
      } else {
        ctx.fillStyle = `rgba(255,230,180,${0.4 + lift * 0.3})`;
        ctx.beginPath();
        ctx.arc(bx, by, 1.3, 0, TAU);
        ctx.fill();
      }
    }
  }

  // Center dots cluster
  ctx.fillStyle = "rgba(176,72,8,0.55)";
  ([[0, 0], [-2, -2], [2, -1], [0, 3]] as Array<[number, number]>).forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 1.4, 0, TAU);
    ctx.fill();
  });

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// reef_lighthouse — the beam is REBUILT. The old version flapped two flat khaki
// triangles like bat-wings (drawn over the roof, a z-order bug) plus two doubled
// static side beams. This is one warm beacon cone that sweeps left↔right across
// the FRONT, drawn beneath the lamp/roof (so nothing overlaps the cap) and
// flashing bright as it faces the viewer, synced to the lamp. Tower/rock kept.
function animLighthouse(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, 1.7); // re-frame: off (0, -1.7) → nudge down

  groundShadow(ctx, 0, 23, 18, 4, 0, 0.26);

  // Beacon timing: the aim sweeps smoothly; the flash beats brightest as the
  // beam crosses front-centre (twice per sweep).
  const sweepPeriod = 3.4;
  const aim = pingPong(t, sweepPeriod) * 2 - 1; // -1..1 eased left↔right
  const facing = 1 - Math.abs(aim); // 1 at centre (pointing at viewer)
  const flash = Math.pow(facing, 2.2); // sharp peak when it faces front
  const lampPulse = 0.55 + flash * 0.45; // lamp brightens with the beam

  // Tiny waves at the base ripple (kept), now lifted by the beam flash glinting.
  const waveA = Math.sin(t * 2.5);
  const waveB = Math.cos(t * 2.5 + 0.8);
  ctx.fillStyle = "rgba(90,160,220,0.35)";
  ctx.beginPath();
  ctx.moveTo(-22, 22 + waveA);
  ctx.quadraticCurveTo(-14, 18 - waveB, -6, 22 + waveB);
  ctx.quadraticCurveTo(2, 26 - waveA, 10, 22 + waveA);
  ctx.quadraticCurveTo(16, 19 - waveB, 22, 22 + waveB);
  ctx.lineTo(22, 26);
  ctx.lineTo(-22, 26);
  ctx.closePath();
  ctx.fill();

  // Rock base
  ctx.fillStyle = "#6a6258";
  ctx.strokeStyle = "#3a342c";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-18, 22);
  ctx.lineTo(-12, 14);
  ctx.lineTo(-4, 17);
  ctx.lineTo(6, 13);
  ctx.lineTo(13, 17);
  ctx.lineTo(18, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(-12, 14);
  ctx.lineTo(-4, 17);
  ctx.lineTo(-8, 18);
  ctx.closePath();
  ctx.fill();

  // Tower — tapered trunk
  const tower = ctx.createLinearGradient(-8, 0, 8, 0);
  tower.addColorStop(0, "#d8d0c8");
  tower.addColorStop(0.5, "#fbf6ee");
  tower.addColorStop(1, "#c4bcb2");
  ctx.fillStyle = tower;
  ctx.strokeStyle = "#5a4438";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(-5, -10);
  ctx.lineTo(5, -10);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Red stripes (clipped to tower)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(-5, -10);
  ctx.lineTo(5, -10);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#d8362c";
  ([[-10, 5], [0, 5], [10, 5]] as Array<[number, number]>).forEach(([sy, h]) => {
    ctx.fillRect(-10, sy, 20, h);
  });
  ctx.restore();
  // Gallery deck
  ctx.fillStyle = "#3a342c";
  ctx.fillRect(-7, -12, 14, 3);

  // ---- THE BEAM ---- one forward cone from the lamp, fanning DOWN over the sea
  // and sweeping with `aim`. Drawn here (above tower+sea, below lamp/roof) so it
  // never paints over the cap. It is genuine warm light, gradient-feathered.
  const lampX = 0;
  const lampY = -16;
  // The cone's central direction sweeps; it always opens downward-forward.
  const spread = 0.5; // half-angle of the fan
  const dir = Math.PI / 2 + aim * 0.85; // straight down at centre, swings ±
  const reach = 30;
  ctx.save();
  ctx.globalAlpha = 0.25 + flash * 0.6; // brightest crossing front-centre
  const bx0 = lampX + Math.cos(dir - spread) * reach;
  const by0 = lampY + Math.sin(dir - spread) * reach;
  const bx1 = lampX + Math.cos(dir + spread) * reach;
  const by1 = lampY + Math.sin(dir + spread) * reach;
  const beam = ctx.createRadialGradient(lampX, lampY, 1, lampX, lampY, reach);
  beam.addColorStop(0, "rgba(255,246,190,0.9)");
  beam.addColorStop(0.5, "rgba(255,232,150,0.4)");
  beam.addColorStop(1, "rgba(255,224,130,0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(lampX, lampY);
  ctx.lineTo(bx0, by0);
  // curved far edge so the cone reads as a soft pool of light
  const mx = lampX + Math.cos(dir) * (reach + 4);
  const my = lampY + Math.sin(dir) * (reach + 4);
  ctx.quadraticCurveTo(mx, my, bx1, by1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Lantern room — lamp glow pulses with the beam.
  const lampR = 8 + flash * 3;
  const lg = ctx.createRadialGradient(0, -17, 1, 0, -17, lampR);
  lg.addColorStop(0, "#fff6c0");
  lg.addColorStop(0.6, `rgba(255,210,74,${lampPulse})`);
  lg.addColorStop(1, "#e8901a");
  ctx.fillStyle = lg;
  ctx.strokeStyle = "#5a4438";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(-5, -20, 10, 8);
  ctx.fill();
  ctx.stroke();
  // Lantern panes
  ctx.strokeStyle = "rgba(90,68,56,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, -12);
  ctx.moveTo(-5, -16);
  ctx.lineTo(5, -16);
  ctx.stroke();

  // A crisp halo flares around the lamp on the flash (replaces the static side
  // beams) — a clean radial bloom, no flapping triangles.
  if (flash > 0.02) {
    const halo = ctx.createRadialGradient(0, -16, 1, 0, -16, 9 + flash * 5);
    halo.addColorStop(0, `rgba(255,248,200,${0.55 * flash})`);
    halo.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, -16, 9 + flash * 5, 0, TAU);
    ctx.fill();
  }

  // Roof cap — drawn LAST so it always sits on top (fixes the old z-order bug).
  ctx.fillStyle = "#d8362c";
  ctx.strokeStyle = "#5a4438";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.lineTo(0, -27);
  ctx.lineTo(6, -20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Finial
  ctx.fillStyle = "#3a342c";
  ctx.beginPath();
  ctx.arc(0, -28, 1.3, 0, TAU);
  ctx.fill();

  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  reef_jellyfish: animJellyfish,
  reef_octopus: animOctopus,
  reef_crab: animCrab,
  reef_seahorse: animSeahorse,
  reef_starfish: animStarfish,
  reef_lighthouse: animLighthouse,
};
