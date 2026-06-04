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
};
