import { describe, it, expect } from "vitest";
import { computeLayout, worldToCell, withinCircularHit, boardFrameFor } from "./layout.js";
import { TILE, COLS, ROWS } from "../constants.js";

describe("boardFrameFor", () => {
  it("is 8 on narrow viewports (< 600 css px) and 14 otherwise", () => {
    expect(boardFrameFor(599)).toBe(8);
    expect(boardFrameFor(600)).toBe(14); // boundary is wide
    expect(boardFrameFor(1200)).toBe(14);
    expect(boardFrameFor(0)).toBe(8);
  });
});

describe("computeLayout", () => {
  it("clamps tileSize to the 24*dpr floor on a tiny viewport", () => {
    const a = computeLayout({ dpr: 1, vw: 50, vh: 50, bakeScale: 1 });
    expect(a.tileSize).toBe(24);
    const b = computeLayout({ dpr: 2, vw: 80, vh: 80, bakeScale: 2 });
    expect(b.tileSize).toBe(48); // 24 * dpr
  });

  it("clamps tileSize to the TILE*3.2*dpr ceiling on a huge viewport", () => {
    const a = computeLayout({ dpr: 1, vw: 10000, vh: 10000, bakeScale: 1 });
    expect(a.tileSize).toBe(TILE * 3.2);
    const b = computeLayout({ dpr: 2, vw: 20000, vh: 20000, bakeScale: 2 });
    expect(b.tileSize).toBe(TILE * 3.2 * 2);
  });

  it("sizes from the limiting viewport dimension between the clamps", () => {
    // Wide-but-short: height is the binding constraint.
    const dims = computeLayout({ dpr: 1, vw: 5000, vh: 600, bakeScale: 1 });
    const margin = boardFrameFor(5000); // dpr 1
    const maxByH = (600 - margin * 2) / ROWS;
    expect(dims.tileSize).toBeCloseTo(maxByH, 10);
  });

  it("derives tileScale = tileSize / TILE", () => {
    const dims = computeLayout({ dpr: 1, vw: 50, vh: 50, bakeScale: 1 });
    expect(dims.tileScale).toBe(dims.tileSize / TILE);
  });

  it("derives tileSpriteScale = tileScale / bakeScale", () => {
    const dims = computeLayout({ dpr: 2, vw: 600, vh: 600, bakeScale: 3 });
    expect(dims.tileSpriteScale).toBe(dims.tileScale / 3);
  });

  it("falls back to dpr when bakeScale is falsy", () => {
    const withZero = computeLayout({ dpr: 2, vw: 600, vh: 600, bakeScale: 0 });
    const expected = withZero.tileScale / 2; // bs falls back to dpr=2
    expect(withZero.tileSpriteScale).toBe(expected);
  });

  it("centres the board with integer (rounded) origins", () => {
    const dims = computeLayout({ dpr: 1, vw: 50, vh: 50, bakeScale: 1 });
    // tileSize clamped to 24 → board (144 wide) overflows the 50px viewport.
    expect(dims.boardX).toBe(Math.round((50 - COLS * 24) / 2));
    expect(dims.boardY).toBe(Math.round((50 - ROWS * 24) / 2));
    expect(Number.isInteger(dims.boardX)).toBe(true);
    expect(Number.isInteger(dims.boardY)).toBe(true);
  });

  it("rounds a half-pixel origin up (Math.round semantics)", () => {
    // vw=51 keeps the floor clamp (tileSize 24); (51-144)/2 = -46.5 → -46.
    const dims = computeLayout({ dpr: 1, vw: 51, vh: 50, bakeScale: 1 });
    expect(dims.boardX).toBe(-46);
  });

  it("sets boardFrame = boardFrameFor(vw/dpr) * dpr", () => {
    // narrow css width
    expect(computeLayout({ dpr: 2, vw: 800, vh: 800, bakeScale: 2 }).boardFrame).toBe(8 * 2); // 800/2=400 < 600
    // wide css width
    expect(computeLayout({ dpr: 2, vw: 1400, vh: 800, bakeScale: 2 }).boardFrame).toBe(14 * 2); // 1400/2=700 >= 600
  });
});

describe("worldToCell", () => {
  it("floors a world point into (col,row) relative to the board origin", () => {
    expect(worldToCell(10, 20, 10, 20, 30)).toEqual({ col: 0, row: 0 });
    expect(worldToCell(70, 20, 10, 20, 30)).toEqual({ col: 2, row: 0 });
    expect(worldToCell(39, 49, 10, 20, 30)).toEqual({ col: 0, row: 0 });
  });

  it("a point exactly on a cell boundary lands in the next cell", () => {
    // boardX=10, tileSize=30 → x=40 is the boundary between col 0 and col 1.
    expect(worldToCell(40, 50, 10, 20, 30)).toEqual({ col: 1, row: 1 });
  });

  it("returns negative indices for points left/above the board", () => {
    expect(worldToCell(9, 20, 10, 20, 30)).toEqual({ col: -1, row: 0 });
    expect(worldToCell(10, 19, 10, 20, 30)).toEqual({ col: 0, row: -1 });
  });
});

describe("withinCircularHit", () => {
  const TX = 200;
  const TY = 200;
  const TS = 100; // hitR = 0.6 * 100 = 60

  it("accepts the tile centre and points inside the radius", () => {
    expect(withinCircularHit(TX, TY, TX, TY, TS)).toBe(true);
    expect(withinCircularHit(TX, TY + 59, TX, TY, TS)).toBe(true);
  });

  it("accepts a point exactly on the radius boundary", () => {
    expect(withinCircularHit(TX, TY + 60, TX, TY, TS)).toBe(true);
  });

  it("rejects a point just outside the radius", () => {
    expect(withinCircularHit(TX, TY + 61, TX, TY, TS)).toBe(false);
  });

  it("rejects a corner clip (cell corner lies outside the circle)", () => {
    // Cell corner is (tileSize/2, tileSize/2) = (50,50) from centre →
    // dist² = 5000 > 3600 → rejected, leaving the corners as a neutral gutter.
    expect(withinCircularHit(TX + 50, TY + 50, TX, TY, TS)).toBe(false);
  });

  it("honors a custom hit factor", () => {
    // factor 0.5 → hitR = 50. dy=49 inside, dy=51 outside.
    expect(withinCircularHit(TX, TY + 49, TX, TY, TS, 0.5)).toBe(true);
    expect(withinCircularHit(TX, TY + 51, TX, TY, TS, 0.5)).toBe(false);
  });
});
