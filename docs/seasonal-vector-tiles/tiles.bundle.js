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
  function winterOak(ctx, sway, flakes, sheen2) {
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
    ctx.fillStyle = `rgba(200,224,255,${0.16 + sheen2 * 0.16})`;
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
    const sheen2 = 0.5 + 0.5 * Math.sin(t * 0.7);
    winterOak(ctx, sway, flakes, sheen2);
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

  // src/textures/seasonal/tree/birch.ts
  function clamp01(x) {
    if (!Number.isFinite(x)) return 0;
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function lerp2(a, b, f) {
    return a + (b - a) * f;
  }
  function lerp3(a, b, f) {
    return [lerp2(a[0], b[0], f), lerp2(a[1], b[1], f), lerp2(a[2], b[2], f)];
  }
  function rgb(c, alpha = 1) {
    const r = Math.round(clamp01(c[0] / 255) * 255);
    const g = Math.round(clamp01(c[1] / 255) * 255);
    const b = Math.round(clamp01(c[2] / 255) * 255);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  function scale3(c, k) {
    return [c[0] * k, c[1] * k, c[2] * k];
  }
  var smoother = (x) => {
    const c = clamp01(x);
    return c * c * c * (c * (6 * c - 15) + 10);
  };
  function bobAt(t, A = 0.6, w = 1.2) {
    return A * (1 - Math.cos(w * t)) * 0.5;
  }
  var SP = {
    Spring: {
      foliageDark: [78, 122, 52],
      foliageMid: [134, 188, 78],
      foliageLight: [196, 226, 132],
      bark: [238, 240, 236],
      barkShade: [196, 202, 200],
      lenticel: [70, 70, 66],
      padGrass: [126, 196, 86],
      soil: [104, 78, 44],
      outlineTint: [44, 50, 38],
      lightTint: [210, 235, 230],
      // cool-bright
      leafDensity: 0.6,
      catkinAmt: 0.85,
      frostAmt: 0,
      branchSnowAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0.5,
      fallenLeafAmt: 0,
      lightStrength: 0.22,
      shadowStrength: 0.2
    },
    Summer: {
      foliageDark: [42, 92, 32],
      foliageMid: [70, 142, 44],
      foliageLight: [148, 200, 86],
      bark: [240, 242, 238],
      barkShade: [194, 200, 196],
      lenticel: [64, 64, 60],
      padGrass: [70, 158, 64],
      soil: [96, 70, 40],
      outlineTint: [36, 48, 30],
      lightTint: [255, 244, 206],
      // warm
      leafDensity: 1,
      catkinAmt: 0,
      frostAmt: 0,
      branchSnowAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      lightStrength: 0.24,
      shadowStrength: 0.26
    },
    Autumn: {
      foliageDark: [150, 92, 24],
      foliageMid: [224, 168, 44],
      foliageLight: [248, 214, 96],
      bark: [232, 230, 220],
      barkShade: [188, 184, 172],
      lenticel: [72, 60, 44],
      padGrass: [150, 144, 86],
      soil: [110, 80, 44],
      outlineTint: [54, 42, 26],
      lightTint: [250, 220, 168],
      // low amber
      leafDensity: 0.78,
      catkinAmt: 0,
      frostAmt: 0,
      branchSnowAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0.6,
      lightStrength: 0.26,
      shadowStrength: 0.22
    },
    Winter: {
      foliageDark: [120, 132, 120],
      foliageMid: [160, 172, 160],
      foliageLight: [200, 210, 204],
      bark: [236, 240, 244],
      barkShade: [188, 198, 206],
      lenticel: [58, 60, 64],
      padGrass: [196, 210, 224],
      soil: [120, 126, 136],
      outlineTint: [46, 52, 62],
      lightTint: [206, 222, 240],
      // cool blue-grey
      leafDensity: 0,
      catkinAmt: 0,
      frostAmt: 0.8,
      branchSnowAmt: 0.85,
      padSnowAmt: 1,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      lightStrength: 0.2,
      shadowStrength: 0.16
    }
  };
  var BRANCHES2 = [
    [-5, -6, -13, -15, 2],
    [-2, -12, -7, -22, 1.7],
    [3, -12, 7, -23, 1.8],
    [6, -6, 13, -14, 2],
    [0, -10, 1, -25, 1.8],
    [-8, -2, -15, -7, 1.6],
    [8, -2, 16, -6, 1.6]
  ];
  var CLUSTERS = [
    [-12, -14, 5],
    [-5, -20, 5.6],
    [4, -21, 5.6],
    [13, -13, 5],
    [0, -9, 4.4],
    [-15, -7, 3.8],
    [16, -6, 3.8],
    [-3, -17, 4.6],
    [7, -16, 4.6]
  ];
  function padEllipse(ctx, p) {
    ctx.fillStyle = `rgba(0,0,0,${0.24 * p.shadowStrength + 0.04})`;
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 17, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(scale3(p.padGrass, 0.6), 1);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.padGrass, 1);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.padSnowAmt < 0.6) {
      ctx.fillStyle = rgb(scale3(p.padGrass, 1.12), 1 - p.padSnowAmt);
      const tufts = 11;
      for (let i = 0; i < tufts; i++) {
        const a = i / tufts * Math.PI * 2;
        const tx = Math.cos(a) * 17;
        const ty = 19 + Math.sin(a) * 4.7;
        if (ty < 17) continue;
        ctx.beginPath();
        ctx.ellipse(tx, ty, 2, 1.3, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = rgb(p.soil, 1);
    ctx.beginPath();
    ctx.ellipse(0, 19.4, 6.5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.blossomAmt > 0.02) {
      const spots = [
        [-12, 20],
        [-6, 21.6],
        [8, 21],
        [13, 19.6],
        [2, 22],
        [-2, 19.6]
      ];
      spots.forEach(([sx, sy], i) => {
        const a = p.blossomAmt * (i % 2 === 0 ? 0.9 : 0.7);
        ctx.fillStyle = `rgba(255,236,246,${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(248,210,90,${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.45, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (p.fallenLeafAmt > 0.02) {
      const leaves = [
        [-8, 20.4, 0.5],
        [6, 21.4, -0.4],
        [-1, 22, 0.2],
        [11, 20, 0.8]
      ];
      leaves.forEach(([lx, ly, rot], i) => {
        if (i / leaves.length > p.fallenLeafAmt + 0.05) return;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgb(p.foliageMid, Math.min(1, p.fallenLeafAmt + 0.3));
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgb(p.outlineTint, 0.4);
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
      });
    }
    if (p.padSnowAmt > 0.02) {
      const snow = ctx.createLinearGradient(0, 15, 0, 23);
      snow.addColorStop(0, "#eef4fb");
      snow.addColorStop(1, "#c6d6e6");
      ctx.save();
      ctx.globalAlpha = p.padSnowAmt;
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.ellipse(0, 18.6, 18, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (p.frostAmt > 0.02) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 * p.frostAmt + 0.3})`;
        const sparkle = [
          [-10, 18],
          [-4, 20],
          [3, 19],
          [9, 20.5],
          [13, 18.5],
          [-13, 19.5]
        ];
        sparkle.forEach(([sx, sy], i) => {
          if (i / sparkle.length > p.frostAmt) return;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
  }
  function trunk2(ctx, p) {
    ctx.fillStyle = rgb(p.outlineTint, 0.9);
    ctx.beginPath();
    ctx.moveTo(-4, 19);
    ctx.quadraticCurveTo(-3, 4, -2.4, -4);
    ctx.lineTo(2.4, -4);
    ctx.quadraticCurveTo(3, 4, 4, 19);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.barkShade, 1);
    ctx.beginPath();
    ctx.moveTo(-3.2, 19);
    ctx.quadraticCurveTo(-2.4, 4, -1.9, -4);
    ctx.lineTo(1.9, -4);
    ctx.quadraticCurveTo(2.4, 4, 3.2, 19);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.bark, 1);
    ctx.beginPath();
    ctx.moveTo(-3.2, 19);
    ctx.quadraticCurveTo(-2.4, 4, -1.9, -4);
    ctx.lineTo(0.6, -4);
    ctx.quadraticCurveTo(0.2, 6, -0.4, 19);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(scale3(p.bark, 0.86), 1);
    ctx.beginPath();
    ctx.moveTo(-3.2, 19);
    ctx.quadraticCurveTo(-6.5, 18.4, -8, 19.6);
    ctx.quadraticCurveTo(-5, 19.6, -2.8, 18.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3.2, 19);
    ctx.quadraticCurveTo(6.5, 18.4, 8, 19.6);
    ctx.quadraticCurveTo(5, 19.6, 2.8, 18.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb(p.lenticel, 0.9);
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    const marks = [
      [-1.4, 15, 2.2],
      [0.8, 11, 1.6],
      [-1, 7, 2],
      [1, 3, 1.4],
      [-0.8, -0.5, 1.8]
    ];
    marks.forEach(([mx, my, w]) => {
      ctx.beginPath();
      ctx.moveTo(mx - w / 2, my);
      ctx.lineTo(mx + w / 2, my + 0.4);
      ctx.stroke();
    });
    ctx.lineCap = "butt";
  }
  function branches(ctx, p, sway) {
    ctx.lineCap = "round";
    BRANCHES2.forEach(([cx, cy, tx, ty, w], i) => {
      const s = sway * (0.4 + Math.abs(tx) / 24);
      ctx.strokeStyle = rgb(scale3(p.bark, 0.9), 1);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(cx + s * 0.5, cy, tx + s, ty);
      ctx.stroke();
      ctx.strokeStyle = rgb(p.outlineTint, 0.5);
      ctx.lineWidth = w * 0.45;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(cx + s * 0.5 + 0.5, cy + 0.6, tx + s + 0.4, ty + 0.6);
      ctx.stroke();
      ctx.strokeStyle = rgb(scale3(p.bark, 0.85), 1);
      ctx.lineWidth = w * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.5, cy);
      ctx.lineTo(cx + s * 0.5 + (tx < 0 ? -4 : 4), cy - 5);
      ctx.stroke();
      if (p.branchSnowAmt > 0.02 && ty < -8) {
        ctx.strokeStyle = `rgba(244,248,255,${p.branchSnowAmt})`;
        ctx.lineWidth = w * 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.quadraticCurveTo(cx + s * 0.5, cy - 1, tx + s, ty - 1);
        ctx.stroke();
        ctx.fillStyle = `rgba(244,248,255,${p.branchSnowAmt})`;
        ctx.beginPath();
        ctx.ellipse(tx + s, ty - 0.8, 2.2 + i % 2 * 0.5, 1.3, tx < 0 ? -0.5 : 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.lineCap = "butt";
  }
  function canopyBlob2(ctx, x, y, r, p, alpha) {
    if (r < 0.4 || alpha < 0.02) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rgb(p.foliageDark, 1);
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.18, r, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
    grad.addColorStop(0, rgb(p.foliageLight, 1));
    grad.addColorStop(0.55, rgb(p.foliageMid, 1));
    grad.addColorStop(1, rgb(p.foliageDark, 1));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.95, r * 0.84, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = rgb(p.foliageLight, 1);
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.32, r * 0.26, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function canopy(ctx, p, sway, shimmer) {
    const d = clamp01(p.leafDensity);
    if (d < 0.03) return;
    CLUSTERS.forEach(([x, y, r], i) => {
      const threshold = i / CLUSTERS.length;
      const grow = clamp01((d - threshold * 0.55) / 0.45);
      if (grow < 0.04) return;
      const s = sway * (0.3 + Math.abs(x) / 28) + Math.sin(shimmer + i) * 0.35 * d;
      canopyBlob2(ctx, x + s, y, r * grow, p, 0.9);
    });
    const fleckAlpha = 0.5 * d;
    if (fleckAlpha > 0.04) {
      ctx.fillStyle = rgb(p.foliageLight, fleckAlpha);
      CLUSTERS.forEach(([x, y, r], i) => {
        const threshold = i / CLUSTERS.length;
        const grow = clamp01((d - threshold * 0.55) / 0.45);
        if (grow < 0.2) return;
        const s = sway * (0.3 + Math.abs(x) / 28);
        for (let k = 0; k < 2; k++) {
          const a = i * 1.7 + k * 2.3 + shimmer * 0.2;
          ctx.beginPath();
          ctx.ellipse(x + s + Math.cos(a) * r, y + Math.sin(a) * r, 1.2, 1.9, a, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }
  function catkins(ctx, p, sway) {
    if (p.catkinAmt < 0.02) return;
    const anchors = [
      [-9, -16],
      [4, -18],
      [-3, -13],
      [11, -11],
      [8, -19],
      [-13, -9]
    ];
    anchors.forEach(([ax, ay], i) => {
      if (i / anchors.length > p.catkinAmt + 0.1) return;
      const dx = sway * 0.6 + Math.sin(i * 1.3) * 0.4;
      ctx.strokeStyle = `rgba(214,206,150,${0.85 * p.catkinAmt})`;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(ax + dx * 0.5, ay + 3, ax + dx, ay + 6);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.fillStyle = `rgba(238,232,180,${0.9 * p.catkinAmt})`;
      ctx.beginPath();
      ctx.ellipse(ax + dx, ay + 6, 1, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function paint(ctx, p, bob, sway = 0, shimmer = 0) {
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      padEllipse(ctx, p);
      ctx.save();
      ctx.translate(0, -bob);
      trunk2(ctx, p);
      branches(ctx, p, sway);
      canopy(ctx, p, sway, shimmer);
      catkins(ctx, p, sway);
      ctx.restore();
      if (p.lightStrength > 0.01) {
        const lg = ctx.createRadialGradient(-8, -16, 4, -2, -8, 34);
        lg.addColorStop(0, rgb(p.lightTint, p.lightStrength));
        lg.addColorStop(1, rgb(p.lightTint, 0));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.ellipse(-2, -8, 26, 28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } catch {
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  function lerpP(a, b, f) {
    return {
      foliageDark: lerp3(a.foliageDark, b.foliageDark, f),
      foliageMid: lerp3(a.foliageMid, b.foliageMid, f),
      foliageLight: lerp3(a.foliageLight, b.foliageLight, f),
      bark: lerp3(a.bark, b.bark, f),
      barkShade: lerp3(a.barkShade, b.barkShade, f),
      lenticel: lerp3(a.lenticel, b.lenticel, f),
      padGrass: lerp3(a.padGrass, b.padGrass, f),
      soil: lerp3(a.soil, b.soil, f),
      outlineTint: lerp3(a.outlineTint, b.outlineTint, f),
      lightTint: lerp3(a.lightTint, b.lightTint, f),
      leafDensity: lerp2(a.leafDensity, b.leafDensity, f),
      catkinAmt: lerp2(a.catkinAmt, b.catkinAmt, f),
      frostAmt: lerp2(a.frostAmt, b.frostAmt, f),
      branchSnowAmt: lerp2(a.branchSnowAmt, b.branchSnowAmt, f),
      padSnowAmt: lerp2(a.padSnowAmt, b.padSnowAmt, f),
      blossomAmt: lerp2(a.blossomAmt, b.blossomAmt, f),
      fallenLeafAmt: lerp2(a.fallenLeafAmt, b.fallenLeafAmt, f),
      lightStrength: lerp2(a.lightStrength, b.lightStrength, f),
      shadowStrength: lerp2(a.shadowStrength, b.shadowStrength, f)
    };
  }
  function makeDraw(season) {
    return (ctx) => paint(ctx, SP[season], 0, 0, 0);
  }
  function animSpring(ctx, t) {
    const bob = bobAt(t, 0.5, 1.3);
    const sway = Math.sin(t * 1.4) * 1.4;
    paint(ctx, SP.Spring, bob, sway, t * 2.4);
  }
  function animSummer(ctx, t) {
    const bob = bobAt(t, 0.5, 1.2);
    const sway = Math.sin(t * 1.3) * 1.3;
    paint(ctx, SP.Summer, bob, sway, t * 1.9);
  }
  function animAutumn(ctx, t) {
    const bob = bobAt(t, 0.5, 1.1);
    const sway = Math.sin(t * 1.1) * 1.1;
    paint(ctx, SP.Autumn, bob, sway, t * 1.6);
    ctx.save();
    try {
      const p = SP.Autumn;
      const leaves = [
        [-6, 0, 0.55],
        // [startX, phase, hueBlend]
        [9, 0.5, 0.35]
      ];
      leaves.forEach(([sx, phase, hb]) => {
        const prog = ((t * 0.28 + phase) % 1 + 1) % 1;
        const ly = -8 + prog * 28;
        const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * 6;
        const col = lerp3(p.foliageMid, p.foliageLight, hb);
        ctx.fillStyle = rgb(col, 1 - prog * 0.4);
        ctx.translate(lx, ly);
        ctx.rotate(prog * Math.PI * 3 + phase * 4);
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.6, 2.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      });
    } catch {
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  function animWinter(ctx, t) {
    const bob = bobAt(t, 0.35, 0.9);
    const sway = Math.sin(t * 0.9) * 0.9;
    paint(ctx, SP.Winter, bob, sway, 0);
    ctx.save();
    try {
      const span = 36;
      const seeds = [
        [-9, 1.2, 0],
        [7, 1, 0.5],
        [13, 0.9, 0.7]
      ];
      seeds.forEach(([fx, r, phase]) => {
        const prog = ((t / 3.6 + phase) % 1 + 1) % 1;
        const fy = -24 + prog * span;
        const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(driftX, fy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      const sheen2 = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.7));
      ctx.fillStyle = `rgba(200,224,255,${sheen2})`;
      ctx.beginPath();
      ctx.ellipse(-3, 18.6, 11, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } catch {
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  function makeTransition(from, to) {
    return (ctx, pp) => {
      const f = smoother(clamp01(pp));
      paint(ctx, lerpP(SP[from], SP[to], f), 0, 0, 0);
    };
  }
  var VARIANTS2 = {
    Spring: { draw: makeDraw("Spring"), anim: animSpring },
    Summer: { draw: makeDraw("Summer"), anim: animSummer },
    Autumn: { draw: makeDraw("Autumn"), anim: animAutumn },
    Winter: { draw: makeDraw("Winter"), anim: animWinter }
  };
  var TRANSITIONS2 = {
    0: makeTransition("Spring", "Summer"),
    1: makeTransition("Summer", "Autumn"),
    2: makeTransition("Autumn", "Winter")
  };

  // src/textures/seasonal/fruit/apple.ts
  function groundShadow2(ctx, rx = 14, alpha = 0.22) {
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
  var LEAF_GREEN = { dark: "#2f5916", lite: "#6fae35" };
  var LEAF_GOLD = { dark: "#9a6a16", lite: "#e0a73a" };
  var GREEN_SKIN = { hi: "#cfe88a", mid: "#7fb53a", lo: "#3f6b1c" };
  var RED_SKIN = { hi: "#ff7a5e", mid: "#d6322a", lo: "#7c1410" };
  var DULL_RED_SKIN = { hi: "#a8584e", mid: "#8a2f2a", lo: "#521012" };
  function appleSpring(ctx, sway, glint) {
    groundShadow2(ctx, 12, 0.2);
    twig(ctx, sway * 0.4, false);
    leaf(ctx, 6, -2, -0.9 + sway * 0.04, 11, LEAF_GREEN.dark, LEAF_GREEN.lite);
    leaf(ctx, -6, -1, 3.3 - sway * 0.04, 9, LEAF_GREEN.dark, LEAF_GREEN.lite);
    leaf(ctx, 9, -12, -1.5, 8, LEAF_GREEN.dark, LEAF_GREEN.lite);
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
    groundShadow2(ctx, 12, 0.2);
    twig(ctx, bob * 0.3, false);
    leaf(ctx, 7, -10, -0.7, 12, LEAF_GREEN.dark, LEAF_GREEN.lite);
    leaf(ctx, -7, -2, 3.2, 10, LEAF_GREEN.dark, LEAF_GREEN.lite);
    leaf(ctx, 11, -1, -0.2, 9, LEAF_GREEN.dark, LEAF_GREEN.lite);
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
    groundShadow2(ctx, 13, 0.22);
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
  function appleWinter(ctx, flakes, sheen2, sway) {
    groundShadow2(ctx, 14, 0.18);
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
    ctx.fillStyle = `rgba(200,224,255,${0.3 + sheen2 * 0.25})`;
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
    const sheen2 = 0.5 + 0.5 * Math.sin(t * 0.8);
    const sway = Math.sin(t * 0.7) * 0.8;
    appleWinter(ctx, flakes, sheen2, sway);
  }
  function lerp4(a, b, p) {
    return a + (b - a) * p;
  }
  function clamp012(p) {
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }
  function mixHex(c1, c2, p) {
    const a = parseInt(c1.slice(1), 16);
    const b = parseInt(c2.slice(1), 16);
    const r = Math.round(lerp4(a >> 16 & 255, b >> 16 & 255, p));
    const g = Math.round(lerp4(a >> 8 & 255, b >> 8 & 255, p));
    const bl = Math.round(lerp4(a & 255, b & 255, p));
    return `rgb(${r},${g},${bl})`;
  }
  function mixSkin(s1, s2, p) {
    return {
      hi: mixHex(s1.hi, s2.hi, p),
      mid: mixHex(s1.mid, s2.mid, p),
      lo: mixHex(s1.lo, s2.lo, p)
    };
  }
  function springToSummer2(ctx, p) {
    const q = clamp012(p);
    groundShadow2(ctx, 12, 0.2);
    twig(ctx, 0, false);
    leaf(ctx, 7, -10, -0.7, lerp4(11, 12, q), LEAF_GREEN.dark, LEAF_GREEN.lite);
    leaf(ctx, -7, -2, 3.2, lerp4(9, 10, q), LEAF_GREEN.dark, LEAF_GREEN.lite);
    leaf(ctx, 11, -1, -0.2, lerp4(8, 9, q), LEAF_GREEN.dark, LEAF_GREEN.lite);
    if (q > 0.4) {
      apple(ctx, 9, -11, lerp4(2, 5, (q - 0.4) / 0.6), GREEN_SKIN, { color: "#cfe88a", amt: 0 }, 0.3, false);
    }
    const r = lerp4(3, 10, q);
    const fy = lerp4(-2, 2, q);
    apple(ctx, lerp4(-3, -1, q), fy, r, GREEN_SKIN, { color: "#e8f0a0", amt: lerp4(0, 0.25, q) }, 0.3, q > 0.3);
    const fade = clamp012(1 - q / 0.7);
    if (fade > 0.01) {
      const fall = q * 14;
      blossom(ctx, 2, 0 + fall, 8, fade, fade);
      blossom(ctx, 11, -10 + fall * 0.8, 5, fade, fade * 0.9);
    }
  }
  function summerToAutumn2(ctx, p) {
    const q = clamp012(p);
    groundShadow2(ctx, lerp4(12, 13, q), lerp4(0.2, 0.22, q));
    twig(ctx, 0, false);
    const ld = mixHex(LEAF_GREEN.dark, LEAF_GOLD.dark, q);
    const ll = mixHex(LEAF_GREEN.lite, LEAF_GOLD.lite, q);
    leaf(ctx, 7, -10, -0.7, 12, ld, ll);
    leaf(ctx, -7, -2, 3.2, 10, ld, ll);
    leaf(ctx, 11, -1, -0.2, lerp4(9, 0.01, q), ld, ll);
    const skin2 = mixSkin(GREEN_SKIN, RED_SKIN, q);
    apple(ctx, 10, -10, lerp4(5, 5.5, q), skin2, { color: mixHex("#cfe88a", "#ffcf6a", q), amt: lerp4(0, 0.5, q) }, 0.3, false);
    const skin = mixSkin(GREEN_SKIN, RED_SKIN, q);
    const blushColor = mixHex("#e8f0a0", "#ffd166", q);
    apple(ctx, -1, lerp4(2, 3, q), lerp4(10, 11, q), skin, { color: blushColor, amt: lerp4(0.25, 0.7, q) }, 0.3, true);
  }
  function autumnToWinter2(ctx, p) {
    const q = clamp012(p);
    groundShadow2(ctx, 14, lerp4(0.22, 0.18, q));
    const snowAmt = clamp012((q - 0.5) / 0.5);
    if (snowAmt > 0.01) {
      ctx.save();
      ctx.globalAlpha = snowAmt;
      const snow = ctx.createLinearGradient(0, 16, 0, 24);
      snow.addColorStop(0, "#eef4fb");
      snow.addColorStop(1, "#c2d2e4");
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.ellipse(0, 21, lerp4(8, 16, snowAmt), lerp4(3, 5.5, snowAmt), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    twig(ctx, 0, q > 0.5);
    const leafLife = clamp012(1 - q / 0.5);
    if (leafLife > 0.01) {
      ctx.save();
      ctx.globalAlpha = leafLife;
      const drop = (1 - leafLife) * 16;
      leaf(ctx, 7, -10 + drop, -0.7 + (1 - leafLife), 12 * leafLife + 2, LEAF_GOLD.dark, LEAF_GOLD.lite);
      leaf(ctx, -7, -2 + drop, 3.2 + (1 - leafLife), 10 * leafLife + 2, LEAF_GOLD.dark, LEAF_GOLD.lite);
      ctx.restore();
    }
    if (q < 0.6) {
      const a2 = clamp012(1 - q / 0.6);
      ctx.save();
      ctx.globalAlpha = a2;
      apple(ctx, 10, -10, 5.5, mixSkin(RED_SKIN, DULL_RED_SKIN, q), { color: "#7c4a30", amt: 0.4 }, 0.5, false);
      ctx.restore();
    }
    const skin = mixSkin(RED_SKIN, DULL_RED_SKIN, q);
    apple(ctx, -1, 3, lerp4(11, 10, q), skin, { color: mixHex("#ffd166", "#7c4a30", q), amt: lerp4(0.7, 0.35, q) }, 0.5, q < 0.5);
    if (snowAmt > 0.01) {
      ctx.save();
      ctx.globalAlpha = snowAmt;
      ctx.fillStyle = "#f4f8ff";
      ctx.beginPath();
      ctx.ellipse(8, -14, 3.4 * snowAmt, 1.8 * snowAmt, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(244,248,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(-1, -5, lerp4(3, 6, snowAmt), lerp4(1.4, 2.6, snowAmt), 0, 0, Math.PI * 2);
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
    0: springToSummer2,
    1: summerToAutumn2,
    2: autumnToWinter2
  };

  // src/textures/seasonal/fruit/pear.ts
  var clamp013 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
  var rgb2 = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  var lerp5 = (a, b, t) => a + (b - a) * t;
  var lerpRGB = (a, b, t) => [
    lerp5(a[0], b[0], t),
    lerp5(a[1], b[1], t),
    lerp5(a[2], b[2], t)
  ];
  var smoother2 = (x) => x * x * x * (x * (6 * x - 15) + 10);
  function lerpP2(a, b, t) {
    return {
      skinTop: lerpRGB(a.skinTop, b.skinTop, t),
      skinMid: lerpRGB(a.skinMid, b.skinMid, t),
      skinBot: lerpRGB(a.skinBot, b.skinBot, t),
      outline: lerpRGB(a.outline, b.outline, t),
      leaf: lerpRGB(a.leaf, b.leaf, t),
      padGrass: lerpRGB(a.padGrass, b.padGrass, t),
      padGrassDark: lerpRGB(a.padGrassDark, b.padGrassDark, t),
      soil: lerpRGB(a.soil, b.soil, t),
      light: lerpRGB(a.light, b.light, t),
      lightAmt: lerp5(a.lightAmt, b.lightAmt, t),
      shadowAmt: lerp5(a.shadowAmt, b.shadowAmt, t),
      ripeness: lerp5(a.ripeness, b.ripeness, t),
      gloss: lerp5(a.gloss, b.gloss, t),
      blush: lerp5(a.blush, b.blush, t),
      freckleAmt: lerp5(a.freckleAmt, b.freckleAmt, t),
      frostAmt: lerp5(a.frostAmt, b.frostAmt, t),
      snowCapAmt: lerp5(a.snowCapAmt, b.snowCapAmt, t),
      padSnowAmt: lerp5(a.padSnowAmt, b.padSnowAmt, t),
      blossomAmt: lerp5(a.blossomAmt, b.blossomAmt, t),
      fallenLeafAmt: lerp5(a.fallenLeafAmt, b.fallenLeafAmt, t)
    };
  }
  var rand = (n) => {
    const s = Math.sin(n * 127.1 + 0.5) * 43758.5453;
    return s - Math.floor(s);
  };
  function pearPath(ctx, s) {
    const topX = 0;
    const topY = -11 * s;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.bezierCurveTo(5.5 * s, -9 * s, 6.5 * s, -2 * s, 8 * s, 4 * s);
    ctx.bezierCurveTo(10.5 * s, 9 * s, 9.5 * s, 17 * s, 0, 18 * s);
    ctx.bezierCurveTo(-9.5 * s, 17 * s, -10.5 * s, 9 * s, -8 * s, 4 * s);
    ctx.bezierCurveTo(-6.5 * s, -2 * s, -5.5 * s, -9 * s, topX, topY);
    ctx.closePath();
  }
  function paint2(ctx, pp, bob) {
    const p = {
      ...pp,
      lightAmt: clamp013(pp.lightAmt),
      shadowAmt: clamp013(pp.shadowAmt),
      ripeness: clamp013(pp.ripeness),
      gloss: clamp013(pp.gloss),
      blush: clamp013(pp.blush),
      freckleAmt: clamp013(pp.freckleAmt),
      frostAmt: clamp013(pp.frostAmt),
      snowCapAmt: clamp013(pp.snowCapAmt),
      padSnowAmt: clamp013(pp.padSnowAmt),
      blossomAmt: clamp013(pp.blossomAmt),
      fallenLeafAmt: clamp013(pp.fallenLeafAmt)
    };
    const s = 0.92 + p.ripeness * 0.12;
    ctx.save();
    ctx.fillStyle = rgb2([0, 0, 0], 0.1 + p.shadowAmt * 0.16);
    ctx.beginPath();
    ctx.ellipse(3, 21, 15, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb2(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();
    const padGrad = ctx.createLinearGradient(0, 15, 0, 23);
    padGrad.addColorStop(0, rgb2(p.padGrass));
    padGrad.addColorStop(1, rgb2(p.padGrassDark));
    ctx.fillStyle = padGrad;
    ctx.beginPath();
    ctx.ellipse(0, 18.5, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb2(p.padGrass);
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      const tx = -16 + i * 3.2;
      const ty = 15.4 + Math.abs(tx) * 0.06;
      ctx.beginPath();
      ctx.moveTo(tx, ty + 1.4);
      ctx.lineTo(tx + (i % 2 ? 1.1 : -1.1), ty - 2.2);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    if (p.blossomAmt > 0.01) {
      for (let i = 0; i < 5; i++) {
        const bx = -13 + rand(i + 1) * 26;
        const by = 17 + rand(i + 21) * 4;
        ctx.fillStyle = rgb2([255, 244, 250], p.blossomAmt * 0.85);
        ctx.beginPath();
        ctx.ellipse(bx, by, 1.7, 1.2, rand(i + 7) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb2([255, 214, 230], p.blossomAmt * 0.7);
        ctx.beginPath();
        ctx.arc(bx, by, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (p.fallenLeafAmt > 0.01) {
      const leaves = [
        [-11, 19, -0.5, [196, 120, 36]],
        [9, 20.5, 0.7, [176, 92, 28]]
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgb2(col, p.fallenLeafAmt);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgb2([110, 64, 18], p.fallenLeafAmt * 0.8);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      });
    }
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgb2([238, 245, 252], 0.55 + p.padSnowAmt * 0.4);
      ctx.beginPath();
      ctx.ellipse(0, 18, 17 * p.padSnowAmt + 4, 4.6 * p.padSnowAmt + 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const sx = -14 + rand(i + 31) * 28;
        const sy = 16.5 + rand(i + 41) * 4;
        ctx.fillStyle = rgb2([255, 255, 255], p.padSnowAmt * (0.4 + rand(i + 51) * 0.5));
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const cy = -2 + bob;
    ctx.save();
    ctx.translate(0, cy);
    ctx.save();
    ctx.translate(0, -cy);
    ctx.fillStyle = rgb2([0, 0, 0], 0.12 + p.shadowAmt * 0.14);
    ctx.beginPath();
    ctx.ellipse(2.5, 17.5, 9 * s, 3.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgb2([96, 64, 30]);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0.5 * s, -10 * s);
    ctx.quadraticCurveTo(1.6 * s, -14 * s, 2.6 * s, -16.5 * s);
    ctx.stroke();
    ctx.strokeStyle = rgb2([138, 96, 50]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0.5 * s, -10 * s);
    ctx.quadraticCurveTo(1.6 * s, -14 * s, 2.6 * s, -16.5 * s);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.save();
    ctx.translate(-1.5 * s, -13.5 * s);
    ctx.rotate(-0.5);
    ctx.fillStyle = rgb2(p.leaf);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-5.5 * s, -1.5 * s, -8 * s, -5.5 * s);
    ctx.quadraticCurveTo(-3.5 * s, -3 * s, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb2([from3(p.leaf, -50)[0], from3(p.leaf, -50)[1], from3(p.leaf, -50)[2]]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4 * s, -2.4 * s, -7 * s, -5 * s);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    pearPath(ctx, s);
    ctx.fillStyle = rgb2(p.outline);
    ctx.shadowColor = "transparent";
    ctx.fill();
    ctx.restore();
    ctx.save();
    pearPath(ctx, s * 0.93);
    ctx.clip();
    const bodyGrad = ctx.createLinearGradient(-7 * s, -10 * s, 8 * s, 16 * s);
    bodyGrad.addColorStop(0, rgb2(p.skinTop));
    bodyGrad.addColorStop(0.5, rgb2(p.skinMid));
    bodyGrad.addColorStop(1, rgb2(p.skinBot));
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-14, -20, 28, 42);
    if (p.blush > 0.01) {
      const bg = ctx.createRadialGradient(-4 * s, 8 * s, 1, -4 * s, 8 * s, 8 * s);
      bg.addColorStop(0, rgb2([240, 120, 96], p.blush * 0.55));
      bg.addColorStop(1, rgb2([240, 120, 96], 0));
      ctx.fillStyle = bg;
      ctx.fillRect(-14, -20, 28, 42);
    }
    if (p.freckleAmt > 0.01) {
      for (let i = 0; i < 8; i++) {
        const fx = -5 + rand(i + 61) * 10;
        const fy = 0 + rand(i + 71) * 14;
        ctx.fillStyle = rgb2([150, 96, 30], p.freckleAmt * 0.5);
        ctx.beginPath();
        ctx.arc(fx * s, fy * s - 4, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (p.gloss > 0.01) {
      ctx.fillStyle = rgb2([255, 255, 255], p.gloss * 0.6);
      ctx.beginPath();
      ctx.ellipse(-4 * s, -3 * s, 2.2 * s, 4.2 * s, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb2([255, 255, 255], p.gloss * 0.35);
      ctx.beginPath();
      ctx.ellipse(-5.4 * s, 4 * s, 1, 2.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.frostAmt > 0.01) {
      ctx.fillStyle = rgb2([214, 230, 244], p.frostAmt * 0.4);
      ctx.fillRect(-14, -20, 28, 42);
      for (let i = 0; i < 10; i++) {
        const fx = -7 + rand(i + 81) * 14;
        const fy = -8 + rand(i + 91) * 24;
        ctx.fillStyle = rgb2([255, 255, 255], p.frostAmt * (0.3 + rand(i + 101) * 0.4));
        ctx.beginPath();
        ctx.arc(fx * s, fy * s, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    if (p.snowCapAmt > 0.01) {
      ctx.fillStyle = rgb2([244, 249, 255], 0.85);
      ctx.save();
      pearPath(ctx, s * 0.93);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(-1 * s, -8 * s, 6.5 * s * p.snowCapAmt + 1, 3.2 * p.snowCapAmt + 0.6, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = rgb2([248, 251, 255], 0.9);
      ctx.beginPath();
      ctx.arc(2.6 * s, -16.5 * s, 1.6 * p.snowCapAmt + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function from3(c, d) {
    return [
      Math.max(0, Math.min(255, c[0] + d)),
      Math.max(0, Math.min(255, c[1] + d)),
      Math.max(0, Math.min(255, c[2] + d))
    ];
  }
  var SP2 = {
    // Spring — small-ish, green unripe, matte; bright dewy lime pad + blossom.
    Spring: {
      skinTop: [178, 214, 120],
      skinMid: [138, 184, 84],
      skinBot: [92, 134, 54],
      outline: [58, 92, 38],
      leaf: [120, 196, 86],
      padGrass: [134, 206, 96],
      padGrassDark: [86, 156, 70],
      soil: [120, 92, 56],
      light: [236, 248, 224],
      lightAmt: 0.5,
      shadowAmt: 0.35,
      ripeness: 0.25,
      gloss: 0.1,
      blush: 0,
      freckleAmt: 0,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0.85,
      fallenLeafAmt: 0
    },
    // Summer — PEAK: ripe yellow-green, warm blush, gentle gloss; saturated pad.
    Summer: {
      skinTop: [232, 230, 138],
      skinMid: [196, 206, 96],
      skinBot: [142, 158, 58],
      outline: [86, 96, 36],
      leaf: [86, 162, 64],
      padGrass: [104, 178, 78],
      padGrassDark: [64, 130, 56],
      soil: [110, 82, 48],
      light: [255, 248, 214],
      lightAmt: 0.65,
      shadowAmt: 0.55,
      ripeness: 1,
      gloss: 0.55,
      blush: 0.7,
      freckleAmt: 0,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0
    },
    // Autumn — golden-ripe warm amber, faint freckles; leaf turning, olive-tan pad.
    Autumn: {
      skinTop: [244, 206, 116],
      skinMid: [224, 162, 64],
      skinBot: [166, 104, 34],
      outline: [104, 64, 22],
      leaf: [196, 138, 52],
      padGrass: [150, 150, 84],
      padGrassDark: [108, 104, 60],
      soil: [108, 78, 44],
      light: [250, 224, 168],
      lightAmt: 0.45,
      shadowAmt: 0.42,
      ripeness: 0.9,
      gloss: 0.2,
      blush: 0.3,
      freckleAmt: 0.7,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0.8
    },
    // Winter — pale frost dusting (cool), fruit visible; snow cap + pad snow.
    Winter: {
      skinTop: [214, 214, 188],
      skinMid: [184, 184, 156],
      skinBot: [134, 138, 124],
      outline: [86, 90, 92],
      leaf: [150, 158, 140],
      padGrass: [196, 210, 218],
      padGrassDark: [150, 170, 186],
      soil: [120, 110, 102],
      light: [222, 234, 248],
      lightAmt: 0.5,
      shadowAmt: 0.3,
      ripeness: 0.75,
      gloss: 0.18,
      blush: 0,
      freckleAmt: 0,
      frostAmt: 0.7,
      snowCapAmt: 0.8,
      padSnowAmt: 0.85,
      blossomAmt: 0,
      fallenLeafAmt: 0
    }
  };
  var BOB_W = 1.5;
  var BOB_A = 1.1;
  var bobAt2 = (t) => -BOB_A * (1 - Math.cos(BOB_W * t)) * 0.5;
  function summerGlint(ctx, t, bob) {
    const prog = t * 0.35 % 1;
    const gx = -5 + prog * 9;
    const gy = -8 + prog * 18 + bob;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,255,240,0.5)";
    ctx.beginPath();
    ctx.ellipse(gx, gy, 1.8, 3.4, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function autumnLeafFlutter(ctx, t, bob) {
    const flut = Math.sin(t * 2.6) * 0.16 + Math.sin(t * 4.1) * 0.06;
    ctx.save();
    ctx.translate(-1.5, -15.5 + bob);
    ctx.rotate(-0.5 + flut);
    ctx.fillStyle = rgb2([210, 150, 58], 0.85);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-5, -1.4, -7.4, -5.2);
    ctx.quadraticCurveTo(-3.2, -2.8, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function winterSnow(ctx, t) {
    const seeds = [
      [-7, 0, 0.7],
      [6, 0.5, 0.6],
      [1, 0.25, 0.55]
    ];
    ctx.save();
    seeds.forEach(([fx, phase, r]) => {
      const prog = ((t / 3.6 + phase) % 1 + 1) % 1;
      const fy = -20 + prog * 40;
      const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
      ctx.fillStyle = rgb2([255, 255, 255], 0.5 + 0.4 * Math.sin(prog * Math.PI));
      ctx.beginPath();
      ctx.arc(dx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    const sheen2 = 0.08 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.9));
    ctx.fillStyle = rgb2([210, 228, 246], sheen2);
    ctx.beginPath();
    ctx.ellipse(-3, 0, 6, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function springDew(ctx, t, bob) {
    const sh = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
    ctx.save();
    ctx.fillStyle = rgb2([255, 255, 255], sh);
    ctx.beginPath();
    ctx.arc(-4.5, -2 + bob, 1 + sh, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  var draw = (season) => (ctx) => {
    paint2(ctx, SP2[season], 0);
  };
  var anim = (season) => (ctx, t) => {
    const bob = bobAt2(t);
    paint2(ctx, SP2[season], bob);
    if (season === "Spring") springDew(ctx, t, bob);
    else if (season === "Summer") summerGlint(ctx, t, bob);
    else if (season === "Autumn") autumnLeafFlutter(ctx, t, bob);
    else if (season === "Winter") winterSnow(ctx, t);
  };
  var springToSummer3 = (ctx, pp) => {
    const u = smoother2(clamp013(pp));
    paint2(ctx, lerpP2(SP2.Spring, SP2.Summer, u), 0);
  };
  var summerToAutumn3 = (ctx, pp) => {
    const u = smoother2(clamp013(pp));
    paint2(ctx, lerpP2(SP2.Summer, SP2.Autumn, u), 0);
  };
  var autumnToWinter3 = (ctx, pp) => {
    const u = smoother2(clamp013(pp));
    paint2(ctx, lerpP2(SP2.Autumn, SP2.Winter, u), 0);
  };
  var VARIANTS4 = {
    Spring: { draw: draw("Spring"), anim: anim("Spring") },
    Summer: { draw: draw("Summer"), anim: anim("Summer") },
    Autumn: { draw: draw("Autumn"), anim: anim("Autumn") },
    Winter: { draw: draw("Winter"), anim: anim("Winter") }
  };
  var TRANSITIONS4 = {
    0: springToSummer3,
    1: summerToAutumn3,
    2: autumnToWinter3
  };

  // src/textures/seasonal/types.ts
  var SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];

  // src/textures/seasonal/fruit/lemon.ts
  function clamp014(x) {
    if (!Number.isFinite(x)) return 0;
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function rgb3(c, a = 1) {
    const r = Math.round(clamp014(c[0] / 255) * 255);
    const g = Math.round(clamp014(c[1] / 255) * 255);
    const b = Math.round(clamp014(c[2] / 255) * 255);
    return `rgba(${r},${g},${b},${a})`;
  }
  function mix(a, b, t) {
    const k = clamp014(t);
    return [
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k,
      a[2] + (b[2] - a[2]) * k
    ];
  }
  var SP3 = {
    // Fresh pastel, cool-bright light, dewy lime pad, tiny blossom.
    Spring: {
      skinDark: [150, 168, 60],
      skinMid: [196, 214, 96],
      skinLight: [232, 244, 160],
      leaf: [108, 196, 84],
      leafVein: [70, 142, 56],
      padGrass: [150, 222, 110],
      padShade: [96, 168, 78],
      soil: [96, 70, 42],
      outline: [92, 96, 48],
      lightTint: [222, 240, 255],
      lightAmt: 0.16,
      ripeness: 0.28,
      gloss: 0.18,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0.85,
      fallenLeafAmt: 0,
      shadowAmt: 0.2
    },
    // Peak: richest saturated yellow, glossy, warm light, strong shadow.
    Summer: {
      skinDark: [212, 158, 22],
      skinMid: [248, 208, 44],
      skinLight: [255, 244, 150],
      leaf: [70, 156, 56],
      leafVein: [44, 110, 40],
      padGrass: [86, 174, 66],
      padShade: [54, 122, 48],
      soil: [104, 74, 40],
      outline: [120, 84, 18],
      lightTint: [255, 244, 198],
      lightAmt: 0.22,
      ripeness: 0.72,
      gloss: 0.62,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      shadowAmt: 0.3
    },
    // Gold/rust, fully ripe waxy, amber low light, olive-tan pad, fallen leaves.
    Autumn: {
      skinDark: [196, 140, 18],
      skinMid: [240, 192, 40],
      skinLight: [252, 226, 122],
      leaf: [196, 150, 52],
      leafVein: [140, 96, 30],
      padGrass: [150, 146, 78],
      padShade: [104, 100, 54],
      soil: [96, 64, 32],
      outline: [110, 72, 16],
      lightTint: [248, 206, 130],
      lightAmt: 0.24,
      ripeness: 0.92,
      gloss: 0.4,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0.8,
      shadowAmt: 0.26
    },
    // Cool blue-grey light, pad snow + frost, snow cap + frost dusting on skin.
    Winter: {
      skinDark: [198, 168, 64],
      skinMid: [236, 206, 96],
      skinLight: [250, 232, 158],
      leaf: [120, 150, 110],
      leafVein: [84, 112, 84],
      padGrass: [196, 214, 224],
      padShade: [150, 174, 196],
      soil: [88, 92, 104],
      outline: [86, 96, 116],
      lightTint: [196, 220, 255],
      lightAmt: 0.26,
      ripeness: 0.82,
      gloss: 0.3,
      frostAmt: 0.7,
      snowCapAmt: 0.85,
      padSnowAmt: 0.9,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      shadowAmt: 0.18
    }
  };
  function lerpN(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpP3(a, b, t) {
    const k = clamp014(t);
    return {
      skinDark: mix(a.skinDark, b.skinDark, k),
      skinMid: mix(a.skinMid, b.skinMid, k),
      skinLight: mix(a.skinLight, b.skinLight, k),
      leaf: mix(a.leaf, b.leaf, k),
      leafVein: mix(a.leafVein, b.leafVein, k),
      padGrass: mix(a.padGrass, b.padGrass, k),
      padShade: mix(a.padShade, b.padShade, k),
      soil: mix(a.soil, b.soil, k),
      outline: mix(a.outline, b.outline, k),
      lightTint: mix(a.lightTint, b.lightTint, k),
      lightAmt: lerpN(a.lightAmt, b.lightAmt, k),
      ripeness: lerpN(a.ripeness, b.ripeness, k),
      gloss: lerpN(a.gloss, b.gloss, k),
      frostAmt: lerpN(a.frostAmt, b.frostAmt, k),
      snowCapAmt: lerpN(a.snowCapAmt, b.snowCapAmt, k),
      padSnowAmt: lerpN(a.padSnowAmt, b.padSnowAmt, k),
      blossomAmt: lerpN(a.blossomAmt, b.blossomAmt, k),
      fallenLeafAmt: lerpN(a.fallenLeafAmt, b.fallenLeafAmt, k),
      shadowAmt: lerpN(a.shadowAmt, b.shadowAmt, k)
    };
  }
  var BODY_CX = 0;
  var BODY_CY = 6;
  var BODY_RX = 13;
  var BODY_RY = 15;
  var TILT = -0.12;
  var NUB_TOP = [
    BODY_CX + Math.sin(TILT) * (BODY_RY + 1.5),
    BODY_CY - Math.cos(TILT) * (BODY_RY + 1.5)
  ];
  var NUB_BOT = [
    BODY_CX - Math.sin(TILT) * (BODY_RY + 1.5),
    BODY_CY + Math.cos(TILT) * (BODY_RY + 1.5)
  ];
  var DIMPLES = [
    [-6, -4],
    [-2, -7],
    [3, -5],
    [7, -1],
    [-8, 2],
    [-3, 1],
    [2, 3],
    [6, 4],
    [-5, 8],
    [0, 9],
    [5, 9],
    [-9, -2],
    [9, 2],
    [-1, -3],
    [4, 7]
  ];
  function paint3(ctx, p, bob) {
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawPad(ctx, p);
      ctx.save();
      ctx.translate(0, -bob);
      drawLemon(ctx, p);
      ctx.restore();
      drawAmbient(ctx, p);
    } catch {
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  function drawPad(ctx, p) {
    ctx.fillStyle = rgb3(p.padShade, 0.35 * p.shadowAmt + 0.18);
    ctx.beginPath();
    ctx.ellipse(2.5, 21, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb3(p.padShade);
    ctx.beginPath();
    ctx.ellipse(0, 20.5, 18, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb3(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb3(mix(p.padGrass, p.padShade, 0.4));
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * (0.04 + i / 12 * 0.92);
      const ex = Math.cos(a) * 18;
      const ey = 19 + Math.sin(a) * 5.4;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 0.6, ey + 2.2);
      ctx.stroke();
    }
    ctx.fillStyle = rgb3(mix(p.padGrass, [255, 255, 255], 0.28), 0.5);
    ctx.beginPath();
    ctx.ellipse(-5, 17.5, 9, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb3(p.soil, 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 18.5, 9, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    drawPadDressing(ctx, p);
  }
  function drawPadDressing(ctx, p) {
    if (p.blossomAmt > 0.02) {
      const a = clamp014(p.blossomAmt);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(-12, 17.5);
      for (let i = 0; i < 5; i++) {
        const ang = i / 5 * Math.PI * 2;
        ctx.fillStyle = "rgba(255,236,246,1)";
        ctx.beginPath();
        ctx.ellipse(Math.cos(ang) * 2.4, Math.sin(ang) * 1.7, 1.9, 1.4, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,206,86,1)";
      ctx.beginPath();
      ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (p.fallenLeafAmt > 0.02) {
      const a = clamp014(p.fallenLeafAmt);
      const leaves = [
        [-11, 19.5, 0.5, [206, 120, 42]],
        [12, 18.5, -0.7, [190, 92, 36]]
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgb3(col);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgb3(mix(col, [80, 40, 16], 0.5));
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(4, 0);
        ctx.stroke();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }
    if (p.padSnowAmt > 0.02) {
      const a = clamp014(p.padSnowAmt);
      ctx.save();
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, 14, 0, 24);
      g.addColorStop(0, "rgba(244,248,255,1)");
      g.addColorStop(1, "rgba(206,222,240,1)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 18.5, 17, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,1)";
      [[-10, 18], [-3, 20], [6, 17.5], [11, 19.5]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  function drawLemon(ctx, p) {
    ctx.fillStyle = rgb3(p.outline, 0.9);
    ctx.beginPath();
    ctx.ellipse(BODY_CX, BODY_CY, BODY_RX + 1.4, BODY_RY + 1.4, TILT, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(NUB_TOP[0], NUB_TOP[1], 3.2, 2.6, TILT, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(NUB_BOT[0], NUB_BOT[1], 2.8, 2.4, TILT, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb3(p.skinDark);
    ctx.beginPath();
    ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = rgb3(p.skinMid);
    ctx.beginPath();
    ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
    ctx.fill();
    const lg = ctx.createRadialGradient(-5, BODY_CY - 6, 2, -3, BODY_CY - 3, BODY_RX + 4);
    lg.addColorStop(0, rgb3(p.skinLight, 0.95));
    lg.addColorStop(0.55, rgb3(p.skinMid, 0));
    lg.addColorStop(1, rgb3(p.skinMid, 0));
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
    ctx.fill();
    const sg = ctx.createRadialGradient(6, BODY_CY + 7, 2, 6, BODY_CY + 7, BODY_RX + 6);
    sg.addColorStop(0, rgb3(p.skinDark, 0.45));
    sg.addColorStop(0.7, rgb3(p.skinDark, 0));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
    ctx.fill();
    const dimC = 0.18 + p.ripeness * 0.32;
    DIMPLES.forEach(([dx, dy]) => {
      ctx.fillStyle = rgb3(p.skinDark, dimC * 0.7);
      ctx.beginPath();
      ctx.arc(dx, BODY_CY + dy, 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb3(p.skinLight, dimC * 0.55);
      ctx.beginPath();
      ctx.arc(dx - 0.7, BODY_CY + dy - 0.7, 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
    if (p.frostAmt > 0.01) {
      const fa = clamp014(p.frostAmt);
      ctx.fillStyle = `rgba(212,232,255,${0.34 * fa})`;
      ctx.beginPath();
      ctx.ellipse(-2, BODY_CY - 5, BODY_RX - 2, BODY_RY - 4, TILT, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.7 * fa})`;
      DIMPLES.forEach(([dx, dy], i) => {
        if (i % 2 === 0 && dy < 4) {
          ctx.beginPath();
          ctx.arc(dx, BODY_CY + dy, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    const glossA = 0.25 + p.gloss * 0.6;
    ctx.fillStyle = `rgba(255,255,255,${glossA})`;
    ctx.beginPath();
    ctx.ellipse(-5, BODY_CY - 6, 3.6 - p.gloss * 1.2, 6 - p.gloss * 2, TILT - 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.snowCapAmt > 0.01) {
      const sa = clamp014(p.snowCapAmt);
      ctx.fillStyle = `rgba(248,252,255,${0.95 * sa})`;
      ctx.beginPath();
      ctx.ellipse(-3.5, BODY_CY - 10, 8.5 * sa + 2, 4.5 * sa + 1.5, TILT - 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(210,226,244,${0.6 * sa})`;
      ctx.beginPath();
      ctx.ellipse(-2, BODY_CY - 8, 7 * sa + 1.5, 2.4, TILT, 0, Math.PI * 2);
      ctx.fill();
    }
    drawLeaf(ctx, p);
  }
  function drawLeaf(ctx, p) {
    ctx.save();
    ctx.translate(NUB_TOP[0] + 1, NUB_TOP[1] - 1);
    ctx.rotate(-0.5);
    ctx.fillStyle = rgb3(mix(p.leaf, p.leafVein, 0.5));
    ctx.beginPath();
    ctx.ellipse(5.5, 0, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb3(p.leaf);
    ctx.beginPath();
    ctx.ellipse(5, -0.4, 6.4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb3(mix(p.leaf, [255, 255, 255], 0.4), 0.6);
    ctx.beginPath();
    ctx.ellipse(3.5, -1, 2.8, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb3(p.leafVein);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-0.5, 0);
    ctx.lineTo(11, -0.6);
    ctx.stroke();
    ctx.restore();
  }
  function drawAmbient(ctx, p) {
    if (p.lightAmt <= 0) return;
    const g = ctx.createRadialGradient(-8, -6, 4, 0, 4, 34);
    g.addColorStop(0, rgb3(p.lightTint, p.lightAmt));
    g.addColorStop(1, rgb3(p.lightTint, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-24, -24, 48, 48);
  }
  function bobAt3(t, amp = 1.1, w = 1.5) {
    return amp * (1 - Math.cos(w * t)) * 0.5;
  }
  function microMotion(ctx, season, t) {
    switch (season) {
      case "Spring": {
        const a = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(-4, BODY_CY - 4, 1.6 + a, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "Summer": {
        const prog = t * 0.35 % 1;
        const gx = -7 + prog * 14;
        const gy = BODY_CY - 8 + prog * 14;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.ellipse(gx, gy, 1.8, 3, -0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "Autumn": {
        const fl = Math.sin(t * 2.6) * 1.2;
        ctx.save();
        ctx.translate(NUB_TOP[0] + 9, NUB_TOP[1] - 5);
        ctx.rotate(fl * 0.12);
        ctx.fillStyle = "rgba(212,150,60,0.7)";
        ctx.beginPath();
        ctx.ellipse(fl * 0.4, 0, 2.4, 1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case "Winter": {
        const seeds = [
          [-9, 0],
          [-2, 0.4],
          [6, 0.7],
          [11, 0.25]
        ];
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        seeds.forEach(([fx, ph]) => {
          const prog = ((t / 3.4 + ph) % 1 + 1) % 1;
          const fy = -20 + prog * 36;
          const dx = fx + Math.sin(prog * Math.PI * 2 + ph * 6) * 2.4;
          ctx.beginPath();
          ctx.arc(dx, fy, 1, 0, Math.PI * 2);
          ctx.fill();
        });
        const sheen2 = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(200,224,255,${sheen2})`;
        ctx.beginPath();
        ctx.ellipse(-3, BODY_CY - 4, 7, 3, TILT, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }
  var smoother3 = (x) => x * x * x * (x * (6 * x - 15) + 10);
  function makeDraw2(season) {
    return (ctx) => paint3(ctx, SP3[season], 0);
  }
  function makeAnim(season) {
    return (ctx, t) => {
      paint3(ctx, SP3[season], bobAt3(t));
      ctx.save();
      try {
        ctx.translate(0, -bobAt3(t));
        microMotion(ctx, season, t);
      } catch {
      } finally {
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    };
  }
  function makeTransition2(fromIdx) {
    const from = SEASON_NAMES[fromIdx];
    const to = SEASON_NAMES[fromIdx + 1];
    return (ctx, pp) => {
      const k = smoother3(clamp014(pp));
      paint3(ctx, lerpP3(SP3[from], SP3[to], k), 0);
    };
  }
  var VARIANTS5 = {
    Spring: { draw: makeDraw2("Spring"), anim: makeAnim("Spring") },
    Summer: { draw: makeDraw2("Summer"), anim: makeAnim("Summer") },
    Autumn: { draw: makeDraw2("Autumn"), anim: makeAnim("Autumn") },
    Winter: { draw: makeDraw2("Winter"), anim: makeAnim("Winter") }
  };
  var TRANSITIONS5 = {
    0: makeTransition2(0),
    // Spring → Summer
    1: makeTransition2(1),
    // Summer → Autumn
    2: makeTransition2(2)
    // Autumn → Winter
  };

  // src/textures/seasonal/grain/corn.ts
  var SP4 = {
    // Spring — fresh lightly-desaturated pastel; husk tight & fully closed,
    // fresh green, a little dew; bright lime dewy pad + a pale blossom.
    Spring: {
      shadowAmt: 0.5,
      padGrass: [142, 214, 96],
      padGrassDark: [86, 150, 60],
      padSnowAmt: 0,
      blossomAmt: 1,
      fallenLeafAmt: 0,
      huskLight: [126, 196, 92],
      huskDark: [62, 116, 50],
      huskBrownAmt: 0,
      huskOpen: 0,
      kernel: [232, 214, 120],
      kernelDeep: [190, 162, 80],
      kernelDent: 0,
      silk: [206, 224, 150],
      outline: [44, 70, 36],
      frostAmt: 0,
      snowCapAmt: 0,
      gloss: 0.5
    },
    // Summer — richest, most-saturated palette (PEAK); husk peels open to show
    // plump bright-yellow kernels in neat rows, golden silk, vivid green husk.
    Summer: {
      shadowAmt: 0.7,
      padGrass: [104, 184, 70],
      padGrassDark: [62, 126, 46],
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      huskLight: [108, 184, 66],
      huskDark: [48, 104, 40],
      huskBrownAmt: 0,
      huskOpen: 1,
      kernel: [255, 214, 64],
      kernelDeep: [206, 150, 28],
      kernelDent: 0,
      silk: [240, 214, 120],
      outline: [40, 66, 32],
      frostAmt: 0,
      snowCapAmt: 0,
      gloss: 0.8
    },
    // Autumn — gold/orange/rust; husk drying, curling & browning at edges,
    // kernels deeper gold & a touch dented; silk rust-brown; fallen leaves.
    Autumn: {
      shadowAmt: 0.55,
      padGrass: [158, 150, 78],
      padGrassDark: [112, 96, 50],
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 1,
      huskLight: [176, 150, 72],
      huskDark: [104, 76, 32],
      huskBrownAmt: 1,
      huskOpen: 0.9,
      kernel: [232, 168, 44],
      kernelDeep: [168, 108, 24],
      kernelDent: 1,
      silk: [168, 108, 56],
      outline: [70, 48, 24],
      frostAmt: 0,
      snowCapAmt: 0,
      gloss: 0.45
    },
    // Winter — cool blue-grey light; husk muted green-grey, kernels still
    // visible; snow cap + frost dusting on upward surfaces; pad snow-covered.
    Winter: {
      shadowAmt: 0.4,
      padGrass: [120, 138, 122],
      padGrassDark: [86, 104, 96],
      padSnowAmt: 1,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      huskLight: [120, 150, 110],
      huskDark: [70, 96, 76],
      huskBrownAmt: 0.2,
      huskOpen: 0.55,
      kernel: [214, 188, 110],
      kernelDeep: [156, 132, 78],
      kernelDent: 0.4,
      silk: [196, 200, 198],
      outline: [54, 66, 60],
      frostAmt: 1,
      snowCapAmt: 1,
      gloss: 0.35
    }
  };
  function clamp015(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function rgb4([r, g, b], a = 1) {
    return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
  }
  function lerp6(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpRGB2(a, b, t) {
    return [lerp6(a[0], b[0], t), lerp6(a[1], b[1], t), lerp6(a[2], b[2], t)];
  }
  function lerpP4(a, b, t) {
    return {
      shadowAmt: lerp6(a.shadowAmt, b.shadowAmt, t),
      padGrass: lerpRGB2(a.padGrass, b.padGrass, t),
      padGrassDark: lerpRGB2(a.padGrassDark, b.padGrassDark, t),
      padSnowAmt: lerp6(a.padSnowAmt, b.padSnowAmt, t),
      blossomAmt: lerp6(a.blossomAmt, b.blossomAmt, t),
      fallenLeafAmt: lerp6(a.fallenLeafAmt, b.fallenLeafAmt, t),
      huskLight: lerpRGB2(a.huskLight, b.huskLight, t),
      huskDark: lerpRGB2(a.huskDark, b.huskDark, t),
      huskBrownAmt: lerp6(a.huskBrownAmt, b.huskBrownAmt, t),
      huskOpen: lerp6(a.huskOpen, b.huskOpen, t),
      kernel: lerpRGB2(a.kernel, b.kernel, t),
      kernelDeep: lerpRGB2(a.kernelDeep, b.kernelDeep, t),
      kernelDent: lerp6(a.kernelDent, b.kernelDent, t),
      silk: lerpRGB2(a.silk, b.silk, t),
      outline: lerpRGB2(a.outline, b.outline, t),
      frostAmt: lerp6(a.frostAmt, b.frostAmt, t),
      snowCapAmt: lerp6(a.snowCapAmt, b.snowCapAmt, t),
      gloss: lerp6(a.gloss, b.gloss, t)
    };
  }
  function clampP(p) {
    return {
      ...p,
      shadowAmt: clamp015(p.shadowAmt),
      padSnowAmt: clamp015(p.padSnowAmt),
      blossomAmt: clamp015(p.blossomAmt),
      fallenLeafAmt: clamp015(p.fallenLeafAmt),
      huskBrownAmt: clamp015(p.huskBrownAmt),
      huskOpen: clamp015(p.huskOpen),
      kernelDent: clamp015(p.kernelDent),
      frostAmt: clamp015(p.frostAmt),
      snowCapAmt: clamp015(p.snowCapAmt),
      gloss: clamp015(p.gloss)
    };
  }
  var smoother4 = (x) => x * x * x * (x * (6 * x - 15) + 10);
  var COB_TOP = -22;
  var COB_BOT = 14;
  var COB_HALF = 8.5;
  function cobBodyPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, COB_TOP);
    ctx.bezierCurveTo(COB_HALF, COB_TOP + 6, COB_HALF, -2, COB_HALF * 0.86, 6);
    ctx.bezierCurveTo(COB_HALF * 0.7, COB_BOT - 2, 4, COB_BOT, 0, COB_BOT);
    ctx.bezierCurveTo(-4, COB_BOT, -COB_HALF * 0.7, COB_BOT - 2, -COB_HALF * 0.86, 6);
    ctx.bezierCurveTo(-COB_HALF, -2, -COB_HALF, COB_TOP + 6, 0, COB_TOP);
    ctx.closePath();
  }
  function huskBackPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-COB_HALF, COB_TOP + 7);
    ctx.quadraticCurveTo(-COB_HALF - 1, 4, -5, COB_BOT + 1);
    ctx.lineTo(5, COB_BOT + 1);
    ctx.quadraticCurveTo(COB_HALF + 1, 4, COB_HALF, COB_TOP + 7);
    ctx.quadraticCurveTo(0, COB_TOP + 1, -COB_HALF, COB_TOP + 7);
    ctx.closePath();
  }
  function contactShadow(ctx, p) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.26 * p.shadowAmt})`;
    ctx.beginPath();
    ctx.ellipse(3, 21, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function pad(ctx, p) {
    ctx.fillStyle = rgb4(p.padGrassDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb4(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb4(p.padGrassDark);
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2;
      const ex = Math.cos(a) * 17.2;
      const ey = 19 + Math.sin(a) * 4.6;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(a) * 1.8, ey + Math.sin(a) * 1.4 - 1.4);
      ctx.stroke();
    }
    ctx.strokeStyle = rgb4(lerpRGB2(p.padGrass, [255, 255, 255], 0.25));
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + 0.3;
      const ex = Math.cos(a) * 12;
      const ey = 18 + Math.sin(a) * 3.2;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + 0.6, ey - 2);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    if (p.padSnowAmt > 0.01) {
      ctx.save();
      ctx.globalAlpha = p.padSnowAmt;
      const snow = ctx.createLinearGradient(0, 14, 0, 23);
      snow.addColorStop(0, "#f3f7fd");
      snow.addColorStop(1, "#cbd8e6");
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.ellipse(0, 19, 17, 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      const specks = [
        [-10, 18],
        [-3, 20],
        [6, 18.5],
        [12, 19.5],
        [2, 17.5]
      ];
      specks.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }
  function blossom2(ctx, p) {
    if (p.blossomAmt < 0.02) return;
    ctx.save();
    ctx.globalAlpha = p.blossomAmt;
    ctx.translate(-12, 19);
    ctx.fillStyle = "rgba(255,240,248,0.96)";
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 2.4, Math.sin(a) * 1.4, 1.7, 1.1, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(248,206,96,0.95)";
    ctx.beginPath();
    ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function fallenLeaves(ctx, p) {
    if (p.fallenLeafAmt < 0.02) return;
    ctx.save();
    ctx.globalAlpha = p.fallenLeafAmt;
    const leaves = [
      [-12, 20, -0.5, "#c8772b"],
      [11, 20.5, 0.7, "#b8531f"]
    ];
    leaves.forEach(([lx, ly, rot, col]) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(90,48,16,0.7)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-3.2, 0);
      ctx.lineTo(3.2, 0);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }
  function cobKernels(ctx, p) {
    ctx.save();
    cobBodyPath(ctx);
    ctx.clip();
    ctx.fillStyle = rgb4(p.kernelDeep);
    cobBodyPath(ctx);
    ctx.fill();
    const dentPush = p.kernelDent * 0.6;
    for (let row = 0; row < 9; row++) {
      const y = COB_TOP + 4 + row * 3.6;
      const halfAtRow = COB_HALF * 0.82 * (1 - Math.abs((y + 4) / 30) * 0.18);
      const cols = 5;
      for (let c = 0; c < cols; c++) {
        const fx = (c / (cols - 1) - 0.5) * 2 * (halfAtRow - 1.4);
        const sx = fx + (row % 2 === 0 ? 0 : (halfAtRow - 1.4) / (cols - 1));
        if (Math.abs(sx) > halfAtRow - 0.6) continue;
        const kr = 1.9 - dentPush;
        const face = lerpRGB2(p.kernel, p.kernelDeep, dentPush * 0.5);
        ctx.fillStyle = rgb4(face);
        ctx.beginPath();
        ctx.ellipse(sx, y, kr, kr * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb4(lerpRGB2(face, [255, 255, 255], 0.4 * p.gloss));
        ctx.beginPath();
        ctx.ellipse(sx - 0.5, y - 0.6, kr * 0.5, kr * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = rgb4(p.outline, 0.85);
    ctx.lineWidth = 1.1;
    cobBodyPath(ctx);
    ctx.stroke();
  }
  function silkTuft(ctx, p, sway) {
    ctx.save();
    ctx.translate(0, COB_TOP);
    ctx.strokeStyle = rgb4(p.silk, 0.95);
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    const strands = [
      [-4, -0.5],
      [-2, -0.2],
      [0, 0],
      [2, 0.2],
      [4, 0.5]
    ];
    strands.forEach(([sx, lean], i) => {
      const tipX = sx + lean * 6 + sway * (0.4 + i * 0.12);
      const tipY = -7 - Math.abs(sx) * 0.3;
      ctx.beginPath();
      ctx.moveTo(sx * 0.4, 0);
      ctx.quadraticCurveTo(sx * 0.7 + sway * 0.3, -3.5, tipX, tipY);
      ctx.stroke();
    });
    ctx.strokeStyle = rgb4(lerpRGB2(p.silk, [255, 255, 255], 0.4), 0.8);
    ctx.lineWidth = 0.7;
    strands.forEach(([sx, lean], i) => {
      const tipX = sx + lean * 6 + sway * (0.4 + i * 0.12);
      const tipY = -7 - Math.abs(sx) * 0.3;
      ctx.beginPath();
      ctx.moveTo(sx * 0.55 + sway * 0.2, -3.5);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    });
    ctx.lineCap = "butt";
    ctx.restore();
  }
  function husk(ctx, p, leafFlutter) {
    const light = lerpRGB2(p.huskLight, [150, 104, 44], p.huskBrownAmt * 0.5);
    const dark = lerpRGB2(p.huskDark, [96, 64, 28], p.huskBrownAmt * 0.6);
    ctx.fillStyle = rgb4(dark);
    huskBackPath(ctx);
    ctx.fill();
    const leaves = [
      [-1, -7.5, 1],
      [-1, -4, 0.3],
      [1, 7.5, 1],
      [1, 4, 0.3]
    ];
    leaves.forEach(([side, baseX, fw]) => {
      const open = p.huskOpen * (0.45 + 0.55 * Math.abs(baseX) / 7.5);
      const tipX = baseX + side * (2 + open * 9);
      const tipY = COB_TOP + 5 - open * 7 + leafFlutter * fw;
      const midX = baseX + side * (1 + open * 4);
      const midY = -4;
      ctx.fillStyle = rgb4(dark);
      ctx.beginPath();
      ctx.moveTo(baseX, COB_BOT);
      ctx.quadraticCurveTo(midX - side * 3, midY, tipX, tipY);
      ctx.quadraticCurveTo(midX + side * 1.5, midY + 3, baseX + side * 2, COB_BOT);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgb4(light);
      ctx.beginPath();
      ctx.moveTo(baseX + side * 0.6, COB_BOT - 1);
      ctx.quadraticCurveTo(midX - side * 2, midY, tipX - side * 1.2, tipY + 1.2);
      ctx.quadraticCurveTo(midX + side * 1, midY + 2.5, baseX + side * 1.8, COB_BOT - 1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgb4(dark, 0.7);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(baseX + side * 1, COB_BOT - 1);
      ctx.quadraticCurveTo(midX, midY, tipX - side * 0.8, tipY + 0.8);
      ctx.stroke();
      if (p.huskBrownAmt > 0.05) {
        ctx.fillStyle = rgb4([120, 78, 32], p.huskBrownAmt);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY, 1.6, 1.1, side * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.strokeStyle = rgb4(p.outline, 0.85);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-COB_HALF, COB_TOP + 7);
    ctx.quadraticCurveTo(-COB_HALF - 1, 4, -5, COB_BOT + 1);
    ctx.lineTo(5, COB_BOT + 1);
    ctx.quadraticCurveTo(COB_HALF + 1, 4, COB_HALF, COB_TOP + 7);
    ctx.stroke();
  }
  function frostAndSnow(ctx, p) {
    if (p.snowCapAmt > 0.01) {
      ctx.save();
      ctx.globalAlpha = p.snowCapAmt;
      const cap = ctx.createLinearGradient(0, COB_TOP - 3, 0, COB_TOP + 6);
      cap.addColorStop(0, "#ffffff");
      cap.addColorStop(1, "#dbe6f2");
      ctx.fillStyle = cap;
      ctx.beginPath();
      ctx.moveTo(-COB_HALF + 1, COB_TOP + 7);
      ctx.quadraticCurveTo(-6, COB_TOP - 4, 0, COB_TOP - 3);
      ctx.quadraticCurveTo(6, COB_TOP - 4, COB_HALF - 1, COB_TOP + 7);
      ctx.quadraticCurveTo(0, COB_TOP + 3, -COB_HALF + 1, COB_TOP + 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (p.frostAmt > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.7 * p.frostAmt;
      ctx.fillStyle = "#eaf3ff";
      const specks = [
        [-5, -14],
        [-2, -8],
        [-6, -2],
        [-3, 3],
        [3, -12],
        [5, -5],
        [1, -16],
        [-4, 8]
      ];
      specks.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }
  function sheen(ctx, p) {
    if (p.gloss < 0.02) return;
    ctx.save();
    cobBodyPath(ctx);
    ctx.clip();
    const g = ctx.createLinearGradient(-COB_HALF, COB_TOP, COB_HALF * 0.4, COB_BOT);
    g.addColorStop(0, `rgba(255,255,255,${0.22 * p.gloss})`);
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    cobBodyPath(ctx);
    ctx.fill();
    ctx.restore();
  }
  function paint4(ctx, pRaw, bob, micro) {
    const p = clampP(pRaw);
    const m = micro ?? {};
    contactShadow(ctx, p);
    pad(ctx, p);
    blossom2(ctx, p);
    fallenLeaves(ctx, p);
    ctx.save();
    ctx.translate(0, bob);
    husk(ctx, p, m.leafFlutter ?? 0);
    cobKernels(ctx, p);
    sheen(ctx, p);
    if (m.glint !== void 0 && p.huskOpen > 0.2) {
      ctx.save();
      cobBodyPath(ctx);
      ctx.clip();
      const gy = COB_TOP + 4 + m.glint * 28;
      const grad = ctx.createRadialGradient(-1, gy, 0, -1, gy, 5);
      grad.addColorStop(0, "rgba(255,252,220,0.7)");
      grad.addColorStop(1, "rgba(255,252,220,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(-1, gy, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    silkTuft(ctx, p, m.silkSway ?? 0);
    frostAndSnow(ctx, p);
    if (m.coldSheen !== void 0 && m.coldSheen > 0.01) {
      ctx.save();
      cobBodyPath(ctx);
      ctx.clip();
      ctx.globalAlpha = 0.12 * m.coldSheen;
      ctx.fillStyle = "#cfe6ff";
      cobBodyPath(ctx);
      ctx.fill();
      ctx.restore();
    }
    if (m.dew !== void 0 && m.dew > 0.01) {
      ctx.save();
      ctx.globalAlpha = m.dew;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(-3, -6, 0.9 + 0.5 * m.dew, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2, 2, 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (m.extraFlakes) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      m.extraFlakes.forEach(([fx, fy, r]) => {
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function bobAt4(t) {
    const A = 1.4;
    const w = 1.5;
    return -A * (1 - Math.cos(w * t)) * 0.5;
  }
  function drawCornSpring(ctx) {
    paint4(ctx, SP4.Spring, 0);
  }
  function drawCornSummer(ctx) {
    paint4(ctx, SP4.Summer, 0);
  }
  function drawCornAutumn(ctx) {
    paint4(ctx, SP4.Autumn, 0);
  }
  function drawCornWinter(ctx) {
    paint4(ctx, SP4.Winter, 0);
  }
  function animCornSpring(ctx, t) {
    const dew = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.8));
    paint4(ctx, SP4.Spring, bobAt4(t), {
      silkSway: Math.sin(t * 1.4) * 0.8,
      dew
    });
  }
  function animCornSummer(ctx, t) {
    const glint = t * 0.45 % 1;
    paint4(ctx, SP4.Summer, bobAt4(t), {
      silkSway: Math.sin(t * 1.3) * 1,
      glint
    });
  }
  function animCornAutumn(ctx, t) {
    const leafFlutter = Math.sin(t * 2.2) * 1.4;
    paint4(ctx, SP4.Autumn, bobAt4(t), {
      leafFlutter,
      silkSway: Math.sin(t * 1.1) * 0.7
    });
  }
  function animCornWinter(ctx, t) {
    const seeds = [
      [-6, 1.1, 0],
      [7, 0.9, 0.5]
    ];
    const span = 36;
    const flakes = seeds.map(([fx, r, phase]) => {
      const prog = ((t / 3.6 + phase) % 1 + 1) % 1;
      const fy = -22 + prog * span;
      const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
      return [driftX, fy, r];
    });
    const coldSheen = 0.5 + 0.5 * Math.sin(t * 0.8);
    paint4(ctx, SP4.Winter, bobAt4(t), {
      silkSway: Math.sin(t * 0.9) * 0.5,
      extraFlakes: flakes,
      coldSheen
    });
  }
  function makeTransition3(from, to) {
    return (ctx, pp) => {
      const t = smoother4(clamp015(pp));
      paint4(ctx, lerpP4(SP4[from], SP4[to], t), 0);
    };
  }
  var springToSummer4 = makeTransition3("Spring", "Summer");
  var summerToAutumn4 = makeTransition3("Summer", "Autumn");
  var autumnToWinter4 = makeTransition3("Autumn", "Winter");
  var VARIANTS6 = {
    Spring: { draw: drawCornSpring, anim: animCornSpring },
    Summer: { draw: drawCornSummer, anim: animCornSummer },
    Autumn: { draw: drawCornAutumn, anim: animCornAutumn },
    Winter: { draw: drawCornWinter, anim: animCornWinter }
  };
  var TRANSITIONS6 = {
    0: springToSummer4,
    1: summerToAutumn4,
    2: autumnToWinter4
  };

  // src/textures/seasonal/veg/pepper.ts
  function clamp016(x) {
    if (!(x >= 0)) return 0;
    if (x > 1) return 1;
    return x;
  }
  var smoother5 = (x) => x * x * x * (x * (6 * x - 15) + 10);
  function lerp7(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpRGB3(a, b, t) {
    return [lerp7(a[0], b[0], t), lerp7(a[1], b[1], t), lerp7(a[2], b[2], t)];
  }
  function rgb5(c) {
    return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  }
  function rgba(c, a) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp016(a)})`;
  }
  function lerpP5(a, b, t) {
    return {
      skinLight: lerpRGB3(a.skinLight, b.skinLight, t),
      skinMid: lerpRGB3(a.skinMid, b.skinMid, t),
      skinDark: lerpRGB3(a.skinDark, b.skinDark, t),
      stem: lerpRGB3(a.stem, b.stem, t),
      padGrass: lerpRGB3(a.padGrass, b.padGrass, t),
      padDark: lerpRGB3(a.padDark, b.padDark, t),
      soil: lerpRGB3(a.soil, b.soil, t),
      outline: lerpRGB3(a.outline, b.outline, t),
      light: lerpRGB3(a.light, b.light, t),
      lightAmt: lerp7(a.lightAmt, b.lightAmt, t),
      ripeness: lerp7(a.ripeness, b.ripeness, t),
      gloss: lerp7(a.gloss, b.gloss, t),
      frostAmt: lerp7(a.frostAmt, b.frostAmt, t),
      snowCapAmt: lerp7(a.snowCapAmt, b.snowCapAmt, t),
      padSnowAmt: lerp7(a.padSnowAmt, b.padSnowAmt, t),
      blossomAmt: lerp7(a.blossomAmt, b.blossomAmt, t),
      fallenLeafAmt: lerp7(a.fallenLeafAmt, b.fallenLeafAmt, t)
    };
  }
  function clampP2(p) {
    return {
      ...p,
      lightAmt: clamp016(p.lightAmt),
      ripeness: clamp016(p.ripeness),
      gloss: clamp016(p.gloss),
      frostAmt: clamp016(p.frostAmt),
      snowCapAmt: clamp016(p.snowCapAmt),
      padSnowAmt: clamp016(p.padSnowAmt),
      blossomAmt: clamp016(p.blossomAmt),
      fallenLeafAmt: clamp016(p.fallenLeafAmt)
    };
  }
  var SP5 = {
    // Spring — fresh pastel; green unripe pepper; bright lime dewy pad + blossom.
    Spring: {
      skinLight: [150, 210, 96],
      skinMid: [96, 170, 64],
      skinDark: [54, 116, 44],
      stem: [104, 158, 58],
      padGrass: [128, 206, 86],
      padDark: [72, 138, 58],
      soil: [120, 84, 48],
      outline: [40, 64, 30],
      light: [232, 244, 226],
      lightAmt: 0.16,
      ripeness: 0.15,
      gloss: 0.18,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0.85,
      fallenLeafAmt: 0
    },
    // Summer — richest saturated peak; full glossy RED; warm light, strong gloss.
    Summer: {
      skinLight: [248, 96, 70],
      skinMid: [214, 46, 40],
      skinDark: [150, 22, 28],
      stem: [86, 150, 50],
      padGrass: [86, 168, 70],
      padDark: [44, 110, 48],
      soil: [126, 86, 48],
      outline: [86, 18, 22],
      light: [255, 240, 206],
      lightAmt: 0.18,
      ripeness: 0.75,
      gloss: 0.95,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0
    },
    // Autumn — deeper darker ripe red; gold/rust pad; a couple fallen leaves.
    Autumn: {
      skinLight: [212, 76, 52],
      skinMid: [172, 38, 34],
      skinDark: [108, 22, 26],
      stem: [122, 124, 56],
      padGrass: [150, 152, 86],
      padDark: [104, 96, 52],
      soil: [120, 80, 44],
      outline: [70, 18, 20],
      light: [248, 210, 150],
      lightAmt: 0.2,
      ripeness: 1,
      gloss: 0.45,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0.85
    },
    // Winter — cool blue-grey light; frost-dusted red pepper, snow cap, pad snow.
    Winter: {
      skinLight: [196, 84, 70],
      skinMid: [158, 48, 50],
      skinDark: [98, 34, 44],
      stem: [108, 122, 86],
      padGrass: [176, 196, 214],
      padDark: [120, 146, 172],
      soil: [128, 110, 96],
      outline: [56, 40, 52],
      light: [206, 226, 252],
      lightAmt: 0.3,
      ripeness: 0.9,
      gloss: 0.25,
      frostAmt: 0.7,
      snowCapAmt: 0.85,
      padSnowAmt: 0.9,
      blossomAmt: 0,
      fallenLeafAmt: 0
    }
  };
  var PEP_TOP = -10;
  var PEP_BOT = 16;
  var PEP_HALF = 13;
  var LOBES = [-8.5, -2.8, 3.2, 9];
  function pepperBodyPath(ctx, bob) {
    const t = PEP_TOP + bob;
    const b = PEP_BOT + bob;
    const h = PEP_HALF;
    ctx.beginPath();
    ctx.moveTo(-h * 0.78, t + 2);
    ctx.quadraticCurveTo(-h * 0.7, t - 4, -3.4, t - 5.4);
    ctx.quadraticCurveTo(0, t - 6.6, 3.4, t - 5.4);
    ctx.quadraticCurveTo(h * 0.7, t - 4, h * 0.78, t + 2);
    ctx.quadraticCurveTo(h + 1, lerp7(t, b, 0.45), h * 0.92, b - 5);
    ctx.quadraticCurveTo(h * 0.82, b + 1.5, 9, b - 1);
    ctx.quadraticCurveTo(6.6, b + 2.4, 3.2, b - 0.5);
    ctx.quadraticCurveTo(0.3, b + 2.6, -2.8, b - 0.5);
    ctx.quadraticCurveTo(-6, b + 2.4, -8.5, b - 1);
    ctx.quadraticCurveTo(-h * 0.82, b + 1.5, -h * 0.92, b - 5);
    ctx.quadraticCurveTo(-h - 1, lerp7(t, b, 0.45), -h * 0.78, t + 2);
    ctx.closePath();
  }
  function paint5(ctx, raw, bob) {
    const p = clampP2(raw);
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.fillStyle = rgba(p.padDark, 0.4);
      ctx.beginPath();
      ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb5(p.padDark);
      ctx.beginPath();
      ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb5(p.padGrass);
      ctx.beginPath();
      ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb5(p.padDark);
      ctx.lineWidth = 1.1;
      for (let i = -7; i <= 7; i++) {
        const tx = i * 2.4;
        const ty = 19 - Math.sqrt(Math.max(0, 1 - (tx / 18) ** 2)) * 5.2;
        ctx.beginPath();
        ctx.moveTo(tx, ty + 0.4);
        ctx.lineTo(tx - 0.8, ty - 2.4);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba([255, 255, 255], 0.18);
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i += 2) {
        const tx = i * 2.6 - 2;
        ctx.beginPath();
        ctx.moveTo(tx, 18.4);
        ctx.lineTo(tx - 0.6, 16.6);
        ctx.stroke();
      }
      if (p.padSnowAmt > 0.01) {
        ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
        ctx.beginPath();
        ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
        ctx.beginPath();
        ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
        [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      if (p.blossomAmt > 0.01) {
        const a = p.blossomAmt;
        const spots = [[-13, 18.5], [12, 17.8], [-4, 21]];
        spots.forEach(([bx, by], idx) => {
          ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
          for (let k = 0; k < 5; k++) {
            const ang = k / 5 * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(bx + Math.cos(ang) * 1.5, by + Math.sin(ang) * 1, 1.1, 0.8, ang, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = rgba([255, 214, 90], a);
          ctx.beginPath();
          ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      if (p.fallenLeafAmt > 0.01) {
        const a = p.fallenLeafAmt;
        const leaves = [
          [-12, 19.6, -0.5, [196, 120, 40]],
          [12, 18.6, 0.7, [176, 72, 32]]
        ];
        leaves.forEach(([lx, ly, rot, col]) => {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(rot);
          ctx.fillStyle = rgba(col, a);
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = rgba([90, 44, 16], a);
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(-3, 0);
          ctx.lineTo(3, 0);
          ctx.stroke();
          ctx.restore();
        });
      }
      ctx.fillStyle = rgb5(p.soil);
      ctx.beginPath();
      ctx.ellipse(0, PEP_BOT + bob + 1.5, 9, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(p.outline, 0.28);
      ctx.beginPath();
      ctx.ellipse(2.5, PEP_BOT + bob + 2, 11, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      pepperBodyPath(ctx, bob);
      ctx.fillStyle = rgb5(p.outline);
      ctx.fill();
      ctx.save();
      pepperBodyPath(ctx, bob);
      ctx.clip();
      const top = PEP_TOP + bob;
      const bot = PEP_BOT + bob;
      ctx.fillStyle = rgb5(p.skinMid);
      ctx.fillRect(-PEP_HALF - 3, top - 8, (PEP_HALF + 3) * 2, bot - top + 14);
      const litGrad = ctx.createLinearGradient(-PEP_HALF, top - 4, PEP_HALF, bot);
      litGrad.addColorStop(0, rgb5(p.skinLight));
      litGrad.addColorStop(0.45, rgb5(p.skinMid));
      litGrad.addColorStop(1, rgb5(p.skinDark));
      ctx.fillStyle = litGrad;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(-2, lerp7(top, bot, 0.42), PEP_HALF + 2, (bot - top) * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(p.skinDark, 0.85);
      ctx.lineWidth = 2.2;
      LOBES.forEach((lx, i) => {
        if (i === 0) return;
        const cx = (LOBES[i - 1] + lx) / 2;
        ctx.beginPath();
        ctx.moveTo(cx + 1.4, top + 1);
        ctx.quadraticCurveTo(cx, lerp7(top, bot, 0.55), cx, bot - 1.5);
        ctx.stroke();
      });
      ctx.strokeStyle = rgba(p.skinLight, 0.5);
      ctx.lineWidth = 1.3;
      [-6.4, 0.2, 6.2].forEach((cx) => {
        ctx.beginPath();
        ctx.moveTo(cx - 1.2, top + 1);
        ctx.quadraticCurveTo(cx - 1.6, lerp7(top, bot, 0.5), cx - 1.4, bot - 3);
        ctx.stroke();
      });
      ctx.fillStyle = rgba(p.skinDark, 0.55);
      LOBES.forEach((lx) => {
        ctx.beginPath();
        ctx.ellipse(lx, bot - 2.5, 3.2, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      if (p.gloss > 0.02) {
        ctx.fillStyle = rgba([255, 255, 255], 0.16 + 0.6 * p.gloss);
        ctx.beginPath();
        ctx.ellipse(-5.5, lerp7(top, bot, 0.34), 1.7, (bot - top) * 0.28, -0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.4 * p.gloss);
        ctx.beginPath();
        ctx.ellipse(1.5, lerp7(top, bot, 0.3), 1, (bot - top) * 0.22, -0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.frostAmt > 0.02) {
        ctx.fillStyle = rgba([210, 230, 250], 0.28 * p.frostAmt);
        ctx.beginPath();
        ctx.ellipse(-1, lerp7(top, bot, 0.28), PEP_HALF, (bot - top) * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
        const speck = [
          [-8, top + 2],
          [-3, top + 1],
          [3, top + 2.5],
          [8, top + 3],
          [-6, lerp7(top, bot, 0.4)],
          [5, lerp7(top, bot, 0.45)],
          [0, lerp7(top, bot, 0.3)]
        ];
        speck.forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();
      if (p.snowCapAmt > 0.02) {
        const a = p.snowCapAmt;
        ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
        ctx.beginPath();
        ctx.moveTo(-PEP_HALF * 0.7, top + 1);
        ctx.quadraticCurveTo(-4, top - 6, 0, top - 4.5);
        ctx.quadraticCurveTo(4, top - 6, PEP_HALF * 0.7, top + 1);
        ctx.quadraticCurveTo(6, top + 3.5, 2, top + 2);
        ctx.quadraticCurveTo(0, top + 4, -2, top + 2);
        ctx.quadraticCurveTo(-6, top + 3.5, -PEP_HALF * 0.7, top + 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
        ctx.beginPath();
        ctx.ellipse(0, top + 1.6, PEP_HALF * 0.62, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const stemBaseY = top - 3.5;
      ctx.fillStyle = rgb5(p.stem);
      ctx.beginPath();
      ctx.moveTo(-5.4, stemBaseY + 2);
      ctx.quadraticCurveTo(-3, stemBaseY - 1, -1.4, stemBaseY + 1.4);
      ctx.quadraticCurveTo(0, stemBaseY - 1, 1.4, stemBaseY + 1.4);
      ctx.quadraticCurveTo(3, stemBaseY - 1, 5.4, stemBaseY + 2);
      ctx.quadraticCurveTo(2.5, stemBaseY + 3.2, 0, stemBaseY + 2.6);
      ctx.quadraticCurveTo(-2.5, stemBaseY + 3.2, -5.4, stemBaseY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgb5(p.outline);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.strokeStyle = rgb5(p.outline);
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(-0.3, stemBaseY + 0.5);
      ctx.quadraticCurveTo(-0.8, stemBaseY - 5, 0.6, stemBaseY - 8);
      ctx.stroke();
      ctx.strokeStyle = rgb5(p.stem);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-0.3, stemBaseY + 0.5);
      ctx.quadraticCurveTo(-0.8, stemBaseY - 5, 0.6, stemBaseY - 8);
      ctx.stroke();
      ctx.strokeStyle = rgba(p.skinLight, 0.4);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-1.1, stemBaseY - 1);
      ctx.quadraticCurveTo(-1.4, stemBaseY - 5, -0.4, stemBaseY - 7.5);
      ctx.stroke();
      if (p.lightAmt > 1e-3) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = rgba(p.light, p.lightAmt);
        const lg = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
        lg.addColorStop(0, rgba(p.light, p.lightAmt));
        lg.addColorStop(1, rgba(p.light, p.lightAmt * 0.25));
        ctx.fillStyle = lg;
        ctx.fillRect(-24, -24, 48, 48);
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  function bobAt5(t, amp = 0.9, w = 1.5) {
    return amp * (1 - Math.cos(w * t)) * 0.5;
  }
  function draw2(season) {
    return (ctx) => paint5(ctx, SP5[season], 0);
  }
  function anim2(season) {
    return (ctx, t) => {
      const bob = bobAt5(t);
      paint5(ctx, SP5[season], bob);
      ctx.save();
      try {
        ctx.globalAlpha = 1;
        if (season === "Spring") {
          const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
          ctx.fillStyle = `rgba(255,255,255,${g})`;
          const gy = -2 + bob + Math.sin(t * 1.1) * 1.2;
          ctx.beginPath();
          ctx.arc(-5, gy, 1.1 + g * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (season === "Summer") {
          const prog = t * 0.5 % 1;
          const top = PEP_TOP + bob;
          const bot = PEP_BOT + bob;
          const gy = lerp7(top + 1, bot - 2, prog);
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath();
          ctx.ellipse(-5, gy, 1.5, 2.6, -0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath();
          ctx.ellipse(1.5, gy * 0.96, 1, 1.9, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (season === "Autumn") {
          const s = 0.12 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.9));
          ctx.fillStyle = `rgba(255,236,200,${s})`;
          ctx.beginPath();
          ctx.ellipse(-4, -4 + bob, 4.5, 3.2, -0.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const seeds = [
            [-9, 0, 1],
            [6, 0.4, 0.9],
            [11, 0.7, 0.8],
            [-2, 0.25, 0.9]
          ];
          ctx.fillStyle = "#ffffff";
          seeds.forEach(([fx, phase, r]) => {
            const prog = ((t / 3 + phase) % 1 + 1) % 1;
            const fy = -22 + prog * 38;
            const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
            ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
            ctx.beginPath();
            ctx.arc(dx, fy, r, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.8));
          ctx.fillStyle = "rgba(210,232,255,1)";
          ctx.beginPath();
          ctx.ellipse(-3, 0 + bob, 6, 4, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      } finally {
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    };
  }
  function makeTransition4(fromIdx) {
    const from = SP5[SEASON_NAMES[fromIdx]];
    const to = SP5[SEASON_NAMES[fromIdx + 1]];
    return (ctx, pp) => {
      const k = smoother5(clamp016(pp));
      paint5(ctx, lerpP5(from, to, k), 0);
    };
  }
  var springToSummer5 = makeTransition4(0);
  var summerToAutumn5 = makeTransition4(1);
  var autumnToWinter5 = makeTransition4(2);
  var VARIANTS7 = {
    Spring: { draw: draw2("Spring"), anim: anim2("Spring") },
    Summer: { draw: draw2("Summer"), anim: anim2("Summer") },
    Autumn: { draw: draw2("Autumn"), anim: anim2("Autumn") },
    Winter: { draw: draw2("Winter"), anim: anim2("Winter") }
  };
  var TRANSITIONS7 = {
    0: springToSummer5,
    1: summerToAutumn5,
    2: autumnToWinter5
  };

  // src/textures/seasonal/veg/mushroom.ts
  function clamp017(x) {
    if (!Number.isFinite(x)) return 0;
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  var smoother6 = (x) => x * x * x * (x * (6 * x - 15) + 10);
  function lerp8(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpRGB4(a, b, t) {
    return [lerp8(a[0], b[0], t), lerp8(a[1], b[1], t), lerp8(a[2], b[2], t)];
  }
  function rgb6(c, alpha = 1) {
    const r = Math.round(c[0]);
    const g = Math.round(c[1]);
    const b = Math.round(c[2]);
    return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
  }
  function mix2(c, target, k) {
    return lerpRGB4(c, target, clamp017(k));
  }
  function shade(c, k) {
    return k >= 0 ? mix2(c, [255, 255, 255], k) : mix2(c, [0, 0, 0], -k);
  }
  var SPRING = {
    cap: [223, 74, 64],
    // fresh bright red
    spot: [255, 250, 240],
    stem: [246, 238, 220],
    grass: [150, 214, 96],
    // bright lime dewy
    soil: [92, 70, 44],
    outline: [74, 48, 40],
    light: [214, 240, 255],
    // cool-bright
    lightAmt: 0.32,
    capOpenAmount: 0.18,
    // small button caps
    gloss: 0.32,
    droop: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0
  };
  var SUMMER = {
    cap: [214, 44, 40],
    // vivid saturated red
    spot: [255, 248, 232],
    stem: [240, 230, 206],
    grass: [86, 168, 64],
    // saturated mid-green
    soil: [82, 60, 36],
    outline: [66, 40, 32],
    light: [255, 246, 214],
    // warm
    lightAmt: 0.4,
    capOpenAmount: 0.6,
    // full rounded domes
    gloss: 0.62,
    droop: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0
  };
  var AUTUMN = {
    cap: [176, 40, 36],
    // deep mature red
    spot: [238, 222, 188],
    // ageing cream
    stem: [226, 210, 178],
    grass: [150, 142, 78],
    // olive-tan
    soil: [86, 58, 30],
    outline: [70, 42, 28],
    light: [255, 224, 168],
    // low amber
    lightAmt: 0.42,
    capOpenAmount: 1,
    // peak size, edges flattening
    gloss: 0.34,
    droop: 0.06,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.9
  };
  var WINTER = {
    cap: [168, 76, 70],
    // muted but clearly red
    spot: [240, 240, 244],
    stem: [222, 220, 222],
    grass: [126, 150, 150],
    // cool grey-green under snow
    soil: [78, 76, 86],
    outline: [64, 60, 72],
    light: [206, 224, 248],
    // cool blue-grey
    lightAmt: 0.46,
    capOpenAmount: 0.78,
    // mature, drooping a touch
    gloss: 0.22,
    droop: 0.22,
    frostAmt: 0.85,
    snowCapAmt: 0.7,
    padSnowAmt: 0.92,
    blossomAmt: 0,
    fallenLeafAmt: 0
  };
  var SP6 = {
    Spring: SPRING,
    Summer: SUMMER,
    Autumn: AUTUMN,
    Winter: WINTER
  };
  function lerpP6(a, b, t) {
    return {
      cap: lerpRGB4(a.cap, b.cap, t),
      spot: lerpRGB4(a.spot, b.spot, t),
      stem: lerpRGB4(a.stem, b.stem, t),
      grass: lerpRGB4(a.grass, b.grass, t),
      soil: lerpRGB4(a.soil, b.soil, t),
      outline: lerpRGB4(a.outline, b.outline, t),
      light: lerpRGB4(a.light, b.light, t),
      lightAmt: lerp8(a.lightAmt, b.lightAmt, t),
      capOpenAmount: lerp8(a.capOpenAmount, b.capOpenAmount, t),
      gloss: lerp8(a.gloss, b.gloss, t),
      droop: lerp8(a.droop, b.droop, t),
      frostAmt: lerp8(a.frostAmt, b.frostAmt, t),
      snowCapAmt: lerp8(a.snowCapAmt, b.snowCapAmt, t),
      padSnowAmt: lerp8(a.padSnowAmt, b.padSnowAmt, t),
      blossomAmt: lerp8(a.blossomAmt, b.blossomAmt, t),
      fallenLeafAmt: lerp8(a.fallenLeafAmt, b.fallenLeafAmt, t)
    };
  }
  function paintPad(ctx, p) {
    const cy = 19;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(3, cy + 2.5, 17, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb6(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, cy + 1.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb6(p.grass);
    ctx.beginPath();
    ctx.ellipse(0, cy - 0.2, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb6(shade(p.grass, 0.22));
    ctx.beginPath();
    ctx.ellipse(-2, cy - 1.4, 13, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb6(shade(p.grass, -0.18));
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      const a = -0.18 + i / 10 * (Math.PI + 0.36);
      const ex = Math.cos(a) * 17.5;
      const ey = cy - 0.2 + Math.sin(a) * 4.8;
      const lean = ex < 0 ? -1 : 1;
      ctx.strokeStyle = rgb6(shade(p.grass, i % 2 ? 0.18 : -0.14));
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + lean * 1.2, ey - 2.6);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    if (p.blossomAmt > 0.01) {
      const a = clamp017(p.blossomAmt);
      const flowers = [
        [-11, 18, 1],
        [12, 20, 0.85]
      ];
      flowers.forEach(([fx, fy, s]) => {
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        for (let k = 0; k < 5; k++) {
          const ang = k / 5 * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(fx + Math.cos(ang) * 1.6 * s, fy + Math.sin(ang) * 1.6 * s, 1 * s, 1 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,214,84,0.95)";
        ctx.beginPath();
        ctx.arc(fx, fy, 0.9 * s, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    if (p.fallenLeafAmt > 0.01) {
      const a = clamp017(p.fallenLeafAmt);
      const leaves = [
        [-12, 20, 0.5, [196, 120, 40]],
        [11, 21, -0.7, [168, 70, 36]]
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgb6(col);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgb6(shade(col, -0.3));
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }
    if (p.padSnowAmt > 0.01) {
      const a = clamp017(p.padSnowAmt);
      ctx.globalAlpha = a;
      const snow = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
      snow.addColorStop(0, "rgba(244,248,255,1)");
      snow.addColorStop(1, "rgba(206,222,240,1)");
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.ellipse(0, cy - 0.6, 16.5 * (0.6 + 0.4 * a), 4.4 * (0.6 + 0.4 * a), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function paintMushroom(ctx, p, bx, by, scale, sparkle) {
    const open = clamp017(p.capOpenAmount);
    const capW = (6 + open * 4) * scale;
    const capH = (5.6 - open * 1.4) * scale;
    const droop = p.droop * 2.4 * scale;
    const stemH = (9 - open * 1) * scale;
    const stemW = (2.6 + open * 0.4) * scale;
    const capCy = by - stemH;
    const stemGrad = ctx.createLinearGradient(bx - stemW, 0, bx + stemW, 0);
    stemGrad.addColorStop(0, rgb6(shade(p.stem, -0.22)));
    stemGrad.addColorStop(0.45, rgb6(p.stem));
    stemGrad.addColorStop(1, rgb6(shade(p.stem, 0.12)));
    ctx.fillStyle = stemGrad;
    ctx.beginPath();
    ctx.moveTo(bx - stemW, by);
    ctx.quadraticCurveTo(bx - stemW * 0.7, by - stemH * 0.5, bx - stemW * 0.85, capCy + capH * 0.3);
    ctx.lineTo(bx + stemW * 0.85, capCy + capH * 0.3);
    ctx.quadraticCurveTo(bx + stemW * 0.7, by - stemH * 0.5, bx + stemW, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb6(p.outline, 0.9);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.save();
    ctx.translate(bx, capCy);
    ctx.fillStyle = rgb6(shade(p.cap, -0.42));
    ctx.beginPath();
    ctx.ellipse(0, droop + capH * 0.35, capW + 0.8, capH + 0.8, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    const capGrad = ctx.createLinearGradient(-capW, -capH, capW, capH);
    capGrad.addColorStop(0, rgb6(shade(p.cap, 0.28)));
    capGrad.addColorStop(0.55, rgb6(p.cap));
    capGrad.addColorStop(1, rgb6(shade(p.cap, -0.3)));
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.ellipse(0, droop, capW, capH, 0, Math.PI, Math.PI * 2);
    ctx.ellipse(0, droop, capW, capH * 0.4, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = rgb6(p.outline);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, droop, capW, capH, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    if (p.gloss > 0.01) {
      ctx.globalAlpha = clamp017(p.gloss);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(-capW * 0.38, droop - capH * 0.42, capW * 0.34, capH * 0.3, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const spots = [
      [-capW * 0.45, droop - capH * 0.3, 0.9],
      [capW * 0.1, droop - capH * 0.55, 1],
      [capW * 0.5, droop - capH * 0.2, 0.85],
      [-capW * 0.1, droop - capH * 0.08, 0.8],
      [capW * 0.32, droop - capH * 0.66, 0.6]
    ];
    spots.forEach(([sx, sy, sr], i) => {
      const r = sr * 1.5 * scale;
      ctx.fillStyle = rgb6(p.spot);
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      if (sparkle > 0.01 && i % 2 === 0) {
        ctx.globalAlpha = clamp017(sparkle);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    if (p.frostAmt > 0.01) {
      const f = clamp017(p.frostAmt);
      ctx.globalAlpha = 0.5 * f;
      ctx.strokeStyle = "rgba(226,240,255,1)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, droop + capH * 0.15, capW * 0.96, capH * 0.92, 0, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
      ctx.fillStyle = "rgba(240,248,255,1)";
      const frost = [
        [-capW * 0.6, droop - capH * 0.1],
        [capW * 0.55, droop - capH * 0.35],
        [-capW * 0.2, droop - capH * 0.5]
      ];
      frost.forEach(([fx, fy]) => {
        ctx.globalAlpha = f * (0.4 + 0.5 * sparkle + 0.3);
        ctx.beginPath();
        ctx.arc(fx, fy, 0.7 * scale, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    if (p.snowCapAmt > 0.01) {
      const s = clamp017(p.snowCapAmt);
      ctx.globalAlpha = s;
      ctx.fillStyle = "rgba(248,251,255,1)";
      ctx.beginPath();
      ctx.ellipse(-capW * 0.12, droop - capH * 0.62, capW * 0.62 * s + capW * 0.18, capH * 0.5 * s + 0.6, -0.18, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-capW * 0.4, droop - capH * 0.42, 1.4 * scale, 1 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(capW * 0.2, droop - capH * 0.5, 1.6 * scale, 1.1 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function paint6(ctx, p, bob) {
    ctx.save();
    try {
      paintPad(ctx, p);
      const baseY = 18 + bob;
      paintMushroom(ctx, p, -8.5, baseY - 1.5, 0.62, 0);
      paintMushroom(ctx, p, 9.5, baseY - 0.5, 0.7, 0);
      paintMushroom(ctx, p, 0.5, baseY + 0.5, 1, 0);
      if (p.lightAmt > 1e-3) {
        const g = ctx.createRadialGradient(-8, -8, 2, 0, 0, 34);
        g.addColorStop(0, rgb6(p.light, 0.16 * p.lightAmt));
        g.addColorStop(1, rgb6(p.light, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-24, -24, 48, 48);
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  var drawFor = (season) => (ctx) => paint6(ctx, SP6[season], 0);
  function bobAt6(t, amp, w) {
    return amp * (1 - Math.cos(w * t)) * 0.5;
  }
  var animFor = (season) => (ctx, t) => {
    const bob = -bobAt6(t, 0.9, 1.5);
    ctx.save();
    try {
      paintPad(ctx, SP6[season]);
      const p = SP6[season];
      const baseY = 18 + bob;
      paintMushroom(ctx, p, -8.5, baseY - 1.5, 0.62, 0);
      paintMushroom(ctx, p, 9.5, baseY - 0.5, 0.7, 0);
      let sparkle = 0;
      if (season === "Spring") sparkle = 0.4 + 0.4 * (0.5 - 0.5 * Math.cos(t * 2.2));
      if (season === "Summer") sparkle = 0.5 * (0.5 - 0.5 * Math.cos(t * 1.8));
      if (season === "Winter") sparkle = 0.45 * (0.5 - 0.5 * Math.cos(t * 1.4));
      paintMushroom(ctx, p, 0.5, baseY + 0.5, 1, sparkle);
      if (season === "Autumn") {
        const rock = Math.sin(t * 1.2) * 0.25;
        ctx.save();
        ctx.globalAlpha = clamp017(p.fallenLeafAmt);
        ctx.translate(-12, 20);
        ctx.rotate(0.5 + rock);
        ctx.fillStyle = "rgb(196,120,40)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (season === "Winter") {
        const seeds = [
          [-7, 1, 0],
          [8, 0.8, 0.5]
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, r, phase]) => {
          const prog = ((t / 3.4 + phase) % 1 + 1) % 1;
          const fy = -18 + prog * 32;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.85 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      if (p.lightAmt > 1e-3) {
        const g = ctx.createRadialGradient(-8, -8, 2, 0, 0, 34);
        g.addColorStop(0, rgb6(p.light, 0.16 * p.lightAmt));
        g.addColorStop(1, rgb6(p.light, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-24, -24, 48, 48);
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
  var springToSummer6 = (ctx, pp) => paint6(ctx, lerpP6(SP6.Spring, SP6.Summer, smoother6(clamp017(pp))), 0);
  var summerToAutumn6 = (ctx, pp) => paint6(ctx, lerpP6(SP6.Summer, SP6.Autumn, smoother6(clamp017(pp))), 0);
  var autumnToWinter6 = (ctx, pp) => paint6(ctx, lerpP6(SP6.Autumn, SP6.Winter, smoother6(clamp017(pp))), 0);
  var VARIANTS8 = {
    Spring: { draw: drawFor("Spring"), anim: animFor("Spring") },
    Summer: { draw: drawFor("Summer"), anim: animFor("Summer") },
    Autumn: { draw: drawFor("Autumn"), anim: animFor("Autumn") },
    Winter: { draw: drawFor("Winter"), anim: animFor("Winter") }
  };
  var TRANSITIONS8 = {
    0: springToSummer6,
    1: summerToAutumn6,
    2: autumnToWinter6
  };

  // src/textures/seasonal/veg/beet.ts
  function clamp018(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function lerp9(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpRGB5(a, b, t) {
    return [lerp9(a[0], b[0], t), lerp9(a[1], b[1], t), lerp9(a[2], b[2], t)];
  }
  function rgb7(c) {
    return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  }
  function rgba2(c, a) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp018(a)})`;
  }
  function smoother7(x) {
    return x * x * x * (x * (6 * x - 15) + 10);
  }
  function bobAt7(t, amp, w) {
    return amp * (1 - Math.cos(w * t)) * 0.5;
  }
  var SP7 = {
    Spring: {
      rootHi: [216, 96, 120],
      rootMid: [180, 56, 84],
      rootShade: [126, 32, 58],
      leafHi: [150, 206, 96],
      leafMid: [86, 156, 58],
      veins: [196, 70, 96],
      padGrass: [138, 206, 92],
      padShade: [80, 140, 60],
      soil: [92, 64, 38],
      outline: [70, 30, 40],
      light: [225, 240, 255],
      ripeness: 0.32,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0.85,
      fallenLeafAmt: 0,
      leafYellow: 0,
      gloss: 0.3,
      lightAmt: 0.28
    },
    Summer: {
      rootHi: [214, 70, 96],
      rootMid: [168, 36, 64],
      rootShade: [104, 18, 42],
      leafHi: [120, 184, 70],
      leafMid: [54, 122, 44],
      veins: [186, 48, 72],
      padGrass: [88, 174, 70],
      padShade: [48, 116, 50],
      soil: [82, 54, 30],
      outline: [56, 22, 32],
      light: [255, 244, 210],
      ripeness: 0.62,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      leafYellow: 0,
      gloss: 0.85,
      lightAmt: 0.34
    },
    Autumn: {
      rootHi: [186, 60, 84],
      rootMid: [138, 30, 56],
      rootShade: [82, 16, 36],
      leafHi: [150, 158, 70],
      leafMid: [78, 104, 44],
      veins: [168, 56, 56],
      padGrass: [150, 154, 84],
      padShade: [104, 100, 56],
      soil: [88, 58, 32],
      outline: [54, 28, 24],
      light: [255, 214, 150],
      ripeness: 0.92,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0.8,
      leafYellow: 0.7,
      gloss: 0.4,
      lightAmt: 0.32
    },
    Winter: {
      rootHi: [176, 92, 110],
      rootMid: [134, 46, 70],
      rootShade: [86, 28, 48],
      leafHi: [120, 158, 118],
      leafMid: [70, 110, 80],
      veins: [150, 78, 86],
      padGrass: [186, 204, 214],
      padShade: [134, 158, 178],
      soil: [96, 84, 78],
      outline: [60, 50, 60],
      light: [206, 226, 255],
      ripeness: 0.78,
      frostAmt: 0.62,
      snowCapAmt: 0.7,
      padSnowAmt: 0.85,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      leafYellow: 0.12,
      gloss: 0.4,
      lightAmt: 0.3
    }
  };
  function lerpP7(a, b, t) {
    return {
      rootHi: lerpRGB5(a.rootHi, b.rootHi, t),
      rootMid: lerpRGB5(a.rootMid, b.rootMid, t),
      rootShade: lerpRGB5(a.rootShade, b.rootShade, t),
      leafHi: lerpRGB5(a.leafHi, b.leafHi, t),
      leafMid: lerpRGB5(a.leafMid, b.leafMid, t),
      veins: lerpRGB5(a.veins, b.veins, t),
      padGrass: lerpRGB5(a.padGrass, b.padGrass, t),
      padShade: lerpRGB5(a.padShade, b.padShade, t),
      soil: lerpRGB5(a.soil, b.soil, t),
      outline: lerpRGB5(a.outline, b.outline, t),
      light: lerpRGB5(a.light, b.light, t),
      ripeness: lerp9(a.ripeness, b.ripeness, t),
      frostAmt: lerp9(a.frostAmt, b.frostAmt, t),
      snowCapAmt: lerp9(a.snowCapAmt, b.snowCapAmt, t),
      padSnowAmt: lerp9(a.padSnowAmt, b.padSnowAmt, t),
      blossomAmt: lerp9(a.blossomAmt, b.blossomAmt, t),
      fallenLeafAmt: lerp9(a.fallenLeafAmt, b.fallenLeafAmt, t),
      leafYellow: lerp9(a.leafYellow, b.leafYellow, t),
      gloss: lerp9(a.gloss, b.gloss, t),
      lightAmt: lerp9(a.lightAmt, b.lightAmt, t)
    };
  }
  function paint7(ctx, p, bob) {
    ctx.save();
    ctx.globalAlpha = 1;
    const outline = rgb7(p.outline);
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 17, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb7(p.padShade);
    ctx.beginPath();
    ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb7(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb7(p.padGrass);
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + i / 10 * Math.PI;
      const ex = Math.cos(a) * 17.4;
      const ey = 19 + Math.sin(a) * 5;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(a) * 0.6, ey - 2.1 - i % 2 * 0.7);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.fillStyle = rgba2(p.light, 0.18 * p.lightAmt + 0.06);
    ctx.beginPath();
    ctx.ellipse(-5, 17.5, 11, 2.6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba2([244, 250, 255], 0.9 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.2, 17 * (0.7 + 0.3 * p.padSnowAmt), 4.4 * p.padSnowAmt + 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba2([255, 255, 255], 0.85 * p.padSnowAmt);
      [[-9, 18], [6, 19.5], [12, 17.5], [-2, 20]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.save();
    ctx.translate(0, bob);
    const ripe = clamp018(p.ripeness);
    const bw = 12 + ripe * 1.8;
    const bh = 11 + ripe * 1.6;
    const cy = 9;
    const tipY = cy + bh + 6.2;
    ctx.fillStyle = rgb7(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, cy + bh * 0.4, bw * 0.9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    function bulbPath() {
      ctx.beginPath();
      ctx.moveTo(-bw, cy - bh * 0.1);
      ctx.bezierCurveTo(-bw, cy - bh, -bw * 0.4, cy - bh * 1.25, 0, cy - bh * 1.2);
      ctx.bezierCurveTo(bw * 0.4, cy - bh * 1.25, bw, cy - bh, bw, cy - bh * 0.1);
      ctx.bezierCurveTo(bw, cy + bh * 0.7, bw * 0.45, cy + bh * 0.95, 2, tipY - 2);
      ctx.lineTo(0.6, tipY);
      ctx.lineTo(-0.6, tipY - 0.4);
      ctx.bezierCurveTo(-bw * 0.45, cy + bh * 0.95, -bw, cy + bh * 0.7, -bw, cy - bh * 0.1);
      ctx.closePath();
    }
    bulbPath();
    ctx.fillStyle = rgb7(p.rootShade);
    ctx.fill();
    ctx.save();
    ctx.translate(-0.5, -0.6);
    bulbPath();
    ctx.fillStyle = rgb7(p.rootMid);
    ctx.fill();
    ctx.restore();
    ctx.save();
    bulbPath();
    ctx.clip();
    ctx.fillStyle = rgb7(p.rootHi);
    ctx.beginPath();
    ctx.ellipse(-bw * 0.32, cy - bh * 0.45, bw * 0.7, bh * 0.85, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba2(p.rootShade, 0.35);
    ctx.lineWidth = 1;
    for (let r = 0; r < 2; r++) {
      const ry = cy + bh * (0.15 + r * 0.35);
      ctx.beginPath();
      ctx.ellipse(0, ry, bw * (0.7 - r * 0.18), 2.2, 0, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = rgba2([255, 240, 244], 0.5 * p.gloss + 0.12);
    ctx.beginPath();
    ctx.ellipse(-bw * 0.38, cy - bh * 0.55, bw * 0.22, bh * 0.32, -0.5, 0, Math.PI * 2);
    ctx.fill();
    bulbPath();
    ctx.strokeStyle = rgba2(p.outline, 0.55);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, tipY - 1);
    ctx.quadraticCurveTo(1.6, tipY + 3, 0.4, tipY + 6);
    ctx.stroke();
    ctx.lineCap = "butt";
    const crownY = cy - bh * 1.18;
    const leaves = [
      [-5.4, -8, -18.5],
      [-2.6, -4, -22],
      [0, 0, -23.5],
      [2.6, 4, -22],
      [5.4, 8, -18.5]
    ];
    leaves.forEach(([bx, lean, ty], i) => {
      const baseX = bx * 0.5;
      const baseY = crownY + 1;
      const cpx = bx + lean * 0.4;
      const cpy = crownY - 6;
      const tipX = bx + lean;
      const tipY2 = ty;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cpx * 0.6, (baseY + cpy) * 0.5, cpx, cpy);
      ctx.stroke();
      ctx.strokeStyle = rgb7(p.veins);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cpx * 0.6, (baseY + cpy) * 0.5, cpx, cpy);
      ctx.stroke();
      const drawBlade = (color, inset) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cpx, cpy + inset);
        ctx.quadraticCurveTo(
          cpx - 4.2 + inset * 0.4,
          (cpy + tipY2) * 0.5,
          tipX,
          tipY2 + inset
        );
        ctx.quadraticCurveTo(
          cpx + 4.2 - inset * 0.4,
          (cpy + tipY2) * 0.5,
          cpx,
          cpy + inset
        );
        ctx.closePath();
        ctx.fill();
      };
      drawBlade(outline, 0);
      drawBlade(rgb7(p.leafMid), 1);
      ctx.save();
      ctx.globalAlpha = 0.85;
      drawBlade(rgb7(p.leafHi), 2.6);
      ctx.restore();
      if (p.leafYellow > 0.02) {
        ctx.fillStyle = rgba2([214, 196, 92], 0.7 * p.leafYellow);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY2 + 1.5, 2.4, 4, lean * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = rgba2(p.veins, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cpx, cpy + 1);
      ctx.quadraticCurveTo((cpx + tipX) * 0.5 - 1, (cpy + tipY2) * 0.5, tipX, tipY2 + 1.5);
      ctx.stroke();
      if (p.frostAmt > 0.02) {
        ctx.fillStyle = rgba2([226, 240, 255], 0.4 * p.frostAmt);
        ctx.beginPath();
        ctx.ellipse((cpx + tipX) * 0.5, (cpy + tipY2) * 0.5, 2, 4.2, lean * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      void i;
    });
    ctx.lineCap = "butt";
    if (p.frostAmt > 0.02) {
      ctx.save();
      bulbPath();
      ctx.clip();
      ctx.fillStyle = rgba2([220, 236, 255], 0.45 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-bw * 0.1, cy - bh * 0.6, bw * 0.85, bh * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba2([255, 255, 255], 0.8 * p.frostAmt);
      [[-4, cy - bh * 0.7], [3, cy - bh * 0.5], [-1, cy - bh * 0.2]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    if (p.snowCapAmt > 0.02) {
      ctx.fillStyle = rgba2([248, 252, 255], 0.92 * p.snowCapAmt);
      ctx.beginPath();
      ctx.ellipse(0, crownY - 16, 6.5 * p.snowCapAmt + 1.5, 2.6 * p.snowCapAmt + 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-3, crownY - 13, 2.4 * p.snowCapAmt + 0.6, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (p.blossomAmt > 0.02) {
      const petal2 = rgba2([255, 224, 236], 0.9 * p.blossomAmt);
      const bxC = -12.5;
      const byC = 17;
      ctx.fillStyle = petal2;
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(bxC + Math.cos(a) * 1.7, byC + Math.sin(a) * 1.1, 1.3, 1, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba2([255, 214, 96], p.blossomAmt);
      ctx.beginPath();
      ctx.arc(bxC, byC, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.fallenLeafAmt > 0.02) {
      const leafCol = rgba2([196, 132, 52], 0.95 * p.fallenLeafAmt);
      const edgeCol = rgba2([120, 70, 24], 0.9 * p.fallenLeafAmt);
      const fallen = [
        [11.5, 18.5, 0.5],
        [-13, 19.5, -0.7]
      ];
      fallen.forEach(([fx, fy, rot]) => {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.fillStyle = leafCol;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = edgeCol;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      });
    }
    if (p.lightAmt > 1e-3) {
      ctx.fillStyle = rgba2(p.light, 0.16 * p.lightAmt);
      ctx.beginPath();
      ctx.ellipse(-6, 0, 22, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function draw3(season) {
    return (ctx) => paint7(ctx, SP7[season], 0);
  }
  function anim3(season) {
    return (ctx, t) => {
      const base = SP7[season];
      const bob = bobAt7(t, 0.7, 1.4);
      const p = base;
      let p2 = p;
      if (season === "Summer") {
        const pulse = (1 - Math.cos(t * 2)) * 0.5;
        p2 = { ...base, gloss: clamp018(base.gloss + pulse * 0.18) };
      } else if (season === "Autumn") {
        const flutter = (1 - Math.cos(t * 1.6)) * 0.5;
        p2 = { ...base, leafYellow: clamp018(base.leafYellow + flutter * 0.18) };
      } else if (season === "Winter") {
        const sheen2 = (1 - Math.cos(t * 0.9)) * 0.5;
        p2 = { ...base, frostAmt: clamp018(base.frostAmt + sheen2 * 0.12) };
      } else if (season === "Spring") {
        const dew = (1 - Math.cos(t * 1.8)) * 0.5;
        p2 = { ...base, lightAmt: clamp018(base.lightAmt + dew * 0.12) };
      }
      paint7(ctx, p2, bob);
      if (season === "Winter") {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        const seeds = [
          [-9, 0.9, 0],
          [5, 0.8, 0.4],
          [12, 0.7, 0.7],
          [-3, 0.85, 0.22]
        ];
        seeds.forEach(([fx, r, phase]) => {
          const prog = ((t / 3.4 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
          const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.8 * (1 - prog * 0.3);
          ctx.beginPath();
          ctx.arc(driftX, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    };
  }
  var FROM = ["Spring", "Summer", "Autumn", "Winter"];
  function transition(fromIdx) {
    const a = SP7[FROM[fromIdx]];
    const b = SP7[FROM[fromIdx + 1]];
    return (ctx, pp) => paint7(ctx, lerpP7(a, b, smoother7(clamp018(pp))), 0);
  }
  var VARIANTS9 = {
    Spring: { draw: draw3("Spring"), anim: anim3("Spring") },
    Summer: { draw: draw3("Summer"), anim: anim3("Summer") },
    Autumn: { draw: draw3("Autumn"), anim: anim3("Autumn") },
    Winter: { draw: draw3("Winter"), anim: anim3("Winter") }
  };
  var TRANSITIONS9 = {
    0: transition(0),
    // Spring → Summer
    1: transition(1),
    // Summer → Autumn
    2: transition(2)
    // Autumn → Winter
  };

  // src/textures/seasonal/flower/pansy.ts
  var VIOLET_DARK = "#5a2a8a";
  var VIOLET = "#8a44c8";
  var VIOLET_LIGHT = "#c089ee";
  var PETAL_EDGE = "#3d1a63";
  var THROAT_YELLOW = "#f4d23a";
  var STEM_DARK = "#2c5018";
  var STEM_GREEN = "#4f9a2e";
  var LEAF_GREEN2 = "#5aa336";
  var LEAF_DARK = "#2f5e1c";
  var MAUVE = "#a07296";
  var MAUVE_EDGE = "#6e4a52";
  var BROWN_EDGE = "#7a5230";
  var LEAF_YELLOW = "#b6a23a";
  var DEAD_BROWN = "#6b4a26";
  var DEAD_BROWN_LT = "#8c6638";
  function groundShadow3(ctx, rx = 14, alpha = 0.22) {
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
    groundShadow3(ctx, 12, 0.2);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = -2;
    stem(ctx, cx, cy + 2, sway);
    leafPair(ctx, LEAF_GREEN2, LEAF_DARK, sway * 0.4);
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
    groundShadow3(ctx, 12, 0.2);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = -2;
    stem(ctx, cx, cy + 4, sway);
    leafPair(ctx, LEAF_GREEN2, LEAF_DARK, sway * 0.4);
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
    groundShadow3(ctx, 12, 0.22);
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
  function winterScene(ctx, flakes, sheen2) {
    groundShadow3(ctx, 14, 0.18);
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
    ctx.fillStyle = `rgba(200,224,255,${0.18 + sheen2 * 0.16})`;
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
    const sheen2 = 0.5 + 0.5 * Math.sin(t * 0.8);
    winterScene(ctx, flakes, sheen2);
  }
  function springToSummer7(ctx, p) {
    const q = Math.max(0, Math.min(1, p));
    groundShadow3(ctx, 12, 0.2);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = -2;
    stem(ctx, cx, cy + 4, 0);
    leafPair(ctx, LEAF_GREEN2, LEAF_DARK, 0);
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
  function summerToAutumn7(ctx, p) {
    const q = Math.max(0, Math.min(1, p));
    groundShadow3(ctx, 12, 0.21);
    soilClump(ctx, 12);
    const cx = 0;
    const cy = -2 + q * 2;
    stem(ctx, cx, cy + 4, 0);
    const lf = q < 0.5 ? LEAF_GREEN2 : LEAF_YELLOW;
    const le = q < 0.5 ? LEAF_DARK : "#6b5210";
    leafPair(ctx, lf, le, 0);
    const faded = q;
    const droop = q * 0.28;
    const pod = Math.max(0, (q - 0.4) / 0.6);
    const open = 1 - q * 0.14;
    bloomFace(ctx, cx, cy, open, droop, 0, faded > 0 ? Math.max(0.02, faded) : 0, pod);
  }
  function autumnToWinter7(ctx, p) {
    const q = Math.max(0, Math.min(1, p));
    groundShadow3(ctx, q < 0.5 ? 12 : 13, 0.2);
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
  var VARIANTS10 = {
    Spring: { draw: drawPansySpring, anim: animPansySpring },
    Summer: { draw: drawPansySummer, anim: animPansySummer },
    Autumn: { draw: drawPansyAutumn, anim: animPansyAutumn },
    Winter: { draw: drawPansyWinter, anim: animPansyWinter }
  };
  var TRANSITIONS10 = {
    0: springToSummer7,
    1: summerToAutumn7,
    2: autumnToWinter7
  };

  // src/textures/seasonal/flower/heather.ts
  var SP8 = {
    Spring: {
      bell: [150, 196, 96],
      // green buds blushing
      bellHi: [206, 232, 150],
      foliage: [108, 176, 72],
      foliageDark: [52, 102, 38],
      stem: [120, 110, 70],
      pad: [126, 206, 96],
      padDark: [70, 142, 60],
      soil: [96, 66, 36],
      outline: [40, 54, 28],
      light: [220, 238, 255],
      // cool-bright
      lightAmt: 0.16,
      shadowAmt: 0.2,
      bloomAmount: 0.18,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0.5,
      fallenLeafAmt: 0
    },
    Summer: {
      bell: [176, 58, 156],
      // vivid violet-magenta
      bellHi: [232, 142, 214],
      foliage: [70, 138, 50],
      foliageDark: [34, 78, 28],
      stem: [108, 92, 56],
      pad: [78, 168, 70],
      // saturated mid-green
      padDark: [44, 112, 46],
      soil: [88, 58, 30],
      outline: [38, 48, 26],
      light: [255, 246, 214],
      // warm
      lightAmt: 0.14,
      shadowAmt: 0.34,
      bloomAmount: 1,
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0
    },
    Autumn: {
      bell: [168, 92, 52],
      // rusty brown, papery
      bellHi: [206, 142, 92],
      foliage: [120, 124, 58],
      // olive
      foliageDark: [70, 70, 34],
      stem: [98, 78, 48],
      pad: [140, 150, 84],
      // olive-tan
      padDark: [96, 102, 54],
      soil: [92, 60, 30],
      outline: [48, 40, 24],
      light: [255, 224, 168],
      // low amber
      lightAmt: 0.2,
      shadowAmt: 0.26,
      bloomAmount: 0.82,
      // open but faded
      frostAmt: 0,
      snowCapAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0.7
    },
    Winter: {
      bell: [150, 118, 120],
      // dried, dusty mauve-grey
      bellHi: [214, 200, 206],
      foliage: [96, 116, 96],
      // greyed sage
      foliageDark: [56, 72, 62],
      stem: [104, 96, 84],
      pad: [206, 220, 234],
      // snow-blued grass
      padDark: [150, 170, 192],
      soil: [110, 104, 96],
      outline: [70, 78, 88],
      light: [206, 224, 248],
      // cool blue-grey
      lightAmt: 0.22,
      shadowAmt: 0.16,
      bloomAmount: 0.5,
      frostAmt: 0.85,
      snowCapAmt: 0.7,
      padSnowAmt: 0.85,
      blossomAmt: 0,
      fallenLeafAmt: 0
    }
  };
  var clamp019 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
  var smoother8 = (x) => x * x * x * (x * (6 * x - 15) + 10);
  function rgb8(c, a = 1) {
    const r = Math.round(clamp019(c[0] / 255) * 255);
    const g = Math.round(clamp019(c[1] / 255) * 255);
    const b = Math.round(clamp019(c[2] / 255) * 255);
    return `rgba(${r},${g},${b},${a})`;
  }
  function mixRGB(a, b, k) {
    const t = clamp019(k);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function lerp10(a, b, k) {
    return a + (b - a) * clamp019(k);
  }
  function lerpP8(a, b, k) {
    return {
      bell: mixRGB(a.bell, b.bell, k),
      bellHi: mixRGB(a.bellHi, b.bellHi, k),
      foliage: mixRGB(a.foliage, b.foliage, k),
      foliageDark: mixRGB(a.foliageDark, b.foliageDark, k),
      stem: mixRGB(a.stem, b.stem, k),
      pad: mixRGB(a.pad, b.pad, k),
      padDark: mixRGB(a.padDark, b.padDark, k),
      soil: mixRGB(a.soil, b.soil, k),
      outline: mixRGB(a.outline, b.outline, k),
      light: mixRGB(a.light, b.light, k),
      lightAmt: lerp10(a.lightAmt, b.lightAmt, k),
      shadowAmt: lerp10(a.shadowAmt, b.shadowAmt, k),
      bloomAmount: lerp10(a.bloomAmount, b.bloomAmount, k),
      frostAmt: lerp10(a.frostAmt, b.frostAmt, k),
      snowCapAmt: lerp10(a.snowCapAmt, b.snowCapAmt, k),
      padSnowAmt: lerp10(a.padSnowAmt, b.padSnowAmt, k),
      blossomAmt: lerp10(a.blossomAmt, b.blossomAmt, k),
      fallenLeafAmt: lerp10(a.fallenLeafAmt, b.fallenLeafAmt, k)
    };
  }
  var STEM_BASE = [0, 17];
  var STEM_TOP = [-1, -18];
  var STEM_CTRL = [3, -2];
  function stemPointAt(u) {
    const inv = 1 - u;
    const x = inv * inv * STEM_BASE[0] + 2 * inv * u * STEM_CTRL[0] + u * u * STEM_TOP[0];
    const y = inv * inv * STEM_BASE[1] + 2 * inv * u * STEM_CTRL[1] + u * u * STEM_TOP[1];
    return [x, y];
  }
  function buildBells() {
    const list = [];
    for (let i = 0; i < 11; i++) {
      const u = 0.28 + i / 10 * 0.72;
      const [px, py] = stemPointAt(u);
      const side = i % 2 === 0 ? -1 : 1;
      const s = 0.7 + 0.35 * u;
      list.push({ x: px + side * (1.6 + 1.4 * (1 - u)), y: py, side, s });
    }
    for (let i = 0; i < 5; i++) {
      const u = 0.1 + i / 4 * 0.62;
      list.push({ x: -6.5 - u * 5.5, y: 6 - u * 16, side: -1, s: 0.66 + 0.2 * u });
    }
    for (let i = 0; i < 5; i++) {
      const u = 0.1 + i / 4 * 0.62;
      list.push({ x: 6.5 + u * 4.8, y: 8 - u * 15, side: 1, s: 0.66 + 0.2 * u });
    }
    return list;
  }
  var BELLS = buildBells();
  var LEAVES = (() => {
    const arr = [];
    for (let i = 0; i < 9; i++) {
      const u = 0.16 + i / 8 * 0.8;
      const [px, py] = stemPointAt(u);
      const side = i % 2 === 0 ? 1 : -1;
      arr.push([px, py, side]);
    }
    return arr;
  })();
  function paint8(ctx, p, bob) {
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.fillStyle = `rgba(0,0,0,${0.18 + p.shadowAmt * 0.28})`;
      ctx.beginPath();
      ctx.ellipse(3, 21.5, 15, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      drawPad2(ctx, p);
      drawSprig(ctx, p, bob);
      drawPadDressing2(ctx, p);
      if (p.lightAmt > 1e-3) {
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        const lg = ctx.createRadialGradient(-10, -10, 2, 0, 0, 40);
        lg.addColorStop(0, rgb8(p.light, p.lightAmt));
        lg.addColorStop(1, rgb8(p.light, 0));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } catch {
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  function drawPad2(ctx, p) {
    const cy = 19;
    ctx.fillStyle = rgb8(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, cy + 1.6, 18, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb8(p.pad);
    ctx.beginPath();
    ctx.ellipse(0, cy, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb8(p.outline, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = rgb8(p.padDark);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * (0.08 + i / 12 * 0.84);
      const ex = Math.cos(a) * -18;
      const ey = cy + Math.sin(a) * 4.6;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + (i % 2 ? 1.2 : -1.2), ey - 2.4 - i % 3);
      ctx.stroke();
    }
    ctx.strokeStyle = rgb8(mixRGB(p.pad, [255, 255, 255], 0.35), 0.7);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(-2, cy - 0.6, 13, 3, 0, Math.PI * 1.05, Math.PI * 1.9);
    ctx.stroke();
  }
  function drawSprig(ctx, p, bob) {
    ctx.save();
    ctx.translate(0, bob);
    const drawStemPath = () => {
      ctx.beginPath();
      ctx.moveTo(STEM_BASE[0], STEM_BASE[1]);
      ctx.quadraticCurveTo(STEM_CTRL[0], STEM_CTRL[1], STEM_TOP[0], STEM_TOP[1]);
      ctx.moveTo(0, 9);
      ctx.quadraticCurveTo(-6, 4, -12, -9);
      ctx.moveTo(1, 11);
      ctx.quadraticCurveTo(7, 6, 11, -7);
    };
    ctx.strokeStyle = rgb8(p.outline);
    ctx.lineWidth = 3.2;
    drawStemPath();
    ctx.stroke();
    ctx.strokeStyle = rgb8(p.stem);
    ctx.lineWidth = 1.7;
    drawStemPath();
    ctx.stroke();
    LEAVES.forEach(([lx, ly, side]) => {
      const tx = lx + side * 4.4;
      const ty = ly - 2.6;
      ctx.strokeStyle = rgb8(p.foliageDark);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.strokeStyle = rgb8(p.foliage);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    });
    const open = clamp019(p.bloomAmount);
    BELLS.forEach((b) => {
      const w = (1.5 + open * 1) * b.s;
      const h = (2.4 + open * 0.6) * b.s;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.side * 0.5 * (0.6 + open * 0.4));
      ctx.fillStyle = rgb8(p.bell);
      ctx.strokeStyle = rgb8(p.outline, 0.8);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-w, -h * 0.3);
      ctx.quadraticCurveTo(-w * 1.05, -h, 0, -h);
      ctx.quadraticCurveTo(w * 1.05, -h, w, -h * 0.3);
      ctx.quadraticCurveTo(w * 0.7, h * 0.9, 0, h);
      ctx.quadraticCurveTo(-w * 0.7, h * 0.9, -w, -h * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (open > 0.5) {
        ctx.fillStyle = rgb8(mixRGB(p.bell, p.outline, 0.45));
        ctx.beginPath();
        ctx.ellipse(0, h * 0.55, w * 0.5, h * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgb8(p.bellHi, 0.85);
      ctx.beginPath();
      ctx.ellipse(-w * 0.35, -h * 0.45, w * 0.32, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    if (p.frostAmt > 1e-3) {
      ctx.fillStyle = `rgba(232,242,255,${0.55 * p.frostAmt})`;
      BELLS.forEach((b, i) => {
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.arc(b.x - 0.6, b.y - 0.8, 0.9 * b.s, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      if (p.snowCapAmt > 1e-3) {
        ctx.fillStyle = `rgba(248,252,255,${0.85 * p.snowCapAmt})`;
        const caps = [
          [STEM_TOP[0], STEM_TOP[1] + 1, 2.6],
          [-11, -8, 2],
          [10, -6, 2]
        ];
        caps.forEach(([cx, cyy, r]) => {
          ctx.beginPath();
          ctx.ellipse(cx, cyy, r, r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
    ctx.restore();
  }
  function drawPadDressing2(ctx, p) {
    const cy = 19;
    if (p.blossomAmt > 1e-3) {
      const spots = [
        [-12, 18.5],
        [11, 19.5],
        [6, 21],
        [-7, 21]
      ];
      spots.forEach(([sx, sy], i) => {
        if (i / spots.length < p.blossomAmt + 0.05) {
          ctx.fillStyle = `rgba(248,210,232,${0.9 * clamp019(p.blossomAmt * 1.6)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,238,120,${0.9 * clamp019(p.blossomAmt * 1.6)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    if (p.fallenLeafAmt > 1e-3) {
      const leaves = [
        [-11, 20, -0.5, [184, 108, 44]],
        [10, 20.5, 0.7, [156, 76, 36]],
        [2, 22, 0.2, [196, 140, 56]]
      ];
      leaves.forEach(([lx, ly, rot, col], i) => {
        if (i / leaves.length < p.fallenLeafAmt + 0.05) {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(rot);
          ctx.fillStyle = rgb8(col, clamp019(p.fallenLeafAmt * 1.4));
          ctx.strokeStyle = rgb8(p.outline, 0.5 * clamp019(p.fallenLeafAmt * 1.4));
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.ellipse(0, 0, 2.8, 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      });
    }
    if (p.padSnowAmt > 1e-3) {
      ctx.save();
      ctx.globalAlpha = clamp019(p.padSnowAmt);
      const sg = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
      sg.addColorStop(0, "rgba(250,253,255,1)");
      sg.addColorStop(1, "rgba(214,228,244,1)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(-1, cy - 0.8, 16.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      const sparks = [
        [-9, 18],
        [5, 19.5],
        [12, 18.5],
        [-2, 20.5]
      ];
      sparks.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }
  function bobAt8(t, amp = 0.8, w = 1.4) {
    return amp * (1 - Math.cos(w * t)) * 0.5;
  }
  function makeDraw3(season) {
    return (ctx) => paint8(ctx, SP8[season], 0);
  }
  function makeAnim2(season) {
    return (ctx, t) => {
      const bob = bobAt8(t);
      const sway = Math.sin(t * 1.1) * 0.6 * (1 - Math.cos(t * 1.1)) * 0.5;
      ctx.save();
      try {
        ctx.translate(sway, 0);
        paint8(ctx, SP8[season], bob);
        ctx.translate(0, bob);
        if (season === "Summer") {
          const k = t * 0.4 % 1;
          const gy = -14 + k * 26;
          ctx.fillStyle = `rgba(255,228,255,${0.18 + 0.12 * Math.sin(t * 3)})`;
          ctx.beginPath();
          ctx.ellipse(2, gy, 5, 2.4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (season === "Autumn") {
          const k = t / 3.4 % 1;
          const fx = 13 + Math.sin(k * 6.28) * 2;
          const fy = -6 + k * 18;
          ctx.save();
          ctx.globalAlpha = 0.9 * (1 - k);
          ctx.fillStyle = rgb8(SP8.Autumn.bell);
          ctx.beginPath();
          ctx.ellipse(fx, fy, 1.3, 1.9, k * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (season === "Winter") {
          const span = 30;
          const flakes = [
            [-7, 0],
            [8, 0.55]
          ];
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          flakes.forEach(([fx, ph]) => {
            const prog = ((t / 3.2 + ph) % 1 + 1) % 1;
            const y = -20 + prog * span;
            const x = fx + Math.sin(prog * 6.28 + ph * 6) * 3;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.fillStyle = `rgba(210,228,255,${0.1 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.8))})`;
          ctx.beginPath();
          ctx.ellipse(-2, 0, 10, 16, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const glint = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
          ctx.fillStyle = `rgba(255,255,255,${glint})`;
          ctx.beginPath();
          ctx.arc(-3, 6, 1 + glint, 0, Math.PI * 2);
          ctx.fill();
        }
      } catch {
      } finally {
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    };
  }
  function makeTransition5(from, to) {
    return (ctx, pp) => {
      const k = smoother8(clamp019(pp));
      paint8(ctx, lerpP8(SP8[from], SP8[to], k), 0);
    };
  }
  var VARIANTS11 = {
    Spring: { draw: makeDraw3("Spring"), anim: makeAnim2("Spring") },
    Summer: { draw: makeDraw3("Summer"), anim: makeAnim2("Summer") },
    Autumn: { draw: makeDraw3("Autumn"), anim: makeAnim2("Autumn") },
    Winter: { draw: makeDraw3("Winter"), anim: makeAnim2("Winter") }
  };
  var TRANSITIONS11 = {
    0: makeTransition5("Spring", "Summer"),
    1: makeTransition5("Summer", "Autumn"),
    2: makeTransition5("Autumn", "Winter")
  };

  // src/textures/seasonal/flower/waterLily.ts
  function clamp0110(x) {
    if (!Number.isFinite(x)) return 0;
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function lerp11(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpRGB6(a, b, t) {
    return [lerp11(a[0], b[0], t), lerp11(a[1], b[1], t), lerp11(a[2], b[2], t)];
  }
  function rgb9(c, alpha = 1) {
    const r = Math.round(clamp0110(c[0] / 255) * 255);
    const g = Math.round(clamp0110(c[1] / 255) * 255);
    const b = Math.round(clamp0110(c[2] / 255) * 255);
    return `rgba(${r},${g},${b},${clamp0110(alpha)})`;
  }
  var smoother9 = (x) => x * x * x * (x * (6 * x - 15) + 10);
  function bobAt9(t, amp = 0.9, w = 1.5) {
    return amp * (1 - Math.cos(w * t)) * 0.5;
  }
  var SP9 = {
    // Spring — cool-bright; fresh blue water, new small pad, closed pink bud.
    Spring: {
      petal: [236, 168, 196],
      petalTip: [214, 110, 150],
      center: [232, 214, 120],
      pad: [108, 178, 86],
      padDark: [58, 114, 56],
      water: [122, 186, 224],
      waterDeep: [74, 134, 186],
      outline: [40, 58, 70],
      bloomOpen: 0.18,
      iceAmt: 0,
      frostAmt: 0,
      padSnowAmt: 0,
      padYellow: 0,
      gloss: 0.55,
      dressLeaf: 0,
      dressBlossom: 0.7
    },
    // Summer — peak; bright saturated blue, glossy green pad, open lotus.
    Summer: {
      petal: [250, 222, 232],
      petalTip: [240, 138, 178],
      center: [248, 212, 78],
      pad: [86, 172, 62],
      padDark: [44, 104, 44],
      water: [86, 174, 230],
      waterDeep: [44, 124, 196],
      outline: [34, 56, 64],
      bloomOpen: 0.95,
      iceAmt: 0,
      frostAmt: 0,
      padSnowAmt: 0,
      padYellow: 0,
      gloss: 0.9,
      dressLeaf: 0,
      dressBlossom: 0
    },
    // Autumn — low amber light; duller olive water, pad yellowing, bloom closing.
    Autumn: {
      petal: [224, 158, 172],
      petalTip: [196, 96, 110],
      center: [210, 162, 70],
      pad: [134, 156, 64],
      padDark: [92, 100, 44],
      water: [120, 150, 150],
      waterDeep: [78, 110, 116],
      outline: [48, 50, 46],
      bloomOpen: 0.34,
      iceAmt: 0,
      frostAmt: 0,
      padSnowAmt: 0,
      padYellow: 0.85,
      gloss: 0.4,
      dressLeaf: 0.85,
      dressBlossom: 0
    },
    // Winter — cool blue-grey; water frozen to pale ice, pad & bloom frosted.
    Winter: {
      petal: [222, 224, 234],
      petalTip: [196, 178, 200],
      center: [214, 210, 196],
      pad: [148, 176, 168],
      padDark: [96, 128, 130],
      water: [206, 224, 236],
      waterDeep: [168, 196, 216],
      outline: [70, 88, 104],
      bloomOpen: 0.3,
      iceAmt: 0.92,
      frostAmt: 0.85,
      padSnowAmt: 0.7,
      padYellow: 0,
      gloss: 0.5,
      dressLeaf: 0,
      dressBlossom: 0
    }
  };
  function lerpP9(a, b, t) {
    const s = clamp0110(t);
    return {
      petal: lerpRGB6(a.petal, b.petal, s),
      petalTip: lerpRGB6(a.petalTip, b.petalTip, s),
      center: lerpRGB6(a.center, b.center, s),
      pad: lerpRGB6(a.pad, b.pad, s),
      padDark: lerpRGB6(a.padDark, b.padDark, s),
      water: lerpRGB6(a.water, b.water, s),
      waterDeep: lerpRGB6(a.waterDeep, b.waterDeep, s),
      outline: lerpRGB6(a.outline, b.outline, s),
      bloomOpen: lerp11(a.bloomOpen, b.bloomOpen, s),
      iceAmt: lerp11(a.iceAmt, b.iceAmt, s),
      frostAmt: lerp11(a.frostAmt, b.frostAmt, s),
      padSnowAmt: lerp11(a.padSnowAmt, b.padSnowAmt, s),
      padYellow: lerp11(a.padYellow, b.padYellow, s),
      gloss: lerp11(a.gloss, b.gloss, s),
      dressLeaf: lerp11(a.dressLeaf, b.dressLeaf, s),
      dressBlossom: lerp11(a.dressBlossom, b.dressBlossom, s)
    };
  }
  var NO_MICRO = {
    ripple: 0,
    petalGlint: 0,
    iceSheen: 0,
    flakeY: -1,
    flakeX: 0,
    leafDrift: 0,
    dewPulse: 0
  };
  function paint9(ctx, raw, bob, micro = NO_MICRO) {
    const p = {
      ...raw,
      bloomOpen: clamp0110(raw.bloomOpen),
      iceAmt: clamp0110(raw.iceAmt),
      frostAmt: clamp0110(raw.frostAmt),
      padSnowAmt: clamp0110(raw.padSnowAmt),
      padYellow: clamp0110(raw.padYellow),
      gloss: clamp0110(raw.gloss),
      dressLeaf: clamp0110(raw.dressLeaf),
      dressBlossom: clamp0110(raw.dressBlossom)
    };
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.fillStyle = rgb9([0, 0, 0], 0.2);
      ctx.beginPath();
      ctx.ellipse(2.5, 22.5, 16, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      const poolCx = 0;
      const poolCy = 19;
      const poolRx = 18;
      const poolRy = 5.6;
      ctx.fillStyle = rgb9(p.outline, 0.55);
      ctx.beginPath();
      ctx.ellipse(poolCx, poolCy + 0.6, poolRx + 1.1, poolRy + 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      const wg = ctx.createLinearGradient(0, poolCy - poolRy, 0, poolCy + poolRy);
      wg.addColorStop(0, rgb9(p.water));
      wg.addColorStop(1, rgb9(p.waterDeep));
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(poolCx, poolCy, poolRx, poolRy, 0, 0, Math.PI * 2);
      ctx.fill();
      if (micro.ripple > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(poolCx, poolCy, poolRx, poolRy, 0, 0, Math.PI * 2);
        ctx.clip();
        const a = 0.16 * micro.ripple;
        ctx.strokeStyle = rgb9([255, 255, 255], a);
        ctx.lineWidth = 0.9;
        for (let i = 0; i < 3; i++) {
          const ry = 1.4 + i * 1.6 + micro.ripple * 0.8;
          ctx.beginPath();
          ctx.ellipse(-5 + i * 4, poolCy - 1 + i * 1.2, 7 - i, ry * 0.5, 0, 0, Math.PI);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (p.iceAmt > 0.02) {
        const ig = ctx.createLinearGradient(0, poolCy - poolRy, 0, poolCy + poolRy);
        ig.addColorStop(0, rgb9([238, 248, 255], 0.9 * p.iceAmt));
        ig.addColorStop(1, rgb9([196, 220, 236], 0.85 * p.iceAmt));
        ctx.fillStyle = ig;
        ctx.beginPath();
        ctx.ellipse(poolCx, poolCy, poolRx, poolRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgb9([150, 184, 208], 0.5 * p.iceAmt);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-12, poolCy + 1);
        ctx.lineTo(-3, poolCy - 1.5);
        ctx.lineTo(6, poolCy + 1.6);
        ctx.lineTo(14, poolCy - 0.8);
        ctx.stroke();
        const sheen2 = 0.18 + micro.iceSheen * 0.28;
        ctx.fillStyle = rgb9([255, 255, 255], sheen2 * p.iceAmt);
        ctx.beginPath();
        ctx.ellipse(-4, poolCy - 1.6, 11, 1.8, -0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb9([255, 255, 255], 0.8 * p.frostAmt);
        const sparkles = [
          [-13, 20],
          [-6, 17.5],
          [3, 21],
          [11, 18.5],
          [15, 20.5],
          [-1, 18]
        ];
        for (const [sx, sy] of sparkles) {
          ctx.beginPath();
          ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = rgb9([255, 255, 255], 0.16 + 0.22 * p.gloss);
        ctx.beginPath();
        ctx.ellipse(-5, poolCy - 2, 9, 1.5, -0.06, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.dressLeaf > 0.02) {
        ctx.save();
        ctx.globalAlpha = p.dressLeaf;
        const lx = 11 + micro.leafDrift;
        const ly = 21;
        ctx.translate(lx, ly);
        ctx.rotate(0.5 + micro.leafDrift * 0.03);
        ctx.fillStyle = rgb9([186, 116, 48]);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.6, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgb9([120, 70, 28]);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3.4, 0);
        ctx.lineTo(3.4, 0);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      ctx.translate(0, -bob);
      const padCx = 0;
      const padCy = 16.5;
      const padRx = 14.5;
      const padRy = 6.2;
      const padCol = lerpRGB6(p.pad, [196, 182, 86], p.padYellow * 0.55);
      const padDarkCol = lerpRGB6(p.padDark, [148, 132, 58], p.padYellow * 0.55);
      ctx.fillStyle = rgb9(p.outline, 0.7);
      ctx.beginPath();
      ctx.ellipse(padCx, padCy + 0.8, padRx + 1, padRy + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb9(padDarkCol);
      ctx.beginPath();
      ctx.ellipse(padCx, padCy, padRx, padRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb9(padCol);
      ctx.beginPath();
      ctx.ellipse(padCx - 0.6, padCy - 0.9, padRx - 1.2, padRy - 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      if (p.padYellow > 0.04) {
        ctx.strokeStyle = rgb9([206, 184, 78], 0.6 * p.padYellow);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(padCx, padCy, padRx - 1.4, padRy - 1.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = rgb9(p.waterDeep);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(padCx + 1, padCy);
      ctx.lineTo(padCx + padRx - 1, padCy + 1.4);
      ctx.lineTo(padCx + padRx - 4, padCy + 3.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = rgb9(padDarkCol, 0.7);
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 7; i++) {
        const ang = i / 7 * Math.PI * 2 + 0.25;
        if (ang > 0 && ang < 0.5) continue;
        ctx.beginPath();
        ctx.moveTo(padCx, padCy - 0.6);
        ctx.lineTo(
          padCx + Math.cos(ang) * (padRx - 2.5),
          padCy - 0.6 + Math.sin(ang) * (padRy - 1.8)
        );
        ctx.stroke();
      }
      ctx.fillStyle = rgb9([255, 255, 255], 0.12 + 0.18 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(padCx - 4, padCy - 2.4, 5, 1.8, -0.2, 0, Math.PI * 2);
      ctx.fill();
      if (p.padSnowAmt > 0.03) {
        ctx.fillStyle = rgb9([244, 250, 255], 0.85 * p.padSnowAmt);
        ctx.beginPath();
        ctx.ellipse(padCx - 1, padCy - 1.6, padRx - 3.5, padRy - 3, -0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.dressBlossom > 0.04) {
        ctx.save();
        ctx.globalAlpha = p.dressBlossom;
        ctx.fillStyle = rgb9([244, 196, 214]);
        ctx.translate(padCx + 8.5, padCy + 0.5);
        for (let i = 0; i < 5; i++) {
          ctx.save();
          ctx.rotate(i / 5 * Math.PI * 2);
          ctx.beginPath();
          ctx.ellipse(0, -1.6, 0.9, 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = rgb9([244, 220, 120]);
        ctx.beginPath();
        ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      const open = p.bloomOpen;
      const bloomCx = 0;
      const bloomCy = 6.5 - open * 4.5;
      const petalCol = p.petal;
      const tipCol = p.petalTip;
      const outlineCol = p.outline;
      const drawPetal = (angle, spread, length, width, fill, tip) => {
        ctx.save();
        ctx.translate(bloomCx, bloomCy);
        ctx.rotate(angle);
        ctx.fillStyle = rgb9(outlineCol, 0.85);
        ctx.beginPath();
        ctx.moveTo(0, spread + 0.6);
        ctx.quadraticCurveTo(-width - 0.6, -length * 0.55, 0, -length - 0.6);
        ctx.quadraticCurveTo(width + 0.6, -length * 0.55, 0, spread + 0.6);
        ctx.fill();
        const pg = ctx.createLinearGradient(0, spread, 0, -length);
        pg.addColorStop(0, rgb9(fill));
        pg.addColorStop(1, rgb9(tip));
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(0, spread);
        ctx.quadraticCurveTo(-width, -length * 0.55, 0, -length);
        ctx.quadraticCurveTo(width, -length * 0.55, 0, spread);
        ctx.fill();
        ctx.restore();
      };
      const backCount = 6;
      for (let i = 0; i < backCount; i++) {
        const base = (i - (backCount - 1) / 2) * 0.42;
        const angle = base * (0.35 + open * 1.05);
        const length = lerp11(8.5, 12.5, open);
        const width = lerp11(2.4, 4.2, open);
        drawPetal(angle, 2.2, length, width, petalCol, tipCol);
      }
      const frontCount = 5;
      const frontFill = lerpRGB6(petalCol, [255, 255, 255], 0.18);
      for (let i = 0; i < frontCount; i++) {
        const base = (i - (frontCount - 1) / 2) * 0.4;
        const angle = base * (0.28 + open * 0.7);
        const length = lerp11(7.5, 10, open);
        const width = lerp11(2, 3.2, open);
        drawPetal(angle, 1.4, length, width, frontFill, tipCol);
      }
      if (open > 0.12) {
        const ca = clamp0110((open - 0.12) / 0.88);
        ctx.fillStyle = rgb9(outlineCol, 0.8 * ca);
        ctx.beginPath();
        ctx.ellipse(bloomCx, bloomCy - 1.4, 3.2, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb9(p.center, ca);
        ctx.beginPath();
        ctx.ellipse(bloomCx, bloomCy - 1.7, 2.6, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb9(lerpRGB6(p.center, [120, 80, 20], 0.4), ca);
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(bloomCx + Math.cos(a) * 1.8, bloomCy - 1.7 + Math.sin(a) * 1.2, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = rgb9(outlineCol, 0.8);
        ctx.beginPath();
        ctx.moveTo(bloomCx, bloomCy + 2.4);
        ctx.quadraticCurveTo(bloomCx - 3.6, bloomCy - 3, bloomCx, bloomCy - 9.5);
        ctx.quadraticCurveTo(bloomCx + 3.6, bloomCy - 3, bloomCx, bloomCy + 2.4);
        ctx.fill();
        const bg = ctx.createLinearGradient(0, bloomCy + 2, 0, bloomCy - 9);
        bg.addColorStop(0, rgb9(petalCol));
        bg.addColorStop(1, rgb9(tipCol));
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(bloomCx, bloomCy + 1.8);
        ctx.quadraticCurveTo(bloomCx - 2.8, bloomCy - 2.8, bloomCx, bloomCy - 8.6);
        ctx.quadraticCurveTo(bloomCx + 2.8, bloomCy - 2.8, bloomCx, bloomCy + 1.8);
        ctx.fill();
      }
      if (p.frostAmt > 0.04) {
        ctx.fillStyle = rgb9([236, 246, 255], 0.3 * p.frostAmt);
        ctx.beginPath();
        ctx.ellipse(bloomCx, bloomCy - 1, 7.5, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb9([255, 255, 255], 0.85 * p.frostAmt);
        const fs = [[-3, bloomCy - 4], [2.5, bloomCy - 6], [0, bloomCy + 1]];
        for (const [fx, fy] of fs) {
          ctx.beginPath();
          ctx.arc(fx, fy, 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (micro.petalGlint > 0) {
        ctx.fillStyle = rgb9([255, 255, 255], 0.45 * micro.petalGlint);
        ctx.beginPath();
        ctx.ellipse(bloomCx - 2.2, bloomCy - 3.5, 1.4, 2.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (micro.dewPulse > 0) {
        ctx.fillStyle = rgb9([255, 255, 255], 0.5 * micro.dewPulse);
        ctx.beginPath();
        ctx.arc(bloomCx + 2, bloomCy + 1, 1 + 0.4 * micro.dewPulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    } catch {
      try {
        ctx.restore();
      } catch {
      }
    }
    ctx.globalAlpha = 1;
  }
  function makeDraw4(season) {
    return (ctx) => paint9(ctx, SP9[season], 0);
  }
  function animSpring2(ctx, t) {
    const bob = bobAt9(t, 0.7, 1.4);
    const micro = {
      ...NO_MICRO,
      ripple: 0.5 + 0.5 * Math.sin(t * 1.8),
      dewPulse: 0.5 + 0.5 * Math.sin(t * 2.2)
    };
    paint9(ctx, SP9.Spring, bob, micro);
  }
  function animSummer2(ctx, t) {
    const bob = bobAt9(t, 0.9, 1.5);
    const micro = {
      ...NO_MICRO,
      ripple: 0.5 + 0.5 * Math.sin(t * 2),
      petalGlint: 0.5 + 0.5 * Math.sin(t * 1.6)
    };
    paint9(ctx, SP9.Summer, bob, micro);
  }
  function animAutumn2(ctx, t) {
    const bob = bobAt9(t, 0.6, 1.1);
    const micro = {
      ...NO_MICRO,
      ripple: 0.4 + 0.4 * Math.sin(t * 1.4),
      leafDrift: Math.sin(t * 0.9) * 4
    };
    paint9(ctx, SP9.Autumn, bob, micro);
  }
  function animWinter2(ctx, t) {
    const bob = bobAt9(t, 0.5, 1);
    const prog = t / 3.4 % 1;
    const micro = {
      ...NO_MICRO,
      iceSheen: 0.5 + 0.5 * Math.sin(t * 0.9),
      flakeY: prog,
      flakeX: Math.sin(prog * Math.PI * 2) * 5
    };
    paint9(ctx, SP9.Winter, bob, micro);
    if (micro.flakeY >= 0) {
      const fy = -20 + prog * 40;
      const fx = micro.flakeX;
      ctx.save();
      ctx.globalAlpha = 0.9 * (1 - Math.abs(prog - 0.5) * 0.4);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(fx, fy, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  function makeTransition6(fromIdx) {
    const from = SEASON_NAMES[fromIdx];
    const to = SEASON_NAMES[fromIdx + 1];
    return (ctx, pp) => {
      paint9(ctx, lerpP9(SP9[from], SP9[to], smoother9(clamp0110(pp))), 0);
    };
  }
  var springToSummer8 = makeTransition6(0);
  var summerToAutumn8 = makeTransition6(1);
  var autumnToWinter8 = makeTransition6(2);
  var VARIANTS12 = {
    Spring: { draw: makeDraw4("Spring"), anim: animSpring2 },
    Summer: { draw: makeDraw4("Summer"), anim: animSummer2 },
    Autumn: { draw: makeDraw4("Autumn"), anim: animAutumn2 },
    Winter: { draw: makeDraw4("Winter"), anim: animWinter2 }
  };
  var TRANSITIONS12 = {
    0: springToSummer8,
    1: summerToAutumn8,
    2: autumnToWinter8
  };

  // src/textures/seasonal/herd/sheep.ts
  function clamp0111(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function lerp12(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpRGB7(a, b, t) {
    return [lerp12(a[0], b[0], t), lerp12(a[1], b[1], t), lerp12(a[2], b[2], t)];
  }
  function rgb10(c, a = 1) {
    const r = Math.round(clamp0111(c[0] / 255) * 255);
    const g = Math.round(clamp0111(c[1] / 255) * 255);
    const b = Math.round(clamp0111(c[2] / 255) * 255);
    return `rgba(${r},${g},${b},${clamp0111(a)})`;
  }
  function smoother10(x) {
    return x * x * x * (x * (6 * x - 15) + 10);
  }
  function bobAt10(t, amp = 1.1, w = 1.5) {
    return amp * (1 - Math.cos(w * t)) * 0.5;
  }
  var SP10 = {
    Spring: {
      fleeceLight: [248, 250, 248],
      fleeceShadow: [206, 212, 214],
      faceDark: [58, 52, 56],
      padGrass: [126, 198, 86],
      // bright lime dewy grass
      soil: [86, 132, 54],
      outline: [60, 54, 50],
      lightWash: [212, 238, 255],
      // cool-bright
      lightWashAmt: 0.16,
      fleeceVolume: 0.18,
      // recently-shorn: slimmer
      frostAmt: 0,
      backSnowAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0.6,
      fallenLeafAmt: 0,
      breathFogAmt: 0
    },
    Summer: {
      fleeceLight: [250, 250, 246],
      fleeceShadow: [200, 200, 196],
      faceDark: [54, 48, 50],
      padGrass: [86, 168, 64],
      // saturated mid-green
      soil: [58, 110, 40],
      outline: [54, 48, 44],
      lightWash: [255, 244, 206],
      // warm
      lightWashAmt: 0.14,
      fleeceVolume: 0.5,
      // full normal fleece
      frostAmt: 0,
      backSnowAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      breathFogAmt: 0
    },
    Autumn: {
      fleeceLight: [244, 240, 230],
      fleeceShadow: [198, 190, 178],
      faceDark: [56, 46, 44],
      padGrass: [156, 142, 78],
      // olive-tan
      soil: [104, 84, 44],
      outline: [58, 46, 38],
      lightWash: [255, 206, 138],
      // low amber
      lightWashAmt: 0.2,
      fleeceVolume: 0.72,
      // fuller, thicker
      frostAmt: 0,
      backSnowAmt: 0,
      padSnowAmt: 0,
      blossomAmt: 0,
      fallenLeafAmt: 0.7,
      breathFogAmt: 0
    },
    Winter: {
      fleeceLight: [252, 253, 255],
      fleeceShadow: [206, 216, 228],
      faceDark: [60, 56, 64],
      padGrass: [222, 232, 244],
      // snow on the pad
      soil: [150, 168, 190],
      outline: [70, 70, 84],
      lightWash: [206, 222, 248],
      // cool blue-grey
      lightWashAmt: 0.24,
      fleeceVolume: 1,
      // extra-thick puffed wool
      frostAmt: 0.7,
      backSnowAmt: 0.7,
      padSnowAmt: 0.85,
      blossomAmt: 0,
      fallenLeafAmt: 0,
      breathFogAmt: 0.7
    }
  };
  function lerpP10(a, b, t) {
    return {
      fleeceLight: lerpRGB7(a.fleeceLight, b.fleeceLight, t),
      fleeceShadow: lerpRGB7(a.fleeceShadow, b.fleeceShadow, t),
      faceDark: lerpRGB7(a.faceDark, b.faceDark, t),
      padGrass: lerpRGB7(a.padGrass, b.padGrass, t),
      soil: lerpRGB7(a.soil, b.soil, t),
      outline: lerpRGB7(a.outline, b.outline, t),
      lightWash: lerpRGB7(a.lightWash, b.lightWash, t),
      lightWashAmt: lerp12(a.lightWashAmt, b.lightWashAmt, t),
      fleeceVolume: lerp12(a.fleeceVolume, b.fleeceVolume, t),
      frostAmt: lerp12(a.frostAmt, b.frostAmt, t),
      backSnowAmt: lerp12(a.backSnowAmt, b.backSnowAmt, t),
      padSnowAmt: lerp12(a.padSnowAmt, b.padSnowAmt, t),
      blossomAmt: lerp12(a.blossomAmt, b.blossomAmt, t),
      fallenLeafAmt: lerp12(a.fallenLeafAmt, b.fallenLeafAmt, t),
      breathFogAmt: lerp12(a.breathFogAmt, b.breathFogAmt, t)
    };
  }
  function clampP3(p) {
    return {
      ...p,
      lightWashAmt: clamp0111(p.lightWashAmt),
      fleeceVolume: clamp0111(p.fleeceVolume),
      frostAmt: clamp0111(p.frostAmt),
      backSnowAmt: clamp0111(p.backSnowAmt),
      padSnowAmt: clamp0111(p.padSnowAmt),
      blossomAmt: clamp0111(p.blossomAmt),
      fallenLeafAmt: clamp0111(p.fallenLeafAmt),
      breathFogAmt: clamp0111(p.breathFogAmt)
    };
  }
  function paintPad2(ctx, p) {
    ctx.fillStyle = rgb10([0, 0, 0], 0.18);
    ctx.beginPath();
    ctx.ellipse(3, 21, 17, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb10(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb10(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb10(p.padGrass);
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    for (let i = -16; i <= 16; i += 4) {
      const h = 1.6 + (i % 8 === 0 ? 1.4 : 0);
      const yEdge = 19 - Math.sqrt(Math.max(0, 1 - (i / 18) ** 2)) * 5;
      ctx.beginPath();
      ctx.moveTo(i, yEdge);
      ctx.lineTo(i + 1, yEdge - h);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.fillStyle = rgb10([255, 255, 255], 0.1);
    ctx.beginPath();
    ctx.ellipse(-5, 17.5, 9, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.padSnowAmt > 1e-3) {
      ctx.fillStyle = rgb10([244, 250, 255], 0.85 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.6, 17, 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb10([255, 255, 255], 0.7 * p.padSnowAmt);
      for (const [sx, sy] of [[-9, 19], [6, 20], [12, 18]]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (p.blossomAmt > 1e-3) {
      for (const [bx, by] of [[-12, 18.5], [9, 20], [0, 21], [14, 19]]) {
        ctx.fillStyle = rgb10([255, 250, 252], 0.9 * p.blossomAmt);
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(bx + Math.cos(a) * 1.1, by + Math.sin(a) * 1.1, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgb10([252, 214, 110], p.blossomAmt);
        ctx.beginPath();
        ctx.arc(bx, by, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (p.fallenLeafAmt > 1e-3) {
      const leaves = [
        [-11, 20, -0.5, [196, 96, 36]],
        [10, 20.5, 0.7, [212, 150, 52]],
        [2, 21, 0.2, [168, 80, 40]]
      ];
      for (const [lx, ly, rot, col] of leaves) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgb10(col, p.fallenLeafAmt);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgb10([110, 60, 26], p.fallenLeafAmt);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-2.4, 0);
        ctx.lineTo(2.4, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  function paintLeg(ctx, p, x, topY, baseY) {
    ctx.strokeStyle = rgb10(p.faceDark);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, baseY);
    ctx.stroke();
    ctx.fillStyle = rgb10([28, 24, 26]);
    ctx.beginPath();
    ctx.ellipse(x, baseY, 1.8, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = "butt";
  }
  function paintFleeceBody(ctx, p, cx, cy, fill, scallop) {
    const vol = 0.85 + p.fleeceVolume * 0.4;
    const rx = 13 * vol;
    const ry = 9.2 * vol;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    const lumps = 11;
    const lumpR = (2.2 + p.fleeceVolume * 1.6) * scallop;
    for (let i = 0; i < lumps; i++) {
      const a = i / lumps * Math.PI * 2 - Math.PI / 2;
      const lx = cx + Math.cos(a) * rx * 0.98;
      const ly = cy + Math.sin(a) * ry * 0.98;
      ctx.beginPath();
      ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function paintSheep(ctx, p, bob) {
    const bx = -1;
    const by = 4 - bob;
    ctx.save();
    ctx.globalAlpha = 0.85;
    paintLeg(ctx, p, bx + 6.5, by + 6, 18.5);
    paintLeg(ctx, p, bx - 7.5, by + 6, 18.8);
    ctx.restore();
    paintLeg(ctx, p, bx + 3.5, by + 6, 19.2);
    paintLeg(ctx, p, bx - 4.5, by + 6, 19.4);
    paintFleeceBody(ctx, p, bx, by, rgb10(p.outline), 1.18);
    paintFleeceBody(ctx, p, bx, by, rgb10(p.fleeceShadow), 1);
    ctx.save();
    ctx.translate(-1.4, -1.6);
    paintFleeceBody(ctx, p, bx, by, rgb10(p.fleeceLight), 0.82);
    ctx.restore();
    if (p.backSnowAmt > 1e-3) {
      ctx.fillStyle = rgb10([248, 252, 255], 0.92 * p.backSnowAmt);
      ctx.beginPath();
      ctx.ellipse(bx - 1, by - 7.6, 9 * (0.9 + p.fleeceVolume * 0.3), 3.4, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb10([255, 255, 255], 0.85 * p.backSnowAmt);
      for (const [dx, dy] of [[-5, -8.4], [1, -9], [5, -8]]) {
        ctx.beginPath();
        ctx.arc(bx + dx, by + dy, 1.6 + p.fleeceVolume * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (p.frostAmt > 1e-3) {
      ctx.fillStyle = rgb10([255, 255, 255], 0.8 * p.frostAmt);
      const pts = [
        [-8, 0],
        [-3, 4],
        [4, -2],
        [8, 2],
        [0, -3],
        [-5, -5],
        [6, 5]
      ];
      for (const [fx, fy] of pts) {
        ctx.beginPath();
        ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const hx = bx - 11;
    const hy = by + 2;
    ctx.fillStyle = rgb10(p.faceDark);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(hx + side * 2.6, hy - 4);
      ctx.rotate(side * 0.9 - 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = rgb10(p.fleeceLight);
    ctx.beginPath();
    ctx.ellipse(hx, hy - 4.4, 3.4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(0.28);
    ctx.fillStyle = rgb10(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.8, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb10(p.faceDark);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.1, 4.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb10([255, 255, 255], 0.12);
    ctx.beginPath();
    ctx.ellipse(-1.4, -1.6, 2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb10([245, 245, 240]);
    for (const ex of [-1.6, 1.6]) {
      ctx.beginPath();
      ctx.arc(ex, -1.2, 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgb10([20, 18, 20]);
    for (const ex of [-1.4, 1.8]) {
      ctx.beginPath();
      ctx.arc(ex, -1, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgb10([18, 16, 18]);
    for (const ex of [-1.1, 1.1]) {
      ctx.beginPath();
      ctx.ellipse(ex, 3.2, 0.5, 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = rgb10(p.fleeceLight);
    ctx.beginPath();
    ctx.arc(bx + 12.5, by - 1, 2.4 + p.fleeceVolume * 0.6, 0, Math.PI * 2);
    ctx.fill();
    if (p.breathFogAmt > 1e-3) {
      ctx.fillStyle = rgb10([235, 244, 255], 0.4 * p.breathFogAmt);
      ctx.beginPath();
      ctx.ellipse(hx - 6, hy + 3.4, 3.2, 2.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function paintLightWash(ctx, p) {
    if (p.lightWashAmt <= 1e-3) return;
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgb10(p.lightWash, p.lightWashAmt);
    ctx.beginPath();
    ctx.ellipse(0, 4, 26, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function paint10(ctx, pIn, bob) {
    const p = clampP3(pIn);
    ctx.save();
    try {
      paintPad2(ctx, p);
      paintSheep(ctx, p, bob);
      paintLightWash(ctx, p);
    } finally {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }
  }
  function draw4(season) {
    return (ctx) => paint10(ctx, SP10[season], 0);
  }
  function anim4(season) {
    return (ctx, t) => {
      const p = clampP3(SP10[season]);
      const bob = bobAt10(t);
      paint10(ctx, SP10[season], bob);
      ctx.save();
      try {
        const bx = -1;
        const by = 4 - bob;
        const hx = bx - 11;
        const hy = by + 2;
        const loop = t % 5 / 5;
        const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6;
        const flick = Math.sin(t * 9) * flickGate;
        ctx.fillStyle = rgb10(p.faceDark);
        ctx.save();
        ctx.translate(hx + 2.6, hy - 4);
        ctx.rotate(0.6 + flick * 0.5);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = rgb10(p.fleeceLight);
        ctx.beginPath();
        ctx.arc(bx + 12.5 + flick * 1.4, by - 1, 2.4 + p.fleeceVolume * 0.6, 0, Math.PI * 2);
        ctx.fill();
        if (season === "Spring") {
          const g = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
          ctx.fillStyle = rgb10([255, 255, 255], g);
          ctx.beginPath();
          ctx.arc(-8, 18.4, 1.1 + g, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(10, 19.6, 0.9 + g * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (season === "Summer") {
          const s = 0.5 + 0.5 * Math.sin(t * 1.1);
          const sx = bx - 9 + s * 18;
          ctx.save();
          ctx.globalCompositeOperation = "soft-light";
          ctx.fillStyle = rgb10([255, 255, 255], 0.35);
          ctx.beginPath();
          ctx.ellipse(sx, by - 2, 3, 6, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (season === "Autumn") {
          const a = Math.sin(t * 1.3) * 0.5;
          const dx = Math.sin(t * 0.7) * 1.2;
          ctx.save();
          ctx.translate(10 + dx, 20.5);
          ctx.rotate(0.7 + a);
          ctx.fillStyle = rgb10([212, 150, 52], p.fallenLeafAmt);
          ctx.beginPath();
          ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
          const reach = 4 + breathe * 3;
          ctx.fillStyle = rgb10([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
          ctx.beginPath();
          ctx.ellipse(hx - reach, hy + 3.4, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.2, 0, Math.PI * 2);
          ctx.fill();
          const prog = (t / 3.4 % 1 + 1) % 1;
          const fy = -20 + prog * 36;
          const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
          ctx.fillStyle = rgb10([255, 255, 255], 0.85);
          ctx.beginPath();
          ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
          ctx.fill();
          const sheen2 = 0.5 + 0.5 * Math.sin(t * 0.8);
          ctx.save();
          ctx.globalCompositeOperation = "soft-light";
          ctx.fillStyle = rgb10([206, 224, 255], 0.12 + sheen2 * 0.14);
          ctx.beginPath();
          ctx.ellipse(bx, by, 13, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } finally {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
      }
    };
  }
  function makeTransition7(fromIdx) {
    const from = SEASON_NAMES[fromIdx];
    const to = SEASON_NAMES[fromIdx + 1];
    return (ctx, pp) => {
      const k = smoother10(clamp0111(pp));
      paint10(ctx, lerpP10(SP10[from], SP10[to], k), 0);
    };
  }
  var springToSummer9 = makeTransition7(0);
  var summerToAutumn9 = makeTransition7(1);
  var autumnToWinter9 = makeTransition7(2);
  var VARIANTS13 = {
    Spring: { draw: draw4("Spring"), anim: anim4("Spring") },
    Summer: { draw: draw4("Summer"), anim: anim4("Summer") },
    Autumn: { draw: draw4("Autumn"), anim: anim4("Autumn") },
    Winter: { draw: draw4("Winter"), anim: anim4("Winter") }
  };
  var TRANSITIONS13 = {
    0: springToSummer9,
    1: summerToAutumn9,
    2: autumnToWinter9
  };

  // ../../../tmp/tiles_entry_all.ts
  window.SEASONAL_DEMO = { tiles: [
    { key: "tile_tree_oak", label: "Oak", family: "tree", V: VARIANTS, T: TRANSITIONS },
    { key: "tile_tree_birch", label: "Birch", family: "tree", V: VARIANTS2, T: TRANSITIONS2 },
    { key: "tile_fruit_apple", label: "Apple", family: "fruit", V: VARIANTS3, T: TRANSITIONS3 },
    { key: "tile_fruit_pear", label: "Pear", family: "fruit", V: VARIANTS4, T: TRANSITIONS4 },
    { key: "tile_fruit_lemon", label: "Lemon", family: "fruit", V: VARIANTS5, T: TRANSITIONS5 },
    { key: "tile_grain_corn", label: "Corn", family: "grain", V: VARIANTS6, T: TRANSITIONS6 },
    { key: "tile_veg_pepper", label: "Pepper", family: "veg", V: VARIANTS7, T: TRANSITIONS7 },
    { key: "tile_veg_mushroom", label: "Mushroom", family: "veg", V: VARIANTS8, T: TRANSITIONS8 },
    { key: "tile_veg_beet", label: "Beet", family: "veg", V: VARIANTS9, T: TRANSITIONS9 },
    { key: "tile_flower_pansy", label: "Pansy", family: "flower", V: VARIANTS10, T: TRANSITIONS10 },
    { key: "tile_flower_heather", label: "Heather", family: "flower", V: VARIANTS11, T: TRANSITIONS11 },
    { key: "tile_flower_water_lily", label: "Water Lily", family: "flower", V: VARIANTS12, T: TRANSITIONS12 },
    { key: "tile_herd_sheep", label: "Sheep", family: "herd", V: VARIANTS13, T: TRANSITIONS13 }
  ] };
})();
