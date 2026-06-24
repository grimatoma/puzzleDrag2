// BOLD seasonal art for the BLACKBERRY fruit tile (`tile_fruit_blackberry`).
//
// The harvested FRUIT only — never a bush. A small cluster of 3–5 plump
// aggregate berries (each berry built from little round drupelets) resting low
// on a short sprig with ONE leaf, sitting low-centre on a grassy pad.
//
// SAME drupelet-cluster silhouette every season (identity-safe), but the seasons
// swing HARD on colour + a real seasonal prop (blossom / fallen leaf / snow cap
// + base snow), and the idle is an in-character CLUSTER beat (a bunch of berries,
// not a hopping fruit):
//
//   IDLE COMMON  (~6s, win ~1.4s): a gentle CLUSTER JIGGLE — a soft squash
//       breathing as the bunch of drupelets settles (a small widen + shorten with
//       a tiny jiggle on top). Pose-only, no lean, zero velocity at the window
//       edges (seamless).
//   IDLE RARE    (~18s, win ~1.5s): a BERRY-PLUMP — the whole cluster swells and
//       tightens (drupelets plump up: squashX+squashY expand together ~16%), lifts
//       a hair, then settles. In Spring/Summer a single DEW DROPLET beads at the
//       crown and slides off the right, drawn as an additive overlay enveloped to
//       0 at the window edges. The plump pulse is pose-only and reliable.
//
// Architecture mirrors pepper.bold.ts: a single parameterized `paint(ctx, p, pose)`
// where `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash). Because every season is the
// same paint with tweened P, transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop.
//
// PALETTE LOCK: the berries go green → glossy black with ripeness while keeping
// the drupelet cluster shape. Origin-centered in the −24..+24 design box (actions
// may paint outside it), light from upper-left, flat cel-shaded with a soft dark
// outline. Pure Canvas-2D vector drawing — never throws, clamps everything,
// save/restore.  (grep token: fruit/blackberry)

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  berryLight: RGB;   // lit face of a drupelet
  berryMid: RGB;     // body tone of the berry
  berryDark: RGB;    // shadowed drupelets / underside
  leafLight: RGB;    // lit face of the single sprig leaf
  leafMid: RGB;      // leaf body
  leafDark: RGB;     // leaf shade / vein
  sprig: RGB;        // short woody sprig / stem
  padGrass: RGB;     // top of the grass pad
  padDark: RGB;      // shaded pad underside
  soil: RGB;         // contact / base soil under the cluster
  outline: RGB;      // soft dark outline tint
  light: RGB;        // ambient light tint laid over the whole tile
  lightAmt: number;  // 0..1 strength of the ambient light wash
  gloss: number;     // 0..1 specular gloss-streak strength on the drupelets
  sunken: number;    // 0..1 overripe sunken-berry darkening (autumn)
  frostAmt: number;  // 0..1 cool frost dusting on the berries (winter)
  snowCapAmt: number; // 0..1 snow on the top of the cluster (winter)
  padSnowAmt: number; // 0..1 snow blanket at the base / on the pad (winter)
  blossomAmt: number; // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // crown sway, radians (rock side to side)
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
    berryLight: lerpRGB(a.berryLight, b.berryLight, t),
    berryMid: lerpRGB(a.berryMid, b.berryMid, t),
    berryDark: lerpRGB(a.berryDark, b.berryDark, t),
    leafLight: lerpRGB(a.leafLight, b.leafLight, t),
    leafMid: lerpRGB(a.leafMid, b.leafMid, t),
    leafDark: lerpRGB(a.leafDark, b.leafDark, t),
    sprig: lerpRGB(a.sprig, b.sprig, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    sunken: lerp(a.sunken, b.sunken, t),
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
    sunken: clamp01(p.sunken),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// ── Per-season params — pushed HARD ──────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — clearly GREEN unripe berries, matte; dewy lime pad + a prominent
  // blossom; cool-bright light.
  Spring: {
    berryLight: [196, 224, 118],
    berryMid: [130, 184, 72],
    berryDark: [82, 132, 54],
    leafLight: [150, 210, 96],
    leafMid: [96, 168, 64],
    leafDark: [52, 112, 44],
    sprig: [120, 150, 70],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [44, 70, 34],
    light: [232, 246, 220],
    lightAmt: 0.18,
    gloss: 0.14,
    sunken: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK. Plump GLOSSY BLACK ripe berries with bright highlights;
  // saturated mid-green leaf + pad; warm light, max gloss.
  Summer: {
    berryLight: [96, 64, 108],
    berryMid: [40, 24, 52],
    berryDark: [14, 8, 20],
    leafLight: [120, 196, 78],
    leafMid: [70, 150, 54],
    leafDark: [38, 98, 40],
    sprig: [110, 86, 50],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [12, 8, 18],
    light: [255, 242, 206],
    lightAmt: 0.2,
    gloss: 1.0,
    sunken: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — OVERRIPE very dark berries (sunken/matte); the leaf reddening hard;
  // olive-tan browning pad with a fallen leaf; amber light.
  Autumn: {
    berryLight: [62, 38, 58],
    berryMid: [28, 16, 30],
    berryDark: [12, 6, 14],
    leafLight: [212, 122, 52],
    leafMid: [172, 76, 36],
    leafDark: [104, 40, 26],
    sprig: [128, 92, 48],
    padGrass: [156, 150, 84],
    padDark: [108, 92, 50],
    soil: [120, 80, 44],
    outline: [22, 12, 20],
    light: [250, 204, 140],
    lightAmt: 0.24,
    gloss: 0.3,
    sunken: 0.9,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; FROST-DUSTED berries still clearly DARK, with
  // a bold snow cap on top + a snow drift at the base.
  Winter: {
    berryLight: [82, 70, 100],
    berryMid: [42, 34, 56],
    berryDark: [20, 16, 30],
    leafLight: [134, 156, 156],
    leafMid: [96, 120, 124],
    leafDark: [60, 82, 92],
    sprig: [114, 112, 106],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [38, 34, 50],
    light: [200, 224, 255],
    lightAmt: 0.34,
    gloss: 0.24,
    sunken: 0.25,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Cluster geometry (the SAME silhouette every season) ──────────────────────
//
// 3–5 plump aggregate berries sit in a tight bunch low-centre on the pad. Each
// berry is a rosette of little round drupelets. The bunch base contacts the pad
// near y≈+14; the cluster rises to about y≈−7. Origin-centered.

const CLUSTER_BASE_Y = 14;    // bunch contacts the pad here
const CLUSTER_PIVOT_Y = 13.5; // rock/lean about a point near the base

// Per-berry: [centre x, centre y, radius]. Five berries forming a compact bunch
// (a couple tucked behind/below so 3–5 read). The arrangement is constant.
const BERRIES: Array<[number, number, number]> = [
  [-6.2, 5.0, 5.2],   // lower-left
  [5.4, 6.2, 5.0],    // lower-right
  [-0.6, 8.6, 4.6],   // bottom-centre (tucked low)
  [-3.0, -1.0, 4.8],  // upper-left
  [4.0, -1.4, 4.4],   // upper-right (hero, catches most light)
];

// Drupelet offsets within one berry (unit circle, scaled by berry radius). A
// centre bump plus a ring of six — gives the bumpy aggregate read.
const DRUPELETS: Array<[number, number, number]> = [
  [0, 0, 0.42],
  [0, -0.62, 0.36],
  [0.58, -0.3, 0.34],
  [0.58, 0.34, 0.34],
  [0, 0.64, 0.34],
  [-0.58, 0.34, 0.34],
  [-0.58, -0.3, 0.34],
];

/** Draw ONE aggregate berry (a rosette of round drupelets) at (cx,cy) r. */
function drawBerry(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  p: P,
): void {
  // soft dark outline pass — a slightly fatter base disc behind the drupelets
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 0.9, 0, Math.PI * 2);
  ctx.fill();

  // matte/overripe darkening pulls the body toward the dark tone
  const bodyMid = lerpRGB(p.berryMid, p.berryDark, 0.55 * p.sunken);
  // a BRIGHTER lit tone (berryLight pushed toward white) so each drupelet reads
  // as a distinct rounded bump at board size — contrast only, silhouette intact.
  const capBright = lerpRGB(p.berryLight, [255, 255, 255], 0.34);

  // each drupelet: a dark SEPARATING ring, dark base, mid body, then a bright
  // lit cap (light from upper-left). The dark ring + extra body inset deepen the
  // gaps BETWEEN drupelets so the bumpy aggregate stays legible at ~58px.
  for (const [dx, dy, dr] of DRUPELETS) {
    const px = cx + dx * r;
    const py = cy + dy * r;
    const pr = dr * r;
    // dark separating ring — sits in the gaps between neighbouring drupelets
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.08, 0, Math.PI * 2);
    ctx.fill();
    // dark base
    ctx.fillStyle = rgb(p.berryDark);
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.92, 0, Math.PI * 2);
    ctx.fill();
    // mid body, inset a touch more than before so the dark gap shows
    ctx.fillStyle = rgb(bodyMid);
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.78, 0, Math.PI * 2);
    ctx.fill();
    // brighter lit cap toward upper-left (full opacity, brightened tone)
    ctx.fillStyle = rgb(capBright);
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(px - pr * 0.3, py - pr * 0.34, pr * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // tiny specular highlight (gloss strength from P) — brighter to pop the bump
    ctx.fillStyle = rgba([255, 255, 255], 0.4 + 0.55 * p.gloss);
    ctx.beginPath();
    ctx.arc(px - pr * 0.36, py - pr * 0.42, pr * 0.22 + 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  // unifying shade under the bottom drupelets to round the berry
  ctx.fillStyle = rgba(p.berryDark, 0.4);
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.55, r * 0.7, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // frost dusting (winter) on the upward face — keeps berry clearly visible
  if (p.frostAmt > 0.02) {
    ctx.fillStyle = rgba([214, 232, 250], 0.3 * p.frostAmt);
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.25, r * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([238, 248, 255], 0.75 * p.frostAmt);
    for (const [dx, dy] of [[-0.4, -0.5], [0.3, -0.4], [-0.1, 0.2], [0.5, 0.1]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * r, cy + dy * r, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The single sprig leaf behind/above the cluster (constant shape). */
function drawLeaf(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.save();
  ctx.translate(7.5, -3.5);
  ctx.rotate(-0.5);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(-7.5, 0);
  ctx.quadraticCurveTo(-2, -5.2, 7, -1.6);
  ctx.quadraticCurveTo(-1.5, 0.8, -7.5, 0);
  ctx.closePath();
  ctx.fill();
  // body
  ctx.fillStyle = rgb(p.leafMid);
  ctx.beginPath();
  ctx.moveTo(-6.6, 0);
  ctx.quadraticCurveTo(-2, -4.5, 6.2, -1.5);
  ctx.quadraticCurveTo(-1.5, 0.4, -6.6, 0);
  ctx.closePath();
  ctx.fill();
  // lit upper half
  ctx.fillStyle = rgba(p.leafLight, 0.8);
  ctx.beginPath();
  ctx.moveTo(-5.6, -0.6);
  ctx.quadraticCurveTo(-1.5, -4, 5.4, -1.6);
  ctx.quadraticCurveTo(-0.5, -1.2, -5.6, -0.6);
  ctx.closePath();
  ctx.fill();
  // midrib vein
  ctx.strokeStyle = rgb(p.leafDark);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-6, -0.2);
  ctx.quadraticCurveTo(-1, -1.4, 6, -1.5);
  ctx.stroke();
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

    // tufted top edge — little blades around the upper rim
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
      // sparkle on the snow
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossom on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
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
        [12, 18.6, 0.7, [182, 70, 28]],
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

    // ── Contact shadow under the cluster (follows the bob/lean for grounding) ──
    const tipShift = pose.lean * (CLUSTER_PIVOT_Y - (-7)); // how far the crown leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, CLUSTER_BASE_Y + 1.5, 8 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.26 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, CLUSTER_BASE_Y + 2, 10 * shadowSpread, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: short woody sprig + leaf + the berry bunch, under the pose ──
    ctx.save();
    // Pivot near the base so lean rocks the crown side-to-side and squash anchors
    // at the base (the bunch "sits" on the pad). bob raises the whole cluster.
    ctx.translate(0, CLUSTER_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -CLUSTER_PIVOT_Y);

    // short woody sprig rising from the pad into the bunch (constant shape)
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0.5, 13.5);
    ctx.quadraticCurveTo(2.5, 8, 3.5, 2);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.sprig);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0.5, 13.5);
    ctx.quadraticCurveTo(2.5, 8, 3.5, 2);
    ctx.stroke();

    // one leaf sits behind/above the bunch
    drawLeaf(ctx, p);

    // the berry bunch — draw back-to-front (upper berries painted last so the
    // hero upper-right reads on top). Order matches a stable depth sort.
    const order = [3, 0, 2, 1, 4]; // upper-left, lower-left, bottom, lower-right, hero
    for (const idx of order) {
      const b = BERRIES[idx];
      drawBerry(ctx, b[0], b[1], b[2], p);
    }

    // snow cap on the top of the cluster (winter) — hugs the upward crown
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-7, -3.4);
      ctx.quadraticCurveTo(-2, -7.6, 1, -6.4);
      ctx.quadraticCurveTo(5, -8, 8, -3.6);
      ctx.quadraticCurveTo(4, -2.6, 1.5, -3.8);
      ctx.quadraticCurveTo(-2, -2.4, -7, -3.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, -3.4, 6.4, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
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
// sin^2(pi q) → smooth in/out, peak at q=0.5.
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

// RARE phase + window — shared by the pose plump and the anim() dew overlay so
// the droplet is gated to exactly the same beat.
const RARE_PERIOD = 18.0;
const RARE_WIN = 1.5;
const RARE_PHASE = 3.0; // phased clear of the common jiggle (never overlaps)

/** Build the idle pose from the wall clock. An in-character CLUSTER beat:
 *   COMMON a gentle squash-breathing JIGGLE every ~6s (win 1.4s),
 *   RARE   a BERRY-PLUMP swell+settle every ~18s (win 1.5s).
 *  Both beats are built from factors that are zero with zero VELOCITY at the
 *  window edges (hump, and hump×sin(2πq)), so the pose returns to REST cleanly
 *  → a seamless loop. No lean: a bunch of berries settles/plumps, it doesn't
 *  rock or hop. */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: gentle cluster jiggle — soft squash breathing (~6s, win 1.4s) ──
  // The bunch of drupelets settles: a small widen + shorten with a faint jiggle
  // riding on top. Tiny, pose-only.
  const qC = actionQ(t, 6.0, 1.4, 0.0);
  if (qC >= 0) {
    const env = hump(qC); // 0..1..0, zero value+velocity at edges
    const jig = Math.sin(qC * Math.PI * 2); // one in→out wiggle within the window
    // base soft breathe: widen a touch, shorten a touch (a settling bunch)
    pose.squashX += 0.05 * env;
    pose.squashY += -0.04 * env;
    // faint jiggle on top — env keeps it 0 (with 0 velocity) at the edges
    pose.squashX += 0.022 * env * jig;
    pose.squashY += -0.018 * env * jig;
  }

  // ── RARE: BERRY-PLUMP — the whole cluster swells & tightens then settles ──
  // squashX AND squashY expand TOGETHER (uniform inflate, not a flatten) so it
  // reads as the drupelets plumping up, with a small lift, then a settle-back.
  // Clearly distinct from the COMMON jiggle (uniform swell vs widen-and-shorten,
  // and ~3× the amount), not just a bigger version of it.
  const qS = actionQ(t, RARE_PERIOD, RARE_WIN, RARE_PHASE);
  if (qS >= 0) {
    const swell = hump(qS); // 0..1..0 main plump
    const tighten = hump(qS) * Math.sin(qS * Math.PI * 2); // tighten→release wiggle
    pose.squashX += 0.16 * swell + 0.04 * tighten;
    pose.squashY += 0.14 * swell + 0.035 * tighten;
    // a small lift as it plumps (the bunch lifts a hair), zero at the edges
    pose.bob += -1.8 * hump(qS);
  }

  return pose;
}

/** Additive DEW DROPLET overlay for the RARE berry-plump (Spring/Summer only).
 *  A single bead forms at the crown, swells, then slides down the right of the
 *  cluster and off. Gated to the RARE window via actionQ, so it is INVISIBLE at
 *  t=0 (RARE is at rest there) and its alpha envelope is 0 at BOTH window edges
 *  → it never pops in or out. Pure dressing, never touches the silhouette. */
function drawDewDrop(ctx: CanvasRenderingContext2D, t: number): void {
  const qS = actionQ(t, RARE_PERIOD, RARE_WIN, RARE_PHASE);
  if (qS < 0) return; // at rest (also the case at t=0) → nothing drawn
  // alpha fades in then out, exactly 0 at qS=0 and qS=1 (no pop).
  const alpha = Math.sin(Math.PI * qS) * 0.9;
  if (alpha <= 0.001) return;
  // bead near the crown for the first ~45%, then slide down-right and off.
  const slide = clamp01((qS - 0.45) / 0.55); // 0 while beading → 1 sliding off
  const ease = slide * slide;
  const dx = 2.0 + ease * 7.0; // drifts toward the right edge of the bunch
  const dy = -5.5 + ease * 16.0; // slides down past the bunch
  const rad = 1.0 + Math.sin(Math.PI * clamp01(qS / 0.45)) * 0.9 - ease * 0.3; // beads then thins
  const r = Math.max(0.4, rad);

  ctx.save();
  try {
    ctx.globalAlpha = clamp01(alpha);
    // translucent water body
    ctx.fillStyle = "rgba(214,238,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(dx, dy, r * 0.82, r, 0, 0, Math.PI * 2);
    ctx.fill();
    // bright rim + a small specular glint (reads as a wet bead)
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(dx, dy, r * 0.82, r, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(dx - r * 0.3, dy - r * 0.4, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const tt = Number.isFinite(t) ? t : 0;
    paint(ctx, SP[season], poseFromClock(tt));

    // Light additive season micro-sparkle (dressing only — never the subject's
    // own colour/brightness). Kept tiny so the POSE action is the star.
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Winter") {
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((tt / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
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
        // a dew bead on the fresh cluster during the rare berry-plump
        drawDewDrop(ctx, tt);
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
      } else if (season === "Summer") {
        // a dew bead on the glossy ripe cluster during the rare berry-plump
        drawDewDrop(ctx, tt);
      }
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
