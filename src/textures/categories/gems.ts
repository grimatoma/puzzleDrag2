// Cut & raw gemstones / minerals (mine-themed).

// Shared helper: a small 4-point sparkle star centered at (x, y).
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.closePath();
  ctx.fill();
}

function drawRuby(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crown silhouette — round brilliant: wide girdle, table on top, pavilion below.
  const body = ctx.createRadialGradient(-4, -6, 2, 0, 2, 24);
  body.addColorStop(0, "#ff6a7a");
  body.addColorStop(0.5, "#d4143a");
  body.addColorStop(1, "#6a0418");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(16, -8);
  ctx.lineTo(18, -2);
  ctx.lineTo(0, 22);
  ctx.lineTo(-18, -2);
  ctx.lineTo(-16, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a020e";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Table facet (flat top)
  const table = ctx.createLinearGradient(0, -16, 0, -4);
  table.addColorStop(0, "#ffb0bc");
  table.addColorStop(1, "#e23a54");
  ctx.fillStyle = table;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(9, -6);
  ctx.lineTo(0, -2);
  ctx.lineTo(-9, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(58,2,14,0.7)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Crown facets (between table and girdle)
  ctx.strokeStyle = "rgba(58,2,14,0.6)";
  ctx.lineWidth = 1.2;
  [[-16, -8], [16, -8]].forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx < 0 ? -9 : 9, -6);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-16, -8);
  ctx.lineTo(0, -16);
  ctx.lineTo(16, -8);
  ctx.stroke();

  // Pavilion facets (V lines down to the cutlet)
  ctx.strokeStyle = "rgba(58,2,14,0.55)";
  ctx.lineWidth = 1.1;
  [[-18, -2], [-9, -6], [0, -2], [9, -6], [18, -2]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(0, 22);
    ctx.stroke();
  });

  // Bright pavilion facet (light catching one side)
  ctx.fillStyle = "rgba(255,170,185,0.5)";
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.lineTo(0, -2);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fill();

  // Specular table highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.moveTo(-3, -13);
  ctx.lineTo(3, -12);
  ctx.lineTo(-1, -6);
  ctx.closePath();
  ctx.fill();

  // Sparkles
  sparkle(ctx, 8, -10, 3.2, 0.95);
  sparkle(ctx, -5, 6, 2, 0.7);
}

function drawSapphire(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Oval cushion silhouette
  const body = ctx.createRadialGradient(-4, -6, 2, 0, 2, 24);
  body.addColorStop(0, "#6aa8ff");
  body.addColorStop(0.5, "#1a48c8");
  body.addColorStop(1, "#06143f");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(14, -10);
  ctx.lineTo(18, 0);
  ctx.lineTo(0, 22);
  ctx.lineTo(-18, 0);
  ctx.lineTo(-14, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#040a26";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Table facet
  const table = ctx.createLinearGradient(0, -15, 0, 0);
  table.addColorStop(0, "#a8c8ff");
  table.addColorStop(1, "#2a5ce0");
  ctx.fillStyle = table;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(8, -2);
  ctx.lineTo(0, 2);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(4,10,38,0.7)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Crown facets
  ctx.strokeStyle = "rgba(4,10,38,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, -10);
  ctx.lineTo(0, -15);
  ctx.lineTo(14, -10);
  ctx.stroke();
  [[-14, -10], [14, -10]].forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx < 0 ? -8 : 8, -2);
    ctx.stroke();
  });

  // Pavilion facets to the cutlet
  ctx.strokeStyle = "rgba(4,10,38,0.55)";
  ctx.lineWidth = 1.1;
  [[-18, 0], [-8, -2], [0, 2], [8, -2], [18, 0]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(0, 22);
    ctx.stroke();
  });

  // Bright facet
  ctx.fillStyle = "rgba(150,190,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(8, -2);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fill();

  // Specular table highlight
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(-3, -12);
  ctx.lineTo(3, -11);
  ctx.lineTo(-1, -5);
  ctx.closePath();
  ctx.fill();

  // Sparkles
  sparkle(ctx, 7, -9, 3, 0.9);
  sparkle(ctx, -6, 8, 2, 0.7);
}

function drawEmerald(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Emerald-cut: rectangular, cropped corners, concentric step facets.
  const w = 14;
  const h = 19;
  const c = 5; // corner crop
  const outline: Array<[number, number]> = [
    [-w + c, -h], [w - c, -h],
    [w, -h + c], [w, h - c],
    [w - c, h], [-w + c, h],
    [-w, h - c], [-w, -h + c],
  ];

  const body = ctx.createLinearGradient(-w, -h, w, h);
  body.addColorStop(0, "#5ce29a");
  body.addColorStop(0.5, "#0e9c52");
  body.addColorStop(1, "#04401f");
  ctx.fillStyle = body;
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#022914";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Step facet ring (inner rectangle, slightly brighter)
  const inset = 4;
  const iw = w - inset;
  const ih = h - inset;
  const ic = c - 2;
  const inner: Array<[number, number]> = [
    [-iw + ic, -ih], [iw - ic, -ih],
    [iw, -ih + ic], [iw, ih - ic],
    [iw - ic, ih], [-iw + ic, ih],
    [-iw, ih - ic], [-iw, -ih + ic],
  ];
  ctx.strokeStyle = "rgba(2,41,20,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  inner.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.stroke();

  // Table facet (flat inner rectangle, lit)
  const table = ctx.createLinearGradient(0, -ih, 0, ih);
  table.addColorStop(0, "#aef0c8");
  table.addColorStop(1, "#1fb866");
  ctx.fillStyle = table;
  const tw = iw - 3;
  const th = ih - 3;
  ctx.beginPath();
  ctx.moveTo(-tw, -th);
  ctx.lineTo(tw, -th);
  ctx.lineTo(tw, th);
  ctx.lineTo(-tw, th);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(2,41,20,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Corner step lines (connect outer crops to inner)
  ctx.strokeStyle = "rgba(2,41,20,0.5)";
  ctx.lineWidth = 1;
  outline.forEach(([x, y], i) => {
    const [ix, iy] = inner[i];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ix, iy);
    ctx.stroke();
  });

  // Specular highlight on the table
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.moveTo(-tw + 1, -th + 1);
  ctx.lineTo(-1, -th + 1);
  ctx.lineTo(-tw + 1, -2);
  ctx.closePath();
  ctx.fill();

  // Sparkles
  sparkle(ctx, tw - 2, th - 3, 2.6, 0.9);
  sparkle(ctx, -3, -1, 1.6, 0.6);
}

function drawAmethyst(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 17, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // A cluster of hexagonal prism crystal points of varying height.
  type Point = { x: number; base: number; top: number; w: number; lean: number };
  const points: Point[] = [
    { x: -10, base: 20, top: -2, w: 5, lean: -0.18 },
    { x: 10, base: 20, top: 0, w: 5, lean: 0.18 },
    { x: 0, base: 22, top: -18, w: 6.5, lean: 0 },
    { x: -3, base: 20, top: -8, w: 4, lean: -0.05 },
  ];

  // Draw shortest/back points first, tall center last.
  points.forEach((p) => {
    const tx = p.x + p.lean * 22;
    const tipY = p.top;
    const w = p.w;

    // Prism body — two visible vertical faces
    const left = ctx.createLinearGradient(p.x - w, 0, p.x, 0);
    left.addColorStop(0, "#7a3ab0");
    left.addColorStop(1, "#b878e8");
    const right = ctx.createLinearGradient(p.x, 0, p.x + w, 0);
    right.addColorStop(0, "#9a58d0");
    right.addColorStop(1, "#4a1878");

    // Left face
    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(p.x - w, p.base);
    ctx.lineTo(p.x, p.base + 1.5);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx - w + 1, tipY + 4);
    ctx.closePath();
    ctx.fill();

    // Right face
    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(p.x + w, p.base);
    ctx.lineTo(p.x, p.base + 1.5);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx + w - 1, tipY + 4);
    ctx.closePath();
    ctx.fill();

    // Terminating point (the hexagonal pyramid tip) — bright + dark facets
    ctx.fillStyle = "#caa0f0";
    ctx.beginPath();
    ctx.moveTo(tx - w + 1, tipY + 4);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx, tipY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6a2aa0";
    ctx.beginPath();
    ctx.moveTo(tx + w - 1, tipY + 4);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx, tipY + 5);
    ctx.closePath();
    ctx.fill();

    // Outline whole prism
    ctx.strokeStyle = "#2e0c52";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p.x - w, p.base);
    ctx.lineTo(tx - w + 1, tipY + 4);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx + w - 1, tipY + 4);
    ctx.lineTo(p.x + w, p.base);
    ctx.stroke();
    // Center ridge line
    ctx.strokeStyle = "rgba(46,12,82,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.base + 1.5);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx, tipY);
    ctx.stroke();

    // Highlight on left face
    ctx.strokeStyle = "rgba(240,220,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - w + 1.5, p.base - 1);
    ctx.lineTo(tx - w + 2, tipY + 5);
    ctx.stroke();
  });

  // Sparkles on tips
  sparkle(ctx, 0, -16, 3, 0.95);
  sparkle(ctx, -10, -1, 2, 0.7);
  sparkle(ctx, 10, 1, 1.8, 0.7);
}

function drawTopaz(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pear/teardrop cut — pointed top, round bottom.
  const body = ctx.createRadialGradient(-3, 4, 2, 0, 6, 22);
  body.addColorStop(0, "#ffe9a0");
  body.addColorStop(0.5, "#f0a428");
  body.addColorStop(1, "#9a5808");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.bezierCurveTo(8, -10, 14, 0, 14, 8);
  ctx.bezierCurveTo(14, 18, 6, 22, 0, 22);
  ctx.bezierCurveTo(-6, 22, -14, 18, -14, 8);
  ctx.bezierCurveTo(-14, 0, -8, -10, 0, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3204";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Table facet (inner teardrop, lit)
  const table = ctx.createLinearGradient(0, -12, 0, 14);
  table.addColorStop(0, "#fff4cc");
  table.addColorStop(1, "#f6b840");
  ctx.fillStyle = table;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(5, -5, 8, 2, 8, 7);
  ctx.bezierCurveTo(8, 13, 4, 16, 0, 16);
  ctx.bezierCurveTo(-4, 16, -8, 13, -8, 7);
  ctx.bezierCurveTo(-8, 2, -5, -5, 0, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(90,50,4,0.6)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Pear facets radiating from the tip / cutlet
  ctx.strokeStyle = "rgba(90,50,4,0.5)";
  ctx.lineWidth = 1;
  [[-14, 8], [-8, -2], [0, -18], [8, -2], [14, 8]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(0, 14);
    ctx.stroke();
  });

  // Bright facet on one side
  ctx.fillStyle = "rgba(255,244,200,0.5)";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-8, 7);
  ctx.lineTo(0, 14);
  ctx.closePath();
  ctx.fill();

  // Specular highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-4, -2, 2, 4.5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Sparkles
  sparkle(ctx, 5, 4, 2.8, 0.9);
  sparkle(ctx, -1, -14, 2, 0.75);
}

function drawOpal(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Milky cabochon dome — smooth rounded oval.
  const body = ctx.createRadialGradient(-5, -5, 2, 0, 2, 22);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.6, "#e8eef4");
  body.addColorStop(1, "#aab8c8");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6a7888";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Iridescent color flecks (clipped to the cabochon)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 16, 0, 0, Math.PI * 2);
  ctx.clip();

  const flecks: Array<[number, number, number, number, string]> = [
    // x, y, rx, ry, color
    [-6, -4, 5, 4, "rgba(80,180,255,0.55)"],
    [6, -2, 4.5, 5, "rgba(80,235,170,0.55)"],
    [-2, 8, 5, 4, "rgba(255,120,190,0.5)"],
    [9, 8, 3.5, 3.5, "rgba(255,210,90,0.5)"],
    [-10, 5, 3.5, 4, "rgba(150,120,255,0.5)"],
    [2, -9, 4, 3, "rgba(120,255,210,0.5)"],
    [8, -8, 3, 3, "rgba(255,150,120,0.45)"],
  ];
  flecks.forEach(([fx, fy, rx, ry, color]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(fx, fy, rx, ry, Math.PI * 0.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soft milky overlay to mute flecks (opalescent haze)
  const haze = ctx.createRadialGradient(-5, -5, 2, 0, 2, 20);
  haze.addColorStop(0, "rgba(255,255,255,0.45)");
  haze.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Specular highlight (glossy dome)
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-6, -6, 4, 2.5, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Sparkles
  sparkle(ctx, 8, -7, 2.6, 0.85);
  sparkle(ctx, -8, 8, 1.8, 0.65);
}

function drawGeode(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 19, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer rocky shell — irregular grey lump.
  const shell = ctx.createRadialGradient(-6, -6, 4, 0, 2, 24);
  shell.addColorStop(0, "#b0a89c");
  shell.addColorStop(0.6, "#7a7064");
  shell.addColorStop(1, "#403a32");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.moveTo(-16, -8);
  ctx.bezierCurveTo(-20, -2, -19, 12, -10, 18);
  ctx.bezierCurveTo(-2, 23, 8, 23, 15, 17);
  ctx.bezierCurveTo(21, 10, 20, -4, 14, -10);
  ctx.bezierCurveTo(8, -16, -10, -15, -16, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a2620";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rocky texture pits
  ctx.fillStyle = "rgba(40,36,30,0.5)";
  [[-13, -2, 1.6], [-11, 8, 1.2], [13, -2, 1.4], [11, 10, 1.3], [-7, 14, 1.1]].forEach(([px, py, pr]) => {
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  });

  // Hollow interior cavity (the split face). Clip to it for the crystal lining.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 2, 11, 12, 0, 0, Math.PI * 2);
  ctx.clip();

  // Cavity base gradient — purple to teal glow
  const cav = ctx.createRadialGradient(0, 2, 1, 0, 2, 13);
  cav.addColorStop(0, "#1a2a3a");
  cav.addColorStop(1, "#0a0e18");
  ctx.fillStyle = cav;
  ctx.fillRect(-13, -12, 26, 28);

  // Crystal lining — radial spikes pointing inward, purple/teal.
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ox = Math.cos(a) * 12;
    const oy = 2 + Math.sin(a) * 13;
    const len = 4 + ((i * 7) % 5);
    const ix = Math.cos(a) * (12 - len);
    const iy = 2 + Math.sin(a) * (13 - len);
    const wob = 1.6;
    const px = -Math.sin(a) * wob;
    const py = Math.cos(a) * wob;
    // alternate purple / teal
    const teal = i % 2 === 0;
    ctx.fillStyle = teal ? "#3ad0c0" : "#a868e0";
    ctx.beginPath();
    ctx.moveTo(ox + px, oy + py);
    ctx.lineTo(ix, iy);
    ctx.lineTo(ox - px, oy - py);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = teal ? "rgba(180,255,245,0.5)" : "rgba(230,200,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(ox + px, oy + py);
    ctx.lineTo(ix, iy);
    ctx.lineTo((ox + ix) / 2 + px * 0.3, (oy + iy) / 2 + py * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  // Inner druzy sparkle dots
  ctx.fillStyle = "rgba(220,235,255,0.8)";
  [[-3, -2], [4, 1], [-1, 6], [2, -5], [-5, 4]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Cavity rim outline
  ctx.strokeStyle = "#1a1610";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 2, 11, 12, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Shell highlight rim
  ctx.strokeStyle = "rgba(220,210,195,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-15, -7);
  ctx.bezierCurveTo(-12, -12, -2, -14, 6, -12);
  ctx.stroke();

  // Sparkles
  sparkle(ctx, 4, -3, 2.4, 0.9);
  sparkle(ctx, -4, 7, 1.6, 0.65);
}

function drawRawCrystal(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 17, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // A rough uncut quartz cluster — translucent pale, jagged prisms of differing heights.
  type Shard = { x: number; base: number; top: number; w: number; lean: number };
  const shards: Shard[] = [
    { x: -11, base: 21, top: 2, w: 5, lean: -0.3 },
    { x: 11, base: 21, top: -1, w: 5, lean: 0.3 },
    { x: -4, base: 22, top: -10, w: 4.5, lean: -0.08 },
    { x: 6, base: 22, top: -6, w: 4, lean: 0.12 },
    { x: 0, base: 22, top: -19, w: 6, lean: 0 },
  ];

  shards.forEach((s) => {
    const tx = s.x + s.lean * 22;
    const tipY = s.top;
    const w = s.w;

    // Pale translucent body — two faces.
    const left = ctx.createLinearGradient(s.x - w, 0, s.x, 0);
    left.addColorStop(0, "#dfeef2");
    left.addColorStop(1, "#fbffff");
    const right = ctx.createLinearGradient(s.x, 0, s.x + w, 0);
    right.addColorStop(0, "#f2f8fb");
    right.addColorStop(1, "#b8cdd6");

    // Left face
    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(s.x - w, s.base);
    ctx.lineTo(s.x, s.base + 1);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx - w + 1, tipY + 5);
    ctx.closePath();
    ctx.fill();

    // Right face
    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(s.x + w, s.base);
    ctx.lineTo(s.x, s.base + 1);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx + w - 1, tipY + 5);
    ctx.closePath();
    ctx.fill();

    // Terminating tip facets
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(tx - w + 1, tipY + 5);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx, tipY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c2d6de";
    ctx.beginPath();
    ctx.moveTo(tx + w - 1, tipY + 5);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx, tipY + 5);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = "#7a929c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - w, s.base);
    ctx.lineTo(tx - w + 1, tipY + 5);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx + w - 1, tipY + 5);
    ctx.lineTo(s.x + w, s.base);
    ctx.stroke();
    // Center ridge
    ctx.strokeStyle = "rgba(122,146,156,0.55)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(s.x, s.base + 1);
    ctx.lineTo(tx, tipY + 5);
    ctx.lineTo(tx, tipY);
    ctx.stroke();

    // Bright highlight streak
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - w + 1.5, s.base - 1);
    ctx.lineTo(tx - w + 2, tipY + 6);
    ctx.stroke();
  });

  // Sparkles
  sparkle(ctx, 0, -17, 3, 0.95);
  sparkle(ctx, -11, 2, 1.8, 0.7);
  sparkle(ctx, 9, -3, 1.6, 0.7);
}

export const ICONS = {
  gem_ruby:         { label:"Ruby",          color:"#d4143a", draw:drawRuby },
  gem_sapphire:     { label:"Sapphire",      color:"#1a48c8", draw:drawSapphire },
  gem_emerald:      { label:"Emerald",       color:"#0e9c52", draw:drawEmerald },
  gem_amethyst:     { label:"Amethyst",      color:"#8a3ac8", draw:drawAmethyst },
  gem_topaz:        { label:"Topaz",         color:"#f0a428", draw:drawTopaz },
  gem_opal:         { label:"Opal",          color:"#cfe0ea", draw:drawOpal },
  gem_geode:        { label:"Geode",         color:"#7a7064", draw:drawGeode },
  gem_raw_crystal:  { label:"Raw Crystal",   color:"#cfe0e6", draw:drawRawCrystal },
};
