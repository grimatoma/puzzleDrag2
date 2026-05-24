import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { DECORATIONS } from "../features/decorations/data.js";

describe("new harbor + mine decorations", () => {
  it("registers driftwood_arch / pearl_fountain / fishing_dock / cobble_well / smelter_brazier", () => {
    for (const id of [
      "driftwood_arch",
      "pearl_fountain",
      "fishing_dock",
      "cobble_well",
      "smelter_brazier",
    ]) {
      expect(DECORATIONS[id], id).toBeDefined();
    }
  });

  it("each new entry has positive cost and influence > 0", () => {
    for (const id of ["driftwood_arch", "pearl_fountain", "fishing_dock", "cobble_well", "smelter_brazier"]) {
      const d = DECORATIONS[id];
      expect(d.influence).toBeGreaterThan(0);
      expect(d.cost.coins).toBeGreaterThan(0);
    }
  });

  it("driftwood_arch costs 4 plank + 6 tile_fish_kelp + 180◉", () => {
    expect(DECORATIONS.driftwood_arch.cost).toEqual({ coins: 180, plank: 4, tile_fish_kelp: 6 });
    expect(DECORATIONS.driftwood_arch.influence).toBe(55);
  });

  it("pearl_fountain costs 8 tile_mine_stone + 4 tile_fish_oyster + 400◉", () => {
    expect(DECORATIONS.pearl_fountain.cost).toEqual({ coins: 400, tile_mine_stone: 8, tile_fish_oyster: 4 });
    expect(DECORATIONS.pearl_fountain.influence).toBe(95);
  });

  it("BUILD_DECORATION on driftwood_arch with sufficient resources succeeds", () => {
    const s0 = {
      ...createInitialState(),
      coins: 500,
      inventory: { plank: 10, tile_fish_kelp: 10 },
      built: { decorations: {} },
      influence: 0,
    };
    const s1 = rootReducer(s0, { type: "BUILD_DECORATION", payload: { id: "driftwood_arch" } });
    const loc = s1.mapCurrent ?? "home";
    expect(s1.coins).toBe(500 - 180);
    expect(s1.inventory.plank).toBe(10 - 4);
    expect(s1.inventory.tile_fish_kelp).toBe(10 - 6);
    expect(s1.influence).toBe(55);
    expect(s1.built[loc]?.decorations?.driftwood_arch).toBe(1);
  });

  it("smelter_brazier requires iron_bar — rejects without enough", () => {
    const s0 = {
      ...createInitialState(),
      coins: 500,
      inventory: { iron_bar: 1, tile_mine_coal: 10 }, // 1 ingot < required 2
    };
    const s1 = rootReducer(s0, { type: "BUILD_DECORATION", payload: { id: "smelter_brazier" } });
    expect(s1.built?.decorations?.smelter_brazier).toBeUndefined();
  });

  it("higher-tier decorations have higher influence", () => {
    expect(DECORATIONS.pearl_fountain.influence).toBeGreaterThan(DECORATIONS.driftwood_arch.influence);
    expect(DECORATIONS.smelter_brazier.influence).toBeGreaterThan(DECORATIONS.cobble_well.influence);
  });
});
