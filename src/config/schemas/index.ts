/**
 * Config schemas — Zod SSOT for balance overrides and canonical shapes.
 * Catalog ids remain in src/types/catalog/; schemas describe attributes.
 *
 * Unions vs enums: discriminatedUnion on `kind` for item shapes; nativeEnum
 * for catalog membership at call sites (see item.ts, catalog enums doc).
 */

export { ItemKind, type ItemKindValue } from "./itemKind.js";

export {
  itemEntrySchema,
  tileItemSchema,
  resourceItemSchema,
  toolItemSchema,
  type ItemEntry,
  type TileItemEntry,
  type ResourceItemEntry,
  type ToolItemEntry,
} from "./item.js";

export {
  itemOverrideSchema,
  itemsOverridesSchema,
  type ItemOverride,
  type ItemsOverrides,
} from "./itemOverride.js";

export {
  tilePowerPatchSchema,
  tilePowersOverridesSchema,
  tileUnlocksOverridesSchema,
  tileDescriptionsOverridesSchema,
} from "./tilePower.js";

export { tuningSchema, type TuningOverrides } from "./tuning.js";

export {
  recipeDefinitionSchema,
  recipeOverrideSchema,
  recipesOverridesSchema,
} from "./recipe.js";

export {
  buildingDefinitionSchema,
  buildingOverrideSchema,
  buildingsOverridesSchema,
} from "./building.js";

export { zoneOverrideSchema, zonesOverridesSchema } from "./zone.js";

export { workerOverrideSchema, workersOverridesSchema } from "./worker.js";

export { keeperOverrideSchema, keepersOverridesSchema } from "./keeper.js";

export { expeditionOverrideSchema } from "./expedition.js";

export {
  settlementBiomeEntrySchema,
  biomesOverridesSchema,
} from "./biome.js";

export { npcsOverridesSchema } from "./npc.js";

export { seasonEntrySchema, type SeasonEntry } from "./season.js";

export { storyOverridesSchema } from "./story.js";

export { flagsOverridesSchema } from "./flags.js";

export { bossOverrideSchema, bossesOverridesSchema } from "./boss.js";

export {
  achievementEntrySchema,
  achievementOverrideSchema,
  achievementsOverridesSchema,
  type AchievementEntry,
} from "./achievement.js";

export { dailyRewardsOverridesSchema } from "./dailyReward.js";

export {
  abilityCatalogEntrySchema,
  abilityParamDefSchema,
} from "./ability.js";

export {
  toolPowerCatalogEntrySchema,
  toolPowerParamDefSchema,
} from "./toolPower.js";

export {
  balanceSchema,
  upgradeThresholdsOverridesSchema,
  type BalanceOverrides,
  type BalanceDraft,
} from "./balance.js";

export {
  parseBalanceOverrides,
  _resetBalanceParseWarningsForTests,
} from "./parseBalance.js";

export { parseOverrideSection, parseOptionalOverrideSection } from "./parseOverrideSection.js";
