/**
 * One Fiber Crush board tile — a flat-coloured rounded rect plus an optional
 * special-tile glyph and a selection ring. Placeholder art only (real PixelLab
 * fiber tiles are a later pass); the scene keeps a 2D array of these and calls
 * `redraw` when the resolver hands back a new grid.
 */
import Phaser from "phaser";
import type { FiberColor, FiberSpecial } from "./resolver.js";

export const FIBER_COLOR_HEX: Record<FiberColor, number> = {
  white: 0xf3ece0,
  grey: 0x9aa0a6,
  brown: 0x9c6b3f,
  black: 0x3a3a40,
  cream: 0xe8d9a8,
};

const FIBER_COLOR_DARK: Record<FiberColor, number> = {
  white: 0xb9ad96,
  grey: 0x5f656b,
  brown: 0x5e3f23,
  black: 0x18181c,
  cream: 0xb59a5c,
};

const SPECIAL_GLYPH: Record<FiberSpecial, string> = {
  spindle: "✚",
  loom: "▦",
  dyevat: "◆",
};

export class FiberTile {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private ring: Phaser.GameObjects.Graphics;
  private glyph: Phaser.GameObjects.Text;
  private size: number;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number) {
    this.size = size;
    this.bg = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.glyph = scene.add.text(0, 0, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${Math.round(size * 0.5)}px`,
      color: "#1c1812",
    }).setOrigin(0.5);
    this.container = scene.add.container(x, y, [this.bg, this.ring, this.glyph]);
  }

  setLayout(x: number, y: number, size: number): void {
    this.size = size;
    this.container.setPosition(x, y);
    this.glyph.setFontSize(Math.round(size * 0.5));
  }

  redraw(color: FiberColor | null, special: FiberSpecial | null | undefined, selected: boolean): void {
    const s = this.size;
    const pad = Math.max(1, Math.round(s * 0.06));
    const w = s - pad * 2;
    const r = Math.round(s * 0.18);
    this.bg.clear();
    this.ring.clear();
    if (color == null) {
      this.glyph.setText("");
      return;
    }
    this.bg.fillStyle(FIBER_COLOR_HEX[color], 1);
    this.bg.lineStyle(Math.max(2, Math.round(s * 0.06)), FIBER_COLOR_DARK[color], 1);
    this.bg.fillRoundedRect(pad, pad, w, w, r);
    this.bg.strokeRoundedRect(pad, pad, w, w, r);
    // Soft top highlight for a little depth.
    this.bg.fillStyle(0xffffff, 0.18);
    this.bg.fillRoundedRect(pad + 2, pad + 2, w - 4, Math.round(w * 0.32), r);

    if (special) {
      this.glyph.setText(SPECIAL_GLYPH[special]);
      this.glyph.setColor(color === "black" ? "#f3ece0" : "#1c1812");
      this.glyph.setPosition(s / 2, s / 2);
    } else {
      this.glyph.setText("");
    }

    if (selected) {
      this.ring.lineStyle(Math.max(3, Math.round(s * 0.09)), 0xffd36b, 1);
      this.ring.strokeRoundedRect(pad - 2, pad - 2, w + 4, w + 4, r + 2);
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
