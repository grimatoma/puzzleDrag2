// Herd animals (pigs, sheep, goats, alpacas, rams).

function shadow(ctx, w) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 22, w, 4.5, 0, 0, Math.PI*2); ctx.fill();
}

function pigBase(ctx, fillC1, fillC2, outline) {
  // Body
  const g = ctx.createRadialGradient(-4, -2, 3, 0, 4, 18);
  g.addColorStop(0, fillC1); g.addColorStop(1, fillC2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 6, 17, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0; ctx.stroke();
  // Curly tail
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0;
  ctx.beginPath(); ctx.moveTo(18, 4); ctx.bezierCurveTo(22, 0, 18, -2, 22, -4); ctx.stroke();
  // Legs
  ctx.fillStyle = fillC2;
  ctx.fillRect(-8, 14, 4, 6); ctx.fillRect(-2, 14, 4, 6);
  ctx.fillRect(6, 14, 4, 6); ctx.fillRect(12, 14, 4, 6);
  ctx.strokeStyle = outline; ctx.lineWidth = 1.4;
  ctx.strokeRect(-8, 14, 4, 6); ctx.strokeRect(-2, 14, 4, 6);
  ctx.strokeRect(6, 14, 4, 6); ctx.strokeRect(12, 14, 4, 6);
  // Hooves
  ctx.fillStyle = outline;
  ctx.fillRect(-8, 19, 4, 1.5); ctx.fillRect(-2, 19, 4, 1.5);
  ctx.fillRect(6, 19, 4, 1.5); ctx.fillRect(12, 19, 4, 1.5);
  // Head
  ctx.fillStyle = fillC1;
  ctx.beginPath(); ctx.ellipse(-12, 0, 8, 8, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.8; ctx.stroke();
  // Snout
  ctx.fillStyle = fillC2;
  ctx.beginPath(); ctx.ellipse(-18, 2, 4, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.ellipse(-19, 1, 0.7, 1.4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-17, 1, 0.7, 1.4, 0, 0, Math.PI*2); ctx.fill();
  // Ear
  ctx.fillStyle = fillC2;
  ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-8, -10); ctx.lineTo(-6, -4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-13, -2, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-13, -2, 0.8, 0, Math.PI*2); ctx.fill();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-2, 0, 4, 6, -0.3, 0, Math.PI*2); ctx.fill();
}

function woolBody(ctx, woolC1, woolC2, outline) {
  const fluff = (cx, cy, r) => {
    const g = ctx.createRadialGradient(cx-r*0.4, cy-r*0.4, 1, cx, cy, r);
    g.addColorStop(0, woolC1); g.addColorStop(1, woolC2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  };
  fluff(-8, 4, 8); fluff(0, 0, 8); fluff(8, 4, 8);
  fluff(-4, 8, 7); fluff(4, 8, 7); fluff(12, 0, 6);
  fluff(0, 10, 6); fluff(-12, 0, 6);
}

function drawPig(ctx) { shadow(ctx, 22); pigBase(ctx, "#ffd0d8", "#e88a98", "#3a1820"); }

function drawHog(ctx) {
  shadow(ctx, 22);
  pigBase(ctx, "#a87838", "#5a3a14", "#1a0e04");
  // Bristles on back
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  for (let i = 0; i < 7; i++) {
    const x = -4 + i * 3;
    ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x - 1, -8); ctx.stroke();
  }
}

function drawBoar(ctx) {
  shadow(ctx, 22);
  pigBase(ctx, "#4a3818", "#241408", "#0a0604");
  // Tusks
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath(); ctx.moveTo(-19, 3); ctx.lineTo(-22, -2); ctx.lineTo(-20, 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-17, 3); ctx.lineTo(-14, -2); ctx.lineTo(-16, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.8; ctx.stroke();
  // Spiky bristles
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    const x = -6 + i * 3;
    ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x - 1, -10); ctx.stroke();
  }
  // Glowing eye
  ctx.fillStyle = "#d83a18"; ctx.beginPath(); ctx.arc(-13, -2, 1.0, 0, Math.PI*2); ctx.fill();
}

function drawWarthog(ctx) {
  shadow(ctx, 22);
  pigBase(ctx, "#5a4828", "#2a1a08", "#0a0604");
  // Mane
  ctx.fillStyle = "#1a0e04";
  for (let i = 0; i < 9; i++) {
    const x = -8 + i * 3;
    ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x - 2, -12); ctx.lineTo(x + 1, -3); ctx.closePath(); ctx.fill();
  }
  // Tusks (curved up)
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath();
  ctx.moveTo(-19, 3); ctx.bezierCurveTo(-22, -2, -20, -6, -19, -2); ctx.lineTo(-18, 3); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-17, 3); ctx.bezierCurveTo(-14, -2, -16, -6, -17, -2); ctx.lineTo(-18, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.8; ctx.stroke();
  // Warts
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.arc(-15, 0, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-11, 4, 1.2, 0, Math.PI*2); ctx.fill();
}

function drawSheep(ctx) {
  shadow(ctx, 22);
  // Legs first
  ctx.fillStyle = "#1a0a08";
  ctx.fillRect(-8, 14, 3, 7); ctx.fillRect(-2, 14, 3, 7); ctx.fillRect(6, 14, 3, 7); ctx.fillRect(12, 14, 3, 7);
  woolBody(ctx, "#fffce8", "#a8a098", "#3a3030");
  // Head — black face
  ctx.fillStyle = "#1a0a08";
  ctx.beginPath(); ctx.ellipse(-14, -2, 6, 7, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4; ctx.stroke();
  // Ear
  ctx.fillStyle = "#1a0a08";
  ctx.beginPath(); ctx.ellipse(-15, -8, 2, 3, -0.4, 0, Math.PI*2); ctx.fill();
  // Snout patch
  ctx.fillStyle = "#5a4040";
  ctx.beginPath(); ctx.ellipse(-18, 0, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-15, -3, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-15, -3, 0.7, 0, Math.PI*2); ctx.fill();
}

function drawAlpaca(ctx) {
  shadow(ctx, 18);
  // Long legs
  ctx.fillStyle = "#a87838";
  ctx.fillRect(-8, 12, 3, 10); ctx.fillRect(-2, 12, 3, 10); ctx.fillRect(6, 12, 3, 10); ctx.fillRect(12, 12, 3, 10);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-8, 12, 3, 10); ctx.strokeRect(-2, 12, 3, 10); ctx.strokeRect(6, 12, 3, 10); ctx.strokeRect(12, 12, 3, 10);
  // Wooly body
  woolBody(ctx, "#f8e8c8", "#a87838", "#3a2008");
  // Long curving neck
  ctx.fillStyle = "#f8e8c8";
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.bezierCurveTo(-18, -4, -16, -14, -10, -16);
  ctx.bezierCurveTo(-4, -14, -6, -4, -8, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  // Fluffy head top
  ctx.fillStyle = "#fffce0";
  ctx.beginPath(); ctx.arc(-11, -16, 5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4; ctx.stroke();
  // Snout (lower)
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.ellipse(-13, -12, 3, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2; ctx.stroke();
  // Ear
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.moveTo(-11, -20); ctx.lineTo(-9, -23); ctx.lineTo(-7, -19); ctx.closePath(); ctx.fill();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-13, -16, 1.0, 0, Math.PI*2); ctx.fill();
}

function drawGoat(ctx) {
  shadow(ctx, 20);
  // Legs
  ctx.fillStyle = "#a89878";
  ctx.fillRect(-8, 12, 3, 10); ctx.fillRect(-2, 12, 3, 10); ctx.fillRect(6, 12, 3, 10); ctx.fillRect(12, 12, 3, 10);
  ctx.strokeStyle = "#3a2810"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-8, 12, 3, 10); ctx.strokeRect(-2, 12, 3, 10); ctx.strokeRect(6, 12, 3, 10); ctx.strokeRect(12, 12, 3, 10);
  ctx.fillStyle = "#1a0e04";
  ctx.fillRect(-8, 21, 3, 1.5); ctx.fillRect(-2, 21, 3, 1.5); ctx.fillRect(6, 21, 3, 1.5); ctx.fillRect(12, 21, 3, 1.5);
  // Body
  const g = ctx.createRadialGradient(-2, -2, 3, 0, 4, 16);
  g.addColorStop(0, "#fffce8"); g.addColorStop(0.5, "#d8c098"); g.addColorStop(1, "#7a5418");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 4, 14, 9, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.8; ctx.stroke();
  // Beard goatee
  ctx.fillStyle = "#fffce8";
  ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(-15, 8); ctx.lineTo(-13, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Head
  ctx.fillStyle = "#d8c098";
  ctx.beginPath(); ctx.ellipse(-12, -2, 6, 6, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  // Horns — small back-curving
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-12, -7); ctx.bezierCurveTo(-12, -12, -16, -12, -16, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -7); ctx.bezierCurveTo(-9, -12, -5, -12, -5, -8); ctx.stroke();
  // Ear
  ctx.fillStyle = "#a89878";
  ctx.beginPath(); ctx.ellipse(-7, -4, 3, 2, 0.4, 0, Math.PI*2); ctx.fill();
  // Eye — vertical pupil
  ctx.fillStyle = "#fff8c0"; ctx.beginPath(); ctx.arc(-13, -3, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.fillRect(-13.4, -4, 0.8, 2);
  // Snout
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-17, 0, 1.0, 0, Math.PI*2); ctx.fill();
}

function drawRam(ctx) {
  shadow(ctx, 22);
  // Legs
  ctx.fillStyle = "#7a5418";
  ctx.fillRect(-8, 14, 3, 8); ctx.fillRect(-2, 14, 3, 8); ctx.fillRect(6, 14, 3, 8); ctx.fillRect(12, 14, 3, 8);
  ctx.fillStyle = "#1a0e04";
  ctx.fillRect(-8, 21, 3, 1.5); ctx.fillRect(-2, 21, 3, 1.5); ctx.fillRect(6, 21, 3, 1.5); ctx.fillRect(12, 21, 3, 1.5);
  // Big body
  woolBody(ctx, "#fffce8", "#a89878", "#3a2810");
  // Head
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.ellipse(-13, 0, 6, 7, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Massive curled horns
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 4;
  ctx.fillStyle = "#a87838";
  // Right horn (from viewer)
  ctx.save(); ctx.translate(-13, -4);
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.bezierCurveTo(-12, 0, -12, 8, -6, 10);
  ctx.bezierCurveTo(0, 10, 0, 4, -4, 4);
  ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.translate(-13, -4);
  ctx.beginPath();
  ctx.moveTo(3, 0); ctx.bezierCurveTo(12, 0, 12, 8, 6, 10);
  ctx.bezierCurveTo(0, 10, 0, 4, 4, 4);
  ctx.stroke();
  ctx.restore();
  // Horn ridges
  ctx.strokeStyle = "rgba(58,32,8,0.7)"; ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(-19, -4 + i*2, 2, -0.5, 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(-7, -4 + i*2, 2, 1.5, 3.5); ctx.stroke();
  }
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-14, -2, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.fillRect(-14.4, -3, 0.8, 2);
  // Snout
  ctx.fillStyle = "#1a0e04"; ctx.beginPath(); ctx.arc(-18, 2, 1.4, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  herd_pig:     { label:"Pig",     color:"#e88a98", draw:drawPig },
  herd_hog:     { label:"Hog",     color:"#a87838", draw:drawHog },
  herd_boar:    { label:"Boar",    color:"#241408", draw:drawBoar },
  herd_warthog: { label:"Warthog", color:"#5a4828", draw:drawWarthog },
  herd_sheep:   { label:"Sheep",   color:"#fffce8", draw:drawSheep },
  herd_alpaca:  { label:"Alpaca",  color:"#f8e8c8", draw:drawAlpaca },
  herd_goat:    { label:"Goat",    color:"#d8c098", draw:drawGoat },
  herd_ram:     { label:"Ram",     color:"#a87838", draw:drawRam },
};
