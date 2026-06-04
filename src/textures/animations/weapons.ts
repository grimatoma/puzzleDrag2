// Fantasy weapons & armor — animated variants.
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds). The caller
// clears, translates to center, scales, sets lineCap/lineJoin="round", and
// calls us; we only draw at origin (0,0) within a ~-24..+24 box. Everything is
// deterministic in `t` (no Math.random) and loops seamlessly (modulo / sin).
//
// Self-contained: no imports. Shapes/colors mirror
// src/textures/categories/weapons.ts so identity reads the same — just alive:
// specular glints sweep across steel (clipped), gems glow/pulse, sparkles ping,
// bow/crossbow strings vibrate.

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Soft drop shadow — mirrors weapons.ts `shadow`.
function shadow(ctx: CanvasRenderingContext2D, w: number, y?: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, y ?? 22, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Four-pointed sparkle star with alpha. Bright pinpoint of light.
function sparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
  color = "255,255,255",
): void {
  if (r <= 0 || alpha <= 0) return;
  ctx.fillStyle = `rgba(${color},${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.closePath();
  ctx.fill();
}

// A bright specular band swept across the current clip region. `phase` in
// [0,1) loops the band along the given axis (angle, radians). Call AFTER
// clipping to the metal shape so the streak stays contained. `len` is the
// half-travel distance; the band is drawn perpendicular to its travel.
function glintSweep(
  ctx: CanvasRenderingContext2D,
  phase: number,
  intensity: number,
  angle: number,
  travel: number,
  width = 6,
): void {
  const d = -travel + phase * travel * 2;
  ctx.save();
  ctx.rotate(angle);
  ctx.translate(d, 0);
  const grad = ctx.createLinearGradient(-width, 0, width, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, `rgba(255,255,255,${intensity})`);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-width, -60, width * 2, 120);
  ctx.restore();
}

// Twinkle alpha: peaks once per `period` seconds, offset by `off` (cycle
// fraction). Bright briefly, dim most of the cycle. Loops seamlessly.
function twinkle(t: number, period: number, off: number): number {
  const ph = (((t / period + off) % 1) + 1) % 1;
  const s = Math.sin(ph * Math.PI);
  return s * s * s;
}

// Smooth 0..1 breathing wave.
function breathe(t: number, period: number, off = 0): number {
  return 0.5 + 0.5 * Math.sin((t / period + off) * Math.PI * 2);
}

// Sweep phase that loops 0..1 with a quiet pause between passes: the glint
// streaks quickly, then waits. `period` total seconds, `sweep` fraction active.
function sweepPhase(t: number, period: number, sweep = 0.45): number {
  const c = (((t / period) % 1) + 1) % 1;
  if (c > sweep) return 1.1; // parked off-shape during the pause
  return c / sweep;
}

// ---------------------------------------------------------------------------
// 1. weapon_sword — specular glint sweeps down the blade; sparkle at the tip.
// ---------------------------------------------------------------------------
function animSword(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 12);
  ctx.save();
  ctx.rotate(0.18);

  // Blade
  const blade = ctx.createLinearGradient(-5, 0, 5, 0);
  blade.addColorStop(0, "#5a5a62");
  blade.addColorStop(0.42, "#d8d8e0");
  blade.addColorStop(0.5, "#ffffff");
  blade.addColorStop(0.58, "#c0c0c8");
  blade.addColorStop(1, "#3a3a40");
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(4, -16);
  ctx.lineTo(4, 6);
  ctx.lineTo(-4, 6);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Glint clipped to the blade — sweeps vertically down the steel.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(4, -16);
  ctx.lineTo(4, 6);
  ctx.lineTo(-4, 6);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.clip();
  const ph = sweepPhase(t, 2.6);
  // Travel along the blade axis (vertical): map phase 0..1 to y -26..+8.
  if (ph <= 1) {
    const y = -26 + ph * 34;
    const g = ctx.createLinearGradient(0, y - 8, 0, y + 8);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-5, y - 8, 10, 16);
  }
  ctx.restore();

  // Fuller highlight
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 4);
  ctx.stroke();

  // Crossguard
  const guard = ctx.createLinearGradient(-14, 0, 14, 0);
  guard.addColorStop(0, "#a85410");
  guard.addColorStop(0.5, "#ffd34c");
  guard.addColorStop(1, "#7a4810");
  ctx.fillStyle = guard;
  ctx.beginPath();
  ctx.moveTo(-14, 7);
  ctx.lineTo(14, 7);
  ctx.lineTo(11, 11);
  ctx.lineTo(-11, 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(-12, 7.5, 24, 1.2);

  // Grip
  const grip = ctx.createLinearGradient(-3, 0, 3, 0);
  grip.addColorStop(0, "#3a2008");
  grip.addColorStop(0.5, "#7a4a18");
  grip.addColorStop(1, "#2a1408");
  ctx.fillStyle = grip;
  ctx.fillRect(-3, 11, 6, 11);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-3, 11, 6, 11);
  ctx.strokeStyle = "rgba(20,14,4,0.7)";
  ctx.lineWidth = 0.8;
  for (let y = 13; y < 22; y += 2.2) {
    ctx.beginPath();
    ctx.moveTo(-3, y);
    ctx.lineTo(3, y + 1.2);
    ctx.stroke();
  }

  // Pommel
  const pom = ctx.createRadialGradient(-1.5, 22, 0.5, 0, 23, 5);
  pom.addColorStop(0, "#fff0b0");
  pom.addColorStop(0.5, "#ffd34c");
  pom.addColorStop(1, "#7a4810");
  ctx.fillStyle = pom;
  ctx.beginPath();
  ctx.arc(0, 23.5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Sparkle ping at the tip, synced to glint reaching the top.
  const tw = twinkle(t, 2.6, 0.0);
  sparkle(ctx, 0, -24, 1.4 + tw * 3.5, tw);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. weapon_shield — emblem glows/pulses; glint sweeps the metal; sparkle.
// ---------------------------------------------------------------------------
function animShield(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 16);

  const shapePath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(-16, -18);
    c.lineTo(16, -18);
    c.lineTo(16, -2);
    c.bezierCurveTo(16, 12, 8, 20, 0, 24);
    c.bezierCurveTo(-8, 20, -16, 12, -16, -2);
    c.closePath();
  };

  // Body
  const body = ctx.createLinearGradient(0, -20, 0, 22);
  body.addColorStop(0, "#7a8a9a");
  body.addColorStop(0.5, "#48586a");
  body.addColorStop(1, "#28323e");
  ctx.fillStyle = body;
  shapePath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#15202a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner field
  ctx.save();
  shapePath(ctx);
  ctx.clip();
  ctx.fillStyle = "#b83838";
  ctx.beginPath();
  ctx.moveTo(-16, -18);
  ctx.lineTo(16, -18);
  ctx.lineTo(16, 0);
  ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fill();

  // Emblem glow — pulses behind the star.
  const pulse = breathe(t, 1.7);
  const glowR = 7 + pulse * 4;
  const glow = ctx.createRadialGradient(0, -4, 1, 0, -4, glowR);
  glow.addColorStop(0, `rgba(255,238,150,${0.55 + pulse * 0.4})`);
  glow.addColorStop(0.6, `rgba(255,211,76,${0.25 * (0.5 + pulse * 0.5)})`);
  glow.addColorStop(1, "rgba(255,211,76,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -4, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Star emblem (gold) — brightens slightly with the pulse.
  const gold = pulse > 0.5 ? "#ffe27a" : "#ffd34c";
  ctx.fillStyle = gold;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 8 : 3.4;
    const x = Math.cos(a) * r;
    const y = -4 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a4810";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Glint sweeps the whole metal face (clipped to the shield body).
  const ph = sweepPhase(t, 3.4);
  if (ph <= 1) glintSweep(ctx, ph, 0.6, -Math.PI / 4, 30, 6);
  ctx.restore();

  // Studs
  ctx.fillStyle = "#d8d8e0";
  const studs: Array<[number, number]> = [[-13, -15], [13, -15], [-14, 0], [14, 0], [-8, 14], [8, 14], [0, 21]];
  studs.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#15202a";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });

  // Edge highlight
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-14, -16);
  ctx.lineTo(14, -16);
  ctx.stroke();

  // Sparkle on a top point of the star, in sync with the pulse peak.
  const tw = twinkle(t, 1.7, 0.0);
  sparkle(ctx, 0, -12, 1 + tw * 3, tw, "255,247,200");
}

// ---------------------------------------------------------------------------
// 3. weapon_bow — bowstring vibrates (twang); nocked arrow nudges subtly.
// ---------------------------------------------------------------------------
function animBow(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 12);
  ctx.save();
  ctx.rotate(0.12);

  // Twang loop: a quick decaying vibration, repeating every ~2.4s.
  const period = 2.4;
  const cyc = (((t / period) % 1) + 1) % 1;
  const env = Math.exp(-cyc * 7); // decays after the pluck
  const vib = Math.sin(cyc * period * 38) * env; // -1..1
  const stringX = vib * 2.4; // lateral wobble of the string apex
  const arrowNudge = -vib * 1.4; // arrow rides the string back a touch

  // Wooden longbow limb
  const wood = ctx.createLinearGradient(-12, 0, -2, 0);
  wood.addColorStop(0, "#3a2008");
  wood.addColorStop(0.5, "#a87838");
  wood.addColorStop(1, "#5a3414");
  ctx.strokeStyle = wood;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.bezierCurveTo(-16, -12, -16, 12, -2, 22);
  ctx.stroke();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.bezierCurveTo(-16, -12, -16, 12, -2, 22);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,230,180,0.5)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-3, -19);
  ctx.bezierCurveTo(-14, -10, -14, 10, -3, 19);
  ctx.stroke();

  // Bowstring — apex wobbles laterally (the twang).
  ctx.strokeStyle = "rgba(240,240,230,0.9)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.quadraticCurveTo(8 + stringX, 0, -2, 22);
  ctx.stroke();

  const apexX = 8 + stringX * 0.5;

  // Nocked arrow — shaft (back end nudges with the string).
  const shaft = ctx.createLinearGradient(0, -2, 0, 2);
  shaft.addColorStop(0, "#c89858");
  shaft.addColorStop(1, "#7a4a18");
  ctx.strokeStyle = shaft;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(apexX, 0);
  ctx.lineTo(-20 + arrowNudge, 0);
  ctx.stroke();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(apexX, 0);
  ctx.lineTo(-20 + arrowNudge, 0);
  ctx.stroke();

  // Arrowhead
  ctx.fillStyle = "#d8d8e0";
  ctx.beginPath();
  ctx.moveTo(-26 + arrowNudge, 0);
  ctx.lineTo(-18 + arrowNudge, -3.5);
  ctx.lineTo(-18 + arrowNudge, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Fletching at nock
  ctx.fillStyle = "#b83838";
  ctx.beginPath();
  ctx.moveTo(apexX, 0);
  ctx.lineTo(apexX + 6, -4);
  ctx.lineTo(apexX + 3, 0);
  ctx.lineTo(apexX + 6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a1414";
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. weapon_axe — glint sweeps the axe head (clipped); sparkle on the edge.
// ---------------------------------------------------------------------------
function animAxe(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 14);
  ctx.save();
  ctx.rotate(0.16);

  // Haft
  const haft = ctx.createLinearGradient(-3, 0, 3, 0);
  haft.addColorStop(0, "#3a2008");
  haft.addColorStop(0.5, "#a87838");
  haft.addColorStop(1, "#2a1408");
  ctx.fillStyle = haft;
  ctx.fillRect(-3, -16, 5, 40);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-3, -16, 5, 40);

  const steel = ctx.createLinearGradient(-18, 0, 12, 0);
  steel.addColorStop(0, "#3a3a40");
  steel.addColorStop(0.5, "#e0e0e8");
  steel.addColorStop(0.55, "#ffffff");
  steel.addColorStop(1, "#5a5a62");

  // Main bearded bit
  const mainPath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(-1, -16);
    c.lineTo(-18, -12);
    c.bezierCurveTo(-22, -4, -22, 4, -16, 10);
    c.lineTo(-1, 4);
    c.closePath();
  };
  ctx.fillStyle = steel;
  mainPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Back bit
  const backPath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(1, -14);
    c.lineTo(11, -10);
    c.bezierCurveTo(13, -4, 13, 2, 9, 6);
    c.lineTo(1, 2);
    c.closePath();
  };
  ctx.fillStyle = steel;
  backPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Glint sweeps across both head pieces (clipped to them).
  ctx.save();
  mainPath(ctx);
  backPath(ctx);
  ctx.clip();
  const ph = sweepPhase(t, 3.0);
  if (ph <= 1) glintSweep(ctx, ph, 0.7, -Math.PI / 3, 24, 5);
  ctx.restore();

  // Edge highlight on main blade
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-17, -10);
  ctx.bezierCurveTo(-20, -3, -20, 3, -15, 8);
  ctx.stroke();

  // Steel collar
  ctx.fillStyle = "#7a7a82";
  ctx.fillRect(-3.5, -8, 6, 5);
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-3.5, -8, 6, 5);

  // Sparkle on the cutting edge, timed to the glint pass.
  const tw = twinkle(t, 3.0, 0.15);
  sparkle(ctx, -20, -1, 1 + tw * 3.2, tw);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. weapon_staff — gem glows/pulses (breathing radial glow) + orbiting sparks.
// ---------------------------------------------------------------------------
function animStaff(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 10);
  ctx.save();
  ctx.rotate(0.14);

  // Shaft
  const shaft = ctx.createLinearGradient(-3, 0, 3, 0);
  shaft.addColorStop(0, "#3a2408");
  shaft.addColorStop(0.5, "#9a6e30");
  shaft.addColorStop(1, "#2a1808");
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(-2.5, -10);
  ctx.bezierCurveTo(-4, 4, -2, 16, -3, 24);
  ctx.lineTo(2, 24);
  ctx.bezierCurveTo(2, 14, 3, 2, 2.5, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,220,160,0.4)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-1, -6);
  ctx.bezierCurveTo(-1, 6, 0, 14, -1, 22);
  ctx.stroke();

  // Claw setting
  ctx.fillStyle = "#7a5018";
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.lineTo(6, -10);
  ctx.lineTo(4, -16);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Breathing radial glow behind gem.
  const pulse = breathe(t, 1.6);
  const glowR = 14 + pulse * 6;
  const glow = ctx.createRadialGradient(0, -20, 1, 0, -20, glowR);
  glow.addColorStop(0, `rgba(140,230,255,${0.5 + pulse * 0.4})`);
  glow.addColorStop(0.5, `rgba(80,160,255,${0.18 + pulse * 0.18})`);
  glow.addColorStop(1, "rgba(80,160,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -20, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Gem
  const gem = ctx.createRadialGradient(-2, -22, 0.5, 0, -20, 8);
  gem.addColorStop(0, "#ffffff");
  gem.addColorStop(0.4, "#a8e8ff");
  gem.addColorStop(0.8, "#3a8aff");
  gem.addColorStop(1, "#1838a8");
  ctx.fillStyle = gem;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(6, -20);
  ctx.lineTo(0, -12);
  ctx.lineTo(-6, -20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1838a8";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Facet highlight, brightening with the pulse.
  ctx.fillStyle = `rgba(255,255,255,${0.65 + pulse * 0.35})`;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(3, -21);
  ctx.lineTo(0, -18);
  ctx.lineTo(-3, -21);
  ctx.closePath();
  ctx.fill();

  // Orbiting magic sparks around the gem.
  const sparks = 3;
  for (let i = 0; i < sparks; i++) {
    const a = (t / 1.4) * Math.PI * 2 + (i / sparks) * Math.PI * 2;
    const rx = 11;
    const ry = 8;
    const sx = Math.cos(a) * rx;
    const sy = -20 + Math.sin(a) * ry;
    // Fade out as the spark passes "behind" (sin of phase) for depth.
    const depth = 0.55 + 0.45 * Math.sin(a + Math.PI / 2);
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 5 + i * 2));
    sparkle(ctx, sx, sy, 1.4 * depth + tw * 1.2, depth * (0.4 + tw * 0.5), "180,235,255");
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. weapon_dagger — quick glint sweep down the blade; jewel sparkle.
// ---------------------------------------------------------------------------
function animDagger(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 9);
  ctx.save();
  ctx.rotate(0.2);

  const bladePath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(0, -22);
    c.lineTo(3.5, -14);
    c.lineTo(3, 6);
    c.lineTo(-3, 6);
    c.lineTo(-3.5, -14);
    c.closePath();
  };

  const blade = ctx.createLinearGradient(-4, 0, 4, 0);
  blade.addColorStop(0, "#5a5a62");
  blade.addColorStop(0.45, "#d8d8e0");
  blade.addColorStop(0.5, "#ffffff");
  blade.addColorStop(0.6, "#c0c0c8");
  blade.addColorStop(1, "#3a3a40");
  ctx.fillStyle = blade;
  bladePath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Glint clipped to blade, sweeping down quickly.
  ctx.save();
  bladePath(ctx);
  ctx.clip();
  const ph = sweepPhase(t, 2.2, 0.32);
  if (ph <= 1) {
    const y = -24 + ph * 32;
    const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-4, y - 6, 8, 12);
  }
  ctx.restore();

  // Center ridge
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, 4);
  ctx.stroke();

  // Crossguard
  const guard = ctx.createLinearGradient(-9, 0, 9, 0);
  guard.addColorStop(0, "#a85410");
  guard.addColorStop(0.5, "#ffd34c");
  guard.addColorStop(1, "#7a4810");
  ctx.fillStyle = guard;
  ctx.beginPath();
  ctx.moveTo(-9, 6);
  ctx.lineTo(9, 6);
  ctx.lineTo(7, 10);
  ctx.lineTo(-7, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Grip
  ctx.fillStyle = "#5a2818";
  ctx.fillRect(-2.5, 10, 5, 9);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-2.5, 10, 5, 9);

  // Jeweled pommel
  ctx.fillStyle = "#ffd34c";
  ctx.beginPath();
  ctx.arc(0, 20, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4810";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  const jewel = ctx.createRadialGradient(-1, 19, 0.4, 0, 20, 3);
  jewel.addColorStop(0, "#ff9090");
  jewel.addColorStop(0.5, "#e02828");
  jewel.addColorStop(1, "#7a0808");
  ctx.fillStyle = jewel;
  ctx.beginPath();
  ctx.arc(0, 20, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Jewel sparkle — twinkles on its own loop.
  const tw = twinkle(t, 2.2, 0.5);
  ctx.fillStyle = `rgba(255,255,255,${0.55 + tw * 0.45})`;
  ctx.beginPath();
  ctx.arc(-0.8, 19, 0.8, 0, Math.PI * 2);
  ctx.fill();
  sparkle(ctx, 0, 20, 1 + tw * 3, tw, "255,200,200");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. weapon_spear — glint sweep along the steel tip; sparkle.
// ---------------------------------------------------------------------------
function animSpear(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 10);
  ctx.save();
  ctx.rotate(0.32);

  // Shaft
  const shaft = ctx.createLinearGradient(-2, 0, 2, 0);
  shaft.addColorStop(0, "#3a2008");
  shaft.addColorStop(0.5, "#a87838");
  shaft.addColorStop(1, "#2a1408");
  ctx.fillStyle = shaft;
  ctx.fillRect(-2, -10, 4, 36);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-2, -10, 4, 36);

  // Binding wraps
  ctx.strokeStyle = "#5a3814";
  ctx.lineWidth = 1.4;
  for (let y = -8; y < 0; y += 2.4) {
    ctx.beginPath();
    ctx.moveTo(-2.5, y);
    ctx.lineTo(2.5, y + 1);
    ctx.stroke();
  }

  // Leaf-shaped steel tip
  const tipPath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(0, -28);
    c.bezierCurveTo(5, -22, 5, -14, 2, -8);
    c.lineTo(-2, -8);
    c.bezierCurveTo(-5, -14, -5, -22, 0, -28);
    c.closePath();
  };
  const tip = ctx.createLinearGradient(-5, 0, 5, 0);
  tip.addColorStop(0, "#5a5a62");
  tip.addColorStop(0.45, "#dcdce4");
  tip.addColorStop(0.5, "#ffffff");
  tip.addColorStop(0.6, "#bcbcc4");
  tip.addColorStop(1, "#3a3a40");
  ctx.fillStyle = tip;
  tipPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Glint clipped to the tip, sweeping up the steel.
  ctx.save();
  tipPath(ctx);
  ctx.clip();
  const ph = sweepPhase(t, 2.8, 0.4);
  if (ph <= 1) {
    const y = -6 - ph * 24; // travels from base up to point
    const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-5, y - 6, 10, 12);
  }
  ctx.restore();

  // Midrib highlight
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(0, -10);
  ctx.stroke();

  // Sparkle at the point.
  const tw = twinkle(t, 2.8, 0.6);
  sparkle(ctx, 0, -28, 1 + tw * 3, tw);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 8. weapon_mace — slow glint over the spiked head; sparkle on a spike.
// ---------------------------------------------------------------------------
function animMace(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 12);
  ctx.save();
  ctx.rotate(0.16);

  // Handle
  const handle = ctx.createLinearGradient(-3, 0, 3, 0);
  handle.addColorStop(0, "#3a2008");
  handle.addColorStop(0.5, "#8a6028");
  handle.addColorStop(1, "#2a1408");
  ctx.fillStyle = handle;
  ctx.fillRect(-3, -2, 5, 26);
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-3, -2, 5, 26);

  // Pommel
  ctx.fillStyle = "#7a7a82";
  ctx.beginPath();
  ctx.arc(-0.5, 24, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.0;
  ctx.stroke();

  const cx = 0;
  const cy = -10;

  // Flanges (spikes)
  ctx.fillStyle = "#5a5a62";
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.2;
  const spikes = 8;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const bx = cx + Math.cos(a) * 6;
    const by = cy + Math.sin(a) * 6;
    const tx = cx + Math.cos(a) * 13;
    const ty = cy + Math.sin(a) * 13;
    const perp = a + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(perp) * 3, by + Math.sin(perp) * 3);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx - Math.cos(perp) * 3, by - Math.sin(perp) * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Central head ball
  const head = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 9);
  head.addColorStop(0, "#ffffff");
  head.addColorStop(0.4, "#c0c0c8");
  head.addColorStop(0.7, "#7a7a82");
  head.addColorStop(1, "#2a2a30");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Slow glint over the head ball (clipped to the ball).
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
  ctx.clip();
  const ph = sweepPhase(t, 4.0, 0.5);
  if (ph <= 1) {
    ctx.save();
    ctx.translate(cx, cy);
    glintSweep(ctx, ph, 0.65, -Math.PI / 4, 11, 4);
    ctx.restore();
  }
  ctx.restore();

  // Specular dot
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(cx - 2.5, cy - 2.5, 2, 0, Math.PI * 2);
  ctx.fill();

  // Sparkle on the upper-right spike tip.
  const a = -Math.PI / 4; // i=7 direction roughly upper-right; pick a fixed nice spike
  const tx = cx + Math.cos(a) * 13;
  const ty = cy + Math.sin(a) * 13;
  const tw = twinkle(t, 4.0, 0.55);
  sparkle(ctx, tx, ty, 1 + tw * 3, tw);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 9. weapon_helmet — glint sweeps the metal; plume flutters gently.
// ---------------------------------------------------------------------------
function animHelmet(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 15);

  // Plume flutter — gentle wave on the tip control points.
  const f = Math.sin(t * 2.2) * 1.6;
  const f2 = Math.sin(t * 2.2 + 0.8) * 1.2;
  ctx.fillStyle = "#b83838";
  ctx.beginPath();
  ctx.moveTo(2, -16);
  ctx.bezierCurveTo(8 + f, -28 + f2, 16 + f, -26 + f2, 14 + f * 0.5, -14);
  ctx.bezierCurveTo(12, -10, 6, -10, 2, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a1414";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(4, -16);
  ctx.bezierCurveTo(8 + f, -24 + f2, 13 + f, -23 + f2, 12 + f * 0.5, -16);
  ctx.closePath();
  ctx.fill();

  // Great helm body
  const bodyPath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(-14, -2);
    c.bezierCurveTo(-14, -20, 14, -20, 14, -2);
    c.lineTo(14, 12);
    c.bezierCurveTo(14, 18, -14, 18, -14, 12);
    c.closePath();
  };
  const body = ctx.createLinearGradient(-14, 0, 14, 0);
  body.addColorStop(0, "#3a3a40");
  body.addColorStop(0.45, "#d0d0d8");
  body.addColorStop(0.55, "#ffffff");
  body.addColorStop(1, "#48484f");
  ctx.fillStyle = body;
  bodyPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Glint sweeps the metal (clipped to the helm body).
  ctx.save();
  bodyPath(ctx);
  ctx.clip();
  const ph = sweepPhase(t, 3.6);
  if (ph <= 1) glintSweep(ctx, ph, 0.55, -Math.PI / 4, 24, 5);
  ctx.restore();

  // Brow band
  ctx.strokeStyle = "#7a7a82";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.lineTo(13, -2);
  ctx.stroke();

  // Visor slit
  ctx.fillStyle = "#0a0a0e";
  ctx.fillRect(-10, 1, 20, 2.6);
  ctx.fillRect(-1.4, 1, 2.8, 12);

  // Rivets
  ctx.fillStyle = "#9a9aa2";
  ([[-11, -6], [11, -6], [-11, 8], [11, 8]] as Array<[number, number]>).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1e";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });

  // Highlight streak
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-7, -6, 2.4, 7, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 10. weapon_crossbow — string vibrates on a loop; glint on the steel limbs.
// ---------------------------------------------------------------------------
function animCrossbow(ctx: CanvasRenderingContext2D, t: number): void {
  shadow(ctx, 16);
  ctx.save();
  ctx.rotate(-0.1);

  // String twang loop.
  const period = 2.6;
  const cyc = (((t / period) % 1) + 1) % 1;
  const env = Math.exp(-cyc * 7);
  const vib = Math.sin(cyc * period * 36) * env;
  const stringX = vib * 2.0;

  // Wooden stock
  const stock = ctx.createLinearGradient(0, -4, 0, 8);
  stock.addColorStop(0, "#a87838");
  stock.addColorStop(0.5, "#7a4a18");
  stock.addColorStop(1, "#3a2008");
  ctx.fillStyle = stock;
  ctx.beginPath();
  ctx.moveTo(-18, -3);
  ctx.lineTo(8, -3);
  ctx.lineTo(8, 3);
  ctx.lineTo(-12, 5);
  ctx.lineTo(-18, 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Steel limbs (bow)
  const limbPath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(8, -16);
    c.quadraticCurveTo(14, 0, 8, 16);
  };
  const limb = ctx.createLinearGradient(0, -16, 0, 16);
  limb.addColorStop(0, "#5a5a62");
  limb.addColorStop(0.5, "#e0e0e8");
  limb.addColorStop(1, "#3a3a40");
  ctx.strokeStyle = limb;
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  limbPath(ctx);
  ctx.stroke();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 0.9;
  limbPath(ctx);
  ctx.stroke();

  // Glint travelling along the steel limbs (clipped to a stroked band region).
  ctx.save();
  ctx.lineWidth = 4.2;
  ctx.strokeStyle = "#000";
  limbPath(ctx);
  ctx.clip();
  const ph = sweepPhase(t, 3.2, 0.5);
  if (ph <= 1) {
    const y = -16 + ph * 32;
    const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(4, y - 6, 14, 12);
  }
  ctx.restore();

  // Bowstring — apex wobbles with the twang.
  ctx.strokeStyle = "rgba(240,240,230,0.9)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(8, -16);
  ctx.lineTo(0 - stringX, 0);
  ctx.lineTo(8, 16);
  ctx.stroke();

  // Loaded bolt
  ctx.strokeStyle = "#c89858";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(20, 0);
  ctx.stroke();

  // Bolt head
  ctx.fillStyle = "#d8d8e0";
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(19, -3);
  ctx.lineTo(19, 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Trigger / grip
  ctx.fillStyle = "#5a3414";
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-6, 14);
  ctx.lineTo(-12, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Stock highlight
  ctx.fillStyle = "rgba(255,230,180,0.4)";
  ctx.fillRect(-16, -2.4, 22, 1.2);

  // Trigger detail
  ctx.fillStyle = "#7a7a82";
  ctx.beginPath();
  ctx.arc(-7, 6, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  weapon_sword: animSword,
  weapon_shield: animShield,
  weapon_bow: animBow,
  weapon_axe: animAxe,
  weapon_staff: animStaff,
  weapon_dagger: animDagger,
  weapon_spear: animSpear,
  weapon_mace: animMace,
  weapon_helmet: animHelmet,
  weapon_crossbow: animCrossbow,
};
