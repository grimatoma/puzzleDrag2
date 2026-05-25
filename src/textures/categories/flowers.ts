// Flowers.

function drawPansy(ctx: CanvasRenderingContext2D) {
  // Soil shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI*2); ctx.fill();
  // Stem
  ctx.strokeStyle = "#2a4810"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(-2, 8, 0, -2); ctx.stroke();
  // Leaves on stem
  ctx.fillStyle = "#3a6818";
  ctx.beginPath(); ctx.ellipse(-6, 14, 5, 2.6, -0.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1f2a08"; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.fillStyle = "#3a6818";
  ctx.beginPath(); ctx.ellipse(5, 6, 5, 2.6, 0.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1f2a08"; ctx.lineWidth = 1.0; ctx.stroke();
  // Pansy face — 5 broad overlapping petals arranged in the classic
  // two-up / two-side / one-down configuration. Drawn back-to-front so the
  // bottom petal layers on top.
  const drawPetal = (cx: number, cy: number, rx: number, ry: number, angle: number, c1: string, c2: string, outline = "#2a0a4a") => {
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, c1);
    grad.addColorStop(0.7, c2);
    grad.addColorStop(1, outline);
    ctx.fillStyle = grad;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  };
  // Two upper "ear" petals — purple
  drawPetal(-6, -10, 6, 7, -0.35, "#c8a8e8", "#7a3aa8");
  drawPetal( 6, -10, 6, 7,  0.35, "#c8a8e8", "#7a3aa8");
  // Two side petals — yellow with purple edge
  drawPetal(-9,  -2, 6, 6.5, -0.15, "#fff4a0", "#e8a020", "#5a2a8a");
  drawPetal( 9,  -2, 6, 6.5,  0.15, "#fff4a0", "#e8a020", "#5a2a8a");
  // Bottom petal — broad, drawn last so it sits in front
  drawPetal( 0,   3, 8, 6.5, 0, "#fff4a0", "#e8a020", "#5a2a8a");
  // Dark "blotch" radiating from the centre (signature pansy face markings)
  ctx.fillStyle = "rgba(40,8,60,0.55)";
  ctx.beginPath();
  ctx.ellipse(-5, -7, 2.8, 2.4, -0.4, 0, Math.PI * 2);
  ctx.ellipse( 5, -7, 2.8, 2.4,  0.4, 0, Math.PI * 2);
  ctx.ellipse( 0,  0, 4.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tiny veins fanning out from the centre
  ctx.strokeStyle = "rgba(40,8,60,0.85)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(Math.cos(a) * 5.5, -3 + Math.sin(a) * 5.5);
    ctx.stroke();
  }
  // Yellow centre
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath(); ctx.arc(0, -3, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#a8740a"; ctx.lineWidth = 1; ctx.stroke();
}

function drawWaterLily(ctx: CanvasRenderingContext2D) {
  const water = ctx.createRadialGradient(0, 4, 4, 0, 4, 26);
  water.addColorStop(0, "rgba(120,180,200,0.6)"); water.addColorStop(1, "rgba(20,60,90,0.1)");
  ctx.fillStyle = water;
  ctx.beginPath(); ctx.ellipse(0, 6, 26, 8, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.ellipse(0, 4, 22, 5, 0, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
  const padGrad = ctx.createRadialGradient(-4, 8, 3, 0, 8, 22);
  padGrad.addColorStop(0, "#7eb83a"); padGrad.addColorStop(0.7, "#3a6818"); padGrad.addColorStop(1, "#1f3a08");
  ctx.fillStyle = padGrad;
  ctx.beginPath();
  ctx.moveTo(2, 4);
  ctx.bezierCurveTo(-22, 4, -22, 22, 0, 22);
  ctx.bezierCurveTo(22, 22, 22, 4, 4, 4);
  ctx.lineTo(2, 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1f2a08"; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.strokeStyle = "rgba(31,42,8,0.6)"; ctx.lineWidth = 1.0;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI*0.55 + (i * Math.PI*0.9 / 6);
    ctx.beginPath(); ctx.moveTo(3, 4); ctx.lineTo(Math.cos(a)*20, 12 + Math.sin(a)*12); ctx.stroke();
  }
  const drawFlowerPetal = (angle: number, len: number, w: number, c1: string, c2: string) => {
    ctx.save(); ctx.translate(0, -2); ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, 0, 0, -len);
    grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(0, -len*0.6, w, len*0.6, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#a83a6a"; ctx.lineWidth = 1.0; ctx.stroke();
    ctx.restore();
  };
  for (let i = 0; i < 8; i++) drawFlowerPetal((i / 8) * Math.PI * 2, 11, 4, "#fff0f6", "#e890c0");
  for (let i = 0; i < 6; i++) drawFlowerPetal(0.4 + (i / 6) * Math.PI * 2, 8, 3.5, "#fff8fb", "#f4b8d0");
  ctx.fillStyle = "#f8d040";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(Math.cos(a)*2.5, -2 + Math.sin(a)*2.5, 1.3, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = "#a8740a";
  ctx.beginPath(); ctx.arc(0, -2, 2.2, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  tile_flower_pansy:      { label:"Pansy",      color:"#7a3aa8", draw:drawPansy },
  tile_flower_water_lily: { label:"Water Lily", color:"#e890c0", draw:drawWaterLily },
};
