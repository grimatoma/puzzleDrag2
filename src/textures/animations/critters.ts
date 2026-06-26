// Animated critter icons — same silhouettes/palettes as
// src/textures/categories/critters.ts, but alive. Each fn redraws the WHOLE
// icon at elapsed time `t` (seconds), origin-centred in a 64u design box with
// the ground baseline near y = 22 (positive y is DOWN).
//
// Motion theme: the module splits into BUSY fliers (bee, butterfly, dragonfly,
// firefly) whose wings actually articulate, and grounded CRAWLERS (ladybug,
// snail, ant, caterpillar) that deform their bodies. The first-draft idles were
// width-only wing squishes and rigid whole-sprite translations with amplitudes
// tuned far too small; this rebuild leads with real deformation — rotating wing
// hinges, a shell-open flash, a foot-only inchworm bunch — driven by eased,
// looping phase off `t` (so cycles tile exactly) with shadows coupled to the
// vertical motion via `groundShadow`. Glints/sparkles are demoted to secondary
// accents.

import {
  TAU,
  clamp01,
  lerp,
  loopPhase,
  pingPong,
  breathe,
  beat,
  easeInOutSine,
  windupOvershoot,
  groundShadow,
  glint,
  sparkle,
} from "./_anim.js";

// ---------------------------------------------------------------------------
// bug_bee — recentred up-left; the wings ROTATE about their root hinge (a real
// flap, not a width squish), the body does a hover squash synced to the bob,
// the fuzz tufts are short angled hairs (not a beige barcode fence), and the
// shadow shrinks as the bee rises.
function animBee(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 3.2) * 4.4; // tripled hover bob
  const drift = Math.sin(t * 1.3) * 2.4;
  // Hover squash: body bulges wide at the bottom of the bob, stretches tall at
  // the top (volume-preserving, secondary motion lagging the bob a touch).
  const squashAmt = Math.sin(t * 3.2 - 0.5) * 0.08;
  const sx = 1 + squashAmt;
  const sy = 1 - squashAmt;
  // Fast wing flap as a ROTATION angle, eased there-and-back so it never reads
  // as a linear metronome; full sweep so the membrane really lifts.
  const flap = (pingPong(t, 0.09) * 2 - 1) * 0.7; // ±0.7 rad about the hinge

  groundShadow(ctx, drift, 22, 13, 4, bob, 0.24);

  ctx.save();
  ctx.translate(2.1, -3.3); // re-frame: off was (-2.1, 3.3)
  ctx.translate(drift, bob);
  ctx.rotate(0.12 + Math.sin(t * 1.3) * 0.04);

  // Wings — hinge at the back-root (-2,-6); flap by rotating, not scaling width.
  ([-1, 1] as number[]).forEach((side) => {
    ctx.save();
    ctx.translate(-2, -6);
    ctx.scale(side, 1);
    ctx.rotate(-flap * side - 0.25 * side); // upstroke/downstroke about the root
    const wing = ctx.createLinearGradient(0, -8, 10, 0);
    wing.addColorStop(0, "rgba(230,245,255,0.7)");
    wing.addColorStop(1, "rgba(180,210,235,0.4)");
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(4, -12, 16, -14, 18, -6);
    ctx.bezierCurveTo(18, -1, 8, 2, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,150,180,0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(120,150,180,0.4)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.quadraticCurveTo(10, -8, 16, -6);
    ctx.stroke();
    ctx.restore();
  });

  // Body — fuzzy oval, squashing with the hover.
  ctx.save();
  ctx.translate(0, 4);
  ctx.scale(sx, sy);
  ctx.translate(0, -4);

  const body = ctx.createRadialGradient(-4, -2, 2, 0, 4, 16);
  body.addColorStop(0, "#ffe082");
  body.addColorStop(0.6, "#f5b400");
  body.addColorStop(1, "#a06a00");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 10, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2606";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Stripes (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 10, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = "#2a1c04";
  ([-2, 6] as number[]).forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, 4, 2.6, 11, 0, 0, TAU);
    ctx.fill();
  });
  // Fuzz tufts — short angled hairs along the upper back (clipped to the body
  // so they never form a free-floating fence). A few soft, slightly varied
  // strokes read as fuzz, not a barcode.
  ctx.strokeStyle = "rgba(255,240,180,0.55)";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  for (let i = -8; i <= 8; i += 4) {
    const lean = (i / 8) * 1.4; // fan outward from the crown
    ctx.beginPath();
    ctx.moveTo(i, -4);
    ctx.quadraticCurveTo(i + lean, -7.5, i + lean * 1.6, -9.5);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.restore();
  ctx.restore(); // end body squash

  // Stinger
  ctx.fillStyle = "#2a1c04";
  ctx.beginPath();
  ctx.moveTo(12, 4);
  ctx.lineTo(17, 4);
  ctx.lineTo(12, 7);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = "#2a1c04";
  ctx.beginPath();
  ctx.arc(-12, 1, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-13, 0, 1.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-13.4, 0.3, 0.9, 0, TAU);
  ctx.fill();

  // Antennae — spring twitch (overlapping, lags the bob).
  const ant = Math.sin(t * 6) * 1.4;
  ctx.strokeStyle = "#2a1c04";
  ctx.lineWidth = 1.2;
  ([-1.4, -3] as number[]).forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(-15, -2);
    ctx.quadraticCurveTo(-19, -7 + d, -20, -8 + d - ant);
    ctx.stroke();
  });
  ctx.fillStyle = "#2a1c04";
  ([[-20, -16], [-21, -11]] as Array<[number, number]>).forEach(([ax, ay]) => {
    ctx.beginPath();
    ctx.arc(ax, ay - ant, 1, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// bug_butterfly — wings foreshorten via tip-ROTATION about their root (a clap
// in perspective) and never collapse to a flat sliver; the wing roots lift on
// the upstroke so the silhouette opens like a real butterfly, with a gentle
// float and antennae follow-through. Palette is the existing two-tone orange.
function animButterfly(ctx: CanvasRenderingContext2D, t: number): void {
  const float = Math.sin(t * 1.8) * 4.6; // tripled vertical float
  // Flap envelope 0..1 (open) — eased there-and-back, kept off the floor so the
  // wing always has visible area (never a venetian-blind sliver).
  const open = pingPong(t, 0.42); // 0 = clapped up, 1 = spread flat
  const antBob = Math.sin(t * 4.0) * 2.2;

  groundShadow(ctx, 0, 22, 14 + open * 3, 4, -float, 0.22);

  ctx.save();
  ctx.translate(0, -1.4); // re-frame: off_y +1.4
  ctx.translate(0, float);

  // Each side's wing pair rotates about the body seam. At open=0 the wings are
  // raised/clapped (rotated up and foreshortened in width); at open=1 they lie
  // spread. Width foreshortens with cos of the fold angle but is floored so the
  // wing keeps body — the fix for the flatten-to-nothing flap.
  const fold = lerp(1.15, 0, open); // radians the wing is folded up
  const widen = lerp(0.34, 1, easeInOutSine(open)); // foreshortened width factor
  const rootLift = lerp(-5.5, 0, open); // roots ride up when clapped

  ([-1, 1] as number[]).forEach((side) => {
    ctx.save();
    ctx.translate(0, rootLift);
    ctx.scale(side, 1);
    ctx.rotate(-fold); // hinge the whole pair up about the seam
    ctx.scale(widen, 1); // foreshorten width (perspective), floored by `widen`
    // Upper wing
    const upper = ctx.createRadialGradient(8, -6, 2, 12, -4, 18);
    upper.addColorStop(0, "rgba(255,150,60,0.85)");
    upper.addColorStop(0.6, "rgba(230,90,30,0.7)");
    upper.addColorStop(1, "rgba(140,40,10,0.55)");
    ctx.fillStyle = upper;
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.bezierCurveTo(8, -22, 24, -20, 22, -6);
    ctx.bezierCurveTo(20, 0, 8, 2, 2, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a1808";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Lower wing
    const lower = ctx.createRadialGradient(8, 8, 2, 10, 10, 14);
    lower.addColorStop(0, "rgba(255,200,90,0.85)");
    lower.addColorStop(0.7, "rgba(220,120,40,0.7)");
    lower.addColorStop(1, "rgba(120,50,10,0.55)");
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.bezierCurveTo(8, 18, 20, 18, 18, 8);
    ctx.bezierCurveTo(14, 2, 6, 0, 2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a1808";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Spots
    ctx.fillStyle = "rgba(40,18,8,0.75)";
    ctx.beginPath(); ctx.arc(14, -8, 2.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 9, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,250,220,0.85)";
    ctx.beginPath(); ctx.arc(14, -8, 1, 0, TAU); ctx.fill();
    // Edge highlight — brightens as the wing spreads to the light.
    ctx.strokeStyle = `rgba(255,240,200,${0.4 + open * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, -16);
    ctx.quadraticCurveTo(18, -16, 20, -8);
    ctx.stroke();
    ctx.restore();
  });

  // Body — slim segmented
  const body = ctx.createLinearGradient(0, -10, 0, 14);
  body.addColorStop(0, "#5a4628");
  body.addColorStop(1, "#1c1408");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 2, 2.4, 11, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 0.7;
  for (let y = -6; y <= 10; y += 3) {
    ctx.beginPath();
    ctx.moveTo(-2, y);
    ctx.lineTo(2, y);
    ctx.stroke();
  }
  // Head
  ctx.fillStyle = "#1c1408";
  ctx.beginPath();
  ctx.arc(0, -11, 2.6, 0, TAU);
  ctx.fill();
  // Antennae — club tips bob with overlap.
  ctx.strokeStyle = "#1c1408";
  ctx.lineWidth = 1.1;
  ([-1, 1] as number[]).forEach((side) => {
    const tx = side * 8;
    const ty = -22 + antBob;
    ctx.beginPath();
    ctx.moveTo(side * 1, -12);
    ctx.quadraticCurveTo(side * 6, -20 + antBob * 0.5, tx, ty);
    ctx.stroke();
    ctx.fillStyle = "#1c1408";
    ctx.beginPath();
    ctx.arc(tx, ty, 1.2, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// bug_ladybug — recentred up; the two shell halves breathe open and shut in a
// CONTINUOUS gentle cycle (eased there-and-back, no frozen-dome rest), parting
// just enough to flash the translucent flight wings beneath, then easing closed
// again. Spots, seam and gloss are drawn in ONE pass on the unsplit dome (so
// nothing tears at the seam); only the halves themselves hinge. A small
// step-wobble keeps it grounded.
function animLadybug(ctx: CanvasRenderingContext2D, t: number): void {
  const wobble = Math.sin(t * 5.0) * 0.05;
  const stepBob = Math.abs(Math.sin(t * 5.0)) * 1.4; // bigger gait bob
  // Continuous open-close breath: eased 0..1 there-and-back so the shell never
  // sits frozen and the loop seam is smooth (no snap from dome back to split).
  const openPhase = pingPong(t, 2.4); // 0 shut .. 1 open .. 0 shut
  const open = openPhase * 0.6; // radians each half lifts (gentler than the old flash)
  const antTwitch = Math.sin(t * 9.0) * 1.8;

  groundShadow(ctx, 0, 22, 14, 4, stepBob, 0.24);

  ctx.save();
  ctx.translate(0, -4.5); // re-frame: off_y +4.5
  ctx.rotate(wobble);
  ctx.translate(0, -stepBob);

  // Head
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(0, -8, 6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff8e0";
  ([-2.4, 2.4] as number[]).forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, -10, 1.4, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = "#0a0e04";
  ([-2.4, 2.4] as number[]).forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, -10, 0.7, 0, TAU);
    ctx.fill();
  });

  // Antennae twitch
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 1.2;
  ([-1, 1] as number[]).forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 2, -12);
    ctx.lineTo(side * 4 + antTwitch, -16);
    ctx.stroke();
    ctx.fillStyle = "#1a1208";
    ctx.beginPath();
    ctx.arc(side * 4 + antTwitch, -16, 1, 0, TAU);
    ctx.fill();
  });

  // Legs — exaggerated alternating swing with the step.
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  ([[-13, 0], [-14, 8], [13, 0], [14, 8]] as Array<[number, number]>).forEach(([lx, ly], i) => {
    const swing = Math.sin(t * 5.0 + i * 1.6) * 2.6;
    ctx.beginPath();
    ctx.moveTo(lx < 0 ? -10 : 10, ly - 2);
    ctx.lineTo(lx + swing, ly);
    ctx.stroke();
  });

  // Flight wings revealed under the shell as it parts (translucent, buzzing).
  if (open > 0.04) {
    const buzz = Math.sin(t * 40) * 1.2;
    ([-1, 1] as number[]).forEach((side) => {
      ctx.save();
      ctx.translate(0, 2);
      ctx.scale(side, 1);
      const fw = ctx.createLinearGradient(0, 0, 16, 8);
      fw.addColorStop(0, `rgba(70,80,110,${0.55 * clamp01(openPhase)})`);
      fw.addColorStop(1, `rgba(160,180,210,${0.18 * clamp01(openPhase)})`);
      ctx.fillStyle = fw;
      ctx.beginPath();
      ctx.moveTo(1, -2);
      ctx.bezierCurveTo(10, 0 + buzz, 17, 8, 11, 16);
      ctx.bezierCurveTo(6, 12, 2, 6, 1, -2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  // Domed shell. Draw the two halves (so they can hinge apart), but keep all
  // surface detail registered to the WHOLE dome and drawn afterwards, so spots
  // and gloss never split at the seam.
  const drawHalf = (sign: number): void => {
    ctx.save();
    ctx.translate(0, 4);
    ctx.rotate(sign * open);
    ctx.translate(0, -4);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.arc(0, 4, 14, sign > 0 ? -Math.PI / 2 : Math.PI / 2, sign > 0 ? Math.PI / 2 : (3 * Math.PI) / 2, false);
    ctx.closePath();
    const shell = ctx.createRadialGradient(-4, -2, 2, 0, 4, 18);
    shell.addColorStop(0, "#ff6a5a");
    shell.addColorStop(0.6, "#d81818");
    shell.addColorStop(1, "#7a0808");
    ctx.fillStyle = shell;
    ctx.fill();
    ctx.strokeStyle = "#3a0408";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };
  drawHalf(-1);
  drawHalf(1);

  // Surface detail — one pass over the closed dome silhouette. As the halves
  // open we fade it so it reads as belonging to the (now-split) shell rather
  // than floating; clip keeps spots inside the dome.
  ctx.save();
  ctx.globalAlpha = 1 - clamp01(openPhase) * 0.85;
  ctx.beginPath();
  ctx.arc(0, 4, 14, 0, TAU);
  ctx.clip();
  ctx.fillStyle = "#1a0808";
  ([[-7, -1, 3], [7, -1, 3], [-6, 9, 2.6], [6, 9, 2.6], [0, 14, 2.4]] as Array<[number, number, number]>).forEach(
    ([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, TAU);
      ctx.fill();
    },
  );
  // Centre seam
  ctx.strokeStyle = "#3a0408";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(0, 18);
  ctx.stroke();
  // Glossy highlight
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-6, -2, 3, 5, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// bug_snail — the SHELL stays rigid; only the FOOT bunches and stretches as the
// snail inches (a peristaltic glide: the foot reaches forward, then the body
// catches up), so it no longer slides as one block. A soft sheen travels across
// the rigid shell, and the eye stalks sway with follow-through.
function animSnail(ctx: CanvasRenderingContext2D, t: number): void {
  // Inch cycle: forward reach (foot stretches, leading edge advances) then a
  // gather (foot bunches as the shell catches up). Eased there-and-back, with a
  // visible amplitude so it genuinely inches rather than just twitching.
  const reach = pingPong(t, 2.2); // 0 gathered .. 1 reaching
  const footStretch = lerp(0.86, 1.18, easeInOutSine(reach)); // x-scale of FOOT only
  const lead = lerp(-2.6, 3.4, easeInOutSine(reach)); // head/foot leading edge creep (−x = forward)
  const stalkSway = Math.sin(t * 1.6) * 3.2; // slow, clearly visible eyestalk sway

  groundShadow(ctx, 0, 22, 18, 4, 0, 0.24);

  ctx.save();
  ctx.translate(0.3, -2.4); // re-frame: off was (-0.3, 2.4)

  // Foot / head group — squash/stretch confined here, anchored at the shell.
  ctx.save();
  ctx.translate(-lead, 0);

  // Body / foot — stretch along x about its rear contact with the shell (x≈4).
  ctx.save();
  ctx.translate(4, 0);
  ctx.scale(footStretch, 2 - footStretch); // volume-ish: longer ⇒ thinner sole
  ctx.translate(-4, 0);
  const foot = ctx.createLinearGradient(0, 6, 0, 18);
  foot.addColorStop(0, "#f0d8a8");
  foot.addColorStop(1, "#b89060");
  ctx.fillStyle = foot;
  ctx.beginPath();
  ctx.moveTo(-20, 16);
  ctx.bezierCurveTo(-22, 8, -16, 4, -10, 6);
  ctx.bezierCurveTo(-2, 8, 10, 10, 18, 10);
  ctx.bezierCurveTo(22, 12, 22, 16, 16, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // Head
  ctx.fillStyle = "#f0d8a8";
  ctx.beginPath();
  ctx.ellipse(-18, 9, 6, 5, -0.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Eye stalks — sway with a slight lag between the two.
  ctx.strokeStyle = "#c8a878";
  ctx.lineWidth = 2;
  const stalks: Array<[number, number]> = [[-20, -2], [-16, -4]];
  stalks.forEach(([tx, ty], i) => {
    const sway = stalkSway * (i === 0 ? 1 : 0.7);
    ctx.beginPath();
    ctx.moveTo(-18, 6);
    ctx.quadraticCurveTo(tx + 1, ty + 5, tx + sway, ty);
    ctx.stroke();
  });
  stalks.forEach(([tx, ty], i) => {
    const sway = stalkSway * (i === 0 ? 1 : 0.7);
    ctx.fillStyle = "#2a1808";
    ctx.beginPath();
    ctx.arc(tx + sway, ty, 1.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff8e0";
    ctx.beginPath();
    ctx.arc(tx + sway - 0.5, ty - 0.5, 0.7, 0, TAU);
    ctx.fill();
  });
  ctx.restore(); // end foot/head creep

  // Spiral shell — RIGID (no squash). Sits on the body, unmoved by the inch.
  const shell = ctx.createRadialGradient(4, -2, 2, 4, 0, 16);
  shell.addColorStop(0, "#e8a85a");
  shell.addColorStop(0.6, "#a86828");
  shell.addColorStop(1, "#5a3410");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.arc(4, 0, 14, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#3a2008";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let first = true;
  for (let a = 0; a <= Math.PI * 4; a += 0.2) {
    const r = 1.5 + a * 1.7;
    const ssx = 4 + Math.cos(a) * r;
    const ssy = 0 + Math.sin(a) * r;
    if (first) {
      ctx.moveTo(ssx, ssy);
      first = false;
    } else ctx.lineTo(ssx, ssy);
  }
  ctx.stroke();

  // Traveling shell sheen — a soft feathered band sweeping the dome (clipped to
  // the shell so it stays on the rigid surface). Replaces the static highlight
  // blob with motion; the base gloss spot is kept.
  ctx.fillStyle = "rgba(255,240,200,0.5)";
  ctx.beginPath();
  ctx.ellipse(-1, -6, 3, 4, -0.4, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(4, 0, 13, 0, TAU);
  ctx.clip();
  glint(ctx, loopPhase(t, 3.6), { span: 14, width: 5, intensity: 0.26, length: 34, warm: true });
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// bug_dragonfly — thickened, raised and recentred (was a 3px stick sitting low
// with a detached shadow). The four wings now beat FAST and visibly: each wing
// sweeps through a wide up/down arc, the two pairs beating in opposition, with a
// few stacked low-alpha ghost copies smearing the fast frames into a readable
// blur. A gentle hover bob keeps it hanging in the air rather than skittering.
function animDragonfly(ctx: CanvasRenderingContext2D, t: number): void {
  // Gentle hover: a slow bob + tiny drift so it hangs in the air. A faint dart
  // accent (anticipation→overshoot) keeps a little life without skittering.
  const hoverY = Math.sin(t * 2.2) * 3.0;
  const driftX = Math.sin(t * 1.1) * 2.2;
  const dartX = (windupOvershoot(loopPhase(t, 3.2)) - 0.5) * 3.0;
  const bodyY = hoverY;
  const bodyX = driftX + dartX;
  const tiltLag = Math.sin(t * 2.2 - 0.5) * 0.06; // body banks into the bob, lagging

  groundShadow(ctx, bodyX, 22, 12, 3.5, bodyY + 9.2, 0.2);

  ctx.save();
  ctx.translate(0.1, -9.2); // re-frame up: off_y +9.2 (reads No@56px) → raise hard
  ctx.translate(bodyX, bodyY);
  ctx.rotate(-0.15 + tiltLag);

  // Four wings beating fast through a WIDE arc. The forewing pair and hindwing
  // pair beat in opposition (dragonfly style). `wTilt` swings ±0.55 rad so the
  // motion is unmistakable; 3 stacked ghost copies smear the fast frames.
  const wingDefs: Array<[number, number, number]> = [
    [-1, -2, 0], // forewing left  (in phase)
    [1, -2, 0], // forewing right (in phase)
    [-1, 2, Math.PI], // hindwing left  (anti-phase)
    [1, 2, Math.PI], // hindwing right (anti-phase)
  ];
  wingDefs.forEach(([side, oy, ph]) => {
    const swing = Math.sin(t * 34 + ph); // very fast beat
    const baseTilt = swing * 0.55; // WIDE up/down sweep (was ±0.22)
    for (let g = 0; g < 3; g++) {
      const ga = (g - 1) * 0.2; // ghost fan spread = motion-blur smear
      const wTilt = baseTilt + ga;
      // Brighter and steadier so the wings actually read at small size.
      const alpha = (0.7 - g * 0.18) * (0.7 + 0.3 * Math.abs(swing));
      ctx.save();
      ctx.translate(0, oy);
      ctx.scale(side, 1);
      ctx.rotate(wTilt);
      const wing = ctx.createLinearGradient(0, 0, 24, 0);
      wing.addColorStop(0, `rgba(205,245,255,${0.7 * alpha})`);
      wing.addColorStop(1, `rgba(150,225,240,${0.4 * alpha})`);
      ctx.fillStyle = wing;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(9, -5, 22, -4, 26, -1.5);
      ctx.bezierCurveTo(22, 1.5, 9, 3, 0, 0);
      ctx.closePath();
      ctx.fill();
      if (g === 0) {
        ctx.strokeStyle = "rgba(90,170,190,0.6)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(23, -1.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  });

  // Long slender body — THICKENED (ry 3 → 4) so it reads at small size.
  const body = ctx.createLinearGradient(-10, 0, 16, 0);
  body.addColorStop(0, "#3aa8c8");
  body.addColorStop(0.5, "#1a7a98");
  body.addColorStop(1, "#0a3a4a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(4, 0, 16, 4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#062430";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Segments
  ctx.strokeStyle = "rgba(6,36,48,0.7)";
  ctx.lineWidth = 0.7;
  for (let x = -6; x <= 16; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, -3);
    ctx.lineTo(x, 3);
    ctx.stroke();
  }
  // Iridescent highlight
  ctx.strokeStyle = "rgba(200,255,255,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(16, -2);
  ctx.stroke();
  // Head & eyes
  ctx.fillStyle = "#1a7a98";
  ctx.beginPath();
  ctx.arc(-12, 0, 4.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#2ad0e8";
  ([[-13, -2], [-13, 2]] as Array<[number, number]>).forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, 2.6, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = "#0a3a4a";
  ([[-13, -2], [-13, 2]] as Array<[number, number]>).forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex - 0.6, ey, 1, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// bug_firefly — recentred over the body; the abdomen PUMPS in size together
// with the glow (the lantern swells as it brightens), with a sharp FLASH spike
// layered on the slow breath, and a soft ground shadow added (it used to float).
// The glow is centred on the abdomen so light and body stay registered.
function animFirefly(ctx: CanvasRenderingContext2D, t: number): void {
  const bobY = Math.sin(t * 1.6) * 3.0;
  const driftX = Math.sin(t * 1.0) * 2.2;
  const breath = breathe(t, 2.6, 0.5, 0.5); // 0..1 slow breathing
  // A gentle brightening accent once per cycle — eased and small so it rides ON
  // the breath swell instead of popping past it as a single oversized flare.
  const flash = beat(t, 3.3, 0.34, 0.4) * 0.22;
  const lum = clamp01(breath * 0.78 + flash); // combined luminance 0..1
  // Abdomen pumps WITH the light.
  const pump = 1 + lum * 0.22;

  groundShadow(ctx, driftX, 22, 9, 3, bobY, 0.2);

  ctx.save();
  ctx.translate(-1.9, -6.0); // re-frame: off was (1.9, 6.0)
  ctx.translate(driftX, bobY);

  // Abdomen anchor — both glow and lantern sit at (8,6) and scale by `pump`.
  const ABx = 8;
  const ABy = 6;

  // Glow around the abdomen — radius & opacity track luminance, centred on body.
  const glowR = (13 + lum * 12) * pump;
  const glow = ctx.createRadialGradient(ABx, ABy, 1, ABx, ABy, glowR);
  glow.addColorStop(0, `rgba(220,255,140,${0.5 + lum * 0.45})`);
  glow.addColorStop(0.4, `rgba(180,240,90,${0.2 + lum * 0.35})`);
  glow.addColorStop(1, "rgba(160,230,60,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ABx, ABy, glowR, 0, TAU);
  ctx.fill();

  // Wings — flicker via opacity + slight spread (kept subtle behind the glow).
  const flick = 0.5 + Math.abs(Math.sin(t * 18)) * 0.5;
  ([-1, 1] as number[]).forEach((side) => {
    ctx.save();
    ctx.translate(-2, -2);
    ctx.scale(1, side * (0.8 + flick * 0.4));
    const wing = ctx.createLinearGradient(0, 0, 10, 6);
    wing.addColorStop(0, `rgba(230,235,210,${0.5 * flick})`);
    wing.addColorStop(1, `rgba(180,190,160,${0.3 * flick})`);
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(6, 2, 12, 8, 10, 12);
    ctx.bezierCurveTo(6, 10, 2, 6, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,130,100,0.5)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
  });

  // Glowing abdomen — swells and brightens with the pump.
  ctx.save();
  ctx.translate(ABx, ABy);
  ctx.scale(pump, pump);
  ctx.translate(-ABx, -ABy);
  const ab = ctx.createRadialGradient(7, 5, 1, ABx, ABy, 8);
  ab.addColorStop(0, "#f4ffb0");
  ab.addColorStop(0.6, lum > 0.55 ? "#e4ff80" : "#c8f060");
  ab.addColorStop(1, "#8ac828");
  ctx.fillStyle = ab;
  ctx.beginPath();
  ctx.ellipse(9, 6, 8, 6, 0.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#6a9818";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // A clean sparkle pings softly at the lantern tip as the light swells.
  const ping = beat(t, 3.3, 0.34, 0.4);
  sparkle(ctx, 13, 7, 1.2 + ping * 1.0, ping * 0.7, "240,255,170");

  // Thorax
  const thorax = ctx.createRadialGradient(-4, -2, 1, -3, 0, 8);
  thorax.addColorStop(0, "#5a4628");
  thorax.addColorStop(1, "#2a1c08");
  ctx.fillStyle = thorax;
  ctx.beginPath();
  ctx.ellipse(-3, 0, 7, 6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Head
  ctx.fillStyle = "#1a1004";
  ctx.beginPath();
  ctx.arc(-11, -1, 4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#d83a18";
  ctx.beginPath();
  ctx.arc(-8, -2, 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-12, -2, 1.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-12.3, -1.8, 0.7, 0, TAU);
  ctx.fill();
  // Antennae
  ctx.strokeStyle = "#1a1004";
  ctx.lineWidth = 1;
  ([-3, -5] as number[]).forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.quadraticCurveTo(-18, d, -20, d - 1);
    ctx.stroke();
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// bug_ant — recentred up; the legs are THICKER and BRIGHTER, the tripod gait is
// exaggerated (big alternating swing + lift), and the body BOBS and pitches in
// sync with the gait so the whole ant scurries instead of jiggling in place.
function animAnt(ctx: CanvasRenderingContext2D, t: number): void {
  // Slower step clock so the shuffle reads as a deliberate walk at the sampled
  // framerate (the old t*8.0 aliased into jitter that looked frozen).
  const gait = t * 4.2; // step clock
  // Tripod gait: legs {0,2,4} vs {1,3,5} alternate. Body rides the gait — it
  // lifts when a tripod plants, surges fore/aft and pitches with each push.
  const bob = Math.abs(Math.sin(gait)) * 2.6; // bigger vertical bob, synced to steps
  const advance = Math.sin(gait) * 2.4; // fore/aft surge locked to the step
  const pitch = 0.05 + Math.sin(gait) * 0.07; // body rocks with each push
  const antWiggle = Math.sin(t * 5.0) * 2.6; // clearer antenna twitch

  groundShadow(ctx, -advance, 22, 16, 4, bob, 0.24);

  ctx.save();
  ctx.translate(-0.8, -5.7); // re-frame: off was (0.8, 5.7)
  ctx.rotate(pitch);
  ctx.translate(-advance, -bob);

  // Six legs — thicker + brighter, exaggerated tripod swing/lift.
  ctx.strokeStyle = "#4a2410";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  const legs: Array<[number, number, number, number]> = [
    [-2, 2, -10, 12], [-2, 2, -8, 14],
    [2, 2, 2, 14], [2, 2, 6, 13],
    [4, 2, 12, 12], [4, 2, 14, 14],
  ];
  legs.forEach(([x1, y1, x2, y2], i) => {
    const tripod = i % 2 === 0 ? gait : gait + Math.PI;
    const swing = Math.sin(tripod) * 4.0; // exaggerated stride
    const lift = Math.max(0, Math.cos(tripod)) * 2.6; // foot lifts off on recovery
    const ex = x2 + swing;
    const ey = y2 - lift;
    const mx = (x1 + ex) / 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, y1 - 4, ex, ey);
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // Abdomen
  const ab = ctx.createRadialGradient(10, 0, 1, 11, 2, 11);
  ab.addColorStop(0, "#8a3018");
  ab.addColorStop(0.6, "#5a1808");
  ab.addColorStop(1, "#2a0804");
  ctx.fillStyle = ab;
  ctx.beginPath();
  ctx.ellipse(11, 2, 9, 7, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Thorax
  ctx.fillStyle = "#3a1808";
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 4.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Head
  ctx.fillStyle = "#2a1008";
  ctx.beginPath();
  ctx.arc(-10, -1, 6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Eye
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-12, -2, 1.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-12.4, -1.7, 0.8, 0, TAU);
  ctx.fill();
  // Mandibles
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.4;
  ([-1, 1] as number[]).forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(-15, -1);
    ctx.quadraticCurveTo(-18, -1 + side * 2, -17, -1 + side * 4);
    ctx.stroke();
  });
  // Antennae — bent, wiggling.
  ctx.strokeStyle = "#1a0604";
  ctx.lineWidth = 1.2;
  ([-1, 1] as number[]).forEach((side) => {
    const w = antWiggle;
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-16, -9 + side * 2);
    ctx.lineTo(-19 + w, -10 + side * 3 - Math.abs(w) * 0.4);
    ctx.stroke();
  });
  // Highlight
  ctx.fillStyle = "rgba(255,180,140,0.4)";
  ctx.beginPath();
  ctx.ellipse(8, -2, 2.4, 4, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// bug_caterpillar — recentred up; a real INCHWORM ACCORDION: the segments bunch
// together (gaps close, body humps up) then stretch apart (gaps open, body
// flattens long) as a wave runs head-to-tail, instead of the old ~1.6u hump.
// The legs ripple with the wave and the eyes are made symmetric.
function animCaterpillar(ctx: CanvasRenderingContext2D, t: number): void {
  // Rest spacing of segment centres (head last). We drive the spacing between
  // consecutive segments with an accordion phase so the body genuinely
  // bunches-and-stretches, and lift each segment on the hump crest.
  const baseX = [16, 10, 3, -4, -11];
  const baseY = [4, 2, 1, 0, -2];
  const r = [6, 7, 7.5, 8, 8];
  const speed = 3.4;
  const k = 0.95; // wave phase offset per segment
  const humpAmp = 4.6; // BIG vertical hump (was ~1.6)
  const squeeze = 3.0; // how far segments draw together on the bunch

  // Accordion: a compression wave. `gather[i]` in [0..1], 1 = fully bunched.
  // Segments slide toward the body centroid as they bunch, lift on the crest.
  const segs: Array<[number, number, number]> = baseX.map((bx, i) => {
    const ph = t * speed - i * k;
    const gather = Math.sin(ph) * 0.5 + 0.5; // 0..1
    // Pull toward the tail anchor (segment 0) by index so the body concertinas.
    const pull = (i / (baseX.length - 1)) * squeeze * (gather - 0.5) * 2;
    const nx = bx - pull; // closes/open the gaps along the line of travel
    const ny = baseY[i] - Math.max(0, Math.sin(ph)) * humpAmp; // crest lifts up
    return [nx, ny, r[i]];
  });

  // Shadow squashes as the body bunches (centroid hump leaves the ground a bit).
  const headLift = Math.max(0, baseY[4] - segs[4][1]);
  groundShadow(ctx, 0, 22, 20, 4, headLift * 0.4, 0.24);

  ctx.save();
  ctx.translate(-1.4, -5.4); // re-frame: off was (1.4, 5.4)

  // Legs — ripple with the accordion (longer reach on the stretch phase).
  ctx.strokeStyle = "#2a5410";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  segs.forEach(([cx, cy, sr], i) => {
    const ripple = Math.sin(t * speed - i * k);
    const legLen = 3 + Math.max(0, -ripple) * 2.0; // legs plant/reach on stretch
    ([-2, 2] as number[]).forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + sr - 2);
      ctx.lineTo(cx + dx, cy + sr + legLen);
      ctx.stroke();
    });
  });
  ctx.lineCap = "butt";

  // Segment bodies (tail → head, head drawn last on top).
  segs.forEach(([cx, cy, sr], i) => {
    const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, sr);
    if (i === segs.length - 1) {
      g.addColorStop(0, "#bfe87a");
      g.addColorStop(0.6, "#7ab83a");
      g.addColorStop(1, "#3a6814");
    } else {
      g.addColorStop(0, "#a8e068");
      g.addColorStop(0.6, "#6aa830");
      g.addColorStop(1, "#2e5410");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, sr, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#1f3a08";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "rgba(230,255,180,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx - 1, cy - sr * 0.5, sr * 0.4, sr * 0.25, -0.3, 0, TAU);
    ctx.fill();
  });

  // Head detail follows the animated head segment.
  const hx = segs[segs.length - 1][0];
  const hy = segs[segs.length - 1][1];
  const antBob = Math.sin(t * speed) * 1.4;
  // Antennae
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 1.4;
  ([-2.5, 2.5] as number[]).forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(hx + dx, hy - 6);
    ctx.lineTo(hx + dx * 1.4, hy - 11 - antBob);
    ctx.stroke();
    ctx.fillStyle = "#d83a18";
    ctx.beginPath();
    ctx.arc(hx + dx * 1.4, hy - 11 - antBob, 1.4, 0, TAU);
    ctx.fill();
  });
  // Eyes — SYMMETRIC (was -3 / +2).
  ctx.fillStyle = "#fff8e0";
  ([-2.6, 2.6] as number[]).forEach((dx) => {
    ctx.beginPath();
    ctx.arc(hx + dx, hy - 1, 2, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = "#0a0e04";
  ([-2.6, 2.6] as number[]).forEach((dx) => {
    ctx.beginPath();
    ctx.arc(hx + dx - 0.3, hy - 0.8, 1, 0, TAU);
    ctx.fill();
  });
  // Smile
  ctx.strokeStyle = "#1f3a08";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(hx, hy + 2, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Rosy cheeks — one each side (symmetric).
  ctx.fillStyle = "rgba(240,120,120,0.45)";
  ([-4.5, 4.5] as number[]).forEach((dx) => {
    ctx.beginPath();
    ctx.arc(hx + dx, hy + 2, 1.8, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
}

export const ANIMATIONS: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  bug_bee: animBee,
  bug_butterfly: animButterfly,
  bug_ladybug: animLadybug,
  bug_snail: animSnail,
  bug_dragonfly: animDragonfly,
  bug_firefly: animFirefly,
  bug_ant: animAnt,
  bug_caterpillar: animCaterpillar,
};
