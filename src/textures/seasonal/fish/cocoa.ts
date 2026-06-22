// Seasonal art for the COCOA ISLAND aquatic tile (`tile_fish_cocoa`).
//
// AQUATIC framing: the ground pad reads as still WATER (a bluish reflective
// ellipse), NOT grass, and a single ripe COCOA POD rests on its side on the
// water — an oval, pointed-ended pod with ~5 raised vertical RIBS down its
// length (like a small ribbed rugby ball), reddish-brown, with 2–3 small cocoa
// beans beside it for read.
//
// The SAME ribbed-pod silhouette is drawn every season — only colour, the
// water/ice treatment, and the small dressing (blossom petal, fallen leaf,
// frost, snow cap) change. This is enforced by a single parameterized
// `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// PALETTE LOCK: the pod stays clearly reddish-brown every season — ripeness/age
// shows in surface colour and sheen, never an identity change. Winter FREEZES
// the water pad to pale blue-white ICE (iceAmt) with frost sparkle and lays a
// light snow cap on the pod's upper ribs; the pod stays clearly visible
// underneath — NO white-out. Origin-centered in the −24..+24 design box, light
// from upper-left, flat cel-shaded with a soft dark outline. Pure Canvas-2D
// vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  podLight: RGB;    // lit reddish-brown body of the pod (upper-left flank)
  podMid: RGB;      // mid body tone of the pod
  podDeep: RGB;     // deep/shaded rib grooves + lower flank
  ribHi: RGB;       // warm highlight ridge running along each rib
  bean: RGB;        // the small cocoa beans beside the pod
  beanLit: RGB;     // lit top of the beans
  water: RGB;       // top surface of the water pad
  waterDeep: RGB;   // shaded underside / depth of the water
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 how rich/saturated the pod reads (peak=summer)
  gloss: number;    // 0..1 wet specular sheen strength on the ribs
  iceAmt: number;   // 0..1 the water pad frozen to pale blue-white ice (winter)
  frostAmt: number; // 0..1 cool frost dusting on the pod (winter)
  snowCapAmt: number; // 0..1 snow cap on the pod's upper ribs (winter)
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
    podLight: lerpRGB(a.podLight, b.podLight, t),
    podMid: lerpRGB(a.podMid, b.podMid, t),
    podDeep: lerpRGB(a.podDeep, b.podDeep, t),
    ribHi: lerpRGB(a.ribHi, b.ribHi, t),
    bean: lerpRGB(a.bean, b.bean, t),
    beanLit: lerpRGB(a.beanLit, b.beanLit, t),
    water: lerpRGB(a.water, b.water, t),
    waterDeep: lerpRGB(a.waterDeep, b.waterDeep, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    iceAmt: lerp(a.iceAmt, b.iceAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    ripeness: clamp01(p.ripeness),
    gloss: clamp01(p.gloss),
    iceAmt: clamp01(p.iceAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// The POD STAYS reddish-brown every season (palette lock). Ripeness shifts the
// hue (spring greener-brown, summer richest red-brown, autumn deeper over-ripe
// browner) — never an identity change. Only the water/ice, light, sheen, and
// pad dressing change between seasons.

const BEAN: RGB = [110, 70, 44]; // cocoa beans
const BEAN_LIT: RGB = [150, 104, 66];

const SP: Record<SeasonName, P> = {
  // Spring — a slightly younger green-brown pod (ribs tinged olive); fresh blue
  // dewy water + a tiny floating blossom petal; cool-bright light.
  Spring: {
    podLight: [150, 116, 64],
    podMid: [120, 96, 50],
    podDeep: [66, 50, 26],
    ribHi: [186, 152, 92],
    bean: BEAN,
    beanLit: BEAN_LIT,
    water: [120, 192, 220],
    waterDeep: [70, 134, 170],
    outline: [50, 32, 18],
    light: [232, 246, 248],
    lightAmt: 0.16,
    ripeness: 0.55,
    gloss: 0.42,
    iceAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK ripe: richest red-brown pod; bright saturated blue water; warm
  // light, strong sheen on the ribs.
  Summer: {
    podLight: [168, 104, 56],
    podMid: [130, 80, 44],
    podDeep: [66, 38, 18],
    ribHi: [204, 148, 92],
    bean: [118, 74, 46],
    beanLit: [158, 110, 70],
    water: [78, 178, 226],
    waterDeep: [40, 122, 180],
    outline: [50, 28, 14],
    light: [255, 244, 214],
    lightAmt: 0.18,
    ripeness: 1.0,
    gloss: 0.95,
    iceAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deeper over-ripe browner pod; olive-tinged water + a floating
  // fallen leaf; low amber light.
  Autumn: {
    podLight: [142, 88, 48],
    podMid: [104, 64, 34],
    podDeep: [56, 32, 16],
    ribHi: [176, 122, 74],
    bean: [98, 62, 38],
    beanLit: [138, 96, 60],
    water: [120, 158, 150],
    waterDeep: [82, 116, 104],
    outline: [44, 26, 14],
    light: [248, 214, 156],
    lightAmt: 0.2,
    ripeness: 0.7,
    gloss: 0.4,
    iceAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — water FROZEN to pale blue-white ICE + frost sparkle; a light snow
  // cap on the pod's upper ribs + cool frost dusting; the pod stays clearly
  // reddish-brown; cool light.
  Winter: {
    podLight: [150, 96, 54],
    podMid: [116, 74, 42],
    podDeep: [62, 38, 20],
    ribHi: [188, 138, 88],
    bean: [108, 70, 46],
    beanLit: [148, 104, 68],
    water: [216, 234, 244],
    waterDeep: [168, 198, 218],
    outline: [50, 36, 26],
    light: [212, 230, 252],
    lightAmt: 0.3,
    ripeness: 0.6,
    gloss: 0.3,
    iceAmt: 0.92,
    frostAmt: 0.7,
    snowCapAmt: 0.8,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Pod geometry (the SAME silhouette every season) ──────────────────────────
// The cocoa pod lies on its side on the water — an oval with pointed ends, its
// long axis tilted slightly so it reads as resting. ~5 raised vertical ribs run
// from the upper (stem) end to the lower (blossom) end. All coordinates
// origin-centered; the pod body resting roughly on the water line at y≈+10.

const POD_CX = -1;     // pod body centre x (sits a touch left so beans fit right)
const POD_CY = 9;      // pod body centre y (contact roughly on the pad)
const POD_RX = 14.5;   // pod half-length along its long axis
const POD_RY = 8.4;    // pod half-thickness across its short axis
const POD_TILT = -0.16; // long axis tilt (radians): stem end slightly up-left
const RIB_COUNT = 5;    // raised vertical ribs down the pod

/** A point on the pod's outline at parameter `a` (0..2π) in LOCAL pod space
 *  (centre at origin, long axis = local x), pointed at both ends. */
function podRim(a: number): [number, number] {
  // Base ellipse, then sharpen both ends into points (lemon/rugby shape) by
  // pulling the |x| extremes outward where the rim is near the long axis.
  const cx = Math.cos(a);
  const point = 1 + 0.16 * (cx * cx); // longer toward the tips
  return [cx * POD_RX * point, Math.sin(a) * POD_RY];
}

/** Trace the closed pod silhouette in LOCAL pod space. Same every season. */
function podBodyPath(ctx: CanvasRenderingContext2D): void {
  const N = 26;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const [x, y] = podRim(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Local-x of a rib centre line for rib index `s` (0..RIB_COUNT-1), spread
 *  across the pod length leaving the pointed tips clear. */
function ribX(s: number): number {
  const f = (s + 0.5) / RIB_COUNT;       // 0..1 across the ribs
  return lerp(-POD_RX * 0.74, POD_RX * 0.74, f);
}

/** Half-height of the pod surface at a given local-x (the cross-section the rib
 *  arcs over), from the ellipse. Clamped to stay real near the tips. */
function podHalfH(localX: number): number {
  const t = clamp01(Math.abs(localX) / (POD_RX * 1.02));
  return POD_RY * Math.sqrt(Math.max(0, 1 - t * t));
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob`. `sheen` (0..1) is the idle specular
 *  position creeping along a rib; it only adds a tiny travelling glint. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number, sheen = -1): void {
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
      const lx = 13;
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

    // ── Small cocoa beans beside the pod (lower-right, for read) ─────────────
    // Drawn before the pod so the pod overlaps the nearest bean a touch.
    {
      const beans: Array<[number, number, number, number]> = [
        // x, y, radiusX, rotation
        [11.5, 14.0, 2.6, 0.5],
        [14.6, 16.0, 2.3, -0.4],
        [9.6, 16.8, 2.2, 0.9],
      ];
      beans.forEach(([bx, byR, br, rot]) => {
        const by = byR + bob * 0.5;
        // contact shadow
        ctx.fillStyle = rgba(p.outline, 0.22 * (1 - 0.4 * p.iceAmt));
        ctx.beginPath();
        ctx.ellipse(bx + 0.6, by + br * 0.7, br * 1.05, br * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(rot);
        // outline pass
        ctx.fillStyle = rgb(p.outline);
        ctx.beginPath();
        ctx.ellipse(0, 0, br + 0.7, br * 0.78 + 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // bean body
        ctx.fillStyle = rgb(p.bean);
        ctx.beginPath();
        ctx.ellipse(0, 0, br, br * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();
        // lit top-left
        ctx.fillStyle = rgb(p.beanLit);
        ctx.beginPath();
        ctx.ellipse(-br * 0.28, -br * 0.3, br * 0.6, br * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        // centre crease groove
        ctx.strokeStyle = rgba(p.podDeep, 0.7);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-br * 0.7, 0);
        ctx.lineTo(br * 0.7, 0);
        ctx.stroke();
        // frost speck on the bean (winter)
        if (p.frostAmt > 0.02) {
          ctx.fillStyle = rgba([236, 246, 255], 0.6 * p.frostAmt);
          ctx.beginPath();
          ctx.ellipse(-br * 0.2, -br * 0.42, br * 0.5, br * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    // ── The cocoa POD (SAME ribbed silhouette every season) ──────────────────
    // contact shadow of the pod on the water/ice
    ctx.fillStyle = rgba(p.outline, 0.28 * (1 - 0.5 * p.iceAmt));
    ctx.beginPath();
    ctx.ellipse(POD_CX + 2, POD_CY + bob + POD_RY - 1.5, POD_RX * 0.92, 3.0, POD_TILT, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(POD_CX, POD_CY + bob);
    ctx.rotate(POD_TILT);

    // 1) soft dark outline pass (rim)
    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = rgb(p.outline);
    podBodyPath(ctx);
    ctx.stroke();
    ctx.restore();

    // 2) pod body fill + shading, clipped to the silhouette
    ctx.save();
    podBodyPath(ctx);
    ctx.clip();

    // base mid fill across the whole pod
    ctx.fillStyle = rgb(p.podMid);
    ctx.fillRect(-POD_RX - 4, -POD_RY - 4, (POD_RX + 4) * 2, (POD_RY + 4) * 2);

    // form gradient: lit upper-left → deep lower-right (cel-ish but soft)
    const fg = ctx.createLinearGradient(-POD_RX * 0.5, -POD_RY, POD_RX * 0.4, POD_RY);
    fg.addColorStop(0, rgb(p.podLight));
    fg.addColorStop(0.5, rgb(p.podMid));
    fg.addColorStop(1, rgb(p.podDeep));
    ctx.fillStyle = fg;
    ctx.fillRect(-POD_RX - 4, -POD_RY - 4, (POD_RX + 4) * 2, (POD_RY + 4) * 2);

    // darker belly band along the lower flank (anchors the form)
    ctx.fillStyle = rgba(p.podDeep, 0.55);
    ctx.beginPath();
    ctx.ellipse(1.5, POD_RY * 0.5, POD_RX * 0.96, POD_RY * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── The raised vertical RIBS (the locked feature) ────────────────────────
    // Each rib: a dark groove on one side, then a warm highlight ridge, arcing
    // over the pod's curved cross-section from top rim to bottom rim.
    for (let s = 0; s < RIB_COUNT; s++) {
      const cxr = ribX(s);
      const h = podHalfH(cxr);
      const ripple = (p.ripeness - 0.5) * 0.6; // ribs read a hair crisper when ripe
      // groove just left of the rib centre
      ctx.strokeStyle = rgba(p.podDeep, 0.85);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cxr - 1.4, -h + 0.6);
      ctx.quadraticCurveTo(cxr - 2.2 - ripple, 0, cxr - 1.4, h - 0.6);
      ctx.stroke();
      // warm highlight ridge along the rib crest
      ctx.strokeStyle = rgba(p.ribHi, 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cxr + 0.2, -h + 1.0);
      ctx.quadraticCurveTo(cxr + 1.0 + ripple, 0, cxr + 0.2, h - 1.0);
      ctx.stroke();
      // a second fine groove to the right to read 5 raised ribs clearly
      ctx.strokeStyle = rgba(p.podDeep, 0.5);
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(cxr + 1.9, -h + 1.2);
      ctx.quadraticCurveTo(cxr + 2.4, 0, cxr + 1.9, h - 1.2);
      ctx.stroke();
    }

    // pointed-end stem nub shading (upper-left tip) + blossom tip (lower-right)
    ctx.fillStyle = rgba(p.podDeep, 0.5);
    ctx.beginPath();
    ctx.ellipse(POD_RX * 0.92, 0, 1.8, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // broad wet specular sheen on the upper flank (gloss)
    if (p.gloss > 0.02) {
      const sgr = ctx.createLinearGradient(-POD_RX * 0.4, -POD_RY, POD_RX * 0.2, 0);
      sgr.addColorStop(0, rgba([255, 248, 236], 0));
      sgr.addColorStop(0.5, rgba([255, 248, 236], 0.16 + 0.34 * p.gloss));
      sgr.addColorStop(1, rgba([255, 248, 236], 0));
      ctx.fillStyle = sgr;
      ctx.beginPath();
      ctx.ellipse(-POD_RX * 0.18, -POD_RY * 0.42, POD_RX * 0.7, POD_RY * 0.46, POD_TILT, 0, Math.PI * 2);
      ctx.fill();
    }

    // idle travelling specular glint creeping along a rib (anim only)
    if (sheen >= 0) {
      const s = clamp01(sheen);
      const cxr = lerp(-POD_RX * 0.55, POD_RX * 0.55, s);
      const h = podHalfH(cxr);
      const gg = ctx.createLinearGradient(cxr, -h, cxr, h);
      gg.addColorStop(0, "rgba(255,250,240,0)");
      gg.addColorStop(0.45, "rgba(255,250,240,0.5)");
      gg.addColorStop(1, "rgba(255,250,240,0)");
      ctx.strokeStyle = gg;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cxr + 0.2, -h + 1.2);
      ctx.quadraticCurveTo(cxr + 1.0, 0, cxr + 0.2, h - 1.2);
      ctx.stroke();
    }

    // frost dusting on the pod's upward surface (winter) — pod stays brown
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([222, 238, 252], 0.2 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-POD_RX * 0.1, -POD_RY * 0.5, POD_RX * 0.82, POD_RY * 0.5, POD_TILT, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([240, 248, 255], 0.8 * p.frostAmt);
      for (let s = 0; s < RIB_COUNT; s++) {
        const cxr = ribX(s);
        const h = podHalfH(cxr);
        ctx.beginPath();
        ctx.arc(cxr + 0.2, -h * 0.55 + Math.sin(s * 1.7) * 0.6, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // end pod body clip

    // ── Snow cap on the pod's upper ribs (winter) — pod stays clearly visible ─
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      // a soft snow blanket riding the top rim of the pod
      ctx.fillStyle = rgba([246, 251, 255], 0.94 * a);
      ctx.beginPath();
      const left = -POD_RX * 0.72;
      const right = POD_RX * 0.72;
      ctx.moveTo(left, -podHalfH(left) + 1.4);
      // lumpy upper edge following each rib crest
      const steps = RIB_COUNT * 2;
      for (let i = 0; i <= steps; i++) {
        const x = lerp(left, right, i / steps);
        const lump = 1.6 + (i % 2 === 0 ? 1.2 : 0.4); // bump over each rib
        ctx.lineTo(x, -podHalfH(x) - lump * 0.5);
      }
      // under-edge back to the start (settles a little below the rim)
      for (let i = steps; i >= 0; i--) {
        const x = lerp(left, right, i / steps);
        ctx.lineTo(x, -podHalfH(x) + 2.6);
      }
      ctx.closePath();
      ctx.fill();
      // a faint cool shade under the snow lip
      ctx.strokeStyle = rgba([196, 216, 236], 0.5 * a);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(left, -podHalfH(left) + 2.6);
      ctx.quadraticCurveTo(0, -POD_RY * 0.1, right, -podHalfH(right) + 2.6);
      ctx.stroke();
    }

    ctx.restore(); // end pod translate/rotate

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

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.7, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0, -1);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // A slow specular sheen creeps along a rib (0..1, wraps). Additive dressing
    // on the locked pod — never the silhouette.
    const sheen = ((t * 0.28) % 1 + 1) % 1;
    paint(ctx, SP[season], bob, sheen);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

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
        // ripple + dew shimmer — a soft pulsing glint on the pod's lit flank
        const g = 0.2 + 0.24 * (0.5 + 0.5 * Math.sin(t * 2.0));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(POD_CX - 4, POD_CY + bob - 4, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // a brighter specular highlight pulses on the upper ribs
        const prog = (t * 0.5) % 1;
        const x = POD_CX + lerp(-7, 7, prog);
        const y = POD_CY + bob - 5;
        const sh = ctx.createRadialGradient(x, y, 0.4, x, y, 6);
        sh.addColorStop(0, "rgba(255,250,235,0.7)");
        sh.addColorStop(0.5, "rgba(255,240,210,0.3)");
        sh.addColorStop(1, "rgba(255,240,210,0)");
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // the floating leaf drifts gently on the pad
        const dx = 13 + Math.sin(t * 0.5) * 2.2;
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
      } else {
        // Winter — cold sheen on the ice + a drifting snowflake
        const prog = ((t / 3.2) % 1 + 1) % 1;
        const fy = -22 + prog * 40;
        const fx = -4 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(prog * Math.PI);
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
    paint(ctx, lerpP(from, to, k), 0, -1);
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
