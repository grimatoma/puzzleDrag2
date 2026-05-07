// Vegetables.

function drawCarrot(ctx) {
  ctx.save();
  ctx.rotate(-0.18);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Carrot body — tapered cone
  const body = ctx.createLinearGradient(-10, 0, 10, 0);
  body.addColorStop(0, "#ffae5a");
  body.addColorStop(0.5, "#e07820");
  body.addColorStop(1, "#a44808");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.bezierCurveTo(-12, -4, -8, 16, 0, 22);
  ctx.bezierCurveTo(8, 16, 12, -4, 10, -10);
  ctx.bezierCurveTo(8, -14, -8, -14, -10, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a2806";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Ridges
  ctx.strokeStyle = "rgba(90,40,6,0.55)";
  ctx.lineWidth = 1.1;
  [[-7, -8, -3, 18], [-2, -10, 1, 20], [4, -8, 6, 16]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + 1, (y1 + y2) / 2, x2 - 1, y2 - 4, x2, y2);
    ctx.stroke();
  });
  // Highlight
  ctx.strokeStyle = "rgba(255,230,180,0.7)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.bezierCurveTo(-4, 0, -3, 12, -2, 20);
  ctx.stroke();
  // Greens at top — three feathery fronds
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 4;
  [[-6, -12, -10, -24], [0, -14, 0, -26], [6, -12, 10, -24]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 6, x2, y2);
    ctx.stroke();
  });
  ctx.strokeStyle = "#7cb840";
  ctx.lineWidth = 2;
  [[-6, -12, -10, -24], [0, -14, 0, -26], [6, -12, 10, -24]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 6, x2, y2);
    ctx.stroke();
  });
  // Frond tufts
  ctx.fillStyle = "#7cb840";
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 0.8;
  [[-10, -24], [0, -26], [10, -24], [-7, -20], [7, -20], [-3, -22], [3, -22]].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawEggplant(ctx) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — pear shaped, deep purple
  const body = ctx.createRadialGradient(-4, -2, 2, 2, 6, 22);
  body.addColorStop(0, "#a868c8");
  body.addColorStop(0.5, "#582888");
  body.addColorStop(1, "#1f0838");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-14, -8, -16, 8, -10, 18);
  ctx.bezierCurveTo(-4, 22, 6, 22, 12, 18);
  ctx.bezierCurveTo(18, 8, 14, -8, 0, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#100420";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Specular highlight (long curved)
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, 0, 2.4, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(-3, 12, 1.4, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Calyx (green leaf cap)
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-10, -14, -10, -8, -6, -6);
  ctx.bezierCurveTo(-2, -10, 2, -10, 6, -6);
  ctx.bezierCurveTo(10, -8, 10, -14, 0, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Stem
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(2, -22);
  ctx.stroke();
  ctx.strokeStyle = "#7cb840";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(2, -22);
  ctx.stroke();
}

function drawTurnip(ctx) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — round, white at bottom, magenta/purple at top
  const body = ctx.createRadialGradient(-4, 4, 2, 0, 6, 18);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.5, "#f4d8e0");
  body.addColorStop(1, "#c8a8b4");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 6, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3a48";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Magenta cap at the top (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 6, 16, 0, Math.PI * 2);
  ctx.clip();
  const cap = ctx.createLinearGradient(0, -10, 0, 4);
  cap.addColorStop(0, "#c84a8a");
  cap.addColorStop(0.6, "#a83878");
  cap.addColorStop(1, "rgba(168,56,120,0)");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.ellipse(0, -2, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Vertical line on body
  ctx.strokeStyle = "rgba(120,60,90,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 22);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, 6, 3, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Root tap at bottom
  ctx.strokeStyle = "#5a3a48";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(2, 26);
  ctx.stroke();
  // Greens
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 3.5;
  [[-4, -10, -10, -22], [0, -12, 0, -24], [4, -10, 10, -22]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2 + 1, y1 - 4, x2, y2);
    ctx.stroke();
  });
  // Leaves
  ctx.fillStyle = "#7cb840";
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1;
  [[-10, -22], [0, -24], [10, -22]].forEach(([lx, ly]) => {
    ctx.beginPath();
    ctx.ellipse(lx, ly, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function drawBeet(ctx) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — deep magenta-red bulb
  const body = ctx.createRadialGradient(-3, -2, 1, 0, 4, 18);
  body.addColorStop(0, "#e0508a");
  body.addColorStop(0.5, "#a82058");
  body.addColorStop(1, "#48081f");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-14, -8, -18, 6, -12, 16);
  ctx.bezierCurveTo(-6, 22, 6, 22, 12, 16);
  ctx.bezierCurveTo(18, 6, 14, -8, 0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#280410";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Concentric rings (beet's distinctive grain)
  ctx.strokeStyle = "rgba(255,200,220,0.45)";
  ctx.lineWidth = 0.9;
  [4, 8, 12].forEach((r) => {
    ctx.beginPath();
    ctx.arc(-1, 4, r, -0.6, Math.PI - 0.3);
    ctx.stroke();
  });
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-5, -2, 2.4, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Tap root
  ctx.strokeStyle = "#280410";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.quadraticCurveTo(2, 22, 4, 26);
  ctx.stroke();
  // Stems
  ctx.strokeStyle = "#a82058";
  ctx.lineWidth = 2.2;
  [[-3, -10, -8, -22], [0, -12, 0, -24], [3, -10, 8, -22]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Leaves — dark green with magenta veins
  ctx.fillStyle = "#3a6018";
  ctx.strokeStyle = "#1f3808";
  ctx.lineWidth = 1.2;
  [[-8, -22], [0, -24], [8, -22]].forEach(([lx, ly]) => {
    ctx.beginPath();
    ctx.ellipse(lx, ly, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Magenta vein on one leaf
  ctx.strokeStyle = "#c84a8a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, -28);
  ctx.stroke();
}

function drawCucumber(ctx) {
  ctx.save();
  ctx.rotate(-0.45);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — long oval
  const body = ctx.createLinearGradient(0, -8, 0, 10);
  body.addColorStop(0, "#9ed05a");
  body.addColorStop(0.6, "#4a7820");
  body.addColorStop(1, "#1f3808");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#142808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Bumpy texture (small dark dots)
  ctx.fillStyle = "rgba(20,40,8,0.7)";
  for (let i = 0; i < 14; i++) {
    const x = -18 + (i * 3) + Math.sin(i) * 1.5;
    const y = 4 + Math.cos(i * 1.7) * 5;
    ctx.beginPath();
    ctx.arc(x, y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bumps with highlight
  ctx.fillStyle = "rgba(220,240,170,0.7)";
  for (let i = 0; i < 10; i++) {
    const x = -16 + (i * 3.5);
    const y = -1 + Math.cos(i * 1.3) * 2;
    ctx.beginPath();
    ctx.arc(x, y, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Long highlight
  ctx.strokeStyle = "rgba(220,240,170,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.bezierCurveTo(-8, -5, 8, -5, 16, -2);
  ctx.stroke();
  // Stem ends
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.arc(-22, 4, 2.6, 0, Math.PI * 2);
  ctx.arc(22, 4, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawSquash(ctx) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(2, 22, 22, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — pear/butternut shape (round bottom, narrow neck)
  const body = ctx.createRadialGradient(-4, 4, 2, 0, 8, 22);
  body.addColorStop(0, "#ffd28a");
  body.addColorStop(0.6, "#e09038");
  body.addColorStop(1, "#8a4810");
  ctx.fillStyle = body;
  ctx.beginPath();
  // Neck
  ctx.moveTo(-4, -18);
  ctx.bezierCurveTo(-6, -8, -6, -2, -8, 2);
  // Bulb left
  ctx.bezierCurveTo(-18, 6, -18, 22, 0, 22);
  // Bulb right
  ctx.bezierCurveTo(18, 22, 18, 6, 8, 2);
  // Neck back up
  ctx.bezierCurveTo(6, -2, 6, -8, 4, -18);
  // Top
  ctx.bezierCurveTo(2, -20, -2, -20, -4, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a2008";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Vertical ribs (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.bezierCurveTo(-6, -8, -6, -2, -8, 2);
  ctx.bezierCurveTo(-18, 6, -18, 22, 0, 22);
  ctx.bezierCurveTo(18, 22, 18, 6, 8, 2);
  ctx.bezierCurveTo(6, -2, 6, -8, 4, -18);
  ctx.bezierCurveTo(2, -20, -2, -20, -4, -18);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(74,32,8,0.5)";
  ctx.lineWidth = 1;
  [-10, -3, 4, 11].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -18);
    ctx.bezierCurveTo(x - 2, 0, x, 12, x + (x < 0 ? -1 : 1), 22);
    ctx.stroke();
  });
  ctx.restore();
  // Highlight
  ctx.fillStyle = "rgba(255,250,200,0.45)";
  ctx.beginPath();
  ctx.ellipse(-7, 6, 3, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.fillStyle = "#5a3a14";
  ctx.beginPath();
  ctx.moveTo(-3, -18);
  ctx.lineTo(3, -18);
  ctx.lineTo(2, -24);
  ctx.lineTo(-2, -24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawMushroom(ctx) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  const stem = ctx.createLinearGradient(-6, 0, 6, 0);
  stem.addColorStop(0, "#fff5dc");
  stem.addColorStop(0.5, "#f0d8a8");
  stem.addColorStop(1, "#a08858");
  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.bezierCurveTo(-8, 16, -6, 22, 0, 22);
  ctx.bezierCurveTo(6, 22, 8, 16, 7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a4220";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Cap — red dome
  const cap = ctx.createRadialGradient(-4, -6, 2, 0, 0, 22);
  cap.addColorStop(0, "#ff7a5a");
  cap.addColorStop(0.5, "#c8281a");
  cap.addColorStop(1, "#5a0808");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(-20, -2);
  ctx.bezierCurveTo(-22, -22, 22, -22, 20, -2);
  ctx.bezierCurveTo(20, 4, -20, 4, -20, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 2;
  ctx.stroke();
  // White spots
  ctx.fillStyle = "#fff8e8";
  ctx.strokeStyle = "rgba(120,60,30,0.4)";
  ctx.lineWidth = 0.6;
  [[-12, -8, 3], [-2, -14, 4], [10, -10, 3.5], [4, -4, 2.4], [-8, -2, 2]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Cap highlight band
  ctx.strokeStyle = "rgba(255,200,170,0.55)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-16, -10);
  ctx.bezierCurveTo(-8, -18, 8, -18, 16, -10);
  ctx.stroke();
  // Gills under cap (dark line)
  ctx.strokeStyle = "rgba(40,20,10,0.6)";
  ctx.lineWidth = 0.6;
  for (let x = -18; x <= 18; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 3);
    ctx.stroke();
  }
}

function drawPepper(ctx) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — bell pepper, glossy red
  const body = ctx.createRadialGradient(-4, -2, 2, 0, 6, 20);
  body.addColorStop(0, "#ff6868");
  body.addColorStop(0.5, "#c8181a");
  body.addColorStop(1, "#5a0408");
  ctx.fillStyle = body;
  ctx.beginPath();
  // 4 lobed shape
  ctx.moveTo(-2, -10);
  ctx.bezierCurveTo(-16, -6, -16, 14, -10, 20);
  ctx.bezierCurveTo(-6, 22, -2, 16, 0, 18);
  ctx.bezierCurveTo(2, 16, 6, 22, 10, 20);
  ctx.bezierCurveTo(16, 14, 16, -6, 2, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Lobe creases
  ctx.strokeStyle = "rgba(58,4,8,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, -8);
  ctx.bezierCurveTo(-6, 6, -3, 14, -2, 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5, -8);
  ctx.bezierCurveTo(6, 6, 3, 14, 2, 20);
  ctx.stroke();
  // Specular highlight
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.ellipse(-5, 0, 2.4, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(6, 4, 1.4, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Stem cap (green calyx)
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.bezierCurveTo(-8, -14, 8, -14, 6, -8);
  ctx.bezierCurveTo(2, -10, -2, -10, -6, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Stem
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, -22);
  ctx.stroke();
  ctx.strokeStyle = "#a87a3a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, -22);
  ctx.stroke();
}

function drawBroccoli(ctx) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stalk
  const stem = ctx.createLinearGradient(-6, 0, 6, 0);
  stem.addColorStop(0, "#d8e890");
  stem.addColorStop(1, "#80a040");
  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.bezierCurveTo(-7, 14, -5, 22, 0, 22);
  ctx.bezierCurveTo(5, 22, 7, 14, 6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a5a14";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Side stem branches
  ctx.strokeStyle = "#3a5a14";
  ctx.lineWidth = 2;
  [[0, 8, -10, 0], [0, 6, 10, 0]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Florets — many small dark green clusters
  const florets = [
    { x: 0, y: -10, r: 12 },
    { x: -10, y: -4, r: 9 },
    { x: 10, y: -4, r: 9 },
    { x: -4, y: -16, r: 8 },
    { x: 6, y: -16, r: 8 },
  ];
  florets.forEach((f) => {
    const grad = ctx.createRadialGradient(f.x - f.r * 0.3, f.y - f.r * 0.3, 1, f.x, f.y, f.r);
    grad.addColorStop(0, "#5a8a26");
    grad.addColorStop(0.7, "#2e5410");
    grad.addColorStop(1, "#142a04");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0a1804";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });
  // Bumpy floret texture (tiny circles)
  ctx.fillStyle = "rgba(30,80,20,0.85)";
  for (const f of florets) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = f.r * 0.55;
      const dx = Math.cos(a) * r + Math.cos(a * 2.3) * 1.5;
      const dy = Math.sin(a) * r + Math.sin(a * 1.7) * 1.5;
      ctx.beginPath();
      ctx.arc(f.x + dx, f.y + dy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Top sparkle
  ctx.fillStyle = "rgba(180,220,140,0.5)";
  [[-6, -16, 1.4], [4, -18, 1.6], [-12, -8, 1.2], [12, -8, 1.2]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const ICONS = {
  veg_carrot:   { label:"Carrot",   color:"#e07820", draw:drawCarrot },
  veg_eggplant: { label:"Eggplant", color:"#582888", draw:drawEggplant },
  veg_turnip:   { label:"Turnip",   color:"#c8a8b4", draw:drawTurnip },
  veg_beet:     { label:"Beet",     color:"#a82058", draw:drawBeet },
  veg_cucumber: { label:"Cucumber", color:"#7eb44a", draw:drawCucumber },
  veg_squash:   { label:"Squash",   color:"#e09038", draw:drawSquash },
  veg_mushroom: { label:"Mushroom", color:"#c8281a", draw:drawMushroom },
  veg_pepper:   { label:"Pepper",   color:"#c8181a", draw:drawPepper },
  veg_broccoli: { label:"Broccoli", color:"#5a8a26", draw:drawBroccoli },
};
