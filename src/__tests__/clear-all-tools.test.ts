/**
 * Generic clear_all tool power — driven by ITEMS.power.params.target (tile key).
 */
import { describe, it, expect } from "vitest";
import { ITEMS } from "../constants.js";
import { createInitialState, rootReducer } from "../state.js";
import { clearTilesOfKey } from "../features/farm/tools.js";

function makeGrid(keys) {
  const grid = Array.from({ length: 2 }, () =>
    Array.from({ length: 3 }, () => ({ key: "tile_special_dirt" })),
  );
  let idx = 0;
  for (const key of keys) {
    if (idx >= 6) break;
    const r = Math.floor(idx / 3);
    const c = idx % 3;
    grid[r][c] = { key };
    idx += 1;
  }
  return grid;
}

describe("clearTilesOfKey", () => {
  it("clears only the requested tile type", () => {
    const s0 = {
      ...createInitialState(),
      grid: makeGrid(["tile_veg_carrot", "tile_veg_carrot", "tile_grass_grass"]),
      inventory: {},
    };
    const { state: s1, collected } = clearTilesOfKey(s0, "tile_veg_carrot");
    expect(collected).toBe(2);
    expect(s1.inventory.tile_veg_carrot).toBe(2);
  });
});

describe("USE_TOOL — clear_all via power.params.target", () => {
  it("hoe clears carrots and refunds when none present", () => {
    expect(ITEMS.hoe.power.id).toBe("clear_all");

    const withCarrots = {
      ...createInitialState(),
      grid: makeGrid(["tile_veg_carrot", "tile_veg_carrot"]),
      tools: { ...createInitialState().tools, hoe: 1 },
      inventory: { ...createInitialState().inventory, tile_veg_carrot: 0 },
    };
    const used = rootReducer(withCarrots, { type: "USE_TOOL", payload: { id: "hoe" } });
    expect(used.tools.hoe).toBe(0);
    expect(used.inventory.tile_veg_carrot).toBe(2);

    const empty = {
      ...createInitialState(),
      grid: makeGrid(["tile_grass_grass"]),
      tools: { ...createInitialState().tools, hoe: 1 },
    };
    const refunded = rootReducer(empty, { type: "USE_TOOL", payload: { id: "hoe" } });
    expect(refunded.tools.hoe).toBe(1);
  });
});
