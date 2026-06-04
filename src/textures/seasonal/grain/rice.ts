// Seasonal art for the Rice farm tile (tile_grain_rice).
//
// Four full-art redraws of a rice paddy across its lifecycle, each with a
// subtle, seamless, deterministic animation. Drawn origin-centered in the
// ~-24..+24 design box; the caller handles translate/scale/clear. Animation
// `t` is elapsed seconds. The board sprite supplies its own sway rotation, so
// these anims avoid large rotations and instead use small internal bends,
// water shimmer, glints, and drifting flecks.

import type { SeasonalTileEntry } from "../types.js";

// ---------------------------------------------------------------------------
// Shared helpers (pure, no imports)
// ---------------------------------------------------------------------------

/** Blue flooded-paddy water base with a rim and a gentle ripple line. */
function drawWaterBase(ctx: CanvasRenderingContext2D, top: string, bottom: string, rim: string) {
  const grad = ctx.createLinearGradient(0, 18, 0, 26);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 22, 24, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 22, 24, 4.4, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** A single tall thin rice stalk: dark base stroke + bright overlay. */
function drawStalk(
  ctx: CanvasRenderingContext2D,
  x: number,
  topX: number,
  topY: number,
  dark: string,
  bright: string,
) {
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, 22);
  ctx.bezierCurveTo(x - 1, 4, (x + topX) / 2 - 2, -10, topX, topY);
  ctx.stroke();
  ctx.strokeStyle = bright;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, 22);
  ctx.bezierCurveTo(x - 1, 4, (x + topX) / 2 - 2, -10, topX, topY);
  ctx.stroke();
}

// ===========================================================================
// SPRING — flooded paddy with bright-green seedling shoots
// ===========================================================================

function drawRiceSpring(ctx: CanvasRenderingContext2D) {
  // Prominent water base
  drawWaterBase(ctx, "#6f9fc2", "#4a7a9e", "#356078");
  // Surface reflections (soft highlight bands)
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-14, 21);
  ctx.quadraticCurveTo(-7, 19.5, 0, 21);
  ctx.quadraticCurveTo(7, 22.5, 14, 21);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(-10, 24);
  ctx.quadraticCurveTo(0, 23, 10, 24);
  ctx.stroke();
  // Thin short bright-green seedling shoots poking up out of the water
  const shoots: Array<[number, number]> = [
    [-14, -2], [-9, -6], [-4, -3], [1, -7], [6, -2], [11, -5], [15, 0],
  ];
  shoots.forEach(([x, topY], i) => {
    const lean = ((i % 3) - 1) * 1.6;
    ctx.strokeStyle = "#2f6a1c";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.quadraticCurveTo(x + lean * 0.5, (topY + 18) / 2, x + lean, topY);
    ctx.stroke();
    ctx.strokeStyle = "#8fe04a";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.quadraticCurveTo(x + lean * 0.5, (topY + 18) / 2, x + lean, topY);
    ctx.stroke();
    // tiny bright leaf tip
    ctx.fillStyle = "#b6f070";
    ctx.beginPath();
    ctx.arc(x + lean, topY, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

function animRiceSpring(ctx: CanvasRenderingContext2D, t: number) {
  drawWaterBase(ctx, "#6f9fc2", "#4a7a9e", "#356078");
  // Shimmering ripple bands that drift sideways (seamless via sin)
  const phase = Math.sin(t * 1.6);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-14, 21 + phase * 0.4);
  ctx.quadraticCurveTo(-7, 19.5 - phase * 0.6, 0, 21 + phase * 0.4);
  ctx.quadraticCurveTo(7, 22.5 + phase * 0.6, 14, 21 - phase * 0.4);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(-10, 24 - phase * 0.3);
  ctx.quadraticCurveTo(0, 23 + phase * 0.5, 10, 24 - phase * 0.3);
  ctx.stroke();
  // Shoots sway gently — small internal bend driven by sin
  const shoots: Array<[number, number]> = [
    [-14, -2], [-9, -6], [-4, -3], [1, -7], [6, -2], [11, -5], [15, 0],
  ];
  shoots.forEach(([x, topY], i) => {
    const sway = Math.sin(t * 2.0 + i * 0.9) * 1.4;
    const lean = ((i % 3) - 1) * 1.6 + sway;
    ctx.strokeStyle = "#2f6a1c";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.quadraticCurveTo(x + lean * 0.5, (topY + 18) / 2, x + lean, topY);
    ctx.stroke();
    ctx.strokeStyle = "#8fe04a";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.quadraticCurveTo(x + lean * 0.5, (topY + 18) / 2, x + lean, topY);
    ctx.stroke();
    ctx.fillStyle = "#b6f070";
    ctx.beginPath();
    ctx.arc(x + lean, topY, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ===========================================================================
// SUMMER — lush tall green rice stalks standing in water
// ===========================================================================

const SUMMER_STALKS: Array<[number, number, number]> = [
  // [baseX, topX, topY]
  [-14, -16, -22], [-7, -9, -23], [0, -1, -24], [7, 8, -23], [14, 16, -22],
];

function drawRiceSummer(ctx: CanvasRenderingContext2D) {
  drawWaterBase(ctx, "#5f93b6", "#43748f", "#345d75");
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.quadraticCurveTo(-6, 20.5, 0, 22);
  ctx.quadraticCurveTo(6, 23.5, 12, 22);
  ctx.stroke();
  // Tall green stalks, no grain yet
  SUMMER_STALKS.forEach(([x, tx, ty]) => {
    drawStalk(ctx, x, tx, ty, "#2e5310", "#6fb834");
    // a thin blade leaf partway up
    ctx.strokeStyle = "#5aa028";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 1, 2);
    ctx.quadraticCurveTo(x + (tx - x) * 0.4 + 6, -4, tx - 2, ty + 8);
    ctx.stroke();
    // tiny green head bud at the tip
    ctx.fillStyle = "#9bd860";
    ctx.beginPath();
    ctx.ellipse(tx, ty, 1.3, 2.4, (tx - x) * 0.04, 0, Math.PI * 2);
    ctx.fill();
  });
}

function animRiceSummer(ctx: CanvasRenderingContext2D, t: number) {
  drawWaterBase(ctx, "#5f93b6", "#43748f", "#345d75");
  const phase = Math.sin(t * 1.5);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-12, 22 + phase * 0.4);
  ctx.quadraticCurveTo(-6, 20.5 - phase * 0.5, 0, 22 + phase * 0.4);
  ctx.quadraticCurveTo(6, 23.5 + phase * 0.5, 12, 22 - phase * 0.4);
  ctx.stroke();
  SUMMER_STALKS.forEach(([x, tx, ty], i) => {
    const sway = Math.sin(t * 1.8 + i * 0.7) * 1.6;
    const dtx = tx + sway;
    drawStalk(ctx, x, dtx, ty, "#2e5310", "#6fb834");
    ctx.strokeStyle = "#5aa028";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 1, 2);
    ctx.quadraticCurveTo(x + (dtx - x) * 0.4 + 6, -4, dtx - 2, ty + 8);
    ctx.stroke();
    ctx.fillStyle = "#9bd860";
    ctx.beginPath();
    ctx.ellipse(dtx, ty, 1.3, 2.4, (dtx - x) * 0.04, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ===========================================================================
// AUTUMN — ripe golden rice, heavy drooping grain heads (harvest)
// ===========================================================================

const AUTUMN_STALKS: Array<[number, number, number]> = [
  [-13, -15, -20], [-5, -8, -22], [4, 7, -22], [12, 15, -20],
];

/** Plump golden grain rendered at the given center (reuses drawRice look). */
function drawGoldenGrain(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  ga: number,
) {
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(ga);
  const gg = ctx.createLinearGradient(-1.4, 0, 1.4, 0);
  gg.addColorStop(0, "#fbf3cc");
  gg.addColorStop(1, "#d9bd5e");
  ctx.fillStyle = gg;
  ctx.strokeStyle = "#9c8020";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.8, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Grain head centers, drooping outward from each stalk tip. */
function autumnGrains(): Array<[number, number, number]> {
  return [
    // left-most head, drooping down-left
    [-16, -14, -0.9], [-14, -18, -0.7], [-12, -15, -0.5], [-13, -20, -0.6],
    // inner-left head
    [-9, -16, -0.5], [-7, -20, -0.35], [-6, -16, -0.2],
    // inner-right head
    [6, -16, 0.5], [4, -20, 0.35], [3, -16, 0.2],
    // right-most head, drooping down-right
    [16, -14, 0.9], [14, -18, 0.7], [12, -15, 0.5], [13, -20, 0.6],
  ];
}

function drawRiceAutumn(ctx: CanvasRenderingContext2D) {
  // Warm water base reflecting the harvest palette
  drawWaterBase(ctx, "#7c92a0", "#5c7888", "#4a6272");
  ctx.strokeStyle = "rgba(255,240,200,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.quadraticCurveTo(-6, 20.5, 0, 22);
  ctx.quadraticCurveTo(6, 23.5, 12, 22);
  ctx.stroke();
  // Tall stalks bending under the weight of the heads
  AUTUMN_STALKS.forEach(([x, tx, ty]) => {
    drawStalk(ctx, x, tx, ty, "#7a6418", "#c8a838");
  });
  autumnGrains().forEach(([gx, gy, ga]) => drawGoldenGrain(ctx, gx, gy, ga));
}

function animRiceAutumn(ctx: CanvasRenderingContext2D, t: number) {
  drawWaterBase(ctx, "#7c92a0", "#5c7888", "#4a6272");
  const phase = Math.sin(t * 1.3);
  ctx.strokeStyle = "rgba(255,240,200,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-12, 22 + phase * 0.4);
  ctx.quadraticCurveTo(-6, 20.5 - phase * 0.5, 0, 22 + phase * 0.4);
  ctx.quadraticCurveTo(6, 23.5 + phase * 0.5, 12, 22 - phase * 0.4);
  ctx.stroke();
  // Heads bob/sway slowly — small horizontal nod of the stalk tips
  AUTUMN_STALKS.forEach(([x, tx, ty], i) => {
    const sway = Math.sin(t * 1.1 + i * 0.8) * 1.5;
    drawStalk(ctx, x, tx + sway, ty, "#7a6418", "#c8a838");
  });
  // Grains bob in sympathy with the stalk nod
  const grains = autumnGrains();
  grains.forEach(([gx, gy, ga], i) => {
    const bob = Math.sin(t * 1.1 + i * 0.55) * 0.9;
    drawGoldenGrain(ctx, gx + bob * 0.6, gy + bob, ga);
  });
  // Warm glint travelling across the grains (seamless sweep, wraps via modulo)
  const sweep = (t * 9) % 44 - 22; // -22..+22
  grains.forEach(([gx, gy]) => {
    const d = Math.abs(gx - sweep);
    if (d < 5) {
      const a = (1 - d / 5) * 0.85;
      ctx.fillStyle = `rgba(255,250,205,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(gx, gy - 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ===========================================================================
// WINTER — drained/dormant paddy, frozen sheen, cut stubble, snow
// ===========================================================================

const WINTER_STUBBLE: Array<[number, number]> = [
  [-15, 6], [-10, 4], [-5, 7], [0, 3], [5, 6], [10, 4], [15, 7],
];

/** Pale frozen base with an icy sheen instead of blue water. */
function drawIceBase(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 18, 0, 26);
  grad.addColorStop(0, "#c4ccd0");
  grad.addColorStop(1, "#9aa6ac");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 22, 24, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7e8a90";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 22, 24, 4.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // frozen cracks
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.lineTo(-4, 20.5);
  ctx.lineTo(3, 23);
  ctx.lineTo(13, 21);
  ctx.stroke();
}

function drawStubble(ctx: CanvasRenderingContext2D, x: number, topY: number) {
  ctx.strokeStyle = "#9c8a64";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, 21);
  ctx.lineTo(x, topY);
  ctx.stroke();
  ctx.strokeStyle = "#c8b890";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(x, 21);
  ctx.lineTo(x, topY);
  ctx.stroke();
  // tiny snow cap on the cut tip
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(x, topY, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawRiceWinter(ctx: CanvasRenderingContext2D) {
  drawIceBase(ctx);
  WINTER_STUBBLE.forEach(([x, topY]) => drawStubble(ctx, x, topY));
  // a few resting snow flecks
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  [[-8, 12, 1.1], [4, 9, 0.9], [11, 14, 1.0]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
}

function animRiceWinter(ctx: CanvasRenderingContext2D, t: number) {
  drawIceBase(ctx);
  // Cold ice sheen pulses faintly across the frozen base
  const pulse = (Math.sin(t * 1.0) + 1) / 2; // 0..1
  const sheen = ctx.createLinearGradient(-24, 22, 24, 22);
  const peak = (0.12 + pulse * 0.28).toFixed(3);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, `rgba(235,245,250,${peak})`);
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 22, 24, 4.4, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sheen;
  ctx.fillRect(-24, 17, 48, 10);
  ctx.restore();
  WINTER_STUBBLE.forEach(([x, topY]) => drawStubble(ctx, x, topY));
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  [[-8, 12, 1.1], [4, 9, 0.9], [11, 14, 1.0]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
  // A single snowflake drifting down, seamless: wraps over a 6s loop
  const loop = 6;
  const p = (t % loop) / loop; // 0..1
  const fy = -22 + p * 46; // top to bottom of box
  const fx = Math.sin(t * 1.4) * 6 - 2; // gentle horizontal drift
  const fade = Math.sin(p * Math.PI); // fade in/out at the ends for seamlessness
  ctx.fillStyle = `rgba(255,255,255,${(0.9 * fade).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(fx, fy, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // tiny sparkle cross on the flake
  ctx.strokeStyle = `rgba(255,255,255,${(0.6 * fade).toFixed(3)})`;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(fx - 2.2, fy);
  ctx.lineTo(fx + 2.2, fy);
  ctx.moveTo(fx, fy - 2.2);
  ctx.lineTo(fx, fy + 2.2);
  ctx.stroke();
}

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawRiceSpring, anim: animRiceSpring },
  Summer: { draw: drawRiceSummer, anim: animRiceSummer },
  Autumn: { draw: drawRiceAutumn, anim: animRiceAutumn },
  Winter: { draw: drawRiceWinter, anim: animRiceWinter },
};
