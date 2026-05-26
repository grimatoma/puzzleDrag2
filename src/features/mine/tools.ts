/**
 * Mine-specific tool helpers. Mirrors src/features/farm/tools.js for
 * mine-side powers (drill, magnet, transmuter, area blast).
 *
 * The board-mutation primitives live in src/state/boardMutations.js so
 * farm-side powers (e.g. trimmer/bee = transform_tiles) can share them.
 * This file is a thin convenience layer that bakes in mine-specific
 * defaults (radii, source/target tile keys) where it helps; callers can
 * also reach for the shared helpers directly.
 */

import {
  applyAreaBlast as _applyAreaBlast,
  applyTransformAdjacent as _applyTransformAdjacent,
  applyTransformAll as _applyTransformAll,
} from "../../state/boardMutations.js";
import type { Grid } from "../../types/state";

type Board = Grid;

interface BlastResult { grid: Board; collected: Record<string, number> }

/**
 * Clear every tile within `radius` (default 1) of `(row, col)`. Used by
 * `area_blast` (bomb / explosives). Pure — returns `{ grid, collected }`.
 */
export function applyAreaBlast(board: Board, row: number, col: number, radius: number = 1): BlastResult {
  return _applyAreaBlast(board, row, col, radius);
}

/**
 * Replace matching tiles inside an N-cell radius. Used by Coal Transmuter,
 * Silver Transmuter, Magnet, and other tap-target transforms.
 */
interface TransformResult { grid: Board; transformed: number }

export function applyTransformAdjacent(board: Board, row: number, col: number, radius: number, fromKeys: string[], toKey: string): TransformResult {
  return _applyTransformAdjacent(board, row, col, radius, fromKeys, toKey);
}

/**
 * Board-wide variant of {@link applyTransformAdjacent} — replaces every
 * matching tile regardless of distance. Used by Drill (special_dirt →
 * tile_mine_stone) and Trimmer (trees → tile_grass_hay).
 */
export function applyTransformAll(board: Board, fromKeys: string[], toKey: string): TransformResult {
  return _applyTransformAll(board, fromKeys, toKey);
}
