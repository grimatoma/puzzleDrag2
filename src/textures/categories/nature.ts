// Small natural elements & forageables.

function drawLeaf(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.rotate(0.25);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
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
  // Central midrib
  ctx.strokeStyle = "rgba(31,58,8,0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.lineTo(0, -21);
  ctx.stroke();
  // Side veins
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
  ctx.restore();
  // Dewy highlight
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(-4, -8, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(5, -12, 1.6, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAcorn(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nut body — smooth tan oval tapering to a point
  const body = ctx.createLinearGradient(-10, -4, 10, 18);
  body.addColorStop(0, "#e0a860");
  body.addColorStop(0.5, "#b07020");
  body.addColorStop(1, "#704008");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.bezierCurveTo(-13, 8, -8, 20, 0, 24);
  ctx.bezierCurveTo(8, 20, 13, 8, 11, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a2806";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Body highlight
  ctx.fillStyle = "rgba(255,240,200,0.5)";
  ctx.beginPath();
  ctx.ellipse(-4, 4, 2.6, 7, -0.25, 0, Math.PI * 2);
  ctx.fill();
  // Cap — textured dome
  const cap = ctx.createRadialGradient(-4, -10, 2, 0, -6, 16);
  cap.addColorStop(0, "#9a6a30");
  cap.addColorStop(0.6, "#6a4012");
  cap.addColorStop(1, "#3a2006");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.bezierCurveTo(-14, -18, 14, -18, 12, -4);
  ctx.bezierCurveTo(8, 0, -8, 0, -12, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1604";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cap texture — cross-hatched scales (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.bezierCurveTo(-14, -18, 14, -18, 12, -4);
  ctx.bezierCurveTo(8, 0, -8, 0, -12, -4);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(42,22,4,0.55)";
  ctx.lineWidth = 0.8;
  for (let x = -12; x <= 12; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, -18);
    ctx.lineTo(x, 0);
    ctx.stroke();
  }
  for (let y = -14; y <= -2; y += 4) {
    ctx.beginPath();
    ctx.moveTo(-13, y);
    ctx.quadraticCurveTo(0, y + 3, 13, y);
    ctx.stroke();
  }
  ctx.restore();
  // Stem nub
  ctx.strokeStyle = "#3a2006";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, -22);
  ctx.stroke();
}

function drawFeather(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.rotate(0.32);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(2, 22, 11, 3, 0.3, 0, Math.PI * 2);
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
  // Barbs — thin diagonal strokes from the quill outward (clipped)
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
  // Bare quill tip extending below
  ctx.strokeStyle = "#cfe4f8";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(1, 18);
  ctx.lineTo(3, 24);
  ctx.stroke();
  ctx.restore();
}

function drawClover(ctx: CanvasRenderingContext2D) {
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
  // Four heart-shaped leaflets arranged in a cross
  const drawLeaflet = (angle: number) => {
    ctx.save();
    ctx.rotate(angle);
    const grad = ctx.createRadialGradient(0, -11, 2, 0, -8, 12);
    grad.addColorStop(0, "#9ee84a");
    grad.addColorStop(0.6, "#46a01a");
    grad.addColorStop(1, "#246008");
    ctx.fillStyle = grad;
    // Heart-shaped lobe pointing outward (up)
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
    // Pale midrib
    ctx.strokeStyle = "rgba(220,255,180,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(0, -13);
    ctx.stroke();
    ctx.restore();
  };
  drawLeaflet(-Math.PI / 4);
  drawLeaflet(Math.PI / 4);
  drawLeaflet(-Math.PI * 3 / 4);
  drawLeaflet(Math.PI * 3 / 4);
  // Centre node
  ctx.fillStyle = "#2e5410";
  ctx.beginPath();
  ctx.arc(0, -1, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Lucky sparkle
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-7, -9, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawDewdrop(ctx: CanvasRenderingContext2D) {
  // Shadow / reflection on ground
  ctx.fillStyle = "rgba(40,90,120,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.bezierCurveTo(-14, 18, -6, 22, 0, 22);
  ctx.bezierCurveTo(6, 22, 14, 18, 14, 8);
  ctx.bezierCurveTo(14, -2, 3, -10, 0, -20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(20,70,110,0.7)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Inner refraction rim (lighter)
  ctx.strokeStyle = "rgba(216,244,255,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 9, 9, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  // Bright specular highlight — large glossy oval
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(-5, 3, 3.2, 7, -0.35, 0, Math.PI * 2);
  ctx.fill();
  // Small secondary sparkle
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(4, 12, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-2, -8, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPebbles(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // A zen stack of three smooth pebbles, largest at the base
  const stone = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    c0: string,
    c1: string,
    c2: string,
  ) => {
    const grad = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, 1, cx, cy, rx);
    grad.addColorStop(0, c0);
    grad.addColorStop(0.6, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a3a40";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Soft top highlight
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.3, cy - ry * 0.45, rx * 0.4, ry * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
  };
  // Base stone — wide dark grey
  stone(0, 16, 16, 7, "#9aa0a8", "#6a7078", "#3a4048");
  // Middle stone — medium
  stone(1, 2, 12, 6, "#aeb4bc", "#787e88", "#444a52");
  // Top stone — small, lighter
  stone(0, -10, 8, 4.5, "#c8ccd2", "#8e94a0", "#565c66");
}

function drawSpiderweb(ctx: CanvasRenderingContext2D) {
  // No ground shadow — web hangs in air. Faint dark vignette backdrop for contrast.
  const back = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
  back.addColorStop(0, "rgba(20,30,40,0.45)");
  back.addColorStop(1, "rgba(20,30,40,0)");
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();
  const spokes = 8;
  const radius = 22;
  // Radial threads
  ctx.strokeStyle = "rgba(230,240,250,0.75)";
  ctx.lineWidth = 0.9;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.stroke();
  }
  // Spiral threads — concentric rings with a slight sag between spokes
  ctx.strokeStyle = "rgba(220,235,248,0.6)";
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
        // Midpoint between this and previous spoke, pulled inward to sag
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
  // A couple of clinging dewdrops on the threads
  const dew = (dx: number, dy: number, r: number) => {
    const g = ctx.createRadialGradient(dx - r * 0.4, dy - r * 0.4, 0.5, dx, dy, r);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.5, "rgba(160,210,240,0.85)");
    g.addColorStop(1, "rgba(60,140,190,0.7)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(dx - r * 0.35, dy - r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  };
  dew(-9, 6, 2.6);
  dew(11, -4, 2);
  dew(2, 14, 1.8);
}

function drawMushroomCluster(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 20, 4.5, 0, 0, Math.PI * 2);
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
  // A single toadstool: stem + brown cap
  const toadstool = (cx: number, baseY: number, scale: number) => {
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
  };
  // Draw back/small one first, then the two front toadstools
  toadstool(8, 15, 0.7);
  toadstool(-7, 18, 1);
  toadstool(5, 19, 0.85);
}

function drawSeashell(ctx: CanvasRenderingContext2D) {
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
  ctx.beginPath();
  // Hinge at bottom, fanning out to a scalloped top edge
  ctx.moveTo(0, 18);
  ctx.bezierCurveTo(-20, 10, -22, -8, -16, -16);
  // Scalloped top rim (wavy)
  const lobes = 6;
  for (let i = 0; i <= lobes; i++) {
    const t = i / lobes;
    const x = -16 + t * 32;
    const y = -16 - Math.sin(t * Math.PI) * 4 + (i % 2 === 0 ? 0 : 2.5);
    ctx.lineTo(x, y);
  }
  ctx.bezierCurveTo(22, -8, 20, 10, 0, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a4a20";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Radiating ridges from the hinge (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.bezierCurveTo(-20, 10, -22, -8, -16, -16);
  ctx.lineTo(16, -16);
  ctx.bezierCurveTo(22, -8, 20, 10, 0, 18);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(138,74,32,0.5)";
  ctx.lineWidth = 1.3;
  for (let i = -5; i <= 5; i++) {
    const a = (i / 5) * (Math.PI * 0.42);
    ctx.beginPath();
    ctx.moveTo(0, 17);
    ctx.lineTo(Math.sin(a) * 24, 17 - Math.cos(a) * 38);
    ctx.stroke();
  }
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
}

function drawCattail(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Thin reed leaves arcing up from the base
  const drawBlade = (lean: number, len: number, w: number) => {
    const grad = ctx.createLinearGradient(0, 22, lean * 14, 22 - len);
    grad.addColorStop(0, "#5a8a26");
    grad.addColorStop(1, "#9ed85a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(lean * 10, 22 - len * 0.6, lean * 14, 22 - len);
    ctx.quadraticCurveTo(lean * 9 + w, 22 - len * 0.55, w, 20);
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
  // Brown sausage-shaped head
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
  // Velvety texture — fine horizontal striations (clipped)
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
  // Little tip spike on top of the head
  ctx.strokeStyle = "#a8b850";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -23);
  ctx.lineTo(1, -30);
  ctx.stroke();
}

export const ICONS = {
  nature_leaf:             { label:"Leaf",             color:"#4a9020", draw:drawLeaf },
  nature_acorn:            { label:"Acorn",            color:"#b07020", draw:drawAcorn },
  nature_feather:          { label:"Feather",          color:"#7ab4e8", draw:drawFeather },
  nature_clover:           { label:"Four-Leaf Clover", color:"#46a01a", draw:drawClover },
  nature_dewdrop:          { label:"Dewdrop",          color:"#3a90c8", draw:drawDewdrop },
  nature_pebbles:          { label:"Pebbles",          color:"#787e88", draw:drawPebbles },
  nature_spiderweb:        { label:"Spider Web",       color:"#e6f0fa", draw:drawSpiderweb },
  nature_mushroom_cluster: { label:"Mushroom Cluster", color:"#8a5a28", draw:drawMushroomCluster },
  nature_seashell:         { label:"Seashell",         color:"#f8c8a0", draw:drawSeashell },
  nature_cattail:          { label:"Cattail",          color:"#6a4012", draw:drawCattail },
};
