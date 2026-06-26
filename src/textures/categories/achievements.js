// Achievement badges — circular medallions with a ribbon tail and a small
// inset motif. Three tiers (bronze / silver / gold) share one frame so the
// set reads as a single family. Drawn at canvas origin (0,0) inside a ~64×64
// design box, matching the rest of the icon library.

const TIER = {
  bronze: {
    rimHi: "#f0b078", rimMid: "#b46a2c", rimLo: "#5a2808",
    faceHi: "#f8c898", faceMid: "#c08858", faceLo: "#5a3008",
    ribbonHi: "#a83828", ribbonMid: "#7a1c10", ribbonLo: "#3a0808",
  },
  silver: {
    rimHi: "#fafcff", rimMid: "#9aa4ac", rimLo: "#3a3e44",
    faceHi: "#f0f4f8", faceMid: "#a8b0b8", faceLo: "#5a6068",
    ribbonHi: "#5a78a8", ribbonMid: "#2a4878", ribbonLo: "#0a1c38",
  },
  gold: {
    rimHi: "#fff0a0", rimMid: "#e0a020", rimLo: "#6a3808",
    faceHi: "#fff4b8", faceMid: "#f0c040", faceLo: "#8a5008",
    ribbonHi: "#c83038", ribbonMid: "#8a1018", ribbonLo: "#3a0408",
  },
};

// Geometry — a larger medallion than before so motifs read at 56px, with a
// star banner under it for the tier rank. Everything stays inside the ±26 box.
const MED_CY = -3;   // medallion centre y
const MED_R = 16.5;  // outer rim radius
const MOTIF_SCALE = 1.45;

function drawShadow(ctx, w = 17, h = 3.5) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 25, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Two-tail ribbon behind the medallion. Drawn first so the medallion overlaps.
function drawRibbon(ctx, t) {
  const grad = ctx.createLinearGradient(0, 2, 0, 24);
  grad.addColorStop(0, t.ribbonHi);
  grad.addColorStop(0.5, t.ribbonMid);
  grad.addColorStop(1, t.ribbonLo);
  ctx.fillStyle = grad;
  const tail = (s) => {
    ctx.beginPath();
    ctx.moveTo(s * 10, 4);
    ctx.lineTo(s * 15, 23);
    ctx.lineTo(s * 8.5, 19.5);
    ctx.lineTo(s * 3.5, 9);
    ctx.closePath();
    ctx.fill();
  };
  tail(-1); tail(1);
  ctx.strokeStyle = t.ribbonLo;
  ctx.lineWidth = 1.2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 10, 4); ctx.lineTo(s * 15, 23); ctx.lineTo(s * 8.5, 19.5); ctx.lineTo(s * 3.5, 9);
    ctx.stroke();
  }
}

// Five-pointed star path centred at (cx,cy).
function star5(ctx, cx, cy, rOut, rIn) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rOut : rIn;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Tier banner: a dark rounded plaque holding `stars` gold stars, sitting over
// the ribbon at the base of the medallion. This is the prominent "level" cue.
function drawStarBanner(ctx, stars) {
  const n = Math.max(1, Math.min(3, stars));
  const gap = 8.4;
  const w = n * gap + 5;
  const cy = 16.5;
  const h = 9.5;
  // plaque
  ctx.fillStyle = "#2a1c10";
  ctx.beginPath();
  ctx.roundRect(-w / 2, cy - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = "#0e0805"; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 1.2, cy - h / 2 + 1.2, w - 2.4, h - 2.4, (h - 2.4) / 2);
  ctx.stroke();
  // stars
  const x0 = -((n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * gap;
    const g = ctx.createLinearGradient(cx, cy - 3.4, cx, cy + 3.4);
    g.addColorStop(0, "#fff2b0"); g.addColorStop(0.5, "#ffd23c"); g.addColorStop(1, "#c8860c");
    ctx.fillStyle = g;
    star5(ctx, cx, cy, 3.5, 1.5);
    ctx.fill();
    ctx.strokeStyle = "#6a3c08"; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    star5(ctx, cx - 0.5, cy - 0.7, 1.3, 0.6);
    ctx.fill();
  }
}

// Medallion: outer rim → inner face → bevel highlight.
function drawMedallion(ctx, t) {
  const rim = ctx.createLinearGradient(0, MED_CY - MED_R, 0, MED_CY + MED_R);
  rim.addColorStop(0, t.rimHi);
  rim.addColorStop(0.5, t.rimMid);
  rim.addColorStop(1, t.rimLo);
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(0, MED_CY, MED_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.rimLo;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Inner face
  const faceR = MED_R - 3.5;
  const face = ctx.createRadialGradient(-3, MED_CY - 5, 1, 0, MED_CY, faceR);
  face.addColorStop(0, t.faceHi);
  face.addColorStop(0.55, t.faceMid);
  face.addColorStop(1, t.faceLo);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(0, MED_CY, faceR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.rimLo;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Top-left specular highlight on rim
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, MED_CY, MED_R - 1.5, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
}

// Glossy sheen on top of the medallion face. Call last.
function drawSheen(ctx) {
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.ellipse(-4, MED_CY - 8, 6, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// `motif` is a function (ctx, t) → draws the central glyph around (0,0) sized
// for a ~16px well. We scale it up and recentre it on the medallion face.
function makeAchievement(label, color, tierKey, stars, motif) {
  return {
    label,
    color,
    draw(ctx) {
      const t = { ...TIER[tierKey] };
      t.motifInk = tierKey === "silver" ? "#1a2030" : "#3a1c04";
      t.motifInkSoft = tierKey === "silver" ? "#5a6478" : "#7a4a18";
      drawShadow(ctx);
      drawRibbon(ctx, t);
      drawMedallion(ctx, t);
      ctx.save();
      ctx.translate(0, MED_CY);
      ctx.scale(MOTIF_SCALE, MOTIF_SCALE);
      motif(ctx, t);
      ctx.restore();
      drawSheen(ctx);
      drawStarBanner(ctx, stars);
    },
  };
}

// ── Motif primitives ──────────────────────────────────────────────────────

function motifFriends(ctx, t) {
  // Trusted Friend — two people standing shoulder-to-shoulder with a small
  // heart between their heads. Confident filled silhouettes (head + body) read
  // instantly as "two friends" and won't be confused with the handshake used
  // by Village Voice.
  ctx.lineJoin = "round";
  ctx.strokeStyle = t.motifInk;

  const person = (cx, fill) => {
    // body (rounded shoulders)
    ctx.fillStyle = fill;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx - 3.4, 7);
    ctx.lineTo(cx - 3.4, 2.2);
    ctx.bezierCurveTo(cx - 3.4, -1.4, cx + 3.4, -1.4, cx + 3.4, 2.2);
    ctx.lineTo(cx + 3.4, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // head
    ctx.beginPath();
    ctx.arc(cx, -3, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // top-left sheen on the head
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx - 0.8, -3.8, 0.9, 0.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
  };

  // two slightly overlapping figures, warm skin/sleeve tones for contrast
  person(-3.6, "#d89858");
  person(3.6, "#e8b888");

  // small heart nestled between the two heads
  ctx.fillStyle = "#d83048";
  ctx.beginPath();
  ctx.moveTo(0, -4.6);
  ctx.bezierCurveTo(-1.7, -7.2, -4, -5.4, 0, -2.4);
  ctx.bezierCurveTo(4, -5.4, 1.7, -7.2, 0, -4.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-1.2, -5.2, 0.7, 0.4, -0.4, 0, Math.PI * 2);
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
  // Supply chain — three open metal links threaded diagonally. Each link is a
  // hollow ring (stroke thin relative to its size) and neighbours overlap by
  // only ~a third, so the eye reads three distinct rings linking through one
  // another rather than a single fused blob. Centred on the disc.
  ctx.save();
  ctx.translate(0.6, 0.6);   // nudge to sit the diagonal chain dead-centre on the face
  ctx.rotate(-Math.PI / 4);
  ctx.lineCap = "round";

  const RX = 2.7;     // ring half-width
  const RY = 3.7;     // ring half-height (along the chain axis)
  const GAP = 4.6;    // centre-to-centre spacing (< 2*RY ⇒ rings thread)
  const cys = [-GAP, 0, GAP];

  // Stroke one ring or arc: dark edge under a bright steel core.
  const ring = (cy, a0, a1) => {
    ctx.strokeStyle = t.motifInk;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, cy, RX, RY, 0, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = "#c4cad2";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, cy, RX, RY, 0, a0, a1);
    ctx.stroke();
  };

  // Painter's order top→bottom: each link is laid full, then the next link's
  // body is drawn over it AND its leading (upper) edge is re-stroked on top,
  // so every link clearly passes in front of the one above it — an unambiguous
  // over/under weave like the two-link `motifChain`.
  ring(cys[0], 0, Math.PI * 2);                 // top link (fully behind)
  ring(cys[1], 0, Math.PI * 2);                 // middle link, over the top one
  ring(cys[1], Math.PI * 1.15, Math.PI * 1.85); // re-stroke its upper edge on top
  ring(cys[2], 0, Math.PI * 2);                 // bottom link, over the middle one
  ring(cys[2], Math.PI * 1.15, Math.PI * 1.85); // re-stroke its upper edge on top

  // Soft top-left specular sheen on each link.
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 0.8;
  for (const cy of cys) {
    ctx.beginPath();
    ctx.ellipse(-0.4, cy - 0.4, RX - 0.8, RY - 0.8, 0, Math.PI * 0.85, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();
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

function motifPickaxeRock(ctx, t) {
  // Deep Digger (mid tier) — a pickaxe biting into a chunk of ore. Distinct
  // from the bare First-Strike pick: the head is angled and struck into a
  // faceted rock at the lower-left, so the shape itself reads "digging deep".
  // ── rock chunk (drawn first, behind) ──
  ctx.fillStyle = "#6a5a4a";
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.1;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.lineTo(-9, 2);
  ctx.lineTo(-4, -1);
  ctx.lineTo(1, 1.5);
  ctx.lineTo(2, 6);
  ctx.lineTo(-2, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // facet shading + a glint
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(-9, 2); ctx.lineTo(-4, -1); ctx.lineTo(-4.5, 3); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,236,150,0.85)";
  ctx.beginPath();
  ctx.arc(-5.4, 4, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // ── pickaxe, tilted so the pointed head strikes down into the rock ──
  ctx.save();
  ctx.translate(1.5, -3);
  ctx.rotate(0.5);
  // head: a curved pick bar that tapers to a sharp point at each end (a true
  // pick profile, not the flat bar of the first-strike tier)
  ctx.fillStyle = "#9aa4ac";
  ctx.beginPath();
  ctx.moveTo(-9, -2.6);                 // left point
  ctx.quadraticCurveTo(-3, -5, -1.4, -1.2);
  ctx.quadraticCurveTo(0, -3.2, 1.4, -1.2);
  ctx.quadraticCurveTo(3, -5, 9, -2.6); // right point
  ctx.quadraticCurveTo(3, -3.4, 0, -1);
  ctx.quadraticCurveTo(-3, -3.4, -9, -2.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // shaft
  ctx.strokeStyle = "#7a4818";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -2); ctx.lineTo(0, 8);
  ctx.stroke();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -2); ctx.lineTo(0, 8);
  ctx.stroke();
  ctx.restore();
}

function motifCrossedPicks(ctx, t) {
  // Mine Master (top tier) — two crossed pickaxes, an unmistakably more
  // elaborate "mastery" emblem distinct from the single picks below it.
  const pick = () => {
    // head (steel)
    ctx.fillStyle = "#9aa4ac";
    ctx.beginPath();
    ctx.moveTo(-8, -7.5);
    ctx.quadraticCurveTo(0, -10.5, 8, -7.5);
    ctx.lineTo(6, -4.5);
    ctx.quadraticCurveTo(0, -6.5, -6, -4.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = t.motifInk;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // metallic glint on the head
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-4, -7.4); ctx.quadraticCurveTo(0, -9, 4, -7.4);
    ctx.stroke();
    // shaft
    ctx.strokeStyle = "#7a4818";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -6.5); ctx.lineTo(0, 8.5);
    ctx.stroke();
    ctx.strokeStyle = t.motifInk;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -6.5); ctx.lineTo(0, 8.5);
    ctx.stroke();
  };
  ctx.save();
  ctx.rotate(-Math.PI / 4);
  pick();
  ctx.restore();
  ctx.save();
  ctx.rotate(Math.PI / 4);
  pick();
  ctx.restore();
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
  // A clear side-on sheep: one cohesive fluffy wool body (scalloped outline,
  // not a ring of separate circles), a dark face and legs, facing right.
  // legs (drawn first, behind body)
  ctx.strokeStyle = "#2a1c10";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-2.5, 3.5); ctx.lineTo(-2.5, 7);
  ctx.moveTo(2.5, 3.5); ctx.lineTo(2.5, 7);
  ctx.stroke();

  // wool body — single filled cloud with a bumpy top edge
  ctx.fillStyle = "#f6efe0";
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, 1.5);
  // bumpy fleece across the top
  ctx.arc(-4.5, -1.5, 2.2, Math.PI * 0.9, Math.PI * 1.9);
  ctx.arc(-1.2, -2.6, 2.4, Math.PI * 1.05, Math.PI * 1.95);
  ctx.arc(2.2, -2.2, 2.4, Math.PI * 1.05, Math.PI * 1.95);
  ctx.arc(4.6, -0.5, 2.0, Math.PI * 1.2, Math.PI * 2.05);
  // rounded underside back to the start
  ctx.bezierCurveTo(7, 3.5, 4, 4.6, 0, 4.6);
  ctx.bezierCurveTo(-4, 4.6, -7, 3.5, -6, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a couple of fleece curl marks for texture
  ctx.strokeStyle = "rgba(120,110,95,0.55)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(-2.4, 0.6, 1.4, Math.PI * 0.1, Math.PI * 0.9);
  ctx.arc(1.6, 1.0, 1.4, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();

  // head — dark face on the right (kept compact so it doesn't dominate)
  ctx.fillStyle = "#3a2818";
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(6.6, 0.6, 2.0, 2.3, 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // ear
  ctx.fillStyle = "#2a1c10";
  ctx.beginPath();
  ctx.ellipse(5.6, -1.3, 1.3, 0.7, -0.7, 0, Math.PI * 2);
  ctx.fill();
  // eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(7.2, -0.1, 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function motifCow(ctx, t) {
  // Side-on dairy cow facing right, with a clear separated leg pair, a level
  // back, a distinct boxy muzzle and two horns + an ear so it reads as a cow
  // rather than a spotted lump at icon size.
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // ── legs (drawn first, behind body) — a clearly separated front pair and
  // back pair, with a wide gap between so they read as legs, not a fence. ──
  ctx.strokeStyle = "#2a1408";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-4, 3.4); ctx.lineTo(-4, 7.4);   // back leg
  ctx.moveTo(4.6, 3.4); ctx.lineTo(4.6, 7.4); // front leg
  ctx.stroke();
  // hooves (slightly darker tips)
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-4, 6.7); ctx.lineTo(-4, 7.4);
  ctx.moveTo(4.6, 6.7); ctx.lineTo(4.6, 7.4);
  ctx.stroke();

  // ── body — a level-backed barrel, flatter on top than an egg ──
  ctx.fillStyle = "#fafafa";
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6.5, 0);
  ctx.bezierCurveTo(-6.5, -3.4, -3.5, -3.8, 0, -3.8);   // level back
  ctx.bezierCurveTo(3.5, -3.8, 5.6, -3.4, 6, -1.2);     // rump → shoulder
  ctx.bezierCurveTo(6.4, 1, 5.4, 4, 2, 4);              // belly front
  ctx.bezierCurveTo(-2, 4.3, -6.5, 3.4, -6.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // tail
  ctx.strokeStyle = "#2a1408";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-6.4, -1.5); ctx.quadraticCurveTo(-8.6, 1, -7.6, 4);
  ctx.stroke();
  ctx.fillStyle = "#2a1408";
  ctx.beginPath();
  ctx.arc(-7.6, 4.2, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // ── spots — two clean Holstein patches, kept clear of the legs/edges ──
  ctx.fillStyle = "#2a1408";
  ctx.beginPath();
  ctx.ellipse(-3, -0.4, 1.7, 1.3, 0.3, 0, Math.PI * 2);
  ctx.ellipse(2.2, 0.8, 1.3, 1.1, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // ── head — boxy muzzle on a short neck, facing right ──
  ctx.fillStyle = "#fafafa";
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(5.2, -2.6);
  ctx.lineTo(9.4, -2.2);
  ctx.quadraticCurveTo(10.6, -1.8, 10.4, -0.2);  // top of muzzle
  ctx.quadraticCurveTo(10.2, 1.6, 8.6, 1.8);     // nose
  ctx.lineTo(6, 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // muzzle shading + nostril
  ctx.fillStyle = "#d8a890";
  ctx.beginPath();
  ctx.ellipse(9.2, 0.8, 1.2, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.arc(9.4, 0.9, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // ── horns (two short curved nubs) + ear ──
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(6.6, -2.4); ctx.quadraticCurveTo(6, -4.2, 7, -4.6);   // back horn
  ctx.moveTo(8.4, -2.2); ctx.quadraticCurveTo(8.4, -4, 9.4, -4.2); // front horn
  ctx.stroke();
  // ear
  ctx.fillStyle = "#fafafa";
  ctx.beginPath();
  ctx.ellipse(6, -3.2, 1.3, 0.8, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // eye
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.arc(7.6, -1, 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function motifHorse(ctx, t) {
  // Stable Hand — a clean side-profile horse head facing right. Confident
  // curves: a sweeping forehead → muzzle, an angled jaw, and a flowing mane
  // down the neck, so it reads instantly as a horse instead of a blocky lump.
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const coat = ctx.createLinearGradient(-2, -8, 4, 7);
  coat.addColorStop(0, "#9a6028");
  coat.addColorStop(1, "#6a3c14");

  // ── head + neck silhouette (poll at top-left, muzzle lower-right) ──
  ctx.fillStyle = coat;
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-1.5, -7.5);                                   // poll (top of head)
  ctx.bezierCurveTo(2.5, -7.2, 5, -5, 5.6, -2.2);           // forehead/brow
  ctx.bezierCurveTo(6.2, 0, 6.6, 2, 6.2, 3.6);              // bridge of the nose
  ctx.bezierCurveTo(6, 4.8, 5, 5.4, 3.6, 5.2);              // round muzzle/lips
  ctx.bezierCurveTo(2.6, 5, 2, 4, 1.6, 2.6);                // chin/jaw underside
  ctx.bezierCurveTo(0.4, 2.2, -1.4, 1.4, -2.4, 0);          // cheek → throat
  ctx.bezierCurveTo(-3.4, -1.6, -3.6, -4, -3, -6);          // neck curve up to poll
  ctx.bezierCurveTo(-2.8, -6.8, -2.3, -7.4, -1.5, -7.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ── ear (a small pointed triangle at the poll) ──
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-1.4, -7.4);
  ctx.lineTo(0.4, -9.4);
  ctx.lineTo(1.4, -6.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ── mane: a flowing dark sweep down the back of the neck ──
  ctx.fillStyle = "#2a1408";
  ctx.beginPath();
  ctx.moveTo(-1.6, -7.4);
  ctx.bezierCurveTo(-3.4, -6, -4.4, -3, -4, 0.5);          // outer mane edge
  ctx.bezierCurveTo(-3.4, 2.4, -2.4, 1.2, -2.4, 0);        // inner edge meets neck
  ctx.bezierCurveTo(-3, -2.4, -2.6, -5, -1, -6.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // a couple of mane strands for texture
  ctx.strokeStyle = "rgba(20,10,4,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-2.6, -5.5); ctx.bezierCurveTo(-3.6, -3, -3.4, -0.5, -3.2, 0.4);
  ctx.stroke();

  // ── coat sheen down the forehead ──
  ctx.strokeStyle = "rgba(255,225,180,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(1.6, -6); ctx.bezierCurveTo(3.4, -5.4, 4.4, -3.4, 4.8, -1);
  ctx.stroke();

  // ── eye + nostril ──
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.ellipse(2.8, -3.4, 0.85, 0.65, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(2.6, -3.6, 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.ellipse(5, 3, 0.55, 0.75, 0.3, 0, Math.PI * 2);
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
  // Castle keep — a battlemented central tower flanked by two shorter turrets,
  // reading as a fortified "keep" in solid stone with crenellations.
  ctx.strokeStyle = t.motifInk;
  ctx.lineJoin = "round";
  const stone = ctx.createLinearGradient(0, -8, 0, 8);
  stone.addColorStop(0, "#e8eaee");
  stone.addColorStop(0.5, "#aab0b8");
  stone.addColorStop(1, "#5c626c");
  // ── flanking turrets (drawn first, behind the central tower) ──
  ctx.fillStyle = stone;
  ctx.lineWidth = 1.1;
  const turret = (cx) => {
    // crenellated top: two merlons with a notch between
    ctx.beginPath();
    ctx.moveTo(cx - 3.2, -3);
    ctx.lineTo(cx - 3.2, -6);
    ctx.lineTo(cx - 1.1, -6);
    ctx.lineTo(cx - 1.1, -4.4);
    ctx.lineTo(cx + 1.1, -4.4);
    ctx.lineTo(cx + 1.1, -6);
    ctx.lineTo(cx + 3.2, -6);
    ctx.lineTo(cx + 3.2, 7);
    ctx.lineTo(cx - 3.2, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  turret(-6.6);
  turret(6.6);
  // ── central tower (taller, three merlons) ──
  ctx.fillStyle = stone;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-4.4, -2);
  ctx.lineTo(-4.4, -8);
  ctx.lineTo(-2.2, -8);
  ctx.lineTo(-2.2, -6.4);
  ctx.lineTo(-0.9, -6.4);
  ctx.lineTo(-0.9, -8);
  ctx.lineTo(0.9, -8);
  ctx.lineTo(0.9, -6.4);
  ctx.lineTo(2.2, -6.4);
  ctx.lineTo(2.2, -8);
  ctx.lineTo(4.4, -8);
  ctx.lineTo(4.4, 8);
  ctx.lineTo(-4.4, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // arched gate
  ctx.fillStyle = t.motifInk;
  ctx.beginPath();
  ctx.moveTo(-1.8, 8);
  ctx.lineTo(-1.8, 2.4);
  ctx.arc(0, 2.4, 1.8, Math.PI, 0);
  ctx.lineTo(1.8, 8);
  ctx.closePath();
  ctx.fill();
  // narrow windows on the central tower
  ctx.fillStyle = t.motifInk;
  ctx.fillRect(-0.5, -3.2, 1, 2.6);
  // stone course line
  ctx.strokeStyle = "rgba(40,44,52,0.45)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-4.4, 0.5); ctx.lineTo(4.4, 0.5);
  ctx.stroke();
  // top-left sheen
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(-3.6, -7, 1.2, 5);
}

function motifWands(ctx, t) {
  // Artisan — a hammer crossed over a chisel, the classic craftsman emblem.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // ── chisel (drawn first, behind), running lower-left → upper-right ──
  ctx.save();
  ctx.rotate(Math.PI / 5);
  // wooden handle
  ctx.strokeStyle = "#8a5828";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, 7.5); ctx.lineTo(0, -1);
  ctx.stroke();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, 7.5); ctx.lineTo(0, -1);
  ctx.stroke();
  // steel blade tapering to a flat cutting tip
  ctx.fillStyle = "#cfd4da";
  ctx.beginPath();
  ctx.moveTo(-1.5, -1);
  ctx.lineTo(1.5, -1);
  ctx.lineTo(1, -7);
  ctx.lineTo(-1, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-0.5, -1.5); ctx.lineTo(-0.4, -6.5);
  ctx.stroke();
  ctx.restore();

  // ── hammer (in front), running lower-right → upper-left ──
  ctx.save();
  ctx.rotate(-Math.PI / 5);
  // wooden handle
  ctx.strokeStyle = "#8a5828";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 8); ctx.lineTo(0, -3.5);
  ctx.stroke();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, 8); ctx.lineTo(0, -3.5);
  ctx.stroke();
  // steel head — a chunky claw/peen block across the top
  const head = ctx.createLinearGradient(0, -7, 0, -3.5);
  head.addColorStop(0, "#e8eaee");
  head.addColorStop(1, "#7c828c");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.roundRect(-4.6, -7, 9.2, 3.6, 1.1);
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // sheen on the head
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(-3.8, -6.4, 5, 0.9);
  ctx.restore();
}

function motifFootsteps(ctx) {
  // First Steps — a pair of footprints (a left and a right foot) walking up
  // the disc, drawn as confident dark silhouettes (sole + a clear arc of toes)
  // for strong contrast against the medal face.
  const ink = "#241006"; // darker than face for instant read
  const foot = (cx, cy, flip) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flip, 1);
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    // sole: a rounded foot shape, waisted at the arch (ball at top, heel below)
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(2.3, 5, 2.5, 2, 2.1, -0.2);
    ctx.bezierCurveTo(1.8, -1.6, 2.4, -2.6, 1.9, -3.2);
    ctx.bezierCurveTo(0.9, -4.2, -1.4, -3.6, -1.9, -1.4);
    ctx.bezierCurveTo(-2.4, 0.8, -2.4, 5, 0, 5);
    ctx.closePath();
    ctx.fill();
    // toe pads — a tidy arc of five, the big toe largest
    const toes = [[-1.5, -3.4, 0.95], [-0.2, -4.4, 0.7], [0.9, -4.6, 0.6], [1.8, -4.2, 0.55], [2.5, -3.4, 0.5]];
    for (const [tx, ty, r] of toes) {
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // subtle warm highlight down the arch so the silhouette isn't flat
    ctx.fillStyle = "rgba(240,200,150,0.35)";
    ctx.beginPath();
    ctx.ellipse(-0.4, 1.2, 0.7, 1.9, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  // right foot forward-low, left foot back-high → a clear walking pair
  foot(2.8, 2.6, 1);
  foot(-3.2, -2.2, -1);
}

function motifInfinity(ctx, t) {
  // Tireless — a clean, deliberate infinity loop (∞) drawn as one continuous
  // ribbon with a bright metallic core, so it reads as "endless / never-tiring"
  // rather than as the two separate oval chain links it used to share.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // One figure-eight ribbon traced through both lobes. A single path keeps the
  // crossing in the middle reading as a continuous loop, not two rings.
  const loop = (lw, stroke) => {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // left lobe
    ctx.bezierCurveTo(-2.2, -4.4, -8.2, -4.4, -8.2, 0);
    ctx.bezierCurveTo(-8.2, 4.4, -2.2, 4.4, 0, 0);
    // right lobe
    ctx.bezierCurveTo(2.2, -4.4, 8.2, -4.4, 8.2, 0);
    ctx.bezierCurveTo(8.2, 4.4, 2.2, 4.4, 0, 0);
    ctx.closePath();
    ctx.stroke();
  };
  loop(3.4, t.motifInk);          // dark outer edge
  loop(1.9, "#f0c850");           // warm gold core ribbon
  // top-left specular sheen along the upper edge of each lobe
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-6.6, -2.2);
  ctx.bezierCurveTo(-7.4, -1.4, -7.4, -0.2, -6.9, 0.4);
  ctx.moveTo(6.6, -2.2);
  ctx.bezierCurveTo(7.4, -1.4, 7.4, -0.2, 6.9, 0.4);
  ctx.stroke();
}

function motifHourglass(ctx, t) {
  // Patient Hands — an hourglass, the clearest small-size symbol for patience /
  // waiting. Distinct in silhouette from Tireless's infinity loop. Wooden caps
  // top and bottom, glass bulbs pinched at a centre neck, sand settled below.
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // ── glass body: two triangular bulbs meeting at a narrow neck ──
  const glass = ctx.createLinearGradient(-5, 0, 5, 0);
  glass.addColorStop(0, "rgba(210,230,245,0.55)");
  glass.addColorStop(0.5, "rgba(255,255,255,0.85)");
  glass.addColorStop(1, "rgba(180,205,225,0.5)");
  ctx.fillStyle = glass;
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(5, -6);
  ctx.bezierCurveTo(3.2, -2.2, 1.2, -1, 0.7, 0);   // upper bulb → neck
  ctx.bezierCurveTo(1.2, 1, 3.2, 2.2, 5, 6);       // neck → lower bulb
  ctx.lineTo(-5, 6);
  ctx.bezierCurveTo(-3.2, 2.2, -1.2, 1, -0.7, 0);
  ctx.bezierCurveTo(-1.2, -1, -3.2, -2.2, -5, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ── sand: a thin stream falling and a pile settled in the lower bulb ──
  ctx.fillStyle = "#e0a84c";
  // settled pile (a triangle filling the bottom of the lower bulb)
  ctx.beginPath();
  ctx.moveTo(-4.1, 5.4);
  ctx.lineTo(4.1, 5.4);
  ctx.lineTo(0, 1.8);
  ctx.closePath();
  ctx.fill();
  // falling stream through the neck
  ctx.fillRect(-0.4, 0, 0.8, 4);
  // a little sand still draining from the top bulb
  ctx.beginPath();
  ctx.moveTo(-1.6, -1.4);
  ctx.lineTo(1.6, -1.4);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // ── wooden caps top and bottom ──
  ctx.fillStyle = "#8a5828";
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(-6, -7.4, 12, 2.2, 1);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-6, 5.2, 12, 2.2, 1);
  ctx.fill();
  ctx.stroke();

  // top-left sheen on the glass
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-3.6, -5);
  ctx.lineTo(-1.1, -0.6);
  ctx.stroke();
}

function motifMegaphone(ctx, t) {
  // Village Voice — a megaphone/bullhorn with sound arcs, an unambiguous
  // "voice / announcement" symbol. Replaces the muddy clasped-hands shape that
  // read as a mouth/eye. Cone points to the upper-right; arcs radiate from it.
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.save();
  ctx.translate(-2.6, 1);
  ctx.rotate(-0.32);

  // ── horn cone: narrow mouthpiece at left flaring to a wide bell at right ──
  const horn = ctx.createLinearGradient(-7, 0, 6, 0);
  horn.addColorStop(0, "#c83838");
  horn.addColorStop(1, "#f06a4a");
  ctx.fillStyle = horn;
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-7, -1.8);
  ctx.lineTo(-7, 1.8);
  ctx.lineTo(5, 5);
  ctx.lineTo(5, -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // bell rim (a darker lip at the wide opening)
  ctx.strokeStyle = "#7a1c10";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(5, -5);
  ctx.lineTo(5, 5);
  ctx.stroke();

  // handle under the cone body
  ctx.strokeStyle = "#8a5828";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-3, 2.6); ctx.lineTo(-3, 5.4);
  ctx.stroke();

  // top-left sheen
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-6, -1.2); ctx.lineTo(3.4, 0.4);
  ctx.stroke();
  ctx.restore();

  // ── sound arcs radiating from the bell (upper-right) ──
  ctx.strokeStyle = "#f0c850";
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(3.4, -2.2, 2.2 + i * 2.0, -Math.PI / 2.6, Math.PI / 3.2);
    ctx.stroke();
  }
}

function motifNaturalist(ctx, t) {
  // Naturalist — a leaf paired with a small bloom, so it reads as botany /
  // nature-study rather than a near-duplicate of the Forester tree badge.
  // Leaf sits lower-left at a jaunty tilt; a five-petal flower nestles top-right.

  // ── leaf (lower-left) ──
  ctx.save();
  ctx.translate(-2.2, 2);
  ctx.rotate(-0.35);
  ctx.fillStyle = "#3a7a28";
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(5.5, -4, 5.5, 4, 0, 5.5);
  ctx.bezierCurveTo(-5.5, 4, -5.5, -4, 0, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // veins
  ctx.strokeStyle = "#1a3808";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(0, 5.5);
  ctx.moveTo(0, -2.5); ctx.lineTo(2.6, -1);
  ctx.moveTo(0, -2.5); ctx.lineTo(-2.6, -1);
  ctx.moveTo(0, 0.5); ctx.lineTo(2.4, 2);
  ctx.moveTo(0, 0.5); ctx.lineTo(-2.4, 2);
  ctx.stroke();
  // leaf sheen
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(-1.6, -2, 1.2, 2.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── small flower (top-right) on a short stem ──
  ctx.save();
  ctx.translate(4, -4);
  // stem curving down toward the leaf
  ctx.strokeStyle = "#2a4a18";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 2.4);
  ctx.quadraticCurveTo(-1.4, 5, -3.4, 6);
  ctx.stroke();
  // petals
  ctx.fillStyle = "#f0a8d0";
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 2.4, Math.sin(a) * 2.4, 1.7, 1.3, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // bloom centre
  ctx.fillStyle = "#f8c020";
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.motifInk;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.restore();
}

// ── Registry ──────────────────────────────────────────────────────────────

// Per-counter progressions ramp bronze → silver → gold and carry 1/2/3 stars
// (rank within the group). Standalone achievements carry a single star.
const BRONZE = "#c08858", SILVER = "#a8b0b8", GOLD = "#e0a020";
export const ICONS = {
  // chains_committed — 3 tiers
  ach_first_steps:    makeAchievement("First Steps",        BRONZE, "bronze", 1, motifFootsteps),
  ach_patient_hands:  makeAchievement("Patient Hands",      SILVER, "silver", 2, motifHourglass),
  ach_tireless:       makeAchievement("Tireless",           GOLD,   "gold",   3, motifInfinity),
  // orders_fulfilled — 2 tiers
  ach_trusted_friend: makeAchievement("Trusted Friend",     BRONZE, "bronze", 1, motifFriends),
  ach_village_voice:  makeAchievement("Village Voice",      GOLD,   "gold",   2, motifMegaphone),
  // bosses_defeated — 2 tiers
  ach_first_blood:    makeAchievement("First Blood",        BRONZE, "bronze", 1, motifSword),
  ach_champion:       makeAchievement("Champion",           GOLD,   "gold",   2, motifCrossedSwords),
  // distinct_resources_chained — 2 tiers
  ach_naturalist:     makeAchievement("Naturalist",         BRONZE, "bronze", 1, motifNaturalist),
  ach_polymath:       makeAchievement("Polymath",           GOLD,   "gold",   2, motifTriLeaf),
  // buildings (standalone)
  ach_town_planner:   makeAchievement("Town Planner",       SILVER, "silver", 1, motifCompass),
  // supplies (standalone)
  ach_supply_chain:   makeAchievement("Supply Chain",       SILVER, "silver", 1, motifSack),
  // fish_chained — 3 tiers
  ach_first_catch:    makeAchievement("First Catch",        BRONZE, "bronze", 1, motifFish),
  ach_tide_runner:    makeAchievement("Tide Runner",        SILVER, "silver", 2, motifFish),
  ach_master_angler:  makeAchievement("Master Angler",      GOLD,   "gold",   3, motifFish),
  // mine_chained — 3 tiers
  ach_first_strike:   makeAchievement("First Strike",       BRONZE, "bronze", 1, motifPickaxe),
  ach_deep_digger:    makeAchievement("Deep Digger",        SILVER, "silver", 2, motifPickaxeRock),
  ach_mine_master:    makeAchievement("Mine Master",        GOLD,   "gold",   3, motifCrossedPicks),
  // category harvests (standalone)
  ach_veg_patron:     makeAchievement("Vegetable Patron",   SILVER, "silver", 1, motifCarrot),
  ach_orchard_friend: makeAchievement("Orchard Hand",       SILVER, "silver", 1, motifApple),
  ach_pollinator:     makeAchievement("Pollinator",         SILVER, "silver", 1, motifFlower),
  ach_herder:         makeAchievement("Herder",             SILVER, "silver", 1, motifSheep),
  ach_dairyman:       makeAchievement("Dairyman",           SILVER, "silver", 1, motifCow),
  ach_stable_hand:    makeAchievement("Stable Hand",        SILVER, "silver", 1, motifHorse),
  ach_forester:       makeAchievement("Forester",           SILVER, "silver", 1, motifTree),
  ach_fowler:         makeAchievement("Fowler",             SILVER, "silver", 1, motifBird),
  // abilities
  ach_powerful_keep:   makeAchievement("Powerful Keep",     SILVER, "silver", 1, motifSpark),
  ach_ability_artisan: makeAchievement("Ability Artisan",   GOLD,   "gold",   1, motifWands),
};
