// Tools and resources that previously had no registered icon — game code
// was looking them up by item key and getting "?" fallbacks. Adds:
//   - scythe_full   (tool, upgraded scythe — full crescent blade)
//   - iron_pick     (tool, upgraded pickaxe — iron-headed)
//   - stone_hammer  (tool, smashes cobble tiles)
//   - iron_ration   (mine resource, calorie-dense food block)
//   - supplies      (kitchen recipe output, basic supply bundle)
//   - hay_bundle    (farm resource, tied bundle of hay)
//   - iron_bar      (mine resource, smelted iron ingot)
//   - copper_bar    (mine resource, smelted copper ingot)
//   - gold_bar      (mine resource, smelted gold ingot)
//   - sea_shells    (fish resource, small shell pair)
//   - pearls        (fish resource, lustrous pearl trio)

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShadow(ctx: CanvasRenderingContext2D, w = 20, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── scythe_full — the upgraded scythe (full crescent blade) ────────────────
function drawScytheFull(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  // Wooden snath (handle) — slightly diagonal, with grip wraps
  ctx.save();
  ctx.rotate(0.15);
  const handleGrad = ctx.createLinearGradient(-2, -22, 2, 22);
  handleGrad.addColorStop(0, "#a87838");
  handleGrad.addColorStop(0.5, "#7a5028");
  handleGrad.addColorStop(1, "#3a2008");
  ctx.fillStyle = handleGrad;
  rr(ctx, -2, -22, 4, 44, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Wood grain
  ctx.strokeStyle = "rgba(40,16,4,0.5)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -20); ctx.lineTo(0, 20);
  ctx.stroke();
  // Twin grip wraps (brass-banded for "full" variant)
  ctx.fillStyle = "#a87018";
  ctx.fillRect(-3, 4, 6, 4);
  ctx.fillRect(-3, 12, 6, 4);
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-3, 4, 6, 4);
  ctx.strokeRect(-3, 12, 6, 4);
  ctx.restore();

  // Crescent blade — bigger / sharper than the basic scythe
  ctx.fillStyle = "#1a1c20";
  ctx.lineWidth = 1.6;
  const bladeGrad = ctx.createLinearGradient(-22, -22, 0, -8);
  bladeGrad.addColorStop(0, "#fafcff");
  bladeGrad.addColorStop(0.4, "#c0c8d4");
  bladeGrad.addColorStop(1, "#5a6470");
  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(-3, -22);
  ctx.bezierCurveTo(-28, -22, -32, -2, -22, 12);
  ctx.bezierCurveTo(-22, 4, -16, -10, 0, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0e14";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Edge highlight
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, -20);
  ctx.bezierCurveTo(-22, -18, -28, -2, -22, 8);
  ctx.stroke();
  // Tip gleam
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(-22, 10, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Slash motion lines
  ctx.strokeStyle = "rgba(180,200,220,0.55)";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  [[-30, 12], [-32, 16], [-28, 8]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6, y - 3);
    ctx.stroke();
  });
}

// ── iron_pick — upgraded pickaxe with iron head ───────────────────────────
function drawIronPick(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  // Wooden handle (diagonal)
  ctx.save();
  ctx.rotate(-0.18);
  const handleGrad = ctx.createLinearGradient(-3, 0, 3, 0);
  handleGrad.addColorStop(0, "#a87838");
  handleGrad.addColorStop(0.5, "#7a5028");
  handleGrad.addColorStop(1, "#3a2008");
  ctx.fillStyle = handleGrad;
  rr(ctx, -3, -8, 6, 30, 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Wood grain
  ctx.strokeStyle = "rgba(40,16,4,0.5)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-1, -6); ctx.lineTo(-1, 20);
  ctx.moveTo(1, -6); ctx.lineTo(1, 20);
  ctx.stroke();
  // Brass band at top (distinguishes iron pick from plain pickaxe)
  ctx.fillStyle = "#c89030";
  ctx.fillRect(-4, -6, 8, 3);
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-4, -6, 8, 3);
  ctx.restore();

  // Iron pickhead (double-pointed) — set across the top of the handle
  ctx.save();
  ctx.rotate(0.08);
  const headGrad = ctx.createLinearGradient(0, -16, 0, -4);
  headGrad.addColorStop(0, "#e0e6ec");
  headGrad.addColorStop(0.5, "#8a929c");
  headGrad.addColorStop(1, "#3a4048");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(-22, -12);
  ctx.lineTo(-4, -16);
  ctx.lineTo(8, -16);
  ctx.lineTo(22, -10);
  ctx.lineTo(18, -6);
  ctx.lineTo(6, -8);
  ctx.lineTo(-2, -8);
  ctx.lineTo(-18, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0e14";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Edge highlights on the tips
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-20, -10); ctx.lineTo(-12, -10);
  ctx.moveTo(12, -10); ctx.lineTo(20, -10);
  ctx.stroke();
  // Center boss (where head meets handle)
  ctx.fillStyle = "#5a6470";
  ctx.beginPath();
  ctx.arc(0, -10, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1e24";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Rivet on boss
  ctx.fillStyle = "#1a1e24";
  ctx.beginPath();
  ctx.arc(0, -10, 1, 0, Math.PI * 2);
  ctx.fill();
  // Tip gleams
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(-21, -11, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(21, -10, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── stone_hammer — chunky stone-headed maul ───────────────────────────────
function drawStoneHammer(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Handle (diagonal up-left to down-right)
  ctx.save();
  ctx.rotate(-0.55);
  const handleGrad = ctx.createLinearGradient(-3, 0, 3, 0);
  handleGrad.addColorStop(0, "#a87838");
  handleGrad.addColorStop(0.5, "#6a4020");
  handleGrad.addColorStop(1, "#3a2008");
  ctx.fillStyle = handleGrad;
  rr(ctx, -3, -4, 6, 28, 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Wood grain
  ctx.strokeStyle = "rgba(40,16,4,0.5)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-1, -2); ctx.lineTo(-1, 22);
  ctx.moveTo(1, -2); ctx.lineTo(1, 22);
  ctx.stroke();
  // Leather grip wrap near top
  ctx.fillStyle = "#3a1808";
  ctx.fillRect(-4, 6, 8, 5);
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-4, 6, 8, 5);
  // Wrap stitches
  ctx.strokeStyle = "rgba(168,128,64,0.5)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-4, 8); ctx.lineTo(4, 8);
  ctx.moveTo(-4, 10); ctx.lineTo(4, 10);
  ctx.stroke();
  ctx.restore();

  // Stone head — chunky, rough-cut block straddling the handle top
  ctx.save();
  ctx.rotate(0.18);
  const stoneGrad = ctx.createLinearGradient(0, -18, 0, -2);
  stoneGrad.addColorStop(0, "#cfd5da");
  stoneGrad.addColorStop(0.5, "#8a9098");
  stoneGrad.addColorStop(1, "#3a4048");
  ctx.fillStyle = stoneGrad;
  ctx.beginPath();
  ctx.moveTo(-16, -12);
  ctx.lineTo(-12, -18);
  ctx.lineTo(14, -18);
  ctx.lineTo(18, -10);
  ctx.lineTo(14, -4);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1e24";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Chisel scars / cracks
  ctx.strokeStyle = "rgba(40,46,54,0.65)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-8, -14); ctx.lineTo(-4, -10);
  ctx.moveTo(6, -14); ctx.lineTo(10, -8);
  ctx.moveTo(-2, -16); ctx.lineTo(2, -8);
  ctx.stroke();
  // Top-face highlight
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, -17); ctx.lineTo(12, -17);
  ctx.stroke();
  // Embedded specks
  ctx.fillStyle = "rgba(20,30,40,0.7)";
  [[-6, -10, 0.7], [4, -12, 0.6], [10, -8, 0.5]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Iron binding strap at one end
  ctx.fillStyle = "#5a6470";
  ctx.fillRect(-16, -14, 2, 10);
  ctx.strokeStyle = "#1a1e24";
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-16, -14, 2, 10);
  ctx.restore();
}

// ── iron_ration — hard-tack ration block w/ stamped insignia ──────────────
function drawIronRation(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Wrapper underlay (parchment)
  ctx.fillStyle = "#d4c08a";
  rr(ctx, -16, -8, 32, 22, 3);
  ctx.fill();
  ctx.strokeStyle = "#5a4020";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Wrapper crease lines
  ctx.strokeStyle = "rgba(90,64,32,0.4)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-14, -4); ctx.lineTo(14, -4);
  ctx.moveTo(-14, 10); ctx.lineTo(14, 10);
  ctx.stroke();

  // Dark hard-tack block exposed in the middle (gradient for depth)
  const tackGrad = ctx.createLinearGradient(0, -2, 0, 8);
  tackGrad.addColorStop(0, "#7a6450");
  tackGrad.addColorStop(0.5, "#4a3828");
  tackGrad.addColorStop(1, "#1a0e04");
  ctx.fillStyle = tackGrad;
  rr(ctx, -12, -2, 24, 10, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#0a0604";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Grain dots (showing it's compressed grain + meat + fat)
  ctx.fillStyle = "rgba(200,160,90,0.6)";
  [[-8, 0], [-4, 2], [0, 0], [4, 3], [8, 1], [-2, 5], [6, 5]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Iron seal stamped on the wrapper — anchor / hammer mark
  ctx.fillStyle = "#5a6470";
  ctx.beginPath();
  ctx.arc(0, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1e24";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  // Stamped "I" letter (for iron)
  ctx.fillStyle = "#fff8e0";
  ctx.fillRect(-0.6, -7, 1.2, 6);
  ctx.fillRect(-2, -7, 4, 1);
  ctx.fillRect(-2, -2, 4, 1);

  // Twine wrapping around the centre
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, 4); ctx.lineTo(16, 4);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,240,200,0.4)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-16, 3.5); ctx.lineTo(16, 3.5);
  ctx.stroke();
  // Twine knot
  ctx.fillStyle = "#5a3a18";
  ctx.beginPath();
  ctx.arc(13, 4, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Highlight on wrapper top
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-6, -6, 5, 1.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

// ── supplies — simple supply bundle (sack + lashed crate corner + apple) ──
function drawSupplies(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);

  // Crate corner peeking out behind sack
  ctx.fillStyle = "#7a5028";
  ctx.beginPath();
  ctx.moveTo(8, 14);
  ctx.lineTo(20, 14);
  ctx.lineTo(20, 0);
  ctx.lineTo(14, -4);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Crate plank grain
  ctx.strokeStyle = "rgba(40,16,4,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(14, -2); ctx.lineTo(14, 14);
  ctx.stroke();
  // Crate iron strap
  ctx.fillStyle = "#5a4030";
  ctx.fillRect(8, 4, 12, 2);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 0.6;
  ctx.strokeRect(8, 4, 12, 2);

  // Main sack (cloth pouch)
  const sackGrad = ctx.createRadialGradient(-4, -2, 4, 0, 4, 20);
  sackGrad.addColorStop(0, "#d4b878");
  sackGrad.addColorStop(0.6, "#a87838");
  sackGrad.addColorStop(1, "#5a3014");
  ctx.fillStyle = sackGrad;
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.bezierCurveTo(-20, 6, -18, 18, -6, 20);
  ctx.lineTo(6, 20);
  ctx.bezierCurveTo(14, 18, 16, 6, 12, -6);
  ctx.bezierCurveTo(6, -8, -10, -8, -16, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Cloth folds
  ctx.strokeStyle = "rgba(58,28,8,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.bezierCurveTo(-12, 8, -10, 14, -8, 18);
  ctx.moveTo(8, 0); ctx.bezierCurveTo(8, 8, 6, 14, 4, 18);
  ctx.moveTo(-2, 2); ctx.lineTo(-2, 18);
  ctx.stroke();
  // Drawstring tied at top
  ctx.fillStyle = "#5a3014";
  ctx.beginPath();
  ctx.ellipse(-2, -8, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Rope ties
  ctx.strokeStyle = "#7a4a18";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -10); ctx.lineTo(-10, -16);
  ctx.moveTo(4, -10); ctx.lineTo(8, -16);
  ctx.stroke();
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath(); ctx.arc(-10, -16, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -16, 1.4, 0, Math.PI * 2); ctx.fill();

  // Apple poking out the top — fresh-food indicator
  ctx.fillStyle = "#d4543a";
  ctx.beginPath();
  ctx.arc(2, -12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a1808";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // Apple stem + leaf
  ctx.strokeStyle = "#5a3a14";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(2, -14); ctx.lineTo(3, -16);
  ctx.stroke();
  ctx.fillStyle = "#5a8028";
  ctx.beginPath();
  ctx.ellipse(4, -16, 1.6, 1, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Apple highlight
  ctx.fillStyle = "rgba(255,220,180,0.7)";
  ctx.beginPath();
  ctx.arc(1, -13, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Tiny grain sheaf peeking out other side
  ctx.fillStyle = "#f4c84a";
  ctx.beginPath();
  ctx.ellipse(-6, -10, 1.4, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5018";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.strokeStyle = "#c89320";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-7, -13); ctx.lineTo(-8, -16);
  ctx.moveTo(-5, -13); ctx.lineTo(-4, -16);
  ctx.stroke();
}

// ── hay_bundle — round bale of hay tied with twine ────────────────────────
function drawHayBundle(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Hay bale body (circular cross-section)
  const grad = ctx.createRadialGradient(-4, -4, 4, 0, 0, 22);
  grad.addColorStop(0, "#f0d878");
  grad.addColorStop(0.55, "#c9b160");
  grad.addColorStop(1, "#6a5828");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 2, 18, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2c10";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Straw striations
  ctx.strokeStyle = "rgba(106,88,40,0.6)";
  ctx.lineWidth = 0.7;
  for (let y = -10; y <= 14; y += 4) {
    ctx.beginPath();
    ctx.moveTo(-16, y);
    ctx.bezierCurveTo(-6, y - 2, 6, y + 2, 16, y);
    ctx.stroke();
  }
  // Loose straw ends poking out
  ctx.strokeStyle = "#8a7028";
  ctx.lineWidth = 0.9;
  [[-16, -6, -20, -10], [16, -4, 20, -8], [-14, 12, -18, 16], [14, 14, 18, 18]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Twine wraps (two horizontal bands)
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, -4, 18, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,250,210,0.45)";
  ctx.beginPath();
  ctx.ellipse(-6, -4, 4, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ── ingot helper — generic metal bar with custom palette ──────────────────
function drawIngotWithColors(ctx: CanvasRenderingContext2D, top: string, mid: string, dark: string, edgeLight: string) {
  drawShadow(ctx, 22, 4);
  // Trapezoid bar (wider at bottom)
  const grad = ctx.createLinearGradient(0, -8, 0, 12);
  grad.addColorStop(0, top);
  grad.addColorStop(0.5, mid);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-16, 10);
  ctx.lineTo(-12, -8);
  ctx.lineTo(12, -8);
  ctx.lineTo(16, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Top face highlight (the cast surface)
  ctx.fillStyle = edgeLight;
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(12, -8);
  ctx.lineTo(10, -4);
  ctx.lineTo(-10, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Specular streak on body
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();
  // Lower shadow band
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.moveTo(-16, 10);
  ctx.lineTo(16, 10);
  ctx.lineTo(14, 6);
  ctx.lineTo(-14, 6);
  ctx.closePath();
  ctx.fill();
}

function drawIronBar(ctx: CanvasRenderingContext2D) {
  drawIngotWithColors(ctx, "#e0e4e8", "#8a8e94", "#3a3e44", "#cfd4d9");
}

function drawCopperBar(ctx: CanvasRenderingContext2D) {
  drawIngotWithColors(ctx, "#f0b878", "#c97f3c", "#6a3e18", "#e09858");
}

function drawGoldBar(ctx: CanvasRenderingContext2D) {
  drawIngotWithColors(ctx, "#fff0a8", "#f4c430", "#7a6010", "#fcde6a");
}

// ── sea_shells — pair of small clamshells ─────────────────────────────────
function drawSeaShells(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  // Back shell (cream)
  ctx.save();
  ctx.translate(4, -2);
  ctx.rotate(0.25);
  const back = ctx.createLinearGradient(0, -12, 0, 8);
  back.addColorStop(0, "#fff8e0");
  back.addColorStop(0.6, "#e8d8b0");
  back.addColorStop(1, "#9a8460");
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.bezierCurveTo(-14, -10, 14, -10, 10, 6);
  ctx.bezierCurveTo(6, 8, -6, 8, -10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a4a28";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Radial ribs
  ctx.strokeStyle = "rgba(122,96,56,0.55)";
  ctx.lineWidth = 0.8;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(i * 3, -8);
    ctx.stroke();
  }
  ctx.restore();
  // Front shell (pearly pink-cream)
  ctx.save();
  ctx.translate(-4, 4);
  ctx.rotate(-0.18);
  const front = ctx.createLinearGradient(0, -10, 0, 8);
  front.addColorStop(0, "#fffaf0");
  front.addColorStop(0.6, "#f4ead0");
  front.addColorStop(1, "#a89878");
  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.bezierCurveTo(-14, -8, 14, -8, 10, 6);
  ctx.bezierCurveTo(6, 8, -6, 8, -10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a4a28";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(122,96,56,0.55)";
  ctx.lineWidth = 0.8;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(i * 3, -6);
    ctx.stroke();
  }
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-3, -2, 2, 1, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── pearls — trio of lustrous pearls ──────────────────────────────────────
function drawPearls(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  const positions = [
    [-9, 2, 7],
    [9, 0, 7],
    [0, -6, 8],
  ];
  for (const [cx, cy, r] of positions) {
    const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 1, cx, cy, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, "#f4eef4");
    grad.addColorStop(0.85, "#c4bcc8");
    grad.addColorStop(1, "#807888");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a4e60";
    ctx.lineWidth = 1.0;
    ctx.stroke();
    // Iridescent rim
    ctx.strokeStyle = "rgba(180,160,200,0.55)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1.2, 0.4, Math.PI - 0.4);
    ctx.stroke();
    // Specular highlight
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.4, cy - r * 0.4, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── auger — helical drill-bit boring a vertical column ────────────────────
function drawAuger(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 14, 4);
  // Handle at top
  ctx.save();
  const handleGrad = ctx.createLinearGradient(-3, -22, 3, -22);
  handleGrad.addColorStop(0, "#a87838");
  handleGrad.addColorStop(0.5, "#7a5028");
  handleGrad.addColorStop(1, "#3a2008");
  ctx.fillStyle = handleGrad;
  rr(ctx, -3, -22, 6, 14, 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  // Shaft (central vertical rod)
  const shaftGrad = ctx.createLinearGradient(-3, -8, 3, -8);
  shaftGrad.addColorStop(0, "#c8ccd4");
  shaftGrad.addColorStop(0.5, "#9da3a8");
  shaftGrad.addColorStop(1, "#5a6070");
  ctx.fillStyle = shaftGrad;
  rr(ctx, -2, -8, 4, 30, 1);
  ctx.fill();
  ctx.strokeStyle = "#3a4048";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  // Helical flutes — angled bands crossing the shaft
  ctx.save();
  ctx.beginPath();
  rr(ctx, -2, -8, 4, 30, 1);
  ctx.clip();
  ctx.strokeStyle = "#5a6070";
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 7; i++) {
    const y = -6 + i * 5;
    ctx.beginPath();
    ctx.moveTo(-8, y); ctx.lineTo(8, y + 3);
    ctx.stroke();
  }
  ctx.restore();
  // Tip — sharp triangular point
  const tipGrad = ctx.createLinearGradient(-4, 20, 4, 22);
  tipGrad.addColorStop(0, "#dde2e8");
  tipGrad.addColorStop(1, "#6a7280");
  ctx.fillStyle = tipGrad;
  ctx.beginPath();
  ctx.moveTo(-4, 20); ctx.lineTo(4, 20); ctx.lineTo(0, 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1e24";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Collar between handle and shaft
  ctx.fillStyle = "#c89030";
  ctx.fillRect(-4, -9, 8, 3);
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-4, -9, 8, 3);
  // Tip gleam
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(-1, 21, 0.8, 0, Math.PI * 2);
  ctx.fill();
}

// ── blast_charge — dynamite bundle with cross-blast motif ─────────────────
function drawBlastCharge(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Orange cross-blast lines behind the charge
  ctx.strokeStyle = "rgba(255,136,68,0.55)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-22, 0); ctx.lineTo(22, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,200,120,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -20); ctx.lineTo(0, 20);
  ctx.stroke();
  // Charge body (two red sticks)
  const drawStick = (x: number) => {
    const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    g.addColorStop(0, "#a82018"); g.addColorStop(0.5, "#e83a08"); g.addColorStop(1, "#5a0808");
    ctx.fillStyle = g;
    ctx.fillRect(x - 4, -10, 8, 22);
    ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.4;
    ctx.strokeRect(x - 4, -10, 8, 22);
    ctx.fillStyle = "#fffce0";
    ctx.fillRect(x - 4, -2, 8, 3);
    ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 0.7;
    ctx.strokeRect(x - 4, -2, 8, 3);
    ctx.fillStyle = "#3a0808"; ctx.font = "bold 5px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("BLT", x, 1);
  };
  drawStick(-5); drawStick(5);
  // Binding cord
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(9, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(9, 6); ctx.stroke();
  // Fuse
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(-3, -15, 5, -17, 3, -21); ctx.stroke();
  // Spark
  ctx.fillStyle = "#fff4a0";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 2.8 : 1;
    const px = 3 + Math.cos(a) * r; const py = -21 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

export const ICONS = {
  scythe_full:  { label: "Scythe (full)", color: "#c0c8d4", draw: drawScytheFull },
  iron_pick:    { label: "Iron Pick",     color: "#8a929c", draw: drawIronPick },
  stone_hammer: { label: "Stone Hammer",  color: "#8a9098", draw: drawStoneHammer },
  iron_ration:  { label: "Iron Ration",   color: "#5a4030", draw: drawIronRation },
  supplies:     { label: "Supplies",      color: "#a87838", draw: drawSupplies },
  hay_bundle:   { label: "Hay Bundle",    color: "#c9b160", draw: drawHayBundle },
  iron_bar:     { label: "Iron Bar",      color: "#8a8e94", draw: drawIronBar },
  copper_bar:   { label: "Copper Bar",    color: "#c97f3c", draw: drawCopperBar },
  gold_bar:     { label: "Gold Bar",      color: "#f4c430", draw: drawGoldBar },
  sea_shells:   { label: "Sea Shells",    color: "#f4ead0", draw: drawSeaShells },
  pearls:       { label: "Pearls",        color: "#e8e0e8", draw: drawPearls },
  auger:        { label: "Auger",         color: "#9da3a8", draw: drawAuger },
  blast_charge: { label: "Blast Charge",  color: "#ff8844", draw: drawBlastCharge },
};
