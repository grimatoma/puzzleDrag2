// Recipes icons (crafted items that don't fall into other categories)

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWaterPump(ctx) {
  // Base
  ctx.fillStyle = "#4a4a52";
  ctx.fillRect(-10, 10, 20, 8);
  // Main body
  ctx.fillStyle = "#c84a3a";
  ctx.fillRect(-6, -10, 12, 20);
  ctx.strokeStyle = "#8a2a1a";
  ctx.lineWidth = 2;
  ctx.strokeRect(-6, -10, 12, 20);
  // Spout
  ctx.fillStyle = "#8a8a92";
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(-16, -2);
  ctx.lineTo(-16, 4);
  ctx.lineTo(-10, 4);
  ctx.lineTo(-10, 2);
  ctx.lineTo(-6, 2);
  ctx.fill();
  ctx.stroke();
  // Handle
  ctx.strokeStyle = "#a0a0a8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.lineTo(16, -16);
  ctx.stroke();
  ctx.fillStyle = "#c84a3a";
  ctx.beginPath();
  ctx.arc(16, -16, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawExplosives(ctx) {
  ctx.fillStyle = "#d44a3a";
  ctx.strokeStyle = "#8a2a1a";
  ctx.lineWidth = 2;
  
  // Three dynamite sticks
  ctx.save();
  ctx.translate(-8, 4);
  ctx.rotate(-0.2);
  rr(ctx, -6, -12, 12, 24, 3); ctx.fill(); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(8, 4);
  ctx.rotate(0.2);
  rr(ctx, -6, -12, 12, 24, 3); ctx.fill(); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(0, 6);
  rr(ctx, -6, -12, 12, 24, 3); ctx.fill(); ctx.stroke();
  ctx.restore();

  // Band
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(-12, -2, 24, 6);

  // Fuse
  ctx.strokeStyle = "#b09060";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.quadraticCurveTo(5, -14, -4, -18);
  ctx.stroke();
  
  // Spark
  ctx.fillStyle = "#f4d030";
  ctx.beginPath();
  ctx.arc(-4, -18, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHoneyroll(ctx) {
  // Pastry roll
  ctx.fillStyle = "#f0c050";
  ctx.strokeStyle = "#8a6010";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Spiral lines
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.quadraticCurveTo(-5, 10, 0, 4);
  ctx.quadraticCurveTo(5, -2, 10, 4);
  ctx.stroke();

  // Jam dollop in center
  ctx.fillStyle = "#d4658c";
  ctx.beginPath();
  ctx.ellipse(0, 4, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Honey drip
  ctx.fillStyle = "#f4d030";
  ctx.beginPath();
  ctx.arc(6, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -4);
  ctx.quadraticCurveTo(6, 4, 8, -4);
  ctx.fill();
}

function drawHarvestpie(ctx) {
  // Pie tin
  ctx.fillStyle = "#8a8a92";
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.lineTo(-10, 10);
  ctx.lineTo(10, 10);
  ctx.lineTo(14, -2);
  ctx.closePath();
  ctx.fill();

  // Pie crust base
  ctx.fillStyle = "#d49060";
  ctx.strokeStyle = "#7a4a28";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -2, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Jam filling showing through
  ctx.fillStyle = "#a3486a";
  ctx.beginPath();
  ctx.ellipse(0, -2, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lattice crust
  ctx.strokeStyle = "#d49060";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, -5); ctx.lineTo(8, 1);
  ctx.moveTo(-4, -6); ctx.lineTo(12, -2);
  ctx.moveTo(-10, -1); ctx.lineTo(6, -5);
  ctx.moveTo(-2, 2); ctx.lineTo(10, -4);
  ctx.stroke();
}

function drawPreserve(ctx) {
  // Jar body
  ctx.fillStyle = "#e0e0e8";
  ctx.globalAlpha = 0.8;
  rr(ctx, -10, -4, 20, 22, 4);
  ctx.fill();
  ctx.globalAlpha = 1.0;
  
  // Jam content
  ctx.fillStyle = "#9a6888";
  rr(ctx, -8, 2, 16, 14, 2);
  ctx.fill();

  // Label
  ctx.fillStyle = "#f4e0c0";
  ctx.fillRect(-6, 6, 12, 6);

  // Lid
  ctx.fillStyle = "#b03040";
  ctx.fillRect(-12, -8, 24, 6);
  // String tie
  ctx.strokeStyle = "#d49060";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(12, -2);
  ctx.stroke();
}

function drawTincture(ctx) {
  // Vial body
  ctx.fillStyle = "#d0e8e0";
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(-10, 10);
  ctx.arcTo(-10, 16, 0, 16, 6);
  ctx.arcTo(10, 16, 10, 10, 6);
  ctx.lineTo(6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Liquid
  ctx.fillStyle = "#6b8a3a";
  ctx.beginPath();
  ctx.moveTo(-8, 6);
  ctx.lineTo(-9, 10);
  ctx.arcTo(-9, 15, 0, 15, 5);
  ctx.arcTo(9, 15, 9, 10, 5);
  ctx.lineTo(8, 6);
  ctx.closePath();
  ctx.fill();

  // Cork
  ctx.fillStyle = "#b09060";
  ctx.fillRect(-4, -8, 8, 6);
  
  // Neck
  ctx.strokeStyle = "#8a8a92";
  ctx.lineWidth = 2;
  ctx.strokeRect(-5, -3, 10, 2);
}

function drawIronHinge(ctx) {
  ctx.fillStyle = "#7a8a96";
  ctx.strokeStyle = "#2a3a46";
  ctx.lineWidth = 2;

  // Left plate
  rr(ctx, -14, -8, 12, 16, 2);
  ctx.fill(); ctx.stroke();
  // Right plate
  rr(ctx, 2, -8, 12, 16, 2);
  ctx.fill(); ctx.stroke();
  
  // Center pin
  ctx.fillStyle = "#5a6a76";
  rr(ctx, -4, -10, 8, 20, 2);
  ctx.fill(); ctx.stroke();

  // Screws
  ctx.fillStyle = "#2a3a46";
  ctx.beginPath(); ctx.arc(-8, -4, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-8, 4, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -4, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, 4, 1.5, 0, Math.PI * 2); ctx.fill();
}

function drawCobblepath(ctx) {
  ctx.fillStyle = "#9a9a8a";
  ctx.strokeStyle = "#404038";
  ctx.lineWidth = 2;

  // Several stones
  const stones = [
    { x: -8, y: -6, r: 6 },
    { x: 6, y: -8, r: 5 },
    { x: 0, y: 4, r: 8 },
    { x: -12, y: 6, r: 5 },
    { x: 10, y: 6, r: 6 },
  ];

  for (const s of stones) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawLantern(ctx) {
  // Handle
  ctx.strokeStyle = "#3a3a40";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -12, 6, Math.PI, 0);
  ctx.stroke();

  // Top cap
  ctx.fillStyle = "#5a6a76";
  ctx.beginPath();
  ctx.moveTo(-8, -10);
  ctx.lineTo(8, -10);
  ctx.lineTo(4, -16);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glass body
  ctx.fillStyle = "#f4e090";
  ctx.globalAlpha = 0.8;
  rr(ctx, -6, -10, 12, 18, 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Inner glow/flame
  ctx.fillStyle = "#d4783a";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  // Base
  ctx.fillStyle = "#5a6a76";
  ctx.fillRect(-8, 8, 16, 4);
  ctx.strokeRect(-8, 8, 16, 4);

  // Frame lines
  ctx.beginPath();
  ctx.moveTo(-6, -10); ctx.lineTo(-6, 8);
  ctx.moveTo(6, -10); ctx.lineTo(6, 8);
  ctx.stroke();
}

function drawGoldring(ctx) {
  ctx.strokeStyle = "#ffd34c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner shadow
  ctx.strokeStyle = "#a08020";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Glint
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-6, -3, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawGemcrown(ctx) {
  // Base band
  ctx.fillStyle = "#ffd34c";
  ctx.strokeStyle = "#a08020";
  ctx.lineWidth = 2;
  rr(ctx, -14, 6, 28, 6, 2);
  ctx.fill();
  ctx.stroke();

  // Peaks
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(-18, -6);
  ctx.lineTo(-6, 2);
  ctx.lineTo(0, -10);
  ctx.lineTo(6, 2);
  ctx.lineTo(18, -6);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Gems
  ctx.fillStyle = "#65e5ff"; // Cutgem color
  ctx.beginPath(); ctx.arc(-18, -6, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -10, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(18, -6, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawIronframe(ctx) {
  ctx.strokeStyle = "#6a7a86";
  ctx.lineWidth = 3;
  
  // Outer square
  ctx.strokeRect(-12, -12, 24, 24);

  // Cross braces
  ctx.beginPath();
  ctx.moveTo(-12, -12); ctx.lineTo(12, 12);
  ctx.moveTo(12, -12); ctx.lineTo(-12, 12);
  ctx.stroke();

  // Rivets
  ctx.fillStyle = "#2a3040";
  const points = [[-12,-12], [12,-12], [-12,12], [12,12], [0,0]];
  for (const [x,y] of points) {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStonework(ctx) {
  ctx.fillStyle = "#8a8a7a";
  ctx.strokeStyle = "#383828";
  ctx.lineWidth = 2;

  // Stack of dressed blocks
  rr(ctx, -14, 4, 16, 8, 1); ctx.fill(); ctx.stroke();
  rr(ctx, 4, 4, 10, 8, 1); ctx.fill(); ctx.stroke();

  rr(ctx, -10, -4, 12, 8, 1); ctx.fill(); ctx.stroke();
  rr(ctx, 4, -4, 10, 8, 1); ctx.fill(); ctx.stroke();

  rr(ctx, -6, -12, 12, 8, 1); ctx.fill(); ctx.stroke();
}

function drawChowder(ctx) {
  // Bowl back lip
  ctx.fillStyle = "#d49060";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 6, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Soup base (creamy)
  ctx.fillStyle = "#e0d0b0";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Carrot / fish bits
  ctx.fillStyle = "#e88439"; // Carrot
  ctx.beginPath(); ctx.arc(-6, -1, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, 2, 1.5, 0, Math.PI * 2); ctx.fill();
  
  ctx.fillStyle = "#b0c8d4"; // Fish
  ctx.fillRect(0, -3, 4, 3);
  ctx.fillRect(-2, 1, 3, 2);

  // Bowl front
  ctx.fillStyle = "#d49060";
  ctx.strokeStyle = "#7a4a28";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI);
  ctx.quadraticCurveTo(0, 16, -16, 0); // Roughly bowl shape
  // Better bowl path
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.quadraticCurveTo(-16, 14, 0, 14);
  ctx.quadraticCurveTo(16, 14, 16, 0);
  ctx.arc(0, 0, 16, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  // Bowl rim
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI);
  ctx.stroke();
}

function drawFishOilBottled(ctx) {
  // Flask
  ctx.fillStyle = "#e8e0d0";
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(-8, 10);
  ctx.arcTo(-8, 14, 0, 14, 4);
  ctx.arcTo(8, 14, 8, 10, 4);
  ctx.lineTo(4, -8);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Yellow oil
  ctx.fillStyle = "#e8d050";
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(-7, 10);
  ctx.arcTo(-7, 13, 0, 13, 3);
  ctx.arcTo(7, 13, 7, 10, 3);
  ctx.lineTo(6, 2);
  ctx.closePath();
  ctx.fill();

  // Cork
  ctx.fillStyle = "#9b6b3e";
  ctx.fillRect(-3, -12, 6, 4);
  
  // Tag string
  ctx.strokeStyle = "#5e3a1d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, -6);
  ctx.lineTo(10, 0);
  ctx.stroke();

  // Tag
  ctx.fillStyle = "#d4c4a0";
  ctx.beginPath();
  ctx.arc(10, 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export const ICONS = {
  water_pump:  { label: "Water Pump", color: "#c84a3a", draw: drawWaterPump },
  explosives:  { label: "Explosives", color: "#d44a3a", draw: drawExplosives },
  honeyroll:   { label: "Honey Roll", color: "#f0c050", draw: drawHoneyroll },
  harvestpie:  { label: "Harvest Pie", color: "#d4784a", draw: drawHarvestpie },
  preserve:    { label: "Preserve Jar", color: "#9a6888", draw: drawPreserve },
  tincture:    { label: "Berry Tincture", color: "#6b8a3a", draw: drawTincture },
  iron_hinge:  { label: "Iron Hinge", color: "#7a8a96", draw: drawIronHinge },
  ironframe:   { label: "Iron Frame", color: "#6a7a86", draw: drawIronframe },
  cobblepath:  { label: "Cobble Path", color: "#9a9a8a", draw: drawCobblepath },
  lantern:     { label: "Iron Lantern", color: "#d4783a", draw: drawLantern },
  goldring:    { label: "Gold Ring", color: "#ffd34c", draw: drawGoldring },
  gemcrown:    { label: "Gem Crown", color: "#65e5ff", draw: drawGemcrown },
  stonework:   { label: "Stonework", color: "#8a8a7a", draw: drawStonework },
  chowder:     { label: "Chowder", color: "#d4b888", draw: drawChowder },
  fish_oil_bottled: { label: "Fish Oil (Bottled)", color: "#e8d050", draw: drawFishOilBottled },
};
