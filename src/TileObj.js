import Phaser from "phaser";

const PREMIUM_KEYS = new Set(["gem", "cutgem", "gold", "ingot", "jam"]);
const SPARKLE_KEYS = new Set(["gem", "cutgem", "gold"]);

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

    this._setupAmbient();
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  setSelected(v) {
    this.selected = v;
    this.sprite.setTexture(`tile_${this.res.key}${v ? "_sel" : ""}`);
    const s = this.scene.tileSpriteScale ?? this.scene.tileScale ?? 1;
    this.sprite.setScale(s * (v ? 1.06 : 1));
    if (this.sparkle) this.sparkle.setVisible(!v);
  }

  setResource(res) {
    this.res = res;
    this.sprite.setTexture(`tile_${res.key}${this.selected ? "_sel" : ""}`);
    this._teardownAmbient();
    this._setupAmbient();
  }

  pulse() {
    const s = this.scene.tileSpriteScale ?? this.scene.tileScale ?? 1;
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({ targets: this.sprite, scale: s * 1.12, yoyo: true, duration: 90, ease: "Sine.Out" });
  }

  // ─── Ambient animations (sparkle + glint) ────────────────────────────────

  _setupAmbient() {
    const scene = this.scene;
    const key = this.res.key;
    const baseScale = scene.tileSpriteScale ?? 1;

    if (SPARKLE_KEYS.has(key)) {
      // Persistent rotating sparkle anchored to a corner of the tile.
      const offX = (key === "gold" ? -16 : 16) * (scene.tileScale ?? 1);
      const offY = -16 * (scene.tileScale ?? 1);
      this._sparkleOffX = offX;
      this._sparkleOffY = offY;
      this.sparkle = scene.add.image(this.sprite.x + offX, this.sprite.y + offY, "twinkle")
        .setDepth(11)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.32 * baseScale)
        .setAlpha(0.4);
      this._sparkleTween = scene.tweens.add({
        targets: this.sparkle,
        scale: { from: 0.28 * baseScale, to: 0.55 * baseScale },
        alpha: { from: 0.35, to: 0.95 },
        angle: { from: 0, to: 180 },
        duration: 1700 + Math.random() * 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
        delay: Math.random() * 1500,
      });
    }

    // Periodic glint sweep — happens on every tile but rarely, with random
    // stagger so the board has subtle, ongoing life rather than a synced flash.
    this._glintEvent = scene.time.addEvent({
      delay: 2800 + Math.random() * 5200,
      loop: true,
      callback: () => this._emitGlint(),
    });

    // Keep ambient sprites tracking the main sprite as it tweens around the board.
    this._followFn = () => this._syncOverlays();
    scene.events.on("postupdate", this._followFn);
  }

  _teardownAmbient() {
    if (this._sparkleTween) { this._sparkleTween.stop(); this._sparkleTween = null; }
    if (this.sparkle) { this.sparkle.destroy(); this.sparkle = null; }
    if (this._glintEvent) { this._glintEvent.remove(false); this._glintEvent = null; }
    if (this._followFn) { this.scene.events.off("postupdate", this._followFn); this._followFn = null; }
  }

  _syncOverlays() {
    const sp = this.sprite;
    if (!sp || !sp.active) return;
    if (this.sparkle && this.sparkle.active) {
      const ts = this.scene.tileScale ?? 1;
      const sign = this.res.key === "gold" ? -1 : 1;
      this.sparkle.x = sp.x + sign * 16 * ts;
      this.sparkle.y = sp.y - 16 * ts;
      this.sparkle.setVisible(sp.visible && sp.alpha > 0.6 && !this.selected);
    }
  }

  _emitGlint() {
    const sp = this.sprite;
    if (!sp || !sp.active || sp.alpha < 0.7 || this.selected) return;
    const scene = this.scene;
    const baseScale = scene.tileSpriteScale ?? 1;
    const isPremium = PREMIUM_KEYS.has(this.res.key);
    const glint = scene.add.image(sp.x, sp.y, "glint")
      .setDepth(8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setScale(0.85 * baseScale)
      .setAngle(-25);
    const obj = { t: 0 };
    scene.tweens.add({
      targets: obj,
      t: 1,
      duration: isPremium ? 520 : 700,
      ease: "Sine.InOut",
      onUpdate: () => {
        if (!glint.active) return;
        glint.x = sp.x + (obj.t - 0.5) * 32 * (scene.tileScale ?? 1);
        glint.y = sp.y - (obj.t - 0.5) * 32 * (scene.tileScale ?? 1);
        const peak = Math.sin(obj.t * Math.PI);
        glint.alpha = peak * (isPremium ? 0.85 : 0.45);
        glint.setScale((0.7 + peak * 0.3) * baseScale);
      },
      onComplete: () => glint.destroy(),
    });
  }

  destroy() {
    this._teardownAmbient();
    this.sprite.destroy();
  }
}
