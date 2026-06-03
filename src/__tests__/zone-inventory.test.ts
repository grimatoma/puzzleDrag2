import { describe, it, expect, beforeEach } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { inv, patchInventory } from "../testUtils/inventory.js";
import { ResourceKey } from "../types/catalogKeys.js";

beforeEach(() => global.localStorage.clear());

describe("per-zone inventory isolation", () => {
  it("fresh state seeds home with supplies: 0 and no global resource keys", () => {
    const s = createInitialState();
    expect(s.inventory).toEqual({ home: { supplies: 0 } });
    expect(s.inventory.home).toBeDefined();
    expect((s.inventory as Record<string, unknown>).flour).toBeUndefined();
  });

  it("home flour does not appear at quarry when mapCurrent is quarry", () => {
    const s0 = patchInventory(createInitialState(), { flour: 20 }, "home");
    const atQuarry = {
      ...s0,
      mapCurrent: "quarry",
      activeZone: "quarry",
      settlements: { ...s0.settlements, quarry: { founded: true, biome: "tundra" } },
    };
    expect(inv(atQuarry, "home").flour).toBe(20);
    expect(inv(atQuarry, "quarry").flour ?? 0).toBe(0);
  });

  it("CONVERT_TO_SUPPLY debits flour from the active settlement only", () => {
    const s0 = patchInventory(
      { ...createInitialState(), mapCurrent: "home", activeZone: "home" },
      { flour: 9 },
      "home",
    );
    const s1 = rootReducer(s0, { type: "CONVERT_TO_SUPPLY", payload: { qty: 1 } });
    expect(inv(s1, "home").flour).toBe(6);
    expect(inv(s1, "home").supplies).toBe(1);
  });

  it("a fresh quarry can bootstrap from global coins via market buy", () => {
    const s0 = {
      ...patchInventory(
        { ...createInitialState(), coins: 500, mapCurrent: "quarry", activeZone: "quarry" },
        {},
        "quarry",
      ),
      market: {
        ...createInitialState().market,
        prices: { flour: { buy: 10, sell: 2 } },
      },
    };
    const s1 = rootReducer(s0, { type: "BUY_RESOURCE", payload: { key: ResourceKey.Flour, qty: 3 } });
    expect(s1.coins).toBe(470);
    expect(inv(s1, "quarry").flour).toBe(3);
    expect(inv(s1, "home").flour ?? 0).toBe(0);
  });
});
