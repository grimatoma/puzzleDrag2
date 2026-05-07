// Phase 11.1 — Color-blind palette toggle tests
import { describe, it, expect, beforeEach } from "vitest";
import { INITIAL_SETTINGS, loadSettings, saveSettings, settingsReduce, getTileColor, getSeasonColor } from "../settings.js";
import { PALETTES, BIOMES } from "../constants.js";
import { contrastRatio } from "../utils.js";

describe("11.1 settings initial shape", () => {
  it("default palette is 'default'", () => {
    expect(INITIAL_SETTINGS.palette).toBe("default");
  });
});

describe("11.1 PALETTES table", () => {
  const IDS = ["default", "deuteranopia", "protanopia", "tritanopia"];
  const KEYS = ["grass_hay","grain_wheat","grain","grain_flour","wood_log","wood_plank","wood_beam","berry","berry_jam",
    "bird_egg","stone","cobble","block","ore","ingot","coal","coke","gem","cutgem","gold"];

  IDS.forEach(id => {
    it(`palette ${id} exists`, () => {
      expect(PALETTES[id]).toBeTruthy();
    });
    KEYS.forEach(k => {
      it(`palette ${id} defines hex for ${k}`, () => {
        expect(typeof PALETTES[id].tiles[k]).toBe("number");
      });
    });
    ["Spring","Summer","Autumn","Winter"].forEach(s => {
      it(`palette ${id} defines ${s} bg`, () => {
        expect(typeof PALETTES[id].seasons[s]?.bg).toBe("number");
      });
    });
  });
});

describe("11.1 default palette equals existing constants", () => {
  it("default hay equals BIOMES.farm hay", () => {
    const farmHay = BIOMES.farm.resources.find(r => r.key === "grass_hay").color;
    expect(PALETTES.default.tiles.grass_hay).toBe(farmHay);
  });
  it("default ore equals BIOMES.mine ore", () => {
    const mineOre = BIOMES.mine.resources.find(r => r.key === "ore").color;
    expect(PALETTES.default.tiles.ore).toBe(mineOre);
  });
});

describe("11.1 SET_PALETTE reducer", () => {
  it("palette switched to deuteranopia", () => {
    let s = INITIAL_SETTINGS;
    s = settingsReduce(s, { type: "SET_PALETTE", id: "deuteranopia" });
    expect(s.palette).toBe("deuteranopia");
  });
});

describe("11.1 getTileColor / getSeasonColor", () => {
  it("getTileColor honours active palette", () => {
    const fakeState = { settings: { palette: "deuteranopia" }, biome: "farm" };
    expect(getTileColor(fakeState, "grass_hay")).toBe(PALETTES.deuteranopia.tiles.grass_hay);
  });

  it("getSeasonColor honours active palette", () => {
    const fakeState = { settings: { palette: "deuteranopia" } };
    expect(getSeasonColor(fakeState, "Spring")).toEqual(PALETTES.deuteranopia.seasons.Spring);
  });
});

describe("11.1 localStorage round-trip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("palette persisted and loaded", () => {
    saveSettings({ palette: "tritanopia", reducedMotion: false });
    const loaded = loadSettings();
    expect(loaded.palette).toBe("tritanopia");
  });
});

describe("11.1 contrast ratios ≥ 3:1 for adjacency pairs", () => {
  ["deuteranopia","protanopia","tritanopia"].forEach(p => {
    it(`${p}: hay vs log ≥ 3:1`, () => {
      const t = PALETTES[p].tiles;
      expect(contrastRatio(t.grass_hay, t.wood_log)).toBeGreaterThanOrEqual(3.0);
    });
    it(`${p}: hay vs berry ≥ 3:1`, () => {
      const t = PALETTES[p].tiles;
      expect(contrastRatio(t.grass_hay, t.berry)).toBeGreaterThanOrEqual(3.0);
    });
    it(`${p}: log vs berry ≥ 3:1`, () => {
      const t = PALETTES[p].tiles;
      expect(contrastRatio(t.wood_log, t.berry)).toBeGreaterThanOrEqual(3.0);
    });
    it(`${p}: ore vs coal ≥ 3:1`, () => {
      const t = PALETTES[p].tiles;
      expect(contrastRatio(t.ore, t.coal)).toBeGreaterThanOrEqual(3.0);
    });
  });
});
