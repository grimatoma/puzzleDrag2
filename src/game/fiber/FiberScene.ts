/**
 * FiberScene — the forked Phaser scene for Fiber Crush. Deliberately a THIN
 * renderer over the pure resolver (`./resolver.ts`): all match/cascade logic
 * lives in the unit-tested module; the scene only draws the grid, reads
 * adjacent-swap input, and emits the resolved tally back to React.
 *
 * It does NOT touch `window.__phaserScene` — the main board owns that. Fiber
 * exposes `window.__fiberScene` and routes results to React via scene events
 * (mirroring how GameScene emits CHAIN_COLLECTED).
 */
import Phaser from "phaser";
import {
  type FiberGrid,
  type FiberColor,
  type FiberSpecial,
  FIBER_COLORS,
  isValidSwap,
  hasAnyValidSwap,
  resolveSwap,
  generateBoard,
} from "./resolver.js";
import type { FiberLevel } from "./levels.js";
import { FiberTile } from "./FiberTile.js";

/** Scene → React event: one resolved move (the economy credit). */
export const FIBER_MOVE_EVENT = "fiber-move";
/** Scene → React event: the scene has booted and drawn its first board. */
export const FIBER_READY_EVENT = "fiber-ready";
/** Registry keys written by React (FiberCanvas). */
export const FIBER_REG = {
  level: "fiber.level",
  locked: "fiber.locked",
  seed: "fiber.seed",
} as const;

interface CellRef { r: number; c: number; }

const DEFAULT_LEVEL: FiberLevel = {
  id: "L1", name: "Fiber", cols: 7, rows: 7, colors: [...FIBER_COLORS], moves: 20,
  objectives: [], reward: { coins: 0, resources: {} },
};

export class FiberScene extends Phaser.Scene {
  private level: FiberLevel = DEFAULT_LEVEL;
  private cols = 7;
  private rows = 7;
  private colors: FiberColor[] = [...FIBER_COLORS];
  private grid: FiberGrid = [];
  private tiles: FiberTile[][] = [];
  private originX = 0;
  private originY = 0;
  private tileSize = 48;
  private selected: CellRef | null = null;
  private downCell: CellRef | null = null;
  private downX = 0;
  private downY = 0;
  private animating = false;
  private rngState = 0x9e3779b9;

  constructor() {
    super("FiberScene");
  }

  create(): void {
    const lvl = this.registry.get(FIBER_REG.level) as FiberLevel | undefined;
    this.level = lvl ?? DEFAULT_LEVEL;
    this.cols = Math.max(3, this.level.cols);
    this.rows = Math.max(3, this.level.rows);
    this.colors = (this.level.colors?.length ? this.level.colors : [...FIBER_COLORS]) as FiberColor[];
    const seed = this.registry.get(FIBER_REG.seed);
    this.rngState = (typeof seed === "number" ? seed : Math.floor(Math.random() * 0xffffffff)) >>> 0;

    this.buildBoard();
    this.layout();
    this.createTiles();
    this.renderBoard();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);

    if (typeof window !== "undefined") {
      (window as unknown as { __fiberScene?: FiberScene }).__fiberScene = this;
    }
    this.events.emit(FIBER_READY_EVENT);
  }

  // ── RNG (local, seeded; the resolver itself stays pure) ───────────────────
  private rng(): number {
    // mulberry32
    let a = (this.rngState = (this.rngState + 0x6d2b79f5) >>> 0);
    a = Math.imul(a ^ (a >>> 15), 1 | a);
    a = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  }
  private pickColor = (): FiberColor =>
    this.colors[Math.min(this.colors.length - 1, Math.floor(this.rng() * this.colors.length))];

  private buildBoard(): void {
    this.grid = generateBoard(this.rows, this.cols, this.colors, () => this.rng());
    if (this.level.spawnSpecials) this.seedSpecials();
  }

  /** Scatter a couple of booster specials onto interior cells (no new matches). */
  private seedSpecials(): void {
    const specials: FiberSpecial[] = ["spindle", "dyevat", "loom"];
    let placed = 0;
    let guard = 0;
    while (placed < specials.length && guard < 200) {
      guard++;
      const r = 1 + Math.floor(this.rng() * (this.rows - 2));
      const c = 1 + Math.floor(this.rng() * (this.cols - 2));
      const cell = this.grid[r][c];
      if (cell && !cell.special) {
        cell.special = specials[placed];
        placed++;
      }
    }
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const margin = Math.round(Math.min(w, h) * 0.04);
    const usableW = w - margin * 2;
    const usableH = h - margin * 2;
    this.tileSize = Math.floor(Math.min(usableW / this.cols, usableH / this.rows));
    const boardW = this.tileSize * this.cols;
    const boardH = this.tileSize * this.rows;
    this.originX = Math.round((w - boardW) / 2);
    this.originY = Math.round((h - boardH) / 2);
  }

  private createTiles(): void {
    for (const row of this.tiles) for (const t of row) t.destroy();
    this.tiles = [];
    for (let r = 0; r < this.rows; r++) {
      const row: FiberTile[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(new FiberTile(this, this.cellX(c), this.cellY(r), this.tileSize));
      }
      this.tiles.push(row);
    }
  }

  private cellX(c: number): number { return this.originX + c * this.tileSize; }
  private cellY(r: number): number { return this.originY + r * this.tileSize; }

  private renderBoard(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        const sel = this.selected?.r === r && this.selected?.c === c;
        this.tiles[r][c].setLayout(this.cellX(c), this.cellY(r), this.tileSize);
        this.tiles[r][c].redraw(cell?.color ?? null, cell?.special ?? null, !!sel);
      }
    }
  }

  private onResize(): void {
    this.layout();
    this.renderBoard();
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  private cellAt(x: number, y: number): CellRef | null {
    const c = Math.floor((x - this.originX) / this.tileSize);
    const r = Math.floor((y - this.originY) / this.tileSize);
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
    return { r, c };
  }

  private isLocked(): boolean {
    return this.animating || !!this.registry.get(FIBER_REG.locked);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isLocked()) return;
    const cell = this.cellAt(pointer.x, pointer.y);
    this.downCell = cell;
    this.downX = pointer.x;
    this.downY = pointer.y;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isLocked()) { this.downCell = null; return; }
    const start = this.downCell;
    this.downCell = null;
    if (!start) return;
    const dx = pointer.x - this.downX;
    const dy = pointer.y - this.downY;
    const thresh = this.tileSize * 0.4;

    if (Math.abs(dx) > thresh || Math.abs(dy) > thresh) {
      // Drag-to-neighbour swap in the dominant cardinal direction.
      const dir = Math.abs(dx) > Math.abs(dy)
        ? { r: 0, c: dx > 0 ? 1 : -1 }
        : { r: dy > 0 ? 1 : -1, c: 0 };
      this.clearSelection();
      this.trySwap(start.r, start.c, start.r + dir.r, start.c + dir.c);
      return;
    }

    // Tap: select, then tap an adjacent tile to swap.
    if (this.selected && this.isAdjacent(this.selected, start)) {
      const sel = this.selected;
      this.clearSelection();
      this.trySwap(sel.r, sel.c, start.r, start.c);
    } else if (this.selected && this.selected.r === start.r && this.selected.c === start.c) {
      this.clearSelection();
    } else {
      this.setSelection(start);
    }
  }

  private isAdjacent(a: CellRef, b: CellRef): boolean {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  private setSelection(cell: CellRef): void {
    this.selected = cell;
    this.renderBoard();
  }
  private clearSelection(): void {
    if (!this.selected) return;
    this.selected = null;
    this.renderBoard();
  }

  /**
   * Public swap entry — used by input handlers AND by tests/manual driving via
   * `window.__fiberScene.trySwap(...)`. Resolves a legal swap and emits the
   * resolved tally; rejects an illegal swap with a small bounce.
   */
  trySwap(r1: number, c1: number, r2: number, c2: number): boolean {
    if (this.isLocked()) return false;
    if (r2 < 0 || r2 >= this.rows || c2 < 0 || c2 >= this.cols) return false;
    if (!isValidSwap(this.grid, r1, c1, r2, c2)) {
      this.bounce(r1, c1, r2, c2);
      return false;
    }
    this.animating = true;
    const result = resolveSwap(this.grid, { r1, c1, r2, c2 }, this.pickColor);
    this.grid = result.grid;
    this.ensureSolvable();
    this.renderBoard();
    this.flashSwap(r1, c1, r2, c2);
    this.events.emit(FIBER_MOVE_EVENT, {
      cleared: result.cleared,
      created: result.created,
      movesSpent: result.movesSpent,
    });
    this.animating = false;
    return true;
  }

  /** Reshuffle until the board has at least one legal swap (no soft-lock). */
  private ensureSolvable(): void {
    let guard = 0;
    while (!hasAnyValidSwap(this.grid) && guard < 20) {
      this.grid = generateBoard(this.rows, this.cols, this.colors, () => this.rng());
      guard++;
    }
  }

  /** First legal swap found scanning the board, or null. Used by autoMove / tests. */
  firstValidSwap(): { r1: number; c1: number; r2: number; c2: number } | null {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols && isValidSwap(this.grid, r, c, r, c + 1)) return { r1: r, c1: c, r2: r, c2: c + 1 };
        if (r + 1 < this.rows && isValidSwap(this.grid, r, c, r + 1, c)) return { r1: r, c1: c, r2: r + 1, c2: c };
      }
    }
    return null;
  }

  /** Perform one legal swap if available. Returns true if a move was made. */
  autoMove(): boolean {
    const s = this.firstValidSwap();
    if (!s) return false;
    return this.trySwap(s.r1, s.c1, s.r2, s.c2);
  }

  /** Read-only colour grid, for tests / manual inspection via the bridge. */
  getGridColors(): (FiberColor | null)[][] {
    return this.grid.map((row) => row.map((cell) => cell?.color ?? null));
  }

  getGrid(): FiberGrid {
    return this.grid;
  }

  private bounce(r1: number, c1: number, r2: number, c2: number): void {
    for (const [r, c] of [[r1, c1], [r2, c2]]) {
      const t = this.tiles[r]?.[c];
      if (!t) continue;
      this.tweens.add({ targets: t.container, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 1, onComplete: () => t.container.setAngle(0) });
    }
  }

  private flashSwap(r1: number, c1: number, r2: number, c2: number): void {
    for (const [r, c] of [[r1, c1], [r2, c2]]) {
      const t = this.tiles[r]?.[c];
      if (!t) continue;
      this.tweens.add({ targets: t.container, scale: { from: 1.12, to: 1 }, duration: 130, ease: "Back.out" });
    }
  }

  shutdown(): void {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    if (typeof window !== "undefined" && (window as unknown as { __fiberScene?: FiberScene }).__fiberScene === this) {
      (window as unknown as { __fiberScene?: FiberScene | null }).__fiberScene = null;
    }
  }
}
