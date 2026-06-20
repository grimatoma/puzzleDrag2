// Seasonal art for the HEN bird tile (`tile_bird_hen`).  [bird/hen]
//
// A plump fluffed white-and-brown HEN settled low on a small straw NEST with one
// egg visible, a small red comb and orange beak. The SAME hen-on-nest silhouette
// is drawn every season — only colour, light, the winter fluff/snow dressing and
// the pad change. This is enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → a seamless breathing
// settle. Animal framing: front-¾, turned slightly toward lower-left, full body
// readable; legs are tucked under the body settled on the nest.
//
// PALETTE LOCK: white-and-brown hen, tan straw nest. Seasons change pad + light +
// winter fluff/nest snow only — never the hen's identity colours. The egg stays
// visible all seasons.
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
  bodyLight: RGB;   // lit fluffed plumage (the white-ish body)
  bodyMid: RGB;     // body mid tone
  bodyDark: RGB;    // shaded underside / wing
  wing: RGB;        // brown wing patch (the "brown" half of the lock)
  wingDark: RGB;    // shaded brown wing
  comb: RGB;        // red comb + wattle (locked-ish, warms a touch by light)
  beak: RGB;        // orange beak
  egg: RGB;         // the visible egg (creamy, locked)
  straw: RGB;       // top of the straw nest
  strawDark: RGB;   // shaded nest underside
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  fluff: number;    // 0..1 plumage fluff/coat volume (winter thickest)
  sheen: number;    // 0..1 soft sheen on the feathers (summer)
  frostAmt: number; // 0..1 cool frost dusting on the hen + nest
  snowCapAmt: number; // 0..1 snow on the hen's back + snow-rim on the nest
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
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
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyMid: lerpRGB(a.bodyMid, b.bodyMid, t),
    bodyDark: lerpRGB(a.bodyDark, b.bodyDark, t),
    wing: lerpRGB(a.wing, b.wing, t),
    wingDark: lerpRGB(a.wingDark, b.wingDark, t),
    comb: lerpRGB(a.comb, b.comb, t),
    beak: lerpRGB(a.beak, b.beak, t),
    egg: lerpRGB(a.egg, b.egg, t),
    straw: lerpRGB(a.straw, b.straw, t),
    strawDark: lerpRGB(a.strawDark, b.strawDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    fluff: lerp(a.fluff, b.fluff, t),
    sheen: lerp(a.sheen, b.sheen, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    fluff: clamp01(p.fluff),
    sheen: clamp01(p.sheen),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK: white-and-brown hen + tan straw stay constant identity. Seasons
// shift the nest straw freshness, the pad, the light, and winter fluff/snow.

const SP: Record<SeasonName, P> = {
  // Spring — soft fresh plumage, fresh nest; dewy lime pad + blossom; cool-bright.
  Spring: {
    bodyLight: [250, 248, 242],
    bodyMid: [232, 226, 214],
    bodyDark: [196, 186, 170],
    wing: [176, 122, 72],
    wingDark: [128, 84, 48],
    comb: [214, 60, 56],
    beak: [240, 168, 56],
    egg: [248, 240, 222],
    straw: [216, 188, 116],
    strawDark: [160, 130, 70],
    padGrass: [130, 208, 88],
    padDark: [74, 140, 60],
    outline: [70, 54, 38],
    light: [232, 244, 226],
    lightAmt: 0.16,
    fluff: 0.42,
    sheen: 0.12,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — full plumage PEAK, golden straw nest; mid-green pad; warm light, sheen.
  Summer: {
    bodyLight: [255, 253, 248],
    bodyMid: [240, 232, 218],
    bodyDark: [202, 188, 166],
    wing: [192, 130, 70],
    wingDark: [138, 86, 44],
    comb: [226, 48, 44],
    beak: [248, 172, 48],
    egg: [250, 242, 220],
    straw: [236, 202, 110],
    strawDark: [176, 138, 64],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    outline: [74, 52, 32],
    light: [255, 240, 206],
    lightAmt: 0.18,
    fluff: 0.5,
    sheen: 0.85,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — fuller feathers, straw drier/amber; olive-tan pad + fallen leaves.
  Autumn: {
    bodyLight: [248, 242, 230],
    bodyMid: [230, 218, 198],
    bodyDark: [192, 172, 146],
    wing: [180, 112, 56],
    wingDark: [126, 76, 36],
    comb: [206, 56, 46],
    beak: [236, 158, 50],
    egg: [246, 236, 214],
    straw: [206, 170, 92],
    strawDark: [150, 116, 56],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    outline: [66, 48, 30],
    light: [248, 210, 150],
    lightAmt: 0.2,
    fluff: 0.6,
    sheen: 0.25,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — thickly fluffed hen, snow-rimmed nest + snow on the back; snowy pad,
  // cool light. Hen + straw stay clearly visible in their own colour underneath.
  Winter: {
    bodyLight: [248, 250, 254],
    bodyMid: [224, 226, 234],
    bodyDark: [184, 190, 204],
    wing: [166, 116, 72],
    wingDark: [120, 80, 50],
    comb: [196, 72, 70],
    beak: [228, 158, 66],
    egg: [240, 238, 234],
    straw: [196, 172, 116],
    strawDark: [142, 120, 78],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    outline: [58, 50, 56],
    light: [206, 226, 252],
    lightAmt: 0.3,
    fluff: 1.0,
    sheen: 0.18,
    frostAmt: 0.7,
    snowCapAmt: 0.9,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Subject geometry (the SAME hen-on-nest silhouette every season) ───────────
// Origin-centered. The nest sits low on the pad; the plump hen body settles into
// it, comb + head up to the upper-left, tail up to the right. Egg peeks from the
// front rim of the nest.

const NEST_CY = 13;   // nest centre y (sits on the pad)
const NEST_RX = 15;   // nest half-width
const NEST_RY = 5.4;  // nest half-height (a shallow bowl)
const BODY_CY = 2;    // hen body centre y (settled, base in the nest)

/** Trace the plump hen body (settled egg-shape, slight lower-left turn). */
function henBodyPath(ctx: CanvasRenderingContext2D, bob: number, fluff: number): void {
  const cy = BODY_CY + bob;
  // fluff slightly widens the lower body silhouette (winter puff) — the OUTLINE
  // grows a touch but the same recognizable ovoid hen-on-nest stays.
  const rx = 13.5 + fluff * 1.6;
  const ry = 11.5 + fluff * 0.8;
  ctx.beginPath();
  // back / tail rising to the right, breast bulging lower-left, settled into nest
  ctx.moveTo(-rx * 0.55, cy - ry * 0.9);          // upper back toward neck
  ctx.quadraticCurveTo(rx * 0.2, cy - ry * 1.18, rx * 0.86, cy - ry * 0.78); // back hump to tail base
  ctx.quadraticCurveTo(rx * 1.18, cy - ry * 0.2, rx * 0.96, cy + ry * 0.5);  // round tail side
  ctx.quadraticCurveTo(rx * 0.8, cy + ry * 1.0, rx * 0.2, cy + ry * 1.02);   // belly into nest (right)
  ctx.quadraticCurveTo(-rx * 0.4, cy + ry * 1.06, -rx * 0.86, cy + ry * 0.6);// breast settled low-left
  ctx.quadraticCurveTo(-rx * 1.16, cy + ry * 0.1, -rx * 0.92, cy - ry * 0.5);// round breast front
  ctx.quadraticCurveTo(-rx * 0.82, cy - ry * 0.95, -rx * 0.55, cy - ry * 0.9);// back up to neck
  ctx.closePath();
}

/** Trace the small upturned tail fan (top-right). */
function tailPath(ctx: CanvasRenderingContext2D, bob: number, fluff: number): void {
  const cy = BODY_CY + bob;
  const tx = 12 + fluff * 0.6;
  const ty = cy - 8.5;
  ctx.beginPath();
  ctx.moveTo(tx - 2, ty + 5);
  ctx.quadraticCurveTo(tx + 5, ty - 3, tx + 7.5, ty - 8.5); // upper tail feather
  ctx.quadraticCurveTo(tx + 9, ty - 4, tx + 6, ty + 1);     // outer edge
  ctx.quadraticCurveTo(tx + 4.5, ty + 4.5, tx - 2, ty + 5);
  ctx.closePath();
}

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse, x∈[−18,+18], centre y≈+19 ──────────────
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // tufted top edge
    ctx.strokeStyle = rgb(p.padDark);
    ctx.lineWidth = 1.1;
    for (let i = -7; i <= 7; i++) {
      const tx = i * 2.4;
      const ty = 19 - Math.sqrt(Math.max(0, 1 - (tx / 18) ** 2)) * 5.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty + 0.4);
      ctx.lineTo(tx - 0.8, ty - 2.4);
      ctx.stroke();
    }
    // grass-top highlight glints
    ctx.strokeStyle = rgba([255, 255, 255], 0.18);
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i += 2) {
      const tx = i * 2.6 - 2;
      ctx.beginPath();
      ctx.moveTo(tx, 18.4);
      ctx.lineTo(tx - 0.6, 16.6);
      ctx.stroke();
    }

    // pad snow blanket (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
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
        ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(ang) * 1.5, by + Math.sin(ang) * 1.0, 1.1, 0.8, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba([255, 214, 90], a);
        ctx.beginPath();
        ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen leaves on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-13, 19.6, -0.5, [196, 120, 40]],
        [13, 18.6, 0.7, [176, 72, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
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

    // contact shadow of the nest on the pad (lower-right)
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(3, NEST_CY + 6, 16, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── The straw NEST (lower bowl, behind/under the hen) ───────────────────
    // shaded underside of the bowl
    ctx.fillStyle = rgb(p.strawDark);
    ctx.beginPath();
    ctx.ellipse(0, NEST_CY + 1.4, NEST_RX, NEST_RY + 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // straw top rim
    ctx.fillStyle = rgb(p.straw);
    ctx.beginPath();
    ctx.ellipse(0, NEST_CY, NEST_RX, NEST_RY, 0, 0, Math.PI * 2);
    ctx.fill();
    // straw strands — short angled strokes around the rim for texture
    ctx.lineWidth = 1.1;
    for (let i = -8; i <= 8; i++) {
      const ang = (i / 9) * Math.PI; // around the front semicircle
      const sx = Math.cos(ang) * NEST_RX * 0.96;
      const sy = NEST_CY + Math.sin(ang) * NEST_RY * 0.9;
      ctx.strokeStyle = rgb(i % 2 === 0 ? p.strawDark : p.straw);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(ang) * 2.6, sy + Math.sin(ang) * 1.6 - 1.2);
      ctx.stroke();
    }
    // a couple of light straw highlights
    ctx.strokeStyle = rgba([255, 244, 200], 0.5);
    ctx.lineWidth = 0.9;
    [[-9, NEST_CY + 1], [6, NEST_CY + 0.6], [11, NEST_CY + 1.4]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 2.4, sy - 1.2);
      ctx.stroke();
    });

    // the visible EGG — nestled at the front rim, lower-left (stays all seasons)
    const eggX = -7.5;
    const eggY = NEST_CY + 1.2;
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(eggX, eggY, 4.4, 5.4, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.egg);
    ctx.beginPath();
    ctx.ellipse(eggX, eggY - 0.2, 3.6, 4.6, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // egg shading + highlight
    ctx.fillStyle = rgba(p.strawDark, 0.3);
    ctx.beginPath();
    ctx.ellipse(eggX + 1.4, eggY + 0.8, 2.0, 3.0, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(eggX - 1.3, eggY - 2.0, 1.0, 1.6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // ── TAIL fan (behind the body, top-right) ───────────────────────────────
    tailPath(ctx, bob, p.fluff);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.save();
    tailPath(ctx, bob, p.fluff);
    ctx.clip();
    ctx.fillStyle = rgb(p.bodyMid);
    ctx.fillRect(8, BODY_CY + bob - 22, 16, 20);
    // brown sweep into the tail
    ctx.fillStyle = rgba(p.wing, 0.7);
    ctx.beginPath();
    ctx.ellipse(13, BODY_CY + bob - 8, 6, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── HEN body (SAME silhouette every season) ─────────────────────────────
    // 1) soft dark outline pass
    henBodyPath(ctx, bob, p.fluff);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fills, clipped to the silhouette
    ctx.save();
    henBodyPath(ctx, bob, p.fluff);
    ctx.clip();
    const cy = BODY_CY + bob;

    // base mid plumage
    ctx.fillStyle = rgb(p.bodyMid);
    ctx.fillRect(-20, cy - 16, 40, 32);
    // light from upper-left: lit breast/back panel
    const litGrad = ctx.createLinearGradient(-14, cy - 12, 12, cy + 12);
    litGrad.addColorStop(0, rgb(p.bodyLight));
    litGrad.addColorStop(0.5, rgb(p.bodyMid));
    litGrad.addColorStop(1, rgb(p.bodyDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-3, cy - 1, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // brown WING patch on the side (the "brown" of the lock) — folded over flank
    ctx.fillStyle = rgb(p.wing);
    ctx.beginPath();
    ctx.moveTo(8.5, cy - 5);
    ctx.quadraticCurveTo(13, cy - 1, 11, cy + 6);
    ctx.quadraticCurveTo(4, cy + 9, -2, cy + 6);
    ctx.quadraticCurveTo(2, cy - 1, 8.5, cy - 5);
    ctx.closePath();
    ctx.fill();
    // wing shading + a couple of feather lines
    ctx.fillStyle = rgba(p.wingDark, 0.6);
    ctx.beginPath();
    ctx.ellipse(7, cy + 4, 5, 3.4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(p.wingDark, 0.8);
    ctx.lineWidth = 1;
    [0, 1, 2].forEach((k) => {
      ctx.beginPath();
      ctx.moveTo(9 - k * 2.4, cy - 3 + k * 1.2);
      ctx.quadraticCurveTo(4 - k * 2, cy + 3 + k, -1 - k * 1.4, cy + 5);
      ctx.stroke();
    });

    // breast fluff shading (lower-left, settled into nest)
    ctx.fillStyle = rgba(p.bodyDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(-9, cy + 7, 7, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // fluff texture — short scalloped down-strokes (denser with winter fluff)
    ctx.strokeStyle = rgba(p.bodyDark, 0.45);
    ctx.lineWidth = 0.9;
    const fluffN = 5 + Math.round(p.fluff * 4);
    for (let i = 0; i < fluffN; i++) {
      const fx = -11 + (i / Math.max(1, fluffN - 1)) * 18;
      const fy = cy + 3 + Math.sin(i * 1.7) * 1.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + 1.4, fy + 2.2, fx + 2.8, fy + 0.6);
      ctx.stroke();
    }

    // summer feather sheen (soft, not a flash — stays subtle)
    if (p.sheen > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.16 * p.sheen);
      ctx.beginPath();
      ctx.ellipse(-5, cy - 4, 6, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward plumage
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.22 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-2, cy - 6, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-8, cy - 8], [-3, cy - 9], [3, cy - 8], [8, cy - 6],
        [-6, cy - 4], [5, cy - 3], [0, cy - 6],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end body clip

    // 3) snow on the hen's BACK (winter) — over the upper silhouette
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-9, cy - 10);
      ctx.quadraticCurveTo(0, cy - 15, 9, cy - 11);
      ctx.quadraticCurveTo(4, cy - 9, 2, cy - 10.5);
      ctx.quadraticCurveTo(-2, cy - 8.5, -4, cy - 10.5);
      ctx.quadraticCurveTo(-7, cy - 9, -9, cy - 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(-1, cy - 10.5, 8, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── HEAD + neck (upper-left, turned toward lower-left front-¾) ───────────
    const headX = -11;
    const headY = cy - 11;
    // neck (mid plumage) connecting body to head
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(-5, cy - 7);
    ctx.quadraticCurveTo(-12, cy - 8, headX - 1, headY + 4);
    ctx.lineTo(headX + 4, headY + 5);
    ctx.quadraticCurveTo(-4, cy - 3, -1, cy - 6);
    ctx.closePath();
    ctx.fill();
    // head outline
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(headX, headY, 6.2, 6.0, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // head fill (lit)
    const headGrad = ctx.createLinearGradient(headX - 5, headY - 5, headX + 4, headY + 5);
    headGrad.addColorStop(0, rgb(p.bodyLight));
    headGrad.addColorStop(1, rgb(p.bodyMid));
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(headX, headY, 5.0, 4.8, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // neck plumage fill over the dark
    ctx.fillStyle = rgb(p.bodyMid);
    ctx.beginPath();
    ctx.moveTo(-5.5, cy - 7);
    ctx.quadraticCurveTo(-11, cy - 8, headX, headY + 3.5);
    ctx.quadraticCurveTo(-5, cy - 3.5, -2, cy - 6);
    ctx.closePath();
    ctx.fill();

    // small red COMB on top of the head
    ctx.fillStyle = rgb(p.comb);
    ctx.beginPath();
    ctx.moveTo(headX - 2.5, headY - 4.6);
    ctx.quadraticCurveTo(headX - 2, headY - 8, headX, headY - 5.6);
    ctx.quadraticCurveTo(headX + 1.4, headY - 8.2, headX + 2, headY - 5.4);
    ctx.quadraticCurveTo(headX + 3.4, headY - 7.4, headX + 3.6, headY - 4.4);
    ctx.quadraticCurveTo(headX + 1, headY - 3.4, headX - 2.5, headY - 4.6);
    ctx.closePath();
    ctx.fill();
    // small red WATTLE under the beak
    ctx.fillStyle = rgb(p.comb);
    ctx.beginPath();
    ctx.ellipse(headX - 4.2, headY + 3.6, 1.4, 2.2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // orange BEAK pointing lower-left
    ctx.fillStyle = rgb(p.beak);
    ctx.beginPath();
    ctx.moveTo(headX - 4.4, headY - 0.4);
    ctx.lineTo(headX - 9.4, headY + 1.6);
    ctx.lineTo(headX - 4.2, headY + 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(p.outline, 0.6);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(headX - 8.6, headY + 1.5);
    ctx.lineTo(headX - 4.3, headY + 1.4);
    ctx.stroke();

    // EYE — small dark dot with a glint (used as blink anchor in anim)
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.arc(headX - 1.6, headY - 0.4, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(headX - 2.0, headY - 0.9, 0.45, 0, Math.PI * 2);
    ctx.fill();

    // snow tuft on the comb/head (winter)
    if (p.snowCapAmt > 0.02) {
      ctx.fillStyle = rgba([246, 251, 255], 0.9 * p.snowCapAmt);
      ctx.beginPath();
      ctx.ellipse(headX, headY - 5.2, 3.2, 1.3, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Snow rim on the NEST (winter) — over the straw, hen stays visible ────
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.strokeStyle = rgba([246, 251, 255], 0.9 * a);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, NEST_CY - 0.4, NEST_RX - 0.6, NEST_RY, 0, Math.PI * 0.08, Math.PI * 0.92);
      ctx.stroke();
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * a);
      [[-12, NEST_CY + 1], [12, NEST_CY + 1], [0, NEST_CY + 3.4]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
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

// ── Idle bob (seamless, zero-velocity at t=0) — the breathing settle ─────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w. Slow & gentle:
// the hen rises a touch and settles back onto the nest.
function bobAt(t: number, amp = 0.8, w = 1.1): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // Occasional head tilt / blink — shared across seasons (additive dressing
      // over the painted eye). A blink every ~4.2s: a quick eyelid sweep.
      const headX = -11;
      const headY = BODY_CY + bob - 11;
      const blinkPhase = (t % 4.2) / 4.2;
      if (blinkPhase > 0.92) {
        // closed lid: an arc of plumage colour over the eye
        const k = (blinkPhase - 0.92) / 0.08; // 0..1 across the blink
        const lid = Math.sin(k * Math.PI); // open→closed→open
        ctx.fillStyle = rgb(SP[season].bodyMid);
        ctx.beginPath();
        ctx.ellipse(headX - 1.6, headY - 0.4, 1.5, 1.5 * lid, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint near the breast/nest
        const g = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = NEST_CY + bob - 1 + Math.sin(t * 1.1) * 1.0;
        ctx.beginPath();
        ctx.arc(4, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // a soft sheen travelling gently across the back plumage (subtle)
        const prog = (t * 0.35) % 1;
        const sx = lerp(-12, 8, prog);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.ellipse(sx, BODY_CY + bob - 6, 3.0, 2.0, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a straw wisp stirs — a small straw strand sways at the nest rim
        const sway = Math.sin(t * 1.4) * 1.8;
        ctx.strokeStyle = rgb(SP.Autumn.strawDark);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(11, NEST_CY - 0.5);
        ctx.quadraticCurveTo(13 + sway * 0.5, NEST_CY - 4, 14 + sway, NEST_CY - 7);
        ctx.stroke();
        ctx.strokeStyle = rgba([236, 202, 110], 0.7);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(11, NEST_CY - 0.5);
        ctx.quadraticCurveTo(13 + sway * 0.5, NEST_CY - 4, 14 + sway, NEST_CY - 7);
        ctx.stroke();
      } else {
        // Winter — breath-fog PULSES at the beak + a drifting snowflake.
        const beakTipX = headX - 9.4;
        const beakTipY = headY + 1.6;
        // breath puff swells & fades on a ~2.6s loop, drifting down-left
        const bp = (t % 2.6) / 2.6;
        const puff = Math.sin(bp * Math.PI); // 0→1→0
        if (puff > 0.01) {
          ctx.globalAlpha = 0.32 * puff;
          ctx.fillStyle = "rgba(232,242,255,1)";
          const px = beakTipX - 2 - bp * 4;
          const py = beakTipY + 1 + bp * 2;
          ctx.beginPath();
          ctx.arc(px, py, 1.6 + bp * 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px - 1.6, py + 0.8, 1.0 + bp * 1.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        // a single drifting snowflake
        const prog = (t / 3.2) % 1;
        const fy = -22 + prog * 38;
        const fx = 6 + Math.sin(prog * Math.PI * 2) * 3;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
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
    paint(ctx, lerpP(from, to, k), 0);
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
