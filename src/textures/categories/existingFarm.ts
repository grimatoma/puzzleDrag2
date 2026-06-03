// Existing farm icons — ported verbatim from src/textures/farmIcons.js
// so they render in the same review context as the new ones.
// Source: github.com/grimatoma/puzzleDrag2 — src/textures/farmIcons.js

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Base farm grass — green blades (hay is the bundled resource, not the tile). */
function drawGrass(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,23,20,4.5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#5a3a18"; ctx.beginPath(); ctx.ellipse(0,21,13,4,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#2a5010"; ctx.lineWidth = 4;
  [[-10,-8,-14,-22],[-3,-2,-6,-21],[4,4,1,-23],[10,10,6,-20]].forEach(([x,c,tx,ty])=>{
    ctx.beginPath(); ctx.moveTo(x,20); ctx.bezierCurveTo(c,6,tx+2,-8,tx,ty); ctx.stroke();
  });
  ctx.strokeStyle = "#5c9c2e"; ctx.lineWidth = 2.8;
  [[-7,-5,-10,-20],[0,0,-2,-19],[7,6,4,-21]].forEach(([x,c,tx,ty])=>{
    ctx.beginPath(); ctx.moveTo(x,19); ctx.bezierCurveTo(c,5,tx+1,-7,tx,ty); ctx.stroke();
  });
  ctx.strokeStyle = "#a8d858"; ctx.lineWidth = 1.4;
  [[-5,-6,-16],[2,-1,-17],[8,2,-18]].forEach(([x,tx,ty])=>{
    ctx.beginPath(); ctx.moveTo(x,16); ctx.bezierCurveTo(x,3,tx+1,-6,tx,ty); ctx.stroke();
  });
}

function drawMeadowGrass(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,23,20,4.5,0,0,Math.PI*2); ctx.fill();
  // grounded soil clump at the base of the tuft
  ctx.fillStyle = "#5a3a18"; ctx.beginPath(); ctx.ellipse(0,21,13,4,0,0,Math.PI*2); ctx.fill();
  // blades rise from the clump, tips kept within the safe area (>= -24)
  ctx.strokeStyle = "#234012"; ctx.lineWidth = 4.2;
  [[-12,-9,-16,-23],[-5,-2,-8,-22],[2,4,-1,-24],[8,9,4,-22],[14,14,10,-21]].forEach(([x,c,tx,ty])=>{
    ctx.beginPath(); ctx.moveTo(x,20); ctx.bezierCurveTo(c,6,tx+2,-8,tx,ty); ctx.stroke();
  });
  ctx.strokeStyle = "#5c9c2e"; ctx.lineWidth = 3;
  [[-9,-6,-12,-21],[-2,0,-4,-20],[5,6,2,-22],[11,11,7,-19]].forEach(([x,c,tx,ty])=>{
    ctx.beginPath(); ctx.moveTo(x,19); ctx.bezierCurveTo(c,5,tx+1,-7,tx,ty); ctx.stroke();
  });
  ctx.strokeStyle = "#b6e068"; ctx.lineWidth = 1.5;
  [[-7,-9,-18],[0,-1,-18],[6,3,-19]].forEach(([x,tx,ty])=>{
    ctx.beginPath(); ctx.moveTo(x,16); ctx.bezierCurveTo(x,3,tx+1,-6,tx,ty); ctx.stroke();
  });
  // a small clustered flower nestled in the blades
  ctx.fillStyle = "#fffbe0";
  [[-7,-2],[-4,-4],[-10,-4],[-7,-6],[-4,-1]].forEach(([px,py])=>{ ctx.beginPath(); ctx.arc(px,py,2.2,0,Math.PI*2); ctx.fill(); });
  ctx.strokeStyle = "#7a8a30"; ctx.lineWidth = 0.8;
  [[-7,-2],[-4,-4],[-10,-4],[-7,-6],[-4,-1]].forEach(([px,py])=>{ ctx.beginPath(); ctx.arc(px,py,2.2,0,Math.PI*2); ctx.stroke(); });
  ctx.fillStyle = "#ffd248"; ctx.beginPath(); ctx.arc(-7,-3,1.6,0,Math.PI*2); ctx.fill();
}

function drawSpikyGrass(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,23,20,4.5,0,0,Math.PI*2); ctx.fill();
  // grounded soil clump the spikes spring from
  ctx.fillStyle = "#5a3a18"; ctx.beginPath(); ctx.ellipse(0,21,14,4,0,0,Math.PI*2); ctx.fill();
  // back spikes (dark), tips kept within ±22
  ctx.fillStyle = "#3d4a14"; ctx.strokeStyle = "#1f2a08"; ctx.lineWidth = 1.5;
  [[-20,20,-15,-20],[-13,21,-10,-18],[-5,21,-4,-22],[3,21,4,-22],[11,21,12,-18],[18,20,15,-20]].forEach(([x1,y1,xt,yt])=>{
    ctx.beginPath(); ctx.moveTo(x1-4,y1); ctx.lineTo(x1+4,y1); ctx.lineTo(xt,yt); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  // front spikes (lighter)
  ctx.fillStyle = "#83a235"; ctx.strokeStyle = "#3a4818"; ctx.lineWidth = 1.2;
  [[-16,19,-13,-15],[-9,20,-7,-15],[-1,20,0,-19],[6,20,7,-15],[13,19,11,-15]].forEach(([x1,y1,xt,yt])=>{
    ctx.beginPath(); ctx.moveTo(x1-3,y1); ctx.lineTo(x1+3,y1); ctx.lineTo(xt,yt); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  // bright highlight tips
  ctx.fillStyle = "#c8de72";
  [[-13,-9],[-4,-14],[6,-10],[13,-9]].forEach(([x,ty])=>{ ctx.beginPath(); ctx.moveTo(x-1.4,ty+6); ctx.lineTo(x+1.4,ty+6); ctx.lineTo(x,ty); ctx.closePath(); ctx.fill(); });
}

function drawWheat(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#6b4710"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0,24); ctx.lineTo(0,-12); ctx.stroke();
  ctx.strokeStyle = "#a47619"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0,24); ctx.lineTo(0,-12); ctx.stroke();
  ctx.fillStyle = "#8aab2e"; ctx.strokeStyle = "#4a5c12"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0,18); ctx.quadraticCurveTo(-12,12,-18,4); ctx.quadraticCurveTo(-10,10,0,22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,18); ctx.quadraticCurveTo(12,12,18,4); ctx.quadraticCurveTo(10,10,0,22); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let row=0; row<4; row++) {
    const y = -8 + row*6;
    [-1,1].forEach((side)=>{
      ctx.save(); ctx.translate(side*(5-row*0.5), y); ctx.rotate(side*(0.5-row*0.06));
      const grad = ctx.createLinearGradient(-4,-6,4,6);
      grad.addColorStop(0,"#fff0a0"); grad.addColorStop(0.55,"#f4c84a"); grad.addColorStop(1,"#a07418");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(0,0,5,8,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#6b4710"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath(); ctx.ellipse(-1.5,-3,1.5,3,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }
  ctx.strokeStyle = "#c89320"; ctx.lineWidth = 1.5;
  [-4,-2,0,2,4].forEach((dx)=>{ ctx.beginPath(); ctx.moveTo(dx,-16); ctx.lineTo(dx*1.3,-24); ctx.stroke(); });
}

function drawFlour(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(0,23,22,4.5,0,0,Math.PI*2); ctx.fill();
  const body = ctx.createLinearGradient(0,-10,0,24);
  body.addColorStop(0,"#fff5dc"); body.addColorStop(1,"#c9a672");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(-16,-8); ctx.lineTo(-21,17); ctx.quadraticCurveTo(-21,24,-14,24); ctx.lineTo(14,24); ctx.quadraticCurveTo(21,24,21,17); ctx.lineTo(16,-8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e4220"; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = "rgba(94,66,32,0.7)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0,14); ctx.lineTo(0,0); ctx.stroke();
  [-1,1].forEach((s)=>{ for (let i=0;i<3;i++){ const y=2+i*4; ctx.beginPath(); ctx.moveTo(0,y); ctx.quadraticCurveTo(s*4,y-2,s*6,y-5); ctx.stroke(); } });
  ctx.fillStyle = "#e8d3a8";
  ctx.beginPath(); ctx.moveTo(-17,-8); ctx.quadraticCurveTo(-12,-15,0,-14); ctx.quadraticCurveTo(12,-15,17,-8); ctx.lineTo(15,-3); ctx.lineTo(-15,-3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e4220"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "#7a4e1a"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-12,-10); ctx.quadraticCurveTo(0,-6,12,-10); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  [[-10,-16],[-3,-19],[4,-17],[-7,-13],[9,-15],[0,-14],[6,-19]].forEach(([dx,dy])=>{ ctx.beginPath(); ctx.arc(dx,dy,1.6,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.moveTo(-13,-5); ctx.quadraticCurveTo(-17,8,-15,20); ctx.lineTo(-11,18); ctx.quadraticCurveTo(-12,8,-9,-5); ctx.closePath(); ctx.fill();
}

function drawPlank(ctx: CanvasRenderingContext2D) {
  ctx.save(); ctx.rotate(-0.18);
  ctx.fillStyle = "rgba(0,0,0,0.22)"; rr(ctx,-25,13,50,8,3); ctx.fill();
  const grad = ctx.createLinearGradient(0,-14,0,14);
  grad.addColorStop(0,"#e3a268"); grad.addColorStop(0.5,"#bd7a3c"); grad.addColorStop(1,"#7e4e1f");
  ctx.fillStyle = grad; rr(ctx,-26,-10,52,22,3); ctx.fill();
  ctx.strokeStyle = "#3e2410"; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = "rgba(62,36,16,0.5)"; ctx.lineWidth = 1;
  [-5,0,5].forEach((y0)=>{ ctx.beginPath(); ctx.moveTo(-24,y0); ctx.bezierCurveTo(-12,y0-1.5,4,y0+1.8,24,y0-0.5); ctx.stroke(); });
  ctx.strokeStyle = "rgba(255,230,180,0.6)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-23,-8); ctx.lineTo(23,-8); ctx.stroke();
  [-16,16].forEach((nx)=>{
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(nx+0.5,0.5,2.6,0,Math.PI*2); ctx.fill();
    const ng = ctx.createRadialGradient(nx-0.6,-0.6,0.4,nx,0,3);
    ng.addColorStop(0,"#dadfe4"); ng.addColorStop(1,"#3a4248");
    ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(nx,0,2.4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#1a1f24"; ctx.lineWidth = 0.8; ctx.stroke();
  });
  ctx.restore();
}

function drawDirt(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,23,20,4,0,0,Math.PI*2); ctx.fill();
  const body = ctx.createLinearGradient(0,-14,0,20);
  body.addColorStop(0,"#9a7248"); body.addColorStop(0.5,"#6b4a2a"); body.addColorStop(1,"#3a2412");
  ctx.fillStyle = body; rr(ctx,-18,-16,36,38,4); ctx.fill();
  ctx.strokeStyle = "#2a1608"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  [[-8,2,3.5],[6,-4,2.5],[0,10,2],[10,6,2],[-4,-6,1.8]].forEach(([cx,cy,r])=>{ ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = "rgba(180,140,90,0.45)";
  [[-12,-8,1.4],[8,0,1.2],[-4,14,1],[12,-6,1],[2,6,1.3]].forEach(([cx,cy,r])=>{ ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); });
  ctx.strokeStyle = "rgba(255,200,130,0.25)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-15,-12); ctx.lineTo(14,-12); ctx.stroke();
}

function drawJam(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,24,20,4,0,0,Math.PI*2); ctx.fill();
  const glass = ctx.createLinearGradient(-18,0,18,0);
  glass.addColorStop(0,"rgba(255,255,255,0.18)"); glass.addColorStop(0.5,"rgba(255,255,255,0.05)"); glass.addColorStop(1,"rgba(0,0,0,0.15)");
  ctx.fillStyle = "#f2eee5"; rr(ctx,-16,-10,32,34,5); ctx.fill();
  const jam = ctx.createLinearGradient(0,-8,0,22);
  jam.addColorStop(0,"#e0568c"); jam.addColorStop(0.6,"#a72c5e"); jam.addColorStop(1,"#5e1638");
  ctx.fillStyle = jam; rr(ctx,-14,-6,28,28,3); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  [[-7,0,1.6],[4,6,1.2],[-4,12,1.0],[7,14,1.4],[0,4,0.9]].forEach(([bx,by,br])=>{ ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = glass; rr(ctx,-16,-10,32,34,5); ctx.fill();
  ctx.strokeStyle = "#3a3026"; ctx.lineWidth = 2; rr(ctx,-16,-10,32,34,5); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-13,-4); ctx.lineTo(-13,18); ctx.stroke();
  const lid = ctx.createLinearGradient(0,-22,0,-10);
  lid.addColorStop(0,"#ffe39a"); lid.addColorStop(0.5,"#d4a236"); lid.addColorStop(1,"#7a5410");
  ctx.fillStyle = lid; rr(ctx,-18,-22,36,14,3); ctx.fill();
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = "rgba(58,36,16,0.7)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-17,-12); ctx.lineTo(17,-12); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-15,-19); ctx.lineTo(13,-19); ctx.stroke();
  ctx.fillStyle = "#f7eccd"; rr(ctx,-10,6,20,12,2); ctx.fill();
  ctx.strokeStyle = "#7a5210"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#a72c5e"; ctx.beginPath(); ctx.arc(-3,12,2,0,Math.PI*2); ctx.arc(2,12,2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#5a8a26"; ctx.beginPath(); ctx.ellipse(0,9,2,1,0.5,0,Math.PI*2); ctx.fill();
}

function drawTurkey(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(2,22,20,4,0,0,Math.PI*2); ctx.fill();
  const tailColors = ["#5a2f10","#8a4a18","#c08038","#e8b048"];
  for (let layer=0; layer<4; layer++) {
    ctx.fillStyle = tailColors[layer];
    ctx.strokeStyle = "#2a1408"; ctx.lineWidth = 1.2;
    const r = 22 - layer*3;
    const startA = -Math.PI*0.95;
    const endA = -Math.PI*0.05;
    const steps = 7 - layer;
    for (let i=0; i<steps; i++) {
      const a = startA + (i/(steps-1)) * (endA-startA);
      ctx.save(); ctx.translate(0,8); ctx.rotate(a + Math.PI/2);
      ctx.beginPath(); ctx.ellipse(0,-r*0.55,3.2-layer*0.2,r*0.55,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(255,230,170,0.5)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0,-r*0.95); ctx.lineTo(0,-r*0.2); ctx.stroke();
      ctx.strokeStyle = "#2a1408"; ctx.lineWidth = 1.2;
      ctx.restore();
    }
  }
  const bodyGrad = ctx.createRadialGradient(-4,4,2,0,8,16);
  bodyGrad.addColorStop(0,"#7a4a18"); bodyGrad.addColorStop(1,"#3a1f08");
  ctx.fillStyle = bodyGrad; ctx.beginPath(); ctx.ellipse(0,8,12,11,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0a04"; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = "rgba(220,150,60,0.35)"; ctx.beginPath(); ctx.ellipse(-3,6,5,7,-0.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#8a4a1a"; ctx.beginPath(); ctx.arc(0,-4,6,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0a04"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = "#f6c64a"; ctx.beginPath(); ctx.moveTo(5,-4); ctx.lineTo(11,-2); ctx.lineTo(5,-1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e3a08"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#c8242a"; ctx.beginPath(); ctx.moveTo(4,-2); ctx.quadraticCurveTo(8,2,4,4); ctx.quadraticCurveTo(2,2,4,-2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a0810"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(2,-5,1.6,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#1a0a04"; ctx.beginPath(); ctx.arc(2.2,-5,0.9,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#f6c64a"; ctx.lineWidth = 1.6;
  [[-4,18],[4,18]].forEach(([fx,fy])=>{ ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(fx,fy+4); ctx.moveTo(fx,fy+4); ctx.lineTo(fx-2,fy+6); ctx.moveTo(fx,fy+4); ctx.lineTo(fx+2,fy+6); ctx.stroke(); });
}

function drawClover(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.20)"; ctx.beginPath(); ctx.ellipse(0,22,22,4,0,0,Math.PI*2); ctx.fill();
  const drawLeaf = (cx: number, cy: number, r: number, angle: number, lightHex: string, darkHex: string) => {
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
    const grad = ctx.createRadialGradient(-r*0.3,-r*0.3,1,0,0,r);
    grad.addColorStop(0,lightHex); grad.addColorStop(1,darkHex);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0,r*0.4);
    ctx.bezierCurveTo(r*1.1,r*0.2,r*0.9,-r*0.9,0,-r*0.3);
    ctx.bezierCurveTo(-r*0.9,-r*0.9,-r*1.1,r*0.2,0,r*0.4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#1f4810"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0,r*0.35); ctx.lineTo(0,-r*0.25); ctx.stroke();
    ctx.restore();
  };
  drawLeaf(-12,8,6,-0.5,"#7cba48","#3a6818");
  drawLeaf(-8,14,6,0.4,"#7cba48","#3a6818");
  drawLeaf(-4,10,6,0,"#7cba48","#3a6818");
  ctx.strokeStyle = "#3a5a18"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(4,22); ctx.bezierCurveTo(2,14,4,6,4,-4); ctx.stroke();
  drawLeaf(4,-10,9,0,"#a8e068","#3a7018");
  drawLeaf(4+9,-2,9,Math.PI/2,"#a8e068","#3a7018");
  drawLeaf(4,6,9,Math.PI,"#a8e068","#3a7018");
  drawLeaf(4-9,-2,9,-Math.PI/2,"#a8e068","#3a7018");
  ctx.fillStyle = "#fff8c0"; ctx.beginPath(); ctx.arc(4,-2,1.8,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a7818"; ctx.lineWidth = 0.8; ctx.stroke();
}

function drawMelon(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(2,22,22,4.5,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createRadialGradient(-6,-6,4,0,0,22);
  grad.addColorStop(0,"#d4ed90"); grad.addColorStop(0.55,"#7eb44a"); grad.addColorStop(1,"#3a6818");
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,4,19,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1f4810"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(0,4,18,0,Math.PI*2); ctx.clip();
  ctx.strokeStyle = "rgba(28,68,16,0.7)"; ctx.lineWidth = 2;
  [-12,-4,4,12].forEach((x)=>{ ctx.beginPath(); ctx.moveTo(x,-16); ctx.bezierCurveTo(x+(x<0?1:-1),0,x+(x<0?2:-2),12,x+(x<0?2:-2),24); ctx.stroke(); });
  ctx.strokeStyle = "rgba(220,240,160,0.55)"; ctx.lineWidth = 1.2;
  [-8,0,8].forEach((x)=>{ ctx.beginPath(); ctx.moveTo(x,-14); ctx.bezierCurveTo(x,0,x+1,12,x+1,22); ctx.stroke(); });
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.ellipse(-7,-6,4,7,-0.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#5a3a14"; ctx.beginPath(); ctx.ellipse(-1,-16,3.5,4,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "#5a8a26"; ctx.beginPath(); ctx.moveTo(-2,-18); ctx.bezierCurveTo(-12,-22,-16,-14,-10,-10); ctx.bezierCurveTo(-6,-14,-2,-16,-2,-18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2a4a10"; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-2,-18); ctx.lineTo(-10,-12); ctx.stroke();
  ctx.strokeStyle = "#3a5a18"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(2,-18); ctx.bezierCurveTo(8,-22,14,-18,12,-14); ctx.bezierCurveTo(10,-12,14,-10,16,-14); ctx.stroke();
}

export const ICONS = {
  tile_grass_grass:         { label:"Grass",        color:"#6fa838", draw:drawGrass },
  tile_grass_meadow:        { label:"Meadow Grass", color:"#7eb84a", draw:drawMeadowGrass },
  tile_grass_spiky:         { label:"Spiky Grass",  color:"#9ec25a", draw:drawSpikyGrass },
  tile_grain_wheat:         { label:"Wheat",        color:"#e8c34c", draw:drawWheat },
  flour:               { label:"Flour",        color:"#f0e2b8", draw:drawFlour },
  plank:               { label:"Plank",        color:"#caa168", draw:drawPlank },
  dirt:                { label:"Dirt",         color:"#6b4a2a", draw:drawDirt },
  jam:                 { label:"Jam",          color:"#a72c5e", draw:drawJam },
  tile_bird_turkey:         { label:"Turkey",       color:"#a86028", draw:drawTurkey },
  tile_bird_clover:         { label:"Clover",       color:"#88c050", draw:drawClover },
  tile_bird_melon:          { label:"Melon",        color:"#86b54a", draw:drawMelon },
};
