// Mounts.

function shadow(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 22, w, 4.5, 0, 0, Math.PI*2); ctx.fill();
}

function horseBase(ctx: CanvasRenderingContext2D, bodyC1: string, bodyC2: string, maneC: string, outline: string, longLegs: boolean) {
  const legY = longLegs ? 12 : 13;
  const legH = longLegs ? 10 : 9;
  ctx.fillStyle = bodyC2;
  ctx.fillRect(-9, legY, 3, legH); ctx.fillRect(-3, legY, 3, legH); ctx.fillRect(7, legY, 3, legH); ctx.fillRect(13, legY, 3, legH);
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
  ctx.strokeRect(-9, legY, 3, legH); ctx.strokeRect(-3, legY, 3, legH); ctx.strokeRect(7, legY, 3, legH); ctx.strokeRect(13, legY, 3, legH);
  ctx.fillStyle = outline;
  ctx.fillRect(-9, legY+legH-1, 3, 1.5); ctx.fillRect(-3, legY+legH-1, 3, 1.5);
  ctx.fillRect(7, legY+legH-1, 3, 1.5); ctx.fillRect(13, legY+legH-1, 3, 1.5);
  // Body
  const g = ctx.createRadialGradient(-2, -2, 4, 0, 4, 18);
  g.addColorStop(0, bodyC1); g.addColorStop(1, bodyC2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 4, 16, 9, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0; ctx.stroke();
  // Tail
  ctx.fillStyle = maneC;
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.bezierCurveTo(24, 2, 24, 14, 18, 14); ctx.bezierCurveTo(20, 8, 18, 4, 16, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.4; ctx.stroke();
  // Long neck
  ctx.fillStyle = bodyC1;
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.bezierCurveTo(-16, -4, -18, -12, -12, -14);
  ctx.bezierCurveTo(-6, -12, -6, -2, -10, 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.6; ctx.stroke();
  // Mane
  ctx.fillStyle = maneC;
  ctx.beginPath();
  ctx.moveTo(-15, -10); ctx.bezierCurveTo(-12, -14, -8, -10, -8, -4);
  ctx.lineTo(-12, -2); ctx.bezierCurveTo(-15, -6, -16, -8, -15, -10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  // Head
  ctx.fillStyle = bodyC1;
  ctx.beginPath(); ctx.ellipse(-14, -14, 5, 5, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-17, -10, 4, 3, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.4; ctx.stroke();
  // Ear
  ctx.fillStyle = maneC;
  ctx.beginPath(); ctx.moveTo(-12, -18); ctx.lineTo(-10, -22); ctx.lineTo(-9, -16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-14, -14, 1.0, 0, Math.PI*2); ctx.fill();
  // Snout
  ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-19, -9, 0.7, 0, Math.PI*2); ctx.fill();
}

function drawHorse(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  horseBase(ctx, "#a86838", "#5a3814", "#1a0e04", "#1a0e04", false);
}

function drawDonkey(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 20);
  horseBase(ctx, "#8a8478", "#3a3830", "#1a1a18", "#0a0a08", false);
  // Big donkey ears (overdraw)
  ctx.fillStyle = "#3a3830";
  ctx.beginPath(); ctx.moveTo(-13, -18); ctx.lineTo(-11, -26); ctx.lineTo(-9, -16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(-7, -25); ctx.lineTo(-6, -16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a08"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.moveTo(-13, -18); ctx.lineTo(-11, -26); ctx.lineTo(-9, -16); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(-7, -25); ctx.lineTo(-6, -16); ctx.closePath(); ctx.stroke();
}

function drawMoose(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  horseBase(ctx, "#5a3814", "#2a1808", "#1a0e04", "#0a0604", true);
  // Pendulous snout
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.ellipse(-19, -7, 4, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 1.2; ctx.stroke();
  // Dewlap
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-14, -2); ctx.lineTo(-10, -4); ctx.closePath(); ctx.fill();
  // Palmate moose antlers. Each one is a broad scoop-shaped palm rising from
  // the crown and flaring outward, with three short rounded tines along the
  // top edge. One contour stroke per antler keeps them clean; the inner edge
  // connects to the pedicel so nothing floats. Kept inside ±26.
  const drawAntler = (dir: number) => {
    ctx.save();
    ctx.translate(-13, -16);
    ctx.scale(dir, 1);
    // Pedicel — short column from the crown
    ctx.fillStyle = "#7a5018"; ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(1, -3); ctx.lineTo(4, -3); ctx.lineTo(3, 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Palm — concave scoop flaring up and out, three tines along the rim
    ctx.fillStyle = "#c89548";
    ctx.beginPath();
    ctx.moveTo(1, -3);            // inner base
    ctx.bezierCurveTo(2, -8, 5, -11, 9, -12); // inner sweep up to first tine root
    ctx.lineTo(9, -15);          // tine 1
    ctx.lineTo(11, -12);
    ctx.lineTo(13, -15);         // tine 2
    ctx.lineTo(15, -11);
    ctx.lineTo(17, -13);         // tine 3 (outermost)
    ctx.lineTo(17, -9);          // outer rim
    ctx.bezierCurveTo(14, -6, 8, -4, 4, -3); // bottom of palm back to base
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
    // Soft shading along the lower scoop for volume
    ctx.fillStyle = "rgba(58,32,8,0.4)";
    ctx.beginPath();
    ctx.moveTo(4, -3); ctx.bezierCurveTo(8, -4, 14, -6, 17, -9);
    ctx.lineTo(15, -7); ctx.bezierCurveTo(11, -5, 7, -4, 4, -3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  drawAntler(-1); // left antler, flares left
  drawAntler(1);  // right antler, flares right over the body
}

function drawMammoth(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 26);
  // Legs
  ctx.fillStyle = "#5a3814";
  ctx.fillRect(-10, 13, 5, 9); ctx.fillRect(-3, 13, 5, 9); ctx.fillRect(8, 13, 5, 9); ctx.fillRect(15, 13, 5, 9);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4;
  ctx.strokeRect(-10, 13, 5, 9); ctx.strokeRect(-3, 13, 5, 9); ctx.strokeRect(8, 13, 5, 9); ctx.strokeRect(15, 13, 5, 9);
  // Body — woolly
  const g = ctx.createRadialGradient(-2, -2, 4, 0, 4, 22);
  g.addColorStop(0, "#a87838"); g.addColorStop(0.6, "#5a3414"); g.addColorStop(1, "#2a1808");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(4, 2, 18, 13, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 2.0; ctx.stroke();
  // Wool tufts
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2; const r = 14;
    const x1 = 4 + Math.cos(a) * r; const y1 = 2 + Math.sin(a) * r * 0.85;
    const x2 = x1 + Math.cos(a) * 3; const y2 = y1 + Math.sin(a) * 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // Domed head
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.ellipse(-13, -2, 8, 9, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Wool fringe on head
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + (i / 5) * Math.PI;
    const x1 = -13 + Math.cos(a) * 8; const y1 = -2 + Math.sin(a) * 9;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(a)*3, y1 + Math.sin(a)*3); ctx.stroke();
  }
  // Trunk
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.moveTo(-19, -4); ctx.bezierCurveTo(-24, 2, -22, 12, -16, 12);
  ctx.bezierCurveTo(-14, 12, -14, 8, -16, 8); ctx.bezierCurveTo(-20, 6, -18, 0, -16, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "rgba(26,14,4,0.6)"; ctx.lineWidth = 0.9;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(-18, 0 + i*3, 3.5, -0.6, 0.6); ctx.stroke();
  }
  // Two curved ivory tusks emerging from below the head and sweeping
  // forward then up. Drawn as distinct tapered crescents so they read as a
  // pair of tusks, not one white blob. The back tusk is darker/behind.
  // Back tusk (slightly higher, dimmer)
  ctx.fillStyle = "#e8d8a8";
  ctx.beginPath();
  ctx.moveTo(-15, 6);
  ctx.bezierCurveTo(-22, 8, -25, 2, -23, -3);
  ctx.bezierCurveTo(-22, 0, -20, 4, -16, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.0; ctx.stroke();
  // Front tusk (brighter, lower) — clear forward-then-up curl
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath();
  ctx.moveTo(-13, 8);
  ctx.bezierCurveTo(-21, 11, -25, 5, -22, 0);
  ctx.bezierCurveTo(-21, 4, -18, 7, -14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.4; ctx.stroke();
  // Ivory highlight stripe
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-22, 2); ctx.bezierCurveTo(-20, 6, -17, 7, -14, 7); ctx.stroke();
  // Ear
  ctx.fillStyle = "#5a3414";
  ctx.beginPath(); ctx.ellipse(-7, -7, 4, 5, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-15, -2, 1.3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-15, -2, 0.8, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  tile_mount_horse:   { label:"Horse",   color:"#a86838", draw:drawHorse },
  tile_mount_donkey:  { label:"Donkey",  color:"#8a8478", draw:drawDonkey },
  tile_mount_moose:   { label:"Moose",   color:"#5a3814", draw:drawMoose },
  tile_mount_mammoth: { label:"Mammoth", color:"#a87838", draw:drawMammoth },
};
