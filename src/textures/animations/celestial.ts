// Animated celestial / astral / night-sky icons.
//
// Self-contained Canvas-2D animation fns (no imports / no shared exports).
// Each fn redraws the COMPLETE icon at time `t` (elapsed seconds), centered at
// origin (0,0) within a roughly -24..+24 box. The caller handles clear / save /
// translate / scale / lineCap / restore. Motion is derived purely from `t` and
// from indices (no Math.random) so frames are deterministic, and loops are made
// seamless via Math.sin/cos and modulo.

const TAU = Math.PI * 2;

function animSun(ctx: CanvasRenderingContext2D, t: number): void {
  // Corona breathes: radius + alpha pulse.
  const breathe = Math.sin(t * 1.4); // -1..1
  const coronaR = 24 + breathe * 2.2;
  const coronaA = 0.85 + breathe * 0.12;
  const corona = ctx.createRadialGradient(0, 0, 6, 0, 0, coronaR);
  corona.addColorStop(0, `rgba(255,220,120,${coronaA.toFixed(3)})`);
  corona.addColorStop(0.5, "rgba(255,170,50,0.35)");
  corona.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, coronaR, 0, TAU);
  ctx.fill();

  // Rays — slowly rotate and shimmer (per-ray length flicker).
  const spin = t * 0.18;
  ctx.lineCap = "round";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + spin;
    const long = i % 2 === 0;
    const shimmer = Math.sin(t * 2.6 + i * 1.3); // -1..1
    const r1 = 13;
    const r2 = (long ? 23 : 18) + shimmer * 1.6;
    const glow = 0.8 + shimmer * 0.2;
    ctx.strokeStyle = long
      ? `rgba(255,207,58,${glow.toFixed(3)})`
      : `rgba(255,168,32,${glow.toFixed(3)})`;
    ctx.lineWidth = long ? 2.4 : 1.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // Sun disc — warm radial gradient.
  const disc = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13);
  disc.addColorStop(0, "#fff6c8");
  disc.addColorStop(0.5, "#ffd84a");
  disc.addColorStop(0.85, "#f59a18");
  disc.addColorStop(1, "#d2700c");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b85c08";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Inner glow rim — brightness breathes with the corona.
  ctx.strokeStyle = `rgba(255,250,210,${(0.65 + breathe * 0.12).toFixed(3)})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 9, Math.PI * 0.55, Math.PI * 1.4);
  ctx.stroke();

  // Specular highlight.
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-4, -5, 3, 4, -0.4, 0, TAU);
  ctx.fill();
}

function animFullMoon(ctx: CanvasRenderingContext2D, t: number): void {
  // Soft halo breathes (radius + alpha) — the moon itself stays put.
  const breathe = Math.sin(t * 1.1);
  const haloR = 24 + breathe * 1.8;
  const haloA = 0.55 + breathe * 0.12;
  const halo = ctx.createRadialGradient(0, 0, 13, 0, 0, haloR);
  halo.addColorStop(0, `rgba(220,230,255,${haloA.toFixed(3)})`);
  halo.addColorStop(0.6, "rgba(180,200,250,0.22)");
  halo.addColorStop(1, "rgba(180,200,250,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, TAU);
  ctx.fill();

  // Moon disc — pale silver gradient.
  const disc = ctx.createRadialGradient(-5, -5, 3, 0, 0, 16);
  disc.addColorStop(0, "#ffffff");
  disc.addColorStop(0.5, "#eef2fb");
  disc.addColorStop(0.85, "#cdd6e8");
  disc.addColorStop(1, "#9aa6c0");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8a96b2";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Surface content — clipped to disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, TAU);
  ctx.clip();

  // Craters.
  const craters: Array<[number, number, number]> = [
    [-5, -6, 4], [6, -2, 3], [-2, 7, 3.5], [9, 7, 2.2], [-9, 3, 2], [3, -9, 1.8],
  ];
  craters.forEach(([cx, cy, r]) => {
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0.5, cx, cy, r);
    g.addColorStop(0, "rgba(150,160,185,0.7)");
    g.addColorStop(0.7, "rgba(120,132,160,0.6)");
    g.addColorStop(1, "rgba(120,132,160,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.2, Math.PI * 0.9);
    ctx.stroke();
  });

  // Faint shimmer band drifting across the surface (seamless wrap over 30 units).
  const span = 30;
  const drift = ((t * 4) % span) - span / 2; // -15..+15 looping
  const sg = ctx.createLinearGradient(drift - 8, 0, drift + 8, 0);
  sg.addColorStop(0, "rgba(255,255,255,0)");
  sg.addColorStop(0.5, "rgba(255,255,255,0.18)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(-16, -16, 32, 32);
  ctx.restore();

  // Crescent highlight rim.
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 12.5, Math.PI * 0.6, Math.PI * 1.35);
  ctx.stroke();
}

function animRingedPlanet(ctx: CanvasRenderingContext2D, t: number): void {
  const shimmer = Math.sin(t * 2.2);

  ctx.save();
  ctx.rotate(-0.32);

  // Back half of the ring (behind the planet) — shimmer in alpha.
  ctx.strokeStyle = `rgba(210,180,130,${(0.5 + shimmer * 0.12).toFixed(3)})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 8, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(170,140,100,${(0.4 + shimmer * 0.1).toFixed(3)})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 6.5, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Planet disc — warm banded gradient.
  const disc = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13);
  disc.addColorStop(0, "#ffe6b0");
  disc.addColorStop(0.5, "#e8b65a");
  disc.addColorStop(0.85, "#bd8030");
  disc.addColorStop(1, "#7a4c12");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#6a4010";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Atmospheric bands — drift horizontally (rotation illusion), clipped to disc.
  const bandDrift = Math.sin(t * 0.6) * 3;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = "rgba(120,76,18,0.45)";
  ctx.lineWidth = 1.6;
  [-6, -1.5, 3, 7.5].forEach((y, i) => {
    const dx = bandDrift * (i % 2 === 0 ? 1 : -1);
    ctx.beginPath();
    ctx.moveTo(-14 + dx, y);
    ctx.bezierCurveTo(-4 + dx, y - 1.5, 4 + dx, y + 1.5, 14 + dx, y);
    ctx.stroke();
  });
  ctx.strokeStyle = "rgba(255,238,190,0.4)";
  ctx.lineWidth = 1;
  [-8, 0.5, 5].forEach((y, i) => {
    const dx = bandDrift * (i % 2 === 0 ? -1 : 1);
    ctx.beginPath();
    ctx.moveTo(-14 + dx, y);
    ctx.bezierCurveTo(-4 + dx, y - 1, 4 + dx, y + 1, 14 + dx, y);
    ctx.stroke();
  });
  ctx.restore();

  // Specular highlight.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-5, -5, 2.4, 3.4, -0.4, 0, TAU);
  ctx.fill();

  // Front half of the ring (over the planet).
  ctx.strokeStyle = `rgba(245,222,170,${(0.92 - shimmer * 0.1).toFixed(3)})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 8, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = `rgba(200,165,110,${(0.85 - shimmer * 0.1).toFixed(3)})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 6.5, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  // Small moon orbits the planet (elliptical to read as depth).
  const orbit = t * 0.7;
  const mx = Math.cos(orbit) * 19;
  const my = Math.sin(orbit) * 11 - 2;
  const moonGlow = ctx.createRadialGradient(mx, my, 1, mx, my, 7);
  moonGlow.addColorStop(0, "rgba(230,238,255,0.8)");
  moonGlow.addColorStop(1, "rgba(200,215,255,0)");
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(mx, my, 7, 0, TAU);
  ctx.fill();
  const moon = ctx.createRadialGradient(mx - 1, my - 1, 0.5, mx, my, 4);
  moon.addColorStop(0, "#ffffff");
  moon.addColorStop(0.7, "#dfe6f4");
  moon.addColorStop(1, "#b3bdd6");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(mx, my, 3.6, 0, TAU);
  ctx.fill();
}

function animShootingStar(ctx: CanvasRenderingContext2D, t: number): void {
  // The star streaks diagonally (lower-left -> upper-right) and loops seamlessly.
  // Travel direction unit vector points up-right (matches the static art).
  const dirX = 0.7071;
  const dirY = -0.7071;
  // Loop progress 0..1 along a diagonal path; offset distance along travel axis.
  const period = 2.4;
  const phase = (t % period) / period; // 0..1
  // Sweep from one side to the other, centered so it crosses the box.
  const travel = (phase - 0.5) * 64; // -32..+32 along travel direction
  const headX = dirX * travel + 3;
  const headY = dirY * travel - 3;

  // Trail flows behind the head (opposite the travel direction).
  const tailLen = 34;
  const tailX = headX - dirX * tailLen;
  const tailY = headY - dirY * tailLen;

  // Fade the whole streak in/out near the loop seam so the wrap is invisible.
  const edgeFade = Math.sin(phase * Math.PI); // 0 at seams, 1 mid-pass
  const fade = Math.min(1, edgeFade * 2.2);

  ctx.save();
  ctx.globalAlpha = fade;

  // Flowing, flickering trail — tapering wedge from head to tail.
  const trail = ctx.createLinearGradient(headX, headY, tailX, tailY);
  const flick = 0.85 + Math.sin(t * 9) * 0.1;
  trail.addColorStop(0, `rgba(255,245,200,${flick.toFixed(3)})`);
  trail.addColorStop(0.4, "rgba(255,210,120,0.5)");
  trail.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = trail;
  const nx = -dirY; // unit normal to travel direction
  const ny = dirX;
  const hw = 4.5;
  ctx.beginPath();
  ctx.moveTo(headX + nx * hw, headY + ny * hw);
  ctx.lineTo(headX - nx * hw, headY - ny * hw);
  ctx.lineTo(tailX, tailY);
  ctx.closePath();
  ctx.fill();

  // Outer glow around the head.
  const glowR = 15 + Math.sin(t * 7) * 1.5;
  const glow = ctx.createRadialGradient(headX, headY, 2, headX, headY, glowR);
  glow.addColorStop(0, "rgba(255,250,210,0.9)");
  glow.addColorStop(0.5, "rgba(255,210,110,0.4)");
  glow.addColorStop(1, "rgba(255,210,110,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(headX, headY, glowR, 0, TAU);
  ctx.fill();

  // Bright 4-point star head.
  const drawStar4 = (sx: number, sy: number, r: number, inner: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU - Math.PI / 2;
      ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      const a2 = a + Math.PI / 4;
      ctx.lineTo(sx + Math.cos(a2) * r * inner, sy + Math.sin(a2) * r * inner);
    }
    ctx.closePath();
    ctx.fill();
  };
  const twinkle = 1 + Math.sin(t * 8) * 0.12;
  drawStar4(headX, headY, 10 * twinkle, 0.32, "#fff2bf");
  drawStar4(headX, headY, 6 * twinkle, 0.4, "#ffffff");
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(headX, headY, 2.4, 0, TAU);
  ctx.fill();

  // Sparkles scattered along the trail — staggered flicker.
  const spark = (dist: number, off: number, baseR: number, ph: number) => {
    const sx = headX - dirX * dist + nx * off;
    const sy = headY - dirY * dist + ny * off;
    const tw = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 6 + ph));
    const r = baseR * (0.6 + tw * 0.5);
    ctx.fillStyle = `rgba(255,248,220,${(0.9 * tw).toFixed(3)})`;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU - Math.PI / 2;
      ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      const a2 = a + Math.PI / 4;
      ctx.lineTo(sx + Math.cos(a2) * r * 0.35, sy + Math.sin(a2) * r * 0.35);
    }
    ctx.closePath();
    ctx.fill();
  };
  spark(13, 2, 2.6, 0);
  spark(22, -2.5, 2, 1.7);
  spark(30, 1.5, 1.4, 3.3);
  spark(7, -3, 1.6, 4.9);

  ctx.restore();
}

function animConstellation(ctx: CanvasRenderingContext2D, t: number): void {
  // Deep-blue field backdrop.
  const field = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
  field.addColorStop(0, "rgba(40,60,120,0.55)");
  field.addColorStop(0.7, "rgba(20,30,70,0.4)");
  field.addColorStop(1, "rgba(12,18,44,0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, TAU);
  ctx.fill();

  // Faint background dust stars — gentle staggered twinkle.
  const dust: Array<[number, number]> = [
    [-19, -8], [17, -16], [-15, 14], [20, 10], [2, -20], [-8, 19], [14, 18],
  ];
  dust.forEach(([x, y], i) => {
    const a = 0.5 * (0.55 + 0.45 * Math.sin(t * 3 + i * 2.1));
    ctx.fillStyle = `rgba(200,215,255,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.7, 0, TAU);
    ctx.fill();
  });

  // Constellation nodes.
  const nodes: Array<[number, number, number]> = [
    [-14, 8, 3.4],
    [-4, -2, 2.8],
    [6, -12, 4],
    [13, 0, 3],
    [4, 12, 3.2],
  ];

  // Connecting lines — faint pulse in alpha.
  const linePulse = 0.55 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.8));
  ctx.strokeStyle = `rgba(170,200,255,${linePulse.toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  nodes.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nodes[1][0], nodes[1][1]);
  ctx.lineTo(nodes[4][0], nodes[4][1]);
  ctx.stroke();

  // Star nodes — twinkle at staggered phases (scale + glow).
  const drawNode = (sx: number, sy: number, r: number, idx: number) => {
    const tw = 0.5 + 0.5 * Math.sin(t * 3.2 + idx * 1.7); // 0..1
    const scale = 0.8 + tw * 0.4;
    const rr = r * scale;
    const glowR = rr * 2.2;
    const glow = ctx.createRadialGradient(sx, sy, 0.5, sx, sy, glowR);
    glow.addColorStop(0, `rgba(220,235,255,${(0.55 + tw * 0.4).toFixed(3)})`);
    glow.addColorStop(1, "rgba(160,195,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, glowR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU - Math.PI / 2;
      ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
      const a2 = a + Math.PI / 4;
      ctx.lineTo(sx + Math.cos(a2) * rr * 0.36, sy + Math.sin(a2) * rr * 0.36);
    }
    ctx.closePath();
    ctx.fill();
  };
  nodes.forEach(([x, y, r], i) => drawNode(x, y, r, i));
}

function animGalaxy(ctx: CanvasRenderingContext2D, t: number): void {
  // Deep space backdrop.
  const field = ctx.createRadialGradient(0, 0, 3, 0, 0, 24);
  field.addColorStop(0, "rgba(60,40,110,0.6)");
  field.addColorStop(0.6, "rgba(28,20,60,0.45)");
  field.addColorStop(1, "rgba(14,10,34,0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, TAU);
  ctx.fill();

  // Whole spiral slowly rotates.
  ctx.save();
  ctx.rotate(t * 0.25);

  const arm = (phase: number, rPart: number, gPart: number, bPart: number) => {
    let idx = 0;
    for (let s = 0.15; s < 1; s += 0.045) {
      const a = phase + s * Math.PI * 2.4;
      const rad = 3 + s * 19;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad * 0.62; // flattened disc
      const size = 1.6 * (1 - s) + 0.5;
      const baseAlpha = 0.85 * (1 - s * 0.5);
      // Arm stars twinkle at staggered phases.
      const tw = 0.7 + 0.3 * Math.sin(t * 4 + idx * 0.9);
      const alpha = baseAlpha * tw;
      ctx.fillStyle = `rgba(${rPart},${gPart},${bPart},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
      if (Math.sin(s * 30) > 0.6) {
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.6, 0, TAU);
        ctx.fill();
      }
      idx++;
    }
  };
  arm(0, 170, 200, 255);
  arm(Math.PI, 220, 180, 255);
  ctx.restore();

  // Core pulses.
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.0); // 0..1
  const coreScale = 1 + pulse * 0.12;
  const coreGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, 11 * coreScale);
  coreGlow.addColorStop(0, `rgba(255,250,230,${(0.85 + pulse * 0.12).toFixed(3)})`);
  coreGlow.addColorStop(0.4, "rgba(255,225,170,0.7)");
  coreGlow.addColorStop(1, "rgba(255,210,150,0)");
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11 * coreScale, 7 * coreScale, 0, 0, TAU);
  ctx.fill();
  const core = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 5);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.6, "#fff0c8");
  core.addColorStop(1, "#ffcf80");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5 * coreScale, 3.4 * coreScale, 0, 0, TAU);
  ctx.fill();
}

function animNorthStar(ctx: CanvasRenderingContext2D, t: number): void {
  // Central star pulses/twinkles: glow + ray length breathe.
  const breathe = Math.sin(t * 1.6); // -1..1
  const twinkle = 0.5 + 0.5 * Math.sin(t * 3.4); // 0..1

  // Radiant glow — breathes.
  const glowA = 0.85 + breathe * 0.12;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  glow.addColorStop(0, `rgba(225,240,255,${glowA.toFixed(3)})`);
  glow.addColorStop(0.4, "rgba(150,200,255,0.5)");
  glow.addColorStop(1, "rgba(120,180,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, TAU);
  ctx.fill();

  const drawPointStar = (r: number, innerRatio: number, longRatio: number, fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU - Math.PI / 2;
      const tip = i % 2 === 0 ? r : r * longRatio;
      ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
      const a2 = a + Math.PI / 8;
      ctx.lineTo(Math.cos(a2) * r * innerRatio, Math.sin(a2) * r * innerRatio);
    }
    ctx.closePath();
    ctx.fill();
  };

  // Outer spikes — ray length breathes.
  drawPointStar(22 + breathe * 1.8, 0.16, 0.5, "#cfe6ff");

  // Bright white core star.
  const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.6, "#eaf3ff");
  grad.addColorStop(1, "#a8cdff");
  drawPointStar(14 + breathe * 1.0, 0.22, 0.55, grad);

  // Rotating sparkle glints — small bright spikes that spin around the star.
  const spin = t * 0.9;
  for (let i = 0; i < 4; i++) {
    const a = spin + i * (Math.PI / 2);
    const dist = 16;
    const gx = Math.cos(a) * dist;
    const gy = Math.sin(a) * dist;
    const gr = 2.2 + Math.sin(t * 5 + i) * 0.8;
    const g = ctx.createRadialGradient(gx, gy, 0.3, gx, gy, gr * 1.6);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(1, "rgba(200,225,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(gx, gy, gr * 1.6, 0, TAU);
    ctx.fill();
  }

  // Brilliant center — twinkles.
  const cr = 5 * (0.85 + twinkle * 0.3);
  const core = ctx.createRadialGradient(0, 0, 0.5, 0, 0, cr);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, cr, 0, TAU);
  ctx.fill();
}

function animEclipse(ctx: CanvasRenderingContext2D, t: number): void {
  // Glow pulses.
  const pulse = Math.sin(t * 1.5); // -1..1

  // Wide outer corona glow.
  const coronaR = 24 + pulse * 1.5;
  const corona = ctx.createRadialGradient(0, 0, 9, 0, 0, coronaR);
  corona.addColorStop(0, `rgba(255,240,200,${(0.9 + pulse * 0.08).toFixed(3)})`);
  corona.addColorStop(0.35, "rgba(255,200,110,0.6)");
  corona.addColorStop(0.7, "rgba(255,170,80,0.25)");
  corona.addColorStop(1, "rgba(255,170,80,0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, coronaR, 0, TAU);
  ctx.fill();

  // Streaming corona rays flicker (prominences) and slowly rotate.
  ctx.save();
  ctx.lineCap = "round";
  const spin = t * 0.12;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + spin;
    const flare = Math.sin(t * 4 + i * 1.1); // -1..1
    const len = 18 + (i % 3) * 4 + flare * 2.5;
    const g = ctx.createLinearGradient(
      Math.cos(a) * 12, Math.sin(a) * 12,
      Math.cos(a) * len, Math.sin(a) * len,
    );
    g.addColorStop(0, `rgba(255,235,180,${(0.7 + flare * 0.2).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,200,110,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = i % 2 === 0 ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.restore();

  // Blazing inner ring (diamond-ring effect) — flares with the pulse.
  const ring = ctx.createRadialGradient(0, 0, 9.5, 0, 0, 13);
  ring.addColorStop(0, "rgba(255,255,255,0)");
  ring.addColorStop(0.5, `rgba(255,248,210,${(0.9 + pulse * 0.08).toFixed(3)})`);
  ring.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, TAU);
  ctx.fill();

  // Dark moon disc occluding the sun.
  const disc = ctx.createRadialGradient(-3, -3, 2, 0, 0, 12);
  disc.addColorStop(0, "#3a3650");
  disc.addColorStop(0.6, "#211f33");
  disc.addColorStop(1, "#0c0a18");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.fill();

  // Bright rim of light around the disc.
  ctx.strokeStyle = `rgba(255,250,220,${(0.85 + pulse * 0.1).toFixed(3)})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.stroke();

  // Diamond-ring bright spot — travels slowly around the rim.
  const spotA = -Math.PI * 0.3 + Math.sin(t * 0.5) * 0.4;
  const sx = Math.cos(spotA) * 11;
  const sy = Math.sin(spotA) * 11;
  const spotR = 5 + Math.sin(t * 6) * 1;
  const spot = ctx.createRadialGradient(sx, sy, 0.5, sx, sy, spotR);
  spot.addColorStop(0, "#ffffff");
  spot.addColorStop(0.5, "rgba(255,245,200,0.8)");
  spot.addColorStop(1, "rgba(255,230,160,0)");
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.arc(sx, sy, spotR, 0, TAU);
  ctx.fill();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  astral_sun: animSun,
  astral_full_moon: animFullMoon,
  astral_ringed_planet: animRingedPlanet,
  astral_shooting_star: animShootingStar,
  astral_constellation: animConstellation,
  astral_galaxy: animGalaxy,
  astral_north_star: animNorthStar,
  astral_eclipse: animEclipse,
};
