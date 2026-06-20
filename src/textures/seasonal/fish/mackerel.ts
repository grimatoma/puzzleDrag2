// Seasonal art for the MACKEREL fish tile (`tile_fish_mackerel`).
//
// AQUATIC framing: the ground pad reads as still WATER (a bluish reflective
// ellipse), and a single mackerel rests on / half-in the wet water pad —
// a streamlined torpedo body with a forked tail, a pointed head, a gill line,
// a small round eye, and the signature dark wavy blue-green tiger STRIPES over
// a silvery belly, lying in a gentle curve on the pad.
//
// The SAME fish silhouette is drawn every season — only colour and dressing
// (water tint vs winter ICE, frost, a tiny blossom petal / fallen leaf, light
// tint, sheen) change. This is enforced by a single parameterized
// `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Palette lock: the mackerel stays blue-green striped with a silver belly in
// every season. Origin-centered in the −24..+24 design box, light from
// upper-left, flat cel-shaded with a soft dark outline. Pure Canvas-2D vector.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  backDark: RGB;    // dark blue-green spine band (carries the stripes)
  backMid: RGB;     // mid blue-green flank above the lateral line
  stripe: RGB;      // the dark wavy tiger stripes
  belly: RGB;       // silvery belly / lower flank
  bellyLit: RGB;    // brightest silver highlight on the belly
  fin: RGB;         // dorsal / pectoral / tail-fin membrane
  eye: RGB;         // eye ring / head shading
  water: RGB;       // top surface of the water pad
  waterDeep: RGB;   // shaded underside of the water pad
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  vividness: number; // 0..1 how iridescent/saturated the stripes read (peak=summer)
  gloss: number;    // 0..1 wet specular gloss-streak strength on the back
  iceAmt: number;   // 0..1 the water pad frozen to pale blue-white ice (winter)
  frostAmt: number; // 0..1 cool frost dusting on the fish (winter)
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
    backDark: lerpRGB(a.backDark, b.backDark, t),
    backMid: lerpRGB(a.backMid, b.backMid, t),
    stripe: lerpRGB(a.stripe, b.stripe, t),
    belly: lerpRGB(a.belly, b.belly, t),
    bellyLit: lerpRGB(a.bellyLit, b.bellyLit, t),
    fin: lerpRGB(a.fin, b.fin, t),
    eye: lerpRGB(a.eye, b.eye, t),
    water: lerpRGB(a.water, b.water, t),
    waterDeep: lerpRGB(a.waterDeep, b.waterDeep, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    vividness: lerp(a.vividness, b.vividness, t),
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
    vividness: clamp01(p.vividness),
    gloss: clamp01(p.gloss),
    iceAmt: clamp01(p.iceAmt),
    frostAmt: clamp01(p.frostAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — bright fish; fresh blue dewy water; a tiny blossom petal.
  Spring: {
    backDark: [44, 96, 110],
    backMid: [70, 144, 152],
    stripe: [26, 58, 70],
    belly: [214, 224, 226],
    bellyLit: [245, 250, 250],
    fin: [96, 150, 158],
    eye: [30, 46, 54],
    water: [120, 192, 220],
    waterDeep: [70, 134, 170],
    outline: [26, 50, 58],
    light: [232, 246, 248],
    lightAmt: 0.16,
    vividness: 0.6,
    gloss: 0.45,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: vivid iridescent blue-green stripes; bright saturated water.
  Summer: {
    backDark: [30, 112, 120],
    backMid: [48, 178, 168],
    stripe: [16, 56, 72],
    belly: [226, 236, 234],
    bellyLit: [252, 255, 255],
    fin: [70, 168, 168],
    eye: [22, 40, 50],
    water: [78, 178, 226],
    waterDeep: [40, 122, 180],
    outline: [18, 46, 56],
    light: [255, 244, 214],
    lightAmt: 0.18,
    vividness: 1.0,
    gloss: 0.95,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — fish a touch duller; olive-tinged water + a floating fallen leaf.
  Autumn: {
    backDark: [56, 92, 92],
    backMid: [84, 138, 126],
    stripe: [34, 56, 56],
    belly: [206, 210, 198],
    bellyLit: [238, 240, 226],
    fin: [104, 140, 122],
    eye: [36, 44, 44],
    water: [120, 158, 150],
    waterDeep: [82, 116, 104],
    outline: [40, 52, 48],
    light: [248, 214, 156],
    lightAmt: 0.2,
    vividness: 0.5,
    gloss: 0.4,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — water FROZEN to pale blue-white ICE + frost sparkle; a little frost
  // on the fish; blue-green stripes still clearly visible; cool light.
  Winter: {
    backDark: [52, 100, 110],
    backMid: [82, 150, 152],
    stripe: [30, 60, 70],
    belly: [218, 230, 236],
    bellyLit: [248, 252, 255],
    fin: [110, 156, 162],
    eye: [34, 50, 58],
    water: [216, 234, 244],
    waterDeep: [168, 198, 218],
    outline: [40, 58, 68],
    light: [212, 230, 252],
    lightAmt: 0.3,
    vividness: 0.55,
    gloss: 0.3,
    iceAmt: 0.92,
    frostAmt: 0.7,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Fish geometry (the SAME silhouette every season) ─────────────────────────

// The mackerel lies in a gentle curve along the pad, head toward upper-left,
// tail toward lower-right. All coordinates origin-centered; the body resting
// roughly on the water line at y≈+12. A small `flex` bends the body/tail as a
// slow seamless wave (idle only); flex=0 is the rest pose.
const FISH_CY = 10;      // body centre line y
const HEAD_X = -16.5;    // pointed snout tip x
const TAIL_X = 17;       // tail-fork root x
const BODY_HALF = 6.2;   // max half-thickness of the torpedo body

/** Body centre-line height at a given x, including the resting curve + idle
 *  flex. `u` is the normalised position along the body in [0,1]. */
function spineY(u: number, bob: number, flex: number): number {
  // gentle resting arch (belly dips slightly), plus a travelling flex wave.
  const arch = Math.sin(u * Math.PI) * 1.4;
  const wave = Math.sin(u * Math.PI * 1.6 - 0.6) * flex;
  return FISH_CY + bob - arch + wave;
}

/** Half-thickness of the torpedo body at normalised position `u` in [0,1]. */
function bodyHalf(u: number): number {
  // fat near the head-shoulder (u~0.32), tapering to the slim tail wrist.
  const shape = Math.sin(Math.pow(clamp01(u), 0.85) * Math.PI);
  const taper = 1 - clamp01((u - 0.55) / 0.45) * 0.72; // slim toward tail
  return BODY_HALF * shape * Math.max(0.28, taper);
}

function xAt(u: number): number {
  return lerp(HEAD_X, TAIL_X, clamp01(u));
}

/** Trace the streamlined fish body (snout → over the back → tail wrist →
 *  under the belly → back to snout). Same outline regardless of season. */
function fishBodyPath(ctx: CanvasRenderingContext2D, bob: number, flex: number): void {
  const N = 14;
  ctx.beginPath();
  // snout tip
  ctx.moveTo(HEAD_X, spineY(0, bob, flex));
  // over the back (top edge)
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    ctx.lineTo(xAt(u), spineY(u, bob, flex) - bodyHalf(u));
  }
  // under the belly (bottom edge, back toward the snout)
  for (let i = N; i >= 0; i--) {
    const u = i / N;
    ctx.lineTo(xAt(u), spineY(u, bob, flex) + bodyHalf(u));
  }
  ctx.closePath();
}

/** Draw the forked caudal (tail) fin at the wrist. */
function tailFin(ctx: CanvasRenderingContext2D, bob: number, flex: number, col: RGB, oc: RGB): void {
  const wristY = spineY(1, bob, flex);
  const wx = TAIL_X;
  ctx.fillStyle = rgb(col);
  ctx.strokeStyle = rgb(oc);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(wx - 1, wristY - 1.4);
  // upper lobe
  ctx.quadraticCurveTo(wx + 5, wristY - 6.5, wx + 7.4, wristY - 6.6);
  ctx.quadraticCurveTo(wx + 4.6, wristY - 2.6, wx + 4.2, wristY); // inner fork notch
  // lower lobe
  ctx.quadraticCurveTo(wx + 4.6, wristY + 2.6, wx + 7.4, wristY + 6.6);
  ctx.quadraticCurveTo(wx + 5, wristY + 6.5, wx - 1, wristY + 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob`. `flex` is the idle body wave. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number, flex = 0): void {
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
      const lx = 12.5;
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

    // ── Contact shadow / wet sheen of the fish ON the water ─────────────────
    ctx.fillStyle = rgba(p.outline, 0.26 * (1 - 0.5 * p.iceAmt));
    ctx.beginPath();
    ctx.ellipse(1.5, FISH_CY + bob + 5.5, 16, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Tail fin (behind the body) ───────────────────────────────────────────
    tailFin(ctx, bob, flex, p.fin, p.outline);

    // ── Subject: the mackerel (SAME silhouette every season) ─────────────────
    // 1) soft dark outline pass (fatter body drawn first as the rim)
    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = rgb(p.outline);
    fishBodyPath(ctx, bob, flex);
    ctx.stroke();
    ctx.restore();

    // 2) body fill + shading, clipped to the silhouette
    ctx.save();
    fishBodyPath(ctx, bob, flex);
    ctx.clip();

    // base silver belly fill over the whole body
    ctx.fillStyle = rgb(p.belly);
    ctx.fillRect(HEAD_X - 4, FISH_CY + bob - 14, (TAIL_X - HEAD_X) + 10, 28);

    // brighter silver lower-belly highlight (lower third)
    ctx.fillStyle = rgb(p.bellyLit);
    ctx.beginPath();
    ctx.moveTo(HEAD_X, FISH_CY + bob + 1);
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      ctx.lineTo(xAt(u), spineY(u, bob, flex) + bodyHalf(u));
    }
    for (let i = 14; i >= 0; i--) {
      const u = i / 14;
      ctx.lineTo(xAt(u), spineY(u, bob, flex) + bodyHalf(u) * 0.2);
    }
    ctx.closePath();
    ctx.fill();

    // blue-green back band (upper flank) — sits above the lateral line
    ctx.fillStyle = rgb(p.backMid);
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      ctx.lineTo(xAt(u), spineY(u, bob, flex) - bodyHalf(u));
    }
    for (let i = 14; i >= 0; i--) {
      const u = i / 14;
      ctx.lineTo(xAt(u), spineY(u, bob, flex) - bodyHalf(u) * 0.05);
    }
    ctx.closePath();
    ctx.fill();

    // darker spine band right along the top
    ctx.fillStyle = rgb(p.backDark);
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      ctx.lineTo(xAt(u), spineY(u, bob, flex) - bodyHalf(u));
    }
    for (let i = 14; i >= 0; i--) {
      const u = i / 14;
      ctx.lineTo(xAt(u), spineY(u, bob, flex) - bodyHalf(u) * 0.55);
    }
    ctx.closePath();
    ctx.fill();

    // signature dark wavy tiger STRIPES across the back (the locked feature)
    ctx.strokeStyle = rgba(p.stripe, 0.85 + 0.1 * p.vividness);
    ctx.lineWidth = 1.5;
    const nStripes = 9;
    for (let s = 0; s < nStripes; s++) {
      const u = 0.1 + (s / nStripes) * 0.78;
      const cx = xAt(u);
      const topY = spineY(u, bob, flex) - bodyHalf(u);
      const midY = spineY(u, bob, flex) - bodyHalf(u) * 0.08;
      ctx.beginPath();
      ctx.moveTo(cx - 0.6, topY + 0.4);
      // wavy vertical-ish stripe dropping to the lateral line
      ctx.quadraticCurveTo(cx + 1.8, lerp(topY, midY, 0.5), cx - 0.8, midY);
      ctx.stroke();
    }

    // iridescent blue-green sheen sweeping the upper flank (vividness)
    if (p.vividness > 0.02) {
      const sg = ctx.createLinearGradient(HEAD_X, FISH_CY + bob - BODY_HALF, TAIL_X, FISH_CY + bob);
      sg.addColorStop(0, rgba(p.backMid, 0));
      sg.addColorStop(0.45, rgba([140, 240, 220], 0.18 * p.vividness));
      sg.addColorStop(0.7, rgba([180, 240, 255], 0.12 * p.vividness));
      sg.addColorStop(1, rgba(p.backMid, 0));
      ctx.fillStyle = sg;
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        ctx.lineTo(xAt(u), spineY(u, bob, flex) - bodyHalf(u));
      }
      for (let i = 14; i >= 0; i--) {
        const u = i / 14;
        ctx.lineTo(xAt(u), spineY(u, bob, flex) - bodyHalf(u) * 0.1);
      }
      ctx.closePath();
      ctx.fill();
    }

    // wet specular gloss streak along the upper back (gloss)
    if (p.gloss > 0.02) {
      ctx.strokeStyle = rgba([255, 255, 255], 0.2 + 0.5 * p.gloss);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 1; i <= 13; i++) {
        const u = i / 14;
        const x = xAt(u);
        const y = spineY(u, bob, flex) - bodyHalf(u) * 0.78;
        if (i === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // frost dusting on the fish's upward surfaces (winter)
    if (p.frostAmt > 0.02) {
      ctx.strokeStyle = rgba([226, 240, 252], 0.5 * p.frostAmt);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 1; i <= 13; i++) {
        const u = i / 14;
        const x = xAt(u);
        const y = spineY(u, bob, flex) - bodyHalf(u) * 0.92;
        if (i === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = rgba([240, 248, 255], 0.8 * p.frostAmt);
      for (let s = 0; s < 6; s++) {
        const u = 0.18 + (s / 6) * 0.62;
        const x = xAt(u) + Math.sin(s * 1.7) * 1.2;
        const y = spineY(u, bob, flex) - bodyHalf(u) * 0.7;
        ctx.beginPath();
        ctx.arc(x, y, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // end body clip

    // ── Dorsal fin on the back ───────────────────────────────────────────────
    {
      const u = 0.42;
      const bx = xAt(u);
      const by = spineY(u, bob, flex) - bodyHalf(u) + 0.6;
      ctx.fillStyle = rgb(p.fin);
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx - 3, by);
      ctx.quadraticCurveTo(bx - 1, by - 5, bx + 1.4, by - 4.4);
      ctx.lineTo(bx + 3.4, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // ── Pectoral fin on the near (lower) flank ──────────────────────────────
    {
      const u = 0.34;
      const fx = xAt(u);
      const fy = spineY(u, bob, flex) + bodyHalf(u) * 0.55;
      ctx.fillStyle = rgba(p.fin, 0.92);
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(fx - 1, fy - 1);
      ctx.quadraticCurveTo(fx + 2.4, fy + 2.6, fx + 4.6, fy + 4);
      ctx.quadraticCurveTo(fx + 1.6, fy + 3, fx - 1, fy + 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // ── Gill line + eye on the pointed head ─────────────────────────────────
    {
      const u = 0.18;
      const gx = xAt(u);
      const gTop = spineY(u, bob, flex) - bodyHalf(u);
      const gBot = spineY(u, bob, flex) + bodyHalf(u);
      // gill cover curve
      ctx.strokeStyle = rgba(p.outline, 0.7);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(gx, gTop + 0.6);
      ctx.quadraticCurveTo(gx - 2.4, FISH_CY + bob, gx, gBot - 0.6);
      ctx.stroke();
      // small round eye, near the snout, on the upper head
      const ex = HEAD_X + 4.2;
      const ey = spineY(0.06, bob, flex) - 1.2;
      ctx.fillStyle = rgb(p.bellyLit);
      ctx.beginPath();
      ctx.arc(ex, ey, 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb(p.eye);
      ctx.beginPath();
      ctx.arc(ex, ey, 1.25, 0, Math.PI * 2);
      ctx.fill();
      // eye glint (kept tiny; constant dressing, not a flash)
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(ex - 0.45, ey - 0.45, 0.5, 0, Math.PI * 2);
      ctx.fill();
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

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.7, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// Body flex wave — a slow seamless flex through the body/tail; 0 at t=0.
function flexAt(t: number, amp = 1.1, w = 1.4): number {
  return amp * Math.sin(w * t);
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0, 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    const flex = flexAt(t);
    // The fish/tail flexes subtly as a slow seamless wave through the body.
    paint(ctx, SP[season], bob, flex);

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

      // Shared: a small gill/eye glint pulse near the head.
      const exg = HEAD_X + 4.2;
      const eyg = spineY(0.06, bob, flex) - 1.2;
      const gl = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.4));
      ctx.fillStyle = `rgba(255,255,255,${gl * 0.7})`;
      ctx.beginPath();
      ctx.arc(exg - 0.45, eyg - 0.45, 0.5 + 0.25 * gl, 0, Math.PI * 2);
      ctx.fill();

      if (season === "Spring") {
        // ripple + dew shimmer — a soft pulsing glint travelling the flank
        const g = 0.22 + 0.26 * (0.5 + 0.5 * Math.sin(t * 2.0));
        const u = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.6));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(xAt(u), spineY(u, bob, flex) - 1.5, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // an iridescent sheen sweeps the stripes along the back
        const prog = (t * 0.5) % 1;
        const u = lerp(0.12, 0.86, prog);
        const x = xAt(u);
        const y = spineY(u, bob, flex) - bodyHalf(u) * 0.6;
        const sh = ctx.createRadialGradient(x, y, 0.4, x, y, 6);
        sh.addColorStop(0, "rgba(190,255,238,0.7)");
        sh.addColorStop(0.5, "rgba(150,225,255,0.3)");
        sh.addColorStop(1, "rgba(150,225,255,0)");
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // the floating leaf drifts gently on the pad
        const dx = 12.5 + Math.sin(t * 0.5) * 2.2;
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
