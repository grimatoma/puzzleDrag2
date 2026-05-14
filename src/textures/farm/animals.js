export function drawAnimalsIcon(ctx, key) {
  if (key === "bird_egg") {
    ctx.fillStyle = "rgba(40,28,10,0.35)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createRadialGradient(-6, -10, 2, 0, 0, 28);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.55, "#f7e2b0");
    grad.addColorStop(1, "#8a6a28");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3e2a0e";
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.strokeStyle = "rgba(140,90,30,0.4)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(2, 6, 14, 18, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = "rgba(80,52,12,0.85)";
    [[-2, -8, 1.6], [5, -2, 1.4], [-7, 4, 1.8], [3, 10, 1.5], [-3, 14, 1.2], [8, 6, 1.2], [-9, -3, 1.2], [6, -12, 1.1]].forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, sr * 0.8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(-7, -12, 5, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(-9, -5, 1.5, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }

  if (key === "bird_turkey") {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 20, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const tailColors = ["#5a2f10", "#8a4a18", "#c08038", "#e8b048"];
    for (let layer = 0; layer < 4; layer++) {
      ctx.fillStyle = tailColors[layer];
      ctx.strokeStyle = "#2a1408";
      ctx.lineWidth = 1.2;
      const r = 22 - layer * 3;
      const startA = -Math.PI * 0.95;
      const endA   = -Math.PI * 0.05;
      const steps = 7 - layer;
      for (let i = 0; i < steps; i++) {
        const a = startA + (i / (steps - 1)) * (endA - startA);
        ctx.save();
        ctx.translate(0, 8);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.55, 3.2 - layer * 0.2, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,230,170,0.5)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.95);
        ctx.lineTo(0, -r * 0.2);
        ctx.stroke();
        ctx.strokeStyle = "#2a1408";
        ctx.lineWidth = 1.2;
        ctx.restore();
      }
    }
    const bodyGrad = ctx.createRadialGradient(-4, 4, 2, 0, 8, 16);
    bodyGrad.addColorStop(0, "#7a4a18");
    bodyGrad.addColorStop(1, "#3a1f08");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a0a04";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = "rgba(220,150,60,0.35)";
    ctx.beginPath();
    ctx.ellipse(-3, 6, 5, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a4a1a";
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a0a04";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "#f6c64a";
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.lineTo(11, -2);
    ctx.lineTo(5, -1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e3a08";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#c8242a";
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.quadraticCurveTo(8, 2, 4, 4);
    ctx.quadraticCurveTo(2, 2, 4, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5a0810";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = "#fff8e0";
    ctx.beginPath();
    ctx.arc(2, -5, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0a04";
    ctx.beginPath();
    ctx.arc(2.2, -5, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f6c64a";
    ctx.lineWidth = 1.6;
    [[-4, 18], [4, 18]].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy + 4);
      ctx.moveTo(fx, fy + 4);
      ctx.lineTo(fx - 2, fy + 6);
      ctx.moveTo(fx, fy + 4);
      ctx.lineTo(fx + 2, fy + 6);
      ctx.stroke();
    });
    return true;
  }

  return false;
}
