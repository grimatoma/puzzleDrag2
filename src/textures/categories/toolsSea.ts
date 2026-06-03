// Wave 10 — Sea Tools.

function shadow(ctx: CanvasRenderingContext2D, w: number, y?: number) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, y || 22, w, 4, 0, 0, Math.PI*2); ctx.fill();
}

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
  ctx.restore();
}

function drawFishingRod(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Rod
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-14, 18); ctx.bezierCurveTo(-8, 0, 6, -10, 18, -20);
  ctx.stroke();
  ctx.strokeStyle = "#a87838"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, 18); ctx.bezierCurveTo(-8, 0, 6, -10, 18, -20);
  ctx.stroke();
  // Reel
  ctx.fillStyle = "#a8a8b0";
  ctx.beginPath(); ctx.arc(-10, 12, 4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#1a1a1e";
  ctx.beginPath(); ctx.arc(-10, 12, 1.4, 0, Math.PI*2); ctx.fill();
  // Line
  ctx.strokeStyle = "rgba(245,235,210,0.9)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(18, -20); ctx.lineTo(20, -4); ctx.stroke();
  // Hook
  ctx.strokeStyle = "#5a5a62"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(20, -2, 3, Math.PI*0.3, Math.PI*1.7, true); ctx.stroke();
  // Bait
  ctx.fillStyle = "#e83a08";
  ctx.beginPath(); ctx.arc(20, -4, 1.8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.arc(19.4, -4.6, 0.6, 0, Math.PI*2); ctx.fill();
}

function drawNet(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Handle
  woodHandle(ctx, 14, 20, -8, -6, 4);
  // Hoop
  ctx.strokeStyle = "#5a5a62"; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.ellipse(-12, -10, 11, 9, 0.2, 0, Math.PI*2); ctx.stroke();
  // Net mesh (clipped)
  ctx.save();
  ctx.beginPath(); ctx.ellipse(-12, -10, 10.5, 8.5, 0.2, 0, Math.PI*2); ctx.clip();
  ctx.fillStyle = "rgba(245,235,210,0.45)";
  ctx.fillRect(-24, -22, 24, 24);
  ctx.strokeStyle = "rgba(58,36,16,0.7)"; ctx.lineWidth = 0.8;
  for (let i = -22; i <= 0; i += 2.5) {
    ctx.beginPath(); ctx.moveTo(i, -22); ctx.lineTo(i + 6, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 6); ctx.lineTo(i + 6, -22); ctx.stroke();
  }
  ctx.restore();
  // Caught fish
  ctx.fillStyle = "#3aa0d0";
  ctx.beginPath(); ctx.ellipse(-12, -8, 5, 3, 0.1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(-3, -10); ctx.lineTo(-3, -6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a4060"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.ellipse(-12, -8, 5, 3, 0.1, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = "#1a1a1e"; ctx.beginPath(); ctx.arc(-15, -8.5, 0.6, 0, Math.PI*2); ctx.fill();
}

function drawHarpoon(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Shaft (top-left head to bottom-right butt)
  const hx = -15, hy = -17, bx = 17, by = 21;
  woodHandle(ctx, bx, by, hx, hy, 3.6);
  const ang = Math.atan2(by - hy, bx - hx); // shaft direction
  const ux = Math.cos(ang), uy = Math.sin(ang);   // along shaft
  const px = -uy, py = ux;                         // perpendicular to shaft
  // Rope whipping near the head: short bands wrapped across the shaft
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 5; i++) {
    const d = 7 + i * 3.4; // distance from head along shaft
    const cx = hx + ux * d, cy = hy + uy * d;
    ctx.strokeStyle = i % 2 === 0 ? "#c89030" : "#8a5a18";
    ctx.beginPath();
    ctx.moveTo(cx - px * 2.7, cy - py * 2.7);
    ctx.lineTo(cx + px * 2.7, cy + py * 2.7);
    ctx.stroke();
  }
  // Spearhead
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang + Math.PI);
  const g = ctx.createLinearGradient(-3, 0, 3, 0);
  g.addColorStop(0, "#3a3a40"); g.addColorStop(0.5, "#c2c2cc"); g.addColorStop(1, "#1a1a1e");
  // Barbs first (so the central blade overlaps their roots) — bold downswept
  // hooks in bright steel so the "barbed harpoon" silhouette reads at 56px.
  ctx.fillStyle = "#9a9aa4"; ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2.6, -12); ctx.lineTo(-10.5, -3.5); ctx.lineTo(-8.5, -3); ctx.lineTo(-3, -7.5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2.6, -12); ctx.lineTo(10.5, -3.5); ctx.lineTo(8.5, -3); ctx.lineTo(3, -7.5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Central blade
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 1); ctx.lineTo(-5, -12); ctx.lineTo(0, -18); ctx.lineTo(5, -12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.6; ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.moveTo(-1.2, -3); ctx.lineTo(0, -15); ctx.lineTo(1.2, -3); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawAnchor(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  const g = ctx.createLinearGradient(0, -16, 0, 18);
  g.addColorStop(0, "#7a8088"); g.addColorStop(0.5, "#3a3a40"); g.addColorStop(1, "#0a0a0e");
  ctx.fillStyle = g; ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.8;
  // Ring
  ctx.beginPath(); ctx.arc(0, -14, 3.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Shaft
  ctx.fillRect(-1.6, -10, 3.2, 22);
  ctx.strokeRect(-1.6, -10, 3.2, 22);
  // Crossbar
  ctx.fillRect(-8, -6, 16, 2.6);
  ctx.strokeRect(-8, -6, 16, 2.6);
  // Curved arms
  ctx.beginPath();
  ctx.moveTo(-1.6, 12); ctx.bezierCurveTo(-12, 12, -14, 4, -12, -2);
  ctx.lineTo(-9, -2); ctx.bezierCurveTo(-10, 6, -4, 10, 0, 10);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1.6, 12); ctx.bezierCurveTo(12, 12, 14, 4, 12, -2);
  ctx.lineTo(9, -2); ctx.bezierCurveTo(10, 6, 4, 10, 0, 10);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Fluke tips
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-15, -6); ctx.lineTo(-9, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(15, -6); ctx.lineTo(9, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 1.0; ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(-1.4, -9, 0.8, 18);
}

function drawCompass(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Outer brass case
  const g = ctx.createRadialGradient(-4, -6, 4, 0, 0, 22);
  g.addColorStop(0, "#fff4a0"); g.addColorStop(0.5, "#a87010"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Inner face
  ctx.fillStyle = "#f5ebd2";
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2; ctx.stroke();
  // Cardinal ticks
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r1 = i % 2 === 0 ? 11 : 13;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
    ctx.stroke();
  }
  // N letter
  ctx.fillStyle = "#3a2008"; ctx.font = "bold 7px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("N", 0, -12);
  // Needle red side
  ctx.fillStyle = "#c82018";
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(2.5, 0); ctx.lineTo(-2.5, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.8; ctx.stroke();
  // Needle white side
  ctx.fillStyle = "#f5ebd2";
  ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(2.5, 0); ctx.lineTo(-2.5, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.8; ctx.stroke();
  // Center hub
  ctx.fillStyle = "#a87010";
  ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.6; ctx.stroke();
  // Top loop
  ctx.fillStyle = "#a87010";
  ctx.fillRect(-3, -22, 6, 4);
  ctx.beginPath(); ctx.arc(0, -22, 2, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  // Glass shine
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath(); ctx.arc(-6, -6, 6, 0, Math.PI*2); ctx.fill();
}

function drawSpyglass(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  ctx.save(); ctx.rotate(-0.4);
  // Three brass tubes, telescoping
  const sections: [number, number, string][] = [[-16, 6, "#5a3408"], [-6, 8, "#a87010"], [6, 10, "#f8c040"]];
  sections.forEach(([x, w, col]) => {
    const g = ctx.createLinearGradient(0, -w/2, 0, w/2);
    g.addColorStop(0, "#fff4a0"); g.addColorStop(0.5, col); g.addColorStop(1, "#3a2008");
    ctx.fillStyle = g;
    ctx.fillRect(x, -w/2, 12, w);
    ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.strokeRect(x, -w/2, 12, w);
    // Ring detail at end
    ctx.fillStyle = "#3a2008";
    ctx.fillRect(x + 11, -w/2 - 1, 2, w + 2);
    ctx.fillStyle = col;
    ctx.fillRect(x, -w/2, 1.2, w);
  });
  // Eyepiece end ring
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-18, -4, 2, 8);
  // Lens at far end (glass shine)
  ctx.fillStyle = "#80c0e8";
  ctx.beginPath(); ctx.ellipse(18, 0, 1.6, 4, 0, 0, Math.PI*2); ctx.fill();
  // Highlight along tubes
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(-14, -3.5, 30, 1);
  ctx.restore();
}

function drawRopeKnot(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 15);
  const ROPE = 6.2;
  // A rope strand drawn as: dark outline, body fill, then a light core highlight
  // for cylindrical rope volume, with sparse diagonal twist ticks.
  const strand = (path: () => void) => {
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2a1808"; ctx.lineWidth = ROPE + 2.4; ctx.beginPath(); path(); ctx.stroke();
    ctx.strokeStyle = "#b88a44"; ctx.lineWidth = ROPE;       ctx.beginPath(); path(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,238,200,0.45)"; ctx.lineWidth = ROPE * 0.32; ctx.beginPath(); path(); ctx.stroke();
  };
  // Two interlocked bights forming a balanced overhand/reef knot.
  // Left bight (its lower-left crossing sits under the right bight).
  const leftBight = () => { ctx.moveTo(-3, -13); ctx.bezierCurveTo(-17, -10, -17, 10, -3, 13); };
  // Right bight, mirrored.
  const rightBight = () => { ctx.moveTo(3, 13); ctx.bezierCurveTo(17, 10, 17, -10, 3, -13); };
  // Short balanced tails dropping from the bottom of each bight.
  const leftTail = () => { ctx.moveTo(-3, 13); ctx.bezierCurveTo(-5, 18, -7, 19, -8, 21); };
  const rightTail = () => { ctx.moveTo(3, 13); ctx.bezierCurveTo(5, 18, 7, 19, 8, 21); };

  // Draw order produces an over/under weave: left bight, then right over it,
  // then the short central cross that ties them.
  strand(leftBight);
  strand(leftTail);
  strand(rightBight);
  strand(rightTail);
  // Central nip where the two bights cross, drawn last so it reads as the knot.
  strand(() => { ctx.moveTo(-4, 3); ctx.bezierCurveTo(0, 0, 0, 0, 4, -3); });

  // Sparse twist ticks for rope texture (kept light so they don't muddy at 56px).
  ctx.strokeStyle = "rgba(42,24,8,0.5)"; ctx.lineWidth = 0.9;
  const ticksAlong = (path: (t: number) => [number, number]) => {
    for (let i = 0; i <= 6; i++) {
      const [x, y] = path(i / 6);
      ctx.beginPath(); ctx.moveTo(x - 1.6, y - 1.6); ctx.lineTo(x + 1.6, y + 1.6); ctx.stroke();
    }
  };
  // ticks along the left and right outer arcs
  const bez = (p0:[number,number],p1:[number,number],p2:[number,number],p3:[number,number]) =>
    (t:number):[number,number] => {
      const u = 1 - t;
      return [
        u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
        u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
      ];
    };
  ticksAlong(bez([-3,-13],[-17,-10],[-17,10],[-3,13]));
  ticksAlong(bez([3,13],[17,10],[17,-10],[3,-13]));
}

function drawCrabPot(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Cage cylinder
  const g = ctx.createLinearGradient(0, -10, 0, 14);
  g.addColorStop(0, "#7a4818"); g.addColorStop(0.5, "#5a3414"); g.addColorStop(1, "#2a1408");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, -10); ctx.lineTo(16, -10);
  ctx.lineTo(14, 14); ctx.lineTo(-14, 14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Wire mesh
  ctx.strokeStyle = "rgba(168,168,176,0.95)"; ctx.lineWidth = 0.9;
  for (let i = -14; i <= 14; i += 3) {
    ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i * 14/16, 14); ctx.stroke();
  }
  for (let j = -8; j <= 12; j += 4) {
    ctx.beginPath(); ctx.moveTo(-15, j); ctx.lineTo(15, j); ctx.stroke();
  }
  // Top rim and bottom rim
  ctx.strokeStyle = "#5a3814"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(0, -10, 16, 4, 0, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 14, 14, 3.5, 0, 0, Math.PI*2); ctx.stroke();
  // Crab inside
  ctx.fillStyle = "#c83820";
  ctx.beginPath(); ctx.ellipse(0, 6, 6, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 0.8; ctx.stroke();
  // Claws
  ctx.fillStyle = "#c83820";
  ctx.beginPath(); ctx.arc(-7, 4, 2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(7, 4, 2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Eyes
  ctx.fillStyle = "#fffce0"; ctx.beginPath(); ctx.arc(-2, 5, 0.8, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, 5, 0.8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0a0e"; ctx.beginPath(); ctx.arc(-2, 5, 0.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, 5, 0.4, 0, Math.PI*2); ctx.fill();
  // Hanging rope
  ctx.strokeStyle = "#a87010"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -22); ctx.stroke();
}

function drawOar(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Shaft
  woodHandle(ctx, 16, -18, -10, 14, 3.5);
  // Blade
  ctx.save(); ctx.translate(-12, 16);
  const g = ctx.createLinearGradient(-6, 0, 6, 0);
  g.addColorStop(0, "#7a4818"); g.addColorStop(0.5, "#a87838"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-6, -4); ctx.bezierCurveTo(-10, 0, -10, 8, -2, 12);
  ctx.bezierCurveTo(6, 8, 6, 0, 2, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Wood grain
  ctx.strokeStyle = "rgba(58,32,8,0.5)"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-4, -2); ctx.bezierCurveTo(-2, 4, 0, 8, -2, 11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.bezierCurveTo(2, 4, 4, 8, 1, 11); ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath(); ctx.ellipse(-3, 2, 1.5, 5, -0.3, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // Grip wrap at handle end
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const t = i * 1.5;
    ctx.moveTo(15 - t, -17 + t); ctx.lineTo(13 - t, -15 + t); ctx.stroke();
  }
}

function drawLifebuoy(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Outer ring base (white)
  ctx.fillStyle = "#f5ebd2";
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Red quadrants
  ctx.fillStyle = "#c82018";
  for (let i = 0; i < 4; i++) {
    const a0 = (i / 4) * Math.PI * 2 - Math.PI/8;
    const a1 = a0 + Math.PI/4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 18, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.stroke();
  // Inner hole
  ctx.fillStyle = "#a87010";
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Inner shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
  // Rope wraps
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI/4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
    ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
    ctx.stroke();
  }
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-7, -8, 4, 2, -0.4, 0, Math.PI*2); ctx.fill();
}

function drawDivingHelmet(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Brass helmet body
  const g = ctx.createRadialGradient(-5, -6, 3, 0, 0, 22);
  g.addColorStop(0, "#fff4a0"); g.addColorStop(0.4, "#d8a020"); g.addColorStop(1, "#5a3408");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, 4); ctx.bezierCurveTo(-16, -16, 16, -16, 16, 4);
  ctx.lineTo(14, 14); ctx.lineTo(-14, 14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Glass porthole
  ctx.fillStyle = "#1a1a1e";
  ctx.beginPath(); ctx.ellipse(0, -2, 9, 7, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a3408"; ctx.lineWidth = 1.4; ctx.stroke();
  // Glass shine
  const glassG = ctx.createRadialGradient(-3, -5, 1, 0, -2, 8);
  glassG.addColorStop(0, "#80c0e8"); glassG.addColorStop(0.7, "#3a6080"); glassG.addColorStop(1, "#0a1830");
  ctx.fillStyle = glassG;
  ctx.beginPath(); ctx.ellipse(0, -2, 8, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.ellipse(-3, -4, 2, 1.4, -0.3, 0, Math.PI*2); ctx.fill();
  // Bolts around porthole
  ctx.fillStyle = "#7a4818";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * 11, -2 + Math.sin(a) * 8.5, 0.9, 0, Math.PI*2); ctx.fill();
  }
  // Air valve top
  ctx.fillStyle = "#a87010";
  ctx.fillRect(-3, -18, 6, 3);
  ctx.beginPath(); ctx.arc(0, -18, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  // Bottom bolts
  ctx.fillStyle = "#7a4818";
  [-10, -4, 4, 10].forEach(x => { ctx.beginPath(); ctx.arc(x, 12, 1, 0, Math.PI*2); ctx.fill(); });
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.ellipse(-10, -8, 3, 6, -0.3, 0, Math.PI*2); ctx.fill();
}

function drawLobsterTrap(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  // Wooden slat box with curved top
  const g = ctx.createLinearGradient(0, -10, 0, 14);
  g.addColorStop(0, "#a87838"); g.addColorStop(0.5, "#7a4818"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-18, 14);
  ctx.lineTo(-18, -2);
  ctx.bezierCurveTo(-18, -14, 18, -14, 18, -2);
  ctx.lineTo(18, 14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Wooden slats
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2;
  for (let i = -14; i <= 14; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, -12 + Math.abs(i)*0.3); ctx.lineTo(i, 14);
    ctx.stroke();
  }
  // Funnel entrance (dark hole)
  ctx.fillStyle = "#0a0a0e";
  ctx.beginPath(); ctx.ellipse(0, 4, 5, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a3408"; ctx.lineWidth = 1.2; ctx.stroke();
  // Lobster claw poking out
  ctx.fillStyle = "#c82818";
  ctx.beginPath();
  ctx.moveTo(-2, 4); ctx.bezierCurveTo(-8, 2, -10, -2, -8, -4);
  ctx.bezierCurveTo(-6, -2, -4, 0, -2, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 0.8; ctx.stroke();
  // Bait inside (visible thru slats — small dark dots)
  ctx.fillStyle = "rgba(168,112,16,0.7)";
  ctx.beginPath(); ctx.arc(6, 8, 2, 0, Math.PI*2); ctx.fill();
  // Rope hanging
  ctx.strokeStyle = "#a87010"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(8, -12); ctx.bezierCurveTo(10, -16, 14, -16, 14, -22); ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(-16, -10, 30, 1.5);
}

function drawTridentSpear(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Shaft
  woodHandle(ctx, 0, 22, 0, -10, 4);
  // Three prongs
  ctx.save(); ctx.translate(0, -10);
  // Steel gradient that stays legible at the tips (no near-white wash-out).
  const g = ctx.createLinearGradient(-8, 0, 8, 0);
  g.addColorStop(0, "#3a3a44"); g.addColorStop(0.5, "#c2c2cc"); g.addColorStop(1, "#42424c");
  ctx.fillStyle = g; ctx.strokeStyle = "#15151a"; ctx.lineWidth = 1.6;
  // Center prong
  ctx.beginPath();
  ctx.moveTo(-2.4, 0); ctx.lineTo(-2, -16); ctx.lineTo(0, -20); ctx.lineTo(2, -16); ctx.lineTo(2.4, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Left prong (curved, thicker)
  ctx.beginPath();
  ctx.moveTo(-3.5, 0); ctx.bezierCurveTo(-11, -6, -11, -13, -9, -17); ctx.lineTo(-6, -16.5); ctx.bezierCurveTo(-7.5, -10, -5.5, -4, -2.2, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Right prong (curved, thicker)
  ctx.beginPath();
  ctx.moveTo(3.5, 0); ctx.bezierCurveTo(11, -6, 11, -13, 9, -17); ctx.lineTo(6, -16.5); ctx.bezierCurveTo(7.5, -10, 5.5, -4, 2.2, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Crossbar base
  ctx.fillStyle = "#5a5a62";
  ctx.fillRect(-6, 0, 12, 3);
  ctx.strokeRect(-6, 0, 12, 3);
  ctx.restore();
  // Highlight on shaft
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(-1, -8, 0.8, 28);
}

export const ICONS = {
  fishing_rod:    { label:"Fishing Rod",    color:"#a87838", draw:drawFishingRod },
  net:            { label:"Net",            color:"#5a5a62", draw:drawNet },
  harpoon:        { label:"Harpoon",        color:"#a8a8b0", draw:drawHarpoon },
  anchor:         { label:"Anchor",         color:"#3a3a40", draw:drawAnchor },
  compass:        { label:"Compass",        color:"#a87010", draw:drawCompass },
  spyglass:       { label:"Spyglass",       color:"#a87010", draw:drawSpyglass },
  rope_knot:      { label:"Rope Knot",      color:"#a87838", draw:drawRopeKnot },
  crab_pot:       { label:"Crab Pot",       color:"#7a4818", draw:drawCrabPot },
  oar:            { label:"Oar",            color:"#a87838", draw:drawOar },
  lifebuoy:       { label:"Lifebuoy",       color:"#c82018", draw:drawLifebuoy },
  diving_helmet:  { label:"Diving Helmet",  color:"#d8a020", draw:drawDivingHelmet },
  lobster_trap:   { label:"Lobster Trap",   color:"#7a4818", draw:drawLobsterTrap },
  trident:        { label:"Trident",        color:"#a8a8b0", draw:drawTridentSpear },
};
