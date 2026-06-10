import Phaser from "phaser";
import { TILE, COLS, ROWS, UPGRADE_THRESHOLDS, SEASONS, BIOMES, CAPPED_TILES, SCENE_EVENTS, getItem, tileFamilyResource, TILES_WITH_CUSTOM_OUTPUT } from "./constants.js";
import { upgradeCountForChain, rollResource } from "./utils.js";
import { resourceByKey } from "./state/helpers.js";
import { computeAggregatedAbilities } from "./features/workers/aggregate.js";
import { applySpawnPoolModifiers } from "./features/farm/poolMath.js";
import { CATEGORY_OF } from "./features/tileCollection/data.js";
import {
  expandZoneCategories,
  pickByZoneSeasonDrops,
  seasonIndexInSession,
  seasonNameInSession,
  ZONES,
  ZONE_UPGRADE_TARGET_GOLD,
  TILE_CATEGORY_TO_ZONE_CATEGORY,
  ZONE_TO_TILE_CATEGORIES,
  zoneFarmBoard,
  zoneBaseTurns,
} from "./features/zones/data.js";
import { assertTile } from "./types/guards.js";
import type { TileRes } from "./TileObj.js";
const cssColor = (num: number): string => Phaser.Display.Color.IntegerToColor(num).rgba;
import { rounded, makeTextures, regenerateTextures, paintTileCanvas, currentSeasonName, rebakeSeasonalTilesForSeason } from "./textures.js";
import { hasSeasonalTileAnim } from "./textures/seasonal/seasonalTiles.js";
import { isConceptTileIconsEnabled } from "./featureFlags.js";
import {
  conceptTilesPreloadReady,
  hasConceptTileAnim,
  preloadConceptTileGifs,
} from "./textures/conceptTiles/index.js";
import { TileObj } from "./TileObj.js";
import { computeBakeScale, hasValidChain } from "./game/chain.js";
export { computeBakeScale, hasValidChain } from "./game/chain.js";
import { producedResource, buildChainUpdatePayload } from "./game/producedResource.js";
export { producedResource, buildChainUpdatePayload } from "./game/producedResource.js";
import { findCrossCollectTargets, buildCrossCollectedCredits } from "./game/crossCollect.js";
import { BOARD_ANIMATIONS, SWEEP_COLLAPSE_PIPELINE_MS, resolveBoardAnimName } from "./config/boardAnimations.js";
import { defaultBoardAnimForPower, dimStrategyForPower, isTapTargetPower } from "./config/toolPowers.js";
import { selectTilesForPower, resolveTransformKey } from "./config/tileSelectors.js";
import type { ToolPower } from "./state/toolPowerRuntime.js";
import {
  getRegistry,
  setRegistry,
  type GameRegistryKey,
  type RegistryChangeHandler,
  type RegistryGrid,
} from "./types/phaserRegistry.js";

function registryToolPower(value: unknown): ToolPower | null {
  if (!value || typeof value !== "object") return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" ? (value as ToolPower) : null;
}

function registryToolKey(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

const FLOAT_TEXT_COLOR = 0xffd248;

// Per-biome gold tile key — the board-only "GOLD" sentinel upgrade target.
// When a zone's upgradeMap points to ZONE_UPGRADE_TARGET_GOLD ("gold"), we
// spawn this tile on the board. It never enters inventory.
const BIOME_GOLD_TILE: Record<string, string | null> = Object.freeze({
  farm: "tile_fruit_golden_apple",
  mine: "tile_mine_gold",
  fish: null, // No gold tile for fish biome yet
});

// Single decorative frame around the tiles, in CSS pixels. Thinner on narrow
// viewports so the board can stretch as wide as possible.
function boardFrameFor(cssVw: number): number {
  return cssVw < 600 ? 8 : 14;
}


// Chain path colors (warm orange when the chain meets minimum length, brown
// when it doesn't). Cross-faded via _pathValidProgress when validity flips.
const PATH_COLORS_VALID   = { line: 0xff6d00, halo: 0xffd248, nodeOuter: 0xffd248, nodeInner: 0xff6d00 };
const PATH_COLORS_INVALID = { line: 0x9a4630, halo: 0xc06b3e, nodeOuter: 0xc06b3e, nodeInner: 0x9a4630 };

function lerpHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export class GameScene extends Phaser.Scene {
  // ── Instance properties ───────────────────────────────────────────────────

  /** 2D board of live tile objects (ROWS × COLS). */
  grid: (TileObj | null)[][] = [];
  /** Active drag chain. Each element is a TileObj. */
  path: TileObj[] = [];
  /** Graphics objects for the path line segments. */
  pathLines: Phaser.GameObjects.Graphics[] = [];
  /** Decorative star / preview images on the path. */
  pathStars: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];
  /** Node-dot graphics for the whole path. */
  pathNodeG: Phaser.GameObjects.Graphics | null = null;
  /** Upgrades to place at the endpoint after the next collapse. */
  pendingUpgrades: Array<{ res: TileRes; col: number; row: number }> = [];

  _prevPathLen: number = 0;
  _prevStarGroups: number = 0;
  dragging: boolean = false;
  locked: boolean = false;
  /** Container used as tween target for shuffle spin; null when idle. */
  board: Phaser.GameObjects.Container | null = null;

  /** 0 = invalid colors, 1 = valid colors; tweened on flip. */
  _pathValidProgress: number = 1;
  _lastPathValid: boolean = true;
  _validTween: Phaser.Tweens.Tween | null = null;

  // Layout dims — computed by layoutDims(), valid after create()
  dpr: number = 1;
  tileSize: number = 0;
  tileScale: number = 1;
  tileSpriteScale: number = 1;
  boardX: number = 0;
  boardY: number = 0;
  boardFrame: number = 0;
  bakeScale: number = 1;
  /** Last time (ms) the seasonal-tile animation pass re-baked (≈20fps throttle). */
  _seasonalAnimLast: number = 0;
  _conceptAnimLast: number = 0;

  // Misc scene objects
  sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  hazardVignette!: Phaser.GameObjects.Graphics;
  // Hover badge shown while dragging
  grassHover: Phaser.GameObjects.Container | null = null;
  grassHoverIcon: Phaser.GameObjects.Image | null = null;
  grassHoverText: Phaser.GameObjects.Text | null = null;

  // Internal flags / deferred state
  _suppressNextGridApply: boolean = false;
  _deferredTool: string | null = null;
  _hazardBreathe: Phaser.Tweens.Tween | null = null;
  constructor() {
    super("GameScene");
  }

  create() {
    this.input.topOnly = true;
    this.dpr = getRegistry(this.registry, "dpr") || 1;
    const textResolution = getRegistry(this.registry, "renderResolution") || 1;
    const addText = this.add.text.bind(this.add);
    this.add.text = (...args) => addText(...args).setResolution(textResolution);
    // Compute layout first so the initial bake can match the on-screen tile
    // size on big viewports — otherwise icons get upscaled past 1:1.
    this.layoutDims();
    this.bakeScale = computeBakeScale(this.dpr, this.tileSize);
    setRegistry(this.registry, "bakeScale", this.bakeScale);
    makeTextures(this);
    if (isConceptTileIconsEnabled()) {
      preloadConceptTileGifs().then(() => {
        if (this.scene.isActive()) this._animateConceptTiles(0);
      });
    }
    this.layoutDims();
    this.drawBackground();
    this.fillBoard(true);
    // Reload restoration: if we're continuing a saved session, overwrite the
    // random tiles that fillBoard just generated with the persisted board state.
    const boardRestoreGrid = getRegistry(this.registry, "boardRestoreGrid");
    if (boardRestoreGrid) {
      this._applyGridFromState(boardRestoreGrid);
      this._syncGridToState();
    }
    this.input.on("pointerup", () => this.endPath());
    // pointerupoutside and gameout are intentionally omitted: Phaser fires
    // gameout via a synthetic 'mouseout' that mobile browsers dispatch during
    // touch moves (touch-to-mouse synthesis), killing the drag immediately.
    // The document-level pointerup / touchend / pointercancel listeners below
    // cover all end-drag cases without the false-positive on touch.

    // Touch-friendly drag fallback: pointerover misses tiles when a finger
    // moves quickly across the board (touch tracking has lower temporal
    // resolution than mouse). Hit-test against the grid on every pointermove
    // while dragging so fast finger swipes still extend the chain.
    //
    // The hit test is circular (radius matches the sprite's interactive
    // circle in TileObj), not the full square cell. A square cell registers
    // its corners, so a diagonal swipe through the point where 4 tiles meet
    // snags on whichever off-diagonal tile's corner the finger clips. The
    // circle leaves the corners as a neutral gutter, so diagonal moves go
    // straight from tile to diagonal tile without grabbing an intermediate.
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging || !this.path.length) return;
      this._positionGrassHover(pointer.worldX, pointer.worldY);
      const ts = this.tileSize;
      if (!ts) return;
      const col = Math.floor((pointer.worldX - this.boardX) / ts);
      const row = Math.floor((pointer.worldY - this.boardY) / ts);
      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
      const tile = this.grid?.[row]?.[col];
      if (!tile) return;
      const last = this.path[this.path.length - 1];
      if (tile === last) return;
      // Reject corner clips: only register when the finger is within the
      // tile's circular hit area (0.6 × tile size, same as TileObj).
      const dx = pointer.worldX - tile.x;
      const dy = pointer.worldY - tile.y;
      const hitR = ts * 0.6;
      if (dx * dx + dy * dy > hitR * hitR) return;
      this.tryAddToPath(tile);
    });

    // Prevent the browser from hijacking pointer events with its native text/element
    // selection during tile drags (causes the "foggy film" overlay and stuck tile selection).
    const canvas = this.sys.game.canvas;
    const preventSelect = (e: Event) => e.preventDefault();
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
    // Cancel drag when the mouse physically leaves the canvas. Skip touch:
    // on mobile, pointerleave fires spuriously when a finger passes over an
    // overlapping DOM element; document-level touchend handles actual release.
    const onPointerLeave = (e: PointerEvent) => { if (e.pointerType !== "touch") onDocPointerUp(); };
    canvas.addEventListener("pointerleave", onPointerLeave);

    // Registry and scale listeners — track each so they can be torn down on
    // shutdown. Otherwise scene recreation (HMR, tests, biome reload) leaks
    // handlers that fire against a destroyed scene. Each `onRegistry(key, fn)`
    // subscribes to Phaser's `changedata-<key>` event with the value/previous
    // arguments typed by {@link GameRegistryContract}.
    const registryListeners: Array<[string, (...args: unknown[]) => void]> = [];
    const onRegistry = <K extends GameRegistryKey>(key: K, fn: RegistryChangeHandler<K>): void => {
      const event = `changedata-${key}`;
      this.registry.events.on(event, fn);
      registryListeners.push([event, fn as (...args: unknown[]) => void]);
    };
    const onResize = () => this.handleResize();
    this.scale.on("resize", onResize);

    this.events.once("shutdown", () => {
      canvas.removeEventListener("selectstart", preventSelect);
      canvas.removeEventListener("contextmenu", preventSelect);
      canvas.removeEventListener("pointerleave", onPointerLeave);
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
    onRegistry("grid", (_p, value) => {
      if (this._suppressNextGridApply) return;
      this._applyGridFromState(value);
    });

    onRegistry("biomeKey", (_p, value, prev) => {
      if (value !== prev) this.handleBiomeChange();
    });

    // New-puzzle signal: the reducer bumps `newBoardNonce` on every fresh
    // (non-restored) board entry. Regenerate from scratch whenever it changes.
    // Seeded at preBoot, so a save-restore mount sets the same value and never
    // fires this — preserving the restored board.
    onRegistry("newBoardNonce", (_p, value, prev) => {
      if (value == null || value === prev) return;
      this.regenerateBoard();
    });
    onRegistry("turnsUsed", () => this.refreshSeasonTint());
    onRegistry("uiLocked", (_p, value) => {
      this.locked = !!value;
    });
    onRegistry("toolPendingPower", (_p, value, prev) => {
      if (value === prev) return;
      const power = registryToolPower(value);
      const key = registryToolKey(getRegistry(this.registry, "toolPending"));
      if (!power || !key) return;
      if (isTapTargetPower(power.id)) {
        this.applyToolDimForPower(power, key);
      }
    });
    onRegistry("toolPending", (_p, value) => {
      const toolKey = registryToolKey(value);
      if (!toolKey) {
        this.clearToolDim();
        return;
      }
      if (this.dragging) {
        this._deferredTool = toolKey;
        return;
      }
      const power = registryToolPower(getRegistry(this.registry, "toolPendingPower"))
        ?? registryToolPower(getItem(toolKey)?.power)
        ?? null;
      if (!power) return;
      if (isTapTargetPower(power.id)) {
        this.applyToolDimForPower(power, toolKey);
        return;
      }
      this.applyToolPower(power, null);
      this.time.delayedCall(50, () => this.events.emit(SCENE_EVENTS.TOOL_FIRED, { key: toolKey }));
    });
    // Sync worker effects on init and whenever state.workers changes
    this._syncWorkerEffects();
    onRegistry("workers", () => this._syncWorkerEffects());
    onRegistry("built", () => this._syncWorkerEffects());
    onRegistry("tileCollectionActive", () => this._syncWorkerEffects());
    onRegistry("tileCollectionDiscovered", () => this._syncWorkerEffects());

    // Swap on-board tiles to match the newly active tile type in their category
    onRegistry("tileCollectionActive", (_p, value, prev) => {
      this.handleActiveTileChange(
        (value ?? null) as Record<string, string> | null,
        (prev ?? null) as Record<string, string> | null,
      );
    });

    // AAA Juice: Particle emitters for collection and impact VFX
    this.sparkEmitter = this.add.particles(0, 0, "spark", {
      speed: { min: 80, max: 200 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 700,
      rotate: { min: 0, max: 360 },
      gravityY: 400,
      frequency: -1, // manual emit only
    }).setDepth(100);

    // AAA Juice: Hazard Atmospherics
    this.hazardVignette = this.add.graphics().setDepth(150);
    onRegistry("hazardFire", () => this._updateHazardAtmosphere());
    onRegistry("hazardRats", () => this._updateHazardAtmosphere());
    this._updateHazardAtmosphere();
  }

  /**
   * When the active tile type for any category changes, re-key ALL on-board tiles
   * that belong to a changed category to the new active tile type. Tiles currently
   * selected in a drag chain are left alone to avoid disrupting input.
   */
  handleActiveTileChange(next: Record<string, string> | null, prev: Record<string, string> | null): void {
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
        const newRes = resourceByKey(newKey);
        if (!newRes) continue;
        tile.setResource(newRes);
        this.tweens.add({ targets: tile.sprite, angle: 360, duration: this._dur(280), onComplete: () => (tile.sprite.angle = 0) });
      }
    }
  }

  // ─── Worker effects sync ─────────────────────────────────────────────────

  _syncWorkerEffects() {
    const snapshot = {
      workers: getRegistry(this.registry, "workers") ?? { hired: {} },
      built: getRegistry(this.registry, "built") ?? {},
      mapCurrent: getRegistry(this.registry, "activeZone") ?? "home",
      tileCollection: {
        discovered: getRegistry(this.registry, "tileCollectionDiscovered") ?? {},
        researchProgress: {} as Record<string, number>,
        activeByCategory: getRegistry(this.registry, "tileCollectionActive") ?? {},
        freeMoves: 0,
      },
    };
    // Aggregator returns a channel object (see src/config/abilitiesAggregate
    // `emptyChannels`); narrow the channels we read off it here.
    interface AggregatedChannels {
      thresholdReduce?: Record<string, number>;
      poolWeight?: Record<string, number>;
      effectivePoolWeights?: Record<string, number>;
      bonusYield?: Record<string, number>;
      seasonBonus?: Record<string, number>;
    }
    const agg = computeAggregatedAbilities(snapshot) as AggregatedChannels;
    const eff: Record<string, number> = {};
    for (const [k, v] of Object.entries(UPGRADE_THRESHOLDS)) {
      eff[k] = Math.max(1, (v as number) - (agg.thresholdReduce?.[k] ?? 0));
    }
    // Merge legacy poolWeight (Phase 4) + Phase-9 effectivePoolWeights
    const mergedPoolWeights: Record<string, number> = { ...(agg.poolWeight ?? {}) };
    for (const [k, v] of Object.entries(agg.effectivePoolWeights ?? {})) {
      mergedPoolWeights[k] = (mergedPoolWeights[k] ?? 0) + (v as number);
    }
    setRegistry(this.registry, "effectiveThresholds",  eff);
    setRegistry(this.registry, "effectivePoolWeights", mergedPoolWeights);
    setRegistry(this.registry, "bonusYields",          agg.bonusYield);
    setRegistry(this.registry, "seasonBonus",          agg.seasonBonus);
  }

  _shake(duration = 200, intensity = 0.005) {
    this.cameras.main.shake(duration, intensity);
  }

  // Brief squash-stretch when a falling tile lands. Reads the sprite's
  // current scaleX/scaleY as the rest state so the bounce composes with
  // whatever tileSpriteScale is in effect at the current resolution.
  _landingBounce(sprite: Phaser.GameObjects.Sprite | null | undefined): void {
    if (!sprite?.active) return;
    const baseSx = sprite.scaleX;
    const baseSy = sprite.scaleY;
    this.tweens.add({
      targets: sprite,
      scaleX: baseSx * 1.08,
      scaleY: baseSy * 0.88,
      duration: this._dur(70),
      ease: "Quad.Out",
      yoyo: true,
      onComplete: () => {
        if (sprite.active) sprite.setScale(baseSx, baseSy);
      },
    });
  }

  // Golden ring + soft sparkle that radiates out from a tile spawning
  // as a chain upgrade. Pairs with the scale-pop on the tile itself.
  _upgradeSpawnBurst(x: number, y: number): void {
    const ring = this.add.graphics().setDepth(11);
    const ro = { r: 5 * this.tileScale, a: 1 };
    this.tweens.add({
      targets: ro,
      r: 36 * this.tileScale,
      a: 0,
      duration: this._dur(380),
      ease: "Quad.Out",
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(3 * this.tileScale, 0xffd248, ro.a);
        ring.strokeCircle(x, y, ro.r);
      },
      onComplete: () => ring.destroy(),
    });
  }

  _updateHazardAtmosphere() {
    const fire = getRegistry(this.registry, "hazardFire");
    const rats = getRegistry(this.registry, "hazardRats");
    const hasFire = !!(fire?.cells?.length);
    const hasRats = !!(rats?.length);

    if (this._hazardBreathe) { this._hazardBreathe.stop(); this._hazardBreathe = null; }
    this.hazardVignette.clear();
    this.hazardVignette.setAlpha(1);
    if (!hasFire && !hasRats) return;

    // Paint once at peak intensity, then breathe the layer's alpha with a slow
    // yoyo tween — the old 120ms timer repainted with fresh random alpha every
    // tick, which read as flicker rather than atmosphere.
    const w = this.scale.width;
    const h = this.scale.height;
    if (hasFire) {
      this.hazardVignette.fillStyle(0xff6600, 0.14);
      this.hazardVignette.fillRect(0, 0, w, h);
    }
    if (hasRats) {
      this.hazardVignette.fillStyle(0x666666, hasFire ? 0.05 : 0.12);
      this.hazardVignette.fillRect(0, 0, w, h);
    }
    this.hazardVignette.setAlpha(0.45);
    this._hazardBreathe = this.tweens.add({
      targets: this.hazardVignette,
      alpha: 1,
      duration: this._dur(1400),
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
  }

  // ─── Building illustrations ──────────────────────────────────────────────

  /** Tween-duration passthrough (kept as a hook for future motion prefs). */
  _dur(base: number): number {
    return base;
  }

  /** AAA Juice: Particle burst for resource collection. */
  emitCollectParticles(x: number, y: number, colorInput: string | number = "#ffffff", count: number = 10): void {
    const color = typeof colorInput === "string"
      ? Phaser.Display.Color.HexStringToColor(colorInput).color
      : (Number.isFinite(colorInput) ? (colorInput as number) : 0xffffff);
    if (this.sparkEmitter.active) {
      this.sparkEmitter.setParticleTint(color);
      this.sparkEmitter.explode(Math.min(25, count * 2), x, y);
    }

    // Optional weight pulse — only when the shuffle container is alive. Phaser's
    // Tween constructor reads targets.length synchronously, so passing a null
    // target (the default state outside shuffleBoard) throws inside this
    // tween's onComplete and aborts the rest of the frame's tween/time work,
    // which is what was leaving the board stuck mid-collapse after a chain.
    if (!this.board?.active) return;
    this.tweens.add({
      targets: this.board,
      scale: 1.015,
      duration: 60,
      yoyo: true,
      ease: "Quad.Out"
    });
  }

  /** Returns the effective minimum chain length given the active boss only.
   *  Phase 7 — winter minimum-chain check was removed with the calendar season. */
  _effectiveMinChain() {
    const bossMin = getRegistry(this.registry, "boss")?.minChain ?? 0;
    return Math.max(3, bossMin);
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
    const ceiling = TILE * 3.2 * dpr;
    this.tileSize = Math.max(24 * dpr, Math.min(maxByW, maxByH, ceiling));
    // Ratio of canvas px to CSS px at current tile size — used for graphics
    // line widths, offsets, and other CSS-pixel design constants.
    this.tileScale = this.tileSize / TILE;
    // Sprite display scale: textures are baked at TILE * bakeScale
    // canvas px, so dividing by bakeScale makes a sprite at scale 1 fill
    // exactly that. bakeScale defaults to dpr until handleResize bumps it.
    const bakeScale = this.bakeScale || dpr;
    this.tileSpriteScale = this.tileScale / bakeScale;
    this.boardX = Math.round((vw - COLS * this.tileSize) / 2);
    this.boardY = Math.round((vh - ROWS * this.tileSize) / 2);
  }

  handleResize() {
    const prevX = this.boardX;
    const prevY = this.boardY;
    const prevSize = this.tileSize;
    this.layoutDims();
    // If the layout grew past the current bake resolution, rebake tile
    // textures at the new scale so on-screen tiles stay ≥1:1 with the
    // baked source. Hysteresis avoids re-baking on tiny resize jitters.
    const requiredScale = computeBakeScale(this.dpr, this.tileSize);
    if (requiredScale > (this.bakeScale || this.dpr) * 1.05) {
      this.bakeScale = requiredScale;
      setRegistry(this.registry, "bakeScale", requiredScale);
      regenerateTextures(this);
      this.layoutDims();
    }
    (this.children.list as Array<Phaser.GameObjects.GameObject & { __layer?: string }>).filter((o) => o.__layer === "bg").forEach((o) => o.destroy());
    this.drawBackground();
    if (this.boardX !== prevX || this.boardY !== prevY || this.tileSize !== prevSize) {
      this.repositionTiles();
    }
    // Repaint the hazard vignette at the new canvas dimensions (it paints
    // once per state change now, so resize must re-trigger it).
    this._updateHazardAtmosphere();
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
    // from turnsUsed/turnBudget so the board palette cycles
    // Spring -> Winter as the player burns turns.
    const turnsUsed = getRegistry(this.registry, "turnsUsed") ?? 0;
    const turnBudget = getRegistry(this.registry, "turnBudget") ?? null;
    if (!turnBudget || turnBudget < 1) return SEASONS[0];
    const idx = seasonIndexInSession(turnsUsed, turnBudget);
    return SEASONS[idx];
  }

  biomeKey() {
    return getRegistry(this.registry, "biomeKey") || "farm";
  }

  biome() {
    return BIOMES[this.biomeKey()];
  }

  drawBackground() {
    type LayeredGameObject = Phaser.GameObjects.GameObject & { __layer?: string };
    const tag = <T extends LayeredGameObject>(o: T): T => { o.__layer = "bg"; return o; };
    const s = this.season();
    const b = this.biome();
    const dpr = this.dpr;
    const vw = this.scale.width;
    const vh = this.scale.height;
    const ts = this.tileSize;
    const boardW = COLS * ts;
    const boardH = ROWS * ts;
    // Lifted palette: page is parchment-cream; the board sits as a layered
    // parchment card. Biome is signalled by a thin top-edge strip (not by
    // tinting the whole board).
    const pageBg = 0xe9dfc6;
    const boardBg = 0xf6efe0;
    this.cameras.main.setBackgroundColor(pageBg);
    tag(this.add.rectangle(0, 0, vw, vh, pageBg).setOrigin(0).setDepth(-10));
    const frame = this.boardFrame;
    // Decorative side leaves — only draw if there's room outside the board
    // frame. Biome accent gives them their tint, softer now.
    const leafGap = 36 * dpr;
    if (this.boardX - frame - leafGap > 0) {
      for (let y = 30 * dpr; y < vh - 30 * dpr; y += 36 * dpr) {
        tag(this.add.ellipse(this.boardX - leafGap, y, 38 * dpr, 22 * dpr, b.palette.accent, 0.35).setAngle(-25).setDepth(-9));
        tag(this.add.ellipse(this.boardX + boardW + leafGap, y, 38 * dpr, 22 * dpr, b.palette.accent, 0.35).setAngle(25).setDepth(-9));
      }
    }
    // Outer board frame — soft cream border instead of dark dirt.
    tag(rounded(this, this.boardX - frame, this.boardY - frame, boardW + frame * 2, boardH + frame * 2, 16 * dpr, b.special_dirt, 1).setDepth(-2));
    // Parchment card the tiles sit on.
    tag(rounded(this, this.boardX - frame * 0.6, this.boardY - frame * 0.6, boardW + frame * 1.2, boardH + frame * 1.2, 14 * dpr, boardBg, 1).setDepth(-1.5));
    // Biome accent strip — 4dpr top edge of the parchment card. Identifies
    // which biome the player is in without dominating the board.
    const stripH = 4 * dpr;
    tag(this.add.rectangle(this.boardX - frame * 0.6, this.boardY - frame * 0.6, boardW + frame * 1.2, stripH, b.palette.bg, 1).setOrigin(0, 0).setDepth(-1));
    // Lightly tint the bottom of the parchment card with the current season's
    // accent so seasons still register on the board. Drawn at low alpha so
    // it never competes with tile readability.
    tag(this.add.rectangle(this.boardX - frame * 0.6, this.boardY + boardH + frame * 0.6 - stripH, boardW + frame * 1.2, stripH, s.look.bg, 0.55).setOrigin(0, 0).setDepth(-1));
  }

  refreshSeasonTint() {
    (this.children.list as Array<Phaser.GameObjects.GameObject & { __layer?: string }>).filter((o) => o.__layer === "bg").forEach((o) => o.destroy());
    this.drawBackground();
    // Re-bake seasonal tile textures (e.g. grain) so their art matches the
    // current season. Cheap: only distinct seasonal keys, in place. Fired on
    // season flips (turnsUsed) and biome/board changes.
    rebakeSeasonalTilesForSeason(this);
  }

  handleBiomeChange() {
    this.refreshSeasonTint();
    const biomeRestored = getRegistry(this.registry, "biomeRestored");
    if (biomeRestored) {
      // savedField was restored into state.grid — sync those keys onto the live tiles
      const savedGrid = getRegistry(this.registry, "grid");
      this.grid.flat().forEach((t) => {
        if (!t) return;
        const cell = savedGrid?.[t.row]?.[t.col];
        if (cell?.key) {
          const newRes = resourceByKey(cell.key);
          if (newRes) t.setResource(newRes);
        }
      });
      this._syncGridToState();
    }
    // No saved field: the reducer bumps `newBoardNonce` on every non-restored
    // entry, so the fresh board is generated by `regenerateBoard()` via the
    // newBoardNonce listener — not here. This keeps regeneration in one place
    // and lets a same-biome re-entry (farm → farm, where biomeKey doesn't
    // change) still get a fresh board.
  }

  /**
   * Tear down every live tile and re-fill the board from scratch using the
   * full {@link fillBoard} pool logic (zone/season drops, tile-collection
   * substitution, boss/fertilizer bias, drop-in animation). Used when a new
   * puzzle session starts — signalled by the `newBoardNonce` registry bump.
   */
  regenerateBoard() {
    this.endPath();
    this.clearPath(false);
    this.pendingUpgrades = [];
    this.refreshSeasonTint();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.grid[r]?.[c];
        if (tile) {
          this.tweens.killTweensOf(tile.sprite);
          tile.destroy();
        }
        if (this.grid[r]) this.grid[r][c] = null;
      }
    }
    this.fillBoard(true);
    this._syncGridToState();
  }

  // ─── Resources ────────────────────────────────────────────────────────────

  /**
   * Returns the TILE def (from the current biome's tiles) to spawn at the
   * chain endpoint, derived from the active zone's upgradeMap. Returns null
   * when there is no mapping (chain spawns nothing on the board).
   *
   * Handles the ZONE_UPGRADE_TARGET_GOLD sentinel: when the upgradeMap target
   * is "gold", returns the biome-specific gold tile def.
   *
   * @param {{ key: string }} tile
   * @returns {object | null}  Full tile def with { key, label, color, ... }
   */
  nextUpgradeTile(tile: { key: string }): TileRes | null {
    if (!tile?.key) return null;
    if (TILES_WITH_CUSTOM_OUTPUT.has(tile.key)) return null;

    const b = this.biome();
    const biomeKey = this.biomeKey();
    const allTiles: TileRes[] = b.tiles;

    // Determine source zone-category from tile's tileCollection category.
    const tileCat = (CATEGORY_OF as Record<string, string | undefined>)[tile.key];
    if (!tileCat) return null;
    const sourceZoneCat = (TILE_CATEGORY_TO_ZONE_CATEGORY as Record<string, string | undefined>)[tileCat];
    if (!sourceZoneCat) return null;

    // Look up the zone's upgradeMap for this source category.
    const zoneId = getRegistry(this.registry, "activeZone") ?? null;
    if (!zoneId) return null;
    const farm = zoneFarmBoard(zoneId);
    if (!farm?.upgradeMap) return null;
    const targetZoneCat = farm.upgradeMap[sourceZoneCat as import("./types/catalog/tileCategories.js").ZoneCategoryId];
    if (!targetZoneCat) return null;

    // Handle the GOLD sentinel: spawn the biome's dedicated gold tile.
    if (targetZoneCat === ZONE_UPGRADE_TARGET_GOLD) {
      const goldKey = (BIOME_GOLD_TILE as Record<string, string | null>)[biomeKey] ?? null;
      if (!goldKey) return null;
      return allTiles.find((t: TileRes) => t.key === goldKey) ?? null;
    }

    // Normal case: find the player's active tile in the target zone-category.
    const targetTileCats: string[] = (ZONE_TO_TILE_CATEGORIES as Record<string, string[]>)[targetZoneCat] ?? [];
    const tileCollectionActive = getRegistry(this.registry, "tileCollectionActive") ?? null;

    if (tileCollectionActive) {
      for (const tc of targetTileCats) {
        const activeKey = tileCollectionActive[tc];
        if (!activeKey) continue;
        const r = allTiles.find((t: TileRes) => t.key === activeKey);
        if (r) return r;
      }
    }

    // Fallback: first biome tile whose category matches the target tile-categories.
    for (const t of allTiles) {
      const cat = (CATEGORY_OF as Record<string, string | undefined>)[t.key];
      if (cat && targetTileCats.includes(cat)) return t;
    }

    return null;
  }

  /**
   * Returns the biome pool with each slot substituted by the player's currently
   * active tile type for that category. If a category has no active tile type
   * selected (null), that slot is dropped from the pool — only tiles the player
   * has explicitly chosen (or defaulted) will spawn.
   */
  activePool() {
    const base = this.biome().pool;
    const active = getRegistry(this.registry, "tileCollectionActive") ?? null;
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

  randomResource() {
    const pool = this.activePool();
    if (pool.length === 0) return this.biome().tiles[0];
    const key = rollResource(pool);
    return resourceByKey(key) ?? this.biome().tiles[0];
  }

  _randomFromPool(pool: string[]): TileRes {
    const safePool = pool.length ? pool : this.biome().pool;
    const key = rollResource(safePool);
    return resourceByKey(key) ?? this.biome().tiles[0];
  }

  // Phase 3b — sample a tile from the active zone's per-(zone, season) drop
  // table. Returns null when the zone has no entry, the season's table is
  // empty, the biome isn't farm, or the picker can't resolve any matching
  // resource. Callers must fall through to the existing weighted pool when
  // this returns null.
  _pickFromZoneSeasonDrops() {
    if (this.biomeKey() !== "farm") return null;
    const zoneId = getRegistry(this.registry, "activeZone") ?? null;
    if (!zoneId || !ZONES[zoneId]) return null;
    const turnsUsed = getRegistry(this.registry, "turnsUsed") ?? 0;
    // Fall back to the existing seasonsCycled-based season name when no
    // session is active (e.g. tests that don't dispatch FARM/ENTER).
    const turnBudget = getRegistry(this.registry, "turnBudget") ?? zoneBaseTurns(zoneId, "farm");
    const seasonName = seasonNameInSession(turnsUsed, turnBudget);
    return pickByZoneSeasonDrops({
      zoneId,
      seasonName,
      biomeResources: [...this.biome().tiles, ...this.biome().resources],
      tileCollectionActive: getRegistry(this.registry, "tileCollectionActive") ?? undefined,
      categoryOf: CATEGORY_OF,
      rng: Math.random,
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
          const cell: { key: string; frozen?: boolean; rubble?: boolean } = { key: tile.res.key };
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

  _applyGridFromState(stateGrid: RegistryGrid | null | undefined): void {
    if (!stateGrid) return;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.grid[r]?.[c];
        const cell = stateGrid[r]?.[c];
        if (!tile || !cell) continue;
        if (tile.res.key !== cell.key) {
          const newRes = resourceByKey(cell.key);
          if (newRes) tile.setResource(newRes);
        }
        tile.frozen = !!cell.frozen;
        tile.rubble = !!cell.rubble;
      }
    }
  }

  /** Replace every live tile from a serialized grid (visual demo reload). */
  rebuildGridFromState(stateGrid: RegistryGrid | null | undefined): void {
    if (!stateGrid) return;
    this.endPath();
    this.clearPath(false);
    this.pendingUpgrades = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.grid[r]?.[c];
        if (tile) {
          this.tweens.killTweensOf(tile.sprite);
          tile.destroy();
        }
        this.grid[r][c] = null;
      }
    }
    const ts = this.tileSize;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = stateGrid[r]?.[c];
        if (!cell?.key) continue;
        const res = resourceByKey(cell.key);
        if (!res) continue;
        const x = this.boardX + c * ts + ts / 2;
        const y = this.boardY + r * ts + ts / 2;
        const tile = new TileObj(this, x, y, c, r, res);
        tile.sprite.setScale(this.tileSpriteScale);
        tile.frozen = !!cell.frozen;
        tile.rubble = !!cell.rubble;
        this.grid[r][c] = tile;
      }
    }
  }

  // ─── Board fill / collapse ────────────────────────────────────────────────

  fillBoard(initial = false) {
    const ts = this.tileSize;
    // Build worker-boosted, tile-collection-substituted pool. Worker boosts are gated
    // by the active tile type: a boost for key K only applies when K is the active
    // tile type in its category (matches getActivePool semantics).
    const tileCollectionActive = getRegistry(this.registry, "tileCollectionActive") ?? null;
    let workerPool = this.activePool();
    const poolWeights = getRegistry(this.registry, "effectivePoolWeights") ?? {};
    // Phase 2 — restrict the spawn pool to the categories the player picked
    // in the Start Farming modal. Empty/missing list = no filter (legacy
    // entry path through SWITCH_BIOME / cartography). Mine and fish biomes
    // ignore this filter; it only applies on the farm board.
    const sessionSelectedTiles = getRegistry(this.registry, "sessionSelectedTiles") ?? [];
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
    const boss = getRegistry(this.registry, "boss");
    const spawnBias = boss?.spawnBias ?? null;
    if (spawnBias) {
      const baseCounts: Record<string, number> = {};
      for (const k of workerPool) baseCounts[k] = (baseCounts[k] ?? 0) + 1;
      for (const [k, factor] of Object.entries(spawnBias as Record<string, number>)) {
        const extra = Math.round((baseCounts[k] ?? 0) * (factor - 1));
        for (let i = 0; i < extra; i++) workerPool.push(k);
      }
    }
    // Fertilizer bias: double seedling-tier resource copies in pool
    // Also activated by magic_fertilizer charges (one charge consumed per fill)
    const fillBiasArmed = !!(getRegistry(this.registry, "fillBiasTarget") ||
                             (getRegistry(this.registry, "magicFertilizerCharges") ?? 0) > 0);
    if (fillBiasArmed) {
      const biasTargetKey = getRegistry(this.registry, "fillBiasTarget")?.key ?? null;
      const biasKeys = biasTargetKey
        ? [biasTargetKey, `tile_${biasTargetKey}`].filter((k) => resourceByKey(k) || this.biome().tiles.some((t: TileRes) => t.key === k))
        : ["seedling", "tile_grass_hay", "tile_grain_wheat"];
      const fBase: Record<string, number> = {};
      for (const k of workerPool) fBase[k] = (fBase[k] ?? 0) + 1;
      for (const k of biasKeys) {
        const extra = fBase[k] ?? 0;
        for (let i = 0; i < extra; i++) workerPool.push(k);
      }
      this.events.emit(SCENE_EVENTS.FERTILIZER_CONSUMED);
    }
    const farmSeasonName =
      this.biomeKey() === "farm"
        ? seasonNameInSession(
            getRegistry(this.registry, "turnsUsed") ?? 0,
            getRegistry(this.registry, "turnBudget") ?? 10,
          )
        : null;
    workerPool = applySpawnPoolModifiers(workerPool, {
      poolWeights,
      tileCollectionActive,
      biomeKey: this.biomeKey(),
      seasonName: farmSeasonName,
    });
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = this.grid[r] || [];
      for (let c = 0; c < COLS; c++) {
        if (!this.grid[r][c]) {
          const x = this.boardX + c * ts + ts / 2;
          const y = this.boardY + r * ts + ts / 2;
          let res;
          let isUpgrade = false;
          if (!initial && this.pendingUpgrades.length) {
            const idx = this.pendingUpgrades.findIndex(u => u.col === c);
            if (idx !== -1) {
              res = this.pendingUpgrades.splice(idx, 1)[0].res;
              isUpgrade = true;
            }
          }
          // Phase 3b — try the per-(zone, in-session season) drop table
          // first. Only active on the farm board, only when the active zone
          // has data for the current season; otherwise fall through to the
          // existing weighted pool sampler.
          if (!res) res = this._pickFromZoneSeasonDrops();
          if (!res) res = this._randomFromPool(workerPool);
          if (isUpgrade) {
            // Spawn upgrades in place at scale 0 and pop them in — sells the
            // moment the chain "promoted" the tile rather than burying it
            // in the regular fill cascade.
            const tile = new TileObj(this, x, y, c, r, res);
            tile.sprite.setScale(0);
            this.grid[r][c] = tile;
            const finalScale = this.tileSpriteScale;
            this.tweens.add({
              targets: tile.sprite,
              scale: finalScale,
              duration: this._dur(380),
              ease: "Back.Out",
            });
            this.emitCollectParticles(x, y, (res as { look?: { color?: string } }).look?.color || "#ffd248", 4);
            this._upgradeSpawnBurst(x, y);
          } else {
            const tile = new TileObj(this, x, initial ? y - 500 - Phaser.Math.Between(0, 100) : y - 140, c, r, res);
            tile.sprite.setScale(this.tileSpriteScale);
            this.grid[r][c] = tile;
            this.tweens.add({
              targets: tile.sprite,
              y,
              duration: this._dur(initial ? 450 + r * 28 : 210),
              ease: "Back.Out",
              onComplete: () => this._landingBounce(tile.sprite),
            });
          }
        }
      }
    }
    // Fire hazard overlay: replace grid cells at fire positions with fire tiles
    const hazardFire = getRegistry(this.registry, "hazardFire");
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
        this.tweens.add({ targets: fireTile.sprite, y: fy, duration: this._dur(initial ? 450 + fr * 28 : 210), ease: "Back.Out" });
      }
    }

    // 1.2 — Dead-board auto-shuffle: after every non-initial fill, check for valid chains.
    if (!initial) {
      const delay = 240;
      this.time.delayedCall(delay, () => {
        if (!hasValidChain(this.grid)) {
          this.floatText("No moves — reshuffled!", this.boardX + (COLS * ts) / 2, this.boardY - 24 * this.dpr);
          this.shuffleBoard();
        }
        this._syncGridToState();
        // The board just changed under an armed tool — re-evaluate which
        // tiles should be dimmed so feedback stays accurate.
        const pending = getRegistry(this.registry, "toolPending");
        const pendingPower = getRegistry(this.registry, "toolPendingPower")
          ?? (pending ? getItem(pending)?.power : null);
        if (pendingPower && pending && !this.dragging) this.applyToolDimForPower(pendingPower, pending);
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
          this.tweens.add({
            targets: tile.sprite,
            y: this.boardY + write * ts + ts / 2,
            duration: this._dur(190),
            onComplete: () => this._landingBounce(tile.sprite),
          });
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

    // Outer container holds the shuffle visuals. Kept on `this.board` so the
    // weight-pulse in emitCollectParticles still finds a live target.
    const spinContainer = this.add.container(cx, cy).setDepth(18);
    this.board = spinContainer;

    // Clip the whole effect to the board rect so nothing ever spills past the
    // edges. Geometry-mask graphics stay off the display list (make.graphics).
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(this.boardX, this.boardY, boardW, boardH);
    spinContainer.setMask(maskShape.createGeometryMask());

    // Static dim wash — covers the board edge-to-edge without rotating, so it
    // no longer reads as a dark square wobbling past the border.
    spinContainer.add(this.add.rectangle(0, 0, boardW, boardH, 0x17110a, 0.42));

    // Rotating swirl of small tile-like chips — reads as tiles being shuffled.
    const swirl = this.add.container(0, 0).setScale(0.35);
    spinContainer.add(swirl);
    const orbit = Math.min(boardW, boardH) * 0.22;
    const chipSize = Math.max(10, ts * 0.46);
    const chipColors = [0xe9cb8b, 0xcf8f57, 0x8fae66, 0xd47a68];
    for (let i = 0; i < chipColors.length; i++) {
      const ang = (Math.PI * 2 * i) / chipColors.length;
      const chip = this.add.rectangle(Math.cos(ang) * orbit, Math.sin(ang) * orbit, chipSize, chipSize, chipColors[i], 0.96);
      chip.setStrokeStyle(Math.max(2, ts * 0.045), 0x2a2014, 0.85);
      swirl.add(chip);
    }

    let cleanedUp = false;
    const finalizeShuffle = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (this.board === spinContainer) this.board = null;
      if (spinContainer.active) spinContainer.destroy();
      if (maskShape.active) maskShape.destroy();
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
    };

    this.tweens.add({
      targets: swirl,
      rotation: Math.PI * 2,
      scale: 1,
      duration: this._dur(600),
      ease: "Cubic.easeInOut",
      onComplete: finalizeShuffle,
      onStop: finalizeShuffle,
    });

    // Failsafe: if tween callbacks are interrupted (scene transition, pause,
    // or rapid tool usage), ensure the overlay is removed and board unblocked.
    this.time.delayedCall(this._dur(600) + 120, finalizeShuffle);
  }

  _forceGuaranteedChain() {
    const pool = this.activePool();
    const key = pool[0] ?? this.biome().pool[0];
    const res = resourceByKey(key) ?? this.biome().tiles[0];
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

  _performShuffleSwap(): void {
    const tiles = this.grid.flat().filter((t): t is TileObj => t !== null && t !== undefined);
    const resources = tiles.map((t) => t.res);
    Phaser.Utils.Array.Shuffle(resources);
    tiles.forEach((t, i) => {
      t.setResource(resources[i]);
      this.tweens.add({ targets: t.sprite, angle: 360, duration: this._dur(300), onComplete: () => (t.sprite.angle = 0) });
    });
    this._syncGridToState();
  }

  // ─── Board tool handlers (1.3 Scythe / 1.4 Seedpack / 1.5 Lockbox) ──────

  /**
   * Play a named board animation on a set of tiles. Tools should call this
   * instead of inlining tween blocks — see src/config/boardAnimations.js for
   * the registry of timings. Optional `tint` is applied via setTint() before
   * the tween starts. The caller is responsible for nulling grid cells before
   * a destructive (fadeOut) animation so the onComplete-destroy doesn't race
   * later board reads.
   */
  playBoardAnimation(name: string, tiles: TileObj[], { tint, ms }: { tint?: number; ms?: number } = {}): void {
    const resolvedName = resolveBoardAnimName(name);
    if (!resolvedName) return;
    interface BoardAnimationDef {
      kind: string;
      duration: number;
      staggerMs?: number;
      rotationHalfDeg?: number;
      settleMs?: number;
      ease?: string;
    }
    const animation = (BOARD_ANIMATIONS as Record<string, BoardAnimationDef | undefined>)[resolvedName];
    if (!animation) return;
    if (!tiles || !tiles.length) return;

    const rotHalf = animation.rotationHalfDeg ?? 0;
    const stagger = animation.staggerMs ?? 0;

    if (animation.kind === "fadeOut") {
      tiles.forEach((tile, i) => {
        if (tint !== undefined) tile.sprite.setTint(tint);
        this.tweens.add({
          targets: tile.sprite,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          angle: Phaser.Math.Between(-rotHalf, rotHalf),
          duration: this._dur(ms ?? animation.duration),
          delay: i * stagger,
          ease: animation.ease,
          onComplete: () => tile.destroy(),
        });
      });
      return;
    }

    if (animation.kind === "popIn") {
      tiles.forEach((tile, i) => {
        if (tint !== undefined) tile.sprite.setTint(tint);
        tile.sprite.setScale(0);
        this.tweens.add({
          targets: tile.sprite,
          scale: this.tileSpriteScale,
          duration: this._dur(ms ?? animation.duration),
          delay: i * stagger,
          ease: animation.ease,
          onComplete: () => tile.sprite.clearTint(),
        });
      });
      return;
    }

    if (animation.kind === "twoStage") {
      tiles.forEach((tile) => {
        if (tint !== undefined) tile.sprite.setTint(tint);
        tile.sprite.setScale(0);
        this.tweens.add({
          targets: tile.sprite,
          scale: this.tileSpriteScale * 1.1,
          duration: this._dur(ms ?? animation.duration),
          ease: animation.ease,
          onComplete: () => {
            this.tweens.add({
              targets: tile.sprite,
              scale: this.tileSpriteScale,
              duration: this._dur(animation.settleMs ?? animation.duration),
              onComplete: () => tile.sprite.clearTint(),
            });
          },
        });
      });
    }
  }

  /** Reducer-shaped grid for tile selectors (keys + selected flag). */
  _selectorGrid() {
    return this.grid.map((row) =>
      row.map((t) => (t ? { key: t.res.key, selected: !!t.selected } : { key: null })),
    );
  }

  _collapseAfterSweep(msOverride?: number): void {
    const delay = msOverride ?? SWEEP_COLLAPSE_PIPELINE_MS;
    this.time.delayedCall(this._dur(delay), () => this.collapseBoard());
  }

  _emitClearGains(tileObjs: TileObj[]): void {
    const gainMap: Record<string, number> = {};
    for (const t of tileObjs) {
      const tileKey = t.res.key;
      const resourceKey = tileFamilyResource(tileKey) ?? tileKey;
      gainMap[resourceKey] = (gainMap[resourceKey] ?? 0) + 1;
    }
    for (const [resourceKey, gained] of Object.entries(gainMap)) {
      const res = resourceByKey(resourceKey);
      this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, {
        key: resourceKey,
        resourceKey,
        gained,
        upgrades: 0,
        chainLength: gained,
        value: res?.value ?? 1,
        noTurn: true,
      });
    }
  }

  /**
   * Generic tool-power board effect. Tap-target powers pass `tapTile`; instant
   * powers pass null and run immediately when toolPending is set.
   */
  applyToolPower(power: ToolPower, tapTile: TileObj | null): void {
    const id = power.id;
    const params = power.params ?? {};
    const boardAnim = defaultBoardAnimForPower(id);
    const anim = typeof power.anim === "string" ? power.anim : (boardAnim?.anim ?? "sweep");
    const tint = typeof power.tint === "number" ? power.tint : undefined;
    const collapseMs = typeof power.ms === "number" ? power.ms : (boardAnim?.ms ?? 220);
    const animMs = typeof power.ms === "number" ? power.ms : undefined;

    if (id === "reshuffle_board") {
      this.shuffleBoard();
      return;
    }

    const tap = tapTile ? { row: tapTile.row, col: tapTile.col } : null;
    const biomeKey = getRegistry(this.registry, "biomeKey") ?? "farm";
    const cells: Array<{ row: number; col: number }> = selectTilesForPower(id, this._selectorGrid(), params, tap, { biomeKey });

    if (id === "transform_random_n") {
      const toKey = resolveTransformKey(params, biomeKey);
      if (!toKey) return;
      const res: TileRes | undefined = resourceByKey(toKey) ?? (this.biome().tiles as TileRes[]).find((t: TileRes) => t.key === toKey);
      if (!res) return;
      const picks = cells.reduce<TileObj[]>((acc, { row, col }) => {
        const t = this.grid[row]?.[col];
        if (t != null) acc.push(t);
        return acc;
      }, []);
      picks.forEach((tile: TileObj) => tile.setResource(res!));
      this.playBoardAnimation(anim, picks, { tint, ms: animMs });
      if (params.to === "biome_rare") {
        this.time.delayedCall(this._dur(collapseMs), () => {
          if (!hasValidChain(this.grid)) {
            this.floatText("No moves — reshuffled!", this.boardX + (COLS * this.tileSize) / 2, this.boardY - 24 * this.dpr);
            this.shuffleBoard();
          }
        });
      }
      return;
    }

    const tileObjs = cells.reduce<TileObj[]>((acc, { row, col }) => {
      const t = this.grid[row]?.[col];
      if (t != null) acc.push(t);
      return acc;
    }, []);
    if (!tileObjs.length && isTapTargetPower(id)) return;

    this.playBoardAnimation(anim, tileObjs, { tint, ms: animMs });

    // Tap-target: reducer mutates grid + inventory on TOOL_FIRED (no double credit).
    if (isTapTargetPower(id) && tap) {
      this._collapseAfterSweep(id === "tap_clear_type" ? 240 : collapseMs);
      return;
    }

    for (const t of tileObjs) {
      this.grid[t.row][t.col] = null;
    }
    this._emitClearGains(tileObjs);
    this._collapseAfterSweep(collapseMs);
  }

  // ─── Drag chain ───────────────────────────────────────────────────────────

  startPath(tile: TileObj): void {
    if (this.locked) return;
    const pendingKey = getRegistry(this.registry, "toolPending");
    const armedPower = getRegistry(this.registry, "toolPendingPower")
      ?? (pendingKey ? getItem(pendingKey)?.power : null);
    if (pendingKey && armedPower?.id && isTapTargetPower(armedPower.id)) {
      this.applyToolPower(armedPower, tile);
      this.time.delayedCall(50, () => this.events.emit(SCENE_EVENTS.TOOL_FIRED, {
        key: pendingKey,
        row: tile.row,
        col: tile.col,
      }));
      return;
    }
    this.dragging = true;
    this.clearPath(false);
    this.addToPath(tile);
    this.dimUnselectableTiles(tile.res.key);
    this.showGrassHover();
    this.updateGrassHover();
    this._emitChainUpdate();
    // Subtle haptic tick on drag-start, gated by user setting.
    if (getRegistry(this.registry, "hapticsOn") && navigator.vibrate) {
      try { navigator.vibrate(10); } catch { /* unsupported */ }
    }
  }

  tryAddToPath(tile: TileObj): void {
    if (!this.dragging || !this.path.length) return;
    if (tile.frozen || tile.rubble) return;
    const last = this.path[this.path.length - 1];
    const prev = this.path[this.path.length - 2];
    if (prev === tile) {
      last.setSelected(false);
      this.path.pop();
      this.redrawPath();
      this.updateGrassHover();
      this._emitChainUpdate();
      return;
    }
    if (tile.selected) return;
    const same = tile.res.key === this.path[0].res.key;
    const adj = Math.abs(tile.col - last.col) <= 1 && Math.abs(tile.row - last.row) <= 1 && !(tile.col === last.col && tile.row === last.row);
    if (same && adj) this.addToPath(tile);
  }

  addToPath(tile: TileObj): void {
    tile.setSelected(true);
    tile.pulse();
    this.path.push(tile);
    this.redrawPath();
    this.updateGrassHover();
    this._emitChainUpdate();
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

    // Tween the validity color when it flips, rather than snapping. Brown ↔ orange
    // over 160ms. Repaint hooked via onUpdate so segments + nodes both follow.
    if (pathValid !== this._lastPathValid) {
      this._lastPathValid = pathValid;
      if (this._validTween) this._validTween.stop();
      this._validTween = this.tweens.add({
        targets: this,
        _pathValidProgress: pathValid ? 1 : 0,
        duration: 160,
        ease: "Quad.Out",
        onUpdate: () => this._repaintPathColors(),
      });
    }

    const t = this._pathValidProgress;
    const lineColor      = lerpHex(PATH_COLORS_INVALID.line,      PATH_COLORS_VALID.line,      t);
    const haloColor      = lerpHex(PATH_COLORS_INVALID.halo,      PATH_COLORS_VALID.halo,      t);
    const nodeOuterColor = lerpHex(PATH_COLORS_INVALID.nodeOuter, PATH_COLORS_VALID.nodeOuter, t);
    const nodeInnerColor = lerpHex(PATH_COLORS_INVALID.nodeInner, PATH_COLORS_VALID.nodeInner, t);

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
    const pathNodeG = this.pathNodeG; // narrowed non-null ref
    pathNodeG.clear();
    const nr = 7 * this.tileScale;
    this.path.forEach((t) => {
      pathNodeG.fillStyle(nodeOuterColor, 0.55);
      pathNodeG.fillCircle(t.x, t.y, nr * 1.6);
      pathNodeG.fillStyle(nodeInnerColor, 1);
      pathNodeG.fillCircle(t.x, t.y, nr);
      pathNodeG.fillStyle(0xfff4c2, 0.9);
      pathNodeG.fillCircle(t.x, t.y, nr * 0.4);
    });

    const res0 = this.path.length ? this.path[0].res : null;
    // Display the TILE that will spawn on the board (nextUpgradeTile), so the
    // star preview matches what actually appears at the endpoint.
    const next = res0 ? this.nextUpgradeTile(res0) : null;
    const effThresh: Record<string, number> = getRegistry(this.registry, "effectiveThresholds") ?? UPGRADE_THRESHOLDS;
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

  // Cheap version of redrawPath that just re-colors existing line graphics
  // and the node ring with the current _pathValidProgress. Called on every
  // tween frame during a validity flip so colors blend instead of snap.
  _repaintPathColors() {
    if (this.path.length === 0) return;
    const t = this._pathValidProgress;
    const lineColor      = lerpHex(PATH_COLORS_INVALID.line,      PATH_COLORS_VALID.line,      t);
    const haloColor      = lerpHex(PATH_COLORS_INVALID.halo,      PATH_COLORS_VALID.halo,      t);
    const nodeOuterColor = lerpHex(PATH_COLORS_INVALID.nodeOuter, PATH_COLORS_VALID.nodeOuter, t);
    const nodeInnerColor = lerpHex(PATH_COLORS_INVALID.nodeInner, PATH_COLORS_VALID.nodeInner, t);
    for (let i = 1; i < this.path.length; i++) {
      const a = this.path[i - 1];
      const b = this.path[i];
      const g = this.pathLines[i - 1];
      if (!g) continue;
      // Skip the very last segment if a "grow" tween is still running on it —
      // letting onUpdate take over its color while the tween's own onUpdate
      // keeps redrawing its grow progress in the old color would flicker.
      if (i === this.path.length - 1 && this.tweens.isTweening(g)) continue;
      g.clear();
      this._drawSegment(g, a.x, a.y, b.x, b.y, lineColor, haloColor);
    }
    if (this.pathNodeG) {
      const pathNodeG2 = this.pathNodeG; // narrowed non-null ref
      pathNodeG2.clear();
      const nr = 7 * this.tileScale;
      this.path.forEach((tp) => {
        pathNodeG2.fillStyle(nodeOuterColor, 0.55);
        pathNodeG2.fillCircle(tp.x, tp.y, nr * 1.6);
        pathNodeG2.fillStyle(nodeInnerColor, 1);
        pathNodeG2.fillCircle(tp.x, tp.y, nr);
        pathNodeG2.fillStyle(0xfff4c2, 0.9);
        pathNodeG2.fillCircle(tp.x, tp.y, nr * 0.4);
      });
    }
  }

  _drawSegment(g: Phaser.GameObjects.Graphics, ax: number, ay: number, bx: number, by: number, lineColor = 0xff6d00, haloColor = 0xffd248): void {
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
    this.hideGrassHover();
    this.events.emit(SCENE_EVENTS.CHAIN_UPDATE, null);
    this.clearDimming();
    const minChain = this._effectiveMinChain();
    if (this.path.length >= minChain) this.collectPath();
    else this.clearPath(true);
    if (this._deferredTool) {
      const tool = this._deferredTool;
      this._deferredTool = null;
      // The registry already holds `tool`; the changedata handler fired but
      // we shortcircuited because of the drag. Re-poke the registry so the
      // handler runs cleanly now that dragging is over.
      setRegistry(this.registry, "toolPending", null);
      this.time.delayedCall(60, () => setRegistry(this.registry, "toolPending", tool));
    }
  }

  dimUnselectableTiles(key: string): void {
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

  // Dim tiles that are not useful targets for the armed tool. Mirrors the
  // chain-drag dimming so the player gets the same visual signal: bright
  // tiles are the ones that will actually do something.
  applyToolDimForPower(power: ToolPower, toolKey: string): void {
    const strategy = dimStrategyForPower(power.id) ?? "none";
    if (strategy === "type_multi" || toolKey === "rune_wildcard") {
      // Sweep-by-type tools — dim resources that appear only once (sweeping
      // them only clears the tile the player tapped, which is wasted).
      const counts: Record<string, number> = {};
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = this.grid[r]?.[c];
          if (!t) continue;
          counts[t.res.key] = (counts[t.res.key] ?? 0) + 1;
        }
      }
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = this.grid[r]?.[c];
          if (!t) continue;
          t.sprite.setAlpha((counts[t.res.key] ?? 0) > 1 ? 1 : 0.35);
        }
      }
      return;
    }
    if (strategy === "flood_neighbor" || toolKey === "rake") {
      // Flood-fill tool — dim tiles with no same-key 4-neighbour, since
      // tapping them just sweeps that one tile.
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = this.grid[r]?.[c];
          if (!t) continue;
          const k = t.res.key;
          const u = this.grid[r - 1]?.[c]?.res.key === k;
          const d = this.grid[r + 1]?.[c]?.res.key === k;
          const l = this.grid[r]?.[c - 1]?.res.key === k;
          const ri = this.grid[r]?.[c + 1]?.res.key === k;
          t.sprite.setAlpha(u || d || l || ri ? 1 : 0.35);
        }
      }
      return;
    }
    this.clearDimming();
  }

  clearToolDim() {
    // Don't unstick the chain-drag dim by accident.
    if (this.dragging) return;
    this.clearDimming();
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
    this.hideGrassHover();
    this.events.emit(SCENE_EVENTS.CHAIN_UPDATE, null);
  }

  collectPath() {
    if (!this.path.length) return;
    const res = this.path[0].res;
    // Board upgrade: resolve as a TILE (via zone upgradeMap). This is what
    // spawns on the board at the chain endpoint.
    const next = this.nextUpgradeTile(res);
    // Resource progress: the resource key this chain's length contributes
    // toward (fractional accumulation in state.resourceProgress).
    const resourceKey = producedResource(res);
    // Cross-collect: partner-category tiles orthogonally adjacent to the chain
    // are also collected. Compute BEFORE we null out the path tiles below — the
    // helper needs the grid intact to inspect chain-cell neighbours.
    const crossTargets = findCrossCollectTargets(
      this.grid,
      this.path.map((t) => ({ row: t.row, col: t.col, key: t.res.key })),
    );
    const effThresholds: Record<string, number> = getRegistry(this.registry, "effectiveThresholds") ?? UPGRADE_THRESHOLDS;
    const upgrades = next ? upgradeCountForChain(this.path.length, res.key, effThresholds) : 0;
    const gained = this.path.length;
    // Bonus yields: add per-resource bonus if this chain contained that resource
    const bonusYields: Record<string, number> = getRegistry(this.registry, "bonusYields") ?? {};
    const bonusGains: Record<string, number> = {};
    if (bonusYields[res.key]) {
      bonusGains[res.key] = Math.round(bonusYields[res.key]);
    }
    // V.3 — Clamp the displayed gain to the inventory cap so float text matches what the player actually receives
    const cap = getRegistry(this.registry, "inventoryCap") ?? 200;
    const inv: Record<string, number> = getRegistry(this.registry, "inventory") ?? {};
    const isCapped = (CAPPED_TILES as readonly string[]).includes(res.key);
    const currentAmt = inv[res.key] ?? 0;
    const wouldGain = gained + (bonusGains[res.key] ?? 0);
    const actualGain = isCapped ? Math.max(0, Math.min(cap - currentAmt, wouldGain)) : wouldGain;
    const overCap = wouldGain - actualGain > 0;

    const floatSuffix = upgrades > 0 ? `  ★×${upgrades}` : "";
    let bonusText = "";
    const keys = Object.keys(bonusGains);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k !== res.key) {
        bonusText += `  +${bonusGains[k]} ${k}★`;
      }
    }
    this.floatText(`+${actualGain} ${res.label}${overCap ? " ⓘ" : ""}${floatSuffix}${bonusText}`, this.path[this.path.length - 1].x, this.path[this.path.length - 1].y);

    // Chain-length juice — escalating screen shake and a radial wipe. Big chains
    // earn loud feedback; upgrades add an extra burst.
    this.shakeForChain(this.path.length);
    this.radialFlash(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, this.path.length);

    // Queue upgrade tiles to spawn at the endpoint after board collapse.
    // next is a tile def (from nextUpgradeTile), so assertTile guards regressions.
    if (next && upgrades > 0) {
      assertTile(next.key);
      const endpointTile = this.path[this.path.length - 1];
      for (let u = 0; u < upgrades; u++) {
        this.pendingUpgrades.push({ res: next, col: endpointTile.col, row: endpointTile.row });
      }
      this.upgradeBurst(endpointTile.x, endpointTile.y);
    }

    this.path.forEach((tile, i) => {
      this.grid[tile.row][tile.col] = null;
      this.tweens.add({
        targets: tile.sprite,
        scale: 0,
        angle: Phaser.Math.Between(-25, 25),
        alpha: 0,
        duration: this._dur(180 + i * 15),
        onComplete: () => {
          this.emitCollectParticles(tile.x, tile.y, res.look?.color || "#ffffff", 2);
          tile.destroy();
        }
      });
    });

    // Cross-collect partner tiles: clear + animate using the SAME tween /
    // destroy / particle pattern as the path tiles, and accumulate +1 toward
    // each partner's produced resource. Cross-collected tiles do NOT spawn
    // upgrade tiles and do NOT trigger further cross-collects.
    // crossCollected is keyed by TILE KEY (not produced resource). The reducer
    // resolves the produced resource + the tile's UPGRADE_THRESHOLDS entry from
    // the tile key, so partners roll up at their real threshold (mirroring the
    // main chain). buildCrossCollectedCredits is the single source of truth for
    // this tile-keyed count map.
    const crossCollected = buildCrossCollectedCredits(crossTargets);
    crossTargets.forEach((target, i) => {
      const tileObj = this.grid[target.row]?.[target.col];
      this.grid[target.row][target.col] = null;
      if (tileObj) {
        this.tweens.add({
          targets: tileObj.sprite,
          scale: 0,
          angle: Phaser.Math.Between(-25, 25),
          alpha: 0,
          duration: this._dur(180 + i * 15),
          onComplete: () => {
            this.emitCollectParticles(tileObj.x, tileObj.y, tileObj.res?.look?.color || "#ffffff", 2);
            tileObj.destroy();
          }
        });
      }
    });

    // Emit to React — gained is the full amount (state.js caps it).
    // resourceKey tells the reducer which resource to accumulate progress for.
    const totalGained = gained + ((bonusGains as Record<string, number>)[res.key] ?? 0);
    // Include tile positions so the reducer can extinguish fire/hazard cells
    const chainTiles = this.path.map(t => ({ key: t.res.key, row: t.row, col: t.col }));
    this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, { key: res.key, gained: totalGained, upgrades, chainLength: this.path.length, value: res.value, chain: chainTiles, resourceKey, crossCollected });

    // Reward burst — emit chain center in canvas-local coords so the React
    // layer can spawn a "+N" chip from the board → HUD coin pill.
    if (this.path.length > 0) {
      let sx = 0, sy = 0;
      for (const t of this.path) { sx += t.x; sy += t.y; }
      this.events.emit(SCENE_EVENTS.REWARD_BURST, {
        canvasX: sx / this.path.length,
        canvasY: sy / this.path.length,
        canvasW: this.scale?.gameSize?.width ?? 0,
        canvasH: this.scale?.gameSize?.height ?? 0,
        coins: totalGained * (res.value ?? 0),
      });
    }

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

  // ─── Grass hover (cursor-following spawn preview) ─────────────────────────
  //
  // A small badge that trails the player's finger/cursor while dragging,
  // showing how many next-tier ("grass") tiles the chain will spawn on
  // collect — i.e. `upgradeCountForChain`. Display-only: it visualizes the
  // existing tier-upgrade spawn, it does not change any mechanic.

  showGrassHover() {
    if (this.grassHover) return;
    const dpr = this.dpr;
    const w = 80 * dpr;
    const h = 44 * dpr;
    this.grassHover = this.add.container(0, 0).setDepth(60);
    const bg = rounded(this, -w / 2, -h / 2, w, h, 14 * dpr, 0x2b2218, 0.92, 0xa8c769, 2 * dpr);
    this.grassHoverIcon = this.add.image(-w / 2 + 22 * dpr, 0, "spark").setScale(0.55);
    this.grassHoverText = this.add.text(4 * dpr, 0, "", {
      fontFamily: "Arial", fontSize: `${18 * dpr}px`, color: "#cfe88f", fontStyle: "bold",
    }).setOrigin(0, 0.5);
    this.grassHover.add([bg, this.grassHoverIcon, this.grassHoverText]);
    this.grassHover.setVisible(false);
    if (this.path.length) this._positionGrassHover(this.path[0].x, this.path[0].y);
  }

  updateGrassHover() {
    if (!this.grassHover) return;
    const n = this.path.length;
    const res = n ? this.path[0].res : null;
    // Show the TILE that will spawn on the board (nextUpgradeTile).
    const next = res ? this.nextUpgradeTile(res) : null;
    // No `next` means this resource can't upgrade — nothing will ever spawn.
    if (!next) { this.grassHover.setVisible(false); return; }
    const effThresh: Record<string, number> = getRegistry(this.registry, "effectiveThresholds") ?? UPGRADE_THRESHOLDS;
    const k = upgradeCountForChain(n, res!.key, effThresh);
    // Stays visible (and trails the cursor) for the whole drag so the spawn
    // count can be watched ticking up from 0.
    this.grassHover.setVisible(true);
    const tex = `tile_${next.key}`;
    if (this.textures.exists(tex) && this.grassHoverIcon && this.grassHoverIcon.texture.key !== tex) {
      this.grassHoverIcon.setTexture(tex);
    }
    if (this.grassHoverIcon) this.grassHoverIcon.setScale(0.5 * (this.tileSpriteScale ?? 1));
    if (this.grassHoverText) this.grassHoverText.setText(`×${k}`);
  }

  _positionGrassHover(x: number, y: number): void {
    if (!this.grassHover) return;
    const dpr = this.dpr;
    const ts = this.tileSize ?? 60;
    const minY = 26 * dpr;
    // Offset up by a full tile height + padding so the badge sits clearly
    // above the tile rather than overlapping it, and nudge right so it reads
    // as adjacent to the tile rather than centered on the cursor.
    // The badge is an 80×44 (css px) container centered on its position —
    // clamp the center so edge-column drags keep it fully on-canvas.
    const halfW = 40 * dpr;
    const pad = 4 * dpr;
    const rawX = x + ts * 0.55;
    const clampedX = Math.min(Math.max(rawX, halfW + pad), this.scale.width - halfW - pad);
    this.grassHover.setPosition(clampedX, Math.max(minY, y - ts * 0.9));
  }

  hideGrassHover() {
    if (!this.grassHover) return;
    this.grassHover.destroy();
    this.grassHover = null;
    this.grassHoverIcon = null;
    this.grassHoverText = null;
  }

  _emitChainUpdate() {
    const payload = buildChainUpdatePayload({
      path: this.path,
      nextUpgradeTile: (res: { key: string }) => this.nextUpgradeTile(res),
      effectiveThresholds: getRegistry(this.registry, "effectiveThresholds"),
      effectiveMinChain: this._effectiveMinChain(),
    });
    this.events.emit(SCENE_EVENTS.CHAIN_UPDATE, payload);
  }

  // ─── Juice (chain-length feedback) ────────────────────────────────────────

  shakeForChain(len: number): void {
    if (len < 3) return;
    // 3 → barely; 6 → noticeable; 10+ → bone-rattling.
    const intensity = Math.min(0.018, 0.0025 + (len - 3) * 0.0028);
    const duration = Math.min(520, 160 + (len - 3) * 50);
    this._shake(duration, intensity);
  }

  radialFlash(x: number, y: number, len: number) {
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

  upgradeBurst(x: number, y: number) {
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

  floatText(msg: string, x: number, y: number) {
    const dpr = this.dpr;
    const t = this.add.text(x, y, msg, { fontFamily: "Arial", fontSize: `${22 * dpr}px`, color: cssColor(FLOAT_TEXT_COLOR), fontStyle: "bold", stroke: "#000", strokeThickness: 5 * dpr }).setOrigin(0.5).setDepth(20).setScale(0.7);
    this.tweens.add({ targets: t, scale: 1, duration: 120, ease: "Back.Out" });
    this.tweens.add({ targets: t, y: y - 58 * dpr, alpha: 0, delay: 120, duration: 780, onComplete: () => t.destroy() });
    this.events.emit(SCENE_EVENTS.CHAIN_FLOAT_TEXT, { text: msg });
  }

  // Called every frame by Phaser. Drives the per-tile ambient sway.
  override update(time: number) {
    for (let r = 0; r < ROWS; r++) {
      const row = this.grid[r];
      if (!row) continue;
      for (let c = 0; c < COLS; c++) {
        const t = row[c];
        if (t) t.ambient(time);
      }
    }
    // Seasonal tile animation: re-bake the (shared) textures of animated
    // seasonal tiles on the board at ~20fps. Throttled + distinct-key only, so
    // the cost is ≤5 small texture redraws per tick (usually 1, often 0).
    if (this._motionEnabled() && time - this._seasonalAnimLast >= 50) {
      this._seasonalAnimLast = time;
      this._animateSeasonalTiles(time / 1000);
    }
    if (isConceptTileIconsEnabled()) {
      if (!conceptTilesPreloadReady()) {
        preloadConceptTileGifs().then(() => {
          if (this.scene.isActive()) this._animateConceptTiles(time / 1000);
        });
      } else if (this._motionEnabled() && time - this._conceptAnimLast >= 50) {
        this._conceptAnimLast = time;
        this._animateConceptTiles(time / 1000);
      }
    }
  }

  /** Whether per-frame motion should play. Honors prefers-reduced-motion; the
   *  correct seasonal STATIC art is still baked when motion is off. */
  private _motionEnabled(): boolean {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      try {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      } catch {
        // matchMedia may throw in some embedded webviews — treat as enabled.
      }
    }
    return true;
  }

  /** Re-bake distinct on-board seasonal tiles that have an animation for the
   *  current season, at elapsed time `tSec` (seconds — same clock the gallery
   *  uses). Mutates the shared `tile_<key>` texture so all instances update. */
  /** Re-bake concept-tile GIF frames when `?conceptTiles=1` is set. */
  private _animateConceptTiles(tSec: number) {
    const reps = new Map<string, TileRes>();
    for (let r = 0; r < ROWS; r++) {
      const row = this.grid[r];
      if (!row) continue;
      for (let c = 0; c < COLS; c++) {
        const t = row[c];
        if (t && !reps.has(t.res.key) && hasConceptTileAnim(t.res.key)) {
          reps.set(t.res.key, t.res);
        }
      }
    }
    if (reps.size === 0) return;
    const dpr = this.bakeScale || this.dpr;
    for (const res of reps.values()) {
      const tex = this.textures.get(`tile_${res.key}`) as Phaser.Textures.CanvasTexture | undefined;
      if (!tex || typeof tex.getContext !== "function") continue;
      const ctx = tex.getContext();
      if (!ctx) continue;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintTileCanvas(ctx, res as { key: string; look: { color: number } }, false, TILE, TILE, null, tSec);
      tex.refresh();
    }
  }

  private _animateSeasonalTiles(tSec: number) {
    const season = currentSeasonName(this);
    if (!season) return;
    // Collect one representative TileObj.res per distinct animated key present.
    const reps = new Map<string, TileRes>();
    for (let r = 0; r < ROWS; r++) {
      const row = this.grid[r];
      if (!row) continue;
      for (let c = 0; c < COLS; c++) {
        const t = row[c];
        if (t && !reps.has(t.res.key) && hasSeasonalTileAnim(t.res.key, season)) {
          reps.set(t.res.key, t.res);
        }
      }
    }
    if (reps.size === 0) return;
    const dpr = this.bakeScale || this.dpr;
    for (const res of reps.values()) {
      const tex = this.textures.get(`tile_${res.key}`) as Phaser.Textures.CanvasTexture | undefined;
      if (!tex || typeof tex.getContext !== "function") continue;
      const ctx = tex.getContext();
      if (!ctx) continue;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintTileCanvas(ctx, res as { key: string; look: { color: number } }, false, TILE, TILE, season, tSec);
      tex.refresh();
    }
  }
}
