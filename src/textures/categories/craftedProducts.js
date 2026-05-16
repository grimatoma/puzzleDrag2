// Terminal / crafted products: soup, pie, honey, meat, milk, horseshoe, eggs, bread.
// Drawn at canvas origin (0,0), scaled for ~48px tile icons.

function drawShadow(ctx, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSoup(ctx) {
  drawShadow(ctx, 24, 4);
  // Bowl base shadow
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bowl body (terracotta)
  const bowl = ctx.createLinearGradient(0, -4, 0, 18);
  bowl.addColorStop(0, "#e89058");
  bowl.addColorStop(0.5, "#c46a2f");
  bowl.addColorStop(1, "#7a3818");
  ctx.fillStyle = bowl;
  ctx.beginPath();
  ctx.moveTo(-22, -2);
  ctx.bezierCurveTo(-22, 16, 22, 16, 22, -2);
  ctx.bezierCurveTo(22, 0, -22, 0, -22, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Soup surface (top ellipse)
  const broth = ctx.createRadialGradient(-4, -6, 2, 0, -2, 22);
  broth.addColorStop(0, "#ffd84a");
  broth.addColorStop(0.6, "#e8a020");
  broth.addColorStop(1, "#a8580a");
  ctx.fillStyle = broth;
  ctx.beginPath();
  ctx.ellipse(0, -2, 21, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a3a08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Floating veggies
  ctx.fillStyle = "#e8602a";
  ctx.beginPath(); ctx.ellipse(-8, -3, 2.6, 1.6, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.ellipse(6, -1, 2.4, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff5c0";
  ctx.beginPath(); ctx.arc(-2, -4, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -5, 1.0, 0, Math.PI * 2); ctx.fill();
  // Steam wisps
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  [[-6, -10], [0, -14], [6, -10]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 3, y - 5, x + 3, y - 9, x, y - 14);
    ctx.stroke();
  });
  // Spoon handle
  ctx.strokeStyle = "#7a4a18";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(14, -4);
  ctx.lineTo(20, -16);
  ctx.stroke();
  ctx.fillStyle = "#c5a87a";
  ctx.beginPath();
  ctx.ellipse(20, -16, 3, 2, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPie(ctx) {
  drawShadow(ctx, 22, 4);
  // Pie tin (bottom)
  ctx.fillStyle = "#9a8870";
  ctx.beginPath();
  ctx.ellipse(0, 14, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2818";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Crust dome
  const crust = ctx.createRadialGradient(-4, -6, 2, 0, 0, 22);
  crust.addColorStop(0, "#f8d090");
  crust.addColorStop(0.5, "#d49058");
  crust.addColorStop(1, "#7a4218");
  ctx.fillStyle = crust;
  ctx.beginPath();
  ctx.moveTo(-22, 6);
  ctx.bezierCurveTo(-22, -16, 22, -16, 22, 6);
  ctx.bezierCurveTo(20, 12, -20, 12, -22, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Lattice top — diagonal strips
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-22, 6);
  ctx.bezierCurveTo(-22, -16, 22, -16, 22, 6);
  ctx.lineTo(22, 8);
  ctx.lineTo(-22, 8);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "#7a4218";
  ctx.lineWidth = 2.4;
  for (let i = -28; i <= 28; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, -16);
    ctx.lineTo(i + 16, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, -16);
    ctx.lineTo(i - 16, 8);
    ctx.stroke();
  }
  ctx.restore();
  // Berry filling glimpse through lattice
  ctx.fillStyle = "rgba(184, 24, 80, 0.85)";
  [[-6, -2], [4, -4], [-2, 4], [10, 0]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
  // Crimped edge
  ctx.strokeStyle = "#5a2a08";
  ctx.lineWidth = 1.5;
  for (let i = -22; i <= 22; i += 4) {
    ctx.beginPath();
    ctx.arc(i, 6, 2, Math.PI, 0);
    ctx.stroke();
  }
  // Highlight
  ctx.fillStyle = "rgba(255,250,210,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, -8, 6, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Steam
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  [[-4, -14], [4, -14]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 3, y - 4, x + 3, y - 7, x, y - 12);
    ctx.stroke();
  });
}

function drawHoney(ctx) {
  drawShadow(ctx, 18, 4);
  // Jar body (rounded)
  const jar = ctx.createLinearGradient(-14, 0, 14, 0);
  jar.addColorStop(0, "#f8c060");
  jar.addColorStop(0.5, "#e8a020");
  jar.addColorStop(1, "#a86010");
  ctx.fillStyle = jar;
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.bezierCurveTo(-16, 8, -16, 18, -10, 20);
  ctx.lineTo(10, 20);
  ctx.bezierCurveTo(16, 18, 16, 8, 14, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Jar neck/lip
  ctx.fillStyle = "#d49018";
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(12, -10);
  ctx.lineTo(11, -6);
  ctx.lineTo(-11, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Wood-spoon dipper rising out
  ctx.strokeStyle = "#c89548";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, -22);
  ctx.stroke();
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.ellipse(0, -22, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Honey label band
  ctx.fillStyle = "rgba(255,250,200,0.95)";
  ctx.beginPath();
  ctx.rect(-10, 4, 20, 8);
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Bee on label
  ctx.fillStyle = "#3a2200";
  ctx.beginPath(); ctx.ellipse(0, 8, 3, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.rect(-2, 7, 4, 2); ctx.fill();
  // Wings
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(-1.5, 6.5, 1.5, 1, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(1.5, 6.5, 1.5, 1, 0.4, 0, Math.PI * 2); ctx.fill();
  // Glass highlight
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-10, -2, 1.6, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Drip
  ctx.fillStyle = "#f8c060";
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.bezierCurveTo(-6, 0, -2, 2, -2, -4);
  ctx.fill();
}

function drawMeat(ctx) {
  drawShadow(ctx, 22, 4);
  // Meat body (drumstick)
  ctx.save();
  ctx.rotate(-0.3);
  // Bone (flared at top)
  ctx.fillStyle = "#f4ecd2";
  ctx.beginPath();
  ctx.ellipse(-10, -16, 6, 7, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a6448";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "#fffaea";
  ctx.beginPath();
  ctx.arc(-13, -19, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-7, -13, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a6448";
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(-13, -19, 2.6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-7, -13, 2.6, 0, Math.PI * 2); ctx.stroke();
  // Bone shaft
  ctx.fillStyle = "#f4ecd2";
  ctx.beginPath();
  ctx.moveTo(-8, -14);
  ctx.lineTo(2, -4);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a6448";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Roasted meat blob (pear shape)
  const meat = ctx.createRadialGradient(2, 6, 2, 2, 6, 22);
  meat.addColorStop(0, "#e88a4a");
  meat.addColorStop(0.4, "#c44848");
  meat.addColorStop(1, "#5e1818");
  ctx.fillStyle = meat;
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.bezierCurveTo(-16, 0, -18, 18, 0, 22);
  ctx.bezierCurveTo(20, 22, 22, 2, 8, 0);
  ctx.bezierCurveTo(8, -4, 2, -4, -2, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Roast char marks
  ctx.strokeStyle = "rgba(40,8,8,0.7)";
  ctx.lineWidth = 1.4;
  [[-4, 8], [4, 14], [10, 6]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + 3, y);
    ctx.stroke();
  });
  // Glaze highlight
  ctx.fillStyle = "rgba(255,210,170,0.55)";
  ctx.beginPath();
  ctx.ellipse(-2, 4, 4, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Steam wisp
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.bezierCurveTo(-8, -22, -2, -24, -6, -28);
  ctx.stroke();
}

function drawMilk(ctx) {
  drawShadow(ctx, 16, 4);
  // Bottle silhouette
  const body = ctx.createLinearGradient(-12, 0, 12, 0);
  body.addColorStop(0, "#fafff6");
  body.addColorStop(0.5, "#e6efe0");
  body.addColorStop(1, "#a8b0a0");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-8, -14);
  ctx.lineTo(-8, -18);
  ctx.lineTo(8, -18);
  ctx.lineTo(8, -14);
  ctx.bezierCurveTo(14, -10, 14, -4, 12, 0);
  ctx.lineTo(12, 18);
  ctx.bezierCurveTo(12, 22, 8, 22, 0, 22);
  ctx.bezierCurveTo(-8, 22, -12, 22, -12, 18);
  ctx.lineTo(-12, 0);
  ctx.bezierCurveTo(-14, -4, -14, -10, -8, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a605a";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Cap (red foil)
  ctx.fillStyle = "#c84830";
  ctx.beginPath();
  ctx.rect(-8, -22, 16, 6);
  ctx.fill();
  ctx.strokeStyle = "#5a1a08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Cap fold lines
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  for (let x = -6; x <= 6; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, -22);
    ctx.lineTo(x, -16);
    ctx.stroke();
  }
  // Label
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.rect(-10, -2, 20, 14);
  ctx.fill();
  ctx.strokeStyle = "#5a605a";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Drop icon on label
  ctx.fillStyle = "#3a82c4";
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.bezierCurveTo(-4, 4, -4, 8, 0, 10);
  ctx.bezierCurveTo(4, 8, 4, 4, 0, 1);
  ctx.closePath();
  ctx.fill();
  // Glass highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-9, 4, 1.6, 8, -0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawHorseshoe(ctx) {
  drawShadow(ctx, 22, 4);
  // Horseshoe U
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Outer steel
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.bezierCurveTo(-22, 0, -14, 18, 0, 18);
  ctx.bezierCurveTo(14, 18, 22, 0, 14, -14);
  ctx.stroke();
  // Inner highlight
  ctx.strokeStyle = "#9aa0a8";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.bezierCurveTo(-22, 0, -14, 18, 0, 18);
  ctx.bezierCurveTo(14, 18, 22, 0, 14, -14);
  ctx.stroke();
  // Center darker line
  ctx.strokeStyle = "#4e5258";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.bezierCurveTo(-22, 0, -14, 18, 0, 18);
  ctx.bezierCurveTo(14, 18, 22, 0, 14, -14);
  ctx.stroke();
  // Specular highlight
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.bezierCurveTo(-18, 4, -12, 14, -2, 14);
  ctx.stroke();
  // Nail holes (8)
  ctx.fillStyle = "#1a1c20";
  const nailPositions = [
    [-14, -8], [-18, 0], [-15, 10], [-7, 14],
    [7, 14], [15, 10], [18, 0], [14, -8],
  ];
  nailPositions.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
  // Lucky shine star
  ctx.fillStyle = "rgba(255,250,200,0.85)";
  ctx.beginPath();
  ctx.arc(-12, -12, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawEggs(ctx) {
  drawShadow(ctx, 22, 4);
  // Three eggs nestled in a basket
  // Basket body
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.bezierCurveTo(-22, 22, 22, 22, 22, 0);
  ctx.bezierCurveTo(20, 4, -20, 4, -22, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Weave pattern (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.bezierCurveTo(-22, 22, 22, 22, 22, 0);
  ctx.bezierCurveTo(20, 4, -20, 4, -22, 0);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(58,28,8,0.6)";
  ctx.lineWidth = 1.2;
  for (let y = 4; y <= 22; y += 4) {
    ctx.beginPath();
    ctx.moveTo(-24, y);
    ctx.lineTo(24, y);
    ctx.stroke();
  }
  for (let x = -20; x <= 20; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x, 22);
    ctx.stroke();
  }
  ctx.restore();
  // Basket lip
  ctx.strokeStyle = "#5a3018";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.bezierCurveTo(-20, 4, 20, 4, 22, 0);
  ctx.stroke();
  // Three eggs on top
  const eggs = [[-10, -4, -0.2], [0, -8, 0], [10, -4, 0.2]];
  eggs.forEach(([x, y, rot]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
    grad.addColorStop(0, "#fffefa");
    grad.addColorStop(0.7, "#f0e2c0");
    grad.addColorStop(1, "#a89878");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a6248";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(-2, -3, 1.6, 2.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Speckles on middle egg
    ctx.fillStyle = "rgba(120,90,40,0.65)";
    [[-2, 2], [2, 0], [0, 4], [-3, -1]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx, dy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  });
  // Sprig of straw
  ctx.strokeStyle = "#d4a020";
  ctx.lineWidth = 1.4;
  [[-14, -4, -16, -10], [14, -2, 16, -8]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
}

function drawBread(ctx) {
  drawShadow(ctx, 22, 4);
  // Loaf shape — oval bread
  ctx.save();
  ctx.rotate(-0.06);
  // Crust
  const crust = ctx.createRadialGradient(-4, -4, 4, 0, 4, 24);
  crust.addColorStop(0, "#f4d090");
  crust.addColorStop(0.4, "#d49058");
  crust.addColorStop(0.85, "#9a5818");
  crust.addColorStop(1, "#5a3008");
  ctx.fillStyle = crust;
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Score marks (3 diagonals)
  ctx.strokeStyle = "#5a2c08";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  [-9, 0, 9].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x - 3, -4);
    ctx.lineTo(x + 3, -8);
    ctx.stroke();
  });
  // Lighter slash inside (revealing crumb)
  ctx.strokeStyle = "#f4d090";
  ctx.lineWidth = 1;
  [-9, 0, 9].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x - 2, -5);
    ctx.lineTo(x + 2, -7);
    ctx.stroke();
  });
  // Crust shine
  ctx.fillStyle = "rgba(255,230,180,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, -2, 10, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Flour dust
  ctx.fillStyle = "rgba(255,250,220,0.55)";
  [[-10, 6], [4, 8], [12, 4], [-2, 12]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.8, 0, Math.PI * 2);
    ctx.fill();
  });
  // Underside shadow
  ctx.fillStyle = "rgba(58,16,4,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 14, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMineDirt(ctx) {
  drawShadow(ctx, 22, 4);
  // Pile of dark soil
  const body = ctx.createRadialGradient(0, 4, 4, 0, 8, 24);
  body.addColorStop(0, "#9a7048");
  body.addColorStop(0.6, "#6d4a2f");
  body.addColorStop(1, "#3a2410");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-22, 14);
  ctx.bezierCurveTo(-22, -8, -10, -16, 0, -14);
  ctx.bezierCurveTo(12, -14, 22, -6, 22, 14);
  ctx.bezierCurveTo(20, 18, -20, 18, -22, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Clods
  ctx.fillStyle = "rgba(60,30,12,0.7)";
  [[-10, 0, 4], [4, -4, 5], [12, 4, 4], [-4, 8, 3]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Highlights / dry crumbs
  ctx.fillStyle = "rgba(220,180,140,0.7)";
  [[-8, -6, 1.4], [6, -10, 1.2], [12, 0, 1.0], [-12, 4, 1.2], [0, 6, 0.9], [16, 10, 1.0]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Worm peeking
  ctx.strokeStyle = "#c87898";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-2, -4);
  ctx.bezierCurveTo(2, -10, -2, -14, 4, -16);
  ctx.stroke();
  ctx.fillStyle = "#a85868";
  ctx.beginPath();
  ctx.arc(4, -16, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

// Cured meat — a salt-rubbed ham, twine-wrapped for hanging. Distinct from
// `meat` (a hot roasted drumstick): drier, darker, dusted with cure salt.
function drawCuredMeat(ctx) {
  drawShadow(ctx, 20, 4);
  ctx.save();
  ctx.rotate(0.18);
  // Ham body — teardrop
  const ham = ctx.createRadialGradient(-2, 2, 3, 0, 6, 24);
  ham.addColorStop(0, "#c46a3a");
  ham.addColorStop(0.5, "#9a4a22");
  ham.addColorStop(1, "#4a2110");
  ctx.fillStyle = ham;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(16, -12, 20, 12, 2, 20);
  ctx.bezierCurveTo(-18, 16, -16, -8, 0, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e1408";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Bone nub at the narrow top
  ctx.fillStyle = "#f1e7cf";
  ctx.beginPath();
  ctx.ellipse(0, -15, 3.4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a6a3a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Twine wraps
  ctx.strokeStyle = "#d8c08a";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  [-2, 6].forEach((dy) => {
    ctx.beginPath();
    ctx.ellipse(1, dy, 13, 4.5, 0.15, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Cure-salt flecks
  ctx.fillStyle = "rgba(255,252,240,0.9)";
  [[-6, 0], [4, -4], [8, 8], [-3, 10], [2, 4], [10, 2]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  // Sheen
  ctx.fillStyle = "rgba(255,210,170,0.45)";
  ctx.beginPath();
  ctx.ellipse(-4, -2, 5, 2.4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Festival loaf — a plain loaf studded with fruit and finished with a
// sugar-glaze drizzle.
function drawFestivalLoaf(ctx) {
  drawBread(ctx);
  const berries = [[-9, -3, "#b81850"], [-1, -7, "#d8a020"], [7, -4, "#7a2e8a"], [11, 1, "#b81850"], [-5, 3, "#7a2e8a"]];
  berries.forEach(([x, y, c]) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(x - 0.7, y - 0.8, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  // Sugar-glaze drizzle
  ctx.strokeStyle = "rgba(255,250,235,0.85)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.bezierCurveTo(-6, 5, 6, -3, 13, 2);
  ctx.stroke();
}

// Wedding pie — a lattice pie ringed with piped-cream rosettes and a
// sugar-flower topper.
function drawWeddingPie(ctx) {
  drawPie(ctx);
  // Piped-cream rosettes around the rim
  ctx.fillStyle = "#fff6e4";
  [[-13, 5], [-4, 8], [5, 8], [13, 5], [0, 9]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(180,140,90,0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  // Sugar-flower topper
  ctx.fillStyle = "#fff6e4";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 3.2, -15 + Math.sin(a) * 3.2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e8b020";
  ctx.beginPath();
  ctx.arc(0, -15, 2, 0, Math.PI * 2);
  ctx.fill();
}

export const ICONS = {
  soup:          { label:"Soup",          color:"#c46a2f", draw:drawSoup },
  pie:           { label:"Pie",           color:"#b05428", draw:drawPie },
  honey:         { label:"Honey",         color:"#e8a020", draw:drawHoney },
  meat:          { label:"Meat",          color:"#c44848", draw:drawMeat },
  milk:          { label:"Milk",          color:"#faf6ec", draw:drawMilk },
  horseshoe:     { label:"Horseshoe",     color:"#8a8a90", draw:drawHorseshoe },
  eggs:          { label:"Eggs",          color:"#f8efd0", draw:drawEggs },
  bread:         { label:"Bread",         color:"#c89048", draw:drawBread },
  mine_dirt:     { label:"Dirt",          color:"#7a6850", draw:drawMineDirt },
  cured_meat:    { label:"Cured Meat",    color:"#9a4a22", draw:drawCuredMeat },
  festival_loaf: { label:"Festival Loaf", color:"#d49060", draw:drawFestivalLoaf },
  wedding_pie:   { label:"Wedding Pie",   color:"#b05428", draw:drawWeddingPie },
};
