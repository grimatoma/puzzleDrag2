import { describe, it, expect } from "vitest";
import { computeBakeScale, hasValidChain } from "./chain.js";
import { TILE } from "../constants.js";

/**
 * Build a grid of `{ res: { key } }` cells from a 2D array of tile keys
 * (null/undefined → empty cell), matching the shape `hasValidChain` reads.
 */
function grid(rows: Array<Array<string | null>>): Array<Array<{ res: { key: string } } | null>> {
  return rows.map((r) => r.map((k) => (k ? { res: { key: k } } : null)));
}

describe("computeBakeScale", () => {
  it("returns max(dpr, tileSize/TILE)", () => {
    // dpr dominates
    expect(computeBakeScale(2, TILE)).toBe(2);
    expect(computeBakeScale(3, TILE)).toBe(3);
    // tileSize/TILE dominates
    expect(computeBakeScale(1, TILE * 2)).toBe(2);
    expect(computeBakeScale(2, TILE * 3)).toBe(3);
    // equal
    expect(computeBakeScale(1, TILE)).toBe(1);
  });

  it("floors a falsy dpr to 1", () => {
    expect(computeBakeScale(0, TILE)).toBe(1);
    // undefined / NaN flow through the `dpr || 1` guard at runtime; cast keeps
    // the test honest about the real (number) signature without @ts-expect-error.
    expect(computeBakeScale(undefined as unknown as number, TILE)).toBe(1);
    expect(computeBakeScale(NaN, TILE)).toBe(1);
  });

  it("falls back to TILE when tileSize is falsy (ratio = 1)", () => {
    expect(computeBakeScale(1, 0)).toBe(1);
    expect(computeBakeScale(1, undefined as unknown as number)).toBe(1);
    // dpr still wins when present
    expect(computeBakeScale(2, 0)).toBe(2);
  });

  it("returns 1 for all-falsy inputs", () => {
    expect(
      computeBakeScale(undefined as unknown as number, undefined as unknown as number),
    ).toBe(1);
    expect(computeBakeScale(0, 0)).toBe(1);
  });
});

describe("hasValidChain", () => {
  it("is true for an orthogonal triple (horizontal)", () => {
    expect(
      hasValidChain(
        grid([
          ["a", "a", "a"],
          ["b", "c", "d"],
        ]),
      ),
    ).toBe(true);
  });

  it("is true for an orthogonal triple (vertical)", () => {
    expect(
      hasValidChain(
        grid([
          ["a", "b"],
          ["a", "c"],
          ["a", "d"],
        ]),
      ),
    ).toBe(true);
  });

  it("is true for a diagonal triple (DIRS includes diagonals)", () => {
    expect(
      hasValidChain(
        grid([
          ["a", "b", "c"],
          ["d", "a", "e"],
          ["f", "g", "a"],
        ]),
      ),
    ).toBe(true);
  });

  it("is false for a 2-run (respects the >= 3 threshold)", () => {
    expect(
      hasValidChain(
        grid([
          ["a", "a", "b"],
          ["c", "d", "e"],
        ]),
      ),
    ).toBe(false);
  });

  it("is false for a fully-scattered board (all distinct keys)", () => {
    expect(
      hasValidChain(
        grid([
          ["a", "b", "c"],
          ["d", "e", "f"],
          ["g", "h", "i"],
        ]),
      ),
    ).toBe(false);
  });

  it("is false when same-key cells only form isolated pairs (size 2)", () => {
    // Each key appears exactly twice as an adjacent pair; no diagonal link
    // promotes any cluster to 3. (Note: a checkerboard would NOT work here —
    // 8-dir adjacency makes all same-key cells in a checkerboard connected.)
    expect(
      hasValidChain(
        grid([
          ["a", "a", "b", "b"],
          ["c", "c", "d", "d"],
        ]),
      ),
    ).toBe(false);
  });

  it("is true once an isolated cluster gains a third same-key neighbour", () => {
    // Left column is a vertical triple of 'a'.
    expect(
      hasValidChain(
        grid([
          ["a", "b", "c"],
          ["a", "c", "b"],
          ["a", "b", "c"],
        ]),
      ),
    ).toBe(true);
  });

  it("returns false for an empty grid without throwing", () => {
    expect(hasValidChain([])).toBe(false);
    expect(hasValidChain([[]])).toBe(false);
  });

  it("handles sparse / null-heavy grids without throwing", () => {
    expect(
      hasValidChain(
        grid([
          ["a", null, "a"],
          [null, "b", null],
          ["a", null, "a"],
        ]),
      ),
    ).toBe(false); // four corner 'a' but no two are adjacent → no group of 3
  });

  it("counts a connected blob that spans null gaps via adjacency", () => {
    // Three 'a' in a diagonal chain, each adjacent to the next.
    expect(
      hasValidChain(
        grid([
          ["a", null, null],
          [null, "a", null],
          [null, null, "a"],
        ]),
      ),
    ).toBe(true);
  });
});
