// Player-tools (HUD/Tools panel): Scythe, Seedpack, Lockbox, Reshuffle Horn.

function drawShadow(ctx: CanvasRenderingContext2D, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayerScythe(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Wooden snath (handle)
  ctx.save();
  ctx.rotate(0.2);
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.rect(-2.5, -22, 5, 44);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wood grain
  ctx.strokeStyle = "rgba(58,28,8,0.6)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -20); ctx.lineTo(0, 20);
  ctx.stroke();
  // Grip wraps
  ctx.fillStyle = "#5a3014";
  ctx.fillRect(-3, 8, 6, 4);
  ctx.fillRect(-3, 16, 6, 4);
  ctx.restore();
  // Curved blade (scythe-shaped)
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 2.2;
  ctx.fillStyle = "#c8c8d0";
  ctx.beginPath();
  ctx.moveTo(-4, -20);
  ctx.bezierCurveTo(-22, -18, -28, -2, -22, 8);
  ctx.bezierCurveTo(-22, 0, -16, -10, -2, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Blade highlight
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.bezierCurveTo(-18, -14, -22, -2, -18, 6);
  ctx.stroke();
  // Edge gleam
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(-22, 4, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawSeedpack(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 15, 4);
  // Flat paper seed PACKET: a tall rectangular paper envelope, slightly
  // wider at the top, with a folded crimped top edge. Warm kraft-paper tone.
  const paper = ctx.createLinearGradient(-13, 0, 13, 0);
  paper.addColorStop(0, "#d8bd80");
  paper.addColorStop(0.45, "#ecd9a0");
  paper.addColorStop(1, "#c2a058");
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.moveTo(-13, -16);
  ctx.lineTo(13, -16);
  ctx.lineTo(12, 22);
  ctx.lineTo(-12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Folded/crimped top flap of the envelope
  ctx.fillStyle = "#b98a42";
  ctx.beginPath();
  ctx.moveTo(-13, -16);
  ctx.lineTo(13, -16);
  ctx.lineTo(13, -10);
  ctx.lineTo(-13, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Zig-zag crimp line along the fold
  ctx.strokeStyle = "rgba(58,28,8,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -12; x <= 12; x += 4) {
    ctx.lineTo(x, x % 8 === 0 ? -14.5 : -11.5);
  }
  ctx.stroke();

  // Label panel (rounded inset on the lower paper) — where the crop is shown
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.rect(-9, 1, 18, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(58,28,8,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // A couple of seed dots printed under the label as a line of "text"
  ctx.fillStyle = "rgba(58,28,8,0.45)";
  ctx.fillRect(-7, 15, 14, 1.4);
  ctx.fillRect(-7, 17.5, 10, 1.4);

  // Sprout illustration printed on the label
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(0, 4);
  ctx.stroke();
  ctx.fillStyle = "#5a8028";
  ctx.beginPath();
  ctx.ellipse(-3, 6, 3, 1.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3, 5, 3, 1.5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Soil mound at the base of the printed sprout
  ctx.fillStyle = "#6a3d18";
  ctx.beginPath();
  ctx.ellipse(0, 13, 4, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Specular sheen on the upper-left of the paper
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.moveTo(-13, -10);
  ctx.lineTo(-4, -10);
  ctx.lineTo(-7, 22);
  ctx.lineTo(-12, 22);
  ctx.closePath();
  ctx.fill();
}

function drawLockbox(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 22, 4);
  // Utilitarian lockbox: a squared-off wooden case with a FLAT rectangular
  // lid (no domed chest curve) and heavy iron reinforcement.
  const body = ctx.createLinearGradient(0, -6, 0, 20);
  body.addColorStop(0, "#a87838");
  body.addColorStop(1, "#5a3014");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.rect(-18, -6, 36, 26);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Flat lid block sitting square on top
  const lid = ctx.createLinearGradient(0, -16, 0, -6);
  lid.addColorStop(0, "#9c6a2c");
  lid.addColorStop(1, "#7a4a18");
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.rect(-19, -16, 38, 10);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Lid highlight edge
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-18, -14.5);
  ctx.lineTo(18, -14.5);
  ctx.stroke();
  // Iron banding (vertical straps front + lid seam)
  ctx.fillStyle = "#3a3a40";
  ctx.fillRect(-19, -7, 38, 3); // seam under lid
  ctx.fillRect(-13, -16, 4, 36); // left strap
  ctx.fillRect(9, -16, 4, 36);   // right strap
  // Iron corners on the lid and base
  [[-19, -16], [15, -16], [-19, 16], [15, 16]].forEach(([x, y]) => {
    ctx.fillStyle = "#3a3a40";
    ctx.beginPath();
    ctx.rect(x, y, 4, 4);
    ctx.fill();
    ctx.strokeStyle = "#0a0a0e";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });
  // Lock plate (centred on the front, over the lid seam)
  ctx.fillStyle = "#c0c4cc";
  ctx.beginPath();
  ctx.rect(-6, -3, 12, 13);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Plate bevel highlight
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5, -2);
  ctx.lineTo(5, -2);
  ctx.stroke();
  // Keyhole
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath();
  ctx.arc(0, 2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-0.7, 2, 1.4, 5);
  // Small interior glint at the lid seam (hints at a rare item without a star)
  ctx.fillStyle = "rgba(255,220,120,0.55)";
  ctx.beginPath();
  ctx.ellipse(0, -6.5, 5, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawReshuffleHorn(ctx: CanvasRenderingContext2D) {
  drawShadow(ctx, 20, 4);
  // Profile bugle/horn: slim mouthpiece on the left, a tapering tube
  // sweeping right into a clear round-flared bell. Brass gradient.
  ctx.save();
  const brass = ctx.createLinearGradient(0, -14, 0, 14);
  brass.addColorStop(0, "#e8c24c");
  brass.addColorStop(0.5, "#c8901c");
  brass.addColorStop(1, "#7a5008");

  // Tapering tube from mouthpiece to bell throat
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(-20, -4);
  ctx.bezierCurveTo(-6, -8, 6, -6, 12, -2);
  ctx.bezierCurveTo(6, 2, -6, 4, -20, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3a04";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Bell flare (round funnel opening to the right)
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(9, -3);
  ctx.bezierCurveTo(15, -8, 20, -15, 23, -13);
  ctx.bezierCurveTo(25, -5, 25, 7, 23, 15);
  ctx.bezierCurveTo(20, 17, 15, 9, 9, 5);
  ctx.bezierCurveTo(7, 1, 7, 1, 9, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3a04";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Bell rim (thick lip) highlight
  ctx.strokeStyle = "#f0d878";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(23, -13);
  ctx.bezierCurveTo(25.5, -4, 25.5, 6, 23, 15);
  ctx.stroke();

  // Mouthpiece (slim cup on the left tip)
  ctx.fillStyle = "#d4a020";
  ctx.beginPath();
  ctx.ellipse(-21, -1, 2.6, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3a04";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Tube sheen
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, -4);
  ctx.bezierCurveTo(-4, -6, 6, -4, 11, -1);
  ctx.stroke();
  ctx.restore();

  // Sound waves emerging from the bell
  ctx.strokeStyle = "rgba(248,200,80,0.9)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  [3, 6].forEach((d) => {
    ctx.beginPath();
    ctx.arc(25, 1, d, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  });

  // Reshuffle arrow as a small corner badge (top-left), the primary cue
  ctx.save();
  ctx.translate(-15, -17);
  ctx.strokeStyle = "#3a82c4";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, 6, -Math.PI * 0.35, Math.PI * 1.25);
  ctx.stroke();
  // Arrow head at the open end of the loop
  ctx.fillStyle = "#3a82c4";
  ctx.beginPath();
  ctx.moveTo(8, -2);
  ctx.lineTo(2, -4);
  ctx.lineTo(5, 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const ICONS = {
  player_clear:    { label:"Scythe",          color:"#a8a8b0", draw:drawPlayerScythe },
  player_basic:    { label:"Seedpack",        color:"#a87838", draw:drawSeedpack },
  player_rare:     { label:"Lockbox",         color:"#a87018", draw:drawLockbox },
  player_shuffle:  { label:"Reshuffle Horn",  color:"#7a4a18", draw:drawReshuffleHorn },
};
