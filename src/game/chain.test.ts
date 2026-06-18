import { describe, it, expect } from "vitest";
import {
  computeBakeScale,
  hasValidChain,
  isAdjacent,
  effectiveMinChain,
  canExtendChain,
  toSelectorGrid,
} from "./chain.js";
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

describe("isAdjacent", () => {
  const c = { col: 2, row: 2 };

  it("accepts all 8 surrounding cells", () => {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        expect(isAdjacent(c, { col: 2 + dc, row: 2 + dr })).toBe(true);
      }
    }
  });

  it("rejects the cell itself", () => {
    expect(isAdjacent(c, { col: 2, row: 2 })).toBe(false);
  });

  it("rejects cells two or more away", () => {
    expect(isAdjacent(c, { col: 4, row: 2 })).toBe(false);
    expect(isAdjacent(c, { col: 2, row: 0 })).toBe(false);
    expect(isAdjacent(c, { col: 0, row: 0 })).toBe(false);
  });
});

describe("effectiveMinChain", () => {
  it("floors at 3 when there is no boss minimum", () => {
    expect(effectiveMinChain(0)).toBe(3);
    expect(effectiveMinChain(2)).toBe(3);
    expect(effectiveMinChain(3)).toBe(3);
  });

  it("uses the boss minimum when it exceeds 3", () => {
    expect(effectiveMinChain(4)).toBe(4);
    expect(effectiveMinChain(6)).toBe(6);
  });
});

describe("canExtendChain", () => {
  it("rejects when the path is empty", () => {
    expect(canExtendChain([], [], { col: 0, row: 0, key: "a", selected: false })).toBe("reject");
  });

  it("extends on an adjacent, unselected, same-key tile", () => {
    const keys = ["a", "a"];
    const cells = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
    ];
    // (2,0) is adjacent to head (1,0), same key, unselected.
    expect(canExtendChain(keys, cells, { col: 2, row: 0, key: "a", selected: false })).toBe("extend");
    // diagonal extend
    expect(canExtendChain(keys, cells, { col: 2, row: 1, key: "a", selected: false })).toBe("extend");
  });

  it("backtracks when the tile is the path's previous cell", () => {
    const keys = ["a", "a"];
    const cells = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
    ];
    // prev is (0,0); touching it pops the head.
    expect(canExtendChain(keys, cells, { col: 0, row: 0, key: "a", selected: true })).toBe("backtrack");
  });

  it("does not backtrack on a single-cell path", () => {
    // No prev exists; re-touching the only (selected) cell is a reject, not a pop.
    expect(canExtendChain(["a"], [{ col: 0, row: 0 }], { col: 0, row: 0, key: "a", selected: true })).toBe(
      "reject",
    );
  });

  it("rejects an already-selected tile that is not the prev cell", () => {
    const keys = ["a", "a"];
    const cells = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
    ];
    expect(canExtendChain(keys, cells, { col: 1, row: 1, key: "a", selected: true })).toBe("reject");
  });

  it("rejects a different-key tile even when adjacent", () => {
    expect(
      canExtendChain(["a"], [{ col: 1, row: 1 }], { col: 2, row: 1, key: "b", selected: false }),
    ).toBe("reject");
  });

  it("rejects a same-key tile that is not adjacent to the head", () => {
    expect(
      canExtendChain(["a"], [{ col: 0, row: 0 }], { col: 3, row: 3, key: "a", selected: false }),
    ).toBe("reject");
  });

  it("matches the chain HEAD key, not the current head cell's key", () => {
    // Path head key is path[0] ("a"); even though the last cell happens to be
    // adjacent, a candidate must match the FIRST tile's key.
    const keys = ["a", "a", "a"];
    const cells = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    expect(canExtendChain(keys, cells, { col: 3, row: 0, key: "a", selected: false })).toBe("extend");
    expect(canExtendChain(keys, cells, { col: 3, row: 0, key: "z", selected: false })).toBe("reject");
  });
});

describe("toSelectorGrid", () => {
  it("projects live cells to {key, selected} and gaps to {key:null}", () => {
    const out = toSelectorGrid([
      [{ res: { key: "a" }, selected: true }, null],
      [{ res: { key: "b" } }, undefined],
    ]);
    expect(out).toEqual([
      [{ key: "a", selected: true }, { key: null }],
      [{ key: "b", selected: false }, { key: null }],
    ]);
  });

  it("coerces a missing selected flag to false", () => {
    const out = toSelectorGrid([[{ res: { key: "x" } }]]);
    expect(out[0][0]).toEqual({ key: "x", selected: false });
  });

  it("returns an empty grid unchanged in shape", () => {
    expect(toSelectorGrid([])).toEqual([]);
    expect(toSelectorGrid([[]])).toEqual([[]]);
  });
});
