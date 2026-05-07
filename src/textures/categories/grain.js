// Grain family.

function drawCorn(ctx) {
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

function drawBuckwheat(ctx) {
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
  // White flower clusters at top — small 5-petal florets
  const florets = [[-6, -16], [0, -22], [6, -16], [-3, -10], [4, -10], [0, -14]];
  florets.forEach(([fx, fy]) => {
    ctx.fillStyle = "#fffaf0";
    [0, 1, 2, 3, 4].forEach((i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(a) * 1.6, fy + Math.sin(a) * 1.6, 1.3, 0, Math.PI * 2);
      ctx.fill();
    });
    // Center seed (dark triangle = buckwheat seed)
    ctx.fillStyle = "#5a3a14";
    ctx.beginPath();
    ctx.moveTo(fx - 1.2, fy + 0.8);
    ctx.lineTo(fx + 1.2, fy + 0.8);
    ctx.lineTo(fx, fy - 1.2);
    ctx.closePath();
    ctx.fill();
  });
}

function drawManna(ctx) {
  // Soft white pillowy clusters with golden glow
  // Glow halo
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
  glow.addColorStop(0, "rgba(255,240,180,0.6)");
  glow.addColorStop(1, "rgba(255,240,180,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  // Shadow
  ctx.fillStyle = "rgba(120,90,30,0.25)";
  ctx.beginPath();
  ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Three fluffy lobes
  const lobes = [
    { x: -8, y: 4, r: 12 },
    { x: 8, y: 6, r: 11 },
    { x: 0, y: -8, r: 13 },
  ];
  lobes.forEach((l) => {
    const grad = ctx.createRadialGradient(l.x - l.r * 0.4, l.y - l.r * 0.4, 1, l.x, l.y, l.r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.6, "#f8eccd");
    grad.addColorStop(1, "#c8a868");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a5a18";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });
  // Sparkle accents
  ctx.fillStyle = "#fffbe0";
  [[-12, -10, 1.8], [10, -4, 1.6], [-2, 14, 1.4], [14, 10, 1.2]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
  // Tiny gold flecks
  ctx.fillStyle = "#f4c84a";
  [[-5, -4], [4, -2], [-3, 8], [6, 10]].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.arc(fx, fy, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRice(ctx) {
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
  // Drooping rice grains in clusters at top
  ctx.fillStyle = "#f4ecc0";
  ctx.strokeStyle = "#a08820";
  ctx.lineWidth = 0.9;
  const grains = [
    [-14, -22, -0.6], [-10, -18, -0.4], [-6, -14, -0.2],
    [-8, -22, -0.5], [-4, -18, -0.3],
    [2, -22, 0.3], [6, -18, 0.4], [10, -14, 0.5],
    [4, -22, 0.4], [0, -18, 0.1],
    [-2, -16, 0],
  ];
  grains.forEach(([gx, gy, ga]) => {
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(ga);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

export const ICONS = {
  grain_corn:      { label:"Corn",      color:"#f4c84a", draw:drawCorn },
  grain_buckwheat: { label:"Buckwheat", color:"#9ab548", draw:drawBuckwheat },
  grain_manna:     { label:"Manna",     color:"#f8e8c0", draw:drawManna },
  grain_rice:      { label:"Rice",      color:"#c8d878", draw:drawRice },
};
