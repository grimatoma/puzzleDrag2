import { rr } from "./helpers.js";

export function drawWoodIcon(ctx, key) {
  if (key === "wood_log") {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(2, 18, 26, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createLinearGradient(0, -14, 0, 14);
    grad.addColorStop(0, "#a4734a");
    grad.addColorStop(0.5, "#7c4f25");
    grad.addColorStop(1, "#54331a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-22, -14);
    ctx.lineTo(12, -14);
    ctx.quadraticCurveTo(20, -14, 20, -3);
    ctx.lineTo(20, 3);
    ctx.quadraticCurveTo(20, 14, 12, 14);
    ctx.lineTo(-22, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2210";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(58,34,16,0.65)";
    ctx.lineWidth = 1.3;
    [-18, -12, -6, 0, 6].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -12);
      ctx.lineTo(x + 1, 12);
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(255,220,170,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(10, -10);
    ctx.stroke();
    const cap = ctx.createRadialGradient(13, 0, 1, 13, 0, 14);
    cap.addColorStop(0, "#e8b787");
    cap.addColorStop(0.6, "#c08c54");
    cap.addColorStop(1, "#7c5026");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(13, 0, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a2210";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(58,34,16,0.6)";
    ctx.lineWidth = 1;
    [3, 6, 9].forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(13, 0, r * 0.7, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = "#3a2210";
    ctx.beginPath();
    ctx.ellipse(13, 0, 1.2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }

  if (key === "wood_plank") {
    ctx.save();
    ctx.rotate(-0.18);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    rr(ctx, -25, 13, 50, 8, 3);
    ctx.fill();
    const grad = ctx.createLinearGradient(0, -14, 0, 14);
    grad.addColorStop(0, "#e3a268");
    grad.addColorStop(0.5, "#bd7a3c");
    grad.addColorStop(1, "#7e4e1f");
    ctx.fillStyle = grad;
    rr(ctx, -26, -10, 52, 22, 3);
    ctx.fill();
    ctx.strokeStyle = "#3e2410";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(62,36,16,0.5)";
    ctx.lineWidth = 1;
    [-5, 0, 5].forEach((y0) => {
      ctx.beginPath();
      ctx.moveTo(-24, y0);
      ctx.bezierCurveTo(-12, y0 - 1.5, 4, y0 + 1.8, 24, y0 - 0.5);
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(255,230,180,0.6)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-23, -8);
    ctx.lineTo(23, -8);
    ctx.stroke();
    [-16, 16].forEach((nx) => {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.arc(nx + 0.5, 0.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      const ng = ctx.createRadialGradient(nx - 0.6, -0.6, 0.4, nx, 0, 3);
      ng.addColorStop(0, "#dadfe4");
      ng.addColorStop(1, "#3a4248");
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(nx, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1a1f24";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
    ctx.restore();
    return true;
  }

  if (key === "wood_beam") {
    ctx.save();
    ctx.rotate(-0.15);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    rr(ctx, -26, 14, 52, 8, 4);
    ctx.fill();
    const grad = ctx.createLinearGradient(0, -16, 0, 16);
    grad.addColorStop(0, "#8e5b2b");
    grad.addColorStop(0.5, "#5e3a18");
    grad.addColorStop(1, "#33200c");
    ctx.fillStyle = grad;
    rr(ctx, -26, -14, 52, 28, 3);
    ctx.fill();
    ctx.strokeStyle = "#1a0e04";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(20,12,4,0.55)";
    ctx.lineWidth = 1.1;
    [-8, -3, 3, 8].forEach((y0) => {
      ctx.beginPath();
      ctx.moveTo(-24, y0);
      ctx.bezierCurveTo(-10, y0 - 1.6, 8, y0 + 2, 24, y0 - 0.6);
      ctx.stroke();
    });
    ctx.fillStyle = "rgba(40,20,8,0.7)";
    rr(ctx, 22, -13, 4, 26, 1);
    ctx.fill();
    [-1, 1].forEach((side) => {
      const x = side * 18;
      const bg = ctx.createLinearGradient(x, -14, x, 14);
      bg.addColorStop(0, "#7a8590");
      bg.addColorStop(0.5, "#3e464c");
      bg.addColorStop(1, "#1a1f24");
      ctx.fillStyle = bg;
      rr(ctx, x - 4, -15, 8, 30, 1);
      ctx.fill();
      ctx.strokeStyle = "#0a0d10";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      [-9, 0, 9].forEach((ry) => {
        const rg = ctx.createRadialGradient(x - 0.6, ry - 0.6, 0.3, x, ry, 2);
        rg.addColorStop(0, "#dadfe4");
        rg.addColorStop(1, "#222730");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, ry, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    ctx.strokeStyle = "rgba(255,210,160,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-22, -12);
    ctx.lineTo(22, -12);
    ctx.stroke();
    ctx.restore();
    return true;
  }

  return false;
}
