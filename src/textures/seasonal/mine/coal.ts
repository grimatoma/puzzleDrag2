// Seasonal art for the COAL mineral tile (`tile_mine_coal`).
//
// A cluster of 2–3 glossy black ANTHRACITE COAL chunks — angular lumps with
// sharp flat facets — resting together on a low rocky/earth pad. Per the
// Mineral framing, the coal's own colour is LOCKED black in EVERY season and
// stays clearly readable as SHINY (not a hole) via crisp cool-steel specular
// highlights on the facets: base black ~[40,40,44], facet highlights ~[110,
// 116,128] (cool steel sheen), darkest crevices ~[8,8,12]. The SAME chunk
// silhouette is drawn every season — only the global light wash, a little
// spring/summer moss fleck, an autumn fallen leaf, and a winter snow cap +
// frost on the upward faces change. The black is locked; the chunks stay
// glossy under the winter snow (no white-out).
//
// Enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Origin-centered in the −24..+24 design box, light from upper-left, soft
// shadow lower-right, flat cel-shaded with a soft dark outline. Pure Canvas-2D
// vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly.
 *  PALETTE LOCK: the coal surfaces stay glossy black every season; only the
 *  highlight TINT nudges cool/warm and the dressing amounts change. */
interface P {
  coalLight: RGB;   // lit facet sheen (cool steel highlight; LOCKED-ish bright)
  coalMid: RGB;     // body tone of the coal (locked black)
  coalDark: RGB;    // darkest crevices / shadowed facets (near-black)
  specTint: RGB;    // hard specular catch-light colour (cool/warm by season)
  padRock: RGB;     // top of the rocky/earth pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the cluster
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  gloss: number;    // 0..1 specular gloss strength on the facets (peak = summer)
  shadowAmt: number; // 0..1 contact-shadow strength (strongest in summer)
  mossAmt: number;  // 0..1 moss/grass fleck at the cluster base (spring/summer)
  frostAmt: number; // 0..1 cool frost dusting on the upward facets (winter)
  snowCapAmt: number; // 0..1 snow cap sitting on top of the chunks (winter)
  padSnowAmt: number; // 0..1 snow blanket on the pad (winter)
  dewAmt: number;   // 0..1 dewy/damp sheen on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf resting on the pad (autumn)
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
    coalLight: lerpRGB(a.coalLight, b.coalLight, t),
    coalMid: lerpRGB(a.coalMid, b.coalMid, t),
    coalDark: lerpRGB(a.coalDark, b.coalDark, t),
    specTint: lerpRGB(a.specTint, b.specTint, t),
    padRock: lerpRGB(a.padRock, b.padRock, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, t),
    mossAmt: lerp(a.mossAmt, b.mossAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    dewAmt: lerp(a.dewAmt, b.dewAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    gloss: clamp01(p.gloss),
    shadowAmt: clamp01(p.shadowAmt),
    mossAmt: clamp01(p.mossAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    dewAmt: clamp01(p.dewAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK: coal stays glossy black every season. coalMid is the locked
// body black; coalLight is the cool-steel facet sheen; coalDark are the near-
// black crevices. Only the specular TINT nudges cool(spring/winter)→warm
// (summer/autumn), the gloss/shadow amounts, and the dressing change. The chunks
// keep reading as SHINY (not a hole) because the facet highlights and the hard
// catch-light edges stay crisp in every set. coalMid hovers near [40,40,44]
// (body black) and coalDark near [8,8,12] (darkest crevices) in every set.

const SP: Record<SeasonName, P> = {
  // Spring — cool blue-ish facet sheen, slightly damp; lime moss fleck at base;
  // cool-bright light; dewy pad.
  Spring: {
    coalLight: [108, 116, 132], // cool steel sheen (blue-ish)
    coalMid: [42, 43, 49],
    coalDark: [9, 9, 14],
    specTint: [212, 230, 248],  // cool catch-light
    padRock: [150, 150, 142],
    padDark: [96, 94, 88],
    soil: [120, 102, 78],
    outline: [16, 16, 20],
    light: [228, 240, 246],
    lightAmt: 0.15,
    gloss: 0.6,
    shadowAmt: 0.5,
    mossAmt: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0.6,
    fallenLeafAmt: 0,
  },
  // Summer — warm hard highlights, strongest shadow, PEAK gloss; warm light;
  // dry rocky pad, light moss.
  Summer: {
    coalLight: [118, 120, 126], // warmer/brighter steel sheen
    coalMid: [40, 40, 43],
    coalDark: [8, 8, 11],
    specTint: [255, 250, 232],  // warm hard catch-light
    padRock: [168, 158, 132],
    padDark: [110, 102, 80],
    soil: [128, 104, 74],
    outline: [14, 14, 17],
    light: [255, 242, 210],
    lightAmt: 0.17,
    gloss: 1.0,
    shadowAmt: 1.0,
    mossAmt: 0.3,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — amber-tinted highlights, low amber light; olive-tan earthy pad; a
  // fallen leaf on the pad.
  Autumn: {
    coalLight: [114, 110, 110], // amber-warmed steel sheen
    coalMid: [41, 40, 42],
    coalDark: [9, 9, 12],
    specTint: [252, 224, 176],  // amber catch-light
    padRock: [156, 140, 96],
    padDark: [108, 94, 60],
    soil: [120, 92, 56],
    outline: [18, 15, 13],
    light: [248, 208, 146],
    lightAmt: 0.2,
    gloss: 0.55,
    shadowAmt: 0.6,
    mossAmt: 0.1,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; snow cap on top of the chunks + frost on the
  // upward faces; coal stays glossy black underneath; snow-dusted pad.
  Winter: {
    coalLight: [110, 120, 138], // cold steel sheen
    coalMid: [40, 41, 47],
    coalDark: [9, 10, 16],
    specTint: [214, 232, 252],  // cold catch-light
    padRock: [178, 196, 214],
    padDark: [120, 144, 170],
    soil: [126, 118, 110],
    outline: [18, 19, 26],
    light: [208, 228, 252],
    lightAmt: 0.3,
    gloss: 0.55,
    shadowAmt: 0.45,
    mossAmt: 0,
    frostAmt: 0.7,
    snowCapAmt: 0.9,
    padSnowAmt: 0.9,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Geometry (the SAME coal-cluster silhouette every season) ─────────────────
// Origin-centered. Three angular black lumps resting together on the pad: a big
// back-left chunk, a mid right chunk, and a small front chunk. Each is a sharp
// faceted polygon (NOT round) so it reads as cleaved coal. Bob is added at draw
// time so the whole cluster lifts together.

const CLUSTER_BASE_Y = 16; // contact of the cluster with the pad

/** One coal chunk: outline polygon + internal facets (light/mid/dark) + a hard
 *  specular catch-light edge so the black reads SHINY. All in design coords;
 *  bob added at draw time. Constant for all P. */
interface Chunk {
  outline: Array<[number, number]>;
  // facets reference indices into a shared local point list via explicit pts.
  facets: Array<{ pts: Array<[number, number]>; tone: 0 | 1 | 2 }>;
  // the bright hard catch-light edge (a short polyline on a top facet ridge).
  spec: Array<[number, number]>;
  // a small sharp specular dot on the brightest facet (the "glint").
  glint: [number, number];
}

// Big back-left chunk — the tallest lump, crown near y≈-12.
const CHUNK_A: Chunk = {
  outline: [
    [-16, 15],   // base-left foot
    [-17, 8],    // lower-left shoulder
    [-13, -4],   // up the lit left face
    [-9, -12],   // tall left crown tip
    [-3, -8],    // crown notch
    [-1, -13],   // second crown peak
    [3, -5],     // right crown shoulder
    [4, 6],      // right face
    [1, 15],     // base-right foot (tucks behind front chunk)
    [-8, 16],    // base centre
  ],
  facets: [
    // lit upper-left face (catches the upper-left light)
    { pts: [[-13, -4], [-9, -12], [-3, -8], [-7, 2]], tone: 0 },
    // lit crown wedge
    { pts: [[-9, -12], [-3, -8], [-1, -13]], tone: 0 },
    // mid front body
    { pts: [[-7, 2], [-3, -8], [3, -5], [1, 8]], tone: 1 },
    // shadowed right face
    { pts: [[3, -5], [4, 6], [1, 15], [1, 8]], tone: 2 },
    // shadowed lower-left underside
    { pts: [[-16, 15], [-17, 8], [-13, -4], [-7, 2], [-8, 16]], tone: 2 },
    // mid base block
    { pts: [[-7, 2], [1, 8], [1, 15], [-8, 16]], tone: 1 },
  ],
  spec: [[-9, -12], [-3, -8]],          // bright ridge along the crown
  glint: [-7, -7],                       // sharp specular dot on the lit facet
};

// Mid right chunk — a blockier lump to the right, crown near y≈-6.
const CHUNK_B: Chunk = {
  outline: [
    [2, 16],     // base-left foot (overlaps chunk A base)
    [3, 5],      // lower-left shoulder
    [7, -3],     // up the lit face
    [11, -8],    // crown tip
    [15, -3],    // right crown shoulder
    [17, 6],     // right face
    [16, 14],    // base-right foot
    [9, 16],     // base centre
  ],
  facets: [
    // lit upper-left face
    { pts: [[7, -3], [11, -8], [15, -3], [12, 4]], tone: 0 },
    // mid front
    { pts: [[3, 5], [7, -3], [12, 4], [9, 12]], tone: 1 },
    // shadowed right face
    { pts: [[15, -3], [17, 6], [16, 14], [12, 4]], tone: 2 },
    // shadowed base
    { pts: [[2, 16], [3, 5], [9, 12], [9, 16]], tone: 2 },
    // mid base block
    { pts: [[9, 12], [12, 4], [16, 14], [9, 16]], tone: 1 },
  ],
  spec: [[7, -3], [11, -8]],             // bright ridge on the crown
  glint: [9, -4],
};

// Small front chunk — a low wedge sitting in front, crown near y≈4.
const CHUNK_C: Chunk = {
  outline: [
    [-9, 17],    // base-left
    [-8, 11],    // shoulder
    [-3, 4],     // crown tip
    [3, 8],      // crown notch
    [6, 13],     // right shoulder
    [5, 18],     // base-right
    [-3, 18],    // base centre
  ],
  facets: [
    // lit upper-left face
    { pts: [[-8, 11], [-3, 4], [3, 8], [-1, 12]], tone: 0 },
    // mid front body
    { pts: [[-9, 17], [-8, 11], [-1, 12], [-3, 18]], tone: 1 },
    // shadowed right face
    { pts: [[3, 8], [6, 13], [5, 18], [-1, 12]], tone: 2 },
    // base block
    { pts: [[-1, 12], [5, 18], [-3, 18]], tone: 1 },
  ],
  spec: [[-3, 4], [3, 8]],               // bright ridge along the front crown
  glint: [-1, 8],
};

// Draw order: shadowed back chunk first, then the front ones overlap it.
const CHUNKS: Chunk[] = [CHUNK_A, CHUNK_B, CHUNK_C];

function chunkOutlinePath(ctx: CanvasRenderingContext2D, ch: Chunk, bob: number): void {
  ctx.beginPath();
  ch.outline.forEach(([x, y], i) => {
    const py = y + bob;
    if (i === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  });
  ctx.closePath();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** Draw one coal chunk: dark outline, cel-shaded facets clipped to silhouette,
 *  then crisp specular ridge + glint so the black reads SHINY. Frost/snow cap
 *  on the upward faces is layered after (winter) by the caller's amounts. */
function paintChunk(ctx: CanvasRenderingContext2D, ch: Chunk, p: P, bob: number): void {
  // 1) soft dark outline pass (drawn fatter, dark first)
  chunkOutlinePath(ctx, ch, bob);
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.fillStyle = rgb(p.outline);
  ctx.fill();

  // 2) cel-shaded facets, clipped to the chunk silhouette
  ctx.save();
  chunkOutlinePath(ctx, ch, bob);
  ctx.clip();

  ch.facets.forEach(({ pts, tone }) => {
    const col = tone === 0 ? p.coalLight : tone === 1 ? p.coalMid : p.coalDark;
    ctx.fillStyle = rgb(col);
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const py = y + bob;
      if (i === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    });
    ctx.closePath();
    ctx.fill();
  });

  // a darkest crevice line down a cleavage plane for faceted character
  ctx.strokeStyle = rgba(p.coalDark, 0.9);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(ch.spec[0][0], ch.spec[0][1] + 6 + bob);
  ctx.lineTo(ch.spec[1][0], ch.spec[1][1] + 9 + bob);
  ctx.stroke();

  // 3) hard specular CATCH-LIGHT ridge on the top facet — this is what makes
  // the black read as glossy coal, not a hole. Bright crisp line, scaled by
  // gloss; tinted cool/warm by season via specTint.
  ctx.strokeStyle = rgba(p.specTint, 0.55 + 0.4 * p.gloss);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(ch.spec[0][0], ch.spec[0][1] + bob);
  ctx.lineTo(ch.spec[1][0], ch.spec[1][1] + bob);
  ctx.stroke();
  // a finer white-hot core on the ridge
  ctx.strokeStyle = rgba([255, 255, 255], 0.35 + 0.5 * p.gloss);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(ch.spec[0][0], ch.spec[0][1] - 0.3 + bob);
  ctx.lineTo(lerp(ch.spec[0][0], ch.spec[1][0], 0.7), lerp(ch.spec[0][1], ch.spec[1][1], 0.7) - 0.3 + bob);
  ctx.stroke();

  // a sharp specular DOT on the brightest facet (static gloss point)
  if (p.gloss > 0.02) {
    ctx.fillStyle = rgba([255, 255, 255], 0.4 + 0.5 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(ch.glint[0], ch.glint[1] + bob, 0.9, 1.6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // a soft cool/warm halo around the dot
    ctx.fillStyle = rgba(p.specTint, 0.22 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(ch.glint[0], ch.glint[1] + bob, 2.4, 3.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // frost dusting on the upward faces (winter) — cool speckle, coal stays black
  if (p.frostAmt > 0.02) {
    ctx.fillStyle = rgba([214, 232, 250], 0.18 * p.frostAmt);
    ctx.beginPath();
    ch.outline.forEach(([x, y], i) => {
      const py = y + bob;
      if (i === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba([236, 246, 255], 0.7 * p.frostAmt);
    // a few sharp frost specks near the lit ridge
    const fx0 = ch.spec[0][0], fy0 = ch.spec[0][1];
    const fx1 = ch.spec[1][0], fy1 = ch.spec[1][1];
    [0.15, 0.45, 0.8].forEach((u, k) => {
      const sx = lerp(fx0, fx1, u) + (k % 2 ? 1.6 : -1.4);
      const sy = lerp(fy0, fy1, u) + 2 + k;
      ctx.beginPath();
      ctx.arc(sx, sy + bob, 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore(); // end chunk clip
}

/** Snow cap sitting on TOP of one chunk (winter), drawn over its crown. */
function paintSnowCap(ctx: CanvasRenderingContext2D, ch: Chunk, p: P, bob: number): void {
  if (p.snowCapAmt <= 0.02) return;
  const a = p.snowCapAmt;
  const [ax, ay] = ch.spec[0];
  const [bx, by] = ch.spec[1];
  // a soft snow blob hugging the crown ridge
  ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
  ctx.beginPath();
  ctx.moveTo(ax - 3, ay + 3 + bob);
  ctx.quadraticCurveTo(ax - 1, ay - 3 + bob, lerp(ax, bx, 0.5), Math.min(ay, by) - 2.5 + bob);
  ctx.quadraticCurveTo(bx + 1, by - 3 + bob, bx + 3, by + 3 + bob);
  ctx.quadraticCurveTo(lerp(ax, bx, 0.5), by + 4.5 + bob, ax - 3, ay + 3 + bob);
  ctx.closePath();
  ctx.fill();
  // soft shaded underside of the cap
  ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
  ctx.beginPath();
  ctx.ellipse(lerp(ax, bx, 0.5), lerp(ay, by, 0.5) + 3 + bob, 4.4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat rocky/earth ellipse, x∈[−18,+18], centre y≈+19 ─────────
    // soft contact shadow lower-right (strength scaled by shadowAmt)
    ctx.fillStyle = rgba(p.padDark, 0.4 * (0.6 + 0.4 * p.shadowAmt));
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // shaded underside
    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // rocky/earth top
    ctx.fillStyle = rgb(p.padRock);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // scattered pebble specks on the pad (earthy texture, not grass blades)
    ctx.fillStyle = rgba(p.padDark, 0.55);
    const pebbles: Array<[number, number, number]> = [
      [-12, 18.4, 1.2], [-6, 20.4, 0.9], [7, 18.2, 1.1], [13, 19.8, 0.9], [1, 21, 0.8],
    ];
    pebbles.forEach(([px, py, r]) => {
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // a few stray coal crumbs scattered on the pad near the cluster (locked black)
    ctx.fillStyle = rgb(p.coalMid);
    const crumbs: Array<[number, number, number]> = [
      [-15, 20, 1.1], [15, 19.4, 1.0], [-2, 21.4, 0.8],
    ];
    crumbs.forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.66, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // tiny sheen so even the crumbs read glossy
      ctx.fillStyle = rgba(p.specTint, 0.5);
      ctx.beginPath();
      ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb(p.coalMid);
    });

    // dewy/damp sheen on the pad (spring)
    if (p.dewAmt > 0.01) {
      ctx.fillStyle = rgba([235, 246, 252], 0.3 * p.dewAmt);
      ctx.beginPath();
      ctx.ellipse(-4, 18.4, 12, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // moss/grass fleck at the cluster base (spring/summer)
    if (p.mossAmt > 0.01) {
      const a = p.mossAmt;
      ctx.fillStyle = rgba([108, 168, 78], 0.5 * a);
      const moss: Array<[number, number, number]> = [
        [-14, 18, 3.2], [13, 18, 2.8], [-3, 20.4, 3.6],
      ];
      moss.forEach(([mx, my, r]) => {
        ctx.beginPath();
        ctx.ellipse(mx, my, r, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // a few little grass tufts poking up at the base
      ctx.strokeStyle = rgba([86, 150, 62], 0.8 * a);
      ctx.lineWidth = 1;
      [-15, -11, 12, 15].forEach((gx, i) => {
        ctx.beginPath();
        ctx.moveTo(gx, 18.5);
        ctx.lineTo(gx + (i % 2 ? 1 : -1), 14.8);
        ctx.stroke();
      });
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
      [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen leaf resting on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-13, 20, -0.5, [196, 120, 40]],
        [13, 18.6, 0.7, [176, 72, 32]],
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

    // ── Soil contact patch directly under the cluster base ──────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, CLUSTER_BASE_Y + bob + 1.5, 14, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // soft contact shadow of the cluster on the pad, toward lower-right
    ctx.fillStyle = rgba(p.outline, 0.22 + 0.18 * p.shadowAmt);
    ctx.beginPath();
    ctx.ellipse(4, CLUSTER_BASE_Y + bob + 2.2, 15, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the coal cluster (SAME silhouette every season) ────────────
    // Drawn back-to-front so the front chunks overlap; each chunk renders its
    // own outline + facets + crisp specular so the black reads SHINY.
    CHUNKS.forEach((ch) => paintChunk(ctx, ch, p, bob));

    // ── Snow caps sitting on top of the chunks (winter) ─────────────────────
    CHUNKS.forEach((ch) => paintSnowCap(ctx, ch, p, bob));

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
function bobAt(t: number, amp = 0.6, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

// A hard specular GLINT slides across one facet — travels along a chosen chunk's
// crown ridge and into its lit face. Seamless via the fractional `prog`. Returns
// the point + a fade factor along the travel.
const GLINT_CHUNK = CHUNK_A; // the big lit chunk carries the travelling glint

function glintPoint(prog: number, bob: number): [number, number] {
  // travel from the crown ridge start, across the ridge, down toward the glint
  // dot, so the highlight visibly slides over the facet.
  const a = GLINT_CHUNK.spec[0];
  const b = GLINT_CHUNK.spec[1];
  const g = GLINT_CHUNK.glint;
  if (prog < 0.5) {
    const k = prog / 0.5;
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k) + bob];
  }
  const k = (prog - 0.5) / 0.5;
  return [lerp(b[0], g[0], k), lerp(b[1], g[1], k) + bob];
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // The subject bob is 0 at t=0; micro-motion below is additive dressing.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // A hard specular GLINT slides across one facet every season (seamless
      // via fractional prog; crisp so the black keeps reading as shiny coal).
      const prog = (t * 0.45) % 1;
      const [gx, gy] = glintPoint(prog, bob);
      const fade = Math.sin(prog * Math.PI); // fade in/out, no hard pop
      let glintAlpha = 0.5;
      if (season === "Summer") glintAlpha = 0.95;      // PEAK hard highlight
      else if (season === "Spring") glintAlpha = 0.6;  // cool sheen
      else if (season === "Autumn") glintAlpha = 0.5;  // amber sheen
      else glintAlpha = 0.55;                          // winter cold sheen
      const glintCol =
        season === "Winter" ? "214,232,252"
          : season === "Autumn" ? "252,224,176"
            : season === "Spring" ? "220,234,250"
              : "255,250,232"; // summer warm
      // bright crisp core
      ctx.fillStyle = `rgba(${glintCol},${glintAlpha * fade})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 1.1, 1.9, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // white-hot pinpoint at the centre to keep it reading as a hard specular
      ctx.fillStyle = `rgba(255,255,255,${0.6 * glintAlpha * fade})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 0.5, 0.9, -0.5, 0, Math.PI * 2);
      ctx.fill();

      if (season === "Spring") {
        // damp shimmer — a soft pulsing glint on the dewy pad
        const g = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(235,246,252,${g})`;
        ctx.beginPath();
        ctx.arc(-8, 18 + Math.sin(t * 1.1) * 0.6, 1.0 + g * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // a faint warm bloom on the brightest chunk shoulder (heat sheen)
        const s = 0.12 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.1));
        ctx.fillStyle = `rgba(255,248,226,${s})`;
        ctx.beginPath();
        ctx.ellipse(CHUNK_A.glint[0], CHUNK_A.glint[1] + bob, 3.0, 3.8, -0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a fallen leaf stirs — gentle rock of one leaf on the pad (seamless)
        ctx.save();
        ctx.translate(13, 18.6);
        ctx.rotate(0.7 + Math.sin(t * 1.3) * 0.2);
        ctx.fillStyle = "rgba(176,72,32,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(90,44,16,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      } else if (season === "Winter") {
        // a single drifting snowflake + a faint cold sheen near the crowns
        const flProg = (t / 3.2) % 1;
        const fy = -22 + flProg * 38;
        const fx = -2 + Math.sin(flProg * Math.PI * 2) * 3;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(flProg * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
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
