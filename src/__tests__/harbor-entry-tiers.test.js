// Mirror of mine-entry-tiers.test.js. HARBOR/ENTER pays a per-trip
// cost from the chosen tier and switches biomeKey to "fish". Each
// tier may extend the local run budget and/or skip a resource cost.

import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { HARBOR_ENTRY_TIERS } from "../constants.js";
import { ZONES } from "../features/zones/data.js";

function harborReady(over = {}) {
  return {
    ...createInitialState(),
    mapCurrent: "harbor",
    activeZone: "harbor",
    settlements: { home: { founded: true }, harbor: { founded: true, biome: "coastal" } },
    ...over,
  };
}

describe("HARBOR/ENTER tiers", () => {
  it("HARBOR_ENTRY_TIERS is exported with the three expected ids", () => {
    const ids = HARBOR_ENTRY_TIERS.map((t) => t.id);
    expect(ids).toEqual(["free", "better", "premium"]);
  });

  it("rejects HARBOR/ENTER with an unknown tier id", () => {
    const s = createInitialState();
    const r = rootReducer(s, { type: "HARBOR/ENTER", payload: { tier: "nope" } });
    expect(r.biomeKey).toBe(s.biomeKey); // unchanged
  });

  it("rejects free tier without enough wood_plank", () => {
    const s = harborReady({ inventory: { wood_plank: 1 } });
    const r = rootReducer(s, { type: "HARBOR/ENTER", payload: { tier: "free" } });
    expect(r).toBe(s);
  });

  it("free tier deducts wood_plank and switches to fish biome with default turns", () => {
    const s = harborReady({ inventory: { wood_plank: 5 } });
    const r = rootReducer(s, { type: "HARBOR/ENTER", payload: { tier: "free" } });
    expect(r.biomeKey).toBe("fish");
    expect(r.biome).toBe("fish");
    expect(r.inventory.wood_plank).toBe(2); // 5 - 3
    expect(r.farmRun.turnBudget).toBe(ZONES.harbor.baseTurns);
    expect(r.farmRun.turnsRemaining).toBe(ZONES.harbor.baseTurns);
    expect(r._needsRefill).toBe(true);
  });

  it("better tier rejects without coins", () => {
    const s = harborReady({ coins: 100, inventory: { wood_plank: 5 } });
    const r = rootReducer(s, { type: "HARBOR/ENTER", payload: { tier: "better" } });
    expect(r).toBe(s);
  });

  it("better tier rejects without enough wood_plank", () => {
    const s = harborReady({ coins: 500, inventory: { wood_plank: 1 } });
    const r = rootReducer(s, { type: "HARBOR/ENTER", payload: { tier: "better" } });
    expect(r).toBe(s);
  });

  it("better tier deducts coins + planks and gives +2 run-budget turns", () => {
    const s = harborReady({ coins: 500, inventory: { wood_plank: 10 } });
    const r = rootReducer(s, { type: "HARBOR/ENTER", payload: { tier: "better" } });
    expect(r.biomeKey).toBe("fish");
    expect(r.coins).toBe(500 - 150);
    expect(r.inventory.wood_plank).toBe(10 - 5);
    expect(r.farmRun.turnBudget).toBe(ZONES.harbor.baseTurns + 2);
  });

  it("premium tier rejects without enough runes", () => {
    const s = harborReady({ runes: 1 });
    const r = rootReducer(s, { type: "HARBOR/ENTER", payload: { tier: "premium" } });
    expect(r).toBe(s);
  });

  it("premium tier deducts runes and switches to fish biome", () => {
    const s = harborReady({ runes: 5 });
    const r = rootReducer(s, { type: "HARBOR/ENTER", payload: { tier: "premium" } });
    expect(r.biomeKey).toBe("fish");
    expect(r.runes).toBe(5 - 2);
    expect(r.farmRun.turnBudget).toBe(ZONES.harbor.baseTurns);
  });
});
