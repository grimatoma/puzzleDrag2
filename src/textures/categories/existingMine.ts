// Existing mine icons — ported verbatim from src/textures/mineIcons.js

function drawStone(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(2,22,22,4,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createLinearGradient(0,-22,0,22);
  grad.addColorStop(0,"#cfd5da"); grad.addColorStop(0.5,"#9da3a8"); grad.addColorStop(1,"#5e6469");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(-22,5); ctx.lineTo(-18,-16); ctx.lineTo(-2,-22); ctx.lineTo(15,-19); ctx.lineTo(24,-2); ctx.lineTo(20,18); ctx.lineTo(-2,22); ctx.lineTo(-18,16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a3e44"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = "rgba(58,62,68,0.65)"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2,-22); ctx.lineTo(-6,-2); ctx.lineTo(-22,5);
  ctx.moveTo(-6,-2); ctx.lineTo(15,-19);
  ctx.moveTo(-6,-2); ctx.lineTo(20,18);
  ctx.moveTo(-6,-2); ctx.lineTo(-2,22);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.moveTo(-18,-16); ctx.lineTo(-2,-22); ctx.lineTo(-6,-2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(58,62,68,0.55)";
  [[2,-10],[10,0],[-10,8],[14,10],[-14,-2]].forEach(([dx,dy])=>{ ctx.beginPath(); ctx.arc(dx,dy,0.9,0,Math.PI*2); ctx.fill(); });
}

function drawBlock(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0,22,22,4,0,0,Math.PI*2); ctx.fill();
  const top = ctx.createLinearGradient(0,-22,0,-2);
  top.addColorStop(0,"#cfd5da"); top.addColorStop(1,"#7c8388");
  ctx.fillStyle = top;
  ctx.beginPath(); ctx.moveTo(-18,-2); ctx.lineTo(0,-18); ctx.lineTo(18,-2); ctx.lineTo(0,6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1d20"; ctx.lineWidth = 2; ctx.stroke();
  const left = ctx.createLinearGradient(-18,0,0,0);
  left.addColorStop(0,"#9da3a8"); left.addColorStop(1,"#4e5358");
  ctx.fillStyle = left;
  ctx.beginPath(); ctx.moveTo(-18,-2); ctx.lineTo(0,6); ctx.lineTo(0,22); ctx.lineTo(-18,14); ctx.closePath(); ctx.fill(); ctx.stroke();
  const right = ctx.createLinearGradient(0,0,18,0);
  right.addColorStop(0,"#7c8388"); right.addColorStop(1,"#3a3e44");
  ctx.fillStyle = right;
  ctx.beginPath(); ctx.moveTo(18,-2); ctx.lineTo(0,6); ctx.lineTo(0,22); ctx.lineTo(18,14); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Top face highlight (lighter rim)
  ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-17,-2); ctx.lineTo(0,-17); ctx.lineTo(17,-2); ctx.stroke();
  // Replace the previous double-chevron embossing (read as upload arrows)
  // with a stone-block grid: one horizontal seam plus two staggered
  // verticals so the cube looks like cut masonry.
  ctx.strokeStyle = "rgba(40,42,46,0.7)"; ctx.lineWidth = 1.4;
  // Horizontal mortar seam across the front-left face
  ctx.beginPath();
  ctx.moveTo(-15, 6); ctx.lineTo(0, 14);
  ctx.stroke();
  // Horizontal mortar seam across the front-right face
  ctx.beginPath();
  ctx.moveTo(0, 14); ctx.lineTo(15, 6);
  ctx.stroke();
  // Two short vertical seams (staggered top/bottom) on the left face
  ctx.beginPath();
  ctx.moveTo(-10, 2); ctx.lineTo(-10, 6);
  ctx.moveTo(-5, 14); ctx.lineTo(-5, 18);
  ctx.stroke();
  // Same on the right face
  ctx.beginPath();
  ctx.moveTo(10, 2); ctx.lineTo(10, 6);
  ctx.moveTo(5, 14); ctx.lineTo(5, 18);
  ctx.stroke();
  // Small chip notch on the top edge — adds a "carved stone" feel and
  // breaks any residual icon symmetry that might still read as an arrow.
  ctx.fillStyle = "#5a5e62";
  ctx.beginPath();
  ctx.moveTo(-4, -13); ctx.lineTo(-1, -16); ctx.lineTo(1, -12); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1d20"; ctx.lineWidth = 0.8;
  ctx.stroke();
}

// Iron ore — warm brown-grey rock shot through with rusty oxidation and
// metallic iron nodules embedded along the facets (distinct from silver ore).
function drawMineIronOre(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(2,22,22,4,0,0,Math.PI*2); ctx.fill();
  // Warm brown-grey body so it is unmistakably not the cool silver ore.
  const grad = ctx.createLinearGradient(0,-22,0,22);
  grad.addColorStop(0,"#b8a89a"); grad.addColorStop(0.5,"#7a6a5c"); grad.addColorStop(1,"#3e342c");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(-21,4); ctx.lineTo(-16,-17); ctx.lineTo(2,-22); ctx.lineTo(18,-14); ctx.lineTo(23,2); ctx.lineTo(15,19); ctx.lineTo(-6,22); ctx.lineTo(-19,14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#241c16"; ctx.lineWidth = 2.2; ctx.stroke();
  // Facet edges define the stone planes the ore is embedded in.
  ctx.strokeStyle = "rgba(36,28,22,0.6)"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(2,-22); ctx.lineTo(-2,-4); ctx.lineTo(-21,4);
  ctx.moveTo(-2,-4); ctx.lineTo(18,-14);
  ctx.moveTo(-2,-4); ctx.lineTo(23,2);
  ctx.moveTo(-2,-4); ctx.lineTo(15,19);
  ctx.moveTo(-2,-4); ctx.lineTo(-6,22);
  ctx.stroke();
  // Highlight facet (catches the light), warm tone.
  ctx.fillStyle = "rgba(255,244,225,0.3)";
  ctx.beginPath(); ctx.moveTo(-16,-17); ctx.lineTo(2,-22); ctx.lineTo(-2,-4); ctx.closePath(); ctx.fill();
  // Metallic iron nodules embedded along the facets — angular clumps that
  // follow the stone, not a single ribbon laid on top.
  const nodule = (nx: number, ny: number, s: number) => {
    const g = ctx.createRadialGradient(nx-s*0.4, ny-s*0.4, s*0.2, nx, ny, s);
    g.addColorStop(0,"#cfd4da"); g.addColorStop(0.6,"#8a8e94"); g.addColorStop(1,"#4a4e54");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(nx-s, ny); ctx.lineTo(nx-s*0.3, ny-s); ctx.lineTo(nx+s*0.8, ny-s*0.4);
    ctx.lineTo(nx+s, ny+s*0.5); ctx.lineTo(nx, ny+s); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(30,24,18,0.7)"; ctx.lineWidth = 0.7; ctx.stroke();
  };
  nodule(-7, 3, 6);
  nodule(7, -2, 5);
  nodule(2, 12, 4.5);
  // Bright specular dots on the nodules.
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  [[-9,1,1.2],[5,-4,1.0],[0,10,0.9]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
  // Rusty orange oxidation flecks — iron's signature tell.
  ctx.fillStyle = "#c2622a";
  [[12,8],[-14,-6],[15,-7],[-10,13],[8,-13]].forEach(([sx,sy])=>{
    ctx.beginPath(); ctx.arc(sx,sy,1.3,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle = "rgba(255,170,90,0.7)";
  [[12.5,7.5],[-13.5,-6.5],[15.5,-7.5]].forEach(([sx,sy])=>{
    ctx.beginPath(); ctx.arc(sx,sy,0.5,0,Math.PI*2); ctx.fill();
  });
}

// Copper ore — warm orange-brown rock body with bright copper veins.
function drawMineCopperOre(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(2,22,22,4,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createLinearGradient(0,-22,0,22);
  grad.addColorStop(0,"#d8a070"); grad.addColorStop(0.5,"#8a5430"); grad.addColorStop(1,"#3e2510");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(-21,4); ctx.lineTo(-16,-17); ctx.lineTo(2,-22); ctx.lineTo(18,-14); ctx.lineTo(23,2); ctx.lineTo(15,19); ctx.lineTo(-6,22); ctx.lineTo(-19,14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,235,200,0.28)";
  ctx.beginPath(); ctx.moveTo(-16,-17); ctx.lineTo(2,-22); ctx.lineTo(-2,-6); ctx.closePath(); ctx.fill();
  // Copper vein — bright orange running diagonally
  const vein = ctx.createLinearGradient(-20,0,20,0);
  vein.addColorStop(0,"#ff944a"); vein.addColorStop(0.5,"#ffc878"); vein.addColorStop(1,"#a04818");
  ctx.fillStyle = vein;
  ctx.beginPath(); ctx.moveTo(-18,-4); ctx.bezierCurveTo(-6,-10,6,4,20,-2); ctx.lineTo(20,2); ctx.bezierCurveTo(6,8,-6,-6,-18,0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a2a08"; ctx.lineWidth = 0.8; ctx.stroke();
  // Specular streak
  ctx.strokeStyle = "rgba(255,240,210,0.8)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-16,-3); ctx.bezierCurveTo(-4,-8,4,4,18,-1); ctx.stroke();
  // Verdigris (green oxidation) flecks — copper's signature tarnish
  ctx.fillStyle = "#5ab078";
  [[8,8],[-10,12],[14,-6]].forEach(([sx,sy])=>{
    ctx.beginPath(); ctx.arc(sx,sy,1.1,0,Math.PI*2); ctx.fill();
  });
  // Brighter copper sparkles
  ctx.fillStyle = "#ffd9a0";
  [[4,-14],[-14,-8],[-4,4]].forEach(([sx,sy])=>{
    ctx.beginPath(); ctx.arc(sx,sy,0.9,0,Math.PI*2); ctx.fill();
  });
}

function drawCoal(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(2,22,22,4,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createLinearGradient(0,-22,0,22);
  grad.addColorStop(0,"#4a4a52"); grad.addColorStop(0.5,"#1c1c20"); grad.addColorStop(1,"#000000");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(-22,4); ctx.lineTo(-14,-14); ctx.lineTo(-2,-22); ctx.lineTo(12,-19); ctx.lineTo(22,-7); ctx.lineTo(24,8); ctx.lineTo(15,21); ctx.lineTo(-1,23); ctx.lineTo(-16,18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0c"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = "rgba(80,80,90,0.7)"; ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-2,-22); ctx.lineTo(-6,-4); ctx.lineTo(-22,4);
  ctx.moveTo(-6,-4); ctx.lineTo(12,-19);
  ctx.moveTo(-6,-4); ctx.lineTo(22,-7);
  ctx.moveTo(-6,-4); ctx.lineTo(15,21);
  ctx.moveTo(-6,-4); ctx.lineTo(-1,23);
  ctx.stroke();
  ctx.fillStyle = "rgba(140,140,150,0.4)";
  ctx.beginPath(); ctx.moveTo(-14,-14); ctx.lineTo(-2,-22); ctx.lineTo(-6,-4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(200,200,220,0.7)";
  [[-8,-10],[4,-12],[10,4],[-12,8]].forEach(([sx,sy])=>{ ctx.beginPath(); ctx.arc(sx,sy,1.2,0,Math.PI*2); ctx.fill(); });
}

function drawCoke(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0,22,18,4,0,0,Math.PI*2); ctx.fill();
  const hex6 = (rad: number) => {
    ctx.beginPath();
    for (let i=0; i<6; i++) {
      const a = -Math.PI/2 + (i*Math.PI)/3;
      const x = Math.cos(a)*rad; const y = Math.sin(a)*rad;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
  };
  const grad = ctx.createRadialGradient(0,0,4,0,0,22);
  grad.addColorStop(0,"#7a7a86"); grad.addColorStop(0.6,"#3a3a44"); grad.addColorStop(1,"#1a1a20");
  ctx.fillStyle = grad; hex6(22); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 2.2; ctx.stroke();
  hex6(14); ctx.fillStyle = "#2a2a32"; ctx.fill();
  ctx.strokeStyle = "rgba(160,160,180,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  const glow = ctx.createRadialGradient(0,0,1,0,0,14);
  glow.addColorStop(0,"rgba(255,160,40,0.95)"); glow.addColorStop(0.5,"rgba(220,80,20,0.55)"); glow.addColorStop(1,"rgba(60,10,0,0)");
  ctx.fillStyle = glow; hex6(13); ctx.fill();
  // Cluster of charred coke lumps with hot glowing cracks between them.
  const lumps: [number, number, number][] = [
    [-5,-6,5], [5,-4,4.6], [-3,3,4.8], [6,5,4], [-7,3,3.4], [1,8,3.4],
  ];
  // Dark charred lump bodies first.
  ctx.fillStyle = "#241a16";
  ctx.strokeStyle = "#120b08"; ctx.lineWidth = 0.8;
  lumps.forEach(([lx,ly,lr])=>{ ctx.beginPath(); ctx.arc(lx,ly,lr,0,Math.PI*2); ctx.fill(); ctx.stroke(); });
  // Top-light sheen on the upper lumps so they read as 3D coal chunks.
  ctx.fillStyle = "rgba(120,90,80,0.55)";
  [[-6,-8,2.2],[4,-6,2.0],[-4,1,2.0]].forEach(([hx,hy,hr])=>{ ctx.beginPath(); ctx.arc(hx,hy,hr,0,Math.PI*2); ctx.fill(); });
  // Hot glowing cracks winding through the seams between the lumps.
  ctx.strokeStyle = "rgba(255,150,40,0.95)"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9,-2); ctx.lineTo(-2,-1); ctx.lineTo(2,-4); ctx.lineTo(9,-3);
  ctx.moveTo(-2,-1); ctx.lineTo(0,4); ctx.lineTo(4,8);
  ctx.moveTo(0,4); ctx.lineTo(-5,7);
  ctx.stroke();
  // Bright yellow core of the cracks.
  ctx.strokeStyle = "rgba(255,230,150,0.9)"; ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-9,-2); ctx.lineTo(-2,-1); ctx.lineTo(2,-4); ctx.lineTo(9,-3);
  ctx.moveTo(-2,-1); ctx.lineTo(0,4); ctx.lineTo(4,8);
  ctx.stroke();
  // A couple of bright ember highlights on lump edges.
  ctx.fillStyle = "rgba(255,180,60,0.85)";
  [[-4,-2,1.1],[3,2,1.0],[7,-1,0.9],[-2,6,0.9]].forEach(([ex,ey,er])=>{ ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.fill(); });
  // Specular gleam along the upper-left facet edge (attached to the body,
  // not floating above it).
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-3,-20); ctx.lineTo(-15,-13); ctx.stroke();
}

function drawGem(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0,24,18,4,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(22,-10); ctx.lineTo(14,22); ctx.lineTo(-14,22); ctx.lineTo(-22,-10); ctx.closePath();
  const body = ctx.createLinearGradient(-20,-20,20,22);
  body.addColorStop(0,"#e0fbff"); body.addColorStop(0.4,"#65e5ff"); body.addColorStop(1,"#0a8aaa");
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = "#0a4a5a"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = "rgba(20,80,100,0.7)"; ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-22,-10); ctx.lineTo(-8,-6); ctx.lineTo(0,-26);
  ctx.moveTo(0,-26); ctx.lineTo(8,-6); ctx.lineTo(22,-10);
  ctx.moveTo(-8,-6); ctx.lineTo(-14,22);
  ctx.moveTo(8,-6); ctx.lineTo(14,22);
  ctx.moveTo(-8,-6); ctx.lineTo(8,-6);
  ctx.moveTo(-8,-6); ctx.lineTo(0,22);
  ctx.moveTo(8,-6); ctx.lineTo(0,22);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.moveTo(-8,-6); ctx.lineTo(0,-26); ctx.lineTo(8,-6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-20,-10); ctx.lineTo(0,-25); ctx.stroke();
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(-2,-16,2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(8,6,1.4,0,Math.PI*2); ctx.fill();
}

function drawCutgem(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0,22,22,5,0,0,Math.PI*2); ctx.fill();
  const girdle = (rad: number) => {
    ctx.beginPath();
    for (let i=0; i<8; i++) {
      const a = (i*Math.PI)/4 + Math.PI/8;
      const x = Math.cos(a)*rad; const y = Math.sin(a)*rad;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
  };
  const body = ctx.createRadialGradient(0,0,2,0,0,24);
  body.addColorStop(0,"#ffffff"); body.addColorStop(0.4,"#a3f0ff"); body.addColorStop(1,"#1686a3");
  ctx.fillStyle = body; girdle(24); ctx.fill();
  ctx.strokeStyle = "#0a4a5a"; ctx.lineWidth = 2.2; ctx.stroke();
  girdle(15); ctx.fillStyle = "rgba(180,240,255,0.7)"; ctx.fill();
  ctx.strokeStyle = "rgba(20,80,100,0.7)"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = "rgba(20,80,100,0.7)"; ctx.lineWidth = 1.1;
  for (let i=0; i<8; i++) {
    const a = (i*Math.PI)/4 + Math.PI/8;
    const x = Math.cos(a)*24; const y = Math.sin(a)*24;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(x,y); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 2;
  [0, Math.PI/4, Math.PI/2, (3*Math.PI)/4].forEach((a)=>{ ctx.beginPath(); ctx.moveTo(-Math.cos(a)*8,-Math.sin(a)*8); ctx.lineTo(Math.cos(a)*8,Math.sin(a)*8); ctx.stroke(); });
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  [[-12,-8,1.4],[10,12,1.6],[14,-10,1.2]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
}

function drawGold(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(2,22,22,5,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createRadialGradient(-6,-10,2,0,0,26);
  grad.addColorStop(0,"#fff8b8"); grad.addColorStop(0.4,"#ffd34c"); grad.addColorStop(0.8,"#c08a18"); grad.addColorStop(1,"#7a4f08");
  ctx.fillStyle = grad;
  // Irregular faceted nugget silhouette (raw gold chunk, not a smooth sphere).
  ctx.beginPath();
  ctx.moveTo(-20,-2);
  ctx.lineTo(-13,-15);
  ctx.lineTo(-1,-21);
  ctx.lineTo(10,-18);
  ctx.lineTo(15,-9);
  ctx.lineTo(23,-3);
  ctx.lineTo(19,9);
  ctx.lineTo(10,16);
  ctx.lineTo(1,22);
  ctx.lineTo(-9,19);
  ctx.lineTo(-18,11);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e3a08"; ctx.lineWidth = 2.2; ctx.stroke();
  // Internal facet edges — angular planes that read as a crystalline metal
  // chunk. Two small hubs (not one) so it doesn't read as a radial pie.
  ctx.strokeStyle = "rgba(122,79,8,0.6)"; ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-1,-21); ctx.lineTo(-5,-3); ctx.lineTo(-20,-2);
  ctx.moveTo(-5,-3); ctx.lineTo(15,-9);
  ctx.moveTo(15,-9); ctx.lineTo(8,4); ctx.lineTo(19,9);
  ctx.moveTo(8,4); ctx.lineTo(1,22);
  ctx.moveTo(-5,-3); ctx.lineTo(-6,11); ctx.lineTo(-18,11);
  ctx.moveTo(-6,11); ctx.lineTo(1,22);
  ctx.stroke();
  // Angular facet cavities (recessed planes), not round pits — kept subtle.
  ctx.fillStyle = "rgba(122,79,8,0.42)";
  ctx.beginPath(); ctx.moveTo(9,-7); ctx.lineTo(16,-6); ctx.lineTo(13,2); ctx.lineTo(8,1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-15,3); ctx.lineTo(-7,1); ctx.lineTo(-7,10); ctx.lineTo(-15,9); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-3,13); ctx.lineTo(5,11); ctx.lineTo(1,20); ctx.lineTo(-4,17); ctx.closePath(); ctx.fill();
  // Bright metallic highlight edge on the lit upper-left facet.
  ctx.fillStyle = "rgba(255,255,200,0.85)";
  ctx.beginPath(); ctx.moveTo(-13,-15); ctx.lineTo(-1,-21); ctx.lineTo(-4,-4); ctx.lineTo(-12,-6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,255,230,0.55)";
  ctx.beginPath(); ctx.moveTo(-1,-21); ctx.lineTo(8,-17); ctx.lineTo(2,-9); ctx.lineTo(-4,-12); ctx.closePath(); ctx.fill();
  // Crisp specular sparkles on the facet ridges.
  ctx.fillStyle = "rgba(255,255,180,0.9)";
  [[12,-7,1.3],[15,4,1.1],[-1,15,1.0],[6,-15,0.9],[-15,0,0.9]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
}

// Silver ore — bright, cool blue-grey rock with a single clean white-silver
// vein and crystalline flakes (vein motif kept; iron uses nodules instead).
function drawMineSilver(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(2,22,22,4,0,0,Math.PI*2); ctx.fill();
  // Cooler, brighter blue-grey body to contrast the warm iron ore.
  const grad = ctx.createLinearGradient(0,-22,0,22);
  grad.addColorStop(0,"#eaf0f6"); grad.addColorStop(0.5,"#aeb8c4"); grad.addColorStop(1,"#697482");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(-21,4); ctx.lineTo(-16,-17); ctx.lineTo(2,-22); ctx.lineTo(18,-14); ctx.lineTo(23,2); ctx.lineTo(15,19); ctx.lineTo(-6,22); ctx.lineTo(-19,14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#39434f"; ctx.lineWidth = 2.2; ctx.stroke();
  // Bright lit facet, near-white with a cool cast.
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.moveTo(-16,-17); ctx.lineTo(2,-22); ctx.lineTo(-2,-6); ctx.closePath(); ctx.fill();
  // Bright silver vein — whiter and cooler than before.
  const seam = ctx.createLinearGradient(-20,0,20,0);
  seam.addColorStop(0,"#c4d0dc"); seam.addColorStop(0.5,"#ffffff"); seam.addColorStop(1,"#8898a8");
  ctx.fillStyle = seam;
  ctx.beginPath(); ctx.moveTo(-18,-2); ctx.bezierCurveTo(-6,-8,6,4,20,0); ctx.lineTo(20,3); ctx.bezierCurveTo(6,9,-6,-3,-18,2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a6a7c"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-15,0); ctx.bezierCurveTo(-4,-5,4,5,16,1); ctx.stroke();
  // Crystalline silver flakes — small diamond facets, not round dots.
  ctx.fillStyle = "#ffffff";
  [[8,9],[-11,11],[5,-14],[-14,-7],[13,-7]].forEach(([sx,sy])=>{
    ctx.beginPath();
    ctx.moveTo(sx,sy-2); ctx.lineTo(sx+1.6,sy); ctx.lineTo(sx,sy+2); ctx.lineTo(sx-1.6,sy); ctx.closePath();
    ctx.fill();
  });
  // Tiny blue-grey shadow under each flake so they read as raised crystals.
  ctx.fillStyle = "rgba(80,100,120,0.55)";
  [[8.4,9.6],[-10.6,11.6],[5.4,-13.4]].forEach(([sx,sy])=>{ ctx.beginPath(); ctx.arc(sx,sy,0.6,0,Math.PI*2); ctx.fill(); });
}

// Silver bar — a small stack of poured metallic ingots in 3/4 view, so the
// trapezoidal ingot cross-section reads unmistakably as a bar (not a crate).
function drawSilverBar(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(2,24,24,5,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a4048"; ctx.lineWidth = 2; ctx.lineJoin = "round";
  // Draw one ingot in 3/4 view at (ox,oy). depth = perspective offset.
  const ingot = (ox: number, oy: number) => {
    const dx = 7, dy = -7;           // back-corner perspective offset
    const halfTop = 13, halfBot = 17; // trapezoid: wider at the base
    // Front face (trapezoid, wider at the bottom)
    const front = ctx.createLinearGradient(0,oy-8,0,oy+10);
    front.addColorStop(0,"#e6ebf1"); front.addColorStop(0.5,"#b6bec8"); front.addColorStop(1,"#7c848e");
    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(ox-halfTop, oy-8);
    ctx.lineTo(ox+halfTop, oy-8);
    ctx.lineTo(ox+halfBot, oy+10);
    ctx.lineTo(ox-halfBot, oy+10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Right side face (the receding end of the bar)
    const side = ctx.createLinearGradient(ox+halfTop,0,ox+halfTop+dx,0);
    side.addColorStop(0,"#9aa2ac"); side.addColorStop(1,"#5e656e");
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(ox+halfTop, oy-8);
    ctx.lineTo(ox+halfTop+dx, oy-8+dy);
    ctx.lineTo(ox+halfBot+dx, oy+10+dy);
    ctx.lineTo(ox+halfBot, oy+10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Top face (parallelogram) — brightest, catches the light
    const top = ctx.createLinearGradient(0,oy-8+dy,0,oy-8);
    top.addColorStop(0,"#ffffff"); top.addColorStop(1,"#cdd4dc");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(ox-halfTop, oy-8);
    ctx.lineTo(ox-halfTop+dx, oy-8+dy);
    ctx.lineTo(ox+halfTop+dx, oy-8+dy);
    ctx.lineTo(ox+halfTop, oy-8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Top edge highlight along the front lip
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(ox-halfTop+2, oy-7); ctx.lineTo(ox+halfTop-2, oy-7); ctx.stroke();
    ctx.strokeStyle = "#3a4048"; ctx.lineWidth = 2;
  };
  // Bottom ingot, then a single ingot resting on top — a clear stack.
  ingot(-4, 11);
  ingot(-1, -7);
}

export const ICONS = {
  tile_mine_stone:       { label:"Stone",       color:"#8a8f94", draw:drawStone },
  tile_mine_silver:      { label:"Silver Ore",  color:"#c2c8d0", draw:drawMineSilver },
  silver_bar:            { label:"Silver Bar",  color:"#d6dbe2", draw:drawSilverBar },
  block:            { label:"Block",       color:"#7e858a", draw:drawBlock },
  tile_mine_iron_ore:    { label:"Iron Ore",    color:"#a89890", draw:drawMineIronOre },
  tile_mine_copper_ore:  { label:"Copper Ore",  color:"#c97f4f", draw:drawMineCopperOre },
  tile_mine_coal:        { label:"Coal",        color:"#3a3a40", draw:drawCoal },
  coke:             { label:"Coke",        color:"#5a5a64", draw:drawCoke },
  tile_mine_gem:         { label:"Gem (rough)", color:"#6dd5e8", draw:drawGem },
  cut_gem:          { label:"Cut Gem",     color:"#7ce0ff", draw:drawCutgem },
  tile_mine_gold:        { label:"Gold Nugget", color:"#e8b830", draw:drawGold },
};
