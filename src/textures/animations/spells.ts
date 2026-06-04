// Animated spell icons. Each fn redraws the WHOLE icon at time `t` (seconds).
// Caller handles clear/save/translate-to-center/scale/lineCap/lineJoin/restore.
// Draw only at origin (0,0) within a ~-24..+24 box. Loop seamlessly via sin/cos/modulo.
// Pure & deterministic given `t` — no Math.random, no imports.

const TAU = Math.PI * 2;

// Smooth 0..1 fade that rises then falls (one hump per unit of phase).
function hump(phase: number): number {
  const p = phase - Math.floor(phase);
  return Math.sin(p * Math.PI);
}

function animFireball(ctx: CanvasRenderingContext2D, t: number) {
  const pulse = Math.sin(t * 5) * 0.5 + 0.5; // 0..1 core pulse
  const flick = Math.sin(t * 13) * 0.5 + 0.5;
  const swirl = Math.sin(t * 0.8) * 0.12;

  // Outer heat glow (breathes with the core)
  const gR = 24 + pulse * 2;
  const glow = ctx.createRadialGradient(2, 2, 2, 2, 2, gR);
  glow.addColorStop(0, `rgba(255,170,60,${0.6 + pulse * 0.2})`);
  glow.addColorStop(0.5, "rgba(255,90,20,0.28)");
  glow.addColorStop(1, "rgba(255,60,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(2, 2, gR, 0, TAU);
  ctx.fill();

  // Flaming tail streaming up-left (waves slightly)
  const tw = Math.sin(t * 4) * 2;
  ctx.save();
  ctx.fillStyle = "rgba(255,120,30,0.55)";
  ctx.beginPath();
  ctx.moveTo(-2, -10);
  ctx.quadraticCurveTo(-18, -16 + tw, -22, -8 + tw);
  ctx.quadraticCurveTo(-12, -10, -6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,200,90,0.5)";
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.quadraticCurveTo(-22, 2 - tw, -24, 10 - tw);
  ctx.quadraticCurveTo(-14, 6, -6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Overall gentle swirl of the flame tongues
  ctx.save();
  ctx.rotate(swirl);

  // Licking flame tongues — flicker height/lean
  ctx.fillStyle = "#ff7a1e";
  const tongues: Array<[number, number, number, number]> = [
    [-6, -14, -0.4, 0],
    [6, -14, 0.3, 1],
    [13, -4, 0.9, 2],
    [11, 8, 1.6, 3],
    [-11, 6, -1.6, 4],
  ];
  tongues.forEach(([tx, ty, lean, i]) => {
    const lick = Math.sin(t * 9 + i * 1.7) * 0.35; // licks upward
    const len = 8 + Math.sin(t * 11 + i) * 2;
    const l = lean + lick;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(l) * len,
      ty + Math.sin(l) * len - 6 - lick * 4,
      tx + Math.cos(l) * 4,
      ty + Math.sin(l) * 4 + 6
    );
    ctx.quadraticCurveTo(tx - 3, ty + 2, tx, ty);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  // Main fire orb (pulsing radius)
  const oR = 13 + pulse * 0.8;
  const body = ctx.createRadialGradient(-3, -4, 2, 2, 2, 15);
  body.addColorStop(0, "#fff6c8");
  body.addColorStop(0.35, "#ffd24a");
  body.addColorStop(0.7, "#ff6a1a");
  body.addColorStop(1, "#9a1e04");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(2, 2, oR, 0, TAU);
  ctx.fill();

  // Bright inner core (pulses brighter)
  const core = ctx.createRadialGradient(-2, -3, 1, -1, -2, 8 + pulse * 2);
  core.addColorStop(0, `rgba(255,255,240,${0.85 + pulse * 0.15})`);
  core.addColorStop(0.6, "rgba(255,220,120,0.5)");
  core.addColorStop(1, "rgba(255,180,60,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(-1, -2, 8 + pulse * 2, 0, TAU);
  ctx.fill();

  // Swirling heat curls inside (rotate)
  ctx.save();
  ctx.beginPath();
  ctx.arc(2, 2, oR, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = `rgba(255,120,20,${0.4 + flick * 0.3})`;
  ctx.lineWidth = 1.4;
  const sw = t * 1.5;
  ctx.beginPath();
  ctx.arc(4, 6, 6, sw + Math.PI * 0.2, sw + Math.PI * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-2, 4, 3, -sw + Math.PI * 1.1, -sw + Math.PI * 2.2);
  ctx.stroke();
  ctx.restore();

  // Rising / fading ember sparks
  ctx.fillStyle = "#ffd87a";
  const embers: Array<[number, number, number]> = [
    [15, -10, 0],
    [12, -14, 1],
    [18, -2, 2],
    [-14, -10, 3],
    [16, 12, 4],
    [-9, 12, 5],
  ];
  embers.forEach(([ex, baseY, i]) => {
    const ph = (t * 0.7 + i / embers.length) % 1;
    const rise = ph * 22;
    const ey = baseY + 12 - rise;
    const a = hump(ph) * 0.9;
    const r = 1 + i * 0.12;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(ex + Math.sin(t * 3 + i) * 2, ey, r, 0, TAU);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(255,90,20,${0.5 + flick * 0.3})`;
  [
    [17, -13, 0.8],
    [-16, -7, 0.8],
    [19, 9, 0.8],
  ].forEach(([ex, ey, er]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, TAU);
    ctx.fill();
  });
}

function animIceShard(ctx: CanvasRenderingContext2D, t: number) {
  const pulse = Math.sin(t * 2.2) * 0.5 + 0.5; // cold breathing pulse

  // Frosty glow (shimmers)
  const gR = 24 + pulse * 1.5;
  const glow = ctx.createRadialGradient(0, 2, 2, 0, 2, gR);
  glow.addColorStop(0, `rgba(150,225,255,${0.45 + pulse * 0.2})`);
  glow.addColorStop(0.55, "rgba(90,180,255,0.22)");
  glow.addColorStop(1, "rgba(90,180,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 2, gR, 0, TAU);
  ctx.fill();

  const shard = (cx: number, topY: number, w: number, botY: number, grad: CanvasGradient) => {
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx + w, topY + (botY - topY) * 0.32);
    ctx.lineTo(cx + w * 0.45, botY);
    ctx.lineTo(cx - w * 0.45, botY);
    ctx.lineTo(cx - w, topY + (botY - topY) * 0.32);
    ctx.closePath();
    ctx.fill();
  };
  const makeGrad = (cx: number, topY: number, botY: number) => {
    const g = ctx.createLinearGradient(cx - 6, topY, cx + 6, botY);
    g.addColorStop(0, "#f0fbff");
    g.addColorStop(0.45, "#a8e2ff");
    g.addColorStop(1, "#3a86c8");
    return g;
  };

  shard(-9, -2, 5, 18, makeGrad(-9, -2, 18));
  ctx.strokeStyle = "#2a6aa0";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  shard(10, 0, 5, 20, makeGrad(10, 0, 20));
  ctx.stroke();
  shard(0, -18, 7, 22, makeGrad(0, -18, 22));
  ctx.strokeStyle = "#27608f";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Center facet highlight — shimmer brightens with pulse
  ctx.strokeStyle = `rgba(255,255,255,${0.6 + pulse * 0.35})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, 20);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3.5, 4);
  ctx.lineTo(0, -14);
  ctx.lineTo(3.5, 4);
  ctx.stroke();

  // Twinkling frost sparkles — each stars on its own phase
  const drawStar = (sx: number, sy: number, s: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#e8faff";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx - s, sy);
    ctx.lineTo(sx + s, sy);
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx, sy + s);
    ctx.stroke();
    ctx.restore();
  };
  const sparks: Array<[number, number, number, number]> = [
    [-10, -8, 3, 0],
    [11, -6, 2.4, 1],
    [5, 14, 2, 2],
    [-7, 12, 1.8, 3],
    [8, 4, 1.6, 4],
    [-3, -4, 1.4, 5],
  ];
  sparks.forEach(([sx, sy, s, i]) => {
    const tw = Math.sin(t * 4 + i * 1.9) * 0.5 + 0.5; // twinkle
    drawStar(sx, sy, s * (0.6 + tw * 0.5), 0.35 + tw * 0.6);
  });
}

function animLightning(ctx: CanvasRenderingContext2D, t: number) {
  // Fast flicker duty cycle — bright flashes
  const dc = (Math.sin(t * 18) + Math.sin(t * 27) * 0.5) * 0.5 + 0.5; // 0..~1
  const bright = 0.35 + dc * 0.65;
  const jit = Math.sin(t * 31) * 1.2; // fork jitter

  // Electric glow bursts with the flash
  const gR = 24 + dc * 3;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, gR);
  glow.addColorStop(0, `rgba(150,210,255,${0.4 + dc * 0.4})`);
  glow.addColorStop(0.5, "rgba(80,140,255,0.25)");
  glow.addColorStop(1, "rgba(60,120,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, gR, 0, TAU);
  ctx.fill();

  const bolt = () => {
    ctx.beginPath();
    ctx.moveTo(4, -22);
    ctx.lineTo(-6, -4);
    ctx.lineTo(2, -2);
    ctx.lineTo(-8, 22);
    ctx.lineTo(8, -4);
    ctx.lineTo(0, -6);
    ctx.lineTo(10, -22);
    ctx.closePath();
  };

  // Wide blue base with flashing shadow
  ctx.save();
  ctx.shadowColor = `rgba(90,160,255,${0.5 + dc * 0.5})`;
  ctx.shadowBlur = 6 + dc * 8;
  bolt();
  ctx.fillStyle = "#3a86ff";
  ctx.fill();
  ctx.restore();

  // Bright white-blue core fill (brightness flickers)
  ctx.save();
  ctx.globalAlpha = bright;
  const core = ctx.createLinearGradient(-8, -22, 8, 22);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.5, "#cfe6ff");
  core.addColorStop(1, "#9ec8ff");
  ctx.fillStyle = core;
  ctx.scale(0.7, 1);
  bolt();
  ctx.fill();
  ctx.restore();

  // Slim bright centerline
  ctx.strokeStyle = `rgba(255,255,255,${0.6 + dc * 0.4})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(5, -20);
  ctx.lineTo(-3, -4);
  ctx.lineTo(3, -3);
  ctx.lineTo(-4, 18);
  ctx.stroke();

  // Crackling forks — jitter at their tips
  ctx.strokeStyle = `rgba(180,220,255,${0.5 + dc * 0.45})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -4);
  ctx.lineTo(-13 + jit, -7 - jit);
  ctx.lineTo(-10 - jit, -2);
  ctx.moveTo(2, -2);
  ctx.lineTo(12 + jit, 2 + jit);
  ctx.lineTo(8, 5 - jit);
  ctx.moveTo(4, -22);
  ctx.lineTo(-2 + jit, -19);
  ctx.stroke();

  // Spark dots at tips — pop with the flash
  ctx.fillStyle = `rgba(220,240,255,${0.5 + dc * 0.45})`;
  const tips: Array<[number, number, number]> = [
    [4, -22, 1.6],
    [-8, 22, 1.6],
    [-13 + jit, -7 - jit, 1.1],
    [12 + jit, 2 + jit, 1.1],
  ];
  tips.forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr * (0.7 + dc * 0.6), 0, TAU);
    ctx.fill();
  });
}

function animHeal(ctx: CanvasRenderingContext2D, t: number) {
  const breath = Math.sin(t * 2.4) * 0.5 + 0.5; // breathing glow

  // Healing aura (breathes)
  const gR = 24 + breath * 2.5;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, gR);
  glow.addColorStop(0, `rgba(150,255,170,${0.5 + breath * 0.3})`);
  glow.addColorStop(0.5, "rgba(70,210,110,0.25)");
  glow.addColorStop(1, "rgba(50,200,90,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, gR, 0, TAU);
  ctx.fill();

  const arm = 14;
  const half = 5;
  const plus = () => {
    ctx.beginPath();
    ctx.roundRect(-half, -arm, half * 2, arm * 2, 3);
    ctx.roundRect(-arm, -half, arm * 2, half * 2, 3);
  };

  // Cross body with breathing shadow
  ctx.save();
  ctx.shadowColor = `rgba(80,240,130,${0.6 + breath * 0.35})`;
  ctx.shadowBlur = 5 + breath * 6;
  const body = ctx.createLinearGradient(-arm, -arm, arm, arm);
  body.addColorStop(0, "#bdffcf");
  body.addColorStop(0.5, "#46d878");
  body.addColorStop(1, "#1f9a4a");
  ctx.fillStyle = body;
  plus();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#147a38";
  ctx.lineWidth = 1.6;
  plus();
  ctx.stroke();

  // Inner highlight — pulses with breath
  ctx.fillStyle = `rgba(255,255,255,${0.4 + breath * 0.35})`;
  ctx.beginPath();
  ctx.roundRect(-2, -arm + 2, 4, arm * 2 - 4, 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.2 + breath * 0.2})`;
  ctx.beginPath();
  ctx.roundRect(-arm + 2, -2, arm * 2 - 4, 4, 2);
  ctx.fill();

  // Rising sparkle motes — loop up and fade
  const drawStar = (sx: number, sy: number, s: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#eafff0";
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * s, sy + Math.sin(a) * s);
      ctx.lineTo(sx + Math.cos(a + Math.PI / 4) * s * 0.3, sy + Math.sin(a + Math.PI / 4) * s * 0.3);
    }
    ctx.fill();
    ctx.restore();
  };
  const motes: Array<[number, number, number]> = [
    [-16, 3, 0],
    [17, 3, 1],
    [14, 3, 2],
    [-18, 3, 3],
    [10, 3, 4],
  ];
  motes.forEach(([mx, baseS, i]) => {
    const ph = (t * 0.5 + i / motes.length) % 1;
    const my = 14 - ph * 32; // rise from below to top
    const a = hump(ph) * 0.9;
    const s = 1.6 + baseS;
    drawStar(mx + Math.sin(t * 2 + i) * 2, my, s, a);
  });
}

function animShieldBubble(ctx: CanvasRenderingContext2D, t: number) {
  const R = 18;
  const pulse = Math.sin(t * 3) * 0.5 + 0.5; // rim glow pulse
  const shimmer = Math.sin(t * 6) * 0.5 + 0.5;

  // Outer rim glow (pulses)
  const glow = ctx.createRadialGradient(0, 0, R - 4, 0, 0, R + 7 + pulse * 2);
  glow.addColorStop(0, "rgba(120,200,255,0)");
  glow.addColorStop(0.7, `rgba(120,200,255,${0.25 + pulse * 0.25})`);
  glow.addColorStop(1, "rgba(80,160,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, R + 7 + pulse * 2, 0, TAU);
  ctx.fill();

  // Translucent dome fill
  const dome = ctx.createRadialGradient(-5, -6, 2, 0, 0, R);
  dome.addColorStop(0, "rgba(220,245,255,0.45)");
  dome.addColorStop(0.6, "rgba(120,190,255,0.22)");
  dome.addColorStop(1, "rgba(70,150,255,0.32)");
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();

  // Hex pattern (clipped) — shimmer in opacity
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = `rgba(150,210,255,${0.35 + shimmer * 0.35})`;
  ctx.lineWidth = 1;
  const hexR = 5;
  const hexW = hexR * Math.sqrt(3);
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const hx = col * hexW + (row % 2 ? hexW / 2 : 0);
      const hy = row * hexR * 1.5;
      // local shimmer wave across the dome
      const local = Math.sin(t * 5 - (hx + hy) * 0.18) * 0.5 + 0.5;
      ctx.globalAlpha = 0.4 + local * 0.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * TAU;
        const px = hx + Math.cos(a) * hexR;
        const py = hy + Math.sin(a) * hexR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // Sweeping highlight that orbits the dome rim
  const sweepA = (t * 1.6) % TAU;
  const sx = Math.cos(sweepA) * (R - 2);
  const sy = Math.sin(sweepA) * (R - 2);
  const sweep = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
  sweep.addColorStop(0, "rgba(255,255,255,0.6)");
  sweep.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sweep;
  ctx.beginPath();
  ctx.arc(sx, sy, 10, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Rim ring (bright, pulses)
  ctx.save();
  ctx.shadowColor = `rgba(130,200,255,${0.6 + pulse * 0.35})`;
  ctx.shadowBlur = 5 + pulse * 5;
  ctx.strokeStyle = "#bfe6ff";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // Specular highlight arc + glint
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, R - 4, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-7, -9, 2.4, 4, -0.5, 0, TAU);
  ctx.fill();

  // Tiny impact sparks on the rim — twinkle
  const sparks: Array<[number, number, number]> = [
    [13, -12, 0],
    [-15, -8, 1],
    [16, 8, 2],
  ];
  sparks.forEach(([px, py, i]) => {
    const tw = Math.sin(t * 7 + i * 2.1) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(200,235,255,${0.4 + tw * 0.5})`;
    ctx.beginPath();
    ctx.arc(px, py, 1 + tw * 0.8, 0, TAU);
    ctx.fill();
  });
}

function animPoison(ctx: CanvasRenderingContext2D, t: number) {
  const pulse = Math.sin(t * 2.6) * 0.5 + 0.5; // toxic glow pulse

  // Toxic glow
  const gR = 24 + pulse * 1.5;
  const glow = ctx.createRadialGradient(0, 4, 2, 0, 4, gR);
  glow.addColorStop(0, `rgba(150,255,90,${0.45 + pulse * 0.25})`);
  glow.addColorStop(0.5, "rgba(110,210,40,0.25)");
  glow.addColorStop(1, "rgba(90,180,30,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 4, gR, 0, TAU);
  ctx.fill();

  const drop = () => {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(-3, -8, -13, -2, -13, 8);
    ctx.bezierCurveTo(-13, 17, -6, 22, 0, 22);
    ctx.bezierCurveTo(6, 22, 13, 17, 13, 8);
    ctx.bezierCurveTo(13, -2, 3, -8, 0, -18);
    ctx.closePath();
  };
  const body = ctx.createRadialGradient(-4, 2, 2, 0, 8, 18);
  body.addColorStop(0, "#d4ff7a");
  body.addColorStop(0.45, "#7ad828");
  body.addColorStop(1, "#2e6a0c");
  ctx.fillStyle = body;
  drop();
  ctx.fill();
  ctx.strokeStyle = "#1c4a08";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Bubbles inside — rise and pop on a loop (clipped)
  ctx.save();
  drop();
  ctx.clip();
  const bubbles: Array<[number, number, number]> = [
    [-4, 2.4, 0],
    [4, 1.8, 1],
    [-2, 1.4, 2],
    [5, 1.2, 3],
    [-6, 1.1, 4],
  ];
  bubbles.forEach(([bx, br, i]) => {
    const ph = (t * 0.6 + i / bubbles.length) % 1;
    const by = 20 - ph * 26; // rise from bottom of drop upward
    const grow = ph < 0.85 ? 1 : 1 + (ph - 0.85) * 4; // expand then pop
    const a = ph < 0.85 ? 0.7 : 0.7 * (1 - (ph - 0.85) / 0.15);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = "rgba(210,255,140,1)";
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 3 + i) * 1.2, by, br * grow, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, a) * 0.6;
    ctx.strokeStyle = "rgba(40,90,10,1)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 3 + i) * 1.2, by, br * grow, 0, TAU);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  // Specular streak
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-5, 0, 2.2, 6, -0.3, 0, TAU);
  ctx.fill();

  // Dripping droplet — forms, swells, then falls and resets
  const dph = (t * 0.55) % 1;
  ctx.save();
  if (dph < 0.55) {
    // forming/swelling at the tip
    const grow = dph / 0.55;
    const dy = 22 + grow * 4;
    const dh = 9 + grow * 2;
    ctx.fillStyle = "#7ad828";
    ctx.beginPath();
    ctx.moveTo(-1, dy);
    ctx.bezierCurveTo(-4, dy + dh * 0.45, -4, dy + dh, -1, dy + dh + 1);
    ctx.bezierCurveTo(2, dy + dh, 2, dy + dh * 0.45, -1, dy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1c4a08";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // detached, falling and fading
    const f = (dph - 0.55) / 0.45;
    const dy = 24 + f * 16;
    ctx.globalAlpha = 1 - f * 0.8;
    ctx.fillStyle = "#7ad828";
    ctx.beginPath();
    ctx.moveTo(-1, dy);
    ctx.bezierCurveTo(-4, dy + 4, -4, dy + 8, -1, dy + 9);
    ctx.bezierCurveTo(2, dy + 8, 2, dy + 4, -1, dy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1c4a08";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  // Tiny floating toxic motes — bob and twinkle
  const motes: Array<[number, number, number, number]> = [
    [14, -8, 1.4, 0],
    [-15, -4, 1.2, 1],
    [16, 6, 1.1, 2],
    [-12, 12, 0.9, 3],
  ];
  motes.forEach(([mx, my, mr, i]) => {
    const tw = Math.sin(t * 3 + i * 1.6) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(170,240,90,${0.5 + tw * 0.4})`;
    ctx.beginPath();
    ctx.arc(mx, my + Math.sin(t * 1.8 + i) * 2, mr * (0.7 + tw * 0.5), 0, TAU);
    ctx.fill();
  });
}

function animWind(ctx: CanvasRenderingContext2D, t: number) {
  // Soft airy glow
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  glow.addColorStop(0, "rgba(210,245,255,0.45)");
  glow.addColorStop(0.6, "rgba(160,215,235,0.18)");
  glow.addColorStop(1, "rgba(150,210,230,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, TAU);
  ctx.fill();

  ctx.lineCap = "round";

  // Continuously rotating swirl of gust lines
  ctx.save();
  ctx.rotate((t * 1.2) % TAU);

  ctx.strokeStyle = "rgba(220,248,255,0.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-22, -10);
  ctx.bezierCurveTo(-4, -16, 14, -14, 14, -6);
  ctx.bezierCurveTo(14, 0, 4, 0, 6, -6);
  ctx.stroke();

  ctx.strokeStyle = "rgba(190,235,250,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.bezierCurveTo(0, -4, 18, 0, 18, 8);
  ctx.bezierCurveTo(18, 15, 7, 15, 9, 7);
  ctx.stroke();

  ctx.strokeStyle = "rgba(170,225,245,0.8)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-18, 14);
  ctx.bezierCurveTo(-4, 10, 8, 12, 6, 18);
  ctx.stroke();

  ctx.strokeStyle = "rgba(120,180,210,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-20, -8);
  ctx.bezierCurveTo(-4, -13, 12, -11, 12, -6);
  ctx.stroke();
  ctx.restore();

  // Leaves orbiting / tumbling along the gust
  const leaf = (lx: number, ly: number, rot: number) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(-4, 0, 4, 0);
    g.addColorStop(0, "#9ed64a");
    g.addColorStop(1, "#4f8a1e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.bezierCurveTo(4, -2, 4, 2, 0, 4);
    ctx.bezierCurveTo(-4, 2, -4, -2, 0, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e5410";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 4);
    ctx.stroke();
    ctx.restore();
  };
  const leaves: Array<[number, number, number]> = [
    [18, 0.0, 1],
    [16, 2.1, -1],
    [20, 4.2, 1.4],
  ];
  leaves.forEach(([rad, phase]) => {
    const a = (t * 1.4 + phase) % TAU;
    const lx = Math.cos(a) * rad;
    const ly = Math.sin(a) * rad * 0.7;
    leaf(lx, ly, a * 2.5 + t * 3);
  });
}

function animArcaneMissile(ctx: CanvasRenderingContext2D, t: number) {
  const pulse = Math.sin(t * 5) * 0.5 + 0.5; // orb pulse
  const flick = Math.sin(t * 11) * 0.5 + 0.5; // tail flicker

  // Arcane aura
  const gR = 24 + pulse * 2;
  const glow = ctx.createRadialGradient(4, -2, 2, 4, -2, gR);
  glow.addColorStop(0, `rgba(200,140,255,${0.55 + pulse * 0.2})`);
  glow.addColorStop(0.5, "rgba(150,80,240,0.28)");
  glow.addColorStop(1, "rgba(130,70,230,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(4, -2, gR, 0, TAU);
  ctx.fill();

  // Streaming energy tail (flickers + waves)
  ctx.save();
  const wv = Math.sin(t * 6) * 2;
  const tail = ctx.createLinearGradient(4, -2, -22, 18);
  tail.addColorStop(0, `rgba(190,120,255,${0.55 + flick * 0.3})`);
  tail.addColorStop(1, "rgba(150,80,240,0)");
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(-2, -6);
  ctx.quadraticCurveTo(-16 + wv, 4, -22, 18 + wv);
  ctx.quadraticCurveTo(-10, 10, 2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(235,200,255,${0.5 + flick * 0.4})`;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(-12 + wv, 6, -20, 16 + wv);
  ctx.stroke();
  ctx.restore();

  // Main arcane orb (pulsing)
  const oR = 11 + pulse * 0.8;
  const body = ctx.createRadialGradient(0, -6, 2, 4, -2, 13);
  body.addColorStop(0, "#fbeaff");
  body.addColorStop(0.35, "#cf8aff");
  body.addColorStop(0.7, "#8a3ce0");
  body.addColorStop(1, "#42107a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(4, -2, oR, 0, TAU);
  ctx.fill();

  // Bright pulsing core
  const core = ctx.createRadialGradient(1, -5, 1, 2, -4, 7 + pulse * 2);
  core.addColorStop(0, `rgba(255,255,255,${0.85 + pulse * 0.15})`);
  core.addColorStop(0.5, "rgba(230,180,255,0.5)");
  core.addColorStop(1, "rgba(200,140,255,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(2, -4, 7 + pulse * 2, 0, TAU);
  ctx.fill();

  // Tilting / spinning orbital ring
  ctx.save();
  ctx.strokeStyle = "rgba(220,170,255,0.7)";
  ctx.lineWidth = 1.4;
  const ringTilt = -0.5 + Math.sin(t * 2) * 0.4;
  ctx.beginPath();
  ctx.ellipse(4, -2, 12, 4.5, ringTilt, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // Sparks orbiting the orb
  const drawStar = (sx: number, sy: number, s: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#f3e6ff";
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * s, sy + Math.sin(a) * s);
      ctx.lineTo(sx + Math.cos(a + Math.PI / 4) * s * 0.3, sy + Math.sin(a + Math.PI / 4) * s * 0.3);
    }
    ctx.fill();
    ctx.restore();
  };
  const orbit: Array<[number, number, number]> = [
    [3, 14, 0],
    [2.4, 11, 2.1],
    [2.2, 13, 4.2],
    [1.8, 16, 1.0],
  ];
  orbit.forEach(([s, rad, phase]) => {
    const a = (t * 2.2 + phase) % TAU;
    const sx = 4 + Math.cos(a) * rad;
    const sy = -2 + Math.sin(a) * rad * 0.55;
    const tw = Math.sin(t * 5 + phase) * 0.5 + 0.5;
    drawStar(sx, sy, s, 0.5 + tw * 0.45);
  });
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  spell_fireball: animFireball,
  spell_ice_shard: animIceShard,
  spell_lightning: animLightning,
  spell_heal: animHeal,
  spell_shield_bubble: animShieldBubble,
  spell_poison: animPoison,
  spell_wind: animWind,
  spell_arcane_missile: animArcaneMissile,
};
