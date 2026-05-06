// Mine biome tile icon drawing functions
// No imports needed — pure Canvas 2D API drawing.

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

export function drawMineTileIcon(ctx, key) {
  if (key === "stone") {
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
}
