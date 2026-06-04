// Spell effects & magic abilities.

function drawFireball(ctx: CanvasRenderingContext2D) {
  // Outer heat glow
  const glow = ctx.createRadialGradient(2, 2, 2, 2, 2, 24);
  glow.addColorStop(0, "rgba(255,170,60,0.7)");
  glow.addColorStop(0.5, "rgba(255,90,20,0.28)");
  glow.addColorStop(1, "rgba(255,60,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(2, 2, 24, 0, Math.PI * 2);
  ctx.fill();
  // Flaming tail streaming up-left behind the ball
  ctx.save();
  ctx.fillStyle = "rgba(255,120,30,0.55)";
  ctx.beginPath();
  ctx.moveTo(-2, -10);
  ctx.quadraticCurveTo(-18, -16, -22, -8);
  ctx.quadraticCurveTo(-12, -10, -6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,200,90,0.5)";
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.quadraticCurveTo(-22, 2, -24, 10);
  ctx.quadraticCurveTo(-14, 6, -6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Licking flame tongues around the core
  ctx.fillStyle = "#ff7a1e";
  const tongues: Array<[number, number, number]> = [
    [-6, -14, -0.4], [6, -14, 0.3], [13, -4, 0.9], [11, 8, 1.6], [-11, 6, -1.6],
  ];
  tongues.forEach(([tx, ty, lean]) => {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(lean) * 8, ty + Math.sin(lean) * 8 - 6, tx + Math.cos(lean) * 4, ty + Math.sin(lean) * 4 + 6);
    ctx.quadraticCurveTo(tx - 3, ty + 2, tx, ty);
    ctx.closePath();
    ctx.fill();
  });
  // Main fire orb
  const body = ctx.createRadialGradient(-3, -4, 2, 2, 2, 15);
  body.addColorStop(0, "#fff6c8");
  body.addColorStop(0.35, "#ffd24a");
  body.addColorStop(0.7, "#ff6a1a");
  body.addColorStop(1, "#9a1e04");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(2, 2, 13, 0, Math.PI * 2);
  ctx.fill();
  // Bright inner core
  const core = ctx.createRadialGradient(-2, -3, 1, -1, -2, 8);
  core.addColorStop(0, "rgba(255,255,240,0.95)");
  core.addColorStop(0.6, "rgba(255,220,120,0.5)");
  core.addColorStop(1, "rgba(255,180,60,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(-1, -2, 8, 0, Math.PI * 2);
  ctx.fill();
  // Swirling heat curls inside (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(2, 2, 13, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,120,20,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(4, 6, 6, Math.PI * 0.2, Math.PI * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-2, 4, 3, Math.PI * 1.1, Math.PI * 2.2);
  ctx.stroke();
  ctx.restore();
  // Ember sparks flying off
  ctx.fillStyle = "#ffd87a";
  [[15, -10, 1.6], [12, -14, 1], [18, -2, 1.2], [-14, -10, 1.3], [16, 12, 1.1], [-9, 12, 0.9]].forEach(([ex, ey, er]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(255,90,20,0.7)";
  [[17, -13, 0.8], [-16, -7, 0.8], [19, 9, 0.8]].forEach(([ex, ey, er]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawIceShard(ctx: CanvasRenderingContext2D) {
  // Frosty glow
  const glow = ctx.createRadialGradient(0, 2, 2, 0, 2, 24);
  glow.addColorStop(0, "rgba(150,225,255,0.6)");
  glow.addColorStop(0.55, "rgba(90,180,255,0.22)");
  glow.addColorStop(1, "rgba(90,180,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 2, 24, 0, Math.PI * 2);
  ctx.fill();
  // A cluster of three crystalline icicles (back ones first)
  const shard = (cx: number, topY: number, w: number, botY: number, grad: CanvasGradient) => {
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx + w, topY + (botY - topY) * 0.32);
    ctx.lineTo(cx + w * 0.45, botY);
    ctx.lineTo(cx - w * 0.45, botY);
    ctx.lineTo(cx - w, topY + (botY - topY) * 0.32);
    ctx.closePath();
    ctx.fill();
  };
  const makeGrad = (cx: number, topY: number, botY: number) => {
    const g = ctx.createLinearGradient(cx - 6, topY, cx + 6, botY);
    g.addColorStop(0, "#f0fbff");
    g.addColorStop(0.45, "#a8e2ff");
    g.addColorStop(1, "#3a86c8");
    return g;
  };
  // Side shards (smaller, behind)
  shard(-9, -2, 5, 18, makeGrad(-9, -2, 18));
  ctx.strokeStyle = "#2a6aa0";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  shard(10, 0, 5, 20, makeGrad(10, 0, 20));
  ctx.stroke();
  // Central tall shard
  shard(0, -18, 7, 22, makeGrad(0, -18, 22));
  ctx.strokeStyle = "#27608f";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Facet edge highlight down the center shard
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, 20);
  ctx.stroke();
  // Inner facet line
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3.5, 4);
  ctx.lineTo(0, -14);
  ctx.lineTo(3.5, 4);
  ctx.stroke();
  // Frost sparkles
  const drawStar = (sx: number, sy: number, s: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#e8faff";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy);
    ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s);
    ctx.stroke();
    ctx.restore();
  };
  drawStar(-10, -8, 3, 0.95);
  drawStar(11, -6, 2.4, 0.85);
  drawStar(5, 14, 2, 0.7);
  drawStar(-7, 12, 1.8, 0.7);
}

function drawLightning(ctx: CanvasRenderingContext2D) {
  // Electric glow
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  glow.addColorStop(0, "rgba(150,210,255,0.65)");
  glow.addColorStop(0.5, "rgba(80,140,255,0.25)");
  glow.addColorStop(1, "rgba(60,120,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // Main zig-zag bolt path
  const bolt = () => {
    ctx.beginPath();
    ctx.moveTo(4, -22);
    ctx.lineTo(-6, -4);
    ctx.lineTo(2, -2);
    ctx.lineTo(-8, 22);
    ctx.lineTo(8, -4);
    ctx.lineTo(0, -6);
    ctx.lineTo(10, -22);
    ctx.closePath();
  };
  // Soft outer blue glow stroke
  ctx.save();
  ctx.shadowColor = "rgba(90,160,255,0.95)";
  ctx.shadowBlur = 8;
  // Wide blue base
  bolt();
  ctx.fillStyle = "#3a86ff";
  ctx.fill();
  ctx.restore();
  // Bright white-blue core fill
  const core = ctx.createLinearGradient(-8, -22, 8, 22);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.5, "#cfe6ff");
  core.addColorStop(1, "#9ec8ff");
  ctx.fillStyle = core;
  ctx.save();
  ctx.translate(0, 0);
  ctx.scale(0.7, 1);
  bolt();
  ctx.restore();
  // Re-draw a slimmer bright core by stroking the centerline
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(5, -20);
  ctx.lineTo(-3, -4);
  ctx.lineTo(3, -3);
  ctx.lineTo(-4, 18);
  ctx.stroke();
  // Small crackling forks
  ctx.strokeStyle = "rgba(180,220,255,0.85)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -4); ctx.lineTo(-13, -7); ctx.lineTo(-10, -2);
  ctx.moveTo(2, -2); ctx.lineTo(12, 2); ctx.lineTo(8, 5);
  ctx.moveTo(4, -22); ctx.lineTo(-2, -19);
  ctx.stroke();
  // Spark dots at the tips
  ctx.fillStyle = "rgba(220,240,255,0.95)";
  [[4, -22, 1.6], [-8, 22, 1.6], [-13, -7, 1.1], [12, 2, 1.1]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHeal(ctx: CanvasRenderingContext2D) {
  // Healing aura
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  glow.addColorStop(0, "rgba(150,255,170,0.7)");
  glow.addColorStop(0.5, "rgba(70,210,110,0.25)");
  glow.addColorStop(1, "rgba(50,200,90,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // The plus / cross — rounded, glowing green
  const arm = 14;
  const half = 5;
  const plus = () => {
    ctx.beginPath();
    ctx.roundRect(-half, -arm, half * 2, arm * 2, 3);
    ctx.roundRect(-arm, -half, arm * 2, half * 2, 3);
  };
  ctx.save();
  ctx.shadowColor = "rgba(80,240,130,0.9)";
  ctx.shadowBlur = 7;
  // Base body gradient
  const body = ctx.createLinearGradient(-arm, -arm, arm, arm);
  body.addColorStop(0, "#bdffcf");
  body.addColorStop(0.5, "#46d878");
  body.addColorStop(1, "#1f9a4a");
  ctx.fillStyle = body;
  plus();
  ctx.fill();
  ctx.restore();
  // Outline
  ctx.strokeStyle = "#147a38";
  ctx.lineWidth = 1.6;
  plus();
  ctx.stroke();
  // Bright inner highlight cross
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.roundRect(-2, -arm + 2, 4, arm * 2 - 4, 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.roundRect(-arm + 2, -2, arm * 2 - 4, 4, 2);
  ctx.fill();
  // Rising sparkle motes
  const drawStar = (sx: number, sy: number, s: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#eafff0";
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * s, sy + Math.sin(a) * s);
      ctx.lineTo(sx + Math.cos(a + Math.PI / 4) * s * 0.3, sy + Math.sin(a + Math.PI / 4) * s * 0.3);
    }
    ctx.fill();
    ctx.restore();
  };
  drawStar(-16, -14, 3, 0.95);
  drawStar(17, -8, 2.6, 0.9);
  drawStar(14, -18, 2.2, 0.8);
  drawStar(-18, 4, 2, 0.7);
  drawStar(18, 10, 1.8, 0.65);
}

function drawShieldBubble(ctx: CanvasRenderingContext2D) {
  const R = 18;
  // Outer rim glow
  const glow = ctx.createRadialGradient(0, 0, R - 4, 0, 0, R + 7);
  glow.addColorStop(0, "rgba(120,200,255,0)");
  glow.addColorStop(0.7, "rgba(120,200,255,0.35)");
  glow.addColorStop(1, "rgba(80,160,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, R + 7, 0, Math.PI * 2);
  ctx.fill();
  // Translucent dome fill
  const dome = ctx.createRadialGradient(-5, -6, 2, 0, 0, R);
  dome.addColorStop(0, "rgba(220,245,255,0.45)");
  dome.addColorStop(0.6, "rgba(120,190,255,0.22)");
  dome.addColorStop(1, "rgba(70,150,255,0.32)");
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  // Hex pattern (clipped to bubble)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(150,210,255,0.5)";
  ctx.lineWidth = 1;
  const hexR = 5;
  const hexW = hexR * Math.sqrt(3);
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const hx = col * hexW + (row % 2 ? hexW / 2 : 0);
      const hy = row * hexR * 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
        const px = hx + Math.cos(a) * hexR;
        const py = hy + Math.sin(a) * hexR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
  // Rim ring (bright)
  ctx.save();
  ctx.shadowColor = "rgba(130,200,255,0.9)";
  ctx.shadowBlur = 6;
  ctx.strokeStyle = "#bfe6ff";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Specular highlight arc + glint
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, R - 4, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-7, -9, 2.4, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Tiny impact sparks on the rim
  ctx.fillStyle = "rgba(200,235,255,0.9)";
  [[13, -12], [-15, -8], [16, 8]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPoison(ctx: CanvasRenderingContext2D) {
  // Toxic glow
  const glow = ctx.createRadialGradient(0, 4, 2, 0, 4, 24);
  glow.addColorStop(0, "rgba(150,255,90,0.6)");
  glow.addColorStop(0.5, "rgba(110,210,40,0.25)");
  glow.addColorStop(1, "rgba(90,180,30,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 4, 24, 0, Math.PI * 2);
  ctx.fill();
  // Main venom droplet (teardrop, point up)
  const drop = () => {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(-3, -8, -13, -2, -13, 8);
    ctx.bezierCurveTo(-13, 17, -6, 22, 0, 22);
    ctx.bezierCurveTo(6, 22, 13, 17, 13, 8);
    ctx.bezierCurveTo(13, -2, 3, -8, 0, -18);
    ctx.closePath();
  };
  const body = ctx.createRadialGradient(-4, 2, 2, 0, 8, 18);
  body.addColorStop(0, "#d4ff7a");
  body.addColorStop(0.45, "#7ad828");
  body.addColorStop(1, "#2e6a0c");
  ctx.fillStyle = body;
  drop();
  ctx.fill();
  ctx.strokeStyle = "#1c4a08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Bubbles inside (clipped)
  ctx.save();
  drop();
  ctx.clip();
  ctx.fillStyle = "rgba(210,255,140,0.7)";
  [[-4, 10, 2.4], [4, 14, 1.8], [-2, 4, 1.4], [5, 6, 1.2], [-6, 16, 1.1]].forEach(([bx, by, br]) => {
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  });
  // bubble rims
  ctx.strokeStyle = "rgba(40,90,10,0.4)";
  ctx.lineWidth = 0.7;
  [[-4, 10, 2.4], [4, 14, 1.8]].forEach(([bx, by, br]) => {
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
  // Specular streak
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-5, 0, 2.2, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Dripping droplet below
  ctx.fillStyle = "#7ad828";
  ctx.beginPath();
  ctx.moveTo(-1, 22);
  ctx.bezierCurveTo(-4, 26, -4, 30, -1, 31);
  ctx.bezierCurveTo(2, 30, 2, 26, -1, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1c4a08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Tiny floating toxic motes
  ctx.fillStyle = "rgba(170,240,90,0.85)";
  [[14, -8, 1.4], [-15, -4, 1.2], [16, 6, 1.1], [-12, 12, 0.9]].forEach(([mx, my, mr]) => {
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawWind(ctx: CanvasRenderingContext2D) {
  // Soft airy glow
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  glow.addColorStop(0, "rgba(210,245,255,0.45)");
  glow.addColorStop(0.6, "rgba(160,215,235,0.18)");
  glow.addColorStop(1, "rgba(150,210,230,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // Swirling gust — three curved motion lines spiraling
  ctx.lineCap = "round";
  // Big sweeping curl ending in a spiral
  ctx.strokeStyle = "rgba(220,248,255,0.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-22, -10);
  ctx.bezierCurveTo(-4, -16, 14, -14, 14, -6);
  ctx.bezierCurveTo(14, 0, 4, 0, 6, -6);
  ctx.stroke();
  // Middle curl
  ctx.strokeStyle = "rgba(190,235,250,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.bezierCurveTo(0, -4, 18, 0, 18, 8);
  ctx.bezierCurveTo(18, 15, 7, 15, 9, 7);
  ctx.stroke();
  // Lower short gust line
  ctx.strokeStyle = "rgba(170,225,245,0.8)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-18, 14);
  ctx.bezierCurveTo(-4, 10, 8, 12, 6, 18);
  ctx.stroke();
  // Faint inner depth lines under the bright strokes
  ctx.strokeStyle = "rgba(120,180,210,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-20, -8);
  ctx.bezierCurveTo(-4, -13, 12, -11, 12, -6);
  ctx.stroke();
  // A couple of leaves caught in the breeze
  const leaf = (lx: number, ly: number, rot: number) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(-4, 0, 4, 0);
    g.addColorStop(0, "#9ed64a");
    g.addColorStop(1, "#4f8a1e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.bezierCurveTo(4, -2, 4, 2, 0, 4);
    ctx.bezierCurveTo(-4, 2, -4, -2, 0, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e5410";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 4);
    ctx.stroke();
    ctx.restore();
  };
  leaf(16, -10, 0.6);
  leaf(20, 9, -0.5);
  leaf(-12, 18, 0.3);
}

function drawArcaneMissile(ctx: CanvasRenderingContext2D) {
  // Arcane aura
  const glow = ctx.createRadialGradient(4, -2, 2, 4, -2, 24);
  glow.addColorStop(0, "rgba(200,140,255,0.7)");
  glow.addColorStop(0.5, "rgba(150,80,240,0.28)");
  glow.addColorStop(1, "rgba(130,70,230,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(4, -2, 24, 0, Math.PI * 2);
  ctx.fill();
  // Trailing energy tail streaming down-left
  ctx.save();
  const tail = ctx.createLinearGradient(4, -2, -22, 18);
  tail.addColorStop(0, "rgba(190,120,255,0.75)");
  tail.addColorStop(1, "rgba(150,80,240,0)");
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(-2, -6);
  ctx.quadraticCurveTo(-16, 4, -22, 18);
  ctx.quadraticCurveTo(-10, 10, 2, 4);
  ctx.closePath();
  ctx.fill();
  // Inner brighter tail streak
  ctx.strokeStyle = "rgba(235,200,255,0.7)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(-12, 6, -20, 16);
  ctx.stroke();
  ctx.restore();
  // Main arcane orb
  const body = ctx.createRadialGradient(0, -6, 2, 4, -2, 13);
  body.addColorStop(0, "#fbeaff");
  body.addColorStop(0.35, "#cf8aff");
  body.addColorStop(0.7, "#8a3ce0");
  body.addColorStop(1, "#42107a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(4, -2, 11, 0, Math.PI * 2);
  ctx.fill();
  // Bright pulsing core
  const core = ctx.createRadialGradient(1, -5, 1, 2, -4, 7);
  core.addColorStop(0, "rgba(255,255,255,0.95)");
  core.addColorStop(0.5, "rgba(230,180,255,0.5)");
  core.addColorStop(1, "rgba(200,140,255,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(2, -4, 7, 0, Math.PI * 2);
  ctx.fill();
  // Orbiting energy ring
  ctx.strokeStyle = "rgba(220,170,255,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(4, -2, 12, 4.5, -0.5, 0, Math.PI * 2);
  ctx.stroke();
  // Sparks around / trailing
  const drawStar = (sx: number, sy: number, s: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#f3e6ff";
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * s, sy + Math.sin(a) * s);
      ctx.lineTo(sx + Math.cos(a + Math.PI / 4) * s * 0.3, sy + Math.sin(a + Math.PI / 4) * s * 0.3);
    }
    ctx.fill();
    ctx.restore();
  };
  drawStar(16, -10, 3, 0.95);
  drawStar(14, 6, 2.4, 0.85);
  drawStar(-8, 6, 2.2, 0.8);
  drawStar(-15, 14, 1.8, 0.7);
  drawStar(8, -14, 1.8, 0.7);
}

export const ICONS = {
  spell_fireball:        { label:"Fireball",        color:"#ff6a1a", draw:drawFireball },
  spell_ice_shard:       { label:"Ice Shard",       color:"#7ad0ff", draw:drawIceShard },
  spell_lightning:       { label:"Lightning",       color:"#3a86ff", draw:drawLightning },
  spell_heal:            { label:"Heal",            color:"#46d878", draw:drawHeal },
  spell_shield_bubble:   { label:"Shield Bubble",   color:"#7ec8ff", draw:drawShieldBubble },
  spell_poison:          { label:"Poison",          color:"#7ad828", draw:drawPoison },
  spell_wind:            { label:"Wind Gust",       color:"#bfe6f5", draw:drawWind },
  spell_arcane_missile:  { label:"Arcane Missile",  color:"#8a3ce0", draw:drawArcaneMissile },
};
