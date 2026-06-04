// Seasonal art for the Manna farm tile (tile_grain_manna).
//
// Manna is a magical / celestial grain, so its seasons are NOT a lifecycle.
// The same soft white pillowy cluster silhouette (a unified mound of rounded
// bumps, derived from `drawManna` in ../../categories/grain.ts) is re-tinted
// per season via a PALETTE + GLOW + ACCENT shift:
//   Spring — pale gold, green-tinged glow, tiny sprout accents
//   Summer — brightest warm radiant gold, drifting sheen
//   Autumn — amber/honey, richer orange glow, rising spore motes
//   Winter — cool pale-blue/silver, frosty glow, snowflake glints
//
// Drawing contract: each draw/anim is origin-centered (0,0) in a ~-24..+24
// box; the caller handles translate/scale/clear. `t` is elapsed SECONDS.
// Animations stay subtle (no large rotations — the board sprite supplies its
// own sway) and loop seamlessly. Deterministic: only sin/cos/modulo of t and
// indices, never Math.random.

import type { SeasonalTileEntry } from "../types.js";

// Shared silhouette: the cluster of rounded bumps the whole family reuses.
const BUMPS: ReadonlyArray<{ x: number; y: number; r: number }> = [
  { x: -10, y: 6, r: 10 },
  { x: 10, y: 7, r: 9.5 },
  { x: -2, y: -9, r: 11 },
  { x: 7, y: -3, r: 8 },
  { x: -7, y: -2, r: 7 },
];

interface MannaPalette {
  /** Inner -> mid -> rim fill stops for each pillowy bump. */
  fillInner: string;
  fillMid: string;
  fillRim: string;
  /** Soft contour + interior dimple strokes. */
  contour: string;
  dimple: string;
  /** Glow halo color (alpha applied at draw time). */
  glowR: number;
  glowG: number;
  glowB: number;
  /** Sparkle / specular tint. */
  sparkle: string;
  specular: string;
}

// Draws the shadow under the cluster.
function shadow(ctx: CanvasRenderingContext2D, rgba: string) {
  ctx.fillStyle = rgba;
  ctx.beginPath();
  ctx.ellipse(1, 22, 17, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Draws the radial glow halo. `alpha` scales the inner opacity; `radius`
// lets the anim breathe the halo.
function glowHalo(
  ctx: CanvasRenderingContext2D,
  pal: MannaPalette,
  alpha: number,
  radius: number,
) {
  const g = ctx.createRadialGradient(0, -2, 4, 0, -2, radius);
  g.addColorStop(0, `rgba(${pal.glowR},${pal.glowG},${pal.glowB},${alpha})`);
  g.addColorStop(1, `rgba(${pal.glowR},${pal.glowG},${pal.glowB},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -2, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Draws the unified pillowy mound (bumps + contour + dimples) in the palette.
function mound(ctx: CanvasRenderingContext2D, pal: MannaPalette) {
  BUMPS.forEach((b) => {
    const grad = ctx.createRadialGradient(
      b.x - b.r * 0.45,
      b.y - b.r * 0.5,
      1,
      b.x,
      b.y,
      b.r,
    );
    grad.addColorStop(0, pal.fillInner);
    grad.addColorStop(0.55, pal.fillMid);
    grad.addColorStop(1, pal.fillRim);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Outer contour tracing only the outer arc of each rim bump.
  ctx.strokeStyle = pal.contour;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(BUMPS[2].x, BUMPS[2].y, BUMPS[2].r - 0.3, Math.PI * 1.05, Math.PI * 2.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(BUMPS[0].x, BUMPS[0].y, BUMPS[0].r - 0.3, Math.PI * 0.35, Math.PI * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(BUMPS[1].x, BUMPS[1].y, BUMPS[1].r - 0.3, Math.PI * -0.45, Math.PI * 0.65);
  ctx.stroke();
  // Interior dimples where bumps meet.
  ctx.strokeStyle = pal.dimple;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 2, 5, -0.7, 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(2, -6, 4.5, 2.2, 3.6);
  ctx.stroke();
  // Soft specular highlight upper-left.
  ctx.fillStyle = pal.specular;
  ctx.beginPath();
  ctx.ellipse(-5, -11, 4, 2.4, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

// Static sparkle accents in the palette tint (used by the draw() pass).
function staticSparkles(ctx: CanvasRenderingContext2D, pal: MannaPalette) {
  ctx.fillStyle = pal.sparkle;
  [
    [-9, -10, 1.7],
    [4, -1, 1.3],
  ].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Twinkling round sparkles for the anim pass. `tint` is "r,g,b". Each sparkle
// pulses on its own phase so the cluster shimmers; loops seamlessly in t.
function twinkle(
  ctx: CanvasRenderingContext2D,
  tint: string,
  t: number,
  speed: number,
  points: ReadonlyArray<readonly [number, number, number, number]>,
) {
  points.forEach(([sx, sy, sr, phase]) => {
    const a = 0.55 + 0.45 * Math.sin(t * speed + phase * Math.PI * 2);
    ctx.fillStyle = `rgba(${tint},${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
}

// A 4-point star glint (snowflake-like), origin at (x,y), arm length `len`.
function starGlint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  tint: string,
  alpha: number,
) {
  ctx.strokeStyle = `rgba(${tint},${alpha.toFixed(3)})`;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x - len, y);
  ctx.lineTo(x + len, y);
  ctx.moveTo(x, y - len);
  ctx.lineTo(x, y + len);
  ctx.moveTo(x - len * 0.6, y - len * 0.6);
  ctx.lineTo(x + len * 0.6, y + len * 0.6);
  ctx.moveTo(x - len * 0.6, y + len * 0.6);
  ctx.lineTo(x + len * 0.6, y - len * 0.6);
  ctx.stroke();
}

// ----------------------------------------------------------------------------
// Palettes
// ----------------------------------------------------------------------------

const SPRING_PAL: MannaPalette = {
  fillInner: "#ffffff",
  fillMid: "#f5f0d6",
  fillRim: "#cdd6a0",
  contour: "#9bab66",
  dimple: "rgba(140,160,90,0.42)",
  glowR: 210,
  glowG: 240,
  glowB: 170,
  sparkle: "rgba(245,255,224,0.95)",
  specular: "rgba(255,255,255,0.5)",
};

const SUMMER_PAL: MannaPalette = {
  fillInner: "#ffffff",
  fillMid: "#fbeec4",
  fillRim: "#e6c474",
  contour: "#bd9636",
  dimple: "rgba(180,140,60,0.45)",
  glowR: 255,
  glowG: 232,
  glowB: 150,
  sparkle: "rgba(255,251,220,0.98)",
  specular: "rgba(255,255,255,0.6)",
};

const AUTUMN_PAL: MannaPalette = {
  fillInner: "#fff4e0",
  fillMid: "#f3d39a",
  fillRim: "#bd863a",
  contour: "#8c5a1e",
  dimple: "rgba(140,90,30,0.48)",
  glowR: 240,
  glowG: 168,
  glowB: 86,
  sparkle: "rgba(255,228,176,0.95)",
  specular: "rgba(255,244,220,0.55)",
};

const WINTER_PAL: MannaPalette = {
  fillInner: "#ffffff",
  fillMid: "#e6eef6",
  fillRim: "#aec2d6",
  contour: "#7e96ae",
  dimple: "rgba(120,150,180,0.45)",
  glowR: 190,
  glowG: 220,
  glowB: 245,
  sparkle: "rgba(232,244,255,0.95)",
  specular: "rgba(255,255,255,0.6)",
};

// ----------------------------------------------------------------------------
// Spring — pale gold, green-tinged glow, tiny sprout accents.
// ----------------------------------------------------------------------------

// Two tiny green leaf/sprout accents poking from the mound.
function springSprouts(ctx: CanvasRenderingContext2D, sway: number) {
  ctx.strokeStyle = "#5a8a2c";
  ctx.lineWidth = 1.4;
  ctx.fillStyle = "#7cb43c";
  const sprouts: ReadonlyArray<readonly [number, number, number]> = [
    [-6, -14, -1],
    [6, -12, 1],
  ];
  sprouts.forEach(([bx, by, dir]) => {
    const tipX = bx + dir * (3 + sway * dir);
    const tipY = by - 7;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + dir * 1.5, by - 4, tipX, tipY);
    ctx.stroke();
    // little leaf blade at the tip
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, 2.4, 1.3, dir * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawMannaSpring(ctx: CanvasRenderingContext2D) {
  glowHalo(ctx, SPRING_PAL, 0.45, 24);
  shadow(ctx, "rgba(90,110,40,0.2)");
  mound(ctx, SPRING_PAL);
  springSprouts(ctx, 0);
  staticSparkles(ctx, SPRING_PAL);
}

function animMannaSpring(ctx: CanvasRenderingContext2D, t: number) {
  // Glow breathes gently around a fresh mid level.
  const breath = 0.42 + 0.1 * Math.sin(t * 1.4);
  glowHalo(ctx, SPRING_PAL, breath, 23 + Math.sin(t * 1.4) * 1.2);
  shadow(ctx, "rgba(90,110,40,0.2)");
  mound(ctx, SPRING_PAL);
  springSprouts(ctx, 0.6 * Math.sin(t * 1.1));
  twinkle(ctx, "245,255,224", t, 2.0, [
    [-9, -10, 1.7, 0],
    [4, -1, 1.3, 0.4],
    [-2, -14, 1.1, 0.75],
  ]);
}

// ----------------------------------------------------------------------------
// Summer — brightest warm radiant gold, twinkle + drifting sheen.
// ----------------------------------------------------------------------------

// A soft diagonal sheen band that drifts across the mound and loops.
function summerSheen(ctx: CanvasRenderingContext2D, t: number) {
  // x travels across the box and wraps seamlessly.
  const span = 56;
  const cx = -28 + ((t * 10) % span);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 2, 18, 0, Math.PI * 2);
  ctx.clip();
  const sheen = ctx.createLinearGradient(cx - 10, -20, cx + 10, 20);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.32)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(-24, -24, 48, 48);
  ctx.restore();
}

function drawMannaSummer(ctx: CanvasRenderingContext2D) {
  glowHalo(ctx, SUMMER_PAL, 0.65, 24);
  shadow(ctx, "rgba(140,100,30,0.22)");
  mound(ctx, SUMMER_PAL);
  staticSparkles(ctx, SUMMER_PAL);
}

function animMannaSummer(ctx: CanvasRenderingContext2D, t: number) {
  // Glow breathes brighter, at full strength.
  const breath = 0.68 + 0.18 * Math.sin(t * 1.8);
  glowHalo(ctx, SUMMER_PAL, breath, 24 + Math.sin(t * 1.8) * 1.6);
  shadow(ctx, "rgba(140,100,30,0.22)");
  mound(ctx, SUMMER_PAL);
  summerSheen(ctx, t);
  twinkle(ctx, "255,251,220", t, 2.6, [
    [-9, -10, 1.9, 0],
    [4, -1, 1.5, 0.33],
    [8, -8, 1.3, 0.66],
  ]);
}

// ----------------------------------------------------------------------------
// Autumn — amber/honey, richer orange glow, rising spore motes.
// ----------------------------------------------------------------------------

// Amber motes that rise and fade, seamlessly looping.
function autumnMotes(ctx: CanvasRenderingContext2D, t: number) {
  const count = 5;
  for (let i = 0; i < count; i++) {
    // Each mote on its own phase across a unit lifecycle [0,1).
    const phase = (t * 0.28 + i / count) % 1;
    const baseX = -10 + i * 5;
    const driftX = baseX + Math.sin((phase + i) * Math.PI * 2) * 3;
    const y = 6 - phase * 22; // rise from mound up past the top
    // Fade in then out across the lifecycle.
    const alpha = Math.sin(phase * Math.PI) * 0.7;
    ctx.fillStyle = `rgba(244,196,110,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(driftX, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMannaAutumn(ctx: CanvasRenderingContext2D) {
  glowHalo(ctx, AUTUMN_PAL, 0.55, 24);
  shadow(ctx, "rgba(120,80,20,0.24)");
  mound(ctx, AUTUMN_PAL);
  staticSparkles(ctx, AUTUMN_PAL);
}

function animMannaAutumn(ctx: CanvasRenderingContext2D, t: number) {
  const breath = 0.52 + 0.14 * Math.sin(t * 1.5);
  glowHalo(ctx, AUTUMN_PAL, breath, 23 + Math.sin(t * 1.5) * 1.4);
  shadow(ctx, "rgba(120,80,20,0.24)");
  mound(ctx, AUTUMN_PAL);
  autumnMotes(ctx, t);
  twinkle(ctx, "255,228,176", t, 1.9, [
    [-9, -10, 1.6, 0],
    [4, -1, 1.3, 0.5],
  ]);
}

// ----------------------------------------------------------------------------
// Winter — cool pale-blue/silver, frosty glow, snowflake glints + falling speck.
// ----------------------------------------------------------------------------

// A single snow speck drifting down, looping seamlessly.
function winterSnow(ctx: CanvasRenderingContext2D, t: number) {
  const span = 1; // unit lifecycle
  const phase = (t * 0.3) % span;
  const x = 3 + Math.sin(t * 1.2) * 6;
  const y = -20 + phase * 42; // fall from top past the mound
  const alpha = Math.sin(phase * Math.PI) * 0.85;
  ctx.fillStyle = `rgba(235,245,255,${alpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x, y, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawMannaWinter(ctx: CanvasRenderingContext2D) {
  glowHalo(ctx, WINTER_PAL, 0.48, 24);
  shadow(ctx, "rgba(80,100,130,0.22)");
  mound(ctx, WINTER_PAL);
  // Static frost glints instead of warm sparkles.
  starGlint(ctx, -9, -10, 2.6, "232,244,255", 0.9);
  starGlint(ctx, 5, -1, 2.0, "232,244,255", 0.8);
}

function animMannaWinter(ctx: CanvasRenderingContext2D, t: number) {
  // Cold glow pulses (a touch sharper than the breathing of warm seasons).
  const pulse = 0.46 + 0.16 * Math.sin(t * 2.0);
  glowHalo(ctx, WINTER_PAL, pulse, 23 + Math.sin(t * 2.0) * 1.0);
  shadow(ctx, "rgba(80,100,130,0.22)");
  mound(ctx, WINTER_PAL);
  winterSnow(ctx, t);
  // Snowflake-like glints twinkle on their own phases.
  const a1 = 0.55 + 0.45 * Math.sin(t * 2.4);
  const a2 = 0.55 + 0.45 * Math.sin(t * 2.4 + Math.PI * 0.8);
  const a3 = 0.55 + 0.45 * Math.sin(t * 2.4 + Math.PI * 1.5);
  starGlint(ctx, -9, -10, 2.6, "232,244,255", a1);
  starGlint(ctx, 5, -1, 2.0, "232,244,255", a2);
  starGlint(ctx, -2, -13, 1.7, "232,244,255", a3);
}

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawMannaSpring, anim: animMannaSpring },
  Summer: { draw: drawMannaSummer, anim: animMannaSummer },
  Autumn: { draw: drawMannaAutumn, anim: animMannaAutumn },
  Winter: { draw: drawMannaWinter, anim: animMannaWinter },
};
