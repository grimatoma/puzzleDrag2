import { TILE, BIOMES } from "./constants.js";
import { hex } from "./utils.js";
import { drawFarmTileIcon } from "./textures/farmIcons.js";
import { drawMineTileIcon } from "./textures/mineIcons.js";

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

// ─── Per-resource icon drawing ────────────────────────────────────────────────

const FARM_KEYS = new Set(["hay","wheat","grain","flour","log","plank","beam","berry","jam","egg"]);
const MINE_KEYS = new Set(["stone","cobble","block","ore","ingot","coal","coke","gem","cutgem","gold"]);

export function drawTileIcon(ctx, key) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (FARM_KEYS.has(key)) { drawFarmTileIcon(ctx, key); return; }
  if (MINE_KEYS.has(key)) { drawMineTileIcon(ctx, key); return; }
  // fallback: glyph-based rendering
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

// ─── Tile + ambient texture generation ───────────────────────────────────────

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
          // Subtle radial backing for the icon tile
          const tileGrad = ctx.createRadialGradient(w / 2 - 8, h / 2 - 12, 4, w / 2, h / 2, w / 2);
          const baseColor = hex(r.color);
          tileGrad.addColorStop(0, lighten(baseColor, 0.25));
          tileGrad.addColorStop(1, baseColor);
          ctx.fillStyle = tileGrad;
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

// ─── Color helpers ───────────────────────────────────────────────────────────

function lighten(hexColor, amt) {
  // hexColor is "#rrggbb"
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amt));
  const lg = Math.min(255, Math.round(g + (255 - g) * amt));
  const lb = Math.min(255, Math.round(b + (255 - b) * amt));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
