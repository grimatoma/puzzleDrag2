import { TILE, BIOMES } from "./constants.js";
import { hex } from "./utils.js";

export function rounded(scene, x, y, w, h, r, fill, alpha = 1, stroke = null, sw = 0, sa = 1) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, r);
  if (stroke !== null && sw > 0) {
    g.lineStyle(sw, stroke, sa);
    g.strokeRoundedRect(x, y, w, h, r);
  }
  return g;
}

export function drawCuteVine(scene, x0, y0, width, color = 0x6da53a) {
  const vine = scene.add.graphics();
  vine.lineStyle(4, color, 0.95);
  vine.beginPath();
  const segments = 28;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = x0 + width * t;
    const y = y0 + Math.sin(t * Math.PI * 4) * 7;
    if (i === 0) vine.moveTo(x, y);
    else vine.lineTo(x, y);
  }
  vine.strokePath();
  return vine;
}

// Canvas path helper for rounded rectangles
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function canvasTexture(scene, key, w, h, draw, dpr = 1) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, Math.ceil(w * dpr), Math.ceil(h * dpr));
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  if (dpr !== 1) ctx.scale(dpr, dpr);
  draw(ctx, w, h);
  tex.refresh();
}

export function drawTileIcon(ctx, key) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (key === "hay") {
    ctx.strokeStyle = "#245915";
    ctx.lineWidth = 5;
    [-16, -8, 0, 8, 16].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.quadraticCurveTo(x - 5, -4, x + 8, -22);
      ctx.stroke();
    });
    ctx.strokeStyle = "#caff67";
    ctx.lineWidth = 3;
    [-12, 0, 12].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.quadraticCurveTo(x + 6, -1, x + 14, -18);
      ctx.stroke();
    });
  } else if (key === "wheat") {
    ctx.strokeStyle = "#7a5a13";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(0, -22);
    ctx.stroke();
    ctx.fillStyle = "#ffe36b";
    for (let y = -17; y <= 8; y += 8) {
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.ellipse(s * 8, y, 6, 10, s * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#9a7419";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  } else if (key === "log") {
    ctx.fillStyle = "#8b5a2b";
    rr(ctx, -25, -13, 50, 27, 8);
    ctx.fill();
    ctx.strokeStyle = "#563114";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#c28a4b";
    ctx.beginPath();
    ctx.ellipse(13, 0, 10, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6a431f";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (key === "egg") {
    ctx.fillStyle = "#fff7e5";
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c8bca4";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.ellipse(-7, -10, 6, 9, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === "stone") {
    ctx.fillStyle = "#9da3a8";
    ctx.beginPath();
    ctx.moveTo(-24, 9);
    ctx.lineTo(-14, -19);
    ctx.lineTo(12, -24);
    ctx.lineTo(27, -4);
    ctx.lineTo(18, 21);
    ctx.lineTo(-12, 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#555b61";
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (key === "ore") {
    ctx.strokeStyle = "#e1e8ef";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(-22, 18);
    ctx.lineTo(18, -22);
    ctx.stroke();
    ctx.strokeStyle = "#606a72";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#b9c4ce";
    ctx.beginPath();
    ctx.arc(18, -22, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === "coal") {
    ctx.fillStyle = "#151515";
    ctx.beginPath();
    ctx.moveTo(-24, 8);
    ctx.lineTo(-8, -23);
    ctx.lineTo(19, -15);
    ctx.lineTo(27, 12);
    ctx.lineTo(3, 25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (key === "gem") {
    ctx.fillStyle = "#65e5ff";
    ctx.beginPath();
    ctx.moveTo(0, -27);
    ctx.lineTo(24, -5);
    ctx.lineTo(12, 24);
    ctx.lineTo(-12, 24);
    ctx.lineTo(-24, -5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1686a3";
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (key === "gold") {
    ctx.fillStyle = "#ffd34c";
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#946b11";
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    // Generic glyph fallback for upper-tier resources (grain, flour, plank, beam, berry, jam, cobble, block, ingot, coke, cutgem, etc.)
    let res = null;
    for (const biome of Object.values(BIOMES)) {
      res = biome.resources.find((r) => r.key === key);
      if (res) break;
    }
    if (res) {
      ctx.fillStyle = hex(res.dark);
      ctx.font = 'bold 36px "Newsreader", "Times New Roman", serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(res.glyph, 0, 2);
    }
  }
}

export function makeTextures(scene) {
  const dpr = scene.registry.get("dpr") || 1;
  Object.values(BIOMES).forEach((biome) => {
    biome.resources.forEach((r) => {
      [false, true].forEach((selected) => {
        canvasTexture(scene, `tile_${r.key}${selected ? "_sel" : ""}`, TILE, TILE, (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = "rgba(0,0,0,.22)";
          ctx.beginPath();
          ctx.ellipse(w / 2 + 2, h - 14, 26, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          if (selected) {
            // Outer glow ring
            rr(ctx, 3, 1, w - 6, h - 6, 16);
            ctx.fillStyle = "rgba(255,160,0,.35)";
            ctx.fill();
          }
          rr(ctx, 7, 5, w - 14, h - 14, 14);
          ctx.fillStyle = hex(r.color);
          ctx.fill();
          if (selected) {
            ctx.lineWidth = 7;
            ctx.strokeStyle = "#ffb300";
            ctx.stroke();
            // Inner highlight line
            rr(ctx, 11, 9, w - 22, h - 22, 11);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255,240,180,.65)";
            ctx.stroke();
          } else {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(255,255,255,.32)";
            ctx.stroke();
          }
          ctx.save();
          ctx.translate(w / 2, h / 2);
          drawTileIcon(ctx, r.key);
          ctx.restore();
        }, dpr);
      });
    });
  });

  canvasTexture(scene, "spark", 72, 72, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    // Soft glow halo
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    glow.addColorStop(0, "rgba(255,230,80,.85)");
    glow.addColorStop(1, "rgba(255,160,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    // Star body
    ctx.fillStyle = "#ffd43b";
    ctx.strokeStyle = "#fffde0";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? 28 : 12;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Bright center dot
    ctx.fillStyle = "#fffde0";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }, dpr);

  canvasTexture(scene, "season_flower", 42, 42, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.ellipse(0, -10, 6, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }, dpr);

  canvasTexture(scene, "season_sun", 42, 42, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = "#f1a91f";
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffd34c";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  }, dpr);

  canvasTexture(scene, "season_leaf", 42, 42, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = "#d97a2b";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.bezierCurveTo(16, -11, 15, 10, 0, 18);
    ctx.bezierCurveTo(-16, 10, -15, -11, 0, -16);
    ctx.fill();
    ctx.strokeStyle = "#8b4a12";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 14);
    ctx.stroke();
  }, dpr);

  canvasTexture(scene, "season_snow", 42, 42, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = "#eefbff";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * i);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);
      ctx.stroke();
      ctx.restore();
    }
  }, dpr);
}
