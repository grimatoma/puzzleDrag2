// Hazard tile icons (rats, fire, wolf). Drawn at canvas origin (0,0).

function drawShadow(ctx, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRatsHazard(ctx) {
  drawShadow(ctx, 22, 4);
  // Rat body (sitting)
  const body = ctx.createRadialGradient(-4, 0, 4, 0, 4, 18);
  body.addColorStop(0, "#7a6048");
  body.addColorStop(0.6, "#3a2818");
  body.addColorStop(1, "#1a0e08");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 6, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Head
  ctx.fillStyle = "#5a4830";
  ctx.beginPath();
  ctx.ellipse(-12, -2, 8, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Snout (point)
  ctx.fillStyle = "#5a4830";
  ctx.beginPath();
  ctx.moveTo(-18, -1);
  ctx.lineTo(-22, 1);
  ctx.lineTo(-18, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Nose
  ctx.fillStyle = "#e88898";
  ctx.beginPath();
  ctx.arc(-22, 1.5, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Whiskers
  ctx.strokeStyle = "rgba(180,160,140,0.85)";
  ctx.lineWidth = 0.6;
  [[-22, 1, -28, -1], [-22, 1, -28, 3], [-22, 2, -28, 5]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Ears (round)
  ctx.fillStyle = "#5a4830";
  ctx.beginPath();
  ctx.ellipse(-10, -10, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#a86878";
  ctx.beginPath();
  ctx.ellipse(-10, -10, 2.4, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Beady red eye
  ctx.fillStyle = "#c83830";
  ctx.beginPath();
  ctx.arc(-14, -2, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.arc(-14.4, -2.4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Teeth
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.moveTo(-20, 3); ctx.lineTo(-18, 3); ctx.lineTo(-19, 5); ctx.closePath();
  ctx.fill();
  // Tail (curling)
  ctx.strokeStyle = "#5a4830";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.bezierCurveTo(22, 4, 24, 18, 18, 20);
  ctx.stroke();
  ctx.strokeStyle = "#a87078";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.bezierCurveTo(22, 4, 24, 18, 18, 20);
  ctx.stroke();
  // Feet
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(-4, 16, 2.4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, 16, 2.4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Second rat — fully-drawn, smaller, positioned to the LOWER-RIGHT so it
  // doesn't overlap the first rat's body. It sits behind/beside the main
  // rat to read as "a swarm" not "a rat".
  ctx.save();
  ctx.translate(22, 12);
  ctx.scale(0.55, 0.55);
  // Body
  ctx.fillStyle = "#4a3828";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 1.6; ctx.stroke();
  // Head (turned right — so the two rats face opposite directions, which
  // breaks any "single rat" reading)
  ctx.fillStyle = "#3a2818";
  ctx.beginPath();
  ctx.ellipse(11, -3, 7, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 1.4; ctx.stroke();
  // Pointed snout
  ctx.fillStyle = "#3a2818";
  ctx.beginPath();
  ctx.moveTo(16, -3); ctx.lineTo(22, -1); ctx.lineTo(16, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Pink nose
  ctx.fillStyle = "#e88898";
  ctx.beginPath(); ctx.arc(22, -1, 1.4, 0, Math.PI * 2); ctx.fill();
  // Round ear
  ctx.fillStyle = "#3a2818";
  ctx.beginPath();
  ctx.ellipse(11, -10, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.fillStyle = "#a86878";
  ctx.beginPath();
  ctx.ellipse(11, -10, 2.4, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Beady red eye
  ctx.fillStyle = "#c83830";
  ctx.beginPath(); ctx.arc(13, -4, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fffae0";
  ctx.beginPath(); ctx.arc(12.6, -4.4, 0.4, 0, Math.PI * 2); ctx.fill();
  // Long curling tail trailing away (off-screen feel)
  ctx.strokeStyle = "#5a4830"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.bezierCurveTo(-22, 10, -22, -4, -16, -8);
  ctx.stroke();
  // Feet
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(-4, 10, 2.4, 1.4, 0, 0, Math.PI * 2);
  ctx.ellipse( 6, 10, 2.4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Third scurrying-rat silhouette in the lower-left foreground — gives the
  // composition real depth and confirms "swarm".
  ctx.save();
  ctx.translate(-16, 16);
  ctx.fillStyle = "rgba(30,18,8,0.85)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 2.8, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-5, -1, 2.4, 1.8, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(30,18,8,0.85)"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.bezierCurveTo(8, -1, 10, 3, 6, 4);
  ctx.stroke();
  ctx.fillStyle = "#e88898";
  ctx.beginPath(); ctx.arc(-7, -1, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFireHazard(ctx) {
  drawShadow(ctx, 22, 4);
  // Charred ground
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath();
  ctx.ellipse(0, 18, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ember bed
  ctx.fillStyle = "#a82008";
  ctx.beginPath();
  ctx.ellipse(0, 16, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8a020";
  ctx.beginPath();
  ctx.ellipse(0, 16, 10, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Outer glow
  const glow = ctx.createRadialGradient(0, 4, 4, 0, 0, 26);
  glow.addColorStop(0, "rgba(255,80,0,0.7)");
  glow.addColorStop(1, "rgba(255,80,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  // Main flame
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(12, -10, 16, 6, 8, 14);
  ctx.bezierCurveTo(2, 18, -2, 18, -8, 14);
  ctx.bezierCurveTo(-16, 6, -12, -10, 0, -22);
  ctx.closePath();
  const flameGrad = ctx.createLinearGradient(0, -22, 0, 18);
  flameGrad.addColorStop(0, "#ffe060");
  flameGrad.addColorStop(0.4, "#f87018");
  flameGrad.addColorStop(1, "#a82008");
  ctx.fillStyle = flameGrad;
  ctx.fill();
  ctx.strokeStyle = "#5a1004";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Inner flame (yellow heart)
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(6, -4, 8, 6, 2, 12);
  ctx.bezierCurveTo(0, 14, -2, 14, -4, 12);
  ctx.bezierCurveTo(-8, 6, -6, -4, 0, -12);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,240,100,0.85)";
  ctx.fill();
  // White-hot core
  ctx.beginPath();
  ctx.ellipse(0, 4, 2.4, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fffae0";
  ctx.fill();
  // Ember sparks rising
  ctx.fillStyle = "#fff080";
  [[-10, -16, 1], [12, -12, 1.2], [-6, -22, 0.8], [8, -22, 0.9]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawWolfHazard(ctx) {
  drawShadow(ctx, 22, 4);
  // Helper to draw a single side-view wolf at the given anchor with the
  // requested scale and tint. Drawn back-to-front so the foreground wolf
  // overlaps the background one and the silhouette reads as a *pack*.
  const drawOneWolf = (ax: number, ay: number, scale: number, tintDark: string, tintLight: string, outline: string) => {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.scale(scale, scale);
    // Body
    ctx.fillStyle = tintDark;
    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1.4; ctx.stroke();
    // Underbelly
    ctx.fillStyle = tintLight;
    ctx.beginPath();
    ctx.ellipse(0, 8, 9, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs (4, simple)
    ctx.fillStyle = tintDark;
    [-7, -3, 5, 9].forEach((lx) => {
      ctx.fillRect(lx, 9, 2.4, 6);
    });
    ctx.strokeStyle = outline; ctx.lineWidth = 0.8;
    [-7, -3, 5, 9].forEach((lx) => { ctx.strokeRect(lx, 9, 2.4, 6); });
    // Tail — bushy, low
    ctx.strokeStyle = tintDark; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(11, 2);
    ctx.bezierCurveTo(17, -2, 18, 6, 16, 9);
    ctx.stroke();
    ctx.fillStyle = tintLight;
    ctx.beginPath(); ctx.arc(16, 9, 1.4, 0, Math.PI * 2); ctx.fill();
    // Head + muzzle
    ctx.fillStyle = tintDark;
    ctx.beginPath();
    ctx.ellipse(-12, -1, 6, 5, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
    // Pointed muzzle
    ctx.beginPath();
    ctx.moveTo(-15, 2);
    ctx.lineTo(-21, 0);
    ctx.lineTo(-15, -2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Ears (two pointed triangles)
    ctx.beginPath();
    ctx.moveTo(-14, -6); ctx.lineTo(-12, -10); ctx.lineTo(-10, -5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -7); ctx.lineTo(-8, -11); ctx.lineTo(-7, -5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Inner ear blush
    ctx.fillStyle = tintLight;
    ctx.beginPath();
    ctx.moveTo(-13, -7); ctx.lineTo(-12, -9); ctx.lineTo(-11, -6); ctx.closePath();
    ctx.fill();
    // Nose
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.ellipse(-21, 0, 1.4, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Yellow glowing eye
    ctx.fillStyle = "#f8d040";
    ctx.beginPath();
    ctx.arc(-12, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = outline;
    ctx.fillRect(-12.4, -3, 0.8, 2.2);
    ctx.restore();
  };
  // Back-rank wolf (smaller, cooler grey)
  drawOneWolf(10, 0, 0.7, "#3a3a40", "rgba(150,150,160,0.55)", "#0a0a0e");
  // Front-rank wolf (large, leading the pack)
  drawOneWolf(-2, 4, 1.0, "#5a5a62", "rgba(160,160,170,0.55)", "#1a1c20");
}

function drawSmokeHazard(ctx) {
  drawShadow(ctx, 14, 3);
  // Smoldering ember base
  ctx.fillStyle = "#3a1a08";
  ctx.beginPath();
  ctx.ellipse(0, 18, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Glowing ember spots
  ctx.fillStyle = "#c84818";
  ctx.beginPath();
  ctx.arc(-3, 17, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, 18, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8a020";
  ctx.beginPath();
  ctx.arc(-3, 17, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Stack of three smoke puffs rising. Each puff is a soft-edged radial
  // blob with several inner ellipses to give the cloud-like volume.
  function puff(cx: number, cy: number, r: number, alpha: number) {
    const grd = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    grd.addColorStop(0, `rgba(220,220,228,${alpha})`);
    grd.addColorStop(0.55, `rgba(150,150,162,${alpha * 0.85})`);
    grd.addColorStop(1, `rgba(80,80,92,${alpha * 0.0})`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Inner lobe darker
    ctx.fillStyle = `rgba(110,110,120,${alpha * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy + r * 0.15, r * 0.5, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight nubbin top-left
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.4, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  puff(2, 8, 9, 0.85);
  puff(-3, -3, 11, 0.8);
  puff(5, -15, 12, 0.7);
  puff(-6, -20, 6, 0.5);

  // Soft outline tying the cloud together (so it reads as one form, not
  // three separate blobs)
  ctx.strokeStyle = "rgba(80,80,90,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, 14);
  ctx.bezierCurveTo(-14, 8, -10, -2, -6, -4);
  ctx.bezierCurveTo(-14, -16, -2, -26, 6, -20);
  ctx.bezierCurveTo(16, -22, 18, -12, 12, -6);
  ctx.bezierCurveTo(18, 0, 14, 12, 8, 14);
  ctx.bezierCurveTo(6, 16, -4, 16, -6, 14);
  ctx.closePath();
  ctx.stroke();
}

export const ICONS = {
  hazard_rats:  { label:"Rat Swarm", color:"#3a2818", draw:drawRatsHazard },
  hazard_fire:  { label:"Fire",      color:"#f87018", draw:drawFireHazard },
  hazard_wolf:  { label:"Wolves",    color:"#3a3a40", draw:drawWolfHazard },
  hazard_smoke: { label:"Smoke",     color:"#7a7a82", draw:drawSmokeHazard },
};
