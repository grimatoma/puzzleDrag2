// Phase 5b — Hearth-Tokens + the Old Capital gate (master doc §III).
import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import {
  settlementTypeForZone,
  HEARTH_TOKEN_FOR_TYPE,
  isOldCapitalUnlocked,
  hearthTokenCount,
  grantEarnedHearthTokens,
} from "../features/zones/data.js";
import { MAP_NODES, NODE_COLORS, KIND_LABELS, REGIONS } from "../features/cartography/data.js";

beforeEach(() => global.localStorage.clear());

describe("settlementTypeForZone", () => {
  it("maps zone kinds to settlement types (home = farm; fish = harbor)", () => {
    expect(settlementTypeForZone("home")).toBe("farm");
    expect(settlementTypeForZone("meadow")).toBe("farm");
    expect(settlementTypeForZone("quarry")).toBe("mine");
    expect(settlementTypeForZone("harbor")).toBe("harbor");
  });
  it("returns null for non-settlements", () => {
    expect(settlementTypeForZone("crossroads")).toBeNull(); // event
    expect(settlementTypeForZone("pit")).toBeNull();         // boss
    expect(settlementTypeForZone("oldcapital")).toBeNull();  // the capital itself
    expect(settlementTypeForZone("nowhere")).toBeNull();
  });
});

describe("HEARTH_TOKEN_FOR_TYPE", () => {
  it("is the canonical type→token mapping", () => {
    expect(HEARTH_TOKEN_FOR_TYPE).toEqual({ farm: "heirloomSeed", mine: "pactIron", harbor: "tidesingerPearl" });
  });
});

describe("isOldCapitalUnlocked / hearthTokenCount", () => {
  it("a fresh kingdom holds no tokens and the Capital is locked", () => {
    const s = createInitialState();
    expect(hearthTokenCount(s)).toBe(0);
    expect(isOldCapitalUnlocked(s)).toBe(false);
  });
  it("needs all three tokens", () => {
    const two = { heirlooms: { heirloomSeed: 1, pactIron: 1, tidesingerPearl: 0 } };
    expect(hearthTokenCount(two)).toBe(2);
    expect(isOldCapitalUnlocked(two)).toBe(false);
    const three = { heirlooms: { heirloomSeed: 1, pactIron: 1, tidesingerPearl: 1 } };
    expect(hearthTokenCount(three)).toBe(3);
    expect(isOldCapitalUnlocked(three)).toBe(true);
  });
});

describe("grantEarnedHearthTokens", () => {
  it("returns the same heirlooms reference when nothing is earned", () => {
    const s = createInitialState();
    expect(grantEarnedHearthTokens(s)).toBe(s.heirlooms);
  });
  it("grants the type token only when the keeper has been faced (idempotent)", () => {
    // Build out enough of home (a farm-type Vale) to count as 'half built'.
    const homeBuildings = ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge", "caravan_post"];
    const built = {};
    for (const b of homeBuildings) built[b] = true;
    const base = { ...createInitialState(), built: { ...createInitialState().built, home: built } };
    // Half-built but no keeper choice → settlement is not yet complete; no token.
    expect(grantEarnedHearthTokens(base)).toBe(base.heirlooms);
    // After Coexist: settlement completes → token granted.
    const withKeeper = { ...base, settlements: { ...(base.settlements ?? {}), home: { founded: true, biome: "temperate_vale", keeperPath: "coexist" } } };
    const h = grantEarnedHearthTokens(withKeeper);
    expect(h.heirloomSeed).toBe(1);
    expect(h.pactIron).toBe(0);
    // Idempotent: re-running over a state that already has the token is a no-op ref.
    const s2 = { ...withKeeper, heirlooms: h };
    expect(grantEarnedHearthTokens(s2)).toBe(h);
  });
});

describe("Hearth-Token grant path", () => {
  it("BUILD without a prior keeper choice does NOT grant the token", () => {
    // Pre-place 7 buildings (7/16 → not yet complete).
    const seven = ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge"];
    const built = { decorations: {}, _plots: {} };
    seven.forEach((b, i) => { built[b] = true; built._plots[i] = b; });
    const s0 = { ...createInitialState(), coins: 99999, built: { ...createInitialState().built, home: built } };
    expect(s0.heirlooms.heirloomSeed).toBe(0);
    // BUILD the 8th — half is built, but no keeper has been faced.
    const s1 = rootReducer(s0, { type: "BUILD", building: { id: "caravan_post", name: "Caravan Post", cost: { coins: 0 } } });
    expect(s1.built.home.caravan_post).toBe(true);
    expect(s1.heirlooms.heirloomSeed).toBe(0); // gated on the keeper choice
  });

  it("KEEPER/CONFRONT grants the token when half buildings are already up", () => {
    // 8/16 buildings + founded → ready for the keeper.
    const homeBuildings = ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge", "caravan_post"];
    const built = { decorations: {}, _plots: {} };
    homeBuildings.forEach((b, i) => { built[b] = true; built._plots[i] = b; });
    const s0 = { ...createInitialState(), built: { ...createInitialState().built, home: built } };
    expect(s0.heirlooms.heirloomSeed).toBe(0);
    const s1 = rootReducer(s0, { type: "KEEPER/CONFRONT", payload: { zoneId: "home", path: "coexist" } });
    expect(s1.settlements.home.keeperPath).toBe("coexist");
    expect(s1.heirlooms.heirloomSeed).toBe(1);
  });

  it("BUILD after the keeper choice — the 8th building grants the token", () => {
    // 7/16 buildings + founded + keeper already faced → the 8th flips it complete.
    const seven = ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge"];
    const built = { decorations: {}, _plots: {} };
    seven.forEach((b, i) => { built[b] = true; built._plots[i] = b; });
    const s0 = {
      ...createInitialState(),
      coins: 99999,
      built: { ...createInitialState().built, home: built },
      settlements: { home: { founded: true, biome: "temperate_vale", keeperPath: "coexist" } },
    };
    expect(s0.heirlooms.heirloomSeed).toBe(0);
    const s1 = rootReducer(s0, { type: "BUILD", building: { id: "caravan_post", name: "Caravan Post", cost: { coins: 0 } } });
    expect(s1.built.home.caravan_post).toBe(true);
    expect(s1.heirlooms.heirloomSeed).toBe(1);
    expect(s1.bubble?.text).toMatch(/Hearth-Token/i);
  });
});

describe("the Old Capital map node", () => {
  it("exists, is token-gated, and has its colour/label/region wired", () => {
    const cap = MAP_NODES.find((n) => n.requiresHearthTokens);
    expect(cap).toBeTruthy();
    expect(cap.id).toBe("oldcapital");
    expect(cap.kind).toBe("capital");
    expect(NODE_COLORS.capital).toBeTruthy();
    expect(KIND_LABELS.capital).toBeTruthy();
    expect(REGIONS.some((r) => r.id === "capital")).toBe(true);
  });
});
