import Phaser from "phaser";

export class TileObj {
  constructor(scene, x, y, col, row, res) {
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
    this.sprite.input.cursor = "pointer";
    this.sprite.on("pointerdown", () => scene.startPath(this));
    this.sprite.on("pointerover", () => scene.tryAddToPath(this));

    // Phase offset varies smoothly with column/row so the sway looks like a
    // wind front rolling across the field rather than every tile in lockstep.
    this._phase = (col * 380 + row * 240);
    this._destroying = false;
    this._tweenActive = false;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  setSelected(v) {
    this.selected = v;
    this.sprite.setTexture(`tile_${this.res.key}${v ? "_sel" : ""}`);
    const s = this.scene.tileSpriteScale ?? this.scene.tileScale ?? 1;
    this.sprite.setScale(s * (v ? 1.06 : 1));
    if (!v) this.sprite.angle = 0;
  }

  setResource(res) {
    this.res = res;
    this.sprite.setTexture(`tile_${res.key}${this.selected ? "_sel" : ""}`);
  }

  pulse() {
    const s = this.scene.tileSpriteScale ?? this.scene.tileScale ?? 1;
    this.scene.tweens.killTweensOf(this.sprite);
    this._tweenActive = true;
    this.scene.tweens.add({ targets: this.sprite, scale: s * 1.12, yoyo: true, duration: 90, ease: "Sine.Out", onComplete: () => { this._tweenActive = false; } });
  }

  // Called once per frame from GameScene.update. Applies a subtle resource-
  // specific sway, but only when no state-driven tween (selection pulse,
  // collapse, destroy, shuffle) is active on the sprite — so it never fights
  // those animations.
  ambient(time) {
    if (this._destroying || this.selected) return;
    const sway = this.res.sway;
    if (!sway) {
      if (this.sprite.angle !== 0 && !this._tweenActive) this.sprite.angle = 0;
      return;
    }
    if (this._tweenActive) return;
    const t = time + this._phase;
    // Primary sway plus a smaller higher-frequency gust component so the
    // motion isn't a perfect sine — closer to real wind / dangle.
    const a = Math.sin(t * sway.freq) * sway.amp
            + Math.sin(t * sway.freq * 2.4) * sway.amp * sway.gust;
    this.sprite.angle = a;
  }

  destroy() {
    this._destroying = true;
    this.sprite.destroy();
  }
}
