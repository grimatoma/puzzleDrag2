// Fruits.

function drawApple(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createRadialGradient(-7, -8, 3, 0, 4, 22);
  grad.addColorStop(0, "#ffd6a8"); grad.addColorStop(0.35, "#e8543a"); grad.addColorStop(1, "#7a1410");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-4, -18, -16, -16, -19, -4);
  ctx.bezierCurveTo(-22, 10, -10, 22, 0, 20);
  ctx.bezierCurveTo(10, 22, 22, 10, 19, -4);
  ctx.bezierCurveTo(16, -16, 4, -18, 0, -16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = "rgba(58,8,8,0.7)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-2, -15); ctx.quadraticCurveTo(0, -12, 2, -15); ctx.stroke();
  ctx.strokeStyle = "#3a200a"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(2, -20, 5, -22); ctx.stroke();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.moveTo(4, -20); ctx.bezierCurveTo(14, -24, 18, -16, 12, -12); ctx.bezierCurveTo(8, -14, 5, -18, 4, -20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.ellipse(-8, -6, 4, 7, -0.5, 0, Math.PI * 2); ctx.fill();
}

function drawPear(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createRadialGradient(-6, 4, 3, 0, 8, 24);
  grad.addColorStop(0, "#f8ed90"); grad.addColorStop(0.5, "#bcc436"); grad.addColorStop(1, "#5a6810");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.bezierCurveTo(-6, -16, -8, -8, -7, -2);
  ctx.bezierCurveTo(-18, 4, -18, 18, -2, 22);
  ctx.bezierCurveTo(14, 22, 18, 8, 7, -2);
  ctx.bezierCurveTo(8, -8, 6, -16, 0, -18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2a3208"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = "#3a200a"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(1, -22); ctx.stroke();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.moveTo(1, -21); ctx.bezierCurveTo(11, -23, 14, -16, 8, -14); ctx.bezierCurveTo(5, -16, 2, -19, 1, -21); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(122,82,16,0.6)";
  [[3,4,1.0],[-4,10,0.9],[6,12,1.1],[-2,16,0.8],[-6,0,0.8],[8,6,0.9]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(-7,4,3,6,-0.4,0,Math.PI*2); ctx.fill();
}

function drawGoldenApple(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,220,80,0.18)";
  ctx.beginPath(); ctx.arc(0, 2, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createRadialGradient(-7, -8, 3, 0, 4, 24);
  grad.addColorStop(0, "#fffceb"); grad.addColorStop(0.4, "#ffd34c"); grad.addColorStop(1, "#7a4f08");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-4, -18, -16, -16, -19, -4);
  ctx.bezierCurveTo(-22, 10, -10, 22, 0, 20);
  ctx.bezierCurveTo(10, 22, 22, 10, 19, -4);
  ctx.bezierCurveTo(16, -16, 4, -18, 0, -16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e3a08"; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,200,0.7)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-12, -2); ctx.bezierCurveTo(-8, -10, 6, -10, 12, -2); ctx.stroke();
  ctx.strokeStyle = "#5e3a08"; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(2, -20, 5, -22); ctx.stroke();
  const leafGrad = ctx.createLinearGradient(4, -20, 14, -12);
  leafGrad.addColorStop(0, "#fff4a8"); leafGrad.addColorStop(1, "#a87810");
  ctx.fillStyle = leafGrad;
  ctx.beginPath(); ctx.moveTo(4, -20); ctx.bezierCurveTo(14, -24, 18, -16, 12, -12); ctx.bezierCurveTo(8, -14, 5, -18, 4, -20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e3a08"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(-8, -6, 4, 7, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fffae0";
  [[16,-14,1.6],[-18,8,1.4],[14,16,1.2],[-14,-16,1.0]].forEach(([sx,sy,sr])=>{
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? sr * 1.8 : sr * 0.6;
      const x = sx + Math.cos(a) * r;
      const y = sy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  });
}

function drawBlackberry(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 20, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Stem + leaf
  ctx.strokeStyle = "#3a1810"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-3, -22); ctx.quadraticCurveTo(0, -16, 2, -10); ctx.stroke();
  ctx.fillStyle = "#3a6818";
  ctx.beginPath();
  ctx.moveTo(-3, -22);
  ctx.bezierCurveTo(8, -25, 14, -19, 11, -12);
  ctx.bezierCurveTo(5, -14, -1, -18, -3, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f3a08"; ctx.lineWidth = 1.3; ctx.stroke();
  // Green calyx where fruit meets stem
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(3, -8); ctx.lineTo(0, -7); ctx.lineTo(-3, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 0.6; ctx.stroke();
  // Backing oval defines the overall blackberry silhouette so gaps between
  // drupelets read as texture, not holes.
  ctx.fillStyle = "#1a0420";
  ctx.beginPath();
  ctx.ellipse(0, 6, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#08000c"; ctx.lineWidth = 1.6; ctx.stroke();
  // Many small drupelets, hex-packed, clipped to the body oval. This is
  // the key fix: blackberries are clusters of ~30 tiny drupelets, not
  // 6 large round balls (which read as grapes).
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 6, 10.5, 12.5, 0, 0, Math.PI * 2);
  ctx.clip();
  const dr = 2.4;
  for (let row = -5; row <= 5; row++) {
    const oy = -6 + row * 2.6;
    const offset = (row % 2 === 0) ? 0 : dr * 0.95;
    for (let col = -5; col <= 5; col++) {
      const ox = col * 2.4 + offset;
      if ((ox / 10.5) ** 2 + ((oy - 6) / 12.5) ** 2 > 1.0) continue;
      const grad = ctx.createRadialGradient(
        ox - dr * 0.4, oy - dr * 0.4, 0.3, ox, oy, dr
      );
      grad.addColorStop(0, "#7a4a8a");
      grad.addColorStop(0.55, "#2a0a3a");
      grad.addColorStop(1, "#0a0014");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ox, oy, dr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#08000c"; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = "rgba(220,180,255,0.7)";
      ctx.beginPath();
      ctx.arc(ox - dr * 0.4, oy - dr * 0.5, dr * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRambutan(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(2, 22, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5a8a26"; ctx.lineWidth = 1.4;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const innerR = 16; const outerR = 24 + Math.sin(i * 1.7) * 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*innerR, Math.sin(a)*innerR + 2);
    ctx.quadraticCurveTo(Math.cos(a+0.1)*(outerR-2), Math.sin(a+0.1)*(outerR-2)+2, Math.cos(a+0.2)*outerR, Math.sin(a+0.2)*outerR + 2);
    ctx.stroke();
  }
  const grad = ctx.createRadialGradient(-6, -2, 3, 0, 4, 18);
  grad.addColorStop(0,"#ffd0c0"); grad.addColorStop(0.5,"#e83a48"); grad.addColorStop(1,"#7a0a18");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(0,4,15,14,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0a08"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = "#a8d048"; ctx.lineWidth = 1.1;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*13, Math.sin(a)*12 + 4);
    ctx.lineTo(Math.cos(a)*18, Math.sin(a)*17 + 4);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(-6,-1,3,5,-0.4,0,Math.PI*2); ctx.fill();
}

function drawStarfruit(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Whole carambola is an oblong yellow fruit with deep longitudinal ridges.
  // Draw it as a side-view oblong body so it reads as fruit; show the star
  // cross-section only as a small inset at the top-right.
  ctx.save();
  ctx.rotate(-0.18);
  const grad = ctx.createLinearGradient(-12, 0, 12, 0);
  grad.addColorStop(0, "#a87810");
  grad.addColorStop(0.5, "#f0d048");
  grad.addColorStop(1, "#a87810");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-14, -12);
  ctx.bezierCurveTo(-10, -18, 10, -18, 14, -12);
  ctx.bezierCurveTo(  8,  -8, 16,  -4, 10,   0);
  ctx.bezierCurveTo( 16,   4,  8,   8, 14,  12);
  ctx.bezierCurveTo( 10,  18,-10,  18,-14,  12);
  ctx.bezierCurveTo( -8,   8,-16,   4,-10,   0);
  ctx.bezierCurveTo(-16,  -4, -8,  -8,-14, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5e4210"; ctx.lineWidth = 2.0;
  ctx.stroke();
  // Vertical ridge lines (project the star points along the body)
  ctx.strokeStyle = "#7a5210"; ctx.lineWidth = 1.4;
  [-8, -3, 3, 8].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -14);
    ctx.bezierCurveTo(x - 1, -4, x + 1, 4, x, 14);
    ctx.stroke();
  });
  // Brown calyx + tiny stem at the top
  ctx.fillStyle = "#5a3a14";
  ctx.beginPath(); ctx.arc(0, -16, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5a3a14"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(2, -22); ctx.stroke();
  // Single small leaf
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(2, -22);
  ctx.bezierCurveTo(10, -24, 12, -18, 6, -16);
  ctx.bezierCurveTo(3, -18, 1, -20, 2, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 1.0; ctx.stroke();
  // Sheen highlight
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.ellipse(-6, -2, 2, 8, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Tiny inset 5-point star at the top-right corner — telegraphs
  // "starfruit" by association without replacing the whole icon with a star.
  ctx.save();
  ctx.translate(16, -16);
  ctx.fillStyle = "#fff4a0";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 5 : 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#a87810"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.restore();
}

function drawCoconut(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2,22,22,4.5,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createRadialGradient(-6,-8,3,0,4,24);
  grad.addColorStop(0,"#a47445"); grad.addColorStop(0.55,"#5e3a14"); grad.addColorStop(1,"#2a1808");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0,4,19,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(0,4,19,0,Math.PI*2); ctx.clip();
  ctx.strokeStyle = "rgba(255,210,160,0.55)"; ctx.lineWidth = 0.9;
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * Math.PI * 2;
    const innerR = 5 + ((i*7) % 12);
    const outerR = innerR + 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*innerR, Math.sin(a)*innerR + 4);
    ctx.lineTo(Math.cos(a)*outerR, Math.sin(a)*outerR + 4);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(20,12,4,0.4)"; ctx.lineWidth = 1.0;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + 0.1;
    const innerR = 6 + ((i*11) % 10);
    const outerR = innerR + 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*innerR, Math.sin(a)*innerR + 4);
    ctx.lineTo(Math.cos(a)*outerR, Math.sin(a)*outerR + 4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "#1a0e04";
  [[-5,-2],[5,-2],[0,4]].forEach(([ex,ey])=>{ ctx.beginPath(); ctx.arc(ex,ey,2.4,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = "rgba(255,210,160,0.5)";
  ctx.beginPath(); ctx.ellipse(-7,-10,4,7,-0.4,0,Math.PI*2); ctx.fill();
}

function drawLemon(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(2,22,20,4,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createRadialGradient(-6,-6,3,0,4,22);
  grad.addColorStop(0,"#fffce0"); grad.addColorStop(0.5,"#f6d030"); grad.addColorStop(1,"#9c6f08");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-22,0);
  ctx.bezierCurveTo(-22,-14,-8,-18,4,-16);
  ctx.bezierCurveTo(18,-14,24,-2,22,6);
  ctx.bezierCurveTo(20,18,8,22,-4,20);
  ctx.bezierCurveTo(-18,16,-22,8,-22,0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e4210"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.fillStyle = "#f6d030";
  ctx.beginPath(); ctx.moveTo(20,4); ctx.lineTo(26,8); ctx.lineTo(20,10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e4210"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = "#5a3a14"; ctx.beginPath(); ctx.arc(-21,-2,2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.moveTo(-18,-8); ctx.bezierCurveTo(-22,-16,-14,-22,-8,-16); ctx.bezierCurveTo(-10,-12,-14,-10,-18,-8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(124,86,12,0.45)";
  [[-10,-4,0.8],[8,4,0.8],[-2,12,0.7],[-12,8,0.7],[10,-6,0.7],[4,-2,0.7],[-8,16,0.8],[14,12,0.8]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.ellipse(-5,-5,5,9,-0.5,0,Math.PI*2); ctx.fill();
}

function drawJackfruit(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2,22,22,5,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createRadialGradient(-6,-4,3,0,6,26);
  grad.addColorStop(0,"#f4ec90"); grad.addColorStop(0.55,"#bca834"); grad.addColorStop(1,"#5e5008");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(0,4,18,18,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2e08"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0,4,17,17,0,0,Math.PI*2); ctx.clip();
  const cells = [[-10,-8],[-2,-10],[6,-9],[12,-3],[-13,-2],[-6,-3],[2,-3],[10,1],[-12,6],[-5,5],[3,6],[11,8],[-8,12],[0,13],[8,14],[-3,19],[5,19]];
  cells.forEach(([cx,cy])=>{
    ctx.fillStyle = "rgba(58,46,8,0.55)";
    ctx.beginPath(); ctx.moveTo(cx,cy-3); ctx.lineTo(cx+3,cy); ctx.lineTo(cx,cy+3); ctx.lineTo(cx-3,cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,250,180,0.55)";
    ctx.beginPath(); ctx.moveTo(cx,cy-2); ctx.lineTo(cx+1.5,cy-0.5); ctx.lineTo(cx,cy); ctx.lineTo(cx-1.5,cy-0.5); ctx.closePath(); ctx.fill();
  });
  ctx.restore();
  ctx.strokeStyle = "#3a200a"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(0,-22); ctx.stroke();
  ctx.fillStyle = "#5a3a14"; ctx.beginPath(); ctx.arc(0,-22,2.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.moveTo(0,-22); ctx.bezierCurveTo(10,-25,14,-18,8,-14); ctx.bezierCurveTo(4,-16,1,-20,0,-22); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,200,0.45)";
  ctx.beginPath(); ctx.ellipse(-7,-3,4,7,-0.4,0,Math.PI*2); ctx.fill();
}

export const ICONS = {
  tile_fruit_apple:        { label:"Apple",        color:"#d4543a", draw:drawApple },
  tile_fruit_pear:         { label:"Pear",         color:"#bcc436", draw:drawPear },
  tile_fruit_golden_apple: { label:"Golden Apple", color:"#f4c430", draw:drawGoldenApple },
  tile_fruit_blackberry:   { label:"Blackberry",   color:"#3a1a4a", draw:drawBlackberry },
  tile_fruit_rambutan:     { label:"Rambutan",     color:"#d8344a", draw:drawRambutan },
  tile_fruit_starfruit:    { label:"Starfruit",    color:"#e8c83c", draw:drawStarfruit },
  tile_fruit_coconut:      { label:"Coconut",      color:"#5e3a14", draw:drawCoconut },
  tile_fruit_lemon:        { label:"Lemon",        color:"#f4d030", draw:drawLemon },
  tile_fruit_jackfruit:    { label:"Jackfruit",    color:"#a8a040", draw:drawJackfruit },
};
