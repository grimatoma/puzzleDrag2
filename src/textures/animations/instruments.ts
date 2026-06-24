// Animated musical instruments — same look as src/textures/categories/instruments.ts, but PLAYING.
// Each fn redraws the WHOLE icon at time `t` (seconds). The static geometry is the
// strong part and is preserved (silhouette / palette / gloss unchanged); the motion is
// rebuilt to lead with real per-instrument deformation and the 12 animation principles:
//   - the default "static body + cosmetic overlay" is gone — every instrument now
//     deforms (squash/stretch, eased tilt, hinge, traveling string wave, weight-shift);
//   - energy is normalized (the bell no longer swings 18× harder than the fiddle);
//   - each beat has anticipation → action → overshoot/settle, with parts that LAG the
//     lead (follow-through: clapper, cord, discs, bow, strings);
//   - loops are seamless (position driven off `loopPhase`/`pingPong`/`breathe`/`beat`,
//     never a raw sawtooth or a high-frequency buzz that won't tile);
//   - shadows couple to vertical motion via `groundShadow(..., lift)`.
// See `crops.ts` for the reference rebuild this matches.

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
  windupOvershoot,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// Shared: a rising musical note that puffs out on a `pop` envelope (0..1) and
// fades as it climbs. Driven entirely by the caller's phase so it loops cleanly
// and rests between emissions (no perpetual stream). Pure path ops (stub-safe).
function noteGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = clamp01(alpha) * 0.9;
  ctx.fillStyle = "#fff3b0";
  ctx.strokeStyle = "rgba(90,52,8,0.8)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.72, -0.4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.85, y - size * 0.3);
  ctx.lineTo(x + size * 0.85, y - size * 2.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.85, y - size * 2.6);
  ctx.quadraticCurveTo(x + size * 2.0, y - size * 2.2, x + size * 1.6, y - size * 1.0);
  ctx.stroke();
  ctx.restore();
}

// Shared: an expanding, fading sound-ring arc. `p` in 0..1 = expansion progress.
function soundArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  p: number,
  baseR: number,
  spread: number,
  a0: number,
  a1: number,
  color: string,
  width: number,
): void {
  const fade = 1 - p;
  if (fade <= 0.02) return;
  const r = baseR + easeOutCubic(p) * spread;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// instr_lute — re-centred (off 4.3,-3.0). A LAZY STRUM: the whole body dips and
// rolls in anticipation, the (invisible) hand sweeps, then the strings answer
// with a damped traveling wave + the body overshoots back upright. Replaces the
// 22Hz string-buzz noise with a real per-strum event that rests between strums.
function animLute(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-4.3, 3.0); // re-frame (off_x +4.3, off_y -3.0)

  // Strum beat: a long rest, then one strum. `strum` 0..1 is the strum stroke.
  const period = 3.2;
  const ph = loopPhase(t, period);
  const anticip = 0.18; // wind-up fraction
  const stroke = 0.16; // hand-sweep fraction
  // Body roll: dip back during anticipation, snap forward on the stroke, then
  // overshoot upright and settle (windupOvershoot gives the whole arc).
  const strumProg = clamp01((ph - 0) / (anticip + stroke + 0.30));
  const roll = -0.05 + windupOvershoot(strumProg, anticip / (anticip + stroke + 0.30), 2.4) * 0.05;
  // Excitation: 1 right as the hand crosses, decaying after — drives the strings.
  const excite = beat(t, period, stroke, anticip);
  const settle = Math.max(0, 1 - (ph - (anticip + stroke)) * 4); // post-strum body jiggle window
  const bob = Math.sin(t * 1.1) * 0.5 + excite * 0.8; // gentle idle breath + a kick on strum

  groundShadow(ctx, -1, 22, 16, 4, -bob * 0.4, 0.26);

  ctx.save();
  ctx.translate(0, bob);
  // Roll about the body's lower bowl (the resting/contact point).
  ctx.translate(0, 18);
  ctx.rotate(-0.18 + roll);
  ctx.translate(0, -18);

  // Neck — tilted up-right with frets (welded to the body via the same transform).
  ctx.save();
  ctx.translate(6, -2);
  ctx.rotate(-0.9);
  const neckG = ctx.createLinearGradient(0, -3.5, 0, 3.5);
  neckG.addColorStop(0, "#a87838");
  neckG.addColorStop(0.5, "#7a4818");
  neckG.addColorStop(1, "#3a2008");
  ctx.fillStyle = neckG;
  ctx.fillRect(0, -3.5, 26, 7);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.6;
  ctx.strokeRect(0, -3.5, 26, 7);
  ctx.strokeStyle = "rgba(20,14,4,0.6)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5, -3.5);
    ctx.lineTo(i * 5, 3.5);
    ctx.stroke();
  }
  ctx.fillStyle = "#5a3414";
  ctx.beginPath();
  ctx.moveTo(26, -4);
  ctx.lineTo(34, -7);
  ctx.lineTo(35, -1);
  ctx.lineTo(27, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#2a1808";
  ([[30, -6], [33, -3], [29, 2]] as Array<[number, number]>).forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, 1.6, 0, TAU);
    ctx.fill();
  });
  ctx.restore();

  // Body — pear-shaped bowl. Squashes ever so slightly on the strum (the soundbox
  // "booms"): wider + shorter for one beat, eased back.
  const boom = excite * 0.05;
  ctx.save();
  ctx.translate(0, 8);
  ctx.scale(1 + boom, 1 - boom * 0.7);
  ctx.translate(0, -8);
  const body = ctx.createRadialGradient(-5, 4, 3, 0, 8, 22);
  body.addColorStop(0, "#d8a058");
  body.addColorStop(0.5, "#a86828");
  body.addColorStop(1, "#5a3010");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-14, -6, -16, 12, -8, 20);
  ctx.bezierCurveTo(-2, 24, 6, 24, 12, 18);
  ctx.bezierCurveTo(18, 10, 14, -6, 0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(40,20,8,0.4)";
  ctx.lineWidth = 0.9;
  [-6, -2, 2, 6, 10].forEach((cx) => {
    ctx.beginPath();
    ctx.moveTo(cx * 0.4, -6);
    ctx.bezierCurveTo(cx, 6, cx, 14, cx * 0.6, 22);
    ctx.stroke();
  });
  // Demoted feathered sheen across the bowl (secondary accent — no hard bar).
  glint(ctx, loopPhase(t, 4.2), { span: 14, width: 6, intensity: 0.24, length: 36, warm: true });
  ctx.restore();

  // Soundhole rosette.
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath();
  ctx.arc(0, 6, 4.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#d8a058";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 6, 4.5, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(216,160,88,0.7)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(0, 6, 2.6, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-5, 13, 10, 2.4);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-5, 13, 10, 2.4);

  // Strings — a damped traveling wave excited by the strum. The wave enters at the
  // bridge (high string index) and runs up, biggest on the strum and decaying with
  // `excite` + the post-strum `settle`; at rest the strings are dead straight.
  const ring = excite + settle * 0.35;
  for (let i = -2; i <= 2; i++) {
    const x0 = i * 1.6;
    const y0 = 13;
    const x1 = i * 1.2 + 3;
    const y1 = -7;
    // Each string lags the one struck before it (strum sweeps low→high index).
    const lagPhase = t * 9 - (i + 2) * 0.9;
    const amp = ring * (1.0 + Math.abs(i) * 0.15) * Math.exp(-Math.max(0, ph - anticip) * 2.4);
    const wobble = Math.sin(lagPhase) * amp;
    const mx = (x0 + x1) / 2 + wobble;
    const my = (y0 + y1) / 2;
    const shimmer = 0.55 + 0.35 * clamp01(amp);
    ctx.strokeStyle = `rgba(245,235,210,${shimmer})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,240,210,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, 2, 2.6, 7, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore(); // body squash
  ctx.restore(); // roll/bob

  // Two notes drift up from the soundhole, emitted on the strum (rest between).
  for (let n = 0; n < 2; n++) {
    const np = loopPhase(t, period, -(anticip + stroke) - n * 0.18);
    if (np < 0.55) {
      const rise = np / 0.55;
      const a = Math.sin(rise * Math.PI);
      noteGlyph(ctx, -2 + n * 6 + Math.sin(rise * 4 + n) * 3, 0 - rise * 22, 1.7 + n * 0.3, a);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// instr_drum — re-centred (off 3.0,3.4). The benchmark, made musical: a DUM-TAK
// rhythm (one heavy hit, one light hit per loop) with anticipation before each
// strike, an ASYMMETRIC snap (fast down / slow lift), a head squash + ripple ring,
// and a body settle-jiggle after the heavy hit.
function animDrum(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-3.0, -3.4); // re-frame (off_x +3.0, off_y +3.4)

  const period = 1.4;
  const ph = loopPhase(t, period);
  // Two beats: DUM at phase 0 (heavy), TAK at phase 0.5 (light). Each beat owns a
  // window: wind up, snap down (fast), lift away (slow ease-out).
  type Hit = { at: number; power: number };
  const hits: Hit[] = [{ at: 0.0, power: 1.0 }, { at: 0.46, power: 0.55 }];
  // Resolve the stick height + the most-recent strike strength.
  let stickLift = -7; // resting raised height
  let strikeAge = 1; // 0 at contact → 1 long after
  let strikePower = 0;
  for (const h of hits) {
    // local phase since this hit's window start (window = 0.5 of the loop)
    let u = ph - (h.at - 0.30);
    if (u < 0) u += 1;
    if (u >= 0 && u < 0.5) {
      const w = u / 0.5; // 0..1 across this beat's window
      // 0..0.6 wind up (raise), 0.6 strike, 0.6..1 lift away.
      let lift: number;
      if (w < 0.55) {
        // anticipation: ease the stick UP to its apex (negative = raised)
        lift = -7 - easeInOutSine(w / 0.55) * 5 * h.power;
      } else {
        // snap DOWN fast to contact then ease back up (asymmetric: easeOutCubic).
        const d = (w - 0.55) / 0.45;
        const downUp = d < 0.22 ? d / 0.22 : easeOutCubic(1 - (d - 0.22) / 0.78);
        lift = lerp(-12 * h.power, -1, 1 - downUp); // -1 ≈ touching head at contact
      }
      if (lift < stickLift) stickLift = lift;
      // strike freshness: how close are we to this beat's contact moment (w≈0.66)?
      const since = Math.abs(w - 0.66);
      if (since < strikeAge) {
        strikeAge = since;
        strikePower = h.power;
      }
    }
  }
  const ripple = Math.max(0, 1 - strikeAge * 5) * strikePower; // 1 at fresh strike → 0
  const stickAngle = -0.5 - Math.max(0, -stickLift - 1) * 0.014; // raises angle a touch when lifted

  // Body settle-jiggle after the heavy DUM: a tiny elastic vertical shiver.
  const dumPh = loopPhase(t, period, 0); // 0 at the DUM
  const jiggle = dumPh < 0.3 ? (1 - easeOutElastic(dumPh / 0.3)) * ripple * 1.4 : 0;

  groundShadow(ctx, 0, 19, 18, 4, 0, 0.26);

  ctx.save();
  ctx.translate(0, jiggle);

  // Wooden body — slightly trapezoidal barrel.
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, "#5a3010");
  body.addColorStop(0.5, "#a86828");
  body.addColorStop(1, "#4a2808");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-15, -6);
  ctx.lineTo(15, -6);
  ctx.lineTo(13, 16);
  ctx.lineTo(-13, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,20,8,0.4)";
  ctx.lineWidth = 0.8;
  [-9, -3, 3, 9].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -5);
    ctx.lineTo(x * 0.85, 15);
    ctx.stroke();
  });
  ctx.fillStyle = "#3a2008";
  ctx.beginPath();
  ctx.ellipse(0, 16, 13, 3, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "#d8c090";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const xt = -13 + i * 5.2;
    const xb = -13 + i * 5.2 + 2.6;
    ctx.beginPath();
    ctx.moveTo(xt, -4);
    ctx.lineTo(xb, 14);
    ctx.lineTo(xt + 5.2, -4);
    ctx.stroke();
  }

  // Head skin — squashes vertically on impact (deeper for the heavy hit).
  const headSquash = 1 - ripple * 0.16;
  const head = ctx.createRadialGradient(-4, -8, 2, 0, -6, 18);
  head.addColorStop(0, "#fdf3dc");
  head.addColorStop(0.7, "#e8d2a0");
  head.addColorStop(1, "#c0a060");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(0, -6, 16, 6 * headSquash, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, -6, 16, 6 * headSquash, 0, 0, TAU);
  ctx.stroke();

  // Impact ring spreading across the head on each hit.
  if (ripple > 0.02) {
    const rr = (1 - ripple) * 13 + 2;
    ctx.save();
    ctx.globalAlpha = ripple * 0.7;
    ctx.strokeStyle = "rgba(120,72,24,0.8)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(2, -6, rr, rr * 0.38, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-5, -8, 5, 1.8 * headSquash, -0.2, 0, TAU);
  ctx.fill();

  // Drumstick — tip hovers and snaps down to strike at (2,-6).
  ctx.save();
  ctx.translate(2, -6 + stickLift);
  ctx.rotate(stickAngle);
  const stickG = ctx.createLinearGradient(0, -1.5, 0, 1.5);
  stickG.addColorStop(0, "#d8a860");
  stickG.addColorStop(1, "#7a4818");
  ctx.fillStyle = stickG;
  ctx.fillRect(-2, -1.4, 22, 2.8);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 0.9;
  ctx.strokeRect(-2, -1.4, 22, 2.8);
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.arc(20, 0, 3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(19, -1, 1, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // jiggle
  ctx.restore(); // re-frame
}

// ---------------------------------------------------------------------------
// instr_flute — re-centred (off 0.1,1.7). A BREATH-BOB (the whole tube rises and
// settles with the player's breath) + finger TRILLS (the holes flutter open/closed
// in a running pattern) with a small note-RECOIL kick when a note puffs out. The
// thin linear glint is replaced by the shared feathered sheen.
function animFlute(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -1.7); // re-frame (off_y +1.7)

  const period = 2.6;
  // Breath: a slow rise/fall; recoil: a short backward kick along the tube axis when
  // a note is released (on the breath's exhale beat).
  const bob = breathe(t, period, 1.2, 0, 0.25); // vertical breath
  const recoil = beat(t, period, 0.18, 0.0); // 0..1 puff event
  groundShadow(ctx, -1, 21, 18, 4, -bob * 0.5, 0.26);

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(-0.35);
  ctx.translate(-recoil * 1.6, 0); // recoil kicks the tube back toward the mouth end

  // Wooden tube.
  const tube = ctx.createLinearGradient(0, -4, 0, 4);
  tube.addColorStop(0, "#d8a860");
  tube.addColorStop(0.45, "#a86828");
  tube.addColorStop(1, "#5a3010");
  ctx.fillStyle = tube;
  ctx.beginPath();
  ctx.moveTo(-22, -3.5);
  ctx.lineTo(18, -4);
  ctx.bezierCurveTo(24, -4, 24, 4, 18, 4);
  ctx.lineTo(-22, 3.5);
  ctx.bezierCurveTo(-25, 3, -25, -3, -22, -3.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,20,8,0.35)";
  ctx.lineWidth = 0.7;
  [-1.2, 0.6].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.lineTo(16, y);
    ctx.stroke();
  });
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.6;
  [-16, 12].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -3.6);
    ctx.lineTo(x, 3.6);
    ctx.stroke();
  });
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(-22, -3.6);
  ctx.lineTo(-19, -4.2);
  ctx.lineTo(-19, 4.2);
  ctx.lineTo(-22, 3.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath();
  ctx.moveTo(-17, -3.2);
  ctx.lineTo(-14, -3.2);
  ctx.lineTo(-15.5, -1);
  ctx.closePath();
  ctx.fill();

  // Finger holes — TRILL: a wave of "covering" runs along the holes. A covered hole
  // is a filled dark dot; an open hole shows a small pale ring (the finger lifted).
  const holes = [-8, -3, 2, 7, 12];
  holes.forEach((x, hi) => {
    // Running trill: each finger lifts in sequence (phase offset along the tube).
    const cover = 0.5 + 0.5 * Math.sin(t * 7 - hi * 1.25);
    if (cover > 0.4) {
      // covered (finger down) — solid hole
      ctx.fillStyle = "#1a0e04";
      ctx.beginPath();
      ctx.arc(x, -0.4, 1.4, 0, TAU);
      ctx.fill();
    } else {
      // open (finger lifted) — dark hole with a bright lip
      ctx.fillStyle = "#1a0e04";
      ctx.beginPath();
      ctx.arc(x, -0.4, 1.1, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,240,200,0.6)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(x, -0.4, 1.5, 0, TAU);
      ctx.stroke();
    }
  });

  // Top specular streak (static base) + demoted feathered sheen sweeping the tube.
  ctx.fillStyle = "rgba(255,245,215,0.5)";
  ctx.beginPath();
  ctx.moveTo(-20, -2.4);
  ctx.lineTo(16, -2.6);
  ctx.lineTo(16, -1.6);
  ctx.lineTo(-20, -1.4);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-22, -3.5);
  ctx.lineTo(18, -4);
  ctx.bezierCurveTo(24, -4, 24, 4, 18, 4);
  ctx.lineTo(-22, 3.5);
  ctx.bezierCurveTo(-25, 3, -25, -3, -22, -3.5);
  ctx.closePath();
  ctx.clip();
  glint(ctx, loopPhase(t, 3.6), { span: 22, width: 5, angle: 0, intensity: 0.26, length: 9, warm: true });
  ctx.restore();
  ctx.restore(); // bob/rotate/recoil

  // Notes puff from the open (far) end on the breath beat — emitted then rest.
  for (let n = 0; n < 2; n++) {
    const np = loopPhase(t, period, -0.04 - n * 0.2);
    if (np < 0.6) {
      const rise = np / 0.6;
      const a = Math.sin(rise * Math.PI);
      noteGlyph(ctx, 19 + n * 4 + Math.sin(rise * 4 + n) * 3, -8 - rise * 20, 1.6 + n * 0.3, a);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// instr_horn — re-centred (off 5.3,2.0). An INHALE→FLARE: the bell squashes wide
// in time with each emitted sound-ring (the brass "blares"), the whole horn does a
// small breath-bob, and the hanging cord SWINGS as a pendulum that LAGS the body
// (follow-through). The travelling glint-dot is replaced by the shared sheen.
function animHorn(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-5.3, -2.0); // re-frame (off_x +5.3, off_y +2.0)

  const period = 1.7;
  const ph = loopPhase(t, period);
  // Blare envelope: anticipation (inhale, bell narrows) → flare (bell widens) → settle.
  // One per loop, synced to the ring emission.
  const inhale = ph < 0.22 ? easeInOutSine(ph / 0.22) : 0; // bell pulls IN
  const flarePulse = beat(t, period, 0.5, 0.22); // bell pushes OUT after the inhale
  const flare = flarePulse * 0.9 - inhale * 0.35; // net bell scale offset
  const bob = breathe(t, period, 0.7, 0, 0.0) + flarePulse * 0.6;

  groundShadow(ctx, -2, 21, 18, 4, -bob * 0.4, 0.26);

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(-0.12);

  // Sound-wave arcs radiating from the bell mouth, emitted on the flare.
  const bx = 19;
  const by = -7;
  for (let k = 0; k < 3; k++) {
    const p = loopPhase(t, period, -0.22 + k / 3 * 0.5);
    if (p < 0.85) {
      soundArc(ctx, bx, by, p / 0.85, 5, 12, -1.05, 0.75, "rgba(224,168,48,0.85)", 1.6);
    }
  }

  const brass = ctx.createLinearGradient(-18, -10, 18, 12);
  brass.addColorStop(0, "#fff3b0");
  brass.addColorStop(0.4, "#e0a830");
  brass.addColorStop(0.7, "#a86810");
  brass.addColorStop(1, "#5a3408");

  // Curved tube — sweeping C (unchanged).
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.bezierCurveTo(-22, -8, -6, -16, 6, -12);
  ctx.stroke();
  ctx.strokeStyle = brass;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.bezierCurveTo(-22, -8, -6, -16, 6, -12);
  ctx.stroke();

  // Flared bell — squash/stretch about its throat (≈ (5,-12)) so it flares wide on
  // the blare and pulls in on the inhale, instead of sitting inert.
  ctx.save();
  ctx.translate(5, -12);
  ctx.scale(1 + flare * 0.16, 1 - flare * 0.07);
  ctx.translate(-5, 12);
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(4, -16);
  ctx.bezierCurveTo(14, -20, 22, -14, 22, -4);
  ctx.bezierCurveTo(18, -6, 12, -6, 8, -8);
  ctx.bezierCurveTo(6, -10, 4, -13, 4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(40,20,8,0.5)";
  ctx.beginPath();
  ctx.ellipse(18, -8, 4, 6, -0.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,250,220,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(6, -15);
  ctx.bezierCurveTo(14, -18, 20, -14, 21, -6);
  ctx.stroke();
  ctx.restore();

  // Mouthpiece cup.
  ctx.fillStyle = "#e0a830";
  ctx.beginPath();
  ctx.ellipse(-16, 6, 3, 3.5, 0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Tube specular + demoted feathered sheen sweeping along the tube (clip to tube).
  ctx.strokeStyle = "rgba(255,250,220,0.75)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-15, 3);
  ctx.bezierCurveTo(-19, -7, -6, -13, 4, -11);
  ctx.stroke();
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,1)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.bezierCurveTo(-22, -8, -6, -16, 6, -12);
  ctx.stroke();
  ctx.clip();
  glint(ctx, loopPhase(t, 2.4), { span: 18, width: 5, angle: Math.PI / 4, intensity: 0.3, length: 26, warm: true });
  ctx.restore();

  // Hanging cord — a pendulum that LAGS the body bob/blare (follow-through). The
  // attach points stay on the tube; the slack belly swings late.
  const swing = Math.sin(t * 2.0 - 0.7) * 2.4 + flarePulse * 1.6; // lateral sag of the slack
  const sag = 14 + Math.abs(Math.sin(t * 2.0 - 0.7)) * 1.5;
  ctx.strokeStyle = "#7a3018";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.bezierCurveTo(-6 + swing, sag, 6 + swing, sag, 10, 2);
  ctx.stroke();

  ctx.restore(); // bob/rotate
  ctx.restore(); // re-frame
}

// ---------------------------------------------------------------------------
// instr_fiddle — RE-CENTRED (worst offender, off_x +9). The body no longer stands
// dead while the bow slides on rails: it does a WEIGHT-SHIFT (rocks on a low pivot,
// dipping into each bow stroke), the bow ARCS across the strings with eased reversals
// (pingPong, slight curl at the turns), and the strings answer the bow's speed —
// brightest mid-stroke, still at the turnarounds. No high-frequency string buzz.
function animFiddle(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-9.0, -0.1); // re-frame (off_x +9.0)

  const period = 2.4;
  // Bow stroke as an eased there-and-back (−1..1), seamless at the reversals.
  const stroke = pingPong(t, period) * 2 - 1; // -1..1, eased
  // Bow SPEED proxy (peaks mid-stroke, zero at the eased turns).
  const speed = Math.abs(Math.sin(loopPhase(t, period) * TAU));
  // Body weight-shift: leans into the stroke direction and dips on the down-bow.
  const lean = stroke * 0.05;
  const dip = -Math.cos(loopPhase(t, period) * TAU * 2) * 0.6; // a small two-per-cycle bob
  groundShadow(ctx, -2, 21, 16, 4, -dip * 0.5, 0.26);

  ctx.save();
  ctx.rotate(-0.15);
  // Rock the whole fiddle about a low pivot near the chin/lower-bout.
  ctx.translate(0, 18);
  ctx.rotate(lean);
  ctx.translate(0, -18 + dip);

  // Bow — arcs across the strings. The stroke slides it along its axis with eased
  // reversals, and it curls slightly (the hair tension) at the ends of travel.
  ctx.save();
  ctx.translate(10, 2);
  ctx.rotate(0.5 + stroke * 0.04); // tiny tilt as it changes direction
  ctx.translate(stroke * 8, 0);
  const curl = (1 - speed) * 1.2 * Math.sign(stroke || 1); // curls at the turns
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.quadraticCurveTo(0, -3 + curl, 22, 0);
  ctx.stroke();
  ctx.strokeStyle = "rgba(245,235,210,0.85)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-21, 1);
  ctx.quadraticCurveTo(0, 1 + curl, 21, 1);
  ctx.stroke();
  ctx.fillStyle = "#2a1808";
  ctx.fillRect(-23, -1.5, 4, 4);
  ctx.restore();

  // Fiddle body — figure-eight (unchanged silhouette).
  const body = ctx.createRadialGradient(-3, 2, 3, 0, 6, 20);
  body.addColorStop(0, "#d88838");
  body.addColorStop(0.5, "#a85818");
  body.addColorStop(1, "#5a2c08");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-8, -10, -10, -4, -7, 0);
  ctx.bezierCurveTo(-10, 2, -10, 4, -7, 5);
  ctx.bezierCurveTo(-11, 9, -11, 20, 0, 20);
  ctx.bezierCurveTo(11, 20, 11, 9, 7, 5);
  ctx.bezierCurveTo(10, 4, 10, 2, 7, 0);
  ctx.bezierCurveTo(10, -4, 8, -10, 0, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ([-1, 1] as number[]).forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(s * 4, 2);
    ctx.bezierCurveTo(s * 6, 6, s * 2, 10, s * 4, 14);
    ctx.stroke();
  });
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-4, 8, 8, 1.8);
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-2.2, -20, 4.4, 11);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-2.2, -20, 4.4, 11);
  ctx.fillStyle = "#8a5520";
  ctx.beginPath();
  ctx.arc(0, -22, 3.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,14,4,0.7)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(0, -22, 1.6, 0, Math.PI * 1.6);
  ctx.stroke();

  // Strings — bow under the bow's contact point bows out the most; brightness tracks
  // bow speed; the displacement is low-frequency (no 26Hz buzz). At a turn the strings
  // go nearly still.
  let si = 0;
  for (let i = -1.5; i <= 1.5; i++) {
    const vib = Math.sin(t * 8 + si * 1.4) * 0.6 * speed;
    const shimmer = 0.45 + 0.5 * speed * (0.5 + 0.5 * Math.abs(Math.sin(t * 6 + si)));
    const mx = i + vib;
    ctx.strokeStyle = `rgba(245,235,210,${shimmer})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(i, -19);
    ctx.quadraticCurveTo(mx, -5, i, 9);
    ctx.stroke();
    si++;
  }

  ctx.fillStyle = "rgba(255,235,200,0.35)";
  ctx.beginPath();
  ctx.ellipse(-4, 12, 2.4, 5, -0.2, 0, TAU);
  ctx.fill();
  ctx.restore(); // rock

  // A note drifts off the f-hole region, strongest mid-stroke (when it sings).
  const np = loopPhase(t, period, 0.1);
  if (np < 0.6) {
    const rise = np / 0.6;
    const a = Math.sin(rise * Math.PI) * (0.5 + 0.5 * speed);
    noteGlyph(ctx, 5 + Math.sin(rise * 4) * 3, 2 - rise * 20, 1.7, a);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// instr_bell — re-centred (off 0,3.4) and ENERGY-NORMALIZED (the old ±0.22 rigid
// swing was 18× the fiddle). Now: an EASED swing with overshoot at each reversal,
// the brass dome LAGS the handle (a squash/skew so the bell trails the swing —
// follow-through), and a VISIBLE clapper that swings across the mouth and STRIKES
// the rim on the beat (the chime), emitting the rings on contact.
function animBell(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -3.4); // re-frame (off_y +3.4)

  const period = 1.8;
  // Eased pendulum swing with a slight overshoot at the turns. Drive off a smooth
  // -1..1 that decelerates at the ends (pingPong) and add a small back-kick.
  const tri = pingPong(t, period) * 2 - 1; // -1..1 eased
  const swing = tri * 0.13; // radians (normalized down from 0.22)
  // Angular "velocity" of the swing → drives the clapper + dome lag.
  const vel = Math.sin(loopPhase(t, period) * TAU); // -1..1, peaks mid-swing
  // Clapper LAGS the bell and swings further; it contacts the rim near the swing
  // extremes. `strike` peaks at the contact.
  const clapAngle = Math.sin(loopPhase(t, period) * TAU - 0.5) * 1.0; // -1..1, lagged
  const atRim = clamp01(Math.abs(clapAngle) - 0.78) / 0.22; // 0..1 near the rim contact
  const strike = atRim * atRim; // sharp at contact
  // Rings emitted on the strike (one per half-swing, two per cycle).
  const ringPh = loopPhase(t, period / 2, 0.25);

  groundShadow(ctx, 0, 22, 13, 4, 0, 0.26);

  ctx.save();
  // Swing the whole bell about the handle top.
  ctx.translate(0, -22);
  ctx.rotate(swing);
  ctx.translate(0, 22);

  // Wooden handle (rigid to the swing pivot).
  const handle = ctx.createLinearGradient(-4, -22, 4, -8);
  handle.addColorStop(0, "#a87838");
  handle.addColorStop(0.5, "#7a4818");
  handle.addColorStop(1, "#3a2008");
  ctx.fillStyle = handle;
  ctx.beginPath();
  ctx.moveTo(-3, -8);
  ctx.bezierCurveTo(-5, -16, -3, -22, 0, -22);
  ctx.bezierCurveTo(3, -22, 5, -16, 3, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#8a5520";
  ctx.beginPath();
  ctx.arc(0, -22, 2.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#c8901c";
  ctx.fillRect(-3.5, -9, 7, 3);
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1;
  ctx.strokeRect(-3.5, -9, 7, 3);

  // Bell dome — LAGS the handle: a small counter-rotation skew about the collar so
  // the heavy brass trails the swing, plus a faint squash on the strike (the chime).
  ctx.save();
  ctx.translate(0, -6); // collar pivot
  ctx.rotate(-vel * 0.06); // dome trails the swing (follow-through)
  ctx.scale(1 + strike * 0.05, 1 - strike * 0.05);
  ctx.translate(0, 6);
  const brass = ctx.createLinearGradient(-14, -6, 14, 18);
  brass.addColorStop(0, "#fff3b0");
  brass.addColorStop(0.4, "#e0a830");
  brass.addColorStop(0.75, "#a86810");
  brass.addColorStop(1, "#5a3408");
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.bezierCurveTo(-6, 2, -12, 8, -14, 14);
  ctx.bezierCurveTo(-8, 18, 8, 18, 14, 14);
  ctx.bezierCurveTo(12, 8, 6, 2, 4, -6);
  ctx.bezierCurveTo(2, -8, -2, -8, -4, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#3a2408";
  ctx.beginPath();
  ctx.ellipse(0, 14, 14, 4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a4810";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Clapper — VISIBLE: a stem from the dome apex down to a heavy ball that swings
  // across the mouth and reaches the rim on the strike.
  const clapX = clapAngle * 11;
  const clapY = 15 - Math.abs(clapAngle) * 1.5;
  ctx.strokeStyle = "#5a3a10";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(clapX * 0.5, 8, clapX, clapY);
  ctx.stroke();
  ctx.fillStyle = "#8a6018";
  ctx.beginPath();
  ctx.arc(clapX, clapY, 2.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // A bright flash at the rim on contact (the ding).
  if (strike > 0.05) {
    sparkle(ctx, clapX, clapY, 1.4 + strike * 1.2, strike, "255,250,210");
  }

  // Shine streaks.
  ctx.strokeStyle = "rgba(255,250,220,0.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, -3);
  ctx.bezierCurveTo(-9, 4, -11, 8, -11, 12);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,250,220,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.bezierCurveTo(-4, 4, -5, 8, -5, 12);
  ctx.stroke();
  ctx.restore(); // dome lag
  ctx.restore(); // swing

  // Sound-wave rings emitted from the mouth on the strike (in icon space, so they
  // read as emitted ring-tones rather than following the swing).
  for (let k = 0; k < 2; k++) {
    const p = loopPhase(ringPh + k / 2, 1);
    soundArc(ctx, 0, 14 - 3.4, p, 16, 9, 0.15, Math.PI - 0.15, "rgba(224,168,48,0.7)", 1.4);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// instr_pan_flute — re-framed (off 0.2,-3.0). The L→R note glissando now has
// MATCHING MOTION: the whole set TILTS toward whichever tube is currently sounding
// (the player leans into the note) and a BREATH sweep runs across the row; the
// per-tube speculars are thicker. A gentle bob couples the breath.
function animPanFlute(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, 1.5); // re-frame (off_y -3.0 → nudge back down toward centre)

  const tubes = 6;
  const startX = -13;
  const gap = 5.2;
  const topY = -16;
  const seqPeriod = 2.4;
  // Which tube is sounding right now (0..tubes), sweeping L→R and looping.
  const sweep = loopPhase(t, seqPeriod) * tubes; // 0..tubes
  const soundingX = startX + sweep * gap;
  // Tilt toward the sounding tube: lean the rig so the active end dips down.
  const tilt = (sweep / (tubes - 1) - 0.5) * 0.14; // ±0.07 rad
  const bob = breathe(t, seqPeriod * 2, 0.6, 0, 0.0);

  groundShadow(ctx, 0, 21, 16, 4, -bob * 0.4, 0.26);

  ctx.save();
  ctx.translate(0, bob);
  // Tilt about the binding-cord centre.
  ctx.translate(0, -5);
  ctx.rotate(0.04 + tilt);
  ctx.translate(0, 5);

  for (let i = 0; i < tubes; i++) {
    const x = startX + i * gap;
    const len = 12 + i * 5;
    const bottomY = topY + len;
    const tubeG = ctx.createLinearGradient(x - 2.2, 0, x + 2.2, 0);
    tubeG.addColorStop(0, "#5a3010");
    tubeG.addColorStop(0.4, "#c89048");
    tubeG.addColorStop(0.6, "#e0b060");
    tubeG.addColorStop(1, "#6a3a12");
    ctx.fillStyle = tubeG;
    ctx.beginPath();
    ctx.moveTo(x - 2.2, topY);
    ctx.lineTo(x + 2.2, topY);
    ctx.lineTo(x + 2.2, bottomY);
    ctx.bezierCurveTo(x + 2.2, bottomY + 2.4, x - 2.2, bottomY + 2.4, x - 2.2, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#1a0e04";
    ctx.beginPath();
    ctx.ellipse(x, topY, 2.2, 1.1, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#7a4810";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // Thicker specular streak; the sounding tube brightens + its lip flares.
    const near = Math.max(0, 1 - Math.abs(x - soundingX) / (gap * 0.9));
    const sh = 0.45 + 0.4 * near;
    ctx.fillStyle = `rgba(255,245,215,${sh})`;
    ctx.fillRect(x - 1.5, topY + 1.5, 1.4, len - 2);
    if (near > 0.5) {
      ctx.fillStyle = `rgba(255,250,225,${(near - 0.5) * 0.9})`;
      ctx.beginPath();
      ctx.ellipse(x, topY, 2.6, 1.4, 0, 0, TAU);
      ctx.fill();
    }
  }

  // Binding cords.
  const rightX = startX + (tubes - 1) * gap;
  ([[-9, "#a8782c"], [-2, "#8a5818"]] as Array<[number, string]>).forEach(([by, col]) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(startX - 3, by);
    ctx.lineTo(rightX + 3, by);
    ctx.stroke();
    ctx.strokeStyle = "rgba(40,20,8,0.5)";
    ctx.lineWidth = 0.7;
    for (let x = startX - 2; x < rightX + 3; x += 2.4) {
      ctx.beginPath();
      ctx.moveTo(x, by - 1.6);
      ctx.lineTo(x + 1.4, by + 1.6);
      ctx.stroke();
    }
  });
  ctx.restore(); // tilt/bob

  // A single note rises from the currently-sounding tube and travels with the sweep.
  const localRise = loopPhase(t, seqPeriod / tubes); // 0..1 within one tube's slot
  const a = Math.sin(localRise * Math.PI);
  noteGlyph(ctx, soundingX + Math.sin(localRise * 3) * 2, topY - 1 - localRise * 16, 1.5, a);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// instr_tambourine — re-centred (off 0.2,4.5). The 30Hz buzz that wouldn't loop
// is gone. Now a SHAKE-SHAKE-REST rhythm: two eased tilt-snaps, then a rest. The
// jingle discs FOLLOW THROUGH — they lag the frame and rattle out after each snap.
function animTambourine(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -4.5); // re-frame (off_y +4.5)

  const period = 1.5;
  const ph = loopPhase(t, period);
  // Two shakes then rest. Each shake = an eased tilt-and-return (a "snap").
  // Shake A in [0,0.22], shake B in [0.30,0.52], rest after.
  function shakeTilt(p: number, a0: number, a1: number, dir: number): number {
    if (p < a0 || p > a1) return 0;
    const u = (p - a0) / (a1 - a0); // 0..1
    // Out fast, settle back with a small overshoot.
    return dir * (easeOutBack(Math.sin(u * Math.PI), 1.8)) * 0.16;
  }
  const tilt = shakeTilt(ph, 0.0, 0.22, +1) + shakeTilt(ph, 0.30, 0.52, -1);
  // Frame "velocity" used to drive disc follow-through.
  const shakeActive = (ph < 0.22 ? 1 : 0) + (ph >= 0.30 && ph <= 0.52 ? 1 : 0);
  const xshift = tilt * 4; // small translation accompanying the tilt

  groundShadow(ctx, 0, 21, 18, 4, 0, 0.26);

  ctx.save();
  ctx.translate(xshift, 0);
  ctx.rotate(-0.1 + tilt);

  // Wooden rim.
  const rimG = ctx.createLinearGradient(-20, 0, 20, 0);
  rimG.addColorStop(0, "#5a3010");
  rimG.addColorStop(0.5, "#a86828");
  rimG.addColorStop(1, "#4a2808");
  ctx.fillStyle = rimG;
  ctx.beginPath();
  ctx.ellipse(0, 2, 20, 18, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Skin head.
  const head = ctx.createRadialGradient(-5, -3, 3, 0, 2, 18);
  head.addColorStop(0, "#fdf3dc");
  head.addColorStop(0.7, "#e8d2a0");
  head.addColorStop(1, "#c0a060");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(0, 2, 15, 13.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-6, -4, 5, 4, -0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,72,24,0.5)";
  ctx.lineWidth = 0.7;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.ellipse(0, 2, 15, 13.5, 0, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // Jingle discs — FOLLOW THROUGH: each disc swings outward in its slot, lagging the
  // frame's snap (a damped rattle that decays into the rest), each on its own phase.
  const jingles = 8;
  for (let i = 0; i < jingles; i++) {
    const a = (i / jingles) * TAU - Math.PI / 2;
    // Lagged, damped rattle: excited during a shake, decays after. Per-disc phase.
    const rattle = shakeActive * Math.sin(t * 16 - i * 0.8) * (0.9 + 0.4 * Math.sin(i));
    const wob = rattle * 0.6;
    const jx2 = Math.cos(a) * (18 + wob);
    const jy2 = 2 + Math.sin(a) * (16 + wob);
    ctx.fillStyle = "#3a2008";
    ctx.beginPath();
    ctx.ellipse(jx2, jy2, 3.4, 2.2, a, 0, TAU);
    ctx.fill();
    const jg = ctx.createRadialGradient(jx2 - 1, jy2 - 1, 0.5, jx2, jy2, 3);
    jg.addColorStop(0, "#fff3b0");
    jg.addColorStop(0.6, "#e0a830");
    jg.addColorStop(1, "#8a5510");
    ctx.fillStyle = jg;
    ctx.beginPath();
    ctx.arc(jx2, jy2, 2.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#3a2008";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Disc gleam flares with the rattle.
    const flash = 0.5 + 0.5 * Math.abs(rattle);
    ctx.save();
    ctx.globalAlpha = flash;
    ctx.fillStyle = "rgba(255,250,220,0.9)";
    ctx.beginPath();
    ctx.arc(jx2 - 0.8, jy2 - 0.8, 0.8 + flash * 0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore(); // tilt

  // A clean sparkle pops at the rim at the top of each shake (the chh!) — then rests.
  const popA = beat(t, period, 0.12, 0.0) + beat(t, period, 0.12, 0.30);
  if (popA > 0.05) {
    const ringR = 22;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU - 0.6;
      sparkle(ctx, Math.cos(a) * ringR, 2 + Math.sin(a) * (ringR * 0.86), 1.3, popA * 0.8, "255,243,176");
    }
  }
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  instr_lute: animLute,
  instr_drum: animDrum,
  instr_flute: animFlute,
  instr_horn: animHorn,
  instr_fiddle: animFiddle,
  instr_bell: animBell,
  instr_pan_flute: animPanFlute,
  instr_tambourine: animTambourine,
};
