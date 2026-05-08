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
  if (key === "grass_hay") {
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

  else if (key === "grain_wheat") {
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

  else if (key === "grain_flour") {
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

  else if (key === "wood_log") {
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

  else if (key === "wood_plank") {
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

  else if (key === "wood_beam") {
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

  else if (key === "berry_jam") {
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

  else if (key === "bird_egg") {
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

  else if (key === "grass_meadow") {
    // Lush thick meadow grass — long bowing blades, denser & greener than hay,
    // with a small wildflower nestled at the base.
    // Soil mound shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dark base blades
    ctx.strokeStyle = "#234012";
    ctx.lineWidth = 4.5;
    [-18, -10, -2, 6, 14].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.bezierCurveTo(x + 4 - i * 2, 6, x - 6 + i * 3, -8, x - 10 + i * 4, -22);
      ctx.stroke();
    });
    // Mid bright-green blades
    ctx.strokeStyle = "#5c9c2e";
    ctx.lineWidth = 3.2;
    [-15, -7, 1, 9, 16].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.bezierCurveTo(x + 2, 4, x - 4 + i * 2, -10, x - 8 + i * 3, -22);
      ctx.stroke();
    });
    // Highlight blades
    ctx.strokeStyle = "#b6e068";
    ctx.lineWidth = 1.5;
    [-12, -4, 4, 12].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.bezierCurveTo(x + 2, 2, x - 2 + i * 2, -8, x - 4 + i * 3, -20);
      ctx.stroke();
    });
    // Tiny wildflower at base (white petals + yellow center)
    ctx.fillStyle = "#fffbe0";
    [[-7, -2], [-4, -4], [-10, -4], [-7, -6], [-4, -1]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = "#7a8a30";
    ctx.lineWidth = 0.8;
    [[-7, -2], [-4, -4], [-10, -4], [-7, -6], [-4, -1]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = "#ffd248";
    ctx.beginPath();
    ctx.arc(-7, -3, 1.6, 0, Math.PI * 2);
    ctx.fill();
    // Soil base
    ctx.fillStyle = "#5a3a18";
    ctx.beginPath();
    ctx.ellipse(0, 24, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  else if (key === "grass_spiky") {
    // Hardy thorny spiky grass — short rigid blades with prominent thorns.
    // Soil shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Outer dark spikes (sawtooth fan)
    ctx.fillStyle = "#3d4a14";
    ctx.strokeStyle = "#1f2a08";
    ctx.lineWidth = 1.5;
    const outerSpikes = [
      [-22, 20, -16, -22],
      [-14, 22, -10, -20],
      [-6, 22, -4, -24],
      [2, 22, 4, -24],
      [10, 22, 12, -20],
      [18, 20, 16, -22],
    ];
    outerSpikes.forEach(([x1, y1, xt, yt]) => {
      ctx.beginPath();
      ctx.moveTo(x1 - 4, y1);
      ctx.lineTo(x1 + 4, y1);
      ctx.lineTo(xt, yt);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    // Mid-tone narrower spikes layered in front
    ctx.fillStyle = "#83a235";
    ctx.strokeStyle = "#3a4818";
    ctx.lineWidth = 1.2;
    const midSpikes = [
      [-18, 18, -14, -16],
      [-10, 20, -8, -16],
      [-2, 20, 0, -20],
      [6, 20, 8, -16],
      [14, 18, 12, -16],
    ];
    midSpikes.forEach(([x1, y1, xt, yt]) => {
      ctx.beginPath();
      ctx.moveTo(x1 - 3, y1);
      ctx.lineTo(x1 + 3, y1);
      ctx.lineTo(xt, yt);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    // Thorn highlights along centre spike
    ctx.fillStyle = "#c8de72";
    [-14, -4, 6, 14].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x - 1, -8 - i);
      ctx.lineTo(x + 1, -8 - i);
      ctx.lineTo(x, -16 - i * 2);
      ctx.closePath();
      ctx.fill();
    });
    // Side thorn protrusions
    ctx.strokeStyle = "#1f2a08";
    ctx.lineWidth = 1.4;
    [[-8, -4, -14, -6], [4, -4, 10, -6], [-10, 4, -16, 2], [6, 4, 12, 2]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    // Soil base
    ctx.fillStyle = "#5a3a18";
    ctx.beginPath();
    ctx.ellipse(0, 24, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  else if (key === "bird_turkey") {
    // Plump tom turkey with fanned tail feathers.
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 20, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fanned tail feathers — three layers, alternating colors
    const tailColors = ["#5a2f10", "#8a4a18", "#c08038", "#e8b048"];
    for (let layer = 0; layer < 4; layer++) {
      ctx.fillStyle = tailColors[layer];
      ctx.strokeStyle = "#2a1408";
      ctx.lineWidth = 1.2;
      const r = 22 - layer * 3;
      const startA = -Math.PI * 0.95;
      const endA   = -Math.PI * 0.05;
      const steps = 7 - layer;
      for (let i = 0; i < steps; i++) {
        const a = startA + (i / (steps - 1)) * (endA - startA);
        ctx.save();
        ctx.translate(0, 8);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.55, 3.2 - layer * 0.2, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Feather quill highlight
        ctx.strokeStyle = "rgba(255,230,170,0.5)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.95);
        ctx.lineTo(0, -r * 0.2);
        ctx.stroke();
        ctx.strokeStyle = "#2a1408";
        ctx.lineWidth = 1.2;
        ctx.restore();
      }
    }
    // Body (rounded brown egg-shape)
    const bodyGrad = ctx.createRadialGradient(-4, 4, 2, 0, 8, 16);
    bodyGrad.addColorStop(0, "#7a4a18");
    bodyGrad.addColorStop(1, "#3a1f08");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a0a04";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Breast highlight
    ctx.fillStyle = "rgba(220,150,60,0.35)";
    ctx.beginPath();
    ctx.ellipse(-3, 6, 5, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = "#8a4a1a";
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a0a04";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // Beak
    ctx.fillStyle = "#f6c64a";
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.lineTo(11, -2);
    ctx.lineTo(5, -1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5e3a08";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Wattle (red dangly bit)
    ctx.fillStyle = "#c8242a";
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.quadraticCurveTo(8, 2, 4, 4);
    ctx.quadraticCurveTo(2, 2, 4, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5a0810";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Eye
    ctx.fillStyle = "#fff8e0";
    ctx.beginPath();
    ctx.arc(2, -5, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0a04";
    ctx.beginPath();
    ctx.arc(2.2, -5, 0.9, 0, Math.PI * 2);
    ctx.fill();
    // Feet
    ctx.strokeStyle = "#f6c64a";
    ctx.lineWidth = 1.6;
    [[-4, 18], [4, 18]].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy + 4);
      ctx.moveTo(fx, fy + 4);
      ctx.lineTo(fx - 2, fy + 6);
      ctx.moveTo(fx, fy + 4);
      ctx.lineTo(fx + 2, fy + 6);
      ctx.stroke();
    });
  }

  else if (key === "bird_clover") {
    // Lucky four-leaf clover patch — three trefoil shapes with one bigger 4-leaf.
    // Soil shadow
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Helper to draw a heart-shaped clover leaf
    const drawLeaf = (cx, cy, r, angle, lightHex, darkHex) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
      grad.addColorStop(0, lightHex);
      grad.addColorStop(1, darkHex);
      ctx.fillStyle = grad;
      ctx.beginPath();
      // Heart-shape leaf
      ctx.moveTo(0, r * 0.4);
      ctx.bezierCurveTo(r * 1.1, r * 0.2, r * 0.9, -r * 0.9, 0, -r * 0.3);
      ctx.bezierCurveTo(-r * 0.9, -r * 0.9, -r * 1.1, r * 0.2, 0, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#1f4810";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Leaf vein
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.35);
      ctx.lineTo(0, -r * 0.25);
      ctx.stroke();
      ctx.restore();
    };
    // Background trefoil (small, behind)
    drawLeaf(-12, 8, 6, -0.5, "#7cba48", "#3a6818");
    drawLeaf(-8, 14, 6, 0.4,  "#7cba48", "#3a6818");
    drawLeaf(-4, 10, 6, 0,    "#7cba48", "#3a6818");
    // Stem
    ctx.strokeStyle = "#3a5a18";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(4, 22);
    ctx.bezierCurveTo(2, 14, 4, 6, 4, -4);
    ctx.stroke();
    // Foreground 4-leaf clover (the lucky one)
    drawLeaf(4, -10, 9, 0,            "#a8e068", "#3a7018");
    drawLeaf(4 + 9, -2, 9, Math.PI / 2, "#a8e068", "#3a7018");
    drawLeaf(4, 6, 9, Math.PI,        "#a8e068", "#3a7018");
    drawLeaf(4 - 9, -2, 9, -Math.PI / 2,"#a8e068", "#3a7018");
    // Center node
    ctx.fillStyle = "#fff8c0";
    ctx.beginPath();
    ctx.arc(4, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a7818";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  else if (key === "veg_carrot") {
    // Orange tapered root with leafy green top
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(2, 24, 16, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Carrot body — tapered triangle with rounded shoulders
    const grad = ctx.createLinearGradient(-12, 0, 12, 0);
    grad.addColorStop(0, "#ff9a3c");
    grad.addColorStop(0.5, "#f0731a");
    grad.addColorStop(1, "#a8410a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.quadraticCurveTo(-12, -4, -8, 4);
    ctx.lineTo(-2, 22);
    ctx.quadraticCurveTo(0, 26, 2, 22);
    ctx.lineTo(8, 4);
    ctx.quadraticCurveTo(12, -4, 10, -8);
    ctx.quadraticCurveTo(0, -12, -10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5a2308";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Horizontal ridge lines
    ctx.strokeStyle = "rgba(90,35,8,0.55)";
    ctx.lineWidth = 1.1;
    [-3, 3, 9, 14, 18].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-9 + y * 0.2, y);
      ctx.quadraticCurveTo(0, y + 1.4, 9 - y * 0.2, y);
      ctx.stroke();
    });
    // Body highlight
    ctx.strokeStyle = "rgba(255,235,180,0.55)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(-2, 18);
    ctx.stroke();
    // Leafy green top — three feathery sprigs
    const drawSprig = (x0, sway, h, color, dark) => {
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x0, -8);
      ctx.quadraticCurveTo(x0 + sway * 0.6, -8 - h * 0.6, x0 + sway, -8 - h);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1;
      // Leaflets
      for (let i = 0; i < 4; i++) {
        const t = (i + 1) / 5;
        const lx = x0 + sway * t;
        const ly = -8 - h * t;
        ctx.beginPath();
        ctx.ellipse(lx + (sway > 0 ? 2 : -2), ly + 1, 3, 1.4, sway * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };
    drawSprig(-4, -8, 16, "#7ec238", "#2f5410");
    drawSprig(0, 0, 20, "#a0db4a", "#3a6814");
    drawSprig(4, 8, 16, "#7ec238", "#2f5410");
  }

  else if (key === "veg_eggplant") {
    // Deep purple bulb with curved green calyx/stem
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eggplant body — pear/teardrop shape
    const grad = ctx.createRadialGradient(-5, 4, 3, 0, 6, 22);
    grad.addColorStop(0, "#7a3aa8");
    grad.addColorStop(0.55, "#3e1660");
    grad.addColorStop(1, "#1e0a30");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.bezierCurveTo(-14, -8, -16, 8, -10, 16);
    ctx.bezierCurveTo(-6, 22, 6, 22, 10, 16);
    ctx.bezierCurveTo(16, 8, 14, -8, 0, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0a0418";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Glossy specular highlight
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.beginPath();
    ctx.ellipse(-6, 0, 3, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(-3, -4, 1.6, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Calyx (5-pointed green star) at top
    ctx.fillStyle = "#4a7818";
    ctx.strokeStyle = "#1f3a08";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const cx = 0, cy = -10;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      const x = cx + Math.cos(a) * 8;
      const y = cy + Math.sin(a) * 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(cx + Math.cos(a2) * 3, cy + Math.sin(a2) * 2.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Curved stem rising from calyx
    ctx.strokeStyle = "#3a5818";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(4, -18, 8, -22);
    ctx.stroke();
    ctx.strokeStyle = "#7eb44a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(4, -18, 8, -22);
    ctx.stroke();
  }

  else if (key === "veg_turnip") {
    // Pink/magenta upper, white lower, round root, green leaves on top
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Turnip body (round bulb tapering to a small root)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.bezierCurveTo(-16, 12, -8, 22, 0, 22);
    ctx.bezierCurveTo(8, 22, 16, 12, 14, -2);
    ctx.bezierCurveTo(12, -10, -12, -10, -14, -2);
    ctx.closePath();
    ctx.clip();
    // White lower fill
    ctx.fillStyle = "#f4eddb";
    ctx.fillRect(-20, 0, 40, 30);
    // Pink/magenta upper
    const top = ctx.createLinearGradient(0, -12, 0, 4);
    top.addColorStop(0, "#f48ac0");
    top.addColorStop(0.6, "#d54a90");
    top.addColorStop(1, "#a82c70");
    ctx.fillStyle = top;
    ctx.fillRect(-20, -16, 40, 18);
    // Soft transition band
    const band = ctx.createLinearGradient(0, -2, 0, 6);
    band.addColorStop(0, "rgba(213,74,144,0.7)");
    band.addColorStop(1, "rgba(244,237,219,0)");
    ctx.fillStyle = band;
    ctx.fillRect(-20, -2, 40, 8);
    ctx.restore();
    // Outline
    ctx.strokeStyle = "#5a1830";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.bezierCurveTo(-16, 12, -8, 22, 0, 22);
    ctx.bezierCurveTo(8, 22, 16, 12, 14, -2);
    ctx.bezierCurveTo(12, -10, -12, -10, -14, -2);
    ctx.closePath();
    ctx.stroke();
    // Highlight on the pink shoulder
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(-6, -4, 3, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Tiny taproot tip at bottom
    ctx.strokeStyle = "#7a5a30";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(1, 25, -1, 27);
    ctx.stroke();
    // Green leaves up top — three lobed leaves
    const drawLeaf = (x0, sway, h, light, dark) => {
      ctx.fillStyle = light;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x0, -8);
      ctx.bezierCurveTo(x0 + sway * 0.8, -8 - h * 0.4, x0 + sway, -8 - h, x0 + sway * 0.4, -8 - h);
      ctx.bezierCurveTo(x0 + sway * 0.2, -8 - h * 0.6, x0 + sway * 0.1, -8 - h * 0.3, x0, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    drawLeaf(-4, -6, 14, "#7ec238", "#2f5410");
    drawLeaf(0, 0, 18, "#a0db4a", "#3a6814");
    drawLeaf(3, 7, 13, "#7ec238", "#2f5410");
  }

  else if (key === "veg_beet") {
    // Dark red-purple round root with red-veined leaves
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    const grad = ctx.createRadialGradient(-5, 2, 3, 0, 6, 18);
    grad.addColorStop(0, "#a83260");
    grad.addColorStop(0.55, "#621230");
    grad.addColorStop(1, "#280818");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.bezierCurveTo(-14, 14, -6, 22, 0, 22);
    ctx.bezierCurveTo(6, 22, 14, 14, 12, 0);
    ctx.bezierCurveTo(10, -8, -10, -8, -12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a040c";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Concentric ring (beet's interior pattern hint)
    ctx.strokeStyle = "rgba(220,80,140,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-2, 8, 6, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Highlight
    ctx.fillStyle = "rgba(255,200,220,0.4)";
    ctx.beginPath();
    ctx.ellipse(-6, -2, 2.6, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Wispy taproot
    ctx.strokeStyle = "#3a1018";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(2, 26, 0, 28);
    ctx.stroke();
    // Leaves with red-pink veins
    const drawBeetLeaf = (x0, sway, h, ang) => {
      ctx.save();
      ctx.translate(x0, -8);
      ctx.rotate(ang);
      // Stem
      ctx.strokeStyle = "#a02448";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -h * 0.4);
      ctx.stroke();
      // Leaf blade
      const lg = ctx.createLinearGradient(0, -h, 0, 0);
      lg.addColorStop(0, "#5a8a26");
      lg.addColorStop(1, "#2f5410");
      ctx.fillStyle = lg;
      ctx.strokeStyle = "#1f3a08";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.4);
      ctx.bezierCurveTo(-6, -h * 0.6, -5, -h, 0, -h);
      ctx.bezierCurveTo(5, -h, 6, -h * 0.6, 0, -h * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Red vein
      ctx.strokeStyle = "#d8487a";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(0, -h * 0.95);
      ctx.stroke();
      ctx.restore();
    };
    drawBeetLeaf(-4, 0, 14, -0.4);
    drawBeetLeaf(0, 0, 18, 0);
    drawBeetLeaf(4, 0, 14, 0.4);
  }

  else if (key === "veg_cucumber") {
    // Long green ribbed cylinder with subtle bumps, tilted
    ctx.save();
    ctx.rotate(-0.4);
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    rr(ctx, -22, 14, 44, 7, 6);
    ctx.fill();
    // Body
    const grad = ctx.createLinearGradient(0, -10, 0, 10);
    grad.addColorStop(0, "#8ac246");
    grad.addColorStop(0.5, "#3e7a18");
    grad.addColorStop(1, "#1f4810");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(-26, -10, -16, -10);
    ctx.lineTo(18, -10);
    ctx.quadraticCurveTo(26, -10, 22, 0);
    ctx.quadraticCurveTo(26, 10, 18, 10);
    ctx.lineTo(-16, 10);
    ctx.quadraticCurveTo(-26, 10, -22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0c2806";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Vertical ribs (length-wise lines along body)
    ctx.strokeStyle = "rgba(15,40,8,0.55)";
    ctx.lineWidth = 1.1;
    [-7, -3, 1, 5].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-19, y);
      ctx.bezierCurveTo(-8, y - 0.6, 8, y + 0.5, 19, y);
      ctx.stroke();
    });
    // Lighter rib highlights
    ctx.strokeStyle = "rgba(220,250,160,0.5)";
    ctx.lineWidth = 0.9;
    [-5, -1, 3].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-18, y);
      ctx.bezierCurveTo(-6, y - 0.4, 8, y + 0.4, 18, y);
      ctx.stroke();
    });
    // Bumps (tiny dots)
    ctx.fillStyle = "rgba(15,40,8,0.7)";
    [[-14, -5], [-8, 2], [-2, -4], [4, 3], [10, -2], [14, 4], [-12, 5], [6, -6]].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
    // Bump highlights
    ctx.fillStyle = "rgba(220,250,160,0.7)";
    [[-13, -6], [-7, 1], [-1, -5], [5, 2], [11, -3], [15, 3], [-11, 4], [7, -7]].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
    // Top specular highlight strip
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(-2, -7, 14, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tip stem nub on right
    ctx.fillStyle = "#5a3a14";
    ctx.beginPath();
    ctx.ellipse(22, -2, 2.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  else if (key === "veg_squash") {
    // Yellow rounded gourd (acorn-squash) with brown stem and ridges
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 20, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    const grad = ctx.createRadialGradient(-5, -2, 3, 0, 6, 22);
    grad.addColorStop(0, "#ffe58a");
    grad.addColorStop(0.55, "#e6a020");
    grad.addColorStop(1, "#8a5410");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.bezierCurveTo(-18, -10, -20, 14, -10, 20);
    ctx.bezierCurveTo(-4, 24, 4, 24, 10, 20);
    ctx.bezierCurveTo(20, 14, 18, -10, 0, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4a2e08";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Vertical ridges (body segmentation)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.bezierCurveTo(-18, -10, -20, 14, -10, 20);
    ctx.bezierCurveTo(-4, 24, 4, 24, 10, 20);
    ctx.bezierCurveTo(20, 14, 18, -10, 0, -8);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = "rgba(74,46,8,0.55)";
    ctx.lineWidth = 1.6;
    [-12, -6, 0, 6, 12].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x * 0.5, -8);
      ctx.bezierCurveTo(x, 0, x, 14, x * 0.7, 22);
      ctx.stroke();
    });
    // Light ridge highlights
    ctx.strokeStyle = "rgba(255,240,180,0.55)";
    ctx.lineWidth = 1;
    [-9, -3, 3, 9].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x * 0.5, -7);
      ctx.bezierCurveTo(x, 1, x, 14, x * 0.7, 21);
      ctx.stroke();
    });
    ctx.restore();
    // Specular highlight
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(-7, -2, 3, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Brown chunky stem
    ctx.fillStyle = "#6a4218";
    ctx.beginPath();
    ctx.moveTo(-3, -10);
    ctx.lineTo(-4, -18);
    ctx.lineTo(4, -18);
    ctx.lineTo(3, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // Stem cap (knobby top)
    ctx.fillStyle = "#8a5a20";
    ctx.beginPath();
    ctx.ellipse(0, -19, 5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Stem highlight
    ctx.strokeStyle = "rgba(255,220,170,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, -17);
    ctx.lineTo(-2, -11);
    ctx.stroke();
  }

  else if (key === "veg_mushroom") {
    // Toadstool — red cap with white spots, white stem
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 16, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stem (white, slightly bulbous at base)
    const stemGrad = ctx.createLinearGradient(-7, 0, 7, 0);
    stemGrad.addColorStop(0, "#e8dcc0");
    stemGrad.addColorStop(0.5, "#fff8e8");
    stemGrad.addColorStop(1, "#c8b896");
    ctx.fillStyle = stemGrad;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-7, 18);
    ctx.quadraticCurveTo(-8, 22, -3, 22);
    ctx.lineTo(3, 22);
    ctx.quadraticCurveTo(8, 22, 7, 18);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5a4818";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Stem ring/skirt (annulus)
    ctx.fillStyle = "#f0e4c6";
    rr(ctx, -8, -2, 16, 4, 1.5);
    ctx.fill();
    ctx.strokeStyle = "#5a4818";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Gills hint (under cap)
    ctx.strokeStyle = "rgba(120,100,40,0.6)";
    ctx.lineWidth = 0.8;
    [-6, -3, 0, 3, 6].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -3);
      ctx.lineTo(x, -1);
      ctx.stroke();
    });
    // Cap (red half-dome)
    const capGrad = ctx.createRadialGradient(-5, -10, 3, 0, -4, 18);
    capGrad.addColorStop(0, "#ff6a4a");
    capGrad.addColorStop(0.5, "#d22418");
    capGrad.addColorStop(1, "#7a0e08");
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.moveTo(-16, -3);
    ctx.bezierCurveTo(-16, -22, 16, -22, 16, -3);
    ctx.quadraticCurveTo(8, -1, 0, -1);
    ctx.quadraticCurveTo(-8, -1, -16, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a0608";
    ctx.lineWidth = 2;
    ctx.stroke();
    // White spots
    ctx.fillStyle = "#fff8e8";
    ctx.strokeStyle = "rgba(120,40,30,0.4)";
    ctx.lineWidth = 0.8;
    [[-9, -8, 2.6], [-2, -14, 2.4], [6, -10, 2.2], [-7, -16, 1.6], [10, -6, 1.6], [3, -6, 1.4], [-12, -4, 1.6]].forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    // Cap specular highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(-6, -14, 3, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  else if (key === "veg_pepper") {
    // Glossy red bell pepper with green stem
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body — three-lobed bell shape
    const grad = ctx.createRadialGradient(-6, -2, 3, 0, 6, 22);
    grad.addColorStop(0, "#ff6a4a");
    grad.addColorStop(0.5, "#d22418");
    grad.addColorStop(1, "#5a0a08");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.bezierCurveTo(-18, 0, -16, 16, -8, 20);
    ctx.bezierCurveTo(-4, 22, -2, 18, 0, 18);
    ctx.bezierCurveTo(2, 18, 4, 22, 8, 20);
    ctx.bezierCurveTo(16, 16, 18, 0, 12, -8);
    ctx.bezierCurveTo(8, -10, 4, -8, 0, -8);
    ctx.bezierCurveTo(-4, -8, -8, -10, -12, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a0608";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Vertical lobe creases
    ctx.strokeStyle = "rgba(58,6,8,0.55)";
    ctx.lineWidth = 1.4;
    [-6, 0, 6].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.bezierCurveTo(x + (x === 0 ? 0 : x > 0 ? 1 : -1), 4, x, 14, x * 0.6, 19);
      ctx.stroke();
    });
    // Glossy specular highlight (large)
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(-6, 0, 3, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(5, 4, 1.6, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Green stem (cylinder) on top
    ctx.fillStyle = "#5a8a26";
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.lineTo(-3, -16);
    ctx.quadraticCurveTo(0, -19, 3, -16);
    ctx.lineTo(3, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1f3a08";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Stem highlight
    ctx.strokeStyle = "rgba(220,250,160,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, -15);
    ctx.lineTo(-2, -10);
    ctx.stroke();
    // Calyx leaves around stem
    ctx.fillStyle = "#3a6814";
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.quadraticCurveTo(-3, -10, 0, -8);
    ctx.quadraticCurveTo(3, -10, 8, -8);
    ctx.quadraticCurveTo(4, -6, 0, -6);
    ctx.quadraticCurveTo(-4, -6, -8, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1f3a08";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  else if (key === "veg_broccoli") {
    // Green clustered florets atop a thicker pale-green stalk
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 16, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stalk (pale green column)
    const stalkGrad = ctx.createLinearGradient(-7, 0, 7, 0);
    stalkGrad.addColorStop(0, "#7ea848");
    stalkGrad.addColorStop(0.5, "#c4dc78");
    stalkGrad.addColorStop(1, "#5a7a30");
    ctx.fillStyle = stalkGrad;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-8, 20);
    ctx.quadraticCurveTo(-8, 22, -4, 22);
    ctx.lineTo(4, 22);
    ctx.quadraticCurveTo(8, 22, 8, 20);
    ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2f5410";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Stalk vertical fibers
    ctx.strokeStyle = "rgba(47,84,16,0.5)";
    ctx.lineWidth = 0.8;
    [-3, 0, 3].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, 20);
      ctx.stroke();
    });
    // Small side branches
    ctx.strokeStyle = "#5a7a30";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, 4);
    ctx.lineTo(-12, 0);
    ctx.moveTo(5, 4);
    ctx.lineTo(12, 0);
    ctx.stroke();
    // Florets — bumpy circles forming a cloud cluster on top
    const florets = [
      [-12, -2, 6.5],
      [-6, -8, 7],
      [0, -12, 7.5],
      [6, -8, 7],
      [12, -2, 6.5],
      [-3, -2, 6],
      [4, -3, 6.5],
      [-9, -14, 5],
      [9, -14, 5],
      [0, -18, 5.5],
    ];
    // Dark base layer
    florets.forEach(([fx, fy, fr]) => {
      ctx.fillStyle = "#2f5410";
      ctx.beginPath();
      ctx.arc(fx, fy, fr + 1, 0, Math.PI * 2);
      ctx.fill();
    });
    // Mid green
    florets.forEach(([fx, fy, fr]) => {
      const fg = ctx.createRadialGradient(fx - fr * 0.3, fy - fr * 0.3, 1, fx, fy, fr);
      fg.addColorStop(0, "#9cd040");
      fg.addColorStop(1, "#3a6814");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    });
    // Floret texture — tiny bumps
    ctx.fillStyle = "rgba(180,220,80,0.7)";
    florets.forEach(([fx, fy, fr]) => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + fx * 0.2;
        const dx = fx + Math.cos(a) * fr * 0.55;
        const dy = fy + Math.sin(a) * fr * 0.55;
        ctx.beginPath();
        ctx.arc(dx, dy, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // Highlights on top florets
    ctx.fillStyle = "rgba(220,250,160,0.55)";
    [[-7, -10, 2], [1, -14, 2.2], [7, -10, 1.8]].forEach(([hx, hy, hr]) => {
      ctx.beginPath();
      ctx.ellipse(hx, hy, hr, hr * 0.7, -0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  else if (key === "soup") {
    // Wooden bowl with orange/red broth and rising steam wisps
    // Steam wisps (drawn first so the bowl overlaps if needed)
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    [[-7, -4], [0, -2], [7, -4]].forEach(([x0, y0], i) => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + 4, y0 - 6, x0 - 6, y0 - 12, x0 + 2 + i, y0 - 18);
      ctx.bezierCurveTo(x0 + 6, y0 - 22, x0 - 4, y0 - 24, x0 + i * 2, y0 - 28);
      ctx.stroke();
    });
    // Soft steam glow
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 4.4;
    [[-7, -4], [0, -2], [7, -4]].forEach(([x0, y0], i) => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + 4, y0 - 6, x0 - 6, y0 - 12, x0 + 2 + i, y0 - 18);
      ctx.bezierCurveTo(x0 + 6, y0 - 22, x0 - 4, y0 - 24, x0 + i * 2, y0 - 28);
      ctx.stroke();
    });
    // Bowl shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bowl outer body (wooden)
    const bowlGrad = ctx.createLinearGradient(0, 0, 0, 22);
    bowlGrad.addColorStop(0, "#b07a3e");
    bowlGrad.addColorStop(0.5, "#7a4a18");
    bowlGrad.addColorStop(1, "#3e2208");
    ctx.fillStyle = bowlGrad;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.bezierCurveTo(-22, 18, -10, 22, 0, 22);
    ctx.bezierCurveTo(10, 22, 22, 18, 22, 0);
    ctx.lineTo(-22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1f0f04";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Bowl wood grain
    ctx.strokeStyle = "rgba(31,15,4,0.55)";
    ctx.lineWidth = 0.9;
    [6, 11, 16].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-20 + y * 0.2, y);
      ctx.bezierCurveTo(-8, y - 0.8, 8, y + 0.8, 20 - y * 0.2, y);
      ctx.stroke();
    });
    // Bowl rim ellipse (top opening)
    ctx.fillStyle = "#5a3814";
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1f0f04";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Broth (orange/red surface)
    const broth = ctx.createRadialGradient(-4, -1, 2, 0, 0, 22);
    broth.addColorStop(0, "#ffba60");
    broth.addColorStop(0.5, "#e6601c");
    broth.addColorStop(1, "#a82408");
    ctx.fillStyle = broth;
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a1808";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Floating veggie chunks
    ctx.fillStyle = "#ffa830";
    ctx.beginPath();
    ctx.ellipse(-8, -1, 2.6, 1.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7ec238";
    ctx.beginPath();
    ctx.ellipse(6, 0, 2, 1.1, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d22418";
    ctx.beginPath();
    ctx.ellipse(0, 1, 1.8, 1, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Broth highlight
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(-9, -2, 4, 0.8, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Bowl bottom rim shine
    ctx.strokeStyle = "rgba(255,220,170,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-20, 2);
    ctx.bezierCurveTo(-22, 12, -16, 18, -10, 20);
    ctx.stroke();
  }

  else if (key === "bird_melon") {
    // Round striped summer melon with leaf and curling tendril.
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(2, 22, 22, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    const grad = ctx.createRadialGradient(-6, -6, 4, 0, 0, 22);
    grad.addColorStop(0, "#d4ed90");
    grad.addColorStop(0.55, "#7eb44a");
    grad.addColorStop(1, "#3a6818");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 4, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1f4810";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Vertical dark stripes (clipped to body circle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 4, 18, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = "rgba(28,68,16,0.7)";
    ctx.lineWidth = 2;
    [-12, -4, 4, 12].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -16);
      ctx.bezierCurveTo(x + (x < 0 ? 1 : -1), 0, x + (x < 0 ? 2 : -2), 12, x + (x < 0 ? 2 : -2), 24);
      ctx.stroke();
    });
    // Lighter highlight stripes
    ctx.strokeStyle = "rgba(220,240,160,0.55)";
    ctx.lineWidth = 1.2;
    [-8, 0, 8].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -14);
      ctx.bezierCurveTo(x, 0, x + 1, 12, x + 1, 22);
      ctx.stroke();
    });
    ctx.restore();
    // Specular highlight
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(-7, -6, 4, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Stem (top knob)
    ctx.fillStyle = "#5a3a14";
    ctx.beginPath();
    ctx.ellipse(-1, -16, 3.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Leaf
    ctx.fillStyle = "#5a8a26";
    ctx.beginPath();
    ctx.moveTo(-2, -18);
    ctx.bezierCurveTo(-12, -22, -16, -14, -10, -10);
    ctx.bezierCurveTo(-6, -14, -2, -16, -2, -18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a4a10";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2, -18);
    ctx.lineTo(-10, -12);
    ctx.stroke();
    // Curling tendril
    ctx.strokeStyle = "#3a5a18";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2, -18);
    ctx.bezierCurveTo(8, -22, 14, -18, 12, -14);
    ctx.bezierCurveTo(10, -12, 14, -10, 16, -14);
    ctx.stroke();
  }
}
