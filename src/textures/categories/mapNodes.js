// Cartography map nodes — small landmark icons for the world map.
// Drawn at canvas origin (0,0); fits a ~64px box. Style matches the rest
// of the iconRegistry: soft drop shadow + layered fill/stroke + cool
// outlines.

function drawShadow(ctx, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHome(ctx) {
  // Hearthwood Vale — a warm-roofed cottage
  drawShadow(ctx, 20, 4);
  // Walls
  ctx.fillStyle = "#e8c890";
  ctx.beginPath();
  ctx.rect(-16, -4, 32, 22);
  ctx.fill();
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Wood beams (timber framing)
  ctx.strokeStyle = "#7a4a18";
  ctx.lineWidth = 1.6;
  [
    [-16, -4, 16, -4], [-16, 18, 16, 18], [-16, 8, 16, 8],
    [-6, -4, -6, 18], [6, -4, 6, 18],
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Roof
  ctx.fillStyle = "#a8431a";
  ctx.beginPath();
  ctx.moveTo(-20, -4);
  ctx.lineTo(0, -22);
  ctx.lineTo(20, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a1a08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Roof shingle lines
  ctx.strokeStyle = "rgba(58,16,8,0.6)";
  ctx.lineWidth = 0.8;
  for (let r = -18; r < 0; r += 4) {
    ctx.beginPath();
    ctx.moveTo(r, -4); ctx.lineTo(r + 14, -18);
    ctx.stroke();
  }
  // Door
  ctx.fillStyle = "#5a3014";
  ctx.beginPath();
  ctx.moveTo(-4, 18);
  ctx.lineTo(-4, 4);
  ctx.bezierCurveTo(-4, 0, 4, 0, 4, 4);
  ctx.lineTo(4, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  ctx.arc(2, 10, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Window
  ctx.fillStyle = "#f8e090";
  ctx.fillRect(-13, 0, 6, 6);
  ctx.fillRect(8, 0, 6, 6);
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-13, 0, 6, 6);
  ctx.strokeRect(8, 0, 6, 6);
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.lineTo(-10, 6);
  ctx.moveTo(-13, 3); ctx.lineTo(-7, 3);
  ctx.moveTo(11, 0); ctx.lineTo(11, 6);
  ctx.moveTo(8, 3); ctx.lineTo(14, 3);
  ctx.stroke();
  // Chimney with smoke
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(8, -16, 5, 8);
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, -16, 5, 8);
  ctx.fillStyle = "rgba(180,170,160,0.7)";
  ctx.beginPath();
  ctx.arc(11, -22, 3, 0, Math.PI * 2);
  ctx.arc(13, -27, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMeadow(ctx) {
  // Greenmeadow — rolling field with wheat
  drawShadow(ctx, 26, 4);
  // Background hills
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(-26, 22);
  ctx.bezierCurveTo(-22, -4, -8, -8, 0, -2);
  ctx.bezierCurveTo(8, -8, 22, -4, 26, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a4810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Light strips
  ctx.fillStyle = "rgba(180,220,140,0.6)";
  ctx.beginPath();
  ctx.ellipse(-10, -2, 8, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Fence posts
  ctx.strokeStyle = "#5a3014";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = -16; i <= 16; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 2);
    ctx.lineTo(i, 14);
    ctx.stroke();
  }
  // Fence rails
  ctx.strokeStyle = "#7a4a18";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-20, 6); ctx.lineTo(20, 6);
  ctx.moveTo(-20, 12); ctx.lineTo(20, 12);
  ctx.stroke();
  // Wheat in foreground
  ctx.strokeStyle = "#c89320";
  ctx.lineWidth = 1.6;
  for (let x = -22; x <= 22; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.bezierCurveTo(x, 12, x + (x % 8 === 0 ? 1 : -1), 4, x + 1, -2);
    ctx.stroke();
  }
  // Wheat heads
  ctx.fillStyle = "#f4c84a";
  for (let x = -22; x <= 22; x += 4) {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x + 1, -2 + i * 2, 0.9, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Sun
  ctx.fillStyle = "#ffd34c";
  ctx.beginPath();
  ctx.arc(14, -16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawOrchard(ctx) {
  // Wild Orchard — apple tree
  drawShadow(ctx, 22, 4);
  // Trunk
  ctx.fillStyle = "#5a3a14";
  ctx.beginPath();
  ctx.rect(-3, 2, 6, 18);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Trunk texture
  ctx.strokeStyle = "rgba(40,20,8,0.6)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-2, 4); ctx.lineTo(-2, 18);
  ctx.moveTo(1, 6); ctx.lineTo(1, 18);
  ctx.stroke();
  // Foliage clouds
  ctx.fillStyle = "#3a6018";
  [[-10, -2, 10], [10, -2, 10], [-4, -12, 10], [4, -12, 10], [0, -6, 12]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = "#1a2a04";
  ctx.lineWidth = 1;
  [[-10, -2, 10], [10, -2, 10], [-4, -12, 10], [4, -12, 10]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Lighter foliage highlights
  ctx.fillStyle = "rgba(120,180,80,0.6)";
  [[-10, -6, 4], [4, -16, 4], [10, -6, 4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Apples
  ctx.fillStyle = "#d4543a";
  [[-8, -2], [6, -8], [-2, -14], [8, 0], [-12, -8]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a1808";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // Highlight
    ctx.fillStyle = "rgba(255,200,160,0.7)";
    ctx.beginPath();
    ctx.arc(x - 0.6, y - 0.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4543a";
  });
  // Stem on top apple
  ctx.strokeStyle = "#5a3014";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, -16); ctx.lineTo(-1, -14);
  ctx.stroke();
  // Fallen apple in grass
  ctx.fillStyle = "#d4543a";
  ctx.beginPath();
  ctx.arc(-12, 18, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrossroads(ctx) {
  // The Crossroads — signpost at intersection
  drawShadow(ctx, 24, 4);
  // Ground (dirt path)
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.ellipse(0, 18, 24, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3014";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Intersecting paths (lighter strips)
  ctx.fillStyle = "#c8a868";
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 18, 3, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Signpost
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1.5, -22, 3, 36);
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  ctx.strokeRect(-1.5, -22, 3, 36);
  // Signs
  ctx.fillStyle = "#c89548";
  // Right-pointing sign
  ctx.beginPath();
  ctx.moveTo(2, -18);
  ctx.lineTo(18, -18);
  ctx.lineTo(22, -14);
  ctx.lineTo(18, -10);
  ctx.lineTo(2, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Left-pointing sign
  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.lineTo(-18, -8);
  ctx.lineTo(-22, -4);
  ctx.lineTo(-18, 0);
  ctx.lineTo(-2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Etching lines on signs
  ctx.strokeStyle = "rgba(58,28,8,0.6)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(4, -16); ctx.lineTo(16, -16);
  ctx.moveTo(4, -13); ctx.lineTo(14, -13);
  ctx.moveTo(-16, -6); ctx.lineTo(-4, -6);
  ctx.moveTo(-14, -3); ctx.lineTo(-4, -3);
  ctx.stroke();
  // Lantern hanging
  ctx.fillStyle = "#3a3040";
  ctx.beginPath();
  ctx.rect(-8, -22, 5, 5);
  ctx.fill();
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  ctx.arc(-5.5, -19.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a8500a";
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function drawQuarry(ctx) {
  // Cracked Quarry — pickaxe over stone block
  drawShadow(ctx, 22, 4);
  // Stone block
  ctx.fillStyle = "#9da3a8";
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.lineTo(-14, -10);
  ctx.lineTo(14, -10);
  ctx.lineTo(18, 4);
  ctx.lineTo(14, 18);
  ctx.lineTo(-14, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4348";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Stone facets
  ctx.strokeStyle = "rgba(58,67,72,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-14, -10); ctx.lineTo(-18, 4);
  ctx.moveTo(14, -10); ctx.lineTo(18, 4);
  ctx.moveTo(-18, 4); ctx.lineTo(18, 4);
  ctx.stroke();
  // Crack
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2, 4); ctx.lineTo(0, 8); ctx.lineTo(-2, 12); ctx.lineTo(2, 18);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(8, -8);
  ctx.lineTo(8, -4);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fill();
  // Pickaxe (over the stone)
  ctx.save();
  ctx.translate(2, -16);
  ctx.rotate(0.7);
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1.6, -2, 3.2, 28);
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  ctx.strokeRect(-1.6, -2, 3.2, 28);
  ctx.fillStyle = "#5a6066";
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(12, -4);
  ctx.lineTo(0, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.lineTo(10, -3);
  ctx.lineTo(8, -2);
  ctx.lineTo(-8, -1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Stone chips
  ctx.fillStyle = "#9da3a8";
  [[-18, 16], [16, 18], [-12, 22]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x + 2, y - 1);
    ctx.lineTo(x + 1, y + 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a4348";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });
}

function drawCaves(ctx) {
  // Lanternlit Caves — cave entrance with hanging lantern
  drawShadow(ctx, 22, 4);
  // Cave background (dark)
  ctx.fillStyle = "#1a1408";
  ctx.beginPath();
  ctx.moveTo(-22, 22);
  ctx.bezierCurveTo(-22, -8, -10, -22, 0, -22);
  ctx.bezierCurveTo(10, -22, 22, -8, 22, 22);
  ctx.closePath();
  ctx.fill();
  // Rock shoulders
  ctx.fillStyle = "#5a4a3a";
  ctx.beginPath();
  ctx.moveTo(-22, 22);
  ctx.bezierCurveTo(-22, -2, -16, -16, -10, -16);
  ctx.bezierCurveTo(-12, -8, -16, 4, -22, 22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(22, 22);
  ctx.bezierCurveTo(22, -2, 16, -16, 10, -16);
  ctx.bezierCurveTo(12, -8, 16, 4, 22, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Stalactite
  ctx.fillStyle = "#7a6a50";
  [[-6, -22, -4, -14], [4, -22, 6, -14], [-2, -22, -2, -10]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1 - 1.5, y1);
    ctx.lineTo(x1 + 1.5, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2a18";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  // Lantern hanging in mouth
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(0, -8);
  ctx.stroke();
  ctx.fillStyle = "#3a3040";
  ctx.beginPath();
  ctx.rect(-4, -8, 8, 6);
  ctx.fill();
  ctx.strokeStyle = "#1a1010";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Lantern glass
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.ellipse(0, -2, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Glow halo
  ctx.fillStyle = "rgba(255,200,80,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lantern bottom cap
  ctx.fillStyle = "#3a3040";
  ctx.beginPath();
  ctx.rect(-4, 4, 8, 3);
  ctx.fill();
  ctx.strokeStyle = "#1a1010";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Dim glints on cave walls
  ctx.fillStyle = "rgba(255,200,80,0.7)";
  [[-14, -4, 1.4], [14, -4, 1.4], [-12, 8, 1], [12, 8, 1]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFairground(ctx) {
  // Drifter's Fairground — striped tent
  drawShadow(ctx, 24, 4);
  // Center pole
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1, -22, 2, 4);
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? 4 : 1.6;
    const x = Math.cos(a) * r;
    const y = -22 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Tent body — striped
  const colors = ["#c8181a", "#fffae0", "#c8181a", "#fffae0", "#c8181a", "#fffae0", "#c8181a"];
  ctx.strokeStyle = "#5a0808";
  ctx.lineWidth = 1.6;
  // Tent panels (radiating from top)
  const tentTop = { x: 0, y: -18 };
  const baseY = 18;
  const baseW = 22;
  for (let i = 0; i < colors.length; i++) {
    const t1 = i / colors.length;
    const t2 = (i + 1) / colors.length;
    const x1 = -baseW + t1 * baseW * 2;
    const x2 = -baseW + t2 * baseW * 2;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(tentTop.x, tentTop.y);
    ctx.lineTo(x1, baseY);
    ctx.lineTo(x2, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Outer tent edge curve
  ctx.fillStyle = "#7a1010";
  ctx.beginPath();
  ctx.moveTo(-baseW, baseY);
  for (let x = -baseW; x <= baseW; x += 4) {
    ctx.bezierCurveTo(x + 1, baseY + 3, x + 3, baseY + 3, x + 4, baseY);
  }
  ctx.lineTo(baseW, baseY + 4);
  ctx.lineTo(-baseW, baseY + 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Tent flap (entrance)
  ctx.fillStyle = "#3a0808";
  ctx.beginPath();
  ctx.moveTo(-6, 18);
  ctx.lineTo(-6, 8);
  ctx.bezierCurveTo(-6, 2, 6, 2, 6, 8);
  ctx.lineTo(6, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0408";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Pennant flag
  ctx.fillStyle = "#80c8f8";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(8, -20);
  ctx.lineTo(0, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a82c4";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Stars sprinkled around
  ctx.fillStyle = "#ffd040";
  [[-22, -10], [22, -10], [-18, -16], [18, -16]].forEach(([x, y]) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 1.6 : 0.6;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });
}

function drawForgeMap(ctx) {
  // Black Forge — anvil with sparks
  drawShadow(ctx, 22, 4);
  // Anvil base
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.moveTo(-12, 18);
  ctx.lineTo(-6, 6);
  ctx.lineTo(6, 6);
  ctx.lineTo(12, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Anvil top
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.lineTo(-14, 2);
  ctx.lineTo(14, 2);
  ctx.lineTo(18, -2);
  ctx.lineTo(16, -8);
  ctx.lineTo(-16, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Anvil horn (left point)
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.lineTo(-26, 2);
  ctx.lineTo(-18, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(-15, -7, 30, 1.5);
  // Hot iron piece
  ctx.fillStyle = "#ffae40";
  ctx.beginPath();
  ctx.ellipse(2, -8, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd870";
  ctx.beginPath();
  ctx.ellipse(2, -9, 4, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sparks
  ctx.fillStyle = "#ffd040";
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    const r = 12 + (i % 2) * 3;
    const x = 2 + Math.cos(a) * r;
    const y = -10 + Math.sin(a) * r;
    ctx.beginPath();
    for (let j = 0; j < 8; j++) {
      const sa = (j / 8) * Math.PI * 2;
      const sr = j % 2 === 0 ? 1.4 : 0.5;
      const sx = x + Math.cos(sa) * sr;
      const sy = y + Math.sin(sa) * sr;
      if (j === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Glow
  ctx.fillStyle = "rgba(255,160,40,0.35)";
  ctx.beginPath();
  ctx.arc(2, -8, 14, 0, Math.PI * 2);
  ctx.fill();
  // Hammer (background)
  ctx.save();
  ctx.translate(-14, -16);
  ctx.rotate(-0.4);
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1.4, 0, 2.8, 16);
  ctx.fillStyle = "#5a6066";
  ctx.beginPath();
  ctx.rect(-5, -3, 10, 5);
  ctx.fill();
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 1;
  ctx.strokeRect(-5, -3, 10, 5);
  ctx.restore();
}

function drawPit(ctx) {
  // The Pit — boss arena: crossed swords over a dark hole
  drawShadow(ctx, 22, 4);
  // Outer ring (rim)
  ctx.fillStyle = "#5a4a3a";
  ctx.beginPath();
  ctx.ellipse(0, 8, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Pit interior (dark)
  ctx.fillStyle = "#0a0408";
  ctx.beginPath();
  ctx.ellipse(0, 10, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner glow
  const glow = ctx.createRadialGradient(0, 8, 2, 0, 8, 18);
  glow.addColorStop(0, "rgba(255,40,20,0.6)");
  glow.addColorStop(1, "rgba(255,40,20,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 10, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Crossed swords
  ctx.save();
  // Sword 1
  ctx.save();
  ctx.translate(-2, -8);
  ctx.rotate(-0.4);
  // Blade
  ctx.fillStyle = "#c8c8d0";
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.lineTo(2, 4);
  ctx.lineTo(2, -16);
  ctx.lineTo(0, -22);
  ctx.lineTo(-2, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3a40";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Center line
  ctx.strokeStyle = "rgba(58,58,64,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.lineTo(0, -20);
  ctx.stroke();
  // Cross-guard
  ctx.fillStyle = "#a87838";
  ctx.fillRect(-7, 4, 14, 2.6);
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-7, 4, 14, 2.6);
  // Hilt
  ctx.fillStyle = "#5a3014";
  ctx.fillRect(-1.4, 6.6, 2.8, 8);
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.arc(0, 16, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Sword 2 (mirrored)
  ctx.save();
  ctx.translate(2, -8);
  ctx.rotate(0.4);
  ctx.fillStyle = "#c8c8d0";
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.lineTo(2, 4);
  ctx.lineTo(2, -16);
  ctx.lineTo(0, -22);
  ctx.lineTo(-2, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3a40";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#a87838";
  ctx.fillRect(-7, 4, 14, 2.6);
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-7, 4, 14, 2.6);
  ctx.fillStyle = "#5a3014";
  ctx.fillRect(-1.4, 6.6, 2.8, 8);
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.arc(0, 16, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export const ICONS = {
  map_home:        { label:"Hearthwood Vale",     color:"#a8431a", draw:drawHome },
  map_meadow:      { label:"Greenmeadow",         color:"#5a8a26", draw:drawMeadow },
  map_orchard:     { label:"Wild Orchard",        color:"#3a6018", draw:drawOrchard },
  map_crossroads:  { label:"The Crossroads",      color:"#a87838", draw:drawCrossroads },
  map_quarry:      { label:"Cracked Quarry",      color:"#7a8490", draw:drawQuarry },
  map_caves:       { label:"Lanternlit Caves",    color:"#5a4a3a", draw:drawCaves },
  map_fairground:  { label:"Drifter's Fairground", color:"#c8181a", draw:drawFairground },
  map_forge:       { label:"Black Forge",         color:"#3a3a40", draw:drawForgeMap },
  map_pit:         { label:"The Pit",             color:"#5a4a3a", draw:drawPit },
};
