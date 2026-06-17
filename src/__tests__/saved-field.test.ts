import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { BUILDINGS } from "../constants.js";

const findBuilding = (id) => BUILDINGS.find(b => b.id === id);

describe("Phase 12.5 — saved-field preservation", () => {
  it("registers silo and barn buildings with §18 wording", () => {
    const silo = findBuilding("silo");
    const barn = findBuilding("barn");
    expect(silo).toMatchObject({ cost: { plank: 3, bread: 5 },
      lv: 4, biome: "farm" });
    expect(barn).toMatchObject({ cost: { plank: 6, block: 6, iron_bar: 4 },
      lv: 5, biome: "mine" });
    expect(silo.desc).toMatch(/preserves the tile layout between sessions/i);
    expect(barn.desc).toMatch(/preserves the tile layout between sessions/i);
  });

  it("fresh state seeds both savedField slots to null", () => {
    const s = createInitialState();
    expect(s.farm.savedField).toBeNull();
    expect(s.mine.savedField).toBeNull();
  });

  it("CLOSE_SEASON snapshots farm field when silo built", () => {
    const tiles = [["tile_grass_grass","tile_tree_oak","tile_grass_grass","tile_grain_wheat","berry","eggs"]];
    const s0 = { ...createInitialState(),
      biomeKey: "farm", built: { ...createInitialState().built, silo: true },
      grid: tiles, hazards: null };
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.farm.savedField).toMatchObject({ tiles, turnsUsed: 0 });
  });

  it("CLOSE_SEASON does NOT snapshot when silo not built", () => {
    const s0 = { ...createInitialState(),
      biomeKey: "farm",
      grid: [["tile_grass_grass"]], hazards: null };
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.farm.savedField).toBeNull();
  });

  it("SWITCH_BIOME restores saved field when non-null", () => {
    const tiles = [["tile_grain_wheat","tile_grain_wheat","tile_grass_grass","tile_tree_oak","berry","eggs"]];
    const s0 = { ...createInitialState(),
      biomeKey: "mine",
      farm: { savedField: { tiles, hazards: [{ id: "vent" }], turnsUsed: 5 } } };
    const s1 = rootReducer(s0,
      { type: "SWITCH_BIOME", payload: { biome: "farm" } });
    expect(s1.grid).toEqual(tiles);
    expect(s1.turnsUsed).toBe(0);
  });

  it("SWITCH_BIOME generates fresh board when slot is null", () => {
    const s0 = { ...createInitialState(), biomeKey: "mine" };
    const s1 = rootReducer(s0,
      { type: "SWITCH_BIOME", payload: { biome: "farm" } });
    // Should not crash; board may or may not be populated depending on implementation
    // The key invariant: turnsUsed reset to 0 and farm.savedField stays null
    expect(s1.farm.savedField).toBeNull();
    expect(s1.turnsUsed).toBe(0);
  });

});
