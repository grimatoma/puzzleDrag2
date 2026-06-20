// Seasonal art for the RAMBUTAN fruit tile (`tile_fruit_rambutan`).
// Module: src/textures/seasonal/fruit/rambutan.ts
//
// CATEGORY: Fruit. The iconic harvested ITEM only — a small cluster of 2–3 oval
// rambutan fruit, each covered in soft curved spiky HAIRS (the signature shaggy
// spines), on a short sprig with one leaf, resting low-centre on the pad. The
// hairy-cluster SILHOUETTE is IDENTICAL every season (same fruit, same spines,
// same sprig) — only colour, ripeness shade and the small dressing/frost/snow
// amounts change. Ripeness = colour, never an identity change.
//
// Architecture mirrors veg/pepper.ts exactly: ONE parameterized
// `paint(ctx, p, bob)` drives all four seasons and the three forward morphs:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
// so transition(0) ≡ draw(from) and transition(1) ≡ draw(to) — seamless. The
// bob uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity.
//
// PALETTE LOCK: ripe rambutan stays RED with soft hairy spines; ripeness shows
// as green→red→crimson→snow-dulled-red in surface colour only.
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

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — green spiky young fruit, hairs greenish; dewy lime pad + blossom.
  Spring: {
    skinLight: [168, 214, 104],
    skinMid: [112, 174, 70],
    skinDark: [64, 120, 50],
    spineLight: [186, 222, 120],
    spineDark: [96, 150, 64],
    leaf: [108, 168, 70],
    stem: [126, 110, 70],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [44, 70, 34],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.12,
    gloss: 0.2,
    spineTipGreen: 0.9,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — full ripe RED hairy fruit with green-tipped spines (PEAK); mid-green pad.
  Summer: {
    skinLight: [240, 78, 64],
    skinMid: [206, 36, 40],
    skinDark: [142, 18, 30],
    spineLight: [232, 86, 70],
    spineDark: [150, 26, 32],
    leaf: [86, 150, 56],
    stem: [120, 92, 56],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [82, 16, 24],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.8,
    gloss: 0.9,
    spineTipGreen: 0.55, // green-tipped spines at peak
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deep crimson overripe fruit, spines darkening; olive-tan pad + leaves.
  Autumn: {
    skinLight: [186, 52, 48],
    skinMid: [150, 28, 36],
    skinDark: [92, 18, 28],
    spineLight: [156, 56, 50],
    spineDark: [96, 30, 30],
    leaf: [150, 120, 60],
    stem: [110, 82, 48],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [66, 16, 22],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.42,
    spineTipGreen: 0.12, // spines darkening, little green left
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — snow-dusted dull-red fruit + frost on spines; red still visible,
  // snowy pad, cool light.
  Winter: {
    skinLight: [180, 86, 78],
    skinMid: [144, 52, 56],
    skinDark: [92, 36, 46],
    spineLight: [176, 100, 96],
    spineDark: [110, 56, 60],
    leaf: [118, 130, 96],
    stem: [110, 96, 80],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [54, 38, 50],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.85,
    gloss: 0.22,
    spineTipGreen: 0.05,
    frostAmt: 0.72,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Cluster geometry constants — the SAME hairy-cluster silhouette every season.
// Three oval fruit: two front-low, one tucked behind/above; each ~oval ~12 tall.
// Each fruit gets a deterministic ring of soft curved spines (the signature
// shaggy hairs). Origin-centered, resting low on the pad.
interface FruitDef {
  cx: number;
  cy: number; // centre (before bob)
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

/** Deterministic pseudo-random in [0,1) for spine jitter — stable per call. */
function jit(i: number): number {
  const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Draw the soft curved spines (hairs) radiating from one fruit. The spine
 *  LAYOUT is identical every season (same silhouette); only colours / frost
 *  change. `seed` offsets the deterministic jitter so each fruit differs. */
function drawSpines(
  ctx: CanvasRenderingContext2D,
  f: FruitDef,
  bob: number,
  seed: number,
  p: P,
  pass: "outline" | "fill",
): void {
  const cx = f.cx;
  const cy = f.cy + bob;
  const n = f.spines;
  for (let i = 0; i < n; i++) {
    const base = (i / n) * Math.PI * 2 + f.rot;
    // bias spines outward; skip the very bottom (sits in the cluster)
    const ang = base + (jit(i + seed) - 0.5) * 0.18;
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
function fruitPath(ctx: CanvasRenderingContext2D, f: FruitDef, bob: number, grow = 0): void {
  ctx.beginPath();
  ctx.ellipse(f.cx, f.cy + bob, f.rx + grow, f.ry + grow, f.rot, 0, Math.PI * 2);
}

/** Draw a single fruit body (cel-shaded rind, no spines). */
function drawFruitBody(ctx: CanvasRenderingContext2D, f: FruitDef, bob: number, p: P): void {
  const cy = f.cy + bob;
  // mid body
  ctx.fillStyle = rgb(p.skinMid);
  fruitPath(ctx, f, bob);
  ctx.fill();
  // lit upper-left face
  ctx.save();
  fruitPath(ctx, f, bob);
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

    // ── Soil contact patch + contact shadow under the cluster ───────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, 16 + bob + 1.5, 10, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, 16 + bob + 2, 12, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Sprig: short woody stem rising to one leaf (behind the cluster) ──────
    const sy = -3 + bob;
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(1.5, 1.5 + bob);
    ctx.quadraticCurveTo(3.5, sy - 2, 5.5, sy - 7);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.stem);
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(1.5, 1.5 + bob);
    ctx.quadraticCurveTo(3.5, sy - 2, 5.5, sy - 7);
    ctx.stroke();
    // one leaf at the sprig tip
    ctx.save();
    ctx.translate(5.5, sy - 7);
    ctx.rotate(0.5);
    fruitLeaf(ctx, p);
    ctx.restore();

    // ── Subject: the hairy cluster (SAME silhouette every season) ───────────
    // Draw back fruit first (the tucked-up one), then the two front fruit, so
    // the front overlaps. For each: spine OUTLINE pass, body, then spine FILL.
    const order = [2, 0, 1]; // back, front-left, front-right
    order.forEach((idx) => {
      const f = FRUIT[idx];
      // soft dark outline ring under the body
      fruitPath(ctx, f, bob, 1.1);
      ctx.fillStyle = rgb(p.outline);
      ctx.fill();
      // spine outline pass (dark, fat) then body, then lit spine pass over
      drawSpines(ctx, f, bob, idx * 7 + 1, p, "outline");
      drawFruitBody(ctx, f, bob, p);
      drawSpines(ctx, f, bob, idx * 7 + 1, p, "fill");
    });

    // snow caps on the shoulders of the cluster (winter) — over the spines
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      [FRUIT[0], FRUIT[1], FRUIT[2]].forEach((f) => {
        const cy = f.cy + bob;
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

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.9, w = 1.5): number {
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

      // Soft spine quiver — a faint shimmering veil over the cluster every
      // season (the hairs "quiver subtly"); additive, tiny, never the silhouette.
      const quiver = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(t * 3.4));
      ctx.strokeStyle = `rgba(255,255,255,${quiver})`;
      ctx.lineWidth = 0.8;
      FRUIT.forEach((f, idx) => {
        const cy = f.cy + bob;
        const a = (idx * 1.3) - 0.8 + Math.sin(t * 2.6 + idx) * 0.05;
        ctx.beginPath();
        ctx.moveTo(f.cx + Math.sin(a) * f.rx, cy - Math.cos(a) * f.ry);
        ctx.lineTo(f.cx + Math.sin(a) * (f.rx + 4), cy - Math.cos(a) * (f.ry + 4));
        ctx.stroke();
      });

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint travelling gently on the cluster
        const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = 2 + bob + Math.sin(t * 1.1) * 1.4;
        ctx.beginPath();
        ctx.arc(-6, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // a faint glint on the upper-left fruit shoulder (peak)
        const s = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.8));
        ctx.fillStyle = `rgba(255,255,255,${s})`;
        ctx.beginPath();
        ctx.ellipse(-9, 4 + bob, 1.3, 2.0, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // faint slow amber sheen pulsing on the shoulder
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,228,190,${s})`;
        ctx.beginPath();
        ctx.ellipse(-5, 3 + bob, 5.2, 3.6, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + cold sheen
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 5 + bob, 7, 5, -0.2, 0, Math.PI * 2);
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
