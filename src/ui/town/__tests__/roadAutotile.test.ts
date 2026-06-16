// Autotiler unit tests — lock the grass↔sand blob role→index mapping and the
// 8-neighbour classification (straights, outer corners, inner/concave corners,
// interior fill, degenerate strips). These were verified by rendering against the
// real Tuxemon tiles; this guards the mapping from silent regression.
import { describe, it, expect } from "vitest";
import {
  SAND, blankMask, sandTileFor, paintSandPaths,
  maskBandH, maskBandV, maskRect, maskDisc,
} from "../roadAutotile.js";

describe("sandTileFor — boundary classification", () => {
  it("a 3-wide horizontal band gives N-edge / interior / S-edge across its thickness", () => {
    const m = blankMask(9, 9);
    maskBandH(m, 1, 7, 4, 3); // rows 3,4,5
    expect(sandTileFor(m, 4, 3)).toBe(SAND.edgeN); // top of band
    expect(sandTileFor(m, 4, 4)).toBe(SAND.fill);  // interior
    expect(sandTileFor(m, 4, 5)).toBe(SAND.edgeS); // bottom of band
  });

  it("a 3-wide vertical band gives W-edge / interior / E-edge", () => {
    const m = blankMask(9, 9);
    maskBandV(m, 1, 7, 4, 3); // cols 3,4,5
    expect(sandTileFor(m, 3, 4)).toBe(SAND.edgeW);
    expect(sandTileFor(m, 4, 4)).toBe(SAND.fill);
    expect(sandTileFor(m, 5, 4)).toBe(SAND.edgeE);
  });

  it("a filled rect rounds its four convex (outer) corners", () => {
    const m = blankMask(9, 9);
    maskRect(m, 2, 2, 5, 5); // x 2..6, y 2..6
    expect(sandTileFor(m, 2, 2)).toBe(SAND.outerNW);
    expect(sandTileFor(m, 6, 2)).toBe(SAND.outerNE);
    expect(sandTileFor(m, 2, 6)).toBe(SAND.outerSW);
    expect(sandTileFor(m, 6, 6)).toBe(SAND.outerSE);
    expect(sandTileFor(m, 4, 4)).toBe(SAND.fill); // centre stays flat
  });

  it("a concave notch produces the matching inner corner", () => {
    // Big sand block with a single grass cell removed → its 4 diagonal sand
    // neighbours are inner corners. The cell NW of the hole rounds its SE.
    const m = blankMask(9, 9);
    maskRect(m, 1, 1, 7, 7);
    m[4][4] = false; // grass hole
    expect(sandTileFor(m, 3, 3)).toBe(SAND.innerSE); // hole is to its SE
    expect(sandTileFor(m, 5, 3)).toBe(SAND.innerSW); // hole to its SW
    expect(sandTileFor(m, 3, 5)).toBe(SAND.innerNE); // hole to its NE
    expect(sandTileFor(m, 5, 5)).toBe(SAND.innerNW); // hole to its NW
    // orthogonal neighbours of the hole are plain edges, not corners
    expect(sandTileFor(m, 4, 3)).toBe(SAND.edgeS);
  });

  it("an isolated / 1-wide cell degrades to the rounded iso tile, never crashes", () => {
    const m = blankMask(5, 5);
    m[2][2] = true; // lone sand cell, grass on all sides
    expect(sandTileFor(m, 2, 2)).toBe(SAND.iso);
  });
});

describe("paintSandPaths", () => {
  it("overlays sand only on masked cells, leaving the base grid elsewhere", () => {
    const grid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 26));
    const m = blankMask(6, 6);
    maskDisc(m, 3, 3, 2, 2);
    paintSandPaths(grid, m);
    expect(grid[3][3]).toBe(SAND.fill); // disc centre is interior sand
    expect(grid[0][0]).toBe(26);        // untouched grass corner
  });
});
