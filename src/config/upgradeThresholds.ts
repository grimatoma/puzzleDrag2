/**
 * UPGRADE_THRESHOLDS — the *board-upgrade* gate: how many chained tiles of a
 * type cause the top tile to upgrade to its next type, and gates tile discovery
 * (HUD "next tile" bar). Decoupled from income (TILES_PER_RESOURCE in
 * constants.ts) on purpose: lower income divisors for more resources without
 * accelerating board-tier upgrades, and vice-versa.
 *
 * Kept in a standalone file (no imports) so both `features/tileCollection/data.ts`
 * and `config/productionLines.ts` can reference it without creating a circular
 * dependency through the larger `constants.ts` module.
 */
export const UPGRADE_THRESHOLDS = {
  tile_grass_grass: 6, tile_grass_meadow: 6, tile_grass_spiky: 6,
  tile_grain_wheat: 5,
  tile_mine_stone: 8,
  tile_mine_iron_ore: 6, tile_mine_copper_ore: 6, tile_mine_coal: 7, tile_mine_gem: 5, tile_mine_gold: 6, tile_mine_silver: 6,
  // Birds → Eggs (chain 6). Existing bird tiles get explicit thresholds now
  // that they upgrade to the new `eggs` product.
  tile_bird_turkey: 6, tile_bird_clover: 6, tile_bird_melon: 6,
  tile_veg_carrot: 6, tile_veg_eggplant: 6, tile_veg_turnip: 6, tile_veg_beet: 6, tile_veg_cucumber: 6,
  tile_veg_squash: 6, tile_veg_mushroom: 6, tile_veg_pepper: 6, tile_veg_broccoli: 6,
  // Catalog-import placeholders. All default to 6 — balance comes later.
  tile_grass_heather: 6,
  tile_grain_corn: 5, tile_grain_buckwheat: 6, tile_grain_manna: 6, tile_grain_rice: 6,
  // Fruits → Pie (catalog §4: 7 fruits → 1 pie)
  tile_fruit_apple: 7, tile_fruit_pear: 7, tile_fruit_golden_apple: 7, tile_fruit_blackberry: 7,
  tile_fruit_rambutan: 7, tile_fruit_starfruit: 7, tile_fruit_coconut: 7, tile_fruit_lemon: 7, tile_fruit_jackfruit: 7,
  // Flowers → Honey (catalog §4: 10 flowers → 1 honey)
  tile_flower_pansy: 10, tile_flower_water_lily: 10,
  // Trees → Plank (one-step)
  tile_tree_oak: 6, tile_tree_birch: 6, tile_tree_willow: 6, tile_tree_fir: 6, tile_tree_cypress: 6, tile_tree_palm: 6,
  // Birds → Eggs (one-step)
  tile_bird_pheasant: 6, tile_bird_chicken: 6, tile_bird_hen: 6, tile_bird_rooster: 6, tile_bird_wild_goose: 6, tile_bird_goose: 6,
  tile_bird_parrot: 6, tile_bird_phoenix: 6, tile_bird_dodo: 6, tile_bird_pig_in_disguise: 6,
  // Herd Animals → Meat (catalog §4: 5 herd → 1 meat)
  tile_herd_pig: 5, tile_herd_hog: 5, tile_herd_boar: 5, tile_herd_warthog: 5,
  tile_herd_sheep: 5, tile_herd_alpaca: 5, tile_herd_goat: 5, tile_herd_ram: 5,
  // Cattle → Milk (catalog §4: 6 cattle → 1 milk)
  tile_cattle_cow: 6, tile_cattle_longhorn: 6, tile_cattle_triceratops: 6,
  // Mounts → Horseshoe (catalog §4: 10 mounts → 1 horseshoe)
  tile_mount_horse: 10, tile_mount_donkey: 10, tile_mount_moose: 10, tile_mount_mammoth: 10,
  // Fish biome — flat one-step chains.
  tile_fish_sardine: 5, tile_fish_mackerel: 5, tile_fish_clam: 5, tile_fish_kelp: 6, tile_fish_oyster: 5,
  tile_fish_cocoa: 5, tile_fish_ink: 5, tile_fish_jade: 5,
};
