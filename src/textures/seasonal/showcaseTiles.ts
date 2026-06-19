// Vector seasonal art for the SHOWCASE tiles — the hand-drawn, fully-animated
// demonstration of the all-vector pipeline (idle loops + forward season→season
// transitions) as the alternative to the baked PNG route.
//
// Each per-tile module follows one architecture: a single parameterized
// `paint(ctx, params, bob)` with a per-season parameter set, where season stills
// are `paint(SP[season])`, idle loops add a rest-anchored bob, and the forward
// TRANSITIONS are an eased lerp of those same params — so the subject keeps a
// constant identity across all four seasons (only colour/frost/pad-dressing
// change) and every morph starts/ends exactly on the neighbouring season still.
//
// Three "pilot" families plus a ten-tile expansion spanning grain, fruit, veg,
// flower, tree and livestock motion idioms. Each module exports `VARIANTS`
// (4 seasons of {draw, anim}) and `TRANSITIONS` (forward morphs keyed by
// from-season index). `seasonalTiles.ts` merges them into the registry and the
// engine gives these keys vector precedence over any baked PNG anchor
// (see `VECTOR_PREFER_KEYS`).

import type { SeasonalTileEntry, SeasonalTransitionSet } from "./types.js";
import { VARIANTS as OAK, TRANSITIONS as OAK_T } from "./tree/oak.js";
import { VARIANTS as PANSY, TRANSITIONS as PANSY_T } from "./flower/pansy.js";
import { VARIANTS as APPLE, TRANSITIONS as APPLE_T } from "./fruit/apple.js";
import { VARIANTS as CORN, TRANSITIONS as CORN_T } from "./grain/corn.js";
import { VARIANTS as PEAR, TRANSITIONS as PEAR_T } from "./fruit/pear.js";
import { VARIANTS as LEMON, TRANSITIONS as LEMON_T } from "./fruit/lemon.js";
import { VARIANTS as PEPPER, TRANSITIONS as PEPPER_T } from "./veg/pepper.js";
import { VARIANTS as MUSHROOM, TRANSITIONS as MUSHROOM_T } from "./veg/mushroom.js";
import { VARIANTS as BEET, TRANSITIONS as BEET_T } from "./veg/beet.js";
import { VARIANTS as HEATHER, TRANSITIONS as HEATHER_T } from "./flower/heather.js";
import { VARIANTS as WATER_LILY, TRANSITIONS as WATER_LILY_T } from "./flower/waterLily.js";
import { VARIANTS as BIRCH, TRANSITIONS as BIRCH_T } from "./tree/birch.js";
import { VARIANTS as SHEEP, TRANSITIONS as SHEEP_T } from "./herd/sheep.js";

export const SHOWCASE_TILES: Record<string, SeasonalTileEntry> = {
  tile_tree_oak: OAK,
  tile_flower_pansy: PANSY,
  tile_fruit_apple: APPLE,
  tile_grain_corn: CORN,
  tile_fruit_pear: PEAR,
  tile_fruit_lemon: LEMON,
  tile_veg_pepper: PEPPER,
  tile_veg_mushroom: MUSHROOM,
  tile_veg_beet: BEET,
  tile_flower_heather: HEATHER,
  tile_flower_water_lily: WATER_LILY,
  tile_tree_birch: BIRCH,
  tile_herd_sheep: SHEEP,
};

export const SHOWCASE_TRANSITIONS: Record<string, SeasonalTransitionSet> = {
  tile_tree_oak: OAK_T,
  tile_flower_pansy: PANSY_T,
  tile_fruit_apple: APPLE_T,
  tile_grain_corn: CORN_T,
  tile_fruit_pear: PEAR_T,
  tile_fruit_lemon: LEMON_T,
  tile_veg_pepper: PEPPER_T,
  tile_veg_mushroom: MUSHROOM_T,
  tile_veg_beet: BEET_T,
  tile_flower_heather: HEATHER_T,
  tile_flower_water_lily: WATER_LILY_T,
  tile_tree_birch: BIRCH_T,
  tile_herd_sheep: SHEEP_T,
};
