// Fish biome — sardine, mackerel, clam, oyster, kelp, plus the chain
// products (raw fish, fillet, fish oil). Drawings are intentionally
// simple silhouettes that read on a 48px tile; tide / pearl visuals
// arrive when the tide-cycle MVP lands.

function shadow(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function fishBody(ctx: CanvasRenderingContext2D, fillTop: string, fillBottom: string, outline: string, accent: string) {
  // Body — teardrop pointing left
  const g = ctx.createLinearGradient(0, -8, 0, 10);
  g.addColorStop(0, fillTop);
  g.addColorStop(1, fillBottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.bezierCurveTo(-14, -10, 6, -10, 14, -3);
  ctx.bezierCurveTo(18, 0, 18, 0, 14, 3);
  ctx.bezierCurveTo(6, 10, -14, 10, -18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.6;
  ctx.stroke();
  // Tail
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(14, -3); ctx.lineTo(22, -8); ctx.lineTo(20, 0); ctx.lineTo(22, 8); ctx.lineTo(14, 3);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Side fin
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(2, 4); ctx.quadraticCurveTo(-2, 11, -8, 8); ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Gill arc
  ctx.strokeStyle = outline; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(-10, 0, 4, -Math.PI / 2.4, Math.PI / 2.4);
  ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-13, -2, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0a1018";
  ctx.beginPath(); ctx.arc(-13, -2, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-13.3, -2.3, 0.3, 0, Math.PI * 2); ctx.fill();
}

function drawSardine(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  fishBody(ctx, "#cad8de", "#7a8e98", "#3e4a52", "#9ab0bc");
  // Stripe
  ctx.strokeStyle = "rgba(40,60,80,0.5)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(10, 0); ctx.stroke();
}

function drawMackerel(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 20);
  fishBody(ctx, "#5a8aa6", "#1f3a52", "#0e1a2a", "#3a6a86");
  // Tiger stripes across the back
  ctx.strokeStyle = "rgba(10,20,32,0.65)"; ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 4;
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.quadraticCurveTo(x + 2, -2, x + 2, 0);
    ctx.stroke();
  }
}

function drawClam(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Lower shell
  ctx.fillStyle = "#caa882"; ctx.strokeStyle = "#5a4028"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.bezierCurveTo(-14, 16, 14, 16, 18, 4);
  ctx.lineTo(-18, 4);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Upper shell, hinged at top
  ctx.fillStyle = "#e0c298";
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.bezierCurveTo(-14, -12, 14, -12, 18, 4);
  ctx.lineTo(-18, 4);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Ridges fanning up from the hinge, kept inside the shell silhouette
  ctx.strokeStyle = "rgba(90,64,40,0.55)"; ctx.lineWidth = 1.2;
  for (let i = -3; i <= 3; i++) {
    const t = i / 3;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.quadraticCurveTo(t * 8, -4, t * 12, -3);
    ctx.stroke();
  }
  // Soft body peeking at the seam
  ctx.fillStyle = "#f4d6c0";
  ctx.beginPath();
  ctx.ellipse(0, 4, 8, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawOyster(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 20);
  // Rough craggy lower shell
  ctx.fillStyle = "#a89878"; ctx.strokeStyle = "#3a2e1a"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-20, 6);
  ctx.lineTo(-14, 14); ctx.lineTo(-2, 16); ctx.lineTo(12, 14); ctx.lineTo(20, 8);
  ctx.lineTo(16, 4); ctx.lineTo(-18, 4);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Upper shell, lifted to show pearl
  ctx.fillStyle = "#d4c8a8";
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.lineTo(-12, -12); ctx.lineTo(0, -16); ctx.lineTo(14, -12); ctx.lineTo(20, 4);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Inner mother-of-pearl
  ctx.fillStyle = "#f8e8c8";
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pearl
  const pg = ctx.createRadialGradient(-1, 1, 0.5, 0, 4, 5);
  pg.addColorStop(0, "#fff");
  pg.addColorStop(1, "#cfdce8");
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.arc(0, 4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(40,40,60,0.4)"; ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.arc(-1.4, 2.4, 1.0, 0, Math.PI * 2); ctx.fill();
}

function drawKelp(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Long flowing stalk with leafy paddles
  ctx.strokeStyle = "#1a3818"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.bezierCurveTo(-8, 14, 6, 6, -2, -2);
  ctx.bezierCurveTo(-10, -10, 6, -16, 0, -22);
  ctx.stroke();
  // Leaves
  const leaves: [number, number, number, string][] = [
    [-2, 16, -1.0, "#3a6a3a"],
    [3, 8, 0.6, "#4a8a4a"],
    [-4, 0, -0.8, "#3a6a3a"],
    [4, -8, 0.5, "#5a9a5a"],
    [-2, -16, -0.6, "#4a8a4a"],
  ];
  ctx.strokeStyle = "#1a3818"; ctx.lineWidth = 1.0;
  leaves.forEach(([cx, cy, ang, fill]) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Vein
    ctx.strokeStyle = "rgba(20,40,16,0.45)";
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
    ctx.strokeStyle = "#1a3818";
    ctx.restore();
  });
  // Bubbles drifting up
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath(); ctx.arc(8, -10, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -16, 1.0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -20, 0.7, 0, Math.PI * 2); ctx.fill();
}

function drawFishFillet(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 20);
  // Pinkish-orange fillet — long thin slab with darker bands
  ctx.fillStyle = "#e8b894"; ctx.strokeStyle = "#7a4a30"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-22, -6);
  ctx.lineTo(20, -8);
  ctx.bezierCurveTo(24, -2, 24, 2, 20, 8);
  ctx.lineTo(-22, 6);
  ctx.bezierCurveTo(-24, 2, -24, -2, -22, -6);
  ctx.closePath();
  ctx.fill();
  // Clip flesh detail to the body so nothing escapes the silhouette
  ctx.save();
  ctx.clip();
  // Diagonal flesh stripes (the salmon look)
  ctx.strokeStyle = "rgba(120,70,50,0.55)"; ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const x = -16 + i * 8;
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.lineTo(x + 4, 6);
    ctx.stroke();
  }
  // Highlight along the top
  ctx.strokeStyle = "rgba(255,240,220,0.7)"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-18, -4);
  ctx.lineTo(18, -6);
  ctx.stroke();
  ctx.restore();
  // Body outline on top (restored stroke style)
  ctx.strokeStyle = "#7a4a30"; ctx.lineWidth = 1.6;
  ctx.stroke();
}

function drawFishOil(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Round-bottomed amber bottle
  ctx.fillStyle = "#c89028"; ctx.strokeStyle = "#5a3e0a"; ctx.lineWidth = 1.6;
  // Body
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.bezierCurveTo(-14, 0, -14, 14, -2, 18);
  ctx.bezierCurveTo(2, 19, 8, 18, 12, 14);
  ctx.bezierCurveTo(16, 6, 12, -2, 9, -4);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Liquid highlight
  ctx.fillStyle = "rgba(255, 230, 140, 0.55)";
  ctx.beginPath();
  ctx.ellipse(-2, 8, 4, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Neck
  ctx.fillStyle = "#a87018";
  ctx.beginPath();
  ctx.rect(-5, -10, 10, 7);
  ctx.fill(); ctx.stroke();
  // Cork
  ctx.fillStyle = "#d8a058";
  ctx.beginPath();
  ctx.rect(-6, -14, 12, 5);
  ctx.fill(); ctx.stroke();
  // Glint on shoulder
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-6, 2, 1.5, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPearl(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Open shell halves cradling the pearl
  ctx.fillStyle = "#a89878"; ctx.strokeStyle = "#3a2e1a"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-18, 6);
  ctx.lineTo(-12, 14); ctx.lineTo(0, 16); ctx.lineTo(12, 14); ctx.lineTo(18, 6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Inner shell glaze
  ctx.fillStyle = "#f0e0c0";
  ctx.beginPath();
  ctx.ellipse(0, 8, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pearl orb with iridescent gradient
  const g = ctx.createRadialGradient(-3, -2, 1, 0, 2, 11);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.4, "#f4e8f8");
  g.addColorStop(1, "#9ec0d8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(40,40,80,0.55)"; ctx.lineWidth = 1.2;
  ctx.stroke();
  // Specular highlights
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(-3, -3, 3, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(2, 4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Subtle iridescent ring for that catch-the-eye sheen
  ctx.strokeStyle = "rgba(220,180,255,0.45)"; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.stroke();
}

// Cocoa pod — ridged amber-brown pod (PC2 cocoa island).
function drawCocoaPod(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  const g = ctx.createLinearGradient(-8, -16, 8, 16);
  g.addColorStop(0, "#a05f30"); g.addColorStop(0.5, "#7a4a28"); g.addColorStop(1, "#4a2c16");
  ctx.fillStyle = g; ctx.strokeStyle = "#2e1a0c"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 19, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Lengthwise ridges
  ctx.strokeStyle = "rgba(40,22,10,0.55)"; ctx.lineWidth = 1.2;
  [-6, -2, 2, 6].forEach((dx) => { ctx.beginPath(); ctx.moveTo(dx, -16); ctx.quadraticCurveTo(dx * 1.4, 0, dx, 16); ctx.stroke(); });
  // Highlight
  ctx.strokeStyle = "rgba(255,210,150,0.5)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-5, -13); ctx.quadraticCurveTo(-8, 0, -5, 13); ctx.stroke();
}

// Cocoa beans — a small heap of roasted beans.
function drawCocoa(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  const beans: [number, number, number][] = [[-7, 6, 0.3], [6, 7, -0.4], [0, 9, 0.1], [-3, 0, -0.2], [4, -1, 0.4], [0, -7, 0.0]];
  beans.forEach(([bx, by, ang]) => {
    ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, -6, 0, 6);
    g.addColorStop(0, "#8a5430"); g.addColorStop(1, "#4a2c16");
    ctx.fillStyle = g; ctx.strokeStyle = "#2e1a0c"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(40,22,10,0.6)"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
    ctx.restore();
  });
}

// Octopus — the PC2 ink source.
function drawOctopus(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  const g = ctx.createRadialGradient(-3, -6, 2, 0, -2, 16);
  g.addColorStop(0, "#6a5a90"); g.addColorStop(1, "#3a3358");
  ctx.fillStyle = g; ctx.strokeStyle = "#161228"; ctx.lineWidth = 1.6;
  // Head/mantle
  ctx.beginPath(); ctx.ellipse(0, -6, 12, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Tentacles
  ctx.fillStyle = "#473d6a";
  for (let i = -2; i <= 2; i++) {
    const bx = i * 5;
    ctx.beginPath();
    ctx.moveTo(bx - 2, 4);
    ctx.quadraticCurveTo(bx + i * 3, 18, bx + i * 5, 20);
    ctx.quadraticCurveTo(bx + i * 2, 16, bx + 2, 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // Eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-4, -8, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -8, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#161228";
  ctx.beginPath(); ctx.arc(-4, -8, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -8, 1.1, 0, Math.PI * 2); ctx.fill();
}

// Ink — a stoppered bottle of dark ink.
function drawInk(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  ctx.fillStyle = "#2a2440"; ctx.strokeStyle = "#100c1c"; ctx.lineWidth = 1.6;
  // Bulb body
  ctx.beginPath(); ctx.arc(0, 6, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Neck + cork
  ctx.fillStyle = "#3a3358";
  ctx.beginPath(); ctx.rect(-5, -10, 10, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#7a6a9a";
  ctx.beginPath(); ctx.rect(-6, -14, 12, 5); ctx.fill(); ctx.stroke();
  // Liquid sheen
  ctx.fillStyle = "rgba(150,130,200,0.5)";
  ctx.beginPath(); ctx.ellipse(-4, 3, 3, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.arc(-5, 1, 1.4, 0, Math.PI * 2); ctx.fill();
}

// Raw jade — a rounded green river stone.
function drawJadeRaw(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 22);
  g.addColorStop(0, "#7fd6a6"); g.addColorStop(0.6, "#3fae7a"); g.addColorStop(1, "#1c5a3e");
  ctx.fillStyle = g; ctx.strokeStyle = "#103a28"; ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-20, 2); ctx.bezierCurveTo(-20, -12, -8, -20, 4, -19);
  ctx.bezierCurveTo(16, -18, 22, -8, 21, 4);
  ctx.bezierCurveTo(20, 16, 8, 22, -4, 21);
  ctx.bezierCurveTo(-16, 19, -20, 12, -20, 2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Mottled translucency
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath(); ctx.ellipse(-6, -8, 6, 4, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(20,80,52,0.4)";
  [[8, 6, 4], [-4, 10, 3], [10, -6, 2.5]].forEach(([dx, dy, dr]) => { ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.fill(); });
}

// Polished jade — a cut cabochon gem.
function drawJadeGem(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  const body = ctx.createRadialGradient(-4, -4, 2, 0, 0, 22);
  body.addColorStop(0, "#d6f7e4"); body.addColorStop(0.4, "#4fc78c"); body.addColorStop(1, "#176a47");
  ctx.fillStyle = body; ctx.strokeStyle = "#0e3e2a"; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(0, 0, 18, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Facet ring
  ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 9, 0, 0, Math.PI * 2); ctx.stroke();
  // Specular
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath(); ctx.ellipse(-6, -6, 4, 2.6, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.arc(6, 5, 1.6, 0, Math.PI * 2); ctx.fill();
}

export const ICONS = {
  tile_fish_sardine:        { label: "Sardine",     color: "#9ab8c4", draw: drawSardine },
  tile_fish_cocoa:          { label: "Cocoa Pod",   color: "#7a4a28", draw: drawCocoaPod },
  cocoa:                    { label: "Cocoa",       color: "#7a4a28", draw: drawCocoa },
  tile_fish_ink:            { label: "Octopus",     color: "#3a3358", draw: drawOctopus },
  ink:                      { label: "Ink",         color: "#2a2440", draw: drawInk },
  tile_fish_jade:           { label: "Jade (rough)",color: "#3fae7a", draw: drawJadeRaw },
  jade:                     { label: "Jade",        color: "#3fae7a", draw: drawJadeGem },
  tile_fish_mackerel:       { label: "Mackerel",    color: "#4a7a9a", draw: drawMackerel },
  tile_fish_clam:           { label: "Clam",        color: "#c8a888", draw: drawClam },
  tile_fish_oyster:         { label: "Oyster",      color: "#d0c0a8", draw: drawOyster },
  tile_fish_kelp:           { label: "Kelp",        color: "#3a6a3a", draw: drawKelp },
  fish_fillet:         { label: "Fillet",      color: "#e8c8b0", draw: drawFishFillet },
  fish_oil:            { label: "Fish Oil",    color: "#e8d050", draw: drawFishOil },
  tile_special_giant_pearl: { label: "Giant Pearl", color: "#efe8d8", draw: drawPearl },
};
