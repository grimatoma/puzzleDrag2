// Wave 8 — Farm Tools.

function shadow(ctx, w, y) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, y || 22, w, 4, 0, 0, Math.PI*2); ctx.fill();
}

// Wood handle helper — diagonal handle from one corner
function woodHandle(ctx, x1, y1, x2, y2, width) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -width/2, 0, width/2);
  g.addColorStop(0, "#7a4a18"); g.addColorStop(0.5, "#a87838"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.fillRect(0, -width/2, len, width);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.strokeRect(0, -width/2, len, width);
  // wood grain
  ctx.strokeStyle = "rgba(26,14,4,0.4)"; ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(len*0.1*i, -width/2 + 0.5); ctx.lineTo(len*0.1*i + len*0.7, -width/2 + 0.5); ctx.stroke(); }
  ctx.restore();
}

// Metal head helper — uses given path
function metalGleam(ctx, x, y, r) {
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.ellipse(x, y, r*0.4, r*0.8, -0.4, 0, Math.PI*2); ctx.fill();
}

function drawRake(ctx) {
  shadow(ctx, 18);
  woodHandle(ctx, 14, -18, -10, 14, 4);
  // Head
  ctx.save(); ctx.translate(-12, 16); ctx.rotate(-Math.atan2(14 - (-18), -10 - 14));
  // Cross bar
  ctx.fillStyle = "#5a4810"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4;
  ctx.fillRect(-2, -2, 18, 4); ctx.strokeRect(-2, -2, 18, 4);
  // Tines
  ctx.fillStyle = "#8a8068"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9;
  for (let i = 0; i < 6; i++) {
    const x = i * 3;
    ctx.beginPath();
    ctx.moveTo(x - 0.8, 2); ctx.lineTo(x + 0.8, 2); ctx.lineTo(x + 0.6, 9); ctx.lineTo(x - 0.6, 9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#5a5040"; ctx.beginPath(); ctx.moveTo(x - 0.6, 9); ctx.lineTo(x, 11); ctx.lineTo(x + 0.6, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8a8068";
  }
  ctx.restore();
}

function drawAxe(ctx) {
  shadow(ctx, 16);
  woodHandle(ctx, 14, -18, -10, 18, 4);
  // Head — wedge near top
  ctx.save(); ctx.translate(10, -14);
  const headG = ctx.createLinearGradient(-12, 0, 4, 0);
  headG.addColorStop(0, "#fffce8"); headG.addColorStop(0.4, "#a8a8b0"); headG.addColorStop(1, "#3a3a40");
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.moveTo(-2, -8); ctx.lineTo(4, -6); ctx.lineTo(4, 12); ctx.lineTo(-2, 14);
  ctx.lineTo(-14, 6); ctx.lineTo(-14, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Bevel
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(-14, 0); ctx.lineTo(-12, 2); ctx.lineTo(-2, -6); ctx.closePath(); ctx.fill();
  metalGleam(ctx, -8, 4, 4);
  ctx.restore();
}

function drawSapling(ctx) {
  shadow(ctx, 16);
  // Pot
  const potG = ctx.createLinearGradient(-12, 6, 12, 22);
  potG.addColorStop(0, "#a85420"); potG.addColorStop(1, "#5a2808");
  ctx.fillStyle = potG;
  ctx.beginPath();
  ctx.moveTo(-12, 6); ctx.lineTo(12, 6); ctx.lineTo(10, 22); ctx.lineTo(-10, 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a1808"; ctx.lineWidth = 1.6; ctx.stroke();
  // Pot rim
  ctx.fillStyle = "#8a3818";
  ctx.beginPath(); ctx.ellipse(0, 6, 12, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a1808"; ctx.lineWidth = 1.4; ctx.stroke();
  // Soil
  ctx.fillStyle = "#3a1a08";
  ctx.beginPath(); ctx.ellipse(0, 6, 11, 2, 0, 0, Math.PI*2); ctx.fill();
  // Stem
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-2, -2, 2, -8, 0, -16); ctx.stroke();
  // Leaves
  const leaf = (cx, cy, rx, ry, ang, c1) => {
    ctx.fillStyle = c1;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#1f3a08"; ctx.lineWidth = 1.0; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(rx, 0); ctx.stroke();
    ctx.restore();
  };
  leaf(-7, -8, 8, 4, -0.4, "#7eb83a");
  leaf(7, -10, 8, 4, 0.4, "#5a8a18");
  leaf(0, -16, 6, 3, 0, "#9cd048");
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-9, -8, 2, 1, -0.4, 0, Math.PI*2); ctx.fill();
}

function drawTrimmer(ctx) {
  shadow(ctx, 16);
  // Two crossed handles
  ctx.save(); ctx.translate(0, 4);
  ctx.fillStyle = "#a82018"; ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.4;
  // Handle 1
  ctx.save(); ctx.rotate(0.3);
  ctx.beginPath();
  ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(2, 18); ctx.bezierCurveTo(2, 22, -6, 22, -6, 18);
  ctx.bezierCurveTo(-6, 16, -2, 16, -2, 12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.rotate(-0.3);
  ctx.beginPath();
  ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(2, 18); ctx.bezierCurveTo(2, 22, -6, 22, -6, 18);
  ctx.bezierCurveTo(-6, 16, -2, 16, -2, 12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Pivot
  ctx.fillStyle = "#3a3a40"; ctx.beginPath(); ctx.arc(0, 4, 2.4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.0; ctx.stroke();
  // Blades — long pointed, going up
  const bladeG = ctx.createLinearGradient(0, -22, 0, 4);
  bladeG.addColorStop(0, "#fff8e0"); bladeG.addColorStop(0.7, "#a8a8b0"); bladeG.addColorStop(1, "#3a3a40");
  ctx.fillStyle = bladeG; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4;
  ctx.save(); ctx.rotate(-0.15);
  ctx.beginPath();
  ctx.moveTo(-3, 4); ctx.lineTo(0, -22); ctx.lineTo(2, 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.rotate(0.15);
  ctx.beginPath();
  ctx.moveTo(-2, 4); ctx.lineTo(0, -22); ctx.lineTo(3, 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.moveTo(-1, -16); ctx.lineTo(0, -2); ctx.lineTo(1, -16); ctx.closePath(); ctx.fill();
}

function drawScythe(ctx) {
  shadow(ctx, 16);
  woodHandle(ctx, 14, -18, -8, 18, 4);
  // Curved blade attached at top
  ctx.save(); ctx.translate(12, -18);
  const g = ctx.createLinearGradient(-2, 0, -22, 0);
  g.addColorStop(0, "#3a3a40"); g.addColorStop(0.5, "#a8a8b0"); g.addColorStop(1, "#fff8e0");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-2, 0); ctx.bezierCurveTo(-6, -2, -16, 0, -22, 8);
  ctx.bezierCurveTo(-16, 4, -8, 4, -2, 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.bezierCurveTo(-7, -1, -16, 0, -22, 8); ctx.bezierCurveTo(-18, 4, -10, 2, -3, 1);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Hand grip
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-1, 4, 8, 4);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-1, 4, 8, 4);
}

function drawFertilizer(ctx) {
  shadow(ctx, 18);
  // Sack
  const g = ctx.createLinearGradient(-14, 0, 14, 0);
  g.addColorStop(0, "#a89060"); g.addColorStop(0.5, "#d8c890"); g.addColorStop(1, "#7a6038");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-14, -6); ctx.bezierCurveTo(-16, 12, -10, 22, 0, 22);
  ctx.bezierCurveTo(10, 22, 16, 12, 14, -6);
  ctx.lineTo(8, -10); ctx.lineTo(-8, -10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2810"; ctx.lineWidth = 2.0; ctx.stroke();
  // Tied top
  ctx.strokeStyle = "#3a2810"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.bezierCurveTo(-4, -16, 4, -16, 8, -10); ctx.stroke();
  // Cinch rope
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(9, -8); ctx.stroke();
  // Label
  ctx.fillStyle = "#3a6818";
  ctx.fillRect(-8, 4, 16, 10);
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-8, 4, 16, 10);
  // NPK glyph
  ctx.fillStyle = "#fffce0"; ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("N P K", 0, 11);
  // Spilled granules at bottom
  ctx.fillStyle = "#a86838";
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(-10 + i*3, 24, 1.4, 0, Math.PI*2); ctx.fill(); }
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-7, 0, 3, 8, -0.3, 0, Math.PI*2); ctx.fill();
}

function drawPlough(ctx) {
  shadow(ctx, 22);
  // Tilted body
  ctx.save(); ctx.rotate(-0.1);
  // Beam (handle)
  ctx.fillStyle = "#7a4818"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-22, -16); ctx.lineTo(-18, -18); ctx.lineTo(8, 6); ctx.lineTo(4, 8);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Plough share — curved metal
  const metalG = ctx.createLinearGradient(0, 4, 12, 16);
  metalG.addColorStop(0, "#a8a8b0"); metalG.addColorStop(0.5, "#fff8e0"); metalG.addColorStop(1, "#3a3a40");
  ctx.fillStyle = metalG;
  ctx.beginPath();
  ctx.moveTo(0, -2); ctx.lineTo(14, 4); ctx.lineTo(20, 18);
  ctx.bezierCurveTo(8, 20, -2, 14, -6, 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(14, 6); ctx.lineTo(12, 8); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
  // Handles (two grips up)
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-18, -18); ctx.bezierCurveTo(-22, -14, -22, -8, -18, -10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-22, -16); ctx.bezierCurveTo(-26, -12, -24, -6, -20, -8); ctx.stroke();
  ctx.restore();
  // Soil furrow trail
  ctx.fillStyle = "#5a3814";
  ctx.beginPath(); ctx.ellipse(12, 22, 14, 3, 0, 0, Math.PI*2); ctx.fill();
}

function drawBirdCage(ctx) {
  shadow(ctx, 16);
  // Base
  ctx.fillStyle = "#5a3814";
  ctx.beginPath(); ctx.ellipse(0, 18, 14, 3.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Cage interior (slight glow)
  ctx.fillStyle = "rgba(255,240,200,0.4)";
  ctx.beginPath(); ctx.ellipse(0, 4, 12, 14, 0, 0, Math.PI*2); ctx.fill();
  // Vertical bars
  ctx.strokeStyle = "#a8a8b0"; ctx.lineWidth = 1.4;
  for (let i = -10; i <= 10; i += 2.5) {
    ctx.beginPath();
    ctx.moveTo(i, 18);
    ctx.lineTo(i, -10);
    ctx.stroke();
  }
  // Top dome
  ctx.fillStyle = "#a82018";
  ctx.beginPath(); ctx.ellipse(0, -10, 12, 6, 0, Math.PI, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.4; ctx.stroke();
  // Hoop top
  ctx.fillStyle = "#7a3018";
  ctx.fillRect(-2, -16, 4, 4);
  ctx.beginPath(); ctx.arc(0, -18, 3, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.2; ctx.stroke();
  // Perch
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(8, 6); ctx.stroke();
  // Tiny bird
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.ellipse(0, 2, 4, 3.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = "#f08020"; ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(-7, 2); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-3, 1, 0.7, 0, Math.PI*2); ctx.fill();
}

function drawBirdFeed(ctx) {
  shadow(ctx, 16);
  // Bowl
  const bowlG = ctx.createLinearGradient(-12, 6, 12, 18);
  bowlG.addColorStop(0, "#d8c898"); bowlG.addColorStop(1, "#7a5018");
  ctx.fillStyle = bowlG;
  ctx.beginPath();
  ctx.moveTo(-14, 4); ctx.lineTo(14, 4); ctx.lineTo(10, 18); ctx.lineTo(-10, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  // Rim
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.ellipse(0, 4, 14, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4; ctx.stroke();
  // Pile of seeds heaped above
  const seeds = [];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 8; i++) {
      const x = -10 + i*3 + (r%2?1.5:0);
      const y = 0 - r*3;
      seeds.push([x, y, r]);
    }
  }
  seeds.forEach(([x, y]) => {
    const colors = ["#f0a020", "#a87838", "#5a3814", "#d8a040"];
    ctx.fillStyle = colors[(x + y) % 4];
    if ((x + y) % 4 < 0) ctx.fillStyle = colors[0];
    // teardrop
    ctx.beginPath(); ctx.ellipse(x, y, 1.4, 2.2, x*0.3, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.4; ctx.stroke();
  });
  // top of pile
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.arc(0, -10, 3, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.6; ctx.stroke();
}

function drawHoe(ctx) {
  shadow(ctx, 16);
  woodHandle(ctx, 14, -18, -10, 16, 4);
  // Head — perpendicular blade
  ctx.save(); ctx.translate(-12, 18);
  // Connector
  ctx.fillStyle = "#5a3814"; ctx.fillRect(-2, -8, 4, 8);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.strokeRect(-2, -8, 4, 8);
  // Blade
  const g = ctx.createLinearGradient(-12, 0, 0, 8);
  g.addColorStop(0, "#fff8e0"); g.addColorStop(0.6, "#a8a8b0"); g.addColorStop(1, "#3a3a40");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.lineTo(2, 0); ctx.lineTo(2, 4); ctx.lineTo(-12, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(2, 0); ctx.lineTo(2, 1); ctx.lineTo(-12, 1.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawFruitPicker(ctx) {
  shadow(ctx, 14);
  // Long pole
  woodHandle(ctx, 6, 22, -2, -14, 3);
  // Wire basket head
  ctx.save(); ctx.translate(-2, -14);
  ctx.fillStyle = "rgba(180,180,200,0.4)";
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(-6, -10); ctx.lineTo(6, -10); ctx.lineTo(8, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#a8a8b0"; ctx.lineWidth = 1.4; ctx.stroke();
  // Wires
  ctx.strokeStyle = "#7a7a82"; ctx.lineWidth = 1.0;
  for (let i = -4; i <= 4; i += 2) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i*0.8, -10); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(7, -5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(6, -10); ctx.stroke();
  // Apple inside
  const ag = ctx.createRadialGradient(-2, -6, 1, 0, -4, 6);
  ag.addColorStop(0, "#ff8a40"); ag.addColorStop(1, "#7a1410");
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.arc(0, -5, 4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();
}

function drawMilkChurn(ctx) {
  shadow(ctx, 18);
  // Body — tall metal canister
  const g = ctx.createLinearGradient(-12, 0, 12, 0);
  g.addColorStop(0, "#5a6878"); g.addColorStop(0.5, "#c8d8e8"); g.addColorStop(1, "#3a4858");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-12, -6); ctx.lineTo(12, -6); ctx.lineTo(10, 18); ctx.lineTo(-10, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1e28"; ctx.lineWidth = 2.0; ctx.stroke();
  // Bands
  ctx.strokeStyle = "#3a4858"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11, 8); ctx.lineTo(11, 8); ctx.stroke();
  // Shoulder transition to neck
  ctx.fillStyle = "#a8b8c8";
  ctx.beginPath();
  ctx.moveTo(-12, -6); ctx.lineTo(-6, -14); ctx.lineTo(6, -14); ctx.lineTo(12, -6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1e28"; ctx.lineWidth = 1.6; ctx.stroke();
  // Lid
  ctx.fillStyle = "#3a4858";
  ctx.beginPath();
  ctx.moveTo(-7, -14); ctx.lineTo(7, -14); ctx.lineTo(6, -18); ctx.lineTo(-6, -18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1e28"; ctx.lineWidth = 1.4; ctx.stroke();
  // Handles
  ctx.strokeStyle = "#1a1e28"; ctx.lineWidth = 2.0;
  ctx.beginPath(); ctx.moveTo(-12, -2); ctx.bezierCurveTo(-16, -2, -16, 6, -12, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -2); ctx.bezierCurveTo(16, -2, 16, 6, 12, 6); ctx.stroke();
  // Highlight strip
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-5, -4); ctx.lineTo(-6, 16); ctx.lineTo(-8, 16); ctx.closePath(); ctx.fill();
}

function drawBee(ctx) {
  shadow(ctx, 12, 20);
  // Trail / motion lines
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(-10, 0, 4, 0, Math.PI, true); ctx.stroke();
  ctx.beginPath(); ctx.arc(-14, 4, 3, 0, Math.PI, true); ctx.stroke();
  // Body
  const g = ctx.createRadialGradient(-2, -2, 2, 0, 0, 12);
  g.addColorStop(0, "#fff4a0"); g.addColorStop(1, "#a87810");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.8; ctx.stroke();
  // Stripes
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.ellipse(-3, 0, 2, 7.5, 0.05, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, 0, 2, 7, -0.05, 0, Math.PI*2); ctx.fill();
  // Stinger
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(15, -1); ctx.lineTo(15, 1); ctx.closePath(); ctx.fill();
  // Wings — translucent
  ctx.fillStyle = "rgba(220,240,255,0.7)"; ctx.strokeStyle = "rgba(58,32,8,0.7)"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.ellipse(-2, -8, 8, 5, -0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(4, -7, 6, 4, -0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-7, -1, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-7.5, -1.5, 0.6, 0, Math.PI*2); ctx.fill();
  // Antennae
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.moveTo(-8, -4); ctx.bezierCurveTo(-12, -8, -10, -10, -8, -10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -2); ctx.bezierCurveTo(-14, -4, -14, -8, -12, -8); ctx.stroke();
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.arc(-8, -10, 1.0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-12, -8, 1.0, 0, Math.PI*2); ctx.fill();
}

function drawWheelbarrow(ctx) {
  shadow(ctx, 22);
  // Wheel
  ctx.fillStyle = "#1a0e04"; ctx.beginPath(); ctx.arc(-12, 14, 6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3a2810"; ctx.beginPath(); ctx.arc(-12, 14, 4.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.arc(-12, 14, 4.5, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = "#a8a8b0"; ctx.beginPath(); ctx.arc(-12, 14, 1.4, 0, Math.PI*2); ctx.fill();
  // Tray
  ctx.fillStyle = "#a82018"; ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, 0); ctx.lineTo(14, -2); ctx.lineTo(20, 8); ctx.lineTo(-8, 12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Inside shading
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.lineTo(14, -2); ctx.lineTo(15, 0); ctx.lineTo(-10, 2);
  ctx.closePath(); ctx.fill();
  // Handles (back)
  ctx.fillStyle = "#7a4818"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.fillRect(14, -4, 12, 4); ctx.strokeRect(14, -4, 12, 4);
  // Front leg
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(8, 8, 3, 12);
  // Pile of dirt/grain inside
  ctx.fillStyle = "#5a3814";
  ctx.beginPath(); ctx.ellipse(2, -2, 11, 4, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3a2008";
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(-6 + i*2.5, -3 + (i%2)*1.5, 0.9, 0, Math.PI*2); ctx.fill(); }
}

function drawCat(ctx) {
  shadow(ctx, 18);
  // Body — sitting
  const g = ctx.createRadialGradient(-2, -4, 3, 0, 4, 18);
  g.addColorStop(0, "#f8c878"); g.addColorStop(0.6, "#a86838"); g.addColorStop(1, "#5a3414");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10, 22); ctx.bezierCurveTo(-14, 0, -10, -8, 0, -8);
  ctx.bezierCurveTo(10, -8, 14, 0, 10, 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Tail curl
  ctx.fillStyle = "#a86838";
  ctx.beginPath();
  ctx.moveTo(10, 16); ctx.bezierCurveTo(20, 18, 22, 8, 16, 4); ctx.bezierCurveTo(20, 12, 14, 14, 12, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Feet
  ctx.fillStyle = "#5a3414";
  ctx.beginPath(); ctx.ellipse(-6, 21, 4, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, 21, 4, 2, 0, 0, Math.PI*2); ctx.fill();
  // Stripes
  ctx.fillStyle = "#5a3414";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.ellipse(-8 + i*5, -4 + i*3, 4, 1.2, 0.2, 0, Math.PI*2); ctx.fill();
  }
  // Head
  ctx.fillStyle = "#f8c878";
  ctx.beginPath(); ctx.arc(0, -8, 8, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Ears
  ctx.fillStyle = "#f8c878";
  ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-8, -18); ctx.lineTo(-3, -14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(8, -18); ctx.lineTo(3, -14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-8, -18); ctx.lineTo(-3, -14); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(8, -18); ctx.lineTo(3, -14); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = "#e8a8b8";
  ctx.beginPath(); ctx.moveTo(-6, -13); ctx.lineTo(-7, -16); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -13); ctx.lineTo(7, -16); ctx.lineTo(4, -14); ctx.closePath(); ctx.fill();
  // Eyes
  ctx.fillStyle = "#7eb83a"; ctx.beginPath(); ctx.arc(-3, -8, 1.6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -8, 1.6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.fillRect(-3.5, -9, 1, 2); ctx.fillRect(2.5, -9, 1, 2);
  // Nose & whiskers
  ctx.fillStyle = "#e8a8b8"; ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(1, -4); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-7, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-7, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(7, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(7, -1); ctx.stroke();
}

function drawRifle(ctx) {
  shadow(ctx, 22);
  ctx.save(); ctx.rotate(-0.2);
  // Stock (back wood)
  const stockG = ctx.createLinearGradient(0, -6, 0, 6);
  stockG.addColorStop(0, "#a87838"); stockG.addColorStop(0.5, "#7a4818"); stockG.addColorStop(1, "#3a2008");
  ctx.fillStyle = stockG;
  ctx.beginPath();
  ctx.moveTo(-22, -4); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.lineTo(-22, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Trigger guard / grip
  ctx.fillStyle = "#3a3a40";
  ctx.fillRect(-6, 0, 6, 4);
  ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(0, 4); ctx.lineTo(0, 8); ctx.lineTo(-3, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.0; ctx.stroke();
  // Trigger
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.arc(-2, 6, 1.6, 0, Math.PI*2); ctx.stroke();
  // Barrel
  const barrelG = ctx.createLinearGradient(0, -3, 0, 3);
  barrelG.addColorStop(0, "#5a5a62"); barrelG.addColorStop(0.5, "#a8a8b0"); barrelG.addColorStop(1, "#1a1a1e");
  ctx.fillStyle = barrelG;
  ctx.fillRect(-4, -3, 26, 4);
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.2;
  ctx.strokeRect(-4, -3, 26, 4);
  // Sights
  ctx.fillStyle = "#1a1a1e";
  ctx.fillRect(0, -5, 1.5, 2);
  ctx.fillRect(20, -5, 1.5, 2);
  // Muzzle
  ctx.fillStyle = "#0a0a0e";
  ctx.beginPath(); ctx.arc(22, -1, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // Spent shell
  ctx.fillStyle = "#d8a040";
  ctx.fillRect(-6, 14, 4, 2);
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.6; ctx.strokeRect(-6, 14, 4, 2);
}

function drawTerrier(ctx) {
  shadow(ctx, 18);
  // Legs
  ctx.fillStyle = "#a89060";
  ctx.fillRect(-10, 14, 3, 8); ctx.fillRect(-3, 14, 3, 8); ctx.fillRect(5, 14, 3, 8); ctx.fillRect(11, 14, 3, 8);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-10, 14, 3, 8); ctx.strokeRect(-3, 14, 3, 8); ctx.strokeRect(5, 14, 3, 8); ctx.strokeRect(11, 14, 3, 8);
  // Body — small, long
  const g = ctx.createRadialGradient(-2, -2, 3, 0, 4, 16);
  g.addColorStop(0, "#fff8d0"); g.addColorStop(0.6, "#a89060"); g.addColorStop(1, "#5a3814");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 6, 14, 8, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.8; ctx.stroke();
  // Wiry fur
  ctx.strokeStyle = "rgba(58,32,8,0.7)"; ctx.lineWidth = 0.7;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = 2 + Math.cos(a) * 13; const y = 6 + Math.sin(a) * 7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a)*2, y + Math.sin(a)*2); ctx.stroke();
  }
  // Tail (up)
  ctx.fillStyle = "#a89060";
  ctx.beginPath();
  ctx.moveTo(15, 4); ctx.lineTo(20, -4); ctx.lineTo(18, 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Head
  ctx.fillStyle = "#a89060";
  ctx.beginPath(); ctx.ellipse(-12, 0, 6, 6, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-15, 4, 4, 3, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-12, 0, 6, 6, -0.1, 0, Math.PI*2); ctx.stroke();
  // Beard
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath(); ctx.moveTo(-17, 4); ctx.lineTo(-17, 8); ctx.lineTo(-12, 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8; ctx.stroke();
  // Ears (folded)
  ctx.fillStyle = "#7a5418";
  ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-7, -8); ctx.lineTo(-7, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-13, -9); ctx.lineTo(-11, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-12, -1, 1.0, 0, Math.PI*2); ctx.fill();
  // Nose
  ctx.fillStyle = "#1a0e04"; ctx.beginPath(); ctx.arc(-17, 3, 1.2, 0, Math.PI*2); ctx.fill();
}

function drawHound(ctx) {
  shadow(ctx, 22);
  // Legs (long)
  ctx.fillStyle = "#a8784a";
  ctx.fillRect(-10, 12, 3, 10); ctx.fillRect(-3, 12, 3, 10); ctx.fillRect(7, 12, 3, 10); ctx.fillRect(13, 12, 3, 10);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-10, 12, 3, 10); ctx.strokeRect(-3, 12, 3, 10); ctx.strokeRect(7, 12, 3, 10); ctx.strokeRect(13, 12, 3, 10);
  // Body — sleek
  const g = ctx.createRadialGradient(-2, -2, 3, 0, 4, 16);
  g.addColorStop(0, "#d89878"); g.addColorStop(0.6, "#7a4818"); g.addColorStop(1, "#3a1808");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 4, 16, 9, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 2.0; ctx.stroke();
  // White belly
  ctx.fillStyle = "#f8d8b0";
  ctx.beginPath(); ctx.ellipse(2, 8, 12, 4, 0, 0, Math.PI*2); ctx.fill();
  // Tail (long, low)
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.bezierCurveTo(22, -4, 24, 8, 22, 14); ctx.stroke();
  ctx.fillStyle = "#fff8d0"; ctx.beginPath(); ctx.arc(22, 14, 1.6, 0, Math.PI*2); ctx.fill();
  // Head
  ctx.fillStyle = "#a8784a";
  ctx.beginPath(); ctx.ellipse(-14, -2, 7, 6, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-19, 1, 4, 3, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-14, -2, 7, 6, -0.05, 0, Math.PI*2); ctx.stroke();
  // Long droopy ear
  ctx.fillStyle = "#5a2a08";
  ctx.beginPath();
  ctx.moveTo(-10, -4); ctx.bezierCurveTo(-6, -2, -4, 8, -10, 10); ctx.bezierCurveTo(-12, 8, -12, 0, -10, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-14, -3, 1.2, 0, Math.PI*2); ctx.fill();
  // Nose
  ctx.fillStyle = "#1a0e04"; ctx.beginPath(); ctx.arc(-22, 0, 1.4, 0, Math.PI*2); ctx.fill();
  // Collar
  ctx.fillStyle = "#a82018";
  ctx.beginPath(); ctx.ellipse(-7, 4, 4, 3, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.arc(-7, 6, 1.4, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  rake:          { label:"Rake",          color:"#7a4818", draw:drawRake },
  axe:           { label:"Axe",           color:"#a8a8b0", draw:drawAxe },
  sapling:       { label:"Sapling",       color:"#7eb83a", draw:drawSapling },
  trimmer:       { label:"Trimmer",       color:"#a82018", draw:drawTrimmer },
  scythe:        { label:"Scythe",        color:"#a8a8b0", draw:drawScythe },
  fertilizer:    { label:"Fertilizer",    color:"#d8c890", draw:drawFertilizer },
  plough:        { label:"Plough",        color:"#7a4818", draw:drawPlough },
  bird_cage:     { label:"Bird Cage",     color:"#a82018", draw:drawBirdCage },
  bird_feed:     { label:"Bird Feed",     color:"#d8c898", draw:drawBirdFeed },
  hoe:           { label:"Hoe",           color:"#a8a8b0", draw:drawHoe },
  fruit_picker:  { label:"Fruit Picker",  color:"#d8d8e0", draw:drawFruitPicker },
  milk_churn:    { label:"Milk Churn",    color:"#c8d8e8", draw:drawMilkChurn },
  bee:           { label:"Bee",           color:"#f8d040", draw:drawBee },
  wheelbarrow:   { label:"Wheelbarrow",   color:"#a82018", draw:drawWheelbarrow },
  cat:           { label:"Cat",           color:"#a86838", draw:drawCat },
  rifle:         { label:"Rifle",         color:"#7a4818", draw:drawRifle },
  terrier:       { label:"Terrier",       color:"#a89060", draw:drawTerrier },
  hound:         { label:"Hound",         color:"#7a4818", draw:drawHound },
};
