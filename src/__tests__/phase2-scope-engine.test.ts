// Phase 2 engine changes for the zones-1&2 scope:
//   • the repeatable House (per-town cap + on-build villager grant),
//   • global building unlock (unlocked anywhere → buildable everywhere),
//   • founding cost as a scaling resource basket.
import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { BUILDINGS } from "../constants.js";
import { patchInventory } from "../testUtils/inventory.js";
import {
  houseCountAt,
  houseCapForZone,
  HOUSE_VILLAGER_GRANT,
  globallyUnlockedBuildings,
  settlementFoundingCost,
  canAffordFounding,
  foundingCostLabel,
} from "../features/zones/data.js";

beforeEach(() => global.localStorage.clear());

const HOUSE = BUILDINGS.find((b) => b.id === "housing");

describe("repeatable House", () => {
  it("caps per town: 3 at home, 2 at meadow, 1 elsewhere", () => {
    expect(houseCapForZone("home")).toBe(3);
    expect(houseCapForZone("meadow")).toBe(2);
    expect(houseCapForZone("orchard")).toBe(1);
  });

  it("each House grants villagers on build and is repeatable up to the cap", () => {
    let s = patchInventory(
      { ...createInitialState(), mapCurrent: "home", activeZone: "home" },
      { plank: 999, bread: 999, eggs: 999 },
      "home",
    );
    expect(s.villagers).toBe(0);

    s = rootReducer(s, { type: "BUILD", building: HOUSE });
    expect(houseCountAt(s, "home")).toBe(1);
    expect(s.villagers).toBe(HOUSE_VILLAGER_GRANT);

    s = rootReducer(s, { type: "BUILD", building: HOUSE });
    s = rootReducer(s, { type: "BUILD", building: HOUSE });
    expect(houseCountAt(s, "home")).toBe(3);
    expect(s.villagers).toBe(HOUSE_VILLAGER_GRANT * 3);
  });

  it("rejects a House past the cap with a 'fully housed' bubble", () => {
    let s = patchInventory(
      { ...createInitialState(), mapCurrent: "home", activeZone: "home" },
      { plank: 999, bread: 999, eggs: 999 },
      "home",
    );
    for (let i = 0; i < 3; i++) s = rootReducer(s, { type: "BUILD", building: HOUSE });
    const blocked = rootReducer(s, { type: "BUILD", building: HOUSE });
    expect(houseCountAt(blocked, "home")).toBe(3); // unchanged
    expect(blocked.villagers).toBe(HOUSE_VILLAGER_GRANT * 3); // no extra grant
    expect(blocked.bubble?.text).toMatch(/fully housed/i);
  });
});

describe("global building unlock", () => {
  it("unions founded zones' rosters and excludes unfounded zones", () => {
    const homeOnly = createInitialState(); // only home founded, at tier 0
    const g0 = globallyUnlockedBuildings(homeOnly);
    expect(g0).toContain("hearth"); // home tier-0 roster
    expect(g0).not.toContain("mining_camp"); // meadow-only, not founded
    expect(g0).not.toContain("chapel"); // home City tier, not yet reached

    const withMeadow = {
      ...homeOnly,
      settlements: { home: { founded: true, tier: 3 }, meadow: { founded: true, tier: 0 } },
    };
    const g1 = globallyUnlockedBuildings(withMeadow);
    expect(g1).toContain("mining_camp"); // meadow camp tier → now buildable anywhere
    expect(g1).toContain("chapel"); // home at City tier → in the union
  });
});

describe("founding cost — resource basket", () => {
  it("returns a resource basket and a readable label", () => {
    const { resources } = settlementFoundingCost(createInitialState());
    expect(Object.keys(resources).length).toBeGreaterThan(0);
    expect(typeof foundingCostLabel(createInitialState())).toBe("string");
  });

  it("canAffordFounding gates on the home (capital) stores", () => {
    const broke = createInitialState();
    expect(canAffordFounding(broke)).toBe(false);
    const stocked = patchInventory(broke, { plank: 99, bread: 99, hay_bundle: 99 }, "home");
    expect(canAffordFounding(stocked)).toBe(true);
  });
});
