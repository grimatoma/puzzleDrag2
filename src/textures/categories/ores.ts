// Mining ores, nuggets & raw minerals (rough rocky chunks with embedded veins/flecks).
// Distinct from the cut `gem_*` gemstones: these are irregular bumpy rocks.

// Shared helper: a small 4-point sparkle/specular star centered at (x, y).
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

// Shared helper: trace an irregular bumpy rock silhouette into the current path.
// `verts` is a list of [x, y] hull points; the path is closed with straight edges
// (sharp rocky facets). Caller fills/strokes/clips afterwards.
function rockPath(ctx: CanvasRenderingContext2D, verts: Array<[number, number]>) {
  ctx.beginPath();
  verts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

// Shared helper: scatter small facet polygons + speckle dots over a rock for
// rough mineral texture. Deterministic (seeded by index) so icons are stable.
function speckle(
  ctx: CanvasRenderingContext2D,
  count: number,
  spread: number,
  cy: number,
  color: string,
  maxR: number,
) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996; // golden-angle spiral
    const rad = spread * Math.sqrt((i + 0.5) / count);
    const x = Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad * 0.82;
    const r = maxR * (0.45 + ((i * 7) % 5) / 9);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function shadow(ctx: CanvasRenderingContext2D, rx: number) {
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, rx, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoal(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 17);

  // Lumpy black/charcoal chunk — sharp irregular silhouette.
  const hull: Array<[number, number]> = [
    [-15, -2], [-12, -11], [-3, -14], [6, -13], [14, -6],
    [16, 4], [11, 14], [1, 18], [-9, 16], [-16, 7],
  ];
  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#5a5862");
  body.addColorStop(0.5, "#2c2a32");
  body.addColorStop(1, "#0a090d");
  ctx.fillStyle = body;
  rockPath(ctx, hull);
  ctx.fill();
  ctx.strokeStyle = "#040305";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Glossy faceted planes — angular bright panels (anthracite sheen).
  ctx.save();
  rockPath(ctx, hull);
  ctx.clip();
  const facets: Array<[Array<[number, number]>, string]> = [
    [[[-12, -10], [-1, -13], [-3, -3], [-13, -1]], "rgba(120,120,135,0.55)"],
    [[[2, -12], [13, -6], [8, 2], [0, -2]], "rgba(80,80,95,0.5)"],
    [[[-10, 2], [-1, 0], [-4, 12], [-12, 7]], "rgba(60,60,72,0.5)"],
    [[[2, 2], [12, 4], [6, 14], [0, 9]], "rgba(95,95,110,0.45)"],
  ];
  facets.forEach(([poly, col]) => {
    ctx.fillStyle = col;
    rockPath(ctx, poly);
    ctx.fill();
  });
  // Facet edge cracks
  ctx.strokeStyle = "rgba(5,4,8,0.7)";
  ctx.lineWidth = 1;
  [[[-3, -13], [-3, -3], [-4, 12]], [[13, -6], [0, -2], [6, 14]]].forEach((line) => {
    ctx.beginPath();
    line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.restore();

  // Bright specular glints on top facets
  sparkle(ctx, -6, -9, 2.6, 0.85);
  sparkle(ctx, 7, -4, 2, 0.6);
  sparkle(ctx, -2, 7, 1.5, 0.5);
}

function drawIron(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 17);

  // Grey host rock — bumpy chunk.
  const hull: Array<[number, number]> = [
    [-16, 0], [-13, -10], [-4, -14], [5, -13], [13, -8],
    [16, 2], [12, 12], [3, 18], [-7, 16], [-15, 9],
  ];
  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#9a948c");
  body.addColorStop(0.55, "#6a655e");
  body.addColorStop(1, "#383430");
  ctx.fillStyle = body;
  rockPath(ctx, hull);
  ctx.fill();
  ctx.strokeStyle = "#241f1b";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, hull);
  ctx.clip();

  // Stony facet shading
  ctx.fillStyle = "rgba(40,36,32,0.32)";
  rockPath(ctx, [[2, -6], [14, 0], [8, 12], [0, 6]]);
  ctx.fill();

  // Rusty reddish-brown iron-ore veins (haematite bands).
  const veins: Array<[Array<[number, number]>, number]> = [
    [[[-13, -4], [-6, -1], [2, -4], [11, -1]], 3.4],
    [[[-10, 8], [-2, 5], [6, 9], [13, 6]], 2.8],
    [[[-8, -10], [-2, -7], [4, -11]], 2.2],
  ];
  veins.forEach(([pts, lw]) => {
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, "#8a3a1c");
    g.addColorStop(0.5, "#c4582a");
    g.addColorStop(1, "#7a3018");
    ctx.strokeStyle = g;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // Rusty specks + dark stone pits
  speckle(ctx, 11, 13, 2, "rgba(160,70,36,0.85)", 1.5);
  speckle(ctx, 9, 12, 2, "rgba(36,30,26,0.5)", 1.2);
  ctx.restore();

  // Metallic specular dots on veins
  ctx.fillStyle = "rgba(255,210,170,0.8)";
  [[-3, -3, 1], [6, 7, 0.9], [-7, -9, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Rock rim highlight
  ctx.strokeStyle = "rgba(220,212,200,0.45)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -3);
  ctx.bezierCurveTo(-10, -11, 0, -14, 6, -12);
  ctx.stroke();
}

function drawCopper(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 17);

  // Grey host rock.
  const hull: Array<[number, number]> = [
    [-16, 2], [-12, -9], [-3, -14], [7, -12], [15, -5],
    [16, 6], [9, 15], [-1, 18], [-10, 14], [-16, 8],
  ];
  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#969088");
  body.addColorStop(0.55, "#666058");
  body.addColorStop(1, "#34302b");
  ctx.fillStyle = body;
  rockPath(ctx, hull);
  ctx.fill();
  ctx.strokeStyle = "#221e1a";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, hull);
  ctx.clip();

  ctx.fillStyle = "rgba(38,34,30,0.3)";
  rockPath(ctx, [[3, -4], [14, 2], [6, 13], [-1, 7]]);
  ctx.fill();

  // Bright orange-copper metallic veins.
  const veins: Array<[Array<[number, number]>, number]> = [
    [[[-13, -2], [-5, 1], [4, -3], [13, 1]], 3.6],
    [[[-9, 9], [0, 6], [9, 10]], 2.8],
    [[[-6, -10], [1, -6], [9, -9]], 2.4],
  ];
  veins.forEach(([pts, lw]) => {
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, "#a8521c");
    g.addColorStop(0.5, "#ff8a3a");
    g.addColorStop(1, "#c0541a");
    ctx.strokeStyle = g;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // Green patina (verdigris) flecks.
  ctx.fillStyle = "rgba(48,176,140,0.85)";
  [[-8, 4, 2.2], [10, 5, 1.8], [-2, -7, 1.6], [6, 11, 1.7], [-11, -3, 1.4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Coppery + dark specks
  speckle(ctx, 9, 12, 2, "rgba(210,120,50,0.8)", 1.3);
  speckle(ctx, 7, 11, 2, "rgba(34,28,24,0.5)", 1.1);
  ctx.restore();

  // Metallic specular dots
  ctx.fillStyle = "rgba(255,225,180,0.85)";
  [[-2, -1, 1.1], [8, 8, 0.9], [3, -7, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = "rgba(218,210,198,0.45)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -1);
  ctx.bezierCurveTo(-9, -10, 1, -13, 8, -11);
  ctx.stroke();
}

function drawGoldNugget(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);

  // Chunky bumpy gold nugget — lobed irregular blob (no straight stone facets).
  const body = ctx.createRadialGradient(-5, -6, 3, 2, 6, 26);
  body.addColorStop(0, "#fff4b0");
  body.addColorStop(0.45, "#f5c128");
  body.addColorStop(0.8, "#c88810");
  body.addColorStop(1, "#7a4c04");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.bezierCurveTo(-16, -9, -8, -14, -2, -12);
  ctx.bezierCurveTo(2, -16, 11, -13, 12, -6);
  ctx.bezierCurveTo(18, -4, 17, 6, 12, 9);
  ctx.bezierCurveTo(14, 16, 4, 19, -1, 16);
  ctx.bezierCurveTo(-6, 20, -15, 15, -13, 8);
  ctx.bezierCurveTo(-18, 4, -17, -1, -13, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3604";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.bezierCurveTo(-16, -9, -8, -14, -2, -12);
  ctx.bezierCurveTo(2, -16, 11, -13, 12, -6);
  ctx.bezierCurveTo(18, -4, 17, 6, 12, 9);
  ctx.bezierCurveTo(14, 16, 4, 19, -1, 16);
  ctx.bezierCurveTo(-6, 20, -15, 15, -13, 8);
  ctx.bezierCurveTo(-18, 4, -17, -1, -13, -2);
  ctx.closePath();
  ctx.clip();

  // Bumpy lustrous surface — bright raised bumps and dark crevice shadows.
  const bumps: Array<[number, number, number]> = [
    [-7, -6, 4.5], [4, -7, 4], [9, 0, 3.6], [-9, 4, 3.6],
    [0, 3, 4.2], [6, 8, 3.2], [-3, 10, 3],
  ];
  bumps.forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
    g.addColorStop(0, "rgba(255,248,190,0.9)");
    g.addColorStop(0.6, "rgba(245,193,40,0)");
    g.addColorStop(1, "rgba(120,72,4,0.35)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Crevice shadows between bumps
  ctx.strokeStyle = "rgba(110,66,4,0.45)";
  ctx.lineWidth = 1.2;
  [[[-3, -10], [-1, -2], [-5, 6]], [[8, -5], [4, 2], [7, 9]]].forEach((line) => {
    ctx.beginPath();
    line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.restore();

  // Bright specular glints
  sparkle(ctx, -6, -7, 3, 0.95);
  sparkle(ctx, 8, 1, 2.2, 0.75);
  sparkle(ctx, -1, 9, 1.6, 0.6);
}

function drawSilver(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 17);

  // Grey host rock.
  const hull: Array<[number, number]> = [
    [-16, 1], [-12, -10], [-2, -14], [6, -13], [15, -6],
    [16, 5], [10, 14], [0, 18], [-9, 15], [-16, 8],
  ];
  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#9c9aa0");
  body.addColorStop(0.55, "#6b696f");
  body.addColorStop(1, "#37363b");
  ctx.fillStyle = body;
  rockPath(ctx, hull);
  ctx.fill();
  ctx.strokeStyle = "#211f24";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, hull);
  ctx.clip();

  ctx.fillStyle = "rgba(34,32,38,0.32)";
  rockPath(ctx, [[2, -5], [14, 1], [7, 13], [-1, 6]]);
  ctx.fill();

  // Bright silvery-white metallic streaks.
  const streaks: Array<[Array<[number, number]>, number]> = [
    [[[-13, -3], [-4, 0], [5, -4], [13, 0]], 3.6],
    [[[-10, 8], [-1, 5], [8, 9]], 2.8],
    [[[-5, -11], [2, -7], [10, -10]], 2.4],
  ];
  streaks.forEach(([pts, lw]) => {
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, "#b6b8c0");
    g.addColorStop(0.5, "#ffffff");
    g.addColorStop(1, "#9a9ca6");
    ctx.strokeStyle = g;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // Silver glints + dark stone pits
  speckle(ctx, 9, 12, 2, "rgba(235,238,245,0.85)", 1.3);
  speckle(ctx, 8, 11, 2, "rgba(32,30,36,0.5)", 1.1);
  ctx.restore();

  // Crisp specular dots on streaks
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  [[-3, -2, 1.2], [7, 7, 0.9], [4, -8, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = "rgba(224,222,230,0.5)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.bezierCurveTo(-9, -11, 1, -14, 7, -12);
  ctx.stroke();
}

function drawObsidian(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 15);

  // Glossy black volcanic-glass shard — sharp angular facets, tall pointed form.
  const hull: Array<[number, number]> = [
    [-4, -20], [6, -12], [13, 2], [9, 14], [-2, 19],
    [-12, 11], [-15, -2], [-9, -12],
  ];
  const body = ctx.createLinearGradient(-12, -16, 12, 16);
  body.addColorStop(0, "#3a3450");
  body.addColorStop(0.45, "#15121f");
  body.addColorStop(1, "#020103");
  ctx.fillStyle = body;
  rockPath(ctx, hull);
  ctx.fill();
  ctx.strokeStyle = "#010002";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  rockPath(ctx, hull);
  ctx.clip();

  // Sharp glassy facet planes with purple sheen.
  const facets: Array<[Array<[number, number]>, string]> = [
    [[[-4, -20], [6, -12], [-1, -2], [-9, -12]], "rgba(120,90,180,0.42)"],
    [[[6, -12], [13, 2], [4, 6], [-1, -2]], "rgba(60,46,96,0.5)"],
    [[[-9, -12], [-1, -2], [-7, 6], [-15, -2]], "rgba(90,70,140,0.32)"],
    [[[4, 6], [9, 14], [-2, 19], [-7, 6], [-1, -2]], "rgba(20,16,30,0.5)"],
  ];
  facets.forEach(([poly, col]) => {
    ctx.fillStyle = col;
    rockPath(ctx, poly);
    ctx.fill();
  });
  // Facet edges
  ctx.strokeStyle = "rgba(150,120,210,0.4)";
  ctx.lineWidth = 1;
  [[[-1, -2], [4, 6]], [[-1, -2], [-7, 6]], [[-1, -2], [-9, -12]]].forEach((line) => {
    ctx.beginPath();
    line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.restore();

  // Long glossy specular streak (light running down the glass)
  ctx.strokeStyle = "rgba(200,180,255,0.55)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-2, -16);
  ctx.bezierCurveTo(-6, -6, -4, 6, -3, 15);
  ctx.stroke();

  sparkle(ctx, 4, -8, 2.6, 0.85);
  sparkle(ctx, -7, 2, 1.8, 0.6);
}

function drawSulfur(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);

  // Dark rocky base (matrix the crystals grow from).
  const base = ctx.createLinearGradient(0, 8, 0, 22);
  base.addColorStop(0, "#5a544a");
  base.addColorStop(1, "#2e2a22");
  ctx.fillStyle = base;
  rockPath(ctx, [[-15, 8], [-9, 4], [2, 6], [12, 3], [16, 9], [13, 18], [-2, 20], [-14, 17]]);
  ctx.fill();
  ctx.strokeStyle = "#1c1812";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Base speckle
  ctx.save();
  rockPath(ctx, [[-15, 8], [-9, 4], [2, 6], [12, 3], [16, 9], [13, 18], [-2, 20], [-14, 17]]);
  ctx.clip();
  speckle(ctx, 8, 13, 13, "rgba(20,16,10,0.5)", 1.2);
  ctx.restore();

  // Bright yellow crystalline sulfur cluster — chunky angular crystals.
  type Crystal = { x: number; base: number; top: number; w: number };
  const crystals: Crystal[] = [
    { x: -9, base: 9, top: -3, w: 4.5 },
    { x: 9, base: 8, top: -5, w: 4.5 },
    { x: -1, base: 11, top: -7, w: 4 },
    { x: 4, base: 10, top: -13, w: 5 },
    { x: -5, base: 10, top: -16, w: 5.5 },
  ];
  crystals.forEach((c) => {
    const w = c.w;
    // Left lit face
    const left = ctx.createLinearGradient(c.x - w, c.base, c.x, c.top);
    left.addColorStop(0, "#e8c020");
    left.addColorStop(1, "#fff09a");
    // Right shaded face
    const right = ctx.createLinearGradient(c.x, c.top, c.x + w, c.base);
    right.addColorStop(0, "#f0d040");
    right.addColorStop(1, "#b88a0c");

    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(c.x - w, c.base);
    ctx.lineTo(c.x, c.base + 1);
    ctx.lineTo(c.x, c.top + 4);
    ctx.lineTo(c.x - w + 1, c.top + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(c.x + w, c.base);
    ctx.lineTo(c.x, c.base + 1);
    ctx.lineTo(c.x, c.top + 4);
    ctx.lineTo(c.x + w - 1, c.top + 5);
    ctx.closePath();
    ctx.fill();

    // Tip facets
    ctx.fillStyle = "#fff4b0";
    ctx.beginPath();
    ctx.moveTo(c.x - w + 1, c.top + 5);
    ctx.lineTo(c.x, c.top);
    ctx.lineTo(c.x, c.top + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d6a814";
    ctx.beginPath();
    ctx.moveTo(c.x + w - 1, c.top + 5);
    ctx.lineTo(c.x, c.top);
    ctx.lineTo(c.x, c.top + 4);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = "#7a5604";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x - w, c.base);
    ctx.lineTo(c.x - w + 1, c.top + 5);
    ctx.lineTo(c.x, c.top);
    ctx.lineTo(c.x + w - 1, c.top + 5);
    ctx.lineTo(c.x + w, c.base);
    ctx.stroke();
    // Center ridge
    ctx.strokeStyle = "rgba(122,86,4,0.6)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(c.x, c.base + 1);
    ctx.lineTo(c.x, c.top);
    ctx.stroke();
  });

  sparkle(ctx, -5, -14, 2.8, 0.9);
  sparkle(ctx, 5, -11, 2, 0.7);
  sparkle(ctx, 9, -3, 1.6, 0.6);
}

function drawCrystalVein(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 17);

  // Grey rock split open to reveal a glowing crystal vein inside.
  const hull: Array<[number, number]> = [
    [-16, 0], [-12, -11], [-2, -14], [7, -13], [15, -7],
    [16, 4], [11, 14], [1, 18], [-8, 15], [-16, 8],
  ];
  const body = ctx.createRadialGradient(-5, -6, 3, 0, 4, 26);
  body.addColorStop(0, "#928c84");
  body.addColorStop(0.55, "#625d56");
  body.addColorStop(1, "#322e29");
  ctx.fillStyle = body;
  rockPath(ctx, hull);
  ctx.fill();
  ctx.strokeStyle = "#201c18";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Stony speckle on the rock
  ctx.save();
  rockPath(ctx, hull);
  ctx.clip();
  speckle(ctx, 10, 13, 2, "rgba(30,26,22,0.5)", 1.2);
  speckle(ctx, 6, 11, 1, "rgba(180,172,162,0.4)", 1);
  ctx.restore();

  // The split cavity revealing crystals — irregular slot down the middle.
  const cavity: Array<[number, number]> = [
    [-3, -12], [3, -10], [6, -3], [4, 6], [6, 13],
    [-1, 16], [-5, 9], [-7, 1], [-5, -6],
  ];
  ctx.save();
  rockPath(ctx, cavity);
  ctx.clip();

  // Dark glowing interior
  const cav = ctx.createRadialGradient(0, 2, 1, 0, 2, 16);
  cav.addColorStop(0, "#0e3a40");
  cav.addColorStop(1, "#06141a");
  ctx.fillStyle = cav;
  ctx.fillRect(-9, -14, 18, 32);

  // Pale-cyan crystal cluster pointing up out of the slot.
  const shards: Array<[number, number, number, number]> = [
    // x, base, top, w
    [-4, 14, 1, 3],
    [4, 14, -1, 3],
    [-1, 15, -7, 3.6],
    [2, 14, -4, 2.8],
    [0, 15, -11, 4],
  ];
  shards.forEach(([x, base, top, w]) => {
    const left = ctx.createLinearGradient(x - w, base, x, top);
    left.addColorStop(0, "#7fe8e0");
    left.addColorStop(1, "#e6ffff");
    const right = ctx.createLinearGradient(x, top, x + w, base);
    right.addColorStop(0, "#9af0ea");
    right.addColorStop(1, "#3aa8b0");

    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(x - w, base);
    ctx.lineTo(x, base + 1);
    ctx.lineTo(x, top + 4);
    ctx.lineTo(x - w + 1, top + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(x + w, base);
    ctx.lineTo(x, base + 1);
    ctx.lineTo(x, top + 4);
    ctx.lineTo(x + w - 1, top + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f4ffff";
    ctx.beginPath();
    ctx.moveTo(x - w + 1, top + 5);
    ctx.lineTo(x, top);
    ctx.lineTo(x, top + 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(20,90,98,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w, base);
    ctx.lineTo(x - w + 1, top + 5);
    ctx.lineTo(x, top);
    ctx.lineTo(x + w - 1, top + 5);
    ctx.lineTo(x + w, base);
    ctx.stroke();
  });

  // Inner glow haze
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
  glow.addColorStop(0, "rgba(170,255,250,0.45)");
  glow.addColorStop(1, "rgba(170,255,250,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-9, -14, 18, 32);
  ctx.restore();

  // Cavity rim (dark crack outline)
  ctx.strokeStyle = "#141008";
  ctx.lineWidth = 1.6;
  rockPath(ctx, cavity);
  ctx.stroke();

  // Rock rim highlight
  ctx.strokeStyle = "rgba(214,206,196,0.45)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, -3);
  ctx.bezierCurveTo(-10, -11, -3, -14, 4, -13);
  ctx.stroke();

  // Crystal sparkles
  sparkle(ctx, 0, -9, 2.8, 0.95);
  sparkle(ctx, -3, 0, 1.8, 0.7);
  sparkle(ctx, 3, 5, 1.5, 0.6);
}

export const ICONS = {
  ore_coal:         { label:"Coal",          color:"#2c2a32", draw:drawCoal },
  ore_iron:         { label:"Iron Ore",      color:"#c4582a", draw:drawIron },
  ore_copper:       { label:"Copper Ore",    color:"#ff8a3a", draw:drawCopper },
  ore_gold_nugget:  { label:"Gold Nugget",   color:"#f5c128", draw:drawGoldNugget },
  ore_silver:       { label:"Silver Ore",    color:"#c8c8d0", draw:drawSilver },
  ore_obsidian:     { label:"Obsidian",      color:"#15121f", draw:drawObsidian },
  ore_sulfur:       { label:"Sulfur",        color:"#e8c020", draw:drawSulfur },
  ore_crystal_vein: { label:"Crystal Vein",  color:"#7fe8e0", draw:drawCrystalVein },
};
