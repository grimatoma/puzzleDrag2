// Seasonal art for the KELP aquatic tile (`tile_fish_kelp`).
//
// A frond of green-brown kelp: a tall slender stipe (stalk) rising from a small
// holdfast on a still WATER pad, with several long wavy blade-leaves and a few
// round gas-bladder floats along it, swaying as if in a slow underwater current.
// The SAME silhouette is drawn every season — only colour, the small dressing
// (blossom petal / fallen leaf / frost / snow), the water vs ice pad, gloss and
// the light wash change. Enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// AQUATIC framing: the ground pad reads as still bluish reflective WATER, not
// grass; the kelp grows up out of it from a small holdfast. Winter FREEZES the
// water to pale blue-white ICE (`iceAmt`) with frost sparkle; the kelp stays
// clearly visible in its own green-brown colour (palette lock).
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Pure Canvas-2D vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  bladeLight: RGB; // lit face of the kelp blades / stipe
  bladeMid: RGB; // body tone of the kelp
  bladeDark: RGB; // shadowed blade undersides / stipe shadow
  float: RGB; // round gas-bladder floats
  holdfast: RGB; // the small rooty holdfast at the base
  padWater: RGB; // top of the water pad (or ice when frozen)
  padDark: RGB; // shaded water underside / depth
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 fullness/age cue (informs nothing structural)
  gloss: number; // 0..1 specular sheen strength on the blades
  frostAmt: number; // 0..1 cool frost dusting on the blades (winter)
  snowCapAmt: number; // 0..1 snow on the upward kelp surfaces (winter)
  iceAmt: number; // 0..1 water frozen to pale blue-white ice on the pad
  padSnowAmt: number; // 0..1 snow sparkle dusting on the frozen pad
  blossomAmt: number; // 0..1 tiny blossom petal floating on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf floating on the pad (autumn)
  frayAmt: number; // 0..1 frayed/browning blade tips (autumn)
}

// ── Local math helpers ───────────────────────────────────────────────────────

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  if (x > 1) return 1;
  return x;
}

const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

function rgba(c: RGB, a: number): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp01(a)})`;
}

function lerpP(a: P, b: P, t: number): P {
  return {
    bladeLight: lerpRGB(a.bladeLight, b.bladeLight, t),
    bladeMid: lerpRGB(a.bladeMid, b.bladeMid, t),
    bladeDark: lerpRGB(a.bladeDark, b.bladeDark, t),
    float: lerpRGB(a.float, b.float, t),
    holdfast: lerpRGB(a.holdfast, b.holdfast, t),
    padWater: lerpRGB(a.padWater, b.padWater, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    iceAmt: lerp(a.iceAmt, b.iceAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    frayAmt: lerp(a.frayAmt, b.frayAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    ripeness: clamp01(p.ripeness),
    gloss: clamp01(p.gloss),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    iceAmt: clamp01(p.iceAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    frayAmt: clamp01(p.frayAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// Palette lock: kelp stays GREEN-BROWN every season — ripeness/age shows in
// surface colour and shade, never an identity change.

const SP: Record<SeasonName, P> = {
  // Spring — bright fresh-green young kelp; fresh blue water; a tiny blossom.
  Spring: {
    bladeLight: [150, 206, 96],
    bladeMid: [86, 156, 64],
    bladeDark: [48, 104, 50],
    float: [120, 176, 80],
    holdfast: [96, 78, 44],
    padWater: [126, 196, 222],
    padDark: [70, 134, 168],
    outline: [34, 62, 40],
    light: [228, 244, 230],
    lightAmt: 0.16,
    ripeness: 0.3,
    gloss: 0.4,
    frostAmt: 0,
    snowCapAmt: 0,
    iceAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    frayAmt: 0,
  },
  // Summer — lush full green-brown kelp (PEAK); bright saturated blue water.
  Summer: {
    bladeLight: [126, 178, 70],
    bladeMid: [78, 132, 52],
    bladeDark: [44, 92, 42],
    float: [108, 150, 60],
    holdfast: [102, 80, 42],
    padWater: [70, 168, 220],
    padDark: [34, 108, 168],
    outline: [28, 54, 32],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 1.0,
    gloss: 0.95,
    frostAmt: 0,
    snowCapAmt: 0,
    iceAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    frayAmt: 0,
  },
  // Autumn — browning/amber kelp, frayed tips; olive-tinged water; a fallen leaf.
  Autumn: {
    bladeLight: [176, 150, 70],
    bladeMid: [134, 104, 50],
    bladeDark: [88, 66, 36],
    float: [150, 118, 56],
    holdfast: [104, 76, 40],
    padWater: [120, 150, 130],
    padDark: [80, 104, 84],
    outline: [58, 44, 26],
    light: [248, 208, 148],
    lightAmt: 0.2,
    ripeness: 0.75,
    gloss: 0.4,
    frostAmt: 0,
    snowCapAmt: 0,
    iceAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
    frayAmt: 0.85,
  },
  // Winter — water FROZEN to pale blue-white ICE; frost + snow on the blades;
  // green-brown kelp still clearly visible underneath; cool light.
  Winter: {
    bladeLight: [110, 150, 78],
    bladeMid: [72, 112, 54],
    bladeDark: [46, 80, 44],
    float: [96, 130, 62],
    holdfast: [92, 78, 56],
    padWater: [206, 226, 240],
    padDark: [150, 178, 204],
    outline: [40, 52, 52],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.6,
    gloss: 0.3,
    frostAmt: 0.7,
    snowCapAmt: 0.8,
    iceAmt: 0.9,
    padSnowAmt: 0.8,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    frayAmt: 0.2,
  },
};

// ── Kelp geometry (the SAME silhouette every season) ─────────────────────────
// Origin-centered. Holdfast on the pad at the base, stipe rising up to the top.

const KELP_BASE_Y = 17; // holdfast / stipe base resting on the water
const KELP_TOP_Y = -22; // top of the stipe

/** Spine of the stipe as a gentle S-curve; `s` in 0..1 from base→top.
 *  `wave` shifts the whole frond's lateral bend (idle current) without changing
 *  the silhouette's identity. */
function stipePoint(s: number, wave: number): [number, number] {
  const y = lerp(KELP_BASE_Y, KELP_TOP_Y, s);
  // a fixed gentle S plus a small height-scaled wave offset
  const baseBend = Math.sin(s * Math.PI * 1.15) * 3.4 - s * 2.0;
  const x = baseBend + wave * s * s;
  return [x, y];
}

/** Blade anchor points along the stipe (s position, side: -1 left / +1 right). */
const BLADES: Array<[number, number, number]> = [
  // s, side, length
  [0.24, -1, 12],
  [0.42, 1, 13],
  [0.6, -1, 12.5],
  [0.78, 1, 11],
  [0.92, -1, 9],
];

/** Gas-bladder float anchors along the stipe. */
const FLOATS: Array<[number, number]> = [
  // s, side
  [0.36, 1],
  [0.55, -1],
  [0.72, 1],
  [0.88, -1],
];

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p`, `bob` and `wave`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number, wave = 0): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat WATER ellipse, x∈[−18,+18], centre y≈+19 ───────────────
    // soft contact shadow lower-right
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // shaded water underside / depth
    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // water surface top
    ctx.fillStyle = rgb(p.padWater);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // reflective water highlight band (a still-water sheen)
    ctx.fillStyle = rgba([255, 255, 255], 0.16 * (1 - 0.5 * p.iceAmt));
    ctx.beginPath();
    ctx.ellipse(-4, 17.6, 11, 2.0, -0.06, 0, Math.PI * 2);
    ctx.fill();
    // a couple of subtle ripple arcs on the surface
    ctx.strokeStyle = rgba([255, 255, 255], 0.18 * (1 - 0.6 * p.iceAmt));
    ctx.lineWidth = 0.8;
    [[-6, 18.6, 7], [6, 20, 6]].forEach(([rx, ry, rr]) => {
      ctx.beginPath();
      ctx.ellipse(rx, ry, rr, rr * 0.28, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    });

    // ── Winter: freeze the water to pale blue-white ICE ──────────────────────
    if (p.iceAmt > 0.01) {
      const a = p.iceAmt;
      // icy sheet over the surface
      ctx.fillStyle = rgba([232, 244, 252], 0.85 * a);
      ctx.beginPath();
      ctx.ellipse(0, 18.6, 17.6 * (0.6 + 0.4 * a), 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([198, 222, 240], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // crisp crack lines in the ice
      ctx.strokeStyle = rgba([170, 198, 222], 0.6 * a);
      ctx.lineWidth = 0.7;
      [[-10, 18, -3, 20], [4, 17.6, 11, 19.4], [-2, 21, 5, 18.6]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      // frost sparkle on the ice
      if (p.padSnowAmt > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.8 * clamp01(p.padSnowAmt));
        ([[-9, 17.6], [5, 19], [11, 17.6], [-3, 20.2]] as Array<[number, number]>).forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // blossom petal floating on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-12.5, 18.6], [11.5, 18]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 0 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(ang) * 1.4, by + Math.sin(ang) * 0.9, 1.0, 0.7, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba([255, 214, 90], a);
        ctx.beginPath();
        ctx.arc(bx, by, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen leaf floating on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.4, -0.5, [196, 120, 40]],
        [12, 18.6, 0.7, [176, 72, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Contact shadow of the kelp on the water/ice ─────────────────────────
    ctx.fillStyle = rgba(p.outline, 0.22);
    ctx.beginPath();
    ctx.ellipse(2.5, KELP_BASE_Y + 2, 8, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Holdfast: a small rooty clump where the stipe grips the bed ──────────
    ctx.fillStyle = rgb(p.holdfast);
    ctx.beginPath();
    ctx.moveTo(-6, KELP_BASE_Y + 1.5);
    ctx.quadraticCurveTo(-3, KELP_BASE_Y - 3, 0, KELP_BASE_Y - 2.5);
    ctx.quadraticCurveTo(3, KELP_BASE_Y - 3, 6, KELP_BASE_Y + 1.5);
    ctx.quadraticCurveTo(3, KELP_BASE_Y + 3, 0, KELP_BASE_Y + 2.4);
    ctx.quadraticCurveTo(-3, KELP_BASE_Y + 3, -6, KELP_BASE_Y + 1.5);
    ctx.closePath();
    ctx.fill();
    // a few little root fingers
    ctx.strokeStyle = rgb(p.holdfast);
    ctx.lineWidth = 1.6;
    [-5, -2, 2, 5].forEach((rx) => {
      ctx.beginPath();
      ctx.moveTo(rx * 0.6, KELP_BASE_Y - 1);
      ctx.quadraticCurveTo(rx, KELP_BASE_Y + 2, rx, KELP_BASE_Y + 3.2);
      ctx.stroke();
    });

    // ── The kelp frond (SAME silhouette every season) ───────────────────────
    // Precompute the wavy spine.
    const STEPS = 14;
    const spine: Array<[number, number]> = [];
    for (let i = 0; i <= STEPS; i++) spine.push(stipePoint(i / STEPS, wave));
    // apply the idle bob (whole frond lifts a touch) to the top portion
    const spineBob = spine.map(([x, y], i): [number, number] => [x, y - bob * (i / STEPS)]);

    // local helper: a single long wavy blade-leaf off the stipe
    const drawBlade = (s: number, side: number, len: number, fill: string, w: number): void => {
      const [ax, ay] = stipePoint(s, wave);
      const bobY = ay - bob * s;
      const dir = side;
      // blade arcs out and curls up; fray shortens & ragged the tip in autumn
      const eff = len * (1 - 0.18 * p.frayAmt);
      const tipX = ax + dir * eff * 0.62;
      const tipY = bobY - eff * 0.5;
      const midX = ax + dir * eff * 0.42;
      const midY = bobY - eff * 0.12;
      ctx.strokeStyle = fill;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ax, bobY);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();
    };

    // 1) dark base pass for ALL blades + stipe (gives a soft dark outline rim)
    BLADES.forEach(([s, side, len]) => drawBlade(s, side, len + 1, rgb(p.outline), 5.2));
    // stipe outline
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(spineBob[0][0], spineBob[0][1]);
    for (let i = 1; i < spineBob.length; i++) ctx.lineTo(spineBob[i][0], spineBob[i][1]);
    ctx.stroke();

    // 2) mid-tone blades
    BLADES.forEach(([s, side, len]) => drawBlade(s, side, len, rgb(p.bladeMid), 3.6));
    // 3) lit edge on blades (upper-left light)
    BLADES.forEach(([s, side, len]) => {
      if (side < 0) drawBlade(s, side, len * 0.92, rgb(p.bladeLight), 1.5);
    });

    // stipe mid-tone
    ctx.strokeStyle = rgb(p.bladeMid);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(spineBob[0][0], spineBob[0][1]);
    for (let i = 1; i < spineBob.length; i++) ctx.lineTo(spineBob[i][0], spineBob[i][1]);
    ctx.stroke();
    // stipe lit highlight along the left side
    ctx.strokeStyle = rgba(p.bladeLight, 0.7);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(spineBob[0][0] - 1, spineBob[0][1]);
    for (let i = 1; i < spineBob.length; i++) ctx.lineTo(spineBob[i][0] - 1, spineBob[i][1]);
    ctx.stroke();

    // 4) gas-bladder floats (round bulbs along the stipe)
    FLOATS.forEach(([s, side]) => {
      const [ax, ay] = stipePoint(s, wave);
      const fy = ay - bob * s;
      const fx = ax + side * 1.6;
      // dark rim
      ctx.fillStyle = rgb(p.outline);
      ctx.beginPath();
      ctx.arc(fx, fy, 2.6, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.fillStyle = rgb(p.float);
      ctx.beginPath();
      ctx.arc(fx, fy, 2.0, 0, Math.PI * 2);
      ctx.fill();
      // highlight
      ctx.fillStyle = rgba([255, 255, 255], 0.4 + 0.4 * p.gloss);
      ctx.beginPath();
      ctx.arc(fx - 0.7, fy - 0.8, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5) frayed/browning blade tips (autumn) — ragged amber flecks on the tips
    if (p.frayAmt > 0.02) {
      ctx.strokeStyle = rgba(p.bladeDark, 0.8 * p.frayAmt);
      ctx.lineWidth = 1.0;
      BLADES.forEach(([s, side, len]) => {
        const [ax, ay] = stipePoint(s, wave);
        const bobY = ay - bob * s;
        const eff = len * (1 - 0.18 * p.frayAmt);
        const tipX = ax + side * eff * 0.62;
        const tipY = bobY - eff * 0.5;
        for (let k = 0; k < 3; k++) {
          const ang = -0.6 + k * 0.5;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + Math.cos(ang) * 2.6 * side, tipY + Math.sin(ang) * 2.6);
          ctx.stroke();
        }
      });
    }

    // 6) specular sheen on the blades (gloss strength from P) — summer peak
    if (p.gloss > 0.02) {
      ctx.strokeStyle = rgba([255, 255, 255], 0.12 + 0.4 * p.gloss);
      ctx.lineWidth = 1.0;
      BLADES.forEach(([s, side, len]) => {
        if (side >= 0) return; // sheen on the upper-left lit blades
        const [ax, ay] = stipePoint(s, wave);
        const bobY = ay - bob * s;
        const tipX = ax + side * len * 0.5;
        const tipY = bobY - len * 0.38;
        ctx.beginPath();
        ctx.moveTo(ax + side * 1.5, bobY - 1);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      });
    }

    // 7) frost dusting (winter) — cool speckle on the upward kelp surfaces
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-7, -2], [4, -8], [-3, 4], [6, -1], [-9, 8], [2, -14], [8, 5],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy - bob * 0.4, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 8) snow caps on the upward blade tips (winter)
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.92 * a);
      BLADES.forEach(([s, side, len]) => {
        if (side >= 0 && s < 0.5) return; // cap a representative subset
        const [ax, ay] = stipePoint(s, wave);
        const bobY = ay - bob * s;
        const tipX = ax + side * len * 0.58;
        const tipY = bobY - len * 0.46;
        ctx.beginPath();
        ctx.ellipse(tipX, tipY, 2.2, 1.3, side * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });
      // a little cap on the stipe crown
      ctx.fillStyle = rgba([246, 251, 255], 0.9 * a);
      const crown = spineBob[spineBob.length - 1];
      ctx.beginPath();
      ctx.ellipse(crown[0], crown[1] + 0.5, 2.6, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Ambient light wash over the whole tile (per-season tint) ─────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lg = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
      lg.addColorStop(0, rgba(p.light, p.lightAmt));
      lg.addColorStop(1, rgba(p.light, p.lightAmt * 0.25));
      ctx.fillStyle = lg;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.7, w = 1.3): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// Lateral sway of the whole frond as if in a slow underwater current. Built
// from (1-cos) terms so wave(0)=0 with zero velocity → the SUBJECT silhouette
// at t=0 matches the still exactly; seamless across its period.
function waveAt(t: number, amp = 2.2, w = 0.9): number {
  return amp * (1 - Math.cos(w * t)) * 0.5 - amp * (1 - Math.cos(w * 2 * t)) * 0.5 * 0.25;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0, 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // Winter sway stiffens (frozen): reduce the current amplitude.
    const swayScale = season === "Winter" ? 0.35 : 1;
    const wave = waveAt(t) * swayScale;
    // The subject's silhouette is identical at t=0 (bob=0, wave=0); the gentle
    // current sway is the kelp moving as one piece, not a slide of a region.
    paint(ctx, SP[season], bob, wave);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // water-ripple shimmer + dew shimmer glint on a blade
        const g = 0.2 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.0));
        ctx.strokeStyle = `rgba(255,255,255,${0.14 + 0.12 * Math.sin(t * 1.3)})`;
        ctx.lineWidth = 0.8;
        const rp = (t * 0.4) % 1;
        ctx.beginPath();
        ctx.ellipse(-2, 18.6, 4 + rp * 9, (4 + rp * 9) * 0.26, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(-5 + wave, -4 - bob, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // water-ripple shimmer + a soft sheen travelling the blades
        ctx.strokeStyle = `rgba(255,255,255,${0.16 + 0.12 * Math.sin(t * 1.6)})`;
        ctx.lineWidth = 0.9;
        const rp = (t * 0.5) % 1;
        ctx.beginPath();
        ctx.ellipse(0, 19, 4 + rp * 10, (4 + rp * 10) * 0.26, 0, 0, Math.PI * 2);
        ctx.stroke();
        const prog = (t * 0.45) % 1;
        const sy = lerp(-2, -18, prog);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(-5 + wave * 0.6, sy - bob * 0.5, 1.3, 2.4, -0.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // water-ripple shimmer + a frayed blade-bit drifts off
        ctx.strokeStyle = `rgba(255,255,255,${0.1 + 0.08 * Math.sin(t * 1.2)})`;
        ctx.lineWidth = 0.8;
        const rp = (t * 0.35) % 1;
        ctx.beginPath();
        ctx.ellipse(2, 19.4, 4 + rp * 9, (4 + rp * 9) * 0.26, 0, 0, Math.PI * 2);
        ctx.stroke();
        // a small browning blade-bit drifts away to the right and settles
        const dp = (t / 4.0) % 1;
        const dx = 6 + dp * 12;
        const dy = -4 + dp * 22 + Math.sin(dp * Math.PI * 3) * 1.5;
        ctx.globalAlpha = 0.7 * Math.sin(dp * Math.PI);
        ctx.fillStyle = "rgba(150,118,56,1)";
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(dp * 4);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      } else {
        // Winter — cold sheen on the ice + a drifting snowflake; stiff sway
        ctx.globalAlpha = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 18.8, 8, 2.2, -0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.2 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
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
    paint(ctx, lerpP(from, to, k), 0, 0);
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
