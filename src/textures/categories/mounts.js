// Mounts.

function shadow(ctx, w) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 22, w, 4.5, 0, 0, Math.PI*2); ctx.fill();
}

function horseBase(ctx, bodyC1, bodyC2, maneC, outline, longLegs) {
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

function drawHorse(ctx) {
  shadow(ctx, 22);
  horseBase(ctx, "#a86838", "#5a3814", "#1a0e04", "#1a0e04", false);
}

function drawDonkey(ctx) {
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

function drawMoose(ctx) {
  shadow(ctx, 22);
  horseBase(ctx, "#5a3814", "#2a1808", "#1a0e04", "#0a0604", true);
  // Pendulous snout
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.ellipse(-19, -7, 4, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 1.2; ctx.stroke();
  // Dewlap
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-14, -2); ctx.lineTo(-10, -4); ctx.closePath(); ctx.fill();
  // Massive palmate antlers
  ctx.fillStyle = "#a87838"; ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4;
  // Left palm
  ctx.beginPath();
  ctx.moveTo(-12, -16); ctx.lineTo(-22, -18); ctx.lineTo(-24, -14); ctx.lineTo(-22, -12);
  ctx.lineTo(-26, -10); ctx.lineTo(-22, -8); ctx.lineTo(-18, -10); ctx.lineTo(-14, -12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Right palm
  ctx.beginPath();
  ctx.moveTo(-9, -16); ctx.lineTo(0, -18); ctx.lineTo(2, -14); ctx.lineTo(0, -12);
  ctx.lineTo(4, -10); ctx.lineTo(0, -8); ctx.lineTo(-4, -10); ctx.lineTo(-7, -12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawMammoth(ctx) {
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
  // Tusks — curved up
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath();
  ctx.moveTo(-16, 0); ctx.bezierCurveTo(-22, 6, -22, -8, -14, -8); ctx.lineTo(-13, -2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.bezierCurveTo(-6, 6, -6, -8, -10, -8); ctx.lineTo(-12, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.0; ctx.stroke();
  // Ear
  ctx.fillStyle = "#5a3414";
  ctx.beginPath(); ctx.ellipse(-8, -8, 4, 5, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-13, -3, 1.3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-13, -3, 0.8, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  mount_horse:   { label:"Horse",   color:"#a86838", draw:drawHorse },
  mount_donkey:  { label:"Donkey",  color:"#8a8478", draw:drawDonkey },
  mount_moose:   { label:"Moose",   color:"#5a3814", draw:drawMoose },
  mount_mammoth: { label:"Mammoth", color:"#a87838", draw:drawMammoth },
};
