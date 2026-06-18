// Mirefen Hollow port — the first docs/zones atlas zone wired into the playable
// cartography (see docs/projects/14-port-zones-atlas.md). The broad invariants
// (union(unlocks)===buildings, authoredLotCount===plotsForTier, lot stability)
// are already exercised for mirefen by zone-tier-ladder.test.ts because both its
// loops iterate every node/TOWN_MAPS entry. This file adds the zone-specific
// guards those broad loops do NOT cover: reachability, the exact plot ramp, that
// every tier cost references a REAL game resource (a leaked design-only resource
// like `fenmead` passes the broad tests but silently softlocks the rung), and a
// live TIER_UP growth.
import { describe, it, expect, beforeEach } from "vitest";
import { patchInventory, inv } from "../testUtils/inventory.js";
import { rootReducer, createInitialState } from "../state.js";
import { MAP_NODES, MAP_EDGES } from "../features/cartography/data.js";
import {
  tiersForZone,
  maxTier,
  settlementTier,
  currentTierDef,
  plotsForTier,
  unlockedBuildings,
} from "../features/zones/data.js";
import { getTownMap } from "../ui/town/townMaps.js";
import { ITEMS } from "../constants.js";

beforeEach(() => global.localStorage.clear());

describe("mirefen — cartography reachability", () => {
  it("the node exists and is a fish zone", () => {
    const node = MAP_NODES.find((n) => n.id === "mirefen");
    expect(node).toBeDefined();
    expect(node!.kind).toBe("fish");
    expect(node!.boards.fish).toBeDefined();
  });

  it("is reachable — at least one MAP_EDGES edge touches it", () => {
    const touching = MAP_EDGES.filter(([a, b]) => a === "mirefen" || b === "mirefen");
    expect(touching.length).toBeGreaterThan(0);
  });
});

describe("mirefen — tier ladder shape", () => {
  it("matches the design plot ramp 3/6/10/15", () => {
    expect(tiersForZone("mirefen").map((t) => t.plots)).toEqual([3, 6, 10, 15]);
    expect(maxTier("mirefen")).toBe(3);
  });

  it("keeps its own 4-rung length (not padded to home/quarry's 6)", () => {
    expect(tiersForZone("mirefen").map((t) => t.id)).toEqual(["stilt", "bogwalk", "village", "town"]);
  });

  it("authors one town map per rung, each with plotsForTier lots", () => {
    tiersForZone("mirefen").forEach((_t, tier) => {
      const map = getTownMap("mirefen", tier);
      expect(map).not.toBeNull();
      expect(map!.lots.length).toBe(plotsForTier("mirefen", tier));
      expect(map!.groundTiles!.length).toBe(30); // authored ground, not the procedural fallback
    });
  });

  it("rung 0 has no upgrade cost; later rungs do", () => {
    expect(currentTierDef("mirefen", 0)!.upgradeCost).toBeUndefined();
    for (let t = 1; t <= maxTier("mirefen"); t++) {
      expect(currentTierDef("mirefen", t)!.upgradeCost).toBeDefined();
    }
  });

  it("top-rung unlocks accumulate to the full building set", () => {
    expect(unlockedBuildings("mirefen", 0)).toContain("fishmonger");
    expect(unlockedBuildings("mirefen", 0)).not.toContain("observatory"); // a Fen Town (tier 3) unlock
    expect(unlockedBuildings("mirefen", 3)).toContain("observatory");
  });
});

describe("mirefen — tier costs reference real game resources", () => {
  // The broad invariant tests do NOT check that upgradeCost resources exist; a
  // typo'd or design-only resource passes them but makes the rung un-upgradeable.
  const RESOURCE_KEYS = new Set(Object.keys(ITEMS));
  it("every upgradeCost.resources key is a real ITEMS id", () => {
    for (const t of tiersForZone("mirefen")) {
      for (const key of Object.keys(t.upgradeCost?.resources ?? {})) {
        expect(RESOURCE_KEYS.has(key)).toBe(true);
      }
    }
  });

  it("does not leak the design-only resources plank/fenmead", () => {
    const used = new Set<string>();
    for (const t of tiersForZone("mirefen")) {
      for (const key of Object.keys(t.upgradeCost?.resources ?? {})) used.add(key);
    }
    expect(used.has("fenmead")).toBe(false);
    expect(used.has("plank")).toBe(false); // a fish board can't produce a farm/crafted good (siloed inventory)
  });
});

describe("mirefen — TIER_UP grows the settlement", () => {
  const atMirefen = (over = {}) => ({
    ...createInitialState(),
    mapCurrent: "mirefen",
    activeZone: "mirefen",
    settlements: { home: { founded: true, tier: 0 }, mirefen: { founded: true, tier: 0 } },
    ...over,
  });

  it("upgrades rung 0 → 1 when the bogwalk resources are in the mirefen bucket", () => {
    const resources = currentTierDef("mirefen", 1)!.upgradeCost!.resources ?? {};
    expect(Object.keys(resources).length).toBeGreaterThan(0);
    let s = atMirefen({ coins: 0 }); // resource-only ladder — coins irrelevant
    const patch: Record<string, number> = {};
    for (const [k, v] of Object.entries(resources)) patch[k] = v + 3;
    s = patchInventory(s, patch, "mirefen");
    expect(settlementTier(s, "mirefen")).toBe(0);
    s = rootReducer(s, { type: "TIER_UP", payload: { zoneId: "mirefen" } });
    expect(settlementTier(s, "mirefen")).toBe(1);
    for (const [k, v] of Object.entries(resources)) {
      expect(inv(s, "mirefen")[k]).toBe(v + 3 - v); // exactly the cost was deducted
    }
  });

  it("is a no-op when the mirefen bucket is short the resources", () => {
    const s = atMirefen({ coins: 999999 }); // empty mirefen inventory
    expect(rootReducer(s, { type: "TIER_UP", payload: { zoneId: "mirefen" } })).toBe(s);
  });

  it("is a no-op until the settlement is founded", () => {
    const resources = currentTierDef("mirefen", 1)!.upgradeCost!.resources ?? {};
    let s = atMirefen({ settlements: { home: { founded: true, tier: 0 } } }); // mirefen not founded
    s = patchInventory(s, Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, v + 3])), "mirefen");
    expect(rootReducer(s, { type: "TIER_UP", payload: { zoneId: "mirefen" } })).toBe(s);
  });
});
