import { describe, it, expect } from "vitest";
import {
  isBuildingReachable,
  isRecipeReachable,
  isResourceReachable,
  isToolReachable,
  isTileReachable,
  isWorkerReachable,
  isZoneReachable,
  tileReachability,
  categoryReachability,
  reachabilityOf,
  findUnreachable,
} from "./reachability.js";

describe("reachability", () => {
  it("only zones 1 & 2 (home + meadow) are reachable", () => {
    expect(isZoneReachable("home")).toBe(true);
    expect(isZoneReachable("meadow")).toBe(true);
    for (const z of ["orchard", "crossroads", "quarry", "caves", "forge", "harbor", "mirefen", "oldcapital"]) {
      expect(isZoneReachable(z)).toBe(false);
    }
  });

  it("core in-scope content is reachable", () => {
    for (const b of ["hearth", "mill", "bakery", "granary", "larder", "silo", "sawmill", "workshop", "caravan_post", "chapel", "mining_camp", "forge", "powder_store", "smokehouse", "housing"]) {
      expect(isBuildingReachable(b)).toBe(true);
    }
    for (const r of ["hay_bundle", "flour", "plank", "eggs", "soup", "pie", "jam", "meat", "block", "iron_bar", "coke", "dirt"]) {
      expect(isResourceReachable(r)).toBe(true);
    }
    // Recipes resolve by canonical `rec_*` key and by item alias.
    for (const k of ["rec_bread", "bread", "rec_preserve", "rec_harvestpie", "rec_cured_meat", "rec_iron_hinge", "rec_lantern", "rec_fertilizer"]) {
      expect(isRecipeReachable(k)).toBe(true);
    }
    for (const t of ["rake", "sickle", "plough", "fruit_picker", "fertilizer", "bomb"]) {
      expect(isToolReachable(t)).toBe(true);
    }
    for (const w of ["peasant", "farmer", "lumberjack", "poultryman", "vegetable_picker", "fruit_harvester", "herdsman", "baker", "miner", "iron_miner", "coal_miner"]) {
      expect(isWorkerReachable(w)).toBe(true);
    }
    for (const t of ["tile_grass_grass", "tile_grain_corn", "tile_fruit_apple", "tile_herd_pig", "tile_mine_stone", "tile_grass_meadow", "tile_bird_chicken"]) {
      expect(isTileReachable(t)).toBe(true);
    }
  });

  it("out-of-scope content is unlinked → unreachable", () => {
    // Buildings no reachable zone unlocks.
    for (const b of ["inn", "apiary", "stable", "observatory", "kitchen", "harbor_dock", "housing2", "housing3"]) {
      expect(isBuildingReachable(b)).toBe(false);
    }
    // Recipes deferred by the manifest (in-scope station+inputs) or by an unreachable input.
    for (const k of ["rec_honeyroll", "rec_tincture", "rec_axe", "rec_drill", "rec_gemcrown", "rec_goldring", "rec_wedding_pie"]) {
      expect(isRecipeReachable(k)).toBe(false);
    }
    // Deep-mine / flower / cattle / fish products no reachable tile produces.
    for (const r of ["cut_gem", "gold_bar", "honey", "milk", "fish_fillet"]) {
      expect(isResourceReachable(r)).toBe(false);
    }
    // Workers whose target family is unreachable, plus the manifest residue.
    for (const w of ["bee_keeper", "dairywoman", "wrangler", "gem_cutter", "tax_collector", "florist", "steward"]) {
      expect(isWorkerReachable(w)).toBe(false);
    }
    // Tiles unlinked off the starting deck (and their chain children).
    for (const t of ["tile_flower_pansy", "tile_cattle_cow", "tile_mount_horse", "tile_mine_gem", "tile_mine_gold"]) {
      expect(isTileReachable(t)).toBe(false);
    }
  });

  it("buy / research / daily tiles are gated, not hard-reachable", () => {
    expect(tileReachability("tile_bird_clover")).toBe("gated"); // buy
    expect(tileReachability("tile_grass_spiky")).toBe("gated"); // research
    expect(tileReachability("tile_cattle_triceratops")).toBe("gated"); // daily
    expect(isTileReachable("tile_bird_clover")).toBe(false);
  });

  it("categoryReachability: reachable, gated, and unreachable categories", () => {
    // grain/fruits have default-reachable tiles → reachable
    expect(categoryReachability("grain")).toBe("reachable");
    expect(categoryReachability("fruits")).toBe("reachable");
    // mounts: no default-reachable tiles (horse requires the deferred stable building);
    // tile_mount_mammoth is buy-only → gated, not outright unreachable
    expect(categoryReachability("mounts")).toBe("gated");
    // cattle: no default-reachable tiles; tile_cattle_triceratops is daily → gated
    expect(categoryReachability("cattle")).toBe("gated");
    // fish: sardine requires the deferred fishmonger; all others chain off sardine → fully unreachable
    expect(categoryReachability("fish")).toBe("unreachable");
    // nonexistent category
    expect(categoryReachability("no_such_category")).toBe("unreachable");
  });

  it("reachabilityOf dispatches by concept id", () => {
    expect(reachabilityOf("buildings", "bakery")).toBe("reachable");
    expect(reachabilityOf("buildings", "mining_camp")).toBe("reachable"); // unlocks at Town 2 Camp
    expect(reachabilityOf("buildings", "inn")).toBe("unreachable");
    expect(reachabilityOf("recipes", "rec_bread")).toBe("reachable");
    expect(reachabilityOf("recipes", "rec_honeyroll")).toBe("unreachable");
    expect(reachabilityOf("workers", "peasant")).toBe("reachable");
    expect(reachabilityOf("workers", "tax_collector")).toBe("unreachable");
    expect(reachabilityOf("tiles", "tile_bird_clover")).toBe("gated");
    expect(reachabilityOf("categories", "mounts")).toBe("gated");
    expect(reachabilityOf("categories", "fruits")).toBe("reachable");
    expect(reachabilityOf("categories", "fish")).toBe("unreachable");
    expect(reachabilityOf("nonsense", "x")).toBeNull();
  });

  // GUARD — the executable form of the scope doc's "Out of Scope" tab. A diff here means
  // either a NEW orphan (dead weight to wire up) or a deferral that silently became
  // reachable. If the scope changed on purpose (relinked a zone, restored a tile, edited
  // SCOPED_OUT), update these lists; otherwise fix the unlink path. The live wiki page at
  // /b#unreachable renders this same report.
  it("the unreachable catalog is exactly the zones-1&2 deferred set", () => {
    const u = findUnreachable();
    expect(u.buildings).toEqual([
      "apiary", "apothecary", "barn", "brewery", "clock_tower", "fishmonger", "harbor_dock",
      "housing2", "housing3", "inn", "kitchen", "lighthouse", "observatory", "portal", "stable", "watchtower",
    ]);
    expect(u.recipes).toEqual([
      "rec_auger", "rec_axe", "rec_bee", "rec_bird_cage", "rec_bird_feed", "rec_blast_charge", "rec_cat",
      "rec_chowder", "rec_coal_hammer", "rec_coal_transmuter", "rec_cobblepath", "rec_drill", "rec_explosives",
      "rec_festival_loaf", "rec_fish_oil_bot", "rec_gemcrown", "rec_gold_pick", "rec_goldring", "rec_herders_crook",
      "rec_hoe", "rec_honeyroll", "rec_hound", "rec_iron_pick", "rec_iron_ration", "rec_ironframe", "rec_magnet",
      "rec_milk_churn", "rec_rifle", "rec_saddle", "rec_sapling", "rec_scythe_full", "rec_stone_hammer",
      "rec_stonework", "rec_supplies", "rec_terrier", "rec_tincture", "rec_trimmer", "rec_water_pump", "rec_wedding_pie",
    ]);
    expect(u.tools).toEqual([
      "auger", "bee", "bird_cage", "bird_feed", "blast_charge", "cat", "coal_hammer", "coal_transmuter", "drill",
      "explosives", "gold_pick", "golden_apple", "golden_carrot", "golden_idol", "golden_sheep", "herders_crook",
      "hoe", "hound", "hourglass", "iron_pick", "magic_fertilizer", "magic_seed", "magic_wand", "magnet",
      "milk_churn", "miners_hat", "philosophers_stone", "rifle", "saddle", "sapling", "scythe_full", "shuffle",
      "stone_hammer", "terrier", "trimmer", "water_pump",
    ]);
    expect(u.tiles).toEqual([
      "cut_gem", "tile_cattle_cow", "tile_cattle_longhorn", "tile_coin_golden", "tile_fish_clam", "tile_fish_kelp",
      "tile_fish_mackerel", "tile_fish_oyster", "tile_fish_sardine", "tile_flower_pansy", "tile_mine_gem",
      "tile_mine_gold", "tile_mount_donkey", "tile_mount_horse", "tile_mount_moose", "tile_veg_broccoli",
    ]);
    expect(u.workers).toEqual([
      "assayer", "bee_keeper", "dairywoman", "digger", "drover", "equerry", "fisherman", "florist", "gem_cutter",
      "gold_miner", "greengrocer", "perfumer", "rancher", "rune_seeker", "smelter", "steward", "tax_collector", "wrangler",
    ]);
  });
});
