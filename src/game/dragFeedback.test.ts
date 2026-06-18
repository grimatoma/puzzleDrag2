import { describe, it, expect } from "vitest";
import { tickPitch, crossesThreshold, tickHapticMs } from "./dragFeedback.js";

describe("tickPitch", () => {
  it("is 1.0 at length 1 (no shift on the first tile)", () => {
    expect(tickPitch(1)).toBe(1);
  });

  it("climbs monotonically as the chain grows", () => {
    for (let len = 2; len <= 12; len++) {
      expect(tickPitch(len)).toBeGreaterThan(tickPitch(len - 1));
    }
  });

  it("clamps at 2.2 and never exceeds play()'s 2.5 ceiling", () => {
    for (let len = 1; len <= 200; len++) {
      const p = tickPitch(len);
      expect(p).toBeLessThanOrEqual(2.2);
      expect(p).toBeLessThan(2.5);
    }
    // far past the clamp it pins at 2.2
    expect(tickPitch(1000)).toBe(2.2);
  });

  it("does not go below 1.0 for degenerate lengths", () => {
    expect(tickPitch(0)).toBe(1);
    expect(tickPitch(-5)).toBe(1);
  });
});

describe("crossesThreshold", () => {
  it("fires when the add brings the chain up to the threshold", () => {
    expect(crossesThreshold(2, 3, 3)).toBe(true);
  });

  it("does not fire once already at/above the threshold", () => {
    expect(crossesThreshold(3, 4, 3)).toBe(false);
    expect(crossesThreshold(5, 6, 3)).toBe(false);
  });

  it("does not fire on a backtrack down through the threshold", () => {
    expect(crossesThreshold(4, 3, 3)).toBe(false);
  });

  it("fires once when a single add jumps past the threshold", () => {
    expect(crossesThreshold(0, 5, 3)).toBe(true);
  });

  it("honours a raised boss min-chain", () => {
    expect(crossesThreshold(4, 5, 5)).toBe(true);
    expect(crossesThreshold(3, 4, 5)).toBe(false);
  });
});

describe("tickHapticMs", () => {
  it("returns 0 below length 2 (startPath already buzzed length 1)", () => {
    expect(tickHapticMs(0)).toBe(0);
    expect(tickHapticMs(1)).toBe(0);
  });

  it("is positive and non-decreasing from length 2 up", () => {
    let prev = 0;
    for (let len = 2; len <= 20; len++) {
      const ms = tickHapticMs(len);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeGreaterThanOrEqual(prev);
      prev = ms;
    }
  });

  it("clamps at 35ms", () => {
    expect(tickHapticMs(2)).toBe(12);
    expect(tickHapticMs(100)).toBe(35);
    for (let len = 2; len <= 200; len++) {
      expect(tickHapticMs(len)).toBeLessThanOrEqual(35);
    }
  });
});
