// Seasonal art for the BUCKWHEAT farm tile (tile_grain_buckwheat).
//
// Four full-art redraws tracking the buckwheat lifecycle:
//   Spring — fresh low seedlings, no flowers
//   Summer — full green plant with white 5-petal flower clusters (base look)
//   Autumn — reddish stems, brown triangular seeds replacing flowers
//   Winter — bare frosted twigs, muted palette, a touch of snow
//
// Drawing contract: each draw/anim is origin-centered (0,0) in a ~-24..+24 box.
// The caller handles translate/scale/clear. `t` is elapsed SECONDS. Pure: no
// imports beyond the type. Animations stay subtle (the board sprite already
// applies its own sway rotation) — small internal bends, glints, shimmer,
// drifting flecks. All deterministic and seamlessly looping.

import type { SeasonalTileEntry } from "../types.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function groundShadow(ctx: CanvasRenderingContext2D, alpha = 0.2, rx = 18): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 23, rx, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A small white 5-petal floret with a warm center (the buckwheat signature).
function floret(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  petalR: number,
  ringR: number,
): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = fx + Math.cos(a) * ringR;
    const py = fy + Math.sin(a) * ringR;
    const pg = ctx.createRadialGradient(px - 0.5, py - 0.5, 0.2, px, py, petalR + 0.1);
    pg.addColorStop(0, "#ffffff");
    pg.addColorStop(1, "#e8dcc0");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, petalR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#a07838";
  ctx.beginPath();
  ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
  ctx.fill();
}

// A brown triangular buckwheat seed (the autumn fruit), pointing down.
function seed(ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number): void {
  const sg = ctx.createLinearGradient(sx, sy - s, sx, sy + s);
  sg.addColorStop(0, "#8a5a28");
  sg.addColorStop(1, "#4e2e10");
  ctx.fillStyle = sg;
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(sx, sy + s);
  ctx.lineTo(sx - s * 0.9, sy - s * 0.7);
  ctx.lineTo(sx + s * 0.9, sy - s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// SPRING — low fresh green sprigs / seedlings, a couple of small leaves
// ---------------------------------------------------------------------------

function drawBuckwheatSpring(ctx: CanvasRenderingContext2D): void {
  groundShadow(ctx, 0.18, 14);
  // Soil mound at the base
  ctx.fillStyle = "#6b4a2a";
  ctx.beginPath();
  ctx.ellipse(0, 21, 12, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(60,40,22,0.6)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // A few short, fresh sprigs rising from the soil.
  const sprigs: Array<[number, number, number]> = [
    [-6, 20, 2],
    [0, 21, 9],
    [6, 20, 5],
  ];
  sprigs.forEach(([bx, by, lean]) => {
    // dark stem base
    ctx.strokeStyle = "#3f6a1c";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + lean * 0.4, by - 12, bx + lean, by - 24);
    ctx.stroke();
    // bright fresh highlight
    ctx.strokeStyle = "#9bd45a";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + lean * 0.4, by - 12, bx + lean, by - 24);
    ctx.stroke();
  });

  // A couple of small heart/triangular seed-leaves near the top of the tallest.
  ctx.fillStyle = "#79b53a";
  ctx.strokeStyle = "#3f6a1c";
  ctx.lineWidth = 1.0;
  const leaves: Array<[number, number, number]> = [
    [7, -3, -1],
    [11, 3, 1],
  ];
  leaves.forEach(([lx, ly, dir]) => {
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + dir * 8, ly - 4);
    ctx.lineTo(lx + dir * 3, ly - 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Tiny fresh bud tips (no flowers yet) on the side sprigs.
  ctx.fillStyle = "#c4e890";
  [[-4, -4], [12, -22]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function animBuckwheatSpring(ctx: CanvasRenderingContext2D, t: number): void {
  // Gentle internal sway: a faint top-weighted shear that breathes in and out.
  // (Applied to the whole sprig drawing, anchored at the soil line.)
  const sway = Math.sin(t * 1.6) * 0.018;
  ctx.save();
  ctx.translate(0, 20);
  ctx.transform(1, 0, sway, 1, 0, 0);
  ctx.translate(0, -20);
  drawBuckwheatSpring(ctx);
  ctx.restore();

  // Dewy glint travelling slowly down the tallest sprig.
  const phase = (t * 0.45) % 1;
  const gx = 4 + phase * 8;
  const gy = -22 + phase * 30;
  const glow = 0.45 + 0.35 * Math.sin(t * 3.2);
  ctx.fillStyle = `rgba(225,255,235,${glow})`;
  ctx.beginPath();
  ctx.arc(gx, gy, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${glow * 0.7})`;
  ctx.beginPath();
  ctx.arc(gx - 0.4, gy - 0.4, 0.6, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// SUMMER — full green plant with white 5-petal flower clusters in bloom
// ---------------------------------------------------------------------------

function drawBuckwheatSummer(ctx: CanvasRenderingContext2D): void {
  groundShadow(ctx, 0.2, 18);
  // Stalk (dark core + bright highlight), matching the base look.
  ctx.strokeStyle = "#3a5a18";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -10);
  ctx.stroke();
  ctx.strokeStyle = "#7cb04a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -10);
  ctx.stroke();

  // Triangular leaves.
  ctx.fillStyle = "#5a8a26";
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1.4;
  const leaves: Array<[number, number, number, number]> = [
    [-1, 12, -14, 6],
    [1, 4, 14, -2],
  ];
  leaves.forEach(([sx, sy, tx, ty]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.lineTo(sx + (tx > 0 ? 2 : -2), sy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // White 5-petal flower clusters at the top.
  const florets: Array<[number, number]> = [
    [-5, -15],
    [0, -20],
    [5, -15],
    [-2, -11],
    [3, -11],
    [0, -16],
  ];
  florets.forEach(([fx, fy]) => floret(ctx, fx, fy, 1.4, 1.7));
}

function animBuckwheatSummer(ctx: CanvasRenderingContext2D, t: number): void {
  drawBuckwheatSummer(ctx);
  // Soft twinkle on the flower cluster — petals shimmer with a moving phase.
  const florets: Array<[number, number, number]> = [
    [-5, -15, 0],
    [0, -20, 1.3],
    [5, -15, 2.6],
    [-2, -11, 3.9],
    [3, -11, 5.2],
    [0, -16, 0.7],
  ];
  florets.forEach(([fx, fy, ph]) => {
    const tw = 0.25 + 0.55 * Math.max(0, Math.sin(t * 2.4 + ph));
    ctx.fillStyle = `rgba(255,255,255,${tw})`;
    ctx.beginPath();
    ctx.arc(fx - 0.6, fy - 0.8, 0.8, 0, Math.PI * 2);
    ctx.fill();
  });
  // A drifting sparkle that orbits the cluster top, slow and seamless.
  const a = (t * 0.6) % (Math.PI * 2);
  const sx = Math.cos(a) * 6;
  const sy = -16 + Math.sin(a) * 4;
  const s = 0.4 + 0.4 * Math.sin(t * 4);
  ctx.fillStyle = `rgba(255,250,220,${s})`;
  ctx.beginPath();
  ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// AUTUMN — reddish-pink stems, brown triangular seeds, warm palette
// ---------------------------------------------------------------------------

function drawBuckwheatAutumn(ctx: CanvasRenderingContext2D): void {
  groundShadow(ctx, 0.22, 17);
  // Reddish-pink stalk (buckwheat reddens in autumn).
  ctx.strokeStyle = "#7a2a2e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -10);
  ctx.stroke();
  ctx.strokeStyle = "#c85a64";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -10);
  ctx.stroke();

  // Drying triangular leaves, warmer ochre tones.
  ctx.fillStyle = "#9a7a2a";
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 1.4;
  const leaves: Array<[number, number, number, number]> = [
    [-1, 12, -14, 6],
    [1, 4, 14, -2],
  ];
  leaves.forEach(([sx, sy, tx, ty]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.lineTo(sx + (tx > 0 ? 2 : -2), sy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Brown triangular seeds replacing the flower cluster.
  const seeds: Array<[number, number, number]> = [
    [-5, -15, 2.4],
    [0, -20, 2.7],
    [5, -15, 2.4],
    [-2, -11, 2.1],
    [3, -11, 2.1],
    [0, -16, 2.6],
  ];
  seeds.forEach(([sx, sy, ss]) => seed(ctx, sx, sy, ss));
}

function animBuckwheatAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  drawBuckwheatAutumn(ctx);

  // Warm glint pulsing across the seed head.
  const glint = 0.2 + 0.4 * Math.max(0, Math.sin(t * 1.8));
  ctx.fillStyle = `rgba(255,210,140,${glint})`;
  ctx.beginPath();
  ctx.arc(-1.5, -18, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // A seed or two drifting off and falling — seamless loop via modulo phase.
  const drift = (i: number, period: number, offset: number): void => {
    const p = ((t / period + offset) % 1 + 1) % 1;
    // start near a floret, fall + sway out, fade near the end.
    const startX = i === 0 ? 5 : -5;
    const startY = -15;
    const x = startX + (i === 0 ? 1 : -1) * (4 * p + Math.sin(p * Math.PI * 3) * 2);
    const y = startY + p * 30;
    const fade = p < 0.12 ? p / 0.12 : 1 - Math.max(0, (p - 0.7) / 0.3);
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(x, y);
    ctx.rotate(p * (i === 0 ? 3.2 : -3.2));
    seed(ctx, 0, 0, 2.0);
    ctx.restore();
  };
  drift(0, 3.0, 0);
  drift(1, 3.0, 0.5);
}

// ---------------------------------------------------------------------------
// WINTER — bare frosted twigs, muted cool palette, a touch of snow
// ---------------------------------------------------------------------------

function drawBuckwheatWinter(ctx: CanvasRenderingContext2D): void {
  groundShadow(ctx, 0.16, 15);
  // Snow cap on the soil.
  ctx.fillStyle = "#e6eef4";
  ctx.beginPath();
  ctx.ellipse(0, 21, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(190,210,225,0.7)";
  ctx.beginPath();
  ctx.ellipse(0, 22.5, 13, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bare dry main stem and a couple of leafless side twigs.
  ctx.strokeStyle = "#6b6258";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(0, -12);
  ctx.stroke();

  const twigs: Array<[number, number, number, number]> = [
    [0, 4, -12, -6],
    [0, -2, 13, -14],
    [0, -8, -7, -20],
  ];
  ctx.strokeStyle = "#7d7468";
  ctx.lineWidth = 1.6;
  twigs.forEach(([bx, by, tx, ty]) => {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo((bx + tx) / 2, by - 2, tx, ty);
    ctx.stroke();
  });

  // Frost highlight rime along the stems (cool light edge).
  ctx.strokeStyle = "rgba(220,235,245,0.75)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-0.8, 18);
  ctx.lineTo(-0.8, -11);
  ctx.stroke();
  twigs.forEach(([bx, by, tx, ty]) => {
    ctx.beginPath();
    ctx.moveTo(bx - 0.6, by);
    ctx.quadraticCurveTo((bx + tx) / 2 - 0.6, by - 2.6, tx, ty - 0.8);
    ctx.stroke();
  });

  // Tiny frost crystals clinging to the twig tips.
  ctx.fillStyle = "#dfeef7";
  [[-12, -6], [13, -14], [-7, -20], [0, -12]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 1.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function animBuckwheatWinter(ctx: CanvasRenderingContext2D, t: number): void {
  drawBuckwheatWinter(ctx);

  // Faint frost sparkle pulses at the twig tips (staggered phases).
  const tips: Array<[number, number, number]> = [
    [-12, -6, 0],
    [13, -14, 2.1],
    [-7, -20, 4.2],
    [0, -12, 1.0],
  ];
  tips.forEach(([cx, cy, ph]) => {
    const s = Math.max(0, Math.sin(t * 2.0 + ph));
    if (s <= 0.02) return;
    ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.6 * s})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 0.6 + 0.7 * s, 0, Math.PI * 2);
    ctx.fill();
    // four-point twinkle cross at peak
    if (s > 0.6) {
      ctx.strokeStyle = `rgba(255,255,255,${(s - 0.6) * 1.6})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - 2.4, cy);
      ctx.lineTo(cx + 2.4, cy);
      ctx.moveTo(cx, cy - 2.4);
      ctx.lineTo(cx, cy + 2.4);
      ctx.stroke();
    }
  });

  // A snowflake drifting down, seamless loop.
  const p = (t / 4.5) % 1;
  const fx = -8 + Math.sin(p * Math.PI * 2) * 5 + p * 4;
  const fy = -22 + p * 44;
  const fade = p < 0.1 ? p / 0.1 : 1 - Math.max(0, (p - 0.8) / 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.fillStyle = "#f2f8ff";
  ctx.beginPath();
  ctx.arc(fx, fy, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(210,228,245,0.9)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(fx - Math.cos(a) * 2.4, fy - Math.sin(a) * 2.4);
    ctx.lineTo(fx + Math.cos(a) * 2.4, fy + Math.sin(a) * 2.4);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawBuckwheatSpring, anim: animBuckwheatSpring },
  Summer: { draw: drawBuckwheatSummer, anim: animBuckwheatSummer },
  Autumn: { draw: drawBuckwheatAutumn, anim: animBuckwheatAutumn },
  Winter: { draw: drawBuckwheatWinter, anim: animBuckwheatWinter },
};
