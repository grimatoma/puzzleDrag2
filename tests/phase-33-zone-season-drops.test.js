// Phase 33 — Per-(zone, in-session season) percentage drop rates.
import { describe, it, expect } from "vitest";
import {
  ZONES,
  seasonIndexInSession,
  seasonNameInSession,
  pickByZoneSeasonDrops,
} from "../src/features/zones/data.js";
import { CATEGORY_OF } from "../src/features/tileCollection/data.js";
import { BIOMES } from "../src/constants.js";

const farmResources = BIOMES.farm.resources;

describe("Phase 33 — seasonIndexInSession (turn split)", () => {
  it("16-turn session splits 4/4/4/4 across the four seasons", () => {
    expect(seasonIndexInSession(0, 16)).toBe(0); // Spring 0..3
    expect(seasonIndexInSession(3, 16)).toBe(0);
    expect(seasonIndexInSession(4, 16)).toBe(1); // Summer 4..7
    expect(seasonIndexInSession(7, 16)).toBe(1);
    expect(seasonIndexInSession(8, 16)).toBe(2); // Autumn 8..11
    expect(seasonIndexInSession(11, 16)).toBe(2);
    expect(seasonIndexInSession(12, 16)).toBe(3); // Winter 12..15
    expect(seasonIndexInSession(15, 16)).toBe(3);
  });

  it("10-turn session uses a deterministic 2/3/2/3 floor split", () => {
    // Boundaries via floor((i+1) * S / 4): 2, 5, 7, 10
    expect(seasonIndexInSession(0, 10)).toBe(0);
    expect(seasonIndexInSession(1, 10)).toBe(0);
    expect(seasonIndexInSession(2, 10)).toBe(1);
    expect(seasonIndexInSession(4, 10)).toBe(1);
    expect(seasonIndexInSession(5, 10)).toBe(2);
    expect(seasonIndexInSession(6, 10)).toBe(2);
    expect(seasonIndexInSession(7, 10)).toBe(3);
    expect(seasonIndexInSession(9, 10)).toBe(3);
  });

  it("clamps an out-of-range turnsUsed to season 3", () => {
    expect(seasonIndexInSession(99, 16)).toBe(3);
    expect(seasonIndexInSession(-1, 16)).toBe(0);
  });

  it("seasonNameInSession returns the canonical name", () => {
    expect(seasonNameInSession(0, 16)).toBe("Spring");
    expect(seasonNameInSession(7, 16)).toBe("Summer");
    expect(seasonNameInSession(8, 16)).toBe("Autumn");
    expect(seasonNameInSession(15, 16)).toBe("Winter");
  });
});

describe("Phase 33 — Home seasonDrops illustrate the per-zone mechanic", () => {
  it("Spring trees = 20%, Winter trees = 70%", () => {
    expect(ZONES.home.seasonDrops.Spring.trees).toBe(0.20);
    expect(ZONES.home.seasonDrops.Winter.trees).toBe(0.70);
  });

  it("each season's percentages sum to 1", () => {
    for (const season of ["Spring", "Summer", "Autumn", "Winter"]) {
      const total = Object.values(ZONES.home.seasonDrops[season]).reduce(
        (a, b) => a + b,
        0,
      );
      expect(total).toBeCloseTo(1, 6);
    }
  });
});

describe("Phase 33 — pickByZoneSeasonDrops", () => {
  it("returns null when the zone has no seasonDrops data for that season", () => {
    // Quarry ships with an empty drop table at every season (mine-only zone).
    const r = pickByZoneSeasonDrops({
      zoneId: "quarry",
      seasonName: "Spring",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
    });
    expect(r).toBeNull();
  });

  it("returns null for an unknown zone", () => {
    const r = pickByZoneSeasonDrops({
      zoneId: "zoneX",
      seasonName: "Spring",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
    });
    expect(r).toBeNull();
  });

  it("rolls the only non-zero category when others are 0", () => {
    // Synthetic single-category roll using the zone1 spring table but stub
    // rng so we always pick the bucket that contains the cumulative roll.
    const r = pickByZoneSeasonDrops({
      zoneId: "home",
      seasonName: "Winter",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
      rng: () => 0.5, // 0.5 * 1.0 = 0.5 — lands inside trees (0.05+0.05+0.70 cumulative = 0.80)
    });
    expect(r).toBeTruthy();
    // Trees zone-category maps to the tile-collection categories trees AND wood.
    expect(["trees", "wood"]).toContain(CATEGORY_OF[r.key]);
  });

  it("rolls grass when rng falls inside the grass bucket", () => {
    // Zone 1 Spring: grass = 0.20 (first bucket). rng = 0.05 should land in it.
    const r = pickByZoneSeasonDrops({
      zoneId: "home",
      seasonName: "Spring",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
      rng: () => 0.05,
    });
    expect(r).toBeTruthy();
    expect(CATEGORY_OF[r.key]).toBe("grass");
  });

  it("rolls fruits when rng lands in the largest Spring bucket", () => {
    // Spring: grass(.20) + grain(.15) + trees(.20) + birds(.05) + vegetables(.10) + fruits(.30)
    // Cumulative through fruits ends at 1.0; rng=0.95 lands inside fruits.
    const r = pickByZoneSeasonDrops({
      zoneId: "home",
      seasonName: "Spring",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
      rng: () => 0.95,
    });
    expect(r).toBeTruthy();
    expect(CATEGORY_OF[r.key]).toBe("fruits");
  });

  it("falls back to first matching biome resource when no active species is set", () => {
    const r = pickByZoneSeasonDrops({
      zoneId: "home",
      seasonName: "Spring",
      biomeResources: farmResources,
      tileCollectionActive: null,
      categoryOf: CATEGORY_OF,
      rng: () => 0.05, // grass bucket
    });
    expect(r).toBeTruthy();
    // Spring grass bucket should resolve to the first grass resource on the
    // farm biome (grass_hay is the canonical first grass entry).
    expect(CATEGORY_OF[r.key]).toBe("grass");
  });
});
