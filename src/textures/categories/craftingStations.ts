// Crafting station icons (bakery, forge, larder, workshop, decor).
// These appear as 32px tab badges in the crafting screen.

function drawShadow(ctx, w = 22, h = 4) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBakeryStation(ctx) {
  drawShadow(ctx, 22, 4);
  // Brick oven dome
  const dome = ctx.createRadialGradient(-4, -4, 4, 0, 0, 22);
  dome.addColorStop(0, "#d68852");
  dome.addColorStop(0.6, "#a85428");
  dome.addColorStop(1, "#5a2010");
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.moveTo(-22, 18);
  ctx.bezierCurveTo(-22, -14, 22, -14, 22, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1004";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Bricks (curved rows)
  ctx.strokeStyle = "rgba(58,16,4,0.5)";
  ctx.lineWidth = 0.8;
  for (let r = 4; r >= -10; r -= 5) {
    ctx.beginPath();
    ctx.arc(0, 18, 18 - (4 - r) * 0.3, Math.PI + 0.2, Math.PI * 2 - 0.2);
    ctx.stroke();
  }
  // Vertical brick joints
  ctx.beginPath();
  ctx.moveTo(-12, 4); ctx.lineTo(-12, 0);
  ctx.moveTo(0, -2); ctx.lineTo(0, -6);
  ctx.moveTo(12, 4); ctx.lineTo(12, 0);
  ctx.stroke();
  // Oven mouth
  ctx.fillStyle = "#1a0a04";
  ctx.beginPath();
  ctx.moveTo(-10, 18);
  ctx.bezierCurveTo(-10, 6, 10, 6, 10, 18);
  ctx.closePath();
  ctx.fill();
  // Fire glow inside
  const fire = ctx.createRadialGradient(0, 12, 1, 0, 12, 10);
  fire.addColorStop(0, "#fff080");
  fire.addColorStop(0.4, "#f8a020");
  fire.addColorStop(1, "#a82008");
  ctx.fillStyle = fire;
  ctx.beginPath();
  ctx.ellipse(0, 14, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bread loaf inside
  ctx.fillStyle = "#d49058";
  ctx.beginPath();
  ctx.ellipse(0, 12, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a2c08";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-3, 11); ctx.lineTo(-1, 13);
  ctx.moveTo(0, 10); ctx.lineTo(2, 12);
  ctx.stroke();
  // Smoke from chimney top
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(8, -16, 5, 6);
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, -16, 5, 6);
  ctx.fillStyle = "rgba(180,170,160,0.7)";
  ctx.beginPath();
  ctx.arc(11, -22, 2.4, 0, Math.PI * 2);
  ctx.arc(13, -27, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawForgeStation(ctx) {
  drawShadow(ctx, 22, 4);
  // Forge stone base
  ctx.fillStyle = "#5a4a3a";
  ctx.beginPath();
  ctx.rect(-20, 4, 40, 18);
  ctx.fill();
  ctx.strokeStyle = "#1a0e08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Stone block lines
  ctx.strokeStyle = "rgba(40,28,18,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-20, 14); ctx.lineTo(20, 14);
  ctx.moveTo(-8, 4); ctx.lineTo(-8, 14);
  ctx.moveTo(8, 14); ctx.lineTo(8, 22);
  ctx.stroke();
  // Hood
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.moveTo(-16, 4);
  ctx.lineTo(-12, -16);
  ctx.lineTo(12, -16);
  ctx.lineTo(16, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Hood vent
  ctx.fillStyle = "#1a0a04";
  ctx.fillRect(-4, -22, 8, 6);
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 1;
  ctx.strokeRect(-4, -22, 8, 6);
  // Smoke
  ctx.fillStyle = "rgba(80,80,90,0.7)";
  ctx.beginPath();
  ctx.arc(0, -28, 2.4, 0, Math.PI * 2);
  ctx.arc(-2, -32, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Coals + fire under hood
  ctx.fillStyle = "#7a1808";
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Flames
  ctx.fillStyle = "#f8a020";
  [[-6, -2], [0, -6], [6, -2]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 2, y - 4, x + 2, y - 4, x, y - 8);
    ctx.bezierCurveTo(x + 1, y - 4, x - 1, y - 4, x, y);
    ctx.fill();
  });
  ctx.fillStyle = "#fff080";
  [[0, -4]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 1, y - 2, x + 1, y - 2, x, y - 4);
    ctx.fill();
  });
  // Anvil in front
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath();
  ctx.moveTo(-12, 14); ctx.lineTo(12, 14); ctx.lineTo(8, 22); ctx.lineTo(-8, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawLarderStation(ctx) {
  drawShadow(ctx, 22, 4);
  // Cabinet body
  const body = ctx.createLinearGradient(0, -18, 0, 22);
  body.addColorStop(0, "#a87838");
  body.addColorStop(1, "#5a3014");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.rect(-18, -18, 36, 40);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Doors split
  ctx.fillStyle = "#3a1c08";
  ctx.fillRect(-1, -18, 2, 40);
  // Top molding
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.rect(-20, -22, 40, 4);
  ctx.fill();
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Glass front (each door has a window)
  [[-13, -14], [3, -14]].forEach(([x, y]) => {
    ctx.fillStyle = "rgba(160,200,220,0.55)";
    ctx.fillRect(x, y, 10, 14);
    ctx.strokeStyle = "#3a1c08";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 10, 14);
    // Cross frame
    ctx.beginPath();
    ctx.moveTo(x + 5, y); ctx.lineTo(x + 5, y + 14);
    ctx.moveTo(x, y + 7); ctx.lineTo(x + 10, y + 7);
    ctx.stroke();
  });
  // Jars on shelves visible through glass
  // Shelf 1
  ctx.fillStyle = "#a02a4a";
  [[-10, -10], [-6, -10], [4, -10], [8, -10]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.rect(x, y, 2, 4);
    ctx.fill();
  });
  // Shelf 2
  ctx.fillStyle = "#5a8a26";
  [[-10, -3], [-7, -3], [4, -3], [7, -3]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.rect(x, y, 2, 4);
    ctx.fill();
  });
  // Knobs
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.arc(-2.5, 4, 1.2, 0, Math.PI * 2);
  ctx.arc(2.5, 4, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Drawer at bottom
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-18, 14, 36, 8);
  ctx.strokeStyle = "#1a0a04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-18, 14, 36, 8);
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.arc(0, 18, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Apple sitting on top
  ctx.fillStyle = "#d4543a";
  ctx.beginPath();
  ctx.arc(-10, -22, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a1808";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.fillStyle = "#5a8a26";
  ctx.beginPath();
  ctx.moveTo(-9, -25); ctx.lineTo(-7, -27); ctx.lineTo(-8, -25); ctx.closePath();
  ctx.fill();
}

function drawWorkshopStation(ctx) {
  drawShadow(ctx, 22, 4);
  // Workbench
  ctx.fillStyle = "#a87838";
  ctx.beginPath();
  ctx.rect(-22, 6, 44, 4);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Bench legs
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-20, 10, 4, 14);
  ctx.fillRect(16, 10, 4, 14);
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  ctx.strokeRect(-20, 10, 4, 14);
  ctx.strokeRect(16, 10, 4, 14);
  // Pegboard wall behind
  ctx.fillStyle = "#5a4a3a";
  ctx.beginPath();
  ctx.rect(-20, -20, 40, 24);
  ctx.fill();
  ctx.strokeStyle = "#2a1c10";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Holes on pegboard
  ctx.fillStyle = "#1a0e08";
  for (let y = -18; y <= 0; y += 4) {
    for (let x = -16; x <= 16; x += 6) {
      ctx.beginPath();
      ctx.arc(x, y, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Hammer hung
  ctx.save();
  ctx.translate(-14, -10);
  ctx.fillStyle = "#7a4a18";
  ctx.fillRect(-1.4, 0, 2.8, 14);
  ctx.fillStyle = "#5a6066";
  ctx.fillRect(-5, -3, 10, 5);
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 1;
  ctx.strokeRect(-5, -3, 10, 5);
  ctx.restore();
  // Saw hung
  ctx.save();
  ctx.translate(0, -10);
  ctx.rotate(0.2);
  ctx.fillStyle = "#c8c8d0";
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(8, 4);
  ctx.lineTo(-8, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3a40";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Saw teeth
  ctx.fillStyle = "#3a3a40";
  for (let x = -8; x < 8; x += 2) {
    ctx.beginPath();
    ctx.moveTo(x, 4); ctx.lineTo(x + 1, 6); ctx.lineTo(x + 2, 4);
    ctx.closePath();
    ctx.fill();
  }
  // Saw handle
  ctx.fillStyle = "#7a4a18";
  ctx.beginPath();
  ctx.rect(8, -2, 6, 8);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  // Wrench hung
  ctx.save();
  ctx.translate(12, -8);
  ctx.rotate(0.4);
  ctx.fillStyle = "#a8a8b0";
  ctx.fillRect(-1.6, -8, 3.2, 14);
  ctx.beginPath();
  ctx.arc(0, -8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Wrench notch
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.arc(0, -8, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Sawdust on bench
  ctx.fillStyle = "#d4a060";
  [[-6, 4, 1.4], [4, 4, 1.2]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDecorStation(ctx) {
  drawShadow(ctx, 22, 4);
  // Vase
  const body = ctx.createLinearGradient(0, 4, 0, 22);
  body.addColorStop(0, "#a85a98");
  body.addColorStop(1, "#5a1c48");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-9, 4);
  ctx.bezierCurveTo(-14, 8, -14, 22, 0, 22);
  ctx.bezierCurveTo(14, 22, 14, 8, 9, 4);
  ctx.lineTo(7, 0);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#280418";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Vase glaze highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-6, 12, 1.6, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Vase rim
  ctx.fillStyle = "#7a3068";
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#280418";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Stems
  ctx.strokeStyle = "#3a6014";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  [[-6, -8], [0, -16], [6, -10]].forEach(([x, top]) => {
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.bezierCurveTo(x / 2, -6, x, -8, x, top);
    ctx.stroke();
  });
  // Leaves
  ctx.fillStyle = "#5a8028";
  [[-3, -6], [3, -8]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 2, 1, x < 0 ? -0.4 : 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Three flowers
  // Pink rose
  ctx.fillStyle = "#e85878";
  ctx.beginPath();
  ctx.arc(-6, -10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a8284a";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#fffaea";
  ctx.beginPath();
  ctx.arc(-6, -10, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Yellow daisy
  ctx.fillStyle = "#fffae0";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(0 + Math.cos(a) * 3, -16 + Math.sin(a) * 3, 1.6, 1, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f8d040";
  ctx.beginPath();
  ctx.arc(0, -16, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // Purple violet
  ctx.fillStyle = "#7a3aa8";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(6 + Math.cos(a) * 2.4, -10 + Math.sin(a) * 2.4, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#a058c0";
  ctx.beginPath();
  ctx.arc(6, -10, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff080";
  ctx.beginPath();
  ctx.arc(6, -10, 0.7, 0, Math.PI * 2);
  ctx.fill();
}

export const ICONS = {
  station_bakery:   { label:"Bakery",   color:"#a85428", draw:drawBakeryStation },
  station_forge:    { label:"Forge",    color:"#3a3a40", draw:drawForgeStation },
  station_larder:   { label:"Larder",   color:"#7a4a18", draw:drawLarderStation },
  station_workshop: { label:"Workshop", color:"#5a4a3a", draw:drawWorkshopStation },
  station_decor:    { label:"Decor",    color:"#7a3aa8", draw:drawDecorStation },
};
