// Animated versions of the workshop / crafting hand tools.
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds). The caller has
// already cleared, translated to center, scaled to the 64px design box, and set
// lineCap/lineJoin = "round". We only draw around the origin in a ~-24..+24 box.
//
// Every fn is pure, deterministic given `t`, and loops seamlessly via sin/cos/modulo.
// Motions mirror the resting icons (same colors/shapes/identity) but "in use".

const TAU = Math.PI * 2;

// ---- shared drawing helpers (copied locally; no imports allowed) -----------

function shadow(ctx: CanvasRenderingContext2D, w: number, y?: number) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, y ?? 22, w, 4, 0, 0, TAU); ctx.fill();
}

function woodHandle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
  g.addColorStop(0, "#7a4a18"); g.addColorStop(0.5, "#a87838"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.fillRect(0, -width / 2, len, width);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.strokeRect(0, -width / 2, len, width);
  ctx.strokeStyle = "rgba(26,14,4,0.4)"; ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(len * 0.1 * i, -width / 2 + 0.5);
    ctx.lineTo(len * 0.1 * i + len * 0.7, -width / 2 + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function metalGleam(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.4, r * 0.8, -0.4, 0, TAU); ctx.fill();
}

// A small four-point spark / impact burst centered at (x, y).
function spark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, rot: number) {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = `rgba(255,236,170,${alpha})`;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,235,${alpha})`;
  ctx.beginPath(); ctx.arc(0, 0, size * 0.32, 0, TAU); ctx.fill();
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 1. HAMMER — rocks down to strike a fixed point and back; impact spark.
// ----------------------------------------------------------------------------
function animHammer(ctx: CanvasRenderingContext2D, t: number) {
  shadow(ctx, 16);
  // Swing cycle: a quick downward tap then ease back. Period 1.1s.
  const period = 1.1;
  const phase = (t % period) / period; // 0..1
  // Fast strike (down) when phase small, slow recover. Use a shaped curve.
  // swing in [0..1]: 0 = raised, 1 = struck.
  let swing: number;
  if (phase < 0.25) swing = phase / 0.25;                 // wind down to strike
  else swing = 1 - (phase - 0.25) / 0.75;                  // ease back up
  // smoothstep for a natural feel
  swing = swing * swing * (3 - 2 * swing);
  const strikeAng = 0.18 + swing * 0.55; // rest rotation 0.18, swings further down

  ctx.save(); ctx.rotate(strikeAng);
  woodHandle(ctx, 2, -8, -4, 22, 5);
  ctx.save(); ctx.translate(2, -12);
  const headG = ctx.createLinearGradient(0, -7, 0, 7);
  headG.addColorStop(0, "#e8e8f0"); headG.addColorStop(0.45, "#9a9aa4"); headG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.moveTo(2, -7); ctx.lineTo(15, -6); ctx.lineTo(15, 6); ctx.lineTo(2, 7);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.moveTo(2, -6); ctx.lineTo(2, 6);
  ctx.bezierCurveTo(-8, 7, -16, 3, -18, -4);
  ctx.lineTo(-13, -5);
  ctx.bezierCurveTo(-11, 0, -7, 2, -3, 1);
  ctx.lineTo(-3, -1);
  ctx.bezierCurveTo(-7, -2, -11, -4, -13, -8);
  ctx.lineTo(-18, -7);
  ctx.bezierCurveTo(-15, -4, -10, -6, 2, -6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-18, -5.5); ctx.lineTo(-12, -6.5); ctx.stroke();
  metalGleam(ctx, 9, -2, 6);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(4, -5, 9, 1.4);
  ctx.restore();
  ctx.restore();

  // Impact spark at the strike, fired right as the head bottoms out (phase ~0.25).
  const impact = Math.max(0, 1 - Math.abs(phase - 0.25) / 0.12);
  if (impact > 0) {
    // Striking face sits low-right of the head when swung down.
    spark(ctx, 14, 16, 3 + impact * 3, impact * 0.9, phase * 9);
  }
}

// ----------------------------------------------------------------------------
// 2. SAW — slides back and forth along its blade axis; sawdust specks fly.
// ----------------------------------------------------------------------------
function animSaw(ctx: CanvasRenderingContext2D, t: number) {
  shadow(ctx, 20);
  const period = 0.9;
  const ph = (t % period) / period;
  // Smooth back-and-forth along blade axis (blade points up-right after rotate).
  const slide = Math.sin(ph * TAU); // -1..1
  const dx = slide * 5;             // axis is roughly +x of the rotated frame

  ctx.save(); ctx.rotate(-0.12);
  ctx.translate(dx, 0);

  ctx.save(); ctx.translate(-4, 0);
  const bladeG = ctx.createLinearGradient(0, -8, 0, 8);
  bladeG.addColorStop(0, "#f0f0f6"); bladeG.addColorStop(0.5, "#b4b4bc"); bladeG.addColorStop(1, "#5a5a62");
  ctx.fillStyle = bladeG;
  ctx.beginPath();
  ctx.moveTo(-2, -6); ctx.lineTo(28, -2); ctx.lineTo(28, 6); ctx.lineTo(-2, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = "#7a7a82"; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 0.7;
  for (let i = 0; i < 10; i++) {
    const x = -1 + i * 3;
    ctx.beginPath();
    ctx.moveTo(x, 6); ctx.lineTo(x + 1.5, 6); ctx.lineTo(x + 0.4, 11);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(26, -1.2); ctx.stroke();
  ctx.restore();

  ctx.save(); ctx.translate(-6, 0);
  const gripG = ctx.createLinearGradient(-12, 0, 0, 0);
  gripG.addColorStop(0, "#7a4a18"); gripG.addColorStop(0.5, "#a87838"); gripG.addColorStop(1, "#3a2008");
  ctx.fillStyle = gripG;
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.bezierCurveTo(-14, -12, -16, 12, 0, 9);
  ctx.lineTo(0, 4);
  ctx.bezierCurveTo(-9, 6, -8, -5, 0, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = "rgba(255,235,200,0.4)";
  ctx.beginPath(); ctx.ellipse(-10, -2, 1.6, 4, 0.2, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();

  // Sawdust specks falling from under the teeth. Emit on the push stroke.
  const push = Math.max(0, slide); // dust mostly on forward stroke
  ctx.save(); ctx.rotate(-0.12);
  for (let i = 0; i < 5; i++) {
    // Each speck has its own looping fall progress.
    const fall = (ph + i * 0.2) % 1; // 0..1
    const sx = 2 + i * 5 + dx * 0.5;
    const sy = 10 + fall * 12;
    const a = (1 - fall) * 0.55 * (0.4 + push * 0.6);
    if (a <= 0.02) continue;
    ctx.fillStyle = `rgba(214,178,120,${a})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.9 + (i % 2) * 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3. DRILL — bit spins (rotating flutes + spin lines), vibration jitter, tip spark.
// ----------------------------------------------------------------------------
function animDrill(ctx: CanvasRenderingContext2D, t: number) {
  shadow(ctx, 18);
  // High-frequency vibration jitter (deterministic, looping).
  const jx = Math.sin(t * 41) * 0.4;
  const jy = Math.cos(t * 37) * 0.4;

  ctx.save();
  ctx.translate(jx, jy);
  ctx.rotate(-0.08);

  const bodyG = ctx.createLinearGradient(0, -10, 0, 4);
  bodyG.addColorStop(0, "#ffc24a"); bodyG.addColorStop(0.5, "#e08a18"); bodyG.addColorStop(1, "#7a4408");
  ctx.fillStyle = bodyG; ctx.strokeStyle = "#3a2208"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -8); ctx.lineTo(6, -9); ctx.bezierCurveTo(12, -9, 12, 2, 6, 3);
  ctx.lineTo(-12, 4); ctx.bezierCurveTo(-18, 4, -20, -6, -16, -8);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(255,245,200,0.4)";
  ctx.beginPath(); ctx.ellipse(-6, -5, 8, 2, -0.05, 0, TAU); ctx.fill();
  ctx.fillStyle = "#2a2a30"; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-12, 2); ctx.lineTo(-4, 2); ctx.lineTo(-2, 22); ctx.lineTo(-12, 22);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(120,120,130,0.5)"; ctx.lineWidth = 0.9;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(-11, 8 + i * 3); ctx.lineTo(-3, 8 + i * 3); ctx.stroke();
  }
  ctx.fillStyle = "#46464e";
  ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(0, 5); ctx.lineTo(-1, 9); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill();
  const chuckG = ctx.createLinearGradient(0, -6, 0, 2);
  chuckG.addColorStop(0, "#e0e0e8"); chuckG.addColorStop(0.5, "#9a9aa4"); chuckG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = chuckG;
  ctx.beginPath();
  ctx.moveTo(8, -7); ctx.lineTo(16, -5); ctx.lineTo(16, -0); ctx.lineTo(8, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();

  // Drill bit shaft.
  ctx.strokeStyle = "#8a8a94"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(16, -2); ctx.lineTo(26, -2); ctx.stroke();
  // Spinning flutes: spin offset advances with time; lines scroll along the bit.
  const spin = (t * 14) % 2; // controls flute phase
  ctx.strokeStyle = "#46464e"; ctx.lineWidth = 0.9;
  for (let i = 0; i < 5; i++) {
    const off = (i * 1.8 + spin) % 9; // scroll the spiral marks along the shaft
    ctx.beginPath();
    ctx.moveTo(17 + off, -3.4);
    ctx.lineTo(18.4 + off, -0.6);
    ctx.stroke();
  }
  // Bright spin lines (motion-blur look) flicker with rotation.
  const flick = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(t * 28));
  ctx.strokeStyle = `rgba(255,255,255,${flick})`;
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(17, -3); ctx.lineTo(25, -3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(17, -1); ctx.lineTo(25, -1); ctx.stroke();

  metalGleam(ctx, 12, -4, 4);
  ctx.restore();

  // Spark at the tip, pulsing as the bit bites.
  const tipPulse = 0.5 + 0.5 * Math.sin(t * 9);
  if (tipPulse > 0.2) {
    spark(ctx, 26 + jx, -2 + jy, 2 + tipPulse * 2.5, tipPulse * 0.8, t * 6);
  }
}

// ----------------------------------------------------------------------------
// 4. SCISSORS — blades open and close (snip); glint at the pivot.
// ----------------------------------------------------------------------------
function animScissors(ctx: CanvasRenderingContext2D, t: number) {
  shadow(ctx, 14);
  const period = 0.85;
  const ph = (t % period) / period;
  // open/close: 0 = closed, 1 = open. Quick snip closed, slower open.
  const open = (Math.cos(ph * TAU) * 0.5 + 0.5); // 1 at ph0, 0 at ph0.5
  const spread = (open - 0.5) * 0.32; // +/- rotation applied to each blade arm

  ctx.save(); ctx.rotate(-0.2);

  const bladeG = ctx.createLinearGradient(0, -18, 0, 2);
  bladeG.addColorStop(0, "#f0f0f6"); bladeG.addColorStop(0.55, "#b0b0ba"); bladeG.addColorStop(1, "#56565e");

  // --- Left arm (blade tip up-left + lower loop) rotates about the pivot (0,2).
  ctx.save();
  ctx.translate(0, 2); ctx.rotate(-spread); ctx.translate(0, -2);
  ctx.fillStyle = bladeG; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(1.5, 2);
  ctx.bezierCurveTo(0, -8, -5, -16, -8, -22);
  ctx.bezierCurveTo(-4, -18, -1, -9, 4, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-1, -3); ctx.bezierCurveTo(-3, -11, -5, -16, -7, -20); ctx.stroke();
  ctx.strokeStyle = "#1a4a8a"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.ellipse(-7, 12, 5, 6, 0.3, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "rgba(150,200,255,0.6)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(-7, 12, 4, 5, 0.3, -1, 1.4); ctx.stroke();
  ctx.strokeStyle = "#1a4a8a"; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-2, 1); ctx.stroke();
  ctx.restore();

  // --- Right arm.
  ctx.save();
  ctx.translate(0, 2); ctx.rotate(spread); ctx.translate(0, -2);
  ctx.fillStyle = bladeG; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-1.5, 2);
  ctx.bezierCurveTo(0, -8, 5, -16, 8, -22);
  ctx.bezierCurveTo(4, -18, 1, -9, -4, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(1, -3); ctx.bezierCurveTo(3, -11, 5, -16, 7, -20); ctx.stroke();
  ctx.strokeStyle = "#1a4a8a"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.ellipse(7, 12, 5, 6, -0.3, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "rgba(150,200,255,0.6)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(7, 12, 4, 5, -0.3, 1.7, 4.1); ctx.stroke();
  ctx.strokeStyle = "#1a4a8a"; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(2, 1); ctx.stroke();
  ctx.restore();

  // Pivot bolt.
  ctx.fillStyle = "#6a6a72";
  ctx.beginPath(); ctx.arc(0, 2, 2.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.arc(-0.8, 1.2, 1, 0, TAU); ctx.fill();

  // Glint at the pivot — brightest right as the blades snap shut (ph near 0/1).
  const snip = Math.max(0, 1 - Math.abs(open - 1) / 0.25);
  if (snip > 0) {
    spark(ctx, 0, 2, 1.5 + snip * 2, snip * 0.85, t * 4);
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 5. WRENCH — rotates back and forth as if turning a bolt; glint sweep.
// ----------------------------------------------------------------------------
function animWrench(ctx: CanvasRenderingContext2D, t: number) {
  shadow(ctx, 14);
  const period = 1.2;
  const ph = (t % period) / period;
  // Turn the bolt: ratchet feel — slow tighten, quick reset.
  let turn: number;
  if (ph < 0.7) turn = (ph / 0.7);            // tighten
  else turn = 1 - (ph - 0.7) / 0.3;            // back off
  turn = turn * turn * (3 - 2 * turn);
  const osc = (turn - 0.5) * 0.5; // +/- ~0.25 rad

  // Rotate about the bottom box-jaw (the bolt) at (0,21) in the rotated frame.
  ctx.save();
  ctx.rotate(-0.62);
  ctx.translate(0, 21); ctx.rotate(osc); ctx.translate(0, -21);

  const g = ctx.createLinearGradient(-7, 0, 7, 0);
  g.addColorStop(0, "#e8e8f0"); g.addColorStop(0.5, "#9a9aa4"); g.addColorStop(1, "#3a3a42");
  ctx.fillStyle = g; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, 4); ctx.lineTo(4, 4); ctx.lineTo(3, 20); ctx.lineTo(-3, 20);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, 4); ctx.lineTo(-9, -6); ctx.lineTo(-5, -10);
  ctx.lineTo(-2, -6); ctx.lineTo(2, -6); ctx.lineTo(5, -10);
  ctx.lineTo(9, -6); ctx.lineTo(4, 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 21, 7, 6, 0, 0, TAU);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#26262c";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - Math.PI / 2;
    const px = Math.cos(a) * 3.4, py = 21 + Math.sin(a) * 3.4;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(-2.5, 4, 1.6, 14);
  metalGleam(ctx, -4, -4, 4);

  // Glint sweep travelling down the shaft, clipped to the shaft rect.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-4, 4); ctx.lineTo(4, 4); ctx.lineTo(3, 20); ctx.lineTo(-3, 20);
  ctx.closePath(); ctx.clip();
  const gy = -8 + ((t * 16) % 36); // sweeps 4..20 region repeatedly
  const grad = ctx.createLinearGradient(0, gy - 5, 0, gy + 5);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-5, gy - 5, 10, 10);
  ctx.restore();

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 6. SCREWDRIVER — twists back and forth; spin ticks at the tip; glint travels shaft.
// ----------------------------------------------------------------------------
function animScrewdriver(ctx: CanvasRenderingContext2D, t: number) {
  shadow(ctx, 12);
  const period = 0.8;
  const ph = (t % period) / period;
  // Twist: drive forward, slip back (ratchet). Whole tool rotates a touch.
  let drive: number;
  if (ph < 0.6) drive = ph / 0.6;
  else drive = 1 - (ph - 0.6) / 0.4;
  drive = drive * drive * (3 - 2 * drive);
  const twist = (drive - 0.5) * 0.34;

  ctx.save();
  ctx.rotate(0.5 + twist);

  const hG = ctx.createLinearGradient(-6, 0, 6, 0);
  hG.addColorStop(0, "#ff8a5a"); hG.addColorStop(0.5, "#d8401c"); hG.addColorStop(1, "#7a1408");
  ctx.fillStyle = hG;
  ctx.beginPath();
  ctx.moveTo(-6, -18); ctx.bezierCurveTo(-8, -22, 8, -22, 6, -18);
  ctx.lineTo(5, -2); ctx.bezierCurveTo(5, 2, -5, 2, -5, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.strokeStyle = "rgba(58,8,8,0.5)"; ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i += 2.6) {
    ctx.beginPath(); ctx.moveTo(i, -18); ctx.lineTo(i * 0.85, -2); ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.ellipse(-3, -12, 1.6, 6, 0, 0, TAU); ctx.fill();

  const sG = ctx.createLinearGradient(-3, 0, 3, 0);
  sG.addColorStop(0, "#e8e8f0"); sG.addColorStop(0.5, "#a0a0aa"); sG.addColorStop(1, "#46464e");
  ctx.fillStyle = sG;
  ctx.fillRect(-2.4, -2, 4.8, 18);
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4;
  ctx.strokeRect(-2.4, -2, 4.8, 18);
  ctx.fillStyle = "#c8c8d0";
  ctx.beginPath();
  ctx.moveTo(-2.4, 16); ctx.lineTo(2.4, 16); ctx.lineTo(3, 21); ctx.lineTo(-3, 21);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.2; ctx.stroke();

  // Shaft glint base.
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(-1.4, -1, 1.2, 15);

  // Travelling glint along the shaft, clipped to the shaft rect.
  ctx.save();
  ctx.beginPath(); ctx.rect(-2.4, -2, 4.8, 18); ctx.clip();
  const gy = -2 + ((t * 22) % 22);
  const grad = ctx.createLinearGradient(0, gy - 4, 0, gy + 4);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.75)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-2.4, gy - 4, 4.8, 8);
  ctx.restore();

  // Spin ticks at the tip — short arc marks that rotate to imply turning.
  const tickAng = (t * 10) % TAU;
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a = tickAng + (i / 3) * TAU;
    ctx.beginPath();
    ctx.arc(0, 21, 4.2, a, a + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 7. PAINTBRUSH — dabs/strokes back and forth; fading smear; paint drip.
// ----------------------------------------------------------------------------
function animPaintbrush(ctx: CanvasRenderingContext2D, t: number) {
  shadow(ctx, 12);
  const period = 1.0;
  const ph = (t % period) / period;
  const stroke = Math.sin(ph * TAU); // -1..1 lateral dab

  // Brief smear left behind the bristle tip — drawn under the tool, fading.
  // It tracks the previous stroke position; fade with stroke speed.
  ctx.save();
  ctx.rotate(0.42);
  const smearX = stroke * 6;
  const smearA = 0.28 * (1 - Math.abs(stroke)); // strongest mid-stroke, fades at ends
  if (smearA > 0.02) {
    ctx.fillStyle = `rgba(58,130,216,${smearA})`;
    ctx.beginPath();
    ctx.ellipse(smearX * 0.6, 24, 7, 2.2, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // The brush itself rocks laterally (small back-and-forth dab).
  ctx.save();
  ctx.rotate(0.42);
  ctx.translate(stroke * 2.2, 0);
  ctx.rotate(stroke * 0.08);

  woodHandle(ctx, 0, -22, 0, -2, 5);

  ctx.save(); ctx.translate(0, 0);
  const fG = ctx.createLinearGradient(-5, 0, 5, 0);
  fG.addColorStop(0, "#d8d8e0"); fG.addColorStop(0.5, "#9a9aa4"); fG.addColorStop(1, "#46464e");
  ctx.fillStyle = fG;
  ctx.fillRect(-5, -4, 10, 9);
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6;
  ctx.strokeRect(-5, -4, 10, 9);
  ctx.strokeStyle = "rgba(26,26,30,0.5)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(-4, -3, 1.6, 7);
  ctx.restore();

  const brG = ctx.createLinearGradient(0, 5, 0, 22);
  brG.addColorStop(0, "#6a4a20"); brG.addColorStop(0.4, "#3a82d8"); brG.addColorStop(1, "#1a4a9a");
  ctx.fillStyle = brG;
  // Bristle tips splay with the stroke direction.
  const splay = stroke * 1.6;
  ctx.beginPath();
  ctx.moveTo(-5, 5); ctx.lineTo(5, 5);
  ctx.lineTo(4 + splay, 16);
  ctx.bezierCurveTo(3 + splay, 22, -3 + splay, 22, -4 + splay, 16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#102a5a"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = "rgba(20,40,80,0.5)"; ctx.lineWidth = 0.7;
  for (let i = -3; i <= 3; i += 1.5) {
    ctx.beginPath(); ctx.moveTo(i, 6); ctx.lineTo(i * 0.7 + splay, 20); ctx.stroke();
  }
  ctx.fillStyle = "rgba(180,215,255,0.6)";
  ctx.beginPath(); ctx.ellipse(-1.5, 12, 1.4, 5, 0.1, 0, TAU); ctx.fill();
  ctx.restore();

  // A paint drip falling free from the bristle tip, looping.
  ctx.save();
  ctx.rotate(0.42);
  const drip = (ph + 0.15) % 1;
  const dy = 20 + drip * 8;
  const dA = (1 - drip) * 0.85;
  ctx.globalAlpha = dA;
  ctx.fillStyle = "#2a6ac8";
  ctx.beginPath(); ctx.ellipse(1 + stroke, dy, 2 - drip * 0.6, 3 - drip, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 8. NAIL — specular glint sweeps down the shaft; subtle sparkle ping at head.
// ----------------------------------------------------------------------------
function animNail(ctx: CanvasRenderingContext2D, t: number) {
  shadow(ctx, 8);
  ctx.save(); ctx.rotate(0.32);

  const headG = ctx.createLinearGradient(-7, 0, 7, 0);
  headG.addColorStop(0, "#e8e8f0"); headG.addColorStop(0.5, "#a0a0aa"); headG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = headG;
  ctx.beginPath(); ctx.ellipse(0, -18, 7, 3, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(-2, -18.5, 3, 1.2, 0, 0, TAU); ctx.fill();

  const shaftG = ctx.createLinearGradient(-3, 0, 3, 0);
  shaftG.addColorStop(0, "#e0e0e8"); shaftG.addColorStop(0.5, "#9a9aa4"); shaftG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = shaftG;
  ctx.beginPath();
  ctx.moveTo(-3, -16); ctx.lineTo(3, -16); ctx.lineTo(1, 18); ctx.lineTo(0, 23); ctx.lineTo(-1, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(-1.4, -15); ctx.lineTo(-0.4, -15); ctx.lineTo(-0.4, 16); ctx.lineTo(-1, 16);
  ctx.closePath(); ctx.fill();

  // Specular glint sweeping down the shaft, clipped to the shaft shape.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-3, -16); ctx.lineTo(3, -16); ctx.lineTo(1, 18); ctx.lineTo(0, 23); ctx.lineTo(-1, 18);
  ctx.closePath(); ctx.clip();
  const period = 2.2;
  const gy = -18 + ((t % period) / period) * 44; // sweeps -18..26
  const grad = ctx.createLinearGradient(0, gy - 5, 0, gy + 5);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-4, gy - 5, 8, 10);
  ctx.restore();
  ctx.restore();

  // Subtle sparkle ping at the head — a short, periodic twinkle (kept gentle).
  const pingPh = (t % 2.2) / 2.2;
  const ping = Math.max(0, 1 - Math.abs(pingPh - 0.08) / 0.06);
  if (ping > 0) {
    // Head sits up-left after the 0.32 rotation; approximate in icon space.
    const hx = -18 * Math.sin(0.32);
    const hy = -18 * Math.cos(0.32);
    spark(ctx, hx, hy, 1.5 + ping * 2, ping * 0.7, 0.4);
  }
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  wtool_hammer: animHammer,
  wtool_saw: animSaw,
  wtool_drill: animDrill,
  wtool_scissors: animScissors,
  wtool_wrench: animWrench,
  wtool_screwdriver: animScrewdriver,
  wtool_paintbrush: animPaintbrush,
  wtool_nail: animNail,
};
