// Festive / holiday / winter celebration icons.

function drawShadow(ctx: CanvasRenderingContext2D, w = 18, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Local rounded-rect helper (codebase convention is a per-file `rr`).
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSnowman(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 16, 4);
  // Twig arms (behind body)
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  // Left arm
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(-20, -4);
  ctx.moveTo(-15, -1);
  ctx.lineTo(-18, -6);
  ctx.moveTo(-14, 0);
  ctx.lineTo(-19, 1);
  ctx.stroke();
  // Right arm
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(20, -3);
  ctx.moveTo(15, 0);
  ctx.lineTo(19, -7);
  ctx.moveTo(15, 0);
  ctx.lineTo(20, 3);
  ctx.stroke();
  // Three snow balls — bottom, middle, head
  const balls: Array<[number, number, number]> = [
    [0, 12, 11],
    [0, 1, 8.5],
    [0, -10, 6.5],
  ];
  balls.forEach(([cx, cy, r]) => {
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 1, cx, cy, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.6, "#eef4fa");
    g.addColorStop(1, "#c2d2e2");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9bb0c6";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });
  // Soft snowy highlight crescents
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  [[-3, 8, 4, 1.4], [-3, -2, 3, 1.1], [-2, -12, 2.4, 0.9]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Coal buttons on the middle ball
  ctx.fillStyle = "#2a2a30";
  [[0, -2], [0, 2], [0, 6]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
  // Coal eyes
  ctx.fillStyle = "#2a2a30";
  [[-2.4, -11.5], [2.4, -11.5]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
  // Coal smile (small dots)
  ctx.fillStyle = "#2a2a30";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * 1.5, -7 + Math.abs(i) * 0.4, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Carrot nose
  const nose = ctx.createLinearGradient(0, -9, 8, -9);
  nose.addColorStop(0, "#ffae5a");
  nose.addColorStop(1, "#d4641a");
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, -8.4);
  ctx.lineTo(0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a44808";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // Scarf — wraps the neck between head and middle ball
  ctx.fillStyle = "#c8281a";
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.quadraticCurveTo(0, -1, 7, -4);
  ctx.quadraticCurveTo(0, 1, -7, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a0e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Hanging scarf tail
  ctx.fillStyle = "#c8281a";
  ctx.beginPath();
  ctx.moveTo(4, -4);
  ctx.lineTo(9, 4);
  ctx.lineTo(6, 5);
  ctx.lineTo(2, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a0e08";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Scarf fringe
  ctx.strokeStyle = "#e6c8a0";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(6, 5); ctx.lineTo(6, 7);
  ctx.moveTo(8, 4.6); ctx.lineTo(8.4, 6.6);
  ctx.stroke();
}

function drawGift(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Box body
  const box = ctx.createLinearGradient(0, -4, 0, 22);
  box.addColorStop(0, "#3aa86a");
  box.addColorStop(1, "#1c6e42");
  ctx.fillStyle = box;
  ctx.beginPath();
  rr(ctx, -16, -2, 32, 24, 2);
  ctx.fill();
  ctx.strokeStyle = "#0e3a22";
  ctx.lineWidth = 2;
  ctx.beginPath();
  rr(ctx, -16, -2, 32, 24, 2);
  ctx.stroke();
  // Box lid
  ctx.fillStyle = "#46c47e";
  ctx.beginPath();
  rr(ctx, -18, -8, 36, 8, 2);
  ctx.fill();
  ctx.strokeStyle = "#0e3a22";
  ctx.lineWidth = 2;
  ctx.beginPath();
  rr(ctx, -18, -8, 36, 8, 2);
  ctx.stroke();
  // Lid highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  rr(ctx, -16, -7, 32, 2, 1);
  ctx.fill();
  // Vertical ribbon
  ctx.fillStyle = "#e8c020";
  ctx.beginPath();
  rr(ctx, -4, -8, 8, 30, 1);
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 1;
  ctx.beginPath();
  rr(ctx, -4, -8, 8, 30, 1);
  ctx.stroke();
  // Ribbon highlight
  ctx.fillStyle = "rgba(255,255,200,0.55)";
  ctx.beginPath();
  rr(ctx, -3, -8, 2, 30, 1);
  ctx.fill();
  // Bow loops
  ctx.fillStyle = "#f4cc28";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-12, -22, -16, -8, -2, -8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(12, -22, 16, -8, 2, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-12, -22, -16, -8, -2, -8);
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(12, -22, 16, -8, 2, -8);
  ctx.stroke();
  // Bow loop inner shading
  ctx.strokeStyle = "rgba(168,120,8,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, -9); ctx.bezierCurveTo(-9, -16, -11, -10, -2, -9);
  ctx.moveTo(2, -9); ctx.bezierCurveTo(9, -16, 11, -10, 2, -9);
  ctx.stroke();
  // Bow knot
  ctx.fillStyle = "#e8c020";
  ctx.beginPath();
  ctx.arc(0, -8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,200,0.7)";
  ctx.beginPath();
  ctx.arc(-1, -9, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawWreath(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Evergreen ring — layered needle strokes around a circle
  const R = 16;
  // Dark base ring
  ctx.strokeStyle = "#143a1c";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(0, -1, R, 0, Math.PI * 2);
  ctx.stroke();
  // Mid green ring
  ctx.strokeStyle = "#1f5a2e";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, -1, R, 0, Math.PI * 2);
  ctx.stroke();
  // Needle tufts — short outward strokes for a bushy look
  ctx.lineCap = "round";
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const cx = Math.cos(a) * R;
    const cy = Math.sin(a) * R - 1;
    const outR = 4 + (i % 3);
    const nx = Math.cos(a + 0.3) * outR;
    const ny = Math.sin(a + 0.3) * outR;
    ctx.strokeStyle = i % 2 === 0 ? "#2e7a3e" : "#3a8a48";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + nx, cy + ny);
    ctx.stroke();
  }
  // Inner needle strokes
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const cx = Math.cos(a) * R;
    const cy = Math.sin(a) * R - 1;
    ctx.strokeStyle = "#2e7a3e";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - Math.cos(a) * 4, cy - Math.sin(a) * 4);
    ctx.stroke();
  }
  // Highlight sparkles on the green
  ctx.fillStyle = "rgba(170,230,160,0.6)";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R, Math.sin(a) * R - 1, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Red berries
  ctx.fillStyle = "#d4281a";
  [[-12, 6], [-7, 9], [-13, 0], [10, -10], [13, -3]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,200,180,0.7)";
    ctx.beginPath();
    ctx.arc(x - 0.5, y - 0.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4281a";
  });
  // Red bow at the bottom
  ctx.fillStyle = "#c8181a";
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-12, 6, -14, 18, -2, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(12, 6, 14, 18, 2, 16);
  ctx.closePath();
  ctx.fill();
  // Bow tails
  ctx.beginPath();
  ctx.moveTo(-2, 15);
  ctx.lineTo(-6, 24);
  ctx.lineTo(-2, 23);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 15);
  ctx.lineTo(6, 24);
  ctx.lineTo(2, 23);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a0e08";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-12, 6, -14, 18, -2, 16);
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(12, 6, 14, 18, 2, 16);
  ctx.stroke();
  // Bow knot
  ctx.fillStyle = "#e0402a";
  ctx.beginPath();
  ctx.arc(0, 14.5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,200,180,0.7)";
  ctx.beginPath();
  ctx.arc(-0.8, 13.8, 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawHolly(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 14, 3.5);
  // Two pointed holly leaves with serrated edges
  const leans: number[] = [-0.5, 0.5];
  leans.forEach((lean) => {
    const g = ctx.createLinearGradient(0, -12, lean * 18, 14);
    g.addColorStop(0, "#3a9a4a");
    g.addColorStop(1, "#16622a");
    ctx.fillStyle = g;
    ctx.save();
    ctx.rotate(lean * 0.6);
    // Serrated leaf shape (spiky bezier outline)
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.bezierCurveTo(4, -11, 2, -8, 6, -7);
    ctx.bezierCurveTo(3, -4, 5, -1, 7, 1);
    ctx.bezierCurveTo(3, 2, 4, 6, 3, 9);
    ctx.bezierCurveTo(1, 11, -1, 11, -3, 9);
    ctx.bezierCurveTo(-4, 6, -3, 2, -7, 1);
    ctx.bezierCurveTo(-5, -1, -3, -4, -6, -7);
    ctx.bezierCurveTo(-2, -8, -4, -11, 0, -14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0e3a18";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Midrib
    ctx.strokeStyle = "rgba(160,220,150,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 8);
    ctx.stroke();
    // Side veins
    ctx.strokeStyle = "rgba(14,58,24,0.5)";
    ctx.lineWidth = 0.7;
    [-6, 0, 6].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(4, y - 2);
      ctx.moveTo(0, y);
      ctx.lineTo(-4, y - 2);
      ctx.stroke();
    });
    ctx.restore();
  });
  // Cluster of red berries at the center
  ctx.fillStyle = "#d4281a";
  const berries: Array<[number, number, number]> = [[-2.5, 2, 3], [2.5, 1, 3], [0, 5, 3]];
  berries.forEach(([x, y, r]) => {
    const bg = ctx.createRadialGradient(x - 1, y - 1, 0.5, x, y, r);
    bg.addColorStop(0, "#ff6a52");
    bg.addColorStop(0.6, "#d4281a");
    bg.addColorStop(1, "#7a0e08");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a0808";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,220,200,0.8)";
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBell(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 14, 4);
  // Top ribbon loop
  ctx.strokeStyle = "#c8181a";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-5, -22, 5, -22, 0, -16);
  ctx.stroke();
  // Crown / mount cap
  ctx.fillStyle = "#caa018";
  ctx.beginPath();
  ctx.arc(0, -14, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5808";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Bell body — golden flared dome
  const body = ctx.createLinearGradient(-12, 0, 12, 0);
  body.addColorStop(0, "#fff0a0");
  body.addColorStop(0.4, "#f0c828");
  body.addColorStop(0.7, "#c89818");
  body.addColorStop(1, "#8a6408");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(-7, -12, -10, 0, -13, 10);
  ctx.bezierCurveTo(-14, 13, -10, 14, 0, 14);
  ctx.bezierCurveTo(10, 14, 14, 13, 13, 10);
  ctx.bezierCurveTo(10, 0, 7, -12, 0, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Rim band
  ctx.fillStyle = "#b88808";
  ctx.beginPath();
  rr(ctx, -13, 10, 26, 4, 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3e08";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  rr(ctx, -13, 10, 26, 4, 2);
  ctx.stroke();
  // Vertical highlight
  ctx.fillStyle = "rgba(255,250,220,0.7)";
  ctx.beginPath();
  ctx.ellipse(-5, -2, 2, 9, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Clapper peeking out
  ctx.fillStyle = "#8a6408";
  ctx.beginPath();
  ctx.arc(0, 15, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3e08";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Holly accent at the top of the bell
  ctx.fillStyle = "#2e7a3e";
  [[-5, -10, -0.4], [5, -10, 0.4]].forEach(([x, y, lean]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0e3a18";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
  });
  ctx.fillStyle = "#d4281a";
  [[-1.5, -11], [1.5, -11], [0, -9]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGingerbread(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 14, 4);
  ctx.fillStyle = "#a86a32";
  // Head
  ctx.beginPath();
  ctx.arc(0, -13, 7, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.beginPath();
  rr(ctx, -7, -6, 14, 16, 5);
  ctx.fill();
  // Arms
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.bezierCurveTo(-16, -4, -18, 4, -14, 7);
  ctx.bezierCurveTo(-12, 5, -9, 2, -7, 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7, -4);
  ctx.bezierCurveTo(16, -4, 18, 4, 14, 7);
  ctx.bezierCurveTo(12, 5, 9, 2, 7, 2);
  ctx.closePath();
  ctx.fill();
  // Legs
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.bezierCurveTo(-9, 16, -10, 20, -6, 22);
  ctx.bezierCurveTo(-3, 20, -2, 14, -1, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 8);
  ctx.bezierCurveTo(9, 16, 10, 20, 6, 22);
  ctx.bezierCurveTo(3, 20, 2, 14, 1, 10);
  ctx.closePath();
  ctx.fill();
  // Single outline pass over the whole cookie shape
  ctx.strokeStyle = "#6a3c14";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -13, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  rr(ctx, -7, -6, 14, 16, 5);
  ctx.stroke();
  // Baked highlight
  ctx.fillStyle = "rgba(255,220,160,0.4)";
  ctx.beginPath();
  ctx.arc(-2, -15, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // White icing trim — wavy lines on wrists and ankles
  ctx.strokeStyle = "#fff8f0";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  // Collar
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.quadraticCurveTo(-3, -7, 0, -5);
  ctx.quadraticCurveTo(3, -7, 6, -5);
  ctx.stroke();
  // Wrist cuffs
  ctx.beginPath();
  ctx.moveTo(-14, 6); ctx.lineTo(-11, 3);
  ctx.moveTo(14, 6); ctx.lineTo(11, 3);
  ctx.stroke();
  // Ankle cuffs
  ctx.beginPath();
  ctx.moveTo(-8, 18); ctx.lineTo(-4, 18);
  ctx.moveTo(8, 18); ctx.lineTo(4, 18);
  ctx.stroke();
  // Icing eyes + smile
  ctx.fillStyle = "#fff8f0";
  ctx.beginPath();
  ctx.arc(-2.4, -14, 1.1, 0, Math.PI * 2);
  ctx.arc(2.4, -14, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff8f0";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -12, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // Gumdrop buttons (red + green)
  const buttons: Array<[number, number, string]> = [[0, 0, "#d4281a"], [0, 5, "#2e9a4a"]];
  buttons.forEach(([x, y, col]) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(x - 0.6, y - 0.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawOrnament(ctx: CanvasRenderingContext2D) {
  // Hanging hook + string from the top
  ctx.strokeStyle = "#8a8478";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -19, 2.4, Math.PI * 0.2, Math.PI * 1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, -13);
  ctx.stroke();
  // Cap
  ctx.fillStyle = "#caa018";
  ctx.beginPath();
  rr(ctx, -3, -15, 6, 4, 1);
  ctx.fill();
  ctx.strokeStyle = "#7a5808";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  rr(ctx, -3, -15, 6, 4, 1);
  ctx.stroke();
  // Ground shadow under the bauble
  drawShadow(ctx, 12, 3.5);
  // Bauble sphere
  const g = ctx.createRadialGradient(-4, -6, 2, 1, 0, 16);
  g.addColorStop(0, "#ff8a8a");
  g.addColorStop(0.45, "#d4281a");
  g.addColorStop(1, "#5a0808");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Painted gold stripe band across the middle (clipped to sphere)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#f0c828";
  ctx.beginPath();
  ctx.moveTo(-14, 1);
  ctx.quadraticCurveTo(0, -3, 14, 1);
  ctx.quadraticCurveTo(0, 5, -14, 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87808";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Small dots along the stripe
  ctx.fillStyle = "#fff0a0";
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(i * 4, 1 - Math.cos(i * 0.5) * 0.6, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Specular shine
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 2.4, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(3, 6, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawStocking(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 16, 4);
  // Stocking body — red boot shape
  const g = ctx.createLinearGradient(0, -8, 0, 22);
  g.addColorStop(0, "#e0402a");
  g.addColorStop(1, "#9e1810");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(8, -8);
  ctx.lineTo(8, 6);
  ctx.bezierCurveTo(8, 12, 6, 14, 0, 15);
  ctx.bezierCurveTo(-6, 16, -14, 18, -16, 14);
  ctx.bezierCurveTo(-18, 10, -12, 8, -8, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a0808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Body highlight
  ctx.fillStyle = "rgba(255,180,160,0.4)";
  ctx.beginPath();
  ctx.ellipse(2, -1, 2.4, 7, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Heel + toe darker patches
  ctx.fillStyle = "rgba(90,8,8,0.5)";
  ctx.beginPath();
  ctx.ellipse(-13, 13, 3.5, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-2, 12, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fuzzy white cuff
  ctx.fillStyle = "#fdfdfd";
  ctx.beginPath();
  rr(ctx, -10, -12, 20, 6, 3);
  ctx.fill();
  // Scalloped fluff along the cuff bottom
  for (let x = -9; x <= 9; x += 3) {
    ctx.beginPath();
    ctx.arc(x, -6, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#c2cdd8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  rr(ctx, -10, -12, 20, 6, 3);
  ctx.stroke();
  // Cuff soft shadow tufts
  ctx.fillStyle = "rgba(200,212,224,0.5)";
  [[-6, -9], [0, -9], [6, -9]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Candy cane poking out of the top
  ctx.save();
  ctx.translate(4, -10);
  ctx.rotate(0.25);
  // White cane
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -8);
  ctx.bezierCurveTo(0, -13, 7, -13, 7, -8);
  ctx.stroke();
  // Red stripes
  ctx.strokeStyle = "#d4281a";
  ctx.lineWidth = 1.4;
  [[0, 0], [0, -4]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 1.4, y + 1.2);
    ctx.lineTo(x + 1.4, y - 1.2);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(3, -12);
  ctx.lineTo(5, -10.4);
  ctx.stroke();
  ctx.restore();
}

function drawPinecone(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 12, 4);
  // Cone body silhouette
  const body = ctx.createLinearGradient(0, -16, 0, 18);
  body.addColorStop(0, "#a06a34");
  body.addColorStop(1, "#5a3414");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.bezierCurveTo(10, -14, 12, 4, 5, 16);
  ctx.bezierCurveTo(2, 19, -2, 19, -5, 16);
  ctx.bezierCurveTo(-12, 4, -10, -14, 0, -17);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Overlapping scales — staggered rows of little fan shapes (clipped to cone)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.bezierCurveTo(10, -14, 12, 4, 5, 16);
  ctx.bezierCurveTo(2, 19, -2, 19, -5, 16);
  ctx.bezierCurveTo(-12, 4, -10, -14, 0, -17);
  ctx.closePath();
  ctx.clip();
  for (let row = 0; row < 6; row++) {
    const y = -13 + row * 5;
    const half = 3 + row * 0.6;
    const offset = row % 2 === 0 ? 0 : 3;
    for (let x = -half - offset; x <= half; x += 3.2) {
      const g = ctx.createLinearGradient(x, y - 2, x, y + 3);
      g.addColorStop(0, "#c08a48");
      g.addColorStop(1, "#6a4018");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, y - 2.4);
      ctx.bezierCurveTo(x - 2.2, y, x - 1.4, y + 3, x, y + 3.4);
      ctx.bezierCurveTo(x + 1.4, y + 3, x + 2.2, y, x, y - 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(58,32,8,0.7)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // Scale tip highlight
      ctx.fillStyle = "rgba(255,220,160,0.4)";
      ctx.beginPath();
      ctx.arc(x, y + 1, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // Dusting of snow on top
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.bezierCurveTo(-3, -18, 3, -18, 7, -12);
  ctx.bezierCurveTo(4, -10, -4, -10, -7, -12);
  ctx.closePath();
  ctx.fill();
  // Snow flecks on a few scales
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  [[-5, -2, 1], [4, 1, 1], [-2, 7, 0.9], [6, -5, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCandyCane(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 12, 4);
  ctx.save();
  ctx.rotate(0.12);
  // White cane base — straight shaft + hook
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, 22);
  ctx.lineTo(-4, -8);
  ctx.bezierCurveTo(-4, -18, 12, -18, 12, -8);
  ctx.stroke();
  // Diagonal red bands down the shaft (clipped to the shaft column)
  ctx.save();
  ctx.beginPath();
  ctx.rect(-9, -8, 12, 32);
  ctx.clip();
  ctx.strokeStyle = "#d4281a";
  ctx.lineWidth = 3;
  for (let y = -8; y < 24; y += 7) {
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(6, y - 8);
    ctx.stroke();
  }
  ctx.restore();
  // Diagonal red bands around the hook
  ctx.save();
  ctx.beginPath();
  ctx.arc(4, -8, 12, Math.PI, Math.PI * 2);
  ctx.rect(-4, -20, 16, 12);
  ctx.clip();
  ctx.strokeStyle = "#d4281a";
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + i * 0.45;
    const x1 = 4 + Math.cos(a) * 4;
    const y1 = -8 + Math.sin(a) * 4;
    const x2 = 4 + Math.cos(a) * 16;
    const y2 = -8 + Math.sin(a) * 16;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
  // Re-stroke a thin white outline to keep crisp edges
  ctx.strokeStyle = "rgba(200,212,224,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-4, 22);
  ctx.lineTo(-4, -8);
  ctx.bezierCurveTo(-4, -18, 12, -18, 12, -8);
  ctx.stroke();
  // Specular shine running down the shaft
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, 18);
  ctx.lineTo(-6, -6);
  ctx.stroke();
  ctx.restore();
}

export const ICONS = {
  festive_snowman:     { label:"Snowman",     color:"#eef4fa", draw:drawSnowman },
  festive_gift:        { label:"Gift",        color:"#3aa86a", draw:drawGift },
  festive_wreath:      { label:"Wreath",      color:"#2e7a3e", draw:drawWreath },
  festive_holly:       { label:"Holly",       color:"#16622a", draw:drawHolly },
  festive_bell:        { label:"Jingle Bell", color:"#f0c828", draw:drawBell },
  festive_gingerbread: { label:"Gingerbread", color:"#a86a32", draw:drawGingerbread },
  festive_ornament:    { label:"Ornament",    color:"#d4281a", draw:drawOrnament },
  festive_stocking:    { label:"Stocking",    color:"#e0402a", draw:drawStocking },
  festive_pinecone:    { label:"Pinecone",    color:"#5a3414", draw:drawPinecone },
  festive_candy_cane:  { label:"Candy Cane",  color:"#d4281a", draw:drawCandyCane },
};
