// Reef — sea creatures & harbor icons for the Fish/Harbor biome.
// Hand-drawn Canvas-2D, centered at origin in a ~-24..+24 box.
// Cute, rounded creatures plus nautical landmarks (anchor, lighthouse,
// message bottle). All procedural — no external assets.

function shadow(ctx: CanvasRenderingContext2D, w: number, y = 22) {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, y, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrab(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Legs — three per side, dark base
  ctx.strokeStyle = "#7a1c08";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  const legs: Array<[number, number, number, number, number, number]> = [
    [-9, 6, -18, 8, -20, 14],
    [-10, 9, -18, 14, -19, 19],
    [-8, 11, -14, 17, -13, 21],
    [9, 6, 18, 8, 20, 14],
    [10, 9, 18, 14, 19, 19],
    [8, 11, 14, 17, 13, 21],
  ];
  legs.forEach(([x1, y1, x2, y2, x3, y3]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x2, y2, x3, y3);
    ctx.stroke();
  });
  // Claws — rounded pincers reaching forward
  const clawFill = (cx: number) => {
    const g = ctx.createRadialGradient(cx - 2, -2, 1, cx, 0, 9);
    g.addColorStop(0, "#ff9a5a");
    g.addColorStop(0.6, "#e0541c");
    g.addColorStop(1, "#9a2c08");
    return g;
  };
  [[-1], [1]].forEach(([s]) => {
    ctx.save();
    ctx.translate(s * 16, -2);
    ctx.scale(s, 1);
    // upper arm
    ctx.strokeStyle = "#9a2c08";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.quadraticCurveTo(-2, 2, 2, -4);
    ctx.stroke();
    // pincer body
    ctx.fillStyle = clawFill(0);
    ctx.strokeStyle = "#5a1404";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(2, -4, 8, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // pincer fingers
    ctx.beginPath();
    ctx.moveTo(7, -8);
    ctx.quadraticCurveTo(13, -10, 12, -4);
    ctx.quadraticCurveTo(9, -5, 6, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.quadraticCurveTo(12, 0, 11, 3);
    ctx.quadraticCurveTo(7, 1, 4, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  // Body — wide rounded carapace
  const body = ctx.createRadialGradient(-4, -2, 2, 0, 2, 18);
  body.addColorStop(0, "#ff8c52");
  body.addColorStop(0.55, "#e0541c");
  body.addColorStop(1, "#9a2c08");
  ctx.fillStyle = body;
  ctx.strokeStyle = "#5a1404";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.bezierCurveTo(-16, -8, -8, -12, 0, -12);
  ctx.bezierCurveTo(8, -12, 16, -8, 16, 2);
  ctx.bezierCurveTo(12, 9, -12, 9, -16, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Carapace highlight band
  ctx.strokeStyle = "rgba(255,220,180,0.6)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.quadraticCurveTo(0, -10, 11, -4);
  ctx.stroke();
  // Little texture bumps
  ctx.fillStyle = "rgba(90,20,4,0.4)";
  [[-7, 2], [0, 4], [7, 2]].forEach(([bx, by]) => {
    ctx.beginPath();
    ctx.arc(bx, by, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
  // Eye stalks
  ctx.strokeStyle = "#9a2c08";
  ctx.lineWidth = 2;
  [-5, 5].forEach((ex) => {
    ctx.beginPath();
    ctx.moveTo(ex, -10);
    ctx.lineTo(ex, -16);
    ctx.stroke();
  });
  [-5, 5].forEach((ex) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, -17, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a1404";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#0a1018";
    ctx.beginPath();
    ctx.arc(ex, -17, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(ex - 0.6, -17.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.lineCap = "butt";
}

function drawOctopus(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Tentacles — curling beziers behind the head
  const tentacles: Array<[number, number, number, number, number, number]> = [
    [-12, 4, -22, 14, -16, 22],
    [-7, 8, -12, 18, -6, 23],
    [-2, 9, -2, 18, -4, 24],
    [3, 9, 4, 18, 2, 24],
    [8, 8, 13, 18, 8, 23],
    [13, 4, 22, 14, 17, 22],
  ];
  tentacles.forEach(([x1, y1, cx, cy, x2, y2]) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, "#b066d6");
    g.addColorStop(1, "#7a2aa6");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#4a1066";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x1 - 2, y1);
    ctx.quadraticCurveTo(cx - 2, cy, x2, y2);
    ctx.quadraticCurveTo(x2 + 2, y2 + 1, x2 + 2, y2 - 1);
    ctx.quadraticCurveTo(cx + 3, cy, x1 + 2, y1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // suckers
    ctx.fillStyle = "rgba(255,210,240,0.7)";
    for (let t = 0.45; t <= 0.85; t += 0.2) {
      const sx = x1 + (x2 - x1) * t;
      const sy = y1 + (y2 - y1) * t;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // Head — domed mantle
  const head = ctx.createRadialGradient(-4, -8, 2, 0, -2, 18);
  head.addColorStop(0, "#d49aee");
  head.addColorStop(0.55, "#a050d0");
  head.addColorStop(1, "#5a1888");
  ctx.fillStyle = head;
  ctx.strokeStyle = "#4a1066";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.bezierCurveTo(-16, -16, 16, -16, 14, 6);
  ctx.bezierCurveTo(8, 12, -8, 12, -14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Mantle highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 3, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  [-6, 6].forEach((ex) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a1066";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#0a1018";
    ctx.beginPath();
    ctx.arc(ex + (ex < 0 ? 0.6 : -0.6), -1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(ex - 0.6, -2.8, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
  // Little smile
  ctx.strokeStyle = "rgba(74,16,102,0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 3, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function drawStarfish(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Five-armed star
  const arms = 5;
  const outer = 20;
  const inner = 8;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < arms * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / arms;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 22);
  g.addColorStop(0, "#ffb060");
  g.addColorStop(0.6, "#f07820");
  g.addColorStop(1, "#b04808");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#7a2c04";
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else {
      const [px, py] = pts[i - 1];
      ctx.quadraticCurveTo((px + x) / 2 + x * 0.05, (py + y) / 2 + y * 0.05, x, y);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Arm ridge lines
  ctx.strokeStyle = "rgba(122,44,4,0.4)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < arms; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / arms;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (outer - 4), Math.sin(a) * (outer - 4));
    ctx.stroke();
  }
  // Bumpy texture dots
  ctx.fillStyle = "rgba(255,230,180,0.85)";
  for (let i = 0; i < arms; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / arms;
    for (let t = 0.3; t <= 0.85; t += 0.2) {
      const bx = Math.cos(a) * outer * t;
      const by = Math.sin(a) * outer * t;
      ctx.beginPath();
      ctx.arc(bx, by, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Center dots cluster
  ctx.fillStyle = "rgba(176,72,8,0.55)";
  [[0, 0], [-2, -2], [2, -1], [0, 3]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawSeahorse(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  // Body — S-curve with curled tail, filled path
  const g = ctx.createLinearGradient(-8, -18, 8, 18);
  g.addColorStop(0, "#ffe070");
  g.addColorStop(0.5, "#f0b028");
  g.addColorStop(1, "#b07808");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#7a4e08";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  // start at snout tip
  ctx.moveTo(-12, -16);
  // top of head over to back
  ctx.quadraticCurveTo(-2, -22, 4, -14);
  // back curve down
  ctx.bezierCurveTo(10, -4, 6, 6, 2, 12);
  // into the curled tail (outer)
  ctx.bezierCurveTo(0, 18, 8, 20, 8, 14);
  ctx.bezierCurveTo(8, 10, 3, 10, 4, 14);
  // tail inner back up
  ctx.bezierCurveTo(1, 8, 0, 0, -4, -6);
  // belly / chin up to under snout
  ctx.bezierCurveTo(-6, -10, -8, -12, -8, -14);
  ctx.lineTo(-12, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Snout
  ctx.strokeStyle = "#7a4e08";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -15);
  ctx.lineTo(-15, -15);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Dorsal fin — wavy along the back
  ctx.fillStyle = "rgba(255,240,170,0.8)";
  ctx.strokeStyle = "#b07808";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(5, -12);
  ctx.quadraticCurveTo(12, -8, 10, -2);
  ctx.quadraticCurveTo(13, -5, 9, 2);
  ctx.quadraticCurveTo(11, -2, 6, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Body ridge segments
  ctx.strokeStyle = "rgba(122,78,8,0.5)";
  ctx.lineWidth = 1;
  for (let t = 0; t < 4; t++) {
    const yy = -8 + t * 4;
    ctx.beginPath();
    ctx.moveTo(-5 + t * 0.5, yy);
    ctx.lineTo(2 - t * 0.5, yy + 1);
    ctx.stroke();
  }
  // Head crest bumps
  ctx.fillStyle = "#f0b028";
  ctx.strokeStyle = "#7a4e08";
  ctx.lineWidth = 0.9;
  [[-4, -20], [0, -19]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-6, -14, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a1018";
  ctx.beginPath();
  ctx.arc(-6, -14, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(-6.5, -14.5, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawJellyfish(ctx: CanvasRenderingContext2D) {
  // Soft glow behind the bell
  const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, 24);
  glow.addColorStop(0, "rgba(120,200,255,0.55)");
  glow.addColorStop(0.5, "rgba(90,160,240,0.22)");
  glow.addColorStop(1, "rgba(90,160,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, 24, 0, Math.PI * 2);
  ctx.fill();
  // Trailing tentacles — wavy strands
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  const strands = [-9, -5, -1, 3, 7];
  strands.forEach((sx, i) => {
    ctx.strokeStyle = i % 2 === 0 ? "rgba(150,210,255,0.85)" : "rgba(190,160,240,0.8)";
    ctx.beginPath();
    ctx.moveTo(sx, 4);
    const dir = i % 2 === 0 ? 1 : -1;
    ctx.bezierCurveTo(
      sx + 4 * dir, 10,
      sx - 4 * dir, 16,
      sx + 2 * dir, 22,
    );
    ctx.stroke();
  });
  // Short frilly oral arms
  ctx.strokeStyle = "rgba(220,200,255,0.9)";
  ctx.lineWidth = 2.2;
  [-4, 0, 4].forEach((sx) => {
    ctx.beginPath();
    ctx.moveTo(sx, 4);
    ctx.quadraticCurveTo(sx + 2, 9, sx, 14);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  // Bell — translucent dome
  const bell = ctx.createRadialGradient(-3, -8, 2, 0, -4, 16);
  bell.addColorStop(0, "rgba(220,245,255,0.95)");
  bell.addColorStop(0.55, "rgba(120,185,245,0.8)");
  bell.addColorStop(1, "rgba(70,120,210,0.7)");
  ctx.fillStyle = bell;
  ctx.strokeStyle = "rgba(60,100,180,0.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, 4);
  ctx.bezierCurveTo(-15, -16, 15, -16, 14, 4);
  // scalloped lower rim
  ctx.bezierCurveTo(11, 8, 9, 1, 6, 6);
  ctx.bezierCurveTo(3, 1, 0, 8, -3, 4);
  ctx.bezierCurveTo(-6, 8, -9, 1, -11, 6);
  ctx.bezierCurveTo(-13, 7, -13, 6, -14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Inner bell tint markings
  ctx.fillStyle = "rgba(150,120,220,0.4)";
  [[-5, -4], [3, -5], [-1, -1]].forEach(([mx, my]) => {
    ctx.beginPath();
    ctx.ellipse(mx, my, 2.4, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Bell specular highlight
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-6, -8, 2.4, 4.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(3, -9, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawAnchor(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Rope coil behind
  ctx.strokeStyle = "#caa066";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(-12, -14, 5, 0, Math.PI * 1.8);
  ctx.stroke();
  ctx.strokeStyle = "#a87c44";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-12, -14, 5, 0, Math.PI * 1.8);
  ctx.stroke();
  // rope down to the ring
  ctx.strokeStyle = "#caa066";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-8, -16);
  ctx.quadraticCurveTo(-2, -18, 0, -16);
  ctx.stroke();
  // Iron gradient
  const iron = ctx.createLinearGradient(-2, -16, 2, 18);
  iron.addColorStop(0, "#8a98a6");
  iron.addColorStop(0.5, "#5a6a78");
  iron.addColorStop(1, "#2e3a46");
  ctx.strokeStyle = iron;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Ring
  ctx.beginPath();
  ctx.arc(0, -15, 4, 0, Math.PI * 2);
  ctx.stroke();
  // Shank (vertical bar)
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(0, 16);
  ctx.stroke();
  // Stock (crossbar)
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.lineTo(9, -6);
  ctx.stroke();
  // Arms / flukes — the curved bottom
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-13, 6);
  ctx.quadraticCurveTo(-13, 16, 0, 16);
  ctx.quadraticCurveTo(13, 16, 13, 6);
  ctx.stroke();
  // Fluke points
  ctx.fillStyle = "#5a6a78";
  ctx.strokeStyle = "#2e3a46";
  ctx.lineWidth = 1.4;
  [-13, 13].forEach((fx) => {
    const s = fx > 0 ? 1 : -1;
    ctx.save();
    ctx.translate(fx, 6);
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(-5 * s, -3);
    ctx.lineTo(-1 * s, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  // Metal highlight on shank
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-1.4, -8);
  ctx.lineTo(-1.4, 12);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

function drawLighthouse(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Rock base
  ctx.fillStyle = "#6a6258";
  ctx.strokeStyle = "#3a342c";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-18, 22);
  ctx.lineTo(-12, 14);
  ctx.lineTo(-4, 17);
  ctx.lineTo(6, 13);
  ctx.lineTo(13, 17);
  ctx.lineTo(18, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(-12, 14);
  ctx.lineTo(-4, 17);
  ctx.lineTo(-8, 18);
  ctx.closePath();
  ctx.fill();
  // Tower — tapered trunk
  const tower = ctx.createLinearGradient(-8, 0, 8, 0);
  tower.addColorStop(0, "#d8d0c8");
  tower.addColorStop(0.5, "#fbf6ee");
  tower.addColorStop(1, "#c4bcb2");
  ctx.fillStyle = tower;
  ctx.strokeStyle = "#5a4438";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(-5, -10);
  ctx.lineTo(5, -10);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Red stripes (clipped to tower)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(-5, -10);
  ctx.lineTo(5, -10);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#d8362c";
  [[-10, 5], [0, 5], [10, 5]].forEach(([sy, h]) => {
    ctx.fillRect(-10, sy, 20, h);
  });
  ctx.restore();
  // Gallery deck
  ctx.fillStyle = "#3a342c";
  ctx.fillRect(-7, -12, 14, 3);
  // Lantern room (glowing)
  const lg = ctx.createRadialGradient(0, -17, 1, 0, -17, 8);
  lg.addColorStop(0, "#fff6c0");
  lg.addColorStop(0.6, "#ffd24a");
  lg.addColorStop(1, "#e8901a");
  ctx.fillStyle = lg;
  ctx.strokeStyle = "#5a4438";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(-5, -20, 10, 8);
  ctx.fill();
  ctx.stroke();
  // Lantern panes
  ctx.strokeStyle = "rgba(90,68,56,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, -12);
  ctx.moveTo(-5, -16);
  ctx.lineTo(5, -16);
  ctx.stroke();
  // Glow beams
  ctx.fillStyle = "rgba(255,235,150,0.35)";
  ctx.beginPath();
  ctx.moveTo(5, -19);
  ctx.lineTo(20, -23);
  ctx.lineTo(20, -13);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-5, -19);
  ctx.lineTo(-20, -23);
  ctx.lineTo(-20, -13);
  ctx.closePath();
  ctx.fill();
  // Roof cap
  ctx.fillStyle = "#d8362c";
  ctx.strokeStyle = "#5a4438";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.lineTo(0, -27);
  ctx.lineTo(6, -20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Finial
  ctx.fillStyle = "#3a342c";
  ctx.beginPath();
  ctx.arc(0, -28, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawMessageBottle(ctx: CanvasRenderingContext2D) {
  // Tiny wave under the bottle
  ctx.fillStyle = "rgba(90,160,220,0.45)";
  ctx.beginPath();
  ctx.moveTo(-22, 18);
  ctx.quadraticCurveTo(-16, 13, -10, 18);
  ctx.quadraticCurveTo(-4, 23, 2, 18);
  ctx.quadraticCurveTo(8, 13, 14, 18);
  ctx.quadraticCurveTo(20, 23, 22, 18);
  ctx.lineTo(22, 24);
  ctx.lineTo(-22, 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-22, 18);
  ctx.quadraticCurveTo(-16, 13, -10, 18);
  ctx.quadraticCurveTo(-4, 23, 2, 18);
  ctx.quadraticCurveTo(8, 13, 14, 18);
  ctx.quadraticCurveTo(20, 23, 22, 18);
  ctx.stroke();
  ctx.save();
  ctx.rotate(-0.28);
  // Glass bottle body
  const glass = ctx.createLinearGradient(-12, 0, 12, 0);
  glass.addColorStop(0, "rgba(150,200,190,0.85)");
  glass.addColorStop(0.5, "rgba(200,235,225,0.7)");
  glass.addColorStop(1, "rgba(120,175,165,0.85)");
  ctx.fillStyle = glass;
  ctx.strokeStyle = "#4a7068";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.bezierCurveTo(-15, 0, -14, 14, -8, 18);
  ctx.bezierCurveTo(0, 21, 6, 20, 11, 16);
  ctx.bezierCurveTo(15, 8, 13, -2, 10, -6);
  // neck
  ctx.lineTo(8, -12);
  ctx.lineTo(-9, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Rolled paper scroll inside
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.bezierCurveTo(-15, 0, -14, 14, -8, 18);
  ctx.bezierCurveTo(0, 21, 6, 20, 11, 16);
  ctx.bezierCurveTo(15, 8, 13, -2, 10, -6);
  ctx.lineTo(8, -12);
  ctx.lineTo(-9, -12);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#f4e6c4";
  ctx.strokeStyle = "#b89858";
  ctx.lineWidth = 1.2;
  ctx.save();
  ctx.rotate(0.35);
  ctx.beginPath();
  ctx.rect(-7, -2, 16, 8);
  ctx.fill();
  ctx.stroke();
  // scroll curl ends
  ctx.fillStyle = "#e8d4a4";
  ctx.beginPath();
  ctx.ellipse(-7, 2, 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(9, 2, 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // ink lines on paper
  ctx.strokeStyle = "rgba(120,90,40,0.6)";
  ctx.lineWidth = 0.7;
  [-0.5, 1.5, 3.5].forEach((ly) => {
    ctx.beginPath();
    ctx.moveTo(-4, ly);
    ctx.lineTo(6, ly);
    ctx.stroke();
  });
  ctx.restore();
  ctx.restore();
  // Glass highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-7, 4, 1.6, 7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Cork
  ctx.fillStyle = "#c48a4a";
  ctx.strokeStyle = "#7a4e22";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(-7, -18, 14, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(-6, -17, 3, 5);
  ctx.restore();
}

export const ICONS = {
  reef_crab:           { label: "Crab",           color: "#e0541c", draw: drawCrab },
  reef_octopus:        { label: "Octopus",        color: "#a050d0", draw: drawOctopus },
  reef_starfish:       { label: "Starfish",       color: "#f07820", draw: drawStarfish },
  reef_seahorse:       { label: "Seahorse",       color: "#f0b028", draw: drawSeahorse },
  reef_jellyfish:      { label: "Jellyfish",      color: "#7ab8f0", draw: drawJellyfish },
  reef_anchor:         { label: "Anchor",         color: "#5a6a78", draw: drawAnchor },
  reef_lighthouse:     { label: "Lighthouse",     color: "#d8362c", draw: drawLighthouse },
  reef_message_bottle: { label: "Message Bottle", color: "#a8d0c4", draw: drawMessageBottle },
};
