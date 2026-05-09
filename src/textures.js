import { TILE, BIOMES, PALETTES } from "./constants.js";
import { hex } from "./utils.js";
import { drawFarmTileIcon } from "./textures/farmIcons.js";
import { drawMineTileIcon } from "./textures/mineIcons.js";
import { drawIcon as drawRegisteredIcon } from "./textures/iconRegistry.js";

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
//
// Resolution order for a given key:
//   1. The unified iconRegistry (design-bundle drawings under
//      src/textures/categories/) — covers all new species + improved
//      versions of the existing ones.
//   2. The legacy in-tree dispatchers (drawFarmTileIcon / drawMineTileIcon)
//      which are still consulted as a safety net for any key that exists
//      in BIOMES but hasn't been ported to the registry yet.
//   3. Glyph fallback — render the resource's emoji/glyph using the
//      Newsreader serif face.

export function drawTileIcon(ctx, key) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (drawRegisteredIcon(ctx, key)) return;
  // Legacy fallthrough — keeps any in-tree key not yet in the registry alive.
  // Each dispatcher returns true if it handled the key.
  if (drawFarmTileIcon(ctx, key)) return;
  if (drawMineTileIcon(ctx, key)) return;
  // Glyph fallback — only fires if neither registry nor legacy handled it.
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

/**
 * Effective bake multiplier. Defaults to dpr; GameScene bumps it up on
 * resize so on-screen tiles never exceed the baked texture's resolution.
 */
function bakeScaleFor(scene) {
  const bs = scene.registry.get("bakeScale");
  if (typeof bs === "number" && bs > 0) return bs;
  return scene.registry.get("dpr") || 1;
}

/**
 * Rebuild only the per-resource tile textures using the given palette id.
 * Called whenever state.settings.palette changes or when the layout grows
 * past the previously baked tile resolution.
 */
export function regenerateTextures(scene, paletteId = "default") {
  const dpr = bakeScaleFor(scene);
  const palette = PALETTES[paletteId] ?? PALETTES.default;
  Object.values(BIOMES).forEach((biome) => {
    biome.resources.forEach((r) => {
      [false, true].forEach((selected) => {
        const key = `tile_${r.key}${selected ? "_sel" : ""}`;
        // Remove existing cached texture so canvasTexture will recreate it
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const tileColor = palette.tiles[r.key] ?? r.color;
        canvasTexture(scene, key, TILE, TILE, (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = "rgba(0,0,0,.22)";
          ctx.beginPath();
          ctx.ellipse(w / 2 + 2, h - 14, 26, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          if (selected) {
            rr(ctx, 3, 1, w - 6, h - 6, 16);
            ctx.fillStyle = "rgba(255,160,0,.35)";
            ctx.fill();
          }
          rr(ctx, 7, 5, w - 14, h - 14, 14);
          const baseColor = hex(tileColor);
          const tileGrad = ctx.createRadialGradient(w / 2 - 8, h / 2 - 12, 4, w / 2, h / 2, w / 2);
          tileGrad.addColorStop(0, lighten(baseColor, 0.25));
          tileGrad.addColorStop(1, baseColor);
          ctx.fillStyle = tileGrad;
          ctx.fill();
          if (selected) {
            ctx.lineWidth = 7;
            ctx.strokeStyle = "#ffb300";
            ctx.stroke();
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
  // Fire hazard tile uses a fixed palette (not affected by paletteId), but
  // it still needs to track the current bake scale so resize-driven regens
  // keep it crisp alongside the resource tiles.
  bakeFireTile(scene, dpr);
  // Refresh all on-board sprite frames so they pick up the new textures
  const scene_ = scene;
  if (scene_.grid) {
    scene_.grid.flat().forEach((t) => {
      if (!t) return;
      const sel = t.selected;
      const key = `tile_${t.res.key}${sel ? "_sel" : ""}`;
      t.sprite.setTexture(key);
    });
  }
}

function bakeFireTile(scene, dpr) {
  [false, true].forEach((selected) => {
    const key = `tile_fire${selected ? "_sel" : ""}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    canvasTexture(scene, key, TILE, TILE, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath();
      ctx.ellipse(w / 2 + 2, h - 14, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        rr(ctx, 3, 1, w - 6, h - 6, 16);
        ctx.fillStyle = "rgba(255,100,0,.40)";
        ctx.fill();
      }
      rr(ctx, 7, 5, w - 14, h - 14, 14);
      const bgGrad = ctx.createRadialGradient(w / 2 - 6, h / 2 - 8, 3, w / 2, h / 2, w / 2);
      bgGrad.addColorStop(0, "#3a1a00");
      bgGrad.addColorStop(1, "#1a0800");
      ctx.fillStyle = bgGrad;
      ctx.fill();
      ctx.lineWidth = selected ? 7 : 3;
      ctx.strokeStyle = selected ? "#ff6600" : "rgba(255,100,0,.50)";
      ctx.stroke();
      if (selected) {
        rr(ctx, 11, 9, w - 22, h - 22, 11);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,200,100,.65)";
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const glow = ctx.createRadialGradient(0, 4, 2, 0, 0, 22);
      glow.addColorStop(0, "rgba(255,80,0,.70)");
      glow.addColorStop(1, "rgba(255,80,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.bezierCurveTo(10, -8, 14, 6, 6, 14);
      ctx.bezierCurveTo(2, 18, -2, 18, -6, 14);
      ctx.bezierCurveTo(-14, 6, -10, -8, 0, -18);
      ctx.closePath();
      const flameGrad = ctx.createLinearGradient(0, -18, 0, 18);
      flameGrad.addColorStop(0, "#ffdd44");
      flameGrad.addColorStop(0.4, "#ff7700");
      flameGrad.addColorStop(1, "#cc2200");
      ctx.fillStyle = flameGrad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.bezierCurveTo(5, -3, 7, 5, 2, 10);
      ctx.bezierCurveTo(0, 12, -2, 12, -2, 10);
      ctx.bezierCurveTo(-7, 5, -5, -3, 0, -10);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,240,100,.75)";
      ctx.fill();
      ctx.restore();
    }, dpr);
  });
}

export function makeTextures(scene) {
  const dpr = bakeScaleFor(scene);
  const paletteId = scene.registry.get("palette") ?? "default";
  const palette = PALETTES[paletteId] ?? PALETTES.default;
  Object.values(BIOMES).forEach((biome) => {
    biome.resources.forEach((r) => {
      [false, true].forEach((selected) => {
        const tileColor = palette.tiles[r.key] ?? r.color;
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
          const baseColor = hex(tileColor);
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

  // ─── Fire hazard tile (dark background + orange-red flame) ──────────────────
  bakeFireTile(scene, dpr);

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
