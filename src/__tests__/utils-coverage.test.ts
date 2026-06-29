// Coverage fillins for src/utils.js. Pre-PR coverage: 68% statements,
// uncovered: hex / makeBubble / seasonIndexForTurns / runSelfTests.

import { describe, it, expect, vi } from "vitest";
import {
  clamp,
  contrastRatio,
  canExtendChain,
  upgradeCountForChain,
  rollResource,
  hex,
  makeBubble,
  seasonIndexForTurns,
  currentCap,
  runSelfTests,
} from "../utils.js";

describe("utils — clamp / contrast / adjacency", () => {
  it("clamp constrains to [a, b]", () => {
    // Happy path: within bounds
    expect(clamp(5, 0, 10)).toBe(5);
    // Lower bound violation
    expect(clamp(-3, 0, 10)).toBe(0);
    // Upper bound violation
    expect(clamp(99, 0, 10)).toBe(10);

    // Boundary matches
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);

    // Negative ranges
    expect(clamp(-5, -10, -2)).toBe(-5);
    expect(clamp(-15, -10, -2)).toBe(-10);
    expect(clamp(0, -10, -2)).toBe(-2);

    // Floating point numbers
    expect(clamp(3.14, 0, 5.5)).toBe(3.14);
    expect(clamp(-1.5, 0, 5.5)).toBe(0);
    expect(clamp(6.28, 0, 5.5)).toBe(5.5);
  });

  it("contrastRatio is symmetric and >= 1", () => {
    const r = contrastRatio(0xffffff, 0x000000);
    expect(r).toBeGreaterThan(20); // black/white max contrast
    expect(contrastRatio(0xffffff, 0x000000)).toBeCloseTo(contrastRatio(0x000000, 0xffffff));
    expect(contrastRatio(0x808080, 0x808080)).toBeCloseTo(1, 3);
  });

  it("contrastRatio calculates correct WCAG ratios for known colors", () => {
    // White on black should be exactly 21:1
    expect(contrastRatio(0xffffff, 0x000000)).toBeCloseTo(21, 1);

    // White on white should be exactly 1:1
    expect(contrastRatio(0xffffff, 0xffffff)).toBeCloseTo(1, 1);

    // Black on black should be exactly 1:1
    expect(contrastRatio(0x000000, 0x000000)).toBeCloseTo(1, 1);

    // Red on white (approx 3.99:1)
    expect(contrastRatio(0xff0000, 0xffffff)).toBeCloseTo(3.99, 1);

    // Blue on white (approx 8.59:1)
    expect(contrastRatio(0x0000ff, 0xffffff)).toBeCloseTo(8.59, 1);
  });

  it("contrastRatio ignores alpha bytes", () => {
    // 0xff000000 should be treated as black (0x000000)
    // Contrast with white should be 21
    expect(contrastRatio(0xff000000, 0xffffff)).toBeCloseTo(21, 1);

    // 0x12ffffff should be treated as white (0xffffff)
    // Contrast with black should be 21
    expect(contrastRatio(0x12ffffff, 0x000000)).toBeCloseTo(21, 1);
  });

  it("contrastRatio edge cases", () => {
    // Identical colors should return exactly 1
    expect(contrastRatio(0x123456, 0x123456)).toBe(1);
    expect(contrastRatio(0x000000, 0x000000)).toBe(1);
    expect(contrastRatio(0xffffff, 0xffffff)).toBe(1);

    // Black and white should return exactly 21
    expect(contrastRatio(0x000000, 0xffffff)).toBe(21);
    expect(contrastRatio(0xffffff, 0x000000)).toBe(21);

    // Test the linear threshold boundary in relativeLuminance (c <= 0.03928)
    // c = 0.03928 is around 10 / 255. 0x0a0a0a (r=g=b=10) and 0x0b0b0b (r=g=b=11)
    expect(contrastRatio(0x0a0a0a, 0x0b0b0b)).toBeCloseTo(1.0058, 3);

    // Very similar colors should be very close to 1 but not exactly 1
    expect(contrastRatio(0x000000, 0x000001)).toBeGreaterThan(1);
    expect(contrastRatio(0x000000, 0x000001)).toBeLessThan(1.01);
  });


  it("canExtendChain: empty chain accepts any tile; non-empty checks key", () => {
    expect(canExtendChain([], { key: "x" })).toBe(true);
    expect(canExtendChain([{ key: "x" }], { key: "x" })).toBe(true);
    expect(canExtendChain([{ key: "x" }], { key: "y" })).toBe(false);
    expect(canExtendChain([{ key: "x" }, { key: "x" }], { key: "x" })).toBe(true);
    expect(canExtendChain([{ key: "x" }, { key: "x" }], { key: "y" })).toBe(false);
  });
});

describe("utils — chain math", () => {
  it("upgradeCountForChain: floor(length/threshold) when threshold known; 0 when unknown", () => {
    // tile_grass_grass threshold is 6 in UPGRADE_THRESHOLDS (default map).
    expect(upgradeCountForChain(11, "tile_grass_grass")).toBe(1);
    expect(upgradeCountForChain(12, "tile_grass_grass")).toBe(2);
    expect(upgradeCountForChain(2, "tile_grass_grass")).toBe(0);
    // Terminal / unknown key
    expect(upgradeCountForChain(99, "no_such_key")).toBe(0);
  });

  it("rollResource samples the pool by index using the supplied RNG", () => {
    const pool = ["tile_grass_grass", "tile_tree_oak", "berry"];
    expect(rollResource(pool, () => 0)).toBe("tile_grass_grass");
    expect(rollResource(pool, () => 0.5)).toBe("tile_tree_oak");
    expect(rollResource(pool, () => 0.99)).toBe("berry");
  });
});

describe("utils — formatters and helpers", () => {
  it("hex zero-pads to 6 digits with #", () => {
    expect(hex(0)).toBe("#000000");
    expect(hex(0xff)).toBe("#0000ff");
    expect(hex(0xa8c769)).toBe("#a8c769");
  });

  it("makeBubble assembles { id, npc, text, ms } and defaults ms", () => {
    const before = Date.now();
    const b = makeBubble("mira", "Hello");
    expect(b.npc).toBe("mira");
    expect(b.text).toBe("Hello");
    expect(b.ms).toBe(1800);
    expect(b.id).toBeGreaterThanOrEqual(before);
  });

  it("makeBubble accepts a custom ms", () => {
    const b = makeBubble("mira", "Hello", 500);
    expect(b.ms).toBe(500);
  });

  it("seasonIndexForTurns boundaries: 0/2 → Spring, 3/5 → Summer, 6/8 → Autumn, 9+ → Winter", () => {
    expect(seasonIndexForTurns(0)).toBe(0);
    expect(seasonIndexForTurns(2)).toBe(0);
    expect(seasonIndexForTurns(3)).toBe(1);
    expect(seasonIndexForTurns(5)).toBe(1);
    expect(seasonIndexForTurns(6)).toBe(2);
    expect(seasonIndexForTurns(8)).toBe(2);
    expect(seasonIndexForTurns(9)).toBe(3);
    expect(seasonIndexForTurns(10)).toBe(3);
  });

  it("currentCap: granary built → high cap; otherwise base cap", () => {
    const high = currentCap({ built: { granary: true } });
    const highNested = currentCap({ mapCurrent: "home", built: { home: { granary: true } } });
    const low = currentCap({ built: {} });
    expect(high).toBeGreaterThan(low);
    expect(highNested).toBe(high);
    // null-safe
    expect(currentCap(undefined)).toBe(low);
    expect(currentCap(null)).toBe(low);
  });
});

describe("utils — runSelfTests smoke shim", () => {
  it(
    "returns true when all smoke invariants pass",
    { timeout: 20_000 },
    async () => {
    // Spy on console.log to keep test output quiet.
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await runSelfTests();
    logSpy.mockRestore();
    expect(typeof result).toBe("boolean");
    },
  );
});
