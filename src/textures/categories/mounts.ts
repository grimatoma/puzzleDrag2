// Mounts.

function shadow(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 22, w, 4.5, 0, 0, Math.PI*2); ctx.fill();
}

function horseBase(ctx: CanvasRenderingContext2D, bodyC1: string, bodyC2: string, maneC: string, outline: string, longLegs: boolean) {
  const legY = longLegs ? 12 : 13;
  const legH = longLegs ? 10 : 9;
  ctx.fillStyle = bodyC2;
  ctx.fillRect(-9, legY, 3, legH); ctx.fillRect(-3, legY, 3, legH); ctx.fillRect(7, legY, 3, legH); ctx.fillRect(13, legY, 3, legH);
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
  ctx.strokeRect(-9, legY, 3, legH); ctx.strokeRect(-3, legY, 3, legH); ctx.strokeRect(7, legY, 3, legH); ctx.strokeRect(13, legY, 3, legH);
  ctx.fillStyle = outline;
  ctx.fillRect(-9, legY+legH-1, 3, 1.5); ctx.fillRect(-3, legY+legH-1, 3, 1.5);
  ctx.fillRect(7, legY+legH-1, 3, 1.5); ctx.fillRect(13, legY+legH-1, 3, 1.5);
  // Body
  const g = ctx.createRadialGradient(-2, -2, 4, 0, 4, 18);
  g.addColorStop(0, bodyC1); g.addColorStop(1, bodyC2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 4, 16, 9, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0; ctx.stroke();
  // Tail
  ctx.fillStyle = maneC;
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.bezierCurveTo(24, 2, 24, 14, 18, 14); ctx.bezierCurveTo(20, 8, 18, 4, 16, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.4; ctx.stroke();
  // Long neck
  ctx.fillStyle = bodyC1;
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.bezierCurveTo(-16, -4, -18, -12, -12, -14);
  ctx.bezierCurveTo(-6, -12, -6, -2, -10, 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.6; ctx.stroke();
  // Mane
  ctx.fillStyle = maneC;
  ctx.beginPath();
  ctx.moveTo(-15, -10); ctx.bezierCurveTo(-12, -14, -8, -10, -8, -4);
  ctx.lineTo(-12, -2); ctx.bezierCurveTo(-15, -6, -16, -8, -15, -10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  // Head
  ctx.fillStyle = bodyC1;
  ctx.beginPath(); ctx.ellipse(-14, -14, 5, 5, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-17, -10, 4, 3, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.4; ctx.stroke();
  // Ear
  ctx.fillStyle = maneC;
  ctx.beginPath(); ctx.moveTo(-12, -18); ctx.lineTo(-10, -22); ctx.lineTo(-9, -16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-14, -14, 1.0, 0, Math.PI*2); ctx.fill();
  // Snout
  ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-19, -9, 0.7, 0, Math.PI*2); ctx.fill();
}

function drawHorse(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  horseBase(ctx, "#a86838", "#5a3814", "#1a0e04", "#1a0e04", false);
}

function drawDonkey(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 20);
  horseBase(ctx, "#8a8478", "#3a3830", "#1a1a18", "#0a0a08", false);
  // Big donkey ears (overdraw)
  ctx.fillStyle = "#3a3830";
  ctx.beginPath(); ctx.moveTo(-13, -18); ctx.lineTo(-11, -26); ctx.lineTo(-9, -16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(-7, -25); ctx.lineTo(-6, -16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a08"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.moveTo(-13, -18); ctx.lineTo(-11, -26); ctx.lineTo(-9, -16); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(-7, -25); ctx.lineTo(-6, -16); ctx.closePath(); ctx.stroke();
}

function drawMoose(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  horseBase(ctx, "#5a3814", "#2a1808", "#1a0e04", "#0a0604", true);
  // Pendulous snout
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.ellipse(-19, -7, 4, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 1.2; ctx.stroke();
  // Dewlap
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-14, -2); ctx.lineTo(-10, -4); ctx.closePath(); ctx.fill();
  // Massive palmate antlers. The head is at (-14,-14) so antlers sprout
  // upward from there and flare LEFT (out of the screen) and RIGHT (over
  // the body). Each one is a wide hand-like palm with 4 finger-tines
  // along the outer edge — moose antlers are unmistakable when drawn big.
  const drawAntler = (anchorX: number, anchorY: number, mirror: boolean) => {
    ctx.save();
    ctx.translate(anchorX, anchorY);
    if (mirror) ctx.scale(-1, 1);
    // Base / pedicel — small column rising from the head
    ctx.fillStyle = "#7a5018";
    ctx.beginPath();
    ctx.moveTo(-1.5, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(3, -4);
    ctx.lineTo(1.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2; ctx.stroke();
    // Palmate fan with prominent fingers running along the top/outer edge
    ctx.fillStyle = "#c89548";
    ctx.beginPath();
    ctx.moveTo(-2, -4);     // base inner
    ctx.lineTo(-2, -10);    // up the inner side
    ctx.lineTo(-4, -14);    // inner-most tine
    ctx.lineTo(  2, -12);
    ctx.lineTo(  6, -16);   // tine 2
    ctx.lineTo( 10, -12);
    ctx.lineTo( 14, -16);   // tine 3
    ctx.lineTo( 18, -12);
    ctx.lineTo( 22, -14);   // tine 4 (outermost)
    ctx.lineTo( 20, -8);    // outer-bottom corner
    ctx.lineTo( 14, -6);    // bottom curve back to base
    ctx.lineTo(  6, -4);
    ctx.lineTo(  2, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
    // Inner shadow band along the bottom of the palm so the fan looks
    // 3-dimensional rather than flat.
    ctx.fillStyle = "rgba(58,32,8,0.45)";
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(20, -8);
    ctx.lineTo(14, -6);
    ctx.lineTo(2, -4);
    ctx.closePath();
    ctx.fill();
    // Tine ridge lines (catches the eye)
    ctx.strokeStyle = "rgba(80,50,12,0.6)"; ctx.lineWidth = 0.8;
    [[2,-12],[10,-12],[18,-12]].forEach(([x,y]) => {
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(x, y);
      ctx.stroke();
    });
    ctx.restore();
  };
  // Left antler — sprouts from the top of the head (-14,-15) and sweeps
  // out and back to the left, off the head.
  ctx.save();
  ctx.translate(-14, -15);
  // mirror horizontally so the "fingers" point left
  ctx.scale(-1, 1);
  drawAntler(0, 0, false);
  ctx.restore();
  // Right antler — sprouts from the same crown and sweeps right, OVER
  // the body. (The body is darker than the antlers so they read.)
  drawAntler(-14, -15, false);
}

function drawMammoth(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 26);
  // Legs
  ctx.fillStyle = "#5a3814";
  ctx.fillRect(-10, 13, 5, 9); ctx.fillRect(-3, 13, 5, 9); ctx.fillRect(8, 13, 5, 9); ctx.fillRect(15, 13, 5, 9);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4;
  ctx.strokeRect(-10, 13, 5, 9); ctx.strokeRect(-3, 13, 5, 9); ctx.strokeRect(8, 13, 5, 9); ctx.strokeRect(15, 13, 5, 9);
  // Body — woolly
  const g = ctx.createRadialGradient(-2, -2, 4, 0, 4, 22);
  g.addColorStop(0, "#a87838"); g.addColorStop(0.6, "#5a3414"); g.addColorStop(1, "#2a1808");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(4, 2, 18, 13, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 2.0; ctx.stroke();
  // Wool tufts
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2; const r = 14;
    const x1 = 4 + Math.cos(a) * r; const y1 = 2 + Math.sin(a) * r * 0.85;
    const x2 = x1 + Math.cos(a) * 3; const y2 = y1 + Math.sin(a) * 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // Domed head
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.ellipse(-13, -2, 8, 9, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Wool fringe on head
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + (i / 5) * Math.PI;
    const x1 = -13 + Math.cos(a) * 8; const y1 = -2 + Math.sin(a) * 9;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(a)*3, y1 + Math.sin(a)*3); ctx.stroke();
  }
  // Trunk
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.moveTo(-19, -4); ctx.bezierCurveTo(-24, 2, -22, 12, -16, 12);
  ctx.bezierCurveTo(-14, 12, -14, 8, -16, 8); ctx.bezierCurveTo(-20, 6, -18, 0, -16, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "rgba(26,14,4,0.6)"; ctx.lineWidth = 0.9;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(-18, 0 + i*3, 3.5, -0.6, 0.6); ctx.stroke();
  }
  // Tusks — much larger and curling forward/up so they read instantly as
  // tusks instead of tiny outlines lost inside the trunk.
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.bezierCurveTo(-26, 6, -28, -10, -18, -14);
  ctx.bezierCurveTo(-16, -10, -14, -4, -12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3814";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Right tusk (smaller, behind — gives a sense of two)
  ctx.fillStyle = "#e8d8a8";
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.bezierCurveTo(-2, 6, -2, -8, -8, -12);
  ctx.bezierCurveTo(-9, -8, -10, -2, -9, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3814";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  // Tusk highlight stripe (catches eye, sells the ivory)
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-22, -6);
  ctx.bezierCurveTo(-18, -10, -16, -8, -14, -2);
  ctx.stroke();
  // Ear
  ctx.fillStyle = "#5a3414";
  ctx.beginPath(); ctx.ellipse(-8, -8, 4, 5, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-13, -3, 1.3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-13, -3, 0.8, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  tile_mount_horse:   { label:"Horse",   color:"#a86838", draw:drawHorse },
  tile_mount_donkey:  { label:"Donkey",  color:"#8a8478", draw:drawDonkey },
  tile_mount_moose:   { label:"Moose",   color:"#5a3814", draw:drawMoose },
  tile_mount_mammoth: { label:"Mammoth", color:"#a87838", draw:drawMammoth },
};
