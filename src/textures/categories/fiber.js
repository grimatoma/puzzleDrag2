// Fiber Crush textile chain — wool, yarn, dye, cloth. Drawn at canvas origin
// (0,0) inside a ~64×64 design box, matching the other category modules.

function drawShadow(ctx, w = 14, h = 3) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 18, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Wool — a soft fleece puff. ────────────────────────────────────────────
function drawWool(ctx) {
  drawShadow(ctx, 13, 3);
  ctx.fillStyle = "#f3ece0";
  ctx.strokeStyle = "#b9ad96";
  ctx.lineWidth = 1.4;
  // Cloud of overlapping lobes.
  const lobes = [[-7, 1, 6], [0, -4, 7], [7, 1, 6], [-3, 5, 6], [4, 5, 6]];
  ctx.beginPath();
  for (const [x, y, r] of lobes) ctx.moveTo(x + r, y), ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A couple of soft curls.
  ctx.strokeStyle = "rgba(150,140,120,0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-3, 0, 2.2, 0.2, Math.PI * 1.5);
  ctx.arc(4, 2, 2.2, 0.2, Math.PI * 1.5);
  ctx.stroke();
  // Specular highlight.
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-2, -5, 2.6, 1.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ── Yarn — a wound ball with a loose strand. ──────────────────────────────
function drawYarn(ctx) {
  drawShadow(ctx, 12, 3);
  const body = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11);
  body.addColorStop(0, "#e9c98a");
  body.addColorStop(0.6, "#d9b06a");
  body.addColorStop(1, "#7a5e2c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5e4520";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Cross-wound strands.
  ctx.strokeStyle = "rgba(94,69,32,0.7)";
  ctx.lineWidth = 1;
  for (const a of [-0.6, 0.0, 0.6]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 4, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const a of [Math.PI / 2 - 0.6, Math.PI / 2, Math.PI / 2 + 0.6]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 10, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Loose strand trailing off.
  ctx.strokeStyle = "#d9b06a";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(8, 6);
  ctx.quadraticCurveTo(13, 10, 9, 13);
  ctx.stroke();
}

// ── Dye — a pot of rich plant dye with a drip. ────────────────────────────
function drawDye(ctx) {
  drawShadow(ctx, 12, 3);
  // Pot body.
  ctx.fillStyle = "#6a4a30";
  ctx.strokeStyle = "#3c2418";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-9, -2);
  ctx.lineTo(9, -2);
  ctx.lineTo(7, 10);
  ctx.lineTo(-7, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Dye surface.
  ctx.fillStyle = "#7c4a9a";
  ctx.beginPath();
  ctx.ellipse(0, -2, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3c2050";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Surface sheen.
  ctx.fillStyle = "rgba(220,180,240,0.6)";
  ctx.beginPath();
  ctx.ellipse(-3, -3, 3, 1, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // A drip running down the rim.
  ctx.fillStyle = "#7c4a9a";
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.bezierCurveTo(8, 3, 8, 6, 6, 7);
  ctx.bezierCurveTo(4, 6, 4, 3, 6, 0);
  ctx.closePath();
  ctx.fill();
}

// ── Cloth — a folded bolt of woven fabric. ────────────────────────────────
function drawCloth(ctx) {
  drawShadow(ctx, 13, 3);
  // Back fold.
  ctx.fillStyle = "#3a6f9c";
  ctx.strokeStyle = "#274a68";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-10, -6);
  ctx.lineTo(8, -8);
  ctx.lineTo(11, 4);
  ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Front fold.
  ctx.fillStyle = "#4f87b8";
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(8, -2);
  ctx.lineTo(10, 9);
  ctx.lineTo(-9, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Weave lines.
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 0.8;
  for (let i = -8; i <= 6; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, -1);
    ctx.lineTo(i + 2, 10);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.lineTo(9, 2.5);
  ctx.stroke();
}

export const ICONS = {
  wool:  { label: "Wool",  color: "#f3ece0", draw: drawWool },
  yarn:  { label: "Yarn",  color: "#d9b06a", draw: drawYarn },
  dye:   { label: "Dye",   color: "#7c4a9a", draw: drawDye },
  cloth: { label: "Cloth", color: "#4f87b8", draw: drawCloth },
};
