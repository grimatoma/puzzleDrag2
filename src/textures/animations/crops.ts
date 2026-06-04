// Animated farm crops & produce — same look as src/textures/categories/crops.ts, but alive.
// Each fn redraws the WHOLE icon at time `t` (seconds). Loops are seamless via modulo / sin.
// Pure, self-contained, no imports. Glints clip to the produce silhouette; sways loop seamlessly.

// ---------------------------------------------------------------------------
// crop_sunflower — bloom sways on its stem and slowly turns toward the light,
// petals shimmer, and a faint sparkle drifts by like a passing bee.
function animSunflower(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow (anchored to the ground, follows sway gently)
  const sway = Math.sin(t * 0.9) * 0.08; // radians, slow breeze
  const turn = Math.sin(t * 0.35) * 0.06; // slow heliotropic turn of the head
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(sway * 8, 23, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stem — bends slightly with the breeze (base fixed, top leans)
  ctx.save();
  // pivot near the base of the visible stem
  ctx.translate(0, 24);
  ctx.rotate(sway * 0.4);
  ctx.translate(0, -24);
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
  // Leaves on stem — flutter a touch
  ([[-1, 10], [1, 16]] as Array<[number, number]>).forEach(([side, sy], li) => {
    const flutter = 1 + Math.sin(t * 2.2 + li * 1.6) * 0.06;
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
  ctx.restore();

  // Head — sways with the stem and slowly turns toward the light.
  const cy = -8;
  ctx.save();
  // sway the head about the stem base, then turn the bloom about its own center
  ctx.translate(0, 24);
  ctx.rotate(sway * 0.55);
  ctx.translate(0, -24);
  ctx.translate(0, cy);
  ctx.rotate(turn);

  // Petals — ring of golden teardrops; each shimmers individually.
  const petalCount = 14;
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    const ir = 9;
    const or = 17 + Math.sin(t * 2.6 + i * 0.9) * 0.5; // gentle length shimmer
    const ix = Math.cos(a) * ir;
    const iy = Math.sin(a) * ir;
    const ox = Math.cos(a) * or;
    const oy = Math.sin(a) * or;
    const px = Math.cos(a + Math.PI / 2) * 3;
    const py = Math.sin(a + Math.PI / 2) * 3;
    // shimmer brightens petals as a slow wave sweeps around the ring
    const shimmer = 0.5 + 0.5 * Math.sin(t * 1.8 - a * 2);
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
  // Dark seeded center
  const center = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11);
  center.addColorStop(0, "#7a5418");
  center.addColorStop(0.6, "#4a3008");
  center.addColorStop(1, "#231804");
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1002";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Seed texture — small spiral dots
  ctx.fillStyle = "rgba(40,26,6,0.85)";
  for (let i = 0; i < 36; i++) {
    const a = i * 2.399;
    const r = Math.sqrt(i / 36) * 8.5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center highlight
  ctx.fillStyle = "rgba(180,140,60,0.5)";
  ctx.beginPath();
  ctx.arc(-3, -3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // A bee-like sparkle drifts past the bloom on a slow loop.
  const bp = (t * 0.18) % 1; // 0..1 loop
  const bx = -22 + bp * 44;
  const by = cy - 14 + Math.sin(bp * Math.PI * 3) * 5;
  const ba = Math.sin(bp * Math.PI); // fade in/out at the edges
  if (ba > 0.02) {
    ctx.fillStyle = `rgba(255,250,210,${0.7 * ba})`;
    ctx.beginPath();
    ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // tiny sparkle cross
    ctx.strokeStyle = `rgba(255,255,235,${0.5 * ba})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bx - 3, by);
    ctx.lineTo(bx + 3, by);
    ctx.moveTo(bx, by - 3);
    ctx.lineTo(bx, by + 3);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// crop_wheat — the stalks sway side to side in a breeze; the grain heads lean
// more than the bound base.
function animWheat(ctx: CanvasRenderingContext2D, t: number): void {
  const breeze = Math.sin(t * 1.1); // -1..1 primary sway
  const gust = Math.sin(t * 1.1 + 0.6) * 0.3; // slight phase-offset secondary motion
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const stalks: Array<[number, number]> = [[-0.5, -0.32], [0, 0], [0.5, 0.32]];
  // Per-stalk lean of the head: base barely moves (bound), tip leans with breeze.
  // headBend is added to the tip x; scaled by breeze so it's seamless.
  stalks.forEach(([, lean], si) => {
    const headBend = (breeze + gust) * (3.2 + si * 0.4) * 0.6;
    const tipX = lean * 16 + headBend;
    const tipY = -10 - Math.abs(headBend) * 0.15; // slight bob as it leans
    const baseX = lean * 8 + headBend * 0.3;
    const baseY = 0;

    // Stem (behind head) — base fixed near the twine, curving to the leaned tip.
    ctx.strokeStyle = "#c89838";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lean * 2, 18);
    ctx.quadraticCurveTo(baseX, baseY, tipX, tipY);
    ctx.stroke();

    // Grain heads — paired grains up the stalk.
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
        ctx.ellipse(ex, ey, 2.6, 1.7, -0.5 * sideDir + lean * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(110,74,8,0.6)";
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });
    }
    // awns (whiskers) at the tip
    ctx.strokeStyle = "rgba(232,200,90,0.8)";
    ctx.lineWidth = 0.8;
    [-2, 0, 2].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + dx + lean * 2 + headBend * 0.4, tipY - 8);
      ctx.stroke();
    });
  });

  // Binding twine around the base (fixed)
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
}

// ---------------------------------------------------------------------------
// crop_corn — gentle sway; a soft glint travels over the kernels; husk leaves
// flutter.
function animCorn(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(t * 1.0) * 0.05; // gentle whole-cob lean
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Husk leaves flutter (drawn behind the cob), each with its own phase.
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

  // Cob — swaying gently about its base.
  ctx.save();
  ctx.translate(0, 18);
  ctx.rotate(sway);
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

  // Kernels — clipped grid of little rounded squares.
  ctx.save();
  cobPath(ctx);
  ctx.clip();
  for (let row = 0; row < 11; row++) {
    const ry = -20 + row * 3.6;
    const offset = row % 2 === 0 ? 0 : 1.6;
    for (let col = -3; col <= 3; col++) {
      const kx = col * 3.2 + offset;
      const kr = 1.7;
      const grad = ctx.createRadialGradient(kx - 0.6, ry - 0.6, 0.3, kx, ry, kr + 0.6);
      grad.addColorStop(0, "#fff4b8");
      grad.addColorStop(0.7, "#f0bc20");
      grad.addColorStop(1, "#c88c10");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(kx, ry, kr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(110,74,8,0.45)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }
  // Soft glint band travels down the cob over the kernels (clipped).
  const glintY = -24 + ((t * 10) % 50); // sweeps top→bottom, loops
  const gg = ctx.createLinearGradient(0, glintY - 7, 0, glintY + 7);
  gg.addColorStop(0, "rgba(255,255,255,0)");
  gg.addColorStop(0.5, "rgba(255,255,255,0.45)");
  gg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gg;
  ctx.fillRect(-10, glintY - 7, 20, 14);
  ctx.restore();

  // Silk tuft at the tip
  ctx.strokeStyle = "#d8a838";
  ctx.lineWidth = 1;
  [-3, 0, 3].forEach((dx) => {
    const wig = Math.sin(t * 3 + dx) * 0.6;
    ctx.beginPath();
    ctx.moveTo(dx * 0.4, -22);
    ctx.quadraticCurveTo(dx + wig, -28, dx * 1.5 + wig, -26);
    ctx.stroke();
  });
  // Static highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-4, -6, 1.8, 8, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// crop_peas — the pod gently bobs; the peas inside shimmer; the pod tip wiggles.
function animPeas(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 1.4) * 1.6; // vertical bob
  const tipWag = Math.sin(t * 2.6) * 1.4; // pod tip wiggle
  // Shadow (steady on the ground)
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(-0.25 + Math.sin(t * 1.2) * 0.03);

  // Pod — back (lower) half
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

  // Peas — shimmer: highlight drifts and brightness pulses per pea.
  const peas: Array<[number, number]> = [[-13, 2], [-6.5, 3], [0, 3.2], [6.5, 3], [13, 2]];
  peas.forEach(([px, py], pi) => {
    const shim = 0.5 + 0.5 * Math.sin(t * 2.4 + pi * 1.1);
    const grad = ctx.createRadialGradient(px - 1.5, py - 1.5, 0.5, px, py, 5);
    grad.addColorStop(0, `rgb(${Math.round(205 + shim * 30)},240,${Math.round(136 + shim * 24)})`);
    grad.addColorStop(0.6, "#7cb83a");
    grad.addColorStop(1, "#3a6014");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#23400c";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // highlight drifts subtly around the top-left
    const hx = px - 1.4 + Math.cos(t * 1.6 + pi) * 0.5;
    const hy = py - 1.6 + Math.sin(t * 1.6 + pi) * 0.4;
    ctx.fillStyle = `rgba(240,255,200,${0.55 + 0.3 * shim})`;
    ctx.beginPath();
    ctx.arc(hx, hy, 1.3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Pod — front (upper) lip
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
  // Front lip highlight
  ctx.strokeStyle = "rgba(220,245,170,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-16, -3);
  ctx.bezierCurveTo(-8, -7, 8, -7, 16, -3);
  ctx.stroke();

  // Stem tip — wiggles.
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.lineTo(-27, -2 + tipWag);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// crop_watermelon — a glossy glint sweeps across the rind (clipped); the cut
// wedge's flesh sparkles.
function animWatermelon(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Whole striped melon (back-left)
  ctx.save();
  ctx.translate(-5, 2);
  const body = ctx.createRadialGradient(-6, -6, 3, 0, 2, 20);
  body.addColorStop(0, "#7cc850");
  body.addColorStop(0.6, "#2e7a28");
  body.addColorStop(1, "#10380c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a2606";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Dark green stripes (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(14,56,12,0.85)";
  ctx.lineWidth = 3.2;
  [-12, -5, 2, 9].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -18);
    ctx.bezierCurveTo(x + 4, -6, x + 4, 6, x, 18);
    ctx.stroke();
  });
  // Glossy glint sweeps across the rind (still clipped to the globe).
  const gp = (t * 0.22) % 1; // 0..1 loop
  const gx = -22 + gp * 44; // diagonal sweep position
  const glint = ctx.createLinearGradient(gx - 8, -16, gx + 8, 16);
  glint.addColorStop(0, "rgba(255,255,255,0)");
  glint.addColorStop(0.5, "rgba(255,255,255,0.4)");
  glint.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glint;
  ctx.fillRect(gx - 8, -18, 16, 36);
  ctx.restore();
  // Static highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, -7, 3, 6, -0.5, 0, Math.PI * 2);
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
  // White rind layer
  ctx.strokeStyle = "#e8f4c0";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-13, 6, -11, -12, 0, -14);
  ctx.stroke();
  // Green rind outer edge
  ctx.strokeStyle = "#2e7a28";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(11, -12, 13, 6, 0, 14);
  ctx.stroke();
  ctx.strokeStyle = "#0a2606";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Seeds
  ctx.fillStyle = "#2a0a10";
  ([[-3, -4], [3, -2], [-1, 3], [4, 6], [-4, 7], [1, -8]] as Array<[number, number]>).forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 1.1, 1.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  // Flesh sparkles — clipped to the wedge so they stay on the fruit.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(11, -12, 13, 6, 0, 14);
  ctx.bezierCurveTo(-13, 6, -11, -12, 0, -14);
  ctx.closePath();
  ctx.clip();
  const sparkPts: Array<[number, number, number]> = [[-4, -6, 0], [5, -1, 1.3], [-2, 6, 2.4], [3, 9, 3.6]];
  sparkPts.forEach(([sx, sy, ph]) => {
    const tw = 0.5 + 0.5 * Math.sin(t * 3.2 + ph);
    if (tw < 0.15) return;
    ctx.fillStyle = `rgba(255,210,210,${0.7 * tw})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.8 + tw * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Flesh highlight
  ctx.fillStyle = "rgba(255,200,200,0.4)";
  ctx.beginPath();
  ctx.ellipse(-3, -3, 2.4, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// crop_pumpkin — a soft specular glint sweeps the ribs (clipped); the stem/leaf
// flutters slightly; gentle breathing scale.
function animPumpkin(ctx: CanvasRenderingContext2D, t: number): void {
  const breathe = 1 + Math.sin(t * 1.2) * 0.02; // gentle breathing
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  // breathe about the body center (~0,6)
  ctx.translate(0, 6);
  ctx.scale(breathe, breathe);
  ctx.translate(0, -6);

  // Body — wide squat orange globe
  const body = ctx.createRadialGradient(-5, -2, 3, 0, 4, 24);
  body.addColorStop(0, "#ffc070");
  body.addColorStop(0.5, "#e87818");
  body.addColorStop(1, "#8a3a08");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a2008";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ribs + glint (clipped to the body).
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 17, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(74,32,8,0.55)";
  ctx.lineWidth = 1.4;
  [-14, -7, 0, 7, 14].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -11);
    ctx.bezierCurveTo(x * 1.25, -2, x * 1.25, 14, x, 23);
    ctx.stroke();
  });
  ctx.strokeStyle = "rgba(255,210,150,0.4)";
  ctx.lineWidth = 1;
  [-10.5, -3.5, 3.5, 10.5].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -9);
    ctx.bezierCurveTo(x * 1.2, 0, x * 1.2, 12, x, 21);
    ctx.stroke();
  });
  // Soft specular glint sweeps horizontally across the ribs.
  const gp = (t * 0.2) % 1;
  const gx = -26 + gp * 52;
  const glint = ctx.createLinearGradient(gx - 9, 0, gx + 9, 0);
  glint.addColorStop(0, "rgba(255,245,210,0)");
  glint.addColorStop(0.5, "rgba(255,245,210,0.4)");
  glint.addColorStop(1, "rgba(255,245,210,0)");
  ctx.fillStyle = glint;
  ctx.fillRect(gx - 9, -12, 18, 36);
  ctx.restore();

  // Specular highlight
  ctx.fillStyle = "rgba(255,245,210,0.4)";
  ctx.beginPath();
  ctx.ellipse(-9, -2, 4, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Stem / leaf — flutters slightly (drawn on top, outside the breathe scale).
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
