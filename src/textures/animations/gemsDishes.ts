// Gems & dishes — animated variants (idle rebuild).
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds). The caller
// clears, translates to centre, scales by S/64, sets lineCap/lineJoin="round",
// and calls us; we draw at origin within a ~-24..+24 box (ground baseline ~y=22).
// Everything is deterministic in `t` (no Math.random / Date) and loops
// seamlessly: positions are driven off `loopPhase`/`pingPong`/`breathe`/`beat`
// (never a raw sawtooth used as a position) so cycles tile exactly.
//
// Shapes/colours mirror src/textures/categories/gems.ts and dishes.ts so the
// silhouette + palette read the same — we only change MOTION and FRAMING.
//
// The rebuild leads with real body deformation (dip→snap→overshoot "show-off"
// on the gems, undulating surfaces + fat steam plumes on the dishes) and demotes
// the old hard glint bar / soap-ring bubbles to characterful secondary accents.
// The two mini-sets are pulled toward one visual weight: every icon now has a
// rest pose plus a periodic MOMENT (a facet flash, a fire-flash, a simmer pop, a
// drip detach) rather than a constant metronome, and shadows couple to motion.

import {
  TAU,
  clamp01,
  lerp,
  breathe,
  loopPhase,
  pingPong,
  beat,
  twinkle,
  easeInOutSine,
  easeOutBack,
  easeOutCubic,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// Local helpers (module-specific; shared vocabulary lives in _anim.ts)
// ---------------------------------------------------------------------------

/** The gem "show-off": a periodic dip → snap → overshoot → settle, returned as a
 *  small vertical bob (px, negative = up) plus a 0..1 facet-flash envelope that
 *  peaks at the snap. Driven off one `loopPhase` so it loops seamlessly; the
 *  three table gems pass different `offset`s to stay out of phase. */
function showOff(t: number, period: number, offset: number): { bob: number; dip: number; flash: number } {
  const u = loopPhase(t, period, offset);
  // Rest for most of the cycle; the move happens in the first `act` fraction.
  const act = 0.42;
  if (u >= act) {
    return { bob: 0, dip: 0, flash: 0 };
  }
  const p = u / act; // 0..1 across the move
  const anticip = 0.28; // wind-up fraction (a small dip down)
  let bob: number;
  let flash: number;
  if (p < anticip) {
    // Anticipation: ease down into a crouch.
    const a = easeInOutSine(p / anticip);
    bob = a * 2.2; // dips DOWN (positive y)
    flash = 0;
  } else {
    // Snap up past the mark, then settle (overshoot principle).
    const a = easeOutBack((p - anticip) / (1 - anticip), 2.4);
    bob = lerp(2.2, -3.0, a); // from the crouch, up past the top, settles to 0
    // Hard glint flash fires at the snap and decays fast.
    const fp = (p - anticip) / (1 - anticip);
    flash = Math.max(0, 1 - fp * 1.6);
    flash = flash * flash;
  }
  return { bob, dip: bob > 0 ? bob : 0, flash };
}

/** A bright hard facet-flash band swept across the CURRENT CLIP — the "show-off"
 *  glint (distinct from the feathered idle `glint`). `k` is 0..1 intensity;
 *  travels along the diagonal from upper-left to lower-right by `phase`. */
function facetFlash(ctx: CanvasRenderingContext2D, phase: number, k: number, length: number): void {
  if (k <= 0) return;
  const travel = -length * 0.55 + clamp01(phase) * length * 1.1;
  ctx.save();
  ctx.translate(travel, travel * 0.18);
  ctx.rotate(-Math.PI / 4);
  const grad = ctx.createLinearGradient(-5, 0, 5, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, `rgba(255,255,255,${0.85 * k})`);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-5, -length, 10, length * 2);
  ctx.restore();
}

/** A fat, soft, rising steam plume (filled blob that grows + drifts + fades) —
 *  replaces the invisible thin stroked wisps. `phase` 0..1 loops; `sx` base x,
 *  `baseY` the surface y, `rise` how far it travels up, `w` plume width, `tint`
 *  the rgb string. */
function steamPlume(
  ctx: CanvasRenderingContext2D,
  phase: number,
  sx: number,
  baseY: number,
  rise: number,
  w: number,
  tint: string,
): void {
  const p = clamp01(phase);
  const y = baseY - rise * p; // travels up
  const sway = Math.sin(p * Math.PI * 2 + sx) * (w * 0.5);
  // Fade in over first 18%, hold, fade out over the last 40%; grows as it rises.
  let alpha: number;
  if (p < 0.18) alpha = p / 0.18;
  else if (p > 0.6) alpha = (1 - p) / 0.4;
  else alpha = 1;
  alpha = clamp01(alpha) * 0.5;
  if (alpha <= 0) return;
  const grow = 0.5 + p * 1.1;
  const rx = w * grow;
  const ry = w * grow * 1.25;
  const grad = ctx.createRadialGradient(sx + sway, y, 0.5, sx + sway, y, rx + 1);
  grad.addColorStop(0, `rgba(${tint},${alpha})`);
  grad.addColorStop(0.6, `rgba(${tint},${alpha * 0.55})`);
  grad.addColorStop(1, `rgba(${tint},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(sx + sway, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

// ===========================================================================
// GEMS
// ===========================================================================

// --- ruby silhouette + body (mirrors gems.ts drawRuby, minus its shadow) -----
function rubyShape(ctx: CanvasRenderingContext2D): void {
  ctx.moveTo(0, -16);
  ctx.lineTo(16, -8);
  ctx.lineTo(18, -2);
  ctx.lineTo(0, 22);
  ctx.lineTo(-18, -2);
  ctx.lineTo(-16, -8);
  ctx.closePath();
}

function rubyBody(ctx: CanvasRenderingContext2D): void {
  const body = ctx.createRadialGradient(-4, -6, 2, 0, 2, 24);
  body.addColorStop(0, "#ff6a7a");
  body.addColorStop(0.5, "#d4143a");
  body.addColorStop(1, "#6a0418");
  ctx.fillStyle = body;
  ctx.beginPath();
  rubyShape(ctx);
  ctx.fill();
  ctx.strokeStyle = "#3a020e";
  ctx.lineWidth = 2;
  ctx.stroke();

  const table = ctx.createLinearGradient(0, -16, 0, -4);
  table.addColorStop(0, "#ffb0bc");
  table.addColorStop(1, "#e23a54");
  ctx.fillStyle = table;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(9, -6);
  ctx.lineTo(0, -2);
  ctx.lineTo(-9, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(58,2,14,0.7)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(58,2,14,0.6)";
  ctx.lineWidth = 1.2;
  ([[-16, -8], [16, -8]] as Array<[number, number]>).forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx < 0 ? -9 : 9, -6);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-16, -8);
  ctx.lineTo(0, -16);
  ctx.lineTo(16, -8);
  ctx.stroke();

  ctx.strokeStyle = "rgba(58,2,14,0.55)";
  ctx.lineWidth = 1.1;
  ([[-18, -2], [-9, -6], [0, -2], [9, -6], [18, -2]] as Array<[number, number]>).forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(0, 22);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(255,170,185,0.5)";
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.lineTo(0, -2);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.moveTo(-3, -13);
  ctx.lineTo(3, -12);
  ctx.lineTo(-1, -6);
  ctx.closePath();
  ctx.fill();
}

// ruby — a dip→snap→overshoot "show-off" leads; a hard glint flash fires at the
// snap (out of phase vs sapphire/emerald), with a feathered idle sheen + a clean
// sparkle ping as secondary accents. Shadow couples to the bob.
function animRuby(ctx: CanvasRenderingContext2D, t: number): void {
  const { bob, flash } = showOff(t, 3.0, 0.0);
  // A faint always-on breath so it never reads frozen at rest.
  const br = breathe(t, 2.6, 0.012, 1.0);

  groundShadow(ctx, 0, 22, 16, 4, -bob, 0.22);

  ctx.save();
  ctx.translate(0, bob);
  // Squash a touch on the down-crouch, stretch tall as it snaps up.
  const sx = bob > 0 ? 1 + bob * 0.02 : 1 - bob * 0.012;
  const sy = bob > 0 ? 1 - bob * 0.02 : 1 - bob * 0.018;
  ctx.scale(sx * br, sy * br);

  rubyBody(ctx);

  // Hard show-off flash (fires at the snap) + a feathered idle sheen, both
  // clipped to the silhouette.
  ctx.save();
  ctx.beginPath();
  rubyShape(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.4), { span: 18, width: 7, intensity: 0.26, length: 44 });
  facetFlash(ctx, 0.5, flash, 40);
  ctx.restore();

  // A clean sparkle pings on the crown as it shows off.
  sparkle(ctx, 8, -10, 2.6 + flash * 1.4, 0.55 + 0.45 * Math.max(flash, twinkle(t, 3.0, 0.0)), "255,210,220");
  sparkle(ctx, -5, 6, 1.8, 0.45 * twinkle(t, 2.4, 0.5), "255,210,220");
  ctx.restore();
}

// --- sapphire ----------------------------------------------------------------
function sapphireShape(ctx: CanvasRenderingContext2D): void {
  ctx.moveTo(0, -16);
  ctx.lineTo(14, -10);
  ctx.lineTo(18, 0);
  ctx.lineTo(0, 22);
  ctx.lineTo(-18, 0);
  ctx.lineTo(-14, -10);
  ctx.closePath();
}

function sapphireBody(ctx: CanvasRenderingContext2D): void {
  const body = ctx.createRadialGradient(-4, -6, 2, 0, 2, 24);
  body.addColorStop(0, "#6aa8ff");
  body.addColorStop(0.5, "#1a48c8");
  body.addColorStop(1, "#06143f");
  ctx.fillStyle = body;
  ctx.beginPath();
  sapphireShape(ctx);
  ctx.fill();
  ctx.strokeStyle = "#040a26";
  ctx.lineWidth = 2;
  ctx.stroke();

  const table = ctx.createLinearGradient(0, -15, 0, 0);
  table.addColorStop(0, "#a8c8ff");
  table.addColorStop(1, "#2a5ce0");
  ctx.fillStyle = table;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(8, -2);
  ctx.lineTo(0, 2);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(4,10,38,0.7)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(4,10,38,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, -10);
  ctx.lineTo(0, -15);
  ctx.lineTo(14, -10);
  ctx.stroke();
  ([[-14, -10], [14, -10]] as Array<[number, number]>).forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx < 0 ? -8 : 8, -2);
    ctx.stroke();
  });

  ctx.strokeStyle = "rgba(4,10,38,0.55)";
  ctx.lineWidth = 1.1;
  ([[-18, 0], [-8, -2], [0, 2], [8, -2], [18, 0]] as Array<[number, number]>).forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(0, 22);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(150,190,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(8, -2);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(-3, -12);
  ctx.lineTo(3, -11);
  ctx.lineTo(-1, -5);
  ctx.closePath();
  ctx.fill();
}

// sapphire — same show-off rig as ruby but OUT OF PHASE; the dark-bottom gradient
// swallowed the old faint sheen, so the idle glint + flash are raised in
// intensity. A brighter table highlight rides the snap.
function animSapphire(ctx: CanvasRenderingContext2D, t: number): void {
  const { bob, flash } = showOff(t, 3.0, 0.4); // offset from ruby
  const br = breathe(t, 2.7, 0.012, 1.0, 0.3);

  groundShadow(ctx, 0, 22, 16, 4, -bob, 0.22);

  ctx.save();
  ctx.translate(0, bob);
  const sx = bob > 0 ? 1 + bob * 0.02 : 1 - bob * 0.012;
  const sy = bob > 0 ? 1 - bob * 0.02 : 1 - bob * 0.018;
  ctx.scale(sx * br, sy * br);

  sapphireBody(ctx);

  ctx.save();
  ctx.beginPath();
  sapphireShape(ctx);
  ctx.clip();
  // Raised intensity so the shine survives the dark pavilion.
  glint(ctx, loopPhase(t, 3.6, 0.2), { span: 18, width: 8, intensity: 0.4, length: 44 });
  facetFlash(ctx, 0.5, flash, 40);
  // A bright table relight pulse as it shows off (lifts the dark gem).
  ctx.fillStyle = `rgba(180,210,255,${0.18 * flash})`;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(8, -2);
  ctx.lineTo(0, 2);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  sparkle(ctx, 7, -9, 2.4 + flash * 1.4, 0.5 + 0.5 * Math.max(flash, twinkle(t, 2.9, 0.2)), "200,225,255");
  sparkle(ctx, -6, 8, 1.8, 0.45 * twinkle(t, 2.5, 0.7), "200,225,255");
  ctx.restore();
}

// --- emerald -----------------------------------------------------------------
function emeraldDims(): { w: number; h: number; c: number; outline: Array<[number, number]> } {
  const w = 14;
  const h = 19;
  const c = 5;
  const outline: Array<[number, number]> = [
    [-w + c, -h], [w - c, -h],
    [w, -h + c], [w, h - c],
    [w - c, h], [-w + c, h],
    [-w, h - c], [-w, -h + c],
  ];
  return { w, h, c, outline };
}

function emeraldShape(ctx: CanvasRenderingContext2D): void {
  const { outline } = emeraldDims();
  outline.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function emeraldBody(ctx: CanvasRenderingContext2D): void {
  const { w, h, c, outline } = emeraldDims();
  const body = ctx.createLinearGradient(-w, -h, w, h);
  body.addColorStop(0, "#5ce29a");
  body.addColorStop(0.5, "#0e9c52");
  body.addColorStop(1, "#04401f");
  ctx.fillStyle = body;
  ctx.beginPath();
  emeraldShape(ctx);
  ctx.fill();
  ctx.strokeStyle = "#022914";
  ctx.lineWidth = 2;
  ctx.stroke();

  const inset = 4;
  const iw = w - inset;
  const ih = h - inset;
  const ic = c - 2;
  const inner: Array<[number, number]> = [
    [-iw + ic, -ih], [iw - ic, -ih],
    [iw, -ih + ic], [iw, ih - ic],
    [iw - ic, ih], [-iw + ic, ih],
    [-iw, ih - ic], [-iw, -ih + ic],
  ];
  ctx.strokeStyle = "rgba(2,41,20,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  inner.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.stroke();

  const table = ctx.createLinearGradient(0, -ih, 0, ih);
  table.addColorStop(0, "#aef0c8");
  table.addColorStop(1, "#1fb866");
  ctx.fillStyle = table;
  const tw = iw - 3;
  const th = ih - 3;
  ctx.beginPath();
  ctx.moveTo(-tw, -th);
  ctx.lineTo(tw, -th);
  ctx.lineTo(tw, th);
  ctx.lineTo(-tw, th);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(2,41,20,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = "rgba(2,41,20,0.5)";
  ctx.lineWidth = 1;
  outline.forEach(([x, y], i) => {
    const [ix, iy] = inner[i];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ix, iy);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.moveTo(-tw + 1, -th + 1);
  ctx.lineTo(-1, -th + 1);
  ctx.lineTo(-tw + 1, -2);
  ctx.closePath();
  ctx.fill();
}

// emerald — the deadest gem gets the most: the show-off bob, a gentle ±5° rock
// about its base, AND a sequential step-facet flash that climbs the concentric
// rings (table → inner → outer) so the cut "reads" tier by tier.
function animEmerald(ctx: CanvasRenderingContext2D, t: number): void {
  const { bob, flash } = showOff(t, 3.2, 0.7);
  const rock = Math.sin(t * 1.1) * (5 * Math.PI / 180); // ±5°
  const br = breathe(t, 2.8, 0.01, 1.0, 0.1);

  groundShadow(ctx, Math.sin(t * 1.1) * 5, 22, 15, 4, -bob, 0.22);

  ctx.save();
  ctx.translate(0, bob);
  // Rock about the bottom of the stone (h ≈ 19 below centre).
  ctx.translate(0, 19);
  ctx.rotate(rock);
  ctx.translate(0, -19);
  const sxs = bob > 0 ? 1 + bob * 0.018 : 1 - bob * 0.01;
  const sys = bob > 0 ? 1 - bob * 0.018 : 1 - bob * 0.016;
  ctx.scale(sxs * br, sys * br);

  emeraldBody(ctx);

  const { w, h } = emeraldDims();
  const iw = w - 4;
  const ih = h - 4;
  const tw = iw - 3;
  const th = ih - 3;

  // Sequential step-facet flash: a band that climbs ring-by-ring, then the
  // show-off flash on top. Drive the climb off a slow loop so it always runs.
  const climb = loopPhase(t, 2.4);
  // Three rings light in turn (each gets a 1/3 window); brightness eases.
  const ringPhase = climb * 3;
  ([
    [tw, th, 0],        // table (innermost)
    [iw, ih, 1],        // inner ring
    [w, h, 2],          // outer
  ] as Array<[number, number, number]>).forEach(([rw, rh, idx]) => {
    const local = ringPhase - idx;
    const k = local > 0 && local < 1 ? Math.sin(local * Math.PI) : 0;
    if (k <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-rw, -rh, rw * 2, rh * 2);
    ctx.clip();
    ctx.strokeStyle = `rgba(220,255,235,${0.5 * k})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.rect(-rw + 0.5, -rh + 0.5, rw * 2 - 1, rh * 2 - 1);
    ctx.stroke();
    ctx.restore();
  });

  // Show-off facet flash across the whole stone.
  ctx.save();
  ctx.beginPath();
  emeraldShape(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.8, 0.5), { span: 16, width: 7, intensity: 0.3, length: 44 });
  facetFlash(ctx, 0.5, flash, 40);
  ctx.restore();

  sparkle(ctx, tw - 2, th - 3, 2.2 + flash * 1.2, 0.5 + 0.5 * Math.max(flash, twinkle(t, 3.1, 0.1)), "210,255,225");
  sparkle(ctx, -3, -1, 1.4, 0.4 * twinkle(t, 2.6, 0.6), "210,255,225");
  ctx.restore();
}

// --- amethyst ----------------------------------------------------------------
interface Prism {
  x: number;
  base: number;
  top: number;
  w: number;
  lean: number;
  phase: number; // sway phase offset
}

const AMETHYST_PRISMS: Prism[] = [
  { x: -10, base: 20, top: -2, w: 5, lean: -0.18, phase: 0.0 },
  { x: 10, base: 20, top: 0, w: 5, lean: 0.18, phase: 2.1 },
  { x: 0, base: 22, top: -18, w: 6.5, lean: 0, phase: 4.0 },
  { x: -3, base: 20, top: -8, w: 4, lean: -0.05, phase: 1.0 },
];

function amethystClusterPath(ctx: CanvasRenderingContext2D): void {
  // A rough hull around the cluster so the glow can be clipped to it (instead of
  // a circle floating over a tall cluster).
  ctx.moveTo(-16, 21);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-3, -8);
  ctx.lineTo(0, -18);
  ctx.lineTo(4, -6);
  ctx.lineTo(14, -2);
  ctx.lineTo(16, 21);
  ctx.closePath();
}

// amethyst — a glow pulse that "does" something: a bright pulse RACES up each
// prism tip (per-prism, offset), each prism SWAYS on its own phase about its
// base, and the soft glow is CLIPPED to the cluster hull rather than a circle.
function animAmethyst(ctx: CanvasRenderingContext2D, t: number): void {
  const breath = breathe(t, 2.9, 0.014, 1.0);

  groundShadow(ctx, 0, 22, 17, 4, 0, 0.22);

  // Soft glow, clipped to the cluster silhouette (was a circle).
  ctx.save();
  ctx.beginPath();
  amethystClusterPath(ctx);
  ctx.clip();
  const glowK = 0.16 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.8));
  const g = ctx.createRadialGradient(0, 6, 3, 0, 6, 24);
  g.addColorStop(0, `rgba(200,140,255,${glowK})`);
  g.addColorStop(1, "rgba(200,140,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-18, -22, 36, 46);
  ctx.restore();

  ctx.save();
  ctx.scale(breath, breath);

  // Draw each prism with its own sway + a pulse that races up the tip.
  AMETHYST_PRISMS.forEach((p) => {
    const swayAmt = Math.sin(t * 1.5 + p.phase) * 0.9; // px lateral at the tip
    const tx = p.x + p.lean * 22 + swayAmt;
    const tipY = p.top;
    const w = p.w;

    const left = ctx.createLinearGradient(p.x - w, 0, p.x, 0);
    left.addColorStop(0, "#7a3ab0");
    left.addColorStop(1, "#b878e8");
    const right = ctx.createLinearGradient(p.x, 0, p.x + w, 0);
    right.addColorStop(0, "#9a58d0");
    right.addColorStop(1, "#4a1878");

    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(p.x - w, p.base);
    ctx.lineTo(p.x, p.base + 1.5);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx - w + 1, tipY + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(p.x + w, p.base);
    ctx.lineTo(p.x, p.base + 1.5);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx + w - 1, tipY + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#caa0f0";
    ctx.beginPath();
    ctx.moveTo(tx - w + 1, tipY + 4);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx, tipY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6a2aa0";
    ctx.beginPath();
    ctx.moveTo(tx + w - 1, tipY + 4);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx, tipY + 5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#2e0c52";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p.x - w, p.base);
    ctx.lineTo(tx - w + 1, tipY + 4);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx + w - 1, tipY + 4);
    ctx.lineTo(p.x + w, p.base);
    ctx.stroke();
    ctx.strokeStyle = "rgba(46,12,82,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.base + 1.5);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx, tipY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(240,220,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - w + 1.5, p.base - 1);
    ctx.lineTo(tx - w + 2, tipY + 5);
    ctx.stroke();

    // A bright energy pulse races up the central ridge of THIS prism, peaking at
    // the tip, then resting. Each prism fires on a staggered beat.
    const pulse = beat(t, 2.0, 0.45, p.phase * 0.16);
    if (pulse > 0.01) {
      // Position along base→tip; the pulse is a moving bright node.
      const u = clamp01(pulse); // 0..1 envelope; map a rising node off a phase
      const rise = loopPhase(t, 2.0, p.phase * 0.16); // where the node sits
      const nx = lerp(p.x, tx, rise);
      const ny = lerp(p.base + 1.5, tipY, rise);
      const nr = 2.4 * u;
      const ng = ctx.createRadialGradient(nx, ny, 0.3, nx, ny, nr + 1);
      ng.addColorStop(0, `rgba(245,225,255,${0.85 * u})`);
      ng.addColorStop(1, "rgba(200,150,255,0)");
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(nx, ny, nr + 1, 0, TAU);
      ctx.fill();
    }
  });
  ctx.restore();

  // Tip sparkles ping with the pulses.
  sparkle(ctx, 0, -16, 2.6 * (0.6 + 0.4 * twinkle(t, 2.0, 0.0)), 0.85, "240,220,255");
  sparkle(ctx, -10, -1, 1.8 * (0.6 + 0.4 * twinkle(t, 2.3, 0.4)), 0.6, "240,220,255");
  sparkle(ctx, 10, 1, 1.6 * (0.6 + 0.4 * twinkle(t, 2.5, 0.8)), 0.6, "240,220,255");
}

// --- opal --------------------------------------------------------------------
interface Fleck {
  x: number;
  y: number;
  r: number;
  hue: number;
  a: number;
  phase: number;
}

// Small ANGULAR flecks (diamond shards), not soft soap bubbles. Hue is a small
// per-fleck offset within a constrained band (not a full rainbow disco).
const OPAL_FLECKS: Fleck[] = [
  { x: -6, y: -4, r: 3.2, hue: -30, a: 0.6, phase: 0.0 },
  { x: 6, y: -2, r: 3.0, hue: 10, a: 0.6, phase: 1.3 },
  { x: -2, y: 8, r: 3.4, hue: 30, a: 0.55, phase: 2.6 },
  { x: 9, y: 8, r: 2.4, hue: -10, a: 0.55, phase: 3.9 },
  { x: -10, y: 5, r: 2.4, hue: 20, a: 0.55, phase: 5.0 },
  { x: 2, y: -9, r: 2.6, hue: -20, a: 0.55, phase: 1.9 },
  { x: 8, y: -8, r: 2.0, hue: 0, a: 0.5, phase: 3.2 },
];

/** A small filled diamond (angular fleck) centred at (x,y). */
function fleckDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const pts: Array<[number, number]> = [
    [0, -r],
    [r * 0.55, 0],
    [0, r],
    [-r * 0.55, 0],
  ];
  ctx.beginPath();
  pts.forEach(([px, py], i) => {
    const rx = x + px * cos - py * sin;
    const ry = y + px * sin + py * cos;
    if (i === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  });
  ctx.closePath();
  ctx.fill();
}

// opal — keep the lovely drifting play-of-colour, but tighten the flecks to small
// ANGULAR shards (was soap bubbles), constrain the hue to a green-blue/violet
// band (was full-spectrum disco), and add a periodic FIRE-FLASH (a broad
// iridescent sheet that flares across the dome on a beat).
function animOpal(ctx: CanvasRenderingContext2D, t: number): void {
  const breath = breathe(t, 2.8, 0.015, 1.0);
  ctx.save();
  ctx.scale(breath, breath);

  groundShadow(ctx, 0, 22, 16, 4, 0, 0.22);

  // Milky cabochon dome.
  const body = ctx.createRadialGradient(-5, -5, 2, 0, 2, 22);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.6, "#e8eef4");
  body.addColorStop(1, "#aab8c8");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 16, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#6a7888";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Iridescent flecks + fire-flash (clipped to the cabochon).
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 16, 0, 0, TAU);
  ctx.clip();

  // Base hue cycles slowly through a CONSTRAINED band: teal(170) → blue(210) →
  // violet(270) and back, so it shimmers without going full rainbow.
  const baseHue = 215 + Math.sin(t * 0.5) * 55; // ~160..270

  OPAL_FLECKS.forEach((f) => {
    const drift = t * 0.5 + f.phase;
    const dx = Math.cos(drift) * 1.6;
    const dy = Math.sin(drift * 0.8) * 1.3;
    const hue = baseHue + f.hue; // small per-fleck offset within the band
    const a = f.a * (0.55 + 0.45 * Math.sin(t * 1.5 + f.phase));
    ctx.fillStyle = `hsla(${hue},80%,64%,${clamp01(a)})`;
    fleckDiamond(ctx, f.x + dx, f.y + dy, f.r, drift * 0.4 + f.phase);
  });

  // Periodic FIRE-FLASH: a broad iridescent sheet flares across the dome (a
  // travelling bright band tinted with the current hue), on a slow beat.
  const fire = beat(t, 4.2, 0.3);
  if (fire > 0.01) {
    const sweep = loopPhase(t, 4.2); // band position
    const fx = lerp(-18, 18, sweep);
    const fg = ctx.createLinearGradient(fx - 9, -16, fx + 9, 18);
    fg.addColorStop(0, `hsla(${baseHue - 30},90%,70%,0)`);
    fg.addColorStop(0.5, `hsla(${baseHue},92%,72%,${0.5 * fire})`);
    fg.addColorStop(1, `hsla(${baseHue + 40},90%,70%,0)`);
    ctx.fillStyle = fg;
    ctx.fillRect(-18, -16, 36, 36);
  }

  // Opalescent haze to mute the flecks.
  const haze = ctx.createRadialGradient(-5, -5, 2, 0, 2, 20);
  haze.addColorStop(0, "rgba(255,255,255,0.42)");
  haze.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 16, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Glossy specular dome highlight.
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-6, -6, 4, 2.5, -0.5, 0, TAU);
  ctx.fill();

  sparkle(ctx, 8, -7, 2.4 * (0.6 + 0.4 * twinkle(t, 2.4, 0.3)) + fire * 1.2, 0.8, "235,245,255");
  sparkle(ctx, -8, 8, 1.6 * (0.6 + 0.4 * twinkle(t, 2.7, 0.7)), 0.6, "235,245,255");
  ctx.restore();
}

// ===========================================================================
// DISHES
// ===========================================================================

// dish_soup — the old steam was invisible; replace with fat soft steam plumes,
// a clearly UNDULATING soup surface (the rim wobbles), bobbing bits, and a
// periodic simmer bubble that swells and pops at the surface.
function animSoup(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 0, 22, 21, 4.5, 0, 0.22);

  // Fat rising steam plumes (drawn behind the bowl rim, above the surface).
  steamPlume(ctx, loopPhase(t, 2.6, 0.0), -7, -2, 22, 3.4, "255,255,255");
  steamPlume(ctx, loopPhase(t, 2.6, 0.5), 7, -2, 22, 3.4, "255,255,255");
  steamPlume(ctx, loopPhase(t, 3.0, 0.25), 0, -4, 24, 3.0, "255,250,240");

  // Bowl body
  const bowl = ctx.createLinearGradient(0, 2, 0, 20);
  bowl.addColorStop(0, "#fbfbf6");
  bowl.addColorStop(0.5, "#e2e2da");
  bowl.addColorStop(1, "#a8a8a0");
  ctx.fillStyle = bowl;
  ctx.beginPath();
  ctx.moveTo(-21, 2);
  ctx.bezierCurveTo(-19, 18, 19, 18, 21, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#6a6a62";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, 5);
  ctx.bezierCurveTo(-14, 13, -8, 16, -2, 16);
  ctx.stroke();

  // Soup surface — a visibly undulating rim. Build the ellipse rim from points
  // with a travelling sine so it ripples (not a static ellipse breathing by
  // half a pixel).
  const surf = ctx.createRadialGradient(-4, -2, 2, 0, 0, 22);
  surf.addColorStop(0, "#ffc864");
  surf.addColorStop(0.6, "#e88a2c");
  surf.addColorStop(1, "#b85e14");
  ctx.fillStyle = surf;
  ctx.beginPath();
  const segs = 40;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * TAU;
    const wob = Math.sin(a * 3 + t * 3.2) * 0.7 + Math.sin(a * 2 - t * 2.1) * 0.5;
    const rx = 21;
    const ry = 7 + wob;
    const px = Math.cos(a) * rx;
    const py = 1 + Math.sin(a) * ry;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a4a10";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Clip subsequent surface detail to the soup so bits/bubble stay inside.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 1, 21, 8, 0, 0, TAU);
  ctx.clip();

  // Floating bits bob with the undulation.
  const bits: Array<[number, number, string, number]> = [
    [-8, 0, "#e8542c", 0], [4, 2, "#5a9a2e", 1], [9, -1, "#e8542c", 2],
    [-3, 3, "#5a9a2e", 3], [-12, 1, "#f0c020", 4],
  ];
  bits.forEach(([bx, by, c, i]) => {
    const bob = Math.sin(t * 3.0 + i * 1.2) * 1.0;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(bx, by + bob, 1.8, 0, TAU);
    ctx.fill();
  });

  // A simmer bubble swells at the surface and pops on a beat.
  const bubP = loopPhase(t, 2.2);
  const grow = bubP < 0.75 ? easeOutCubic(bubP / 0.75) : 1;
  const br = 2.6 * grow;
  const ba = bubP < 0.75 ? 0.7 : Math.max(0, (1 - bubP) / 0.25) * 0.7;
  const bx = -5;
  const by = -1;
  if (ba > 0.02) {
    ctx.fillStyle = `rgba(255,225,150,${ba})`;
    ctx.beginPath();
    ctx.arc(bx, by - grow * 1.0, br, 0, TAU);
    ctx.fill();
    // Pop ring as it bursts.
    if (bubP >= 0.75) {
      const pop = (bubP - 0.75) / 0.25;
      ctx.strokeStyle = `rgba(255,235,180,${(1 - pop) * 0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by - 1.0, br + pop * 3, 0, TAU);
      ctx.stroke();
    }
  }

  // Surface sheen drifts gently.
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7 + pingPong(t, 4.0) * 4 - 2, -1, 5, 2, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// dish_stew — old bubbles were hollow dark-edged "soap rings" and steam was
// invisible. Fill the bubbles BRIGHT with a pop-ring on burst, UNDULATE the
// molten surface, and add fat steam plumes.
function animStew(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 0, 23, 22, 4.5, 0, 0.24);

  // Fat steam plumes (warm-tinted) rising from the surface.
  steamPlume(ctx, loopPhase(t, 2.8, 0.0), -6, -6, 22, 3.2, "240,225,205");
  steamPlume(ctx, loopPhase(t, 2.8, 0.5), 8, -6, 21, 3.2, "240,225,205");

  // Cauldron body
  const pot = ctx.createRadialGradient(-6, -2, 3, 0, 4, 24);
  pot.addColorStop(0, "#5a5a64");
  pot.addColorStop(0.5, "#3a3a44");
  pot.addColorStop(1, "#16161c");
  ctx.fillStyle = pot;
  ctx.beginPath();
  ctx.moveTo(-20, -6);
  ctx.bezierCurveTo(-24, 4, -20, 20, -8, 22);
  ctx.bezierCurveTo(0, 24, 8, 24, 12, 22);
  ctx.bezierCurveTo(24, 18, 24, 2, 20, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pot rim
  ctx.fillStyle = "#48484f";
  ctx.beginPath();
  ctx.ellipse(0, -6, 21, 6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Stew surface — undulating molten brown (rim wobbles like a hot surface).
  const stew = ctx.createRadialGradient(-4, -8, 2, 0, -6, 18);
  stew.addColorStop(0, "#a8682c");
  stew.addColorStop(0.6, "#7a3e14");
  stew.addColorStop(1, "#4a220a");
  ctx.fillStyle = stew;
  ctx.beginPath();
  const segs = 36;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * TAU;
    const wob = Math.sin(a * 3 + t * 2.6) * 0.5 + Math.sin(a * 2 - t * 1.7) * 0.4;
    const rx = 18;
    const ry = 4.6 + wob;
    const px = Math.cos(a) * rx;
    const py = -6 + Math.sin(a) * ry;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Warmth glow over the surface (pulses).
  const warm = 0.14 + 0.12 * (0.5 + 0.5 * Math.sin(t * 2.0));
  const wg = ctx.createRadialGradient(0, -6, 1, 0, -6, 18);
  wg.addColorStop(0, `rgba(255,165,70,${warm})`);
  wg.addColorStop(1, "rgba(255,165,70,0)");
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.ellipse(0, -6, 18, 4.8, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, -6, 18, 4.6, 0, 0, TAU);
  ctx.stroke();

  // Chunks bob slightly with the surface.
  const chunks: Array<[number, number, number, string, number]> = [
    [-9, -7, 3, "#8a4a1c", 0], [2, -8, 3.2, "#9a5a24", 1], [9, -6, 2.6, "#c87a30", 2],
    [-3, -5, 2.2, "#5a8a2e", 3], [6, -4, 2, "#d8a838", 4],
  ];
  chunks.forEach(([cx, cy, cr, c, i]) => {
    const bob = Math.sin(t * 2.4 + i * 1.3) * 0.5;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, cr, cr * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,20,8,0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Surfacing-and-popping bubbles — now FILLED bright with a hot core + a pop
  // ring on burst (clipped to the stew surface).
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -6, 18, 4.6, 0, 0, TAU);
  ctx.clip();
  const bubbles: Array<[number, number, number, number]> = [
    [-12, -6, 1.8, 0.0], [11, -7, 1.6, 0.37], [-1, -9, 1.4, 0.71],
    [4, -5, 1.7, 0.18], [-6, -5, 1.5, 0.54], [8, -8, 1.6, 0.86],
  ];
  bubbles.forEach(([bx, by, br, off]) => {
    const ph = loopPhase(t, 1.7, off);
    const grow = ph < 0.78 ? easeOutCubic(ph / 0.78) : 1;
    const r = br * (0.35 + 0.65 * grow);
    const rise = grow * 1.6;
    if (ph < 0.78) {
      // Bright filled bubble with a hot centre (not a hollow ring).
      const bg = ctx.createRadialGradient(bx, by - rise, 0.2, bx, by - rise, r);
      bg.addColorStop(0, "rgba(255,235,180,0.85)");
      bg.addColorStop(0.6, "rgba(255,190,110,0.6)");
      bg.addColorStop(1, "rgba(230,140,60,0.25)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bx, by - rise, r, 0, TAU);
      ctx.fill();
    } else {
      // Pop: an expanding bright ring that fades.
      const pop = (ph - 0.78) / 0.22;
      ctx.strokeStyle = `rgba(255,225,170,${(1 - pop) * 0.7})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, by - 1.6, r + pop * 3.2, 0, TAU);
      ctx.stroke();
    }
  });
  ctx.restore();

  // Handles
  ctx.strokeStyle = "#16161c";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(-21, 2, 3.4, -0.6, Math.PI + 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(21, 2, 3.4, -Math.PI - 0.6, 0.6);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.bezierCurveTo(-17, 10, -12, 18, -5, 20);
  ctx.stroke();
}

// dish_honey_pot — the best dish; the only fix is the seam. PINCH the drip
// strand off cleanly (it necks down before release rather than snapping), the
// pool RIPPLES when the droplet detaches, and the DIPPER lifts a touch as it
// "pulls" the strand (it participates instead of being frozen scenery).
function animHoneyPot(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 0, 22, 17, 4, 0, 0.22);

  const period = 3.4;
  const dph = loopPhase(t, period);
  // Phases: 0..0.55 stretch a hanging strand; 0.55..0.7 NECK + pinch off;
  // 0.7..1 droplet falls + pool ripple; then rest at the rim.
  const falling = dph >= 0.7;

  // Dipper lifts slightly while the strand stretches (it's "pulling" honey),
  // settling back as the strand pinches off.
  const pull = dph < 0.55 ? easeInOutSine(dph / 0.55) : 1 - easeInOutSine(clamp01((dph - 0.55) / 0.45));
  const dipperLift = -pull * 1.6;

  // Pot body
  const pot = ctx.createRadialGradient(-5, -2, 3, 0, 4, 22);
  pot.addColorStop(0, "#e8b878");
  pot.addColorStop(0.5, "#c08838");
  pot.addColorStop(1, "#7a4c14");
  ctx.fillStyle = pot;
  ctx.beginPath();
  ctx.moveTo(-13, -6);
  ctx.bezierCurveTo(-19, -2, -18, 16, -8, 20);
  ctx.bezierCurveTo(0, 23, 8, 23, 16, 18);
  ctx.bezierCurveTo(20, 10, 19, -2, 13, -6);
  ctx.bezierCurveTo(8, -9, -8, -9, -13, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a2c08";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rim / collar
  const rim = ctx.createLinearGradient(0, -12, 0, -4);
  rim.addColorStop(0, "#d8a858");
  rim.addColorStop(1, "#9a6824");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.ellipse(0, -8, 14, 4.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#4a2c08";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Honey surface inside rim — ripples outward when the droplet detaches.
  const honey = ctx.createRadialGradient(-3, -9, 1, 0, -8, 12);
  honey.addColorStop(0, "#ffd24a");
  honey.addColorStop(0.7, "#f0a818");
  honey.addColorStop(1, "#c87a0c");
  ctx.fillStyle = honey;
  ctx.beginPath();
  ctx.ellipse(0, -8, 11, 3.4, 0, 0, TAU);
  ctx.fill();

  // Pool ripple ring at the rim where the strand pulled from (on detach).
  if (falling) {
    const r = (dph - 0.7) / 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -8, 11, 3.4, 0, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = `rgba(255,240,170,${(1 - r) * 0.7})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(-9, -7.5, 1 + r * 6, 0.5 + r * 2.2, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Surface glint sweeps across the honey pool (feathered, clipped).
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -8, 11, 3.4, 0, 0, TAU);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.0), { span: 9, width: 4, angle: 0, intensity: 0.5, length: 10, warm: true });
  ctx.restore();

  // "HONEY" band label
  ctx.fillStyle = "#f6e8c0";
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.bezierCurveTo(-6, 5, 6, 5, 12, 2);
  ctx.lineTo(12, 10);
  ctx.bezierCurveTo(6, 13, -6, 13, -12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b89a5a";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(200,140,20,0.7)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-1, 4.5);
  ctx.lineTo(2, 6);
  ctx.lineTo(2, 9);
  ctx.lineTo(-1, 10.5);
  ctx.lineTo(-4, 9);
  ctx.lineTo(-4, 6);
  ctx.closePath();
  ctx.stroke();

  // Wooden dipper — lifts a touch as it pulls the strand (participates).
  ctx.save();
  ctx.translate(7, -10 + dipperLift);
  ctx.rotate(0.4 - pull * 0.05);
  ctx.strokeStyle = "#8a5a20";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(2, -16);
  ctx.stroke();
  ctx.fillStyle = "#a87436";
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a3a10";
  ctx.lineWidth = 0.8;
  [-3, -1, 1, 3].forEach((gy) => {
    ctx.beginPath();
    ctx.moveTo(-4, gy);
    ctx.lineTo(4, gy);
    ctx.stroke();
  });
  // A thin honey thread clings from the dipper head while it pulls.
  if (pull > 0.05) {
    ctx.strokeStyle = `rgba(245,184,28,${0.5 * pull})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(-1, 4 + pull * 4, 0.5, 4 + pull * 7);
    ctx.stroke();
  }
  ctx.restore();

  // Honey drip off the rim — stretches, then NECKS DOWN and pinches off cleanly
  // (no snap-back). The strand width tapers to zero at the pinch.
  const ax = -11; // anchor x at the rim
  const ay = -7; // anchor y at the rim
  const stretch = clamp01(dph / 0.55);
  const strandLen = 4 + stretch * 9;
  // Neck factor: 1 while stretching, shrinking to 0 across the pinch window so
  // the strand thins out and releases rather than snapping back full-width.
  let neck = 1;
  if (dph >= 0.55) {
    neck = 1 - clamp01((dph - 0.55) / 0.15);
  }
  if (neck > 0.02) {
    const halfW = 2 * neck;
    const tipNeck = 0.4 + 0.6 * neck; // tip pinches faster than the root
    ctx.fillStyle = "#f5b81c";
    ctx.beginPath();
    ctx.moveTo(ax - halfW, ay);
    ctx.bezierCurveTo(
      ax - halfW, ay + 5,
      ax - halfW * tipNeck, ay + strandLen,
      ax, ay + strandLen + 2 * tipNeck,
    );
    ctx.bezierCurveTo(
      ax + halfW * tipNeck, ay + strandLen,
      ax + halfW, ay + 5,
      ax + halfW, ay,
    );
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,235,150,${0.7 * neck})`;
    ctx.beginPath();
    ctx.ellipse(ax - 0.4, ay + strandLen * 0.5, 0.7 * neck, strandLen * 0.35, 0, 0, TAU);
    ctx.fill();
  }
  // Falling droplet during the back end of the cycle (after pinch-off).
  if (falling) {
    const fall = (dph - 0.7) / 0.3;
    const dy = ay + strandLen + 2 + easeOutCubic(fall) * 14;
    const da = 1 - fall;
    // Teardrop stretches as it falls.
    ctx.fillStyle = `rgba(245,184,28,${0.6 + 0.4 * da})`;
    ctx.beginPath();
    ctx.ellipse(ax, dy, 2.0, 2.8 + fall * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,235,150,${0.6 * da})`;
    ctx.beginPath();
    ctx.arc(ax - 0.7, dy - 0.8, 0.7, 0, TAU);
    ctx.fill();
  }

  // Pot highlight
  ctx.fillStyle = "rgba(255,250,220,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, 4, 2.6, 7, -0.3, 0, TAU);
  ctx.fill();
}

// dish_cake — the body was 100% static with an orphan candle-glow floating over
// the cherry. Add a fresh-baked JIGGLE (a springy squash about the plate) and
// DRAW a real candle (stick + warm flickering flame) so the glow has a source.
function animCake(ctx: CanvasRenderingContext2D, t: number): void {
  // Fresh-baked jiggle: a gentle springy wobble of the whole cake about the
  // plate, eased so it reads as set custard, not a vibration.
  const jig = Math.sin(t * 2.6) * easeInOutSine(0.5 + 0.5 * Math.sin(t * 0.9)) * 0.03;
  const squashY = 1 - Math.abs(jig) * 0.4;

  groundShadow(ctx, 0, 22, 20, 4.5, 0, 0.22);

  // Plate (outside the jiggle — it doesn't wobble).
  ctx.fillStyle = "#e6e6ec";
  ctx.beginPath();
  ctx.ellipse(0, 20, 20, 4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#a8a8b2";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // The cake wobbles about its base on the plate.
  ctx.save();
  ctx.translate(0, 16);
  ctx.rotate(jig);
  ctx.scale(1, squashY);
  ctx.translate(0, -16);

  // Front face
  const front = ctx.createLinearGradient(0, -8, 0, 18);
  front.addColorStop(0, "#fff4dc");
  front.addColorStop(1, "#f0d8a0");
  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.moveTo(-16, 16);
  ctx.lineTo(14, 16);
  ctx.lineTo(14, -2);
  ctx.lineTo(-16, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b8945a";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Cream / jam layers
  ctx.fillStyle = "#ff8aa0";
  ctx.fillRect(-16, 2, 30, 3);
  ctx.fillStyle = "#fff0d0";
  ctx.fillRect(-16, 9, 30, 3);
  ctx.strokeStyle = "rgba(180,140,90,0.4)";
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-16, 2, 30, 3);
  ctx.strokeRect(-16, 9, 30, 3);

  // sponge crumb dots
  ctx.fillStyle = "rgba(200,160,100,0.5)";
  for (let i = 0; i < 12; i++) {
    const cx = -14 + i * 2.6 + Math.sin(i * 2) * 1;
    const cy = i % 2 === 0 ? -0.5 : 7.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 0.7, 0, TAU);
    ctx.fill();
  }

  // Frosted top
  const ice = ctx.createLinearGradient(0, -10, 0, 0);
  ice.addColorStop(0, "#fff8f0");
  ice.addColorStop(1, "#f6d6e0");
  ctx.fillStyle = ice;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.bezierCurveTo(-14, -8, 12, -8, 14, -2);
  ctx.bezierCurveTo(6, -5, -8, -5, -16, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff8f0";
  [-9, -1, 7].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(dx - 3, -3);
    ctx.bezierCurveTo(dx - 3, 2, dx + 3, 2, dx + 3, -3);
    ctx.closePath();
    ctx.fill();
  });
  ctx.strokeStyle = "#e8b8c8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.bezierCurveTo(-14, -8, 12, -8, 14, -2);
  ctx.stroke();

  // Cherry on top
  const cherry = ctx.createRadialGradient(-2, -12, 1, 0, -10, 6);
  cherry.addColorStop(0, "#ff6a6a");
  cherry.addColorStop(0.6, "#d81a2a");
  cherry.addColorStop(1, "#7a0810");
  ctx.fillStyle = cherry;
  ctx.beginPath();
  ctx.arc(-1, -10, 5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a0410";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Glossy glint sweeping across the cherry (feathered, clipped).
  ctx.save();
  ctx.beginPath();
  ctx.arc(-1, -10, 5, 0, TAU);
  ctx.clip();
  glint(ctx, loopPhase(t, 2.6), { span: 5, width: 2.5, angle: 0, intensity: 0.6, length: 10 });
  ctx.restore();

  // Fixed glossy spot + a twinkle sparkle on the cherry.
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-3, -12, 1.4, 0, TAU);
  ctx.fill();
  sparkle(ctx, 2, -13, 2.0 * (0.5 + 0.5 * twinkle(t, 2.4, 0.2)), 0.85, "255,235,235");

  // cherry stem
  ctx.strokeStyle = "#5a8a26";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-1, -14);
  ctx.quadraticCurveTo(4, -20, 6, -22);
  ctx.stroke();
  ctx.restore(); // end jiggle

  // --- A real candle behind the cherry (gives the warm glow a source) -------
  // Drawn outside the jiggle transform so the flame stays upright + steady.
  const cdx = 7; // candle x
  const cdTop = -16; // top of the wax stick
  const cdBot = -6; // where it meets the cake top
  // Wax stick (striped).
  ctx.strokeStyle = "#f4d0e0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cdx, cdBot);
  ctx.lineTo(cdx, cdTop);
  ctx.stroke();
  ctx.strokeStyle = "#e07aa0";
  ctx.lineWidth = 3;
  [0.25, 0.6].forEach((f) => {
    const y = lerp(cdBot, cdTop, f);
    ctx.beginPath();
    ctx.moveTo(cdx - 1.5, y);
    ctx.lineTo(cdx + 1.5, y - 1.5);
    ctx.stroke();
  });
  // Wick.
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cdx, cdTop);
  ctx.lineTo(cdx, cdTop - 2);
  ctx.stroke();

  // Flame — a small teardrop that flickers in size + sways, with a warm glow.
  const flick = 0.5 + 0.5 * Math.sin(t * 9 + Math.sin(t * 17) * 0.7);
  const flSway = Math.sin(t * 6) * 0.6;
  const flBase = cdTop - 2;
  const flH = 4 + flick * 1.6;
  // Glow halo (the orphan glow now anchored to the flame).
  const fg = ctx.createRadialGradient(cdx, flBase - flH * 0.5, 0, cdx, flBase - flH * 0.5, 7);
  fg.addColorStop(0, `rgba(255,210,120,${0.18 + flick * 0.12})`);
  fg.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(cdx, flBase - flH * 0.5, 7, 0, TAU);
  ctx.fill();
  // Outer flame (orange).
  ctx.fillStyle = "#ff9a30";
  ctx.beginPath();
  ctx.moveTo(cdx, flBase);
  ctx.bezierCurveTo(cdx + 2.2, flBase - flH * 0.4, cdx + flSway + 1.4, flBase - flH * 0.8, cdx + flSway, flBase - flH);
  ctx.bezierCurveTo(cdx + flSway - 1.4, flBase - flH * 0.8, cdx - 2.2, flBase - flH * 0.4, cdx, flBase);
  ctx.closePath();
  ctx.fill();
  // Inner flame (bright yellow core).
  ctx.fillStyle = "#ffe680";
  ctx.beginPath();
  ctx.moveTo(cdx, flBase - 0.5);
  ctx.bezierCurveTo(
    cdx + 1.1, flBase - flH * 0.4,
    cdx + flSway * 0.6 + 0.6, flBase - flH * 0.65,
    cdx + flSway * 0.6, flBase - flH * 0.78,
  );
  ctx.bezierCurveTo(
    cdx + flSway * 0.6 - 0.6, flBase - flH * 0.65,
    cdx - 1.1, flBase - flH * 0.4,
    cdx, flBase - 0.5,
  );
  ctx.closePath();
  ctx.fill();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  gem_ruby: animRuby,
  gem_sapphire: animSapphire,
  gem_emerald: animEmerald,
  gem_amethyst: animAmethyst,
  gem_opal: animOpal,
  dish_soup: animSoup,
  dish_stew: animStew,
  dish_honey_pot: animHoneyPot,
  dish_cake: animCake,
};
