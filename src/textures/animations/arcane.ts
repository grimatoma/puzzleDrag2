// Animated arcane icons. Each function redraws the WHOLE icon at time `t` (seconds).
// Pure, self-contained, no imports. Drawn at origin within a ~-24..+24 box.

// Small deterministic pseudo-random helper derived from an index seed.
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function animCandle(ctx: CanvasRenderingContext2D, t: number): void {
  // Flame sway + height driven by layered sin for an organic flicker.
  const sway = Math.sin(t * 5.3) * 1.4 + Math.sin(t * 9.1) * 0.6;
  const flick = 0.85 + Math.sin(t * 7.0) * 0.1 + Math.sin(t * 13.0) * 0.05;
  const flameTipY = -23 - (flick - 1) * 6; // taller/shorter tip
  const glowPulse = 0.55 + Math.sin(t * 3.0) * 0.18 + (flick - 0.85) * 0.6;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Warm flame glow (pulsing)
  const glow = ctx.createRadialGradient(sway * 0.5, -16, 1, sway * 0.5, -14, 20);
  glow.addColorStop(0, `rgba(255,210,120,${glowPulse})`);
  glow.addColorStop(0.5, "rgba(255,160,60,0.25)");
  glow.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sway * 0.5, -14, 20, 0, Math.PI * 2);
  ctx.fill();

  // Brass holder base
  const base = ctx.createLinearGradient(0, 12, 0, 22);
  base.addColorStop(0, "#e6c24a");
  base.addColorStop(0.5, "#b8902a");
  base.addColorStop(1, "#6a4e12");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-11, 22);
  ctx.bezierCurveTo(-13, 16, -7, 14, -6, 13);
  ctx.lineTo(6, 13);
  ctx.bezierCurveTo(7, 14, 13, 16, 11, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2808";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Holder cup
  ctx.fillStyle = "#caa238";
  ctx.beginPath();
  ctx.moveTo(-6, 13);
  ctx.lineTo(-5, 7);
  ctx.lineTo(5, 7);
  ctx.lineTo(6, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2808";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Brass highlight
  ctx.fillStyle = "rgba(255,245,200,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, 18, 1.4, 3.5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Candle wax body
  const wax = ctx.createLinearGradient(-5, 0, 5, 0);
  wax.addColorStop(0, "#fff6e2");
  wax.addColorStop(0.5, "#f4e2c0");
  wax.addColorStop(1, "#cdb488");
  ctx.fillStyle = wax;
  ctx.beginPath();
  ctx.moveTo(-5, 7);
  ctx.lineTo(-5, -10);
  ctx.bezierCurveTo(-5, -12, 5, -12, 5, -10);
  ctx.lineTo(5, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a8258";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Wax top rim + drip
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, -10, 5, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(-4, 5);
  ctx.stroke();

  // Wick
  ctx.strokeStyle = "#2a2018";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(sway * 0.25, -14);
  ctx.stroke();

  // Rising embers (occasional sparks tracking upward and fading)
  for (let i = 0; i < 4; i++) {
    const phase = (t * 0.6 + i * 0.27 + rand(i + 1) * 0.5) % 1;
    const ex = sway + Math.sin(phase * 6.0 + i) * 2.2 + (rand(i + 7) - 0.5) * 2;
    const ey = -16 - phase * 14;
    const ea = (1 - phase) * 0.8 * Math.max(0, Math.sin(phase * Math.PI));
    ctx.fillStyle = `rgba(255,200,110,${ea.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 0.7 + (1 - phase) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flame (outer) — swaying tip + flickering height
  const cx = sway * 0.4;
  const tipX = sway;
  const flame = ctx.createRadialGradient(cx, -16, 1, cx, -15, 7);
  flame.addColorStop(0, "#fff7d0");
  flame.addColorStop(0.4, "#ffcf60");
  flame.addColorStop(0.8, "#ff8a28");
  flame.addColorStop(1, "rgba(255,100,20,0.2)");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(tipX, flameTipY);
  ctx.bezierCurveTo(-5 + cx, -18, -4 + cx, -11, 0, -10);
  ctx.bezierCurveTo(4 + cx, -11, 5 + cx, -18, tipX, flameTipY);
  ctx.closePath();
  ctx.fill();

  // Flame inner bright core
  ctx.fillStyle = `rgba(255,255,255,${(0.75 + (flick - 0.85) * 1.2).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(cx * 0.6, -14, 1.6, 3.0 + (flick - 0.85) * 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function animPotionRed(ctx: CanvasRenderingContext2D, t: number): void {
  const glowPulse = 0.4 + Math.sin(t * 2.2) * 0.16;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer glow (pulsing)
  const glow = ctx.createRadialGradient(0, 8, 2, 0, 8, 26);
  glow.addColorStop(0, `rgba(255,70,90,${glowPulse})`);
  glow.addColorStop(0.6, "rgba(255,40,60,0.18)");
  glow.addColorStop(1, "rgba(255,40,60,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 8, 26, 0, Math.PI * 2);
  ctx.fill();

  const flask = () => {
    ctx.beginPath();
    ctx.moveTo(-3, -14);
    ctx.lineTo(-3.5, -4);
    ctx.bezierCurveTo(-14, 0, -14, 18, 0, 20);
    ctx.bezierCurveTo(14, 18, 14, 0, 3.5, -4);
    ctx.lineTo(3, -14);
    ctx.closePath();
  };

  // Glass body
  flask();
  ctx.fillStyle = "rgba(210,235,245,0.22)";
  ctx.fill();

  // Liquid (clipped)
  ctx.save();
  flask();
  ctx.clip();
  const liquid = ctx.createRadialGradient(-3, 4, 2, 0, 10, 18);
  liquid.addColorStop(0, "#ff8a8a");
  liquid.addColorStop(0.5, "#e02838");
  liquid.addColorStop(1, "#700818");
  ctx.fillStyle = liquid;
  ctx.beginPath();
  ctx.rect(-15, 0, 30, 24);
  ctx.fill();

  // Liquid surface shimmer (wave offset over time)
  const shimmer = Math.sin(t * 3.1) * 0.8;
  ctx.strokeStyle = "rgba(255,200,200,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-11, 0.5 + shimmer * 0.3);
  ctx.quadraticCurveTo(0, 2.5 + shimmer, 11, 0.5 - shimmer * 0.3);
  ctx.stroke();

  // Rising bubbles that pop at the surface (~y=1)
  ctx.fillStyle = "rgba(255,220,220,0.7)";
  const surfaceY = 1.0;
  for (let i = 0; i < 5; i++) {
    const speed = 0.35 + rand(i + 1) * 0.25;
    const phase = (t * speed + rand(i + 3)) % 1;
    const startY = 17;
    const by = startY - phase * (startY - surfaceY);
    const wob = Math.sin(phase * 8 + i) * 1.3;
    const bx = (rand(i + 5) - 0.5) * 12 + wob;
    const baseR = 0.8 + rand(i + 9) * 0.8;
    // Shrink/pop near surface
    const popZone = 0.85;
    let r = baseR;
    let alpha = 0.7;
    if (phase > popZone) {
      const p = (phase - popZone) / (1 - popZone);
      r = baseR * (1 + p * 0.6);
      alpha = 0.7 * (1 - p);
    }
    if (alpha <= 0.02) continue;
    ctx.fillStyle = `rgba(255,220,220,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Glass outline
  flask();
  ctx.strokeStyle = "#2a3a44";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.bezierCurveTo(-11, 8, -10, 14, -6, 17);
  ctx.stroke();

  // Cork
  const cork = ctx.createLinearGradient(-4, -20, 4, -20);
  cork.addColorStop(0, "#c89858");
  cork.addColorStop(0.5, "#a67838");
  cork.addColorStop(1, "#6a4a1c");
  ctx.fillStyle = cork;
  ctx.beginPath();
  ctx.moveTo(-4, -14);
  ctx.lineTo(-4.5, -21);
  ctx.lineTo(4.5, -21);
  ctx.lineTo(4, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a280c";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Neck band
  ctx.strokeStyle = "#2a3a44";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3.4, -13);
  ctx.lineTo(3.4, -13);
  ctx.stroke();
}

function animPotionBlue(ctx: CanvasRenderingContext2D, t: number): void {
  const glowPulse = 0.4 + Math.sin(t * 2.4 + 1) * 0.16;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 15, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer glow (pulsing)
  const glow = ctx.createRadialGradient(0, 12, 2, 0, 12, 26);
  glow.addColorStop(0, `rgba(80,170,255,${glowPulse})`);
  glow.addColorStop(0.6, "rgba(40,120,255,0.18)");
  glow.addColorStop(1, "rgba(40,120,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 12, 26, 0, Math.PI * 2);
  ctx.fill();

  const flask = () => {
    ctx.beginPath();
    ctx.moveTo(-3.5, -16);
    ctx.lineTo(-3.5, -6);
    ctx.lineTo(-15, 18);
    ctx.bezierCurveTo(-15, 21, -13, 22, -10, 22);
    ctx.lineTo(10, 22);
    ctx.bezierCurveTo(13, 22, 15, 21, 15, 18);
    ctx.lineTo(3.5, -6);
    ctx.lineTo(3.5, -16);
    ctx.closePath();
  };

  // Glass body
  flask();
  ctx.fillStyle = "rgba(210,235,245,0.22)";
  ctx.fill();

  // Liquid (clipped)
  ctx.save();
  flask();
  ctx.clip();
  const liquid = ctx.createRadialGradient(-4, 10, 2, 0, 16, 20);
  liquid.addColorStop(0, "#8ad6ff");
  liquid.addColorStop(0.5, "#2884e0");
  liquid.addColorStop(1, "#0a2c80");
  ctx.fillStyle = liquid;
  ctx.beginPath();
  ctx.rect(-16, 6, 32, 20);
  ctx.fill();

  // Liquid surface highlight (shimmer)
  const shimmer = Math.sin(t * 3.4 + 0.5) * 0.7;
  ctx.strokeStyle = "rgba(200,235,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-9, 6.8 + shimmer * 0.3);
  ctx.quadraticCurveTo(0, 8.6 + shimmer, 9, 6.8 - shimmer * 0.3);
  ctx.stroke();

  // Rising bubbles in the cone (narrowing toward top)
  const surfaceY = 7.5;
  for (let i = 0; i < 6; i++) {
    const speed = 0.32 + rand(i + 2) * 0.28;
    const phase = (t * speed + rand(i + 4)) % 1;
    const startY = 20;
    const by = startY - phase * (startY - surfaceY);
    // Cone narrows toward top, so horizontal range shrinks as bubble rises.
    const widthAtY = 1.5 + (by - surfaceY) * 0.5;
    const wob = Math.sin(phase * 7 + i * 1.3) * 1.2;
    const bx = (rand(i + 6) - 0.5) * widthAtY + wob;
    const baseR = 0.7 + rand(i + 11) * 0.9;
    const popZone = 0.86;
    let r = baseR;
    let alpha = 0.75;
    if (phase > popZone) {
      const p = (phase - popZone) / (1 - popZone);
      r = baseR * (1 + p * 0.6);
      alpha = 0.75 * (1 - p);
    }
    if (alpha <= 0.02) continue;
    ctx.fillStyle = `rgba(220,240,255,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Glass outline
  flask();
  ctx.strokeStyle = "#243846";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 6);
  ctx.bezierCurveTo(-12, 12, -13, 17, -11, 20);
  ctx.stroke();

  // Neck rim
  ctx.strokeStyle = "#243846";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-4.5, -16);
  ctx.lineTo(4.5, -16);
  ctx.stroke();
}

function animCrystalBall(ctx: CanvasRenderingContext2D, t: number): void {
  const auraPulse = 0.5 + Math.sin(t * 1.8) * 0.12;
  const spin = t * 0.5; // slow galaxy rotation

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 16, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ornate stand base
  const base = ctx.createLinearGradient(0, 14, 0, 24);
  base.addColorStop(0, "#caa24a");
  base.addColorStop(1, "#6a4a18");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.lineTo(12, 22);
  ctx.lineTo(8, 16);
  ctx.lineTo(-8, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2608";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Stand claws
  ctx.strokeStyle = "#8a6a22";
  ctx.lineWidth = 2.6;
  [-7, 0, 7].forEach((cx) => {
    ctx.beginPath();
    ctx.moveTo(cx * 0.5, 16);
    ctx.quadraticCurveTo(cx, 12, cx, 6);
    ctx.stroke();
  });

  // Glow behind ball (pulsing aura)
  const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, 22);
  glow.addColorStop(0, `rgba(150,110,255,${auraPulse})`);
  glow.addColorStop(0.6, "rgba(110,80,230,0.2)");
  glow.addColorStop(1, "rgba(110,80,230,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, 22, 0, Math.PI * 2);
  ctx.fill();

  // Glass sphere
  const sphere = ctx.createRadialGradient(-5, -8, 2, 0, -2, 16);
  sphere.addColorStop(0, "#3a2c66");
  sphere.addColorStop(0.7, "#241a4a");
  sphere.addColorStop(1, "#0e0826");
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, Math.PI * 2);
  ctx.fill();

  // Swirling galaxy inside (rotating, clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(180,140,255,0.7)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let u = 0; u < Math.PI * 2.4; u += 0.2) {
      const r = 1.5 + u * 2;
      const a = u + i * 2.1 + spin;
      const px = Math.cos(a) * r;
      const py = -2 + Math.sin(a) * r * 0.7;
      if (u === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Star sparks inside (twinkling, drifting with the swirl)
  const sparks: Array<[number, number, number]> = [
    [-6, -7, 1.2], [5, -5, 1], [2, 2, 1.4], [-4, 3, 0.9], [7, -9, 0.8],
  ];
  sparks.forEach(([sx, sy, sr], i) => {
    // Gently rotate spark positions around center for a living galaxy.
    const ang = spin * 0.6;
    const rx = sx * Math.cos(ang) - (sy + 2) * Math.sin(ang);
    const ry = sx * Math.sin(ang) + (sy + 2) * Math.cos(ang) - 2;
    const tw = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.5 + i * 1.7));
    ctx.fillStyle = `rgba(255,255,255,${(0.85 * tw).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(rx, ry, sr * (0.7 + tw * 0.5), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Sphere outline
  ctx.strokeStyle = "#1a0e3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Specular streak (fixed)
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, -2, 10, Math.PI * 1.1, Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, -9, 2.4, 3.4, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function animRunestone(ctx: CanvasRenderingContext2D, t: number): void {
  // Each rune pulses its glow with its own phase.
  const pulse = (phase: number) => 0.55 + 0.45 * Math.sin(t * 2.4 + phase);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 15, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone tablet
  const stone = ctx.createLinearGradient(0, -20, 0, 22);
  stone.addColorStop(0, "#8a8e96");
  stone.addColorStop(0.5, "#5e636c");
  stone.addColorStop(1, "#3a3e46");
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-11, -19);
  ctx.lineTo(10, -20);
  ctx.lineTo(12, 6);
  ctx.lineTo(9, 21);
  ctx.lineTo(-9, 22);
  ctx.lineTo(-12, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#23262c";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top bevel highlight
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, -17);
  ctx.lineTo(9, -18);
  ctx.stroke();

  // Surface cracks
  ctx.strokeStyle = "rgba(30,32,38,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.lineTo(-3, -6);
  ctx.lineTo(-7, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -8);
  ctx.lineTo(4, 4);
  ctx.stroke();

  // Magical shimmer sweeping across the tablet (diagonal band of light)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-11, -19);
  ctx.lineTo(10, -20);
  ctx.lineTo(12, 6);
  ctx.lineTo(9, 21);
  ctx.lineTo(-9, 22);
  ctx.lineTo(-12, 2);
  ctx.closePath();
  ctx.clip();
  const sweep = ((t * 0.35) % 1) * 60 - 24; // -24..36 travel
  const shimmer = ctx.createLinearGradient(sweep - 10, -20, sweep + 10, 20);
  shimmer.addColorStop(0, "rgba(150,210,255,0)");
  shimmer.addColorStop(0.5, "rgba(170,220,255,0.18)");
  shimmer.addColorStop(1, "rgba(150,210,255,0)");
  ctx.fillStyle = shimmer;
  ctx.fillRect(-13, -21, 27, 45);
  ctx.restore();

  // Glowing rune marks (pulsing brightness via shadowBlur + alpha)
  const drawRune = (phase: number, body: () => void) => {
    const p = pulse(phase);
    ctx.save();
    ctx.shadowColor = `rgba(80,180,255,${(0.9 * p).toFixed(3)})`;
    ctx.shadowBlur = 3 + p * 6;
    ctx.strokeStyle = `rgba(122,208,255,${(0.55 + 0.45 * p).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    body();
    ctx.restore();
  };

  // Rune 1 (arrow-like)
  drawRune(0, () => {
    ctx.beginPath();
    ctx.moveTo(-5, -12);
    ctx.lineTo(-5, 0);
    ctx.moveTo(-5, -8);
    ctx.lineTo(-1, -11);
    ctx.moveTo(-5, -4);
    ctx.lineTo(-1, -1);
    ctx.stroke();
  });
  // Rune 2 (angular)
  drawRune(2.0, () => {
    ctx.beginPath();
    ctx.moveTo(4, -10);
    ctx.lineTo(4, 4);
    ctx.moveTo(4, -10);
    ctx.lineTo(8, -6);
    ctx.lineTo(4, -2);
    ctx.stroke();
  });
  // Rune 3 (cross mark)
  drawRune(4.0, () => {
    ctx.beginPath();
    ctx.moveTo(-3, 8);
    ctx.lineTo(2, 14);
    ctx.moveTo(2, 8);
    ctx.lineTo(-3, 14);
    ctx.stroke();
  });
}

function animMagicDust(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(-2, 23, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Spilled dust glow (gentle pulse)
  const glowPulse = 0.55 + Math.sin(t * 2.6) * 0.14;
  const glow = ctx.createRadialGradient(10, 4, 2, 10, 4, 22);
  glow.addColorStop(0, `rgba(255,220,120,${glowPulse})`);
  glow.addColorStop(0.6, "rgba(255,200,80,0.18)");
  glow.addColorStop(1, "rgba(255,200,80,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(10, 4, 22, 0, Math.PI * 2);
  ctx.fill();

  // Pouch body
  const pouch = ctx.createRadialGradient(-6, 6, 2, -3, 10, 18);
  pouch.addColorStop(0, "#9a7a4a");
  pouch.addColorStop(0.6, "#6a4e26");
  pouch.addColorStop(1, "#3e2c12");
  ctx.fillStyle = pouch;
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.bezierCurveTo(-16, 2, -14, 20, -3, 21);
  ctx.bezierCurveTo(8, 22, 12, 10, 6, 0);
  ctx.bezierCurveTo(2, -5, -4, -7, -9, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#241808";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cloth folds
  ctx.strokeStyle = "rgba(40,28,12,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.quadraticCurveTo(-9, 12, -3, 19);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.quadraticCurveTo(5, 12, 2, 19);
  ctx.stroke();

  // Cloth highlight
  ctx.fillStyle = "rgba(255,235,180,0.25)";
  ctx.beginPath();
  ctx.ellipse(-7, 6, 2, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Drawstring tie + mouth
  ctx.strokeStyle = "#caa24a";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-9, -5);
  ctx.quadraticCurveTo(-1, -8, 6, -1);
  ctx.stroke();
  ctx.fillStyle = "#caa24a";
  ctx.beginPath();
  ctx.arc(-2, -6, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5a10";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Spilling dust stream (static base spill, matches static icon)
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const tt = i / 17;
    const dx = 3 + tt * 14 + Math.sin(i * 2.1) * 2;
    const dy = -3 + tt * tt * 12 - 6 + Math.cos(i * 1.7) * 2;
    const r = 0.6 + (1 - tt) * 1.1;
    ctx.fillStyle = `rgba(255,225,130,${(0.5 + (1 - tt) * 0.5).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Drifting motes rising upward from the pouch mouth
  for (let i = 0; i < 5; i++) {
    const speed = 0.25 + rand(i + 20) * 0.2;
    const phase = (t * speed + rand(i + 30)) % 1;
    const mx = -2 + (rand(i + 40) - 0.5) * 8 + Math.sin(phase * 5 + i) * 2;
    const my = -6 - phase * 14;
    const ma = Math.max(0, Math.sin(phase * Math.PI)) * 0.85;
    if (ma <= 0.02) continue;
    ctx.fillStyle = `rgba(255,235,150,${ma.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(mx, my, 0.8 + (1 - phase) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Twinkling sparkle stars (staggered phases)
  const drawStar = (sx: number, sy: number, s: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff6d0";
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const ax = Math.cos(a);
      const ay = Math.sin(a);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + ax * s, sy + ay * s);
      ctx.lineTo(sx + Math.cos(a + Math.PI / 4) * s * 0.3, sy + Math.sin(a + Math.PI / 4) * s * 0.3);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx, sy, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const stars: Array<[number, number, number, number]> = [
    [14, -4, 4, 0],
    [8, -12, 3, 1.6],
    [18, 4, 2.6, 3.2],
    [20, -8, 2, 4.7],
  ];
  stars.forEach(([sx, sy, sBase, phase]) => {
    const tw = 0.5 + 0.5 * Math.sin(t * 3.0 + phase);
    drawStar(sx, sy, sBase * (0.55 + tw * 0.6), 0.4 + tw * 0.6);
  });
}

function animPentacle(ctx: CanvasRenderingContext2D, t: number): void {
  const spin = t * 0.4; // slow sigil rotation
  const glowPulse = 0.4 + Math.sin(t * 2.0) * 0.12;

  // Outer ambient glow (pulsing)
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
  glow.addColorStop(0, `rgba(150,110,255,${glowPulse})`);
  glow.addColorStop(0.6, "rgba(120,90,240,0.18)");
  glow.addColorStop(1, "rgba(120,90,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();

  // Rotate the whole sigil ring slowly.
  ctx.save();
  ctx.rotate(spin);

  ctx.save();
  ctx.shadowColor = "rgba(160,130,255,0.9)";
  ctx.shadowBlur = 6;
  ctx.strokeStyle = "#b9a0ff";
  ctx.lineWidth = 2;
  // Outer ring
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.stroke();
  // Inner ring
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 14.5, 0, Math.PI * 2);
  ctx.stroke();
  // Five-point star (pentagram)
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    pts.push([Math.cos(a) * 13, Math.sin(a) * 13]);
  }
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  const order = [0, 2, 4, 1, 3];
  order.forEach((idx, k) => {
    const [px, py] = pts[idx];
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Faint inner fill of star
  ctx.save();
  const order2 = [0, 2, 4, 1, 3];
  ctx.beginPath();
  order2.forEach((idx, k) => {
    const a = -Math.PI / 2 + (idx / 5) * Math.PI * 2;
    const px = Math.cos(a) * 13;
    const py = Math.sin(a) * 13;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(150,120,255,0.12)";
  ctx.fill();
  ctx.restore();

  // Rune ticks between rings
  ctx.strokeStyle = "rgba(200,180,255,0.7)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 14.5, Math.sin(a) * 14.5);
    ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
    ctx.stroke();
  }

  // Sparks at star points (twinkling)
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    const px = Math.cos(a) * 13;
    const py = Math.sin(a) * 13;
    const tw = 0.55 + 0.45 * Math.sin(t * 3.2 + i * 1.3);
    ctx.fillStyle = `rgba(255,255,255,${(0.9 * tw).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + tw * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // end sigil rotation

  // Orbiting sparks circling the sigil (counter-orbit for liveliness)
  for (let i = 0; i < 5; i++) {
    const a = -spin * 1.3 + (i / 5) * Math.PI * 2;
    const orbitR = 20 + Math.sin(t * 1.7 + i) * 1.5;
    const sx = Math.cos(a) * orbitR;
    const sy = Math.sin(a) * orbitR;
    const tw = 0.6 + 0.4 * Math.sin(t * 2.5 + i * 2.0);
    ctx.fillStyle = `rgba(200,180,255,${(0.8 * tw).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.8 + tw * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  arcane_candle: animCandle,
  arcane_potion_red: animPotionRed,
  arcane_potion_blue: animPotionBlue,
  arcane_crystal_ball: animCrystalBall,
  arcane_runestone: animRunestone,
  arcane_magic_dust: animMagicDust,
  arcane_pentacle: animPentacle,
};
