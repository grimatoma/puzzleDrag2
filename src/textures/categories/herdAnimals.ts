// Herd animals (pigs, sheep, goats, alpacas, rams).

function shadow(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 22, w, 4.5, 0, 0, Math.PI*2); ctx.fill();
}

function pigBase(ctx: CanvasRenderingContext2D, fillC1: string, fillC2: string, outline: string) {
  // Body
  const g = ctx.createRadialGradient(-4, -2, 3, 0, 4, 18);
  g.addColorStop(0, fillC1); g.addColorStop(1, fillC2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 6, 17, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0; ctx.stroke();
  // Curly tail
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0;
  ctx.beginPath(); ctx.moveTo(18, 4); ctx.bezierCurveTo(22, 0, 18, -2, 22, -4); ctx.stroke();
  // Legs
  ctx.fillStyle = fillC2;
  ctx.fillRect(-8, 14, 4, 6); ctx.fillRect(-2, 14, 4, 6);
  ctx.fillRect(6, 14, 4, 6); ctx.fillRect(12, 14, 4, 6);
  ctx.strokeStyle = outline; ctx.lineWidth = 1.4;
  ctx.strokeRect(-8, 14, 4, 6); ctx.strokeRect(-2, 14, 4, 6);
  ctx.strokeRect(6, 14, 4, 6); ctx.strokeRect(12, 14, 4, 6);
  // Hooves
  ctx.fillStyle = outline;
  ctx.fillRect(-8, 19, 4, 1.5); ctx.fillRect(-2, 19, 4, 1.5);
  ctx.fillRect(6, 19, 4, 1.5); ctx.fillRect(12, 19, 4, 1.5);
  // Head
  ctx.fillStyle = fillC1;
  ctx.beginPath(); ctx.ellipse(-12, 0, 8, 8, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.8; ctx.stroke();
  // Snout
  ctx.fillStyle = fillC2;
  ctx.beginPath(); ctx.ellipse(-18, 2, 4, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.ellipse(-19, 1, 0.7, 1.4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-17, 1, 0.7, 1.4, 0, 0, Math.PI*2); ctx.fill();
  // Ear
  ctx.fillStyle = fillC2;
  ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-8, -10); ctx.lineTo(-6, -4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-13, -2, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-13, -2, 0.8, 0, Math.PI*2); ctx.fill();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-2, 0, 4, 6, -0.3, 0, Math.PI*2); ctx.fill();
}

// One soft fleece coat: a single scalloped cloud silhouette (a ring of arcs)
// with ONE outer contour and a gradient fill, plus light interior curls — not
// a pile of separately-outlined circles (which read as a bunch of balls).
function woolBody(ctx: CanvasRenderingContext2D, woolC1: string, woolC2: string, outline: string) {
  const cx = 2, cy = 4, lobes = 11;
  const baseRx = 15, baseRy = 9.5, bumpRx = 18, bumpRy = 12.5;
  ctx.beginPath();
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * baseRx;
    const py = cy + Math.sin(a) * baseRy;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const pa = ((i - 1) / lobes) * Math.PI * 2 - Math.PI / 2;
      const ma = (a + pa) / 2;
      ctx.quadraticCurveTo(cx + Math.cos(ma) * bumpRx, cy + Math.sin(ma) * bumpRy, px, py);
    }
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, bumpRx);
  g.addColorStop(0, woolC1); g.addColorStop(1, woolC2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.6; ctx.stroke();
  // Subtle wool curls (interior detail, kept light — no hard circles)
  ctx.save();
  ctx.globalAlpha = 0.4; ctx.strokeStyle = outline; ctx.lineWidth = 0.9;
  for (const [x, y] of [[-7, -1], [-1, 3], [6, 0], [10, 5], [-4, 8], [3, -4]]) {
    ctx.beginPath(); ctx.arc(cx + x, cy + y, 2.2, Math.PI * 0.1, Math.PI * 0.95); ctx.stroke();
  }
  ctx.restore();
}

function drawPig(ctx: CanvasRenderingContext2D) { shadow(ctx, 22); pigBase(ctx, "#ffd0d8", "#e88a98", "#3a1820"); }

function drawHog(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  pigBase(ctx, "#a87838", "#5a3a14", "#1a0e04");
  // Low shaggy bristle ridge along the back (connected, not separate spikes).
  ctx.fillStyle = "#3a2410";
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.bezierCurveTo(-6, -8, -2, -8, -2, -5);
  ctx.bezierCurveTo(-2, -8, 2, -8, 2, -5);
  ctx.bezierCurveTo(2, -8, 6, -8, 6, -5);
  ctx.bezierCurveTo(5, -3, -5, -3, -6, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9; ctx.stroke();
}

function drawBoar(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  pigBase(ctx, "#4a3818", "#241408", "#0a0604");
  // Tusks
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath(); ctx.moveTo(-19, 3); ctx.lineTo(-22, -2); ctx.lineTo(-20, 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-17, 3); ctx.lineTo(-14, -2); ctx.lineTo(-16, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.8; ctx.stroke();
  // Mane — a connected shaggy dark ridge along the back (NOT a row of spikes).
  // Drawn as overlapping bristle-tufts so the silhouette reads as coarse hair.
  ctx.fillStyle = "#0a0604";
  ctx.beginPath();
  ctx.moveTo(-8, -3);
  ctx.bezierCurveTo(-9, -9, -5, -9, -4, -4);
  ctx.bezierCurveTo(-4, -10, 0, -10, 0, -4);
  ctx.bezierCurveTo(0, -10, 4, -10, 4, -4);
  ctx.bezierCurveTo(4, -9, 8, -9, 8, -3);
  ctx.bezierCurveTo(7, 0, -7, 0, -8, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 1.0; ctx.stroke();
  // A few fine hairs hinting at texture, staying tight to the ridge.
  ctx.strokeStyle = "rgba(40,28,16,0.8)"; ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const x = -6 + i * 3;
    ctx.beginPath(); ctx.moveTo(x, -5); ctx.quadraticCurveTo(x - 0.5, -8, x - 1, -6.5); ctx.stroke();
  }
  // Glowing eye
  ctx.fillStyle = "#d83a18"; ctx.beginPath(); ctx.arc(-13, -2, 1.0, 0, Math.PI*2); ctx.fill();
}

function drawWarthog(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  pigBase(ctx, "#5a4828", "#2a1a08", "#0a0604");
  // Mane — a continuous shaggy ridge running along the back, NOT a row of
  // porcupine quills. Drawn as overlapping tufts so the silhouette reads as
  // bristly hair, not spikes.
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.bezierCurveTo(-10, -10, -6, -10, -4, -3);
  ctx.bezierCurveTo(-4, -10, 0, -10, 0, -3);
  ctx.bezierCurveTo(0, -10, 4, -10, 4, -3);
  ctx.bezierCurveTo(4, -10, 8, -10, 8, -3);
  ctx.bezierCurveTo(8, -10, 12, -8, 12, -2);
  ctx.bezierCurveTo(10, 0, -8, 0, -8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  // A few short bristle hairs poking out of the mane ridge (NOT spikes —
  // they stay close to the body and are clearly hair texture)
  ctx.strokeStyle = "rgba(50,40,30,0.85)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const x = -6 + i * 3;
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.quadraticCurveTo(x - 0.5, -9, x - 1, -7);
    ctx.stroke();
  }
  // Tusks (curved up out of the lower jaw)
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath();
  ctx.moveTo(-19, 3); ctx.bezierCurveTo(-22, -2, -20, -6, -19, -2); ctx.lineTo(-18, 3); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-17, 3); ctx.bezierCurveTo(-14, -2, -16, -6, -17, -2); ctx.lineTo(-18, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.8; ctx.stroke();
  // Facial warts (signature warthog feature)
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.arc(-15, 0, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-11, 4, 1.2, 0, Math.PI * 2); ctx.fill();
}

function drawSheep(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  // Legs (dark slim) — drawn first so the wool sits on top
  ctx.fillStyle = "#2a1a18"; ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 0.8;
  for (const lx of [-7, -1, 7, 12]) {
    ctx.fillRect(lx, 13, 3, 9);
    ctx.strokeRect(lx, 13, 3, 9);
  }
  // Hooves
  ctx.fillStyle = "#0a0604";
  for (const lx of [-7, -1, 7, 12]) ctx.fillRect(lx, 21, 3, 1.5);

  // Wool body — overlapping fluff circles, off-white with soft shadow
  woolBody(ctx, "#fffdf0", "#c8c0b4", "#4a3e34");

  // Black face — pear-shaped, tilted slightly down toward snout
  ctx.fillStyle = "#1f1410";
  ctx.beginPath(); ctx.ellipse(-13, 0, 6, 7, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4; ctx.stroke();

  // Floppy ear tucked against the head
  ctx.fillStyle = "#1f1410";
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.quadraticCurveTo(-9, -10, -7, -6);
  ctx.quadraticCurveTo(-9, -3, -11, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 0.8; ctx.stroke();

  // Wool topknot peeking above the face
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath(); ctx.arc(-13, -6, 4, Math.PI*1.05, Math.PI*1.95); ctx.fill();
  ctx.strokeStyle = "#4a3e34"; ctx.lineWidth = 0.8; ctx.stroke();

  // Lighter snout patch with two nostrils
  ctx.fillStyle = "#3a2a26";
  ctx.beginPath(); ctx.ellipse(-17, 2, 3, 2.2, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0604";
  ctx.beginPath(); ctx.arc(-18, 2, 0.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-16, 2, 0.5, 0, Math.PI*2); ctx.fill();

  // Eye with bright catch-light so it reads on the dark face
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath(); ctx.arc(-14, -2, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath(); ctx.arc(-14, -2, 0.8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-13.6, -2.4, 0.3, 0, Math.PI*2); ctx.fill();
}

function drawAlpaca(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  const wool = "#f5e6c8";
  const wool2 = "#c69a55";
  const stroke = "#3a2008";

  // Long legs (slim, paired)
  ctx.fillStyle = "#a87838"; ctx.strokeStyle = stroke; ctx.lineWidth = 1.0;
  for (const lx of [-3, 3, 9, 13]) {
    ctx.fillRect(lx, 10, 2.5, 12);
    ctx.strokeRect(lx, 10, 2.5, 12);
  }
  // Hooves
  ctx.fillStyle = "#1a0e04";
  for (const lx of [-3, 3, 9, 13]) ctx.fillRect(lx, 21, 2.5, 1.5);

  // Wooly body — one scalloped fleece cloud (single contour), not separate
  // outlined blobs.
  {
    const cx = 4, cy = 6, lobes = 9;
    const baseRx = 12, baseRy = 8, bumpRx = 14.5, bumpRy = 10.5;
    ctx.beginPath();
    for (let i = 0; i <= lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * baseRx;
      const py = cy + Math.sin(a) * baseRy;
      if (i === 0) ctx.moveTo(px, py);
      else {
        const pa = ((i - 1) / lobes) * Math.PI * 2 - Math.PI / 2;
        const ma = (a + pa) / 2;
        ctx.quadraticCurveTo(cx + Math.cos(ma) * bumpRx, cy + Math.sin(ma) * bumpRy, px, py);
      }
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, bumpRx);
    g.addColorStop(0, wool); g.addColorStop(1, wool2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.4; ctx.strokeStyle = stroke; ctx.lineWidth = 0.8;
    for (const [x, y] of [[-3, 0], [4, 2], [9, 4], [0, 5]]) {
      ctx.beginPath(); ctx.arc(cx + x, cy + y, 1.9, Math.PI * 0.1, Math.PI * 0.95); ctx.stroke();
    }
    ctx.restore();
  }

  // Long S-curved neck — drawn as a tapered stroke
  ctx.strokeStyle = stroke; ctx.lineWidth = 1.4;
  ctx.fillStyle = wool;
  ctx.beginPath();
  // Right edge of neck
  ctx.moveTo(-4, 2);
  ctx.bezierCurveTo(-10, -4, -10, -10, -8, -14);
  // Top of head connector
  ctx.lineTo(-13, -14);
  // Left edge of neck
  ctx.bezierCurveTo(-15, -10, -14, -4, -8, 2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Head — chubby ellipse just above the neck top
  ctx.fillStyle = wool;
  ctx.beginPath(); ctx.ellipse(-11, -16, 5.5, 4.5, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke();

  // Fluffy head topknot
  ctx.fillStyle = "#fff7df";
  ctx.beginPath();
  ctx.arc(-13, -19, 2.4, 0, Math.PI*2);
  ctx.arc(-9, -19, 2.2, 0, Math.PI*2);
  ctx.arc(-11, -21, 2.4, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 0.9; ctx.stroke();

  // Two upright ears (banana-shaped)
  ctx.fillStyle = wool2; ctx.strokeStyle = stroke; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(-14, -19, 1.2, 3, -0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-8, -19, 1.2, 3, 0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();

  // Snout — slightly darker patch with mouth line
  ctx.fillStyle = wool2;
  ctx.beginPath(); ctx.ellipse(-15, -14, 2.2, 1.6, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-16, -13.5); ctx.lineTo(-14, -13.5); ctx.stroke();

  // Eye with catch-light
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath(); ctx.arc(-11, -16, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath(); ctx.arc(-11, -16, 0.7, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-10.7, -16.2, 0.3, 0, Math.PI*2); ctx.fill();
}

function drawGoat(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 20);
  // Legs
  ctx.fillStyle = "#a89878";
  ctx.fillRect(-8, 12, 3, 10); ctx.fillRect(-2, 12, 3, 10); ctx.fillRect(6, 12, 3, 10); ctx.fillRect(12, 12, 3, 10);
  ctx.strokeStyle = "#3a2810"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-8, 12, 3, 10); ctx.strokeRect(-2, 12, 3, 10); ctx.strokeRect(6, 12, 3, 10); ctx.strokeRect(12, 12, 3, 10);
  ctx.fillStyle = "#1a0e04";
  ctx.fillRect(-8, 21, 3, 1.5); ctx.fillRect(-2, 21, 3, 1.5); ctx.fillRect(6, 21, 3, 1.5); ctx.fillRect(12, 21, 3, 1.5);
  // Body
  const g = ctx.createRadialGradient(-2, -2, 3, 0, 4, 16);
  g.addColorStop(0, "#fffce8"); g.addColorStop(0.5, "#d8c098"); g.addColorStop(1, "#7a5418");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 4, 14, 9, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.8; ctx.stroke();
  // Beard goatee
  ctx.fillStyle = "#fffce8";
  ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(-15, 8); ctx.lineTo(-13, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Head
  ctx.fillStyle = "#d8c098";
  ctx.beginPath(); ctx.ellipse(-12, -2, 6, 6, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  // Horns — small back-curving
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-12, -7); ctx.bezierCurveTo(-12, -12, -16, -12, -16, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -7); ctx.bezierCurveTo(-9, -12, -5, -12, -5, -8); ctx.stroke();
  // Ear
  ctx.fillStyle = "#a89878";
  ctx.beginPath(); ctx.ellipse(-7, -4, 3, 2, 0.4, 0, Math.PI*2); ctx.fill();
  // Eye — vertical pupil
  ctx.fillStyle = "#fff8c0"; ctx.beginPath(); ctx.arc(-13, -3, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.fillRect(-13.4, -4, 0.8, 2);
  // Snout
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-17, 0, 1.0, 0, Math.PI*2); ctx.fill();
}

function drawRam(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  const stroke = "#2a1808";

  // Legs (stout)
  ctx.fillStyle = "#7a5418"; ctx.strokeStyle = stroke; ctx.lineWidth = 1.0;
  for (const lx of [-7, -1, 7, 12]) {
    ctx.fillRect(lx, 13, 3, 9);
    ctx.strokeRect(lx, 13, 3, 9);
  }
  ctx.fillStyle = "#0a0604";
  for (const lx of [-7, -1, 7, 12]) ctx.fillRect(lx, 21, 3, 1.5);

  // Powerful wool body (cream + brown)
  woolBody(ctx, "#fff5d8", "#9c7c44", stroke);

  // Brown head
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.ellipse(-13, 0, 6.5, 7.5, -0.08, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 1.6; ctx.stroke();

  // Curled horns — drawn as filled spirals using stacked arcs from outside in.
  // Each horn is anchored at the side of the head and spirals back into a
  // tighter centre, with a darker outline so the silhouette reads.
  const drawHorn = (ax: number, ay: number, mirror: boolean) => {
    ctx.save();
    ctx.translate(ax, ay);
    if (mirror) ctx.scale(-1, 1);
    // Outer thick arc
    ctx.fillStyle = "#c89858";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-9, -2, -10, 5);
    ctx.quadraticCurveTo(-9, 11, -3, 11);
    ctx.quadraticCurveTo(2, 10, 1, 6);
    ctx.quadraticCurveTo(-1, 3, -3, 5);
    ctx.lineTo(-1, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke();
    // Spiral ridges
    ctx.strokeStyle = "rgba(60,36,12,0.8)"; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-6 + i*0.6, 5 + i*0.3, 5 - i*0.9, Math.PI*1.05, Math.PI*1.95);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawHorn(-13, -4, false); // left horn
  drawHorn(-13, -4, true);  // right horn (mirrored)

  // Forelock between horns
  ctx.fillStyle = "#fff5d8";
  ctx.beginPath();
  ctx.arc(-13, -7, 2.2, Math.PI*1.05, Math.PI*1.95);
  ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke();

  // Snout — black with two nostrils
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.ellipse(-18, 2, 3.2, 2.4, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3a2010";
  ctx.beginPath(); ctx.arc(-19, 1.5, 0.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-17, 1.5, 0.5, 0, Math.PI*2); ctx.fill();

  // Eye — big with horizontal pupil to read as ungulate
  ctx.fillStyle = "#fff5d0";
  ctx.beginPath(); ctx.ellipse(-14, -2, 1.6, 1.2, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.fillRect(-15.2, -2.5, 2.4, 1);
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-14.4, -2.4, 0.3, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  tile_herd_pig:     { label:"Pig",     color:"#e88a98", draw:drawPig },
  tile_herd_hog:     { label:"Hog",     color:"#a87838", draw:drawHog },
  tile_herd_boar:    { label:"Boar",    color:"#241408", draw:drawBoar },
  tile_herd_warthog: { label:"Warthog", color:"#5a4828", draw:drawWarthog },
  tile_herd_sheep:   { label:"Sheep",   color:"#fffce8", draw:drawSheep },
  tile_herd_alpaca:  { label:"Alpaca",  color:"#f8e8c8", draw:drawAlpaca },
  tile_herd_goat:    { label:"Goat",    color:"#d8c098", draw:drawGoat },
  tile_herd_ram:     { label:"Ram",     color:"#a87838", draw:drawRam },
};
