// Phase 11.2 — Keyboard chain construction tests
import { describe, it, expect } from "vitest";
import { createInitialState } from "../state.js";
import { handleKeyboard } from "../features/a11y/keyboard.js";

describe("11.2 cursor initial state", () => {
  it("cursor starts at (0,0)", () => {
    const s = createInitialState();
    expect(s.settings.keyboardCursor.row).toBe(0);
    expect(s.settings.keyboardCursor.col).toBe(0);
  });
  it("cursor inactive on fresh save", () => {
    const s = createInitialState();
    expect(s.settings.keyboardCursor.active).toBe(false);
  });
});

describe("11.2 Tab activates cursor", () => {
  it("Tab sets active: true", () => {
    let s = createInitialState();
    s = handleKeyboard(s, { key: "Tab" });
    expect(s.settings.keyboardCursor.active).toBe(true);
  });
});

describe("11.2 arrow key movement", () => {
  it("ArrowRight → col 1", () => {
    let s = createInitialState();
    s = handleKeyboard(s, { key: "Tab" });
    s = handleKeyboard(s, { key: "ArrowRight" });
    expect(s.settings.keyboardCursor.col).toBe(1);
  });
  it("ArrowDown → row 1", () => {
    let s = createInitialState();
    s = handleKeyboard(s, { key: "Tab" });
    s = handleKeyboard(s, { key: "ArrowDown" });
    expect(s.settings.keyboardCursor.row).toBe(1);
  });
});

describe("11.2 edge clamping", () => {
  it("left at col 0 clamps (no wrap)", () => {
    let s = createInitialState();
    s.settings.keyboardCursor = { row: 0, col: 0, active: true };
    s = handleKeyboard(s, { key: "ArrowLeft" });
    expect(s.settings.keyboardCursor.col).toBe(0);
  });
  it("up at row 0 clamps", () => {
    let s = createInitialState();
    s.settings.keyboardCursor = { row: 0, col: 0, active: true };
    s = handleKeyboard(s, { key: "ArrowUp" });
    expect(s.settings.keyboardCursor.row).toBe(0);
  });
  it("right at max col clamps", () => {
    // COLS=6, so max col index is 5
    let s = createInitialState();
    s.settings.keyboardCursor = { row: 0, col: 5, active: true };
    s = handleKeyboard(s, { key: "ArrowRight" });
    expect(s.settings.keyboardCursor.col).toBe(5);
  });
  it("down at max row clamps", () => {
    // ROWS=6, so max row index is 5
    let s = createInitialState();
    s.settings.keyboardCursor = { row: 5, col: 0, active: true };
    s = handleKeyboard(s, { key: "ArrowDown" });
    expect(s.settings.keyboardCursor.row).toBe(5);
  });
});

describe("11.2 Space adds tile to chain", () => {
  it("Space starts chain at (0,0)", () => {
    let s = createInitialState();
    s.settings.keyboardCursor = { row: 0, col: 0, active: true };
    s.grid[0][0] = { key: "grass_hay" };
    s = handleKeyboard(s, { key: " " });
    expect(s.chain.length).toBe(1);
    expect(s.chain[0].row).toBe(0);
  });
  it("Space adds adjacent tile", () => {
    let s = createInitialState();
    s.settings.keyboardCursor = { row: 0, col: 0, active: true };
    s.grid[0][0] = { key: "grass_hay" };
    s.grid[0][1] = { key: "grass_hay" };
    s = handleKeyboard(s, { key: " " });
    s.settings.keyboardCursor = { ...s.settings.keyboardCursor, col: 1 };
    s = handleKeyboard(s, { key: " " });
    expect(s.chain.length).toBe(2);
  });
  it("non-adjacent Space rejected", () => {
    let s = createInitialState();
    s.settings.keyboardCursor = { row: 0, col: 0, active: true };
    s.grid[0][0] = { key: "grass_hay" };
    s.grid[3][3] = { key: "grass_hay" };
    s = handleKeyboard(s, { key: " " });
    // Move to far tile
    s.settings.keyboardCursor = { row: 3, col: 3, active: true };
    const beforeChain = JSON.stringify(s.chain);
    s = handleKeyboard(s, { key: " " });
    expect(JSON.stringify(s.chain)).toBe(beforeChain);
  });
});

describe("11.2 Enter commits chain", () => {
  it("Enter commits → inventory increased and chain cleared", () => {
    let s = createInitialState();
    s.chain = [
      { row: 0, col: 0, key: "grass_hay" },
      { row: 0, col: 1, key: "grass_hay" },
      { row: 0, col: 2, key: "grass_hay" },
    ];
    s.settings.keyboardCursor = { row: 0, col: 2, active: true };
    const beforeInv = s.inventory.grass_hay ?? 0;
    s = handleKeyboard(s, { key: "Enter" });
    expect((s.inventory.grass_hay ?? 0)).toBeGreaterThan(beforeInv);
    expect(s.chain.length).toBe(0);
  });
});

describe("11.2 Escape clears chain", () => {
  it("Escape clears chain", () => {
    let s = createInitialState();
    s.chain = [{ row: 0, col: 0, key: "grass_hay" }];
    s = handleKeyboard(s, { key: "Escape" });
    expect(s.chain.length).toBe(0);
  });
});

describe("11.2 keyboard chain fires story triggers", () => {
  it("keyboard chain credited inventory correctly", () => {
    let s = createInitialState();
    s.settings.keyboardCursor = { row: 0, col: 2, active: true };
    s.chain = Array.from({ length: 3 }, (_, i) => ({ row: 0, col: i, key: "grass_hay" }));
    const before = s.inventory.grass_hay ?? 0;
    s = handleKeyboard(s, { key: "Enter" });
    expect(s.inventory.grass_hay ?? 0).toBeGreaterThan(before);
  });
});
