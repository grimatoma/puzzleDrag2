// Seasonal art for the PANSY flower tile.
//
// Four full-art redraws tracing a believable pansy lifecycle:
//   Spring  — green stem + leaves with a closed/opening teardrop bud showing a
//             sliver of violet petal.
//   Summer  — full open 5-petal pansy face (violet/purple, yellow throat, dark
//             whisker nectar lines) above healthy green leaves.
//   Autumn  — fading bloom: muted mauve, brown-edged, drooping petals, a seed
//             pod forming at the center, yellowing leaves, one petal detaching.
//   Winter  — dormant: a low brown stub of stem, curled dead leaves, a snow
//             blanket on the soil, a snow cap on the stub, drifting flakes.
//
// Each draw is origin-centered in the ~-24..+24 design box. Animations are
// deterministic (sin/cos/modulo of `t` in seconds), seamless, and subtle —
// the board sprite supplies its own sway rotation, so these avoid large
// rotations and lean on internal sways, glints, droops, and drifting flecks.
//
// The whole flower sits within a ~±14px radius around a center at y ≈ -2,
// rising on a stem from soil at y ≈ +22.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";

// ── Shared palette ───────────────────────────────────────────────────────────

const VIOLET_DARK = "#5a2a8a";
const VIOLET = "#8a44c8";
const VIOLET_LIGHT = "#c089ee";
const PETAL_EDGE = "#3d1a63";
const THROAT_YELLOW = "#f4d23a";
const STEM_DARK = "#2c5018";
const STEM_GREEN = "#4f9a2e";
const LEAF_GREEN = "#5aa336";
const LEAF_DARK = "#2f5e1c";
const MAUVE = "#a07296";
const MAUVE_EDGE = "#6e4a52";
const BROWN_EDGE = "#7a5230";
const LEAF_YELLOW = "#b6a23a";
const DEAD_BROWN = "#6b4a26";
const DEAD_BROWN_LT = "#8c6638";

// ── Shared helpers ─────────────────────────────────────────────────────────

function groundShadow(ctx: CanvasRenderingContext2D, rx = 14, alpha = 0.22): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 22, rx, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function soilClump(ctx: CanvasRenderingContext2D, rx = 13): void {
  ctx.fillStyle = "#5a3a18";
  ctx.beginPath();
  ctx.ellipse(0, 20, rx, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f2810";
  ctx.beginPath();
  ctx.ellipse(0, 21, rx * 0.65, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Green stem from soil up to the bloom center (cx, cy), bending by `sway`. */
function stem(ctx: CanvasRenderingContext2D, cx: number, cy: number, sway: number): void {
  ctx.lineCap = "round";
  ctx.strokeStyle = STEM_DARK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 19);
  ctx.quadraticCurveTo(cx * 0.4 + sway * 0.5, 8, cx + sway, cy);
  ctx.stroke();
  ctx.strokeStyle = STEM_GREEN;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 19);
  ctx.quadraticCurveTo(cx * 0.4 + sway * 0.5, 8, cx + sway, cy);
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** A pair of green leaves low on the stem. `tint`/`edge` allow yellowing. */
function leafPair(
  ctx: CanvasRenderingContext2D,
  fill: string,
  edge: string,
  sway: number,
): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.3;
  // left leaf
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.quadraticCurveTo(-11, 13 + sway * 0.3, -16, 5 + sway);
  ctx.quadraticCurveTo(-8, 12, 0, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // right leaf
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.quadraticCurveTo(11, 12 - sway * 0.3, 16, 4 - sway);
  ctx.quadraticCurveTo(8, 11, 0, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** One pansy petal: a rounded teardrop fanning out at `angle` from the throat,
 *  length `len`, scaled by `open` (0 = furled at center, 1 = full). */
function petal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  len: number,
  width: number,
  open: number,
  fill: string,
  edge: string,
): void {
  if (open <= 0.001) return;
  const L = len * open;
  const W = width * (0.4 + 0.6 * open);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  // petal points "up" (-y) in local space: narrow at throat, rounded fan at tip
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-W, -L * 0.55, -W * 0.55, -L);
  ctx.quadraticCurveTo(0, -L * 1.12, W * 0.55, -L);
  ctx.quadraticCurveTo(W, -L * 0.55, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The pansy bloom face centered at (cx, cy).
 *  open    — 0..1 how unfurled the petals are.
 *  droop   — extra downward tilt of the whole face (radians-ish lean).
 *  glint   — 0..1 pulsing dewy highlight strength.
 *  faded   — 0..1 blend toward muted-mauve autumn colour.
 *  podGrow — 0..1 how much seed pod replaces the throat. */
function bloomFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  open: number,
  droop: number,
  glint: number,
  faded: number,
  podGrow: number,
): void {
  if (open <= 0.001) return;

  // colour mix violet → mauve as `faded` rises
  const fillMain = faded > 0.01 ? MAUVE : VIOLET;
  const fillLight = faded > 0.01 ? "#c4a0bc" : VIOLET_LIGHT;
  const edge = faded > 0.5 ? BROWN_EDGE : faded > 0.01 ? MAUVE_EDGE : PETAL_EDGE;
  const darkFill = faded > 0.01 ? MAUVE_EDGE : VIOLET_DARK;

  ctx.save();
  ctx.translate(cx, cy);
  // whole face leans down a touch when drooping
  ctx.rotate(droop);

  // Pansy face: 1 lower (down), 2 side, 2 upper petals.
  // Lower petal — broad, points down (+y). Drawn first (behind).
  petal(ctx, 0, 0, Math.PI, 11, 8, open, fillLight, edge);
  // side petals
  petal(ctx, 0, 0, Math.PI * 0.62, 10, 6.5, open, fillMain, edge);
  petal(ctx, 0, 0, -Math.PI * 0.62, 10, 6.5, open, fillMain, edge);
  // upper petals (slightly behind/above, darker)
  petal(ctx, 0, -1, Math.PI * 0.18, 9, 6, open, darkFill, edge);
  petal(ctx, 0, -1, -Math.PI * 0.18, 9, 6, open, darkFill, edge);

  // whisker nectar lines radiating from the throat (fade with petal open & age)
  const whiskerA = Math.max(0, (open - 0.4) / 0.6) * (1 - faded * 0.7);
  if (whiskerA > 0.02) {
    ctx.strokeStyle = `rgba(42,17,64,${whiskerA})`;
    ctx.lineWidth = 0.9;
    [-0.9, -0.45, 0, 0.45, 0.9].forEach((a) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // lower-face whiskers fan downward
      const ang = Math.PI - a;
      ctx.lineTo(Math.cos(ang + Math.PI / 2) * 7, Math.sin(ang + Math.PI / 2) * 7);
      ctx.stroke();
    });
  }

  // throat: yellow center, or a forming seed pod as it ages
  if (podGrow < 0.99) {
    const ya = (1 - podGrow) * Math.min(1, open * 1.4);
    ctx.globalAlpha = ya;
    ctx.fillStyle = THROAT_YELLOW;
    ctx.beginPath();
    ctx.arc(0, 0, 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c89a16";
    ctx.beginPath();
    ctx.arc(0, 0.6, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (podGrow > 0.01) {
    ctx.globalAlpha = podGrow;
    const podGrad = ctx.createLinearGradient(0, -3, 0, 3);
    podGrad.addColorStop(0, "#9aa84a");
    podGrad.addColorStop(1, "#5f6b22");
    ctx.fillStyle = podGrad;
    ctx.beginPath();
    ctx.ellipse(0, -0.5, 2.6 * podGrow + 0.6, 3.4 * podGrow + 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3f4a14";
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // dewy pulsing glint up on a petal
  if (glint > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + glint * 0.45})`;
    ctx.beginPath();
    ctx.arc(-2.4, -4.2, 1.2 + glint * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Teardrop bud (Spring): closed petals showing a sliver of violet.
 *  open — 0..1 how far the sliver has peeled (0 closed, 1 nearly bloom). */
function bud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  open: number,
  sliverPulse: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);

  // green sepal teardrop, point up
  const grad = ctx.createLinearGradient(0, -8, 0, 4);
  grad.addColorStop(0, "#7ec24a");
  grad.addColorStop(1, STEM_DARK);
  ctx.fillStyle = grad;
  ctx.strokeStyle = LEAF_DARK;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, -9 - open * 1.5);
  ctx.quadraticCurveTo(-5, -2, -3.4, 3);
  ctx.quadraticCurveTo(0, 5, 3.4, 3);
  ctx.quadraticCurveTo(5, -2, 0, -9 - open * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // sliver of violet petal peeking out the top, widening with `open`
  const sw = 1.2 + open * 3.4;
  const sh = 2.0 + open * 4.0;
  const pulse = 0.85 + sliverPulse * 0.15;
  ctx.fillStyle = VIOLET;
  ctx.beginPath();
  ctx.ellipse(0, -8 - open * 1.2, sw * pulse, sh, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = VIOLET_LIGHT;
  ctx.beginPath();
  ctx.ellipse(-0.5, -8.6 - open * 1.2, sw * 0.45 * pulse, sh * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Spring: green stem + opening bud ─────────────────────────────────────────

function springScene(ctx: CanvasRenderingContext2D, sway: number, sliverPulse: number): void {
  groundShadow(ctx, 12, 0.2);
  soilClump(ctx, 12);
  const cx = 0;
  const cy = -2;
  stem(ctx, cx, cy + 2, sway);
  leafPair(ctx, LEAF_GREEN, LEAF_DARK, sway * 0.4);
  bud(ctx, cx + sway, cy, 0.35, sliverPulse);
}

function drawPansySpring(ctx: CanvasRenderingContext2D): void {
  springScene(ctx, 0, 0.5);
}

function animPansySpring(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(t * 1.6) * 1.6; // seamless, period 2π/1.6 s
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  springScene(ctx, sway, pulse);
}

// ── Summer: full open bloom ──────────────────────────────────────────────────

function summerScene(ctx: CanvasRenderingContext2D, sway: number, glint: number): void {
  groundShadow(ctx, 12, 0.2);
  soilClump(ctx, 12);
  const cx = 0;
  const cy = -2;
  stem(ctx, cx, cy + 4, sway);
  leafPair(ctx, LEAF_GREEN, LEAF_DARK, sway * 0.4);
  bloomFace(ctx, cx + sway, cy, 1, sway * 0.012, glint, 0, 0);
}

function drawPansySummer(ctx: CanvasRenderingContext2D): void {
  summerScene(ctx, 0, 0.4);
}

function animPansySummer(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(t * 1.5) * 1.8; // gentle sway, period 2π/1.5 s
  const glint = 0.5 + 0.5 * Math.sin(t * 2.2);
  summerScene(ctx, sway, glint);
}

// ── Autumn: fading, drooping bloom + seed pod ────────────────────────────────

function autumnScene(
  ctx: CanvasRenderingContext2D,
  sway: number,
  driftProg: number,
): void {
  groundShadow(ctx, 12, 0.22);
  soilClump(ctx, 12);
  const cx = 0;
  const cy = 0; // bloom hangs a bit lower
  stem(ctx, cx + 1, cy + 4, sway);
  leafPair(ctx, LEAF_YELLOW, "#6b5210", sway * 0.4);

  // faded, drooping bloom with a forming seed pod, slightly shrunk
  bloomFace(ctx, cx + sway, cy, 0.86, 0.28 + sway * 0.012, 0, 1, 0.4);

  // one detaching petal drifting down/away (seamless via fractional driftProg)
  ctx.save();
  const dp = driftProg;
  const px = cx + 6 + dp * 8;
  const py = cy - 4 + dp * 18;
  ctx.globalAlpha = Math.max(0, 1 - dp);
  ctx.translate(px, py);
  ctx.rotate(dp * 2.2);
  ctx.fillStyle = MAUVE;
  ctx.strokeStyle = BROWN_EDGE;
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
  ctx.globalAlpha = 1;
}

function drawPansyAutumn(ctx: CanvasRenderingContext2D): void {
  autumnScene(ctx, 0, 0.15);
}

function animPansyAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(t * 0.95) * 1.4; // slow tired droop-sway
  const driftProg = (t * 0.32) % 1; // petal drifts down then resets
  autumnScene(ctx, sway, driftProg);
}

// ── Winter: dormant stub under snow ──────────────────────────────────────────

function winterScene(
  ctx: CanvasRenderingContext2D,
  flakes: Array<[number, number, number]>,
  sheen: number,
): void {
  groundShadow(ctx, 14, 0.18);

  // snow blanket over the soil
  const snow = ctx.createLinearGradient(0, 14, 0, 24);
  snow.addColorStop(0, "#eef4fb");
  snow.addColorStop(1, "#c2d2e4");
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.ellipse(0, 20, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // curled dead leaves resting on the snow
  ctx.fillStyle = DEAD_BROWN;
  ctx.strokeStyle = "#4a3018";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-13, 18);
  ctx.quadraticCurveTo(-18, 15, -14, 13);
  ctx.quadraticCurveTo(-10, 15, -7, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = DEAD_BROWN_LT;
  ctx.beginPath();
  ctx.moveTo(13, 17);
  ctx.quadraticCurveTo(18, 14, 14, 12);
  ctx.quadraticCurveTo(10, 14, 7, 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // low brown stub of stem
  ctx.lineCap = "round";
  ctx.strokeStyle = "#4a3219";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 19);
  ctx.quadraticCurveTo(1.5, 12, 2, 7);
  ctx.stroke();
  ctx.strokeStyle = DEAD_BROWN_LT;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 19);
  ctx.quadraticCurveTo(1.5, 12, 2, 7);
  ctx.stroke();
  ctx.lineCap = "butt";

  // snow cap on the stub
  ctx.fillStyle = "#f4f8ff";
  ctx.beginPath();
  ctx.ellipse(2, 6.5, 3.4, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // faint cold sheen across the snow
  ctx.fillStyle = `rgba(200,224,255,${0.18 + sheen * 0.16})`;
  ctx.beginPath();
  ctx.ellipse(-3, 18, 9, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // drifting / settled snowflakes
  ctx.fillStyle = "#ffffff";
  flakes.forEach(([fx, fy, r]) => {
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPansyWinter(ctx: CanvasRenderingContext2D): void {
  winterScene(
    ctx,
    [
      [-8, -6, 1.4],
      [4, 2, 1.1],
      [10, -12, 1],
      [-2, 9, 1.2],
    ],
    0.4,
  );
}

function animPansyWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const span = 30;
  const seeds: Array<[number, number, number]> = [
    [-8, 1.4, 0.0],
    [4, 1.1, 0.45],
    [10, 1.0, 0.7],
    [-2, 1.2, 0.25],
  ];
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    const prog = (((t / 3.2 + phase) % 1) + 1) % 1;
    const fy = -22 + prog * span;
    const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
    return [driftX, fy, r];
  });
  const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
  winterScene(ctx, flakes, sheen);
}

// ── Transitions ──────────────────────────────────────────────────────────────

/** 0: Spring → Summer. The bud unfurls into the full 5-petal open face;
 *  violet spreads, yellow throat + whisker lines appear as p→1. */
function springToSummer(ctx: CanvasRenderingContext2D, p: number): void {
  const q = Math.max(0, Math.min(1, p));
  groundShadow(ctx, 12, 0.2);
  soilClump(ctx, 12);
  const cx = 0;
  const cy = -2;
  stem(ctx, cx, cy + 4, 0);
  leafPair(ctx, LEAF_GREEN, LEAF_DARK, 0);

  // First half: bud peels open. Second half: petals fan out into the face.
  if (q < 0.45) {
    const o = 0.35 + (q / 0.45) * 0.55; // bud opens further
    bud(ctx, cx, cy, o, 0.5);
  } else {
    const open = (q - 0.45) / 0.55; // 0..1 fan out the face
    // small leftover green sepal cup behind the opening face
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - open * 1.6);
    bud(ctx, cx, cy, 0.9, 0.5);
    ctx.restore();
    ctx.globalAlpha = 1;
    bloomFace(ctx, cx, cy, open, 0, 0.3, 0, 0);
  }
}

/** 1: Summer → Autumn. Open bloom mutes violet→mauve with browning edges,
 *  petals droop, a seed pod forms at center; leaves green→yellow. */
function summerToAutumn(ctx: CanvasRenderingContext2D, p: number): void {
  const q = Math.max(0, Math.min(1, p));
  groundShadow(ctx, 12, 0.21);
  soilClump(ctx, 12);
  const cx = 0;
  const cy = -2 + q * 2; // bloom sinks slightly lower

  stem(ctx, cx, cy + 4, 0);

  // leaves green → yellow
  const lf = q < 0.5
    ? LEAF_GREEN
    : LEAF_YELLOW;
  const le = q < 0.5 ? LEAF_DARK : "#6b5210";
  leafPair(ctx, lf, le, 0);

  // bloom: fade rises, droop rises, pod grows, petals shrink a touch
  const faded = q; // bloomFace switches palette as soon as faded>0; ramp via q
  const droop = q * 0.28;
  const pod = Math.max(0, (q - 0.4) / 0.6); // pod forms in the second half
  const open = 1 - q * 0.14;
  bloomFace(ctx, cx, cy, open, droop, 0, faded > 0 ? Math.max(0.02, faded) : 0, pod);
}

/** 2: Autumn → Winter. Faded bloom collapses (petals wither/drop first),
 *  leaves curl brown, then a snow blanket + snow cap accumulate. */
function autumnToWinter(ctx: CanvasRenderingContext2D, p: number): void {
  const q = Math.max(0, Math.min(1, p));
  groundShadow(ctx, q < 0.5 ? 12 : 13, 0.2);
  soilClump(ctx, 12);

  const cx = 0;
  const cy = 0;

  // Stage 1 (q 0..0.55): petals wither and shrink away revealing the stub.
  // Stage 2 (q 0.55..1): snow settles over everything.
  const wither = Math.min(1, q / 0.55); // 0..1 petals gone
  const snowing = Math.max(0, (q - 0.45) / 0.55); // 0..1 snow builds

  // stem: green/brown crossfade toward the dead stub
  stem(ctx, cx + 1 * (1 - q), cy + 4 - q * 2, 0);
  // a stub overlay grows in as petals leave
  if (q > 0.3) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (q - 0.3) / 0.4);
    ctx.lineCap = "round";
    ctx.strokeStyle = "#4a3219";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 19);
    ctx.quadraticCurveTo(1.5, 12, 2, 7);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // leaves: yellow → curled dead brown
  if (q < 0.6) {
    leafPair(ctx, LEAF_YELLOW, "#6b5210", 0);
  } else {
    const ca = Math.min(1, (q - 0.6) / 0.4);
    ctx.save();
    ctx.globalAlpha = 1 - ca * 0.6;
    leafPair(ctx, "#8a7028", "#5a4010", 0);
    ctx.restore();
    ctx.globalAlpha = 1;
    // curled dead leaf nubs appearing on the soil
    ctx.globalAlpha = ca;
    ctx.fillStyle = DEAD_BROWN;
    ctx.strokeStyle = "#4a3018";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-13, 18);
    ctx.quadraticCurveTo(-18, 15, -14, 13);
    ctx.quadraticCurveTo(-10, 15, -7, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // withering bloom: shrinks and fades out
  const open = Math.max(0, 0.86 * (1 - wither));
  if (open > 0.01) {
    bloomFace(ctx, cx, cy, open, 0.28 + wither * 0.2, 0, 1, Math.min(0.9, 0.4 + wither * 0.5));
  }

  // snow blanket fades/grows in over the soil
  if (snowing > 0.01) {
    ctx.save();
    ctx.globalAlpha = snowing;
    const snow = ctx.createLinearGradient(0, 14, 0, 24);
    snow.addColorStop(0, "#eef4fb");
    snow.addColorStop(1, "#c2d2e4");
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 20, 10 + snowing * 7, 4 + snowing * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // snow cap on the stub
    ctx.fillStyle = "#f4f8ff";
    ctx.beginPath();
    ctx.ellipse(2, 6.5, 1.4 + snowing * 2, 1 + snowing * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawPansySpring, anim: animPansySpring },
  Summer: { draw: drawPansySummer, anim: animPansySummer },
  Autumn: { draw: drawPansyAutumn, anim: animPansyAutumn },
  Winter: { draw: drawPansyWinter, anim: animPansyWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
