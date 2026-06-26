// Wave 8 — Farm Tools.

function shadow(ctx: CanvasRenderingContext2D, w: number, y?: number) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, y || 22, w, 4, 0, 0, Math.PI*2); ctx.fill();
}

// Wood handle helper — diagonal handle from one corner
function woodHandle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -width/2, 0, width/2);
  g.addColorStop(0, "#7a4a18"); g.addColorStop(0.5, "#a87838"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.fillRect(0, -width/2, len, width);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.strokeRect(0, -width/2, len, width);
  // wood grain
  ctx.strokeStyle = "rgba(26,14,4,0.4)"; ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(len*0.1*i, -width/2 + 0.5); ctx.lineTo(len*0.1*i + len*0.7, -width/2 + 0.5); ctx.stroke(); }
  ctx.restore();
}

// Metal head helper — uses given path
function metalGleam(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.ellipse(x, y, r*0.4, r*0.8, -0.4, 0, Math.PI*2); ctx.fill();
}

function drawRake(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Handle lifted up/right so the head no longer crowds the lower-left edge.
  woodHandle(ctx, 18, -20, -6, 10, 4);
  // Head
  ctx.save(); ctx.translate(-8, 12); ctx.rotate(-Math.atan2(10 - (-20), -6 - 18));
  // Cross bar
  ctx.fillStyle = "#6a5614"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4;
  ctx.fillRect(-2, -2, 18, 4); ctx.strokeRect(-2, -2, 18, 4);
  // Tines — brighter steel with a light core so they stay legible over the bar.
  for (let i = 0; i < 6; i++) {
    const x = i * 3;
    ctx.fillStyle = "#cfcab4"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x - 0.9, 2); ctx.lineTo(x + 0.9, 2); ctx.lineTo(x + 0.7, 10); ctx.lineTo(x - 0.7, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // bright highlight down the centre of each tine
    ctx.fillStyle = "#f4f0e0";
    ctx.fillRect(x - 0.3, 2.5, 0.6, 6);
    // darker pointed tip
    ctx.fillStyle = "#7a7058"; ctx.beginPath();
    ctx.moveTo(x - 0.7, 10); ctx.lineTo(x, 12.5); ctx.lineTo(x + 0.7, 10); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawAxe(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  woodHandle(ctx, 14, -18, -10, 18, 4);
  // Head — single-bit axe blade: slim poll (back) at the handle, wide curved
  // cutting edge sweeping out to the left.
  ctx.save(); ctx.translate(9, -13);
  const headG = ctx.createLinearGradient(2, 0, -18, 0);
  headG.addColorStop(0, "#3a3a40"); headG.addColorStop(0.55, "#a8a8b0"); headG.addColorStop(1, "#fffce8");
  ctx.fillStyle = headG;
  ctx.beginPath();
  // Poll (slim block hugging the handle)
  ctx.moveTo(4, -5); ctx.lineTo(4, 9);
  // Slim neck flaring toward the blade
  ctx.lineTo(-4, 6); ctx.lineTo(-4, -2);
  // Cheek widening out and the curved bit (cutting edge)
  ctx.lineTo(-14, -9);
  ctx.bezierCurveTo(-20, -3, -20, 7, -14, 13);
  ctx.lineTo(-4, 8); ctx.lineTo(-4, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.stroke();
  // Bright bevel along the cutting edge
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(-14, -9); ctx.bezierCurveTo(-20, -3, -20, 7, -14, 13);
  ctx.bezierCurveTo(-16, 7, -16, -3, -14, -9); ctx.closePath(); ctx.fill();
  metalGleam(ctx, -8, 2, 4);
  ctx.restore();
}

function drawSapling(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Pot
  const potG = ctx.createLinearGradient(-12, 6, 12, 22);
  potG.addColorStop(0, "#a85420"); potG.addColorStop(1, "#5a2808");
  ctx.fillStyle = potG;
  ctx.beginPath();
  ctx.moveTo(-12, 6); ctx.lineTo(12, 6); ctx.lineTo(10, 22); ctx.lineTo(-10, 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a1808"; ctx.lineWidth = 1.6; ctx.stroke();
  // Pot rim
  ctx.fillStyle = "#8a3818";
  ctx.beginPath(); ctx.ellipse(0, 6, 12, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a1808"; ctx.lineWidth = 1.4; ctx.stroke();
  // Soil
  ctx.fillStyle = "#3a1a08";
  ctx.beginPath(); ctx.ellipse(0, 6, 11, 2, 0, 0, Math.PI*2); ctx.fill();
  // Stem
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-2, -2, 2, -8, 0, -16); ctx.stroke();
  // Leaves
  const leaf = (cx: number, cy: number, rx: number, ry: number, ang: number, c1: string) => {
    ctx.fillStyle = c1;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#1f3a08"; ctx.lineWidth = 1.0; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(rx, 0); ctx.stroke();
    ctx.restore();
  };
  leaf(-7, -8, 8, 4, -0.4, "#7eb83a");
  leaf(7, -10, 8, 4, 0.4, "#5a8a18");
  leaf(0, -16, 6, 3, 0, "#9cd048");
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-9, -8, 2, 1, -0.4, 0, Math.PI*2); ctx.fill();
}

function drawTrimmer(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Two crossed handles
  ctx.save(); ctx.translate(0, 4);
  ctx.fillStyle = "#a82018"; ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.4;
  // Handle 1
  ctx.save(); ctx.rotate(0.3);
  ctx.beginPath();
  ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(2, 18); ctx.bezierCurveTo(2, 22, -6, 22, -6, 18);
  ctx.bezierCurveTo(-6, 16, -2, 16, -2, 12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.rotate(-0.3);
  ctx.beginPath();
  ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(2, 18); ctx.bezierCurveTo(2, 22, -6, 22, -6, 18);
  ctx.bezierCurveTo(-6, 16, -2, 16, -2, 12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Blades — two crossing metal blades forming a clear open "V" of shears.
  // Each blade is a tapered solid sweeping from the pivot to a point near the top.
  const bladeG = ctx.createLinearGradient(-6, -22, 6, 2);
  bladeG.addColorStop(0, "#fff8e0"); bladeG.addColorStop(0.55, "#b4b4bc"); bladeG.addColorStop(1, "#5a5a62");
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
  // Left blade: root at right of pivot, tip up-left.
  ctx.fillStyle = bladeG;
  ctx.beginPath();
  ctx.moveTo(1.5, 1);
  ctx.bezierCurveTo(0, -8, -4, -16, -7, -22);
  ctx.bezierCurveTo(-4, -18, -1, -10, 4, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Right blade: root at left of pivot, tip up-right.
  ctx.beginPath();
  ctx.moveTo(-1.5, 1);
  ctx.bezierCurveTo(0, -8, 4, -16, 7, -22);
  ctx.bezierCurveTo(4, -18, 1, -10, -4, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Sharp inner highlight on each blade
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-1, -4); ctx.bezierCurveTo(-3, -12, -5, -17, -6.5, -20.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1, -4); ctx.bezierCurveTo(3, -12, 5, -17, 6.5, -20.5); ctx.stroke();
  // Pivot bolt last, sitting over the blade roots.
  ctx.fillStyle = "#6a6a72"; ctx.beginPath(); ctx.arc(0, 2, 2.6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.arc(-0.8, 1.2, 1.0, 0, Math.PI*2); ctx.fill();
}

function drawScythe(ctx: CanvasRenderingContext2D) {
  // A scythe: a long two-handed snath running corner to corner with a small
  // hand-nib partway up, and a long sweeping blade off the BOTTOM end. The
  // length + low-angled blade distinguish it from the short hooked sickle.
  shadow(ctx, 18);
  // Long snath, top-right down to bottom-left.
  woodHandle(ctx, 20, -24, -14, 17, 4);
  // Second hand-grip (nib) partway up the snath.
  ctx.save();
  ctx.translate(6, -6); ctx.rotate(-Math.atan2(17 - (-24), -14 - 20));
  ctx.fillStyle = "#3a2008"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.fillRect(-1.5, -7, 4, 8); ctx.strokeRect(-1.5, -7, 4, 8);
  ctx.restore();
  // Long blade sweeping low off the bottom-left end of the snath.
  ctx.save(); ctx.translate(-14, 17);
  const g = ctx.createLinearGradient(0, 0, 26, -4);
  g.addColorStop(0, "#3a3a40"); g.addColorStop(0.5, "#a8a8b0"); g.addColorStop(1, "#fff8e0");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 2); ctx.bezierCurveTo(8, 0, 20, -2, 26, -10);
  ctx.bezierCurveTo(22, -3, 12, 4, 0, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Bright cutting-edge highlight along the top of the blade.
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.moveTo(1, 1); ctx.bezierCurveTo(9, -1, 20, -3, 26, -10); ctx.bezierCurveTo(20, -5, 11, 0, 1, 2.4);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawSickle(ctx: CanvasRenderingContext2D) {
  // A sickle: short one-handed wooden grip at the bottom, with a deeply hooked
  // crescent (C-shaped) blade curling back over it. Compact and curved, the
  // opposite of the scythe's long straight snath.
  shadow(ctx, 14);
  // Short stubby handle at lower-right.
  woodHandle(ctx, 12, 16, 0, -2, 5);
  // Wrap / ferrule where blade meets handle.
  ctx.save(); ctx.translate(0, -2);
  ctx.fillStyle = "#5a3814"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
  // Deeply hooked crescent blade sweeping up-left and curling back to the right.
  const g = ctx.createLinearGradient(-14, -4, 6, -22);
  g.addColorStop(0, "#3a3a40"); g.addColorStop(0.5, "#a8a8b0"); g.addColorStop(1, "#fff8e0");
  ctx.fillStyle = g;
  ctx.beginPath();
  // outer back of the blade
  ctx.moveTo(-1, -3);
  ctx.bezierCurveTo(-14, -4, -16, -20, -2, -24);
  ctx.bezierCurveTo(8, -26, 14, -20, 14, -12);
  // inner (sharp) edge curling back
  ctx.bezierCurveTo(11, -17, 5, -19, -1, -17);
  ctx.bezierCurveTo(-9, -15, -8, -7, 1, -5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Bright inner cutting edge.
  ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -5.5);
  ctx.bezierCurveTo(-7, -7, -8, -14, -1, -16);
  ctx.bezierCurveTo(6, -18, 11, -16, 13, -12.5);
  ctx.stroke();
}

function drawFertilizer(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Sack
  const g = ctx.createLinearGradient(-14, 0, 14, 0);
  g.addColorStop(0, "#a89060"); g.addColorStop(0.5, "#d8c890"); g.addColorStop(1, "#7a6038");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-14, -6); ctx.bezierCurveTo(-16, 12, -10, 22, 0, 22);
  ctx.bezierCurveTo(10, 22, 16, 12, 14, -6);
  ctx.lineTo(8, -10); ctx.lineTo(-8, -10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2810"; ctx.lineWidth = 2.0; ctx.stroke();
  // Tied top
  ctx.strokeStyle = "#3a2810"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.bezierCurveTo(-4, -16, 4, -16, 8, -10); ctx.stroke();
  // Cinch rope
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(9, -8); ctx.stroke();
  // Label
  ctx.fillStyle = "#3a6818";
  ctx.fillRect(-8, 4, 16, 10);
  ctx.strokeStyle = "#1a3008"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-8, 4, 16, 10);
  // NPK glyph
  ctx.fillStyle = "#fffce0"; ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("N P K", 0, 11);
  // Spilled granules at bottom
  ctx.fillStyle = "#a86838";
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(-10 + i*3, 24, 1.4, 0, Math.PI*2); ctx.fill(); }
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-7, 0, 3, 8, -0.3, 0, Math.PI*2); ctx.fill();
}

function drawPlough(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  // Side-view horse-drawn mouldboard plough, ploughing to the RIGHT.
  // Silhouette priorities (so it never reads as a scoop/ladle):
  //   * a roughly HORIZONTAL wooden frame (beam on top, landside sole at the
  //     base) is the dominant element;
  //   * a distinct forward-thrusting POINTED SHARE bites at the bottom-right;
  //   * an asymmetric, twisted mouldboard WING (concave S-curve, not a dome)
  //     rises and curls back-left above the share;
  //   * two slim stilt HANDLES read clearly at the back, never dominating.

  // --- Landside / sole: the flat horizontal frame bar dragging along the
  // furrow bottom. This horizontal base is what stops the read from being a
  // hand tool on a stick.
  ctx.fillStyle = "#6a4214"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-22, 16); ctx.lineTo(10, 16); ctx.lineTo(10, 21); ctx.lineTo(-22, 21);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // --- Main beam: a stout wooden spar running near-horizontally across the
  // top of the frame, dipping forward to the frog where the share mounts.
  ctx.fillStyle = "#7a4818";
  ctx.beginPath();
  ctx.moveTo(-22, -4); ctx.lineTo(-6, -7); ctx.lineTo(8, 4); ctx.lineTo(6, 9); ctx.lineTo(-22, 1);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // wood-grain hints on the beam
  ctx.strokeStyle = "rgba(26,14,4,0.4)"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(-20, -2); ctx.lineTo(2, 5); ctx.stroke();

  // --- Standard/frog: short upright post tying beam to the sole at the front.
  ctx.fillStyle = "#5a3410"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2, 4); ctx.lineTo(6, 6); ctx.lineTo(6, 17); ctx.lineTo(-2, 16);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // --- Two stilt handles: slim wooden arms angling up off the BACK of the
  // beam. Kept thin so the frame, not the handles, owns the silhouette.
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-20, -2); ctx.bezierCurveTo(-24, -10, -25, -18, -23, -23); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.bezierCurveTo(-19, -8, -20, -15, -18, -20); ctx.stroke();
  // cross-grip joining the two stilt tops
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-24, -22); ctx.lineTo(-17, -19); ctx.stroke();
  // dark end caps
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.arc(-23, -23, 2.0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-18, -20, 1.8, 0, Math.PI*2); ctx.fill();

  // --- Mouldboard: the asymmetric TWISTED steel wing that lifts and rolls the
  // soil. Drawn as a concave-then-flaring S sweep curling up and back-left,
  // deliberately NOT a symmetric dome.
  const mbG = ctx.createLinearGradient(0, 2, 16, 14);
  mbG.addColorStop(0, "#e2e2ea"); mbG.addColorStop(0.45, "#9a9aa4"); mbG.addColorStop(1, "#34343a");
  ctx.fillStyle = mbG;
  ctx.beginPath();
  ctx.moveTo(2, 15);                                   // root at the share heel
  ctx.bezierCurveTo(-2, 6, 2, -4, 13, -6);             // inner concave face sweeping up-right
  ctx.bezierCurveTo(18, -7, 17, -1, 13, 3);            // crest hooking back over (the twist)
  ctx.bezierCurveTo(11, 5, 12, 9, 9, 12);              // outer flank rolling down
  ctx.bezierCurveTo(8, 14, 6, 15, 2, 15);              // trailing edge to the sole
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.6; ctx.stroke();
  // hard fold-line tracing the twist (reads as a curled wing, not a ball)
  ctx.strokeStyle = "rgba(20,20,24,0.6)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(3, 12); ctx.bezierCurveTo(4, 4, 9, -2, 14, -2); ctx.stroke();
  // bright sheen along the upper concave face
  ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(5, 8); ctx.bezierCurveTo(6, 0, 10, -4, 14, -4); ctx.stroke();

  // --- Ploughshare: the wedge-shaped steel point thrusting FORWARD (right)
  // along the sole, biting into the soil ahead of the mouldboard.
  const shareG = ctx.createLinearGradient(2, 14, 24, 22);
  shareG.addColorStop(0, "#5a5a62"); shareG.addColorStop(0.5, "#fff8e0"); shareG.addColorStop(1, "#7a7a84");
  ctx.fillStyle = shareG;
  ctx.beginPath();
  ctx.moveTo(2, 12); ctx.lineTo(25, 21); ctx.lineTo(8, 21); ctx.lineTo(2, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  // bright leading edge along the share's cutting point
  ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.moveTo(3, 13); ctx.lineTo(24, 20.5); ctx.stroke();
}

function drawBirdCage(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Base
  ctx.fillStyle = "#5a3814";
  ctx.beginPath(); ctx.ellipse(0, 18, 14, 3.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Cage interior (slight glow)
  ctx.fillStyle = "rgba(255,240,200,0.4)";
  ctx.beginPath(); ctx.ellipse(0, 4, 12, 14, 0, 0, Math.PI*2); ctx.fill();
  // Vertical bars
  ctx.strokeStyle = "#a8a8b0"; ctx.lineWidth = 1.4;
  for (let i = -10; i <= 10; i += 2.5) {
    ctx.beginPath();
    ctx.moveTo(i, 18);
    ctx.lineTo(i, -10);
    ctx.stroke();
  }
  // Top dome
  ctx.fillStyle = "#a82018";
  ctx.beginPath(); ctx.ellipse(0, -10, 12, 6, 0, Math.PI, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.4; ctx.stroke();
  // Hoop top
  ctx.fillStyle = "#7a3018";
  ctx.fillRect(-2, -16, 4, 4);
  ctx.beginPath(); ctx.arc(0, -18, 3, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.2; ctx.stroke();
  // Perch
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(8, 6); ctx.stroke();
  // Tiny bird
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.ellipse(0, 2, 4, 3.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = "#f08020"; ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(-7, 2); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-3, 1, 0.7, 0, Math.PI*2); ctx.fill();
}

function drawBirdFeed(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Bowl
  const bowlG = ctx.createLinearGradient(-12, 6, 12, 18);
  bowlG.addColorStop(0, "#d8c898"); bowlG.addColorStop(1, "#7a5018");
  ctx.fillStyle = bowlG;
  ctx.beginPath();
  ctx.moveTo(-14, 4); ctx.lineTo(14, 4); ctx.lineTo(10, 18); ctx.lineTo(-10, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  // Rim
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.ellipse(0, 4, 14, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4; ctx.stroke();
  // Pile of seeds heaped above
  const seeds = [];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 8; i++) {
      const x = -10 + i*3 + (r%2?1.5:0);
      const y = 0 - r*3;
      seeds.push([x, y, r]);
    }
  }
  seeds.forEach(([x, y]) => {
    const colors = ["#f0a020", "#a87838", "#5a3814", "#d8a040"];
    ctx.fillStyle = colors[(x + y) % 4];
    if ((x + y) % 4 < 0) ctx.fillStyle = colors[0];
    // teardrop
    ctx.beginPath(); ctx.ellipse(x, y, 1.4, 2.2, x*0.3, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.4; ctx.stroke();
  });
  // top of pile
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.arc(0, -10, 3, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.6; ctx.stroke();
}

function drawHoe(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Handle nudged up/right so the whole tool centres in the box.
  woodHandle(ctx, 18, -20, -6, 12, 4);
  // Head — blade hung off the handle foot, angled down for a clear chopping edge.
  ctx.save(); ctx.translate(-8, 14); ctx.rotate(0.22);
  // Gooseneck connector bending from the handle to the blade.
  ctx.fillStyle = "#5a3814"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -10); ctx.lineTo(3, -10); ctx.lineTo(2, 0); ctx.lineTo(-2, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Blade — a downward-facing trapezoid with a wider chopping edge at the bottom.
  const g = ctx.createLinearGradient(-12, -2, 2, 8);
  g.addColorStop(0, "#fff8e0"); g.addColorStop(0.55, "#a8a8b0"); g.addColorStop(1, "#3a3a40");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-9, 0); ctx.lineTo(3, 0); ctx.lineTo(5, 7); ctx.lineTo(-12, 7);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.lineJoin = "round"; ctx.stroke();
  // Bright bevel along the cutting edge.
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.moveTo(-12, 7); ctx.lineTo(5, 7); ctx.lineTo(4, 5); ctx.lineTo(-11, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawFruitPicker(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 13);
  // Long pole, lower-right to upper-left.
  woodHandle(ctx, 8, 22, -3, -6, 3);
  // Picker head: an open metal claw cradling a fruit, mounted on the pole top.
  ctx.save(); ctx.translate(-3, -6);
  // Apple cradled in the claw (drawn first so prongs wrap over it)
  const ag = ctx.createRadialGradient(-3, -14, 1, 0, -10, 9);
  ag.addColorStop(0, "#ff9a4a"); ag.addColorStop(0.6, "#d8401c"); ag.addColorStop(1, "#7a1410");
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.arc(0, -11, 6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.0; ctx.stroke();
  // little leaf
  ctx.fillStyle = "#5a8a18";
  ctx.beginPath(); ctx.ellipse(3, -16, 3, 1.6, 0.6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1f3a08"; ctx.lineWidth = 0.7; ctx.stroke();
  // Metal collar at the pole top
  ctx.fillStyle = "#8a8a92"; ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(0, -2, 6, 3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Curved claw prongs reaching up around the fruit
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  const prong = (sx: number, mx: number, tx: number, ty: number) => {
    ctx.beginPath(); ctx.moveTo(sx, -3); ctx.bezierCurveTo(mx, -10, tx, -16, tx, ty); ctx.stroke();
  };
  prong(-5, -8, -7, -15);
  prong(-2, -4, -3, -18);
  prong(2, 4, 3, -18);
  prong(5, 8, 7, -15);
  // wire colour on top of the contour
  ctx.strokeStyle = "#b0b0b8"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-5, -3); ctx.bezierCurveTo(-8, -10, -7, -15, -7, -15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -3); ctx.bezierCurveTo(8, -10, 7, -15, 7, -15); ctx.stroke();
  ctx.restore();
}

function drawMilkChurn(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Body — tall metal canister
  const g = ctx.createLinearGradient(-12, 0, 12, 0);
  g.addColorStop(0, "#5a6878"); g.addColorStop(0.5, "#c8d8e8"); g.addColorStop(1, "#3a4858");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-12, -6); ctx.lineTo(12, -6); ctx.lineTo(10, 18); ctx.lineTo(-10, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1e28"; ctx.lineWidth = 2.0; ctx.stroke();
  // Bands
  ctx.strokeStyle = "#3a4858"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11, 8); ctx.lineTo(11, 8); ctx.stroke();
  // Shoulder transition to neck
  ctx.fillStyle = "#a8b8c8";
  ctx.beginPath();
  ctx.moveTo(-12, -6); ctx.lineTo(-6, -14); ctx.lineTo(6, -14); ctx.lineTo(12, -6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1e28"; ctx.lineWidth = 1.6; ctx.stroke();
  // Lid
  ctx.fillStyle = "#3a4858";
  ctx.beginPath();
  ctx.moveTo(-7, -14); ctx.lineTo(7, -14); ctx.lineTo(6, -18); ctx.lineTo(-6, -18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1e28"; ctx.lineWidth = 1.4; ctx.stroke();
  // Handles
  ctx.strokeStyle = "#1a1e28"; ctx.lineWidth = 2.0;
  ctx.beginPath(); ctx.moveTo(-12, -2); ctx.bezierCurveTo(-16, -2, -16, 6, -12, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -2); ctx.bezierCurveTo(16, -2, 16, 6, 12, 6); ctx.stroke();
  // Highlight strip
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-5, -4); ctx.lineTo(-6, 16); ctx.lineTo(-8, 16); ctx.closePath(); ctx.fill();
}

function drawBee(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12, 20);
  // Trail / motion lines
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(-10, 0, 4, 0, Math.PI, true); ctx.stroke();
  ctx.beginPath(); ctx.arc(-14, 4, 3, 0, Math.PI, true); ctx.stroke();
  // Body
  const g = ctx.createRadialGradient(-2, -2, 2, 0, 0, 12);
  g.addColorStop(0, "#fff4a0"); g.addColorStop(1, "#a87810");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.8; ctx.stroke();
  // Stripes
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.ellipse(-3, 0, 2, 7.5, 0.05, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, 0, 2, 7, -0.05, 0, Math.PI*2); ctx.fill();
  // Stinger
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(15, -1); ctx.lineTo(15, 1); ctx.closePath(); ctx.fill();
  // Legs — three small dark legs dangling beneath the body.
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-6, 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-1, 11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(4, 10); ctx.stroke();
  // Wings — two clearly separated translucent wings angled up and back.
  ctx.fillStyle = "rgba(220,240,255,0.78)"; ctx.strokeStyle = "rgba(58,32,8,0.85)"; ctx.lineWidth = 1.1;
  // Rear wing (longer, sweeping back)
  ctx.beginPath(); ctx.ellipse(-5, -9, 8, 4, -0.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Front wing (shorter, more upright) drawn to the right so they don't overlap into mush
  ctx.beginPath(); ctx.ellipse(5, -8, 6, 3.4, -0.05, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Wing veins for a touch of definition
  ctx.strokeStyle = "rgba(120,160,200,0.6)"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-1, -10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1, -8); ctx.lineTo(10, -8); ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-7, -1, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-7.5, -1.5, 0.6, 0, Math.PI*2); ctx.fill();
  // Antennae
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.moveTo(-8, -4); ctx.bezierCurveTo(-12, -8, -10, -10, -8, -10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -2); ctx.bezierCurveTo(-14, -4, -14, -8, -12, -8); ctx.stroke();
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.arc(-8, -10, 1.0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-12, -8, 1.0, 0, Math.PI*2); ctx.fill();
}

function drawWheelbarrow(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  // Wheel
  ctx.fillStyle = "#1a0e04"; ctx.beginPath(); ctx.arc(-12, 14, 6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3a2810"; ctx.beginPath(); ctx.arc(-12, 14, 4.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.arc(-12, 14, 4.5, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = "#a8a8b0"; ctx.beginPath(); ctx.arc(-12, 14, 1.4, 0, Math.PI*2); ctx.fill();
  // Tray
  ctx.fillStyle = "#a82018"; ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, 0); ctx.lineTo(14, -2); ctx.lineTo(20, 8); ctx.lineTo(-8, 12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Inside shading
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.lineTo(14, -2); ctx.lineTo(15, 0); ctx.lineTo(-10, 2);
  ctx.closePath(); ctx.fill();
  // Handles (back)
  ctx.fillStyle = "#7a4818"; ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.fillRect(14, -4, 12, 4); ctx.strokeRect(14, -4, 12, 4);
  // Front leg
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(8, 8, 3, 12);
  // Pile of dirt/grain inside
  ctx.fillStyle = "#5a3814";
  ctx.beginPath(); ctx.ellipse(2, -2, 11, 4, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3a2008";
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(-6 + i*2.5, -3 + (i%2)*1.5, 0.9, 0, Math.PI*2); ctx.fill(); }
}

function drawCat(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Body — sitting
  const g = ctx.createRadialGradient(-2, -4, 3, 0, 4, 18);
  g.addColorStop(0, "#f8c878"); g.addColorStop(0.6, "#a86838"); g.addColorStop(1, "#5a3414");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10, 22); ctx.bezierCurveTo(-14, 0, -10, -8, 0, -8);
  ctx.bezierCurveTo(10, -8, 14, 0, 10, 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Tail curl
  ctx.fillStyle = "#a86838";
  ctx.beginPath();
  ctx.moveTo(10, 16); ctx.bezierCurveTo(20, 18, 22, 8, 16, 4); ctx.bezierCurveTo(20, 12, 14, 14, 12, 18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Feet
  ctx.fillStyle = "#5a3414";
  ctx.beginPath(); ctx.ellipse(-6, 21, 4, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, 21, 4, 2, 0, 0, Math.PI*2); ctx.fill();
  // Stripes
  ctx.fillStyle = "#5a3414";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.ellipse(-8 + i*5, -4 + i*3, 4, 1.2, 0.2, 0, Math.PI*2); ctx.fill();
  }
  // Head
  ctx.fillStyle = "#f8c878";
  ctx.beginPath(); ctx.arc(0, -8, 8, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Ears
  ctx.fillStyle = "#f8c878";
  ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-8, -18); ctx.lineTo(-3, -14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(8, -18); ctx.lineTo(3, -14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-8, -18); ctx.lineTo(-3, -14); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(8, -18); ctx.lineTo(3, -14); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = "#e8a8b8";
  ctx.beginPath(); ctx.moveTo(-6, -13); ctx.lineTo(-7, -16); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -13); ctx.lineTo(7, -16); ctx.lineTo(4, -14); ctx.closePath(); ctx.fill();
  // Eyes
  ctx.fillStyle = "#7eb83a"; ctx.beginPath(); ctx.arc(-3, -8, 1.6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -8, 1.6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.fillRect(-3.5, -9, 1, 2); ctx.fillRect(2.5, -9, 1, 2);
  // Nose & whiskers
  ctx.fillStyle = "#e8a8b8"; ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(1, -4); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-7, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-7, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(7, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(7, -1); ctx.stroke();
}

function drawRifle(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 24);
  ctx.save(); ctx.rotate(-0.2);
  // Scale the gun up ~1.25x so it fills more of the design box.
  ctx.scale(1.22, 1.22);
  // Stock (back wood)
  const stockG = ctx.createLinearGradient(0, -6, 0, 6);
  stockG.addColorStop(0, "#b88444"); stockG.addColorStop(0.5, "#7a4818"); stockG.addColorStop(1, "#3a2008");
  ctx.fillStyle = stockG;
  ctx.beginPath();
  ctx.moveTo(-22, -4); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.lineTo(-22, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Trigger guard / grip
  ctx.fillStyle = "#3a3a40";
  ctx.fillRect(-6, 0, 6, 4);
  ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(0, 4); ctx.lineTo(0, 8); ctx.lineTo(-3, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.0; ctx.stroke();
  // Trigger
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.arc(-2, 6, 1.6, 0, Math.PI*2); ctx.stroke();
  // Barrel
  const barrelG = ctx.createLinearGradient(0, -3, 0, 3);
  barrelG.addColorStop(0, "#7a7a84"); barrelG.addColorStop(0.4, "#d4d4dc"); barrelG.addColorStop(0.55, "#a8a8b0"); barrelG.addColorStop(1, "#1a1a1e");
  ctx.fillStyle = barrelG;
  ctx.fillRect(-4, -3, 26, 4);
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.2;
  ctx.strokeRect(-4, -3, 26, 4);
  // Specular highlight stripe along the top of the barrel for crisp metal
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(-2, -2.4, 22, 0.9);
  // Sights
  ctx.fillStyle = "#1a1a1e";
  ctx.fillRect(0, -5, 1.5, 2);
  ctx.fillRect(20, -5, 1.5, 2);
  // Muzzle
  ctx.fillStyle = "#0a0a0e";
  ctx.beginPath(); ctx.arc(22, -1, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // Spent shell — tucked just below the grip so it reads as part of the kit.
  ctx.save(); ctx.translate(-4, 16); ctx.rotate(-0.2);
  const shellG = ctx.createLinearGradient(0, -2, 0, 2);
  shellG.addColorStop(0, "#f0c860"); shellG.addColorStop(0.5, "#d8a040"); shellG.addColorStop(1, "#8a5a18");
  ctx.fillStyle = shellG;
  ctx.fillRect(-3, -1.6, 7, 3.2);
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 0.7; ctx.strokeRect(-3, -1.6, 7, 3.2);
  // brass rim
  ctx.fillStyle = "#9a6820"; ctx.fillRect(-3, -1.6, 1.6, 3.2);
  ctx.restore();
}

function drawTerrier(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Legs
  ctx.fillStyle = "#a89060";
  ctx.fillRect(-10, 14, 3, 8); ctx.fillRect(-3, 14, 3, 8); ctx.fillRect(5, 14, 3, 8); ctx.fillRect(11, 14, 3, 8);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-10, 14, 3, 8); ctx.strokeRect(-3, 14, 3, 8); ctx.strokeRect(5, 14, 3, 8); ctx.strokeRect(11, 14, 3, 8);
  // Body — small, long
  const g = ctx.createRadialGradient(-2, -2, 3, 0, 4, 16);
  g.addColorStop(0, "#fff8d0"); g.addColorStop(0.6, "#a89060"); g.addColorStop(1, "#5a3814");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 6, 14, 8, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.8; ctx.stroke();
  // Wiry fur
  ctx.strokeStyle = "rgba(58,32,8,0.7)"; ctx.lineWidth = 0.7;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = 2 + Math.cos(a) * 13; const y = 6 + Math.sin(a) * 7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a)*2, y + Math.sin(a)*2); ctx.stroke();
  }
  // Tail (up)
  ctx.fillStyle = "#a89060";
  ctx.beginPath();
  ctx.moveTo(15, 4); ctx.lineTo(20, -4); ctx.lineTo(18, 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Head
  ctx.fillStyle = "#a89060";
  ctx.beginPath(); ctx.ellipse(-12, 0, 6, 6, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-15, 4, 4, 3, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-12, 0, 6, 6, -0.1, 0, Math.PI*2); ctx.stroke();
  // Beard
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath(); ctx.moveTo(-17, 4); ctx.lineTo(-17, 8); ctx.lineTo(-12, 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8; ctx.stroke();
  // Ears (folded)
  ctx.fillStyle = "#7a5418";
  ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-7, -8); ctx.lineTo(-7, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-13, -9); ctx.lineTo(-11, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-12, -1, 1.0, 0, Math.PI*2); ctx.fill();
  // Nose
  ctx.fillStyle = "#1a0e04"; ctx.beginPath(); ctx.arc(-17, 3, 1.2, 0, Math.PI*2); ctx.fill();
}

function drawHound(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  // Legs (long)
  ctx.fillStyle = "#a8784a";
  ctx.fillRect(-10, 12, 3, 10); ctx.fillRect(-3, 12, 3, 10); ctx.fillRect(7, 12, 3, 10); ctx.fillRect(13, 12, 3, 10);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0;
  ctx.strokeRect(-10, 12, 3, 10); ctx.strokeRect(-3, 12, 3, 10); ctx.strokeRect(7, 12, 3, 10); ctx.strokeRect(13, 12, 3, 10);
  // Body — sleek (slightly shorter/tidier than before)
  const g = ctx.createRadialGradient(-2, -2, 3, 1, 4, 15);
  g.addColorStop(0, "#d89878"); g.addColorStop(0.6, "#7a4818"); g.addColorStop(1, "#3a1808");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(3, 4, 14, 9, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 2.0; ctx.stroke();
  // White belly
  ctx.fillStyle = "#f8d8b0";
  ctx.beginPath(); ctx.ellipse(3, 8, 11, 4, 0, 0, Math.PI*2); ctx.fill();
  // Tail (long, low)
  ctx.strokeStyle = "#7a4818"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.bezierCurveTo(22, -4, 24, 8, 22, 14); ctx.stroke();
  ctx.fillStyle = "#fff8d0"; ctx.beginPath(); ctx.arc(22, 14, 1.6, 0, Math.PI*2); ctx.fill();
  // Head
  ctx.fillStyle = "#a8784a";
  ctx.beginPath(); ctx.ellipse(-14, -2, 7, 6, -0.05, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-19, 1, 4, 3, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-14, -2, 7, 6, -0.05, 0, Math.PI*2); ctx.stroke();
  // Long droopy ear
  ctx.fillStyle = "#5a2a08";
  ctx.beginPath();
  ctx.moveTo(-10, -4); ctx.bezierCurveTo(-6, -2, -4, 8, -10, 10); ctx.bezierCurveTo(-12, 8, -12, 0, -10, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Eye
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-14, -3, 1.2, 0, Math.PI*2); ctx.fill();
  // Nose
  ctx.fillStyle = "#1a0e04"; ctx.beginPath(); ctx.arc(-22, 0, 1.4, 0, Math.PI*2); ctx.fill();
  // Collar — a narrow red band on the front of the body, clear of the ear,
  // with a small round tag hanging just below it.
  ctx.strokeStyle = "#c83828"; ctx.lineWidth = 3.0; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-4, -3); ctx.bezierCurveTo(-3, 1, -3, 5, -4, 8); ctx.stroke();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-4, -3); ctx.bezierCurveTo(-3, 1, -3, 5, -4, 8); ctx.stroke();
  // Tag
  ctx.fillStyle = "#f8d040";
  ctx.beginPath(); ctx.arc(-3.5, 8, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#7a5a08"; ctx.lineWidth = 0.7; ctx.stroke();
}

// Phase 3 net-new farm tools (tool-powers overhaul).
function drawHerdersCrook(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Long staff running lower-left to upper-right, stopping below the hook.
  woodHandle(ctx, -7, 22, 6, -8, 4);
  // Shepherd's crook — a single open curl hooking back at the top.
  // Centre of the curl sits just left of the staff top so it reads as a cane hook.
  ctx.save(); ctx.translate(6, -8);
  // dark contour underlay
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 6.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(-5, -8, 7, Math.PI*0.5, -Math.PI*0.65, true);
  ctx.stroke();
  // wood body
  ctx.strokeStyle = "#8a5520"; ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.arc(-5, -8, 7, Math.PI*0.5, -Math.PI*0.65, true);
  ctx.stroke();
  // upper-left highlight along the curl
  ctx.strokeStyle = "rgba(255,235,200,0.5)"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-5, -8, 7.4, Math.PI*0.15, -Math.PI*0.55, true);
  ctx.stroke();
  ctx.restore();
  // Leather wrap at the grip
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-3, 6, 6, 5);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.9;
  ctx.strokeRect(-3, 6, 6, 5);
}

function drawSaddle(ctx: CanvasRenderingContext2D) {
  // Side-profile English saddle: a raised pommel at the front (left) curving
  // up, a dipped seat, a tall swept-back cantle (right), a skirt/flap hanging
  // below, and a stirrup on a leather. The pommel-dip-cantle profile is what
  // makes the silhouette read as tack rather than a bean.
  shadow(ctx, 22, 24);
  const leather = ctx.createLinearGradient(0, -14, 0, 16);
  leather.addColorStop(0, "#c8702c");
  leather.addColorStop(0.5, "#8a3e14");
  leather.addColorStop(1, "#3a1808");

  // Skirt / flap hanging down behind the seat.
  ctx.fillStyle = "#6a3010";
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.bezierCurveTo(-10, 14, -8, 22, 0, 22);
  ctx.bezierCurveTo(8, 22, 9, 12, 6, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();

  // Main saddle body — profile with high pommel (left), dipped seat, high cantle (right).
  ctx.fillStyle = leather;
  ctx.beginPath();
  ctx.moveTo(-20, 2);          // front skirt base (under pommel)
  ctx.bezierCurveTo(-24, -6, -22, -14, -16, -14); // pommel rises at the front
  ctx.bezierCurveTo(-12, -14, -10, -8, -6, -6);    // dip down into the seat
  ctx.bezierCurveTo(0, -3, 6, -4, 10, -8);          // seat low, sweeping up to...
  ctx.bezierCurveTo(16, -14, 22, -16, 22, -8);      // tall cantle at the back
  ctx.bezierCurveTo(22, -2, 18, 2, 14, 4);          // back skirt
  ctx.bezierCurveTo(4, 8, -10, 8, -20, 2);          // underside back to front
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();

  // Seat highlight — sheen sitting in the dip of the seat.
  ctx.fillStyle = "rgba(255,235,200,0.30)";
  ctx.beginPath();
  ctx.ellipse(0, -6, 9, 2.4, -0.05, 0, Math.PI*2);
  ctx.fill();

  // Pommel sheen — narrow vertical highlight so it reads as curved leather,
  // not a floating dot.
  ctx.fillStyle = "rgba(255,235,200,0.28)";
  ctx.beginPath(); ctx.ellipse(-18, -9, 1.6, 3.4, 0.1, 0, Math.PI*2); ctx.fill();

  // Stitched seam following the seat edge.
  ctx.strokeStyle = "rgba(245,235,210,0.7)"; ctx.lineWidth = 0.8;
  ctx.setLineDash([1.6, 1.6]);
  ctx.beginPath();
  ctx.moveTo(-14, -3); ctx.bezierCurveTo(-6, 1, 6, 1, 16, -2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Girth/stirrup leather hanging from under the seat with a metal stirrup.
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(2, 6); ctx.lineTo(3, 18);
  ctx.stroke();
  // Stirrup iron — a D-loop with a flat tread.
  ctx.strokeStyle = "#c8c8d0"; ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(3, 20, 4, Math.PI*1.15, Math.PI*1.85, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.8, 22.5); ctx.lineTo(6.8, 22.5);  // tread
  ctx.stroke();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 0.6;
  ctx.stroke();
}

export const ICONS = {
  rake:          { label:"Rake",          color:"#7a4818", draw:drawRake },
  axe:           { label:"Axe",           color:"#a8a8b0", draw:drawAxe },
  sapling:       { label:"Sapling",       color:"#7eb83a", draw:drawSapling },
  trimmer:       { label:"Trimmer",       color:"#a82018", draw:drawTrimmer },
  scythe:        { label:"Scythe",        color:"#a8a8b0", draw:drawScythe },
  sickle:        { label:"Sickle",        color:"#c8a030", draw:drawSickle },
  fertilizer:    { label:"Fertilizer",    color:"#d8c890", draw:drawFertilizer },
  plough:        { label:"Plough",        color:"#7a4818", draw:drawPlough },
  bird_cage:     { label:"Bird Cage",     color:"#a82018", draw:drawBirdCage },
  bird_feed:     { label:"Bird Feed",     color:"#d8c898", draw:drawBirdFeed },
  hoe:           { label:"Hoe",           color:"#a8a8b0", draw:drawHoe },
  fruit_picker:  { label:"Fruit Picker",  color:"#d8d8e0", draw:drawFruitPicker },
  milk_churn:    { label:"Milk Churn",    color:"#c8d8e8", draw:drawMilkChurn },
  bee:           { label:"Bee",           color:"#f8d040", draw:drawBee },
  wheelbarrow:   { label:"Wheelbarrow",   color:"#a82018", draw:drawWheelbarrow },
  cat:           { label:"Cat",           color:"#a86838", draw:drawCat },
  rifle:         { label:"Rifle",         color:"#7a4818", draw:drawRifle },
  terrier:       { label:"Terrier",       color:"#a89060", draw:drawTerrier },
  hound:         { label:"Hound",         color:"#7a4818", draw:drawHound },
  herders_crook: { label:"Herder's Crook", color:"#7a4818", draw:drawHerdersCrook },
  saddle:        { label:"Saddle",        color:"#a85420", draw:drawSaddle },
};
