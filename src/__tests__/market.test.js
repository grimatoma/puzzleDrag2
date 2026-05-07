import { describe, it, expect } from "vitest";
import { MARKET_PRICES } from "../constants.js";
import { driftPrices, applyTrade, bombFootprint } from "../market.js";

describe("3.1 — Market prices", () => {
  it("MARKET_PRICES covers all 20 sellable resources", () => {
    const keys = [
      "grass_hay", "grain_wheat", "grain", "grain_flour", "wood_log", "wood_plank", "wood_beam",
      "berry", "berry_jam", "bird_egg", "stone", "cobble", "block", "ore",
      "ingot", "coal", "coke", "gem", "cutgem", "gold",
    ];
    for (const k of keys) {
      expect(MARKET_PRICES[k], `MARKET_PRICES has ${k}`).toBeTruthy();
      expect(
        MARKET_PRICES[k].buy > MARKET_PRICES[k].sell * 5,
        `${k} sell is emergency rate (< buy/5)`,
      ).toBe(true);
    }
  });

  it("drift is bounded within ±15% across 1000 seasons", () => {
    const seed = 12345;
    for (let s = 0; s < 1000; s++) {
      const p = driftPrices(seed, s);
      for (const k of Object.keys(MARKET_PRICES)) {
        const base = MARKET_PRICES[k].buy;
        expect(p[k].buy).toBeGreaterThanOrEqual(Math.floor(base * 0.85));
        expect(p[k].buy).toBeLessThanOrEqual(Math.ceil(base * 1.15));
      }
    }
  });

  it("drift is deterministic — same seed+season = same prices", () => {
    const a = driftPrices(7, 4);
    const b = driftPrices(7, 4);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("BUY_RESOURCE: insufficient coins → no-op", () => {
    const broke = {
      coins: 10,
      inventory: {},
      market: { prices: { grass_hay: { buy: 40, sell: 0 } } },
    };
    const r1 = applyTrade(broke, { type: "BUY_RESOURCE", payload: { key: "grass_hay", qty: 1 } });
    expect(r1).toBe(broke);
  });

  it("BUY_RESOURCE: sufficient coins → debit coins, credit inventory", () => {
    const flush = {
      coins: 100,
      inventory: {},
      market: { prices: { grass_hay: { buy: 40, sell: 0 } } },
    };
    const r2 = applyTrade(flush, { type: "BUY_RESOURCE", payload: { key: "grass_hay", qty: 2 } });
    expect(r2.coins).toBe(20);
    expect(r2.inventory.grass_hay).toBe(2);
  });

  it("SELL_RESOURCE: selling more than owned → no-op", () => {
    const empty = {
      coins: 0,
      inventory: { grass_hay: 1 },
      market: { prices: { grass_hay: { buy: 40, sell: 0 } } },
    };
    const r3 = applyTrade(empty, { type: "SELL_RESOURCE", payload: { key: "grass_hay", qty: 5 } });
    expect(r3).toBe(empty);
  });
});

describe("3.4 — bombFootprint (exported from market.js)", () => {
  it("centre bomb hits 9 tiles", () => {
    expect(bombFootprint(2, 2, 6, 6).length).toBe(9);
  });

  it("corner bomb hits 4 tiles", () => {
    expect(bombFootprint(0, 0, 6, 6).length).toBe(4);
  });

  it("edge bomb hits 6 tiles", () => {
    expect(bombFootprint(0, 3, 6, 6).length).toBe(6);
  });
});
