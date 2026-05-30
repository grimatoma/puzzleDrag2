/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Active tool power ids. */
export enum ToolPowerId {
  AreaBlast = "area_blast",
  Barometer = "barometer",
  ClearAll = "clear_all",
  ClearCategory = "clear_category",
  ClearColumn = "clear_column",
  ClearComponent = "clear_component",
  ClearCross = "clear_cross",
  ClearHazard = "clear_hazard",
  ClearRandomN = "clear_random_n",
  ClearRow = "clear_row",
  CoalDetector = "coal_detector",
  DiamondHammer = "diamond_hammer",
  Explosives = "explosives",
  FillBias = "fill_bias",
  FishingNet = "fishing_net",
  Harpoon = "harpoon",
  IronRation = "iron_ration",
  LampFlint = "lamp_flint",
  MagicFluteForceChain = "magic_flute_force_chain",
  MagicSeedPc2Grow = "magic_seed_pc2_grow",
  OpenChest = "open_chest",
  ReshuffleBoard = "reshuffle_board",
  RestoreTurns = "restore_turns",
  RevealChest = "reveal_chest",
  RevealTiles = "reveal_tiles",
  ScatterHazard = "scatter_hazard",
  SeaNavigationTools = "sea_navigation_tools",
  Seagull = "seagull",
  SilverDetector = "silver_detector",
  SilverPick = "silver_pick",
  SilverTransmuter = "silver_transmuter",
  SpawnChest = "spawn_chest",
  SquidTrap = "squid_trap",
  TapClearType = "tap_clear_type",
  TransformAdjacent = "transform_adjacent",
  TransformRandomN = "transform_random_n",
  TransformTiles = "transform_tiles",
  UndoMove = "undo_move",
  WaterPump = "water_pump",
  WaterPumpPc2 = "water_pump_pc2",
}

export const TOOL_POWER_ID_VALUES = Object.values(ToolPowerId);
