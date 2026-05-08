// Tile-collection category badges. Drawn at canvas origin (0,0). These are
// small (~24-40px) badges shown in the tile collection screen tab strip,
// so silhouettes are kept simple and readable at low resolutions.

function drawShadow(ctx, w = 18, h = 3) {
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCatGrass(ctx) {
  drawShadow(ctx, 18, 3);
  // Three blades + flower
  ctx.strokeStyle = "#2a4810";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  [[-12, 22, -10, -8], [-2, 22, 0, -16], [10, 22, 12, -8]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y1 - 8, x2 - 1, y2 + 6, x2, y2);
    ctx.stroke();
  });
  ctx.strokeStyle = "#5a8a26";
  ctx.lineWidth = 2;
  [[-12, 22, -10, -8], [-2, 22, 0, -16], [10, 22, 12, -8]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y1 - 8, x2 - 1, y2 + 6, x2, y2);
    ctx.stroke();
  });
  // Flower head on tallest
  ctx.fillStyle = "#f8d040";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 2.4, -16 + Math.sin(a) * 2.4, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#a87018";
  ctx.beginPath();
  ctx.arc(0, -16, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCatGrain(ctx) {
  drawShadow(ctx, 16, 3);
  // Stalk
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -8);
  ctx.stroke();
  // Wheat ear (twin rows of seeds)
  ctx.fillStyle = "#f4c84a";
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 0.6;
  for (let row = 0; row < 5; row++) {
    const y = -16 + row * 4;
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate(side * 4, y);
      ctx.rotate(side * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }
  // Top tip
  ctx.fillStyle = "#f4c84a";
  ctx.beginPath();
  ctx.ellipse(0, -22, 1.6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // Whiskers
  ctx.strokeStyle = "#c89320";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-2 + i, -22);
    ctx.lineTo(-4 + i * 2, -28);
    ctx.stroke();
  }
}

function drawCatWood(ctx) {
  drawShadow(ctx, 22, 4);
  // Log cross-section + standing log
  // Standing log
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.lineTo(-14, -10);
  ctx.lineTo(14, -10);
  ctx.lineTo(14, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Bark texture
  ctx.strokeStyle = "rgba(58,28,8,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, -10); ctx.lineTo(-10, 22);
  ctx.moveTo(0, -10); ctx.lineTo(0, 22);
  ctx.moveTo(8, -10); ctx.lineTo(8, 22);
  ctx.stroke();
  // Top end-grain (oval)
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.ellipse(0, -10, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Tree rings
  ctx.strokeStyle = "rgba(122,74,24,0.7)";
  ctx.lineWidth = 0.8;
  [3, 6, 9, 12].forEach((r) => {
    ctx.beginPath();
    ctx.ellipse(0, -10, r, 1.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawCatBerry(ctx) {
  drawShadow(ctx, 18, 3);
  // Stem
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, -8);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.ellipse(-4, -18, 4, 2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, -18, 4, 2, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a4810";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(-4, -18, 4, 2, -0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(4, -18, 4, 2, 0.4, 0, Math.PI * 2);
  ctx.stroke();
  // Berry cluster
  const pos = [[-6, -2], [4, -4], [-4, 6], [6, 4], [0, 12], [-8, 8], [8, 8]];
  pos.forEach(([x, y]) => {
    const grad = ctx.createRadialGradient(x - 1, y - 1, 0.5, x, y, 5);
    grad.addColorStop(0, "#e85a78");
    grad.addColorStop(0.6, "#a02a4a");
    grad.addColorStop(1, "#5a0820");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a0418";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,200,180,0.8)";
    ctx.beginPath();
    ctx.arc(x - 1, y - 1.4, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCatBird(ctx) {
  drawShadow(ctx, 16, 3);
  // Egg in nest
  // Nest
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.ellipse(0, 14, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Twigs
  ctx.strokeStyle = "rgba(58,28,8,0.7)";
  ctx.lineWidth = 1;
  for (let i = -16; i <= 16; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 16);
    ctx.lineTo(i + 2, 12);
    ctx.stroke();
  }
  // Egg
  const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
  grad.addColorStop(0, "#fffefa");
  grad.addColorStop(0.7, "#f0e2c0");
  grad.addColorStop(1, "#a89878");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 4, 9, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a6248";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Speckles
  ctx.fillStyle = "rgba(120,90,40,0.65)";
  [[-3, 0], [2, 4], [-1, 8], [4, -1]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-3, -2, 2, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Bird (tiny silhouette flying above)
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.moveTo(-10, -16);
  ctx.bezierCurveTo(-6, -20, -2, -20, 2, -16);
  ctx.bezierCurveTo(-2, -18, -6, -18, -10, -16);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, -18);
  ctx.bezierCurveTo(6, -22, 10, -22, 14, -18);
  ctx.bezierCurveTo(10, -20, 6, -20, 2, -18);
  ctx.fill();
}

function drawCatVegetables(ctx) {
  drawShadow(ctx, 18, 3);
  // Carrot leaning right
  ctx.save();
  ctx.translate(4, 0);
  ctx.rotate(0.2);
  ctx.fillStyle = "#e07820";
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.bezierCurveTo(-8, 0, -2, 18, 4, 16);
  ctx.bezierCurveTo(8, 14, 4, -2, 0, -8);
  ctx.bezierCurveTo(-2, -10, -6, -10, -6, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a2806";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1.6;
  [[-2, -8, -4, -16], [0, -10, 0, -18], [2, -8, 4, -16]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  ctx.restore();
  // Mushroom (left)
  ctx.fillStyle = "#fff5dc";
  ctx.beginPath();
  ctx.rect(-12, 4, 5, 10);
  ctx.fill();
  ctx.strokeStyle = "#7a5028";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Cap
  ctx.fillStyle = "#c8281a";
  ctx.beginPath();
  ctx.moveTo(-16, 4);
  ctx.bezierCurveTo(-16, -6, -2, -6, -2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a0808";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#fff8e8";
  [[-12, -2, 1.4], [-6, 0, 1.2]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCatFruits(ctx) {
  drawShadow(ctx, 18, 3);
  // Apple (centered)
  const grad = ctx.createRadialGradient(-4, -6, 1, 0, 0, 16);
  grad.addColorStop(0, "#ffae90");
  grad.addColorStop(0.5, "#d4543a");
  grad.addColorStop(1, "#7a1808");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-2, -10);
  ctx.bezierCurveTo(-16, -10, -16, 14, -2, 18);
  ctx.bezierCurveTo(2, 18, 2, 18, 2, 18);
  ctx.bezierCurveTo(16, 14, 16, -10, 2, -10);
  ctx.bezierCurveTo(0, -8, 0, -8, -2, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a0808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Center cleft
  ctx.strokeStyle = "rgba(90,8,8,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-1, 4, 1, 12, 0, 18);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,200,160,0.65)";
  ctx.beginPath();
  ctx.ellipse(-6, -2, 3, 7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(2, -16);
  ctx.stroke();
  // Leaf
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(2, -16);
  ctx.bezierCurveTo(10, -20, 14, -14, 8, -10);
  ctx.bezierCurveTo(4, -12, 2, -14, 2, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a4810";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function drawCatFlowers(ctx) {
  drawShadow(ctx, 16, 3);
  // Stem
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -8);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.ellipse(-4, 6, 4, 1.6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, 12, 4, 1.6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Flower (5-petal pink)
  ctx.fillStyle = "#e85878";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    ctx.save();
    ctx.translate(0, -8);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -7, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a8284a";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }
  // Center
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  ctx.arc(0, -8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Pollen dots
  ctx.fillStyle = "#fffae0";
  [[0, -8, 0.8], [-1, -9, 0.6], [1, -7, 0.6]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCatTrees(ctx) {
  drawShadow(ctx, 22, 4);
  // Trunk
  ctx.fillStyle = "#5a3a14";
  ctx.beginPath();
  ctx.rect(-3, 4, 6, 18);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Foliage cone (fir-shaped)
  ctx.fillStyle = "#3a6018";
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.lineTo(0, -4);
  ctx.lineTo(12, 8);
  ctx.lineTo(8, 8);
  ctx.lineTo(0, 0);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a2a04";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(0, -16);
  ctx.lineTo(14, -4);
  ctx.lineTo(10, -4);
  ctx.lineTo(0, -12);
  ctx.lineTo(-10, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, -16);
  ctx.lineTo(0, -24);
  ctx.lineTo(10, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Highlights
  ctx.fillStyle = "rgba(120,180,80,0.5)";
  [[-4, -2, 2], [-2, -10, 2], [-1, -18, 1.6]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Star on top
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 2.4 : 0.9;
    ctx.lineTo(Math.cos(a) * r, -26 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function drawCatHerd(ctx) {
  drawShadow(ctx, 22, 4);
  // Sheep silhouette — wooly cloud body
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.arc(-10, 4, 7, 0, Math.PI * 2);
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.arc(10, 4, 7, 0, Math.PI * 2);
  ctx.arc(-4, -4, 6, 0, Math.PI * 2);
  ctx.arc(6, -4, 6, 0, Math.PI * 2);
  ctx.ellipse(0, 6, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a6248";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Head
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(-14, 4, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Ears
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(-16, -1, 1.6, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-12, -1, 1.6, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.arc(-15, 3, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Legs
  ctx.fillStyle = "#3a2010";
  ctx.fillRect(-8, 12, 2, 8);
  ctx.fillRect(-2, 12, 2, 8);
  ctx.fillRect(4, 12, 2, 8);
  // Wool curls
  ctx.strokeStyle = "rgba(122,98,72,0.5)";
  ctx.lineWidth = 0.7;
  for (let x = -8; x <= 8; x += 4) {
    ctx.beginPath();
    ctx.arc(x, 0, 1.4, 0, Math.PI);
    ctx.stroke();
  }
}

function drawCatCattle(ctx) {
  drawShadow(ctx, 22, 4);
  // Cow body
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.ellipse(2, 4, 16, 10, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Black spots
  ctx.fillStyle = "#1a0a04";
  [[-6, 2, 4, 3], [4, 6, 5, 3], [10, -2, 3, 2.4]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Head
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.ellipse(-14, 0, 7, 6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Snout
  ctx.fillStyle = "#e8b8a0";
  ctx.beginPath();
  ctx.ellipse(-19, 2, 3, 2.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a3010";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Nostrils
  ctx.fillStyle = "#5a1808";
  ctx.beginPath();
  ctx.arc(-20, 2, 0.6, 0, Math.PI * 2);
  ctx.arc(-19, 3, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath();
  ctx.arc(-13, -2, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Horns
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.moveTo(-16, -5); ctx.lineTo(-20, -10); ctx.lineTo(-15, -8); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, -5); ctx.lineTo(-8, -10); ctx.lineTo(-13, -8); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Udder
  ctx.fillStyle = "#e8b8a0";
  ctx.beginPath();
  ctx.ellipse(2, 14, 4, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a3010";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Legs
  ctx.fillStyle = "#fffae0";
  ctx.fillRect(-6, 12, 3, 8);
  ctx.fillRect(2, 12, 3, 8);
  ctx.fillRect(10, 12, 3, 8);
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-6, 12, 3, 8);
  ctx.strokeRect(2, 12, 3, 8);
  ctx.strokeRect(10, 12, 3, 8);
  // Tail
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(20, 8);
  ctx.stroke();
  ctx.fillStyle = "#3a1c08";
  ctx.beginPath();
  ctx.arc(20, 8, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCatMounts(ctx) {
  drawShadow(ctx, 22, 4);
  // Horse silhouette
  ctx.fillStyle = "#a86838";
  // Body
  ctx.beginPath();
  ctx.ellipse(2, 4, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Neck
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-18, -10);
  ctx.lineTo(-14, -10);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Head
  ctx.beginPath();
  ctx.ellipse(-18, -10, 5, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Snout
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.ellipse(-22, -8, 2.4, 1.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Nostril
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath();
  ctx.arc(-22, -8, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath();
  ctx.arc(-18, -11, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Ear
  ctx.fillStyle = "#a86838";
  ctx.beginPath();
  ctx.moveTo(-16, -14); ctx.lineTo(-15, -18); ctx.lineTo(-13, -14); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Mane
  ctx.fillStyle = "#3a1c08";
  ctx.beginPath();
  ctx.moveTo(-14, -10);
  ctx.bezierCurveTo(-12, -14, -8, -8, -6, -2);
  ctx.bezierCurveTo(-10, -4, -14, -6, -14, -10);
  ctx.closePath();
  ctx.fill();
  // Legs
  ctx.fillStyle = "#a86838";
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  [-8, -2, 6, 12].forEach((x) => {
    ctx.beginPath();
    ctx.rect(x, 10, 3, 10);
    ctx.fill();
    ctx.stroke();
  });
  // Hooves
  ctx.fillStyle = "#1a0a04";
  [-8, -2, 6, 12].forEach((x) => {
    ctx.beginPath();
    ctx.rect(x, 18, 3, 2);
    ctx.fill();
  });
  // Tail
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.bezierCurveTo(24, 8, 22, 16, 20, 18);
  ctx.stroke();
}

export const ICONS = {
  cat_grass:        { label:"Grass",     color:"#5a8a26", draw:drawCatGrass },
  cat_grain:        { label:"Grain",     color:"#c89320", draw:drawCatGrain },
  cat_wood:         { label:"Wood",      color:"#7a4a18", draw:drawCatWood },
  cat_berry:        { label:"Berry",     color:"#a02a4a", draw:drawCatBerry },
  cat_bird:         { label:"Bird",      color:"#a89878", draw:drawCatBird },
  cat_vegetables:   { label:"Vegetable", color:"#e07820", draw:drawCatVegetables },
  cat_fruits:       { label:"Fruit",     color:"#d4543a", draw:drawCatFruits },
  cat_flowers:      { label:"Flower",    color:"#e85878", draw:drawCatFlowers },
  cat_trees:        { label:"Tree",      color:"#3a6018", draw:drawCatTrees },
  cat_herd_animals: { label:"Herd",      color:"#fffae0", draw:drawCatHerd },
  cat_cattle:       { label:"Cattle",    color:"#fffae0", draw:drawCatCattle },
  cat_mounts:       { label:"Mount",     color:"#a86838", draw:drawCatMounts },
};
