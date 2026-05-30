// Currencies, tokens, gems, heirlooms. Drawn at canvas origin (0,0)
// inside a ~64×64 design box.

function drawShadow(ctx, w = 14, h = 3) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 18, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Embers — the Coexist currency. A glowing live coal in a ring. ─────────
function drawEmbers(ctx) {
  drawShadow(ctx, 14, 3);
  // Outer halo
  const halo = ctx.createRadialGradient(0, 0, 3, 0, 0, 18);
  halo.addColorStop(0, "rgba(255,150,40,0.6)");
  halo.addColorStop(0.6, "rgba(214,97,42,0.2)");
  halo.addColorStop(1, "rgba(214,97,42,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  // Charred outer band
  ctx.fillStyle = "#2a0c04";
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0404";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Cracked-ember texture (irregular lobes)
  const core = ctx.createRadialGradient(-2, -3, 1, 0, 0, 11);
  core.addColorStop(0, "#fffae0");
  core.addColorStop(0.25, "#ffd860");
  core.addColorStop(0.55, "#f08020");
  core.addColorStop(0.85, "#a82008");
  core.addColorStop(1, "#3a0408");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  // Internal cracks
  ctx.strokeStyle = "rgba(40,8,4,0.7)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-6, -3); ctx.lineTo(-1, 0); ctx.lineTo(-3, 5);
  ctx.moveTo(6, -2); ctx.lineTo(1, 1); ctx.lineTo(4, 6);
  ctx.moveTo(0, -8); ctx.lineTo(-1, -3);
  ctx.stroke();
  // White-hot center
  ctx.fillStyle = "rgba(255,250,200,0.85)";
  ctx.beginPath();
  ctx.ellipse(-1, -1, 2.4, 1.6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Rising sparks
  ctx.fillStyle = "#fff080";
  [[-6, -12, 1], [4, -14, 0.8], [-2, -16, 0.7]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── Core Ingot — the Drive-Out currency. A blue-cold metal bar. ───────────
function drawCoreIngot(ctx) {
  drawShadow(ctx, 16, 3);
  // Trapezoid bar (3/4 perspective)
  const top = ctx.createLinearGradient(0, -8, 0, -4);
  top.addColorStop(0, "#d8e0ec");
  top.addColorStop(1, "#5a78a8");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.lineTo(-10, -8);
  ctx.lineTo(10, -8);
  ctx.lineTo(13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a1c38";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Front face
  const front = ctx.createLinearGradient(0, -4, 0, 10);
  front.addColorStop(0, "#7aa0d8");
  front.addColorStop(0.5, "#2a4878");
  front.addColorStop(1, "#0a1c38");
  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.lineTo(13, -4);
  ctx.lineTo(11, 9);
  ctx.lineTo(-11, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a1c38";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Right face
  const right = ctx.createLinearGradient(10, 0, 16, 0);
  right.addColorStop(0, "#3a5a8a");
  right.addColorStop(1, "#0a1c38");
  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(13, -4);
  ctx.lineTo(15, -2);
  ctx.lineTo(13, 11);
  ctx.lineTo(11, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Engraved rune (cross)
  ctx.strokeStyle = "rgba(10,28,56,0.85)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3, 1); ctx.lineTo(3, 1);
  ctx.moveTo(0, -2); ctx.lineTo(0, 4);
  ctx.stroke();
  // Highlight gleam
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-4, -6, 4, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(216,224,236,0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, 1, 1, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cold mist underneath
  ctx.strokeStyle = "rgba(168,200,236,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, 12); ctx.quadraticCurveTo(-3, 14, 4, 12);
  ctx.quadraticCurveTo(8, 11, 12, 13);
  ctx.stroke();
}

// ── Gems — premium currency. Multi-faceted cluster. ───────────────────────
function drawGems(ctx) {
  drawShadow(ctx, 14, 3);
  // Background larger pink gem
  const pink = ctx.createLinearGradient(0, -10, 0, 10);
  pink.addColorStop(0, "#ffb8d8");
  pink.addColorStop(0.5, "#e85aa8");
  pink.addColorStop(1, "#7a1c58");
  ctx.fillStyle = pink;
  ctx.beginPath();
  ctx.moveTo(-4, -10);
  ctx.lineTo(6, -10);
  ctx.lineTo(11, -3);
  ctx.lineTo(1, 10);
  ctx.lineTo(-9, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0828";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // facet ridges
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-9, -3); ctx.lineTo(11, -3);
  ctx.moveTo(-4, -10); ctx.lineTo(1, 10);
  ctx.moveTo(6, -10); ctx.lineTo(1, 10);
  ctx.stroke();
  // Foreground smaller blue gem
  const blue = ctx.createLinearGradient(0, -6, 0, 8);
  blue.addColorStop(0, "#b8e0f8");
  blue.addColorStop(0.5, "#3a96d4");
  blue.addColorStop(1, "#0a3868");
  ctx.fillStyle = blue;
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.lineTo(4, -2);
  ctx.lineTo(7, 2);
  ctx.lineTo(1, 9);
  ctx.lineTo(-5, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#082848";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5, 2); ctx.lineTo(7, 2);
  ctx.moveTo(-2, -2); ctx.lineTo(1, 9);
  ctx.moveTo(4, -2); ctx.lineTo(1, 9);
  ctx.stroke();
  // Sparkles
  ctx.fillStyle = "#fff";
  [[-6, -8, 1.4], [8, 4, 1.2], [-8, 5, 1]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.3, y - r * 0.3);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.3, y + r * 0.3);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.3, y + r * 0.3);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.3, y - r * 0.3);
    ctx.closePath();
    ctx.fill();
  });
}

// ── Heirloom — a locket/pendant on a chain. Bond-arc reward. ──────────────
function drawHeirloom(ctx) {
  drawShadow(ctx, 12, 3);
  // Chain arc
  ctx.strokeStyle = "#c89030";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = -13; i <= -7; i += 1.5) {
    ctx.moveTo(i, -10 + (i + 13) * 0.4);
    ctx.lineTo(i + 1.5, -10 + (i + 13 + 1.5) * 0.4);
  }
  ctx.moveTo(-7, -7); ctx.lineTo(0, -10);
  ctx.moveTo(0, -10); ctx.lineTo(7, -7);
  for (let i = 7; i <= 13; i += 1.5) {
    ctx.moveTo(i, -7 + (i - 7) * 0.4);
    ctx.lineTo(i + 1.5, -7 + (i - 7 + 1.5) * 0.4);
  }
  ctx.stroke();
  // Bail (top loop)
  ctx.strokeStyle = "#7a5008";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -6, 2, Math.PI, 0);
  ctx.stroke();
  // Locket body
  const body = ctx.createRadialGradient(-3, -2, 1, 0, 0, 11);
  body.addColorStop(0, "#fff0a0");
  body.addColorStop(0.55, "#f0c040");
  body.addColorStop(1, "#7a5008");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(8, -4, 10, 4, 6, 8);
  ctx.bezierCurveTo(4, 11, -4, 11, -6, 8);
  ctx.bezierCurveTo(-10, 4, -8, -4, 0, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Engraved initial / heart
  ctx.fillStyle = "rgba(58,32,8,0.85)";
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-5, 2, -5, -2, -2, -2);
  ctx.bezierCurveTo(-1, -2, 0, -1, 0, 0);
  ctx.bezierCurveTo(0, -1, 1, -2, 2, -2);
  ctx.bezierCurveTo(5, -2, 5, 2, 0, 6);
  ctx.closePath();
  ctx.fill();
  // Specular
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-3, -1, 2, 0.9, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ── Hearth-Token frame: a wooden disc with biome motif at center. ─────────
function drawTokenFrame(ctx, ring1, ring2) {
  drawShadow(ctx, 14, 3);
  // outer wood disc
  const outer = ctx.createRadialGradient(-3, -3, 1, 0, 0, 14);
  outer.addColorStop(0, "#c08850");
  outer.addColorStop(0.6, "#7a4818");
  outer.addColorStop(1, "#3a1c08");
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // wood-grain rings
  ctx.strokeStyle = "rgba(40,16,4,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(-1, 0, 9, 0, Math.PI * 2);
  ctx.arc(0, -1, 11, 0, Math.PI * 2);
  ctx.stroke();
  // inner ring — biome accent
  ctx.fillStyle = ring1;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ring2;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // four notch pegs at compass points
  ctx.fillStyle = "#1a0a04";
  [[-13, 0], [13, 0], [0, -13], [0, 13]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // outer rim sheen
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 12, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
}

function drawHearthTokenForest(ctx) {
  drawTokenFrame(ctx, "#4f8c3a", "#1a3808");
  // Antler motif — two simplified deer antlers branching up
  ctx.strokeStyle = "#fbf2d4";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  // left antler
  ctx.moveTo(-1, 4);
  ctx.lineTo(-3, -2);
  ctx.lineTo(-6, -5);
  ctx.moveTo(-3, -2);
  ctx.lineTo(-1, -4);
  ctx.moveTo(-3, -2);
  ctx.lineTo(-5, 0);
  // right antler
  ctx.moveTo(1, 4);
  ctx.lineTo(3, -2);
  ctx.lineTo(6, -5);
  ctx.moveTo(3, -2);
  ctx.lineTo(1, -4);
  ctx.moveTo(3, -2);
  ctx.lineTo(5, 0);
  ctx.stroke();
  // base notch
  ctx.fillStyle = "#fbf2d4";
  ctx.beginPath();
  ctx.arc(0, 4, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawHearthTokenStone(ctx) {
  drawTokenFrame(ctx, "#7a8088", "#1a2028");
  // Stack of three rounded stones
  ctx.fillStyle = "#dadfe6";
  ctx.beginPath();
  ctx.ellipse(0, 5, 6, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a2028";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#bcc4ca";
  ctx.beginPath();
  ctx.ellipse(-1, 1, 5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#dadfe6";
  ctx.beginPath();
  ctx.ellipse(1, -3, 4, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // top pebble
  ctx.fillStyle = "#fafafa";
  ctx.beginPath();
  ctx.arc(0, -6, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // tiny moss on side
  ctx.fillStyle = "#4f8c3a";
  ctx.beginPath();
  ctx.arc(-4, 4, 0.8, 0, Math.PI * 2);
  ctx.arc(3, 1, 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawHearthTokenTide(ctx) {
  drawTokenFrame(ctx, "#3a96d4", "#0a3868");
  // Triple wave with foam crest
  ctx.strokeStyle = "#fbf2d4";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 3);
  ctx.bezierCurveTo(-3, 0, 0, 6, 3, 3);
  ctx.bezierCurveTo(5, 1, 6, 4, 6, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -1);
  ctx.bezierCurveTo(-3, -4, 0, 2, 3, -1);
  ctx.bezierCurveTo(5, -3, 6, 0, 6, -1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.bezierCurveTo(-3, -8, 0, -2, 3, -5);
  ctx.bezierCurveTo(5, -7, 6, -4, 6, -5);
  ctx.stroke();
  // droplet at center
  ctx.fillStyle = "#fbf2d4";
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-1.4, 6.4, -1.4, 7.6, 0, 8);
  ctx.bezierCurveTo(1.4, 7.6, 1.4, 6.4, 0, 5);
  ctx.closePath();
  ctx.fill();
}

// ── Golden Coin — a treasure board tile. A struck gold coin, face-on. ─────
function drawGoldenCoin(ctx) {
  drawShadow(ctx, 14, 3);
  // Outer rim
  const rim = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
  rim.addColorStop(0, "#fff1a8");
  rim.addColorStop(0.55, "#f0b81c");
  rim.addColorStop(1, "#8a5a0c");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5e3c06";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Reeded edge ticks
  ctx.strokeStyle = "rgba(94,60,6,0.55)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 11.5, Math.sin(a) * 11.5);
    ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
    ctx.stroke();
  }
  // Inner face
  const face = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
  face.addColorStop(0, "#ffe27a");
  face.addColorStop(0.6, "#f4c430");
  face.addColorStop(1, "#b8860b");
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(94,60,6,0.7)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Embossed coin mark — a struck star/sun motif
  ctx.fillStyle = "rgba(94,60,6,0.8)";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 6 : 2.6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  // Center pip
  ctx.fillStyle = "#fff1a8";
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Specular gleam
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 3.2, 1.3, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

export const ICONS = {
  tile_coin_golden:     { label: "Golden Coin",      color: "#f4c430", draw: drawGoldenCoin },
  cur_embers:           { label: "Embers",           color: "#d6612a", draw: drawEmbers },
  cur_core_ingot:       { label: "Core Ingot",       color: "#2a4878", draw: drawCoreIngot },
  cur_gems:             { label: "Gems",             color: "#e85aa8", draw: drawGems },
  cur_heirloom:         { label: "Heirloom",         color: "#e0a020", draw: drawHeirloom },
  token_hearth_forest:  { label: "Hearth-Token · Forest", color: "#4f8c3a", draw: drawHearthTokenForest },
  token_hearth_stone:   { label: "Hearth-Token · Stone",  color: "#7a8088", draw: drawHearthTokenStone },
  token_hearth_tide:    { label: "Hearth-Token · Tide",   color: "#3a96d4", draw: drawHearthTokenTide },
};
