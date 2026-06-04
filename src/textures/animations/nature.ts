// Animated nature / forageable icons.
//
// Self-contained Canvas-2D animation fns (no imports / no shared exports).
// Each fn redraws the COMPLETE icon at time `t` (elapsed seconds), centered at
// origin (0,0) within a roughly -24..+24 box. The caller handles clear / save /
// translate / scale / lineCap / restore. Motion is derived purely from `t` and
// from indices (no Math.random) so frames are deterministic, and loops are made
// seamless via Math.sin/cos and modulo.

const TAU = Math.PI * 2;

// ── 1. Leaf ──────────────────────────────────────────────────────────────────
// Flutters/rocks gently as if in a breeze; a dewy highlight glints.
function animLeaf(ctx: CanvasRenderingContext2D, t: number): void {
  // Gentle breeze rock: layered sin for an organic, seamless flutter.
  const rock = Math.sin(t * 1.6) * 0.1 + Math.sin(t * 2.7) * 0.04;
  const glint = 0.55 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));

  ctx.save();
  ctx.rotate(0.25 + rock);

  // Shadow — softens as the leaf tips up in the breeze
  ctx.fillStyle = `rgba(0,0,0,${0.2 - Math.abs(rock) * 0.4})`;
  ctx.beginPath();
  ctx.ellipse(0, 22, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.strokeStyle = "#3a5a14";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(-1, 12, 0, 4);
  ctx.stroke();
  // Blade — pointed teardrop
  const blade = ctx.createLinearGradient(-12, 0, 12, -6);
  blade.addColorStop(0, "#9ed85a");
  blade.addColorStop(0.5, "#4a9020");
  blade.addColorStop(1, "#27560e");
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-16, -2, -12, -20, 0, -22);
  ctx.bezierCurveTo(12, -20, 16, -2, 0, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Veins — clipped to the blade
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-16, -2, -12, -20, 0, -22);
  ctx.bezierCurveTo(12, -20, 16, -2, 0, 4);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(31,58,8,0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.lineTo(0, -21);
  ctx.stroke();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = "rgba(31,58,8,0.5)";
  for (let i = 0; i < 5; i++) {
    const y = -1 - i * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(-8 + i * 0.8, y - 5);
    ctx.moveTo(0, y);
    ctx.lineTo(8 - i * 0.8, y - 5);
    ctx.stroke();
  }
  // Travelling specular glint sweeping along the midrib
  const gy = -3 - ((t * 7) % 22);
  const gg = ctx.createRadialGradient(0, gy, 0.5, 0, gy, 6);
  gg.addColorStop(0, `rgba(255,255,255,${0.4 * glint})`);
  gg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(0, gy, 6, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Dewy highlight — glints (brightness oscillates)
  ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.3 * glint})`;
  ctx.beginPath();
  ctx.arc(-4, -8, 2.4 + 0.4 * Math.sin(t * 2.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(5, -12, 1.6, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── 2. Feather ───────────────────────────────────────────────────────────────
// Drifts/sways softly (slow rocking float) with a slight rotation.
function animFeather(ctx: CanvasRenderingContext2D, t: number): void {
  const floatY = Math.sin(t * 1.1) * 1.8;
  const driftX = Math.sin(t * 0.8 + 0.6) * 2.2;
  const tilt = Math.sin(t * 0.9) * 0.14 + Math.sin(t * 1.7) * 0.05;

  ctx.save();
  ctx.translate(driftX, floatY);
  ctx.rotate(0.32 + tilt);

  // Shadow — drops away as the feather floats up
  ctx.fillStyle = `rgba(0,0,0,${0.18 - floatY * 0.03})`;
  ctx.beginPath();
  ctx.ellipse(2 - driftX, 22 - floatY, 11, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Vane — soft blue plume
  const vane = ctx.createLinearGradient(-9, -20, 9, 18);
  vane.addColorStop(0, "#cfeaff");
  vane.addColorStop(0.5, "#7ab4e8");
  vane.addColorStop(1, "#3a6aa8");
  ctx.fillStyle = vane;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(-11, -12, -10, 6, -4, 18);
  ctx.bezierCurveTo(0, 22, 4, 22, 8, 16);
  ctx.bezierCurveTo(11, 4, 9, -12, 0, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a4a78";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Barbs — clipped
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(-11, -12, -10, 6, -4, 18);
  ctx.bezierCurveTo(0, 22, 4, 22, 8, 16);
  ctx.bezierCurveTo(11, 4, 9, -12, 0, -22);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(42,74,120,0.45)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 16; i++) {
    const y = -20 + i * 2.6;
    const lean = 6 - i * 0.15;
    ctx.beginPath();
    ctx.moveTo(0.5, y + 2);
    ctx.lineTo(-9, y - lean);
    ctx.moveTo(-0.5, y + 2);
    ctx.lineTo(9, y - lean);
    ctx.stroke();
  }
  // Soft sheen drifting down the vane
  const sy = -22 + ((t * 9) % 44);
  const sh = ctx.createLinearGradient(0, sy - 5, 0, sy + 5);
  sh.addColorStop(0, "rgba(255,255,255,0)");
  sh.addColorStop(0.5, "rgba(255,255,255,0.4)");
  sh.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(-11, sy - 5, 22, 10);
  ctx.restore();
  // Central quill (rachis)
  ctx.strokeStyle = "#f4faff";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.quadraticCurveTo(1, 0, 1, 20);
  ctx.stroke();
  ctx.strokeStyle = "rgba(58,106,168,0.7)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.quadraticCurveTo(1, 0, 1, 20);
  ctx.stroke();
  // Bare quill tip
  ctx.strokeStyle = "#cfe4f8";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(1, 18);
  ctx.lineTo(3, 24);
  ctx.stroke();
  ctx.restore();
}

// ── 3. Clover ────────────────────────────────────────────────────────────────
// The four leaflets shimmer in sequence; a lucky sparkle twinkles.
function animClover(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.strokeStyle = "#3a6818";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(-2, 8, 0, -1);
  ctx.stroke();

  // Four heart-shaped leaflets arranged in a cross — each shimmers in sequence.
  const drawLeaflet = (angle: number, phase: number) => {
    // Sequenced shimmer: a bright wash sweeps leaflet to leaflet.
    const shimmer = 0.5 + 0.5 * Math.sin(t * 2.4 - phase * (TAU / 4));
    const wobble = Math.sin(t * 1.8 - phase) * 0.05;
    ctx.save();
    ctx.rotate(angle + wobble);
    const grad = ctx.createRadialGradient(0, -11, 2, 0, -8, 12);
    grad.addColorStop(0, "#9ee84a");
    grad.addColorStop(0.6, "#46a01a");
    grad.addColorStop(1, "#246008");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.bezierCurveTo(-9, -4, -11, -16, -4, -16);
    ctx.bezierCurveTo(-1.5, -16, 0, -13, 0, -13);
    ctx.bezierCurveTo(0, -13, 1.5, -16, 4, -16);
    ctx.bezierCurveTo(11, -16, 9, -4, 0, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1f4006";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Shimmer wash — clipped to the leaflet
    ctx.save();
    ctx.clip();
    ctx.fillStyle = `rgba(220,255,180,${0.45 * shimmer})`;
    ctx.beginPath();
    ctx.ellipse(0, -9, 9, 9, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // Pale midrib
    ctx.strokeStyle = "rgba(220,255,180,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(0, -13);
    ctx.stroke();
    ctx.restore();
  };
  drawLeaflet(-Math.PI / 4, 0);
  drawLeaflet(Math.PI / 4, 1);
  drawLeaflet(Math.PI * 3 / 4, 2);
  drawLeaflet(-Math.PI * 3 / 4, 3);

  // Centre node
  ctx.fillStyle = "#2e5410";
  ctx.beginPath();
  ctx.arc(0, -1, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Lucky sparkle — twinkles, with a brief cross-flare at the peak
  const tw = 0.5 + 0.5 * Math.sin(t * 3.1);
  const flare = Math.max(0, Math.sin(t * 3.1));
  ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * tw})`;
  ctx.beginPath();
  ctx.arc(-7, -9, 1.4 + 0.8 * tw, 0, Math.PI * 2);
  ctx.fill();
  if (flare > 0.1) {
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * flare})`;
    ctx.lineWidth = 0.8;
    const r = 3 + 2 * flare;
    ctx.beginPath();
    ctx.moveTo(-7 - r, -9);
    ctx.lineTo(-7 + r, -9);
    ctx.moveTo(-7, -9 - r);
    ctx.lineTo(-7, -9 + r);
    ctx.stroke();
  }
}

// ── 4. Dewdrop ───────────────────────────────────────────────────────────────
// Highlight shifts; periodically forms and releases a tiny drip that falls
// (seamless loop); gentle wobble.
function animDewdrop(ctx: CanvasRenderingContext2D, t: number): void {
  const wobble = Math.sin(t * 2.0) * 0.6;
  // Drip cycle (2.4s): a bead swells at the bottom, then a drop detaches and
  // falls away, fading just as the cycle restarts → seamless.
  const period = 2.4;
  const phase = (t % period) / period; // 0..1
  const swell = Math.sin(Math.min(phase, 0.4) / 0.4 * Math.PI) * 2.2;

  // Shadow / reflection on ground
  ctx.fillStyle = "rgba(40,90,120,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(wobble, 0);
  // Droplet body — classic teardrop, glossy blue
  const body = ctx.createRadialGradient(-5, 4, 2, 0, 8, 22);
  body.addColorStop(0, "#d8f4ff");
  body.addColorStop(0.4, "#7ec8ec");
  body.addColorStop(0.8, "#3a90c8");
  body.addColorStop(1, "#1f5a8a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.bezierCurveTo(-3, -10, -14, -2, -14, 8);
  // bottom swells with the forming drip
  ctx.bezierCurveTo(-14, 18, -6, 22 + swell, 0, 22 + swell);
  ctx.bezierCurveTo(6, 22 + swell, 14, 18, 14, 8);
  ctx.bezierCurveTo(14, -2, 3, -10, 0, -20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(20,70,110,0.7)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Inner refraction rim
  ctx.strokeStyle = "rgba(216,244,255,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 9, 9, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  // Bright specular highlight — drifts gently with the wobble
  const hx = -5 + Math.sin(t * 1.5) * 1.2;
  const hy = 3 + Math.cos(t * 1.7) * 1.0;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.2, 7, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(4, 12, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-2, -8, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Released drip — detaches after the swell and falls, fading out
  if (phase > 0.4) {
    const f = (phase - 0.4) / 0.6; // 0..1
    const dropY = 22 + f * 14;
    const r = 2.6 * (1 - f * 0.5);
    const alpha = (1 - f) * (1 - f);
    const dg = ctx.createRadialGradient(wobble - r * 0.4, dropY - r * 0.4, 0.5, wobble, dropY, r);
    dg.addColorStop(0, `rgba(216,244,255,${0.95 * alpha})`);
    dg.addColorStop(0.7, `rgba(122,200,236,${0.85 * alpha})`);
    dg.addColorStop(1, `rgba(31,90,138,${0.7 * alpha})`);
    ctx.fillStyle = dg;
    ctx.beginPath();
    // little teardrop falling
    ctx.moveTo(wobble, dropY - r * 1.4);
    ctx.bezierCurveTo(wobble - r, dropY - r * 0.4, wobble - r, dropY + r, wobble, dropY + r);
    ctx.bezierCurveTo(wobble + r, dropY + r, wobble + r, dropY - r * 0.4, wobble, dropY - r * 1.4);
    ctx.closePath();
    ctx.fill();
  }
}

// ── 5. Spiderweb ─────────────────────────────────────────────────────────────
// Dew on the web twinkles; the whole web shimmers faintly and sways a hair.
function animSpiderweb(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(t * 1.3) * 0.04; // hair-thin breeze sway
  const breathe = 1 + Math.sin(t * 1.0) * 0.015;

  // Faint dark vignette backdrop for contrast
  const back = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
  back.addColorStop(0, "rgba(20,30,40,0.45)");
  back.addColorStop(1, "rgba(20,30,40,0)");
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(sway);
  ctx.scale(breathe, breathe);

  const spokes = 8;
  const radius = 22;
  const shimmer = 0.6 + 0.18 * Math.sin(t * 2.0);
  // Radial threads — alpha shimmers faintly
  ctx.strokeStyle = `rgba(230,240,250,${shimmer + 0.15})`;
  ctx.lineWidth = 0.9;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.stroke();
  }
  // Spiral threads with sag
  ctx.strokeStyle = `rgba(220,235,248,${shimmer})`;
  ctx.lineWidth = 0.7;
  for (let ring = 1; ring <= 5; ring++) {
    const r = (ring / 5) * radius;
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const pa = ((i - 1) / spokes) * Math.PI * 2 - Math.PI / 2;
        const mx = (Math.cos(a) + Math.cos(pa)) * 0.5 * r * 0.86;
        const my = (Math.sin(a) + Math.sin(pa)) * 0.5 * r * 0.86;
        ctx.quadraticCurveTo(mx, my, x, y);
      }
    }
    ctx.stroke();
  }
  // Bright central hub knot
  ctx.fillStyle = "rgba(245,250,255,0.85)";
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Clinging dewdrops — each twinkles on its own phase
  const dew = (dx: number, dy: number, r: number, phase: number) => {
    const tw = 0.5 + 0.5 * Math.sin(t * 2.6 + phase);
    const g = ctx.createRadialGradient(dx - r * 0.4, dy - r * 0.4, 0.5, dx, dy, r);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.5, "rgba(160,210,240,0.85)");
    g.addColorStop(1, "rgba(60,140,190,0.7)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(dx, dy, r * (0.9 + 0.15 * tw), 0, Math.PI * 2);
    ctx.fill();
    // twinkling specular
    ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * tw})`;
    ctx.beginPath();
    ctx.arc(dx - r * 0.35, dy - r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  };
  dew(-9, 6, 2.6, 0);
  dew(11, -4, 2, 2.1);
  dew(2, 14, 1.8, 4.0);
  ctx.restore();
}

// ── 6. Cattail ───────────────────────────────────────────────────────────────
// Sways on its reed; a few fluff seeds drift off the head on a loop.
function animCattail(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(t * 1.4) * 0.07 + Math.sin(t * 2.3) * 0.025;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sway pivots near the base of the reed (around y≈22).
  ctx.save();
  ctx.translate(0, 22);
  ctx.rotate(sway);
  ctx.translate(0, -22);

  // Reed blades arcing up — extra lean with the breeze
  const drawBlade = (lean: number, len: number, w: number) => {
    const l = lean + sway * 4;
    const grad = ctx.createLinearGradient(0, 22, l * 14, 22 - len);
    grad.addColorStop(0, "#5a8a26");
    grad.addColorStop(1, "#9ed85a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(l * 10, 22 - len * 0.6, l * 14, 22 - len);
    ctx.quadraticCurveTo(l * 9 + w, 22 - len * 0.55, w, 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e4810";
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  drawBlade(-1, 40, 2);
  drawBlade(1, 36, 2);
  drawBlade(-0.5, 46, 2);

  // Main stem (reed)
  ctx.strokeStyle = "#6a7a2a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(1, 4, 0, -6);
  ctx.stroke();
  ctx.strokeStyle = "#a8b850";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(1, 4, 0, -6);
  ctx.stroke();

  // Brown sausage head
  const head = ctx.createLinearGradient(-6, 0, 6, 0);
  head.addColorStop(0, "#a06a2e");
  head.addColorStop(0.5, "#6a4012");
  head.addColorStop(1, "#3a2006");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(-7, -5, -7, -20, 0, -23);
  ctx.bezierCurveTo(7, -20, 7, -5, 0, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1604";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Velvety striations — clipped
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(-7, -5, -7, -20, 0, -23);
  ctx.bezierCurveTo(7, -20, 7, -5, 0, -4);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(42,22,4,0.4)";
  ctx.lineWidth = 0.6;
  for (let y = -21; y <= -6; y += 2) {
    ctx.beginPath();
    ctx.moveTo(-7, y);
    ctx.lineTo(7, y);
    ctx.stroke();
  }
  ctx.restore();
  // Head highlight
  ctx.fillStyle = "rgba(220,170,110,0.5)";
  ctx.beginPath();
  ctx.ellipse(-2.5, -13, 1.6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tip spike
  ctx.strokeStyle = "#a8b850";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -23);
  ctx.lineTo(1, -30);
  ctx.stroke();

  // Drifting fluff seeds — released off the head on a seamless loop.
  const seeds = 4;
  for (let i = 0; i < seeds; i++) {
    const p = ((t * 0.35 + i / seeds) % 1); // 0..1 per seed, staggered
    const dir = i % 2 === 0 ? 1 : -1;
    // Start near a point on the head, drift up and outward, fading.
    const sx0 = dir * 4 + Math.sin(i * 2.1) * 2;
    const sy0 = -18 + (i % 3) * 5;
    const x = sx0 + dir * p * 16 + Math.sin(p * 6 + i) * 2;
    const y = sy0 - p * 24;
    const alpha = Math.sin(p * Math.PI) * 0.85; // fade in & out → seamless
    if (alpha <= 0.01) continue;
    // fluffy seed: pale tuft
    ctx.fillStyle = `rgba(238,228,200,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(238,228,200,${alpha * 0.7})`;
    ctx.lineWidth = 0.6;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + p * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── 7. Mushroom cluster ──────────────────────────────────────────────────────
// Gentle breathing; tiny spore specks drift up; a soft glow pulses (subtle).
function animMushroomCluster(ctx: CanvasRenderingContext2D, t: number): void {
  const breathe = 1 + Math.sin(t * 1.2) * 0.02;
  const glow = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.0));

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 20, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle soft glow over the caps
  const gg = ctx.createRadialGradient(0, 2, 2, 0, 2, 22);
  gg.addColorStop(0, `rgba(180,230,150,${glow})`);
  gg.addColorStop(1, "rgba(180,230,150,0)");
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(0, 2, 22, 0, Math.PI * 2);
  ctx.fill();

  // Mossy base mound
  const moss = ctx.createRadialGradient(0, 18, 3, 0, 20, 22);
  moss.addColorStop(0, "#6fa838");
  moss.addColorStop(0.7, "#3a6818");
  moss.addColorStop(1, "#23440c");
  ctx.fillStyle = moss;
  ctx.beginPath();
  ctx.ellipse(0, 19, 19, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Moss flecks
  ctx.fillStyle = "rgba(150,210,90,0.7)";
  for (let i = 0; i < 9; i++) {
    const x = -15 + i * 3.6;
    const y = 16 + Math.sin(i * 1.7) * 3;
    ctx.beginPath();
    ctx.arc(x, y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Toadstools — breathe by scaling about their base.
  const toadstool = (cx: number, baseY: number, scale: number) => {
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.scale(1, breathe);
    ctx.translate(-cx, -baseY);
    // Stem
    const stem = ctx.createLinearGradient(cx - 4 * scale, 0, cx + 4 * scale, 0);
    stem.addColorStop(0, "#f4e6c4");
    stem.addColorStop(0.5, "#e0c890");
    stem.addColorStop(1, "#a88a50");
    ctx.fillStyle = stem;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * scale, baseY - 12 * scale);
    ctx.bezierCurveTo(cx - 5 * scale, baseY - 2, cx - 3 * scale, baseY, cx, baseY);
    ctx.bezierCurveTo(cx + 3 * scale, baseY, cx + 5 * scale, baseY - 2, cx + 4 * scale, baseY - 12 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#6a522a";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Cap — brown dome
    const cap = ctx.createRadialGradient(cx - 3 * scale, baseY - 16 * scale, 1, cx, baseY - 12 * scale, 12 * scale);
    cap.addColorStop(0, "#c89860");
    cap.addColorStop(0.6, "#8a5a28");
    cap.addColorStop(1, "#4a2c0a");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * scale, baseY - 11 * scale);
    ctx.bezierCurveTo(cx - 11 * scale, baseY - 24 * scale, cx + 11 * scale, baseY - 24 * scale, cx + 10 * scale, baseY - 11 * scale);
    ctx.bezierCurveTo(cx + 6 * scale, baseY - 8 * scale, cx - 6 * scale, baseY - 8 * scale, cx - 10 * scale, baseY - 11 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e1a04";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Cap highlight band
    ctx.strokeStyle = "rgba(255,230,180,0.5)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx - 7 * scale, baseY - 16 * scale);
    ctx.bezierCurveTo(cx - 3 * scale, baseY - 21 * scale, cx + 3 * scale, baseY - 21 * scale, cx + 7 * scale, baseY - 16 * scale);
    ctx.stroke();
    // Pale spots
    ctx.fillStyle = "rgba(248,236,206,0.85)";
    ctx.beginPath();
    ctx.arc(cx - 3 * scale, baseY - 16 * scale, 1.6 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 4 * scale, baseY - 14 * scale, 1.3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  toadstool(8, 15, 0.7);
  toadstool(-7, 18, 1);
  toadstool(5, 19, 0.85);

  // Drifting spore specks rising off the caps — seamless looped fade.
  const spores = 6;
  for (let i = 0; i < spores; i++) {
    const p = ((t * 0.3 + i / spores) % 1);
    const ox = -8 + (i * 3.1) % 18 + Math.sin(p * 5 + i) * 2;
    const y = 4 - p * 22;
    const alpha = Math.sin(p * Math.PI) * 0.6;
    if (alpha <= 0.01) continue;
    ctx.fillStyle = `rgba(220,210,170,${alpha})`;
    ctx.beginPath();
    ctx.arc(ox, y, 0.8, 0, TAU);
    ctx.fill();
  }
}

// ── 8. Seashell ──────────────────────────────────────────────────────────────
// A pearly specular sheen sweeps across the ridges (clipped); a sparkle.
function animSeashell(ctx: CanvasRenderingContext2D, t: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fan scallop shell body
  const body = ctx.createLinearGradient(0, -18, 0, 20);
  body.addColorStop(0, "#fff0e0");
  body.addColorStop(0.5, "#f8c8a0");
  body.addColorStop(1, "#d08858");
  ctx.fillStyle = body;
  const tracePath = () => {
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.bezierCurveTo(-20, 10, -22, -8, -16, -16);
    const lobes = 6;
    for (let i = 0; i <= lobes; i++) {
      const tt = i / lobes;
      const x = -16 + tt * 32;
      const y = -16 - Math.sin(tt * Math.PI) * 4 + (i % 2 === 0 ? 0 : 2.5);
      ctx.lineTo(x, y);
    }
    ctx.bezierCurveTo(22, -8, 20, 10, 0, 18);
    ctx.closePath();
  };
  tracePath();
  ctx.fill();
  ctx.strokeStyle = "#8a4a20";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ridges + sweeping pearly sheen — both clipped to the shell.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.bezierCurveTo(-20, 10, -22, -8, -16, -16);
  ctx.lineTo(16, -16);
  ctx.bezierCurveTo(22, -8, 20, 10, 0, 18);
  ctx.closePath();
  ctx.clip();
  // Radiating ridges from the hinge
  ctx.strokeStyle = "rgba(138,74,32,0.5)";
  ctx.lineWidth = 1.3;
  for (let i = -5; i <= 5; i++) {
    const a = (i / 5) * (Math.PI * 0.42);
    ctx.beginPath();
    ctx.moveTo(0, 17);
    ctx.lineTo(Math.sin(a) * 24, 17 - Math.cos(a) * 38);
    ctx.stroke();
  }
  // Specular sheen sweeping left→right, looping seamlessly.
  const period = 3.2;
  const ph = (t % period) / period; // 0..1
  const cx = -28 + ph * 56; // sweep across -28..28
  const sheen = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,250,245,0.55)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(-24, -20, 48, 42);
  ctx.restore();

  // Hinge knob
  ctx.fillStyle = "#c87a40";
  ctx.beginPath();
  ctx.ellipse(0, 17, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a4a20";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Pearly highlights
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, -2, 2.4, 7, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(6, -6, 1.6, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Twinkling sparkle riding just ahead of the sheen.
  const tw = Math.max(0, Math.sin(t * 2.4));
  if (tw > 0.05) {
    const sxp = -10 + ((t % period) / period) * 20;
    ctx.fillStyle = `rgba(255,255,255,${0.85 * tw})`;
    ctx.beginPath();
    ctx.arc(sxp, -9, 1.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * tw})`;
    ctx.lineWidth = 0.7;
    const r = 2 + 2 * tw;
    ctx.beginPath();
    ctx.moveTo(sxp - r, -9);
    ctx.lineTo(sxp + r, -9);
    ctx.moveTo(sxp, -9 - r);
    ctx.lineTo(sxp, -9 + r);
    ctx.stroke();
  }
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  nature_leaf: animLeaf,
  nature_feather: animFeather,
  nature_clover: animClover,
  nature_dewdrop: animDewdrop,
  nature_spiderweb: animSpiderweb,
  nature_cattail: animCattail,
  nature_mushroom_cluster: animMushroomCluster,
  nature_seashell: animSeashell,
};
