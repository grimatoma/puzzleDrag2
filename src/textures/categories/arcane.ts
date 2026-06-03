// Potions, alchemy & arcane.

function drawPotionRed(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Outer glow
  const glow = ctx.createRadialGradient(0, 8, 2, 0, 8, 26);
  glow.addColorStop(0, "rgba(255,70,90,0.5)");
  glow.addColorStop(0.6, "rgba(255,40,60,0.18)");
  glow.addColorStop(1, "rgba(255,40,60,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 8, 26, 0, Math.PI * 2);
  ctx.fill();
  // Glass flask outline path (round bottom, narrow neck)
  const flask = () => {
    ctx.beginPath();
    ctx.moveTo(-3, -14);
    ctx.lineTo(-3.5, -4);
    ctx.bezierCurveTo(-14, 0, -14, 18, 0, 20);
    ctx.bezierCurveTo(14, 18, 14, 0, 3.5, -4);
    ctx.lineTo(3, -14);
    ctx.closePath();
  };
  // Glass body (translucent)
  flask();
  ctx.fillStyle = "rgba(210,235,245,0.22)";
  ctx.fill();
  // Liquid (clipped to lower portion)
  ctx.save();
  flask();
  ctx.clip();
  const liquid = ctx.createRadialGradient(-3, 4, 2, 0, 10, 18);
  liquid.addColorStop(0, "#ff8a8a");
  liquid.addColorStop(0.5, "#e02838");
  liquid.addColorStop(1, "#700818");
  ctx.fillStyle = liquid;
  ctx.beginPath();
  ctx.rect(-15, 0, 30, 24);
  ctx.fill();
  // Liquid surface highlight
  ctx.strokeStyle = "rgba(255,200,200,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-11, 0.5);
  ctx.quadraticCurveTo(0, 2.5, 11, 0.5);
  ctx.stroke();
  // Tiny bubbles
  ctx.fillStyle = "rgba(255,220,220,0.7)";
  [[-4, 12, 1.4], [3, 8, 1], [-1, 5, 0.9], [5, 14, 1.1], [-6, 9, 0.8]].forEach(([bx, by, br]) => {
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Glass outline
  flask();
  ctx.strokeStyle = "#2a3a44";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Curved specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.bezierCurveTo(-11, 8, -10, 14, -6, 17);
  ctx.stroke();
  // Cork
  const cork = ctx.createLinearGradient(-4, -20, 4, -20);
  cork.addColorStop(0, "#c89858");
  cork.addColorStop(0.5, "#a67838");
  cork.addColorStop(1, "#6a4a1c");
  ctx.fillStyle = cork;
  ctx.beginPath();
  ctx.moveTo(-4, -14);
  ctx.lineTo(-4.5, -21);
  ctx.lineTo(4.5, -21);
  ctx.lineTo(4, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a280c";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Neck band under cork
  ctx.strokeStyle = "#2a3a44";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3.4, -13);
  ctx.lineTo(3.4, -13);
  ctx.stroke();
}

function drawPotionBlue(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 15, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Outer glow
  const glow = ctx.createRadialGradient(0, 12, 2, 0, 12, 26);
  glow.addColorStop(0, "rgba(80,170,255,0.5)");
  glow.addColorStop(0.6, "rgba(40,120,255,0.18)");
  glow.addColorStop(1, "rgba(40,120,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 12, 26, 0, Math.PI * 2);
  ctx.fill();
  // Erlenmeyer (conical) flask path
  const flask = () => {
    ctx.beginPath();
    ctx.moveTo(-3.5, -16);
    ctx.lineTo(-3.5, -6);
    ctx.lineTo(-15, 18);
    ctx.bezierCurveTo(-15, 21, -13, 22, -10, 22);
    ctx.lineTo(10, 22);
    ctx.bezierCurveTo(13, 22, 15, 21, 15, 18);
    ctx.lineTo(3.5, -6);
    ctx.lineTo(3.5, -16);
    ctx.closePath();
  };
  // Glass body (translucent)
  flask();
  ctx.fillStyle = "rgba(210,235,245,0.22)";
  ctx.fill();
  // Liquid (clipped to lower cone)
  ctx.save();
  flask();
  ctx.clip();
  const liquid = ctx.createRadialGradient(-4, 10, 2, 0, 16, 20);
  liquid.addColorStop(0, "#8ad6ff");
  liquid.addColorStop(0.5, "#2884e0");
  liquid.addColorStop(1, "#0a2c80");
  ctx.fillStyle = liquid;
  ctx.beginPath();
  ctx.rect(-16, 6, 32, 20);
  ctx.fill();
  // Liquid surface highlight
  ctx.strokeStyle = "rgba(200,235,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-9, 6.8);
  ctx.quadraticCurveTo(0, 8.6, 9, 6.8);
  ctx.stroke();
  // Bubbles rising
  ctx.fillStyle = "rgba(220,240,255,0.75)";
  [[-3, 16, 1.5], [4, 13, 1.1], [-6, 18, 1], [1, 11, 0.9], [6, 18, 1.2], [-1, 8, 0.8]].forEach(([bx, by, br]) => {
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Glass outline
  flask();
  ctx.strokeStyle = "#243846";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Curved specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 6);
  ctx.bezierCurveTo(-12, 12, -13, 17, -11, 20);
  ctx.stroke();
  // Neck rim
  ctx.strokeStyle = "#243846";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-4.5, -16);
  ctx.lineTo(4.5, -16);
  ctx.stroke();
}

function drawCrystalBall(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 16, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ornate stand base
  const base = ctx.createLinearGradient(0, 14, 0, 24);
  base.addColorStop(0, "#caa24a");
  base.addColorStop(1, "#6a4a18");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-12, 22);
  ctx.lineTo(12, 22);
  ctx.lineTo(8, 16);
  ctx.lineTo(-8, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2608";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Stand claws cradling ball
  ctx.strokeStyle = "#8a6a22";
  ctx.lineWidth = 2.6;
  [-7, 0, 7].forEach((cx) => {
    ctx.beginPath();
    ctx.moveTo(cx * 0.5, 16);
    ctx.quadraticCurveTo(cx, 12, cx, 6);
    ctx.stroke();
  });
  // Glow behind ball
  const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, 22);
  glow.addColorStop(0, "rgba(150,110,255,0.55)");
  glow.addColorStop(0.6, "rgba(110,80,230,0.2)");
  glow.addColorStop(1, "rgba(110,80,230,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, 22, 0, Math.PI * 2);
  ctx.fill();
  // Glass sphere
  const sphere = ctx.createRadialGradient(-5, -8, 2, 0, -2, 16);
  sphere.addColorStop(0, "#3a2c66");
  sphere.addColorStop(0.7, "#241a4a");
  sphere.addColorStop(1, "#0e0826");
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, Math.PI * 2);
  ctx.fill();
  // Swirling galaxy inside (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(180,140,255,0.7)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 2.4; t += 0.2) {
      const r = 1.5 + t * 2;
      const a = t + i * 2.1;
      const px = Math.cos(a) * r;
      const py = -2 + Math.sin(a) * r * 0.7;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // Star sparks inside
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  [[-6, -7, 1.2], [5, -5, 1], [2, 2, 1.4], [-4, 3, 0.9], [7, -9, 0.8]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Sphere outline
  ctx.strokeStyle = "#1a0e3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, Math.PI * 2);
  ctx.stroke();
  // Curved white specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, -2, 10, Math.PI * 1.1, Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, -9, 2.4, 3.4, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpellTome(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 17, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.rotate(-0.05);
  // Pages (right edge stack)
  ctx.fillStyle = "#f0e2c0";
  ctx.beginPath();
  ctx.moveTo(13, -16);
  ctx.lineTo(15, -14);
  ctx.lineTo(15, 16);
  ctx.lineTo(13, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b89868";
  ctx.lineWidth = 0.8;
  [-10, -4, 2, 8, 13].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(13.5, y);
    ctx.lineTo(15, y + 1.5);
    ctx.stroke();
  });
  // Leather cover
  const cover = ctx.createLinearGradient(-14, 0, 14, 0);
  cover.addColorStop(0, "#7a3018");
  cover.addColorStop(0.5, "#a8401e");
  cover.addColorStop(1, "#5a2010");
  ctx.fillStyle = cover;
  ctx.beginPath();
  ctx.moveTo(-14, -18);
  ctx.lineTo(13, -16);
  ctx.lineTo(13, 18);
  ctx.lineTo(-14, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1408";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Spine
  const spine = ctx.createLinearGradient(-14, 0, -9, 0);
  spine.addColorStop(0, "#5a2010");
  spine.addColorStop(1, "#7a3018");
  ctx.fillStyle = spine;
  ctx.beginPath();
  ctx.moveTo(-14, -18);
  ctx.lineTo(-9, -17.6);
  ctx.lineTo(-9, 16.4);
  ctx.lineTo(-14, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1408";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Tooled border on cover
  ctx.strokeStyle = "rgba(255,210,140,0.45)";
  ctx.lineWidth = 1;
  ctx.strokeRect(-6, -13, 16, 26);
  // Gold corner fittings
  ctx.fillStyle = "#e6c24a";
  ctx.strokeStyle = "#7a5a10";
  ctx.lineWidth = 0.8;
  [[-8, -16], [11, -14.5], [-8, 14], [11, 15.5]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + (cy < 0 ? 5 : -5));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  // Central gem clasp
  ctx.fillStyle = "#caa24a";
  ctx.beginPath();
  ctx.roundRect(-2, -3, 6, 14, 1);
  ctx.fill();
  ctx.strokeStyle = "#7a5a10";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Gem
  const gemGlow = ctx.createRadialGradient(1, 2, 0.5, 1, 2, 6);
  gemGlow.addColorStop(0, "#9affff");
  gemGlow.addColorStop(0.6, "#28a0d8");
  gemGlow.addColorStop(1, "#0a4070");
  ctx.fillStyle = gemGlow;
  ctx.beginPath();
  ctx.moveTo(1, -2);
  ctx.lineTo(5, 2);
  ctx.lineTo(1, 6);
  ctx.lineTo(-3, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#063050";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Gem sparkle
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(-0.5, 0.5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRunestone(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 15, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stone tablet (rough rectangle)
  const stone = ctx.createLinearGradient(0, -20, 0, 22);
  stone.addColorStop(0, "#8a8e96");
  stone.addColorStop(0.5, "#5e636c");
  stone.addColorStop(1, "#3a3e46");
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-11, -19);
  ctx.lineTo(10, -20);
  ctx.lineTo(12, 6);
  ctx.lineTo(9, 21);
  ctx.lineTo(-9, 22);
  ctx.lineTo(-12, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#23262c";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Top bevel highlight
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, -17);
  ctx.lineTo(9, -18);
  ctx.stroke();
  // Surface cracks
  ctx.strokeStyle = "rgba(30,32,38,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.lineTo(-3, -6);
  ctx.lineTo(-7, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -8);
  ctx.lineTo(4, 4);
  ctx.stroke();
  // Glowing rune marks
  ctx.save();
  ctx.shadowColor = "rgba(80,180,255,0.9)";
  ctx.shadowBlur = 6;
  ctx.strokeStyle = "#7ad0ff";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  // Rune 1 (arrow-like)
  ctx.beginPath();
  ctx.moveTo(-5, -12);
  ctx.lineTo(-5, 0);
  ctx.moveTo(-5, -8);
  ctx.lineTo(-1, -11);
  ctx.moveTo(-5, -4);
  ctx.lineTo(-1, -1);
  ctx.stroke();
  // Rune 2 (angular)
  ctx.beginPath();
  ctx.moveTo(4, -10);
  ctx.lineTo(4, 4);
  ctx.moveTo(4, -10);
  ctx.lineTo(8, -6);
  ctx.lineTo(4, -2);
  ctx.stroke();
  // Rune 3 (cross mark below)
  ctx.beginPath();
  ctx.moveTo(-3, 8);
  ctx.lineTo(2, 14);
  ctx.moveTo(2, 8);
  ctx.lineTo(-3, 14);
  ctx.stroke();
  ctx.restore();
}

function drawMagicDust(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(-2, 23, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spilled dust glow on the right
  const glow = ctx.createRadialGradient(10, 4, 2, 10, 4, 22);
  glow.addColorStop(0, "rgba(255,220,120,0.55)");
  glow.addColorStop(0.6, "rgba(255,200,80,0.18)");
  glow.addColorStop(1, "rgba(255,200,80,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(10, 4, 22, 0, Math.PI * 2);
  ctx.fill();
  // Pouch body (cloth sack), tilted, mouth opening up-right
  const pouch = ctx.createRadialGradient(-6, 6, 2, -3, 10, 18);
  pouch.addColorStop(0, "#9a7a4a");
  pouch.addColorStop(0.6, "#6a4e26");
  pouch.addColorStop(1, "#3e2c12");
  ctx.fillStyle = pouch;
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.bezierCurveTo(-16, 2, -14, 20, -3, 21);
  ctx.bezierCurveTo(8, 22, 12, 10, 6, 0);
  ctx.bezierCurveTo(2, -5, -4, -7, -9, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#241808";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cloth folds
  ctx.strokeStyle = "rgba(40,28,12,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.quadraticCurveTo(-9, 12, -3, 19);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.quadraticCurveTo(5, 12, 2, 19);
  ctx.stroke();
  // Cloth highlight
  ctx.fillStyle = "rgba(255,235,180,0.25)";
  ctx.beginPath();
  ctx.ellipse(-7, 6, 2, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Drawstring tie + gathered mouth
  ctx.strokeStyle = "#caa24a";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-9, -5);
  ctx.quadraticCurveTo(-1, -8, 6, -1);
  ctx.stroke();
  ctx.fillStyle = "#caa24a";
  ctx.beginPath();
  ctx.arc(-2, -6, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5a10";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Spilling dust stream
  ctx.save();
  ctx.fillStyle = "rgba(255,225,130,0.8)";
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const dx = 3 + t * 14 + Math.sin(i * 2.1) * 2;
    const dy = -3 + t * t * 12 - 6 + Math.cos(i * 1.7) * 2;
    const r = 0.6 + (1 - t) * 1.1;
    ctx.globalAlpha = 0.5 + (1 - t) * 0.5;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // Sparkle stars
  const drawStar = (sx: number, sy: number, s: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff6d0";
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const ax = Math.cos(a);
      const ay = Math.sin(a);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + ax * s, sy + ay * s);
      ctx.lineTo(sx + Math.cos(a + Math.PI / 4) * s * 0.3, sy + Math.sin(a + Math.PI / 4) * s * 0.3);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx, sy, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawStar(14, -4, 4, 1);
  drawStar(8, -12, 3, 0.9);
  drawStar(18, 4, 2.6, 0.85);
  drawStar(20, -8, 2, 0.7);
}

function drawCandle(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Warm flame glow
  const glow = ctx.createRadialGradient(0, -16, 1, 0, -14, 20);
  glow.addColorStop(0, "rgba(255,210,120,0.7)");
  glow.addColorStop(0.5, "rgba(255,160,60,0.25)");
  glow.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -14, 20, 0, Math.PI * 2);
  ctx.fill();
  // Brass holder base
  const base = ctx.createLinearGradient(0, 12, 0, 22);
  base.addColorStop(0, "#e6c24a");
  base.addColorStop(0.5, "#b8902a");
  base.addColorStop(1, "#6a4e12");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-11, 22);
  ctx.bezierCurveTo(-13, 16, -7, 14, -6, 13);
  ctx.lineTo(6, 13);
  ctx.bezierCurveTo(7, 14, 13, 16, 11, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2808";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Holder cup
  ctx.fillStyle = "#caa238";
  ctx.beginPath();
  ctx.moveTo(-6, 13);
  ctx.lineTo(-5, 7);
  ctx.lineTo(5, 7);
  ctx.lineTo(6, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Brass highlight
  ctx.fillStyle = "rgba(255,245,200,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, 18, 1.4, 3.5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Candle wax body
  const wax = ctx.createLinearGradient(-5, 0, 5, 0);
  wax.addColorStop(0, "#fff6e2");
  wax.addColorStop(0.5, "#f4e2c0");
  wax.addColorStop(1, "#cdb488");
  ctx.fillStyle = wax;
  ctx.beginPath();
  ctx.moveTo(-5, 7);
  ctx.lineTo(-5, -10);
  ctx.bezierCurveTo(-5, -12, 5, -12, 5, -10);
  ctx.lineTo(5, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a8258";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Wax top rim + drip
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, -10, 5, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(-4, 5);
  ctx.stroke();
  // Wick
  ctx.strokeStyle = "#2a2018";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, -14);
  ctx.stroke();
  // Flame (outer)
  const flame = ctx.createRadialGradient(0, -16, 1, 0, -15, 7);
  flame.addColorStop(0, "#fff7d0");
  flame.addColorStop(0.4, "#ffcf60");
  flame.addColorStop(0.8, "#ff8a28");
  flame.addColorStop(1, "rgba(255,100,20,0.2)");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(0, -23);
  ctx.bezierCurveTo(-5, -18, -4, -11, 0, -10);
  ctx.bezierCurveTo(4, -11, 5, -18, 0, -23);
  ctx.closePath();
  ctx.fill();
  // Flame inner blue/bright core
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(0, -14, 1.6, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPentacle(ctx: CanvasRenderingContext2D) {
  // Outer ambient glow
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
  glow.addColorStop(0, "rgba(150,110,255,0.45)");
  glow.addColorStop(0.6, "rgba(120,90,240,0.18)");
  glow.addColorStop(1, "rgba(120,90,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = "rgba(160,130,255,0.9)";
  ctx.shadowBlur = 6;
  ctx.strokeStyle = "#b9a0ff";
  ctx.lineWidth = 2;
  // Outer ring
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.stroke();
  // Inner ring
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 14.5, 0, Math.PI * 2);
  ctx.stroke();
  // Five-point star (pentagram) inscribed
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    pts.push([Math.cos(a) * 13, Math.sin(a) * 13]);
  }
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  // connect every second point for the star
  const order = [0, 2, 4, 1, 3];
  order.forEach((idx, k) => {
    const [px, py] = pts[idx];
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  // Faint inner fill of star
  ctx.save();
  const order2 = [0, 2, 4, 1, 3];
  ctx.beginPath();
  order2.forEach((idx, k) => {
    const a = -Math.PI / 2 + (idx / 5) * Math.PI * 2;
    const px = Math.cos(a) * 13;
    const py = Math.sin(a) * 13;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(150,120,255,0.12)";
  ctx.fill();
  ctx.restore();
  // Rune ticks between rings
  ctx.strokeStyle = "rgba(200,180,255,0.7)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 14.5, Math.sin(a) * 14.5);
    ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
    ctx.stroke();
  }
  // Magical sparks at the star points
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    const px = Math.cos(a) * 13;
    const py = Math.sin(a) * 13;
    ctx.beginPath();
    ctx.arc(px, py, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Drifting sparks
  ctx.fillStyle = "rgba(200,180,255,0.8)";
  [[-9, -14, 1.1], [11, -9, 0.9], [13, 8, 1], [-13, 6, 0.8], [2, -19, 1.2]].forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const ICONS = {
  arcane_potion_red:   { label:"Red Potion",    color:"#e02838", draw:drawPotionRed },
  arcane_potion_blue:  { label:"Blue Potion",   color:"#2884e0", draw:drawPotionBlue },
  arcane_crystal_ball: { label:"Crystal Ball",  color:"#6a4ad8", draw:drawCrystalBall },
  arcane_spell_tome:   { label:"Spell Tome",    color:"#a8401e", draw:drawSpellTome },
  arcane_runestone:    { label:"Runestone",     color:"#5e636c", draw:drawRunestone },
  arcane_magic_dust:   { label:"Magic Dust",    color:"#e6c24a", draw:drawMagicDust },
  arcane_candle:       { label:"Candle",        color:"#ffcf60", draw:drawCandle },
  arcane_pentacle:     { label:"Pentacle",      color:"#b9a0ff", draw:drawPentacle },
};
