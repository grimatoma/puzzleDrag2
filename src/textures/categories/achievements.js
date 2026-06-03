// Achievement badges — circular medallions with a ribbon tail and a small
// inset motif. Three tiers (bronze / silver / gold) share one frame so the
// set reads as a single family. Drawn at canvas origin (0,0) inside a ~64×64
// design box, matching the rest of the icon library.

const TIER = {
  bronze: {
    rimHi: "#f0b078", rimMid: "#b46a2c", rimLo: "#5a2808",
    faceHi: "#f8c898", faceMid: "#c08858", faceLo: "#5a3008",
    ribbonHi: "#a83828", ribbonMid: "#7a1c10", ribbonLo: "#3a0808",
    pip: "#fff0d8", pipCount: 1,
  },
  silver: {
    rimHi: "#fafcff", rimMid: "#9aa4ac", rimLo: "#3a3e44",
    faceHi: "#f0f4f8", faceMid: "#a8b0b8", faceLo: "#5a6068",
    ribbonHi: "#5a78a8", ribbonMid: "#2a4878", ribbonLo: "#0a1c38",
    pip: "#ffffff", pipCount: 2,
  },
  gold: {
    rimHi: "#fff0a0", rimMid: "#e0a020", rimLo: "#6a3808",
    faceHi: "#fff4b8", faceMid: "#f0c040", faceLo: "#8a5008",
    ribbonHi: "#c83038", ribbonMid: "#8a1018", ribbonLo: "#3a0408",
    pip: "#fff8d0", pipCount: 3,
  },
};

function drawShadow(ctx, w = 16, h = 3.5) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Two-tail ribbon below the medallion. Drawn first so the medallion
// overlaps it cleanly.
function drawRibbon(ctx, t) {
  const grad = ctx.createLinearGradient(0, 6, 0, 22);
  grad.addColorStop(0, t.ribbonHi);
  grad.addColorStop(0.5, t.ribbonMid);
  grad.addColorStop(1, t.ribbonLo);
  ctx.fillStyle = grad;
  // left tail
  ctx.beginPath();
  ctx.moveTo(-9, 6);
  ctx.lineTo(-13, 20);
  ctx.lineTo(-7, 17);
  ctx.lineTo(-3, 10);
  ctx.closePath();
  ctx.fill();
  // right tail
  ctx.beginPath();
  ctx.moveTo(9, 6);
  ctx.lineTo(13, 20);
  ctx.lineTo(7, 17);
  ctx.lineTo(3, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.ribbonLo;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-9, 6); ctx.lineTo(-13, 20); ctx.lineTo(-7, 17); ctx.lineTo(-3, 10);
  ctx.moveTo(9, 6); ctx.lineTo(13, 20); ctx.lineTo(7, 17); ctx.lineTo(3, 10);
  ctx.stroke();
  // Notch shadow where the medallion overlaps
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Tier "pips" — tiny stars set around the rim. Count = tier rank.
function drawPips(ctx, t) {
  const r = 12.5;
  const positions = t.pipCount === 1
    ? [-Math.PI / 2]
    : t.pipCount === 2
    ? [-Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55]
    : [-Math.PI / 2 - 1.0, -Math.PI / 2, -Math.PI / 2 + 1.0];
  ctx.fillStyle = t.pip;
  for (const a of positions) {
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    // tiny 4-pointed star
    ctx.beginPath();
    ctx.moveTo(x, y - 1.6);
    ctx.lineTo(x + 0.5, y - 0.5);
    ctx.lineTo(x + 1.6, y);
    ctx.lineTo(x + 0.5, y + 0.5);
    ctx.lineTo(x, y + 1.6);
    ctx.lineTo(x - 0.5, y + 0.5);
    ctx.lineTo(x - 1.6, y);
    ctx.lineTo(x - 0.5, y - 0.5);
    ctx.closePath();
    ctx.fill();
  }
}

// Medallion: outer rim → inner face → bevel highlight.
function drawMedallion(ctx, t) {
  // Outer rim
  const rim = ctx.createLinearGradient(0, -14, 0, 14);
  rim.addColorStop(0, t.rimHi);
  rim.addColorStop(0.5, t.rimMid);
  rim.addColorStop(1, t.rimLo);
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.rimLo;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Inner face
  const face = ctx.createRadialGradient(-3, -4, 1, 0, 0, 13);
  face.addColorStop(0, t.faceHi);
  face.addColorStop(0.55, t.faceMid);
  face.addColorStop(1, t.faceLo);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.rimLo;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  drawPips(ctx, t);

  // Top-left specular highlight on rim
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 13, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
}

// Glossy sheen on top of the medallion face. Call last.
function drawSheen(ctx) {
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-3, -6, 5, 1.6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(2, 7, 4, 1, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

// `motif` is a function (ctx, t) → draws the central glyph inside a ~16px
// well centered at (0,0). Use `t.motifInk` for the dark stroke/fill and the
// medallion face colors for any fills.
function makeAchievement(label, color, tierKey, motif) {
  return {
    label,
    color,
    draw(ctx) {
      const t = { ...TIER[tierKey] };
      // Ink color chosen to read on each tier's face
      t.motifInk = tierKey === "silver" ? "#1a2030" : "#3a1c04";
      t.motifInkSoft = tierKey === "silver" ? "#5a6478" : "#7a4a18";
      drawShadow(ctx);
      drawRibbon(ctx, t);
      drawMedallion(ctx, t);
      ctx.save();
      motif(ctx, t);
      ctx.restore();
      drawSheen(ctx);
    },
  };
}

// ── Motif primitives ──────────────────────────────────────────────────────

function motifChain(ctx, t) {
  // Two interlocking oval links, clearly offset so they read as a chain.
  ctx.lineCap = "round";
  // Back link (drawn first, sits behind)
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(-3.2, -2.6, 3.4, 2.2, -0.5, 0, Math.PI * 2);
  ctx.stroke();
  // Front link, overlapping the back one's lower-right
  ctx.beginPath();
  ctx.ellipse(3.2, 2.6, 3.4, 2.2, -0.5, 0, Math.PI * 2);
  ctx.stroke();
  // Re-stroke the front link's overlap edge so it reads as "in front"
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(3.2, 2.6, 3.4, 2.2, -0.5, Math.PI * 0.55, Math.PI * 1.55);
  ctx.stroke();
  // Top-left sheen on each link
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(-3.2, -3.1, 2.4, 1.3, -0.5, Math.PI * 0.9, Math.PI * 1.7);
  ctx.ellipse(3.2, 2.1, 2.4, 1.3, -0.5, Math.PI * 0.9, Math.PI * 1.7);
  ctx.stroke();
}

function motifHandshake(ctx, t) {
  // Two forearms angling in to a clasped grip in the centre.
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // left forearm (sleeve thick stroke + skin tip)
  ctx.strokeStyle = "#8a5828";
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(-8, 5); ctx.lineTo(-2.5, 0.5);
  ctx.stroke();
  // right forearm
  ctx.beginPath();
  ctx.moveTo(8, 5); ctx.lineTo(2.5, 0.5);
  ctx.stroke();
  // clasped hands — interlocked rounded block in the middle, tilted so the
  // two hands read as gripping rather than as a mouth.
  ctx.fillStyle = "#e8b888";
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4.5, 2.2);
  ctx.bezierCurveTo(-3.5, -2, 1, -3.2, 4.5, -1.2);
  ctx.bezierCurveTo(3.5, 3, -1, 4.2, -4.5, 2.2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // knuckle/finger seams across the grip (reads as interlocked fingers)
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, -1.4); ctx.lineTo(-1.4, 1.8);
  ctx.moveTo(0, -2); ctx.lineTo(0.6, 1.4);
  ctx.moveTo(2, -2); ctx.lineTo(2.6, 0.8);
  ctx.stroke();
  // top-left sheen on the upper hand
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-1, -1.6, 1.6, 0.6, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function motifSword(ctx, t) {
  // Single sword
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(2, -5);
  ctx.lineTo(2, 4);
  ctx.lineTo(-2, 4);
  ctx.lineTo(-2, -5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = t.motifInk;
  ctx.fillRect(-4, 4, 8, 1.6);
  ctx.fillRect(-1, 5.6, 2, 3);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(-0.5, -7, 0.8, 10);
}

function motifCrossedSwords(ctx, t) {
  ctx.save();
  ctx.rotate(-Math.PI / 4);
  motifSword(ctx, t);
  ctx.restore();
  ctx.save();
  ctx.rotate(Math.PI / 4);
  motifSword(ctx, t);
  ctx.restore();
}

function motifLeaf(ctx, t) {
  ctx.fillStyle = "#3a7a28";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.bezierCurveTo(7, -5, 7, 5, 0, 7);
  ctx.bezierCurveTo(-7, 5, -7, -5, 0, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "#1a3808";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(0, 7);
  ctx.moveTo(0, -3); ctx.lineTo(3, -1);
  ctx.moveTo(0, -3); ctx.lineTo(-3, -1);
  ctx.moveTo(0, 1); ctx.lineTo(3, 3);
  ctx.moveTo(0, 1); ctx.lineTo(-3, 3);
  ctx.stroke();
}

function motifTriLeaf(ctx, t) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / 3);
    ctx.translate(0, -3);
    ctx.scale(0.55, 0.55);
    motifLeaf(ctx, t);
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function motifCompass(ctx, t) {
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.6;
  // legs
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(-5, 5);
  ctx.moveTo(0, -6); ctx.lineTo(5, 5);
  ctx.stroke();
  // pivot
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.arc(0, -6, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // tips
  ctx.beginPath();
  ctx.arc(-5, 5, 1, 0, Math.PI * 2);
  ctx.arc(5, 5, 1, 0, Math.PI * 2);
  ctx.fill();
  // arc
  ctx.strokeStyle = t.motifInkSoft;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(0, -2, 6, 0.5, Math.PI - 0.5);
  ctx.stroke();
}

function motifSack(ctx, t) {
  // burlap sack
  const grad = ctx.createLinearGradient(0, -5, 0, 7);
  grad.addColorStop(0, "#d8b078");
  grad.addColorStop(1, "#7a4818");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-5, -4);
  ctx.lineTo(5, -4);
  ctx.bezierCurveTo(8, 0, 7, 7, 0, 7);
  ctx.bezierCurveTo(-7, 7, -8, 0, -5, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // tie
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-5, -3); ctx.lineTo(5, -3);
  ctx.stroke();
  // gather creases on the body
  ctx.strokeStyle = "rgba(58,16,4,0.5)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.lineTo(-2.2, 5);
  ctx.moveTo(0, 0); ctx.lineTo(0, 6);
  ctx.moveTo(3, 0); ctx.lineTo(2.2, 5);
  ctx.stroke();
  // coin badge on the side (drawn, not a glyph)
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.arc(0, 2.4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(-0.6, 1.8, 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function motifFish(ctx, t) {
  // Side-view fish
  ctx.fillStyle = "#5a96c8";
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.bezierCurveTo(-4, -4, 4, -4, 6, 0);
  ctx.bezierCurveTo(4, 4, -4, 4, -6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // tail
  ctx.fillStyle = "#3a78b0";
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.lineTo(-9, -3); ctx.lineTo(-9, 3);
  ctx.closePath(); ctx.fill();
  ctx.stroke();
  // eye
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.arc(3.5, -0.5, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // belly highlight
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 3, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function motifPickaxe(ctx, t) {
  // head
  ctx.fillStyle = "#9aa4ac";
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.quadraticCurveTo(0, -7, 8, -4);
  ctx.lineTo(6, -1);
  ctx.quadraticCurveTo(0, -3, -6, -1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // shaft
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -3); ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -3); ctx.lineTo(0, 7);
  ctx.stroke();
}

function motifCarrot(ctx, t) {
  // tops
  ctx.fillStyle = "#4f8c3a";
  ctx.beginPath();
  ctx.moveTo(-4, -4); ctx.lineTo(-2, -7); ctx.lineTo(0, -4); ctx.closePath();
  ctx.moveTo(-2, -3); ctx.lineTo(0, -8); ctx.lineTo(2, -3); ctx.closePath();
  ctx.moveTo(0, -4); ctx.lineTo(2, -7); ctx.lineTo(4, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a4a18";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // root
  const grad = ctx.createLinearGradient(0, -3, 0, 7);
  grad.addColorStop(0, "#f08840"); grad.addColorStop(1, "#a04810");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-4, -3); ctx.lineTo(4, -3);
  ctx.lineTo(1, 7); ctx.lineTo(-1, 7); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // rings
  ctx.strokeStyle = "rgba(58,16,4,0.55)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-3.2, -0.5); ctx.lineTo(3.2, -0.5);
  ctx.moveTo(-2.4, 2); ctx.lineTo(2.4, 2);
  ctx.moveTo(-1.6, 4.4); ctx.lineTo(1.6, 4.4);
  ctx.stroke();
}

function motifApple(ctx, t) {
  // stem
  ctx.strokeStyle = "#5a3818";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(1, -8);
  ctx.stroke();
  // leaf
  ctx.fillStyle = "#4f8c3a";
  ctx.beginPath();
  ctx.ellipse(3, -7, 2, 1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // body
  const grad = ctx.createRadialGradient(-2, -3, 1, 0, 0, 8);
  grad.addColorStop(0, "#f08070"); grad.addColorStop(0.6, "#c83028"); grad.addColorStop(1, "#6a0808");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(7, -6, 7, 6, 0, 7);
  ctx.bezierCurveTo(-7, 6, -7, -6, 0, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // gloss
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-3, -3, 1.6, 0.8, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function motifFlower(ctx, t) {
  ctx.fillStyle = "#e85aa8";
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 3.5, Math.sin(a) * 3.5, 2.6, 2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 3.5, Math.sin(a) * 3.5, 2.6, 2, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  // center
  ctx.fillStyle = "#f8c020";
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.9;
  ctx.stroke();
}

function motifSheep(ctx, t) {
  // wool body
  ctx.fillStyle = "#f6efe0";
  const woolPts = [[-5, 0], [-3, -3], [0, -4], [3, -3], [5, 0], [3, 3], [-3, 3]];
  for (const [x, y] of woolPts) {
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1;
  for (const [x, y] of woolPts) {
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  // head
  ctx.fillStyle = "#3a2818";
  ctx.beginPath();
  ctx.ellipse(6, 0, 2.4, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(7, -0.3, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function motifCow(ctx, t) {
  // body
  ctx.fillStyle = "#fafafa";
  ctx.beginPath();
  ctx.ellipse(-1, 1, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // spots
  ctx.fillStyle = "#2a1408";
  ctx.beginPath();
  ctx.arc(-3, 1, 1.4, 0, Math.PI * 2);
  ctx.arc(-1, -1, 0.9, 0, Math.PI * 2);
  ctx.arc(2, 2, 1, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.fillStyle = "#fafafa";
  ctx.beginPath();
  ctx.ellipse(6, -1, 2.4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // horns
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(5, -3); ctx.lineTo(4, -5);
  ctx.moveTo(7, -3); ctx.lineTo(8, -5);
  ctx.stroke();
  // eye
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.arc(7, -1, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function motifHorse(ctx, t) {
  // Side-profile horse head
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(-3, -7);
  ctx.bezierCurveTo(3, -7, 6, -4, 6, -1);
  ctx.lineTo(7, 5);
  ctx.lineTo(3, 5);
  ctx.lineTo(2, 0);
  ctx.bezierCurveTo(-2, 0, -5, -2, -5, -4);
  ctx.lineTo(-3, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // mane
  ctx.fillStyle = "#2a1408";
  ctx.beginPath();
  ctx.moveTo(-2, -6); ctx.lineTo(-5, 0); ctx.lineTo(-3, 1); ctx.lineTo(0, -4);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.arc(2, -3, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // nostril
  ctx.beginPath();
  ctx.arc(5, -1, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function motifTree(ctx, t) {
  // trunk
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-1.2, 1, 2.4, 6);
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.9;
  ctx.strokeRect(-1.2, 1, 2.4, 6);
  // canopy (three-blob)
  ctx.fillStyle = "#4f8c3a";
  ctx.beginPath();
  ctx.arc(-3, -1, 4, 0, Math.PI * 2);
  ctx.arc(3, -1, 4, 0, Math.PI * 2);
  ctx.arc(0, -5, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a3808";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-2, -5, 2.4, 0.9, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function motifBird(ctx, t) {
  // body
  ctx.fillStyle = "#e0a020";
  ctx.beginPath();
  ctx.ellipse(0, 1, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // head
  ctx.fillStyle = "#e0a020";
  ctx.beginPath();
  ctx.arc(4, -2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // beak
  ctx.fillStyle = "#7a4808";
  ctx.beginPath();
  ctx.moveTo(6, -2); ctx.lineTo(8.5, -1.5); ctx.lineTo(6, -0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // wing
  ctx.fillStyle = "#a87010";
  ctx.beginPath();
  ctx.ellipse(-1, 1, 3, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // eye
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.arc(4.5, -2.5, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function motifSpark(ctx, t) {
  // 4-pointed sparkle
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(1.6, -1.6);
  ctx.lineTo(8, 0);
  ctx.lineTo(1.6, 1.6);
  ctx.lineTo(0, 8);
  ctx.lineTo(-1.6, 1.6);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-1.6, -1.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // inner glow
  ctx.fillStyle = "rgba(255,240,180,0.85)";
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function motifWands(ctx, t) {
  ctx.save();
  ctx.rotate(-Math.PI / 6);
  // wand 1
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 6); ctx.lineTo(4, -4);
  ctx.stroke();
  ctx.fillStyle = "#f8d050";
  ctx.beginPath();
  ctx.arc(5, -5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.rotate(Math.PI / 6);
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(6, 6); ctx.lineTo(-4, -4);
  ctx.stroke();
  ctx.fillStyle = "#b06adc";
  ctx.beginPath();
  ctx.arc(-5, -5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
}

// ── Registry ──────────────────────────────────────────────────────────────

export const ICONS = {
  // chains_committed
  ach_first_steps:    makeAchievement("First Steps",        "#c08858", "bronze", motifChain),
  ach_patient_hands:  makeAchievement("Patient Hands",      "#a8b0b8", "silver", motifChain),
  ach_tireless:       makeAchievement("Tireless",           "#e0a020", "gold",   motifChain),
  // orders_fulfilled
  ach_trusted_friend: makeAchievement("Trusted Friend",     "#c08858", "bronze", motifHandshake),
  ach_village_voice:  makeAchievement("Village Voice",      "#a8b0b8", "silver", motifHandshake),
  // bosses_defeated
  ach_first_blood:    makeAchievement("First Blood",        "#c08858", "bronze", motifSword),
  ach_champion:       makeAchievement("Champion",           "#e0a020", "gold",   motifCrossedSwords),
  // discovery
  ach_naturalist:     makeAchievement("Naturalist",         "#c08858", "bronze", motifLeaf),
  ach_polymath:       makeAchievement("Polymath",           "#e0a020", "gold",   motifTriLeaf),
  // buildings
  ach_town_planner:   makeAchievement("Town Planner",       "#a8b0b8", "silver", motifCompass),
  // supplies
  ach_supply_chain:   makeAchievement("Supply Chain",       "#c08858", "bronze", motifSack),
  // fish_chained
  ach_first_catch:    makeAchievement("First Catch",        "#c08858", "bronze", motifFish),
  ach_tide_runner:    makeAchievement("Tide Runner",        "#a8b0b8", "silver", motifFish),
  ach_master_angler:  makeAchievement("Master Angler",      "#e0a020", "gold",   motifFish),
  // mine_chained
  ach_first_strike:   makeAchievement("First Strike",       "#c08858", "bronze", motifPickaxe),
  ach_deep_digger:    makeAchievement("Deep Digger",        "#a8b0b8", "silver", motifPickaxe),
  ach_mine_master:    makeAchievement("Mine Master",        "#e0a020", "gold",   motifPickaxe),
  // category harvests
  ach_veg_patron:     makeAchievement("Vegetable Patron",   "#a8b0b8", "silver", motifCarrot),
  ach_orchard_friend: makeAchievement("Orchard Hand",       "#a8b0b8", "silver", motifApple),
  ach_pollinator:     makeAchievement("Pollinator",         "#a8b0b8", "silver", motifFlower),
  ach_herder:         makeAchievement("Herder",             "#a8b0b8", "silver", motifSheep),
  ach_dairyman:       makeAchievement("Dairyman",           "#a8b0b8", "silver", motifCow),
  ach_stable_hand:    makeAchievement("Stable Hand",        "#a8b0b8", "silver", motifHorse),
  ach_forester:       makeAchievement("Forester",           "#a8b0b8", "silver", motifTree),
  ach_fowler:         makeAchievement("Fowler",             "#a8b0b8", "silver", motifBird),
  // abilities
  ach_powerful_keep:   makeAchievement("Powerful Keep",     "#a8b0b8", "silver", motifSpark),
  ach_ability_artisan: makeAchievement("Ability Artisan",   "#e0a020", "gold",   motifWands),
};
