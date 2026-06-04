// Seasonal art for the WHEAT farm tile.
//
// Four full-art redraws tracing a believable wheat lifecycle:
//   Spring  — young green seedling tufts pushing up from soil.
//   Summer  — tall green stalk with a forming green head (awns appearing).
//   Autumn  — ripe golden head bowing over, classic harvest.
//   Winter  — cut, snow-dusted stubble in a cool muted palette.
//
// Each draw is origin-centered in the ~-24..+24 design box. Animations are
// deterministic (sin/cos/modulo of `t` in seconds), seamless, and subtle —
// the board sprite supplies its own sway rotation, so these avoid large
// rotations and lean on internal bends, glints, shimmer, and drifting flecks.

import type { SeasonalTileEntry } from "../types.js";

// ── Shared helpers ─────────────────────────────────────────────────────────

function groundShadow(ctx: CanvasRenderingContext2D, rx = 14, alpha = 0.22): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 22, rx, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Spring: young green sprouts ──────────────────────────────────────────────

function drawWheatSpring(ctx: CanvasRenderingContext2D): void {
  groundShadow(ctx, 13, 0.2);
  // soil clump the blades spring from
  ctx.fillStyle = "#5a3a18";
  ctx.beginPath();
  ctx.ellipse(0, 20, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f2810";
  ctx.beginPath();
  ctx.ellipse(0, 21, 9, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // fresh green blades — short, paired leaflets fanning up from the clump
  const blades: Array<[number, number]> = [
    [-9, -0.7], [-4, -0.35], [0, 0], [4, 0.35], [9, 0.7],
  ];
  blades.forEach(([bx, lean]) => {
    const tipX = bx + lean * 7;
    const tipY = -4 + Math.abs(bx) * 0.35; // outer blades a touch shorter
    // dark base pass for depth
    ctx.strokeStyle = "#26420f";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, 19);
    ctx.quadraticCurveTo(bx + lean * 4, 6, tipX, tipY);
    ctx.stroke();
    // bright fresh-green blade
    ctx.strokeStyle = "#74c23a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(bx, 19);
    ctx.quadraticCurveTo(bx + lean * 4, 6, tipX, tipY);
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // tiny seed-leaf nubs at the tips
  ctx.fillStyle = "#a6e06a";
  blades.forEach(([bx, lean]) => {
    const tipX = bx + lean * 7;
    const tipY = -4 + Math.abs(bx) * 0.35;
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, 1.6, 2.6, lean * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // dewy highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(-1, 2, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function animWheatSpring(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 13, 0.2);
  ctx.fillStyle = "#5a3a18";
  ctx.beginPath();
  ctx.ellipse(0, 20, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f2810";
  ctx.beginPath();
  ctx.ellipse(0, 21, 9, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  const blades: Array<[number, number]> = [
    [-9, -0.7], [-4, -0.35], [0, 0], [4, 0.35], [9, 0.7],
  ];
  blades.forEach(([bx, lean], i) => {
    // small phase offset per blade so the tuft ripples; seamless at 2π/1.6 s
    const sway = Math.sin(t * 1.6) * 1.8 + Math.sin(t * 1.6 + i) * 0.8;
    const tipX = bx + lean * 7 + sway;
    const tipY = -4 + Math.abs(bx) * 0.35;
    ctx.strokeStyle = "#26420f";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, 19);
    ctx.quadraticCurveTo(bx + lean * 4 + sway * 0.6, 6, tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = "#74c23a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(bx, 19);
    ctx.quadraticCurveTo(bx + lean * 4 + sway * 0.6, 6, tipX, tipY);
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  ctx.fillStyle = "#a6e06a";
  blades.forEach(([bx, lean], i) => {
    const sway = Math.sin(t * 1.6) * 1.8 + Math.sin(t * 1.6 + i) * 0.8;
    const tipX = bx + lean * 7 + sway;
    const tipY = -4 + Math.abs(bx) * 0.35;
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, 1.6, 2.6, lean * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // soft dewy glint that pulses
  const glint = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.4));
  ctx.fillStyle = `rgba(255,255,255,${glint})`;
  ctx.beginPath();
  ctx.arc(-1, 2, 1.4 + glint, 0, Math.PI * 2);
  ctx.fill();
}

// ── Summer: tall green stalk, head forming ───────────────────────────────────

function summerStalk(ctx: CanvasRenderingContext2D, bend: number, awnShimmer: number): void {
  groundShadow(ctx, 11, 0.2);

  // stalk — bends slightly at the top by `bend`
  const topX = bend;
  ctx.strokeStyle = "#6f8a2c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 23);
  ctx.quadraticCurveTo(topX * 0.4, 2, topX, -10);
  ctx.stroke();
  ctx.strokeStyle = "#9bbd45";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 23);
  ctx.quadraticCurveTo(topX * 0.4, 2, topX, -10);
  ctx.stroke();

  // a low leaf blade off each side
  ctx.fillStyle = "#7aa330";
  ctx.strokeStyle = "#42591a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(1, 16);
  ctx.quadraticCurveTo(-12, 12, -17, 3);
  ctx.quadraticCurveTo(-9, 11, 1, 19);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, 12);
  ctx.quadraticCurveTo(13, 9, 18, 1);
  ctx.quadraticCurveTo(10, 8, 1, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // green forming head — slim ovoid grain cluster up the top of the stalk
  for (let row = 0; row < 4; row++) {
    const y = -11 + row * 5;
    const cx = topX * (1 - row / 5);
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate(cx + side * (3.4 - row * 0.3), y);
      ctx.rotate(side * 0.4);
      const grad = ctx.createLinearGradient(-3, -5, 3, 5);
      grad.addColorStop(0, "#d7ec88");
      grad.addColorStop(0.6, "#9cc23e");
      grad.addColorStop(1, "#5d7d1f");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#42591a";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });
  }

  // awns just appearing — fine pale lines fanning up from the head crown
  ctx.lineWidth = 1.2;
  [-5, -2.5, 0, 2.5, 5].forEach((dx, i) => {
    const alpha = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(awnShimmer + i * 1.1));
    ctx.strokeStyle = `rgba(214,240,150,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(topX + dx * 0.6, -14);
    ctx.lineTo(topX + dx * 1.5, -23);
    ctx.stroke();
  });
}

function drawWheatSummer(ctx: CanvasRenderingContext2D): void {
  summerStalk(ctx, 2, 0);
}

function animWheatSummer(ctx: CanvasRenderingContext2D, t: number): void {
  const bend = 2 + Math.sin(t * 1.3) * 2.2; // gentle wind sway, period 2π/1.3 s
  summerStalk(ctx, bend, t * 2.2);
}

// ── Autumn: ripe golden head bowing over ─────────────────────────────────────

function autumnHead(ctx: CanvasRenderingContext2D, bow: number, glintPos: number): void {
  groundShadow(ctx, 12, 0.22);

  // stalk arcs up then bows over to the right under the heavy head
  const apexX = 6 + bow * 0.4;
  const headX = 13 + bow;
  const headY = -4 + bow * 0.5;
  ctx.strokeStyle = "#7a5417";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-2, 23);
  ctx.quadraticCurveTo(apexX, -16, headX, headY);
  ctx.stroke();
  ctx.strokeStyle = "#b88a2c";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-2, 23);
  ctx.quadraticCurveTo(apexX, -16, headX, headY);
  ctx.stroke();

  // a dry leaf blade low on the stalk
  ctx.fillStyle = "#b8932f";
  ctx.strokeStyle = "#6b4710";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(1, 14);
  ctx.quadraticCurveTo(-12, 11, -18, 4);
  ctx.quadraticCurveTo(-9, 10, 1, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // heavy golden grain head, angled along the bowed tip
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(0.9 + bow * 0.02); // head hangs over to the side
  for (let row = 0; row < 5; row++) {
    const y = -8 + row * 4.2;
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate(side * (4 - row * 0.2), y);
      ctx.rotate(side * 0.45);
      const grad = ctx.createLinearGradient(-4, -6, 4, 6);
      grad.addColorStop(0, "#fff0a0");
      grad.addColorStop(0.55, "#f4c84a");
      grad.addColorStop(1, "#9a6c16");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6b4710";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.ellipse(-1.3, -2.6, 1.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  // long golden awns trailing off the head tip
  ctx.strokeStyle = "#d8a32c";
  ctx.lineWidth = 1.3;
  [-4, -2, 0, 2, 4].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(dx * 0.5, -10);
    ctx.lineTo(dx * 1.4, -22);
    ctx.stroke();
  });
  // warm glint traveling along the grains (glintPos in 0..1 maps down the head)
  const gy = -8 + glintPos * 21;
  ctx.fillStyle = "rgba(255,250,210,0.85)";
  ctx.beginPath();
  ctx.ellipse(0, gy, 3.2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWheatAutumn(ctx: CanvasRenderingContext2D): void {
  autumnHead(ctx, 1, 0.3);
}

function animWheatAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  // slow heavy bob/sway, period 2π/0.9 s
  const bow = 1 + (0.5 + 0.5 * Math.sin(t * 0.9)) * 3;
  // glint cycles 0..1 seamlessly via fractional part of t
  const glintPos = (t * 0.5) % 1;
  autumnHead(ctx, bow, glintPos);
}

// ── Winter: snow-dusted stubble ──────────────────────────────────────────────

const STUBBLE: Array<[number, number, number]> = [
  // [base x, height, lean]
  [-11, 9, -0.4],
  [-5, 13, -0.1],
  [1, 11, 0.15],
  [7, 14, 0.3],
  [12, 8, 0.5],
];

function winterStubble(ctx: CanvasRenderingContext2D, flakes: Array<[number, number, number]>, sheen: number): void {
  groundShadow(ctx, 14, 0.18);

  // snow blanket over the soil
  const snow = ctx.createLinearGradient(0, 14, 0, 24);
  snow.addColorStop(0, "#eef4fb");
  snow.addColorStop(1, "#c2d2e4");
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.ellipse(0, 20, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // cut stubble — short cool-toned stalks poking up
  STUBBLE.forEach(([bx, h, lean]) => {
    const topX = bx + lean * h;
    const topY = 18 - h;
    ctx.strokeStyle = "#8a7a52";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, 19);
    ctx.lineTo(topX, topY);
    ctx.stroke();
    ctx.strokeStyle = "#b3a474";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bx, 19);
    ctx.lineTo(topX, topY);
    ctx.stroke();
    // snow cap on each cut tip
    ctx.fillStyle = "#f4f8ff";
    ctx.beginPath();
    ctx.ellipse(topX, topY - 0.5, 2.4, 1.6, lean * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.lineCap = "butt";

  // faint cold sheen across the snow
  ctx.fillStyle = `rgba(200,224,255,${0.18 + sheen * 0.18})`;
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

function drawWheatWinter(ctx: CanvasRenderingContext2D): void {
  winterStubble(
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

function animWheatWinter(ctx: CanvasRenderingContext2D, t: number): void {
  // four flakes each on their own seamless vertical loop (fall, then settle).
  // Phase derived from index so the column drifts at staggered times.
  const span = 30; // total vertical travel from top to settle line
  const seeds: Array<[number, number, number]> = [
    [-8, 1.4, 0.0],
    [4, 1.1, 0.45],
    [10, 1.0, 0.7],
    [-2, 1.2, 0.25],
  ];
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    // progress 0..1 over a 3.2s period, offset per flake
    const prog = ((t / 3.2 + phase) % 1 + 1) % 1;
    const fy = -22 + prog * span; // top to ~+8 settle line
    // gentle horizontal drift via sin, deterministic
    const driftX = fx + Math.sin((prog * Math.PI * 2) + phase * 6) * 3;
    return [driftX, fy, r];
  });
  const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
  winterStubble(ctx, flakes, sheen);
}

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawWheatSpring, anim: animWheatSpring },
  Summer: { draw: drawWheatSummer, anim: animWheatSummer },
  Autumn: { draw: drawWheatAutumn, anim: animWheatAutumn },
  Winter: { draw: drawWheatWinter, anim: animWheatWinter },
};
