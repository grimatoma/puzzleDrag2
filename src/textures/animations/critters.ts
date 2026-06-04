// Animated versions of the procedural critter icons.
// Each fn redraws the COMPLETE icon at time `t` (seconds). Pure, deterministic,
// looping motion driven by Math.sin/cos. Matches colors/shapes of the static
// icons in ../categories/critters.ts, but alive.

function shadow(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function animBee(ctx: CanvasRenderingContext2D, t: number) {
  // Whole bee hovers: gentle bob + tiny side drift.
  const bob = Math.sin(t * 3.0) * 2.2;
  const drift = Math.sin(t * 1.3) * 2.0;
  // Wings flap fast — width scales with a fast sin.
  const flap = 0.45 + Math.abs(Math.sin(t * 22)) * 0.75;

  // Shadow tracks horizontal drift, shrinks slightly as bee rises.
  ctx.save();
  ctx.translate(drift, 0);
  shadow(ctx, 14 - bob * 0.4);
  ctx.restore();

  ctx.save();
  ctx.translate(drift, bob);
  ctx.rotate(0.12 + Math.sin(t * 1.3) * 0.04);

  // Wings — translucent, behind the body, flapping.
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(-2, -6);
    ctx.scale(side * flap, 1);
    const wing = ctx.createLinearGradient(0, -8, 10, 0);
    wing.addColorStop(0, "rgba(230,245,255,0.7)");
    wing.addColorStop(1, "rgba(180,210,235,0.4)");
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(4, -12, 16, -14, 18, -6);
    ctx.bezierCurveTo(18, -1, 8, 2, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,150,180,0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(120,150,180,0.4)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.quadraticCurveTo(10, -8, 16, -6);
    ctx.stroke();
    ctx.restore();
  });

  // Body — fuzzy oval
  const body = ctx.createRadialGradient(-4, -2, 2, 0, 4, 16);
  body.addColorStop(0, "#ffe082");
  body.addColorStop(0.6, "#f5b400");
  body.addColorStop(1, "#a06a00");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2606";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Stripes (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 10, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#2a1c04";
  [-2, 6].forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, 4, 2.6, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Fuzz tufts
  ctx.strokeStyle = "rgba(255,240,180,0.6)";
  ctx.lineWidth = 0.8;
  for (let i = -10; i <= 10; i += 2) {
    ctx.beginPath();
    ctx.moveTo(i, -5);
    ctx.lineTo(i + 0.5, -7.5);
    ctx.stroke();
  }

  // Stinger
  ctx.fillStyle = "#2a1c04";
  ctx.beginPath();
  ctx.moveTo(12, 4);
  ctx.lineTo(17, 4);
  ctx.lineTo(12, 7);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = "#2a1c04";
  ctx.beginPath();
  ctx.arc(-12, 1, 5, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-13, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-13.4, 0.3, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Antennae — slight twitch
  const ant = Math.sin(t * 6) * 0.8;
  ctx.strokeStyle = "#2a1c04";
  ctx.lineWidth = 1.2;
  [-1.4, -3].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(-15, -2);
    ctx.quadraticCurveTo(-19, -7 + d, -20, -8 + d - ant);
    ctx.stroke();
  });
  ctx.fillStyle = "#2a1c04";
  ([[-20, -16], [-21, -11]] as Array<[number, number]>).forEach(([ax, ay]) => {
    ctx.beginPath();
    ctx.arc(ax, ay - ant, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function animButterfly(ctx: CanvasRenderingContext2D, t: number) {
  // Gentle vertical float; wings open/close with smooth sin.
  const float = Math.sin(t * 1.8) * 3.0;
  // Flap: 0.25 (nearly closed) .. 1.0 (fully open).
  const flap = 0.25 + (Math.sin(t * 6.0) * 0.5 + 0.5) * 0.75;
  const antBob = Math.sin(t * 4.0) * 1.4;

  shadow(ctx, 16);

  ctx.save();
  ctx.translate(0, float);

  // Symmetric wings — horizontal scale = flap (open/close).
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.scale(side * flap, 1);
    // Upper wing
    const upper = ctx.createRadialGradient(8, -6, 2, 12, -4, 18);
    upper.addColorStop(0, "rgba(255,150,60,0.85)");
    upper.addColorStop(0.6, "rgba(230,90,30,0.7)");
    upper.addColorStop(1, "rgba(140,40,10,0.55)");
    ctx.fillStyle = upper;
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.bezierCurveTo(8, -22, 24, -20, 22, -6);
    ctx.bezierCurveTo(20, 0, 8, 2, 2, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a1808";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Lower wing
    const lower = ctx.createRadialGradient(8, 8, 2, 10, 10, 14);
    lower.addColorStop(0, "rgba(255,200,90,0.85)");
    lower.addColorStop(0.7, "rgba(220,120,40,0.7)");
    lower.addColorStop(1, "rgba(120,50,10,0.55)");
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.bezierCurveTo(8, 18, 20, 18, 18, 8);
    ctx.bezierCurveTo(14, 2, 6, 0, 2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a1808";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Spots
    ctx.fillStyle = "rgba(40,18,8,0.75)";
    ctx.beginPath(); ctx.arc(14, -8, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 9, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,250,220,0.85)";
    ctx.beginPath(); ctx.arc(14, -8, 1, 0, Math.PI * 2); ctx.fill();
    // Edge highlight
    ctx.strokeStyle = "rgba(255,240,200,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, -16);
    ctx.quadraticCurveTo(18, -16, 20, -8);
    ctx.stroke();
    ctx.restore();
  });

  // Body
  const body = ctx.createLinearGradient(0, -10, 0, 14);
  body.addColorStop(0, "#5a4628");
  body.addColorStop(1, "#1c1408");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 2, 2.4, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Segments
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 0.7;
  for (let y = -6; y <= 10; y += 3) {
    ctx.beginPath();
    ctx.moveTo(-2, y);
    ctx.lineTo(2, y);
    ctx.stroke();
  }
  // Head
  ctx.fillStyle = "#1c1408";
  ctx.beginPath();
  ctx.arc(0, -11, 2.6, 0, Math.PI * 2);
  ctx.fill();
  // Antennae — bob the tips.
  ctx.strokeStyle = "#1c1408";
  ctx.lineWidth = 1.1;
  [-1, 1].forEach((side) => {
    const tx = side * 8;
    const ty = -22 + antBob;
    ctx.beginPath();
    ctx.moveTo(side * 1, -12);
    ctx.quadraticCurveTo(side * 6, -20 + antBob * 0.5, tx, ty);
    ctx.stroke();
    ctx.fillStyle = "#1c1408";
    ctx.beginPath();
    ctx.arc(tx, ty, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function animLadybug(ctx: CanvasRenderingContext2D, t: number) {
  // Slight walk wobble; shell occasionally opens a touch; antennae twitch.
  const wobble = Math.sin(t * 5.0) * 0.05;
  const stepBob = Math.abs(Math.sin(t * 5.0)) * 0.8;
  // Shell opening: mostly closed, a quick periodic "lift".
  const openCycle = Math.max(0, Math.sin(t * 0.9)) ** 6;
  const open = openCycle * 0.5; // radians of half-shell rotation
  const antTwitch = Math.sin(t * 9.0);

  shadow(ctx, 14);

  ctx.save();
  ctx.rotate(wobble);
  ctx.translate(0, -stepBob);

  // Head
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(0, -8, 6, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#fff8e0";
  [-2.4, 2.4].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, -10, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#0a0e04";
  [-2.4, 2.4].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, -10, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Antennae twitch
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 1.2;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 2, -12);
    ctx.lineTo(side * (4 + antTwitch), -16);
    ctx.stroke();
    ctx.fillStyle = "#1a1208";
    ctx.beginPath();
    ctx.arc(side * (4 + antTwitch), -16, 1, 0, Math.PI * 2);
    ctx.fill();
  });

  // Legs — alternate slightly with step.
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  ([[-13, 0], [-14, 8], [13, 0], [14, 8]] as Array<[number, number]>).forEach(([lx, ly], i) => {
    const swing = Math.sin(t * 5.0 + i * 1.6) * 1.4;
    ctx.beginPath();
    ctx.moveTo(lx < 0 ? -10 : 10, ly - 2);
    ctx.lineTo(lx + swing, ly);
    ctx.stroke();
  });

  // Glow of inner wings when shell opens.
  if (open > 0.02) {
    ctx.fillStyle = `rgba(40,40,60,${0.5 * openCycle})`;
    ctx.beginPath();
    ctx.ellipse(0, 4, 12, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Domed red shell — two halves that can split open.
  const drawHalf = (sign: number) => {
    ctx.save();
    // Pivot around the center seam, rotate outward when opening.
    ctx.translate(0, 4);
    ctx.rotate(sign * open);
    ctx.translate(0, -4);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.arc(0, 4, 14, sign > 0 ? -Math.PI / 2 : Math.PI / 2, sign > 0 ? Math.PI / 2 : (3 * Math.PI) / 2, false);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const shell = ctx.createRadialGradient(-4, -2, 2, 0, 4, 18);
    shell.addColorStop(0, "#ff6a5a");
    shell.addColorStop(0.6, "#d81818");
    shell.addColorStop(1, "#7a0808");
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(0, 4, 14, 0, Math.PI * 2);
    ctx.fill();
    // Spots on this half
    ctx.fillStyle = "#1a0808";
    ([[-7, -1, 3], [7, -1, 3], [-6, 9, 2.6], [6, 9, 2.6], [0, 14, 2.4]] as Array<[number, number, number]>).forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    ctx.strokeStyle = "#3a0408";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };
  drawHalf(-1);
  drawHalf(1);

  // Center seam
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(0, 18);
  ctx.stroke();

  // Glossy highlight
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, -2, 3, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animSnail(ctx: CanvasRenderingContext2D, t: number) {
  // Body inches forward with squash/stretch; eye stalks sway; shell shimmer.
  const phase = t * 1.5;
  const creep = Math.sin(phase) * 1.6;          // forward (-x) glide
  const squash = 1 + Math.sin(phase * 2) * 0.06; // body stretch along x
  const stalkSway = Math.sin(t * 2.2) * 1.2;
  const shimmer = Math.sin(t * 3.0) * 0.5 + 0.5;

  shadow(ctx, 18);

  ctx.save();
  ctx.translate(-creep - 1.6, 0);

  // Body / foot — squash/stretch around its midpoint.
  ctx.save();
  ctx.scale(squash, 2 - squash);
  const foot = ctx.createLinearGradient(0, 6, 0, 18);
  foot.addColorStop(0, "#f0d8a8");
  foot.addColorStop(1, "#b89060");
  ctx.fillStyle = foot;
  ctx.beginPath();
  ctx.moveTo(-20, 16);
  ctx.bezierCurveTo(-22, 8, -16, 4, -10, 6);
  ctx.bezierCurveTo(-2, 8, 10, 10, 18, 10);
  ctx.bezierCurveTo(22, 12, 22, 16, 16, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // Head
  ctx.fillStyle = "#f0d8a8";
  ctx.beginPath();
  ctx.ellipse(-18, 9, 6, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Eye stalks — sway.
  ctx.strokeStyle = "#c8a878";
  ctx.lineWidth = 2;
  const stalks: Array<[number, number]> = [[-20, -2], [-16, -4]];
  stalks.forEach(([tx, ty], i) => {
    const sway = stalkSway * (i === 0 ? 1 : 0.7);
    ctx.beginPath();
    ctx.moveTo(-18, 6);
    ctx.quadraticCurveTo(tx + 1, ty + 5, tx + sway, ty);
    ctx.stroke();
  });
  stalks.forEach(([tx, ty], i) => {
    const sway = stalkSway * (i === 0 ? 1 : 0.7);
    ctx.fillStyle = "#2a1808";
    ctx.beginPath();
    ctx.arc(tx + sway, ty, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8e0";
    ctx.beginPath();
    ctx.arc(tx + sway - 0.5, ty - 0.5, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Spiral shell
  const shell = ctx.createRadialGradient(4, -2, 2, 4, 0, 16);
  shell.addColorStop(0, "#e8a85a");
  shell.addColorStop(0.6, "#a86828");
  shell.addColorStop(1, "#5a3410");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.arc(4, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Spiral swirl
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let first = true;
  for (let a = 0; a <= Math.PI * 4; a += 0.2) {
    const r = 1.5 + a * 1.7;
    const sx = 4 + Math.cos(a) * r;
    const sy = 0 + Math.sin(a) * r;
    if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  // Shell shimmer highlight — travels/brightens.
  ctx.fillStyle = `rgba(255,240,200,${0.3 + shimmer * 0.4})`;
  ctx.beginPath();
  ctx.ellipse(-1 + shimmer * 2, -6, 3, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animDragonfly(ctx: CanvasRenderingContext2D, t: number) {
  // Hovers/darts slightly; four wings shimmer/blur with fast offset phases.
  const dartX = Math.sin(t * 1.7) * 2.6;
  const dartY = Math.sin(t * 2.3 + 1.0) * 1.8;

  shadow(ctx, 12);

  ctx.save();
  ctx.translate(dartX, dartY);
  ctx.rotate(-0.15 + Math.sin(t * 1.7) * 0.03);

  // Four narrow translucent wings, each with its own fast phase.
  const wingDefs: Array<[number, number, number, number]> = [
    [-1, -2, 0.1, 0.0],   // upper-left
    [1, -2, 0.1, 1.6],    // upper-right
    [-1, 2, -0.1, 3.1],   // lower-left
    [1, 2, -0.1, 4.7],    // lower-right
  ];
  wingDefs.forEach(([side, oy, tilt, ph]) => {
    const beat = Math.sin(t * 26 + ph);
    const wTilt = tilt + beat * 0.18;       // flutter
    const alpha = 0.45 + (beat * 0.5 + 0.5) * 0.4; // shimmer/blur look
    ctx.save();
    ctx.translate(0, oy);
    ctx.scale(side, 1);
    ctx.rotate(wTilt);
    const wing = ctx.createLinearGradient(0, 0, 22, 0);
    wing.addColorStop(0, `rgba(200,240,255,${0.6 * alpha + 0.2})`);
    wing.addColorStop(1, `rgba(150,220,235,${0.35 * alpha + 0.1})`);
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(8, -4, 20, -3, 23, -1);
    ctx.bezierCurveTo(20, 1, 8, 2, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(90,160,180,0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.strokeStyle = "rgba(90,160,180,0.4)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(20, -1);
    ctx.stroke();
    ctx.restore();
  });

  // Long slender body
  const body = ctx.createLinearGradient(-10, 0, 16, 0);
  body.addColorStop(0, "#3aa8c8");
  body.addColorStop(0.5, "#1a7a98");
  body.addColorStop(1, "#0a3a4a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(4, 0, 16, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#062430";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Segments
  ctx.strokeStyle = "rgba(6,36,48,0.7)";
  ctx.lineWidth = 0.7;
  for (let x = -6; x <= 16; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, -2.5);
    ctx.lineTo(x, 2.5);
    ctx.stroke();
  }
  // Iridescent highlight
  ctx.strokeStyle = "rgba(200,255,255,0.5)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-6, -1.5);
  ctx.lineTo(16, -1.5);
  ctx.stroke();
  // Head & eyes
  ctx.fillStyle = "#1a7a98";
  ctx.beginPath();
  ctx.arc(-12, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2ad0e8";
  ([[-13, -2], [-13, 2]] as Array<[number, number]>).forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#0a3a4a";
  ([[-13, -2], [-13, 2]] as Array<[number, number]>).forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex - 0.6, ey, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function animFirefly(ctx: CanvasRenderingContext2D, t: number) {
  // Abdomen glow breathes in/out; slow drifting bob; wings flicker.
  const bobY = Math.sin(t * 1.6) * 2.4;
  const driftX = Math.sin(t * 1.0) * 2.0;
  const pulse = Math.sin(t * 2.4) * 0.5 + 0.5; // 0..1 breathing
  const flick = 0.5 + Math.abs(Math.sin(t * 18)) * 0.5;

  ctx.save();
  ctx.translate(driftX, bobY);

  // Glow around abdomen — radius & opacity breathe.
  const glowR = 14 + pulse * 8;
  const glow = ctx.createRadialGradient(8, 6, 1, 8, 6, glowR);
  glow.addColorStop(0, `rgba(220,255,140,${0.55 + pulse * 0.4})`);
  glow.addColorStop(0.4, `rgba(180,240,90,${0.25 + pulse * 0.3})`);
  glow.addColorStop(1, "rgba(160,230,60,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(8, 6, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Wings — flicker via opacity + slight spread.
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(-2, -2);
    ctx.scale(1, side * flick);
    const wing = ctx.createLinearGradient(0, 0, 10, 6);
    wing.addColorStop(0, `rgba(230,235,210,${0.5 * flick})`);
    wing.addColorStop(1, `rgba(180,190,160,${0.3 * flick})`);
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(6, 2, 12, 8, 10, 12);
    ctx.bezierCurveTo(6, 10, 2, 6, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,130,100,0.5)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
  });

  // Glowing abdomen — brightens with pulse.
  const ab = ctx.createRadialGradient(7, 5, 1, 8, 6, 8);
  ab.addColorStop(0, "#f4ffb0");
  ab.addColorStop(0.6, pulse > 0.5 ? "#d8ff70" : "#c8f060");
  ab.addColorStop(1, "#8ac828");
  ctx.fillStyle = ab;
  ctx.beginPath();
  ctx.ellipse(9, 6, 8, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6a9818";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Thorax
  const thorax = ctx.createRadialGradient(-4, -2, 1, -3, 0, 8);
  thorax.addColorStop(0, "#5a4628");
  thorax.addColorStop(1, "#2a1c08");
  ctx.fillStyle = thorax;
  ctx.beginPath();
  ctx.ellipse(-3, 0, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Head
  ctx.fillStyle = "#1a1004";
  ctx.beginPath();
  ctx.arc(-11, -1, 4, 0, Math.PI * 2);
  ctx.fill();
  // Red pronotum spot
  ctx.fillStyle = "#d83a18";
  ctx.beginPath();
  ctx.arc(-8, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-12, -2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-12.3, -1.8, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Antennae
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1;
  [-3, -5].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.quadraticCurveTo(-18, d, -20, d - 1);
    ctx.stroke();
  });
  ctx.restore();
}

function animAnt(ctx: CanvasRenderingContext2D, t: number) {
  // Legs scuttle (alternating tripod); antennae wiggle; body advances slightly.
  const advance = Math.sin(t * 4.0) * 1.2;
  const bob = Math.abs(Math.sin(t * 8.0)) * 0.6;
  const antWiggle = Math.sin(t * 7.0);

  shadow(ctx, 16);

  ctx.save();
  ctx.rotate(0.05);
  ctx.translate(-advance, -bob);

  // Six legs — alternating tripod gait via phase by index parity.
  ctx.strokeStyle = "#2a1008";
  ctx.lineWidth = 1.6;
  const legs: Array<[number, number, number, number]> = [
    [-2, 2, -10, 12], [-2, 2, -8, 14],
    [2, 2, 2, 14], [2, 2, 6, 13],
    [4, 2, 12, 12], [4, 2, 14, 14],
  ];
  legs.forEach(([x1, y1, x2, y2], i) => {
    const tripod = (i % 2 === 0) ? t * 8.0 : t * 8.0 + Math.PI;
    const swing = Math.sin(tripod) * 2.4;
    const lift = Math.max(0, Math.cos(tripod)) * 1.4;
    const ex = x2 + swing;
    const ey = y2 - lift;
    const mx = (x1 + ex) / 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, y1 - 3, ex, ey);
    ctx.stroke();
  });

  // Abdomen
  const ab = ctx.createRadialGradient(10, 0, 1, 11, 2, 11);
  ab.addColorStop(0, "#8a3018");
  ab.addColorStop(0.6, "#5a1808");
  ab.addColorStop(1, "#2a0804");
  ctx.fillStyle = ab;
  ctx.beginPath();
  ctx.ellipse(11, 2, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Thorax
  ctx.fillStyle = "#3a1808";
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Head
  ctx.fillStyle = "#2a1008";
  ctx.beginPath();
  ctx.arc(-10, -1, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-12, -2, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-12.4, -1.7, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Mandibles
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.4;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(-15, -1);
    ctx.quadraticCurveTo(-18, -1 + side * 2, -17, -1 + side * 4);
    ctx.stroke();
  });
  // Antennae — bent, wiggling.
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.2;
  [-1, 1].forEach((side) => {
    const w = antWiggle * 1.6;
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-16, -9 + side * 2);
    ctx.lineTo(-19 + w, -10 + side * 3 - Math.abs(w) * 0.4);
    ctx.stroke();
  });
  // Highlight
  ctx.fillStyle = "rgba(255,180,140,0.4)";
  ctx.beginPath();
  ctx.ellipse(8, -2, 2.4, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animCaterpillar(ctx: CanvasRenderingContext2D, t: number) {
  // Inchworm motion: segments compress/expand in a traveling wave; legs ripple.
  const segsBase: Array<[number, number, number]> = [
    [16, 4, 6],
    [10, 2, 7],
    [3, 1, 7.5],
    [-4, 0, 8],
    [-11, -2, 8],
  ];
  const k = 0.9;          // wave spatial offset per segment index
  const speed = 4.0;      // wave temporal speed
  const amp = 1.6;        // vertical hump amplitude
  const xAmp = 1.4;       // horizontal compress amplitude

  // Compute animated positions: traveling wave from tail (i=0) to head.
  const segs: Array<[number, number, number]> = segsBase.map(([cx, cy, r], i) => {
    const wave = Math.sin(t * speed - i * k);
    const ny = cy - Math.max(0, wave) * amp;          // hump lifts up
    const nx = cx - Math.sin(t * speed - i * k) * xAmp * 0.4 * (i / segsBase.length);
    return [nx, ny, r];
  });

  shadow(ctx, 20);

  // Little legs — ripple with the wave.
  ctx.strokeStyle = "#2a5410";
  ctx.lineWidth = 1.8;
  segs.forEach(([cx, cy, r], i) => {
    const ripple = Math.sin(t * speed - i * k);
    const legLen = 3 + ripple * 1.2;
    [-2, 2].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + r - 2);
      ctx.lineTo(cx + dx, cy + r + legLen);
      ctx.stroke();
    });
  });

  // Segment bodies (back to front, head last on top).
  segs.forEach(([cx, cy, r], i) => {
    const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r);
    if (i === segs.length - 1) {
      g.addColorStop(0, "#bfe87a");
      g.addColorStop(0.6, "#7ab83a");
      g.addColorStop(1, "#3a6814");
    } else {
      g.addColorStop(0, "#a8e068");
      g.addColorStop(0.6, "#6aa830");
      g.addColorStop(1, "#2e5410");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1f3a08";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "rgba(230,255,180,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx - 1, cy - r * 0.5, r * 0.4, r * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Head detail follows the animated head segment.
  const [hx, hy] = [segs[segs.length - 1][0], segs[segs.length - 1][1]];
  const antBob = Math.sin(t * speed) * 0.8;
  // Antennae
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 1.4;
  [-2.5, 2.5].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(hx + dx, hy - 6);
    ctx.lineTo(hx + dx * 1.4, hy - 11 - antBob);
    ctx.stroke();
    ctx.fillStyle = "#d83a18";
    ctx.beginPath();
    ctx.arc(hx + dx * 1.4, hy - 11 - antBob, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Eyes
  ctx.fillStyle = "#fff8e0";
  [-3, 2].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(hx + dx, hy - 1, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#0a0e04";
  [-3, 2].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(hx + dx - 0.3, hy - 0.8, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  // Smile
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(hx - 0.5, hy + 2, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Rosy cheek
  ctx.fillStyle = "rgba(240,120,120,0.45)";
  ctx.beginPath();
  ctx.arc(hx - 4, hy + 2, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  bug_bee: animBee,
  bug_butterfly: animButterfly,
  bug_ladybug: animLadybug,
  bug_snail: animSnail,
  bug_dragonfly: animDragonfly,
  bug_firefly: animFirefly,
  bug_ant: animAnt,
  bug_caterpillar: animCaterpillar,
};
