import { describe, it, expect } from "vitest";
import { COLS, ROWS } from "../constants.js";
import { selectTilesForPower } from "../config/tileSelectors.js";

function gridFrom(rows) {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push({ key: rows[r]?.[c] ?? "tile_grass_grass" });
    }
    grid.push(row);
  }
  return grid;
}

function coords(cells) {
  return cells.map((c) => `${c.row},${c.col}`).sort();
}

describe("tileSelectors", () => {
  it("clear_row selects entire row of tap", () => {
    const grid = gridFrom([
      ["tile_tree_oak", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass"],
      ["tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass"],
    ]);
    const cells = selectTilesForPower("clear_row", grid, {}, { row: 0, col: 2 });
    expect(cells).toHaveLength(6);
    expect(cells.every((c) => c.row === 0)).toBe(true);
  });

  it("clear_column selects entire column of tap", () => {
    const grid = gridFrom([
      ["tile_tree_oak", "tile_grass_grass"],
      ["tile_grass_grass", "tile_tree_oak"],
    ]);
    const cells = selectTilesForPower("clear_column", grid, {}, { row: 1, col: 1 });
    expect(coords(cells)).toEqual(
      ["0,1", "1,1", "2,1", "3,1", "4,1", "5,1"].sort(),
    );
  });

  it("clear_cross is row ∪ column through tap", () => {
    const grid = gridFrom([
      ["tile_grass_grass", "tile_grass_grass"],
      ["tile_grass_grass", "tile_tree_oak"],
    ]);
    const cells = selectTilesForPower("clear_cross", grid, {}, { row: 1, col: 1 });
    const set = new Set(coords(cells));
    expect(set.has("1,1")).toBe(true);
    expect([...set].filter((id) => id.startsWith("1,")).length).toBe(COLS);
    expect([...set].filter((id) => id.endsWith(",1")).length).toBe(ROWS);
  });

  it("clear_component flood-matches tapped key only", () => {
    const grid = gridFrom([]);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = { key: "tile_tree_oak" };
      }
    }
    grid[2][2] = { key: "tile_grass_grass" };
    grid[2][3] = { key: "tile_grass_grass" };
    grid[3][2] = { key: "tile_grass_grass" };
    grid[3][3] = { key: "tile_grass_grass" };
    const cells = selectTilesForPower("clear_component", grid, {}, { row: 2, col: 2 });
    expect(cells).toHaveLength(4);
    expect(cells.every((c) => c.key === "tile_grass_grass")).toBe(true);
  });

  it("clear_random_n returns at most N cells", () => {
    const grid = gridFrom([]);
    const cells = selectTilesForPower("clear_random_n", grid, { count: 6 });
    expect(cells.length).toBeLessThanOrEqual(6);
    expect(cells.length).toBeGreaterThan(0);
  });

  it("area_blast selects 3×3 neighborhood", () => {
    const grid = gridFrom([]);
    const cells = selectTilesForPower("area_blast", grid, { radius: 1 }, { row: 2, col: 2 });
    expect(cells.length).toBe(9);
  });

  it("tap_clear_type selects all tiles matching tapped key", () => {
    const grid = gridFrom([
      ["tile_tree_oak", "tile_grass_grass"],
      ["tile_tree_oak", "tile_grass_grass"],
    ]);
    const cells = selectTilesForPower("tap_clear_type", grid, {}, { row: 0, col: 0 });
    expect(cells).toHaveLength(2);
    expect(cells.every((c) => c.key === "tile_tree_oak")).toBe(true);
  });
});
