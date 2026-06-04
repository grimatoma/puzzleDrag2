// Cozy home interior furniture — hand-drawn procedural icons.

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

// Shared wood gradient builder for vertical wood faces.
function woodV(ctx: CanvasRenderingContext2D, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#c08a4a");
  g.addColorStop(0.5, "#8a5424");
  g.addColorStop(1, "#5a3414");
  return g;
}

function woodH(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "#c08a4a");
  g.addColorStop(0.5, "#8a5424");
  g.addColorStop(1, "#5a3414");
  return g;
}

function drawBed(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 23, 4);
  // Wooden headboard (left, tall)
  ctx.fillStyle = woodH(ctx, -22, -14);
  rr(ctx, -22, -16, 8, 36, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Headboard rounded crown
  ctx.fillStyle = "#9a6630";
  ctx.beginPath();
  ctx.ellipse(-18, -16, 4, 3, 0, Math.PI, 0, false);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Headboard grain
  ctx.strokeStyle = "rgba(58,30,8,0.45)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-19, -12); ctx.lineTo(-19, 16);
  ctx.moveTo(-16.5, -12); ctx.lineTo(-16.5, 16);
  ctx.stroke();
  // Wooden footboard (right, short)
  ctx.fillStyle = woodH(ctx, 14, 22);
  rr(ctx, 14, 2, 8, 18, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Mattress base
  ctx.fillStyle = "#e8e2d4";
  rr(ctx, -16, 4, 32, 12, 3);
  ctx.fill();
  ctx.strokeStyle = "#9a9080";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Folded blanket draped over the foot
  const blanket = ctx.createLinearGradient(0, 6, 0, 18);
  blanket.addColorStop(0, "#7ac0a0");
  blanket.addColorStop(1, "#3a8866");
  ctx.fillStyle = blanket;
  rr(ctx, 0, 6, 16, 12, 3);
  ctx.fill();
  ctx.strokeStyle = "#1f5a40";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Blanket fold seam
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 9);
  ctx.lineTo(16, 9);
  ctx.stroke();
  // Blanket stitch pattern
  ctx.strokeStyle = "rgba(31,90,64,0.6)";
  ctx.lineWidth = 0.8;
  [4, 8, 12].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 11); ctx.lineTo(x, 17);
    ctx.stroke();
  });
  // Pillow (near headboard)
  const pillow = ctx.createLinearGradient(0, 2, 0, 12);
  pillow.addColorStop(0, "#ffffff");
  pillow.addColorStop(1, "#dcd2e8");
  ctx.fillStyle = pillow;
  ctx.beginPath();
  ctx.moveTo(-13, 4);
  ctx.bezierCurveTo(-15, 2, -15, 12, -13, 12);
  ctx.bezierCurveTo(-4, 14, -4, 2, -13, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a89ab8";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Pillow crease
  ctx.strokeStyle = "rgba(168,154,184,0.7)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.quadraticCurveTo(-9, 7, -5, 8);
  ctx.stroke();
  // Bed legs
  ctx.fillStyle = "#5a3414";
  rr(ctx, -16, 16, 4, 5, 1);
  ctx.fill();
  rr(ctx, 12, 16, 4, 5, 1);
  ctx.fill();
}

function drawChair(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 15, 4);
  // Back legs (slightly behind)
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9, 2); ctx.lineTo(-10, 20);
  ctx.moveTo(7, 2); ctx.lineTo(8, 20);
  ctx.stroke();
  // Backrest uprights
  ctx.fillStyle = woodV(ctx, -18, 4);
  rr(ctx, -9, -18, 3.4, 22, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = woodV(ctx, -18, 4);
  rr(ctx, 5.6, -18, 3.4, 22, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Back slats (horizontal)
  const slat = (y: number) => {
    ctx.fillStyle = woodH(ctx, -8, 8);
    rr(ctx, -8, y, 16, 3.2, 1.2);
    ctx.fill();
    ctx.strokeStyle = "#3a1e08";
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  slat(-16);
  slat(-10);
  // Front legs
  ctx.fillStyle = woodH(ctx, -2, 2);
  rr(ctx, -8, 4, 3.4, 17, 1.4);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = woodH(ctx, -2, 2);
  rr(ctx, 4.6, 4, 3.4, 17, 1.4);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Seat (slight perspective trapezoid)
  ctx.fillStyle = woodV(ctx, 0, 8);
  ctx.beginPath();
  ctx.moveTo(-11, 4);
  ctx.lineTo(11, 4);
  ctx.lineTo(9, 9);
  ctx.lineTo(-9, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Seat highlight
  ctx.strokeStyle = "rgba(255,224,160,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, 5.4);
  ctx.lineTo(9, 5.4);
  ctx.stroke();
}

function drawTable(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  // Legs
  ctx.fillStyle = woodH(ctx, -3, 3);
  rr(ctx, -14, 2, 4, 19, 1.4);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = woodH(ctx, -3, 3);
  rr(ctx, 10, 2, 4, 19, 1.4);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Apron under tabletop
  ctx.fillStyle = "#6a3e18";
  rr(ctx, -15, 2, 30, 4, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Round tabletop (ellipse, top view foreshortened)
  const top = ctx.createLinearGradient(0, -4, 0, 4);
  top.addColorStop(0, "#c89858");
  top.addColorStop(0.5, "#a8703a");
  top.addColorStop(1, "#7a4a1e");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Tabletop grain rings
  ctx.strokeStyle = "rgba(58,30,8,0.4)";
  ctx.lineWidth = 0.7;
  [10, 14].forEach((r) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.29, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Tabletop highlight
  ctx.fillStyle = "rgba(255,224,170,0.4)";
  ctx.beginPath();
  ctx.ellipse(-6, -1.5, 6, 1.6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Candle on top
  ctx.fillStyle = "#fff6e0";
  rr(ctx, -2, -12, 4, 11, 1);
  ctx.fill();
  ctx.strokeStyle = "#d8b878";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Candle drip highlight
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-1, -11); ctx.lineTo(-1, -2);
  ctx.stroke();
  // Warm flame glow
  const glow = ctx.createRadialGradient(0, -14, 1, 0, -14, 9);
  glow.addColorStop(0, "rgba(255,200,90,0.6)");
  glow.addColorStop(1, "rgba(255,200,90,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -14, 9, 0, Math.PI * 2);
  ctx.fill();
  // Flame
  const flame = ctx.createLinearGradient(0, -18, 0, -12);
  flame.addColorStop(0, "#fffbe0");
  flame.addColorStop(0.5, "#ffd24a");
  flame.addColorStop(1, "#e8701a");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.bezierCurveTo(2.4, -15, 2, -12, 0, -12);
  ctx.bezierCurveTo(-2, -12, -2.4, -15, 0, -18);
  ctx.closePath();
  ctx.fill();
}

function drawBookshelf(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 17, 4);
  // Outer cabinet frame
  ctx.fillStyle = woodV(ctx, -20, 22);
  rr(ctx, -15, -20, 30, 42, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner recessed back
  ctx.fillStyle = "#4a2c12";
  rr(ctx, -12, -17, 24, 36, 1.5);
  ctx.fill();
  // Shelf boards
  ctx.fillStyle = "#7a4a1e";
  [-5, 7].forEach((y) => {
    rr(ctx, -12, y, 24, 3, 1);
    ctx.fill();
    ctx.strokeStyle = "#3a1e08";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  // Helper to draw a book spine
  const book = (x: number, yTop: number, w: number, h: number, color: string, lean = 0) => {
    ctx.save();
    ctx.translate(x, yTop + h);
    ctx.rotate(lean);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, color);
    g.addColorStop(0.5, color);
    g.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = g;
    rr(ctx, -w / 2, -h, w, h, 1);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // top band
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    rr(ctx, -w / 2 + 0.6, -h + 1.2, w - 1.2, 1.4, 0.5);
    ctx.fill();
    ctx.restore();
  };
  // Top row of books
  book(-9, -16, 4, 11, "#c8483a");
  book(-4.5, -16, 3.6, 11, "#3a78b8");
  book(-0.5, -16, 4, 11, "#e0a838");
  book(4, -16, 3.4, 11, "#5aa05a");
  book(8.4, -15, 3.6, 10, "#9a5ad0", 0.18);
  // Middle row of books
  book(-9, -4, 4, 10, "#3a8866");
  book(-4.5, -4, 3.6, 10, "#d06aa0");
  book(-0.5, -4, 4, 10, "#c8483a");
  book(4, -4, 3.4, 10, "#e0a838");
  book(8, -4, 4, 10, "#3a78b8");
  // Bottom row — a leaning stack + a small pot
  book(-9, 8, 4, 10, "#9a5ad0");
  book(-4.5, 8, 3.6, 10, "#5aa05a");
  book(0, 9, 8, 3, "#a8703a"); // stacked flat book
  book(0, 12, 7, 3, "#c8483a");
  // Small green plant on bottom-right
  ctx.fillStyle = "#b8542a";
  rr(ctx, 7, 13, 6, 5, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#5a8028";
  [[8, 11], [10, 10], [12, 11]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 1.8, 3, x < 10 ? -0.5 : 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFireplace(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Stone surround
  const stone = ctx.createLinearGradient(0, -16, 0, 22);
  stone.addColorStop(0, "#b8b2a4");
  stone.addColorStop(1, "#7a746a");
  ctx.fillStyle = stone;
  rr(ctx, -20, -10, 40, 32, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wooden mantel across the top
  ctx.fillStyle = woodH(ctx, -22, 22);
  rr(ctx, -22, -16, 44, 7, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Mantel highlight
  ctx.fillStyle = "rgba(255,224,160,0.4)";
  rr(ctx, -21, -15, 42, 1.6, 0.8);
  ctx.fill();
  // Brick mortar lines on surround
  ctx.strokeStyle = "rgba(58,56,48,0.45)";
  ctx.lineWidth = 0.7;
  [-3, 5, 13].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-20, y); ctx.lineTo(20, y);
    ctx.stroke();
  });
  [[-12, -9, -3], [-6, 5, 13], [10, -9, -3], [4, 5, 13]].forEach(([x, y0, y1]) => {
    ctx.beginPath();
    ctx.moveTo(x, y0); ctx.lineTo(x, y1);
    ctx.stroke();
  });
  // Firebox opening — dark arch
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.lineTo(-12, 0);
  ctx.arc(0, 0, 12, Math.PI, 0, false);
  ctx.lineTo(12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Warm fire glow
  const glow = ctx.createRadialGradient(0, 14, 2, 0, 14, 18);
  glow.addColorStop(0, "rgba(255,170,60,0.85)");
  glow.addColorStop(0.6, "rgba(255,120,40,0.4)");
  glow.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 14, 18, 0, Math.PI * 2);
  ctx.fill();
  // Logs
  ctx.strokeStyle = "#6a4218";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 20); ctx.lineTo(6, 18);
  ctx.moveTo(-6, 20); ctx.lineTo(8, 22);
  ctx.stroke();
  // Log ends
  ctx.fillStyle = "#a87a3a";
  ctx.beginPath();
  ctx.arc(-8, 20, 2, 0, Math.PI * 2);
  ctx.arc(8, 22, 2, 0, Math.PI * 2);
  ctx.fill();
  // Crackling flames
  const flame = (cx: number, cy: number, s: number) => {
    const g = ctx.createLinearGradient(cx, cy - s * 2.4, cx, cy);
    g.addColorStop(0, "#fffbe0");
    g.addColorStop(0.45, "#ffd24a");
    g.addColorStop(1, "#e8501a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 2.4);
    ctx.bezierCurveTo(cx + s, cy - s, cx + s * 0.7, cy, cx, cy);
    ctx.bezierCurveTo(cx - s * 0.7, cy, cx - s, cy - s, cx, cy - s * 2.4);
    ctx.closePath();
    ctx.fill();
  };
  flame(0, 18, 4.5);
  flame(-5, 19, 3);
  flame(5, 19, 3);
  // Spark embers
  ctx.fillStyle = "rgba(255,210,120,0.8)";
  [[-2, 6, 0.9], [3, 8, 0.8], [-4, 10, 0.7]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRug(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 3);
  // Outer oval rug body (top-down)
  const body = ctx.createRadialGradient(-4, -2, 4, 0, 4, 24);
  body.addColorStop(0, "#d86a6a");
  body.addColorStop(0.6, "#b8423a");
  body.addColorStop(1, "#8a281f");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a1810";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Fringe border (little ticks around the edge)
  ctx.strokeStyle = "#e8c878";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const x = Math.cos(a) * 22;
    const y = 6 + Math.sin(a) * 13;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x * 1.12, 6 + (y - 6) * 1.12);
    ctx.stroke();
  }
  // Cream inner ring
  ctx.strokeStyle = "#f0e2c0";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 6, 17, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Patterned diamond medallion in center
  ctx.fillStyle = "#3a6a9a";
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(10, 6);
  ctx.lineTo(0, 14);
  ctx.lineTo(-10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f4060";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Inner diamond
  ctx.fillStyle = "#e8c878";
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, 11);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a7a30";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Center dot
  ctx.fillStyle = "#b8423a";
  ctx.beginPath();
  ctx.arc(0, 6, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Corner accent dots
  ctx.fillStyle = "#f0e2c0";
  [[-13, 6], [13, 6], [0, -1], [0, 13]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawClock(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 11, 3);
  // Wooden case (rounded top, long pendulum box)
  ctx.fillStyle = woodV(ctx, -22, 22);
  ctx.beginPath();
  ctx.moveTo(-11, -10);
  ctx.arc(0, -10, 11, Math.PI, 0, false);
  ctx.lineTo(11, 18);
  ctx.lineTo(-11, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Crown finial
  ctx.fillStyle = "#9a6630";
  ctx.beginPath();
  ctx.arc(0, -21, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Clock face
  ctx.fillStyle = "#f6efdc";
  ctx.beginPath();
  ctx.arc(0, -9, 8.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Hour ticks
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = 7;
    const r2 = 8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, -9 + Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, -9 + Math.sin(a) * r2);
    ctx.stroke();
  }
  // Hands
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -9); ctx.lineTo(0, -14);   // hour hand up
  ctx.moveTo(0, -9); ctx.lineTo(5, -7);    // minute hand
  ctx.stroke();
  // Center pin
  ctx.fillStyle = "#3a1e08";
  ctx.beginPath();
  ctx.arc(0, -9, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Pendulum window (dark) in lower case
  ctx.fillStyle = "#3a2210";
  rr(ctx, -6, 2, 12, 14, 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Pendulum rod + brass bob
  ctx.strokeStyle = "#c8a850";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 2); ctx.lineTo(2, 12);
  ctx.stroke();
  const bob = ctx.createRadialGradient(1, 12, 1, 2, 13, 4);
  bob.addColorStop(0, "#ffe9a0");
  bob.addColorStop(1, "#a8842a");
  ctx.fillStyle = bob;
  ctx.beginPath();
  ctx.arc(2, 13, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5e1a";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function drawMirror(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 14, 4);
  // Standing feet
  ctx.strokeStyle = "#9a7a2a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 18); ctx.lineTo(-10, 22);
  ctx.moveTo(6, 18); ctx.lineTo(10, 22);
  ctx.moveTo(0, 16); ctx.lineTo(0, 19);
  ctx.stroke();
  // Gold ornate oval frame
  const frame = ctx.createLinearGradient(-14, 0, 14, 0);
  frame.addColorStop(0, "#f0d878");
  frame.addColorStop(0.5, "#c8a032");
  frame.addColorStop(1, "#8a6a1a");
  ctx.fillStyle = frame;
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a4410";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner frame bevel
  ctx.strokeStyle = "rgba(255,245,200,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -2, 12.2, 17, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Mirror glass
  const glass = ctx.createLinearGradient(-9, -18, 9, 14);
  glass.addColorStop(0, "#d8eef4");
  glass.addColorStop(0.5, "#a8c8d8");
  glass.addColorStop(1, "#7a9eb0");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a7a88";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Reflection sheen — diagonal bright streak
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.lineTo(-3, -14);
  ctx.lineTo(4, 8);
  ctx.lineTo(0, 10);
  ctx.closePath();
  ctx.fill();
  // Second thinner sheen
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(2, -13);
  ctx.lineTo(5, -14);
  ctx.lineTo(8, 2);
  ctx.lineTo(5, 3);
  ctx.closePath();
  ctx.fill();
  // Ornate crown scroll at top of frame
  ctx.fillStyle = "#e0c860";
  ctx.beginPath();
  ctx.arc(0, -22, 3, Math.PI, 0, false);
  ctx.fill();
  ctx.strokeStyle = "#5a4410";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Frame stud accents
  ctx.fillStyle = "#fff5c8";
  [[-12, -2], [12, -2], [0, -20], [0, 16]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDresser(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 19, 4);
  // Body
  ctx.fillStyle = woodV(ctx, -16, 20);
  rr(ctx, -16, -16, 32, 36, 3);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Top surface (slight lip)
  ctx.fillStyle = "#a8703a";
  rr(ctx, -17, -18, 34, 4, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,224,160,0.4)";
  rr(ctx, -16, -17.4, 32, 1.4, 0.7);
  ctx.fill();
  // Drawers
  const drawer = (y: number, h: number) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#a8703a");
    g.addColorStop(1, "#7a4a1e");
    ctx.fillStyle = g;
    rr(ctx, -13, y, 26, h, 2);
    ctx.fill();
    ctx.strokeStyle = "#3a1e08";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // wood grain
    ctx.strokeStyle = "rgba(58,30,8,0.35)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-11, y + h * 0.4); ctx.lineTo(11, y + h * 0.4);
    ctx.moveTo(-11, y + h * 0.7); ctx.lineTo(11, y + h * 0.7);
    ctx.stroke();
    // knobs (two round)
    [-6, 6].forEach((kx) => {
      const k = ctx.createRadialGradient(kx - 0.8, y + h / 2 - 0.8, 0.5, kx, y + h / 2, 2.4);
      k.addColorStop(0, "#fff0c8");
      k.addColorStop(1, "#7a5418");
      ctx.fillStyle = k;
      ctx.beginPath();
      ctx.arc(kx, y + h / 2, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3a2408";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    });
  };
  drawer(-12, 9);
  drawer(-1, 9);
  drawer(10, 9);
  // Legs
  ctx.fillStyle = "#5a3414";
  ctx.beginPath();
  ctx.moveTo(-15, 20); ctx.lineTo(-12, 20); ctx.lineTo(-13, 24); ctx.lineTo(-16, 24);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, 20); ctx.lineTo(15, 20); ctx.lineTo(16, 24); ctx.lineTo(13, 24);
  ctx.closePath();
  ctx.fill();
}

function drawLamp(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 13, 4);
  // Warm glow halo behind shade
  const glow = ctx.createRadialGradient(0, -8, 3, 0, -8, 20);
  glow.addColorStop(0, "rgba(255,210,110,0.7)");
  glow.addColorStop(1, "rgba(255,210,110,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -8, 20, 0, Math.PI * 2);
  ctx.fill();
  // Base
  ctx.fillStyle = "#5a4218";
  ctx.beginPath();
  ctx.ellipse(0, 20, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const base = ctx.createLinearGradient(0, 14, 0, 20);
  base.addColorStop(0, "#a8843a");
  base.addColorStop(1, "#6a4e18");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-7, 20);
  ctx.bezierCurveTo(-5, 14, 5, 14, 7, 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Brass stem
  const stem = ctx.createLinearGradient(-2, 0, 2, 0);
  stem.addColorStop(0, "#e8c860");
  stem.addColorStop(0.5, "#b8902a");
  stem.addColorStop(1, "#7a5e18");
  ctx.fillStyle = stem;
  rr(ctx, -1.6, 0, 3.2, 16, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a2c08";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Stem knob
  ctx.fillStyle = "#d8b048";
  ctx.beginPath();
  ctx.arc(0, 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5e18";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // Glowing shade (trapezoid)
  const shade = ctx.createLinearGradient(0, -18, 0, -2);
  shade.addColorStop(0, "#fff0c0");
  shade.addColorStop(0.5, "#ffd87a");
  shade.addColorStop(1, "#f0a838");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(-7, -2);
  ctx.lineTo(-11, -2);
  ctx.lineTo(-7, -18);
  ctx.lineTo(7, -18);
  ctx.lineTo(11, -2);
  ctx.lineTo(7, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b87a18";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Shade rim trims
  ctx.strokeStyle = "rgba(184,122,24,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, -18); ctx.lineTo(7, -18);
  ctx.moveTo(-11, -2); ctx.lineTo(11, -2);
  ctx.stroke();
  // Shade highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(-4, -16);
  ctx.lineTo(-1, -16);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-8, -4);
  ctx.closePath();
  ctx.fill();
  // Warm light pooling under the shade
  ctx.fillStyle = "rgba(255,225,150,0.5)";
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

export const ICONS = {
  furn_bed:        { label:"Bed",        color:"#7ac0a0", draw:drawBed },
  furn_chair:      { label:"Chair",      color:"#8a5424", draw:drawChair },
  furn_table:      { label:"Table",      color:"#a8703a", draw:drawTable },
  furn_bookshelf:  { label:"Bookshelf",  color:"#8a5424", draw:drawBookshelf },
  furn_fireplace:  { label:"Fireplace",  color:"#b8b2a4", draw:drawFireplace },
  furn_rug:        { label:"Rug",        color:"#b8423a", draw:drawRug },
  furn_clock:      { label:"Clock",      color:"#8a5424", draw:drawClock },
  furn_mirror:     { label:"Mirror",     color:"#c8a032", draw:drawMirror },
  furn_dresser:    { label:"Dresser",    color:"#8a5424", draw:drawDresser },
  furn_lamp:       { label:"Lamp",       color:"#ffd87a", draw:drawLamp },
};
