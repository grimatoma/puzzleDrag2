import Phaser from "phaser";
import { seasonalBakedActive, seasonalVectorActive, seasonalIsTransitioning, seasonalIdleFrameCount, seasonalGestureFrameCount, seasonalMaxIdleFrames } from "./textures/seasonal/seasonalArt.js";
import { idleFrameAt, gestureFrameAt } from "./textures/seasonalIdleTiming.js";
import type { SeasonName } from "./textures/seasonal/types.js";

// Global multiplier on the ambient sway frequency. >1 makes the wind sway play
// faster across every tile without touching each per-resource `freq` in
// constants — it preserves amplitude and the primary/gust frequency ratio.
const SWAY_SPEED = 1.3;

// Idle sway is not continuous: each tile plays a brief sway "gesture" then rests.
// IDLE_PERIOD_MS is the full cycle (one gesture + the pause that follows); the
// sway only plays during the first IDLE_ACTIVE_MS of each cycle and the tile is
// held still for the remainder. Per-tile `_phase` offsets where each tile sits
// in the cycle, so the gestures roll across the board (a wind front) instead of
// every tile gusting — and pausing — in lockstep.
const IDLE_PERIOD_MS = 7500;
const IDLE_ACTIVE_MS = 2500;

/** Minimal shape of a resource/tile definition that TileObj needs. */
export interface TileRes {
  key: string;
  label?: string;
  look?: {
    sway?: { amp: number; freq: number; gust: number } | null;
    color?: string | number;
    dark?: string | number;
  } | null;
  value?: number;
  /** Resource key this tile chains into (its production output). See constants.ts. */
  next?: string | null;
}

/** Minimal slice of GameScene that TileObj needs to call back. */
interface TileScene extends Phaser.Scene {
  tileSpriteScale?: number;
  tileScale?: number;
  tileSize?: number;
  boardY?: number;
  /** Per-frame snapshot set by GameScene.update so each tile can pick its own idle
   *  frame: whether motion plays, and the current season. */
  motionOn?: boolean;
  seasonName?: SeasonName | null;
  tweens: Phaser.Tweens.TweenManager;
  add: Phaser.GameObjects.GameObjectFactory;
  startPath(tile: TileObj): void;
  tryAddToPath(tile: TileObj): void;
}

export class TileObj {
  scene: TileScene;
  col: number;
  row: number;
  res: TileRes;
  selected: boolean;
  frozen: boolean;
  rubble: boolean;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse | null = null;

  /** Phase offset for the ambient sway animation. */
  _phase: number;
  _destroying: boolean;
  _tweenActive: boolean;

  constructor(scene: TileScene, x: number, y: number, col: number, row: number, res: TileRes) {
    this.scene = scene;
    this.col = col;
    this.row = row;
    this.res = res;
    this.selected = false;
    this.frozen = false;
    this.rubble = false;
    this.sprite = scene.add.sprite(x, y, `tile_${res.key}`);
    // Slightly larger circular hit area so adjacent-tile drags are forgiving
    // on touch devices: a radius of ~60% of the tile size overlaps with
    // neighbouring tile centres just enough that a slightly-off finger still
    // registers, while pointermove fallback in GameScene catches fast swipes.
    const hitRadius = Math.round(this.sprite.width * 0.6);
    this.sprite.setInteractive(
      new Phaser.Geom.Circle(this.sprite.width / 2, this.sprite.height / 2, hitRadius),
      Phaser.Geom.Circle.Contains,
    );
    // sprite.input is populated after setInteractive(); cast to access cursor
    (this.sprite.input as Phaser.Types.Input.InteractiveObject).cursor = "pointer";
    this.sprite.on("pointerdown", () => scene.startPath(this));
    this.sprite.on("pointerover", () => scene.tryAddToPath(this));

    // Phase offset varies smoothly with column/row so the sway looks like a
    // wind front rolling across the field rather than every tile in lockstep.
    this._phase = (col * 380 + row * 240);
    this._destroying = false;
    this._tweenActive = false;
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  setSelected(v: boolean): void {
    this.selected = v;
    this.sprite.setTexture(`tile_${this.res.key}${v ? "_sel" : ""}`);
    const s = this.scene.tileSpriteScale ?? this.scene.tileScale ?? 1;
    this.sprite.setScale(s * (v ? 1.08 : 1));
    // Lift selected tiles ~6px to read as "picked up" — pairs with the
    // shadow ellipse below. baseY is the board-anchored rest position.
    const ts = this.scene.tileSize ?? 60;
    const baseY = (this.scene.boardY ?? 0) + this.row * ts + ts / 2;
    const liftPx = v ? 6 : 0;
    this.sprite.y = baseY - liftPx;
    if (v) {
      if (!this.shadow) {
        this.shadow = this.scene.add.ellipse(
          this.sprite.x,
          baseY + ts * 0.32,
          ts * 0.55,
          ts * 0.16,
          0x000000,
          0.28,
        );
        this.shadow.setDepth(this.sprite.depth - 1);
      } else {
        this.shadow.setPosition(this.sprite.x, baseY + ts * 0.32);
      }
    } else if (this.shadow) {
      this.shadow.destroy();
      this.shadow = null;
    }
    if (!v) this.sprite.angle = 0;
  }

  setResource(res: TileRes): void {
    this.res = res;
    this.sprite.setTexture(`tile_${res.key}${this.selected ? "_sel" : ""}`);
  }

  pulse(): void {
    const s = this.scene.tileSpriteScale ?? this.scene.tileScale ?? 1;
    this.scene.tweens.killTweensOf(this.sprite);
    this._tweenActive = true;
    this.scene.tweens.add({
      targets: this.sprite,
      scale: s * 1.12,
      yoyo: true,
      duration: 90,
      ease: "Sine.Out",
      onComplete: () => { this._tweenActive = false; },
    });
  }

  // Called once per frame from GameScene.update. Applies a subtle resource-
  // specific sway, but only when no state-driven tween (selection pulse,
  // collapse, destroy, shuffle) is active on the sprite — so it never fights
  // those animations.
  ambient(time: number): void {
    if (this._destroying || this.selected) return;
    // Baked-art tiles carry their motion inside the frames and have a ground pad
    // that must not rotate — keep the sprite upright and, instead of the sway,
    // drive the idle FRAME per tile so each one rests then gestures on its own
    // staggered timer (no shared-texture lockstep loop).
    if (seasonalBakedActive(this.res.key)) {
      if (this.sprite.angle !== 0 && !this._tweenActive) this.sprite.angle = 0;
      // Only frame-bank strips carry numbered frames; single-frame stills (and the
      // brief window before a strip is built) have only __BASE, where setFrame would
      // warn. The bound texture itself is the robust gate.
      if (!this.sprite.texture.has("0")) return;
      // Reduced motion → hold the rest frame. Mid season-transition → show the
      // lockstep transition frame the scene baked into slot 0 (whole board flips
      // together). Otherwise pick this cell's own idle frame.
      if (this.scene.motionOn === false || seasonalIsTransitioning(this.res.key)) {
        this.sprite.setFrame(0);
        return;
      }
      // A rare special gesture (frolic / flourish) preempts the idle loop on this
      // cell's own independent timer. Its frames live in the strip slots after the
      // idle frames; the base slot must match GameScene._bankLayout().gestureBase,
      // which is seasonalMaxIdleFrames(key).
      const season = this.scene.seasonName ?? null;
      const gFrames = seasonalGestureFrameCount(this.res.key, season);
      const g = gFrames > 1 ? gestureFrameAt(time, this.col, this.row, gFrames) : -1;
      if (g >= 0) {
        this.sprite.setFrame(seasonalMaxIdleFrames(this.res.key) + g);
        return;
      }
      const frames = seasonalIdleFrameCount(this.res.key, season);
      this.sprite.setFrame(idleFrameAt(time, this.col, this.row, frames));
      return;
    }
    // All-vector seasonal tiles carry their idle ACTION inside the re-baked
    // vector `anim` (a canopy sway, a peck dip, a hop, a wing flare). Adding the
    // sprite-rotation sway on top would fight that in-art motion, so keep the
    // sprite upright and let the baked frame be the sole gesture.
    if (seasonalVectorActive(this.res.key)) {
      if (this.sprite.angle !== 0 && !this._tweenActive) this.sprite.angle = 0;
      return;
    }
    const sway = this.res.look?.sway;
    // Hold upright when sway is absent, or while motion is off — including the
    // board's warm-up grace window (scene.motionOn is false until it elapses).
    if (!sway || this.scene.motionOn === false) {
      if (this.sprite.angle !== 0 && !this._tweenActive) this.sprite.angle = 0;
      return;
    }
    if (this._tweenActive) return;
    // Duty-cycle envelope: a smooth 0→1→0 bell over the active window, then a
    // flat rest for the rest of the cycle. The bell hits 0 at both ends of the
    // window, so the sway eases in from — and back to — a dead-still rest with
    // no snap. `_phase` shifts each tile's place in the cycle so the gesture
    // staggers across the board.
    const cyclePos = (((time + this._phase) % IDLE_PERIOD_MS) + IDLE_PERIOD_MS) % IDLE_PERIOD_MS;
    const envelope = cyclePos < IDLE_ACTIVE_MS
      ? Math.sin((cyclePos / IDLE_ACTIVE_MS) * Math.PI)
      : 0;
    if (envelope <= 0.001) {
      if (this.sprite.angle !== 0) this.sprite.angle = 0;
      return;
    }
    const t = (time + this._phase) * SWAY_SPEED;
    // Primary sway plus a smaller higher-frequency gust component so the
    // motion isn't a perfect sine — closer to real wind / dangle.
    const a = Math.sin(t * sway.freq) * sway.amp
            + Math.sin(t * sway.freq * 2.4) * sway.amp * sway.gust;
    this.sprite.angle = a * envelope;
  }

  destroy(): void {
    this._destroying = true;
    if (this.shadow) { this.shadow.destroy(); this.shadow = null; }
    this.sprite.destroy();
  }
}
