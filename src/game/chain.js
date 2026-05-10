import { TILE } from "../constants.js";

const TILE_BASE = TILE;

export function computeBakeScale(quality, dpr, tileSize) {
  if (quality === "low") return 1;
  const standard = Math.max(dpr || 1, (tileSize || TILE_BASE) / TILE_BASE);
  return quality === "ultra" ? standard * 2 : standard;
}

export function hasValidChain(grid) {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
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
