// Phase 37 — Balance Manager extension: applyZoneOverrides + applyWorkerOverrides.
//
// Pure-function tests against a clone of the live tables so the live
// modules don't drift across the suite.
import { describe, it, expect } from "vitest";
import {
  applyZoneOverrides,
  applyWorkerOverrides,
} from "../src/config/applyOverrides.js";

function freshZones() {
  return {
    zone1: {
      id: "zone1",
      name: "Zone 1",
      baseTurns: 16,
      entryCost: { coins: 50 },
      upgradeMap: { grass: "birds", grain: "vegetables" },
      seasonDrops: {
        Spring: { trees: 0.20 },
        Winter: { trees: 0.70 },
      },
    },
  };
}

function freshWorkers() {
  return [
    {
      id: "farmer",
      name: "Farmer",
      hireCost: { coins: 50, coinsStep: 25 },
      maxCount: 10,
      effect: { type: "threshold_reduce_category", category: "grain", from: 6, to: 5 },
    },
    {
      id: "baker",
      name: "Baker",
      hireCost: { coins: 75, coinsMult: 1.4 },
      maxCount: 10,
      effect: { type: "recipe_input_reduce", recipe: "bread", input: "grain_flour", from: 3, to: 1 },
    },
  ];
}

describe("Phase 37 — applyZoneOverrides", () => {
  it("is a no-op when overrides is missing or empty", () => {
    const z = freshZones();
    applyZoneOverrides(z, undefined);
    applyZoneOverrides(z, {});
    expect(z.zone1.baseTurns).toBe(16);
    expect(z.zone1.entryCost.coins).toBe(50);
  });

  it("patches baseTurns and floors fractional input", () => {
    const z = freshZones();
    applyZoneOverrides(z, { zone1: { baseTurns: 12.7 } });
    expect(z.zone1.baseTurns).toBe(12);
  });

  it("rejects base turns < 1", () => {
    const z = freshZones();
    applyZoneOverrides(z, { zone1: { baseTurns: 0 } });
    expect(z.zone1.baseTurns).toBe(16);
  });

  it("patches entryCost.coins while preserving sibling fields", () => {
    const z = freshZones();
    z.zone1.entryCost.runes = 1; // sibling that must not vanish
    applyZoneOverrides(z, { zone1: { entryCost: { coins: 100 } } });
    expect(z.zone1.entryCost.coins).toBe(100);
    expect(z.zone1.entryCost.runes).toBe(1);
  });

  it("replaces upgradeMap wholesale and drops empty/non-string targets", () => {
    const z = freshZones();
    applyZoneOverrides(z, {
      zone1: { upgradeMap: { grass: "trees", grain: "", trees: null, vegetables: "fruits" } },
    });
    expect(z.zone1.upgradeMap).toEqual({ grass: "trees", vegetables: "fruits" });
  });

  it("merges seasonDrops by season; cleared seasons are replaced wholesale", () => {
    const z = freshZones();
    applyZoneOverrides(z, {
      zone1: {
        seasonDrops: {
          Spring: { trees: 0.30, grass: 0.40 },   // replaces the whole Spring table
          Summer: { fruits: 0.25 },               // adds a brand-new season
          // Autumn untouched
        },
      },
    });
    expect(z.zone1.seasonDrops.Spring).toEqual({ trees: 0.30, grass: 0.40 });
    expect(z.zone1.seasonDrops.Summer).toEqual({ fruits: 0.25 });
    expect(z.zone1.seasonDrops.Winter).toEqual({ trees: 0.70 }); // unchanged
  });

  it("clamps negative seasonDrops percentages out", () => {
    const z = freshZones();
    applyZoneOverrides(z, { zone1: { seasonDrops: { Spring: { trees: -1, grass: 0.2 } } } });
    expect(z.zone1.seasonDrops.Spring).toEqual({ grass: 0.2 });
  });

  it("ignores patches for unknown zone ids", () => {
    const z = freshZones();
    applyZoneOverrides(z, { zoneX: { baseTurns: 99 } });
    expect(z.zone1.baseTurns).toBe(16);
  });
});

describe("Phase 37 — applyWorkerOverrides", () => {
  it("is a no-op when overrides is missing", () => {
    const w = freshWorkers();
    applyWorkerOverrides(w, undefined);
    expect(w[0].hireCost.coins).toBe(50);
  });

  it("patches hireCost.coins (floored)", () => {
    const w = freshWorkers();
    applyWorkerOverrides(w, { farmer: { hireCost: { coins: 60.9 } } });
    expect(w[0].hireCost.coins).toBe(60);
    // Sibling step preserved.
    expect(w[0].hireCost.coinsStep).toBe(25);
  });

  it("can replace coinsStep with a new positive value", () => {
    const w = freshWorkers();
    applyWorkerOverrides(w, { farmer: { hireCost: { coinsStep: 40 } } });
    expect(w[0].hireCost.coinsStep).toBe(40);
  });

  it("explicit null on coinsStep removes the linear ramp", () => {
    const w = freshWorkers();
    applyWorkerOverrides(w, { farmer: { hireCost: { coinsStep: null } } });
    expect(w[0].hireCost.coinsStep).toBeUndefined();
  });

  it("can replace coinsMult and remove it via explicit null", () => {
    const w = freshWorkers();
    applyWorkerOverrides(w, { baker: { hireCost: { coinsMult: 1.6 } } });
    expect(w[1].hireCost.coinsMult).toBe(1.6);
    applyWorkerOverrides(w, { baker: { hireCost: { coinsMult: null } } });
    expect(w[1].hireCost.coinsMult).toBeUndefined();
  });

  it("patches maxCount (floored, clamped to >=1)", () => {
    const w = freshWorkers();
    applyWorkerOverrides(w, { farmer: { maxCount: 15.7 } });
    expect(w[0].maxCount).toBe(15);
    applyWorkerOverrides(w, { farmer: { maxCount: 0 } });
    expect(w[0].maxCount).toBe(15); // unchanged because <1 rejected
  });

  it("replaces abilities wholesale", () => {
    const w = freshWorkers();
    applyWorkerOverrides(w, {
      farmer: {
        abilities: [
          { id: "pool_weight_legacy", params: { target: "grain_wheat", amount: 3 } },
        ],
      },
    });
    expect(w[0].abilities).toEqual([
      { id: "pool_weight_legacy", params: { target: "grain_wheat", amount: 3 } },
    ]);
  });

  it("ignores patches for unknown worker ids", () => {
    const w = freshWorkers();
    applyWorkerOverrides(w, { wizard: { maxCount: 5 } });
    expect(w[0].maxCount).toBe(10);
    expect(w[1].maxCount).toBe(10);
  });
});
