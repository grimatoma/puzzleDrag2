import { rr } from "./helpers.js";

export function drawNatureIcon(ctx, key) {
  if (key === "grass_hay") {
    // Golden bundle of dried straw tied with twine
    ctx.strokeStyle = "#5e3a08";
    ctx.lineWidth = 5;
    [-18, -10, -2, 6, 14].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.quadraticCurveTo(x - 2 + i, 0, x - 6 + i * 2, -24);
      ctx.stroke();
    });
    ctx.strokeStyle = "#d4a020";
    ctx.lineWidth = 3.5;
    [-14, -7, 0, 7, 14].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.quadraticCurveTo(x + 1, 0, x - 4 + i * 2, -22);
      ctx.stroke();
    });
    ctx.strokeStyle = "#ffe890";
    ctx.lineWidth = 1.8;
    [-10, -3, 4, 10].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.quadraticCurveTo(x + 2, -2, x - 2 + i * 2, -20);
      ctx.stroke();
    });
    ctx.fillStyle = "#5e3a08";
    rr(ctx, -22, -3, 44, 11, 4);
    ctx.fill();
    ctx.strokeStyle = "#2a1804";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,200,120,0.75)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    ctx.fillStyle = "#5e3a08";
    ctx.beginPath();
    ctx.arc(-22, 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1804";
    ctx.stroke();
    return true;
  }

  if (key === "grass_meadow") {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#234012";
    ctx.lineWidth = 4.5;
    [-18, -10, -2, 6, 14].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.bezierCurveTo(x + 4 - i * 2, 6, x - 6 + i * 3, -8, x - 10 + i * 4, -22);
      ctx.stroke();
    });
    ctx.strokeStyle = "#5c9c2e";
    ctx.lineWidth = 3.2;
    [-15, -7, 1, 9, 16].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.bezierCurveTo(x + 2, 4, x - 4 + i * 2, -10, x - 8 + i * 3, -22);
      ctx.stroke();
    });
    ctx.strokeStyle = "#b6e068";
    ctx.lineWidth = 1.5;
    [-12, -4, 4, 12].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.bezierCurveTo(x + 2, 2, x - 2 + i * 2, -8, x - 4 + i * 3, -20);
      ctx.stroke();
    });
    ctx.fillStyle = "#fffbe0";
    [[-7, -2], [-4, -4], [-10, -4], [-7, -6], [-4, -1]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = "#7a8a30";
    ctx.lineWidth = 0.8;
    [[-7, -2], [-4, -4], [-10, -4], [-7, -6], [-4, -1]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = "#ffd248";
    ctx.beginPath();
    ctx.arc(-7, -3, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a3a18";
    ctx.beginPath();
    ctx.ellipse(0, 24, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }

  if (key === "grass_spiky") {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d4a14";
    ctx.strokeStyle = "#1f2a08";
    ctx.lineWidth = 1.5;
    const outerSpikes = [
      [-22, 20, -16, -22], [-14, 22, -10, -20], [-6, 22, -4, -24],
      [2, 22, 4, -24], [10, 22, 12, -20], [18, 20, 16, -22],
    ];
    outerSpikes.forEach(([x1, y1, xt, yt]) => {
      ctx.beginPath();
      ctx.moveTo(x1 - 4, y1);
      ctx.lineTo(x1 + 4, y1);
      ctx.lineTo(xt, yt);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = "#83a235";
    ctx.strokeStyle = "#3a4818";
    ctx.lineWidth = 1.2;
    const midSpikes = [
      [-18, 18, -14, -16], [-10, 20, -8, -16], [-2, 20, 0, -20],
      [6, 20, 8, -16], [14, 18, 12, -16],
    ];
    midSpikes.forEach(([x1, y1, xt, yt]) => {
      ctx.beginPath();
      ctx.moveTo(x1 - 3, y1);
      ctx.lineTo(x1 + 3, y1);
      ctx.lineTo(xt, yt);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = "#c8de72";
    [-14, -4, 6, 14].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x - 1, -8 - i);
      ctx.lineTo(x + 1, -8 - i);
      ctx.lineTo(x, -16 - i * 2);
      ctx.closePath();
      ctx.fill();
    });
    ctx.strokeStyle = "#1f2a08";
    ctx.lineWidth = 1.4;
    [[-8, -4, -14, -6], [4, -4, 10, -6], [-10, 4, -16, 2], [6, 4, 12, 2]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.fillStyle = "#5a3a18";
    ctx.beginPath();
    ctx.ellipse(0, 24, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }

  if (key === "bird_clover") {
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const drawLeaf = (cx, cy, r, angle, lightHex, darkHex) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
      grad.addColorStop(0, lightHex);
      grad.addColorStop(1, darkHex);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.4);
      ctx.bezierCurveTo(r * 1.1, r * 0.2, r * 0.9, -r * 0.9, 0, -r * 0.3);
      ctx.bezierCurveTo(-r * 0.9, -r * 0.9, -r * 1.1, r * 0.2, 0, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#1f4810";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.35);
      ctx.lineTo(0, -r * 0.25);
      ctx.stroke();
      ctx.restore();
    };
    drawLeaf(-12, 8, 6, -0.5, "#7cba48", "#3a6818");
    drawLeaf(-8, 14, 6, 0.4,  "#7cba48", "#3a6818");
    drawLeaf(-4, 10, 6, 0,    "#7cba48", "#3a6818");
    ctx.strokeStyle = "#3a5a18";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(4, 22);
    ctx.bezierCurveTo(2, 14, 4, 6, 4, -4);
    ctx.stroke();
    drawLeaf(4, -10, 9, 0,            "#a8e068", "#3a7018");
    drawLeaf(4 + 9, -2, 9, Math.PI / 2, "#a8e068", "#3a7018");
    drawLeaf(4, 6, 9, Math.PI,        "#a8e068", "#3a7018");
    drawLeaf(4 - 9, -2, 9, -Math.PI / 2,"#a8e068", "#3a7018");
    ctx.fillStyle = "#fff8c0";
    ctx.beginPath();
    ctx.arc(4, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a7818";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    return true;
  }

  return false;
}
