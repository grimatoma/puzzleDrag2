// Insects, pollinators & garden critters.

function shadow(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath(); ctx.ellipse(0, 22, w, 4, 0, 0, Math.PI * 2); ctx.fill();
}

function drawBee(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  ctx.save();
  ctx.rotate(0.12);
  // Wings — translucent, behind the body
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(-2, -6);
    ctx.scale(side, 1);
    const wing = ctx.createLinearGradient(0, -8, 10, 0);
    wing.addColorStop(0, "rgba(230,245,255,0.7)");
    wing.addColorStop(1, "rgba(180,210,235,0.4)");
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(4, -12, 16, -14, 18, -6);
    ctx.bezierCurveTo(18, -1, 8, 2, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,150,180,0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Wing vein
    ctx.strokeStyle = "rgba(120,150,180,0.4)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.quadraticCurveTo(10, -8, 16, -6);
    ctx.stroke();
    ctx.restore();
  });
  // Body — fuzzy oval
  const body = ctx.createRadialGradient(-4, -2, 2, 0, 4, 16);
  body.addColorStop(0, "#ffe082");
  body.addColorStop(0.6, "#f5b400");
  body.addColorStop(1, "#a06a00");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2606";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Black stripes (clipped to body)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 10, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#2a1c04";
  [-2, 6].forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, 4, 2.6, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Fuzz tufts along the back
  ctx.strokeStyle = "rgba(255,240,180,0.6)";
  ctx.lineWidth = 0.8;
  for (let i = -10; i <= 10; i += 2) {
    ctx.beginPath();
    ctx.moveTo(i, -5);
    ctx.lineTo(i + 0.5, -7.5);
    ctx.stroke();
  }
  // Stinger tail
  ctx.fillStyle = "#2a1c04";
  ctx.beginPath();
  ctx.moveTo(12, 4);
  ctx.lineTo(17, 4);
  ctx.lineTo(12, 7);
  ctx.closePath();
  ctx.fill();
  // Head
  ctx.fillStyle = "#2a1c04";
  ctx.beginPath();
  ctx.arc(-12, 1, 5, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-13, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-13.4, 0.3, 0.9, 0, Math.PI * 2);
  ctx.fill();
  // Antennae
  ctx.strokeStyle = "#2a1c04";
  ctx.lineWidth = 1.2;
  [-1.4, -3].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(-15, -2);
    ctx.quadraticCurveTo(-19, -7 + d, -20, -8 + d);
    ctx.stroke();
  });
  ctx.fillStyle = "#2a1c04";
  [[-20, -16], [-21, -11]].forEach(([ax, ay]) => {
    ctx.beginPath();
    ctx.arc(ax, ay, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawButterfly(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Symmetric wings
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.scale(side, 1);
    // Upper wing
    const upper = ctx.createRadialGradient(8, -6, 2, 12, -4, 18);
    upper.addColorStop(0, "rgba(255,150,60,0.85)");
    upper.addColorStop(0.6, "rgba(230,90,30,0.7)");
    upper.addColorStop(1, "rgba(140,40,10,0.55)");
    ctx.fillStyle = upper;
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.bezierCurveTo(8, -22, 24, -20, 22, -6);
    ctx.bezierCurveTo(20, 0, 8, 2, 2, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a1808";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Lower wing
    const lower = ctx.createRadialGradient(8, 8, 2, 10, 10, 14);
    lower.addColorStop(0, "rgba(255,200,90,0.85)");
    lower.addColorStop(0.7, "rgba(220,120,40,0.7)");
    lower.addColorStop(1, "rgba(120,50,10,0.55)");
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.bezierCurveTo(8, 18, 20, 18, 18, 8);
    ctx.bezierCurveTo(14, 2, 6, 0, 2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a1808";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Wing pattern — spots
    ctx.fillStyle = "rgba(40,18,8,0.75)";
    ctx.beginPath(); ctx.arc(14, -8, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 9, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,250,220,0.85)";
    ctx.beginPath(); ctx.arc(14, -8, 1, 0, Math.PI * 2); ctx.fill();
    // Wing edge highlight
    ctx.strokeStyle = "rgba(255,240,200,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, -16);
    ctx.quadraticCurveTo(18, -16, 20, -8);
    ctx.stroke();
    ctx.restore();
  });
  // Body — slim segmented
  const body = ctx.createLinearGradient(0, -10, 0, 14);
  body.addColorStop(0, "#5a4628");
  body.addColorStop(1, "#1c1408");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 2, 2.4, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Segments
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 0.7;
  for (let y = -6; y <= 10; y += 3) {
    ctx.beginPath();
    ctx.moveTo(-2, y);
    ctx.lineTo(2, y);
    ctx.stroke();
  }
  // Head
  ctx.fillStyle = "#1c1408";
  ctx.beginPath();
  ctx.arc(0, -11, 2.6, 0, Math.PI * 2);
  ctx.fill();
  // Antennae
  ctx.strokeStyle = "#1c1408";
  ctx.lineWidth = 1.1;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 1, -12);
    ctx.quadraticCurveTo(side * 6, -20, side * 8, -22);
    ctx.stroke();
    ctx.fillStyle = "#1c1408";
    ctx.beginPath();
    ctx.arc(side * 8, -22, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawLadybug(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Head
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(0, -8, 6, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#fff8e0";
  [-2.4, 2.4].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, -10, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#0a0e04";
  [-2.4, 2.4].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, -10, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  // Legs
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  [[-13, 0], [-14, 8], [13, 0], [14, 8]].forEach(([lx, ly]) => {
    ctx.beginPath();
    ctx.moveTo(lx < 0 ? -10 : 10, ly - 2);
    ctx.lineTo(lx, ly);
    ctx.stroke();
  });
  // Domed red shell
  const shell = ctx.createRadialGradient(-4, -2, 2, 0, 4, 18);
  shell.addColorStop(0, "#ff6a5a");
  shell.addColorStop(0.6, "#d81818");
  shell.addColorStop(1, "#7a0808");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.arc(0, 4, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Center seam
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(0, 18);
  ctx.stroke();
  // Spots (clipped to shell)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 4, 14, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#1a0808";
  [[-7, -1, 3], [7, -1, 3], [-6, 9, 2.6], [6, 9, 2.6], [0, 14, 2.4]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Glossy highlight
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, -2, 3, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnail(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Body / foot
  const foot = ctx.createLinearGradient(0, 6, 0, 18);
  foot.addColorStop(0, "#f0d8a8");
  foot.addColorStop(1, "#b89060");
  ctx.fillStyle = foot;
  ctx.beginPath();
  ctx.moveTo(-20, 16);
  ctx.bezierCurveTo(-22, 8, -16, 4, -10, 6);
  ctx.bezierCurveTo(-2, 8, 10, 10, 18, 10);
  ctx.bezierCurveTo(22, 12, 22, 16, 16, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Head poking forward
  ctx.fillStyle = "#f0d8a8";
  ctx.beginPath();
  ctx.ellipse(-18, 9, 6, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Eye stalks
  ctx.strokeStyle = "#c8a878";
  ctx.lineWidth = 2;
  [[-20, -2], [-16, -4]].forEach(([tx, ty]) => {
    ctx.beginPath();
    ctx.moveTo(-18, 6);
    ctx.quadraticCurveTo(tx + 1, ty + 5, tx, ty);
    ctx.stroke();
  });
  [[-20, -2], [-16, -4]].forEach(([tx, ty]) => {
    ctx.fillStyle = "#2a1808";
    ctx.beginPath();
    ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8e0";
    ctx.beginPath();
    ctx.arc(tx - 0.5, ty - 0.5, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  // Spiral shell
  const shell = ctx.createRadialGradient(4, -2, 2, 4, 0, 16);
  shell.addColorStop(0, "#e8a85a");
  shell.addColorStop(0.6, "#a86828");
  shell.addColorStop(1, "#5a3410");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.arc(4, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Spiral swirl
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let first = true;
  for (let a = 0; a <= Math.PI * 4; a += 0.2) {
    const r = 1.5 + a * 1.7;
    const sx = 4 + Math.cos(a) * r;
    const sy = 0 + Math.sin(a) * r;
    if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  // Shell highlight
  ctx.fillStyle = "rgba(255,240,200,0.5)";
  ctx.beginPath();
  ctx.ellipse(-1, -6, 3, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawDragonfly(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  ctx.save();
  ctx.rotate(-0.15);
  // Four narrow translucent wings
  const wingDefs: Array<[number, number, number]> = [
    [-1, -2, 0.1],   // upper-left
    [1, -2, 0.1],    // upper-right
    [-1, 2, -0.1],   // lower-left
    [1, 2, -0.1],    // lower-right
  ];
  wingDefs.forEach(([side, oy, tilt]) => {
    ctx.save();
    ctx.translate(0, oy);
    ctx.scale(side, 1);
    ctx.rotate(tilt);
    const wing = ctx.createLinearGradient(0, 0, 22, 0);
    wing.addColorStop(0, "rgba(200,240,255,0.6)");
    wing.addColorStop(1, "rgba(150,220,235,0.35)");
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(8, -4, 20, -3, 23, -1);
    ctx.bezierCurveTo(20, 1, 8, 2, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(90,160,180,0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Vein
    ctx.strokeStyle = "rgba(90,160,180,0.4)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(20, -1);
    ctx.stroke();
    ctx.restore();
  });
  // Long slender body
  const body = ctx.createLinearGradient(-10, 0, 16, 0);
  body.addColorStop(0, "#3aa8c8");
  body.addColorStop(0.5, "#1a7a98");
  body.addColorStop(1, "#0a3a4a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(4, 0, 16, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#062430";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Body segments
  ctx.strokeStyle = "rgba(6,36,48,0.7)";
  ctx.lineWidth = 0.7;
  for (let x = -6; x <= 16; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, -2.5);
    ctx.lineTo(x, 2.5);
    ctx.stroke();
  }
  // Iridescent highlight
  ctx.strokeStyle = "rgba(200,255,255,0.5)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-6, -1.5);
  ctx.lineTo(16, -1.5);
  ctx.stroke();
  // Head & big eyes
  ctx.fillStyle = "#1a7a98";
  ctx.beginPath();
  ctx.arc(-12, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2ad0e8";
  [[-13, -2], [-13, 2]].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#0a3a4a";
  [[-13, -2], [-13, 2]].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex - 0.6, ey, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawFirefly(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 10);
  // Glow around abdomen
  const glow = ctx.createRadialGradient(8, 6, 1, 8, 6, 18);
  glow.addColorStop(0, "rgba(220,255,140,0.85)");
  glow.addColorStop(0.4, "rgba(180,240,90,0.45)");
  glow.addColorStop(1, "rgba(160,230,60,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(8, 6, 18, 0, Math.PI * 2);
  ctx.fill();
  // Translucent wings
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(-2, -2);
    ctx.scale(1, side);
    const wing = ctx.createLinearGradient(0, 0, 10, 6);
    wing.addColorStop(0, "rgba(230,235,210,0.5)");
    wing.addColorStop(1, "rgba(180,190,160,0.3)");
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(6, 2, 12, 8, 10, 12);
    ctx.bezierCurveTo(6, 10, 2, 6, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,130,100,0.5)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
  });
  // Glowing abdomen
  const ab = ctx.createRadialGradient(7, 5, 1, 8, 6, 8);
  ab.addColorStop(0, "#f4ffb0");
  ab.addColorStop(0.6, "#c8f060");
  ab.addColorStop(1, "#8ac828");
  ctx.fillStyle = ab;
  ctx.beginPath();
  ctx.ellipse(9, 6, 8, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6a9818";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Thorax
  const thorax = ctx.createRadialGradient(-4, -2, 1, -3, 0, 8);
  thorax.addColorStop(0, "#5a4628");
  thorax.addColorStop(1, "#2a1c08");
  ctx.fillStyle = thorax;
  ctx.beginPath();
  ctx.ellipse(-3, 0, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Head
  ctx.fillStyle = "#1a1004";
  ctx.beginPath();
  ctx.arc(-11, -1, 4, 0, Math.PI * 2);
  ctx.fill();
  // Red pronotum spot
  ctx.fillStyle = "#d83a18";
  ctx.beginPath();
  ctx.arc(-8, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-12, -2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-12.3, -1.8, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Antennae
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1;
  [-3, -5].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.quadraticCurveTo(-18, d, -20, d - 1);
    ctx.stroke();
  });
}

function drawAnt(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  ctx.save();
  ctx.rotate(0.05);
  // Six legs
  ctx.strokeStyle = "#2a1008";
  ctx.lineWidth = 1.6;
  const legs: Array<[number, number, number, number]> = [
    [-2, 2, -10, 12], [-2, 2, -8, 14],
    [2, 2, 2, 14], [2, 2, 6, 13],
    [4, 2, 12, 12], [4, 2, 14, 14],
  ];
  legs.forEach(([x1, y1, x2, y2]) => {
    const mx = (x1 + x2) / 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, y1 - 3, x2, y2);
    ctx.stroke();
  });
  // Abdomen (rear) — large
  const ab = ctx.createRadialGradient(10, 0, 1, 11, 2, 11);
  ab.addColorStop(0, "#8a3018");
  ab.addColorStop(0.6, "#5a1808");
  ab.addColorStop(1, "#2a0804");
  ctx.fillStyle = ab;
  ctx.beginPath();
  ctx.ellipse(11, 2, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Thorax (middle)
  ctx.fillStyle = "#3a1808";
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Head (front)
  ctx.fillStyle = "#2a1008";
  ctx.beginPath();
  ctx.arc(-10, -1, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-12, -2, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-12.4, -1.7, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Mandibles
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.4;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(-15, -1);
    ctx.quadraticCurveTo(-18, -1 + side * 2, -17, -1 + side * 4);
    ctx.stroke();
  });
  // Antennae — bent
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.2;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-16, -9 + side * 2);
    ctx.lineTo(-19, -10 + side * 3);
    ctx.stroke();
  });
  // Body highlights
  ctx.fillStyle = "rgba(255,180,140,0.4)";
  ctx.beginPath();
  ctx.ellipse(8, -2, 2.4, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCaterpillar(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 20);
  // Segments — back to front so the head ends up on top-left
  const segs: Array<[number, number, number]> = [
    [16, 4, 6],
    [10, 2, 7],
    [3, 1, 7.5],
    [-4, 0, 8],
    [-11, -2, 8],
  ];
  // Little legs under the body
  ctx.strokeStyle = "#2a5410";
  ctx.lineWidth = 1.8;
  segs.forEach(([cx, cy, r]) => {
    [-2, 2].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + r - 2);
      ctx.lineTo(cx + dx, cy + r + 3);
      ctx.stroke();
    });
  });
  // Segment bodies (back to front, head last on top)
  segs.forEach(([cx, cy, r], i) => {
    const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r);
    if (i === segs.length - 1) {
      // head — slightly warmer/brighter green
      g.addColorStop(0, "#bfe87a");
      g.addColorStop(0.6, "#7ab83a");
      g.addColorStop(1, "#3a6814");
    } else {
      g.addColorStop(0, "#a8e068");
      g.addColorStop(0.6, "#6aa830");
      g.addColorStop(1, "#2e5410");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1f3a08";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // top highlight
    ctx.fillStyle = "rgba(230,255,180,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx - 1, cy - r * 0.5, r * 0.4, r * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  // Head detail (front-left segment)
  const [hx, hy] = [-11, -2];
  // Antennae
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 1.4;
  [-2.5, 2.5].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(hx + dx, hy - 6);
    ctx.lineTo(hx + dx * 1.4, hy - 11);
    ctx.stroke();
    ctx.fillStyle = "#d83a18";
    ctx.beginPath();
    ctx.arc(hx + dx * 1.4, hy - 11, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Eyes
  ctx.fillStyle = "#fff8e0";
  [-3, 2].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(hx + dx, hy - 1, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#0a0e04";
  [-3, 2].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(hx + dx - 0.3, hy - 0.8, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  // Smile
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(hx - 0.5, hy + 2, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Rosy cheek
  ctx.fillStyle = "rgba(240,120,120,0.45)";
  ctx.beginPath();
  ctx.arc(hx - 4, hy + 2, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

export const ICONS = {
  bug_bee:         { label: "Bee",         color: "#f5b400", draw: drawBee },
  bug_butterfly:   { label: "Butterfly",   color: "#e65a1e", draw: drawButterfly },
  bug_ladybug:     { label: "Ladybug",     color: "#d81818", draw: drawLadybug },
  bug_snail:       { label: "Snail",       color: "#a86828", draw: drawSnail },
  bug_dragonfly:   { label: "Dragonfly",   color: "#1a7a98", draw: drawDragonfly },
  bug_firefly:     { label: "Firefly",     color: "#c8f060", draw: drawFirefly },
  bug_ant:         { label: "Ant",         color: "#5a1808", draw: drawAnt },
  bug_caterpillar: { label: "Caterpillar", color: "#6aa830", draw: drawCaterpillar },
};
