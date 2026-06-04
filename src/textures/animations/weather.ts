// Weather & sky — animated variants.
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds). The caller
// clears, translates to center, scales, sets lineCap/lineJoin="round", and
// calls us; we only draw at origin (0,0) within a ~-24..+24 box. Everything is
// deterministic in `t` (no Math.random) and loops seamlessly (modulo / sin).
//
// Self-contained: no imports. Shapes/colors mirror
// src/textures/categories/weather.ts so identity reads the same — just alive.

// ---------------------------------------------------------------------------
// Shared cloud body (matches the categories file). Drawn inline so this file
// stays import-free. `cy` shifts the whole body for a gentle bob.
// ---------------------------------------------------------------------------
function cloudBody(
  ctx: CanvasRenderingContext2D,
  cy: number,
  top: string,
  mid: string,
  bot: string,
  stroke: string,
  highlight: string,
): void {
  const body = ctx.createLinearGradient(0, -16 + cy, 0, 8 + cy);
  body.addColorStop(0, top);
  body.addColorStop(0.6, mid);
  body.addColorStop(1, bot);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-18, 2 + cy);
  ctx.arc(-12, -2 + cy, 8, Math.PI * 0.7, Math.PI * 1.8);
  ctx.arc(-2, -8 + cy, 11, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(12, -4 + cy, 9, Math.PI * 1.3, Math.PI * 0.2);
  ctx.lineTo(18, 2 + cy);
  ctx.bezierCurveTo(18, 6 + cy, -18, 6 + cy, -18, 2 + cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(-3, -9 + cy, 8, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

// Four-point sparkle/star, shared by comet + moon.
function fourStar(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  r: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    const a2 = a + Math.PI / 4;
    ctx.lineTo(sx + Math.cos(a2) * r * 0.4, sy + Math.sin(a2) * r * 0.4);
  }
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 1. Rain cloud — streaks fall continuously, slight cloud bob, occasional
//    faster drop.
// ---------------------------------------------------------------------------
function animRainCloud(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 1.6) * 1.2;

  // Rain streaks beneath, each looping its Y via modulo.
  const cols: Array<[number, number]> = [
    [-12, 0],
    [-4, 0.45],
    [4, 0.8],
    [12, 0.25],
  ];
  const span = 16; // vertical travel before wrapping
  const startY = 5 + bob;
  ctx.lineWidth = 2;
  cols.forEach(([x, phase], i) => {
    // Some drops fall faster (the "occasional faster drop").
    const speed = i === 2 ? 26 : 18;
    const local = ((t * speed) / span + phase) % 1; // 0..1
    const y = startY + local * span;
    // Fade the streak in as it appears and out as it nears the bottom.
    const fade = Math.sin(local * Math.PI);
    ctx.globalAlpha = 0.25 + fade * 0.75;
    ctx.strokeStyle = i % 2 ? "#6db0ec" : "#3a78c0";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y + 10);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  cloudBody(
    ctx,
    bob,
    "#cdd6de",
    "#8c98a4",
    "#5e6a76",
    "#3e4a56",
    "rgba(255,255,255,0.4)",
  );
}

// ---------------------------------------------------------------------------
// 2. Snow cloud — flakes drift down, sway side to side (sin on x), slow rotate.
// ---------------------------------------------------------------------------
function animSnowCloud(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 1.2) * 0.8;

  const flakes: Array<[number, number, number]> = [
    [-11, 6, 2.4],
    [0, 8, 1.8],
    [10, 5, 2.2],
    [-3, 7, 1.5],
    [6, 9, 1.6],
  ];
  const span = 18;
  flakes.forEach(([fx, baseY, r], idx) => {
    const phase = idx * 0.21;
    const local = ((t * 0.42) + phase) % 1; // slow fall
    const y = baseY + bob + local * span;
    const fade = Math.sin(local * Math.PI);
    const x = fx + Math.sin(t * 1.4 + idx * 1.7) * 2.6; // sway
    const rot = t * (0.5 + idx * 0.12) + idx; // each flake rotates slowly

    ctx.globalAlpha = 0.2 + fade * 0.8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = "rgba(220,236,250,0.9)";
    ctx.lineWidth = 1;
    for (let a = 0; a < Math.PI; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.fillStyle = "#eaf4ff";
    ctx.beginPath();
    ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.globalAlpha = 1;

  cloudBody(
    ctx,
    bob,
    "#f2f6fa",
    "#c4d0da",
    "#94a4b2",
    "#5e6e7c",
    "rgba(255,255,255,0.6)",
  );
}

// ---------------------------------------------------------------------------
// 3. Lightning — cloud drifts; bolt flashes on a short duty cycle with a glow
//    burst, dim otherwise.
// ---------------------------------------------------------------------------
function animLightning(ctx: CanvasRenderingContext2D, t: number): void {
  const drift = Math.sin(t * 0.9) * 2;

  // Flash cycle: bright for a short slice of each ~1.5s period.
  const period = 1.5;
  const phase = (t % period) / period; // 0..1
  const flashing = phase < 0.16;
  // Flicker within the flash for a lively strike.
  const flicker = flashing ? 0.6 + Math.abs(Math.sin(t * 40)) * 0.4 : 0;
  const bright = flashing ? flicker : 0;

  ctx.save();
  ctx.translate(drift, 0);

  // Dark storm cloud (body raised relative to standard layout).
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
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(-3, -13, 8, 3.5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Glow burst behind the bolt during a flash.
  if (bright > 0) {
    const glow = ctx.createRadialGradient(2, 10, 2, 2, 10, 22);
    glow.addColorStop(0, `rgba(255,245,170,${0.55 * bright})`);
    glow.addColorStop(1, "rgba(255,235,120,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(2, 10, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bolt body — dim by default, blazing during the flash.
  const boltAlpha = 0.4 + bright * 0.6;
  ctx.globalAlpha = boltAlpha;
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

  // Inner white-hot core, only visible while striking.
  ctx.globalAlpha = 0.3 + bright * 0.7;
  ctx.fillStyle = "rgba(255,250,200,0.9)";
  ctx.beginPath();
  ctx.moveTo(2, 3);
  ctx.lineTo(-3, 11);
  ctx.lineTo(1, 11);
  ctx.lineTo(-2, 18);
  ctx.lineTo(5, 8);
  ctx.lineTo(1, 8);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. Comet — streaks across, flowing flickering tail, twinkling sparkles,
//    position loops.
// ---------------------------------------------------------------------------
function animComet(ctx: CanvasRenderingContext2D, t: number): void {
  // Travel diagonally; loop the position seamlessly over `period` seconds.
  const period = 3.2;
  const local = (t % period) / period; // 0..1
  // Move from lower-left to upper-right and wrap.
  const travel = -14 + local * 28;
  // Fade head as it enters/exits the box so the wrap is seamless.
  const edge = Math.min(1, Math.sin(local * Math.PI) * 1.6);

  ctx.save();
  ctx.rotate(0.3);
  ctx.translate(travel, -travel * 0.6);
  ctx.globalAlpha = edge;

  // Flowing tail — length flickers slightly.
  const wobble = Math.sin(t * 7) * 1.5;
  const tail = ctx.createLinearGradient(8, -8, -22 - wobble, 22 + wobble);
  tail.addColorStop(0, "rgba(120,200,255,0.85)");
  tail.addColorStop(0.5, "rgba(90,160,240,0.4)");
  tail.addColorStop(1, "rgba(140,180,255,0)");
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(5, -3);
  ctx.lineTo(-22 - wobble, 20 + wobble);
  ctx.lineTo(-16 - wobble, 24 + wobble);
  ctx.lineTo(8, 5);
  ctx.closePath();
  ctx.fill();

  // Outer glow, breathing.
  const glowR = 13 + Math.sin(t * 5) * 1.5;
  const glow = ctx.createRadialGradient(7, -5, 2, 7, -5, glowR);
  glow.addColorStop(0, "rgba(180,230,255,0.8)");
  glow.addColorStop(1, "rgba(120,190,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(7, -5, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Bright head.
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
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(4, -8, 2.4, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Twinkling sparkles along the tail (rotate + pulse, staggered).
  const sparks: Array<[number, number, number]> = [
    [-10, 10, 2.6],
    [-18, 16, 1.8],
    [-2, 6, 1.6],
    [14, 10, 1.5],
  ];
  sparks.forEach(([sx, sy, r], idx) => {
    const tw = 0.5 + 0.5 * Math.sin(t * 6 + idx * 2.1);
    const rr = r * (0.55 + tw * 0.6);
    ctx.globalAlpha = edge * (0.4 + tw * 0.6);
    fourStar(ctx, sx, sy, rr, "rgba(220,240,255,0.95)");
  });

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. Sun cloud — sun rays slowly rotate and pulse; cloud drifts gently.
// ---------------------------------------------------------------------------
function animSunCloud(ctx: CanvasRenderingContext2D, t: number): void {
  // Sun behind, upper-left.
  ctx.save();
  ctx.translate(-6, -8);

  // Rays rotate slowly and pulse their length.
  ctx.save();
  ctx.rotate(t * 0.35);
  ctx.strokeStyle = "#f5b820";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pulse = 1 + Math.sin(t * 2.5 + i * 0.8) * 0.18;
    const inner = 12;
    const outer = 17 * pulse;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.restore();

  // Sun disc (gently breathing).
  const breathe = 1 + Math.sin(t * 2.5) * 0.04;
  const sun = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11 * breathe);
  sun.addColorStop(0, "#fff3a0");
  sun.addColorStop(0.6, "#ffce40");
  sun.addColorStop(1, "#f0991a");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(0, 0, 10 * breathe, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c87810";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // Fluffy white cloud in front, drifting left/right.
  const drift = Math.sin(t * 0.8) * 2.5;
  ctx.save();
  ctx.translate(drift, 0);
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
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. Rainbow — a soft sheen travels along the bands; end clouds drift; gentle
//    opacity shimmer.
// ---------------------------------------------------------------------------
function animRainbow(ctx: CanvasRenderingContext2D, t: number): void {
  const bands = ["#e23b3b", "#ef8d2e", "#f5c842", "#5aa84a", "#3a78c8", "#7a3ec0"];

  // Gentle overall opacity shimmer.
  const shimmer = 0.85 + Math.sin(t * 1.5) * 0.15;

  // Draw the bands.
  ctx.lineWidth = 3.2;
  bands.forEach((c, i) => {
    ctx.globalAlpha = shimmer;
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.arc(0, 12, 21 - i * 3.2, Math.PI, Math.PI * 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // A travelling bright sheen sweeping along the arc (angle window moving).
  const sweep = (t * 0.6) % 1; // 0..1 across PI..2PI
  const center = Math.PI + sweep * Math.PI;
  const widthA = Math.PI * 0.18;
  ctx.lineWidth = 3.6;
  bands.forEach((_, i) => {
    const r = 21 - i * 3.2;
    // Sheen brightness falls off toward edges of the window.
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(0, 12, r, center - widthA, center + widthA);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // Small clouds at the two ends, drifting slightly.
  const cloud = (cx: number, dx: number) => {
    ctx.save();
    ctx.translate(dx, 0);
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
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx, 10, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const cd = Math.sin(t * 0.9) * 1.2;
  cloud(-18, -cd);
  cloud(18, cd);
}

// ---------------------------------------------------------------------------
// 7. Crescent moon — stars twinkle (staggered), soft glow around moon breathes.
// ---------------------------------------------------------------------------
function animCrescentMoon(ctx: CanvasRenderingContext2D, t: number): void {
  // Breathing glow halo behind the moon.
  ctx.save();
  ctx.rotate(-0.35);
  const haloR = 22 + Math.sin(t * 1.6) * 2.5;
  const haloA = 0.18 + (0.5 + 0.5 * Math.sin(t * 1.6)) * 0.18;
  const halo = ctx.createRadialGradient(0, 0, 12, 0, 0, haloR);
  halo.addColorStop(0, `rgba(255,243,200,${haloA})`);
  halo.addColorStop(1, "rgba(255,243,200,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, Math.PI * 2);
  ctx.fill();

  // Crescent — full disc minus offset disc.
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
  ctx.fillStyle = "rgba(190,160,60,0.4)";
  ([[-9, 6, 2.2], [-12, -3, 1.6], [-5, 11, 1.4]] as Array<[number, number, number]>).forEach(
    ([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    },
  );
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 14, Math.PI * 0.6, Math.PI * 1.3);
  ctx.stroke();
  ctx.restore();

  // Twinkling stars (staggered scale + opacity).
  const stars: Array<[number, number, number, number]> = [
    [13, -12, 3.5, 0],
    [16, 6, 2.4, 1.9],
  ];
  stars.forEach(([sx, sy, r, ph]) => {
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + ph);
    ctx.globalAlpha = 0.4 + tw * 0.6;
    fourStar(ctx, sx, sy, r * (0.7 + tw * 0.5), "#fff3c0");
  });
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// 8. Fog — mist bands drift horizontally at different speeds, fading in/out,
//    looping seamlessly.
// ---------------------------------------------------------------------------
function animFog(ctx: CanvasRenderingContext2D, t: number): void {
  // base: [y, alpha, speed, phase]
  const bands: Array<[number, number, number, number]> = [
    [-12, 0.28, 3.5, 0.0],
    [-2, 0.35, 2.2, 0.4],
    [8, 0.5, 4.0, 0.7],
    [18, 0.4, 2.8, 0.2],
  ];
  const wrap = 14; // horizontal travel amplitude

  bands.forEach(([y, alpha, speed, phase], i) => {
    const w = 28 + (i % 2) * 6;
    // Smooth horizontal drift (sin) so it loops with no jump.
    const dx = Math.sin(t * (speed / 10) + phase * Math.PI * 2) * wrap;
    const x = -16 + dx;
    // Fade in/out over time, staggered per band.
    const fade = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (speed / 12) + phase * 4));
    const a = alpha * fade;
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, "rgba(200,212,224,0)");
    g.addColorStop(0.5, `rgba(176,190,204,${a})`);
    g.addColorStop(1, "rgba(200,212,224,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + w * 0.3, y - 2, x + w * 0.7, y + 2, x + w, y);
    ctx.stroke();
  });

  // Brighter wisps on top for depth, drifting opposite for parallax.
  const wisps: Array<[number, number, number, number]> = [
    [2, 22, 3.0, 0.5],
    [13, 18, 4.5, 0.9],
    [-7, 20, 2.4, 0.1],
  ];
  ctx.lineWidth = 2;
  wisps.forEach(([y, w, speed, phase]) => {
    const dx = -Math.sin(t * (speed / 11) + phase * Math.PI * 2) * wrap * 0.8;
    const x = -12 + dx;
    const fade = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * (speed / 13) + phase * 5));
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(255,255,255,${0.45 * fade})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + w * 0.3, y - 1.5, x + w * 0.7, y + 1.5, x + w, y);
    ctx.stroke();
  });
}

export const ANIMATIONS: Record<
  string,
  (ctx: CanvasRenderingContext2D, t: number) => void
> = {
  weather_rain_cloud: animRainCloud,
  weather_snow_cloud: animSnowCloud,
  weather_lightning: animLightning,
  weather_comet: animComet,
  weather_sun_cloud: animSunCloud,
  weather_rainbow: animRainbow,
  weather_crescent_moon: animCrescentMoon,
  weather_fog: animFog,
};
