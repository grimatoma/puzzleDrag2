import { describe, expect, test } from "vitest";
import {
  type FiberGrid,
  type FiberColor,
  FIBER_COLORS,
  isValidSwap,
  findMatches,
  resolveSwap,
  hasAnyValidSwap,
  hasMatch,
  generateBoard,
  spindleClearedCells,
  loomClearedCells,
  dyevatClearedCells,
} from "../resolver.js";

// Compact grid builder. Each char is a colour; "." is an empty cell.
const CH: Record<string, FiberColor> = { w: "white", g: "grey", b: "brown", k: "black", c: "cream" };
function parse(rows: string[]): FiberGrid {
  return rows.map((row) =>
    [...row.replace(/ /g, "")].map((ch) => (ch === "." ? null : { color: CH[ch], special: null })),
  );
}
/** A deterministic refill sequence (cycles the given colours). */
function cycler(seq: FiberColor[]): () => FiberColor {
  let i = 0;
  return () => seq[i++ % seq.length];
}

function countSpecial(grid: FiberGrid, special: string): number {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell?.special === special) n++;
  return n;
}

describe("isValidSwap", () => {
  const grid = parse([
    "wwg",
    "bbw",
    "kkb",
  ]);

  test("true when the swap forms a 3-in-a-row", () => {
    // swap (0,2)g <-> (1,2)w → row0 becomes w w w
    expect(isValidSwap(grid, 0, 2, 1, 2)).toBe(true);
  });

  test("false when the swap forms nothing", () => {
    // swap (0,0)w <-> (1,0)b forms no line
    expect(isValidSwap(grid, 0, 0, 1, 0)).toBe(false);
  });

  test("false for a non-adjacent swap", () => {
    expect(isValidSwap(grid, 0, 0, 0, 2)).toBe(false);
  });

  test("false for a diagonal swap", () => {
    expect(isValidSwap(grid, 0, 0, 1, 1)).toBe(false);
  });

  test("does not mutate the input grid", () => {
    const snapshot = JSON.stringify(grid);
    isValidSwap(grid, 0, 2, 1, 2);
    expect(JSON.stringify(grid)).toBe(snapshot);
  });
});

describe("findMatches", () => {
  test("finds a horizontal run", () => {
    const matches = findMatches(parse(["www", "bgk", "kbg"]));
    expect(matches).toHaveLength(1);
    expect(matches[0].length).toBe(3);
  });

  test("finds a vertical run", () => {
    const matches = findMatches(parse(["wbk", "wgb", "wkg"]));
    expect(matches).toHaveLength(1);
    expect(matches[0].length).toBe(3);
  });

  test("finds both runs of an L/T shape", () => {
    // col0 vertical w-w-w and row2 horizontal w-w-w intersect at (2,0)
    const matches = findMatches(parse(["wbk", "wbk", "www"]));
    expect(matches).toHaveLength(2);
  });

  test("does NOT match a run of only 2", () => {
    expect(findMatches(parse(["wwb", "kgk", "bkg"]))).toHaveLength(0);
  });
});

describe("resolveSwap", () => {
  test("spends exactly one move", () => {
    const grid = parse(["wwg", "bbw", "kkb"]);
    const result = resolveSwap(grid, { r1: 0, c1: 2, r2: 1, c2: 2 }, cycler(["brown", "black"]));
    expect(result.movesSpent).toBe(1);
  });

  test("clears the matched line, then cascades a second clear from gravity", () => {
    // After the swap forms a grey row, clearing it drops three whites in col0
    // into a fresh vertical match — a chained cascade with NO swap.
    const grid = parse([
      "wkk",
      "wbg",
      "ggk",
      "wcb",
      "bcb",
    ]);
    const result = resolveSwap(grid, { r1: 2, c1: 2, r2: 1, c2: 2 }, cycler(["brown", "black"]));
    expect(result.cleared.grey).toBe(3); // first clear (the swapped-in row)
    expect(result.cleared.white).toBe(3); // chained clear (gravity-formed column)
    expect(result.createdSpecials).toBe(0);
    expect(result.movesSpent).toBe(1);
    // Fixed point reached — no matches remain.
    expect(findMatches(result.grid)).toHaveLength(0);
  });

  test("does not mutate the input grid", () => {
    const grid = parse(["wwg", "bbw", "kkb"]);
    const snapshot = JSON.stringify(grid);
    resolveSwap(grid, { r1: 0, c1: 2, r2: 1, c2: 2 }, cycler(["cream"]));
    expect(JSON.stringify(grid)).toBe(snapshot);
  });

  test("refilled board reaches a stable (no-match) state", () => {
    const grid = parse(["wwg", "bbw", "kkb"]);
    const result = resolveSwap(grid, { r1: 0, c1: 2, r2: 1, c2: 2 }, cycler(["brown", "black", "cream"]));
    expect(findMatches(result.grid)).toHaveLength(0);
  });
});

describe("special creation from match length", () => {
  test("a 4-in-a-row creates exactly one spindle", () => {
    const grid = parse([
      "wwwb",
      "kgcw",
      "gkcg",
    ]);
    // swap (0,3)b <-> (1,3)w → row0 becomes w w w w (a 4-line)
    const result = resolveSwap(grid, { r1: 0, c1: 3, r2: 1, c2: 3 }, cycler(["cream"]));
    expect(result.createdSpecials).toBe(1);
    expect(countSpecial(result.grid, "spindle")).toBe(1);
    expect(countSpecial(result.grid, "loom")).toBe(0);
  });

  test("a 5-in-a-row creates exactly one loom", () => {
    const grid = parse([
      "wwwwb",
      "kgckw",
      "gkcgk",
    ]);
    // swap (0,4)b <-> (1,4)w → row0 becomes w w w w w (a 5-line)
    const result = resolveSwap(grid, { r1: 0, c1: 4, r2: 1, c2: 4 }, cycler(["cream"]));
    expect(result.createdSpecials).toBe(1);
    expect(countSpecial(result.grid, "loom")).toBe(1);
    expect(countSpecial(result.grid, "spindle")).toBe(0);
  });

  test("a T/L intersection creates a loom", () => {
    // Pre-existing T: row0 www + col1 www intersect at (0,1).
    const grid = parse([
      "www",
      "bwb",
      "kwk",
    ]);
    // A no-op-ish swap that leaves the T intact still resolves it.
    const result = resolveSwap(grid, { r1: 1, c1: 0, r2: 2, c2: 0 }, cycler(["brown"]));
    expect(countSpecial(result.grid, "loom")).toBe(1);
  });
});

describe("special-tile effects (pure)", () => {
  const grid = parse([
    "wwww",
    "wwww",
    "wwww",
    "wwww",
  ]);

  test("spindle clears its full row and column", () => {
    const cells = spindleClearedCells(grid, 1, 2);
    // 4 in the row + 3 remaining in the column = 7, no duplicate at (1,2)
    expect(cells).toHaveLength(7);
    expect(cells).toContainEqual([1, 0]);
    expect(cells).toContainEqual([3, 2]);
  });

  test("loom clears a 3×3 block (clamped at edges)", () => {
    expect(loomClearedCells(grid, 1, 1)).toHaveLength(9);
    expect(loomClearedCells(grid, 0, 0)).toHaveLength(4); // corner → 2×2
  });

  test("dyevat clears every tile of its colour", () => {
    const mixed = parse([
      "wbw",
      "bwb",
      "wbw",
    ]);
    expect(dyevatClearedCells(mixed, "white")).toHaveLength(5);
    expect(dyevatClearedCells(mixed, "brown")).toHaveLength(4);
  });
});

describe("triggered specials inside a cascade", () => {
  test("a matched spindle clears far more than its own 3-line", () => {
    const grid: FiberGrid = parse([
      "wXwb",
      "kgck",
      "gkcg",
      "bwkc",
    ]);
    // Mark (0,1) as a spindle (still white, so row0 w-w-w is a match).
    grid[0][1] = { color: "white", special: "spindle" };
    const result = resolveSwap(grid, { r1: 3, c1: 0, r2: 3, c2: 1 }, cycler(["brown", "black", "cream"]));
    // The bare 3-line would clear 3 cells; the spindle blast clears its whole
    // row (4) + column (3 more) = 7 on the first pass.
    const totalCleared = (Object.values(result.cleared) as number[]).reduce((a, b) => a + b, 0);
    expect(totalCleared).toBeGreaterThanOrEqual(7);
  });
});

describe("deadlock detection", () => {
  test("hasAnyValidSwap is true on a swappable board", () => {
    expect(hasAnyValidSwap(parse(["wwg", "bbw", "kkb"]))).toBe(true);
  });

  test("hasAnyValidSwap is false when the board is too small to ever form a line", () => {
    // A 2×2 board can never hold a 3-in-a-row, so no swap is ever valid.
    expect(hasAnyValidSwap(parse(["wk", "kw"]))).toBe(false);
  });
});

describe("generateBoard", () => {
  // A simple seeded RNG so the invariants are checked deterministically.
  function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  test("produces a board with no initial match and at least one valid swap", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const grid = generateBoard(8, 8, FIBER_COLORS, mulberry32(seed));
      expect(grid).toHaveLength(8);
      expect(grid[0]).toHaveLength(8);
      expect(hasMatch(grid)).toBe(false);
      expect(hasAnyValidSwap(grid)).toBe(true);
    }
  });

  test("only uses the allowed colours", () => {
    const colors: FiberColor[] = ["white", "grey", "brown"];
    const grid = generateBoard(7, 7, colors, mulberry32(99));
    for (const row of grid) {
      for (const cell of row) {
        expect(colors).toContain(cell!.color);
      }
    }
  });
});

describe("determinism", () => {
  test("resolver.ts contains no Math.random (RNG is injected)", async () => {
    // Read the source to prove the verb is reproducible from `nextColor` alone.
    const fs = await import("node:fs");
    const url = await import("node:url");
    const path = url.fileURLToPath(new URL("../resolver.ts", import.meta.url));
    const src = fs.readFileSync(path, "utf8");
    expect(src.includes("Math.random")).toBe(false);
  });
});
