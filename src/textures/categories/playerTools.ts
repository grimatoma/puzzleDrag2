// Player-tools (HUD/Tools panel): Scythe, Seedpack, Lockbox, Reshuffle Horn.

function drawShadow(ctx: CanvasRenderingContext2D, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayerScythe(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Wooden snath (handle)
  ctx.save();
  ctx.rotate(0.2);
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.rect(-2.5, -22, 5, 44);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 2;
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
  ctx.lineWidth = 2.2;
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
}

function drawSeedpack(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 17, 4);
  // Cloth pouch body (rounded sack, cinched neck), light upper-left
  const body = ctx.createRadialGradient(-7, -2, 4, 0, 8, 26);
  body.addColorStop(0, "#e0c585");
  body.addColorStop(0.55, "#b98a42");
  body.addColorStop(1, "#6a3d18");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.bezierCurveTo(-18, -2, -18, 16, -8, 22);
  ctx.lineTo(8, 22);
  ctx.bezierCurveTo(18, 16, 18, -2, 9, -8);
  ctx.bezierCurveTo(5, -10, -5, -10, -9, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // Cloth folds (interior detail) — gathered toward the cinched neck
  ctx.strokeStyle = "rgba(58,28,8,0.35)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-4, -7); ctx.bezierCurveTo(-12, 4, -10, 15, -5, 20);
  ctx.moveTo(4, -7); ctx.bezierCurveTo(12, 4, 10, 15, 5, 20);
  ctx.moveTo(0, -6); ctx.bezierCurveTo(-1, 6, 1, 14, 0, 19);
  ctx.stroke();
  // Cinched neck gathers above the body
  ctx.fillStyle = "#9c6e30";
  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.bezierCurveTo(-8, -13, -3, -15, 0, -15);
  ctx.bezierCurveTo(3, -15, 8, -13, 9, -8);
  ctx.bezierCurveTo(4, -10, -4, -10, -9, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Drawstring wrapped around the neck
  ctx.strokeStyle = "#5a3014";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.bezierCurveTo(-4, -6, 4, -6, 9, -8);
  ctx.stroke();
  // Drawstring loops looping back onto the neck (grounded, no floating ends)
  ctx.strokeStyle = "#7a4a18";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.bezierCurveTo(-12, -12, -10, -16, -5, -13);
  ctx.moveTo(7, -8);
  ctx.bezierCurveTo(12, -12, 10, -16, 5, -13);
  ctx.stroke();
  // A few seeds peeking from the gathered opening
  ctx.fillStyle = "#cdb074";
  [[-3, -13], [0, -14], [3, -13]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 1.6, 1, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(58,28,8,0.5)";
  ctx.lineWidth = 0.8;
  [[-3, -13], [0, -14], [3, -13]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 1.6, 1, 0.3, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Sprout rising from the opening (connected to the seeds)
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(1, -18, -2, -20, 0, -23);
  ctx.stroke();
  ctx.fillStyle = "#5a8028";
  ctx.beginPath();
  ctx.ellipse(-2.5, -20, 2.4, 1.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2.5, -22, 2.4, 1.2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Specular highlight upper-left
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-6, 2, 3.5, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawLockbox(ctx: CanvasRenderingContext2D) {
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
  // Spark dots (kept close to the star sparkle, grounded to the glow)
  ctx.fillStyle = "rgba(255,240,140,0.85)";
  [[-8, -16], [8, -15]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawReshuffleHorn(ctx: CanvasRenderingContext2D) {
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
  // Bell flare (kept inside +-26)
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.moveTo(18, -16);
  ctx.lineTo(25, -21);
  ctx.lineTo(25, -3);
  ctx.lineTo(20, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Bell rim highlight
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(25, -21);
  ctx.lineTo(25, -3);
  ctx.stroke();
  ctx.restore();
  // Sound waves emerging from the bell (inside +-26)
  ctx.strokeStyle = "rgba(248,200,80,0.85)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  [4, 8].forEach((d) => {
    ctx.beginPath();
    ctx.arc(25, -12, d, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  });
  // Curving reshuffle arrow looping around the horn body (grounded near the bend)
  ctx.strokeStyle = "#3a82c4";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(-6, 8, 7, -Math.PI * 0.15, Math.PI * 1.35);
  ctx.stroke();
  // Arrow head closing the loop
  ctx.fillStyle = "#3a82c4";
  ctx.beginPath();
  ctx.moveTo(2, 5);
  ctx.lineTo(-1, 11);
  ctx.lineTo(4, 11);
  ctx.closePath();
  ctx.fill();
}

export const ICONS = {
  player_clear:    { label:"Scythe",          color:"#a8a8b0", draw:drawPlayerScythe },
  player_basic:    { label:"Seedpack",        color:"#a87838", draw:drawSeedpack },
  player_rare:     { label:"Lockbox",         color:"#a87018", draw:drawLockbox },
  player_shuffle:  { label:"Reshuffle Horn",  color:"#7a4a18", draw:drawReshuffleHorn },
};
