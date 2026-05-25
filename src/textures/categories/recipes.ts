// Recipes icons (crafted items that don't fall into other categories)

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShadow(ctx, w = 20, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWaterPump(ctx) {
  drawShadow(ctx, 18, 4);
  ctx.fillStyle = "#3a2a18";
  rr(ctx, -14, 14, 28, 6, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,10,4,0.55)";
  ctx.lineWidth = 0.7;
  [-7, 0, 7].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 14);
    ctx.lineTo(x, 20);
    ctx.stroke();
  });
  const bodyGrad = ctx.createLinearGradient(0, -14, 0, 14);
  bodyGrad.addColorStop(0, "#e85a40");
  bodyGrad.addColorStop(0.45, "#b83828");
  bodyGrad.addColorStop(1, "#5a1808");
  ctx.fillStyle = bodyGrad;
  rr(ctx, -8, -14, 16, 28, 2);
  ctx.fill();
  ctx.strokeStyle = "#3a0c04";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#2a0a04";
  [[-5, -10], [5, -10], [-5, 9], [5, 9]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
  const spoutGrad = ctx.createLinearGradient(0, -4, 0, 6);
  spoutGrad.addColorStop(0, "#f8d860");
  spoutGrad.addColorStop(0.5, "#c89028");
  spoutGrad.addColorStop(1, "#7a5008");
  ctx.fillStyle = spoutGrad;
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.lineTo(-20, -2);
  ctx.lineTo(-20, 6);
  ctx.lineTo(-14, 6);
  ctx.lineTo(-14, 2);
  ctx.lineTo(-8, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a3008";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,240,180,0.75)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-19, 0);
  ctx.lineTo(-9, 0);
  ctx.stroke();
  const handleGrad = ctx.createLinearGradient(0, -22, 0, -10);
  handleGrad.addColorStop(0, "#8a8a92");
  handleGrad.addColorStop(1, "#3a3a40");
  ctx.strokeStyle = handleGrad;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(2, -12);
  ctx.bezierCurveTo(8, -18, 14, -20, 18, -16);
  ctx.stroke();
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.arc(2, -12, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a8d4ec";
  ctx.beginPath();
  ctx.ellipse(-17, 10, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a6a88";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-18, 9.5, 1, 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-4, -8, 1.5, 6, -0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawExplosives(ctx) {
  drawShadow(ctx, 18, 4);
  const sticks = [
    { x: -7, y: 4, rot: -0.18 },
    { x: 7, y: 4, rot: 0.18 },
    { x: 0, y: 2, rot: 0 },
  ];
  sticks.forEach(({ x, y, rot }) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const grad = ctx.createLinearGradient(-6, 0, 6, 0);
    grad.addColorStop(0, "#f06848");
    grad.addColorStop(0.5, "#c43820");
    grad.addColorStop(1, "#6a1808");
    ctx.fillStyle = grad;
    rr(ctx, -5, -16, 10, 28, 2);
    ctx.fill();
    ctx.strokeStyle = "#3a0a04";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,220,180,0.45)";
    [-10, -2, 6].forEach((sy) => {
      ctx.beginPath();
      ctx.rect(-5, sy, 10, 2);
      ctx.fill();
    });
    const capGrad = ctx.createLinearGradient(0, -18, 0, -12);
    capGrad.addColorStop(0, "#f8d860");
    capGrad.addColorStop(0.5, "#c89028");
    capGrad.addColorStop(1, "#7a5008");
    ctx.fillStyle = capGrad;
    rr(ctx, -5, -18, 10, 5, 1);
    ctx.fill();
    ctx.strokeStyle = "#4a3008";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,240,180,0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-4, -17);
    ctx.lineTo(4, -17);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(-3, -4, 1, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.fillStyle = "#1a1004";
  rr(ctx, -14, -2, 28, 8, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#0a0402";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.lineTo(13, 0);
  ctx.stroke();
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(6, -20, 4, -24, -4, -22);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,200,80,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(6, -20, 4, -24, -4, -22);
  ctx.stroke();
  const glow = ctx.createRadialGradient(-4, -22, 1, -4, -22, 9);
  glow.addColorStop(0, "rgba(255,240,180,0.85)");
  glow.addColorStop(0.4, "rgba(255,180,40,0.5)");
  glow.addColorStop(1, "rgba(255,140,20,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(-4, -22, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath();
  ctx.arc(-4, -22, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe080";
  ctx.beginPath();
  ctx.arc(-4, -22, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawHoneyroll(ctx) {
  drawShadow(ctx, 18, 4);
  const ringGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 22);
  ringGrad.addColorStop(0, "#fff0a8");
  ringGrad.addColorStop(0.4, "#f4c850");
  ringGrad.addColorStop(0.85, "#c88018");
  ringGrad.addColorStop(1, "#6a3808");
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 12, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(120,70,16,0.7)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 4, 15 - i * 3.5, 10 - i * 2.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,240,180,0.55)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 3, 14.6 - i * 3.5, 9.6 - i * 2.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "#5a2818";
  [[-9, 0], [-3, -2], [5, 2], [10, -3], [-6, 8], [2, 9], [8, 6], [-10, 6]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 1, 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#e8c038";
  [[-5, -1, 1.1], [4, 3, 1], [-7, 5, 0.9], [7, -1, 1]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  const dripGrad = ctx.createLinearGradient(14, 0, 18, 18);
  dripGrad.addColorStop(0, "#fff080");
  dripGrad.addColorStop(0.5, "#f0b820");
  dripGrad.addColorStop(1, "#a86808");
  ctx.fillStyle = dripGrad;
  ctx.beginPath();
  ctx.moveTo(12, 6);
  ctx.bezierCurveTo(18, 8, 20, 12, 18, 18);
  ctx.bezierCurveTo(15, 20, 13, 16, 12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4408";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(15, 10, 1, 2.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,200,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, -3, 6, 2.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHarvestpie(ctx) {
  drawShadow(ctx, 22, 4);
  ctx.fillStyle = "#9a8870";
  ctx.beginPath();
  ctx.ellipse(0, 12, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2818";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4, 20, 10, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#5a1828";
  ctx.fillRect(-22, -8, 44, 24);
  ctx.fillStyle = "#8a2438";
  [[-8, 0, 3], [4, 2, 2.6], [10, -2, 2.4], [-12, 4, 2.6], [0, 6, 2.4], [-4, -2, 2.2], [12, 4, 2.4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(255,180,180,0.5)";
  [[-8, -1, 0.9], [4, 1, 0.8], [10, -3, 0.7]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  const crustGrad = ctx.createLinearGradient(0, -8, 0, 12);
  crustGrad.addColorStop(0, "#f8d090");
  crustGrad.addColorStop(0.5, "#d49058");
  crustGrad.addColorStop(1, "#7a4218");
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4, 20, 10, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = crustGrad;
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  for (let i = -22; i <= 22; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i - 10, -10);
    ctx.lineTo(i + 10, 14);
    ctx.stroke();
  }
  for (let i = -22; i <= 22; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i - 10, 14);
    ctx.lineTo(i + 10, -10);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 4, 20, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#5a2a08";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const cx = Math.cos(a) * 20;
    const cy = 4 + Math.sin(a) * 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,250,210,0.5)";
  ctx.beginPath();
  ctx.ellipse(-7, -2, 7, 2.4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  [[-5, -10], [5, -10]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 3, y - 4, x + 3, y - 8, x, y - 14);
    ctx.stroke();
  });
}

function drawPreserve(ctx) {
  drawShadow(ctx, 16, 4);
  const jarGrad = ctx.createLinearGradient(-10, 0, 10, 0);
  jarGrad.addColorStop(0, "rgba(232,232,240,0.7)");
  jarGrad.addColorStop(0.5, "rgba(200,200,210,0.55)");
  jarGrad.addColorStop(1, "rgba(140,140,150,0.75)");
  ctx.fillStyle = jarGrad;
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.bezierCurveTo(-13, 4, -13, 16, -10, 20);
  ctx.lineTo(10, 20);
  ctx.bezierCurveTo(13, 16, 13, 4, 11, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3840";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.bezierCurveTo(-13, 4, -13, 16, -10, 20);
  ctx.lineTo(10, 20);
  ctx.bezierCurveTo(13, 16, 13, 4, 11, -8);
  ctx.closePath();
  ctx.clip();
  const jamGrad = ctx.createLinearGradient(0, -2, 0, 20);
  jamGrad.addColorStop(0, "#c068a0");
  jamGrad.addColorStop(0.5, "#9a4880");
  jamGrad.addColorStop(1, "#5a1c4a");
  ctx.fillStyle = jamGrad;
  ctx.fillRect(-13, -2, 26, 24);
  ctx.fillStyle = "rgba(60,12,40,0.6)";
  [[-6, 6, 1.6], [4, 10, 1.4], [-2, 14, 1.2], [6, 2, 1.3], [-8, 16, 1.2]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(255,200,220,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, 4, 4, 1.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#e8b8b0";
  ctx.beginPath();
  ctx.moveTo(-13, -10);
  ctx.bezierCurveTo(-12, -16, 12, -16, 13, -10);
  ctx.bezierCurveTo(12, -6, -12, -6, -13, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4838";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,70,55,0.7)";
  ctx.lineWidth = 0.6;
  for (let i = -10; i <= 10; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, -14);
    ctx.lineTo(i - 0.5, -7);
    ctx.stroke();
  }
  ctx.strokeStyle = "#a87838";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.bezierCurveTo(-10, -10, 10, -10, 12, -8);
  ctx.stroke();
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-2, -4);
  ctx.lineTo(2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff5d8";
  rr(ctx, -7, 7, 14, 8, 1);
  ctx.fill();
  ctx.strokeStyle = "#7a4838";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#5a2848";
  ctx.font = "bold 6px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("JAM", 0, 11);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.bezierCurveTo(-11, 4, -11, 12, -8, 16);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.bezierCurveTo(10, 6, 10, 12, 8, 14);
  ctx.stroke();
}

function drawTincture(ctx) {
  drawShadow(ctx, 14, 4);
  const halo = ctx.createRadialGradient(0, 6, 2, 0, 6, 22);
  halo.addColorStop(0, "rgba(160,220,80,0.55)");
  halo.addColorStop(0.6, "rgba(120,180,40,0.2)");
  halo.addColorStop(1, "rgba(120,180,40,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 6, 22, 0, Math.PI * 2);
  ctx.fill();
  const glassGrad = ctx.createLinearGradient(-8, 0, 8, 0);
  glassGrad.addColorStop(0, "rgba(220,240,224,0.7)");
  glassGrad.addColorStop(0.5, "rgba(180,210,184,0.45)");
  glassGrad.addColorStop(1, "rgba(120,150,124,0.7)");
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.moveTo(-5, -4);
  ctx.lineTo(-9, 10);
  ctx.bezierCurveTo(-9, 18, 9, 18, 9, 10);
  ctx.lineTo(5, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4a2a";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-5, -4);
  ctx.lineTo(-9, 10);
  ctx.bezierCurveTo(-9, 18, 9, 18, 9, 10);
  ctx.lineTo(5, -4);
  ctx.closePath();
  ctx.clip();
  const liquidGrad = ctx.createLinearGradient(0, 2, 0, 18);
  liquidGrad.addColorStop(0, "#a8d048");
  liquidGrad.addColorStop(0.5, "#6b8a3a");
  liquidGrad.addColorStop(1, "#304018");
  ctx.fillStyle = liquidGrad;
  ctx.fillRect(-12, 2, 24, 20);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 8, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(200,255,140,0.45)";
  ctx.beginPath();
  ctx.ellipse(-4, 4, 3, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-6, 6, 1.4, 6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  const corkGrad = ctx.createLinearGradient(0, -10, 0, -4);
  corkGrad.addColorStop(0, "#c89058");
  corkGrad.addColorStop(0.5, "#8a5828");
  corkGrad.addColorStop(1, "#4a2a10");
  ctx.fillStyle = corkGrad;
  rr(ctx, -4, -10, 8, 6, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(60,28,8,0.6)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-3, -7);
  ctx.lineTo(3, -7);
  ctx.stroke();
  ctx.fillStyle = "#c84830";
  ctx.beginPath();
  ctx.ellipse(0, -14, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a1c10";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,180,160,0.6)";
  ctx.beginPath();
  ctx.ellipse(-1, -15, 1.4, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(6, -6);
  ctx.bezierCurveTo(10, -4, 12, 0, 11, 4);
  ctx.stroke();
  ctx.fillStyle = "#f0e0a8";
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(15, 4);
  ctx.lineTo(14, 9);
  ctx.lineTo(8, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.fillStyle = "#c84830";
  ctx.beginPath();
  ctx.arc(11.5, 5.5, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.ellipse(-3, -2, 1, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawIronHinge(ctx) {
  drawShadow(ctx, 18, 4);
  const plateGrad = ctx.createLinearGradient(0, -10, 0, 10);
  plateGrad.addColorStop(0, "#b0bac4");
  plateGrad.addColorStop(0.5, "#7a8a96");
  plateGrad.addColorStop(1, "#3a4650");
  ctx.fillStyle = plateGrad;
  rr(ctx, -16, -10, 13, 20, 2);
  ctx.fill();
  ctx.strokeStyle = "#1a2228";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = plateGrad;
  rr(ctx, 3, -10, 13, 20, 2);
  ctx.fill();
  ctx.strokeStyle = "#1a2228";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-15, -8);
  ctx.lineTo(-4, -8);
  ctx.moveTo(4, -8);
  ctx.lineTo(15, -8);
  ctx.stroke();
  ctx.fillStyle = "rgba(120,40,20,0.4)";
  [[-14, 7, 1.8], [14, 7, 1.6], [-13, -8, 1.2], [13, -8, 1.4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  const pinGrad = ctx.createLinearGradient(-4, 0, 4, 0);
  pinGrad.addColorStop(0, "#3a4650");
  pinGrad.addColorStop(0.4, "#7a8a96");
  pinGrad.addColorStop(1, "#1a2228");
  ctx.fillStyle = pinGrad;
  rr(ctx, -3, -12, 6, 24, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#0a1018";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#5a6a76";
  ctx.beginPath();
  ctx.ellipse(0, -12, 3, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a1018";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#5a6a76";
  ctx.beginPath();
  ctx.ellipse(0, 12, 3, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a1018";
  ctx.lineWidth = 1;
  ctx.stroke();
  const screws = [[-10, -5], [-10, 5], [10, -5], [10, 5]];
  screws.forEach(([x, y]) => {
    const sg = ctx.createRadialGradient(x - 0.6, y - 0.6, 0.3, x, y, 2.4);
    sg.addColorStop(0, "#c8d0d8");
    sg.addColorStop(0.6, "#6a7682");
    sg.addColorStop(1, "#1a2228");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0a1018";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.strokeStyle = "#1a2228";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - 1.6, y - 0.4);
    ctx.lineTo(x + 1.6, y + 0.4);
    ctx.moveTo(x - 0.4, y - 1.6);
    ctx.lineTo(x + 0.4, y + 1.6);
    ctx.stroke();
  });
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-11, -4, 2, 5, -0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawIronframe(ctx) {
  drawShadow(ctx, 20, 4);
  const barGrad = ctx.createLinearGradient(0, -14, 0, 14);
  barGrad.addColorStop(0, "#a8b4c0");
  barGrad.addColorStop(0.5, "#6a7a86");
  barGrad.addColorStop(1, "#2a3040");
  ctx.fillStyle = barGrad;
  rr(ctx, -16, -16, 32, 32, 4);
  ctx.fill();
  ctx.strokeStyle = "#1a1c28";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = "#2a2c36";
  rr(ctx, -12, -12, 24, 24, 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0c14";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-14, -15);
  ctx.lineTo(14, -15);
  ctx.stroke();
  ctx.strokeStyle = "#1a1c28";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  const corners = [
    { x: -12, y: -12, dx: 1, dy: 1 },
    { x: 12, y: -12, dx: -1, dy: 1 },
    { x: -12, y: 12, dx: 1, dy: -1 },
    { x: 12, y: 12, dx: -1, dy: -1 },
  ];
  corners.forEach(({ x, y, dx, dy }) => {
    ctx.beginPath();
    ctx.moveTo(x + 5 * dx, y + 1 * dy);
    ctx.bezierCurveTo(x + 5 * dx, y + 4 * dy, x + 1 * dx, y + 4 * dy, x + 1 * dx, y + 1 * dy);
    ctx.bezierCurveTo(x + 1 * dx, y, x + 3 * dx, y, x + 3 * dx, y + 2 * dy);
    ctx.stroke();
  });
  const sides = [
    { x: 0, y: -16, rot: 0 },
    { x: 0, y: 16, rot: Math.PI },
    { x: -16, y: 0, rot: -Math.PI / 2 },
    { x: 16, y: 0, rot: Math.PI / 2 },
  ];
  sides.forEach(({ x, y, rot }) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = "#7a8894";
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.bezierCurveTo(-3, -3, -4, 0, -2, 1);
    ctx.bezierCurveTo(0, 2, 0, 2, 0, 4);
    ctx.bezierCurveTo(0, 2, 0, 2, 2, 1);
    ctx.bezierCurveTo(4, 0, 3, -3, 0, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a1c28";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  });
  const bossGrad = ctx.createRadialGradient(-0.8, -0.8, 0.5, 0, 0, 3.5);
  bossGrad.addColorStop(0, "#c8d0d8");
  bossGrad.addColorStop(0.5, "#6a7682");
  bossGrad.addColorStop(1, "#1a1c28");
  ctx.fillStyle = bossGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0c14";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.arc(-1, -1, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-14, -4, 1.4, 8, -0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawCobblepath(ctx) {
  drawShadow(ctx, 22, 4);
  ctx.fillStyle = "#2a2418";
  rr(ctx, -22, -14, 44, 32, 3);
  ctx.fill();
  ctx.strokeStyle = "#1a1408";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const stones = [
    { x: -14, y: -8, rx: 6, ry: 5, rot: 0.2 },
    { x: 0, y: -10, rx: 7, ry: 5, rot: -0.15 },
    { x: 13, y: -7, rx: 6, ry: 5, rot: 0.1 },
    { x: -12, y: 4, rx: 8, ry: 6, rot: -0.1 },
    { x: 3, y: 5, rx: 8, ry: 6.5, rot: 0.15 },
    { x: 16, y: 6, rx: 6, ry: 5.5, rot: -0.1 },
    { x: -6, y: 14, rx: 7, ry: 4.5, rot: 0.05 },
    { x: 10, y: 14, rx: 7, ry: 4.5, rot: -0.05 },
  ];
  stones.forEach(({ x, y, rx, ry, rot }) => {
    const grad = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 0.5, x, y, Math.max(rx, ry));
    grad.addColorStop(0, "#c8c4b0");
    grad.addColorStop(0.5, "#9a948a");
    grad.addColorStop(1, "#5a544a");
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a342a";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(-rx * 0.4, -ry * 0.45, rx * 0.45, ry * 0.25, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.fillStyle = "rgba(90,128,40,0.7)";
  [[-7, -3, 1.6, 0.6], [8, 0, 1.4, 0.5], [-3, 9, 1.2, 0.5], [13, -2, 1, 0.5], [-2, -15, 1.4, 0.5]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(140,180,80,0.7)";
  [[-7, -3.4, 0.5], [8, -0.3, 0.4], [-3, 8.7, 0.4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGoldring(ctx) {
  drawShadow(ctx, 16, 4);
  ctx.save();
  ctx.rotate(-0.5);
  const ringGrad = ctx.createLinearGradient(0, -8, 0, 8);
  ringGrad.addColorStop(0, "#fff5b0");
  ringGrad.addColorStop(0.3, "#ffd34c");
  ringGrad.addColorStop(0.7, "#c89818");
  ringGrad.addColorStop(1, "#7a5408");
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3808";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#3a2408";
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#7a5408";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,80,8,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -2.5, 13, 1.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 2.5, 13, 1.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,250,200,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.ellipse(0, -3, 12.6, 1, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 2, 12.6, 1, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 8, 0, Math.PI * 1.1, Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();
  const gemGrad = ctx.createRadialGradient(-1, -10, 0.5, 0, -8, 6);
  gemGrad.addColorStop(0, "#ffffff");
  gemGrad.addColorStop(0.4, "#d8f0ff");
  gemGrad.addColorStop(1, "#5a8aa8");
  ctx.fillStyle = gemGrad;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(4, -8);
  ctx.lineTo(0, -2);
  ctx.lineTo(-4, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4a5a";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, -2);
  ctx.moveTo(-4, -8);
  ctx.lineTo(4, -8);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(-1.4, -10, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a5408";
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.lineTo(-5, -2);
  ctx.lineTo(-2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(3, -4);
  ctx.lineTo(5, -2);
  ctx.lineTo(2, 0);
  ctx.closePath();
  ctx.fill();
}

function drawGemcrown(ctx) {
  drawShadow(ctx, 20, 4);
  ctx.fillStyle = "#7a1c2a";
  rr(ctx, -16, 8, 32, 6, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a0c10";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#c83040";
  for (let x = -14; x <= 14; x += 4) {
    ctx.beginPath();
    ctx.arc(x, 8, 1.8, 0, Math.PI);
    ctx.fill();
  }
  const bandGrad = ctx.createLinearGradient(0, -2, 0, 12);
  bandGrad.addColorStop(0, "#fff5b0");
  bandGrad.addColorStop(0.4, "#ffd34c");
  bandGrad.addColorStop(0.8, "#c89018");
  bandGrad.addColorStop(1, "#7a5408");
  ctx.fillStyle = bandGrad;
  rr(ctx, -18, -2, 36, 12, 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3808";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,250,210,0.65)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-17, -1);
  ctx.lineTo(17, -1);
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,80,8,0.7)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-17, 8);
  ctx.lineTo(17, 8);
  ctx.stroke();
  const spikeGrad = ctx.createLinearGradient(0, -16, 0, 0);
  spikeGrad.addColorStop(0, "#fff5b0");
  spikeGrad.addColorStop(0.5, "#ffd34c");
  spikeGrad.addColorStop(1, "#a87808");
  ctx.fillStyle = spikeGrad;
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.lineTo(-14, -10);
  ctx.lineTo(-10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, -2);
  ctx.lineTo(14, -10);
  ctx.lineTo(18, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(0, -18);
  ctx.lineTo(6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const sapphire = ctx.createLinearGradient(0, -20, 0, -10);
  sapphire.addColorStop(0, "#a8d8ff");
  sapphire.addColorStop(0.5, "#3870c8");
  sapphire.addColorStop(1, "#0a2868");
  ctx.fillStyle = sapphire;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(3, -18);
  ctx.lineTo(0, -12);
  ctx.lineTo(-3, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a1838";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(200,230,255,0.8)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, -12);
  ctx.moveTo(-3, -18);
  ctx.lineTo(3, -18);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(-1, -19, 0.7, 0, Math.PI * 2);
  ctx.fill();
  const ruby = ctx.createLinearGradient(0, -12, 0, -4);
  ruby.addColorStop(0, "#ff90a0");
  ruby.addColorStop(0.5, "#c81830");
  ruby.addColorStop(1, "#5a0810");
  ctx.fillStyle = ruby;
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.lineTo(-12, -10);
  ctx.lineTo(-14, -6);
  ctx.lineTo(-16, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0808";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,200,200,0.8)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.lineTo(-14, -6);
  ctx.moveTo(-16, -10);
  ctx.lineTo(-12, -10);
  ctx.stroke();
  const emerald = ctx.createLinearGradient(0, -12, 0, -4);
  emerald.addColorStop(0, "#a0f0c0");
  emerald.addColorStop(0.5, "#1c9050");
  emerald.addColorStop(1, "#0a3818");
  ctx.fillStyle = emerald;
  ctx.beginPath();
  ctx.moveTo(14, -14);
  ctx.lineTo(16, -10);
  ctx.lineTo(14, -6);
  ctx.lineTo(12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a3818";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(180,255,200,0.8)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(14, -14);
  ctx.lineTo(14, -6);
  ctx.moveTo(12, -10);
  ctx.lineTo(16, -10);
  ctx.stroke();
  ctx.fillStyle = "#65e5ff";
  [[-8, 4], [0, 4], [8, 4]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1060a0";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(x - 0.5, y - 0.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#65e5ff";
  });
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-10, 0, 4, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStonework(ctx) {
  drawShadow(ctx, 22, 4);
  const blocks = [
    { x: -16, y: 10, w: 16, h: 9, light: 0 },
    { x: 0, y: 10, w: 14, h: 9, light: 0.1 },
    { x: -14, y: -1, w: 16, h: 9, light: 0.15 },
    { x: 2, y: -1, w: 16, h: 9, light: 0.05 },
    { x: -4, y: -12, w: 14, h: 9, light: 0.25 },
  ];
  blocks.forEach(({ x, y, w, h, light }) => {
    const top = `rgb(${168 + light * 40}, ${168 + light * 40}, ${148 + light * 40})`;
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, top);
    grad.addColorStop(0.5, "#8a8474");
    grad.addColorStop(1, "#4a4438");
    ctx.fillStyle = grad;
    rr(ctx, x, y, w, h, 1.4);
    ctx.fill();
    ctx.strokeStyle = "#2a2418";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "rgba(200,200,180,0.55)";
    ctx.beginPath();
    ctx.moveTo(x + 1.4, y);
    ctx.lineTo(x + w - 1.4, y);
    ctx.lineTo(x + w - 2.4, y + 1.4);
    ctx.lineTo(x + 2.4, y + 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(58,52,40,0.6)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x + 1.4, y);
    ctx.lineTo(x + 2.4, y + 1.4);
    ctx.moveTo(x + w - 1.4, y);
    ctx.lineTo(x + w - 2.4, y + 1.4);
    ctx.stroke();
  });
  ctx.strokeStyle = "#1a140a";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-2, 10);
  ctx.lineTo(-2, 19);
  ctx.moveTo(-16, 8);
  ctx.lineTo(18, 8);
  ctx.moveTo(2, -1);
  ctx.lineTo(2, 8);
  ctx.moveTo(-14, -3);
  ctx.lineTo(18, -3);
  ctx.stroke();
  ctx.strokeStyle = "#3a3020";
  ctx.lineWidth = 0.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(6, 12);
  ctx.lineTo(8, 15);
  ctx.moveTo(7, 12.5);
  ctx.lineTo(9, 14);
  ctx.stroke();
  ctx.strokeStyle = "#1a140a";
  ctx.lineWidth = 0.6;
  [[-10, 2], [0, 4], [-8, 13], [8, 13], [4, -8]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.4, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-12, -10, 4, 1, -0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawChowder(ctx) {
  drawShadow(ctx, 22, 4);
  const bowlGrad = ctx.createLinearGradient(0, -4, 0, 18);
  bowlGrad.addColorStop(0, "#c8d4dc");
  bowlGrad.addColorStop(0.4, "#8aa0ac");
  bowlGrad.addColorStop(1, "#3a4a58");
  ctx.fillStyle = bowlGrad;
  ctx.beginPath();
  ctx.moveTo(-20, -2);
  ctx.bezierCurveTo(-20, 16, 20, 16, 20, -2);
  ctx.bezierCurveTo(18, 2, -18, 2, -20, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a2228";
  ctx.lineWidth = 2;
  ctx.stroke();
  const soupGrad = ctx.createRadialGradient(-4, -4, 2, 0, -2, 22);
  soupGrad.addColorStop(0, "#fff8e8");
  soupGrad.addColorStop(0.55, "#e8d8b8");
  soupGrad.addColorStop(1, "#a88858");
  ctx.fillStyle = soupGrad;
  ctx.beginPath();
  ctx.ellipse(0, -2, 19, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a6038";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#f0d050";
  [[-8, -3, 1.4, 0.7], [4, -1, 1.2, 0.6], [-2, -4, 1.3, 0.7]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(120,80,20,0.5)";
  ctx.lineWidth = 0.4;
  [[-8, -3, 1.4, 0.7], [4, -1, 1.2, 0.6]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = "#fafaf0";
  [[6, -4, 3, 1.4], [-10, 0, 2.6, 1.2]].forEach(([x, y, w, h]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.1);
    rr(ctx, -w / 2, -h / 2, w, h, 0.4);
    ctx.fill();
    ctx.strokeStyle = "#a89070";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  });
  ctx.fillStyle = "#fff5d0";
  [[8, -1, 1.4], [-4, 0, 1.2], [2, 1, 1.1]].forEach(([x, y, s]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.4);
    rr(ctx, -s / 2, -s / 2, s, s, 0.3);
    ctx.fill();
    ctx.strokeStyle = "#a88858";
    ctx.lineWidth = 0.4;
    ctx.stroke();
    ctx.restore();
  });
  ctx.fillStyle = "#5a8028";
  [[-6, -1, 1, 0.5], [10, -2, 0.8, 0.4]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-10, -3, 5, 1.2, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-16, 4, 1.4, 5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  [[-6, -10], [0, -12], [5, -10]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 3, y - 4, x + 3, y - 8, x, y - 13);
    ctx.stroke();
  });
  ctx.save();
  ctx.translate(14, -2);
  ctx.rotate(0.5);
  const spoonGrad = ctx.createLinearGradient(0, -16, 0, 4);
  spoonGrad.addColorStop(0, "#c89548");
  spoonGrad.addColorStop(1, "#5a3414");
  ctx.strokeStyle = spoonGrad;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(2, -14);
  ctx.stroke();
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.ellipse(2, -14, 2.6, 1.6, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

function drawFishOilBottled(ctx) {
  drawShadow(ctx, 14, 4);
  const glassGrad = ctx.createLinearGradient(-8, 0, 8, 0);
  glassGrad.addColorStop(0, "rgba(240,236,220,0.75)");
  glassGrad.addColorStop(0.5, "rgba(220,210,180,0.55)");
  glassGrad.addColorStop(1, "rgba(150,140,110,0.75)");
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(-4, -2);
  ctx.lineTo(-10, 8);
  ctx.bezierCurveTo(-10, 18, 10, 18, 10, 8);
  ctx.lineTo(4, -2);
  ctx.lineTo(4, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3020";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(-4, -2);
  ctx.lineTo(-10, 8);
  ctx.bezierCurveTo(-10, 18, 10, 18, 10, 8);
  ctx.lineTo(4, -2);
  ctx.lineTo(4, -8);
  ctx.closePath();
  ctx.clip();
  const oilGrad = ctx.createLinearGradient(0, 0, 0, 18);
  oilGrad.addColorStop(0, "#fff080");
  oilGrad.addColorStop(0.45, "#e8d050");
  oilGrad.addColorStop(1, "#7a6018");
  ctx.fillStyle = oilGrad;
  ctx.fillRect(-12, 0, 24, 22);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,240,160,0.5)";
  ctx.beginPath();
  ctx.ellipse(-3, 2, 3, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-7, 6, 1.6, 7, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(7, 8, 1, 4, -0.1, 0, Math.PI * 2);
  ctx.fill();
  const corkGrad = ctx.createLinearGradient(0, -12, 0, -8);
  corkGrad.addColorStop(0, "#c89058");
  corkGrad.addColorStop(0.5, "#8a5828");
  corkGrad.addColorStop(1, "#4a2a10");
  ctx.fillStyle = corkGrad;
  rr(ctx, -4, -12, 8, 5, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(60,28,8,0.6)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-3, -10);
  ctx.lineTo(3, -10);
  ctx.stroke();
  ctx.strokeStyle = "#a87838";
  ctx.lineWidth = 1.4;
  for (let y = -6; y <= -3; y += 1.2) {
    ctx.beginPath();
    ctx.moveTo(-4, y);
    ctx.bezierCurveTo(-2, y - 0.3, 2, y + 0.3, 4, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(3, -5);
  ctx.bezierCurveTo(8, -3, 10, 0, 9, 4);
  ctx.stroke();
  ctx.fillStyle = "#f0e0a8";
  ctx.beginPath();
  ctx.moveTo(7, 2);
  ctx.lineTo(13, 4);
  ctx.lineTo(12, 10);
  ctx.lineTo(6, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,80,20,0.7)";
  ctx.lineWidth = 0.4;
  ctx.setLineDash([0.8, 0.6]);
  ctx.beginPath();
  ctx.moveTo(7, 2.4);
  ctx.lineTo(12.6, 4.4);
  ctx.lineTo(11.6, 9.6);
  ctx.lineTo(6.4, 7.6);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#7a3818";
  ctx.font = "bold 5px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FO", 9.5, 6);
}

function drawLantern(ctx) {
  // Handle
  ctx.strokeStyle = "#3a3a40";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -12, 6, Math.PI, 0);
  ctx.stroke();

  // Top cap
  ctx.fillStyle = "#5a6a76";
  ctx.beginPath();
  ctx.moveTo(-8, -10);
  ctx.lineTo(8, -10);
  ctx.lineTo(4, -16);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glass body
  ctx.fillStyle = "#f4e090";
  ctx.globalAlpha = 0.8;
  rr(ctx, -6, -10, 12, 18, 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Inner glow/flame
  ctx.fillStyle = "#d4783a";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  // Base
  ctx.fillStyle = "#5a6a76";
  ctx.fillRect(-8, 8, 16, 4);
  ctx.strokeRect(-8, 8, 16, 4);

  // Frame lines
  ctx.beginPath();
  ctx.moveTo(-6, -10); ctx.lineTo(-6, 8);
  ctx.moveTo(6, -10); ctx.lineTo(6, 8);
  ctx.stroke();
}

export const ICONS = {
  water_pump:  { label: "Water Pump", color: "#c84a3a", draw: drawWaterPump },
  explosives:  { label: "Explosives", color: "#d44a3a", draw: drawExplosives },
  honeyroll:   { label: "Honey Roll", color: "#f0c050", draw: drawHoneyroll },
  harvestpie:  { label: "Harvest Pie", color: "#d4784a", draw: drawHarvestpie },
  preserve:    { label: "Preserve Jar", color: "#9a6888", draw: drawPreserve },
  tincture:    { label: "Berry Tincture", color: "#6b8a3a", draw: drawTincture },
  iron_hinge:  { label: "Iron Hinge", color: "#7a8a96", draw: drawIronHinge },
  ironframe:   { label: "Iron Frame", color: "#6a7a86", draw: drawIronframe },
  cobblepath:  { label: "Cobble Path", color: "#9a9a8a", draw: drawCobblepath },
  lantern:     { label: "Iron Lantern", color: "#d4783a", draw: drawLantern },
  goldring:    { label: "Gold Ring", color: "#ffd34c", draw: drawGoldring },
  gemcrown:    { label: "Gem Crown", color: "#65e5ff", draw: drawGemcrown },
  stonework:   { label: "Stonework", color: "#8a8a7a", draw: drawStonework },
  chowder:     { label: "Chowder", color: "#d4b888", draw: drawChowder },
  fish_oil_bottled: { label: "Fish Oil (Bottled)", color: "#e8d050", draw: drawFishOilBottled },
};
