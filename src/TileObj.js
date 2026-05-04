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
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  setSelected(v) {
    this.selected = v;
    this.sprite.setTexture(`tile_${this.res.key}${v ? "_sel" : ""}`);
    const s = this.scene.tileSpriteScale ?? this.scene.tileScale ?? 1;
    this.sprite.setScale(s * (v ? 1.06 : 1));
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

  destroy() {
    this.sprite.destroy();
  }
}
