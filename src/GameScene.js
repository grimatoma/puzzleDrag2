import Phaser from "phaser";
import {
  W, H, TILE, COLS, ROWS, BOARD_X, BOARD_Y,
  MAX_TURNS, UPGRADE_EVERY, SEASONS, BIOMES,
} from "./constants.js";
import { clamp, seasonIndexForTurns, upgradeCountForChain, cssColor } from "./utils.js";
import { rounded, drawCuteVine, makeTextures } from "./textures.js";
import { TileObj } from "./TileObj.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.grid = [];
    this.path = [];
    this.pathLines = [];
    this.pathStars = [];
    this.dragging = false;
    this.biomeKey = "farm";
    this.coins = 150;
    this.level = 1;
    this.xp = 0;
    this.day = 1;
    this.turnsUsed = 0;
    this.inventory = {};
    this.orders = [];
    this.tools = { clear: 2, basic: 1, rare: 1, shuffle: 0 };
    this.overlay = null;
  }

  create() {
    this.input.topOnly = true;
    makeTextures(this);
    this.rebuild();
    this.input.on("pointerup", () => this.endPath());
    this.input.keyboard?.on("keydown-SPACE", () => this.shuffleBoard());
  }

  seasonIndex() { return seasonIndexForTurns(this.turnsUsed); }
  season() { return SEASONS[this.seasonIndex()]; }
  biome() { return BIOMES[this.biomeKey]; }

  rebuild() {
    this.children.removeAll();
    this.grid = [];
    this.path = [];
    this.pathLines = [];
    this.pathStars = [];
    this.overlay = null;
    this.biomeButtons = null;
    this.addBackground();
    this.addHud();
    this.addPanel();
    if (!this.orders.length) this.newOrders();
    this.fillBoard(true);
    this.updateAll(false);
  }

  addBackground() {
    const s = this.season();
    const b = this.biome();
    const bg = this.biomeKey === "mine" ? 0x31404a : s.bg;
    this.cameras.main.setBackgroundColor(bg);
    this.add.rectangle(0, 0, W, H, bg).setOrigin(0);
    this.add.rectangle(0, 0, W, 70, 0x5b3b20).setOrigin(0).setAlpha(0.96);
    for (let i = 0; i < 13; i++) {
      const x = i * 80 - 20;
      this.add.circle(x + 34, 69, 24, s.accent, 0.95);
      this.add.circle(x + 55, 64, 20, s.accent, 0.85);
    }
    for (let y = 90; y < 596; y += 32) {
      this.add.ellipse(350, y, 42, 24, s.accent, 0.7).setAngle(-25);
      this.add.ellipse(934, y, 44, 24, s.accent, 0.7).setAngle(25);
    }
    rounded(this, BOARD_X - 24, BOARD_Y - 24, COLS * TILE + 48, ROWS * TILE + 48, 20, b.dark, 0.85);
    rounded(this, BOARD_X - 14, BOARD_Y - 14, COLS * TILE + 28, ROWS * TILE + 28, 18, b.dirt, 1);
  }

  addHud() {
    this.add.circle(38, 35, 24, 0xf7f0de).setStrokeStyle(4, 0xb28b62);
    this.add.text(38, 35, "↩", { fontFamily: "Arial", fontSize: "33px", color: "#7a5638", fontStyle: "bold" }).setOrigin(0.5);
    rounded(this, 92, 14, 142, 40, 20, 0xf6efe0, 1, 0xb28b62, 3);
    this.coinText = this.add.text(118, 34, String(this.coins), { fontFamily: "Arial", fontSize: "22px", color: "#6a4b31", fontStyle: "bold" }).setOrigin(0, 0.5);
    this.add.circle(210, 34, 24, 0xffc239).setStrokeStyle(4, 0xf2e2a1);
    this.add.text(210, 34, "⚒", { fontFamily: "Arial", fontSize: "24px" }).setOrigin(0.5);
    this.addSeasonBar();
    rounded(this, 706, 14, 158, 40, 20, 0xf6efe0, 1, 0xb28b62, 3);
    rounded(this, 750, 20, 104, 28, 14, 0xb9a48f, 1);
    this.xpFill = rounded(this, 750, 20, 8, 28, 14, 0xff8b25, 1);
    this.xpText = this.add.text(802, 34, "0/500", { fontFamily: "Arial", fontSize: "15px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.circle(908, 34, 28, 0xbb3b2f).setStrokeStyle(4, 0xffe2a3);
    this.levelText = this.add.text(908, 34, String(this.level), { fontFamily: "Arial", fontSize: "28px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(652, 610, "Drag 3+ matching tiles. Every 3rd chained tile becomes the next tier.", { fontFamily: "Arial", fontSize: "16px", color: "#fff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5);
  }

  addSeasonBar() {
    const s = this.season();
    rounded(this, 252, 8, 434, 56, 20, 0xfaf0dd, 1, 0xb28b62, 3);
    drawCuteVine(this, 286, 49, 369, 0x6da53a);
    for (let i = 0; i < 7; i++) {
      const lx = 300 + i * 52;
      const ly = 48 + (i % 2 === 0 ? -3 : 3);
      this.add.ellipse(lx - 10, ly, 14, 8, 0x74b744, 0.95).setAngle(-35);
      this.add.ellipse(lx + 10, ly, 14, 8, 0x74b744, 0.95).setAngle(35);
    }
    this.turnsText = this.add.text(274, 22, "Turns 10/10", { fontFamily: "Arial", fontSize: "16px", color: "#6a4b31", fontStyle: "bold" }).setOrigin(0, 0.5);
    this.seasonText = this.add.text(600, 22, s.name, { fontFamily: "Arial", fontSize: "18px", color: "#6a4b31", fontStyle: "bold" }).setOrigin(0.5);
    rounded(this, 286, 35, 370, 16, 8, 0xe5d7bf, 1, 0xc5b390, 2);
    this.seasonFill = rounded(this, 286, 35, 1, 16, 8, s.fill, 1);
    this.seasonBadge = this.add.container(643, 43);
    this.pips = [];
    for (let i = 0; i < MAX_TURNS; i++) {
      const x = 300 + i * 36;
      const back = this.add.circle(x, 43, 11, 0xffffff, 0.72).setStrokeStyle(2, 0xb28b62, 0.7);
      const icon = this.add.image(x, 43, `season_${s.icon}`).setScale(0.52).setAlpha(0.25);
      this.pips.push({ back, icon });
    }
  }

  updateSeasonHud(animated = false) {
    const s = this.season();
    const left = MAX_TURNS - this.turnsUsed;
    const w = clamp((this.turnsUsed / MAX_TURNS) * 370, 1, 370);
    this.turnsText?.setText(`Turns ${left}/${MAX_TURNS}`);
    this.seasonText?.setText(s.name);
    if (this.seasonFill) {
      this.seasonFill.destroy();
      this.seasonFill = rounded(this, 286, 35, w, 16, 8, s.fill, 1);
    }
    this.seasonBadge?.removeAll(true);
    if (this.seasonBadge) {
      this.seasonBadge.add([
        this.add.circle(0, 0, 18, 0xffffff, 0.92).setStrokeStyle(3, 0xb28b62),
        this.add.image(0, 0, `season_${s.icon}`).setScale(0.72),
      ]);
    }
    this.pips?.forEach((p, i) => {
      const filled = i < this.turnsUsed;
      p.back.setFillStyle(filled ? s.fill : 0xffffff, filled ? 1 : 0.72);
      p.icon.setTexture(`season_${s.icon}`);
      p.icon.setAlpha(filled ? 1 : 0.25);
      p.icon.setScale(filled ? 0.62 : 0.52);
      if (animated && i === this.turnsUsed - 1) {
        this.tweens.add({ targets: [p.back, p.icon], scale: 1.22, yoyo: true, duration: 180, ease: "Back.Out" });
      }
    });
  }

  addPanel() {
    this.panel = this.add.container(0, 72);
    this.panel.add([
      rounded(this, 8, 0, 302, 544, 18, 0x7c4f2c, 0.98, 0xe2c19b, 5),
      rounded(this, 24, 18, 268, 110, 16, 0xf7ead8, 1),
    ]);
    this.panel.add(this.add.text(48, 50, "Orders", { fontFamily: "Arial", fontSize: "25px", color: "#744d2e", fontStyle: "bold" }));
    this.ordersContainer = this.add.container(40, 92);
    this.inventoryContainer = this.add.container(30, 178);
    this.toolsContainer = this.add.container(30, 418);
    this.panel.add([
      this.ordersContainer,
      this.add.text(28, 146, "Storage", { fontFamily: "Arial", fontSize: "20px", color: "#f8e7c6", fontStyle: "bold" }),
      this.inventoryContainer,
      this.add.text(28, 386, "Tools", { fontFamily: "Arial", fontSize: "20px", color: "#f8e7c6", fontStyle: "bold" }),
      this.toolsContainer,
    ]);
  }

  renderPanel() {
    this.ordersContainer.removeAll(true);
    this.inventoryContainer.removeAll(true);
    this.toolsContainer.removeAll(true);

    this.orders.forEach((o, i) => {
      const x = i * 128;
      const done = (this.inventory[o.key] || 0) >= o.need;
      const pill = rounded(this, x, -20, 118, 48, 14, done ? 0x91bf24 : 0xbdb3a8, 1, 0xffffff, 3, 0.5).setInteractive(new Phaser.Geom.Rectangle(x, -20, 118, 48), Phaser.Geom.Rectangle.Contains);
      const r = this.resourceByKey(o.key);
      const icon = this.add.image(x + 26, 3, `tile_${r.key}`).setScale(0.42);
      const txt = this.add.text(x + 48, 4, `${this.inventory[o.key] || 0}/${o.need}`, { fontFamily: "Arial", fontSize: "20px", color: "#fff", fontStyle: "bold", stroke: "#4b2d1a", strokeThickness: 3 }).setOrigin(0, 0.5);
      pill.on("pointerdown", () => this.turnInOrder(o));
      this.ordersContainer.add([pill, icon, txt]);
    });

    this.biome().resources.forEach((r, i) => {
      const x = (i % 2) * 128;
      const y = Math.floor(i / 2) * 66;
      this.inventoryContainer.add([
        rounded(this, x, y, 112, 56, 12, 0xb68d64, 1, 0xe6c49a, 2, 0.5),
        this.add.image(x + 25, y + 28, `tile_${r.key}`).setScale(0.48),
        this.add.text(x + 54, y + 29, String(this.inventory[r.key] || 0), { fontFamily: "Arial", fontSize: "22px", color: "#fff", fontStyle: "bold", stroke: "#4b2d1a", strokeThickness: 4 }).setOrigin(0, 0.5),
      ]);
    });

    [
      { key: "clear", icon: "C", name: "Clear" },
      { key: "basic", icon: "+", name: "+Basic" },
      { key: "rare", icon: "R", name: "+Rare" },
      { key: "shuffle", icon: "★", name: "Shuffle" },
    ].forEach((t, i) => {
      const x = (i % 2) * 128;
      const y = Math.floor(i / 2) * 62;
      const card = rounded(this, x, y, 112, 52, 12, 0x9a724d, 1, 0xe6c49a, 2, 0.4).setInteractive(new Phaser.Geom.Rectangle(x, y, 112, 52), Phaser.Geom.Rectangle.Contains);
      card.on("pointerdown", () => this.useTool(t.key));
      this.toolsContainer.add([
        card,
        this.add.text(x + 25, y + 26, t.icon, { fontFamily: "Arial", fontSize: "24px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5),
        this.add.text(x + 48, y + 18, t.name, { fontFamily: "Arial", fontSize: "13px", color: "#fff", fontStyle: "bold" }).setOrigin(0, 0.5),
        this.add.text(x + 96, y + 38, String(this.tools[t.key] || 0), { fontFamily: "Arial", fontSize: "18px", color: "#fff", fontStyle: "bold", stroke: "#4b2d1a", strokeThickness: 3 }).setOrigin(0.5),
      ]);
    });

    if (!this.biomeButtons) {
      this.biomeButtons = this.add.container(390, 596);
      ["farm", "mine"].forEach((k, i) => {
        const x = i * 112;
        const b = rounded(this, x, 0, 102, 36, 18, k === this.biomeKey ? 0xffc239 : 0x6b4d34, 1, 0xffffff, 3, 0.5).setInteractive(new Phaser.Geom.Rectangle(x, 0, 102, 36), Phaser.Geom.Rectangle.Contains);
        b.on("pointerdown", () => this.switchBiome(k));
        this.biomeButtons.add([
          b,
          this.add.text(x + 51, 18, BIOMES[k].name, { fontFamily: "Arial", fontSize: "17px", color: k === this.biomeKey ? "#5a3a20" : "#fff", fontStyle: "bold" }).setOrigin(0.5),
        ]);
      });
    }
  }

  resourceByKey(key) {
    return Object.values(BIOMES).flatMap((b) => b.resources).find((r) => r.key === key) || BIOMES.farm.resources[0];
  }

  nextResource(res) {
    const pool = this.biome().resources;
    const idx = pool.findIndex((r) => r.key === res.key);
    return idx >= 0 && idx < pool.length - 1 ? pool[idx + 1] : null;
  }

  randomResource() {
    const p = this.biome().resources;
    const roll = Math.random();
    return roll < 0.36 ? p[0] : roll < 0.62 ? p[1] : roll < 0.8 ? p[2] : roll < 0.93 ? p[3] : p[4];
  }

  fillBoard(initial = false) {
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = this.grid[r] || [];
      for (let c = 0; c < COLS; c++) {
        if (!this.grid[r][c]) {
          const x = BOARD_X + c * TILE + TILE / 2;
          const y = BOARD_Y + r * TILE + TILE / 2;
          const tile = new TileObj(this, x, initial ? y - 500 - Phaser.Math.Between(0, 100) : y - 140, c, r, this.randomResource());
          this.grid[r][c] = tile;
          this.tweens.add({ targets: tile.sprite, y, duration: initial ? 450 + r * 28 : 210, ease: "Back.Out" });
        }
      }
    }
  }

  startPath(tile) {
    if (this.overlay || this.turnsUsed >= MAX_TURNS) return;
    this.dragging = true;
    this.clearPath(false);
    this.addToPath(tile);
  }

  tryAddToPath(tile) {
    if (!this.dragging || !this.path.length) return;
    const last = this.path[this.path.length - 1];
    const prev = this.path[this.path.length - 2];
    if (prev === tile) {
      last.setSelected(false);
      this.path.pop();
      this.redrawPath();
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
      g.lineStyle(15, 0xffd248, 0.28);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
      g.lineStyle(8, 0xff6d00, 1);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
    this.pathLines.forEach((g, i) => g.setVisible(i < this.path.length - 1));
    const next = this.path.length ? this.nextResource(this.path[0].res) : null;
    if (next) {
      for (let i = UPGRADE_EVERY - 1; i < this.path.length; i += UPGRADE_EVERY) {
        const t = this.path[i];
        const star = this.add.image(t.x + 22, t.y - 22, "spark").setScale(0.45).setDepth(9);
        const prev = this.add.image(t.x + 22, t.y + 20, `tile_${next.key}`).setScale(0.28).setDepth(10);
        this.pathStars.push(star, prev);
      }
    }
    this.path.forEach((t) => t.sprite.setDepth(6));
  }

  endPath() {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.path.length >= 3) this.collectPath();
    else this.clearPath(true);
  }

  collectPath() {
    if (!this.path.length) return;
    const res = this.path[0].res;
    const next = this.nextResource(res);
    const upgradeTotal = next ? upgradeCountForChain(this.path.length) : 0;
    const gained = this.path.length * (this.path.length >= 6 ? 2 : 1);
    this.inventory[res.key] = (this.inventory[res.key] || 0) + gained;
    this.coins += Math.max(1, Math.floor((gained * res.value) / 2));
    this.xp += gained * res.value * 3 + upgradeTotal * 12;
    this.floatText(`+${gained} ${res.label}${upgradeTotal ? `  ★ ${upgradeTotal}` : ""}`, this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, 0xffffff);

    this.path.forEach((tile, i) => {
      const upgrade = next && (i + 1) % UPGRADE_EVERY === 0;
      if (upgrade) {
        tile.setSelected(false);
        tile.setResource(next);
        tile.sprite.setScale(0.1).setAlpha(0.2);
        this.tweens.add({ targets: tile.sprite, scale: 1, alpha: 1, angle: 360, duration: 280, ease: "Back.Out", onComplete: () => (tile.sprite.angle = 0) });
        const burst = this.add.image(tile.x, tile.y, "spark").setScale(0.1).setDepth(12);
        this.tweens.add({ targets: burst, scale: 0.9, alpha: 0, duration: 420, onComplete: () => burst.destroy() });
      } else {
        this.grid[tile.row][tile.col] = null;
        this.tweens.add({ targets: tile.sprite, scale: 0, angle: Phaser.Math.Between(-25, 25), alpha: 0, duration: 180 + i * 15, onComplete: () => tile.destroy() });
      }
    });

    this.pathLines.forEach((l) => l.destroy());
    this.pathStars.forEach((s) => s.destroy());
    this.pathLines = [];
    this.pathStars = [];
    this.path = [];
    this.time.delayedCall(300, () => {
      this.advanceTurn();
      this.collapseBoard();
      this.updateAll();
    });
  }

  collapseBoard() {
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const tile = this.grid[r][c];
        if (!tile) continue;
        if (write !== r) {
          this.grid[write][c] = tile;
          this.grid[r][c] = null;
          tile.row = write;
          this.tweens.add({ targets: tile.sprite, y: BOARD_Y + write * TILE + TILE / 2, duration: 190 });
        }
        write--;
      }
    }
    this.time.delayedCall(210, () => this.fillBoard(false));
  }

  clearPath(animated) {
    this.path.forEach((t) => {
      t.setSelected(false);
      t.sprite.setDepth(0);
    });
    this.pathLines.forEach((l) => l.destroy());
    this.pathStars.forEach((s) => s.destroy());
    this.pathLines = [];
    this.pathStars = [];
    if (animated) this.path.forEach((t) => t.pulse());
    this.path = [];
  }

  advanceTurn() {
    if (this.overlay) return;
    this.turnsUsed = clamp(this.turnsUsed + 1, 0, MAX_TURNS);
    this.updateSeasonHud(true);
    if (this.turnsUsed >= MAX_TURNS) this.time.delayedCall(420, () => this.endSeason());
  }

  endSeason() {
    if (this.overlay) return;
    this.clearPath(false);
    const group = this.add.container(0, 0).setDepth(60);
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.48);
    const panel = rounded(this, W / 2 - 205, H / 2 - 132, 410, 264, 22, 0xf7ead8, 1, 0xb28b62, 5);
    const title = this.add.text(W / 2, H / 2 - 88, `${this.season().name} Complete!`, { fontFamily: "Arial", fontSize: "31px", color: "#744d2e", fontStyle: "bold" }).setOrigin(0.5);
    const body = this.add.text(W / 2, H / 2 - 20, `Coins: ${this.coins}\nLevel: ${this.level}\nOrders left: ${this.orders.length}`, { fontFamily: "Arial", fontSize: "22px", color: "#6a4b31", align: "center", lineSpacing: 8 }).setOrigin(0.5);
    const btn = rounded(this, W / 2 - 96, H / 2 + 62, 192, 50, 18, 0x91bf24, 1, 0xffffff, 3, 0.75).setInteractive(new Phaser.Geom.Rectangle(W / 2 - 96, H / 2 + 62, 192, 50), Phaser.Geom.Rectangle.Contains);
    const txt = this.add.text(W / 2, H / 2 + 87, "Next Season", { fontFamily: "Arial", fontSize: "22px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5);
    group.add([shade, panel, title, body, btn, txt]);
    this.overlay = group;
    btn.on("pointerdown", () => {
      this.turnsUsed = 0;
      this.orders = [];
      this.rebuild();
    });
  }

  newOrders() {
    const p = [...this.biome().resources.slice(0, 4)];
    Phaser.Utils.Array.Shuffle(p);
    this.orders = [
      { key: p[0].key, need: Phaser.Math.Between(8, 14) + this.level * 2, reward: 70 + this.level * 20 },
      { key: p[1].key, need: Phaser.Math.Between(6, 11) + this.level * 2, reward: 60 + this.level * 20 },
    ];
  }

  turnInOrder(o) {
    if ((this.inventory[o.key] || 0) < o.need) {
      this.floatText("Need more!", 155, 154, 0xfff0a2);
      return;
    }
    this.inventory[o.key] -= o.need;
    this.coins += o.reward;
    this.xp += o.reward;
    this.orders = this.orders.filter((x) => x !== o);
    if (!this.orders.length) this.newOrders();
    this.floatText(`Sold +${o.reward}`, 158, 154, 0xfff0a2);
    this.updateAll();
  }

  updateAll(render = true) {
    while (this.xp >= this.level * 500) {
      this.xp -= this.level * 500;
      this.level++;
      this.tools.shuffle++;
    }
    this.coinText?.setText(String(this.coins));
    this.levelText?.setText(String(this.level));
    this.xpText?.setText(`${this.xp}/${this.level * 500}`);
    if (this.xpFill) {
      this.xpFill.destroy();
      this.xpFill = rounded(this, 750, 20, clamp((this.xp / (this.level * 500)) * 104, 8, 104), 28, 14, 0xff8b25, 1);
    }
    this.updateSeasonHud(false);
    if (render) this.renderPanel();
  }

  floatText(msg, x, y, color) {
    const t = this.add.text(x, y, msg, { fontFamily: "Arial", fontSize: "24px", color: cssColor(color), fontStyle: "bold", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(20).setScale(0.7);
    this.tweens.add({ targets: t, scale: 1, duration: 120, ease: "Back.Out" });
    this.tweens.add({ targets: t, y: y - 58, alpha: 0, delay: 120, duration: 780, onComplete: () => t.destroy() });
  }

  useTool(key) {
    if ((this.tools[key] || 0) <= 0) {
      this.floatText("No tool", 154, 504, 0xfff0a2);
      return;
    }
    this.tools[key]--;
    if (key === "shuffle") this.shuffleBoard();
    else {
      const r = key === "rare" ? this.biome().resources[4] : this.biome().resources[0];
      this.inventory[r.key] = (this.inventory[r.key] || 0) + (key === "rare" ? 2 : 5);
    }
    this.updateAll();
  }

  shuffleBoard() {
    this.grid.flat().forEach((t) => {
      if (!t) return;
      t.setResource(this.randomResource());
      this.tweens.add({ targets: t.sprite, angle: 360, duration: 300, onComplete: () => (t.sprite.angle = 0) });
    });
  }

  switchBiome(key) {
    if (key === this.biomeKey) return;
    if (key === "mine" && this.level < 2) {
      this.floatText("Mine unlocks at level 2", 590, 606, 0xfff0a2);
      return;
    }
    this.biomeKey = key;
    this.orders = [];
    this.rebuild();
  }
}
