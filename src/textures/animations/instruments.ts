// Animated musical instruments — same look as src/textures/categories/instruments.ts, but playing.
// Each fn redraws the WHOLE icon at time `t` (seconds). Loops are seamless via modulo / sin.
// Pure, self-contained, no imports.

function shadow(ctx: CanvasRenderingContext2D, w: number, y?: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(2, y || 22, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A floating, rising-and-fading musical note that loops seamlessly.
// `phase` offsets the loop; the note rises from (baseX, baseY).
function noteSparkle(
  ctx: CanvasRenderingContext2D,
  t: number,
  baseX: number,
  baseY: number,
  rise: number,
  drift: number,
  speed: number,
  phase: number,
  size: number,
): void {
  const p = ((t * speed + phase) % 1 + 1) % 1; // 0..1 loop
  const fade = Math.sin(p * Math.PI); // 0 at ends, 1 in middle
  if (fade <= 0.01) return;
  const x = baseX + Math.sin(p * Math.PI * 2 + phase * 6) * drift;
  const y = baseY - p * rise;
  ctx.save();
  ctx.globalAlpha = fade * 0.9;
  ctx.fillStyle = "#fff3b0";
  ctx.strokeStyle = "rgba(90,52,8,0.8)";
  ctx.lineWidth = 0.7;
  // Note head
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.72, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Stem
  ctx.beginPath();
  ctx.moveTo(x + size * 0.85, y - size * 0.3);
  ctx.lineTo(x + size * 0.85, y - size * 2.6);
  ctx.stroke();
  // Flag
  ctx.beginPath();
  ctx.moveTo(x + size * 0.85, y - size * 2.6);
  ctx.quadraticCurveTo(x + size * 2.0, y - size * 2.2, x + size * 1.6, y - size * 1.0);
  ctx.stroke();
  ctx.restore();
}

// Expanding, fading sound-wave arc. `p` in 0..1 = expansion progress.
function soundArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  p: number,
  baseR: number,
  spread: number,
  a0: number,
  a1: number,
  color: string,
  width: number,
): void {
  const fade = 1 - p;
  if (fade <= 0.02) return;
  const r = baseR + p * spread;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
  ctx.restore();
}

function animLute(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 16);
  // Floating note sparkles drifting up from the soundhole region.
  noteSparkle(ctx, t, 4, -2, 22, 4, 0.5, 0, 2.0);
  noteSparkle(ctx, t, -2, -4, 26, 3.5, 0.42, 0.55, 1.7);
  ctx.save();
  ctx.rotate(-0.18);
  // Neck — tilted up-right with frets.
  ctx.save();
  ctx.translate(6, -2);
  ctx.rotate(-0.9);
  const neckG = ctx.createLinearGradient(0, -3.5, 0, 3.5);
  neckG.addColorStop(0, "#a87838");
  neckG.addColorStop(0.5, "#7a4818");
  neckG.addColorStop(1, "#3a2008");
  ctx.fillStyle = neckG;
  ctx.fillRect(0, -3.5, 26, 7);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.6;
  ctx.strokeRect(0, -3.5, 26, 7);
  ctx.strokeStyle = "rgba(20,14,4,0.6)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5, -3.5);
    ctx.lineTo(i * 5, 3.5);
    ctx.stroke();
  }
  ctx.fillStyle = "#5a3414";
  ctx.beginPath();
  ctx.moveTo(26, -4);
  ctx.lineTo(34, -7);
  ctx.lineTo(35, -1);
  ctx.lineTo(27, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#2a1808";
  ([[30, -6], [33, -3], [29, 2]] as [number, number][]).forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Body.
  const body = ctx.createRadialGradient(-5, 4, 3, 0, 8, 22);
  body.addColorStop(0, "#d8a058");
  body.addColorStop(0.5, "#a86828");
  body.addColorStop(1, "#5a3010");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-14, -6, -16, 12, -8, 20);
  ctx.bezierCurveTo(-2, 24, 6, 24, 12, 18);
  ctx.bezierCurveTo(18, 10, 14, -6, 0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(40,20,8,0.4)";
  ctx.lineWidth = 0.9;
  [-6, -2, 2, 6, 10].forEach((cx) => {
    ctx.beginPath();
    ctx.moveTo(cx * 0.4, -6);
    ctx.bezierCurveTo(cx, 6, cx, 14, cx * 0.6, 22);
    ctx.stroke();
  });
  ctx.restore();
  // Soundhole.
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath();
  ctx.arc(0, 6, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8a058";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 6, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(216,160,88,0.7)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(0, 6, 2.6, 0, Math.PI * 2);
  ctx.stroke();
  // Bridge.
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-5, 13, 10, 2.4);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-5, 13, 10, 2.4);
  // Strings — vibrating shimmer. Each string bows sideways with a sine that
  // travels along its length, brightening as it oscillates (as if strummed).
  for (let i = -2; i <= 2; i++) {
    const x0 = i * 1.6;
    const y0 = 13;
    const x1 = i * 1.2 + 3;
    const y1 = -7;
    // Per-string phase so they shimmer slightly out of sync.
    const vib = Math.sin(t * 22 + i * 1.3) * 0.9;
    const shimmer = 0.6 + 0.4 * Math.abs(Math.sin(t * 11 + i * 0.7));
    const mx = (x0 + x1) / 2 + vib;
    const my = (y0 + y1) / 2;
    ctx.strokeStyle = `rgba(245,235,210,${shimmer})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();
  }
  // Body highlight.
  ctx.fillStyle = "rgba(255,240,210,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, 2, 2.6, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animDrum(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 18);
  // Tap cycle: stick rises, falls, strikes at the bottom of the loop.
  const period = 0.9;
  const cyc = (t % period) / period; // 0..1
  // Strike happens at cyc≈0 / cyc≈1. Stick height: a smooth bounce.
  // Use a curve that dips to 0 (contact) near the loop boundary.
  const lift = Math.abs(Math.sin(cyc * Math.PI)); // 0 at strike, 1 mid-loop
  const stickLift = -lift * 7; // negative = raised above head
  // Hit intensity peaks right at contact, decays over the loop.
  const sinceHit = Math.min(cyc, 1 - cyc) * 2; // 0 at strike, 1 mid
  const ripple = 1 - sinceHit; // 1 at strike, 0 mid

  // Wooden body — slightly trapezoidal barrel.
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, "#5a3010");
  body.addColorStop(0.5, "#a86828");
  body.addColorStop(1, "#4a2808");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-15, -6);
  ctx.lineTo(15, -6);
  ctx.lineTo(13, 16);
  ctx.lineTo(-13, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,20,8,0.4)";
  ctx.lineWidth = 0.8;
  [-9, -3, 3, 9].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -5);
    ctx.lineTo(x * 0.85, 15);
    ctx.stroke();
  });
  ctx.fillStyle = "#3a2008";
  ctx.beginPath();
  ctx.ellipse(0, 16, 13, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "#d8c090";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const xt = -13 + i * 5.2;
    const xb = -13 + i * 5.2 + 2.6;
    ctx.beginPath();
    ctx.moveTo(xt, -4);
    ctx.lineTo(xb, 14);
    ctx.lineTo(xt + 5.2, -4);
    ctx.stroke();
  }
  // Head skin — ripples on impact (vertical squash + a shimmer ring).
  const headSquash = 1 - ripple * 0.14;
  const head = ctx.createRadialGradient(-4, -8, 2, 0, -6, 18);
  head.addColorStop(0, "#fdf3dc");
  head.addColorStop(0.7, "#e8d2a0");
  head.addColorStop(1, "#c0a060");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(0, -6, 16, 6 * headSquash, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, -6, 16, 6 * headSquash, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Impact ring spreading across the head on each hit.
  if (ripple > 0.02) {
    const rr = (1 - ripple) * 13 + 2;
    ctx.save();
    ctx.globalAlpha = ripple * 0.7;
    ctx.strokeStyle = "rgba(120,72,24,0.8)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(2, -6, rr, rr * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Head highlight.
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-5, -8, 5, 1.8 * headSquash, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Drumstick — tip hovers above the head and dips to strike at (2,-6).
  ctx.save();
  ctx.translate(2, -6 + stickLift);
  ctx.rotate(-0.5 - lift * 0.12);
  const stickG = ctx.createLinearGradient(0, -1.5, 0, 1.5);
  stickG.addColorStop(0, "#d8a860");
  stickG.addColorStop(1, "#7a4818");
  ctx.fillStyle = stickG;
  ctx.fillRect(-2, -1.4, 22, 2.8);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 0.9;
  ctx.strokeRect(-2, -1.4, 22, 2.8);
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.arc(20, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(19, -1, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animFlute(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 18);
  ctx.save();
  ctx.rotate(-0.35);
  // Wooden tube.
  const tube = ctx.createLinearGradient(0, -4, 0, 4);
  tube.addColorStop(0, "#d8a860");
  tube.addColorStop(0.45, "#a86828");
  tube.addColorStop(1, "#5a3010");
  ctx.fillStyle = tube;
  ctx.beginPath();
  ctx.moveTo(-22, -3.5);
  ctx.lineTo(18, -4);
  ctx.bezierCurveTo(24, -4, 24, 4, 18, 4);
  ctx.lineTo(-22, 3.5);
  ctx.bezierCurveTo(-25, 3, -25, -3, -22, -3.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,20,8,0.35)";
  ctx.lineWidth = 0.7;
  [-1.2, 0.6].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.lineTo(16, y);
    ctx.stroke();
  });
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.6;
  [-16, 12].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -3.6);
    ctx.lineTo(x, 3.6);
    ctx.stroke();
  });
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(-22, -3.6);
  ctx.lineTo(-19, -4.2);
  ctx.lineTo(-19, 4.2);
  ctx.lineTo(-22, 3.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath();
  ctx.moveTo(-17, -3.2);
  ctx.lineTo(-14, -3.2);
  ctx.lineTo(-15.5, -1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a0e04";
  [-8, -3, 2, 7, 12].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, -0.4, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Gentle shimmer streak sweeping along the body.
  const sweep = ((t * 0.5) % 1 + 1) % 1; // 0..1
  const sx = -20 + sweep * 36;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-20, -2.4);
  ctx.lineTo(16, -2.6);
  ctx.lineTo(16, -1.6);
  ctx.lineTo(-20, -1.4);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(255,245,215,0.5)";
  ctx.fillRect(-20, -2.6, 36, 1.4);
  const glint = ctx.createLinearGradient(sx - 5, 0, sx + 5, 0);
  glint.addColorStop(0, "rgba(255,255,255,0)");
  glint.addColorStop(0.5, "rgba(255,255,255,0.85)");
  glint.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glint;
  ctx.fillRect(sx - 5, -2.6, 10, 1.6);
  ctx.restore();
  ctx.restore();
  // Note sparkles puffing out of the (rotated-back) far end. The flute is
  // rotated -0.35; the open end sits roughly up-right in icon space.
  noteSparkle(ctx, t, 18, -10, 18, 4, 0.55, 0.0, 1.9);
  noteSparkle(ctx, t, 22, -8, 20, 5, 0.48, 0.5, 1.6);
}

function animHorn(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 18);
  ctx.save();
  ctx.rotate(-0.12);
  // Sound-wave arcs radiating from the bell mouth (around 18,-8).
  const bx = 19;
  const by = -7;
  for (let k = 0; k < 3; k++) {
    const p = (((t * 0.8) + k / 3) % 1 + 1) % 1;
    soundArc(ctx, bx, by, p, 5, 12, -1.05, 0.75, "rgba(224,168,48,0.85)", 1.6);
  }
  const brass = ctx.createLinearGradient(-18, -10, 18, 12);
  brass.addColorStop(0, "#fff3b0");
  brass.addColorStop(0.4, "#e0a830");
  brass.addColorStop(0.7, "#a86810");
  brass.addColorStop(1, "#5a3408");
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.bezierCurveTo(-22, -8, -6, -16, 6, -12);
  ctx.stroke();
  ctx.strokeStyle = brass;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.bezierCurveTo(-22, -8, -6, -16, 6, -12);
  ctx.stroke();
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(4, -16);
  ctx.bezierCurveTo(14, -20, 22, -14, 22, -4);
  ctx.bezierCurveTo(18, -6, 12, -6, 8, -8);
  ctx.bezierCurveTo(6, -10, 4, -13, 4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(40,20,8,0.5)";
  ctx.beginPath();
  ctx.ellipse(18, -8, 4, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e0a830";
  ctx.beginPath();
  ctx.ellipse(-16, 6, 3, 3.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,250,220,0.75)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-15, 3);
  ctx.bezierCurveTo(-19, -7, -6, -13, 4, -11);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,250,220,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(6, -15);
  ctx.bezierCurveTo(14, -18, 20, -14, 21, -6);
  ctx.stroke();
  // Brass glint sweeping along the tube.
  const g = (((t * 0.6)) % 1 + 1) % 1; // 0..1
  const gt = g; // param along the curve
  // Bezier point along the main tube curve.
  const bez = (a: number, b: number, c: number, d: number, u: number): number => {
    const m = 1 - u;
    return m * m * m * a + 3 * m * m * u * b + 3 * m * u * u * c + u * u * u * d;
  };
  const gx = bez(-16, -22, -6, 6, gt);
  const gy = bez(6, -8, -16, -12, gt);
  const glintFade = Math.sin(g * Math.PI);
  ctx.save();
  ctx.globalAlpha = glintFade * 0.9;
  ctx.fillStyle = "rgba(255,255,235,0.95)";
  ctx.beginPath();
  ctx.arc(gx, gy, 2.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#7a3018";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.bezierCurveTo(-6, 14, 6, 14, 10, 2);
  ctx.stroke();
  ctx.restore();
}

function animFiddle(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 16);
  ctx.save();
  ctx.rotate(-0.15);
  // Bow draws back and forth across the strings (slide along its own axis).
  const draw = Math.sin(t * 2.2) * 7; // bow slide offset
  ctx.save();
  ctx.translate(10, 2);
  ctx.rotate(0.5);
  ctx.translate(draw, 0);
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.quadraticCurveTo(0, -3, 22, 0);
  ctx.stroke();
  ctx.strokeStyle = "rgba(245,235,210,0.85)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-21, 1);
  ctx.lineTo(21, 1);
  ctx.stroke();
  ctx.fillStyle = "#2a1808";
  ctx.fillRect(-23, -1.5, 4, 4);
  ctx.restore();
  // Fiddle body.
  const body = ctx.createRadialGradient(-3, 2, 3, 0, 6, 20);
  body.addColorStop(0, "#d88838");
  body.addColorStop(0.5, "#a85818");
  body.addColorStop(1, "#5a2c08");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-8, -10, -10, -4, -7, 0);
  ctx.bezierCurveTo(-10, 2, -10, 4, -7, 5);
  ctx.bezierCurveTo(-11, 9, -11, 20, 0, 20);
  ctx.bezierCurveTo(11, 20, 11, 9, 7, 5);
  ctx.bezierCurveTo(10, 4, 10, 2, 7, 0);
  ctx.bezierCurveTo(10, -4, 8, -10, 0, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ([-1, 1] as number[]).forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(s * 4, 2);
    ctx.bezierCurveTo(s * 6, 6, s * 2, 10, s * 4, 14);
    ctx.stroke();
  });
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-4, 8, 8, 1.8);
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-2.2, -20, 4.4, 11);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-2.2, -20, 4.4, 11);
  ctx.fillStyle = "#8a5520";
  ctx.beginPath();
  ctx.arc(0, -22, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,14,4,0.7)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(0, -22, 1.6, 0, Math.PI * 1.6);
  ctx.stroke();
  // Strings — shimmer as the bow drags. Brightness tied to bow speed.
  const bowSpeed = Math.abs(Math.cos(t * 2.2));
  let si = 0;
  for (let i = -1.5; i <= 1.5; i++) {
    const vib = Math.sin(t * 26 + si * 1.6) * 0.5 * bowSpeed;
    const shimmer = 0.5 + 0.45 * (0.4 + 0.6 * bowSpeed) * Math.abs(Math.sin(t * 13 + si));
    const mx = i + vib;
    ctx.strokeStyle = `rgba(245,235,210,${shimmer})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(i, -19);
    ctx.quadraticCurveTo(mx, -5, i, 9);
    ctx.stroke();
    si++;
  }
  // Body highlight.
  ctx.fillStyle = "rgba(255,235,200,0.35)";
  ctx.beginPath();
  ctx.ellipse(-4, 12, 2.4, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // A note sparkle floating off the f-hole region.
  noteSparkle(ctx, t, 6, 4, 20, 4, 0.5, 0.3, 1.7);
}

function animBell(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 14);
  // Swing the whole bell about its handle top (pivot near 0,-22).
  const swing = Math.sin(t * 3.0) * 0.22; // radians
  // Clapper swings with a phase offset (lags the bell).
  const clap = Math.sin(t * 3.0 - 0.9) * 0.5;
  // Sound arcs ring out at the swing peaks (when |swing| is largest).
  const swingPhase = (t * 3.0) / (Math.PI * 2); // 0.. (peaks every half-cycle)
  const ringP = ((swingPhase * 2) % 1 + 1) % 1; // 0..1, two pulses per swing cycle

  ctx.save();
  ctx.translate(0, -22);
  ctx.rotate(swing);
  ctx.translate(0, 22);

  // Wooden handle.
  const handle = ctx.createLinearGradient(-4, -22, 4, -8);
  handle.addColorStop(0, "#a87838");
  handle.addColorStop(0.5, "#7a4818");
  handle.addColorStop(1, "#3a2008");
  ctx.fillStyle = handle;
  ctx.beginPath();
  ctx.moveTo(-3, -8);
  ctx.bezierCurveTo(-5, -16, -3, -22, 0, -22);
  ctx.bezierCurveTo(3, -22, 5, -16, 3, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#8a5520";
  ctx.beginPath();
  ctx.arc(0, -22, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#c8901c";
  ctx.fillRect(-3.5, -9, 7, 3);
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1;
  ctx.strokeRect(-3.5, -9, 7, 3);
  // Bell body.
  const brass = ctx.createLinearGradient(-14, -6, 14, 18);
  brass.addColorStop(0, "#fff3b0");
  brass.addColorStop(0.4, "#e0a830");
  brass.addColorStop(0.75, "#a86810");
  brass.addColorStop(1, "#5a3408");
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.bezierCurveTo(-6, 2, -12, 8, -14, 14);
  ctx.bezierCurveTo(-8, 18, 8, 18, 14, 14);
  ctx.bezierCurveTo(12, 8, 6, 2, 4, -6);
  ctx.bezierCurveTo(2, -8, -2, -8, -4, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#3a2408";
  ctx.beginPath();
  ctx.ellipse(0, 14, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Clapper — swings within the mouth on its own offset phase.
  const clapperX = clap * 8;
  ctx.fillStyle = "#8a6018";
  ctx.beginPath();
  ctx.arc(clapperX, 15, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Shine streaks.
  ctx.strokeStyle = "rgba(255,250,220,0.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, -3);
  ctx.bezierCurveTo(-9, 4, -11, 8, -11, 12);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,250,220,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.bezierCurveTo(-4, 4, -5, 8, -5, 12);
  ctx.stroke();
  ctx.restore();

  // Sound-wave arcs ringing from the mouth at the swing peaks (in icon space,
  // not following the swing, so they read as emitted ring-tones).
  for (let k = 0; k < 2; k++) {
    const p = ((ringP + k / 2) % 1 + 1) % 1;
    soundArc(ctx, 0, 14, p, 16, 9, 0.15, Math.PI - 0.15, "rgba(224,168,48,0.7)", 1.4);
  }
}

function animPanFlute(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 16);
  const tubes = 6;
  const startX = -13;
  const gap = 5.2;
  const topY = -16;
  ctx.save();
  ctx.rotate(0.04);
  for (let i = 0; i < tubes; i++) {
    const x = startX + i * gap;
    const len = 12 + i * 5;
    const bottomY = topY + len;
    const tubeG = ctx.createLinearGradient(x - 2.2, 0, x + 2.2, 0);
    tubeG.addColorStop(0, "#5a3010");
    tubeG.addColorStop(0.4, "#c89048");
    tubeG.addColorStop(0.6, "#e0b060");
    tubeG.addColorStop(1, "#6a3a12");
    ctx.fillStyle = tubeG;
    ctx.beginPath();
    ctx.moveTo(x - 2.2, topY);
    ctx.lineTo(x + 2.2, topY);
    ctx.lineTo(x + 2.2, bottomY);
    ctx.bezierCurveTo(x + 2.2, bottomY + 2.4, x - 2.2, bottomY + 2.4, x - 2.2, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#1a0e04";
    ctx.beginPath();
    ctx.ellipse(x, topY, 2.2, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a4810";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // Gentle per-tube shimmer along the specular streak.
    const sh = 0.4 + 0.25 * (0.5 + 0.5 * Math.sin(t * 4 + i * 0.6));
    ctx.fillStyle = `rgba(255,245,215,${sh})`;
    ctx.fillRect(x - 1.4, topY + 1.5, 0.9, len - 2);
  }
  // Binding cords.
  const rightX = startX + (tubes - 1) * gap;
  ([[-9, "#a8782c"], [-2, "#8a5818"]] as [number, string][]).forEach(([by, col]) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(startX - 3, by);
    ctx.lineTo(rightX + 3, by);
    ctx.stroke();
    ctx.strokeStyle = "rgba(40,20,8,0.5)";
    ctx.lineWidth = 0.7;
    for (let x = startX - 2; x < rightX + 3; x += 2.4) {
      ctx.beginPath();
      ctx.moveTo(x, by - 1.6);
      ctx.lineTo(x + 1.4, by + 1.6);
      ctx.stroke();
    }
  });
  ctx.restore();
  // Note sparkles rise from each tube top in left-to-right sequence.
  const seqPeriod = 2.4;
  for (let i = 0; i < tubes; i++) {
    const x = startX + i * gap;
    // Stagger each tube's phase so the puff travels along the row.
    const phase = (i / tubes);
    noteSparkle(ctx, t / seqPeriod * 1.0, x, topY - 1, 18, 2.5, 1 / seqPeriod, phase, 1.5);
  }
}

function animTambourine(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 18);
  // Quick rattle/jitter of the whole tambourine.
  const jx = Math.sin(t * 34) * 0.9 + Math.sin(t * 23) * 0.5;
  const jy = Math.cos(t * 29) * 0.7;
  const jr = Math.sin(t * 31) * 0.04;
  ctx.save();
  ctx.translate(jx, jy);
  ctx.rotate(-0.1 + jr);
  // Wooden rim.
  const rimG = ctx.createLinearGradient(-20, 0, 20, 0);
  rimG.addColorStop(0, "#5a3010");
  rimG.addColorStop(0.5, "#a86828");
  rimG.addColorStop(1, "#4a2808");
  ctx.fillStyle = rimG;
  ctx.beginPath();
  ctx.ellipse(0, 2, 20, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Skin head.
  const head = ctx.createRadialGradient(-5, -3, 3, 0, 2, 18);
  head.addColorStop(0, "#fdf3dc");
  head.addColorStop(0.7, "#e8d2a0");
  head.addColorStop(1, "#c0a060");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(0, 2, 15, 13.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-6, -4, 5, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,72,24,0.5)";
  ctx.lineWidth = 0.7;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.ellipse(0, 2, 15, 13.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Jingle discs — flash/shimmer as they rattle in their slots.
  const jingles = 8;
  for (let i = 0; i < jingles; i++) {
    const a = (i / jingles) * Math.PI * 2 - Math.PI / 2;
    // Disc wobbles within its slot.
    const wob = Math.sin(t * 30 + i * 1.7) * 0.8;
    const jx2 = Math.cos(a) * (18 + wob * 0.4);
    const jy2 = 2 + Math.sin(a) * (16 + wob * 0.4);
    ctx.fillStyle = "#3a2008";
    ctx.beginPath();
    ctx.ellipse(jx2, jy2, 3.4, 2.2, a, 0, Math.PI * 2);
    ctx.fill();
    const flash = 0.6 + 0.4 * Math.abs(Math.sin(t * 18 + i * 0.9));
    const jg = ctx.createRadialGradient(jx2 - 1, jy2 - 1, 0.5, jx2, jy2, 3);
    jg.addColorStop(0, "#fff3b0");
    jg.addColorStop(0.6, "#e0a830");
    jg.addColorStop(1, "#8a5510");
    ctx.fillStyle = jg;
    ctx.beginPath();
    ctx.arc(jx2, jy2, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a2008";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = flash;
    ctx.fillStyle = "rgba(255,250,220,0.9)";
    ctx.beginPath();
    ctx.arc(jx2 - 0.8, jy2 - 0.8, 0.8 + flash * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Impact sparkles popping around the rim on the shake beat.
  const beat = (t * 6) % 1; // 0..1 fast beat
  const burst = Math.max(0, 1 - beat * 2); // sharp pop at start of each beat
  if (burst > 0.02) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 1.3;
      const r = 21 + (1 - burst) * 4;
      const px = Math.cos(a) * r;
      const py = 2 + Math.sin(a) * (r * 0.88);
      ctx.save();
      ctx.globalAlpha = burst * 0.8;
      ctx.fillStyle = "#fff3b0";
      ctx.beginPath();
      ctx.arc(px, py, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  instr_lute: animLute,
  instr_drum: animDrum,
  instr_flute: animFlute,
  instr_horn: animHorn,
  instr_fiddle: animFiddle,
  instr_bell: animBell,
  instr_pan_flute: animPanFlute,
  instr_tambourine: animTambourine,
};
