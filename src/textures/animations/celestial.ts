// Animated celestial / astral / night-sky icons — same look as
// src/textures/categories/celestial.ts, but alive.
//
// Each fn redraws the COMPLETE icon at time `t` (elapsed seconds), centered at
// origin (0,0) within a roughly -24..+24 box. The caller handles clear / save /
// translate / scale / lineCap / restore. Motion is derived purely from `t` and
// from indices (no Math.random / no Date) so frames are deterministic, and
// loops tile seamlessly via the shared phase/wave helpers.
//
// The static geometry & palette are the strong part and are preserved; the
// motion is rebuilt to lead with real ARTICULATION instead of a rigid
// whole-sprite spin + a flat glow pulse:
//   - the sun's rays ease-pop in a TRAVELLING WAVE under one unified pulse;
//   - the galaxy actually SPIRALS (log-spiral arms + differential rotation,
//     inner faster) rather than rotating as one beaded oval;
//   - the ringed planet SCROLLS its bands, BREATHES the ring tilt, and
//     DEPTH-SORTS its moon (occluded when behind the planet);
//   - the eclipse locks its formerly-independent sines to ONE master pulse plus
//     ONE decisive bead flash;
//   - the shooting star is REBUILT: it now PARKS a twinkling star in-frame at
//     rest (the old version was a straight-line fly-by, blank at t=0) and only
//     periodically arcs out and settles back onto that resting twinkle.

import {
  TAU,
  clamp01,
  lerp,
  easeOutCubic,
  easeInCubic,
  easeOutBack,
  loopPhase,
  breathe,
  beat,
  twinkle,
  sparkle,
} from "./_anim.js";

// A clean 4-point star path (sharp diamond points + recessed inner vertices).
// Local helper: the shared `sparkle` is a soft accent star, but the celestial
// bodies need crisp drawn star polygons (heads, nodes, north-star spikes).
function star4(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  inner: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    const a2 = a + Math.PI / 4;
    ctx.lineTo(cx + Math.cos(a2) * r * inner, cy + Math.sin(a2) * r * inner);
  }
  ctx.closePath();
}

// An 8-point compass star (4 long cardinal + 4 short diagonal points).
function star8(
  ctx: CanvasRenderingContext2D,
  r: number,
  innerRatio: number,
  longRatio: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const tip = i % 2 === 0 ? r : r * longRatio;
    ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
    const a2 = a + Math.PI / 8;
    ctx.lineTo(Math.cos(a2) * r * innerRatio, Math.sin(a2) * r * innerRatio);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// astral_sun — rays ease-POP outward in a travelling wave sweeping around the
// ring, all under ONE unified breathing pulse (corona + disc + rim move
// together), with a single specular WINK on the highlight. The old rigid ray
// spin is gone; the wave is the life. off=(0.7,-0.8) → nudge up-left a hair.
function animSun(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.translate(-0.7, 0.8);

  // One master pulse drives every glow element (was several loose sines).
  const pulse = breathe(t, 3.0); // -1..1
  const coronaR = 24 + pulse * 2.0;
  const coronaA = 0.85 + pulse * 0.1;
  const corona = ctx.createRadialGradient(0, 0, 6, 0, 0, coronaR);
  corona.addColorStop(0, `rgba(255,220,120,${coronaA.toFixed(3)})`);
  corona.addColorStop(0.5, "rgba(255,170,50,0.35)");
  corona.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, coronaR, 0, TAU);
  ctx.fill();

  // Rays — a traveling wave runs around the ring; each ray EASES out to its
  // crest then eases back, so the corona "pops" in sequence instead of a rigid
  // wheel-spin. The wave is shaped by easeOutCubic on the rising edge.
  ctx.lineCap = "round";
  const ringPhase = loopPhase(t, 2.6); // 0..1 wave position around the ring
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const long = i % 2 === 0;
    // Where this ray sits in the travelling wave (0..1, wrapped).
    const local = (((i / 16) - ringPhase) % 1 + 1) % 1;
    // Sharp eased pop: bright crest near local≈0, decaying around the ring.
    const wave = easeOutCubic(Math.max(0, 1 - local * 3.2));
    const r1 = 13;
    const r2 = (long ? 23 : 18) + wave * 3.4;
    const glow = 0.7 + wave * 0.3 + pulse * 0.05;
    ctx.strokeStyle = long
      ? `rgba(255,207,58,${clamp01(glow).toFixed(3)})`
      : `rgba(255,168,32,${clamp01(glow).toFixed(3)})`;
    ctx.lineWidth = (long ? 2.4 : 1.8) + wave * 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // Sun disc — warm radial gradient (static silhouette preserved).
  const disc = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13);
  disc.addColorStop(0, "#fff6c8");
  disc.addColorStop(0.5, "#ffd84a");
  disc.addColorStop(0.85, "#f59a18");
  disc.addColorStop(1, "#d2700c");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b85c08";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Inner glow rim — brightness rides the master pulse.
  ctx.strokeStyle = `rgba(255,250,210,${(0.65 + pulse * 0.12).toFixed(3)})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 9, Math.PI * 0.55, Math.PI * 1.4);
  ctx.stroke();

  // Specular highlight — a single bright WINK once per cycle (a clean sparkle
  // sits atop the soft gloss).
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-4, -5, 3, 4, -0.4, 0, TAU);
  ctx.fill();
  sparkle(ctx, -4, -5, 2.2 + 0.8 * twinkle(t, 3.0, 0.12), twinkle(t, 3.0, 0.12), "255,255,235");

  ctx.restore();
}

// ---------------------------------------------------------------------------
// astral_full_moon — the disc is a moon, so it barely MOVES; instead it
// LIBRATES: the surface gradient + rim light drift in a slow Lissajous (the
// face nods toward us), and crater rims catch staggered glints. Halo breathe
// stays as a secondary accent.
function animFullMoon(ctx: CanvasRenderingContext2D, t: number): void {
  // Libration — a slow 2-axis drift (incommensurate periods so it never just
  // ping-pongs). Drives where the light "falls" on the face.
  const libX = Math.sin(t * 0.37) * 2.0;
  const libY = Math.cos(t * 0.29) * 1.6;

  // Soft halo breathes (secondary).
  const haloB = breathe(t, 4.0);
  const haloR = 24 + haloB * 1.8;
  const haloA = 0.55 + haloB * 0.1;
  const halo = ctx.createRadialGradient(0, 0, 13, 0, 0, haloR);
  halo.addColorStop(0, `rgba(220,230,255,${haloA.toFixed(3)})`);
  halo.addColorStop(0.6, "rgba(180,200,250,0.22)");
  halo.addColorStop(1, "rgba(180,200,250,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, TAU);
  ctx.fill();

  // Moon disc — the gradient ORIGIN drifts with libration so the lit pole rolls
  // gently across the face (the disc outline itself stays put = it reads as a
  // body turning, not a sprite sliding).
  const disc = ctx.createRadialGradient(-5 + libX, -5 + libY, 3, libX * 0.4, libY * 0.4, 16);
  disc.addColorStop(0, "#ffffff");
  disc.addColorStop(0.5, "#eef2fb");
  disc.addColorStop(0.85, "#cdd6e8");
  disc.addColorStop(1, "#9aa6c0");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8a96b2";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Surface content — clipped to disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, TAU);
  ctx.clip();

  // Craters drift a hair with libration (parallax of the near face).
  const craters: Array<[number, number, number]> = [
    [-5, -6, 4], [6, -2, 3], [-2, 7, 3.5], [9, 7, 2.2], [-9, 3, 2], [3, -9, 1.8],
  ];
  craters.forEach(([cx0, cy0, r], ci) => {
    const cx = cx0 + libX * 0.5;
    const cy = cy0 + libY * 0.5;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0.5, cx, cy, r);
    g.addColorStop(0, "rgba(150,160,185,0.7)");
    g.addColorStop(0.7, "rgba(120,132,160,0.6)");
    g.addColorStop(1, "rgba(120,132,160,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.2, Math.PI * 0.9);
    ctx.stroke();
    // A small glint pings on a crater rim — faster + clearly staggered per
    // crater so a wink visibly travels across the surface (was near-imperceptible
    // at period 5.2). Each crater fires in turn over one shared cycle.
    const gl = twinkle(t, 3.2, (ci / craters.length) * 0.85);
    if (gl > 0.01) {
      sparkle(ctx, cx - r * 0.3, cy - r * 0.3, 1.3 + gl * 1.0, gl * 0.85, "235,242,255");
    }
  });

  // Rotating specular sheen — a soft highlight band slowly orbits the face, the
  // primary legible motion (the moon "turning" toward the light). Clipped to the
  // disc; driven by loopPhase so it tiles seamlessly. An additive soft ellipse
  // whose centre swings around a small circle, elongated tangent to the swing.
  const sheenPh = loopPhase(t, 7.0) * TAU;
  const scx = Math.cos(sheenPh) * 6.5;
  const scy = Math.sin(sheenPh) * 6.5;
  const sheen = ctx.createRadialGradient(scx, scy, 0.5, scx, scy, 11);
  sheen.addColorStop(0, "rgba(255,255,255,0.42)");
  sheen.addColorStop(0.5, "rgba(245,249,255,0.16)");
  sheen.addColorStop(1, "rgba(245,249,255,0)");
  ctx.fillStyle = sheen;
  ctx.save();
  ctx.translate(scx, scy);
  ctx.rotate(sheenPh + Math.PI / 2); // long axis follows the orbit tangent
  ctx.scale(1.4, 0.7);
  ctx.translate(-scx, -scy);
  ctx.beginPath();
  ctx.arc(scx, scy, 11, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Crescent highlight rim — the lit arc swings with libration (the terminator
  // breathing as the face nods).
  const rimC = -0.04 * libX;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 12.5, Math.PI * 0.6 + rimC, Math.PI * 1.35 + rimC);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// astral_ringed_planet — REBUILT motion: the planet SPINS (bands scroll
// continuously and wrap seamlessly), the ring TILT BREATHES (its minor axis
// swells/shrinks so the ring opens and closes), and the moon is DEPTH-SORTED:
// it is occluded by the planet body on the far half of its orbit instead of
// being drawn always-on-top. off=(0.8,0) → nudge left a hair.
function animRingedPlanet(ctx: CanvasRenderingContext2D, t: number): void {
  // Moon orbit — shared phase so depth + position agree.
  const orbit = t * 0.7;
  const mx = Math.cos(orbit) * 19;
  const my = Math.sin(orbit) * 11 - 2;
  // sin(orbit) > 0 → moon is on the FAR side (top of the tilted ellipse) → draw
  // it BEHIND the planet; < 0 → near side → draw it in FRONT.
  const moonBehind = Math.sin(orbit) > 0;

  const drawMoon = (): void => {
    const moonGlow = ctx.createRadialGradient(mx, my, 1, mx, my, 7);
    moonGlow.addColorStop(0, "rgba(230,238,255,0.8)");
    moonGlow.addColorStop(1, "rgba(200,215,255,0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, TAU);
    ctx.fill();
    const moon = ctx.createRadialGradient(mx - 1, my - 1, 0.5, mx, my, 4);
    moon.addColorStop(0, "#ffffff");
    moon.addColorStop(0.7, "#dfe6f4");
    moon.addColorStop(1, "#b3bdd6");
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(mx, my, 3.6, 0, TAU);
    ctx.fill();
  };

  ctx.save();
  ctx.translate(-0.8, 0);
  ctx.rotate(-0.32);

  // Moon BEHIND everything (far side of orbit).
  if (moonBehind) drawMoon();

  // Ring tilt breathes — the minor radius swells/shrinks, so the ring appears
  // to open toward us and close again (a slow nutation), with a faint shimmer.
  const tilt = breathe(t, 5.0, 1.6, 8.0); // minor axis ≈ 6.4..9.6
  const tiltInner = tilt * (6.5 / 8.0);
  const shimmer = breathe(t, 2.4);

  // Back half of the ring (behind the planet).
  ctx.strokeStyle = `rgba(210,180,130,${(0.5 + shimmer * 0.1).toFixed(3)})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, tilt, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(170,140,100,${(0.4 + shimmer * 0.08).toFixed(3)})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, tiltInner, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Planet disc — warm banded gradient (static silhouette preserved).
  const disc = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13);
  disc.addColorStop(0, "#ffe6b0");
  disc.addColorStop(0.5, "#e8b65a");
  disc.addColorStop(0.85, "#bd8030");
  disc.addColorStop(1, "#7a4c12");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#6a4010";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Atmospheric bands SCROLL continuously around the planet → reads as an axial
  // SPIN (each band wraps seamlessly via loopPhase; the body is wider than the
  // clip so the wrap is hidden). Clipped to disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.clip();
  const scroll = loopPhase(t, 6.0) * 28; // one full band-width march per loop
  const bandRows: Array<[number, number]> = [[-6, 1], [-1.5, -1], [3, 1], [7.5, -1]];
  ctx.strokeStyle = "rgba(120,76,18,0.45)";
  ctx.lineWidth = 1.6;
  bandRows.forEach(([y, dir]) => {
    // Two copies 28u apart so a band is always entering as one leaves.
    [0, -28].forEach((wrap) => {
      const dx = (scroll * dir + wrap) % 28;
      ctx.beginPath();
      ctx.moveTo(-18 + dx, y);
      ctx.bezierCurveTo(-8 + dx, y - 1.5, 0 + dx, y + 1.5, 10 + dx, y);
      ctx.stroke();
    });
  });
  const liteRows: Array<[number, number]> = [[-8, -1], [0.5, 1], [5, -1]];
  ctx.strokeStyle = "rgba(255,238,190,0.4)";
  ctx.lineWidth = 1;
  liteRows.forEach(([y, dir]) => {
    [0, -28].forEach((wrap) => {
      const dx = (scroll * dir + wrap) % 28;
      ctx.beginPath();
      ctx.moveTo(-18 + dx, y);
      ctx.bezierCurveTo(-8 + dx, y - 1, 0 + dx, y + 1, 10 + dx, y);
      ctx.stroke();
    });
  });
  ctx.restore();

  // Specular highlight (fixed key light).
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-5, -5, 2.4, 3.4, -0.4, 0, TAU);
  ctx.fill();

  // Front half of the ring (over the planet) — tilt breathes too.
  ctx.strokeStyle = `rgba(245,222,170,${(0.92 - shimmer * 0.08).toFixed(3)})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, tilt, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = `rgba(200,165,110,${(0.85 - shimmer * 0.08).toFixed(3)})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, tiltInner, 0, 0, Math.PI);
  ctx.stroke();

  // Moon IN FRONT (near side of orbit) — drawn last so it occludes the front
  // ring as it passes.
  if (!moonBehind) drawMoon();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// astral_shooting_star — a twinkling star PARKS in-frame at the resting position
// (visible at every t including 0) and keeps a faint resting trail so it reads as
// a *shooting* star even at rest. The shoot now RECURS on a short period: the
// head ANTICIPATES (a tiny dip), ARCS out on an eased path with a SQUASHED head +
// a tapering trail, then SETTLES back onto the resting twinkle. The peak glow is
// tamed so it never blows out to a flat white disc, and the envelope is fully
// periodic so the first and last frame match (seamless loop).
function animShootingStar(ctx: CanvasRenderingContext2D, t: number): void {
  const restX = 11;
  const restY = -11;
  // Travel axis (up-right, matching the static art's streak direction).
  const dirX = 0.7071;
  const dirY = -0.7071;
  const nx = -dirY; // unit normal
  const ny = dirX;

  // Event envelope: the star rests briefly, then shoots — RECURRING often enough
  // that the streak reads as a repeating loop, not a one-shot burst.
  const period = 2.4;
  const ph = loopPhase(t, period);
  const active = 0.62; // fraction of the cycle spent shooting (most of it)
  const shooting = ph < active;
  const u = shooting ? ph / active : 0; // 0..1 across the shoot

  // Anticipation (0..0.16): pull slightly back down the trail before launch.
  // Launch (0.16..0.62): accelerate out along the arc (easeInCubic → fast tail).
  // Return (0.62..1): glide back and settle (easeOutCubic) onto the rest point.
  const anticip = u < 0.16 ? Math.sin((u / 0.16) * Math.PI) : 0;
  let along = 0; // displacement along travel axis from the rest point
  let arc = 0; // perpendicular arc bow
  let intensity = 0; // trail/glow strength
  let squash = 1; // head stretch along travel
  if (shooting) {
    if (u < 0.62) {
      const lu = clamp01((u - 0.16) / (0.62 - 0.16));
      along = easeInCubic(lu) * 30 - anticip * 4;
      arc = Math.sin(lu * Math.PI) * 6; // bows off-axis then back
      intensity = Math.sin(lu * Math.PI); // 0→1→0 over the launch
      squash = 1 + easeInCubic(lu) * 0.7; // stretches as it speeds up
    } else {
      const ru = clamp01((u - 0.62) / (1 - 0.62));
      // Comes back from the far end and decelerates onto the rest point.
      along = lerp(30, 0, easeOutCubic(ru));
      arc = Math.sin((1 - ru) * Math.PI) * 6 * (1 - ru);
      intensity = (1 - ru) * 0.5;
      squash = 1 + (1 - ru) * 0.2;
    }
  }

  const headX = restX + dirX * along + nx * arc;
  const headY = restY + dirY * along + ny * arc;

  // --- Trail — a tapering wedge behind the head. A faint resting trail is always
  // present (so even the parked star reads as a *shooting* star, matching the
  // static art), and it brightens/lengthens during the shoot.
  const restTw = twinkle(t, 2.6); // gentle idle pulse on the parked star
  const trailStr = Math.max(intensity, 0.22 + restTw * 0.1);
  {
    const tailLen = 16 + squash * 10 + trailStr * 4;
    const tailX = headX - dirX * tailLen;
    const tailY = headY - dirY * tailLen;
    const trail = ctx.createLinearGradient(headX, headY, tailX, tailY);
    trail.addColorStop(0, `rgba(255,245,200,${(0.8 * trailStr).toFixed(3)})`);
    trail.addColorStop(0.4, `rgba(255,210,120,${(0.45 * trailStr).toFixed(3)})`);
    trail.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = trail;
    const hw = 4.0;
    ctx.beginPath();
    ctx.moveTo(headX + nx * hw, headY + ny * hw);
    ctx.lineTo(headX - nx * hw, headY - ny * hw);
    ctx.lineTo(tailX, tailY);
    ctx.closePath();
    ctx.fill();

    // A couple of sparks shed along the trail (stronger during the shoot).
    for (let s = 0; s < 3; s++) {
      const d = 6 + s * 6;
      const sxp = headX - dirX * d + nx * (s % 2 === 0 ? 2 : -2);
      const syp = headY - dirY * d + ny * (s % 2 === 0 ? 2 : -2);
      sparkle(ctx, sxp, syp, 1.6 - s * 0.3, trailStr * (0.8 - s * 0.18), "255,248,220");
    }
  }

  // --- Head glow — bright during the shoot, a soft resting glow otherwise. Peak
  // alpha is capped well below 1 so the head never blows out to a flat white disc.
  const glowStr = shooting ? 0.42 + intensity * 0.34 : 0.32 + restTw * 0.16;
  const glowR = (shooting ? 11 + intensity * 4 : 9);
  const glow = ctx.createRadialGradient(headX, headY, 2, headX, headY, glowR);
  glow.addColorStop(0, `rgba(255,250,210,${clamp01(0.7 * glowStr + 0.18).toFixed(3)})`);
  glow.addColorStop(0.5, `rgba(255,210,110,${(0.34 * (shooting ? intensity + 0.4 : 0.5)).toFixed(3)})`);
  glow.addColorStop(1, "rgba(255,210,110,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(headX, headY, glowR, 0, TAU);
  ctx.fill();

  // --- Star head — squashed along the travel axis while shooting (anchored at
  // the head, rotated to the travel direction so the stretch reads as motion);
  // a clean resting 4-point twinkle when parked.
  const travelAngle = Math.atan2(dirY, dirX);
  const baseR = 9 + (shooting ? 0 : restTw * 1.0);
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(travelAngle);
  ctx.scale(squash, 1 / Math.sqrt(squash));
  ctx.rotate(-travelAngle);
  ctx.fillStyle = "#fff2bf";
  star4(ctx, 0, 0, baseR, 0.32);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  star4(ctx, 0, 0, baseR * 0.6, 0.4);
  ctx.fill();
  ctx.restore();

  // Bright core dot.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(headX, headY, 2.4, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// astral_constellation — the muddy translucent field is DARKENED, and a pulse
// of light RUNS along the connecting lines, IGNITING each node as the pulse
// arrives at it (node brightness peaks when the travelling pulse reaches its
// position along the path). Dust twinkle stays a faint secondary.
function animConstellation(ctx: CanvasRenderingContext2D, t: number): void {
  // Darker, tighter field so the lines/nodes read crisply (was washed out).
  const field = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
  field.addColorStop(0, "rgba(28,40,86,0.42)");
  field.addColorStop(0.7, "rgba(14,22,52,0.28)");
  field.addColorStop(1, "rgba(10,14,36,0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, TAU);
  ctx.fill();

  // Faint background dust — gentle staggered twinkle (secondary).
  const dust: Array<[number, number]> = [
    [-19, -8], [17, -16], [-15, 14], [20, 10], [2, -20], [-8, 19], [14, 18],
  ];
  dust.forEach(([x, y], i) => {
    const a = 0.3 * (0.5 + 0.5 * Math.sin(t * 3 + i * 2.1));
    ctx.fillStyle = `rgba(200,215,255,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.6, 0, TAU);
    ctx.fill();
  });

  // Constellation nodes, in path order. `s` is each node's normalised position
  // along the traced path (0..1) used to time its ignition.
  const nodes: Array<[number, number, number]> = [
    [-14, 8, 3.4],
    [-4, -2, 2.8],
    [6, -12, 4],
    [13, 0, 3],
    [4, 12, 3.2],
  ];

  // A light pulse sweeps the path position 0..1 each loop. Slightly faster so
  // the travelling draw is unmistakable as motion (not a slow creep).
  const pulse = loopPhase(t, 2.8); // 0..1 head of the travelling spark
  // Shortest circular distance from `pulse` to a path param `p` (wraps at 1).
  const circDist = (p: number): number => {
    const d = Math.abs(((pulse - p + 1) % 1));
    return Math.min(d, 1 - d);
  };

  // Connecting lines — the line is DRAWN/IGNITED in sequence: a dim base so the
  // figure is always faintly legible, and a bright wave that travels along the
  // segments in order, so the eye clearly reads the constellation tracing itself.
  const segPos = [0.0, 0.28, 0.56, 0.8, 1.0]; // path param at each node
  ctx.lineCap = "round";
  for (let i = 0; i < nodes.length - 1; i++) {
    const mid = (segPos[i] + segPos[i + 1]) / 2;
    const near = Math.max(0, 1 - circDist(mid) * 4.0); // tight, bright crest
    // Dim base + a strong travelling crest = obvious sequential draw.
    const aa = 0.28 + near * 0.62;
    ctx.lineWidth = 1.0 + near * 1.4; // the lit segment also thickens
    ctx.strokeStyle = `rgba(190,215,255,${clamp01(aa).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(nodes[i][0], nodes[i][1]);
    ctx.lineTo(nodes[i + 1][0], nodes[i + 1][1]);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  // Closing brace line (node 1 → node 4), faint static.
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = "rgba(150,180,235,0.30)";
  ctx.beginPath();
  ctx.moveTo(nodes[1][0], nodes[1][1]);
  ctx.lineTo(nodes[4][0], nodes[4][1]);
  ctx.stroke();

  // The travelling spark itself — a bright bead riding the path.
  const seg = pulse * (nodes.length - 1);
  const si = Math.min(nodes.length - 2, Math.floor(seg));
  const sf = seg - si;
  const bx = lerp(nodes[si][0], nodes[si + 1][0], sf);
  const by = lerp(nodes[si][1], nodes[si + 1][1], sf);
  sparkle(ctx, bx, by, 2.0, 0.85, "220,235,255");

  // Star nodes — each IGNITES decisively as the pulse passes its path position,
  // over a clearly staggered baseline twinkle (so the cluster reads as a sequence
  // of bright winks running along the figure, not a uniform shimmer).
  nodes.forEach(([x, y, r], i) => {
    const ignite = Math.max(0, 1 - circDist(segPos[i]) * 4.5);
    // Baseline staggered breath so they never go fully dark, + a strong flare.
    const tw = 0.3 + 0.22 * Math.sin(t * 2.4 + i * 1.9) + ignite * 0.85;
    const scale = 0.8 + clamp01(tw) * 0.55;
    const rr = r * scale;
    const glowR = rr * 2.5;
    const glow = ctx.createRadialGradient(x, y, 0.5, x, y, glowR);
    glow.addColorStop(0, `rgba(220,235,255,${clamp01(0.5 + tw * 0.45).toFixed(3)})`);
    glow.addColorStop(1, "rgba(160,195,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    star4(ctx, x, y, rr, 0.36);
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// astral_galaxy — REBUILT arms. The old version read as a beaded oval ring under
// an imperceptible rigid spin. Now the arms are true LOG-SPIRALS and the disc
// rotates DIFFERENTIALLY: inner stars sweep faster than outer ones, so the arms
// visibly SHEAR/wind over time (a real spiral, not a turning ring). Core pulses.
function animGalaxy(ctx: CanvasRenderingContext2D, t: number): void {
  // Deep space backdrop.
  const field = ctx.createRadialGradient(0, 0, 3, 0, 0, 24);
  field.addColorStop(0, "rgba(60,40,110,0.6)");
  field.addColorStop(0.6, "rgba(28,20,60,0.45)");
  field.addColorStop(1, "rgba(14,10,34,0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, TAU);
  ctx.fill();

  // A log-spiral arm. Each star's ANGULAR rate falls off with radius
  // (differential rotation): inner ~0.6 rad/s, outer ~0.16 rad/s. Because the
  // rates differ, the arm continuously winds — the spiral spins AND shears.
  const arm = (
    armPhase: number,
    rPart: number,
    gPart: number,
    bPart: number,
  ): void => {
    let idx = 0;
    for (let s = 0.12; s < 1; s += 0.04) {
      const rad = 3 + s * 19;
      // Differential angular speed: faster near the core.
      const omega = lerp(0.62, 0.16, s);
      // Log-spiral winding term (tighter wind near the core) + per-radius spin.
      const a = armPhase + s * Math.PI * 3.0 + t * omega;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad * 0.62; // flattened disc
      const size = 1.6 * (1 - s) + 0.5;
      const baseAlpha = 0.85 * (1 - s * 0.5);
      const tw = 0.7 + 0.3 * Math.sin(t * 4 + idx * 0.9);
      const alpha = clamp01(baseAlpha * tw);
      ctx.fillStyle = `rgba(${rPart},${gPart},${bPart},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
      // Occasional brighter knot.
      if (Math.sin(idx * 1.7) > 0.55) {
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.6, 0, TAU);
        ctx.fill();
      }
      idx++;
    }
  };
  arm(0, 170, 200, 255);
  arm(Math.PI, 220, 180, 255);

  // Core pulses (one master breath).
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.6); // 0..1
  const coreScale = 1 + pulse * 0.12;
  const coreGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, 11 * coreScale);
  coreGlow.addColorStop(0, `rgba(255,250,230,${(0.85 + pulse * 0.12).toFixed(3)})`);
  coreGlow.addColorStop(0.4, "rgba(255,225,170,0.7)");
  coreGlow.addColorStop(1, "rgba(255,210,150,0)");
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11 * coreScale, 7 * coreScale, 0, 0, TAU);
  ctx.fill();
  const core = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 5);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.6, "#fff0c8");
  core.addColorStop(1, "#ffcf80");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5 * coreScale, 3.4 * coreScale, 0, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// astral_north_star — a beacon. On a periodic BEAT the spikes BLOOM outward with
// an overshoot (easeOutBack) and a cross-flare of four long beams flashes
// through, while lens-flare beads streak along the flare diagonal. A deeper-blue
// rim grounds the low-contrast white-on-pale. Between beats it rests on a soft
// twinkle.
function animNorthStar(ctx: CanvasRenderingContext2D, t: number): void {
  const period = 3.2;
  const b = beat(t, period, 0.34); // 0 at rest, one eased 0→1→0 pulse
  const bloom = easeOutBack(b, 2.4); // overshoots → spikes punch out & settle
  const idle = 0.5 + 0.5 * Math.sin(t * 2.2); // gentle resting twinkle

  // Deeper-blue rim glow first (adds contrast under the pale star).
  const rim = ctx.createRadialGradient(0, 0, 6, 0, 0, 25);
  rim.addColorStop(0, "rgba(60,110,210,0)");
  rim.addColorStop(0.55, "rgba(46,92,190,0.30)");
  rim.addColorStop(1, "rgba(30,64,150,0)");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, TAU);
  ctx.fill();

  // Radiant glow — blooms on the beat.
  const glowA = 0.8 + b * 0.18;
  const glowR = 23 + bloom * 3;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, glowR);
  glow.addColorStop(0, `rgba(225,240,255,${glowA.toFixed(3)})`);
  glow.addColorStop(0.4, "rgba(150,200,255,0.5)");
  glow.addColorStop(1, "rgba(120,180,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, TAU);
  ctx.fill();

  // Cross-flare — four long thin beams that flash through on the beat.
  if (b > 0.01) {
    ctx.save();
    ctx.lineCap = "round";
    const flareLen = 20 + bloom * 8;
    ctx.strokeStyle = `rgba(235,245,255,${(0.7 * b).toFixed(3)})`;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU - Math.PI / 2;
      ctx.lineWidth = i % 2 === 0 ? 1.6 : 1.1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * flareLen, Math.sin(a) * flareLen);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();

    // Lens-flare beads streak along the up-right flare diagonal.
    for (let k = -2; k <= 2; k++) {
      if (k === 0) continue;
      const dd = k * (7 + bloom * 2);
      const lx = 0.7071 * dd;
      const ly = -0.7071 * dd;
      sparkle(ctx, lx, ly, 1.3 + b * 0.8, b * 0.7 * (1 - Math.abs(k) * 0.25), "210,230,255");
    }
  }

  // Outer spikes — length punches out with the bloom overshoot.
  ctx.fillStyle = "#cfe6ff";
  star8(ctx, 22 + bloom * 2.5, 0.16, 0.5);
  ctx.fill();

  // Bright white core star — also blooms a touch.
  const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
  coreGrad.addColorStop(0, "#ffffff");
  coreGrad.addColorStop(0.6, "#eaf3ff");
  coreGrad.addColorStop(1, "#a8cdff");
  ctx.fillStyle = coreGrad;
  star8(ctx, 14 + bloom * 1.4, 0.22, 0.55);
  ctx.fill();

  // Brilliant centre — rests on the idle twinkle, flares on the beat.
  const cr = 5 * (0.85 + idle * 0.25 + b * 0.4);
  const center = ctx.createRadialGradient(0, 0, 0.5, 0, 0, cr);
  center.addColorStop(0, "#ffffff");
  center.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, cr, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// astral_eclipse — keep the good staggered prominence flares, but LOCK every
// motion to ONE master pulse (corona, ring, rim, prominences all breathe in
// phase) and replace the wandering diamond bead + its independent fast flicker
// with ONE decisive bead FLASH (a beat) at a fixed rim position.
function animEclipse(ctx: CanvasRenderingContext2D, t: number): void {
  const masterPeriod = 3.0;
  const pulse = breathe(t, masterPeriod); // -1..1 — the single heartbeat
  const env = 0.5 + 0.5 * pulse; // 0..1 same phase

  // Wide outer corona glow — rides the master pulse.
  const coronaR = 24 + pulse * 1.8;
  const corona = ctx.createRadialGradient(0, 0, 9, 0, 0, coronaR);
  corona.addColorStop(0, `rgba(255,240,200,${(0.9 + pulse * 0.08).toFixed(3)})`);
  corona.addColorStop(0.35, "rgba(255,200,110,0.6)");
  corona.addColorStop(0.7, "rgba(255,170,80,0.25)");
  corona.addColorStop(1, "rgba(255,170,80,0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, coronaR, 0, TAU);
  ctx.fill();

  // Streaming corona rays (prominences) — staggered flares, but their flare now
  // breathes WITH the master pulse (phase-locked) instead of a free t*4 sine.
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    // Staggered around the ring, but all summed onto the one master phase.
    const flare = Math.sin(env * TAU - i * 0.5); // -1..1, locked to `env`
    const len = 18 + (i % 3) * 4 + flare * 2.5 + pulse * 1.0;
    const g = ctx.createLinearGradient(
      Math.cos(a) * 12, Math.sin(a) * 12,
      Math.cos(a) * len, Math.sin(a) * len,
    );
    g.addColorStop(0, `rgba(255,235,180,${(0.7 + flare * 0.18).toFixed(3)})`);
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

  // Blazing inner ring (diamond-ring effect) — flares with the master pulse.
  const ring = ctx.createRadialGradient(0, 0, 9.5, 0, 0, 13);
  ring.addColorStop(0, "rgba(255,255,255,0)");
  ring.addColorStop(0.5, `rgba(255,248,210,${(0.9 + pulse * 0.08).toFixed(3)})`);
  ring.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, TAU);
  ctx.fill();

  // Dark moon disc occluding the sun (static silhouette).
  const disc = ctx.createRadialGradient(-3, -3, 2, 0, 0, 12);
  disc.addColorStop(0, "#3a3650");
  disc.addColorStop(0.6, "#211f33");
  disc.addColorStop(1, "#0c0a18");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.fill();

  // Bright rim of light around the disc — rides the master pulse.
  ctx.strokeStyle = `rgba(255,250,220,${(0.85 + pulse * 0.1).toFixed(3)})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.stroke();

  // Diamond-ring bead — ONE decisive flash at a FIXED rim position (was a
  // wandering bead on its own slow sine + an independent fast flicker). A
  // single `beat` synced to the master period gives the rest-then-blaze read.
  const flash = beat(t, masterPeriod, 0.3); // 0 mostly, one eased blaze
  const spotA = -Math.PI * 0.3;
  const sx = Math.cos(spotA) * 11;
  const sy = Math.sin(spotA) * 11;
  const spotR = 4 + flash * 4;
  const spot = ctx.createRadialGradient(sx, sy, 0.5, sx, sy, spotR);
  spot.addColorStop(0, `rgba(255,255,255,${(0.6 + flash * 0.4).toFixed(3)})`);
  spot.addColorStop(0.5, `rgba(255,245,200,${(0.5 + flash * 0.3).toFixed(3)})`);
  spot.addColorStop(1, "rgba(255,230,160,0)");
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.arc(sx, sy, spotR, 0, TAU);
  ctx.fill();
  // A crisp star kicks at the peak of the flash.
  if (flash > 0.2) sparkle(ctx, sx, sy, 2.2 + flash * 1.5, flash, "255,250,220");
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  astral_sun: animSun,
  astral_full_moon: animFullMoon,
  astral_ringed_planet: animRingedPlanet,
  astral_shooting_star: animShootingStar,
  astral_constellation: animConstellation,
  astral_galaxy: animGalaxy,
  astral_north_star: animNorthStar,
  astral_eclipse: animEclipse,
};
