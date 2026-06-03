// Cattle.

function shadow(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 22, w, 4.5, 0, 0, Math.PI*2); ctx.fill();
}

function cowBase(ctx: CanvasRenderingContext2D, bodyC1: string, bodyC2: string, outline: string, hasHorns: boolean, hornC?: string) {
  // Legs
  ctx.fillStyle = bodyC2;
  ctx.fillRect(-9, 13, 4, 9); ctx.fillRect(-3, 13, 4, 9); ctx.fillRect(7, 13, 4, 9); ctx.fillRect(13, 13, 4, 9);
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
  ctx.strokeRect(-9, 13, 4, 9); ctx.strokeRect(-3, 13, 4, 9); ctx.strokeRect(7, 13, 4, 9); ctx.strokeRect(13, 13, 4, 9);
  // Hooves
  ctx.fillStyle = outline;
  ctx.fillRect(-9, 21, 4, 1.5); ctx.fillRect(-3, 21, 4, 1.5); ctx.fillRect(7, 21, 4, 1.5); ctx.fillRect(13, 21, 4, 1.5);
  // Body
  const g = ctx.createRadialGradient(-2, -2, 4, 0, 4, 18);
  g.addColorStop(0, bodyC1); g.addColorStop(1, bodyC2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, 4, 17, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0; ctx.stroke();
  // Tail
  ctx.strokeStyle = outline; ctx.lineWidth = 2.0;
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.bezierCurveTo(22, -2, 22, 6, 20, 8); ctx.stroke();
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.ellipse(20, 8, 2, 3, 0.3, 0, Math.PI*2); ctx.fill();
  // Head
  ctx.fillStyle = bodyC1;
  ctx.beginPath(); ctx.ellipse(-14, -2, 7, 7, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.8; ctx.stroke();
  // Snout
  ctx.fillStyle = "#f0c8b0";
  ctx.beginPath(); ctx.ellipse(-19, 0, 4, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.ellipse(-21, -1, 0.8, 1.4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-19, -1, 0.8, 1.4, 0, 0, Math.PI*2); ctx.fill();
  // Ear
  ctx.fillStyle = bodyC2;
  ctx.beginPath(); ctx.ellipse(-10, -8, 3, 2.4, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  if (hasHorns && hornC) {
    ctx.strokeStyle = hornC; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-13, -8); ctx.bezierCurveTo(-18, -10, -22, -8, -22, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, -8); ctx.bezierCurveTo(-4, -10, 0, -8, 0, -4); ctx.stroke();
  }
  // Eye
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(-14, -3, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-14, -3, 0.8, 0, Math.PI*2); ctx.fill();
}

function drawCow(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 24);
  cowBase(ctx, "#fffce8", "#d8d0c0", "#1a0e04", false);
  // Black spots
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath(); ctx.ellipse(-2, 2, 5, 4, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, -2, 4, 3, -0.3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, 8, 3, 2.5, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-6, 8, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  // Pink udder
  ctx.fillStyle = "#f0a0a8";
  ctx.beginPath(); ctx.ellipse(0, 14, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
}

function drawLonghorn(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 24);
  cowBase(ctx, "#d89048", "#7a4818", "#1a0e04", false);
  // White face blaze — a soft tapered patch down the snout, not a hard rectangle
  ctx.fillStyle = "#fffce8";
  ctx.beginPath();
  ctx.moveTo(-14, -7);
  ctx.bezierCurveTo(-17, -5, -18, 1, -17, 3);
  ctx.bezierCurveTo(-15, 4, -13, 2, -13, -2);
  ctx.closePath();
  ctx.fill();
  // Wide symmetric longhorn horns drawn as one continuous tapered sweep from
  // a central poll, curving up at each tip. One contour stroke unifies them so
  // they read as the dominant feature without scattered parts. Kept inside ±26.
  const px = -10; // poll x (crown of head)
  const horn = (dir: number, span: number) => {
    ctx.fillStyle = "#d8b878";
    ctx.beginPath();
    ctx.moveTo(px, -8);
    ctx.bezierCurveTo(px + dir * span * 0.4, -11, px + dir * span * 0.8, -12, px + dir * span, -7);
    ctx.bezierCurveTo(px + dir * (span + 1), -10, px + dir * (span - 1), -10, px + dir * (span - 3), -9);
    ctx.bezierCurveTo(px + dir * span * 0.55, -9, px + dir * span * 0.28, -7, px + dir * 2, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4; ctx.stroke();
    // Polished tip cap
    ctx.fillStyle = "#fff8d0";
    ctx.beginPath();
    ctx.moveTo(px + dir * span, -7);
    ctx.lineTo(px + dir * (span - 1), -10);
    ctx.lineTo(px + dir * (span - 3), -9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8; ctx.stroke();
  };
  horn(-1, 15); // left tip ≈ -25
  horn(1, 15);  // right tip ≈ +5
  // Central poll boss where both horns meet
  ctx.fillStyle = "#b88848";
  ctx.beginPath(); ctx.ellipse(px, -8, 3, 2.4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2; ctx.stroke();
}

function drawTriceratops(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 24);
  // Legs (chunky)
  ctx.fillStyle = "#3a5a18";
  ctx.fillRect(-9, 13, 5, 9); ctx.fillRect(-2, 13, 5, 9); ctx.fillRect(8, 13, 5, 9); ctx.fillRect(15, 13, 5, 9);
  ctx.strokeStyle = "#1a2a08"; ctx.lineWidth = 1.4;
  ctx.strokeRect(-9, 13, 5, 9); ctx.strokeRect(-2, 13, 5, 9); ctx.strokeRect(8, 13, 5, 9); ctx.strokeRect(15, 13, 5, 9);
  // Body
  const g = ctx.createRadialGradient(-2, -2, 4, 0, 4, 18);
  g.addColorStop(0, "#7eb83a"); g.addColorStop(0.6, "#3a5a18"); g.addColorStop(1, "#1a2a08");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(4, 4, 17, 12, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 2.0; ctx.stroke();
  // Tail
  ctx.fillStyle = "#3a5a18";
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(26, -2); ctx.lineTo(26, 6); ctx.lineTo(18, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Frill — a broad scalloped plate behind the head, drawn first so the head
  // overlaps and anchors it. Scalloped outer edge replaces the old scattered
  // spikes so there are no floating parts.
  ctx.fillStyle = "#5a8a28";
  ctx.beginPath();
  ctx.moveTo(-6, -3);
  // up the back of the frill with three rounded scallops along the rim
  ctx.bezierCurveTo(-6, -13, -1, -16, 2, -14);
  ctx.bezierCurveTo(3, -16, 7, -16, 8, -12);
  ctx.bezierCurveTo(11, -13, 14, -11, 13, -7);
  ctx.bezierCurveTo(15, -6, 15, -1, 11, 1);
  ctx.bezierCurveTo(6, 3, -2, 3, -6, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Frill bony bosses — small studs sitting ON the frill plate (connected, not floating)
  ctx.fillStyle = "#3a5a18"; ctx.strokeStyle = "#1a2a08"; ctx.lineWidth = 0.9;
  for (const [bx, by] of [[1, -11], [8, -10], [12, -5]] as const) {
    ctx.beginPath(); ctx.arc(bx, by, 1.7, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  }
  // Head
  ctx.fillStyle = "#3a5a18";
  ctx.beginPath(); ctx.ellipse(-13, 1, 9, 7, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Beak/snout
  ctx.fillStyle = "#2a4012";
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.bezierCurveTo(-24, 1, -24, 5, -20, 6); ctx.bezierCurveTo(-18, 5, -18, 1, -20, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a1a04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Three horns — large pale ivory: one nose horn, two big brow horns
  ctx.fillStyle = "#fff8d0"; ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2;
  const horn = (pts: readonly [number, number][]) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  horn([[-19, 2], [-24, 4], [-19, 5]]);       // nose horn
  horn([[-16, -5], [-19, -13], [-13, -7]]);    // left brow horn
  horn([[-11, -5], [-9, -13], [-8, -6]]);      // right brow horn
  // Eye
  ctx.fillStyle = "#fff8c0"; ctx.beginPath(); ctx.arc(-14, 0, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a0e04"; ctx.beginPath(); ctx.arc(-14, 0, 0.8, 0, Math.PI*2); ctx.fill();
  // Specular highlight on body
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath(); ctx.ellipse(-2, -3, 6, 3, -0.3, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  tile_cattle_cow:         { label:"Cow",         color:"#fffce8", draw:drawCow },
  tile_cattle_longhorn:    { label:"Longhorn",    color:"#d89048", draw:drawLonghorn },
  tile_cattle_triceratops: { label:"Triceratops", color:"#5a8a28", draw:drawTriceratops },
};
