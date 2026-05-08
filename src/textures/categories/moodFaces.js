// Mood expression badges (Sour, Cool, Warm, Beloved). Drawn at canvas
// origin (0,0); designed for ~32px since they appear next to NPC names.

function moodBase(ctx, fill, stroke) {
  // Soft drop
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Round face
  const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 22);
  grad.addColorStop(0, "rgba(255,255,255,0.4)");
  grad.addColorStop(0.5, fill);
  grad.addColorStop(1, stroke);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-7, -8, 5, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoodSour(ctx) {
  // Sour — frowning grey
  moodBase(ctx, "#7a8490", "#3a4348");
  // Eyes (downturned)
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9, -4); ctx.lineTo(-4, -2);
  ctx.moveTo(9, -4); ctx.lineTo(4, -2);
  ctx.stroke();
  // Frown
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 12, 7, Math.PI + 0.3, Math.PI * 2 - 0.3);
  ctx.stroke();
  // Cheek shading (darker)
  ctx.fillStyle = "rgba(60,72,82,0.35)";
  ctx.beginPath();
  ctx.arc(-12, 6, 3, 0, Math.PI * 2);
  ctx.arc(12, 6, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoodCool(ctx) {
  // Cool — neutral, tan tone
  moodBase(ctx, "#bbac8a", "#7a6448");
  // Eyes (dots)
  ctx.fillStyle = "#1a1c20";
  ctx.beginPath(); ctx.arc(-7, -3, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -3, 1.6, 0, Math.PI * 2); ctx.fill();
  // Mouth (flat)
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 8); ctx.lineTo(6, 8);
  ctx.stroke();
}

function drawMoodWarm(ctx) {
  // Warm — gentle smile, gold tone
  moodBase(ctx, "#e8c060", "#a87018");
  // Eyes (curved smile-arcs)
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(-7, -2, 3.6, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(7, -2, 3.6, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  // Smile
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 4, 7, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // Cheeks
  ctx.fillStyle = "rgba(220,120,80,0.45)";
  ctx.beginPath(); ctx.arc(-12, 4, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, 4, 2.4, 0, Math.PI * 2); ctx.fill();
}

function drawMoodBeloved(ctx) {
  // Beloved — laughing with hearts
  moodBase(ctx, "#f48060", "#a8431a");
  // Closed-eye crinkles
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, -2); ctx.quadraticCurveTo(-7, -6, -4, -2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, -2); ctx.quadraticCurveTo(7, -6, 4, -2);
  ctx.stroke();
  // Big grin
  ctx.fillStyle = "#3a1c08";
  ctx.beginPath();
  ctx.arc(0, 4, 8, 0.2, Math.PI - 0.2);
  ctx.lineTo(-7, 4);
  ctx.closePath();
  ctx.fill();
  // Tongue
  ctx.fillStyle = "#e85878";
  ctx.beginPath();
  ctx.ellipse(0, 11, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cheek blush
  ctx.fillStyle = "rgba(220,80,40,0.6)";
  ctx.beginPath(); ctx.arc(-12, 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, 4, 3, 0, Math.PI * 2); ctx.fill();
  // Floating hearts
  ctx.fillStyle = "#e83870";
  [[-16, -16, 0.8], [14, -14, 0.9]].forEach(([cx, cy, s]) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-6, -2, -6, -6, -3, -6);
    ctx.bezierCurveTo(-1, -6, 0, -4, 0, -2);
    ctx.bezierCurveTo(0, -4, 1, -6, 3, -6);
    ctx.bezierCurveTo(6, -6, 6, -2, 0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7a1830";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  });
}

export const ICONS = {
  mood_sour:    { label:"Sour",    color:"#5a6973", draw:drawMoodSour },
  mood_cool:    { label:"Cool",    color:"#9a8a72", draw:drawMoodCool },
  mood_warm:    { label:"Warm",    color:"#c8923a", draw:drawMoodWarm },
  mood_beloved: { label:"Beloved", color:"#d6612a", draw:drawMoodBeloved },
};
