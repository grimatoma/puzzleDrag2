// Quest category icons — parchment scrolls with a wax seal and a small
// inset motif representing the quest category (collect / craft / order /
// tool / chain). Drawn at canvas origin (0,0) inside a ~64×64 design box.

function drawShadow(ctx, w = 18, h = 3.5) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 20, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Parchment body + two end rolls. `accent` tints the wax seal.
function drawScroll(ctx) {
  // Top + bottom roll shadows (drawn first, behind the paper)
  const roll = ctx.createLinearGradient(-16, 0, 16, 0);
  roll.addColorStop(0, "#7a4818");
  roll.addColorStop(0.5, "#c08850");
  roll.addColorStop(1, "#5a3008");

  // Bottom roll
  ctx.fillStyle = roll;
  ctx.beginPath();
  ctx.ellipse(0, 11, 16, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // bottom roll end-caps
  ctx.fillStyle = "#5a3008";
  ctx.beginPath();
  ctx.ellipse(-16, 11, 1.6, 3.5, 0, 0, Math.PI * 2);
  ctx.ellipse(16, 11, 1.6, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top roll
  ctx.fillStyle = roll;
  ctx.beginPath();
  ctx.ellipse(0, -11, 16, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#5a3008";
  ctx.beginPath();
  ctx.ellipse(-16, -11, 1.6, 3.5, 0, 0, Math.PI * 2);
  ctx.ellipse(16, -11, 1.6, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Paper body
  const paper = ctx.createLinearGradient(0, -11, 0, 11);
  paper.addColorStop(0, "#fbf2d4");
  paper.addColorStop(0.5, "#f0d99a");
  paper.addColorStop(1, "#d8b870");
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.moveTo(-15, -11);
  ctx.lineTo(15, -11);
  ctx.lineTo(15, 11);
  ctx.lineTo(-15, 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Slight curl shading at sides
  ctx.fillStyle = "rgba(122,72,24,0.18)";
  ctx.fillRect(-15, -11, 2, 22);
  ctx.fillRect(13, -11, 2, 22);

  // Faint ink lines (writing)
  ctx.strokeStyle = "rgba(90,48,8,0.45)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-10, -6); ctx.lineTo(10, -6);
  ctx.moveTo(-10, -3); ctx.lineTo(7, -3);
  ctx.moveTo(-10, 0); ctx.lineTo(9, 0);
  ctx.moveTo(-10, 3); ctx.lineTo(6, 3);
  ctx.stroke();

  // Top sheen
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-2, -10, 6, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Red wax seal in the bottom-right corner.
function drawSeal(ctx) {
  // ribbon under seal
  ctx.fillStyle = "#7a1818";
  ctx.beginPath();
  ctx.moveTo(8, 6);
  ctx.lineTo(13, 16);
  ctx.lineTo(10, 14);
  ctx.lineTo(8, 12);
  ctx.closePath();
  ctx.fill();

  // wax body
  const wax = ctx.createRadialGradient(7, 4, 1, 9, 6, 7);
  wax.addColorStop(0, "#f86848");
  wax.addColorStop(0.55, "#c82820");
  wax.addColorStop(1, "#5a0808");
  ctx.fillStyle = wax;
  ctx.beginPath();
  // jagged starburst-ish blob
  const pts = [
    [9, 0], [12, 2], [13, 5], [12, 8], [9, 10], [7, 11],
    [4, 10], [2, 8], [1, 5], [3, 2], [6, 1],
  ];
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1;
  ctx.stroke();

  // imprint star
  ctx.fillStyle = "rgba(58,4,8,0.7)";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 3 : 1.2;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(7 + Math.cos(a) * r, 6 + Math.sin(a) * r);
    else ctx.lineTo(7 + Math.cos(a) * r, 6 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();

  // shine
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(5, 3, 1.6, 0.8, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

// `motif(ctx)` paints the category glyph centered at (-3, -1) in a ~14px
// well, leaving the bottom-right for the wax seal.
function makeQuest(label, color, motif) {
  return {
    label, color,
    draw(ctx) {
      drawShadow(ctx);
      drawScroll(ctx);
      ctx.save();
      ctx.translate(-3, -1);
      motif(ctx);
      ctx.restore();
      drawSeal(ctx);
    },
  };
}

// ── Category motifs ───────────────────────────────────────────────────────

// Collect — woven basket overflowing with goods.
function motifBasket(ctx) {
  // body
  const body = ctx.createLinearGradient(0, -2, 0, 6);
  body.addColorStop(0, "#d8a060");
  body.addColorStop(1, "#7a4818");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(6, 0);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  ctx.stroke();
  // weave
  ctx.strokeStyle = "rgba(58,28,8,0.7)";
  ctx.lineWidth = 0.5;
  for (let y = 1.5; y <= 5; y += 1.5) {
    ctx.beginPath();
    ctx.moveTo(-5.5, y); ctx.lineTo(5.5, y);
    ctx.stroke();
  }
  for (let x = -4; x <= 4; x += 2) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x - 0.5, 6);
    ctx.stroke();
  }
  // handle
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 5, Math.PI + 0.3, -0.3);
  ctx.stroke();
  // grain/wheat poking out
  ctx.fillStyle = "#e0a020";
  ctx.beginPath();
  ctx.ellipse(-3, -2, 1, 2.4, -0.3, 0, Math.PI * 2);
  ctx.ellipse(0, -3, 1, 2.6, 0, 0, Math.PI * 2);
  ctx.ellipse(3, -2, 1, 2.4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // red berry/apple
  ctx.fillStyle = "#c83028";
  ctx.beginPath();
  ctx.arc(2, -1, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a0808";
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

// Craft — anvil with a hammer resting on it.
function motifAnvilHammer(ctx) {
  // anvil base
  ctx.fillStyle = "#3a3e44";
  ctx.beginPath();
  ctx.rect(-3, 4, 6, 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0e12";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // anvil body
  const anvil = ctx.createLinearGradient(0, -2, 0, 4);
  anvil.addColorStop(0, "#9aa4ac");
  anvil.addColorStop(1, "#3a3e44");
  ctx.fillStyle = anvil;
  ctx.beginPath();
  ctx.moveTo(-7, -1);
  ctx.lineTo(7, -1);
  ctx.lineTo(5, 2);
  ctx.lineTo(-5, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0e12";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = anvil;
  ctx.fillRect(-2, 2, 4, 2);
  ctx.strokeRect(-2, 2, 4, 2);
  // horn
  ctx.fillStyle = "#7a8088";
  ctx.beginPath();
  ctx.moveTo(7, -1);
  ctx.lineTo(10, -0.5);
  ctx.lineTo(7, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // hammer
  ctx.save();
  ctx.translate(0, -3);
  ctx.rotate(-0.4);
  // handle
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, 4); ctx.lineTo(3, -4);
  ctx.stroke();
  // head
  ctx.fillStyle = "#9aa4ac";
  ctx.beginPath();
  ctx.rect(2, -7, 5, 4);
  ctx.fill();
  ctx.strokeStyle = "#0a0e12";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
  // sparks
  ctx.fillStyle = "#ffd860";
  [[3, -3], [-2, -4], [5, -1]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Order — delivery satchel with a tag.
function motifSatchel(ctx) {
  // strap
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 6, Math.PI + 0.2, -0.2);
  ctx.stroke();
  // body
  const body = ctx.createLinearGradient(0, -2, 0, 6);
  body.addColorStop(0, "#a86838");
  body.addColorStop(1, "#5a2810");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(6, -2);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1004";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // flap
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(6, -2);
  ctx.lineTo(4, 2);
  ctx.lineTo(-4, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // buckle
  ctx.fillStyle = "#f0c040";
  ctx.fillRect(-1, 1, 2, 1.6);
  ctx.strokeStyle = "#3a1c00";
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-1, 1, 2, 1.6);
  // tag
  ctx.fillStyle = "#fbf2d4";
  ctx.beginPath();
  ctx.moveTo(-7, 5);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-4, 8);
  ctx.lineTo(-7, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,48,8,0.7)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-6.5, 5.8); ctx.lineTo(-4.5, 5.4);
  ctx.moveTo(-6.5, 6.6); ctx.lineTo(-4.5, 6.2);
  ctx.stroke();
}

// Tool — a wrench/scythe-ish toolset (gear + tool head).
function motifTool(ctx) {
  // background gear
  ctx.fillStyle = "#7a8088";
  const teeth = 8;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = (i * Math.PI * 2) / teeth;
    const r = i % 2 === 0 ? 5.5 : 3.5;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r + 0.5);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + 0.5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0e12";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#3a3e44";
  ctx.beginPath();
  ctx.arc(0, 0.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // scythe overlay
  ctx.save();
  ctx.translate(2, 0);
  ctx.rotate(-0.7);
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 6); ctx.lineTo(2, -5);
  ctx.stroke();
  // blade
  ctx.fillStyle = "#dadfe6";
  ctx.beginPath();
  ctx.moveTo(2, -5);
  ctx.quadraticCurveTo(7, -6, 8, -2);
  ctx.quadraticCurveTo(5, -3, 2, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3e44";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

// Chain — three connected sparkly links representing chain-length goals.
function motifChainPlus(ctx) {
  ctx.strokeStyle = "#3a1c04";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  // chain links
  ctx.save();
  ctx.translate(-4, 0);
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.8, 1.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#e0a020"; ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(0, 0);
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.8, 1.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#f0c040"; ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(4, 0);
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.8, 1.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fff0a0"; ctx.fill();
  ctx.stroke();
  ctx.restore();
  // sparkle
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(6, -5);
  ctx.lineTo(7, -3);
  ctx.lineTo(9, -2);
  ctx.lineTo(7, -1);
  ctx.lineTo(6, 1);
  ctx.lineTo(5, -1);
  ctx.lineTo(3, -2);
  ctx.lineTo(5, -3);
  ctx.closePath();
  ctx.fill();
}

// Quest book — closed leather tome with a bookmark. Catch-all for the
// quests feature itself (button, tab, header).
function drawQuestBook(ctx) {
  drawShadow(ctx, 16, 3.5);
  // back cover
  ctx.fillStyle = "#3a1808";
  ctx.beginPath();
  ctx.moveTo(-12, -13);
  ctx.lineTo(12, -13);
  ctx.lineTo(14, 13);
  ctx.lineTo(-14, 13);
  ctx.closePath();
  ctx.fill();
  // pages edge
  ctx.fillStyle = "#fbf2d4";
  ctx.fillRect(-12, -11, 24, 22);
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 0.7;
  for (let y = -8; y < 11; y += 2) {
    ctx.beginPath();
    ctx.moveTo(11, y); ctx.lineTo(13, y);
    ctx.stroke();
  }
  // front cover
  const cover = ctx.createLinearGradient(-12, 0, 12, 0);
  cover.addColorStop(0, "#9a3828");
  cover.addColorStop(0.5, "#6a1808");
  cover.addColorStop(1, "#3a0808");
  ctx.fillStyle = cover;
  ctx.beginPath();
  ctx.moveTo(-11, -12);
  ctx.lineTo(11, -12);
  ctx.lineTo(12, 12);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0408";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // gold frame
  ctx.strokeStyle = "#e0a020";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-8, -9, 16, 18);
  // emblem (star)
  ctx.fillStyle = "#e0a020";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 4 : 1.6;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(0 + Math.cos(a) * r, 0 + Math.sin(a) * r);
    else ctx.lineTo(0 + Math.cos(a) * r, 0 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // bookmark
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.moveTo(6, -12);
  ctx.lineTo(9, -12);
  ctx.lineTo(9, 16);
  ctx.lineTo(7.5, 14);
  ctx.lineTo(6, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4808";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // gloss
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(-6, -8, 3, 1.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ── Registry ──────────────────────────────────────────────────────────────

export const ICONS = {
  quest_collect: makeQuest("Collect Quest", "#a8703a", motifBasket),
  quest_craft:   makeQuest("Craft Quest",   "#7a8088", motifAnvilHammer),
  quest_order:   makeQuest("Order Quest",   "#7a4818", motifSatchel),
  quest_tool:    makeQuest("Tool Quest",    "#dadfe6", motifTool),
  quest_chain:   makeQuest("Chain Quest",   "#e0a020", motifChainPlus),
  quest_book:    { label: "Quest Book", color: "#9a3828", draw: drawQuestBook },
};
