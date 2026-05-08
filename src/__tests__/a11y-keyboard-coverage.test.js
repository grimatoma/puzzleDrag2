// Coverage fillins for src/features/a11y/keyboard.js (85% pre-PR).
// Branches missing across cursor-active gate, arrow-key clamping at every
// edge, Space rejects (no tile / non-adjacent / wrong key / duplicate),
// and Enter commit math.

import { describe, it, expect } from "vitest";
import { handleKeyboard } from "../features/a11y/keyboard.js";
import { COLS, ROWS } from "../constants.js";

const baseState = (over = {}) => ({
  settings: { keyboardCursor: { row: 0, col: 0, active: false } },
  grid: Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ key: "grass_hay" })),
  ),
  inventory: {},
  chain: [],
  ...over,
});

describe("handleKeyboard — cursor toggle and active gate", () => {
  it("Tab toggles cursor.active true → false → true", () => {
    let s = baseState();
    s = handleKeyboard(s, { key: "Tab" });
    expect(s.settings.keyboardCursor.active).toBe(true);
    s = handleKeyboard(s, { key: "Tab" });
    expect(s.settings.keyboardCursor.active).toBe(false);
  });

  it("non-Tab keys are ignored when cursor inactive", () => {
    const s = baseState();
    expect(handleKeyboard(s, { key: "ArrowRight" })).toBe(s);
    expect(handleKeyboard(s, { key: " " })).toBe(s);
    expect(handleKeyboard(s, { key: "Enter" })).toBe(s);
    expect(handleKeyboard(s, { key: "Escape" })).toBe(s);
  });
});

describe("handleKeyboard — arrow keys", () => {
  const activeState = (over = {}) =>
    baseState({
      settings: { keyboardCursor: { row: 1, col: 1, active: true } },
      ...over,
    });

  it("ArrowUp / Down / Left / Right move the cursor by one cell", () => {
    let s = activeState();
    s = handleKeyboard(s, { key: "ArrowUp" });
    expect(s.settings.keyboardCursor).toMatchObject({ row: 0, col: 1 });
    s = handleKeyboard(s, { key: "ArrowDown" });
    expect(s.settings.keyboardCursor).toMatchObject({ row: 1, col: 1 });
    s = handleKeyboard(s, { key: "ArrowLeft" });
    expect(s.settings.keyboardCursor).toMatchObject({ row: 1, col: 0 });
    s = handleKeyboard(s, { key: "ArrowRight" });
    expect(s.settings.keyboardCursor).toMatchObject({ row: 1, col: 1 });
  });

  it("ArrowUp clamps at row 0 (no wrap)", () => {
    const s0 = activeState({
      settings: { keyboardCursor: { row: 0, col: 0, active: true } },
    });
    const s1 = handleKeyboard(s0, { key: "ArrowUp" });
    expect(s1.settings.keyboardCursor.row).toBe(0);
  });

  it("ArrowDown clamps at last row", () => {
    const s0 = activeState({
      settings: { keyboardCursor: { row: ROWS - 1, col: 0, active: true } },
    });
    const s1 = handleKeyboard(s0, { key: "ArrowDown" });
    expect(s1.settings.keyboardCursor.row).toBe(ROWS - 1);
  });

  it("ArrowLeft clamps at col 0", () => {
    const s0 = activeState({
      settings: { keyboardCursor: { row: 0, col: 0, active: true } },
    });
    const s1 = handleKeyboard(s0, { key: "ArrowLeft" });
    expect(s1.settings.keyboardCursor.col).toBe(0);
  });

  it("ArrowRight clamps at last col", () => {
    const s0 = activeState({
      settings: { keyboardCursor: { row: 0, col: COLS - 1, active: true } },
    });
    const s1 = handleKeyboard(s0, { key: "ArrowRight" });
    expect(s1.settings.keyboardCursor.col).toBe(COLS - 1);
  });
});

describe("handleKeyboard — Space (add tile)", () => {
  const activeState = (over = {}) =>
    baseState({
      settings: { keyboardCursor: { row: 0, col: 0, active: true } },
      ...over,
    });

  it("Space adds the focused tile to an empty chain", () => {
    const s = activeState();
    const s1 = handleKeyboard(s, { key: " " });
    expect(s1.chain).toHaveLength(1);
    expect(s1.chain[0]).toMatchObject({ row: 0, col: 0, key: "grass_hay" });
  });

  it("Space adds an adjacent tile of the same key to the chain", () => {
    let s = activeState({
      chain: [{ row: 0, col: 0, key: "grass_hay" }],
      settings: { keyboardCursor: { row: 0, col: 1, active: true } },
    });
    s = handleKeyboard(s, { key: " " });
    expect(s.chain).toHaveLength(2);
  });

  it("Space rejects non-adjacent tile", () => {
    const s = activeState({
      chain: [{ row: 0, col: 0, key: "grass_hay" }],
      settings: { keyboardCursor: { row: 3, col: 3, active: true } },
    });
    const s1 = handleKeyboard(s, { key: " " });
    expect(s1.chain).toHaveLength(1); // unchanged
  });

  it("Space rejects wrong-key tile", () => {
    const grid = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ key: "grass_hay" })),
    );
    grid[0][1] = { key: "berry" };
    const s = activeState({
      grid,
      chain: [{ row: 0, col: 0, key: "grass_hay" }],
      settings: { keyboardCursor: { row: 0, col: 1, active: true } },
    });
    const s1 = handleKeyboard(s, { key: " " });
    expect(s1.chain).toHaveLength(1);
  });

  it("Space rejects already-chained tile", () => {
    const s = activeState({
      chain: [
        { row: 0, col: 0, key: "grass_hay" },
        { row: 0, col: 1, key: "grass_hay" },
      ],
      settings: { keyboardCursor: { row: 0, col: 0, active: true } },
    });
    const s1 = handleKeyboard(s, { key: " " });
    expect(s1.chain).toHaveLength(2);
  });

  it("Space rejects empty cell (no tile.key)", () => {
    const grid = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ key: "grass_hay" })),
    );
    grid[0][0] = null;
    const s = activeState({ grid });
    const s1 = handleKeyboard(s, { key: " " });
    expect(s1.chain).toHaveLength(0);
  });
});

describe("handleKeyboard — Enter (commit) + Escape", () => {
  const activeState = (over = {}) =>
    baseState({
      settings: { keyboardCursor: { row: 0, col: 0, active: true } },
      ...over,
    });

  it("Enter on empty chain → no inventory change, chain stays empty", () => {
    const s = activeState();
    const s1 = handleKeyboard(s, { key: "Enter" });
    expect(s1.chain).toEqual([]);
    expect(s1.inventory).toEqual({});
  });

  it("Enter commits a short chain (no upgrade) → grants raw key", () => {
    const s = activeState({
      chain: [
        { row: 0, col: 0, key: "grass_hay" },
        { row: 0, col: 1, key: "grass_hay" },
        { row: 0, col: 2, key: "grass_hay" },
      ],
    });
    const s1 = handleKeyboard(s, { key: "Enter" });
    expect(s1.chain).toEqual([]);
    expect(s1.inventory.grass_hay).toBe(3);
    // grass_hay threshold is 6; chain of 3 → 0 upgrades
    expect(s1.inventory.grain_wheat).toBeUndefined();
  });

  it("Enter on a 6-chain of grass_hay credits 1 upgrade (grain_wheat)", () => {
    const chain = Array.from({ length: 6 }, (_, i) => ({
      row: 0, col: i, key: "grass_hay",
    }));
    const s = activeState({ chain });
    const s1 = handleKeyboard(s, { key: "Enter" });
    expect(s1.inventory.grass_hay).toBe(5);    // 6 - 1 upgrade
    expect(s1.inventory.grain_wheat).toBe(1);
  });

  it("Escape clears the chain", () => {
    const s = activeState({
      chain: [{ row: 0, col: 0, key: "grass_hay" }],
    });
    const s1 = handleKeyboard(s, { key: "Escape" });
    expect(s1.chain).toEqual([]);
  });

  it("unknown key while cursor active returns state unchanged", () => {
    const s = baseState({
      settings: { keyboardCursor: { row: 0, col: 0, active: true } },
    });
    expect(handleKeyboard(s, { key: "x" })).toBe(s);
  });
});
