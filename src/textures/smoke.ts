import type Phaser from "phaser";

// Shared ambient-FX helpers: rising chimney smoke + a flickering ember glow.
// Lifted from the cartography MapScene's node-smoke pattern so the town scene
// can reuse the same look. Both effects are driven entirely by the owning
// scene's update loop / tween manager, so a `scene.pause()` freezes them and a
// `loop.sleep()` stops them outright — no off-screen CPU and nothing to leak as
// long as the caller destroys the returned objects when it rebuilds.
//
// Phaser is imported type-only: every runtime call goes through the passed
// `scene`, and the two blend modes are referenced by their stable numeric enum
// values. That keeps this module free of Phaser's import-time device detection
// (which needs a real <canvas>), so the pure animation math stays unit-testable
// under the node test environment.
const BLEND_SCREEN = 5 as Phaser.BlendModes; // Phaser.BlendModes.SCREEN
const BLEND_ADD = 1 as Phaser.BlendModes; // Phaser.BlendModes.ADD

export interface SmokePuff extends Phaser.GameObjects.Image {
  _active?: boolean;
}

export interface SmokeColumn {
  root: Phaser.GameObjects.Container;
  puffs: SmokePuff[];
  /** 0 = dormant (no new puffs spawn); ~1 = a lively chimney. */
  intensity: number;
}

export const SMOKE_PUFF_KEY = "fxSmokePuff";
export const EMBER_GLOW_KEY = "fxEmberGlow";

/** Idempotently bake the radial smoke-puff + ember-glow textures into `scene`. */
export function ensureSmokeTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SMOKE_PUFF_KEY)) {
    const s = 48;
    const tex = scene.textures.createCanvas(SMOKE_PUFF_KEY, s, s);
    if (tex) {
      const ctx = tex.getContext();
      const grd = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, "rgba(252,246,232,0.7)");
      grd.addColorStop(0.6, "rgba(220,212,196,0.35)");
      grd.addColorStop(1, "rgba(180,168,148,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    }
  }
  if (!scene.textures.exists(EMBER_GLOW_KEY)) {
    const g = 96;
    const tex = scene.textures.createCanvas(EMBER_GLOW_KEY, g, g);
    if (tex) {
      const ctx = tex.getContext();
      const grd = ctx.createRadialGradient(g / 2, g / 2, 1, g / 2, g / 2, g / 2);
      grd.addColorStop(0, "rgba(255,212,128,0.85)");
      grd.addColorStop(0.45, "rgba(232,150,60,0.45)");
      grd.addColorStop(1, "rgba(232,150,60,0.0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, g, g);
      tex.refresh();
    }
  }
}

/**
 * A column of recycled smoke puffs rising from (x, y). Puffs start invisible;
 * call `advanceSmokeColumn` each frame to spawn/age them. Destroy `root` to free
 * the whole column (the puffs are its children).
 */
export function makeSmokeColumn(
  scene: Phaser.Scene,
  x: number,
  y: number,
  intensity = 1,
): SmokeColumn {
  const root = scene.add.container(x, y);
  const puffs: SmokePuff[] = [];
  for (let i = 0; i < 5; i++) {
    const puff = scene.add.image(0, 0, SMOKE_PUFF_KEY) as SmokePuff;
    puff.setAlpha(0);
    puff.setScale(0.5);
    puff.setBlendMode(BLEND_SCREEN);
    root.add(puff);
    puffs.push(puff);
  }
  return { root, puffs, intensity };
}

/**
 * Advance one smoke column by `dt` seconds. `t` is a scene-global time
 * accumulator (seconds) that gives each puff a gentle horizontal wobble.
 */
export function advanceSmokeColumn(sm: SmokeColumn, dt: number, t: number): void {
  if (sm.intensity <= 0) return;
  for (let i = 0; i < sm.puffs.length; i++) {
    const p = sm.puffs[i];
    if (!p._active && Math.random() < dt * sm.intensity * 0.9) {
      p._active = true;
      p.x = (Math.random() - 0.5) * 6;
      p.y = 0;
      p.setAlpha(0.85 * sm.intensity);
      p.setScale(0.3);
    }
    if (p._active) {
      p.y -= dt * 28;
      p.x += Math.sin(t * 1.3 + i) * dt * 6;
      p.setScale(p.scale + dt * 0.22);
      p.setAlpha(Math.max(0, p.alpha - dt * 0.32));
      if (p.alpha <= 0 || p.y < -90) p._active = false;
    }
  }
}

/**
 * An additive ember-glow image with an ambient flicker tween (registered on the
 * scene's tween manager, so it freezes when the scene is paused). Kill the tween
 * via `scene.tweens.killTweensOf(glow)` before destroying the image on rebuild.
 */
export function makeEmberGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1,
): Phaser.GameObjects.Image {
  const glow = scene.add
    .image(x, y, EMBER_GLOW_KEY)
    .setBlendMode(BLEND_ADD)
    .setScale(0.8 * scale)
    .setAlpha(0.55);
  scene.tweens.add({
    targets: glow,
    scale: { from: 0.7 * scale, to: 0.95 * scale },
    alpha: { from: 0.4, to: 0.8 },
    duration: 1100 + Math.random() * 600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  return glow;
}
