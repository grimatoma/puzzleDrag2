// Seasonal art for the OCTOPUS aquatic tile (`tile_fish_ink`).
//
// A small, cute OCTOPUS: a rounded bulbous mantle/head (deep blue-indigo) with
// two big friendly round eyes and a fan of ~5 curling tentacles draped down onto
// a still WATER pad (NOT grass), each tentacle dotted with little paler suckers.
// A faint ink wisp curls into the water beside it. The board label is "Octopus";
// the tile yields the resource "ink".
//
// The SAME octopus silhouette is drawn every season — only colour, the water /
// ice treatment, and the small dressing (blossom petal, ink puff, fallen leaf,
// frost) change. The tentacle CURL may undulate in the idle loop, but the
// mantle / outline is constant. This is enforced by a single parameterized
// `paint(ctx, p, bob, wave)`:
//   - draw(season)      = paint(ctx, SP[season], 0, 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t), waveAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0, 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob and
// the tentacle wave both use forms that are 0 at t=0 with zero velocity, so the
// idle hands off cleanly from the still.
//
// PALETTE LOCK: the octopus stays deep blue-indigo every season. Winter FREEZES
// the water pad to pale blue-white ICE (iceAmt) + frost sparkle; the indigo
// octopus stays clearly visible under a light frost dusting — NO white-out.
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
  mantleLight: RGB; // lit upper-left dome of the mantle/head
  mantleMid: RGB; // body tone of the indigo mantle / tentacles
  mantleDeep: RGB; // shaded underside / deep crevices
  bellyLit: RGB; // pale eye-ring / belly highlight
  sucker: RGB; // paler mauve suckers along the tentacles
  eye: RGB; // dark pupil / eye shading
  ink: RGB; // the drifting ink wisp colour
  water: RGB; // top surface of the water pad
  waterDeep: RGB; // shaded underside / depth of the water
  ice: RGB; // pale blue-white ice tone (winter water)
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  vividness: number; // 0..1 how saturated the indigo reads (peak = summer)
  gloss: number; // 0..1 wet specular gloss-streak strength on the mantle
  inkAmt: number; // 0..1 how prominent the resting ink wisp is on the pad
  iceAmt: number; // 0..1 the water pad frozen to pale blue-white ice (winter)
  frostAmt: number; // 0..1 cool frost dusting on the octopus (winter)
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
    mantleLight: lerpRGB(a.mantleLight, b.mantleLight, t),
    mantleMid: lerpRGB(a.mantleMid, b.mantleMid, t),
    mantleDeep: lerpRGB(a.mantleDeep, b.mantleDeep, t),
    bellyLit: lerpRGB(a.bellyLit, b.bellyLit, t),
    sucker: lerpRGB(a.sucker, b.sucker, t),
    eye: lerpRGB(a.eye, b.eye, t),
    ink: lerpRGB(a.ink, b.ink, t),
    water: lerpRGB(a.water, b.water, t),
    waterDeep: lerpRGB(a.waterDeep, b.waterDeep, t),
    ice: lerpRGB(a.ice, b.ice, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    vividness: lerp(a.vividness, b.vividness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    inkAmt: lerp(a.inkAmt, b.inkAmt, t),
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
    inkAmt: clamp01(p.inkAmt),
    iceAmt: clamp01(p.iceAmt),
    frostAmt: clamp01(p.frostAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// OCTOPUS STAYS DEEP BLUE-INDIGO every season (palette lock). Only the water /
// ice, light, vividness, and pad dressing change between seasons.
//
// Palette anchors (from the brief):
//   mantle light ~ [86,76,124]   mantle mid ~ [58,51,88] (0x3a3358)
//   mantle deep  ~ [22,18,40] (0x161228)   belly/eye-ring ~ [150,140,180]
//   ink wisp     ~ [42,36,64] (0x2a2440)   suckers ~ [150,120,160]

// Anchors reused verbatim across seasons so the locked tones stay identical.
const MANTLE_DEEP: RGB = [22, 18, 40]; // 0x161228
const EYE_DARK: RGB = [18, 14, 32];
const INK_WISP: RGB = [42, 36, 64]; // 0x2a2440

const SP: Record<SeasonName, P> = {
  // Spring — fresh indigo; blue dewy water; a tiny floating blossom petal.
  Spring: {
    mantleLight: [92, 82, 132],
    mantleMid: [62, 54, 94],
    mantleDeep: MANTLE_DEEP,
    bellyLit: [156, 146, 186],
    sucker: [156, 126, 166],
    eye: EYE_DARK,
    ink: INK_WISP,
    water: [120, 196, 230],
    waterDeep: [66, 138, 190],
    ice: [222, 238, 248],
    outline: [20, 16, 34],
    light: [232, 244, 250],
    lightAmt: 0.16,
    vividness: 0.7,
    gloss: 0.45,
    inkAmt: 0.3,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK saturated purple-indigo; bright water; a small ink puff.
  Summer: {
    mantleLight: [98, 84, 148],
    mantleMid: [66, 52, 108],
    mantleDeep: [26, 18, 48],
    bellyLit: [162, 150, 198],
    sucker: [168, 132, 178],
    eye: EYE_DARK,
    ink: [40, 32, 64],
    water: [70, 178, 232],
    waterDeep: [34, 118, 188],
    ice: [222, 238, 248],
    outline: [20, 14, 38],
    light: [255, 242, 208],
    lightAmt: 0.18,
    vividness: 1.0,
    gloss: 0.95,
    inkAmt: 0.7,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — duller mauve-indigo; olive-tinged water + a floating fallen leaf.
  Autumn: {
    mantleLight: [96, 84, 116],
    mantleMid: [70, 60, 86],
    mantleDeep: [30, 24, 42],
    bellyLit: [156, 146, 168],
    sucker: [158, 132, 158],
    eye: [28, 24, 36],
    ink: [48, 42, 60],
    water: [120, 152, 130],
    waterDeep: [78, 108, 92],
    ice: [222, 238, 248],
    outline: [30, 24, 32],
    light: [248, 210, 150],
    lightAmt: 0.2,
    vividness: 0.55,
    gloss: 0.4,
    inkAmt: 0.32,
    iceAmt: 0,
    frostAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — water FROZEN to pale blue-white ice + frost sparkle; a little frost
  // on the octopus; the indigo body stays clearly visible; cool light.
  Winter: {
    mantleLight: [90, 82, 128],
    mantleMid: [60, 54, 94],
    mantleDeep: [24, 20, 44],
    bellyLit: [158, 150, 190],
    sucker: [154, 128, 166],
    eye: [26, 22, 40],
    ink: [46, 42, 66],
    water: [182, 210, 226],
    waterDeep: [136, 170, 196],
    ice: [226, 240, 250],
    outline: [28, 26, 44],
    light: [206, 226, 252],
    lightAmt: 0.3,
    vividness: 0.6,
    gloss: 0.3,
    inkAmt: 0.22,
    iceAmt: 0.95,
    frostAmt: 0.7,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Octopus geometry (the SAME silhouette every season) ──────────────────────
// A rounded bulbous mantle centred a little above the pad, with a fan of curling
// tentacles draped down onto the water. Origin-centered; light from upper-left.

const HEAD_CX = -1; // mantle centre x
const HEAD_CY = -2; // mantle centre y (resting; bob added on top)
const HEAD_RX = 11.5; // mantle half-width
const HEAD_RY = 12.5; // mantle half-height (taller than wide → bulbous dome)

// Tentacle roots fan along the lower rim of the mantle. Each entry is the root
// angle along the mantle ellipse and a base reach/direction; the SAME set every
// season so the silhouette is locked. The CURL of the tip animates via `wave`.
type Tentacle = {
  rootA: number; // angle around the mantle rim (radians, canvas y-down)
  reach: number; // how far the tentacle extends
  curl: number; // base sideways curl of the tip (design px)
  phase: number; // wave phase offset so tips don't undulate in lock-step
  width: number; // base half-thickness near the root
};

const TENTACLES: Tentacle[] = [
  { rootA: Math.PI * 0.62, reach: 15.5, curl: -4.2, phase: 0.0, width: 2.7 }, // far left
  { rootA: Math.PI * 0.74, reach: 17.5, curl: -2.2, phase: 0.9, width: 3.0 },
  { rootA: Math.PI * 0.88, reach: 18.5, curl: 0.6, phase: 1.7, width: 3.1 }, // centre
  { rootA: Math.PI * 1.04, reach: 17.5, curl: 2.6, phase: 2.5, width: 3.0 },
  { rootA: Math.PI * 1.18, reach: 15.5, curl: 4.4, phase: 3.3, width: 2.7 }, // far right
];

/** Where a tentacle root sits on the mantle rim (origin-centered, +bob). */
function tentacleRoot(t: Tentacle, bob: number): [number, number] {
  return [
    HEAD_CX + Math.cos(t.rootA) * HEAD_RX * 0.92,
    HEAD_CY + bob + Math.sin(t.rootA) * HEAD_RY * 0.86,
  ];
}

/** The drape point of a tentacle tip (origin-centered, +bob). `wave` curls the
 *  tip seamlessly in the idle; wave=0 is the rest pose. */
function tentacleTip(t: Tentacle, bob: number, wave: number): [number, number] {
  const [rx, ry] = tentacleRoot(t, bob);
  const undulate = Math.sin(wave + t.phase) * 1.6; // seamless tip sway
  return [
    rx + t.curl + undulate,
    ry + t.reach,
  ];
}

/** Trace one tentacle as a tapering curved blob (root → curled tip → back).
 *  Same construction every season; only the tip curl shifts in idle. */
function tentaclePath(ctx: CanvasRenderingContext2D, t: Tentacle, bob: number, wave: number): void {
  const [rx, ry] = tentacleRoot(t, bob);
  const [tx, ty] = tentacleTip(t, bob, wave);
  // a mid control point that bows the tentacle outward then curls the tip in
  const midX = lerp(rx, tx, 0.5) + t.curl * 0.5;
  const midY = lerp(ry, ty, 0.5) + 1.2;
  const w0 = t.width; // thick at the root
  const w1 = 0.7; // thin at the tip
  // perpendicular-ish offsets to give the limb thickness on each side
  ctx.beginPath();
  ctx.moveTo(rx - w0, ry);
  ctx.quadraticCurveTo(midX - w1 * 1.6, midY, tx - w1, ty);
  // round the tip
  ctx.quadraticCurveTo(tx, ty + w1 * 1.6, tx + w1, ty);
  ctx.quadraticCurveTo(midX + w1 * 1.6, midY, rx + w0, ry);
  ctx.closePath();
}

/** Small paler suckers running down the underside of a tentacle. */
function tentacleSuckers(
  ctx: CanvasRenderingContext2D,
  t: Tentacle,
  bob: number,
  wave: number,
  col: RGB,
): void {
  const [rx, ry] = tentacleRoot(t, bob);
  const [tx, ty] = tentacleTip(t, bob, wave);
  const midX = lerp(rx, tx, 0.5) + t.curl * 0.5;
  const midY = lerp(ry, ty, 0.5) + 1.2;
  ctx.fillStyle = rgba(col, 0.9);
  const n = 4;
  for (let i = 1; i <= n; i++) {
    const u = i / (n + 1);
    // quadratic Bézier sample of the centre-line
    const omu = 1 - u;
    const cx = omu * omu * rx + 2 * omu * u * midX + u * u * tx;
    const cy = omu * omu * ry + 2 * omu * u * midY + u * u * ty;
    const r = lerp(1.0, 0.45, u);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p`, `bob`, and `wave`. `wave` curls the tentacle
 *  tips in the idle (0 = rest pose; the mantle/outline never changes). */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number, wave = 0): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: a still WATER ellipse (bluish reflective), x∈[−18,+18], y≈+19 ────
    // soft contact shadow lower-right
    ctx.fillStyle = rgba(p.waterDeep, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // deep water underside
    ctx.fillStyle = rgb(p.waterDeep);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // water surface (a soft top→deep vertical gradient)
    const waterGrad = ctx.createLinearGradient(0, 14, 0, 24);
    waterGrad.addColorStop(0, rgb(p.water));
    waterGrad.addColorStop(1, rgb(p.waterDeep));
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // surface reflection band + still-water glints (clipped to the pad)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.clip();
    const wg = ctx.createLinearGradient(-14, 14, 10, 22);
    wg.addColorStop(0, rgba([255, 255, 255], 0.2 * (1 - 0.4 * p.iceAmt)));
    wg.addColorStop(0.5, rgba([255, 255, 255], 0.04));
    wg.addColorStop(1, rgba(p.waterDeep, 0.18));
    ctx.fillStyle = wg;
    ctx.fillRect(-18, 13, 36, 12);
    // a couple of gentle ripple lines on the surface
    ctx.strokeStyle = rgba([255, 255, 255], 0.2 * (1 - 0.5 * p.iceAmt));
    ctx.lineWidth = 0.9;
    [16.4, 18.6, 20.6].forEach((ry, i) => {
      ctx.beginPath();
      ctx.moveTo(-13 + i, ry);
      ctx.quadraticCurveTo(-2, ry - 0.8, 12 - i, ry + 0.4);
      ctx.stroke();
    });
    ctx.restore();

    // ── Winter ice: the water frozen to pale blue-white, with frost sparkle ──
    if (p.iceAmt > 0.01) {
      const a = p.iceAmt;
      // milky ice sheet over the water
      ctx.fillStyle = rgba(p.ice, 0.9 * a);
      ctx.beginPath();
      ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // a darker rim so the ice reads as a frozen disc, not a flat fill
      ctx.strokeStyle = rgba(p.waterDeep, 0.5 * a);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 19, 17.6, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // angular crack lines across the ice
      ctx.strokeStyle = rgba([255, 255, 255], 0.5 * a);
      ctx.lineWidth = 0.8;
      const cracks: Array<[number, number, number, number]> = [
        [-12, 18, -3, 20], [-2, 17, 9, 20.5], [4, 21, 13, 18.5],
      ];
      cracks.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      // frost sparkle dots
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * a);
      const sparks: Array<[number, number]> = [
        [-10, 18], [5, 17.6], [11, 19.2], [-4, 20.4], [1, 18.2],
      ];
      sparks.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // floating blossom petal on the water (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const px = -13;
      const py = 18.6;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(0.4);
      ctx.fillStyle = rgba([255, 232, 246], 0.95 * a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 250, 252], 0.8 * a);
      ctx.beginPath();
      ctx.ellipse(-0.6, -0.3, 1.4, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // a tiny ripple ring around the petal
      ctx.strokeStyle = rgba([255, 255, 255], 0.3 * a);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(px, py + 0.3, 3.8, 1.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // floating fallen leaf on the water (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const lx = 13;
      const ly = 18.4;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(0.6);
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
      ctx.strokeStyle = rgba([255, 255, 255], 0.22 * a);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(lx, ly + 0.4, 4.4, 1.9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── Resting ink wisp curling into the water beside the octopus ───────────
    // (a soft drifting smudge; idle re-draws it travelling/fading on top.)
    if (p.inkAmt > 0.01) {
      const a = p.inkAmt;
      ctx.save();
      ctx.globalAlpha = 0.5 * a * (1 - 0.5 * p.iceAmt);
      ctx.strokeStyle = rgb(p.ink);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(10.5, 12);
      ctx.quadraticCurveTo(13.5, 14, 12.5, 16.4);
      ctx.quadraticCurveTo(11.6, 18.4, 13.4, 19.4);
      ctx.stroke();
      // a little ink cloud where it meets the water
      ctx.globalAlpha = 0.32 * a * (1 - 0.5 * p.iceAmt);
      ctx.fillStyle = rgb(p.ink);
      ctx.beginPath();
      ctx.ellipse(13.2, 19.6, 3.2, 1.7, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Contact shadow of the octopus ON the water ──────────────────────────
    ctx.fillStyle = rgba(p.outline, 0.26 * (1 - 0.5 * p.iceAmt));
    ctx.beginPath();
    ctx.ellipse(HEAD_CX + 1.5, 16.5 + bob * 0.4, 13, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the octopus (SAME silhouette every season) ─────────────────
    // 1) Tentacles, drawn FIRST so the mantle overlaps their roots. Outline
    //    pass (fat) then fill + suckers, per tentacle.
    for (const t of TENTACLES) {
      // outline rim
      ctx.save();
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = rgb(p.outline);
      tentaclePath(ctx, t, bob, wave);
      ctx.stroke();
      ctx.restore();
      // fill
      tentaclePath(ctx, t, bob, wave);
      ctx.fillStyle = rgb(p.mantleMid);
      ctx.fill();
      // a darker shaded underside on each limb (clip + lower-biased wash)
      ctx.save();
      tentaclePath(ctx, t, bob, wave);
      ctx.clip();
      const [rx, ry] = tentacleRoot(t, bob);
      const tg = ctx.createLinearGradient(rx, ry - 4, rx, ry + t.reach + 2);
      tg.addColorStop(0, rgba(p.mantleMid, 0));
      tg.addColorStop(1, rgba(p.mantleDeep, 0.55));
      ctx.fillStyle = tg;
      ctx.fillRect(rx - 8, ry - 6, 16, t.reach + 10);
      ctx.restore();
      // suckers down the limb
      tentacleSuckers(ctx, t, bob, wave, p.sucker);
    }

    // 2) Mantle / head — bulbous indigo dome (the locked identity shape).
    const hy = HEAD_CY + bob;
    // outline pass (a slightly larger dome under the fill)
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(HEAD_CX, hy, HEAD_RX + 1.1, HEAD_RY + 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // base mid fill
    ctx.fillStyle = rgb(p.mantleMid);
    ctx.beginPath();
    ctx.ellipse(HEAD_CX, hy, HEAD_RX, HEAD_RY, 0, 0, Math.PI * 2);
    ctx.fill();

    // cel shading — clip to the mantle, then layer deep + lit washes.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(HEAD_CX, hy, HEAD_RX, HEAD_RY, 0, 0, Math.PI * 2);
    ctx.clip();

    // shaded lower-right crescent (deep indigo)
    ctx.fillStyle = rgb(p.mantleDeep);
    ctx.beginPath();
    ctx.ellipse(HEAD_CX + 4.5, hy + 5.5, HEAD_RX, HEAD_RY, 0, 0, Math.PI * 2);
    ctx.fill();
    // restore the mid tone over the centre so the deep stays a rim crescent
    ctx.fillStyle = rgb(p.mantleMid);
    ctx.beginPath();
    ctx.ellipse(HEAD_CX - 0.5, hy - 1.5, HEAD_RX - 1.5, HEAD_RY - 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // lit upper-left dome highlight (saturation scales with vividness)
    const lit = ctx.createRadialGradient(
      HEAD_CX - 4.5, hy - 6.5, 1.5,
      HEAD_CX - 4.5, hy - 6.5, HEAD_RX + 5,
    );
    lit.addColorStop(0, rgba(p.mantleLight, 0.55 + 0.35 * p.vividness));
    lit.addColorStop(0.55, rgba(p.mantleLight, 0.2 * p.vividness));
    lit.addColorStop(1, rgba(p.mantleLight, 0));
    ctx.fillStyle = lit;
    ctx.beginPath();
    ctx.ellipse(HEAD_CX, hy, HEAD_RX, HEAD_RY, 0, 0, Math.PI * 2);
    ctx.fill();

    // wet gloss streak high on the dome (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.18 + 0.4 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(HEAD_CX - 4.5, hy - 7.5, 3.6, 2.0, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // a soft brow shadow above the eyes to seat them in the dome
    ctx.fillStyle = rgba(p.mantleDeep, 0.35);
    ctx.beginPath();
    ctx.ellipse(HEAD_CX, hy + 2.5, HEAD_RX - 2, 4.5, 0, 0, Math.PI);
    ctx.fill();

    // frost dusting on the upward dome (winter) — cool speckle, stays indigo
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([214, 232, 250], 0.22 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(HEAD_CX - 1, hy - 6, HEAD_RX - 1.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([238, 248, 255], 0.7 * p.frostAmt);
      const fp: Array<[number, number]> = [
        [HEAD_CX - 5, hy - 7], [HEAD_CX + 1, hy - 9], [HEAD_CX + 5, hy - 5],
        [HEAD_CX - 7, hy - 2], [HEAD_CX + 6, hy + 1],
      ];
      fp.forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end mantle clip

    // 3) Eyes — two big friendly round eyes with a pale ring, on the lower dome.
    const eyeY = hy + 1.5;
    const eyeDX = 4.6;
    const eyeR = 3.5;
    for (const sx of [-1, 1]) {
      const ex = HEAD_CX + sx * eyeDX;
      // pale eye-ring / sclera
      ctx.fillStyle = rgb(p.bellyLit);
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      // outline ring
      ctx.strokeStyle = rgba(p.outline, 0.55);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
      ctx.stroke();
      // dark pupil (looking slightly down-left, friendly)
      ctx.fillStyle = rgb(p.eye);
      ctx.beginPath();
      ctx.arc(ex - 0.5, eyeY + 0.4, 2.0, 0, Math.PI * 2);
      ctx.fill();
      // catch-light glint (tiny constant dressing, not a flash)
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(ex - 1.1, eyeY - 0.5, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lgrad = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
      lgrad.addColorStop(0, rgba(p.light, p.lightAmt));
      lgrad.addColorStop(1, rgba(p.light, p.lightAmt * 0.25));
      ctx.fillStyle = lgrad;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Idle bob + tentacle wave (seamless, zero-velocity at t=0) ────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.7, w = 1.3): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// Tentacle undulation phase. Built from (1-cos) so the per-tip sin starts at its
// rest value with zero rate of change at t=0 → the tips hand off from the still
// without a jump. (Each tip adds its own constant `phase` inside tentacleTip.)
function waveAt(t: number, w = 1.1): number {
  return Math.PI * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0, 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    const wave = waveAt(t);
    // The body bobs gently; the tentacle tips undulate seamlessly.
    paint(ctx, SP[season], bob, wave);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      const sp = SP[season];

      // Shared: a gentle water-ripple shimmer travelling across the pad surface.
      const ripPhase = (t * 0.35) % 1;
      const iceMute = 1 - 0.55 * clamp01(sp.iceAmt);
      ctx.strokeStyle = `rgba(255,255,255,${(0.12 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.3))) * iceMute})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const ry = 16.5 + ripPhase * 5.5;
      ctx.moveTo(-13, ry);
      ctx.quadraticCurveTo(-1, ry - 0.9 - Math.sin(t * 1.7) * 0.4, 12, ry + 0.4);
      ctx.stroke();

      // Shared: a soft eye-glint pulse on both eyes.
      const gl = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.2));
      const eyeY = HEAD_CY + bob + 1.5;
      for (const sx of [-1, 1]) {
        const ex = HEAD_CX + sx * 4.6;
        ctx.fillStyle = `rgba(255,255,255,${gl * 0.7})`;
        ctx.beginPath();
        ctx.arc(ex - 1.1, eyeY - 0.5, 0.5 + 0.3 * gl, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shared: a slow ink wisp drifting up off the pad and fading (loops).
      if (sp.inkAmt > 0.01) {
        const prog = (t / 4.0) % 1; // 0..1 over ~4s
        const fade = Math.sin(prog * Math.PI); // up then down
        const wx = 13.2 + Math.sin(prog * Math.PI * 2) * 1.4;
        const wy = 19.4 - prog * 7.5; // rises off the water
        ctx.globalAlpha = 0.4 * fade * sp.inkAmt * iceMute;
        ctx.fillStyle = rgb(sp.ink);
        ctx.beginPath();
        ctx.ellipse(wx, wy, 2.6 - prog * 1.2, 1.8 - prog * 0.7, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // a thin curling tail trailing back to the water
        ctx.globalAlpha = 0.3 * fade * sp.inkAmt * iceMute;
        ctx.strokeStyle = rgb(sp.ink);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(13.2, 19.4);
        ctx.quadraticCurveTo(13.8 + Math.sin(t * 1.4), (19.4 + wy) / 2, wx, wy);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (season === "Spring") {
        // a soft dew glint travelling the mantle
        const g = 0.2 + 0.24 * (0.5 + 0.5 * Math.sin(t * 2.0));
        const u = 0.5 + 0.5 * Math.sin(t * 0.6);
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(HEAD_CX - 5 + u * 3, HEAD_CY + bob - 6, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // a bright specular glint sweeping the dome
        const prog = (t * 0.5) % 1;
        const gx = HEAD_CX - 5 + prog * 9;
        const gy = HEAD_CY + bob - 7 + prog * 4;
        const sh = ctx.createRadialGradient(gx, gy, 0.4, gx, gy, 5);
        sh.addColorStop(0, "rgba(220,210,255,0.7)");
        sh.addColorStop(0.5, "rgba(180,170,240,0.3)");
        sh.addColorStop(1, "rgba(180,170,240,0)");
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.ellipse(gx, gy, 5, 3.0, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // the floating leaf drifts gently on the pad
        const dx = 13 + Math.sin(t * 0.5) * 2.2;
        const dy = 18.4 + Math.sin(t * 0.7 + 1) * 0.6;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(0.6 + Math.sin(t * 0.4) * 0.25);
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
        // Winter — a cold sheen on the ice + a drifting snowflake
        const prog = ((t / 3.2) % 1 + 1) % 1;
        const fy = -22 + prog * 40;
        const fx = -4 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(prog * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = "rgba(214,234,252,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 19, 11, 3.0, 0, 0, Math.PI * 2);
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
