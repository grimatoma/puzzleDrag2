// Wave 9 — Mine Tools.

function shadow(ctx, w, y) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, y || 22, w, 4, 0, 0, Math.PI*2); ctx.fill();
}

function woodHandle(ctx, x1, y1, x2, y2, width) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -width/2, 0, width/2);
  g.addColorStop(0, "#7a4a18"); g.addColorStop(0.5, "#a87838"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.fillRect(0, -width/2, len, width);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.strokeRect(0, -width/2, len, width);
  ctx.restore();
}

function drawPickaxe(ctx) {
  shadow(ctx, 18);
  woodHandle(ctx, -10, 18, 12, -16, 4);
  ctx.save(); ctx.translate(12, -16);
  const g = ctx.createLinearGradient(-12, 0, 12, 0);
  g.addColorStop(0, "#3a3a40"); g.addColorStop(0.5, "#a8a8b0"); g.addColorStop(1, "#1a1a1e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-14, -2); ctx.lineTo(14, -2); ctx.lineTo(18, 2); ctx.lineTo(14, 6); ctx.lineTo(-14, 6); ctx.lineTo(-18, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(14, -2); ctx.lineTo(13, 0); ctx.lineTo(-13, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawSledgehammer(ctx) {
  shadow(ctx, 16);
  woodHandle(ctx, 10, 22, -8, -16, 5);
  ctx.save(); ctx.translate(-10, -18);
  const g = ctx.createLinearGradient(0, 0, 0, 12);
  g.addColorStop(0, "#a8a8b0"); g.addColorStop(0.5, "#5a5a62"); g.addColorStop(1, "#1a1a1e");
  ctx.fillStyle = g;
  ctx.fillRect(-8, 0, 18, 12);
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.6; ctx.strokeRect(-8, 0, 18, 12);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(-7, 1, 16, 2);
  ctx.restore();
}

function drawAnvil(ctx) {
  shadow(ctx, 22);
  const g = ctx.createLinearGradient(0, -8, 0, 14);
  g.addColorStop(0, "#5a5a62"); g.addColorStop(0.5, "#3a3a40"); g.addColorStop(1, "#1a1a1e");
  ctx.fillStyle = g;
  // Top
  ctx.beginPath();
  ctx.moveTo(-22, -8); ctx.lineTo(18, -8); ctx.lineTo(20, -4);
  ctx.lineTo(14, -2); ctx.lineTo(-14, -2); ctx.lineTo(-18, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Waist
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.moveTo(-12, -2); ctx.lineTo(12, -2); ctx.lineTo(8, 8); ctx.lineTo(-8, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Base
  ctx.fillStyle = "#1a1a1e";
  ctx.beginPath();
  ctx.moveTo(-14, 8); ctx.lineTo(14, 8); ctx.lineTo(16, 18); ctx.lineTo(-16, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(-20, -7, 36, 1.5);
  // Horn (left)
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.moveTo(-22, -8); ctx.lineTo(-26, -4); ctx.lineTo(-22, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.2; ctx.stroke();
}

function drawDrill(ctx) {
  shadow(ctx, 18);
  // Body
  const g = ctx.createLinearGradient(-14, 0, 14, 0);
  g.addColorStop(0, "#a82018"); g.addColorStop(0.5, "#e83a08"); g.addColorStop(1, "#5a0808");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-14, -10); ctx.lineTo(8, -10); ctx.lineTo(8, 8); ctx.lineTo(-14, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.6; ctx.stroke();
  // Grip
  ctx.fillStyle = "#1a1a1e";
  ctx.beginPath();
  ctx.moveTo(-10, 8); ctx.lineTo(-2, 8); ctx.lineTo(-4, 22); ctx.lineTo(-12, 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.2; ctx.stroke();
  // Trigger
  ctx.fillStyle = "#3a3a40";
  ctx.fillRect(-2, 6, 4, 6);
  // Chuck
  ctx.fillStyle = "#a8a8b0";
  ctx.beginPath();
  ctx.moveTo(8, -6); ctx.lineTo(14, -4); ctx.lineTo(14, 4); ctx.lineTo(8, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Spiral bit
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath();
  ctx.moveTo(14, -2); ctx.lineTo(24, 0); ctx.lineTo(14, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 0.7;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(14 + i*2.5, -1); ctx.lineTo(15 + i*2.5, 1); ctx.stroke(); }
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(-12, -8, 18, 2);
}

function drawDynamite(ctx) {
  shadow(ctx, 16);
  // Sticks
  const drawStick = (x) => {
    const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    g.addColorStop(0, "#a82018"); g.addColorStop(0.5, "#e83a08"); g.addColorStop(1, "#5a0808");
    ctx.fillStyle = g;
    ctx.fillRect(x - 4, -10, 8, 24);
    ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.4;
    ctx.strokeRect(x - 4, -10, 8, 24);
    ctx.fillStyle = "#fffce0";
    ctx.fillRect(x - 4, -2, 8, 4);
    ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 0.8;
    ctx.strokeRect(x - 4, -2, 8, 4);
    ctx.fillStyle = "#3a0808"; ctx.font = "bold 5px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("TNT", x, 1);
  };
  drawStick(-7); drawStick(0); drawStick(7);
  // Tied rope
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(10, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(10, 8); ctx.stroke();
  // Fuse
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(-4, -16, 6, -18, 4, -22); ctx.stroke();
  // Spark
  ctx.fillStyle = "#fff4a0";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 3 : 1;
    const x = 4 + Math.cos(a) * r; const y = -22 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
}

function drawMineCart(ctx) {
  shadow(ctx, 22);
  // Wheels
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.arc(-10, 16, 5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, 16, 5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3a2810";
  ctx.beginPath(); ctx.arc(-10, 16, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, 16, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#a8a8b0";
  ctx.beginPath(); ctx.arc(-10, 16, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, 16, 1.2, 0, Math.PI*2); ctx.fill();
  // Cart body
  const g = ctx.createLinearGradient(0, -8, 0, 14);
  g.addColorStop(0, "#7a4818"); g.addColorStop(0.5, "#5a3414"); g.addColorStop(1, "#2a1408");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, -8); ctx.lineTo(16, -8); ctx.lineTo(14, 12); ctx.lineTo(-14, 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Metal bands
  ctx.strokeStyle = "#a8a8b0"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(15, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-15, 4); ctx.lineTo(15, 4); ctx.stroke();
  ctx.fillStyle = "#3a3a40";
  [-12, -6, 0, 6, 12].forEach(x => { ctx.beginPath(); ctx.arc(x, -4, 1, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(x, 4, 1, 0, Math.PI*2); ctx.fill(); });
  // Ore inside
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath(); ctx.ellipse(0, -8, 14, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#a8a8b0";
  [[-8,-10,3],[-2,-12,3],[4,-11,3],[10,-10,2.5]].forEach(([x,y,r])=>{ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#1a1a1e"; ctx.lineWidth=0.8; ctx.stroke(); });
  // Rail
  ctx.fillStyle = "#5a5a62"; ctx.fillRect(-20, 21, 40, 2);
}

function drawHelmet(ctx) {
  shadow(ctx, 18);
  // Helmet body
  const g = ctx.createRadialGradient(-4, -6, 3, 0, 4, 18);
  g.addColorStop(0, "#f8c040"); g.addColorStop(0.6, "#a87010"); g.addColorStop(1, "#5a3408");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, 6); ctx.bezierCurveTo(-16, -14, 16, -14, 16, 6); ctx.lineTo(14, 10); ctx.lineTo(-14, 10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.8; ctx.stroke();
  // Brim
  ctx.fillStyle = "#5a3408";
  ctx.beginPath();
  ctx.ellipse(0, 10, 18, 3, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Lamp on front
  ctx.fillStyle = "#a8a8b0";
  ctx.beginPath();
  ctx.moveTo(-6, -10); ctx.lineTo(6, -10); ctx.lineTo(8, -4); ctx.lineTo(-8, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Lamp lens — glowing
  const lampG = ctx.createRadialGradient(0, -7, 0.5, 0, -7, 5);
  lampG.addColorStop(0, "#ffffff"); lampG.addColorStop(0.5, "#fff4a0"); lampG.addColorStop(1, "#a87010");
  ctx.fillStyle = lampG;
  ctx.beginPath(); ctx.arc(0, -7, 4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Light beam
  ctx.fillStyle = "rgba(255,244,160,0.4)";
  ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(-12, -22); ctx.lineTo(12, -22); ctx.lineTo(3, -7); ctx.closePath(); ctx.fill();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-8, -2, 4, 7, -0.4, 0, Math.PI*2); ctx.fill();
}

function drawLantern(ctx) {
  shadow(ctx, 14);
  // Top loop
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -16, 4, Math.PI, 0); ctx.stroke();
  // Top cap
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath();
  ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(6, -10); ctx.lineTo(-6, -10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Glass cylinder — glowing
  const g = ctx.createRadialGradient(0, 4, 2, 0, 4, 14);
  g.addColorStop(0, "#fffce0"); g.addColorStop(0.5, "#f8c040"); g.addColorStop(1, "rgba(168,112,16,0.7)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-9, -10); ctx.lineTo(9, -10); ctx.lineTo(8, 12); ctx.lineTo(-8, 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Frame
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(-8, 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, -10); ctx.lineTo(8, 12); ctx.stroke();
  // Flame
  ctx.fillStyle = "#fff4a0";
  ctx.beginPath();
  ctx.moveTo(0, 6); ctx.bezierCurveTo(-3, 0, 3, -2, 0, -6); ctx.bezierCurveTo(-3, -2, 3, 0, 0, 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f08020";
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.bezierCurveTo(-2, 0, 2, -1, 0, -3); ctx.bezierCurveTo(-2, -1, 2, 0, 0, 4);
  ctx.closePath(); ctx.fill();
  // Base
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath();
  ctx.moveTo(-10, 12); ctx.lineTo(10, 12); ctx.lineTo(8, 16); ctx.lineTo(-8, 16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Glow halo
  ctx.fillStyle = "rgba(255,200,100,0.18)";
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI*2); ctx.fill();
}

function drawPan(ctx) {
  shadow(ctx, 22);
  // Pan body — wide shallow
  const g = ctx.createRadialGradient(-4, -2, 4, 0, 4, 22);
  g.addColorStop(0, "#a8a8b0"); g.addColorStop(0.5, "#5a5a62"); g.addColorStop(1, "#1a1a1e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 8, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.8; ctx.stroke();
  // Inside (gold + water)
  const insideG = ctx.createRadialGradient(0, 2, 2, 0, 2, 18);
  insideG.addColorStop(0, "#fff4a0"); insideG.addColorStop(0.5, "#a8a8b0"); insideG.addColorStop(1, "#3a3a40");
  ctx.fillStyle = insideG;
  ctx.beginPath();
  ctx.ellipse(0, 2, 18, 5.5, 0, 0, Math.PI*2); ctx.fill();
  // Gold flakes
  ctx.fillStyle = "#f8d040";
  [[-8,2,1.4],[-4,4,1.0],[0,1,1.6],[5,3,1.2],[10,2,1.0],[-12,3,0.9]].forEach(([x,y,r])=>{
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#a87010"; ctx.lineWidth = 0.5; ctx.stroke();
  });
  // Water shimmer
  ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.arc(0, 2, 16, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
  // Rim ridge
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.ellipse(0, 4, 22, 8, 0, Math.PI*1.05, Math.PI*1.95); ctx.stroke();
}

function drawCanary(ctx) {
  shadow(ctx, 14, 20);
  // Cage stand
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.stroke();
  // Tiny cage bars
  ctx.strokeStyle = "#a8a8b0"; ctx.lineWidth = 1.2;
  for (let i = -7; i <= 7; i += 2) {
    ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i, 8); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, -10, 9, Math.PI, 0); ctx.stroke();
  // Cage base
  ctx.fillStyle = "#5a3814";
  ctx.fillRect(-9, 8, 18, 3);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.strokeRect(-9, 8, 18, 3);
  // Top hook
  ctx.fillStyle = "#5a5a62"; ctx.beginPath(); ctx.arc(0, -16, 2, 0, Math.PI*2); ctx.fill();
  // Canary inside
  const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 6);
  g.addColorStop(0, "#fff8c0"); g.addColorStop(0.6, "#f8d040"); g.addColorStop(1, "#a87010");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 4.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.0; ctx.stroke();
  // Wing
  ctx.fillStyle = "#d8a020";
  ctx.beginPath(); ctx.ellipse(1, 0, 3, 2, 0.2, 0, Math.PI*2); ctx.fill();
  // Beak
  ctx.fillStyle = "#f08020";
  ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(-8, 0); ctx.lineTo(-5, 1); ctx.closePath(); ctx.fill();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-3, -2, 0.7, 0, Math.PI*2); ctx.fill();
  // Perch
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(6, 4); ctx.stroke();
  // Feet
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-1, 3); ctx.lineTo(-1, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1, 3); ctx.lineTo(1, 4); ctx.stroke();
}

function drawRopeCoil(ctx) {
  shadow(ctx, 16);
  // Coiled loops
  for (let i = 0; i < 5; i++) {
    const r = 14 - i*1.5;
    const c = i % 2 === 0 ? "#d8b070" : "#a87838";
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, 6 - i*3, r, r*0.45, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2; ctx.stroke();
    // Twist marks
    ctx.strokeStyle = "rgba(58,32,8,0.55)"; ctx.lineWidth = 0.8;
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*r, 6 - i*3 + Math.sin(a)*r*0.45);
      ctx.lineTo(Math.cos(a + 0.2)*(r-1), 6 - i*3 + Math.sin(a + 0.2)*(r-1)*0.45);
      ctx.stroke();
    }
  }
  // Tail end hanging
  ctx.strokeStyle = "#a87838"; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-12, 6); ctx.bezierCurveTo(-18, 10, -16, 18, -12, 22);
  ctx.stroke();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-12, 6); ctx.bezierCurveTo(-18, 10, -16, 18, -12, 22);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath(); ctx.ellipse(-4, -4, 5, 1.5, -0.2, 0, Math.PI*2); ctx.fill();
}

function drawCrucible(ctx) {
  shadow(ctx, 18);
  // Bowl
  const g = ctx.createLinearGradient(0, -4, 0, 18);
  g.addColorStop(0, "#5a4838"); g.addColorStop(0.5, "#3a2810"); g.addColorStop(1, "#1a0e04");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-14, -4); ctx.lineTo(14, -4);
  ctx.bezierCurveTo(16, 14, -16, 14, -14, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 2.0; ctx.stroke();
  // Rim
  ctx.fillStyle = "#7a5018";
  ctx.beginPath(); ctx.ellipse(0, -4, 14, 3.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 1.4; ctx.stroke();
  // Glowing molten
  const moltenG = ctx.createRadialGradient(0, -3, 1, 0, -3, 12);
  moltenG.addColorStop(0, "#fffcb0"); moltenG.addColorStop(0.4, "#f8a020"); moltenG.addColorStop(1, "#a82018");
  ctx.fillStyle = moltenG;
  ctx.beginPath(); ctx.ellipse(0, -4, 12, 2.5, 0, 0, Math.PI*2); ctx.fill();
  // Bubbles
  ctx.fillStyle = "#fff4a0";
  ctx.beginPath(); ctx.arc(-4, -4, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -5, 1.0, 0, Math.PI*2); ctx.fill();
  // Glow halo
  ctx.fillStyle = "rgba(255,160,40,0.25)";
  ctx.beginPath(); ctx.arc(0, -8, 18, 0, Math.PI*2); ctx.fill();
  // Tongs gripping side
  ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-22, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-22, -4); ctx.stroke();
  // Bands on bowl
  ctx.strokeStyle = "#7a5018"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, 4, 14, 3.5, 0, 0, Math.PI*2); ctx.stroke();
}

function drawSiftingScreen(ctx) {
  shadow(ctx, 20);
  // Round wooden frame
  ctx.fillStyle = "#5a3814";
  ctx.beginPath(); ctx.arc(0, 4, 18, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 2; ctx.stroke();
  // Mesh bottom
  ctx.fillStyle = "#a8a8b0";
  ctx.beginPath(); ctx.arc(0, 4, 14, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Mesh grid
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 4, 14, 0, Math.PI*2); ctx.clip();
  ctx.strokeStyle = "rgba(26,14,4,0.6)"; ctx.lineWidth = 0.7;
  for (let i = -16; i <= 16; i += 2.5) {
    ctx.beginPath(); ctx.moveTo(i, -12); ctx.lineTo(i, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16, 4 + i); ctx.lineTo(16, 4 + i); ctx.stroke();
  }
  ctx.restore();
  // Stones / nuggets on top
  const items = [["#a8a8b0",-6,-2,3],["#fff4a0",2,0,2.5],["#5a5a62",6,4,3.2],["#fff4a0",-4,6,2],["#a8a8b0",-9,5,2.5]];
  items.forEach(([c, x, y, r]) => {
    const g = ctx.createRadialGradient(x-r*0.4, y-r*0.4, 0.5, x, y, r);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, c); g.addColorStop(1, "#1a1a1e");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 0.7; ctx.stroke();
  });
  // Falling dust
  ctx.fillStyle = "rgba(168,112,16,0.6)";
  for (let i = 0; i < 5; i++) ctx.fillRect(-10 + i*5, 22, 1, 2);
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath(); ctx.ellipse(-7, -4, 4, 2, -0.4, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  pickaxe:        { label:"Pickaxe",        color:"#a8a8b0", draw:drawPickaxe },
  sledgehammer:   { label:"Sledgehammer",   color:"#5a5a62", draw:drawSledgehammer },
  anvil:          { label:"Anvil",          color:"#3a3a40", draw:drawAnvil },
  drill:          { label:"Drill",          color:"#e83a08", draw:drawDrill },
  dynamite:       { label:"Dynamite",       color:"#e83a08", draw:drawDynamite },
  mine_cart:      { label:"Mine Cart",      color:"#7a4818", draw:drawMineCart },
  helmet:         { label:"Helmet",         color:"#f8c040", draw:drawHelmet },
  lantern:        { label:"Lantern",        color:"#f8c040", draw:drawLantern },
  gold_pan:       { label:"Gold Pan",       color:"#a8a8b0", draw:drawPan },
  canary:         { label:"Canary",         color:"#f8d040", draw:drawCanary },
  rope_coil:      { label:"Rope Coil",      color:"#a87838", draw:drawRopeCoil },
  crucible:       { label:"Crucible",       color:"#f8a020", draw:drawCrucible },
  sifting_screen: { label:"Sifting Screen", color:"#a8a8b0", draw:drawSiftingScreen },
};
