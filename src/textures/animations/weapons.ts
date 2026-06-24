// Fantasy weapons & armor — animated variants (idle rebuild).
//
// Each fn redraws the WHOLE icon at time `t` (elapsed seconds). The caller
// clears, translates to centre, scales (design box = 64u, content ≈ -24..+24),
// sets lineCap/lineJoin="round", and calls us; we draw at origin. Everything is
// deterministic in `t` (no Math.random / Date) and loops seamlessly.
//
// The static look mirrors src/textures/categories/weapons.ts so identity reads
// the same — only the MOTION + framing changed. The first-draft idle was a
// glint-sweep on a rigid body; here every weapon gets a real BODY idle (a slow
// float/bob plus a pivot sway about its pommel/base/grounded butt) and the
// specular sheen is demoted to a SECONDARY accent via the shared, feathered
// `glint`. The local `glintSweep`/`sweepPhase` (hard rectangle, teleporting
// triangle) and the duplicated shadow/sparkle/twinkle/breathe helpers are gone,
// replaced by the shared library. Two provably-dead icons get real motion:
// the dagger a twitchy flip-wobble + scale-up, the mace a top-heavy weighted
// pendulum. The crossbow's muddy silhouette (doubled black limb + a bolt
// impaling the bow) is cleaned up: a single filled crescent limb, the string
// routed behind it, recentred, limbs flexing with the twang.

import {
  TAU,
  breathe,
  loopPhase,
  pingPong,
  easeInOutSine,
  easeOutBack,
  groundShadow,
  glint,
  sparkle,
  twinkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// 1. weapon_sword — a slow float + a pommel-pivot sway (the whole sword leans
//    about its pommel like it hangs from the pommel knob); the demoted glint is
//    timed to the apex of the sway, and a small sparkle pings the tip then.
// ---------------------------------------------------------------------------
function animSword(ctx: CanvasRenderingContext2D, t: number): void {
  const swayPh = loopPhase(t, 3.4);
  const sway = Math.sin(swayPh * TAU) * 0.05; // radians, pommel-pivot lean
  const bob = breathe(t, 2.6, 0.9); // gentle vertical float
  const apex = Math.abs(Math.sin(swayPh * TAU)); // 0 at centre, 1 at the swing ends

  groundShadow(ctx, sway * 16, 23, 12, 4, Math.abs(bob) * 0.4, 0.26);

  ctx.save();
  ctx.translate(0, 1.6 + bob); // re-frame up a touch (off_y +1.6) + float
  // Pommel-pivot sway: rotate about the pommel knob (~y=23.5), atop the static tilt.
  ctx.translate(0, 23.5);
  ctx.rotate(sway);
  ctx.translate(0, -23.5);
  ctx.rotate(0.18);

  // Blade
  const blade = ctx.createLinearGradient(-5, 0, 5, 0);
  blade.addColorStop(0, "#5a5a62");
  blade.addColorStop(0.42, "#d8d8e0");
  blade.addColorStop(0.5, "#ffffff");
  blade.addColorStop(0.58, "#c0c0c8");
  blade.addColorStop(1, "#3a3a40");
  const bladePath = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(0, -24);
    c.lineTo(4, -16);
    c.lineTo(4, 6);
    c.lineTo(-4, 6);
    c.lineTo(-4, -16);
    c.closePath();
  };
  ctx.fillStyle = blade;
  bladePath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Demoted feathered sheen, clipped to the blade — peaks at the sway apex.
  ctx.save();
  bladePath(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.4), { span: 16, width: 5, angle: Math.PI / 2, intensity: 0.22 + apex * 0.12, length: 36 });
  ctx.restore();

  // Fuller highlight (toned down from the blown-out original).
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.1;
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
  ctx.arc(0, 23.5, 4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5a3008";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Tip sparkle — pings only as the sway reaches an apex (event, not metronome).
  sparkle(ctx, 0, -24, 1.2 + apex * 2.6, apex * apex * 0.85);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. weapon_shield — rocks on its bottom point like a kite-shield set on the
//    ground (pivot at the tip y=24); the emblem star only twinkles as the glint
//    sweeps past (no constant "selected"-style pulse), and the body adds a tiny
//    float so the rock reads as weight, not a slide.
// ---------------------------------------------------------------------------
function animShield(ctx: CanvasRenderingContext2D, t: number): void {
  const rockPh = loopPhase(t, 3.8);
  const rock = Math.sin(rockPh * TAU) * 0.055; // sway about the bottom point
  const settle = Math.cos(rockPh * TAU) * 0.6; // tiny vertical settle, out of phase
  const glintPh = loopPhase(t, 4.2);

  groundShadow(ctx, rock * 20, 25, 16, 4.5, 0, 0.26);

  ctx.save();
  ctx.translate(0, -3.5 + settle); // re-frame up (off_y +3.5) + settle
  // Rock about the bottom point.
  ctx.translate(0, 24);
  ctx.rotate(rock);
  ctx.translate(0, -24);

  const shapePath = (c: CanvasRenderingContext2D): void => {
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

  // Inner field + emblem + glint (all clipped to the shield body).
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

  // Star emblem (gold) — static colour; the life comes from the glint pass.
  ctx.fillStyle = "#ffd34c";
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

  // Demoted feathered sheen sweeping the whole metal face.
  glint(ctx, glintPh, { span: 22, width: 8, angle: -Math.PI / 4, intensity: 0.32, length: 52 });
  ctx.restore();

  // Studs
  ctx.fillStyle = "#d8d8e0";
  const studs: Array<[number, number]> = [[-13, -15], [13, -15], [-14, 0], [14, 0], [-8, 14], [8, 14], [0, 21]];
  studs.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, TAU);
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

  // Star twinkle — fires only when the glint band crosses the emblem (top-point
  // sparkle as the sheen passes centre), so the star reads as catching the light.
  const pass = Math.max(0, 1 - Math.abs(glintPh - 0.5) * 6); // brief window mid-sweep
  sparkle(ctx, 0, -12, 1 + pass * 2.6, pass * 0.8, "255,247,200");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. weapon_bow — recentred from its hard left offset; the wooden limbs FLEX
//    (limb tips bow outward) on the string twang, the string apex snaps with a
//    decaying vibration, and the nocked arrow rides the string back a touch.
//    A slow float + butt-pivot sway underneath keeps the body alive between
//    plucks.
// ---------------------------------------------------------------------------
function animBow(ctx: CanvasRenderingContext2D, t: number): void {
  // Twang: a rest-then-pluck event each cycle, with a decaying vibration.
  const period = 2.6;
  const cyc = loopPhase(t, period);
  const env = Math.exp(-cyc * 7); // decays after the pluck
  const vib = Math.sin(cyc * period * 38) * env; // -1..1
  const stringX = vib * 2.6; // lateral wobble of the string apex
  const arrowNudge = -vib * 1.5; // arrow rides the string
  const flex = vib * 1.6; // limb tips bow outward with the pluck
  const bob = breathe(t, 3.0, 0.7);
  const sway = Math.sin(loopPhase(t, 4.4) * TAU) * 0.035;

  groundShadow(ctx, sway * 14, 23, 12, 4, Math.abs(bob) * 0.4, 0.26);

  ctx.save();
  ctx.translate(5.8, -0.9 + bob); // re-frame: off=(-5.8,0.9) → push right & up
  // Slow body sway about the lower limb tip.
  ctx.translate(-2, 22);
  ctx.rotate(sway);
  ctx.translate(2, -22);
  ctx.rotate(0.12);

  // Wooden longbow limb — control points flex out by `flex` on the pluck.
  const limbCurve = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(-2, -22);
    c.bezierCurveTo(-16 - flex, -12, -16 - flex, 12, -2, 22);
  };
  const wood = ctx.createLinearGradient(-12, 0, -2, 0);
  wood.addColorStop(0, "#3a2008");
  wood.addColorStop(0.5, "#a87838");
  wood.addColorStop(1, "#5a3414");
  ctx.strokeStyle = wood;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  limbCurve(ctx);
  ctx.stroke();
  ctx.strokeStyle = "#1a0e04";
  ctx.lineWidth = 1.0;
  limbCurve(ctx);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,230,180,0.5)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-3, -19);
  ctx.bezierCurveTo(-14 - flex, -10, -14 - flex, 10, -3, 19);
  ctx.stroke();

  // Bowstring — apex wobbles laterally (the twang).
  ctx.strokeStyle = "rgba(240,240,230,0.9)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.quadraticCurveTo(8 + stringX, 0, -2, 22);
  ctx.stroke();

  const apexX = 8 + stringX * 0.5;

  // Nocked arrow — shaft
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
// 4. weapon_axe — recentred from its left/low offset; the heavy head PENDULUMS
//    on the haft with weighted easing (slow rise via easeInOutSine into the
//    swing ends, a faster fall through centre) about the grip, and the demoted
//    glint rides the steel. The haft sway pivots at the butt of the handle.
// ---------------------------------------------------------------------------
function animAxe(ctx: CanvasRenderingContext2D, t: number): void {
  // Weighted pendulum: ease toward each end (dwell at the top), accelerate
  // through the bottom. pingPong(...)*2-1 gives a smooth, eased -1..1.
  const swing = (pingPong(t, 3.6) * 2 - 1) * 0.07; // radians about the grip
  const bob = breathe(t, 2.8, 0.6);

  groundShadow(ctx, swing * 30, 24, 14, 4.5, Math.abs(bob) * 0.4, 0.26);

  ctx.save();
  ctx.translate(3.7, -4.6 + bob); // re-frame: off=(-3.7,4.6) → push right & up
  // Pendulum the whole axe about the grip (~y=18 on the haft).
  ctx.translate(0, 18);
  ctx.rotate(swing);
  ctx.translate(0, -18);
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
  const mainPath = (c: CanvasRenderingContext2D): void => {
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
  const backPath = (c: CanvasRenderingContext2D): void => {
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

  // Demoted feathered sheen across both head pieces (clipped to them).
  ctx.save();
  mainPath(ctx);
  backPath(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.6), { span: 18, width: 6, angle: -Math.PI / 3, intensity: 0.3, length: 30 });
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

  // Sparkle on the cutting edge as the head settles at a swing end.
  const apex = Math.abs(pingPong(t, 3.6) * 2 - 1);
  sparkle(ctx, -20, -1, 1 + apex * 2.4, apex * apex * 0.7);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. weapon_staff — the top-tier caster idle, kept and refined: a slow shaft
//    sway about the butt (new), a breathing gem glow, and orbiting sparks slowed
//    down so the magic feels languid rather than buzzing. Recentred slightly.
// ---------------------------------------------------------------------------
function animStaff(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(loopPhase(t, 4.6) * TAU) * 0.045; // slow shaft sway
  const bob = breathe(t, 3.4, 0.6);
  const pulse = breathe(t, 2.4, 0.5, 0.5); // 0..1 breathing (slower than before)

  groundShadow(ctx, sway * 16, 24, 10, 4, Math.abs(bob) * 0.4, 0.24);

  ctx.save();
  ctx.translate(-2.8, 3.0 + bob); // re-frame: off=(2.8,-3.0) → push left & down
  // Slow shaft sway about the butt (~y=24).
  ctx.translate(0, 24);
  ctx.rotate(sway);
  ctx.translate(0, -24);
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
  const glowR = 14 + pulse * 6;
  const glow = ctx.createRadialGradient(0, -20, 1, 0, -20, glowR);
  glow.addColorStop(0, `rgba(140,230,255,${0.5 + pulse * 0.4})`);
  glow.addColorStop(0.5, `rgba(80,160,255,${0.18 + pulse * 0.18})`);
  glow.addColorStop(1, "rgba(80,160,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -20, glowR, 0, TAU);
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
  ctx.fillStyle = `rgba(255,255,255,${0.6 + pulse * 0.35})`;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(3, -21);
  ctx.lineTo(0, -18);
  ctx.lineTo(-3, -21);
  ctx.closePath();
  ctx.fill();

  // Orbiting magic sparks around the gem (slowed orbit).
  const sparks = 3;
  for (let i = 0; i < sparks; i++) {
    const a = (t / 2.4) * TAU + (i / sparks) * TAU;
    const sx = Math.cos(a) * 11;
    const sy = -20 + Math.sin(a) * 8;
    // Fade as the spark passes "behind" for depth.
    const depth = 0.55 + 0.45 * Math.sin(a + Math.PI / 2);
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3 + i * 2));
    sparkle(ctx, sx, sy, 1.2 * depth + tw * 1.0, depth * (0.35 + tw * 0.45), "180,235,255");
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. weapon_dagger — was provably DEAD (a glint on a frozen blade) and the
//    thinnest mass. Rebuilt: scaled up ~18% for visual weight, and given a
//    twitchy flip-WOBBLE — it rests, then snaps a quick tilt past the mark with
//    an easeOutBack overshoot and settles (a fidgety blade flip), with a small
//    float. Glint demoted to a sheen; jewel still catches a sparkle on settle.
// ---------------------------------------------------------------------------
function animDagger(ctx: CanvasRenderingContext2D, t: number): void {
  // Flip-wobble event: rest, then one quick overshooting tilt and settle.
  const flipPh = loopPhase(t, 2.4);
  let flip: number;
  if (flipPh < 0.4) {
    flip = easeOutBack(flipPh / 0.4, 2.6); // snap past 1 and back
  } else {
    flip = easeInOutSine(1 - (flipPh - 0.4) / 0.6); // ease home
  }
  const tilt = (flip - 0.5) * 0.34; // radians of the twitchy flip about the grip
  const bob = breathe(t, 2.2, 0.7);
  // ~1 only in the latter, settled part of the rest phase (blade hanging still).
  const settled = flipPh < 0.55 ? 0 : easeInOutSine((flipPh - 0.55) / 0.45);

  groundShadow(ctx, tilt * 18, 23, 9, 3.6, Math.abs(bob) * 0.5, 0.26);

  ctx.save();
  ctx.translate(0.8, -1.9 + bob); // re-frame: off=(-0.8,1.9) → push right & up
  ctx.scale(1.18, 1.18); // scale up — was the thinnest mass
  // Twitchy flip about the grip (~y=14).
  ctx.translate(0, 14);
  ctx.rotate(tilt);
  ctx.translate(0, -14);
  ctx.rotate(0.2);

  const bladePath = (c: CanvasRenderingContext2D): void => {
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

  // Demoted feathered sheen, clipped to the blade.
  ctx.save();
  bladePath(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 2.4, 0.1), { span: 14, width: 4, angle: Math.PI / 2, intensity: 0.26, length: 32 });
  ctx.restore();

  // Center ridge
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
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
  ctx.arc(0, 20, 4.2, 0, TAU);
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
  ctx.arc(0, 20, 2.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-0.8, 19, 0.8, 0, TAU);
  ctx.fill();

  // Jewel sparkle — catches the light as the blade settles after the flip.
  const tw = twinkle(t, 2.4, 0.55) * settled;
  sparkle(ctx, 0, 20, 1 + tw * 2.4, tw, "255,200,200");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. weapon_spear — recentred; stood like a grounded sentry spear that SWAYS
//    from the planted butt (pivot at the bottom of the shaft), with a slow
//    breeze. The leaf tip is widened a touch for mass; glint demoted to a sheen
//    riding the steel, sparkle pings the point at the sway apex.
// ---------------------------------------------------------------------------
function animSpear(ctx: CanvasRenderingContext2D, t: number): void {
  const swayPh = loopPhase(t, 4.0);
  const sway = Math.sin(swayPh * TAU) * 0.05; // sway from the planted butt
  const apex = Math.abs(Math.sin(swayPh * TAU));

  groundShadow(ctx, sway * 30, 26, 9, 3.6, 0, 0.24);

  ctx.save();
  ctx.translate(-0.8, 2.0); // re-frame: off=(0.8,-2.0) → push left & down
  // Sway about the planted butt (~y=26 on the shaft after the static rotate).
  ctx.translate(0, 26);
  ctx.rotate(sway);
  ctx.translate(0, -26);
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

  // Leaf-shaped steel tip — widened slightly (±6 vs ±5) for visual mass.
  const tipPath = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(0, -28);
    c.bezierCurveTo(6, -22, 6, -14, 2.4, -8);
    c.lineTo(-2.4, -8);
    c.bezierCurveTo(-6, -14, -6, -22, 0, -28);
    c.closePath();
  };
  const tip = ctx.createLinearGradient(-6, 0, 6, 0);
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

  // Demoted feathered sheen, clipped to the tip.
  ctx.save();
  tipPath(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.2), { span: 12, width: 4, angle: Math.PI / 2, intensity: 0.26, length: 26 });
  ctx.restore();

  // Midrib highlight
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(0, -10);
  ctx.stroke();

  // Sparkle at the point as the spear reaches a sway apex.
  sparkle(ctx, 0, -28, 1 + apex * 2.4, apex * apex * 0.7);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 8. weapon_mace — was provably DEAD with flat unshaded spikes. Rebuilt as a
//    TOP-HEAVY PENDULUM: the weighted head swings about the grip with weighted
//    easing — a slow rise into each end and a fast fall through centre, with an
//    easeOutBack overshoot at the swing ends. The spikes are now SHADED (a steel
//    gradient per flange + a tip highlight) so the head reads as forged metal.
// ---------------------------------------------------------------------------
function animMace(ctx: CanvasRenderingContext2D, t: number): void {
  // Top-heavy weighted pendulum. windup-ish: slow rise (easeInOutSine into the
  // ends), then overshoot at the turn via easeOutBack on the leading half.
  const period = 3.4;
  const ph = loopPhase(t, period);
  // Map a 0..1 sawtooth to an eased there-and-back with overshoot at the ends.
  let s: number; // 0..1 position of the swing
  if (ph < 0.5) {
    s = easeOutBack(ph * 2, 1.4); // rise to the right end, overshoot
  } else {
    s = easeOutBack((1 - ph) * 2, 1.4); // fall back to the left end, overshoot
  }
  const swing = (s - 0.5) * 0.16; // radians about the grip — top-heavy amplitude
  const apex = s > 0.5 ? (s - 0.5) * 2 : 0; // bright near the overshoot ends

  groundShadow(ctx, swing * 26, 24, 12, 4.5, 0, 0.26);

  ctx.save();
  ctx.translate(-2.0, -1.9); // re-frame: off=(2.0,1.9) → push left & up
  // Pendulum the whole mace about the grip (~y=20 on the handle).
  ctx.translate(0, 20);
  ctx.rotate(swing);
  ctx.translate(0, -20);
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
  ctx.arc(-0.5, 24, 3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.0;
  ctx.stroke();

  const cx = 0;
  const cy = -10;

  // Flanges (spikes) — now SHADED: a per-flange steel gradient (dark base →
  // bright tip) and a fine tip highlight, so they read as forged metal.
  const spikes = 8;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * TAU;
    const bx = cx + Math.cos(a) * 6;
    const by = cy + Math.sin(a) * 6;
    const tx = cx + Math.cos(a) * 13;
    const ty = cy + Math.sin(a) * 13;
    const perp = a + Math.PI / 2;
    const grad = ctx.createLinearGradient(bx, by, tx, ty);
    grad.addColorStop(0, "#2e2e34");
    grad.addColorStop(0.55, "#6a6a72");
    grad.addColorStop(1, "#c4c4cc");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#1a1a1e";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(perp) * 3, by + Math.sin(perp) * 3);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx - Math.cos(perp) * 3, by - Math.sin(perp) * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Tip highlight along the leading edge of the flange.
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(perp) * 1.4, by + Math.sin(perp) * 1.4);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }

  // Central head ball — steel gradient
  const head = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 9);
  head.addColorStop(0, "#ffffff");
  head.addColorStop(0.4, "#c0c0c8");
  head.addColorStop(0.7, "#7a7a82");
  head.addColorStop(1, "#2a2a30");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(cx, cy, 7.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Demoted feathered sheen over the head ball (clipped to the ball).
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 7.5, 0, TAU);
  ctx.clip();
  ctx.translate(cx, cy);
  glint(ctx, loopPhase(t, 4.0, 0.25), { span: 9, width: 3.5, angle: -Math.PI / 4, intensity: 0.3, length: 22 });
  ctx.restore();

  // Specular dot
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(cx - 2.5, cy - 2.5, 2, 0, TAU);
  ctx.fill();

  // Sparkle on the upper spike as the head overshoots a swing end.
  const sa = -Math.PI / 2; // top spike
  const tx2 = cx + Math.cos(sa) * 13;
  const ty2 = cy + Math.sin(sa) * 13;
  sparkle(ctx, tx2, ty2, 1 + apex * 2.4, apex * apex * 0.7);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 9. weapon_helmet — kept the good plume flutter and added a slow HEAD-NOD
//    (the helm tips forward and back about the neck) with the plume LAGGING the
//    nod (follow-through). The hard sticker specular is softened to a feathered
//    sheen; the steel gets a gentle moving highlight instead of a dead face.
// ---------------------------------------------------------------------------
function animHelmet(ctx: CanvasRenderingContext2D, t: number): void {
  const nodPh = loopPhase(t, 3.6);
  const nod = Math.sin(nodPh * TAU) * 0.06; // slow head-nod about the neck
  const bob = breathe(t, 3.0, 0.6);
  // Plume flutter lags the nod (follow-through / overlap).
  const lag = Math.sin(nodPh * TAU - 0.7);
  const f = Math.sin(t * 2.2) * 1.6 + lag * 1.4;
  const f2 = Math.sin(t * 2.2 + 0.8) * 1.2 + lag * 1.0;

  groundShadow(ctx, nod * 14, 23, 15, 4, Math.abs(bob) * 0.4, 0.26);

  ctx.save();
  ctx.translate(0, -1.0 + bob); // re-frame up (off_y +1.0) + float
  // Head-nod about the neck (~y=14, base of the helm).
  ctx.translate(0, 14);
  ctx.rotate(nod);
  ctx.translate(0, -14);

  // Plume — flutters, lagging the nod.
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
  const bodyPath = (c: CanvasRenderingContext2D): void => {
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

  // Demoted feathered sheen across the metal (clipped to the helm body) —
  // replaces the hard sticker-like specular streak.
  ctx.save();
  bodyPath(ctx);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.8), { span: 18, width: 7, angle: -Math.PI / 4, intensity: 0.28, length: 40 });
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
    ctx.arc(x, y, 1.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1e";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });

  // Softened highlight streak (lower alpha than the original sticker).
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(-7, -6, 2.4, 7, -0.4, 0, TAU);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 10. weapon_crossbow — the muddiest silhouette (a doubled black limb outline +
//     a bolt impaling the bow) is CLEANED UP: a single FILLED crescent steel
//     limb (no doubled black stroke), the string routed BEHIND the limb, and the
//     loaded bolt kept clear of the limb arc. Recentred. The limbs FLEX with the
//     twang and the string apex snaps with a decaying vibration; a slow float +
//     stock sway keeps the body alive between shots.
// ---------------------------------------------------------------------------
function animCrossbow(ctx: CanvasRenderingContext2D, t: number): void {
  // String twang event.
  const period = 2.8;
  const cyc = loopPhase(t, period);
  const env = Math.exp(-cyc * 7);
  const vib = Math.sin(cyc * period * 36) * env;
  const stringX = vib * 2.2; // string apex pull
  const flex = vib * 1.4; // limb tips flex out with the pluck
  const bob = breathe(t, 3.2, 0.6);
  const sway = Math.sin(loopPhase(t, 4.8) * TAU) * 0.03;

  groundShadow(ctx, sway * 16, 24, 16, 4.5, Math.abs(bob) * 0.4, 0.26);

  ctx.save();
  ctx.translate(-3.7, -3.8 + bob); // re-frame: off=(3.7,3.8) → push left & up
  // Slow stock sway about the rear of the stock.
  ctx.translate(-18, 0);
  ctx.rotate(sway);
  ctx.translate(18, 0);
  ctx.rotate(-0.1);

  // Steel limbs — a single FILLED crescent (clean silhouette), drawn BEFORE the
  // string so the string passes behind it. Outer arc bows out, inner arc back.
  const ox = 8; // limb anchor x on the stock
  const limbFill = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(ox, -16);
    c.quadraticCurveTo(15 + flex, 0, ox, 16); // outer edge (flexes with pluck)
    c.quadraticCurveTo(11, 0, ox, -16); // inner edge back to top
    c.closePath();
  };
  const limb = ctx.createLinearGradient(ox, -16, 16, 16);
  limb.addColorStop(0, "#5a5a62");
  limb.addColorStop(0.5, "#e0e0e8");
  limb.addColorStop(1, "#3a3a40");
  ctx.fillStyle = limb;
  limbFill(ctx);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e";
  ctx.lineWidth = 1.0;
  ctx.stroke();
  // Limb edge sheen.
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(ox, -14);
  ctx.quadraticCurveTo(13 + flex, 0, ox, 14);
  ctx.stroke();

  // Bowstring — apex pulls with the twang (drawn now, but the limb is already
  // laid down so the geometry reads limb-in-front, string-behind at the tips).
  ctx.strokeStyle = "rgba(240,240,230,0.9)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(ox, -16);
  ctx.lineTo(0 - stringX, 0);
  ctx.lineTo(ox, 16);
  ctx.stroke();

  // Wooden stock (drawn over the limb roots so the join is clean).
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

  // Loaded bolt — sits in the centre groove, stopping at the string nock so it
  // no longer "impales" the bow. Rides forward slightly as the string releases.
  const boltBack = 2 + stringX * 0.4;
  ctx.strokeStyle = "#c89858";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(boltBack, 0);
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
  ctx.arc(-7, 6, 1.6, 0, TAU);
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
