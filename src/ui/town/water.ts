// Animated flowing-water overlay for the town river + pond.
//
// The SDF ground (proceduralGround.ts) already bakes a lovely *static* water
// surface — shore, depth, foam, the odd sparkle. This module lays a cheap moving
// layer on top, masked to the exact water shape, so the river visibly FLOWS:
//   • a seamless caustic TileSprite scrolled downstream (SCREEN-blended light on water)
//   • sparkle motes that travel along the river centre-line and fade
// Everything is driven by the scene's update loop (see advanceWaterOverlay), so a
// paused/slept town stops it dead — no off-screen CPU. Destroy via
// destroyWaterOverlay on scene rebuild so nothing leaks.
import type Phaser from "phaser";
import type { GroundSpec } from "./proceduralGround.js";

const BLEND_SCREEN = 5 as Phaser.BlendModes; // Phaser.BlendModes.SCREEN

const CAUSTIC_KEY = "fxWaterCaustic";
const SPARKLE_KEY = "fxWaterSparkle";

export interface WaterOverlay {
  tile: Phaser.GameObjects.TileSprite;
  mask: Phaser.GameObjects.Graphics;
  sparkles: Phaser.GameObjects.Image[];
  /** Arc-length-parameterised river centre-line for sparkle drift. */
  river: { pts: ReadonlyArray<readonly [number, number]>; cum: number[]; total: number } | null;
  t: number;
}

/** Idempotently bake the seamless caustic + soft sparkle textures. */
export function ensureWaterTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(CAUSTIC_KEY)) {
    const s = 128;
    const tex = scene.textures.createCanvas(CAUSTIC_KEY, s, s);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, s, s);
      // Two crossing sets of soft sine bands at whole-period counts → tiles seamlessly.
      ctx.strokeStyle = "rgba(255,255,255,0.20)";
      ctx.lineWidth = 3;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        for (let x = 0; x <= s; x += 4) {
          const y = (s / 5) * (k + 0.5) + Math.sin((x / s) * Math.PI * 2 * 2 + k) * 7;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(200,235,245,0.13)";
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        for (let y = 0; y <= s; y += 4) {
          const x = (s / 4) * (k + 0.5) + Math.sin((y / s) * Math.PI * 2 * 3 + k) * 6;
          if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      tex.refresh();
    }
  }
  if (!scene.textures.exists(SPARKLE_KEY)) {
    const s = 16;
    const tex = scene.textures.createCanvas(SPARKLE_KEY, s, s);
    if (tex) {
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.5, "rgba(210,240,250,0.4)");
      g.addColorStop(1, "rgba(210,240,250,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    }
  }
}

/** Build the overlay from a ground spec's river/pond, or null when there's no water. */
export function makeWaterOverlay(scene: Phaser.Scene, spec: GroundSpec): WaterOverlay | null {
  if (!spec.river && !spec.pond) return null;
  ensureWaterTextures(scene);

  // Geometry mask: fill the water core (thick river centre-line + pond ellipse).
  const mask = scene.make.graphics({});
  mask.fillStyle(0xffffff, 1);
  if (spec.river) {
    const r = spec.river.half + 2;
    const pts = spec.river.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        mask.fillCircle(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r);
      }
    }
  }
  if (spec.pond) mask.fillEllipse(spec.pond.cx, spec.pond.cy, spec.pond.rx * 2, spec.pond.ry * 2);

  const tile = scene.add.tileSprite(0, 0, spec.width, spec.height, CAUSTIC_KEY).setOrigin(0, 0);
  tile.setDepth(-999); // just over the baked ground (-1000), under every prop
  tile.setBlendMode(BLEND_SCREEN);
  tile.setAlpha(0.5);
  tile.setMask(mask.createGeometryMask());

  // Arc-length table for downstream sparkle drift.
  let river: WaterOverlay["river"] = null;
  if (spec.river && spec.river.pts.length >= 2) {
    const pts = spec.river.pts;
    const cum = [0];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      cum.push(total);
    }
    river = { pts, cum, total };
  }

  const sparkles: Phaser.GameObjects.Image[] = [];
  if (river) {
    for (let i = 0; i < 14; i++) {
      const sp = scene.add.image(0, 0, SPARKLE_KEY).setBlendMode(BLEND_SCREEN).setDepth(-998);
      sp.setData("s", Math.random() * river.total);
      sp.setData("v", 18 + Math.random() * 22); // px/sec downstream
      sp.setData("off", (Math.random() - 0.5) * (spec.river!.half * 1.2));
      sp.setScale(0.4 + Math.random() * 0.5);
      sparkles.push(sp);
    }
  }

  const w: WaterOverlay = { tile, mask, sparkles, river, t: 0 };
  positionSparkles(w);
  return w;
}

/** Sample the river centre-line at arc-length `s`, with a lateral offset. */
function sampleRiver(river: NonNullable<WaterOverlay["river"]>, s: number, off: number): { x: number; y: number } {
  const { pts, cum, total } = river;
  const sc = ((s % total) + total) % total;
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < sc) i++;
  const segLen = cum[i + 1] - cum[i] || 1;
  const t = (sc - cum[i]) / segLen;
  const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  // Lateral normal for the offset.
  const nx = -dy / L, ny = dx / L;
  return { x: ax + dx * t + nx * off, y: ay + dy * t + ny * off };
}

function positionSparkles(w: WaterOverlay): void {
  if (!w.river) return;
  for (const sp of w.sparkles) {
    const p = sampleRiver(w.river, sp.getData("s") as number, sp.getData("off") as number);
    sp.setPosition(p.x, p.y);
  }
}

/** Advance the overlay by `dt` seconds. */
export function advanceWaterOverlay(w: WaterOverlay, dt: number): void {
  w.t += dt;
  // Scroll the caustics gently down-and-right (the river runs roughly that way) and
  // breathe the alpha so the pond shimmers even where there's no current.
  w.tile.tilePositionX += dt * 9;
  w.tile.tilePositionY += dt * 14;
  w.tile.setAlpha(0.42 + Math.sin(w.t * 0.8) * 0.08);

  if (w.river) {
    for (const sp of w.sparkles) {
      const s = (sp.getData("s") as number) + (sp.getData("v") as number) * dt;
      sp.setData("s", s);
      const p = sampleRiver(w.river, s, sp.getData("off") as number);
      sp.setPosition(p.x, p.y);
      // Twinkle.
      sp.setAlpha(0.3 + 0.5 * (0.5 + 0.5 * Math.sin(w.t * 3 + (sp.getData("off") as number))));
    }
  }
}

export function destroyWaterOverlay(w: WaterOverlay | null): void {
  if (!w) return;
  w.sparkles.forEach((s) => s.destroy());
  w.tile.clearMask(true); // destroys the geometry mask + its graphics
  w.tile.destroy();
  w.mask.destroy();
}
