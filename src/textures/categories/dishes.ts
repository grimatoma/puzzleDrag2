// Cooked dishes & pantry foods (kitchen-themed).

function drawPie(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 22, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tin base (metallic side)
  const tin = ctx.createLinearGradient(0, 6, 0, 20);
  tin.addColorStop(0, "#c8c8d0");
  tin.addColorStop(0.5, "#9a9aa6");
  tin.addColorStop(1, "#5a5a66");
  ctx.fillStyle = tin;
  ctx.beginPath();
  ctx.moveTo(-22, 6);
  ctx.bezierCurveTo(-20, 20, 20, 20, 22, 6);
  ctx.lineTo(18, 4);
  ctx.bezierCurveTo(8, 10, -8, 10, -18, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a3a44";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Tin rim highlight
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-19, 8);
  ctx.bezierCurveTo(-12, 15, 12, 15, 19, 8);
  ctx.stroke();
  // Crimped crust edge — golden dome ring
  const crust = ctx.createLinearGradient(0, -10, 0, 8);
  crust.addColorStop(0, "#ffd884");
  crust.addColorStop(0.55, "#e6a23c");
  crust.addColorStop(1, "#a8641c");
  ctx.fillStyle = crust;
  ctx.beginPath();
  ctx.ellipse(0, 2, 22, 9, 0, Math.PI, 0);
  ctx.bezierCurveTo(18, 8, -18, 8, -22, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4410";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Crimp scallops along the rim
  ctx.fillStyle = "#e6a23c";
  ctx.strokeStyle = "#8a4e14";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 11; i++) {
    const t = i / 11;
    const x = -21 + t * 42;
    const y = -2 + Math.sin(Math.PI * t) * -7;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Inner filling well (darker, behind lattice)
  const fill = ctx.createRadialGradient(-3, -3, 2, 0, -1, 16);
  fill.addColorStop(0, "#e84a3c");
  fill.addColorStop(0.6, "#b81e1a");
  fill.addColorStop(1, "#7a0c10");
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -3, 16, 8, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = fill;
  ctx.fillRect(-18, -14, 36, 24);
  ctx.restore();
  // Lattice strips (golden, woven look) — clipped to filling
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -3, 16, 8, 0, 0, Math.PI * 2);
  ctx.clip();
  const strip = ctx.createLinearGradient(0, -10, 0, 4);
  strip.addColorStop(0, "#ffe6a0");
  strip.addColorStop(1, "#d08a2c");
  ctx.strokeStyle = strip;
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  // diagonal one way
  for (let d = -20; d <= 20; d += 7) {
    ctx.beginPath();
    ctx.moveTo(d - 10, -14);
    ctx.lineTo(d + 10, 8);
    ctx.stroke();
  }
  // diagonal the other way
  for (let d = -20; d <= 20; d += 7) {
    ctx.beginPath();
    ctx.moveTo(d + 10, -14);
    ctx.lineTo(d - 10, 8);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  // strip outlines
  ctx.strokeStyle = "rgba(120,68,16,0.35)";
  ctx.lineWidth = 0.8;
  for (let d = -20; d <= 20; d += 7) {
    ctx.beginPath();
    ctx.moveTo(d - 10, -14);
    ctx.lineTo(d + 10, 8);
    ctx.stroke();
  }
  ctx.restore();
  // Top crust sheen
  ctx.strokeStyle = "rgba(255,250,220,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-13, -8);
  ctx.bezierCurveTo(-6, -12, 6, -12, 13, -8);
  ctx.stroke();
}

function drawSoup(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 21, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Steam (wavy lines rising)
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  [-7, 7].forEach((sx) => {
    ctx.beginPath();
    ctx.moveTo(sx, -2);
    ctx.bezierCurveTo(sx - 5, -8, sx + 5, -14, sx - 3, -20);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(4, -10, -4, -16, 2, -23);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Bowl body
  const bowl = ctx.createLinearGradient(0, 2, 0, 20);
  bowl.addColorStop(0, "#fbfbf6");
  bowl.addColorStop(0.5, "#e2e2da");
  bowl.addColorStop(1, "#a8a8a0");
  ctx.fillStyle = bowl;
  ctx.beginPath();
  ctx.moveTo(-21, 2);
  ctx.bezierCurveTo(-19, 18, 19, 18, 21, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#6a6a62";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Bowl side highlight
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, 5);
  ctx.bezierCurveTo(-14, 13, -8, 16, -2, 16);
  ctx.stroke();
  // Soup surface (top ellipse)
  const surf = ctx.createRadialGradient(-4, -2, 2, 0, 0, 22);
  surf.addColorStop(0, "#ffc864");
  surf.addColorStop(0.6, "#e88a2c");
  surf.addColorStop(1, "#b85e14");
  ctx.fillStyle = surf;
  ctx.beginPath();
  ctx.ellipse(0, 1, 21, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a4a10";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Floating bits (peas / carrots)
  const bits: Array<[number, number, string]> = [
    [-8, 0, "#e8542c"], [4, 2, "#5a9a2e"], [9, -1, "#e8542c"],
    [-3, 3, "#5a9a2e"], [-12, 1, "#f0c020"],
  ];
  bits.forEach(([bx, by, c]) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });
  // Surface sheen
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, -1, 5, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawJamJar(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Glass jar body
  const glass = ctx.createLinearGradient(-12, 0, 12, 0);
  glass.addColorStop(0, "rgba(220,235,235,0.85)");
  glass.addColorStop(0.5, "rgba(180,205,205,0.5)");
  glass.addColorStop(1, "rgba(140,170,170,0.7)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(-13, 16);
  ctx.bezierCurveTo(-13, 21, 13, 21, 13, 16);
  ctx.lineTo(12, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a6a6a";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Jam inside (clipped to jar)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(-13, 16);
  ctx.bezierCurveTo(-13, 21, 13, 21, 13, 16);
  ctx.lineTo(12, -8);
  ctx.closePath();
  ctx.clip();
  const jam = ctx.createLinearGradient(0, -4, 0, 20);
  jam.addColorStop(0, "#e8344a");
  jam.addColorStop(0.6, "#b81632");
  jam.addColorStop(1, "#7a0820");
  ctx.fillStyle = jam;
  ctx.fillRect(-14, -4, 28, 26);
  // jam surface meniscus
  ctx.fillStyle = "#ff5a6e";
  ctx.beginPath();
  ctx.ellipse(0, -4, 13, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // seeds in jam
  ctx.fillStyle = "rgba(90,8,24,0.8)";
  for (let i = 0; i < 9; i++) {
    const sx = -9 + (i * 2.4) + Math.sin(i * 2.1) * 2;
    const sy = 2 + Math.cos(i * 1.6) * 8;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Label (paper rectangle)
  ctx.fillStyle = "#f6efd8";
  ctx.beginPath();
  ctx.rect(-8, 4, 16, 11);
  ctx.fill();
  ctx.strokeStyle = "#b89a5a";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,60,40,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5, 8);
  ctx.lineTo(5, 8);
  ctx.moveTo(-5, 11);
  ctx.lineTo(3, 11);
  ctx.stroke();
  // Glass highlight
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.lineTo(-9, 14);
  ctx.stroke();
  // Cloth-covered lid (gingham dome)
  const lid = ctx.createLinearGradient(0, -16, 0, -6);
  lid.addColorStop(0, "#e85a72");
  lid.addColorStop(1, "#b8324a");
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.bezierCurveTo(-15, -16, 15, -16, 14, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a182e";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // cloth checker pattern
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 0.8;
  [-8, -3, 2, 7].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -14);
    ctx.lineTo(x, -7);
    ctx.stroke();
  });
  [-12, -10].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.lineTo(12, y);
    ctx.stroke();
  });
  // tie string around neck
  ctx.strokeStyle = "#8a6a2a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-13, -6);
  ctx.bezierCurveTo(-6, -4, 6, -4, 13, -6);
  ctx.stroke();
}

function drawCheeseWheel(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 22, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wheel body (rind side)
  const rind = ctx.createLinearGradient(0, 4, 0, 18);
  rind.addColorStop(0, "#f0c84a");
  rind.addColorStop(0.5, "#d8a82c");
  rind.addColorStop(1, "#a87814");
  ctx.fillStyle = rind;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-20, 8);
  ctx.bezierCurveTo(-18, 18, 18, 18, 20, 8);
  ctx.lineTo(20, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5410";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wheel top (yellow disc)
  const top = ctx.createRadialGradient(-5, -3, 3, 0, 0, 22);
  top.addColorStop(0, "#fff0a0");
  top.addColorStop(0.6, "#f4ce4c");
  top.addColorStop(1, "#d8a82c");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9a6e12";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wedge cut removed from front — slice sitting separately, lower-right
  ctx.save();
  ctx.translate(8, 12);
  ctx.rotate(0.15);
  const wedge = ctx.createLinearGradient(0, -6, 0, 6);
  wedge.addColorStop(0, "#fff0a0");
  wedge.addColorStop(1, "#f0c84a");
  ctx.fillStyle = wedge;
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.lineTo(10, -2);
  ctx.lineTo(10, 4);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9a6e12";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // wedge cut face (paler interior)
  ctx.fillStyle = "#fdeeb0";
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.lineTo(10, -2);
  ctx.lineTo(10, -7);
  ctx.lineTo(-12, -1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c89a2c";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // holes in the cut face
  ctx.fillStyle = "rgba(180,140,30,0.55)";
  [[-4, -1], [2, -3], [6, -4], [-8, 1]].forEach(([hx, hy]) => {
    ctx.beginPath();
    ctx.ellipse(hx, hy, 1.6, 1, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Holes on the top surface
  ctx.fillStyle = "rgba(200,158,40,0.6)";
  [[-8, -2, 2.2], [3, -3, 1.8], [-2, 2, 2.4], [9, 1, 1.6], [-12, 2, 1.4]].forEach(([hx, hy, hr]) => {
    ctx.beginPath();
    ctx.ellipse(hx, hy, hr, hr * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Top sheen
  ctx.strokeStyle = "rgba(255,255,230,0.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.bezierCurveTo(-6, -7, 6, -7, 13, -3);
  ctx.stroke();
}

function drawHoneyPot(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 17, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pot body — round ceramic
  const pot = ctx.createRadialGradient(-5, -2, 3, 0, 4, 22);
  pot.addColorStop(0, "#e8b878");
  pot.addColorStop(0.5, "#c08838");
  pot.addColorStop(1, "#7a4c14");
  ctx.fillStyle = pot;
  ctx.beginPath();
  ctx.moveTo(-13, -6);
  ctx.bezierCurveTo(-19, -2, -18, 16, -8, 20);
  ctx.bezierCurveTo(0, 23, 8, 23, 16, 18);
  ctx.bezierCurveTo(20, 10, 19, -2, 13, -6);
  ctx.bezierCurveTo(8, -9, -8, -9, -13, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a2c08";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Pot rim / collar
  const rim = ctx.createLinearGradient(0, -12, 0, -4);
  rim.addColorStop(0, "#d8a858");
  rim.addColorStop(1, "#9a6824");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.ellipse(0, -8, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a2c08";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Honey surface inside rim
  const honey = ctx.createRadialGradient(-3, -9, 1, 0, -8, 12);
  honey.addColorStop(0, "#ffd24a");
  honey.addColorStop(0.7, "#f0a818");
  honey.addColorStop(1, "#c87a0c");
  ctx.fillStyle = honey;
  ctx.beginPath();
  ctx.ellipse(0, -8, 11, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // "HONEY" band label
  ctx.fillStyle = "#f6e8c0";
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.bezierCurveTo(-6, 5, 6, 5, 12, 2);
  ctx.lineTo(12, 10);
  ctx.bezierCurveTo(6, 13, -6, 13, -12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b89a5a";
  ctx.lineWidth = 1;
  ctx.stroke();
  // honeycomb hex on label
  ctx.strokeStyle = "rgba(200,140,20,0.7)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-1, 4.5);
  ctx.lineTo(2, 6);
  ctx.lineTo(2, 9);
  ctx.lineTo(-1, 10.5);
  ctx.lineTo(-4, 9);
  ctx.lineTo(-4, 6);
  ctx.closePath();
  ctx.stroke();
  // Wooden dipper
  ctx.save();
  ctx.translate(7, -10);
  ctx.rotate(0.4);
  ctx.strokeStyle = "#8a5a20";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(2, -16);
  ctx.stroke();
  // dipper grooves (drum head)
  ctx.fillStyle = "#a87436";
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3a10";
  ctx.lineWidth = 0.8;
  [-3, -1, 1, 3].forEach((gy) => {
    ctx.beginPath();
    ctx.moveTo(-4, gy);
    ctx.lineTo(4, gy);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  ctx.restore();
  // Honey drip off the rim
  ctx.fillStyle = "#f5b81c";
  ctx.beginPath();
  ctx.moveTo(-11, -7);
  ctx.bezierCurveTo(-13, -2, -13, 2, -11, 4);
  ctx.bezierCurveTo(-9, 2, -9, -2, -11, -7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,235,150,0.7)";
  ctx.beginPath();
  ctx.ellipse(-11.5, -1, 0.8, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pot highlight
  ctx.fillStyle = "rgba(255,250,220,0.4)";
  ctx.beginPath();
  ctx.ellipse(-7, 4, 2.6, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawCake(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 20, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Plate
  ctx.fillStyle = "#e6e6ec";
  ctx.beginPath();
  ctx.ellipse(0, 20, 20, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a8a8b2";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Cake slice — wedge shape, front face showing layers
  // Front face
  const front = ctx.createLinearGradient(0, -8, 0, 18);
  front.addColorStop(0, "#fff4dc");
  front.addColorStop(1, "#f0d8a0");
  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.moveTo(-16, 16);
  ctx.lineTo(14, 16);
  ctx.lineTo(14, -2);
  ctx.lineTo(-16, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b8945a";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Cream / jam layers on front face
  ctx.fillStyle = "#ff8aa0";
  ctx.fillRect(-16, 2, 30, 3);
  ctx.fillStyle = "#fff0d0";
  ctx.fillRect(-16, 9, 30, 3);
  ctx.strokeStyle = "rgba(180,140,90,0.4)";
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-16, 2, 30, 3);
  ctx.strokeRect(-16, 9, 30, 3);
  // sponge crumb dots
  ctx.fillStyle = "rgba(200,160,100,0.5)";
  for (let i = 0; i < 12; i++) {
    const cx = -14 + (i * 2.6) + Math.sin(i * 2) * 1;
    const cy = (i % 2 === 0) ? -0.5 : 7.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Frosted top — domed icing
  const ice = ctx.createLinearGradient(0, -10, 0, 0);
  ice.addColorStop(0, "#fff8f0");
  ice.addColorStop(1, "#f6d6e0");
  ctx.fillStyle = ice;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.bezierCurveTo(-14, -8, 12, -8, 14, -2);
  ctx.bezierCurveTo(6, -5, -8, -5, -16, -2);
  ctx.closePath();
  ctx.fill();
  // drips of frosting
  ctx.fillStyle = "#fff8f0";
  [-9, -1, 7].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(dx - 3, -3);
    ctx.bezierCurveTo(dx - 3, 2, dx + 3, 2, dx + 3, -3);
    ctx.closePath();
    ctx.fill();
  });
  ctx.strokeStyle = "#e8b8c8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.bezierCurveTo(-14, -8, 12, -8, 14, -2);
  ctx.stroke();
  // Cherry on top
  const cherry = ctx.createRadialGradient(-2, -12, 1, 0, -10, 6);
  cherry.addColorStop(0, "#ff6a6a");
  cherry.addColorStop(0.6, "#d81a2a");
  cherry.addColorStop(1, "#7a0810");
  ctx.fillStyle = cherry;
  ctx.beginPath();
  ctx.arc(-1, -10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a0410";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // cherry highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-3, -12, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // cherry stem
  ctx.strokeStyle = "#5a8a26";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-1, -14);
  ctx.quadraticCurveTo(4, -20, 6, -22);
  ctx.stroke();
}

function drawStew(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 23, 22, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Steam
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  [-6, 8].forEach((sx) => {
    ctx.beginPath();
    ctx.moveTo(sx, -6);
    ctx.bezierCurveTo(sx - 5, -12, sx + 5, -18, sx - 2, -23);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  // Cauldron / cast-iron pot body
  const pot = ctx.createRadialGradient(-6, -2, 3, 0, 4, 24);
  pot.addColorStop(0, "#5a5a64");
  pot.addColorStop(0.5, "#3a3a44");
  pot.addColorStop(1, "#16161c");
  ctx.fillStyle = pot;
  ctx.beginPath();
  ctx.moveTo(-20, -6);
  ctx.bezierCurveTo(-24, 4, -20, 20, -8, 22);
  ctx.bezierCurveTo(0, 24, 8, 24, 12, 22);
  ctx.bezierCurveTo(24, 18, 24, 2, 20, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Pot rim
  ctx.fillStyle = "#48484f";
  ctx.beginPath();
  ctx.ellipse(0, -6, 21, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0e";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Stew surface (bubbling brown)
  const stew = ctx.createRadialGradient(-4, -8, 2, 0, -6, 18);
  stew.addColorStop(0, "#a8682c");
  stew.addColorStop(0.6, "#7a3e14");
  stew.addColorStop(1, "#4a220a");
  ctx.fillStyle = stew;
  ctx.beginPath();
  ctx.ellipse(0, -6, 18, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Chunks (meat / veg) poking up
  const chunks: Array<[number, number, number, string]> = [
    [-9, -7, 3, "#8a4a1c"], [2, -8, 3.2, "#9a5a24"], [9, -6, 2.6, "#c87a30"],
    [-3, -5, 2.2, "#5a8a2e"], [6, -4, 2, "#d8a838"],
  ];
  chunks.forEach(([cx, cy, cr, c]) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cr, cr * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,20,8,0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  // Bubbles
  ctx.fillStyle = "rgba(255,220,170,0.55)";
  [[-12, -6, 1.4], [11, -7, 1.2], [-1, -9, 1], [4, -5, 1.3]].forEach(([bx, by, br]) => {
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  });
  // Handles (loop ears on the pot)
  ctx.strokeStyle = "#16161c";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(-21, 2, 3.4, -0.6, Math.PI + 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(21, 2, 3.4, -Math.PI - 0.6, 0.6);
  ctx.stroke();
  // Pot body highlight
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.bezierCurveTo(-17, 10, -12, 18, -5, 20);
  ctx.stroke();
}

function drawSandwich(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 20, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bottom bread slice
  const bread = ctx.createLinearGradient(0, 10, 0, 20);
  bread.addColorStop(0, "#f0c878");
  bread.addColorStop(1, "#c8923c");
  ctx.fillStyle = bread;
  ctx.beginPath();
  ctx.moveTo(-18, 14);
  ctx.bezierCurveTo(-18, 20, 18, 20, 18, 14);
  ctx.bezierCurveTo(16, 11, -16, 11, -18, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a5e1c";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Cheese layer (yellow, drips)
  ctx.fillStyle = "#ffc83a";
  ctx.beginPath();
  ctx.moveTo(-18, 11);
  ctx.lineTo(18, 11);
  ctx.lineTo(18, 13);
  ctx.lineTo(13, 16);
  ctx.lineTo(6, 12);
  ctx.lineTo(-2, 16);
  ctx.lineTo(-10, 12);
  ctx.lineTo(-16, 16);
  ctx.lineTo(-18, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d89a14";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Tomato slices (red, round)
  ctx.fillStyle = "#e83a2c";
  [[-9, 9], [4, 9], [13, 9]].forEach(([tx, ty]) => {
    ctx.beginPath();
    ctx.ellipse(tx, ty, 5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a01810";
    ctx.lineWidth = 0.9;
    ctx.stroke();
  });
  // Lettuce — ruffled green band
  ctx.fillStyle = "#6cb43a";
  ctx.beginPath();
  ctx.moveTo(-19, 7);
  for (let i = 0; i <= 8; i++) {
    const x = -19 + (i / 8) * 38;
    const y = 4 + (i % 2 === 0 ? 0 : 4);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(19, 8);
  ctx.bezierCurveTo(12, 10, -12, 10, -19, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a6a18";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // lettuce vein highlights
  ctx.strokeStyle = "rgba(180,230,120,0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(14, 6);
  ctx.stroke();
  // Top bread slice (domed bun)
  const top = ctx.createRadialGradient(-5, -6, 3, 0, 0, 22);
  top.addColorStop(0, "#ffd98a");
  top.addColorStop(0.6, "#e0a84a");
  top.addColorStop(1, "#a86e22");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(-18, 3);
  ctx.bezierCurveTo(-20, -12, 20, -12, 18, 3);
  ctx.bezierCurveTo(12, 6, -12, 6, -18, 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a5e1c";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Sesame seeds on the bun
  ctx.fillStyle = "#fff4d8";
  ctx.strokeStyle = "rgba(150,100,30,0.4)";
  ctx.lineWidth = 0.5;
  [[-10, -4], [-2, -7], [6, -5], [11, -1], [-6, -1], [2, -2]].forEach(([sx, sy]) => {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sx * 0.1);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.8, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  // Bun sheen
  ctx.strokeStyle = "rgba(255,250,220,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.bezierCurveTo(-6, -10, 6, -10, 12, -5);
  ctx.stroke();
}

export const ICONS = {
  dish_pie:          { label:"Fruit Pie",    color:"#e6a23c", draw:drawPie },
  dish_soup:         { label:"Soup",         color:"#e88a2c", draw:drawSoup },
  dish_jam_jar:      { label:"Jam Jar",      color:"#b81632", draw:drawJamJar },
  dish_cheese_wheel: { label:"Cheese Wheel", color:"#f4ce4c", draw:drawCheeseWheel },
  dish_honey_pot:    { label:"Honey Pot",    color:"#f0a818", draw:drawHoneyPot },
  dish_cake:         { label:"Cake",         color:"#f6d6e0", draw:drawCake },
  dish_stew:         { label:"Stew",         color:"#7a3e14", draw:drawStew },
  dish_sandwich:     { label:"Sandwich",     color:"#e0a84a", draw:drawSandwich },
};
