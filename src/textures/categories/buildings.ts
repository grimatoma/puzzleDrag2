// Small town & village buildings — flat front-facing storybook icons (procedural Canvas 2D).

function drawShadow(ctx: CanvasRenderingContext2D, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Local rounded-rect helper (per-file path builder, matching codebase convention).
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Soft rising smoke from a chimney mouth.
function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "rgba(220,220,224,0.55)";
  const puffs: Array<[number, number, number]> = [
    [x, y, 2.6],
    [x - 2, y - 5, 3.2],
    [x + 1, y - 10, 3.6],
    [x - 1, y - 15, 4],
  ];
  puffs.forEach(([px, py, r], i) => {
    ctx.globalAlpha = 0.55 - i * 0.1;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// Warm glowing window pane.
function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const glow = ctx.createLinearGradient(0, y, 0, y + h);
  glow.addColorStop(0, "#fff2b8");
  glow.addColorStop(0.5, "#ffd368");
  glow.addColorStop(1, "#e89a30");
  ctx.fillStyle = glow;
  rr(ctx, x, y, w, h, 1.4);
  ctx.fill();
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Mullions
  ctx.strokeStyle = "rgba(90,52,20,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  // Pane glint
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.28, y + h * 0.3, w * 0.12, h * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCottage(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Chimney (behind roof)
  const chim = ctx.createLinearGradient(0, -22, 0, -8);
  chim.addColorStop(0, "#b86848");
  chim.addColorStop(1, "#7a3e24");
  ctx.fillStyle = chim;
  rr(ctx, 8, -22, 6, 14, 1);
  ctx.fill();
  ctx.strokeStyle = "#4a2410";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  drawSmoke(ctx, 11, -24);
  // Plaster walls
  const wall = ctx.createLinearGradient(-16, 0, 16, 0);
  wall.addColorStop(0, "#f4e2c0");
  wall.addColorStop(0.5, "#e6cda0");
  wall.addColorStop(1, "#c8a878");
  ctx.fillStyle = wall;
  rr(ctx, -16, -6, 32, 28, 2);
  ctx.fill();
  ctx.strokeStyle = "#6a4a28";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Thatched roof
  const roof = ctx.createLinearGradient(0, -22, 0, -4);
  roof.addColorStop(0, "#d8a85a");
  roof.addColorStop(0.5, "#b07e34");
  roof.addColorStop(1, "#7a531c");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-20, -4);
  ctx.lineTo(0, -22);
  ctx.lineTo(20, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a3010";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Thatch strands
  ctx.strokeStyle = "rgba(74,48,16,0.5)";
  ctx.lineWidth = 0.8;
  for (let i = -16; i <= 16; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, -4);
    ctx.lineTo(i * 0.55, -16);
    ctx.stroke();
  }
  // Roof highlight
  ctx.strokeStyle = "rgba(255,228,170,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-14, -7);
  ctx.lineTo(-2, -18);
  ctx.stroke();
  // Glowing window
  drawWindow(ctx, -13, 0, 9, 9);
  // Door
  const door = ctx.createLinearGradient(2, 0, 13, 0);
  door.addColorStop(0, "#8a5424");
  door.addColorStop(1, "#5a3414");
  ctx.fillStyle = door;
  ctx.beginPath();
  ctx.moveTo(3, 22);
  ctx.lineTo(3, 6);
  ctx.arc(7.5, 6, 4.5, Math.PI, 0, false);
  ctx.lineTo(12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Door knob
  ctx.fillStyle = "#f0d060";
  ctx.beginPath();
  ctx.arc(10, 14, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawWindmill(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Tapered tower
  const tower = ctx.createLinearGradient(-12, 0, 12, 0);
  tower.addColorStop(0, "#e8dcc0");
  tower.addColorStop(0.5, "#cbb990");
  tower.addColorStop(1, "#9c8458");
  ctx.fillStyle = tower;
  ctx.beginPath();
  ctx.moveTo(-7, -10);
  ctx.lineTo(-12, 22);
  ctx.lineTo(12, 22);
  ctx.lineTo(7, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a4a28";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Brick courses
  ctx.strokeStyle = "rgba(90,74,40,0.4)";
  ctx.lineWidth = 0.7;
  [0, 8, 16].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-9 - y * 0.16, y); ctx.lineTo(9 + y * 0.16, y);
    ctx.stroke();
  });
  // Glowing window
  drawWindow(ctx, -4, 6, 8, 9);
  // Conical cap
  const cap = ctx.createLinearGradient(0, -22, 0, -10);
  cap.addColorStop(0, "#9a4a30");
  cap.addColorStop(1, "#5a2814");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(-9, -10);
  ctx.lineTo(0, -22);
  ctx.lineTo(9, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Sails hub
  const hubX = 0, hubY = -8;
  // Four sails (X cross of lattice blades)
  ctx.save();
  ctx.translate(hubX, hubY);
  ctx.rotate(0.35);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i / 4) * Math.PI * 2);
    // Spar
    ctx.strokeStyle = "#5a3414";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -20);
    ctx.stroke();
    // Blade cloth
    ctx.fillStyle = "rgba(244,236,214,0.92)";
    ctx.beginPath();
    ctx.moveTo(0.5, -3);
    ctx.lineTo(5, -3);
    ctx.lineTo(5, -19);
    ctx.lineTo(0.5, -19);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7a5a30";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Lattice lines
    ctx.strokeStyle = "rgba(122,90,48,0.6)";
    ctx.lineWidth = 0.6;
    [-7, -11, -15].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0.5, y); ctx.lineTo(5, y);
      ctx.stroke();
    });
    ctx.restore();
  }
  ctx.restore();
  // Hub cap
  ctx.fillStyle = "#3a2810";
  ctx.beginPath();
  ctx.arc(hubX, hubY, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBarn(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Red walls
  const wall = ctx.createLinearGradient(-18, 0, 18, 0);
  wall.addColorStop(0, "#d2503a");
  wall.addColorStop(0.5, "#b03224");
  wall.addColorStop(1, "#7a1c12");
  ctx.fillStyle = wall;
  rr(ctx, -18, -2, 36, 24, 2);
  ctx.fill();
  ctx.strokeStyle = "#4a0e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Gambrel roof
  const roof = ctx.createLinearGradient(0, -22, 0, -2);
  roof.addColorStop(0, "#9a3024");
  roof.addColorStop(1, "#5a1408");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-20, -2);
  ctx.lineTo(-14, -12);
  ctx.lineTo(0, -22);
  ctx.lineTo(14, -12);
  ctx.lineTo(20, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0c04";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Roof shingle lines
  ctx.strokeStyle = "rgba(58,12,4,0.45)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-17, -6); ctx.lineTo(17, -6);
  ctx.moveTo(-12, -13); ctx.lineTo(12, -13);
  ctx.stroke();
  // Hayloft window (glowing, up under peak)
  const loft = ctx.createRadialGradient(0, -9, 1, 0, -9, 5);
  loft.addColorStop(0, "#fff2b8");
  loft.addColorStop(1, "#e89a30");
  ctx.fillStyle = loft;
  ctx.beginPath();
  ctx.moveTo(-4, -5);
  ctx.lineTo(0, -11);
  ctx.lineTo(4, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a0e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Big double doors
  const door = ctx.createLinearGradient(-11, 0, 11, 0);
  door.addColorStop(0, "#e6cda0");
  door.addColorStop(0.5, "#cbb280");
  door.addColorStop(1, "#a88a58");
  ctx.fillStyle = door;
  rr(ctx, -11, 4, 22, 18, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Door split + X-trim
  ctx.strokeStyle = "#6a4420";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.lineTo(0, 22);
  // Left X
  ctx.moveTo(-10, 5); ctx.lineTo(-1, 14);
  ctx.moveTo(-1, 5); ctx.lineTo(-10, 14);
  // Right X
  ctx.moveTo(1, 5); ctx.lineTo(10, 14);
  ctx.moveTo(10, 5); ctx.lineTo(1, 14);
  ctx.stroke();
}

function drawTower(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 14, 4);
  // Stone column
  const stone = ctx.createLinearGradient(-9, 0, 9, 0);
  stone.addColorStop(0, "#b6bcc2");
  stone.addColorStop(0.5, "#8e949c");
  stone.addColorStop(1, "#5e646c");
  ctx.fillStyle = stone;
  rr(ctx, -9, -10, 18, 32, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Stone block courses (offset brickwork)
  ctx.strokeStyle = "rgba(58,62,68,0.5)";
  ctx.lineWidth = 0.7;
  for (let row = 0; row < 5; row++) {
    const y = -6 + row * 6;
    ctx.beginPath();
    ctx.moveTo(-9, y); ctx.lineTo(9, y);
    ctx.stroke();
    const off = row % 2 === 0 ? -3 : 3;
    ctx.beginPath();
    ctx.moveTo(off, y); ctx.lineTo(off, y + 6);
    ctx.stroke();
  }
  // Conical roof
  const roof = ctx.createLinearGradient(0, -28, 0, -10);
  roof.addColorStop(0, "#4a6cc0");
  roof.addColorStop(1, "#23386e");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(0, -28);
  ctx.lineTo(12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16223e";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Roof highlight + tiles
  ctx.strokeStyle = "rgba(180,200,255,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, -12);
  ctx.lineTo(-1, -24);
  ctx.stroke();
  // Finial ball
  ctx.fillStyle = "#f0d060";
  ctx.beginPath();
  ctx.arc(0, -29, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a6818";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Small arched glowing window
  const glow = ctx.createLinearGradient(0, -2, 0, 9);
  glow.addColorStop(0, "#fff2b8");
  glow.addColorStop(1, "#e89a30");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-4, 9);
  ctx.lineTo(-4, 0);
  ctx.arc(0, 0, 4, Math.PI, 0, false);
  ctx.lineTo(4, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawChurch(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  // Steeple tower (left)
  const tower = ctx.createLinearGradient(-18, 0, -4, 0);
  tower.addColorStop(0, "#e4dcc4");
  tower.addColorStop(1, "#b6a880");
  ctx.fillStyle = tower;
  rr(ctx, -18, -10, 14, 32, 2);
  ctx.fill();
  ctx.strokeStyle = "#6a5a38";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Nave (right)
  const nave = ctx.createLinearGradient(-4, 0, 18, 0);
  nave.addColorStop(0, "#ece4cc");
  nave.addColorStop(1, "#c4b68c");
  ctx.fillStyle = nave;
  rr(ctx, -4, 2, 22, 20, 2);
  ctx.fill();
  ctx.strokeStyle = "#6a5a38";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Nave roof
  ctx.fillStyle = "#7a8088";
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(7, -6);
  ctx.lineTo(20, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Spire
  const spire = ctx.createLinearGradient(0, -28, 0, -10);
  spire.addColorStop(0, "#8e949c");
  spire.addColorStop(1, "#4e545c");
  ctx.fillStyle = spire;
  ctx.beginPath();
  ctx.moveTo(-18, -10);
  ctx.lineTo(-11, -28);
  ctx.lineTo(-4, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a2e34";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Cross atop spire
  ctx.strokeStyle = "#f0d060";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-11, -28); ctx.lineTo(-11, -34);
  ctx.moveTo(-14, -31); ctx.lineTo(-8, -31);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Bell opening in tower (glowing)
  const bellGlow = ctx.createLinearGradient(0, -6, 0, 2);
  bellGlow.addColorStop(0, "#fff2b8");
  bellGlow.addColorStop(1, "#cc7a20");
  ctx.fillStyle = bellGlow;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.lineTo(-15, -4);
  ctx.arc(-11, -4, 4, Math.PI, 0, false);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Bell
  ctx.fillStyle = "#caa238";
  ctx.beginPath();
  ctx.moveTo(-13, -1);
  ctx.bezierCurveTo(-13, -5, -9, -5, -9, -1);
  ctx.closePath();
  ctx.fill();
  // Arched glowing door
  const door = ctx.createLinearGradient(0, 8, 0, 22);
  door.addColorStop(0, "#fff0b0");
  door.addColorStop(1, "#c47820");
  ctx.fillStyle = door;
  ctx.beginPath();
  ctx.moveTo(3, 22);
  ctx.lineTo(3, 12);
  ctx.arc(7, 12, 4, Math.PI, 0, false);
  ctx.lineTo(11, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(7, 8); ctx.lineTo(7, 22);
  ctx.stroke();
}

function drawMarketStall(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Back posts
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, -8); ctx.lineTo(-16, 22);
  ctx.moveTo(16, -8); ctx.lineTo(16, 22);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Counter
  const counter = ctx.createLinearGradient(0, 8, 0, 22);
  counter.addColorStop(0, "#b87a3a");
  counter.addColorStop(1, "#6a4218");
  ctx.fillStyle = counter;
  rr(ctx, -18, 8, 36, 14, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Counter top board
  ctx.fillStyle = "#8a5424";
  rr(ctx, -19, 6, 38, 4, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Goods crates on counter
  ctx.fillStyle = "#9a6a30";
  rr(ctx, -14, 1, 9, 6, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Apples in a crate
  ["#d23a2a", "#e85a3a", "#c82820"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(-12.5 + i * 3, 1, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  // Bread loaves
  ctx.fillStyle = "#d8a860";
  [[6, 4], [11, 4]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 3.4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5a20";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  // Striped awning
  const stripes = ["#e8e2d4", "#d23a2a"];
  const segW = 6.4;
  for (let i = 0; i < 6; i++) {
    const x0 = -19 + i * segW;
    ctx.fillStyle = stripes[i % 2];
    ctx.beginPath();
    ctx.moveTo(x0, -10);
    ctx.lineTo(x0 + segW, -10);
    ctx.lineTo(x0 + segW, -3);
    // scalloped lower edge
    ctx.quadraticCurveTo(x0 + segW / 2, 1, x0, -3);
    ctx.closePath();
    ctx.fill();
  }
  // Awning top board
  ctx.fillStyle = "#8a5424";
  rr(ctx, -20, -13, 40, 4, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Awning outline
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-19, -10); ctx.lineTo(19, -10);
  ctx.stroke();
}

function drawBridge(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 3);
  // Water below
  const water = ctx.createLinearGradient(0, 14, 0, 24);
  water.addColorStop(0, "#79c4d8");
  water.addColorStop(1, "#3a82a0");
  ctx.fillStyle = water;
  rr(ctx, -24, 14, 48, 10, 2);
  ctx.fill();
  // Water ripples
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  [[-16, 18], [4, 20], [12, 16]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.quadraticCurveTo(x, y - 2, x + 4, y);
    ctx.stroke();
  });
  // Stone bridge body
  const stone = ctx.createLinearGradient(0, -10, 0, 14);
  stone.addColorStop(0, "#c4bdae");
  stone.addColorStop(0.5, "#9d9486");
  stone.addColorStop(1, "#6e665a");
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-22, 14);
  ctx.lineTo(-22, 0);
  ctx.bezierCurveTo(-14, -12, 14, -12, 22, 0);
  ctx.lineTo(22, 14);
  // Arch underside cut-out
  ctx.lineTo(11, 14);
  ctx.bezierCurveTo(9, 2, -9, 2, -11, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#46403a";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Voussoir stones around the arch
  ctx.strokeStyle = "rgba(70,64,58,0.55)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI - (i / 6) * Math.PI;
    const ix = Math.cos(a) * 11;
    const iy = 6 - Math.sin(a) * 8;
    const ox = Math.cos(a) * 17;
    const oy = 2 - Math.sin(a) * 13;
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ox, oy);
    ctx.stroke();
  }
  // Deck top + railing
  ctx.fillStyle = "#b8b0a0";
  rr(ctx, -22, -12, 44, 4, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#46403a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Railing posts
  ctx.fillStyle = "#8e8678";
  [-18, -6, 6, 18].forEach((x) => {
    rr(ctx, x - 1.5, -16, 3, 5, 0.8);
    ctx.fill();
    ctx.strokeStyle = "#46403a";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  // Deck highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  rr(ctx, -20, -11.5, 40, 1.2, 0.6);
  ctx.fill();
}

function drawWatermill(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Mill building
  const wall = ctx.createLinearGradient(-14, 0, 14, 0);
  wall.addColorStop(0, "#e4dcc4");
  wall.addColorStop(0.5, "#cbbf98");
  wall.addColorStop(1, "#a8966a");
  ctx.fillStyle = wall;
  rr(ctx, -16, -6, 24, 28, 2);
  ctx.fill();
  ctx.strokeStyle = "#6a5a38";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Timber framing
  ctx.strokeStyle = "rgba(90,60,30,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, 8); ctx.lineTo(8, 8);
  ctx.moveTo(-4, -6); ctx.lineTo(-4, 22);
  ctx.moveTo(-16, -6); ctx.lineTo(-4, 8);
  ctx.stroke();
  // Peaked roof
  const roof = ctx.createLinearGradient(0, -20, 0, -4);
  roof.addColorStop(0, "#9a4a30");
  roof.addColorStop(1, "#5a2414");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-19, -4);
  ctx.lineTo(-4, -20);
  ctx.lineTo(11, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Roof shingles
  ctx.strokeStyle = "rgba(58,24,8,0.5)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-15, -7); ctx.lineTo(7, -7);
  ctx.moveTo(-10, -13); ctx.lineTo(2, -13);
  ctx.stroke();
  // Glowing window
  drawWindow(ctx, -12, 2, 8, 8);
  // Mill race / water chute (right side)
  ctx.fillStyle = "#5a82a0";
  ctx.beginPath();
  ctx.moveTo(8, 6);
  ctx.lineTo(20, 6);
  ctx.lineTo(20, 9);
  ctx.lineTo(8, 9);
  ctx.closePath();
  ctx.fill();
  // Water wheel on the side
  const wcx = 16, wcy = 12, wr = 9;
  ctx.fillStyle = "#7a4a1e";
  ctx.beginPath();
  ctx.arc(wcx, wcy, wr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner hub
  ctx.fillStyle = "#a8703a";
  ctx.beginPath();
  ctx.arc(wcx, wcy, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Spokes + paddles
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const ex = wcx + Math.cos(a) * wr;
    const ey = wcy + Math.sin(a) * wr;
    ctx.beginPath();
    ctx.moveTo(wcx, wcy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // paddle — a short quad at the rim, just clockwise of the spoke
    ctx.fillStyle = "#8a5424";
    const a2 = a + 0.2;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(wcx + Math.cos(a2) * wr, wcy + Math.sin(a2) * wr);
    ctx.lineTo(wcx + Math.cos(a2) * wr * 0.78, wcy + Math.sin(a2) * wr * 0.78);
    ctx.lineTo(wcx + Math.cos(a) * wr * 0.78, wcy + Math.sin(a) * wr * 0.78);
    ctx.closePath();
    ctx.fill();
  }
  // Falling water droplets
  ctx.fillStyle = "rgba(150,210,230,0.8)";
  [[22, 16], [24, 19], [21, 21]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCastle(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  const stone = (x0: number, x1: number) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#b8bec6");
    g.addColorStop(0.5, "#8e949c");
    g.addColorStop(1, "#5e646c");
    return g;
  };
  // Crenellation helper for a wall top (caller sets fillStyle to the matching stone gradient).
  const crenellate = (x: number, w: number, y: number, fill: CanvasGradient) => {
    const teeth = 4;
    const tw = w / (teeth * 2 - 1);
    for (let i = 0; i < teeth; i++) {
      const tx = x + i * tw * 2;
      ctx.fillStyle = fill;
      rr(ctx, tx, y - 4, tw, 5, 0.6);
      ctx.fill();
      ctx.strokeStyle = "#3a3e44";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  };
  // Central keep
  ctx.fillStyle = stone(-9, 9);
  rr(ctx, -9, -8, 18, 30, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Left tower
  ctx.fillStyle = stone(-20, -10);
  rr(ctx, -20, 0, 11, 22, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Right tower
  ctx.fillStyle = stone(9, 20);
  rr(ctx, 9, 0, 11, 22, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Battlements
  crenellate(-20, 11, 0, stone(-20, -10));
  crenellate(9, 11, 0, stone(9, 20));
  crenellate(-9, 18, -8, stone(-9, 9));
  // Stone courses
  ctx.strokeStyle = "rgba(58,62,68,0.45)";
  ctx.lineWidth = 0.6;
  [4, 11, 18].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-20, y); ctx.lineTo(20, y);
    ctx.stroke();
  });
  // Flag on a pole atop the keep
  ctx.strokeStyle = "#5a5e66";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(0, -24);
  ctx.stroke();
  ctx.fillStyle = "#d23a2a";
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(10, -21);
  ctx.lineTo(0, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a1408";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,180,160,0.55)";
  ctx.beginPath();
  ctx.moveTo(0, -23.4);
  ctx.lineTo(6, -21.6);
  ctx.lineTo(0, -20);
  ctx.closePath();
  ctx.fill();
  // Arched gate (dark portcullis)
  ctx.fillStyle = "#2a2e34";
  ctx.beginPath();
  ctx.moveTo(-5, 22);
  ctx.lineTo(-5, 8);
  ctx.arc(0, 8, 5, Math.PI, 0, false);
  ctx.lineTo(5, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Portcullis grid
  ctx.strokeStyle = "rgba(120,124,132,0.7)";
  ctx.lineWidth = 0.8;
  [-2.5, 0, 2.5].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 5); ctx.lineTo(x, 22);
    ctx.stroke();
  });
  [12, 17].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-5, y); ctx.lineTo(5, y);
    ctx.stroke();
  });
  // Glowing tower windows
  ctx.fillStyle = "#ffd368";
  [[-14.5, 8], [13.5, 8]].forEach(([x, y]) => {
    rr(ctx, x - 1.6, y, 3.2, 4.5, 1);
    ctx.fill();
    ctx.strokeStyle = "#5a3414";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
}

function drawTent(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Canopy — striped triangular tent
  const apexX = 0, apexY = -22;
  const leftX = -20, rightX = 20, baseY = 18;
  const stripeColors = ["#e8e2d4", "#cc4a3a"];
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const bx0 = leftX + (rightX - leftX) * t0;
    const bx1 = leftX + (rightX - leftX) * t1;
    ctx.fillStyle = stripeColors[i % 2];
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(bx0, baseY);
    ctx.lineTo(bx1, baseY);
    ctx.closePath();
    ctx.fill();
  }
  // Canopy outline
  ctx.strokeStyle = "#7a2418";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(leftX, baseY);
  ctx.lineTo(rightX, baseY);
  ctx.closePath();
  ctx.stroke();
  // Scalloped lower trim
  ctx.fillStyle = "#cc4a3a";
  ctx.beginPath();
  ctx.moveTo(leftX, baseY);
  for (let x = leftX; x < rightX; x += 5) {
    ctx.quadraticCurveTo(x + 2.5, baseY + 4, x + 5, baseY);
  }
  ctx.lineTo(rightX, baseY);
  ctx.lineTo(rightX, baseY - 2);
  ctx.lineTo(leftX, baseY - 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a2418";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Open dark interior with rolled-back flap
  ctx.fillStyle = "#3a2a22";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 18);
  ctx.lineTo(-8, 18);
  ctx.closePath();
  ctx.fill();
  // Warm glow inside the opening
  const glow = ctx.createRadialGradient(0, 8, 1, 0, 8, 10);
  glow.addColorStop(0, "rgba(255,205,100,0.6)");
  glow.addColorStop(1, "rgba(255,205,100,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 18);
  ctx.lineTo(-6, 18);
  ctx.closePath();
  ctx.fill();
  // Tied-back left flap
  ctx.fillStyle = "#d8d0c0";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-8, 18);
  ctx.lineTo(-13, 18);
  ctx.bezierCurveTo(-7, 6, -5, -4, -2, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a3a2a";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Flap tie
  ctx.strokeStyle = "#7a2418";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-8, 6, 2, 0, Math.PI * 2);
  ctx.stroke();
  // Apex pole + pennant
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(0, -30);
  ctx.stroke();
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(8, -28);
  ctx.lineTo(0, -26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87818";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Apex ball
  ctx.fillStyle = "#8a5424";
  ctx.beginPath();
  ctx.arc(0, -22, 2, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Shared helpers for the per-building icons below ────────────────────────

// Warm fire: a radial glow plus a few flame tongues rooted at (x, base).
function drawFire(ctx: CanvasRenderingContext2D, x: number, base: number, scale = 1) {
  const glow = ctx.createRadialGradient(x, base - 3 * scale, 1, x, base - 3 * scale, 9 * scale);
  glow.addColorStop(0, "rgba(255,210,120,0.9)");
  glow.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, base - 3 * scale, 9 * scale, 0, Math.PI * 2);
  ctx.fill();
  const flame = (dx: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x + dx, base);
    ctx.quadraticCurveTo(x + dx - 2 * scale, base - h * 0.5, x + dx, base - h);
    ctx.quadraticCurveTo(x + dx + 2 * scale, base - h * 0.5, x + dx, base);
    ctx.closePath();
    ctx.fill();
  };
  flame(-2.4 * scale, 9 * scale, "#e8631f");
  flame(2 * scale, 7 * scale, "#f59a25");
  flame(0, 11 * scale, "#ffd152");
}

// Oak barrel/cask centred horizontally at cx, spanning [top, top+h].
function drawBarrel(ctx: CanvasRenderingContext2D, cx: number, top: number, w: number, h: number) {
  const x = cx - w / 2;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "#a6743a");
  g.addColorStop(0.5, "#8a5a28");
  g.addColorStop(1, "#5e3c18");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, top);
  ctx.lineTo(x + w * 0.88, top);
  ctx.quadraticCurveTo(x + w * 1.06, top + h / 2, x + w * 0.88, top + h);
  ctx.lineTo(x + w * 0.12, top + h);
  ctx.quadraticCurveTo(x - w * 0.06, top + h / 2, x + w * 0.12, top);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "#caa05a";
  ctx.lineWidth = 1.3;
  [top + h * 0.24, top + h * 0.76].forEach((yy) => {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.04, yy);
    ctx.lineTo(x + w * 0.96, yy);
    ctx.stroke();
  });
  ctx.strokeStyle = "rgba(58,36,16,0.4)";
  ctx.lineWidth = 0.7;
  [0.4, 0.6].forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(x + w * f, top + 1);
    ctx.lineTo(x + w * f, top + h - 1);
    ctx.stroke();
  });
}

// End-on cut log: concentric growth rings.
function drawLogEnd(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#a8854e";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3c1c";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,60,28,0.6)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
  ctx.stroke();
}

// ─── Per-building icons ─────────────────────────────────────────────────────

// Hearth — the village's communal stone fireplace under a tapering chimney hood.
function drawHearth(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  const stone = ctx.createLinearGradient(-20, 0, 20, 0);
  stone.addColorStop(0, "#b8a890");
  stone.addColorStop(0.5, "#94836c");
  stone.addColorStop(1, "#5e5040");
  ctx.fillStyle = stone;
  rr(ctx, -20, 2, 40, 20, 2);
  ctx.fill();
  ctx.strokeStyle = "#4a3e30";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(74,62,48,0.5)";
  ctx.lineWidth = 0.7;
  [8, 15].forEach((y) => { ctx.beginPath(); ctx.moveTo(-20, y); ctx.lineTo(20, y); ctx.stroke(); });
  [-10, 4].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, 8); ctx.stroke(); });
  // Chimney hood + stack
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-14, 2); ctx.lineTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(14, 2); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a3e30";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = stone;
  rr(ctx, -6, -24, 12, 11, 1.5);
  ctx.fill();
  ctx.stroke();
  drawSmoke(ctx, 0, -26);
  // Fire opening + flames + logs
  ctx.fillStyle = "#2a1a10";
  ctx.beginPath();
  ctx.moveTo(-9, 22); ctx.lineTo(-9, 6); ctx.arc(0, 6, 9, Math.PI, 0, false); ctx.lineTo(9, 22); ctx.closePath();
  ctx.fill();
  drawFire(ctx, 0, 21, 1.1);
  ctx.strokeStyle = "#6a4424";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 21); ctx.lineTo(6, 18); ctx.moveTo(-6, 18); ctx.lineTo(6, 21);
  ctx.stroke();
  ctx.lineCap = "butt";
}

// Bakery — plaster shopfront, striped awning, loaves on the sill, a bread sign.
function drawBakery(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  ctx.fillStyle = "#8a5a3a";
  rr(ctx, 9, -20, 6, 10, 1);
  ctx.fill();
  ctx.strokeStyle = "#4a2e18";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  drawSmoke(ctx, 12, -22);
  const wall = ctx.createLinearGradient(-18, 0, 18, 0);
  wall.addColorStop(0, "#f0dcc0");
  wall.addColorStop(0.5, "#dcc096");
  wall.addColorStop(1, "#b89868");
  ctx.fillStyle = wall;
  rr(ctx, -18, -4, 36, 26, 2);
  ctx.fill();
  ctx.strokeStyle = "#6a4a2a";
  ctx.lineWidth = 2;
  ctx.stroke();
  const roof = ctx.createLinearGradient(0, -18, 0, -2);
  roof.addColorStop(0, "#9a5a34");
  roof.addColorStop(1, "#5e3216");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-21, -4); ctx.lineTo(0, -18); ctx.lineTo(21, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e0c";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Round bread sign on the gable
  ctx.fillStyle = "#caa050";
  ctx.beginPath();
  ctx.arc(0, -9, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5420";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -9, 4, 0.5, 2.2);
  ctx.stroke();
  // Striped awning
  const stripes = ["#e8e2d4", "#cc5a3a"];
  const segW = 6;
  for (let i = 0; i < 6; i++) {
    const x0 = -18 + i * segW;
    ctx.fillStyle = stripes[i % 2];
    ctx.beginPath();
    ctx.moveTo(x0, 6); ctx.lineTo(x0 + segW, 6); ctx.lineTo(x0 + segW, 10);
    ctx.quadraticCurveTo(x0 + segW / 2, 14, x0, 10); ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#8a5424";
  rr(ctx, -19, 3, 38, 4, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  drawWindow(ctx, -14, 13, 10, 8);
  ctx.fillStyle = "#d8a860";
  ([[6, 16], [11, 16], [8.5, 13]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5a20";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });
}

// Inn — a tall half-timbered roadhouse with two floors of warm windows.
function drawInn(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  const wall = ctx.createLinearGradient(-16, 0, 16, 0);
  wall.addColorStop(0, "#e8d8b8");
  wall.addColorStop(0.5, "#d2bd92");
  wall.addColorStop(1, "#a88c5e");
  ctx.fillStyle = wall;
  rr(ctx, -16, -12, 32, 34, 2);
  ctx.fill();
  ctx.strokeStyle = "#5a4428";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#6a4a28";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-16, 6); ctx.lineTo(16, 6);
  ctx.moveTo(-16, -12); ctx.lineTo(-4, 0);
  ctx.moveTo(16, -12); ctx.lineTo(4, 0);
  ctx.moveTo(0, 6); ctx.lineTo(0, 22);
  ctx.stroke();
  const roof = ctx.createLinearGradient(0, -24, 0, -10);
  roof.addColorStop(0, "#7a5a3a");
  roof.addColorStop(1, "#4a3420");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-20, -10); ctx.lineTo(-12, -24); ctx.lineTo(12, -24); ctx.lineTo(20, -10); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e2012";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawWindow(ctx, -12, -8, 8, 8);
  drawWindow(ctx, 4, -8, 8, 8);
  const door = ctx.createLinearGradient(-7, 0, 2, 0);
  door.addColorStop(0, "#7a4a24");
  door.addColorStop(1, "#4a2c12");
  ctx.fillStyle = door;
  rr(ctx, -7, 10, 9, 12, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#2e1a0a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#f0d060";
  ctx.beginPath();
  ctx.arc(0, 16, 1, 0, Math.PI * 2);
  ctx.fill();
  drawWindow(ctx, 5, 11, 8, 8);
  // Hanging tankard sign
  ctx.strokeStyle = "#3a2810";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, 2); ctx.lineTo(-22, 2); ctx.lineTo(-22, 5);
  ctx.stroke();
  ctx.fillStyle = "#7a5430";
  rr(ctx, -25, 5, 6, 6, 1);
  ctx.fill();
  ctx.strokeStyle = "#2e1a0a";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#d8c050";
  ctx.beginPath();
  ctx.arc(-22, 8, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

// Granary — a timber grain store raised on staddle stones, with a loading hatch.
function drawGranary(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  ctx.fillStyle = "#9a9088";
  [-12, 0, 12].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x - 2, 22); ctx.lineTo(x - 1.5, 14); ctx.lineTo(x + 1.5, 14); ctx.lineTo(x + 2, 22); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, 13, 4, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5e564e";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  const wall = ctx.createLinearGradient(-16, 0, 16, 0);
  wall.addColorStop(0, "#d8b888");
  wall.addColorStop(0.5, "#c5a06a");
  wall.addColorStop(1, "#9a7848");
  ctx.fillStyle = wall;
  rr(ctx, -16, -6, 32, 19, 2);
  ctx.fill();
  ctx.strokeStyle = "#5e421f";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(94,66,31,0.5)";
  ctx.lineWidth = 0.8;
  [-9, -2, 5].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x, 13); ctx.stroke(); });
  const roof = ctx.createLinearGradient(0, -22, 0, -6);
  roof.addColorStop(0, "#b0763a");
  roof.addColorStop(1, "#6e441e");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-19, -6); ctx.lineTo(-9, -22); ctx.lineTo(9, -22); ctx.lineTo(19, -6); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3e2410";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(62,36,16,0.5)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-15, -10); ctx.lineTo(15, -10); ctx.moveTo(-12, -15); ctx.lineTo(12, -15);
  ctx.stroke();
  ctx.fillStyle = "#5a3c1c";
  ctx.beginPath();
  ctx.arc(0, 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2e1c0a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "#8a6a3a";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5, 2); ctx.lineTo(5, 2); ctx.moveTo(0, -3); ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.fillStyle = "#e8dcc0";
  ([[-13, 20], [-9, 21]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.quadraticCurveTo(x - 3.6, y - 6, x, y - 6.5);
    ctx.quadraticCurveTo(x + 3.6, y - 6, x + 3, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#a8956a";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
}

// Mining Camp — a timber-framed adit in a rocky mound with an ore cart.
function drawMiningCamp(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  const rock = ctx.createLinearGradient(0, -18, 0, 22);
  rock.addColorStop(0, "#8a8278");
  rock.addColorStop(1, "#56504a");
  ctx.fillStyle = rock;
  ctx.beginPath();
  ctx.moveTo(-22, 22);
  ctx.quadraticCurveTo(-22, -10, -4, -16);
  ctx.quadraticCurveTo(14, -20, 22, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a352e";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(58,53,46,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-8, -12); ctx.lineTo(-2, 2); ctx.moveTo(10, -10); ctx.lineTo(4, 4);
  ctx.stroke();
  ctx.fillStyle = "#1c1814";
  ctx.beginPath();
  ctx.moveTo(-8, 22); ctx.lineTo(-8, 2); ctx.arc(0, 2, 8, Math.PI, 0, false); ctx.lineTo(8, 22); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#6a4a28";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-9, 22); ctx.lineTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(9, 22);
  ctx.stroke();
  ctx.strokeStyle = "#4a4038";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-2, 22); ctx.lineTo(-1, 12); ctx.moveTo(4, 22); ctx.lineTo(2, 12);
  ctx.stroke();
  ctx.fillStyle = "#5a4030";
  rr(ctx, 6, 14, 12, 7, 1);
  ctx.fill();
  ctx.strokeStyle = "#2a1c12";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#7a8a92";
  ([[9, 14], [12, 13], [15, 14]] as Array<[number, number]>).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "#2a1c12";
  [9, 15].forEach((x) => { ctx.beginPath(); ctx.arc(x, 22, 1.8, 0, Math.PI * 2); ctx.fill(); });
  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-14, 4); ctx.lineTo(-7, -8); ctx.moveTo(-15, -8); ctx.lineTo(-7, 4);
  ctx.stroke();
  ctx.strokeStyle = "#aeb4ba";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -8); ctx.quadraticCurveTo(-13, -10, -10, -8);
  ctx.stroke();
  ctx.lineCap = "butt";
}

// Larder — a cool stone store, its arch revealing shelves of preserve jars.
function drawLarder(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  const stone = ctx.createLinearGradient(-16, 0, 14, 0);
  stone.addColorStop(0, "#cfc7b4");
  stone.addColorStop(0.5, "#a89e88");
  stone.addColorStop(1, "#736a58");
  ctx.fillStyle = stone;
  rr(ctx, -16, -4, 30, 26, 2);
  ctx.fill();
  ctx.strokeStyle = "#4e463a";
  ctx.lineWidth = 2;
  ctx.stroke();
  const roof = ctx.createLinearGradient(0, -16, 0, -4);
  roof.addColorStop(0, "#5e7a4a");
  roof.addColorStop(1, "#3a4e2c");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-19, -4); ctx.lineTo(-1, -16); ctx.lineTo(17, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#26341c";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(78,70,58,0.5)";
  ctx.lineWidth = 0.7;
  [4, 12].forEach((y) => { ctx.beginPath(); ctx.moveTo(-16, y); ctx.lineTo(14, y); ctx.stroke(); });
  ctx.fillStyle = "#2a2620";
  ctx.beginPath();
  ctx.moveTo(-9, 22); ctx.lineTo(-9, 4); ctx.arc(-2, 4, 7, Math.PI, 0, false); ctx.lineTo(5, 22); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4e463a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "#6a5a40";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, 10); ctx.lineTo(5, 10); ctx.moveTo(-9, 16); ctx.lineTo(5, 16);
  ctx.stroke();
  ctx.fillStyle = "#c46a3a"; rr(ctx, -7, 6, 3.2, 3.6, 0.8); ctx.fill();
  ctx.fillStyle = "#7a4acc"; rr(ctx, -2.6, 6, 3.2, 3.6, 0.8); ctx.fill();
  ctx.fillStyle = "#caa83a"; rr(ctx, 1.6, 6, 3.2, 3.6, 0.8); ctx.fill();
  ctx.fillStyle = "#d24a3a"; rr(ctx, -6, 12, 3.2, 3.6, 0.8); ctx.fill();
  ctx.fillStyle = "#4a9a5a"; rr(ctx, -1, 12, 3.2, 3.6, 0.8); ctx.fill();
  drawBarrel(ctx, 11, 12, 11, 10);
}

// Forge — a smith's workshop with a tall chimney, glowing mouth and an anvil.
function drawForge(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  const stone = ctx.createLinearGradient(-18, 0, 14, 0);
  stone.addColorStop(0, "#9aa0a6");
  stone.addColorStop(0.5, "#767c84");
  stone.addColorStop(1, "#4e545c");
  ctx.fillStyle = stone;
  rr(ctx, -16, -26, 9, 30, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#33373d";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  drawSmoke(ctx, -11.5, -28);
  ctx.fillStyle = stone;
  rr(ctx, -10, -8, 24, 30, 2);
  ctx.fill();
  ctx.strokeStyle = "#33373d";
  ctx.lineWidth = 2;
  ctx.stroke();
  const roof = ctx.createLinearGradient(0, -16, 0, -6);
  roof.addColorStop(0, "#5a4030");
  roof.addColorStop(1, "#34241a");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-12, -8); ctx.lineTo(2, -17); ctx.lineTo(16, -8); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1e140e";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(51,55,61,0.5)";
  ctx.lineWidth = 0.7;
  [0, 8, 16].forEach((y) => { ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(14, y); ctx.stroke(); });
  const glow = ctx.createRadialGradient(2, 8, 1, 2, 8, 7);
  glow.addColorStop(0, "#fff0b0");
  glow.addColorStop(0.5, "#ff9a30");
  glow.addColorStop(1, "#c84a10");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-4, 22); ctx.lineTo(-4, 8); ctx.arc(2, 8, 6, Math.PI, 0, false); ctx.lineTo(8, 22); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#33373d";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Anvil out front (left)
  ctx.fillStyle = "#3a3e44";
  rr(ctx, -20, 14, 11, 3.5, 1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-20, 15.5); ctx.lineTo(-23, 16); ctx.lineTo(-20, 17.5); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2e3238";
  rr(ctx, -16, 17.5, 4, 2.5, 0.5);
  ctx.fill();
  ctx.fillStyle = "#3a3e44";
  rr(ctx, -19, 20, 9, 2.5, 0.5);
  ctx.fill();
  ctx.strokeStyle = "#1c1e22";
  ctx.lineWidth = 0.8;
  rr(ctx, -20, 14, 11, 3.5, 1);
  ctx.stroke();
  ctx.fillStyle = "#ffd66a";
  ([[-9, 12], [-7, 10], [-11, 9]] as Array<[number, number]>).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill(); });
}

// Caravan Post — a covered trade wagon beside a fingerpost.
function drawCaravanPost(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  ctx.strokeStyle = "#6a4a28";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-18, 18); ctx.lineTo(-18, -10);
  ctx.stroke();
  ctx.fillStyle = "#8a6a3a";
  ctx.beginPath();
  ctx.moveTo(-18, -9); ctx.lineTo(-7, -9); ctx.lineTo(-4, -6.5); ctx.lineTo(-7, -4); ctx.lineTo(-18, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2810";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#7a4a24";
  rr(ctx, -14, 8, 28, 8, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const tilt = ctx.createLinearGradient(0, -10, 0, 9);
  tilt.addColorStop(0, "#f2ead6");
  tilt.addColorStop(1, "#cdbf9a");
  ctx.fillStyle = tilt;
  ctx.beginPath();
  ctx.moveTo(-13, 9); ctx.lineTo(-13, 0); ctx.quadraticCurveTo(0, -16, 13, 0); ctx.lineTo(13, 9); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a7a52";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = "rgba(138,122,82,0.6)";
  ctx.lineWidth = 0.9;
  [-6, 0, 6].forEach((x) => {
    const topY = -8 * (1 - (x / 13) ** 2);
    ctx.beginPath();
    ctx.moveTo(x, 8); ctx.lineTo(x, topY);
    ctx.stroke();
  });
  ctx.fillStyle = "rgba(60,46,30,0.5)";
  ctx.beginPath();
  ctx.ellipse(13, 4.5, 2.4, 4.5, 0, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  const wheel = (x: number) => {
    ctx.fillStyle = "#5a3a1e";
    ctx.beginPath();
    ctx.arc(x, 18, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2e1c0e";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#caa05a";
    ctx.beginPath();
    ctx.arc(x, 18, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.lineTo(x + Math.cos(a) * 4, 18 + Math.sin(a) * 4);
      ctx.stroke();
    }
  };
  wheel(-8);
  wheel(8);
}

// Kitchen — a cookhouse: a smoking chimney over a bubbling cauldron.
function drawKitchen(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  ctx.fillStyle = "#9a6a4a";
  rr(ctx, 8, -22, 7, 14, 1);
  ctx.fill();
  ctx.strokeStyle = "#4a2e18";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  drawSmoke(ctx, 11.5, -24);
  const wall = ctx.createLinearGradient(-18, 0, 18, 0);
  wall.addColorStop(0, "#e8cfae");
  wall.addColorStop(0.5, "#cdac80");
  wall.addColorStop(1, "#a4805a");
  ctx.fillStyle = wall;
  rr(ctx, -18, -6, 36, 28, 2);
  ctx.fill();
  ctx.strokeStyle = "#5e4026";
  ctx.lineWidth = 2;
  ctx.stroke();
  const roof = ctx.createLinearGradient(0, -20, 0, -6);
  roof.addColorStop(0, "#9a5436");
  roof.addColorStop(1, "#5e2e18");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-21, -6); ctx.lineTo(0, -20); ctx.lineTo(21, -6); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#36180c";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawWindow(ctx, -14, 0, 8, 8);
  ctx.fillStyle = "#2a1c12";
  ctx.beginPath();
  ctx.moveTo(-4, 22); ctx.lineTo(-4, 8); ctx.arc(3, 8, 7, Math.PI, 0, false); ctx.lineTo(10, 22); ctx.closePath();
  ctx.fill();
  drawFire(ctx, 3, 21, 0.8);
  ctx.fillStyle = "#2e2e34";
  ctx.beginPath();
  ctx.arc(3, 14, 5, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.lineTo(-1.5, 12); ctx.lineTo(7.5, 12); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a3a42";
  rr(ctx, -2.5, 11, 11, 2, 1);
  ctx.fill();
  ctx.fillStyle = "#caa86a";
  ([[1, 12], [4, 12], [3, 11]] as Array<[number, number]>).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill(); });
  ctx.strokeStyle = "rgba(230,230,234,0.6)";
  ctx.lineWidth = 1.4;
  ([[-1, 1], [5, 0]] as Array<[number, number]>).forEach(([x, i]) => {
    ctx.beginPath();
    ctx.moveTo(x, 9);
    ctx.quadraticCurveTo(x + (i ? -3 : 3), 5, x, 1);
    ctx.stroke();
  });
}

// Workshop — a carpenter's shed with a crossed saw-and-hammer sign and a bench.
function drawWorkshop(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  const wall = ctx.createLinearGradient(-18, 0, 18, 0);
  wall.addColorStop(0, "#b6a274");
  wall.addColorStop(0.5, "#94814f");
  wall.addColorStop(1, "#6e5d34");
  ctx.fillStyle = wall;
  rr(ctx, -18, -4, 36, 26, 2);
  ctx.fill();
  ctx.strokeStyle = "#473916";
  ctx.lineWidth = 2;
  ctx.stroke();
  const roof = ctx.createLinearGradient(0, -18, 0, -4);
  roof.addColorStop(0, "#7a6038");
  roof.addColorStop(1, "#473118");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-21, -4); ctx.lineTo(0, -18); ctx.lineTo(21, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2c1e0e";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#cfcfd6";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, -6); ctx.lineTo(4, -13);
  ctx.stroke();
  ctx.strokeStyle = "#8a6a3a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-5, -13); ctx.lineTo(2, -7);
  ctx.stroke();
  ctx.fillStyle = "#5a5e66";
  rr(ctx, 1, -14, 4, 2.4, 0.6);
  ctx.fill();
  ctx.lineCap = "butt";
  ctx.fillStyle = "#241c12";
  rr(ctx, -13, 4, 18, 18, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#473916";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#7a5a30";
  rr(ctx, -12, 13, 16, 3, 0.5);
  ctx.fill();
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-9, 16); ctx.lineTo(-9, 21); ctx.moveTo(1, 16); ctx.lineTo(1, 21);
  ctx.stroke();
  ctx.fillStyle = "#caa86a";
  [0, 1, 2].forEach((i) => {
    rr(ctx, 7, 14 + i * 2.6, 11, 2, 0.5);
    ctx.fill();
    ctx.strokeStyle = "#8a6a3a";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });
  ctx.fillStyle = "rgba(220,200,150,0.6)";
  ([[-6, 22], [-3, 22], [0, 21.6]] as Array<[number, number]>).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill(); });
}

// Powder Store — a dark stone magazine with a bomb-proof roof and a fused keg.
function drawPowderStore(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  const stone = ctx.createLinearGradient(-18, 0, 18, 0);
  stone.addColorStop(0, "#56504a");
  stone.addColorStop(0.5, "#3e3a34");
  stone.addColorStop(1, "#26231e");
  ctx.fillStyle = stone;
  rr(ctx, -18, 2, 36, 20, 2);
  ctx.fill();
  ctx.strokeStyle = "#16140f";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-19, 2); ctx.quadraticCurveTo(0, -18, 19, 2); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16140f";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,18,14,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-14, -3); ctx.quadraticCurveTo(0, -13, 14, -3);
  ctx.stroke();
  [9, 15].forEach((y) => { ctx.beginPath(); ctx.moveTo(-18, y); ctx.lineTo(18, y); ctx.stroke(); });
  ctx.fillStyle = "#4a3a28";
  rr(ctx, -6, 9, 12, 13, 1);
  ctx.fill();
  ctx.strokeStyle = "#16100a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#6a6e74";
  [11, 18].forEach((y) => { rr(ctx, -6, y, 12, 1.6, 0.4); ctx.fill(); });
  ctx.fillStyle = "#8a8e94";
  ctx.beginPath();
  ctx.arc(3, 15.5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1610";
  rr(ctx, -15, 7, 6, 5, 0.8);
  ctx.fill();
  ctx.strokeStyle = "#6a6e74";
  ctx.lineWidth = 0.7;
  [-13.5, -12, -10.5].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 7); ctx.lineTo(x, 12); ctx.stroke(); });
  drawBarrel(ctx, 13, 10, 10, 11);
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(13, 9); ctx.quadraticCurveTo(16, 5, 15, 3);
  ctx.stroke();
  ctx.fillStyle = "#ffd66a";
  ctx.beginPath();
  ctx.arc(15, 2.6, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff9a30";
  ([[16, 1.6], [14, 1.8]] as Array<[number, number]>).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill(); });
}

// Magic Portal — a rune-stone arch framing a swirling disc of arcane energy.
function drawPortal(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 16, 4);
  const core = ctx.createRadialGradient(0, 2, 1, 0, 2, 12);
  core.addColorStop(0, "#e8d4ff");
  core.addColorStop(0.4, "#9a5ad8");
  core.addColorStop(0.8, "#4a2a8a");
  core.addColorStop(1, "#241040");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(-9, 20); ctx.lineTo(-9, 0); ctx.arc(0, 0, 9, Math.PI, 0, false); ctx.lineTo(9, 20); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(220,200,255,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 3;
    const r = 1 + i * 0.32;
    const x = Math.cos(a) * r;
    const y = 2 + Math.sin(a) * r * 0.92;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
  const stone = ctx.createLinearGradient(-14, 0, 14, 0);
  stone.addColorStop(0, "#8a7ea2");
  stone.addColorStop(0.5, "#5e5478");
  stone.addColorStop(1, "#3a3050");
  ctx.fillStyle = stone;
  rr(ctx, -15, -2, 6, 24, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#241a38";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = stone;
  rr(ctx, 9, -2, 6, 24, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = stone;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, -2, 12, Math.PI, 0, false);
  ctx.stroke();
  ctx.strokeStyle = "#241a38";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -2, 15, Math.PI, 0, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -2, 9, Math.PI, 0, false);
  ctx.stroke();
  ctx.fillStyle = "#c8a8ff";
  ([[-12, 6], [-12, 12], [12, 6], [12, 12]] as Array<[number, number]>).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "#e8d4ff";
  ctx.beginPath();
  ctx.arc(0, -14, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ([[-4, -4], [5, -2], [3, 8], [-6, 6]] as Array<[number, number]>).forEach(([x, y], i) => {
    ctx.globalAlpha = 0.5 + (i % 2) * 0.4;
    ctx.fillStyle = "rgba(220,200,255,0.9)";
    ctx.beginPath();
    ctx.arc(x, y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// Silo — a tall cylindrical grain silo with a domed metal cap and a side ladder.
function drawSilo(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 16, 4);
  const body = ctx.createLinearGradient(-11, 0, 11, 0);
  body.addColorStop(0, "#c9a86e");
  body.addColorStop(0.45, "#a6824e");
  body.addColorStop(1, "#6e5230");
  ctx.fillStyle = body;
  rr(ctx, -11, -16, 22, 38, 3);
  ctx.fill();
  ctx.strokeStyle = "#4a3416";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(74,52,22,0.55)";
  ctx.lineWidth = 1;
  [-8, 0, 8, 16].forEach((y) => { ctx.beginPath(); ctx.moveTo(-11, y); ctx.lineTo(11, y); ctx.stroke(); });
  ctx.strokeStyle = "rgba(255,240,200,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -15); ctx.lineTo(-6, 21);
  ctx.stroke();
  const cap = ctx.createLinearGradient(0, -28, 0, -16);
  cap.addColorStop(0, "#cdd2d8");
  cap.addColorStop(1, "#7e848c");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(-12, -16); ctx.arc(0, -16, 12, Math.PI, 0, false); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#43474d";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = "#43474d";
  rr(ctx, -2, -31, 4, 5, 1);
  ctx.fill();
  ctx.strokeStyle = "#43474d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(5, -14); ctx.lineTo(5, 20); ctx.moveTo(9, -14); ctx.lineTo(9, 20);
  ctx.stroke();
  for (let y = -12; y <= 18; y += 4) { ctx.beginPath(); ctx.moveTo(5, y); ctx.lineTo(9, y); ctx.stroke(); }
  ctx.fillStyle = "#8a6a3a";
  ctx.beginPath();
  ctx.moveTo(-11, 14); ctx.lineTo(-18, 22); ctx.lineTo(-13, 22); ctx.lineTo(-7, 16); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a3416";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

// Harbor Dock — a plank pier on pilings, a mooring bollard and a lantern post.
function drawHarborDock(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 3);
  const water = ctx.createLinearGradient(0, 10, 0, 24);
  water.addColorStop(0, "#5aa6c0");
  water.addColorStop(1, "#2e6a88");
  ctx.fillStyle = water;
  rr(ctx, -24, 10, 48, 14, 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  ([[-14, 16], [2, 19], [12, 14]] as Array<[number, number]>).forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.quadraticCurveTo(x, y - 2, x + 4, y); ctx.stroke(); });
  ctx.fillStyle = "#5a3c1e";
  [-16, -4, 8, 18].forEach((x) => {
    rr(ctx, x - 1.6, 2, 3.2, 18, 0.6);
    ctx.fill();
    ctx.strokeStyle = "#2e1c0e";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  const deck = ctx.createLinearGradient(0, -2, 0, 6);
  deck.addColorStop(0, "#b08a52");
  deck.addColorStop(1, "#7e5e34");
  ctx.fillStyle = deck;
  rr(ctx, -22, -1, 44, 7, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a260f";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = "rgba(58,38,15,0.5)";
  ctx.lineWidth = 0.7;
  for (let x = -18; x <= 18; x += 6) { ctx.beginPath(); ctx.moveTo(x, -1); ctx.lineTo(x, 6); ctx.stroke(); }
  ctx.fillStyle = "#43474d";
  rr(ctx, -16, -8, 5, 8, 1.5);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-13.5, -8.5, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#caa86a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(-13.5, -2, 4, 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, -1); ctx.lineTo(16, -16); ctx.lineTo(12, -16);
  ctx.stroke();
  ctx.fillStyle = "#ffd86a";
  rr(ctx, 10, -16, 5, 6, 1);
  ctx.fill();
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

// Fishmonger — a quayside stall of fish on ice under a blue-striped awning.
function drawFishmonger(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  ctx.strokeStyle = "#4a5a6a";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, -8); ctx.lineTo(-16, 22); ctx.moveTo(16, -8); ctx.lineTo(16, 22);
  ctx.stroke();
  ctx.lineCap = "butt";
  const counter = ctx.createLinearGradient(0, 6, 0, 22);
  counter.addColorStop(0, "#7a8a98");
  counter.addColorStop(1, "#46545e");
  ctx.fillStyle = counter;
  rr(ctx, -18, 8, 36, 14, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#2a343c";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = "#dbeaf2";
  rr(ctx, -17, 6, 34, 4, 1.2);
  ctx.fill();
  ctx.strokeStyle = "#9bb6c4";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  const fish = (x: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, 6, 4.5, 2.2, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 4, 6); ctx.lineTo(x + 7, 4.4); ctx.lineTo(x + 7, 7.6); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a2630";
    ctx.beginPath();
    ctx.arc(x - 3, 5.4, 0.7, 0, Math.PI * 2);
    ctx.fill();
  };
  fish(-9, "#9aa8b6");
  fish(0, "#b0a0b8");
  fish(9, "#8fb0c0");
  const stripes = ["#e8eef2", "#3a6e9a"];
  const segW = 6.4;
  for (let i = 0; i < 6; i++) {
    const x0 = -19 + i * segW;
    ctx.fillStyle = stripes[i % 2];
    ctx.beginPath();
    ctx.moveTo(x0, -10); ctx.lineTo(x0 + segW, -10); ctx.lineTo(x0 + segW, -3);
    ctx.quadraticCurveTo(x0 + segW / 2, 1, x0, -3); ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#5a6a76";
  rr(ctx, -20, -13, 40, 4, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#2a343c";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "#2a343c";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -13); ctx.lineTo(0, -16);
  ctx.stroke();
  ctx.fillStyle = "#8fb0c0";
  ctx.beginPath();
  ctx.ellipse(0, -18, 4, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -18); ctx.lineTo(7, -20); ctx.lineTo(7, -16); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a6e9a";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

// Smokehouse — a dark plank hut with a roof vent gushing smoke and a low glow.
function drawSmokehouse(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  ctx.fillStyle = "rgba(210,206,198,0.5)";
  for (let i = 0; i < 5; i++) {
    const y = -12 - i * 4;
    const r = 3 + i * 1.1;
    ctx.globalAlpha = 0.5 - i * 0.08;
    ctx.beginPath();
    ctx.arc(Math.sin(i) * 2, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const wall = ctx.createLinearGradient(-14, 0, 14, 0);
  wall.addColorStop(0, "#6a513c");
  wall.addColorStop(0.5, "#4e3a2a");
  wall.addColorStop(1, "#33261b");
  ctx.fillStyle = wall;
  rr(ctx, -14, -4, 28, 26, 2);
  ctx.fill();
  ctx.strokeStyle = "#1e150e";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(30,21,14,0.6)";
  ctx.lineWidth = 0.7;
  [-7, 0, 7].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x, 22); ctx.stroke(); });
  const roof = ctx.createLinearGradient(0, -16, 0, -4);
  roof.addColorStop(0, "#4a3424");
  roof.addColorStop(1, "#2a1c12");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-17, -4); ctx.lineTo(0, -16); ctx.lineTo(17, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#160e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#2a1c12";
  rr(ctx, -4, -14, 8, 5, 0.8);
  ctx.fill();
  ctx.strokeStyle = "#6a513c";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-4, -12.5); ctx.lineTo(4, -12.5); ctx.moveTo(-4, -11); ctx.lineTo(4, -11);
  ctx.stroke();
  ctx.fillStyle = "#1a1208";
  rr(ctx, -5, 10, 10, 12, 1);
  ctx.fill();
  const glow = ctx.createLinearGradient(0, 16, 0, 22);
  glow.addColorStop(0, "rgba(255,150,40,0)");
  glow.addColorStop(1, "rgba(255,150,40,0.7)");
  ctx.fillStyle = glow;
  rr(ctx, -5, 10, 10, 12, 1);
  ctx.fill();
  ctx.strokeStyle = "#1e150e";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, 13);
  ctx.rotate(0.3);
  ctx.fillStyle = "#b89a6a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Clock Tower — a tall civic tower with a painted clock face and a finial.
function drawClockTower(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 14, 4);
  const stone = ctx.createLinearGradient(-9, 0, 9, 0);
  stone.addColorStop(0, "#9a90ae");
  stone.addColorStop(0.5, "#766c8c");
  stone.addColorStop(1, "#4e4660");
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-8, -12); ctx.lineTo(-10, 22); ctx.lineTo(10, 22); ctx.lineTo(8, -12); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e2840";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(46,40,64,0.45)";
  ctx.lineWidth = 0.7;
  [-4, 4, 12].forEach((y) => { ctx.beginPath(); ctx.moveTo(-9 - y * 0.06, y); ctx.lineTo(9 + y * 0.06, y); ctx.stroke(); });
  const roof = ctx.createLinearGradient(0, -28, 0, -12);
  roof.addColorStop(0, "#5a4e74");
  roof.addColorStop(1, "#332a48");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-11, -12); ctx.lineTo(0, -28); ctx.lineTo(11, -12); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1e1830";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = "#e0c860";
  ctx.beginPath();
  ctx.arc(0, -29, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a6818";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.fillStyle = "#f4ecd8";
  ctx.beginPath();
  ctx.arc(0, -3, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2e2840";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "#5a5070";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 5, -3 + Math.sin(a) * 5);
    ctx.lineTo(Math.cos(a) * 4, -3 + Math.sin(a) * 4);
    ctx.stroke();
  }
  ctx.strokeStyle = "#2e2840";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -3); ctx.lineTo(0, -6.5); ctx.moveTo(0, -3); ctx.lineTo(3, -2);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = "#3a3050";
  ctx.beginPath();
  ctx.moveTo(-4, 22); ctx.lineTo(-4, 14); ctx.arc(0, 14, 4, Math.PI, 0, false); ctx.lineTo(4, 22); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e2840";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Lighthouse — a red-and-white tapered tower with a glowing lantern and beams.
function drawLighthouse(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 16, 4);
  ctx.fillStyle = "#6a6258";
  ctx.beginPath();
  ctx.moveTo(-16, 22); ctx.quadraticCurveTo(-6, 14, 0, 16); ctx.quadraticCurveTo(8, 14, 16, 22); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#46403a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -10); ctx.lineTo(-9, 17); ctx.lineTo(9, 17); ctx.lineTo(6, -10); ctx.closePath();
  ctx.fillStyle = "#eef0f2";
  ctx.fill();
  ctx.strokeStyle = "#5a626a";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-6, -10); ctx.lineTo(-9, 17); ctx.lineTo(9, 17); ctx.lineTo(6, -10); ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#d2402e";
  [-6, 4, 14].forEach((y) => { ctx.fillRect(-10, y, 20, 5); });
  ctx.restore();
  ctx.fillStyle = "#5a626a";
  rr(ctx, -8, -12, 16, 3, 0.6);
  ctx.fill();
  ctx.fillStyle = "#2e3640";
  rr(ctx, -5, -22, 10, 10, 1.5);
  ctx.fill();
  const lamp = ctx.createRadialGradient(0, -17, 1, 0, -17, 6);
  lamp.addColorStop(0, "#fff6c0");
  lamp.addColorStop(1, "#ffb83a");
  ctx.fillStyle = lamp;
  rr(ctx, -4, -21, 8, 8, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 1;
  ctx.strokeRect(-4, -21, 8, 8);
  ctx.fillStyle = "#3a3e44";
  ctx.beginPath();
  ctx.moveTo(-6, -22); ctx.lineTo(0, -28); ctx.lineTo(6, -22); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e0c860";
  ctx.beginPath();
  ctx.arc(0, -29, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,240,170,0.28)";
  ctx.beginPath();
  ctx.moveTo(0, -17); ctx.lineTo(-24, -24); ctx.lineTo(-24, -11); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -17); ctx.lineTo(24, -24); ctx.lineTo(24, -11); ctx.closePath();
  ctx.fill();
}

// Apothecary — a timber-framed remedy shop with a mortar-and-pestle sign.
function drawApothecary(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  const wall = ctx.createLinearGradient(-16, 0, 16, 0);
  wall.addColorStop(0, "#cfe0cf");
  wall.addColorStop(0.5, "#acc6ad");
  wall.addColorStop(1, "#7a9c7e");
  ctx.fillStyle = wall;
  rr(ctx, -16, -4, 32, 26, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a5a40";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#5a4028";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, 8); ctx.lineTo(16, 8); ctx.moveTo(-7, -4); ctx.lineTo(-7, 22); ctx.moveTo(7, -4); ctx.lineTo(7, 22);
  ctx.stroke();
  const roof = ctx.createLinearGradient(0, -18, 0, -4);
  roof.addColorStop(0, "#4a7a5a");
  roof.addColorStop(1, "#2c4e38");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-19, -4); ctx.lineTo(0, -18); ctx.lineTo(19, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1e3626";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#2a2418";
  rr(ctx, -14, 11, 12, 9, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a5a40";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const bottle = (x: number, c: string) => {
    ctx.fillStyle = c;
    rr(ctx, x - 1.4, 13, 2.8, 6, 0.8);
    ctx.fill();
    ctx.fillStyle = "#d8cdb0";
    ctx.fillRect(x - 0.7, 12, 1.4, 1.6);
  };
  bottle(-11, "#c44a8a");
  bottle(-7.5, "#4a8ac4");
  bottle(-4, "#caa83a");
  ctx.fillStyle = "#5a7a5e";
  rr(ctx, 2, 10, 10, 12, 1.2);
  ctx.fill();
  ctx.strokeStyle = "#2c4e38";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#e0c860";
  ctx.beginPath();
  ctx.arc(10, 16, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2810";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(21, 0); ctx.lineTo(21, 3);
  ctx.stroke();
  ctx.fillStyle = "#e8e2d0";
  ctx.beginPath();
  ctx.arc(21, 7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a5a40";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "#3a5a40";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(21, 8, 2.2, 0.1 * Math.PI, 0.9 * Math.PI, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22.6, 8); ctx.lineTo(24, 4.6);
  ctx.stroke();
}

// Sawmill — a timber mill with a big toothed saw blade and a stack of cut logs.
function drawSawmill(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  const wall = ctx.createLinearGradient(-16, 0, 8, 0);
  wall.addColorStop(0, "#b89464");
  wall.addColorStop(0.5, "#977542");
  wall.addColorStop(1, "#6e5230");
  ctx.fillStyle = wall;
  rr(ctx, -18, -4, 26, 26, 2);
  ctx.fill();
  ctx.strokeStyle = "#473216";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(71,50,22,0.5)";
  ctx.lineWidth = 0.8;
  [2, 9, 16].forEach((y) => { ctx.beginPath(); ctx.moveTo(-18, y); ctx.lineTo(8, y); ctx.stroke(); });
  const roof = ctx.createLinearGradient(0, -16, 0, -4);
  roof.addColorStop(0, "#8a5a34");
  roof.addColorStop(1, "#4e2e16");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-21, -4); ctx.lineTo(-5, -16); ctx.lineTo(11, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2c1a0c";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawWindow(ctx, -13, 2, 7, 7);
  ctx.fillStyle = "#5a86a0";
  ctx.beginPath();
  ctx.moveTo(-18, 18); ctx.lineTo(-23, 22); ctx.lineTo(-18, 22); ctx.closePath();
  ctx.fill();
  const bx = 11, by = 12, br = 9;
  ctx.fillStyle = "#c4ccd2";
  ctx.beginPath();
  const teeth = 16;
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 ? br : br - 2.2;
    const x = bx + Math.cos(a) * r;
    const y = by + Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#6a727a";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#7a828a";
  ctx.beginPath();
  ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a3e44";
  ctx.beginPath();
  ctx.arc(bx, by, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(106,114,122,0.6)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a) * (br - 3), by + Math.sin(a) * (br - 3));
    ctx.stroke();
  }
  drawLogEnd(ctx, -12, 20, 3);
  drawLogEnd(ctx, -5, 20, 3);
  drawLogEnd(ctx, -8.5, 15, 3);
}

// Stable — a horse barn with a split Dutch door and a horseshoe over the lintel.
function drawStable(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  const wall = ctx.createLinearGradient(-18, 0, 18, 0);
  wall.addColorStop(0, "#c79a64");
  wall.addColorStop(0.5, "#a87a44");
  wall.addColorStop(1, "#7a5630");
  ctx.fillStyle = wall;
  rr(ctx, -18, -2, 36, 24, 2);
  ctx.fill();
  ctx.strokeStyle = "#4e3416";
  ctx.lineWidth = 2;
  ctx.stroke();
  const roof = ctx.createLinearGradient(0, -20, 0, -2);
  roof.addColorStop(0, "#8a5a34");
  roof.addColorStop(1, "#4e2e16");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-20, -2); ctx.lineTo(-13, -11); ctx.lineTo(0, -19); ctx.lineTo(13, -11); ctx.lineTo(20, -2); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2c1a0c";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#3a2614";
  rr(ctx, -4, -10, 8, 6, 1);
  ctx.fill();
  ctx.fillStyle = "#d8b84a";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-3 + i * 1.5, -4); ctx.lineTo(-4 + i * 1.5, -8); ctx.lineTo(-2 + i * 1.5, -8); ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#8a6038";
  rr(ctx, -7, 4, 14, 18, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "#241810";
  rr(ctx, -6, 5, 12, 7, 1);
  ctx.fill();
  ctx.strokeStyle = "#5a3c1c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, 13); ctx.lineTo(7, 13); ctx.moveTo(0, 13); ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.strokeStyle = "#c2c7ce";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 2.4, 3.2, 0.12 * Math.PI, 0.88 * Math.PI, false);
  ctx.stroke();
  ctx.fillStyle = "#c2c7ce";
  ([[-3, 3], [3, 3]] as Array<[number, number]>).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill(); });
}

// Apiary — a row of coiled-straw bee skeps among flowers, with a few bees about.
function drawApiary(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  ctx.fillStyle = "#8a6038";
  rr(ctx, -20, 12, 40, 4, 1);
  ctx.fill();
  ctx.strokeStyle = "#4e3416";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#6e4c28";
  [-16, 0, 16].forEach((x) => { rr(ctx, x - 1.5, 16, 3, 6, 0.6); ctx.fill(); });
  const skep = (cx: number, scale: number) => {
    const h = 12 * scale, w = 9 * scale;
    const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    g.addColorStop(0, "#e6c266");
    g.addColorStop(0.5, "#cda043");
    g.addColorStop(1, "#9a7327");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w, 12);
    ctx.quadraticCurveTo(cx - w, 12 - h, cx, 12 - h);
    ctx.quadraticCurveTo(cx + w, 12 - h, cx + w, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#6e4f1c";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = "rgba(110,79,28,0.6)";
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 5; i++) {
      const yy = 12 - (h * i / 5);
      const ww = w * (1 - (i / 5) * 0.55);
      ctx.beginPath();
      ctx.moveTo(cx - ww, yy);
      ctx.quadraticCurveTo(cx, yy - 1.6, cx + ww, yy);
      ctx.stroke();
    }
    ctx.fillStyle = "#3a2810";
    ctx.beginPath();
    ctx.ellipse(cx, 10, 1.6, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  skep(-9, 1);
  skep(9, 1);
  skep(0, 1.18);
  ([[-15, 20], [15, 20], [-2, 21]] as Array<[number, number]>).forEach(([x, y], i) => {
    ctx.fillStyle = ["#d24a6a", "#7a5ad8", "#e0a83a"][i];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, 1.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f0d050";
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ([[-4, 2], [6, -2], [13, 5]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.fillStyle = "#3a2a10";
    ctx.beginPath();
    ctx.ellipse(x, y, 1.4, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(x - 0.6, y - 0.6, 0.8, 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Brewery — a brewhouse with a copper kettle dome venting steam, and casks.
function drawBrewery(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  ctx.fillStyle = "rgba(230,230,234,0.5)";
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = 0.45 - i * 0.09;
    ctx.beginPath();
    ctx.arc(7 + Math.sin(i) * 2, -16 - i * 4, 2.6 + i * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const wall = ctx.createLinearGradient(-16, 0, 16, 0);
  wall.addColorStop(0, "#c2a274");
  wall.addColorStop(0.5, "#9c7a4c");
  wall.addColorStop(1, "#6e5230");
  ctx.fillStyle = wall;
  rr(ctx, -18, -4, 30, 26, 2);
  ctx.fill();
  ctx.strokeStyle = "#473216";
  ctx.lineWidth = 2;
  ctx.stroke();
  const roof = ctx.createLinearGradient(0, -18, 0, -4);
  roof.addColorStop(0, "#7a4a2a");
  roof.addColorStop(1, "#4a2814");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-21, -4); ctx.lineTo(-3, -18); ctx.lineTo(15, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2c1810";
  ctx.lineWidth = 2;
  ctx.stroke();
  const cop = ctx.createLinearGradient(0, -22, 14, -8);
  cop.addColorStop(0, "#e8a25a");
  cop.addColorStop(0.5, "#c4742e");
  cop.addColorStop(1, "#8a4a1c");
  ctx.fillStyle = cop;
  ctx.beginPath();
  ctx.arc(7, -6, 7, Math.PI, 0, false);
  ctx.lineTo(14, -6); ctx.lineTo(0, -6); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a2e10";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#5a2e10";
  rr(ctx, 6, -16, 2, 4, 0.5);
  ctx.fill();
  ctx.fillStyle = "#caa05a";
  ctx.beginPath();
  ctx.arc(7, -13, 1.4, 0, Math.PI * 2);
  ctx.fill();
  drawWindow(ctx, -14, 2, 7, 8);
  drawBarrel(ctx, -9, 13, 9, 9);
  drawBarrel(ctx, 1, 14, 8, 8);
  ctx.strokeStyle = "#3a2810";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(12, 2); ctx.lineTo(18, 2); ctx.lineTo(18, 5);
  ctx.stroke();
  ctx.fillStyle = "#caa860";
  rr(ctx, 15, 5, 5, 6, 1);
  ctx.fill();
  ctx.strokeStyle = "#7a5420";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#e8dcc0";
  rr(ctx, 15.5, 4.4, 4, 1.6, 0.6);
  ctx.fill();
}

// Observatory — a round tower capped by a silver dome with a brass telescope.
function drawObservatory(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  const starP = (x: number, y: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rad = i % 2 ? r : r * 0.4;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = "#fff2b0";
  starP(17, -20, 3);
  ctx.fillStyle = "rgba(255,242,176,0.7)";
  ([[10, -12, 1.2], [22, -10, 1]] as Array<[number, number, number]>).forEach(([x, y, r]) => starP(x, y, r));
  const body = ctx.createLinearGradient(-12, 0, 12, 0);
  body.addColorStop(0, "#6a7a92");
  body.addColorStop(0.5, "#4a5a72");
  body.addColorStop(1, "#2e3a4e");
  ctx.fillStyle = body;
  rr(ctx, -12, 0, 24, 22, 2);
  ctx.fill();
  ctx.strokeStyle = "#1e2632";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(30,38,50,0.5)";
  ctx.lineWidth = 0.7;
  [7, 14].forEach((y) => { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(12, y); ctx.stroke(); });
  const dome = ctx.createLinearGradient(0, -14, 0, 0);
  dome.addColorStop(0, "#cdd6de");
  dome.addColorStop(1, "#7e8a96");
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(0, 0, 14, Math.PI, 0, false);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#46505c";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(70,80,92,0.5)";
  ctx.lineWidth = 0.8;
  [-7, 0, 7].forEach((x) => { ctx.beginPath(); ctx.moveTo(x * 0.5, -13.5); ctx.lineTo(x, 0); ctx.stroke(); });
  ctx.fillStyle = "#10161e";
  ctx.beginPath();
  ctx.moveTo(-2.5, 0); ctx.lineTo(-1.5, -13); ctx.lineTo(1.5, -13); ctx.lineTo(2.5, 0); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b88a2a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(11, -15);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = "#caa040";
  ctx.beginPath();
  ctx.arc(11, -15, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e2632";
  ctx.beginPath();
  ctx.moveTo(-4, 22); ctx.lineTo(-4, 14); ctx.arc(0, 14, 4, Math.PI, 0, false); ctx.lineTo(4, 22); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd368";
  rr(ctx, 6, 8, 4, 5, 1);
  ctx.fill();
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

export const ICONS = {
  bld_cottage:      { label:"Cottage",       color:"#e6cda0", draw:drawCottage },
  bld_windmill:     { label:"Windmill",      color:"#cbb990", draw:drawWindmill },
  bld_barn:         { label:"Barn",          color:"#b03224", draw:drawBarn },
  bld_tower:        { label:"Watch Tower",   color:"#8e949c", draw:drawTower },
  bld_church:       { label:"Chapel",        color:"#ece4cc", draw:drawChurch },
  bld_market_stall: { label:"Market Stall",  color:"#d23a2a", draw:drawMarketStall },
  bld_bridge:       { label:"Stone Bridge",  color:"#9d9486", draw:drawBridge },
  bld_watermill:    { label:"Watermill",     color:"#cbbf98", draw:drawWatermill },
  bld_castle:       { label:"Castle Keep",   color:"#8e949c", draw:drawCastle },
  bld_tent:         { label:"Market Tent",   color:"#cc4a3a", draw:drawTent },

  // Per-building icons — one for every town building id, so the Wiki can link a
  // building to its icon via `bld_<id>` (see EntityVisual.entityIconKey). Several
  // reuse a matching archetype draw above; the rest are bespoke. Note `barn`
  // maps to the existing `bld_barn` entry, so it needs no separate line.
  bld_hearth:       { label:"Hearth",        color:"#a8431a", draw:drawHearth },
  bld_mill:         { label:"Mill",          color:"#c8923a", draw:drawWindmill },
  bld_bakery:       { label:"Bakery",        color:"#8a4a26", draw:drawBakery },
  bld_inn:          { label:"Inn",           color:"#4f6b3a", draw:drawInn },
  bld_granary:      { label:"Granary",       color:"#c5a87a", draw:drawGranary },
  bld_mining_camp:  { label:"Mining Camp",   color:"#8a7a6a", draw:drawMiningCamp },
  bld_larder:       { label:"Larder",        color:"#4f6b3a", draw:drawLarder },
  bld_forge:        { label:"Forge",         color:"#5a6973", draw:drawForge },
  bld_caravan_post: { label:"Caravan Post",  color:"#7e4f24", draw:drawCaravanPost },
  bld_kitchen:      { label:"Kitchen",       color:"#8a4a26", draw:drawKitchen },
  bld_workshop:     { label:"Workshop",      color:"#6a5a3a", draw:drawWorkshop },
  bld_powder_store: { label:"Powder Store",  color:"#3a2a1a", draw:drawPowderStore },
  bld_portal:       { label:"Magic Portal",  color:"#4a2a7a", draw:drawPortal },
  bld_housing:      { label:"Housing Block", color:"#a07a4a", draw:drawCottage },
  bld_housing2:     { label:"Housing Block", color:"#a07a4a", draw:drawCottage },
  bld_housing3:     { label:"Housing Block", color:"#a07a4a", draw:drawCottage },
  bld_silo:         { label:"Silo",          color:"#9a6a3a", draw:drawSilo },
  bld_harbor_dock:  { label:"Harbor Dock",   color:"#3a4a78", draw:drawHarborDock },
  bld_fishmonger:   { label:"Fishmonger",    color:"#7a8aa6", draw:drawFishmonger },
  bld_smokehouse:   { label:"Smokehouse",    color:"#5a4030", draw:drawSmokehouse },
  bld_clock_tower:  { label:"Clock Tower",   color:"#6a5a8a", draw:drawClockTower },
  bld_lighthouse:   { label:"Lighthouse",    color:"#c8d0d6", draw:drawLighthouse },
  bld_apothecary:   { label:"Apothecary",    color:"#4a7a5a", draw:drawApothecary },
  bld_sawmill:      { label:"Sawmill",       color:"#7a5a34", draw:drawSawmill },
  bld_watchtower:   { label:"Watchtower",    color:"#5a6a4a", draw:drawTower },
  bld_stable:       { label:"Stable",        color:"#8a5a34", draw:drawStable },
  bld_apiary:       { label:"Apiary",        color:"#d6a83a", draw:drawApiary },
  bld_chapel:       { label:"Chapel",        color:"#9a8e72", draw:drawChurch },
  bld_brewery:      { label:"Brewery",       color:"#7a4a26", draw:drawBrewery },
  bld_observatory:  { label:"Observatory",   color:"#3a4a6a", draw:drawObservatory },
};
