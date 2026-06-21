// New town-scene vector props — hand-drawn Canvas-2D draws in the same centered,
// ground-anchored style as src/textures/categories/* (origin at (0,0); the ground
// contact sits at y≈22, matched by the shared `shadow()` helper). These cover the
// settlement clutter the shared icon catalog doesn't already provide — boulders,
// bushes, construction piles, a market stall, water-edge decor — so the town reads
// like the lush reference rather than the old Tuxemon pixel recipes.
//
// Every draw is pure (no Phaser, no DOM): TownScene bakes each into a transparent
// texture via `canvasTexture`. Keep the silhouette inside roughly x,y ∈ [-34, 30].

type Ctx = CanvasRenderingContext2D;

/** Shared soft ground shadow, centred on the prop's contact point (y≈22). */
function shadow(ctx: Ctx, rx = 16, ry = 4, alpha = 0.22) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 22, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A single rounded plank/log end-grain disc. */
function logEnd(ctx: Ctx, cx: number, cy: number, r: number) {
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
  g.addColorStop(0, "#d8b078");
  g.addColorStop(0.6, "#b8884a");
  g.addColorStop(1, "#8a5a28");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3414";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // growth rings
  ctx.strokeStyle = "rgba(90,52,20,0.5)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  ctx.moveTo(cx + r * 0.3, cy);
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.stroke();
}

// ── Nature ──────────────────────────────────────────────────────────────────
function drawBoulder(ctx: Ctx) {
  shadow(ctx, 20, 5);
  const g = ctx.createLinearGradient(0, -14, 0, 22);
  g.addColorStop(0, "#b6bcc4");
  g.addColorStop(0.5, "#878e98");
  g.addColorStop(1, "#565d67");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-19, 18);
  ctx.lineTo(-15, -4);
  ctx.lineTo(-4, -14);
  ctx.lineTo(10, -12);
  ctx.lineTo(19, 2);
  ctx.lineTo(17, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4048";
  ctx.lineWidth = 2;
  ctx.stroke();
  // facets
  ctx.strokeStyle = "rgba(58,64,72,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4, -14); ctx.lineTo(2, 6); ctx.lineTo(17, 6);
  ctx.moveTo(2, 6); ctx.lineTo(-4, 18);
  ctx.stroke();
  // lit top-left facet
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.moveTo(-15, -4); ctx.lineTo(-4, -14); ctx.lineTo(2, 6); ctx.lineTo(-13, 8);
  ctx.closePath();
  ctx.fill();
  // moss
  ctx.fillStyle = "rgba(90,140,40,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, 17, 12, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRockCluster(ctx: Ctx) {
  shadow(ctx, 20, 4.5);
  const rock = (cx: number, cy: number, rx: number, ry: number, lit: number) => {
    const g = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.4, 1, cx, cy, rx);
    g.addColorStop(0, lit ? "#c2c8d0" : "#a2a8b2");
    g.addColorStop(0.6, "#787e88");
    g.addColorStop(1, "#4a505a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a4048";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  };
  rock(-9, 16, 11, 8, 0);
  rock(11, 17, 9, 7, 0);
  rock(1, 7, 12, 9, 1);
  ctx.fillStyle = "rgba(90,140,40,0.45)";
  ctx.beginPath();
  ctx.ellipse(-2, 20, 14, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Round leafy shrub (blobbed canopy, lit upper-left). */
function bushBlobs(ctx: Ctx, c0: string, c1: string, c2: string, blobs: Array<[number, number, number]>) {
  blobs.forEach(([cx, cy, r]) => {
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 1, cx, cy, r);
    g.addColorStop(0, c0);
    g.addColorStop(0.6, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c2;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });
}

function drawBush(ctx: Ctx) {
  shadow(ctx, 16, 4);
  bushBlobs(ctx, "#9cd04a", "#4a8420", "#27520c", [
    [-9, 10, 10], [9, 10, 10], [-3, 2, 11], [6, 1, 10], [0, 8, 12],
  ]);
  ctx.fillStyle = "rgba(220,255,180,0.4)";
  [[-8, 4, 3], [5, 2, 2.6], [-1, -2, 2.4]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  });
}

function drawBerryBush(ctx: Ctx) {
  shadow(ctx, 16, 4);
  bushBlobs(ctx, "#7fb83a", "#3a6e1a", "#1f3c08", [
    [-9, 11, 10], [9, 11, 10], [-2, 3, 11], [6, 2, 10], [0, 9, 12],
  ]);
  ctx.fillStyle = "#c8304a";
  [[-7, 8], [4, 5], [9, 11], [-2, 12], [7, 14], [-10, 13], [1, 3]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "rgba(255,200,200,0.7)";
  [[-7.6, 7.4], [3.4, 4.4]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 0.6, 0, Math.PI * 2); ctx.fill();
  });
}

function drawHedge(ctx: Ctx) {
  shadow(ctx, 24, 4);
  const g = ctx.createLinearGradient(0, -6, 0, 20);
  g.addColorStop(0, "#5a9226");
  g.addColorStop(1, "#2e5410");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-24, 18);
  ctx.lineTo(-24, 2);
  ctx.bezierCurveTo(-24, -8, 24, -8, 24, 2);
  ctx.lineTo(24, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#234008";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // clipped-leaf stipple
  ctx.fillStyle = "rgba(150,210,90,0.45)";
  for (let i = 0; i < 26; i++) {
    const x = -22 + (i * 1.7);
    const y = -4 + Math.sin(i * 1.3) * 3;
    ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Construction clutter (the dirt-plot detail in the reference) ──────────────
function drawLogPile(ctx: Ctx) {
  shadow(ctx, 22, 4.5);
  // back row
  logEnd(ctx, -9, 6, 7);
  logEnd(ctx, 5, 6, 7);
  // front row nestled
  logEnd(ctx, -14, 16, 7);
  logEnd(ctx, 0, 16, 7);
  logEnd(ctx, 14, 16, 7);
  // top log
  logEnd(ctx, -2, -3, 7);
}

function drawPlankStack(ctx: Ctx) {
  shadow(ctx, 24, 4);
  const plank = (y: number, tone: number) => {
    const g = ctx.createLinearGradient(-22, 0, 22, 0);
    g.addColorStop(0, `rgb(${168 + tone},${120 + tone},${74 + tone})`);
    g.addColorStop(1, `rgb(${120 + tone},${76 + tone},${40 + tone})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.rect(-22, y, 44, 5);
    ctx.fill();
    ctx.strokeStyle = "#4a2c10";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // end grain caps
    ctx.fillStyle = "#caa066";
    ctx.fillRect(-22, y, 4, 5);
    ctx.fillRect(18, y, 4, 5);
  };
  plank(14, -6); plank(8, 4); plank(2, -2); plank(-4, 6); plank(-10, 0);
}

function drawStonePile(ctx: Ctx) {
  shadow(ctx, 20, 4.5);
  const block = (x: number, y: number, w: number, h: number, lit: number) => {
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, lit ? "#c4c2b8" : "#a6a49a");
    g.addColorStop(1, "#6e6c62");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.rect(x - w / 2, y - h / 2, w, h);
    ctx.fill();
    ctx.strokeStyle = "#46443c";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  };
  block(-9, 16, 16, 9, 0);
  block(9, 16, 16, 9, 0);
  block(0, 6, 17, 9, 1);
  block(-2, -4, 14, 8, 1);
}

function drawCrate(ctx: Ctx) {
  shadow(ctx, 15, 4);
  const g = ctx.createLinearGradient(-13, 0, 13, 0);
  g.addColorStop(0, "#c8924e");
  g.addColorStop(0.5, "#a8703a");
  g.addColorStop(1, "#7a4a1e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.rect(-13, -6, 26, 26);
  ctx.fill();
  ctx.strokeStyle = "#4a2c10";
  ctx.lineWidth = 2;
  ctx.stroke();
  // frame + diagonal braces
  ctx.strokeStyle = "rgba(74,44,16,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-13, -6, 26, 26);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-13, -6); ctx.lineTo(13, 20);
  ctx.moveTo(13, -6); ctx.lineTo(-13, 20);
  ctx.stroke();
  // lit top edge
  ctx.fillStyle = "rgba(255,220,160,0.35)";
  ctx.fillRect(-13, -6, 26, 3);
}

function drawSacks(ctx: Ctx) {
  shadow(ctx, 18, 4);
  const sack = (cx: number, cy: number, s: number) => {
    const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, 12 * s);
    g.addColorStop(0, "#e8d8a8");
    g.addColorStop(0.6, "#c8b078");
    g.addColorStop(1, "#9a8048");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * s, cy + 8 * s);
    ctx.bezierCurveTo(cx - 13 * s, cy - 6 * s, cx - 5 * s, cy - 12 * s, cx, cy - 11 * s);
    ctx.bezierCurveTo(cx + 5 * s, cy - 12 * s, cx + 13 * s, cy - 6 * s, cx + 10 * s, cy + 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#6a5424";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // tied neck
    ctx.fillStyle = "#8a6a30";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 10 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  sack(-8, 12, 1); sack(9, 13, 0.95); sack(1, 6, 1.05);
}

function drawHayBale(ctx: Ctx) {
  shadow(ctx, 20, 4.5);
  const g = ctx.createLinearGradient(0, -6, 0, 20);
  g.addColorStop(0, "#f0d878");
  g.addColorStop(0.5, "#d8b84a");
  g.addColorStop(1, "#a8862a");
  ctx.fillStyle = g;
  ctx.beginPath();
  // rounded rectangle bale
  const x = -20, y = -7, w = 40, h = 27, r = 7;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5e1a";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // straw striations
  ctx.strokeStyle = "rgba(120,90,20,0.4)";
  ctx.lineWidth = 0.7;
  for (let yy = -3; yy < 18; yy += 3) {
    ctx.beginPath();
    ctx.moveTo(-18, yy); ctx.bezierCurveTo(-6, yy + 1.5, 6, yy - 1.5, 18, yy);
    ctx.stroke();
  }
  // baling twine
  ctx.strokeStyle = "#6a4a14";
  ctx.lineWidth = 1.6;
  [-9, 9].forEach((tx) => {
    ctx.beginPath(); ctx.moveTo(tx, -6); ctx.lineTo(tx, 19); ctx.stroke();
  });
}

function drawSawhorse(ctx: Ctx) {
  shadow(ctx, 18, 3.5);
  ctx.strokeStyle = "#7a4a1e";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  // legs
  ctx.beginPath();
  ctx.moveTo(-12, 20); ctx.lineTo(-4, -2);
  ctx.moveTo(2, 20); ctx.lineTo(-4, -2);
  ctx.moveTo(12, 20); ctx.lineTo(4, -2);
  ctx.moveTo(-6, 20); ctx.lineTo(4, -2);
  ctx.stroke();
  // top beam
  ctx.fillStyle = "#a8703a";
  ctx.beginPath();
  ctx.rect(-16, -6, 32, 6);
  ctx.fill();
  ctx.strokeStyle = "#4a2c10";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,220,160,0.35)";
  ctx.fillRect(-16, -6, 32, 1.6);
}

// ── Market & water life ───────────────────────────────────────────────────────
function drawMarketStall(ctx: Ctx) {
  shadow(ctx, 30, 5);
  // posts
  ctx.fillStyle = "#7a4a1e";
  [-26, 26].forEach((x) => {
    ctx.beginPath(); ctx.rect(x - 2, -16, 4, 38); ctx.fill();
    ctx.strokeStyle = "#3a1e08"; ctx.lineWidth = 1.4; ctx.stroke();
  });
  // counter
  const wood = ctx.createLinearGradient(0, 6, 0, 22);
  wood.addColorStop(0, "#b87a3a");
  wood.addColorStop(1, "#7a4a1e");
  ctx.fillStyle = wood;
  ctx.beginPath(); ctx.rect(-28, 6, 56, 16); ctx.fill();
  ctx.strokeStyle = "#3a1e08"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "rgba(58,30,8,0.5)"; ctx.lineWidth = 0.7;
  for (let x = -24; x < 28; x += 8) { ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x, 22); ctx.stroke(); }
  // striped awning (scalloped front)
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? "#e8e2d4" : "#c83a3a";
    const x0 = -30 + (60 / stripes) * i;
    const x1 = -30 + (60 / stripes) * (i + 1);
    ctx.beginPath();
    ctx.moveTo(x0, -16);
    ctx.lineTo(x1, -16);
    ctx.lineTo(x1, -3);
    ctx.lineTo((x0 + x1) / 2, 1);
    ctx.lineTo(x0, -3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(80,20,20,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-30, -16); ctx.lineTo(30, -16); ctx.stroke();
  // goods on counter
  ctx.fillStyle = "#d8503a";
  [[-18, 4], [-12, 5], [-6, 4]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "#f0c030";
  [[6, 5], [12, 4], [18, 5]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); });
}

function drawRowboat(ctx: Ctx) {
  shadow(ctx, 26, 4, 0.18);
  // hull
  const hull = ctx.createLinearGradient(0, 0, 0, 18);
  hull.addColorStop(0, "#b87a3a");
  hull.addColorStop(1, "#6a3e16");
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(-28, 2);
  ctx.bezierCurveTo(-22, 18, 22, 18, 28, 2);
  ctx.bezierCurveTo(20, 8, -20, 8, -28, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1e08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // inner hull
  ctx.fillStyle = "#8a5a2a";
  ctx.beginPath();
  ctx.moveTo(-23, 2);
  ctx.bezierCurveTo(-18, 9, 18, 9, 23, 2);
  ctx.bezierCurveTo(16, 5, -16, 5, -23, 2);
  ctx.closePath();
  ctx.fill();
  // thwart seats
  ctx.fillStyle = "#a8703a";
  [-10, 8].forEach((x) => { ctx.beginPath(); ctx.rect(x - 3, 1, 6, 4); ctx.fill();
    ctx.strokeStyle = "#3a1e08"; ctx.lineWidth = 1; ctx.stroke(); });
  // oars
  ctx.strokeStyle = "#7a5424";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, 3); ctx.lineTo(-22, -8);
  ctx.moveTo(2, 3); ctx.lineTo(22, -7);
  ctx.stroke();
  ctx.fillStyle = "#8a5a2a";
  ctx.beginPath(); ctx.ellipse(-23, -9, 3, 1.6, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(23, -8, 3, 1.6, 0.5, 0, Math.PI * 2); ctx.fill();
}

function drawDockPost(ctx: Ctx) {
  shadow(ctx, 8, 3, 0.18);
  const g = ctx.createLinearGradient(-4, 0, 4, 0);
  g.addColorStop(0, "#8a5a2a");
  g.addColorStop(0.5, "#6a4018");
  g.addColorStop(1, "#3e260c");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.rect(-4, -18, 8, 40); ctx.fill();
  ctx.strokeStyle = "#2a1604"; ctx.lineWidth = 1.6; ctx.stroke();
  // worn rounded top
  ctx.fillStyle = "#9a6a32";
  ctx.beginPath(); ctx.ellipse(0, -18, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
  // rope wrap
  ctx.strokeStyle = "#c8a86a"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -10); ctx.lineTo(4, -8);
  ctx.moveTo(-4, -6); ctx.lineTo(4, -4);
  ctx.stroke();
}

export const TOWN_PROP_DRAWS: Record<string, (ctx: Ctx) => void> = {
  boulder: drawBoulder,
  rock_cluster: drawRockCluster,
  bush: drawBush,
  berry_bush: drawBerryBush,
  hedge: drawHedge,
  log_pile: drawLogPile,
  plank_stack: drawPlankStack,
  stone_pile: drawStonePile,
  crate: drawCrate,
  sacks: drawSacks,
  hay_bale: drawHayBale,
  sawhorse: drawSawhorse,
  market_stall: drawMarketStall,
  rowboat: drawRowboat,
  dock_post: drawDockPost,
};
