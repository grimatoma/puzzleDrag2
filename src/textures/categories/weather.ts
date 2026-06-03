// Weather & sky.

// Shared helper-style cloud body, drawn inline per icon to keep the file
// self-contained (no imports / no shared exports — matches vegetables.ts).

function drawRainCloud(ctx: CanvasRenderingContext2D) {
  // Rain streaks beneath
  ctx.strokeStyle = "#4a90d8";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  [[-12, 6], [-4, 8], [4, 6], [12, 8]].forEach(([x, y], i) => {
    ctx.strokeStyle = i % 2 ? "#6db0ec" : "#3a78c0";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y + 12);
    ctx.stroke();
  });
  // Cloud body — overlapping arcs, grey
  const body = ctx.createLinearGradient(0, -16, 0, 8);
  body.addColorStop(0, "#cdd6de");
  body.addColorStop(0.6, "#8c98a4");
  body.addColorStop(1, "#5e6a76");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.arc(-12, -2, 8, Math.PI * 0.7, Math.PI * 1.8);
  ctx.arc(-2, -8, 11, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(12, -4, 9, Math.PI * 1.3, Math.PI * 0.2);
  ctx.lineTo(18, 2);
  ctx.bezierCurveTo(18, 6, -18, 6, -18, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3e4a56";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Top-light highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-3, -9, 8, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

function drawSnowCloud(ctx: CanvasRenderingContext2D) {
  // Snowflakes drifting down
  const flakes: Array<[number, number, number]> = [
    [-11, 8, 2.4], [0, 12, 1.8], [10, 7, 2.2], [-3, 16, 1.5], [6, 17, 1.6],
  ];
  ctx.strokeStyle = "rgba(220,236,250,0.9)";
  ctx.fillStyle = "#eaf4ff";
  flakes.forEach(([fx, fy, r]) => {
    ctx.lineWidth = 1;
    for (let a = 0; a < Math.PI; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.moveTo(fx - Math.cos(a) * r, fy - Math.sin(a) * r);
      ctx.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(fx, fy, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
  // Cloud body — soft white-grey
  const body = ctx.createLinearGradient(0, -16, 0, 8);
  body.addColorStop(0, "#f2f6fa");
  body.addColorStop(0.6, "#c4d0da");
  body.addColorStop(1, "#94a4b2");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.arc(-12, -2, 8, Math.PI * 0.7, Math.PI * 1.8);
  ctx.arc(-2, -8, 11, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(12, -4, 9, Math.PI * 1.3, Math.PI * 0.2);
  ctx.lineTo(18, 2);
  ctx.bezierCurveTo(18, 6, -18, 6, -18, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5e6e7c";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Top-light highlight
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-3, -9, 8, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRainbow(ctx: CanvasRenderingContext2D) {
  // Multi-band arc
  const bands = ["#e23b3b", "#ef8d2e", "#f5c842", "#5aa84a", "#3a78c8", "#7a3ec0"];
  ctx.lineWidth = 3.2;
  bands.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.arc(0, 12, 21 - i * 3.2, Math.PI, Math.PI * 2);
    ctx.stroke();
  });
  // Small clouds at the two ends
  const cloud = (cx: number) => {
    const g = ctx.createLinearGradient(cx, 6, cx, 20);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#c4d0da");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx - 5, 14, 5, 0, Math.PI * 2);
    ctx.arc(cx + 2, 12, 6, 0, Math.PI * 2);
    ctx.arc(cx + 7, 15, 4.5, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8c98a4";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // highlight
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx, 10, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  cloud(-18);
  cloud(18);
}

function drawLightning(ctx: CanvasRenderingContext2D) {
  // Dark storm cloud
  const body = ctx.createLinearGradient(0, -18, 0, 4);
  body.addColorStop(0, "#7a8694");
  body.addColorStop(0.6, "#4a5664");
  body.addColorStop(1, "#2e3844");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.arc(-12, -6, 8, Math.PI * 0.7, Math.PI * 1.8);
  ctx.arc(-2, -12, 11, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(12, -8, 9, Math.PI * 1.3, Math.PI * 0.2);
  ctx.lineTo(18, -2);
  ctx.bezierCurveTo(18, 2, -18, 2, -18, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1c2630";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Top-light highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(-3, -13, 8, 3.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Bright lightning bolt
  ctx.fillStyle = "#ffd43b";
  ctx.beginPath();
  ctx.moveTo(3, 0);
  ctx.lineTo(-6, 12);
  ctx.lineTo(-1, 12);
  ctx.lineTo(-5, 24);
  ctx.lineTo(9, 7);
  ctx.lineTo(3, 7);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Inner glow
  ctx.fillStyle = "rgba(255,250,200,0.7)";
  ctx.beginPath();
  ctx.moveTo(2, 3);
  ctx.lineTo(-3, 11);
  ctx.lineTo(1, 11);
  ctx.lineTo(-2, 18);
  ctx.lineTo(5, 8);
  ctx.lineTo(1, 8);
  ctx.closePath();
  ctx.fill();
}

function drawSunCloud(ctx: CanvasRenderingContext2D) {
  // Sun behind, upper-left
  ctx.save();
  ctx.translate(-6, -8);
  // Rays
  ctx.strokeStyle = "#f5b820";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
    ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
    ctx.stroke();
  }
  // Sun disc
  const sun = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11);
  sun.addColorStop(0, "#fff3a0");
  sun.addColorStop(0.6, "#ffce40");
  sun.addColorStop(1, "#f0991a");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c87810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
  // Fluffy white cloud in front, lower-right
  const body = ctx.createLinearGradient(0, -4, 0, 16);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.6, "#e6edf3");
  body.addColorStop(1, "#c0ccd6");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-12, 12);
  ctx.arc(-8, 8, 7, Math.PI * 0.7, Math.PI * 1.8);
  ctx.arc(2, 3, 9, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(14, 7, 7.5, Math.PI * 1.3, Math.PI * 0.2);
  ctx.lineTo(20, 12);
  ctx.bezierCurveTo(20, 16, -12, 16, -12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8c98a4";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawFog(ctx: CanvasRenderingContext2D) {
  // Soft layered horizontal mist bands
  const bands: Array<[number, number, number]> = [
    [-16, -2, 0.35],
    [-12, 8, 0.5],
    [-10, 18, 0.4],
    [-14, -12, 0.28],
  ];
  ctx.lineCap = "round";
  bands.forEach(([x, y, alpha], i) => {
    const w = 28 + (i % 2) * 6;
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, `rgba(200,212,224,0)`);
    g.addColorStop(0.5, `rgba(176,190,204,${alpha})`);
    g.addColorStop(1, `rgba(200,212,224,0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + w * 0.3, y - 2, x + w * 0.7, y + 2, x + w, y);
    ctx.stroke();
  });
  // Brighter wisps on top for depth
  ctx.lineWidth = 2;
  [[-12, 2, 22], [-8, 13, 18], [-10, -7, 20]].forEach(([x, y, w]) => {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + w * 0.3, y - 1.5, x + w * 0.7, y + 1.5, x + w, y);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
}

function drawCrescentMoon(ctx: CanvasRenderingContext2D) {
  // Crescent — full disc minus offset disc
  ctx.save();
  ctx.rotate(-0.35);
  const moon = ctx.createRadialGradient(-2, -2, 3, 0, 0, 20);
  moon.addColorStop(0, "#fff7d4");
  moon.addColorStop(0.6, "#f3e08a");
  moon.addColorStop(1, "#d6b840");
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.arc(8, -4, 15, 0, Math.PI * 2, true);
  ctx.fillStyle = moon;
  ctx.fill("evenodd");
  ctx.strokeStyle = "#b09020";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 17, Math.PI * 0.42, Math.PI * 1.62);
  ctx.stroke();
  // Soft craters
  ctx.fillStyle = "rgba(190,160,60,0.4)";
  [[-9, 6, 2.2], [-12, -3, 1.6], [-5, 11, 1.4]].forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Highlight rim
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 14, Math.PI * 0.6, Math.PI * 1.3);
  ctx.stroke();
  ctx.restore();
  // Small twinkling stars
  const star = (sx: number, sy: number, r: number) => {
    ctx.fillStyle = "#fff3c0";
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      const a2 = a + Math.PI / 4;
      ctx.lineTo(sx + Math.cos(a2) * r * 0.4, sy + Math.sin(a2) * r * 0.4);
    }
    ctx.closePath();
    ctx.fill();
  };
  star(13, -12, 3.5);
  star(16, 6, 2.4);
}

function drawComet(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.rotate(0.3);
  // Glowing tail — tapering streak up-left
  const tail = ctx.createLinearGradient(8, -8, -22, 22);
  tail.addColorStop(0, "rgba(120,200,255,0.85)");
  tail.addColorStop(0.5, "rgba(90,160,240,0.4)");
  tail.addColorStop(1, "rgba(140,180,255,0)");
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(5, -3);
  ctx.lineTo(-22, 20);
  ctx.lineTo(-16, 24);
  ctx.lineTo(8, 5);
  ctx.closePath();
  ctx.fill();
  // Outer glow around head
  const glow = ctx.createRadialGradient(7, -5, 2, 7, -5, 14);
  glow.addColorStop(0, "rgba(180,230,255,0.8)");
  glow.addColorStop(1, "rgba(120,190,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(7, -5, 14, 0, Math.PI * 2);
  ctx.fill();
  // Bright comet head
  const head = ctx.createRadialGradient(5, -7, 1, 7, -5, 9);
  head.addColorStop(0, "#ffffff");
  head.addColorStop(0.5, "#cfe9ff");
  head.addColorStop(1, "#5aa0e8");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(7, -5, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a78c0";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Head highlight
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(4, -8, 2.4, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Sparkles scattered along the tail
  const spark = (sx: number, sy: number, r: number) => {
    ctx.fillStyle = "rgba(220,240,255,0.9)";
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
  spark(-10, 10, 2.6);
  spark(-18, 16, 1.8);
  spark(-2, 6, 1.6);
  spark(14, 10, 1.5);
}

export const ICONS = {
  weather_rain_cloud:    { label:"Rain Cloud",    color:"#8c98a4", draw:drawRainCloud },
  weather_snow_cloud:    { label:"Snow Cloud",    color:"#c4d0da", draw:drawSnowCloud },
  weather_rainbow:       { label:"Rainbow",       color:"#5aa84a", draw:drawRainbow },
  weather_lightning:     { label:"Lightning",     color:"#ffd43b", draw:drawLightning },
  weather_sun_cloud:     { label:"Partly Cloudy", color:"#ffce40", draw:drawSunCloud },
  weather_fog:           { label:"Fog",           color:"#b0becc", draw:drawFog },
  weather_crescent_moon: { label:"Crescent Moon", color:"#f3e08a", draw:drawCrescentMoon },
  weather_comet:         { label:"Comet",         color:"#5aa0e8", draw:drawComet },
};
