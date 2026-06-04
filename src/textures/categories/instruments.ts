// Musical Instruments — folk / medieval flavor.

function shadow(ctx: CanvasRenderingContext2D, w: number, y?: number) {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath(); ctx.ellipse(2, y || 22, w, 4, 0, 0, Math.PI * 2); ctx.fill();
}

function drawLute(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  ctx.save();
  ctx.rotate(-0.18);
  // Neck — tilted up-right with frets, drawn first so the body overlaps its base.
  ctx.save();
  ctx.translate(6, -2);
  ctx.rotate(-0.9);
  const neckG = ctx.createLinearGradient(0, -3.5, 0, 3.5);
  neckG.addColorStop(0, "#a87838");
  neckG.addColorStop(0.5, "#7a4818");
  neckG.addColorStop(1, "#3a2008");
  ctx.fillStyle = neckG;
  ctx.fillRect(0, -3.5, 26, 7);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6;
  ctx.strokeRect(0, -3.5, 26, 7);
  // Frets
  ctx.strokeStyle = "rgba(20,14,4,0.6)"; ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * 5, -3.5); ctx.lineTo(i * 5, 3.5); ctx.stroke();
  }
  // Pegbox at the end, angled back
  ctx.fillStyle = "#5a3414";
  ctx.beginPath();
  ctx.moveTo(26, -4); ctx.lineTo(34, -7); ctx.lineTo(35, -1); ctx.lineTo(27, 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Tuning pegs
  ctx.fillStyle = "#2a1808";
  [[30, -6], [33, -3], [29, 2]].forEach(([px, py]) => {
    ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
  // Body — pear-shaped, rounded bowl.
  const body = ctx.createRadialGradient(-5, 4, 3, 0, 8, 22);
  body.addColorStop(0, "#d8a058");
  body.addColorStop(0.5, "#a86828");
  body.addColorStop(1, "#5a3010");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-14, -6, -16, 12, -8, 20);
  ctx.bezierCurveTo(-2, 24, 6, 24, 12, 18);
  ctx.bezierCurveTo(18, 10, 14, -6, 0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 2; ctx.stroke();
  // Bowl rib lines (clipped)
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(40,20,8,0.4)"; ctx.lineWidth = 0.9;
  [-6, -2, 2, 6, 10].forEach((cx) => {
    ctx.beginPath();
    ctx.moveTo(cx * 0.4, -6);
    ctx.bezierCurveTo(cx, 6, cx, 14, cx * 0.6, 22);
    ctx.stroke();
  });
  ctx.restore();
  // Soundhole — round rosette
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.arc(0, 6, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d8a058"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 6, 4.5, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(216,160,88,0.7)"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(0, 6, 2.6, 0, Math.PI * 2); ctx.stroke();
  // Bridge below soundhole
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-5, 13, 10, 2.4);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.8;
  ctx.strokeRect(-5, 13, 10, 2.4);
  // Strings — from bridge up across the soundhole to the neck base.
  ctx.strokeStyle = "rgba(245,235,210,0.85)"; ctx.lineWidth = 0.6;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 1.6, 13);
    ctx.lineTo(i * 1.2 + 3, -7);
    ctx.stroke();
  }
  // Body highlight
  ctx.fillStyle = "rgba(255,240,210,0.4)";
  ctx.beginPath(); ctx.ellipse(-7, 2, 2.6, 7, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawDrum(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Wooden body — slightly trapezoidal barrel.
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, "#5a3010");
  body.addColorStop(0.5, "#a86828");
  body.addColorStop(1, "#4a2808");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-15, -6);
  ctx.lineTo(15, -6);
  ctx.lineTo(13, 16);
  ctx.lineTo(-13, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 2; ctx.stroke();
  // Wood grain staves
  ctx.strokeStyle = "rgba(40,20,8,0.4)"; ctx.lineWidth = 0.8;
  [-9, -3, 3, 9].forEach((x) => {
    ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x * 0.85, 15); ctx.stroke();
  });
  // Bottom rim
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.ellipse(0, 16, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Tension ropes — zig-zag lacing down the body.
  ctx.strokeStyle = "#d8c090"; ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const xt = -13 + i * 5.2;
    const xb = -13 + i * 5.2 + 2.6;
    ctx.beginPath();
    ctx.moveTo(xt, -4);
    ctx.lineTo(xb, 14);
    ctx.lineTo(xt + 5.2, -4);
    ctx.stroke();
  }
  // Head skin — taut top, pale hide.
  const head = ctx.createRadialGradient(-4, -8, 2, 0, -6, 18);
  head.addColorStop(0, "#fdf3dc");
  head.addColorStop(0.7, "#e8d2a0");
  head.addColorStop(1, "#c0a060");
  ctx.fillStyle = head;
  ctx.beginPath(); ctx.ellipse(0, -6, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 2; ctx.stroke();
  // Rim hoop over the head edge
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(0, -6, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
  // Head highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-5, -8, 5, 1.8, -0.2, 0, Math.PI * 2); ctx.fill();
  // Drumstick resting across the head.
  ctx.save();
  ctx.translate(2, -6);
  ctx.rotate(-0.5);
  const stickG = ctx.createLinearGradient(0, -1.5, 0, 1.5);
  stickG.addColorStop(0, "#d8a860");
  stickG.addColorStop(1, "#7a4818");
  ctx.fillStyle = stickG;
  ctx.fillRect(-2, -1.4, 22, 2.8);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9;
  ctx.strokeRect(-2, -1.4, 22, 2.8);
  // Stick knob tip
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.arc(20, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.arc(19, -1, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFlute(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  ctx.save();
  ctx.rotate(-0.35);
  // Wooden tube — long cylinder.
  const tube = ctx.createLinearGradient(0, -4, 0, 4);
  tube.addColorStop(0, "#d8a860");
  tube.addColorStop(0.45, "#a86828");
  tube.addColorStop(1, "#5a3010");
  ctx.fillStyle = tube;
  ctx.beginPath();
  ctx.moveTo(-22, -3.5);
  ctx.lineTo(18, -4);
  ctx.bezierCurveTo(24, -4, 24, 4, 18, 4);
  ctx.lineTo(-22, 3.5);
  ctx.bezierCurveTo(-25, 3, -25, -3, -22, -3.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 2; ctx.stroke();
  // Wood grain
  ctx.strokeStyle = "rgba(40,20,8,0.35)"; ctx.lineWidth = 0.7;
  [-1.2, 0.6].forEach((y) => {
    ctx.beginPath(); ctx.moveTo(-20, y); ctx.lineTo(16, y); ctx.stroke();
  });
  // Carved ring bands
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6;
  [-16, 12].forEach((x) => {
    ctx.beginPath(); ctx.moveTo(x, -3.6); ctx.lineTo(x, 3.6); ctx.stroke();
  });
  // Mouthpiece — fipple block at left end.
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(-22, -3.6); ctx.lineTo(-19, -4.2); ctx.lineTo(-19, 4.2); ctx.lineTo(-22, 3.6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Blow window notch
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath();
  ctx.moveTo(-17, -3.2); ctx.lineTo(-14, -3.2); ctx.lineTo(-15.5, -1); ctx.closePath();
  ctx.fill();
  // Finger holes
  ctx.fillStyle = "#1a0e04";
  [-8, -3, 2, 7, 12].forEach((x) => {
    ctx.beginPath(); ctx.arc(x, -0.4, 1.4, 0, Math.PI * 2); ctx.fill();
  });
  // Top specular streak
  ctx.fillStyle = "rgba(255,245,215,0.5)";
  ctx.beginPath();
  ctx.moveTo(-20, -2.4); ctx.lineTo(16, -2.6); ctx.lineTo(16, -1.6); ctx.lineTo(-20, -1.4);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawHorn(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  ctx.save();
  ctx.rotate(-0.12);
  // Brass gradient reused for body + bell.
  const brass = ctx.createLinearGradient(-18, -10, 18, 12);
  brass.addColorStop(0, "#fff3b0");
  brass.addColorStop(0.4, "#e0a830");
  brass.addColorStop(0.7, "#a86810");
  brass.addColorStop(1, "#5a3408");
  // Curved tube of the horn — a sweeping C.
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 8; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.bezierCurveTo(-22, -8, -6, -16, 6, -12);
  ctx.stroke();
  ctx.strokeStyle = brass; ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.bezierCurveTo(-22, -8, -6, -16, 6, -12);
  ctx.stroke();
  // Flared bell at the right end.
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(4, -16);
  ctx.bezierCurveTo(14, -20, 22, -14, 22, -4);
  ctx.bezierCurveTo(18, -6, 12, -6, 8, -8);
  ctx.bezierCurveTo(6, -10, 4, -13, 4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2; ctx.stroke();
  // Bell inner shadow
  ctx.fillStyle = "rgba(40,20,8,0.5)";
  ctx.beginPath();
  ctx.ellipse(18, -8, 4, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Mouthpiece cup at the left tip.
  ctx.fillStyle = "#e0a830";
  ctx.beginPath(); ctx.ellipse(-16, 6, 3, 3.5, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4; ctx.stroke();
  // Specular streaks along the tube
  ctx.strokeStyle = "rgba(255,250,220,0.75)"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-15, 3);
  ctx.bezierCurveTo(-19, -7, -6, -13, 4, -11);
  ctx.stroke();
  // Bell rim shine
  ctx.strokeStyle = "rgba(255,250,220,0.7)"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(6, -15); ctx.bezierCurveTo(14, -18, 20, -14, 21, -6);
  ctx.stroke();
  // Hanging cord
  ctx.strokeStyle = "#7a3018"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.bezierCurveTo(-6, 14, 6, 14, 10, 2);
  ctx.stroke();
  ctx.restore();
}

function drawFiddle(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  ctx.save();
  ctx.rotate(-0.15);
  // Bow — drawn first, off to the right behind the body.
  ctx.save();
  ctx.translate(10, 2);
  ctx.rotate(0.5);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.quadraticCurveTo(0, -3, 22, 0);
  ctx.stroke();
  // Bow hair
  ctx.strokeStyle = "rgba(245,235,210,0.85)"; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-21, 1); ctx.lineTo(21, 1);
  ctx.stroke();
  // Frog
  ctx.fillStyle = "#2a1808";
  ctx.fillRect(-23, -1.5, 4, 4);
  ctx.restore();
  // Fiddle body — figure-eight silhouette.
  const body = ctx.createRadialGradient(-3, 2, 3, 0, 6, 20);
  body.addColorStop(0, "#d88838");
  body.addColorStop(0.5, "#a85818");
  body.addColorStop(1, "#5a2c08");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-8, -10, -10, -4, -7, 0);  // upper bout left
  ctx.bezierCurveTo(-10, 2, -10, 4, -7, 5);    // waist left
  ctx.bezierCurveTo(-11, 9, -11, 20, 0, 20);   // lower bout left
  ctx.bezierCurveTo(11, 20, 11, 9, 7, 5);      // lower bout right
  ctx.bezierCurveTo(10, 4, 10, 2, 7, 0);       // waist right
  ctx.bezierCurveTo(10, -4, 8, -10, 0, -10);   // upper bout right
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 2; ctx.stroke();
  // f-holes
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(s * 4, 2);
    ctx.bezierCurveTo(s * 6, 6, s * 2, 10, s * 4, 14);
    ctx.stroke();
  });
  // Bridge
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-4, 8, 8, 1.8);
  // Neck and scroll up top.
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-2.2, -20, 4.4, 11);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.strokeRect(-2.2, -20, 4.4, 11);
  // Scroll
  ctx.fillStyle = "#8a5520";
  ctx.beginPath(); ctx.arc(0, -22, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = "rgba(20,14,4,0.7)"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(0, -22, 1.6, 0, Math.PI * 1.6); ctx.stroke();
  // Strings — neck to bridge.
  ctx.strokeStyle = "rgba(245,235,210,0.85)"; ctx.lineWidth = 0.5;
  for (let i = -1.5; i <= 1.5; i++) {
    ctx.beginPath();
    ctx.moveTo(i, -19);
    ctx.lineTo(i, 9);
    ctx.stroke();
  }
  // Body highlight
  ctx.fillStyle = "rgba(255,235,200,0.35)";
  ctx.beginPath(); ctx.ellipse(-4, 12, 2.4, 5, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBell(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Wooden handle on top.
  const handle = ctx.createLinearGradient(-4, -22, 4, -8);
  handle.addColorStop(0, "#a87838");
  handle.addColorStop(0.5, "#7a4818");
  handle.addColorStop(1, "#3a2008");
  ctx.fillStyle = handle;
  ctx.beginPath();
  ctx.moveTo(-3, -8);
  ctx.bezierCurveTo(-5, -16, -3, -22, 0, -22);
  ctx.bezierCurveTo(3, -22, 5, -16, 3, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Knob cap
  ctx.fillStyle = "#8a5520";
  ctx.beginPath(); ctx.arc(0, -22, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1; ctx.stroke();
  // Collar between handle and bell
  ctx.fillStyle = "#c8901c";
  ctx.fillRect(-3.5, -9, 7, 3);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1; ctx.strokeRect(-3.5, -9, 7, 3);
  // Bell body — brass dome flaring to a wide mouth.
  const brass = ctx.createLinearGradient(-14, -6, 14, 18);
  brass.addColorStop(0, "#fff3b0");
  brass.addColorStop(0.4, "#e0a830");
  brass.addColorStop(0.75, "#a86810");
  brass.addColorStop(1, "#5a3408");
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.bezierCurveTo(-6, 2, -12, 8, -14, 14);
  ctx.bezierCurveTo(-8, 18, 8, 18, 14, 14);
  ctx.bezierCurveTo(12, 8, 6, 2, 4, -6);
  ctx.bezierCurveTo(2, -8, -2, -8, -4, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2; ctx.stroke();
  // Mouth rim opening (dark ellipse)
  ctx.fillStyle = "#3a2408";
  ctx.beginPath(); ctx.ellipse(0, 14, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7a4810"; ctx.lineWidth = 1.4; ctx.stroke();
  // Clapper hanging in the mouth
  ctx.fillStyle = "#8a6018";
  ctx.beginPath(); ctx.arc(0, 15, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.9; ctx.stroke();
  // Specular streaks for shine
  ctx.strokeStyle = "rgba(255,250,220,0.8)"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, -3); ctx.bezierCurveTo(-9, 4, -11, 8, -11, 12);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,250,220,0.5)"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3, -4); ctx.bezierCurveTo(-4, 4, -5, 8, -5, 12);
  ctx.stroke();
}

function drawPanFlute(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  ctx.save();
  ctx.rotate(0.04);
  const tubes = 6;
  const startX = -13;
  const gap = 5.2;
  const topY = -16;
  // Each reed tube descends in length to the right.
  for (let i = 0; i < tubes; i++) {
    const x = startX + i * gap;
    const len = 12 + i * 5; // increasing length
    const bottomY = topY + len;
    const tubeG = ctx.createLinearGradient(x - 2.2, 0, x + 2.2, 0);
    tubeG.addColorStop(0, "#5a3010");
    tubeG.addColorStop(0.4, "#c89048");
    tubeG.addColorStop(0.6, "#e0b060");
    tubeG.addColorStop(1, "#6a3a12");
    ctx.fillStyle = tubeG;
    ctx.beginPath();
    ctx.moveTo(x - 2.2, topY);
    ctx.lineTo(x + 2.2, topY);
    ctx.lineTo(x + 2.2, bottomY);
    ctx.bezierCurveTo(x + 2.2, bottomY + 2.4, x - 2.2, bottomY + 2.4, x - 2.2, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 1.2; ctx.stroke();
    // Open top hole
    ctx.fillStyle = "#1a0e04";
    ctx.beginPath(); ctx.ellipse(x, topY, 2.2, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7a4810"; ctx.lineWidth = 0.6; ctx.stroke();
    // Specular streak
    ctx.fillStyle = "rgba(255,245,215,0.5)";
    ctx.fillRect(x - 1.4, topY + 1.5, 0.9, len - 2);
  }
  // Binding cords wrapping across all tubes.
  const rightX = startX + (tubes - 1) * gap;
  [[-9, "#a8782c"], [-2, "#8a5818"]].forEach(([by, col]) => {
    ctx.strokeStyle = col as string; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(startX - 3, by as number);
    ctx.lineTo(rightX + 3, by as number);
    ctx.stroke();
    ctx.strokeStyle = "rgba(40,20,8,0.5)"; ctx.lineWidth = 0.7;
    for (let x = startX - 2; x < rightX + 3; x += 2.4) {
      ctx.beginPath(); ctx.moveTo(x, (by as number) - 1.6); ctx.lineTo(x + 1.4, (by as number) + 1.6); ctx.stroke();
    }
  });
  ctx.restore();
}

function drawTambourine(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  ctx.save();
  ctx.rotate(-0.1);
  // Wooden rim — outer ring.
  const rimG = ctx.createLinearGradient(-20, 0, 20, 0);
  rimG.addColorStop(0, "#5a3010");
  rimG.addColorStop(0.5, "#a86828");
  rimG.addColorStop(1, "#4a2808");
  ctx.fillStyle = rimG;
  ctx.beginPath(); ctx.ellipse(0, 2, 20, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#2a1808"; ctx.lineWidth = 2; ctx.stroke();
  // Skin head — inset taut hide.
  const head = ctx.createRadialGradient(-5, -3, 3, 0, 2, 18);
  head.addColorStop(0, "#fdf3dc");
  head.addColorStop(0.7, "#e8d2a0");
  head.addColorStop(1, "#c0a060");
  ctx.fillStyle = head;
  ctx.beginPath(); ctx.ellipse(0, 2, 15, 13.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 1.6; ctx.stroke();
  // Head highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.ellipse(-6, -4, 5, 4, -0.4, 0, Math.PI * 2); ctx.fill();
  // Skin stitching ring
  ctx.strokeStyle = "rgba(120,72,24,0.5)"; ctx.lineWidth = 0.7;
  ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.ellipse(0, 2, 15, 13.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  // Jingles around the rim — paired brass discs in slots.
  const jingles = 8;
  for (let i = 0; i < jingles; i++) {
    const a = (i / jingles) * Math.PI * 2 - Math.PI / 2;
    const jx = Math.cos(a) * 18;
    const jy = 2 + Math.sin(a) * 16;
    // slot
    ctx.fillStyle = "#3a2008";
    ctx.beginPath(); ctx.ellipse(jx, jy, 3.4, 2.2, a, 0, Math.PI * 2); ctx.fill();
    // brass disc pair
    const jg = ctx.createRadialGradient(jx - 1, jy - 1, 0.5, jx, jy, 3);
    jg.addColorStop(0, "#fff3b0");
    jg.addColorStop(0.6, "#e0a830");
    jg.addColorStop(1, "#8a5510");
    ctx.fillStyle = jg;
    ctx.beginPath(); ctx.arc(jx, jy, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = "rgba(255,250,220,0.7)";
    ctx.beginPath(); ctx.arc(jx - 0.8, jy - 0.8, 0.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export const ICONS = {
  instr_lute:       { label: "Lute",        color: "#a86828", draw: drawLute },
  instr_drum:       { label: "Drum",        color: "#a86828", draw: drawDrum },
  instr_flute:      { label: "Flute",       color: "#a86828", draw: drawFlute },
  instr_horn:       { label: "Horn",        color: "#e0a830", draw: drawHorn },
  instr_fiddle:     { label: "Fiddle",      color: "#a85818", draw: drawFiddle },
  instr_bell:       { label: "Bell",        color: "#e0a830", draw: drawBell },
  instr_pan_flute:  { label: "Pan Flute",   color: "#c89048", draw: drawPanFlute },
  instr_tambourine: { label: "Tambourine",  color: "#a86828", draw: drawTambourine },
};
