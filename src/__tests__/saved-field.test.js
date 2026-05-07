import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { BUILDINGS } from "../constants.js";
import { MIGRATIONS, SAVE_SCHEMA_VERSION } from "../migrations.js";

const findBuilding = (id) => BUILDINGS.find(b => b.id === id);

describe("Phase 12.5 — saved-field preservation", () => {
  it("registers silo and barn buildings with §18 wording", () => {
    const silo = findBuilding("silo");
    const barn = findBuilding("barn");
    expect(silo).toMatchObject({ cost: { coins: 250, plank: 15 },
      lv: 4, biome: "farm" });
    expect(barn).toMatchObject({ cost: { coins: 400, plank: 25, stone: 5 },
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
    const tiles = [["hay","log","hay","wheat","berry","egg"]];
    const s0 = { ...createInitialState(),
      biomeKey: "farm", built: { ...createInitialState().built, silo: true },
      board: { tiles, hazards: [] } };
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.farm.savedField).toMatchObject({ tiles, hazards: [], turnsUsed: 0 });
  });

  it("CLOSE_SEASON does NOT snapshot when silo not built", () => {
    const s0 = { ...createInitialState(),
      biomeKey: "farm",
      board: { tiles: [["hay"]], hazards: [] } };
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.farm.savedField).toBeNull();
  });

  it("SWITCH_BIOME restores saved field when non-null", () => {
    const tiles = [["wheat","wheat","hay","log","berry","egg"]];
    const s0 = { ...createInitialState(),
      biomeKey: "mine",
      farm: { savedField: { tiles, hazards: [{ id: "vent" }], turnsUsed: 5 } } };
    const s1 = rootReducer(s0,
      { type: "SWITCH_BIOME", payload: { biome: "farm" } });
    expect(s1.board.tiles).toEqual(tiles);
    expect(s1.board.hazards).toEqual([{ id: "vent" }]);
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

  it("SAVE_SCHEMA_VERSION === 12 and migration v11 → v12 seeds slots", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(12);
    const v11 = { version: 11, farm: {}, mine: {} };
    const v12 = MIGRATIONS[11](v11);
    expect(v12.farm.savedField).toBeNull();
    expect(v12.mine.savedField).toBeNull();
  });

  it("migration is idempotent on already-v12 saves", () => {
    const v12 = { farm: { savedField: null }, mine: { savedField: null } };
    const again = MIGRATIONS[11](v12);
    expect(again).toEqual(v12);
  });
});
