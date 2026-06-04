// Celestial / astral / night-sky.

// Self-contained Canvas-2D icons (no imports / no shared exports — matches
// vegetables.ts and weather.ts). Each draw fn is centered at origin (0,0)
// within a roughly -24..+24 box, using save/restore around any transforms.

// Shared inline star helper is intentionally duplicated per function to keep
// the file dependency-free.

function drawSun(ctx: CanvasRenderingContext2D) {
  // Outer corona glow
  const corona = ctx.createRadialGradient(0, 0, 6, 0, 0, 24);
  corona.addColorStop(0, "rgba(255,220,120,0.85)");
  corona.addColorStop(0.5, "rgba(255,170,50,0.35)");
  corona.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // Rays — alternating long/short, warm
  ctx.lineCap = "round";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const long = i % 2 === 0;
    const r1 = 13;
    const r2 = long ? 23 : 18;
    ctx.strokeStyle = long ? "#ffcf3a" : "#ffa820";
    ctx.lineWidth = long ? 2.4 : 1.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  // Sun disc — warm radial gradient
  const disc = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13);
  disc.addColorStop(0, "#fff6c8");
  disc.addColorStop(0.5, "#ffd84a");
  disc.addColorStop(0.85, "#f59a18");
  disc.addColorStop(1, "#d2700c");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b85c08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Inner glow rim
  ctx.strokeStyle = "rgba(255,250,210,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 9, Math.PI * 0.55, Math.PI * 1.4);
  ctx.stroke();
  // Specular highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-4, -5, 3, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawFullMoon(ctx: CanvasRenderingContext2D) {
  // Soft halo
  const halo = ctx.createRadialGradient(0, 0, 13, 0, 0, 24);
  halo.addColorStop(0, "rgba(220,230,255,0.55)");
  halo.addColorStop(0.6, "rgba(180,200,250,0.22)");
  halo.addColorStop(1, "rgba(180,200,250,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // Moon disc — pale silver gradient
  const disc = ctx.createRadialGradient(-5, -5, 3, 0, 0, 16);
  disc.addColorStop(0, "#ffffff");
  disc.addColorStop(0.5, "#eef2fb");
  disc.addColorStop(0.85, "#cdd6e8");
  disc.addColorStop(1, "#9aa6c0");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a96b2";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Craters — clipped to disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.clip();
  const craters: Array<[number, number, number]> = [
    [-5, -6, 4], [6, -2, 3], [-2, 7, 3.5], [9, 7, 2.2], [-9, 3, 2], [3, -9, 1.8],
  ];
  craters.forEach(([cx, cy, r]) => {
    // shaded basin
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0.5, cx, cy, r);
    g.addColorStop(0, "rgba(150,160,185,0.7)");
    g.addColorStop(0.7, "rgba(120,132,160,0.6)");
    g.addColorStop(1, "rgba(120,132,160,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // bright lower rim
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.2, Math.PI * 0.9);
    ctx.stroke();
  });
  ctx.restore();
  // Crescent highlight rim
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 12.5, Math.PI * 0.6, Math.PI * 1.35);
  ctx.stroke();
}

function drawRingedPlanet(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.rotate(-0.32);
  // Back half of the ring (behind the planet)
  ctx.strokeStyle = "rgba(210,180,130,0.5)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 8, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(170,140,100,0.4)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 6.5, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  // Planet disc — warm banded gradient
  const disc = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13);
  disc.addColorStop(0, "#ffe6b0");
  disc.addColorStop(0.5, "#e8b65a");
  disc.addColorStop(0.85, "#bd8030");
  disc.addColorStop(1, "#7a4c12");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6a4010";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Atmospheric bands — clipped to disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(120,76,18,0.45)";
  ctx.lineWidth = 1.6;
  [-6, -1.5, 3, 7.5].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.bezierCurveTo(-4, y - 1.5, 4, y + 1.5, 12, y);
    ctx.stroke();
  });
  ctx.strokeStyle = "rgba(255,238,190,0.4)";
  ctx.lineWidth = 1;
  [-8, 0.5, 5].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.bezierCurveTo(-4, y - 1, 4, y + 1, 12, y);
    ctx.stroke();
  });
  ctx.restore();
  // Specular highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-5, -5, 2.4, 3.4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Front half of the ring (over the planet)
  ctx.strokeStyle = "rgba(245,222,170,0.92)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 8, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = "rgba(200,165,110,0.85)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 6.5, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
  // Small moon with its own glow
  const moonGlow = ctx.createRadialGradient(16, -15, 1, 16, -15, 7);
  moonGlow.addColorStop(0, "rgba(230,238,255,0.8)");
  moonGlow.addColorStop(1, "rgba(200,215,255,0)");
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(16, -15, 7, 0, Math.PI * 2);
  ctx.fill();
  const moon = ctx.createRadialGradient(15, -16, 0.5, 16, -15, 4);
  moon.addColorStop(0, "#ffffff");
  moon.addColorStop(0.7, "#dfe6f4");
  moon.addColorStop(1, "#b3bdd6");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(16, -15, 3.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawShootingStar(ctx: CanvasRenderingContext2D) {
  // Diagonal glowing trail — from lower-left up to the head at upper-right
  ctx.save();
  const headX = 11;
  const headY = -11;
  const tailX = -20;
  const tailY = 20;
  const trail = ctx.createLinearGradient(headX, headY, tailX, tailY);
  trail.addColorStop(0, "rgba(255,245,200,0.95)");
  trail.addColorStop(0.4, "rgba(255,210,120,0.5)");
  trail.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = trail;
  // tapering wedge from head to tail
  const nx = -0.7071; // unit normal to the 45deg trail direction
  const ny = -0.7071;
  const hw = 4.5; // half-width at the head
  ctx.beginPath();
  ctx.moveTo(headX + nx * hw, headY + ny * hw);
  ctx.lineTo(headX - nx * hw, headY - ny * hw);
  ctx.lineTo(tailX, tailY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Outer glow around the head
  const glow = ctx.createRadialGradient(11, -11, 2, 11, -11, 15);
  glow.addColorStop(0, "rgba(255,250,210,0.9)");
  glow.addColorStop(0.5, "rgba(255,210,110,0.4)");
  glow.addColorStop(1, "rgba(255,210,110,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(11, -11, 15, 0, Math.PI * 2);
  ctx.fill();
  // Bright 4-point star head
  const drawStar4 = (sx: number, sy: number, r: number, inner: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      const a2 = a + Math.PI / 4;
      ctx.lineTo(sx + Math.cos(a2) * r * inner, sy + Math.sin(a2) * r * inner);
    }
    ctx.closePath();
    ctx.fill();
  };
  drawStar4(11, -11, 10, 0.32, "#fff2bf");
  drawStar4(11, -11, 6, 0.4, "#ffffff");
  // Bright core
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(11, -11, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Sparkles scattered along the trail
  const spark = (sx: number, sy: number, r: number) => {
    ctx.fillStyle = "rgba(255,248,220,0.9)";
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      const a2 = a + Math.PI / 4;
      ctx.lineTo(sx + Math.cos(a2) * r * 0.35, sy + Math.sin(a2) * r * 0.35);
    }
    ctx.closePath();
    ctx.fill();
  };
  spark(-2, 2, 2.6);
  spark(-11, 11, 2);
  spark(-17, 17, 1.4);
  spark(4, -4, 1.6);
}

function drawConstellation(ctx: CanvasRenderingContext2D) {
  // Deep-blue field backdrop
  const field = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
  field.addColorStop(0, "rgba(40,60,120,0.55)");
  field.addColorStop(0.7, "rgba(20,30,70,0.4)");
  field.addColorStop(1, "rgba(12,18,44,0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // Faint background dust stars
  ctx.fillStyle = "rgba(200,215,255,0.5)";
  [[-19, -8], [17, -16], [-15, 14], [20, 10], [2, -20], [-8, 19], [14, 18]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  // Constellation nodes — simple connected shape
  const nodes: Array<[number, number, number]> = [
    [-14, 8, 3.4],
    [-4, -2, 2.8],
    [6, -12, 4],
    [13, 0, 3],
    [4, 12, 3.2],
  ];
  // Connecting lines
  ctx.strokeStyle = "rgba(170,200,255,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  nodes.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  // a closing brace line back from the last node
  ctx.beginPath();
  ctx.moveTo(nodes[1][0], nodes[1][1]);
  ctx.lineTo(nodes[4][0], nodes[4][1]);
  ctx.stroke();
  // Star nodes — glow + 4-point sparkle
  const drawNode = (sx: number, sy: number, r: number) => {
    const glow = ctx.createRadialGradient(sx, sy, 0.5, sx, sy, r * 2.2);
    glow.addColorStop(0, "rgba(220,235,255,0.9)");
    glow.addColorStop(1, "rgba(160,195,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      const a2 = a + Math.PI / 4;
      ctx.lineTo(sx + Math.cos(a2) * r * 0.36, sy + Math.sin(a2) * r * 0.36);
    }
    ctx.closePath();
    ctx.fill();
  };
  nodes.forEach(([x, y, r]) => drawNode(x, y, r));
}

function drawGalaxy(ctx: CanvasRenderingContext2D) {
  // Deep space backdrop
  const field = ctx.createRadialGradient(0, 0, 3, 0, 0, 24);
  field.addColorStop(0, "rgba(60,40,110,0.6)");
  field.addColorStop(0.6, "rgba(28,20,60,0.45)");
  field.addColorStop(1, "rgba(14,10,34,0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // Spiral arms — two logarithmic arms of scattered star dots
  ctx.save();
  const arm = (phase: number, hue: string) => {
    for (let t = 0.15; t < 1; t += 0.045) {
      const a = phase + t * Math.PI * 2.4;
      const rad = 3 + t * 19;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad * 0.62; // flattened disc
      const size = 1.6 * (1 - t) + 0.5;
      const alpha = 0.85 * (1 - t * 0.5);
      ctx.fillStyle = hue.replace("ALPHA", alpha.toFixed(2));
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      // occasional brighter star
      if (Math.sin(t * 30) > 0.6) {
        ctx.fillStyle = `rgba(255,255,255,${(alpha).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  arm(0, "rgba(170,200,255,ALPHA)");
  arm(Math.PI, "rgba(220,180,255,ALPHA)");
  ctx.restore();
  // Bright glowing core
  const coreGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, 11);
  coreGlow.addColorStop(0, "rgba(255,250,230,0.95)");
  coreGlow.addColorStop(0.4, "rgba(255,225,170,0.7)");
  coreGlow.addColorStop(1, "rgba(255,210,150,0)");
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const core = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 5);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.6, "#fff0c8");
  core.addColorStop(1, "#ffcf80");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawNorthStar(ctx: CanvasRenderingContext2D) {
  // Radiant glow
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  glow.addColorStop(0, "rgba(225,240,255,0.95)");
  glow.addColorStop(0.4, "rgba(150,200,255,0.5)");
  glow.addColorStop(1, "rgba(120,180,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // 8-point compass star: 4 long cardinal points + 4 short diagonals
  const drawPointStar = (r: number, innerRatio: number, longRatio: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const tip = i % 2 === 0 ? r : r * longRatio;
      ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
      const a2 = a + Math.PI / 8;
      ctx.lineTo(Math.cos(a2) * r * innerRatio, Math.sin(a2) * r * innerRatio);
    }
    ctx.closePath();
    ctx.fill();
  };
  // Outer pale-gold spikes
  drawPointStar(22, 0.16, 0.5, "#cfe6ff");
  // Bright white core star
  const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.6, "#eaf3ff");
  grad.addColorStop(1, "#a8cdff");
  drawPointStarGrad(ctx, 14, 0.22, 0.55, grad);
  // Brilliant center
  const core = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 5);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
}

// Gradient-filled 8-point star helper (used by the north star core).
function drawPointStarGrad(
  ctx: CanvasRenderingContext2D,
  r: number,
  innerRatio: number,
  longRatio: number,
  fill: CanvasGradient,
) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const tip = i % 2 === 0 ? r : r * longRatio;
    ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
    const a2 = a + Math.PI / 8;
    ctx.lineTo(Math.cos(a2) * r * innerRatio, Math.sin(a2) * r * innerRatio);
  }
  ctx.closePath();
  ctx.fill();
}

function drawEclipse(ctx: CanvasRenderingContext2D) {
  // Wide outer corona glow
  const corona = ctx.createRadialGradient(0, 0, 9, 0, 0, 24);
  corona.addColorStop(0, "rgba(255,240,200,0.95)");
  corona.addColorStop(0.35, "rgba(255,200,110,0.6)");
  corona.addColorStop(0.7, "rgba(255,170,80,0.25)");
  corona.addColorStop(1, "rgba(255,170,80,0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // Streaming corona rays
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const len = 18 + (i % 3) * 4;
    const g = ctx.createLinearGradient(
      Math.cos(a) * 12, Math.sin(a) * 12,
      Math.cos(a) * len, Math.sin(a) * len,
    );
    g.addColorStop(0, "rgba(255,235,180,0.8)");
    g.addColorStop(1, "rgba(255,200,110,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = i % 2 === 0 ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.restore();
  // Blazing inner ring (diamond-ring effect)
  const ring = ctx.createRadialGradient(0, 0, 9.5, 0, 0, 13);
  ring.addColorStop(0, "rgba(255,255,255,0)");
  ring.addColorStop(0.5, "rgba(255,248,210,0.95)");
  ring.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  // Dark moon disc occluding the sun
  const disc = ctx.createRadialGradient(-3, -3, 2, 0, 0, 12);
  disc.addColorStop(0, "#3a3650");
  disc.addColorStop(0.6, "#211f33");
  disc.addColorStop(1, "#0c0a18");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  // Bright rim of light around the disc
  ctx.strokeStyle = "rgba(255,250,220,0.95)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.stroke();
  // Diamond-ring bright spot
  const spotA = -Math.PI * 0.3;
  const sx = Math.cos(spotA) * 11;
  const sy = Math.sin(spotA) * 11;
  const spot = ctx.createRadialGradient(sx, sy, 0.5, sx, sy, 5);
  spot.addColorStop(0, "#ffffff");
  spot.addColorStop(0.5, "rgba(255,245,200,0.8)");
  spot.addColorStop(1, "rgba(255,230,160,0)");
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fill();
}

export const ICONS = {
  astral_sun:           { label:"Sun",            color:"#ffd84a", draw:drawSun },
  astral_full_moon:     { label:"Full Moon",      color:"#cdd6e8", draw:drawFullMoon },
  astral_ringed_planet: { label:"Ringed Planet",  color:"#e8b65a", draw:drawRingedPlanet },
  astral_shooting_star: { label:"Shooting Star",  color:"#ffd870", draw:drawShootingStar },
  astral_constellation: { label:"Constellation",  color:"#aac8ff", draw:drawConstellation },
  astral_galaxy:        { label:"Galaxy",         color:"#c8a0ff", draw:drawGalaxy },
  astral_north_star:    { label:"North Star",     color:"#e1f0ff", draw:drawNorthStar },
  astral_eclipse:       { label:"Eclipse",        color:"#ffc870", draw:drawEclipse },
};
