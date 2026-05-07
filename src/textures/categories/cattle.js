// Cattle.

function shadow(ctx, w) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 22, w, 4.5, 0, 0, Math.PI*2); ctx.fill();
}

function cowBase(ctx, bodyC1, bodyC2, outline, hasHorns, hornC) {
  // Legs
  ctx.fillStyle = bodyC2;
  ctx.fillRect(-9, 13, 4, 9); ctx.fillRect(-3, 13, 4, 9); ctx.fillRect(7, 13, 4, 9); ctx.fillRect(13, 13, 4, 9);
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
  ctx.strokeRect(-9, 13, 4, 9); ctx.strokeRect(-3, 13, 4, 9); ctx.strokeRect(7, 13, 4, 9); ctx.strokeRect(13, 13, 4, 9);
  // Hooves
  ctx.fillStyle = outline;
  ctx.fillRect(-9, 21, 4, 1.5); ctx.fillRect(-3, 21, 4, 1.5); ctx.fillRect(7, 21, 4, 1.5); ctx.fillRect(13, 21, 4, 1.5);
  // Body
  const g = ctx.createRadialGradient(-2, -2, 4, 0, 4, 18);
  g.addColorStop(0, bodyC1); g.addColorStop(1, bodyC2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 4, 17, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0; ctx.stroke();
  // Tail
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0;
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.bezierCurveTo(22, -2, 22, 6, 20, 8); ctx.stroke();
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.ellipse(20, 8, 2, 3, 0.3, 0, Math.PI*2); ctx.fill();
  // Head
  ctx.fillStyle = bodyC1;
  ctx.beginPath(); ctx.ellipse(-14, -2, 7, 7, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.8; ctx.stroke();
  // Snout
  ctx.fillStyle = "#f0c8b0";
  ctx.beginPath(); ctx.ellipse(-19, 0, 4, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.ellipse(-21, -1, 0.8, 1.4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-19, -1, 0.8, 1.4, 0, 0, Math.PI*2); ctx.fill();
  // Ear
  ctx.fillStyle = bodyC2;
  ctx.beginPath(); ctx.ellipse(-10, -8, 3, 2.4, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  if (hasHorns) {
    ctx.strokeStyle = hornC; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-13, -8); ctx.bezierCurveTo(-18, -10, -22, -8, -22, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, -8); ctx.bezierCurveTo(-4, -10, 0, -8, 0, -4); ctx.stroke();
  }
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-14, -3, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-14, -3, 0.8, 0, Math.PI*2); ctx.fill();
}

function drawCow(ctx) {
  shadow(ctx, 24);
  cowBase(ctx, "#fffce8", "#d8d0c0", "#1a0e04", false);
  // Black spots
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.ellipse(-2, 2, 5, 4, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, -2, 4, 3, -0.3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, 8, 3, 2.5, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-6, 8, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  // Pink udder
  ctx.fillStyle = "#f0a0a8";
  ctx.beginPath(); ctx.ellipse(0, 14, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
}

function drawLonghorn(ctx) {
  shadow(ctx, 24);
  cowBase(ctx, "#d89048", "#7a4818", "#1a0e04", false);
  // White face blaze
  ctx.fillStyle = "#fffce8";
  ctx.beginPath(); ctx.moveTo(-18, -4); ctx.lineTo(-15, -8); ctx.lineTo(-12, 4); ctx.lineTo(-16, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  // MASSIVE horns
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-13, -7); ctx.bezierCurveTo(-22, -12, -28, -6, -26, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-9, -7); ctx.bezierCurveTo(-2, -12, 4, -6, 2, 0);
  ctx.stroke();
  // Tips
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath(); ctx.arc(-26, 0, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, 0, 2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.beginPath(); ctx.arc(-26, 0, 2, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(2, 0, 2, 0, Math.PI*2); ctx.stroke();
}

function drawTriceratops(ctx) {
  shadow(ctx, 24);
  // Legs (chunky)
  ctx.fillStyle = "#3a5a18";
  ctx.fillRect(-9, 13, 5, 9); ctx.fillRect(-2, 13, 5, 9); ctx.fillRect(8, 13, 5, 9); ctx.fillRect(15, 13, 5, 9);
  ctx.strokeStyle = "#1a2a08"; ctx.lineWidth = 1.4;
  ctx.strokeRect(-9, 13, 5, 9); ctx.strokeRect(-2, 13, 5, 9); ctx.strokeRect(8, 13, 5, 9); ctx.strokeRect(15, 13, 5, 9);
  // Body
  const g = ctx.createRadialGradient(-2, -2, 4, 0, 4, 18);
  g.addColorStop(0, "#7eb83a"); g.addColorStop(0.6, "#3a5a18"); g.addColorStop(1, "#1a2a08");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(4, 4, 17, 12, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 2.0; ctx.stroke();
  // Tail
  ctx.fillStyle = "#3a5a18";
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(26, -2); ctx.lineTo(26, 6); ctx.lineTo(18, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Spine bumps
  ctx.fillStyle = "#1a2a08";
  for (let i = 0; i < 5; i++) ctx.beginPath(), ctx.arc(0 + i*4, -7, 1.6, 0, Math.PI*2), ctx.fill();
  // Head
  ctx.fillStyle = "#3a5a18";
  ctx.beginPath(); ctx.ellipse(-13, 0, 8, 7, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Frill
  ctx.fillStyle = "#5a8a28";
  ctx.beginPath();
  ctx.moveTo(-8, -4); ctx.bezierCurveTo(-4, -14, 4, -14, 6, -2);
  ctx.bezierCurveTo(4, 4, -4, 4, -8, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Frill spikes
  ctx.fillStyle = "#fff8d0";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI*0.7 + (i / 4) * Math.PI*0.4;
    const x = -1 + Math.cos(a) * 11; const y = -1 + Math.sin(a) * 11;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a)*4, y + Math.sin(a)*4); ctx.lineTo(x + Math.cos(a + 0.2)*1, y + Math.sin(a + 0.2)*1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8; ctx.stroke();
  }
  // Three horns
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath(); ctx.moveTo(-19, 0); ctx.lineTo(-23, 2); ctx.lineTo(-19, 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-15, -6); ctx.lineTo(-17, -12); ctx.lineTo(-13, -8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-11, -6); ctx.lineTo(-9, -12); ctx.lineTo(-9, -7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.moveTo(-19, 0); ctx.lineTo(-23, 2); ctx.lineTo(-19, 3); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-15, -6); ctx.lineTo(-17, -12); ctx.lineTo(-13, -8); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11, -6); ctx.lineTo(-9, -12); ctx.lineTo(-9, -7); ctx.closePath(); ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8c0"; ctx.beginPath(); ctx.arc(-14, -1, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.fillRect(-14.4, -2, 0.8, 2);
}

export const ICONS = {
  cattle_cow:         { label:"Cow",         color:"#fffce8", draw:drawCow },
  cattle_longhorn:    { label:"Longhorn",    color:"#d89048", draw:drawLonghorn },
  cattle_triceratops: { label:"Triceratops", color:"#5a8a28", draw:drawTriceratops },
};
