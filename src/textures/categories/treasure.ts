// Treasure, loot & rewards. Drawn at canvas origin (0,0) inside a ~64×64
// design box. Warm gold gradients (#fff4c0 → #e0a020 → #8a5a10) with bright
// specular streaks and little sparkle stars to make rewards feel valuable.

function drawShadow(ctx: CanvasRenderingContext2D, w = 16, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A four-pointed sparkle star centered at (x,y) with radius r.
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = "#fffde0") {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.closePath();
  ctx.fill();
}

// ── Closed wooden treasure chest with metal bands, lock and domed lid. ─────
function drawChestClosed(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Box body
  const wood = ctx.createLinearGradient(0, 0, 0, 20);
  wood.addColorStop(0, "#a8703a");
  wood.addColorStop(0.5, "#7a4a1c");
  wood.addColorStop(1, "#4a2a0c");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.lineTo(17, 18);
  ctx.lineTo(-17, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1606";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wood grain on body
  ctx.strokeStyle = "rgba(42,22,6,0.5)";
  ctx.lineWidth = 0.8;
  [4, 9, 14].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-16, y);
    ctx.lineTo(16, y);
    ctx.stroke();
  });
  // Domed lid
  const lid = ctx.createLinearGradient(0, -14, 0, 1);
  lid.addColorStop(0, "#b8804a");
  lid.addColorStop(0.6, "#8a5424");
  lid.addColorStop(1, "#5a3210");
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.bezierCurveTo(-19, -14, 19, -14, 18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1606";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Lid highlight
  ctx.strokeStyle = "rgba(255,225,170,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-13, -6);
  ctx.bezierCurveTo(-7, -11, 7, -11, 13, -6);
  ctx.stroke();
  // Metal bands (gold) — left, right vertical straps
  const band = ctx.createLinearGradient(0, -12, 0, 18);
  band.addColorStop(0, "#fff4c0");
  band.addColorStop(0.5, "#e0a020");
  band.addColorStop(1, "#8a5a10");
  ctx.fillStyle = band;
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  [-12, 12].forEach((bx) => {
    ctx.beginPath();
    ctx.moveTo(bx - 3, 0);
    ctx.bezierCurveTo(bx - 3, -11, bx + 3, -11, bx + 3, 0);
    ctx.lineTo(bx + 3, 18);
    ctx.lineTo(bx - 3, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  // Horizontal band across the seam
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.rect(-18, -2, 36, 4);
  ctx.fill();
  ctx.stroke();
  // Lock plate
  const lockg = ctx.createRadialGradient(-1, 2, 1, 0, 4, 8);
  lockg.addColorStop(0, "#fff4c0");
  lockg.addColorStop(0.6, "#e0a020");
  lockg.addColorStop(1, "#8a5a10");
  ctx.fillStyle = lockg;
  ctx.beginPath();
  ctx.roundRect(-5, -1, 10, 11, 2);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Keyhole
  ctx.fillStyle = "#3a2406";
  ctx.beginPath();
  ctx.arc(0, 3, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-1, 4);
  ctx.lineTo(1, 4);
  ctx.lineTo(1.6, 8);
  ctx.lineTo(-1.6, 8);
  ctx.closePath();
  ctx.fill();
  // Stud rivets on bands
  ctx.fillStyle = "#fff1a8";
  [[-12, -8], [12, -8], [-12, 14], [12, 14], [-18, 0], [18, 0]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  sparkle(ctx, -10, -9, 1.6);
}

// ── Open chest overflowing with gold coins and a glow spilling out. ────────
function drawChestOpen(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Inner glow rising from the chest
  const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, 22);
  glow.addColorStop(0, "rgba(255,235,140,0.85)");
  glow.addColorStop(0.5, "rgba(240,180,40,0.35)");
  glow.addColorStop(1, "rgba(240,180,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, 22, 0, Math.PI * 2);
  ctx.fill();
  // Box body
  const wood = ctx.createLinearGradient(0, 2, 0, 20);
  wood.addColorStop(0, "#a8703a");
  wood.addColorStop(0.5, "#7a4a1c");
  wood.addColorStop(1, "#4a2a0c");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.lineTo(18, 2);
  ctx.lineTo(17, 18);
  ctx.lineTo(-17, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1606";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Vertical metal bands on body
  const band = ctx.createLinearGradient(0, 2, 0, 18);
  band.addColorStop(0, "#fff4c0");
  band.addColorStop(0.5, "#e0a020");
  band.addColorStop(1, "#8a5a10");
  ctx.fillStyle = band;
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  [-12, 12].forEach((bx) => {
    ctx.beginPath();
    ctx.rect(bx - 3, 2, 6, 16);
    ctx.fill();
    ctx.stroke();
  });
  // Open lid tilted back
  ctx.save();
  ctx.translate(0, 1);
  ctx.rotate(-0.32);
  const lid = ctx.createLinearGradient(0, -16, 0, -2);
  lid.addColorStop(0, "#5a3210");
  lid.addColorStop(1, "#8a5424");
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.moveTo(-18, -3);
  ctx.bezierCurveTo(-19, -16, 19, -16, 18, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1606";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Underside of lid (lighter)
  ctx.strokeStyle = "rgba(180,130,70,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.bezierCurveTo(-8, -9, 8, -9, 14, -4);
  ctx.stroke();
  ctx.restore();
  // Overflowing gold coins (clip to box opening top)
  const coins: Array<[number, number, number]> = [
    [-11, 0, 4], [-3, -2, 4.5], [6, -1, 4], [12, 1, 3.5],
    [-7, 3, 4], [2, 2, 4.5], [10, 4, 4], [-13, 4, 3.5], [0, 5, 4],
  ];
  coins.forEach(([x, y, r]) => {
    const cg = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
    cg.addColorStop(0, "#fff4c0");
    cg.addColorStop(0.6, "#f0b81c");
    cg.addColorStop(1, "#8a5a0c");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5e3c06";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(94,60,6,0.6)";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Front rim of box over coins
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.rect(-18, 6, 36, 2.5);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  ctx.stroke();
  sparkle(ctx, -5, -8, 2);
  sparkle(ctx, 9, -6, 1.6);
  sparkle(ctx, 0, -14, 1.4);
}

// ── Stack of gold coins with a single coin leaning beside it. ──────────────
function drawCoinStack(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 16, 4);
  // Leaning coin (behind, to the right)
  ctx.save();
  ctx.translate(13, 6);
  ctx.rotate(0.5);
  const leanG = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
  leanG.addColorStop(0, "#fff4c0");
  leanG.addColorStop(0.6, "#f0b81c");
  leanG.addColorStop(1, "#8a5a0c");
  ctx.fillStyle = leanG;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // star emboss
  ctx.fillStyle = "rgba(94,60,6,0.7)";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 4 : 1.8;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Stack of coins (bottom to top)
  const layers: Array<[number, number]> = [[0, 16], [-1, 11], [1, 6], [-1, 1], [0, -4]];
  layers.forEach(([cx, cy], i) => {
    const g = ctx.createLinearGradient(-12, cy, 12, cy);
    g.addColorStop(0, "#8a5a0c");
    g.addColorStop(0.5, "#f0b81c");
    g.addColorStop(1, "#c8860c");
    ctx.fillStyle = g;
    // coin side (cylinder edge)
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx - 12, cy - 4);
    ctx.ellipse(cx, cy - 4, 12, 4, 0, Math.PI, 0, true);
    ctx.lineTo(cx + 12, cy);
    ctx.ellipse(cx, cy, 12, 4, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e3c06";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // top face
    const top = ctx.createRadialGradient(cx - 3, cy - 5, 1, cx, cy - 4, 12);
    top.addColorStop(0, "#fff4c0");
    top.addColorStop(0.6, "#f0c430");
    top.addColorStop(1, "#c8860c");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // edge reeding ticks
    if (i === layers.length - 1) {
      ctx.fillStyle = "rgba(94,60,6,0.7)";
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // Specular streak on top coin
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-4, -6, 3, 1.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  sparkle(ctx, -8, -8, 1.8);
  sparkle(ctx, 6, -1, 1.3);
}

// ── Ornate golden key with a decorative bow/handle. ───────────────────────
function drawGoldKey(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 13, 3.5);
  ctx.save();
  ctx.rotate(-0.5);
  const gold = ctx.createLinearGradient(0, -18, 0, 18);
  gold.addColorStop(0, "#fff4c0");
  gold.addColorStop(0.5, "#e0a020");
  gold.addColorStop(1, "#8a5a10");
  // Bow / handle — ornate trefoil ring
  ctx.fillStyle = gold;
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -12, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Inner hole
  ctx.fillStyle = "rgba(58,36,6,0.9)";
  ctx.beginPath();
  ctx.arc(0, -12, 3.2, 0, Math.PI * 2);
  ctx.fill();
  // Decorative side lobes on the bow
  ctx.fillStyle = gold;
  [[-7, -12], [7, -12], [0, -20]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Shaft
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.roundRect(-1.8, -5, 3.6, 20, 1.4);
  ctx.fill();
  ctx.stroke();
  // Collar ring on shaft
  ctx.beginPath();
  ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Bit / teeth at the bottom
  ctx.beginPath();
  ctx.moveTo(1.8, 9);
  ctx.lineTo(8, 9);
  ctx.lineTo(8, 12);
  ctx.lineTo(5, 12);
  ctx.lineTo(5, 14.5);
  ctx.lineTo(8, 14.5);
  ctx.lineTo(8, 15);
  ctx.lineTo(1.8, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Specular streak along shaft
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-0.6, -4);
  ctx.lineTo(-0.6, 12);
  ctx.stroke();
  ctx.restore();
  sparkle(ctx, -8, -14, 1.8);
  sparkle(ctx, 7, 10, 1.3);
}

// ── Rolled/unfurled aged treasure map with dotted path and an X. ──────────
function drawMap(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Parchment sheet
  const paper = ctx.createLinearGradient(0, -14, 0, 16);
  paper.addColorStop(0, "#f6e2b0");
  paper.addColorStop(0.5, "#e8c982");
  paper.addColorStop(1, "#cba85e");
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.moveTo(-15, -13);
  ctx.bezierCurveTo(-12, -15, 12, -15, 15, -13);
  ctx.lineTo(15, 13);
  ctx.bezierCurveTo(12, 15, -12, 15, -15, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a6a32";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Aged edge stains
  ctx.fillStyle = "rgba(150,110,50,0.3)";
  ctx.beginPath();
  ctx.ellipse(-13, -8, 3, 5, 0.3, 0, Math.PI * 2);
  ctx.ellipse(12, 9, 3.5, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Curled rolls left & right
  const roll = ctx.createLinearGradient(0, 0, 6, 0);
  roll.addColorStop(0, "#cba85e");
  roll.addColorStop(1, "#a8854a");
  ctx.fillStyle = roll;
  [-15, 13].forEach((rx) => {
    ctx.beginPath();
    ctx.ellipse(rx, 0, 3, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6a32";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });
  // Coastline doodle
  ctx.strokeStyle = "rgba(120,90,40,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, 8);
  ctx.bezierCurveTo(-6, 4, -3, 9, 1, 5);
  ctx.bezierCurveTo(4, 2, 8, 6, 10, 2);
  ctx.stroke();
  // Dotted path leading to X
  ctx.fillStyle = "#7a3a14";
  const path: Array<[number, number]> = [[-9, -7], [-6, -4], [-2, -5], [1, -2], [4, -4], [6, -1]];
  path.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
  // Red X marks the spot
  ctx.strokeStyle = "#c8281a";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(5, -4);
  ctx.lineTo(10, 1);
  ctx.moveTo(10, -4);
  ctx.lineTo(5, 1);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Compass rose top-left
  ctx.strokeStyle = "rgba(120,90,40,0.6)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(-8, -7, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(120,90,40,0.7)";
  ctx.beginPath();
  ctx.moveTo(-8, -11);
  ctx.lineTo(-7, -7);
  ctx.lineTo(-8, -3);
  ctx.lineTo(-9, -7);
  ctx.closePath();
  ctx.fill();
}

// ── Jeweled golden royal crown with red/blue gems and pearls. ─────────────
function drawCrown(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 17, 4);
  const gold = ctx.createLinearGradient(0, -14, 0, 12);
  gold.addColorStop(0, "#fff4c0");
  gold.addColorStop(0.5, "#e0a020");
  gold.addColorStop(1, "#8a5a10");
  ctx.fillStyle = gold;
  // Crown band + five points
  ctx.beginPath();
  ctx.moveTo(-16, 8);
  ctx.lineTo(-16, -2);
  ctx.lineTo(-9, 2);
  ctx.lineTo(-8, -12);
  ctx.lineTo(-3, 1);
  ctx.lineTo(0, -14);
  ctx.lineTo(3, 1);
  ctx.lineTo(8, -12);
  ctx.lineTo(9, 2);
  ctx.lineTo(16, -2);
  ctx.lineTo(16, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Base band
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.rect(-16, 4, 32, 6);
  ctx.fill();
  ctx.stroke();
  // Band highlight
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, 5.5);
  ctx.lineTo(14, 5.5);
  ctx.stroke();
  // Pearls atop each point
  ctx.fillStyle = "#fff8ec";
  [[-8, -13], [0, -15], [8, -13]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#bca878";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(x - 0.6, y - 0.6, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8ec";
  });
  // Gems set in the band — center ruby, side sapphires
  const gem = (x: number, y: number, c0: string, c1: string, c2: string, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
    g.addColorStop(0, c0);
    g.addColorStop(0.6, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(40,10,20,0.7)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  };
  gem(0, 7, "#ff8a8a", "#c8181a", "#5a0408", 3.2);
  gem(-9, 7, "#9cd0f8", "#2a6ac8", "#0a2a68", 2.4);
  gem(9, 7, "#9cd0f8", "#2a6ac8", "#0a2a68", 2.4);
  sparkle(ctx, -3, -10, 1.8);
  sparkle(ctx, 6, -6, 1.4);
}

// ── Gold ring set with a large red gem and side sparkles. ─────────────────
function drawRing(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 13, 3.5);
  const gold = ctx.createLinearGradient(0, -4, 0, 18);
  gold.addColorStop(0, "#fff4c0");
  gold.addColorStop(0.5, "#e0a020");
  gold.addColorStop(1, "#8a5a10");
  // Band — a filled torus (outer ring minus inner hole via even-odd fill)
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(0, 8, 11.2, 0, Math.PI * 2);
  ctx.arc(0, 8, 6.6, 0, Math.PI * 2, true);
  ctx.fill("evenodd");
  // Band outlines
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 8, 11.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 8, 6.6, 0, Math.PI * 2);
  ctx.stroke();
  // Band sheen
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 8, 9.6, Math.PI * 0.7, Math.PI * 1.05);
  ctx.stroke();
  // Setting (prongs)
  ctx.fillStyle = "#8a5a10";
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(6, -2);
  ctx.lineTo(4, -8);
  ctx.lineTo(-4, -8);
  ctx.closePath();
  ctx.fill();
  // Large red gem on top
  const gem = ctx.createRadialGradient(-1.5, -10, 0.5, 0, -8, 7);
  gem.addColorStop(0, "#ffb0b0");
  gem.addColorStop(0.5, "#d8201c");
  gem.addColorStop(1, "#6a0408");
  ctx.fillStyle = gem;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(5.5, -9);
  ctx.lineTo(3, -2);
  ctx.lineTo(-3, -2);
  ctx.lineTo(-5.5, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Gem facets
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5.5, -9);
  ctx.lineTo(5.5, -9);
  ctx.moveTo(0, -14);
  ctx.lineTo(0, -2);
  ctx.stroke();
  // Gem glint
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(-2, -10, 1, 0, Math.PI * 2);
  ctx.fill();
  sparkle(ctx, 7, -8, 1.8);
  sparkle(ctx, -7, -5, 1.3);
}

// ── Golden chalice/goblet with gems and a red drink, shiny. ───────────────
function drawGoblet(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 13, 4);
  const gold = ctx.createLinearGradient(-10, 0, 10, 0);
  gold.addColorStop(0, "#8a5a10");
  gold.addColorStop(0.4, "#fff4c0");
  gold.addColorStop(0.6, "#e0a020");
  gold.addColorStop(1, "#8a5a10");
  // Base
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.ellipse(0, 19, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Stem
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(-2.5, 6);
  ctx.lineTo(2.5, 6);
  ctx.lineTo(3, 16);
  ctx.lineTo(-3, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Stem knob
  ctx.beginPath();
  ctx.arc(0, 11, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cup bowl
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.bezierCurveTo(-11, 4, -6, 8, 0, 8);
  ctx.bezierCurveTo(6, 8, 11, 4, 11, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Red drink at the rim
  const drink = ctx.createLinearGradient(0, -9, 0, -5);
  drink.addColorStop(0, "#ff5a4a");
  drink.addColorStop(1, "#8a0c0c");
  ctx.fillStyle = drink;
  ctx.beginPath();
  ctx.ellipse(0, -8, 10.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a0408";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Drink surface glint
  ctx.fillStyle = "rgba(255,200,180,0.6)";
  ctx.beginPath();
  ctx.ellipse(-3, -8.5, 3, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Gems on the bowl
  const gem = (x: number, y: number) => {
    const g = ctx.createRadialGradient(x - 0.6, y - 0.6, 0.3, x, y, 2.4);
    g.addColorStop(0, "#9cd0f8");
    g.addColorStop(0.6, "#2a6ac8");
    g.addColorStop(1, "#0a2a68");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - 2.4);
    ctx.lineTo(x + 2.4, y);
    ctx.lineTo(x, y + 2.4);
    ctx.lineTo(x - 2.4, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(10,20,50,0.7)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  };
  gem(0, -1);
  gem(-6, -3);
  gem(6, -3);
  // Bowl specular streak
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, -3, 1.6, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  sparkle(ctx, 8, -7, 1.6);
  sparkle(ctx, -9, 0, 1.2);
}

// ── Stacked shiny gold ingots/bars. ───────────────────────────────────────
function drawGoldBars(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Draw one trapezoid bar (3/4 view) at offset.
  const bar = (ox: number, oy: number) => {
    // Top face
    const top = ctx.createLinearGradient(0, oy - 6, 0, oy - 1);
    top.addColorStop(0, "#fff4c0");
    top.addColorStop(1, "#e0a020");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(ox - 11, oy - 1);
    ctx.lineTo(ox - 8, oy - 6);
    ctx.lineTo(ox + 12, oy - 6);
    ctx.lineTo(ox + 9, oy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e3c06";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // Front face
    const front = ctx.createLinearGradient(0, oy - 1, 0, oy + 8);
    front.addColorStop(0, "#f4c430");
    front.addColorStop(0.5, "#d09014");
    front.addColorStop(1, "#8a5a0c");
    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(ox - 11, oy - 1);
    ctx.lineTo(ox + 9, oy - 1);
    ctx.lineTo(ox + 8, oy + 7);
    ctx.lineTo(ox - 10, oy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right face
    const side = ctx.createLinearGradient(ox + 8, 0, ox + 13, 0);
    side.addColorStop(0, "#c8860c");
    side.addColorStop(1, "#8a5a0c");
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(ox + 9, oy - 1);
    ctx.lineTo(ox + 12, oy - 6);
    ctx.lineTo(ox + 11, oy + 2);
    ctx.lineTo(ox + 8, oy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Stamp mark on front
    ctx.strokeStyle = "rgba(94,60,6,0.7)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.rect(ox - 5, oy + 1, 9, 4);
    ctx.stroke();
    // Top sheen
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(ox - 2, oy - 3.5, 4, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  // Bottom two bars
  bar(-7, 16);
  bar(8, 16);
  // Top bar centered
  bar(0, 6);
  sparkle(ctx, -6, 1, 1.8);
  sparkle(ctx, 9, 3, 1.3);
}

// ── A small heap of assorted cut gems (red, blue, green, purple). ─────────
function drawGemPile(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 17, 4);
  // Faceted gem helper.
  const gem = (
    x: number, y: number, r: number, rot: number,
    c0: string, c1: string, c2: string, outline: string,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, c0);
    g.addColorStop(0.5, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r);
    ctx.lineTo(r * 0.5, -r);
    ctx.lineTo(r, -r * 0.2);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    // facet lines
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.2);
    ctx.lineTo(r, -r * 0.2);
    ctx.moveTo(-r * 0.5, -r);
    ctx.lineTo(0, r);
    ctx.moveTo(r * 0.5, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    // glint
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.4, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  // Back row
  gem(-8, 6, 6, -0.2, "#b0f0c0", "#28b050", "#0a4a20", "#063015");
  gem(9, 7, 6, 0.25, "#c8b0f8", "#7a3ad0", "#3a0c78", "#26064a");
  // Front row
  gem(-3, 11, 6.5, 0.1, "#ffb0b0", "#d8201c", "#6a0408", "#3a0408");
  gem(6, 12, 6, -0.18, "#9cd0f8", "#2a6ac8", "#0a2a68", "#06183f");
  // Top small gem
  gem(1, 2, 5, 0.05, "#fff0a0", "#f0b81c", "#8a5a0c", "#5e3c06");
  sparkle(ctx, -10, 2, 1.8);
  sparkle(ctx, 11, 3, 1.4);
  sparkle(ctx, 2, 14, 1.2);
}

export const ICONS = {
  treasure_chest_closed: { label: "Treasure Chest (Closed)", color: "#7a4a1c", draw: drawChestClosed },
  treasure_chest_open:   { label: "Treasure Chest (Open)",   color: "#f0b81c", draw: drawChestOpen },
  treasure_coin_stack:   { label: "Coin Stack",              color: "#f0c430", draw: drawCoinStack },
  treasure_gold_key:     { label: "Gold Key",                color: "#e0a020", draw: drawGoldKey },
  treasure_map:          { label: "Treasure Map",            color: "#e8c982", draw: drawMap },
  treasure_crown:        { label: "Crown",                   color: "#e0a020", draw: drawCrown },
  treasure_ring:         { label: "Ring",                    color: "#d8201c", draw: drawRing },
  treasure_goblet:       { label: "Goblet",                  color: "#e0a020", draw: drawGoblet },
  treasure_gold_bars:    { label: "Gold Bars",               color: "#f4c430", draw: drawGoldBars },
  treasure_gem_pile:     { label: "Gem Pile",                color: "#7a3ad0", draw: drawGemPile },
};
