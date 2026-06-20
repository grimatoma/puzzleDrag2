// Vector seasonal art for the SHOWCASE tiles — the hand-drawn, fully-animated
// all-vector pipeline (idle loops + forward season→season transitions) as the
// alternative to the baked PNG route. Each per-tile module is one parameterized
// `paint(ctx, params, bob)` with a per-season parameter set: season stills are
// `paint(SP[season])`, idle loops add a rest-anchored bob, and the forward
// TRANSITIONS are an eased lerp of those same params — so the subject keeps a
// constant identity across all four seasons (only colour / frost / pad-dressing
// change) and every morph starts/ends exactly on the neighbouring season still.
//
// 63 tiles spanning every board category (tree · fruit · grain · veg · grass ·
// flower · bird · herd · cattle · mount · fish · mineral · special). Each module
// exports `VARIANTS` (4 seasons of {draw, anim}) and `TRANSITIONS` (forward
// morphs keyed by from-season index). `seasonalTiles.ts` merges them into the
// registry and the engine gives these keys vector precedence over any baked PNG
// anchor (see `VECTOR_PREFER_KEYS`).
//
// NOTE: a tile's icon-registry KEY may not match its source folder — e.g. heather
// lives at flower/heather.ts but its board key is `tile_grass_heather`, and clover
// at grass/clover.ts keys to `tile_bird_clover`. The key (right-hand side below) is
// what the board uses; the import path is just where the art is authored.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "./types.js";
import { VARIANTS as OAK, TRANSITIONS as OAK_T } from "./tree/oak.js";
import { VARIANTS as BIRCH, TRANSITIONS as BIRCH_T } from "./tree/birch.js";
import { VARIANTS as CYPRESS, TRANSITIONS as CYPRESS_T } from "./tree/cypress.js";
import { VARIANTS as FIR, TRANSITIONS as FIR_T } from "./tree/fir.js";
import { VARIANTS as PALM, TRANSITIONS as PALM_T } from "./tree/palm.js";
import { VARIANTS as WILLOW, TRANSITIONS as WILLOW_T } from "./tree/willow.js";
import { VARIANTS as APPLE, TRANSITIONS as APPLE_T } from "./fruit/apple.js";
import { VARIANTS as PEAR, TRANSITIONS as PEAR_T } from "./fruit/pear.js";
import { VARIANTS as LEMON, TRANSITIONS as LEMON_T } from "./fruit/lemon.js";
import { VARIANTS as BLACKBERRY, TRANSITIONS as BLACKBERRY_T } from "./fruit/blackberry.js";
import { VARIANTS as COCONUT, TRANSITIONS as COCONUT_T } from "./fruit/coconut.js";
import { VARIANTS as GOLDENAPPLE, TRANSITIONS as GOLDENAPPLE_T } from "./fruit/goldenApple.js";
import { VARIANTS as JACKFRUIT, TRANSITIONS as JACKFRUIT_T } from "./fruit/jackfruit.js";
import { VARIANTS as RAMBUTAN, TRANSITIONS as RAMBUTAN_T } from "./fruit/rambutan.js";
import { VARIANTS as STARFRUIT, TRANSITIONS as STARFRUIT_T } from "./fruit/starfruit.js";
import { VARIANTS as CORN, TRANSITIONS as CORN_T } from "./grain/corn.js";
import { VARIANTS as PEPPER, TRANSITIONS as PEPPER_T } from "./veg/pepper.js";
import { VARIANTS as MUSHROOM, TRANSITIONS as MUSHROOM_T } from "./veg/mushroom.js";
import { VARIANTS as BEET, TRANSITIONS as BEET_T } from "./veg/beet.js";
import { VARIANTS as BROCCOLI, TRANSITIONS as BROCCOLI_T } from "./veg/broccoli.js";
import { VARIANTS as CARROT, TRANSITIONS as CARROT_T } from "./veg/carrot.js";
import { VARIANTS as CUCUMBER, TRANSITIONS as CUCUMBER_T } from "./veg/cucumber.js";
import { VARIANTS as EGGPLANT, TRANSITIONS as EGGPLANT_T } from "./veg/eggplant.js";
import { VARIANTS as SQUASH, TRANSITIONS as SQUASH_T } from "./veg/squash.js";
import { VARIANTS as TURNIP, TRANSITIONS as TURNIP_T } from "./veg/turnip.js";
import { VARIANTS as GRASS, TRANSITIONS as GRASS_T } from "./grass/grass.js";
import { VARIANTS as MEADOW, TRANSITIONS as MEADOW_T } from "./grass/meadow.js";
import { VARIANTS as SPIKY, TRANSITIONS as SPIKY_T } from "./grass/spiky.js";
import { VARIANTS as CLOVER, TRANSITIONS as CLOVER_T } from "./grass/clover.js";
import { VARIANTS as PANSY, TRANSITIONS as PANSY_T } from "./flower/pansy.js";
import { VARIANTS as HEATHER, TRANSITIONS as HEATHER_T } from "./flower/heather.js";
import { VARIANTS as WATERLILY, TRANSITIONS as WATERLILY_T } from "./flower/waterLily.js";
import { VARIANTS as CHICKEN, TRANSITIONS as CHICKEN_T } from "./bird/chicken.js";
import { VARIANTS as ROOSTER, TRANSITIONS as ROOSTER_T } from "./bird/rooster.js";
import { VARIANTS as HEN, TRANSITIONS as HEN_T } from "./bird/hen.js";
import { VARIANTS as TURKEY, TRANSITIONS as TURKEY_T } from "./bird/turkey.js";
import { VARIANTS as GOOSE, TRANSITIONS as GOOSE_T } from "./bird/goose.js";
import { VARIANTS as PHEASANT, TRANSITIONS as PHEASANT_T } from "./bird/pheasant.js";
import { VARIANTS as PARROT, TRANSITIONS as PARROT_T } from "./bird/parrot.js";
import { VARIANTS as PHOENIX, TRANSITIONS as PHOENIX_T } from "./bird/phoenix.js";
import { VARIANTS as DODO, TRANSITIONS as DODO_T } from "./bird/dodo.js";
import { VARIANTS as SHEEP, TRANSITIONS as SHEEP_T } from "./herd/sheep.js";
import { VARIANTS as PIG, TRANSITIONS as PIG_T } from "./herd/pig.js";
import { VARIANTS as HOG, TRANSITIONS as HOG_T } from "./herd/hog.js";
import { VARIANTS as BOAR, TRANSITIONS as BOAR_T } from "./herd/boar.js";
import { VARIANTS as WARTHOG, TRANSITIONS as WARTHOG_T } from "./herd/warthog.js";
import { VARIANTS as ALPACA, TRANSITIONS as ALPACA_T } from "./herd/alpaca.js";
import { VARIANTS as GOAT, TRANSITIONS as GOAT_T } from "./herd/goat.js";
import { VARIANTS as RAM, TRANSITIONS as RAM_T } from "./herd/ram.js";
import { VARIANTS as COW, TRANSITIONS as COW_T } from "./cattle/cow.js";
import { VARIANTS as LONGHORN, TRANSITIONS as LONGHORN_T } from "./cattle/longhorn.js";
import { VARIANTS as TRICERATOPS, TRANSITIONS as TRICERATOPS_T } from "./cattle/triceratops.js";
import { VARIANTS as HORSE, TRANSITIONS as HORSE_T } from "./mount/horse.js";
import { VARIANTS as DONKEY, TRANSITIONS as DONKEY_T } from "./mount/donkey.js";
import { VARIANTS as MOOSE, TRANSITIONS as MOOSE_T } from "./mount/moose.js";
import { VARIANTS as MAMMOTH, TRANSITIONS as MAMMOTH_T } from "./mount/mammoth.js";
import { VARIANTS as CLAM, TRANSITIONS as CLAM_T } from "./fish/clam.js";
import { VARIANTS as OYSTER, TRANSITIONS as OYSTER_T } from "./fish/oyster.js";
import { VARIANTS as MACKEREL, TRANSITIONS as MACKEREL_T } from "./fish/mackerel.js";
import { VARIANTS as KELP, TRANSITIONS as KELP_T } from "./fish/kelp.js";
import { VARIANTS as GEM, TRANSITIONS as GEM_T } from "./mine/gem.js";
import { VARIANTS as GOLD, TRANSITIONS as GOLD_T } from "./mine/gold.js";
import { VARIANTS as GIANTPEARL, TRANSITIONS as GIANTPEARL_T } from "./special/giantPearl.js";

export const SHOWCASE_TILES: Record<string, SeasonalTileEntry> = {
  tile_tree_oak: OAK,
  tile_tree_birch: BIRCH,
  tile_tree_cypress: CYPRESS,
  tile_tree_fir: FIR,
  tile_tree_palm: PALM,
  tile_tree_willow: WILLOW,
  tile_fruit_apple: APPLE,
  tile_fruit_pear: PEAR,
  tile_fruit_lemon: LEMON,
  tile_fruit_blackberry: BLACKBERRY,
  tile_fruit_coconut: COCONUT,
  tile_fruit_golden_apple: GOLDENAPPLE,
  tile_fruit_jackfruit: JACKFRUIT,
  tile_fruit_rambutan: RAMBUTAN,
  tile_fruit_starfruit: STARFRUIT,
  tile_grain_corn: CORN,
  tile_veg_pepper: PEPPER,
  tile_veg_mushroom: MUSHROOM,
  tile_veg_beet: BEET,
  tile_veg_broccoli: BROCCOLI,
  tile_veg_carrot: CARROT,
  tile_veg_cucumber: CUCUMBER,
  tile_veg_eggplant: EGGPLANT,
  tile_veg_squash: SQUASH,
  tile_veg_turnip: TURNIP,
  tile_grass_grass: GRASS,
  tile_grass_meadow: MEADOW,
  tile_grass_spiky: SPIKY,
  tile_bird_clover: CLOVER,
  tile_flower_pansy: PANSY,
  tile_grass_heather: HEATHER,
  tile_flower_water_lily: WATERLILY,
  tile_bird_chicken: CHICKEN,
  tile_bird_rooster: ROOSTER,
  tile_bird_hen: HEN,
  tile_bird_turkey: TURKEY,
  tile_bird_goose: GOOSE,
  tile_bird_pheasant: PHEASANT,
  tile_bird_parrot: PARROT,
  tile_bird_phoenix: PHOENIX,
  tile_bird_dodo: DODO,
  tile_herd_sheep: SHEEP,
  tile_herd_pig: PIG,
  tile_herd_hog: HOG,
  tile_herd_boar: BOAR,
  tile_herd_warthog: WARTHOG,
  tile_herd_alpaca: ALPACA,
  tile_herd_goat: GOAT,
  tile_herd_ram: RAM,
  tile_cattle_cow: COW,
  tile_cattle_longhorn: LONGHORN,
  tile_cattle_triceratops: TRICERATOPS,
  tile_mount_horse: HORSE,
  tile_mount_donkey: DONKEY,
  tile_mount_moose: MOOSE,
  tile_mount_mammoth: MAMMOTH,
  tile_fish_clam: CLAM,
  tile_fish_oyster: OYSTER,
  tile_fish_mackerel: MACKEREL,
  tile_fish_kelp: KELP,
  tile_mine_gem: GEM,
  tile_mine_gold: GOLD,
  tile_special_giant_pearl: GIANTPEARL,
};

export const SHOWCASE_TRANSITIONS: Record<string, SeasonalTransitionSet> = {
  tile_tree_oak: OAK_T,
  tile_tree_birch: BIRCH_T,
  tile_tree_cypress: CYPRESS_T,
  tile_tree_fir: FIR_T,
  tile_tree_palm: PALM_T,
  tile_tree_willow: WILLOW_T,
  tile_fruit_apple: APPLE_T,
  tile_fruit_pear: PEAR_T,
  tile_fruit_lemon: LEMON_T,
  tile_fruit_blackberry: BLACKBERRY_T,
  tile_fruit_coconut: COCONUT_T,
  tile_fruit_golden_apple: GOLDENAPPLE_T,
  tile_fruit_jackfruit: JACKFRUIT_T,
  tile_fruit_rambutan: RAMBUTAN_T,
  tile_fruit_starfruit: STARFRUIT_T,
  tile_grain_corn: CORN_T,
  tile_veg_pepper: PEPPER_T,
  tile_veg_mushroom: MUSHROOM_T,
  tile_veg_beet: BEET_T,
  tile_veg_broccoli: BROCCOLI_T,
  tile_veg_carrot: CARROT_T,
  tile_veg_cucumber: CUCUMBER_T,
  tile_veg_eggplant: EGGPLANT_T,
  tile_veg_squash: SQUASH_T,
  tile_veg_turnip: TURNIP_T,
  tile_grass_grass: GRASS_T,
  tile_grass_meadow: MEADOW_T,
  tile_grass_spiky: SPIKY_T,
  tile_bird_clover: CLOVER_T,
  tile_flower_pansy: PANSY_T,
  tile_grass_heather: HEATHER_T,
  tile_flower_water_lily: WATERLILY_T,
  tile_bird_chicken: CHICKEN_T,
  tile_bird_rooster: ROOSTER_T,
  tile_bird_hen: HEN_T,
  tile_bird_turkey: TURKEY_T,
  tile_bird_goose: GOOSE_T,
  tile_bird_pheasant: PHEASANT_T,
  tile_bird_parrot: PARROT_T,
  tile_bird_phoenix: PHOENIX_T,
  tile_bird_dodo: DODO_T,
  tile_herd_sheep: SHEEP_T,
  tile_herd_pig: PIG_T,
  tile_herd_hog: HOG_T,
  tile_herd_boar: BOAR_T,
  tile_herd_warthog: WARTHOG_T,
  tile_herd_alpaca: ALPACA_T,
  tile_herd_goat: GOAT_T,
  tile_herd_ram: RAM_T,
  tile_cattle_cow: COW_T,
  tile_cattle_longhorn: LONGHORN_T,
  tile_cattle_triceratops: TRICERATOPS_T,
  tile_mount_horse: HORSE_T,
  tile_mount_donkey: DONKEY_T,
  tile_mount_moose: MOOSE_T,
  tile_mount_mammoth: MAMMOTH_T,
  tile_fish_clam: CLAM_T,
  tile_fish_oyster: OYSTER_T,
  tile_fish_mackerel: MACKEREL_T,
  tile_fish_kelp: KELP_T,
  tile_mine_gem: GEM_T,
  tile_mine_gold: GOLD_T,
  tile_special_giant_pearl: GIANTPEARL_T,
};
