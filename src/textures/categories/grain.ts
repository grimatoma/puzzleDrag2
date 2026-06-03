// Grain family.

function drawCorn(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(2, 23, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Husk leaves (left + right, behind)
  ctx.fillStyle = "#7ca832";
  ctx.strokeStyle = "#3a5a14";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-2, 22);
  ctx.bezierCurveTo(-18, 16, -20, -2, -10, -22);
  ctx.bezierCurveTo(-6, -10, -4, 6, -2, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, 22);
  ctx.bezierCurveTo(20, 18, 22, 0, 12, -20);
  ctx.bezierCurveTo(8, -8, 6, 8, 4, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Husk highlights
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, -16);
  ctx.bezierCurveTo(-5, -2, -3, 12, -2, 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9, -14);
  ctx.bezierCurveTo(7, -2, 5, 12, 4, 20);
  ctx.stroke();
  // Cob body — yellow with kernel grid
  const cob = ctx.createLinearGradient(0, -22, 0, 18);
  cob.addColorStop(0, "#fff19a");
  cob.addColorStop(0.5, "#f4c84a");
  cob.addColorStop(1, "#a06c10");
  ctx.fillStyle = cob;
  ctx.beginPath();
  ctx.moveTo(-7, 18);
  ctx.bezierCurveTo(-9, -8, -6, -22, 0, -22);
  ctx.bezierCurveTo(6, -22, 9, -8, 7, 18);
  ctx.bezierCurveTo(4, 22, -4, 22, -7, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5e3a08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Kernels (clipped grid)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-7, 18);
  ctx.bezierCurveTo(-9, -8, -6, -22, 0, -22);
  ctx.bezierCurveTo(6, -22, 9, -8, 7, 18);
  ctx.bezierCurveTo(4, 22, -4, 22, -7, 18);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(110,68,12,0.65)";
  ctx.lineWidth = 0.8;
  for (let y = -20; y < 20; y += 4) {
    const offset = (Math.floor((y + 20) / 4) % 2) * 2;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(10, y);
    ctx.stroke();
    for (let x = -8 + offset; x < 9; x += 4) {
      ctx.beginPath();
      ctx.arc(x, y + 2, 1.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Specular
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-3, -10, 1.6, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBuckwheat(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stalk
  ctx.strokeStyle = "#3a5a18";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -10);
  ctx.stroke();
  ctx.strokeStyle = "#7cb04a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -10);
  ctx.stroke();
  // Triangular leaves
  ctx.fillStyle = "#5a8a26";
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1.4;
  [[-1, 12, -14, 6], [1, 4, 14, -2]].forEach(([sx, sy, tx, ty]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.lineTo(sx + (tx > 0 ? 2 : -2), sy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  // White flower clusters at top — small 5-petal florets, tightly grouped.
  const florets = [[-5, -15], [0, -20], [5, -15], [-2, -11], [3, -11], [0, -16]];
  florets.forEach(([fx, fy]) => {
    // soft petal ring
    [0, 1, 2, 3, 4].forEach((i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = fx + Math.cos(a) * 1.7;
      const py = fy + Math.sin(a) * 1.7;
      const pg = ctx.createRadialGradient(px - 0.5, py - 0.5, 0.2, px, py, 1.5);
      pg.addColorStop(0, "#ffffff");
      pg.addColorStop(1, "#e8dcc0");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fill();
    });
    // Center seed (small warm dot = buckwheat floret heart)
    ctx.fillStyle = "#a07838";
    ctx.beginPath();
    ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawManna(ctx: CanvasRenderingContext2D) {
  // Soft white pillowy clusters with a gentle golden glow.
  // Glow halo (fades out well before the box edge)
  const glow = ctx.createRadialGradient(0, -2, 4, 0, -2, 24);
  glow.addColorStop(0, "rgba(255,240,180,0.55)");
  glow.addColorStop(1, "rgba(255,240,180,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, 24, 0, Math.PI * 2);
  ctx.fill();
  // Shadow
  ctx.fillStyle = "rgba(120,90,30,0.22)";
  ctx.beginPath();
  ctx.ellipse(1, 22, 17, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pillowy clustered mound — one unified soft blob made of rounded bumps.
  const bumps = [
    { x: -10, y: 6, r: 10 },
    { x: 10, y: 7, r: 9.5 },
    { x: -2, y: -9, r: 11 },
    { x: 7, y: -3, r: 8 },
    { x: -7, y: -2, r: 7 },
  ];
  // Base fill: draw all bumps with a shared soft gradient so they merge.
  bumps.forEach((b) => {
    const grad = ctx.createRadialGradient(b.x - b.r * 0.45, b.y - b.r * 0.5, 1, b.x, b.y, b.r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.55, "#f7ead0");
    grad.addColorStop(1, "#d8bd8a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Single soft contour tracing only the outer arc of each rim bump so the
  // cluster reads as one mound (not three full rings).
  ctx.strokeStyle = "#a98a44";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(bumps[2].x, bumps[2].y, bumps[2].r - 0.3, Math.PI * 1.05, Math.PI * 2.05); // top, outer
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bumps[0].x, bumps[0].y, bumps[0].r - 0.3, Math.PI * 0.35, Math.PI * 1.4); // lower-left, outer
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bumps[1].x, bumps[1].y, bumps[1].r - 0.3, Math.PI * -0.45, Math.PI * 0.65); // lower-right, outer
  ctx.stroke();
  // Soft dimples where bumps meet (interior detail, restrained).
  ctx.strokeStyle = "rgba(168,138,68,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 2, 5, -0.7, 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(2, -6, 4.5, 2.2, 3.6);
  ctx.stroke();
  // Two contained sparkle accents, upper-left bias.
  ctx.fillStyle = "rgba(255,251,224,0.95)";
  [[-9, -10, 1.7], [4, -1, 1.3]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
  // Soft specular highlight upper-left.
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-5, -11, 4, 2.4, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawRice(ctx: CanvasRenderingContext2D) {
  // Water at base
  ctx.fillStyle = "#5a8aae";
  ctx.beginPath();
  ctx.ellipse(0, 22, 24, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a607a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 22, 24, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Water ripples
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.quadraticCurveTo(-6, 20, 0, 22);
  ctx.quadraticCurveTo(6, 24, 12, 22);
  ctx.stroke();
  // Tall thin rice stalks
  ctx.strokeStyle = "#3a5a14";
  ctx.lineWidth = 2.4;
  [-12, -4, 4, 12].forEach((x, i) => {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.bezierCurveTo(x - 1, 4, x - 3 + i, -10, x - 6 + i, -22);
    ctx.stroke();
  });
  ctx.strokeStyle = "#88b840";
  ctx.lineWidth = 1.2;
  [-12, -4, 4, 12].forEach((x, i) => {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.bezierCurveTo(x - 1, 4, x - 3 + i, -10, x - 6 + i, -22);
    ctx.stroke();
  });
  // Drooping rice grain heads — two tidy clusters of plump golden grains.
  const grains: Array<[number, number, number]> = [
    // left head, drooping down-left
    [-13, -16, -0.9], [-11, -20, -0.7], [-8, -17, -0.5],
    [-9, -22, -0.6], [-6, -19, -0.35],
    // right head, drooping down-right
    [11, -16, 0.9], [9, -20, 0.65], [6, -17, 0.45],
    [7, -22, 0.55], [4, -19, 0.3],
  ];
  grains.forEach(([gx, gy, ga]) => {
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(ga);
    // grain body with a tiny gradient for plumpness
    const gg = ctx.createLinearGradient(-1.4, 0, 1.4, 0);
    gg.addColorStop(0, "#fbf3cc");
    gg.addColorStop(1, "#d9bd5e");
    ctx.fillStyle = gg;
    ctx.strokeStyle = "#9c8020";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.8, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

export const ICONS = {
  tile_grain_corn:      { label:"Corn",      color:"#f4c84a", draw:drawCorn },
  tile_grain_buckwheat: { label:"Buckwheat", color:"#9ab548", draw:drawBuckwheat },
  tile_grain_manna:     { label:"Manna",     color:"#f8e8c0", draw:drawManna },
  tile_grain_rice:      { label:"Rice",      color:"#c8d878", draw:drawRice },
};
