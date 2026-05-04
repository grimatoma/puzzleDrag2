import Phaser from "phaser";
import { TILE, COLS, ROWS, MAX_TURNS, UPGRADE_EVERY, SEASONS, BIOMES } from "./constants.js";
import { seasonIndexForTurns, upgradeCountForChain, cssColor } from "./utils.js";
import { rounded, makeTextures } from "./textures.js";
import { TileObj } from "./TileObj.js";

const BOARD_PAD = 14;
const BOARD_OUTER = 24;
const TILE_BASE = TILE; // texture-native size; sprites scale relative to this

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.grid = [];
    this.path = [];
    this.pathLines = [];
    this.pathStars = [];
    this.dragging = false;
    this.locked = false;
  }

  create() {
    this.input.topOnly = true;
    const textResolution = this.registry.get("renderResolution") || 1;
    const addText = this.add.text.bind(this.add);
    this.add.text = (...args) => addText(...args).setResolution(textResolution);
    makeTextures(this);
    this.layoutDims();
    this.drawBackground();
    this.fillBoard(true);
    this.input.on("pointerup", () => this.endPath());

    // Prevent the browser from hijacking pointer events with its native text/element
    // selection during tile drags (causes the "foggy film" overlay and stuck tile selection).
    const canvas = this.sys.game.canvas;
    const preventSelect = (e) => e.preventDefault();
    canvas.addEventListener("selectstart", preventSelect);
    canvas.addEventListener("contextmenu", preventSelect);

    // Fallback: fire endPath if the pointer is released outside the Phaser canvas.
    const onDocPointerUp = () => this.endPath();
    document.addEventListener("pointerup", onDocPointerUp);
    document.addEventListener("mouseup", onDocPointerUp);

    this.events.once("shutdown", () => {
      canvas.removeEventListener("selectstart", preventSelect);
      canvas.removeEventListener("contextmenu", preventSelect);
      document.removeEventListener("pointerup", onDocPointerUp);
      document.removeEventListener("mouseup", onDocPointerUp);
    });

    this.scale.on("resize", () => this.handleResize());
    this.registry.events.on("changedata-biomeKey", (_p, value, prev) => {
      if (value !== prev) this.handleBiomeChange();
    });
    this.registry.events.on("changedata-turnsUsed", () => this.refreshSeasonTint());
    this.registry.events.on("changedata-uiLocked", (_p, value) => {
      this.locked = !!value;
    });
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  layoutDims() {
    const vw = this.scale.width;
    const vh = this.scale.height;
    // Reserve room for the board frame (BOARD_OUTER on each side).
    const margin = BOARD_OUTER;
    const maxByW = (vw - margin * 2) / COLS;
    const maxByH = (vh - margin * 2) / ROWS;
    // Cap upscale at 2x texture size to avoid blur from over-magnification.
    this.tileSize = Math.max(24, Math.min(maxByW, maxByH, TILE_BASE * 2));
    this.tileScale = this.tileSize / TILE_BASE;
    this.boardX = Math.round((vw - COLS * this.tileSize) / 2);
    this.boardY = Math.round((vh - ROWS * this.tileSize) / 2);
  }

  handleResize() {
    this.layoutDims();
    this.children.list.filter((o) => o.__layer === "bg").forEach((o) => o.destroy());
    this.drawBackground();
    this.repositionTiles();
  }

  repositionTiles() {
    const ts = this.tileSize;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.grid[r]?.[c];
        if (!t) continue;
        this.tweens.killTweensOf(t.sprite);
        t.sprite.x = this.boardX + c * ts + ts / 2;
        t.sprite.y = this.boardY + r * ts + ts / 2;
        t.sprite.setScale(this.tileScale * (t.selected ? 1.06 : 1));
      }
    }
  }

  // ─── Background / board frame ─────────────────────────────────────────────

  season() {
    const turns = this.registry.get("turnsUsed") || 0;
    return SEASONS[seasonIndexForTurns(turns)];
  }

  biomeKey() {
    return this.registry.get("biomeKey") || "farm";
  }

  biome() {
    return BIOMES[this.biomeKey()];
  }

  drawBackground() {
    const tag = (o) => { o.__layer = "bg"; return o; };
    const s = this.season();
    const b = this.biome();
    const vw = this.scale.width;
    const vh = this.scale.height;
    const ts = this.tileSize;
    const boardW = COLS * ts;
    const boardH = ROWS * ts;
    const bg = this.biomeKey() === "mine" ? 0x31404a : s.bg;
    this.cameras.main.setBackgroundColor(bg);
    tag(this.add.rectangle(0, 0, vw, vh, bg).setOrigin(0).setDepth(-10));
    // Decorative side leaves — only draw if there's room outside the board frame.
    const leafGap = 36;
    if (this.boardX - BOARD_OUTER - leafGap > 0) {
      for (let y = 30; y < vh - 30; y += 36) {
        tag(this.add.ellipse(this.boardX - leafGap, y, 38, 22, s.accent, 0.55).setAngle(-25).setDepth(-9));
        tag(this.add.ellipse(this.boardX + boardW + leafGap, y, 38, 22, s.accent, 0.55).setAngle(25).setDepth(-9));
      }
    }
    // Board frame
    tag(rounded(this, this.boardX - BOARD_OUTER, this.boardY - BOARD_OUTER, boardW + BOARD_OUTER * 2, boardH + BOARD_OUTER * 2, 22, b.dark, 0.92).setDepth(-2));
    tag(rounded(this, this.boardX - BOARD_PAD, this.boardY - BOARD_PAD, boardW + BOARD_PAD * 2, boardH + BOARD_PAD * 2, 18, b.dirt, 1).setDepth(-1));
  }

  refreshSeasonTint() {
    this.children.list.filter((o) => o.__layer === "bg").forEach((o) => o.destroy());
    this.drawBackground();
  }

  handleBiomeChange() {
    this.refreshSeasonTint();
    // Reshuffle every tile to the new biome's pool
    this.grid.flat().forEach((t) => {
      if (!t) return;
      t.setResource(this.randomResource());
      this.tweens.add({ targets: t.sprite, angle: 360, duration: 280, onComplete: () => (t.sprite.angle = 0) });
    });
  }

  // ─── Resources ────────────────────────────────────────────────────────────

  resourceByKey(key) {
    return Object.values(BIOMES).flatMap((b) => b.resources).find((r) => r.key === key) || BIOMES.farm.resources[0];
  }

  nextResource(res) {
    const resources = this.biome().resources;
    const nextKey = resources.find((r) => r.key === res.key)?.next;
    return nextKey ? resources.find((r) => r.key === nextKey) : null;
  }

  randomResource() {
    const pool = this.biome().pool;
    const key = pool[Math.floor(Math.random() * pool.length)];
    return this.biome().resources.find((r) => r.key === key);
  }

  // ─── Board fill / collapse ────────────────────────────────────────────────

  fillBoard(initial = false) {
    const ts = this.tileSize;
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = this.grid[r] || [];
      for (let c = 0; c < COLS; c++) {
        if (!this.grid[r][c]) {
          const x = this.boardX + c * ts + ts / 2;
          const y = this.boardY + r * ts + ts / 2;
          const tile = new TileObj(this, x, initial ? y - 500 - Phaser.Math.Between(0, 100) : y - 140, c, r, this.randomResource());
          tile.sprite.setScale(this.tileScale);
          this.grid[r][c] = tile;
          this.tweens.add({ targets: tile.sprite, y, duration: initial ? 450 + r * 28 : 210, ease: "Back.Out" });
        }
      }
    }
  }

  collapseBoard() {
    const ts = this.tileSize;
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const tile = this.grid[r][c];
        if (!tile) continue;
        if (write !== r) {
          this.grid[write][c] = tile;
          this.grid[r][c] = null;
          tile.row = write;
          this.tweens.add({ targets: tile.sprite, y: this.boardY + write * ts + ts / 2, duration: 190 });
        }
        write--;
      }
    }
    this.time.delayedCall(210, () => this.fillBoard(false));
  }

  shuffleBoard() {
    this.grid.flat().forEach((t) => {
      if (!t) return;
      t.setResource(this.randomResource());
      this.tweens.add({ targets: t.sprite, angle: 360, duration: 300, onComplete: () => (t.sprite.angle = 0) });
    });
  }

  // ─── Drag chain ───────────────────────────────────────────────────────────

  startPath(tile) {
    if (this.locked) return;
    this.dragging = true;
    this.clearPath(false);
    this.addToPath(tile);
    this.showChainBadge();
    this.updateChainBadge();
  }

  tryAddToPath(tile) {
    if (!this.dragging || !this.path.length) return;
    const last = this.path[this.path.length - 1];
    const prev = this.path[this.path.length - 2];
    if (prev === tile) {
      last.setSelected(false);
      this.path.pop();
      this.redrawPath();
      this.updateChainBadge();
      return;
    }
    if (tile.selected) return;
    const same = tile.res.key === this.path[0].res.key;
    const adj = Math.abs(tile.col - last.col) <= 1 && Math.abs(tile.row - last.row) <= 1 && !(tile.col === last.col && tile.row === last.row);
    if (same && adj) this.addToPath(tile);
  }

  addToPath(tile) {
    tile.setSelected(true);
    tile.pulse();
    this.path.push(tile);
    this.redrawPath();
    this.updateChainBadge();
  }

  redrawPath() {
    this.pathLines.forEach((l) => l.clear());
    this.pathStars.forEach((s) => s.destroy());
    this.pathStars = [];
    for (let i = 1; i < this.path.length; i++) {
      let g = this.pathLines[i - 1];
      if (!g) {
        g = this.add.graphics().setDepth(4);
        this.pathLines[i - 1] = g;
      }
      const a = this.path[i - 1];
      const b = this.path[i];
      g.clear();
      g.lineStyle(15 * this.tileScale, 0xffd248, 0.28);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath();
      g.lineStyle(8 * this.tileScale, 0xff6d00, 1);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath();
    }
    this.pathLines.forEach((g, i) => g.setVisible(i < this.path.length - 1));
    const next = this.path.length ? this.nextResource(this.path[0].res) : null;
    if (next) {
      const off = 22 * this.tileScale;
      for (let i = UPGRADE_EVERY - 1; i < this.path.length; i += UPGRADE_EVERY) {
        const t = this.path[i];
        const star = this.add.image(t.x + off, t.y - off, "spark").setScale(0.45 * this.tileScale).setDepth(9);
        const prev = this.add.image(t.x + off, t.y + off * 0.9, `tile_${next.key}`).setScale(0.28 * this.tileScale).setDepth(10);
        this.pathStars.push(star, prev);
      }
    }
    this.path.forEach((t) => t.sprite.setDepth(6));
  }

  endPath() {
    if (!this.dragging) return;
    this.dragging = false;
    this.hideChainBadge();
    if (this.path.length >= 3) this.collectPath();
    else this.clearPath(true);
  }

  clearPath(deselect = true) {
    if (deselect) this.path.forEach((t) => t.setSelected(false));
    this.path = [];
    this.pathLines.forEach((l) => l.clear());
    this.pathStars.forEach((s) => s.destroy());
    this.pathStars = [];
    this.hideChainBadge();
  }

  collectPath() {
    if (!this.path.length) return;
    const res = this.path[0].res;
    const next = this.nextResource(res);
    const upgradeTotal = next ? upgradeCountForChain(this.path.length) : 0;
    const gained = this.path.length * (this.path.length >= 6 ? 2 : 1);
    this.floatText(`+${gained} ${res.label}${upgradeTotal ? `  ★ ${upgradeTotal}` : ""}`, this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, 0xffd248);

    this.path.forEach((tile, i) => {
      const upgrade = next && (i + 1) % UPGRADE_EVERY === 0;
      if (upgrade) {
        tile.setSelected(false);
        tile.setResource(next);
        tile.sprite.setScale(0.1 * this.tileScale).setAlpha(0.2);
        this.tweens.add({ targets: tile.sprite, scale: this.tileScale, alpha: 1, angle: 360, duration: 280, ease: "Back.Out", onComplete: () => (tile.sprite.angle = 0) });
        const burst = this.add.image(tile.x, tile.y, "spark").setScale(0.1 * this.tileScale).setDepth(12);
        this.tweens.add({ targets: burst, scale: 0.9 * this.tileScale, alpha: 0, duration: 420, onComplete: () => burst.destroy() });
      } else {
        this.grid[tile.row][tile.col] = null;
        this.tweens.add({ targets: tile.sprite, scale: 0, angle: Phaser.Math.Between(-25, 25), alpha: 0, duration: 180 + i * 15, onComplete: () => tile.destroy() });
      }
    });

    // Emit to React
    this.events.emit("chain-collected", { key: res.key, gained, upgrades: upgradeTotal, chainLength: this.path.length, value: res.value });

    this.pathLines.forEach((l) => l.destroy());
    this.pathStars.forEach((s) => s.destroy());
    this.pathLines = [];
    this.pathStars = [];
    this.path = [];
    this.time.delayedCall(300, () => this.collapseBoard());
  }

  // ─── Chain badge (above board) ────────────────────────────────────────────

  showChainBadge() {
    if (this.chainBadge) return;
    const cx = this.boardX + (COLS * this.tileSize) / 2;
    const cy = this.boardY - BOARD_OUTER - 22;
    this.chainBadge = this.add.container(cx, cy).setDepth(40);
    const bg = rounded(this, -70, -16, 140, 32, 16, 0x2b2218, 0.9, 0xffd248, 2);
    this.chainBadgeText = this.add.text(0, 0, "", { fontFamily: "Arial", fontSize: "14px", color: "#ffd248", fontStyle: "bold" }).setOrigin(0.5);
    this.chainBadge.add([bg, this.chainBadgeText]);
  }

  updateChainBadge() {
    if (!this.chainBadge) return;
    const n = this.path.length;
    const next = n ? this.nextResource(this.path[0].res) : null;
    const k = next ? upgradeCountForChain(n) : 0;
    this.chainBadgeText.setText(k > 0 ? `chain × ${n}   +${k}★` : `chain × ${n}`);
  }

  hideChainBadge() {
    if (this.chainBadge) { this.chainBadge.destroy(); this.chainBadge = null; this.chainBadgeText = null; }
  }

  // ─── Floater (resource-gain text per tile) ────────────────────────────────

  floatText(msg, x, y, color) {
    const t = this.add.text(x, y, msg, { fontFamily: "Arial", fontSize: "22px", color: cssColor(color), fontStyle: "bold", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(20).setScale(0.7);
    this.tweens.add({ targets: t, scale: 1, duration: 120, ease: "Back.Out" });
    this.tweens.add({ targets: t, y: y - 58, alpha: 0, delay: 120, duration: 780, onComplete: () => t.destroy() });
  }
}
