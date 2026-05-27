/**
 * Hand-maintained catalog enums — ids are fixed at compile time.
 * Config / Dev Panel only patch attributes; add ids here + in the source map, then reload.
 */

export {
  TileKey,
  ResourceKey,
  ToolKey,
  ItemAliasKey,
  type ItemKey,
  ALL_ITEM_KEY_VALUES,
  TILE_KEY_VALUES,
  RESOURCE_KEY_VALUES,
  TOOL_KEY_VALUES,
  ITEM_ALIAS_VALUES,
} from "./itemKeys.js";

export { ZoneId, ZONE_ID_VALUES } from "./zones.js";
export {
  TileCategoryId,
  TILE_CATEGORY_VALUES,
  ZoneCategoryId,
  ZONE_CATEGORY_VALUES,
} from "./tileCategories.js";
export { SettlementBiomeId, SETTLEMENT_BIOME_ID_VALUES } from "./settlementBiomes.js";
export { BuildingId, BUILDING_ID_VALUES } from "./buildings.js";
export { RecipeKey, RECIPE_KEY_VALUES } from "./recipes.js";
export { NpcId, NPC_ID_VALUES } from "./npcs.js";
export { MineHazardId, MINE_HAZARD_ID_VALUES } from "./hazards.js";
export { BossId, BOSS_ID_VALUES } from "./bosses.js";
export { WorkerTypeId, WORKER_TYPE_ID_VALUES } from "./workers.js";
export { AbilityId, ABILITY_ID_VALUES } from "./abilities.js";
export { ToolPowerId, TOOL_POWER_ID_VALUES } from "./toolPowers.js";
export {
  TileDiscoveryMethodId,
  TILE_DISCOVERY_METHOD_ID_VALUES,
} from "./tileDiscovery.js";
export { SeasonId, SEASON_ID_VALUES } from "./seasons.js";
export { BiomeId, BIOME_ID_VALUES } from "./biomes.js";
export { ViewId, VIEW_ID_VALUES } from "./views.js";
export { ModalId, MODAL_ID_VALUES } from "./modals.js";
export { BoardAnimationId, BOARD_ANIMATION_ID_VALUES } from "./boardAnimations.js";
export { FeatureFlagId, FEATURE_FLAG_ID_VALUES } from "./featureFlags.js";
export {
  StoryBeatId,
  STORY_BEAT_ID_VALUES,
} from "./storyBeats.js";
export {
  StoryFlagId,
  STORY_FLAG_ID_VALUES,
} from "./storyFlags.js";
export {
  StoryFlagCategoryId,
  STORY_FLAG_CATEGORY_ID_VALUES,
} from "./storyFlagCategories.js";
export {
  StoryTriggerType,
  STORY_TRIGGER_TYPE_VALUES,
} from "./storyTriggerTypes.js";
export { TuningKey, TUNING_KEY_VALUES } from "./tuningKeys.js";
