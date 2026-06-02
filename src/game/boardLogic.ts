import Phaser from "phaser";
import { COLS, ROWS, SCENE_EVENTS, getItem } from "../constants.js";
import { resourceByKey } from "../state/helpers.js";
import { applySpawnPoolModifiers } from "../features/farm/poolMath.js";
import { CATEGORY_OF } from "../features/tileCollection/data.js";
import { expandZoneCategories, seasonNameInSession } from "../features/zones/data.js";
import type { TileRes } from "../TileObj.js";
import { TileObj } from "../TileObj.js";
import { hasValidChain } from "./chain.js";
import type { RegistryGrid } from "../types/phaserRegistry.js";
import { getRegistry } from "../types/phaserRegistry.js";
import type { GameScene } from "../GameScene.js";

export function _syncGridToState(this: GameScene, )  {
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

export function _applyGridFromState(this: GameScene, stateGrid: RegistryGrid | null | undefined): void  {
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

export function rebuildGridFromState(this: GameScene, stateGrid: RegistryGrid | null | undefined): void  {
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

export function fillBoard(this: GameScene, initial = false)  {
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
          const idx = this.pendingUpgrades.findIndex((u: { res: TileRes; col: number; row: number }) => u.col === c);
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
          this.emitCollectParticles(x, y, (res as { color?: string }).color || "#ffd248", 4);
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

export function collapseBoard(this: GameScene, )  {
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

export function shuffleBoard(this: GameScene, attempt = 0)  {
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

export function _forceGuaranteedChain(this: GameScene, )  {
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

export function _performShuffleSwap(this: GameScene, ): void  {
  const tiles = this.grid.flat().filter((t): t is TileObj => t !== null && t !== undefined);
  const resources = tiles.map((t) => t.res);
  Phaser.Utils.Array.Shuffle(resources);
  tiles.forEach((t: TileObj, i: number) => {
    t.setResource(resources[i]);
    this.tweens.add({ targets: t.sprite, angle: 360, duration: this._dur(300), onComplete: () => (t.sprite.angle = 0) });
  });
  this._syncGridToState();
}
