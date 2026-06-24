// Animated furniture icons — same look as src/textures/categories/furniture.ts,
// but alive. Each fn redraws the WHOLE icon at time `t` (elapsed seconds),
// centered at origin within a roughly -24..+24 box; the caller handles
// clear/save/translate/scale/restore.
//
// Module theme: the first draft only moved POINT LIGHT (glows, sheens, motes)
// over frozen furniture — half the pieces were effectively dead. This rebuild
// leads with real OBJECT deformation (a tipping book, a rocking easel, a swaying
// shade, a counter-rocking clock case, base-anchored flames) and demotes the
// light effects to a secondary "cozy-room breathing" accent. Loops tile exactly
// because every position is driven off `t` through loopPhase/pingPong/breathe/
// beat (never a raw sawtooth used as a position), and contact shadows couple to
// vertical motion via groundShadow.

import {
  TAU,
  clamp01,
  lerp,
  breathe,
  loopPhase,
  pingPong,
  beat,
  twinkle,
  easeInOutSine,
  easeOutBack,
  windupOvershoot,
  groundShadow,
  glint,
  sparkle,
  flicker,
} from "./_anim.js";

// Local rounded-rect helper (per-file path builder, matching the static icons).
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function woodH(ctx: CanvasRenderingContext2D, x0: number, x1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "#c08a4a");
  g.addColorStop(0.5, "#8a5424");
  g.addColorStop(1, "#5a3414");
  return g;
}

function woodV(ctx: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#c08a4a");
  g.addColorStop(0.5, "#8a5424");
  g.addColorStop(1, "#5a3414");
  return g;
}

// A sharp-tipped flame anchored at its BASE (cx,baseY). `s` is the base scale;
// `lean` shifts the tip sideways; `grow` (≈1) scales the whole flame about the
// base for the settle/flare beat. The tip is a true point (two curves meeting at
// one apex) so it never reads blobby, and the base stays welded to the fuel.
function drawFlame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  lean: number,
  grow: number,
  bright: number,
): void {
  const h = s * 2.4 * grow; // tip height above the base
  const tipX = cx + lean;
  const tipY = baseY - h;
  const w = s * grow;
  const g = ctx.createLinearGradient(cx, tipY, cx, baseY);
  g.addColorStop(0, `rgba(255,251,224,${0.9 + bright * 0.1})`);
  g.addColorStop(0.4, "#ffd24a");
  g.addColorStop(1, "#e8501a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.55, baseY); // base, left of fuel
  // Up the right flank, bowing out, narrowing to the apex.
  ctx.bezierCurveTo(cx + w, baseY - h * 0.35, tipX + w * 0.32, tipY + h * 0.32, tipX, tipY);
  // Back down the left flank to the base.
  ctx.bezierCurveTo(tipX - w * 0.32, tipY + h * 0.32, cx - w, baseY - h * 0.35, cx - w * 0.55, baseY);
  ctx.closePath();
  ctx.fill();
  // Inner hot core — a smaller sharp tongue for depth.
  const cg = ctx.createLinearGradient(cx, tipY + h * 0.18, cx, baseY);
  cg.addColorStop(0, `rgba(255,240,180,${0.85 * bright})`);
  cg.addColorStop(1, "rgba(255,170,40,0)");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.28, baseY - h * 0.05);
  ctx.quadraticCurveTo(cx + w * 0.45, baseY - h * 0.4, tipX * 0.4 + cx * 0.6, tipY + h * 0.28);
  ctx.quadraticCurveTo(cx - w * 0.45, baseY - h * 0.4, cx - w * 0.28, baseY - h * 0.05);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Fireplace — base-anchored flames with sharp tips + an out-of-phase sway, a
// periodic SETTLE→FLARE beat (the fire dips then whooshes up brighter, glow and
// shadow react), and a seamless ember rise (each ember loops on its own phase so
// alpha is 0 at both wrap ends — no pop at the seam).
// ---------------------------------------------------------------------------
function animFireplace(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -7); // re-frame: was sitting ~7u low (off_y +7.0)

  // Settle→flare: rest, then a single eased whoosh (anticipation dip baked into
  // the flame `grow` below). One beat per ~3.4s.
  const flarePhase = loopPhase(t, 3.4);
  const flare = beat(t, 3.4, 0.42); // 0 at rest, 1 at peak
  const dip = flarePhase < 0.14 ? Math.sin((flarePhase / 0.14) * Math.PI) * 0.5 : 0; // brief crouch before the flare

  groundShadow(ctx, 0, 22, 22, 4, flare * 3, 0.22);

  // Stone surround
  const stone = ctx.createLinearGradient(0, -16, 0, 22);
  stone.addColorStop(0, "#b8b2a4");
  stone.addColorStop(1, "#7a746a");
  ctx.fillStyle = stone;
  rr(ctx, -20, -10, 40, 32, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wooden mantel across the top
  ctx.fillStyle = woodH(ctx, -22, 22);
  rr(ctx, -22, -16, 44, 7, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Mantel highlight
  ctx.fillStyle = "rgba(255,224,160,0.4)";
  rr(ctx, -21, -15, 42, 1.6, 0.8);
  ctx.fill();
  // Brick mortar lines on surround
  ctx.strokeStyle = "rgba(58,56,48,0.45)";
  ctx.lineWidth = 0.7;
  [-3, 5, 13].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-20, y); ctx.lineTo(20, y);
    ctx.stroke();
  });
  ([[-12, -9, -3], [-6, 5, 13], [10, -9, -3], [4, 5, 13]] as Array<[number, number, number]>).forEach(([x, y0, y1]) => {
    ctx.beginPath();
    ctx.moveTo(x, y0); ctx.lineTo(x, y1);
    ctx.stroke();
  });
  // Firebox opening — dark arch
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.lineTo(-12, 0);
  ctx.arc(0, 0, 12, Math.PI, 0, false);
  ctx.lineTo(12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Warm fire glow — pulses with the flicker AND swells on the flare.
  const glowPulse = 0.8 + flicker(t, 0.4, 0, 0.12) + flare * 0.18;
  const glowR = 18 + Math.sin(t * 4.5) * 1.4 + flare * 4;
  const glow = ctx.createRadialGradient(0, 14, 2, 0, 14, glowR);
  glow.addColorStop(0, `rgba(255,170,60,${glowPulse})`);
  glow.addColorStop(0.55, "rgba(255,120,40,0.42)");
  glow.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 14, glowR, 0, TAU);
  ctx.fill();

  // Logs
  ctx.strokeStyle = "#6a4218";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 20); ctx.lineTo(6, 18);
  ctx.moveTo(-6, 20); ctx.lineTo(8, 22);
  ctx.stroke();
  // Log ends
  ctx.fillStyle = "#a87a3a";
  ctx.beginPath();
  ctx.arc(-8, 20, 2, 0, TAU);
  ctx.arc(8, 22, 2, 0, TAU);
  ctx.fill();

  // Flames — base-anchored on the logs, each on its own sway phase, all sharing
  // the flare grow (with the anticipation dip) so the fire crouches then leaps.
  const grow = 1 + flare * 0.42 - dip * 0.28;
  const flames: Array<[number, number, number, number]> = [
    // cx, baseY, scale, phase
    [0, 18, 4.5, 0],
    [-5, 19, 3, 2.1],
    [5, 19, 3, 4.3],
  ];
  flames.forEach(([cx, baseY, s, phase]) => {
    const lean = Math.sin(t * 4.6 + phase) * 1.2 + Math.sin(t * 8.3 + phase * 1.7) * 0.5;
    const wob = 1 + Math.sin(t * 6.1 + phase) * 0.1;
    const bright = clamp01(0.7 + flare * 0.5 + Math.sin(t * 7.0 + phase) * 0.15);
    drawFlame(ctx, cx, baseY, s, lean, grow * wob, bright);
  });

  // Spark embers — rise on independent loops; alpha is 0 at both phase ends so
  // there is no pop where the loop wraps. Staggered offsets keep them from all
  // resetting on the same frame (fixes the old shared-modulo seam).
  ([[-2, 0.9, 0.0], [3, 0.8, 0.27], [-4, 0.7, 0.55], [1, 0.6, 0.78], [-1, 0.5, 0.4]] as Array<[number, number, number]>).forEach(
    ([x, r, off], i) => {
      const cyc = loopPhase(t, 2.6, off); // 0..1 rising
      const ey = 17 - cyc * 18; // from the fuel up past the arch
      const ex = x + Math.sin(t * 3.0 + i * 1.3) * 1.5 + cyc * (i % 2 === 0 ? 1.5 : -1.5);
      const alpha = Math.sin(cyc * Math.PI) * (0.7 + flare * 0.3); // 0 at both ends
      ctx.fillStyle = `rgba(255,210,120,${alpha})`;
      ctx.beginPath();
      ctx.arc(ex, ey, r * (0.7 + cyc * 0.4), 0, TAU);
      ctx.fill();
    },
  );
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Lamp — the SHADE itself now lives: a filament flickers inside, the whole lamp
// tilts gently about its base (shade + stem sway), and the warm light pools and
// breathes. The halo is feathered (multi-stop) and the old ternary color-SNAP is
// replaced by a continuous lerp between the warm shade tones.
// ---------------------------------------------------------------------------
function animLamp(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();

  // Filament glow (0..1) drives shade brightness; lamp sway tilts the body.
  const fil = clamp01(flicker(t, 0.0, 0.55, 1.0));
  const tilt = breathe(t, 4.6, 0.045) + Math.sin(t * 2.3) * 0.012; // slow lean + faint jitter
  const glowA = 0.55 + fil * 0.3;
  const glowR = 19 + fil * 3 + Math.sin(t * 1.8) * 1.0;

  // Warm glow halo behind shade — feathered with intermediate stops so the edge
  // dissolves instead of showing a hard ring. Sits a touch high so it leans too.
  const haloX = Math.sin(tilt) * 6;
  const glow = ctx.createRadialGradient(haloX, -8, 3, haloX, -8, glowR);
  glow.addColorStop(0, `rgba(255,216,128,${glowA})`);
  glow.addColorStop(0.45, `rgba(255,205,108,${glowA * 0.5})`);
  glow.addColorStop(0.75, "rgba(255,200,110,0.12)");
  glow.addColorStop(1, "rgba(255,210,110,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(haloX, -8, glowR, 0, TAU);
  ctx.fill();

  groundShadow(ctx, Math.sin(tilt) * 3, 22, 13, 4, 0, 0.22);

  // Base plate (grounded — does not tilt)
  ctx.fillStyle = "#5a4218";
  ctx.beginPath();
  ctx.ellipse(0, 20, 9, 3, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#2a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const base = ctx.createLinearGradient(0, 14, 0, 20);
  base.addColorStop(0, "#a8843a");
  base.addColorStop(1, "#6a4e18");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-7, 20);
  ctx.bezierCurveTo(-5, 14, 5, 14, 7, 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Everything above the base tilts about the base joint (0,16).
  ctx.save();
  ctx.translate(0, 16);
  ctx.rotate(tilt);
  ctx.translate(0, -16);

  // Brass stem
  const stem = ctx.createLinearGradient(-2, 0, 2, 0);
  stem.addColorStop(0, "#e8c860");
  stem.addColorStop(0.5, "#b8902a");
  stem.addColorStop(1, "#7a5e18");
  ctx.fillStyle = stem;
  rr(ctx, -1.6, 0, 3.2, 16, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a2c08";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Stem knob
  ctx.fillStyle = "#d8b048";
  ctx.beginPath();
  ctx.arc(0, 2, 2.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a5e18";
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Glowing shade (trapezoid) — mid tone lerps continuously with the filament
  // (no ternary snap). Brighter filament → warmer, paler mid.
  const midR = Math.round(lerp(255, 255, fil));
  const midG = Math.round(lerp(216, 232, fil));
  const midB = Math.round(lerp(122, 150, fil));
  const shade = ctx.createLinearGradient(0, -18, 0, -2);
  shade.addColorStop(0, "#fff0c0");
  shade.addColorStop(0.5, `rgb(${midR},${midG},${midB})`);
  shade.addColorStop(1, "#f0a838");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(-7, -2);
  ctx.lineTo(-11, -2);
  ctx.lineTo(-7, -18);
  ctx.lineTo(7, -18);
  ctx.lineTo(11, -2);
  ctx.lineTo(7, -2);
  ctx.closePath();
  ctx.fill();

  // Filament — a hot wire glowing inside the shade mouth, pulsing with `fil`.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-7, -2);
  ctx.lineTo(-11, -2);
  ctx.lineTo(-7, -18);
  ctx.lineTo(7, -18);
  ctx.lineTo(11, -2);
  ctx.lineTo(7, -2);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = `rgba(255,248,210,${0.5 + fil * 0.45})`;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-2.6, -5);
  ctx.quadraticCurveTo(0, -9 - fil * 1.2, 2.6, -5);
  ctx.stroke();
  // tiny bright bead at the filament crest
  ctx.fillStyle = `rgba(255,255,240,${0.4 + fil * 0.5})`;
  ctx.beginPath();
  ctx.arc(0, -7.5 - fil * 0.6, 0.9 + fil * 0.4, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#b87a18";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-7, -2);
  ctx.lineTo(-11, -2);
  ctx.lineTo(-7, -18);
  ctx.lineTo(7, -18);
  ctx.lineTo(11, -2);
  ctx.lineTo(7, -2);
  ctx.closePath();
  ctx.stroke();
  // Shade rim trims
  ctx.strokeStyle = "rgba(184,122,24,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, -18); ctx.lineTo(7, -18);
  ctx.moveTo(-11, -2); ctx.lineTo(11, -2);
  ctx.stroke();
  // Shade highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(-4, -16);
  ctx.lineTo(-1, -16);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-8, -4);
  ctx.closePath();
  ctx.fill();
  // Warm light pooling under the shade mouth — pulses + spreads with `fil`.
  ctx.fillStyle = `rgba(255,225,150,${0.42 + fil * 0.28})`;
  ctx.beginPath();
  ctx.ellipse(0, -2, 10 + fil * 1.4, 2, 0, 0, TAU);
  ctx.fill();
  ctx.restore(); // end tilt

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Clock — the eased pendulum stays, but now the whole CASE counter-rocks against
// the swing (Newton's-third reaction), the brass bob lags the rod for follow-
// through, and the minute hand TICKS in discrete one-second steps instead of
// gliding. The contact shadow couples to the case rock.
// ---------------------------------------------------------------------------
function animClock(ctx: CanvasRenderingContext2D, t: number): void {
  // Pendulum swing (eased ends via sin), case counter-rock = a small fraction of
  // the swing in the opposite sense, lagged so it trails the bob.
  const swing = Math.sin(t * 3.0) * 0.32; // radians, ~±18°
  const caseRock = -Math.sin(t * 3.0 - 0.5) * 0.03; // tiny reaction, lags + opposes

  ctx.save();
  groundShadow(ctx, Math.sin(caseRock) * 6, 22, 11, 3, 0, 0.22);

  // Whole case rocks about its foot (0,18).
  ctx.translate(0, 18);
  ctx.rotate(caseRock);
  ctx.translate(0, -18);

  // Wooden case (rounded top, long pendulum box)
  ctx.fillStyle = woodV(ctx, -22, 22);
  ctx.beginPath();
  ctx.moveTo(-11, -10);
  ctx.arc(0, -10, 11, Math.PI, 0, false);
  ctx.lineTo(11, 18);
  ctx.lineTo(-11, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Crown finial
  ctx.fillStyle = "#9a6630";
  ctx.beginPath();
  ctx.arc(0, -21, 2.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Clock face
  ctx.fillStyle = "#f6efdc";
  ctx.beginPath();
  ctx.arc(0, -9, 8.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Hour ticks
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const r1 = 7;
    const r2 = 8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, -9 + Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, -9 + Math.sin(a) * r2);
    ctx.stroke();
  }
  // Hands — minute hand TICKS: snap to one of 60 positions, advancing one step
  // per second, with a tiny eased overshoot on each tick (settles fast). Hour
  // hand creeps. Seamless because the step index is periodic over 60s.
  const cx = 0;
  const cy = -9;
  const secFrac = (t % 1 + 1) % 1; // 0..1 within the current second
  const step = Math.floor(((t % 60) + 60) % 60); // 0..59
  const tickKick = secFrac < 0.18 ? easeOutBack(secFrac / 0.18, 3) - 1 : 0; // brief snap overshoot
  const minAng = -Math.PI / 2 + ((step + tickKick) / 60) * TAU;
  const hourAng = -Math.PI / 2 + ((t % 720) / 720) * TAU; // slow 12-min hour creep
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hourAng) * 5, cy + Math.sin(hourAng) * 5); // hour hand
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(minAng) * 5.4, cy + Math.sin(minAng) * 5.4); // minute hand
  ctx.stroke();
  // Center pin
  ctx.fillStyle = "#3a1e08";
  ctx.beginPath();
  ctx.arc(cx, cy, 1.2, 0, TAU);
  ctx.fill();

  // Pendulum window (dark) in lower case
  ctx.fillStyle = "#3a2210";
  rr(ctx, -6, 2, 12, 14, 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pendulum — rod swings about pivot (0,2); the bob lags the rod a touch for
  // follow-through (it trails, then catches up at the turns).
  const px = 0;
  const py = 2;
  const len = 11;
  const bobSwing = Math.sin(t * 3.0 - 0.35) * 0.32; // lagged bob angle
  const rodX = px + Math.sin(swing) * len;
  const rodY = py + Math.cos(swing) * len;
  const bx = px + Math.sin(bobSwing) * len;
  const by = py + Math.cos(bobSwing) * len;
  // Rod follows the (leading) swing.
  ctx.strokeStyle = "#c8a850";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(rodX, rodY);
  ctx.stroke();
  // Brass bob (at the lagged position)
  const bob = ctx.createRadialGradient(bx - 1, by - 1, 1, bx, by, 4);
  bob.addColorStop(0, "#ffe9a0");
  bob.addColorStop(1, "#a8842a");
  ctx.fillStyle = bob;
  ctx.beginPath();
  ctx.arc(bx, by, 3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a5e1a";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Table — now reads as a PEDESTAL table (central column + splayed foot, fixing
// the ambiguous two-leg silhouette) with a real candle idle: the flame LEANS on
// a slow draft (not just a buzz), a warm glow POOL on the tabletop pulses, and a
// wax drip slowly forms, swells, and releases on a loop.
// ---------------------------------------------------------------------------
function animTable(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2); // re-frame: was sitting ~2u low (off_y +1.9)

  groundShadow(ctx, 0, 23, 16, 4, 0, 0.22);

  // Central pedestal column (replaces the ambiguous splayed two-leg read).
  const colTop = woodV(ctx, 2, 18);
  ctx.fillStyle = colTop;
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.bezierCurveTo(-3, 9, -3, 13, -5, 17);
  ctx.lineTo(5, 17);
  ctx.bezierCurveTo(3, 13, 3, 9, 4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Column collar
  ctx.fillStyle = "#9a6630";
  rr(ctx, -4.5, 5, 9, 2.2, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Splayed foot / base disc
  ctx.fillStyle = woodH(ctx, -10, 10);
  ctx.beginPath();
  ctx.moveTo(-11, 21);
  ctx.bezierCurveTo(-9, 16, 9, 16, 11, 21);
  ctx.bezierCurveTo(7, 22.5, -7, 22.5, -11, 21);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,224,160,0.3)";
  ctx.beginPath();
  ctx.ellipse(-3, 19.5, 5, 1.2, -0.1, 0, TAU);
  ctx.fill();

  // Apron under tabletop
  ctx.fillStyle = "#6a3e18";
  rr(ctx, -15, 2, 30, 4, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Round tabletop
  const top = ctx.createLinearGradient(0, -4, 0, 4);
  top.addColorStop(0, "#c89858");
  top.addColorStop(0.5, "#a8703a");
  top.addColorStop(1, "#7a4a1e");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 5.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Tabletop grain rings
  ctx.strokeStyle = "rgba(58,30,8,0.4)";
  ctx.lineWidth = 0.7;
  [10, 14].forEach((r) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.29, 0, 0, TAU);
    ctx.stroke();
  });
  // Tabletop highlight
  ctx.fillStyle = "rgba(255,224,170,0.4)";
  ctx.beginPath();
  ctx.ellipse(-6, -1.5, 6, 1.6, -0.1, 0, TAU);
  ctx.fill();

  // Candle idle quantities.
  const draft = Math.sin(t * 1.1) * 0.6 + Math.sin(t * 2.7) * 0.25; // slow lean of the flame
  const fil = clamp01(flicker(t, 0.2, 0.6, 1.0));
  // Wax drip cycle: forms (grows), swells at a bead, releases, resets — seamless.
  const dripPhase = loopPhase(t, 5.2);
  const dripLen = easeInOutSine(Math.min(1, dripPhase / 0.8)) * 6 * (dripPhase < 0.92 ? 1 : (1 - dripPhase) / 0.08);
  const dripBead = dripPhase > 0.6 && dripPhase < 0.92 ? (dripPhase - 0.6) / 0.32 : 0;

  // Warm glow POOL on the tabletop surface (under the candle), pulsing.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 5.5, 0, 0, TAU);
  ctx.clip();
  const pool = ctx.createRadialGradient(0, -1, 1, 0, -1, 13);
  pool.addColorStop(0, `rgba(255,210,120,${0.3 + fil * 0.22})`);
  pool.addColorStop(0.6, "rgba(255,180,90,0.12)");
  pool.addColorStop(1, "rgba(255,180,90,0)");
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(0, -1, 13, 4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Candle body
  ctx.fillStyle = "#fff6e0";
  rr(ctx, -2, -12, 4, 11, 1);
  ctx.fill();
  ctx.strokeStyle = "#d8b878";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Candle drip highlight (static seam)
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-1, -11); ctx.lineTo(-1, -2);
  ctx.stroke();
  // Live wax drip running down the right face.
  if (dripLen > 0.2) {
    ctx.fillStyle = "#fff6e0";
    ctx.beginPath();
    ctx.moveTo(1.6, -7);
    ctx.lineTo(1.9, -7 + dripLen);
    ctx.quadraticCurveTo(2.1 + dripBead * 0.6, -6.5 + dripLen, 1.2, -6.5 + dripLen);
    ctx.lineTo(0.9, -7);
    ctx.closePath();
    ctx.fill();
    if (dripBead > 0.05) {
      ctx.beginPath();
      ctx.arc(1.6, -6 + dripLen, 0.7 + dripBead * 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(216,184,120,0.5)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(1.9, -7 + dripLen);
    ctx.lineTo(1.9, -7);
    ctx.stroke();
  }

  // Warm flame glow halo — pulses with the filament.
  const glowR = 9 + fil * 1.6;
  const glow = ctx.createRadialGradient(0, -14, 1, 0, -14, glowR);
  glow.addColorStop(0, `rgba(255,200,90,${0.5 + fil * 0.24})`);
  glow.addColorStop(0.6, "rgba(255,190,90,0.16)");
  glow.addColorStop(1, "rgba(255,200,90,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -14, glowR, 0, TAU);
  ctx.fill();

  // Flame — base-anchored at the wick (0,-12), leaning with the draft, sharp tip.
  drawFlame(ctx, 0, -12, 2.5, draft, 1, fil);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Mirror — dead before. Now the whole easel ROCKS gently on its feet, and the
// reflection glint is a real EVENT: long calm, then a single fast diagonal sweep
// that fires a star-pop where it crosses the glass. Both static sheens from the
// source art are restored beneath so the glass never looks bare at rest.
// ---------------------------------------------------------------------------
function animMirror(ctx: CanvasRenderingContext2D, t: number): void {
  // Easel rock about the feet, plus the glint event.
  const rock = breathe(t, 5.0, 0.035) + Math.sin(t * 2.2) * 0.008;
  const sweepBeat = beat(t, 6.0, 0.16); // long rest, brief fast sweep
  const popBeat = beat(t, 6.0, 0.07, 0.05); // star-pop slightly after the sweep peak

  ctx.save();
  groundShadow(ctx, Math.sin(rock) * 8, 22, 14, 4, 0, 0.22);

  // Standing feet (grounded pivot row).
  ctx.strokeStyle = "#9a7a2a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 18); ctx.lineTo(-10, 22);
  ctx.moveTo(6, 18); ctx.lineTo(10, 22);
  ctx.moveTo(0, 16); ctx.lineTo(0, 19);
  ctx.stroke();

  // The framed mirror rocks about the foot line (0,18).
  ctx.save();
  ctx.translate(0, 18);
  ctx.rotate(rock);
  ctx.translate(0, -18);

  // Gold ornate oval frame
  const frame = ctx.createLinearGradient(-14, 0, 14, 0);
  frame.addColorStop(0, "#f0d878");
  frame.addColorStop(0.5, "#c8a032");
  frame.addColorStop(1, "#8a6a1a");
  ctx.fillStyle = frame;
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 19, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a4410";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner frame bevel
  ctx.strokeStyle = "rgba(255,245,200,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -2, 12.2, 17, 0, 0, TAU);
  ctx.stroke();
  // Mirror glass
  const glass = ctx.createLinearGradient(-9, -18, 9, 14);
  glass.addColorStop(0, "#d8eef4");
  glass.addColorStop(0.5, "#a8c8d8");
  glass.addColorStop(1, "#7a9eb0");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 15, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a7a88";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Clip to the glass for ALL sheens (restored statics + the moving sweep).
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 15, 0, 0, TAU);
  ctx.clip();

  // Static sheen #1 (the broad diagonal streak) — restored from the source art.
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.lineTo(-3, -14);
  ctx.lineTo(4, 8);
  ctx.lineTo(0, 10);
  ctx.closePath();
  ctx.fill();
  // Static sheen #2 (the thinner streak) — restored.
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.moveTo(2, -13);
  ctx.lineTo(5, -14);
  ctx.lineTo(8, 2);
  ctx.lineTo(5, 3);
  ctx.closePath();
  ctx.fill();

  // The EVENT sweep — a bright feathered band that only crosses during the beat
  // (fast), then is gone. Driven by the beat envelope so it dwells off-glass.
  if (sweepBeat > 0.001) {
    const travel = lerp(-16, 16, sweepBeat); // races across during the brief beat
    const ang = Math.atan2(32, 18); // glass diagonal
    ctx.save();
    ctx.translate(0, -2);
    ctx.rotate(ang - Math.PI / 2);
    const band = ctx.createLinearGradient(travel - 7, 0, travel + 7, 0);
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.5, `rgba(255,255,255,${0.55 * sweepBeat})`);
    band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.fillRect(-24, -28, 48, 56);
    ctx.restore();
  }
  ctx.restore(); // end glass clip

  // Star-pop where the sweep leaves the glass — a clean 4-point sparkle.
  if (popBeat > 0.01) {
    sparkle(ctx, 4, -8, 1.5 + popBeat * 1.6, popBeat, "255,255,250");
  }

  // Ornate crown scroll at top of frame
  ctx.fillStyle = "#e0c860";
  ctx.beginPath();
  ctx.arc(0, -22, 3, Math.PI, 0, false);
  ctx.fill();
  ctx.strokeStyle = "#5a4410";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Frame stud accents
  ctx.fillStyle = "#fff5c8";
  ([[-12, -2], [12, -2], [0, -20], [0, 16]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, TAU);
    ctx.fill();
  });
  ctx.restore(); // end rock
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Bookshelf — was the deadest icon (an 8%-opacity shimmer + a sub-pixel mote).
// Now it has a real object idle: a book on the top row TIPS out at its base then
// rights itself with an overshoot, NUDGING its right neighbour (follow-through);
// the potted plant sways; a firefly drifts and blinks; and a feathered spine
// glint travels the interior. Re-framed up out of the dead air.
// ---------------------------------------------------------------------------
function animBookshelf(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.5); // re-frame: was sitting ~2.5u low (off_y +2.5)

  groundShadow(ctx, 0, 23, 17, 4, 0, 0.22);

  // Outer cabinet frame
  ctx.fillStyle = woodV(ctx, -20, 22);
  rr(ctx, -15, -20, 30, 42, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner recessed back
  ctx.fillStyle = "#4a2c12";
  rr(ctx, -12, -17, 24, 36, 1.5);
  ctx.fill();
  // Shelf boards
  ctx.fillStyle = "#7a4a1e";
  [-5, 7].forEach((y) => {
    rr(ctx, -12, y, 24, 3, 1);
    ctx.fill();
    ctx.strokeStyle = "#3a1e08";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Tip-and-right beat: one book leans out at its spine base, then springs back
  // upright (overshoot + settle). Its right neighbour gets a smaller lagged nudge.
  const tipPhase = loopPhase(t, 4.4);
  // 0..1 "out" envelope that rises, holds briefly, then springs back past 0.
  let tipOut = 0;
  if (tipPhase < 0.22) tipOut = easeInOutSine(tipPhase / 0.22); // lean out
  else if (tipPhase < 0.34) tipOut = 1; // hold tipped
  else if (tipPhase < 0.62) tipOut = 1 - windupOvershoot((tipPhase - 0.34) / 0.28, 0, 2.4); // spring upright + overshoot
  const tipLean = tipOut * 0.16; // radians the book tips (base pivot)
  const jostle = -tipOut * 0.05; // neighbour rocks the other way, smaller

  // Book spine helper. `pivotLean` rotates the spine about its BASE (so it tips
  // out like a real book), `shine` (0..1) adds a soft moving spine highlight.
  const book = (
    x: number,
    yTop: number,
    w: number,
    h: number,
    color: string,
    lean: number,
    pivotLean: number,
    shine: number,
  ): void => {
    ctx.save();
    ctx.translate(x, yTop + h); // base of the spine
    ctx.rotate(lean + pivotLean);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, color);
    g.addColorStop(0.5, color);
    g.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = g;
    rr(ctx, -w / 2, -h, w, h, 1);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // top band
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    rr(ctx, -w / 2 + 0.6, -h + 1.2, w - 1.2, 1.4, 0.5);
    ctx.fill();
    // moving spine glint (feathered, clipped to this spine)
    if (shine > 0.01) {
      ctx.save();
      rr(ctx, -w / 2, -h, w, h, 1);
      ctx.clip();
      glint(ctx, shine, { span: h * 0.5, width: 2.2, angle: 0, intensity: 0.3 * shine, length: h + 4 });
      ctx.restore();
    }
    ctx.restore();
  };

  // A feathered glint sweeps the interior left→right, lighting each spine as it
  // passes (phase per book x). Drive position off a seamless loop.
  const sweep = pingPong(t, 6.0) * 30 - 15; // -15..+15, eased, seamless
  const shineFor = (x: number): number => {
    const d = Math.abs(x - sweep);
    return d < 5 ? clamp01(1 - d / 5) : 0;
  };

  // Top row — book #2 (the blue one at -4.5) is the one that tips; its right
  // neighbour (-0.5, gold) gets the lagged jostle.
  book(-9, -16, 4, 11, "#c8483a", 0, 0, shineFor(-9));
  book(-4.5, -16, 3.6, 11, "#3a78b8", 0, tipLean, shineFor(-4.5));
  book(-0.5, -16, 4, 11, "#e0a838", 0, jostle, shineFor(-0.5));
  book(4, -16, 3.4, 11, "#5aa05a", 0, 0, shineFor(4));
  book(8.4, -15, 3.6, 10, "#9a5ad0", 0.18, 0, shineFor(8.4));
  // Middle row of books
  book(-9, -4, 4, 10, "#3a8866", 0, 0, shineFor(-9));
  book(-4.5, -4, 3.6, 10, "#d06aa0", 0, 0, shineFor(-4.5));
  book(-0.5, -4, 4, 10, "#c8483a", 0, 0, shineFor(-0.5));
  book(4, -4, 3.4, 10, "#e0a838", 0, 0, shineFor(4));
  book(8, -4, 4, 10, "#3a78b8", 0, 0, shineFor(8));
  // Bottom row — a leaning stack + stacked flat books (flat ones don't tip).
  book(-9, 8, 4, 10, "#9a5ad0", 0, 0, shineFor(-9));
  book(-4.5, 8, 3.6, 10, "#5aa05a", 0, 0, shineFor(-4.5));
  book(0, 9, 8, 3, "#a8703a", 0, 0, 0);
  book(0, 12, 7, 3, "#c8483a", 0, 0, 0);

  // Potted plant on bottom-right — the pot is fixed; the leaves sway about the
  // pot rim (a gentle breeze, each leaf on its own phase).
  ctx.fillStyle = "#b8542a";
  rr(ctx, 7, 13, 6, 5, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.save();
  ctx.translate(10, 13); // pot rim, leaf pivot
  ctx.rotate(breathe(t, 3.2, 0.07));
  ctx.translate(-10, -13);
  ctx.fillStyle = "#5a8028";
  ([[8, 11, -0.5], [10, 10, 0], [12, 11, 0.5]] as Array<[number, number, number]>).forEach(([x, y, base], li) => {
    const flutter = breathe(t, 2.2, 0.12, 0, li * 0.4);
    ctx.beginPath();
    ctx.ellipse(x, y, 1.8, 3, base + flutter, 0, TAU);
    ctx.fill();
  });
  ctx.restore();

  // Firefly — a clean little spark drifting on a slow Lissajous path, blinking
  // (twinkle) so it reads as a firefly, not a frozen mote. Seamless via loopPhase.
  const fp = loopPhase(t, 7.0);
  const fx = -7 + Math.sin(fp * TAU) * 5 + Math.sin(fp * TAU * 2) * 1.5;
  const fy = 2 - Math.cos(fp * TAU) * 9;
  const blink = twinkle(t, 2.3);
  sparkle(ctx, fx, fy, 0.9 + blink * 1.0, 0.25 + blink * 0.6, "210,255,170");
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  furn_fireplace: animFireplace,
  furn_lamp: animLamp,
  furn_clock: animClock,
  furn_table: animTable,
  furn_mirror: animMirror,
  furn_bookshelf: animBookshelf,
};
