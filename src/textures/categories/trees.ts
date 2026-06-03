// Trees.

function trunk(ctx: CanvasRenderingContext2D, w: number, topY: number, botY: number, light: string, dark: string, outline: string) {
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

function drawOak(ctx: CanvasRenderingContext2D) {
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

function drawBirch(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, 24, 14, 4, 0, 0, Math.PI*2); ctx.fill();
  // Slender white-bark trunk (solid, lit from upper-left).
  const g = ctx.createLinearGradient(-3.5, 0, 3.5, 0);
  g.addColorStop(0, "#cfc4a8"); g.addColorStop(0.4, "#fbf4e4"); g.addColorStop(1, "#9c8c64");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-3, 24);
  ctx.lineTo(-2.2, -14);
  ctx.lineTo(2.2, -14);
  ctx.lineTo(3, 24);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a4a2a"; ctx.lineWidth = 1.6; ctx.stroke();
  // Birch bark dashes: short dark horizontal marks on the surface (not holes).
  ctx.strokeStyle = "rgba(40,28,14,0.7)"; ctx.lineWidth = 1.2;
  [[-2,-8,3],[0,0,3.4],[-1,8,3],[1,16,3.2]].forEach(([mx,my,mw])=>{
    ctx.beginPath(); ctx.moveTo(mx - mw/2, my); ctx.lineTo(mx + mw/2, my); ctx.stroke();
  });
  ctx.strokeStyle = "rgba(40,28,14,0.45)"; ctx.lineWidth = 0.9;
  [[-1,4,1.5],[1,12,1.5],[-1,-3,1.4]].forEach(([mx,my,mw])=>{
    ctx.beginPath(); ctx.moveTo(mx - mw/2, my); ctx.lineTo(mx + mw/2, my); ctx.stroke();
  });
  // Light, rounded birch canopy (brighter, yellow-green).
  const drawBlob = (cx: number, cy: number, r: number) => {
    const cg = ctx.createRadialGradient(cx-r*0.4, cy-r*0.4, 1, cx, cy, r);
    cg.addColorStop(0, "#cfe060"); cg.addColorStop(0.6, "#7ea828"); cg.addColorStop(1, "#46680e");
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#3a5808"; ctx.lineWidth = 1.4; ctx.stroke();
  };
  drawBlob(-9, -8, 9);
  drawBlob(9, -8, 9);
  drawBlob(-3, -17, 9);
  drawBlob(6, -16, 9);
  drawBlob(0, -10, 10);
  ctx.fillStyle = "rgba(255,255,210,0.5)";
  [[-9,-11,3],[6,-11,2.6],[-2,-20,2.6]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
}

function drawWillow(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 24, 20, 4, 0, 0, Math.PI*2); ctx.fill();
  trunk(ctx, 4, -6, 24, "#6b4818", "#3a2008", "#1a0e04");
  // Mounded canopy on top, then trailing drapes hang from its rim.
  const canopyG = ctx.createRadialGradient(-5, -16, 3, 0, -12, 18);
  canopyG.addColorStop(0, "#aee05a"); canopyG.addColorStop(0.6, "#5a8a18"); canopyG.addColorStop(1, "#365408");
  ctx.fillStyle = canopyG;
  ctx.beginPath(); ctx.ellipse(0, -13, 17, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#365408"; ctx.lineWidth = 2.0; ctx.stroke();
  // Drooping strands: wider overlapping ribbons that curtain over the trunk.
  const drawDrape = (cx: number, top: number, len: number, sway: number, half: number) => {
    const grad = ctx.createLinearGradient(cx, top, cx + sway, top + len);
    grad.addColorStop(0, "#7fb030"); grad.addColorStop(1, "#3f6210");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - half, top);
    ctx.quadraticCurveTo(cx + sway * 0.6 - half * 0.5, top + len * 0.55, cx + sway, top + len);
    ctx.quadraticCurveTo(cx + sway * 0.6 + half * 0.5, top + len * 0.55, cx + half, top);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#365408"; ctx.lineWidth = 1.0; ctx.stroke();
  };
  drawDrape(-13, -11, 26, -3, 3.4);
  drawDrape(-8, -14, 30, -1, 3.8);
  drawDrape(-3, -16, 33, 0, 3.8);
  drawDrape(3, -16, 33, 0, 3.8);
  drawDrape(8, -14, 30, 1, 3.8);
  drawDrape(13, -11, 26, 3, 3.4);
  ctx.fillStyle = "rgba(255,255,210,0.45)";
  [[-7,-17,3],[4,-16,2.4]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
}

function drawFir(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath(); ctx.ellipse(2, 24, 18, 4, 0, 0, Math.PI*2); ctx.fill();
  trunk(ctx, 3.5, 18, 24, "#5a3814", "#2a1808", "#1a0e04");
  const drawTier = (y: number, w: number, h: number) => {
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

function drawCypress(ctx: CanvasRenderingContext2D) {
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
  // Foliage texture clipped inside the body so nothing escapes the silhouette.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.bezierCurveTo(-10, -16, -11, 0, -8, 18);
  ctx.bezierCurveTo(-6, 22, 6, 22, 8, 18);
  ctx.bezierCurveTo(11, 0, 10, -16, 0, -24);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(10,26,4,0.45)"; ctx.lineWidth = 1.2;
  for (let yy = -18; yy < 18; yy += 4) {
    ctx.beginPath();
    ctx.moveTo(-9, yy);
    ctx.quadraticCurveTo(0, yy + 2.5, 9, yy);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(180,220,140,0.4)";
  ctx.beginPath(); ctx.ellipse(-3, -6, 2.4, 14, 0.05, 0, Math.PI*2); ctx.fill();
  // Small brown cones nestled against the foliage.
  ctx.fillStyle = "#8a5814";
  [[-4,4,1.6],[4,-2,1.6],[-2,-12,1.4],[3,10,1.5]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
}

function drawPalm(ctx: CanvasRenderingContext2D) {
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
  const drawFrond = (angle: number, len: number, droop: number) => {
    ctx.save(); ctx.translate(0, -14); ctx.rotate(angle);
    const fg = ctx.createLinearGradient(0, 0, len, 0);
    fg.addColorStop(0, "#6fa028"); fg.addColorStop(1, "#3f6210");
    // Leaf blade as one tapered shape (no floating ovals).
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(0, -2.6);
    ctx.quadraticCurveTo(len*0.5, droop*0.3 - 4, len, droop);
    ctx.quadraticCurveTo(len*0.5, droop*0.3 + 4, 0, 2.6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#2f4a0c"; ctx.lineWidth = 1.0; ctx.stroke();
    // Central rib.
    ctx.strokeStyle = "rgba(30,46,8,0.7)"; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len*0.5, droop*0.3, len, droop); ctx.stroke();
    ctx.restore();
  };
  drawFrond(-Math.PI*0.52, 17, 3);
  drawFrond(-Math.PI*0.32, 17, -3);
  drawFrond(-Math.PI*0.12, 15, -6);
  drawFrond(-Math.PI*0.88, 17, -3);
  drawFrond(-Math.PI*1.08, 17, 3);
  drawFrond(-Math.PI*1.28, 15, 6);
  ctx.fillStyle = "#8a5418";
  [[-3,-12,2.2],[3,-12,2.2],[0,-9,2.2],[-2,-15,2]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
  ctx.strokeStyle = "#3a200a"; ctx.lineWidth = 0.8;
  [[-3,-12,2.2],[3,-12,2.2],[0,-9,2.2],[-2,-15,2]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.stroke(); });
}

export const ICONS = {
  tile_tree_oak:     { label:"Oak",     color:"#3a6818", draw:drawOak },
  tile_tree_birch:   { label:"Birch",   color:"#a8c038", draw:drawBirch },
  tile_tree_willow:  { label:"Willow",  color:"#5a8a18", draw:drawWillow },
  tile_tree_fir:     { label:"Fir",     color:"#2a5008", draw:drawFir },
  tile_tree_cypress: { label:"Cypress", color:"#1a3a08", draw:drawCypress },
  tile_tree_palm:    { label:"Palm",    color:"#5a8a18", draw:drawPalm },
};
