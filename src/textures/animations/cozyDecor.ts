// Animated cozy home & town decorations.
//
// Self-contained Canvas-2D animation fns (no imports / no shared exports).
// Each fn redraws the COMPLETE icon at time `t` (elapsed seconds), centered at
// origin (0,0) within a roughly -24..+24 box. The caller handles clear / save /
// translate / scale / lineCap / restore. Motion is derived purely from `t` and
// from indices (no Math.random) so frames are deterministic, and loops are made
// seamless via Math.sin/cos and modulo.

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

// ---------------------------------------------------------------------------
// 1. Lantern — flame flickers, glow pulses, whole lantern sways as if hanging.
// ---------------------------------------------------------------------------
function animLantern(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 12, 3);

  // Gentle hanging sway, pivoting about the hook at top (-22).
  const sway = Math.sin(t * 1.1) * 0.07; // radians

  // Hook ring + bar are fixed (the mount); the lantern body swings below.
  ctx.strokeStyle = "#3a3d44";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -22, 3, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -19);
  ctx.lineTo(0, -16);
  ctx.stroke();

  ctx.save();
  ctx.translate(0, -22);
  ctx.rotate(sway);
  ctx.translate(0, 22);

  // Flame flicker — height + horizontal wobble + brightness.
  const flick = Math.sin(t * 11) * 0.5 + Math.sin(t * 17 + 1.3) * 0.3 + Math.sin(t * 5 + 0.6) * 0.2;
  const flameH = 6 + flick * 1.6;     // taller/shorter
  const flameWob = Math.sin(t * 9 + 0.4) * 0.9; // tip lean
  const glowPulse = 0.55 + flick * 0.18;

  // Warm glow halo behind glass (pulses with flame).
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
  glow.addColorStop(0, `rgba(255,200,90,${(glowPulse).toFixed(3)})`);
  glow.addColorStop(1, "rgba(255,200,90,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, TAU);
  ctx.fill();

  // Top cap — metal trapezoid.
  const cap = ctx.createLinearGradient(0, -16, 0, -10);
  cap.addColorStop(0, "#b8bcc4");
  cap.addColorStop(1, "#5a5e66");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(-9, -10);
  ctx.lineTo(-5, -16);
  ctx.lineTo(5, -16);
  ctx.lineTo(9, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a2d33";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Glass housing — warm panes.
  const glass = ctx.createLinearGradient(0, -10, 0, 14);
  glass.addColorStop(0, "#ffe9a8");
  glass.addColorStop(0.5, "#ffc862");
  glass.addColorStop(1, "#e89030");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-9, -10);
  ctx.lineTo(9, -10);
  ctx.lineTo(8, 12);
  ctx.lineTo(-8, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Candle inside.
  ctx.fillStyle = "#fff6e0";
  rr(ctx, -2.4, -2, 4.8, 12, 1);
  ctx.fill();
  ctx.strokeStyle = "#d8b878";
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Flame — base at -2 (candle top), tip rises by flameH and wobbles.
  const tipX = flameWob;
  const tipY = -2 - flameH;
  const flame = ctx.createLinearGradient(0, tipY, 0, -2);
  flame.addColorStop(0, "#fffbe0");
  flame.addColorStop(0.5, "#ffd24a");
  flame.addColorStop(1, "#e8701a");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.bezierCurveTo(tipX + 3, tipY + 3, 2.5, -3, 0, -2.6);
  ctx.bezierCurveTo(-2.5, -3, tipX - 3, tipY + 3, tipX, tipY);
  ctx.closePath();
  ctx.fill();
  // Inner bright core.
  ctx.fillStyle = `rgba(255,250,220,${(0.7 + flick * 0.2).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(tipX * 0.5, -3.5, 1, 1.8 + flick * 0.4, 0, 0, TAU);
  ctx.fill();

  // Frame uprights + crossbars over glass.
  ctx.strokeStyle = "#6a4818";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3, -10); ctx.lineTo(-2.6, 12);
  ctx.moveTo(3, -10); ctx.lineTo(2.6, 12);
  ctx.moveTo(-9, 1); ctx.lineTo(9, 1);
  ctx.stroke();

  // Metal base ring.
  ctx.fillStyle = "#5a5e66";
  rr(ctx, -9, 12, 18, 3, 1);
  ctx.fill();
  ctx.strokeStyle = "#2a2d33";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Glass highlight.
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-5, 2, 1.4, 6, -0.2, 0, TAU);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. Street lamp — head glow flickers/pulses; a moth-spark orbits the head.
// ---------------------------------------------------------------------------
function animStreetLamp(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 12, 4);

  // Base.
  ctx.fillStyle = "#3a3d44";
  ctx.beginPath();
  ctx.moveTo(-8, 22);
  ctx.lineTo(-5, 16);
  ctx.lineTo(5, 16);
  ctx.lineTo(8, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Post.
  const post = ctx.createLinearGradient(-3, 0, 3, 0);
  post.addColorStop(0, "#5a5e66");
  post.addColorStop(0.5, "#2e3137");
  post.addColorStop(1, "#16181c");
  ctx.fillStyle = post;
  rr(ctx, -2.6, -10, 5.2, 27, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Decorative collars.
  ctx.fillStyle = "#4a4d54";
  [-6, 4, 12].forEach((y) => {
    rr(ctx, -3.6, y, 7.2, 2, 0.8);
    ctx.fill();
    ctx.strokeStyle = "#16181c";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });

  // Post highlight.
  ctx.strokeStyle = "rgba(180,184,196,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-1.2, -8); ctx.lineTo(-1.2, 15);
  ctx.stroke();

  // Cross arm bracket.
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-4, -12, -5, -14, -3, -16);
  ctx.stroke();

  // Warm glow halo — flickers (lazy gas-lamp pulse).
  const flick = Math.sin(t * 3.1) * 0.5 + Math.sin(t * 7.7 + 0.9) * 0.3 + Math.sin(t * 1.7) * 0.2;
  const glowA = 0.5 + flick * 0.18;
  const glowR = 16 + flick * 1.4;
  const glow = ctx.createRadialGradient(0, -18, 2, 0, -18, glowR);
  glow.addColorStop(0, `rgba(255,205,100,${glowA.toFixed(3)})`);
  glow.addColorStop(1, "rgba(255,205,100,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -18, glowR, 0, TAU);
  ctx.fill();

  // Lantern head cap (top).
  ctx.fillStyle = "#2e3137";
  ctx.beginPath();
  ctx.moveTo(-7, -22);
  ctx.lineTo(0, -28);
  ctx.lineTo(7, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Finial.
  ctx.fillStyle = "#4a4d54";
  ctx.beginPath();
  ctx.arc(0, -29, 1.6, 0, TAU);
  ctx.fill();

  // Glass head — glowing, brightness tracks the flicker.
  const lift = flick * 0.12;
  const glass = ctx.createLinearGradient(0, -22, 0, -12);
  glass.addColorStop(0, `rgba(255,240,184,${(0.92 + lift).toFixed(3)})`);
  glass.addColorStop(0.5, "#ffcc62");
  glass.addColorStop(1, "#e89530");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-7, -22);
  ctx.lineTo(7, -22);
  ctx.lineTo(6, -12);
  ctx.lineTo(-6, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Frame mullions.
  ctx.strokeStyle = "#3a2c10";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(0, -12);
  ctx.moveTo(-7, -17); ctx.lineTo(7, -17);
  ctx.stroke();

  // Glass highlight.
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-3, -18, 1.2, 3.5, -0.2, 0, TAU);
  ctx.fill();

  // Base ring under head.
  ctx.fillStyle = "#2e3137";
  rr(ctx, -7, -12, 14, 2.4, 1);
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Moth-like spark orbiting the head (seamless loop).
  const ma = t * 1.6;
  const mx = Math.cos(ma) * 11;
  const my = -18 + Math.sin(ma * 1.3) * 6;
  const mFlit = 0.5 + (Math.sin(t * 13) * 0.5 + 0.5) * 0.5;
  ctx.fillStyle = `rgba(255,240,190,${mFlit.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(mx, my, 1.1, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 3. Fountain — water arcs flow, pool ripples, droplets rise & fall in a loop.
// ---------------------------------------------------------------------------
function animFountain(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 22, 4);

  // Lower stone basin.
  ctx.fillStyle = "#aaa89c";
  ctx.beginPath();
  ctx.moveTo(-22, 12);
  ctx.lineTo(-18, 22);
  ctx.lineTo(18, 22);
  ctx.lineTo(22, 12);
  ctx.bezierCurveTo(14, 16, -14, 16, -22, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Basin mortar lines.
  ctx.strokeStyle = "rgba(58,56,48,0.5)";
  ctx.lineWidth = 0.6;
  [-12, -4, 4, 12].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 14); ctx.lineTo(x + 1, 21);
    ctx.stroke();
  });

  // Pool water — gently ripples (vertical squash + drifting highlight).
  const ripple = Math.sin(t * 2.2);
  ctx.fillStyle = "#79c4d8";
  ctx.beginPath();
  ctx.ellipse(0, 12, 20, 3.2 + ripple * 0.4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a7888";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Two travelling ripple highlights for a "live water" feel.
  for (let i = 0; i < 2; i++) {
    const phase = (t * 0.6 + i * 0.5) % 1;
    const hx = -16 + phase * 32;
    const ha = Math.sin(phase * Math.PI) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${ha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(hx, 11.4, 5, 0.9, 0, 0, TAU);
    ctx.fill();
  }

  // Central pillar.
  ctx.fillStyle = "#9d9a90";
  rr(ctx, -5, -2, 10, 14, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Upper tier dish.
  ctx.fillStyle = "#bbb8ae";
  ctx.beginPath();
  ctx.ellipse(0, -4, 11, 3.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Upper dish water (small ripple).
  ctx.fillStyle = "#79c4d8";
  ctx.beginPath();
  ctx.ellipse(0, -5, 8, 2 + Math.sin(t * 2.6 + 1) * 0.3, 0, 0, TAU);
  ctx.fill();

  // Spout.
  ctx.fillStyle = "#9d9a90";
  rr(ctx, -2, -14, 4, 10, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Water arcs — sway and "pulse" along their length (flowing feel).
  const flow = Math.sin(t * 3) * 1.2;
  ctx.strokeStyle = "rgba(150,210,230,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(-8 + flow, -18, -12 + flow, -10, -10 + flow, -4);
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(8 - flow, -18, 12 - flow, -10, 10 - flow, -4);
  ctx.stroke();
  // Brighter beads travelling down each arc.
  for (let i = 0; i < 3; i++) {
    const p = (t * 1.1 + i / 3) % 1;
    // quadratic-ish param along the left arc.
    const lx = (1 - p) * (1 - p) * 0 + 2 * (1 - p) * p * (-12 + flow) + p * p * (-10 + flow);
    const ly = (1 - p) * (1 - p) * -14 + 2 * (1 - p) * p * -10 + p * p * -4;
    const rxp = (1 - p) * (1 - p) * 0 + 2 * (1 - p) * p * (12 - flow) + p * p * (10 - flow);
    ctx.fillStyle = "rgba(200,235,245,0.85)";
    ctx.beginPath();
    ctx.arc(lx, ly, 1, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rxp, ly, 1, 0, TAU);
    ctx.fill();
  }

  // Splash droplets — rise then fall on a seamless loop (parabolic).
  const drops: Array<[number, number, number]> = [
    [-10, -2, 0],
    [10, -2, 0.33],
    [-13, 8, 0.66],
    [12, 8, 0.5],
    [0, -18, 0.16],
  ];
  ctx.fillStyle = "#bce8f2";
  drops.forEach(([bx, by, off]) => {
    const p = (t * 0.9 + off) % 1;        // 0..1
    const hop = Math.sin(p * Math.PI);     // 0..1..0
    const dy = by - hop * 4;               // rise up then settle
    const r = 1.2 + hop * 0.3;
    ctx.globalAlpha = 0.4 + hop * 0.6;
    ctx.beginPath();
    ctx.arc(bx, dy, r, 0, TAU);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// 4. Wind chime — disc/tubes sway side to side; tubes lag in phase; clapper swings.
// ---------------------------------------------------------------------------
function animWindChime(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 10, 3);

  // Overall sway about the hook at top (-23).
  const sway = Math.sin(t * 1.4) * 0.09;

  // Cord + hook ring are fixed; everything below swings.
  ctx.strokeStyle = "#5a5e66";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -23, 2.4, 0, TAU);
  ctx.stroke();

  ctx.save();
  ctx.translate(0, -23);
  ctx.rotate(sway);
  ctx.translate(0, 23);

  // Hanging cord (from hook down to disc).
  ctx.strokeStyle = "#8a6030";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, -14);
  ctx.stroke();

  // Top disc (wood).
  const disc = ctx.createLinearGradient(0, -16, 0, -12);
  disc.addColorStop(0, "#c89858");
  disc.addColorStop(1, "#8a5a28");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.ellipse(0, -13, 12, 4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,224,170,0.45)";
  ctx.beginPath();
  ctx.ellipse(-4, -14, 4, 1, 0, 0, TAU);
  ctx.fill();

  // Dangling tubes — each swings about its hang point with a slight phase offset.
  const tubes: Array<[number, number]> = [[-9, 12], [-4.5, 16], [0, 18], [4.5, 16], [9, 12]];
  tubes.forEach(([x, len], i) => {
    const top = -10;
    const tubeSwing = Math.sin(t * 2.6 + i * 0.7) * 0.13; // per-tube phase
    ctx.save();
    ctx.translate(x, top);
    ctx.rotate(tubeSwing);

    // String to tube.
    ctx.strokeStyle = "rgba(90,90,90,0.6)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo((x * 0.4 - x), -2);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Tube.
    const g = ctx.createLinearGradient(-2, 0, 2, 0);
    g.addColorStop(0, "#d4d8e0");
    g.addColorStop(0.5, "#9a9ea6");
    g.addColorStop(1, "#6a6e76");
    ctx.fillStyle = g;
    rr(ctx, -1.8, 0, 3.6, len, 1.4);
    ctx.fill();
    ctx.strokeStyle = "#4a4d54";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Tube glint.
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-0.6, 2); ctx.lineTo(-0.6, len - 2);
    ctx.stroke();

    ctx.restore();
  });

  // Central clapper — swings wider than the tubes.
  const clap = Math.sin(t * 2.6 + 0.3) * 4.5;
  ctx.strokeStyle = "rgba(90,90,90,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(clap, 14);
  ctx.stroke();
  ctx.fillStyle = "#b8804a";
  ctx.beginPath();
  ctx.arc(clap, 16, 3.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. Mailbox — red flag wiggles/bobs; occasional nudge as if mail arrived.
// ---------------------------------------------------------------------------
function animMailbox(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 12, 4);

  // Post.
  const post = ctx.createLinearGradient(-3, 0, 3, 0);
  post.addColorStop(0, "#9a652f");
  post.addColorStop(0.5, "#6e4318");
  post.addColorStop(1, "#3e260c");
  ctx.fillStyle = post;
  rr(ctx, -3, -2, 6, 24, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // "Mail arrived" nudge: brief shudder of the whole box every ~5s.
  const cycle = t % 5;
  const nudge = cycle < 0.5 ? Math.sin(cycle * Math.PI * 6) * (1 - cycle / 0.5) * 0.6 : 0;

  ctx.save();
  ctx.translate(0, -10);
  ctx.rotate(nudge * 0.02);
  ctx.translate(0, 10);

  // Mailbox body — rounded-top tube.
  const body = ctx.createLinearGradient(0, -16, 0, -2);
  body.addColorStop(0, "#7ab0d8");
  body.addColorStop(0.5, "#4a82b8");
  body.addColorStop(1, "#2a5a88");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.lineTo(-13, -10);
  ctx.arc(0, -10, 13, Math.PI, 0, false);
  ctx.lineTo(13, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a3a58";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Body highlight.
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -10, 10, Math.PI + 0.3, Math.PI * 1.6, false);
  ctx.stroke();

  // Front door — circular panel.
  ctx.fillStyle = "#3a6e9a";
  ctx.beginPath();
  ctx.ellipse(-13, -7, 3, 6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a3a58";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Door knob.
  ctx.fillStyle = "#c8cdd4";
  ctx.beginPath();
  ctx.arc(-12, -7, 1.2, 0, TAU);
  ctx.fill();

  // Red flag — bobs/wiggles, with an extra swing during the nudge.
  const flagBob = Math.sin(t * 4) * 0.06 + nudge * 0.12;
  ctx.save();
  ctx.translate(12, -4);     // pivot at the flag post base
  ctx.rotate(flagBob);

  // Flag post.
  ctx.strokeStyle = "#888d94";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -12);
  ctx.stroke();

  // Flag (red) — local coords relative to post top at (0,-12).
  const wave = Math.sin(t * 6) * 0.8;
  ctx.fillStyle = "#d23a2a";
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(8, -10 + wave);
  ctx.lineTo(0, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a1408";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Flag highlight.
  ctx.fillStyle = "rgba(255,180,160,0.6)";
  ctx.beginPath();
  ctx.moveTo(0, -11.5);
  ctx.lineTo(5, -10.2 + wave * 0.6);
  ctx.lineTo(0, -9);
  ctx.closePath();
  ctx.fill();

  ctx.restore(); // flag

  ctx.restore(); // box nudge
}

// ---------------------------------------------------------------------------
// 6. Flower pot — stems + blooms lean in a breeze; leaves flutter.
// ---------------------------------------------------------------------------
function animFlowerPot(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 14, 4);

  // Terracotta pot.
  const pot = ctx.createLinearGradient(0, 4, 0, 22);
  pot.addColorStop(0, "#d8794a");
  pot.addColorStop(0.5, "#b8542a");
  pot.addColorStop(1, "#7a3014");
  ctx.fillStyle = pot;
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.lineTo(-9, 22);
  ctx.lineTo(9, 22);
  ctx.lineTo(12, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Pot rim.
  ctx.fillStyle = "#c8633a";
  rr(ctx, -13, 2, 26, 5, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,200,150,0.45)";
  rr(ctx, -12, 3, 24, 1.4, 0.7);
  ctx.fill();

  // Soil.
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(0, 4, 11, 2.4, 0, 0, TAU);
  ctx.fill();

  // Breeze — a shared sway, plus per-element phase for a natural flutter.
  const breeze = Math.sin(t * 1.6);

  // Stems + blooms. Each bloom leans with the breeze (tips move more than roots).
  const stems: Array<[number, number, number]> = [
    [-7, -14, 0.0],
    [0, -18, 0.5],
    [7, -14, 1.0],
  ];
  const bloomColors: Array<[string, string]> = [
    ["#e85a8a", "#ffd24a"],
    ["#f0a030", "#ffe9a8"],
    ["#9a6ad0", "#ffd24a"],
  ];

  // Leaves flutter (drawn first, behind blooms).
  ctx.fillStyle = "#5a8028";
  const leaves: Array<[number, number]> = [[-5, -6], [4, -8], [-2, -12], [3, -2]];
  leaves.forEach(([x, y], i) => {
    const flutter = Math.sin(t * 3 + i * 1.4) * 0.25;
    const baseRot = x < 0 ? -0.5 : 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(baseRot + flutter);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 1.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  });

  stems.forEach(([tx, ty, ph], i) => {
    const lean = breeze * (1.4 + ph * 0.6) + Math.sin(t * 2.4 + i) * 0.5;
    const tipX = tx + lean;
    const tipY = ty;

    // Stem.
    ctx.strokeStyle = "#3a6014";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(tx * 0.4, 3);
    ctx.quadraticCurveTo(tx * 0.6 + lean * 0.4, (ty + 3) / 2, tipX, tipY);
    ctx.stroke();

    // Bloom — five-petal flower at the leaning tip.
    const [petal, core] = bloomColors[i];
    ctx.fillStyle = petal;
    for (let p = 0; p < 5; p++) {
      const a = -Math.PI / 2 + (p / 5) * TAU;
      ctx.beginPath();
      ctx.arc(tipX + Math.cos(a) * 2.6, tipY + Math.sin(a) * 2.6, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 1.8, 0, TAU);
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// 7. Birdhouse — a bird pokes out of the hole and ducks back on a loop;
//    the house sways a hair.
// ---------------------------------------------------------------------------
function animBirdhouse(ctx: CanvasRenderingContext2D, t: number): void {
  drawShadow(ctx, 12, 4);

  // Tiny sway about the mount at top.
  const sway = Math.sin(t * 1.0) * 0.035;

  ctx.save();
  ctx.translate(0, 22);
  ctx.rotate(sway);
  ctx.translate(0, -22);

  // Hanging post / mount.
  ctx.fillStyle = "#6e4318";
  rr(ctx, -2, 14, 4, 8, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();

  // House body.
  const body = ctx.createLinearGradient(-12, 0, 12, 0);
  body.addColorStop(0, "#d8a868");
  body.addColorStop(0.5, "#b8804a");
  body.addColorStop(1, "#8a5a28");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-11, -6);
  ctx.lineTo(0, -16);
  ctx.lineTo(11, -6);
  ctx.lineTo(11, 16);
  ctx.lineTo(-11, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Plank lines.
  ctx.strokeStyle = "rgba(58,30,8,0.45)";
  ctx.lineWidth = 0.7;
  [0, 6, 12].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-11, y); ctx.lineTo(11, y);
    ctx.stroke();
  });

  // Peaked roof.
  ctx.fillStyle = "#9a3a28";
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(0, -20);
  ctx.lineTo(14, -4);
  ctx.lineTo(11, -4);
  ctx.lineTo(0, -16);
  ctx.lineTo(-11, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a1408";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Roof shingle lines.
  ctx.strokeStyle = "rgba(74,20,8,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-9, -8); ctx.lineTo(9, -8);
  ctx.moveTo(-5, -12); ctx.lineTo(5, -12);
  ctx.stroke();

  // Round entrance hole.
  ctx.fillStyle = "#2a1808";
  ctx.beginPath();
  ctx.arc(0, 2, 4.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(80,50,30,0.6)";
  ctx.beginPath();
  ctx.arc(-1.4, 0.6, 1.6, 0, TAU);
  ctx.fill();

  // Bird peeks out — clipped to the hole so it slides up out and ducks back.
  // peek: 0 hidden, 1 fully out. Out for part of a ~3.6s loop, then hidden.
  const period = 3.6;
  const phase = (t % period) / period; // 0..1
  let peek: number;
  if (phase < 0.18) {
    peek = phase / 0.18;             // emerge
  } else if (phase < 0.55) {
    peek = 1;                        // peeking
  } else if (phase < 0.7) {
    peek = 1 - (phase - 0.55) / 0.15; // duck back
  } else {
    peek = 0;                        // hidden
  }
  // tiny bob while peeking.
  const bob = peek > 0 ? Math.sin(t * 8) * 0.4 * peek : 0;

  if (peek > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 2, 4.3, 0, TAU);
    ctx.clip();

    const headY = 5 - peek * 5 + bob; // rises from inside the hole

    // Bird body/head.
    ctx.fillStyle = "#f0c050";
    ctx.beginPath();
    ctx.arc(0, headY, 3.1, 0, TAU);
    ctx.fill();
    // Beak.
    ctx.fillStyle = "#e8801a";
    ctx.beginPath();
    ctx.moveTo(2.4, headY - 0.2);
    ctx.lineTo(4.6, headY + 0.4);
    ctx.lineTo(2.4, headY + 1.2);
    ctx.closePath();
    ctx.fill();
    // Eye.
    ctx.fillStyle = "#241810";
    ctx.beginPath();
    ctx.arc(0.6, headY - 0.6, 0.7, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  // Perch (drawn over the hole bottom).
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 9);
  ctx.lineTo(0, 14);
  ctx.stroke();
  ctx.fillStyle = "#7a4a1e";
  ctx.beginPath();
  ctx.arc(0, 9, 1.6, 0, TAU);
  ctx.fill();

  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  cozy_lantern: animLantern,
  cozy_street_lamp: animStreetLamp,
  cozy_fountain: animFountain,
  cozy_wind_chime: animWindChime,
  cozy_mailbox: animMailbox,
  cozy_flower_pot: animFlowerPot,
  cozy_birdhouse: animBirdhouse,
};
