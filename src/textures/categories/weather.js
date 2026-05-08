// Weather icons — drawn at canvas origin (0,0); fits a ~64px box.

function drawClear(ctx) {
  // Clear — sun with rays
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rays
  ctx.strokeStyle = "#f8c040";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
    ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
    ctx.stroke();
  }
  // Sun body
  const sun = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
  sun.addColorStop(0, "#fff070");
  sun.addColorStop(0.5, "#f8c040");
  sun.addColorStop(1, "#a87018");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a87018";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Sun face — happy
  ctx.fillStyle = "#7a4a08";
  ctx.beginPath(); ctx.arc(-3.5, -2, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3.5, -2, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7a4a08";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 2, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // Cheek dabs
  ctx.fillStyle = "rgba(220,120,80,0.45)";
  ctx.beginPath(); ctx.arc(-6, 2, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, 2, 1.4, 0, Math.PI * 2); ctx.fill();
}

function drawRain(ctx) {
  // Rain — cloud with falling drops
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cloud body
  const cloud = ctx.createLinearGradient(0, -16, 0, 4);
  cloud.addColorStop(0, "#9a9da4");
  cloud.addColorStop(1, "#5a606a");
  ctx.fillStyle = cloud;
  ctx.beginPath();
  ctx.arc(-12, -2, 8, 0, Math.PI * 2);
  ctx.arc(-4, -10, 9, 0, Math.PI * 2);
  ctx.arc(8, -8, 10, 0, Math.PI * 2);
  ctx.arc(14, -2, 7, 0, Math.PI * 2);
  ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a4048";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Cloud shading underside
  ctx.fillStyle = "rgba(40,46,56,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rain drops
  ctx.fillStyle = "#6ab0e8";
  [[-10, 8], [-2, 12], [6, 8], [12, 14], [-14, 14], [2, 18], [10, 18]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 2, y + 4, x + 2, y + 4, x, y + 8);
    ctx.fill();
  });
  ctx.strokeStyle = "#3a82c4";
  ctx.lineWidth = 0.6;
  [[-10, 8], [-2, 12], [6, 8], [12, 14], [-14, 14], [2, 18], [10, 18]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 2, y + 4, x + 2, y + 4, x, y + 8);
    ctx.stroke();
  });
  // Drop highlights
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  [[-10, 9], [-2, 13], [6, 9], [12, 15], [2, 19], [10, 19]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x - 0.8, y, 0.5, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHarvestMoon(ctx) {
  // Harvest Moon — orange full moon over wheat
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Moon halo
  const halo = ctx.createRadialGradient(0, -4, 4, 0, -4, 22);
  halo.addColorStop(0, "rgba(255,180,80,0.5)");
  halo.addColorStop(1, "rgba(255,180,80,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, -4, 22, 0, Math.PI * 2);
  ctx.fill();
  // Moon body
  const moon = ctx.createRadialGradient(-4, -8, 2, 0, -4, 14);
  moon.addColorStop(0, "#ffd870");
  moon.addColorStop(0.6, "#e89030");
  moon.addColorStop(1, "#a85808");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(0, -4, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a3a08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Moon craters
  ctx.fillStyle = "rgba(120,60,8,0.4)";
  [[-3, -8, 2], [4, -2, 1.6], [-5, 0, 1.2], [2, -8, 1.2]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Wheat stalks at base
  ctx.strokeStyle = "#8a5a18";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  for (let x = -16; x <= 16; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.bezierCurveTo(x, 16, x + 1, 14, x + 1, 10);
    ctx.stroke();
  }
  // Wheat heads (silhouette)
  ctx.fillStyle = "#5a3014";
  for (let x = -16; x <= 16; x += 4) {
    ctx.beginPath();
    ctx.ellipse(x + 1, 10, 1, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDrought(ctx) {
  // Drought — sun with cracked earth
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cracked ground
  ctx.fillStyle = "#b87838";
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3014";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Earth highlight
  ctx.fillStyle = "rgba(220,170,100,0.6)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 18, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cracks
  ctx.strokeStyle = "#3a1c08";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  [
    [[-14, 14], [-6, 16], [-2, 18], [4, 14], [12, 18]],
    [[-10, 18], [-4, 22]],
    [[8, 14], [14, 22]],
  ].forEach((path) => {
    ctx.beginPath();
    path.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  // Wilted plant
  ctx.strokeStyle = "#7a5028";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(2, 10, -2, 6, 4, 4);
  ctx.stroke();
  ctx.fillStyle = "#a85028";
  ctx.beginPath();
  ctx.ellipse(4, 4, 2, 1, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Hot sun (top)
  ctx.fillStyle = "rgba(255,180,80,0.4)";
  ctx.beginPath();
  ctx.arc(0, -10, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c87018";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, -10 + Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a) * 16, -10 + Math.sin(a) * 16);
    ctx.stroke();
  }
  ctx.fillStyle = "#f8a020";
  ctx.beginPath();
  ctx.arc(0, -10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a85008";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Sun face — angry
  ctx.fillStyle = "#7a3008";
  ctx.beginPath(); ctx.arc(-2.4, -11, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2.4, -11, 1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7a3008";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3, -8); ctx.quadraticCurveTo(0, -10, 3, -8);
  ctx.stroke();
}

function drawFrost(ctx) {
  // Frost — snowflake on icy ground
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Frosty ground
  ctx.fillStyle = "#cfe8f8";
  ctx.beginPath();
  ctx.ellipse(0, 20, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a82c4";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Snow piles
  ctx.fillStyle = "#ffffff";
  [[-14, 18, 4], [4, 16, 5], [14, 18, 3]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.fill();
  });
  // Snowflake (hexagonal)
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.translate(0, -2);
    ctx.rotate((i / 6) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -16);
    ctx.stroke();
    // Branches
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(-3, -11);
    ctx.moveTo(0, -8); ctx.lineTo(3, -11);
    ctx.moveTo(0, -12); ctx.lineTo(-2, -14);
    ctx.moveTo(0, -12); ctx.lineTo(2, -14);
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = "#80c0e8";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.translate(0, -2);
    ctx.rotate((i / 6) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -16);
    ctx.stroke();
    ctx.restore();
  }
  // Center hub
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#80c0e8";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Glint
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(-1, -3, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Falling snowflakes
  ctx.fillStyle = "#ffffff";
  [[-18, -14, 1.4], [16, -10, 1.2], [-12, -22, 1], [14, -22, 1]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHarvestMoonAlt(ctx) {
  drawHarvestMoon(ctx);
}

export const ICONS = {
  weather_clear:        { label:"Clear",        color:"#f8c040", draw:drawClear },
  weather_rain:         { label:"Rain",         color:"#3a82c4", draw:drawRain },
  weather_harvest_moon: { label:"Harvest Moon", color:"#e89030", draw:drawHarvestMoon },
  weather_harvestMoon:  { label:"Harvest Moon", color:"#e89030", draw:drawHarvestMoonAlt },
  weather_drought:      { label:"Drought",      color:"#c87018", draw:drawDrought },
  weather_frost:        { label:"Frost",        color:"#80c0e8", draw:drawFrost },
};
