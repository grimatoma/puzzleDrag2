// Phase 6a — biome keepers: the KEEPERS config, the overridability layer, the
// settlement-keeper helpers, and the KEEPER/CONFRONT action.
import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { KEEPERS, keeperForType, keeperPathInfo } from "../keepers.js";
import { applyKeeperOverrides } from "../config/applyOverrides.js";
import { settlementKeeperPath, keeperReadyFor, builtCountAt } from "../features/zones/data.js";

beforeEach(() => global.localStorage.clear());

// A state with `home` founded (it always is) and ≥4 buildings built there — the
// Deer-Spirit's `appearsAfterBuildings` threshold.
function homeReady(over = {}) {
  return {
    ...createInitialState(),
    built: { ...createInitialState().built, home: { hearth: true, mill: true, bakery: true, inn: true, decorations: {}, _plots: {} } },
    ...over,
  };
}

describe("KEEPERS config", () => {
  it("has a keeper per settlement type with both paths", () => {
    for (const type of ["farm", "mine", "harbor"]) {
      const k = KEEPERS[type];
      expect(typeof k.id).toBe("string");
      expect(typeof k.name).toBe("string");
      expect(typeof k.icon).toBe("string");
      expect(k.appearsAfterBuildings).toBeGreaterThan(0);
      expect(Array.isArray(k.intro)).toBe(true);
      expect(k.intro.length).toBeGreaterThan(0);
      expect(typeof k.coexist.label).toBe("string");
      expect(Array.isArray(k.coexist.pitch)).toBe(true);
      expect(k.coexist.embers).toBeGreaterThan(0);
      expect(typeof k.driveout.label).toBe("string");
      expect(Array.isArray(k.driveout.pitch)).toBe(true);
      expect(k.driveout.coreIngots).toBeGreaterThan(0);
    }
  });
  it("keeperForType / keeperPathInfo", () => {
    expect(keeperForType("farm")).toBe(KEEPERS.farm);
    expect(keeperForType("nope")).toBeNull();
    expect(keeperPathInfo("mine", "coexist")).toBe(KEEPERS.mine.coexist);
    expect(keeperPathInfo("mine", "driveout")).toBe(KEEPERS.mine.driveout);
    expect(keeperPathInfo("mine", "bogus")).toBeNull();
    expect(keeperPathInfo("nope", "coexist")).toBeNull();
  });
});

describe("applyKeeperOverrides", () => {
  it("merges whitelisted fields in place; ignores a missing override object", () => {
    const fake = {
      farm: { id: "f", name: "Old", title: "T", icon: "x", appearsAfterBuildings: 4, intro: ["a"], coexist: { label: "c", pitch: ["p"], embers: 5 }, driveout: { label: "d", pitch: ["q"], coreIngots: 5 } },
    };
    applyKeeperOverrides(fake, { farm: { name: "New", appearsAfterBuildings: 2, intro: ["one", "two"], coexist: { embers: 11, label: "stay!" }, driveout: { coreIngots: 3 } } });
    expect(fake.farm.name).toBe("New");
    expect(fake.farm.appearsAfterBuildings).toBe(2);
    expect(fake.farm.intro).toEqual(["one", "two"]);
    expect(fake.farm.coexist.embers).toBe(11);
    expect(fake.farm.coexist.label).toBe("stay!");
    expect(fake.farm.driveout.coreIngots).toBe(3);
    expect(fake.farm.id).toBe("f"); // untouched
    const before = JSON.stringify(fake);
    applyKeeperOverrides(fake, undefined);
    expect(JSON.stringify(fake)).toBe(before);
  });
});

describe("settlement-keeper helpers", () => {
  it("builtCountAt ignores _plots / decorations bookkeeping", () => {
    expect(builtCountAt({ built: { home: { hearth: true, mill: true, _plots: { 0: "hearth" }, decorations: {} } } }, "home")).toBe(2);
    expect(builtCountAt({}, "home")).toBe(0);
  });
  it("settlementKeeperPath / keeperReadyFor", () => {
    const fresh = createInitialState();
    expect(settlementKeeperPath(fresh, "home")).toBeNull();
    expect(keeperReadyFor(fresh, "home")).toBe(false);     // founded but only 1 building
    expect(keeperReadyFor(fresh, "meadow")).toBe(false);   // not founded
    const ready = homeReady();
    expect(keeperReadyFor(ready, "home")).toBe(true);      // founded + 4 buildings
  });
});

describe("KEEPER/CONFRONT", () => {
  it("Coexist: records the path, grants Embers, sets the flag, bubbles", () => {
    const s = rootReducer(homeReady(), { type: "KEEPER/CONFRONT", payload: { zoneId: "home", path: "coexist" } });
    expect(settlementKeeperPath(s, "home")).toBe("coexist");
    expect(s.embers).toBe(KEEPERS.farm.coexist.embers);
    expect(s.story.flags.keeper_home_coexist).toBe(true);
    expect(s.bubble?.text).toMatch(/Deer-Spirit/i);
    expect(keeperReadyFor(s, "home")).toBe(false);         // faced now
  });
  it("Drive Out: records the path, grants Core Ingots, sets the flag", () => {
    const s = rootReducer(homeReady(), { type: "KEEPER/CONFRONT", payload: { zoneId: "home", path: "driveout" } });
    expect(settlementKeeperPath(s, "home")).toBe("driveout");
    expect(s.coreIngots).toBe(KEEPERS.farm.driveout.coreIngots);
    expect(s.story.flags.keeper_home_driveout).toBe(true);
  });

  it("rejects: not built up enough, bad path, unfounded zone, already faced", () => {
    // Too few buildings (fresh home has 1).
    const tooFew = rootReducer(createInitialState(), { type: "KEEPER/CONFRONT", payload: { zoneId: "home", path: "coexist" } });
    expect(settlementKeeperPath(tooFew, "home")).toBeNull();
    expect(tooFew.embers ?? 0).toBe(0);
    // Bad path.
    const badPath = rootReducer(homeReady(), { type: "KEEPER/CONFRONT", payload: { zoneId: "home", path: "ignore" } });
    expect(settlementKeeperPath(badPath, "home")).toBeNull();
    // Unfounded zone.
    const unfounded = rootReducer(homeReady(), { type: "KEEPER/CONFRONT", payload: { zoneId: "meadow", path: "coexist" } });
    expect(settlementKeeperPath(unfounded, "meadow")).toBeNull();
    // Already faced — a second confront is a no-op.
    const once = rootReducer(homeReady(), { type: "KEEPER/CONFRONT", payload: { zoneId: "home", path: "coexist" } });
    const twice = rootReducer(once, { type: "KEEPER/CONFRONT", payload: { zoneId: "home", path: "driveout" } });
    expect(settlementKeeperPath(twice, "home")).toBe("coexist");      // unchanged
    expect(twice.coreIngots ?? 0).toBe(0);                            // no ingots added
  });
});
