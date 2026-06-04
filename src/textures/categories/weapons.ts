// Fantasy weapons & armor — clean, game-y procedural icons.

function shadow(ctx: CanvasRenderingContext2D, w: number, y?: number) {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, y ?? 22, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSword(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  ctx.save();
  ctx.rotate(0.18);
  // Blade — point up, steel with bright central specular streak.
  const blade = ctx.createLinearGradient(-5, 0, 5, 0);
  blade.addColorStop(0, "#5a5a62");
  blade.addColorStop(0.42, "#d8d8e0");
  blade.addColorStop(0.5, "#ffffff");
  blade.addColorStop(0.58, "#c0c0c8");
  blade.addColorStop(1, "#3a3a40");
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(0, -24);       // tip
  ctx.lineTo(4, -16);
  ctx.lineTo(4, 6);
  ctx.lineTo(-4, 6);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Fuller / central highlight line
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 4);
  ctx.stroke();
  // Crossguard — gold bar
  const guard = ctx.createLinearGradient(-14, 0, 14, 0);
  guard.addColorStop(0, "#a85410");
  guard.addColorStop(0.5, "#ffd34c");
  guard.addColorStop(1, "#7a4810");
  ctx.fillStyle = guard;
  ctx.beginPath();
  ctx.moveTo(-14, 7);
  ctx.lineTo(14, 7);
  ctx.lineTo(11, 11);
  ctx.lineTo(-11, 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(-12, 7.5, 24, 1.2);
  // Grip — wrapped leather
  const grip = ctx.createLinearGradient(-3, 0, 3, 0);
  grip.addColorStop(0, "#3a2008");
  grip.addColorStop(0.5, "#7a4a18");
  grip.addColorStop(1, "#2a1408");
  ctx.fillStyle = grip;
  ctx.fillRect(-3, 11, 6, 11);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-3, 11, 6, 11);
  ctx.strokeStyle = "rgba(20,14,4,0.7)";
  ctx.lineWidth = 0.8;
  for (let y = 13; y < 22; y += 2.2) {
    ctx.beginPath();
    ctx.moveTo(-3, y);
    ctx.lineTo(3, y + 1.2);
    ctx.stroke();
  }
  // Pommel — round gold knob
  const pom = ctx.createRadialGradient(-1.5, 22, 0.5, 0, 23, 5);
  pom.addColorStop(0, "#fff0b0");
  pom.addColorStop(0.5, "#ffd34c");
  pom.addColorStop(1, "#7a4810");
  ctx.fillStyle = pom;
  ctx.beginPath();
  ctx.arc(0, 23.5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Heater shield body
  const body = ctx.createLinearGradient(0, -20, 0, 22);
  body.addColorStop(0, "#7a8a9a");
  body.addColorStop(0.5, "#48586a");
  body.addColorStop(1, "#28323e");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-16, -18);
  ctx.lineTo(16, -18);
  ctx.lineTo(16, -2);
  ctx.bezierCurveTo(16, 12, 8, 20, 0, 24);
  ctx.bezierCurveTo(-8, 20, -16, 12, -16, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#15202a";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner field for emblem
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-16, -18);
  ctx.lineTo(16, -18);
  ctx.lineTo(16, -2);
  ctx.bezierCurveTo(16, 12, 8, 20, 0, 24);
  ctx.bezierCurveTo(-8, 20, -16, 12, -16, -2);
  ctx.closePath();
  ctx.clip();
  // Colored band background
  ctx.fillStyle = "#b83838";
  ctx.beginPath();
  ctx.moveTo(-16, -18);
  ctx.lineTo(16, -18);
  ctx.lineTo(16, 0);
  ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fill();
  // Star emblem (gold)
  ctx.fillStyle = "#ffd34c";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 8 : 3.4;
    const x = Math.cos(a) * r;
    const y = -4 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4810";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  // Metal studs along rim
  ctx.fillStyle = "#d8d8e0";
  const studs: Array<[number, number]> = [[-13, -15], [13, -15], [-14, 0], [14, 0], [-8, 14], [8, 14], [0, 21]];
  studs.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#15202a";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });
  // Edge highlight
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-14, -16);
  ctx.lineTo(14, -16);
  ctx.stroke();
}

function drawBow(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  ctx.save();
  ctx.rotate(0.12);
  // Wooden longbow limb (C-shape opening right)
  const wood = ctx.createLinearGradient(-12, 0, -2, 0);
  wood.addColorStop(0, "#3a2008");
  wood.addColorStop(0.5, "#a87838");
  wood.addColorStop(1, "#5a3414");
  ctx.strokeStyle = wood;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.bezierCurveTo(-16, -12, -16, 12, -2, 22);
  ctx.stroke();
  // Wood outline
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.bezierCurveTo(-16, -12, -16, 12, -2, 22);
  ctx.stroke();
  // Wood highlight
  ctx.strokeStyle = "rgba(255,230,180,0.5)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-3, -19);
  ctx.bezierCurveTo(-14, -10, -14, 10, -3, 19);
  ctx.stroke();
  // Bowstring (drawn back toward right)
  ctx.strokeStyle = "rgba(240,240,230,0.9)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.lineTo(8, 0);
  ctx.lineTo(-2, 22);
  ctx.stroke();
  // Nocked arrow — shaft
  const shaft = ctx.createLinearGradient(0, -2, 0, 2);
  shaft.addColorStop(0, "#c89858");
  shaft.addColorStop(1, "#7a4a18");
  ctx.strokeStyle = shaft;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-20, 0);
  ctx.stroke();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-20, 0);
  ctx.stroke();
  // Arrowhead (steel)
  ctx.fillStyle = "#d8d8e0";
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-18, -3.5);
  ctx.lineTo(-18, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  // Fletching at nock (back end, near string)
  ctx.fillStyle = "#b83838";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(14, -4);
  ctx.lineTo(11, 0);
  ctx.lineTo(14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a1414";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.restore();
}

function drawAxe(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  ctx.save();
  ctx.rotate(0.16);
  // Wooden haft
  const haft = ctx.createLinearGradient(-3, 0, 3, 0);
  haft.addColorStop(0, "#3a2008");
  haft.addColorStop(0.5, "#a87838");
  haft.addColorStop(1, "#2a1408");
  ctx.fillStyle = haft;
  ctx.fillRect(-3, -16, 5, 40);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-3, -16, 5, 40);
  // Steel head — bearded blade flaring left, smaller back spike right
  const steel = ctx.createLinearGradient(-18, 0, 12, 0);
  steel.addColorStop(0, "#3a3a40");
  steel.addColorStop(0.5, "#e0e0e8");
  steel.addColorStop(0.55, "#ffffff");
  steel.addColorStop(1, "#5a5a62");
  ctx.fillStyle = steel;
  // Main bearded bit (left)
  ctx.beginPath();
  ctx.moveTo(-1, -16);
  ctx.lineTo(-18, -12);
  ctx.bezierCurveTo(-22, -4, -22, 4, -16, 10);
  ctx.lineTo(-1, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Back bit (right, smaller)
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(1, -14);
  ctx.lineTo(11, -10);
  ctx.bezierCurveTo(13, -4, 13, 2, 9, 6);
  ctx.lineTo(1, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Edge highlight on main blade
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-17, -10);
  ctx.bezierCurveTo(-20, -3, -20, 3, -15, 8);
  ctx.stroke();
  // Steel collar over haft
  ctx.fillStyle = "#7a7a82";
  ctx.fillRect(-3.5, -8, 6, 5);
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-3.5, -8, 6, 5);
  ctx.restore();
}

function drawStaff(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 10);
  ctx.save();
  ctx.rotate(0.14);
  // Wooden shaft, slightly gnarled
  const shaft = ctx.createLinearGradient(-3, 0, 3, 0);
  shaft.addColorStop(0, "#3a2408");
  shaft.addColorStop(0.5, "#9a6e30");
  shaft.addColorStop(1, "#2a1808");
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(-2.5, -10);
  ctx.bezierCurveTo(-4, 4, -2, 16, -3, 24);
  ctx.lineTo(2, 24);
  ctx.bezierCurveTo(2, 14, 3, 2, 2.5, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Wood grain
  ctx.strokeStyle = "rgba(255,220,160,0.4)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-1, -6);
  ctx.bezierCurveTo(-1, 6, 0, 14, -1, 22);
  ctx.stroke();
  // Claw setting holding the gem
  ctx.fillStyle = "#7a5018";
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.lineTo(6, -10);
  ctx.lineTo(4, -16);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  // Soft radial glow behind gem
  const glow = ctx.createRadialGradient(0, -20, 1, 0, -20, 16);
  glow.addColorStop(0, "rgba(120,220,255,0.55)");
  glow.addColorStop(0.5, "rgba(80,160,255,0.25)");
  glow.addColorStop(1, "rgba(80,160,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -20, 16, 0, Math.PI * 2);
  ctx.fill();
  // Gem
  const gem = ctx.createRadialGradient(-2, -22, 0.5, 0, -20, 8);
  gem.addColorStop(0, "#ffffff");
  gem.addColorStop(0.4, "#a8e8ff");
  gem.addColorStop(0.8, "#3a8aff");
  gem.addColorStop(1, "#1838a8");
  ctx.fillStyle = gem;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(6, -20);
  ctx.lineTo(0, -12);
  ctx.lineTo(-6, -20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1838a8";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Gem facet highlight
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(3, -21);
  ctx.lineTo(0, -18);
  ctx.lineTo(-3, -21);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDagger(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 9);
  ctx.save();
  ctx.rotate(0.2);
  // Short steel blade, point up
  const blade = ctx.createLinearGradient(-4, 0, 4, 0);
  blade.addColorStop(0, "#5a5a62");
  blade.addColorStop(0.45, "#d8d8e0");
  blade.addColorStop(0.5, "#ffffff");
  blade.addColorStop(0.6, "#c0c0c8");
  blade.addColorStop(1, "#3a3a40");
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(3.5, -14);
  ctx.lineTo(3, 6);
  ctx.lineTo(-3, 6);
  ctx.lineTo(-3.5, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Center ridge highlight
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, 4);
  ctx.stroke();
  // Crossguard — small gold
  const guard = ctx.createLinearGradient(-9, 0, 9, 0);
  guard.addColorStop(0, "#a85410");
  guard.addColorStop(0.5, "#ffd34c");
  guard.addColorStop(1, "#7a4810");
  ctx.fillStyle = guard;
  ctx.beginPath();
  ctx.moveTo(-9, 6);
  ctx.lineTo(9, 6);
  ctx.lineTo(7, 10);
  ctx.lineTo(-7, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Grip
  ctx.fillStyle = "#5a2818";
  ctx.fillRect(-2.5, 10, 5, 9);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-2.5, 10, 5, 9);
  // Jeweled pommel — red gem in gold mount
  ctx.fillStyle = "#ffd34c";
  ctx.beginPath();
  ctx.arc(0, 20, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4810";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  const jewel = ctx.createRadialGradient(-1, 19, 0.4, 0, 20, 3);
  jewel.addColorStop(0, "#ff9090");
  jewel.addColorStop(0.5, "#e02828");
  jewel.addColorStop(1, "#7a0808");
  ctx.fillStyle = jewel;
  ctx.beginPath();
  ctx.arc(0, 20, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-0.8, 19, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpear(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 10);
  ctx.save();
  ctx.rotate(0.32);
  // Wooden shaft (diagonal)
  const shaft = ctx.createLinearGradient(-2, 0, 2, 0);
  shaft.addColorStop(0, "#3a2008");
  shaft.addColorStop(0.5, "#a87838");
  shaft.addColorStop(1, "#2a1408");
  ctx.fillStyle = shaft;
  ctx.fillRect(-2, -10, 4, 36);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-2, -10, 4, 36);
  // Binding wraps below tip
  ctx.strokeStyle = "#5a3814";
  ctx.lineWidth = 1.4;
  for (let y = -8; y < 0; y += 2.4) {
    ctx.beginPath();
    ctx.moveTo(-2.5, y);
    ctx.lineTo(2.5, y + 1);
    ctx.stroke();
  }
  // Leaf-shaped steel tip
  const tip = ctx.createLinearGradient(-5, 0, 5, 0);
  tip.addColorStop(0, "#5a5a62");
  tip.addColorStop(0.45, "#dcdce4");
  tip.addColorStop(0.5, "#ffffff");
  tip.addColorStop(0.6, "#bcbcc4");
  tip.addColorStop(1, "#3a3a40");
  ctx.fillStyle = tip;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.bezierCurveTo(5, -22, 5, -14, 2, -8);
  ctx.lineTo(-2, -8);
  ctx.bezierCurveTo(-5, -14, -5, -22, 0, -28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Midrib highlight
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(0, -10);
  ctx.stroke();
  ctx.restore();
}

function drawMace(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  ctx.save();
  ctx.rotate(0.16);
  // Short handle
  const handle = ctx.createLinearGradient(-3, 0, 3, 0);
  handle.addColorStop(0, "#3a2008");
  handle.addColorStop(0.5, "#8a6028");
  handle.addColorStop(1, "#2a1408");
  ctx.fillStyle = handle;
  ctx.fillRect(-3, -2, 5, 26);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-3, -2, 5, 26);
  // Pommel
  ctx.fillStyle = "#7a7a82";
  ctx.beginPath();
  ctx.arc(-0.5, 24, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  // Flanges (spikes) radiating from head
  const cx = 0, cy = -10;
  ctx.fillStyle = "#5a5a62";
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.2;
  const spikes = 8;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const bx = cx + Math.cos(a) * 6;
    const by = cy + Math.sin(a) * 6;
    const tx = cx + Math.cos(a) * 13;
    const ty = cy + Math.sin(a) * 13;
    const perp = a + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(perp) * 3, by + Math.sin(perp) * 3);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx - Math.cos(perp) * 3, by - Math.sin(perp) * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Central head ball — steel gradient
  const head = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 9);
  head.addColorStop(0, "#ffffff");
  head.addColorStop(0.4, "#c0c0c8");
  head.addColorStop(0.7, "#7a7a82");
  head.addColorStop(1, "#2a2a30");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Specular glint
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(cx - 2.5, cy - 2.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHelmet(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 15);
  // Plume behind helm
  ctx.fillStyle = "#b83838";
  ctx.beginPath();
  ctx.moveTo(2, -16);
  ctx.bezierCurveTo(8, -28, 16, -26, 14, -14);
  ctx.bezierCurveTo(12, -10, 6, -10, 2, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a1414";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(4, -16);
  ctx.bezierCurveTo(8, -24, 13, -23, 12, -16);
  ctx.closePath();
  ctx.fill();
  // Great helm / barbute body
  const body = ctx.createLinearGradient(-14, 0, 14, 0);
  body.addColorStop(0, "#3a3a40");
  body.addColorStop(0.45, "#d0d0d8");
  body.addColorStop(0.55, "#ffffff");
  body.addColorStop(1, "#48484f");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.bezierCurveTo(-14, -20, 14, -20, 14, -2);
  ctx.lineTo(14, 12);
  ctx.bezierCurveTo(14, 18, -14, 18, -14, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Brow band
  ctx.strokeStyle = "#7a7a82";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.lineTo(13, -2);
  ctx.stroke();
  // Visor slit (T-shape)
  ctx.fillStyle = "#0a0a0e";
  ctx.fillRect(-10, 1, 20, 2.6);
  ctx.fillRect(-1.4, 1, 2.8, 12);
  // Rivets
  ctx.fillStyle = "#9a9aa2";
  [[-11, -6], [11, -6], [-11, 8], [11, 8]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1e";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });
  // Highlight streak
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-7, -6, 2.4, 7, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrossbow(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  ctx.save();
  ctx.rotate(-0.1);
  // Wooden stock (horizontal body extending back-right)
  const stock = ctx.createLinearGradient(0, -4, 0, 8);
  stock.addColorStop(0, "#a87838");
  stock.addColorStop(0.5, "#7a4a18");
  stock.addColorStop(1, "#3a2008");
  ctx.fillStyle = stock;
  ctx.beginPath();
  ctx.moveTo(-18, -3);
  ctx.lineTo(8, -3);
  ctx.lineTo(8, 3);
  ctx.lineTo(-12, 5);
  ctx.lineTo(-18, 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Steel limbs (bow, vertical at front-left)
  const limb = ctx.createLinearGradient(0, -16, 0, 16);
  limb.addColorStop(0, "#5a5a62");
  limb.addColorStop(0.5, "#e0e0e8");
  limb.addColorStop(1, "#3a3a40");
  ctx.strokeStyle = limb;
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(8, -16);
  ctx.quadraticCurveTo(14, 0, 8, 16);
  ctx.stroke();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(8, -16);
  ctx.quadraticCurveTo(14, 0, 8, 16);
  ctx.stroke();
  // Bowstring
  ctx.strokeStyle = "rgba(240,240,230,0.9)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(8, -16);
  ctx.lineTo(0, 0);
  ctx.lineTo(8, 16);
  ctx.stroke();
  // Loaded bolt down the center groove
  ctx.strokeStyle = "#c89858";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(20, 0);
  ctx.stroke();
  // Bolt head
  ctx.fillStyle = "#d8d8e0";
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(19, -3);
  ctx.lineTo(19, 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Trigger / grip underneath
  ctx.fillStyle = "#5a3414";
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-6, 14);
  ctx.lineTo(-12, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Stock highlight
  ctx.fillStyle = "rgba(255,230,180,0.4)";
  ctx.fillRect(-16, -2.4, 22, 1.2);
  // Metal trigger detail
  ctx.fillStyle = "#7a7a82";
  ctx.beginPath();
  ctx.arc(-7, 6, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const ICONS = {
  weapon_sword:    { label: "Sword",    color: "#d8d8e0", draw: drawSword },
  weapon_shield:   { label: "Shield",   color: "#48586a", draw: drawShield },
  weapon_bow:      { label: "Bow",      color: "#a87838", draw: drawBow },
  weapon_axe:      { label: "Axe",      color: "#e0e0e8", draw: drawAxe },
  weapon_staff:    { label: "Staff",    color: "#3a8aff", draw: drawStaff },
  weapon_dagger:   { label: "Dagger",   color: "#d8d8e0", draw: drawDagger },
  weapon_spear:    { label: "Spear",    color: "#dcdce4", draw: drawSpear },
  weapon_mace:     { label: "Mace",     color: "#7a7a82", draw: drawMace },
  weapon_helmet:   { label: "Helmet",   color: "#d0d0d8", draw: drawHelmet },
  weapon_crossbow: { label: "Crossbow", color: "#a87838", draw: drawCrossbow },
};
