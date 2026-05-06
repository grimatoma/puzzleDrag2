// Farm biome tile icon drawing functions
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

export function drawFarmTileIcon(ctx, key) {
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
}
