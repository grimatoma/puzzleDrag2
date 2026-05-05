// Per-resource ambient sway. Each entry produces a small angular oscillation
// applied to the tile sprite when it's at rest, evoking the resource's
// physical character (wheat in wind, berries dangling, gold catching light…).
// Resources missing from this map stay perfectly still — heavy/dense items
// (logs, planks, stone, ingot, coal) shouldn't move at all.
const SWAY = {
  hay:    { amp: 4.0, freq: 0.00060, gust: 0.20 },
  wheat:  { amp: 5.0, freq: 0.00065, gust: 0.22 },
  grain:  { amp: 1.2, freq: 0.00035, gust: 0.08 },
  flour:  { amp: 1.0, freq: 0.00030, gust: 0.05 },
  berry:  { amp: 3.5, freq: 0.00090, gust: 0.15 },
  jam:    { amp: 0.8, freq: 0.00025, gust: 0.00 },
  egg:    { amp: 1.5, freq: 0.00055, gust: 0.08 },
  ore:    { amp: 0.4, freq: 0.00020, gust: 0.00 },
  gem:    { amp: 1.2, freq: 0.00028, gust: 0.04 },
  cutgem: { amp: 1.2, freq: 0.00028, gust: 0.04 },
  gold:   { amp: 1.0, freq: 0.00024, gust: 0.04 },
};

export class TileObj {
  constructor(scene, x, y, col, row, res) {
    this.scene = scene;
    this.col = col;
    this.row = row;
    this.res = res;
    this.selected = false;
    this.sprite = scene.add.sprite(x, y, `tile_${res.key}`).setInteractive({ useHandCursor: true });
    this.sprite.on("pointerdown", () => scene.startPath(this));
    this.sprite.on("pointerover", () => scene.tryAddToPath(this));

    // Phase offset varies smoothly with column/row so the sway looks like a
    // wind front rolling across the field rather than every tile in lockstep.
    this._phase = (col * 380 + row * 240);
    this._destroying = false;
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
    this.scene.tweens.add({ targets: this.sprite, scale: s * 1.12, yoyo: true, duration: 90, ease: "Sine.Out" });
  }

  // Called once per frame from GameScene.update. Applies a subtle resource-
  // specific sway, but only when no state-driven tween (selection pulse,
  // collapse, destroy, shuffle) is active on the sprite — so it never fights
  // those animations.
  ambient(time) {
    if (this._destroying || this.selected) return;
    const sway = SWAY[this.res.key];
    if (!sway) {
      if (this.sprite.angle !== 0 && !this._tweenActive()) this.sprite.angle = 0;
      return;
    }
    if (this._tweenActive()) return;
    const t = time + this._phase;
    // Primary sway plus a smaller higher-frequency gust component so the
    // motion isn't a perfect sine — closer to real wind / dangle.
    const a = Math.sin(t * sway.freq) * sway.amp
            + Math.sin(t * sway.freq * 2.4) * sway.amp * sway.gust;
    this.sprite.angle = a;
  }

  _tweenActive() {
    const active = this.scene.tweens.getTweensOf(this.sprite);
    return active && active.length > 0;
  }

  destroy() {
    this._destroying = true;
    this.sprite.destroy();
  }
}
