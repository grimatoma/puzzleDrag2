// Seasonal art for the CATTLE TRICERATOPS board tile (`tile_cattle_triceratops`).
//
// A green triceratops treated as livestock — a stocky green dinosaur with a
// large bony NECK FRILL behind the head, THREE horns (a short nose horn + two
// long brow horns), a beaked face, sturdy legs, and a thick tail. It stands on
// a grass pad in front-¾, turned ~15–20° toward the lower-left (the animal may
// overhang the pad width), legs/contact on the pad.
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// green triceratops + seasonal dressing + light wash) from a tweenable
// parameter set `P`. The four seasons are four `P` presets; the three forward
// transitions lerp EVERY field of `P` through a quintic smoothstep, so
// transition(0) === the from-season still and transition(1) === the to-season
// still — no snap.
//
// PALETTE LOCK: the triceratops is ALWAYS the same green, three-horned,
// frilled dinosaur. The SILHOUETTE/OUTLINE and the green IDENTITY (green hide,
// pale beak/horns, a frill) are constant across all seasons. Only the HIDE
// tone (fresh green → rich green → olive-green), the pad colour, the light
// wash, and dressing (blossom, fallen leaves, frost, back/frill snow,
// breath-fog) change. The subject is never recoloured away from green,
// hollowed, or swapped.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Animations are deterministic
// (sin/cos/modulo of `t` in seconds), seamless, and subtle: a slow heavy
// breathing bob (zero velocity at t=0 → anim(…,0) matches the still), plus a
// slow head-sway and a tail swish once per loop, plus the per-season
// micro-motion (spring dew shimmer, summer hide sheen, autumn leaf stir,
// winter breath-fog pulse + drifting snowflake).

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  if (x > 1) return 1;
  return x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

// quintic smoothstep — zero first & second derivative at both ends
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at t=0,
// seamless over a 2π/w period, peak amplitude A. Heavy/slow for a big animal.
function bobAt(t: number, amp = 1.0, w = 1.15): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY: the green hide tones, the pale beak/horn/frill-rim, and the dark
// hard parts (eye, hoof shade) live in P only so the season tone + light wash
// can nudge them. Everything that genuinely differs per season is the hide
// tone + pad + light + dressing amounts. NO booleans / season strings.

interface P {
  hideLight: RGB; // lit top of the green hide
  hideMid: RGB; // body tone
  hideShadow: RGB; // shaded underside / belly of the green hide
  frill: RGB; // the bony neck frill plate
  frillRim: RGB; // the lighter bumpy rim of the frill
  beak: RGB; // pale beak + horns (the bony pale parts)
  hornDark: RGB; // horn shadow / hoof / eye (the dark hard parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  hideSheen: number; // 0..1 surface sheen strength on the hide
  frostAmt: number; // 0..1 frost sparkle on the hide
  backSnowAmt: number; // 0..1 snow on the frill + back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the beak (winter)
}

// Four season presets. The triceratops stays the SAME green, three-horned,
// frilled dinosaur; only hide tone + pad + light + dressing differ.
const SP: Record<SeasonName, P> = {
  // Spring — fresh green hide; dewy lime pad + blossom; cool-bright light.
  Spring: {
    hideLight: [142, 200, 96],
    hideMid: [96, 162, 66],
    hideShadow: [58, 110, 48],
    frill: [120, 168, 84],
    frillRim: [176, 214, 124],
    beak: [226, 220, 188],
    hornDark: [70, 70, 56],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [40, 60, 34],
    lightWash: [214, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    hideSheen: 0.22,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — rich green hide (PEAK), saturated mid-green pad, warm light.
  Summer: {
    hideLight: [128, 196, 78],
    hideMid: [78, 156, 56],
    hideShadow: [44, 102, 42],
    frill: [104, 158, 70],
    frillRim: [162, 206, 110],
    beak: [232, 224, 188],
    hornDark: [64, 64, 50],
    padGrass: [86, 170, 64], // saturated mid-green
    soil: [64, 116, 44],
    outline: [34, 58, 30],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.2,
    hideSheen: 0.55,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — duller olive-green hide; olive-tan pad; a couple of fallen leaves.
  Autumn: {
    hideLight: [148, 168, 86],
    hideMid: [110, 130, 60],
    hideShadow: [72, 88, 42],
    frill: [126, 138, 74],
    frillRim: [170, 178, 104],
    beak: [220, 206, 162],
    hornDark: [70, 62, 44],
    padGrass: [156, 150, 90], // olive-tan browning grass
    soil: [112, 96, 52],
    outline: [54, 50, 28],
    lightWash: [248, 210, 150], // low amber
    lightWashAmt: 0.2,
    hideSheen: 0.28,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.8,
    breathFogAmt: 0,
  },
  // Winter — green hide still clearly visible, snow on frill + back, frost
  // dusting, breath-fog at the beak, snowy pad, cool light.
  Winter: {
    hideLight: [118, 168, 92],
    hideMid: [80, 134, 64],
    hideShadow: [50, 96, 50],
    frill: [104, 142, 84],
    frillRim: [156, 188, 122],
    beak: [216, 216, 196],
    hornDark: [62, 64, 58],
    padGrass: [182, 200, 216], // muted grey-green under snow
    soil: [120, 142, 164],
    outline: [44, 56, 50],
    lightWash: [206, 226, 252], // cool blue-grey
    lightWashAmt: 0.3,
    hideSheen: 0.18,
    frostAmt: 0.62,
    backSnowAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.8,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    hideLight: lerpRGB(a.hideLight, b.hideLight, t),
    hideMid: lerpRGB(a.hideMid, b.hideMid, t),
    hideShadow: lerpRGB(a.hideShadow, b.hideShadow, t),
    frill: lerpRGB(a.frill, b.frill, t),
    frillRim: lerpRGB(a.frillRim, b.frillRim, t),
    beak: lerpRGB(a.beak, b.beak, t),
    hornDark: lerpRGB(a.hornDark, b.hornDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    hideSheen: lerp(a.hideSheen, b.hideSheen, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    backSnowAmt: lerp(a.backSnowAmt, b.backSnowAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    hideSheen: clamp01(p.hideSheen),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Pad dressing (shared with the pepper/cow idiom) ──────────────────────────

function drawPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow lower-right
  ctx.fillStyle = rgb(p.soil, 0.4);
  ctx.beginPath();
  ctx.ellipse(3, 21.6, 16, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // grass top
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted top edge — little blades around the upper rim
  ctx.strokeStyle = rgb(p.soil);
  ctx.lineWidth = 1.1;
  for (let i = -7; i <= 7; i++) {
    const tx = i * 2.4;
    const ty = 19 - Math.sqrt(Math.max(0, 1 - (tx / 18) ** 2)) * 5.2;
    ctx.beginPath();
    ctx.moveTo(tx, ty + 0.4);
    ctx.lineTo(tx - 0.8, ty - 2.4);
    ctx.stroke();
  }

  // pad snow blanket (winter)
  if (p.padSnowAmt > 0.01) {
    ctx.fillStyle = rgb([244, 250, 255], 0.92 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([210, 226, 244], 0.5 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.padSnowAmt);
    [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // blossoms on the pad (spring)
  if (p.blossomAmt > 0.01) {
    const a = p.blossomAmt;
    const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
    spots.forEach(([bx, by], idx) => {
      ctx.fillStyle = rgb(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(bx + Math.cos(ang) * 1.5, by + Math.sin(ang) * 1.0, 1.1, 0.8, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgb([255, 214, 90], a);
      ctx.beginPath();
      ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // fallen leaves on the pad (autumn)
  if (p.fallenLeafAmt > 0.01) {
    const a = p.fallenLeafAmt;
    const leaves: Array<[number, number, number, RGB]> = [
      [-12, 19.6, -0.5, [196, 120, 40]],
      [12, 18.6, 0.7, [176, 72, 32]],
    ];
    leaves.forEach(([lx, ly, rot, col]) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb(col, a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb([90, 44, 16], a);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(3, 0);
      ctx.stroke();
      ctx.restore();
    });
  }
}

// ── The triceratops silhouette (IDENTICAL every season; only colours change) ──
//
// Layout in design space (origin centre, +y down). Body bulk sits centre-right,
// head + frill turned toward the lower-left, tail sweeping to the right.
//   - body mass        : centred ~ (1, 4)
//   - head + beak       : lower-left ~ (-13, 6)
//   - frill plate       : up-left behind the head, fanning to ~ (-8, -8)
//   - tail              : sweeping right to ~ (18, 8)
//   - four sturdy legs  : on the pad

/** Trace the rounded body+haunch mass. `bob` shifts it vertically. */
function bodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  ctx.beginPath();
  // back over the shoulders (left) sweeping up over the haunch (right)
  ctx.moveTo(-9, 2 + bob);
  ctx.quadraticCurveTo(-4, -6 + bob, 5, -5 + bob); // arched back
  ctx.quadraticCurveTo(14, -4 + bob, 16, 4 + bob); // haunch
  ctx.quadraticCurveTo(17, 11 + bob, 11, 13 + bob); // rump down
  ctx.quadraticCurveTo(2, 16 + bob, -7, 13 + bob); // belly
  ctx.quadraticCurveTo(-12, 11 + bob, -10, 5 + bob); // chest up to shoulder
  ctx.closePath();
}

/** Draw the whole tile from ONLY `p`, a body `bob`, a head sway and tail swish. */
function paint(
  ctx: CanvasRenderingContext2D,
  raw: P,
  bob: number,
  headSway = 0,
  tailSwish = 0,
): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    drawPad(ctx, p);

    // contact shadow of the beast on the pad
    ctx.fillStyle = rgb(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(2.5, 16.5, 15, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Tail — sweeping to the right, behind the haunch ─────────────────────
    {
      const tx = tailSwish; // lateral swish offset at the tip
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.moveTo(13, 6 + bob);
      ctx.quadraticCurveTo(20, 7 + bob, 21 + tx, 11 + bob);
      ctx.stroke();
      ctx.strokeStyle = rgb(p.hideMid);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(13, 6 + bob);
      ctx.quadraticCurveTo(20, 7 + bob, 21 + tx, 11 + bob);
      ctx.stroke();
      ctx.strokeStyle = rgb(p.hideLight, 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(13, 4.5 + bob);
      ctx.quadraticCurveTo(19, 5.5 + bob, 20.4 + tx, 9.5 + bob);
      ctx.stroke();
    }

    // ── Far legs (drawn first, behind the body) ─────────────────────────────
    const drawLeg = (x: number, top: number, len: number, w: number, far: boolean): void => {
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = w + 2;
      ctx.beginPath();
      ctx.moveTo(x, top + bob);
      ctx.lineTo(x, top + len);
      ctx.stroke();
      ctx.strokeStyle = far ? rgb(p.hideShadow) : rgb(p.hideMid);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, top + bob);
      ctx.lineTo(x, top + len);
      ctx.stroke();
      // toed foot
      ctx.fillStyle = rgb(p.hornDark, far ? 0.7 : 1);
      ctx.beginPath();
      ctx.ellipse(x, top + len, w * 0.62, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawLeg(-3, 11, 5, 4.6, true); // far foreleg
    drawLeg(9, 11.5, 4.6, 5.4, true); // far hindleg

    // ── Frill — large bony plate fanning up-left behind the head ────────────
    // Drawn before the body so the body/head overlap the frill base.
    {
      ctx.save();
      ctx.translate(-4 + headSway * 0.5, bob);
      // outline plate
      ctx.fillStyle = rgb(p.outline);
      ctx.beginPath();
      ctx.moveTo(-1, 7);
      ctx.quadraticCurveTo(-13, 4, -11, -9); // left edge sweeping up
      ctx.quadraticCurveTo(-7, -15, 1, -13); // top arc
      ctx.quadraticCurveTo(9, -12, 9, -3); // right edge
      ctx.quadraticCurveTo(8, 4, 2, 7); // back to neck
      ctx.closePath();
      ctx.fill();
      // frill plate fill (inset)
      ctx.fillStyle = rgb(p.frill);
      ctx.beginPath();
      ctx.moveTo(-0.5, 5.6);
      ctx.quadraticCurveTo(-11, 3, -9.2, -8); // left
      ctx.quadraticCurveTo(-5.6, -13, 1, -11.4); // top
      ctx.quadraticCurveTo(7.4, -10.4, 7.4, -2.6); // right
      ctx.quadraticCurveTo(6.6, 3, 1.6, 5.6); // back
      ctx.closePath();
      ctx.fill();
      // bumpy lighter rim along the top edge
      ctx.fillStyle = rgb(p.frillRim);
      const bumps: Array<[number, number]> = [
        [-8.6, -7.4], [-5.4, -11], [-1, -12.4], [3.2, -11.4], [6.6, -7.8],
      ];
      bumps.forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.arc(bx, by, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
      // radial shading lines on the plate
      ctx.strokeStyle = rgb(p.hideShadow, 0.55);
      ctx.lineWidth = 1;
      [-7.5, -3.5, 0.5, 4.5].forEach((ex, i) => {
        ctx.beginPath();
        ctx.moveTo(0.5, 4);
        ctx.lineTo(ex, -9 + i * 0.4);
        ctx.stroke();
      });
      ctx.restore();
    }

    // ── Body mass ───────────────────────────────────────────────────────────
    bodyPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    ctx.save();
    bodyPath(ctx, bob);
    ctx.clip();
    // base mid tone
    ctx.fillStyle = rgb(p.hideMid);
    ctx.fillRect(-14, -8 + bob, 34, 28);
    // lit back (upper-left light)
    const litGrad = ctx.createLinearGradient(-8, -6 + bob, 10, 14 + bob);
    litGrad.addColorStop(0, rgb(p.hideLight));
    litGrad.addColorStop(0.5, rgb(p.hideMid));
    litGrad.addColorStop(1, rgb(p.hideShadow));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(1, 2 + bob, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // belly shadow
    ctx.fillStyle = rgb(p.hideShadow, 0.7);
    ctx.beginPath();
    ctx.ellipse(0, 12 + bob, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // scaly back ridge bumps
    ctx.fillStyle = rgb(p.hideShadow, 0.5);
    [-6, -1, 4, 9].forEach((rx, i) => {
      ctx.beginPath();
      ctx.arc(rx, -4 + i * 0.5 + bob, 1.4, 0, Math.PI * 2);
      ctx.fill();
    });
    // hide sheen on the shoulder
    if (p.hideSheen > 0.02) {
      ctx.fillStyle = rgb([255, 255, 255], 0.12 + 0.32 * p.hideSheen);
      ctx.beginPath();
      ctx.ellipse(-3, -1 + bob, 5.5, 3.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // frost dusting on the upward hide (winter)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgb([222, 238, 252], 0.24 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(1, -3 + bob, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb([240, 248, 255], 0.7 * p.frostAmt);
      [[-7, -4], [-1, -5], [5, -4], [10, -2], [2, -1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy + bob, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore(); // end body clip

    // ── Near legs (in front of the body) ────────────────────────────────────
    drawLeg(-6, 10.5, 5.4, 5, false); // near foreleg
    drawLeg(6, 11.5, 4.8, 6, false); // near hindleg

    // ── Snow on the frill + back (winter), drawn over the body & frill ──────
    if (p.backSnowAmt > 0.02) {
      const a = p.backSnowAmt;
      // snow ridge along the back
      ctx.fillStyle = rgb([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-8, 1 + bob);
      ctx.quadraticCurveTo(-3, -7 + bob, 5, -6 + bob);
      ctx.quadraticCurveTo(13, -5 + bob, 15, 2 + bob);
      ctx.quadraticCurveTo(10, -2 + bob, 4, -3 + bob);
      ctx.quadraticCurveTo(-3, -3.5 + bob, -8, 1 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgb([214, 230, 246], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(2, -4 + bob, 9, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // snow capping the frill top edge
      ctx.save();
      ctx.translate(-4 + headSway * 0.5, bob);
      ctx.fillStyle = rgb([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-9.2, -8);
      ctx.quadraticCurveTo(-5.6, -14, 1, -12.6);
      ctx.quadraticCurveTo(7, -11.6, 7.4, -5);
      ctx.quadraticCurveTo(4, -9.4, -1, -10);
      ctx.quadraticCurveTo(-6, -10.2, -9.2, -8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ── Head + beak + horns + eye, turned toward lower-left ──────────────────
    {
      ctx.save();
      ctx.translate(-12 + headSway, 5 + bob);
      ctx.rotate(0.12); // tip the snout down a touch

      // head block outline
      ctx.fillStyle = rgb(p.outline);
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.quadraticCurveTo(2, -7, -4, -3); // brow → snout top
      ctx.quadraticCurveTo(-9, -1, -8.5, 2.5); // toward beak tip
      ctx.quadraticCurveTo(-6, 5.5, 0, 5); // jaw under
      ctx.quadraticCurveTo(6, 5, 8, 1); // cheek back to neck
      ctx.closePath();
      ctx.fill();

      // head fill
      ctx.fillStyle = rgb(p.hideMid);
      ctx.beginPath();
      ctx.moveTo(7, -3.6);
      ctx.quadraticCurveTo(2, -5.4, -3.4, -1.8);
      ctx.quadraticCurveTo(-7.4, -0.2, -7, 2.2);
      ctx.quadraticCurveTo(-5, 4.4, 0, 3.8);
      ctx.quadraticCurveTo(5, 3.8, 6.6, 0.2);
      ctx.closePath();
      ctx.fill();
      // lit upper cheek
      ctx.fillStyle = rgb(p.hideLight, 0.8);
      ctx.beginPath();
      ctx.ellipse(0, -1.4, 4.2, 2.2, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // pale beak (parrot-like) at the snout tip
      ctx.fillStyle = rgb(p.beak);
      ctx.beginPath();
      ctx.moveTo(-3.4, -1.6);
      ctx.quadraticCurveTo(-9.4, -0.4, -8.6, 2.6); // upper beak hook
      ctx.quadraticCurveTo(-6.4, 4.2, -3, 3.2); // lower
      ctx.quadraticCurveTo(-4.4, 0.8, -3.4, -1.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgb(p.hornDark, 0.7);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-7.6, 1);
      ctx.lineTo(-3.6, 0.8);
      ctx.stroke();

      // short NOSE horn (1) — above the beak
      ctx.fillStyle = rgb(p.beak);
      ctx.strokeStyle = rgb(p.hornDark, 0.6);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3.6, -2.2);
      ctx.quadraticCurveTo(-5.2, -6.2, -2.6, -7.2);
      ctx.quadraticCurveTo(-1.6, -4.4, -1.6, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // two long BROW horns (2 + 3) — sweeping up and forward over the brow
      const brow = (sx: number, dx: number, dy: number, _len: number): void => {
        ctx.fillStyle = rgb(p.beak);
        ctx.beginPath();
        ctx.moveTo(sx, -3.4);
        ctx.quadraticCurveTo(sx + dx * 0.5, -3.4 + dy * 0.55, sx + dx, -3.4 + dy);
        ctx.quadraticCurveTo(sx + dx + 1.1, -3.4 + dy + 1.2, sx + 1.8, -2.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgb(p.hornDark, 0.55);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(sx + 0.6, -3.2);
        ctx.quadraticCurveTo(sx + dx * 0.55, -3.4 + dy * 0.55, sx + dx, -3.4 + dy);
        ctx.stroke();
      };
      brow(1.8, -3.4, -9.6, 0); // near brow horn (lower-left)
      brow(5.4, -2.4, -10.6, 0); // far brow horn (slightly behind)

      // eye
      ctx.fillStyle = rgb(p.hornDark);
      ctx.beginPath();
      ctx.arc(1.6, -0.6, 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb([255, 255, 255], 0.85);
      ctx.beginPath();
      ctx.arc(1.2, -1.0, 0.42, 0, Math.PI * 2);
      ctx.fill();

      // breath-fog puff at the beak (winter)
      if (p.breathFogAmt > 0.02) {
        const a = p.breathFogAmt;
        ctx.fillStyle = rgb([255, 255, 255], 0.34 * a);
        [[-10.5, 2.4, 2.0], [-12.6, 1.2, 1.5], [-12.4, 3.4, 1.3]].forEach(([fx, fy, fr]) => {
          ctx.beginPath();
          ctx.arc(fx, fy, fr, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();
    }

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
    if (p.lightWashAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lg = ctx.createRadialGradient(-10, -14, 2, -10, -14, 48);
      lg.addColorStop(0, rgb(p.lightWash, p.lightWashAmt));
      lg.addColorStop(1, rgb(p.lightWash, p.lightWashAmt * 0.25));
      ctx.fillStyle = lg;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0, 0, 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    // Slow heavy breathing bob (0 at t=0, zero velocity → matches the still).
    const bob = bobAt(t, 1.0, 1.15);
    // Slow head-sway, once per loop (also 0 at t=0).
    const headSway = (1 - Math.cos(t * 0.85)) * 0.5 * 1.4;
    // Tail swish once per loop (0 at t=0).
    const tailSwish = (1 - Math.cos(t * 0.7)) * 0.5 * 3.0;
    paint(ctx, SP[season], bob, headSway, tailSwish);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint travelling on the back
        const g = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.0));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -3 + bob + Math.sin(t * 1.0) * 1.2;
        ctx.beginPath();
        ctx.arc(-2, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // bright hide sheen streak travelling along the shoulder (seamless)
        const prog = (t * 0.45) % 1;
        const gx = lerp(-6, 8, prog);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(gx, -2 + bob, 2.0, 3.4, -0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a fallen leaf stirs / tumbles gently across the lower-left pad
        const prog = (t * 0.3) % 1;
        const lx = -13 + prog * 8;
        const ly = 19.6 - Math.sin(prog * Math.PI) * 2.2;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(prog * Math.PI * 2);
        ctx.fillStyle = "rgba(196,120,40,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.8, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Winter — breath-fog pulse at the beak + a drifting snowflake
        const fogPulse = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.6));
        ctx.fillStyle = `rgba(255,255,255,${0.3 * fogPulse})`;
        const fx0 = -22 - 1.5 * fogPulse + headSway;
        [[fx0, 10, 2.4 * fogPulse], [fx0 - 2.4, 8.6, 1.8 * fogPulse]].forEach(
          ([fx, fy, fr]) => {
            ctx.beginPath();
            ctx.arc(fx, fy, Math.max(0.1, fr), 0, Math.PI * 2);
            ctx.fill();
          },
        );
        // a single drifting snowflake
        const prog = (t / 3.4) % 1;
        const sy = -22 + prog * 40;
        const sx = -4 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(sx, sy, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Forward season→season transitions ────────────────────────────────────────

function makeTransition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, p: number) => void {
  const from = SP[SEASON_NAMES[fromIdx]];
  const to = SP[SEASON_NAMES[fromIdx + 1]];
  return (ctx, pp) => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(from, to, k), 0, 0, 0);
  };
}

const springToSummer = makeTransition(0);
const summerToAutumn = makeTransition(1);
const autumnToWinter = makeTransition(2);

// ── Exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: draw("Spring"), anim: anim("Spring") },
  Summer: { draw: draw("Summer"), anim: anim("Summer") },
  Autumn: { draw: draw("Autumn"), anim: anim("Autumn") },
  Winter: { draw: draw("Winter"), anim: anim("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
