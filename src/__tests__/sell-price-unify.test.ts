/**
 * Doc 13 — unify the sell price model.
 *
 * Before: the same key could pay ~10× more when sold as a "resource"
 * (SELL_RESOURCE → applyTrade, live market price) than as an "item"
 * (SELL_ITEM → flat 10%-of-value). These tests pin the closed fork.
 */
import { describe, it, expect } from "vitest";
import { patchInventory } from "../testUtils/inventory.js";
import { createInitialState, rootReducer } from "../state.js";
import { sellPriceFor, effectiveSellPrice } from "../features/market/pricing.js";

describe("effectiveSellPrice — single source of truth", () => {
  it("prefers a positive market price over the flat 10% value price", () => {
    // pie: value 90 → 10% = 9, but market sell = 90.
    expect(sellPriceFor("pie")).toBe(9);
    expect(effectiveSellPrice("pie", { pie: { sell: 90 } })).toBe(90);
  });

  it("falls back to the value-based price when there is no market table", () => {
    expect(effectiveSellPrice("pie", null)).toBe(sellPriceFor("pie"));
    expect(effectiveSellPrice("pie", undefined)).toBe(sellPriceFor("pie"));
  });

  it("treats a market sell of 0 as 'no market price' (does not suppress an item)", () => {
    expect(effectiveSellPrice("iron_frame", { iron_frame: { sell: 0 } })).toBe(sellPriceFor("iron_frame"));
  });
});

describe("SELL_ITEM ↔ SELL_RESOURCE pay the same for the same key", () => {
  function pieState() {
    const base = createInitialState();
    return {
      ...base,
      ...patchInventory(base, { pie: 2 }),
      coins: 0,
      market: {
        ...(base.market ?? {}),
        prices: { ...(base.market?.prices ?? {}), pie: { buy: 840, sell: 90 } },
      },
    };
  }

  it("SELL_ITEM now pays the market price (90), not 10% of value (9)", () => {
    const s1 = rootReducer(pieState(), { type: "SELL_ITEM", id: "pie", qty: 1 });
    expect(s1.coins).toBe(90);
  });

  it("SELL_ITEM and SELL_RESOURCE credit identical coins for the same key", () => {
    const asItem = rootReducer(pieState(), { type: "SELL_ITEM", id: "pie", qty: 1 });
    const asResource = rootReducer(pieState(), { type: "SELL_RESOURCE", payload: { key: "pie", qty: 1 } });
    expect(asItem.coins).toBe(asResource.coins);
  });
});
