// Animated drinks & beverages — same look as src/textures/categories/drinks.ts, but alive.
// Each fn redraws the WHOLE icon at time `t` (seconds). Loops are seamless via modulo / sin.
// Pure, self-contained, no imports.

// Shared steam helper: one rising, wavy, fading wisp that loops seamlessly.
// `phase` in [0,1) offsets the loop; `baseX` is the column the wisp rises in.
function steamWisp(
  ctx: CanvasRenderingContext2D,
  t: number,
  baseX: number,
  topY: number,
  bottomY: number,
  sway: number,
  alpha: number,
  speed: number,
  phase: number,
): void {
  const p = ((t * speed + phase) % 1 + 1) % 1; // 0..1 loop
  const h = bottomY - topY;
  // Fade in at birth, fade out near the top — keeps the loop seamless.
  const fade = Math.sin(p * Math.PI); // 0 at p=0 and p=1, 1 at middle
  const a = alpha * fade;
  if (a <= 0.01) return;
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  const segs = 8;
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    // y rises over time: the wisp travels upward as p increases.
    const y = bottomY - f * h - p * h * 0.5;
    if (y < topY - 2) break;
    const wobble = Math.sin(f * Math.PI * 2 + t * 2.4 + phase * 6) * sway * f;
    const x = baseX + wobble;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineCap = "butt";
}

function animCoffee(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 19, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Steam — two rising wisps that fade and loop seamlessly
  steamWisp(ctx, t, -5, -22, -6, 4, 0.5, 0.45, 0);
  steamWisp(ctx, t, 6, -22, -6, 4, 0.45, 0.42, 0.5);
  // Saucer
  ctx.fillStyle = "#eef0f4";
  ctx.beginPath();
  ctx.ellipse(0, 17, 19, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a8acb8";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#d6dae2";
  ctx.beginPath();
  ctx.ellipse(0, 16.5, 9, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cup body
  const cup = ctx.createLinearGradient(-13, 0, 13, 0);
  cup.addColorStop(0, "#ffffff");
  cup.addColorStop(0.5, "#f0f2f6");
  cup.addColorStop(1, "#c4c8d2");
  ctx.fillStyle = cup;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.bezierCurveTo(-13, 12, -10, 16, 0, 16);
  ctx.bezierCurveTo(10, 16, 13, 12, 13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a7e8a";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Handle
  ctx.strokeStyle = "#9a9eaa";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(14, 2, 5.5, -1.1, 1.1);
  ctx.stroke();
  ctx.strokeStyle = "#7a7e8a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(14, 2, 7, -1.1, 1.1);
  ctx.arc(14, 2, 4, 1.1, -1.1, true);
  ctx.stroke();
  // Coffee surface
  const surf = ctx.createRadialGradient(-3, -6, 1, 0, -4, 14);
  surf.addColorStop(0, "#7a4a26");
  surf.addColorStop(0.6, "#4a2810");
  surf.addColorStop(1, "#2a1508");
  ctx.fillStyle = surf;
  ctx.beginPath();
  ctx.ellipse(0, -4, 12, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1508";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Crema sheen on surface — shimmers (drifts + breathes)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -4, 11.5, 3.4, 0, 0, Math.PI * 2);
  ctx.clip();
  const shimX = -3 + Math.sin(t * 1.6) * 2.5;
  const shimA = 0.4 + Math.sin(t * 2.2) * 0.14;
  ctx.fillStyle = `rgba(200,150,90,${shimA})`;
  ctx.beginPath();
  ctx.ellipse(shimX, -5, 5, 1.6, -0.2 + Math.sin(t) * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Cup specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -1);
  ctx.bezierCurveTo(-10, 5, -9, 10, -6, 13);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function animTea(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 19, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Steam
  steamWisp(ctx, t, -3, -22, -6, 4, 0.42, 0.4, 0);
  // Saucer
  ctx.fillStyle = "#f3ede2";
  ctx.beginPath();
  ctx.ellipse(0, 17, 19, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c0b49a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#e2d8c4";
  ctx.beginPath();
  ctx.ellipse(0, 16.5, 9, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cup body
  const cup = ctx.createLinearGradient(-13, 0, 13, 0);
  cup.addColorStop(0, "#fffaf0");
  cup.addColorStop(0.5, "#f4ecdc");
  cup.addColorStop(1, "#cbbfa6");
  ctx.fillStyle = cup;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.bezierCurveTo(-13, 12, -10, 16, 0, 16);
  ctx.bezierCurveTo(10, 16, 13, 12, 13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a8c70";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Handle
  ctx.strokeStyle = "#bcaa88";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(14, 2, 5.5, -1.1, 1.1);
  ctx.stroke();
  // Amber tea surface
  const surf = ctx.createRadialGradient(-3, -6, 1, 0, -4, 14);
  surf.addColorStop(0, "#e6a040");
  surf.addColorStop(0.6, "#bf6e1c");
  surf.addColorStop(1, "#8a4810");
  ctx.fillStyle = surf;
  ctx.beginPath();
  ctx.ellipse(0, -4, 12, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a3e0e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // tea surface sheen — shimmer
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -4, 11.5, 3.4, 0, 0, Math.PI * 2);
  ctx.clip();
  const teaShimX = -3 + Math.sin(t * 1.5) * 2.2;
  ctx.fillStyle = `rgba(255,225,160,${0.45 + Math.sin(t * 2) * 0.12})`;
  ctx.beginPath();
  ctx.ellipse(teaShimX, -5, 5, 1.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Tea-bag string + tag sway gently
  const sway = Math.sin(t * 1.8) * 1.6;
  ctx.strokeStyle = "#d8cab0";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(9, -5);
  ctx.bezierCurveTo(13, -2, 15 + sway * 0.5, 3, 15 + sway, 6);
  ctx.stroke();
  // Tea-bag paper tag (sways with the string)
  ctx.save();
  ctx.translate(13 + sway, 6);
  ctx.rotate(sway * 0.05);
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(6, 0);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c0a868";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(150,110,40,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(1.5, 3);
  ctx.lineTo(4.5, 3);
  ctx.stroke();
  ctx.restore();
  // Cup specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -1);
  ctx.bezierCurveTo(-10, 5, -9, 10, -6, 13);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function animBeer(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Mug glass body
  const glass = ctx.createLinearGradient(-12, 0, 12, 0);
  glass.addColorStop(0, "rgba(235,245,250,0.45)");
  glass.addColorStop(0.5, "rgba(210,228,235,0.2)");
  glass.addColorStop(1, "rgba(180,205,215,0.4)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(12, -10);
  ctx.closePath();
  ctx.fill();
  // Beer fill (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(12, -10);
  ctx.closePath();
  ctx.clip();
  const beer = ctx.createLinearGradient(0, -8, 0, 20);
  beer.addColorStop(0, "#ffcf4a");
  beer.addColorStop(0.5, "#f0a012");
  beer.addColorStop(1, "#c87808");
  ctx.fillStyle = beer;
  ctx.fillRect(-13, -8, 26, 30);
  // rising bubbles — loop upward and pop near the surface (-8)
  ctx.fillStyle = "rgba(255,245,200,0.7)";
  const beerBubbles: Array<[number, number, number]> = [
    [-6, 1.2, 0.0], [-2, 0.9, 0.3], [3, 1.1, 0.6], [7, 1.0, 0.15],
    [0, 1.3, 0.8], [-8, 0.8, 0.45], [5, 1.0, 0.9], [-4, 0.9, 0.55],
  ];
  const bottomB = 18;
  const topB = -7;
  beerBubbles.forEach(([bx, br, phase]) => {
    const p = ((t * 0.4 + phase) % 1 + 1) % 1;
    const y = bottomB - p * (bottomB - topB);
    const a = 0.7 * Math.min(1, (1 - p) * 3); // fade as it pops at top
    const wob = Math.sin(t * 3 + phase * 8) * 0.8;
    ctx.fillStyle = `rgba(255,245,200,${a})`;
    ctx.beginPath();
    ctx.arc(bx + wob, y, br, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Foamy head — subtle settle/shift (slow vertical breathe)
  const foamY = Math.sin(t * 1.1) * 0.6;
  ctx.save();
  ctx.translate(0, foamY);
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.bezierCurveTo(-13, -14, -8, -15, -6, -12);
  ctx.bezierCurveTo(-4, -17, 2, -16, 3, -12);
  ctx.bezierCurveTo(6, -16, 12, -14, 12, -8);
  ctx.bezierCurveTo(8, -6, -8, -6, -12, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e0d4b8";
  ctx.lineWidth = 1;
  ctx.stroke();
  // foam bubble texture — gentle individual jitter
  const foamBubbles: Array<[number, number, number, number]> = [
    [-8, -10, 1.6, 0], [-2, -12, 2, 1.4], [4, -11, 1.6, 2.6], [9, -9, 1.4, 3.8],
  ];
  foamBubbles.forEach(([fx, fy, fr, ph]) => {
    const jr = fr + Math.sin(t * 2.5 + ph) * 0.18;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(fx, fy + Math.sin(t * 1.7 + ph) * 0.4, jr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Glass outline + rim
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(12, -10);
  ctx.stroke();
  // Handle
  ctx.strokeStyle = "#9ab0bc";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(13, 4, 6.5, -1.0, 1.0);
  ctx.stroke();
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(13, 4, 8.2, -1.0, 1.0);
  ctx.arc(13, 4, 4.8, 1.0, -1.0, true);
  ctx.stroke();
  // Specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.bezierCurveTo(-10, 4, -10, 11, -8, 16);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function animJuice(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Straw (behind glass top, leaning)
  ctx.save();
  ctx.strokeStyle = "#e85a8a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(5, -18);
  ctx.lineTo(-1, 8);
  ctx.stroke();
  // straw glint — a bright highlight that sweeps down the straw and loops
  const glintP = ((t * 0.5) % 1 + 1) % 1;
  const gx = 5 + (-1 - 5) * glintP;
  const gy = -18 + (8 - -18) * glintP;
  ctx.strokeStyle = "#fff0f5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(5, -18);
  ctx.lineTo(-1, 8);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${0.85 * Math.sin(glintP * Math.PI)})`;
  ctx.beginPath();
  ctx.arc(gx, gy, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
  ctx.restore();
  // Tall glass body (slightly tapered)
  const glass = ctx.createLinearGradient(-10, 0, 10, 0);
  glass.addColorStop(0, "rgba(235,245,250,0.5)");
  glass.addColorStop(0.5, "rgba(210,228,235,0.25)");
  glass.addColorStop(1, "rgba(180,205,215,0.45)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(9, -12);
  ctx.closePath();
  ctx.fill();
  // Juice fill (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(9, -12);
  ctx.closePath();
  ctx.clip();
  const juice = ctx.createLinearGradient(0, -8, 0, 20);
  juice.addColorStop(0, "#ffb02e");
  juice.addColorStop(0.5, "#ff8a14");
  juice.addColorStop(1, "#e06808");
  ctx.fillStyle = juice;
  ctx.fillRect(-12, -8, 24, 30);
  // rising bubbles
  const juiceBubbles: Array<[number, number, number]> = [
    [-5, 0.9, 0.1], [3, 1.0, 0.5], [-1, 0.8, 0.75], [6, 0.9, 0.3],
  ];
  juiceBubbles.forEach(([bx, br, phase]) => {
    const p = ((t * 0.45 + phase) % 1 + 1) % 1;
    const y = 16 - p * 24;
    const a = 0.7 * Math.min(1, (1 - p) * 3);
    ctx.fillStyle = `rgba(255,235,190,${a})`;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 3 + phase * 7) * 0.7, y, br, 0, Math.PI * 2);
    ctx.fill();
  });
  // surface ripple — wavy lighter band that bobs
  const surfY = -8 + Math.sin(t * 2) * 0.5;
  ctx.fillStyle = "#ffc658";
  ctx.beginPath();
  ctx.ellipse(0, surfY, 9.4 + Math.sin(t * 2.4) * 0.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Glass outline
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(9, -12);
  ctx.stroke();
  // Glass rim
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -12, 9, 2.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.bezierCurveTo(-8, 2, -8, 10, -7, 16);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Orange slice on the rim — subtle bob/tilt
  ctx.save();
  ctx.translate(-9, -12 + Math.sin(t * 1.6) * 0.5);
  ctx.rotate(-0.3 + Math.sin(t * 1.3) * 0.04);
  // peel
  ctx.fillStyle = "#ff9420";
  ctx.beginPath();
  ctx.arc(0, 0, 7, -0.2, Math.PI + 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c86010";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // flesh
  ctx.fillStyle = "#ffd070";
  ctx.beginPath();
  ctx.arc(0, 0, 5.4, -0.1, Math.PI + 0.1);
  ctx.closePath();
  ctx.fill();
  // segments
  ctx.strokeStyle = "rgba(255,160,40,0.8)";
  ctx.lineWidth = 0.8;
  for (let a = 0; a <= 5; a++) {
    const ang = (a / 5) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * 5.2, Math.sin(ang) * 5.2);
    ctx.stroke();
  }
  ctx.restore();
}

function animSmoothie(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Straw (behind, leaning)
  ctx.save();
  ctx.strokeStyle = "#34c0c0";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(6, -22);
  ctx.lineTo(-2, 6);
  ctx.stroke();
  ctx.strokeStyle = "#e0fafa";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, -22);
  ctx.lineTo(-2, 6);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
  // Glass body (curvy tumbler)
  const glass = ctx.createLinearGradient(-11, 0, 11, 0);
  glass.addColorStop(0, "rgba(235,245,250,0.4)");
  glass.addColorStop(0.5, "rgba(210,228,235,0.18)");
  glass.addColorStop(1, "rgba(180,205,215,0.4)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.bezierCurveTo(-12, 0, -11, 10, -10, 16);
  ctx.bezierCurveTo(-10, 21, 10, 21, 10, 16);
  ctx.bezierCurveTo(11, 10, 12, 0, 10, -10);
  ctx.closePath();
  ctx.fill();
  // Smoothie fill (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.bezierCurveTo(-12, 0, -11, 10, -10, 16);
  ctx.bezierCurveTo(-10, 21, 10, 21, 10, 16);
  ctx.bezierCurveTo(11, 10, 12, 0, 10, -10);
  ctx.closePath();
  ctx.clip();
  const sm = ctx.createLinearGradient(0, -8, 0, 20);
  sm.addColorStop(0, "#ff8ab8");
  sm.addColorStop(0.5, "#e8487e");
  sm.addColorStop(1, "#b8245a");
  ctx.fillStyle = sm;
  ctx.fillRect(-13, -8, 26, 30);
  // thick bubbles surfacing slowly
  const smBubbles: Array<[number, number, number]> = [
    [-5, 1.6, 0.0], [4, 1.9, 0.4], [-1, 1.4, 0.7], [7, 1.5, 0.2],
  ];
  smBubbles.forEach(([bx, br, phase]) => {
    const p = ((t * 0.22 + phase) % 1 + 1) % 1; // slow
    const y = 16 - p * 24;
    const a = 0.5 * Math.min(1, (1 - p) * 3);
    ctx.fillStyle = `rgba(255,200,225,${a})`;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 1.6 + phase * 6) * 0.6, y, br, 0, Math.PI * 2);
    ctx.fill();
  });
  // surface ellipse
  ctx.fillStyle = "#ffa8cc";
  ctx.beginPath();
  ctx.ellipse(0, -8 + Math.sin(t * 1.4) * 0.4, 9.6, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // berry seed flecks
  ctx.fillStyle = "rgba(120,16,50,0.6)";
  for (let i = 0; i < 9; i++) {
    const fx = -8 + (i * 2) + Math.sin(i * 2.1 + t * 0.6) * 2;
    const fy = 0 + Math.cos(i * 1.7 + t * 0.5) * 9;
    ctx.beginPath();
    ctx.arc(fx, fy, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Glass outline + rim
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.bezierCurveTo(-12, 0, -11, 10, -10, 16);
  ctx.bezierCurveTo(-10, 21, 10, 21, 10, 16);
  ctx.bezierCurveTo(11, 10, 12, 0, 10, -10);
  ctx.stroke();
  // Dollop / swirl of cream on top — jiggles (squash & stretch)
  const jig = 1 + Math.sin(t * 3.2) * 0.06;
  ctx.save();
  ctx.translate(0, -9);
  ctx.scale(1 / jig, jig);
  ctx.translate(0, 9);
  ctx.fillStyle = "#fff4f8";
  ctx.beginPath();
  ctx.moveTo(-7, -9);
  ctx.bezierCurveTo(-8, -14, -2, -14, -2, -10);
  ctx.bezierCurveTo(-1, -16, 6, -15, 5, -10);
  ctx.bezierCurveTo(8, -12, 9, -8, 6, -8);
  ctx.bezierCurveTo(2, -7, -4, -7, -7, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e8d4dc";
  ctx.lineWidth = 1;
  ctx.stroke();
  // dollop highlight
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-1, -12, 2, 1.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // sparkle near the dollop — twinkles
  const spA = Math.max(0, Math.sin(t * 2.6));
  if (spA > 0.02) {
    const sr = 1.4 + spA * 1.4;
    ctx.strokeStyle = `rgba(255,255,255,${spA})`;
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(7, -14 - sr);
    ctx.lineTo(7, -14 + sr);
    ctx.moveTo(7 - sr, -14);
    ctx.lineTo(7 + sr, -14);
    ctx.stroke();
    ctx.lineCap = "butt";
  }
  // Glass rim line
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, -10, 10, 2.4, 0, Math.PI, 0);
  ctx.stroke();
  // Specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.bezierCurveTo(-9, 2, -9, 10, -7, 15);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function animWater(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Glass body (tapered tumbler)
  const glass = ctx.createLinearGradient(-11, 0, 11, 0);
  glass.addColorStop(0, "rgba(225,240,248,0.55)");
  glass.addColorStop(0.5, "rgba(200,225,235,0.25)");
  glass.addColorStop(1, "rgba(175,205,218,0.5)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.fill();
  // Water fill (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.clip();
  const water = ctx.createLinearGradient(0, -8, 0, 20);
  water.addColorStop(0, "rgba(150,210,235,0.7)");
  water.addColorStop(0.5, "rgba(90,175,215,0.7)");
  water.addColorStop(1, "rgba(50,140,190,0.8)");
  ctx.fillStyle = water;
  ctx.fillRect(-13, -8, 26, 30);
  // surface ellipse — gentle ripple
  ctx.fillStyle = "rgba(190,230,245,0.8)";
  ctx.beginPath();
  ctx.ellipse(0, -8 + Math.sin(t * 1.8) * 0.4, 9.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ice cubes — bob and clink (each rocks slightly, with own phase)
  const ice: Array<[number, number, number, number]> = [
    [-4, -2, 0.2, 0.0], [5, 2, -0.3, 1.6], [-1, 7, 0.1, 3.0],
  ];
  ice.forEach(([ix, iy, rot, ph]) => {
    ctx.save();
    ctx.translate(ix + Math.sin(t * 1.4 + ph) * 0.7, iy + Math.sin(t * 1.9 + ph) * 0.8);
    ctx.rotate(rot + Math.sin(t * 1.6 + ph) * 0.08);
    ctx.fillStyle = "rgba(235,248,255,0.65)";
    ctx.beginPath();
    ctx.rect(-4, -4, 8, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // ice inner highlight
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.lineTo(-2, 2);
    ctx.lineTo(3, 2);
    ctx.stroke();
    ctx.restore();
  });
  // small rising bubbles
  const waterBubbles: Array<[number, number, number]> = [
    [7, 1.0, 0.0], [-6, 0.9, 0.5], [2, 0.7, 0.8],
  ];
  waterBubbles.forEach(([bx, br, phase]) => {
    const p = ((t * 0.5 + phase) % 1 + 1) % 1;
    const y = 16 - p * 24;
    const a = 0.7 * Math.min(1, (1 - p) * 3);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 3 + phase * 7) * 0.5, y, br, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Glass outline + rim
  ctx.strokeStyle = "#7a9aa8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(10, -14);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -14, 10, 2.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Specular streak — base
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.bezierCurveTo(-9, 0, -9, 9, -8, 16);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Clean glint sweeping across the glass and looping
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-12, 16);
  ctx.bezierCurveTo(-12, 21, 12, 21, 12, 16);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.clip();
  const sweepP = ((t * 0.35) % 1 + 1) % 1;
  const sx = -14 + sweepP * 30;
  const sweepA = 0.5 * Math.sin(sweepP * Math.PI);
  ctx.strokeStyle = `rgba(255,255,255,${sweepA})`;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, -14);
  ctx.lineTo(sx - 6, 18);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
}

function animWine(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.strokeStyle = "rgba(200,215,222,0.85)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, 18);
  ctx.stroke();
  // Foot / base
  ctx.fillStyle = "rgba(220,232,238,0.85)";
  ctx.beginPath();
  ctx.ellipse(0, 19, 9, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9ab0bc";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Bowl glass
  const glass = ctx.createLinearGradient(-12, 0, 12, 0);
  glass.addColorStop(0, "rgba(235,245,250,0.5)");
  glass.addColorStop(0.5, "rgba(210,228,235,0.22)");
  glass.addColorStop(1, "rgba(180,205,215,0.45)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-12, -16);
  ctx.bezierCurveTo(-12, -2, -8, 4, 0, 4);
  ctx.bezierCurveTo(8, 4, 12, -2, 12, -16);
  ctx.closePath();
  ctx.fill();
  // Wine fill (clipped to lower bowl)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, -16);
  ctx.bezierCurveTo(-12, -2, -8, 4, 0, 4);
  ctx.bezierCurveTo(8, 4, 12, -2, 12, -16);
  ctx.closePath();
  ctx.clip();
  const wine = ctx.createLinearGradient(0, -8, 0, 6);
  wine.addColorStop(0, "#a01838");
  wine.addColorStop(0.6, "#6e0e26");
  wine.addColorStop(1, "#3a0414");
  ctx.fillStyle = wine;
  ctx.fillRect(-13, -8, 26, 16);
  // surface swirl/slosh — the wine line tilts and bobs gently
  const tilt = Math.sin(t * 1.3) * 0.12;
  const bob = Math.sin(t * 1.3) * 1.0;
  ctx.fillStyle = "#c42848";
  ctx.beginPath();
  ctx.ellipse(0, -8 + Math.cos(t * 1.3) * 0.4, 10, 2.4, tilt, 0, Math.PI * 2);
  ctx.fill();
  // a brighter swirl highlight drifting on the surface
  ctx.fillStyle = "rgba(220,80,110,0.5)";
  ctx.beginPath();
  ctx.ellipse(Math.sin(t * 1.3) * 3, -8, 3.5, 1.2, tilt, 0, Math.PI * 2);
  ctx.fill();
  // subtle slosh tint on the higher side of the bowl
  ctx.fillStyle = "rgba(160,24,56,0.35)";
  ctx.beginPath();
  ctx.ellipse(bob * 2, -6, 6, 2, tilt, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Glass outline + rim
  ctx.strokeStyle = "#7a96a2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -16);
  ctx.bezierCurveTo(-12, -2, -8, 4, 0, 4);
  ctx.bezierCurveTo(8, 4, 12, -2, 12, -16);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -16, 12, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Glossy sheen on bowl — base
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.bezierCurveTo(-9, -6, -8, -1, -5, 2);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Specular sheen sweeping the bowl and looping
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, -16);
  ctx.bezierCurveTo(-12, -2, -8, 4, 0, 4);
  ctx.bezierCurveTo(8, 4, 12, -2, 12, -16);
  ctx.closePath();
  ctx.clip();
  const sheenP = ((t * 0.3) % 1 + 1) % 1;
  const shx = -12 + sheenP * 24;
  const sheenA = 0.45 * Math.sin(sheenP * Math.PI);
  ctx.strokeStyle = `rgba(255,255,255,${sheenA})`;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(shx, -16);
  ctx.lineTo(shx - 4, 4);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
}

function animMilk(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bottle body — rounded shoulders, narrow neck
  const body = ctx.createLinearGradient(-11, 0, 11, 0);
  body.addColorStop(0, "rgba(235,245,250,0.92)");
  body.addColorStop(0.5, "rgba(210,228,235,0.6)");
  body.addColorStop(1, "rgba(170,195,205,0.8)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.lineTo(-4, -12);
  ctx.bezierCurveTo(-11, -8, -11, -4, -11, 0);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(11, 0);
  ctx.bezierCurveTo(11, -4, 11, -8, 4, -12);
  ctx.lineTo(4, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a6a72";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Milk fill (clipped to body)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(11, 0);
  ctx.closePath();
  ctx.clip();
  const milk = ctx.createLinearGradient(0, -4, 0, 20);
  milk.addColorStop(0, "#ffffff");
  milk.addColorStop(0.5, "#fbf8f2");
  milk.addColorStop(1, "#ede6d8");
  ctx.fillStyle = milk;
  ctx.fillRect(-12, -4, 24, 26);
  // milk surface ellipse — very gentle shimmer
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(0, -4 + Math.sin(t * 1.2) * 0.3, 11, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // faint drifting sheen on the milk
  ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(t * 1.5) * 0.12})`;
  ctx.beginPath();
  ctx.ellipse(Math.sin(t * 1.1) * 2, -3, 4, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Glass specular streak — base
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -6);
  ctx.bezierCurveTo(-9, 2, -9, 10, -7, 16);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Soft glint sweeping the bottle and looping
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.lineTo(-4, -12);
  ctx.bezierCurveTo(-11, -8, -11, -4, -11, 0);
  ctx.lineTo(-11, 16);
  ctx.bezierCurveTo(-11, 21, 11, 21, 11, 16);
  ctx.lineTo(11, 0);
  ctx.bezierCurveTo(11, -4, 11, -8, 4, -12);
  ctx.lineTo(4, -18);
  ctx.closePath();
  ctx.clip();
  const glintP = ((t * 0.28) % 1 + 1) % 1;
  const gx = -11 + glintP * 22;
  const glintA = 0.4 * Math.sin(glintP * Math.PI);
  ctx.strokeStyle = `rgba(255,255,255,${glintA})`;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(gx, -16);
  ctx.lineTo(gx - 3, 18);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
  // Neck collar
  ctx.fillStyle = "#dde6ea";
  ctx.beginPath();
  ctx.rect(-4.5, -13, 9, 2);
  ctx.fill();
  ctx.strokeStyle = "#5a6a72";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Red-and-white checked cap
  const capW = 5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-capW, -22, capW * 2, 5);
  ctx.clip();
  ctx.fillStyle = "#f4ece0";
  ctx.fillRect(-capW, -22, capW * 2, 5);
  ctx.fillStyle = "#d8344a";
  for (let cx = -capW; cx < capW; cx += 2.5) {
    for (let cy = -22; cy < -17; cy += 2.5) {
      if (Math.round((cx + cy) / 2.5) % 2 === 0) {
        ctx.fillRect(cx, cy, 2.5, 2.5);
      }
    }
  }
  ctx.restore();
  // Cap rounded top
  ctx.fillStyle = "#d8344a";
  ctx.beginPath();
  ctx.ellipse(0, -22, capW, 1.8, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = "#8a1a2a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(-capW, -22, capW * 2, 5);
  ctx.stroke();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  drink_coffee: animCoffee,
  drink_tea: animTea,
  drink_beer: animBeer,
  drink_juice: animJuice,
  drink_smoothie: animSmoothie,
  drink_water: animWater,
  drink_wine: animWine,
  drink_milk: animMilk,
};
