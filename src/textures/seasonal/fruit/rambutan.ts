// BOLD seasonal art for the RAMBUTAN fruit tile (`tile_fruit_rambutan`).
//
// CATEGORY: Fruit. The iconic harvested ITEM only — a small cluster of 2–3 oval
// rambutan fruit, each covered in soft curved spiky HAIRS (the signature shaggy
// spines), on a short sprig with one leaf, resting low-centre on the pad. The
// hairy-cluster SILHOUETTE is IDENTICAL every season (same fruit, same spines,
// same sprig) — only colour, ripeness shade and the small dressing/frost/snow
// amounts change. Ripeness = colour, never an identity change.
//
// This is the APPROVED "bold & fun" direction (mirrors veg/pepper.bold.ts):
// seasons swing HARD on colour + a real seasonal prop, and the idle is loud
// rather than subtle:
//
//   IDLE COMMON  (~6s, win ~0.9s): a soft WOBBLE — the whole hairy cluster
//       rocks/leans side-to-side with the soft hairs jiggling, a squash at the
//       base. Anticipation → peak → settle, zero velocity at the window edges
//       (seamless).
//   IDLE SPECIAL (~18s, win ~1.1s): a bigger BOUNCE — a squash-stretch hop
//       ~12–13 design-px up, anticipation crouch, stretch on the way up, and a
//       squash landing that overshoots then settles (the cluster may briefly
//       exit the box).
//
// Architecture mirrors pepper.bold.ts: a single parameterized
// `paint(ctx, p, pose)` where `interface P` holds tweenable season params
// (colours + prop amounts) and `pose` holds the idle gesture (bob / lean /
// squash). Because every season is the same paint with tweened P, transitions
// are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and
// the idle's pose is 0 at every action-window edge → seamless loop.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing — never throws, clamps everything, save/restore.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  skinLight: RGB;   // lit face of the rambutan rind
  skinMid: RGB;     // body tone of the rind
  skinDark: RGB;    // shadowed underside of the fruit
  spineLight: RGB;  // lit tip of the soft curved spines/hairs
  spineDark: RGB;   // base/shaded part of the spines
  leaf: RGB;        // the single sprig leaf
  stem: RGB;        // short woody sprig
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the cluster
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 (reserved colour cue: green→ripe red)
  gloss: number;    // 0..1 specular gloss-streak strength on the rind
  spineTipGreen: number; // 0..1 green-ness of the spine tips (summer cue)
  frostAmt: number; // 0..1 cool frost dusting on the spines
  snowCapAmt: number; // 0..1 snow on the shoulders of the cluster
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-cluster sway, radians (rock side to side)
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
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinDark: lerpRGB(a.skinDark, b.skinDark, t),
    spineLight: lerpRGB(a.spineLight, b.spineLight, t),
    spineDark: lerpRGB(a.spineDark, b.spineDark, t),
    leaf: lerpRGB(a.leaf, b.leaf, t),
    stem: lerpRGB(a.stem, b.stem, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    spineTipGreen: lerp(a.spineTipGreen, b.spineTipGreen, t),
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
    ripeness: clamp01(p.ripeness),
    gloss: clamp01(p.gloss),
    spineTipGreen: clamp01(p.spineTipGreen),
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
  // Spring — clearly GREEN spiky young fruit, hairs greenish; dewy lime pad +
  // a prominent blossom.
  Spring: {
    skinLight: [170, 224, 96],
    skinMid: [104, 182, 60],
    skinDark: [52, 118, 44],
    spineLight: [190, 230, 118],
    spineDark: [92, 156, 60],
    leaf: [104, 172, 64],
    stem: [122, 110, 66],
    padGrass: [126, 214, 84],
    padDark: [64, 146, 56],
    soil: [120, 84, 48],
    outline: [36, 72, 30],
    light: [228, 248, 214],
    lightAmt: 0.16,
    ripeness: 0.1,
    gloss: 0.2,
    spineTipGreen: 0.95,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — full vivid RED hairy fruit at PEAK, max gloss, bright warm light.
  Summer: {
    skinLight: [255, 92, 70],
    skinMid: [222, 34, 38],
    skinDark: [148, 16, 28],
    spineLight: [244, 96, 76],
    spineDark: [156, 26, 32],
    leaf: [80, 156, 52],
    stem: [120, 92, 56],
    padGrass: [80, 178, 70],
    padDark: [40, 116, 50],
    soil: [128, 88, 48],
    outline: [88, 14, 22],
    light: [255, 244, 200],
    lightAmt: 0.18,
    ripeness: 0.85,
    gloss: 1.0,
    spineTipGreen: 0.5, // green-tipped spines at peak
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deep crimson overripe fruit, spines darkening; amber pad + leaves.
  Autumn: {
    skinLight: [180, 46, 44],
    skinMid: [138, 24, 34],
    skinDark: [82, 16, 26],
    spineLight: [150, 50, 46],
    spineDark: [90, 28, 30],
    leaf: [150, 120, 60],
    stem: [110, 82, 48],
    padGrass: [160, 150, 78],
    padDark: [108, 88, 46],
    soil: [120, 78, 42],
    outline: [58, 14, 20],
    light: [250, 198, 132],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.36,
    spineTipGreen: 0.1, // spines darkening, little green left
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; frost-dusted DULL-red fruit still clearly
  // red, a bold snow cap on the shoulders + a snow blanket on the pad.
  Winter: {
    skinLight: [186, 92, 84],
    skinMid: [148, 56, 60],
    skinDark: [94, 38, 48],
    spineLight: [182, 106, 102],
    spineDark: [112, 58, 62],
    leaf: [120, 132, 98],
    stem: [110, 96, 80],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [50, 38, 54],
    light: [200, 224, 255],
    lightAmt: 0.32,
    ripeness: 0.85,
    gloss: 0.24,
    spineTipGreen: 0.04,
    frostAmt: 0.8,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Cluster geometry — the SAME hairy-cluster silhouette every season ────────
// Three oval fruit: two front-low, one tucked behind/above; each ~oval ~12 tall.
// Each fruit gets a deterministic ring of soft curved spines (the signature
// shaggy hairs). Origin-centered, resting low on the pad. The whole cluster
// rocks/squashes about a pivot near the base under the idle pose.
interface FruitDef {
  cx: number;
  cy: number; // centre (before pose)
  rx: number;
  ry: number; // oval radii
  rot: number; // slight tilt
  spines: number; // spine count
}

// Three fruit forming the cluster — constant placement every season.
const FRUIT: FruitDef[] = [
  { cx: -6.2, cy: 8.0, rx: 7.4, ry: 8.6, rot: -0.16, spines: 17 },
  { cx: 6.0, cy: 9.0, rx: 7.0, ry: 8.2, rot: 0.18, spines: 16 },
  { cx: 0.4, cy: 1.6, rx: 6.6, ry: 7.8, rot: 0.02, spines: 16 },
];

// The cluster pivots about a point near the base so lean rocks the TOP and
// squash anchors at the resting contact.
const CLUSTER_PIVOT_Y = 16; // near the soil contact

/** Deterministic pseudo-random in [0,1) for spine jitter — stable per call. */
function jit(i: number): number {
  const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Draw the soft curved spines (hairs) radiating from one fruit. The spine
 *  LAYOUT is identical every season (same silhouette); only colours / frost
 *  change. `seed` offsets the deterministic jitter so each fruit differs.
 *  `jiggle` (radians) adds a tiny per-spine wobble for the idle hairs-jiggle. */
function drawSpines(
  ctx: CanvasRenderingContext2D,
  f: FruitDef,
  seed: number,
  p: P,
  pass: "outline" | "fill",
  jiggle: number,
): void {
  const cx = f.cx;
  const cy = f.cy;
  const n = f.spines;
  for (let i = 0; i < n; i++) {
    const base = (i / n) * Math.PI * 2 + f.rot;
    // bias spines outward; skip the very bottom (sits in the cluster)
    const wob = jiggle * (jit(i * 2 + seed) - 0.5);
    const ang = base + (jit(i + seed) - 0.5) * 0.18 + wob;
    const downness = Math.cos(ang); // +1 = downward
    if (downness > 0.55) continue; // hide hairs tucked under the fruit
    const len = 3.4 + jit(i * 3 + seed) * 2.2;
    // root just outside the rind
    const rx0 = cx + Math.sin(ang) * f.rx * 0.92;
    const ry0 = cy - Math.cos(ang) * f.ry * 0.92;
    // tips curve (the soft curved hook) — sideways nudge for the curl
    const curl = (jit(i * 5 + seed) - 0.5) * 1.8 - 0.6;
    const tipX = cx + Math.sin(ang) * (f.rx + len);
    const tipY = cy - Math.cos(ang) * (f.ry + len);
    const ctrlX = cx + Math.sin(ang) * (f.rx + len * 0.5) + Math.cos(ang) * curl;
    const ctrlY = cy - Math.cos(ang) * (f.ry + len * 0.5) + Math.sin(ang) * curl;
    ctx.beginPath();
    ctx.moveTo(rx0, ry0);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    if (pass === "outline") {
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = 2.4;
    } else {
      // lit tips lean toward upper-left; optional green tip blend
      const upperLeft = -Math.sin(ang) * 0.5 - Math.cos(ang) * 0.5; // ~lit-ness
      const litMix = clamp01(0.4 + upperLeft * 0.5);
      const tipCol = lerpRGB(p.spineDark, p.spineLight, litMix);
      const greened = lerpRGB(tipCol, [120, 180, 70], p.spineTipGreen * 0.6);
      ctx.strokeStyle = rgb(greened);
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();
  }
}

/** Trace one fruit's oval body into the current path. */
function fruitPath(ctx: CanvasRenderingContext2D, f: FruitDef, grow = 0): void {
  ctx.beginPath();
  ctx.ellipse(f.cx, f.cy, f.rx + grow, f.ry + grow, f.rot, 0, Math.PI * 2);
}

/** Draw a single fruit body (cel-shaded rind, no spines). */
function drawFruitBody(ctx: CanvasRenderingContext2D, f: FruitDef, p: P): void {
  const cy = f.cy;
  // mid body
  ctx.fillStyle = rgb(p.skinMid);
  fruitPath(ctx, f);
  ctx.fill();
  // lit upper-left face
  ctx.save();
  fruitPath(ctx, f);
  ctx.clip();
  const g = ctx.createLinearGradient(f.cx - f.rx, cy - f.ry, f.cx + f.rx, cy + f.ry);
  g.addColorStop(0, rgb(p.skinLight));
  g.addColorStop(0.5, rgb(p.skinMid));
  g.addColorStop(1, rgb(p.skinDark));
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.ellipse(f.cx - 1, cy - 0.5, f.rx + 1, f.ry + 1, f.rot, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // underside shadow
  ctx.fillStyle = rgba(p.skinDark, 0.5);
  ctx.beginPath();
  ctx.ellipse(f.cx + 1.4, cy + f.ry * 0.42, f.rx * 0.86, f.ry * 0.5, f.rot, 0, Math.PI * 2);
  ctx.fill();
  // gloss streak on the upper-left shoulder
  if (p.gloss > 0.02) {
    ctx.fillStyle = rgba([255, 255, 255], 0.16 + 0.5 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(f.cx - f.rx * 0.42, cy - f.ry * 0.4, 1.5, 2.6, f.rot - 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // frost speckle (winter) on the upward rind
  if (p.frostAmt > 0.02) {
    ctx.fillStyle = rgba([232, 244, 255], 0.6 * p.frostAmt);
    for (let k = 0; k < 4; k++) {
      const a = -0.9 + k * 0.5;
      ctx.beginPath();
      ctx.arc(f.cx + Math.sin(a) * f.rx * 0.5, cy - Math.cos(a) * f.ry * 0.5 - 1, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
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
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
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
        [-12, 19.6, -0.5, [196, 120, 40]],
        [12, 18.6, 0.7, [176, 72, 32]],
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

    // ── Contact shadow under the cluster (follows the bob/lean for grounding) ─
    const tipShift = pose.lean * (CLUSTER_PIVOT_Y - 1); // how far the top leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, 17.5, 10 * shadowSpread, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, 18, 12 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the hairy cluster, under the idle pose transform ────────────
    ctx.save();
    // Pivot near the base so lean rocks the cluster side-to-side and squash
    // anchors at the base (it "sits" on the pad). bob raises the whole cluster.
    ctx.translate(0, CLUSTER_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -CLUSTER_PIVOT_Y);

    // soft contact shadow under the cluster (inside the transform so it tracks)
    ctx.fillStyle = rgba(p.outline, 0.22);
    ctx.beginPath();
    ctx.ellipse(0, 15.5, 9.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Sprig: short woody stem rising to one leaf (behind the cluster) ──────
    const sy = -3;
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(1.5, 1.5);
    ctx.quadraticCurveTo(3.5, sy - 2, 5.5, sy - 7);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.stem);
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(1.5, 1.5);
    ctx.quadraticCurveTo(3.5, sy - 2, 5.5, sy - 7);
    ctx.stroke();
    // one leaf at the sprig tip
    ctx.save();
    ctx.translate(5.5, sy - 7);
    ctx.rotate(0.5);
    fruitLeaf(ctx, p);
    ctx.restore();

    // ── The hairy cluster (SAME silhouette every season) ────────────────────
    // Draw back fruit first (the tucked-up one), then the two front fruit, so
    // the front overlaps. For each: spine OUTLINE pass, body, then spine FILL.
    // hairsJiggle is 0 at REST (seamless); the idle adds a tiny per-spine wobble.
    const hairsJiggle = clamp01(Math.abs(pose.lean) / 0.17 + Math.abs(pose.bob) / 13) * 0.12;
    const order = [2, 0, 1]; // back, front-left, front-right
    order.forEach((idx) => {
      const f = FRUIT[idx];
      // soft dark outline ring under the body
      fruitPath(ctx, f, 1.1);
      ctx.fillStyle = rgb(p.outline);
      ctx.fill();
      // spine outline pass (dark, fat) then body, then lit spine pass over
      drawSpines(ctx, f, idx * 7 + 1, p, "outline", hairsJiggle);
      drawFruitBody(ctx, f, p);
      drawSpines(ctx, f, idx * 7 + 1, p, "fill", hairsJiggle);
    });

    // snow caps on the shoulders of the cluster (winter) — over the spines
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      [FRUIT[0], FRUIT[1], FRUIT[2]].forEach((f) => {
        const cy = f.cy;
        ctx.beginPath();
        ctx.moveTo(f.cx - f.rx * 0.7, cy - f.ry * 0.6);
        ctx.quadraticCurveTo(f.cx - 1, cy - f.ry - 2, f.cx, cy - f.ry - 1.4);
        ctx.quadraticCurveTo(f.cx + 1, cy - f.ry - 2, f.cx + f.rx * 0.7, cy - f.ry * 0.6);
        ctx.quadraticCurveTo(f.cx + 2, cy - f.ry * 0.3, f.cx, cy - f.ry * 0.5);
        ctx.quadraticCurveTo(f.cx - 2, cy - f.ry * 0.3, f.cx - f.rx * 0.7, cy - f.ry * 0.6);
        ctx.closePath();
        ctx.fill();
      });
    }

    ctx.restore(); // end pose transform

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

/** The single sprig leaf (origin at its base, pointing up). */
function fruitLeaf(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-4.4, -3.6, -1, -9.6);
  ctx.quadraticCurveTo(2.4, -4.6, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(p.leaf);
  ctx.beginPath();
  ctx.moveTo(0, -0.6);
  ctx.quadraticCurveTo(-3.4, -3.6, -1, -8.8);
  ctx.quadraticCurveTo(1.8, -4.4, 0, -0.6);
  ctx.closePath();
  ctx.fill();
  // midrib
  ctx.strokeStyle = rgba(p.outline, 0.6);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-0.3, -1);
  ctx.quadraticCurveTo(-1.4, -4.4, -1, -8.4);
  ctx.stroke();
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

// An asymmetric anticipation→peak→settle curve, 0 at q=0 and q=1.
// Dips slightly negative early (anticipation) then a strong positive peak.
function anticipate(q: number): number {
  // windup wave: a small negative lobe then a big positive lobe, both returning
  // to zero at the edges. (1-cos) envelope keeps velocity zero at q=0,1.
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common WOBBLE every ~6s (win 0.9s), rare BOUNCE every ~18s (win 1.1s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: side-to-side wobble (~6s, win 0.9s) ──
  // Two rocks left→right→left, ~0.17 rad lean → the soft hairs jiggle and the
  // whole cluster rocks ~ pivotArm*0.17 at the top.
  const qC = actionQ(t, 6.0, 0.9, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3); // 1.5 rocks within the window
    pose.lean += 0.17 * env * rock;
    // little squat at the base as it rocks (settle weight side to side)
    pose.squashY += -0.06 * hump(qC);
    pose.squashX += 0.05 * hump(qC);
  }

  // ── RARE SPECIAL: squash-stretch BOUNCE hop (~18s, win 1.1s) ──
  // Anticipation crouch → stretch up ~12–13px → squash landing → settle.
  const qS = actionQ(t, 18.0, 1.1, 3.0); // phase 3s so it doesn't collide w/ wobble
  if (qS >= 0) {
    // Hop height profile: brief crouch (q<0.18), launch arc, squash landing.
    const crouch = qS < 0.18 ? Math.sin((qS / 0.18) * Math.PI) : 0; // 0..1..0
    const airWin = qS >= 0.18 && qS < 0.82 ? (qS - 0.18) / 0.64 : -1;
    const air = airWin >= 0 ? Math.sin(airWin * Math.PI) : 0; // arc up & down
    const landWin = qS >= 0.74 ? Math.min(1, (qS - 0.74) / 0.26) : -1;
    const land = landWin >= 0 ? Math.sin(landWin * Math.PI) : 0; // squash bump

    // bob: crouch dips down a touch, then a big rise (negative = up) ~13px.
    pose.bob += crouch * 1.6 - air * 12.5;
    // squash-stretch: tall+thin at apex, short+wide on crouch & landing.
    const apex = air; // 0..1 in the air
    pose.squashY += apex * 0.18 - crouch * 0.12 - land * 0.16;
    pose.squashX += -apex * 0.13 + crouch * 0.10 + land * 0.14;
    // a tiny lean wiggle on the way down for life
    pose.lean += 0.05 * Math.sin(qS * Math.PI * 4) * (1 - Math.abs(2 * qS - 1));
  }

  // Reference anticipate() so it stays part of the seamless-curve toolkit and
  // contributes a faint windup tilt to the common wobble (still 0 at edges).
  if (qC >= 0) {
    pose.lean += 0.02 * anticipate(qC);
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
      // Summer: no extra dressing — the bounce + vivid red is the show.
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
