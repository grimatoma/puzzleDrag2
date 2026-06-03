// Tile-collection category badges. Drawn at canvas origin (0,0). These are
// small (~24-40px) badges shown in the tile collection screen tab strip,
// so silhouettes are kept simple and readable at low resolutions.

function drawShadow(ctx: CanvasRenderingContext2D, w = 18, h = 3) {
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCatGrass(ctx: CanvasRenderingContext2D) {
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

function drawCatGrain(ctx: CanvasRenderingContext2D) {
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
  // Whiskers (awns) — short fan kept inside the safe area
  ctx.strokeStyle = "#c89320";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  [-1, 0, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.lineTo(side * 3, -25.5);
    ctx.stroke();
  });
}

function drawCatWood(ctx: CanvasRenderingContext2D) {
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

function drawCatBerry(ctx: CanvasRenderingContext2D) {
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

function drawCatBird(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 16, 3);
  // Stylised perched songbird so the category badge actually shows a *bird*
  // (was previously an egg in a nest, which collided with cat_eggs etc).
  // Perch
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, 18);
  ctx.lineTo(16, 18);
  ctx.stroke();
  // Body — round, leaning slightly forward
  const grad = ctx.createRadialGradient(-3, -2, 2, 0, 2, 14);
  grad.addColorStop(0, "#f8d878");
  grad.addColorStop(0.6, "#c8682a");
  grad.addColorStop(1, "#5a2008");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 4, 11, 10, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Wing
  ctx.fillStyle = "#7a3010";
  ctx.beginPath();
  ctx.ellipse(2, 5, 7, 5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Wing feathers
  ctx.strokeStyle = "rgba(26,14,4,0.7)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-3 + i * 2, 3);
    ctx.lineTo(-3 + i * 2, 8);
    ctx.stroke();
  }
  // Head
  ctx.fillStyle = "#c8682a";
  ctx.beginPath();
  ctx.arc(-7, -6, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Beak
  ctx.fillStyle = "#f0a020";
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(-17, -5);
  ctx.lineTo(-12, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3814";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Eye with catch-light
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-8, -7, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-8, -7, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-7.7, -7.3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Tail — small fan
  ctx.fillStyle = "#5a2008";
  ctx.beginPath();
  ctx.moveTo(10, 2);
  ctx.lineTo(16, -1);
  ctx.lineTo(15, 3);
  ctx.lineTo(16, 7);
  ctx.lineTo(10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Feet gripping the perch
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  [-2, 4].forEach((fx) => {
    ctx.beginPath();
    ctx.moveTo(fx, 14);
    ctx.lineTo(fx, 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx - 2, 18);
    ctx.lineTo(fx + 2, 18);
    ctx.stroke();
  });
}

function drawCatVegetables(ctx: CanvasRenderingContext2D) {
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

function drawCatFruits(ctx: CanvasRenderingContext2D) {
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

function drawCatFlowers(ctx: CanvasRenderingContext2D) {
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

function drawCatTrees(ctx: CanvasRenderingContext2D) {
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

function drawCatHerd(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  // Legs first (behind the wool)
  ctx.fillStyle = "#3a2010";
  ctx.strokeStyle = "#1a0e06";
  ctx.lineWidth = 0.8;
  [-6, 0, 6].forEach((x) => {
    ctx.beginPath();
    ctx.rect(x - 1, 11, 2.6, 9);
    ctx.fill();
    ctx.stroke();
  });
  // Wool body — one bumpy cloud silhouette built from a ring of arcs
  const cx = 2;
  const cy = 1;
  const lobes = 9;
  ctx.beginPath();
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * 13;
    const py = cy + Math.sin(a) * 9.5;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const pa = ((i - 1) / lobes) * Math.PI * 2 - Math.PI / 2;
      const ma = (a + pa) / 2;
      ctx.quadraticCurveTo(
        cx + Math.cos(ma) * 16.5,
        cy + Math.sin(ma) * 12,
        px,
        py,
      );
    }
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 17);
  grad.addColorStop(0, "#fffdf2");
  grad.addColorStop(0.7, "#f3ebd6");
  grad.addColorStop(1, "#d8cbac");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#8a7252";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Subtle wool curls (interior detail, kept light)
  ctx.strokeStyle = "rgba(138,114,82,0.45)";
  ctx.lineWidth = 0.9;
  [[-6, -2], [0, 2], [6, -1], [-2, 5]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(cx + x, cy + y, 1.8, Math.PI * 0.1, Math.PI * 0.95);
    ctx.stroke();
  });
  // Head
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(-13, 2, 5, 4.2, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e06";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Ears
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(-15, -2, 1.6, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-11, -2, 1.6, 3, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Wool tuft on forehead
  ctx.fillStyle = "#fffdf2";
  ctx.beginPath();
  ctx.arc(-13, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a7252";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Eye with catch-light
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.arc(-14, 1.5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a0e06";
  ctx.beginPath();
  ctx.arc(-14, 1.5, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Specular highlight on wool
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(cx - 5, cy - 5, 3.5, 2.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCatCattle(ctx: CanvasRenderingContext2D) {
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

function drawCatMounts(ctx: CanvasRenderingContext2D) {
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
