// Seasonal art for the CORN farm tile.
//
// Four full-art lifecycle redraws (Spring shoots → Summer green stalk →
// Autumn ripe cob → Winter dead stalk under snow), each with a subtle,
// seamless, deterministic animation. Drawn origin-centered in the ~-24..+24
// design box; the caller handles translate/scale/clear and adds its own sway
// rotation, so internal animations stay small (bends/glints/shimmer/flecks).

import type { SeasonalTileEntry } from "../types.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function groundShadow(ctx: CanvasRenderingContext2D, w: number, alpha: number): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 22, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function soilMound(ctx: CanvasRenderingContext2D): void {
  // Small dark earth mound the plant rises from.
  const g = ctx.createLinearGradient(0, 16, 0, 24);
  g.addColorStop(0, "#6b4a22");
  g.addColorStop(1, "#3e2a12");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.quadraticCurveTo(0, 12, 12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1c0c";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

// ===========================================================================
// SPRING — small green corn shoots emerging from the soil.
// ===========================================================================

// Blade base positions and lean directions.
const SPRING_BLADES: Array<[number, number, number, number]> = [
  // [baseX, baseY, leanX, height]
  [-7, 19, -7, 22],
  [-2, 20, -2, 28],
  [3, 19, 5, 24],
  [8, 20, 9, 18],
];

function drawCornSpring(ctx: CanvasRenderingContext2D): void {
  groundShadow(ctx, 13, 0.2);
  soilMound(ctx);
  // Short green leaf blades sprouting from the mound.
  SPRING_BLADES.forEach(([bx, by, lean, h], i) => {
    const tipX = bx + lean;
    const tipY = by - h;
    const midX = bx + lean * 0.5 + (i % 2 === 0 ? -2 : 2);
    const midY = by - h * 0.55;
    const grad = ctx.createLinearGradient(bx, by, tipX, tipY);
    grad.addColorStop(0, "#3a6a18");
    grad.addColorStop(1, "#8ed44a");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#2e4d10";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bx - 1.6, by);
    ctx.quadraticCurveTo(midX - 1.6, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + 1.6, midY, bx + 1.6, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Midrib highlight.
    ctx.strokeStyle = "rgba(220,245,180,0.6)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(bx, by - 1);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  });
  // A couple of tiny seed sprout dots near the soil.
  ctx.fillStyle = "rgba(120,90,40,0.7)";
  [[-4, 18], [5, 18.5]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 1, 0, Math.PI * 2);
    ctx.fill();
  });
}

function animCornSpring(ctx: CanvasRenderingContext2D, t: number): void {
  drawCornSpring(ctx);
  // Gentle sway of the blade tips (small internal bend, not whole-sprite).
  const sway = Math.sin(t * 1.6) * 1.6;
  ctx.strokeStyle = "rgba(150,220,110,0.5)";
  ctx.lineWidth = 1.2;
  SPRING_BLADES.forEach(([bx, by, lean, h], i) => {
    const phase = i * 0.7;
    const dx = Math.sin(t * 1.6 + phase) * 1.6 + sway * 0.3;
    const tipX = bx + lean + dx;
    const tipY = by - h - 1;
    ctx.beginPath();
    ctx.moveTo(bx + lean * 0.6, by - h * 0.55);
    ctx.quadraticCurveTo(bx + lean * 0.8 + dx * 0.5, by - h * 0.8, tipX, tipY);
    ctx.stroke();
  });
  // Dewy glint that fades in and out at a blade tip (seamless via sin).
  const glint = (Math.sin(t * 2.2) + 1) * 0.5; // 0..1
  ctx.fillStyle = `rgba(255,255,255,${0.15 + glint * 0.55})`;
  const gx = -2 + Math.sin(t * 1.6 + 0.7) * 1.6;
  ctx.beginPath();
  ctx.arc(gx, -7, 1.2 + glint * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

// ===========================================================================
// SUMMER — tall leafy green corn stalk with arching leaves and a tassel.
// ===========================================================================

// Broad arching leaves: [attachY, side(-1 left / +1 right), spread, droop].
const SUMMER_LEAVES: Array<[number, number, number, number]> = [
  [10, -1, 20, 4],
  [2, 1, 22, 2],
  [-4, -1, 19, -2],
  [-11, 1, 16, -6],
];

function drawCornSummer(ctx: CanvasRenderingContext2D): void {
  groundShadow(ctx, 12, 0.22);
  // Central stalk (dark base + bright core).
  ctx.strokeStyle = "#2e4d10";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(1, 0, -1, -20);
  ctx.stroke();
  ctx.strokeStyle = "#6fae34";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(1, 0, -1, -20);
  ctx.stroke();
  // Broad arching leaves.
  SUMMER_LEAVES.forEach(([ay, side, spread, droop]) => {
    const tipX = side * spread;
    const tipY = ay + droop;
    const grad = ctx.createLinearGradient(0, ay, tipX, tipY);
    grad.addColorStop(0, "#3a6a18");
    grad.addColorStop(1, "#7cc63c");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#2e4d10";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, ay);
    // Upper edge bows up, lower edge dips, meeting at the tip.
    ctx.quadraticCurveTo(side * spread * 0.5, ay - 7, tipX, tipY);
    ctx.quadraticCurveTo(side * spread * 0.5, ay + 2, 0, ay + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Midrib.
    ctx.strokeStyle = "rgba(220,245,180,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, ay + 1);
    ctx.quadraticCurveTo(side * spread * 0.5, ay - 3, tipX, tipY);
    ctx.stroke();
  });
  // Tassel forming at the top — pale green fronds.
  ctx.strokeStyle = "#bcd870";
  ctx.lineWidth = 1.1;
  [-3, -1, 1, 3].forEach((fx, i) => {
    ctx.beginPath();
    ctx.moveTo(-1, -19);
    ctx.quadraticCurveTo(fx, -24, fx * 1.6, -29 - (i % 2));
    ctx.stroke();
  });
}

function animCornSummer(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 12, 0.22);
  // Stalk.
  ctx.strokeStyle = "#2e4d10";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(1, 0, -1, -20);
  ctx.stroke();
  ctx.strokeStyle = "#6fae34";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(1, 0, -1, -20);
  ctx.stroke();
  // Leaves flutter: small per-leaf tip displacement.
  SUMMER_LEAVES.forEach(([ay, side, spread, droop], i) => {
    const flutter = Math.sin(t * 2.0 + i * 0.9) * 1.8;
    const tipX = side * spread + side * flutter;
    const tipY = ay + droop + Math.cos(t * 2.0 + i * 0.9) * 1.0;
    const grad = ctx.createLinearGradient(0, ay, tipX, tipY);
    grad.addColorStop(0, "#3a6a18");
    grad.addColorStop(1, "#7cc63c");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#2e4d10";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, ay);
    ctx.quadraticCurveTo(side * spread * 0.5, ay - 7 + flutter * 0.4, tipX, tipY);
    ctx.quadraticCurveTo(side * spread * 0.5, ay + 2, 0, ay + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(220,245,180,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, ay + 1);
    ctx.quadraticCurveTo(side * spread * 0.5, ay - 3, tipX, tipY);
    ctx.stroke();
  });
  // Tassel sways gently.
  const tsway = Math.sin(t * 1.8) * 1.4;
  ctx.strokeStyle = "#bcd870";
  ctx.lineWidth = 1.1;
  [-3, -1, 1, 3].forEach((fx, i) => {
    ctx.beginPath();
    ctx.moveTo(-1, -19);
    ctx.quadraticCurveTo(fx + tsway * 0.5, -24, fx * 1.6 + tsway, -29 - (i % 2));
    ctx.stroke();
  });
}

// ===========================================================================
// AUTUMN — ripe golden cob, husk peeled back to reveal kernels. Reuses the
// base drawCorn look with the husk leaves opened down/outward.
// ===========================================================================

function cornCobBody(ctx: CanvasRenderingContext2D): void {
  // Cob body — yellow with kernel grid (base drawCorn palette).
  const cob = ctx.createLinearGradient(0, -22, 0, 18);
  cob.addColorStop(0, "#fff19a");
  cob.addColorStop(0.5, "#f4c84a");
  cob.addColorStop(1, "#a06c10");
  ctx.fillStyle = cob;
  ctx.beginPath();
  ctx.moveTo(-7, 18);
  ctx.bezierCurveTo(-9, -8, -6, -22, 0, -22);
  ctx.bezierCurveTo(6, -22, 9, -8, 7, 18);
  ctx.bezierCurveTo(4, 22, -4, 22, -7, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5e3a08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Kernels (clipped grid).
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-7, 18);
  ctx.bezierCurveTo(-9, -8, -6, -22, 0, -22);
  ctx.bezierCurveTo(6, -22, 9, -8, 7, 18);
  ctx.bezierCurveTo(4, 22, -4, 22, -7, 18);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(110,68,12,0.65)";
  ctx.lineWidth = 0.8;
  for (let y = -20; y < 20; y += 4) {
    const offset = (Math.floor((y + 20) / 4) % 2) * 2;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(10, y);
    ctx.stroke();
    for (let x = -8 + offset; x < 9; x += 4) {
      ctx.beginPath();
      ctx.arc(x, y + 2, 1.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Peeled-back husk leaves splayed down/outward: [tipX, tipY, ctrlX, ctrlY].
const AUTUMN_HUSKS: Array<[number, number, number, number]> = [
  [-18, 24, -16, 4],
  [18, 24, 16, 4],
  [-12, 26, -10, 10],
  [12, 26, 10, 10],
];

function drawHusks(ctx: CanvasRenderingContext2D, flutter: number): void {
  ctx.fillStyle = "#cdb86a";
  ctx.strokeStyle = "#8a6a26";
  ctx.lineWidth = 1.4;
  AUTUMN_HUSKS.forEach(([tx, ty, cx, cy], i) => {
    const f = flutter * (i % 2 === 0 ? 1 : -1);
    ctx.beginPath();
    ctx.moveTo(tx < 0 ? -4 : 4, -6);
    ctx.quadraticCurveTo(cx + f, cy, tx + f, ty);
    ctx.quadraticCurveTo(cx * 0.6 + f, cy + 2, tx < 0 ? -1 : 1, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Vein highlight.
    ctx.strokeStyle = "rgba(255,240,190,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(tx < 0 ? -3 : 3, -5);
    ctx.quadraticCurveTo(cx + f, cy, tx + f, ty);
    ctx.stroke();
    ctx.strokeStyle = "#8a6a26";
    ctx.lineWidth = 1.4;
  });
}

function drawCornAutumn(ctx: CanvasRenderingContext2D): void {
  groundShadow(ctx, 18, 0.22);
  drawHusks(ctx, 0);
  cornCobBody(ctx);
  // Specular.
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-3, -10, 1.6, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function animCornAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 18, 0.22);
  drawHusks(ctx, Math.sin(t * 1.7) * 1.3);
  cornCobBody(ctx);
  // Warm glint sweeping vertically across the kernels (seamless loop).
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-7, 18);
  ctx.bezierCurveTo(-9, -8, -6, -22, 0, -22);
  ctx.bezierCurveTo(6, -22, 9, -8, 7, 18);
  ctx.bezierCurveTo(4, 22, -4, 22, -7, 18);
  ctx.closePath();
  ctx.clip();
  const cycle = (t % 2.4) / 2.4; // 0..1
  const sweepY = -24 + cycle * 48; // travels top→bottom
  const g = ctx.createLinearGradient(0, sweepY - 8, 0, sweepY + 8);
  g.addColorStop(0, "rgba(255,250,210,0)");
  g.addColorStop(0.5, "rgba(255,250,210,0.55)");
  g.addColorStop(1, "rgba(255,250,210,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-10, sweepY - 8, 20, 16);
  ctx.restore();
  // Specular.
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-3, -10, 1.6, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

// ===========================================================================
// WINTER — dry brown/tan dead stalk, drooping browned leaves, snow dusting.
// ===========================================================================

// Drooping dead leaves: [attachY, side, spread, droop].
const WINTER_LEAVES: Array<[number, number, number, number]> = [
  [6, -1, 17, 12],
  [-2, 1, 18, 10],
  [-9, -1, 14, 4],
];

function drawCornWinter(ctx: CanvasRenderingContext2D): void {
  groundShadow(ctx, 12, 0.18);
  // Snow on the ground mound.
  ctx.fillStyle = "rgba(235,242,250,0.9)";
  ctx.beginPath();
  ctx.ellipse(0, 21, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dead stalk (brown, slightly bent).
  ctx.strokeStyle = "#5a4426";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 21);
  ctx.quadraticCurveTo(3, 0, 1, -18);
  ctx.stroke();
  ctx.strokeStyle = "#8a7048";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 21);
  ctx.quadraticCurveTo(3, 0, 1, -18);
  ctx.stroke();
  // Drooping browned leaves.
  WINTER_LEAVES.forEach(([ay, side, spread, droop]) => {
    const tipX = side * spread;
    const tipY = ay + droop;
    const grad = ctx.createLinearGradient(0, ay, tipX, tipY);
    grad.addColorStop(0, "#6b5230");
    grad.addColorStop(1, "#a8895a");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#4a3818";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, ay);
    ctx.quadraticCurveTo(side * spread * 0.5, ay - 3, tipX, tipY);
    ctx.quadraticCurveTo(side * spread * 0.4, ay + 4, 0, ay + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Snow lying on the upper edge.
    ctx.strokeStyle = "rgba(235,242,250,0.8)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, ay - 0.5);
    ctx.quadraticCurveTo(side * spread * 0.5, ay - 4, tipX, tipY - 0.5);
    ctx.stroke();
  });
  // Withered tassel remnant.
  ctx.strokeStyle = "#7a6038";
  ctx.lineWidth = 1.0;
  [-2, 0, 2].forEach((fx) => {
    ctx.beginPath();
    ctx.moveTo(1, -17);
    ctx.quadraticCurveTo(fx + 1, -22, fx * 1.5 + 1, -25);
    ctx.stroke();
  });
  // Snow cap on the stalk tip.
  ctx.fillStyle = "rgba(235,242,250,0.92)";
  ctx.beginPath();
  ctx.ellipse(1, -18, 2.6, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Snowflake column anchors (x, base size). Each drifts down on its own phase.
const WINTER_FLAKES: Array<[number, number, number]> = [
  [-12, 1.4, 0.0],
  [-4, 1.1, 1.3],
  [5, 1.6, 0.6],
  [13, 1.2, 2.0],
  [0, 1.0, 2.7],
];

function animCornWinter(ctx: CanvasRenderingContext2D, t: number): void {
  drawCornWinter(ctx);
  // Faint cold sheen across the scene (gentle pulse, seamless).
  const sheen = (Math.sin(t * 0.9) + 1) * 0.5;
  ctx.fillStyle = `rgba(200,225,255,${0.05 + sheen * 0.08})`;
  ctx.beginPath();
  ctx.ellipse(-2, 0, 18, 22, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Drifting snowflakes — fall from top, fade out near the ground, loop.
  const period = 3.4;
  WINTER_FLAKES.forEach(([fx, fr, phase]) => {
    const local = ((t + phase) % period) / period; // 0..1
    const y = -24 + local * 46; // top → ground
    const drift = Math.sin((t + phase) * 1.5) * 3;
    const x = fx + drift;
    // Fade in at the top, fade out as it settles.
    const fade = Math.min(1, local * 5) * Math.min(1, (1 - local) * 4);
    ctx.fillStyle = `rgba(248,252,255,${0.85 * fade})`;
    ctx.beginPath();
    ctx.arc(x, y, fr, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawCornSpring, anim: animCornSpring },
  Summer: { draw: drawCornSummer, anim: animCornSummer },
  Autumn: { draw: drawCornAutumn, anim: animCornAutumn },
  Winter: { draw: drawCornWinter, anim: animCornWinter },
};
