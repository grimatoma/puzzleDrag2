// Phase 0 — Grid dimensions, local session season index, and clamp helper.
// Migrated from runSelfTests() assertions 0.1 and 0.2.
import { describe, it, expect } from "vitest";
import { ROWS, COLS } from "../src/constants.js";
import { clamp, seasonIndexForTurns, rollResource, makeBubble, hex } from "../src/utils.js";

describe("Phase 0 — grid dimensions", () => {
  it("ROWS === 6", () => expect(ROWS).toBe(6));
  it("COLS === 6", () => expect(COLS).toBe(6));
});

describe("Phase 0 — local session season index", () => {
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

describe("Phase 0 — rollResource helper", () => {
  const pool = ["wood", "stone", "iron"];
  it("returns the first item when random is 0", () => {
    expect(rollResource(pool, () => 0)).toBe("wood");
  });
  it("returns the middle item when random is 0.5", () => {
    expect(rollResource(pool, () => 0.5)).toBe("stone");
  });
  it("returns the last item when random is close to 1", () => {
    expect(rollResource(pool, () => 0.99)).toBe("iron");
  });
});

describe("Phase 0 — makeBubble helper", () => {
  it("creates a bubble object with default ms", () => {
    const bubble = makeBubble("npc_1", "Hello");
    expect(bubble.npc).toBe("npc_1");
    expect(bubble.text).toBe("Hello");
    expect(bubble.ms).toBe(1800);
    expect(typeof bubble.id).toBe("number");
  });

  it("creates a bubble object with custom ms", () => {
    const bubble = makeBubble("npc_2", "World", 3000);
    expect(bubble.npc).toBe("npc_2");
    expect(bubble.text).toBe("World");
    expect(bubble.ms).toBe(3000);
    expect(typeof bubble.id).toBe("number");
  });
});

describe("Phase 0 — hex formatting", () => {
  it("pads zero to 6 digits", () => expect(hex(0)).toBe("#000000"));
  it("pads small numbers", () => expect(hex(255)).toBe("#0000ff"));
  it("handles exactly 6 hex digits", () => expect(hex(0xffffff)).toBe("#ffffff"));
  it("handles typical color hex", () => expect(hex(0x123456)).toBe("#123456"));
});
