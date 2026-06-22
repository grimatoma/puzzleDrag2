// Seasonal art for the JADE island sea-mineral tile (`tile_fish_jade`).
//
// AQUATIC + MINERAL hybrid: the ground pad reads as still WATER (a bluish
// reflective ellipse), NOT grass — a polished JADE STONE rests on the water
// like a tiny jade island. The subject is a smooth rounded jade-green cabochon
// (a big glossy dome) with a smaller carved jade bead beside it, faintly
// translucent with a soft pale-mint internal glow and a bright specular catch
// on its upper-left curve.
//
// The SAME jade-stone silhouette is drawn EVERY season — the bright jade-green
// is PALETTE-LOCKED. Only the global light wash, the water tint vs winter ICE,
// a wet sheen / frost dusting on the stone, and a spring blossom petal / autumn
// fallen leaf change. This is enforced by a single parameterized
// `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Winter FREEZES the water to pale blue-white ice (`iceAmt`) + frost sparkle;
// the jade stays bright green and clearly visible (a light frost dusting only —
// NO white-out). Origin-centered in the −24..+24 design box, light from
// upper-left, flat cel-shaded with a soft dark outline. Pure Canvas-2D vector.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  jadeLight: RGB;   // lit jade-green highlight band (PALETTE-LOCKED jade)
  jadeMid: RGB;     // body tone of the cabochon (0x3fae7a)
  jadeDeep: RGB;    // shaded jade underside / lower curve (0x1c5a3e)
  jadeCore: RGB;    // pale-mint faint translucent inner glow
  specular: RGB;    // bright specular catch-light on the polished dome
  water: RGB;       // top surface of the water pad
  waterDeep: RGB;   // shaded underside of the water pad
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  translucency: number; // 0..1 how translucent/glowing the jade reads (peak=summer)
  gloss: number;    // 0..1 wet specular gloss strength on the dome
  iceAmt: number;   // 0..1 the water pad frozen to pale blue-white ice (winter)
  frostAmt: number; // 0..1 cool frost dusting on the jade (winter)
  blossomAmt: number; // 0..1 a tiny pale blossom petal floating on the pad (spring)
  fallenLeafAmt: number; // 0..1 a floating fallen leaf on the pad (autumn)
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
    jadeLight: lerpRGB(a.jadeLight, b.jadeLight, t),
    jadeMid: lerpRGB(a.jadeMid, b.jadeMid, t),
    jadeDeep: lerpRGB(a.jadeDeep, b.jadeDeep, t),
    jadeCore: lerpRGB(a.jadeCore, b.jadeCore, t),
    specular: lerpRGB(a.specular, b.specular, t),
    water: lerpRGB(a.water, b.water, t),
    waterDeep: lerpRGB(a.waterDeep, b.waterDeep, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    translucency: lerp(a.translucency, b.translucency, t),
    gloss: lerp(a.gloss, b.gloss, t),
    iceAmt: lerp(a.iceAmt, b.iceAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    translucency: clamp01(p.translucency),
    gloss: clamp01(p.gloss),
    iceAmt: clamp01(p.iceAmt),
    frostAmt: clamp01(p.frostAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK: jade stays bright green in EVERY season. jade* colours only
// shift in brightness/translucency, never in hue identity. The water tint and
// the global light filter carry the seasonal mood.

const SP: Record<SeasonName, P> = {
  // Spring — cool wet sheen on the jade; fresh blue water; a blossom petal.
  Spring: {
    jadeLight: [110, 210, 156],
    jadeMid: [63, 174, 122],
    jadeDeep: [28, 90, 62],
    jadeCore: [180, 236, 206],
    specular: [220, 255, 236],
    water: [120, 192, 220],
    waterDeep: [70, 134, 170],
    outline: [20, 64, 46],
    light: [230, 244, 246],
    lightAmt: 0.16,
    translucency: 0.7,
    gloss: 0.6,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: most translucent / glowing jade; bright saturated water;
  // a strong travelling specular glint; warm light.
  Summer: {
    jadeLight: [128, 226, 170],
    jadeMid: [63, 184, 128],
    jadeDeep: [26, 96, 66],
    jadeCore: [198, 246, 218],
    specular: [230, 255, 242],
    water: [78, 178, 226],
    waterDeep: [40, 122, 180],
    outline: [18, 60, 44],
    light: [255, 244, 212],
    lightAmt: 0.18,
    translucency: 1.0,
    gloss: 0.95,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — amber-lit; olive-tinged water + a floating fallen leaf; jade a
  // touch deeper green; low amber light.
  Autumn: {
    jadeLight: [104, 192, 146],
    jadeMid: [56, 158, 110],
    jadeDeep: [26, 84, 58],
    jadeCore: [172, 224, 196],
    specular: [240, 240, 214],
    water: [124, 160, 150],
    waterDeep: [84, 118, 106],
    outline: [30, 58, 44],
    light: [248, 212, 152],
    lightAmt: 0.2,
    translucency: 0.62,
    gloss: 0.45,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — water FROZEN to pale blue-white ICE + frost sparkle; a light frost
  // dusting on the jade; jade stays bright green and clearly visible; cool light.
  Winter: {
    jadeLight: [114, 212, 160],
    jadeMid: [60, 172, 122],
    jadeDeep: [26, 88, 60],
    jadeCore: [186, 238, 210],
    specular: [226, 252, 240],
    water: [216, 234, 244],
    waterDeep: [168, 198, 218],
    outline: [26, 62, 50],
    light: [210, 230, 252],
    lightAmt: 0.3,
    translucency: 0.66,
    gloss: 0.4,
    iceAmt: 0.92,
    frostAmt: 0.65,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Jade geometry (the SAME silhouette every season) ─────────────────────────
// Origin-centered. A big rounded cabochon (a glossy dome) sits on the water,
// with a smaller carved jade bead resting beside it to the lower-right. The
// stones rest roughly on the water line at y≈+14.

const STONE_CY = 8;     // big cabochon centre y
const STONE_CX = -3.5;  // big cabochon centre x (slightly left of centre)
const STONE_RX = 12.5;  // big cabochon half-width
const STONE_RY = 11;    // big cabochon half-height

const BEAD_CX = 11;     // small bead centre x (lower-right of the cabochon)
const BEAD_CY = 13.5;   // small bead centre y
const BEAD_RX = 5.4;    // small bead half-width
const BEAD_RY = 5;      // small bead half-height

/** Trace the big rounded cabochon — a smooth dome flattened where it meets the
 *  water. Constant for all P. */
function cabochonPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const cx = STONE_CX;
  const cy = STONE_CY + bob;
  ctx.beginPath();
  // smooth rounded top, slightly flat base where it rests on the water
  ctx.moveTo(cx - STONE_RX, cy + STONE_RY * 0.55);
  ctx.bezierCurveTo(
    cx - STONE_RX, cy - STONE_RY * 0.9,
    cx - STONE_RX * 0.4, cy - STONE_RY,
    cx, cy - STONE_RY,
  );
  ctx.bezierCurveTo(
    cx + STONE_RX * 0.5, cy - STONE_RY,
    cx + STONE_RX, cy - STONE_RY * 0.85,
    cx + STONE_RX, cy + STONE_RY * 0.5,
  );
  ctx.bezierCurveTo(
    cx + STONE_RX, cy + STONE_RY * 0.95,
    cx + STONE_RX * 0.5, cy + STONE_RY * 1.02,
    cx, cy + STONE_RY * 1.02,
  );
  ctx.bezierCurveTo(
    cx - STONE_RX * 0.5, cy + STONE_RY * 1.02,
    cx - STONE_RX, cy + STONE_RY * 0.95,
    cx - STONE_RX, cy + STONE_RY * 0.55,
  );
  ctx.closePath();
}

/** Trace the small carved jade bead beside the cabochon. Constant for all P. */
function beadPath(ctx: CanvasRenderingContext2D, bob: number): void {
  ctx.beginPath();
  ctx.ellipse(BEAD_CX, BEAD_CY + bob, BEAD_RX, BEAD_RY, -0.12, 0, Math.PI * 2);
  ctx.closePath();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: still WATER — a low flat bluish reflective ellipse ──────────────
    // soft contact shadow lower-right
    ctx.fillStyle = rgba(p.waterDeep, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // shaded underside (deep water)
    ctx.fillStyle = rgb(p.waterDeep);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // water surface
    ctx.fillStyle = rgb(p.water);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // surface reflection band (a lighter elliptical sheen, upper-left bias)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.clip();
    const wg = ctx.createLinearGradient(-14, 14, 10, 22);
    wg.addColorStop(0, rgba([255, 255, 255], 0.22 * (1 - 0.4 * p.iceAmt)));
    wg.addColorStop(0.5, rgba([255, 255, 255], 0.04));
    wg.addColorStop(1, rgba(p.waterDeep, 0.18));
    ctx.fillStyle = wg;
    ctx.fillRect(-18, 13, 36, 12);
    // a couple of gentle ripple lines on the surface
    ctx.strokeStyle = rgba([255, 255, 255], 0.22 * (1 - 0.5 * p.iceAmt));
    ctx.lineWidth = 0.9;
    [16.4, 18.6, 20.6].forEach((ry, i) => {
      ctx.beginPath();
      ctx.moveTo(-13 + i, ry);
      ctx.quadraticCurveTo(-2, ry - 0.8, 12 - i, ry + 0.4);
      ctx.stroke();
    });
    ctx.restore();

    // ── Winter: the water pad frozen to pale blue-white ICE ──────────────────
    if (p.iceAmt > 0.01) {
      const a = p.iceAmt;
      // milky ice sheet over the surface
      ctx.fillStyle = rgba([236, 246, 252], 0.8 * a);
      ctx.beginPath();
      ctx.ellipse(0, 18.8, 17.6, 5.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([200, 222, 240], 0.45 * a);
      ctx.beginPath();
      ctx.ellipse(2, 20.2, 16, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // cracked-ice facet lines
      ctx.strokeStyle = rgba([255, 255, 255], 0.55 * a);
      ctx.lineWidth = 0.8;
      const facets: Array<[number, number, number, number]> = [
        [-12, 18, -2, 21], [3, 16.6, 9, 20], [-6, 21, 6, 17.4], [10, 17.8, 14, 20.4],
      ];
      facets.forEach(([x0, y0, x1, y1]) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      });
      // frost sparkle on the ice
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * a);
      [[-10, 18], [4, 19.4], [12, 17.6], [-3, 20.6], [8, 21]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // a tiny blossom petal floating on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const px = -12.5;
      const py = 18.6;
      ctx.fillStyle = rgba([255, 246, 250], 0.95 * a);
      ctx.beginPath();
      ctx.ellipse(px, py, 2.3, 1.3, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba([255, 198, 222], 0.8 * a);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(px - 1.8, py + 0.4);
      ctx.quadraticCurveTo(px, py - 0.6, px + 1.8, py - 0.2);
      ctx.stroke();
      // tiny ripple ring around the petal
      ctx.strokeStyle = rgba([255, 255, 255], 0.35 * a);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(px, py + 0.2, 3.6, 1.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // a floating fallen leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const lx = -12.5;
      const ly = 18.4;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(0.5);
      ctx.fillStyle = rgba([196, 116, 40], a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba([110, 56, 18], a);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-3.2, 0);
      ctx.lineTo(3.2, 0);
      ctx.stroke();
      ctx.restore();
      // ripple ring around the leaf
      ctx.strokeStyle = rgba([255, 255, 255], 0.25 * a);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(lx, ly + 0.4, 4.4, 1.9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── Reflection of the jade stones in the water (a soft green smear) ──────
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.22 * (1 - 0.7 * p.iceAmt);
    ctx.fillStyle = rgb(p.jadeMid);
    ctx.beginPath();
    ctx.ellipse(STONE_CX, 20.5, STONE_RX * 0.7, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(BEAD_CX, 20.8, BEAD_RX * 0.7, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Contact shadow of the stones ON the water ───────────────────────────
    ctx.fillStyle = rgba(p.outline, 0.26 * (1 - 0.5 * p.iceAmt));
    ctx.beginPath();
    ctx.ellipse(STONE_CX + 2.5, STONE_CY + bob + STONE_RY * 0.9, STONE_RX * 0.95, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(BEAD_CX + 1.5, BEAD_CY + bob + BEAD_RY * 0.85, BEAD_RX * 0.95, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the small carved jade BEAD (behind/beside, drawn first) ──────
    drawJadeStone(
      ctx, beadPath, bob, p,
      BEAD_CX, BEAD_CY, BEAD_RX, BEAD_RY,
      // bead specular catch a touch tighter / higher
      -0.45, -0.5, 1.6,
    );

    // ── Subject: the big polished jade CABOCHON (the hero, in front) ─────────
    drawJadeStone(
      ctx, cabochonPath, bob, p,
      STONE_CX, STONE_CY, STONE_RX, STONE_RY,
      -0.42, -0.46, 4.2,
    );

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

/** Draw one polished jade stone: outline rim, translucent cel-shaded body with
 *  a pale inner glow, a bright specular catch on the upper-left curve, and an
 *  optional winter frost dusting. `tracePath` traces the silhouette; `cx,cy`
 *  centre and `rx,ry` radii position the internal shading; `sxFrac,syFrac`
 *  place the specular catch within the dome; `specR` is its radius. The jade
 *  colours come from `p` — locked bright green every season. */
function drawJadeStone(
  ctx: CanvasRenderingContext2D,
  tracePath: (ctx: CanvasRenderingContext2D, bob: number) => void,
  bob: number,
  p: P,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sxFrac: number,
  syFrac: number,
  specR: number,
): void {
  const cyb = cy + bob;

  // 1) soft dark outline pass (rim)
  tracePath(ctx, bob);
  ctx.fillStyle = rgb(p.outline);
  ctx.fill();

  // 2) translucent body fill + shading, clipped to the silhouette
  ctx.save();
  tracePath(ctx, bob);
  ctx.clip();

  // base mid jade tone over the whole stone
  ctx.fillStyle = rgb(p.jadeMid);
  ctx.fillRect(cx - rx - 2, cyb - ry - 2, rx * 2 + 4, ry * 2 + 4);

  // smooth dome shading: lit upper-left → mid → deep lower-right (rounded, not
  // faceted — a polished cabochon)
  const g = ctx.createRadialGradient(
    cx - rx * 0.45, cyb - ry * 0.5, ry * 0.15,
    cx, cyb, ry * 1.35,
  );
  g.addColorStop(0, rgb(p.jadeLight));
  g.addColorStop(0.45, rgb(p.jadeMid));
  g.addColorStop(1, rgb(p.jadeDeep));
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.95;
  tracePath(ctx, bob);
  ctx.fill();
  ctx.globalAlpha = 1;

  // faint pale-mint translucent inner glow (subsurface), strongest at peak
  // summer translucency — keeps the jade looking like glowing stone, not paint
  if (p.translucency > 0.02) {
    const cg = ctx.createRadialGradient(
      cx + rx * 0.1, cyb + ry * 0.2, ry * 0.1,
      cx + rx * 0.1, cyb + ry * 0.2, ry * 1.0,
    );
    cg.addColorStop(0, rgba(p.jadeCore, 0.34 * p.translucency));
    cg.addColorStop(0.6, rgba(p.jadeCore, 0.12 * p.translucency));
    cg.addColorStop(1, rgba(p.jadeCore, 0));
    ctx.fillStyle = cg;
    ctx.fillRect(cx - rx - 2, cyb - ry - 2, rx * 2 + 4, ry * 2 + 4);
  }

  // deep shaded crescent along the lower-right curve to seat the round form
  ctx.fillStyle = rgba(p.jadeDeep, 0.55);
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.35, cyb + ry * 0.45, rx * 0.85, ry * 0.7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // (re-light the very top edge so the crescent doesn't dull the crown)
  ctx.fillStyle = rgba(p.jadeLight, 0.4);
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.3, cyb - ry * 0.55, rx * 0.6, ry * 0.32, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // frost dusting on the jade's upward surface (winter) — cool speckle, the
  // jade stays clearly green underneath (NO white-out, NO bloom)
  if (p.frostAmt > 0.02) {
    ctx.fillStyle = rgba([214, 236, 246], 0.18 * p.frostAmt);
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.2, cyb - ry * 0.45, rx * 0.8, ry * 0.55, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([240, 250, 255], 0.7 * p.frostAmt);
    for (let s = 0; s < 6; s++) {
      const ang = -2.4 + s * 0.42;
      const fx = cx + Math.cos(ang) * rx * 0.55;
      const fy = cyb + Math.sin(ang) * ry * 0.5 - ry * 0.18;
      ctx.beginPath();
      ctx.arc(fx, fy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore(); // end body clip

  // 3) bright specular catch-light on the polished upper-left curve (a glossy
  // highlight; brightness scaled by gloss). Drawn after the clip so it reads as
  // a crisp shine sitting on the surface.
  if (p.gloss > 0.02) {
    const hx = cx + rx * sxFrac;
    const hy = cyb + ry * syFrac;
    const sg = ctx.createRadialGradient(hx, hy, 0.3, hx, hy, specR);
    sg.addColorStop(0, rgba(p.specular, 0.55 + 0.4 * p.gloss));
    sg.addColorStop(0.5, rgba(p.specular, 0.22 * (0.5 + p.gloss)));
    sg.addColorStop(1, rgba(p.specular, 0));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(hx, hy, specR, specR * 0.72, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // a tiny crisp hot-spot core
    ctx.fillStyle = rgba(p.specular, 0.5 + 0.4 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(hx - specR * 0.12, hy - specR * 0.12, specR * 0.26, specR * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.7, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

// A soft specular glint travels across the big cabochon's polished surface as a
// seamless loop (sweeps from upper-left round to lower-right and wraps). Returns
// a point inside the dome plus a 0..1 fade so it never pops at the loop seam.
function glintPoint(prog: number, bob: number): [number, number, number] {
  // sweep an angle around the upper hemisphere of the cabochon
  const ang = -2.5 + prog * 2.2; // upper-left → upper-right arc
  const gx = STONE_CX + Math.cos(ang) * STONE_RX * 0.6;
  const gy = STONE_CY + bob + Math.sin(ang) * STONE_RY * 0.6 - STONE_RY * 0.12;
  const fade = Math.sin(prog * Math.PI); // 0 at both ends → seamless wrap
  return [gx, gy, fade];
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // The subject bob is 0 at t=0; micro-motion below is additive dressing.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // Shared: a soft specular GLINT travels across the polished jade every
      // season (like gem.ts) — subtle, no flash. Brightness scaled per season.
      const prog = (t * 0.32) % 1;
      const [gx, gy, fade] = glintPoint(prog, bob);
      let glintAlpha = 0.4;
      if (season === "Summer") glintAlpha = 0.8; // strong travelling glint
      else if (season === "Spring") glintAlpha = 0.5;
      else if (season === "Autumn") glintAlpha = 0.38;
      else glintAlpha = 0.42; // winter cold sheen
      const glintCol = season === "Winter" ? "224,244,255" : "230,255,242";
      const gr = 3.2;
      const sg = ctx.createRadialGradient(gx, gy, 0.3, gx, gy, gr);
      sg.addColorStop(0, `rgba(${glintCol},${glintAlpha * fade})`);
      sg.addColorStop(0.5, `rgba(${glintCol},${glintAlpha * fade * 0.4})`);
      sg.addColorStop(1, `rgba(${glintCol},0)`);
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(gx, gy, gr, gr * 0.7, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Shared: a gentle water-ripple shimmer travelling across the pad surface.
      const ripPhase = (t * 0.35) % 1;
      const iceMute = 1 - 0.55 * clamp01(SP[season].iceAmt);
      ctx.strokeStyle = `rgba(255,255,255,${(0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.3))) * iceMute})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const ry = 16.5 + ripPhase * 5.5;
      ctx.moveTo(-13, ry);
      ctx.quadraticCurveTo(-1, ry - 0.9 - Math.sin(t * 1.7) * 0.4, 12, ry + 0.4);
      ctx.stroke();

      if (season === "Spring") {
        // a soft pulsing dew glint sliding on the cabochon's wet curve
        const g = 0.2 + 0.24 * (0.5 + 0.5 * Math.sin(t * 2.0));
        const u = 0.5 + 0.5 * Math.sin(t * 0.6);
        const ang = -2.2 + u * 1.4;
        ctx.fillStyle = `rgba(235,255,244,${g})`;
        ctx.beginPath();
        ctx.arc(
          STONE_CX + Math.cos(ang) * STONE_RX * 0.5,
          STONE_CY + bob + Math.sin(ang) * STONE_RY * 0.5 - STONE_RY * 0.2,
          1.0 + g * 0.6, 0, Math.PI * 2,
        );
        ctx.fill();
      } else if (season === "Autumn") {
        // the floating leaf drifts gently on the pad
        const dx = -12.5 + Math.sin(t * 0.5) * 2.2;
        const dy = 18.4 + Math.sin(t * 0.7 + 1) * 0.6;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(0.5 + Math.sin(t * 0.4) * 0.25);
        ctx.fillStyle = "rgba(196,116,40,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(110,56,18,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      } else if (season === "Winter") {
        // a single drifting snowflake + a faint cold sheen on the ice
        const flProg = (t / 3.2) % 1;
        const fy = -22 + flProg * 40;
        const fx = -4 + Math.sin(flProg * Math.PI * 2) * 4;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(flProg * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = "rgba(214,234,252,1)";
        ctx.beginPath();
        ctx.ellipse(0, 19, 15, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Summer's strong glint is already handled above by glintAlpha.
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
