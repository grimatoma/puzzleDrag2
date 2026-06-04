// Animated small town & village buildings.
//
// Self-contained Canvas-2D animation fns (no imports / no shared exports).
// Each fn redraws the COMPLETE icon at time `t` (elapsed seconds), centered at
// origin (0,0) within a roughly -24..+24 box. The caller handles clear / save /
// translate / scale / lineCap / restore. Motion is derived purely from `t` and
// from indices (no Math.random) so frames are deterministic, and loops are made
// seamless via Math.sin/cos and modulo.
//
// Each draw mirrors the static icon in ../categories/buildings.ts — same
// colors and silhouette — but lived-in: rising smoke, turning wheels and sails,
// waving flags, fluttering awnings, and flickering candle/window glow.

const TAU = Math.PI * 2;

// Local rounded-rect helper (mirrors the source-icon convention).
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShadow(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, TAU);
  ctx.fill();
}

// Warm flicker factor in roughly 0.82..1.0, slow + cozy (candle/hearth feel).
function flicker(t: number, phase: number): number {
  const f = Math.sin(t * 3.1 + phase) * 0.5 + Math.sin(t * 5.7 + phase * 1.7) * 0.3 + Math.sin(t * 1.3 + phase * 0.5) * 0.2;
  return 0.91 + f * 0.09;
}

// Warm glowing window pane (animated brightness via `lit`, 0..1).
function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lit: number): void {
  const glow = ctx.createLinearGradient(0, y, 0, y + h);
  glow.addColorStop(0, "#fff2b8");
  glow.addColorStop(0.5, "#ffd368");
  glow.addColorStop(1, "#e89a30");
  ctx.save();
  ctx.globalAlpha = lit;
  ctx.fillStyle = glow;
  rr(ctx, x, y, w, h, 1.4);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.6;
  rr(ctx, x, y, w, h, 1.4);
  ctx.stroke();
  // Mullions
  ctx.strokeStyle = "rgba(90,52,20,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  // Pane glint
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.28, y + h * 0.3, w * 0.12, h * 0.18, -0.4, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 1. Cottage — chimney smoke puffs rise & dissipate (seamless), window flickers.
// ---------------------------------------------------------------------------
function animCottage(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 22, 4);
  // Chimney (behind roof)
  const chim = ctx.createLinearGradient(0, -22, 0, -8);
  chim.addColorStop(0, "#b86848");
  chim.addColorStop(1, "#7a3e24");
  ctx.fillStyle = chim;
  rr(ctx, 8, -22, 6, 14, 1);
  ctx.fill();
  ctx.strokeStyle = "#4a2410";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Rising smoke: each puff travels up over its lifetime, growing & fading.
  // Stagger phases so a continuous column reads; loop is seamless via modulo.
  const baseX = 11, baseY = -24;
  const period = 2.6; // seconds per puff cycle
  const puffs = 4;
  ctx.fillStyle = "rgba(220,220,224,0.55)";
  for (let i = 0; i < puffs; i++) {
    const life = ((t / period) + i / puffs) % 1; // 0..1
    const rise = life * 18;                       // travels up 18px
    const drift = Math.sin(life * Math.PI * 2 + i) * 2.4;
    const r = 2.4 + life * 2.2;
    // Fade in at birth, fade out near the top — both ends -> 0 for a seamless loop.
    const fade = Math.sin(life * Math.PI);
    ctx.globalAlpha = 0.5 * fade;
    ctx.beginPath();
    ctx.arc(baseX + drift, baseY - rise, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Plaster walls
  const wall = ctx.createLinearGradient(-16, 0, 16, 0);
  wall.addColorStop(0, "#f4e2c0");
  wall.addColorStop(0.5, "#e6cda0");
  wall.addColorStop(1, "#c8a878");
  ctx.fillStyle = wall;
  rr(ctx, -16, -6, 32, 28, 2);
  ctx.fill();
  ctx.strokeStyle = "#6a4a28";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Thatched roof
  const roof = ctx.createLinearGradient(0, -22, 0, -4);
  roof.addColorStop(0, "#d8a85a");
  roof.addColorStop(0.5, "#b07e34");
  roof.addColorStop(1, "#7a531c");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-20, -4);
  ctx.lineTo(0, -22);
  ctx.lineTo(20, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a3010";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Thatch strands
  ctx.strokeStyle = "rgba(74,48,16,0.5)";
  ctx.lineWidth = 0.8;
  for (let i = -16; i <= 16; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, -4);
    ctx.lineTo(i * 0.55, -16);
    ctx.stroke();
  }
  // Roof highlight
  ctx.strokeStyle = "rgba(255,228,170,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-14, -7);
  ctx.lineTo(-2, -18);
  ctx.stroke();
  // Glowing window — warm flicker
  drawWindow(ctx, -13, 0, 9, 9, flicker(t, 0.3));
  // Door
  const door = ctx.createLinearGradient(2, 0, 13, 0);
  door.addColorStop(0, "#8a5424");
  door.addColorStop(1, "#5a3414");
  ctx.fillStyle = door;
  ctx.beginPath();
  ctx.moveTo(3, 22);
  ctx.lineTo(3, 6);
  ctx.arc(7.5, 6, 4.5, Math.PI, 0, false);
  ctx.lineTo(12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Door knob
  ctx.fillStyle = "#f0d060";
  ctx.beginPath();
  ctx.arc(10, 14, 1.2, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 2. Windmill — the four sails rotate continuously about the hub.
// ---------------------------------------------------------------------------
function animWindmill(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 18, 4);
  // Tapered tower
  const tower = ctx.createLinearGradient(-12, 0, 12, 0);
  tower.addColorStop(0, "#e8dcc0");
  tower.addColorStop(0.5, "#cbb990");
  tower.addColorStop(1, "#9c8458");
  ctx.fillStyle = tower;
  ctx.beginPath();
  ctx.moveTo(-7, -10);
  ctx.lineTo(-12, 22);
  ctx.lineTo(12, 22);
  ctx.lineTo(7, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a4a28";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Brick courses
  ctx.strokeStyle = "rgba(90,74,40,0.4)";
  ctx.lineWidth = 0.7;
  [0, 8, 16].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-9 - y * 0.16, y); ctx.lineTo(9 + y * 0.16, y);
    ctx.stroke();
  });
  // Glowing window
  drawWindow(ctx, -4, 6, 8, 9, flicker(t, 1.1));
  // Conical cap
  const cap = ctx.createLinearGradient(0, -22, 0, -10);
  cap.addColorStop(0, "#9a4a30");
  cap.addColorStop(1, "#5a2814");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(-9, -10);
  ctx.lineTo(0, -22);
  ctx.lineTo(9, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Sails hub
  const hubX = 0, hubY = -8;
  // Continuous rotation: the static icon's 0.35 base tilt + time-based spin.
  const spin = 0.35 + t * 0.7;
  ctx.save();
  ctx.translate(hubX, hubY);
  ctx.rotate(spin);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i / 4) * TAU);
    // Spar
    ctx.strokeStyle = "#5a3414";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -20);
    ctx.stroke();
    // Blade cloth
    ctx.fillStyle = "rgba(244,236,214,0.92)";
    ctx.beginPath();
    ctx.moveTo(0.5, -3);
    ctx.lineTo(5, -3);
    ctx.lineTo(5, -19);
    ctx.lineTo(0.5, -19);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7a5a30";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Lattice lines
    ctx.strokeStyle = "rgba(122,90,48,0.6)";
    ctx.lineWidth = 0.6;
    [-7, -11, -15].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0.5, y); ctx.lineTo(5, y);
      ctx.stroke();
    });
    ctx.restore();
  }
  ctx.restore();
  // Hub cap
  ctx.fillStyle = "#3a2810";
  ctx.beginPath();
  ctx.arc(hubX, hubY, 2.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// 3. Watermill — wheel turns, droplets fall off it, the stream ripples.
// ---------------------------------------------------------------------------
function animWatermill(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 22, 4);
  // Mill building
  const wall = ctx.createLinearGradient(-14, 0, 14, 0);
  wall.addColorStop(0, "#e4dcc4");
  wall.addColorStop(0.5, "#cbbf98");
  wall.addColorStop(1, "#a8966a");
  ctx.fillStyle = wall;
  rr(ctx, -16, -6, 24, 28, 2);
  ctx.fill();
  ctx.strokeStyle = "#6a5a38";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Timber framing
  ctx.strokeStyle = "rgba(90,60,30,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, 8); ctx.lineTo(8, 8);
  ctx.moveTo(-4, -6); ctx.lineTo(-4, 22);
  ctx.moveTo(-16, -6); ctx.lineTo(-4, 8);
  ctx.stroke();
  // Peaked roof
  const roof = ctx.createLinearGradient(0, -20, 0, -4);
  roof.addColorStop(0, "#9a4a30");
  roof.addColorStop(1, "#5a2414");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-19, -4);
  ctx.lineTo(-4, -20);
  ctx.lineTo(11, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Roof shingles
  ctx.strokeStyle = "rgba(58,24,8,0.5)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-15, -7); ctx.lineTo(7, -7);
  ctx.moveTo(-10, -13); ctx.lineTo(2, -13);
  ctx.stroke();
  // Glowing window
  drawWindow(ctx, -12, 2, 8, 8, flicker(t, 2.2));
  // Mill race / water chute (right side)
  ctx.fillStyle = "#5a82a0";
  ctx.beginPath();
  ctx.moveTo(8, 6);
  ctx.lineTo(20, 6);
  ctx.lineTo(20, 9);
  ctx.lineTo(8, 9);
  ctx.closePath();
  ctx.fill();

  // Water wheel on the side — rotating.
  const wcx = 16, wcy = 12, wr = 9;
  const wheelSpin = t * 1.4;
  ctx.fillStyle = "#7a4a1e";
  ctx.beginPath();
  ctx.arc(wcx, wcy, wr, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(wcx, wcy);
  ctx.rotate(wheelSpin);
  // Spokes + paddles
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const ex = Math.cos(a) * wr;
    const ey = Math.sin(a) * wr;
    ctx.strokeStyle = "#3a1e08";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // paddle — a short quad at the rim, just clockwise of the spoke
    ctx.fillStyle = "#8a5424";
    const a2 = a + 0.2;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(Math.cos(a2) * wr, Math.sin(a2) * wr);
    ctx.lineTo(Math.cos(a2) * wr * 0.78, Math.sin(a2) * wr * 0.78);
    ctx.lineTo(Math.cos(a) * wr * 0.78, Math.sin(a) * wr * 0.78);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Inner hub (fixed, on top)
  ctx.fillStyle = "#a8703a";
  ctx.beginPath();
  ctx.arc(wcx, wcy, 2.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Falling water droplets — shed from the wheel's lifting side, looping.
  ctx.fillStyle = "rgba(150,210,230,0.85)";
  const dropPeriod = 1.0;
  for (let i = 0; i < 3; i++) {
    const life = ((t / dropPeriod) + i / 3) % 1;
    const dx = 22 + i * 1.0 - i * 0.0;
    const dy = 14 + life * 9;
    const r = 1.4 - life * 0.5;
    ctx.globalAlpha = 0.85 * (1 - life * 0.7);
    ctx.beginPath();
    ctx.arc(dx + Math.sin(life * 6 + i) * 0.6, dy, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Stream ripples below the wheel — gentle horizontal shimmer.
  ctx.strokeStyle = "rgba(150,210,230,0.55)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const ry = 21 + i * 1.4;
    const ph = t * 2.2 + i;
    const cx = 14 + i * 2;
    ctx.beginPath();
    ctx.moveTo(cx - 4, ry + Math.sin(ph) * 0.6);
    ctx.quadraticCurveTo(cx, ry - 1.6 + Math.sin(ph) * 0.6, cx + 4, ry + Math.sin(ph) * 0.6);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// 4. Church — bell swings, bell opening + door glow, soft sound-wave on swing.
// ---------------------------------------------------------------------------
function animChurch(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 20, 4);
  // Steeple tower (left)
  const tower = ctx.createLinearGradient(-18, 0, -4, 0);
  tower.addColorStop(0, "#e4dcc4");
  tower.addColorStop(1, "#b6a880");
  ctx.fillStyle = tower;
  rr(ctx, -18, -10, 14, 32, 2);
  ctx.fill();
  ctx.strokeStyle = "#6a5a38";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Nave (right)
  const nave = ctx.createLinearGradient(-4, 0, 18, 0);
  nave.addColorStop(0, "#ece4cc");
  nave.addColorStop(1, "#c4b68c");
  ctx.fillStyle = nave;
  rr(ctx, -4, 2, 22, 20, 2);
  ctx.fill();
  ctx.strokeStyle = "#6a5a38";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Nave roof
  ctx.fillStyle = "#7a8088";
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(7, -6);
  ctx.lineTo(20, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Spire
  const spire = ctx.createLinearGradient(0, -28, 0, -10);
  spire.addColorStop(0, "#8e949c");
  spire.addColorStop(1, "#4e545c");
  ctx.fillStyle = spire;
  ctx.beginPath();
  ctx.moveTo(-18, -10);
  ctx.lineTo(-11, -28);
  ctx.lineTo(-4, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a2e34";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Cross atop spire
  ctx.strokeStyle = "#f0d060";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11, -28); ctx.lineTo(-11, -34);
  ctx.moveTo(-14, -31); ctx.lineTo(-8, -31);
  ctx.stroke();

  // Bell opening in tower (glowing) — warm flicker.
  const lit = flicker(t, 0.7);
  const bellGlow = ctx.createLinearGradient(0, -6, 0, 2);
  bellGlow.addColorStop(0, "#fff2b8");
  bellGlow.addColorStop(1, "#cc7a20");
  ctx.save();
  ctx.globalAlpha = lit;
  ctx.fillStyle = bellGlow;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.lineTo(-15, -4);
  ctx.arc(-11, -4, 4, Math.PI, 0, false);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.lineTo(-15, -4);
  ctx.arc(-11, -4, 4, Math.PI, 0, false);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.stroke();

  // Swinging bell — pivots about its yoke at the top of the opening (-5).
  const swing = Math.sin(t * 2.4) * 0.28;
  ctx.save();
  ctx.translate(-11, -5);
  ctx.rotate(swing);
  ctx.fillStyle = "#caa238";
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.bezierCurveTo(-2, 0, 2, 0, 2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a6818";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Clapper dot
  ctx.fillStyle = "#6a4a10";
  ctx.beginPath();
  ctx.arc(0, 4.2, 0.7, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Sound-wave arc on the swing — fades with the bell at the extremes of motion.
  const ring = Math.abs(Math.sin(t * 2.4)); // 0 at center, 1 at the swing extremes
  ctx.strokeStyle = `rgba(240,220,150,${0.35 * ring})`;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 2; i++) {
    const rad = 6 + i * 3 + ring * 2;
    ctx.beginPath();
    ctx.arc(-11, -4, rad, -2.4, -0.7);
    ctx.stroke();
  }

  // Arched glowing door — flicker.
  const dlit = flicker(t, 3.4);
  const door = ctx.createLinearGradient(0, 8, 0, 22);
  door.addColorStop(0, "#fff0b0");
  door.addColorStop(1, "#c47820");
  ctx.save();
  ctx.globalAlpha = dlit;
  ctx.fillStyle = door;
  ctx.beginPath();
  ctx.moveTo(3, 22);
  ctx.lineTo(3, 12);
  ctx.arc(7, 12, 4, Math.PI, 0, false);
  ctx.lineTo(11, 22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(3, 22);
  ctx.lineTo(3, 12);
  ctx.arc(7, 12, 4, Math.PI, 0, false);
  ctx.lineTo(11, 22);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(7, 8); ctx.lineTo(7, 22);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// 5. Castle — flag waves in the wind; tower windows flicker.
// ---------------------------------------------------------------------------
function animCastle(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 22, 4);
  const stone = (x0: number, x1: number): CanvasGradient => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#b8bec6");
    g.addColorStop(0.5, "#8e949c");
    g.addColorStop(1, "#5e646c");
    return g;
  };
  const crenellate = (x: number, w: number, y: number, fill: CanvasGradient): void => {
    const teeth = 4;
    const tw = w / (teeth * 2 - 1);
    for (let i = 0; i < teeth; i++) {
      const tx = x + i * tw * 2;
      ctx.fillStyle = fill;
      rr(ctx, tx, y - 4, tw, 5, 0.6);
      ctx.fill();
      ctx.strokeStyle = "#3a3e44";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  };
  // Central keep
  ctx.fillStyle = stone(-9, 9);
  rr(ctx, -9, -8, 18, 30, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Left tower
  ctx.fillStyle = stone(-20, -10);
  rr(ctx, -20, 0, 11, 22, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Right tower
  ctx.fillStyle = stone(9, 20);
  rr(ctx, 9, 0, 11, 22, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Battlements
  crenellate(-20, 11, 0, stone(-20, -10));
  crenellate(9, 11, 0, stone(9, 20));
  crenellate(-9, 18, -8, stone(-9, 9));
  // Stone courses
  ctx.strokeStyle = "rgba(58,62,68,0.45)";
  ctx.lineWidth = 0.6;
  [4, 11, 18].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-20, y); ctx.lineTo(20, y);
    ctx.stroke();
  });
  // Flag on a pole atop the keep — waving banner built from segments.
  ctx.strokeStyle = "#5a5e66";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(0, -24);
  ctx.stroke();
  // Build a wavy triangular pennant: top & bottom edges share a flutter offset
  // that grows toward the flying end and drifts over time.
  const segs = 6;
  const len = 10;
  const topPts: Array<[number, number]> = [];
  const botPts: Array<[number, number]> = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const x = f * len;
    const wave = Math.sin(f * 4 - t * 5) * 1.6 * f; // amplitude grows toward tip
    const half = 3 * (1 - f);                        // taper to a point
    topPts.push([x, -24 + wave - half]);
    botPts.push([x, -24 + wave + half]);
  }
  ctx.fillStyle = "#d23a2a";
  ctx.beginPath();
  ctx.moveTo(topPts[0][0], topPts[0][1]);
  for (let i = 1; i <= segs; i++) ctx.lineTo(topPts[i][0], topPts[i][1]);
  for (let i = segs; i >= 0; i--) ctx.lineTo(botPts[i][0], botPts[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a1408";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Highlight band along the upper half of the banner.
  ctx.fillStyle = "rgba(255,180,160,0.5)";
  ctx.beginPath();
  ctx.moveTo(topPts[0][0], topPts[0][1] + 0.6);
  for (let i = 1; i <= segs; i++) ctx.lineTo(topPts[i][0], topPts[i][1] + 0.6);
  for (let i = segs; i >= 0; i--) {
    const mid = (topPts[i][1] + botPts[i][1]) / 2;
    ctx.lineTo(topPts[i][0], mid);
  }
  ctx.closePath();
  ctx.fill();
  // Arched gate (dark portcullis)
  ctx.fillStyle = "#2a2e34";
  ctx.beginPath();
  ctx.moveTo(-5, 22);
  ctx.lineTo(-5, 8);
  ctx.arc(0, 8, 5, Math.PI, 0, false);
  ctx.lineTo(5, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Portcullis grid
  ctx.strokeStyle = "rgba(120,124,132,0.7)";
  ctx.lineWidth = 0.8;
  [-2.5, 0, 2.5].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 5); ctx.lineTo(x, 22);
    ctx.stroke();
  });
  [12, 17].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-5, y); ctx.lineTo(5, y);
    ctx.stroke();
  });
  // Glowing tower windows — flicker, each slightly out of phase.
  const wins: Array<[number, number, number]> = [[-14.5, 8, 0.5], [13.5, 8, 2.0]];
  wins.forEach(([x, y, ph]) => {
    ctx.save();
    ctx.globalAlpha = flicker(t, ph);
    ctx.fillStyle = "#ffd368";
    rr(ctx, x - 1.6, y, 3.2, 4.5, 1);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#5a3414";
    ctx.lineWidth = 0.8;
    rr(ctx, x - 1.6, y, 3.2, 4.5, 1);
    ctx.stroke();
  });
}

// ---------------------------------------------------------------------------
// 6. Tent — pennant flutters, striped awning ripples, interior glow pulses.
// ---------------------------------------------------------------------------
function animTent(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 22, 4);
  const apexX = 0, apexY = -22;
  const leftX = -20, rightX = 20, baseY = 18;
  const stripeColors = ["#e8e2d4", "#cc4a3a"];
  const segs = 8;
  // Gentle breeze ripple along the canopy base — offsets the base points.
  const ripple = (x: number): number => Math.sin(x * 0.32 - t * 2.6) * 1.1;
  for (let i = 0; i < segs; i++) {
    const f0 = i / segs;
    const f1 = (i + 1) / segs;
    const bx0 = leftX + (rightX - leftX) * f0;
    const bx1 = leftX + (rightX - leftX) * f1;
    ctx.fillStyle = stripeColors[i % 2];
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(bx0, baseY + ripple(bx0));
    ctx.lineTo(bx1, baseY + ripple(bx1));
    ctx.closePath();
    ctx.fill();
  }
  // Canopy outline (follows the ripple at the base corners)
  ctx.strokeStyle = "#7a2418";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(leftX, baseY + ripple(leftX));
  ctx.lineTo(rightX, baseY + ripple(rightX));
  ctx.closePath();
  ctx.stroke();
  // Scalloped lower trim — rippling.
  ctx.fillStyle = "#cc4a3a";
  ctx.beginPath();
  ctx.moveTo(leftX, baseY + ripple(leftX));
  for (let x = leftX; x < rightX; x += 5) {
    ctx.quadraticCurveTo(x + 2.5, baseY + 4 + ripple(x + 2.5), x + 5, baseY + ripple(x + 5));
  }
  ctx.lineTo(rightX, baseY + ripple(rightX));
  ctx.lineTo(rightX, baseY - 2);
  ctx.lineTo(leftX, baseY - 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a2418";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Open dark interior
  ctx.fillStyle = "#3a2a22";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 18);
  ctx.lineTo(-8, 18);
  ctx.closePath();
  ctx.fill();
  // Warm glow inside the opening — pulses softly.
  const pulse = 0.5 + (flicker(t, 1.5) - 0.91) / 0.09 * 0.3; // ~0.5..0.8
  const glow = ctx.createRadialGradient(0, 8, 1, 0, 8, 10);
  glow.addColorStop(0, `rgba(255,205,100,${pulse})`);
  glow.addColorStop(1, "rgba(255,205,100,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 18);
  ctx.lineTo(-6, 18);
  ctx.closePath();
  ctx.fill();
  // Tied-back left flap
  ctx.fillStyle = "#d8d0c0";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-8, 18);
  ctx.lineTo(-13, 18);
  ctx.bezierCurveTo(-7, 6, -5, -4, -2, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a3a2a";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Flap tie
  ctx.strokeStyle = "#7a2418";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-8, 6, 2, 0, TAU);
  ctx.stroke();
  // Apex pole
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(0, -30);
  ctx.stroke();
  // Fluttering pennant — wavy triangular flag.
  const plen = 8;
  const pseg = 5;
  const ptop: Array<[number, number]> = [];
  const pbot: Array<[number, number]> = [];
  for (let i = 0; i <= pseg; i++) {
    const f = i / pseg;
    const x = f * plen;
    const wave = Math.sin(f * 4.5 - t * 6) * 1.4 * f;
    const half = 2 * (1 - f);
    ptop.push([x, -30 + wave - half]);
    pbot.push([x, -30 + wave + half]);
  }
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.moveTo(ptop[0][0], ptop[0][1]);
  for (let i = 1; i <= pseg; i++) ctx.lineTo(ptop[i][0], ptop[i][1]);
  for (let i = pseg; i >= 0; i--) ctx.lineTo(pbot[i][0], pbot[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87818";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Apex ball
  ctx.fillStyle = "#8a5424";
  ctx.beginPath();
  ctx.arc(0, -22, 2, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 7. Market stall — awning scallops ripple; a sparkle drifts over the goods.
// ---------------------------------------------------------------------------
function animMarketStall(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 22, 4);
  // Back posts
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-16, -8); ctx.lineTo(-16, 22);
  ctx.moveTo(16, -8); ctx.lineTo(16, 22);
  ctx.stroke();
  // Counter
  const counter = ctx.createLinearGradient(0, 8, 0, 22);
  counter.addColorStop(0, "#b87a3a");
  counter.addColorStop(1, "#6a4218");
  ctx.fillStyle = counter;
  rr(ctx, -18, 8, 36, 14, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Counter top board
  ctx.fillStyle = "#8a5424";
  rr(ctx, -19, 6, 38, 4, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Goods crates on counter
  ctx.fillStyle = "#9a6a30";
  rr(ctx, -14, 1, 9, 6, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Apples in a crate
  ["#d23a2a", "#e85a3a", "#c82820"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(-12.5 + i * 3, 1, 2, 0, TAU);
    ctx.fill();
  });
  // Bread loaves
  ctx.fillStyle = "#d8a860";
  [[6, 4], [11, 4]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 3.4, 2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#8a5a20";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Drifting sparkle over the goods — a tiny four-point star that travels across
  // the counter, twinkling (size keyed to a faster sine).
  const sx = -10 + ((t * 5) % 22);
  const sTw = 0.5 + 0.5 * Math.sin(t * 9);
  const sSize = 1.6 + sTw * 1.4;
  ctx.save();
  ctx.globalAlpha = 0.55 + sTw * 0.45;
  ctx.fillStyle = "#fff6d0";
  ctx.translate(sx, 2.4);
  ctx.beginPath();
  ctx.moveTo(0, -sSize);
  ctx.lineTo(sSize * 0.28, -sSize * 0.28);
  ctx.lineTo(sSize, 0);
  ctx.lineTo(sSize * 0.28, sSize * 0.28);
  ctx.lineTo(0, sSize);
  ctx.lineTo(-sSize * 0.28, sSize * 0.28);
  ctx.lineTo(-sSize, 0);
  ctx.lineTo(-sSize * 0.28, -sSize * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Striped awning — scalloped lower edge ripples in the breeze.
  const stripes = ["#e8e2d4", "#d23a2a"];
  const segW = 6.4;
  for (let i = 0; i < 6; i++) {
    const x0 = -19 + i * segW;
    const scallop = 1 + Math.sin(t * 3 + i * 0.9) * 1.4; // dip depth varies per segment
    ctx.fillStyle = stripes[i % 2];
    ctx.beginPath();
    ctx.moveTo(x0, -10);
    ctx.lineTo(x0 + segW, -10);
    ctx.lineTo(x0 + segW, -3);
    ctx.quadraticCurveTo(x0 + segW / 2, scallop, x0, -3);
    ctx.closePath();
    ctx.fill();
  }
  // Awning top board
  ctx.fillStyle = "#8a5424";
  rr(ctx, -20, -13, 40, 4, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Awning outline
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-19, -10); ctx.lineTo(19, -10);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// 8. Barn — hayloft window glow flickers warmly; a slow weathervane turns.
//    Restrained: just the glow + a tiny vane spin.
// ---------------------------------------------------------------------------
function animBarn(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 22, 4);
  // Red walls
  const wall = ctx.createLinearGradient(-18, 0, 18, 0);
  wall.addColorStop(0, "#d2503a");
  wall.addColorStop(0.5, "#b03224");
  wall.addColorStop(1, "#7a1c12");
  ctx.fillStyle = wall;
  rr(ctx, -18, -2, 36, 24, 2);
  ctx.fill();
  ctx.strokeStyle = "#4a0e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Gambrel roof
  const roof = ctx.createLinearGradient(0, -22, 0, -2);
  roof.addColorStop(0, "#9a3024");
  roof.addColorStop(1, "#5a1408");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-20, -2);
  ctx.lineTo(-14, -12);
  ctx.lineTo(0, -22);
  ctx.lineTo(14, -12);
  ctx.lineTo(20, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0c04";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Roof shingle lines
  ctx.strokeStyle = "rgba(58,12,4,0.45)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-17, -6); ctx.lineTo(17, -6);
  ctx.moveTo(-12, -13); ctx.lineTo(12, -13);
  ctx.stroke();

  // Tiny weathervane atop the peak — slow, restrained turn.
  const vAng = Math.sin(t * 0.5) * 0.5; // gentle back-and-forth, like shifting wind
  ctx.save();
  ctx.translate(0, -22);
  ctx.strokeStyle = "#3a0c04";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, -4);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -4);
  ctx.rotate(vAng);
  ctx.strokeStyle = "#2a0a04";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.lineTo(3, 0);
  ctx.stroke();
  // little arrow head
  ctx.fillStyle = "#2a0a04";
  ctx.beginPath();
  ctx.moveTo(3, 0);
  ctx.lineTo(1.4, -1.2);
  ctx.lineTo(1.4, 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Hayloft window (glowing, up under peak) — warm flicker.
  const lit = flicker(t, 0.9);
  const loft = ctx.createRadialGradient(0, -9, 1, 0, -9, 5);
  loft.addColorStop(0, "#fff2b8");
  loft.addColorStop(1, "#e89a30");
  ctx.save();
  ctx.globalAlpha = lit;
  ctx.fillStyle = loft;
  ctx.beginPath();
  ctx.moveTo(-4, -5);
  ctx.lineTo(0, -11);
  ctx.lineTo(4, -5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#4a0e08";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4, -5);
  ctx.lineTo(0, -11);
  ctx.lineTo(4, -5);
  ctx.closePath();
  ctx.stroke();

  // Big double doors
  const door = ctx.createLinearGradient(-11, 0, 11, 0);
  door.addColorStop(0, "#e6cda0");
  door.addColorStop(0.5, "#cbb280");
  door.addColorStop(1, "#a88a58");
  ctx.fillStyle = door;
  rr(ctx, -11, 4, 22, 18, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Door split + X-trim
  ctx.strokeStyle = "#6a4420";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.lineTo(0, 22);
  ctx.moveTo(-10, 5); ctx.lineTo(-1, 14);
  ctx.moveTo(-1, 5); ctx.lineTo(-10, 14);
  ctx.moveTo(1, 5); ctx.lineTo(10, 14);
  ctx.moveTo(10, 5); ctx.lineTo(1, 14);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// 9. Tower — arched window glow flickers/pulses warmly (candle inside). Subtle.
// ---------------------------------------------------------------------------
function animTower(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 14, 4);
  // Stone column
  const stone = ctx.createLinearGradient(-9, 0, 9, 0);
  stone.addColorStop(0, "#b6bcc2");
  stone.addColorStop(0.5, "#8e949c");
  stone.addColorStop(1, "#5e646c");
  ctx.fillStyle = stone;
  rr(ctx, -9, -10, 18, 32, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Stone block courses (offset brickwork)
  ctx.strokeStyle = "rgba(58,62,68,0.5)";
  ctx.lineWidth = 0.7;
  for (let row = 0; row < 5; row++) {
    const y = -6 + row * 6;
    ctx.beginPath();
    ctx.moveTo(-9, y); ctx.lineTo(9, y);
    ctx.stroke();
    const off = row % 2 === 0 ? -3 : 3;
    ctx.beginPath();
    ctx.moveTo(off, y); ctx.lineTo(off, y + 6);
    ctx.stroke();
  }
  // Conical roof
  const roof = ctx.createLinearGradient(0, -28, 0, -10);
  roof.addColorStop(0, "#4a6cc0");
  roof.addColorStop(1, "#23386e");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(0, -28);
  ctx.lineTo(12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16223e";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Roof highlight + tiles
  ctx.strokeStyle = "rgba(180,200,255,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, -12);
  ctx.lineTo(-1, -24);
  ctx.stroke();
  // Finial ball
  ctx.fillStyle = "#f0d060";
  ctx.beginPath();
  ctx.arc(0, -29, 2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8a6818";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Small arched glowing window — candle inside, gentle warm pulse + soft halo.
  const lit = flicker(t, 0.2);
  // Soft warm halo that breathes with the candle.
  const halo = ctx.createRadialGradient(0, 3, 1, 0, 3, 9);
  halo.addColorStop(0, `rgba(255,210,120,${0.28 * lit})`);
  halo.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 3, 9, 0, TAU);
  ctx.fill();

  const glow = ctx.createLinearGradient(0, -2, 0, 9);
  glow.addColorStop(0, "#fff2b8");
  glow.addColorStop(1, "#e89a30");
  ctx.save();
  ctx.globalAlpha = lit;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-4, 9);
  ctx.lineTo(-4, 0);
  ctx.arc(0, 0, 4, Math.PI, 0, false);
  ctx.lineTo(4, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, 9);
  ctx.lineTo(-4, 0);
  ctx.arc(0, 0, 4, Math.PI, 0, false);
  ctx.lineTo(4, 9);
  ctx.closePath();
  ctx.stroke();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  bld_cottage: animCottage,
  bld_windmill: animWindmill,
  bld_watermill: animWatermill,
  bld_church: animChurch,
  bld_castle: animCastle,
  bld_tent: animTent,
  bld_market_stall: animMarketStall,
  bld_barn: animBarn,
  bld_tower: animTower,
};
