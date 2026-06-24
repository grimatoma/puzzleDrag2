// Animated small town & village buildings — same storybook look as
// ../categories/buildings.ts, but alive.
//
// Each fn redraws the COMPLETE icon at time `t` (elapsed seconds), centered at
// origin (0,0) within a roughly -24..+24 box; the ground baseline sits ~y=22.
// The caller handles clear / save / translate / scale / lineCap / restore.
//
// Motion is rebuilt to lead with real BODY deformation (a shared low-amplitude
// "building breathing", articulated sails/bells/vanes on their own pivots,
// hay-dust and sound rings) instead of one twitching ornament over a frozen
// shell. Glints/glows are demoted to a secondary accent and the imperceptible
// local flicker is replaced by the shared readable `flicker`. Loops tile
// seamlessly because every position is driven off `t` via `loopPhase` /
// `pingPong` / `breathe` (never a raw sawtooth), and contact shadows couple to
// vertical motion via `groundShadow`. Deterministic: motion comes only from `t`
// and indices (no Math.random / Date), stub-safe ctx methods only.

import {
  TAU,
  clamp01,
  lerp,
  breathe,
  loopPhase,
  pingPong,
  beat,
  easeInOutSine,
  groundShadow,
  sparkle,
  flicker,
} from "./_anim.js";

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

// Warm glowing window pane (brightness via `lit`, 0..1) — shared by several
// buildings. Static geometry is preserved from the source icon.
function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lit: number): void {
  const glow = ctx.createLinearGradient(0, y, 0, y + h);
  glow.addColorStop(0, "#fff2b8");
  glow.addColorStop(0.5, "#ffd368");
  glow.addColorStop(1, "#e89a30");
  ctx.save();
  ctx.globalAlpha = clamp01(lit);
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

// Shared subtle "building breathing": a slow ±1–2% vertical squash about the
// ground line, settling fully at the breath ends. Apply via ctx.scale around
// (0, baseY) so the silhouette gently inhales without sliding. Returns the
// vertical lift at the eaves for shadow coupling.
function applyBreath(ctx: CanvasRenderingContext2D, t: number, baseY: number, amp = 0.02, period = 5.2, offset = 0): number {
  const s = breathe(t, period, amp, 0, offset); // ±amp
  ctx.translate(0, baseY);
  ctx.scale(1 + s * 0.5, 1 - s);
  ctx.translate(0, -baseY);
  return s * 26; // approximate top-of-roof lift in design units (for shadow)
}

// ---------------------------------------------------------------------------
// 1. Cottage — best-built smoke loop kept; add a slow cozy-breath squash and a
//    visibly flickering warm window. The hearth pulse also brightens the smoke.
// ---------------------------------------------------------------------------
function animCottage(ctx: CanvasRenderingContext2D, t: number): void {
  const hearth = flicker(t, 0.3, 0.62, 1); // readable warm hearth, drives window + smoke tint
  const lift = breathe(t, 5.4, 0.018, 0, 0) * 26;
  groundShadow(ctx, 0, 22, 22, 4, lift, 0.22);

  ctx.save();
  applyBreath(ctx, t, 22, 0.018, 5.4);

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
  // Phase-staggered so a continuous column reads; loop seamless via loopPhase.
  const baseX = 11, baseY = -24;
  const period = 2.6;
  const puffs = 4;
  for (let i = 0; i < puffs; i++) {
    const life = loopPhase(t, period, i / puffs); // 0..1
    const rise = life * 18;
    const drift = Math.sin(life * Math.PI * 2 + i) * 2.4;
    const r = 2.4 + life * 2.2;
    const fade = Math.sin(life * Math.PI); // 0 at both ends → seamless
    // Smoke tints faintly warm when the hearth flares.
    const warm = (hearth - 0.62) / 0.38; // 0..1
    const g = Math.round(220 - warm * 18);
    ctx.fillStyle = `rgba(${224},${g},${Math.round(g - 4)},${0.5 * fade})`;
    ctx.beginPath();
    ctx.arc(baseX + drift, baseY - rise, r, 0, TAU);
    ctx.fill();
  }

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
  drawWindow(ctx, -13, 0, 9, 9, hearth);
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
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. Windmill — was a constant-velocity rigid spin (strobed). Now the sails
//    accelerate into gusts and ease back (eased angular velocity), each blade
//    carries a leading motion-smear ghost, and the tower leans with the gust.
// ---------------------------------------------------------------------------
function animWindmill(ctx: CanvasRenderingContext2D, t: number): void {
  // Gust profile: a baseline drift plus eased surges, integrated into an angle
  // so velocity is continuous (no strobe). speed(t) builds and relaxes.
  const gust = 0.5 + 0.5 * easeInOutSine(pingPong(t, 4.4)); // 0..1 swelling gust
  // Closed-form integral of (base + amp*sin) keeps the loop seamless & C1.
  const base = 0.55, amp = 0.5, w = TAU / 4.4;
  const spinAngle = 0.35 + base * t - (amp / w) * Math.cos(w * t);
  const lean = (gust - 0.5) * 0.05; // tower sways into the wind

  const lift = breathe(t, 5.6, 0.016, 0, 0.4) * 26;
  groundShadow(ctx, lean * 14, 22, 18, 4, lift, 0.22);

  ctx.save();
  // Tower leans about its base, plus the shared breath.
  ctx.translate(0, 22);
  ctx.rotate(lean);
  applyBreath(ctx, t, 0, 0.016, 5.6, 0.4);
  ctx.translate(0, -22);

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
  drawWindow(ctx, -4, 6, 8, 9, flicker(t, 1.1, 0.66, 1));
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
  const smear = 0.12 + gust * 0.22; // smear ghost grows in a strong gust

  const drawBlade = (alpha: number): void => {
    ctx.globalAlpha = alpha;
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
  };

  ctx.save();
  ctx.translate(hubX, hubY);
  ctx.rotate(spinAngle);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i / 4) * TAU);
    // Motion-smear: faint trailing ghosts a few degrees behind the blade so a
    // fast gust reads as blur instead of a strobing hard cross.
    ctx.save();
    ctx.rotate(smear);
    drawBlade(0.18 * gust);
    ctx.restore();
    ctx.save();
    ctx.rotate(smear * 0.5);
    drawBlade(0.3 * gust);
    ctx.restore();
    drawBlade(1);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Hub cap
  ctx.fillStyle = "#3a2810";
  ctx.beginPath();
  ctx.arc(hubX, hubY, 2.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. Watermill — restore the wheel rim (an inner ring), scroll water down the
//    race, and make paddles "catch" the flow: the wheel eases through each
//    paddle pitch (cogging) instead of gliding, throwing a splash + droplets at
//    the bottom of every catch.
// ---------------------------------------------------------------------------
function animWatermill(ctx: CanvasRenderingContext2D, t: number): void {
  const lift = breathe(t, 5.5, 0.015, 0, 1.1) * 26;
  groundShadow(ctx, 0, 22, 22, 4, lift, 0.22);

  ctx.save();
  applyBreath(ctx, t, 22, 0.015, 5.5, 1.1);

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
  drawWindow(ctx, -12, 2, 8, 8, flicker(t, 2.2, 0.66, 1));

  // Mill race / water chute (right side) — water scrolls down it.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(8, 6); ctx.lineTo(20, 6); ctx.lineTo(20, 9); ctx.lineTo(8, 9);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#5a82a0";
  ctx.fillRect(8, 6, 12, 3);
  // Flowing streaks travelling toward the wheel.
  ctx.strokeStyle = "rgba(190,228,240,0.7)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const fx = 8 + ((t * 9 + i * 4.6) % 13);
    ctx.beginPath();
    ctx.moveTo(fx, 6.6); ctx.lineTo(fx + 2.4, 8.4);
    ctx.stroke();
  }
  ctx.restore();

  // Water wheel — cogging rotation that catches per paddle pitch.
  const wcx = 16, wcy = 12, wr = 9;
  const paddles = 8;
  const pitch = TAU / paddles;
  const catchPhase = loopPhase(t, 1.4); // one paddle-catch per cycle
  const idx = Math.floor(catchPhase * paddles);
  const frac = easeInOutSine(catchPhase * paddles - idx); // eased step within a pitch
  const wheelSpin = (idx + frac) * pitch;
  const splash = beat(catchPhase * paddles - idx, 1, 0.5); // splash as a paddle reaches the bottom

  // Rim disc
  ctx.fillStyle = "#7a4a1e";
  ctx.beginPath();
  ctx.arc(wcx, wcy, wr, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Crisp inner rim ring (restored).
  ctx.strokeStyle = "#caa05a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(wcx, wcy, wr - 1.8, 0, TAU);
  ctx.stroke();

  ctx.save();
  ctx.translate(wcx, wcy);
  ctx.rotate(wheelSpin);
  for (let i = 0; i < paddles; i++) {
    const a = (i / paddles) * TAU;
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

  // Splash burst at the wheel's bottom as a paddle catches (anticipation lull,
  // then a quick eased pop).
  if (splash > 0.01) {
    ctx.fillStyle = `rgba(200,234,244,${0.7 * splash})`;
    for (let i = 0; i < 4; i++) {
      const sa = -1.9 + i * 0.5;
      const sr = 2 + splash * 4;
      ctx.beginPath();
      ctx.arc(wcx + Math.cos(sa) * (wr + 1) + Math.cos(sa) * sr, wcy + 6 - Math.sin(sa) * sr * 0.6, 1 + splash, 0, TAU);
      ctx.fill();
    }
  }

  // Falling droplets shed from the lifting side, looping with the catch.
  ctx.fillStyle = "rgba(150,210,230,0.85)";
  for (let i = 0; i < 3; i++) {
    const life = loopPhase(t, 1.0, i / 3);
    const dx = 22 + i;
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
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. Church — the bell now RINGS for real: anticipation wind-up then a ±25°
//    swing that decays (easeOutBack), the clapper lags (follow-through), and
//    each strike fires an expanding ring of sound that fades as it grows. The
//    bell/door glows breathe gently apart instead of merging into a gold column.
//    Re-framed slightly right+up (off (0.4,-3.0)).
// ---------------------------------------------------------------------------
function animChurch(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 0, 22, 20, 4, 0, 0.22);

  ctx.save();
  ctx.translate(-0.4, -1.4); // re-frame: nudge off dead air (off (0.4,-3.0))
  applyBreath(ctx, t, 22, 0.014, 5.8);

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

  // Bell ring cycle: dwell, anticipation wind-up, then a decaying ±25° swing.
  const period = 3.4;
  const ph = loopPhase(t, period);
  let swing: number;
  let strikeAt = 0; // 0..1 envelope when the bell passes centre (rings)
  if (ph < 0.18) {
    // anticipation: ease slightly back the wrong way
    swing = -easeInOutSine(ph / 0.18) * 0.12;
  } else {
    const u = (ph - 0.18) / 0.82;
    // decaying oscillation: amplitude 0.44 rad (~25°) damping out
    const env = (1 - u);
    swing = Math.sin(u * TAU * 2.4) * 0.44 * env * env;
    // strike beats each time |swing| is near a peak crossing centre
    strikeAt = Math.max(0, Math.sin(u * Math.PI)) * Math.max(0, Math.abs(Math.cos(u * TAU * 2.4))) * env;
  }

  // Expanding sound rings from the bell mouth on the strike.
  const bmx = -11, bmy = -4;
  if (strikeAt > 0.02) {
    for (let i = 0; i < 2; i++) {
      const rp = loopPhase(t, period, i * 0.12);
      const rr2 = 4 + rp * 16;
      const a = strikeAt * (1 - rp) * 0.5;
      if (a > 0.01) {
        ctx.strokeStyle = `rgba(240,224,160,${a})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(bmx, bmy, rr2, -2.5, -0.6);
        ctx.stroke();
      }
    }
  }

  // Bell opening in tower (glowing) — warm flicker.
  const lit = flicker(t, 0.7, 0.6, 1);
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

  // Swinging bell — pivots about its yoke at the top of the opening (-5). Scaled
  // up from the static nub so the ±25° swing actually reads at preview size.
  ctx.save();
  ctx.translate(-11, -5);
  ctx.rotate(swing);
  ctx.fillStyle = "#caa238";
  ctx.beginPath();
  ctx.moveTo(-3, 4.5);
  ctx.bezierCurveTo(-3.2, -1, 3.2, -1, 3, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a6818";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Bright rim catches the light on the strike.
  ctx.strokeStyle = `rgba(255,240,180,${0.4 + strikeAt * 0.5})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3, 4.5); ctx.lineTo(3, 4.5);
  ctx.stroke();
  // Clapper — lags the bell (follow-through), swings a touch more.
  const clap = swing * 1.25;
  ctx.save();
  ctx.rotate(clap - swing);
  ctx.fillStyle = "#6a4a10";
  ctx.beginPath();
  ctx.arc(0, 4.6, 0.9, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Arched glowing door — its own slower, dimmer flicker so it reads separately
  // from the bell opening (no merged gold column).
  const dlit = flicker(t, 3.4, 0.5, 0.82);
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
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. Castle — the whole keep was frozen with only the flag moving. Now: a grand
//    slow banner billow (traveling wave, no nervous flutter), the shared breath
//    on the masonry, and LIVING glows — torch-lit gate flicker + windows that
//    flare and dim on their own phases.
// ---------------------------------------------------------------------------
function animCastle(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 0, 22, 22, 4, 0, 0.22);

  ctx.save();
  applyBreath(ctx, t, 22, 0.012, 6.0);

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

  // Flag pole + grand billowing banner. Slow traveling wave, amplitude growing
  // toward the flying end; the pole sways a hair so the cloth has a root.
  const poleSway = breathe(t, 4.8, 0.04, 0, 0);
  ctx.save();
  ctx.translate(0, -12);
  ctx.rotate(poleSway);
  ctx.translate(0, 12);
  ctx.strokeStyle = "#5a5e66";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(0, -24);
  ctx.stroke();

  const segs = 6;
  const len = 11;
  const topPts: Array<[number, number]> = [];
  const botPts: Array<[number, number]> = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const x = f * len;
    // Grand slow billow: low frequency, eased amplitude growth to the tip.
    const wave = Math.sin(f * 3.0 - t * 2.0) * 2.0 * (f * f);
    const half = 3 * (1 - f); // taper to a point
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
  // Highlight band along the upper half (catches the billow crest).
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
  ctx.restore();

  // Arched gate (dark portcullis) with a warm torch glow flickering behind the
  // bars — a sign of life inside the keep.
  const torch = flicker(t, 1.7, 0.4, 0.9);
  const gateGlow = ctx.createRadialGradient(0, 16, 1, 0, 16, 9);
  gateGlow.addColorStop(0, `rgba(255,180,90,${0.5 * torch})`);
  gateGlow.addColorStop(1, "rgba(255,180,90,0)");
  ctx.fillStyle = gateGlow;
  ctx.beginPath();
  ctx.moveTo(-5, 22);
  ctx.lineTo(-5, 8);
  ctx.arc(0, 8, 5, Math.PI, 0, false);
  ctx.lineTo(5, 22);
  ctx.closePath();
  ctx.fill();
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
  // Portcullis grid (lets the glow leak through between bars).
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

  // Glowing tower windows — each flares and dims on its own phase (occupied).
  const wins: Array<[number, number, number]> = [[-14.5, 8, 0.5], [13.5, 8, 2.0]];
  wins.forEach(([x, y, phw]) => {
    const wlit = flicker(t, phw, 0.45, 1);
    // Soft bloom around the pane on a flare.
    const bloom = ctx.createRadialGradient(x, y + 2, 0.5, x, y + 2, 5);
    bloom.addColorStop(0, `rgba(255,210,120,${0.4 * wlit})`);
    bloom.addColorStop(1, "rgba(255,210,120,0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y + 2, 5, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = wlit;
    ctx.fillStyle = "#ffd368";
    rr(ctx, x - 1.6, y, 3.2, 4.5, 1);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#5a3414";
    ctx.lineWidth = 0.8;
    rr(ctx, x - 1.6, y, 3.2, 4.5, 1);
    ctx.stroke();
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. Tent — was only the hem rippling (apex pinned) + a nervous pennant. Now a
//    full-canopy traveling wave that EASES to zero at the apex (the cloth is
//    fixed at the peak), the interior glow breathes, and the pennant flies on a
//    slow grand billow instead of buzzing.
// ---------------------------------------------------------------------------
function animTent(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 0, 22, 22, 4, 0, 0.22);

  ctx.save();

  const apexX = 0, apexY = -22;
  const leftX = -20, rightX = 20, baseY = 18;
  const stripeColors = ["#e8e2d4", "#cc4a3a"];
  const segs = 8;
  // Canopy traveling wave: sideways sway whose amplitude is 0 at the apex and
  // grows toward the base — the whole sheet ripples, anchored at the peak.
  const canopyX = (x: number, y: number): number => {
    const v = (y - apexY) / (baseY - apexY); // 0 at apex → 1 at base
    return x + Math.sin(x * 0.22 - t * 2.2) * 2.0 * easeInOutSine(v);
  };
  const ripple = (x: number): number => Math.sin(x * 0.32 - t * 2.6) * 1.1; // base hem dip
  for (let i = 0; i < segs; i++) {
    const f0 = i / segs;
    const f1 = (i + 1) / segs;
    const bx0 = leftX + (rightX - leftX) * f0;
    const bx1 = leftX + (rightX - leftX) * f1;
    ctx.fillStyle = stripeColors[i % 2];
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(canopyX(bx0, baseY), baseY + ripple(bx0));
    ctx.lineTo(canopyX(bx1, baseY), baseY + ripple(bx1));
    ctx.closePath();
    ctx.fill();
  }
  // Canopy outline (follows the wave at the base corners)
  ctx.strokeStyle = "#7a2418";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(canopyX(leftX, baseY), baseY + ripple(leftX));
  ctx.lineTo(canopyX(rightX, baseY), baseY + ripple(rightX));
  ctx.closePath();
  ctx.stroke();
  // Scalloped lower trim — rides the same wave.
  ctx.fillStyle = "#cc4a3a";
  ctx.beginPath();
  ctx.moveTo(canopyX(leftX, baseY), baseY + ripple(leftX));
  for (let x = leftX; x < rightX; x += 5) {
    ctx.quadraticCurveTo(canopyX(x + 2.5, baseY), baseY + 4 + ripple(x + 2.5), canopyX(x + 5, baseY), baseY + ripple(x + 5));
  }
  ctx.lineTo(canopyX(rightX, baseY), baseY + ripple(rightX));
  ctx.lineTo(canopyX(rightX, baseY), baseY - 2);
  ctx.lineTo(canopyX(leftX, baseY), baseY - 2);
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
  // Warm glow inside the opening — breathes softly (lantern being tended).
  const pulse = flicker(t, 1.5, 0.45, 0.8);
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
  // Fluttering pennant — slow grand billow (low frequency, eased amplitude).
  const plen = 8;
  const pseg = 5;
  const ptop: Array<[number, number]> = [];
  const pbot: Array<[number, number]> = [];
  for (let i = 0; i <= pseg; i++) {
    const f = i / pseg;
    const x = f * plen;
    const wave = Math.sin(f * 3.2 - t * 2.6) * 1.6 * (f * f);
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
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. Market stall — was bottom-heavy/undersized with a teleporting sparkle.
//    Re-centred up & scaled up a touch, the sparkle drifts on a clean fading
//    loop (4-point star, no seam pop), and the goods settle: bread/apples bob
//    with a tiny eased plop as if just set down.
// ---------------------------------------------------------------------------
function animMarketStall(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 0, 22, 22, 4, 0, 0.22);

  ctx.save();
  // Re-frame: was sitting low & small (off_y +6.1). Lift and upscale slightly
  // about the ground line so it fills the box.
  ctx.translate(0, -4);
  ctx.translate(0, 22);
  ctx.scale(1.08, 1.08);
  ctx.translate(0, -22);
  applyBreath(ctx, t, 22, 0.012, 5.6);

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
  // Apples in a crate — a gentle staggered settle bob.
  ["#d23a2a", "#e85a3a", "#c82820"].forEach((c, i) => {
    const apBob = breathe(t, 2.4, 0.4, 0, i * 0.22);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(-12.5 + i * 3, 1 + apBob, 2, 0, TAU);
    ctx.fill();
  });
  // Bread loaves — a tiny eased plop as if just set down, on a long period.
  ([[6, 4], [11, 4]] as Array<[number, number]>).forEach(([x, y], i) => {
    const plop = beat(t, 4.2, 0.22, i * 0.18);
    const by = y - plop * 1.2;
    const sq = 1 + plop * 0.12;
    ctx.fillStyle = "#d8a860";
    ctx.beginPath();
    ctx.ellipse(x, by, 3.4 * sq, 2 / sq, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#8a5a20";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Drifting sparkle over the goods — clean 4-point star, fades in/out at the
  // ends of its run so there is no teleport at the seam.
  const sp = loopPhase(t, 4.6);
  const sx = -10 + sp * 22;
  const sFade = Math.sin(sp * Math.PI); // 0 at both ends
  const sTw = 0.5 + 0.5 * Math.sin(t * 7);
  sparkle(ctx, sx, 2.4, 1.4 + sTw * 1.0, 0.85 * sFade, "255,246,208");

  // Striped awning — scalloped lower edge ripples in the breeze.
  const stripes = ["#e8e2d4", "#d23a2a"];
  const segW = 6.4;
  for (let i = 0; i < 6; i++) {
    const x0 = -19 + i * segW;
    const scallop = 1 + Math.sin(t * 3 + i * 0.9) * 1.4;
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
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 8. Barn — was effectively dead (sub-pixel vane). Now it lives: a breathing
//    loft glow, hay-dust motes drifting up in the warm light, a real readable
//    weathervane that swings to shifting wind, and the big doors creak (a slow
//    eased lean of the right leaf).
// ---------------------------------------------------------------------------
function animBarn(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 0, 22, 22, 4, 0, 0.22);

  ctx.save();
  applyBreath(ctx, t, 22, 0.013, 5.6, 0.9);

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

  // Weathervane atop the peak — a readable arrow that swings to the wind with
  // overshoot then settles (shifting gusts), on a small mast.
  const wind = pingPong(t, 5.2) * 2 - 1; // -1..1 shifting wind
  const vAng = wind * 0.6 + Math.sin(t * 1.6) * 0.05; // bearing + a little jitter
  ctx.save();
  ctx.translate(0, -22);
  ctx.strokeStyle = "#3a0c04";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, -5);
  ctx.stroke();
  // Pivot bead
  ctx.fillStyle = "#2a0a04";
  ctx.beginPath();
  ctx.arc(0, -5, 1, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(0, -5);
  ctx.rotate(vAng);
  // Arrow shaft
  ctx.strokeStyle = "#2a0a04";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
  ctx.stroke();
  // Arrow head
  ctx.fillStyle = "#2a0a04";
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(2.6, -1.6);
  ctx.lineTo(2.6, 1.6);
  ctx.closePath();
  ctx.fill();
  // Tail fletching
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-2.2, -1.4);
  ctx.lineTo(-2.2, 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Hayloft window (glowing, up under peak) — breathing warm flicker.
  const lit = flicker(t, 0.9, 0.6, 1);
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

  // Hay-dust motes drifting up through the loft light — tiny, slow, fading.
  for (let i = 0; i < 5; i++) {
    const life = loopPhase(t, 4.0, i / 5);
    const mx = -3 + i * 1.5 + Math.sin(life * Math.PI * 2 + i) * 1.2;
    const my = -6 - life * 7;
    const ma = Math.sin(life * Math.PI) * 0.5 * lit;
    if (ma > 0.01) {
      ctx.fillStyle = `rgba(255,236,170,${ma})`;
      ctx.beginPath();
      ctx.arc(mx, my, 0.6, 0, TAU);
      ctx.fill();
    }
  }

  // Big double doors — the right leaf creaks: a slow eased lean about its inner
  // edge (hinge at center seam), opening a sliver then easing shut.
  const creak = (pingPong(t, 7.0) - 0.5) * 0.06; // small angle
  // Door base (left leaf static, right leaf hinged) — drawn as one panel but the
  // right half shears slightly via a clipped transform for the creak read.
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
  // Right leaf creak: a thin dark gap opens at the seam and the right edge lifts.
  ctx.save();
  ctx.beginPath();
  rr(ctx, 0, 4, 11, 18, 1.5);
  ctx.clip();
  ctx.translate(0, 13);
  ctx.rotate(creak);
  ctx.translate(0, -13);
  ctx.fillStyle = door;
  rr(ctx, 0, 4, 11, 18, 1.5);
  ctx.fill();
  ctx.restore();
  // Dark seam shadow where the leaf parts.
  ctx.strokeStyle = `rgba(40,24,8,${0.5 + Math.abs(creak) * 6})`;
  ctx.lineWidth = 1 + Math.abs(creak) * 14;
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.lineTo(0, 22);
  ctx.stroke();
  // X-trim
  ctx.strokeStyle = "#6a4420";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, 5); ctx.lineTo(-1, 14);
  ctx.moveTo(-1, 5); ctx.lineTo(-10, 14);
  ctx.moveTo(1, 5); ctx.lineTo(10, 14);
  ctx.moveTo(10, 5); ctx.lineTo(1, 14);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 9. Tower — deadest icon. Now a real candle: a flame that flickers (height +
//    brightness) and LEANS in a draught, a breathing halo, and a readable
//    finial weathervane up top so the silhouette has motion against the sky.
// ---------------------------------------------------------------------------
function animTower(ctx: CanvasRenderingContext2D, t: number): void {
  groundShadow(ctx, 0, 22, 14, 4, 0, 0.22);

  ctx.save();
  ctx.translate(0, -1.4); // re-frame: trim a little dead air below (off_y -2.8)
  applyBreath(ctx, t, 22, 0.012, 6.0);

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
  // Roof highlight
  ctx.strokeStyle = "rgba(180,200,255,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, -12);
  ctx.lineTo(-1, -24);
  ctx.stroke();

  // Finial ball + a small readable weathervane arrow swinging in the wind.
  ctx.fillStyle = "#f0d060";
  ctx.beginPath();
  ctx.arc(0, -29, 2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8a6818";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  const vane = (pingPong(t, 6.0) * 2 - 1) * 0.7 + Math.sin(t * 1.4) * 0.06;
  ctx.save();
  ctx.translate(0, -31);
  ctx.rotate(vane);
  ctx.strokeStyle = "#d8b840";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3.4, 0); ctx.lineTo(3.4, 0);
  ctx.stroke();
  ctx.fillStyle = "#d8b840";
  ctx.beginPath();
  ctx.moveTo(4.4, 0);
  ctx.lineTo(2.2, -1.4);
  ctx.lineTo(2.2, 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3.4, 0);
  ctx.lineTo(-1.8, -1.2);
  ctx.lineTo(-1.8, 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Candle behaviour: flicker drives flame height + brightness; a slow draught
  // leans the flame. Halo breathes with the flame.
  const flame = flicker(t, 0.2, 0.55, 1);
  const draught = Math.sin(t * 2.3) * 0.18 + Math.sin(t * 5.1) * 0.08; // flame lean (rad)

  // Soft warm halo that breathes with the candle.
  const halo = ctx.createRadialGradient(0, 3, 1, 0, 3, 9 + flame * 1.5);
  halo.addColorStop(0, `rgba(255,210,120,${0.3 * flame})`);
  halo.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 3, 9 + flame * 1.5, 0, TAU);
  ctx.fill();

  // Arched window glow (warm), behind the flame.
  const glow = ctx.createLinearGradient(0, -2, 0, 9);
  glow.addColorStop(0, "#fff2b8");
  glow.addColorStop(1, "#e89a30");
  ctx.save();
  ctx.globalAlpha = lerp(0.7, 1, flame);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-4, 9);
  ctx.lineTo(-4, 0);
  ctx.arc(0, 0, 4, Math.PI, 0, false);
  ctx.lineTo(4, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // The candle itself inside the arch — a little stick + a leaning, flickering
  // teardrop flame (clipped to the window so it never spills onto the stone).
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-4, 9);
  ctx.lineTo(-4, 0);
  ctx.arc(0, 0, 4, Math.PI, 0, false);
  ctx.lineTo(4, 9);
  ctx.closePath();
  ctx.clip();
  // Candle stick
  ctx.fillStyle = "#f2ead2";
  rr(ctx, -1.1, 4, 2.2, 5, 0.6);
  ctx.fill();
  // Flame — pivots at the wick, leans with the draught, height tracks flicker.
  const wickY = 4;
  const fh = 3.2 + flame * 1.6;
  ctx.save();
  ctx.translate(0, wickY);
  ctx.rotate(draught);
  const fg = ctx.createLinearGradient(0, 0, 0, -fh);
  fg.addColorStop(0, "#ff9a30");
  fg.addColorStop(0.5, "#ffd060");
  fg.addColorStop(1, "#fff6c8");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(1.3, -fh * 0.4, 0.8, -fh * 0.8, 0, -fh);
  ctx.bezierCurveTo(-0.8, -fh * 0.8, -1.3, -fh * 0.4, 0, 0);
  ctx.closePath();
  ctx.fill();
  // Bright core
  ctx.fillStyle = `rgba(255,250,210,${0.6 + flame * 0.4})`;
  ctx.beginPath();
  ctx.ellipse(0, -fh * 0.45, 0.5, fh * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Window frame (over the glow).
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, 9);
  ctx.lineTo(-4, 0);
  ctx.arc(0, 0, 4, Math.PI, 0, false);
  ctx.lineTo(4, 9);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
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
