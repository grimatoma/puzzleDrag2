// Seasonal art for the PANSY flower board tile (`tile_flower_pansy`).
//
// ONE violet pansy bloom — a five-petal face (1 broad lower petal, 2 side, 2
// upper) with a yellow throat and dark nectar whiskers, on a short green stem
// with a pair of leaves, rising from a low grassy pad. The SAME bloom
// silhouette is drawn EVERY season (identity rule §36: same outline all four
// seasons — only surface colour and frost/snow change). The pansy never
// collapses to a bare stub:
//   Spring — fresh violet bloom, dewy lime pad, a stray blossom or two.
//   Summer — saturated violet bloom at PEAK, brightest yellow throat.
//   Autumn — fading mauve bloom, browning petal edges, a gentle droop, yellow
//            leaves, fallen leaves on the pad.
//   Winter — withered-but-present bloom: greyed cool violet, frost-dusted
//            petals, a small snow cap, drooping a touch, snowy pad. Still
//            clearly a pansy face.
//
// Architecture (mandatory): a SINGLE parameterized `paint(ctx, p, bob)` draws
// the whole tile from ONLY tweenable params `p` and a vertical idle offset
// `bob`. Four parameter sets `SP` (one per season) feed it. `draw` calls it at
// rest, `anim` adds seamless micro-motion, and `transition` lerps EVERY field
// of `p` between adjacent seasons through a smootherstep, so transition(0)
// exactly reproduces draw(from) and transition(1) exactly reproduces draw(to)
// — the violet→mauve→frost shift rides entirely on the lerped colours, so the
// morph never snaps.
//
// Origin-centered in the −24..+24 design box, light from upper-left. The board
// sprite supplies its own sway rotation, so the idle leans on internal bobs,
// glints, and drifting flecks rather than large rotations.

import type { SeasonalTileEntry, SeasonalTransitionSet, SeasonName } from "../types.js";

// ── Tweenable parameter set ──────────────────────────────────────────────────

type RGB = [number, number, number];

interface P {
  // colours
  petalLow: RGB; // broad lower petal (lightest)
  petalSide: RGB; // the two side petals (main violet)
  petalUp: RGB; // the two upper petals (darkest)
  petalEdge: RGB; // petal outline (violet → brown → cool grey)
  blotch: RGB; // dark face blotch + nectar whiskers near the throat
  throat: RGB; // yellow centre
  throatDark: RGB; // throat shade
  stem: RGB; // green stem (lit)
  stemDark: RGB; // stem outline / shade
  leaf: RGB; // leaf surface
  leafDark: RGB; // leaf edge / vein
  pad: RGB; // grass pad top
  padDark: RGB; // pad underside / shaded grass
  soil: RGB; // soil rim under the pad
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint (overlay on whole tile)
  // scalars 0..1
  lightAmt: number; // strength of the light overlay
  shadowAmt: number; // contact-shadow strength
  bloomOpen: number; // petal fan extent (fresh→peak→fading, stays high)
  droop: number; // downward tilt of the whole face (autumn/winter)
  whiskerAmt: number; // nectar-line strength (peak summer, faint winter)
  glossAmt: number; // dewy highlight strength (spring/summer)
  frostAmt: number; // frost flecks on the upper petals (winter)
  snowCapAmt: number; // snow cap resting on the top petals (winter)
  padSnowAmt: number; // snow blanket on the pad (winter)
  blossomAmt: number; // stray blossom dots ON the pad (spring)
  fallenLeafAmt: number; // fallen leaves ON the pad (autumn)
}

// ── Per-season parameter sets (silhouette constant; only these change) ────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh violet bloom; dewy lime pad; cool-bright light.
  Spring: {
    petalLow: [196, 142, 240],
    petalSide: [142, 72, 200],
    petalUp: [96, 46, 146],
    petalEdge: [61, 26, 99],
    blotch: [44, 18, 70],
    throat: [244, 210, 58],
    throatDark: [200, 154, 22],
    stem: [79, 154, 46],
    stemDark: [44, 80, 24],
    leaf: [90, 163, 54],
    leafDark: [47, 94, 28],
    pad: [126, 206, 96],
    padDark: [70, 142, 60],
    soil: [96, 66, 36],
    outline: [40, 40, 44],
    light: [220, 238, 255], // cool-bright
    lightAmt: 0.16,
    shadowAmt: 0.2,
    bloomOpen: 0.92,
    droop: 0,
    whiskerAmt: 0.82,
    glossAmt: 0.5,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.5,
    fallenLeafAmt: 0,
  },
  // Summer — saturated violet bloom (PEAK), brightest throat; warm light.
  Summer: {
    petalLow: [204, 150, 248],
    petalSide: [150, 70, 212],
    petalUp: [100, 44, 156],
    petalEdge: [58, 24, 96],
    blotch: [42, 16, 66],
    throat: [250, 216, 58],
    throatDark: [206, 158, 22],
    stem: [86, 166, 50],
    stemDark: [44, 84, 26],
    leaf: [96, 172, 58],
    leafDark: [48, 98, 30],
    pad: [78, 168, 70],
    padDark: [44, 112, 46],
    soil: [88, 58, 30],
    outline: [38, 38, 42],
    light: [255, 246, 214], // warm
    lightAmt: 0.14,
    shadowAmt: 0.34,
    bloomOpen: 1,
    droop: 0,
    whiskerAmt: 1,
    glossAmt: 0.4,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — fading mauve bloom, browning edges, gentle droop; olive-tan pad.
  Autumn: {
    petalLow: [196, 160, 188],
    petalSide: [160, 114, 150],
    petalUp: [120, 80, 102],
    petalEdge: [122, 82, 48], // browning
    blotch: [86, 56, 50],
    throat: [222, 178, 64],
    throatDark: [168, 122, 36],
    stem: [120, 116, 60],
    stemDark: [78, 66, 28],
    leaf: [176, 158, 62], // yellowing
    leafDark: [107, 82, 16],
    pad: [140, 150, 84],
    padDark: [96, 102, 54],
    soil: [92, 60, 30],
    outline: [54, 46, 36],
    light: [255, 224, 168], // low amber
    lightAmt: 0.2,
    shadowAmt: 0.26,
    bloomOpen: 0.9,
    droop: 0.22,
    whiskerAmt: 0.4,
    glossAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
  },
  // Winter — withered-but-present: greyed cool violet, frost-dusted, a snow
  // cap, drooping a touch; snow-blued pad. Still a readable pansy face.
  Winter: {
    petalLow: [196, 182, 206],
    petalSide: [150, 122, 168],
    petalUp: [110, 90, 128],
    petalEdge: [86, 78, 96], // cool grey
    blotch: [74, 66, 84],
    throat: [212, 192, 124], // muted, still reads as the throat
    throatDark: [160, 142, 86],
    stem: [110, 108, 96],
    stemDark: [70, 70, 64],
    leaf: [122, 134, 112], // greyed sage
    leafDark: [72, 84, 72],
    pad: [206, 220, 234], // snow-blued grass
    padDark: [150, 170, 192],
    soil: [110, 104, 96],
    outline: [62, 64, 74],
    light: [206, 224, 248], // cool blue-grey
    lightAmt: 0.22,
    shadowAmt: 0.16,
    bloomOpen: 0.82,
    droop: 0.3,
    whiskerAmt: 0.2,
    glossAmt: 0,
    frostAmt: 0.82,
    snowCapAmt: 0.5,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Small numeric helpers ────────────────────────────────────────────────────

const clamp01 = (x: number): number => (x < 0 || Number.isNaN(x) ? 0 : x > 1 ? 1 : x);
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

function rgb(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

function mixRGB(a: RGB, b: RGB, k: number): RGB {
  const t = clamp01(k);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * clamp01(k);
}

function lerpP(a: P, b: P, k: number): P {
  return {
    petalLow: mixRGB(a.petalLow, b.petalLow, k),
    petalSide: mixRGB(a.petalSide, b.petalSide, k),
    petalUp: mixRGB(a.petalUp, b.petalUp, k),
    petalEdge: mixRGB(a.petalEdge, b.petalEdge, k),
    blotch: mixRGB(a.blotch, b.blotch, k),
    throat: mixRGB(a.throat, b.throat, k),
    throatDark: mixRGB(a.throatDark, b.throatDark, k),
    stem: mixRGB(a.stem, b.stem, k),
    stemDark: mixRGB(a.stemDark, b.stemDark, k),
    leaf: mixRGB(a.leaf, b.leaf, k),
    leafDark: mixRGB(a.leafDark, b.leafDark, k),
    pad: mixRGB(a.pad, b.pad, k),
    padDark: mixRGB(a.padDark, b.padDark, k),
    soil: mixRGB(a.soil, b.soil, k),
    outline: mixRGB(a.outline, b.outline, k),
    light: mixRGB(a.light, b.light, k),
    lightAmt: lerp(a.lightAmt, b.lightAmt, k),
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, k),
    bloomOpen: lerp(a.bloomOpen, b.bloomOpen, k),
    droop: lerp(a.droop, b.droop, k),
    whiskerAmt: lerp(a.whiskerAmt, b.whiskerAmt, k),
    glossAmt: lerp(a.glossAmt, b.glossAmt, k),
    frostAmt: lerp(a.frostAmt, b.frostAmt, k),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, k),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, k),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, k),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, k),
  };
}

// ── Constant geometry (silhouette identical every season) ────────────────────

// The bloom sits at the top of a short stem rising from the pad.
const BLOOM_CX = 0;
const BLOOM_CY = -4;
const STEM_BASE: [number, number] = [0, 17];

/** One pansy petal: a rounded teardrop fanning out at `angle` (0 = up/−y) from
 *  the throat, length `len`, scaled by `open` (0 furled at centre, 1 full). */
function petal(
  ctx: CanvasRenderingContext2D,
  angle: number,
  len: number,
  width: number,
  open: number,
  fill: string,
  edge: string,
): void {
  if (open <= 0.001) return;
  const L = len * (0.5 + 0.5 * open);
  const W = width * (0.45 + 0.55 * open);
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  // petal points "up" (−y) in local space: narrow at throat, rounded fan at tip
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-W, -L * 0.55, -W * 0.55, -L);
  ctx.quadraticCurveTo(0, -L * 1.12, W * 0.55, -L);
  ctx.quadraticCurveTo(W, -L * 0.55, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The pansy bloom face centered at (cx, cy), driven entirely by `p`. */
function drawBloom(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number): void {
  const open = clamp01(p.bloomOpen);
  ctx.save();
  ctx.translate(cx, cy);
  // the whole face leans down a touch when drooping (autumn/winter)
  ctx.rotate(p.droop);

  // Pansy face order (back → front): upper pair, side pair, broad lower petal.
  // upper petals (slightly up, darkest) — drawn first (behind)
  petal(ctx, Math.PI * 0.18, 9, 6, open, rgb(p.petalUp), rgb(p.petalEdge));
  petal(ctx, -Math.PI * 0.18, 9, 6, open, rgb(p.petalUp), rgb(p.petalEdge));
  // side petals (main violet)
  petal(ctx, Math.PI * 0.62, 10, 6.6, open, rgb(p.petalSide), rgb(p.petalEdge));
  petal(ctx, -Math.PI * 0.62, 10, 6.6, open, rgb(p.petalSide), rgb(p.petalEdge));
  // broad lower petal (lightest) — drawn last (front), points down
  petal(ctx, Math.PI, 11, 8, open, rgb(p.petalLow), rgb(p.petalEdge));

  // dark face blotch around the throat (the classic pansy "face")
  ctx.fillStyle = rgb(p.blotch, 0.9);
  ctx.beginPath();
  ctx.ellipse(0, 2.4, 3.4 * open, 3.0 * open, 0, 0, Math.PI * 2);
  ctx.fill();

  // nectar whisker lines radiating down/out from the throat onto lower + sides
  const wA = clamp01(p.whiskerAmt) * Math.max(0, (open - 0.3) / 0.7);
  if (wA > 0.02) {
    ctx.strokeStyle = rgb(p.blotch, wA);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const a of [-0.95, -0.5, 0, 0.5, 0.95]) {
      const ang = Math.PI - a; // fan downward
      ctx.beginPath();
      ctx.moveTo(0, 1.4);
      ctx.lineTo(Math.cos(ang + Math.PI / 2) * 7, 1.4 + Math.sin(ang + Math.PI / 2) * 7);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // yellow throat
  ctx.fillStyle = rgb(p.throat);
  ctx.beginPath();
  ctx.arc(0, 0.6, 2.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.throatDark);
  ctx.beginPath();
  ctx.arc(0, 1.4, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // frost flecks on the upper petals (winter) — sprig stays clearly visible
  if (p.frostAmt > 0.01) {
    ctx.fillStyle = rgb([236, 244, 255], 0.6 * p.frostAmt);
    for (const [fx, fy] of [[-4.5, -6], [-1, -8], [3.5, -6.5], [-6.5, -3], [5.5, -3.5]] as const) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // dewy pulsing glint up on a petal (spring/summer) — set in anim via glossAmt
  if (p.glossAmt > 0.01) {
    ctx.fillStyle = rgb([255, 255, 255], 0.22 + p.glossAmt * 0.4);
    ctx.beginPath();
    ctx.arc(-2.6, -4.4, 1.2 + p.glossAmt * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // a light snow dusting resting on the crest of the top petals (winter) —
  // dusts the upward surface; the bloom below stays clearly visible.
  if (p.snowCapAmt > 0.01) {
    ctx.fillStyle = rgb([248, 252, 255], 0.9 * p.snowCapAmt);
    ctx.beginPath();
    ctx.moveTo(-4.6, -7);
    ctx.quadraticCurveTo(-0.5, -10.4, 4.4, -7.2);
    ctx.quadraticCurveTo(0, -8.4, -4.6, -7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb([214, 228, 244], 0.45 * p.snowCapAmt);
    ctx.beginPath();
    ctx.ellipse(-0.2, -7.4, 3.9, 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Green stem + a low pair of leaves (silhouette constant; colour from p). */
function drawStemAndLeaves(ctx: CanvasRenderingContext2D, p: P): void {
  // stem from the pad up to just below the bloom
  ctx.lineCap = "round";
  ctx.strokeStyle = rgb(p.stemDark);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(STEM_BASE[0], STEM_BASE[1]);
  ctx.quadraticCurveTo(1.5, 6, BLOOM_CX, BLOOM_CY + 4);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.stem);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(STEM_BASE[0], STEM_BASE[1]);
  ctx.quadraticCurveTo(1.5, 6, BLOOM_CX, BLOOM_CY + 4);
  ctx.stroke();
  ctx.lineCap = "butt";

  // a pair of leaves low on the stem
  ctx.fillStyle = rgb(p.leaf);
  ctx.strokeStyle = rgb(p.leafDark);
  ctx.lineWidth = 1.3;
  // left leaf
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.quadraticCurveTo(-11, 12, -15, 5);
  ctx.quadraticCurveTo(-7, 11, 0, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // right leaf
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.quadraticCurveTo(11, 11, 15, 4);
  ctx.quadraticCurveTo(7, 10, 0, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ── The single parameterized paint ───────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";

    // — contact shadow (soft, lower-right) —
    ctx.fillStyle = `rgba(0,0,0,${0.16 + p.shadowAmt * 0.26})`;
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    drawPad(ctx, p);

    // the plant rides the idle bob
    ctx.save();
    ctx.translate(0, bob);
    drawStemAndLeaves(ctx, p);
    drawBloom(ctx, p, BLOOM_CX, BLOOM_CY);
    ctx.restore();

    drawPadDressing(ctx, p);

    // — global light overlay (cel ambient) —
    if (p.lightAmt > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      const lg = ctx.createRadialGradient(-10, -10, 2, 0, 0, 40);
      lg.addColorStop(0, rgb(p.light, p.lightAmt));
      lg.addColorStop(1, rgb(p.light, 0));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } catch {
    /* never throw from paint */
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// — low flat grassy pad (matches the rest of the flower set) —
function drawPad(ctx: CanvasRenderingContext2D, p: P): void {
  const cy = 19;
  // shaded underside
  ctx.fillStyle = rgb(p.padDark);
  ctx.beginPath();
  ctx.ellipse(0, cy + 1.6, 18, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // top surface
  ctx.fillStyle = rgb(p.pad);
  ctx.beginPath();
  ctx.ellipse(0, cy, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // soft outline
  ctx.strokeStyle = rgb(p.outline, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();

  // soil rim peeking at the base of the stem
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, cy - 0.6, 5.5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted grass edge — small upticks around the front rim
  ctx.strokeStyle = rgb(p.padDark);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (0.08 + (i / 12) * 0.84); // front arc
    const ex = Math.cos(a) * -18;
    const ey = cy + Math.sin(a) * 4.6;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + (i % 2 ? 1.2 : -1.2), ey - 2.4 - (i % 3));
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  // bright grass highlight (upper-left lit edge)
  ctx.strokeStyle = rgb(mixRGB(p.pad, [255, 255, 255], 0.35), 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(-2, cy - 0.6, 13, 3, 0, Math.PI * 1.05, Math.PI * 1.9);
  ctx.stroke();
}

// — dressing that sits ON the pad (blossom dots, fallen leaves, pad snow) —
function drawPadDressing(ctx: CanvasRenderingContext2D, p: P): void {
  const cy = 19;

  // spring stray blossoms — tiny pink-white dots on the grass
  if (p.blossomAmt > 0.001) {
    const spots: Array<[number, number]> = [[-12, 18.5], [11, 19.5], [6, 21], [-7, 21]];
    spots.forEach(([sx, sy], i) => {
      if (i / spots.length < p.blossomAmt + 0.05) {
        ctx.fillStyle = `rgba(248,210,232,${0.9 * clamp01(p.blossomAmt * 1.6)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,238,120,${0.9 * clamp01(p.blossomAmt * 1.6)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // autumn fallen leaves on the pad
  if (p.fallenLeafAmt > 0.001) {
    const leaves: Array<[number, number, number, RGB]> = [
      [-11, 20, -0.5, [184, 108, 44]],
      [10, 20.5, 0.7, [156, 76, 36]],
      [2, 22, 0.2, [196, 140, 56]],
    ];
    leaves.forEach(([lx, ly, rot, col], i) => {
      if (i / leaves.length < p.fallenLeafAmt + 0.05) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgb(col, clamp01(p.fallenLeafAmt * 1.4));
        ctx.strokeStyle = rgb(p.outline, 0.5 * clamp01(p.fallenLeafAmt * 1.4));
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.8, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  // winter snow blanket on the pad top
  if (p.padSnowAmt > 0.001) {
    ctx.save();
    ctx.globalAlpha = clamp01(p.padSnowAmt);
    const sg = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
    sg.addColorStop(0, "rgba(250,253,255,1)");
    sg.addColorStop(1, "rgba(214,228,244,1)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(-1, cy - 0.8, 16.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // frost sparkle on the pad
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const [sx, sy] of [[-9, 18], [5, 19.5], [12, 18.5], [-2, 20.5]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── Idle motion (Motion-v2): a slow breeze sway, ~5.7s loop ───────────────────
//
// One base angular frequency drives everything so the whole idle is a single
// seamless loop. Period = 2π/IDLE_W ≈ 5.71s. All idle terms are built from
// IDLE_W (or its integer harmonics) so they share that period exactly, and each
// is shaped by a `(1-cos)` envelope so value AND velocity are zero at t=0.

const IDLE_W = 1.1; // rad/s → idle loop ≈ 5.71s (≈ half the old 1.4/1.2 rates)

/** Subject bob: A*(1-cos(w t))*0.5 — starts at 0 with zero velocity, seamless. */
function bobAt(t: number, amp = 0.7, w = IDLE_W): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

/** A slow eased breeze sway of the whole bloom — a gentle nod that rises out of
 *  rest and returns. Built from IDLE_W so it loops with the bob; the amplitude
 *  itself rides a `(1-cos)` envelope so it begins at zero with zero velocity. */
function breezeSway(t: number): number {
  const env = (1 - Math.cos(IDLE_W * t)) * 0.5; // 0 at t=0, eased, 1-periodic
  return Math.sin(IDLE_W * t) * 0.85 * env;
}

/** A soft petal-shimmer phase in 0..1, a slow swell that is 0 at t=0. Used to
 *  modulate the dew glint / shimmer subtly and legibly (no flash on subject). */
function shimmerPhase(t: number): number {
  return (1 - Math.cos(IDLE_W * t)) * 0.5;
}

// ── draw / anim / transition factories ───────────────────────────────────────

function makeDraw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0);
}

function makeAnim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    const bob = bobAt(t);
    // Slow breeze sway of the whole plant, additive; zero (value+velocity) at t=0.
    const sway = breezeSway(t);
    const shimmer = shimmerPhase(t); // 0..1, 0 at t=0, loops with the bob

    ctx.save();
    try {
      // The bloom rocks very slightly with the breeze (tiny, anchored low at the
      // stem so the stem base stays put) — a legible nod rather than a slide.
      const lean = sway * 0.012; // radians, ~0.6° max
      ctx.translate(sway * 0.5, 0);
      ctx.translate(STEM_BASE[0], STEM_BASE[1]);
      ctx.rotate(lean);
      ctx.translate(-STEM_BASE[0], -STEM_BASE[1]);

      paint(ctx, SP[season], bob);

      // per-season micro-motion overlays (subtle; subject stays intact)
      ctx.translate(0, bob);
      if (season === "Spring" || season === "Summer") {
        // dewy glint: a slow soft swell on an upper petal (no harsh flash).
        const glint = 0.16 + 0.26 * shimmer;
        ctx.fillStyle = `rgba(255,255,255,${glint})`;
        ctx.beginPath();
        ctx.arc(BLOOM_CX - 2.6, BLOOM_CY - 4.4, 1 + glint, 0, Math.PI * 2);
        ctx.fill();
        // a faint second dew bead glinting lower, slightly out of phase
        const g2 = 0.1 + 0.18 * shimmerPhase(t + 1.9);
        ctx.fillStyle = `rgba(255,255,255,${g2})`;
        ctx.beginPath();
        ctx.arc(BLOOM_CX + 3.4, BLOOM_CY - 1.2, 0.8 + g2, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a single spent petal drifts loose and falls (the face stays whole —
        // this is a stray extra, not one removed from the bloom). One slow,
        // readable drift per idle loop, fading out before it repeats.
        const period = (2 * Math.PI) / IDLE_W; // one drift per idle loop (~5.7s)
        const k = (t % period) / period; // 0..1 across the loop
        const ease = k * k * (3 - 2 * k); // smoothstep fall
        const px = BLOOM_CX + 6 + ease * 9;
        const py = BLOOM_CY + 2 + ease * 18;
        ctx.save();
        // fade in fast, hold, fade out near the end → 0 at the loop seam
        ctx.globalAlpha = Math.max(0, Math.sin(Math.PI * k)) * 0.95;
        ctx.translate(px, py);
        ctx.rotate(ease * 2.4 + Math.sin(t * IDLE_W) * 0.25);
        ctx.fillStyle = rgb(SP.Autumn.petalSide);
        ctx.strokeStyle = rgb(SP.Autumn.petalEdge);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-4, -3, -2, -7);
        ctx.quadraticCurveTo(0, -9, 2, -7);
        ctx.quadraticCurveTo(4, -3, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        // Winter — slow drifting snowflakes (no cold flash on the subject).
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        const span = 32;
        // each flake completes whole loops per idle period → seamless
        for (const [fx, ph, sz] of [[-7, 0.0, 1.0], [8, 0.5, 0.85], [1, 0.78, 0.7]] as const) {
          const prog = (((IDLE_W * t) / (2 * Math.PI) + ph) % 1 + 1) % 1;
          const y = -20 + prog * span;
          const x = fx + Math.sin(prog * 2 * Math.PI + ph * 6) * 3.2;
          ctx.beginPath();
          ctx.arc(x, y, sz, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } catch {
      /* never throw */
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Transition (Motion-v2): staged colour shift + a nod through the morph ─────
//
// HARD CONSTRAINT (paint-contract §2): transition(0) ≡ draw(from) and
// transition(1) ≡ draw(to) EXACTLY. The base art is always `paint(lerpP(...))`
// with a `k` that is 0 at p=0 and 1 at p=1, so the endpoints reproduce the
// neighbouring stills bit-for-bit. Every transient (the through-morph bob and
// any overlay flecks) is shaped by `sin(π·p)`, which is 0 at BOTH p=0 and p=1 —
// so transients contribute nothing at either endpoint.

/** A staged colour ease: same monotonic smootherstep at the ends, but lingers a
 *  touch in the mid-tone (the mauve mid-point of the violet→grey shift) so the
 *  colour change reads as a staged crossfade rather than a single snap. Still
 *  0 at p=0 and 1 at p=1. */
function stagedEase(p: number): number {
  const s = smoother(clamp01(p));
  // gentle S-on-S: pull slightly toward the midpoint without breaking endpoints
  const pull = Math.sin(Math.PI * s) * 0.08; // 0 at s=0 and s=1
  return clamp01(s + pull * (0.5 - s) * 2);
}

function makeTransition(from: SeasonName, to: SeasonName) {
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(pp);
    const k = stagedEase(p); // 0 at p=0, 1 at p=1
    const trans = Math.sin(Math.PI * p); // 0 at both ends, peaks at p=0.5
    const lp = lerpP(SP[from], SP[to], k);

    // A bloom nod that swells through the morph and returns to rest — the flower
    // "breathes" across the colour change. Zero at both endpoints (∝ sin(π·p)),
    // so the static endpoints are untouched.
    const bob = -0.9 * trans; // small upward lift mid-morph

    ctx.save();
    try {
      paint(ctx, lp, bob);

      // — per-morph transient overlays — all ∝ sin(π·p) so 0 at both ends —
      ctx.save();
      ctx.translate(0, bob);
      if (to === "Summer") {
        // Spring→Summer: a brief saturating bloom-glow swell as colour deepens.
        ctx.globalAlpha = 0.22 * trans;
        ctx.fillStyle = "rgba(255,250,210,1)";
        ctx.beginPath();
        ctx.arc(BLOOM_CX, BLOOM_CY, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (to === "Autumn") {
        // Summer→Autumn: a few mauve-rust motes lift off the petal edges as the
        // bloom fades, then settle — a hint of the spent-petal idle to come.
        ctx.fillStyle = `rgba(150,96,60,${0.55 * trans})`;
        for (const [mx, my, ph] of [[-5, -5, 0], [4, -6, 1.7], [6, 0, 3.1]] as const) {
          const rise = trans * 3;
          ctx.beginPath();
          ctx.arc(mx + Math.sin(ph) * 1.5, my - rise, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Autumn→Winter: frost dusts in and a few slow flakes settle as the snow
        // cap accrues. Transients vanish at both ends; the cap itself is carried
        // by the lerped snowCapAmt/padSnowAmt in `lp` (so it's exact at p=1).
        ctx.fillStyle = `rgba(236,246,255,${0.7 * trans})`;
        for (const [fx, fy] of [[-5, -6], [-0.5, -8], [4, -6.5], [-7, -2.5], [6, -3]] as const) {
          ctx.beginPath();
          ctx.arc(fx, fy, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
        // a couple of flakes drifting down onto the pad during the freeze
        ctx.fillStyle = `rgba(255,255,255,${0.8 * trans})`;
        for (const [fx, ph] of [[-6, 0.2], [7, 0.65]] as const) {
          const yy = -16 + p * 30;
          ctx.beginPath();
          ctx.arc(fx + Math.sin(p * 6 + ph * 6) * 3, yy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } catch {
      /* never throw from a transition */
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: makeDraw("Spring"), anim: makeAnim("Spring") },
  Summer: { draw: makeDraw("Summer"), anim: makeAnim("Summer") },
  Autumn: { draw: makeDraw("Autumn"), anim: makeAnim("Autumn") },
  Winter: { draw: makeDraw("Winter"), anim: makeAnim("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: makeTransition("Spring", "Summer"),
  1: makeTransition("Summer", "Autumn"),
  2: makeTransition("Autumn", "Winter"),
};
