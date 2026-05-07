// Trees.

function trunk(ctx, w, topY, botY, light, dark, outline) {
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, dark); g.addColorStop(0.5, light); g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w, botY);
  ctx.bezierCurveTo(-w*1.3, botY*0.6, -w*0.7, topY+4, -w*0.6, topY);
  ctx.lineTo(w*0.6, topY);
  ctx.bezierCurveTo(w*0.7, topY+4, w*1.3, botY*0.6, w, botY);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0; ctx.stroke();
}

function drawOak(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 24, 22, 4, 0, 0, Math.PI*2); ctx.fill();
  trunk(ctx, 5, -4, 24, "#7a4a18", "#3a200a", "#1a0e04");
  ctx.strokeStyle = "rgba(20,12,4,0.6)"; ctx.lineWidth = 1.0;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-4, 4 + i*5); ctx.bezierCurveTo(0, 5+i*5, 1, 6+i*5, 4, 5+i*5); ctx.stroke(); }
  const blobs = [[-12,-6,11],[12,-6,11],[-6,-16,11],[8,-16,11],[0,-10,12],[-14,-2,8],[14,-2,8]];
  blobs.forEach(([cx,cy,r])=>{
    const g = ctx.createRadialGradient(cx-r*0.4, cy-r*0.4, 1, cx, cy, r);
    g.addColorStop(0, "#9cc848"); g.addColorStop(0.6, "#3a6818"); g.addColorStop(1, "#1f3a08");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#1f2a08"; ctx.lineWidth = 1.4; ctx.stroke();
  });
  ctx.fillStyle = "rgba(255,255,200,0.45)";
  [[-10,-8,3],[10,-8,3],[-4,-14,2.5],[4,-12,2.5]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
}

function drawBirch(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, 24, 16, 4, 0, 0, Math.PI*2); ctx.fill();
  const g = ctx.createLinearGradient(-4, 0, 4, 0);
  g.addColorStop(0, "#a89060"); g.addColorStop(0.5, "#fff8e8"); g.addColorStop(1, "#a89060");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-3, 24); ctx.lineTo(-2.5, -16); ctx.lineTo(2.5, -16); ctx.lineTo(3, 24);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a200a"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#1a0e04";
  [[-1,-10,3,1.5],[0,-2,3.5,1.4],[-1,8,3,1.6],[0,16,3.4,1.4],[-1,2,1.5,0.8],[1,12,1.5,0.8]].forEach(([sx,sy,sw,sh])=>{
    ctx.beginPath(); ctx.ellipse(sx,sy,sw,sh,0,0,Math.PI*2); ctx.fill();
  });
  const drawLeafCluster = (cx, cy, r) => {
    const cg = ctx.createRadialGradient(cx-r*0.3, cy-r*0.3, 1, cx, cy, r);
    cg.addColorStop(0, "#d8e840"); cg.addColorStop(0.7, "#7ea818"); cg.addColorStop(1, "#3a5808");
    ctx.fillStyle = cg;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a)*r*0.6, cy + Math.sin(a)*r*0.6, r*0.5, r*0.7, a, 0, Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle = "#3a5808"; ctx.lineWidth = 1.0; ctx.stroke();
  };
  drawLeafCluster(-10, -10, 9);
  drawLeafCluster(10, -10, 9);
  drawLeafCluster(0, -18, 9);
  drawLeafCluster(0, -8, 8);
  ctx.fillStyle = "rgba(255,255,200,0.5)";
  [[-11,-13,2],[11,-13,2],[0,-21,2.2]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
}

function drawWillow(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 24, 22, 4, 0, 0, Math.PI*2); ctx.fill();
  trunk(ctx, 4, -8, 24, "#6b4818", "#3a2008", "#1a0e04");
  const drawDrape = (cx, len, sway) => {
    ctx.strokeStyle = "#5a8a18"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(cx, -10); ctx.quadraticCurveTo(cx + sway, -10 + len/2, cx + sway*1.5, -10 + len); ctx.stroke();
    ctx.fillStyle = "#7eb83a";
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const x = cx + sway * t * 1.5;
      const y = -10 + len * t;
      ctx.beginPath(); ctx.ellipse(x - 1, y, 1.4, 4, sway * 0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 2, y - 2, 1.4, 4, sway * 0.3, 0, Math.PI*2); ctx.fill();
    }
  };
  const canopyG = ctx.createRadialGradient(-4, -14, 3, 0, -10, 18);
  canopyG.addColorStop(0, "#9cd048"); canopyG.addColorStop(0.7, "#5a8a18"); canopyG.addColorStop(1, "#3a5808");
  ctx.fillStyle = canopyG;
  ctx.beginPath(); ctx.ellipse(0, -12, 18, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a5808"; ctx.lineWidth = 1.6; ctx.stroke();
  drawDrape(-14, 28, -3);
  drawDrape(-8, 32, -1);
  drawDrape(-2, 30, 0);
  drawDrape(4, 33, 1);
  drawDrape(11, 28, 3);
  drawDrape(15, 24, 4);
  ctx.fillStyle = "rgba(255,255,200,0.4)";
  [[-6,-16,3],[6,-16,3]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
}

function drawFir(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath(); ctx.ellipse(2, 24, 18, 4, 0, 0, Math.PI*2); ctx.fill();
  trunk(ctx, 3.5, 18, 24, "#5a3814", "#2a1808", "#1a0e04");
  const drawTier = (y, w, h) => {
    const g = ctx.createLinearGradient(0, y - h, 0, y);
    g.addColorStop(0, "#5a8a28"); g.addColorStop(0.6, "#2a5008"); g.addColorStop(1, "#1a3008");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.lineTo(-w*0.6, y - 2);
    for (let i = 0; i < 5; i++) {
      const x = -w + (w*2 / 5) * i + w/5;
      ctx.lineTo(x - w/10, y - 2);
      ctx.lineTo(x, y + 1);
      ctx.lineTo(x + w/10, y - 2);
    }
    ctx.lineTo(w*0.6, y - 2);
    ctx.lineTo(w, y);
    ctx.lineTo(w*0.5, y - h);
    ctx.lineTo(-w*0.5, y - h);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = "rgba(220,255,180,0.35)";
    ctx.beginPath(); ctx.moveTo(-w*0.4, y - 2); ctx.lineTo(-w*0.2, y - h*0.7); ctx.lineTo(0, y - 2); ctx.closePath(); ctx.fill();
  };
  drawTier(20, 16, 8);
  drawTier(10, 14, 9);
  drawTier(-1, 12, 10);
  drawTier(-12, 10, 10);
  ctx.fillStyle = "#2a5008";
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(-7, -12); ctx.lineTo(7, -12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#a83a18";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI/2 + (i * 2 * Math.PI / 5);
    const r = 3.5;
    if (i===0) ctx.moveTo(Math.cos(a)*r, -22 + Math.sin(a)*r);
    else ctx.lineTo(Math.cos(a)*r, -22 + Math.sin(a)*r);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f8d040"; ctx.beginPath(); ctx.arc(0,-22,1.4,0,Math.PI*2); ctx.fill();
}

function drawCypress(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath(); ctx.ellipse(2, 24, 12, 4, 0, 0, Math.PI*2); ctx.fill();
  trunk(ctx, 3, 18, 24, "#5a3814", "#2a1808", "#1a0e04");
  const g = ctx.createLinearGradient(-10, 0, 10, 0);
  g.addColorStop(0, "#1a3a08"); g.addColorStop(0.5, "#3a6818"); g.addColorStop(1, "#1a3a08");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.bezierCurveTo(-10, -16, -11, 0, -8, 18);
  ctx.bezierCurveTo(-6, 22, 6, 22, 8, 18);
  ctx.bezierCurveTo(11, 0, 10, -16, 0, -24);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 2.0; ctx.stroke();
  ctx.strokeStyle = "rgba(10,26,4,0.55)"; ctx.lineWidth = 0.9;
  for (let yy = -20; yy < 18; yy += 3) {
    const w = 6 + Math.sin((yy + 24) * 0.15) * 4;
    ctx.beginPath();
    for (let xx = -w; xx <= w; xx += 2) ctx.lineTo(xx, yy + (xx % 2 === 0 ? 0 : 1));
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(180,220,140,0.4)";
  ctx.beginPath(); ctx.ellipse(-3, -8, 2, 14, 0.05, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#8a5814";
  [[-4,4,1.6],[4,-2,1.6],[-2,-12,1.4],[3,10,1.5]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
}

function drawPalm(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 24, 18, 4, 0, 0, Math.PI*2); ctx.fill();
  const tg = ctx.createLinearGradient(-5, 0, 5, 0);
  tg.addColorStop(0, "#3a200a"); tg.addColorStop(0.5, "#8a5a20"); tg.addColorStop(1, "#3a200a");
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-5, 24);
  ctx.bezierCurveTo(-3, 10, -6, -4, -3, -14);
  ctx.lineTo(3, -14);
  ctx.bezierCurveTo(6, -4, 3, 10, 5, 24);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.strokeStyle = "rgba(26,14,4,0.6)"; ctx.lineWidth = 1.0;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-5, 20 - i*7); ctx.bezierCurveTo(0, 22 - i*7, 0, 22 - i*7, 5, 20 - i*7);
    ctx.stroke();
  }
  const drawFrond = (angle, len, droop) => {
    ctx.save(); ctx.translate(0, -14); ctx.rotate(angle);
    ctx.strokeStyle = "#3a5808"; ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len*0.5, droop*0.3, len, droop); ctx.stroke();
    ctx.fillStyle = "#5a8a18";
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const x = len * t;
      const y = droop * t * t;
      ctx.save(); ctx.translate(x, y); ctx.rotate(droop * 0.05);
      ctx.beginPath(); ctx.ellipse(0, -3, 2, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 3, 2, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };
  drawFrond(-Math.PI*0.55, 22, 4);
  drawFrond(-Math.PI*0.35, 22, -2);
  drawFrond(-Math.PI*0.15, 20, -8);
  drawFrond(-Math.PI*0.85, 22, -2);
  drawFrond(-Math.PI*1.05, 22, 4);
  drawFrond(-Math.PI*1.25, 20, 8);
  ctx.fillStyle = "#8a5418";
  [[-3,-12,2.2],[3,-12,2.2],[0,-9,2.2],[-2,-15,2]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
  ctx.strokeStyle = "#3a200a"; ctx.lineWidth = 0.8;
  [[-3,-12,2.2],[3,-12,2.2],[0,-9,2.2],[-2,-15,2]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.stroke(); });
}

export const ICONS = {
  tree_oak:     { label:"Oak",     color:"#3a6818", draw:drawOak },
  tree_birch:   { label:"Birch",   color:"#a8c038", draw:drawBirch },
  tree_willow:  { label:"Willow",  color:"#5a8a18", draw:drawWillow },
  tree_fir:     { label:"Fir",     color:"#2a5008", draw:drawFir },
  tree_cypress: { label:"Cypress", color:"#1a3a08", draw:drawCypress },
  tree_palm:    { label:"Palm",    color:"#5a8a18", draw:drawPalm },
};
