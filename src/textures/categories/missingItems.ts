// Tools and resources that previously had no registered icon — game code
// was looking them up by item key and getting "?" fallbacks. Adds:
//   - scythe_full   (tool, upgraded scythe — full crescent blade)
//   - iron_pick     (tool, upgraded pickaxe — iron-headed)
//   - stone_hammer  (tool, smashes cobble tiles)
//   - iron_ration   (mine resource, sealed metal ration tin)
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

// ── iron_ration — sealed metal ration tin (ring-pull lid + paper label) ────
function drawIronRation(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 16, 4);

  // ── Tin body: upright steel can, slightly wider than tall ──
  const bodyL = -13, bodyR = 13, bodyTop = -8, bodyBot = 15;
  const bodyGrad = ctx.createLinearGradient(bodyL, 0, bodyR, 0);
  bodyGrad.addColorStop(0, "#6c7480");      // shaded left
  bodyGrad.addColorStop(0.28, "#b9c2cc");
  bodyGrad.addColorStop(0.5, "#e9eef3");     // bright vertical cylinder sheen
  bodyGrad.addColorStop(0.72, "#aab3bd");
  bodyGrad.addColorStop(1, "#5a626d");       // shaded right
  ctx.fillStyle = bodyGrad;
  rr(ctx, bodyL, bodyTop, bodyR - bodyL, bodyBot - bodyTop, 3);
  ctx.fill();
  ctx.strokeStyle = "#23282e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Vertical seam line on the can body (right of centre, sells "tin")
  ctx.strokeStyle = "rgba(40,46,54,0.45)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(8, -6); ctx.lineTo(8, 13);
  ctx.stroke();

  // ── Paper label band wrapped around the body ──
  const labelGrad = ctx.createLinearGradient(bodyL, 0, bodyR, 0);
  labelGrad.addColorStop(0, "#c9a96a");
  labelGrad.addColorStop(0.3, "#f2e2bd");
  labelGrad.addColorStop(0.5, "#fbf2d8");
  labelGrad.addColorStop(0.72, "#e6d2a4");
  labelGrad.addColorStop(1, "#b89a5e");
  ctx.fillStyle = labelGrad;
  rr(ctx, bodyL + 0.5, -1, (bodyR - bodyL) - 1, 12, 1);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,92,44,0.7)";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Top & bottom rule lines on the label
  ctx.strokeStyle = "rgba(120,92,44,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(bodyL + 1.5, 1.2); ctx.lineTo(bodyR - 1.5, 1.2);
  ctx.moveTo(bodyL + 1.5, 9.8); ctx.lineTo(bodyR - 1.5, 9.8);
  ctx.stroke();
  // Food cue on the label: a stamped biscuit/cracker disc (dimpled ration block)
  ctx.fillStyle = "#9c6b32";
  ctx.beginPath();
  ctx.arc(-6, 5.5, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3c16";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,238,200,0.35)";
  ctx.beginPath();
  ctx.arc(-7, 4.4, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(70,44,16,0.75)";
  [[-7.3, 5.5], [-4.7, 5.5], [-6, 4.2], [-6, 6.8]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.55, 0, Math.PI * 2);
    ctx.fill();
  });
  // Three printed text lines beside the biscuit (faux ration print)
  ctx.strokeStyle = "rgba(96,72,36,0.8)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 3.4); ctx.lineTo(9, 3.4);
  ctx.moveTo(0, 5.5); ctx.lineTo(8, 5.5);
  ctx.moveTo(0, 7.6); ctx.lineTo(9, 7.6);
  ctx.stroke();

  // ── Lid: domed steel top with a chime rim (3/4 ellipse) ──
  const lidGrad = ctx.createLinearGradient(0, -12, 0, -4);
  lidGrad.addColorStop(0, "#f4f8fb");
  lidGrad.addColorStop(0.5, "#c4ccd5");
  lidGrad.addColorStop(1, "#7e8792");
  ctx.fillStyle = lidGrad;
  ctx.beginPath();
  ctx.ellipse(0, -8, 13, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#23282e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Inner score ring on the lid (pull-tab seam)
  ctx.strokeStyle = "rgba(40,46,54,0.4)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(0, -8, 9.5, 2.9, 0, 0, Math.PI * 2);
  ctx.stroke();

  // ── Ring-pull tab on the lid (the unmistakable canned-ration cue) ──
  ctx.strokeStyle = "#dfe5ea";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, -9, 4.4, 2.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#5a626d";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.ellipse(0.4, -8.4, 4.4, 2.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Rivet holding the tab to the lid
  ctx.fillStyle = "#9aa2ac";
  ctx.beginPath();
  ctx.arc(0, -7.4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a4046";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Bright vertical metal glint down the left of the body
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-8, -5); ctx.lineTo(-8, 13);
  ctx.stroke();
}

// ── supplies — simple supply bundle (sack + lashed crate corner + apple) ──
function drawSupplies(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);

  // Wooden crate peeking out behind the sack on the upper-right. Kept fully
  // inside the box (max x = 17) and sat high so only a lit top face + a short
  // front edge show above the sack's shoulder — reads as a crate stacked
  // behind, not a side handle dangling off the silhouette.
  // Short front face
  const crateFront = ctx.createLinearGradient(8, -6, 8, 6);
  crateFront.addColorStop(0, "#b08440");
  crateFront.addColorStop(1, "#7a5226");
  ctx.fillStyle = crateFront;
  ctx.beginPath();
  ctx.moveTo(9, 6);
  ctx.lineTo(17, 6);
  ctx.lineTo(17, -6);
  ctx.lineTo(9, -6);
  ctx.closePath();
  ctx.fill();
  // Lit top face (parallelogram) — sells the 3D box read
  ctx.fillStyle = "#d4a460";
  ctx.beginPath();
  ctx.moveTo(9, -6);
  ctx.lineTo(17, -6);
  ctx.lineTo(14, -11);
  ctx.lineTo(6, -11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(9, 6);
  ctx.lineTo(17, 6);
  ctx.lineTo(17, -6);
  ctx.lineTo(14, -11);
  ctx.lineTo(6, -11);
  ctx.lineTo(9, -6);
  ctx.closePath();
  ctx.stroke();
  // Plank seam + top edge
  ctx.strokeStyle = "rgba(40,16,4,0.5)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(13, -6); ctx.lineTo(13, 6);
  ctx.moveTo(9, -6); ctx.lineTo(17, -6);
  ctx.stroke();

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

// ── hay_bundle — classic rectangular hay bale (same art as pre–tile_grass_grass) ─
function drawHayBundle(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 21, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createLinearGradient(0, -20, 0, 22);
  body.addColorStop(0, "#f4cf63");
  body.addColorStop(0.55, "#d4a020");
  body.addColorStop(1, "#8a5e14");
  ctx.fillStyle = body;
  rr(ctx, -22, -20, 44, 42, 8);
  ctx.fill();
  ctx.strokeStyle = "#5e3a08";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.save();
  rr(ctx, -22, -20, 44, 42, 8);
  ctx.clip();
  ctx.strokeStyle = "rgba(94,58,8,0.55)";
  ctx.lineWidth = 1.4;
  [-16, -8, 0, 8, 16].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -18);
    ctx.lineTo(x + 1.5, 20);
    ctx.stroke();
  });
  ctx.strokeStyle = "rgba(255,232,144,0.7)";
  ctx.lineWidth = 1.1;
  [-12, -4, 4, 12].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -18);
    ctx.lineTo(x + 1.5, 20);
    ctx.stroke();
  });
  ctx.restore();
  ctx.strokeStyle = "#5e3a08";
  ctx.lineWidth = 3.6;
  [-7, 9].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-22, y);
    ctx.lineTo(22, y);
    ctx.stroke();
  });
  ctx.strokeStyle = "rgba(255,200,120,0.6)";
  ctx.lineWidth = 1.1;
  [-9, 7].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.lineTo(20, y);
    ctx.stroke();
  });
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  ctx.beginPath();
  ctx.ellipse(-11, -12, 6, 4, -0.5, 0, Math.PI * 2);
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
  const backPath = () => {
    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.bezierCurveTo(-14, -10, 14, -10, 10, 6);
    ctx.bezierCurveTo(6, 8, -6, 8, -10, 6);
    ctx.closePath();
  };
  backPath();
  ctx.fill();
  ctx.strokeStyle = "#5a4a28";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Radial ribs — clipped to the shell so they never poke out as spikes
  ctx.save();
  backPath();
  ctx.clip();
  ctx.strokeStyle = "rgba(122,96,56,0.55)";
  ctx.lineWidth = 0.8;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(i * 3.2, -9);
    ctx.stroke();
  }
  ctx.restore();
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
  const frontPath = () => {
    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.bezierCurveTo(-14, -8, 14, -8, 10, 6);
    ctx.bezierCurveTo(6, 8, -6, 8, -10, 6);
    ctx.closePath();
  };
  frontPath();
  ctx.fill();
  ctx.strokeStyle = "#5a4a28";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.save();
  frontPath();
  ctx.clip();
  ctx.strokeStyle = "rgba(122,96,56,0.55)";
  ctx.lineWidth = 0.8;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(i * 3.2, -7);
    ctx.stroke();
  }
  ctx.restore();
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

// ── auger — boring bit: narrow shaft wrapped in PROUD helical flighting ────
// The defining read is screw flighting that stands out beyond a thin shaft and
// breaks the silhouette into a scalloped screw-thread edge. We therefore build
// the body from stacked half-turn "flight lobes" that bulge left/right of the
// core on alternating sides; each lobe's curved edges form the scalloped
// outline, and the visible front of each turn is a curved (chevroning) band —
// not a flat parallel stripe.
function drawAuger(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 9, 3.5);

  // Geometry: a long, narrow threaded shaft.
  const yTop = -8;          // top of the threaded section
  const yBot = 22;          // where the lead point begins
  const span = yBot - yTop;
  const coreTop = 2.4;      // core half-width at top
  const coreBot = 1.0;      // core half-width near the point (tapering)
  const flightTop = 6.2;    // flight radius (proud of core) at top
  const flightBot = 2.6;    // flight radius near the point
  const t = (y: number) => (y - yTop) / span;            // 0..1 down the shaft
  const coreAt = (y: number) => coreTop + (coreBot - coreTop) * t(y);
  const flightAt = (y: number) => flightTop + (flightBot - flightTop) * t(y);

  const pitch = 5.0;        // vertical rise of one full thread turn
  const half = pitch / 2;   // a half-turn = one visible front lobe

  // ── Dark central shaft (thin) the flighting wraps around ──
  const shaftGrad = ctx.createLinearGradient(-coreTop, 0, coreTop, 0);
  shaftGrad.addColorStop(0, "#2a3038");
  shaftGrad.addColorStop(0.5, "#525a66");
  shaftGrad.addColorStop(1, "#1e242c");
  ctx.fillStyle = shaftGrad;
  ctx.beginPath();
  ctx.moveTo(-coreAt(yTop), yTop);
  ctx.lineTo(coreAt(yTop), yTop);
  ctx.lineTo(coreAt(yBot), yBot);
  ctx.lineTo(-coreAt(yBot), yBot);
  ctx.closePath();
  ctx.fill();

  // ── Helical flight lobes ──
  // Each half-turn the front of the helix crosses from one side to the other.
  // A lobe is a curved leaf: it bows OUT past the core on its leading side and
  // tucks back to the core at top & bottom, so successive lobes scallop the
  // silhouette. Alternating side each half-turn gives the spiral wrap.
  for (let i = 0, y = yTop; y < yBot; i++, y += half) {
    // Overlap each lobe slightly into its neighbours so the thread reads as one
    // continuous winding spiral instead of separate beads.
    const yA = Math.max(y - half * 0.18, yTop);          // lobe top (on the core)
    const yB = Math.min(y + half * 1.18, yBot);          // lobe bottom (on the core)
    const yM = (y + Math.min(y + half, yBot)) / 2;       // widest point of the lobe
    const side = i % 2 === 0 ? 1 : -1;   // which way this half-turn bulges
    const core = coreAt(yM) * side;
    const out = flightAt(yM) * side;     // proud outer edge of the flight

    // Front face of the flight (lit). Curved outer edge = scalloped silhouette;
    // curved inner edge meets the shaft so the band chevrons rather than runs
    // straight. Sweeps down the leading edge, back up the trailing edge.
    const g = ctx.createLinearGradient(core, yA, out, yB);
    g.addColorStop(0, "#eef2f6");
    g.addColorStop(0.45, "#b6bdc6");
    g.addColorStop(1, "#737b86");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(coreAt(yA) * side, yA);
    // leading edge bows out to the proud tip
    ctx.quadraticCurveTo(out, yA + half * 0.18, out, yM);
    ctx.quadraticCurveTo(out, yB - half * 0.18, coreAt(yB) * side, yB);
    // trailing edge curves back in toward the shaft centre line
    ctx.quadraticCurveTo(core * 0.2, yM, coreAt(yA) * side, yA);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#161b22";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Crisp lit ridge along the leading (outer) edge of the flight
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(coreAt(yA) * side, yA + 0.4);
    ctx.quadraticCurveTo(out * 0.96, yM, coreAt(yB) * side, yB - 0.4);
    ctx.stroke();

    // Shaded valley where this turn meets the shaft (the thread groove)
    ctx.strokeStyle = "rgba(12,16,22,0.5)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(coreAt(yA) * side, yA);
    ctx.quadraticCurveTo(core * 0.35, yM, coreAt(yB) * side, yB);
    ctx.stroke();
  }

  // ── Lead-screw point continuing the taper ──
  const tipGrad = ctx.createLinearGradient(0, yBot, 0, 28);
  tipGrad.addColorStop(0, "#dde2e8");
  tipGrad.addColorStop(1, "#5a626d");
  ctx.fillStyle = tipGrad;
  ctx.beginPath();
  ctx.moveTo(-coreAt(yBot) - 0.4, yBot);
  ctx.lineTo(coreAt(yBot) + 0.4, yBot);
  ctx.lineTo(0, 28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#161b22";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // small starter-thread nick on the point
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-1.4, yBot + 2); ctx.lineTo(0.8, yBot + 4.5);
  ctx.stroke();

  // ── Top shank + handle ──
  // Short round shank above the threading.
  const shankGrad = ctx.createLinearGradient(-2.4, 0, 2.4, 0);
  shankGrad.addColorStop(0, "#5a626d");
  shankGrad.addColorStop(0.5, "#aeb6c0");
  shankGrad.addColorStop(1, "#4a525c");
  ctx.fillStyle = shankGrad;
  rr(ctx, -2.4, -13, 4.8, 6, 1);
  ctx.fill();
  ctx.strokeStyle = "#161b22";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  // Brass collar/ferrule where shank meets the handle
  ctx.fillStyle = "#c89030";
  rr(ctx, -4.5, -16, 9, 4, 1.2);
  ctx.fill();
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Wooden cross handle (T-bar grip at the top)
  const handleGrad = ctx.createLinearGradient(-13, -22, 13, -22);
  handleGrad.addColorStop(0, "#5a3014");
  handleGrad.addColorStop(0.5, "#a87838");
  handleGrad.addColorStop(1, "#5a3014");
  ctx.fillStyle = handleGrad;
  rr(ctx, -13, -23, 26, 7, 3.5);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Handle sheen
  ctx.strokeStyle = "rgba(255,225,170,0.5)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-10, -21.5); ctx.lineTo(10, -21.5);
  ctx.stroke();
}

// ── blast_charge — dynamite bundle with cross-blast motif ─────────────────
function drawBlastCharge(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 18, 4);
  // Charge body (two red sticks)
  const drawStick = (x: number) => {
    const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    g.addColorStop(0, "#a82018"); g.addColorStop(0.5, "#e83a08"); g.addColorStop(1, "#5a0808");
    ctx.fillStyle = g;
    ctx.fillRect(x - 4, -10, 8, 22);
    ctx.strokeStyle = "#1a0408"; ctx.lineWidth = 1.4;
    ctx.strokeRect(x - 4, -10, 8, 22);
    // Cap band near the top of each stick
    ctx.fillStyle = "#fffce0";
    ctx.fillRect(x - 4, -2, 8, 3);
    ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 0.7;
    ctx.strokeRect(x - 4, -2, 8, 3);
    // Vertical sheen streak
    ctx.strokeStyle = "rgba(255,200,160,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 1.5, -8); ctx.lineTo(x - 1.5, 10); ctx.stroke();
  };
  drawStick(-5); drawStick(5);
  // Binding cord
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(9, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(9, 6); ctx.stroke();
  // Fuse
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(-3, -14, 5, -15, 3, -18); ctx.stroke();
  // Tight ember glow localized to the fuse tip only (stays well inside the box)
  const spark = ctx.createRadialGradient(3, -18, 0.5, 3, -18, 5.5);
  spark.addColorStop(0, "rgba(255,228,150,0.85)");
  spark.addColorStop(0.5, "rgba(255,168,72,0.35)");
  spark.addColorStop(1, "rgba(255,150,60,0)");
  ctx.fillStyle = spark;
  ctx.beginPath();
  ctx.arc(3, -18, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // Spark star at the fuse tip
  ctx.fillStyle = "#fff4a0";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 2.6 : 1;
    const px = 3 + Math.cos(a) * r; const py = -18 + Math.sin(a) * r;
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
  hay_bundle:   { label: "Hay Bundle",    color: "#e8b85c", draw: drawHayBundle },
  iron_bar:     { label: "Iron Bar",      color: "#8a8e94", draw: drawIronBar },
  copper_bar:   { label: "Copper Bar",    color: "#c97f3c", draw: drawCopperBar },
  gold_bar:     { label: "Gold Bar",      color: "#f4c430", draw: drawGoldBar },
  sea_shells:   { label: "Sea Shells",    color: "#f4ead0", draw: drawSeaShells },
  pearls:       { label: "Pearls",        color: "#e8e0e8", draw: drawPearls },
  auger:        { label: "Auger",         color: "#9da3a8", draw: drawAuger },
  blast_charge: { label: "Blast Charge",  color: "#ff8844", draw: drawBlastCharge },
};
