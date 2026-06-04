// Workshop / crafting hand tools.

function shadow(ctx: CanvasRenderingContext2D, w: number, y?: number) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, y || 22, w, 4, 0, 0, Math.PI * 2); ctx.fill();
}

// Wood handle helper — fills a rounded bar from (x1,y1) to (x2,y2).
function woodHandle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
  g.addColorStop(0, "#7a4a18"); g.addColorStop(0.5, "#a87838"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.fillRect(0, -width / 2, len, width);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.strokeRect(0, -width / 2, len, width);
  // wood grain
  ctx.strokeStyle = "rgba(26,14,4,0.4)"; ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(len * 0.1 * i, -width / 2 + 0.5);
    ctx.lineTo(len * 0.1 * i + len * 0.7, -width / 2 + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

// Small specular glint on metal.
function metalGleam(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.4, r * 0.8, -0.4, 0, Math.PI * 2); ctx.fill();
}

function drawHammer(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  ctx.save(); ctx.rotate(0.18);
  // Wooden handle running down from the head.
  woodHandle(ctx, 2, -8, -4, 22, 5);
  // Steel head across the top.
  ctx.save(); ctx.translate(2, -12);
  const headG = ctx.createLinearGradient(0, -7, 0, 7);
  headG.addColorStop(0, "#e8e8f0"); headG.addColorStop(0.45, "#9a9aa4"); headG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = headG;
  // Striking face block (right) + neck.
  ctx.beginPath();
  ctx.moveTo(2, -7); ctx.lineTo(15, -6); ctx.lineTo(15, 6); ctx.lineTo(2, 7);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 2; ctx.stroke();
  // Claw (left) — split curved prongs.
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.moveTo(2, -6); ctx.lineTo(2, 6);
  ctx.bezierCurveTo(-8, 7, -16, 3, -18, -4);
  ctx.lineTo(-13, -5);
  ctx.bezierCurveTo(-11, 0, -7, 2, -3, 1);
  ctx.lineTo(-3, -1);
  ctx.bezierCurveTo(-7, -2, -11, -4, -13, -8);
  ctx.lineTo(-18, -7);
  ctx.bezierCurveTo(-15, -4, -10, -6, 2, -6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Claw notch (the nail slot).
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-18, -5.5); ctx.lineTo(-12, -6.5); ctx.stroke();
  // Specular streak on the face.
  metalGleam(ctx, 9, -2, 6);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(4, -5, 9, 1.4);
  ctx.restore();
  ctx.restore();
}

function drawSaw(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 20);
  ctx.save(); ctx.rotate(-0.12);
  // Steel blade — long tapered triangle.
  ctx.save(); ctx.translate(-4, 0);
  const bladeG = ctx.createLinearGradient(0, -8, 0, 8);
  bladeG.addColorStop(0, "#f0f0f6"); bladeG.addColorStop(0.5, "#b4b4bc"); bladeG.addColorStop(1, "#5a5a62");
  ctx.fillStyle = bladeG;
  ctx.beginPath();
  ctx.moveTo(-2, -6); ctx.lineTo(28, -2); ctx.lineTo(28, 6); ctx.lineTo(-2, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Teeth along the bottom edge.
  ctx.fillStyle = "#7a7a82"; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 0.7;
  for (let i = 0; i < 10; i++) {
    const x = -1 + i * 3;
    ctx.beginPath();
    ctx.moveTo(x, 6); ctx.lineTo(x + 1.5, 6); ctx.lineTo(x + 0.4, 11);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // Bright top edge.
  ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(26, -1.2); ctx.stroke();
  ctx.restore();
  // Wooden D-grip at the back (left).
  ctx.save(); ctx.translate(-6, 0);
  const gripG = ctx.createLinearGradient(-12, 0, 0, 0);
  gripG.addColorStop(0, "#7a4a18"); gripG.addColorStop(0.5, "#a87838"); gripG.addColorStop(1, "#3a2008");
  ctx.fillStyle = gripG;
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.bezierCurveTo(-14, -12, -16, 12, 0, 9);
  ctx.lineTo(0, 4);
  ctx.bezierCurveTo(-9, 6, -8, -5, 0, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Grip highlight.
  ctx.fillStyle = "rgba(255,235,200,0.4)";
  ctx.beginPath(); ctx.ellipse(-10, -2, 1.6, 4, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawWrench(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  ctx.save(); ctx.rotate(-0.62);
  const g = ctx.createLinearGradient(-7, 0, 7, 0);
  g.addColorStop(0, "#e8e8f0"); g.addColorStop(0.5, "#9a9aa4"); g.addColorStop(1, "#3a3a42");
  ctx.fillStyle = g; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 2;
  // Shaft.
  ctx.beginPath();
  ctx.moveTo(-4, 4); ctx.lineTo(4, 4); ctx.lineTo(3, 20); ctx.lineTo(-3, 20);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Top open-end jaw (C-shape).
  ctx.beginPath();
  ctx.moveTo(-4, 4); ctx.lineTo(-9, -6); ctx.lineTo(-5, -10);
  ctx.lineTo(-2, -6); ctx.lineTo(2, -6); ctx.lineTo(5, -10);
  ctx.lineTo(9, -6); ctx.lineTo(4, 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Bottom box jaw with a hex opening.
  ctx.beginPath();
  ctx.ellipse(0, 21, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#26262c";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * 3.4, py = 21 + Math.sin(a) * 3.4;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1; ctx.stroke();
  // Specular streak.
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(-2.5, 4, 1.6, 14);
  metalGleam(ctx, -4, -4, 4);
  ctx.restore();
}

function drawScrewdriver(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  ctx.save(); ctx.rotate(0.5);
  // Colored handle (bulbous, ribbed) at the top.
  const hG = ctx.createLinearGradient(-6, 0, 6, 0);
  hG.addColorStop(0, "#ff8a5a"); hG.addColorStop(0.5, "#d8401c"); hG.addColorStop(1, "#7a1408");
  ctx.fillStyle = hG;
  ctx.beginPath();
  ctx.moveTo(-6, -18); ctx.bezierCurveTo(-8, -22, 8, -22, 6, -18);
  ctx.lineTo(5, -2); ctx.bezierCurveTo(5, 2, -5, 2, -5, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.8; ctx.stroke();
  // Handle ribs.
  ctx.strokeStyle = "rgba(58,8,8,0.5)"; ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i += 2.6) {
    ctx.beginPath(); ctx.moveTo(i, -18); ctx.lineTo(i * 0.85, -2); ctx.stroke();
  }
  // Handle highlight.
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.ellipse(-3, -12, 1.6, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Steel shaft.
  const sG = ctx.createLinearGradient(-3, 0, 3, 0);
  sG.addColorStop(0, "#e8e8f0"); sG.addColorStop(0.5, "#a0a0aa"); sG.addColorStop(1, "#46464e");
  ctx.fillStyle = sG;
  ctx.fillRect(-2.4, -2, 4.8, 18);
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4;
  ctx.strokeRect(-2.4, -2, 4.8, 18);
  // Flat-head tip.
  ctx.fillStyle = "#c8c8d0";
  ctx.beginPath();
  ctx.moveTo(-2.4, 16); ctx.lineTo(2.4, 16); ctx.lineTo(3, 21); ctx.lineTo(-3, 21);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.2; ctx.stroke();
  // Shaft glint.
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(-1.4, -1, 1.2, 15);
  ctx.restore();
}

function drawScissors(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  ctx.save(); ctx.rotate(-0.2);
  // Steel blades crossing at a pivot near the middle.
  const bladeG = ctx.createLinearGradient(0, -18, 0, 2);
  bladeG.addColorStop(0, "#f0f0f6"); bladeG.addColorStop(0.55, "#b0b0ba"); bladeG.addColorStop(1, "#56565e");
  ctx.fillStyle = bladeG; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
  // Left blade — tip up-left.
  ctx.beginPath();
  ctx.moveTo(1.5, 2);
  ctx.bezierCurveTo(0, -8, -5, -16, -8, -22);
  ctx.bezierCurveTo(-4, -18, -1, -9, 4, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Right blade — tip up-right.
  ctx.beginPath();
  ctx.moveTo(-1.5, 2);
  ctx.bezierCurveTo(0, -8, 5, -16, 8, -22);
  ctx.bezierCurveTo(4, -18, 1, -9, -4, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Sharp inner highlights.
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-1, -3); ctx.bezierCurveTo(-3, -11, -5, -16, -7, -20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1, -3); ctx.bezierCurveTo(3, -11, 5, -16, 7, -20); ctx.stroke();
  // Colored finger loops at the bottom.
  ctx.strokeStyle = "#1a4a8a"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.ellipse(-7, 12, 5, 6, 0.3, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(7, 12, 5, 6, -0.3, 0, Math.PI * 2); ctx.stroke();
  // Loop inner highlight.
  ctx.strokeStyle = "rgba(150,200,255,0.6)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(-7, 12, 4, 5, 0.3, -1, 1.4); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(7, 12, 4, 5, -0.3, 1.7, 4.1); ctx.stroke();
  // Connect loops to blades.
  ctx.strokeStyle = "#1a4a8a"; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-2, 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(2, 1); ctx.stroke();
  // Pivot bolt.
  ctx.fillStyle = "#6a6a72";
  ctx.beginPath(); ctx.arc(0, 2, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.arc(-0.8, 1.2, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPaintbrush(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  ctx.save(); ctx.rotate(0.42);
  // Wooden handle (top).
  woodHandle(ctx, 0, -22, 0, -2, 5);
  // Metal ferrule.
  ctx.save(); ctx.translate(0, 0);
  const fG = ctx.createLinearGradient(-5, 0, 5, 0);
  fG.addColorStop(0, "#d8d8e0"); fG.addColorStop(0.5, "#9a9aa4"); fG.addColorStop(1, "#46464e");
  ctx.fillStyle = fG;
  ctx.fillRect(-5, -4, 10, 9);
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6;
  ctx.strokeRect(-5, -4, 10, 9);
  // Ferrule crimp lines.
  ctx.strokeStyle = "rgba(26,26,30,0.5)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(-4, -3, 1.6, 7);
  ctx.restore();
  // Bristles dipped in paint — tapered, blue tip.
  const brG = ctx.createLinearGradient(0, 5, 0, 22);
  brG.addColorStop(0, "#6a4a20"); brG.addColorStop(0.4, "#3a82d8"); brG.addColorStop(1, "#1a4a9a");
  ctx.fillStyle = brG;
  ctx.beginPath();
  ctx.moveTo(-5, 5); ctx.lineTo(5, 5);
  ctx.lineTo(4, 16);
  ctx.bezierCurveTo(3, 22, -3, 22, -4, 16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#102a5a"; ctx.lineWidth = 1.4; ctx.stroke();
  // Bristle strands.
  ctx.strokeStyle = "rgba(20,40,80,0.5)"; ctx.lineWidth = 0.7;
  for (let i = -3; i <= 3; i += 1.5) {
    ctx.beginPath(); ctx.moveTo(i, 6); ctx.lineTo(i * 0.7, 20); ctx.stroke();
  }
  // Wet paint highlight + a drip.
  ctx.fillStyle = "rgba(180,215,255,0.6)";
  ctx.beginPath(); ctx.ellipse(-1.5, 12, 1.4, 5, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2a6ac8";
  ctx.beginPath(); ctx.ellipse(1, 23, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawChisel(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  ctx.save(); ctx.rotate(0.4);
  // Wooden handle (top) with rounded butt.
  const hG = ctx.createLinearGradient(-5, 0, 5, 0);
  hG.addColorStop(0, "#7a4a18"); hG.addColorStop(0.5, "#a87838"); hG.addColorStop(1, "#3a2008");
  ctx.fillStyle = hG;
  ctx.beginPath();
  ctx.moveTo(-5, -6); ctx.bezierCurveTo(-6, -22, 6, -22, 5, -6);
  ctx.lineTo(4, -2); ctx.lineTo(-4, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Wood grain.
  ctx.strokeStyle = "rgba(26,14,4,0.4)"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-2, -20); ctx.lineTo(-2, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -20); ctx.lineTo(2, -4); ctx.stroke();
  ctx.fillStyle = "rgba(255,235,200,0.4)";
  ctx.beginPath(); ctx.ellipse(-2.5, -13, 1.4, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Metal cap (hoop) at the handle base.
  const cG = ctx.createLinearGradient(-5, 0, 5, 0);
  cG.addColorStop(0, "#d8d8e0"); cG.addColorStop(0.5, "#8a8a94"); cG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = cG;
  ctx.fillRect(-5, -2, 10, 5);
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4;
  ctx.strokeRect(-5, -2, 10, 5);
  // Steel blade (flat, bevelled tip).
  const bG = ctx.createLinearGradient(-3.5, 0, 3.5, 0);
  bG.addColorStop(0, "#f0f0f6"); bG.addColorStop(0.5, "#a8a8b2"); bG.addColorStop(1, "#4a4a52");
  ctx.fillStyle = bG;
  ctx.beginPath();
  ctx.moveTo(-3.5, 3); ctx.lineTo(3.5, 3); ctx.lineTo(3.5, 16);
  ctx.lineTo(2.5, 22); ctx.lineTo(-3.5, 19);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Bevel highlight.
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(-2, 4, 1.4, 13);
  ctx.restore();
}

function drawPliers(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  ctx.save(); ctx.rotate(0.1);
  const steelG = ctx.createLinearGradient(-8, 0, 8, 0);
  steelG.addColorStop(0, "#e0e0e8"); steelG.addColorStop(0.5, "#9a9aa4"); steelG.addColorStop(1, "#3a3a42");
  // Crossed jaws at top — two tapered prongs meeting at the pivot.
  ctx.fillStyle = steelG; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.lineJoin = "round";
  // Left jaw (tip up-left).
  ctx.beginPath();
  ctx.moveTo(2, 1); ctx.bezierCurveTo(-1, -8, -4, -14, -6, -19);
  ctx.bezierCurveTo(-3, -18, -1, -13, 5, -2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Right jaw (tip up-right).
  ctx.beginPath();
  ctx.moveTo(-2, 1); ctx.bezierCurveTo(1, -8, 4, -14, 6, -19);
  ctx.bezierCurveTo(3, -18, 1, -13, -5, -2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Jaw serrations.
  ctx.strokeStyle = "rgba(26,26,30,0.6)"; ctx.lineWidth = 0.7;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(-5 + i * 2, -8 - i); ctx.lineTo(-2 + i * 2, -7 - i); ctx.stroke();
  }
  // Grip handles below the pivot — colored sleeves.
  ctx.strokeStyle = "#c83018"; ctx.lineWidth = 5.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-2, 3); ctx.lineTo(-8, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, 3); ctx.lineTo(8, 22); ctx.stroke();
  // Grip highlight.
  ctx.strokeStyle = "rgba(255,160,130,0.6)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-3, 5); ctx.lineTo(-8, 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, 5); ctx.lineTo(8, 20); ctx.stroke();
  // Pivot bolt.
  ctx.fillStyle = "#6a6a72";
  ctx.beginPath(); ctx.arc(0, 1, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.arc(-0.9, 0.2, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawDrill(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  ctx.save(); ctx.rotate(-0.08);
  // Power-drill body — colored housing.
  const bodyG = ctx.createLinearGradient(0, -10, 0, 4);
  bodyG.addColorStop(0, "#ffc24a"); bodyG.addColorStop(0.5, "#e08a18"); bodyG.addColorStop(1, "#7a4408");
  ctx.fillStyle = bodyG; ctx.strokeStyle = "#3a2208"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -8); ctx.lineTo(6, -9); ctx.bezierCurveTo(12, -9, 12, 2, 6, 3);
  ctx.lineTo(-12, 4); ctx.bezierCurveTo(-18, 4, -20, -6, -16, -8);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Body highlight.
  ctx.fillStyle = "rgba(255,245,200,0.4)";
  ctx.beginPath(); ctx.ellipse(-6, -5, 8, 2, -0.05, 0, Math.PI * 2); ctx.fill();
  // Handle (grip pointing down).
  ctx.fillStyle = "#2a2a30"; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-12, 2); ctx.lineTo(-4, 2); ctx.lineTo(-2, 22); ctx.lineTo(-12, 22);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Grip ridges.
  ctx.strokeStyle = "rgba(120,120,130,0.5)"; ctx.lineWidth = 0.9;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(-11, 8 + i * 3); ctx.lineTo(-3, 8 + i * 3); ctx.stroke();
  }
  // Trigger.
  ctx.fillStyle = "#46464e";
  ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(0, 5); ctx.lineTo(-1, 9); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill();
  // Chuck — steel collar at the front.
  const chuckG = ctx.createLinearGradient(0, -6, 0, 2);
  chuckG.addColorStop(0, "#e0e0e8"); chuckG.addColorStop(0.5, "#9a9aa4"); chuckG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = chuckG;
  ctx.beginPath();
  ctx.moveTo(8, -7); ctx.lineTo(16, -5); ctx.lineTo(16, -0); ctx.lineTo(8, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Drill bit (spiral).
  ctx.strokeStyle = "#8a8a94"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(16, -2); ctx.lineTo(26, -2); ctx.stroke();
  ctx.strokeStyle = "#46464e"; ctx.lineWidth = 0.9;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(17 + i * 1.8, -3.4); ctx.lineTo(19 + i * 1.8, -0.6); ctx.stroke();
  }
  metalGleam(ctx, 12, -4, 4);
  ctx.restore();
}

function drawNail(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 8);
  ctx.save(); ctx.rotate(0.32);
  // Flat head.
  const headG = ctx.createLinearGradient(-7, 0, 7, 0);
  headG.addColorStop(0, "#e8e8f0"); headG.addColorStop(0.5, "#a0a0aa"); headG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = headG;
  ctx.beginPath(); ctx.ellipse(0, -18, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Head top sheen.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(-2, -18.5, 3, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  // Shaft tapering to a sharp point.
  const shaftG = ctx.createLinearGradient(-3, 0, 3, 0);
  shaftG.addColorStop(0, "#e0e0e8"); shaftG.addColorStop(0.5, "#9a9aa4"); shaftG.addColorStop(1, "#3a3a42");
  ctx.fillStyle = shaftG;
  ctx.beginPath();
  ctx.moveTo(-3, -16); ctx.lineTo(3, -16); ctx.lineTo(1, 18); ctx.lineTo(0, 23); ctx.lineTo(-1, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Bright vertical shine.
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(-1.4, -15); ctx.lineTo(-0.4, -15); ctx.lineTo(-0.4, 16); ctx.lineTo(-1, 16);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export const ICONS = {
  wtool_hammer:      { label: "Hammer",      color: "#9a9aa4", draw: drawHammer },
  wtool_saw:         { label: "Saw",         color: "#b4b4bc", draw: drawSaw },
  wtool_wrench:      { label: "Wrench",      color: "#9a9aa4", draw: drawWrench },
  wtool_screwdriver: { label: "Screwdriver", color: "#d8401c", draw: drawScrewdriver },
  wtool_scissors:    { label: "Scissors",    color: "#1a4a8a", draw: drawScissors },
  wtool_paintbrush:  { label: "Paintbrush",  color: "#3a82d8", draw: drawPaintbrush },
  wtool_chisel:      { label: "Chisel",      color: "#a87838", draw: drawChisel },
  wtool_pliers:      { label: "Pliers",      color: "#c83018", draw: drawPliers },
  wtool_drill:       { label: "Drill",       color: "#e08a18", draw: drawDrill },
  wtool_nail:        { label: "Nail",        color: "#a0a0aa", draw: drawNail },
};
