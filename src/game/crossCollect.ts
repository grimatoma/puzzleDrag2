/**
 * Cross-collect — the "partner category" board mechanic.
 *
 * When the player collects a chain, any board tile whose CATEGORY is the
 * "partner" of the chain's category AND is orthogonally adjacent to any tile in
 * the chain is also collected (cleared + credited +1 toward its own produced
 * resource).
 *
 * This module is pure (no Phaser/React) so it can be unit-tested without
 * booting the scene. It mirrors the adjacency + hazard-skip conventions used by
 * `src/config/tileSelectors.ts` (`cellAt`, `HAZARD_LOCKED`, `DIRS4`).
 */
import { CATEGORY_OF } from "../features/tileCollection/data.js";

/**
 * Fixed, bidirectional, GLOBAL partner map. Both directions of each pair are
 * listed explicitly so a lookup is a single O(1) read regardless of which side
 * the chain is on. Category names are the exact ones from `CATEGORIES` in
 * `src/features/tileCollection/data.ts`.
 */
export const CROSS_COLLECT_PAIRINGS: Record<string, string> = Object.freeze({
  grass: "grain",
  grain: "grass",
  fruits: "trees",
  trees: "fruits",
  vegetables: "herd_animals",
  herd_animals: "vegetables",
  cattle: "mounts",
  mounts: "cattle",
});

/**
 * Orthogonal neighbours only (no diagonals). Intentional local copy: this
 * module is kept Phaser/React-free and self-contained, and the order is
 * irrelevant here (we dedupe by row,col). tileSelectors.DIRS4 carries the same
 * four offsets in a different order.
 */
const DIRS4 = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;

/** A board cell as seen by this helper — either `.key` or `.res.key` carries the tile key. */
interface LooseCell {
  key?: string | null;
  res?: { key?: string | null } | null;
  rubble?: unknown;
  gas?: unknown;
  frozen?: unknown;
}

/** A path entry supplied by the caller. */
export interface CrossCollectPathCell {
  row: number;
  col: number;
  key: string;
}

/** A resolved cross-collect target. */
export interface CrossCollectTarget {
  row: number;
  col: number;
  key: string;
}

/** Resolve a cell's tile key from either `.key` or `.res.key`. */
function cellKey(cell: LooseCell | null | undefined): string | null {
  if (!cell) return null;
  if (typeof cell.key === "string" && cell.key) return cell.key;
  const rk = cell.res?.key;
  return typeof rk === "string" && rk ? rk : null;
}

/** Hazard-locked test — mirrors tileSelectors.HAZARD_LOCKED. */
function hazardLocked(cell: LooseCell | null | undefined): boolean {
  return !!(cell && (cell.rubble || cell.gas || cell.frozen || cellKey(cell) === "rat"));
}

/** Category for a tile key (or null when the key is not in the catalog). */
function categoryOf(key: string | null | undefined): string | null {
  if (!key) return null;
  return (CATEGORY_OF as Record<string, string | undefined>)[key] ?? null;
}

/**
 * Find the unique partner tiles that should be cross-collected for a chain.
 *
 * @param grid       The board 2D array. Cells expose the tile key via `.key` OR
 *                   `.res.key`; null / hazard-locked cells are treated as absent.
 * @param pathCells  The chain path as `{ row, col, key }[]`.
 * @returns          The unique partner cells `{ row, col, key }[]` (deduped by
 *                   row,col; chain cells excluded).
 */
export function findCrossCollectTargets(
  grid: ReadonlyArray<ReadonlyArray<LooseCell | null | undefined>> | null | undefined,
  pathCells: ReadonlyArray<CrossCollectPathCell> | null | undefined,
): CrossCollectTarget[] {
  if (!grid || !pathCells || pathCells.length === 0) return [];

  const chainCategory = categoryOf(pathCells[0]?.key);
  if (!chainCategory) return [];

  const partnerCategory = CROSS_COLLECT_PAIRINGS[chainCategory];
  if (!partnerCategory) return [];

  // Exclude chain cells themselves from being treated as partners.
  const inPath = new Set<string>();
  for (const p of pathCells) inPath.add(`${p.row},${p.col}`);

  const seen = new Set<string>();
  const out: CrossCollectTarget[] = [];

  for (const p of pathCells) {
    for (const [dr, dc] of DIRS4) {
      const nr = p.row + dr;
      const nc = p.col + dc;
      const id = `${nr},${nc}`;
      if (inPath.has(id) || seen.has(id)) continue;
      const cell = grid[nr]?.[nc];
      if (!cell || hazardLocked(cell)) continue;
      const key = cellKey(cell);
      if (!key) continue;
      if (categoryOf(key) !== partnerCategory) continue;
      seen.add(id);
      out.push({ row: nr, col: nc, key });
    }
  }

  return out;
}

/**
 * Build the `crossCollected` payload map (TILE KEY → +count) for a set of
 * cross-collect targets. Each partner contributes +1 keyed by its TILE KEY.
 *
 * Keying by tile key (rather than produced resource) is deliberate: the reducer
 * needs the tile key to look up the partner's `UPGRADE_THRESHOLDS[tileKey]` —
 * thresholds are keyed by tile key, not resource key. The reducer resolves the
 * produced resource (via `producedResource`) for progress + inventory. This
 * mirrors the main chain, which also carries the tile key for its threshold.
 */
export function buildCrossCollectedCredits(
  targets: ReadonlyArray<CrossCollectTarget>,
): Record<string, number> {
  const credits: Record<string, number> = {};
  for (const t of targets) {
    credits[t.key] = (credits[t.key] ?? 0) + 1;
  }
  return credits;
}
