// Grass family.

function drawHeather(ctx) {
  // Soil shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 22, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dark base blades
  ctx.strokeStyle = "#2a4012";
  ctx.lineWidth = 4;
  [-16, -8, 0, 8, 16].forEach((x, i) => {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.bezierCurveTo(x, 8, x - 2 + i, -6, x - 4 + i, -16);
    ctx.stroke();
  });
  // Mid blades
  ctx.strokeStyle = "#5c8c2a";
  ctx.lineWidth = 2.6;
  [-12, -4, 4, 12].forEach((x, i) => {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.bezierCurveTo(x, 6, x - 2 + i, -8, x - 4 + i, -16);
    ctx.stroke();
  });
  // Purple flower clusters at the top
  const clusters = [[-10, -14], [0, -18], [10, -14], [-4, -10], [6, -10]];
  clusters.forEach(([cx, cy]) => {
    // Base darker bloom
    ctx.fillStyle = "#5a2a78";
    ctx.beginPath();
    ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
    ctx.fill();
    // Inner brighter floret
    ctx.fillStyle = "#a058c0";
    [[-1.8, -1.2], [1.6, -1.4], [-0.8, 1.6], [1.4, 1.4], [0, 0]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    });
    // Pollen highlight
    ctx.fillStyle = "#fff0a0";
    ctx.beginPath();
    ctx.arc(cx, cy, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
  // Soil base
  ctx.fillStyle = "#5a3a18";
  ctx.beginPath();
  ctx.ellipse(0, 24, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

export const ICONS = {
  grass_heather: { label:"Heather", color:"#7a4f8a", draw:drawHeather },
};
