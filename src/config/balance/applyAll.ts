import type { BalanceOverrides } from "../schemas/balance.js";
import { parseOptionalOverrideSection } from "../schemas/parseOverrideSection.js";
import { tuningSchema } from "../schemas/tuning.js";
import {
  applyAchievementOverrides,
  applyBiomeOverrides,
  applyBossOverrides,
  applyBuildingOverrides,
  applyDailyRewardOverrides,
  applyExpeditionOverrides,
  applyFlagOverrides,
  applyItemOverrides,
  applyKeeperOverrides,
  applyNpcOverrides,
  applyRecipeOverrides,
  applyStoryOverrides,
  applyTileOverrides,
  applyUpgradeThresholdOverrides,
  applyWorkerOverrides,
  applyZoneOverrides,
} from "../applyOverrides.js";
import {
  applyConstantsTuning,
  BIOMES,
  BUILDINGS,
  DAILY_REWARDS,
  EXPEDITION_FOOD_TURNS,
  EXPEDITION_MEAT_FOODS,
  ITEMS,
  PALETTES,
  RECIPES,
  SETTLEMENT_BIOMES,
  UPGRADE_THRESHOLDS,
} from "../../constants.js";
import { STORY_FLAGS } from "../../flags.js";
import { KEEPERS } from "../../keepers.js";
import { SIDE_BEATS, STORY_BEATS } from "../../story.js";
import { ACHIEVEMENTS } from "../../features/achievements/data.js";
import { BOSSES } from "../../features/bosses/data.js";
import { BOND_BANDS, NPC_DATA } from "../../features/npcs/data.js";
import { TILE_TYPES } from "../../features/tileCollection/data.js";
import { TYPE_WORKERS } from "../../features/workers/data.js";
import { applySettlementFoundingTuning, ZONES } from "../../features/zones/data.js";

export type TuningOverrides = ReturnType<typeof applyTuningToRuntime>;

/** Apply validated tuning keys to module-level `export let` constants. */
export function applyTuningToRuntime(tuningRaw: BalanceOverrides["tuning"]) {
  const tuning = parseOptionalOverrideSection("tuning", tuningSchema, tuningRaw) ?? {};
  applyConstantsTuning(tuning);
  applySettlementFoundingTuning(tuning);
  return tuning;
}

/** Recompute default tile palette after item color overrides. */
export function refreshDefaultTilePalette(): void {
  for (const r of [...BIOMES.farm.resources, ...BIOMES.mine.resources, ...BIOMES.fish.resources]) {
    if (PALETTES.default.tiles[r.key] !== r.look?.color) {
      PALETTES.default.tiles[r.key] = r.look?.color;
    }
  }
}

/**
 * Apply every balance.json / Dev Panel override to live config tables.
 * Call once after all canonical data modules have loaded.
 */
export function applyAllBalanceOverrides(overrides: BalanceOverrides): TuningOverrides {
  const o = overrides;

  applyDailyRewardOverrides(DAILY_REWARDS, o.dailyRewards);
  applyUpgradeThresholdOverrides(UPGRADE_THRESHOLDS, o.upgradeThresholds);
  applyItemOverrides(ITEMS, o.items);
  applyRecipeOverrides(RECIPES, o.recipes);
  applyBuildingOverrides(BUILDINGS, o.buildings);
  applyExpeditionOverrides(EXPEDITION_FOOD_TURNS, EXPEDITION_MEAT_FOODS, o.expedition);
  applyBiomeOverrides(SETTLEMENT_BIOMES, o.biomes);
  applyZoneOverrides(ZONES, o.zones);
  applyWorkerOverrides(TYPE_WORKERS, o.workers);
  applyKeeperOverrides(KEEPERS, o.keepers);
  applyNpcOverrides(NPC_DATA, BOND_BANDS, o.npcs);
  applyStoryOverrides(STORY_BEATS, SIDE_BEATS, o.story);
  applyFlagOverrides(STORY_FLAGS, o.flags);
  applyBossOverrides(BOSSES, o.bosses);
  applyAchievementOverrides(ACHIEVEMENTS, o.achievements);
  applyTileOverrides(TILE_TYPES, o);

  const tuning = applyTuningToRuntime(o.tuning);
  refreshDefaultTilePalette();
  return tuning;
}
