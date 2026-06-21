// Town tileset manifest — the reusable VECTOR tiles the town scene bakes and
// places, in place of the old Tuxemon pixel recipes. Each entry points at a
// Canvas-2D draw (reused straight from the shared icon catalog where one already
// exists — trees, cozy decor, water-lily, cattail — or a new town prop) plus the
// metadata the scene needs to bake + anchor it:
//   • box      — square texture size in icon units (the draws live in ~[-34,30])
//   • groundY  — icon-space Y of the ground-contact point, so the placed sprite's
//                vertical origin lands the prop on its spot (origin = (box/2+groundY)/box)
//
// TownScene bakes every entry into a transparent texture keyed `tt_<name>` via
// `canvasTexture`, then `drawTrees`/`drawProps`/`drawLotDecor`/`drawFences` place
// them. Adding a tile = add a draw + an entry here (see the vector-tileset skill).
import { ICONS as TREES } from "../../../textures/categories/trees.js";
import { ICONS as COZY } from "../../../textures/categories/cozyDecor.js";
import { ICONS as NATURE } from "../../../textures/categories/nature.js";
import { ICONS as FLOWERS } from "../../../textures/categories/flowers.js";
import { TOWN_PROP_DRAWS } from "./townProps.js";

export interface TownTileSpec {
  draw: (ctx: CanvasRenderingContext2D) => void;
  box: number;
  groundY: number;
}

const tree = (draw: (ctx: CanvasRenderingContext2D) => void): TownTileSpec => ({ draw, box: 96, groundY: 24 });
const prop = (draw: (ctx: CanvasRenderingContext2D) => void, box = 80): TownTileSpec => ({ draw, box, groundY: 22 });

export const TOWN_TILES: Record<string, TownTileSpec> = {
  // ── Trees (reused straight from the shared catalog) ──
  tree_oak: tree(TREES.tile_tree_oak.draw),
  tree_birch: tree(TREES.tile_tree_birch.draw),
  tree_fir: tree(TREES.tile_tree_fir.draw),
  tree_willow: tree(TREES.tile_tree_willow.draw),
  tree_cypress: tree(TREES.tile_tree_cypress.draw),

  // ── Nature props (new + catalog) ──
  bush: prop(TOWN_PROP_DRAWS.bush),
  berry_bush: prop(TOWN_PROP_DRAWS.berry_bush),
  hedge: prop(TOWN_PROP_DRAWS.hedge),
  boulder: prop(TOWN_PROP_DRAWS.boulder),
  rock_cluster: prop(TOWN_PROP_DRAWS.rock_cluster),
  cattail: prop(NATURE.nature_cattail.draw, 64),
  water_lily: prop(FLOWERS.tile_flower_water_lily.draw, 64),

  // ── Settlement decor (reused from cozyDecor) ──
  fountain: prop(COZY.cozy_fountain.draw, 80),
  signpost: prop(COZY.cozy_signpost.draw),
  lamp: prop(COZY.cozy_street_lamp.draw),
  lantern: prop(COZY.cozy_lantern.draw, 64),
  barrel: prop(COZY.cozy_barrel.draw, 64),
  well_bucket: prop(COZY.cozy_well_bucket.draw, 64),
  flower_pot: prop(COZY.cozy_flower_pot.draw, 64),
  picket_fence: prop(COZY.cozy_picket_fence.draw),
  bench: prop(COZY.cozy_bench.draw),
  birdhouse: prop(COZY.cozy_birdhouse.draw, 64),

  // ── Construction clutter + market (new town props) ──
  log_pile: prop(TOWN_PROP_DRAWS.log_pile),
  plank_stack: prop(TOWN_PROP_DRAWS.plank_stack),
  stone_pile: prop(TOWN_PROP_DRAWS.stone_pile),
  crate: prop(TOWN_PROP_DRAWS.crate, 64),
  sacks: prop(TOWN_PROP_DRAWS.sacks, 64),
  hay_bale: prop(TOWN_PROP_DRAWS.hay_bale),
  sawhorse: prop(TOWN_PROP_DRAWS.sawhorse),
  market_stall: prop(TOWN_PROP_DRAWS.market_stall, 96),
  rowboat: prop(TOWN_PROP_DRAWS.rowboat, 88),
  dock_post: prop(TOWN_PROP_DRAWS.dock_post, 64),
};

export type TownTileName = keyof typeof TOWN_TILES;

/** Texture key TownScene bakes/places for a manifest tile. */
export const ttKey = (name: string) => `tt_${name}`;

/** Vertical sprite origin that lands tile `spec` on its ground-contact point. */
export const ttOriginY = (spec: TownTileSpec) => (spec.box / 2 + spec.groundY) / spec.box;

/** Tree species used by the forest scatter, in a stable order. */
export const TREE_SPECIES = ["tree_oak", "tree_birch", "tree_fir", "tree_willow", "tree_cypress"] as const;
