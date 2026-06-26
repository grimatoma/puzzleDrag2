// Vegetables.

function drawCarrot(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.rotate(-0.18);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Carrot body — long tapered cone
  const body = ctx.createLinearGradient(-9, 0, 9, 0);
  body.addColorStop(0, "#ffae5a");
  body.addColorStop(0.5, "#e07820");
  body.addColorStop(1, "#a44808");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-9, -11);
  ctx.bezierCurveTo(-11, -2, -5, 16, 0, 24);
  ctx.bezierCurveTo(5, 16, 11, -2, 9, -11);
  ctx.bezierCurveTo(7, -14, -7, -14, -9, -11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a2806";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // Ridges
  ctx.strokeStyle = "rgba(90,40,6,0.5)";
  ctx.lineWidth = 1.3;
  [[-6, -8, -2, 18], [-1, -10, 1, 21], [4, -8, 5, 16]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + 1, (y1 + y2) / 2, x2 - 1, y2 - 4, x2, y2);
    ctx.stroke();
  });
  // Highlight
  ctx.strokeStyle = "rgba(255,230,180,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-5, -8);
  ctx.bezierCurveTo(-4, 0, -3, 12, -1, 21);
  ctx.stroke();
  // Greens at top — feathery fronds: a central stem + paired leaflets
  const fronds: Array<[number, number, number]> = [[-6, -11, -0.5], [0, -13, 0], [6, -11, 0.5]];
  // dark base pass for depth
  ctx.strokeStyle = "#2e4d10";
  ctx.lineWidth = 3.2;
  fronds.forEach(([bx, by, lean]) => {
    const tx = bx + lean * 6;
    const ty = by - 13;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + lean * 4, by - 8, tx, ty);
    ctx.stroke();
  });
  // bright stalk
  ctx.strokeStyle = "#6fae34";
  ctx.lineWidth = 1.8;
  fronds.forEach(([bx, by, lean]) => {
    const tx = bx + lean * 6;
    const ty = by - 13;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + lean * 4, by - 8, tx, ty);
    ctx.stroke();
    // paired leaflets along the stalk
    ctx.lineWidth = 1.3;
    for (let t = 0.35; t <= 0.85; t += 0.25) {
      const mx = bx + (tx - bx) * t + lean * 4 * Math.sin(Math.PI * t) * 0;
      const my = by + (ty - by) * t;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - 3, my - 2);
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + 3, my - 2);
      ctx.stroke();
    }
    ctx.lineWidth = 1.8;
  });
  ctx.restore();
}

function drawEggplant(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — pear shaped, deep purple
  const body = ctx.createRadialGradient(-4, -2, 2, 2, 6, 22);
  body.addColorStop(0, "#a868c8");
  body.addColorStop(0.5, "#582888");
  body.addColorStop(1, "#1f0838");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-14, -8, -16, 8, -10, 18);
  ctx.bezierCurveTo(-4, 22, 6, 22, 12, 18);
  ctx.bezierCurveTo(18, 8, 14, -8, 0, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#100420";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Specular highlight (long curved)
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, 0, 2.4, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(-3, 12, 1.4, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Calyx (green leaf cap)
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-10, -14, -10, -8, -6, -6);
  ctx.bezierCurveTo(-2, -10, 2, -10, 6, -6);
  ctx.bezierCurveTo(10, -8, 10, -14, 0, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Stem
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(2, -22);
  ctx.stroke();
  ctx.strokeStyle = "#7cb840";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(2, -22);
  ctx.stroke();
}

function drawTurnip(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — bright white bulb, slightly wider than tall, with a small pointed base
  const body = ctx.createRadialGradient(-5, 9, 2, -1, 8, 20);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.6, "#fbeef2");
  body.addColorStop(1, "#d8c2cc");
  ctx.fillStyle = body;
  ctx.beginPath();
  // Wide shoulder, rounded sides, narrowing to a small base
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-16, -8, -18, 8, -10, 16);
  ctx.bezierCurveTo(-5, 21, -2, 22, 0, 24);
  ctx.bezierCurveTo(2, 22, 5, 21, 10, 16);
  ctx.bezierCurveTo(18, 8, 16, -8, 0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#6a4a58";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Strong magenta/purple shoulder cap, sharply bounded against the white lower half (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-16, -8, -18, 8, -10, 16);
  ctx.bezierCurveTo(-5, 21, -2, 22, 0, 24);
  ctx.bezierCurveTo(2, 22, 5, 21, 10, 16);
  ctx.bezierCurveTo(18, 8, 16, -8, 0, -8);
  ctx.closePath();
  ctx.clip();
  const cap = ctx.createLinearGradient(0, -10, 0, 6);
  cap.addColorStop(0, "#b8286e");
  cap.addColorStop(0.7, "#a02062");
  cap.addColorStop(0.95, "#c25088");
  cap.addColorStop(1, "rgba(194,80,136,0)");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.ellipse(0, -3, 19, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Tight crisp highlight low on the white belly (no pillow bloom, clear of the cap edge)
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(-7, 11, 1.8, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Small pointed root at the bottom
  ctx.strokeStyle = "#6a4a58";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 23);
  ctx.lineTo(1, 28);
  ctx.stroke();
  // Greens — short stalks then broad pointed leaves
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 2.4;
  [[-4, -9, -8, -15], [0, -11, 0, -17], [4, -9, 8, -15]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2 + 1, y1 - 3, x2, y2);
    ctx.stroke();
  });
  // Leaves — broad teardrop blades pointing outward
  const tLeaves: Array<[number, number, number]> = [[-8, -16, -0.6], [0, -18, 0], [8, -16, 0.6]];
  tLeaves.forEach(([lx, ly, lean]) => {
    const grad = ctx.createLinearGradient(lx, ly - 9, lx, ly + 3);
    grad.addColorStop(0, "#9ccc54");
    grad.addColorStop(1, "#5a8a26");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 3);
    ctx.bezierCurveTo(lx - 6 + lean * 4, ly - 2, lx - 4 + lean * 5, ly - 9, lx + lean * 5, ly - 10);
    ctx.bezierCurveTo(lx + 4 + lean * 5, ly - 9, lx + 6 + lean * 4, ly - 2, lx, ly + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a6014";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // midrib
    ctx.strokeStyle = "rgba(46,72,16,0.6)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 2);
    ctx.lineTo(lx + lean * 4, ly - 8);
    ctx.stroke();
  });
}

function drawBeet(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — deep cool red-purple, pointed beet root (broad shoulder, tapering to a tip)
  const body = ctx.createRadialGradient(-3, -4, 1, 0, 0, 22);
  body.addColorStop(0, "#c43872");
  body.addColorStop(0.5, "#8a1448");
  body.addColorStop(1, "#380418");
  ctx.fillStyle = body;
  ctx.beginPath();
  // Broad rounded shoulder at the top
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-15, -8, -17, 4, -12, 12);
  // Left flank tapering inward toward the tip
  ctx.bezierCurveTo(-9, 18, -4, 22, 0, 28);
  // Right flank back up from the tip to the shoulder
  ctx.bezierCurveTo(4, 22, 9, 18, 12, 12);
  ctx.bezierCurveTo(17, 4, 15, -8, 0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f0210";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Concentric rings (beet's distinctive grain), following the tapered form
  ctx.strokeStyle = "rgba(255,190,215,0.4)";
  ctx.lineWidth = 0.9;
  [4, 8, 12].forEach((r) => {
    ctx.beginPath();
    ctx.arc(-1, 2, r, -0.6, Math.PI - 0.3);
    ctx.stroke();
  });
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-5, -3, 2.2, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Thin tap root extending from the pointed tip
  ctx.strokeStyle = "#1f0210";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 27);
  ctx.quadraticCurveTo(1, 31, 3, 34);
  ctx.stroke();
  // Magenta stems
  ctx.strokeStyle = "#a82058";
  ctx.lineWidth = 2.2;
  [[-3, -8, -7, -18], [0, -10, 0, -20], [3, -8, 7, -18]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Leaves — dark green teardrop blades
  const bLeaves: Array<[number, number, number]> = [[-7, -18, -0.5], [0, -20, 0], [7, -18, 0.5]];
  bLeaves.forEach(([lx, ly, lean]) => {
    const grad = ctx.createLinearGradient(lx, ly - 6, lx, ly + 3);
    grad.addColorStop(0, "#4a7a1e");
    grad.addColorStop(1, "#2a4c0e");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 3);
    ctx.bezierCurveTo(lx - 5 + lean * 3, ly - 1, lx - 3 + lean * 4, ly - 6, lx + lean * 4, ly - 7);
    ctx.bezierCurveTo(lx + 3 + lean * 4, ly - 6, lx + 5 + lean * 3, ly - 1, lx, ly + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1f3808";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // magenta midrib
    ctx.strokeStyle = "rgba(200,74,138,0.7)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 2);
    ctx.lineTo(lx + lean * 3, ly - 6);
    ctx.stroke();
  });
}

function drawCucumber(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.rotate(-0.45);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — long oval
  const body = ctx.createLinearGradient(0, -8, 0, 10);
  body.addColorStop(0, "#9ed05a");
  body.addColorStop(0.6, "#4a7820");
  body.addColorStop(1, "#1f3808");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#142808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Bumpy texture (small dark dots)
  ctx.fillStyle = "rgba(20,40,8,0.7)";
  for (let i = 0; i < 14; i++) {
    const x = -18 + (i * 3) + Math.sin(i) * 1.5;
    const y = 4 + Math.cos(i * 1.7) * 5;
    ctx.beginPath();
    ctx.arc(x, y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bumps with highlight
  ctx.fillStyle = "rgba(220,240,170,0.7)";
  for (let i = 0; i < 10; i++) {
    const x = -16 + (i * 3.5);
    const y = -1 + Math.cos(i * 1.3) * 2;
    ctx.beginPath();
    ctx.arc(x, y, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Long highlight
  ctx.strokeStyle = "rgba(220,240,170,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.bezierCurveTo(-8, -5, 8, -5, 16, -2);
  ctx.stroke();
  // Stem ends
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.arc(-22, 4, 2.6, 0, Math.PI * 2);
  ctx.arc(22, 4, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawSquash(ctx: CanvasRenderingContext2D) {
  // Butternut squash — long curved neck on the upper-left, round bulb lower-right.
  // The squash body outline, reused for fill, stroke and rib clip.
  const trace = () => {
    ctx.beginPath();
    // Top of neck (under the stem)
    ctx.moveTo(-13, -22);
    // Left side of neck, curving down and right into the bulb shoulder
    ctx.bezierCurveTo(-15, -14, -12, -2, -9, 6);
    // Bulb left flank
    ctx.bezierCurveTo(-16, 12, -16, 24, -2, 24);
    // Bulb bottom-right and up the round flank
    ctx.bezierCurveTo(14, 24, 16, 8, 7, 4);
    // Right side of neck rising back to the top
    ctx.bezierCurveTo(0, 0, -3, -12, -5, -22);
    // Cap across the top of the neck
    ctx.bezierCurveTo(-7, -24, -11, -24, -13, -22);
    ctx.closePath();
  };
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(2, 24, 18, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — warm butternut tan-orange, lit toward the bulb
  const body = ctx.createRadialGradient(-2, 12, 2, 2, 14, 24);
  body.addColorStop(0, "#ffc878");
  body.addColorStop(0.55, "#e8932e");
  body.addColorStop(1, "#9a5410");
  ctx.fillStyle = body;
  trace();
  ctx.fill();
  ctx.strokeStyle = "#5a2c08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Vertical ribs, following the neck-into-bulb flow (clipped to body)
  ctx.save();
  trace();
  ctx.clip();
  ctx.strokeStyle = "rgba(90,44,8,0.45)";
  ctx.lineWidth = 1;
  [-9, -3, 3, 9].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x - 4, -20);
    ctx.bezierCurveTo(x - 5, -4, x, 12, x + 1, 24);
    ctx.stroke();
  });
  ctx.restore();
  // Highlight along the upper-left neck
  ctx.fillStyle = "rgba(255,250,205,0.45)";
  ctx.beginPath();
  ctx.ellipse(-9, -6, 2.4, 9, 0.12, 0, Math.PI * 2);
  ctx.fill();
  // Soft sheen on the bulb
  ctx.fillStyle = "rgba(255,250,205,0.3)";
  ctx.beginPath();
  ctx.ellipse(-2, 12, 4, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.fillStyle = "#5a3a14";
  ctx.beginPath();
  ctx.moveTo(-12, -22);
  ctx.lineTo(-6, -22);
  ctx.lineTo(-7, -28);
  ctx.lineTo(-11, -27);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawMushroom(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  const stem = ctx.createLinearGradient(-6, 0, 6, 0);
  stem.addColorStop(0, "#fff5dc");
  stem.addColorStop(0.5, "#f0d8a8");
  stem.addColorStop(1, "#a08858");
  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.bezierCurveTo(-8, 16, -6, 22, 0, 22);
  ctx.bezierCurveTo(6, 22, 8, 16, 7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a4220";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Cap — red dome
  const cap = ctx.createRadialGradient(-4, -6, 2, 0, 0, 22);
  cap.addColorStop(0, "#ff7a5a");
  cap.addColorStop(0.5, "#c8281a");
  cap.addColorStop(1, "#5a0808");
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(-20, -2);
  ctx.bezierCurveTo(-22, -22, 22, -22, 20, -2);
  ctx.bezierCurveTo(20, 4, -20, 4, -20, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 2;
  ctx.stroke();
  // White spots
  ctx.fillStyle = "#fff8e8";
  ctx.strokeStyle = "rgba(120,60,30,0.4)";
  ctx.lineWidth = 0.6;
  [[-12, -8, 3], [-2, -14, 4], [10, -10, 3.5], [4, -4, 2.4], [-8, -2, 2]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Cap highlight band
  ctx.strokeStyle = "rgba(255,200,170,0.55)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-16, -10);
  ctx.bezierCurveTo(-8, -18, 8, -18, 16, -10);
  ctx.stroke();
  // Gills under cap (dark line)
  ctx.strokeStyle = "rgba(40,20,10,0.6)";
  ctx.lineWidth = 0.6;
  for (let x = -18; x <= 18; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 3);
    ctx.stroke();
  }
}

function drawPepper(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — blocky bell pepper, glossy red. Recessed shoulder at the top,
  // wide blocky sides, three rounded lobes bulging along the bottom.
  const trace = () => {
    ctx.beginPath();
    // Recessed shoulder dips down at the centre top where the stem sits
    ctx.moveTo(-12, -9);
    ctx.bezierCurveTo(-9, -6, -3, -6, 0, -8);
    ctx.bezierCurveTo(3, -6, 9, -6, 12, -9);
    // Right shoulder bulging out
    ctx.bezierCurveTo(17, -6, 18, 6, 15, 13);
    // Bottom: right lobe
    ctx.bezierCurveTo(13, 21, 9, 22, 7, 17);
    // dip between right and middle lobe, middle lobe
    ctx.bezierCurveTo(5, 14, 4, 22, 0, 22);
    // dip, left lobe
    ctx.bezierCurveTo(-4, 22, -5, 14, -7, 17);
    ctx.bezierCurveTo(-9, 22, -13, 21, -15, 13);
    // Left shoulder back up
    ctx.bezierCurveTo(-18, 6, -17, -6, -12, -9);
    ctx.closePath();
  };
  const body = ctx.createRadialGradient(-4, 2, 2, 0, 6, 22);
  body.addColorStop(0, "#ff6868");
  body.addColorStop(0.5, "#c8181a");
  body.addColorStop(1, "#5a0408");
  ctx.fillStyle = body;
  trace();
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Lobe creases — define the three bottom bulges and run up the body
  ctx.strokeStyle = "rgba(58,4,8,0.5)";
  ctx.lineWidth = 1.2;
  [
    [-7, -7, -8, 6, -7, 16],
    [7, -7, 8, 6, 7, 16],
  ].forEach(([x1, y1, x2, y2, x3, y3]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x2, y2, x3, y3 - 3, x3, y3);
    ctx.stroke();
  });
  // Specular highlight — broad glossy band on the lit left lobe
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-7, 2, 2.6, 7, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(6, 5, 1.6, 4.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Stem cap (green calyx) nestled in the recessed shoulder
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(-7, -7);
  ctx.bezierCurveTo(-8, -12, 8, -12, 7, -7);
  ctx.bezierCurveTo(3, -9, -3, -9, -7, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Short green stem
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(1, -17);
  ctx.stroke();
  ctx.strokeStyle = "#7cb840";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(1, -17);
  ctx.stroke();
}

function drawBroccoli(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stalk
  const stem = ctx.createLinearGradient(-6, 0, 6, 0);
  stem.addColorStop(0, "#d8e890");
  stem.addColorStop(1, "#80a040");
  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.bezierCurveTo(-7, 14, -5, 22, 0, 22);
  ctx.bezierCurveTo(5, 22, 7, 14, 6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a5a14";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Side stem branches
  ctx.strokeStyle = "#3a5a14";
  ctx.lineWidth = 2;
  [[0, 8, -10, 0], [0, 6, 10, 0]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Florets — many small dark green clusters
  const florets = [
    { x: 0, y: -10, r: 12 },
    { x: -10, y: -4, r: 9 },
    { x: 10, y: -4, r: 9 },
    { x: -4, y: -16, r: 8 },
    { x: 6, y: -16, r: 8 },
  ];
  florets.forEach((f) => {
    const grad = ctx.createRadialGradient(f.x - f.r * 0.3, f.y - f.r * 0.3, 1, f.x, f.y, f.r);
    grad.addColorStop(0, "#5a8a26");
    grad.addColorStop(0.7, "#2e5410");
    grad.addColorStop(1, "#142a04");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0a1804";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });
  // Bumpy floret texture (tiny circles)
  ctx.fillStyle = "rgba(30,80,20,0.85)";
  for (const f of florets) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = f.r * 0.55;
      const dx = Math.cos(a) * r + Math.cos(a * 2.3) * 1.5;
      const dy = Math.sin(a) * r + Math.sin(a * 1.7) * 1.5;
      ctx.beginPath();
      ctx.arc(f.x + dx, f.y + dy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Top sparkle
  ctx.fillStyle = "rgba(180,220,140,0.5)";
  [[-6, -16, 1.4], [4, -18, 1.6], [-12, -8, 1.2], [12, -8, 1.2]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const ICONS = {
  tile_veg_carrot:   { label:"Carrot",   color:"#e07820", draw:drawCarrot },
  tile_veg_eggplant: { label:"Eggplant", color:"#582888", draw:drawEggplant },
  tile_veg_turnip:   { label:"Turnip",   color:"#c8a8b4", draw:drawTurnip },
  tile_veg_beet:     { label:"Beet",     color:"#a82058", draw:drawBeet },
  tile_veg_cucumber: { label:"Cucumber", color:"#7eb44a", draw:drawCucumber },
  tile_veg_squash:   { label:"Squash",   color:"#e09038", draw:drawSquash },
  tile_veg_mushroom: { label:"Mushroom", color:"#c8281a", draw:drawMushroom },
  tile_veg_pepper:   { label:"Pepper",   color:"#c8181a", draw:drawPepper },
  tile_veg_broccoli: { label:"Broccoli", color:"#5a8a26", draw:drawBroccoli },
};
