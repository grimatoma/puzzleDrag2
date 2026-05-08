// Hazard tile icons (rats, fire, wolf). Drawn at canvas origin (0,0).

function drawShadow(ctx, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRatsHazard(ctx) {
  drawShadow(ctx, 22, 4);
  // Rat body (sitting)
  const body = ctx.createRadialGradient(-4, 0, 4, 0, 4, 18);
  body.addColorStop(0, "#7a6048");
  body.addColorStop(0.6, "#3a2818");
  body.addColorStop(1, "#1a0e08");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 6, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Head
  ctx.fillStyle = "#5a4830";
  ctx.beginPath();
  ctx.ellipse(-12, -2, 8, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Snout (point)
  ctx.fillStyle = "#5a4830";
  ctx.beginPath();
  ctx.moveTo(-18, -1);
  ctx.lineTo(-22, 1);
  ctx.lineTo(-18, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Nose
  ctx.fillStyle = "#e88898";
  ctx.beginPath();
  ctx.arc(-22, 1.5, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Whiskers
  ctx.strokeStyle = "rgba(180,160,140,0.85)";
  ctx.lineWidth = 0.6;
  [[-22, 1, -28, -1], [-22, 1, -28, 3], [-22, 2, -28, 5]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Ears (round)
  ctx.fillStyle = "#5a4830";
  ctx.beginPath();
  ctx.ellipse(-10, -10, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#a86878";
  ctx.beginPath();
  ctx.ellipse(-10, -10, 2.4, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Beady red eye
  ctx.fillStyle = "#c83830";
  ctx.beginPath();
  ctx.arc(-14, -2, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.arc(-14.4, -2.4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Teeth
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.moveTo(-20, 3); ctx.lineTo(-18, 3); ctx.lineTo(-19, 5); ctx.closePath();
  ctx.fill();
  // Tail (curling)
  ctx.strokeStyle = "#5a4830";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.bezierCurveTo(22, 4, 24, 18, 18, 20);
  ctx.stroke();
  ctx.strokeStyle = "#a87078";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.bezierCurveTo(22, 4, 24, 18, 18, 20);
  ctx.stroke();
  // Feet
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(-4, 16, 2.4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, 16, 2.4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Second rat silhouette behind
  ctx.fillStyle = "rgba(40,28,16,0.45)";
  ctx.beginPath();
  ctx.ellipse(14, 0, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, -2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(22, -4, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawFireHazard(ctx) {
  drawShadow(ctx, 22, 4);
  // Charred ground
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath();
  ctx.ellipse(0, 18, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ember bed
  ctx.fillStyle = "#a82008";
  ctx.beginPath();
  ctx.ellipse(0, 16, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8a020";
  ctx.beginPath();
  ctx.ellipse(0, 16, 10, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Outer glow
  const glow = ctx.createRadialGradient(0, 4, 4, 0, 0, 26);
  glow.addColorStop(0, "rgba(255,80,0,0.7)");
  glow.addColorStop(1, "rgba(255,80,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  // Main flame
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(12, -10, 16, 6, 8, 14);
  ctx.bezierCurveTo(2, 18, -2, 18, -8, 14);
  ctx.bezierCurveTo(-16, 6, -12, -10, 0, -22);
  ctx.closePath();
  const flameGrad = ctx.createLinearGradient(0, -22, 0, 18);
  flameGrad.addColorStop(0, "#ffe060");
  flameGrad.addColorStop(0.4, "#f87018");
  flameGrad.addColorStop(1, "#a82008");
  ctx.fillStyle = flameGrad;
  ctx.fill();
  ctx.strokeStyle = "#5a1004";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Inner flame (yellow heart)
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(6, -4, 8, 6, 2, 12);
  ctx.bezierCurveTo(0, 14, -2, 14, -4, 12);
  ctx.bezierCurveTo(-8, 6, -6, -4, 0, -12);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,240,100,0.85)";
  ctx.fill();
  // White-hot core
  ctx.beginPath();
  ctx.ellipse(0, 4, 2.4, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fffae0";
  ctx.fill();
  // Ember sparks rising
  ctx.fillStyle = "#fff080";
  [[-10, -16, 1], [12, -12, 1.2], [-6, -22, 0.8], [8, -22, 0.9]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawWolfHazard(ctx) {
  drawShadow(ctx, 22, 4);
  // Body
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath();
  ctx.ellipse(2, 6, 18, 11, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Underbelly lighter
  ctx.fillStyle = "rgba(140,140,150,0.5)";
  ctx.beginPath();
  ctx.ellipse(2, 12, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head (turned forward, snarling)
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.moveTo(-22, -4);
  ctx.bezierCurveTo(-22, -12, -8, -16, -2, -10);
  ctx.bezierCurveTo(0, -4, -4, 4, -10, 6);
  ctx.bezierCurveTo(-16, 6, -22, 2, -22, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Pointed ears
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.moveTo(-16, -14);
  ctx.lineTo(-12, -22);
  ctx.lineTo(-10, -14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.lineTo(-2, -22);
  ctx.lineTo(0, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Inner ear
  ctx.fillStyle = "#a87890";
  ctx.beginPath();
  ctx.moveTo(-14, -14); ctx.lineTo(-12, -20); ctx.lineTo(-11, -14); ctx.closePath();
  ctx.fill();
  // Snout
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath();
  ctx.moveTo(-24, 2);
  ctx.lineTo(-22, -4);
  ctx.lineTo(-16, -2);
  ctx.lineTo(-18, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Nose
  ctx.fillStyle = "#0a0a0e";
  ctx.beginPath();
  ctx.ellipse(-23, -1, 2, 1.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Yellow eye
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  ctx.ellipse(-12, -6, 1.8, 2.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0a0e";
  ctx.fillRect(-12.5, -7, 1, 3.4);
  // Snarl (open mouth showing fangs)
  ctx.fillStyle = "#0a0a0e";
  ctx.beginPath();
  ctx.moveTo(-22, 4);
  ctx.lineTo(-14, 2);
  ctx.lineTo(-14, 6);
  ctx.lineTo(-22, 8);
  ctx.closePath();
  ctx.fill();
  // Fangs
  ctx.fillStyle = "#fffae0";
  [[-20, 4], [-17, 4]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 0.8, y);
    ctx.lineTo(x + 0.8, y);
    ctx.lineTo(x, y + 3);
    ctx.closePath();
    ctx.fill();
  });
  // Tongue
  ctx.fillStyle = "#c83030";
  ctx.beginPath();
  ctx.ellipse(-18, 6.5, 2, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.bezierCurveTo(28, -8, 26, -12, 22, -14);
  ctx.bezierCurveTo(20, -10, 16, -2, 14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Tail tip lighter
  ctx.fillStyle = "rgba(180,180,190,0.5)";
  ctx.beginPath();
  ctx.ellipse(24, -10, 2, 1.4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Fur tufts
  ctx.strokeStyle = "rgba(140,140,150,0.6)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 8; i++) {
    const x = -8 + i * 4;
    ctx.beginPath();
    ctx.moveTo(x, -2);
    ctx.lineTo(x + 1, -5);
    ctx.stroke();
  }
  // Legs (visible)
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.ellipse(-4, 16, 2.6, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(8, 16, 2.6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

export const ICONS = {
  hazard_rats: { label:"Rat Swarm", color:"#3a2818", draw:drawRatsHazard },
  hazard_fire: { label:"Fire",      color:"#f87018", draw:drawFireHazard },
  hazard_wolf: { label:"Wolves",    color:"#3a3a40", draw:drawWolfHazard },
};
