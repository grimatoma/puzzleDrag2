// Farm crops & produce.

function drawCorn(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Peeled-back husk leaves (behind the cob)
  const huskLeaves: Array<[number, number]> = [[-1, -0.55], [1, 0.55], [0, 0]];
  huskLeaves.forEach(([side, lean]) => {
    const grad = ctx.createLinearGradient(0, 4, side * 16, 22);
    grad.addColorStop(0, "#9ccc54");
    grad.addColorStop(1, "#3a6014");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.bezierCurveTo(side * 8, 8, side * 14 + lean * 4, 18, side * 9, 24);
    ctx.bezierCurveTo(side * 4, 20, side * 2, 12, 0, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e4810";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // midrib
    ctx.strokeStyle = "rgba(46,72,16,0.6)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(side * 8, 20);
    ctx.stroke();
  });
  // Cob body — long rounded ear
  const body = ctx.createLinearGradient(-9, 0, 9, 0);
  body.addColorStop(0, "#fff0a0");
  body.addColorStop(0.5, "#f4c428");
  body.addColorStop(1, "#a87808");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(-9, -20, -10, -4, -8, 8);
  ctx.bezierCurveTo(-6, 16, -3, 18, 0, 18);
  ctx.bezierCurveTo(3, 18, 6, 16, 8, 8);
  ctx.bezierCurveTo(10, -4, 9, -20, 0, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#6e4a08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Kernels — clipped grid of little rounded squares
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(-9, -20, -10, -4, -8, 8);
  ctx.bezierCurveTo(-6, 16, -3, 18, 0, 18);
  ctx.bezierCurveTo(3, 18, 6, 16, 8, 8);
  ctx.bezierCurveTo(10, -4, 9, -20, 0, -22);
  ctx.closePath();
  ctx.clip();
  for (let row = 0; row < 11; row++) {
    const ry = -20 + row * 3.6;
    const offset = row % 2 === 0 ? 0 : 1.6;
    for (let col = -3; col <= 3; col++) {
      const kx = col * 3.2 + offset;
      const kr = 1.7;
      const grad = ctx.createRadialGradient(kx - 0.6, ry - 0.6, 0.3, kx, ry, kr + 0.6);
      grad.addColorStop(0, "#fff4b8");
      grad.addColorStop(0.7, "#f0bc20");
      grad.addColorStop(1, "#c88c10");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(kx, ry, kr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(110,74,8,0.45)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }
  ctx.restore();
  // Silk tuft at the tip
  ctx.strokeStyle = "#d8a838";
  ctx.lineWidth = 1;
  [-3, 0, 3].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(dx * 0.4, -22);
    ctx.quadraticCurveTo(dx, -28, dx * 1.5, -26);
    ctx.stroke();
  });
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-4, -6, 1.8, 8, -0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawPumpkin(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body — wide squat orange globe
  const body = ctx.createRadialGradient(-5, -2, 3, 0, 4, 24);
  body.addColorStop(0, "#ffc070");
  body.addColorStop(0.5, "#e87818");
  body.addColorStop(1, "#8a3a08");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a2008";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Ribs — vertical bulging lobes (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 17, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(74,32,8,0.55)";
  ctx.lineWidth = 1.4;
  [-14, -7, 0, 7, 14].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -11);
    ctx.bezierCurveTo(x * 1.25, -2, x * 1.25, 14, x, 23);
    ctx.stroke();
  });
  // Lighter rib highlights
  ctx.strokeStyle = "rgba(255,210,150,0.4)";
  ctx.lineWidth = 1;
  [-10.5, -3.5, 3.5, 10.5].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -9);
    ctx.bezierCurveTo(x * 1.2, 0, x * 1.2, 12, x, 21);
    ctx.stroke();
  });
  ctx.restore();
  // Specular highlight
  ctx.fillStyle = "rgba(255,245,210,0.4)";
  ctx.beginPath();
  ctx.ellipse(-9, -2, 4, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Green stem — chunky curved
  const stem = ctx.createLinearGradient(-3, -22, 3, -10);
  stem.addColorStop(0, "#7cb840");
  stem.addColorStop(1, "#3a6014");
  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.moveTo(-3, -10);
  ctx.bezierCurveTo(-4, -18, -2, -22, 2, -24);
  ctx.lineTo(5, -22);
  ctx.bezierCurveTo(2, -20, 3, -14, 3, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#23400c";
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function drawSunflower(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  const stem = ctx.createLinearGradient(-3, 0, 3, 0);
  stem.addColorStop(0, "#7cb840");
  stem.addColorStop(1, "#3a6014");
  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.moveTo(-2.5, -4);
  ctx.lineTo(-1.5, 24);
  ctx.lineTo(1.5, 24);
  ctx.lineTo(2.5, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e4810";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Leaves on stem
  ([[-1, 10], [1, 16]] as Array<[number, number]>).forEach(([side, sy]) => {
    const grad = ctx.createLinearGradient(0, sy, side * 12, sy + 2);
    grad.addColorStop(0, "#9ccc54");
    grad.addColorStop(1, "#3a6014");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.bezierCurveTo(side * 6, sy - 5, side * 13, sy - 3, side * 13, sy + 2);
    ctx.bezierCurveTo(side * 8, sy + 6, side * 3, sy + 4, 0, sy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e4810";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  // Petals — ring of golden teardrops
  const cy = -8;
  const petalCount = 14;
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    const ir = 9, or = 17;
    const ix = Math.cos(a) * ir;
    const iy = cy + Math.sin(a) * ir;
    const ox = Math.cos(a) * or;
    const oy = cy + Math.sin(a) * or;
    const px = Math.cos(a + Math.PI / 2) * 3;
    const py = Math.sin(a + Math.PI / 2) * 3;
    const grad = ctx.createLinearGradient(ix, iy, ox, oy);
    grad.addColorStop(0, "#ffd24a");
    grad.addColorStop(1, "#e89010");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ix - px, iy - py);
    ctx.quadraticCurveTo(ox, oy - 2, ox, oy);
    ctx.quadraticCurveTo(ox, oy + 2, ix + px, iy + py);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(168,96,8,0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  // Dark seeded center
  const center = ctx.createRadialGradient(-3, cy - 3, 2, 0, cy, 11);
  center.addColorStop(0, "#7a5418");
  center.addColorStop(0.6, "#4a3008");
  center.addColorStop(1, "#231804");
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1002";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Seed texture — small spiral dots
  ctx.fillStyle = "rgba(40,26,6,0.85)";
  for (let i = 0; i < 36; i++) {
    const a = i * 2.399;
    const r = Math.sqrt(i / 36) * 8.5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, cy + Math.sin(a) * r, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center highlight
  ctx.fillStyle = "rgba(180,140,60,0.5)";
  ctx.beginPath();
  ctx.arc(-3, cy - 3, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawWheat(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stalks fanning up from a bound base
  const stalks: Array<[number, number]> = [[-0.5, -0.32], [0, 0], [0.5, 0.32]];
  // Stems first (behind heads)
  ctx.strokeStyle = "#c89838";
  ctx.lineWidth = 2;
  stalks.forEach(([, lean]) => {
    ctx.beginPath();
    ctx.moveTo(lean * 2, 18);
    ctx.quadraticCurveTo(lean * 10, 0, lean * 16, -10);
    ctx.stroke();
  });
  // Grain heads — each a vertical cluster of paired grains
  stalks.forEach(([, lean]) => {
    const tipX = lean * 16;
    const tipY = -10;
    const baseX = lean * 8;
    const baseY = 0;
    for (let t = 0; t <= 1; t += 0.16) {
      const gx = baseX + (tipX - baseX) * t;
      const gy = baseY + (tipY - baseY) * t;
      const perpX = 3.4 * (1 - t * 0.3);
      ([-1, 1] as number[]).forEach((sideDir) => {
        const ex = gx + sideDir * perpX + lean * 1.5;
        const ey = gy - 1.5;
        const grad = ctx.createLinearGradient(gx, gy, ex, ey);
        grad.addColorStop(0, "#e8c24a");
        grad.addColorStop(1, "#a8780c");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 2.6, 1.7, -0.5 * sideDir + lean * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(110,74,8,0.6)";
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });
    }
    // awns (whiskers) at the tip
    ctx.strokeStyle = "rgba(232,200,90,0.8)";
    ctx.lineWidth = 0.8;
    [-2, 0, 2].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + dx + lean * 2, tipY - 8);
      ctx.stroke();
    });
  });
  // Binding twine around the base
  ctx.strokeStyle = "#8a5a1e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.quadraticCurveTo(0, 9, 5, 12);
  ctx.stroke();
  ctx.strokeStyle = "#5a3a10";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.quadraticCurveTo(0, 9, 5, 12);
  ctx.stroke();
}

function drawPotato(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 20, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lumpy body — irregular blob
  const body = ctx.createRadialGradient(-6, -4, 3, 2, 6, 24);
  body.addColorStop(0, "#d8b074");
  body.addColorStop(0.5, "#a87838");
  body.addColorStop(1, "#5a3a14");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.bezierCurveTo(-20, -10, -10, -16, 0, -14);
  ctx.bezierCurveTo(10, -16, 20, -8, 19, 2);
  ctx.bezierCurveTo(20, 12, 12, 18, 2, 16);
  ctx.bezierCurveTo(-8, 19, -16, 12, -18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2e1c08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Eyes / dimples — small dark crescents
  const eyes: Array<[number, number]> = [[-8, -4], [4, -8], [10, 2], [-2, 8], [-12, 4], [6, 10]];
  eyes.forEach(([ex, ey]) => {
    ctx.fillStyle = "rgba(60,38,12,0.7)";
    ctx.beginPath();
    ctx.ellipse(ex, ey, 1.8, 1.2, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,24,8,0.6)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(ex, ey, 2.4, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
  });
  // Highlight
  ctx.fillStyle = "rgba(255,240,200,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, -5, 4, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // A little dirt — brown specks
  ctx.fillStyle = "rgba(70,45,18,0.7)";
  [[-14, 8, 1.4], [14, 8, 1.2], [0, 14, 1.6], [-6, 13, 1.1], [9, -6, 1.0]].forEach(([dx, dy, dr]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawOnion(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bulb — rounded with pointed bottom
  const body = ctx.createRadialGradient(-4, 0, 2, 0, 4, 20);
  body.addColorStop(0, "#fce8b8");
  body.addColorStop(0.5, "#e0a850");
  body.addColorStop(1, "#9c6818");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(-15, -10, -17, 6, -8, 16);
  ctx.bezierCurveTo(-3, 21, 0, 22, 0, 22);
  ctx.bezierCurveTo(0, 22, 3, 21, 8, 16);
  ctx.bezierCurveTo(17, 6, 15, -10, 0, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3608";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Papery vertical layer lines (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(-15, -10, -17, 6, -8, 16);
  ctx.bezierCurveTo(-3, 21, 0, 22, 0, 22);
  ctx.bezierCurveTo(0, 22, 3, 21, 8, 16);
  ctx.bezierCurveTo(17, 6, 15, -10, 0, -12);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(120,76,16,0.5)";
  ctx.lineWidth = 1.1;
  [-9, -4.5, 0, 4.5, 9].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.bezierCurveTo(x * 1.5, 0, x * 0.6, 14, 0, 22);
    ctx.stroke();
  });
  ctx.restore();
  // Highlight
  ctx.fillStyle = "rgba(255,250,220,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, 0, 2.6, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Dry root tuft at the bottom
  ctx.strokeStyle = "rgba(180,150,100,0.8)";
  ctx.lineWidth = 0.8;
  [-2, 0, 2].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(dx * 0.5, 21);
    ctx.lineTo(dx, 25);
    ctx.stroke();
  });
  // Green shoots on top
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 2.6;
  ([[-4, -14, -7, -24], [0, -15, 0, -26], [4, -14, 7, -23]] as number[][]).forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 6, x2, y2);
    ctx.stroke();
  });
  ctx.strokeStyle = "#7cb840";
  ctx.lineWidth = 1.1;
  ([[-4, -14, -7, -24], [0, -15, 0, -26], [4, -14, 7, -23]] as number[][]).forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 6, x2, y2);
    ctx.stroke();
  });
}

function drawGarlic(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bulb body — rounded, white with pointed top going into a stem
  const body = ctx.createRadialGradient(-4, 4, 2, 0, 8, 20);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.55, "#f0e6e0");
  body.addColorStop(1, "#c0b0aa");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-14, -6, -16, 10, -8, 18);
  ctx.bezierCurveTo(-3, 22, 3, 22, 8, 18);
  ctx.bezierCurveTo(16, 10, 14, -6, 0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a7868";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Clove division lines (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-14, -6, -16, 10, -8, 18);
  ctx.bezierCurveTo(-3, 22, 3, 22, 8, 18);
  ctx.bezierCurveTo(16, 10, 14, -6, 0, -8);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(160,140,130,0.7)";
  ctx.lineWidth = 1.2;
  [-8, -2.7, 2.7, 8].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x * 0.3, -6);
    ctx.bezierCurveTo(x * 1.6, 2, x * 1.4, 14, x, 22);
    ctx.stroke();
  });
  // Soft shading between cloves
  ctx.strokeStyle = "rgba(120,100,90,0.35)";
  ctx.lineWidth = 2.4;
  [-5.3, 0, 5.3].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x * 0.3, -6);
    ctx.bezierCurveTo(x * 1.5, 4, x * 1.3, 14, x, 22);
    ctx.stroke();
  });
  ctx.restore();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-6, 4, 2.4, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Dry papery stem twisted at the top
  ctx.strokeStyle = "#bca890";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.quadraticCurveTo(-2, -16, 2, -22);
  ctx.stroke();
  ctx.strokeStyle = "#8a7460";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.quadraticCurveTo(-2, -16, 2, -22);
  ctx.stroke();
}

function drawLettuce(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 21, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Outer ruffled leaves — drawn back to front, larger to smaller
  const layers = [
    { ry: 8, rx: 22, light: "#9ccc54", dark: "#3a6014", n: 9 },
    { ry: 4, rx: 17, light: "#b6e070", dark: "#4a8020", n: 8 },
    { ry: 0, rx: 12, light: "#cdf088", dark: "#6aa030", n: 7 },
  ];
  layers.forEach((layer) => {
    const grad = ctx.createRadialGradient(0, layer.ry - 4, 2, 0, layer.ry, layer.rx);
    grad.addColorStop(0, layer.light);
    grad.addColorStop(1, layer.dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    // Ruffled circle: petal-like scallops around
    for (let i = 0; i <= layer.n; i++) {
      const fa = (i / layer.n) * Math.PI * 2;
      const wobble = (i % 2 === 0 ? 1 : 0.82);
      const x = Math.cos(fa) * layer.rx * wobble;
      const y = layer.ry + Math.sin(fa) * (layer.rx * 0.7) * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const pa = ((i - 1) / layer.n) * Math.PI * 2;
        const mxa = (pa + fa) / 2;
        const mr = layer.rx * 1.12;
        const mx = Math.cos(mxa) * mr;
        const my = layer.ry + Math.sin(mxa) * (layer.rx * 0.78);
        ctx.quadraticCurveTo(mx, my, x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = layer.dark;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });
  // Central crinkle veins
  ctx.strokeStyle = "rgba(58,96,20,0.55)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(Math.cos(a) * 5, 2 + Math.sin(a) * 4, Math.cos(a) * 11, 2 + Math.sin(a) * 8);
    ctx.stroke();
  }
  // Pale crinkled heart highlight
  ctx.fillStyle = "rgba(220,245,170,0.7)";
  ctx.beginPath();
  ctx.ellipse(-2, 1, 4, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawWatermelon(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Whole striped melon (back-left)
  ctx.save();
  ctx.translate(-5, 2);
  const body = ctx.createRadialGradient(-6, -6, 3, 0, 2, 20);
  body.addColorStop(0, "#7cc850");
  body.addColorStop(0.6, "#2e7a28");
  body.addColorStop(1, "#10380c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a2606";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Dark green stripes (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(14,56,12,0.85)";
  ctx.lineWidth = 3.2;
  [-12, -5, 2, 9].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -18);
    ctx.bezierCurveTo(x + 4, -6, x + 4, 6, x, 18);
    ctx.stroke();
  });
  ctx.restore();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, -7, 3, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Cut wedge (front-right)
  ctx.save();
  ctx.translate(9, 6);
  ctx.rotate(0.25);
  // Red flesh triangle/wedge
  const flesh = ctx.createLinearGradient(0, -14, 0, 12);
  flesh.addColorStop(0, "#ff6a6a");
  flesh.addColorStop(0.7, "#e02838");
  flesh.addColorStop(1, "#a01020");
  ctx.fillStyle = flesh;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(11, -12, 13, 6, 0, 14);
  ctx.bezierCurveTo(-13, 6, -11, -12, 0, -14);
  ctx.closePath();
  ctx.fill();
  // White rind layer
  ctx.strokeStyle = "#e8f4c0";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-13, 6, -11, -12, 0, -14);
  ctx.stroke();
  // Green rind outer edge
  ctx.strokeStyle = "#2e7a28";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(11, -12, 13, 6, 0, 14);
  ctx.stroke();
  ctx.strokeStyle = "#0a2606";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Seeds
  ctx.fillStyle = "#2a0a10";
  ([[-3, -4], [3, -2], [-1, 3], [4, 6], [-4, 7], [1, -8]] as Array<[number, number]>).forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 1.1, 1.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  // Flesh highlight
  ctx.fillStyle = "rgba(255,200,200,0.4)";
  ctx.beginPath();
  ctx.ellipse(-3, -3, 2.4, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPeas(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.rotate(-0.25);
  // Pod — long crescent, lower (back) half
  const podBack = ctx.createLinearGradient(0, -2, 0, 14);
  podBack.addColorStop(0, "#8aba40");
  podBack.addColorStop(1, "#3a6014");
  ctx.fillStyle = podBack;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.bezierCurveTo(-14, 14, 14, 14, 22, 2);
  ctx.bezierCurveTo(16, 8, -16, 8, -22, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#23400c";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Peas — row of round green spheres sitting in the open pod
  const peas: Array<[number, number]> = [[-13, 2], [-6.5, 3], [0, 3.2], [6.5, 3], [13, 2]];
  peas.forEach(([px, py]) => {
    const grad = ctx.createRadialGradient(px - 1.5, py - 1.5, 0.5, px, py, 5);
    grad.addColorStop(0, "#cdf088");
    grad.addColorStop(0.6, "#7cb83a");
    grad.addColorStop(1, "#3a6014");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#23400c";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "rgba(240,255,200,0.7)";
    ctx.beginPath();
    ctx.arc(px - 1.4, py - 1.6, 1.3, 0, Math.PI * 2);
    ctx.fill();
  });
  // Pod — upper (front) lip, slightly open over the back
  const podFront = ctx.createLinearGradient(0, -10, 0, 2);
  podFront.addColorStop(0, "#9ccc54");
  podFront.addColorStop(1, "#4a8020");
  ctx.fillStyle = podFront;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.bezierCurveTo(-15, -10, 15, -10, 22, 2);
  ctx.bezierCurveTo(15, -3, -15, -3, -22, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#23400c";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Front lip highlight
  ctx.strokeStyle = "rgba(220,245,170,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-16, -3);
  ctx.bezierCurveTo(-8, -7, 8, -7, 16, -3);
  ctx.stroke();
  // Stem tip
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.lineTo(-27, -2);
  ctx.stroke();
  ctx.restore();
}

export const ICONS = {
  crop_corn:       { label:"Corn",       color:"#f4c428", draw:drawCorn },
  crop_pumpkin:    { label:"Pumpkin",    color:"#e87818", draw:drawPumpkin },
  crop_sunflower:  { label:"Sunflower",  color:"#ffd24a", draw:drawSunflower },
  crop_wheat:      { label:"Wheat",      color:"#d8a838", draw:drawWheat },
  crop_potato:     { label:"Potato",     color:"#a87838", draw:drawPotato },
  crop_onion:      { label:"Onion",      color:"#e0a850", draw:drawOnion },
  crop_garlic:     { label:"Garlic",     color:"#e8ddd6", draw:drawGarlic },
  crop_lettuce:    { label:"Lettuce",    color:"#7cb83a", draw:drawLettuce },
  crop_watermelon: { label:"Watermelon", color:"#2e7a28", draw:drawWatermelon },
  crop_peas:       { label:"Peas",       color:"#7cb83a", draw:drawPeas },
};
