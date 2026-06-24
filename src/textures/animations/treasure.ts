// Treasure, loot & rewards — animated variants, rebuilt to lead with real body
// motion (settle/bob/tilt/jostle) instead of a glint over a frozen pile.
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds). The caller
// clears, translates to centre, scales (design box = 64u), sets
// lineCap/lineJoin="round", and calls us; we draw at origin (0,0) within a
// ~-24..+24 box. Everything is deterministic in `t` (no Math.random / Date) and
// loops seamlessly (phase helpers drive position off `t`, never a sawtooth).
//
// Shapes/colours mirror src/textures/categories/treasure.ts so identity reads
// the same — only the MOTION and the vertical FRAMING change. The shared
// `glintSweep` was a hard rectangle that leaked past loose clips and washed the
// gold to chrome; it is replaced everywhere by the feathered, tightly-clipped,
// low-intensity shared `glint`. The old "pinned to y≈22" framing left short
// subjects floating with dead air on top; each icon is re-framed via
// `ctx.translate` so the subject is centred and its contact shadow tracks its
// vertical motion.

import {
  TAU,
  clamp01,
  lerp,
  easeInOutSine,
  easeOutBack,
  easeOutElastic,
  loopPhase,
  pingPong,
  breathe,
  beat,
  twinkle,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// 1. treasure_chest_open — the chest does a slow proud "heave" breath; the lid
// rocks on its hinge with overlap (lags the body), the coins jostle individually
// (each clipped to its OWN circle so the sheen never shows a rectangular seam),
// and motes rise out on a beat. Glow breathes with the heave.
// ---------------------------------------------------------------------------
function animChestOpen(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -2.2); // re-frame: off_y +2.2

  // Proud "heave" — a slow eased breath that lifts the whole chest a touch.
  const heave = breathe(t, 2.6, 1, 0, 0); // -1..1
  const lift = Math.max(0, heave) * 1.6; // rises on the inhale
  const lidLag = breathe(t, 2.6, 1, 0, -0.12); // lid follows the body (overlap)

  groundShadow(ctx, 0, 24, 18, 4, lift, 0.24);

  // Inner glow rising from the chest — pulses with the heave.
  const glowPulse = 0.5 + 0.5 * heave;
  const glowR = 20 + glowPulse * 4;
  const glowA = 0.6 + glowPulse * 0.4;
  const glow = ctx.createRadialGradient(0, -2 - lift, 2, 0, -2 - lift, glowR);
  glow.addColorStop(0, `rgba(255,235,140,${0.85 * glowA})`);
  glow.addColorStop(0.5, `rgba(240,180,40,${0.35 * glowA})`);
  glow.addColorStop(1, "rgba(240,180,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2 - lift, glowR, 0, TAU);
  ctx.fill();

  // The whole chest lifts with the heave.
  ctx.save();
  ctx.translate(0, -lift);

  // Box body
  const wood = ctx.createLinearGradient(0, 2, 0, 20);
  wood.addColorStop(0, "#a8703a");
  wood.addColorStop(0.5, "#7a4a1c");
  wood.addColorStop(1, "#4a2a0c");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.lineTo(18, 2);
  ctx.lineTo(17, 18);
  ctx.lineTo(-17, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1606";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Vertical metal bands on body
  const band = ctx.createLinearGradient(0, 2, 0, 18);
  band.addColorStop(0, "#fff4c0");
  band.addColorStop(0.5, "#e0a020");
  band.addColorStop(1, "#8a5a10");
  ctx.fillStyle = band;
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  [-12, 12].forEach((bx) => {
    ctx.beginPath();
    ctx.rect(bx - 3, 2, 6, 16);
    ctx.fill();
    ctx.stroke();
  });

  // Open lid — rocks on its hinge, lagging the body (follow-through/overlap).
  ctx.save();
  ctx.translate(0, 1);
  ctx.rotate(-0.32 + lidLag * 0.05);
  const lid = ctx.createLinearGradient(0, -16, 0, -2);
  lid.addColorStop(0, "#5a3210");
  lid.addColorStop(1, "#8a5424");
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.moveTo(-18, -3);
  ctx.bezierCurveTo(-19, -16, 19, -16, 18, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1606";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(180,130,70,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.bezierCurveTo(-8, -9, 8, -9, 14, -4);
  ctx.stroke();
  ctx.restore();

  // Overflowing gold coins — each jiggles a touch on its own phase, and its
  // sheen is clipped to ITS OWN circle (no rectangular seams over the pile).
  const coins: Array<[number, number, number]> = [
    [-11, 0, 4], [-3, -2, 4.5], [6, -1, 4], [12, 1, 3.5],
    [-7, 3, 4], [2, 2, 4.5], [10, 4, 4], [-13, 4, 3.5], [0, 5, 4],
  ];
  coins.forEach(([x, y, r], i) => {
    const jx = Math.sin(t * 2.3 + i * 1.7) * 0.5;
    const jy = Math.sin(t * 2.0 + i * 2.3) * 0.4;
    const cx = x + jx;
    const cy = y + jy;
    const cg = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 1, cx, cy, r);
    cg.addColorStop(0, "#fff4c0");
    cg.addColorStop(0.6, "#f0b81c");
    cg.addColorStop(1, "#8a5a0c");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#5e3c06";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(94,60,6,0.6)";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.4, 0, TAU);
    ctx.fill();
    // Per-coin feathered sheen, clipped to the coin disc.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    ctx.translate(cx, cy);
    glint(ctx, loopPhase(t, 2.4, i * 0.11), { span: r, width: 2.4, intensity: 0.3, length: r * 3, warm: true });
    ctx.restore();
  });

  // Front rim of box over coins
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.rect(-18, 6, 36, 2.5);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore(); // end lift

  // Rising sparkles — motes lift out of the chest on staggered beats, fading.
  for (let i = 0; i < 3; i++) {
    const rise = beat(t, 2.0, 0.9, -i / 3);
    if (rise <= 0.01) continue;
    const x = [-5, 9, 0][i] + Math.sin(t * 1.5 + i * 2) * 1.6;
    const y = -2 - lift - rise * 14;
    sparkle(ctx, x, y, 1.4 + rise * 0.8, rise * 0.95, "255,253,224");
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. treasure_coin_stack — recentred up; the column settles with a tiny elastic
// bob (a coin freshly dropped on top) and the lean coin and top coin wobble on
// their own phase. The glint is clipped TIGHTLY to the actual coin column (no
// loose rect that hangs off into empty space).
// ---------------------------------------------------------------------------
function animCoinStack(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-3.2, -6.7); // re-frame: off (3.2, 6.7) → centre the stack

  // Settle beat: every cycle a coin "lands" on top and the stack springs.
  const land = beat(t, 3.4, 0.45);
  const settle = land > 0.01 ? (1 - easeOutElastic(1 - land)) * 1.6 : 0; // px the top dips then springs
  const topWob = Math.sin(t * 1.6) * 0.6; // idle wobble of the lean coin

  groundShadow(ctx, 0, 22, 16, 4, 0, 0.24);

  // Leaning coin (behind, to the right) — gently rocks on its tilt.
  ctx.save();
  ctx.translate(13, 6);
  ctx.rotate(0.5 + topWob * 0.04);
  const leanG = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
  leanG.addColorStop(0, "#fff4c0");
  leanG.addColorStop(0.6, "#f0b81c");
  leanG.addColorStop(1, "#8a5a0c");
  ctx.fillStyle = leanG;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.5, 9, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(94,60,6,0.7)";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const r = i % 2 === 0 ? 4 : 1.8;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Stack of coins (bottom to top). Higher layers carry more of the settle
  // (the top coin springs most), so the column compresses then rebounds.
  const layers: Array<[number, number]> = [[0, 16], [-1, 11], [1, 6], [-1, 1], [0, -4]];
  layers.forEach(([cx0, cy0], i) => {
    const frac = i / (layers.length - 1); // 0 at base, 1 at top
    const cx = cx0;
    const cy = cy0 + settle * frac;
    const g = ctx.createLinearGradient(-12, cy, 12, cy);
    g.addColorStop(0, "#8a5a0c");
    g.addColorStop(0.5, "#f0b81c");
    g.addColorStop(1, "#c8860c");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx - 12, cy - 4);
    ctx.ellipse(cx, cy - 4, 12, 4, 0, Math.PI, 0, true);
    ctx.lineTo(cx + 12, cy);
    ctx.ellipse(cx, cy, 12, 4, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e3c06";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const top = ctx.createRadialGradient(cx - 3, cy - 5, 1, cx, cy - 4, 12);
    top.addColorStop(0, "#fff4c0");
    top.addColorStop(0.6, "#f0c430");
    top.addColorStop(1, "#c8860c");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 12, 4, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (i === layers.length - 1) {
      ctx.fillStyle = "rgba(94,60,6,0.7)";
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 2, 0, TAU);
      ctx.fill();
    }
  });

  // Feathered sheen sweeping the column — clipped TIGHTLY to the stack body
  // (the union of the coin silhouettes), so nothing leaks into empty space.
  ctx.save();
  ctx.beginPath();
  layers.forEach(([cx0, cy0], i) => {
    const cy = cy0 + settle * (i / (layers.length - 1));
    ctx.moveTo(cx0 - 12, cy);
    ctx.lineTo(cx0 - 12, cy - 4);
    ctx.ellipse(cx0, cy - 4, 12, 4, 0, Math.PI, 0, true);
    ctx.lineTo(cx0 + 12, cy);
    ctx.ellipse(cx0, cy, 12, 4, 0, 0, Math.PI);
    ctx.closePath();
  });
  ctx.clip();
  glint(ctx, loopPhase(t, 3.0), { span: 13, width: 5, intensity: 0.3, length: 34, warm: true });
  ctx.restore();

  // Specular streak on top coin (rides the settle).
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-4, -6 + settle, 3, 1.2, -0.3, 0, TAU);
  ctx.fill();

  // A single sparkle pings when a coin lands.
  sparkle(ctx, -2, -8 + settle, 1.4 + land * 1.4, land * 0.85, "255,253,224");
  sparkle(ctx, 6, -1, 1.2, twinkle(t, 2.2, 0.5), "255,253,224");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. treasure_gold_key — recentred; the key DANGLES from its bow, swinging like
// it hangs on a nail (pendulum about the top lobe) with a slow axial turn that
// foreshortens the bow into a torus. The glint is demoted to a low sheen so the
// gold stops washing to chrome.
// ---------------------------------------------------------------------------
function animGoldKey(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0.2, -2.2); // re-frame: off (-0.2, 2.2)

  // Pendulum swing about the hang-point (top lobe at y≈-20), eased ends.
  const swing = (pingPong(t, 3.6) * 2 - 1) * 0.16; // radians
  // Slow axial turn → the bow ring foreshortens (disc → torus → disc).
  const turn = Math.sin(t * 0.7); // -1..1
  const bowSquash = 0.55 + 0.45 * Math.abs(turn); // narrows as it turns edge-on

  groundShadow(ctx, swing * 26, 23, 12, 3.5, 0, 0.22);

  // Hang and swing about the top lobe.
  ctx.save();
  ctx.translate(0, -20);
  ctx.rotate(swing);
  ctx.translate(0, 20);
  ctx.rotate(-0.5); // the key's own sl. tilt (kept from the static art)

  const gold = ctx.createLinearGradient(0, -18, 0, 18);
  gold.addColorStop(0, "#fff4c0");
  gold.addColorStop(0.5, "#e0a020");
  gold.addColorStop(1, "#8a5a10");

  // Bow / handle — modelled as a torus: outer disc minus a foreshortened hole,
  // so as it turns it reads as a ring on edge rather than a flat coin.
  ctx.save();
  ctx.translate(0, -12);
  ctx.scale(bowSquash, 1); // axial turn squashes the ring horizontally
  ctx.fillStyle = gold;
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Inner hole — the "torus" opening (darkened depth + thin gold inner lip).
  ctx.fillStyle = "rgba(58,36,6,0.9)";
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,244,206,0.45)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // Decorative side lobes on the bow (in un-squashed space so they stay round).
  ctx.fillStyle = gold;
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.8;
  ([[-7 * bowSquash, -12], [7 * bowSquash, -12], [0, -20]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, TAU);
    ctx.fill();
    ctx.stroke();
  });

  // The shaft + collar + bit drawn into a path we can reuse as the glint clip.
  const shaftPath = (c: CanvasRenderingContext2D): void => {
    c.moveTo(-1.8, -5);
    c.rect(-1.8, -5, 3.6, 20);
    c.moveTo(2.6, 0);
    c.arc(0, 0, 2.6, 0, TAU);
    c.moveTo(1.8, 9);
    c.lineTo(8, 9);
    c.lineTo(8, 12);
    c.lineTo(5, 12);
    c.lineTo(5, 14.5);
    c.lineTo(8, 14.5);
    c.lineTo(8, 15);
    c.lineTo(1.8, 15);
    c.closePath();
  };

  // Shaft
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.rect(-1.8, -5, 3.6, 20);
  ctx.fill();
  ctx.stroke();
  // Collar ring
  ctx.beginPath();
  ctx.arc(0, 0, 2.6, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Bit / teeth
  ctx.beginPath();
  ctx.moveTo(1.8, 9);
  ctx.lineTo(8, 9);
  ctx.lineTo(8, 12);
  ctx.lineTo(5, 12);
  ctx.lineTo(5, 14.5);
  ctx.lineTo(8, 14.5);
  ctx.lineTo(8, 15);
  ctx.lineTo(1.8, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Static specular streak along shaft.
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-0.6, -4);
  ctx.lineTo(-0.6, 12);
  ctx.stroke();

  // Low-intensity travelling sheen — clipped to the shaft/bit so it reads as a
  // catch of light, not a chrome wash. (Bow handled by its own turn highlight.)
  ctx.save();
  ctx.beginPath();
  shaftPath(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 2.8), { span: 11, width: 3, angle: Math.PI / 2, intensity: 0.26, length: 26, warm: true });
  ctx.restore();

  ctx.restore(); // end swing

  // Sparkle pinging at the bow + a smaller one at the teeth, on beats.
  const bowSwingX = Math.sin(swing) * 8; // bow drifts with the swing
  sparkle(ctx, -8 + bowSwingX, -14, 1.6 + twinkle(t, 2.4, 0) * 0.8, 0.4 + twinkle(t, 2.4, 0) * 0.5, "255,253,224");
  sparkle(ctx, 7, 10, 1.2, twinkle(t, 2.4, 0.55), "255,253,224");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. treasure_crown — recentred up; a slow, majestic bob + side-to-side tilt
// (it sits enthroned and breathes), the centre ruby flares at the top of the
// bob, and the gold catches a soft sheen. Gems twinkle at staggered phases.
// ---------------------------------------------------------------------------
function animCrown(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -4.3); // re-frame: off_y +4.3

  // Majestic bob + slow regal tilt (eased, not a bare sine block).
  const bobP = loopPhase(t, 3.2);
  const bob = Math.sin(bobP * TAU) * 1.4 * easeInOutSine(Math.abs(Math.sin(bobP * Math.PI)));
  const tilt = Math.sin(t * 0.6) * 0.04; // gentle left-right sway
  const rise = -bob; // positive when lifted

  groundShadow(ctx, 0, 24, 17, 4, rise, 0.24);

  ctx.save();
  ctx.translate(0, bob);
  ctx.translate(0, 8); // pivot near the band base
  ctx.rotate(tilt);
  ctx.translate(0, -8);

  const gold = ctx.createLinearGradient(0, -14, 0, 12);
  gold.addColorStop(0, "#fff4c0");
  gold.addColorStop(0.5, "#e0a020");
  gold.addColorStop(1, "#8a5a10");
  ctx.fillStyle = gold;

  const crownPath = (c: CanvasRenderingContext2D): void => {
    c.moveTo(-16, 8);
    c.lineTo(-16, -2);
    c.lineTo(-9, 2);
    c.lineTo(-8, -12);
    c.lineTo(-3, 1);
    c.lineTo(0, -14);
    c.lineTo(3, 1);
    c.lineTo(8, -12);
    c.lineTo(9, 2);
    c.lineTo(16, -2);
    c.lineTo(16, 8);
    c.closePath();
  };

  // Crown band + points
  ctx.beginPath();
  crownPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Base band
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.rect(-16, 4, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, 5.5);
  ctx.lineTo(14, 5.5);
  ctx.stroke();

  // Soft sheen across the gold — clipped to crown + band.
  ctx.save();
  ctx.beginPath();
  crownPath(ctx);
  ctx.rect(-16, 4, 32, 6);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.6), { span: 18, width: 6, intensity: 0.28, length: 34, warm: true });
  ctx.restore();

  // Pearls atop each point
  ([[-8, -13], [0, -15], [8, -13]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.fillStyle = "#fff8ec";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#bca878";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(x - 0.6, y - 0.6, 0.7, 0, TAU);
    ctx.fill();
  });

  // Gems in the band — centre ruby flares with the bob; sapphires twinkle.
  const gem = (x: number, y: number, c0: string, c1: string, c2: string, r: number, tw: number): void => {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
    g.addColorStop(0, c0);
    g.addColorStop(0.6, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(40,10,20,0.7)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (tw > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${tw * 0.85})`;
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.32, 0, TAU);
      ctx.fill();
      sparkle(ctx, x, y, r * (0.7 + tw * 0.6), tw * 0.7, "255,253,224");
    }
  };
  // Ruby flare peaks at the top of the bob (when `rise` is largest).
  const rubyFlare = clamp01(rise / 1.4) * 0.9;
  gem(0, 7, "#ff8a8a", "#c8181a", "#5a0408", 3.2, Math.max(twinkle(t, 2.4, 0), rubyFlare));
  gem(-9, 7, "#9cd0f8", "#2a6ac8", "#0a2a68", 2.4, twinkle(t, 2.4, 0.33));
  gem(9, 7, "#9cd0f8", "#2a6ac8", "#0a2a68", 2.4, twinkle(t, 2.4, 0.66));

  ctx.restore(); // end bob/tilt

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. treasure_ring — recentred up; the ring ROCKS forward/back so the gem
// catches the eye (a slow tip about the band centre), the band sheen runs round
// the torus, and the red gem's bloom is SYNCED to that band-glint pass.
// ---------------------------------------------------------------------------
function animRing(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -5.4); // re-frame: off_y +5.4

  // Rock the ring: a slow eased tip that presents the stone, then back.
  const rock = (pingPong(t, 3.4) * 2 - 1) * 0.14; // radians about the band centre
  // Band-glint travels round the torus on a loop; the gem bloom follows it.
  const bandPhase = loopPhase(t, 2.4);
  const bloom = Math.pow(Math.sin(bandPhase * Math.PI), 2); // 0..1, peaks mid-sweep

  groundShadow(ctx, rock * 10, 23, 13, 3.5, 0, 0.22);

  ctx.save();
  ctx.translate(0, 8); // pivot at the band centre
  ctx.rotate(rock);
  ctx.translate(0, -8);

  const gold = ctx.createLinearGradient(0, -4, 0, 18);
  gold.addColorStop(0, "#fff4c0");
  gold.addColorStop(0.5, "#e0a020");
  gold.addColorStop(1, "#8a5a10");

  // Band — filled torus
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(0, 8, 11.2, 0, TAU);
  ctx.arc(0, 8, 6.6, 0, TAU, true);
  ctx.fill("evenodd");
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 8, 11.2, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 8, 6.6, 0, TAU);
  ctx.stroke();
  // Static band sheen
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 8, 9.6, Math.PI * 0.7, Math.PI * 1.05);
  ctx.stroke();

  // Travelling highlight running around the band — clipped to the torus, its
  // angle driven by the same phase that blooms the gem.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 8, 11.2, 0, TAU);
  ctx.arc(0, 8, 6.6, 0, TAU, true);
  ctx.clip("evenodd");
  const a = bandPhase * TAU - Math.PI / 2;
  ctx.strokeStyle = "rgba(255,250,225,0.8)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 8, 9, a, a + Math.PI * 0.4);
  ctx.stroke();
  ctx.restore();

  // Setting (prongs)
  ctx.fillStyle = "#8a5a10";
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(6, -2);
  ctx.lineTo(4, -8);
  ctx.lineTo(-4, -8);
  ctx.closePath();
  ctx.fill();

  // Large red gem on top, bloom synced to the band-glint pass.
  const gemPath = (c: CanvasRenderingContext2D): void => {
    c.moveTo(0, -14);
    c.lineTo(5.5, -9);
    c.lineTo(3, -2);
    c.lineTo(-3, -2);
    c.lineTo(-5.5, -9);
    c.closePath();
  };
  const gemGrad = ctx.createRadialGradient(-1.5, -10, 0.5, 0, -8, 7);
  gemGrad.addColorStop(0, "#ffb0b0");
  gemGrad.addColorStop(0.5, "#d8201c");
  gemGrad.addColorStop(1, "#6a0408");
  ctx.fillStyle = gemGrad;
  ctx.beginPath();
  gemPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Gem facets
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5.5, -9);
  ctx.lineTo(5.5, -9);
  ctx.moveTo(0, -14);
  ctx.lineTo(0, -2);
  ctx.stroke();
  // Pulsing inner flare clipped to the gem.
  ctx.save();
  ctx.beginPath();
  gemPath(ctx);
  ctx.clip();
  ctx.fillStyle = `rgba(255,210,210,${0.22 + bloom * 0.5})`;
  ctx.beginPath();
  ctx.arc(-1, -9, 2.2 + bloom * 1.6, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Gem glint dot
  ctx.fillStyle = `rgba(255,255,255,${0.6 + bloom * 0.4})`;
  ctx.beginPath();
  ctx.arc(-2, -10, 1, 0, TAU);
  ctx.fill();

  // Sparkle ping off the gem at the bloom peak.
  sparkle(ctx, 0, -9, 2 + bloom * 2.2, bloom * bloom * 0.9, "255,210,210");

  ctx.restore(); // end rock

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. treasure_goblet — recentred up + scaled up a touch; the cup gently SWAYS
// and the wine surface SLOSHES (the rim ellipse tilts and rides up one side as
// the goblet rocks), with a sheen drifting over the gold. Gems twinkle.
// ---------------------------------------------------------------------------
function animGoblet(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -7.4); // re-frame: off_y +7.4
  ctx.scale(1.12, 1.12); // it read undersized

  // Slow sway about the foot; the liquid lags the cup (sloshes the other way).
  const sway = Math.sin(t * 1.1) * 0.05; // radians
  const slosh = Math.sin(t * 1.1 - 0.7); // -1..1, lags the sway
  const surfTilt = slosh * 0.14; // wine surface tips
  const surfLift = -slosh * 0.7; // and rides up one side

  groundShadow(ctx, sway * 14, 21, 13, 4, 0, 0.24);

  ctx.save();
  ctx.translate(0, 19); // pivot at the foot
  ctx.rotate(sway);
  ctx.translate(0, -19);

  const gold = ctx.createLinearGradient(-10, 0, 10, 0);
  gold.addColorStop(0, "#8a5a10");
  gold.addColorStop(0.4, "#fff4c0");
  gold.addColorStop(0.6, "#e0a020");
  gold.addColorStop(1, "#8a5a10");

  // Base
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.ellipse(0, 19, 9, 3, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Stem
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(-2.5, 6);
  ctx.lineTo(2.5, 6);
  ctx.lineTo(3, 16);
  ctx.lineTo(-3, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Stem knob
  ctx.beginPath();
  ctx.arc(0, 11, 2.8, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Cup bowl
  const bowlPath = (c: CanvasRenderingContext2D): void => {
    c.moveTo(-11, -8);
    c.bezierCurveTo(-11, 4, -6, 8, 0, 8);
    c.bezierCurveTo(6, 8, 11, 4, 11, -8);
    c.closePath();
  };
  ctx.fillStyle = gold;
  ctx.beginPath();
  bowlPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Feathered sheen over the bowl gold — clipped to the bowl.
  ctx.save();
  ctx.beginPath();
  bowlPath(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.0), { span: 11, width: 5, intensity: 0.28, length: 30, warm: true });
  ctx.restore();

  // Red wine at the rim — the surface tilts and rides up one side as it sloshes.
  ctx.save();
  ctx.translate(0, -8);
  ctx.rotate(surfTilt);
  const drink = ctx.createLinearGradient(0, -2 + surfLift, 0, 2 + surfLift);
  drink.addColorStop(0, "#ff5a4a");
  drink.addColorStop(1, "#8a0c0c");
  ctx.fillStyle = drink;
  ctx.beginPath();
  ctx.ellipse(0, surfLift, 10.5, 2.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a0408";
  ctx.lineWidth = 1;
  ctx.stroke();
  // A catch-light drifting across the sloshing surface.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, surfLift, 10.5, 2.6, 0, 0, TAU);
  ctx.clip();
  const gx = lerp(-8, 8, pingPong(t, 2.6));
  ctx.fillStyle = "rgba(255,200,180,0.55)";
  ctx.beginPath();
  ctx.ellipse(gx, surfLift - 0.5, 3, 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Gems on the bowl — twinkle overlays.
  const gem = (x: number, y: number, tw: number): void => {
    const g = ctx.createRadialGradient(x - 0.6, y - 0.6, 0.3, x, y, 2.4);
    g.addColorStop(0, "#9cd0f8");
    g.addColorStop(0.6, "#2a6ac8");
    g.addColorStop(1, "#0a2a68");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - 2.4);
    ctx.lineTo(x + 2.4, y);
    ctx.lineTo(x, y + 2.4);
    ctx.lineTo(x - 2.4, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(10,20,50,0.7)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    if (tw > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${tw * 0.8})`;
      ctx.beginPath();
      ctx.arc(x - 0.5, y - 0.5, 0.9, 0, TAU);
      ctx.fill();
    }
  };
  gem(0, -1, twinkle(t, 2.2, 0));
  gem(-6, -3, twinkle(t, 2.2, 0.33));
  gem(6, -3, twinkle(t, 2.2, 0.66));

  // Bowl specular streak
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, -3, 1.6, 5, -0.2, 0, TAU);
  ctx.fill();

  ctx.restore(); // end sway

  sparkle(ctx, 8, -7, 1.4, twinkle(t, 2.0, 0.15), "255,253,224");
  sparkle(ctx, -9, 0, 1.1, twinkle(t, 2.0, 0.6), "255,253,224");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. treasure_gold_bars — recentred (was 31u of dead air on top); the top bar
// does a DROP-AND-SETTLE onto the pair, whose impact nudges the two base bars
// apart and back (overshoot + follow-through). A soft sheen cascades across the
// fronts.
// ---------------------------------------------------------------------------
function animGoldBars(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-1.0, -12.6); // re-frame: off (1.0, 12.6) — kill the dead air

  // Drop beat: the top bar lifts off, then drops and settles with overshoot.
  const dropP = loopPhase(t, 3.6);
  // For most of the cycle the top bar rests; in the first slice it hops up and
  // slams back with an elastic settle.
  let topRise = 0;
  let impact = 0;
  if (dropP < 0.28) {
    const u = dropP / 0.28;
    // Lift off on the first half, then drop and settle past the rest with an
    // overshoot on the second half.
    topRise = u < 0.5
      ? -easeInOutSine(u * 2) * 7
      : -7 * (1 - easeOutBack(Math.min(1, (u - 0.5) * 2.2), 2.4));
    impact = u >= 0.5 ? Math.max(0, 1 - (u - 0.5) / 0.18) : 0; // brief flash at landing
  }
  const spread = impact * 1.6; // base bars shove apart on impact, then settle

  groundShadow(ctx, 0, 23, 18, 4, Math.max(0, -topRise) * 0.4, 0.24);

  // Draw one bar; `nudgeX`/`riseY` deform position for the settle.
  const bar = (ox: number, oy: number, glintPhase: number): void => {
    // Top face
    const top = ctx.createLinearGradient(0, oy - 6, 0, oy - 1);
    top.addColorStop(0, "#fff4c0");
    top.addColorStop(1, "#e0a020");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(ox - 11, oy - 1);
    ctx.lineTo(ox - 8, oy - 6);
    ctx.lineTo(ox + 12, oy - 6);
    ctx.lineTo(ox + 9, oy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e3c06";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // Front face
    const front = ctx.createLinearGradient(0, oy - 1, 0, oy + 8);
    front.addColorStop(0, "#f4c430");
    front.addColorStop(0.5, "#d09014");
    front.addColorStop(1, "#8a5a0c");
    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(ox - 11, oy - 1);
    ctx.lineTo(ox + 9, oy - 1);
    ctx.lineTo(ox + 8, oy + 7);
    ctx.lineTo(ox - 10, oy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right face
    const side = ctx.createLinearGradient(ox + 8, 0, ox + 13, 0);
    side.addColorStop(0, "#c8860c");
    side.addColorStop(1, "#8a5a0c");
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(ox + 9, oy - 1);
    ctx.lineTo(ox + 12, oy - 6);
    ctx.lineTo(ox + 11, oy + 2);
    ctx.lineTo(ox + 8, oy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Stamp mark
    ctx.strokeStyle = "rgba(94,60,6,0.7)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.rect(ox - 5, oy + 1, 9, 4);
    ctx.stroke();
    // Top sheen
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(ox - 2, oy - 3.5, 4, 0.8, 0, 0, TAU);
    ctx.fill();

    // Feathered sheen across this bar's front face — clipped to the face.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ox - 11, oy - 1);
    ctx.lineTo(ox + 9, oy - 1);
    ctx.lineTo(ox + 8, oy + 7);
    ctx.lineTo(ox - 10, oy + 7);
    ctx.closePath();
    ctx.clip();
    ctx.translate(ox, oy + 3);
    glint(ctx, glintPhase, { span: 12, width: 4, angle: Math.PI / 2, intensity: 0.28, length: 16, warm: true });
    ctx.restore();
  };

  // Base bars — shoved apart by the impact, then settle back.
  bar(-7 - spread, 16, loopPhase(t, 2.4));
  bar(8 + spread, 16, loopPhase(t, 2.4, 0.33));
  // Top bar — drops onto the pair.
  bar(0, 6 + topRise, loopPhase(t, 2.4, 0.66));

  // A sparkle pings on impact.
  sparkle(ctx, 0, 2, 1.4 + impact * 1.6, impact * 0.85, "255,253,224");
  sparkle(ctx, -6, 1, 1.2, twinkle(t, 2.2, 0), "255,253,224");
  sparkle(ctx, 9, 3, 1.0, twinkle(t, 2.2, 0.5), "255,253,224");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 8. treasure_gem_pile — recentred + re-clustered into a tighter HEAP (was an
// inverted fan); the whole pile settles with a tiny jitter and ONE shared light
// sweeps across, firing each gem in turn as the sweep reaches it.
// ---------------------------------------------------------------------------
function animGemPile(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -10.6); // re-frame: off_y +10.6

  // Settle jitter: the heap "breathes"/shivers a hair so it isn't dead.
  const jitter = Math.sin(t * 1.8) * 0.4;
  // One shared light sweeps left→right across the heap; a gem fires when the
  // sweep x passes its centre.
  const sweepX = lerp(-13, 13, pingPong(t, 2.8));

  groundShadow(ctx, 0, 22, 17, 4, 0, 0.24);

  // Soft glow breathing over the pile.
  const gp = breathe(t, 2.4, 0.5, 0.5, 0); // 0..1
  const glow = ctx.createRadialGradient(0, 8, 2, 0, 8, 18);
  glow.addColorStop(0, `rgba(255,255,255,${0.12 + gp * 0.16})`);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 8, 18, 0, TAU);
  ctx.fill();

  // A gem: `fire` (0..1) is how strongly the shared sweep lights it right now.
  const gem = (
    x: number, y: number, r: number, rot: number,
    c0: string, c1: string, c2: string, outline: string, fire: number, phase: number,
  ): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot + Math.sin(t * 2.2 + phase) * 0.02); // tiny per-gem shiver
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, c0);
    g.addColorStop(0.5, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    const shape = (c: CanvasRenderingContext2D): void => {
      c.moveTo(-r * 0.5, -r);
      c.lineTo(r * 0.5, -r);
      c.lineTo(r, -r * 0.2);
      c.lineTo(0, r);
      c.lineTo(-r, -r * 0.2);
      c.closePath();
    };
    ctx.beginPath();
    shape(ctx);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    // facet lines
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.2);
    ctx.lineTo(r, -r * 0.2);
    ctx.moveTo(-r * 0.5, -r);
    ctx.lineTo(0, r);
    ctx.moveTo(r * 0.5, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    // base glint
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.4, 0.8, 0, TAU);
    ctx.fill();
    // shared-light fire flare, clipped to the gem.
    if (fire > 0.02) {
      ctx.save();
      ctx.beginPath();
      shape(ctx);
      ctx.clip();
      ctx.fillStyle = `rgba(255,255,255,${fire * 0.6})`;
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.4, r * 0.5 * (0.6 + fire), 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // sparkle pops above the gem when the sweep fires it.
    if (fire > 0.35) sparkle(ctx, x, y - r * 0.5, 1.3 + fire, fire * 0.8, "255,253,224");
  };

  // Re-clustered heap: tighter, overlapping, peaked — reads as a pile not a fan.
  type GemDef = [number, number, number, number, string, string, string, string, number];
  const gems: GemDef[] = [
    // Back / bedded
    [-7, 8 + jitter, 6, -0.18, "#b0f0c0", "#28b050", "#0a4a20", "#063015", 0.0],
    [7, 9 + jitter, 6, 0.22, "#c8b0f8", "#7a3ad0", "#3a0c78", "#26064a", 0.2],
    // Mid front, overlapping inward
    [-3, 11 + jitter * 0.7, 6.5, 0.08, "#ffb0b0", "#d8201c", "#6a0408", "#3a0408", 0.4],
    [4, 12 + jitter * 0.7, 6, -0.14, "#9cd0f8", "#2a6ac8", "#0a2a68", "#06183f", 0.6],
    // Crowning the heap
    [0, 4 + jitter * 0.5, 5, 0.04, "#fff0a0", "#f0b81c", "#8a5a0c", "#5e3c06", 0.8],
  ];
  gems.forEach((gdef) => {
    const [x, y, r, rot, c0, c1, c2, outline, phase] = gdef;
    // Fire when the shared sweep x is near this gem's x.
    const d = Math.abs(sweepX - x);
    const fire = Math.max(0, 1 - d / 5);
    gem(x, y, r, rot, c0, c1, c2, outline, fire, phase);
  });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 9. treasure_map — REDESIGNED (verdict: Replace). The old draw read as a lumpy
// sack and the flutter puffed it like a balloon. This is a FLAT unfurled
// parchment sheet held open by curl rolls at the sides; it ripples like paper
// via a horizontal travelling wave applied as vertical shear (the sheet's
// scanlines lift/drop in sequence), and the red X is pinged on a beat.
// ---------------------------------------------------------------------------
function animMap(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0.4, -5.3); // re-frame: off (-0.4, 5.3)

  // Paper ripple: a travelling wave along x. For a given x, the sheet's local
  // vertical offset is a sine of (x - wave). This shears the whole sheet so it
  // undulates like a flag of paper rather than ballooning.
  const wave = t * 2.2; // wave travels right
  const ripple = (x: number): number => Math.sin(x * 0.32 - wave) * 1.1;
  const rippleSlope = (x: number): number => Math.cos(x * 0.32 - wave) * 0.32 * 1.1; // d/dx for shading

  const halfW = 15;
  const topY = -11;
  const botY = 11;

  groundShadow(ctx, 0, 21, 17, 3.5, 0, 0.22);

  // Build the rippling sheet as a closed path: top edge L→R rippling, down the
  // right curl, bottom edge R→L rippling, up the left curl.
  const sheetPath = (c: CanvasRenderingContext2D): void => {
    c.moveTo(-halfW, topY + ripple(-halfW));
    for (let x = -halfW; x <= halfW; x += 2) {
      c.lineTo(x, topY + ripple(x));
    }
    c.lineTo(halfW, topY + ripple(halfW));
    c.lineTo(halfW, botY + ripple(halfW));
    for (let x = halfW; x >= -halfW; x -= 2) {
      c.lineTo(x, botY + ripple(x));
    }
    c.closePath();
  };

  // Parchment fill — a vertical gradient gives the sheet body; we add per-column
  // shading from the ripple slope so crests catch light and troughs darken.
  const paper = ctx.createLinearGradient(0, topY - 2, 0, botY + 2);
  paper.addColorStop(0, "#f6e2b0");
  paper.addColorStop(0.5, "#e8c982");
  paper.addColorStop(1, "#cba85e");
  ctx.fillStyle = paper;
  ctx.beginPath();
  sheetPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#8a6a32";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Ripple shading — soft light/dark bands following the wave (clipped to sheet).
  ctx.save();
  ctx.beginPath();
  sheetPath(ctx);
  ctx.clip();
  for (let x = -halfW; x <= halfW; x += 1.5) {
    const s = rippleSlope(x); // + on the rising face, - on the falling face
    const a = clamp01(Math.abs(s) * 1.4);
    if (a < 0.02) continue;
    ctx.fillStyle = s > 0
      ? `rgba(255,245,210,${a * 0.5})` // crest catches light
      : `rgba(120,90,40,${a * 0.4})`; // trough in shade
    ctx.fillRect(x - 0.9, topY - 2, 1.8, (botY - topY) + 4);
  }

  // --- Map markings drawn into the clipped, rippling sheet so they ride it. ---
  const ry = (x: number): number => ripple(x); // local y-offset of a marking at column x

  // Aged edge stains
  ctx.fillStyle = "rgba(150,110,50,0.3)";
  ctx.beginPath();
  ctx.ellipse(-11, -5 + ry(-11), 3, 4.5, 0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(11, 7 + ry(11), 3.2, 3.6, -0.2, 0, TAU);
  ctx.fill();

  // Coastline doodle (rides the ripple)
  ctx.strokeStyle = "rgba(120,90,40,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, 6 + ry(-9));
  ctx.bezierCurveTo(-6, 2 + ry(-6), -3, 7 + ry(-3), 1, 3 + ry(1));
  ctx.bezierCurveTo(4, 0 + ry(4), 8, 4 + ry(8), 10, 0 + ry(10));
  ctx.stroke();

  // Dotted path leading to the X — each dot shimmers as the wave passes it.
  const path: Array<[number, number]> = [[-9, -6], [-6, -3], [-2, -4], [1, -1], [4, -3], [6, 0]];
  path.forEach(([x, y]) => {
    const yy = y + ry(x);
    ctx.fillStyle = "#7a3a14";
    ctx.beginPath();
    ctx.arc(x, yy, 1.1, 0, TAU);
    ctx.fill();
    // shimmer when a crest is over this dot
    const sh = clamp01(rippleSlope(x) + 0.2);
    if (sh > 0.1) {
      ctx.fillStyle = `rgba(255,240,180,${sh * 0.7})`;
      ctx.beginPath();
      ctx.arc(x, yy, 1.4, 0, TAU);
      ctx.fill();
    }
  });

  // Compass rose top-left (rides the ripple)
  const compY = ry(-8);
  ctx.strokeStyle = "rgba(120,90,40,0.6)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(-8, -6 + compY, 3, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "rgba(120,90,40,0.7)";
  ctx.beginPath();
  ctx.moveTo(-8, -10 + compY);
  ctx.lineTo(-7, -6 + compY);
  ctx.lineTo(-8, -2 + compY);
  ctx.lineTo(-9, -6 + compY);
  ctx.closePath();
  ctx.fill();

  // Red X marks the spot — pings on a beat (anticipation-free quick flash+grow).
  const xBeat = beat(t, 2.0, 0.4);
  const xPos: [number, number] = [7.5, -1.5 + ry(7.5)];
  ctx.save();
  ctx.translate(xPos[0], xPos[1]);
  const xs = 1 + xBeat * 0.18;
  ctx.scale(xs, xs);
  ctx.strokeStyle = `rgb(${200 + Math.round(xBeat * 45)},${24 + Math.round(xBeat * 36)},${20 + Math.round(xBeat * 22)})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-2.5, -2.5);
  ctx.lineTo(2.5, 2.5);
  ctx.moveTo(2.5, -2.5);
  ctx.lineTo(-2.5, 2.5);
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // end sheet clip

  // Curl rolls left & right hold the sheet open — they breathe a touch as the
  // ripple reaches the edges (drawn OVER the sheet, outside its clip).
  const roll = ctx.createLinearGradient(0, 0, 6, 0);
  roll.addColorStop(0, "#d8bd78");
  roll.addColorStop(0.5, "#cba85e");
  roll.addColorStop(1, "#9a7a42");
  ([-halfW, halfW] as number[]).forEach((rx) => {
    const rw = 3 + Math.abs(rippleSlope(rx)) * 1.2; // curl fattens on the crest
    ctx.fillStyle = roll;
    ctx.beginPath();
    ctx.ellipse(rx, ripple(rx) * 0.5, rw, 13.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#8a6a32";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // inner curl shadow line
    ctx.strokeStyle = "rgba(120,90,40,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(rx + (rx < 0 ? 1 : -1), ripple(rx) * 0.5, rw * 0.45, 12, 0, 0, TAU);
    ctx.stroke();
  });

  // Ping sparkle at the X on the beat.
  sparkle(ctx, xPos[0], xPos[1], 1.4 + xBeat * 1.6, xBeat * xBeat * 0.85, "255,160,140");

  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  treasure_chest_open: animChestOpen,
  treasure_coin_stack: animCoinStack,
  treasure_gold_key: animGoldKey,
  treasure_crown: animCrown,
  treasure_ring: animRing,
  treasure_goblet: animGoblet,
  treasure_gold_bars: animGoldBars,
  treasure_gem_pile: animGemPile,
  treasure_map: animMap,
};
