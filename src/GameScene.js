import Phaser from "phaser";
import { TILE, COLS, ROWS, UPGRADE_THRESHOLDS, SEASONS, BIOMES } from "./constants.js";
import { upgradeCountForChain, resourceGainForChain, rollResourceWithWeather } from "./utils.js";
import { computeWorkerEffects } from "./features/apprentices/effects.js";
const cssColor = (num) => Phaser.Display.Color.IntegerToColor(num).rgba;
import { rounded, makeTextures, regenerateTextures } from "./textures.js";
import { TileObj } from "./TileObj.js";
import { getTweenDuration, screenShake } from "./a11y.js";

const TILE_BASE = TILE; // CSS-pixel design size for one tile; textures are baked at TILE * dpr
const FLOAT_TEXT_COLOR = 0xffd248;

// Single decorative frame around the tiles, in CSS pixels. Thinner on narrow
// viewports so the board can stretch as wide as possible.
function boardFrameFor(cssVw) {
  return cssVw < 600 ? 8 : 14;
}

/**
 * Pure function — no Phaser dependency. Returns true if the grid contains any
 * cluster of 3+ 4-connected tiles with the same resource key.
 * @param {Array<Array<{res:{key:string}}|null>>} grid
 * @returns {boolean}
 */
export function hasValidChain(grid) {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));

  // Spec §4: adjacency includes all 8 directions (diagonals count)
  const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  function dfs(r, c, key) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return 0;
    if (visited[r][c]) return 0;
    if (!grid[r][c] || grid[r][c].res.key !== key) return 0;
    visited[r][c] = true;
    let count = 1;
    for (const [dr, dc] of DIRS) count += dfs(r + dr, c + dc, key);
    return count;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c] || visited[r][c]) continue;
      if (dfs(r, c, grid[r][c].res.key) >= 3) return true;
    }
  }
  return false;
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
    this.board = null; // Phaser Container used as tween target for shuffle spin
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
    this.input.on("pointerupoutside", () => this.endPath());
    this.input.on("gameout", () => this.endPath());

    // Prevent the browser from hijacking pointer events with its native text/element
    // selection during tile drags (causes the "foggy film" overlay and stuck tile selection).
    const canvas = this.sys.game.canvas;
    const preventSelect = (e) => e.preventDefault();
    canvas.addEventListener("selectstart", preventSelect);
    canvas.addEventListener("contextmenu", preventSelect);

    // Fallback: fire endPath if the pointer is released outside the Phaser canvas
    // or cancelled by the browser/OS (finger leaving the screen edge, system
    // gestures, app switch, scroll takeover) — these dispatch pointercancel /
    // touchcancel rather than pointerup, which would otherwise leave the drag
    // state stuck with the chain path still rendered.
    const onDocPointerUp = () => this.endPath();
    document.addEventListener("pointerup", onDocPointerUp);
    document.addEventListener("mouseup", onDocPointerUp);
    document.addEventListener("pointercancel", onDocPointerUp);
    document.addEventListener("touchcancel", onDocPointerUp);
    document.addEventListener("touchend", onDocPointerUp);
    const onVisibility = () => { if (document.hidden) this.endPath(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onDocPointerUp);

    this.events.once("shutdown", () => {
      canvas.removeEventListener("selectstart", preventSelect);
      canvas.removeEventListener("contextmenu", preventSelect);
      document.removeEventListener("pointerup", onDocPointerUp);
      document.removeEventListener("mouseup", onDocPointerUp);
      document.removeEventListener("pointercancel", onDocPointerUp);
      document.removeEventListener("touchcancel", onDocPointerUp);
      document.removeEventListener("touchend", onDocPointerUp);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onDocPointerUp);
    });

    this.scale.on("resize", () => this.handleResize());
    this.registry.events.on("changedata-biomeKey", (_p, value, prev) => {
      if (value !== prev) this.handleBiomeChange();
    });
    this.registry.events.on("changedata-turnsUsed", () => this.refreshSeasonTint());
    this.registry.events.on("changedata-uiLocked", (_p, value) => {
      this.locked = !!value;
    });
    this.registry.events.on("changedata-toolPending", (_p, value) => {
      if (!value) return;
      if (value === "clear")   this._applyToolClear();
      if (value === "basic")   this._applyToolBasic();
      if (value === "rare")    this._applyToolRare();
      if (value === "shuffle") this.shuffleBoard();
      // Clear the pending flag once handled
      this.time.delayedCall(50, () => this.registry.set("toolPending", null));
    });
    // Sync worker effects on init and whenever state.workers changes
    this._syncWorkerEffects();
    this.registry.events.on("changedata-workers", () => this._syncWorkerEffects());
    // Re-render tile textures when the color-blind palette changes
    this.registry.events.on("changedata-palette", (_p, value) => {
      regenerateTextures(this, value ?? "default");
    });
  }

  // ─── Worker effects sync ─────────────────────────────────────────────────

  _syncWorkerEffects() {
    const workers = this.registry.get("workers") ?? { hired: {}, debt: 0, pool: 0 };
    const agg = computeWorkerEffects({ workers });
    const eff = {};
    for (const [k, v] of Object.entries(UPGRADE_THRESHOLDS)) {
      eff[k] = Math.max(1, v - (agg.thresholdReduce[k] ?? 0));
    }
    this.registry.set("effectiveThresholds",  eff);
    this.registry.set("effectivePoolWeights", agg.poolWeight);
    this.registry.set("bonusYields",          agg.bonusYield);
    this.registry.set("seasonBonus",          agg.seasonBonus);
  }

  // ─── Motion helpers ──────────────────────────────────────────────────────

  /** Returns a minimal state-like object for the a11y motion helpers. */
  _motionState() {
    return { settings: { reducedMotion: this.registry.get("reducedMotion") ?? null } };
  }

  /** getTweenDuration wrapper reading reducedMotion from registry. */
  _dur(base) {
    return getTweenDuration(this._motionState(), base);
  }

  /** screenShake wrapper — no-op when reducedMotion is on. */
  _shake(duration, intensity) {
    // a11y.screenShake passes (intensity, 0.005) to camera.shake; we preserve the full params.
    screenShake(this._motionState(), duration, { shake: () => this.cameras.main.shake(duration, intensity, false) });
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
    const idx = (this.registry.get("seasonsCycled") || 0) % SEASONS.length;
    return SEASONS[idx];
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
      this.tweens.add({ targets: t.sprite, angle: 360, duration: this._dur(280), onComplete: () => (t.sprite.angle = 0) });
    });
  }

  // ─── Resources ────────────────────────────────────────────────────────────

  nextResource(res) {
    const resources = this.biome().resources;
    const nextKey = resources.find((r) => r.key === res.key)?.next;
    return nextKey ? resources.find((r) => r.key === nextKey) : null;
  }

  randomResource() {
    const biome = this.biome();
    const weather = this.registry.get("weather");
    const weatherKey = weather?.key ?? weather ?? null;
    const key = rollResourceWithWeather(biome.pool, weatherKey);
    return biome.resources.find((r) => r.key === key);
  }

  _randomFromPool(pool, weatherKey) {
    const key = rollResourceWithWeather(pool, weatherKey);
    return this.biome().resources.find((r) => r.key === key);
  }

  // ─── Board fill / collapse ────────────────────────────────────────────────

  fillBoard(initial = false) {
    const ts = this.tileSize;
    const weather = this.registry.get("weather");
    const weatherKey = weather?.key ?? weather ?? null;
    const frostBonus = (!initial && weatherKey === "frost") ? 120 : 0;
    // Build worker-boosted pool
    const biomeBase = this.biome().pool;
    const poolWeights = this.registry.get("effectivePoolWeights") ?? {};
    const workerPool = [...biomeBase];
    for (const [k, n] of Object.entries(poolWeights)) {
      for (let i = 0; i < Math.round(n); i++) workerPool.push(k);
    }
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = this.grid[r] || [];
      for (let c = 0; c < COLS; c++) {
        if (!this.grid[r][c]) {
          const x = this.boardX + c * ts + ts / 2;
          const y = this.boardY + r * ts + ts / 2;
          const res = !initial && this.pendingUpgrades.length ? this.pendingUpgrades.shift() : this._randomFromPool(workerPool, weatherKey);
          const tile = new TileObj(this, x, initial ? y - 500 - Phaser.Math.Between(0, 100) : y - 140, c, r, res);
          tile.sprite.setScale(this.tileSpriteScale);
          this.grid[r][c] = tile;
          this.tweens.add({ targets: tile.sprite, y, duration: this._dur((initial ? 450 + r * 28 : 210) + frostBonus), ease: "Back.Out" });
        }
      }
    }
    // 1.2 — Dead-board auto-shuffle: after every non-initial fill, check for valid chains.
    if (!initial) {
      const delay = frostBonus ? 350 : 240;
      this.time.delayedCall(delay, () => {
        if (!hasValidChain(this.grid)) {
          this.floatText("No moves — reshuffled!", this.boardX + (COLS * ts) / 2, this.boardY - 24 * this.dpr);
          this.shuffleBoard();
        }
      });
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
          this.tweens.add({ targets: tile.sprite, y: this.boardY + write * ts + ts / 2, duration: this._dur(190) });
        }
        write--;
      }
    }
    this.time.delayedCall(210, () => this.fillBoard(false));
  }

  shuffleBoard() {
    const ts = this.tileSize;
    const boardW = COLS * ts;
    const boardH = ROWS * ts;
    const cx = this.boardX + boardW / 2;
    const cy = this.boardY + boardH / 2;

    // Destroy any existing board container (e.g. from a previous shuffle that
    // completed before this one was triggered).
    if (this.board) { this.board.destroy(); this.board = null; }

    // Create board container as tween target + visual spin overlay
    this.board = this.add.container(cx, cy).setDepth(18);
    const spinOverlay = this.add.rectangle(0, 0, boardW, boardH, 0x2b2218, 0.35);
    this.board.add(spinOverlay);

    this.tweens.add({
      targets: this.board,
      rotation: Math.PI * 2,
      duration: this._dur(600),
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.board.destroy();
        this.board = null;
        this._performShuffleSwap();
        // Re-check after a brief delay to let the new tiles animate in
        this.time.delayedCall(320, () => {
          if (!hasValidChain(this.grid)) this.shuffleBoard();
        });
      },
    });
  }

  _performShuffleSwap() {
    this.grid.flat().forEach((t) => {
      if (!t) return;
      t.setResource(this.randomResource());
      this.tweens.add({ targets: t.sprite, angle: 360, duration: this._dur(300), onComplete: () => (t.sprite.angle = 0) });
    });
  }

  // ─── Board tool handlers (1.3 Scythe / 1.4 Seedpack / 1.5 Lockbox) ──────

  /** 1.3 Scythe: remove 6 random tiles with animation, credit resources, collapse + refill. */
  _applyToolClear() {
    const allTiles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] && !this.grid[r][c].selected) allTiles.push(this.grid[r][c]);
      }
    }
    // Pick up to 6 random tiles
    Phaser.Utils.Array.Shuffle(allTiles);
    const picks = allTiles.slice(0, 6);
    const gainMap = {};
    picks.forEach((tile, i) => {
      const key = tile.res.key;
      gainMap[key] = (gainMap[key] || 0) + 1;
      this.grid[tile.row][tile.col] = null;
      this.tweens.add({
        targets: tile.sprite,
        scaleX: 0, scaleY: 0,
        alpha: 0,
        rotation: (Math.random() - 0.5) * 0.6,
        duration: 200,
        delay: i * 20,
        ease: "Quad.In",
        onComplete: () => tile.destroy(),
      });
    });
    // Emit resource gains to React (like a mini chain collect, no turn cost)
    for (const [key, gained] of Object.entries(gainMap)) {
      const biome = this.biome();
      const res = biome.resources.find((r) => r.key === key);
      if (res) {
        this.events.emit("chain-collected", { key, gained, upgrades: 0, chainLength: gained, value: res.value, noTurn: true });
      }
    }
    this.time.delayedCall(240, () => this.collapseBoard());
  }

  /** 1.4 Seedpack: replace 5 random non-selected tiles with the biome's base resource. */
  _applyToolBasic() {
    const baseRes = this.biome().resources[0]; // hay / stone
    const allTiles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] && !this.grid[r][c].selected) allTiles.push(this.grid[r][c]);
      }
    }
    Phaser.Utils.Array.Shuffle(allTiles);
    const picks = allTiles.slice(0, 5);
    picks.forEach((tile) => {
      tile.setResource(baseRes);
      // Green sparkle burst: scale 0→1 with Back.Out ease
      tile.sprite.setScale(0);
      tile.sprite.setTint(0x88ff88);
      this.tweens.add({
        targets: tile.sprite,
        scale: this.tileSpriteScale,
        duration: 180,
        ease: "Back.Out",
        onComplete: () => tile.sprite.clearTint(),
      });
    });
  }

  /** 1.5 Lockbox: replace 3 random non-selected tiles with biome's rare resource. */
  _applyToolRare() {
    const biome = this.biome();
    const rareKey = biome.name === "Mine" ? "gem" : "berry";
    const rareRes = biome.resources.find((r) => r.key === rareKey) || biome.resources[biome.resources.length - 1];
    const allTiles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] && !this.grid[r][c].selected) allTiles.push(this.grid[r][c]);
      }
    }
    Phaser.Utils.Array.Shuffle(allTiles);
    const picks = allTiles.slice(0, 3);
    picks.forEach((tile) => {
      tile.setResource(rareRes);
      // Golden flash: scale 0 → 1.1 → 1.0
      tile.sprite.setScale(0);
      tile.sprite.setTint(0xffd248);
      this.tweens.add({
        targets: tile.sprite,
        scale: this.tileSpriteScale * 1.1,
        duration: 130,
        ease: "Back.Out",
        onComplete: () => {
          this.tweens.add({
            targets: tile.sprite,
            scale: this.tileSpriteScale,
            duration: 80,
            onComplete: () => tile.sprite.clearTint(),
          });
        },
      });
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

    const res0 = this.path.length ? this.path[0].res : null;
    const next = res0 ? this.nextResource(res0) : null;
    const effThresh = this.registry.get("effectiveThresholds") ?? UPGRADE_THRESHOLDS;
    const threshold = res0 ? (effThresh[res0.key] || 0) : 0;
    const prevGroups = this._prevStarGroups;
    let groupCount = 0;
    if (next && threshold > 0) {
      const off = 24 * this.tileScale;
      for (let i = threshold - 1; i < this.path.length; i += threshold) {
        const t = this.path[i];
        // Scale star by upgrade tier (1×, 2×, 3×)
        const tier = groupCount + 1; // 1-based
        const baseStarScale = (0.62 + tier * 0.12) * this.tileSpriteScale;
        const swayAmp = 10 + tier * 5;  // ±10° / ±15° / ±20°
        const swayDur = Math.max(400, 950 - (tier - 1) * 175); // 950 / 775 / 600ms
        const star = this.add.image(t.x + off, t.y - off, "spark").setScale(baseStarScale).setDepth(12);
        const preview = this.add.image(t.x + off, t.y + off * 0.85, `tile_${next.key}`).setScale(0.32 * this.tileSpriteScale).setDepth(12);
        // 3× tier: tint star orange-white
        if (tier >= 3) star.setTint(0xffb347);
        const swayStar = () => {
          if (!star.active) return;
          this.tweens.add({
            targets: star,
            angle: { from: swayAmp, to: -swayAmp },
            yoyo: true,
            repeat: -1,
            duration: swayDur,
            ease: "Sine.InOut",
          });
        };

        if (groupCount >= prevGroups) {
          // Pop-in + sway for new star
          star.setScale(0).setAngle(-20);
          this.tweens.add({ targets: star, scale: baseStarScale, angle: swayAmp, duration: 320, ease: "Back.Out" });
          this.time.delayedCall(320, swayStar);
          preview.setScale(0).setAlpha(0);
          this.tweens.add({ targets: preview, scale: 0.32 * this.tileSpriteScale, alpha: 1, duration: 260, ease: "Back.Out", delay: 110 });
          // 2× tier: glow halo
          if (tier >= 2) {
            const halo = this.add.graphics().setDepth(11);
            halo.lineStyle(3 * this.tileScale, 0xffd248, 0.55);
            halo.strokeCircle(t.x + off, t.y - off, 14 * this.tileScale);
            this.pathStars.push(halo);
          }
        } else {
          star.setAngle(swayAmp);
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
    const effThresholds = this.registry.get("effectiveThresholds") ?? UPGRADE_THRESHOLDS;
    const upgradeTotal = next ? upgradeCountForChain(this.path.length, res.key, effThresholds) : 0;
    const gained = resourceGainForChain(this.path.length);
    // Bonus yields: add per-resource bonus if this chain contained that resource
    const bonusYields = this.registry.get("bonusYields") ?? {};
    const bonusGains = {};
    if (bonusYields[res.key]) {
      bonusGains[res.key] = Math.round(bonusYields[res.key]);
    }
    const floatSuffix = upgradeTotal > 0 ? `  ★×${upgradeTotal}` : "";
    const bonusText = Object.entries(bonusGains).map(([k, n]) => `  +${n} ${k}★`).join("");
    this.floatText(`+${gained} ${res.label}${floatSuffix}${bonusText}`, this.path[this.path.length - 1].x, this.path[this.path.length - 1].y);

    // Chain-length juice — escalating screen shake and a radial wipe. Big chains
    // earn loud feedback; upgrades add an extra burst.
    this.shakeForChain(this.path.length);
    this.radialFlash(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, this.path.length);

    // Queue upgrade tiles to spawn at the endpoint after board collapse.
    // All upgrades land at the endpoint position (last tile in path).
    if (next && upgradeTotal > 0) {
      for (let u = 0; u < upgradeTotal; u++) {
        this.pendingUpgrades.push(next);
      }
      this.upgradeBurst(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y);
    }

    this.path.forEach((tile, i) => {
      this.grid[tile.row][tile.col] = null;
      this.tweens.add({ targets: tile.sprite, scale: 0, angle: Phaser.Math.Between(-25, 25), alpha: 0, duration: this._dur(180 + i * 15), onComplete: () => tile.destroy() });
    });

    // Emit to React — include bonus yield grants from workers
    const totalGained = gained + (bonusGains[res.key] ?? 0);
    this.events.emit("chain-collected", { key: res.key, gained: totalGained, upgrades: upgradeTotal, chainLength: this.path.length, value: res.value });

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
    // In landscape the badge sits above the board but boardY ≈ boardFrame so cy
    // goes negative and gets clipped. React renders it in the side panel instead.
    if (this.scale.width > this.scale.height) {
      this._emitChainUpdate();
      return;
    }
    const dpr = this.dpr;
    const cx = this.boardX + (COLS * this.tileSize) / 2;
    const cy = this.boardY - this.boardFrame - 22 * dpr;
    this.chainBadge = this.add.container(cx, cy).setDepth(40);
    const bg = rounded(this, -70 * dpr, -16 * dpr, 140 * dpr, 32 * dpr, 16 * dpr, 0x2b2218, 0.9, 0xffd248, 2 * dpr);
    this.chainBadgeText = this.add.text(0, 0, "", { fontFamily: "Arial", fontSize: `${14 * dpr}px`, color: "#ffd248", fontStyle: "bold" }).setOrigin(0.5);
    this.chainBadge.add([bg, this.chainBadgeText]);
    this._emitChainUpdate();
  }

  updateChainBadge() {
    const n = this.path.length;
    const gained = resourceGainForChain(n);
    const res = n ? this.path[0].res : null;
    const next = res ? this.nextResource(res) : null;
    const effThresh = this.registry.get("effectiveThresholds") ?? UPGRADE_THRESHOLDS;
    const k = next ? upgradeCountForChain(n, res.key, effThresh) : 0;
    if (this.chainBadge) {
      this.chainBadgeText.setText(k > 0 ? `chain × ${gained}   +${k}★` : `chain × ${gained}`);
    }
    this._emitChainUpdate();
  }

  hideChainBadge() {
    if (this.chainBadge) { this.chainBadge.destroy(); this.chainBadge = null; this.chainBadgeText = null; }
    this.events.emit("chain-update", null);
  }

  _emitChainUpdate() {
    const n = this.path.length;
    const gained = resourceGainForChain(n);
    const res = n ? this.path[0].res : null;
    const next = res ? this.nextResource(res) : null;
    const effThresh = this.registry.get("effectiveThresholds") ?? UPGRADE_THRESHOLDS;
    const k = next ? upgradeCountForChain(n, res.key, effThresh) : 0;
    this.events.emit("chain-update", { count: gained, upgrades: k });
  }

  // ─── Juice (chain-length feedback) ────────────────────────────────────────

  shakeForChain(len) {
    if (len < 3) return;
    // 3 → barely; 6 → noticeable; 10+ → bone-rattling.
    const intensity = Math.min(0.018, 0.0025 + (len - 3) * 0.0028);
    const duration = Math.min(520, 160 + (len - 3) * 50);
    this._shake(duration, intensity);
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

  floatText(msg, x, y) {
    const dpr = this.dpr;
    const t = this.add.text(x, y, msg, { fontFamily: "Arial", fontSize: `${22 * dpr}px`, color: cssColor(FLOAT_TEXT_COLOR), fontStyle: "bold", stroke: "#000", strokeThickness: 5 * dpr }).setOrigin(0.5).setDepth(20).setScale(0.7);
    this.tweens.add({ targets: t, scale: 1, duration: 120, ease: "Back.Out" });
    this.tweens.add({ targets: t, y: y - 58 * dpr, alpha: 0, delay: 120, duration: 780, onComplete: () => t.destroy() });
  }

  // Called every frame by Phaser. Drives the per-tile ambient sway.
  update(time) {
    for (let r = 0; r < ROWS; r++) {
      const row = this.grid[r];
      if (!row) continue;
      for (let c = 0; c < COLS; c++) {
        const t = row[c];
        if (t) t.ambient(time);
      }
    }
  }
}
