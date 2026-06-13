// Phase 6a — biome keepers: the KEEPERS config, the overridability layer, the
// settlement-keeper helpers, and the KEEPER/CONFRONT action.
import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { KEEPERS, keeperForType, keeperPathInfo } from "../keepers.js";
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
      expect(typeof k.look?.icon).toBe("string");
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
  it("Drive Out: starts a keeper trial, and rewards on resolution", () => {
    const s1 = rootReducer(homeReady(), { type: "KEEPER/CONFRONT", payload: { zoneId: "home", path: "driveout" } });
    expect(s1.activeTrial).toMatchObject({ zoneId: "home", path: "driveout", status: "active" });
    expect(s1.farmRun.mode).toBe("keeperTrial");
    
    // Resolve the trial successfully
    const s2 = rootReducer(s1, { type: "KEEPER/TRIAL_RESOLVE", payload: { won: true } });
    expect(settlementKeeperPath(s2, "home")).toBe("driveout");
    expect(s2.coreIngots).toBe(KEEPERS.farm.driveout.coreIngots);
    expect(s2.story.flags.keeper_home_driveout).toBe(true);
    expect(s2.activeTrial).toBeNull();
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
