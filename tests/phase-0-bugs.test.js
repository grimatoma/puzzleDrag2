// Phase 0 — Grid dimensions, turn count, and clamp helper.
// Migrated from runSelfTests() assertions 0.1 and 0.2.
import { describe, it, expect } from "vitest";
import { ROWS, COLS, MAX_TURNS } from "../src/constants.js";
import { clamp, seasonIndexForTurns } from "../src/utils.js";

describe("Phase 0 — grid dimensions", () => {
  it("ROWS === 6", () => expect(ROWS).toBe(6));
  it("COLS === 6", () => expect(COLS).toBe(6));
});

describe("Phase 0 — turn count", () => {
  it("MAX_TURNS === 10", () => expect(MAX_TURNS).toBe(10));
  it("turn 0 → Spring (index 0)", () => expect(seasonIndexForTurns(0)).toBe(0));
  it("turn 3 → Summer (index 1)", () => expect(seasonIndexForTurns(3)).toBe(1));
  it("turn 6 → Autumn (index 2)", () => expect(seasonIndexForTurns(6)).toBe(2));
  it("turn 9 → Winter (index 3)", () => expect(seasonIndexForTurns(9)).toBe(3));
  it("turn 10 → still Winter", () => expect(seasonIndexForTurns(10)).toBe(3));
});

describe("Phase 0 — clamp helper", () => {
  it("clamps to upper bound", () => expect(clamp(12, 0, 10)).toBe(10));
  it("clamps to lower bound", () => expect(clamp(-5, 0, 10)).toBe(0));
  it("passes through in-range value", () => expect(clamp(5, 0, 10)).toBe(5));
});
