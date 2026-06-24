// Animated cozy home & town decorations — same look as
// src/textures/categories/cozyDecor.ts, but alive.
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds), centred at the
// origin within a roughly -24..+24 box (the caller handles clear / translate /
// scale / restore; ground baseline ≈ y 22). The static silhouettes & palettes
// are the strong part and are kept verbatim; the MOTION is rebuilt to lead with
// real body deformation and the 12 principles:
//   - the dominant "timid 4° pendulum" reused on four icons becomes a
//     breeze-GUST pendulum (anticipation dip → overshoot → damped settle, via
//     `windupOvershoot` gated by a `beat`) with parts that LAG the lead;
//   - rest-pose + a MOMENT (a flag snap, a clapper ting, a bird pop, a jet
//     pulse) instead of a perpetual metronome;
//   - shadows couple to motion through `groundShadow(..., lift)`;
//   - framing fixes via a top-level `ctx.translate` to kill dead air.
// Loops are seamless: every position is driven off `t` through the phase/wave
// helpers (`loopPhase`/`pingPong`/`breathe`/`beat`), never a raw sawtooth.
// Deterministic (no Math.random / Date) and stub-safe (standard ctx calls only).

import {
  TAU,
  clamp01,
  lerp,
  easeOutCubic,
  easeOutElastic,
  loopPhase,
  breathe,
  beat,
  windupOvershoot,
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

/** A periodic breeze GUST in radians: rest, then an anticipation dip → overshoot
 *  → damped settle, repeated every `period`. Replaces the timid bare-sine sway.
 *  `dir` flips the gust direction; `width` is the fraction of the cycle the gust
 *  occupies (the rest of the cycle is the calm settle). */
function gustSwing(t: number, period: number, amp: number, dir = 1, width = 0.6, offset = 0): number {
  const u = loopPhase(t, period, offset);
  if (u >= width) return 0;
  return dir * amp * windupOvershoot(u / width, 0.18, 2.4);
}

// ---------------------------------------------------------------------------
// 1. Lantern — a breeze-GUST pendulum (anticipation → overshoot → damped settle)
//    about the hook, with the FLAME lagging the swing and a candle-flame flicker.
// ---------------------------------------------------------------------------
function animLantern(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -0.5); // re-frame: was ~0.5u low (off_y -0.5 → sits slightly high; nudge up keeps the hook in box)

  // Gust pendulum: gusts alternate direction; the calm portion settles to plumb.
  const swayA = gustSwing(t, 4.2, 0.16, 1, 0.62, 0);
  const swayB = gustSwing(t, 4.2, 0.12, -1, 0.62, 0.5);
  const sway = swayA + swayB;
  // The heavy lantern body lags the hook a touch (follow-through / overlap).
  const lag = gustSwing(t - 0.12, 4.2, 0.16, 1, 0.62, 0) + gustSwing(t - 0.12, 4.2, 0.12, -1, 0.62, 0.5);

  groundShadow(ctx, sway * 22, 22.5, 12, 3, 0, 0.22);

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
  ctx.rotate(lag);
  ctx.translate(0, 22);

  // Flame flicker — height + brightness; the wobble LAGS the swing (the flame
  // trails the body, then catches up), so the candle reads as a real pendulum.
  const flick = flicker(t, 0.3, 0.6, 1.4) - 1; // ≈ -0.4..+0.4 around 0
  const flameH = 6 + flick * 1.8; // taller/shorter
  const swayVel = sway - lag; // how far the body leads the flame right now
  const flameWob = -swayVel * 34 + Math.sin(t * 9 + 0.4) * 0.5; // tip trails, then drifts
  const glowPulse = 0.55 + flick * 0.16;

  // Warm glow halo behind glass (pulses with flame).
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
  glow.addColorStop(0, `rgba(255,200,90,${glowPulse.toFixed(3)})`);
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

  // Flame — base at -2 (candle top), tip rises by flameH and trails the swing.
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
  ctx.ellipse(tipX * 0.5, -3.5, 1, 1.8 + flick * 0.5, 0, 0, TAU);
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
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. Street lamp — the post stays planted (a streetlamp shouldn't sway); life
//    comes from a REAL fluttering moth that loops a figure-8, flickers its
//    wings, and BUMPS the glow brighter when it brushes the glass, plus a faint
//    creak of the lamp head as the breeze nudges it.
// ---------------------------------------------------------------------------
function animStreetLamp(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -3); // re-frame: was sitting ~3u low (off_y -3.0)

  groundShadow(ctx, 0, 23.5, 12, 4, 0, 0.22);

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

  // The moth flies a figure-8 around the head; position it FIRST so its nearness
  // to the glass (and the flutter beat) can drive the glow bump.
  const mp = loopPhase(t, 3.6);
  const ma = mp * TAU;
  const mx = Math.sin(ma) * 12;
  const my = -18 + Math.sin(ma * 2) * 7; // figure-8 (∞) around the head centre
  // Distance from the bright glass centre (0,-18) → a "bump" when it's close.
  const near = clamp01(1 - (Math.abs(mx) + Math.abs(my + 18)) / 16);
  const bump = near * near; // brighten the glow as the moth brushes the pane

  // Faint head creak: the breeze just barely rocks the lamp head (NOT the post).
  const creak = gustSwing(t, 5.0, 0.05, 1, 0.5, 0) + gustSwing(t, 5.0, 0.04, -1, 0.5, 0.5);

  // Warm glow halo — lazy gas-lamp flicker, brightening when the moth bumps it.
  const flick = flicker(t, 0.9, 0.7, 1.0) - 0.85; // ≈ -0.15..+0.15
  const glowA = 0.5 + flick * 0.5 + bump * 0.22;
  const glowR = 16 + flick * 4 + bump * 2;
  const glow = ctx.createRadialGradient(0, -18, 2, 0, -18, glowR);
  glow.addColorStop(0, `rgba(255,205,100,${clamp01(glowA).toFixed(3)})`);
  glow.addColorStop(1, "rgba(255,205,100,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -18, glowR, 0, TAU);
  ctx.fill();

  // Lamp head group — creaks gently about the bracket joint (~ -10).
  ctx.save();
  ctx.translate(0, -10);
  ctx.rotate(creak);
  ctx.translate(0, 10);

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

  // Glass head — glowing, brightness tracks the flicker + the moth bump.
  const lift = flick * 0.12 + bump * 0.05;
  const glass = ctx.createLinearGradient(0, -22, 0, -12);
  glass.addColorStop(0, `rgba(255,240,184,${clamp01(0.92 + lift).toFixed(3)})`);
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

  ctx.restore(); // head creak

  // The moth — a real little character: dusty body, two fluttering wings whose
  // width pulses fast (wingbeat), banking into its turn. Drawn over the head.
  const beatPhase = Math.sin(t * 22) * 0.5 + 0.5; // 0..1 fast wingbeat
  const wingW = lerp(1.4, 3.6, beatPhase);
  const bank = Math.cos(ma) * 0.5; // lean into the figure-8
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(bank);
  // Wings (pale, translucent).
  ctx.fillStyle = "rgba(245,235,205,0.85)";
  ctx.beginPath();
  ctx.ellipse(-wingW * 0.7, -0.3, wingW, 2.0, -0.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(wingW * 0.7, -0.3, wingW, 2.0, 0.5, 0, TAU);
  ctx.fill();
  // Body (small, dark, dusty).
  ctx.fillStyle = "#8a7a55";
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.9, 2.0, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // A soft sparkle pings off the moth when it brushes the lit pane.
  if (bump > 0.4) sparkle(ctx, mx, my, 1.4, (bump - 0.4) * 1.4, "255,240,190");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. Fountain — a PULSING jet (beats up the spout) with cascading beads down the
//    arcs and expanding LANDING ripples where they hit the pool; the spout
//    column z-order is fixed (basin water draws first, then stonework, then the
//    jet + arcs on top so nothing pokes through the spout).
// ---------------------------------------------------------------------------
function animFountain(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.3); // re-frame: was sitting ~2.3u low (off_y +2.3)

  groundShadow(ctx, 0, 24.3, 22, 4, 0, 0.22);

  // Jet pulse — the pump pushes harder on a beat, then eases off.
  const jet = beat(t, 2.4, 0.7); // 0 rest → 1 peak → 0
  const jetH = easeOutCubic(jet); // softens the top of the pulse

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

  // --- Pool water (drawn UNDER the stonework so the pillar reads in front). ---
  const ripple = breathe(t, 1.8, 0.4, 0);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 12, 20, 3.6, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = "#79c4d8";
  ctx.beginPath();
  ctx.ellipse(0, 12, 20, 3.2 + ripple, 0, 0, TAU);
  ctx.fill();
  // Drifting surface highlights.
  for (let i = 0; i < 2; i++) {
    const phase = loopPhase(t, 1.7, i * 0.5);
    const hx = -16 + phase * 32;
    const ha = Math.sin(phase * Math.PI) * 0.45;
    ctx.fillStyle = `rgba(255,255,255,${ha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(hx, 11.4, 5, 0.9, 0, 0, TAU);
    ctx.fill();
  }
  // Expanding LANDING ripple rings where the two arcs splash down (≈ ±11).
  ([-11, 11] as number[]).forEach((lx, li) => {
    const rp = loopPhase(t, 1.2, li * 0.5);
    const rr2 = rp * 9;
    ctx.strokeStyle = `rgba(255,255,255,${(0.5 * (1 - rp)).toFixed(3)})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(lx, 12, rr2, rr2 * 0.32, 0, 0, TAU);
    ctx.stroke();
  });
  ctx.restore();
  ctx.strokeStyle = "#3a7888";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 12, 20, 3.2, 0, 0, TAU);
  ctx.stroke();

  // Central pillar (in front of the pool water).
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

  // Upper dish water (small ripple, swells with the jet).
  ctx.fillStyle = "#79c4d8";
  ctx.beginPath();
  ctx.ellipse(0, -5, 8, 2 + breathe(t, 1.5, 0.3, 0, 0.3) + jetH * 0.4, 0, 0, TAU);
  ctx.fill();

  // Spout (the stone nozzle the jet rises from). Drawn BEFORE the water column.
  ctx.fillStyle = "#9d9a90";
  rr(ctx, -2, -14, 4, 10, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1;
  ctx.stroke();

  // --- Water, all drawn LAST so it sits correctly in front of the spout. ---
  // Central jet column: a translucent spire that pumps taller on the beat.
  const colTop = -14 - jetH * 7;
  const colW = 1.6 + jetH * 1.0;
  const colGrad = ctx.createLinearGradient(0, colTop, 0, -14);
  colGrad.addColorStop(0, "rgba(220,245,250,0.0)");
  colGrad.addColorStop(0.4, `rgba(200,235,245,${(0.5 * (0.4 + jetH * 0.6)).toFixed(3)})`);
  colGrad.addColorStop(1, "rgba(150,210,230,0.8)");
  ctx.fillStyle = colGrad;
  ctx.beginPath();
  ctx.moveTo(-colW, -14);
  ctx.quadraticCurveTo(-colW * 0.4, colTop + 2, 0, colTop);
  ctx.quadraticCurveTo(colW * 0.4, colTop + 2, colW, -14);
  ctx.closePath();
  ctx.fill();
  // A bright crown bead at the very top of the jet.
  ctx.fillStyle = `rgba(245,255,255,${(0.4 + jetH * 0.5).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, colTop, 0.9 + jetH * 0.8, 0, TAU);
  ctx.fill();

  // Water arcs — bow outward more at the top of the pulse (flowing feel).
  const arcBow = 1.0 + jetH * 2.2;
  ctx.strokeStyle = "rgba(150,210,230,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(-8 - arcBow, -18, -12 - arcBow, -10, -10, -4);
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(8 + arcBow, -18, 12 + arcBow, -10, 10, -4);
  ctx.stroke();
  // Cascading beads streaming DOWN each arc (continuous flow, not a wobble).
  for (let i = 0; i < 4; i++) {
    const p = loopPhase(t, 0.9, i / 4);
    const cl = -8 - arcBow;
    const lx = (1 - p) * (1 - p) * 0 + 2 * (1 - p) * p * (cl - 4) + p * p * -10;
    const ly = (1 - p) * (1 - p) * -14 + 2 * (1 - p) * p * -10 + p * p * -4;
    const cr = 8 + arcBow;
    const rxp = (1 - p) * (1 - p) * 0 + 2 * (1 - p) * p * (cr + 4) + p * p * 10;
    const fade = Math.sin(p * Math.PI);
    ctx.fillStyle = `rgba(220,242,250,${(0.5 + fade * 0.4).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(lx, ly, 0.9 + fade * 0.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rxp, ly, 0.9 + fade * 0.4, 0, TAU);
    ctx.fill();
  }

  // Splash droplets — rise then fall on a seamless loop (parabolic), kicked
  // higher by the jet pulse.
  const drops: Array<[number, number, number]> = [
    [-10, -2, 0],
    [10, -2, 0.33],
    [-13, 8, 0.66],
    [12, 8, 0.5],
  ];
  drops.forEach(([bx, by, off]) => {
    const p = loopPhase(t, 0.9, off);
    const hop = Math.sin(p * Math.PI);
    const dy = by - hop * (4 + jetH * 2);
    const r = 1.2 + hop * 0.3;
    ctx.fillStyle = `rgba(188,232,242,${(0.4 + hop * 0.6).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(bx, dy, r, 0, TAU);
    ctx.fill();
  });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. Wind chime — per-tube swing freq scales with tube LENGTH (longer = slower)
//    so identical tubes never realign into one rigid block; the whole rig is
//    gust-driven, and the clapper STRIKES a tube — a real TING (the struck tube
//    flashes + rings + a sparkle) instead of a clapper that never connects.
// ---------------------------------------------------------------------------
function animWindChime(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -0.6); // re-frame (off_y -0.6)

  // Overall gust sway about the hook at top (-23): a real breeze, not a metronome.
  const sway = gustSwing(t, 3.8, 0.16, 1, 0.6, 0) + gustSwing(t, 3.8, 0.13, -1, 0.6, 0.5);
  const gust = clamp01(Math.abs(sway) / 0.16); // 0 calm → 1 mid-gust (drives tube energy)

  groundShadow(ctx, sway * 24, 22.4, 10, 3, 0, 0.2);

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

  // Central clapper — swings widest of all and reaches out to STRIKE a tube.
  // Its angle (in tube space) tells us which tube it has just hit.
  const clapAng = gustSwing(t, 1.9, 0.5, 1, 0.55, 0) + gustSwing(t, 1.9, 0.42, -1, 0.55, 0.5)
    + Math.sin(t * 3.1) * 0.06 * (0.4 + gust);
  const clapReach = 22; // length from pivot
  const clapX = Math.sin(clapAng) * clapReach;

  // Dangling tubes — freq scales INVERSELY with length, so the five tubes drift
  // out of phase forever (the realign bug). The struck one rings on contact.
  const tubes: Array<[number, number]> = [[-9, 12], [-4.5, 16], [0, 18], [4.5, 16], [9, 12]];
  // Which tube is the clapper nearest right now (for the ting)?
  let nearest = 0;
  let nd = 1e9;
  tubes.forEach(([x], i) => {
    const d = Math.abs(x - clapX);
    if (d < nd) { nd = d; nearest = i; }
  });
  const striking = nd < 2.6; // clapper is in contact with a tube

  tubes.forEach(([x, len], i) => {
    const top = -10;
    // Longer tube → lower pitch → SLOWER swing; plus a per-tube phase offset.
    const freq = 3.4 - len * 0.11; // len 12→2.08, 18→1.42 rad/s : different periods
    const energy = 0.05 + gust * 0.12;
    let tubeSwing = Math.sin(t * freq + i * 1.3) * energy;
    // The struck tube physically reacts: the clapper PUSHES it away (deflection
    // grows with penetration depth) and it shivers at its own pitch — a real
    // ring on contact, deterministic and continuous (no hard jump).
    if (striking && i === nearest) {
      const push = (2.6 - nd) / 2.6; // 0 at first touch → 1 at deepest contact
      const away = clapX >= x ? -1 : 1; // shove away from the clapper
      tubeSwing += away * 0.12 * push + Math.sin(t * (freq * 9)) * 0.05 * push;
    }
    ctx.save();
    ctx.translate(x, top);
    ctx.rotate(tubeSwing);

    // String to tube.
    ctx.strokeStyle = "rgba(90,90,90,0.6)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-x * 0.6, -2);
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

    // TING flash — the struck tube briefly glows along its length.
    if (striking && i === nearest) {
      ctx.strokeStyle = "rgba(255,255,235,0.7)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 1); ctx.lineTo(0, len - 1);
      ctx.stroke();
    }

    ctx.restore();
  });

  // Clapper line + disc (drawn over the tubes; it's the closest element).
  ctx.strokeStyle = "rgba(90,90,90,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(clapX, 14);
  ctx.stroke();
  ctx.fillStyle = "#b8804a";
  ctx.beginPath();
  ctx.arc(clapX, 16, 3.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();

  // The TING sparkle at the point of contact.
  if (striking) {
    const [tx] = tubes[nearest];
    sparkle(ctx, lerp(clapX, tx, 0.5), 4, 1.8, 0.85, "255,255,235");
  }

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. Mailbox — the deadest icon, brought alive: the red flag SNAPS up
//    (anticipation dip → overshoot → settling flutter) on a periodic beat, the
//    whole box SETTLES with a squash when the snap lands, and a letter PEEKS out
//    of the slot as the flag goes up. Rest-pose + a clear MOMENT.
// ---------------------------------------------------------------------------
function animMailbox(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-1.9, -1.0); // re-frame: was ~1.9u right / 1.0u low (off (1.9,1.0))

  // "Mail arrived" event beat (~6s): a single snap, then calm.
  const ev = beat(t, 6.0, 0.34); // 0 rest → 1 → 0 over the snap window
  // The flag raise itself: anticipation → overshoot → settle (0 down, 1 up).
  const evPhase = loopPhase(t, 6.0);
  const raise = evPhase < 0.34 ? windupOvershoot(evPhase / 0.34, 0.22, 3.0) : 0;
  // Box settle: a quick squash that springs back when the snap lands.
  const settle = ev > 0 ? (1 - easeOutElastic(clamp01(evPhase / 0.34))) * ev : 0;

  groundShadow(ctx, 0, 23.0, 12, 4, -settle * 2, 0.22);

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

  // Box group — squashes on settle about its base (~ y -2).
  const sq = 1 + settle * 0.12;
  const st = 1 - settle * 0.1;
  ctx.save();
  ctx.translate(0, -2);
  ctx.scale(sq, st);
  ctx.translate(0, 2);
  // Plus a tiny rock from the snap recoil.
  ctx.translate(0, -10);
  ctx.rotate(-raise * 0.04);
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

  // A letter PEEKS out of the slot at the front while the flag is up (clipped to
  // the box so it slides out of the door, not floating).
  const peek = clamp01(raise);
  if (peek > 0.02) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-13, -2);
    ctx.lineTo(-13, -10);
    ctx.arc(0, -10, 13, Math.PI, 0, false);
    ctx.lineTo(13, -2);
    ctx.closePath();
    ctx.clip();
    const lx = -13 - peek * 4; // slides out the left-facing door
    ctx.save();
    ctx.translate(lx, -7);
    ctx.rotate(-0.18);
    ctx.fillStyle = "#f4ecd8";
    rr(ctx, -1, -3.4, 7, 6.8, 0.8);
    ctx.fill();
    ctx.strokeStyle = "#c8b890";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Envelope flap.
    ctx.strokeStyle = "rgba(180,150,100,0.8)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-1, -3.4);
    ctx.lineTo(2.5, 0.2);
    ctx.lineTo(6, -3.4);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

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

  ctx.restore(); // box squash/rock

  // Red flag — pivots at its post base (12,-4). Down at rest, SNAPS up with
  // overshoot, then flutters as it settles. `raise` 0..~1.1 (overshoot >1).
  const flagAngle = lerp(1.05, -0.02, clamp01(raise)); // ~60° down → upright
  // Settling flutter on the cloth once it's up.
  const flutter = raise > 0.5 ? Math.sin(t * 18) * 0.5 * (1 - clamp01((evPhase - 0.18) / 0.16)) : 0;
  ctx.save();
  ctx.translate(12, -4);
  ctx.rotate(flagAngle);

  // Flag post (now the flag's own mast; rotates with it about the base).
  ctx.strokeStyle = "#888d94";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -12);
  ctx.stroke();

  // Flag (red) — local coords relative to the mast top (0,-12); the free edge
  // waves (settling flutter + a faint idle ripple).
  const wave = flutter + Math.sin(t * 4) * 0.5 * raise;
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

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. Flower pot — a TRAVELING-WAVE bend ripples through the three stems (each
//    phase-offset by index, tip moving more than root) with the BLOOMS lagging
//    the stem tips (follow-through); leaves catch light; and a bee/butterfly
//    visits, looping in to hover at a bloom and back out.
// ---------------------------------------------------------------------------
function animFlowerPot(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -1.6); // re-frame (off_y +1.6)

  groundShadow(ctx, breathe(t, 2.4, 1.4, 0), 23.6, 14, 4, 0, 0.22);

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

  // Traveling wave: one wave train sweeps left→right across the planting, so the
  // stems ripple in sequence instead of leaning as one rigid fan.
  const waveAt = (x: number, phase: number): number =>
    Math.sin(t * 1.8 - x * 0.16 + phase) * 1.0 + Math.sin(t * 3.0 - x * 0.12 + phase) * 0.4;

  // Leaves flutter (drawn first, behind blooms) and catch a little top light.
  const leaves: Array<[number, number]> = [[-5, -6], [4, -8], [-2, -12], [3, -2]];
  leaves.forEach(([x, y], i) => {
    const flutter = Math.sin(t * 3 + i * 1.4) * 0.25 + waveAt(x, 0) * 0.06;
    const baseRot = x < 0 ? -0.5 : 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(baseRot + flutter);
    const lg = ctx.createLinearGradient(0, -1.5, 0, 1.5);
    lg.addColorStop(0, "#7aa838"); // lit top
    lg.addColorStop(1, "#3a6014"); // shaded underside
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 1.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(210,240,150,0.4)";
    ctx.beginPath();
    ctx.ellipse(-0.8, -0.5, 1.4, 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  });

  const stems: Array<[number, number, number]> = [
    [-7, -14, 0.0],
    [0, -18, 1.1],
    [7, -14, 2.2],
  ];
  const bloomColors: Array<[string, string]> = [
    ["#e85a8a", "#ffd24a"],
    ["#f0a030", "#ffe9a8"],
    ["#9a6ad0", "#ffd24a"],
  ];

  stems.forEach(([tx, ty, ph], i) => {
    const bendTip = waveAt(tx, ph) * 2.6; // tip displacement from the wave
    const bendMid = bendTip * 0.45; // root barely moves → a real bend, not a slide
    const tipX = tx + bendTip;
    const tipY = ty + Math.abs(bendTip) * 0.08; // tip dips slightly as it bows

    // Stem — quadratic so it CURVES (control point carries the mid bend).
    ctx.strokeStyle = "#3a6014";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(tx * 0.4, 3);
    ctx.quadraticCurveTo(tx * 0.6 + bendMid, (ty + 3) / 2, tipX, tipY);
    ctx.stroke();

    // Bloom — LAGS the tip (the heavy head trails the whip of the stem).
    const lagTipX = tx + waveAt(tx, ph - 0.55) * 2.6;
    const headX = lerp(tipX, lagTipX, 0.6);
    const headY = tipY;
    const headTilt = (headX - tipX) * 0.06; // the head cants as it lags

    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(headTilt);
    const [petal, core] = bloomColors[i];
    ctx.fillStyle = petal;
    for (let p = 0; p < 5; p++) {
      const a = -Math.PI / 2 + (p / 5) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  });

  // A visiting bee: loops in from off the left, hovers near the centre bloom,
  // then loops back out — a real little character with a fast wingbeat.
  const bp = loopPhase(t, 6.4);
  // Path: a gentle arc that dips toward the middle bloom (≈ 0,-18) at mid-cycle.
  const visit = Math.sin(bp * Math.PI); // 0→1→0
  const bx = lerp(-26, 26, bp);
  const by = lerp(-2, -18, visit) + Math.sin(bp * Math.PI * 6) * 1.6;
  const dir = bp < 0.5 ? 1 : -1; // facing travel direction
  const wb = Math.sin(t * 26) * 0.5 + 0.5; // wingbeat
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(dir, 1);
  // Wings.
  ctx.fillStyle = "rgba(235,240,255,0.8)";
  const ww = lerp(1.2, 2.6, wb);
  ctx.beginPath();
  ctx.ellipse(-0.4, -1.4, ww, 1.4, -0.4, 0, TAU);
  ctx.fill();
  // Body (striped).
  ctx.fillStyle = "#f0b800";
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.4, 1.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#2a2008";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-0.6, -1.2); ctx.lineTo(-0.6, 1.2);
  ctx.moveTo(0.9, -1.0); ctx.lineTo(0.9, 1.0);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. Birdhouse — the emerging bird is SPRUNG out of the hole (anticipation dip →
//    overshoot → settle, not a linear pop), looks left/right while it peeks, and
//    the whole house REACTS — leaning away on the pop and rocking back to rest.
// ---------------------------------------------------------------------------
function animBirdhouse(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.6); // re-frame: was sitting ~2.6u low (off_y +2.6)

  // Peek cycle (~4.0s): a clear emerge → look-around → duck → rest.
  const period = 4.0;
  const phase = loopPhase(t, period);
  // Spring the emerge: anticipation dip then overshoot+settle past the lip.
  let peek: number;
  if (phase < 0.22) {
    peek = windupOvershoot(phase / 0.22, 0.25, 2.8); // pop up (can exceed 1)
  } else if (phase < 0.58) {
    peek = 1; // hold, peeking + looking around
  } else if (phase < 0.7) {
    peek = easeOutCubic(1 - (phase - 0.58) / 0.12); // duck back quickly
  } else {
    peek = 0; // hidden, resting
  }
  const peekClamped = clamp01(peek);

  // Reactive house sway: the pop nudges the house (Newton's third law) and it
  // rocks back to plumb, plus a faint idle breeze.
  const popKick = phase < 0.22 ? -(peek - peekClamped + 0.0) : 0; // overshoot portion
  const idle = breathe(t, 3.4, 0.02, 0);
  const houseSway = idle - (phase < 0.3 ? Math.sin(clamp01(phase / 0.3) * Math.PI) * 0.05 : 0) + popKick * 0.04;

  groundShadow(ctx, houseSway * 26, 23.4, 12, 4, 0, 0.22);

  ctx.save();
  ctx.translate(0, 22);
  ctx.rotate(houseSway);
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
  if (peekClamped > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 2, 4.3, 0, TAU);
    ctx.clip();

    // Look-around: the head turns left/right while it holds the peek.
    const look = phase >= 0.22 && phase < 0.58
      ? Math.sin((phase - 0.22) / 0.36 * Math.PI * 2) * 1.4 // two glances
      : 0;
    const bobY = Math.sin(t * 9) * 0.3 * peekClamped;
    const headY = 5 - peek * 5 + bobY; // rises from inside the hole (overshoot lifts higher)

    ctx.save();
    ctx.translate(look * 0.5, headY);

    // Bird body/head.
    ctx.fillStyle = "#f0c050";
    ctx.beginPath();
    ctx.arc(0, 0, 3.1, 0, TAU);
    ctx.fill();
    // Beak — points the way the head looks.
    ctx.fillStyle = "#e8801a";
    const bdir = look >= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(bdir * 2.4, -0.2);
    ctx.lineTo(bdir * 4.6, 0.4);
    ctx.lineTo(bdir * 2.4, 1.2);
    ctx.closePath();
    ctx.fill();
    // Eye — tracks the look.
    ctx.fillStyle = "#241810";
    ctx.beginPath();
    ctx.arc(bdir * 0.6 + look * 0.4, -0.6, 0.7, 0, TAU);
    ctx.fill();
    ctx.restore();

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
