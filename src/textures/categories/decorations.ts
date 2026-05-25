// Decoration buildings — repeatable village ornaments.

function drawShadow(ctx: CanvasRenderingContext2D, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawVioletBed(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Wooden bed border
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.moveTo(-22, 12);
  ctx.bezierCurveTo(-22, 22, 22, 22, 22, 12);
  ctx.lineTo(20, 8);
  ctx.lineTo(-20, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Plank stripes
  ctx.strokeStyle = "rgba(58,28,8,0.5)";
  ctx.lineWidth = 0.8;
  for (let i = -16; i <= 16; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 8); ctx.lineTo(i, 18);
    ctx.stroke();
  }
  // Soil
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Stems
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  [-12, -6, 0, 6, 12, -9, 9, -3, 3].forEach((x, i) => {
    const top = -10 - (i % 3) * 4;
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.bezierCurveTo(x + 2, top + 6, x - 2, top + 2, x, top);
    ctx.stroke();
  });
  // Leaves
  ctx.fillStyle = "#5a8028";
  [[-9, -4], [6, -4], [-3, -10], [9, -10]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 1.4, x < 0 ? -0.4 : 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Violet flowers — five-petal, deep purple with yellow center
  const flowers = [[-12, -16], [-6, -20], [0, -16], [6, -20], [12, -16], [-9, -12], [9, -12], [-3, -22], [3, -22]];
  flowers.forEach(([cx, cy]) => {
    ctx.fillStyle = "#7a3aa8";
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 1.8, cy + Math.sin(a) * 1.8, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#a058c0";
    ctx.beginPath();
    ctx.arc(cx, cy, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff080";
    ctx.beginPath();
    ctx.arc(cx, cy, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawStoneLantern(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Base
  ctx.fillStyle = "#7a8490";
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.lineTo(-12, 14);
  ctx.lineTo(12, 14);
  ctx.lineTo(14, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4348";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Pillar
  ctx.fillStyle = "#9da3a8";
  ctx.beginPath();
  ctx.rect(-4, 0, 8, 14);
  ctx.fill();
  ctx.strokeStyle = "#3a4348";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(58,67,72,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-4, 4); ctx.lineTo(4, 4);
  ctx.moveTo(-4, 8); ctx.lineTo(4, 8);
  ctx.stroke();
  // Lantern body (cube with windows)
  ctx.fillStyle = "#bbc1c6";
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(-8, -2);
  ctx.lineTo(8, -2);
  ctx.lineTo(10, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4348";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Glowing window
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.rect(-5, -7, 10, 5);
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Window cross-bar
  ctx.strokeStyle = "#5a3a08";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(0, -2);
  ctx.moveTo(-5, -4.5); ctx.lineTo(5, -4.5);
  ctx.stroke();
  // Halo
  ctx.fillStyle = "rgba(255,200,80,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, -4, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Roof (tiered Asian-style)
  ctx.fillStyle = "#5a4a3a";
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(-12, -14);
  ctx.lineTo(12, -14);
  ctx.lineTo(14, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Roof second tier
  ctx.fillStyle = "#7a8490";
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-6, -22);
  ctx.lineTo(6, -22);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4348";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Top spike
  ctx.fillStyle = "#5a4a3a";
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.lineTo(0, -28);
  ctx.lineTo(2, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Moss patches
  ctx.fillStyle = "#5a8028";
  ctx.beginPath();
  ctx.ellipse(-12, 18, 2, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -10, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawAppleSapling(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Pot
  ctx.fillStyle = "#a85838";
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.lineTo(-10, 8);
  ctx.lineTo(10, 8);
  ctx.lineTo(12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Pot rim
  ctx.fillStyle = "#7a3014";
  ctx.beginPath();
  ctx.rect(-12, 6, 24, 4);
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Soil
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(0, 7, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Trunk
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(2, -2, -2, -10, 0, -16);
  ctx.stroke();
  // Branches
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.bezierCurveTo(-4, -8, -8, -10, -10, -16);
  ctx.moveTo(0, -8); ctx.bezierCurveTo(4, -8, 8, -10, 10, -16);
  ctx.stroke();
  // Foliage
  ctx.fillStyle = "#3a6018";
  [[-8, -16, 6], [8, -16, 6], [0, -22, 8], [-4, -14, 4], [4, -14, 4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = "#1a2a04";
  ctx.lineWidth = 0.8;
  [[-8, -16, 6], [8, -16, 6], [0, -22, 8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Foliage highlight
  ctx.fillStyle = "rgba(120,180,80,0.6)";
  [[0, -24, 3], [-6, -18, 2.4], [6, -18, 2.4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Apples (3)
  ctx.fillStyle = "#d4543a";
  [[-6, -14], [4, -22], [8, -14]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a1808";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,200,160,0.7)";
    ctx.beginPath();
    ctx.arc(x - 0.4, y - 0.4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4543a";
  });
  // Pot crack hint
  ctx.strokeStyle = "rgba(40,16,4,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-6, 12); ctx.lineTo(-4, 18);
  ctx.stroke();
}

// ── Harbor-themed decorations ────────────────────────────────────────────

function drawDriftwoodArch(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Stone base on both feet
  ctx.fillStyle = "#8a8478";
  ctx.beginPath();
  rrLocal(ctx, -22, 14, 12, 10, 2);
  ctx.fill();
  ctx.beginPath();
  rrLocal(ctx, 10, 14, 12, 10, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  rrLocal(ctx, -22, 14, 12, 10, 2);
  ctx.stroke();
  ctx.beginPath();
  rrLocal(ctx, 10, 14, 12, 10, 2);
  ctx.stroke();
  // Mortar lines on base
  ctx.strokeStyle = "rgba(58,56,48,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-22, 19); ctx.lineTo(-10, 19);
  ctx.moveTo(-16, 14); ctx.lineTo(-16, 24);
  ctx.moveTo(10, 19); ctx.lineTo(22, 19);
  ctx.moveTo(16, 14); ctx.lineTo(16, 24);
  ctx.stroke();
  // Driftwood arch — salt-bleached, twisted timbers (one continuous arc shape)
  const archGrad = ctx.createLinearGradient(0, -22, 0, 14);
  archGrad.addColorStop(0, "#d4c8a8");
  archGrad.addColorStop(0.5, "#9e8a68");
  archGrad.addColorStop(1, "#5a4830");
  ctx.fillStyle = archGrad;
  ctx.beginPath();
  ctx.moveTo(-16, 14);
  ctx.bezierCurveTo(-26, 0, -22, -22, 0, -24);
  ctx.bezierCurveTo(22, -22, 26, 0, 16, 14);
  ctx.lineTo(10, 14);
  ctx.bezierCurveTo(18, 2, 14, -16, 0, -18);
  ctx.bezierCurveTo(-14, -16, -18, 2, -10, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2a18";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Wood grain knots
  ctx.fillStyle = "rgba(58,42,24,0.6)";
  [[-12, -8, 1], [10, -10, 0.9], [-2, -20, 0.7], [16, 2, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Highlight along top edge
  ctx.strokeStyle = "rgba(255,240,200,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-18, -8);
  ctx.bezierCurveTo(-14, -22, 14, -22, 18, -8);
  ctx.stroke();
  // Kelp drape — green ribbon dangling from arch crest
  ctx.fillStyle = "#3a6028";
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.bezierCurveTo(-6, -10, -8, -2, -6, 6);
  ctx.bezierCurveTo(-4, 8, -2, 8, 0, 6);
  ctx.bezierCurveTo(-2, -2, -2, -10, 0, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a2a04";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Kelp leaflets
  ctx.fillStyle = "#5a8030";
  [[-7, -8, 1.4, 0.8], [-7, 0, 1.6, 0.8], [-6, 4, 1.2, 0.7]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // A small starfish at the foot for harbor flavour
  ctx.fillStyle = "#d47830";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 2.4 : 1;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(8 + Math.cos(a) * r, 22 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a3408";
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function drawPearlFountain(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Lower basin — wide stone bowl
  ctx.fillStyle = "#a8a89c";
  ctx.beginPath();
  ctx.moveTo(-22, 14);
  ctx.lineTo(-18, 22);
  ctx.lineTo(18, 22);
  ctx.lineTo(22, 14);
  ctx.bezierCurveTo(16, 18, -16, 18, -22, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Basin water (pearly cyan)
  ctx.fillStyle = "#a8d8e0";
  ctx.beginPath();
  ctx.ellipse(0, 14, 20, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a7a88";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Basin water highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-8, 13, 6, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Middle pillar
  ctx.fillStyle = "#9da3a0";
  ctx.beginPath();
  rrLocal(ctx, -5, 0, 10, 14, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Pillar carved ring
  ctx.strokeStyle = "rgba(58,56,48,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-5, 5); ctx.lineTo(5, 5);
  ctx.moveTo(-5, 9); ctx.lineTo(5, 9);
  ctx.stroke();
  // Upper basin / scallop dish
  ctx.fillStyle = "#bbc1bc";
  ctx.beginPath();
  ctx.ellipse(0, -2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Pearl at top — large iridescent sphere
  const pearlGrad = ctx.createRadialGradient(-2, -10, 1, 0, -8, 8);
  pearlGrad.addColorStop(0, "#ffffff");
  pearlGrad.addColorStop(0.5, "#d8e8e8");
  pearlGrad.addColorStop(1, "#7aa0a0");
  ctx.fillStyle = pearlGrad;
  ctx.beginPath();
  ctx.arc(0, -10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a5a5a";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Pearl highlight
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(-2, -12, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Falling water — cascading arcs from pearl down
  ctx.strokeStyle = "#a8d8e0";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.bezierCurveTo(-8, -4, -10, 0, -8, 4);
  ctx.moveTo(4, -8);
  ctx.bezierCurveTo(8, -4, 10, 0, 8, 4);
  ctx.stroke();
  // Splash droplets at basin
  ctx.fillStyle = "#cce8f0";
  [[-9, 5, 1.4], [9, 5, 1.4], [-12, 12, 1.2], [11, 12, 1.2], [0, 16, 1.0]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFishingDock(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Water beneath dock
  ctx.fillStyle = "#3a5878";
  ctx.beginPath();
  ctx.rect(-26, 16, 52, 12);
  ctx.fill();
  // Water ripples
  ctx.strokeStyle = "rgba(168,200,224,0.7)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-22, 22); ctx.quadraticCurveTo(-14, 20, -6, 22);
  ctx.quadraticCurveTo(2, 24, 10, 22); ctx.quadraticCurveTo(18, 20, 24, 22);
  ctx.moveTo(-20, 26); ctx.quadraticCurveTo(-10, 24, 0, 26);
  ctx.quadraticCurveTo(10, 28, 22, 26);
  ctx.stroke();
  // Pilings — three weathered posts going down into water
  [-16, 0, 14].forEach((x) => {
    ctx.fillStyle = "#5a3a14";
    rrLocal(ctx, x - 3, 4, 6, 24, 1);
    ctx.fill();
    ctx.strokeStyle = "#1a0e04";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    rrLocal(ctx, x - 3, 4, 6, 24, 1);
    ctx.stroke();
    // Plank grain
    ctx.strokeStyle = "rgba(40,16,4,0.6)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 1, 8); ctx.lineTo(x - 1, 24);
    ctx.moveTo(x + 1, 6); ctx.lineTo(x + 1, 22);
    ctx.stroke();
  });
  // Deck planks across the top
  ctx.fillStyle = "#8a5a28";
  rrLocal(ctx, -24, -2, 48, 8, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  rrLocal(ctx, -24, -2, 48, 8, 1);
  ctx.stroke();
  // Plank gaps
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 0.8;
  [-12, 0, 12].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -2); ctx.lineTo(x, 6);
    ctx.stroke();
  });
  // Lantern post — top-left
  ctx.fillStyle = "#5a3a14";
  ctx.beginPath();
  ctx.rect(-22, -22, 3, 22);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Lantern hanging
  ctx.fillStyle = "#3a3038";
  rrLocal(ctx, -25, -22, 9, 8, 1);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Lantern glass
  ctx.fillStyle = "#ffe080";
  ctx.fillRect(-24, -21, 7, 6);
  // Lantern glow halo
  ctx.fillStyle = "rgba(255,220,120,0.35)";
  ctx.beginPath();
  ctx.arc(-20.5, -18, 10, 0, Math.PI * 2);
  ctx.fill();
  // Rope coil on the deck
  ctx.strokeStyle = "#a88040";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(14, 0, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(14, 0, 1.6, 0, Math.PI * 2);
  ctx.stroke();
  // Tiny fish leaping in foreground
  ctx.fillStyle = "#b0c4d4";
  ctx.beginPath();
  ctx.moveTo(20, 14);
  ctx.bezierCurveTo(24, 12, 26, 14, 25, 16);
  ctx.lineTo(28, 18);
  ctx.lineTo(26, 16);
  ctx.bezierCurveTo(25, 17, 22, 17, 20, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a3848";
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

// ── Mine-themed decorations ──────────────────────────────────────────────

function drawCobbleWell(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Stone wellhead — drum of mortared cobbles
  ctx.fillStyle = "#8a8478";
  ctx.beginPath();
  ctx.moveTo(-16, 22);
  ctx.lineTo(-14, 4);
  ctx.lineTo(14, 4);
  ctx.lineTo(16, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3830";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Individual cobbles — irregular grid of small rounded stones
  const cobbles = [
    [-12, 6, 3.5], [-6, 7, 3.6], [0, 6, 3.4], [6, 7, 3.5], [12, 6, 3.5],
    [-13, 12, 3.4], [-7, 13, 3.6], [0, 12, 3.5], [7, 13, 3.5], [13, 12, 3.4],
    [-12, 18, 3.4], [-6, 19, 3.6], [0, 18, 3.5], [6, 19, 3.5], [12, 18, 3.4],
  ];
  cobbles.forEach(([x, y, r]) => {
    const grd = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.5, x, y, r);
    grd.addColorStop(0, "#bdb8a8");
    grd.addColorStop(0.6, "#8a8478");
    grd.addColorStop(1, "#5a5448");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a3830";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });
  // Dark mouth of well — circular hole inside drum
  ctx.fillStyle = "#1a1610";
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Water glimmer
  ctx.fillStyle = "rgba(80,140,170,0.7)";
  ctx.beginPath();
  ctx.ellipse(0, 5, 10, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-3, 5, 3, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Posts holding roof — two timber uprights at the cobble rim
  ctx.fillStyle = "#5a3a14";
  rrLocal(ctx, -15, -14, 3, 20, 1);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#5a3a14";
  rrLocal(ctx, 12, -14, 3, 20, 1);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Crossbar with winch
  ctx.fillStyle = "#7a5028";
  rrLocal(ctx, -14, -16, 28, 4, 1);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Winch handle
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(14, -14); ctx.lineTo(18, -11);
  ctx.stroke();
  // Roof — peaked shingles
  ctx.fillStyle = "#7a3014";
  ctx.beginPath();
  ctx.moveTo(-18, -16);
  ctx.lineTo(0, -28);
  ctx.lineTo(18, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1004";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Shingle rows
  ctx.strokeStyle = "rgba(58,16,4,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-12, -20); ctx.lineTo(12, -20);
  ctx.moveTo(-6, -24); ctx.lineTo(6, -24);
  ctx.stroke();
  // Bucket on rope — hanging just below the crossbar
  ctx.strokeStyle = "#a88040";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, -4);
  ctx.stroke();
  ctx.fillStyle = "#a85838";
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.lineTo(-3, 2);
  ctx.lineTo(3, 2);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1804";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Bucket band
  ctx.strokeStyle = "#5a3014";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3.5, -2); ctx.lineTo(3.5, -2);
  ctx.stroke();
}

function drawSmelterBrazier(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  // Iron base — three-legged stand
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, 8); ctx.lineTo(-14, 22);
  ctx.moveTo(10, 8); ctx.lineTo(14, 22);
  ctx.moveTo(0, 8); ctx.lineTo(0, 22);
  ctx.stroke();
  // Crossbrace at feet
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-14, 22); ctx.lineTo(14, 22);
  ctx.stroke();
  // Brazier bowl — wrought-iron half-sphere
  const bowlGrad = ctx.createLinearGradient(0, -2, 0, 14);
  bowlGrad.addColorStop(0, "#5a4c44");
  bowlGrad.addColorStop(0.5, "#2a2420");
  bowlGrad.addColorStop(1, "#0a0804");
  ctx.fillStyle = bowlGrad;
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.bezierCurveTo(-18, 12, 18, 12, 18, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Bowl rim highlight
  ctx.fillStyle = "#7a6048";
  ctx.beginPath();
  ctx.ellipse(0, -2, 18, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Rivets around rim
  ctx.fillStyle = "#1a1408";
  for (let a = 0; a < 6; a++) {
    const x = Math.cos((a / 6) * Math.PI + Math.PI) * 16;
    ctx.beginPath();
    ctx.arc(x, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glowing coals inside bowl
  ctx.fillStyle = "#7a1808";
  ctx.beginPath();
  ctx.ellipse(0, -1, 16, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d44818";
  ctx.beginPath();
  ctx.ellipse(0, -1, 14, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8a020";
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.ellipse(0, -2, 4, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Individual chunks of coal/ember
  ctx.fillStyle = "#3a1a08";
  [[-8, -2, 2.4], [-2, -1, 2], [5, -2, 2.2], [10, -1, 1.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#d8401c";
  [[-7, -2.4, 1.4], [-1, -1.6, 1.2], [4, -2.4, 1.4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Flame leaping out — radial heat halo first, then flame shape
  const halo = ctx.createRadialGradient(0, -8, 4, 0, -8, 22);
  halo.addColorStop(0, "rgba(255,160,40,0.6)");
  halo.addColorStop(1, "rgba(255,160,40,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, -8, 22, 0, Math.PI * 2);
  ctx.fill();
  // Main flame
  const flameGrad = ctx.createLinearGradient(0, -22, 0, -2);
  flameGrad.addColorStop(0, "#fffae0");
  flameGrad.addColorStop(0.4, "#f8b020");
  flameGrad.addColorStop(0.8, "#d44818");
  flameGrad.addColorStop(1, "#7a1808");
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.bezierCurveTo(-12, -10, -2, -16, 0, -22);
  ctx.bezierCurveTo(2, -16, 12, -10, 8, -2);
  ctx.bezierCurveTo(2, -4, -2, -4, -8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(120,30,8,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // White-hot heart
  ctx.fillStyle = "rgba(255,250,200,0.85)";
  ctx.beginPath();
  ctx.ellipse(0, -10, 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Floating embers above
  ctx.fillStyle = "#fff080";
  [[-6, -18, 1], [4, -22, 0.9], [-2, -26, 0.7], [8, -16, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Local rounded-rect helper (copied — codebase convention is per-file `rr`)
function rrLocal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const ICONS = {
  decor_violet_bed:       { label:"Violet Bed",       color:"#7a3aa8", draw:drawVioletBed },
  decor_stone_lantern:    { label:"Stone Lantern",    color:"#7a8490", draw:drawStoneLantern },
  decor_apple_sapling:    { label:"Apple Sapling",    color:"#3a6018", draw:drawAppleSapling },
  decor_driftwood_arch:   { label:"Driftwood Arch",   color:"#9e8a68", draw:drawDriftwoodArch },
  decor_pearl_fountain:   { label:"Pearl Fountain",   color:"#a8d8e0", draw:drawPearlFountain },
  decor_fishing_dock:     { label:"Fishing Dock",     color:"#8a5a28", draw:drawFishingDock },
  decor_cobble_well:      { label:"Cobble Well",      color:"#8a8478", draw:drawCobbleWell },
  decor_smelter_brazier:  { label:"Smelter Brazier",  color:"#d44818", draw:drawSmelterBrazier },
};
