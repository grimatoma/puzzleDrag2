import Phaser from "phaser";
import { TILE, COLS, ROWS, MAX_TURNS, UPGRADE_EVERY, SEASONS, BIOMES } from "./constants.js";
import { seasonIndexForTurns, upgradeCountForChain, cssColor } from "./utils.js";
import { rounded, makeTextures } from "./textures.js";
import { TileObj } from "./TileObj.js";

const TILE_BASE = TILE; // CSS-pixel design size for one tile; textures are baked at TILE * dpr

// Single decorative frame around the tiles, in CSS pixels. Thinner on narrow
// viewports so the board can stretch as wide as possible.
function boardFrameFor(cssVw) {
  return cssVw < 600 ? 8 : 14;
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.grid = [];
    this.path = [];
    this.pathLines = [];
    this.pathStars = [];
    this.pathNodeG = null;
    this.pendingUpgrades = [];
    this._prevPathLen = 0;
    this._prevStarGroups = 0;
    this.dragging = false;
    this.locked = false;
  }

  create() {
    this.input.topOnly = true;
    this.dpr = this.registry.get("dpr") || 1;
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
    // Scene world coordinates are in canvas (device) pixels because the game
    // is configured at gameSize = cssSize × dpr. CSS-pixel design constants
    // are converted with this.dpr where they appear as world dimensions.
    const dpr = this.dpr;
    const vw = this.scale.width;
    const vh = this.scale.height;
    this.boardFrame = boardFrameFor(vw / dpr) * dpr;
    const margin = this.boardFrame;
    const maxByW = (vw - margin * 2) / COLS;
    const maxByH = (vh - margin * 2) / ROWS;
    // Let the board fill its container — only clamp a hard ceiling so
    // huge ultrawide displays don't render absurdly large tiles.
    const ceiling = TILE_BASE * 3.2 * dpr;
    this.tileSize = Math.max(24 * dpr, Math.min(maxByW, maxByH, ceiling));
    // Ratio of canvas px to CSS px at current tile size — used for graphics
    // line widths, offsets, and other CSS-pixel design constants.
    this.tileScale = this.tileSize / TILE_BASE;
    // Sprite display scale: textures are baked at TILE_BASE * dpr canvas px,
    // so dividing by dpr makes a sprite at scale 1 fill TILE_BASE * dpr.
    this.tileSpriteScale = this.tileScale / dpr;
    this.boardX = Math.round((vw - COLS * this.tileSize) / 2);
    this.boardY = Math.round((vh - ROWS * this.tileSize) / 2);
  }

  handleResize() {
    const prevX = this.boardX;
    const prevY = this.boardY;
    const prevSize = this.tileSize;
    this.layoutDims();
    this.children.list.filter((o) => o.__layer === "bg").forEach((o) => o.destroy());
    this.drawBackground();
    if (this.boardX !== prevX || this.boardY !== prevY || this.tileSize !== prevSize) {
      this.repositionTiles();
    }
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
        t.sprite.setScale(this.tileSpriteScale * (t.selected ? 1.06 : 1));
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
    const dpr = this.dpr;
    const vw = this.scale.width;
    const vh = this.scale.height;
    const ts = this.tileSize;
    const boardW = COLS * ts;
    const boardH = ROWS * ts;
    const bg = this.biomeKey() === "mine" ? 0x31404a : s.bg;
    this.cameras.main.setBackgroundColor(bg);
    tag(this.add.rectangle(0, 0, vw, vh, bg).setOrigin(0).setDepth(-10));
    const frame = this.boardFrame;
    // Decorative side leaves — only draw if there's room outside the board frame.
    const leafGap = 36 * dpr;
    if (this.boardX - frame - leafGap > 0) {
      for (let y = 30 * dpr; y < vh - 30 * dpr; y += 36 * dpr) {
        tag(this.add.ellipse(this.boardX - leafGap, y, 38 * dpr, 22 * dpr, s.accent, 0.55).setAngle(-25).setDepth(-9));
        tag(this.add.ellipse(this.boardX + boardW + leafGap, y, 38 * dpr, 22 * dpr, s.accent, 0.55).setAngle(25).setDepth(-9));
      }
    }
    // Single decorative board frame (replaces the previously stacked outer/inner frames).
    tag(rounded(this, this.boardX - frame, this.boardY - frame, boardW + frame * 2, boardH + frame * 2, 16 * dpr, b.dirt, 1).setDepth(-1));
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
          const res = !initial && this.pendingUpgrades.length ? this.pendingUpgrades.shift() : this.randomResource();
          const tile = new TileObj(this, x, initial ? y - 500 - Phaser.Math.Between(0, 100) : y - 140, c, r, res);
          tile.sprite.setScale(this.tileSpriteScale);
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
    this.dimUnselectableTiles(tile.res.key);
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
    const prevLen = this._prevPathLen;
    const growing = this.path.length > prevLen;
    this._prevPathLen = this.path.length;

    this.pathStars.forEach((s) => s.destroy());
    this.pathStars = [];

    for (let i = 1; i < this.path.length; i++) {
      const a = this.path[i - 1];
      const b = this.path[i];
      let g = this.pathLines[i - 1];
      if (!g) {
        g = this.add.graphics().setDepth(8);
        this.pathLines[i - 1] = g;
      }
      if (growing && i === this.path.length - 1) {
        // Newest segment: grow it from a toward b, then pulse
        this.tweens.killTweensOf(g);
        g.clear();
        const ax = a.x, ay = a.y, bx = b.x, by = b.y;
        const obj = { t: 0 };
        this.tweens.add({
          targets: obj, t: 1, duration: 160, ease: "Quad.Out",
          onUpdate: () => {
            const mx = ax + (bx - ax) * obj.t;
            const my = ay + (by - ay) * obj.t;
            g.clear();
            this._drawSegment(g, ax, ay, mx, my);
          },
          onComplete: () => {
            g.clear(); this._drawSegment(g, ax, ay, bx, by);
            this.tweens.add({ targets: g, alpha: 0.78, yoyo: true, repeat: -1, duration: 680, ease: "Sine.InOut" });
          },
        });
      } else {
        g.clear();
        this._drawSegment(g, a.x, a.y, b.x, b.y);
        if (!this.tweens.isTweening(g)) {
          this.tweens.add({ targets: g, alpha: 0.78, yoyo: true, repeat: -1, duration: 680, ease: "Sine.InOut" });
        }
      }
    }
    this.pathLines.forEach((g, i) => g.setVisible(i < this.path.length - 1));

    // Expanding ring burst at the newly added tile
    if (growing && this.path.length > 0) {
      const nt = this.path[this.path.length - 1];
      const ring = this.add.graphics().setDepth(10);
      const ro = { r: 5 * this.tileScale, a: 0.9 };
      this.tweens.add({
        targets: ro, r: 28 * this.tileScale, a: 0, duration: 340, ease: "Quad.Out",
        onUpdate: () => {
          ring.clear();
          ring.lineStyle(2.5 * this.tileScale, 0xffd248, ro.a);
          ring.strokeCircle(nt.x, nt.y, ro.r);
        },
        onComplete: () => ring.destroy(),
      });
    }

    // Static node dots
    if (!this.pathNodeG) this.pathNodeG = this.add.graphics().setDepth(9);
    this.pathNodeG.clear();
    const nr = 7 * this.tileScale;
    this.path.forEach((t) => {
      this.pathNodeG.fillStyle(0xffd248, 0.55);
      this.pathNodeG.fillCircle(t.x, t.y, nr * 1.6);
      this.pathNodeG.fillStyle(0xff6d00, 1);
      this.pathNodeG.fillCircle(t.x, t.y, nr);
      this.pathNodeG.fillStyle(0xfff4c2, 0.9);
      this.pathNodeG.fillCircle(t.x, t.y, nr * 0.4);
    });

    const next = this.path.length ? this.nextResource(this.path[0].res) : null;
    const prevGroups = this._prevStarGroups;
    let groupCount = 0;
    if (next) {
      const off = 24 * this.tileScale;
      for (let i = UPGRADE_EVERY - 1; i < this.path.length; i += UPGRADE_EVERY) {
        const t = this.path[i];
        const star = this.add.image(t.x + off, t.y - off, "spark").setScale(0.72 * this.tileSpriteScale).setDepth(12);
        const preview = this.add.image(t.x + off, t.y + off * 0.85, `tile_${next.key}`).setScale(0.32 * this.tileSpriteScale).setDepth(12);
        const swayStar = () => {
          if (!star.active) return;
          this.tweens.add({
            targets: star,
            angle: { from: 10, to: -10 },
            yoyo: true,
            repeat: -1,
            duration: 950,
            ease: "Sine.InOut",
          });
        };

        if (groupCount >= prevGroups) {
          // Pop-in + gentle sway for new star
          star.setScale(0).setAngle(-20);
          this.tweens.add({ targets: star, scale: 0.72 * this.tileSpriteScale, angle: 15, duration: 320, ease: "Back.Out" });
          this.time.delayedCall(320, swayStar);
          preview.setScale(0).setAlpha(0);
          this.tweens.add({ targets: preview, scale: 0.32 * this.tileSpriteScale, alpha: 1, duration: 260, ease: "Back.Out", delay: 110 });
        } else {
          star.setAngle(10);
          swayStar();
        }
        this.pathStars.push(star, preview);
        groupCount++;
      }
    }
    this._prevStarGroups = groupCount;
    this.path.forEach((t) => t.sprite.setDepth(7));
  }

  _drawSegment(g, ax, ay, bx, by) {
    g.lineStyle(22 * this.tileScale, 0xffd248, 0.22);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
    g.lineStyle(9 * this.tileScale, 0xff6d00, 1);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
    g.lineStyle(3 * this.tileScale, 0xfff4c2, 0.85);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
  }

  endPath() {
    if (!this.dragging) return;
    this.dragging = false;
    this.hideChainBadge();
    this.clearDimming();
    const minChain = 3;
    if (this.path.length >= minChain) this.collectPath();
    else this.clearPath(true);
  }

  dimUnselectableTiles(key) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.grid[r]?.[c];
        if (!tile) continue;
        tile.sprite.setAlpha(tile.res.key === key ? 1 : 0.35);
      }
    }
  }

  clearDimming() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.grid[r]?.[c];
        if (!tile) continue;
        tile.sprite.setAlpha(1);
      }
    }
  }

  clearPath(deselect = true) {
    if (deselect) this.path.forEach((t) => t.setSelected(false));
    this.path = [];
    this._prevPathLen = 0;
    this._prevStarGroups = 0;
    this.pathLines.forEach((l) => { this.tweens.killTweensOf(l); l.clear(); });
    this.pathStars.forEach((s) => s.destroy());
    this.pathStars = [];
    if (this.pathNodeG) { this.pathNodeG.clear(); }
    this.hideChainBadge();
  }

  collectPath() {
    if (!this.path.length) return;
    const res = this.path[0].res;
    const next = this.nextResource(res);
    const upgradeTotal = next ? upgradeCountForChain(this.path.length) : 0;
    const gained = this.path.length * (this.path.length >= 6 ? 2 : 1);
    this.floatText(`+${gained} ${res.label}${upgradeTotal ? `  ★ ${upgradeTotal}` : ""}`, this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, 0xffd248);

    // Chain-length juice — escalating screen shake and a radial wipe. Big chains
    // earn loud feedback; tier upgrades (every 3rd tile) add an extra burst.
    this.shakeForChain(this.path.length);
    this.radialFlash(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, this.path.length);

    this.path.forEach((tile, i) => {
      const upgrade = next && (i + 1) % UPGRADE_EVERY === 0;
      if (upgrade) {
        tile.setSelected(false);
        this.pendingUpgrades.push(next);
        this.upgradeBurst(tile.x, tile.y);
      }
      this.grid[tile.row][tile.col] = null;
      this.tweens.add({ targets: tile.sprite, scale: 0, angle: Phaser.Math.Between(-25, 25), alpha: 0, duration: 180 + i * 15, onComplete: () => tile.destroy() });
    });

    // Emit to React
    this.events.emit("chain-collected", { key: res.key, gained, upgrades: upgradeTotal, chainLength: this.path.length, value: res.value });

    this.pathLines.forEach((l) => l.destroy());
    this.pathStars.forEach((s) => s.destroy());
    if (this.pathNodeG) { this.pathNodeG.destroy(); this.pathNodeG = null; }
    this.pathLines = [];
    this.pathStars = [];
    this.path = [];
    this._prevPathLen = 0;
    this._prevStarGroups = 0;
    this.time.delayedCall(300, () => this.collapseBoard());
  }

  // ─── Chain badge (above board) ────────────────────────────────────────────

  showChainBadge() {
    if (this.chainBadge) return;
    const dpr = this.dpr;
    const cx = this.boardX + (COLS * this.tileSize) / 2;
    const cy = this.boardY - this.boardFrame - 22 * dpr;
    this.chainBadge = this.add.container(cx, cy).setDepth(40);
    const bg = rounded(this, -70 * dpr, -16 * dpr, 140 * dpr, 32 * dpr, 16 * dpr, 0x2b2218, 0.9, 0xffd248, 2 * dpr);
    this.chainBadgeText = this.add.text(0, 0, "", { fontFamily: "Arial", fontSize: `${14 * dpr}px`, color: "#ffd248", fontStyle: "bold" }).setOrigin(0.5);
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

  // ─── Juice (chain-length feedback) ────────────────────────────────────────

  shakeForChain(len) {
    if (len < 3) return;
    // 3 → barely; 6 → noticeable; 10+ → bone-rattling.
    const intensity = Math.min(0.018, 0.0025 + (len - 3) * 0.0028);
    const duration = Math.min(520, 160 + (len - 3) * 50);
    this.cameras.main.shake(duration, intensity, false);
  }

  radialFlash(x, y, len) {
    if (len < 3) return;
    const ring = this.add.graphics().setDepth(15);
    const startR = 10 * this.tileScale;
    const peakR = (40 + Math.min(80, (len - 3) * 14)) * this.tileScale;
    const obj = { r: startR, a: 0.55 };
    this.tweens.add({
      targets: obj, r: peakR, a: 0,
      duration: 460,
      ease: "Quad.Out",
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(6 * this.tileScale, 0xffe39a, obj.a);
        ring.strokeCircle(x, y, obj.r);
        ring.lineStyle(2 * this.tileScale, 0xffffff, obj.a * 0.9);
        ring.strokeCircle(x, y, obj.r * 0.55);
      },
      onComplete: () => ring.destroy(),
    });
  }

  upgradeBurst(x, y) {
    const flash = this.add.graphics().setDepth(14);
    const obj = { r: 4 * this.tileScale, a: 0.85 };
    this.tweens.add({
      targets: obj, r: 36 * this.tileScale, a: 0, duration: 360, ease: "Quad.Out",
      onUpdate: () => {
        flash.clear();
        flash.fillStyle(0xfff4c2, obj.a * 0.5);
        flash.fillCircle(x, y, obj.r);
        flash.lineStyle(3 * this.tileScale, 0xffd248, obj.a);
        flash.strokeCircle(x, y, obj.r);
      },
      onComplete: () => flash.destroy(),
    });
  }

  // ─── Floater (resource-gain text per tile) ────────────────────────────────

  floatText(msg, x, y, color) {
    const dpr = this.dpr;
    const t = this.add.text(x, y, msg, { fontFamily: "Arial", fontSize: `${22 * dpr}px`, color: cssColor(color), fontStyle: "bold", stroke: "#000", strokeThickness: 5 * dpr }).setOrigin(0.5).setDepth(20).setScale(0.7);
    this.tweens.add({ targets: t, scale: 1, duration: 120, ease: "Back.Out" });
    this.tweens.add({ targets: t, y: y - 58 * dpr, alpha: 0, delay: 120, duration: 780, onComplete: () => t.destroy() });
  }
}
