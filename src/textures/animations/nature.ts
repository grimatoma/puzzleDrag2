// Animated nature / forageable icons — same look as src/textures/categories/nature.ts,
// but alive. Each fn redraws the COMPLETE icon at time `t` (elapsed seconds),
// origin-centred in a roughly -24..+24 box; the caller handles clear / save /
// translate / scale / restore. The static silhouette + palette are the strong
// part and are preserved — only the MOTION and FRAMING are rebuilt.
//
// The first draft was calm/sleepy and samey: 6 of 8 cycled LIGHT over a frozen
// body, and the leaf/cattail rotated as one welded piece. The rebuild leads with
// real DEFORMATION (a stem-base pivot with follow-through, surface-tension
// pinch, a living clam hinge, per-cap squash-bobs, a traveling web wobble), with
// glints/sparkles demoted to a SECONDARY accent and a single unified top-left
// key light + one shared `sparkle`. Loops tile seamlessly because position is
// driven off `t` via `loopPhase`/`pingPong`/`breathe`/`beat`, and the contact
// shadows couple to vertical motion through `groundShadow`.

import {
  TAU,
  clamp01,
  lerp,
  breathe,
  loopPhase,
  pingPong,
  beat,
  easeInOutSine,
  easeOutBack,
  easeOutElastic,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// Unified key-light tilt for the whole module (top-left), reused by every glint.
const KEY_LIGHT = -Math.PI / 4;

// ── 1. Leaf ──────────────────────────────────────────────────────────────────
// Was: wagged about its own centre with stuck-on highlights. Now: the whole
// leaf hinges from the STEM BASE (no longer a welded whole-sprite spin), the
// blade TIP curls on its own lagging phase (cantilever follow-through), and the
// blade TWISTS edge-on (horizontal squash) as it turns into the breeze. The dew
// is a demoted glint sheen along the midrib.
function animLeaf(ctx: CanvasRenderingContext2D, t: number): void {
  // Re-frame: was off ≈ (-1.6, +1.8) → nudge right & up.
  ctx.save();
  ctx.translate(1.6, -1.8);

  const sway = Math.sin(t * 1.1) * 0.16; // primary hinge at the stem base
  const tipCurl = Math.sin(t * 1.1 - 0.7) * 0.5; // cantilever tip lags the base
  const twist = 1 - Math.abs(Math.sin(t * 1.1)) * 0.14; // edge-on horizontal squash

  // Contact shadow at the stem base; shrinks a touch as the blade lifts away.
  groundShadow(ctx, sway * 8, 22, 11, 3.2, Math.abs(sway) * 18, 0.2);

  // Hinge the whole leaf from the base of the stem (≈ y 22).
  ctx.translate(0, 22);
  ctx.rotate(sway);
  ctx.translate(0, -22);

  // Stem — slight bow that follows the sway.
  ctx.strokeStyle = "#3a5a14";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(-1 + sway * 6, 12, 0, 4);
  ctx.stroke();

  // Blade — twist about the midrib and curl the tip. Drawn in a local frame
  // pivoting at the blade base (0,4); the tip control points carry `tipCurl`.
  ctx.save();
  ctx.translate(0, 4);
  ctx.scale(twist, 1); // edge-on twist
  ctx.translate(0, -4);
  const curlX = tipCurl * 6; // tip leans sideways
  const curlY = tipCurl * 2; // and lifts a hair

  const bladePath = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(0, 4);
    c.bezierCurveTo(-16, -2, -12 + curlX, -20 + curlY, 0 + curlX, -22 + curlY);
    c.bezierCurveTo(12 + curlX, -20 + curlY, 16, -2, 0, 4);
    c.closePath();
  };

  const blade = ctx.createLinearGradient(-12, 0, 12, -6);
  blade.addColorStop(0, "#9ed85a");
  blade.addColorStop(0.5, "#4a9020");
  blade.addColorStop(1, "#27560e");
  ctx.fillStyle = blade;
  bladePath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Veins + demoted dewy sheen — clipped to the blade.
  ctx.save();
  bladePath(ctx);
  ctx.clip();
  ctx.strokeStyle = "rgba(31,58,8,0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.lineTo(curlX, -21 + curlY);
  ctx.stroke();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = "rgba(31,58,8,0.5)";
  for (let i = 0; i < 5; i++) {
    const y = -1 - i * 4;
    const cx = curlX * ((i + 1) / 6);
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(-8 + i * 0.8 + cx, y - 5);
    ctx.moveTo(cx, y);
    ctx.lineTo(8 - i * 0.8 + cx, y - 5);
    ctx.stroke();
  }
  // Feathered specular sheen travelling up the blade (was a hard radial blob).
  glint(ctx, loopPhase(t, 3.4), { span: 16, width: 5, angle: KEY_LIGHT, intensity: 0.26, length: 34, warm: true });
  ctx.restore();
  ctx.restore();

  // Dew bead near the top-left (the key-lit side) — gentle living glint.
  const dew = 0.55 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
  sparkle(ctx, -4 + curlX * 0.5, -8 + curlY, 2.0 + 0.4 * Math.sin(t * 2.2), dew, "235,255,225");
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(5, -12, 1.6, 5, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ── 2. Feather ───────────────────────────────────────────────────────────────
// Was: a smooth balloon vane that tipped/slid as one piece. Now: the vane is
// parted into BARBS that a traveling ripple runs down (each barb lags its
// neighbour), the whole plume floats with an EDGE-ON flip (horizontal squash),
// and the rachis bends to match.
function animFeather(ctx: CanvasRenderingContext2D, t: number): void {
  // Re-frame: was off ≈ (-1.2, +3.0).
  ctx.save();
  ctx.translate(1.2, -3.0);

  const floatY = breathe(t, 3.0, 1.6); // slow rise/fall
  const driftX = breathe(t, 4.4, 1.8, 0, 0.2);
  const tilt = Math.sin(t * 0.9) * 0.12 + Math.sin(t * 1.7) * 0.04;
  const flip = 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.7)); // edge-on flip

  // Shadow drops away and shrinks as the feather floats up.
  groundShadow(ctx, 2, 22, 11, 3, floatY + 4, 0.18);

  ctx.translate(driftX, floatY);
  ctx.rotate(0.32 + tilt);
  ctx.scale(flip, 1); // catch the air edge-on

  const vanePath = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(0, -22);
    c.bezierCurveTo(-11, -12, -10, 6, -4, 18);
    c.bezierCurveTo(0, 22, 4, 22, 8, 16);
    c.bezierCurveTo(11, 4, 9, -12, 0, -22);
    c.closePath();
  };

  const vane = ctx.createLinearGradient(-9, -20, 9, 18);
  vane.addColorStop(0, "#cfeaff");
  vane.addColorStop(0.5, "#7ab4e8");
  vane.addColorStop(1, "#3a6aa8");
  ctx.fillStyle = vane;
  vanePath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#2a4a78";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Barbs — a traveling wave runs down the vane so the edge ripples (each barb
  // tip displaced on a phase delayed by its position). Demoted sheen on top.
  ctx.save();
  vanePath(ctx);
  ctx.clip();
  ctx.strokeStyle = "rgba(42,74,120,0.5)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 16; i++) {
    const u = i / 15;
    const y = -20 + i * 2.6;
    const lean = 6 - i * 0.15;
    // Traveling ripple: barb tips flick on a wave moving root→tip.
    const wob = Math.sin(t * 3.2 - u * 5.5) * (0.8 + u * 1.4);
    ctx.beginPath();
    ctx.moveTo(0.5, y + 2);
    ctx.lineTo(-9, y - lean + wob);
    ctx.moveTo(-0.5, y + 2);
    ctx.lineTo(9, y - lean - wob);
    ctx.stroke();
  }
  glint(ctx, loopPhase(t, 3.6), { span: 11, width: 5, angle: KEY_LIGHT, intensity: 0.24, length: 44 });
  ctx.restore();

  // Central quill (rachis) — bends slightly with the ripple lead.
  const rb = Math.sin(t * 3.2) * 0.8;
  ctx.strokeStyle = "#f4faff";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.quadraticCurveTo(1 + rb, 0, 1, 20);
  ctx.stroke();
  ctx.strokeStyle = "rgba(58,106,168,0.7)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.quadraticCurveTo(1 + rb, 0, 1, 20);
  ctx.stroke();
  // Bare quill tip.
  ctx.strokeStyle = "#cfe4f8";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(1, 18);
  ctx.lineTo(3, 24);
  ctx.stroke();
  ctx.restore();
}

// ── 3. Clover ────────────────────────────────────────────────────────────────
// Was: frozen leaflets with only a wash moving. Now: a luck-wash sweeps the
// cross and each leaflet POPS (scale overshoot via `easeOutBack`) as the wash
// reaches it, with a tiny lag-wobble; the lucky-sparkle fires as the wash
// completes the loop.
function animClover(ctx: CanvasRenderingContext2D, t: number): void {
  // Re-frame: was off ≈ (+0.1, +4.5) → lift up.
  ctx.save();
  ctx.translate(-0.1, -4.5);

  const period = 2.8;
  const wash = loopPhase(t, period); // 0..1 sweeps leaflet → leaflet

  groundShadow(ctx, 0, 22, 13, 3.3, 0, 0.2);

  // Stem — gentle bow.
  ctx.strokeStyle = "#3a6818";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(-2 + Math.sin(t * 1.3) * 1.2, 8, 0, -1);
  ctx.stroke();

  // Each leaflet owns a slot in the wash; it pops as the wash crosses its slot.
  const drawLeaflet = (angle: number, slot: number): void => {
    // Distance (0..1) from the wash to this leaflet's slot, wrapped.
    let d = wash - slot / 4;
    d = ((d % 1) + 1) % 1;
    // A short pop window right after the wash hits: anticipation dip → overshoot.
    const hit = d < 0.34 ? Math.sin((d / 0.34) * Math.PI) : 0;
    const pop = 1 + easeOutBack(clamp01(hit), 2.4) * 0.12 * hit;
    const wobble = Math.sin(t * 1.8 - slot * 1.6) * 0.05;
    const shimmer = hit;

    ctx.save();
    ctx.rotate(angle + wobble);
    // Pop from the leaflet's outer tip so it "blooms" outward.
    ctx.translate(0, -2);
    ctx.scale(pop, pop);
    ctx.translate(0, 2);

    const grad = ctx.createRadialGradient(0, -11, 2, 0, -8, 12);
    grad.addColorStop(0, "#9ee84a");
    grad.addColorStop(0.6, "#46a01a");
    grad.addColorStop(1, "#246008");
    ctx.fillStyle = grad;
    const leafPath = (c: CanvasRenderingContext2D): void => {
      c.beginPath();
      c.moveTo(0, -2);
      c.bezierCurveTo(-9, -4, -11, -16, -4, -16);
      c.bezierCurveTo(-1.5, -16, 0, -13, 0, -13);
      c.bezierCurveTo(0, -13, 1.5, -16, 4, -16);
      c.bezierCurveTo(11, -16, 9, -4, 0, -2);
      c.closePath();
    };
    leafPath(ctx);
    ctx.fill();
    ctx.strokeStyle = "#1f4006";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Luck-wash brightening as the pop fires — clipped to the leaflet.
    if (shimmer > 0.02) {
      ctx.save();
      leafPath(ctx);
      ctx.clip();
      ctx.fillStyle = `rgba(225,255,185,${0.5 * shimmer})`;
      ctx.beginPath();
      ctx.ellipse(0, -9, 9, 9, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(220,255,180,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(0, -13);
    ctx.stroke();
    ctx.restore();
  };
  drawLeaflet(-Math.PI / 4, 0);
  drawLeaflet(Math.PI / 4, 1);
  drawLeaflet(Math.PI * 3 / 4, 2);
  drawLeaflet(-Math.PI * 3 / 4, 3);

  // Centre node.
  ctx.fillStyle = "#2e5410";
  ctx.beginPath();
  ctx.arc(0, -1, 2.2, 0, TAU);
  ctx.fill();

  // Lucky sparkle — fires as the wash completes the circuit (clean 4-point star).
  const luck = beat(t, period, 0.3, 0.0);
  sparkle(ctx, -7, -9, 1.6 + 1.0 * luck, 0.45 + 0.5 * luck, "255,255,235");
  ctx.restore();
}

// ── 4. Dewdrop ───────────────────────────────────────────────────────────────
// Was: a good drip cycle but the body barely jiggled and never necked. Now: the
// body SQUASH-STRETCHES (jiggly water), a real surface-tension NECK pinches the
// bottom just before the drop detaches, and the released drop lands into an
// expanding ground RIPPLE.
function animDewdrop(ctx: CanvasRenderingContext2D, t: number): void {
  // Re-frame: was off ≈ (0, +2.1).
  ctx.save();
  ctx.translate(0, -2.1);

  const period = 2.6;
  const phase = loopPhase(t, period); // 0..1
  const wobbleX = Math.sin(t * 2.0) * 0.6;

  // Jiggle: a slow body squash + a faster surface ripple (water never sits still).
  const jig = Math.sin(t * 2.6) * 0.05 + Math.sin(t * 4.3) * 0.025;
  const bodyW = 1 + jig;
  const bodyH = 1 - jig * 0.8;

  // Drip stages: swell (0..0.4) → neck/pinch (0.4..0.55) → detach & fall (>0.55).
  const swell = easeInOutSine(clamp01(phase / 0.4)) * 2.4;
  // Surface tension: the neck pinches inward right before release.
  const neckU = clamp01((phase - 0.38) / 0.18);
  const pinch = phase < 0.56 ? Math.sin(neckU * Math.PI) * 4.0 : 0; // px inward at the waist
  const sag = phase < 0.56 ? neckU * 5 : 0; // the bead droops on its neck

  groundShadow(ctx, 0, 22, 10, 3, 0, 0.22);

  // Expanding ripple where the previous drop landed (decoupled half-cycle so a
  // ring is always present somewhere → reads continuous).
  const rip = loopPhase(t, period, 0.5);
  if (rip > 0.02) {
    const rr = 3 + rip * 12;
    const ra = (1 - rip) * 0.4;
    ctx.strokeStyle = `rgba(150,210,235,${ra})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 23, rr, rr * 0.34, 0, 0, TAU);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(wobbleX, 0);
  // Squash about the bottom contact so the top stays put.
  ctx.translate(0, 22);
  ctx.scale(bodyW, bodyH);
  ctx.translate(0, -22);

  // Droplet body — the waist (±14 at y≈8) pulls in by `pinch`, bottom swells.
  const body = ctx.createRadialGradient(-5, 4, 2, 0, 8, 22);
  body.addColorStop(0, "#d8f4ff");
  body.addColorStop(0.4, "#7ec8ec");
  body.addColorStop(0.8, "#3a90c8");
  body.addColorStop(1, "#1f5a8a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.bezierCurveTo(-3, -10, -14 + pinch, -2, -14 + pinch, 8);
  ctx.bezierCurveTo(-14 + pinch * 1.4, 18, -6, 22 + swell + sag, 0, 22 + swell + sag);
  ctx.bezierCurveTo(6, 22 + swell + sag, 14 - pinch * 1.4, 18, 14 - pinch, 8);
  ctx.bezierCurveTo(14 - pinch, -2, 3, -10, 0, -20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(20,70,110,0.7)";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Inner refraction rim.
  ctx.strokeStyle = "rgba(216,244,255,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 9, 9, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  // Key-lit specular (top-left) — drifts gently with the jiggle.
  const hx = -5 + Math.sin(t * 1.5) * 1.0;
  const hy = 3 + Math.cos(t * 1.7) * 0.9;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.0, 7, -0.35, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(4, 12, 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-2, -8, 1.3, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Released drop — detaches after the neck snaps, falls, stretching then fading
  // just before the next ripple appears.
  if (phase > 0.56) {
    const f = (phase - 0.56) / 0.44; // 0..1
    const dropY = 22 + f * 14;
    const r = 2.6 * (1 - f * 0.4);
    const sx = wobbleX;
    const stretch = 1 + f * 0.5; // teardrop elongates as it accelerates
    const alpha = (1 - f) * (1 - f);
    const dg = ctx.createRadialGradient(sx - r * 0.4, dropY - r * 0.4, 0.5, sx, dropY, r);
    dg.addColorStop(0, `rgba(216,244,255,${0.95 * alpha})`);
    dg.addColorStop(0.7, `rgba(122,200,236,${0.85 * alpha})`);
    dg.addColorStop(1, `rgba(31,90,138,${0.7 * alpha})`);
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(sx, dropY - r * 1.4 * stretch);
    ctx.bezierCurveTo(sx - r, dropY - r * 0.4, sx - r, dropY + r, sx, dropY + r);
    ctx.bezierCurveTo(sx + r, dropY + r, sx + r, dropY - r * 0.4, sx, dropY - r * 1.4 * stretch);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ── 5. Spiderweb ─────────────────────────────────────────────────────────────
// Was: a rigid octagon scale-shimmering as one ring. Now: a wobble TRAVELS
// outward from the hub (each ring lags the one inside it, so the web flexes like
// a trampoline), and a strand TWANGS when a captured dewdrop drops.
function animSpiderweb(ctx: CanvasRenderingContext2D, t: number): void {
  const spokes = 8;
  const radius = 22;

  // Dark vignette backdrop (web hangs in air — no ground shadow).
  const back = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
  back.addColorStop(0, "rgba(20,30,40,0.45)");
  back.addColorStop(1, "rgba(20,30,40,0)");
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, TAU);
  ctx.fill();

  // A breathing-amplitude wave travels hub→rim: a point at radius `r` is pushed
  // along its spoke by `radialWave(r)`, so rings flex out of phase.
  const radialWave = (r: number): number => {
    const u = r / radius;
    return Math.sin(t * 2.4 - u * 4.5) * (0.4 + u * 1.6);
  };

  // Twang: one strand snaps taut on a periodic beat (as if a drop hit it).
  const twangIdx = 2; // the spoke that twangs
  const twang = beat(t, 3.4, 0.22);

  const nodeX = (a: number, r: number): number => {
    const dr = r + radialWave(r);
    return Math.cos(a) * dr;
  };
  const nodeY = (a: number, r: number): number => {
    const dr = r + radialWave(r);
    return Math.sin(a) * dr;
  };

  // Radial threads — alpha shimmers faintly; geometry rides the traveling wave.
  ctx.strokeStyle = "rgba(232,242,252,0.8)";
  ctx.lineWidth = 0.9;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * TAU - Math.PI / 2;
    // Twang the chosen spoke: a sideways sag that snaps back.
    const kick = i === twangIdx ? Math.sin(twang * Math.PI) * 3.5 : 0;
    const perpX = -Math.sin(a) * kick;
    const perpY = Math.cos(a) * kick;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Mid-thread bows out on the twang (quadratic control at the midpoint).
    const ex = nodeX(a, radius);
    const ey = nodeY(a, radius);
    ctx.quadraticCurveTo(ex * 0.5 + perpX, ey * 0.5 + perpY, ex, ey);
    ctx.stroke();
  }

  // Spiral rings — each vertex rides the wave, so the spiral undulates.
  ctx.strokeStyle = "rgba(220,235,248,0.62)";
  ctx.lineWidth = 0.7;
  for (let ring = 1; ring <= 5; ring++) {
    const r = (ring / 5) * radius;
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * TAU - Math.PI / 2;
      const x = nodeX(a, r);
      const y = nodeY(a, r);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const pa = ((i - 1) / spokes) * TAU - Math.PI / 2;
        const sagR = r * 0.86 + radialWave(r * 0.86);
        const mx = (Math.cos(a) + Math.cos(pa)) * 0.5 * sagR;
        const my = (Math.sin(a) + Math.sin(pa)) * 0.5 * sagR;
        ctx.quadraticCurveTo(mx, my, x, y);
      }
    }
    ctx.stroke();
  }

  // Bright central hub knot.
  ctx.fillStyle = "rgba(245,250,255,0.85)";
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, TAU);
  ctx.fill();

  // Clinging dewdrops — ride the local wave; one detaches & falls on the twang
  // (the cause of the strand twang), each catches the unified light as a sparkle.
  const drawDew = (baseA: number, r: number, rad: number, phase: number): void => {
    const dr = r + radialWave(r);
    const dx = Math.cos(baseA) * dr;
    const dy = Math.sin(baseA) * dr;
    const tw = 0.5 + 0.5 * Math.sin(t * 2.6 + phase);
    const g = ctx.createRadialGradient(dx - rad * 0.4, dy - rad * 0.4, 0.5, dx, dy, rad);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.5, "rgba(160,210,240,0.85)");
    g.addColorStop(1, "rgba(60,140,190,0.7)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(dx, dy, rad * (0.9 + 0.12 * tw), 0, TAU);
    ctx.fill();
    sparkle(ctx, dx - rad * 0.3, dy - rad * 0.3, rad * 0.5, 0.5 + 0.4 * tw, "235,248,255");
  };
  // The dewdrop on the twanging spoke breaks loose and falls during the twang.
  const twangA = (twangIdx / spokes) * TAU - Math.PI / 2;
  if (twang < 0.02) {
    drawDew(twangA, 15, 2.4, 0); // hangs at rest most of the cycle
  } else {
    const f = twang;
    const dr = 15 + radialWave(15);
    const fx = Math.cos(twangA) * dr;
    const fy = Math.sin(twangA) * dr + f * 16;
    const a = (1 - f) * 0.9;
    const rad = 2.4 * (1 - f * 0.3);
    const g = ctx.createRadialGradient(fx - rad * 0.4, fy - rad * 0.4, 0.5, fx, fy, rad);
    g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
    g.addColorStop(0.5, `rgba(160,210,240,${0.85 * a})`);
    g.addColorStop(1, `rgba(60,140,190,${0.7 * a})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx, fy, rad, 0, TAU);
    ctx.fill();
  }
  drawDew(Math.PI * 0.18, 18, 2.0, 2.1);
  drawDew(Math.PI * 0.62, 14, 1.8, 4.0);
}

// ── 6. Cattail ───────────────────────────────────────────────────────────────
// Was: head/reed/blades swaying as one rigid body. Now: the whole plant hinges
// at the STEM BASE, but the heavy sausage HEAD lags the reed (follow-through /
// overlap — it whips a beat behind the stalk), the blades trail on their own
// phases, and fluff sheds off the head at the SWAY PEAKS.
function animCattail(ctx: CanvasRenderingContext2D, t: number): void {
  // Re-frame: was off ≈ (0, -2.7) → it sat high, so nudge DOWN.
  ctx.save();
  ctx.translate(0, 2.7);

  const sway = Math.sin(t * 1.3) * 0.10 + Math.sin(t * 2.1) * 0.03; // reed lead
  const headLag = Math.sin(t * 1.3 - 0.9) * 0.13; // heavy head lags the reed
  const swayVel = Math.cos(t * 1.3); // ±1, peaks where fluff sheds

  groundShadow(ctx, sway * 10, 22, 12, 3.4, Math.abs(sway) * 14, 0.2);

  // Hinge the whole plant at the base of the reed (y≈22).
  ctx.translate(0, 22);
  ctx.rotate(sway);
  ctx.translate(0, -22);

  // Reed blades arcing up — each trails on its own phase (overlap).
  const drawBlade = (lean: number, len: number, w: number, ph: number): void => {
    const trail = Math.sin(t * 1.3 - ph) * 0.18;
    const l = lean + trail * 4;
    const grad = ctx.createLinearGradient(0, 22, l * 14, 22 - len);
    grad.addColorStop(0, "#5a8a26");
    grad.addColorStop(1, "#9ed85a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(l * 10, 22 - len * 0.6, l * 14, 22 - len);
    ctx.quadraticCurveTo(l * 9 + w, 22 - len * 0.55, w, 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e4810";
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  drawBlade(-1, 40, 2, 0.0);
  drawBlade(1, 36, 2, 1.2);
  drawBlade(-0.5, 46, 2, 2.4);

  // Main stem (reed) — bows toward the head's lagging lean so the join stays put.
  const bow = headLag * 10;
  ctx.strokeStyle = "#6a7a2a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(1 + bow * 0.5, 4, bow, -6);
  ctx.stroke();
  ctx.strokeStyle = "#a8b850";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(1 + bow * 0.5, 4, bow, -6);
  ctx.stroke();

  // Head — pivots about the top of the reed (≈ 0,-6) with its OWN lagging angle,
  // so the mass visibly whips behind the stalk instead of welding to it.
  // Pivot at the reed top; the head path below is authored in this local frame
  // (the neck sits at y≈+2, the tip at y≈-17), so the mass swings about the join.
  ctx.save();
  ctx.translate(bow, -6);
  ctx.rotate(headLag);

  const head = ctx.createLinearGradient(-6, 0, 6, 0);
  head.addColorStop(0, "#a06a2e");
  head.addColorStop(0.5, "#6a4012");
  head.addColorStop(1, "#3a2006");
  ctx.fillStyle = head;
  const headPath = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(0, 2);
    c.bezierCurveTo(-7, 1, -7, -14, 0, -17);
    c.bezierCurveTo(7, -14, 7, 1, 0, 2);
    c.closePath();
  };
  headPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#2a1604";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Velvety striations — clipped.
  ctx.save();
  headPath(ctx);
  ctx.clip();
  ctx.strokeStyle = "rgba(42,22,4,0.4)";
  ctx.lineWidth = 0.6;
  for (let y = -15; y <= 0; y += 2) {
    ctx.beginPath();
    ctx.moveTo(-7, y);
    ctx.lineTo(7, y);
    ctx.stroke();
  }
  // Demoted warm sheen sweeping the head (key light).
  glint(ctx, loopPhase(t, 4.2), { span: 7, width: 4, angle: KEY_LIGHT, intensity: 0.22, length: 22, warm: true });
  ctx.restore();

  // Head highlight (top-left).
  ctx.fillStyle = "rgba(220,170,110,0.5)";
  ctx.beginPath();
  ctx.ellipse(-2.5, -7, 1.6, 7, 0, 0, TAU);
  ctx.fill();
  // Tip spike.
  ctx.strokeStyle = "#a8b850";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(1, -24);
  ctx.stroke();
  ctx.restore();

  // Fluff seeds — shed off the head at the sway PEAKS (|velocity| high), drifting
  // up and outward. Gated by a peak window so it's an event, not a constant emit.
  const peak = Math.abs(swayVel); // 1 at the swing extremes
  const seeds = 4;
  for (let i = 0; i < seeds; i++) {
    const p = loopPhase(t, 3.2, i / seeds); // 0..1 lifetime, staggered
    // Emphasise seeds whose lifetime started near a sway peak.
    const born = clamp01(peak * 1.2);
    const dir = i % 2 === 0 ? 1 : -1;
    const sx0 = dir * 3 + Math.sin(i * 2.1) * 2;
    const sy0 = -16 + (i % 3) * 4;
    const x = sx0 + dir * p * 16 + Math.sin(p * 6 + i) * 2;
    const y = sy0 - p * 24;
    const alpha = Math.sin(p * Math.PI) * 0.85 * lerp(0.35, 1, born);
    if (alpha <= 0.01) continue;
    ctx.fillStyle = `rgba(238,228,200,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(238,228,200,${alpha * 0.7})`;
    ctx.lineWidth = 0.6;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + p * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── 7. Mushroom cluster ──────────────────────────────────────────────────────
// Was: a 2% breathe (invisible) sitting too low. Now: re-centred up, each cap
// gets its OWN staggered squash-BOB (springy settle via `easeOutElastic`), the
// moss mound breathes under them, and a spore PUFF bursts off the caps on an
// occasional beat (rest → moment) instead of a constant trickle.
function animMushroomCluster(ctx: CanvasRenderingContext2D, t: number): void {
  // Re-frame: was off ≈ (0, +5.9) → lift well up.
  ctx.save();
  ctx.translate(0, -5.9);

  const moundBreathe = 1 + Math.sin(t * 1.2) * 0.03;

  groundShadow(ctx, 0, 22, 20, 4.3, 0, 0.24);

  // Mossy base mound — breathes subtly.
  ctx.save();
  ctx.translate(0, 19);
  ctx.scale(1, moundBreathe);
  ctx.translate(0, -19);
  const moss = ctx.createRadialGradient(0, 18, 3, 0, 20, 22);
  moss.addColorStop(0, "#6fa838");
  moss.addColorStop(0.7, "#3a6818");
  moss.addColorStop(1, "#23440c");
  ctx.fillStyle = moss;
  ctx.beginPath();
  ctx.ellipse(0, 19, 19, 7, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "rgba(150,210,90,0.7)";
  for (let i = 0; i < 9; i++) {
    const x = -15 + i * 3.6;
    const y = 16 + Math.sin(i * 1.7) * 3;
    ctx.beginPath();
    ctx.arc(x, y, 0.9, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Toadstools — each bobs on its own phase: a periodic squash-settle that the
  // cap springs back from (elastic), so the cluster jostles rather than pulsing.
  const toadstool = (cx: number, baseY: number, scale: number, phaseOff: number, period: number): void => {
    const bobPhase = loopPhase(t, period, phaseOff);
    // Quick dip-and-spring: squash low in the first third, elastic back to rest.
    const settle = bobPhase < 0.34 ? 1 - easeOutElastic(bobPhase / 0.34) : 0;
    const squashY = 1 - settle * 0.14; // shorter when it dips
    const squashX = 1 + settle * 0.10; // wider when it dips
    const lift = -settle * 1.5; // the cap dips down slightly

    ctx.save();
    ctx.translate(cx, baseY);
    ctx.scale(squashX, squashY);
    ctx.translate(-cx, -baseY);
    // Stem.
    const stem = ctx.createLinearGradient(cx - 4 * scale, 0, cx + 4 * scale, 0);
    stem.addColorStop(0, "#f4e6c4");
    stem.addColorStop(0.5, "#e0c890");
    stem.addColorStop(1, "#a88a50");
    ctx.fillStyle = stem;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * scale, baseY - 12 * scale);
    ctx.bezierCurveTo(cx - 5 * scale, baseY - 2, cx - 3 * scale, baseY, cx, baseY);
    ctx.bezierCurveTo(cx + 3 * scale, baseY, cx + 5 * scale, baseY - 2, cx + 4 * scale, baseY - 12 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#6a522a";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Cap — brown dome (drops a hair into the squash).
    const capY = baseY + lift;
    const cap = ctx.createRadialGradient(cx - 3 * scale, capY - 16 * scale, 1, cx, capY - 12 * scale, 12 * scale);
    cap.addColorStop(0, "#c89860");
    cap.addColorStop(0.6, "#8a5a28");
    cap.addColorStop(1, "#4a2c0a");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * scale, capY - 11 * scale);
    ctx.bezierCurveTo(cx - 11 * scale, capY - 24 * scale, cx + 11 * scale, capY - 24 * scale, cx + 10 * scale, capY - 11 * scale);
    ctx.bezierCurveTo(cx + 6 * scale, capY - 8 * scale, cx - 6 * scale, capY - 8 * scale, cx - 10 * scale, capY - 11 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e1a04";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Cap highlight band (top-left key).
    ctx.strokeStyle = "rgba(255,230,180,0.5)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx - 7 * scale, capY - 16 * scale);
    ctx.bezierCurveTo(cx - 3 * scale, capY - 21 * scale, cx + 3 * scale, capY - 21 * scale, cx + 7 * scale, capY - 16 * scale);
    ctx.stroke();
    // Pale spots.
    ctx.fillStyle = "rgba(248,236,206,0.85)";
    ctx.beginPath();
    ctx.arc(cx - 3 * scale, capY - 16 * scale, 1.6 * scale, 0, TAU);
    ctx.arc(cx + 4 * scale, capY - 14 * scale, 1.3 * scale, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
  toadstool(8, 15, 0.7, 0.0, 2.6);
  toadstool(-7, 18, 1.0, 0.45, 3.2);
  toadstool(5, 19, 0.85, 0.78, 2.9);

  // Spore PUFF — a burst off the caps on an occasional beat. Most of the cycle
  // is quiet; then a ring of specks lifts and fades.
  const puff = beat(t, 5.0, 0.4);
  if (puff > 0.01) {
    const specks = 7;
    for (let i = 0; i < specks; i++) {
      const a = (i / specks) * TAU + i * 0.7;
      const spread = 3 + puff * 9;
      const ox = -2 + Math.cos(a) * spread;
      const oy = -2 + Math.sin(a) * spread * 0.7 - puff * 8;
      const alpha = puff * (1 - puff) * 2.6 * 0.7;
      if (alpha <= 0.01) continue;
      ctx.fillStyle = `rgba(220,210,170,${alpha})`;
      ctx.beginPath();
      ctx.arc(ox, oy, 0.9, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ── 8. Seashell ──────────────────────────────────────────────────────────────
// Was: 100% static body under a flat sheen wipe. Now: a LIVING CLAM — the fan
// OPENS and CLOSES at the hinge (the top rim lifts away from the base on an
// eased breath), the scalloped rim LOBES ripple as it gapes, and a pearl glow
// shows in the gap. Glint demoted to a feathered sheen on the breath.
function animSeashell(ctx: CanvasRenderingContext2D, t: number): void {
  // Re-frame: was off ≈ (0, +2.8).
  ctx.save();
  ctx.translate(0, -2.8);

  // Breath: dwell mostly-closed, ease open, settle closed (pingPong is seamless).
  const open = pingPong(t, 3.6); // 0 closed .. 1 open
  const gape = easeInOutSine(open) * 0.42; // radians the upper valve lifts at the hinge
  const lobeRipple = open; // rim ripples scale with how far it gapes

  groundShadow(ctx, 0, 22, 18, 4, gape * 6, 0.22);

  // Lower (fixed) valve — the base half of the fan stays planted.
  const baseGrad = ctx.createLinearGradient(0, -2, 0, 20);
  baseGrad.addColorStop(0, "#f3bf95");
  baseGrad.addColorStop(0.5, "#e8b48a");
  baseGrad.addColorStop(1, "#d08858");
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.bezierCurveTo(-20, 12, -20, 2, -14, -2);
  ctx.bezierCurveTo(-6, -5, 6, -5, 14, -2);
  ctx.bezierCurveTo(20, 2, 20, 12, 0, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a4a20";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pearl glow peeking out of the gap as the shell opens.
  if (open > 0.05) {
    const pearl = ctx.createRadialGradient(0, 4, 1, 0, 4, 12);
    pearl.addColorStop(0, `rgba(255,250,240,${0.5 * open})`);
    pearl.addColorStop(1, "rgba(255,240,225,0)");
    ctx.fillStyle = pearl;
    ctx.beginPath();
    ctx.ellipse(0, 5, 9, 5 * open + 1, 0, 0, TAU);
    ctx.fill();
  }

  // Upper valve — HINGES open about the hinge knob (≈ 0,17). Its scalloped rim
  // lobes ripple outward as it gapes.
  ctx.save();
  ctx.translate(0, 17);
  ctx.rotate(-gape); // lift the fan away from the base
  ctx.translate(0, -17);

  const upperPath = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(0, 17);
    c.bezierCurveTo(-20, 9, -22, -8, -16, -16);
    const lobes = 6;
    for (let i = 0; i <= lobes; i++) {
      const tt = i / lobes;
      const x = -16 + tt * 32;
      // Rim ripple: each lobe flexes on a traveling wave when the shell gapes.
      const flex = Math.sin(t * 5 - tt * 6) * 1.6 * lobeRipple;
      const y = -16 - Math.sin(tt * Math.PI) * 4 + (i % 2 === 0 ? 0 : 2.5) - flex;
      c.lineTo(x, y);
    }
    c.bezierCurveTo(22, -8, 20, 9, 0, 17);
    c.closePath();
  };

  const body = ctx.createLinearGradient(0, -18, 0, 18);
  body.addColorStop(0, "#fff0e0");
  body.addColorStop(0.5, "#f8c8a0");
  body.addColorStop(1, "#d8966a");
  ctx.fillStyle = body;
  upperPath(ctx);
  ctx.fill();
  ctx.strokeStyle = "#8a4a20";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Radiating ridges + demoted pearly sheen — clipped to the upper valve.
  ctx.save();
  upperPath(ctx);
  ctx.clip();
  ctx.strokeStyle = "rgba(138,74,32,0.5)";
  ctx.lineWidth = 1.3;
  for (let i = -5; i <= 5; i++) {
    const a = (i / 5) * (Math.PI * 0.42);
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(Math.sin(a) * 24, 16 - Math.cos(a) * 38);
    ctx.stroke();
  }
  glint(ctx, loopPhase(t, 3.8), { span: 18, width: 6, angle: KEY_LIGHT, intensity: 0.26, length: 40 });
  ctx.restore();

  // Pearly highlights on the upper valve (top-left key).
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, -4, 2.4, 7, 0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(6, -8, 1.6, 5, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Hinge knob (on the fixed base, the pivot of the open/close).
  ctx.fillStyle = "#c87a40";
  ctx.beginPath();
  ctx.ellipse(0, 17, 5, 3, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8a4a20";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // A clean sparkle pings off the wet rim at the peak of the open.
  sparkle(ctx, -3, -10, 1.5, 0.85 * easeInOutSine(open), "255,250,245");
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  nature_leaf: animLeaf,
  nature_feather: animFeather,
  nature_clover: animClover,
  nature_dewdrop: animDewdrop,
  nature_spiderweb: animSpiderweb,
  nature_cattail: animCattail,
  nature_mushroom_cluster: animMushroomCluster,
  nature_seashell: animSeashell,
};
