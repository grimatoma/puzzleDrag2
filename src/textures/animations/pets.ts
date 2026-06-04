// Animated versions of the procedural pet icons.
// Each fn redraws the COMPLETE icon at time `t` (seconds). Pure, deterministic,
// looping motion driven by Math.sin/cos/modulo. Matches the colors/shapes of the
// static icons in ../categories/pets.ts, but alive with a cute idle.

function shadow(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 22, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function blush(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "rgba(255,140,150,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Big round eye with a white highlight dot. `open` 0..1 squashes for a blink.
function cuteEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, open: number) {
  const oy = Math.max(open, 0.06);
  if (open < 0.16) {
    // Closed: a small happy lash line.
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y + r * 0.5, x + r, y);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * oy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.4 * oy, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

// Returns 1 while open, dips toward 0 for a brief blink each `period` seconds.
function blinkOpen(t: number, period: number, phase: number): number {
  const p = ((t + phase) % period) / period;
  // Blink occupies a short slice at the start of each period.
  if (p < 0.05) return Math.abs(Math.cos(p / 0.05 * Math.PI));
  return 1;
}

function animCat(ctx: CanvasRenderingContext2D, t: number) {
  const breath = Math.sin(t * 2.0) * 1.0;
  const tailSway = Math.sin(t * 1.6);
  const earTwitch = ((t % 5) < 0.3) ? Math.sin((t % 5) / 0.3 * Math.PI) : 0;
  const open = blinkOpen(t, 4.2, 0);

  shadow(ctx, 14);

  // Curled tail behind the body — tip sways/curls.
  ctx.save();
  ctx.translate(11, 8);
  ctx.rotate(tailSway * 0.18);
  ctx.translate(-11, -8);
  ctx.strokeStyle = "#d86a18"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(11, 14);
  ctx.bezierCurveTo(20, 12, 20, 2 + tailSway * 1.6, 12, 4 + tailSway * 1.2);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();

  // Body — breathes a touch.
  ctx.save();
  ctx.translate(0, breath * 0.4);
  ctx.scale(1 + breath * 0.01, 1 + breath * 0.015);
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#ffb04a"); bg.addColorStop(0.6, "#ec8a1e"); bg.addColorStop(1, "#a85a0c");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.bezierCurveTo(-13, 12, -10, 20, 0, 20);
  ctx.bezierCurveTo(10, 20, 13, 12, 9, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = "rgba(120,56,6,0.55)"; ctx.lineWidth = 1.4;
  ([[-6, 8, -8, 12], [0, 10, 0, 15], [6, 8, 8, 12]] as const).forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });
  ctx.fillStyle = "#ffc06a";
  ctx.beginPath(); ctx.ellipse(-4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  // Head bobs gently with the breath.
  ctx.save();
  ctx.translate(0, breath * 0.7);
  const hg = ctx.createRadialGradient(-3, -10, 2, 0, -6, 14);
  hg.addColorStop(0, "#ffba56"); hg.addColorStop(1, "#e8841a");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 2; ctx.stroke();

  // Ears — twitch occasionally.
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(side * 8, -16);
    ctx.rotate(side * earTwitch * 0.25);
    ctx.translate(-side * 8, 16);
    ctx.fillStyle = "#e8841a";
    ctx.beginPath();
    ctx.moveTo(side * 5, -14);
    ctx.lineTo(side * 10, -20);
    ctx.lineTo(side * 11, -12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = "#ffb8b0";
    ctx.beginPath();
    ctx.moveTo(side * 6, -14);
    ctx.lineTo(side * 9, -18);
    ctx.lineTo(side * 9.5, -13);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  ctx.strokeStyle = "rgba(120,56,6,0.5)"; ctx.lineWidth = 1.2;
  ([[-2, -15, -2, -11], [2, -15, 2, -11], [0, -16, 0, -12]] as const).forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });

  // Green eyes — blink.
  [-4, 4].forEach((ex) => {
    if (open < 0.16) {
      ctx.strokeStyle = "#102a10"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ex - 2.4, -6); ctx.quadraticCurveTo(ex, -4.5, ex + 2.4, -6); ctx.stroke();
      return;
    }
    ctx.fillStyle = "#3fae4a";
    ctx.beginPath(); ctx.ellipse(ex, -6, 2.4, 3 * open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#102a10";
    ctx.beginPath(); ctx.ellipse(ex, -6, 1, 2.4 * open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(ex - 0.8, -7.2, 0.8, 0, Math.PI * 2); ctx.fill();
  });

  ctx.fillStyle = "#d05a64";
  ctx.beginPath(); ctx.moveTo(-1.6, -1.5); ctx.lineTo(1.6, -1.5); ctx.lineTo(0, 0.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a2c06"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 0.2); ctx.quadraticCurveTo(-2.5, 2, -4, 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0.2); ctx.quadraticCurveTo(2.5, 2, 4, 0.5); ctx.stroke();
  ctx.strokeStyle = "rgba(90,44,6,0.6)"; ctx.lineWidth = 0.8;
  ([[-3, -2, -12, -3], [-3, -1, -12, 0], [3, -2, 12, -3], [3, -1, 12, 0]] as const).forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });
  blush(ctx, -6, -2, 2.4); blush(ctx, 6, -2, 2.4);
  ctx.restore();
}

function animDog(ctx: CanvasRenderingContext2D, t: number) {
  const bob = Math.sin(t * 3.4) * 1.4;
  const wag = Math.sin(t * 9.0);
  const earBounce = Math.sin(t * 3.4 + 0.6) * 0.12;
  const tongue = 1 + Math.sin(t * 4.0) * 0.12;
  const open = blinkOpen(t, 3.4, 0.5);

  shadow(ctx, 14);

  // Wagging tail (fast).
  ctx.save();
  ctx.translate(10, 12);
  ctx.rotate(wag * 0.4);
  ctx.translate(-10, -12);
  ctx.strokeStyle = "#8a5a2c"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(10, 12); ctx.quadraticCurveTo(18, 8, 16, -1); ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();

  // Body.
  ctx.save();
  ctx.translate(0, bob * 0.4);
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#b07e44"); bg.addColorStop(0.6, "#8a5a2c"); bg.addColorStop(1, "#5a3614");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.bezierCurveTo(-13, 12, -10, 20, 0, 20);
  ctx.bezierCurveTo(10, 20, 13, 12, 9, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#f0d8a8";
  ctx.beginPath(); ctx.ellipse(0, 13, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c89858";
  ctx.beginPath(); ctx.ellipse(-4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  // Head + floppy ears bob.
  ctx.save();
  ctx.translate(0, bob);

  ctx.fillStyle = "#6a4220";
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(side * 11, -10);
    ctx.rotate(side * earBounce);
    ctx.translate(-side * 11, 10);
    ctx.beginPath();
    ctx.ellipse(side * 11, -6, 4, 8, side * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  });

  const hg = ctx.createRadialGradient(-3, -10, 2, 0, -6, 14);
  hg.addColorStop(0, "#b88a50"); hg.addColorStop(1, "#8a5a2c");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#f0d8a8";
  ctx.beginPath(); ctx.ellipse(0, -1, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 1.2; ctx.stroke();

  cuteEye(ctx, -4, -8, 2.2, open); cuteEye(ctx, 4, -8, 2.2, open);

  ctx.fillStyle = "#2a1608";
  ctx.beginPath(); ctx.ellipse(0, -3, 2.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.arc(-0.8, -3.6, 0.7, 0, Math.PI * 2); ctx.fill();

  // Tongue — bounces.
  ctx.strokeStyle = "#3a1f0a"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 1.5); ctx.stroke();
  ctx.save();
  ctx.translate(0, 1.5);
  ctx.scale(1, tongue);
  ctx.translate(0, -1.5);
  ctx.fillStyle = "#f08a90";
  ctx.beginPath();
  ctx.moveTo(-2.4, 1.5);
  ctx.bezierCurveTo(-2.4, 5.5, 2.4, 5.5, 2.4, 1.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#c0606a"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 1.8); ctx.lineTo(0, 4.5); ctx.stroke();
  ctx.restore();

  blush(ctx, -7, -3, 2.4); blush(ctx, 7, -3, 2.4);
  ctx.restore();
}

function animRabbit(ctx: CanvasRenderingContext2D, t: number) {
  // Periodic hop: a short rise then settle, on a seamless loop.
  const hopCycle = 3.0;
  const hp = (t % hopCycle) / hopCycle;
  // Hop only in the first slice of the cycle.
  const arc = hp < 0.3 ? Math.sin(hp / 0.3 * Math.PI) : 0;
  const hop = -arc * 6;
  const squash = 1 - arc * 0.1;
  const earTwitch = ((t % 4.5) < 0.3) ? Math.sin((t % 4.5) / 0.3 * Math.PI) : 0;
  const nose = Math.sin(t * 6.0) * 0.5;
  const open = blinkOpen(t, 3.6, 1.0);

  shadow(ctx, 12 - arc * 2);

  ctx.save();
  ctx.translate(0, hop);

  // Long ears — twitch.
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(side * 5, -8);
    ctx.rotate(side * earTwitch * 0.18);
    ctx.translate(-side * 5, 8);
    ctx.fillStyle = "#fdf6ee";
    ctx.beginPath();
    ctx.ellipse(side * 5, -16, 3.4, 10, side * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c8b8a8"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = "#ffc0cc";
    ctx.beginPath();
    ctx.ellipse(side * 5, -16, 1.6, 7.5, side * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(11, 14, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d8cabb"; ctx.lineWidth = 1; ctx.stroke();

  ctx.save();
  ctx.scale(1 + (1 - squash) * 0.6, squash);
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.7, "#f4ece2"); bg.addColorStop(1, "#d8cabb");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.bezierCurveTo(-12, 12, -9, 20, 0, 20);
  ctx.bezierCurveTo(9, 20, 12, 12, 8, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#b8a898"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#fdf6ee";
  ctx.beginPath(); ctx.ellipse(-4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b8a898"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  const hg = ctx.createRadialGradient(-3, -8, 2, 0, -5, 13);
  hg.addColorStop(0, "#ffffff"); hg.addColorStop(1, "#ece2d4");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -5, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b8a898"; ctx.lineWidth = 2; ctx.stroke();

  cuteEye(ctx, -4, -6, 2.2, open); cuteEye(ctx, 4, -6, 2.2, open);

  // Nose wiggles side to side.
  ctx.save();
  ctx.translate(nose, 0);
  ctx.fillStyle = "#f08a98";
  ctx.beginPath(); ctx.moveTo(-1.4, -1); ctx.lineTo(1.4, -1); ctx.lineTo(0, 0.4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#b8a898"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(0, 0.4); ctx.lineTo(0, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(-2, 3, -3, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(2, 3, 3, 2); ctx.stroke();
  blush(ctx, -6, -2, 2.4); blush(ctx, 6, -2, 2.4);
  ctx.restore();
}

function animChick(ctx: CanvasRenderingContext2D, t: number) {
  const bob = Math.sin(t * 3.0) * 1.2;
  // Occasional peck-down motion.
  const peckCycle = 3.5;
  const pp = (t % peckCycle) / peckCycle;
  const peck = pp < 0.18 ? Math.sin(pp / 0.18 * Math.PI) * 4 : 0;
  const wing = Math.sin(t * 8.0) * 0.18;
  const fuzz = Math.sin(t * 7.0) * 0.6;
  const open = blinkOpen(t, 3.8, 0.4);

  shadow(ctx, 12);

  // Feet stay grounded.
  ctx.strokeStyle = "#f0a020"; ctx.lineWidth = 1.8;
  [-3, 3].forEach((fx) => {
    ctx.beginPath(); ctx.moveTo(fx, 18); ctx.lineTo(fx, 21); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx - 2, 22); ctx.lineTo(fx, 21); ctx.lineTo(fx + 2, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, 21); ctx.lineTo(fx, 22.5); ctx.stroke();
  });

  ctx.save();
  ctx.translate(0, bob + peck);

  const bg = ctx.createRadialGradient(-3, -2, 3, 0, 2, 18);
  bg.addColorStop(0, "#fff6b0"); bg.addColorStop(0.6, "#ffe04a"); bg.addColorStop(1, "#e8b020");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 2, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c88a14"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = 16 + Math.sin(a * 12 + fuzz) * 0.8;
    const x = Math.cos(a) * r; const y = 2 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.stroke();

  // Wing flutter.
  ctx.save();
  ctx.translate(9, 3);
  ctx.rotate(wing);
  ctx.translate(-9, -3);
  ctx.fillStyle = "#f8cc30";
  ctx.beginPath(); ctx.ellipse(9, 3, 4, 6, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c88a14"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();

  cuteEye(ctx, -4, -2, 2.4, open); cuteEye(ctx, 4, -2, 2.4, open);

  ctx.fillStyle = "#f0901a";
  ctx.beginPath(); ctx.moveTo(-2.4, 3); ctx.lineTo(2.4, 3); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#b86a10"; ctx.lineWidth = 0.8; ctx.stroke();
  blush(ctx, -8, 1, 2.6); blush(ctx, 8, 1, 2.6);

  // Top fuzz tuft flutters.
  ctx.strokeStyle = "#f8cc30"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  [-2, 0, 2].forEach((dx) => {
    ctx.beginPath(); ctx.moveTo(dx, -14); ctx.lineTo(dx * 1.6 + fuzz * 1.4, -19); ctx.stroke();
  });
  ctx.lineCap = "butt";
  ctx.restore();
}

function animDuckling(ctx: CanvasRenderingContext2D, t: number) {
  // Waddle: slight side-to-side tilt + horizontal shift, plus a bob.
  const waddle = Math.sin(t * 3.0);
  const tilt = waddle * 0.1;
  const shift = waddle * 1.6;
  const bob = Math.cos(t * 6.0) * 0.8;
  // Bill open/close occasionally.
  const billCycle = 4.0;
  const bp = (t % billCycle) / billCycle;
  const billOpen = bp < 0.16 ? Math.sin(bp / 0.16 * Math.PI) * 2.4 : 0;
  const open = blinkOpen(t, 3.7, 0.8);

  shadow(ctx, 13);

  ctx.save();
  ctx.translate(shift, bob);
  ctx.rotate(tilt);

  ctx.fillStyle = "#f0901a";
  [-4, 4].forEach((fx) => {
    ctx.beginPath();
    ctx.moveTo(fx - 3, 22); ctx.lineTo(fx, 18); ctx.lineTo(fx + 3, 22);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#b86a10"; ctx.lineWidth = 0.8; ctx.stroke();
  });

  const bg = ctx.createRadialGradient(-3, 2, 3, 0, 6, 18);
  bg.addColorStop(0, "#fff8c0"); bg.addColorStop(0.6, "#ffe66a"); bg.addColorStop(1, "#eec034");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, 6, 14, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#cc9a1e"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const rr = 1 + Math.sin(a * 11) * 0.06;
    const x = Math.cos(a) * 14 * rr; const y = 6 + Math.sin(a) * 13 * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = "#ffe66a";
  ctx.beginPath(); ctx.moveTo(12, 2); ctx.quadraticCurveTo(18, -2, 15, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#cc9a1e"; ctx.lineWidth = 1; ctx.stroke();

  const hg = ctx.createRadialGradient(-3, -8, 2, 0, -6, 12);
  hg.addColorStop(0, "#fff8c0"); hg.addColorStop(1, "#ffe04a");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(-3, -6, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#cc9a1e"; ctx.lineWidth = 1.8; ctx.stroke();

  // Flat bill — opens with a lower half dropping.
  ctx.fillStyle = "#f0901a";
  ctx.beginPath(); ctx.ellipse(-12, -4 - billOpen * 0.5, 5, 3, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b86a10"; ctx.lineWidth = 1.2; ctx.stroke();
  if (billOpen > 0.2) {
    ctx.fillStyle = "#f0901a";
    ctx.beginPath(); ctx.ellipse(-12, -4 + billOpen * 0.9, 4.4, 2.4, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#b86a10"; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.strokeStyle = "#b86a10"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-16, -4); ctx.lineTo(-9, -4); ctx.stroke();

  cuteEye(ctx, -4, -7, 2.2, open);
  blush(ctx, -7, -3, 2.4);
  ctx.restore();
}

function animLamb(ctx: CanvasRenderingContext2D, t: number) {
  const breath = Math.sin(t * 2.0) * 0.9;
  const sway = Math.sin(t * 1.2) * 1.4;
  const earFlick = ((t % 4.5) < 0.3) ? Math.sin((t % 4.5) / 0.3 * Math.PI) : 0;
  const open = blinkOpen(t, 4.0, 1.4);

  shadow(ctx, 15);

  // Legs stay planted.
  ctx.fillStyle = "#3a2c20";
  ctx.fillRect(-7, 16, 3, 6); ctx.fillRect(-1, 17, 3, 6); ctx.fillRect(5, 16, 3, 6);
  ctx.strokeStyle = "#1f160e"; ctx.lineWidth = 1;
  ctx.strokeRect(-7, 16, 3, 6); ctx.strokeRect(-1, 17, 3, 6); ctx.strokeRect(5, 16, 3, 6);

  // Body — gentle weight-shift sway + breathing.
  ctx.save();
  ctx.translate(sway, breath * 0.4);
  ctx.scale(1 + breath * 0.01, 1 + breath * 0.015);
  const bg = ctx.createRadialGradient(-3, 0, 3, 0, 4, 18);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.7, "#f2eee8"); bg.addColorStop(1, "#d8d0c4");
  ctx.fillStyle = bg;
  const bumps = 13; const cx = 0; const cy = 5; const br = 13;
  ctx.beginPath();
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    const r = br + 2.4;
    const x = cx + Math.cos(a) * r * 1.15; const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const pa = ((i - 0.5) / bumps) * Math.PI * 2;
      const px = cx + Math.cos(pa) * (r + 2.6) * 1.15; const py = cy + Math.sin(pa) * (r + 2.6);
      ctx.quadraticCurveTo(px, py, x, y);
    }
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#c0b6a8"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "rgba(180,168,152,0.6)"; ctx.lineWidth = 0.9;
  ([[-6, 2], [2, -2], [6, 4], [-2, 6], [-8, 8]] as const).forEach(([wx, wy]) => {
    ctx.beginPath(); ctx.arc(wx, wy, 2.2, 0.4, Math.PI * 1.6); ctx.stroke();
  });
  ctx.restore();

  // Head sways with the body.
  ctx.save();
  ctx.translate(sway * 0.7, breath * 0.5);
  ctx.fillStyle = "#f0e2cc";
  ctx.beginPath(); ctx.ellipse(-7, -8, 7, 7.5, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c8b89a"; ctx.lineWidth = 1.6; ctx.stroke();

  // Floppy ears — flick.
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(-7, -10);
    ctx.rotate(side * earFlick * 0.3);
    ctx.translate(7, 10);
    ctx.fillStyle = "#e0d0b8";
    ctx.beginPath();
    ctx.ellipse(-7 + side * 7, -10, 4, 2.4, side * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c8b89a"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  });

  ctx.fillStyle = "#ffffff";
  [-9, -6, -3].forEach((fx) => {
    ctx.beginPath(); ctx.arc(fx, -13, 2.6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.strokeStyle = "#d8d0c4"; ctx.lineWidth = 0.8;
  [-9, -6, -3].forEach((fx) => {
    ctx.beginPath(); ctx.arc(fx, -13, 2.6, 0, Math.PI * 2); ctx.stroke();
  });

  cuteEye(ctx, -9, -8, 2, open); cuteEye(ctx, -4, -8, 2, open);

  ctx.fillStyle = "#b089a0";
  ctx.beginPath(); ctx.ellipse(-7, -4, 2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  blush(ctx, -11, -5, 2.2); blush(ctx, -3, -5, 2.2);
  ctx.restore();
}

function animPiglet(ctx: CanvasRenderingContext2D, t: number) {
  const bob = Math.sin(t * 2.6) * 1.1;
  const tailWiggle = Math.sin(t * 5.0);
  const earFlop = Math.sin(t * 2.6 + 0.5) * 0.14;
  const snout = Math.sin(t * 7.0) * 0.5;
  const open = blinkOpen(t, 3.9, 0.2);

  shadow(ctx, 14);

  // Curly tail — wiggles.
  ctx.save();
  ctx.translate(11, 4);
  ctx.rotate(tailWiggle * 0.2);
  ctx.translate(-11, -4);
  ctx.strokeStyle = "#e08a98"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(11, 8); ctx.bezierCurveTo(17, 6, 14, 1, 18, 0 + tailWiggle * 0.8);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();

  ctx.save();
  ctx.translate(0, bob * 0.4);
  const bg = ctx.createRadialGradient(-3, 4, 3, 0, 10, 18);
  bg.addColorStop(0, "#ffd2da"); bg.addColorStop(0.6, "#f3a4b2"); bg.addColorStop(1, "#cc7888");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.bezierCurveTo(-13, 12, -10, 20, 0, 20);
  ctx.bezierCurveTo(10, 20, 13, 12, 9, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#b86878";
  ctx.beginPath(); ctx.ellipse(-4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 19, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(0, bob);
  const hg = ctx.createRadialGradient(-3, -10, 2, 0, -6, 13);
  hg.addColorStop(0, "#ffd2da"); hg.addColorStop(1, "#f0a0ae");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 2; ctx.stroke();

  // Big ears flop.
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(side * 7, -13);
    ctx.rotate(side * earFlop);
    ctx.translate(-side * 7, 13);
    ctx.fillStyle = "#f0a0ae";
    ctx.beginPath();
    ctx.moveTo(side * 6, -14);
    ctx.lineTo(side * 12, -18);
    ctx.lineTo(side * 10, -9);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  });

  // Snout twitches.
  ctx.save();
  ctx.translate(snout, 0);
  ctx.fillStyle = "#e889a0";
  ctx.beginPath(); ctx.ellipse(0, -1, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9a5060"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "#9a5060";
  ctx.beginPath(); ctx.ellipse(-2, -1, 0.9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(2, -1, 0.9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  cuteEye(ctx, -4, -8, 2.2, open); cuteEye(ctx, 4, -8, 2.2, open);
  blush(ctx, -7, -3, 2.6); blush(ctx, 7, -3, 2.6);
  ctx.restore();
}

function animGoatKid(ctx: CanvasRenderingContext2D, t: number) {
  const bob = Math.sin(t * 2.8) * 1.0;
  const headTilt = Math.sin(t * 1.5) * 0.12;
  const earFlick = ((t % 4.0) < 0.3) ? Math.sin((t % 4.0) / 0.3 * Math.PI) : 0;
  const tailFlick = Math.sin(t * 6.0) * 0.3;
  const open = blinkOpen(t, 3.8, 0.6);

  shadow(ctx, 14);

  ctx.fillStyle = "#9a6a3a";
  ctx.fillRect(-7, 16, 3, 6); ctx.fillRect(-1, 17, 3, 6); ctx.fillRect(5, 16, 3, 6);
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 1;
  ctx.strokeRect(-7, 16, 3, 6); ctx.strokeRect(-1, 17, 3, 6); ctx.strokeRect(5, 16, 3, 6);

  ctx.save();
  ctx.translate(0, bob * 0.4);
  const bg = ctx.createRadialGradient(-3, 0, 3, 0, 4, 18);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.7, "#f2ede4"); bg.addColorStop(1, "#d6ccbc");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(1, 6, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b8a890"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#a9743e";
  ctx.beginPath(); ctx.ellipse(7, 8, 6, 5, 0.2, 0, Math.PI * 2); ctx.fill();

  // Stubby tail flicks.
  ctx.save();
  ctx.translate(12, 1);
  ctx.rotate(tailFlick);
  ctx.translate(-12, -1);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.moveTo(12, 1); ctx.lineTo(17, -2); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#b8a890"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  ctx.restore();

  // Head — tilts.
  ctx.save();
  ctx.translate(0, bob);
  ctx.translate(-8, -6);
  ctx.rotate(headTilt);
  ctx.translate(8, 6);

  const hg = ctx.createRadialGradient(-9, -10, 2, -7, -6, 12);
  hg.addColorStop(0, "#c79360"); hg.addColorStop(1, "#9a6a3a");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(-8, -6, 8, 8, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = "#f4ece0";
  ctx.beginPath(); ctx.ellipse(-12, -2, 4, 3.4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = "#d8c4a0"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-10, -13); ctx.quadraticCurveTo(-12, -18, -9, -19); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -13); ctx.quadraticCurveTo(-5, -18, -2, -18); ctx.stroke();
  ctx.lineCap = "butt";

  // Ears — flick.
  ctx.save();
  ctx.translate(-15, -8);
  ctx.rotate(earFlick * 0.3);
  ctx.translate(15, 8);
  ctx.fillStyle = "#9a6a3a";
  ctx.beginPath(); ctx.ellipse(-15, -8, 4, 2.4, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(-15, -8, 4, 2.4, 0.4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(-1, -9);
  ctx.rotate(-earFlick * 0.3);
  ctx.translate(1, 9);
  ctx.fillStyle = "#9a6a3a";
  ctx.beginPath(); ctx.ellipse(-1, -9, 4, 2.4, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(-1, -9, 4, 2.4, -0.5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  cuteEye(ctx, -10, -6, 2, open); cuteEye(ctx, -5, -6, 2, open);

  ctx.fillStyle = "#5a3a24";
  ctx.beginPath(); ctx.ellipse(-12, -2, 1.6, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#f4ece0"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(-12, 5); ctx.stroke();
  ctx.lineCap = "butt";
  blush(ctx, -13, -4, 2.2);
  ctx.restore();
}

function animHedgehog(ctx: CanvasRenderingContext2D, t: number) {
  // Breathing — spikes rise and settle subtly.
  const breath = (Math.sin(t * 1.8) + 1) * 0.5; // 0..1
  const spikeRaise = breath * 1.2;
  const sniff = Math.sin(t * 9.0) * 0.6;
  const open = blinkOpen(t, 4.0, 0.3);

  shadow(ctx, 15);

  const spikeBase = "#6a4a2a"; const spikeTip = "#43301c";
  for (let layer = 0; layer < 2; layer++) {
    const rad = 15 - layer * 4;
    const yoff = -layer * 2;
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const bx = Math.cos(a) * rad; const by = 4 + yoff + Math.sin(a) * rad;
      // Tip extends with the breath.
      const tipLen = 6 + spikeRaise;
      const tx = Math.cos(a) * (rad + tipLen); const ty = 4 + yoff + Math.sin(a) * (rad + tipLen);
      const perp = a + Math.PI / 2;
      ctx.fillStyle = i % 2 === 0 ? spikeBase : spikeTip;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(perp) * 2.4, by + Math.sin(perp) * 2.4);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx - Math.cos(perp) * 2.4, by - Math.sin(perp) * 2.4);
      ctx.closePath(); ctx.fill();
    }
  }

  const bg = ctx.createRadialGradient(-3, 0, 3, 0, 4, 16);
  bg.addColorStop(0, "#7a5836"); bg.addColorStop(0.7, "#5a3e22"); bg.addColorStop(1, "#3a2614");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-15, 6);
  ctx.bezierCurveTo(-15, -8, 15, -8, 15, 6);
  ctx.bezierCurveTo(12, 14, -12, 14, -15, 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2a1c0e"; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = "#e8c89a";
  ctx.beginPath(); ctx.ellipse(0, 11, 8, 4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#e8c89a";
  ctx.beginPath(); ctx.ellipse(-12, 4, 7, 6, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b89868"; ctx.lineWidth = 1.4; ctx.stroke();

  // Snout sniffs (twitches left/right).
  ctx.save();
  ctx.translate(sniff, 0);
  ctx.fillStyle = "#d8b888";
  ctx.beginPath(); ctx.ellipse(-18, 5, 3, 2.4, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b89868"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#3a2414";
  ctx.beginPath(); ctx.arc(-20.5, 4.5, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.arc(-21, 4, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#c8a878";
  ctx.beginPath(); ctx.arc(-9, -1, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b89868"; ctx.lineWidth = 1; ctx.stroke();

  cuteEye(ctx, -13, 3, 2, open); cuteEye(ctx, -9, 4, 1.8, open);

  ctx.fillStyle = "#d8b888";
  ctx.beginPath(); ctx.ellipse(-4, 13, 2.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 13, 2.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  blush(ctx, -15, 6, 2.2);
}

function animFrog(ctx: CanvasRenderingContext2D, t: number) {
  // Periodic throat puff/breathe.
  const puffCycle = 2.6;
  const pp = (t % puffCycle) / puffCycle;
  const puff = pp < 0.5 ? Math.sin(pp / 0.5 * Math.PI) : 0;
  // Occasional tiny hop crouch (squash down then settle).
  const crouchCycle = 5.0;
  const cp = (t % crouchCycle) / crouchCycle;
  const crouch = cp < 0.2 ? Math.sin(cp / 0.2 * Math.PI) : 0;
  const squashY = 1 - crouch * 0.12;
  const open = blinkOpen(t, 3.5, 1.2);

  shadow(ctx, 16 + crouch * 1.5);

  ctx.save();
  ctx.translate(0, crouch * 2);
  ctx.scale(1 + crouch * 0.06, squashY);

  ctx.fillStyle = "#5fa838";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 11, 16);
    ctx.lineTo(side * 19, 20);
    ctx.lineTo(side * 17, 22);
    ctx.lineTo(side * 11, 19);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#2e5a18"; ctx.lineWidth = 1.2; ctx.stroke();
  });

  const bg = ctx.createRadialGradient(-3, 2, 3, 0, 6, 18);
  bg.addColorStop(0, "#9fd85a"); bg.addColorStop(0.6, "#6cb83a"); bg.addColorStop(1, "#3f8420");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, 8, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#27531a"; ctx.lineWidth = 2; ctx.stroke();

  // Pale belly — puffs out as the throat breathes.
  ctx.fillStyle = "#e4f0b0";
  ctx.beginPath(); ctx.ellipse(0, 13 + puff * 0.6, 9 + puff * 1.2, 6 + puff * 1.4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#6cb83a";
  [-5, 5].forEach((fx) => {
    ctx.beginPath(); ctx.ellipse(fx, 18, 3.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2e5a18"; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = "#2e5a18"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(fx - 1.5, 19.5); ctx.lineTo(fx - 1.5, 17.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx + 1.5, 19.5); ctx.lineTo(fx + 1.5, 17.5); ctx.stroke();
  });

  // Big bulging eyes — blink with eyelids dropping.
  [-7, 7].forEach((ex) => {
    ctx.fillStyle = "#7cc245";
    ctx.beginPath(); ctx.arc(ex, -8, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#27531a"; ctx.lineWidth = 1.6; ctx.stroke();
    if (open < 0.16) {
      // Closed lid.
      ctx.fillStyle = "#5fa838";
      ctx.beginPath(); ctx.arc(ex, -8, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#27531a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex - 4.5, -8); ctx.lineTo(ex + 4.5, -8); ctx.stroke();
      return;
    }
    ctx.fillStyle = "#fffce0";
    ctx.beginPath(); ctx.arc(ex, -8, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1208";
    ctx.beginPath(); ctx.ellipse(ex, -7, 2.2, 2.2 * open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(ex - 1, -8.4, 1, 0, Math.PI * 2); ctx.fill();
  });

  ctx.fillStyle = "#2e5a18";
  ctx.beginPath(); ctx.arc(-2, 0, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, 0, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#27531a"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, 4, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.lineCap = "butt";
  blush(ctx, -9, 6, 2.6); blush(ctx, 9, 6, 2.6);
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  pet_cat: animCat,
  pet_dog: animDog,
  pet_rabbit: animRabbit,
  pet_chick: animChick,
  pet_duckling: animDuckling,
  pet_lamb: animLamb,
  pet_piglet: animPiglet,
  pet_goat_kid: animGoatKid,
  pet_hedgehog: animHedgehog,
  pet_frog: animFrog,
};
