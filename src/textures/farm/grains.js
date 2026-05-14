import { rr } from "./helpers.js";

export function drawGrainsIcon(ctx, key) {
  if (key === "grain_wheat") {
    ctx.strokeStyle = "#6b4710";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(0, -12);
    ctx.stroke();
    ctx.strokeStyle = "#a47619";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(0, -12);
    ctx.stroke();
    ctx.fillStyle = "#8aab2e";
    ctx.strokeStyle = "#4a5c12";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(-12, 12, -18, 4);
    ctx.quadraticCurveTo(-10, 10, 0, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(12, 12, 18, 4);
    ctx.quadraticCurveTo(10, 10, 0, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (let row = 0; row < 4; row++) {
      const y = -8 + row * 6;
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(side * (5 - row * 0.5), y);
        ctx.rotate(side * (0.5 - row * 0.06));
        const grad = ctx.createLinearGradient(-4, -6, 4, 6);
        grad.addColorStop(0, "#fff0a0");
        grad.addColorStop(0.55, "#f4c84a");
        grad.addColorStop(1, "#a07418");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#6b4710";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.ellipse(-1.5, -3, 1.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
    ctx.strokeStyle = "#c89320";
    ctx.lineWidth = 1.5;
    [-4, -2, 0, 2, 4].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(dx, -16);
      ctx.lineTo(dx * 1.4, -26);
      ctx.stroke();
    });
    return true;
  }

  if (key === "grain") {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const body = ctx.createLinearGradient(0, -10, 0, 24);
    body.addColorStop(0, "#d8a458");
    body.addColorStop(1, "#8e5d24");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(-22, 16);
    ctx.quadraticCurveTo(-22, 24, -14, 24);
    ctx.lineTo(14, 24);
    ctx.quadraticCurveTo(22, 24, 22, 16);
    ctx.lineTo(18, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4a2e0e";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(74,46,14,0.35)";
    ctx.lineWidth = 0.7;
    for (let y = -4; y < 22; y += 4) {
      ctx.beginPath();
      ctx.moveTo(-20 + (y + 8) * 0.15, y);
      ctx.lineTo(20 - (y + 8) * 0.15, y);
      ctx.stroke();
    }
    for (let x = -16; x <= 16; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.lineTo(x + 1, 22);
      ctx.stroke();
    }
    ctx.fillStyle = "#7a4d1a";
    rr(ctx, -16, -12, 32, 7, 3);
    ctx.fill();
    ctx.strokeStyle = "#3e220a";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#f4c84a";
    ctx.strokeStyle = "#7a5210";
    ctx.lineWidth = 0.8;
    [[-8, -16], [-2, -19], [4, -17], [-6, -14], [8, -15], [0, -14]].forEach(([gx, gy]) => {
      ctx.beginPath();
      ctx.ellipse(gx, gy, 2.6, 3.6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = "rgba(255,240,200,0.25)";
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.quadraticCurveTo(-19, 6, -17, 18);
    ctx.lineTo(-13, 16);
    ctx.quadraticCurveTo(-14, 6, -11, -4);
    ctx.closePath();
    ctx.fill();
    return true;
  }

  if (key === "grain_flour") {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 23, 22, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    const body = ctx.createLinearGradient(0, -10, 0, 24);
    body.addColorStop(0, "#fff5dc");
    body.addColorStop(1, "#c9a672");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-16, -8);
    ctx.lineTo(-21, 17);
    ctx.quadraticCurveTo(-21, 24, -14, 24);
    ctx.lineTo(14, 24);
    ctx.quadraticCurveTo(21, 24, 21, 17);
    ctx.lineTo(16, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e4220";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(94,66,32,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, 0);
    ctx.stroke();
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 3; i++) {
        const y = 2 + i * 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(s * 4, y - 2, s * 6, y - 5);
        ctx.stroke();
      }
    });
    ctx.fillStyle = "#e8d3a8";
    ctx.beginPath();
    ctx.moveTo(-17, -8);
    ctx.quadraticCurveTo(-12, -15, 0, -14);
    ctx.quadraticCurveTo(12, -15, 17, -8);
    ctx.lineTo(15, -3);
    ctx.lineTo(-15, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e4220";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = "#7a4e1a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.quadraticCurveTo(0, -6, 12, -10);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    [[-10, -16], [-3, -19], [4, -17], [-7, -13], [9, -15], [0, -14], [6, -19]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx, dy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(-13, -5);
    ctx.quadraticCurveTo(-17, 8, -15, 20);
    ctx.lineTo(-11, 18);
    ctx.quadraticCurveTo(-12, 8, -9, -5);
    ctx.closePath();
    ctx.fill();
    return true;
  }

  return false;
}
