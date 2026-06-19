(() => {
  // src/textures/seasonal/tree/oak.ts
  function groundShadow(ctx, rx = 16, alpha = 0.22) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 22, rx, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function canopyBlob(ctx, x, y, r, colors, alpha = 1) {
    const [dark, mid, light] = colors;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.18, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
    grad.addColorStop(0, light);
    grad.addColorStop(0.55, mid);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.96, r * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.globalAlpha = alpha * 0.7;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.34, r * 0.28, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function trunk(ctx, wet = false) {
    const bark = wet ? "#3c2c1c" : "#6b4a26";
    const barkLight = wet ? "#5a4530" : "#8a6336";
    const barkDark = wet ? "#241a10" : "#4a3318";
    ctx.fillStyle = barkDark;
    ctx.beginPath();
    ctx.moveTo(-5.5, 20);
    ctx.quadraticCurveTo(-4, 6, -3, -2);
    ctx.lineTo(3, -2);
    ctx.quadraticCurveTo(4, 6, 5.5, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = bark;
    ctx.beginPath();
    ctx.moveTo(-4.6, 20);
    ctx.quadraticCurveTo(-3.2, 6, -2.4, -2);
    ctx.lineTo(2.4, -2);
    ctx.quadraticCurveTo(3.2, 6, 4.6, 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = barkLight;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 19);
    ctx.quadraticCurveTo(-2.8, 6, -2, -1);
    ctx.stroke();
    ctx.fillStyle = barkDark;
    ctx.beginPath();
    ctx.moveTo(-5.5, 20);
    ctx.quadraticCurveTo(-9, 19, -11, 20.5);
    ctx.quadraticCurveTo(-7, 20.5, -4.5, 19.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5.5, 20);
    ctx.quadraticCurveTo(9, 19, 11, 20.5);
    ctx.quadraticCurveTo(7, 20.5, 4.5, 19.5);
    ctx.closePath();
    ctx.fill();
  }
  var BRANCHES = [
    // [ctrlX, ctrlY, tipX, tipY, width]
    [-6, -6, -13, -16, 2.6],
    [-2, -10, -6, -22, 2.2],
    [3, -10, 6, -23, 2.4],
    [7, -6, 14, -15, 2.6],
    [0, -8, 1, -24, 2],
    [-9, -3, -16, -8, 2],
    [9, -3, 17, -7, 2]
  ];
  function branchSilhouette(ctx, color, sway, snow) {
    ctx.lineCap = "round";
    BRANCHES.forEach(([cx, cy, tx, ty, w], i) => {
      const s = sway * (0.4 + Math.abs(tx) / 24);
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(cx + s * 0.5, cy, tx + s, ty);
      ctx.stroke();
      ctx.lineWidth = w * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.5, cy);
      ctx.lineTo(cx + s * 0.5 + (tx < 0 ? -4 : 4), cy - 5);
      ctx.stroke();
      if (snow) {
        ctx.fillStyle = "#f4f8ff";
        ctx.beginPath();
        ctx.ellipse(tx + s, ty - 0.5, 2.6 + i % 2 * 0.6, 1.5, tx < 0 ? -0.5 : 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.lineCap = "butt";
  }
  var SPRING_CLUSTERS = [
    // [x, y, r]
    [-12, -15, 4],
    [-5, -20, 4.5],
    [4, -21, 4.5],
    [13, -14, 4],
    [0, -10, 3.5],
    [-15, -8, 3],
    [16, -7, 3]
  ];
  function springOak(ctx, sway, budPulse) {
    groundShadow(ctx, 14, 0.2);
    trunk(ctx, false);
    branchSilhouette(ctx, "#5a3d20", sway, false);
    const fresh = ["#5a7d24", "#86b53a", "#c0e26a"];
    SPRING_CLUSTERS.forEach(([x, y, r]) => {
      const s = sway * (0.3 + Math.abs(x) / 28);
      canopyBlob(ctx, x + s, y, r, fresh, 0.9);
    });
    ctx.fillStyle = "#a6e06a";
    SPRING_CLUSTERS.forEach(([x, y, r], i) => {
      const s = sway * (0.3 + Math.abs(x) / 28);
      for (let k = 0; k < 3; k++) {
        const a = i * 1.7 + k * 2.1;
        ctx.beginPath();
        ctx.ellipse(x + s + Math.cos(a) * r, y + Math.sin(a) * r, 1.4, 2.2, a, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    const buds = [
      [-8, -18],
      [6, -19],
      [-2, -14],
      [11, -12],
      [-13, -11]
    ];
    buds.forEach(([bx, by], i) => {
      const a = 0.5 + 0.45 * (0.5 + 0.5 * Math.sin(budPulse + i * 1.3));
      ctx.fillStyle = `rgba(232,224,150,${a})`;
      ctx.beginPath();
      ctx.arc(bx + sway * 0.2, by, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function drawOakSpring(ctx) {
    springOak(ctx, 0, 0.6);
  }
  function animOakSpring(ctx, t) {
    const sway = Math.sin(t * 1.3) * 1.6;
    springOak(ctx, sway, t * 2.4);
  }
  var SUMMER_BLOBS = [
    // [x, y, r]
    [0, -16, 11],
    [-9, -13, 7.5],
    [9, -13, 7.5],
    [-6, -21, 6.5],
    [6, -21, 6.5],
    [0, -24, 6],
    [-13, -9, 5.5],
    [13, -9, 5.5],
    [0, -10, 7]
  ];
  function summerOak(ctx, sway, shimmer) {
    groundShadow(ctx, 16, 0.22);
    trunk(ctx, false);
    const green = ["#2f5418", "#4f8a2a", "#86bf48"];
    SUMMER_BLOBS.forEach(([x, y, r], i) => {
      const s = sway * (0.25 + Math.abs(x) / 26) + Math.sin(shimmer + i) * 0.4;
      canopyBlob(ctx, x + s, y, r, green, 1);
    });
    ctx.fillStyle = `rgba(190,230,140,${0.4 + 0.3 * (0.5 + 0.5 * Math.sin(shimmer))})`;
    [[-7, -22, 2], [-2, -19, 1.6], [-11, -14, 1.8]].forEach(([fx, fy, r]) => {
      ctx.beginPath();
      ctx.arc(fx + sway * 0.3, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    const flx = 15 + Math.sin(shimmer * 0.8) * 1.5;
    const fly = -6 + Math.cos(shimmer * 1.1) * 1.2;
    ctx.fillStyle = "#4f8a2a";
    ctx.save();
    ctx.translate(flx, fly);
    ctx.rotate(Math.sin(shimmer) * 0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.6, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawOakSummer(ctx) {
    summerOak(ctx, 0, 0);
  }
  function animOakSummer(ctx, t) {
    const sway = Math.sin(t * 1.3) * 1.4;
    summerOak(ctx, sway, t * 1.9);
  }
  var AUTUMN_BLOBS = [
    [0, -16, 10.5, 0.5],
    [-9, -13, 7, 0.2],
    [9, -13, 7, 0.8],
    [-6, -21, 6, 0.4],
    [6, -21, 6, 0.7],
    [0, -24, 5.5, 0.3],
    [-13, -9, 5, 0.9],
    [13, -9, 5, 0.1],
    [0, -10, 6.5, 0.6]
  ];
  function autumnColors(hue) {
    const stops = [
      [0, [216, 168, 48]],
      // gold
      [0.5, [196, 96, 24]],
      // orange
      [1, [150, 52, 28]]
      // russet
    ];
    function pick(h) {
      let lo = stops[0];
      let hi = stops[stops.length - 1];
      for (let i = 0; i < stops.length - 1; i++) {
        if (h >= stops[i][0] && h <= stops[i + 1][0]) {
          lo = stops[i];
          hi = stops[i + 1];
          break;
        }
      }
      const span = hi[0] - lo[0] || 1;
      const f = (h - lo[0]) / span;
      return [
        lo[1][0] + (hi[1][0] - lo[1][0]) * f,
        lo[1][1] + (hi[1][1] - lo[1][1]) * f,
        lo[1][2] + (hi[1][2] - lo[1][2]) * f
      ];
    }
    const [r, g, b] = pick(Math.max(0, Math.min(1, hue)));
    const dark = `rgb(${Math.round(r * 0.55)},${Math.round(g * 0.45)},${Math.round(b * 0.4)})`;
    const mid = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    const light = `rgb(${Math.min(255, Math.round(r * 1.25))},${Math.min(255, Math.round(g * 1.25))},${Math.min(255, Math.round(b * 1.2))})`;
    return [dark, mid, light];
  }
  function acorns(ctx) {
    const spots = [[-4, -9], [7, -7]];
    spots.forEach(([ax, ay]) => {
      ctx.fillStyle = "#6b4710";
      ctx.beginPath();
      ctx.ellipse(ax, ay, 2.2, 1.4, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b5762a";
      ctx.beginPath();
      ctx.ellipse(ax, ay + 1.6, 1.8, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,235,180,0.5)";
      ctx.beginPath();
      ctx.arc(ax - 0.6, ay + 1, 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function autumnOak(ctx, sway, fall) {
    groundShadow(ctx, 15, 0.22);
    trunk(ctx, false);
    AUTUMN_BLOBS.forEach(([x, y, r, hue], i) => {
      if (i === 5) return;
      const s = sway * (0.25 + Math.abs(x) / 26);
      canopyBlob(ctx, x + s, y, r, autumnColors(hue), 0.95);
    });
    acorns(ctx);
    const leaves = [
      // [startX, hue, phase, swayAmp]
      [-6, 0.3, 0, 6],
      [9, 0.8, 0.5, 5]
    ];
    leaves.forEach(([sx, hue, phase, amp]) => {
      const prog = ((fall + phase) % 1 + 1) % 1;
      const ly = -6 + prog * 26;
      const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * amp;
      const [, mid] = autumnColors(hue);
      ctx.fillStyle = mid;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(prog * Math.PI * 3 + phase * 4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.fillStyle = autumnColors(0.6)[1];
    [[-7, 21], [5, 22]].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.ellipse(fx, fy, 2.4, 1.3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function drawOakAutumn(ctx) {
    autumnOak(ctx, 0, 0.25);
  }
  function animOakAutumn(ctx, t) {
    const sway = Math.sin(t * 1.1) * 1.2;
    const fall = t * 0.28 % 1;
    autumnOak(ctx, sway, fall);
  }
  function winterOak(ctx, sway, flakes, sheen) {
    groundShadow(ctx, 16, 0.18);
    const snow = ctx.createLinearGradient(0, 16, 0, 24);
    snow.addColorStop(0, "#eef4fb");
    snow.addColorStop(1, "#c2d2e4");
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    trunk(ctx, true);
    branchSilhouette(ctx, "#2e2114", sway, true);
    ctx.fillStyle = `rgba(200,224,255,${0.16 + sheen * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(-3, 19, 10, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    flakes.forEach(([fx, fy, r]) => {
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function drawOakWinter(ctx) {
    winterOak(
      ctx,
      0,
      [
        [-9, -14, 1.3],
        [6, -4, 1.1],
        [12, -18, 1],
        [-3, 6, 1.2]
      ],
      0.4
    );
  }
  function animOakWinter(ctx, t) {
    const sway = Math.sin(t * 0.9) * 1;
    const span = 36;
    const seeds = [
      [-9, 1.3, 0],
      [6, 1.1, 0.45],
      [12, 1, 0.7],
      [-3, 1.2, 0.25]
    ];
    const flakes = seeds.map(([fx, r, phase]) => {
      const prog = ((t / 3.6 + phase) % 1 + 1) % 1;
      const fy = -24 + prog * span;
      const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
      return [driftX, fy, r];
    });
    const sheen = 0.5 + 0.5 * Math.sin(t * 0.7);
    winterOak(ctx, sway, flakes, sheen);
  }
  function lerp(a, b, f) {
    return a + (b - a) * f;
  }
  function springToSummer(ctx, p) {
    const q = Math.max(0, Math.min(1, p));
    groundShadow(ctx, lerp(14, 16, q), 0.21);
    trunk(ctx, false);
    branchSilhouette(ctx, "#5a3d20", 0, false);
    const fresh = ["#5a7d24", "#86b53a", "#c0e26a"];
    SPRING_CLUSTERS.forEach(([x, y, r]) => {
      const a = 0.9 * (1 - q);
      if (a > 0.02) canopyBlob(ctx, x, y, lerp(r, r * 0.8, q), fresh, a);
    });
    const green = ["#2f5418", "#4f8a2a", "#86bf48"];
    SUMMER_BLOBS.forEach(([x, y, r], i) => {
      const grow = Math.max(0, q * 1.15 - i * 0.015);
      const rr = r * Math.min(1, grow);
      if (rr > 0.5) canopyBlob(ctx, x, y, rr, green, Math.min(1, q + 0.15));
    });
    const buds = [
      [-8, -18],
      [6, -19],
      [-2, -14],
      [11, -12],
      [-13, -11]
    ];
    const budA = Math.max(0, 0.6 * (1 - q * 1.6));
    if (budA > 0.02) {
      buds.forEach(([bx, by]) => {
        ctx.fillStyle = `rgba(232,224,150,${budA})`;
        ctx.beginPath();
        ctx.arc(bx, by, 1.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.globalAlpha = 1;
  }
  function summerToAutumn(ctx, p) {
    const q = Math.max(0, Math.min(1, p));
    groundShadow(ctx, lerp(16, 15, q), 0.22);
    trunk(ctx, false);
    SUMMER_BLOBS.forEach(([x, y, r], i) => {
      const aBlob = AUTUMN_BLOBS[Math.min(i, AUTUMN_BLOBS.length - 1)];
      const [adark, amid, alight] = autumnColors(aBlob[3]);
      const greenCols = ["#2f5418", "#4f8a2a", "#86bf48"];
      const autumnCols = [adark, amid, alight];
      const rr = i === 5 ? r * lerp(1, 0.15, q) : r;
      if (rr > 0.5) {
        canopyBlob(ctx, x, y, rr, greenCols, 1);
        if (q > 0.01) canopyBlob(ctx, x, y, rr, autumnCols, q);
      }
    });
    if (q > 0.5) {
      ctx.save();
      ctx.globalAlpha = (q - 0.5) * 2;
      acorns(ctx);
      ctx.restore();
    }
    if (q > 0.65) {
      const d = (q - 0.65) / 0.35;
      const leaves = [
        [-6, -6, 0.4],
        [9, -8, 0.8]
      ];
      leaves.forEach(([sx, sy, hue]) => {
        const lx = sx + d * 2;
        const ly = sy + d * 5;
        ctx.fillStyle = autumnColors(hue)[1];
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(d * 1.4);
        ctx.globalAlpha = 1 - d * 0.3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
    ctx.globalAlpha = 1;
  }
  function autumnToWinter(ctx, p) {
    const q = Math.max(0, Math.min(1, p));
    const shed = Math.min(1, q / 0.7);
    const snowAmt = Math.max(0, (q - 0.4) / 0.6);
    groundShadow(ctx, lerp(15, 16, q), lerp(0.22, 0.18, q));
    if (snowAmt > 0.01) {
      const snow = ctx.createLinearGradient(0, 16, 0, 24);
      snow.addColorStop(0, "#eef4fb");
      snow.addColorStop(1, "#c2d2e4");
      ctx.save();
      ctx.globalAlpha = snowAmt;
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    trunk(ctx, false);
    if (snowAmt > 0.01) {
      ctx.save();
      ctx.globalAlpha = snowAmt;
      trunk(ctx, true);
      ctx.restore();
    }
    branchSilhouette(ctx, "#3a2a18", 0, false);
    AUTUMN_BLOBS.forEach(([x, y, r, hue], i) => {
      if (i === 5) return;
      const a = 0.95 * (1 - shed);
      if (a > 0.03) {
        const drop = shed * (8 + Math.abs(x) * 0.3);
        canopyBlob(ctx, x, y + drop, r * (1 - shed * 0.4), autumnColors(hue), a);
      }
    });
    if (shed > 0.05 && shed < 0.98) {
      const leaves = [
        [-6, 0.3, 0, 6],
        [9, 0.8, 0.4, 5],
        [2, 0.6, 0.7, 5]
      ];
      leaves.forEach(([sx, hue, phase, amp]) => {
        const prog = Math.min(1, shed + phase * 0.3);
        const ly = -8 + prog * 30;
        const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * amp;
        ctx.fillStyle = autumnColors(hue)[1];
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(prog * Math.PI * 3 + phase * 4);
        ctx.globalAlpha = 1 - prog * 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
    if (snowAmt > 0.02) {
      ctx.save();
      ctx.globalAlpha = snowAmt;
      BRANCHES.forEach(([_cx, _cy, tx, ty], i) => {
        ctx.fillStyle = "#f4f8ff";
        ctx.beginPath();
        ctx.ellipse(tx, ty - 0.5, 2.6 + i % 2 * 0.6, 1.5, tx < 0 ? -0.5 : 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = `rgba(200,224,255,${0.16 * snowAmt})`;
      ctx.beginPath();
      ctx.ellipse(-3, 19, 10, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  var VARIANTS = {
    Spring: { draw: drawOakSpring, anim: animOakSpring },
    Summer: { draw: drawOakSummer, anim: animOakSummer },
    Autumn: { draw: drawOakAutumn, anim: animOakAutumn },
    Winter: { draw: drawOakWinter, anim: animOakWinter }
  };
  var TRANSITIONS = {
    0: springToSummer,
    1: summerToAutumn,
    2: autumnToWinter
  };

  // src/textures/seasonal/flower/pansy.ts
  var VIOLET_DARK = "#5a2a8a";
  var VIOLET = "#8a44c8";
  var VIOLET_LIGHT = "#c089ee";
  var PETAL_EDGE = "#3d1a63";
  var THROAT_YELLOW = "#f4d23a";
  var STEM_DARK = "#2c5018";
  var STEM_GREEN = "#4f9a2e";
  var LEAF_GREEN = "#5aa336";
  var LEAF_DARK = "#2f5e1c";
  var MAUVE = "#a07296";
  var MAUVE_EDGE = "#6e4a52";
  var BROWN_EDGE = "#7a5230";
  var LEAF_YELLOW = "#b6a23a";
  var DEAD_BROWN = "#6b4a26";
  var DEAD_BROWN_LT = "#8c6638";
  function groundShadow2(ctx, rx = 14, alpha = 0.22) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 22, rx, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function soilClump(ctx, rx = 13) {
    ctx.fillStyle = "#5a3a18";
    ctx.beginPath();
    ctx.ellipse(0, 20, rx, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f2810";
    ctx.beginPath();
    ctx.ellipse(0, 21, rx * 0.65, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function stem(ctx, cx, cy, sway) {
    ctx.lineCap = "round";
    ctx.strokeStyle = STEM_DARK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 19);
    ctx.quadraticCurveTo(cx * 0.4 + sway * 0.5, 8, cx + sway, cy);
    ctx.stroke();
    ctx.strokeStyle = STEM_GREEN;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 19);
    ctx.quadraticCurveTo(cx * 0.4 + sway * 0.5, 8, cx + sway, cy);
    ctx.stroke();
    ctx.lineCap = "butt";
  }
  function leafPair(ctx, fill, edge, sway) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.quadraticCurveTo(-11, 13 + sway * 0.3, -16, 5 + sway);
    ctx.quadraticCurveTo(-8, 12, 0, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.quadraticCurveTo(11, 12 - sway * 0.3, 16, 4 - sway);
    ctx.quadraticCurveTo(8, 11, 0, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  function petal(ctx, cx, cy, angle, len, width, open, fill, edge) {
    if (open <= 1e-3) return;
    const L = len * open;
    const W = width * (0.4 + 0.6 * open);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-W, -L * 0.55, -W * 0.55, -L);
    ctx.quadraticCurveTo(0, -L * 1.12, W * 0.55, -L);
    ctx.quadraticCurveTo(W, -L * 0.55, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  function bloomFace(ctx, cx, cy, open, droop, glint, faded, podGrow) {
    if (open <= 1e-3) return;
    const fillMain = faded > 0.01 ? MAUVE : VIOLET;
    const fillLight = faded > 0.01 ? "#c4a0bc" : VIOLET_LIGHT;
    const edge = faded > 0.5 ? BROWN_EDGE : faded > 0.01 ? MAUVE_EDGE : PETAL_EDGE;
    const darkFill = faded > 0.01 ? MAUVE_EDGE : VIOLET_DARK;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(droop);
    petal(ctx, 0, 0, Math.PI, 11, 8, open, fillLight, edge);
    petal(ctx, 0, 0, Math.PI * 0.62, 10, 6.5, open, fillMain, edge);
    petal(ctx, 0, 0, -Math.PI * 0.62, 10, 6.5, open, fillMain, edge);
    petal(ctx, 0, -1, Math.PI * 0.18, 9, 6, open, darkFill, edge);
    petal(ctx, 0, -1, -Math.PI * 0.18, 9, 6, open, darkFill, edge);
    const whiskerA = Math.max(0, (open - 0.4) / 0.6) * (1 - faded * 0.7);
    if (whiskerA > 0.02) {
      ctx.strokeStyle = `rgba(42,17,64,${whiskerA})`;
      ctx.lineWidth = 0.9;
      [-0.9, -0.45, 0, 0.45, 0.9].forEach((a) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const ang = Math.PI - a;
        ctx.lineTo(Math.cos(ang + Math.PI / 2) * 7, Math.sin(ang + Math.PI / 2) * 7);
        ctx.stroke();
      });
    }
    if (podGrow < 0.99) {
      const ya = (1 - podGrow) * Math.min(1, open * 1.4);
      ctx.globalAlpha = ya;
      ctx.fillStyle = THROAT_YELLOW;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c89a16";
      ctx.beginPath();
      ctx.arc(0, 0.6, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (podGrow > 0.01) {
      ctx.globalAlpha = podGrow;
      const podGrad = ctx.createLinearGradient(0, -3, 0, 3);
      podGrad.addColorStop(0, "#9aa84a");
      podGrad.addColorStop(1, "#5f6b22");
      ctx.fillStyle = podGrad;
      ctx.beginPath();
      ctx.ellipse(0, -0.5, 2.6 * podGrow + 0.6, 3.4 * podGrow + 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3f4a14";
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (glint > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + glint * 0.45})`;
      ctx.beginPath();
      ctx.arc(-2.4, -4.2, 1.2 + glint * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function bud(ctx, cx, cy, open, sliverPulse) {
    ctx.save();
    ctx.translate(cx, cy);
    const grad = ctx.createLinearGradient(0, -8, 0, 4);
    grad.addColorStop(0, "#7ec24a");
    grad.addColorStop(1, STEM_DARK);
    ctx.fillStyle = grad;
    ctx.strokeStyle = LEAF_DARK;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -9 - open * 1.5);
    ctx.quadraticCurveTo(-5, -2, -3.4, 3);
    ctx.quadraticCurveTo(0, 5, 3.4, 3);
    ctx.quadraticCurveTo(5, -2, 0, -9 - open * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const sw = 1.2 + open * 3.4;
    const sh = 2 + open * 4;
    const pulse = 0.85 + sliverPulse * 0.15;
    ctx.fillStyle = VIOLET;
    ctx.beginPath();
    ctx.ellipse(0, -8 - open * 1.2, sw * pulse, sh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = VIOLET_LIGHT;
    ctx.beginPath();
    ctx.ellipse(-0.5, -8.6 - open * 1.2, sw * 0.45 * pulse, sh * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function springScene(ctx, sway, sliverPulse) {
    groundShadow2(ctx, 12, 0.2);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = -2;
    stem(ctx, cx, cy + 2, sway);
    leafPair(ctx, LEAF_GREEN, LEAF_DARK, sway * 0.4);
    bud(ctx, cx + sway, cy, 0.35, sliverPulse);
  }
  function drawPansySpring(ctx) {
    springScene(ctx, 0, 0.5);
  }
  function animPansySpring(ctx, t) {
    const sway = Math.sin(t * 1.6) * 1.6;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    springScene(ctx, sway, pulse);
  }
  function summerScene(ctx, sway, glint) {
    groundShadow2(ctx, 12, 0.2);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = -2;
    stem(ctx, cx, cy + 4, sway);
    leafPair(ctx, LEAF_GREEN, LEAF_DARK, sway * 0.4);
    bloomFace(ctx, cx + sway, cy, 1, sway * 0.012, glint, 0, 0);
  }
  function drawPansySummer(ctx) {
    summerScene(ctx, 0, 0.4);
  }
  function animPansySummer(ctx, t) {
    const sway = Math.sin(t * 1.5) * 1.8;
    const glint = 0.5 + 0.5 * Math.sin(t * 2.2);
    summerScene(ctx, sway, glint);
  }
  function autumnScene(ctx, sway, driftProg) {
    groundShadow2(ctx, 12, 0.22);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = 0;
    stem(ctx, cx + 1, cy + 4, sway);
    leafPair(ctx, LEAF_YELLOW, "#6b5210", sway * 0.4);
    bloomFace(ctx, cx + sway, cy, 0.86, 0.28 + sway * 0.012, 0, 1, 0.4);
    ctx.save();
    const dp = driftProg;
    const px = cx + 6 + dp * 8;
    const py = cy - 4 + dp * 18;
    ctx.globalAlpha = Math.max(0, 1 - dp);
    ctx.translate(px, py);
    ctx.rotate(dp * 2.2);
    ctx.fillStyle = MAUVE;
    ctx.strokeStyle = BROWN_EDGE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4, -3, -2, -7);
    ctx.quadraticCurveTo(0, -9, 2, -7);
    ctx.quadraticCurveTo(4, -3, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function drawPansyAutumn(ctx) {
    autumnScene(ctx, 0, 0.15);
  }
  function animPansyAutumn(ctx, t) {
    const sway = Math.sin(t * 0.95) * 1.4;
    const driftProg = t * 0.32 % 1;
    autumnScene(ctx, sway, driftProg);
  }
  function winterScene(ctx, flakes, sheen) {
    groundShadow2(ctx, 14, 0.18);
    const snow = ctx.createLinearGradient(0, 14, 0, 24);
    snow.addColorStop(0, "#eef4fb");
    snow.addColorStop(1, "#c2d2e4");
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 20, 17, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = DEAD_BROWN;
    ctx.strokeStyle = "#4a3018";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-13, 18);
    ctx.quadraticCurveTo(-18, 15, -14, 13);
    ctx.quadraticCurveTo(-10, 15, -7, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = DEAD_BROWN_LT;
    ctx.beginPath();
    ctx.moveTo(13, 17);
    ctx.quadraticCurveTo(18, 14, 14, 12);
    ctx.quadraticCurveTo(10, 14, 7, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#4a3219";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 19);
    ctx.quadraticCurveTo(1.5, 12, 2, 7);
    ctx.stroke();
    ctx.strokeStyle = DEAD_BROWN_LT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 19);
    ctx.quadraticCurveTo(1.5, 12, 2, 7);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = "#f4f8ff";
    ctx.beginPath();
    ctx.ellipse(2, 6.5, 3.4, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(200,224,255,${0.18 + sheen * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(-3, 18, 9, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    flakes.forEach(([fx, fy, r]) => {
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function drawPansyWinter(ctx) {
    winterScene(
      ctx,
      [
        [-8, -6, 1.4],
        [4, 2, 1.1],
        [10, -12, 1],
        [-2, 9, 1.2]
      ],
      0.4
    );
  }
  function animPansyWinter(ctx, t) {
    const span = 30;
    const seeds = [
      [-8, 1.4, 0],
      [4, 1.1, 0.45],
      [10, 1, 0.7],
      [-2, 1.2, 0.25]
    ];
    const flakes = seeds.map(([fx, r, phase]) => {
      const prog = ((t / 3.2 + phase) % 1 + 1) % 1;
      const fy = -22 + prog * span;
      const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
      return [driftX, fy, r];
    });
    const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
    winterScene(ctx, flakes, sheen);
  }
  function springToSummer2(ctx, p) {
    const q = Math.max(0, Math.min(1, p));
    groundShadow2(ctx, 12, 0.2);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = -2;
    stem(ctx, cx, cy + 4, 0);
    leafPair(ctx, LEAF_GREEN, LEAF_DARK, 0);
    if (q < 0.45) {
      const o = 0.35 + q / 0.45 * 0.55;
      bud(ctx, cx, cy, o, 0.5);
    } else {
      const open = (q - 0.45) / 0.55;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - open * 1.6);
      bud(ctx, cx, cy, 0.9, 0.5);
      ctx.restore();
      ctx.globalAlpha = 1;
      bloomFace(ctx, cx, cy, open, 0, 0.3, 0, 0);
    }
  }
  function summerToAutumn2(ctx, p) {
    const q = Math.max(0, Math.min(1, p));
    groundShadow2(ctx, 12, 0.21);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = -2 + q * 2;
    stem(ctx, cx, cy + 4, 0);
    const lf = q < 0.5 ? LEAF_GREEN : LEAF_YELLOW;
    const le = q < 0.5 ? LEAF_DARK : "#6b5210";
    leafPair(ctx, lf, le, 0);
    const faded = q;
    const droop = q * 0.28;
    const pod = Math.max(0, (q - 0.4) / 0.6);
    const open = 1 - q * 0.14;
    bloomFace(ctx, cx, cy, open, droop, 0, faded > 0 ? Math.max(0.02, faded) : 0, pod);
  }
  function autumnToWinter2(ctx, p) {
    const q = Math.max(0, Math.min(1, p));
    groundShadow2(ctx, q < 0.5 ? 12 : 13, 0.2);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = 0;
    const wither = Math.min(1, q / 0.55);
    const snowing = Math.max(0, (q - 0.45) / 0.55);
    stem(ctx, cx + 1 * (1 - q), cy + 4 - q * 2, 0);
    if (q > 0.3) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (q - 0.3) / 0.4);
      ctx.lineCap = "round";
      ctx.strokeStyle = "#4a3219";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 19);
      ctx.quadraticCurveTo(1.5, 12, 2, 7);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (q < 0.6) {
      leafPair(ctx, LEAF_YELLOW, "#6b5210", 0);
    } else {
      const ca = Math.min(1, (q - 0.6) / 0.4);
      ctx.save();
      ctx.globalAlpha = 1 - ca * 0.6;
      leafPair(ctx, "#8a7028", "#5a4010", 0);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalAlpha = ca;
      ctx.fillStyle = DEAD_BROWN;
      ctx.strokeStyle = "#4a3018";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-13, 18);
      ctx.quadraticCurveTo(-18, 15, -14, 13);
      ctx.quadraticCurveTo(-10, 15, -7, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const open = Math.max(0, 0.86 * (1 - wither));
    if (open > 0.01) {
      bloomFace(ctx, cx, cy, open, 0.28 + wither * 0.2, 0, 1, Math.min(0.9, 0.4 + wither * 0.5));
    }
    if (snowing > 0.01) {
      ctx.save();
      ctx.globalAlpha = snowing;
      const snow = ctx.createLinearGradient(0, 14, 0, 24);
      snow.addColorStop(0, "#eef4fb");
      snow.addColorStop(1, "#c2d2e4");
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.ellipse(0, 20, 10 + snowing * 7, 4 + snowing * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4f8ff";
      ctx.beginPath();
      ctx.ellipse(2, 6.5, 1.4 + snowing * 2, 1 + snowing * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  var VARIANTS2 = {
    Spring: { draw: drawPansySpring, anim: animPansySpring },
    Summer: { draw: drawPansySummer, anim: animPansySummer },
    Autumn: { draw: drawPansyAutumn, anim: animPansyAutumn },
    Winter: { draw: drawPansyWinter, anim: animPansyWinter }
  };
  var TRANSITIONS2 = {
    0: springToSummer2,
    1: summerToAutumn2,
    2: autumnToWinter2
  };

  // src/textures/seasonal/fruit/apple.ts
  function groundShadow3(ctx, rx = 14, alpha = 0.22) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 22, rx, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function twig(ctx, lean, dead) {
    const darkBark = dead ? "#3a2b1c" : "#5a3d1e";
    const liteBark = dead ? "#5c4630" : "#8a5e2c";
    ctx.lineCap = "round";
    ctx.strokeStyle = darkBark;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(-2, 22);
    ctx.quadraticCurveTo(2, 4, 8 + lean, -14);
    ctx.stroke();
    ctx.strokeStyle = liteBark;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, 22);
    ctx.quadraticCurveTo(2, 4, 8 + lean, -14);
    ctx.stroke();
    ctx.strokeStyle = darkBark;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(1, 7);
    ctx.quadraticCurveTo(-7, -2, -9 + lean * 0.4, -10);
    ctx.stroke();
    ctx.strokeStyle = liteBark;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(1, 7);
    ctx.quadraticCurveTo(-7, -2, -9 + lean * 0.4, -10);
    ctx.stroke();
    ctx.lineCap = "butt";
  }
  function leaf(ctx, x, y, angle, len, dark, lite) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
    ctx.fill();
    ctx.fillStyle = lite;
    ctx.beginPath();
    ctx.moveTo(len * 0.1, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.3, len * 0.86, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.3, len * 0.1, 0);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(len * 0.08, 0);
    ctx.lineTo(len * 0.9, 0);
    ctx.stroke();
    ctx.restore();
  }
  function apple(ctx, x, y, r, skin, blush, glint, withStem) {
    ctx.save();
    ctx.translate(x, y);
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r * 1.25);
    grad.addColorStop(0, skin.hi);
    grad.addColorStop(0.55, skin.mid);
    grad.addColorStop(1, skin.lo);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.78);
    ctx.bezierCurveTo(-r * 0.7, -r * 1.05, -r * 1.18, -r * 0.4, -r * 1.05, r * 0.18);
    ctx.bezierCurveTo(-r * 0.95, r * 0.95, -r * 0.35, r * 1.15, 0, r * 0.95);
    ctx.bezierCurveTo(r * 0.35, r * 1.15, r * 0.95, r * 0.95, r * 1.05, r * 0.18);
    ctx.bezierCurveTo(r * 1.18, -r * 0.4, r * 0.7, -r * 1.05, 0, -r * 0.78);
    ctx.fill();
    if (blush.amt > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, blush.amt) * 0.8;
      const bg = ctx.createRadialGradient(r * 0.35, r * 0.1, 0, r * 0.35, r * 0.1, r * 0.85);
      bg.addColorStop(0, blush.color);
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(r * 0.3, r * 0.05, r * 0.75, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.72, r * 0.22, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    if (withStem) {
      ctx.strokeStyle = "#5a3d1e";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75);
      ctx.quadraticCurveTo(r * 0.18, -r * 1.2, r * 0.45, -r * 1.35);
      ctx.stroke();
      ctx.lineCap = "butt";
      leaf(ctx, r * 0.4, -r * 1.28, -0.5, r * 0.7, "#3f6b1c", "#6fae35");
    }
    const gx = -r * 0.4 + Math.sin(glint * Math.PI * 2) * r * 0.12;
    const gy = -r * 0.45;
    const ga = 0.5 + 0.35 * (0.5 + 0.5 * Math.sin(glint * Math.PI * 2));
    ctx.fillStyle = `rgba(255,255,255,${ga})`;
    ctx.beginPath();
    ctx.ellipse(gx, gy, r * 0.26, r * 0.34, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, ga + 0.25)})`;
    ctx.beginPath();
    ctx.arc(gx - r * 0.1, gy - r * 0.1, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function blossom(ctx, x, y, r, open, alpha) {
    if (open <= 0.01 || alpha <= 0.01) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = Math.min(1, alpha);
    const pr = r * open;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(a);
      const pg = ctx.createLinearGradient(0, 0, 0, -pr);
      pg.addColorStop(0, "#f7c9d6");
      pg.addColorStop(1, "#fff4f7");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(0, -pr * 0.55, pr * 0.42, pr * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#f2c84a";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d99a1f";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  var LEAF_GREEN2 = { dark: "#2f5916", lite: "#6fae35" };
  var LEAF_GOLD = { dark: "#9a6a16", lite: "#e0a73a" };
  var GREEN_SKIN = { hi: "#cfe88a", mid: "#7fb53a", lo: "#3f6b1c" };
  var RED_SKIN = { hi: "#ff7a5e", mid: "#d6322a", lo: "#7c1410" };
  var DULL_RED_SKIN = { hi: "#a8584e", mid: "#8a2f2a", lo: "#521012" };
  function appleSpring(ctx, sway, glint) {
    groundShadow3(ctx, 12, 0.2);
    twig(ctx, sway * 0.4, false);
    leaf(ctx, 6, -2, -0.9 + sway * 0.04, 11, LEAF_GREEN2.dark, LEAF_GREEN2.lite);
    leaf(ctx, -6, -1, 3.3 - sway * 0.04, 9, LEAF_GREEN2.dark, LEAF_GREEN2.lite);
    leaf(ctx, 9, -12, -1.5, 8, LEAF_GREEN2.dark, LEAF_GREEN2.lite);
    ctx.fillStyle = "#7fb53a";
    ctx.beginPath();
    ctx.arc(-8 + sway * 0.3, -9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(-9 + sway * 0.3, -10, 1, 0, Math.PI * 2);
    ctx.fill();
    blossom(ctx, 0 + sway, 0, 8, 1, 1);
    blossom(ctx, 11 + sway * 1.2, -10, 5, 1, 0.95);
    const ga = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(glint));
    ctx.fillStyle = `rgba(255,255,255,${ga})`;
    ctx.beginPath();
    ctx.arc(-2 + sway, -2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawAppleSpring(ctx) {
    appleSpring(ctx, 0, 0.3);
  }
  function animAppleSpring(ctx, t) {
    const sway = Math.sin(t * 1.3) * 1.8;
    appleSpring(ctx, sway, t * 2.4);
  }
  function appleSummer(ctx, bob, glint) {
    groundShadow3(ctx, 12, 0.2);
    twig(ctx, bob * 0.3, false);
    leaf(ctx, 7, -10, -0.7, 12, LEAF_GREEN2.dark, LEAF_GREEN2.lite);
    leaf(ctx, -7, -2, 3.2, 10, LEAF_GREEN2.dark, LEAF_GREEN2.lite);
    leaf(ctx, 11, -1, -0.2, 9, LEAF_GREEN2.dark, LEAF_GREEN2.lite);
    apple(ctx, 9, -11, 5, GREEN_SKIN, { color: "#cfe88a", amt: 0 }, (glint + 0.3) % 1, false);
    apple(ctx, -1, 2 + bob, 10, GREEN_SKIN, { color: "#e8f0a0", amt: 0.25 }, glint, true);
  }
  function drawAppleSummer(ctx) {
    appleSummer(ctx, 0, 0.3);
  }
  function animAppleSummer(ctx, t) {
    const bob = Math.sin(t * 1.3) * 1.6;
    const glint = t * 0.45 % 1;
    appleSummer(ctx, bob, glint);
  }
  function appleAutumn(ctx, bob, glint, leafFall) {
    groundShadow3(ctx, 13, 0.22);
    twig(ctx, bob * 0.3, false);
    leaf(ctx, 7, -10, -0.7, 12, LEAF_GOLD.dark, LEAF_GOLD.lite);
    leaf(ctx, -7, -2, 3.2, 10, LEAF_GOLD.dark, LEAF_GOLD.lite);
    apple(ctx, 10, -10, 5.5, RED_SKIN, { color: "#ffcf6a", amt: 0.5 }, (glint + 0.4) % 1, false);
    apple(ctx, -1, 3 + bob, 11, RED_SKIN, { color: "#ffd166", amt: 0.7 }, glint, true);
    leaf(ctx, leafFall.x, leafFall.y, leafFall.rot, 9, LEAF_GOLD.dark, LEAF_GOLD.lite);
  }
  function drawAppleAutumn(ctx) {
    appleAutumn(ctx, 0, 0.3, { x: 14, y: 8, rot: 0.6 });
  }
  function animAppleAutumn(ctx, t) {
    const bob = Math.sin(t * 1) * 1.7;
    const glint = t * 0.5 % 1;
    const prog = (t / 4 % 1 + 1) % 1;
    const leafFall = {
      x: 12 + Math.sin(prog * Math.PI * 2) * 4,
      y: -12 + prog * 30,
      rot: 0.4 + prog * Math.PI * 2
    };
    appleAutumn(ctx, bob, glint, leafFall);
  }
  function appleWinter(ctx, flakes, sheen, sway) {
    groundShadow3(ctx, 14, 0.18);
    const snow = ctx.createLinearGradient(0, 16, 0, 24);
    snow.addColorStop(0, "#eef4fb");
    snow.addColorStop(1, "#c2d2e4");
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 21, 16, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    twig(ctx, sway * 0.3, true);
    ctx.fillStyle = "#f4f8ff";
    ctx.beginPath();
    ctx.ellipse(8 + sway * 0.3, -14, 3.4, 1.8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2, 4, 2.6, 1.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    apple(ctx, -1 + sway * 0.5, 3, 10, DULL_RED_SKIN, { color: "#7c4a30", amt: 0.35 }, 0.5, false);
    ctx.strokeStyle = "rgba(60,16,18,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-5 + sway * 0.5, 0);
    ctx.quadraticCurveTo(-1 + sway * 0.5, 4, 4 + sway * 0.5, 1);
    ctx.stroke();
    ctx.fillStyle = "rgba(244,248,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(-1 + sway * 0.5, -5, 6, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(200,224,255,${0.3 + sheen * 0.25})`;
    ctx.beginPath();
    ctx.arc(-4 + sway * 0.5, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    flakes.forEach(([fx, fy, r]) => {
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function drawAppleWinter(ctx) {
    appleWinter(
      ctx,
      [
        [-8, -6, 1.4],
        [6, 2, 1.1],
        [11, -12, 1],
        [-3, 10, 1.2]
      ],
      0.4,
      0
    );
  }
  function animAppleWinter(ctx, t) {
    const span = 30;
    const seeds = [
      [-8, 1.4, 0],
      [6, 1.1, 0.45],
      [11, 1, 0.7],
      [-3, 1.2, 0.25]
    ];
    const flakes = seeds.map(([fx, r, phase]) => {
      const prog = ((t / 3.2 + phase) % 1 + 1) % 1;
      const fy = -22 + prog * span;
      const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
      return [driftX, fy, r];
    });
    const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
    const sway = Math.sin(t * 0.7) * 0.8;
    appleWinter(ctx, flakes, sheen, sway);
  }
  function lerp2(a, b, p) {
    return a + (b - a) * p;
  }
  function clamp01(p) {
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }
  function mixHex(c1, c2, p) {
    const a = parseInt(c1.slice(1), 16);
    const b = parseInt(c2.slice(1), 16);
    const r = Math.round(lerp2(a >> 16 & 255, b >> 16 & 255, p));
    const g = Math.round(lerp2(a >> 8 & 255, b >> 8 & 255, p));
    const bl = Math.round(lerp2(a & 255, b & 255, p));
    return `rgb(${r},${g},${bl})`;
  }
  function mixSkin(s1, s2, p) {
    return {
      hi: mixHex(s1.hi, s2.hi, p),
      mid: mixHex(s1.mid, s2.mid, p),
      lo: mixHex(s1.lo, s2.lo, p)
    };
  }
  function springToSummer3(ctx, p) {
    const q = clamp01(p);
    groundShadow3(ctx, 12, 0.2);
    twig(ctx, 0, false);
    leaf(ctx, 7, -10, -0.7, lerp2(11, 12, q), LEAF_GREEN2.dark, LEAF_GREEN2.lite);
    leaf(ctx, -7, -2, 3.2, lerp2(9, 10, q), LEAF_GREEN2.dark, LEAF_GREEN2.lite);
    leaf(ctx, 11, -1, -0.2, lerp2(8, 9, q), LEAF_GREEN2.dark, LEAF_GREEN2.lite);
    if (q > 0.4) {
      apple(ctx, 9, -11, lerp2(2, 5, (q - 0.4) / 0.6), GREEN_SKIN, { color: "#cfe88a", amt: 0 }, 0.3, false);
    }
    const r = lerp2(3, 10, q);
    const fy = lerp2(-2, 2, q);
    apple(ctx, lerp2(-3, -1, q), fy, r, GREEN_SKIN, { color: "#e8f0a0", amt: lerp2(0, 0.25, q) }, 0.3, q > 0.3);
    const fade = clamp01(1 - q / 0.7);
    if (fade > 0.01) {
      const fall = q * 14;
      blossom(ctx, 2, 0 + fall, 8, fade, fade);
      blossom(ctx, 11, -10 + fall * 0.8, 5, fade, fade * 0.9);
    }
  }
  function summerToAutumn3(ctx, p) {
    const q = clamp01(p);
    groundShadow3(ctx, lerp2(12, 13, q), lerp2(0.2, 0.22, q));
    twig(ctx, 0, false);
    const ld = mixHex(LEAF_GREEN2.dark, LEAF_GOLD.dark, q);
    const ll = mixHex(LEAF_GREEN2.lite, LEAF_GOLD.lite, q);
    leaf(ctx, 7, -10, -0.7, 12, ld, ll);
    leaf(ctx, -7, -2, 3.2, 10, ld, ll);
    leaf(ctx, 11, -1, -0.2, lerp2(9, 0.01, q), ld, ll);
    const skin2 = mixSkin(GREEN_SKIN, RED_SKIN, q);
    apple(ctx, 10, -10, lerp2(5, 5.5, q), skin2, { color: mixHex("#cfe88a", "#ffcf6a", q), amt: lerp2(0, 0.5, q) }, 0.3, false);
    const skin = mixSkin(GREEN_SKIN, RED_SKIN, q);
    const blushColor = mixHex("#e8f0a0", "#ffd166", q);
    apple(ctx, -1, lerp2(2, 3, q), lerp2(10, 11, q), skin, { color: blushColor, amt: lerp2(0.25, 0.7, q) }, 0.3, true);
  }
  function autumnToWinter3(ctx, p) {
    const q = clamp01(p);
    groundShadow3(ctx, 14, lerp2(0.22, 0.18, q));
    const snowAmt = clamp01((q - 0.5) / 0.5);
    if (snowAmt > 0.01) {
      ctx.save();
      ctx.globalAlpha = snowAmt;
      const snow = ctx.createLinearGradient(0, 16, 0, 24);
      snow.addColorStop(0, "#eef4fb");
      snow.addColorStop(1, "#c2d2e4");
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.ellipse(0, 21, lerp2(8, 16, snowAmt), lerp2(3, 5.5, snowAmt), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    twig(ctx, 0, q > 0.5);
    const leafLife = clamp01(1 - q / 0.5);
    if (leafLife > 0.01) {
      ctx.save();
      ctx.globalAlpha = leafLife;
      const drop = (1 - leafLife) * 16;
      leaf(ctx, 7, -10 + drop, -0.7 + (1 - leafLife), 12 * leafLife + 2, LEAF_GOLD.dark, LEAF_GOLD.lite);
      leaf(ctx, -7, -2 + drop, 3.2 + (1 - leafLife), 10 * leafLife + 2, LEAF_GOLD.dark, LEAF_GOLD.lite);
      ctx.restore();
    }
    if (q < 0.6) {
      const a2 = clamp01(1 - q / 0.6);
      ctx.save();
      ctx.globalAlpha = a2;
      apple(ctx, 10, -10, 5.5, mixSkin(RED_SKIN, DULL_RED_SKIN, q), { color: "#7c4a30", amt: 0.4 }, 0.5, false);
      ctx.restore();
    }
    const skin = mixSkin(RED_SKIN, DULL_RED_SKIN, q);
    apple(ctx, -1, 3, lerp2(11, 10, q), skin, { color: mixHex("#ffd166", "#7c4a30", q), amt: lerp2(0.7, 0.35, q) }, 0.5, q < 0.5);
    if (snowAmt > 0.01) {
      ctx.save();
      ctx.globalAlpha = snowAmt;
      ctx.fillStyle = "#f4f8ff";
      ctx.beginPath();
      ctx.ellipse(8, -14, 3.4 * snowAmt, 1.8 * snowAmt, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(244,248,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(-1, -5, lerp2(3, 6, snowAmt), lerp2(1.4, 2.6, snowAmt), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  var VARIANTS3 = {
    Spring: { draw: drawAppleSpring, anim: animAppleSpring },
    Summer: { draw: drawAppleSummer, anim: animAppleSummer },
    Autumn: { draw: drawAppleAutumn, anim: animAppleAutumn },
    Winter: { draw: drawAppleWinter, anim: animAppleWinter }
  };
  var TRANSITIONS3 = {
    0: springToSummer3,
    1: summerToAutumn3,
    2: autumnToWinter3
  };

  // ../../../tmp/tiles_entry.ts
  window.SEASONAL_DEMO = {
    tiles: [
      { key: "tile_tree_oak", label: "Oak", family: "tree", V: VARIANTS, T: TRANSITIONS },
      { key: "tile_flower_pansy", label: "Pansy", family: "flower", V: VARIANTS2, T: TRANSITIONS2 },
      { key: "tile_fruit_apple", label: "Apple", family: "fruit", V: VARIANTS3, T: TRANSITIONS3 }
    ]
  };
})();
