import Phaser from "phaser";
import { BAKED_SEASONAL_KEYS } from "./textures/seasonal/willowArt.js";

// Global multiplier on the ambient sway frequency. >1 makes the wind sway play
// faster across every tile without touching each per-resource `freq` in
// constants — it preserves amplitude and the primary/gust frequency ratio.
const SWAY_SPEED = 1.3;

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
  /** @deprecated see constants.ts */
  next?: string | null;
}

/** Minimal slice of GameScene that TileObj needs to call back. */
interface TileScene extends Phaser.Scene {
  tileSpriteScale?: number;
  tileScale?: number;
  tileSize?: number;
  boardY?: number;
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
    // Baked-art tiles (willow) carry their motion inside the frames and have a
    // ground pad that must not rotate — skip the sprite-angle sway entirely.
    if (BAKED_SEASONAL_KEYS.has(this.res.key)) {
      if (this.sprite.angle !== 0 && !this._tweenActive) this.sprite.angle = 0;
      return;
    }
    const sway = this.res.look?.sway;
    if (!sway) {
      if (this.sprite.angle !== 0 && !this._tweenActive) this.sprite.angle = 0;
      return;
    }
    if (this._tweenActive) return;
    const t = (time + this._phase) * SWAY_SPEED;
    // Primary sway plus a smaller higher-frequency gust component so the
    // motion isn't a perfect sine — closer to real wind / dangle.
    const a = Math.sin(t * sway.freq) * sway.amp
            + Math.sin(t * sway.freq * 2.4) * sway.amp * sway.gust;
    this.sprite.angle = a;
  }

  destroy(): void {
    this._destroying = true;
    if (this.shadow) { this.shadow.destroy(); this.shadow = null; }
    this.sprite.destroy();
  }
}
