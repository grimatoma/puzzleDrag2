// Cozy home & town decorations — hand-drawn procedural icons.

function drawShadow(ctx: CanvasRenderingContext2D, w = 20, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Local rounded-rect helper (codebase convention is a per-file path builder).
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLantern(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 12, 3);
  // Hanging ring at top
  ctx.strokeStyle = "#3a3d44";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -22, 3, 0, Math.PI * 2);
  ctx.stroke();
  // Hook bar down to cap
  ctx.beginPath();
  ctx.moveTo(0, -19);
  ctx.lineTo(0, -16);
  ctx.stroke();
  // Warm glow halo behind glass
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
  glow.addColorStop(0, "rgba(255,200,90,0.65)");
  glow.addColorStop(1, "rgba(255,200,90,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  // Top cap — metal trapezoid
  const cap = ctx.createLinearGradient(0, -16, 0, -10);
  cap.addColorStop(0, "#b8bcc4");
  cap.addColorStop(1, "#5a5e66");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(-9, -10);
  ctx.lineTo(-5, -16);
  ctx.lineTo(5, -16);
  ctx.lineTo(9, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a2d33";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Glass housing — warm panes
  const glass = ctx.createLinearGradient(0, -10, 0, 14);
  glass.addColorStop(0, "#ffe9a8");
  glass.addColorStop(0.5, "#ffc862");
  glass.addColorStop(1, "#e89030");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-9, -10);
  ctx.lineTo(9, -10);
  ctx.lineTo(8, 12);
  ctx.lineTo(-8, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Candle inside
  ctx.fillStyle = "#fff6e0";
  rr(ctx, -2.4, -2, 4.8, 12, 1);
  ctx.fill();
  ctx.strokeStyle = "#d8b878";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // Flame
  const flame = ctx.createLinearGradient(0, -8, 0, -2);
  flame.addColorStop(0, "#fffbe0");
  flame.addColorStop(0.5, "#ffd24a");
  flame.addColorStop(1, "#e8701a");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(3, -5, 2.5, -1, 0, -1);
  ctx.bezierCurveTo(-2.5, -1, -3, -5, 0, -8);
  ctx.closePath();
  ctx.fill();
  // Frame uprights + crossbars (metal lines over glass)
  ctx.strokeStyle = "#6a4818";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3, -10); ctx.lineTo(-2.6, 12);
  ctx.moveTo(3, -10); ctx.lineTo(2.6, 12);
  ctx.moveTo(-9, 1); ctx.lineTo(9, 1);
  ctx.stroke();
  // Metal base ring
  ctx.fillStyle = "#5a5e66";
  rr(ctx, -9, 12, 18, 3, 1);
  ctx.fill();
  ctx.strokeStyle = "#2a2d33";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Glass highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-5, 2, 1.4, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSignpost(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 12, 4);
  // Post
  const post = ctx.createLinearGradient(-3, 0, 3, 0);
  post.addColorStop(0, "#a8703a");
  post.addColorStop(0.5, "#7a4a1e");
  post.addColorStop(1, "#4a2c10");
  ctx.fillStyle = post;
  rr(ctx, -3, -16, 6, 38, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Post grain
  ctx.strokeStyle = "rgba(58,30,8,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-1, -12); ctx.lineTo(-1, 18);
  ctx.moveTo(1.4, -10); ctx.lineTo(1.4, 16);
  ctx.stroke();
  // Post cap
  ctx.fillStyle = "#8a5a28";
  ctx.beginPath();
  ctx.moveTo(-4, -16);
  ctx.lineTo(0, -20);
  ctx.lineTo(4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Arrow board (upper, pointing right)
  drawSignBoard(ctx, 1, -8, true);
  // Arrow board (lower, pointing left)
  drawSignBoard(ctx, -1, 4, false);
}

function drawSignBoard(ctx: CanvasRenderingContext2D, dir: number, y: number, light: boolean) {
  ctx.save();
  // dir = +1 right-pointing, -1 left-pointing
  const w = 22;
  const x0 = dir > 0 ? -2 : 2 - w;
  const board = ctx.createLinearGradient(0, y - 5, 0, y + 5);
  board.addColorStop(0, light ? "#d8a868" : "#c89858");
  board.addColorStop(1, light ? "#a8703a" : "#996632");
  ctx.fillStyle = board;
  ctx.beginPath();
  if (dir > 0) {
    ctx.moveTo(x0, y - 5);
    ctx.lineTo(x0 + w - 6, y - 5);
    ctx.lineTo(x0 + w, y);
    ctx.lineTo(x0 + w - 6, y + 5);
    ctx.lineTo(x0, y + 5);
  } else {
    ctx.moveTo(x0 + w, y - 5);
    ctx.lineTo(x0 + 6, y - 5);
    ctx.lineTo(x0, y);
    ctx.lineTo(x0 + 6, y + 5);
    ctx.lineTo(x0 + w, y + 5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Engraved text line
  ctx.strokeStyle = "rgba(58,30,8,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0 + 3, y);
  ctx.lineTo(x0 + w - 8, y);
  ctx.stroke();
  ctx.restore();
}

function drawMailbox(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 12, 4);
  // Post
  const post = ctx.createLinearGradient(-3, 0, 3, 0);
  post.addColorStop(0, "#9a652f");
  post.addColorStop(0.5, "#6e4318");
  post.addColorStop(1, "#3e260c");
  ctx.fillStyle = post;
  rr(ctx, -3, -2, 6, 24, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Mailbox body — rounded-top tube
  const body = ctx.createLinearGradient(0, -16, 0, -2);
  body.addColorStop(0, "#7ab0d8");
  body.addColorStop(0.5, "#4a82b8");
  body.addColorStop(1, "#2a5a88");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.lineTo(-13, -10);
  ctx.arc(0, -10, 13, Math.PI, 0, false);
  ctx.lineTo(13, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a3a58";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Body highlight
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -10, 10, Math.PI + 0.3, Math.PI * 1.6, false);
  ctx.stroke();
  // Front door — circular panel
  ctx.fillStyle = "#3a6e9a";
  ctx.beginPath();
  ctx.ellipse(-13, -7, 3, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a3a58";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Door knob
  ctx.fillStyle = "#c8cdd4";
  ctx.beginPath();
  ctx.arc(-12, -7, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Red flag (up) — metal post + flag
  ctx.strokeStyle = "#888d94";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(12, -4);
  ctx.lineTo(12, -16);
  ctx.stroke();
  ctx.fillStyle = "#d23a2a";
  ctx.beginPath();
  ctx.moveTo(12, -16);
  ctx.lineTo(20, -14);
  ctx.lineTo(12, -11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a1408";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Flag highlight
  ctx.fillStyle = "rgba(255,180,160,0.6)";
  ctx.beginPath();
  ctx.moveTo(12, -15.5);
  ctx.lineTo(17, -14.2);
  ctx.lineTo(12, -13);
  ctx.closePath();
  ctx.fill();
}

function drawFountain(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Lower stone basin
  ctx.fillStyle = "#aaa89c";
  ctx.beginPath();
  ctx.moveTo(-22, 12);
  ctx.lineTo(-18, 22);
  ctx.lineTo(18, 22);
  ctx.lineTo(22, 12);
  ctx.bezierCurveTo(14, 16, -14, 16, -22, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Basin mortar lines
  ctx.strokeStyle = "rgba(58,56,48,0.5)";
  ctx.lineWidth = 0.6;
  [-12, -4, 4, 12].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 14); ctx.lineTo(x + 1, 21);
    ctx.stroke();
  });
  // Pool water
  ctx.fillStyle = "#79c4d8";
  ctx.beginPath();
  ctx.ellipse(0, 12, 20, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a7888";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-8, 11, 6, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Central pillar
  ctx.fillStyle = "#9d9a90";
  rr(ctx, -5, -2, 10, 14, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Upper tier dish
  ctx.fillStyle = "#bbb8ae";
  ctx.beginPath();
  ctx.ellipse(0, -4, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Upper dish water
  ctx.fillStyle = "#79c4d8";
  ctx.beginPath();
  ctx.ellipse(0, -5, 8, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spout
  ctx.fillStyle = "#9d9a90";
  rr(ctx, -2, -14, 4, 10, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Water arcs spraying out the top
  ctx.strokeStyle = "rgba(150,210,230,0.85)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(-8, -18, -12, -10, -10, -4);
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(8, -18, 12, -10, 10, -4);
  ctx.stroke();
  // Splash droplets
  ctx.fillStyle = "#bce8f2";
  [[-10, -2, 1.3], [10, -2, 1.3], [-13, 8, 1.2], [12, 8, 1.2], [0, -18, 1.2]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBench(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Metal legs
  ctx.strokeStyle = "#2a2d33";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, 6); ctx.lineTo(-16, 22);
  ctx.moveTo(16, 6); ctx.lineTo(16, 22);
  // armrest curls
  ctx.moveTo(-18, 6); ctx.bezierCurveTo(-22, 4, -22, -2, -18, -4);
  ctx.moveTo(18, 6); ctx.bezierCurveTo(22, 4, 22, -2, 18, -4);
  ctx.stroke();
  // Leg feet
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-19, 22); ctx.lineTo(-13, 22);
  ctx.moveTo(13, 22); ctx.lineTo(19, 22);
  ctx.stroke();
  // Backrest slats
  const wood = (y0: number, y1: number) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, "#b87a3a");
    g.addColorStop(1, "#7a4a1e");
    return g;
  };
  ctx.fillStyle = wood(-14, -8);
  rr(ctx, -19, -14, 38, 4, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = wood(-8, -2);
  rr(ctx, -19, -8, 38, 4, 1.5);
  ctx.fill();
  ctx.stroke();
  // Seat slats
  ctx.fillStyle = wood(2, 8);
  rr(ctx, -19, 2, 38, 4, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = wood(7, 13);
  rr(ctx, -19, 7, 38, 4, 1.5);
  ctx.fill();
  ctx.stroke();
  // Slat highlights
  ctx.strokeStyle = "rgba(255,224,160,0.4)";
  ctx.lineWidth = 0.8;
  [-13, -7, 3, 8].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-18, y); ctx.lineTo(18, y);
    ctx.stroke();
  });
}

function drawWellBucket(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 14, 4);
  // Rope handle arch
  ctx.strokeStyle = "#a88040";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.bezierCurveTo(-9, -18, 9, -18, 11, -4);
  ctx.stroke();
  // Rope twist detail
  ctx.strokeStyle = "rgba(90,56,20,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.bezierCurveTo(-9, -18, 9, -18, 11, -4);
  ctx.stroke();
  // Bucket body — tapered tub
  const body = ctx.createLinearGradient(-13, 0, 13, 0);
  body.addColorStop(0, "#a8703a");
  body.addColorStop(0.5, "#7a4a1e");
  body.addColorStop(1, "#4a2c10");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.lineTo(-10, 20);
  ctx.lineTo(10, 20);
  ctx.lineTo(13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Staves (vertical planks)
  ctx.strokeStyle = "rgba(58,30,8,0.55)";
  ctx.lineWidth = 0.8;
  [-7, -2, 3, 8].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -3); ctx.lineTo(x * 0.78, 19);
    ctx.stroke();
  });
  // Top rim opening
  ctx.fillStyle = "#2a1808";
  ctx.beginPath();
  ctx.ellipse(0, -4, 13, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Water inside
  ctx.fillStyle = "#5aa0c0";
  ctx.beginPath();
  ctx.ellipse(0, -3.5, 10, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-3, -4, 3, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Metal bands (grey hoops)
  const band = (y: number, halfW: number) => {
    const g = ctx.createLinearGradient(0, y - 1.5, 0, y + 1.5);
    g.addColorStop(0, "#c0c4cc");
    g.addColorStop(0.5, "#8a8e96");
    g.addColorStop(1, "#5a5e66");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-halfW, y - 1.5);
    ctx.lineTo(halfW, y - 1.5);
    ctx.lineTo(halfW - 0.6, y + 1.5);
    ctx.lineTo(-halfW + 0.6, y + 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a3d44";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  };
  band(4, 11.6);
  band(15, 10.2);
}

function drawFlowerPot(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 14, 4);
  // Terracotta pot
  const pot = ctx.createLinearGradient(0, 4, 0, 22);
  pot.addColorStop(0, "#d8794a");
  pot.addColorStop(0.5, "#b8542a");
  pot.addColorStop(1, "#7a3014");
  ctx.fillStyle = pot;
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.lineTo(-9, 22);
  ctx.lineTo(9, 22);
  ctx.lineTo(12, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Pot rim
  ctx.fillStyle = "#c8633a";
  rr(ctx, -13, 2, 26, 5, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Rim highlight
  ctx.fillStyle = "rgba(255,200,150,0.45)";
  rr(ctx, -12, 3, 24, 1.4, 0.7);
  ctx.fill();
  // Soil
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(0, 4, 11, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stems + leaves
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  const stems: Array<[number, number]> = [[-7, -14], [0, -18], [7, -14]];
  stems.forEach(([tx, ty]) => {
    ctx.beginPath();
    ctx.moveTo(tx * 0.4, 3);
    ctx.quadraticCurveTo(tx * 0.6, (ty + 3) / 2, tx, ty);
    ctx.stroke();
  });
  ctx.fillStyle = "#5a8028";
  [[-5, -6], [4, -8], [-2, -12], [3, -2]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 3.2, 1.5, x < 0 ? -0.5 : 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // Blooms — five-petal flowers
  const blooms: Array<[number, number, string, string]> = [
    [-7, -14, "#e85a8a", "#ffd24a"],
    [0, -18, "#f0a030", "#ffe9a8"],
    [7, -14, "#9a6ad0", "#ffd24a"],
  ];
  blooms.forEach(([cx, cy, petal, core]) => {
    ctx.fillStyle = petal;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 2.6, cy + Math.sin(a) * 2.6, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPicketFence(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  const picketX = [-18, -6, 6, 18];
  const drawPicket = (x: number) => {
    const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.5, "#e4e6ea");
    g.addColorStop(1, "#b8bcc4");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 4, -12);
    ctx.lineTo(x, -18);
    ctx.lineTo(x + 4, -12);
    ctx.lineTo(x + 4, 20);
    ctx.lineTo(x - 4, 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7a8088";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // shading on right edge
    ctx.fillStyle = "rgba(120,128,140,0.35)";
    ctx.beginPath();
    ctx.moveTo(x + 1.5, -10);
    ctx.lineTo(x + 4, -12);
    ctx.lineTo(x + 4, 20);
    ctx.lineTo(x + 1.5, 20);
    ctx.closePath();
    ctx.fill();
  };
  // Rails behind pickets
  const rail = (y: number) => {
    const g = ctx.createLinearGradient(0, y - 2, 0, y + 2);
    g.addColorStop(0, "#f4f6fa");
    g.addColorStop(1, "#c0c4cc");
    ctx.fillStyle = g;
    rr(ctx, -22, y - 2, 44, 4, 1);
    ctx.fill();
    ctx.strokeStyle = "#7a8088";
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  rail(-2);
  rail(12);
  // Pickets on top of rails
  picketX.forEach(drawPicket);
}

function drawBarrel(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 16, 4);
  // Barrel body — bulging staves
  const body = ctx.createLinearGradient(-15, 0, 15, 0);
  body.addColorStop(0, "#a8703a");
  body.addColorStop(0.5, "#8a5424");
  body.addColorStop(1, "#5a3414");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-11, -16);
  ctx.bezierCurveTo(-18, -8, -18, 14, -11, 22);
  ctx.lineTo(11, 22);
  ctx.bezierCurveTo(18, 14, 18, -8, 11, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Visible staves
  ctx.strokeStyle = "rgba(58,30,8,0.55)";
  ctx.lineWidth = 1;
  [-8, -3, 2, 7].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x * 1.05, -15);
    ctx.bezierCurveTo(x * 1.45, -4, x * 1.45, 12, x * 1.05, 21);
    ctx.stroke();
  });
  // Stave highlight
  ctx.strokeStyle = "rgba(255,210,150,0.4)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.bezierCurveTo(-9, -4, -9, 12, -6, 20);
  ctx.stroke();
  // Top lid
  ctx.fillStyle = "#7a4a1e";
  ctx.beginPath();
  ctx.ellipse(0, -16, 11, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(58,30,8,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-9, -16); ctx.lineTo(9, -16);
  ctx.stroke();
  // Metal hoops
  const hoop = (y: number, halfW: number, bulge: number) => {
    const g = ctx.createLinearGradient(0, y - 2, 0, y + 2);
    g.addColorStop(0, "#c8ccd4");
    g.addColorStop(0.5, "#8a8e96");
    g.addColorStop(1, "#5a5e66");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-halfW, y);
    ctx.bezierCurveTo(-halfW + bulge, y - 3, halfW - bulge, y - 3, halfW, y);
    ctx.bezierCurveTo(halfW - bulge, y + 1, -halfW + bulge, y + 1, -halfW, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a3d44";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  };
  hoop(-9, 14.5, 2);
  hoop(3, 17, 2);
  hoop(16, 13.5, 2);
}

function drawBirdhouse(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 12, 4);
  // Hanging post / mount
  ctx.fillStyle = "#6e4318";
  rr(ctx, -2, 14, 4, 8, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // House body
  const body = ctx.createLinearGradient(-12, 0, 12, 0);
  body.addColorStop(0, "#d8a868");
  body.addColorStop(0.5, "#b8804a");
  body.addColorStop(1, "#8a5a28");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-11, -6);
  ctx.lineTo(0, -16);
  ctx.lineTo(11, -6);
  ctx.lineTo(11, 16);
  ctx.lineTo(-11, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Plank lines
  ctx.strokeStyle = "rgba(58,30,8,0.45)";
  ctx.lineWidth = 0.7;
  [0, 6, 12].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-11, y); ctx.lineTo(11, y);
    ctx.stroke();
  });
  // Peaked roof
  ctx.fillStyle = "#9a3a28";
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(0, -20);
  ctx.lineTo(14, -4);
  ctx.lineTo(11, -4);
  ctx.lineTo(0, -16);
  ctx.lineTo(-11, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a1408";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Roof shingle lines
  ctx.strokeStyle = "rgba(74,20,8,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-9, -8); ctx.lineTo(9, -8);
  ctx.moveTo(-5, -12); ctx.lineTo(5, -12);
  ctx.stroke();
  // Round entrance hole
  ctx.fillStyle = "#2a1808";
  ctx.beginPath();
  ctx.arc(0, 2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(80,50,30,0.6)";
  ctx.beginPath();
  ctx.arc(-1.4, 0.6, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Perch
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 9);
  ctx.lineTo(0, 14);
  ctx.stroke();
  ctx.fillStyle = "#7a4a1e";
  ctx.beginPath();
  ctx.arc(0, 9, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawWindChime(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 10, 3);
  // Hanging cord
  ctx.strokeStyle = "#8a6030";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, -14);
  ctx.stroke();
  // Top hook ring
  ctx.strokeStyle = "#5a5e66";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -23, 2.4, 0, Math.PI * 2);
  ctx.stroke();
  // Top disc (wood)
  const disc = ctx.createLinearGradient(0, -16, 0, -12);
  disc.addColorStop(0, "#c89858");
  disc.addColorStop(1, "#8a5a28");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.ellipse(0, -13, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Disc highlight
  ctx.fillStyle = "rgba(255,224,170,0.45)";
  ctx.beginPath();
  ctx.ellipse(-4, -14, 4, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dangling metal tubes
  const tubes: Array<[number, number]> = [[-9, 12], [-4.5, 16], [0, 18], [4.5, 16], [9, 12]];
  tubes.forEach(([x, len]) => {
    const top = -10;
    // string to tube
    ctx.strokeStyle = "rgba(90,90,90,0.6)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x * 0.4, -12);
    ctx.lineTo(x, top);
    ctx.stroke();
    // tube
    const g = ctx.createLinearGradient(x - 2, 0, x + 2, 0);
    g.addColorStop(0, "#d4d8e0");
    g.addColorStop(0.5, "#9a9ea6");
    g.addColorStop(1, "#6a6e76");
    ctx.fillStyle = g;
    rr(ctx, x - 1.8, top, 3.6, len, 1.4);
    ctx.fill();
    ctx.strokeStyle = "#4a4d54";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // tube glint
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - 0.6, top + 2); ctx.lineTo(x - 0.6, top + len - 2);
    ctx.stroke();
  });
  // Central clapper string + disc
  ctx.strokeStyle = "rgba(90,90,90,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(0, 14);
  ctx.stroke();
  // Clapper (wooden disc)
  ctx.fillStyle = "#b8804a";
  ctx.beginPath();
  ctx.arc(0, 16, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawStreetLamp(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 12, 4);
  // Base
  ctx.fillStyle = "#3a3d44";
  ctx.beginPath();
  ctx.moveTo(-8, 22);
  ctx.lineTo(-5, 16);
  ctx.lineTo(5, 16);
  ctx.lineTo(8, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Post — cast iron column
  const post = ctx.createLinearGradient(-3, 0, 3, 0);
  post.addColorStop(0, "#5a5e66");
  post.addColorStop(0.5, "#2e3137");
  post.addColorStop(1, "#16181c");
  ctx.fillStyle = post;
  rr(ctx, -2.6, -10, 5.2, 27, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Decorative collars on post
  ctx.fillStyle = "#4a4d54";
  [-6, 4, 12].forEach((y) => {
    rr(ctx, -3.6, y, 7.2, 2, 0.8);
    ctx.fill();
    ctx.strokeStyle = "#16181c";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });
  // Post highlight
  ctx.strokeStyle = "rgba(180,184,196,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-1.2, -8); ctx.lineTo(-1.2, 15);
  ctx.stroke();
  // Cross arm bracket
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-4, -12, -5, -14, -3, -16);
  ctx.stroke();
  // Warm glow halo
  const glow = ctx.createRadialGradient(0, -18, 2, 0, -18, 16);
  glow.addColorStop(0, "rgba(255,205,100,0.6)");
  glow.addColorStop(1, "rgba(255,205,100,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -18, 16, 0, Math.PI * 2);
  ctx.fill();
  // Lantern head cap (top)
  ctx.fillStyle = "#2e3137";
  ctx.beginPath();
  ctx.moveTo(-7, -22);
  ctx.lineTo(0, -28);
  ctx.lineTo(7, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Finial
  ctx.fillStyle = "#4a4d54";
  ctx.beginPath();
  ctx.arc(0, -29, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Glass head — glowing
  const glass = ctx.createLinearGradient(0, -22, 0, -12);
  glass.addColorStop(0, "#fff0b8");
  glass.addColorStop(0.5, "#ffcc62");
  glass.addColorStop(1, "#e89530");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-7, -22);
  ctx.lineTo(7, -22);
  ctx.lineTo(6, -12);
  ctx.lineTo(-6, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Frame mullions
  ctx.strokeStyle = "#3a2c10";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(0, -12);
  ctx.moveTo(-7, -17); ctx.lineTo(7, -17);
  ctx.stroke();
  // Glass highlight
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-3, -18, 1.2, 3.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Base ring under head
  ctx.fillStyle = "#2e3137";
  rr(ctx, -7, -12, 14, 2.4, 1);
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1;
  ctx.stroke();
}

export const ICONS = {
  cozy_lantern:      { label:"Lantern",       color:"#ffc862", draw:drawLantern },
  cozy_signpost:     { label:"Signpost",      color:"#a8703a", draw:drawSignpost },
  cozy_mailbox:      { label:"Mailbox",       color:"#4a82b8", draw:drawMailbox },
  cozy_fountain:     { label:"Fountain",      color:"#79c4d8", draw:drawFountain },
  cozy_bench:        { label:"Bench",         color:"#b87a3a", draw:drawBench },
  cozy_well_bucket:  { label:"Well Bucket",   color:"#7a4a1e", draw:drawWellBucket },
  cozy_flower_pot:   { label:"Flower Pot",    color:"#b8542a", draw:drawFlowerPot },
  cozy_picket_fence: { label:"Picket Fence",  color:"#e4e6ea", draw:drawPicketFence },
  cozy_barrel:       { label:"Barrel",        color:"#8a5424", draw:drawBarrel },
  cozy_birdhouse:    { label:"Birdhouse",     color:"#b8804a", draw:drawBirdhouse },
  cozy_wind_chime:   { label:"Wind Chime",    color:"#9a9ea6", draw:drawWindChime },
  cozy_street_lamp:  { label:"Street Lamp",   color:"#ffcc62", draw:drawStreetLamp },
};
