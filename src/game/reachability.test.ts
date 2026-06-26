import { describe, it, expect } from "vitest";
import {
  isBuildingReachable,
  isRecipeReachable,
  isResourceReachable,
  isToolReachable,
  isTileReachable,
  tileReachability,
  reachabilityOf,
  findUnreachable,
} from "./reachability.js";

describe("reachability", () => {
  it("core in-scope content is reachable", () => {
    for (const b of ["hearth", "bakery", "granary", "larder", "mill", "workshop", "forge", "sawmill", "caravan_post", "chapel", "powder_store"]) {
      expect(isBuildingReachable(b)).toBe(true);
    }
    for (const r of ["hay_bundle", "flour", "plank", "eggs", "soup", "pie", "jam", "meat", "block", "iron_bar", "coke", "dirt"]) {
      expect(isResourceReachable(r)).toBe(true);
    }
    // Recipes resolve by canonical `rec_*` key and by item alias.
    for (const k of ["rec_bread", "bread", "rec_preserve", "rec_harvestpie", "rec_gemcrown", "rec_iron_hinge"]) {
      expect(isRecipeReachable(k)).toBe(true);
    }
    for (const t of ["rake", "sickle", "plough", "bomb"]) {
      expect(isToolReachable(t)).toBe(true);
    }
    for (const t of ["tile_grass_grass", "tile_grain_corn", "tile_fruit_apple", "tile_herd_pig"]) {
      expect(isTileReachable(t)).toBe(true);
    }
  });

  it("buy / research / daily tiles are gated, not hard-reachable", () => {
    expect(tileReachability("tile_bird_clover")).toBe("gated"); // buy
    expect(tileReachability("tile_grass_spiky")).toBe("gated"); // research
    expect(tileReachability("tile_cattle_triceratops")).toBe("gated"); // daily
    expect(isTileReachable("tile_bird_clover")).toBe(false);
  });

  it("reachabilityOf dispatches by concept id", () => {
    expect(reachabilityOf("buildings", "bakery")).toBe("reachable");
    expect(reachabilityOf("buildings", "mining_camp")).toBe("unreachable"); // hidden — no tier unlock
    expect(reachabilityOf("recipes", "rec_bread")).toBe("reachable");
    expect(reachabilityOf("tiles", "tile_bird_clover")).toBe("gated");
    expect(reachabilityOf("nonsense", "x")).toBeNull();
  });

  // GUARD. A non-empty diff here means new dead weight or a scoped-out leftover with
  // no unlock path. If that is intentional (e.g. content deliberately removed from a
  // zone), update this allowlist; otherwise wire an unlock path / recipe / station.
  it("the only unreachable catalog entries are the known allowlist", () => {
    expect(findUnreachable()).toEqual({
      // Hidden building (x=y=w=h=0, hidden:true): built via a special path, never a tier unlock.
      buildings: ["mining_camp"],
      recipes: [],
      // Tools granted by systems we don't model here (daily login / almanac / portal), not by a
      // Workshop recipe or a civic-provision building.
      tools: [
        "golden_apple",
        "golden_carrot",
        "golden_idol",
        "golden_sheep",
        "hourglass",
        "magic_fertilizer",
        "magic_seed",
        "magic_wand",
        "miners_hat",
        "philosophers_stone",
      ],
      resources: [],
      tiles: [],
    });
  });
});
