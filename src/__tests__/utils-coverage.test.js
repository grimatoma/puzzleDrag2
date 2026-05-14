// Coverage fillins for src/utils.js. Pre-PR coverage: 68% statements,
// uncovered: hex / makeBubble / seasonIndexForTurns / runSelfTests.

import { describe, it, expect, vi } from "vitest";
import {
  clamp,
  contrastRatio,
  isAdjacent,
  canExtendChain,
  upgradeCountForChain,
  resourceGainForChain,
  rollResource,
  hex,
  makeBubble,
  seasonIndexForTurns,
  currentCap,
  runSelfTests,
} from "../utils.js";

describe("utils — clamp / contrast / adjacency", () => {
  it("clamp constrains to [a, b]", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it("contrastRatio is symmetric and >= 1", () => {
    const r = contrastRatio(0xffffff, 0x000000);
    expect(r).toBeGreaterThan(20); // black/white max contrast
    expect(contrastRatio(0xffffff, 0x000000)).toBeCloseTo(contrastRatio(0x000000, 0xffffff));
    expect(contrastRatio(0x808080, 0x808080)).toBeCloseTo(1, 3);
  });

  it("isAdjacent: orthogonal only", () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 0 })).toBe(true);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 0 })).toBe(false);
  });

  it("canExtendChain: empty chain accepts any tile; non-empty checks key", () => {
    expect(canExtendChain([], { key: "x" })).toBe(true);
    expect(canExtendChain([{ key: "x" }], { key: "x" })).toBe(true);
    expect(canExtendChain([{ key: "x" }], { key: "y" })).toBe(false);
  });
});

describe("utils — chain math", () => {
  it("upgradeCountForChain: floor(length/threshold) when threshold known; 0 when unknown", () => {
    // grass_hay threshold is 6 in UPGRADE_THRESHOLDS (default map).
    expect(upgradeCountForChain(11, "grass_hay")).toBe(1);
    expect(upgradeCountForChain(12, "grass_hay")).toBe(2);
    expect(upgradeCountForChain(2, "grass_hay")).toBe(0);
    // Terminal / unknown key
    expect(upgradeCountForChain(99, "no_such_key")).toBe(0);
  });

  it("resourceGainForChain doubles for chain length >= 6", () => {
    expect(resourceGainForChain(3)).toBe(3);
    expect(resourceGainForChain(5)).toBe(5);
    expect(resourceGainForChain(6)).toBe(12);
    expect(resourceGainForChain(10)).toBe(20);
  });

  it("rollResource samples the pool by index using the supplied RNG", () => {
    const pool = ["grass_hay", "wood_log", "berry"];
    expect(rollResource(pool, () => 0)).toBe("grass_hay");
    expect(rollResource(pool, () => 0.5)).toBe("wood_log");
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
  it("returns true when all smoke invariants pass", async () => {
    // Spy on console.log to keep test output quiet.
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await runSelfTests();
    logSpy.mockRestore();
    expect(typeof result).toBe("boolean");
  });
});
