// Player-tools (HUD/Tools panel): Scythe, Seedpack, Lockbox, Reshuffle Horn.

function drawShadow(ctx, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayerScythe(ctx) {
  drawShadow(ctx, 22, 4);
  // Wooden snath (handle)
  ctx.save();
  ctx.rotate(0.2);
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.rect(-2, -22, 4, 44);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Wood grain
  ctx.strokeStyle = "rgba(58,28,8,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -20); ctx.lineTo(0, 20);
  ctx.stroke();
  // Grip wraps
  ctx.fillStyle = "#5a3014";
  ctx.fillRect(-3, 8, 6, 4);
  ctx.fillRect(-3, 16, 6, 4);
  ctx.restore();
  // Curved blade (scythe-shaped)
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 1.4;
  ctx.fillStyle = "#c8c8d0";
  ctx.beginPath();
  ctx.moveTo(-4, -20);
  ctx.bezierCurveTo(-22, -18, -28, -2, -22, 8);
  ctx.bezierCurveTo(-22, 0, -16, -10, -2, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Blade highlight
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.bezierCurveTo(-18, -14, -22, -2, -18, 6);
  ctx.stroke();
  // Edge gleam
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(-22, 4, 1, 0, Math.PI * 2);
  ctx.fill();
  // Slash motion lines
  ctx.strokeStyle = "rgba(180,200,220,0.6)";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  [-30, -32, -28].forEach((x, i) => {
    ctx.beginPath();
    ctx.moveTo(x, 8 + i * 4);
    ctx.lineTo(x + 6, 4 + i * 4);
    ctx.stroke();
  });
}

function drawSeedpack(ctx) {
  drawShadow(ctx, 18, 4);
  // Cloth pouch body
  const body = ctx.createLinearGradient(0, -12, 0, 22);
  body.addColorStop(0, "#d4b878");
  body.addColorStop(0.6, "#a87838");
  body.addColorStop(1, "#5a3014");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.bezierCurveTo(-18, 4, -16, 18, -8, 22);
  ctx.lineTo(8, 22);
  ctx.bezierCurveTo(16, 18, 18, 4, 14, -8);
  ctx.bezierCurveTo(8, -10, -8, -10, -14, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Cloth folds
  ctx.strokeStyle = "rgba(58,28,8,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.bezierCurveTo(-10, 8, -8, 16, -6, 20);
  ctx.moveTo(10, 0); ctx.bezierCurveTo(10, 8, 8, 16, 6, 20);
  ctx.moveTo(0, 4); ctx.lineTo(0, 20);
  ctx.stroke();
  // Drawstring tied at top
  ctx.fillStyle = "#5a3014";
  ctx.beginPath();
  ctx.ellipse(0, -10, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Rope ties
  ctx.strokeStyle = "#7a4a18";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -12); ctx.lineTo(-10, -18);
  ctx.moveTo(6, -12); ctx.lineTo(10, -18);
  ctx.stroke();
  // Tie ends
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath(); ctx.arc(-10, -18, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -18, 1.4, 0, Math.PI * 2); ctx.fill();
  // Seeds spilling out
  ctx.fillStyle = "#5a3014";
  [[-3, -8], [0, -10], [3, -8], [-1, -6]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 1.2, 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });
  // Plus emblem (says "add resources")
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.arc(0, 8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a4810";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(-1.4, 4, 2.8, 8);
  ctx.fillRect(-4, 6.6, 8, 2.8);
  // Sprout on top
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(2, -14, -2, -18, 0, -22);
  ctx.stroke();
  ctx.fillStyle = "#5a8028";
  ctx.beginPath();
  ctx.ellipse(-2, -20, 2, 1, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, -22, 2, 1, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawLockbox(ctx) {
  drawShadow(ctx, 22, 4);
  // Box body
  const body = ctx.createLinearGradient(0, -8, 0, 20);
  body.addColorStop(0, "#a87838");
  body.addColorStop(1, "#5a3014");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.rect(-18, -8, 36, 28);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Lid (open slightly)
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.moveTo(-18, -8);
  ctx.bezierCurveTo(-18, -22, 18, -22, 18, -8);
  ctx.bezierCurveTo(14, -16, -14, -16, -18, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Iron banding
  ctx.fillStyle = "#3a3a40";
  ctx.fillRect(-18, 4, 36, 3);
  ctx.fillRect(-18, 14, 36, 3);
  ctx.fillRect(-2, -8, 4, 28);
  // Iron corners
  [[-18, -8], [14, -8], [-18, 16], [14, 16]].forEach(([x, y]) => {
    ctx.fillStyle = "#3a3a40";
    ctx.beginPath();
    ctx.rect(x, y, 4, 4);
    ctx.fill();
    ctx.strokeStyle = "#0a0a0e";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });
  // Lock plate
  ctx.fillStyle = "#a87018";
  ctx.beginPath();
  ctx.rect(-5, 0, 10, 10);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Keyhole
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath();
  ctx.arc(0, 4, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-0.6, 4, 1.2, 4);
  // Glow from inside (rare items)
  ctx.fillStyle = "rgba(255,200,80,0.7)";
  ctx.beginPath();
  ctx.ellipse(0, -10, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Star sparkle
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 3.6 : 1.4;
    ctx.lineTo(Math.cos(a) * r, -14 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Spark dots
  ctx.fillStyle = "rgba(255,240,140,0.85)";
  [[-10, -16], [10, -14], [-6, -20], [8, -18]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawReshuffleHorn(ctx) {
  drawShadow(ctx, 20, 4);
  // Horn body (curling)
  ctx.save();
  // Main horn arc
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.bezierCurveTo(-22, -16, 16, -22, 22, -8);
  ctx.bezierCurveTo(20, -2, 6, -2, -2, 6);
  ctx.bezierCurveTo(-10, 14, -16, 12, -18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Horn lighter tone
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.bezierCurveTo(-16, -14, 12, -18, 18, -10);
  ctx.bezierCurveTo(16, -6, 4, -4, -4, 2);
  ctx.bezierCurveTo(-8, 6, -10, 4, -12, -2);
  ctx.closePath();
  ctx.fill();
  // Brass band wraps
  ctx.fillStyle = "#d4a020";
  [-2, 8].forEach((dx) => {
    ctx.save();
    ctx.translate(dx, dx === -2 ? -8 : -16);
    ctx.rotate(-0.4);
    ctx.fillRect(-7, -2, 14, 4);
    ctx.strokeStyle = "#7a5008";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-7, -2, 14, 4);
    ctx.restore();
  });
  // Mouthpiece (left tip)
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.ellipse(-18, 2, 4, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Bell flare
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.moveTo(20, -16);
  ctx.lineTo(28, -22);
  ctx.lineTo(28, -2);
  ctx.lineTo(22, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  // Sound waves emerging
  ctx.strokeStyle = "rgba(248,200,80,0.85)";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  [4, 8, 12].forEach((d) => {
    ctx.beginPath();
    ctx.arc(28, -12, d, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  });
  // Curving arrow (reshuffle)
  ctx.strokeStyle = "#3a82c4";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(-10, 10, 6, -Math.PI / 4, Math.PI * 1.4);
  ctx.stroke();
  // Arrow head
  ctx.fillStyle = "#3a82c4";
  ctx.beginPath();
  ctx.moveTo(-14, 12);
  ctx.lineTo(-10, 14);
  ctx.lineTo(-12, 18);
  ctx.closePath();
  ctx.fill();
}

export const ICONS = {
  player_clear:    { label:"Scythe",          color:"#a8a8b0", draw:drawPlayerScythe },
  player_basic:    { label:"Seedpack",        color:"#a87838", draw:drawSeedpack },
  player_rare:     { label:"Lockbox",         color:"#a87018", draw:drawLockbox },
  player_shuffle:  { label:"Reshuffle Horn",  color:"#7a4a18", draw:drawReshuffleHorn },
};
