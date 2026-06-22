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

// ── Motion-v2 idle timing ───────────────────────────────────────────────────
// One slow idle loop ≈ 5s. IDLE_W is the base angular frequency so the period
// 2π/IDLE_W ≈ 5s. The subject bob uses A*(1-cos(IDLE_W t))*0.5 — value 0 with
// zero velocity at t=0, and seamless over the 5s loop. Dressing micro-motion
// (glint sweep, leaf stir, drifting flake) layers additively on top.
const IDLE_PERIOD = 5.0;
const IDLE_W = (2 * Math.PI) / IDLE_PERIOD; // ≈ 1.2566 rad/s
const GLINT_SPEED = 1 / IDLE_PERIOD; // glint travels the cheek once per loop

/** Idle vertical bob, 0 at t=0 with zero velocity, seamless over 2π/IDLE_W.
 *  amp is the peak rise in design px. */
function bobAt(t: number, amp: number): number {
  return amp * (1 - Math.cos(IDLE_W * t)) * 0.5;
}

/** A slow eased side-sway gesture that starts at rest (0 at t=0) and returns
 *  to 0 each loop — readable but subtle. Seamless over 2π/IDLE_W. */
function swayAt(t: number, amp: number): number {
  // sin(w t) is 0 at t=0 and seamless; shaping by (1-cos) keeps it gentle near
  // the rest pose so the gesture eases in rather than snapping.
  return amp * Math.sin(IDLE_W * t) * (0.5 + 0.5 * (1 - Math.cos(IDLE_W * t)) * 0.5);
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

// Motion-v2 idle: slow ~5s loop. The blossom rides a gentle eased sway; a slow
// dewy glint creeps across once per loop. No silhouette change, all subtle.
function animAppleSpring(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = swayAt(t, 1.6); // gentle eased blossom sway, 0 at t=0
  const glint = (t * GLINT_SPEED) % 1; // slow dewy glint travelling the cheek
  appleSpring(ctx, sway, glint * Math.PI * 2);
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

// Motion-v2 idle: slow ~5s loop. Apple bob starts at rest (0, zero velocity)
// and a slow specular glint sweeps the cheek once per loop.
function animAppleSummer(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = -bobAt(t, 1.6); // gentle rise (neg y) and settle, 0 at t=0
  const glint = (t * GLINT_SPEED) % 1; // slow specular sweep
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

// Motion-v2 idle: slow ~5s loop. Heavy ripe apple rises and settles; a slow
// dewy glint sweeps the cheek; one gold leaf stirs (a small drift loop) rather
// than tumbling fast — readable and unhurried.
function animAppleAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = -bobAt(t, 1.7); // slow heavy rise-and-settle, 0 at t=0
  const glint = (t * GLINT_SPEED) % 1; // slow travelling glint
  // a gold leaf stirs on the lower-right pad: a gentle slow drift loop that
  // returns to its rest spot each loop (seamless), not a fast tumble.
  const phase = IDLE_W * t;
  const leafFall = {
    x: 14 + Math.sin(phase) * 3,
    y: 8 - (1 - Math.cos(phase)) * 0.5 * 2.5,
    rot: 0.6 + Math.sin(phase) * 0.35,
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

// Motion-v2 idle: a calm slow winter. The four settled flakes stay put (as in
// the still); ONE slow snowflake drifts down across the tile over a full ~10s
// (two idle loops) so it reads clearly, with a soft side drift. The apple
// barely sways and the cold sheen breathes gently.
function animAppleWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const span = 30;
  // the settled flakes from the still — kept static so density matches draw().
  const settled: Array<[number, number, number]> = [
    [-8, -6, 1.4],
    [6, 2, 1.1],
    [11, -12, 1.0],
    [-3, 10, 1.2],
  ];
  // one slow drifting flake on a long ~10s fall, looping seamlessly.
  const prog = ((t / (IDLE_PERIOD * 2)) % 1 + 1) % 1;
  const fy = -22 + prog * span;
  const fx = -2 + Math.sin(prog * Math.PI * 2) * 6; // gentle side drift
  const drifting: [number, number, number] = [fx, fy, 1.3];
  const flakes = settled.concat([drifting]);
  // gentle cold sheen breathing, eased from the still's 0.4 baseline.
  const sheen = 0.4 + 0.15 * (1 - Math.cos(IDLE_W * t)) * 0.5;
  const sway = swayAt(t, 0.7); // wizened apple barely sways, 0 at t=0
  appleWinter(ctx, flakes, sheen, sway);
}

// ── Transitions ──────────────────────────────────────────────────────────────

function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

function clamp01(p: number): number {
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

// Quintic smootherstep — eased staging that still hits 0 at p=0 and 1 at p=1.
function smoother(x: number): number {
  const c = clamp01(x);
  return c * c * c * (c * (6 * c - 15) + 10);
}

// A transient bump that is exactly 0 at p=0 and p=1 (peaks mid-morph). Used for
// overlay strengths (seam glow, sweep band, settling dust) so endpoints stay
// pristine: every transient overlay fades fully away by p=1.
function transient(p: number): number {
  return Math.sin(Math.PI * clamp01(p));
}

// Directional ripening wipe. Renders the `from` still, then reveals the `to`
// still inside a soft-edged region whose coverage grows 0→full as p goes 0→1,
// sweeping along a direction (angle radians, dir vector ⟨cos,sin⟩). At p=0 the
// reveal region is empty (only `from` shows ≡ draw(from)); at p=1 it covers the
// whole design box (`to` fully overpaints ≡ draw(to)). A soft NON-brightening
// haze rides the advancing edge and fades to 0 at both ends via `transient`.
function ripeningWipe(
  ctx: CanvasRenderingContext2D,
  p: number,
  angle: number,
  drawFrom: (c: CanvasRenderingContext2D) => void,
  drawTo: (c: CanvasRenderingContext2D) => void,
): void {
  const q = clamp01(p);
  // base layer: the outgoing season still, always fully drawn.
  ctx.save();
  drawFrom(ctx);
  ctx.restore();

  if (q <= 0) return; // p=0 ≡ draw(from) exactly.

  // The wipe sweeps a half-plane across the box. We clip to a rectangle whose
  // leading edge advances from fully off the box (covers nothing) at q=0 to
  // fully past it (covers everything) at q=1. Box half-extent generously 40px.
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const HALF = 40; // covers the whole −24..+24 box with margin
  // s = signed offset of the leading edge along the sweep axis. At q=0 edge is
  // at −HALF (nothing revealed on the +side); at q=1 edge at +HALF (all
  // revealed). Eased so the wipe reads as an accelerating ripen.
  const s = lerp(-HALF, HALF, smoother(q));

  ctx.save();
  // Build the revealed half-plane as a big rotated rectangle clip.
  ctx.beginPath();
  // rectangle spanning the "already ripened" side: points where
  // (x*dx + y*dy) <= s. Construct it explicitly large.
  const ux = dx;
  const uy = dy; // sweep axis
  const px = -dy;
  const py = dx; // perpendicular axis
  const L = 120;
  // corner at the edge, going to the negative-axis side.
  const ex = ux * s;
  const ey = uy * s;
  ctx.moveTo(ex + px * L, ey + py * L);
  ctx.lineTo(ex - px * L, ey - py * L);
  ctx.lineTo(ex - px * L - ux * L, ey - py * L - uy * L);
  ctx.lineTo(ex + px * L - ux * L, ey + py * L - uy * L);
  ctx.closePath();
  ctx.clip();
  // paint the incoming season still inside the revealed region.
  drawTo(ctx);
  ctx.restore();

  // No additive seam flash (contract: no brightness flash). A soft, non-
  // brightening haze rides the advancing edge so the wipe reads as a moving
  // ripen front; it is 0 at both endpoints via `transient`, leaving the
  // endpoint stills pristine.
  if (q >= 1) return; // p=1 ≡ draw(to) exactly (full coverage; no overlay).
  const haze = transient(q) * 0.18;
  if (haze > 0.005) {
    ctx.save();
    ctx.globalAlpha = haze;
    const g = ctx.createLinearGradient(
      ux * (s - 7),
      uy * (s - 7),
      ux * (s + 7),
      uy * (s + 7),
    );
    g.addColorStop(0, "rgba(255,236,200,0)");
    g.addColorStop(0.5, "rgba(255,236,200,0.7)");
    g.addColorStop(1, "rgba(255,236,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.rect(-24, -24, 48, 48);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// 0: Spring → Summer (Motion-v2, ~1.9s).  The fruit SETS and ripens from one
// side: a soft directional wipe sweeps the summer green-apple still in over the
// spring blossom-twig still, lower-left → upper-right (the fruit swelling up the
// branch). A transient veil of falling petals drifts down mid-morph and is gone
// by both ends. Endpoints: p=0 ≡ draw(Spring), p=1 ≡ draw(Summer), exactly.
function springToSummer(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  // directional ripening sweep, lower-left → upper-right.
  ripeningWipe(ctx, q, -Math.PI * 0.25, drawAppleSpring, drawAppleSummer);

  // transient drifting petals — 0 at both endpoints, peak mid-morph.
  const tr = transient(q);
  if (tr > 0.01) {
    const fall = smoother(q) * 16; // petals sink as the morph progresses
    blossom(ctx, 4, 2 + fall, 4.5, tr, tr * 0.9);
    blossom(ctx, -6, 6 + fall * 0.7, 3.2, tr, tr * 0.8);
    blossom(ctx, 10, -4 + fall * 0.5, 3, tr, tr * 0.7);
  }
  ctx.globalAlpha = 1;
}

// 1: Summer → Autumn (Motion-v2, ~1.9s).  The apple RIPENS from its sun-cheek:
// a soft directional wipe brings the autumn red-apple still in from the lower-
// right (the warm blush side) sweeping up-left across the cheek, so the red
// flushes across like real ripening. A transient amber wash blooms over the
// stem-leaf as it turns. Endpoints: p=0 ≡ draw(Summer), p=1 ≡ draw(Autumn).
function summerToAutumn(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  // sweep from lower-right (blush cheek) toward upper-left.
  ripeningWipe(ctx, q, Math.PI * 0.85, drawAppleSummer, drawAppleAutumn);

  // transient amber wash over the stem-leaf area as the foliage turns gold.
  const tr = transient(q);
  if (tr > 0.01) {
    ctx.save();
    ctx.globalAlpha = tr * 0.45;
    const g = ctx.createRadialGradient(5, -13, 1, 5, -13, 12);
    g.addColorStop(0, "rgba(224,167,58,0.9)");
    g.addColorStop(1, "rgba(224,167,58,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(5, -12, 12, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// 2: Autumn → Winter (Motion-v2, ~1.9s).  The scene goes dormant from the
// GROUND UP: a soft directional wipe brings the winter still in sweeping bottom
// → top, so frost/snow visibly creeps up from the base while the snow cap
// settles on top last. Transient drifting flakes thicken mid-morph and clear by
// the end. Endpoints: p=0 ≡ draw(Autumn), p=1 ≡ draw(Winter), exactly.
function autumnToWinter(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  // sweep bottom → top: with reveal region (x·dx + y·dy ≤ s) and s growing from
  // −HALF, choosing dy = −1 (angle = −π/2) makes large-y (the base) the most
  // negative, so the bottom is revealed first and frost creeps UP from the base.
  ripeningWipe(ctx, q, -Math.PI * 0.5, drawAppleAutumn, drawAppleWinter);

  // transient extra drifting flakes — thicken mid-morph, gone by both ends.
  const tr = transient(q);
  if (tr > 0.01) {
    ctx.save();
    ctx.globalAlpha = tr * 0.85;
    ctx.fillStyle = "#ffffff";
    const motes: Array<[number, number, number]> = [
      [-10, -8, 1.1],
      [4, -16, 0.9],
      [12, -3, 1.0],
      [-2, -20, 0.8],
    ];
    motes.forEach(([mx, my, mr]) => {
      ctx.beginPath();
      ctx.arc(mx, my + smoother(q) * 10, mr, 0, Math.PI * 2);
      ctx.fill();
    });
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
