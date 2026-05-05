import { TILE, BIOMES } from "./constants.js";
import { hex } from "./utils.js";

export function rounded(scene, x, y, w, h, r, fill, alpha = 1, stroke = null, sw = 0, sa = 1) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, r);
  if (stroke !== null && sw > 0) {
    g.lineStyle(sw, stroke, sa);
    g.strokeRoundedRect(x, y, w, h, r);
  }
  return g;
}

export function drawCuteVine(scene, x0, y0, width, color = 0x6da53a) {
  const vine = scene.add.graphics();
  vine.lineStyle(4, color, 0.95);
  vine.beginPath();
  const segments = 28;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = x0 + width * t;
    const y = y0 + Math.sin(t * Math.PI * 4) * 7;
    if (i === 0) vine.moveTo(x, y);
    else vine.lineTo(x, y);
  }
  vine.strokePath();
  return vine;
}

// Canvas path helper for rounded rectangles
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function canvasTexture(scene, key, w, h, draw, dpr = 1) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, Math.ceil(w * dpr), Math.ceil(h * dpr));
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  if (dpr !== 1) ctx.scale(dpr, dpr);
  draw(ctx, w, h);
  tex.refresh();
}

// ─── Icon drawing helpers ────────────────────────────────────────────────────

function strokedFill(ctx, fill, stroke, lineWidth = 2.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function dropShadow(ctx, drawFn) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  drawFn();
  ctx.restore();
}

function highlight(ctx, x, y, rx, ry, angle = -0.5, color = "rgba(255,255,255,0.55)") {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Per-resource icon drawing ────────────────────────────────────────────────

export function drawTileIcon(ctx, key) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (key === "hay") {
    // Golden bundle of dried straw tied with twine
    // Outer dark straw (warm brown)
    ctx.strokeStyle = "#5e3a08";
    ctx.lineWidth = 5;
    [-18, -10, -2, 6, 14].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.quadraticCurveTo(x - 2 + i, 0, x - 6 + i * 2, -24);
      ctx.stroke();
    });
    // Mid golden straw
    ctx.strokeStyle = "#d4a020";
    ctx.lineWidth = 3.5;
    [-14, -7, 0, 7, 14].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.quadraticCurveTo(x + 1, 0, x - 4 + i * 2, -22);
      ctx.stroke();
    });
    // Top bright straw highlights
    ctx.strokeStyle = "#ffe890";
    ctx.lineWidth = 1.8;
    [-10, -3, 4, 10].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.quadraticCurveTo(x + 2, -2, x - 2 + i * 2, -20);
      ctx.stroke();
    });
    // Brown twine band
    ctx.fillStyle = "#5e3a08";
    rr(ctx, -22, -3, 44, 11, 4);
    ctx.fill();
    ctx.strokeStyle = "#2a1804";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Twine highlight
    ctx.strokeStyle = "rgba(255,200,120,0.75)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    // Twine knot
    ctx.fillStyle = "#5e3a08";
    ctx.beginPath();
    ctx.arc(-22, 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1804";
    ctx.stroke();
  }

  else if (key === "wheat") {
    // Tall wheat stalk with detailed grains
    // Stalk
    ctx.strokeStyle = "#6b4710";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(0, -12);
    ctx.stroke();
    ctx.strokeStyle = "#a47619";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(0, -12);
    ctx.stroke();
    // Two leaves at base
    ctx.fillStyle = "#8aab2e";
    ctx.strokeStyle = "#4a5c12";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(-12, 12, -18, 4);
    ctx.quadraticCurveTo(-10, 10, 0, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(12, 12, 18, 4);
    ctx.quadraticCurveTo(10, 10, 0, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Wheat head: 4 rows of paired teardrop grains
    for (let row = 0; row < 4; row++) {
      const y = -8 + row * 6;
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(side * (5 - row * 0.5), y);
        ctx.rotate(side * (0.5 - row * 0.06));
        // Grain body
        const grad = ctx.createLinearGradient(-4, -6, 4, 6);
        grad.addColorStop(0, "#fff0a0");
        grad.addColorStop(0.55, "#f4c84a");
        grad.addColorStop(1, "#a07418");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#6b4710";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.ellipse(-1.5, -3, 1.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
    // Top tip awns
    ctx.strokeStyle = "#c89320";
    ctx.lineWidth = 1.5;
    [-4, -2, 0, 2, 4].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(dx, -16);
      ctx.lineTo(dx * 1.4, -26);
      ctx.stroke();
    });
  }

  else if (key === "grain") {
    // Burlap sack with grains spilling out the top
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sack body (trapezoidal w/ rounded bottom)
    const body = ctx.createLinearGradient(0, -10, 0, 24);
    body.addColorStop(0, "#d8a458");
    body.addColorStop(1, "#8e5d24");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(-22, 16);
    ctx.quadraticCurveTo(-22, 24, -14, 24);
    ctx.lineTo(14, 24);
    ctx.quadraticCurveTo(22, 24, 22, 16);
    ctx.lineTo(18, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4a2e0e";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Burlap weave texture
    ctx.strokeStyle = "rgba(74,46,14,0.35)";
    ctx.lineWidth = 0.7;
    for (let y = -4; y < 22; y += 4) {
      ctx.beginPath();
      ctx.moveTo(-20 + (y + 8) * 0.15, y);
      ctx.lineTo(20 - (y + 8) * 0.15, y);
      ctx.stroke();
    }
    for (let x = -16; x <= 16; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.lineTo(x + 1, 22);
      ctx.stroke();
    }
    // Drawstring/rope at neck
    ctx.fillStyle = "#7a4d1a";
    rr(ctx, -16, -12, 32, 7, 3);
    ctx.fill();
    ctx.strokeStyle = "#3e220a";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Spilled grains on top
    ctx.fillStyle = "#f4c84a";
    ctx.strokeStyle = "#7a5210";
    ctx.lineWidth = 0.8;
    [[-8, -16], [-2, -19], [4, -17], [-6, -14], [8, -15], [0, -14]].forEach(([gx, gy]) => {
      ctx.beginPath();
      ctx.ellipse(gx, gy, 2.6, 3.6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    // Highlight on left side of sack
    ctx.fillStyle = "rgba(255,240,200,0.25)";
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.quadraticCurveTo(-19, 6, -17, 18);
    ctx.lineTo(-13, 16);
    ctx.quadraticCurveTo(-14, 6, -11, -4);
    ctx.closePath();
    ctx.fill();
  }

  else if (key === "flour") {
    // Cream-colored cloth sack with stenciled wheat & flour dust
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 23, 22, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sack body
    const body = ctx.createLinearGradient(0, -10, 0, 24);
    body.addColorStop(0, "#fff5dc");
    body.addColorStop(1, "#c9a672");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-16, -8);
    ctx.lineTo(-21, 17);
    ctx.quadraticCurveTo(-21, 24, -14, 24);
    ctx.lineTo(14, 24);
    ctx.quadraticCurveTo(21, 24, 21, 17);
    ctx.lineTo(16, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e4220";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Stenciled wheat icon on front
    ctx.strokeStyle = "rgba(94,66,32,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, 0);
    ctx.stroke();
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 3; i++) {
        const y = 2 + i * 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(s * 4, y - 2, s * 6, y - 5);
        ctx.stroke();
      }
    });
    // Top opened cuff
    ctx.fillStyle = "#e8d3a8";
    ctx.beginPath();
    ctx.moveTo(-17, -8);
    ctx.quadraticCurveTo(-12, -15, 0, -14);
    ctx.quadraticCurveTo(12, -15, 17, -8);
    ctx.lineTo(15, -3);
    ctx.lineTo(-15, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e4220";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // Drawstring tie
    ctx.strokeStyle = "#7a4e1a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.quadraticCurveTo(0, -6, 12, -10);
    ctx.stroke();
    // Flour dust on top
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    [[-10, -16], [-3, -19], [4, -17], [-7, -13], [9, -15], [0, -14], [6, -19]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx, dy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    // Highlight stripe
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(-13, -5);
    ctx.quadraticCurveTo(-17, 8, -15, 20);
    ctx.lineTo(-11, 18);
    ctx.quadraticCurveTo(-12, 8, -9, -5);
    ctx.closePath();
    ctx.fill();
  }

  else if (key === "log") {
    // 3D wooden log lying on its side
    // Body shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(2, 18, 26, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Side body (cylinder)
    const grad = ctx.createLinearGradient(0, -14, 0, 14);
    grad.addColorStop(0, "#a4734a");
    grad.addColorStop(0.5, "#7c4f25");
    grad.addColorStop(1, "#54331a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-22, -14);
    ctx.lineTo(12, -14);
    ctx.quadraticCurveTo(20, -14, 20, -3);
    ctx.lineTo(20, 3);
    ctx.quadraticCurveTo(20, 14, 12, 14);
    ctx.lineTo(-22, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2210";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Bark texture (vertical chunks)
    ctx.strokeStyle = "rgba(58,34,16,0.65)";
    ctx.lineWidth = 1.3;
    [-18, -12, -6, 0, 6].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -12);
      ctx.lineTo(x + 1, 12);
      ctx.stroke();
    });
    // Top highlight
    ctx.strokeStyle = "rgba(255,220,170,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(10, -10);
    ctx.stroke();
    // End cap (right side circle with rings)
    const cap = ctx.createRadialGradient(13, 0, 1, 13, 0, 14);
    cap.addColorStop(0, "#e8b787");
    cap.addColorStop(0.6, "#c08c54");
    cap.addColorStop(1, "#7c5026");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(13, 0, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a2210";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Concentric growth rings
    ctx.strokeStyle = "rgba(58,34,16,0.6)";
    ctx.lineWidth = 1;
    [3, 6, 9].forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(13, 0, r * 0.7, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    // Center pith
    ctx.fillStyle = "#3a2210";
    ctx.beginPath();
    ctx.ellipse(13, 0, 1.2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  else if (key === "plank") {
    // Wooden plank with grain & nails (slight isometric)
    ctx.save();
    ctx.rotate(-0.18);
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    rr(ctx, -25, 13, 50, 8, 3);
    ctx.fill();
    // Body
    const grad = ctx.createLinearGradient(0, -14, 0, 14);
    grad.addColorStop(0, "#e3a268");
    grad.addColorStop(0.5, "#bd7a3c");
    grad.addColorStop(1, "#7e4e1f");
    ctx.fillStyle = grad;
    rr(ctx, -26, -10, 52, 22, 3);
    ctx.fill();
    ctx.strokeStyle = "#3e2410";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Wood grain (wavy lines)
    ctx.strokeStyle = "rgba(62,36,16,0.5)";
    ctx.lineWidth = 1;
    [-5, 0, 5].forEach((y0) => {
      ctx.beginPath();
      ctx.moveTo(-24, y0);
      ctx.bezierCurveTo(-12, y0 - 1.5, 4, y0 + 1.8, 24, y0 - 0.5);
      ctx.stroke();
    });
    // Top edge highlight
    ctx.strokeStyle = "rgba(255,230,180,0.6)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-23, -8);
    ctx.lineTo(23, -8);
    ctx.stroke();
    // Iron nails
    [-16, 16].forEach((nx) => {
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.arc(nx + 0.5, 0.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      // head
      const ng = ctx.createRadialGradient(nx - 0.6, -0.6, 0.4, nx, 0, 3);
      ng.addColorStop(0, "#dadfe4");
      ng.addColorStop(1, "#3a4248");
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(nx, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1a1f24";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
    ctx.restore();
  }

  else if (key === "beam") {
    // Thick dark wooden beam with iron brackets
    ctx.save();
    ctx.rotate(-0.15);
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    rr(ctx, -26, 14, 52, 8, 4);
    ctx.fill();
    // Body
    const grad = ctx.createLinearGradient(0, -16, 0, 16);
    grad.addColorStop(0, "#8e5b2b");
    grad.addColorStop(0.5, "#5e3a18");
    grad.addColorStop(1, "#33200c");
    ctx.fillStyle = grad;
    rr(ctx, -26, -14, 52, 28, 3);
    ctx.fill();
    ctx.strokeStyle = "#1a0e04";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Wood grain
    ctx.strokeStyle = "rgba(20,12,4,0.55)";
    ctx.lineWidth = 1.1;
    [-8, -3, 3, 8].forEach((y0) => {
      ctx.beginPath();
      ctx.moveTo(-24, y0);
      ctx.bezierCurveTo(-10, y0 - 1.6, 8, y0 + 2, 24, y0 - 0.6);
      ctx.stroke();
    });
    // End grain on right edge
    ctx.fillStyle = "rgba(40,20,8,0.7)";
    rr(ctx, 22, -13, 4, 26, 1);
    ctx.fill();
    // Iron brackets at both ends
    [-1, 1].forEach((side) => {
      const x = side * 18;
      const bg = ctx.createLinearGradient(x, -14, x, 14);
      bg.addColorStop(0, "#7a8590");
      bg.addColorStop(0.5, "#3e464c");
      bg.addColorStop(1, "#1a1f24");
      ctx.fillStyle = bg;
      rr(ctx, x - 4, -15, 8, 30, 1);
      ctx.fill();
      ctx.strokeStyle = "#0a0d10";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Rivets
      [-9, 0, 9].forEach((ry) => {
        const rg = ctx.createRadialGradient(x - 0.6, ry - 0.6, 0.3, x, ry, 2);
        rg.addColorStop(0, "#dadfe4");
        rg.addColorStop(1, "#222730");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, ry, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    // Top edge highlight
    ctx.strokeStyle = "rgba(255,210,160,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-22, -12);
    ctx.lineTo(22, -12);
    ctx.stroke();
    ctx.restore();
  }

  else if (key === "berry") {
    // Cluster of 3 glossy berries with stem and leaf
    // Stem
    ctx.strokeStyle = "#5a3a18";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-2, -22);
    ctx.quadraticCurveTo(0, -16, -3, -10);
    ctx.stroke();
    // Leaf
    ctx.fillStyle = "#5a8a26";
    ctx.beginPath();
    ctx.moveTo(-2, -22);
    ctx.bezierCurveTo(8, -24, 16, -18, 12, -10);
    ctx.bezierCurveTo(6, -12, 0, -16, -2, -22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#33550f";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Leaf vein
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-1, -21);
    ctx.quadraticCurveTo(7, -18, 11, -12);
    ctx.stroke();
    // Three berries (back, left, right)
    const berries = [
      { x: 0, y: -3, r: 9, dark: "#6a1a3a", light: "#e58aa8" },
      { x: -8, y: 8, r: 9.5, dark: "#6a1a3a", light: "#d97798" },
      { x: 8, y: 8, r: 9.5, dark: "#6a1a3a", light: "#d97798" },
    ];
    berries.forEach((b) => {
      const grad = ctx.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.4, 1, b.x, b.y, b.r);
      grad.addColorStop(0, b.light);
      grad.addColorStop(0.55, "#a3486a");
      grad.addColorStop(1, b.dark);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3a0a20";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Specular highlight
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.ellipse(b.x - b.r * 0.4, b.y - b.r * 0.5, 2.6, 3.4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // Calyx dot at top
      ctx.fillStyle = "#3a0a20";
      ctx.beginPath();
      ctx.arc(b.x, b.y - b.r * 0.85, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  else if (key === "jam") {
    // Glass jar of berry jam with lid and label
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 24, 20, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Jar glass body
    const glass = ctx.createLinearGradient(-18, 0, 18, 0);
    glass.addColorStop(0, "rgba(255,255,255,0.18)");
    glass.addColorStop(0.5, "rgba(255,255,255,0.05)");
    glass.addColorStop(1, "rgba(0,0,0,0.15)");
    ctx.fillStyle = "#f2eee5";
    rr(ctx, -16, -10, 32, 34, 5);
    ctx.fill();
    // Jam fill (top 3/4)
    const jam = ctx.createLinearGradient(0, -8, 0, 22);
    jam.addColorStop(0, "#e0568c");
    jam.addColorStop(0.6, "#a72c5e");
    jam.addColorStop(1, "#5e1638");
    ctx.fillStyle = jam;
    rr(ctx, -14, -6, 28, 28, 3);
    ctx.fill();
    // Bubbles in jam
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    [[-7, 0, 1.6], [4, 6, 1.2], [-4, 12, 1.0], [7, 14, 1.4], [0, 4, 0.9]].forEach(([bx, by, br]) => {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    });
    // Glass overlay
    ctx.fillStyle = glass;
    rr(ctx, -16, -10, 32, 34, 5);
    ctx.fill();
    // Glass border
    ctx.strokeStyle = "#3a3026";
    ctx.lineWidth = 2;
    rr(ctx, -16, -10, 32, 34, 5);
    ctx.stroke();
    // Glass left highlight
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-13, -4);
    ctx.lineTo(-13, 18);
    ctx.stroke();
    // Lid (golden)
    const lid = ctx.createLinearGradient(0, -22, 0, -10);
    lid.addColorStop(0, "#ffe39a");
    lid.addColorStop(0.5, "#d4a236");
    lid.addColorStop(1, "#7a5410");
    ctx.fillStyle = lid;
    rr(ctx, -18, -22, 36, 14, 3);
    ctx.fill();
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Lid groove
    ctx.strokeStyle = "rgba(58,36,16,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-17, -12);
    ctx.lineTo(17, -12);
    ctx.stroke();
    // Lid highlight
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-15, -19);
    ctx.lineTo(13, -19);
    ctx.stroke();
    // Label (cream rectangle with berry icon)
    ctx.fillStyle = "#f7eccd";
    rr(ctx, -10, 6, 20, 12, 2);
    ctx.fill();
    ctx.strokeStyle = "#7a5210";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Tiny berry on label
    ctx.fillStyle = "#a72c5e";
    ctx.beginPath();
    ctx.arc(-3, 12, 2, 0, Math.PI * 2);
    ctx.arc(2, 12, 2, 0, Math.PI * 2);
    ctx.fill();
    // leaf
    ctx.fillStyle = "#5a8a26";
    ctx.beginPath();
    ctx.ellipse(0, 9, 2, 1, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  else if (key === "egg") {
    // Glossy speckled egg with strong outline (its tile color is also cream,
    // so we lean on a darker outline + warmer shading to keep contrast).
    // Drop shadow on the tile beneath the egg
    ctx.fillStyle = "rgba(40,28,10,0.35)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body with stronger gradient (warmer mid-tones for contrast)
    const grad = ctx.createRadialGradient(-6, -10, 2, 0, 0, 28);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.55, "#f7e2b0");
    grad.addColorStop(1, "#8a6a28");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3e2a0e";
    ctx.lineWidth = 2.6;
    ctx.stroke();
    // Inner shading band (warm sepia for definition)
    ctx.strokeStyle = "rgba(140,90,30,0.4)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(2, 6, 14, 18, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    // Speckles
    ctx.fillStyle = "rgba(80,52,12,0.85)";
    [[-2, -8, 1.6], [5, -2, 1.4], [-7, 4, 1.8], [3, 10, 1.5], [-3, 14, 1.2], [8, 6, 1.2], [-9, -3, 1.2], [6, -12, 1.1]].forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, sr * 0.8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
    // Specular highlight
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(-7, -12, 5, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(-9, -5, 1.5, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  else if (key === "stone") {
    // Faceted gray rock with crevices
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body (irregular polygon)
    const grad = ctx.createLinearGradient(0, -22, 0, 22);
    grad.addColorStop(0, "#cfd5da");
    grad.addColorStop(0.5, "#9da3a8");
    grad.addColorStop(1, "#5e6469");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-22, 5);
    ctx.lineTo(-18, -16);
    ctx.lineTo(-2, -22);
    ctx.lineTo(15, -19);
    ctx.lineTo(24, -2);
    ctx.lineTo(20, 18);
    ctx.lineTo(-2, 22);
    ctx.lineTo(-18, 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a3e44";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Facet lines (interior cracks)
    ctx.strokeStyle = "rgba(58,62,68,0.65)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-2, -22);
    ctx.lineTo(-6, -2);
    ctx.lineTo(-22, 5);
    ctx.moveTo(-6, -2);
    ctx.lineTo(15, -19);
    ctx.moveTo(-6, -2);
    ctx.lineTo(20, 18);
    ctx.moveTo(-6, -2);
    ctx.lineTo(-2, 22);
    ctx.stroke();
    // Top facet highlights
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(-18, -16);
    ctx.lineTo(-2, -22);
    ctx.lineTo(-6, -2);
    ctx.closePath();
    ctx.fill();
    // Texture dots
    ctx.fillStyle = "rgba(58,62,68,0.55)";
    [[2, -10], [10, 0], [-10, 8], [14, 10], [-14, -2]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx, dy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  else if (key === "cobble") {
    // Four cobblestones in 2x2 pattern with mortar
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    rr(ctx, -22, 19, 44, 6, 3);
    ctx.fill();
    // Mortar background
    ctx.fillStyle = "#5e6469";
    rr(ctx, -22, -22, 44, 44, 4);
    ctx.fill();
    // Four cobblestones
    const stones = [
      [-11, -11, 18, 18],
      [11, -10, 18, 16],
      [-11, 9, 18, 16],
      [10, 10, 16, 17],
    ];
    stones.forEach(([cx, cy, cw, ch], i) => {
      ctx.save();
      ctx.translate(cx, cy);
      const grad = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
      grad.addColorStop(0, "#e0e5ea");
      grad.addColorStop(0.5, "#bbc1c6");
      grad.addColorStop(1, "#7e858a");
      ctx.fillStyle = grad;
      // slight rotation per stone
      const angle = (i % 2 === 0 ? -0.05 : 0.06);
      ctx.rotate(angle);
      rr(ctx, -cw / 2, -ch / 2, cw, ch, 3);
      ctx.fill();
      ctx.strokeStyle = "#3a3e44";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // Top-left highlight
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-cw / 2 + 2, -ch / 2 + 1);
      ctx.lineTo(cw / 2 - 3, -ch / 2 + 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-cw / 2 + 1, -ch / 2 + 2);
      ctx.lineTo(-cw / 2 + 1, ch / 2 - 3);
      ctx.stroke();
      // Speckle texture
      ctx.fillStyle = "rgba(58,62,68,0.5)";
      [[-3, -2], [2, 3], [3, -3], [-3, 4]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(dx, dy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    });
    // Outer border
    ctx.strokeStyle = "#1f2326";
    ctx.lineWidth = 2;
    rr(ctx, -22, -22, 44, 44, 4);
    ctx.stroke();
  }

  else if (key === "block") {
    // Polished isometric stone block with engraving
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Top face (parallelogram)
    const top = ctx.createLinearGradient(0, -22, 0, -2);
    top.addColorStop(0, "#cfd5da");
    top.addColorStop(1, "#7c8388");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(0, -18);
    ctx.lineTo(18, -2);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a1d20";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Left face
    const left = ctx.createLinearGradient(-18, 0, 0, 0);
    left.addColorStop(0, "#9da3a8");
    left.addColorStop(1, "#4e5358");
    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(0, 6);
    ctx.lineTo(0, 22);
    ctx.lineTo(-18, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right face
    const right = ctx.createLinearGradient(0, 0, 18, 0);
    right.addColorStop(0, "#7c8388");
    right.addColorStop(1, "#3a3e44");
    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.lineTo(0, 6);
    ctx.lineTo(0, 22);
    ctx.lineTo(18, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Top-edge highlight
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-17, -2);
    ctx.lineTo(0, -17);
    ctx.lineTo(17, -2);
    ctx.stroke();
    // Engraved chevron on top
    ctx.strokeStyle = "rgba(40,42,46,0.65)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-7, -5);
    ctx.lineTo(0, -10);
    ctx.lineTo(7, -5);
    ctx.moveTo(-5, -2);
    ctx.lineTo(0, -7);
    ctx.lineTo(5, -2);
    ctx.stroke();
  }

  else if (key === "ore") {
    // Rocky chunk with bright copper/gold metal veins
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body (irregular)
    const grad = ctx.createLinearGradient(0, -22, 0, 22);
    grad.addColorStop(0, "#bca5a5");
    grad.addColorStop(0.5, "#7a6464");
    grad.addColorStop(1, "#3e2e2e");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-21, 4);
    ctx.lineTo(-16, -17);
    ctx.lineTo(2, -22);
    ctx.lineTo(18, -14);
    ctx.lineTo(23, 2);
    ctx.lineTo(15, 19);
    ctx.lineTo(-6, 22);
    ctx.lineTo(-19, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a1a1a";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Facet shading
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(-16, -17);
    ctx.lineTo(2, -22);
    ctx.lineTo(-2, -6);
    ctx.closePath();
    ctx.fill();
    // Copper/gold veins running through
    const vein = ctx.createLinearGradient(-20, 0, 20, 0);
    vein.addColorStop(0, "#d97a2b");
    vein.addColorStop(0.5, "#ffd34c");
    vein.addColorStop(1, "#a85614");
    ctx.fillStyle = vein;
    ctx.beginPath();
    ctx.moveTo(-18, -4);
    ctx.bezierCurveTo(-6, -10, 6, 4, 20, -2);
    ctx.lineTo(20, 2);
    ctx.bezierCurveTo(6, 8, -6, -6, -18, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7a4010";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Vein highlight
    ctx.strokeStyle = "rgba(255,250,200,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-16, -3);
    ctx.bezierCurveTo(-4, -8, 4, 4, 18, -1);
    ctx.stroke();
    // Sparkly mineral specks
    ctx.fillStyle = "#ffe890";
    [[8, 8], [-10, 12], [4, -14], [-14, -8], [14, -6]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  else if (key === "ingot") {
    // 3D metallic silver ingot bar with stamp
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    rr(ctx, -22, 14, 44, 6, 3);
    ctx.fill();
    // Bottom (right) face
    ctx.fillStyle = "#7a8088";
    ctx.beginPath();
    ctx.moveTo(-22, 14);
    ctx.lineTo(-18, 10);
    ctx.lineTo(20, 10);
    ctx.lineTo(22, 14);
    ctx.closePath();
    ctx.fill();
    // Right face
    ctx.fillStyle = "#9aa0a8";
    ctx.beginPath();
    ctx.moveTo(20, 10);
    ctx.lineTo(22, 14);
    ctx.lineTo(22, 14);
    ctx.lineTo(22, 6);
    ctx.lineTo(18, 4);
    ctx.closePath();
    ctx.fill();
    // Top face (trapezoidal)
    const top = ctx.createLinearGradient(0, -10, 0, 10);
    top.addColorStop(0, "#fafcff");
    top.addColorStop(0.4, "#dadfe4");
    top.addColorStop(1, "#8a909a");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(-22, 14);
    ctx.lineTo(-18, 10);
    ctx.lineTo(-14, -8);
    ctx.lineTo(14, -8);
    ctx.lineTo(18, 10);
    ctx.lineTo(22, 14);
    ctx.lineTo(20, 14);
    ctx.lineTo(-20, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a3036";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Top of ingot
    const topFace = ctx.createLinearGradient(0, -14, 0, 0);
    topFace.addColorStop(0, "#fcffff");
    topFace.addColorStop(0.5, "#e0e5ea");
    topFace.addColorStop(1, "#a4aab2");
    ctx.fillStyle = topFace;
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(-18, -14);
    ctx.lineTo(18, -14);
    ctx.lineTo(14, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Top edge highlight
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-16, -12);
    ctx.lineTo(16, -12);
    ctx.stroke();
    // Stamp on top (anvil/hammer cross)
    ctx.strokeStyle = "rgba(40,46,52,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 4, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3.5, 0.5);
    ctx.lineTo(3.5, 7.5);
    ctx.moveTo(3.5, 0.5);
    ctx.lineTo(-3.5, 7.5);
    ctx.stroke();
  }

  else if (key === "coal") {
    // Lumpy black coal with cracks and highlights
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body (jagged shape)
    const grad = ctx.createLinearGradient(0, -22, 0, 22);
    grad.addColorStop(0, "#4a4a52");
    grad.addColorStop(0.5, "#1c1c20");
    grad.addColorStop(1, "#000000");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-22, 4);
    ctx.lineTo(-14, -14);
    ctx.lineTo(-2, -22);
    ctx.lineTo(12, -19);
    ctx.lineTo(22, -7);
    ctx.lineTo(24, 8);
    ctx.lineTo(15, 21);
    ctx.lineTo(-1, 23);
    ctx.lineTo(-16, 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0a0a0c";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Inner facet edges (cracks)
    ctx.strokeStyle = "rgba(80,80,90,0.7)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2, -22);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-22, 4);
    ctx.moveTo(-6, -4);
    ctx.lineTo(12, -19);
    ctx.moveTo(-6, -4);
    ctx.lineTo(22, -7);
    ctx.moveTo(-6, -4);
    ctx.lineTo(15, 21);
    ctx.moveTo(-6, -4);
    ctx.lineTo(-1, 23);
    ctx.stroke();
    // Top facet highlight
    ctx.fillStyle = "rgba(140,140,150,0.4)";
    ctx.beginPath();
    ctx.moveTo(-14, -14);
    ctx.lineTo(-2, -22);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    // Glossy specular dots
    ctx.fillStyle = "rgba(200,200,220,0.7)";
    [[-8, -10], [4, -12], [10, 4], [-12, 8]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  else if (key === "coke") {
    // Refined hexagonal coke briquette with red glow
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hexagon
    const hex6 = (rad) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };
    // Body
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
    grad.addColorStop(0, "#7a7a86");
    grad.addColorStop(0.6, "#3a3a44");
    grad.addColorStop(1, "#1a1a20");
    ctx.fillStyle = grad;
    hex6(22);
    ctx.fill();
    ctx.strokeStyle = "#0a0a0e";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Inner hexagon
    hex6(14);
    ctx.fillStyle = "#2a2a32";
    ctx.fill();
    ctx.strokeStyle = "rgba(160,160,180,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Cracks with red ember glow
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
    glow.addColorStop(0, "rgba(255,160,40,0.95)");
    glow.addColorStop(0.5, "rgba(220,80,20,0.55)");
    glow.addColorStop(1, "rgba(60,10,0,0)");
    ctx.fillStyle = glow;
    hex6(13);
    ctx.fill();
    // Crack lines
    ctx.strokeStyle = "#ffa040";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(2, -2);
    ctx.lineTo(-3, 5);
    ctx.lineTo(7, 9);
    ctx.stroke();
    ctx.strokeStyle = "#ffe390";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(2, -2);
    ctx.lineTo(-3, 5);
    ctx.lineTo(7, 9);
    ctx.stroke();
    // Top edge highlight
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-10, -19);
    ctx.lineTo(10, -19);
    ctx.stroke();
  }

  else if (key === "gem") {
    // Cut crystal gem with multiple facets
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 24, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(22, -10);
    ctx.lineTo(14, 22);
    ctx.lineTo(-14, 22);
    ctx.lineTo(-22, -10);
    ctx.closePath();
    const body = ctx.createLinearGradient(-20, -20, 20, 22);
    body.addColorStop(0, "#e0fbff");
    body.addColorStop(0.4, "#65e5ff");
    body.addColorStop(1, "#0a8aaa");
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = "#0a4a5a";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Facet lines
    ctx.strokeStyle = "rgba(20,80,100,0.7)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-22, -10);
    ctx.lineTo(-8, -6);
    ctx.lineTo(0, -26);
    ctx.moveTo(0, -26);
    ctx.lineTo(8, -6);
    ctx.lineTo(22, -10);
    ctx.moveTo(-8, -6);
    ctx.lineTo(-14, 22);
    ctx.moveTo(8, -6);
    ctx.lineTo(14, 22);
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.moveTo(-8, -6);
    ctx.lineTo(0, 22);
    ctx.moveTo(8, -6);
    ctx.lineTo(0, 22);
    ctx.stroke();
    // Top facet bright highlight
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(0, -26);
    ctx.lineTo(8, -6);
    ctx.closePath();
    ctx.fill();
    // Edge highlight
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(0, -25);
    ctx.stroke();
    // Sparkle in upper facet
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-2, -16, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(8, 6, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  else if (key === "cutgem") {
    // Brilliant round-cut gem viewed from above with star burst
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Outer octagonal girdle
    const girdle = (rad) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };
    const body = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.4, "#a3f0ff");
    body.addColorStop(1, "#1686a3");
    ctx.fillStyle = body;
    girdle(24);
    ctx.fill();
    ctx.strokeStyle = "#0a4a5a";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Middle octagon
    girdle(15);
    ctx.fillStyle = "rgba(180,240,255,0.7)";
    ctx.fill();
    ctx.strokeStyle = "rgba(20,80,100,0.7)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Crown facets (8 triangles from center to edge)
    ctx.strokeStyle = "rgba(20,80,100,0.7)";
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const x = Math.cos(a) * 24;
      const y = Math.sin(a) * 24;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // Star burst sparkle in center
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 2;
    [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].forEach((a) => {
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * 8, -Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.stroke();
    });
    // Center bright dot
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    // Off-center sparkles
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    [[-12, -8, 1.4], [10, 12, 1.6], [14, -10, 1.2]].forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  else if (key === "gold") {
    // Irregular gold nugget (NOT a circle)
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nugget body (lumpy organic shape)
    const grad = ctx.createRadialGradient(-6, -10, 2, 0, 0, 26);
    grad.addColorStop(0, "#fff8b8");
    grad.addColorStop(0.4, "#ffd34c");
    grad.addColorStop(0.8, "#c08a18");
    grad.addColorStop(1, "#7a4f08");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.bezierCurveTo(-22, -14, -10, -22, 2, -22);
    ctx.bezierCurveTo(14, -22, 18, -14, 22, -10);
    ctx.bezierCurveTo(26, -2, 22, 8, 18, 14);
    ctx.bezierCurveTo(14, 22, 0, 24, -8, 22);
    ctx.bezierCurveTo(-18, 18, -24, 10, -22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e3a08";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Inner divots/facets (lumpy gold has dimples)
    ctx.fillStyle = "rgba(122,79,8,0.55)";
    [[8, -2, 4, 3], [-8, 6, 5, 3.5], [4, 12, 3.5, 2.5], [-12, -8, 3, 2.5]].forEach(([dx, dy, drx, dry]) => {
      ctx.beginPath();
      ctx.ellipse(dx, dy, drx, dry, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
    // Bright highlights/specular
    ctx.fillStyle = "rgba(255,255,200,0.85)";
    ctx.beginPath();
    ctx.ellipse(-8, -12, 5, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,230,0.6)";
    ctx.beginPath();
    ctx.ellipse(-12, -6, 1.5, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Smaller scattered shine spots
    ctx.fillStyle = "rgba(255,255,180,0.85)";
    [[10, -8, 1.4], [14, 4, 1.2], [-2, 16, 1.0], [6, -16, 0.9]].forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    });
    // Edge gloss arc
    ctx.strokeStyle = "rgba(255,255,200,0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-4, -10, 14, Math.PI * 1.1, Math.PI * 1.55);
    ctx.stroke();
  }

  else {
    // Generic glyph fallback for any resource without a custom drawing
    let res = null;
    for (const biome of Object.values(BIOMES)) {
      res = biome.resources.find((r) => r.key === key);
      if (res) break;
    }
    if (res) {
      ctx.fillStyle = hex(res.dark);
      ctx.font = 'bold 36px "Newsreader", "Times New Roman", serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(res.glyph, 0, 2);
    }
  }
}

// ─── Tile + ambient texture generation ───────────────────────────────────────

export function makeTextures(scene) {
  const dpr = scene.registry.get("dpr") || 1;
  Object.values(BIOMES).forEach((biome) => {
    biome.resources.forEach((r) => {
      [false, true].forEach((selected) => {
        canvasTexture(scene, `tile_${r.key}${selected ? "_sel" : ""}`, TILE, TILE, (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = "rgba(0,0,0,.22)";
          ctx.beginPath();
          ctx.ellipse(w / 2 + 2, h - 14, 26, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          if (selected) {
            // Outer glow ring
            rr(ctx, 3, 1, w - 6, h - 6, 16);
            ctx.fillStyle = "rgba(255,160,0,.35)";
            ctx.fill();
          }
          rr(ctx, 7, 5, w - 14, h - 14, 14);
          // Subtle radial backing for the icon tile
          const tileGrad = ctx.createRadialGradient(w / 2 - 8, h / 2 - 12, 4, w / 2, h / 2, w / 2);
          const baseColor = hex(r.color);
          tileGrad.addColorStop(0, lighten(baseColor, 0.25));
          tileGrad.addColorStop(1, baseColor);
          ctx.fillStyle = tileGrad;
          ctx.fill();
          if (selected) {
            ctx.lineWidth = 7;
            ctx.strokeStyle = "#ffb300";
            ctx.stroke();
            // Inner highlight line
            rr(ctx, 11, 9, w - 22, h - 22, 11);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255,240,180,.65)";
            ctx.stroke();
          } else {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(255,255,255,.32)";
            ctx.stroke();
          }
          ctx.save();
          ctx.translate(w / 2, h / 2);
          drawTileIcon(ctx, r.key);
          ctx.restore();
        }, dpr);
      });
    });
  });

  canvasTexture(scene, "spark", 72, 72, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    // Soft glow halo
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    glow.addColorStop(0, "rgba(255,230,80,.85)");
    glow.addColorStop(1, "rgba(255,160,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    // Star body
    ctx.fillStyle = "#ffd43b";
    ctx.strokeStyle = "#fffde0";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? 28 : 12;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Bright center dot
    ctx.fillStyle = "#fffde0";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }, dpr);

  // Small twinkle sprite used for premium-tile shimmer animation
  canvasTexture(scene, "twinkle", 56, 56, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    // Soft halo
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 24);
    glow.addColorStop(0, "rgba(255,255,255,0.95)");
    glow.addColorStop(0.4, "rgba(255,250,200,0.6)");
    glow.addColorStop(1, "rgba(255,200,80,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    // 4-point star (like a sparkle/twinkle)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(3, -3);
    ctx.lineTo(22, 0);
    ctx.lineTo(3, 3);
    ctx.lineTo(0, 22);
    ctx.lineTo(-3, 3);
    ctx.lineTo(-22, 0);
    ctx.lineTo(-3, -3);
    ctx.closePath();
    ctx.fill();
    // Center bright dot
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }, dpr);

  // Soft glint/sweep used for the periodic flash on tiles
  canvasTexture(scene, "glint", 80, 80, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    const grad = ctx.createLinearGradient(-30, 0, 30, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.7)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-40, -8, 80, 16);
    ctx.restore();
  }, dpr);

  canvasTexture(scene, "season_flower", 42, 42, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.ellipse(0, -10, 6, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }, dpr);

  canvasTexture(scene, "season_sun", 42, 42, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = "#f1a91f";
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffd34c";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  }, dpr);

  canvasTexture(scene, "season_leaf", 42, 42, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = "#d97a2b";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.bezierCurveTo(16, -11, 15, 10, 0, 18);
    ctx.bezierCurveTo(-16, 10, -15, -11, 0, -16);
    ctx.fill();
    ctx.strokeStyle = "#8b4a12";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 14);
    ctx.stroke();
  }, dpr);

  canvasTexture(scene, "season_snow", 42, 42, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = "#eefbff";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * i);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);
      ctx.stroke();
      ctx.restore();
    }
  }, dpr);
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function lighten(hexColor, amt) {
  // hexColor is "#rrggbb"
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amt));
  const lg = Math.min(255, Math.round(g + (255 - g) * amt));
  const lb = Math.min(255, Math.round(b + (255 - b) * amt));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
