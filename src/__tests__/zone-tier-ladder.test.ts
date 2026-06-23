// Zone Tier Ladder — per-zone settlement tiers. Covers the derivation helpers
// (cumulative unlock union, plots-per-tier) and the TIER_UP reducer (happy +
// blocked + max-rung), plus the union(unlocks)===buildings superset invariant.
// See reference/docs/archive/zone-tier-ladder.html.
import { describe, it, expect, beforeEach } from "vitest";
import { inv, patchInventory } from "../testUtils/inventory.js";
import { rootReducer, createInitialState } from "../state.js";
import { MAP_NODES } from "../features/cartography/data.js";
import {
  tiersForZone,
  maxTier,
  settlementTier,
  currentTierDef,
  plotsForTier,
  unlockedBuildings,
} from "../features/zones/data.js";
import { TOWN_MAPS, getTownMap, authoredLotCount } from "../ui/town/townMaps.js";

beforeEach(() => global.localStorage.clear());

describe("tier helpers", () => {
  it("home has a 4-rung Outpost→City ladder; quarry has a 6-rung mine ladder", () => {
    expect(tiersForZone("home").map((t) => t.id)).toEqual(["outpost", "hamlet", "village", "city"]);
    expect(maxTier("home")).toBe(3);
    expect(tiersForZone("quarry").map((t) => t.id)).toEqual(["dig_site", "prospect", "mining_camp", "boomtown", "smeltworks", "foundry_city"]);
    expect(maxTier("quarry")).toBe(5);
  });

  it("un-tiered zones report no ladder", () => {
    expect(tiersForZone("meadow")).toEqual([]);
    expect(maxTier("meadow")).toBe(-1);
  });

  it("plotsForTier returns the rung's total plots", () => {
    expect(plotsForTier("home", 0)).toBe(3);
    expect(plotsForTier("home", 1)).toBe(6);
    expect(plotsForTier("home", 2)).toBe(12);
    expect(plotsForTier("home", 3)).toBe(20);
    expect(plotsForTier("quarry", 0)).toBe(2);
    expect(plotsForTier("quarry", 5)).toBe(12);
  });

  it("unlockedBuildings accumulates rung-by-rung", () => {
    expect(unlockedBuildings("home", 0)).toContain("hearth");
    expect(unlockedBuildings("home", 0)).not.toContain("forge"); // forge is a City (tier 3) unlock
    expect(unlockedBuildings("home", 3)).toContain("forge");
    // rung 1 is a strict superset of rung 0
    const r0 = new Set(unlockedBuildings("home", 0));
    expect(unlockedBuildings("home", 1).filter((b) => r0.has(b)).length).toBe(r0.size);
  });
});

describe("superset invariant — union(tiers.unlocks) === node.buildings", () => {
  for (const node of MAP_NODES) {
    if (!node.tiers) continue;
    it(`${node.id}: cumulative unlocks equal the flat buildings[]`, () => {
      const union = new Set<string>();
      for (const t of node.tiers!) for (const b of t.unlocks) union.add(b);
      expect([...union].sort()).toEqual([...new Set(node.buildings)].sort());
      // top-rung unlockedBuildings matches too
      expect([...new Set(unlockedBuildings(node.id, node.tiers!.length - 1))].sort()).toEqual(
        [...new Set(node.buildings)].sort(),
      );
    });
  }
});

describe("authored town maps", () => {
  it("every authored (zone, tier) map exposes exactly tiers[tier].plots lots", () => {
    for (const [zoneId, maps] of Object.entries(TOWN_MAPS)) {
      maps.forEach((_m, tier) => {
        expect(authoredLotCount(zoneId, tier)).toBe(plotsForTier(zoneId, tier));
        expect(getTownMap(zoneId, tier)!.lots.length).toBe(plotsForTier(zoneId, tier));
      });
    }
  });

  it("ground grid is 30 rows × 40 cols", () => {
    const plan = getTownMap("home", 0)!;
    expect(plan.groundTiles!.length).toBe(30);
    expect(plan.groundTiles!.every((r) => r.length === 40)).toBe(true);
  });

  it("lot indices are stable across rungs (a built lot never moves)", () => {
    const hamlet = getTownMap("home", 0)!;
    const village = getTownMap("home", 1)!;
    const byIndex = (p: typeof village) => new Map(p.lots.map((l) => [l.index, l]));
    const vMap = byIndex(village);
    for (const l of hamlet.lots) {
      const v = vMap.get(l.index)!;
      expect(v).toBeDefined();
      expect({ cx: v.cx, cy: v.cy, w: v.w, h: v.h }).toEqual({ cx: l.cx, cy: l.cy, w: l.w, h: l.h });
    }
  });

  it("returns null for un-authored zones/tiers (procedural fallback)", () => {
    expect(getTownMap("meadow", 0)).toBeNull(); // un-tiered zone
    expect(getTownMap("home", 9)).toBeNull();   // tier beyond the ladder
  });

  it("home and quarry are fully authored across all rungs", () => {
    expect(TOWN_MAPS.home).toHaveLength(4);
    expect(TOWN_MAPS.quarry).toHaveLength(6);
    for (const zoneId of ["home", "quarry"]) {
      tiersForZone(zoneId).forEach((_t, tier) => expect(getTownMap(zoneId, tier)).not.toBeNull());
    }
  });
});

describe("TIER_UP reducer", () => {
  const atHome = (over = {}) => ({ ...createInitialState(), mapCurrent: "home", activeZone: "home", ...over });

  it("upgrades a rung, deducting all zone-inventory resources (resource-only)", () => {
    // Read the Settlement (tier 1) cost from the ladder so this survives balance tuning.
    const resources = currentTierDef("home", 1)!.upgradeCost!.resources ?? {};
    expect(Object.keys(resources).length).toBeGreaterThan(0);
    let s = atHome({ coins: 500 });
    const patch: Record<string, number> = {};
    for (const [k, v] of Object.entries(resources)) patch[k] = v + 5;
    s = patchInventory(s, patch, "home");
    expect(settlementTier(s, "home")).toBe(0);
    s = rootReducer(s, { type: "TIER_UP", payload: { zoneId: "home" } });
    expect(settlementTier(s, "home")).toBe(1);
    expect(s.coins).toBe(500); // resource-only — coins untouched
    for (const [k, v] of Object.entries(resources)) {
      expect(inv(s, "home")[k]).toBe(v + 5 - v);
    }
  });

  it("ignores coins — upgrades with 0 coins when resources suffice", () => {
    const resources = currentTierDef("home", 1)!.upgradeCost!.resources ?? {};
    let s = atHome({ coins: 0 });
    const patch: Record<string, number> = {};
    for (const [k, v] of Object.entries(resources)) patch[k] = v + 1;
    s = patchInventory(s, patch, "home");
    s = rootReducer(s, { type: "TIER_UP", payload: { zoneId: "home" } });
    expect(settlementTier(s, "home")).toBe(1);
  });

  it("is a no-op when resources are short (state unchanged)", () => {
    const s = atHome({ coins: 5000 }); // empty inventory — missing the rung's resources
    expect(rootReducer(s, { type: "TIER_UP", payload: { zoneId: "home" } })).toBe(s);
  });

  it("is a no-op at the top rung", () => {
    let s = atHome({ coins: 999999, settlements: { home: { founded: true, tier: 3 } } });
    s = patchInventory(
      s,
      { hay_bundle: 999, plank: 999, iron_bar: 999, gold_bar: 999, cut_gem: 999, jade: 999, pearls: 999, honey: 999, horseshoe: 999 },
      "home",
    );
    expect(rootReducer(s, { type: "TIER_UP", payload: { zoneId: "home" } })).toBe(s);
  });

  it("is a no-op for an unknown / un-tiered zone", () => {
    const s = atHome({ coins: 999999 });
    expect(rootReducer(s, { type: "TIER_UP", payload: { zoneId: "nowhere" } })).toBe(s);
  });
});

describe("DEV/SET_ZONE_TIER reducer (dev override)", () => {
  const atHome = (over = {}) => ({ ...createInitialState(), mapCurrent: "home", activeZone: "home", ...over });

  it("force-sets any tier with no cost and ignores gating", () => {
    let s = atHome({ coins: 0 }); // empty inventory, broke
    s = rootReducer(s, { type: "DEV/SET_ZONE_TIER", zoneId: "home", tier: 3 });
    expect(settlementTier(s, "home")).toBe(3);
    expect(s.coins).toBe(0);
    // can also jump back down
    s = rootReducer(s, { type: "DEV/SET_ZONE_TIER", zoneId: "home", tier: 1 });
    expect(settlementTier(s, "home")).toBe(1);
  });

  it("defaults to the current zone and founds it if needed", () => {
    let s = atHome({ mapCurrent: "quarry", settlements: {} });
    s = rootReducer(s, { type: "DEV/SET_ZONE_TIER", tier: 4 });
    expect(s.settlements.quarry.founded).toBe(true);
    expect(settlementTier(s, "quarry")).toBe(4);
  });

  it("clamps an out-of-range tier to the ladder", () => {
    let s = atHome();
    s = rootReducer(s, { type: "DEV/SET_ZONE_TIER", zoneId: "home", tier: 99 });
    expect(settlementTier(s, "home")).toBe(maxTier("home"));
    s = rootReducer(s, { type: "DEV/SET_ZONE_TIER", zoneId: "home", tier: -5 });
    expect(settlementTier(s, "home")).toBe(0);
  });

  it("is a no-op for an unknown or un-tiered zone", () => {
    const s = atHome();
    expect(rootReducer(s, { type: "DEV/SET_ZONE_TIER", zoneId: "nowhere", tier: 1 })).toBe(s);
    expect(rootReducer(s, { type: "DEV/SET_ZONE_TIER", zoneId: "meadow", tier: 1 })).toBe(s);
  });
});
