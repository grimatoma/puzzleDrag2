// Mine hazard icons (cave_in, gas_vent, lava, mole) + biome badges.

function drawShadow(ctx, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCaveIn(ctx) {
  drawShadow(ctx, 22, 4);
  // Pile of fallen rubble
  ctx.fillStyle = "#7a6850";
  ctx.beginPath();
  ctx.moveTo(-22, 22);
  ctx.lineTo(-18, 12);
  ctx.lineTo(-12, 16);
  ctx.lineTo(-6, 4);
  ctx.lineTo(0, 12);
  ctx.lineTo(8, 0);
  ctx.lineTo(14, 14);
  ctx.lineTo(22, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Individual stones
  const stones = [
    [-14, 12, 6, "#5a4838"],
    [-4, 14, 5, "#9da3a8"],
    [4, 8, 7, "#7a6850"],
    [12, 14, 5, "#5a4838"],
    [-10, 4, 4, "#9da3a8"],
    [-2, -2, 4, "#7a6850"],
    [10, -4, 5, "#9da3a8"],
  ];
  stones.forEach(([x, y, r, color]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x - r * 0.5, y - r * 0.8);
    ctx.lineTo(x + r * 0.5, y - r * 0.6);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.6, y + r * 0.4);
    ctx.lineTo(x - r * 0.5, y + r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a0e08";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Highlight
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y - r * 0.5);
    ctx.lineTo(x + r * 0.3, y - r * 0.4);
    ctx.stroke();
  });
  // Dust cloud above
  ctx.fillStyle = "rgba(180,160,140,0.5)";
  ctx.beginPath();
  ctx.arc(-8, -10, 5, 0, Math.PI * 2);
  ctx.arc(0, -14, 6, 0, Math.PI * 2);
  ctx.arc(8, -10, 5, 0, Math.PI * 2);
  ctx.fill();
  // Falling debris specks
  ctx.fillStyle = "#5a4838";
  [[-14, -16, 1.4], [4, -20, 1], [12, -14, 1.2]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGasVent(ctx) {
  drawShadow(ctx, 22, 4);
  // Cracked rock floor
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Crack
  ctx.fillStyle = "#1a1a20";
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(-2, 22);
  ctx.lineTo(8, 14);
  ctx.bezierCurveTo(2, 18, -4, 18, -8, 14);
  ctx.closePath();
  ctx.fill();
  // Glowing crack interior
  ctx.fillStyle = "rgba(120,255,180,0.7)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Gas plume — sickly green wisps
  const gasGrad = ctx.createRadialGradient(0, 0, 4, 0, -6, 26);
  gasGrad.addColorStop(0, "rgba(120,220,140,0.7)");
  gasGrad.addColorStop(0.6, "rgba(120,180,140,0.45)");
  gasGrad.addColorStop(1, "rgba(80,140,100,0)");
  ctx.fillStyle = gasGrad;
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wispy curls
  ctx.strokeStyle = "rgba(180,240,180,0.7)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.bezierCurveTo(-12, -2, -6, -10, -8, -16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(4, -2, -2, -10, 0, -20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.bezierCurveTo(12, -2, 6, -10, 8, -16);
  ctx.stroke();
  // Bubbles rising
  ctx.fillStyle = "rgba(160,220,160,0.85)";
  [[-6, -4, 1.6], [4, -8, 1.4], [-2, -14, 1.2], [6, -16, 1]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a8028";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });
  // Skull warning hint (tiny)
  ctx.fillStyle = "rgba(60,40,30,0.85)";
  ctx.beginPath();
  ctx.arc(0, 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,240,220,0.95)";
  ctx.beginPath();
  ctx.arc(-1, 3, 0.7, 0, Math.PI * 2);
  ctx.arc(1, 3, 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawLava(ctx) {
  drawShadow(ctx, 22, 4);
  // Pool of lava
  ctx.fillStyle = "#1a0408";
  ctx.beginPath();
  ctx.ellipse(0, 14, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Liquid surface
  const lava = ctx.createRadialGradient(-4, 10, 2, 0, 14, 22);
  lava.addColorStop(0, "#fff080");
  lava.addColorStop(0.3, "#ffae20");
  lava.addColorStop(0.7, "#c82008");
  lava.addColorStop(1, "#5a0808");
  ctx.fillStyle = lava;
  ctx.beginPath();
  ctx.ellipse(0, 12, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Crusty surface flecks
  ctx.fillStyle = "#3a1404";
  [[-12, 10, 5, 1.6], [4, 14, 6, 1.8], [10, 10, 4, 1.4], [-6, 14, 4, 1.4]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Bubble bursts
  ctx.fillStyle = "#fff080";
  [[-4, 8, 2], [6, 8, 1.6]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Heat glow
  ctx.fillStyle = "rgba(255,140,40,0.55)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sparks rising
  ctx.fillStyle = "#fff080";
  for (let i = 0; i < 8; i++) {
    const x = -16 + i * 4;
    const y = -4 - (i % 3) * 4;
    const r = 0.8 + (i % 2) * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Steam / smoke
  ctx.fillStyle = "rgba(160,80,40,0.5)";
  [[-8, -16, 4], [4, -20, 3.4], [10, -16, 3]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawMole(ctx) {
  drawShadow(ctx, 22, 4);
  // Dirt mound
  ctx.fillStyle = "#7a5028";
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Mound highlight
  ctx.fillStyle = "rgba(180,140,100,0.55)";
  ctx.beginPath();
  ctx.ellipse(-2, 16, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Soil clods
  ctx.fillStyle = "rgba(60,30,12,0.7)";
  [[-12, 16, 2.4], [8, 18, 2], [-4, 20, 2.2], [12, 14, 1.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Mole emerging
  // Body (round, fuzzy)
  ctx.fillStyle = "#3a2818";
  ctx.beginPath();
  ctx.ellipse(0, 4, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Snout
  ctx.fillStyle = "#5a3818";
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Pink nose
  ctx.fillStyle = "#e88898";
  ctx.beginPath();
  ctx.ellipse(0, -2, 2, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tiny eyes (closed/squinting)
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -2); ctx.lineTo(-5, -1);
  ctx.moveTo(7, -2); ctx.lineTo(5, -1);
  ctx.stroke();
  // Whiskers
  ctx.strokeStyle = "rgba(180,160,140,0.85)";
  ctx.lineWidth = 0.5;
  [[-5, 1, -10, -1], [-5, 2, -10, 2], [5, 1, 10, -1], [5, 2, 10, 2]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Teeth (buck)
  ctx.fillStyle = "#fffae0";
  ctx.fillRect(-1.4, 1.6, 1.2, 2.4);
  ctx.fillRect(0.2, 1.6, 1.2, 2.4);
  // Claws (digging)
  ctx.fillStyle = "#fffae0";
  [[-10, 12], [-6, 14], [10, 12], [6, 14]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 0.8, y);
    ctx.lineTo(x + 0.8, y);
    ctx.lineTo(x, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a1c08";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });
  // Fuzz tufts
  ctx.strokeStyle = "rgba(120,90,60,0.5)";
  ctx.lineWidth = 0.6;
  [-6, 0, 6].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -8);
    ctx.lineTo(x, -10);
    ctx.stroke();
  });
}

function drawBiomeFarm(ctx) {
  // Farm biome — sun + wheat + barn silhouette
  drawShadow(ctx, 24, 4);
  // Sky disc
  const sky = ctx.createLinearGradient(0, -22, 0, 14);
  sky.addColorStop(0, "#cfe8f8");
  sky.addColorStop(0.6, "#fffae0");
  sky.addColorStop(1, "#a8d048");
  ctx.fillStyle = sky;
  ctx.beginPath();
  ctx.arc(0, -2, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a6018";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Hills
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(-26, 14);
  ctx.bezierCurveTo(-16, 4, -8, 6, 0, 8);
  ctx.bezierCurveTo(8, 6, 18, 4, 26, 14);
  ctx.lineTo(26, 22);
  ctx.lineTo(-26, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a4810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Sun
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  ctx.arc(-12, -12, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Sun rays
  ctx.strokeStyle = "#f8d040";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(-12 + Math.cos(a) * 6, -12 + Math.sin(a) * 6);
    ctx.lineTo(-12 + Math.cos(a) * 9, -12 + Math.sin(a) * 9);
    ctx.stroke();
  }
  // Barn silhouette
  ctx.fillStyle = "#a8431a";
  ctx.beginPath();
  ctx.moveTo(8, 16);
  ctx.lineTo(8, -2);
  ctx.lineTo(14, -8);
  ctx.lineTo(20, -2);
  ctx.lineTo(20, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a1a08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#3a1c08";
  ctx.fillRect(13, 8, 2, 8);
  // Wheat in foreground
  ctx.strokeStyle = "#c89320";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  for (let x = -22; x <= -2; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, 14);
    ctx.stroke();
  }
  ctx.fillStyle = "#f4c84a";
  for (let x = -22; x <= -2; x += 4) {
    ctx.beginPath();
    ctx.ellipse(x, 14, 1.4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBiomeMine(ctx) {
  // Mine biome — cave + pickaxe + lantern
  drawShadow(ctx, 24, 4);
  // Background sky (dim)
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.arc(0, -2, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Mountain silhouette
  ctx.fillStyle = "#5a4a3a";
  ctx.beginPath();
  ctx.moveTo(-26, 14);
  ctx.lineTo(-16, -10);
  ctx.lineTo(-8, 0);
  ctx.lineTo(0, -16);
  ctx.lineTo(8, -4);
  ctx.lineTo(18, -8);
  ctx.lineTo(26, 14);
  ctx.lineTo(26, 22);
  ctx.lineTo(-26, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Snow caps
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.moveTo(-3, -14); ctx.lineTo(0, -16); ctx.lineTo(3, -14); ctx.lineTo(2, -12); ctx.lineTo(-2, -12);
  ctx.closePath();
  ctx.fill();
  // Mine entrance (arch)
  ctx.fillStyle = "#0a0408";
  ctx.beginPath();
  ctx.moveTo(-8, 18);
  ctx.bezierCurveTo(-8, 6, 8, 6, 8, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3014";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Wooden frame around entrance
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-10, 6, 3, 14);
  ctx.fillRect(7, 6, 3, 14);
  ctx.fillRect(-10, 6, 20, 3);
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  ctx.strokeRect(-10, 6, 3, 14);
  ctx.strokeRect(7, 6, 3, 14);
  ctx.strokeRect(-10, 6, 20, 3);
  // Lantern hanging in entrance
  ctx.fillStyle = "#3a3040";
  ctx.fillRect(-2, 8, 4, 4);
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.arc(0, 12, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,200,80,0.5)";
  ctx.beginPath();
  ctx.arc(0, 12, 8, 0, Math.PI * 2);
  ctx.fill();
  // Pickaxe leaning
  ctx.save();
  ctx.translate(-18, 8);
  ctx.rotate(0.5);
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1.2, 0, 2.4, 14);
  ctx.fillStyle = "#5a6066";
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(6, -2);
  ctx.lineTo(0, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
  // Stars overhead
  ctx.fillStyle = "#fff";
  [[-18, -16, 0.8], [12, -18, 0.6], [16, -10, 0.6]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBiomeFish(ctx) {
  // Sky / horizon
  ctx.fillStyle = "#88b8d8";
  ctx.beginPath();
  ctx.arc(0, -2, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.6;
  ctx.stroke();
  // Sea
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -2, 26, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#2a4a6a";
  ctx.fillRect(-26, 6, 52, 30);
  // Wave caps
  ctx.strokeStyle = "rgba(220,240,255,0.6)"; ctx.lineWidth = 1.0;
  for (let y = 8; y < 22; y += 5) {
    ctx.beginPath();
    for (let x = -26; x <= 26; x += 5) {
      const dy = Math.sin((x + y) * 0.4) * 1.0;
      if (x === -26) ctx.moveTo(x, y + dy);
      else ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
  }
  ctx.restore();
  // Distant island silhouette
  ctx.fillStyle = "#3a5a78";
  ctx.beginPath();
  ctx.moveTo(-22, 6);
  ctx.lineTo(-18, 0); ctx.lineTo(-12, 4); ctx.lineTo(-8, 6);
  ctx.closePath();
  ctx.fill();
  // Pier post (foreground)
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-14, 4, 3, 18);
  ctx.fillRect(-2, 4, 3, 18);
  ctx.fillRect(10, 4, 3, 18);
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-14, 4, 3, 18); ctx.strokeRect(-2, 4, 3, 18); ctx.strokeRect(10, 4, 3, 18);
  // Pier deck
  ctx.fillStyle = "#a8783a";
  ctx.fillRect(-16, 0, 30, 4);
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2;
  ctx.strokeRect(-16, 0, 30, 4);
  // Plank lines
  ctx.strokeStyle = "rgba(58,28,8,0.6)"; ctx.lineWidth = 0.6;
  for (let i = -10; i <= 8; i += 6) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 4); ctx.stroke();
  }
  // Anchor on the deck
  ctx.strokeStyle = "#1a1010"; ctx.lineWidth = 1.6;
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath(); ctx.arc(0, -4, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -1); ctx.lineTo(0, -8);
  ctx.moveTo(-3, -8); ctx.lineTo(3, -8);
  ctx.moveTo(-4, -4); ctx.bezierCurveTo(-6, -4, -6, -10, 0, -10);
  ctx.bezierCurveTo(6, -10, 6, -4, 4, -4);
  ctx.stroke();
  // Sun on horizon
  ctx.fillStyle = "#f8d878";
  ctx.beginPath(); ctx.arc(14, -2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.arc(14, -2, 4, 0, Math.PI * 2); ctx.stroke();
  // Seagulls
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4;
  [[-12, -14], [4, -16], [-2, -10]].forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.moveTo(gx - 3, gy); ctx.quadraticCurveTo(gx, gy - 2, gx + 3, gy);
    ctx.stroke();
  });
}

export const ICONS = {
  hazard_cave_in:  { label:"Cave-In",  color:"#7a6850", draw:drawCaveIn },
  hazard_gas_vent: { label:"Gas Vent", color:"#5a8028", draw:drawGasVent },
  hazard_lava:    { label:"Lava",     color:"#c82008", draw:drawLava },
  hazard_mole:    { label:"Mole",     color:"#3a2818", draw:drawMole },
  biome_farm:     { label:"Farm",     color:"#5a8a26", draw:drawBiomeFarm },
  biome_mine:     { label:"Mine",     color:"#5a4a3a", draw:drawBiomeMine },
  biome_fish:     { label:"Harbor",   color:"#2a4a6a", draw:drawBiomeFish },
};
