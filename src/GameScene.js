import Phaser from "phaser";
import { TILE, COLS, ROWS, UPGRADE_THRESHOLDS, SEASONS, BIOMES, CAPPED_RESOURCES, SCENE_EVENTS } from "./constants.js";
import { upgradeCountForChain, resourceGainForChain, rollResourceWithWeather } from "./utils.js";
import { computeWorkerEffects } from "./features/apprentices/aggregate.js";
import { applyFrostCollapseDuration } from "./features/weather/effects.js";
import { CATEGORY_OF } from "./features/tileCollection/data.js";
import {
  expandZoneCategories,
  nextResourceForZone,
  pickByZoneSeasonDrops,
  seasonIndexInSession,
  seasonNameInSession,
  ZONES,
} from "./features/zones/data.js";
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

    // Touch-friendly drag fallback: pointerover misses tiles when a finger
    // moves quickly across the board (touch tracking has lower temporal
    // resolution than mouse). Hit-test against the grid on every pointermove
    // while dragging so fast finger swipes still extend the chain.
    this.input.on("pointermove", (pointer) => {
      if (!this.dragging || !this.path.length) return;
      const ts = this.tileSize;
      if (!ts) return;
      const col = Math.floor((pointer.worldX - this.boardX) / ts);
      const row = Math.floor((pointer.worldY - this.boardY) / ts);
      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
      const tile = this.grid?.[row]?.[col];
      if (!tile) return;
      const last = this.path[this.path.length - 1];
      if (tile === last) return;
      this.tryAddToPath(tile);
    });

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

    // Registry and scale listeners — track each so they can be torn down on
    // shutdown. Otherwise scene recreation (HMR, tests, biome reload) leaks
    // handlers that fire against a destroyed scene.
    const registryListeners = [];
    const onRegistry = (event, fn) => {
      this.registry.events.on(event, fn);
      registryListeners.push([event, fn]);
    };
    const onResize = () => this.handleResize();
    this.scale.on("resize", onResize);

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
      for (const [event, fn] of registryListeners) this.registry.events.off(event, fn);
      this.scale.off("resize", onResize);
    });

    // Apply state.grid → Phaser when Redux pushes a change back (hazard engines may mutate)
    onRegistry("changedata-grid", (_p, value) => {
      if (this._suppressNextGridApply) return;
      this._applyGridFromState(value);
    });

    onRegistry("changedata-biomeKey", (_p, value, prev) => {
      if (value !== prev) this.handleBiomeChange();
    });
    onRegistry("changedata-turnsUsed", () => this.refreshSeasonTint());
    onRegistry("changedata-uiLocked", (_p, value) => {
      this.locked = !!value;
    });
    onRegistry("changedata-toolPending", (_p, value) => {
      if (!value) return;
      if (this.dragging) {
        this._deferredTool = value;
        return;
      }
      if (value === "clear")      this._applyToolClear();
      if (value === "basic")      this._applyToolBasic();
      if (value === "rare")       this._applyToolRare();
      if (value === "shuffle")    this.shuffleBoard();
      if (value === "magic_wand") {
        // Arm the wand — next tile tap sweeps all tiles of that type
        this._magicWandPending = true;
        // Do NOT clear toolPending yet; it clears after the tap in _applyMagicWand
        return;
      }
      if (value === "rake") {
        this._rakePending = true;
        return;
      }
      if (value === "axe") {
        this._axePending = true;
        return;
      }
      if (value === "bomb") {
        this._bombPending = true;
        return;
      }
      if (value === "rune_wildcard") {
        this._runeWildcardPending = true;
        return;
      }
      // Clear the pending flag once handled
      this.time.delayedCall(50, () => this.registry.set("toolPending", null));
    });
    // Sync worker effects on init and whenever state.townsfolk changes
    this._syncWorkerEffects();
    onRegistry("changedata-workers", () => this._syncWorkerEffects());
    // Re-render tile textures when the color-blind palette changes
    onRegistry("changedata-palette", (_p, value) => {
      regenerateTextures(this, value ?? "default");
    });
    // Swap on-board tiles to match the newly active tile type in their category,
    // so picking a new tile type in the panel immediately rerenders the puzzle.
    onRegistry("changedata-tileCollectionActive", (_p, value, prev) => {
      this.handleActiveTileChange(value, prev);
    });
  }

  /**
   * When the active tile type for any category changes, re-key ALL on-board tiles
   * that belong to a changed category to the new active tile type. Tiles currently
   * selected in a drag chain are left alone to avoid disrupting input.
   */
  handleActiveTileChange(next, prev) {
    if (!next) return;
    const prevMap = prev ?? {};
    const changed = [];
    for (const cat of Object.keys(next)) {
      if (prevMap[cat] !== next[cat]) changed.push(cat);
    }
    if (changed.length === 0) return;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.grid[r]?.[c];
        if (!tile || tile.selected) continue;
        const tileCat = CATEGORY_OF[tile.res.key];
        if (!tileCat || !changed.includes(tileCat)) continue;
        const newKey = next[tileCat];
        if (!newKey) continue;
        if (tile.res.key === newKey) continue; // already the right type
        const newRes = this.resourceByKey(newKey);
        if (!newRes) continue;
        tile.setResource(newRes);
        this.tweens.add({ targets: tile.sprite, angle: 360, duration: this._dur(280), onComplete: () => (tile.sprite.angle = 0) });
      }
    }
  }

  // ─── Worker effects sync ─────────────────────────────────────────────────

  _syncWorkerEffects() {
    const workers = this.registry.get("townsfolk") ?? { hired: {}, debt: 0, pool: 0 };
    const agg = computeWorkerEffects({ workers });
    const eff = {};
    for (const [k, v] of Object.entries(UPGRADE_THRESHOLDS)) {
      eff[k] = Math.max(1, v - (agg.thresholdReduce[k] ?? 0));
    }
    // Merge legacy poolWeight (Phase 4) + Phase-9 effectivePoolWeights
    const mergedPoolWeights = { ...agg.poolWeight };
    for (const [k, v] of Object.entries(agg.effectivePoolWeights ?? {})) {
      mergedPoolWeights[k] = (mergedPoolWeights[k] ?? 0) + v;
    }
    this.registry.set("effectiveThresholds",  eff);
    this.registry.set("effectivePoolWeights", mergedPoolWeights);
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

  /** Returns the effective minimum chain length given the active boss only.
   *  Phase 7 — winter minimum-chain check was removed with the calendar season. */
  _effectiveMinChain() {
    const bossMin = this.registry.get("boss")?.minChain ?? 0;
    return Math.max(3, bossMin);
  }

  /** Phase 7 — autumn x2 upgrade multiplier was removed with the calendar
   *  season. Kept as a no-op so legacy callers don't break in this PR; future
   *  cleanup can inline the constant 1. */
  _autumnMult() {
    return 1;
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
    // Phase 7.1 — visual season rotates within the session. Pick the index
    // from turnsUsed/sessionMaxTurns so the board palette cycles
    // Spring -> Winter as the player burns turns.
    const turnsUsed = this.registry.get("turnsUsed") ?? 0;
    const sessionMaxTurns = this.registry.get("sessionMaxTurns") ?? null;
    if (!sessionMaxTurns || sessionMaxTurns < 1) return SEASONS[0];
    const idx = seasonIndexInSession(turnsUsed, sessionMaxTurns);
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
    tag(rounded(this, this.boardX - frame, this.boardY - frame, boardW + frame * 2, boardH + frame * 2, 16 * dpr, b.mine_dirt, 1).setDepth(-1));
  }

  refreshSeasonTint() {
    this.children.list.filter((o) => o.__layer === "bg").forEach((o) => o.destroy());
    this.drawBackground();
  }

  handleBiomeChange() {
    this.refreshSeasonTint();
    const biomeRestored = this.registry.get("biomeRestored");
    if (biomeRestored) {
      // savedField was restored into state.grid — sync those keys onto the live tiles
      const savedGrid = this.registry.get("grid");
      this.grid.flat().forEach((t) => {
        if (!t) return;
        const cell = savedGrid?.[t.row]?.[t.col];
        if (cell?.key) {
          const newRes = this.resourceByKey(cell.key);
          if (newRes) t.setResource(newRes);
        }
      });
      this._syncGridToState();
      return;
    }
    // No saved field — randomize tiles for the new biome
    this.grid.flat().forEach((t) => {
      if (!t) return;
      t.setResource(this.randomResource());
      this.tweens.add({ targets: t.sprite, angle: 360, duration: this._dur(280), onComplete: () => (t.sprite.angle = 0) });
    });
    this._syncGridToState();
  }

  // ─── Resources ────────────────────────────────────────────────────────────

  nextResource(res) {
    const resources = this.biome().resources;
    // Phase 3 — let the active zone's upgradeMap redirect chain upgrades to a
    // different category (e.g. Zone 1 grass -> birds, vegetables -> fruits).
    // The helper returns null when the zone has no override or the target is
    // the special "gold" sentinel; in those cases we fall through to the
    // resource's native `.next` chain.
    const zoneId = this.registry.get("activeZone") ?? null;
    if (zoneId) {
      const tileCollectionActive = this.registry.get("tileCollectionActive") ?? null;
      const redirected = nextResourceForZone({
        currentRes: res,
        zoneId,
        biomeResources: resources,
        tileCollectionActive,
        categoryOf: CATEGORY_OF,
      });
      if (redirected) return redirected;
    }
    const nextKey = resources.find((r) => r.key === res.key)?.next;
    return nextKey ? resources.find((r) => r.key === nextKey) : null;
  }

  /**
   * Returns the biome pool with each slot substituted by the player's currently
   * active tile type for that category. If a category has no active tile type
   * selected (null), that slot is dropped from the pool — only tiles the player
   * has explicitly chosen (or defaulted) will spawn.
   */
  activePool() {
    const base = this.biome().pool;
    const active = this.registry.get("tileCollectionActive") ?? null;
    if (!active) return [...base];
    const out = [];
    for (const baseKey of base) {
      const cat = CATEGORY_OF[baseKey];
      if (!cat) { out.push(baseKey); continue; }
      const a = active[cat];
      if (a === null || a === undefined) continue; // category disabled — drop slot
      out.push(a);
    }
    // Safety: never return an empty pool (fallback to base so the board can fill)
    return out.length > 0 ? out : [...base];
  }

  resourceByKey(key) {
    return this.biome().resources.find((r) => r.key === key);
  }

  randomResource() {
    const weather = this.registry.get("weather");
    const weatherKey = weather?.key ?? weather ?? null;
    const pool = this.activePool();
    if (pool.length === 0) return this.biome().resources[0];
    const key = rollResourceWithWeather(pool, weatherKey);
    return this.resourceByKey(key) ?? this.biome().resources[0];
  }

  _randomFromPool(pool, weatherKey) {
    const safePool = pool.length ? pool : this.biome().pool;
    const key = rollResourceWithWeather(safePool, weatherKey);
    return this.resourceByKey(key) ?? this.biome().resources[0];
  }

  // Phase 3b — sample a tile from the active zone's per-(zone, season) drop
  // table. Returns null when the zone has no entry, the season's table is
  // empty, the biome isn't farm, or the picker can't resolve any matching
  // resource. Callers must fall through to the existing weighted pool when
  // this returns null.
  _pickFromZoneSeasonDrops() {
    if (this.biomeKey() !== "farm") return null;
    const zoneId = this.registry.get("activeZone") ?? null;
    if (!zoneId || !ZONES[zoneId]) return null;
    const turnsUsed = this.registry.get("turnsUsed") ?? 0;
    // Fall back to the existing seasonsCycled-based season name when no
    // session is active (e.g. tests that don't dispatch FARM/ENTER).
    const sessionMax = ZONES[zoneId].startingTurns ?? 16;
    const seasonName = seasonNameInSession(turnsUsed, sessionMax);
    return pickByZoneSeasonDrops({
      zoneId,
      seasonName,
      biomeResources: this.biome().resources,
      tileCollectionActive: this.registry.get("tileCollectionActive") ?? null,
      categoryOf: CATEGORY_OF,
    });
  }

  // ─── Grid sync helpers ────────────────────────────────────────────────────

  _syncGridToState() {
    const serialized = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const tile = this.grid[r]?.[c];
        if (tile) {
          const cell = { key: tile.res.key };
          if (tile.frozen) cell.frozen = true;
          if (tile.rubble) cell.rubble = true;
          row.push(cell);
        } else {
          row.push(null);
        }
      }
      serialized.push(row);
    }
    this._suppressNextGridApply = true;
    this.events.emit(SCENE_EVENTS.GRID_SYNC, { grid: serialized });
    this.time.delayedCall(0, () => { this._suppressNextGridApply = false; });
  }

  _applyGridFromState(stateGrid) {
    if (!stateGrid) return;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.grid[r]?.[c];
        const cell = stateGrid[r]?.[c];
        if (!tile || !cell) continue;
        if (tile.res.key !== cell.key) {
          const newRes = this.resourceByKey(cell.key);
          if (newRes) tile.setResource(newRes);
        }
        tile.frozen = !!cell.frozen;
        tile.rubble = !!cell.rubble;
      }
    }
  }

  // ─── Board fill / collapse ────────────────────────────────────────────────

  fillBoard(initial = false) {
    const ts = this.tileSize;
    const weather = this.registry.get("weather");
    const weatherKey = weather?.key ?? weather ?? null;
    // Frost doubles collapse/fill tween duration (visual only). Use helper for consistency.
    const baseFillMs = 210;
    const frostFillMs = !initial ? applyFrostCollapseDuration(baseFillMs, weather) : baseFillMs;
    const frostBonus = frostFillMs - baseFillMs;
    // Build worker-boosted, tile-collection-substituted pool. Worker boosts are gated
    // by the active tile type: a boost for key K only applies when K is the active
    // tile type in its category (matches getActivePool semantics).
    const tileCollectionActive = this.registry.get("tileCollectionActive") ?? null;
    let workerPool = this.activePool();
    const poolWeights = this.registry.get("effectivePoolWeights") ?? {};
    for (const [k, n] of Object.entries(poolWeights)) {
      const cat = CATEGORY_OF[k];
      if (cat && tileCollectionActive && tileCollectionActive[cat] !== k) continue;
      for (let i = 0; i < Math.round(n); i++) workerPool.push(k);
    }
    // Phase 2 — restrict the spawn pool to the categories the player picked
    // in the Start Farming modal. Empty/missing list = no filter (legacy
    // entry path through SWITCH_BIOME / cartography). Mine and fish biomes
    // ignore this filter; it only applies on the farm board.
    const sessionSelectedTiles = this.registry.get("sessionSelectedTiles") ?? [];
    if (this.biomeKey() === "farm" && sessionSelectedTiles.length > 0) {
      const allowedCats = expandZoneCategories(sessionSelectedTiles);
      const filtered = workerPool.filter((k) => {
        const cat = CATEGORY_OF[k];
        return cat ? allowedCats.has(cat) : true;
      });
      // Guard against an over-restrictive selection that would leave no
      // tiles to spawn — fall back to the unfiltered pool in that case.
      if (filtered.length > 0) workerPool = filtered;
    }
    // Boss spawnBias: Quagmire pushes extra log/hay tiles into pool.
    // For each resource key, the bias factor adds (bias-1)*baseCount extra copies.
    const boss = this.registry.get("boss");
    const spawnBias = boss?.spawnBias ?? null;
    if (spawnBias) {
      const baseCounts = {};
      for (const k of workerPool) baseCounts[k] = (baseCounts[k] ?? 0) + 1;
      for (const [k, factor] of Object.entries(spawnBias)) {
        const extra = Math.round((baseCounts[k] ?? 0) * (factor - 1));
        for (let i = 0; i < extra; i++) workerPool.push(k);
      }
    }
    // Fertilizer bias: double seedling-tier resource copies in pool
    // Also activated by magic_fertilizer charges (one charge consumed per fill)
    const fertilizerActive = (this.registry.get("fertilizerActive") ?? false) ||
                             ((this.registry.get("magicFertilizerCharges") ?? 0) > 0);
    if (fertilizerActive) {
      const seedlings = ["seedling", "grass_hay", "grain_wheat", "grain"];
      const fBase = {};
      for (const k of workerPool) fBase[k] = (fBase[k] ?? 0) + 1;
      for (const k of seedlings) {
        const extra = fBase[k] ?? 0;
        for (let i = 0; i < extra; i++) workerPool.push(k);
      }
      this.events.emit(SCENE_EVENTS.FERTILIZER_CONSUMED);
    }
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = this.grid[r] || [];
      for (let c = 0; c < COLS; c++) {
        if (!this.grid[r][c]) {
          const x = this.boardX + c * ts + ts / 2;
          const y = this.boardY + r * ts + ts / 2;
          let res;
          if (!initial && this.pendingUpgrades.length) {
            const idx = this.pendingUpgrades.findIndex(u => u.col === c);
            if (idx !== -1) {
              res = this.pendingUpgrades.splice(idx, 1)[0].res;
            }
          }
          // Phase 3b — try the per-(zone, in-session season) drop table
          // first. Only active on the farm board, only when the active zone
          // has data for the current season; otherwise fall through to the
          // existing weighted pool sampler.
          if (!res) res = this._pickFromZoneSeasonDrops();
          if (!res) res = this._randomFromPool(workerPool, weatherKey);
          const tile = new TileObj(this, x, initial ? y - 500 - Phaser.Math.Between(0, 100) : y - 140, c, r, res);
          tile.sprite.setScale(this.tileSpriteScale);
          this.grid[r][c] = tile;
          this.tweens.add({ targets: tile.sprite, y, duration: this._dur((initial ? 450 + r * 28 : 210) + frostBonus), ease: "Back.Out" });
        }
      }
    }
    // Fire hazard overlay: replace grid cells at fire positions with fire tiles
    const hazardFire = this.registry.get("hazardFire");
    if (hazardFire?.cells?.length) {
      for (const { row: fr, col: fc } of hazardFire.cells) {
        if (fr < 0 || fr >= ROWS || fc < 0 || fc >= COLS) continue;
        const existing = this.grid[fr][fc];
        if (existing) { this.tweens.killTweensOf(existing.sprite); existing.destroy(); }
        const fx = this.boardX + fc * ts + ts / 2;
        const fy = this.boardY + fr * ts + ts / 2;
        const fireRes = { key: "fire", value: 0, sway: null, label: "fire", next: null };
        const fireTile = new TileObj(this, fx, initial ? fy - 500 : fy - 140, fc, fr, fireRes);
        fireTile.sprite.setScale(this.tileSpriteScale);
        this.grid[fr][fc] = fireTile;
        this.tweens.add({ targets: fireTile.sprite, y: fy, duration: this._dur((initial ? 450 + fr * 28 : 210) + frostBonus), ease: "Back.Out" });
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
        this._syncGridToState();
      });
    } else {
      this._syncGridToState();
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

  shuffleBoard(attempt = 0) {
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
          if (!hasValidChain(this.grid)) {
            if (attempt >= 2) {
              this._forceGuaranteedChain();
              this._syncGridToState();
            } else {
              this.shuffleBoard(attempt + 1);
            }
          }
        });
      },
    });
  }

  _forceGuaranteedChain() {
    const pool = this.activePool();
    const key = pool[0] ?? this.biome().pool[0];
    const res = this.resourceByKey(key) ?? this.biome().resources[0];
    // Assign the same resource to the first 3 tiles in row-major order
    let count = 0;
    for (let r = 0; r < ROWS && count < 3; r++) {
      for (let c = 0; c < COLS && count < 3; c++) {
        const t = this.grid[r][c];
        if (!t) continue;
        t.setResource(res);
        count += 1;
      }
    }
  }

  _performShuffleSwap() {
    const tiles = this.grid.flat().filter(Boolean);
    const resources = tiles.map((t) => t.res);
    Phaser.Utils.Array.Shuffle(resources);
    tiles.forEach((t, i) => {
      t.setResource(resources[i]);
      this.tweens.add({ targets: t.sprite, angle: 360, duration: this._dur(300), onComplete: () => (t.sprite.angle = 0) });
    });
    this._syncGridToState();
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
        this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, { key, gained, upgrades: 0, chainLength: gained, value: res.value, noTurn: true });
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
    const rareKey = biome.name === "Mine" ? "mine_gem" : "berry";
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
    this.time.delayedCall(this._dur(220), () => {
      if (!hasValidChain(this.grid)) {
        this.floatText("No moves — reshuffled!", this.boardX + (COLS * this.tileSize) / 2, this.boardY - 24 * this.dpr);
        this.shuffleBoard();
      }
    });
  }

  /** Magic Wand: sweep all tiles of the chosen resource type and collect them (no turn cost). */
  _applyMagicWand(targetRes) {
    const swept = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.grid[r][c];
        if (tile && tile.res.key === targetRes.key) {
          swept.push(tile);
          this.grid[r][c] = null;
        }
      }
    }
    if (!swept.length) return;
    // Animate out with a staggered sparkle burst
    swept.forEach((tile, i) => {
      tile.sprite.setTint(0xa070ff);
      this.tweens.add({
        targets: tile.sprite,
        scale: 0,
        alpha: 0,
        angle: Phaser.Math.Between(-30, 30),
        duration: this._dur(200),
        delay: i * 15,
        ease: "Quad.In",
        onComplete: () => tile.destroy(),
      });
    });
    // Emit collection event (noTurn: true so no turn is consumed)
    this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, {
      key: targetRes.key,
      gained: swept.length,
      upgrades: 0,
      chainLength: swept.length,
      value: targetRes.value,
      noTurn: true,
    });
    this.time.delayedCall(this._dur(240), () => this.collapseBoard());
  }

  /** Rake: sweep the 4-connected component (same key) containing the tapped tile. */
  _applyToolRake(tile) {
    const targetKey = tile.res.key;
    // BFS to find all 4-connected tiles with the same key
    const swept = [];
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    const queue = [{ r: tile.row, c: tile.col }];
    visited[tile.row][tile.col] = true;
    const DIRS4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    while (queue.length) {
      const { r, c } = queue.shift();
      const t = this.grid[r]?.[c];
      if (!t || t.res.key !== targetKey) continue;
      swept.push(t);
      this.grid[r][c] = null;
      for (const [dr, dc] of DIRS4) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc]) {
          visited[nr][nc] = true;
          queue.push({ r: nr, c: nc });
        }
      }
    }
    if (!swept.length) return;
    swept.forEach((t, i) => {
      t.sprite.setTint(0x88ff88);
      this.tweens.add({
        targets: t.sprite, scale: 0, alpha: 0,
        angle: Phaser.Math.Between(-20, 20),
        duration: this._dur(190), delay: i * 12, ease: "Quad.In",
        onComplete: () => t.destroy(),
      });
    });
    const res = this.biome().resources.find((r) => r.key === targetKey);
    this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, {
      key: targetKey, gained: swept.length, upgrades: 0,
      chainLength: swept.length, value: res?.value ?? 1, noTurn: true,
    });
    this.time.delayedCall(this._dur(220), () => this.collapseBoard());
  }

  /** Axe: clear an entire row containing the tapped tile. */
  _applyToolAxe(tile) {
    const targetRow = tile.row;
    const swept = [];
    for (let c = 0; c < COLS; c++) {
      const t = this.grid[targetRow]?.[c];
      if (t) { swept.push(t); this.grid[targetRow][c] = null; }
    }
    if (!swept.length) return;
    const gainMap = {};
    swept.forEach((t, i) => {
      gainMap[t.res.key] = (gainMap[t.res.key] ?? 0) + 1;
      t.sprite.setTint(0xff9900);
      this.tweens.add({
        targets: t.sprite, scale: 0, alpha: 0,
        angle: Phaser.Math.Between(-25, 25),
        duration: this._dur(190), delay: i * 10, ease: "Quad.In",
        onComplete: () => t.destroy(),
      });
    });
    for (const [key, gained] of Object.entries(gainMap)) {
      const res = this.biome().resources.find((r) => r.key === key);
      this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, {
        key, gained, upgrades: 0, chainLength: gained, value: res?.value ?? 1, noTurn: true,
      });
    }
    this.time.delayedCall(this._dur(220), () => this.collapseBoard());
  }

  /** Bomb: clear a 3×3 area around the tapped tile. */
  _applyToolBomb(tile) {
    const swept = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = tile.row + dr, c = tile.col + dc;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const t = this.grid[r]?.[c];
        if (t) { swept.push(t); this.grid[r][c] = null; }
      }
    }
    if (!swept.length) return;
    const gainMap = {};
    swept.forEach((t, i) => {
      gainMap[t.res.key] = (gainMap[t.res.key] ?? 0) + 1;
      t.sprite.setTint(0xff4444);
      this.tweens.add({
        targets: t.sprite, scale: 0, alpha: 0,
        angle: Phaser.Math.Between(-40, 40),
        duration: this._dur(180), delay: i * 8, ease: "Quad.In",
        onComplete: () => t.destroy(),
      });
    });
    for (const [key, gained] of Object.entries(gainMap)) {
      const res = this.biome().resources.find((r) => r.key === key);
      this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, {
        key, gained, upgrades: 0, chainLength: gained, value: res?.value ?? 1, noTurn: true,
      });
    }
    this.time.delayedCall(this._dur(220), () => this.collapseBoard());
  }

  /** Rune Wildcard: sweep entire board of the tapped tile's key (golden tint). */
  _applyRuneWildcard(tile) {
    const targetRes = tile.res;
    const swept = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.grid[r][c];
        if (t && t.res.key === targetRes.key) {
          swept.push(t);
          this.grid[r][c] = null;
        }
      }
    }
    if (!swept.length) return;
    swept.forEach((t, i) => {
      t.sprite.setTint(0xffd248);
      this.tweens.add({
        targets: t.sprite, scale: 0, alpha: 0,
        angle: Phaser.Math.Between(-30, 30),
        duration: this._dur(200), delay: i * 15, ease: "Quad.In",
        onComplete: () => t.destroy(),
      });
    });
    this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, {
      key: targetRes.key, gained: swept.length, upgrades: 0,
      chainLength: swept.length, value: targetRes.value, noTurn: true,
    });
    this.time.delayedCall(this._dur(240), () => this.collapseBoard());
  }

  // ─── Drag chain ───────────────────────────────────────────────────────────

  startPath(tile) {
    if (this.locked) return;
    // Magic Wand intercept: sweep all tiles of the tapped resource type
    if (this._magicWandPending) {
      this._magicWandPending = false;
      this._applyMagicWand(tile.res);
      this.time.delayedCall(50, () => this.registry.set("toolPending", null));
      return;
    }
    if (this._rakePending) {
      this._rakePending = false;
      this._applyToolRake(tile);
      this.time.delayedCall(50, () => this.registry.set("toolPending", null));
      return;
    }
    if (this._axePending) {
      this._axePending = false;
      this._applyToolAxe(tile);
      this.time.delayedCall(50, () => this.registry.set("toolPending", null));
      return;
    }
    if (this._bombPending) {
      this._bombPending = false;
      this._applyToolBomb(tile);
      this.time.delayedCall(50, () => this.registry.set("toolPending", null));
      return;
    }
    if (this._runeWildcardPending) {
      this._runeWildcardPending = false;
      this._applyRuneWildcard(tile);
      this.time.delayedCall(50, () => this.registry.set("toolPending", null));
      return;
    }
    this.dragging = true;
    this.clearPath(false);
    this.addToPath(tile);
    this.dimUnselectableTiles(tile.res.key);
    this.showChainBadge();
    this.showChainStatus();
    this.updateChainBadge();
    // Subtle haptic tick on drag-start, gated by user setting.
    if (this.registry.get("hapticsOn") && navigator.vibrate) {
      try { navigator.vibrate(10); } catch { /* unsupported */ }
    }
  }

  tryAddToPath(tile) {
    if (!this.dragging || !this.path.length) return;
    if (tile.frozen || tile.rubble) return;
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

    // V.1 — Choose path colors based on whether chain meets the effective minimum length
    const effectiveMinChain = this._effectiveMinChain();
    const pathValid = this.path.length === 0 || this.path.length >= effectiveMinChain;
    const lineColor = pathValid ? 0xff6d00 : 0x9a4630;
    const haloColor = pathValid ? 0xffd248 : 0xc06b3e;
    const nodeOuterColor = pathValid ? 0xffd248 : 0xc06b3e;
    const nodeInnerColor = pathValid ? 0xff6d00 : 0x9a4630;

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
            this._drawSegment(g, ax, ay, mx, my, lineColor, haloColor);
          },
          onComplete: () => {
            g.clear(); this._drawSegment(g, ax, ay, bx, by, lineColor, haloColor);
            this.tweens.add({ targets: g, alpha: 0.78, yoyo: true, repeat: -1, duration: 680, ease: "Sine.InOut" });
          },
        });
      } else {
        g.clear();
        this._drawSegment(g, a.x, a.y, b.x, b.y, lineColor, haloColor);
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
          ring.lineStyle(2.5 * this.tileScale, haloColor, ro.a);
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
      this.pathNodeG.fillStyle(nodeOuterColor, 0.55);
      this.pathNodeG.fillCircle(t.x, t.y, nr * 1.6);
      this.pathNodeG.fillStyle(nodeInnerColor, 1);
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

  _drawSegment(g, ax, ay, bx, by, lineColor = 0xff6d00, haloColor = 0xffd248) {
    g.lineStyle(22 * this.tileScale, haloColor, 0.22);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
    g.lineStyle(9 * this.tileScale, lineColor, 1);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
    g.lineStyle(3 * this.tileScale, 0xfff4c2, 0.85);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
  }

  endPath() {
    if (!this.dragging) return;
    this.dragging = false;
    this.hideChainBadge();
    this.clearDimming();
    const minChain = this._effectiveMinChain();
    if (this.path.length >= minChain) this.collectPath();
    else this.clearPath(true);
    if (this._deferredTool) {
      const tool = this._deferredTool;
      this._deferredTool = null;
      this.registry.set("toolPending", null);
      this.time.delayedCall(60, () => this.registry.set("toolPending", tool));
    }
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
    // V.2 — rawUpgrades goes to React (state.js multiplies by autumnMult itself);
    //        displayedUpgrades is shown in float text, badge, and star count.
    const rawUpgrades = next ? upgradeCountForChain(this.path.length, res.key, effThresholds) : 0;
    const displayedUpgrades = rawUpgrades * this._autumnMult();
    const gained = resourceGainForChain(this.path.length);
    // Bonus yields: add per-resource bonus if this chain contained that resource
    const bonusYields = this.registry.get("bonusYields") ?? {};
    const bonusGains = {};
    if (bonusYields[res.key]) {
      bonusGains[res.key] = Math.round(bonusYields[res.key]);
    }
    // V.3 — Clamp the displayed gain to the inventory cap so float text matches what the player actually receives
    const cap = this.registry.get("inventoryCap") ?? 200;
    const inv = this.registry.get("inventory") ?? {};
    const isCapped = CAPPED_RESOURCES.includes(res.key);
    const currentAmt = inv[res.key] ?? 0;
    const wouldGain = gained + (bonusGains[res.key] ?? 0);
    const actualGain = isCapped ? Math.max(0, Math.min(cap - currentAmt, wouldGain)) : wouldGain;
    const overCap = wouldGain - actualGain > 0;

    const floatSuffix = displayedUpgrades > 0 ? `  ★×${displayedUpgrades}` : "";
    const bonusText = Object.entries(bonusGains).filter(([k]) => k !== res.key).map(([k, n]) => `  +${n} ${k}★`).join("");
    this.floatText(`+${actualGain} ${res.label}${overCap ? " ⓘ" : ""}${floatSuffix}${bonusText}`, this.path[this.path.length - 1].x, this.path[this.path.length - 1].y);

    // Chain-length juice — escalating screen shake and a radial wipe. Big chains
    // earn loud feedback; upgrades add an extra burst.
    this.shakeForChain(this.path.length);
    this.radialFlash(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, this.path.length);

    // Queue upgrade tiles to spawn at the endpoint after board collapse.
    // V.2 — queue displayedUpgrades tiles so the player sees the full autumn-boosted count drop.
    if (next && displayedUpgrades > 0) {
      const endpointTile = this.path[this.path.length - 1];
      for (let u = 0; u < displayedUpgrades; u++) {
        this.pendingUpgrades.push({ res: next, col: endpointTile.col, row: endpointTile.row });
      }
      this.upgradeBurst(endpointTile.x, endpointTile.y);
    }

    this.path.forEach((tile, i) => {
      this.grid[tile.row][tile.col] = null;
      this.tweens.add({ targets: tile.sprite, scale: 0, angle: Phaser.Math.Between(-25, 25), alpha: 0, duration: this._dur(180 + i * 15), onComplete: () => tile.destroy() });
    });

    // Emit to React — use raw upgrade count (state.js applies autumnMult itself); gained is full amount (state.js caps it).
    const totalGained = gained + (bonusGains[res.key] ?? 0);
    // Include tile positions so the reducer can extinguish fire/hazard cells
    const chainTiles = this.path.map(t => ({ key: t.res.key, row: t.row, col: t.col }));
    this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, { key: res.key, gained: totalGained, upgrades: rawUpgrades, chainLength: this.path.length, value: res.value, chain: chainTiles });

    this.pathLines.forEach((l) => l.destroy());
    this.pathStars.forEach((s) => s.destroy());
    if (this.pathNodeG) { this.pathNodeG.destroy(); this.pathNodeG = null; }
    this.pathLines = [];
    this.pathStars = [];
    this.path = [];
    this._prevPathLen = 0;
    this._prevStarGroups = 0;
    this.time.delayedCall(300, () => this.collapseBoard());
    this.time.delayedCall(310, () => this._syncGridToState());
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
    // V.2 — Display autumn-multiplied upgrade count in the badge
    const k = next ? upgradeCountForChain(n, res.key, effThresh) * this._autumnMult() : 0;
    if (this.chainBadge) {
      this.chainBadgeText.setText(k > 0 ? `chain × ${gained}   +${k}★` : `chain × ${gained}`);
    }
    this.updateChainStatus();
    this._emitChainUpdate();
  }

  hideChainBadge() {
    if (this.chainBadge) { this.chainBadge.destroy(); this.chainBadge = null; this.chainBadgeText = null; }
    this.hideChainStatus();
    this.events.emit(SCENE_EVENTS.CHAIN_UPDATE, null);
  }

  // ─── Chain progress panel (banked + chain toward 1 inventory resource) ──
  //
  // Sits above the board while dragging. The meter is intentionally distinct
  // from the chain-tier upgrade preview (the floating stars on the chain that
  // indicate when the next-tier tile spawns):
  //
  //   • The meter tracks the player's *resource accumulation* — banked tiles
  //     in inventory plus the tiles being chained — toward the cumulative
  //     count needed to produce one terminal item (e.g. raw hay → bread).
  //   • The chain stars handle the per-tier tile that lands on the board
  //     every Nth selection, which is a separate concept.
  //
  // The terminal item is found by walking `.next` to the end of the chain;
  // the threshold is the product of per-tier thresholds along that path.

  /** Walks `res.next` to the terminal product, multiplying per-tier thresholds. */
  _terminalProductInfo(res) {
    const effThresh = this.registry.get("effectiveThresholds") ?? UPGRADE_THRESHOLDS;
    let cur = res;
    let cumulative = 1;
    const visited = new Set();
    while (cur?.next && !visited.has(cur.key)) {
      visited.add(cur.key);
      const T = effThresh[cur.key] ?? UPGRADE_THRESHOLDS[cur.key] ?? 0;
      if (T <= 0) return null;
      cumulative *= T;
      const nextRes = this.resourceByKey(cur.next);
      if (!nextRes) return null;
      cur = nextRes;
    }
    if (cur === res) return null;
    return { terminal: cur, threshold: cumulative };
  }

  showChainStatus() {
    if (this.chainStatus) return;
    const dpr = this.dpr;
    const w = 220 * dpr;
    const h = 60 * dpr;
    const cx = this.boardX + (COLS * this.tileSize) / 2;
    const minY = h / 2 + 8 * dpr;
    const cy = Math.max(minY, this.boardY - this.boardFrame - 36 * dpr);
    this.chainStatus = this.add.container(cx, cy).setDepth(45);

    const bg = rounded(this, -w / 2, -h / 2, w, h, 14 * dpr, 0xfff4e0, 0.97, 0xb88a3a, 2 * dpr);

    const iconCx = w / 2 - 26 * dpr;
    const iconHaloR = 22 * dpr;
    const halo = this.add.graphics();
    halo.fillStyle(0xf2dca0, 1);
    halo.fillCircle(iconCx, 0, iconHaloR);
    halo.lineStyle(1.5 * dpr, 0xb88a3a, 1);
    halo.strokeCircle(iconCx, 0, iconHaloR);

    this.chainStatusIcon = this.add.image(iconCx, 0, "spark").setScale(0.6);

    // "x N earned" badge — bottom-right of the icon halo, only when the
    // accumulated count would produce 2+ terminal items (i.e. multiples
    // beyond the first one in progress).
    const badgeR = 10 * dpr;
    const badgeX = iconCx + iconHaloR - 4 * dpr;
    const badgeY = iconHaloR - 6 * dpr;
    const badgeBg = this.add.circle(badgeX, badgeY, badgeR, 0x2b2218, 1).setStrokeStyle(1.5 * dpr, 0xffd248);
    const badgeText = this.add.text(badgeX, badgeY, "0", {
      fontFamily: "Arial", fontSize: `${11 * dpr}px`, color: "#ffd248", fontStyle: "bold",
    }).setOrigin(0.5);
    badgeBg.setVisible(false);
    badgeText.setVisible(false);
    this.chainStatusBadgeBg = badgeBg;
    this.chainStatusBadge = badgeText;

    // Progress bar
    const barW = 130 * dpr;
    const barH = 18 * dpr;
    const barX = -w / 2 + 14 * dpr;
    const barY = 0;
    const barRadius = barH / 2;
    const barBg = this.add.graphics();
    barBg.fillStyle(0xd4b890, 1);
    barBg.fillRoundedRect(barX, barY - barH / 2, barW, barH, barRadius);
    barBg.lineStyle(1.5 * dpr, 0x6a4a2a, 1);
    barBg.strokeRoundedRect(barX, barY - barH / 2, barW, barH, barRadius);

    const barFill = this.add.graphics();
    this.chainStatusBarFill = barFill;
    this.chainStatusBarGeom = { x: barX, y: barY, w: barW, h: barH, r: barRadius };

    this.chainStatusText = this.add.text(barX + barW / 2, barY, "0/0", {
      fontFamily: "Arial", fontSize: `${13 * dpr}px`, color: "#2b2218", fontStyle: "bold",
      stroke: "#fff4e0", strokeThickness: 3 * dpr,
    }).setOrigin(0.5);

    this.chainStatus.add([bg, halo, barBg, barFill, this.chainStatusText, this.chainStatusIcon, badgeBg, badgeText]);

    this.chainStatus.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: this.chainStatus, scale: 1, alpha: 1, duration: this._dur(180), ease: "Back.Out" });
  }

  updateChainStatus() {
    if (!this.chainStatus) return;
    const n = this.path.length;
    if (n === 0) { this.chainStatus.setVisible(false); return; }
    const res = this.path[0].res;
    const info = this._terminalProductInfo(res);
    if (!info) { this.chainStatus.setVisible(false); return; }
    const { terminal, threshold: T } = info;
    if (T <= 0) { this.chainStatus.setVisible(false); return; }
    this.chainStatus.setVisible(true);

    const inventory = this.registry.get("inventory") ?? {};
    const banked = inventory[res.key] ?? 0;
    const total = banked + n;

    const within = total >= T ? T : total % T;
    const earnedExtra = Math.max(0, Math.floor(total / T) - (total % T === 0 && total > 0 ? 1 : 0));

    this.chainStatusText.setText(`${total}/${T}`);

    const ready = total >= T;
    const fillColor = ready ? 0xe39a2f : 0xa8c769;
    const ratio = Math.min(1, within / T);
    const { x, y, w, h, r } = this.chainStatusBarGeom;
    const fillW = Math.max(0, w * ratio);
    const g = this.chainStatusBarFill;
    g.clear();
    if (fillW > 0) {
      g.fillStyle(fillColor, 1);
      const rr = Math.min(r, fillW / 2);
      g.fillRoundedRect(x, y - h / 2, fillW, h, rr);
    }

    if (this.chainStatusIcon.texture.key !== `tile_${terminal.key}`) {
      this.chainStatusIcon.setTexture(`tile_${terminal.key}`);
    }
    this.chainStatusIcon.setScale(0.42 * this.tileSpriteScale);

    const showBadge = earnedExtra > 0;
    this.chainStatusBadgeBg.setVisible(showBadge);
    this.chainStatusBadge.setVisible(showBadge);
    if (showBadge) this.chainStatusBadge.setText(`${earnedExtra}`);
  }

  hideChainStatus() {
    if (!this.chainStatus) return;
    this.tweens.killTweensOf(this.chainStatus);
    this.chainStatus.destroy();
    this.chainStatus = null;
    this.chainStatusIcon = null;
    this.chainStatusText = null;
    this.chainStatusBarFill = null;
    this.chainStatusBarGeom = null;
    this.chainStatusBadge = null;
    this.chainStatusBadgeBg = null;
  }

  _emitChainUpdate() {
    const n = this.path.length;
    const gained = resourceGainForChain(n);
    const res = n ? this.path[0].res : null;
    const next = res ? this.nextResource(res) : null;
    const effThresh = this.registry.get("effectiveThresholds") ?? UPGRADE_THRESHOLDS;
    // V.2 — Display autumn-multiplied upgrade count; V.1 — include valid flag for React side panel
    const k = next ? upgradeCountForChain(n, res.key, effThresh) * this._autumnMult() : 0;
    const valid = n === 0 || n >= this._effectiveMinChain();
    // Phase 3 — second progress meter: tiles-to-next-spawn, e.g. "9/4 apples"
    // while chaining carrots in a zone whose upgradeMap redirects to fruits.
    let nextTileProgress = null;
    if (next && res) {
      const threshold = effThresh[res.key] ?? UPGRADE_THRESHOLDS[res.key] ?? 0;
      if (threshold > 0) {
        nextTileProgress = {
          current: n,
          threshold,
          targetLabel: next.label ?? next.key ?? "",
          targetKey: next.key ?? "",
        };
      }
    }
    this.events.emit(SCENE_EVENTS.CHAIN_UPDATE, { count: gained, upgrades: k, valid, nextTileProgress });
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
