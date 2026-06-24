// Animated farm crops & produce — same look as src/textures/categories/crops.ts, but alive.
// Each fn redraws the WHOLE icon at time `t` (seconds). Loops are seamless via
// `loopPhase`/`pingPong`/`breathe` (drive position off `t`, never a sawtooth) and
// shadows couple to vertical motion via `groundShadow`. The static geometry is the
// strong part and is kept; the motion is rebuilt to lead with real deformation
// (squash/stretch, eased nods, hinge opens) with glints demoted to a secondary
// accent. This module is the reference for the per-icon idle rebuild.

import {
  TAU,
  loopPhase,
  twinkle,
  easeInOutSine,
  easeOutBack,
  easeOutElastic,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// crop_sunflower — the whole plant sways from ONE pivot at the stem base (head
// stays welded to the stem); the head adds a small follow-through nod + slow
// heliotropic turn, the petals fan in a traveling wave, and a clean sparkle
// drifts past like a bee.
function animSunflower(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(t * 0.9) * 0.07; // primary breeze, one pivot
  const nod = Math.sin(t * 0.9 - 0.6) * 0.03; // head follow-through (lags the stem)
  const turn = Math.sin(t * 0.35) * 0.05; // slow heliotropic turn

  groundShadow(ctx, sway * 10, 23, 12, 3.5, sway * 6, 0.2);

  // Whole plant sways about the base.
  ctx.save();
  ctx.translate(0, 24);
  ctx.rotate(sway);
  ctx.translate(0, -24);

  // Stem
  const stem = ctx.createLinearGradient(-3, 0, 3, 0);
  stem.addColorStop(0, "#7cb840");
  stem.addColorStop(1, "#3a6014");
  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.moveTo(-2.5, -4);
  ctx.lineTo(-1.5, 24);
  ctx.lineTo(1.5, 24);
  ctx.lineTo(2.5, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Leaves — flutter with their own phase (secondary motion).
  ([[-1, 10], [1, 16]] as Array<[number, number]>).forEach(([side, sy], li) => {
    const flutter = 1 + Math.sin(t * 2.2 + li * 1.6) * 0.07;
    const grad = ctx.createLinearGradient(0, sy, side * 12, sy + 2);
    grad.addColorStop(0, "#9ccc54");
    grad.addColorStop(1, "#3a6014");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.bezierCurveTo(side * 6, sy - 5 * flutter, side * 13 * flutter, sy - 3, side * 13 * flutter, sy + 2);
    ctx.bezierCurveTo(side * 8, sy + 6 * flutter, side * 3, sy + 4, 0, sy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e4810";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Head — nods about the neck (welded to the stem top) then turns about its own
  // centre. Two nested pivots that BOTH sit on the stem, so the head never shears.
  ctx.translate(0, 2); // neck, in plant-local space
  ctx.rotate(nod);
  ctx.translate(0, -10); // up to the head centre (cy ≈ -8)
  ctx.rotate(turn);

  const petalCount = 14;
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * TAU;
    const ir = 9;
    // Petal-fan: a traveling wave lengthens petals as it sweeps the ring.
    const fan = Math.sin(t * 1.6 - a * 2);
    const or = 17 + fan * 1.3;
    const ix = Math.cos(a) * ir;
    const iy = Math.sin(a) * ir;
    const ox = Math.cos(a) * or;
    const oy = Math.sin(a) * or;
    const px = Math.cos(a + Math.PI / 2) * 3;
    const py = Math.sin(a + Math.PI / 2) * 3;
    const shimmer = 0.5 + 0.5 * fan;
    const grad = ctx.createLinearGradient(ix, iy, ox, oy);
    grad.addColorStop(0, `rgb(255,${Math.round(210 + shimmer * 18)},${Math.round(74 + shimmer * 24)})`);
    grad.addColorStop(1, "#e89010");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ix - px, iy - py);
    ctx.quadraticCurveTo(ox, oy - 2, ox, oy);
    ctx.quadraticCurveTo(ox, oy + 2, ix + px, iy + py);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(168,96,8,0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  // Seeded centre
  const center = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11);
  center.addColorStop(0, "#7a5418");
  center.addColorStop(0.6, "#4a3008");
  center.addColorStop(1, "#231804");
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a1002";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "rgba(40,26,6,0.85)";
  for (let i = 0; i < 36; i++) {
    const a = i * 2.399;
    const r = Math.sqrt(i / 36) * 8.5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.9, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(180,140,60,0.5)";
  ctx.beginPath();
  ctx.arc(-3, -3, 2, 0, TAU);
  ctx.fill();
  ctx.restore();

  // A bee-like sparkle drifts past on a slow loop (clean 4-point star, not a cross).
  const bp = loopPhase(t, 5.6);
  const bx = -22 + bp * 44;
  const by = -22 + Math.sin(bp * Math.PI * 3) * 5;
  const ba = Math.sin(bp * Math.PI);
  sparkle(ctx, bx, by, 1.6 + ba * 0.6, 0.7 * ba, "255,250,210");
}

// ---------------------------------------------------------------------------
// crop_wheat — re-centred up; each stalk bends on its own phase (a traveling
// wave through the clump), the awns curve instead of starbursting.
function animWheat(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -4); // re-frame: was sitting ~4u low (off_y +4.2)

  groundShadow(ctx, 0, 26, 14, 4, 0, 0.2);

  const stalks: Array<[number, number]> = [[-0.5, -0.32], [0, 0], [0.5, 0.32]];
  stalks.forEach(([, lean], si) => {
    // Per-stalk traveling wave: phase offset by stalk index so the clump ripples
    // rather than swinging as one rigid block.
    const bend = Math.sin(t * 1.2 - si * 0.9) * (3.2 + si * 0.4);
    const tipX = lean * 16 + bend;
    const tipY = -10 - Math.abs(bend) * 0.12;
    const baseX = lean * 8 + bend * 0.3;
    const baseY = 0;

    ctx.strokeStyle = "#c89838";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lean * 2, 18);
    ctx.quadraticCurveTo(baseX, baseY, tipX, tipY);
    ctx.stroke();

    for (let g = 0; g <= 1; g += 0.16) {
      const gx = baseX + (tipX - baseX) * g;
      const gy = baseY + (tipY - baseY) * g;
      const perpX = 3.4 * (1 - g * 0.3);
      ([-1, 1] as number[]).forEach((sideDir) => {
        const ex = gx + sideDir * perpX + lean * 1.5;
        const ey = gy - 1.5;
        const grad = ctx.createLinearGradient(gx, gy, ex, ey);
        grad.addColorStop(0, "#e8c24a");
        grad.addColorStop(1, "#a8780c");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 2.6, 1.7, -0.5 * sideDir + lean * 0.3, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(110,74,8,0.6)";
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });
    }
    // Awns — curved whiskers (quadratic) that bend with the tip, not a starburst.
    ctx.strokeStyle = "rgba(232,200,90,0.8)";
    ctx.lineWidth = 0.8;
    [-2.2, 0, 2.2].forEach((dx) => {
      const cx = tipX + dx * 0.6 + bend * 0.3;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(cx, tipY - 5, tipX + dx + bend * 0.5, tipY - 9);
      ctx.stroke();
    });
  });

  // Binding twine (fixed)
  ctx.strokeStyle = "#8a5a1e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.quadraticCurveTo(0, 9, 5, 12);
  ctx.stroke();
  ctx.strokeStyle = "#5a3a10";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.quadraticCurveTo(0, 9, 5, 12);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// crop_corn — an eased nod (not a constant rigid lean) plus a fake axial roll:
// the kernel grid + highlight scroll sideways as if the cob rotates. The hard
// glint rectangle is replaced by the feathered shared glint.
function animCorn(ctx: CanvasRenderingContext2D, t: number): void {
  // Eased nod: dwell, then a soft tip to one side and back.
  const nodPhase = loopPhase(t, 3.2);
  const nod = Math.sin(nodPhase * TAU) * 0.06 * easeInOutSine(Math.abs(Math.sin(nodPhase * Math.PI)));
  const roll = Math.sin(t * 0.8); // -1..1 fake axial roll

  groundShadow(ctx, nod * 12, 22, 14, 4, 0, 0.22);

  const huskLeaves: Array<[number, number]> = [[-1, -0.55], [1, 0.55], [0, 0]];
  huskLeaves.forEach(([side, lean], hi) => {
    const flutter = 1 + Math.sin(t * 2.4 + hi * 1.9) * 0.08;
    const grad = ctx.createLinearGradient(0, 4, side * 16, 22);
    grad.addColorStop(0, "#9ccc54");
    grad.addColorStop(1, "#3a6014");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.bezierCurveTo(side * 8, 8, (side * 14 + lean * 4) * flutter, 18, side * 9 * flutter, 24);
    ctx.bezierCurveTo(side * 4, 20, side * 2, 12, 0, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e4810";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = "rgba(46,72,16,0.6)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(side * 8 * flutter, 20);
    ctx.stroke();
  });

  ctx.save();
  ctx.translate(0, 18);
  ctx.rotate(nod);
  ctx.translate(0, -18);

  const cobPath = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(0, -22);
    c.bezierCurveTo(-9, -20, -10, -4, -8, 8);
    c.bezierCurveTo(-6, 16, -3, 18, 0, 18);
    c.bezierCurveTo(3, 18, 6, 16, 8, 8);
    c.bezierCurveTo(10, -4, 9, -20, 0, -22);
    c.closePath();
  };

  const body = ctx.createLinearGradient(-9, 0, 9, 0);
  body.addColorStop(0, "#fff0a0");
  body.addColorStop(0.5, "#f4c428");
  body.addColorStop(1, "#a87808");
  ctx.fillStyle = body;
  cobPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#6e4a08";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  cobPath(ctx);
  ctx.clip();
  // Kernels scroll sideways with the roll → reads as the cob turning on its axis.
  const scroll = roll * 1.6;
  for (let row = 0; row < 11; row++) {
    const ry = -20 + row * 3.6;
    const offset = row % 2 === 0 ? 0 : 1.6;
    for (let col = -4; col <= 4; col++) {
      const kx = col * 3.2 + offset + scroll;
      const kr = 1.7;
      // Foreshorten the highlight toward the lit side as it rolls.
      const grad = ctx.createRadialGradient(kx - 0.6 - roll, ry - 0.6, 0.3, kx, ry, kr + 0.6);
      grad.addColorStop(0, "#fff4b8");
      grad.addColorStop(0.7, "#f0bc20");
      grad.addColorStop(1, "#c88c10");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(kx, ry, kr, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(110,74,8,0.45)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }
  // Demoted feathered sheen travelling with the roll (secondary accent).
  glint(ctx, loopPhase(t, 3.4), { span: 12, width: 6, angle: Math.PI / 2, intensity: 0.28, length: 48, warm: true });
  ctx.restore();

  // Silk tuft
  ctx.strokeStyle = "#d8a838";
  ctx.lineWidth = 1;
  [-3, 0, 3].forEach((dx) => {
    const wig = Math.sin(t * 3 + dx) * 0.6;
    ctx.beginPath();
    ctx.moveTo(dx * 0.4, -22);
    ctx.quadraticCurveTo(dx + wig, -28, dx * 1.5 + wig, -26);
    ctx.stroke();
  });
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-4 - roll, -6, 1.8, 8, -0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// crop_peas — re-centred up; the pod's front lip swings OPEN at the hinge with
// an overshoot, revealing the peas, then eases closed. Shadow couples to the bob.
function animPeas(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -7); // re-frame: was sitting ~8u low (off_y +8.4)

  const bob = Math.sin(t * 1.4) * 1.4;
  // Hinge open/close beat: dwell closed, then ease open past the mark (overshoot)
  // and settle back.
  const openPhase = loopPhase(t, 3.0);
  const open = openPhase < 0.5 ? easeOutBack(openPhase * 2, 2.0) : easeInOutSine(1 - (openPhase - 0.5) * 2);
  const lip = open * 0.5; // radians the front lip lifts

  groundShadow(ctx, 0, 29, 18, 4, bob, 0.22);

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(-0.25 + Math.sin(t * 1.2) * 0.03);

  // Pod back (lower) half — fixed
  const podBack = ctx.createLinearGradient(0, -2, 0, 14);
  podBack.addColorStop(0, "#8aba40");
  podBack.addColorStop(1, "#3a6014");
  ctx.fillStyle = podBack;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.bezierCurveTo(-14, 14, 14, 14, 22, 2);
  ctx.bezierCurveTo(16, 8, -16, 8, -22, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#23400c";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Peas — shimmer; more visible as the pod opens.
  const peas: Array<[number, number]> = [[-13, 2], [-6.5, 3], [0, 3.2], [6.5, 3], [13, 2]];
  peas.forEach(([px, py], pi) => {
    const shim = 0.5 + 0.5 * Math.sin(t * 2.4 + pi * 1.1);
    const grad = ctx.createRadialGradient(px - 1.5, py - 1.5, 0.5, px, py, 5);
    grad.addColorStop(0, `rgb(${Math.round(205 + shim * 30)},240,${Math.round(136 + shim * 24)})`);
    grad.addColorStop(0.6, "#7cb83a");
    grad.addColorStop(1, "#3a6014");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 4.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#23400c";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const hx = px - 1.4 + Math.cos(t * 1.6 + pi) * 0.5;
    const hy = py - 1.6 + Math.sin(t * 1.6 + pi) * 0.4;
    ctx.fillStyle = `rgba(240,255,200,${0.55 + 0.3 * shim})`;
    ctx.beginPath();
    ctx.arc(hx, hy, 1.3, 0, TAU);
    ctx.fill();
  });

  // Pod front lip — hinged at the left seam (-22,2), swings open with `lip`.
  ctx.save();
  ctx.translate(-22, 2);
  ctx.rotate(-lip);
  ctx.translate(22, -2);
  const podFront = ctx.createLinearGradient(0, -10, 0, 2);
  podFront.addColorStop(0, "#9ccc54");
  podFront.addColorStop(1, "#4a8020");
  ctx.fillStyle = podFront;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.bezierCurveTo(-15, -10, 15, -10, 22, 2);
  ctx.bezierCurveTo(15, -3, -15, -3, -22, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#23400c";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(220,245,170,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-16, -3);
  ctx.bezierCurveTo(-8, -7, 8, -7, 16, -3);
  ctx.stroke();
  ctx.restore();

  // Stem tip — wags, lifts with the lip.
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.lineTo(-27, -2 - lip * 4 + Math.sin(t * 2.6) * 1.0);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// crop_watermelon — re-centred up; a springy wobble-and-plop (elastic squash on
// a periodic beat) drives the whole fruit, with the glint demoted to a sheen.
function animWatermelon(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(0, -6); // re-frame: was ~6u low (off_y +6.5)

  // Plop beat: settle, then a quick squash that springs back (easeOutElastic).
  const plopPhase = loopPhase(t, 2.8);
  const plop = plopPhase < 0.35 ? 1 - easeOutElastic(plopPhase / 0.35) : 0;
  const squash = 1 + plop * 0.12; // wider when squashed
  const stretch = 1 - plop * 0.12; // shorter when squashed
  const drop = plop * 2.2; // dips on impact

  groundShadow(ctx, 0, 25, 22, 5, -drop * 0.5, 0.25);

  ctx.save();
  // Squash about the ground-contact point.
  ctx.translate(0, 18 + drop);
  ctx.scale(squash, stretch);
  ctx.translate(0, -18);

  // Whole striped melon (back-left)
  ctx.save();
  ctx.translate(-5, 2);
  const body = ctx.createRadialGradient(-6, -6, 3, 0, 2, 20);
  body.addColorStop(0, "#7cc850");
  body.addColorStop(0.6, "#2e7a28");
  body.addColorStop(1, "#10380c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#0a2606";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = "rgba(14,56,12,0.85)";
  ctx.lineWidth = 3.2;
  [-12, -5, 2, 9].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -18);
    ctx.bezierCurveTo(x + 4, -6, x + 4, 6, x, 18);
    ctx.stroke();
  });
  // Demoted feathered sheen (was a bright sliding rectangle).
  glint(ctx, loopPhase(t, 4.0), { span: 18, width: 7, intensity: 0.26, length: 38 });
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, -7, 3, 6, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Cut wedge (front-right)
  ctx.save();
  ctx.translate(9, 6);
  ctx.rotate(0.25);
  const flesh = ctx.createLinearGradient(0, -14, 0, 12);
  flesh.addColorStop(0, "#ff6a6a");
  flesh.addColorStop(0.7, "#e02838");
  flesh.addColorStop(1, "#a01020");
  ctx.fillStyle = flesh;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(11, -12, 13, 6, 0, 14);
  ctx.bezierCurveTo(-13, 6, -11, -12, 0, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e8f4c0";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-13, 6, -11, -12, 0, -14);
  ctx.stroke();
  ctx.strokeStyle = "#2e7a28";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(11, -12, 13, 6, 0, 14);
  ctx.stroke();
  ctx.strokeStyle = "#0a2606";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#2a0a10";
  ([[-3, -4], [3, -2], [-1, 3], [4, 6], [-4, 7], [1, -8]] as Array<[number, number]>).forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 1.1, 1.8, 0.3, 0, TAU);
    ctx.fill();
  });
  // A single clean sparkle pings on the flesh as the fruit settles.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(11, -12, 13, 6, 0, 14);
  ctx.bezierCurveTo(-13, 6, -11, -12, 0, -14);
  ctx.closePath();
  ctx.clip();
  sparkle(ctx, -2, -2, 1.6, twinkle(t, 2.8, 0.1), "255,210,210");
  ctx.restore();
  ctx.fillStyle = "rgba(255,200,200,0.4)";
  ctx.beginPath();
  ctx.ellipse(-3, -3, 2.4, 5, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// crop_pumpkin — a heavy squash-settle that actually bulges the ribs (rib spread
// scales with the squash) and drives the highlight; glint demoted to a sheen.
function animPumpkin(ctx: CanvasRenderingContext2D, t: number): void {
  // Heavy breathing settle: a slow inhale then an eased-back release.
  const phase = loopPhase(t, 3.0);
  const squashAmt = Math.sin(phase * TAU) * 0.08; // ±8% (was an invisible 2%)
  const squash = 1 + squashAmt;
  const stretch = 1 - squashAmt * 0.7;
  const ribBulge = 1 + squashAmt * 0.9; // ribs splay wider on squash

  groundShadow(ctx, 0, 22, 22, 5, -squashAmt * 8, 0.25);

  ctx.save();
  ctx.translate(0, 12);
  ctx.scale(squash, stretch);
  ctx.translate(0, -12);

  // Body
  const body = ctx.createRadialGradient(-5, -2, 3, 0, 4, 24);
  body.addColorStop(0, "#ffc070");
  body.addColorStop(0.5, "#e87818");
  body.addColorStop(1, "#8a3a08");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 17, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#4a2008";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 17, 0, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = "rgba(74,32,8,0.55)";
  ctx.lineWidth = 1.4;
  [-14, -7, 0, 7, 14].forEach((x) => {
    const rx = x * ribBulge;
    ctx.beginPath();
    ctx.moveTo(rx, -11);
    ctx.bezierCurveTo(rx * 1.25, -2, rx * 1.25, 14, rx, 23);
    ctx.stroke();
  });
  ctx.strokeStyle = "rgba(255,210,150,0.4)";
  ctx.lineWidth = 1;
  [-10.5, -3.5, 3.5, 10.5].forEach((x) => {
    const rx = x * ribBulge;
    ctx.beginPath();
    ctx.moveTo(rx, -9);
    ctx.bezierCurveTo(rx * 1.2, 0, rx * 1.2, 12, rx, 21);
    ctx.stroke();
  });
  glint(ctx, loopPhase(t, 3.6), { span: 22, width: 8, angle: Math.PI / 2, intensity: 0.3, length: 40, warm: true });
  ctx.restore();

  // Specular highlight — brightens at the top of the breath.
  ctx.fillStyle = `rgba(255,245,210,${0.4 + Math.max(0, squashAmt) * 1.5})`;
  ctx.beginPath();
  ctx.ellipse(-9, -2, 4, 8, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Stem / leaf — flutters (outside the squash).
  const lean = Math.sin(t * 1.8) * 0.06;
  ctx.save();
  ctx.translate(0, -10);
  ctx.rotate(lean);
  ctx.translate(0, 10);
  const stem = ctx.createLinearGradient(-3, -22, 3, -10);
  stem.addColorStop(0, "#7cb840");
  stem.addColorStop(1, "#3a6014");
  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.moveTo(-3, -10);
  ctx.bezierCurveTo(-4, -18, -2, -22, 2, -24);
  ctx.lineTo(5, -22);
  ctx.bezierCurveTo(2, -20, 3, -14, 3, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#23400c";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  crop_sunflower: animSunflower,
  crop_wheat: animWheat,
  crop_corn: animCorn,
  crop_peas: animPeas,
  crop_watermelon: animWatermelon,
  crop_pumpkin: animPumpkin,
};
