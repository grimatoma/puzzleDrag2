// Pets — farm animals, barnyard babies & cuddly companions. Chibi-proportioned
// (big head, round body), drawn centered at the origin in a ~-24..+24 box.

function shadow(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(0, 22, w, 4, 0, 0, Math.PI * 2); ctx.fill();
}

// Soft rosy cheek blush — drawn at low alpha.
function blush(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "rgba(255,140,150,0.4)";
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
}

// Big round eye with a white highlight dot.
function cuteEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#1a1208";
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.4, 0, Math.PI * 2); ctx.fill();
}

function drawCat(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Curled tail behind the body
  ctx.strokeStyle = "#d86a18"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(11, 14);
  ctx.bezierCurveTo(20, 12, 20, 2, 12, 4);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Body — sitting, pear-shaped
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#ffb04a"); bg.addColorStop(0.6, "#ec8a1e"); bg.addColorStop(1, "#a85a0c");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.bezierCurveTo(-13, 12, -10, 20, 0, 20);
  ctx.bezierCurveTo(10, 20, 13, 12, 9, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 2; ctx.stroke();
  // Body stripes
  ctx.strokeStyle = "rgba(120,56,6,0.55)"; ctx.lineWidth = 1.4;
  [[-6, 8, -8, 12], [0, 10, 0, 15], [6, 8, 8, 12]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });
  // Front paws
  ctx.fillStyle = "#ffc06a";
  ctx.beginPath(); ctx.ellipse(-4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 1; ctx.stroke();
  // Head — big and round
  const hg = ctx.createRadialGradient(-3, -10, 2, 0, -6, 14);
  hg.addColorStop(0, "#ffba56"); hg.addColorStop(1, "#e8841a");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 2; ctx.stroke();
  // Ears
  ctx.fillStyle = "#e8841a";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 5, -14);
    ctx.lineTo(side * 10, -20);
    ctx.lineTo(side * 11, -12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 1.6; ctx.stroke();
    // Inner ear
    ctx.fillStyle = "#ffb8b0";
    ctx.beginPath();
    ctx.moveTo(side * 6, -14);
    ctx.lineTo(side * 9, -18);
    ctx.lineTo(side * 9.5, -13);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8841a";
  });
  // Head stripes
  ctx.strokeStyle = "rgba(120,56,6,0.5)"; ctx.lineWidth = 1.2;
  [[-2, -15, -2, -11], [2, -15, 2, -11], [0, -16, 0, -12]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });
  // Green eyes
  [-4, 4].forEach((ex) => {
    ctx.fillStyle = "#3fae4a";
    ctx.beginPath(); ctx.ellipse(ex, -6, 2.4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#102a10";
    ctx.beginPath(); ctx.ellipse(ex, -6, 1, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(ex - 0.8, -7.2, 0.8, 0, Math.PI * 2); ctx.fill();
  });
  // Nose + mouth
  ctx.fillStyle = "#d05a64";
  ctx.beginPath(); ctx.moveTo(-1.6, -1.5); ctx.lineTo(1.6, -1.5); ctx.lineTo(0, 0.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 0.2); ctx.quadraticCurveTo(-2.5, 2, -4, 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0.2); ctx.quadraticCurveTo(2.5, 2, 4, 0.5); ctx.stroke();
  // Whiskers
  ctx.strokeStyle = "rgba(90,44,6,0.6)"; ctx.lineWidth = 0.8;
  [[-3, -2, -12, -3], [-3, -1, -12, 0], [3, -2, 12, -3], [3, -1, 12, 0]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });
  blush(ctx, -6, -2, 2.4); blush(ctx, 6, -2, 2.4);
}

function drawDog(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Wagging tail
  ctx.strokeStyle = "#8a5a2c"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(10, 12); ctx.quadraticCurveTo(18, 8, 16, -1); ctx.stroke();
  ctx.lineCap = "butt";
  // Body — round and chubby
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#b07e44"); bg.addColorStop(0.6, "#8a5a2c"); bg.addColorStop(1, "#5a3614");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.bezierCurveTo(-13, 12, -10, 20, 0, 20);
  ctx.bezierCurveTo(10, 20, 13, 12, 9, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 2; ctx.stroke();
  // Cream belly patch
  ctx.fillStyle = "#f0d8a8";
  ctx.beginPath(); ctx.ellipse(0, 13, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Front paws
  ctx.fillStyle = "#c89858";
  ctx.beginPath(); ctx.ellipse(-4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 1; ctx.stroke();
  // Floppy ears (behind head)
  ctx.fillStyle = "#6a4220";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(side * 11, -6, 4, 8, side * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 1.4; ctx.stroke();
  });
  // Head
  const hg = ctx.createRadialGradient(-3, -10, 2, 0, -6, 14);
  hg.addColorStop(0, "#b88a50"); hg.addColorStop(1, "#8a5a2c");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 2; ctx.stroke();
  // Muzzle
  ctx.fillStyle = "#f0d8a8";
  ctx.beginPath(); ctx.ellipse(0, -1, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 1.2; ctx.stroke();
  // Eyes
  cuteEye(ctx, -4, -8, 2.2); cuteEye(ctx, 4, -8, 2.2);
  // Nose
  ctx.fillStyle = "#2a1608";
  ctx.beginPath(); ctx.ellipse(0, -3, 2.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.arc(-0.8, -3.6, 0.7, 0, Math.PI * 2); ctx.fill();
  // Tongue out + smile
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 1.5); ctx.stroke();
  ctx.fillStyle = "#f08a90";
  ctx.beginPath();
  ctx.moveTo(-2.4, 1.5);
  ctx.bezierCurveTo(-2.4, 5.5, 2.4, 5.5, 2.4, 1.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#c0606a"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 1.8); ctx.lineTo(0, 4.5); ctx.stroke();
  blush(ctx, -7, -3, 2.4); blush(ctx, 7, -3, 2.4);
}

function drawRabbit(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  // Long ears (behind head)
  [-1, 1].forEach((side) => {
    ctx.fillStyle = "#fdf6ee";
    ctx.beginPath();
    ctx.ellipse(side * 5, -16, 3.4, 10, side * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c8b8a8"; ctx.lineWidth = 1.6; ctx.stroke();
    // Pink inner ear
    ctx.fillStyle = "#ffc0cc";
    ctx.beginPath();
    ctx.ellipse(side * 5, -16, 1.6, 7.5, side * 0.18, 0, Math.PI * 2); ctx.fill();
  });
  // Fluffy tail
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(11, 14, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d8cabb"; ctx.lineWidth = 1; ctx.stroke();
  // Body
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.7, "#f4ece2"); bg.addColorStop(1, "#d8cabb");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.bezierCurveTo(-12, 12, -9, 20, 0, 20);
  ctx.bezierCurveTo(9, 20, 12, 12, 8, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#b8a898"; ctx.lineWidth = 2; ctx.stroke();
  // Front paws
  ctx.fillStyle = "#fdf6ee";
  ctx.beginPath(); ctx.ellipse(-4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b8a898"; ctx.lineWidth = 1; ctx.stroke();
  // Head
  const hg = ctx.createRadialGradient(-3, -8, 2, 0, -5, 13);
  hg.addColorStop(0, "#ffffff"); hg.addColorStop(1, "#ece2d4");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -5, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b8a898"; ctx.lineWidth = 2; ctx.stroke();
  // Eyes
  cuteEye(ctx, -4, -6, 2.2); cuteEye(ctx, 4, -6, 2.2);
  // Nose + mouth
  ctx.fillStyle = "#f08a98";
  ctx.beginPath(); ctx.moveTo(-1.4, -1); ctx.lineTo(1.4, -1); ctx.lineTo(0, 0.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#b8a898"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(0, 0.4); ctx.lineTo(0, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(-2, 3, -3, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(2, 3, 3, 2); ctx.stroke();
  blush(ctx, -6, -2, 2.4); blush(ctx, 6, -2, 2.4);
}

function drawChick(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  // Feet
  ctx.strokeStyle = "#f0a020"; ctx.lineWidth = 1.8;
  [-3, 3].forEach((fx) => {
    ctx.beginPath(); ctx.moveTo(fx, 18); ctx.lineTo(fx, 21); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx - 2, 22); ctx.lineTo(fx, 21); ctx.lineTo(fx + 2, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, 21); ctx.lineTo(fx, 22.5); ctx.stroke();
  });
  // Round fuzzy body
  const bg = ctx.createRadialGradient(-3, -2, 3, 0, 2, 18);
  bg.addColorStop(0, "#fff6b0"); bg.addColorStop(0.6, "#ffe04a"); bg.addColorStop(1, "#e8b020");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 2, 16, 0, Math.PI * 2); ctx.fill();
  // Scalloped fuzz outline
  ctx.strokeStyle = "#c88a14"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = 16 + Math.sin(a * 12) * 0.8;
    const x = Math.cos(a) * r; const y = 2 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.stroke();
  // Tiny wing
  ctx.fillStyle = "#f8cc30";
  ctx.beginPath(); ctx.ellipse(9, 3, 4, 6, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c88a14"; ctx.lineWidth = 1.2; ctx.stroke();
  // Eyes
  cuteEye(ctx, -4, -2, 2.4); cuteEye(ctx, 4, -2, 2.4);
  // Tiny orange beak
  ctx.fillStyle = "#f0901a";
  ctx.beginPath(); ctx.moveTo(-2.4, 3); ctx.lineTo(2.4, 3); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#b86a10"; ctx.lineWidth = 0.8; ctx.stroke();
  blush(ctx, -8, 1, 2.6); blush(ctx, 8, 1, 2.6);
  // Top fuzz tuft
  ctx.strokeStyle = "#f8cc30"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  [-2, 0, 2].forEach((dx) => {
    ctx.beginPath(); ctx.moveTo(dx, -14); ctx.lineTo(dx * 1.6, -19); ctx.stroke();
  });
  ctx.lineCap = "butt";
}

function drawDuckling(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 13);
  // Webbed feet
  ctx.fillStyle = "#f0901a";
  [-4, 4].forEach((fx) => {
    ctx.beginPath();
    ctx.moveTo(fx - 3, 22); ctx.lineTo(fx, 18); ctx.lineTo(fx + 3, 22);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#b86a10"; ctx.lineWidth = 0.8; ctx.stroke();
  });
  // Fuzzy body
  const bg = ctx.createRadialGradient(-3, 2, 3, 0, 6, 18);
  bg.addColorStop(0, "#fff8c0"); bg.addColorStop(0.6, "#ffe66a"); bg.addColorStop(1, "#eec034");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, 6, 14, 13, 0, 0, Math.PI * 2); ctx.fill();
  // Scalloped fuzz
  ctx.strokeStyle = "#cc9a1e"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const rr = 1 + Math.sin(a * 11) * 0.06;
    const x = Math.cos(a) * 14 * rr; const y = 6 + Math.sin(a) * 13 * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.stroke();
  // Little tail tuft
  ctx.fillStyle = "#ffe66a";
  ctx.beginPath(); ctx.moveTo(12, 2); ctx.quadraticCurveTo(18, -2, 15, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#cc9a1e"; ctx.lineWidth = 1; ctx.stroke();
  // Head
  const hg = ctx.createRadialGradient(-3, -8, 2, 0, -6, 12);
  hg.addColorStop(0, "#fff8c0"); hg.addColorStop(1, "#ffe04a");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(-3, -6, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#cc9a1e"; ctx.lineWidth = 1.8; ctx.stroke();
  // Flat orange bill
  ctx.fillStyle = "#f0901a";
  ctx.beginPath(); ctx.ellipse(-12, -4, 5, 3, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b86a10"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = "#b86a10"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-16, -4); ctx.lineTo(-9, -4); ctx.stroke();
  // Eye
  cuteEye(ctx, -4, -7, 2.2);
  blush(ctx, -7, -3, 2.4);
}

function drawLamb(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 15);
  // Legs
  ctx.fillStyle = "#3a2c20";
  ctx.fillRect(-7, 16, 3, 6); ctx.fillRect(-1, 17, 3, 6); ctx.fillRect(5, 16, 3, 6);
  ctx.strokeStyle = "#1f160e"; ctx.lineWidth = 1;
  ctx.strokeRect(-7, 16, 3, 6); ctx.strokeRect(-1, 17, 3, 6); ctx.strokeRect(5, 16, 3, 6);
  // Woolly body — scalloped cloud outline
  const bg = ctx.createRadialGradient(-3, 0, 3, 0, 4, 18);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.7, "#f2eee8"); bg.addColorStop(1, "#d8d0c4");
  ctx.fillStyle = bg;
  const bumps = 13; const cx = 0; const cy = 5; const br = 13;
  ctx.beginPath();
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    const r = br + 2.4;
    const x = cx + Math.cos(a) * r * 1.15; const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const pa = ((i - 0.5) / bumps) * Math.PI * 2;
      const px = cx + Math.cos(pa) * (r + 2.6) * 1.15; const py = cy + Math.sin(pa) * (r + 2.6);
      ctx.quadraticCurveTo(px, py, x, y);
    }
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#c0b6a8"; ctx.lineWidth = 1.6; ctx.stroke();
  // Wool curl texture
  ctx.strokeStyle = "rgba(180,168,152,0.6)"; ctx.lineWidth = 0.9;
  [[-6, 2], [2, -2], [6, 4], [-2, 6], [-8, 8]].forEach(([wx, wy]) => {
    ctx.beginPath(); ctx.arc(wx, wy, 2.2, 0.4, Math.PI * 1.6); ctx.stroke();
  });
  // Cream face
  ctx.fillStyle = "#f0e2cc";
  ctx.beginPath(); ctx.ellipse(-7, -8, 7, 7.5, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c8b89a"; ctx.lineWidth = 1.6; ctx.stroke();
  // Floppy ears
  ctx.fillStyle = "#e0d0b8";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(-7 + side * 7, -10, 4, 2.4, side * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c8b89a"; ctx.lineWidth = 1.2; ctx.stroke();
  });
  // Woolly forelock
  ctx.fillStyle = "#ffffff";
  [-9, -6, -3].forEach((fx) => {
    ctx.beginPath(); ctx.arc(fx, -13, 2.6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.strokeStyle = "#d8d0c4"; ctx.lineWidth = 0.8;
  [-9, -6, -3].forEach((fx) => {
    ctx.beginPath(); ctx.arc(fx, -13, 2.6, 0, Math.PI * 2); ctx.stroke();
  });
  // Eyes
  cuteEye(ctx, -9, -8, 2); cuteEye(ctx, -4, -8, 2);
  // Nose
  ctx.fillStyle = "#b089a0";
  ctx.beginPath(); ctx.ellipse(-7, -4, 2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  blush(ctx, -11, -5, 2.2); blush(ctx, -3, -5, 2.2);
}

function drawPiglet(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Curly tail
  ctx.strokeStyle = "#e08a98"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(11, 8); ctx.bezierCurveTo(17, 6, 14, 1, 18, 0);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Body
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#ffd2da"); bg.addColorStop(0.6, "#f3a4b2"); bg.addColorStop(1, "#cc7888");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.bezierCurveTo(-13, 12, -10, 20, 0, 20);
  ctx.bezierCurveTo(10, 20, 13, 12, 9, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 2; ctx.stroke();
  // Trotters
  ctx.fillStyle = "#b86878";
  ctx.beginPath(); ctx.ellipse(-4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 1; ctx.stroke();
  // Head
  const hg = ctx.createRadialGradient(-3, -10, 2, 0, -6, 13);
  hg.addColorStop(0, "#ffd2da"); hg.addColorStop(1, "#f0a0ae");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 2; ctx.stroke();
  // Big ears
  ctx.fillStyle = "#f0a0ae";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 6, -14);
    ctx.lineTo(side * 12, -18);
    ctx.lineTo(side * 10, -9);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 1.4; ctx.stroke();
  });
  // Snout
  ctx.fillStyle = "#e889a0";
  ctx.beginPath(); ctx.ellipse(0, -1, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "#9a5060";
  ctx.beginPath(); ctx.ellipse(-2, -1, 0.9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(2, -1, 0.9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  // Eyes
  cuteEye(ctx, -4, -8, 2.2); cuteEye(ctx, 4, -8, 2.2);
  blush(ctx, -7, -3, 2.6); blush(ctx, 7, -3, 2.6);
}

function drawGoatKid(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Legs
  ctx.fillStyle = "#9a6a3a";
  ctx.fillRect(-7, 16, 3, 6); ctx.fillRect(-1, 17, 3, 6); ctx.fillRect(5, 16, 3, 6);
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 1;
  ctx.strokeRect(-7, 16, 3, 6); ctx.strokeRect(-1, 17, 3, 6); ctx.strokeRect(5, 16, 3, 6);
  // Body — white
  const bg = ctx.createRadialGradient(-3, 0, 3, 0, 4, 18);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.7, "#f2ede4"); bg.addColorStop(1, "#d6ccbc");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(1, 6, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b8a890"; ctx.lineWidth = 2; ctx.stroke();
  // Brown patch
  ctx.fillStyle = "#a9743e";
  ctx.beginPath(); ctx.ellipse(7, 8, 6, 5, 0.2, 0, Math.PI * 2); ctx.fill();
  // Stubby tail
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.moveTo(12, 1); ctx.lineTo(17, -2); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#b8a890"; ctx.lineWidth = 1; ctx.stroke();
  // Head — brown
  const hg = ctx.createRadialGradient(-9, -10, 2, -7, -6, 12);
  hg.addColorStop(0, "#c79360"); hg.addColorStop(1, "#9a6a3a");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(-8, -6, 8, 8, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 1.8; ctx.stroke();
  // White muzzle
  ctx.fillStyle = "#f4ece0";
  ctx.beginPath(); ctx.ellipse(-12, -2, 4, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  // Little horns
  ctx.strokeStyle = "#d8c4a0"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-10, -13); ctx.quadraticCurveTo(-12, -18, -9, -19); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -13); ctx.quadraticCurveTo(-5, -18, -2, -18); ctx.stroke();
  ctx.lineCap = "butt";
  // Floppy ears
  ctx.fillStyle = "#9a6a3a";
  ctx.beginPath(); ctx.ellipse(-15, -8, 4, 2.4, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-1, -9, 4, 2.4, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(-15, -8, 4, 2.4, 0.4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-1, -9, 4, 2.4, -0.5, 0, Math.PI * 2); ctx.stroke();
  // Eyes
  cuteEye(ctx, -10, -6, 2); cuteEye(ctx, -5, -6, 2);
  // Nose
  ctx.fillStyle = "#5a3a24";
  ctx.beginPath(); ctx.ellipse(-12, -2, 1.6, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  // Tiny goatee
  ctx.strokeStyle = "#f4ece0"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(-12, 5); ctx.stroke();
  ctx.lineCap = "butt";
  blush(ctx, -13, -4, 2.2);
}

function drawHedgehog(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 15);
  // Spiky back — overlapping triangle spikes forming a dome
  const spikeBase = "#6a4a2a"; const spikeTip = "#43301c";
  for (let layer = 0; layer < 2; layer++) {
    const rad = 15 - layer * 4;
    const yoff = -layer * 2;
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const bx = Math.cos(a) * rad; const by = 4 + yoff + Math.sin(a) * rad;
      const tx = Math.cos(a) * (rad + 6); const ty = 4 + yoff + Math.sin(a) * (rad + 6);
      const perp = a + Math.PI / 2;
      ctx.fillStyle = i % 2 === 0 ? spikeBase : spikeTip;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(perp) * 2.4, by + Math.sin(perp) * 2.4);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx - Math.cos(perp) * 2.4, by - Math.sin(perp) * 2.4);
      ctx.closePath(); ctx.fill();
    }
  }
  // Body dome
  const bg = ctx.createRadialGradient(-3, 0, 3, 0, 4, 16);
  bg.addColorStop(0, "#7a5836"); bg.addColorStop(0.7, "#5a3e22"); bg.addColorStop(1, "#3a2614");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-15, 6);
  ctx.bezierCurveTo(-15, -8, 15, -8, 15, 6);
  ctx.bezierCurveTo(12, 14, -12, 14, -15, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2a1c0e"; ctx.lineWidth = 1.8; ctx.stroke();
  // Cream tummy fur
  ctx.fillStyle = "#e8c89a";
  ctx.beginPath(); ctx.ellipse(0, 11, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Face (cream, pointing left)
  ctx.fillStyle = "#e8c89a";
  ctx.beginPath(); ctx.ellipse(-12, 4, 7, 6, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b89868"; ctx.lineWidth = 1.4; ctx.stroke();
  // Little snout
  ctx.fillStyle = "#d8b888";
  ctx.beginPath(); ctx.ellipse(-18, 5, 3, 2.4, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b89868"; ctx.lineWidth = 1; ctx.stroke();
  // Nose tip
  ctx.fillStyle = "#3a2414";
  ctx.beginPath(); ctx.arc(-20.5, 4.5, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.arc(-21, 4, 0.6, 0, Math.PI * 2); ctx.fill();
  // Ear
  ctx.fillStyle = "#c8a878";
  ctx.beginPath(); ctx.arc(-9, -1, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b89868"; ctx.lineWidth = 1; ctx.stroke();
  // Eyes
  cuteEye(ctx, -13, 3, 2); cuteEye(ctx, -9, 4, 1.8);
  // Tiny feet
  ctx.fillStyle = "#d8b888";
  ctx.beginPath(); ctx.ellipse(-4, 13, 2.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 13, 2.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  blush(ctx, -15, 6, 2.2);
}

function drawFrog(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Back feet splayed out
  ctx.fillStyle = "#5fa838";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 11, 16);
    ctx.lineTo(side * 19, 20);
    ctx.lineTo(side * 17, 22);
    ctx.lineTo(side * 11, 19);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#2e5a18"; ctx.lineWidth = 1.2; ctx.stroke();
  });
  // Body — round and squat
  const bg = ctx.createRadialGradient(-3, 2, 3, 0, 6, 18);
  bg.addColorStop(0, "#9fd85a"); bg.addColorStop(0.6, "#6cb83a"); bg.addColorStop(1, "#3f8420");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, 8, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#27531a"; ctx.lineWidth = 2; ctx.stroke();
  // Pale belly
  ctx.fillStyle = "#e4f0b0";
  ctx.beginPath(); ctx.ellipse(0, 13, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Front feet
  ctx.fillStyle = "#6cb83a";
  [-5, 5].forEach((fx) => {
    ctx.beginPath(); ctx.ellipse(fx, 18, 3.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2e5a18"; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = "#2e5a18"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(fx - 1.5, 19.5); ctx.lineTo(fx - 1.5, 17.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx + 1.5, 19.5); ctx.lineTo(fx + 1.5, 17.5); ctx.stroke();
  });
  // Big bulging eyes on top
  [-7, 7].forEach((ex) => {
    ctx.fillStyle = "#7cc245";
    ctx.beginPath(); ctx.arc(ex, -8, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#27531a"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = "#fffce0";
    ctx.beginPath(); ctx.arc(ex, -8, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1208";
    ctx.beginPath(); ctx.arc(ex, -7, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(ex - 1, -8.4, 1, 0, Math.PI * 2); ctx.fill();
  });
  // Nostrils
  ctx.fillStyle = "#2e5a18";
  ctx.beginPath(); ctx.arc(-2, 0, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, 0, 0.8, 0, Math.PI * 2); ctx.fill();
  // Big smiley mouth
  ctx.strokeStyle = "#27531a"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, 4, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.lineCap = "butt";
  blush(ctx, -9, 6, 2.6); blush(ctx, 9, 6, 2.6);
}

export const ICONS = {
  pet_cat:      { label: "Cat",       color: "#ec8a1e", draw: drawCat },
  pet_dog:      { label: "Puppy",     color: "#8a5a2c", draw: drawDog },
  pet_rabbit:   { label: "Rabbit",    color: "#f4ece2", draw: drawRabbit },
  pet_chick:    { label: "Chick",     color: "#ffe04a", draw: drawChick },
  pet_duckling: { label: "Duckling",  color: "#ffe66a", draw: drawDuckling },
  pet_lamb:     { label: "Lamb",      color: "#f2eee8", draw: drawLamb },
  pet_piglet:   { label: "Piglet",    color: "#f3a4b2", draw: drawPiglet },
  pet_goat_kid: { label: "Goat Kid",  color: "#9a6a3a", draw: drawGoatKid },
  pet_hedgehog: { label: "Hedgehog",  color: "#5a3e22", draw: drawHedgehog },
  pet_frog:     { label: "Frog",      color: "#6cb83a", draw: drawFrog },
};
