// Phase 30 — Zones config schema + slice (Phase 1 of the rule overhaul).
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
  it("defines zones 1 through 6", () => {
    expect(ZONE_IDS).toEqual(["zone1", "zone2", "zone3", "zone4", "zone5", "zone6"]);
  });

  it("every zone exposes a farm board", () => {
    for (const id of ZONE_IDS) {
      expect(ZONES[id].hasFarm).toBe(true);
    }
  });

  it("zone starting turns match the request table", () => {
    expect(ZONES.zone1.startingTurns).toBe(16);
    expect(ZONES.zone2.startingTurns).toBe(10);
    expect(ZONES.zone3.startingTurns).toBe(16);
    expect(ZONES.zone4.startingTurns).toBe(10);
    expect(ZONES.zone5.startingTurns).toBe(16);
    expect(ZONES.zone6.startingTurns).toBe(16);
  });

  it("Has Mine / Has Water flags match the request table", () => {
    expect(ZONES.zone1.hasMine).toBe(false);
    expect(ZONES.zone1.hasWater).toBe(false);
    expect(ZONES.zone2.hasMine).toBe(true);
    expect(ZONES.zone2.hasWater).toBe(false);
    expect(ZONES.zone3.hasMine).toBe(true);
    expect(ZONES.zone3.hasWater).toBe(true);
    expect(ZONES.zone4.hasMine).toBe(true);
    expect(ZONES.zone4.hasWater).toBe(false);
    expect(ZONES.zone5.hasMine).toBe(true);
    expect(ZONES.zone5.hasWater).toBe(true);
    expect(ZONES.zone6.hasMine).toBe(false);
    expect(ZONES.zone6.hasWater).toBe(true);
  });

  it("every zone charges 50 coins to start a farm session", () => {
    for (const id of ZONE_IDS) {
      expect(ZONES[id].entryCost.coins).toBe(50);
    }
  });

  it("zone 1 upgrade map matches the request row (Grass→Birds, Fruits→Gold, etc.)", () => {
    const m = ZONES.zone1.upgradeMap;
    expect(m.grass).toBe("birds");
    expect(m.grain).toBe("vegetables");
    expect(m.trees).toBe("birds");
    expect(m.birds).toBe("herd_animals");
    expect(m.vegetables).toBe("fruits");
    expect(m.fruits).toBe(ZONE_UPGRADE_TARGET_GOLD);
    // categories absent from the row should not appear as keys
    expect(m.flowers).toBeUndefined();
    expect(m.cattle).toBeUndefined();
    expect(m.mounts).toBeUndefined();
  });

  it("zone 6 unlocks every category including mounts and flowers", () => {
    const m = ZONES.zone6.upgradeMap;
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

  it("zoneCategories returns at most 8 source categories per zone", () => {
    for (const id of ZONE_IDS) {
      const cats = zoneCategories(id);
      expect(cats.length).toBeLessThanOrEqual(8);
      expect(cats.length).toBeGreaterThan(0);
    }
  });
});

describe("Phase 30 — zones slice", () => {
  it("fresh state defaults to zone1, with only zone1 unlocked", () => {
    const s = createInitialState();
    expect(s.activeZone).toBe(DEFAULT_ZONE);
    expect(s.unlockedZones).toEqual([DEFAULT_ZONE]);
  });

  it("ZONE/SELECT to an unlocked zone updates activeZone", () => {
    const s = createInitialState();
    const unlocked = rootReducer(s, { type: "ZONE/UNLOCK", payload: { id: "zone2" } });
    expect(unlocked.unlockedZones).toContain("zone2");
    const next = rootReducer(unlocked, { type: "ZONE/SELECT", payload: { id: "zone2" } });
    expect(next.activeZone).toBe("zone2");
  });

  it("ZONE/SELECT to a locked zone leaves activeZone untouched", () => {
    const s = createInitialState();
    const next = rootReducer(s, { type: "ZONE/SELECT", payload: { id: "zone2" } });
    expect(next.activeZone).toBe(DEFAULT_ZONE);
    expect(next.unlockedZones).toEqual([DEFAULT_ZONE]);
  });

  it("ZONE/SELECT to an unknown zone leaves activeZone untouched", () => {
    const s = createInitialState();
    const next = rootReducer(s, { type: "ZONE/SELECT", payload: { id: "ghost" } });
    expect(next.activeZone).toBe(DEFAULT_ZONE);
  });

  it("ZONE/UNLOCK on an already-unlocked zone does not duplicate the entry", () => {
    const s = createInitialState();
    const next = rootReducer(s, { type: "ZONE/UNLOCK", payload: { id: DEFAULT_ZONE } });
    expect(next.unlockedZones).toEqual([DEFAULT_ZONE]);
  });

  it("slice reducer ignores unknown actions", () => {
    const start = { activeZone: "zone1", unlockedZones: ["zone1"] };
    expect(zonesSlice.reduce(start, { type: "FOO" })).toBe(start);
  });
});
