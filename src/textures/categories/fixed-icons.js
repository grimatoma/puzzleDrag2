// Fixed icons — fills the gaps documented in Achievement & Quest Icons.html.
// Same painted-canvas vocabulary as the rest of the library: drawn at origin
// (0,0) inside a ~64×64 design box, with a soft ground shadow, dark outline
// (~#3a1c08) and a top-left highlight.

// ── Shared helpers ────────────────────────────────────────────────────────

function drawShadow(ctx, w = 14, h = 3) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 21, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, r1, r2, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = rot + (i * Math.PI) / points;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

// Heart shape centered at (cx,cy), w=width radius.
function heart(ctx, cx, cy, w) {
  const h = w * 0.95;
  ctx.beginPath();
  ctx.moveTo(cx, cy + h * 0.85);
  ctx.bezierCurveTo(cx + w * 1.3, cy + h * 0.3, cx + w * 0.6, cy - h, cx, cy - h * 0.25);
  ctx.bezierCurveTo(cx - w * 0.6, cy - h, cx - w * 1.3, cy + h * 0.3, cx, cy + h * 0.85);
  ctx.closePath();
}

// ── Story / metaplot ──────────────────────────────────────────────────────

function drawPactScroll(ctx) {
  drawShadow(ctx, 16, 3.5);
  // Closed rolled scroll, sealed shut — formal charter
  // Dark wood rods top and bottom
  const rod = ctx.createLinearGradient(-15, 0, 15, 0);
  rod.addColorStop(0, "#3a1808"); rod.addColorStop(0.5, "#7a4818"); rod.addColorStop(1, "#3a1808");
  ctx.fillStyle = rod;
  ctx.beginPath(); ctx.ellipse(0, -13, 15, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 13, 15, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#0a0e12"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, -13, 15, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 13, 15, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
  // Paper
  const paper = ctx.createLinearGradient(0, -13, 0, 13);
  paper.addColorStop(0, "#fbf2d4"); paper.addColorStop(1, "#c8a868");
  ctx.fillStyle = paper;
  ctx.beginPath(); ctx.rect(-14, -13, 28, 26); ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.4;
  ctx.strokeRect(-14, -13, 28, 26);
  // Pact lines — 6 entries
  ctx.strokeStyle = "rgba(58,16,4,0.55)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    const y = -9 + i * 4;
    ctx.beginPath();
    ctx.moveTo(-10, y); ctx.lineTo(7 - (i % 2) * 3, y);
    ctx.stroke();
    // Bullet dot
    ctx.fillStyle = "#3a1c08";
    ctx.beginPath();
    ctx.arc(-11.6, y, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crown emblem in center over text — denotes "charter"
  ctx.fillStyle = "rgba(224,160,32,0.85)";
  ctx.beginPath();
  ctx.moveTo(-5, 2); ctx.lineTo(-3, -2); ctx.lineTo(0, 0); ctx.lineTo(3, -2);
  ctx.lineTo(5, 2); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = "#e0a020";
  ctx.fillRect(-5, 2, 10, 1.4);
  // Top sheen
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-3, -11, 5, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPactViolation(ctx) {
  drawShadow(ctx, 14, 3);
  // Cracked broken wax seal
  const wax = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
  wax.addColorStop(0, "#f86848"); wax.addColorStop(0.55, "#a82018"); wax.addColorStop(1, "#3a0408");
  ctx.fillStyle = wax;
  ctx.beginPath();
  const pts = [[0,-12],[5,-10],[10,-5],[12,2],[9,9],[3,12],[-3,11],[-9,6],[-12,-1],[-9,-8],[-3,-11]];
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 1.4; ctx.stroke();
  // Crack — jagged white split through middle
  ctx.strokeStyle = "#fff0d0"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, -8); ctx.lineTo(-2, -2); ctx.lineTo(2, -4); ctx.lineTo(6, 4); ctx.lineTo(2, 6); ctx.lineTo(8, 12);
  ctx.stroke();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-10, -8); ctx.lineTo(-2, -2); ctx.lineTo(2, -4); ctx.lineTo(6, 4); ctx.lineTo(2, 6); ctx.lineTo(8, 12);
  ctx.stroke();
  // Warning glyph stamped on
  ctx.fillStyle = "rgba(58,4,8,0.7)";
  ctx.beginPath();
  ctx.moveTo(-6, -4); ctx.lineTo(0, -8); ctx.lineTo(6, -4); ctx.lineTo(0, 0); ctx.closePath();
  ctx.fill();
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 2, 1, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawChoiceLog(ctx) {
  drawShadow(ctx, 14, 3);
  // Open book with checklist on the right page
  // Back/spine
  ctx.fillStyle = "#5a3014";
  ctx.beginPath();
  ctx.rect(-13, -10, 26, 22);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Left page
  const pg = ctx.createLinearGradient(0, -10, 0, 12);
  pg.addColorStop(0, "#fbf2d4"); pg.addColorStop(1, "#d8b870");
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.rect(-12, -9, 12, 20); ctx.fill();
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 0.9; ctx.stroke();
  // Right page
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.rect(0, -9, 12, 20); ctx.fill();
  ctx.stroke();
  // Spine shadow
  ctx.fillStyle = "rgba(58,16,4,0.4)";
  ctx.fillRect(-1, -9, 2, 20);
  // Checklist entries on right page (3 items)
  for (let i = 0; i < 3; i++) {
    const y = -5 + i * 5;
    // Checkbox
    ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.9;
    ctx.strokeRect(1.6, y - 1.6, 3, 3);
    // Lines after
    ctx.strokeStyle = "rgba(58,16,4,0.55)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(6, y); ctx.lineTo(10, y);
    ctx.stroke();
    // Checkmark for first two
    if (i < 2) {
      ctx.strokeStyle = "#7a1818"; ctx.lineWidth = 1.0; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(2, y); ctx.lineTo(3, y + 1); ctx.lineTo(4.6, y - 1.2);
      ctx.stroke();
    }
  }
  // Left page squiggle lines
  ctx.strokeStyle = "rgba(58,16,4,0.5)";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 4; i++) {
    const y = -6 + i * 4;
    ctx.beginPath();
    ctx.moveTo(-10, y); ctx.lineTo(-3, y);
    ctx.stroke();
  }
  // Sheen on right page
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(6, -7, 4, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSideBeat(ctx) {
  drawShadow(ctx, 12, 3);
  // Wayside signpost — wooden post with one arrow board
  // Post
  ctx.fillStyle = "#7a4818";
  rr(ctx, -1.4, -4, 2.8, 24, 0.6);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0; ctx.stroke();
  // Plank arrow pointing right
  const plank = ctx.createLinearGradient(0, -10, 0, 0);
  plank.addColorStop(0, "#c89060"); plank.addColorStop(1, "#7a4818");
  ctx.fillStyle = plank;
  ctx.beginPath();
  ctx.moveTo(-10, -10); ctx.lineTo(7, -10); ctx.lineTo(12, -5); ctx.lineTo(7, 0); ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2; ctx.stroke();
  // Nails
  ctx.fillStyle = "#3a3830";
  ctx.beginPath();
  ctx.arc(-8, -8, 0.6, 0, Math.PI * 2);
  ctx.arc(-8, -2, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Carved squiggle on plank
  ctx.strokeStyle = "rgba(58,28,8,0.7)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-6, -5); ctx.lineTo(4, -5);
  ctx.stroke();
  // Star spark above plank — "interesting place"
  ctx.fillStyle = "#f0c040";
  star(ctx, -3, -16, 3.4, 1.4, 4);
  ctx.fill();
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 0.8; ctx.stroke();
  // Grass at base
  ctx.strokeStyle = "#3a6014"; ctx.lineWidth = 1.0; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, 20); ctx.lineTo(-4, 17);
  ctx.moveTo(5, 20); ctx.lineTo(4, 17);
  ctx.moveTo(-2, 20); ctx.lineTo(-2, 17);
  ctx.moveTo(3, 20); ctx.lineTo(3, 17);
  ctx.stroke();
}

function drawCutsceneStart(ctx) {
  drawShadow(ctx, 14, 3);
  // Speech bubble with a small play-triangle to denote "starts a scene"
  const grad = ctx.createLinearGradient(0, -12, 0, 8);
  grad.addColorStop(0, "#fbf2d4"); grad.addColorStop(1, "#d8b870");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-14, -10);
  ctx.bezierCurveTo(-14, -16, 14, -16, 14, -10);
  ctx.lineTo(14, 4);
  ctx.bezierCurveTo(14, 9, -2, 9, -4, 9);
  ctx.lineTo(-9, 14);
  ctx.lineTo(-7, 9);
  ctx.bezierCurveTo(-12, 9, -14, 6, -14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.4; ctx.stroke();
  // Play triangle inside
  ctx.fillStyle = "#c83028";
  ctx.beginPath();
  ctx.moveTo(-3, -8); ctx.lineTo(6, -3); ctx.lineTo(-3, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 0.9; ctx.stroke();
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, -10, 5, 1, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Kingdom phase markers — 5 small banners w/ distinct emblems
function drawPhaseBanner(emblem, ribbonHi, ribbonLo) {
  return function (ctx) {
    drawShadow(ctx, 12, 3);
    // Hanging banner
    const g = ctx.createLinearGradient(0, -14, 0, 12);
    g.addColorStop(0, ribbonHi); g.addColorStop(1, ribbonLo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-9, -14);
    ctx.lineTo(9, -14);
    ctx.lineTo(9, 8);
    ctx.lineTo(0, 14);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.4; ctx.stroke();
    // Pole top
    ctx.fillStyle = "#7a4818";
    rr(ctx, -10, -16, 20, 3, 1); ctx.fill();
    ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0; ctx.stroke();
    // Finial balls
    ctx.fillStyle = "#e0a020";
    ctx.beginPath();
    ctx.arc(-10, -14.5, 1.8, 0, Math.PI * 2);
    ctx.arc(10, -14.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.8; ctx.stroke();
    // Emblem
    ctx.save();
    emblem(ctx);
    ctx.restore();
    // Sheen
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(-3, -10, 4, 1, -0.2, 0, Math.PI * 2);
    ctx.fill();
  };
}

const drawPhaseFirstLight = drawPhaseBanner(function (ctx) {
  // Sunrise — half-sun with rays
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.strokeStyle = "#f8c020"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI + (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5);
    ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.stroke();
  }
  // Horizon line
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
  ctx.stroke();
}, "#f0a040", "#7a2818");

const drawPhaseNetworkWakes = drawPhaseBanner(function (ctx) {
  // Three connected dots
  ctx.fillStyle = "#fafcff";
  const pts = [[-5, -3], [5, -3], [0, 4]];
  ctx.strokeStyle = "#fafcff"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[1][0], pts[1][1]);
  ctx.lineTo(pts[2][0], pts[2][1]);
  ctx.lineTo(pts[0][0], pts[0][1]);
  ctx.stroke();
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0a0e12";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.strokeStyle = "#fafcff";
    ctx.lineWidth = 1.4;
  }
}, "#5a78a8", "#0a1c38");

const drawPhaseCharterStirs = drawPhaseBanner(function (ctx) {
  // Mini scroll + quill
  ctx.fillStyle = "#fbf2d4";
  rr(ctx, -5, -4, 10, 8, 1); ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.strokeStyle = "rgba(58,16,4,0.6)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-3, -1); ctx.lineTo(3, -1);
  ctx.moveTo(-3, 1); ctx.lineTo(2, 1);
  ctx.stroke();
  // Quill
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(2, -2); ctx.lineTo(8, -8);
  ctx.stroke();
  ctx.fillStyle = "#fafcff";
  ctx.beginPath();
  ctx.moveTo(8, -8); ctx.lineTo(7, -10); ctx.lineTo(6, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}, "#c88858", "#5a3008");

const drawPhaseOldCapital = drawPhaseBanner(function (ctx) {
  // Crown
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.lineTo(-7, -2);
  ctx.lineTo(-3, 1);
  ctx.lineTo(0, -5);
  ctx.lineTo(3, 1);
  ctx.lineTo(7, -2);
  ctx.lineTo(7, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Jewels
  ctx.fillStyle = "#c83028";
  ctx.beginPath();
  ctx.arc(0, 2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a78a8";
  ctx.beginPath();
  ctx.arc(-4, 2, 0.8, 0, Math.PI * 2);
  ctx.arc(4, 2, 0.8, 0, Math.PI * 2);
  ctx.fill();
}, "#9a3828", "#3a0808");

const drawPhaseSandbox = drawPhaseBanner(function (ctx) {
  // Infinity loop
  ctx.strokeStyle = "#fff8d0"; ctx.lineWidth = 2.0; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.bezierCurveTo(-6, -5, -8, 4, -3, 0);
  ctx.bezierCurveTo(0, -4, 2, 4, 5, 0);
  ctx.bezierCurveTo(8, -5, 6, 4, 3, 0);
  ctx.bezierCurveTo(0, -4, -2, 4, -3, 0);
  ctx.closePath();
  ctx.stroke();
}, "#6a3aa8", "#1a0a3a");

// ── Keepers / bosses ──────────────────────────────────────────────────────

function drawDeerSpirit(ctx) {
  drawShadow(ctx, 14, 3);
  // Glowing antlered deer silhouette
  // Body
  ctx.fillStyle = "#3a6018";
  ctx.beginPath();
  ctx.ellipse(0, 4, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.2; ctx.stroke();
  // Legs
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-5, 7); ctx.lineTo(-5, 14);
  ctx.moveTo(-2, 8); ctx.lineTo(-2, 14);
  ctx.moveTo(2, 8); ctx.lineTo(2, 14);
  ctx.moveTo(5, 7); ctx.lineTo(5, 14);
  ctx.stroke();
  // Neck + head
  ctx.fillStyle = "#3a6018";
  ctx.beginPath();
  ctx.moveTo(6, 2);
  ctx.bezierCurveTo(10, -4, 12, -6, 11, -8);
  ctx.bezierCurveTo(10, -10, 6, -8, 4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Antlers — branching white-ish glow
  ctx.strokeStyle = "#d8f0c8"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(9, -8); ctx.lineTo(7, -13);
  ctx.moveTo(9, -8); ctx.lineTo(12, -12);
  ctx.moveTo(7, -13); ctx.lineTo(5, -16);
  ctx.moveTo(7, -13); ctx.lineTo(9, -15);
  ctx.moveTo(12, -12); ctx.lineTo(14, -15);
  ctx.moveTo(12, -12); ctx.lineTo(11, -16);
  ctx.stroke();
  // Eye glow
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.arc(9, -6, 1, 0, Math.PI * 2);
  ctx.fill();
  // Aura
  ctx.fillStyle = "rgba(216,240,200,0.25)";
  ctx.beginPath();
  ctx.arc(2, -2, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawStoneKnocker(ctx) {
  drawShadow(ctx, 14, 3);
  // Squat boulder-imp with glowing eye-cracks
  const body = ctx.createRadialGradient(-3, -3, 1, 0, 0, 16);
  body.addColorStop(0, "#9aa4ac"); body.addColorStop(0.6, "#5a5448"); body.addColorStop(1, "#2a2420");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.bezierCurveTo(-16, -2, -10, -14, 0, -14);
  ctx.bezierCurveTo(10, -14, 16, -2, 12, 8);
  ctx.bezierCurveTo(8, 14, -8, 14, -12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Cracks
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(-4, 4); ctx.lineTo(-6, 8);
  ctx.moveTo(6, -4); ctx.lineTo(10, -2);
  ctx.stroke();
  // Glowing eyes
  ctx.fillStyle = "#f08840";
  ctx.beginPath();
  ctx.ellipse(-4, -4, 1.6, 0.9, 0, 0, Math.PI * 2);
  ctx.ellipse(4, -4, 1.6, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.arc(-4, -4, 0.6, 0, Math.PI * 2);
  ctx.arc(4, -4, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Jagged mouth
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-5, 3); ctx.lineTo(-3, 1); ctx.lineTo(-1, 3); ctx.lineTo(1, 1); ctx.lineTo(3, 3); ctx.lineTo(5, 1);
  ctx.stroke();
  // Moss patches
  ctx.fillStyle = "#5a8028";
  ctx.beginPath();
  ctx.ellipse(-10, -6, 2.4, 1, 0, 0, Math.PI * 2);
  ctx.ellipse(8, 6, 2, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTidesinger(ctx) {
  drawShadow(ctx, 14, 3);
  // Tidesinger — long-haired mermaid silhouette holding a conch
  // Body / tail
  const tail = ctx.createLinearGradient(0, -2, 0, 16);
  tail.addColorStop(0, "#3a96d4"); tail.addColorStop(1, "#0a3858");
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(-5, -2);
  ctx.bezierCurveTo(-6, 4, -3, 10, -5, 14);
  ctx.lineTo(-10, 16);
  ctx.lineTo(-3, 12);
  ctx.lineTo(0, 14);
  ctx.lineTo(3, 12);
  ctx.lineTo(10, 16);
  ctx.lineTo(5, 14);
  ctx.bezierCurveTo(3, 10, 6, 4, 5, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a1e38"; ctx.lineWidth = 1.2; ctx.stroke();
  // Torso
  ctx.fillStyle = "#e8b888";
  ctx.beginPath();
  ctx.ellipse(0, -4, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Hair — long flowing greenish
  ctx.fillStyle = "#5a8030";
  ctx.beginPath();
  ctx.moveTo(-5, -8);
  ctx.bezierCurveTo(-8, -2, -7, 4, -4, 0);
  ctx.lineTo(-2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, -8);
  ctx.bezierCurveTo(8, -2, 7, 4, 4, 0);
  ctx.lineTo(2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 0.7; ctx.stroke();
  // Head
  ctx.fillStyle = "#e8b888";
  ctx.beginPath();
  ctx.arc(0, -9, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.9; ctx.stroke();
  // Conch held up
  ctx.fillStyle = "#fbe8c8";
  ctx.beginPath();
  ctx.moveTo(7, -6); ctx.lineTo(11, -10); ctx.lineTo(11, -4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a8703a"; ctx.lineWidth = 0.8; ctx.stroke();
  // Aura
  ctx.fillStyle = "rgba(168,216,224,0.3)";
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoexistVsDriveOut(ctx) {
  drawShadow(ctx, 14, 3);
  // Two halves: olive branch (coexist) + sword (drive out)
  // Background medallion
  const med = ctx.createRadialGradient(-2, -3, 1, 0, 0, 14);
  med.addColorStop(0, "#f0d99a"); med.addColorStop(1, "#7a4818");
  ctx.fillStyle = med;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.4; ctx.stroke();
  // Split: left half tinted green, right tinted red
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 12.5, Math.PI / 2, -Math.PI / 2, false);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(74,140,58,0.45)";
  ctx.fillRect(-14, -14, 28, 28);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 12.5, -Math.PI / 2, Math.PI / 2, false);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(200,48,40,0.45)";
  ctx.fillRect(-14, -14, 28, 28);
  ctx.restore();
  // Center divider
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(0, 12);
  ctx.stroke();
  // Olive branch on left
  ctx.strokeStyle = "#2a4818"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9, 6); ctx.bezierCurveTo(-7, 0, -8, -4, -5, -8);
  ctx.stroke();
  ctx.fillStyle = "#5a8028";
  [[-9, 2], [-7, -1], [-7, -4], [-5, -6]].forEach(([x, y], i) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 1.6, 0.9, (i % 2 === 0 ? -0.4 : 0.4), 0, Math.PI * 2);
    ctx.fill();
  });
  // Sword on right
  ctx.fillStyle = "#dadfe6";
  ctx.beginPath();
  ctx.moveTo(6, -8); ctx.lineTo(8, -8); ctx.lineTo(9, 4); ctx.lineTo(5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.fillStyle = "#3a1c08";
  ctx.fillRect(4, 4, 6, 1.2);
  ctx.fillRect(6, 5.2, 2, 4);
}

function drawAuditBell(ctx) {
  drawShadow(ctx, 13, 3);
  // Hanging crossbar
  ctx.fillStyle = "#7a4818";
  rr(ctx, -12, -16, 24, 2.6, 0.6); ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0; ctx.stroke();
  // Rope
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(0, -10);
  ctx.stroke();
  // Bell body
  const bell = ctx.createLinearGradient(0, -10, 0, 10);
  bell.addColorStop(0, "#f8d050"); bell.addColorStop(0.5, "#c8902a"); bell.addColorStop(1, "#5a3008");
  ctx.fillStyle = bell;
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.bezierCurveTo(-10, 0, -7, -10, 0, -10);
  ctx.bezierCurveTo(7, -10, 10, 0, 8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.4; ctx.stroke();
  // Rim
  ctx.fillStyle = "#5a3008";
  rr(ctx, -10, 7, 20, 4, 1); ctx.fill();
  ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.0; ctx.stroke();
  // Clapper
  ctx.fillStyle = "#3a1c08";
  ctx.beginPath();
  ctx.arc(0, 12, 2, 0, Math.PI * 2);
  ctx.fill();
  // Sound waves
  ctx.strokeStyle = "#c83028"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, -2); ctx.bezierCurveTo(-15, 0, -15, 4, -13, 6);
  ctx.moveTo(12, -2); ctx.bezierCurveTo(15, 0, 15, 4, 13, 6);
  ctx.stroke();
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-3, -5, 2, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBossDifficultyStars(ctx) {
  drawShadow(ctx, 16, 3);
  // Panel + 5 stars in a row with 3 lit, 2 dim — generic indicator
  const grad = ctx.createLinearGradient(0, -10, 0, 10);
  grad.addColorStop(0, "#5a4a3a"); grad.addColorStop(1, "#2a1c10");
  ctx.fillStyle = grad;
  rr(ctx, -16, -7, 32, 14, 3); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Stars
  for (let i = 0; i < 5; i++) {
    const x = -12 + i * 6;
    const lit = i < 3;
    ctx.fillStyle = lit ? "#f8d050" : "#3a2818";
    star(ctx, x, 0, 3.0, 1.2, 5);
    ctx.fill();
    ctx.strokeStyle = lit ? "#7a4818" : "#1a0e04";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  rr(ctx, -15, -6, 30, 2, 1);
  ctx.fill();
}

// ── Bonds & townsfolk ─────────────────────────────────────────────────────

function drawBondRank(n) {
  return function (ctx) {
    drawShadow(ctx, 12, 3);
    // Heart with rank stamped on it
    const grad = ctx.createRadialGradient(-3, -5, 1, 0, 0, 14);
    grad.addColorStop(0, "#f880a0"); grad.addColorStop(0.6, "#c83048"); grad.addColorStop(1, "#5a0818");
    ctx.fillStyle = grad;
    heart(ctx, 0, -1, 11);
    ctx.fill();
    ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 1.4; ctx.stroke();
    // Glow
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(-4, -6, 2.4, 1, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Rank ring (gold for 8, silver for 4-7, copper for 1-3)
    let ring;
    if (n === 8) ring = "#f0c040";
    else if (n >= 4) ring = "#dadfe6";
    else ring = "#c88858";
    // Rank number on a small medallion in the bottom
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(7, 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.0; ctx.stroke();
    ctx.fillStyle = "#1a0408";
    ctx.font = "bold 7px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(n), 7, 6.4);
  };
}

function drawGiftLoves(ctx) {
  drawShadow(ctx, 12, 3);
  // Heart with sparkle stars around it
  const grad = ctx.createRadialGradient(-3, -5, 1, 0, 0, 14);
  grad.addColorStop(0, "#f880a0"); grad.addColorStop(0.6, "#c83048"); grad.addColorStop(1, "#5a0818");
  ctx.fillStyle = grad;
  heart(ctx, 0, 0, 9);
  ctx.fill();
  ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 1.4; ctx.stroke();
  // Inner sheen
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-3, -4, 2, 0.9, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Three sparkles
  ctx.fillStyle = "#f8d050";
  [[-10, -8, 2.2], [11, -6, 2.4], [9, 8, 2.0]].forEach(([x, y, s]) => {
    star(ctx, x, y, s, s * 0.4, 4);
    ctx.fill();
    ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 0.6;
    ctx.stroke();
  });
}

function drawGiftLikes(ctx) {
  drawShadow(ctx, 12, 3);
  // Thumbs-up gesture — stylized
  // Sleeve cuff
  ctx.fillStyle = "#3a6018";
  rr(ctx, -8, 8, 16, 6, 1); ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.2; ctx.stroke();
  // Hand fist
  const skin = ctx.createLinearGradient(0, -10, 0, 10);
  skin.addColorStop(0, "#f0c8a0"); skin.addColorStop(1, "#a8703a");
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.lineTo(-8, -2);
  ctx.bezierCurveTo(-8, -6, -4, -8, 2, -8);
  ctx.lineTo(2, -10);
  ctx.bezierCurveTo(2, -14, 8, -14, 8, -10);
  ctx.lineTo(8, -3);
  ctx.bezierCurveTo(10, -1, 10, 6, 8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.4; ctx.stroke();
  // Knuckle lines
  ctx.strokeStyle = "rgba(90,48,8,0.6)"; ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-4, 0); ctx.lineTo(2, 0);
  ctx.moveTo(-4, 4); ctx.lineTo(2, 4);
  ctx.stroke();
  // Highlight on thumb
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(5, -10, 1, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBond8Arc(ctx) {
  drawShadow(ctx, 13, 3);
  // Heart with golden key crossing it — "arc unlocked"
  const grad = ctx.createRadialGradient(-3, -5, 1, 0, 0, 14);
  grad.addColorStop(0, "#f880a0"); grad.addColorStop(0.6, "#c83048"); grad.addColorStop(1, "#5a0818");
  ctx.fillStyle = grad;
  heart(ctx, 0, -1, 10);
  ctx.fill();
  ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 1.4; ctx.stroke();
  // Key — diagonal gold
  ctx.save();
  ctx.translate(2, 2);
  ctx.rotate(0.6);
  // Shaft
  ctx.strokeStyle = "#f0c040"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9, 0); ctx.lineTo(6, 0);
  ctx.stroke();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.8;
  ctx.stroke();
  // Bow
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.arc(8, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.arc(8, 0, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Teeth
  ctx.fillStyle = "#f0c040";
  ctx.fillRect(-9, 0.6, 2, 2.4);
  ctx.fillRect(-6, 0.6, 1.4, 1.6);
  ctx.strokeRect(-9, 0.6, 2, 2.4);
  ctx.strokeRect(-6, 0.6, 1.4, 1.6);
  ctx.restore();
  // Sparkle
  ctx.fillStyle = "#fff080";
  star(ctx, 12, -8, 2.4, 0.8, 4);
  ctx.fill();
}

function drawVillagerWalking(ctx) {
  drawShadow(ctx, 10, 3);
  // Simple traveler silhouette mid-stride
  // Head
  ctx.fillStyle = "#e8b888";
  ctx.beginPath();
  ctx.arc(0, -10, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Hat
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(-5, -10); ctx.lineTo(0, -16); ctx.lineTo(5, -10); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-5, -10, 10, 1.4);
  // Torso
  ctx.fillStyle = "#5a78a8";
  ctx.beginPath();
  ctx.moveTo(-5, -6); ctx.lineTo(5, -6); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1c40"; ctx.lineWidth = 1.0; ctx.stroke();
  // Walking-pose legs (one forward, one back)
  ctx.fillStyle = "#3a2818";
  ctx.beginPath();
  ctx.moveTo(-4, 4); ctx.lineTo(-7, 14); ctx.lineTo(-4, 14); ctx.lineTo(-2, 6); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, 4); ctx.lineTo(6, 14); ctx.lineTo(3, 14); ctx.lineTo(2, 6); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Walking staff
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(6, -2); ctx.lineTo(9, 14);
  ctx.stroke();
  // Motion lines
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.lineTo(-9, 0);
  ctx.moveTo(-13, 4); ctx.lineTo(-9, 4);
  ctx.stroke();
}

// ── Banner emblems (5 variants) ───────────────────────────────────────────

function bannerEmblem(emblemFn, hi, lo) {
  return function (ctx) {
    drawShadow(ctx, 13, 3);
    // Vertical hanging banner
    const g = ctx.createLinearGradient(0, -14, 0, 14);
    g.addColorStop(0, hi); g.addColorStop(1, lo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(10, -14);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 16);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.4; ctx.stroke();
    // Gold rod
    ctx.fillStyle = "#e0a020";
    rr(ctx, -11, -16, 22, 2.4, 0.6); ctx.fill();
    ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.9; ctx.stroke();
    // Emblem
    ctx.save();
    emblemFn(ctx);
    ctx.restore();
    // Sheen
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(-4, -10, 4, 1, -0.3, 0, Math.PI * 2);
    ctx.fill();
  };
}

const drawBannerAcorn = bannerEmblem(function (ctx) {
  // Acorn — forest tribe
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(-5, -2); ctx.bezierCurveTo(-5, 6, 5, 6, 5, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.fillStyle = "#5a3008";
  ctx.beginPath();
  ctx.ellipse(0, -3, 6, 3.6, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#3a1c08";
  ctx.fillRect(-0.6, -8, 1.2, 4);
  ctx.strokeStyle = "rgba(58,28,8,0.5)"; ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-4, -3); ctx.lineTo(4, -3);
  ctx.stroke();
}, "#5a8030", "#1a3008");

const drawBannerHammer = bannerEmblem(function (ctx) {
  // Crossed hammers — stone tribe
  for (let i = 0; i < 2; i++) {
    ctx.save();
    ctx.rotate(i === 0 ? -Math.PI / 5 : Math.PI / 5);
    ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 7); ctx.lineTo(0, -3);
    ctx.stroke();
    ctx.fillStyle = "#9aa4ac";
    rr(ctx, -4, -7, 8, 4, 1); ctx.fill();
    ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.restore();
  }
}, "#7a8088", "#1a2030");

const drawBannerWave = bannerEmblem(function (ctx) {
  // Stylized wave — tide tribe
  ctx.fillStyle = "#fafcff";
  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.bezierCurveTo(-7, -2, -4, -6, 0, -4);
  ctx.bezierCurveTo(4, -2, 7, -6, 7, 0);
  ctx.lineTo(7, 6);
  ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a1c38"; ctx.lineWidth = 1.0; ctx.stroke();
  // Wave foam dots
  ctx.fillStyle = "#fafcff";
  [[ -4, -4 ], [ 0, -6 ], [ 4, -4 ]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  });
}, "#3a96d4", "#0a3858");

const drawBannerSun = bannerEmblem(function (ctx) {
  // Phoenix sun — capital
  ctx.fillStyle = "#f8d050";
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.strokeStyle = "#fff080"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5);
    ctx.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5);
    ctx.stroke();
  }
}, "#c83028", "#3a0408");

const drawBannerHearth = bannerEmblem(function (ctx) {
  // Hearth flame — bond / common-folk
  ctx.fillStyle = "#5a3008";
  rr(ctx, -7, 3, 14, 5, 1); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9; ctx.stroke();
  // Flame
  const flame = ctx.createLinearGradient(0, -8, 0, 4);
  flame.addColorStop(0, "#fffae0"); flame.addColorStop(0.5, "#f8b020"); flame.addColorStop(1, "#c83028");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-5, 3);
  ctx.bezierCurveTo(-6, -3, 0, -5, 0, -9);
  ctx.bezierCurveTo(2, -5, 6, -3, 5, 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a1808"; ctx.lineWidth = 0.8; ctx.stroke();
}, "#e0a020", "#5a3008");

// ── Settlements / map ─────────────────────────────────────────────────────

function drawSettlementFounded(ctx) {
  drawShadow(ctx, 14, 3);
  // House with flag staked
  // Walls
  const wall = ctx.createLinearGradient(0, -2, 0, 14);
  wall.addColorStop(0, "#fbf2d4"); wall.addColorStop(1, "#a8703a");
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.rect(-9, -2, 18, 16);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.2; ctx.stroke();
  // Roof
  ctx.fillStyle = "#7a3014";
  ctx.beginPath();
  ctx.moveTo(-11, -2); ctx.lineTo(0, -12); ctx.lineTo(11, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1004"; ctx.lineWidth = 1.2; ctx.stroke();
  // Door
  ctx.fillStyle = "#5a3008";
  rr(ctx, -2, 4, 4, 10, 0.6); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9; ctx.stroke();
  // Window
  ctx.fillStyle = "#f0c040";
  rr(ctx, 3, 1, 4, 4, 0.6); ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.7; ctx.stroke();
  // Flag pole
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(7, -12); ctx.lineTo(7, -19);
  ctx.stroke();
  // Flag
  ctx.fillStyle = "#c83028";
  ctx.beginPath();
  ctx.moveTo(7, -19); ctx.lineTo(13, -17); ctx.lineTo(7, -15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 0.9; ctx.stroke();
  // Roof highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(-6, -4); ctx.lineTo(-1, -10); ctx.lineTo(0, -8); ctx.lineTo(-5, -3);
  ctx.closePath();
  ctx.fill();
}

function drawSettlementUnfounded(ctx) {
  drawShadow(ctx, 14, 3);
  // Dashed-outline plot with a small "claim" stake
  ctx.setLineDash([3, 2]);
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.rect(-12, -10, 24, 22);
  ctx.stroke();
  ctx.setLineDash([]);
  // Dim ground fill
  ctx.fillStyle = "rgba(122,72,24,0.18)";
  ctx.fillRect(-12, -10, 24, 22);
  // Stake — wooden post + flag
  ctx.fillStyle = "#7a4818";
  rr(ctx, -1.2, -4, 2.4, 16, 0.5); ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 0.9; ctx.stroke();
  // Small triangle flag
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.moveTo(1, -4); ctx.lineTo(8, -1); ctx.lineTo(1, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.9; ctx.stroke();
  // "?" inside
  ctx.fillStyle = "#3a1c08";
  ctx.font = "bold 8px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("?", 6, 8);
}

function drawSettlementComplete(ctx) {
  drawShadow(ctx, 14, 3);
  // Same house but with a green check rosette
  drawSettlementFounded(ctx);
  // Reset shadow (already done)
  // Rosette
  ctx.fillStyle = "#4a8c3a";
  ctx.beginPath();
  ctx.arc(-9, -10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Check
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-11.4, -10); ctx.lineTo(-9.4, -8); ctx.lineTo(-6.8, -12);
  ctx.stroke();
}

function drawOldCapitalSeal(ctx) {
  drawShadow(ctx, 14, 3);
  // Royal wax seal with crown imprint
  const wax = ctx.createRadialGradient(-3, -3, 1, 0, 0, 14);
  wax.addColorStop(0, "#f88848"); wax.addColorStop(0.55, "#a82018"); wax.addColorStop(1, "#3a0408");
  ctx.fillStyle = wax;
  ctx.beginPath();
  const pts = [[0,-13],[7,-10],[12,-3],[12,5],[7,11],[0,13],[-7,11],[-12,5],[-12,-3],[-7,-10]];
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 1.4; ctx.stroke();
  // Crown imprint
  ctx.fillStyle = "rgba(58,4,8,0.7)";
  ctx.beginPath();
  ctx.moveTo(-6, 2); ctx.lineTo(-6, -4); ctx.lineTo(-3, -1); ctx.lineTo(0, -6); ctx.lineTo(3, -1); ctx.lineTo(6, -4); ctx.lineTo(6, 2);
  ctx.closePath();
  ctx.fill();
  // Crown band
  ctx.fillRect(-6, 2, 12, 1.4);
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-5, -7, 2, 1, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrossroads(ctx) {
  drawShadow(ctx, 14, 3);
  // Tall post with two signpost arrows pointing opposite ways
  ctx.fillStyle = "#7a4818";
  rr(ctx, -1.6, -12, 3.2, 26, 0.7); ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0; ctx.stroke();
  // Top sign — right pointing
  const top = ctx.createLinearGradient(0, -10, 0, -2);
  top.addColorStop(0, "#c89060"); top.addColorStop(1, "#7a4818");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(-10, -10); ctx.lineTo(8, -10); ctx.lineTo(13, -6); ctx.lineTo(8, -2); ctx.lineTo(-10, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2; ctx.stroke();
  // Bottom sign — left pointing
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(10, 0); ctx.lineTo(-8, 0); ctx.lineTo(-13, 4); ctx.lineTo(-8, 8); ctx.lineTo(10, 8);
  ctx.closePath(); ctx.fill();
  ctx.stroke();
  // Carved arrows
  ctx.strokeStyle = "rgba(58,28,8,0.7)"; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-4, -6); ctx.lineTo(5, -6);
  ctx.moveTo(4, -6); ctx.lineTo(7, -6);
  ctx.moveTo(4, 4); ctx.lineTo(-5, 4);
  ctx.stroke();
  // Grass
  ctx.strokeStyle = "#3a6014"; ctx.lineWidth = 1.0; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, 18); ctx.lineTo(-4, 14);
  ctx.moveTo(5, 18); ctx.lineTo(4, 14);
  ctx.stroke();
}

function drawFestival(ctx) {
  drawShadow(ctx, 14, 3);
  // Bunting line + stars
  // Pole
  ctx.fillStyle = "#7a4818";
  rr(ctx, -1, -2, 2, 16, 0.5); ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 0.9; ctx.stroke();
  // Tent top (cone)
  const tent = ctx.createLinearGradient(0, -16, 0, -2);
  tent.addColorStop(0, "#f0c040"); tent.addColorStop(1, "#c83028");
  ctx.fillStyle = tent;
  ctx.beginPath();
  ctx.moveTo(-12, -2); ctx.lineTo(0, -16); ctx.lineTo(12, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 1.4; ctx.stroke();
  // Stripes
  ctx.strokeStyle = "#fbf2d4"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, -2); ctx.lineTo(-4, -10);
  ctx.moveTo(0, -2); ctx.lineTo(0, -14);
  ctx.moveTo(8, -2); ctx.lineTo(4, -10);
  ctx.stroke();
  // Pennant flag on top
  ctx.fillStyle = "#fafcff";
  ctx.beginPath();
  ctx.moveTo(0, -16); ctx.lineTo(6, -19); ctx.lineTo(0, -19);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.8; ctx.stroke();
  // Tent base
  ctx.fillStyle = "#5a3008";
  rr(ctx, -13, -2, 26, 4, 1); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  // Sparkle stars
  ctx.fillStyle = "#f8d050";
  star(ctx, -10, -12, 1.8, 0.7, 4);
  ctx.fill();
  star(ctx, 11, -10, 1.6, 0.7, 4);
  ctx.fill();
}

function regionPip(emblemFn, hi, lo) {
  return function (ctx) {
    drawShadow(ctx, 11, 3);
    const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, 12);
    g.addColorStop(0, hi); g.addColorStop(1, lo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
    // Inset
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    emblemFn(ctx);
    ctx.restore();
    // Sheen
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 11, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
  };
}

const drawRegionForest = regionPip(function (ctx) {
  // Pine tree
  ctx.fillStyle = "#3a6018";
  ctx.beginPath();
  ctx.moveTo(-6, 4); ctx.lineTo(0, -7); ctx.lineTo(6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.fillStyle = "#5a3008";
  ctx.fillRect(-1, 4, 2, 3);
}, "#5a8030", "#1a3008");

const drawRegionMoor = regionPip(function (ctx) {
  // Rolling hills + grass tuft
  ctx.fillStyle = "#a8703a";
  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.bezierCurveTo(-5, -1, -3, -1, -1, 2);
  ctx.bezierCurveTo(1, 5, 3, -1, 7, 1);
  ctx.lineTo(7, 5);
  ctx.lineTo(-7, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.9; ctx.stroke();
  // Grass tufts
  ctx.strokeStyle = "#7a8030"; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, 0); ctx.lineTo(-3, -3);
  ctx.moveTo(-1, 0); ctx.lineTo(-1, -3);
  ctx.moveTo(0, 0); ctx.lineTo(1, -3);
  ctx.stroke();
}, "#c89060", "#5a3008");

const drawRegionMine = regionPip(function (ctx) {
  // Mountain with mine entrance
  ctx.fillStyle = "#7a8088";
  ctx.beginPath();
  ctx.moveTo(-7, 5); ctx.lineTo(-2, -5); ctx.lineTo(2, 0); ctx.lineTo(5, -7); ctx.lineTo(8, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9; ctx.stroke();
  // Snow caps
  ctx.fillStyle = "#fafcff";
  ctx.beginPath();
  ctx.moveTo(-3, -3); ctx.lineTo(-2, -5); ctx.lineTo(-1, -3);
  ctx.moveTo(4, -4); ctx.lineTo(5, -7); ctx.lineTo(6, -4);
  ctx.closePath(); ctx.fill();
}, "#9aa4ac", "#2a2420");

const drawRegionHarbor = regionPip(function (ctx) {
  // Anchor
  ctx.strokeStyle = "#fafcff"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -5); ctx.lineTo(0, 4);
  ctx.moveTo(-2.5, -5); ctx.lineTo(2.5, -5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -6, 1.6, 0, Math.PI * 2);
  ctx.stroke();
  // Curve at bottom
  ctx.beginPath();
  ctx.arc(0, 1, 5, Math.PI * 0.05, Math.PI * 0.95);
  ctx.stroke();
}, "#3a96d4", "#0a3858");

const drawRegionTundra = regionPip(function (ctx) {
  // Snowflake
  ctx.strokeStyle = "#fafcff"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(0, 6);
    ctx.moveTo(-2, -4); ctx.lineTo(0, -6); ctx.lineTo(2, -4);
    ctx.moveTo(-2, 4); ctx.lineTo(0, 6); ctx.lineTo(2, 4);
    ctx.stroke();
    ctx.restore();
  }
}, "#c8e0f0", "#3a78b0");

// ── Boons & abilities ─────────────────────────────────────────────────────

function multiplierBadge(ctx) {
  // ×N badge in the corner — small gold circle with "×"
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.arc(8, -8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.fillStyle = "#3a1c08";
  ctx.font = "bold 6px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("×", 8, -8);
}

function drawBoonCoin(ctx) {
  drawShadow(ctx, 12, 3);
  // Big embers coin
  const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
  grad.addColorStop(0, "#f8d050"); grad.addColorStop(0.6, "#d6612a"); grad.addColorStop(1, "#5a1808");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 1.4; ctx.stroke();
  // Ember glyph
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.bezierCurveTo(4, -3, 4, 4, 0, 6); ctx.bezierCurveTo(-4, 4, -4, -3, 0, -6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#7a1808"; ctx.lineWidth = 0.8; ctx.stroke();
  multiplierBadge(ctx);
}

function drawBoonBond(ctx) {
  drawShadow(ctx, 12, 3);
  const grad = ctx.createRadialGradient(-3, -5, 1, 0, 0, 14);
  grad.addColorStop(0, "#f880a0"); grad.addColorStop(0.6, "#c83048"); grad.addColorStop(1, "#5a0818");
  ctx.fillStyle = grad;
  heart(ctx, 0, -1, 10);
  ctx.fill();
  ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-3, -5, 2, 0.9, -0.4, 0, Math.PI * 2);
  ctx.fill();
  multiplierBadge(ctx);
}

function drawBoonChain(ctx) {
  drawShadow(ctx, 12, 3);
  // 3 chain links horizontally
  ctx.strokeStyle = "#3a1c04"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.fillStyle = "#f0c040";
  [-7, 0, 7].forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, 0, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Highlights
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 0.8;
  [-7, 0, 7].forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, -1, 2.4, 1.4, 0, 0, Math.PI);
    ctx.stroke();
  });
  multiplierBadge(ctx);
}

function drawBoonBranchCoexist(ctx) {
  drawShadow(ctx, 14, 3);
  // Tree silhouette branching out with leaves
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 14); ctx.lineTo(0, -4);
  ctx.moveTo(0, -2); ctx.lineTo(-7, -6);
  ctx.moveTo(0, -2); ctx.lineTo(7, -6);
  ctx.moveTo(0, -7); ctx.lineTo(0, -12);
  ctx.stroke();
  // Leaves (warm coexist palette — green w/ gold)
  ctx.fillStyle = "#5a8030";
  [[-7, -6, 3.4], [7, -6, 3.4], [0, -12, 3.8], [-3, -10, 2.4], [3, -10, 2.4]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 0.9;
  [[-7, -6, 3.4], [7, -6, 3.4], [0, -12, 3.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Golden fruit (ember)
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.arc(0, -8, 1.6, 0, Math.PI * 2);
  ctx.arc(-5, -4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.6; ctx.stroke();
}

function drawBoonBranchDriveOut(ctx) {
  drawShadow(ctx, 14, 3);
  // Bare branch + sword/spike tips — colder, harsher
  ctx.strokeStyle = "#3a2818"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 14); ctx.lineTo(0, -8);
  ctx.moveTo(0, -2); ctx.lineTo(-7, -6);
  ctx.moveTo(0, -2); ctx.lineTo(7, -6);
  ctx.stroke();
  // Spike tips (iron)
  ctx.fillStyle = "#dadfe6";
  [[0, -12, [-2, -8], [2, -8]], [-7, -10, [-9, -6], [-5, -6]], [7, -10, [5, -6], [9, -6]]].forEach(([tx, ty, p1, p2]) => {
    ctx.beginPath();
    ctx.moveTo(tx, ty); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9;
    ctx.stroke();
  });
  // Cold blue glow
  ctx.fillStyle = "rgba(58,120,176,0.3)";
  ctx.beginPath();
  ctx.arc(0, -8, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawAbilityTrigger(ctx) {
  drawShadow(ctx, 12, 3);
  // A building silhouette with a bright spark/exclamation overlay
  // Mini building (simplified roof + walls)
  ctx.fillStyle = "#c89060";
  ctx.fillRect(-8, -2, 16, 12);
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.2; ctx.strokeRect(-8, -2, 16, 12);
  ctx.fillStyle = "#7a3014";
  ctx.beginPath();
  ctx.moveTo(-10, -2); ctx.lineTo(0, -10); ctx.lineTo(10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Window
  ctx.fillStyle = "#f0c040";
  ctx.fillRect(-2, 1, 4, 4);
  ctx.strokeRect(-2, 1, 4, 4);
  // Spark burst on top
  ctx.fillStyle = "#f8d050";
  star(ctx, 8, -10, 5.0, 1.8, 8);
  ctx.fill();
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 0.9; ctx.stroke();
  // "!" inside
  ctx.fillStyle = "#3a1c08";
  ctx.font = "bold 6px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("!", 8, -10);
}

// ── Seasons & time ────────────────────────────────────────────────────────

function seasonPip(emblemFn, hi, lo) {
  return function (ctx) {
    drawShadow(ctx, 12, 3);
    const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, 13);
    g.addColorStop(0, hi); g.addColorStop(1, lo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.save();
    emblemFn(ctx);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 11, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
  };
}

const drawSeasonSpring = seasonPip(function (ctx) {
  // Cherry blossom 5-petal
  ctx.fillStyle = "#f8b8d0";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 3.5, Math.sin(a) * 3.5, 2.6, 2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#c84088"; ctx.lineWidth = 0.7;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 3.5, Math.sin(a) * 3.5, 2.6, 2, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#f8d050";
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();
}, "#a8e07a", "#3a6018");

const drawSeasonSummer = seasonPip(function (ctx) {
  // Sun
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.strokeStyle = "#f8d050"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5);
    ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.stroke();
  }
}, "#f8d050", "#a85008");

const drawSeasonAutumn = seasonPip(function (ctx) {
  // Falling leaf
  ctx.fillStyle = "#d4642a";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.bezierCurveTo(7, -5, 7, 5, 0, 7);
  ctx.bezierCurveTo(-7, 5, -7, -5, 0, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a2810"; ctx.lineWidth = 1.0; ctx.stroke();
  // Vein
  ctx.strokeStyle = "#7a2810"; ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(0, 7);
  ctx.moveTo(0, -3); ctx.lineTo(3, -1);
  ctx.moveTo(0, -3); ctx.lineTo(-3, -1);
  ctx.moveTo(0, 1); ctx.lineTo(3, 3);
  ctx.moveTo(0, 1); ctx.lineTo(-3, 3);
  ctx.stroke();
}, "#f0a040", "#7a2810");

const drawSeasonWinter = seasonPip(function (ctx) {
  // Snowflake (6-arm)
  ctx.strokeStyle = "#fafcff"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(0, 7);
    ctx.moveTo(-2, -5); ctx.lineTo(0, -7); ctx.lineTo(2, -5);
    ctx.moveTo(-2, 5); ctx.lineTo(0, 7); ctx.lineTo(2, 5);
    ctx.moveTo(-2, 0); ctx.lineTo(2, 0);
    ctx.stroke();
    ctx.restore();
  }
}, "#a8d8e0", "#1a4868");

function drawTurnsRemaining(ctx) {
  drawShadow(ctx, 13, 3);
  // Rose-coloured chip with hourglass
  const grad = ctx.createLinearGradient(0, -10, 0, 10);
  grad.addColorStop(0, "#f880a0"); grad.addColorStop(1, "#7a1838");
  ctx.fillStyle = grad;
  rr(ctx, -13, -10, 26, 20, 4); ctx.fill();
  ctx.strokeStyle = "#3a0418"; ctx.lineWidth = 1.4; ctx.stroke();
  // Hourglass
  ctx.fillStyle = "#fff0d0";
  ctx.beginPath();
  ctx.moveTo(-5, -6); ctx.lineTo(5, -6); ctx.lineTo(1, 0); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.lineTo(-1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0418"; ctx.lineWidth = 1.0; ctx.stroke();
  // Sand (top + bottom)
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.moveTo(-4, -6); ctx.lineTo(4, -6); ctx.lineTo(0, -1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3, 6); ctx.lineTo(3, 6); ctx.lineTo(0, 3);
  ctx.closePath();
  ctx.fill();
  // End caps
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-6, -8, 12, 1.4);
  ctx.fillRect(-6, 6.6, 12, 1.4);
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  rr(ctx, -12, -9, 24, 3, 2);
  ctx.fill();
}

function drawDayNight(ctx) {
  drawShadow(ctx, 13, 3);
  // Sun-moon split circle
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.arc(0, 0, 11, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a2e4a";
  ctx.beginPath();
  ctx.arc(0, 0, 11, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.stroke();
  // Sun rays on right
  ctx.strokeStyle = "#f8d050"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 3 + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
    ctx.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5);
    ctx.stroke();
  }
  // Stars on left
  ctx.fillStyle = "#fafcff";
  [[-7, -4], [-5, 5], [-8, 1]].forEach(([x, y]) => {
    star(ctx, x, y, 1.2, 0.4, 4);
    ctx.fill();
  });
  // Divider line
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -11); ctx.lineTo(0, 11);
  ctx.stroke();
}

// ── System / UI ───────────────────────────────────────────────────────────

function drawXPLevelUp(ctx) {
  drawShadow(ctx, 12, 3);
  // Upward chevron with sparkles — "level up"
  // Chevron
  const grad = ctx.createLinearGradient(0, -10, 0, 10);
  grad.addColorStop(0, "#5ae878"); grad.addColorStop(1, "#1a6a18");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-10, 2); ctx.lineTo(0, -10); ctx.lineTo(10, 2); ctx.lineTo(5, 2); ctx.lineTo(5, 10); ctx.lineTo(-5, 10); ctx.lineTo(-5, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.4; ctx.stroke();
  // "XP" or up-text
  ctx.fillStyle = "#fff";
  ctx.font = "bold 6px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("XP", 0, 5);
  // Sparkles
  ctx.fillStyle = "#fff080";
  [[-10, -8, 2], [10, -6, 2.2], [-8, 8, 1.6]].forEach(([x, y, s]) => {
    star(ctx, x, y, s, s * 0.4, 4);
    ctx.fill();
  });
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.moveTo(-5, 0); ctx.lineTo(0, -7); ctx.lineTo(-2, 0);
  ctx.closePath();
  ctx.fill();
}

function drawDailyChest(ctx) {
  drawShadow(ctx, 14, 3);
  // Treasure chest with rays of light
  // Rays behind
  ctx.fillStyle = "rgba(248,208,80,0.35)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
  }
  ctx.closePath();
  ctx.fill();
  // Chest body
  const body = ctx.createLinearGradient(0, -2, 0, 12);
  body.addColorStop(0, "#a86838"); body.addColorStop(1, "#5a2810");
  ctx.fillStyle = body;
  rr(ctx, -12, -2, 24, 14, 1); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Lid
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(-12, -2); ctx.bezierCurveTo(-12, -10, 12, -10, 12, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Bands
  ctx.fillStyle = "#f0c040";
  ctx.fillRect(-12, 4, 24, 2);
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.7;
  ctx.strokeRect(-12, 4, 24, 2);
  // Lock
  ctx.fillStyle = "#f0c040";
  rr(ctx, -3, -2, 6, 6, 0.6); ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.fillStyle = "#3a1c08";
  ctx.beginPath();
  ctx.arc(0, 1, 1, 0, Math.PI * 2);
  ctx.fill();
  // Gold coins poking from under lid
  ctx.fillStyle = "#f8d050";
  ctx.beginPath();
  ctx.arc(-7, -3, 2, 0, Math.PI * 2);
  ctx.arc(6, -2, 1.8, 0, Math.PI * 2);
  ctx.arc(3, -4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 0.7; ctx.stroke();
}

function drawTutorialHint(ctx) {
  drawShadow(ctx, 12, 3);
  // Lightbulb
  // Filament glow halo
  ctx.fillStyle = "rgba(248,208,80,0.5)";
  ctx.beginPath();
  ctx.arc(0, -4, 12, 0, Math.PI * 2);
  ctx.fill();
  // Bulb
  const bulb = ctx.createRadialGradient(-2, -8, 1, 0, -4, 10);
  bulb.addColorStop(0, "#fff8c8"); bulb.addColorStop(0.7, "#f8d050"); bulb.addColorStop(1, "#a85008");
  ctx.fillStyle = bulb;
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.bezierCurveTo(-9, -4, -6, -12, 0, -12);
  ctx.bezierCurveTo(6, -12, 9, -4, 6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 1.4; ctx.stroke();
  // Filament
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-2, -2); ctx.lineTo(-1, -6); ctx.lineTo(1, -6); ctx.lineTo(2, -2);
  ctx.stroke();
  // Screw cap
  ctx.fillStyle = "#7a8088";
  rr(ctx, -5, 4, 10, 4, 0.6); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.fillRect(-4, 8, 8, 2);
  ctx.strokeRect(-4, 8, 8, 2);
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-3, -7, 2, 1, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawNotifSuccess(ctx) {
  drawShadow(ctx, 12, 3);
  const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
  grad.addColorStop(0, "#a8e078"); grad.addColorStop(0.6, "#4a8c3a"); grad.addColorStop(1, "#1a3008");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.4; ctx.stroke();
  // Check
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-5, 0); ctx.lineTo(-1, 4); ctx.lineTo(6, -4);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 10, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
}

function drawNotifFail(ctx) {
  drawShadow(ctx, 12, 3);
  const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
  grad.addColorStop(0, "#f88060"); grad.addColorStop(0.6, "#c83028"); grad.addColorStop(1, "#3a0408");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 1.4; ctx.stroke();
  // X mark
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
  ctx.moveTo(5, -5); ctx.lineTo(-5, 5);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 10, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
}

function drawCraftQueueInProgress(ctx) {
  drawShadow(ctx, 12, 3);
  // Hourglass with spinning sand and clock arc behind
  // Clock arc backdrop
  ctx.strokeStyle = "rgba(58,28,8,0.4)"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 12, -Math.PI / 2, Math.PI);
  ctx.stroke();
  // Hourglass frame
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-7, -10, 14, 1.8);
  ctx.fillRect(-7, 8.2, 14, 1.8);
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-7, -10, 14, 1.8);
  ctx.strokeRect(-7, 8.2, 14, 1.8);
  // Glass
  ctx.fillStyle = "#fbf2d4";
  ctx.beginPath();
  ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(1, 0); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.lineTo(-1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.4; ctx.stroke();
  // Top sand draining
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.moveTo(-5, -8); ctx.lineTo(5, -8); ctx.lineTo(1, -1); ctx.lineTo(-1, -1);
  ctx.closePath();
  ctx.fill();
  // Stream
  ctx.fillStyle = "#f0c040";
  ctx.fillRect(-0.6, -1, 1.2, 5);
  // Bottom sand mound
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.moveTo(-4, 8); ctx.lineTo(4, 8); ctx.bezierCurveTo(2, 4, -2, 4, -4, 8);
  ctx.closePath();
  ctx.fill();
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(-5, -7); ctx.lineTo(-2, -7); ctx.lineTo(-3, -3);
  ctx.closePath();
  ctx.fill();
}

function drawCraftQueueSkipGem(ctx) {
  drawShadow(ctx, 12, 3);
  // Gem with a fast-forward arrow overlay
  // Gem
  const grad = ctx.createLinearGradient(0, -10, 0, 10);
  grad.addColorStop(0, "#f8a0d8"); grad.addColorStop(0.5, "#e85aa8"); grad.addColorStop(1, "#7a1858");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -10); ctx.lineTo(8, -4); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.lineTo(-8, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0438"; ctx.lineWidth = 1.4; ctx.stroke();
  // Facets
  ctx.strokeStyle = "#3a0438"; ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-8, -4); ctx.lineTo(0, -4); ctx.lineTo(8, -4);
  ctx.moveTo(0, -10); ctx.lineTo(0, -4); ctx.lineTo(-5, 8);
  ctx.moveTo(0, -4); ctx.lineTo(5, 8);
  ctx.stroke();
  // Sheen
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(-5, -5); ctx.lineTo(-2, -8); ctx.lineTo(-1, -5);
  ctx.closePath();
  ctx.fill();
  // Fast-forward double arrow
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(8, -10); ctx.lineTo(14, -8); ctx.lineTo(8, -6); ctx.closePath();
  ctx.moveTo(12, -10); ctx.lineTo(18, -8); ctx.lineTo(12, -6); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 0.8; ctx.stroke();
}

function drawExpeditionPack(ctx) {
  drawShadow(ctx, 13, 3);
  // Backpack
  // Straps
  ctx.fillStyle = "#5a3008";
  rr(ctx, -8, -8, 4, 6, 0.6); ctx.fill();
  rr(ctx, 4, -8, 4, 6, 0.6); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9; ctx.stroke();
  // Body
  const body = ctx.createLinearGradient(0, -4, 0, 14);
  body.addColorStop(0, "#7a8030"); body.addColorStop(1, "#3a4810");
  ctx.fillStyle = body;
  rr(ctx, -10, -4, 20, 18, 2); ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.4; ctx.stroke();
  // Top flap
  ctx.fillStyle = "#5a6018";
  ctx.beginPath();
  ctx.moveTo(-10, -4); ctx.lineTo(10, -4); ctx.lineTo(8, 4); ctx.lineTo(-8, 4); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Buckle
  ctx.fillStyle = "#f0c040";
  rr(ctx, -2, 2, 4, 2.4, 0.4); ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.7; ctx.stroke();
  // Side pocket
  ctx.fillStyle = "#3a4810";
  rr(ctx, -10, 4, 6, 8, 1); ctx.fill();
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Bedroll on top
  ctx.fillStyle = "#a8703a";
  rr(ctx, -10, -8, 20, 3.6, 1.4); ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0; ctx.stroke();
  // Bedroll stripe
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-10, -6.2); ctx.lineTo(10, -6.2);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(-5, -2, 3, 0.8, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawDangersHeader(ctx) {
  drawShadow(ctx, 14, 3);
  // Bold warning triangle with skull-ish exclamation
  // Triangle
  const grad = ctx.createLinearGradient(0, -12, 0, 12);
  grad.addColorStop(0, "#f8c040"); grad.addColorStop(1, "#a85008");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -13); ctx.lineTo(14, 11); ctx.lineTo(-14, 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 2.0; ctx.stroke();
  // Inner triangle outline
  ctx.strokeStyle = "rgba(58,16,4,0.5)"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -10); ctx.lineTo(11, 8); ctx.lineTo(-11, 8);
  ctx.closePath();
  ctx.stroke();
  // Exclamation
  ctx.fillStyle = "#3a0408";
  rr(ctx, -1.6, -6, 3.2, 9, 1); ctx.fill();
  ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 6, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// ── New decoration buildings (icons + scenes) ─────────────────────────────

function drawCairnShrine(ctx) {
  drawShadow(ctx, 18, 4);
  // Mossy stacked-stone cairn with offering bowl
  const stones = [
    [0, 14, 14, 6, "#7a8088"],
    [-2, 6, 11, 6, "#9aa4ac"],
    [1, -2, 8, 6, "#a8b0b8"],
    [-1, -10, 5.5, 5, "#bbc6cc"],
    [0, -16, 3, 4, "#dadfe6"],
  ];
  stones.forEach(([cx, cy, w, h, col]) => {
    const g = ctx.createLinearGradient(0, cy - h, 0, cy + h);
    g.addColorStop(0, "#fafcff");
    g.addColorStop(0.4, col);
    g.addColorStop(1, "#3a4348");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1c20"; ctx.lineWidth = 1.2;
    ctx.stroke();
  });
  // Moss on stones
  ctx.fillStyle = "#5a8030";
  [[-10, 16, 4, 1.4], [-6, 6, 2.6, 1], [4, -1, 2, 0.8], [-3, -10, 1.6, 0.7]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Offering bowl in front
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(8, 20); ctx.bezierCurveTo(8, 14, 18, 14, 18, 20); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.0; ctx.stroke();
  // Bowl contents — small berry
  ctx.fillStyle = "#c83028";
  ctx.beginPath();
  ctx.arc(13, 16, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Candle on top stone
  ctx.fillStyle = "#fbe8c8";
  ctx.fillRect(-1, -20, 2, 4);
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 0.7; ctx.stroke();
  // Flame
  ctx.fillStyle = "#f8d050";
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.bezierCurveTo(2, -22, 2, -20, 0, -19); ctx.bezierCurveTo(-2, -20, -2, -22, 0, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c83028"; ctx.lineWidth = 0.6; ctx.stroke();
  // Flame glow
  ctx.fillStyle = "rgba(248,208,80,0.3)";
  ctx.beginPath();
  ctx.arc(0, -21, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawTopiary(ctx) {
  drawShadow(ctx, 18, 4);
  // Pot
  ctx.fillStyle = "#a85838";
  ctx.beginPath();
  ctx.moveTo(-10, 22); ctx.lineTo(-8, 10); ctx.lineTo(8, 10); ctx.lineTo(10, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808"; ctx.lineWidth = 1.4; ctx.stroke();
  // Rim
  ctx.fillStyle = "#7a3014";
  rr(ctx, -10, 8, 20, 4, 0.8); ctx.fill();
  ctx.strokeStyle = "#3a1808"; ctx.lineWidth = 1.0; ctx.stroke();
  // Trunk
  ctx.strokeStyle = "#5a3a14"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 8); ctx.lineTo(0, -18);
  ctx.stroke();
  // Three tiered topiary balls (large → small)
  const balls = [[0, -2, 8], [0, -12, 6], [0, -20, 4]];
  balls.forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
    g.addColorStop(0, "#a8e078"); g.addColorStop(0.6, "#3a6018"); g.addColorStop(1, "#1a3008");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.2;
    ctx.stroke();
  });
  // Leaf texture dots
  ctx.fillStyle = "rgba(120,180,80,0.55)";
  [[2, -3, 1.4], [-3, -1, 1.2], [3, -12, 1.0], [-2, -13, 0.9], [1, -21, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Tiny golden bird on top
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.ellipse(0, -24, 2.4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.fillRect(0.4, -25, 1.6, 0.6);
}

function drawSundial(ctx) {
  drawShadow(ctx, 20, 4);
  // Stone pedestal
  ctx.fillStyle = "#a8a89c";
  ctx.beginPath();
  ctx.moveTo(-10, 22); ctx.lineTo(-7, 6); ctx.lineTo(7, 6); ctx.lineTo(10, 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a3830"; ctx.lineWidth = 1.4; ctx.stroke();
  // Pedestal stripes
  ctx.strokeStyle = "rgba(58,56,48,0.55)"; ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-9, 12); ctx.lineTo(9, 12);
  ctx.moveTo(-9, 18); ctx.lineTo(9, 18);
  ctx.stroke();
  // Dial disc — beveled circle
  const dial = ctx.createRadialGradient(-3, -3, 1, 0, 0, 16);
  dial.addColorStop(0, "#fbf2d4"); dial.addColorStop(0.6, "#c89060"); dial.addColorStop(1, "#5a3008");
  ctx.fillStyle = dial;
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.4; ctx.stroke();
  // Hour marks around dial
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 0.8;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rx = Math.cos(a) * 14;
    const ry = Math.sin(a) * 4;
    ctx.beginPath();
    ctx.moveTo(rx, ry + 4);
    ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 4.6 + 4);
    ctx.stroke();
  }
  // Gnomon — leaning bronze triangle
  ctx.fillStyle = "#a86838";
  ctx.beginPath();
  ctx.moveTo(-1, 4); ctx.lineTo(6, -12); ctx.lineTo(2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 1.2; ctx.stroke();
  // Bronze highlight on gnomon
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.lineTo(4, -8); ctx.lineTo(2, -2);
  ctx.closePath();
  ctx.fill();
  // Center boss
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.arc(0, 4, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.7; ctx.stroke();
  // Cast shadow on dial
  ctx.fillStyle = "rgba(60,40,20,0.45)";
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.lineTo(-9, 6); ctx.lineTo(-4, 8); ctx.lineTo(0, 4);
  ctx.closePath();
  ctx.fill();
  // Vines climbing pedestal
  ctx.strokeStyle = "#3a6018"; ctx.lineWidth = 1.0; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 22); ctx.bezierCurveTo(-10, 16, -4, 14, -6, 8);
  ctx.stroke();
  ctx.fillStyle = "#5a8030";
  ctx.beginPath();
  ctx.ellipse(-8, 18, 1.6, 1, -0.5, 0, Math.PI * 2);
  ctx.ellipse(-5, 12, 1.6, 1, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawWindChimeTree(ctx) {
  drawShadow(ctx, 20, 4);
  // Slender post
  ctx.fillStyle = "#5a3a14";
  rr(ctx, -1.4, -2, 2.8, 24, 0.6); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  // Crossbar at top
  ctx.fillStyle = "#7a4818";
  rr(ctx, -16, -8, 32, 3, 1); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  // Hanging chimes (5 tubes of varying lengths)
  const tubes = [
    [-12, -5, 16, "#e0a020"],
    [-6, -5, 22, "#dadfe6"],
    [0, -5, 26, "#c8a868"],
    [6, -5, 20, "#a8b0b8"],
    [12, -5, 14, "#e0a020"],
  ];
  // Cords
  ctx.strokeStyle = "#3a1c08"; ctx.lineWidth = 0.6;
  tubes.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y - 1); ctx.lineTo(x, y + 2);
    ctx.stroke();
  });
  // Tubes
  tubes.forEach(([x, y, len, col]) => {
    const g = ctx.createLinearGradient(x - 2, 0, x + 2, 0);
    g.addColorStop(0, "#fafcff"); g.addColorStop(0.5, col); g.addColorStop(1, "#1a0e04");
    ctx.fillStyle = g;
    rr(ctx, x - 1.6, y + 2, 3.2, len, 1.4);
    ctx.fill();
    ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9; ctx.stroke();
  });
  // Central striker
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.arc(0, 14, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9; ctx.stroke();
  // Wind ribbon dangling
  ctx.fillStyle = "#c83028";
  ctx.beginPath();
  ctx.moveTo(0, 16); ctx.bezierCurveTo(3, 18, 2, 22, 0, 22); ctx.bezierCurveTo(-2, 22, -3, 18, 0, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 0.7; ctx.stroke();
  // Roof ornament at top
  ctx.fillStyle = "#7a3014";
  ctx.beginPath();
  ctx.moveTo(-7, -8); ctx.lineTo(0, -16); ctx.lineTo(7, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1004"; ctx.lineWidth = 1.2; ctx.stroke();
  // Finial
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.arc(0, -17, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008"; ctx.lineWidth = 0.7; ctx.stroke();
  // Wind motion lines
  ctx.strokeStyle = "rgba(168,200,224,0.7)"; ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-14, -2, -10, 0);
  ctx.moveTo(-18, 6); ctx.quadraticCurveTo(-14, 4, -10, 6);
  ctx.stroke();
}

// ── Registry ──────────────────────────────────────────────────────────────

export const ICONS = {
  // Story / metaplot
  pact_scroll:          { label: "Hollow Pact",          color: "#c8a868", draw: drawPactScroll },
  pact_violation:       { label: "Pact Violation",       color: "#c82820", draw: drawPactViolation },
  choice_log:           { label: "Choice Log",           color: "#5a3014", draw: drawChoiceLog },
  side_beat:            { label: "Side Beat",            color: "#7a4818", draw: drawSideBeat },
  cutscene_start:       { label: "Cutscene Start",       color: "#c83028", draw: drawCutsceneStart },
  phase_first_light:    { label: "Phase · First Light",  color: "#f0a040", draw: drawPhaseFirstLight },
  phase_network_wakes:  { label: "Phase · Network Wakes",color: "#5a78a8", draw: drawPhaseNetworkWakes },
  phase_charter_stirs:  { label: "Phase · Charter Stirs",color: "#c88858", draw: drawPhaseCharterStirs },
  phase_old_capital:    { label: "Phase · Old Capital",  color: "#9a3828", draw: drawPhaseOldCapital },
  phase_sandbox:        { label: "Phase · Sandbox",      color: "#6a3aa8", draw: drawPhaseSandbox },

  // Keepers / boss
  keeper_deer_spirit:   { label: "Deer-Spirit",          color: "#5a8030", draw: drawDeerSpirit },
  keeper_stone_knocker: { label: "Stone-Knocker",        color: "#7a8088", draw: drawStoneKnocker },
  keeper_tidesinger:    { label: "Tidesinger",           color: "#3a96d4", draw: drawTidesinger },
  choice_coexist_drive: { label: "Coexist vs Drive-Out", color: "#c83028", draw: drawCoexistVsDriveOut },
  audit_bell:           { label: "Audit Bell",           color: "#c8902a", draw: drawAuditBell },
  boss_diff_stars:      { label: "Boss Difficulty",      color: "#f8d050", draw: drawBossDifficultyStars },

  // Bonds & townsfolk
  bond_rank_1: { label: "Bond Rank 1", color: "#c88858", draw: drawBondRank(1) },
  bond_rank_2: { label: "Bond Rank 2", color: "#c88858", draw: drawBondRank(2) },
  bond_rank_3: { label: "Bond Rank 3", color: "#c88858", draw: drawBondRank(3) },
  bond_rank_4: { label: "Bond Rank 4", color: "#dadfe6", draw: drawBondRank(4) },
  bond_rank_5: { label: "Bond Rank 5", color: "#dadfe6", draw: drawBondRank(5) },
  bond_rank_6: { label: "Bond Rank 6", color: "#dadfe6", draw: drawBondRank(6) },
  bond_rank_7: { label: "Bond Rank 7", color: "#dadfe6", draw: drawBondRank(7) },
  bond_rank_8: { label: "Bond Rank 8 (max)", color: "#f0c040", draw: drawBondRank(8) },
  gift_loves:  { label: "Gift · Loves", color: "#e85aa8", draw: drawGiftLoves },
  gift_likes:  { label: "Gift · Likes", color: "#5a8030", draw: drawGiftLikes },
  bond_8_arc:  { label: "Bond-8 Arc Unlocked", color: "#f0c040", draw: drawBond8Arc },
  villager_walking: { label: "Walking Villager", color: "#5a78a8", draw: drawVillagerWalking },

  // Banner emblems
  banner_acorn:  { label: "Banner · Acorn",  color: "#5a8030", draw: drawBannerAcorn },
  banner_hammer: { label: "Banner · Hammer", color: "#7a8088", draw: drawBannerHammer },
  banner_wave:   { label: "Banner · Wave",   color: "#3a96d4", draw: drawBannerWave },
  banner_sun:    { label: "Banner · Sun",    color: "#c83028", draw: drawBannerSun },
  banner_hearth: { label: "Banner · Hearth", color: "#e0a020", draw: drawBannerHearth },

  // Settlements / map
  settlement_founded:   { label: "Settlement · Founded",    color: "#7a3014", draw: drawSettlementFounded },
  settlement_unfounded: { label: "Settlement · Unfounded",  color: "#7a4818", draw: drawSettlementUnfounded },
  settlement_complete:  { label: "Settlement · Complete",   color: "#4a8c3a", draw: drawSettlementComplete },
  old_capital_seal:     { label: "Old Capital Seal",        color: "#a82018", draw: drawOldCapitalSeal },
  crossroads:           { label: "Crossroads",              color: "#7a4818", draw: drawCrossroads },
  festival_recurrence:  { label: "Festival",                color: "#f0c040", draw: drawFestival },
  region_forest: { label: "Region · Forest", color: "#5a8030", draw: drawRegionForest },
  region_moor:   { label: "Region · Moor",   color: "#c89060", draw: drawRegionMoor },
  region_mine:   { label: "Region · Mine",   color: "#7a8088", draw: drawRegionMine },
  region_harbor: { label: "Region · Harbor", color: "#3a96d4", draw: drawRegionHarbor },
  region_tundra: { label: "Region · Tundra", color: "#c8e0f0", draw: drawRegionTundra },

  // Boons & abilities
  boon_coin_mult:        { label: "Boon · Coin ×",          color: "#d6612a", draw: drawBoonCoin },
  boon_bond_mult:        { label: "Boon · Bond ×",          color: "#c83048", draw: drawBoonBond },
  boon_chain_mult:       { label: "Boon · Chain ×",         color: "#f0c040", draw: drawBoonChain },
  boon_branch_coexist:   { label: "Boon Branch · Coexist",  color: "#5a8030", draw: drawBoonBranchCoexist },
  boon_branch_drive_out: { label: "Boon Branch · Drive-Out", color: "#3a78b0", draw: drawBoonBranchDriveOut },
  ability_trigger:       { label: "Ability Trigger",        color: "#f8d050", draw: drawAbilityTrigger },

  // Seasons & time
  season_spring:    { label: "Season · Spring", color: "#a8e07a", draw: drawSeasonSpring },
  season_summer:    { label: "Season · Summer", color: "#f8d050", draw: drawSeasonSummer },
  season_autumn:    { label: "Season · Autumn", color: "#f0a040", draw: drawSeasonAutumn },
  season_winter:    { label: "Season · Winter", color: "#a8d8e0", draw: drawSeasonWinter },
  turns_remaining:  { label: "Turns Remaining", color: "#c83048", draw: drawTurnsRemaining },
  day_night_toggle: { label: "Day / Night",     color: "#1a2e4a", draw: drawDayNight },

  // System / UI
  xp_levelup:        { label: "XP / Level-Up",          color: "#4a8c3a", draw: drawXPLevelUp },
  daily_chest:       { label: "Daily Rewards Chest",    color: "#7a4818", draw: drawDailyChest },
  tutorial_hint:     { label: "Tutorial Hint",          color: "#f8d050", draw: drawTutorialHint },
  notif_success:     { label: "Notification · Success", color: "#4a8c3a", draw: drawNotifSuccess },
  notif_fail:        { label: "Notification · Fail",    color: "#c83028", draw: drawNotifFail },
  craft_queue:       { label: "Crafting · In Progress", color: "#f0c040", draw: drawCraftQueueInProgress },
  craft_queue_skip:  { label: "Crafting · Skip w/ Gem", color: "#e85aa8", draw: drawCraftQueueSkipGem },
  expedition_pack:   { label: "Pack Provisions",        color: "#7a8030", draw: drawExpeditionPack },
  dangers_header:    { label: "Dangers",                color: "#f8c040", draw: drawDangersHeader },

  // New decoration buildings
  decor_cairn_shrine:   { label: "Cairn Shrine",   color: "#9aa4ac", draw: drawCairnShrine },
  decor_topiary:        { label: "Tiered Topiary", color: "#5a8030", draw: drawTopiary },
  decor_sundial:        { label: "Sundial",        color: "#c89060", draw: drawSundial },
  decor_wind_chime:     { label: "Wind Chime Tree",color: "#e0a020", draw: drawWindChimeTree },
};
