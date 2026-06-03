/**
 * Phase 2 (tool-powers overhaul) — runtime wiring for the eight new power ids.
 *
 * Each test dispatches a real USE_TOOL (and TOOL_FIRED for tap-target powers)
 * with a synthetic `power` config in the payload, and asserts against the
 * resulting reducer state. No reducer mocking; tilesInCategory is the real
 * helper (Phase 1 already covered).
 *
 * Phase 3 will move the `power` field into ITEMS so tools dispatch by key.
 * Until then, the action payload is the contract.
 */
import { describe, it, expect } from "vitest";
import { inv } from "../testUtils/inventory.js";
import { rootReducer, createInitialState, disarmAllTools } from "../state.js";
import { ROWS, COLS } from "../constants.js";

// ─── helpers ──────────────────────────────────────────────────────────────

/**
 * Build a grid of the requested size populated from a 2D array of tile keys.
 * Any missing rows/cols pad with `tile_grass_grass` so callers can focus on
 * the interesting cells.
 */
function gridFrom(keyRows) {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const k = keyRows[r]?.[c] ?? "tile_grass_grass";
      row.push({ key: k });
    }
    grid.push(row);
  }
  return grid;
}

/** Count cells whose key matches the target. */
function countKey(grid, key) {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell.key === key) n += 1;
  return n;
}

function withGrid(grid, overrides = {}) {
  const s = createInitialState();
  return { ...s, grid, ...overrides };
}

// ─── clear_category ────────────────────────────────────────────────────────

describe("USE_TOOL { power: clear_category } — sweeps every tile family member", () => {
  it("clears all tree tiles, leaves grass untouched", () => {
    // Top-left 2×2 oak, top-right 2×2 hay, rest hay (default).
    const keyRows = [
      ["tile_tree_oak", "tile_tree_oak", "tile_grass_grass", "tile_grass_grass"],
      ["tile_tree_oak", "tile_tree_oak", "tile_grass_grass", "tile_grass_grass"],
    ];
    const s0 = withGrid(gridFrom(keyRows), { tools: { trimmer: 1 } });
    const before = { trees: countKey(s0.grid, "tile_tree_oak"), hay: countKey(s0.grid, "tile_grass_grass") };
    expect(before.trees).toBeGreaterThan(0);

    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "trimmer", power: { id: "clear_category", params: { target: "trees" } } },
    });

    expect(countKey(s1.grid, "tile_tree_oak")).toBe(0);
    // Hay count unchanged (the only other key on the test board).
    expect(countKey(s1.grid, "tile_grass_grass")).toBe(before.hay);
    // Tool charge consumed.
    expect(s1.tools.trimmer).toBe(0);
    // Inventory credited per existing collection-sweep convention.
    expect(inv(s1).tile_tree_oak ?? 0).toBe(before.trees);
  });
});

// ─── transform_tiles (board-wide) ───────────────────────────────────────────

describe("USE_TOOL { power: transform_tiles } — replaces matching tiles", () => {
  it("transforms every grass tile into wheat tiles", () => {
    const s0 = withGrid(gridFrom([]), { tools: { fertilizer_transform: 1 } });
    const beforeHay = countKey(s0.grid, "tile_grass_grass");
    expect(beforeHay).toBe(ROWS * COLS);

    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: {
        id: "fertilizer_transform",
        power: { id: "transform_tiles", params: { from: "grass", to: "tile_grain_wheat" } },
      },
    });

    expect(countKey(s1.grid, "tile_grass_grass")).toBe(0);
    expect(countKey(s1.grid, "tile_grain_wheat")).toBe(beforeHay);
    expect(s1.tools.fertilizer_transform).toBe(0);
  });

  it("accepts a literal tileKey for `from` (not a category)", () => {
    const keyRows = [["tile_grain_wheat", "tile_grain_wheat", "tile_grass_grass"]];
    const s0 = withGrid(gridFrom(keyRows), { tools: { generic: 1 } });

    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: {
        id: "generic",
        // "tile_grain_wheat" is a literal tile key, not a category name.
        power: { id: "transform_tiles", params: { from: "tile_grain_wheat", to: "tile_veg_carrot" } },
      },
    });

    expect(countKey(s1.grid, "tile_grain_wheat")).toBe(0);
    expect(countKey(s1.grid, "tile_veg_carrot")).toBe(2);
  });
});

// ─── transform_adjacent (tap-target) ────────────────────────────────────────

describe("USE_TOOL + TOOL_FIRED { power: transform_adjacent }", () => {
  it("transforms matching tiles in a 3×3 neighborhood of the tapped cell", () => {
    // Fill a region with dirt around (2,2). Outside the 3×3 around (2,2) is
    // hay; inside the 3×3 a mix of dirt + hay so we can verify both that
    // dirt → stone happens AND that hay is left alone.
    const grid = gridFrom([]);
    // Place dirt at (1,1), (1,2), (2,2), (2,3), (3,3), and (4,4) — last is
    // outside the radius=1 box around (2,2).
    grid[1][1].key = "tile_special_dirt";
    grid[1][2].key = "tile_special_dirt";
    grid[2][2].key = "tile_special_dirt";
    grid[2][3].key = "tile_special_dirt";
    grid[3][3].key = "tile_special_dirt";
    grid[4][4].key = "tile_special_dirt";

    const s0 = withGrid(grid, { tools: { transmuter: 1 } });

    // Arm.
    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: {
        id: "transmuter",
        power: { id: "transform_adjacent", params: { from: "dirt", to: "tile_mine_stone", radius: 1 } },
      },
    });
    expect(s1.toolPending).toBe("transmuter");
    expect(s1.toolPendingPower?.id).toBe("transform_adjacent");
    // Charge not yet spent.
    expect(s1.tools.transmuter).toBe(1);

    // Fire on (2,2). The 3×3 box covers rows 1..3, cols 1..3.
    const s2 = rootReducer(s1, { type: "TOOL_FIRED", row: 2, col: 2 });

    // Inside-radius dirts transformed to stone: (1,1), (1,2), (2,2), (2,3), (3,3) = 5 cells.
    expect(countKey(s2.grid, "tile_mine_stone")).toBe(5);
    // Outside-radius dirt at (4,4) preserved.
    expect(s2.grid[4][4].key).toBe("tile_special_dirt");
    // Tool charge consumed on fire.
    expect(s2.tools.transmuter).toBe(0);
    expect(s2.toolPending).toBeNull();
    expect(s2.toolPendingPower).toBeNull();
  });
});

// ─── area_blast (tap-target) ────────────────────────────────────────────────

describe("USE_TOOL + TOOL_FIRED { power: area_blast }", () => {
  it("clears every tile in a 3×3 neighborhood regardless of key", () => {
    const s0 = withGrid(gridFrom([]), { tools: { bomb_v2: 1 } });

    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "bomb_v2", power: { id: "area_blast", params: { radius: 1 } } },
    });
    expect(s1.toolPending).toBe("bomb_v2");
    expect(s1.toolPendingPower?.id).toBe("area_blast");

    // Tap on (2,2) — clears rows 1..3, cols 1..3 = 9 cells.
    const s2 = rootReducer(s1, { type: "TOOL_FIRED", row: 2, col: 2 });

    // Every cell in the 3×3 box is now key:null with _emptied:true.
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        expect(s2.grid[r][c].key).toBeNull();
        expect(s2.grid[r][c]._emptied).toBe(true);
      }
    }
    // Outside the box is untouched.
    expect(s2.grid[0][0].key).toBe("tile_grass_grass");
    expect(s2.grid[4][4].key).toBe("tile_grass_grass");
    // 9 hay cells collected to inventory.
    expect(inv(s2).tile_grass_grass ?? 0).toBe(9);
    expect(s2.tools.bomb_v2).toBe(0);
  });

  it("clamps to the board edge when tapping a corner", () => {
    const s0 = withGrid(gridFrom([]), { tools: { bomb_v2: 1 } });
    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "bomb_v2", power: { id: "area_blast", params: { radius: 1 } } },
    });
    // Tap (0,0) — only a 2×2 box at the corner can be cleared.
    const s2 = rootReducer(s1, { type: "TOOL_FIRED", row: 0, col: 0 });
    let clearedCount = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (s2.grid[r][c].key == null) clearedCount += 1;
      }
    }
    expect(clearedCount).toBe(4);
  });
});

// ─── tap_clear_type (tap-target) ───────────────────────────────────────────

describe("USE_TOOL + TOOL_FIRED { power: tap_clear_type }", () => {
  it("sweeps every tile that matches the tapped key", () => {
    // Place 4 wheat tiles in random spots; the rest are hay.
    const grid = gridFrom([]);
    grid[0][0].key = "tile_grain_wheat";
    grid[2][3].key = "tile_grain_wheat";
    grid[4][1].key = "tile_grain_wheat";
    grid[5][5].key = "tile_grain_wheat";
    const s0 = withGrid(grid, { tools: { wand_v2: 1 } });

    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "wand_v2", power: { id: "tap_clear_type", params: {} } },
    });
    expect(s1.toolPendingPower?.id).toBe("tap_clear_type");

    // Tap on (0,0) — a wheat cell. Should sweep every wheat tile.
    const s2 = rootReducer(s1, { type: "TOOL_FIRED", row: 0, col: 0 });

    expect(countKey(s2.grid, "tile_grain_wheat")).toBe(0);
    // Hay untouched (49 of them remain — 36 cells, 4 swept wheat from a 36-cell board where wheat replaced hay).
    const totalCells = ROWS * COLS;
    const remainingHay = totalCells - 4 /* swept wheat slots are now null */;
    expect(countKey(s2.grid, "tile_grass_grass")).toBe(remainingHay);
    // Inventory credited for the wheat.
    expect(inv(s2).tile_grain_wheat ?? 0).toBe(4);
    expect(s2.tools.wand_v2).toBe(0);
  });
});

// ─── undo_move ─────────────────────────────────────────────────────────────

describe("USE_TOOL { power: undo_move } — restores last chain snapshot", () => {
  it("rewinds grid + inventory + turn counter to the pre-chain snapshot", () => {
    const beforeGrid = gridFrom([]);
    const beforeInventory = { tile_grass_grass: 5 };
    const beforeFarmRun = { zoneId: "home", turnBudget: 10, turnsRemaining: 8, startedAt: 0, mode: "normal" };

    // Current state diverges from the snapshot — sim a chain having been
    // collected since.
    const afterGrid = gridFrom([]);
    afterGrid[0][0].key = "tile_grain_wheat";
    const s0 = {
      ...createInitialState(),
      grid: afterGrid,
      inventory: { home: { tile_grass_grass: 12 } },
      farmRun: { zoneId: "home", turnBudget: 10, turnsRemaining: 7, startedAt: 0, mode: "normal" },
      turnsUsed: 1,
      tools: { hourglass_v2: 1 },
      lastChainSnapshot: {
        zoneId: "home",
        inventory: beforeInventory,
        grid: beforeGrid,
        turnsUsed: 0,
        farmRun: beforeFarmRun,
      },
    };

    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "hourglass_v2", power: { id: "undo_move", params: {} } },
    });

    expect(s1.grid).toBe(beforeGrid);
    expect(inv(s1)).toEqual(beforeInventory);
    expect(s1.farmRun).toBe(beforeFarmRun);
    expect(s1.turnsUsed).toBe(0);
    expect(s1.tools.hourglass_v2).toBe(0);
    // Snapshot consumed so a second tap doesn't keep restoring.
    expect(s1.lastChainSnapshot).toBeNull();
  });

  it("refunds (does not consume the charge) when no snapshot exists", () => {
    const s0 = { ...createInitialState(), tools: { hourglass_v2: 1 }, lastChainSnapshot: null };
    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "hourglass_v2", power: { id: "undo_move", params: {} } },
    });
    // No charge consumed; the grid/farmRun aren't restored to anything.
    expect(s1.tools.hourglass_v2).toBe(1);
    expect(s1.grid).toBe(s0.grid);
    expect(s1.lastChainSnapshot).toBeNull();
  });
});

// ─── restore_turns ─────────────────────────────────────────────────────────

describe("USE_TOOL { power: restore_turns } — adds turns to the active run", () => {
  it("increments turnsRemaining and turnBudget by amount", () => {
    const s0 = {
      ...createInitialState(),
      tools: { ration: 1 },
      farmRun: { zoneId: "home", turnBudget: 10, turnsRemaining: 3, startedAt: 0, mode: "normal" },
    };
    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "ration", power: { id: "restore_turns", params: { amount: 5 } } },
    });
    expect(s1.farmRun.turnsRemaining).toBe(8);
    expect(s1.farmRun.turnBudget).toBe(15);
    expect(s1.tools.ration).toBe(0);
  });

  it("refunds when no active farmRun (out-of-board use)", () => {
    const s0 = { ...createInitialState(), tools: { ration: 1 }, farmRun: null };
    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "ration", power: { id: "restore_turns", params: { amount: 5 } } },
    });
    expect(s1.tools.ration).toBe(1);
    expect(s1.farmRun).toBeNull();
  });

  it("defaults amount to 5 when params omits it", () => {
    const s0 = {
      ...createInitialState(),
      tools: { ration: 1 },
      farmRun: { zoneId: "home", turnBudget: 10, turnsRemaining: 1, startedAt: 0, mode: "normal" },
    };
    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "ration", power: { id: "restore_turns", params: {} } },
    });
    expect(s1.farmRun.turnsRemaining).toBe(6);
  });
});

// ─── disarmAllTools — Phase 2 typed-power refund leak regression ───────────

describe("disarmAllTools — Phase 2 typed tap-target powers", () => {
  it("clears toolPendingPower without refunding the deferred charge", () => {
    // Arm an area_blast power on a tool key not in TAP_TARGET_TOOL_KEYS.
    // The charge is deferred to TOOL_FIRED, so disarming must NOT refund.
    const s0 = withGrid(gridFrom([]), { tools: { bomb_v2: 1 } });
    const armed = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "bomb_v2", power: { id: "area_blast", params: { radius: 1 } } },
    });
    expect(armed.toolPending).toBe("bomb_v2");
    expect(armed.toolPendingPower?.id).toBe("area_blast");
    // Charge stays at 1 — deferred to TOOL_FIRED.
    expect(armed.tools.bomb_v2).toBe(1);

    // Now navigate away — SET_VIEW to anything other than "board" funnels
    // through disarmAllTools (state.js:988). Use the helper directly too.
    const disarmedDirect = disarmAllTools(armed);
    expect(disarmedDirect.toolPending).toBeNull();
    expect(disarmedDirect.toolPendingPower).toBeNull();
    // Critical: tool count UNCHANGED — refunding here would dupe the charge.
    expect(disarmedDirect.tools.bomb_v2).toBe(1);

    // Same path via the reducer (SET_VIEW → coreReducer → disarmAllTools).
    const viaReducer = rootReducer(armed, { type: "SET_VIEW", view: "town" });
    expect(viaReducer.toolPending).toBeNull();
    expect(viaReducer.toolPendingPower).toBeNull();
    expect(viaReducer.tools.bomb_v2).toBe(1);
  });

  it("clears toolPendingPower for transform_adjacent without refund", () => {
    const s0 = withGrid(gridFrom([]), { tools: { coal_transmuter: 1 } });
    const armed = rootReducer(s0, {
      type: "USE_TOOL",
      payload: {
        id: "coal_transmuter",
        power: { id: "transform_adjacent", params: { from: "dirt", to: "tile_mine_stone", radius: 1 } },
      },
    });
    expect(armed.toolPendingPower?.id).toBe("transform_adjacent");
    expect(armed.tools.coal_transmuter).toBe(1);

    const disarmed = disarmAllTools(armed);
    expect(disarmed.toolPending).toBeNull();
    expect(disarmed.toolPendingPower).toBeNull();
    expect(disarmed.tools.coal_transmuter).toBe(1);
  });

  it("clears toolPendingPower for tap_clear_type without refund", () => {
    const s0 = withGrid(gridFrom([]), { tools: { wand_v2: 1 } });
    const armed = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "wand_v2", power: { id: "tap_clear_type", params: {} } },
    });
    expect(armed.toolPendingPower?.id).toBe("tap_clear_type");
    expect(armed.tools.wand_v2).toBe(1);

    const disarmed = disarmAllTools(armed);
    expect(disarmed.toolPending).toBeNull();
    expect(disarmed.toolPendingPower).toBeNull();
    expect(disarmed.tools.wand_v2).toBe(1);
  });

  it("preserves legacy refund behavior when only toolPending is set (no toolPendingPower)", () => {
    // Legacy arm path: toolPending is a non-tap-target tool key with no
    // typed power. disarm should refund the charge into tools[key], unchanged
    // from pre-Phase-2 behavior.
    const s0 = withGrid(gridFrom([]), {
      tools: { hourglass: 0 },
      toolPending: "hourglass",
      toolPendingPower: null,
    });
    const disarmed = disarmAllTools(s0);
    expect(disarmed.toolPending).toBeNull();
    expect(disarmed.toolPendingPower).toBeNull();
    // Refund: hourglass goes 0 → 1.
    expect(disarmed.tools.hourglass).toBe(1);
  });

  it("tap-target bomb arm via ITEMS.power disarms without refund", () => {
    const s0 = withGrid(gridFrom([]), { tools: { bomb: 2 } });
    const armed = rootReducer(s0, { type: "USE_TOOL", payload: { id: "bomb" } });
    expect(armed.toolPendingPower?.id).toBe("area_blast");
    const disarmed = disarmAllTools(armed);
    expect(disarmed.toolPending).toBeNull();
    expect(disarmed.toolPendingPower).toBeNull();
    expect(disarmed.tools.bomb).toBe(2);
  });
});

// ─── reveal_tiles ──────────────────────────────────────────────────────────

describe("USE_TOOL { power: reveal_tiles } — sentinel for future hidden tiles", () => {
  it("does not crash and does not change the board when no cell has hidden:true", () => {
    const s0 = withGrid(gridFrom([]), { tools: { miners_hat: 1 } });
    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "miners_hat", power: { id: "reveal_tiles", params: { target: "coal" } } },
    });
    // Charge consumed but the grid is the same reference (no-op pass-through).
    expect(s1.tools.miners_hat).toBe(0);
    expect(s1.grid).toBe(s0.grid);
  });

  it("flips hidden=true to hidden=false on matching cells when the field exists", () => {
    const grid = gridFrom([]);
    grid[1][1] = { key: "tile_mine_coal", hidden: true };
    grid[2][2] = { key: "tile_mine_coal", hidden: false };
    grid[3][3] = { key: "tile_mine_stone", hidden: true };
    const s0 = withGrid(grid, { tools: { miners_hat: 1 } });
    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "miners_hat", power: { id: "reveal_tiles", params: { target: "coal" } } },
    });
    expect(s1.grid[1][1].hidden).toBe(false);
    expect(s1.grid[1][1].key).toBe("tile_mine_coal");
    // Already-revealed coal untouched.
    expect(s1.grid[2][2].hidden).toBe(false);
    // Hidden stone untouched (not in target category).
    expect(s1.grid[3][3].hidden).toBe(true);
  });
});
