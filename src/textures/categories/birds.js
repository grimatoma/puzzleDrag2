// Wave 6 — Birds.

// Generic bird body helper (returns nothing — just draws shadow)
function shadow(ctx, w) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, 22, w, 4, 0, 0, Math.PI*2); ctx.fill();
}

function drawPheasant(ctx) {
  shadow(ctx, 22);
  // Long tail feathers
  ctx.strokeStyle = "#8a4a18"; ctx.lineWidth = 3;
  [0.0, 0.15, -0.1, 0.25].forEach((d, i) => {
    ctx.beginPath();
    ctx.moveTo(8, 4);
    ctx.bezierCurveTo(18, -2 + i*2, 24, 2 + d*8, 26, 8 + d*10);
    ctx.stroke();
  });
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2;
  [0,1,2,3].forEach(() => {
    for (let s = 0.3; s <= 1; s += 0.2) {
      ctx.beginPath(); ctx.moveTo(8 + 18*s - 2, 4 + 4*s); ctx.lineTo(8 + 18*s + 2, 4 + 4*s); ctx.stroke();
    }
  });
  // Body
  const bodyG = ctx.createRadialGradient(-4, 0, 3, 0, 4, 18);
  bodyG.addColorStop(0, "#d8743a"); bodyG.addColorStop(0.6, "#7a2a08"); bodyG.addColorStop(1, "#3a1408");
  ctx.fillStyle = bodyG;
  ctx.beginPath(); ctx.ellipse(-2, 4, 14, 11, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0a04"; ctx.lineWidth = 2.0; ctx.stroke();
  // Wing detail
  ctx.fillStyle = "#5a2008";
  ctx.beginPath(); ctx.ellipse(-2, 6, 9, 6, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#1a0a04";
  for (let i = 0; i < 8; i++) ctx.fillRect(-9 + i*2, 4, 1, 4);
  // Head & neck
  ctx.fillStyle = "#1a4a18";
  ctx.beginPath(); ctx.ellipse(-12, -6, 6, 7, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a2a08"; ctx.lineWidth = 1.6; ctx.stroke();
  // White ring
  ctx.strokeStyle = "#fff8e0"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(-10, -2, 5, 0.2, Math.PI - 0.3); ctx.stroke();
  // Red face
  ctx.fillStyle = "#d83a18";
  ctx.beginPath(); ctx.ellipse(-15, -7, 3, 2.5, -0.3, 0, Math.PI*2); ctx.fill();
  // Beak
  ctx.fillStyle = "#d8a040";
  ctx.beginPath(); ctx.moveTo(-17, -6); ctx.lineTo(-22, -5); ctx.lineTo(-17, -3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-14, -8, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-14, -8, 0.8, 0, Math.PI*2); ctx.fill();
  // Legs
  ctx.strokeStyle = "#8a5818"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(-4, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, 14); ctx.lineTo(4, 22); ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,200,140,0.5)";
  ctx.beginPath(); ctx.ellipse(-6, 0, 3, 5, -0.4, 0, Math.PI*2); ctx.fill();
}

function drawChicken(ctx) {
  shadow(ctx, 16);
  // Body
  const g = ctx.createRadialGradient(-4, -2, 3, 0, 4, 16);
  g.addColorStop(0, "#fffce8"); g.addColorStop(0.6, "#f0d8a0"); g.addColorStop(1, "#a87838");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 6, 13, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.8; ctx.stroke();
  // Wing
  ctx.fillStyle = "#d8b070";
  ctx.beginPath(); ctx.ellipse(2, 6, 8, 5, 0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.2; ctx.stroke();
  // Tail tuft
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.moveTo(11, 0); ctx.bezierCurveTo(18, -4, 18, 6, 11, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.4; ctx.stroke();
  // Head
  ctx.fillStyle = "#fff8d8";
  ctx.beginPath(); ctx.arc(-9, -4, 6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.6; ctx.stroke();
  // Comb
  ctx.fillStyle = "#d83a18";
  ctx.beginPath();
  ctx.moveTo(-11, -10); ctx.quadraticCurveTo(-9, -14, -8, -10);
  ctx.quadraticCurveTo(-6, -14, -5, -10); ctx.quadraticCurveTo(-3, -13, -3, -10);
  ctx.lineTo(-11, -10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 1.0; ctx.stroke();
  // Wattle
  ctx.fillStyle = "#d83a18";
  ctx.beginPath(); ctx.ellipse(-12, 1, 2, 3, 0, 0, Math.PI*2); ctx.fill();
  // Beak
  ctx.fillStyle = "#f0a020";
  ctx.beginPath(); ctx.moveTo(-13, -4); ctx.lineTo(-17, -3); ctx.lineTo(-13, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-10, -5, 1, 0, Math.PI*2); ctx.fill();
  // Legs
  ctx.strokeStyle = "#d8a040"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-3, 16); ctx.lineTo(-4, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, 16); ctx.lineTo(4, 22); ctx.stroke();
}

function drawHen(ctx) {
  shadow(ctx, 17);
  // Hen sitting on a nest
  ctx.fillStyle = "#a87838";
  for (let i = -16; i <= 16; i += 2) {
    ctx.strokeStyle = "#7a5418"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(i, 18); ctx.lineTo(i + (i%4===0?3:-3), 12); ctx.stroke();
  }
  ctx.fillStyle = "#5a3814";
  ctx.beginPath(); ctx.ellipse(0, 18, 17, 4, 0, 0, Math.PI*2); ctx.fill();
  // Body — fluffier than chicken
  const g = ctx.createRadialGradient(-4, -2, 3, 0, 4, 16);
  g.addColorStop(0, "#f8d8a0"); g.addColorStop(0.6, "#a86838"); g.addColorStop(1, "#5a3408");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 4, 15, 12, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2.0; ctx.stroke();
  // Feather pattern
  ctx.strokeStyle = "rgba(58,32,8,0.55)"; ctx.lineWidth = 0.9;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI + Math.PI;
    const cx = Math.cos(a) * (4 + r*2.4); const cy = 4 + Math.sin(a) * (4 + r*2);
    ctx.beginPath(); ctx.arc(cx, cy, 2, a - 0.3, a + 0.3); ctx.stroke();
  }
  // Head
  ctx.fillStyle = "#f0c878";
  ctx.beginPath(); ctx.arc(-8, -7, 6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  // Small comb
  ctx.fillStyle = "#d83a18";
  ctx.beginPath(); ctx.moveTo(-10, -12); ctx.quadraticCurveTo(-8, -15, -6, -12); ctx.quadraticCurveTo(-4, -14, -3, -11); ctx.lineTo(-10, -12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 1.0; ctx.stroke();
  // Beak
  ctx.fillStyle = "#f0a020";
  ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(-16, -6); ctx.lineTo(-12, -5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-9, -8, 1.1, 0, Math.PI*2); ctx.fill();
  // Egg poking out
  ctx.fillStyle = "#fff4d0";
  ctx.beginPath(); ctx.ellipse(8, 14, 4, 5, 0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#a8804a"; ctx.lineWidth = 1.0; ctx.stroke();
}

function drawRooster(ctx) {
  shadow(ctx, 20);
  // Tail — proud arching feathers
  const tailColors = ["#1a3a18", "#3a6818", "#7a4a18", "#5a2008", "#3a1808"];
  tailColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(8, 4);
    ctx.bezierCurveTo(18, -8 - i*3, 18 - i*2, -16 - i*2, 8 - i*2, -14 - i);
    ctx.bezierCurveTo(14 - i*2, -8 - i, 14 - i*2, -2, 8, 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#0a0a04"; ctx.lineWidth = 1.0; ctx.stroke();
  });
  // Body
  const bg = ctx.createRadialGradient(-4, 0, 3, 0, 4, 16);
  bg.addColorStop(0, "#e8743a"); bg.addColorStop(0.6, "#8a2a08"); bg.addColorStop(1, "#3a0808");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(-2, 6, 12, 10, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 2.0; ctx.stroke();
  // Wing
  ctx.fillStyle = "#5a1408";
  ctx.beginPath(); ctx.ellipse(-2, 8, 7, 5, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.2; ctx.stroke();
  // Head
  ctx.fillStyle = "#d83a18";
  ctx.beginPath(); ctx.arc(-10, -6, 6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 1.6; ctx.stroke();
  // Tall comb
  ctx.fillStyle = "#e83a18";
  ctx.beginPath();
  ctx.moveTo(-13, -10); ctx.quadraticCurveTo(-12, -16, -10, -12);
  ctx.quadraticCurveTo(-8, -18, -6, -12); ctx.quadraticCurveTo(-4, -16, -3, -11);
  ctx.lineTo(-13, -10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 1.2; ctx.stroke();
  // Wattle
  ctx.fillStyle = "#e83a18";
  ctx.beginPath(); ctx.ellipse(-13, 0, 3, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 1.0; ctx.stroke();
  // Beak
  ctx.fillStyle = "#f8c040";
  ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-19, -5); ctx.lineTo(-14, -4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-11, -7, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-11, -7, 0.8, 0, Math.PI*2); ctx.fill();
  // Legs
  ctx.strokeStyle = "#f0a020"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-3, 14); ctx.lineTo(-5, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, 14); ctx.lineTo(5, 22); ctx.stroke();
}

function gooseBase(ctx, bodyColor1, bodyColor2, headColor, beakColor) {
  shadow(ctx, 20);
  // Body — long horizontal
  const g = ctx.createRadialGradient(-4, 0, 3, 0, 4, 18);
  g.addColorStop(0, bodyColor1); g.addColorStop(1, bodyColor2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 6, 16, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 2.0; ctx.stroke();
  // Tail tip
  ctx.fillStyle = bodyColor2;
  ctx.beginPath(); ctx.moveTo(16, 2); ctx.lineTo(22, 0); ctx.lineTo(16, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Wing fold
  ctx.fillStyle = bodyColor2;
  ctx.beginPath(); ctx.ellipse(4, 6, 11, 6, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Long S-neck
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6;
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.bezierCurveTo(-16, -6, -16, -16, -8, -14);
  ctx.bezierCurveTo(-2, -12, -2, -2, -6, 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Head
  ctx.fillStyle = headColor;
  ctx.beginPath(); ctx.arc(-10, -14, 5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Beak
  ctx.fillStyle = beakColor;
  ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(-19, -13); ctx.lineTo(-14, -11); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-11, -15, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-11, -15, 0.7, 0, Math.PI*2); ctx.fill();
  // Legs
  ctx.fillStyle = beakColor;
  [[-2, 16], [4, 16]].forEach(([fx, fy]) => {
    ctx.strokeStyle = beakColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx, 14); ctx.lineTo(fx, fy + 4); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx - 3, fy + 4); ctx.lineTo(fx + 3, fy + 4);
    ctx.lineTo(fx + 4, fy + 6); ctx.lineTo(fx, fy + 5); ctx.lineTo(fx - 4, fy + 6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  });
}

function drawWildGoose(ctx) {
  gooseBase(ctx, "#a89878", "#5a4818", "#1a1408", "#3a2008");
  // White cheek patch
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath(); ctx.ellipse(-9, -13, 3, 2, 0, 0, Math.PI*2); ctx.fill();
}

function drawGoose(ctx) {
  gooseBase(ctx, "#fffce8", "#c8b890", "#fffce8", "#f0a020");
}

function drawParrot(ctx) {
  shadow(ctx, 18);
  // Branch
  ctx.fillStyle = "#5a3814";
  ctx.fillRect(-22, 18, 44, 4);
  ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 1.2;
  ctx.strokeRect(-22, 18, 44, 4);
  // Tail
  ctx.fillStyle = "#1a4a8a";
  ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(20, 14); ctx.lineTo(14, 18); ctx.lineTo(8, 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a1a3a"; ctx.lineWidth = 1.4; ctx.stroke();
  // Body — bright red
  const bg = ctx.createRadialGradient(-4, -2, 3, 0, 4, 16);
  bg.addColorStop(0, "#ff8a40"); bg.addColorStop(0.5, "#d81818"); bg.addColorStop(1, "#5a0808");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, 4, 12, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 2.0; ctx.stroke();
  // Wing — yellow & blue
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.ellipse(2, 4, 8, 6, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#1a8a3a";
  ctx.beginPath(); ctx.ellipse(2, 6, 6, 4, 0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a3a18"; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.fillStyle = "#1a4a8a";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-2 + i*2, 9);
    ctx.lineTo(-2 + i*2, 14);
    ctx.lineTo(0 + i*2, 14);
    ctx.lineTo(0 + i*2, 9); ctx.closePath(); ctx.fill();
  }
  // Head
  ctx.fillStyle = "#d81818";
  ctx.beginPath(); ctx.arc(-9, -6, 6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 1.6; ctx.stroke();
  // White face mask
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath(); ctx.ellipse(-12, -5, 3, 4, -0.3, 0, Math.PI*2); ctx.fill();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-12, -6, 1.0, 0, Math.PI*2); ctx.fill();
  // Curved beak
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath();
  ctx.moveTo(-14, -4); ctx.bezierCurveTo(-18, -3, -18, 2, -14, 1);
  ctx.lineTo(-12, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 0.8; ctx.stroke();
  // Foot
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2.0;
  ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(-3, 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, 14); ctx.lineTo(3, 18); ctx.stroke();
}

function drawPhoenix(ctx) {
  // Aura
  const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
  aura.addColorStop(0, "rgba(255,200,80,0.5)"); aura.addColorStop(0.6, "rgba(255,80,20,0.25)"); aura.addColorStop(1, "rgba(255,40,10,0)");
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI*2); ctx.fill();
  // Tail flames
  const flame = ["#fff4a0", "#f8d040", "#f08020", "#d83a08", "#7a1408"];
  flame.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(8, 4);
    ctx.bezierCurveTo(18 + i, -4 - i*2, 22 - i, -14 - i*2, 12 - i*2, -18 - i);
    ctx.bezierCurveTo(18 - i*2, -8 - i, 16, -2, 8, 4);
    ctx.closePath(); ctx.fill();
  });
  // Body — fiery
  const bg = ctx.createRadialGradient(-4, 0, 3, 0, 4, 16);
  bg.addColorStop(0, "#ffe8a0"); bg.addColorStop(0.4, "#f8a020"); bg.addColorStop(0.8, "#d83a08"); bg.addColorStop(1, "#5a0808");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(-2, 4, 12, 10, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 2.0; ctx.stroke();
  // Wings — large flaming
  [-1, 1].forEach(side => {
    ctx.save(); ctx.translate(0, 2); ctx.scale(side, 1);
    ctx.fillStyle = "#f8a020";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.bezierCurveTo(8, -6, 16, -2, 18, 6); ctx.bezierCurveTo(14, 4, 8, 4, 0, 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5a1408"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = "#fff4a0";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(4 + i*3, 0); ctx.lineTo(8 + i*3, -4); ctx.lineTo(8 + i*3, 0); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  });
  // Head
  ctx.fillStyle = "#f8a020";
  ctx.beginPath(); ctx.arc(-10, -8, 5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a1408"; ctx.lineWidth = 1.6; ctx.stroke();
  // Crest of flame
  ctx.fillStyle = "#fff4a0";
  ctx.beginPath();
  ctx.moveTo(-10, -13); ctx.quadraticCurveTo(-7, -22, -4, -16);
  ctx.quadraticCurveTo(-2, -22, -2, -14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#d83a08"; ctx.lineWidth = 1.0; ctx.stroke();
  // Beak
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.moveTo(-13, -7); ctx.lineTo(-18, -6); ctx.lineTo(-13, -5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye — glowing
  ctx.fillStyle = "#fff4a0"; ctx.beginPath(); ctx.arc(-11, -9, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#d83a08"; ctx.beginPath(); ctx.arc(-11, -9, 0.8, 0, Math.PI*2); ctx.fill();
  // Sparks
  ctx.fillStyle = "#fff4a0";
  [[18, -8], [-16, 6], [12, 14], [-18, -2], [16, 0]].forEach(([sx, sy]) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? 2 : 0.6;
      const x = sx + Math.cos(a) * r; const y = sy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  });
}

function drawDodo(ctx) {
  shadow(ctx, 20);
  // Tail — silly tuft
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath(); ctx.moveTo(12, 2); ctx.bezierCurveTo(20, -4, 22, 4, 14, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a4818"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#a89878";
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(15 + i*1.5, -2 + i*2, 1.5, 0, Math.PI*2); ctx.fill(); }
  // Body — round and chunky
  const bg = ctx.createRadialGradient(-4, -2, 3, 0, 4, 18);
  bg.addColorStop(0, "#d8c8a0"); bg.addColorStop(0.6, "#8a7048"); bg.addColorStop(1, "#3a2810");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(-2, 6, 14, 12, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a1004"; ctx.lineWidth = 2.0; ctx.stroke();
  // Tiny wing
  ctx.fillStyle = "#7a6038";
  ctx.beginPath(); ctx.ellipse(4, 4, 5, 3, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2810"; ctx.lineWidth = 1.2; ctx.stroke();
  // Head — big round
  ctx.fillStyle = "#a89878";
  ctx.beginPath(); ctx.arc(-10, -8, 7, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a1004"; ctx.lineWidth = 1.8; ctx.stroke();
  // Big hooked beak
  ctx.fillStyle = "#e8a040";
  ctx.beginPath();
  ctx.moveTo(-14, -8); ctx.bezierCurveTo(-22, -8, -22, -2, -16, 0);
  ctx.bezierCurveTo(-13, -2, -13, -6, -14, -8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-20, -3); ctx.lineTo(-14, -2); ctx.stroke();
  // Eye — surprised
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-9, -9, 1.8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-9, -9, 1.0, 0, Math.PI*2); ctx.fill();
  // Legs — yellow stilts
  ctx.strokeStyle = "#e8a040"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-3, 17); ctx.lineTo(-5, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, 17); ctx.lineTo(5, 22); ctx.stroke();
  ctx.fillStyle = "#e8a040";
  [[-5, 22], [5, 22]].forEach(([fx, fy]) => {
    ctx.beginPath(); ctx.moveTo(fx - 3, fy); ctx.lineTo(fx + 3, fy); ctx.lineTo(fx + 4, fy + 1.5); ctx.lineTo(fx - 4, fy + 1.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.9; ctx.stroke();
  });
}

function drawPigInDisguise(ctx) {
  shadow(ctx, 20);
  // Pink pig body
  const bg = ctx.createRadialGradient(-4, -2, 3, 0, 4, 16);
  bg.addColorStop(0, "#ffd0d8"); bg.addColorStop(0.6, "#e88a98"); bg.addColorStop(1, "#7a3848");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(-2, 6, 14, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a1820"; ctx.lineWidth = 2.0; ctx.stroke();
  // Fake feathered wings — clearly glued on
  [-1, 1].forEach(side => {
    ctx.save(); ctx.translate(0, 4); ctx.scale(side, 1);
    ctx.fillStyle = "#fffce8";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.bezierCurveTo(6, -6, 14, -4, 16, 4); ctx.bezierCurveTo(10, 2, 4, 4, 0, 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#a8804a"; ctx.lineWidth = 1.4; ctx.setLineDash([2, 2]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#c8a878";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(6 + i*3, 0, 2, 4, 0.2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
  // Tail — curly pig tail (not bird)
  ctx.strokeStyle = "#7a3848"; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(13, 2); ctx.bezierCurveTo(18, -2, 14, -6, 18, -8);
  ctx.stroke();
  // Head — pig snout
  ctx.fillStyle = "#f8b8c8";
  ctx.beginPath(); ctx.arc(-10, -6, 6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a1820"; ctx.lineWidth = 1.6; ctx.stroke();
  // Snout
  ctx.fillStyle = "#e89098";
  ctx.beginPath(); ctx.ellipse(-13, -4, 4, 3, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a1820"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "#3a1820";
  ctx.beginPath(); ctx.ellipse(-14, -4, 0.7, 1.2, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-12, -4, 0.7, 1.2, 0, 0, Math.PI*2); ctx.fill();
  // Pig ear
  ctx.fillStyle = "#e89098";
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-5, -14); ctx.lineTo(-4, -8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a1820"; ctx.lineWidth = 1.2; ctx.stroke();
  // Glued-on beak (clearly fake)
  ctx.fillStyle = "#f8c040";
  ctx.beginPath(); ctx.moveTo(-15, -8); ctx.lineTo(-19, -6); ctx.lineTo(-15, -6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8; ctx.setLineDash([1.5, 1.5]); ctx.stroke();
  ctx.setLineDash([]);
  // Eye — sneaky
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-10, -8, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-10.5, -8, 0.8, 0, Math.PI*2); ctx.fill();
  // Legs (pig hooves, not bird)
  ctx.strokeStyle = "#7a3848"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-3, 16); ctx.lineTo(-4, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, 16); ctx.lineTo(4, 22); ctx.stroke();
  ctx.fillStyle = "#3a1820";
  ctx.fillRect(-6, 21, 4, 2); ctx.fillRect(2, 21, 4, 2);
}

export const ICONS = {
  bird_pheasant:        { label:"Pheasant",       color:"#8a4a18", draw:drawPheasant },
  bird_chicken:         { label:"Chicken",        color:"#f0d8a0", draw:drawChicken },
  bird_hen:             { label:"Hen",            color:"#a86838", draw:drawHen },
  bird_rooster:         { label:"Rooster",        color:"#d81818", draw:drawRooster },
  bird_wild_goose:      { label:"Wild Goose",     color:"#a89878", draw:drawWildGoose },
  bird_goose:           { label:"Goose",          color:"#fffce8", draw:drawGoose },
  bird_parrot:          { label:"Parrot",         color:"#d81818", draw:drawParrot },
  bird_phoenix:         { label:"Phoenix",        color:"#f8a020", draw:drawPhoenix },
  bird_dodo:            { label:"Dodo",           color:"#a89878", draw:drawDodo },
  bird_pig_in_disguise: { label:"Pig in Disguise", color:"#e88a98", draw:drawPigInDisguise },
};
