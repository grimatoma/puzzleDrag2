// Fruits.

function drawApple(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createRadialGradient(-7, -8, 3, 0, 4, 22);
  grad.addColorStop(0, "#ffd6a8"); grad.addColorStop(0.35, "#e8543a"); grad.addColorStop(1, "#7a1410");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-4, -18, -16, -16, -19, -4);
  ctx.bezierCurveTo(-22, 10, -10, 22, 0, 20);
  ctx.bezierCurveTo(10, 22, 22, 10, 19, -4);
  ctx.bezierCurveTo(16, -16, 4, -18, 0, -16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = "rgba(58,8,8,0.7)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-2, -15); ctx.quadraticCurveTo(0, -12, 2, -15); ctx.stroke();
  ctx.strokeStyle = "#3a200a"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(2, -20, 5, -22); ctx.stroke();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.moveTo(4, -20); ctx.bezierCurveTo(14, -24, 18, -16, 12, -12); ctx.bezierCurveTo(8, -14, 5, -18, 4, -20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.ellipse(-8, -6, 4, 7, -0.5, 0, Math.PI * 2); ctx.fill();
}

function drawPear(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createRadialGradient(-6, 4, 3, 0, 8, 24);
  grad.addColorStop(0, "#f8ed90"); grad.addColorStop(0.5, "#bcc436"); grad.addColorStop(1, "#5a6810");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.bezierCurveTo(-6, -16, -8, -8, -7, -2);
  ctx.bezierCurveTo(-18, 4, -18, 18, -2, 22);
  ctx.bezierCurveTo(14, 22, 18, 8, 7, -2);
  ctx.bezierCurveTo(8, -8, 6, -16, 0, -18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2a3208"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = "#3a200a"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(1, -22); ctx.stroke();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.moveTo(1, -21); ctx.bezierCurveTo(11, -23, 14, -16, 8, -14); ctx.bezierCurveTo(5, -16, 2, -19, 1, -21); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(122,82,16,0.6)";
  [[3,4,1.0],[-4,10,0.9],[6,12,1.1],[-2,16,0.8],[-6,0,0.8],[8,6,0.9]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(-7,4,3,6,-0.4,0,Math.PI*2); ctx.fill();
}

function drawGoldenApple(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,220,80,0.18)";
  ctx.beginPath(); ctx.arc(0, 2, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createRadialGradient(-7, -8, 3, 0, 4, 24);
  grad.addColorStop(0, "#fffceb"); grad.addColorStop(0.4, "#ffd34c"); grad.addColorStop(1, "#7a4f08");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-4, -18, -16, -16, -19, -4);
  ctx.bezierCurveTo(-22, 10, -10, 22, 0, 20);
  ctx.bezierCurveTo(10, 22, 22, 10, 19, -4);
  ctx.bezierCurveTo(16, -16, 4, -18, 0, -16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e3a08"; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,200,0.7)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-12, -2); ctx.bezierCurveTo(-8, -10, 6, -10, 12, -2); ctx.stroke();
  ctx.strokeStyle = "#5e3a08"; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(2, -20, 5, -22); ctx.stroke();
  const leafGrad = ctx.createLinearGradient(4, -20, 14, -12);
  leafGrad.addColorStop(0, "#fff4a8"); leafGrad.addColorStop(1, "#a87810");
  ctx.fillStyle = leafGrad;
  ctx.beginPath(); ctx.moveTo(4, -20); ctx.bezierCurveTo(14, -24, 18, -16, 12, -12); ctx.bezierCurveTo(8, -14, 5, -18, 4, -20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e3a08"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(-8, -6, 4, 7, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fffae0";
  [[16,-14,1.6],[-18,8,1.4],[14,16,1.2],[-14,-16,1.0]].forEach(([sx,sy,sr])=>{
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? sr * 1.8 : sr * 0.6;
      const x = sx + Math.cos(a) * r;
      const y = sy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  });
}

function drawBlackberry(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 20, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Stem + leaf
  ctx.strokeStyle = "#3a1810"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-3, -22); ctx.quadraticCurveTo(0, -16, 2, -10); ctx.stroke();
  ctx.fillStyle = "#3a6818";
  ctx.beginPath();
  ctx.moveTo(-3, -22);
  ctx.bezierCurveTo(8, -25, 14, -19, 11, -12);
  ctx.bezierCurveTo(5, -14, -1, -18, -3, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f3a08"; ctx.lineWidth = 1.3; ctx.stroke();
  // Green calyx where fruit meets stem
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(3, -8); ctx.lineTo(0, -7); ctx.lineTo(-3, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 0.6; ctx.stroke();
  // A blackberry is a CLUSTER of fused drupelets, not a smooth ovoid. We place
  // a hand-authored set of overlapping spheres of varied size and position so
  // the silhouette is genuinely lumpy and each drupelet catches the light
  // individually. No backing oval / dot-grid (that reads as a plum or grape).
  // [x, y, radius] — clustered tight, larger near the lit upper-left, smaller
  // toward the shaded lower edge; outline contributes the bumpy rim.
  const drupelets: Array<[number, number, number]> = [
    // top crown row (just under the calyx)
    [-5, -6, 3.6], [1, -7, 3.4], [6, -5, 3.4],
    // upper-mid
    [-8, -1, 4.0], [-2, -2, 4.2], [4, -1, 4.0], [9, 0, 3.4],
    // mid
    [-9, 4, 3.8], [-3, 4, 4.2], [3, 4, 4.2], [9, 5, 3.6],
    // lower-mid
    [-7, 9, 3.8], [-1, 10, 4.0], [5, 9, 3.8], [10, 9, 2.8],
    // bottom taper
    [-4, 14, 3.4], [2, 15, 3.4], [7, 13, 3.0],
    [-1, 18, 2.8],
  ];
  // First pass: dark outlines/seating so adjacent drupelets read fused.
  drupelets.forEach(([dx, dy, r]) => {
    ctx.fillStyle = "#0a0014";
    ctx.beginPath();
    ctx.arc(dx, dy, r + 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  // Second pass: each drupelet as a small shaded sphere with its own highlight.
  drupelets.forEach(([dx, dy, r]) => {
    const grad = ctx.createRadialGradient(
      dx - r * 0.4, dy - r * 0.45, 0.4, dx, dy, r
    );
    grad.addColorStop(0, "#6e3a86");
    grad.addColorStop(0.5, "#2a0a3c");
    grad.addColorStop(1, "#0c0114");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
    // tiny specular dot, brightest on the upper-left drupelets
    const hi = 0.85 - (dy + 10) * 0.018;
    ctx.fillStyle = `rgba(225,190,255,${Math.max(0.3, hi)})`;
    ctx.beginPath();
    ctx.arc(dx - r * 0.4, dy - r * 0.45, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRambutan(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(2, 22, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
  // A rambutan: a round red fruit covered in soft, fleshy hair-spines
  // (spinterns) that curve gently. Body sits at the origin; spine tips are kept
  // well inside the ±26 safe area (max tip radius ≈ 23.5). Spines all sweep the
  // same way (a soft clockwise comb) so they read as fuzzy hair, not a star/urchin.
  const cx = 0, cy = 4;
  const bodyR = 14;
  ctx.lineCap = "round";
  // Two layered passes of curved spines for a dense, soft pelt. Each spine is a
  // tapered quadratic curve: thick reddish base on the body, thin pale tip.
  const drawSpineRing = (count: number, baseR: number, len: number, sweep: number, phase: number, baseW: number) => {
    for (let i = 0; i < count; i++) {
      const a = phase + (i / count) * Math.PI * 2;
      const l = len + ((i * 37) % 3) * 0.7; // slight length variation
      const rootR = baseR;
      const tipR = baseR + l;
      const tipA = a + sweep;          // consistent gentle lean -> hair comb
      const rx = cx + Math.cos(a) * rootR;
      const ry = cy + Math.sin(a) * rootR;
      const tx = cx + Math.cos(tipA) * tipR;
      const ty = cy + Math.sin(tipA) * tipR;
      const ctrlR = (rootR + tipR) * 0.5;
      const ctrlA = a + sweep * 0.5;
      const mx = cx + Math.cos(ctrlA) * ctrlR;
      const my = cy + Math.sin(ctrlA) * ctrlR;
      // reddish base
      ctx.strokeStyle = "#c23042"; ctx.lineWidth = baseW;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      // soft pale-pink tip on the outer third
      ctx.strokeStyle = "rgba(242,168,160,0.85)"; ctx.lineWidth = baseW * 0.5;
      const ix = mx + (tx - mx) * 0.55, iy = my + (ty - my) * 0.55;
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(tx, ty); ctx.stroke();
    }
  };
  // Back layer (slightly longer, drawn first so it tucks behind the body).
  drawSpineRing(26, bodyR - 2, 8.5, 0.34, 0.0, 1.6);
  // Round red body.
  const grad = ctx.createRadialGradient(cx - 5, cy - 6, 3, cx, cy + 2, bodyR + 4);
  grad.addColorStop(0, "#ffd0c0"); grad.addColorStop(0.5, "#e0303f"); grad.addColorStop(1, "#7a0a18");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, bodyR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a0a08"; ctx.lineWidth = 2.2; ctx.stroke();
  // Front layer of spines sprouting from the body rim, over the fill.
  drawSpineRing(24, bodyR - 1, 7.5, 0.30, 0.12, 1.8);
  // Specular highlight (upper-left).
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(cx - 5, cy - 5, 3.2, 5.5, -0.4, 0, Math.PI * 2); ctx.fill();
}

function drawStarfruit(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 23, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Carambola read head-on: the iconic 5-pointed star cross-section. A rounded
  // five-point star reads unambiguously as star-fruit. Points are softened with
  // quadratic curves so the silhouette is a plump fruit, not a sharp icon star.
  // All art kept inside ±24.
  ctx.save();
  ctx.rotate(-0.05);
  const points = 5;
  const outer = 23, inner = 10.5; // plumper lobes (less spiky than a reward star)
  const rounding = 4.0; // softer, fruit-like tips
  // Yellow-GREEN carambola flesh (ripe-on-the-edge): green toward the ridges,
  // warm yellow in the centre, so it reads as a waxy tropical fruit, not gold.
  const grad = ctx.createRadialGradient(-7, -8, 4, 0, 2, 26);
  grad.addColorStop(0, "#f4f6b0");
  grad.addColorStop(0.45, "#dce964");
  grad.addColorStop(0.78, "#aacc38");
  grad.addColorStop(1, "#6c8c18");
  ctx.fillStyle = grad;
  ctx.beginPath();
  // -Math.PI/2 puts a point straight up.
  const verts: Array<[number, number, boolean]> = [];
  for (let i = 0; i < points * 2; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? outer : inner;
    verts.push([Math.cos(ang) * r, Math.sin(ang) * r, i % 2 === 0]);
  }
  // Walk vertices; round each tip (outer point) with a small arc, straight to valleys.
  for (let i = 0; i < verts.length; i++) {
    const [x, y, isTip] = verts[i];
    const prev = verts[(i - 1 + verts.length) % verts.length];
    const next = verts[(i + 1) % verts.length];
    if (i === 0) ctx.moveTo(prev[0] + (x - prev[0]) * 0.5, prev[1] + (y - prev[1]) * 0.5);
    if (isTip) {
      // approach tip then round it toward next
      const dInX = x - prev[0], dInY = y - prev[1];
      const lenIn = Math.hypot(dInX, dInY);
      const ax = x - (dInX / lenIn) * rounding, ay = y - (dInY / lenIn) * rounding;
      const dOutX = next[0] - x, dOutY = next[1] - y;
      const lenOut = Math.hypot(dOutX, dOutY);
      const bx = x + (dOutX / lenOut) * rounding, by = y + (dOutY / lenOut) * rounding;
      ctx.lineTo(ax, ay);
      ctx.quadraticCurveTo(x, y, bx, by);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4e6a10"; ctx.lineWidth = 2.2; ctx.stroke();
  // Each ridge runs from the centre out to a TIP and is shaded as a rounded rib:
  // a bright crest line flanked by soft shadow valleys, so the fruit reads as a
  // 3D ridged carambola rather than a flat faceted star.
  for (let i = 0; i < points; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / points;
    const tipX = Math.cos(ang) * (outer - rounding), tipY = Math.sin(ang) * (outer - rounding) + 1;
    // bright waxy crest down the centre of each lobe
    ctx.strokeStyle = "rgba(244,250,200,0.8)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(tipX, tipY); ctx.stroke();
    // valley lines toward the notches either side of this ridge for depth
    const vAngA = -Math.PI / 2 + ((i * 2 + 1) * Math.PI) / points;
    const vx = Math.cos(vAngA) * (inner + 4), vy = Math.sin(vAngA) * (inner + 4) + 1;
    ctx.strokeStyle = "rgba(58,84,10,0.45)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(vx, vy); ctx.stroke();
  }
  // Slightly darker green core so the centre reads as the seed cavity.
  ctx.fillStyle = "rgba(110,150,30,0.45)";
  ctx.beginPath(); ctx.arc(0, 1, 3.2, 0, Math.PI * 2); ctx.fill();
  // Waxy sheen highlight (upper-left)
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-7, -7, 3.2, 5, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawCoconut(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2,22,22,4.5,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createRadialGradient(-6,-8,3,0,4,24);
  grad.addColorStop(0,"#a47445"); grad.addColorStop(0.55,"#5e3a14"); grad.addColorStop(1,"#2a1808");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0,4,19,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 2.2; ctx.stroke();
  // Coarse fibrous husk: long combed coir fibres that sweep top-to-bottom and
  // splay gently outward (the way a coconut's brown hair lies), rather than a
  // dense uniform radial burst (which read as a pollen/urchin spike-ball).
  // Long, overlapping, gently-curved strokes of varied length + tone.
  ctx.save();
  ctx.beginPath(); ctx.arc(0,4,18,0,Math.PI*2); ctx.clip();
  ctx.lineCap = "round";
  // Dense field of combed coir: a deterministic pseudo-random scatter of long,
  // gently fanning downward strokes. Dark base layer then a sparser light layer
  // so the husk reads as packed fibre, not a few isolated sticks. The whole husk
  // is brushed before drawing the pores, so the round form reads first.
  const rnd = (n: number) => {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s); // 0..1
  };
  const drawFibre = (x: number, topY: number, len: number, fan: number, w: number, style: string) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.quadraticCurveTo(x + fan * 0.45, topY + len * 0.5, x + fan, topY + len);
    ctx.stroke();
  };
  // Dense, low-contrast, mostly-vertical short hairs so the husk reads as a
  // textured surface rather than a bundle of separate twigs. Slight outward
  // lean (small fan) follows the curve of the sphere.
  for (let i = 0; i < 120; i++) {
    const x = -17 + rnd(i + 1) * 34;
    const topY = -16 + rnd(i + 50) * 30;
    const len = 6 + rnd(i + 100) * 7;
    const fan = (x / 18) * (0.8 + rnd(i + 150) * 1.4);
    drawFibre(x, topY + 4, len, fan, 1.0, "rgba(62,38,16,0.4)");
  }
  for (let i = 0; i < 60; i++) {
    const x = -16 + rnd(i + 200) * 32;
    const topY = -15 + rnd(i + 250) * 28;
    const len = 5 + rnd(i + 300) * 6;
    const fan = (x / 18) * (0.8 + rnd(i + 350) * 1.2);
    drawFibre(x, topY + 4, len, fan, 0.9, "rgba(214,170,120,0.4)");
  }
  ctx.restore();
  // Three germination pores clustered together as a small detail near the top,
  // NOT spread into a centered face. Tight triangle, upper area, off-centre.
  ctx.fillStyle = "#150b03";
  [[-3,-8],[3,-8],[0,-3]].forEach(([ex,ey])=>{ ctx.beginPath(); ctx.arc(ex,ey,2.2,0,Math.PI*2); ctx.fill(); });
  // subtle pale rim on the pores so they read as recessed eyes/holes
  ctx.strokeStyle = "rgba(255,210,160,0.35)"; ctx.lineWidth = 0.8;
  [[-3,-8],[3,-8],[0,-3]].forEach(([ex,ey])=>{ ctx.beginPath(); ctx.arc(ex,ey,2.2,0,Math.PI*2); ctx.stroke(); });
  ctx.fillStyle = "rgba(255,225,185,0.3)";
  ctx.beginPath(); ctx.ellipse(-9,-6,3,5,-0.4,0,Math.PI*2); ctx.fill();
}

function drawLemon(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(2,22,20,4,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createRadialGradient(-6,-6,3,0,4,22);
  grad.addColorStop(0,"#fffce0"); grad.addColorStop(0.5,"#f6d030"); grad.addColorStop(1,"#9c6f08");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-22,0);
  ctx.bezierCurveTo(-22,-14,-8,-18,4,-16);
  ctx.bezierCurveTo(18,-14,24,-2,22,6);
  ctx.bezierCurveTo(20,18,8,22,-4,20);
  ctx.bezierCurveTo(-18,16,-22,8,-22,0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e4210"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.fillStyle = "#f6d030";
  ctx.beginPath(); ctx.moveTo(20,4); ctx.lineTo(26,8); ctx.lineTo(20,10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5e4210"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = "#5a3a14"; ctx.beginPath(); ctx.arc(-21,-2,2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.moveTo(-18,-8); ctx.bezierCurveTo(-22,-16,-14,-22,-8,-16); ctx.bezierCurveTo(-10,-12,-14,-10,-18,-8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(124,86,12,0.45)";
  [[-10,-4,0.8],[8,4,0.8],[-2,12,0.7],[-12,8,0.7],[10,-6,0.7],[4,-2,0.7],[-8,16,0.8],[14,12,0.8]].forEach(([sx,sy,sr])=>{ ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.ellipse(-5,-5,5,9,-0.5,0,Math.PI*2); ctx.fill();
}

function drawJackfruit(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2,22,22,5,0,0,Math.PI*2); ctx.fill();
  const grad = ctx.createRadialGradient(-6,-6,3,0,8,28);
  grad.addColorStop(0,"#f4ec90"); grad.addColorStop(0.55,"#a89630"); grad.addColorStop(1,"#4e4206");
  // Oblong, slightly lumpy jackfruit body (taller than wide, the giant pod
  // shape) so it does not read as a round melon. Traced via ctx (not Path2D,
  // which is unavailable in the canvas test environment) so it can be filled,
  // stroked and clipped against in turn.
  const traceBody = () => {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(-9, -18, -16, -10, -16, 0);
    ctx.bezierCurveTo(-16, 12, -10, 23, 0, 23);
    ctx.bezierCurveTo(11, 23, 17, 11, 16, -1);
    ctx.bezierCurveTo(15, -10, 9, -18, 0, -18);
    ctx.closePath();
  };
  traceBody();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#3a2e08"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.save();
  traceBody();
  ctx.clip();
  // Raised conical knobs: each is a small bump with its own top-left highlight
  // and bottom-right shadow so the rind reads as 3D spiky pods, not a flat
  // diamond lattice. Hex-ish stagger fills the oblong body.
  const knobs: Array<[number, number]> = [];
  for (let row = 0; row < 7; row++) {
    const ky = -14 + row * 5.6;
    const stag = (row % 2) * 2.6;
    for (let col = -2; col <= 2; col++) {
      knobs.push([col * 5.2 + stag, ky]);
    }
  }
  knobs.forEach(([kx, ky]) => {
    const kr = 2.7;
    // base shadow under/right of the knob
    ctx.fillStyle = "rgba(46,36,4,0.55)";
    ctx.beginPath();
    ctx.ellipse(kx + 0.7, ky + 0.9, kr, kr * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    // knob body, lit from upper-left
    const kg = ctx.createRadialGradient(kx - 1, ky - 1.2, 0.3, kx, ky, kr);
    kg.addColorStop(0, "#fbf3b0");
    kg.addColorStop(0.55, "#c4ab38");
    kg.addColorStop(1, "#7a6810");
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.arc(kx, ky, kr, 0, Math.PI * 2);
    ctx.fill();
    // crisp little tip highlight
    ctx.fillStyle = "rgba(255,252,210,0.85)";
    ctx.beginPath();
    ctx.arc(kx - 0.8, ky - 1.0, kr * 0.32, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  ctx.strokeStyle = "#3a200a"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(0,-22); ctx.stroke();
  ctx.fillStyle = "#5a3a14"; ctx.beginPath(); ctx.arc(0,-22,2.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath(); ctx.moveTo(0,-22); ctx.bezierCurveTo(10,-25,14,-18,8,-14); ctx.bezierCurveTo(4,-16,1,-20,0,-22); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33550f"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,200,0.45)";
  ctx.beginPath(); ctx.ellipse(-7,-3,4,7,-0.4,0,Math.PI*2); ctx.fill();
}

export const ICONS = {
  tile_fruit_apple:        { label:"Apple",        color:"#d4543a", draw:drawApple },
  tile_fruit_pear:         { label:"Pear",         color:"#bcc436", draw:drawPear },
  tile_fruit_golden_apple: { label:"Golden Apple", color:"#f4c430", draw:drawGoldenApple },
  tile_fruit_blackberry:   { label:"Blackberry",   color:"#3a1a4a", draw:drawBlackberry },
  tile_fruit_rambutan:     { label:"Rambutan",     color:"#d8344a", draw:drawRambutan },
  tile_fruit_starfruit:    { label:"Starfruit",    color:"#e8c83c", draw:drawStarfruit },
  tile_fruit_coconut:      { label:"Coconut",      color:"#5e3a14", draw:drawCoconut },
  tile_fruit_lemon:        { label:"Lemon",        color:"#f4d030", draw:drawLemon },
  tile_fruit_jackfruit:    { label:"Jackfruit",    color:"#a8a040", draw:drawJackfruit },
};
