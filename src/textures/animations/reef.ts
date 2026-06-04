// Reef — animated sea creatures & harbor icons for the Fish/Harbor biome.
// Each function redraws the WHOLE icon at time `t` (elapsed seconds).
// Self-contained, no imports. Same look as the static icons in
// `src/textures/categories/reef.ts`, but alive — driven by sin/cos so the
// motion loops seamlessly.

function shadow(ctx: CanvasRenderingContext2D, w: number, y = 22): void {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, y, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function animJellyfish(ctx: CanvasRenderingContext2D, t: number): void {
  // Whole creature bobs gently up/down.
  const bob = Math.sin(t * 1.6) * 2.2;
  // Bell pulse: squash/stretch the dome (volume-ish preserving).
  const pulse = Math.sin(t * 2.4);
  const sx = 1 + pulse * 0.08;
  const sy = 1 - pulse * 0.08;

  ctx.save();
  ctx.translate(0, bob);

  // Soft glow behind the bell — breathes with the pulse.
  const glowR = 24 + pulse * 3;
  const glowA = 0.55 + pulse * 0.18;
  const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, glowR);
  glow.addColorStop(0, `rgba(120,200,255,${glowA})`);
  glow.addColorStop(0.5, "rgba(90,160,240,0.22)");
  glow.addColorStop(1, "rgba(90,160,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Trailing tentacles — traveling wave sway.
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  const strands = [-9, -5, -1, 3, 7];
  strands.forEach((sxp, i) => {
    ctx.strokeStyle = i % 2 === 0 ? "rgba(150,210,255,0.85)" : "rgba(190,160,240,0.8)";
    const dir = i % 2 === 0 ? 1 : -1;
    // Wave phase travels down the strand and across strands.
    const w1 = Math.sin(t * 3 + i * 0.7) * 4 * dir;
    const w2 = Math.sin(t * 3 + i * 0.7 + 1.2) * 4 * dir;
    const w3 = Math.sin(t * 3 + i * 0.7 + 2.4) * 3 * dir;
    ctx.beginPath();
    ctx.moveTo(sxp, 4);
    ctx.bezierCurveTo(
      sxp + 4 * dir + w1, 10,
      sxp - 4 * dir + w2, 16,
      sxp + 2 * dir + w3, 22,
    );
    ctx.stroke();
  });

  // Short frilly oral arms — sway slightly.
  ctx.strokeStyle = "rgba(220,200,255,0.9)";
  ctx.lineWidth = 2.2;
  [-4, 0, 4].forEach((sxp, i) => {
    const w = Math.sin(t * 3.2 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(sxp, 4);
    ctx.quadraticCurveTo(sxp + 2 + w, 9, sxp + w * 0.6, 14);
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // Bell — translucent dome, squash/stretch.
  ctx.save();
  ctx.scale(sx, sy);
  const bell = ctx.createRadialGradient(-3, -8, 2, 0, -4, 16);
  bell.addColorStop(0, "rgba(220,245,255,0.95)");
  bell.addColorStop(0.55, "rgba(120,185,245,0.8)");
  bell.addColorStop(1, "rgba(70,120,210,0.7)");
  ctx.fillStyle = bell;
  ctx.strokeStyle = "rgba(60,100,180,0.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, 4);
  ctx.bezierCurveTo(-15, -16, 15, -16, 14, 4);
  // scalloped lower rim — wobbles with the pulse.
  const r = pulse * 1.5;
  ctx.bezierCurveTo(11, 8 + r, 9, 1, 6, 6 + r);
  ctx.bezierCurveTo(3, 1, 0, 8 + r, -3, 4);
  ctx.bezierCurveTo(-6, 8 + r, -9, 1, -11, 6 + r);
  ctx.bezierCurveTo(-13, 7, -13, 6, -14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Inner bell tint markings
  ctx.fillStyle = "rgba(150,120,220,0.4)";
  ([[-5, -4], [3, -5], [-1, -1]] as Array<[number, number]>).forEach(([mx, my]) => {
    ctx.beginPath();
    ctx.ellipse(mx, my, 2.4, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Bell specular highlight
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-6, -8, 2.4, 4.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(3, -9, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function animOctopus(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 18);

  // Head bobs gently.
  const bob = Math.sin(t * 1.8) * 1.6;

  // Tentacles — each curls/waves with an offset phase.
  const tentacles: Array<[number, number, number, number, number, number]> = [
    [-12, 4, -22, 14, -16, 22],
    [-7, 8, -12, 18, -6, 23],
    [-2, 9, -2, 18, -4, 24],
    [3, 9, 4, 18, 2, 24],
    [8, 8, 13, 18, 8, 23],
    [13, 4, 22, 14, 17, 22],
  ];
  tentacles.forEach(([x1, y1, cx, cy, x2, y2], i) => {
    const ph = t * 2.6 + i * 0.9;
    const wMid = Math.sin(ph) * 3;
    const wTip = Math.sin(ph + 1.1) * 4;
    const cxA = cx + wMid;
    const cyA = cy + Math.cos(ph) * 1.2;
    const x2A = x2 + wTip;
    const y2A = y2 + Math.sin(ph + 0.5) * 1.5;
    const g = ctx.createLinearGradient(x1, y1, x2A, y2A);
    g.addColorStop(0, "#b066d6");
    g.addColorStop(1, "#7a2aa6");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#4a1066";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x1 - 2, y1 + bob);
    ctx.quadraticCurveTo(cxA - 2, cyA, x2A, y2A);
    ctx.quadraticCurveTo(x2A + 2, y2A + 1, x2A + 2, y2A - 1);
    ctx.quadraticCurveTo(cxA + 3, cyA, x1 + 2, y1 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // suckers
    ctx.fillStyle = "rgba(255,210,240,0.7)";
    for (let s = 0.45; s <= 0.85; s += 0.2) {
      const sxx = x1 + (x2A - x1) * s;
      const syy = (y1 + bob) + (y2A - (y1 + bob)) * s;
      ctx.beginPath();
      ctx.arc(sxx, syy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.save();
  ctx.translate(0, bob);

  // Head — domed mantle.
  const head = ctx.createRadialGradient(-4, -8, 2, 0, -2, 18);
  head.addColorStop(0, "#d49aee");
  head.addColorStop(0.55, "#a050d0");
  head.addColorStop(1, "#5a1888");
  ctx.fillStyle = head;
  ctx.strokeStyle = "#4a1066";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.bezierCurveTo(-16, -16, 16, -16, 14, 6);
  ctx.bezierCurveTo(8, 12, -8, 12, -14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Mantle highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 3, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Blink: brief periodic closure (~every 3.2s).
  const blinkPhase = (t % 3.2);
  const blinking = blinkPhase < 0.16;
  const lid = blinking ? 1 - Math.abs(blinkPhase - 0.08) / 0.08 : 0;

  // Eyes
  ([-6, 6] as number[]).forEach((ex) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a1066";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#0a1018";
    ctx.beginPath();
    ctx.arc(ex + (ex < 0 ? 0.6 : -0.6), -1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(ex - 0.6, -2.8, 0.9, 0, Math.PI * 2);
    ctx.fill();
    // Lid covering during blink.
    if (lid > 0) {
      ctx.fillStyle = "#a050d0";
      ctx.beginPath();
      ctx.ellipse(ex, -2, 4.2, 4.2 * lid, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  });

  // Little smile
  ctx.strokeStyle = "rgba(74,16,102,0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 3, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.restore();
}

function animCrab(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 18);

  // Tiny side-to-side body sway.
  const sway = Math.sin(t * 2.2) * 1.6;

  ctx.save();
  ctx.translate(sway, 0);

  // Legs — three per side, scuttle slightly.
  ctx.strokeStyle = "#7a1c08";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  const legs: Array<[number, number, number, number, number, number]> = [
    [-9, 6, -18, 8, -20, 14],
    [-10, 9, -18, 14, -19, 19],
    [-8, 11, -14, 17, -13, 21],
    [9, 6, 18, 8, 20, 14],
    [10, 9, 18, 14, 19, 19],
    [8, 11, 14, 17, 13, 21],
  ];
  legs.forEach(([x1, y1, x2, y2, x3, y3], i) => {
    // Alternate sides/rows step out of phase.
    const j = Math.sin(t * 7 + i * 1.3) * 1.8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x2, y2, x3 + (x3 < 0 ? -j : j), y3 - Math.abs(j) * 0.4);
    ctx.stroke();
  });

  // Claws — open/snap.
  const clawFill = (cx: number): CanvasGradient => {
    const g = ctx.createRadialGradient(cx - 2, -2, 1, cx, 0, 9);
    g.addColorStop(0, "#ff9a5a");
    g.addColorStop(0.6, "#e0541c");
    g.addColorStop(1, "#9a2c08");
    return g;
  };
  // Snap: 0 = closed, up to ~1 open. Sharp snap-shut, slow open.
  const snapRaw = (Math.sin(t * 3) + 1) / 2;
  const open = snapRaw * snapRaw * 6; // pixels the upper finger lifts
  ([[-1], [1]] as Array<[number]>).forEach(([s]) => {
    ctx.save();
    ctx.translate(s * 16, -2);
    ctx.scale(s, 1);
    // upper arm
    ctx.strokeStyle = "#9a2c08";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.quadraticCurveTo(-2, 2, 2, -4);
    ctx.stroke();
    // pincer body
    ctx.fillStyle = clawFill(0);
    ctx.strokeStyle = "#5a1404";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(2, -4, 8, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // pincer fingers — upper finger opens upward by `open`.
    ctx.beginPath();
    ctx.moveTo(7, -8 - open);
    ctx.quadraticCurveTo(13, -10 - open, 12, -4 - open);
    ctx.quadraticCurveTo(9, -5 - open * 0.5, 6, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.quadraticCurveTo(12, 0, 11, 3);
    ctx.quadraticCurveTo(7, 1, 4, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // Body — wide rounded carapace.
  const body = ctx.createRadialGradient(-4, -2, 2, 0, 2, 18);
  body.addColorStop(0, "#ff8c52");
  body.addColorStop(0.55, "#e0541c");
  body.addColorStop(1, "#9a2c08");
  ctx.fillStyle = body;
  ctx.strokeStyle = "#5a1404";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.bezierCurveTo(-16, -8, -8, -12, 0, -12);
  ctx.bezierCurveTo(8, -12, 16, -8, 16, 2);
  ctx.bezierCurveTo(12, 9, -12, 9, -16, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Carapace highlight band
  ctx.strokeStyle = "rgba(255,220,180,0.6)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.quadraticCurveTo(0, -10, 11, -4);
  ctx.stroke();
  // Little texture bumps
  ctx.fillStyle = "rgba(90,20,4,0.4)";
  ([[-7, 2], [0, 4], [7, 2]] as Array<[number, number]>).forEach(([bx, by]) => {
    ctx.beginPath();
    ctx.arc(bx, by, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Eye stalks — wiggle.
  ctx.strokeStyle = "#9a2c08";
  ctx.lineWidth = 2;
  const stalkWig = Math.sin(t * 4) * 1.4;
  const eyeX = (ex: number): number => ex + (ex < 0 ? -stalkWig : stalkWig) * 0.6;
  ([-5, 5] as number[]).forEach((ex) => {
    ctx.beginPath();
    ctx.moveTo(ex, -10);
    ctx.lineTo(eyeX(ex), -16);
    ctx.stroke();
  });
  ([-5, 5] as number[]).forEach((ex) => {
    const tx = eyeX(ex);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(tx, -17, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a1404";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#0a1018";
    ctx.beginPath();
    ctx.arc(tx, -17, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(tx - 0.6, -17.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.lineCap = "butt";

  ctx.restore();
}

function animSeahorse(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 12);

  // Gentle vertical bob + slight body sway (rotation).
  const bob = Math.sin(t * 1.7) * 2;
  const swayRot = Math.sin(t * 1.3) * 0.06;

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(swayRot);

  // Body — S-curve with curled tail.
  const g = ctx.createLinearGradient(-8, -18, 8, 18);
  g.addColorStop(0, "#ffe070");
  g.addColorStop(0.5, "#f0b028");
  g.addColorStop(1, "#b07808");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#7a4e08";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-12, -16);
  ctx.quadraticCurveTo(-2, -22, 4, -14);
  ctx.bezierCurveTo(10, -4, 6, 6, 2, 12);
  ctx.bezierCurveTo(0, 18, 8, 20, 8, 14);
  ctx.bezierCurveTo(8, 10, 3, 10, 4, 14);
  ctx.bezierCurveTo(1, 8, 0, 0, -4, -6);
  ctx.bezierCurveTo(-6, -10, -8, -12, -8, -14);
  ctx.lineTo(-12, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Snout
  ctx.strokeStyle = "#7a4e08";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -15);
  ctx.lineTo(-15, -15);
  ctx.stroke();
  ctx.lineCap = "butt";

  // Dorsal fin — fast ripple flutter.
  ctx.fillStyle = "rgba(255,240,170,0.8)";
  ctx.strokeStyle = "#b07808";
  ctx.lineWidth = 1;
  const f1 = Math.sin(t * 14) * 1.6;
  const f2 = Math.sin(t * 14 + 1.0) * 1.8;
  const f3 = Math.sin(t * 14 + 2.0) * 1.6;
  ctx.beginPath();
  ctx.moveTo(5, -12);
  ctx.quadraticCurveTo(12 + f1, -8, 10 + f1, -2);
  ctx.quadraticCurveTo(13 + f2, -5, 9 + f2, 2);
  ctx.quadraticCurveTo(11 + f3, -2, 6, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body ridge segments
  ctx.strokeStyle = "rgba(122,78,8,0.5)";
  ctx.lineWidth = 1;
  for (let s = 0; s < 4; s++) {
    const yy = -8 + s * 4;
    ctx.beginPath();
    ctx.moveTo(-5 + s * 0.5, yy);
    ctx.lineTo(2 - s * 0.5, yy + 1);
    ctx.stroke();
  }
  // Head crest bumps
  ctx.fillStyle = "#f0b028";
  ctx.strokeStyle = "#7a4e08";
  ctx.lineWidth = 0.9;
  ([[-4, -20], [0, -19]] as Array<[number, number]>).forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-6, -14, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a1018";
  ctx.beginPath();
  ctx.arc(-6, -14, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(-6.5, -14.5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function animStarfish(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 18);

  // Slow rotation.
  ctx.save();
  ctx.rotate(t * 0.4);

  const arms = 5;
  const outer = 20;
  const inner = 8;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < arms * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / arms;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 22);
  g.addColorStop(0, "#ffb060");
  g.addColorStop(0.6, "#f07820");
  g.addColorStop(1, "#b04808");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#7a2c04";
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else {
      const [px, py] = pts[i - 1];
      ctx.quadraticCurveTo((px + x) / 2 + x * 0.05, (py + y) / 2 + y * 0.05, x, y);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Arm ridge lines
  ctx.strokeStyle = "rgba(122,44,4,0.4)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < arms; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / arms;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (outer - 4), Math.sin(a) * (outer - 4));
    ctx.stroke();
  }

  // Bumpy texture dots — shimmer travels outward across each arm.
  for (let i = 0; i < arms; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / arms;
    for (let s = 0.3; s <= 0.85; s += 0.2) {
      const bx = Math.cos(a) * outer * s;
      const by = Math.sin(a) * outer * s;
      // Traveling twinkle: brightness peaks as the wave passes this dot.
      const wave = Math.sin(t * 4 - s * 6 - i * 1.2);
      const lift = Math.max(0, wave);
      const alpha = 0.55 + lift * 0.45;
      const rad = 1.3 + lift * 0.9;
      ctx.fillStyle = `rgba(255,240,200,${alpha})`;
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Center dots cluster
  ctx.fillStyle = "rgba(176,72,8,0.55)";
  ([[0, 0], [-2, -2], [2, -1], [0, 3]] as Array<[number, number]>).forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function animLighthouse(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 18);

  // Tiny waves at the base ripple.
  const waveA = Math.sin(t * 2.5);
  const waveB = Math.cos(t * 2.5 + 0.8);
  ctx.fillStyle = "rgba(90,160,220,0.35)";
  ctx.beginPath();
  ctx.moveTo(-22, 22 + waveA);
  ctx.quadraticCurveTo(-14, 18 - waveB, -6, 22 + waveB);
  ctx.quadraticCurveTo(2, 26 - waveA, 10, 22 + waveA);
  ctx.quadraticCurveTo(16, 19 - waveB, 22, 22 + waveB);
  ctx.lineTo(22, 26);
  ctx.lineTo(-22, 26);
  ctx.closePath();
  ctx.fill();

  // Rock base
  ctx.fillStyle = "#6a6258";
  ctx.strokeStyle = "#3a342c";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-18, 22);
  ctx.lineTo(-12, 14);
  ctx.lineTo(-4, 17);
  ctx.lineTo(6, 13);
  ctx.lineTo(13, 17);
  ctx.lineTo(18, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(-12, 14);
  ctx.lineTo(-4, 17);
  ctx.lineTo(-8, 18);
  ctx.closePath();
  ctx.fill();

  // Tower — tapered trunk
  const tower = ctx.createLinearGradient(-8, 0, 8, 0);
  tower.addColorStop(0, "#d8d0c8");
  tower.addColorStop(0.5, "#fbf6ee");
  tower.addColorStop(1, "#c4bcb2");
  ctx.fillStyle = tower;
  ctx.strokeStyle = "#5a4438";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(-5, -10);
  ctx.lineTo(5, -10);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Red stripes (clipped to tower)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(-5, -10);
  ctx.lineTo(5, -10);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#d8362c";
  ([[-10, 5], [0, 5], [10, 5]] as Array<[number, number]>).forEach(([sy, h]) => {
    ctx.fillRect(-10, sy, 20, h);
  });
  ctx.restore();
  // Gallery deck
  ctx.fillStyle = "#3a342c";
  ctx.fillRect(-7, -12, 14, 3);

  // Lantern beam — sweeps/rotates around the lamp (drawn behind glow).
  const beamAngle = t * 1.5;
  ctx.save();
  ctx.translate(0, -17);
  ([0, Math.PI] as number[]).forEach((off) => {
    ctx.save();
    ctx.rotate(beamAngle + off);
    // Foreshorten the beam so it reads as a rotating cone.
    const reach = 18 + Math.cos(beamAngle + off) * 6;
    const beam = ctx.createLinearGradient(0, 0, reach, 0);
    beam.addColorStop(0, "rgba(255,240,160,0.55)");
    beam.addColorStop(1, "rgba(255,240,160,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(reach, -5);
    ctx.lineTo(reach, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();

  // Lantern room — lamp glow pulses.
  const pulse = (Math.sin(t * 3) + 1) / 2; // 0..1
  const lampR = 8 + pulse * 3;
  const lg = ctx.createRadialGradient(0, -17, 1, 0, -17, lampR);
  lg.addColorStop(0, "#fff6c0");
  lg.addColorStop(0.6, "#ffd24a");
  lg.addColorStop(1, "#e8901a");
  ctx.fillStyle = lg;
  ctx.strokeStyle = "#5a4438";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(-5, -20, 10, 8);
  ctx.fill();
  ctx.stroke();
  // Lantern panes
  ctx.strokeStyle = "rgba(90,68,56,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, -12);
  ctx.moveTo(-5, -16);
  ctx.lineTo(5, -16);
  ctx.stroke();

  // Static side glow beams — brighten with the pulse.
  ctx.fillStyle = `rgba(255,235,150,${0.2 + pulse * 0.25})`;
  ctx.beginPath();
  ctx.moveTo(5, -19);
  ctx.lineTo(20, -23);
  ctx.lineTo(20, -13);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-5, -19);
  ctx.lineTo(-20, -23);
  ctx.lineTo(-20, -13);
  ctx.closePath();
  ctx.fill();

  // Roof cap
  ctx.fillStyle = "#d8362c";
  ctx.strokeStyle = "#5a4438";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.lineTo(0, -27);
  ctx.lineTo(6, -20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Finial
  ctx.fillStyle = "#3a342c";
  ctx.beginPath();
  ctx.arc(0, -28, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  reef_jellyfish: animJellyfish,
  reef_octopus: animOctopus,
  reef_crab: animCrab,
  reef_seahorse: animSeahorse,
  reef_starfish: animStarfish,
  reef_lighthouse: animLighthouse,
};
