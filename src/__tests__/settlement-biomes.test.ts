// Phase 5e — settlement biomes (master doc §IV): config + per-settlement
// biome/hazards + picking a biome at founding.
import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { SETTLEMENT_BIOMES, DEFAULT_HOME_BIOME } from "../constants.js";
import {
  biomesForType,
  settlementBiomeId,
  settlementBiome,
  settlementHazards,
  resolveBiomeChoice,
} from "../features/zones/data.js";

beforeEach(() => global.localStorage.clear());

describe("SETTLEMENT_BIOMES config", () => {
  it("each settlement type offers 4 biomes, each with 2 hazards + a bonus", () => {
    for (const type of ["farm", "mine", "harbor"]) {
      const list = SETTLEMENT_BIOMES[type];
      expect(Array.isArray(list)).toBe(true);
      expect(list).toHaveLength(4);
      for (const b of list) {
        expect(typeof b.id).toBe("string");
        expect(typeof b.name).toBe("string");
        expect(typeof b.icon).toBe("string");
        expect(b.hazards).toHaveLength(2);
        expect(typeof b.bonus).toBe("string");
      }
    }
  });
  it("DEFAULT_HOME_BIOME is one of the farm biomes", () => {
    expect(SETTLEMENT_BIOMES.farm.some((b) => b.id === DEFAULT_HOME_BIOME)).toBe(true);
  });
});

describe("biomesForType / resolveBiomeChoice", () => {
  it("returns the type's options, or [] / null for unknown types", () => {
    expect(biomesForType("farm")).toHaveLength(4);
    expect(biomesForType("nope")).toEqual([]);
    expect(resolveBiomeChoice("farm", "marsh")?.id).toBe("marsh");
    expect(resolveBiomeChoice("farm", "bogus")?.id).toBe(SETTLEMENT_BIOMES.farm[0].id); // first
    expect(resolveBiomeChoice("nope", "x")).toBeNull();
  });
});

describe("settlementBiomeId / settlementBiome / settlementHazards", () => {
  it("home has the implicit default biome; unfounded zones have none", () => {
    const s = createInitialState();
    expect(settlementBiomeId(s, "home")).toBe(DEFAULT_HOME_BIOME);
    expect(settlementBiome(s, "home")?.id).toBe(DEFAULT_HOME_BIOME);
    expect(settlementBiomeId(s, "meadow")).toBeNull();
  });
  it("home's hazards come from its biome; an unfounded zone falls back to its static dangers", () => {
    const s = createInitialState();
    const prairie = SETTLEMENT_BIOMES.farm.find((b) => b.id === DEFAULT_HOME_BIOME);
    expect(settlementHazards(s, "home")).toEqual(prairie.hazards);
    expect(Array.isArray(settlementHazards(s, "meadow"))).toBe(true); // ZONES.meadow.dangers ?? []
  });
});

describe("FOUND_SETTLEMENT picks the biome", () => {
  // Phase 6a — second founding requires the first (home) be complete; pre-build
  // and pre-keeper home so the progression gate doesn't fire.
  const homeCompleted = (over = {}) => {
    const built = { decorations: {}, _plots: {} };
    for (const b of ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge", "caravan_post"]) built[b] = true;
    return {
      ...createInitialState(),
      coins: 9999,
      built: { ...createInitialState().built, home: built },
      settlements: { home: { founded: true, biome: DEFAULT_HOME_BIOME, keeperPath: "coexist" } },
      ...over,
    };
  };

  it("records the chosen biome", () => {
    let s = homeCompleted();
    s = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow", biome: "forest" } });
    expect(s.settlements.meadow).toMatchObject({ founded: true, biome: "forest" });
    expect(settlementBiomeId(s, "meadow")).toBe("forest");
    expect(settlementHazards(s, "meadow")).toEqual(SETTLEMENT_BIOMES.farm.find((b) => b.id === "forest").hazards);
  });
  it("works for a mine zone", () => {
    let s = homeCompleted();
    s = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "quarry", biome: "tundra" } });
    expect(s.settlements.quarry).toMatchObject({ founded: true, biome: "tundra" });
  });
  it("a missing/unknown biome falls back to the first option for the type", () => {
    let s = homeCompleted();
    s = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } });
    expect(s.settlements.meadow.biome).toBe(SETTLEMENT_BIOMES.farm[0].id);
  });
});
