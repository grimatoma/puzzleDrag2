// Seasonal art for the SARDINE fish tile (`tile_fish_sardine`).
//
// AQUATIC framing: the ground pad reads as still WATER (a bluish reflective
// ellipse), NOT grass, and a small slender SARDINE rests on / half-in the wet
// water pad — a streamlined little fish lying in a gentle curve, a pointed head,
// a forked tail, a silvery belly and a blue-green back, with ONE faint dark
// lateral line down the flank (the sardine's mark — NOT the mackerel's many
// tiger stripes) and a row of tiny scale glints. A SECOND smaller sardine sits
// slightly behind/below the hero (they school), but the hero stays the clear
// read.
//
// The sardine is a smaller, plainer sibling of the mackerel: slimmer and shorter,
// with the single lateral line standing in for the mackerel's striped back.
//
// The SAME sardine silhouette is drawn every season — only colour and dressing
// (water tint vs winter ICE, frost, a tiny blossom petal / fallen leaf, light
// tint, sheen) change. This is enforced by a single parameterized
// `paint(ctx, p, bob, flex)`:
//   - draw(season)      = paint(ctx, SP[season], 0, 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t), flexAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0, 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Palette lock: the sardine stays blue-green-backed with a silver belly and one
// faint lateral line in every season. Winter FREEZES the water pad to pale
// blue-white ICE (iceAmt) with frost sparkle; the fish stays clearly visible
// (frost dusting only — NO white-out). Origin-centered in the −24..+24 design
// box, light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  backDark: RGB;    // dark blue-green spine band along the very top
  backMid: RGB;     // blue-green back / upper flank above the lateral line
  flank: RGB;       // silver flank below the back
  belly: RGB;       // bright silvery belly / lower flank
  bellyLit: RGB;    // brightest silver highlight on the belly
  line: RGB;        // the single faint dark lateral line / shading
  fin: RGB;         // dorsal / pectoral / tail-fin membrane
  eye: RGB;         // eye ring / head shading
  water: RGB;       // top surface of the water pad
  waterDeep: RGB;   // shaded underside of the water pad
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  sheen: number;    // 0..1 iridescent/silvery sheen on the flank (peak=summer)
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
    flank: lerpRGB(a.flank, b.flank, t),
    belly: lerpRGB(a.belly, b.belly, t),
    bellyLit: lerpRGB(a.bellyLit, b.bellyLit, t),
    line: lerpRGB(a.line, b.line, t),
    fin: lerpRGB(a.fin, b.fin, t),
    eye: lerpRGB(a.eye, b.eye, t),
    water: lerpRGB(a.water, b.water, t),
    waterDeep: lerpRGB(a.waterDeep, b.waterDeep, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    sheen: lerp(a.sheen, b.sheen, t),
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
    sheen: clamp01(p.sheen),
    gloss: clamp01(p.gloss),
    iceAmt: clamp01(p.iceAmt),
    frostAmt: clamp01(p.frostAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// The sardine's palette is LOCKED: blue-green back ~[86,140,150], silver flank
// ~[154,184,196], bright belly ~[236,244,248], lateral line/shadow ~[74,94,104],
// fin ~[120,160,172]. Seasons shift these only slightly (a touch duller in
// autumn, peak silver in summer) and change the water/ice, dressing, and light.

const SP: Record<SeasonName, P> = {
  // Spring — bright fish; fresh blue dewy water; a tiny blossom petal; cool-bright.
  Spring: {
    backDark: [60, 112, 122],
    backMid: [86, 140, 150],
    flank: [154, 184, 196],
    belly: [228, 240, 246],
    bellyLit: [246, 250, 252],
    line: [74, 94, 104],
    fin: [120, 160, 172],
    eye: [34, 48, 56],
    water: [120, 192, 220],
    waterDeep: [70, 134, 170],
    outline: [40, 58, 66],
    light: [232, 246, 248],
    lightAmt: 0.16,
    sheen: 0.55,
    gloss: 0.45,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: most silvery/iridescent flank; bright saturated water; warm.
  Summer: {
    backDark: [54, 124, 130],
    backMid: [82, 154, 158],
    flank: [168, 198, 208],
    belly: [240, 248, 250],
    bellyLit: [252, 255, 255],
    line: [66, 88, 100],
    fin: [112, 166, 176],
    eye: [28, 44, 52],
    water: [78, 178, 226],
    waterDeep: [40, 122, 180],
    outline: [34, 54, 62],
    light: [255, 244, 214],
    lightAmt: 0.18,
    sheen: 1.0,
    gloss: 0.95,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — fish a touch duller; olive-tinged water + a floating fallen leaf.
  Autumn: {
    backDark: [70, 102, 100],
    backMid: [96, 134, 130],
    flank: [156, 174, 174],
    belly: [220, 226, 218],
    bellyLit: [238, 240, 230],
    line: [72, 86, 86],
    fin: [118, 148, 142],
    eye: [38, 46, 46],
    water: [120, 158, 150],
    waterDeep: [82, 116, 104],
    outline: [48, 58, 54],
    light: [248, 214, 156],
    lightAmt: 0.2,
    sheen: 0.45,
    gloss: 0.4,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — water FROZEN to pale blue-white ICE + frost sparkle; a little frost
  // on the fish; blue-green back still clearly visible; cool light.
  Winter: {
    backDark: [64, 110, 120],
    backMid: [90, 142, 150],
    flank: [160, 188, 200],
    belly: [228, 240, 248],
    bellyLit: [248, 252, 255],
    line: [70, 92, 104],
    fin: [122, 162, 174],
    eye: [38, 54, 62],
    water: [216, 234, 244],
    waterDeep: [168, 198, 218],
    outline: [50, 66, 76],
    light: [212, 230, 252],
    lightAmt: 0.3,
    sheen: 0.5,
    gloss: 0.3,
    iceAmt: 0.92,
    frostAmt: 0.6,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Sardine geometry (the SAME silhouette every season) ──────────────────────
// The sardine lies in a gentle curve along the pad, head toward upper-left,
// tail toward lower-right. Slimmer and SHORTER than the mackerel. All coords
// origin-centered; body resting roughly on the water line. A small `flex` bends
// the body/tail as a slow seamless wave (idle only); flex=0 is the rest pose.

const FISH_CY = 9.5;     // hero body centre line y
const HEAD_X = -13.5;    // pointed snout tip x (shorter than the mackerel)
const TAIL_X = 14;       // tail-fork root x
const BODY_HALF = 4.6;   // max half-thickness — slimmer than the mackerel

/** Body centre-line height at normalised position `u` in [0,1], including the
 *  resting curve + idle flex. `cy` lets a second fish share the geometry. */
function spineY(u: number, bob: number, flex: number, cy: number = FISH_CY): number {
  const arch = Math.sin(u * Math.PI) * 1.2;            // gentle resting arch
  const wave = Math.sin(u * Math.PI * 1.7 - 0.6) * flex; // travelling flex wave
  return cy + bob - arch + wave;
}

/** Half-thickness of the slim torpedo body at normalised position `u` in [0,1].
 *  `scale` shrinks the whole body for the smaller schooling fish. */
function bodyHalf(u: number, scale: number = 1): number {
  // fat near the head-shoulder (u~0.3), tapering to the very slim tail wrist.
  const shape = Math.sin(Math.pow(clamp01(u), 0.82) * Math.PI);
  const taper = 1 - clamp01((u - 0.5) / 0.5) * 0.78; // slimmer toward the tail
  return BODY_HALF * scale * shape * Math.max(0.24, taper);
}

function xAt(u: number, headX: number = HEAD_X, tailX: number = TAIL_X): number {
  return lerp(headX, tailX, clamp01(u));
}

/** Trace the streamlined sardine body (snout → over the back → tail wrist →
 *  under the belly → back to snout). Same outline regardless of season. */
function fishBodyPath(
  ctx: CanvasRenderingContext2D,
  bob: number,
  flex: number,
  cy: number,
  headX: number,
  tailX: number,
  scale: number,
): void {
  const N = 14;
  ctx.beginPath();
  ctx.moveTo(headX, spineY(0, bob, flex, cy));
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) - bodyHalf(u, scale));
  }
  for (let i = N; i >= 0; i--) {
    const u = i / N;
    ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) + bodyHalf(u, scale));
  }
  ctx.closePath();
}

/** Draw the forked caudal (tail) fin at the wrist. */
function tailFin(
  ctx: CanvasRenderingContext2D,
  bob: number,
  flex: number,
  col: RGB,
  oc: RGB,
  cy: number,
  tailX: number,
  scale: number,
): void {
  const wristY = spineY(1, bob, flex, cy);
  const wx = tailX;
  const s = scale;
  ctx.fillStyle = rgb(col);
  ctx.strokeStyle = rgb(oc);
  ctx.lineWidth = 1.0 * s;
  ctx.beginPath();
  ctx.moveTo(wx - 1 * s, wristY - 1.1 * s);
  // upper lobe
  ctx.quadraticCurveTo(wx + 4 * s, wristY - 5.4 * s, wx + 6 * s, wristY - 5.6 * s);
  ctx.quadraticCurveTo(wx + 3.8 * s, wristY - 2.2 * s, wx + 3.4 * s, wristY); // fork notch
  // lower lobe
  ctx.quadraticCurveTo(wx + 3.8 * s, wristY + 2.2 * s, wx + 6 * s, wristY + 5.6 * s);
  ctx.quadraticCurveTo(wx + 4 * s, wristY + 5.4 * s, wx - 1 * s, wristY + 1.1 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Draw one sardine body (fill + shading + lateral line + scale glints), clipped
 *  to its own silhouette. Shared by the hero and the smaller schooling fish so
 *  the IDENTITY is constant. `lit` scales highlight strength (the hero is fully
 *  lit; the behind fish is dimmer). */
function drawSardineBody(
  ctx: CanvasRenderingContext2D,
  p: P,
  bob: number,
  flex: number,
  cy: number,
  headX: number,
  tailX: number,
  scale: number,
  lit: number,
): void {
  // tail fin behind the body
  tailFin(ctx, bob, flex, p.fin, p.outline, cy, tailX, scale);

  // 1) soft dark outline pass (rim)
  ctx.save();
  ctx.lineWidth = 2.0 * scale;
  ctx.strokeStyle = rgb(p.outline);
  fishBodyPath(ctx, bob, flex, cy, headX, tailX, scale);
  ctx.stroke();
  ctx.restore();

  // 2) body fill + shading, clipped to the silhouette
  ctx.save();
  fishBodyPath(ctx, bob, flex, cy, headX, tailX, scale);
  ctx.clip();

  const spanX = tailX - headX;

  // base silver flank fill over the whole body
  ctx.fillStyle = rgb(p.flank);
  ctx.fillRect(headX - 4, cy + bob - 12, spanX + 10, 24);

  // bright silver belly highlight (lower third)
  ctx.fillStyle = rgb(p.belly);
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) + bodyHalf(u, scale));
  }
  for (let i = 14; i >= 0; i--) {
    const u = i / 14;
    ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) + bodyHalf(u, scale) * 0.18);
  }
  ctx.closePath();
  ctx.fill();

  // brightest belly sliver right along the bottom
  if (lit > 0.01) {
    ctx.fillStyle = rgba(p.bellyLit, lit);
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) + bodyHalf(u, scale));
    }
    for (let i = 14; i >= 0; i--) {
      const u = i / 14;
      ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) + bodyHalf(u, scale) * 0.62);
    }
    ctx.closePath();
    ctx.fill();
  }

  // blue-green back band (upper flank) — sits above the lateral line
  ctx.fillStyle = rgb(p.backMid);
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) - bodyHalf(u, scale));
  }
  for (let i = 14; i >= 0; i--) {
    const u = i / 14;
    ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) - bodyHalf(u, scale) * 0.08);
  }
  ctx.closePath();
  ctx.fill();

  // darker blue-green spine band right along the very top
  ctx.fillStyle = rgb(p.backDark);
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) - bodyHalf(u, scale));
  }
  for (let i = 14; i >= 0; i--) {
    const u = i / 14;
    ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) - bodyHalf(u, scale) * 0.55);
  }
  ctx.closePath();
  ctx.fill();

  // ── The sardine's signature ONE faint dark lateral line down the flank ──────
  // (Stands in for the mackerel's many tiger stripes — a single soft line.)
  ctx.strokeStyle = rgba(p.line, 0.55 + 0.1 * lit);
  ctx.lineWidth = 1.0 * scale;
  ctx.beginPath();
  for (let i = 1; i <= 13; i++) {
    const u = i / 14;
    const x = xAt(u, headX, tailX);
    // the line rides a touch above mid-flank, gently following the body
    const y = spineY(u, bob, flex, cy) - bodyHalf(u, scale) * 0.12;
    if (i === 1) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // a row of tiny scale glints just below the lateral line (sardine sparkle)
  if (lit > 0.01) {
    ctx.fillStyle = rgba(p.bellyLit, (0.35 + 0.3 * p.sheen) * lit);
    for (let s = 0; s < 6; s++) {
      const u = 0.24 + (s / 6) * 0.5;
      const x = xAt(u, headX, tailX) + Math.sin(s * 1.3) * 0.6;
      const y = spineY(u, bob, flex, cy) + bodyHalf(u, scale) * 0.12;
      ctx.beginPath();
      ctx.arc(x, y, 0.55 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // iridescent silvery sheen sweeping the flank (sheen) — peak in summer
  if (p.sheen > 0.02 && lit > 0.01) {
    const sg = ctx.createLinearGradient(headX, cy + bob - BODY_HALF, tailX, cy + bob + 2);
    sg.addColorStop(0, rgba(p.flank, 0));
    sg.addColorStop(0.45, rgba([216, 246, 252], 0.16 * p.sheen * lit));
    sg.addColorStop(0.7, rgba([196, 226, 255], 0.12 * p.sheen * lit));
    sg.addColorStop(1, rgba(p.flank, 0));
    ctx.fillStyle = sg;
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) - bodyHalf(u, scale));
    }
    for (let i = 14; i >= 0; i--) {
      const u = i / 14;
      ctx.lineTo(xAt(u, headX, tailX), spineY(u, bob, flex, cy) + bodyHalf(u, scale) * 0.3);
    }
    ctx.closePath();
    ctx.fill();
  }

  // wet specular gloss streak along the upper back (gloss)
  if (p.gloss > 0.02 && lit > 0.01) {
    ctx.strokeStyle = rgba([255, 255, 255], (0.18 + 0.45 * p.gloss) * lit);
    ctx.lineWidth = 1.0 * scale;
    ctx.beginPath();
    for (let i = 1; i <= 13; i++) {
      const u = i / 14;
      const x = xAt(u, headX, tailX);
      const y = spineY(u, bob, flex, cy) - bodyHalf(u, scale) * 0.78;
      if (i === 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // frost dusting on the fish's upward surfaces (winter) — fish stays VISIBLE
  if (p.frostAmt > 0.02) {
    ctx.strokeStyle = rgba([226, 240, 252], 0.42 * p.frostAmt);
    ctx.lineWidth = 1.3 * scale;
    ctx.beginPath();
    for (let i = 1; i <= 13; i++) {
      const u = i / 14;
      const x = xAt(u, headX, tailX);
      const y = spineY(u, bob, flex, cy) - bodyHalf(u, scale) * 0.92;
      if (i === 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = rgba([240, 248, 255], 0.7 * p.frostAmt);
    for (let s = 0; s < 5; s++) {
      const u = 0.2 + (s / 5) * 0.6;
      const x = xAt(u, headX, tailX) + Math.sin(s * 1.7) * 1.0;
      const y = spineY(u, bob, flex, cy) - bodyHalf(u, scale) * 0.68;
      ctx.beginPath();
      ctx.arc(x, y, 0.6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore(); // end body clip

  // ── Dorsal fin on the back ──────────────────────────────────────────────────
  {
    const u = 0.4;
    const bx = xAt(u, headX, tailX);
    const by = spineY(u, bob, flex, cy) - bodyHalf(u, scale) + 0.5;
    const s = scale;
    ctx.fillStyle = rgb(p.fin);
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(bx - 2.4 * s, by);
    ctx.quadraticCurveTo(bx - 0.8 * s, by - 4 * s, bx + 1.2 * s, by - 3.4 * s);
    ctx.lineTo(bx + 2.8 * s, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ── Pectoral fin on the near (lower) flank ─────────────────────────────────
  {
    const u = 0.32;
    const fx = xAt(u, headX, tailX);
    const fy = spineY(u, bob, flex, cy) + bodyHalf(u, scale) * 0.5;
    const s = scale;
    ctx.fillStyle = rgba(p.fin, 0.92);
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(fx - 0.8 * s, fy - 0.8 * s);
    ctx.quadraticCurveTo(fx + 2 * s, fy + 2.2 * s, fx + 3.8 * s, fy + 3.2 * s);
    ctx.quadraticCurveTo(fx + 1.4 * s, fy + 2.4 * s, fx - 0.8 * s, fy + 1.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ── Gill line + eye on the pointed head ────────────────────────────────────
  {
    const u = 0.16;
    const gx = xAt(u, headX, tailX);
    const gTop = spineY(u, bob, flex, cy) - bodyHalf(u, scale);
    const gBot = spineY(u, bob, flex, cy) + bodyHalf(u, scale);
    ctx.strokeStyle = rgba(p.outline, 0.7);
    ctx.lineWidth = 1.0 * scale;
    ctx.beginPath();
    ctx.moveTo(gx, gTop + 0.5);
    ctx.quadraticCurveTo(gx - 2.0 * scale, cy + bob, gx, gBot - 0.5);
    ctx.stroke();
    // small round eye near the snout, on the upper head
    const ex = headX + 3.4 * scale;
    const ey = spineY(0.05, bob, flex, cy) - 1.0 * scale;
    ctx.fillStyle = rgb(p.bellyLit);
    ctx.beginPath();
    ctx.arc(ex, ey, 1.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.eye);
    ctx.beginPath();
    ctx.arc(ex, ey, 1.05 * scale, 0, Math.PI * 2);
    ctx.fill();
    // tiny constant eye glint (dressing, not a flash)
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(ex - 0.4 * scale, ey - 0.4 * scale, 0.45 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
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

    // ── Second smaller sardine slightly behind/below (they school) ───────────
    // Drawn first so the hero overlaps it; dimmer + a hair below the water line,
    // reading as half-submerged behind the hero. SAME sardine identity, smaller.
    {
      const bCy = FISH_CY + 6.2;        // lower / further back
      const bHeadX = HEAD_X + 3.0;      // shifted right a touch
      const bTailX = TAIL_X - 1.0;
      const bScale = 0.66;              // smaller schooling fish
      // partial flex offset so the two fish don't move in lockstep
      drawSardineBody(ctx, p, bob * 0.7, flex * 0.8, bCy, bHeadX, bTailX, bScale, 0.5);
      // a faint water veil over the behind fish so it reads as deeper/submerged
      ctx.fillStyle = rgba(p.water, 0.28 * (1 - 0.5 * p.iceAmt));
      ctx.beginPath();
      ctx.ellipse(2, bCy + bob * 0.7 + 1.5, 12, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Contact shadow / wet sheen of the hero fish ON the water ─────────────
    ctx.fillStyle = rgba(p.outline, 0.26 * (1 - 0.5 * p.iceAmt));
    ctx.beginPath();
    ctx.ellipse(1.0, FISH_CY + bob + 4.6, 14, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the HERO sardine (SAME silhouette every season) ─────────────
    drawSardineBody(ctx, p, bob, flex, FISH_CY, HEAD_X, TAIL_X, 1, 1);

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
function bobAt(t: number, amp = 0.65, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// Body flex wave — a slow seamless flex through the body/tail; 0 at t=0.
function flexAt(t: number, amp = 1.0, w = 1.4): number {
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
    // The sardine flexes subtly as a slow seamless wave through the body/tail.
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

      // Shared: a small eye-glint pulse near the hero's head.
      const exg = HEAD_X + 3.4;
      const eyg = spineY(0.05, bob, flex) - 1.0;
      const gl = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.4));
      ctx.fillStyle = `rgba(255,255,255,${gl * 0.7})`;
      ctx.beginPath();
      ctx.arc(exg - 0.4, eyg - 0.4, 0.45 + 0.22 * gl, 0, Math.PI * 2);
      ctx.fill();

      if (season === "Spring") {
        // ripple + dew shimmer — a soft pulsing glint travelling the flank
        const g = 0.2 + 0.24 * (0.5 + 0.5 * Math.sin(t * 2.0));
        const u = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.6));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(xAt(u), spineY(u, bob, flex) - 1.2, 0.9 + g * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // an iridescent sheen sweeps along the flank
        const prog = (t * 0.5) % 1;
        const u = lerp(0.12, 0.84, prog);
        const x = xAt(u);
        const y = spineY(u, bob, flex) - bodyHalf(u) * 0.45;
        const sh = ctx.createRadialGradient(x, y, 0.4, x, y, 5);
        sh.addColorStop(0, "rgba(206,250,255,0.7)");
        sh.addColorStop(0.5, "rgba(170,220,255,0.3)");
        sh.addColorStop(1, "rgba(170,220,255,0)");
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 2.8, 0, 0, Math.PI * 2);
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
