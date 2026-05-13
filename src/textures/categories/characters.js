// Character portraits — drawn at canvas origin (0,0), suitable for ~64px
// avatar canvases. Each draw function paints a head + shoulders style
// portrait for an NPC, worker, or boss. The pieces share a common base
// (skin oval, neck, body bib) and stack hair / hats / props on top.

// ── Shared building blocks ────────────────────────────────────────────────

function drawAvatarFrame(ctx, opts = {}) {
  const { bg = "#f4ecd8", border = "#c5a87a", radius = 30 } = opts;
  // Round backdrop
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawShoulders(ctx, color, accent) {
  // Body / cloak silhouette behind the head
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-26, 28);
  ctx.bezierCurveTo(-22, 12, -10, 8, 0, 8);
  ctx.bezierCurveTo(10, 8, 22, 12, 26, 28);
  ctx.lineTo(26, 32);
  ctx.lineTo(-26, 32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = accent || "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function drawHead(ctx, opts = {}) {
  const { skin = "#f6d5b8", outline = "#5a3a18", chinY = 6, brow = "#5a3a18" } = opts;
  // Neck
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.rect(-5, 4, 10, 8);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Face oval
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, -8, 13, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Cheeks
  ctx.fillStyle = "rgba(220,120,90,0.4)";
  ctx.beginPath(); ctx.ellipse(-7, -2, 2.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, -2, 2.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  // Chin shadow
  ctx.fillStyle = "rgba(160,90,50,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, chinY, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Brows + eyes (default — caller may overdraw)
  ctx.fillStyle = brow;
  ctx.fillRect(-7, -10, 5, 1.4);
  ctx.fillRect(2, -10, 5, 1.4);
  ctx.beginPath(); ctx.arc(-4.5, -6, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4.5, -6, 1.2, 0, Math.PI * 2); ctx.fill();
  // Mouth
  ctx.strokeStyle = "#7a3010";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-2.5, 0);
  ctx.quadraticCurveTo(0, 2, 2.5, 0);
  ctx.stroke();
  // Nose hint
  ctx.strokeStyle = "rgba(120,70,40,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0.5, -2);
  ctx.stroke();
}

// ── NPC portraits ────────────────────────────────────────────────────────

function drawMira(ctx) {
  // Mira — Baker, warm orange apron, bun + flour smudge
  drawAvatarFrame(ctx, { bg: "#fff1d9", border: "#d6612a" });
  drawShoulders(ctx, "#d6612a", "#7a2e10");
  // Apron straps
  ctx.fillStyle = "#fffae0";
  ctx.beginPath();
  ctx.moveTo(-12, 14); ctx.lineTo(-10, 32); ctx.lineTo(-6, 32); ctx.lineTo(-7, 14);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, 14); ctx.lineTo(10, 32); ctx.lineTo(6, 32); ctx.lineTo(7, 14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#a8500a"; ctx.lineWidth = 1; ctx.stroke();
  drawHead(ctx, { skin: "#f8d2a6", outline: "#5a3010" });
  // Hair bun on top
  ctx.fillStyle = "#7a3a0e";
  ctx.beginPath();
  ctx.arc(0, -22, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1804";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Hair frame around face
  ctx.fillStyle = "#a4500e";
  ctx.beginPath();
  ctx.moveTo(-13, -16);
  ctx.bezierCurveTo(-18, -8, -14, 4, -10, 6);
  ctx.lineTo(-12, -2);
  ctx.bezierCurveTo(-12, -10, -8, -18, 0, -20);
  ctx.bezierCurveTo(8, -18, 12, -10, 12, -2);
  ctx.lineTo(10, 6);
  ctx.bezierCurveTo(14, 4, 18, -8, 13, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1804";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Flour smudge on cheek
  ctx.fillStyle = "rgba(255,250,220,0.85)";
  ctx.beginPath(); ctx.arc(-5, 1, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-7, -1, 1, 0, Math.PI * 2); ctx.fill();
  // Smile (overdraw)
  ctx.strokeStyle = "#7a3010"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.quadraticCurveTo(0, 3, 3, 0);
  ctx.stroke();
  // Earrings
  ctx.fillStyle = "#d4a020";
  ctx.beginPath(); ctx.arc(-12, -4, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, -4, 1.2, 0, Math.PI * 2); ctx.fill();
}

function drawTomas(ctx) {
  // Old Tomas — Beekeeper, wide-brim straw hat with veil
  drawAvatarFrame(ctx, { bg: "#fff5d0", border: "#c8923a" });
  drawShoulders(ctx, "#a87838", "#5a3014");
  drawHead(ctx, { skin: "#e8c098", outline: "#5a3010" });
  // White beard
  ctx.fillStyle = "#fffaea";
  ctx.beginPath();
  ctx.moveTo(-9, -2);
  ctx.bezierCurveTo(-12, 8, -8, 14, 0, 14);
  ctx.bezierCurveTo(8, 14, 12, 8, 9, -2);
  ctx.bezierCurveTo(6, 4, -6, 4, -9, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a89878";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Mustache
  ctx.fillStyle = "#e8e0d0";
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.quadraticCurveTo(0, -2, 6, 0); ctx.quadraticCurveTo(2, 2, -2, 2); ctx.quadraticCurveTo(-4, 2, -6, 0);
  ctx.closePath(); ctx.fill();
  // Straw hat brim
  ctx.fillStyle = "#e8c068";
  ctx.beginPath();
  ctx.ellipse(0, -18, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4a08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Crown
  ctx.fillStyle = "#d4a040";
  ctx.beginPath();
  ctx.moveTo(-8, -22);
  ctx.bezierCurveTo(-9, -28, 9, -28, 8, -22);
  ctx.lineTo(8, -18);
  ctx.lineTo(-8, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4a08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Hat band
  ctx.fillStyle = "#a8500a";
  ctx.fillRect(-9, -20, 18, 2);
  // Tiny bee on hat
  ctx.fillStyle = "#3a2200";
  ctx.beginPath(); ctx.ellipse(8, -22, 2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f8d040";
  ctx.fillRect(7, -22.6, 2, 1.2);
  // Wings
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(7, -23.6, 1.2, 0.8, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, -23.6, 1.2, 0.8, 0.2, 0, Math.PI * 2); ctx.fill();
  // Smile lines
  ctx.strokeStyle = "rgba(120,70,30,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-10, -3); ctx.lineTo(-12, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(12, -1); ctx.stroke();
}

function drawBram(ctx) {
  // Bram — Smith, soot-streaked, leather apron, square jaw
  drawAvatarFrame(ctx, { bg: "#e8e0d0", border: "#5a6973" });
  drawShoulders(ctx, "#5a6973", "#2a3036");
  // Apron over chest
  ctx.fillStyle = "#3a2418";
  ctx.beginPath();
  ctx.moveTo(-14, 12);
  ctx.lineTo(-16, 32);
  ctx.lineTo(16, 32);
  ctx.lineTo(14, 12);
  ctx.bezierCurveTo(8, 10, -8, 10, -14, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Apron strap
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1.5, 8, 3, 6);
  drawHead(ctx, { skin: "#d8a878", outline: "#3a2010" });
  // Beard (full and dark)
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.bezierCurveTo(-14, 8, -8, 14, 0, 14);
  ctx.bezierCurveTo(8, 14, 14, 8, 12, -4);
  ctx.bezierCurveTo(6, 2, -6, 2, -12, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Mustache
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.moveTo(-7, -1); ctx.quadraticCurveTo(0, -3, 7, -1); ctx.quadraticCurveTo(2, 1, -2, 1); ctx.quadraticCurveTo(-4, 1, -7, -1);
  ctx.closePath(); ctx.fill();
  // Hair (short)
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.moveTo(-13, -16);
  ctx.bezierCurveTo(-12, -22, 12, -22, 13, -16);
  ctx.bezierCurveTo(8, -20, -8, -20, -13, -16);
  ctx.closePath();
  ctx.fill();
  // Soot smudge on forehead
  ctx.fillStyle = "rgba(40,20,8,0.55)";
  ctx.beginPath(); ctx.ellipse(4, -12, 3, 1.4, -0.2, 0, Math.PI * 2); ctx.fill();
  // Eye glint
  ctx.fillStyle = "#ff9a40";
  ctx.beginPath(); ctx.arc(-4.5, -7, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4.5, -7, 0.5, 0, Math.PI * 2); ctx.fill();
  // Hammer over shoulder
  ctx.save();
  ctx.translate(-22, 4);
  ctx.rotate(-0.5);
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1.5, 0, 3, 14);
  ctx.fillStyle = "#5a6066";
  ctx.fillRect(-5, -3, 10, 6);
  ctx.strokeStyle = "#1a1c20"; ctx.lineWidth = 1; ctx.strokeRect(-5, -3, 10, 6);
  ctx.restore();
}

function drawLiss(ctx) {
  // Sister Liss — Physician, hood with cross, gentle face
  drawAvatarFrame(ctx, { bg: "#f4e0e8", border: "#8d3a5c" });
  drawShoulders(ctx, "#8d3a5c", "#4a1830");
  // Hood (over head)
  ctx.fillStyle = "#a85070";
  ctx.beginPath();
  ctx.moveTo(-18, 6);
  ctx.bezierCurveTo(-20, -12, -16, -22, -8, -24);
  ctx.bezierCurveTo(0, -28, 8, -28, 16, -20);
  ctx.bezierCurveTo(20, -10, 18, 4, 18, 6);
  ctx.bezierCurveTo(8, 8, -8, 8, -18, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a1830";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Inner face frame
  ctx.fillStyle = "#fff5e8";
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.bezierCurveTo(-12, -2, -8, 6, 0, 6);
  ctx.bezierCurveTo(8, 6, 12, -2, 10, -12);
  ctx.bezierCurveTo(8, -22, -8, -22, -10, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a89878";
  ctx.lineWidth = 1;
  ctx.stroke();
  drawHead(ctx, { skin: "#f4d8b8", outline: "#5a3010" });
  // Cross pendant on chest
  ctx.fillStyle = "#fffae0";
  ctx.fillRect(-1.5, 12, 3, 10);
  ctx.fillRect(-4, 16, 8, 3);
  ctx.strokeStyle = "#a8500a";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-1.5, 12, 3, 10);
  ctx.strokeRect(-4, 16, 8, 3);
  // Soft smile (overdraw)
  ctx.strokeStyle = "#7a3010"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2.5, 0); ctx.quadraticCurveTo(0, 2.5, 2.5, 0);
  ctx.stroke();
  // Eyes — closed soft (gentle)
  ctx.strokeStyle = "#3a1804"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-7, -6); ctx.quadraticCurveTo(-4.5, -7.5, -2, -6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, -6); ctx.quadraticCurveTo(4.5, -7.5, 7, -6);
  ctx.stroke();
}

function drawWren(ctx) {
  // Wren — Scout, green hooded cloak, freckles
  drawAvatarFrame(ctx, { bg: "#e0ecd0", border: "#4f6b3a" });
  drawShoulders(ctx, "#4f6b3a", "#1f2e10");
  // Cloak hood folds
  ctx.fillStyle = "#3a5028";
  ctx.beginPath();
  ctx.moveTo(-22, 14);
  ctx.bezierCurveTo(-22, -4, -18, -22, 0, -24);
  ctx.bezierCurveTo(18, -22, 22, -4, 22, 14);
  ctx.bezierCurveTo(8, 4, -8, 4, -22, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f2e10";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  drawHead(ctx, { skin: "#f4d0a8", outline: "#5a3010" });
  // Hair tuft (auburn) under hood
  ctx.fillStyle = "#a04018";
  ctx.beginPath();
  ctx.moveTo(-12, -16);
  ctx.bezierCurveTo(-8, -20, 8, -20, 12, -16);
  ctx.bezierCurveTo(8, -14, -8, -14, -12, -16);
  ctx.closePath();
  ctx.fill();
  // Freckles
  ctx.fillStyle = "rgba(160,90,40,0.7)";
  [[-5, -3], [-3, -2], [-1, -3], [3, -3], [5, -2], [4, -4]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  // Determined smile
  ctx.strokeStyle = "#7a3010"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3, 1); ctx.quadraticCurveTo(0, 3, 3, 1);
  ctx.stroke();
  // Bow (over shoulder)
  ctx.strokeStyle = "#7a4a18";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, -8);
  ctx.bezierCurveTo(28, 4, 28, 16, 20, 26);
  ctx.stroke();
  ctx.strokeStyle = "#fffae0";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(20, -8);
  ctx.lineTo(20, 26);
  ctx.stroke();
  // Quiver on opposite shoulder
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.rect(-26, 4, 5, 18);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fffae0";
  ctx.beginPath(); ctx.arc(-23.5, 4, 0.8, 0, Math.PI * 2); ctx.fill();
}


// ── Boss portraits ────────────────────────────────────────────────────────

function drawFrostmaw(ctx) {
  // Frostmaw — Frozen titan
  drawAvatarFrame(ctx, { bg: "#cfe8f8", border: "#3a82c4" });
  // Body (icy)
  ctx.fillStyle = "#5a8acc";
  ctx.beginPath();
  ctx.moveTo(-26, 28);
  ctx.bezierCurveTo(-22, 12, -14, 8, 0, 8);
  ctx.bezierCurveTo(14, 8, 22, 12, 26, 28);
  ctx.lineTo(26, 32);
  ctx.lineTo(-26, 32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a3a6a"; ctx.lineWidth = 1.6; ctx.stroke();
  // Head (icy blue)
  const headGrad = ctx.createRadialGradient(-4, -10, 4, 0, -8, 24);
  headGrad.addColorStop(0, "#d8eef8");
  headGrad.addColorStop(0.5, "#7aaadd");
  headGrad.addColorStop(1, "#1a3a6a");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, -8, 16, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a1a3a"; ctx.lineWidth = 1.8; ctx.stroke();
  // Ice spikes (crown)
  ctx.fillStyle = "#cfe8f8";
  ctx.strokeStyle = "#3a82c4";
  ctx.lineWidth = 1;
  [[-12, -22, -14, -32], [-4, -26, -3, -38], [4, -26, 3, -38], [12, -22, 14, -32], [-8, -24, -8, -34], [8, -24, 8, -34]].forEach(([bx, by, tx, ty]) => {
    ctx.beginPath();
    ctx.moveTo(bx - 2, by);
    ctx.lineTo(bx + 2, by);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  // Glowing eyes
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.arc(-5, -8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#65e5ff";
  ctx.beginPath(); ctx.arc(-5, -8, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -8, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-5.5, -8.5, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4.5, -8.5, 0.8, 0, Math.PI * 2); ctx.fill();
  // Fanged maw
  ctx.fillStyle = "#0a1a3a";
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(-5, 9);
  ctx.lineTo(-3, 5);
  ctx.lineTo(0, 9);
  ctx.lineTo(3, 5);
  ctx.lineTo(5, 9);
  ctx.lineTo(8, 4);
  ctx.closePath();
  ctx.fill();
  // Fangs (white)
  ctx.fillStyle = "#fff";
  [[-5, 7], [0, 8], [5, 7]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 1, 4);
    ctx.lineTo(x + 1, 4);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  });
  // Frosty breath
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(-8 + i * 4, 14 + (i % 2) * 2, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  // Snowflakes around
  ctx.fillStyle = "#ffffff";
  [[-22, -16], [22, -14], [-18, 4], [20, 0]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawQuagmire(ctx) {
  // Quagmire — Boggy plant titan
  drawAvatarFrame(ctx, { bg: "#c8d8a0", border: "#5a8028" });
  // Body
  ctx.fillStyle = "#3a5018";
  ctx.beginPath();
  ctx.moveTo(-26, 28);
  ctx.bezierCurveTo(-22, 12, -10, 8, 0, 8);
  ctx.bezierCurveTo(10, 8, 22, 12, 26, 28);
  ctx.lineTo(26, 32);
  ctx.lineTo(-26, 32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a2808"; ctx.lineWidth = 1.6; ctx.stroke();
  // Mossy head
  const headGrad = ctx.createRadialGradient(-4, -10, 4, 0, -4, 24);
  headGrad.addColorStop(0, "#7ab040");
  headGrad.addColorStop(0.6, "#3a6018");
  headGrad.addColorStop(1, "#1a2a08");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, -6, 18, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Vines / hair tendrils
  ctx.strokeStyle = "#5a8028";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  [[-14, -16, -22, -24], [-6, -22, -10, -32], [6, -22, 10, -32], [14, -16, 22, -24], [-10, -20, -16, -28], [10, -20, 16, -28]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo((x1 + x2) / 2 + 4, (y1 + y2) / 2, x2 + 2, y2 + 4, x2, y2);
    ctx.stroke();
  });
  // Mushroom tufts
  ctx.fillStyle = "#c8281a";
  [[-14, -10], [12, -14]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 2, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#fffae0";
    ctx.beginPath(); ctx.arc(x - 1, y - 0.5, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1, y - 1, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c8281a";
  });
  // Glowing yellow eyes
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath(); ctx.ellipse(-6, -6, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -6, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.arc(-6, -6, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -6, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath(); ctx.arc(-6, -6, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -6, 1, 0, Math.PI * 2); ctx.fill();
  // Maw with twigs
  ctx.fillStyle = "#1a2a08";
  ctx.beginPath();
  ctx.ellipse(0, 6, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a8028"; ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, 4);
    ctx.lineTo(i + 1, 8);
    ctx.stroke();
  }
  // Drip
  ctx.fillStyle = "#3a6018";
  ctx.beginPath();
  ctx.moveTo(-2, 12);
  ctx.bezierCurveTo(-4, 18, 0, 22, 0, 14);
  ctx.fill();
}

function drawEmberDrake(ctx) {
  // Ember Drake — Dragon head
  drawAvatarFrame(ctx, { bg: "#fce0d0", border: "#c84818" });
  // Body
  ctx.fillStyle = "#7a1808";
  ctx.beginPath();
  ctx.moveTo(-26, 28);
  ctx.bezierCurveTo(-22, 12, -10, 8, 0, 8);
  ctx.bezierCurveTo(10, 8, 22, 12, 26, 28);
  ctx.lineTo(26, 32);
  ctx.lineTo(-26, 32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.6; ctx.stroke();
  // Dragon head silhouette (snouty)
  const headGrad = ctx.createRadialGradient(-4, -10, 4, 0, 0, 22);
  headGrad.addColorStop(0, "#f8a020");
  headGrad.addColorStop(0.4, "#c83818");
  headGrad.addColorStop(1, "#3a0808");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(-16, -8);
  ctx.bezierCurveTo(-20, -22, -8, -28, 0, -26);
  ctx.bezierCurveTo(8, -28, 20, -22, 16, -8);
  // Snout extending right
  ctx.bezierCurveTo(20, 0, 22, 8, 14, 8);
  ctx.bezierCurveTo(8, 12, -8, 12, -14, 8);
  ctx.bezierCurveTo(-20, 4, -20, -2, -16, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.8; ctx.stroke();
  // Horns
  ctx.fillStyle = "#3a1808";
  [[-12, -22, -16, -32], [12, -22, 16, -32]].forEach(([bx, by, tx, ty]) => {
    ctx.beginPath();
    ctx.moveTo(bx - 3, by);
    ctx.lineTo(bx + 3, by - 2);
    ctx.bezierCurveTo(tx + 2, ty + 6, tx, ty, tx, ty);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1; ctx.stroke();
  });
  // Glowing yellow eyes
  ctx.fillStyle = "#1a0408";
  ctx.beginPath(); ctx.ellipse(-5, -10, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, -10, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd040";
  ctx.beginPath(); ctx.arc(-5, -10, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -10, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a0408";
  ctx.fillRect(-5.5, -11, 1, 4); // vertical slit
  ctx.fillRect(4.5, -11, 1, 4);
  // Nostrils with smoke
  ctx.fillStyle = "#1a0408";
  ctx.beginPath(); ctx.arc(-3, -2, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -2, 0.8, 0, Math.PI * 2); ctx.fill();
  // Smoke wisp
  ctx.strokeStyle = "rgba(120,80,40,0.6)";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.bezierCurveTo(-4, -8, 4, -12, 0, -18);
  ctx.stroke();
  // Mouth — fang line
  ctx.strokeStyle = "#1a0408";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, 4); ctx.lineTo(10, 4);
  ctx.stroke();
  // Fangs
  ctx.fillStyle = "#fffae0";
  [[-6, 4], [-2, 4], [2, 4], [6, 4]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 1, y);
    ctx.lineTo(x + 1, y);
    ctx.lineTo(x, y + 3);
    ctx.closePath();
    ctx.fill();
  });
  // Fire glow particles
  ctx.fillStyle = "rgba(255,160,40,0.85)";
  [[-22, 4, 2], [22, 6, 1.6], [-18, -16, 1.4], [20, -14, 1.4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawOldStoneface(ctx) {
  // Old Stoneface — Stone golem
  drawAvatarFrame(ctx, { bg: "#d8d0c0", border: "#5a4a3a" });
  // Body
  ctx.fillStyle = "#7a6850";
  ctx.beginPath();
  ctx.moveTo(-26, 28);
  ctx.bezierCurveTo(-22, 12, -14, 8, 0, 8);
  ctx.bezierCurveTo(14, 8, 22, 12, 26, 28);
  ctx.lineTo(26, 32);
  ctx.lineTo(-26, 32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1a0a"; ctx.lineWidth = 1.6; ctx.stroke();
  // Stone block head
  const headGrad = ctx.createLinearGradient(0, -22, 0, 8);
  headGrad.addColorStop(0, "#a89878");
  headGrad.addColorStop(0.5, "#6a584a");
  headGrad.addColorStop(1, "#3a2818");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(-18, -22);
  ctx.lineTo(18, -22);
  ctx.lineTo(20, 4);
  ctx.lineTo(-20, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0a04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Cracks
  ctx.strokeStyle = "rgba(40,20,10,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, -22); ctx.lineTo(-8, -16); ctx.lineTo(-12, -10); ctx.lineTo(-10, -4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12, -16); ctx.lineTo(10, -10); ctx.lineTo(14, -4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(2, -2); ctx.lineTo(-2, 2);
  ctx.stroke();
  // Weathered eyes (glowing slits)
  ctx.fillStyle = "#0a0604";
  ctx.fillRect(-12, -14, 8, 4);
  ctx.fillRect(4, -14, 8, 4);
  ctx.fillStyle = "#f8c060";
  ctx.fillRect(-10, -13, 4, 2);
  ctx.fillRect(6, -13, 4, 2);
  // Mossy patches
  ctx.fillStyle = "#5a8028";
  [[-14, -22, 4], [12, -20, 3], [-6, -2, 3]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Stone teeth
  ctx.fillStyle = "#a89878";
  ctx.fillRect(-10, 0, 20, 4);
  ctx.strokeStyle = "#1a0a04"; ctx.lineWidth = 0.8;
  ctx.strokeRect(-10, 0, 20, 4);
  for (let x = -8; x <= 8; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, 4);
    ctx.stroke();
  }
  // Pebbles around shoulders
  ctx.fillStyle = "#5a4a3a";
  [[-22, 14], [22, 16], [-18, 26], [20, 24]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawMossback(ctx) {
  // Mossback — Mossy turtle/giant
  drawAvatarFrame(ctx, { bg: "#d8e8b8", border: "#3a6018" });
  // Body
  ctx.fillStyle = "#5a7a18";
  ctx.beginPath();
  ctx.moveTo(-26, 28);
  ctx.bezierCurveTo(-22, 12, -10, 8, 0, 8);
  ctx.bezierCurveTo(10, 8, 22, 12, 26, 28);
  ctx.lineTo(26, 32);
  ctx.lineTo(-26, 32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a2a04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Shell mound on top of head
  const shellGrad = ctx.createRadialGradient(-4, -16, 4, 0, -10, 28);
  shellGrad.addColorStop(0, "#a85818");
  shellGrad.addColorStop(0.6, "#5a3014");
  shellGrad.addColorStop(1, "#1a0808");
  ctx.fillStyle = shellGrad;
  ctx.beginPath();
  ctx.moveTo(-22, -8);
  ctx.bezierCurveTo(-22, -28, 22, -28, 22, -8);
  ctx.bezierCurveTo(8, -10, -8, -10, -22, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0808"; ctx.lineWidth = 1.8; ctx.stroke();
  // Shell hex pattern
  ctx.strokeStyle = "rgba(255,200,140,0.6)";
  ctx.lineWidth = 1;
  [[-12, -18], [-2, -22], [8, -20], [14, -14], [-8, -14]].forEach(([cx, cy]) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 4;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  });
  // Moss patches on shell
  ctx.fillStyle = "#5a8028";
  [[-12, -18, 5], [4, -22, 3], [12, -12, 3]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Tiny flowers on moss
  ctx.fillStyle = "#f8d040";
  [[-12, -18], [4, -22]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
  // Head (poking out from shell)
  ctx.fillStyle = "#5a7028";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a2a04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Eyes (deep, watchful)
  ctx.fillStyle = "#0a1804";
  ctx.beginPath(); ctx.arc(-4, -2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#a8c068";
  ctx.beginPath(); ctx.arc(-3.5, -2.5, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4.5, -2.5, 0.6, 0, Math.PI * 2); ctx.fill();
  // Mouth (line)
  ctx.strokeStyle = "#0a1804";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, 4); ctx.lineTo(4, 4);
  ctx.stroke();
  // Berry on shell
  ctx.fillStyle = "#c43a68";
  ctx.beginPath();
  ctx.arc(-16, -12, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a1a3a"; ctx.lineWidth = 0.6; ctx.stroke();
}

// ── Registry ───────────────────────────────────────────────────────────────

export const ICONS = {
  // NPCs
  char_mira:  { label:"Mira",         color:"#d6612a", draw:drawMira },
  char_tomas: { label:"Old Tomas",    color:"#c8923a", draw:drawTomas },
  char_bram:  { label:"Bram",         color:"#5a6973", draw:drawBram },
  char_liss:  { label:"Sister Liss",  color:"#8d3a5c", draw:drawLiss },
  char_wren:  { label:"Wren",         color:"#4f6b3a", draw:drawWren },
  // Bosses
  boss_frostmaw:      { label:"Frostmaw",      color:"#3a82c4", draw:drawFrostmaw },
  boss_quagmire:      { label:"Quagmire",      color:"#5a8028", draw:drawQuagmire },
  boss_ember_drake:   { label:"Ember Drake",   color:"#c84818", draw:drawEmberDrake },
  boss_old_stoneface: { label:"Old Stoneface", color:"#5a4a3a", draw:drawOldStoneface },
  boss_mossback:      { label:"Mossback",      color:"#3a6018", draw:drawMossback },
};
