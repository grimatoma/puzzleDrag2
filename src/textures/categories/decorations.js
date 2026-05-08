// Decoration buildings — repeatable village ornaments.

function drawShadow(ctx, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawVioletBed(ctx) {
  drawShadow(ctx, 22, 4);
  // Wooden bed border
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.moveTo(-22, 12);
  ctx.bezierCurveTo(-22, 22, 22, 22, 22, 12);
  ctx.lineTo(20, 8);
  ctx.lineTo(-20, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Plank stripes
  ctx.strokeStyle = "rgba(58,28,8,0.5)";
  ctx.lineWidth = 0.8;
  for (let i = -16; i <= 16; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 8); ctx.lineTo(i, 18);
    ctx.stroke();
  }
  // Soil
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Stems
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  [-12, -6, 0, 6, 12, -9, 9, -3, 3].forEach((x, i) => {
    const top = -10 - (i % 3) * 4;
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.bezierCurveTo(x + 2, top + 6, x - 2, top + 2, x, top);
    ctx.stroke();
  });
  // Leaves
  ctx.fillStyle = "#5a8028";
  [[-9, -4], [6, -4], [-3, -10], [9, -10]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 1.4, x < 0 ? -0.4 : 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Violet flowers — five-petal, deep purple with yellow center
  const flowers = [[-12, -16], [-6, -20], [0, -16], [6, -20], [12, -16], [-9, -12], [9, -12], [-3, -22], [3, -22]];
  flowers.forEach(([cx, cy]) => {
    ctx.fillStyle = "#7a3aa8";
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 1.8, cy + Math.sin(a) * 1.8, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#a058c0";
    ctx.beginPath();
    ctx.arc(cx, cy, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff080";
    ctx.beginPath();
    ctx.arc(cx, cy, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawStoneLantern(ctx) {
  drawShadow(ctx, 18, 4);
  // Base
  ctx.fillStyle = "#7a8490";
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.lineTo(-12, 14);
  ctx.lineTo(12, 14);
  ctx.lineTo(14, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4348";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Pillar
  ctx.fillStyle = "#9da3a8";
  ctx.beginPath();
  ctx.rect(-4, 0, 8, 14);
  ctx.fill();
  ctx.strokeStyle = "#3a4348";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(58,67,72,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-4, 4); ctx.lineTo(4, 4);
  ctx.moveTo(-4, 8); ctx.lineTo(4, 8);
  ctx.stroke();
  // Lantern body (cube with windows)
  ctx.fillStyle = "#bbc1c6";
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(-8, -2);
  ctx.lineTo(8, -2);
  ctx.lineTo(10, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4348";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Glowing window
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.rect(-5, -7, 10, 5);
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Window cross-bar
  ctx.strokeStyle = "#5a3a08";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(0, -2);
  ctx.moveTo(-5, -4.5); ctx.lineTo(5, -4.5);
  ctx.stroke();
  // Halo
  ctx.fillStyle = "rgba(255,200,80,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, -4, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Roof (tiered Asian-style)
  ctx.fillStyle = "#5a4a3a";
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(-12, -14);
  ctx.lineTo(12, -14);
  ctx.lineTo(14, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Roof second tier
  ctx.fillStyle = "#7a8490";
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-6, -22);
  ctx.lineTo(6, -22);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4348";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Top spike
  ctx.fillStyle = "#5a4a3a";
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.lineTo(0, -28);
  ctx.lineTo(2, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Moss patches
  ctx.fillStyle = "#5a8028";
  ctx.beginPath();
  ctx.ellipse(-12, 18, 2, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -10, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawAppleSapling(ctx) {
  drawShadow(ctx, 18, 4);
  // Pot
  ctx.fillStyle = "#a85838";
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.lineTo(-10, 8);
  ctx.lineTo(10, 8);
  ctx.lineTo(12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Pot rim
  ctx.fillStyle = "#7a3014";
  ctx.beginPath();
  ctx.rect(-12, 6, 24, 4);
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Soil
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(0, 7, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Trunk
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(2, -2, -2, -10, 0, -16);
  ctx.stroke();
  // Branches
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.bezierCurveTo(-4, -8, -8, -10, -10, -16);
  ctx.moveTo(0, -8); ctx.bezierCurveTo(4, -8, 8, -10, 10, -16);
  ctx.stroke();
  // Foliage
  ctx.fillStyle = "#3a6018";
  [[-8, -16, 6], [8, -16, 6], [0, -22, 8], [-4, -14, 4], [4, -14, 4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = "#1a2a04";
  ctx.lineWidth = 0.8;
  [[-8, -16, 6], [8, -16, 6], [0, -22, 8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Foliage highlight
  ctx.fillStyle = "rgba(120,180,80,0.6)";
  [[0, -24, 3], [-6, -18, 2.4], [6, -18, 2.4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Apples (3)
  ctx.fillStyle = "#d4543a";
  [[-6, -14], [4, -22], [8, -14]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a1808";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,200,160,0.7)";
    ctx.beginPath();
    ctx.arc(x - 0.4, y - 0.4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4543a";
  });
  // Pot crack hint
  ctx.strokeStyle = "rgba(40,16,4,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-6, 12); ctx.lineTo(-4, 18);
  ctx.stroke();
}

export const ICONS = {
  decor_violet_bed:    { label:"Violet Bed",    color:"#7a3aa8", draw:drawVioletBed },
  decor_stone_lantern: { label:"Stone Lantern", color:"#7a8490", draw:drawStoneLantern },
  decor_apple_sapling: { label:"Apple Sapling", color:"#3a6018", draw:drawAppleSapling },
};
