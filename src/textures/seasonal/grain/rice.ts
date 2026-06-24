// Production seasonal art for the RICE grain tile (`tile_grain_rice`).
//
// An upright RICE PLANT growing on a small grassy/paddy pad: slender arching
// stalks fanning up from the base, each tipped with a drooping grain panicle,
// with a few thin blade leaves splaying off the lower stalks. The SAME rice-
// plant silhouette is drawn every season (identity-safe); the seasons swing
// hard on COLOUR plus a real seasonal prop (blossom / fallen leaf / snow cap +
// base snow drift), and the idle is a lively WC3-style two-tier sway:
//
//   IDLE COMMON  (~6s, win ~0.95s): a CALM RUSTLE traveling-wave — a gentle
//       breeze passes through; the arching stalks and drooping panicles bend
//       only ~9–10 design-px with a soft base squash, the drooping heads
//       swaying most. Pivot near the base. Zero pose + zero velocity at the
//       window edges (seamless).
//   IDLE RARE    (~18s, win ~1.2s, phase +3s): a BOLD GUST BEND, clearly bigger
//       than the rustle — the whole plant heels over ~0.30 rad and the tips
//       whip ~26–28 design-px (anticipation → hard bend → overshoot → settle),
//       may exit the box at apex (no clip needed). ~2.7× the common rustle, so
//       the rare event plainly reads above the idle.
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + 0..1 prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash / a per-row wave phase).
// Because every season is the same paint with tweened P, transitions are
// seamless: transition(0) ≡ draw(from), transition(1) ≡ draw(to). REST pose is
// all-zeros, so draw(season) = paint(ctx, SP[season], REST) and the idle's pose
// is 0 at every action-window edge → seamless loop.
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
  stalkLight: RGB;       // lit face of the arching stalks
  stalkMid: RGB;         // body tone of the stalks
  stalkDark: RGB;        // shaded / back stalks
  blade: RGB;            // thin blade leaves splaying off the lower stalks
  grainLight: RGB;       // lit grain on the drooping panicles
  grainDark: RGB;        // shaded grain
  padGrass: RGB;         // top of the grassy/paddy pad
  padDark: RGB;          // shaded pad underside / wet rim
  water: RGB;            // hint of wet paddy water on the pad
  soil: RGB;             // contact / base soil under the plant
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  gloss: number;         // 0..1 specular gloss-streak strength on the grains
  ripeness: number;      // 0..1 how heavy / drooping the panicles read (golden = heavy)
  size: number;          // 0..1 fullness of the panicles / plant body
  wetAmt: number;        // 0..1 dewy / wet paddy pad sheen (spring)
  frostAmt: number;      // 0..1 cool frost dusting on the stalks (winter)
  snowCapAmt: number;    // 0..1 snow caps on the panicle heads (winter)
  padSnowAmt: number;    // 0..1 snow blanket / drift at the base (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST.
 *  `wave` drives a traveling rustle phase that ripples up the stalks. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // base lean, radians (whole plant tilts side to side)
  squashX: number; // additive horizontal scale (+0.18 = 18% wider)
  squashY: number; // additive vertical scale (+0.18 = 18% taller)
  wave: number;    // traveling-wave amplitude in design px (rustle through stalks)
  wavePhase: number; // phase of the traveling wave (radians)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, wave: 0, wavePhase: 0 };

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
    stalkLight: lerpRGB(a.stalkLight, b.stalkLight, t),
    stalkMid: lerpRGB(a.stalkMid, b.stalkMid, t),
    stalkDark: lerpRGB(a.stalkDark, b.stalkDark, t),
    blade: lerpRGB(a.blade, b.blade, t),
    grainLight: lerpRGB(a.grainLight, b.grainLight, t),
    grainDark: lerpRGB(a.grainDark, b.grainDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    water: lerpRGB(a.water, b.water, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    size: lerp(a.size, b.size, t),
    wetAmt: lerp(a.wetAmt, b.wetAmt, t),
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
    ripeness: clamp01(p.ripeness),
    size: clamp01(p.size),
    wetAmt: clamp01(p.wetAmt),
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
  // Spring — young GREEN rice, bright green blades, slim pale-green panicles
  // not yet heavy, a small blossom on a dewy/wet pad; cool-bright light.
  Spring: {
    stalkLight: [168, 224, 96],
    stalkMid: [104, 188, 64],
    stalkDark: [54, 132, 48],
    blade: [126, 206, 78],
    grainLight: [206, 228, 138],
    grainDark: [138, 178, 84],
    padGrass: [126, 214, 84],
    padDark: [64, 146, 56],
    water: [150, 214, 196],
    soil: [120, 84, 48],
    outline: [34, 78, 30],
    light: [226, 248, 220],
    lightAmt: 0.18,
    gloss: 0.4,
    ripeness: 0.28,
    size: 0.7,
    wetAmt: 0.85,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — peak lush GREEN plant, panicles forming pale & full, high gloss,
  // warm bright light.
  Summer: {
    stalkLight: [150, 216, 84],
    stalkMid: [86, 176, 56],
    stalkDark: [44, 120, 44],
    blade: [104, 196, 66],
    grainLight: [228, 232, 150],
    grainDark: [176, 190, 96],
    padGrass: [80, 184, 70],
    padDark: [40, 118, 50],
    water: [120, 196, 178],
    soil: [128, 88, 48],
    outline: [28, 92, 36],
    light: [255, 246, 206],
    lightAmt: 0.2,
    gloss: 1.0,
    ripeness: 0.55,
    size: 1.0,
    wetAmt: 0.3,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — the harvest peak: GOLDEN heavy ripe panicles drooping hard, blades
  // tan/dry, a fallen leaf on the pad, dulled gloss, amber light.
  Autumn: {
    stalkLight: [222, 186, 98],
    stalkMid: [186, 146, 62],
    stalkDark: [132, 98, 44],
    blade: [186, 162, 86],
    grainLight: [255, 212, 92],
    grainDark: [206, 150, 40],
    padGrass: [164, 152, 80],
    padDark: [110, 90, 46],
    water: [150, 138, 96],
    soil: [120, 78, 42],
    outline: [78, 52, 22],
    light: [250, 200, 130],
    lightAmt: 0.24,
    gloss: 0.34,
    ripeness: 1.0,
    size: 0.95,
    wetAmt: 0.1,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — frosted rice: dried TAN stalks with a bold SNOW CAP on the
  // panicles + a snow blanket/drift at the base, iced paddy, cool blue-grey
  // light. Clearly snowy, still reads as rice.
  Winter: {
    stalkLight: [196, 192, 162],
    stalkMid: [156, 152, 124],
    stalkDark: [110, 110, 96],
    blade: [168, 168, 142],
    grainLight: [214, 208, 176],
    grainDark: [156, 150, 124],
    padGrass: [184, 204, 222],
    padDark: [124, 152, 180],
    water: [182, 206, 226],
    soil: [132, 116, 102],
    outline: [56, 56, 60],
    light: [200, 224, 255],
    lightAmt: 0.34,
    gloss: 0.3,
    ripeness: 0.62,
    size: 0.82,
    wetAmt: 0,
    frostAmt: 0.82,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Rice-plant geometry — the SAME silhouette every season ───────────────────
// A set of stalks fan up from a tight base near the pad, each arching outward
// and tipped with a drooping grain panicle. Blade leaves splay off the lower
// stalks. The pivot is near the base so lean/wave rock the TOPS.

const BASE_Y = 15;        // where the stalks emerge from the pad
const PIVOT_Y = BASE_Y - 1; // rock/lean/wave about a point near the base

interface Stalk {
  baseX: number;  // x at the base (tight cluster)
  apexX: number;  // x at the top of the arch (fans outward)
  apexY: number;  // y at the top of the arch (negative = up)
  side: number;   // -1 panicle nods/droops left, +1 right
  bladeAt: number; // 0..1 height up the stalk where a blade splays (0 = none)
  rowU: number;   // 0..1 used to phase the traveling rustle wave up the stalks
}

// Ordered back-to-front so nearer stalks overlap farther ones a touch.
const STALKS: Stalk[] = [
  { baseX: -2.5, apexX: -12.5, apexY: -16, side: -1, bladeAt: 0.42, rowU: 0.15 }, // back-left
  { baseX: 2.5, apexX: 12.5, apexY: -16, side: 1, bladeAt: 0.4, rowU: 0.25 },     // back-right
  { baseX: -1.4, apexX: -7.0, apexY: -22, side: -1, bladeAt: 0.55, rowU: 0.55 },  // mid-left
  { baseX: 1.6, apexX: 7.5, apexY: -21, side: 1, bladeAt: 0.5, rowU: 0.65 },      // mid-right
  { baseX: 0.2, apexX: -1.0, apexY: -26, side: -1, bladeAt: 0, rowU: 1.0 },       // tall centre
];

/** Geometry of one arching stalk for a given ripeness (droop) + pose wave.
 *  Returns base, apex, and the drooping panicle tip. The apex extent is
 *  constant; ripeness only curls the panicle tip lower; the pose wave bends the
 *  upper arc horizontally (rustle), most at the tip. */
function stalkGeom(
  st: Stalk,
  ripeness: number,
  waveAmt: number,
  wavePhase: number,
) {
  const baseX = st.baseX;
  // Traveling wave: phase advances with how high the row sits → ripple up.
  const bend = waveAmt * Math.sin(wavePhase + st.rowU * 2.4);
  const apexX = st.apexX + bend * 0.62;
  const apexY = st.apexY;
  // The drooping panicle nods beyond the apex, curling down/out with ripeness.
  const tipX = apexX + st.side * (2 + ripeness * 6) + bend;
  const tipY = apexY + 4 + ripeness * 13;
  return { baseX, apexX, apexY, tipX, tipY, bend };
}

/** Trace one stalk's rachis path (base → apex → drooping tip). */
function stalkPath(
  ctx: CanvasRenderingContext2D,
  g: { baseX: number; apexX: number; apexY: number; tipX: number; tipY: number },
): void {
  ctx.beginPath();
  ctx.moveTo(g.baseX, BASE_Y);
  ctx.quadraticCurveTo(
    g.baseX + (g.apexX - g.baseX) * 0.35,
    -2,
    g.apexX,
    g.apexY,
  );
  ctx.quadraticCurveTo(
    g.apexX + (g.tipX - g.apexX) * 0.6,
    g.apexY + 1,
    g.tipX,
    g.tipY,
  );
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
    wave: safeNum(rawPose.wave),
    wavePhase: safeNum(rawPose.wavePhase),
  };

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grassy/paddy ellipse (does NOT move with the pose) ──────
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

    // wet paddy water hint pooled in the pad centre (spring dewy / summer)
    if (p.wetAmt > 0.01) {
      ctx.fillStyle = rgba(p.water, 0.5 * p.wetAmt);
      ctx.beginPath();
      ctx.ellipse(0, 19.4, 12, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.3 * p.wetAmt);
      ctx.beginPath();
      ctx.ellipse(-4, 18.6, 4.6, 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
    }

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

    // pad snow blanket / drift (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // a mounded drift hugging the plant base
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 16.8, 9, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
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

    // ── Contact shadow under the plant (follows the lean for grounding) ───────
    const tipShift = pose.lean * (PIVOT_Y - STALKS[STALKS.length - 1].apexY);
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.4;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.16, BASE_Y + 5.5, 8 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.26 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.18, BASE_Y + 6, 10 * shadowSpread, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the rice plant, under the idle pose transform ───────────────
    ctx.save();
    // Pivot near the base so lean rocks the TOPS side-to-side and squash anchors
    // at the base (it "grows from" the pad). bob raises the whole plant.
    ctx.translate(0, PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PIVOT_Y);

    const ripe = p.ripeness;
    const waveAmt = pose.wave;
    const wavePhase = pose.wavePhase;

    // 1) Blade leaves first (behind the stalks), splaying off the lower stalks.
    STALKS.forEach((st) => {
      if (st.bladeAt <= 0) return;
      const g = stalkGeom(st, ripe, waveAmt, wavePhase);
      // attach point partway up the stalk's lower arc
      const u = st.bladeAt;
      const ax = lerp(g.baseX, g.apexX, u);
      const ay = lerp(BASE_Y, g.apexY, u);
      const dir = st.side;
      const bladeBend = waveAmt * 0.5 * Math.sin(wavePhase + st.rowU * 2.4 + 0.6);
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(
        ax + dir * 7 + bladeBend,
        ay - 1,
        ax + dir * 12 + bladeBend * 1.6,
        ay + 5 + ripe * 3,
      );
      ctx.stroke();
      ctx.strokeStyle = rgb(p.blade);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(
        ax + dir * 7 + bladeBend,
        ay - 1,
        ax + dir * 12 + bladeBend * 1.6,
        ay + 5 + ripe * 3,
      );
      ctx.stroke();
    });

    // 2) Stalks back-to-front: outline pass, then lit rachis, then panicle.
    STALKS.forEach((st) => {
      const g = stalkGeom(st, ripe, waveAmt, wavePhase);

      // outline / dark backing
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = 3.0;
      stalkPath(ctx, g);
      ctx.stroke();
      // mid stalk
      ctx.strokeStyle = rgb(p.stalkMid);
      ctx.lineWidth = 2.0;
      stalkPath(ctx, g);
      ctx.stroke();
      // lit stalk highlight on the upper-left face
      ctx.strokeStyle = rgb(p.stalkLight);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(g.baseX - 0.5, BASE_Y);
      ctx.quadraticCurveTo(
        g.baseX + (g.apexX - g.baseX) * 0.35 - 0.5,
        -2,
        g.apexX - 0.5,
        g.apexY,
      );
      ctx.stroke();

      // ── drooping grain panicle from apex → tip ──
      const n = 9 + Math.round(p.size * 3);
      const plump = 0.6 + p.size * 0.6;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1); // 0 near apex, 1 at drooping tip
        const ax = g.apexX + (g.tipX - g.apexX) * u;
        const ay = g.apexY + (g.tipY - g.apexY) * u;
        const bow = Math.sin(u * Math.PI) * 2.0;
        const gx = ax + st.side * bow * 0.3;
        const gy = ay - bow;
        // alternate grain to a side of the rachis
        const off = (i % 2 === 0 ? 1 : -1) * (1.2 + u * 0.6);
        const fx = gx + off;
        const fy = gy + Math.abs(off) * 0.15;
        const r = (1.0 + (1 - u) * 0.5) * plump;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(st.side * 0.5 + u * st.side * 0.4);
        ctx.fillStyle = rgb(p.grainDark);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.95, r * 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb(p.grainLight);
        ctx.beginPath();
        ctx.ellipse(-0.35, -0.3, r * 0.6, r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // tiny gloss speck on the grain
        if (p.gloss > 0.02) {
          ctx.fillStyle = rgba([255, 255, 255], 0.4 + 0.5 * p.gloss);
          ctx.beginPath();
          ctx.ellipse(-0.4, -0.6, r * 0.3, r * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // an awn (bristle) off the topmost grain near the apex
        if (i < 2) {
          ctx.strokeStyle = rgba(p.stalkDark, 0.75);
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(fx, fy - r);
          ctx.lineTo(fx + st.side * 1.4, fy - r - 3.5);
          ctx.stroke();
        }
      }

      // snow cap cresting this panicle head (winter)
      if (p.snowCapAmt > 0.02) {
        const a = p.snowCapAmt;
        const capX = (g.apexX + g.tipX) / 2 + (g.bend) * 0.7;
        const capY = (g.apexY + g.tipY) / 2 - 2.4;
        ctx.fillStyle = rgba([248, 252, 255], 0.95 * a);
        ctx.beginPath();
        ctx.ellipse(capX, capY, 3.4, 2.0, st.side * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([210, 226, 244], 0.5 * a);
        ctx.beginPath();
        ctx.ellipse(capX, capY + 0.8, 3.0, 1.2, st.side * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // frost dusting along the stalk (winter)
      if (p.frostAmt > 0.02) {
        ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
        for (let k = 0; k < 3; k++) {
          const u = 0.25 + k * 0.28;
          const fx = lerp(g.baseX, g.apexX, u);
          const fy = lerp(BASE_Y, g.apexY, u);
          ctx.beginPath();
          ctx.arc(fx - 0.6, fy, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // small straw collar where the stalks gather at the base
    ctx.fillStyle = rgb(p.stalkDark);
    ctx.beginPath();
    ctx.ellipse(0, BASE_Y - 1, 4.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.stalkMid);
    ctx.beginPath();
    ctx.ellipse(0, BASE_Y - 1.8, 3.4, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

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

// An asymmetric anticipation→peak→overshoot→settle curve, 0 at q=0 and q=1.
// (1-cos) envelope keeps velocity zero at the edges.
function anticipate(q: number): number {
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common RUSTLE traveling-wave every ~6s (win 0.95s), rare GUST BEND every
 *   ~18s (win 1.2s, phase +3s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, wave: 0, wavePhase: 0 };

  // ── COMMON: RUSTLE traveling-wave sway (~6s, win 0.95s) — kept CALM ──
  // A gentle ripple of wind: stalks bend only ~9–10px with a soft base squash,
  // the drooping heads (tips) swaying most. Deliberately understated so the rare
  // gust below clearly reads as a bigger event. wave amplitude in design px;
  // wavePhase advances through the window so the ripple travels up the stalks.
  const qC = actionQ(t, 6.0, 0.95, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    // wave amplitude ~9.5px at peak. hump() (sin^2) has zero value AND zero
    // slope at q=0/1, so even with each stalk's phase offset the per-stalk bend
    // velocity is exactly 0 at the window edges (seamless).
    pose.wave += 9.5 * hump(qC);
    // phase rolls ~1.5 cycles across the window (endpoints at 0 and 3π, sin=0)
    pose.wavePhase = qC * Math.PI * 3;
    // a small whole-plant lean rides along, biased to one side (wind direction)
    pose.lean += 0.035 * env * Math.sin(qC * Math.PI * 2);
    // light base squash as the plant takes the breeze
    pose.squashY += -0.035 * hump(qC);
    pose.squashX += 0.028 * hump(qC);
    // a faint windup tilt keeps anticipate() in the seamless-curve toolkit
    pose.lean += 0.012 * anticipate(qC);
  }

  // ── RARE: STRONG GUST BEND (~18s, win 1.2s, phase +3s) — pushed BOLD ──
  // A clearly bigger event than the rustle: anticipation (lean slightly INTO the
  // wind) → a hard bend ~26–28px at the tips with the whole plant heeling over
  // ~0.30 rad → overshoot the other way → settle. May exit the box at the apex
  // (fine, no clip). Every contribution is multiplied by `env = sin(π·qS)` so
  // the whole gust has zero value AND zero velocity at the window edges — and,
  // because env→0 with zero slope there, the wave's per-stalk phase offsets stay
  // seamless too (mirrors corn.ts's env-wrapped gust idiom).
  const qS = actionQ(t, 18.0, 1.2, 3.0);
  if (qS >= 0) {
    const env = Math.sin(Math.PI * qS); // 0..1..0, wraps every term → clean edges
    // Anticipation lobe: a small reverse lean early (q<0.2).
    const anti = qS < 0.2 ? Math.sin((qS / 0.2) * Math.PI) : 0; // 0..1..0
    // Main bend: a strong forward sweep peaking ~q=0.5.
    const bendWin = qS >= 0.12 && qS < 0.82 ? (qS - 0.12) / 0.7 : -1;
    const bend = bendWin >= 0 ? Math.sin(bendWin * Math.PI) : 0; // 0..1..0
    // Overshoot/settle: a spring-back the other way late in the window.
    const overWin = qS >= 0.66 ? Math.min(1, (qS - 0.66) / 0.34) : -1;
    const over = overWin >= 0 ? Math.sin(overWin * Math.PI) : 0; // 0..1..0

    // Big traveling-wave bend at the tips (~26–28px) plus a hard whole-plant
    // lean — roughly 2.7× the common rustle so the gust is unmistakable.
    pose.wave += env * (bend * 28.0 - anti * 7.0 + over * 9.0);
    // run more wave cycles for a richer gust ripple up the plant
    pose.wavePhase = qS * Math.PI * 2.2;
    // whole-plant lean: anticipate against the wind, then heel hard with it,
    // then overshoot the opposite way and settle.
    pose.lean += env * (-anti * 0.09 + bend * 0.30 - over * 0.12);
    // squash: crouch into the gust, stretch slightly at peak bend
    pose.squashY += env * (anti * 0.05 + bend * 0.08 - over * 0.04);
    pose.squashX += env * (-anti * 0.04 - bend * 0.07 + over * 0.04);
    pose.bob += env * (-bend * 2.0);
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
    // own colour/brightness). Kept tiny so the POSE actions are the star.
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
      // Summer: no extra dressing — the lush green + gloss + rustle is the show.
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
