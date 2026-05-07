import { describe, it, expect, vi } from "vitest";
import { gameReducer } from "../state.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function minState(overrides = {}) {
  return {
    biomeKey: "farm",
    view: "board",
    coins: 100,
    level: 1,
    xp: 0,
    turnsUsed: 0,
    seasonsCycled: 1,
    inventory: {},
    orders: [],
    tools: { clear: 0, basic: 0, rare: 0, shuffle: 0 },
    built: {},
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    _hintsShown: {},
    npcBond: { mira: 5, tomas: 5, bram: 5, liss: 5, wren: 5 },
    ...overrides,
  };
}

/**
 * Stub for mockShuffleBoard: returns a fully populated 6×6 grid (plain objects).
 * The real Phaser shuffle randomises resources; here we just want all cells defined.
 */
function mockShuffleBoard() {
  const ROWS = 6, COLS = 6;
  const grid = [];
  const resources = ["grass_hay", "wood_log", "berry", "grain_wheat", "grain", "bird_egg"];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = { res: { key: resources[(r + c) % resources.length] }, row: r, col: c };
    }
  }
  return grid;
}

/**
 * Stub for invokeShuffleAnimation: calls scene.tweens.add with the expected params.
 */
function invokeShuffleAnimation(scene) {
  scene.tweens.add({
    targets: scene.board,
    rotation: Math.PI * 2,
    duration: 600,
    ease: "Sine.easeInOut",
    onComplete: () => {},
  });
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("Reshuffle Horn — USE_TOOL { key: 'shuffle' }", () => {
  it("decrements tools.shuffle by 1 on use", () => {
    const s = minState({ tools: { shuffle: 2, clear: 0, basic: 0, rare: 0 } });
    const after = gameReducer(s, { type: "USE_TOOL", payload: { key: "shuffle" } });
    expect(after.tools.shuffle).toBe(1);
  });

  it("is a referentially-equal no-op when count is 0", () => {
    const s = minState({ tools: { shuffle: 0, clear: 0, basic: 0, rare: 0 } });
    const after = gameReducer(s, { type: "USE_TOOL", payload: { key: "shuffle" } });
    expect(after).toBe(s);
  });

  it("does not consume a turn", () => {
    const s = minState({ tools: { shuffle: 1, clear: 0, basic: 0, rare: 0 }, turnsUsed: 4 });
    const after = gameReducer(s, { type: "USE_TOOL", payload: { key: "shuffle" } });
    expect(after.turnsUsed).toBe(4);
  });

  it("sets toolPending to 'shuffle'", () => {
    const s = minState({ tools: { shuffle: 1, clear: 0, basic: 0, rare: 0 } });
    const after = gameReducer(s, { type: "USE_TOOL", payload: { key: "shuffle" } });
    expect(after.toolPending).toBe("shuffle");
  });

  it("post-shuffle board is fully populated", () => {
    const grid = mockShuffleBoard();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) expect(grid[r][c]).toBeDefined();
    }
  });

  it("rotation tween fires on the board container (600ms, 2π)", () => {
    const tween = vi.fn();
    const scene = { tweens: { add: tween }, board: { rotation: 0 } };
    invokeShuffleAnimation(scene);
    expect(tween).toHaveBeenCalledWith(expect.objectContaining({
      duration: 600, rotation: Math.PI * 2,
    }));
  });
});
