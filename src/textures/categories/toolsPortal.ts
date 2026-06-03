// Wave 11 — Portal Magic Tools.

function shadow(ctx: CanvasRenderingContext2D, w: number, y?: number) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, y || 22, w, 4, 0, 0, Math.PI*2); ctx.fill();
}

function magicHalo(ctx: CanvasRenderingContext2D, color: string, r: number) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
}

// 1. Wand
function drawWand(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  ctx.save(); ctx.rotate(-0.5);
  // Stick
  const g = ctx.createLinearGradient(0, -16, 0, 16);
  g.addColorStop(0, "#7a4818"); g.addColorStop(0.5, "#3a2008"); g.addColorStop(1, "#1a0e04");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-1.4, 16); ctx.lineTo(-2.2, -14); ctx.lineTo(2.2, -14); ctx.lineTo(1.4, 16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 1.0; ctx.stroke();
  // Bumps along the stick
  ctx.fillStyle = "#1a0e04";
  [-8, 0, 8].forEach(y => { ctx.beginPath(); ctx.ellipse(0, y, 2.5, 1.2, 0, 0, Math.PI*2); ctx.fill(); });
  // Crystal tip
  ctx.translate(0, -14);
  magicHalo(ctx, "rgba(120,200,255,0.55)", 12);
  const cg = ctx.createLinearGradient(-4, 0, 4, 0);
  cg.addColorStop(0, "#ffffff"); cg.addColorStop(0.4, "#80c8f8"); cg.addColorStop(1, "#1a4080");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(0, -10); ctx.lineTo(4, -4); ctx.lineTo(2, 2); ctx.lineTo(-2, 2); ctx.lineTo(-4, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a4080"; ctx.lineWidth = 1.2; ctx.stroke();
  // Facets
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, -4); ctx.stroke();
  // Sparkles
  ctx.fillStyle = "#fffce0";
  [[8, -4], [-7, 6], [10, 6]].forEach(([x, y]) => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const r = i % 2 === 0 ? 1.8 : 0.5;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  });
  ctx.restore();
}

// 2. Spellbook
function drawSpellbook(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Cover
  const g = ctx.createLinearGradient(0, -14, 0, 14);
  g.addColorStop(0, "#5a1010"); g.addColorStop(0.5, "#3a0a0a"); g.addColorStop(1, "#1a0404");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, -14); ctx.lineTo(16, -14); ctx.lineTo(16, 14); ctx.lineTo(-16, 14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0204"; ctx.lineWidth = 1.8; ctx.stroke();
  // Pages edge
  ctx.fillStyle = "#f5ebd2";
  ctx.fillRect(16, -12, 2, 24);
  ctx.fillRect(-18, -12, 2, 24);
  ctx.strokeStyle = "#a87010"; ctx.lineWidth = 0.6;
  for (let i = -10; i < 12; i += 1.5) {
    ctx.beginPath(); ctx.moveTo(16, i); ctx.lineTo(18, i); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-18, i); ctx.lineTo(-16, i); ctx.stroke();
  }
  // Spine
  ctx.fillStyle = "#3a0a0a";
  ctx.fillRect(-2, -14, 4, 28);
  ctx.strokeStyle = "#0a0204"; ctx.lineWidth = 1.0; ctx.stroke();
  // Gilt sigil — glowing eye
  magicHalo(ctx, "rgba(248,192,64,0.6)", 13);
  ctx.fillStyle = "#f8c040";
  ctx.beginPath();
  ctx.moveTo(-9, 0); ctx.bezierCurveTo(-4, -8, 4, -8, 9, 0); ctx.bezierCurveTo(4, 8, -4, 8, -9, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a3408"; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.fillStyle = "#1a0404";
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff4a0";
  ctx.beginPath(); ctx.arc(-1, -1, 1, 0, Math.PI*2); ctx.fill();
  // Corner studs
  ctx.fillStyle = "#a87010";
  [[-12, -10], [12, -10], [-12, 10], [12, 10]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.6; ctx.stroke();
  });
  // Highlight on cover
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(-14, -13, 28, 2);
}

// 3. Crystal Ball
function drawCrystalBall(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Dark wooden stand
  ctx.fillStyle = "#3a2008";
  ctx.beginPath();
  ctx.moveTo(-10, 18); ctx.lineTo(10, 18); ctx.lineTo(8, 12); ctx.lineTo(-8, 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Three claws
  ctx.fillStyle = "#5a3814";
  ctx.beginPath();
  ctx.moveTo(-12, 12); ctx.bezierCurveTo(-12, 6, -6, 4, -4, 8);
  ctx.lineTo(-6, 12);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, 12); ctx.bezierCurveTo(12, 6, 6, 4, 4, 8);
  ctx.lineTo(6, 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.stroke();
  // Halo
  magicHalo(ctx, "rgba(184,120,232,0.6)", 22);
  // Glass orb
  const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.4, "#d8a0e8"); g.addColorStop(0.8, "#5a2080"); g.addColorStop(1, "#1a0824");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, -2, 12, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0824"; ctx.lineWidth = 1.4; ctx.stroke();
  // Swirling mist inside
  ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(-2, 0, 6, Math.PI*0.1, Math.PI*1.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(3, -3, 4, Math.PI*1.2, Math.PI*2.2); ctx.stroke();
  // Highlight reflection
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(-5, -7, 3, 2, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.arc(-1, -8, 0.8, 0, Math.PI*2); ctx.fill();
}

// 4. Potion
function drawPotion(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Cork
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-3, -16, 6, 5);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2; ctx.strokeRect(-3, -16, 6, 5);
  // Neck
  ctx.fillStyle = "rgba(245,235,210,0.7)";
  ctx.fillRect(-2.5, -11, 5, 5);
  ctx.strokeStyle = "#1a4060"; ctx.lineWidth = 1.0; ctx.strokeRect(-2.5, -11, 5, 5);
  // Bottle body
  const g = ctx.createRadialGradient(-3, 4, 2, 0, 4, 14);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.5, "rgba(56,200,120,0.85)");
  g.addColorStop(1, "rgba(20,80,40,0.85)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-3, -6); ctx.lineTo(3, -6);
  ctx.bezierCurveTo(12, -2, 12, 16, 0, 16);
  ctx.bezierCurveTo(-12, 16, -12, -2, -3, -6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a3018"; ctx.lineWidth = 1.4; ctx.stroke();
  // Liquid level
  ctx.fillStyle = "#38c878";
  ctx.beginPath();
  ctx.moveTo(-9, 2); ctx.bezierCurveTo(-12, 16, 12, 16, 9, 2);
  ctx.bezierCurveTo(5, 4, -5, 4, -9, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a3018"; ctx.lineWidth = 0.8; ctx.stroke();
  // Bubbles
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  [[-3, 6, 1.4], [2, 9, 1.0], [-1, 12, 1.6], [4, 4, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  });
  // Label
  ctx.fillStyle = "#f5ebd2";
  ctx.fillRect(-6, 6, 12, 5);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8; ctx.strokeRect(-6, 6, 12, 5);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(4, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, 9.5); ctx.lineTo(2, 9.5); ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.ellipse(-5, 0, 1.2, 5, -0.3, 0, Math.PI*2); ctx.fill();
}

// 5. Cauldron
function drawCauldron(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 22);
  // Body
  const g = ctx.createLinearGradient(0, -6, 0, 18);
  g.addColorStop(0, "#3a3a40"); g.addColorStop(0.5, "#1a1a1e"); g.addColorStop(1, "#0a0a0e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-18, -4); ctx.lineTo(18, -4);
  ctx.bezierCurveTo(20, 18, -20, 18, -18, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1.8; ctx.stroke();
  // Rim
  ctx.fillStyle = "#5a5a62";
  ctx.beginPath(); ctx.ellipse(0, -4, 18, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4; ctx.stroke();
  // Bubbling potion surface
  magicHalo(ctx, "rgba(120,232,120,0.5)", 22);
  ctx.fillStyle = "#38c878";
  ctx.beginPath(); ctx.ellipse(0, -4, 16, 3.2, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a3018"; ctx.lineWidth = 0.8; ctx.stroke();
  // Bubbles rising
  ctx.fillStyle = "#aef0c0";
  [[-6, -5, 1.8], [3, -5, 1.4], [-2, -10, 1.2], [6, -12, 1.0], [-9, -14, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  });
  // Steam wisps
  ctx.strokeStyle = "rgba(220,255,220,0.6)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.bezierCurveTo(-12, -14, -8, -16, -10, -20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -10); ctx.bezierCurveTo(8, -14, 4, -18, 8, -22); ctx.stroke();
  // Iron bands
  ctx.strokeStyle = "#5a5a62"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(0, 4, 18.5, 5, 0, 0, Math.PI); ctx.stroke();
  // Legs
  ctx.fillStyle = "#1a1a1e";
  [-10, 0, 10].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x - 2, 14); ctx.lineTo(x + 2, 14); ctx.lineTo(x, 20);
    ctx.closePath(); ctx.fill();
  });
}

// 6. Rune Stone
function drawRuneStone(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Stone body
  const g = ctx.createLinearGradient(-12, -16, 12, 16);
  g.addColorStop(0, "#a8a098"); g.addColorStop(0.5, "#5a5048"); g.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-12, -16); ctx.lineTo(13, -14); ctx.lineTo(15, 12); ctx.lineTo(-10, 16); ctx.lineTo(-14, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.8; ctx.stroke();
  // Cracks
  ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(-4, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(12, 4); ctx.stroke();
  // Glowing rune carving
  magicHalo(ctx, "rgba(0,200,255,0.45)", 16);
  ctx.strokeStyle = "#80f0ff"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
  ctx.shadowColor = "#80f0ff"; ctx.shadowBlur = 4;
  // Algiz-like rune
  ctx.beginPath();
  ctx.moveTo(0, 8); ctx.lineTo(0, -8);
  ctx.moveTo(0, -8); ctx.lineTo(-6, -2);
  ctx.moveTo(0, -8); ctx.lineTo(6, -2);
  ctx.moveTo(0, 0); ctx.lineTo(-4, 4);
  ctx.moveTo(0, 0); ctx.lineTo(4, 4);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Inner darker rune line
  ctx.strokeStyle = "rgba(20,80,160,0.6)"; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 8); ctx.lineTo(0, -8);
  ctx.moveTo(0, -8); ctx.lineTo(-6, -2);
  ctx.moveTo(0, -8); ctx.lineTo(6, -2);
  ctx.stroke();
  // Highlight on stone
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath(); ctx.ellipse(-6, -10, 4, 2, -0.4, 0, Math.PI*2); ctx.fill();
}

// 7. Magic Scroll
function drawScroll(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Top rod
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-16, -14, 32, 4);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2; ctx.strokeRect(-16, -14, 32, 4);
  ctx.fillStyle = "#a87010";
  ctx.beginPath(); ctx.arc(-16, -12, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(16, -12, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8; ctx.stroke();
  // Parchment
  const g = ctx.createLinearGradient(0, -10, 0, 14);
  g.addColorStop(0, "#fdf3d8"); g.addColorStop(1, "#d8b870");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-15, -10); ctx.lineTo(15, -10);
  ctx.lineTo(15, 12); ctx.lineTo(13, 14); ctx.lineTo(-13, 14); ctx.lineTo(-15, 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#7a5018"; ctx.lineWidth = 1.4; ctx.stroke();
  // Script text lines — clean wavy strokes, no heavy blur (kept crisp so they
  // read as writing rather than a muddy smudge at 56px).
  ctx.strokeStyle = "#6a4a8a"; ctx.lineWidth = 1.0;
  for (let i = 0; i < 4; i++) {
    const y = -6 + i * 4;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    for (let x = -10; x < 10; x += 2) {
      ctx.lineTo(x + 1, y - 0.6);
      ctx.lineTo(x + 2, y);
    }
    ctx.stroke();
  }
  // Wax seal — its halo sits on the seal (bottom-right), not the scroll centre,
  // so it no longer smudges a red blob across the text.
  ctx.save();
  ctx.translate(11, 8);
  magicHalo(ctx, "rgba(200,32,24,0.45)", 7);
  ctx.restore();
  ctx.fillStyle = "#c82018";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 5 : 4;
    const x = 11 + Math.cos(a) * r, y = 8 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5a0808"; ctx.lineWidth = 0.8; ctx.stroke();
  // Embossed star sigil on the seal (drawn path — reliable across canvases)
  ctx.fillStyle = "#5a0808";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 2.4 : 1.0;
    const x = 11 + Math.cos(a) * r, y = 8 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
}

// 8. Hourglass
function drawHourglass(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Wood frame
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-12, -18, 24, 4);
  ctx.fillRect(-12, 14, 24, 4);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2;
  ctx.strokeRect(-12, -18, 24, 4);
  ctx.strokeRect(-12, 14, 24, 4);
  // Side rods
  ctx.fillStyle = "#5a3814";
  ctx.fillRect(-11, -14, 2, 28);
  ctx.fillRect(9, -14, 2, 28);
  // Glass body — two cones meeting at center
  const g = ctx.createLinearGradient(-8, 0, 8, 0);
  g.addColorStop(0, "rgba(245,235,210,0.4)"); g.addColorStop(0.5, "rgba(255,255,255,0.7)"); g.addColorStop(1, "rgba(245,235,210,0.4)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(1, 0); ctx.lineTo(8, 14); ctx.lineTo(-8, 14); ctx.lineTo(-1, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a4060"; ctx.lineWidth = 1.2; ctx.stroke();
  // Top sand
  ctx.fillStyle = "#f8c040";
  ctx.beginPath();
  ctx.moveTo(-7, -10); ctx.lineTo(7, -10); ctx.lineTo(0.6, -1); ctx.lineTo(-0.6, -1);
  ctx.closePath(); ctx.fill();
  // Bottom sand pile
  ctx.fillStyle = "#f8c040";
  ctx.beginPath();
  ctx.moveTo(-6, 13); ctx.bezierCurveTo(-4, 7, 4, 7, 6, 13);
  ctx.closePath(); ctx.fill();
  // Falling stream
  ctx.fillStyle = "#f8c040";
  ctx.fillRect(-0.4, 0, 0.8, 8);
  // Magic glow
  magicHalo(ctx, "rgba(248,192,64,0.4)", 14);
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-1, -2); ctx.lineTo(-2, -12); ctx.closePath(); ctx.fill();
}

// 9. Rune Pendant / Amulet
function drawAmulet(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Chain
  ctx.strokeStyle = "#a87010"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, -16, 14, Math.PI*0.85, Math.PI*0.15, true); ctx.stroke();
  // Chain texture
  ctx.strokeStyle = "#5a3408"; ctx.lineWidth = 0.6;
  for (let i = 0; i < 14; i++) {
    const a = Math.PI*0.85 - (i / 14) * Math.PI*0.7;
    const x = Math.cos(a) * 14, y = -16 + Math.sin(a) * 14;
    ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI*2); ctx.stroke();
  }
  // Frame
  const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
  g.addColorStop(0, "#fff4a0"); g.addColorStop(0.5, "#a87010"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 4, 12, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Decorative outer ring marks
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.8;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, 4 + Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a) * 12, 4 + Math.sin(a) * 12);
    ctx.stroke();
  }
  // Inner gem
  magicHalo(ctx, "rgba(232,40,40,0.55)", 12);
  const gemG = ctx.createRadialGradient(-2, 1, 1, 0, 4, 8);
  gemG.addColorStop(0, "#ffffff"); gemG.addColorStop(0.4, "#f86060"); gemG.addColorStop(1, "#5a0808");
  ctx.fillStyle = gemG;
  ctx.beginPath(); ctx.arc(0, 4, 6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a0408"; ctx.lineWidth = 1.0; ctx.stroke();
  // Facet lines
  ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(6, 4); ctx.stroke();
  // Sparkle
  ctx.fillStyle = "#fffce0";
  ctx.beginPath(); ctx.arc(-2, 1, 1.4, 0, Math.PI*2); ctx.fill();
  // Top loop
  ctx.fillStyle = "#a87010";
  ctx.beginPath(); ctx.arc(0, -8, 2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 0.8; ctx.stroke();
}

// 10. Crystal Cluster
function drawCrystals(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Base rock
  ctx.fillStyle = "#3a2820";
  ctx.beginPath();
  ctx.moveTo(-16, 18); ctx.lineTo(16, 18); ctx.lineTo(14, 12); ctx.lineTo(-14, 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Magical halo
  magicHalo(ctx, "rgba(184,120,232,0.5)", 22);
  // Three crystals
  const drawCrystal = (cx: number, cy: number, h: number, w: number, color: string, dark: string) => {
    const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, color); g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w, cy); ctx.lineTo(cx, cy - h); ctx.lineTo(cx + w, cy);
    ctx.lineTo(cx + w*0.7, cy + h*0.3); ctx.lineTo(cx - w*0.7, cy + h*0.3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2; ctx.stroke();
    // Center facet line
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(cx, cy - h); ctx.lineTo(cx, cy + h*0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - h); ctx.lineTo(cx - w, cy); ctx.stroke();
  };
  drawCrystal(-7, 12, 16, 5, "#80c8f8", "#1a4080");
  drawCrystal(7, 12, 18, 5, "#b878e8", "#3a1058");
  drawCrystal(0, 12, 24, 6, "#80f0c0", "#0a4030");
  // Sparkles
  ctx.fillStyle = "#fffce0";
  [[-12, -4], [10, -8], [-3, -16]].forEach(([x, y]) => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const r = i % 2 === 0 ? 1.6 : 0.4;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  });
}

// 11. Tarot Card
function drawTarotCard(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  ctx.save(); ctx.rotate(-0.1);
  // Card
  ctx.fillStyle = "#0a0a24";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-12, -18, 24, 34, 2) : ctx.rect(-12, -18, 24, 34);
  ctx.fill();
  ctx.strokeStyle = "#f8c040"; ctx.lineWidth = 1.4; ctx.stroke();
  // Inner gold border
  ctx.strokeStyle = "#a87010"; ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.rect(-10, -16, 20, 30);
  ctx.stroke();
  // Sun motif
  magicHalo(ctx, "rgba(248,192,64,0.5)", 14);
  ctx.strokeStyle = "#f8c040"; ctx.lineWidth = 1.0;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
    ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.stroke();
  }
  ctx.fillStyle = "#f8c040";
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#5a3408"; ctx.lineWidth = 0.8; ctx.stroke();
  // Eye in sun
  ctx.fillStyle = "#0a0a24";
  ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 1.4, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff4a0";
  ctx.beginPath(); ctx.arc(0, 0, 0.7, 0, Math.PI*2); ctx.fill();
  // Roman numeral at top
  ctx.fillStyle = "#f8c040"; ctx.font = "bold 6px serif"; ctx.textAlign = "center";
  ctx.fillText("XIX", 0, -10);
  // Bottom name
  ctx.font = "5px serif";
  ctx.fillText("THE  SUN", 0, 14);
  // Stars
  ctx.fillStyle = "#fffce0";
  [[-6, -4, 0.8], [7, -6, 1.0], [-5, 8, 0.7]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

// 12. Mortar & Pestle
function drawMortar(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Mortar bowl
  const g = ctx.createLinearGradient(0, -2, 0, 16);
  g.addColorStop(0, "#a8a098"); g.addColorStop(0.5, "#5a5048"); g.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, -2); ctx.lineTo(16, -2);
  ctx.bezierCurveTo(18, 16, -18, 16, -16, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.8; ctx.stroke();
  // Inner rim
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.ellipse(0, -2, 14, 3.5, 0, 0, Math.PI*2); ctx.fill();
  // Inner contents (ground herbs)
  ctx.fillStyle = "#5a8038";
  ctx.beginPath(); ctx.ellipse(0, -1, 10, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#80c050";
  [[-4, -2, 1.2], [3, -1, 1.0], [-1, -3, 0.8], [6, -2, 0.7]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  });
  // Pestle leaning out
  ctx.save(); ctx.translate(8, -6); ctx.rotate(0.6);
  const pg = ctx.createLinearGradient(-2.5, 0, 2.5, 0);
  pg.addColorStop(0, "#a8a098"); pg.addColorStop(0.5, "#3a3a30"); pg.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.moveTo(-2, -16); ctx.lineTo(2, -16); ctx.lineTo(3, 4); ctx.lineTo(-3, 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.4; ctx.stroke();
  // Ball end
  ctx.fillStyle = "#5a5048";
  ctx.beginPath(); ctx.arc(0, 4, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.arc(-1, 3, 1, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath(); ctx.ellipse(-10, 4, 2, 6, -0.4, 0, Math.PI*2); ctx.fill();
}

// 13. Skull Candle
function drawSkullCandle(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  // Base / wax pool
  ctx.fillStyle = "#a87838";
  ctx.beginPath(); ctx.ellipse(0, 18, 14, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Skull
  const g = ctx.createRadialGradient(-4, -4, 4, 0, 0, 18);
  g.addColorStop(0, "#fff8e0"); g.addColorStop(0.6, "#d8c890"); g.addColorStop(1, "#5a4818");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-12, 4); ctx.bezierCurveTo(-12, -16, 12, -16, 12, 4);
  ctx.lineTo(8, 12); ctx.lineTo(-8, 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  // Jaw
  ctx.fillStyle = "#d8c890";
  ctx.fillRect(-8, 12, 16, 4);
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2; ctx.strokeRect(-8, 12, 16, 4);
  // Teeth
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 0.7;
  for (let i = -7; i <= 7; i += 2) {
    ctx.beginPath(); ctx.moveTo(i, 12); ctx.lineTo(i, 16); ctx.stroke();
  }
  // Eye sockets — glowing
  magicHalo(ctx, "rgba(255,80,40,0.6)", 14);
  ctx.fillStyle = "#1a0404";
  ctx.beginPath(); ctx.ellipse(-4, -2, 3, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, -2, 3, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#f86040";
  ctx.beginPath(); ctx.arc(-4, -1, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -1, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fffce0";
  ctx.beginPath(); ctx.arc(-4, -1, 0.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -1, 0.5, 0, Math.PI*2); ctx.fill();
  // Nose
  ctx.fillStyle = "#1a0404";
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(-2, 8); ctx.lineTo(2, 8); ctx.closePath(); ctx.fill();
  // Candle stub on top
  ctx.fillStyle = "#f5ebd2";
  ctx.fillRect(-3, -22, 6, 8);
  ctx.strokeStyle = "#7a5018"; ctx.lineWidth = 0.8; ctx.strokeRect(-3, -22, 6, 8);
  ctx.fillStyle = "rgba(168,112,16,0.4)";
  ctx.fillRect(-3, -16, 6, 2);
  // Wick
  ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -25); ctx.stroke();
  // Flame
  magicHalo(ctx, "rgba(248,160,40,0.4)", 8);
  const fg = ctx.createRadialGradient(0, -27, 0.5, 0, -27, 5);
  fg.addColorStop(0, "#ffffff"); fg.addColorStop(0.4, "#fff4a0"); fg.addColorStop(1, "#f06020");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.bezierCurveTo(-3, -25, 3, -28, 0, -32); ctx.bezierCurveTo(-3, -28, 3, -25, 0, -22);
  ctx.closePath(); ctx.fill();
  // Wax drip
  ctx.fillStyle = "#f5ebd2";
  ctx.beginPath();
  ctx.moveTo(2, -16); ctx.bezierCurveTo(3, -14, 4, -10, 2, -10);
  ctx.lineTo(0, -10); ctx.lineTo(0, -16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#7a5018"; ctx.lineWidth = 0.6; ctx.stroke();
}

// 14. Witch Broom
function drawBroom(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  ctx.save();
  ctx.rotate(-0.55);
  // Long wooden handle — runs upper-right to lower-left so the bristles
  // sit at the bottom-left like a swept broom resting on the ground.
  const hg = ctx.createLinearGradient(-22, 8, 18, -22);
  hg.addColorStop(0, "#5a3414");
  hg.addColorStop(0.5, "#a87838");
  hg.addColorStop(1, "#6a4218");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(20, -20);
  ctx.lineTo(22, -16);
  ctx.lineTo(-12, 4);
  ctx.lineTo(-14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4;
  ctx.stroke();
  // Knob on the far end of the handle
  ctx.fillStyle = "#5a3408";
  ctx.beginPath(); ctx.arc(22, -19, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 0.9; ctx.stroke();
  // Bristle bundle — wider cone splayed away from the handle tip
  ctx.fillStyle = "#c89348";
  ctx.beginPath();
  ctx.moveTo(-10, 2);          // handle attach top
  ctx.lineTo(-16, 6);          // handle attach bottom
  ctx.lineTo(-28, 18);         // outer corner low
  ctx.lineTo(-22, 6);          // splay tip
  ctx.lineTo(-26, -2);         // outer corner high
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4;
  ctx.stroke();
  // Individual bristle strokes — fan out from the binding
  ctx.strokeStyle = "#7a4a18";
  ctx.lineWidth = 0.9;
  const tipX = -13, tipY = 4;
  const ends = [
    [-28, -2], [-28, 2], [-28, 6], [-28, 10], [-28, 14], [-28, 18],
    [-24, -3], [-24, 17], [-26, 0], [-26, 16],
  ];
  ends.forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  });
  // Twine wrap binding the bristles to the handle
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(-10, 2); ctx.lineTo(-16, 6);
  ctx.stroke();
  ctx.strokeStyle = "#d8a060"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, 2); ctx.lineTo(-16, 6);
  ctx.moveTo(-11, 4); ctx.lineTo(-15, 8);
  ctx.stroke();
  ctx.restore();
  // Sparkle trail (kept — sells the "witch" part)
  ctx.fillStyle = "#fffce0";
  [[-22, 20, 1.2], [-26, 14, 0.9], [-22, 10, 0.7], [16, -22, 0.8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 === 0 ? r * 2 : r * 0.5;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  });
}

// 15. Pentagram
function drawPentagram(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Outer chalk circle
  magicHalo(ctx, "rgba(232,40,200,0.35)", 22);
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.4; ctx.stroke();
  // Stone
  ctx.fillStyle = "#3a2820";
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI*2); ctx.fill();
  // Glowing pentagram
  ctx.strokeStyle = "#f060c0"; ctx.lineWidth = 1.6; ctx.lineJoin = "round";
  ctx.shadowColor = "#f060c0"; ctx.shadowBlur = 5;
  const points: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI/2 + (i / 5) * Math.PI * 2;
    points.push([Math.cos(a) * 14, Math.sin(a) * 14]);
  }
  ctx.beginPath();
  // Star draw order: 0 → 2 → 4 → 1 → 3 → 0
  const order = [0, 2, 4, 1, 3, 0];
  order.forEach((idx, i) => {
    const [x, y] = points[idx];
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  // Outer glowing circle
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.stroke();
  ctx.shadowBlur = 0;
  // Glyphs around
  ctx.fillStyle = "#f060c0";
  ctx.font = "bold 5px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ["✦","✧","✦","✧","✦"].forEach((s, i) => {
    const a = -Math.PI/2 + (i / 5) * Math.PI * 2 + Math.PI/5;
    ctx.fillText(s, Math.cos(a) * 11, Math.sin(a) * 11);
  });
  // Center sparkle
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const r = i % 2 === 0 ? 2 : 0.5;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

// 16. Magic Mirror
function drawMagicMirror(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Frame
  const g = ctx.createLinearGradient(0, -18, 0, 18);
  g.addColorStop(0, "#fff4a0"); g.addColorStop(0.5, "#a87010"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -2, 14, 18, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Inner mirror surface
  magicHalo(ctx, "rgba(120,200,255,0.4)", 18);
  const mg = ctx.createLinearGradient(0, -16, 0, 12);
  mg.addColorStop(0, "#80c8f8"); mg.addColorStop(0.5, "#3060a0"); mg.addColorStop(1, "#0a1830");
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.ellipse(0, -2, 10, 14, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  // Reflective shine — diagonal swipe
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(-6, -14); ctx.lineTo(8, 0); ctx.lineTo(6, 4); ctx.lineTo(-8, -10);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath(); ctx.ellipse(-4, -10, 1.4, 4, -0.4, 0, Math.PI*2); ctx.fill();
  // Decorative top finial
  ctx.fillStyle = "#a87010";
  ctx.beginPath();
  ctx.moveTo(-4, -18); ctx.lineTo(0, -22); ctx.lineTo(4, -18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Handle base
  ctx.fillStyle = "#7a4818";
  ctx.fillRect(-4, 16, 8, 6);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.2; ctx.strokeRect(-4, 16, 8, 6);
  // Frame ornament dots
  ctx.fillStyle = "#5a3408";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 12, -2 + Math.sin(a) * 16, 0.9, 0, Math.PI*2);
    ctx.fill();
  }
}

// 17. Magic Key (skeleton key)
function drawMagicKey(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 16);
  ctx.save(); ctx.rotate(0.3);
  // Bow (round head)
  magicHalo(ctx, "rgba(248,192,64,0.5)", 14);
  const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, 10);
  g.addColorStop(0, "#fff4a0"); g.addColorStop(0.5, "#d8a020"); g.addColorStop(1, "#5a3408");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(-12, -8, 8, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.6; ctx.stroke();
  // Bow inner
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.arc(-12, -8, 4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  // Stem (shaft)
  ctx.fillStyle = "#a87010";
  ctx.fillRect(-6, -10, 18, 4);
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.strokeRect(-6, -10, 18, 4);
  // Bit (teeth at end)
  ctx.fillStyle = "#a87010";
  ctx.beginPath();
  ctx.moveTo(8, -6); ctx.lineTo(14, -6); ctx.lineTo(14, 0); ctx.lineTo(11, 0); ctx.lineTo(11, -2); ctx.lineTo(8, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(-4, -10, 14, 1);
  // Glow at tip
  ctx.fillStyle = "rgba(248,192,64,0.7)";
  ctx.beginPath(); ctx.arc(13, -4, 2, 0, Math.PI*2); ctx.fill();
  // Sparkle
  ctx.fillStyle = "#fffce0";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const r = i % 2 === 0 ? 1.6 : 0.4;
    const px = -16 + Math.cos(a) * r, py = -14 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Phase 3 net-new magic-tier tools (tool-powers overhaul).
function drawGoldenApple(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  // Halo
  magicHalo(ctx, "rgba(248,192,64,0.55)", 16);
  // Apple body
  const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
  g.addColorStop(0, "#fffce0"); g.addColorStop(0.4, "#f8c040"); g.addColorStop(1, "#7a4810");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.bezierCurveTo(-14, -10, -2, -14, 0, -10);
  ctx.bezierCurveTo(2, -14, 14, -10, 10, -2);
  ctx.bezierCurveTo(14, 8, 6, 14, 0, 14);
  ctx.bezierCurveTo(-6, 14, -14, 8, -10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  // Stem
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10); ctx.bezierCurveTo(2, -14, 0, -16, -2, -18);
  ctx.stroke();
  // Leaf
  ctx.fillStyle = "#a8d040";
  ctx.beginPath();
  ctx.ellipse(4, -14, 5, 2, -0.5, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = "#3a4a08"; ctx.lineWidth = 0.8; ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath(); ctx.ellipse(-4, -2, 3, 5, -0.3, 0, Math.PI*2); ctx.fill();
  // Sparkles
  ctx.fillStyle = "#fffce0";
  [[8, 2], [-10, 4]].forEach(([x, y]) => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const r = i % 2 === 0 ? 1.4 : 0.4;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  });
}

function drawGoldenCarrot(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 12);
  magicHalo(ctx, "rgba(248,192,64,0.5)", 16);
  // Body — long taper, gold
  const g = ctx.createLinearGradient(0, -8, 0, 18);
  g.addColorStop(0, "#fffce0"); g.addColorStop(0.4, "#f8c040"); g.addColorStop(1, "#7a4810");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(2, 20); ctx.lineTo(-2, 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.6; ctx.stroke();
  // Ridges
  ctx.strokeStyle = "rgba(58,32,8,0.6)"; ctx.lineWidth = 0.7;
  for (let i = -6; i < 18; i += 4) {
    ctx.beginPath(); ctx.moveTo(-5, i); ctx.lineTo(5, i); ctx.stroke();
  }
  // Greens at top
  ctx.fillStyle = "#5a8a18";
  for (let i = -2; i <= 2; i++) {
    ctx.save(); ctx.translate(i * 2, -8); ctx.rotate(i * 0.2);
    ctx.beginPath();
    ctx.ellipse(0, -6, 2, 6, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "#1e3a08"; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.restore();
  }
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(-2, 4, 1.2, 10, -0.1, 0, Math.PI*2); ctx.fill();
}

function drawGoldenIdol(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  magicHalo(ctx, "rgba(248,192,64,0.55)", 20);
  const gold = ctx.createLinearGradient(-12, -22, 12, 18);
  gold.addColorStop(0, "#fffce0"); gold.addColorStop(0.35, "#f8c040");
  gold.addColorStop(0.75, "#d69a18"); gold.addColorStop(1, "#7a4810");
  // Pedestal base
  ctx.fillStyle = "#b47e16";
  ctx.beginPath();
  ctx.moveTo(-13, 21); ctx.lineTo(13, 21); ctx.lineTo(9, 14); ctx.lineTo(-9, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.8; ctx.stroke();
  // Tiki / totem idol body: broad fanned headdress, narrow shoulders, tapered torso.
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(0, -23);
  ctx.lineTo(13, -16);          // right headdress flare
  ctx.lineTo(7, -10);
  ctx.lineTo(9, -4);            // cheek
  ctx.lineTo(6, 4);             // shoulder
  ctx.lineTo(8, 14);            // hip
  ctx.lineTo(-8, 14);
  ctx.lineTo(-6, 4);
  ctx.lineTo(-9, -4);
  ctx.lineTo(-7, -10);
  ctx.lineTo(-13, -16);         // left headdress flare
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2.2; ctx.stroke();
  // Carved face panel (recessed darker oval)
  ctx.fillStyle = "rgba(58,32,8,0.32)";
  ctx.beginPath(); ctx.ellipse(0, -6, 6.5, 7.5, 0, 0, Math.PI * 2); ctx.fill();
  // Heavy carved brow
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-5, -9); ctx.quadraticCurveTo(0, -11, 5, -9); ctx.stroke();
  // Eyes
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.arc(-3, -6, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -6, 1.5, 0, Math.PI * 2); ctx.fill();
  // Nose ridge
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -1); ctx.stroke();
  // Grimacing mouth
  ctx.beginPath(); ctx.moveTo(-4, 1.5); ctx.quadraticCurveTo(0, 3.5, 4, 1.5); ctx.stroke();
  // Body engraving lines
  ctx.strokeStyle = "rgba(58,32,8,0.5)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, 11); ctx.lineTo(4, 11); ctx.stroke();
  // Headdress highlight (upper-left)
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(-11, -16); ctx.lineTo(-6, -11); ctx.lineTo(-1, -19);
  ctx.closePath();
  ctx.fill();
}

function drawGoldenSheep(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  magicHalo(ctx, "rgba(248,192,64,0.5)", 18);
  // Cloud-like body — gold-tinged wool
  const g = ctx.createRadialGradient(-3, -2, 3, 0, 0, 14);
  g.addColorStop(0, "#fffce0"); g.addColorStop(0.6, "#f8c040"); g.addColorStop(1, "#7a4810");
  ctx.fillStyle = g;
  for (const [x, y, r] of [[-8, -2, 6], [0, -6, 7], [8, -2, 6], [-4, 4, 6], [5, 5, 6]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.2; ctx.stroke();
  }
  // Head poking out (right side)
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.ellipse(13, 0, 4, 3, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.0; ctx.stroke();
  // Ear
  ctx.fillStyle = "#3a2008";
  ctx.beginPath(); ctx.moveTo(11, -2); ctx.lineTo(14, -5); ctx.lineTo(13, -1); ctx.closePath(); ctx.fill();
  // Eye highlight
  ctx.fillStyle = "#fffce0";
  ctx.beginPath(); ctx.arc(14, -1, 0.7, 0, Math.PI*2); ctx.fill();
  // Legs
  ctx.fillStyle = "#3a2008";
  ctx.fillRect(-7, 10, 2.4, 8);
  ctx.fillRect(0, 10, 2.4, 8);
  ctx.fillRect(6, 10, 2.4, 8);
  // Sparkles
  ctx.fillStyle = "#fffce0";
  [[-10, -10], [12, -8], [10, 10]].forEach(([x, y]) => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const r = i % 2 === 0 ? 1.4 : 0.4;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  });
}

function drawPhilosophersStone(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 14);
  magicHalo(ctx, "rgba(232,40,40,0.55)", 18);
  // Stone faceted gem
  const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 14);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.3, "#f86040"); g.addColorStop(0.7, "#a82018"); g.addColorStop(1, "#3a0808");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(12, -4);
  ctx.lineTo(8, 12);
  ctx.lineTo(-8, 12);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0808"; ctx.lineWidth = 1.8; ctx.stroke();
  // Facet lines
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(0, 12);
  ctx.moveTo(-12, -4); ctx.lineTo(12, -4);
  ctx.moveTo(0, -14); ctx.lineTo(-8, 12);
  ctx.moveTo(0, -14); ctx.lineTo(8, 12);
  ctx.stroke();
  // Center sparkle
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const r = i % 2 === 0 ? 2.4 : 0.6;
    const px = Math.cos(a) * r, py = -2 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  // Outer alchemical glyph
  ctx.strokeStyle = "rgba(248,192,64,0.7)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, -2, 16, 0, Math.PI*2); ctx.stroke();
}

function drawMinersHat(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 18);
  // Helmet body
  const g = ctx.createRadialGradient(-4, -6, 3, 0, 4, 18);
  g.addColorStop(0, "#f8c040"); g.addColorStop(0.6, "#a87010"); g.addColorStop(1, "#3a2008");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.bezierCurveTo(-16, -16, 16, -16, 16, 6);
  ctx.lineTo(14, 10); ctx.lineTo(-14, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.8; ctx.stroke();
  // Brim
  ctx.fillStyle = "#5a3408";
  ctx.beginPath();
  ctx.ellipse(0, 10, 18, 3, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = "#1a0e04"; ctx.lineWidth = 1.4; ctx.stroke();
  // Lamp on front
  ctx.fillStyle = "#a8a8b0";
  ctx.beginPath();
  ctx.moveTo(-6, -10); ctx.lineTo(6, -10); ctx.lineTo(8, -4); ctx.lineTo(-8, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 1.4; ctx.stroke();
  // Lamp lens — glowing
  const lampG = ctx.createRadialGradient(0, -7, 0.5, 0, -7, 5);
  lampG.addColorStop(0, "#ffffff"); lampG.addColorStop(0.5, "#fff4a0"); lampG.addColorStop(1, "#a87010");
  ctx.fillStyle = lampG;
  ctx.beginPath(); ctx.arc(0, -7, 4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 1.0; ctx.stroke();
  // Light beam
  ctx.fillStyle = "rgba(255,244,160,0.45)";
  ctx.beginPath();
  ctx.moveTo(-3, -7); ctx.lineTo(-14, -22); ctx.lineTo(14, -22); ctx.lineTo(3, -7);
  ctx.closePath(); ctx.fill();
  // Magical glimmer
  magicHalo(ctx, "rgba(184,120,232,0.4)", 16);
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.ellipse(-8, -2, 4, 7, -0.4, 0, Math.PI*2); ctx.fill();
}

export const ICONS = {
  wand:          { label:"Wand",          color:"#80c8f8", draw:drawWand },
  spellbook:     { label:"Spellbook",     color:"#5a1010", draw:drawSpellbook },
  crystal_ball:  { label:"Crystal Ball",  color:"#b878e8", draw:drawCrystalBall },
  potion:        { label:"Potion",        color:"#38c878", draw:drawPotion },
  cauldron:      { label:"Cauldron",      color:"#1a1a1e", draw:drawCauldron },
  rune_stone:    { label:"Rune Stone",    color:"#80f0ff", draw:drawRuneStone },
  scroll:        { label:"Magic Scroll",  color:"#fdf3d8", draw:drawScroll },
  hourglass:     { label:"Hourglass",     color:"#f8c040", draw:drawHourglass },
  amulet:        { label:"Amulet",        color:"#f86060", draw:drawAmulet },
  crystals:      { label:"Crystal Cluster", color:"#80c8f8", draw:drawCrystals },
  tarot_card:    { label:"Tarot Card",    color:"#f8c040", draw:drawTarotCard },
  mortar_pestle: { label:"Mortar & Pestle", color:"#5a5048", draw:drawMortar },
  skull_candle:  { label:"Skull Candle",  color:"#d8c890", draw:drawSkullCandle },
  broom:         { label:"Witch Broom",   color:"#a87838", draw:drawBroom },
  pentagram:     { label:"Pentagram",     color:"#f060c0", draw:drawPentagram },
  magic_mirror:  { label:"Magic Mirror",  color:"#80c8f8", draw:drawMagicMirror },
  magic_key:     { label:"Magic Key",     color:"#d8a020", draw:drawMagicKey },
  golden_apple:      { label:"Golden Apple",       color:"#f8c040", draw:drawGoldenApple },
  golden_carrot:     { label:"Golden Carrot",      color:"#f8c040", draw:drawGoldenCarrot },
  golden_idol:       { label:"Golden Idol",        color:"#f8c040", draw:drawGoldenIdol },
  golden_sheep:      { label:"Golden Sheep",       color:"#f8c040", draw:drawGoldenSheep },
  philosophers_stone:{ label:"Philosopher's Stone", color:"#f86040", draw:drawPhilosophersStone },
  miners_hat:        { label:"Miner's Hat",         color:"#f8c040", draw:drawMinersHat },
};
