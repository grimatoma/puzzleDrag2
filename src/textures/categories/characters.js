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

// ── Worker portraits ──────────────────────────────────────────────────────

function drawHilda(ctx) {
  // Hilda — Farmhand, straw hat, blonde braid
  drawAvatarFrame(ctx, { bg: "#e8f3d0", border: "#4f8c3a" });
  drawShoulders(ctx, "#4f8c3a", "#2a4818");
  // Braid over shoulder
  ctx.fillStyle = "#e8c060";
  ctx.beginPath();
  ctx.ellipse(-18, 18, 4, 12, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a5a10";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Braid bumps
  ctx.strokeStyle = "rgba(120,80,20,0.6)";
  ctx.lineWidth = 1;
  [10, 16, 22].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-22, y);
    ctx.quadraticCurveTo(-18, y + 1, -14, y);
    ctx.stroke();
  });
  drawHead(ctx, { skin: "#f8d8b8", outline: "#5a3010" });
  // Pigtails next to face
  ctx.fillStyle = "#e8c060";
  ctx.beginPath(); ctx.ellipse(-14, -6, 4, 8, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#8a5a10"; ctx.lineWidth = 1; ctx.stroke();
  // Straw hat
  ctx.fillStyle = "#f0d068";
  ctx.beginPath();
  ctx.ellipse(0, -18, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a5a10";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Crown
  ctx.fillStyle = "#e8c060";
  ctx.beginPath();
  ctx.moveTo(-10, -22);
  ctx.bezierCurveTo(-10, -28, 10, -28, 10, -22);
  ctx.lineTo(10, -18);
  ctx.lineTo(-10, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a5a10";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Flower on hat
  ctx.fillStyle = "#f878a0";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(-7 + Math.cos(a) * 1.6, -22 + Math.sin(a) * 1.6, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.arc(-7, -22, 1.2, 0, Math.PI * 2); ctx.fill();
  // Cheerful smile
  ctx.strokeStyle = "#7a3010"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.quadraticCurveTo(0, 3, 3, 0);
  ctx.stroke();
}

function drawPip(ctx) {
  // Pip — Forager, leafy hood, holding a berry
  drawAvatarFrame(ctx, { bg: "#e0f0d0", border: "#7dc45a" });
  drawShoulders(ctx, "#7dc45a", "#3a6a18");
  // Leaf hood
  ctx.fillStyle = "#5aa030";
  ctx.beginPath();
  ctx.moveTo(-18, -8);
  ctx.bezierCurveTo(-22, -22, -10, -28, 0, -26);
  ctx.bezierCurveTo(10, -28, 22, -22, 18, -8);
  ctx.bezierCurveTo(8, -18, -8, -18, -18, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a4810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Leaf points (decoration)
  ctx.fillStyle = "#3a6a18";
  [[-14, -22], [-6, -28], [4, -28], [14, -22]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y - 5);
    ctx.lineTo(x + 3, y - 5);
    ctx.closePath();
    ctx.fill();
  });
  drawHead(ctx, { skin: "#f4d6a6", outline: "#5a3010" });
  // Tuft of hair
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.moveTo(-10, -18);
  ctx.lineTo(-2, -22);
  ctx.lineTo(0, -16);
  ctx.closePath();
  ctx.fill();
  // Berry near cheek
  ctx.fillStyle = "#c43a68";
  ctx.beginPath(); ctx.arc(12, 8, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5e1a3a"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = "#3a6a18";
  ctx.beginPath();
  ctx.moveTo(12, 5); ctx.lineTo(14, 2); ctx.lineTo(10, 2); ctx.closePath();
  ctx.fill();
  // Big grin
  ctx.strokeStyle = "#7a3010"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, 0); ctx.quadraticCurveTo(0, 4, 4, 0);
  ctx.stroke();
}

function drawWila(ctx) {
  // Wila — Cellarer, headscarf, jam stain
  drawAvatarFrame(ctx, { bg: "#fff0d8", border: "#c8923a" });
  drawShoulders(ctx, "#c8923a", "#7a4a08");
  // Headscarf
  ctx.fillStyle = "#a0204a";
  ctx.beginPath();
  ctx.moveTo(-15, -8);
  ctx.bezierCurveTo(-18, -22, -10, -26, 0, -26);
  ctx.bezierCurveTo(10, -26, 18, -22, 15, -8);
  ctx.bezierCurveTo(8, -18, -8, -18, -15, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a0820";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Knot at side
  ctx.fillStyle = "#a0204a";
  ctx.beginPath();
  ctx.ellipse(15, -16, 4, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a0820";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // White polka dots
  ctx.fillStyle = "#ffffff";
  [[-10, -18], [-2, -22], [6, -20], [12, -16], [-6, -14]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
  drawHead(ctx, { skin: "#f0c8a0", outline: "#5a3010" });
  // Hair under scarf
  ctx.fillStyle = "#5a3014";
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.bezierCurveTo(-13, -4, -10, 0, -8, 0);
  ctx.lineTo(-9, -10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -10);
  ctx.bezierCurveTo(13, -4, 10, 0, 8, 0);
  ctx.lineTo(9, -10);
  ctx.closePath();
  ctx.fill();
  // Jam stain on apron
  ctx.fillStyle = "rgba(160,32,74,0.65)";
  ctx.beginPath();
  ctx.ellipse(-2, 24, 4, 2, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawTuck(ctx) {
  // Tuck — Lookout, pointed cap with feather, telescope
  drawAvatarFrame(ctx, { bg: "#e0eef8", border: "#3a6a9a" });
  drawShoulders(ctx, "#3a6a9a", "#1a3a5a");
  drawHead(ctx, { skin: "#f4d8b8", outline: "#5a3010" });
  // Pointed cap
  ctx.fillStyle = "#3a6a9a";
  ctx.beginPath();
  ctx.moveTo(-14, -16);
  ctx.lineTo(0, -32);
  ctx.lineTo(14, -16);
  ctx.bezierCurveTo(8, -14, -8, -14, -14, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a3a5a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Cap band
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-14, -16, 28, 2.2);
  // Feather
  ctx.fillStyle = "#c84030";
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.bezierCurveTo(-10, -36, -8, -42, -2, -42);
  ctx.bezierCurveTo(0, -38, 0, -34, 0, -32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a1010";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,200,180,0.7)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(-4, -38);
  ctx.stroke();
  // Telescope/spyglass at eye
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(8, -8, 18, 6);
  ctx.fillStyle = "#a87838";
  ctx.fillRect(20, -7, 6, 4);
  ctx.fillStyle = "#65e5ff";
  ctx.beginPath();
  ctx.arc(8, -5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a3a5a";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, -8, 18, 6);
  // Cover the right eye
  ctx.fillStyle = "#f4d8b8";
  ctx.beginPath();
  ctx.arc(4.5, -6, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawOsric(ctx) {
  // Osric — Smith Apprentice, leather strap, soot
  drawAvatarFrame(ctx, { bg: "#e8e0d8", border: "#3a3a3a" });
  drawShoulders(ctx, "#5a3a18", "#2a1808");
  // Leather strap
  ctx.fillStyle = "#3a2010";
  ctx.fillRect(-1.5, 8, 3, 24);
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.arc(0, 22, 3, 0, Math.PI * 2);
  ctx.fill();
  drawHead(ctx, { skin: "#d8a878", outline: "#3a2010" });
  // Hair (curly black)
  ctx.fillStyle = "#1a0e08";
  ctx.beginPath();
  ctx.arc(-9, -16, 5, 0, Math.PI * 2);
  ctx.arc(-2, -20, 5, 0, Math.PI * 2);
  ctx.arc(5, -20, 5, 0, Math.PI * 2);
  ctx.arc(11, -16, 5, 0, Math.PI * 2);
  ctx.arc(-12, -10, 4, 0, Math.PI * 2);
  ctx.arc(12, -10, 4, 0, Math.PI * 2);
  ctx.fill();
  // Headband
  ctx.fillStyle = "#a8431a";
  ctx.fillRect(-13, -12, 26, 3);
  ctx.strokeStyle = "#5a1808";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-13, -12, 26, 3);
  // Soot smudge on cheek
  ctx.fillStyle = "rgba(40,20,8,0.6)";
  ctx.beginPath();
  ctx.ellipse(6, -1, 3, 1.4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Mini hammer pin
  ctx.fillStyle = "#5a6066";
  ctx.fillRect(-3, 12, 6, 3);
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1, 14, 2, 6);
  // Determined smirk
  ctx.strokeStyle = "#3a1804"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3, 1); ctx.quadraticCurveTo(0, 2, 3, 0);
  ctx.stroke();
}

function drawDren(ctx) {
  // Dren — Miner, hard hat with lantern
  drawAvatarFrame(ctx, { bg: "#dcdfe2", border: "#7a8490" });
  drawShoulders(ctx, "#5a4a3a", "#2a1c10");
  drawHead(ctx, { skin: "#e8c098", outline: "#3a2010" });
  // Beard
  ctx.fillStyle = "#5a3a18";
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.bezierCurveTo(-13, 8, -8, 14, 0, 14);
  ctx.bezierCurveTo(8, 14, 13, 8, 10, -2);
  ctx.bezierCurveTo(6, 4, -6, 4, -10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1408";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Hard hat dome
  ctx.fillStyle = "#f8c040";
  ctx.beginPath();
  ctx.moveTo(-15, -14);
  ctx.bezierCurveTo(-15, -28, 15, -28, 15, -14);
  ctx.lineTo(-15, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3a08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Brim
  ctx.fillStyle = "#d49018";
  ctx.fillRect(-18, -14, 36, 3);
  ctx.strokeStyle = "#5a3a08";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-18, -14, 36, 3);
  // Lamp on front
  ctx.fillStyle = "#a8a8b0";
  ctx.fillRect(-4, -22, 8, 5);
  ctx.fillStyle = "#fff8a0";
  ctx.beginPath();
  ctx.arc(0, -19.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Lamp glow
  ctx.fillStyle = "rgba(255,240,140,0.4)";
  ctx.beginPath();
  ctx.arc(0, -19.5, 5, 0, Math.PI * 2);
  ctx.fill();
  // Pickaxe over shoulder
  ctx.save();
  ctx.translate(20, -8);
  ctx.rotate(0.6);
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1.5, -10, 3, 30);
  ctx.fillStyle = "#5a6066";
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(10, -10);
  ctx.lineTo(0, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

function drawBrenna(ctx) {
  // Brenna — Vegetable Picker, basket and carrot
  drawAvatarFrame(ctx, { bg: "#e0eecc", border: "#7a9a3a" });
  drawShoulders(ctx, "#7a9a3a", "#3a4a18");
  drawHead(ctx, { skin: "#f4c8a0", outline: "#5a3010" });
  // Hair (red bob)
  ctx.fillStyle = "#a83820";
  ctx.beginPath();
  ctx.moveTo(-13, -16);
  ctx.bezierCurveTo(-16, 0, -10, 4, -8, 4);
  ctx.lineTo(-10, -10);
  ctx.bezierCurveTo(-10, -22, 10, -22, 10, -10);
  ctx.lineTo(8, 4);
  ctx.bezierCurveTo(10, 4, 16, 0, 13, -16);
  ctx.bezierCurveTo(8, -22, -8, -22, -13, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a1808";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Bandanna
  ctx.fillStyle = "#f8d040";
  ctx.fillRect(-13, -14, 26, 3);
  // Basket on shoulder
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.moveTo(-26, 18);
  ctx.lineTo(-12, 18);
  ctx.lineTo(-14, 30);
  ctx.lineTo(-24, 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2; ctx.stroke();
  // Basket weave
  ctx.strokeStyle = "rgba(58,28,8,0.6)";
  ctx.lineWidth = 0.7;
  for (let y = 20; y <= 28; y += 2) {
    ctx.beginPath(); ctx.moveTo(-26, y); ctx.lineTo(-12, y); ctx.stroke();
  }
  // Carrot poking out
  ctx.save();
  ctx.translate(-19, 16);
  ctx.rotate(-0.3);
  ctx.fillStyle = "#e07820";
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(2, 0);
  ctx.lineTo(0, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a2806"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.arc(-1, -2, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1, -3, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFenna(ctx) {
  // Fenna — Fruit Picker, apple in hair
  drawAvatarFrame(ctx, { bg: "#fce0d8", border: "#c84a3a" });
  drawShoulders(ctx, "#c84a3a", "#5a1808");
  drawHead(ctx, { skin: "#f4d6a6", outline: "#5a3010" });
  // Long brown hair
  ctx.fillStyle = "#5a3014";
  ctx.beginPath();
  ctx.moveTo(-13, -16);
  ctx.bezierCurveTo(-22, 6, -16, 28, -10, 30);
  ctx.lineTo(-12, 16);
  ctx.lineTo(-12, -10);
  ctx.bezierCurveTo(-12, -22, 12, -22, 12, -10);
  ctx.lineTo(12, 16);
  ctx.lineTo(10, 30);
  ctx.bezierCurveTo(16, 28, 22, 6, 13, -16);
  ctx.bezierCurveTo(8, -22, -8, -22, -13, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1408";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Apple on head
  ctx.fillStyle = "#d4543a";
  ctx.beginPath();
  ctx.arc(8, -22, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a1808"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(8, -25); ctx.lineTo(11, -27); ctx.lineTo(10, -25); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a2010"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, -26); ctx.lineTo(8, -24); ctx.stroke();
  // Bright smile
  ctx.strokeStyle = "#7a3010"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.quadraticCurveTo(0, 3, 3, 0);
  ctx.stroke();
}

function drawGarrick(ctx) {
  // Garrick — Herder, beard, shepherd's flute
  drawAvatarFrame(ctx, { bg: "#f0e0d0", border: "#a86838" });
  drawShoulders(ctx, "#a86838", "#5a3014");
  drawHead(ctx, { skin: "#e8c098", outline: "#3a2010" });
  // Bushy brown beard
  ctx.fillStyle = "#7a4a14";
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.bezierCurveTo(-16, 12, -8, 16, 0, 16);
  ctx.bezierCurveTo(8, 16, 16, 12, 12, -2);
  ctx.bezierCurveTo(8, 4, -8, 4, -12, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2; ctx.stroke();
  // Mustache
  ctx.fillStyle = "#7a4a14";
  ctx.beginPath();
  ctx.moveTo(-7, -1); ctx.quadraticCurveTo(0, -3, 7, -1); ctx.quadraticCurveTo(2, 1, -2, 1); ctx.quadraticCurveTo(-4, 1, -7, -1);
  ctx.closePath(); ctx.fill();
  // Hat (shepherd's wide brim)
  ctx.fillStyle = "#7a4a14";
  ctx.beginPath();
  ctx.ellipse(0, -16, 22, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, -18);
  ctx.bezierCurveTo(-12, -28, 12, -28, 12, -18);
  ctx.lineTo(-12, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Hat band
  ctx.fillStyle = "#a82030";
  ctx.fillRect(-12, -20, 24, 2);
  // Pan flute over chest
  ctx.fillStyle = "#a87838";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-10 + i * 4, 14, 3, 14 - i * 1.5);
  }
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    ctx.strokeRect(-10 + i * 4, 14, 3, 14 - i * 1.5);
  }
}

function drawElsa(ctx) {
  // Elsa — Dairywoman, blonde, milk pail charm
  drawAvatarFrame(ctx, { bg: "#e0ecf6", border: "#8aa6c4" });
  drawShoulders(ctx, "#8aa6c4", "#4a6080");
  drawHead(ctx, { skin: "#fce4c8", outline: "#5a3010" });
  // Bonnet (white)
  ctx.fillStyle = "#fffae8";
  ctx.beginPath();
  ctx.moveTo(-15, -10);
  ctx.bezierCurveTo(-18, -22, -8, -28, 0, -26);
  ctx.bezierCurveTo(8, -28, 18, -22, 15, -10);
  ctx.bezierCurveTo(8, -18, -8, -18, -15, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a89878"; ctx.lineWidth = 1.2; ctx.stroke();
  // Bonnet ribbon
  ctx.fillStyle = "#80a0c0";
  ctx.fillRect(-15, -12, 30, 2);
  // Blonde hair tuft
  ctx.fillStyle = "#f0d878";
  ctx.beginPath();
  ctx.moveTo(-10, -10); ctx.lineTo(-5, -8); ctx.lineTo(-8, -6);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, -10); ctx.lineTo(5, -8); ctx.lineTo(8, -6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#a8801a"; ctx.lineWidth = 0.8; ctx.stroke();
  // Milk pail charm
  ctx.fillStyle = "#a8a8b0";
  ctx.beginPath();
  ctx.moveTo(-3, 18); ctx.lineTo(3, 18); ctx.lineTo(2, 28); ctx.lineTo(-2, 28); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3, 18); ctx.bezierCurveTo(-3, 14, 3, 14, 3, 18);
  ctx.stroke();
  // Cheeky smile
  ctx.strokeStyle = "#7a3010"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.quadraticCurveTo(0, 3, 3, 0);
  ctx.stroke();
}

function drawRusk(ctx) {
  // Rusk — Rancher, cowboy hat, bandanna
  drawAvatarFrame(ctx, { bg: "#f0d8c0", border: "#a85a3a" });
  drawShoulders(ctx, "#7a4a18", "#3a1c08");
  // Bandanna
  ctx.fillStyle = "#c8181a";
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.lineTo(14, 8);
  ctx.lineTo(8, 22);
  ctx.lineTo(0, 16);
  ctx.lineTo(-8, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "#fff";
  [[-8, 12], [-2, 16], [4, 12], [8, 18]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.8, 0, Math.PI * 2);
    ctx.fill();
  });
  drawHead(ctx, { skin: "#e8b078", outline: "#3a2010" });
  // Cowboy hat brim
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.ellipse(0, -16, 26, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.4; ctx.stroke();
  // Crown with creases
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.moveTo(-12, -16);
  ctx.bezierCurveTo(-12, -28, 12, -28, 12, -16);
  ctx.lineTo(-12, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2; ctx.stroke();
  // Hat crease
  ctx.strokeStyle = "rgba(58,28,8,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -28); ctx.lineTo(0, -18);
  ctx.stroke();
  // Star on hat band
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 2.4 : 1;
    ctx.lineTo(Math.cos(a) * r, -22 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  // Stubble
  ctx.fillStyle = "rgba(60,40,20,0.55)";
  for (let i = 0; i < 30; i++) {
    const x = -8 + Math.random() * 16;
    const y = 0 + Math.random() * 6;
    ctx.beginPath();
    ctx.arc(x, y, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTilda(ctx) {
  // Tilda — Grain Trader, headdress with wheat
  drawAvatarFrame(ctx, { bg: "#fff0c0", border: "#c8923a" });
  drawShoulders(ctx, "#c8923a", "#5a3a08");
  drawHead(ctx, { skin: "#f4c890", outline: "#5a3010" });
  // Hair (twin braids)
  ctx.fillStyle = "#8a5a14";
  ctx.beginPath();
  ctx.ellipse(-14, 6, 4, 16, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, 6, 4, 16, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3010"; ctx.lineWidth = 1; ctx.stroke();
  // Headband with wheat
  ctx.fillStyle = "#c8923a";
  ctx.fillRect(-14, -14, 28, 3);
  ctx.strokeStyle = "#5a3a08"; ctx.lineWidth = 1; ctx.strokeRect(-14, -14, 28, 3);
  // Wheat stalks decorating
  ctx.strokeStyle = "#c89320"; ctx.lineWidth = 1.4;
  [[-10, -14], [0, -14], [10, -14]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 8);
    ctx.stroke();
    ctx.fillStyle = "#f4c84a";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(x - 1.5, y - 8 + i * 2, 1, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 1.5, y - 8 + i * 2, 1, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // Coin in hand area (near jaw)
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  ctx.arc(14, 14, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4a08"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = "#7a4a08";
  ctx.font = "bold 4px Arial";
  ctx.textAlign = "center";
  ctx.fillText("◉", 14, 15.5);
}

function drawMarin(ctx) {
  // Marin — Gardener, leafy crown
  drawAvatarFrame(ctx, { bg: "#dbeac8", border: "#7eb83a" });
  drawShoulders(ctx, "#7eb83a", "#3a5a14");
  drawHead(ctx, { skin: "#e0c8a0", outline: "#5a3010" });
  // Wavy green-brown hair
  ctx.fillStyle = "#5a4818";
  ctx.beginPath();
  ctx.moveTo(-13, -10);
  ctx.bezierCurveTo(-18, -2, -10, 4, -8, 4);
  ctx.lineTo(-12, -8);
  ctx.bezierCurveTo(-12, -22, 12, -22, 12, -8);
  ctx.lineTo(8, 4);
  ctx.bezierCurveTo(10, 4, 18, -2, 13, -10);
  ctx.bezierCurveTo(8, -22, -8, -22, -13, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1408"; ctx.lineWidth = 1.2; ctx.stroke();
  // Leaf crown
  ctx.fillStyle = "#5a8a26";
  [[-10, -18], [-4, -22], [4, -22], [10, -18]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 2.4, x < 0 ? -0.4 : 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = "#2a4810"; ctx.lineWidth = 0.8;
  [[-10, -18], [-4, -22], [4, -22], [10, -18]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 2.4, x < 0 ? -0.4 : 0.4, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Tiny flower in crown
  ctx.fillStyle = "#f878a0";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0 + Math.cos(a) * 1.6, -22 + Math.sin(a) * 1.6, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.arc(0, -22, 1, 0, Math.PI * 2); ctx.fill();
}

function drawAnnek(ctx) {
  // Annek — Orchardist, scissors, pruner gloves
  drawAvatarFrame(ctx, { bg: "#fce0d4", border: "#c84a3a" });
  drawShoulders(ctx, "#c84a3a", "#5a1808");
  drawHead(ctx, { skin: "#f4d6a6", outline: "#5a3010" });
  // Cropped hair
  ctx.fillStyle = "#7a3a14";
  ctx.beginPath();
  ctx.moveTo(-13, -12);
  ctx.bezierCurveTo(-12, -22, 12, -22, 13, -12);
  ctx.bezierCurveTo(8, -16, -8, -16, -13, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1804"; ctx.lineWidth = 1; ctx.stroke();
  // Hair clip flower
  ctx.fillStyle = "#f878a0";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(-9 + Math.cos(a) * 1.4, -16 + Math.sin(a) * 1.4, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Scissors on shoulder
  ctx.save();
  ctx.translate(20, 12);
  ctx.rotate(0.4);
  ctx.strokeStyle = "#a8a8b0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-8, 8);
  ctx.moveTo(0, 0); ctx.lineTo(8, 8);
  ctx.stroke();
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath(); ctx.arc(-8, 8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, 8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRen(ctx) {
  // Ren — Farmer, with bucket charm and wheat
  drawAvatarFrame(ctx, { bg: "#dce8c8", border: "#5a7a3a" });
  drawShoulders(ctx, "#5a7a3a", "#2a4810");
  drawHead(ctx, { skin: "#e8c098", outline: "#3a2010" });
  // Hair
  ctx.fillStyle = "#3a2014";
  ctx.beginPath();
  ctx.moveTo(-13, -14);
  ctx.bezierCurveTo(-12, -22, 12, -22, 13, -14);
  ctx.bezierCurveTo(8, -18, -8, -18, -13, -14);
  ctx.closePath();
  ctx.fill();
  // Cap (cloth flat cap)
  ctx.fillStyle = "#5a4818";
  ctx.beginPath();
  ctx.moveTo(-15, -16);
  ctx.bezierCurveTo(-15, -24, 8, -28, 16, -22);
  ctx.lineTo(15, -16);
  ctx.lineTo(-15, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1408"; ctx.lineWidth = 1.4; ctx.stroke();
  // Wheat stalk on cap
  ctx.strokeStyle = "#c89320"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(8, -22); ctx.lineTo(14, -30);
  ctx.stroke();
  ctx.fillStyle = "#f4c84a";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(10 + i * 1.3, -25 + i * 1.6, 1, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bucket on belt
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.moveTo(-4, 18); ctx.lineTo(4, 18); ctx.lineTo(3, 28); ctx.lineTo(-3, 28); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4, 18); ctx.bezierCurveTo(-4, 14, 4, 14, 4, 18);
  ctx.stroke();
}

function drawIvar(ctx) {
  // Ivar — Beekeeper, mesh veil, bee on shoulder
  drawAvatarFrame(ctx, { bg: "#fff0c0", border: "#e8a020" });
  drawShoulders(ctx, "#7a4a18", "#3a1c08");
  drawHead(ctx, { skin: "#e8c098", outline: "#3a2010" });
  // Veil mesh (semi-transparent)
  ctx.fillStyle = "rgba(180,200,220,0.4)";
  ctx.beginPath();
  ctx.moveTo(-18, -8);
  ctx.bezierCurveTo(-22, 12, -10, 14, 0, 14);
  ctx.bezierCurveTo(10, 14, 22, 12, 18, -8);
  ctx.bezierCurveTo(8, -18, -8, -18, -18, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(80,80,80,0.6)";
  ctx.lineWidth = 0.8;
  // Mesh pattern
  for (let y = -6; y < 14; y += 2) {
    ctx.beginPath();
    ctx.moveTo(-20, y); ctx.lineTo(20, y);
    ctx.stroke();
  }
  for (let x = -16; x < 16; x += 2) {
    ctx.beginPath();
    ctx.moveTo(x, -8); ctx.lineTo(x, 14);
    ctx.stroke();
  }
  // Hat (wide brim) on top
  ctx.fillStyle = "#f0d068";
  ctx.beginPath();
  ctx.ellipse(0, -16, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4a08"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, -20);
  ctx.bezierCurveTo(-12, -28, 12, -28, 12, -20);
  ctx.lineTo(-12, -20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Bee on shoulder
  ctx.fillStyle = "#3a2200";
  ctx.beginPath();
  ctx.ellipse(-22, 14, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8d040";
  ctx.fillRect(-23.5, 13, 3, 2);
  // Wings
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(-23, 12, 1.6, 1, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-21, 12, 1.6, 1, 0.3, 0, Math.PI * 2); ctx.fill();
  // Trail
  ctx.strokeStyle = "rgba(248,208,64,0.7)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(-22, 14);
  ctx.bezierCurveTo(-12, 18, -4, 22, 4, 18);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCanaryWorker(ctx) {
  // Canary — Hazard Spotter, with bird on shoulder
  drawAvatarFrame(ctx, { bg: "#fff5c0", border: "#f5c842" });
  drawShoulders(ctx, "#5a4a3a", "#2a1c10");
  drawHead(ctx, { skin: "#e8c098", outline: "#3a2010" });
  // Hard hat dome (yellow)
  ctx.fillStyle = "#f5c842";
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.bezierCurveTo(-14, -28, 14, -28, 14, -14);
  ctx.lineTo(-14, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3a08"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#d49018";
  ctx.fillRect(-17, -14, 34, 3);
  ctx.strokeStyle = "#5a3a08"; ctx.lineWidth = 1.2;
  ctx.strokeRect(-17, -14, 34, 3);
  // Canary on shoulder
  ctx.fillStyle = "#f8e040";
  ctx.beginPath();
  ctx.ellipse(-20, 12, 6, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a87808"; ctx.lineWidth = 1; ctx.stroke();
  // Bird beak
  ctx.fillStyle = "#e89020";
  ctx.beginPath();
  ctx.moveTo(-25, 12); ctx.lineTo(-28, 13); ctx.lineTo(-25, 14);
  ctx.closePath(); ctx.fill();
  // Bird eye
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath(); ctx.arc(-22, 11, 0.6, 0, Math.PI * 2); ctx.fill();
  // Wing
  ctx.fillStyle = "#d49018";
  ctx.beginPath();
  ctx.ellipse(-19, 12, 2.4, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawGeologist(ctx) {
  // Geologist — Surveyor, monocle and clipboard
  drawAvatarFrame(ctx, { bg: "#e8d8c0", border: "#8a6a3a" });
  drawShoulders(ctx, "#8a6a3a", "#3a2410");
  drawHead(ctx, { skin: "#f0c898", outline: "#3a2010" });
  // Greying hair
  ctx.fillStyle = "#a89878";
  ctx.beginPath();
  ctx.moveTo(-13, -14);
  ctx.bezierCurveTo(-13, -22, 13, -22, 13, -14);
  ctx.bezierCurveTo(8, -18, -8, -18, -13, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a4828"; ctx.lineWidth = 1; ctx.stroke();
  // Monocle on right eye
  ctx.strokeStyle = "#a87838";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(4.5, -6, 4, 0, Math.PI * 2);
  ctx.stroke();
  // Monocle chain
  ctx.beginPath();
  ctx.moveTo(8, -4); ctx.lineTo(14, 4);
  ctx.stroke();
  // Glass shine
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(4.5, -6, 3, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  // Mustache
  ctx.fillStyle = "#7a6a48";
  ctx.beginPath();
  ctx.moveTo(-7, -1); ctx.quadraticCurveTo(0, -3, 7, -1); ctx.quadraticCurveTo(2, 1, -2, 1); ctx.quadraticCurveTo(-4, 1, -7, -1);
  ctx.closePath(); ctx.fill();
  // Clipboard on shoulder
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-26, 8, 12, 16);
  ctx.fillStyle = "#fffae0";
  ctx.fillRect(-25, 11, 10, 12);
  ctx.strokeStyle = "rgba(120,90,40,0.7)";
  ctx.lineWidth = 0.8;
  for (let y = 13; y <= 22; y += 2) {
    ctx.beginPath();
    ctx.moveTo(-24, y); ctx.lineTo(-16, y);
    ctx.stroke();
  }
  // Clip
  ctx.fillStyle = "#5a6066";
  ctx.fillRect(-22, 7, 6, 3);
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
  // DEPRECATED — these `char_*` portraits (and their draw* fns below) were used
  // by the old features/apprentices/ named-worker roster, which was removed in
  // Phase 0. Nothing references `char_<workerId>` anymore; they're baked into
  // the Phaser texture cache but never drawn. TODO: prune the lot (entries +
  // the matching drawHilda/… functions) in a focused follow-up. The 5 named-NPC
  // portraits above (char_mira … char_wren) stay.
  char_hilda:    { label:"Hilda",     color:"#4f8c3a", draw:drawHilda },
  char_pip:      { label:"Pip",       color:"#7dc45a", draw:drawPip },
  char_wila:     { label:"Wila",      color:"#c8923a", draw:drawWila },
  char_tuck:     { label:"Tuck",      color:"#3a6a9a", draw:drawTuck },
  char_osric:    { label:"Osric",     color:"#3a3a3a", draw:drawOsric },
  char_dren:     { label:"Dren",      color:"#7a8490", draw:drawDren },
  char_brenna:   { label:"Brenna",    color:"#7a9a3a", draw:drawBrenna },
  char_fenna:    { label:"Fenna",     color:"#c84a3a", draw:drawFenna },
  char_garrick:  { label:"Garrick",   color:"#a86838", draw:drawGarrick },
  char_elsa:     { label:"Elsa",      color:"#8aa6c4", draw:drawElsa },
  char_rusk:     { label:"Rusk",      color:"#a85a3a", draw:drawRusk },
  char_tilda:    { label:"Tilda",     color:"#c8923a", draw:drawTilda },
  char_marin:    { label:"Marin",     color:"#7eb83a", draw:drawMarin },
  char_annek:    { label:"Annek",     color:"#c84a3a", draw:drawAnnek },
  char_ren:      { label:"Ren",       color:"#5a7a3a", draw:drawRen },
  char_ivar:     { label:"Ivar",      color:"#e8a020", draw:drawIvar },
  char_canary:   { label:"Canary",    color:"#f5c842", draw:drawCanaryWorker },
  char_geologist:{ label:"Geologist", color:"#8a6a3a", draw:drawGeologist },
  // Bosses
  boss_frostmaw:      { label:"Frostmaw",      color:"#3a82c4", draw:drawFrostmaw },
  boss_quagmire:      { label:"Quagmire",      color:"#5a8028", draw:drawQuagmire },
  boss_ember_drake:   { label:"Ember Drake",   color:"#c84818", draw:drawEmberDrake },
  boss_old_stoneface: { label:"Old Stoneface", color:"#5a4a3a", draw:drawOldStoneface },
  boss_mossback:      { label:"Mossback",      color:"#3a6018", draw:drawMossback },
};
