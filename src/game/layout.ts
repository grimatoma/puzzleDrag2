/**
 * Pure board-layout math, extracted from GameScene so it can be unit-tested
 * without booting Phaser (which requires `window`). The scene reads
 * `this.scale.width/height` / `this.dpr` and hands the plain numbers here; the
 * arithmetic mirrors the former inline `layoutDims()` body byte-for-byte so the
 * rendered board stays pixel-identical (visual goldens unchanged).
 */
import { TILE, COLS, ROWS } from "../constants.js";
import { BREAKPOINTS } from "../ui/breakpoints.js";

/**
 * Single decorative frame around the tiles, in CSS pixels. Thinner on narrow
 * viewports so the board can stretch as wide as possible.
 */
export function boardFrameFor(cssVw: number): number {
  return cssVw < BREAKPOINTS.boardFrameNarrow ? 8 : 14;
}

export interface LayoutInput {
  /** Device pixel ratio (canvas px per CSS px). */
  dpr: number;
  /** Viewport width in canvas (device) px — `this.scale.width`. */
  vw: number;
  /** Viewport height in canvas (device) px — `this.scale.height`. */
  vh: number;
  /**
   * Current bake scale (textures are baked at TILE * bakeScale canvas px).
   * Falsy values fall back to `dpr`, mirroring the scene's `this.bakeScale || dpr`.
   */
  bakeScale: number;
}

export interface LayoutDims {
  tileSize: number;
  tileScale: number;
  tileSpriteScale: number;
  boardX: number;
  boardY: number;
  boardFrame: number;
}

/**
 * Compute the board's tile size, scales, and centred origin from the viewport.
 * All inputs/outputs are in canvas (device) pixels. Pure — no Phaser.
 */
export function computeLayout({ dpr, vw, vh, bakeScale }: LayoutInput): LayoutDims {
  const boardFrame = boardFrameFor(vw / dpr) * dpr;
  const margin = boardFrame;
  const maxByW = (vw - margin * 2) / COLS;
  const maxByH = (vh - margin * 2) / ROWS;
  // Let the board fill its container — only clamp a hard ceiling so
  // huge ultrawide displays don't render absurdly large tiles.
  const ceiling = TILE * 3.2 * dpr;
  const tileSize = Math.max(24 * dpr, Math.min(maxByW, maxByH, ceiling));
  // Ratio of canvas px to CSS px at current tile size.
  const tileScale = tileSize / TILE;
  // Sprite display scale: textures are baked at TILE * bakeScale canvas px, so
  // dividing by bakeScale makes a sprite at scale 1 fill exactly that.
  const bs = bakeScale || dpr;
  const tileSpriteScale = tileScale / bs;
  const boardX = Math.round((vw - COLS * tileSize) / 2);
  const boardY = Math.round((vh - ROWS * tileSize) / 2);
  return { tileSize, tileScale, tileSpriteScale, boardX, boardY, boardFrame };
}

/** Convert a world-space point to the board cell (col,row) under it. */
export function worldToCell(
  worldX: number,
  worldY: number,
  boardX: number,
  boardY: number,
  tileSize: number,
): { col: number; row: number } {
  return {
    col: Math.floor((worldX - boardX) / tileSize),
    row: Math.floor((worldY - boardY) / tileSize),
  };
}

/**
 * True when a world point lies within a tile's circular hit area (radius =
 * `factor * tileSize`, centred on the tile). The circle leaves the cell corners
 * as a neutral gutter so diagonal swipes don't snag the off-diagonal tile.
 * Boundary points (exactly on the radius) count as hits, matching the scene's
 * original `> hitR*hitR ⇒ reject` predicate.
 */
export function withinCircularHit(
  worldX: number,
  worldY: number,
  tileX: number,
  tileY: number,
  tileSize: number,
  factor = 0.6,
): boolean {
  const dx = worldX - tileX;
  const dy = worldY - tileY;
  const hitR = tileSize * factor;
  return dx * dx + dy * dy <= hitR * hitR;
}
