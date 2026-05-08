// Phase 30 — Zones config schema + slice.
// Each map node IS a zone; ZONES is derived from MAP_NODES and keyed by
// location id (e.g. "home", "meadow", "quarry"), not the old abstract "zone1"-"zone6".
import { describe, it, expect } from "vitest";
import {
  ZONES,
  ZONE_IDS,
  ZONE_CATEGORIES,
  ZONE_UPGRADE_TARGET_GOLD,
  DEFAULT_ZONE,
  zoneCategories,
} from "../src/features/zones/data.js";
import * as zonesSlice from "../src/features/zones/slice.js";
import { createInitialState, rootReducer } from "../src/state.js";

describe("Phase 30 — ZONES schema", () => {
  it("ZONE_IDS contains the expected location ids", () => {
    expect(ZONE_IDS).toContain("home");
    expect(ZONE_IDS).toContain("meadow");
    expect(ZONE_IDS).toContain("quarry");
    expect(ZONE_IDS).toContain("harbor");
    // No abstract zone1-zone6 ids
    expect(ZONE_IDS).not.toContain("zone1");
    expect(ZONE_IDS).not.toContain("zone6");
  });

  it("farm zones expose a farm board (hasFarm = true)", () => {
    const farmZones = ZONE_IDS.filter((id) => ZONES[id].hasFarm);
    expect(farmZones.length).toBeGreaterThan(0);
    for (const id of farmZones) {
      expect(ZONES[id].hasFarm).toBe(true);
    }
  });

  it("mine-only zones do not expose a farm board", () => {
    expect(ZONES.quarry.hasFarm).toBe(false);
    expect(ZONES.quarry.hasMine).toBe(true);
  });

  it("zone starting turns — home = 16, quarry = 10", () => {
    expect(ZONES.home.startingTurns).toBe(16);
    expect(ZONES.quarry.startingTurns).toBe(10);
  });

  it("Has Mine / Has Water flags match the location design", () => {
    // Home: farm-only, no mine or water
    expect(ZONES.home.hasMine).toBe(false);
    expect(ZONES.home.hasWater).toBe(false);
    // Quarry: mine-only
    expect(ZONES.quarry.hasMine).toBe(true);
    expect(ZONES.quarry.hasWater).toBe(false);
    // Harbor: water-only
    expect(ZONES.harbor.hasMine).toBe(false);
    expect(ZONES.harbor.hasWater).toBe(true);
  });

  it("farm zones charge 50 coins to start a session, mine zones charge more", () => {
    expect(ZONES.home.entryCost.coins).toBe(50);
    expect(ZONES.meadow.entryCost.coins).toBe(50);
    expect(ZONES.quarry.entryCost.coins).toBeGreaterThan(50);
  });

  it("home upgrade map matches the base farm spec (Grass→Birds, Fruits→Gold, etc.)", () => {
    const m = ZONES.home.upgradeMap;
    expect(m.grass).toBe("birds");
    expect(m.grain).toBe("vegetables");
    expect(m.trees).toBe("birds");
    expect(m.birds).toBe("herd_animals");
    expect(m.vegetables).toBe("fruits");
    expect(m.fruits).toBe(ZONE_UPGRADE_TARGET_GOLD);
    // Advanced categories not present on the basic farm
    expect(m.flowers).toBeUndefined();
    expect(m.cattle).toBeUndefined();
    expect(m.mounts).toBeUndefined();
  });

  it("orchard unlocks advanced categories including cattle→mounts and flowers→gold", () => {
    const m = ZONES.orchard.upgradeMap;
    expect(m.flowers).toBe(ZONE_UPGRADE_TARGET_GOLD);
    expect(m.cattle).toBe("mounts");
    expect(m.mounts).toBe(ZONE_UPGRADE_TARGET_GOLD);
  });

  it("upgrade targets only point at known categories or the gold sentinel", () => {
    const allowedTargets = new Set([...ZONE_CATEGORIES, ZONE_UPGRADE_TARGET_GOLD]);
    for (const id of ZONE_IDS) {
      const m = ZONES[id].upgradeMap;
      for (const [src, tgt] of Object.entries(m)) {
        expect(ZONE_CATEGORIES, `${id}.${src}`).toContain(src);
        expect(allowedTargets, `${id}.${src}->${tgt}`).toContain(tgt);
      }
    }
  });

  it("zoneCategories returns at most 8 source categories per farm zone", () => {
    const farmZones = ZONE_IDS.filter((id) => ZONES[id].hasFarm);
    for (const id of farmZones) {
      const cats = zoneCategories(id);
      expect(cats.length).toBeLessThanOrEqual(8);
      expect(cats.length).toBeGreaterThan(0);
    }
  });
});

describe("Phase 30 — zones slice (zone selection via CARTO/TRAVEL)", () => {
  it("fresh state defaults to DEFAULT_ZONE (home)", () => {
    const s = createInitialState();
    expect(s.activeZone).toBe(DEFAULT_ZONE);
    expect(s.mapCurrent).toBe(DEFAULT_ZONE);
  });

  it("CARTO/TRAVEL to a discovered node updates activeZone and mapCurrent", () => {
    // Initial state has meadow in mapDiscovered, adjacent to home, level 1
    const s = createInitialState();
    const next = rootReducer(s, { type: "CARTO/TRAVEL", nodeId: "meadow" });
    expect(next.activeZone).toBe("meadow");
    expect(next.mapCurrent).toBe("meadow");
  });

  it("CARTO/TRAVEL to an unknown node leaves activeZone untouched", () => {
    const s = createInitialState();
    const next = rootReducer(s, { type: "CARTO/TRAVEL", nodeId: "ghost" });
    expect(next.activeZone).toBe(DEFAULT_ZONE);
  });

  it("ZONE/SELECT is a no-op (zone selection is done via CARTO/TRAVEL)", () => {
    const s = createInitialState();
    const next = rootReducer(s, { type: "ZONE/SELECT", payload: { id: "meadow" } });
    expect(next.activeZone).toBe(DEFAULT_ZONE);
  });

  it("ZONE/UNLOCK is a no-op (zone discovery is managed by cartography)", () => {
    const s = createInitialState();
    const next = rootReducer(s, { type: "ZONE/UNLOCK", payload: { id: "meadow" } });
    // activeZone and mapCurrent unchanged
    expect(next.activeZone).toBe(DEFAULT_ZONE);
    expect(next.mapCurrent).toBe(DEFAULT_ZONE);
  });

  it("slice reducer ignores unknown actions", () => {
    const start = { activeZone: "home" };
    expect(zonesSlice.reduce(start, { type: "FOO" })).toBe(start);
  });
});
