// Hazard tile icons (rats, fire, wolf). Drawn at canvas origin (0,0).

function drawShadow(ctx: CanvasRenderingContext2D, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A single, clean side-profile rat facing left, drawn around its own origin.
// Shared by the hero rat and its smaller companion so both read identically.
function drawOneRat(ctx: CanvasRenderingContext2D, light: string, mid: string, outline: string) {
  // Tail first (curls away behind the body to the right).
  ctx.strokeStyle = mid; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(13, 6);
  ctx.bezierCurveTo(23, 2, 23, 15, 17, 15);
  ctx.stroke();
  // Body (rounded, gradient for volume).
  const body = ctx.createRadialGradient(-3, -2, 3, 1, 4, 16);
  body.addColorStop(0, light);
  body.addColorStop(0.7, mid);
  body.addColorStop(1, outline);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(2, 4, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.6; ctx.stroke();
  // Big round ear.
  ctx.fillStyle = mid;
  ctx.beginPath(); ctx.ellipse(-8, -8, 5, 4.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#a86878";
  ctx.beginPath(); ctx.ellipse(-8, -8, 2.8, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  // Head.
  ctx.fillStyle = mid;
  ctx.beginPath(); ctx.ellipse(-11, 0, 8, 7, -0.25, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.4; ctx.stroke();
  // Pointed snout.
  ctx.beginPath();
  ctx.moveTo(-16, 1); ctx.lineTo(-21, 3); ctx.lineTo(-16, 5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Pink nose.
  ctx.fillStyle = "#e88898";
  ctx.beginPath(); ctx.arc(-21, 3, 1.2, 0, Math.PI * 2); ctx.fill();
  // Beady red eye + glint.
  ctx.fillStyle = "#c83830";
  ctx.beginPath(); ctx.arc(-12, -1, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fffae0";
  ctx.beginPath(); ctx.arc(-12.5, -1.5, 0.6, 0, Math.PI * 2); ctx.fill();
  // Buck teeth.
  ctx.fillStyle = "#fff080";
  ctx.beginPath(); ctx.moveTo(-18, 5.2); ctx.lineTo(-15.4, 5.2); ctx.lineTo(-16.7, 7.6); ctx.closePath(); ctx.fill();
  // Little feet.
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.ellipse(-3, 13.4, 2.4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, 13.4, 2.4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
}

function drawRatsHazard(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // A smaller second rat, set clearly apart in the upper-right (a real gap, no
  // body overlap) so the icon still reads "rats" without the two merging into
  // one muddy blob at small sizes.
  ctx.save();
  ctx.translate(13, -12);
  ctx.scale(0.5, 0.5);
  drawOneRat(ctx, "#5a4634", "#392b1b", "#0a0604");
  ctx.restore();
  // Hero rat — large, bold, unmistakable.
  drawOneRat(ctx, "#7c6042", "#4a3826", "#0a0604");
}

function drawFireHazard(ctx: CanvasRenderingContext2D) {
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

function drawWolfHazard(ctx: CanvasRenderingContext2D) {
  // One bold, front-facing snarling wolf head — reads instantly at any size
  // (the old two-overlapping-wolves silhouette muddied into a grey blob).
  drawShadow(ctx, 18, 4);
  const OUT = "#15161b";

  // Big pointed ears (behind the head).
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
  ctx.fillStyle = "#4b4b55";
  ctx.beginPath(); ctx.moveTo(-13, -9); ctx.lineTo(-19, -24); ctx.lineTo(-3, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, -9); ctx.lineTo(19, -24); ctx.lineTo(3, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Inner ears.
  ctx.fillStyle = "#26262d";
  ctx.beginPath(); ctx.moveTo(-12, -11); ctx.lineTo(-15, -20); ctx.lineTo(-6, -15); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, -11); ctx.lineTo(15, -20); ctx.lineTo(6, -15); ctx.closePath(); ctx.fill();

  // Head — one broad grey muzzle, gradient for volume.
  const head = ctx.createRadialGradient(-5, -7, 4, 0, 0, 25);
  head.addColorStop(0, "#73737d");
  head.addColorStop(0.6, "#53535d");
  head.addColorStop(1, "#34343c");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.moveTo(-16, -9);
  ctx.bezierCurveTo(-19, 3, -13, 9, -7, 12);
  ctx.bezierCurveTo(-7, 17, 7, 17, 7, 12);
  ctx.bezierCurveTo(13, 9, 19, 3, 16, -9);
  ctx.bezierCurveTo(10, -16, -10, -16, -16, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();

  // Jagged cheek fur tufts.
  ctx.fillStyle = "#53535d"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-15, -1); ctx.lineTo(-22, 0); ctx.lineTo(-14, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(15, -1); ctx.lineTo(22, 0); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill(); ctx.stroke();

  // Lighter muzzle wedge.
  ctx.fillStyle = "#9d9da7";
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.bezierCurveTo(-6, 0, -5, 9, 0, 13);
  ctx.bezierCurveTo(5, 9, 6, 0, 0, -3);
  ctx.closePath();
  ctx.fill();

  // Angry brows.
  ctx.fillStyle = "#23232a";
  ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(-2, -3); ctx.lineTo(-2, -6.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, -7); ctx.lineTo(2, -3); ctx.lineTo(2, -6.5); ctx.closePath(); ctx.fill();

  // Glowing yellow eyes + slit pupils + glint.
  ctx.fillStyle = "#ffd23c";
  ctx.beginPath(); ctx.ellipse(-7, -2, 2.7, 2.1, 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, -2, 2.7, 2.1, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a1206";
  ctx.beginPath(); ctx.ellipse(-7, -2, 0.8, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, -2, 0.8, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.arc(-8, -3, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -3, 0.6, 0, Math.PI * 2); ctx.fill();

  // Nose + snarl line.
  ctx.fillStyle = OUT;
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-2.6, 3.4); ctx.lineTo(2.6, 3.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 8.5); ctx.stroke();

  // Open snarling mouth with fangs.
  ctx.fillStyle = "#1b0d0d";
  ctx.beginPath();
  ctx.moveTo(-7, 9);
  ctx.quadraticCurveTo(0, 7.5, 7, 9);
  ctx.quadraticCurveTo(4, 14.5, 0, 13.5);
  ctx.quadraticCurveTo(-4, 14.5, -7, 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fdf6ec";
  ([[-4.6, 9], [4.6, 9]] as [number, number][]).forEach(([x, y]) => {
    ctx.beginPath(); ctx.moveTo(x - 1.5, y); ctx.lineTo(x + 1.5, y); ctx.lineTo(x, y + 3.4); ctx.closePath(); ctx.fill();
  });
}

function drawSmokeHazard(ctx: CanvasRenderingContext2D) {
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
