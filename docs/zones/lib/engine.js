/* docs/zones — shared procedural vignette engine.
 * Renders each zone's animated "establishing shot" from data only (palette + topology + ambient),
 * with a live grow control (0..1) that adds buildings and pushes the frontier back.
 * One painter per growth-topology → every zone looks and grows differently from the same engine.
 * Inlined verbatim into the atlas + per-zone docs by build.mjs. No external assets. */
(function () {
  "use strict";
  const DATA = window.ZONE_DATA || {};
  const RM = matchMedia("(prefers-reduced-motion:reduce)").matches;

  // ── tiny helpers ──────────────────────────────────────────────────────────
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255; if (f >= 0) { r = lerp(r, 255, f); gg = lerp(gg, 255, f); b = lerp(b, 255, f); } else { const k = 1 + f; r *= k; gg *= k; b *= k; } return "rgb(" + (r | 0) + "," + (gg | 0) + "," + (b | 0) + ")"; }
  function vgrad(g, x0, y0, x1, y1, c0, c1) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }

  // ── a generic stylised building glyph (palette-driven) ──────────────────────
  function building(g, x, baseY, w, h, P, lit, kind) {
    const wallTop = baseY - h, roofH = h * (kind === "tower" ? 0.30 : kind === "tent" ? 0.62 : 0.42);
    g.save();
    g.fillStyle = "rgba(10,8,16,.22)"; g.beginPath(); g.ellipse(x, baseY + 2, w * 0.6, 4, 0, 0, TAU); g.fill();
    // wall
    g.fillStyle = P.wall; g.strokeStyle = shade(P.wall, -0.5); g.lineWidth = 1.4;
    rr(g, x - w / 2, wallTop + roofH, w, h - roofH, 2.5); g.fill(); g.stroke();
    g.fillStyle = "rgba(0,0,0,.10)"; rr(g, x - w / 2 + w * 0.58, wallTop + roofH, w * 0.42, h - roofH, 2.5); g.fill();
    // roof
    g.fillStyle = P.roof; g.strokeStyle = shade(P.roof, -0.45); g.lineWidth = 1.4;
    if (kind === "tent") { g.beginPath(); g.moveTo(x - w / 2 - 2, baseY); g.lineTo(x, wallTop); g.lineTo(x + w / 2 + 2, baseY); g.closePath(); g.fill(); g.stroke(); }
    else { g.beginPath(); g.moveTo(x - w / 2 - 3, wallTop + roofH + 1); g.lineTo(x - w * (kind === "tower" ? 0.0 : 0.16), wallTop); g.lineTo(x + w * (kind === "tower" ? 0.0 : 0.16), wallTop); g.lineTo(x + w / 2 + 3, wallTop + roofH + 1); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = "rgba(255,255,255,.16)"; g.beginPath(); g.moveTo(x - w / 2 - 2, wallTop + roofH); g.lineTo(x, wallTop + 1); g.stroke(); }
    // window
    if (kind !== "tent") { const wy = wallTop + roofH + (h - roofH) * 0.34; g.fillStyle = lit ? P.glow : shade(P.surface, 0.25); g.globalAlpha = lit ? 0.95 : 0.7; rr(g, x - w * 0.16, wy, w * 0.22, h * 0.2, 1.5); g.fill(); g.globalAlpha = 1; if (lit) { g.fillStyle = "rgba(255,240,200,.18)"; g.beginPath(); g.arc(x - w * 0.05, wy + h * 0.1, w * 0.4, 0, TAU); g.fill(); } }
    g.restore();
  }

  // ── particle / ambient systems (chosen per zone's ambient list) ─────────────
  function particles(g, S, kind) {
    const { W, H, t, P } = S, r = S.prng;
    g.save();
    if (kind === "fireflies" || kind === "wisps") { const col = kind === "wisps" ? P.glow : P.glow, n = 16; for (let i = 0; i < n; i++) { const ph = i * 1.7, x = (i / n) * W + Math.sin(t * 0.6 + ph) * 26, y = H * (0.45 + 0.4 * ((i * 53) % 10) / 10) + Math.cos(t * 0.5 + ph) * 18, a = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + ph)); g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(x, y, kind === "wisps" ? 3.2 : 1.8, 0, TAU); g.fill(); g.globalAlpha = a * 0.3; g.beginPath(); g.arc(x, y, kind === "wisps" ? 9 : 5, 0, TAU); g.fill(); } }
    if (kind === "embers") { for (let i = 0; i < 26; i++) { const ph = i * 2.1, x = ((i * 71 + t * 14 * (0.5 + (i % 3) * 0.3)) % W), y = H - ((t * 30 + i * 60) % (H * 0.9)), a = 0.7 * (y / H); g.globalAlpha = clamp(a, 0, 1); g.fillStyle = i % 4 ? P.glow : P.accent; g.fillRect(x, y, 2, 2); } }
    if (kind === "ash" || kind === "snow" || kind === "spores" || kind === "pollen" || kind === "dust" || kind === "drifting-petals") { const col = kind === "snow" ? "#fff" : kind === "ash" ? "#cabcbe" : kind === "spores" ? shade(P.glow, .2) : kind === "drifting-petals" ? "#ffd0e0" : shade(P.ground, .35); for (let i = 0; i < 34; i++) { const sp = 8 + (i % 5) * 5, x = ((i * 47 + Math.sin(t * 0.5 + i) * 30) % W + W) % W, y = (t * sp + i * 33) % H; g.globalAlpha = 0.5; g.fillStyle = col; g.beginPath(); g.arc(x, y, kind === "snow" ? 1.8 : 1.3, 0, TAU); g.fill(); } }
    if (kind === "gulls" || kind === "swallows" || kind === "bats" || kind === "airships" || kind === "dragonflies") { const n = kind === "airships" ? 1 : 5; for (let i = 0; i < n; i++) { const ph = i * 900, sp = 22 + i * 9, x = ((t * sp + ph) % (W + 80)) - 40, y = H * (0.16 + 0.12 * ((i * 7) % 5) / 5) + Math.sin(t * 0.6 + i) * 8; if (kind === "airships") { drawAirship(g, x, y, P); continue; } const flap = Math.sin(t * 7 + i) * 4, s = kind === "bats" ? 4 : 6; g.strokeStyle = kind === "bats" ? "rgba(30,24,40,.7)" : "rgba(60,60,70,.6)"; g.lineWidth = 2; g.lineCap = "round"; g.beginPath(); g.moveTo(x - s, y + 2 - flap * .3); g.quadraticCurveTo(x, y - flap, x, y); g.quadraticCurveTo(x, y - flap, x + s, y + 2 - flap * .3); g.stroke(); } }
    if (kind === "steam" || kind === "hearthsmoke" || kind === "smoke" || kind === "heat-haze" || kind === "heat-shimmer") { for (let i = 0; i < 5; i++) { const bx = W * (0.3 + i * 0.12), by = H * 0.72; for (let k = 0; k < 5; k++) { const y = by - ((t * 16 + k * 16 + i * 9) % (H * 0.5)), a = 0.18 * (1 - (by - y) / (H * 0.5)); g.globalAlpha = clamp(a, 0, 1); g.fillStyle = "#fff"; g.beginPath(); g.arc(bx + Math.sin(t + k + i) * 6, y, 4 + (by - y) * 0.04, 0, TAU); g.fill(); } } }
    if (kind === "glowworms" || kind === "crystal-sparkle" || kind === "lens-flare" || kind === "lanterns") { for (let i = 0; i < 22; i++) { const x = (i * 97 % W), y = H * (0.1 + 0.5 * ((i * 31) % 10) / 10), a = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3 + i)); g.globalAlpha = a; g.fillStyle = P.glow; g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill(); } }
    g.globalAlpha = 1; g.restore();
  }
  function drawAirship(g, x, y, P) { g.save(); g.fillStyle = shade(P.roof, .1); g.strokeStyle = shade(P.roof, -.4); g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 22, 9, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = P.accent; rr(g, x - 6, y + 8, 12, 5, 2); g.fill(); g.strokeStyle = shade(P.roof, -.4); g.beginPath(); g.moveTo(x - 6, y + 7); g.lineTo(x - 4, y + 8); g.moveTo(x + 6, y + 7); g.lineTo(x + 4, y + 8); g.stroke(); g.restore(); }

  function aurora(g, S) { const { W, H, t } = S; g.save(); g.globalCompositeOperation = "screen"; for (let b = 0; b < 4; b++) { g.beginPath(); for (let x = 0; x <= W; x += 10) { const y = H * (0.07 + b * 0.055) + Math.sin(x * 0.013 + t * 0.45 + b * 1.3) * 20; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.lineTo(W, 0); g.lineTo(0, 0); g.closePath(); const gr = g.createLinearGradient(0, 0, 0, H * 0.46); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.7, b % 2 ? "rgba(120,255,180,.05)" : "rgba(150,120,255,.05)"); gr.addColorStop(1, b % 2 ? "rgba(120,255,190,.22)" : "rgba(160,120,255,.20)"); g.fillStyle = gr; g.fill(); } g.restore(); }
  function sunShaft(g, S) { const { W, H, t } = S; g.save(); g.globalCompositeOperation = "screen"; for (let i = 0; i < 3; i++) { const x = W * (0.25 + i * 0.27) + Math.sin(t * 0.2 + i) * 10; g.fillStyle = "rgba(255,240,180,.07)"; g.beginPath(); g.moveTo(x - 16, 0); g.lineTo(x + 16, 0); g.lineTo(x + 50, H); g.lineTo(x - 18, H); g.closePath(); g.fill(); } g.restore(); }

  // ── frontier wash (the receding wilderness) ─────────────────────────────────
  function frontier(g, S, grow, col, side) {
    const { W, H } = S; g.save(); g.globalAlpha = 0.9; g.fillStyle = col;
    const ext = lerp(0.62, 0.18, grow); // how far the wild reaches in
    if (side === "edges") { g.fillRect(0, 0, W * ext * 0.5, H); g.fillRect(W - W * ext * 0.5, 0, W * ext * 0.5, H); }
    else if (side === "top") { g.globalAlpha = lerp(0.7, 0.25, grow); g.fillRect(0, 0, W, H * ext * 0.5); }
    g.restore();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCENES — one per growth topology. Each: (g, S, grow) where grow ∈ [0,1].
  // ════════════════════════════════════════════════════════════════════════════
  const SCENES = {
    // 1 · boardwalk ribbon over water
    "ribbon-stilt": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = vgrad(g, 0, 0, 0, H, P.sky[0], P.sky[1]); g.fillRect(0, 0, W, H);
      // water
      const wy = H * 0.44; g.fillStyle = vgrad(g, 0, wy, 0, H, P.surface2, P.surface); g.fillRect(0, wy, W, H - wy);
      g.save(); g.globalCompositeOperation = "screen"; g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 2; for (let i = 0; i < 7; i++) { const y = wy + 14 + i * (H - wy) / 7; g.beginPath(); g.moveTo(0, y + Math.sin(t + i) * 3); g.lineTo(W, y + Math.cos(t + i) * 3); g.stroke(); } g.restore();
      // mist band
      g.fillStyle = "rgba(230,224,180,.30)"; g.fillRect(0, wy - 10, W, 22);
      // reed frontier
      const reedN = Math.round(lerp(60, 22, grow)); const rr2 = mulberry(7); g.strokeStyle = P.ground; g.lineWidth = 2;
      for (let i = 0; i < reedN; i++) { const x = rr2() * W, y = wy + 6 + rr2() * (H - wy) * 0.8; const sw = Math.sin(t * 1.2 + x) * 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + sw, y - 14, x + sw * 1.5, y - 22); g.stroke(); g.fillStyle = shade(P.ground, .2); g.fillRect(x + sw * 1.4 - 1, y - 26, 2, 6); }
      // boardwalk + stilt platforms
      const nB = Math.round(lerp(2, 7, grow)); g.strokeStyle = P.path; g.lineWidth = 7; g.lineCap = "round";
      let px = W * 0.14, py = H * 0.74; g.beginPath(); g.moveTo(px, py);
      const plats = [];
      for (let i = 0; i < nB; i++) { const nx = W * (0.14 + (i + 1) / (nB + 1) * 0.78), ny = H * (0.64 + Math.sin(i * 1.3) * 0.12); g.lineTo(nx, ny); plats.push([nx, ny]); }
      g.stroke();
      // stilts + platforms + huts
      plats.forEach((p, i) => { const lit = i % 2 === 0; g.strokeStyle = shade(P.path, -.3); g.lineWidth = 3; for (let s = -1; s <= 1; s++) { g.beginPath(); g.moveTo(p[0] + s * 14, p[1] + 2); g.lineTo(p[0] + s * 14, H); g.stroke(); } g.fillStyle = P.path; rr(g, p[0] - 20, p[1] - 5, 40, 10, 3); g.fill(); building(g, p[0], p[1] - 4, lerp(26, 34, (i % 3) / 3), 30, P, lit); });
      particles(g, S, "fireflies"); particles(g, S, "dragonflies");
    },

    // 2 · switchback terraces up a volcano
    "switchback-terrace": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = vgrad(g, 0, 0, 0, H, P.sky[0], P.sky[1]); g.fillRect(0, 0, W, H);
      // glow halo at the summit
      g.save(); g.globalCompositeOperation = "screen"; const gh = g.createRadialGradient(W * 0.5, H * 0.16, 0, W * 0.5, H * 0.16, W * 0.5); gh.addColorStop(0, "rgba(255,120,40,.35)"); gh.addColorStop(1, "rgba(255,120,40,0)"); g.fillStyle = gh; g.fillRect(0, 0, W, H); g.restore();
      // cone
      g.fillStyle = P.ground; g.beginPath(); g.moveTo(W * 0.5, H * 0.08); g.lineTo(W * 1.05, H); g.lineTo(-W * 0.05, H); g.closePath(); g.fill();
      g.fillStyle = shade(P.ground, .06); g.beginPath(); g.moveTo(W * 0.5, H * 0.08); g.lineTo(W * 0.5, H); g.lineTo(-W * 0.05, H); g.closePath(); g.fill();
      // lava streak (frontier that cools as grow rises)
      g.save(); g.strokeStyle = P.surface; g.lineWidth = lerp(10, 4, grow); g.lineCap = "round"; g.shadowColor = P.glow; g.shadowBlur = 12; g.beginPath(); g.moveTo(W * 0.52, H * 0.12); g.quadraticCurveTo(W * 0.6, H * 0.5, W * 0.46, H); g.stroke(); g.restore();
      // terraces (each tier = one more shelf up)
      const nT = Math.round(lerp(1, 4, grow));
      for (let i = 0; i < nT; i++) { const ty = H * (0.86 - i * 0.19), hw = W * (0.4 - i * 0.06); g.fillStyle = shade(P.ground, .12); rr(g, W * 0.5 - hw, ty, hw * 2, 12, 3); g.fill(); g.strokeStyle = shade(P.ground, -.3); g.lineWidth = 2; g.stroke(); g.strokeStyle = P.path; g.lineWidth = 5; g.beginPath(); g.moveTo(W * 0.5 - hw * 0.6, ty); g.lineTo(W * 0.5 + hw * 0.5, ty - H * 0.19 + 14); g.stroke(); const nb = 2 + i; for (let b = 0; b < nb; b++) { const bx = W * 0.5 + (b - (nb - 1) / 2) * (hw * 1.5 / nb); building(g, bx, ty + 1, 26, 26, P, true, b === 0 && i === nT - 1 ? "tower" : ""); } }
      particles(g, S, "embers"); particles(g, S, "ash");
    },

    // 3 · sheltered hollow around a hot-spring
    "sheltered-hollow": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = vgrad(g, 0, 0, 0, H, P.sky[0], P.sky[1]); g.fillRect(0, 0, W, H);
      aurora(g, S);
      // snow ground
      g.fillStyle = vgrad(g, 0, H * 0.5, 0, H, P.ground, shade(P.ground, -.08)); g.fillRect(0, H * 0.5, W, H);
      // pines frontier (recede with grow)
      const pineN = Math.round(lerp(16, 6, grow)); const pr = mulberry(11);
      for (let i = 0; i < pineN; i++) { const x = pr() * W, near = pr() < 0.5, y = H * (0.5 + pr() * 0.12) + (near ? 30 : 0), s = near ? 1.1 : 0.7; g.fillStyle = shade("#2f5a3a", near ? 0 : .12); g.beginPath(); g.moveTo(x, y - 34 * s); g.lineTo(x - 12 * s, y); g.lineTo(x + 12 * s, y); g.closePath(); g.fill(); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.moveTo(x, y - 34 * s); g.lineTo(x - 4 * s, y - 22 * s); g.lineTo(x + 4 * s, y - 22 * s); g.closePath(); g.fill(); }
      // warmth-thaw ring: melted ground around the spring (the warm zone grows with the town)
      const cx = W * 0.5, cy = H * 0.78, warmR = lerp(90, 200, grow);
      g.save(); g.fillStyle = shade(P.ground, -.1); g.globalAlpha = .5; g.beginPath(); g.ellipse(cx, cy + 6, warmR, warmR * 0.34, 0, 0, TAU); g.fill(); g.restore();
      // windbreak palisade arcing behind the outer ring
      g.save(); g.strokeStyle = shade("#5a4632", 0); g.lineWidth = 4; g.beginPath(); g.ellipse(cx, cy - 2, lerp(96, 176, grow), lerp(40, 70, grow), 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke(); g.restore();
      // steaming hot spring at centre
      g.fillStyle = P.surface2; g.beginPath(); g.ellipse(cx, cy, 56, 22, 0, 0, TAU); g.fill(); g.fillStyle = P.surface; g.beginPath(); g.ellipse(cx, cy, 42, 15, 0, 0, TAU); g.fill();
      g.save(); g.globalCompositeOperation = "screen"; const wg = g.createRadialGradient(cx, cy, 0, cx, cy, warmR); wg.addColorStop(0, "rgba(255,210,120,.22)"); wg.addColorStop(1, "rgba(255,210,120,0)"); g.fillStyle = wg; g.fillRect(0, 0, W, H); g.restore();
      // longhouses ring the spring
      const nb = Math.round(lerp(3, 8, grow)); for (let i = 0; i < nb; i++) { const a = Math.PI + (i / Math.max(1, nb - 1)) * Math.PI, rx = lerp(80, 160, grow), x = cx + Math.cos(a) * rx, y = cy - 8 + Math.sin(a) * rx * 0.34; building(g, x, y, 30, 24, P, true, i === 0 ? "tower" : ""); }
      particles(g, S, "steam"); particles(g, S, "snow");
    },

    // 4 · concentric oasis rings
    "oasis-rings": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = vgrad(g, 0, 0, 0, H * 0.6, P.sky[0], P.sky[1]); g.fillRect(0, 0, W, H);
      // sun
      g.save(); g.globalCompositeOperation = "screen"; const sg = g.createRadialGradient(W * 0.8, H * 0.2, 0, W * 0.8, H * 0.2, 120); sg.addColorStop(0, "rgba(255,230,150,.5)"); sg.addColorStop(1, "rgba(255,230,150,0)"); g.fillStyle = sg; g.fillRect(0, 0, W, H); g.restore();
      // dunes / sand
      g.fillStyle = vgrad(g, 0, H * 0.45, 0, H, P.ground, P.ground2); g.fillRect(0, H * 0.45, W, H);
      frontier(g, S, grow, shade(P.ground, .1), "edges");
      // oasis pool + palms at centre
      const cx = W * 0.5, cy = H * 0.72; g.fillStyle = P.surface; g.beginPath(); g.ellipse(cx, cy, 40, 16, 0, 0, TAU); g.fill(); g.fillStyle = P.surface2; g.beginPath(); g.ellipse(cx, cy - 2, 30, 10, 0, 0, TAU); g.fill();
      for (let i = -1; i <= 1; i += 2) { const px = cx + i * 30, sw = Math.sin(t + i) * 4; g.strokeStyle = shade(P.path, -.3); g.lineWidth = 4; g.beginPath(); g.moveTo(px, cy); g.quadraticCurveTo(px + i * 4, cy - 24, px + i * 6 + sw, cy - 38); g.stroke(); g.fillStyle = "#3a8a5a"; for (let f = 0; f < 5; f++) { const a = -Math.PI / 2 + (f - 2) * 0.5; g.save(); g.translate(px + i * 6 + sw, cy - 38); g.rotate(a); g.fillRect(0, -2, 20, 4); g.restore(); } }
      // caravan-road spokes radiating into the dunes (ground — drawn before walls/buildings)
      g.strokeStyle = P.path; g.lineWidth = 5; g.lineCap = "round"; [Math.PI * 1.12, Math.PI * 1.5, Math.PI * 1.88].forEach((a) => { g.beginPath(); g.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 12); g.lineTo(cx + Math.cos(a) * 360, cy + Math.sin(a) * 120); g.stroke(); });
      // concentric ring WALLS (the signature: each rung wraps a new walled ring) + buildings
      const nR = Math.round(lerp(1, 4, grow));
      for (let r2 = 1; r2 <= nR; r2++) {
        const rx = r2 * 46 + 14, ry = r2 * 18 + 5;
        // solid adobe ring wall with crenellations + gate towers
        g.strokeStyle = shade(P.wall, -.28); g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.98, Math.PI * 2.02); g.stroke();
        g.strokeStyle = P.wall; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.98, Math.PI * 2.02); g.stroke();
        for (let m = 0; m <= 10; m++) { const a = Math.PI + m / 10 * Math.PI, mx = cx + Math.cos(a) * rx, my = cy + Math.sin(a) * ry; g.fillStyle = P.wall; g.fillRect(mx - 2, my - 5, 4, 5); }
        // gate posts where a caravan spoke meets the wall
        [Math.PI * 1.18, Math.PI * 1.82].forEach((a) => { const gx = cx + Math.cos(a) * rx, gy = cy + Math.sin(a) * ry; g.fillStyle = shade(P.wall, -.1); g.fillRect(gx - 3, gy - 12, 6, 14); });
        const nb = 2 + r2; for (let b = 0; b < nb; b++) { const a = Math.PI + (b + 0.5) / nb * Math.PI, x = cx + Math.cos(a) * (rx - 8), y = cy + Math.sin(a) * (ry - 3) - 6; building(g, x, y, 22, 19, P, false, r2 === nR && b === 0 ? "tower" : ""); }
      }
      particles(g, S, "dust"); particles(g, S, "heat-haze");
    },

    // 5 · stacked sea-cliff
    "vertical-cliff": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = vgrad(g, 0, 0, 0, H, P.sky[0], P.sky[1]); g.fillRect(0, 0, W, H);
      const sx = W * 0.60, x0 = W * 0.07;
      // sea
      g.fillStyle = vgrad(g, 0, 0, 0, H, P.surface2, P.surface); g.fillRect(sx, 0, W - sx, H);
      g.save(); g.globalCompositeOperation = "screen"; g.strokeStyle = "rgba(255,255,255,.16)"; g.lineWidth = 2; for (let i = 0; i < 10; i++) { const y = i * H / 10; g.beginPath(); g.moveTo(sx, y + Math.sin(t + i) * 3); g.lineTo(W, y + Math.cos(t * 1.1 + i) * 3); g.stroke(); } g.restore();
      // cliff body with sedimentary strata (reads as a tall rock face)
      g.fillStyle = P.ground; g.beginPath(); g.moveTo(0, 0); g.lineTo(sx + 8, 0); g.lineTo(sx - 34, H); g.lineTo(0, H); g.closePath(); g.fill();
      g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(sx + 8, 0); g.lineTo(sx - 34, H); g.lineTo(0, H); g.closePath(); g.clip();
      g.strokeStyle = "rgba(0,0,0,.10)"; g.lineWidth = 3; for (let y = 18; y < H; y += 26) { g.beginPath(); g.moveTo(-10, y); g.lineTo(sx + 8, y - 6); g.stroke(); }
      g.fillStyle = shade(P.ground, -.14); g.beginPath(); g.moveTo(sx - 8, 0); g.lineTo(sx + 8, 0); g.lineTo(sx - 34, H); g.lineTo(sx - 50, H); g.closePath(); g.fill(); g.restore();
      const nS = Math.round(lerp(1, 4, grow));
      // cargo-lift cable (base harbour → top shelf) with a moving cart — the vertical-transport signature
      const topY = H * (0.82 - (nS - 1) * 0.2);
      const lb = [W * 0.40, H * 0.92], lt = [W * 0.46, topY - 8];
      g.strokeStyle = shade(P.path, -.1); g.lineWidth = 2; g.beginPath(); g.moveTo(lb[0], lb[1]); g.lineTo(lt[0], lt[1]); g.stroke();
      { const k = 0.5 + 0.5 * Math.sin(t * 0.7), cxp = lerp(lb[0], lt[0], k), cyp = lerp(lb[1], lt[1], k); g.fillStyle = P.roof; rr(g, cxp - 5, cyp - 5, 10, 9, 2); g.fill(); g.strokeStyle = shade(P.roof, -.4); g.stroke(); }
      // stacked carved shelves climbing the cliff
      for (let i = 0; i < nS; i++) { const sy = H * (0.82 - i * 0.2), sw = W * (0.5 - i * 0.04);
        g.fillStyle = shade(P.ground, .16); rr(g, x0, sy, sw, 12, 3); g.fill(); g.strokeStyle = shade(P.ground, -.3); g.lineWidth = 1.5; g.stroke();
        g.strokeStyle = shade(P.path, -.05); g.lineWidth = 1.5; for (let rx = x0 + 4; rx < x0 + sw; rx += 11) { g.beginPath(); g.moveTo(rx, sy); g.lineTo(rx, sy - 6); g.stroke(); } g.beginPath(); g.moveTo(x0 + 4, sy - 6); g.lineTo(x0 + sw, sy - 6); g.stroke();
        if (i > 0) { g.strokeStyle = P.path; g.lineWidth = 4; const bx = x0 + sw * 0.8; g.beginPath(); g.moveTo(bx, sy); g.lineTo(bx + 15, sy + H * 0.2 - 12); g.lineTo(bx, sy + H * 0.2 - 12); g.stroke(); }
        const nb = 2 + i; for (let b = 0; b < nb; b++) building(g, x0 + 22 + b * (sw - 36) / Math.max(1, nb - 1), sy + 1, 26, 26, P, true, i === nS - 1 && b === 0 ? "tower" : "");
      }
      // tide-pool harbour + foam spray at the base
      g.fillStyle = P.surface; g.beginPath(); g.ellipse(W * 0.32, H - 6, 64, 12, 0, 0, TAU); g.fill();
      g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 7; i++) { const fx = sx - 30 + Math.sin(t * 2 + i) * 8, fy = H * (0.5 + i * 0.07); g.beginPath(); g.arc(fx, fy, 4 + Math.sin(t * 3 + i) * 2, 0, TAU); g.fill(); } g.restore();
      particles(g, S, "gulls");
    },

    // 6 · treetop platforms
    "canopy-platforms": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = vgrad(g, 0, 0, 0, H, P.sky[0], P.sky[1]); g.fillRect(0, 0, W, H);
      sunShaft(g, S);
      // deep forest floor fade
      g.fillStyle = "rgba(10,20,8,.4)"; g.fillRect(0, H * 0.7, W, H);
      // giant trunks
      const trunks = [W * 0.22, W * 0.52, W * 0.82];
      trunks.forEach((tx) => { g.fillStyle = P.path; rr(g, tx - 16, 0, 32, H, 6); g.fill(); g.fillStyle = "rgba(0,0,0,.18)"; rr(g, tx + 2, 0, 14, H, 6); g.fill(); g.fillStyle = shade(P.roof, .1); g.beginPath(); g.ellipse(tx, H * 0.12, 70, 40, 0, 0, TAU); g.fill(); });
      // thornvine frontier at the bottom recedes with grow
      g.fillStyle = shade(P.surface, -.1); g.globalAlpha = lerp(0.8, 0.2, grow); g.fillRect(0, H * 0.86, W, H); g.globalAlpha = 1;
      // platforms grow UP the trunks — vertical layering: understory → canopy → emergent crown.
      const SLOTS = [[1, 0], [0, 0], [2, 0], [1, 1], [0, 1], [1, 2], [2, 1], [1, 3]];
      const lvY = (L) => H * (0.80 - L * 0.165);
      const nP = Math.round(lerp(2, 8, grow));
      const pts = SLOTS.slice(0, nP).map(([ti, L]) => [trunks[ti], lvY(L), L]);
      // vertical rope-ladder up the central trunk (you literally climb as the town grows)
      const topL = Math.max(0, ...pts.filter((p) => p[0] === trunks[1]).map((p) => p[2]));
      g.strokeStyle = shade(P.path, -.25); g.lineWidth = 1.5; for (let s = -1; s <= 1; s += 2) { g.beginPath(); g.moveTo(trunks[1] + s * 3, H * 0.86); g.lineTo(trunks[1] + s * 3, lvY(topL) - 4); g.stroke(); } for (let yy = lvY(topL); yy < H * 0.86; yy += 11) { g.beginPath(); g.moveTo(trunks[1] - 3, yy); g.lineTo(trunks[1] + 3, yy); g.stroke(); }
      // rope bridges link platforms across trunks at nearby heights
      g.strokeStyle = P.path; g.lineWidth = 2; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const a = pts[i], b = pts[j]; if (a[0] !== b[0] && Math.abs(a[2] - b[2]) <= 1 && Math.abs(a[0] - b[0]) < W * 0.42) { g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 16, b[0], b[1]); g.stroke(); } }
      // platforms + cabins, painted bottom→top so higher ones overlap correctly
      pts.slice().sort((a, b) => a[1] - b[1]).forEach((p) => { g.fillStyle = shade(P.ground, .1); rr(g, p[0] - 24, p[1] - 3, 48, 9, 3); g.fill(); building(g, p[0], p[1] - 2, 28, 24, P, true, p[2] >= 3 ? "tower" : ""); });
      particles(g, S, "spores"); particles(g, S, "fireflies");
    },

    // 7 · linked crystal caverns
    "linked-chambers": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = P.dark; g.fillRect(0, 0, W, H);
      // cavern walls (lumpy)
      g.fillStyle = P.ground; const wr = mulberry(3); g.beginPath(); g.moveTo(0, 0); for (let x = 0; x <= W; x += 24) g.lineTo(x, H * (0.16 + wr() * 0.08)); g.lineTo(W, 0); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 24) g.lineTo(x, H * (0.82 - wr() * 0.08)); g.lineTo(W, H); g.closePath(); g.fill();
      // stalactites
      g.fillStyle = shade(P.ground, -.15); for (let i = 0; i < 9; i++) { const x = i * W / 9 + 20; g.beginPath(); g.moveTo(x - 8, H * 0.18); g.lineTo(x + 8, H * 0.18); g.lineTo(x, H * (0.26 + (i % 3) * 0.04)); g.closePath(); g.fill(); }
      // chambers (lit pockets) — more as grow rises
      const nC = Math.round(lerp(1, 4, grow));
      for (let i = 0; i < nC; i++) { const cx = W * (0.2 + i * 0.78 / Math.max(1, nC)), cy = H * 0.62; g.save(); g.globalCompositeOperation = "screen"; const cg = g.createRadialGradient(cx, cy, 0, cx, cy, 80); cg.addColorStop(0, shade(P.surface, .2)); cg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = cg; g.fillRect(0, 0, W, H); g.restore(); building(g, cx, cy + 14, 28, 26, P, true, i === nC - 1 ? "tower" : ""); /* crystals */ for (let k = 0; k < 4; k++) { const kx = cx + (k - 1.5) * 16, ky = cy + 20 + (k % 2) * 4; g.save(); g.fillStyle = P.glow; g.shadowColor = P.glow; g.shadowBlur = 10; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx - 4, ky - 14); g.lineTo(kx + 4, ky - 14); g.closePath(); g.fill(); g.restore(); } if (i > 0) { g.strokeStyle = P.path; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(W * (0.2 + (i - 1) * 0.78 / Math.max(1, nC)) + 20, cy + 26); g.lineTo(cx - 20, cy + 26); g.stroke(); g.setLineDash([]); } }
      particles(g, S, "glowworms");
    },

    // 8 · floating sky-archipelago
    "sky-archipelago": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = vgrad(g, 0, 0, 0, H, P.sky[0], P.sky[1]); g.fillRect(0, 0, W, H);
      // cloud sea
      g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 6; i++) { const x = (i * W / 5 + t * 6) % (W + 120) - 60, y = H * (0.78 + (i % 2) * 0.06); g.beginPath(); g.ellipse(x, y, 70, 20, 0, 0, TAU); g.fill(); }
      // floating islets — more anchored as grow rises
      const nI = Math.round(lerp(2, 6, grow)); const ir = mulberry(5); const isles = [];
      for (let i = 0; i < nI; i++) { const x = W * (0.16 + i / Math.max(1, nI) * 0.7) + ir() * 20, y = H * (0.34 + ((i * 3) % 4) * 0.08) + Math.sin(t * 0.5 + i) * 4; isles.push([x, y]); }
      // sky-bridges
      g.strokeStyle = P.path; g.lineWidth = 2.5; for (let i = 1; i < isles.length; i++) { g.beginPath(); g.moveTo(isles[i - 1][0], isles[i - 1][1]); g.quadraticCurveTo((isles[i - 1][0] + isles[i][0]) / 2, Math.max(isles[i - 1][1], isles[i][1]) + 20, isles[i][0], isles[i][1]); g.stroke(); }
      isles.forEach((p, i) => { // rock underside
        g.fillStyle = P.ground2; g.beginPath(); g.moveTo(p[0] - 30, p[1]); g.lineTo(p[0] + 30, p[1]); g.lineTo(p[0] + 14, p[1] + 26); g.lineTo(p[0] - 4, p[1] + 18); g.lineTo(p[0] - 18, p[1] + 26); g.closePath(); g.fill();
        g.fillStyle = P.ground; rr(g, p[0] - 30, p[1] - 5, 60, 9, 4); g.fill(); g.fillStyle = shade(P.accent, .2); g.globalAlpha = .5; g.beginPath(); g.ellipse(p[0], p[1] + 18, 24, 6, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
        building(g, p[0], p[1] - 4, 26, 24, P, true, i === 0 ? "tower" : "");
        // waterfall
        g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(p[0] - 4, p[1] + 18); g.lineTo(p[0] - 6, p[1] + 60); g.stroke();
      });
      particles(g, S, "airships"); particles(g, S, "drifting-petals");
    },

    // 9 · reclaimed ruin-grid on a moor
    "reclaimed-grid": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = vgrad(g, 0, 0, 0, H, P.sky[0], P.sky[1]); g.fillRect(0, 0, W, H);
      // moor ground
      g.fillStyle = vgrad(g, 0, H * 0.5, 0, H, P.ground, shade(P.ground, -.08)); g.fillRect(0, H * 0.45, W, H);
      // fog frontier recedes with grow
      g.save(); g.fillStyle = "rgba(180,176,190,.55)"; const fogEdge = lerp(0.3, 0.86, grow); g.globalAlpha = 0.7; g.fillRect(0, H * 0.45, W, H); g.globalAlpha = 1; // clear a hallowed disc
      g.globalCompositeOperation = "destination-out"; const cx = W * 0.5, cy = H * 0.66; g.beginPath(); g.ellipse(cx, cy, W * 0.5 * fogEdge, H * 0.4 * fogEdge, 0, 0, TAU); g.fill(); g.restore();
      // the old grid (orthogonal streets), brightened where reclaimed
      g.strokeStyle = shade(P.path, .1); g.lineWidth = 5; for (let i = -1; i <= 2; i++) { const gx = cx + i * 70; if (Math.abs(gx - cx) < W * 0.5 * fogEdge) { g.beginPath(); g.moveTo(gx, cy - 60); g.lineTo(gx + 14, H); g.stroke(); } } g.beginPath(); g.moveTo(cx - W * 0.5 * fogEdge, cy + 8); g.lineTo(cx + W * 0.5 * fogEdge, cy + 8); g.stroke();
      // buildings on ancient footings (some ruined, some restored)
      const nb = Math.round(lerp(3, 9, grow)); const br = mulberry(9);
      for (let i = 0; i < nb; i++) { const a = Math.PI + (i + 0.5) / nb * Math.PI, rx = lerp(40, 150, (i % 3 + 1) / 3), x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * rx * 0.4 + 6; if (Math.hypot((x - cx) / (W * 0.5 * fogEdge), (y - cy) / (H * 0.4 * fogEdge)) > 1) continue; const restored = i < nb * grow + 1; if (restored) building(g, x, y, 26, 24, P, true, i === 0 ? "tower" : ""); else { g.fillStyle = shade(P.wall, -.2); g.globalAlpha = .7; rr(g, x - 12, y - 14, 24, 14, 2); g.fill(); g.globalAlpha = 1; } }
      // bell tower centre
      building(g, cx, cy + 4, 24, 40, P, grow > 0.4, "tower");
      particles(g, S, "wisps"); particles(g, S, "bats");
    },

    // 10 · grand axial boulevard capital
    "axial-boulevard": function (g, S, grow) {
      const { W, H, P, t } = S; g.fillStyle = vgrad(g, 0, 0, 0, H * 0.6, P.sky[0], P.sky[1]); g.fillRect(0, 0, W, H);
      // golden wheat plains
      g.fillStyle = vgrad(g, 0, H * 0.5, 0, H, P.ground, P.ground2); g.fillRect(0, H * 0.5, W, H);
      // windmills on the horizon frame (permanent farmland)
      for (let i = 0; i < 3; i++) { const x = W * (0.12 + i * 0.34), y = H * 0.52; g.strokeStyle = shade(P.wall, -.3); g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 22); g.stroke(); g.save(); g.translate(x, y - 22); g.rotate(t * 0.6 + i); for (let b = 0; b < 4; b++) { g.rotate(Math.PI / 2); g.fillStyle = P.wall; g.fillRect(0, -2, 16, 4); } g.restore(); }
      // the grand boulevard receding to a vanishing point (perspective)
      const vx = W * 0.5, vy = H * 0.52; g.fillStyle = P.path; g.beginPath(); g.moveTo(W * 0.32, H); g.lineTo(W * 0.68, H); g.lineTo(vx + 14, vy); g.lineTo(vx - 14, vy); g.closePath(); g.fill();
      g.strokeStyle = shade(P.path, .14); g.lineWidth = 2; for (let i = 1; i < 6; i++) { const yy = lerp(H, vy, i / 6); g.beginPath(); g.moveTo(lerp(W * 0.32, vx - 14, i / 6), yy); g.lineTo(lerp(W * 0.68, vx + 14, i / 6), yy); g.stroke(); }
      // buildings lining the boulevard, growing taller/denser toward the city
      const nb = Math.round(lerp(4, 12, grow));
      for (let i = 0; i < nb; i++) { const side = i % 2 ? 1 : -1, depth = (i / nb); const yy = lerp(H * 0.96, vy + 24, depth), sc = lerp(1, 0.3, depth), bx = vx + side * lerp(W * 0.2, 22, depth); building(g, bx, yy, 30 * sc, 30 * sc, P, true, ""); }
      // the monument / clock tower at the vanishing point
      g.save(); const ms = lerp(0.3, 1, grow); building(g, vx, vy + 8, 22 * ms, 56 * ms, P, true, "tower"); g.fillStyle = P.glow; g.beginPath(); g.arc(vx, vy - 48 * ms + 8, 3 * ms, 0, TAU); g.fill(); g.restore();
      particles(g, S, "pollen"); particles(g, S, "swallows");
    },
  };

  // ── per-canvas runner ───────────────────────────────────────────────────────
  const runners = [];
  function setup(cv) {
    const id = cv.dataset.zone, spec = DATA[id]; if (!spec || !SCENES[spec.topology]) return;
    const ctx = cv.getContext("2d");
    const baseW = +cv.dataset.w || 560, baseH = +cv.dataset.h || 300;
    function size() { const dpr = Math.min(2, devicePixelRatio || 1); cv.width = baseW * dpr; cv.height = baseH * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener("resize", size);
    const S = { W: baseW, H: baseH, P: spec.palette, t: 0, prng: mulberry(id.length * 999 + 7) };
    const scene = SCENES[spec.topology];
    let grow = 0.42, target = 0.42, autop = true, vis = true;
    const io = new IntersectionObserver((es) => es.forEach((e) => { vis = e.isIntersecting; }), { threshold: 0.05 }); io.observe(cv);
    const r = { cv, draw(dt) { if (!vis) return; S.t += dt; if (autop && !RM) { target = 0.5 + 0.5 * Math.sin(S.t * 0.18); } grow += (target - grow) * Math.min(1, dt * 2.2); ctx.clearRect(0, 0, baseW, baseH); ctx.imageSmoothingEnabled = true; scene(ctx, S, clamp(grow, 0, 1)); vignette(ctx, S); }, setGrow(v) { autop = false; target = v; }, setAuto() { autop = true; } };
    runners.push(r);
    // optional controls (slider) if a sibling [data-grow-for=id] exists
    const sl = document.querySelector('[data-grow-for="' + id + '"]'); if (sl) { sl.addEventListener("input", () => r.setGrow(+sl.value / 100)); sl.addEventListener("dblclick", () => r.setAuto()); }
    return r;
  }
  function vignette(g, S) { const { W, H } = S; g.save(); const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.22)"); g.fillStyle = v; g.fillRect(0, 0, W, H); g.restore(); }

  let last = 0;
  function loop(ts) { const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; for (const r of runners) { try { r.draw(dt); } catch (e) { /* keep others alive */ } } requestAnimationFrame(loop); }

  function boot() { document.querySelectorAll("canvas[data-zone]").forEach(setup); requestAnimationFrame(loop); }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot); else boot();
  window.__zoneEngine = { runners };
})();
