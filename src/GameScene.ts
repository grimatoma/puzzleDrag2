import Phaser from "phaser";

import {
  startPath,
  tryAddToPath,
  addToPath,
  redrawPath,
  _repaintPathColors,
  _drawSegment,
  endPath,
  clearPath,
  collectPath,
  _emitChainUpdate
} from "./game/pathLogic.js";


import {
  fillBoard,
  collapseBoard,
  shuffleBoard,
  _forceGuaranteedChain,
  _performShuffleSwap,
  rebuildGridFromState,
  _applyGridFromState,
  _syncGridToState
} from "./game/boardLogic.js";

import { TILE, COLS, ROWS, UPGRADE_THRESHOLDS, SEASONS, BIOMES, SCENE_EVENTS, getItem, tileFamilyResource, TILES_WITH_CUSTOM_OUTPUT } from "./constants.js";
import { upgradeCountForChain, rollResource } from "./utils.js";
import { resourceByKey } from "./state/helpers.js";
import { computeAggregatedAbilities } from "./features/workers/aggregate.js";
import { CATEGORY_OF } from "./features/tileCollection/data.js";
import {
  pickByZoneSeasonDrops,
  seasonIndexInSession,
  seasonNameInSession,
  ZONES,
  ZONE_UPGRADE_TARGET_GOLD,
  TILE_CATEGORY_TO_ZONE_CATEGORY,
  ZONE_TO_TILE_CATEGORIES,
} from "./features/zones/data.js";
import type { TileRes } from "./TileObj.js";
const cssColor = (num: number): string => Phaser.Display.Color.IntegerToColor(num).rgba;
import { rounded, makeTextures, regenerateTextures } from "./textures.js";
import { TileObj } from "./TileObj.js";
import { computeBakeScale, hasValidChain } from "./game/chain.js";
export { computeBakeScale, hasValidChain } from "./game/chain.js";
export { producedResource, buildChainUpdatePayload } from "./game/producedResource.js";
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
  _hazardTimer: Phaser.Time.TimerEvent | null = null;

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

    if (this._hazardTimer) { this._hazardTimer.remove(); this._hazardTimer = null; }

    if (!hasFire && !hasRats) {
      this.hazardVignette.clear();
      return;
    }

    this._hazardTimer = this.time.addEvent({
      delay: 120,
      callback: () => {
        this.hazardVignette.clear();
        const w = this.scale.width;
        const h = this.scale.height;
        if (hasFire) {
          const alpha = 0.06 + Math.random() * 0.08;
          this.hazardVignette.fillStyle(0xff6600, alpha);
          this.hazardVignette.fillRect(0, 0, w, h);
        }
        if (hasRats) {
          this.hazardVignette.fillStyle(0x666666, hasFire ? 0.05 : 0.12);
          this.hazardVignette.fillRect(0, 0, w, h);
        }
      },
      loop: true,
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
    tag(this.add.rectangle(this.boardX - frame * 0.6, this.boardY + boardH + frame * 0.6 - stripH, boardW + frame * 1.2, stripH, s.bg, 0.55).setOrigin(0, 0).setDepth(-1));
  }

  refreshSeasonTint() {
    (this.children.list as Array<Phaser.GameObjects.GameObject & { __layer?: string }>).filter((o) => o.__layer === "bg").forEach((o) => o.destroy());
    this.drawBackground();
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
    const zone = ZONES[zoneId];
    if (!zone?.upgradeMap) return null;
    const targetZoneCat = zone.upgradeMap[sourceZoneCat];
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
    const turnBudget = getRegistry(this.registry, "turnBudget") ?? ZONES[zoneId].baseTurns ?? 10;
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
    _syncGridToState.call(this);
  }

  _applyGridFromState(stateGrid: RegistryGrid | null | undefined): void {
    _applyGridFromState.call(this, stateGrid);
  }

  /** Replace every live tile from a serialized grid (visual demo reload). */
  rebuildGridFromState(stateGrid: RegistryGrid | null | undefined): void {
    rebuildGridFromState.call(this, stateGrid);
  }

  // ─── Board fill / collapse ────────────────────────────────────────────────

  fillBoard(initial = false) {
    fillBoard.call(this, initial);
  }

  collapseBoard() {
    collapseBoard.call(this);
  }

  shuffleBoard(attempt = 0) {
    shuffleBoard.call(this, attempt);
  }

  _forceGuaranteedChain() {
    _forceGuaranteedChain.call(this);
  }

  _performShuffleSwap(): void {
    _performShuffleSwap.call(this);
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
      const picks = cells.map(({ row, col }) => this.grid[row]?.[col]).filter((t): t is TileObj => t != null);
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

    const tileObjs = cells.map(({ row, col }) => this.grid[row]?.[col]).filter((t): t is TileObj => t != null);
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
    startPath.call(this, tile);
  }

  tryAddToPath(tile: TileObj): void {
    tryAddToPath.call(this, tile);
  }

  addToPath(tile: TileObj): void {
    addToPath.call(this, tile);
  }

  redrawPath() {
    redrawPath.call(this);
  }

  // Cheap version of redrawPath that just re-colors existing line graphics
  // and the node ring with the current _pathValidProgress. Called on every
  // tween frame during a validity flip so colors blend instead of snap.
  _repaintPathColors() {
    _repaintPathColors.call(this);
  }

  _drawSegment(g: Phaser.GameObjects.Graphics, ax: number, ay: number, bx: number, by: number, lineColor = 0xff6d00, haloColor = 0xffd248): void {
    _drawSegment.call(this, g, ax, ay, bx, by, lineColor, haloColor);
  }

  endPath() {
    endPath.call(this);
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
    clearPath.call(this, deselect);
  }

  collectPath() {
    collectPath.call(this);
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
    this.grassHover.setPosition(x + ts * 0.55, Math.max(minY, y - ts * 0.9));
  }

  hideGrassHover() {
    if (!this.grassHover) return;
    this.grassHover.destroy();
    this.grassHover = null;
    this.grassHoverIcon = null;
    this.grassHoverText = null;
  }

  _emitChainUpdate() {
    _emitChainUpdate.call(this);
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
  }
}
