// Seasonal art for the APPLE board tile.
//
// A small fruiting apple sprig/branch so it reads as a believable yearly
// lifecycle. Four full-art redraws:
//   Spring  — leafy green twig with white-pink 5-petal blossom + tiny green
//             fruitlet nub beginning.
//   Summer  — fruit has set: a firm glossy GREEN apple hanging from the twig.
//   Autumn  — PEAK ripe: a glossy RED apple with warm yellow blush + bright
//             specular, leaves gold/orange, a second apple, a drifting leaf.
//   Winter  — bare dark twig, one overripe/frost-touched dull-red apple,
//             snow cap on the twig, snow blanket on the ground, drifting flakes.
//
// Each draw is origin-centered in the ~-24..+24 design box. Ground/base sits at
// about y = +22 and the sprig rises upward (negative y). Animations are
// deterministic (sin/cos/modulo of `t` in seconds), seamless, and subtle —
// the board sprite supplies its own sway, so these avoid large rotations and
// lean on gentle bobs, specular glints, fluttering leaves, and drifting flecks.
// The main fruit reads as the focal point around y ≈ -2..+4, radius ~9-11px.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";

// ── Shared helpers ─────────────────────────────────────────────────────────

function groundShadow(ctx: CanvasRenderingContext2D, rx = 14, alpha = 0.22): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 22, rx, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The woody twig the fruit/blossom hangs from. `dead` darkens it (winter),
 *  `lean` nudges the upper tip sideways for sway. Drawn dark-then-light. */
function twig(ctx: CanvasRenderingContext2D, lean: number, dead: boolean): void {
  const darkBark = dead ? "#3a2b1c" : "#5a3d1e";
  const liteBark = dead ? "#5c4630" : "#8a5e2c";
  // main rising stem, arcs up and bends right at the tip
  ctx.lineCap = "round";
  ctx.strokeStyle = darkBark;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(-2, 22);
  ctx.quadraticCurveTo(2, 4, 8 + lean, -14);
  ctx.stroke();
  ctx.strokeStyle = liteBark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-2, 22);
  ctx.quadraticCurveTo(2, 4, 8 + lean, -14);
  ctx.stroke();
  // a short side branch that the focal fruit hangs from
  ctx.strokeStyle = darkBark;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(1, 7);
  ctx.quadraticCurveTo(-7, -2, -9 + lean * 0.4, -10);
  ctx.stroke();
  ctx.strokeStyle = liteBark;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(1, 7);
  ctx.quadraticCurveTo(-7, -2, -9 + lean * 0.4, -10);
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** A teardrop leaf with a dark base pass + light fill and a midrib. */
function leaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  len: number,
  dark: string,
  lite: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // dark backing for depth
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
  ctx.fill();
  // lighter inset
  ctx.fillStyle = lite;
  ctx.beginPath();
  ctx.moveTo(len * 0.1, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.3, len * 0.86, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.3, len * 0.1, 0);
  ctx.fill();
  // midrib
  ctx.strokeStyle = dark;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(len * 0.08, 0);
  ctx.lineTo(len * 0.9, 0);
  ctx.stroke();
  ctx.restore();
}

/** The apple body: two slightly-overlapping lobes with a dimple, a gradient
 *  skin (3 colour stops: highlight rim, mid skin, shaded base), an optional
 *  warm blush patch, a stem + a tiny leaf, and a moving specular `glint`
 *  (0..1 cycles the highlight position/strength). `blush` 0..1 adds the warm
 *  cheek; `r` is the body radius. */
function apple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  skin: { hi: string; mid: string; lo: string },
  blush: { color: string; amt: number },
  glint: number,
  withStem: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);

  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r * 1.25);
  grad.addColorStop(0, skin.hi);
  grad.addColorStop(0.55, skin.mid);
  grad.addColorStop(1, skin.lo);

  // body — two lobes give the classic apple silhouette with a top dimple
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.78); // top dimple
  ctx.bezierCurveTo(-r * 0.7, -r * 1.05, -r * 1.18, -r * 0.4, -r * 1.05, r * 0.18);
  ctx.bezierCurveTo(-r * 0.95, r * 0.95, -r * 0.35, r * 1.15, 0, r * 0.95);
  ctx.bezierCurveTo(r * 0.35, r * 1.15, r * 0.95, r * 0.95, r * 1.05, r * 0.18);
  ctx.bezierCurveTo(r * 1.18, -r * 0.4, r * 0.7, -r * 1.05, 0, -r * 0.78);
  ctx.fill();

  // warm blush cheek
  if (blush.amt > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, blush.amt) * 0.8;
    const bg = ctx.createRadialGradient(r * 0.35, r * 0.1, 0, r * 0.35, r * 0.1, r * 0.85);
    bg.addColorStop(0, blush.color);
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(r * 0.3, r * 0.05, r * 0.75, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // dimple shadow at the stem socket
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.72, r * 0.22, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // stem + a small leaf poking from the dimple
  if (withStem) {
    ctx.strokeStyle = "#5a3d1e";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.75);
    ctx.quadraticCurveTo(r * 0.18, -r * 1.2, r * 0.45, -r * 1.35);
    ctx.stroke();
    ctx.lineCap = "butt";
    leaf(ctx, r * 0.4, -r * 1.28, -0.5, r * 0.7, "#3f6b1c", "#6fae35");
  }

  // specular highlight — strength/position pulse with glint (0..1)
  const gx = -r * 0.4 + Math.sin(glint * Math.PI * 2) * r * 0.12;
  const gy = -r * 0.45;
  const ga = 0.5 + 0.35 * (0.5 + 0.5 * Math.sin(glint * Math.PI * 2));
  ctx.fillStyle = `rgba(255,255,255,${ga})`;
  ctx.beginPath();
  ctx.ellipse(gx, gy, r * 0.26, r * 0.34, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // small sharp catch-light point
  ctx.fillStyle = `rgba(255,255,255,${Math.min(1, ga + 0.25)})`;
  ctx.beginPath();
  ctx.arc(gx - r * 0.1, gy - r * 0.1, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** A 5-petal apple blossom (white-pink) with a small yellow center. `open`
 *  0..1 scales the petals (for spring→summer drop), `r` petal length. */
function blossom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  open: number,
  alpha: number,
): void {
  if (open <= 0.01 || alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.min(1, alpha);
  const pr = r * open;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(a);
    const pg = ctx.createLinearGradient(0, 0, 0, -pr);
    pg.addColorStop(0, "#f7c9d6");
    pg.addColorStop(1, "#fff4f7");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(0, -pr * 0.55, pr * 0.42, pr * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // yellow center
  ctx.fillStyle = "#f2c84a";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d99a1f";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// season-leaf colour pairs (dark backing, light fill)
const LEAF_GREEN = { dark: "#2f5916", lite: "#6fae35" };
const LEAF_GOLD = { dark: "#9a6a16", lite: "#e0a73a" };

// apple skins
const GREEN_SKIN = { hi: "#cfe88a", mid: "#7fb53a", lo: "#3f6b1c" };
const RED_SKIN = { hi: "#ff7a5e", mid: "#d6322a", lo: "#7c1410" };
const DULL_RED_SKIN = { hi: "#a8584e", mid: "#8a2f2a", lo: "#521012" };

// ── Spring: leafy twig with blossom + fruitlet nub ───────────────────────────

function appleSpring(ctx: CanvasRenderingContext2D, sway: number, glint: number): void {
  groundShadow(ctx, 12, 0.2);
  twig(ctx, sway * 0.4, false);

  // fresh green leaves along the twig
  leaf(ctx, 6, -2, -0.9 + sway * 0.04, 11, LEAF_GREEN.dark, LEAF_GREEN.lite);
  leaf(ctx, -6, -1, 3.3 - sway * 0.04, 9, LEAF_GREEN.dark, LEAF_GREEN.lite);
  leaf(ctx, 9, -12, -1.5, 8, LEAF_GREEN.dark, LEAF_GREEN.lite);

  // tiny green fruitlet nub just beginning, low on the side branch
  ctx.fillStyle = "#7fb53a";
  ctx.beginPath();
  ctx.arc(-8 + sway * 0.3, -9, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(-9 + sway * 0.3, -10, 1, 0, Math.PI * 2);
  ctx.fill();

  // blossoms sway gently on their stalks; main cluster is the focal point
  blossom(ctx, 0 + sway, 0, 8, 1, 1);
  blossom(ctx, 11 + sway * 1.2, -10, 5, 1, 0.95);
  // soft glint pulse on the main blossom center
  const ga = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(glint));
  ctx.fillStyle = `rgba(255,255,255,${ga})`;
  ctx.beginPath();
  ctx.arc(-2 + sway, -2, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawAppleSpring(ctx: CanvasRenderingContext2D): void {
  appleSpring(ctx, 0, 0.3);
}

function animAppleSpring(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(t * 1.3) * 1.8; // gentle blossom sway, period 2π/1.3 s
  appleSpring(ctx, sway, t * 2.4);
}

// ── Summer: firm green apple has set ─────────────────────────────────────────

function appleSummer(ctx: CanvasRenderingContext2D, bob: number, glint: number): void {
  groundShadow(ctx, 12, 0.2);
  twig(ctx, bob * 0.3, false);

  // healthy green leaves
  leaf(ctx, 7, -10, -0.7, 12, LEAF_GREEN.dark, LEAF_GREEN.lite);
  leaf(ctx, -7, -2, 3.2, 10, LEAF_GREEN.dark, LEAF_GREEN.lite);
  leaf(ctx, 11, -1, -0.2, 9, LEAF_GREEN.dark, LEAF_GREEN.lite);

  // a small second green apple up the twig
  apple(ctx, 9, -11, 5, GREEN_SKIN, { color: "#cfe88a", amt: 0 }, (glint + 0.3) % 1, false);

  // focal firm green apple bobbing on its twig
  apple(ctx, -1, 2 + bob, 10, GREEN_SKIN, { color: "#e8f0a0", amt: 0.25 }, glint, true);
}

function drawAppleSummer(ctx: CanvasRenderingContext2D): void {
  appleSummer(ctx, 0, 0.3);
}

function animAppleSummer(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 1.3) * 1.6; // apple bobs gently, period 2π/1.3 s
  const glint = (t * 0.45) % 1; // specular pulse
  appleSummer(ctx, bob, glint);
}

// ── Autumn: peak ripe red apple (hero frame) ─────────────────────────────────

function appleAutumn(
  ctx: CanvasRenderingContext2D,
  bob: number,
  glint: number,
  leafFall: { x: number; y: number; rot: number },
): void {
  groundShadow(ctx, 13, 0.22);
  twig(ctx, bob * 0.3, false);

  // leaves turning gold/orange
  leaf(ctx, 7, -10, -0.7, 12, LEAF_GOLD.dark, LEAF_GOLD.lite);
  leaf(ctx, -7, -2, 3.2, 10, LEAF_GOLD.dark, LEAF_GOLD.lite);

  // a second smaller ripe apple
  apple(ctx, 10, -10, 5.5, RED_SKIN, { color: "#ffcf6a", amt: 0.5 }, (glint + 0.4) % 1, false);

  // focal glossy red apple with warm yellow blush — the hero
  apple(ctx, -1, 3 + bob, 11, RED_SKIN, { color: "#ffd166", amt: 0.7 }, glint, true);

  // one leaf drifting down
  leaf(ctx, leafFall.x, leafFall.y, leafFall.rot, 9, LEAF_GOLD.dark, LEAF_GOLD.lite);
}

function drawAppleAutumn(ctx: CanvasRenderingContext2D): void {
  appleAutumn(ctx, 0, 0.3, { x: 14, y: 8, rot: 0.6 });
}

function animAppleAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 1.0) * 1.7; // slow heavy bob
  const glint = (t * 0.5) % 1; // traveling glint
  // a leaf falling and looping seamlessly over a 4s period
  const prog = ((t / 4) % 1 + 1) % 1;
  const leafFall = {
    x: 12 + Math.sin(prog * Math.PI * 2) * 4,
    y: -12 + prog * 30,
    rot: 0.4 + prog * Math.PI * 2,
  };
  appleAutumn(ctx, bob, glint, leafFall);
}

// ── Winter: bare twig, one overripe frost-touched apple ──────────────────────

function appleWinter(
  ctx: CanvasRenderingContext2D,
  flakes: Array<[number, number, number]>,
  sheen: number,
  sway: number,
): void {
  groundShadow(ctx, 14, 0.18);

  // snow blanket on the ground pad
  const snow = ctx.createLinearGradient(0, 16, 0, 24);
  snow.addColorStop(0, "#eef4fb");
  snow.addColorStop(1, "#c2d2e4");
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.ellipse(0, 21, 16, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  twig(ctx, sway * 0.3, true);

  // snow cap settled along the upper twig
  ctx.fillStyle = "#f4f8ff";
  ctx.beginPath();
  ctx.ellipse(8 + sway * 0.3, -14, 3.4, 1.8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, 4, 2.6, 1.4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // focal overripe / wizened dull-red apple, barely swaying
  apple(ctx, -1 + sway * 0.5, 3, 10, DULL_RED_SKIN, { color: "#7c4a30", amt: 0.35 }, 0.5, false);

  // wizened wrinkle hint on the apple
  ctx.strokeStyle = "rgba(60,16,18,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5 + sway * 0.5, 0);
  ctx.quadraticCurveTo(-1 + sway * 0.5, 4, 4 + sway * 0.5, 1);
  ctx.stroke();

  // frost/snow dusting on top of the apple
  ctx.fillStyle = "rgba(244,248,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(-1 + sway * 0.5, -5, 6, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // faint cold sheen + tiny frost glints on the apple
  ctx.fillStyle = `rgba(200,224,255,${0.3 + sheen * 0.25})`;
  ctx.beginPath();
  ctx.arc(-4 + sway * 0.5, -1, 1.2, 0, Math.PI * 2);
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

function drawAppleWinter(ctx: CanvasRenderingContext2D): void {
  appleWinter(
    ctx,
    [
      [-8, -6, 1.4],
      [6, 2, 1.1],
      [11, -12, 1],
      [-3, 10, 1.2],
    ],
    0.4,
    0,
  );
}

function animAppleWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const span = 30;
  const seeds: Array<[number, number, number]> = [
    [-8, 1.4, 0.0],
    [6, 1.1, 0.45],
    [11, 1.0, 0.7],
    [-3, 1.2, 0.25],
  ];
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    const prog = ((t / 3.2 + phase) % 1 + 1) % 1;
    const fy = -22 + prog * span;
    const driftX = fx + Math.sin((prog * Math.PI * 2) + phase * 6) * 3;
    return [driftX, fy, r];
  });
  const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
  const sway = Math.sin(t * 0.7) * 0.8; // wizened apple barely sways
  appleWinter(ctx, flakes, sheen, sway);
}

// ── Transitions ──────────────────────────────────────────────────────────────

function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

function clamp01(p: number): number {
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** Blend two hex colours "#rrggbb". */
function mixHex(c1: string, c2: string, p: number): string {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, p));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, p));
  const bl = Math.round(lerp(a & 255, b & 255, p));
  return `rgb(${r},${g},${bl})`;
}

function mixSkin(
  s1: { hi: string; mid: string; lo: string },
  s2: { hi: string; mid: string; lo: string },
  p: number,
): { hi: string; mid: string; lo: string } {
  return {
    hi: mixHex(s1.hi, s2.hi, p),
    mid: mixHex(s1.mid, s2.mid, p),
    lo: mixHex(s1.lo, s2.lo, p),
  };
}

// 0: Spring → Summer.  Blossom petals drop & fade while the green fruitlet
// swells from nub to a full firm green apple. Leaves stay green throughout.
function springToSummer(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  groundShadow(ctx, 12, 0.2);
  twig(ctx, 0, false);

  // green leaves (constant)
  leaf(ctx, 7, -10, -0.7, lerp(11, 12, q), LEAF_GREEN.dark, LEAF_GREEN.lite);
  leaf(ctx, -7, -2, 3.2, lerp(9, 10, q), LEAF_GREEN.dark, LEAF_GREEN.lite);
  leaf(ctx, 11, -1, -0.2, lerp(8, 9, q), LEAF_GREEN.dark, LEAF_GREEN.lite);

  // small secondary apple fades in as the fruit sets
  if (q > 0.4) {
    apple(ctx, 9, -11, lerp(2, 5, (q - 0.4) / 0.6), GREEN_SKIN, { color: "#cfe88a", amt: 0 }, 0.3, false);
  }

  // the focal fruit swells from a 3px nub to a full 10px apple
  const r = lerp(3, 10, q);
  const fy = lerp(-2, 2, q); // nub sits high, ripe apple settles to center
  apple(ctx, lerp(-3, -1, q), fy, r, GREEN_SKIN, { color: "#e8f0a0", amt: lerp(0, 0.25, q) }, 0.3, q > 0.3);

  // blossoms shrink + fall + fade away over the first ~70% of the morph
  const fade = clamp01(1 - q / 0.7);
  if (fade > 0.01) {
    const fall = q * 14; // petals drift downward as they drop
    blossom(ctx, 2, 0 + fall, 8, fade, fade);
    blossom(ctx, 11, -10 + fall * 0.8, 5, fade, fade * 0.9);
  }
}

// 1: Summer → Autumn.  The green apple ripens to red: skin colour green→red,
// the warm yellow blush deepens, a brightening specular point appears, and
// leaves turn green→gold. Colour + surface only — no global light flash.
function summerToAutumn(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  groundShadow(ctx, lerp(12, 13, q), lerp(0.2, 0.22, q));
  twig(ctx, 0, false);

  // leaves turn green → gold
  const ld = mixHex(LEAF_GREEN.dark, LEAF_GOLD.dark, q);
  const ll = mixHex(LEAF_GREEN.lite, LEAF_GOLD.lite, q);
  leaf(ctx, 7, -10, -0.7, 12, ld, ll);
  leaf(ctx, -7, -2, 3.2, 10, ld, ll);
  leaf(ctx, 11, -1, -0.2, lerp(9, 0.01, q), ld, ll); // third leaf recedes

  // secondary apple ripens too
  const skin2 = mixSkin(GREEN_SKIN, RED_SKIN, q);
  apple(ctx, 10, -10, lerp(5, 5.5, q), skin2, { color: mixHex("#cfe88a", "#ffcf6a", q), amt: lerp(0, 0.5, q) }, 0.3, false);

  // focal apple ripens green → red, blush deepens, specular brightens
  const skin = mixSkin(GREEN_SKIN, RED_SKIN, q);
  const blushColor = mixHex("#e8f0a0", "#ffd166", q);
  apple(ctx, -1, lerp(2, 3, q), lerp(10, 11, q), skin, { color: blushColor, amt: lerp(0.25, 0.7, q) }, 0.3, true);
}

// 2: Autumn → Winter.  Scene goes dormant. Staged: leaves drop FIRST (first
// half), then frost/snow settles (second half). The red apple dulls/wizens
// toward overripe deep-red as the twig goes bare.
function autumnToWinter(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  groundShadow(ctx, 14, lerp(0.22, 0.18, q));

  // snow blanket settles in the SECOND half
  const snowAmt = clamp01((q - 0.5) / 0.5);
  if (snowAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = snowAmt;
    const snow = ctx.createLinearGradient(0, 16, 0, 24);
    snow.addColorStop(0, "#eef4fb");
    snow.addColorStop(1, "#c2d2e4");
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 21, lerp(8, 16, snowAmt), lerp(3, 5.5, snowAmt), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // twig darkens toward dead bark as the season turns
  twig(ctx, 0, q > 0.5);

  // leaves drop away over the FIRST half (shrink + fade + drift down)
  const leafLife = clamp01(1 - q / 0.5);
  if (leafLife > 0.01) {
    ctx.save();
    ctx.globalAlpha = leafLife;
    const drop = (1 - leafLife) * 16;
    leaf(ctx, 7, -10 + drop, -0.7 + (1 - leafLife), 12 * leafLife + 2, LEAF_GOLD.dark, LEAF_GOLD.lite);
    leaf(ctx, -7, -2 + drop, 3.2 + (1 - leafLife), 10 * leafLife + 2, LEAF_GOLD.dark, LEAF_GOLD.lite);
    ctx.restore();
  }

  // secondary apple fades away as the twig goes bare
  if (q < 0.6) {
    const a2 = clamp01(1 - q / 0.6);
    ctx.save();
    ctx.globalAlpha = a2;
    apple(ctx, 10, -10, 5.5, mixSkin(RED_SKIN, DULL_RED_SKIN, q), { color: "#7c4a30", amt: 0.4 }, 0.5, false);
    ctx.restore();
  }

  // focal apple dulls/wizens: bright red → overripe deep-red
  const skin = mixSkin(RED_SKIN, DULL_RED_SKIN, q);
  apple(ctx, -1, 3, lerp(11, 10, q), skin, { color: mixHex("#ffd166", "#7c4a30", q), amt: lerp(0.7, 0.35, q) }, 0.5, q < 0.5);

  // frost/snow accumulates on top of the apple in the SECOND half
  if (snowAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = snowAmt;
    ctx.fillStyle = "#f4f8ff";
    ctx.beginPath();
    ctx.ellipse(8, -14, 3.4 * snowAmt, 1.8 * snowAmt, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(244,248,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(-1, -5, lerp(3, 6, snowAmt), lerp(1.4, 2.6, snowAmt), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawAppleSpring, anim: animAppleSpring },
  Summer: { draw: drawAppleSummer, anim: animAppleSummer },
  Autumn: { draw: drawAppleAutumn, anim: animAppleAutumn },
  Winter: { draw: drawAppleWinter, anim: animAppleWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
