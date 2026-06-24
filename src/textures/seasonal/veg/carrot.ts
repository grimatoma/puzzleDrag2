// BOLD seasonal art for the CARROT vegetable tile (`tile_veg_carrot`).
//
// Mirrors the APPROVED bold produce direction in `pepper.bold.ts`: the SAME
// carrot every season (identity-safe) — one bright-orange root lying at a
// natural diagonal slant with a feathery green leafy top — but the seasons swing
// HARD on colour + a real seasonal prop (blossom / fallen leaf / snow cap + base
// snow). The idle is a DISTINCT, in-character beat for a root vegetable — NOT the
// generic produce bounce — built entirely from the idle Pose:
//
//   IDLE COMMON  (~6s, win ~1.0s): a TOP-FLICK — the feathery green top rustles
//       in a breeze. A small lean sway about the resting tip (lower-left): because
//       the pivot is at the tip and the leaves are at the far upper-right end, a
//       tiny lean moves the TOP the most while the root barely stirs — the sway is
//       concentrated at the top. Two soft flicks left/right, then calm. Zero value
//       AND velocity at the window edges (seamless).
//   IDLE RARE    (~18s, win ~2.0s): a PULL-UP-FROM-THE-SOIL — the carrot is tugged
//       UP out of the ground a little (bob up), HANGS for a beat, then settles
//       back down with a small squash + soil-shift on landing and a faint lean
//       wiggle while it hangs. A couple of soil flecks kick up at the base as it
//       lifts (additive overlay in anim(), enveloped to 0 at the window edges).
//       Pose-driven; clearly distinct from the common rustle. Phased clear of it.
//
// Architecture mirrors pepper.bold.ts: a single parameterized `paint(ctx, p,
// pose)` where `interface P` holds tweenable season params (colours + prop
// amounts) and `pose` holds the idle gesture (bob / lean / squash). Because every
// season is the same paint with tweened P, transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop.
//
// PALETTE LOCK: the carrot stays BRIGHT ORANGE with a green top every season —
// ripeness shows in surface and shade (paler/matte vs glossy, freckles, frost),
// NEVER a hue change. The slanted SILHOUETTE is IDENTICAL across all seasons.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing — never throws, clamps everything, save/restore.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  rootLight: RGB;        // lit upper face of the orange carrot skin
  rootMid: RGB;          // body tone (bright orange)
  rootDark: RGB;         // shaded underside / tip
  topLight: RGB;         // lit feathery green leaves
  topMid: RGB;           // body of the green top
  topDark: RGB;          // shaded inner fronds
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the carrot
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  rootScale: number;     // body fatness multiplier (small spring → fat autumn)
  gloss: number;         // 0..1 specular gloss-streak strength on the skin
  freckleAmt: number;    // 0..1 faint freckles on the skin (autumn)
  frostAmt: number;      // 0..1 cool frost dusting over the orange (winter)
  snowCapAmt: number;    // 0..1 snow on the upward side of the carrot (winter)
  padSnowAmt: number;    // 0..1 snow blanket / base drift on the pad (winter)
  blossomAmt: number;    // 0..1 a pale blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // rock of the carrot, radians (rock side to side)
  squashX: number; // additive horizontal scale (+0.18 = 18% wider)
  squashY: number; // additive vertical scale (+0.18 = 18% taller)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

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
    rootLight: lerpRGB(a.rootLight, b.rootLight, t),
    rootMid: lerpRGB(a.rootMid, b.rootMid, t),
    rootDark: lerpRGB(a.rootDark, b.rootDark, t),
    topLight: lerpRGB(a.topLight, b.topLight, t),
    topMid: lerpRGB(a.topMid, b.topMid, t),
    topDark: lerpRGB(a.topDark, b.topDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    rootScale: lerp(a.rootScale, b.rootScale, t),
    gloss: lerp(a.gloss, b.gloss, t),
    freckleAmt: lerp(a.freckleAmt, b.freckleAmt, t),
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
    gloss: clamp01(p.gloss),
    freckleAmt: clamp01(p.freckleAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    rootScale: p.rootScale > 0.2 ? (p.rootScale < 2 ? p.rootScale : 2) : 0.2,
  };
}

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// ── Per-season params — pushed HARD ──────────────────────────────────────────
// PALETTE LOCK: rootMid stays a bright orange in EVERY season; the green top
// stays green. Only surface (gloss/matte), shade, freckles, frost, snow, pad
// colour, fatness and light change. NO hue swap on the carrot.

const SP: Record<SeasonName, P> = {
  // Spring — small PALE young carrot, ferny fresh top, prominent blossom.
  // Cool-bright light, slimmer body.
  Spring: {
    rootLight: [255, 188, 116],
    rootMid: [244, 150, 64],
    rootDark: [192, 104, 40],
    topLight: [176, 230, 116],
    topMid: [114, 196, 74],
    topDark: [62, 138, 52],
    padGrass: [132, 212, 90],
    padDark: [74, 144, 60],
    soil: [120, 84, 48],
    outline: [104, 52, 18],
    light: [232, 248, 220],
    lightAmt: 0.18,
    rootScale: 0.78,
    gloss: 0.24,
    freckleAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — full ripe vivid GLOSSY bright-orange carrot, lush ferny green top
  // (PEAK); warm light, max gloss, full body.
  Summer: {
    rootLight: [255, 168, 60],
    rootMid: [252, 120, 18],
    rootDark: [186, 78, 14],
    topLight: [136, 220, 88],
    topMid: [80, 180, 56],
    topDark: [40, 122, 42],
    padGrass: [86, 172, 72],
    padDark: [44, 112, 50],
    soil: [126, 86, 48],
    outline: [110, 46, 10],
    light: [255, 242, 204],
    lightAmt: 0.2,
    rootScale: 1.0,
    gloss: 1.0,
    freckleAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — FAT carrot, feathery top yellowing, freckles on the skin; olive-tan
  // pad + a fallen leaf, dulled gloss, low amber light.
  Autumn: {
    rootLight: [240, 144, 56],
    rootMid: [222, 102, 28],
    rootDark: [152, 64, 18],
    topLight: [214, 206, 90],
    topMid: [160, 160, 58],
    topDark: [108, 114, 42],
    padGrass: [152, 152, 84],
    padDark: [104, 94, 50],
    soil: [120, 80, 44],
    outline: [96, 42, 14],
    light: [250, 206, 142],
    lightAmt: 0.24,
    rootScale: 1.22,
    gloss: 0.34,
    freckleAmt: 0.85,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — frost-dusted carrot (still CLEARLY orange) + a snow cap + a snow
  // drift at the base; cool blue-grey light, snowy pad.
  Winter: {
    rootLight: [238, 158, 100],
    rootMid: [214, 116, 58],
    rootDark: [150, 80, 48],
    topLight: [156, 192, 162],
    topMid: [100, 150, 114],
    topDark: [60, 104, 80],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [70, 50, 46],
    light: [200, 224, 255],
    lightAmt: 0.34,
    rootScale: 1.05,
    gloss: 0.24,
    freckleAmt: 0,
    frostAmt: 0.8,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Carrot geometry (the SAME slanted silhouette every season) ───────────────
// The carrot lies on a diagonal: tip at lower-left, shoulder (where the green
// top sprouts) at upper-right. Defined as a local axis from TIP→SHOULDER.

const TIP: [number, number] = [-15, 14];      // pointed tip, lower-left
const SHOULDER: [number, number] = [11, -7];  // crown where the top sprouts
const ROOT_HALF = 6.6;                         // half-width at the shoulder

// Pivot near the resting tip so the wobble/lean rocks the whole carrot and the
// squash anchors at the contact point (it "sits" on the pad).
const PIVOT_X = -9;
const PIVOT_Y = 13;

// Unit vector along the carrot axis (tip→shoulder) and its perpendicular.
const AXX = SHOULDER[0] - TIP[0];
const AXY = SHOULDER[1] - TIP[1];
const AXLEN = Math.hypot(AXX, AXY);
const UX = AXX / AXLEN; // along-axis unit
const UY = AXY / AXLEN;
const PX = -UY; // perpendicular unit (points "up" off the body)
const PY = UX;

/** Point at fraction f along axis (0=tip,1=shoulder), offset w perpendicular,
 *  with the body half-width scaled by `scale` (fatness). */
function onAxis(f: number, w: number): [number, number] {
  const cx = lerp(TIP[0], SHOULDER[0], f);
  const cy = lerp(TIP[1], SHOULDER[1], f);
  return [cx + PX * w, cy + PY * w];
}

/** Half-width profile along the axis: 0 at the tip, fattest near the shoulder. */
function widthAt(f: number, scale: number): number {
  const w = Math.sin(Math.min(1, f * 1.05) * Math.PI * 0.5);
  return ROOT_HALF * (0.12 + 0.88 * w) * scale;
}

/** Trace the tapered carrot root body (tip→shoulder). Same every season. */
function carrotBodyPath(ctx: CanvasRenderingContext2D, scale: number): void {
  const steps = 14;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const [x, y] = onAxis(f, widthAt(f, scale));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const [sx, sy] = onAxis(1.04, 0);
  ctx.lineTo(sx, sy);
  for (let i = steps; i >= 0; i--) {
    const f = i / steps;
    const [x, y] = onAxis(f, -widthAt(f, scale));
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Feathery green top: several fronds fanning from the shoulder toward upper-right.
const FRONDS: Array<[number, number]> = [
  // [angle in radians (from +x, up is negative), length]
  [-1.95, 15], [-1.55, 17], [-1.15, 16], [-0.78, 13.5], [-0.42, 11.5],
];

/** Draw the feathery green top. `sway` adds a small per-frond x wobble (idle). */
function carrotTop(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  const [bx, by] = onAxis(0.98, 0);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  FRONDS.forEach(([ang, len], i) => {
    const s = sway * (0.4 + i * 0.18);
    const tx = bx + Math.cos(ang) * len + s;
    const ty = by + Math.sin(ang) * len;
    const mx = bx + Math.cos(ang) * len * 0.5 + s * 0.5;
    const my = by + Math.sin(ang) * len * 0.55 - 2;
    // dark base stalk
    ctx.strokeStyle = rgb(p.topDark);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(mx, my, tx, ty);
    ctx.stroke();
    // bright frond over it
    ctx.strokeStyle = rgb(p.topMid);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(mx, my, tx, ty);
    ctx.stroke();
    // feathery leaflets along each frond
    ctx.strokeStyle = rgb(p.topLight);
    ctx.lineWidth = 0.8;
    for (let k = 1; k <= 4; k++) {
      const f = k / 5;
      const px = lerp(bx, tx, f);
      const py = lerp(by, ty, f) + Math.sin(f * Math.PI) * -1.4;
      const nrm = ang - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(nrm) * 2.2, py + Math.sin(nrm) * 2.2);
      ctx.moveTo(px, py);
      ctx.lineTo(px - Math.cos(nrm) * 2.2, py - Math.sin(nrm) * 2.2);
      ctx.stroke();
    }
    // bright leaflet tip
    ctx.fillStyle = rgb(p.topLight);
    ctx.beginPath();
    ctx.arc(tx, ty, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` (season identity) and `pose` (idle gesture). */
function paint(ctx: CanvasRenderingContext2D, raw: P, rawPose: Pose): void {
  const p = clampP(raw);
  const pose: Pose = {
    bob: safeNum(rawPose.bob),
    lean: safeNum(rawPose.lean),
    squashX: safeNum(rawPose.squashX),
    squashY: safeNum(rawPose.squashY),
  };
  const scale = p.rootScale;

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse (does NOT move with the pose) ────────────
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

    // pad snow blanket + base drift (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // a heaped drift hugging the resting tip
      ctx.fillStyle = rgba([255, 255, 255], 0.9 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(TIP[0] + 2, TIP[1] + 2.5, 6.5 * p.padSnowAmt, 3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossom on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-12, 18.8], [12, 17.8]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 0 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(ang) * 1.6, by + Math.sin(ang) * 1.1, 1.2, 0.9, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba([255, 214, 90], a);
        ctx.beginPath();
        ctx.arc(bx, by, 1.0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [206, 124, 38]],
        [13, 18.4, 0.7, [182, 70, 28]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.6, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3.4, 0);
        ctx.lineTo(3.4, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Contact shadow under the carrot (follows the lean for grounding) ─────
    const tipShift = pose.lean * 22; // how far the body leans at the far end
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.save();
    ctx.fillStyle = rgba(p.outline, 0.26 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(-1 + tipShift * 0.18, 13.5, 15 * shadowSpread, 3.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Soil smudge near the resting tip
    ctx.fillStyle = rgba(p.soil, 0.85);
    ctx.beginPath();
    ctx.ellipse(TIP[0] + 2, TIP[1] + 1, 4, 2, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: carrot top + root, under the idle pose transform ────────────
    ctx.save();
    // Pivot near the resting tip: lean rocks the carrot, squash anchors at the
    // contact, bob raises the whole body.
    ctx.translate(PIVOT_X, PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(-PIVOT_X, -PIVOT_Y);

    // Feathery green top first so the root crown overlaps their base cleanly.
    carrotTop(ctx, p, 0);

    // 1) soft dark outline pass
    ctx.save();
    ctx.lineJoin = "round";
    carrotBodyPath(ctx, scale);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.restore();

    // 2) body fill, clipped so shading stays inside the carrot
    ctx.save();
    carrotBodyPath(ctx, scale);
    ctx.clip();

    // base mid orange
    ctx.fillStyle = rgb(p.rootMid);
    ctx.fillRect(-30, -30, 60, 60);

    // light from upper-left: gradient along the perpendicular (lit upper side)
    const [lx0, ly0] = onAxis(0.5, (ROOT_HALF + 4) * scale);
    const [lx1, ly1] = onAxis(0.5, -(ROOT_HALF + 4) * scale);
    const litGrad = ctx.createLinearGradient(lx0, ly0, lx1, ly1);
    litGrad.addColorStop(0, rgb(p.rootLight));
    litGrad.addColorStop(0.5, rgb(p.rootMid));
    litGrad.addColorStop(1, rgb(p.rootDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(-30, -30, 60, 60);
    ctx.globalAlpha = 1;

    // taper darkening toward the tip
    const [tgx, tgy] = TIP;
    const [sgx, sgy] = SHOULDER;
    const tipGrad = ctx.createLinearGradient(tgx, tgy, sgx, sgy);
    tipGrad.addColorStop(0, rgba(p.rootDark, 0.55));
    tipGrad.addColorStop(0.35, rgba(p.rootDark, 0));
    ctx.fillStyle = tipGrad;
    ctx.fillRect(-30, -30, 60, 60);

    // carrot's characteristic ringed grooves across the root
    ctx.strokeStyle = rgba(p.rootDark, 0.5);
    ctx.lineWidth = 1.0;
    for (let i = 1; i <= 6; i++) {
      const f = i / 7;
      const [a0x, a0y] = onAxis(f, widthAt(f, scale) + 2);
      const [a1x, a1y] = onAxis(f, -(widthAt(f, scale) + 2));
      ctx.beginPath();
      ctx.moveTo(a0x, a0y);
      ctx.lineTo(a1x, a1y);
      ctx.stroke();
    }

    // freckles on the skin (autumn) — faint darker specks
    if (p.freckleAmt > 0.02) {
      ctx.fillStyle = rgba(p.rootDark, 0.5 * p.freckleAmt);
      const fr: Array<[number, number]> = [[0.45, 1.5], [0.6, -2], [0.72, 0.5], [0.55, 2.4]];
      fr.forEach(([f, w]) => {
        const [fx, fy] = onAxis(f, w);
        ctx.beginPath();
        ctx.arc(fx, fy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // gloss streak along the lit upper side (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.strokeStyle = rgba([255, 255, 255], 0.18 + 0.6 * p.gloss);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const [g0x, g0y] = onAxis(0.2, ROOT_HALF * 0.45 * scale);
      const [g1x, g1y] = onAxis(0.85, ROOT_HALF * 0.55 * scale);
      const [gmx, gmy] = onAxis(0.55, ROOT_HALF * 0.62 * scale);
      ctx.moveTo(g0x, g0y);
      ctx.quadraticCurveTo(gmx, gmy, g1x, g1y);
      ctx.stroke();
    }

    // frost dusting (winter) — cool pale speckle over the orange (stays orange)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([214, 232, 250], 0.26 * p.frostAmt);
      ctx.fillRect(-30, -30, 60, 60);
      ctx.fillStyle = rgba([236, 246, 255], 0.7 * p.frostAmt);
      for (let i = 1; i <= 7; i++) {
        const f = i / 8;
        const [fx, fy] = onAxis(f, (i % 2 === 0 ? 1.6 : -1.4));
        ctx.beginPath();
        ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // end clip

    // 3) snow cap on the upward side (winter) — drawn over, hugging the top edge
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.94 * a);
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const f = i / 12;
        const [x, y] = onAxis(f, widthAt(f, scale));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = 12; i >= 0; i--) {
        const f = i / 12;
        const [x, y] = onAxis(f, widthAt(f, scale) * 0.45);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      // sparkly snow crest highlights
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * a);
      [0.35, 0.6, 0.82].forEach((f) => {
        const [x, y] = onAxis(f, widthAt(f, scale) * 0.8);
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end pose transform

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

// ── Idle pose clock — two-tier occasional action ─────────────────────────────

/** Returns 0..1 progress through an action window of length `win` starting at
 *  phase offset within `period`, else −1 (at rest). Seamless because the pose
 *  built from q is zero (with zero velocity) at q=0 and q=1. */
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// A bump shape that is 0 with zero velocity at q=0 and q=1 (single hump).
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

// A sin² bump confined to the sub-window [lo,hi]: 0 (with zero velocity) at lo
// and hi, peaking at the middle. Used to place a squash precisely at lift-off
// and at landing while staying exactly 0 at the action-window edges.
function subHump(q: number, lo: number, hi: number): number {
  if (!(q > lo) || q >= hi) return 0;
  const u = (q - lo) / (hi - lo);
  const s = Math.sin(Math.PI * u);
  return s * s;
}

// The pull-up envelope, 0..1: smootherstep UP over the first `LIFT_RAMP`, a flat
// HANG at 1, then smootherstep DOWN over the last `LIFT_RAMP`. Smootherstep has
// zero slope at its endpoints, so this is 0 with zero velocity at q=0 and q=1
// (and reaches a clean held plateau in between — the "hang").
const LIFT_RAMP = 0.34;
function lift(q: number): number {
  if (!(q > 0) || q >= 1) return 0;
  if (q < LIFT_RAMP) return smoother(q / LIFT_RAMP); // 0→1, flat at q=0
  if (q > 1 - LIFT_RAMP) return smoother((1 - q) / LIFT_RAMP); // 1→0, flat at q=1
  return 1; // hang
}

// ── Shared RARE-window clock — the PULL-UP-FROM-THE-SOIL event ───────────────
// COMMON fires every 6s at phase 0 (win 1.0s) → windows t mod 6 ∈ [0,1), i.e.
// t mod 18 ∈ {[0,1),[6,7),[12,13)} since 18 = 3·6. The RARE pull-up uses
// actionQ(t,18,2,3): with phase 3 the window is where (t+3) mod 18 < 2, i.e.
// t mod 18 ∈ [15,17) — a 2s window that lands cleanly BETWEEN the COMMON beats
// (verified: never overlaps any [.,.+1) common window) and finishes before the
// 18≡0 seam where COMMON restarts from REST. One source of truth so the carrot's
// pose (poseFromClock) and the soil-fleck overlay (anim) stay in lockstep.
const PULL_PERIOD = 18.0;
const PULL_WIN = 2.0;
const PULL_PHASE = 3.0;
const PULL_LIFT_PX = 6.5; // how far (design-px) the carrot rises out of the soil

/** Progress 0..1 through the pull-up window, else −1 (carrot fully seated). */
function pullQ(t: number): number {
  return actionQ(t, PULL_PERIOD, PULL_WIN, PULL_PHASE);
}

/** Build the idle pose from the wall clock. Two in-character root-veg beats,
 *  NEITHER a bounce:
 *    COMMON — a TOP-FLICK: a small lean sway that (pivoting at the tip) rustles
 *             the feathery top in a breeze every ~6s.
 *    RARE   — a PULL-UP-FROM-THE-SOIL: the carrot is tugged up, hangs, and
 *             settles with a soil-shift squash on landing every ~18s.
 *  Each factor is 0 with zero velocity at its window edges → seamless loop. */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: TOP-FLICK — the feathery top rustles in a breeze (~6s, win 1.0s) ──
  // A tiny lean about the resting tip; since the leaves are at the far end the
  // SWAY IS CONCENTRATED AT THE TOP. `env=sin(πq)` and the oscillation `sin(4πq)`
  // BOTH vanish at q=0 and q=1, so their product is 0 with zero velocity at the
  // edges — two soft flicks (left/right) that fade calmly to rest.
  const qC = actionQ(t, 6.0, 1.0, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0 envelope, zero at edges
    pose.lean += 0.058 * env * Math.sin(qC * Math.PI * 4); // two gentle flicks
    // a whisper of settle at the base so the top, not the root, reads as moving
    pose.squashX += 0.012 * hump(qC);
    pose.squashY += -0.012 * hump(qC);
  }

  // ── RARE: PULL-UP-FROM-THE-SOIL (~18s, win 2.0s) — NOT a hop ──
  // The carrot lifts up out of the ground, hangs, then settles. `lift` rises,
  // holds, and lowers (0 + zero velocity at both edges). A small stretch as it is
  // tugged free (lift-off sub-window) and a soil-shift squash when it sets back
  // down (landing sub-window) — both pinned to 0 at the window edges.
  const qP = pullQ(t);
  if (qP >= 0) {
    const up = lift(qP); // 0..1..(hang)..0 pull-up envelope
    pose.bob += -PULL_LIFT_PX * up; // rise up out of the soil and settle back

    // tugged-free stretch as it breaks loose (first third) — taller + narrower
    const off = subHump(qP, 0.0, LIFT_RAMP);
    pose.squashY += 0.06 * off;
    pose.squashX += -0.045 * off;

    // soil-shift squash on landing (last third) — squat + spread as it reseats
    const landWin = subHump(qP, 1 - LIFT_RAMP, 1.0);
    pose.squashY += -0.07 * landWin;
    pose.squashX += 0.06 * landWin;

    // a faint lean wiggle while it hangs (gated to 0 + zero velocity at edges)
    pose.lean += 0.03 * Math.sin(Math.PI * qP) * Math.sin(qP * Math.PI * 4);
  }

  return pose;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const tt = Number.isFinite(t) ? t : 0;
    paint(ctx, SP[season], poseFromClock(tt));

    // RARE PULL-UP soil flecks (all seasons) — a couple of little soil crumbs
    // kick up at the base as the carrot is tugged free, then fall back. Additive
    // overlay only; gated by the SAME `lift` envelope as the pose, so the flecks
    // are exactly 0 at the window edges (and therefore at t=0) and peak with the
    // hang. Soil-coloured (from P), enveloped in alpha — never touches the root.
    const up = lift(pullQ(tt));
    if (up > 0.001) {
      const soil = SP[season].soil;
      ctx.save();
      try {
        ctx.globalAlpha = 1;
        // Each fleck: a base point near the resting tip, a small upward arc whose
        // height scales with the pull, and an alpha that fades in and back out.
        const flecks: Array<[number, number, number, number]> = [
          // [baseX, baseY, sideways drift, arc height]
          [TIP[0] + 1, TIP[1] + 1, -3.2, 5.5],
          [TIP[0] + 5, TIP[1] + 2, 2.6, 4.2],
          [TIP[0] - 2, TIP[1] + 2.5, -1.0, 6.4],
        ];
        flecks.forEach(([fx, fy, drift, arc], i) => {
          const a = clamp01(up) * (0.7 - i * 0.12);
          const x = fx + drift * up;
          const y = fy - arc * up; // rides up with the lift, settles back down
          ctx.fillStyle = rgba(soil, a);
          ctx.beginPath();
          ctx.arc(x, y, 1.0 - i * 0.18, 0, Math.PI * 2);
          ctx.fill();
        });
      } finally {
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Light additive season micro-sparkle (dressing only — never the subject's
    // own colour/brightness). Kept tiny so the POSE action is the star.
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Winter") {
        const seeds: Array<[number, number, number]> = [
          [-10, 0.0, 1.0], [4, 0.4, 0.9], [10, 0.7, 0.8], [-3, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((tt / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else if (season === "Spring") {
        // a couple of drifting petals
        ctx.fillStyle = "rgba(255,240,248,0.9)";
        for (let i = 0; i < 2; i++) {
          const prog = ((tt / 4.0 + i * 0.5) % 1 + 1) % 1;
          const px = (i === 0 ? -10 : 9) + Math.sin(prog * Math.PI * 2) * 3;
          const py = -18 + prog * 34;
          ctx.globalAlpha = 0.35 + 0.4 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.ellipse(px, py, 1.4, 0.9, prog * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (season === "Autumn") {
        // one slow tumbling leaf
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -16 + prog * 32;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.fillStyle = "rgba(196,96,32,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the bounce + glossy orange is the show.
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Forward season→season transitions (seamless endpoints) ───────────────────

function makeTransition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, p: number) => void {
  const from = SP[SEASON_NAMES[fromIdx]];
  const to = SP[SEASON_NAMES[fromIdx + 1]];
  return (ctx, pp) => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(from, to, k), REST);
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
