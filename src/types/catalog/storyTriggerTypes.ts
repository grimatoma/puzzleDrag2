/**
 * Trigger `type` strings for beat triggers (`Beat.trigger`), flag triggers
 * (`STORY_FLAGS[].triggers`), and story events — see `conditionMatches` in
 * `src/story.ts` and `sanitizeTrigger` in `src/config/storySanitizers.ts`.
 */

export enum StoryTriggerType {
  ResourceTotal = "resource_total",
  ResourceTotalMulti = "resource_total_multi",
  FlagSet = "flag_set",
  FlagCleared = "flag_cleared",
  SessionStart = "session_start",
  SessionEnded = "session_ended",
  AllBuildingsBuilt = "all_buildings_built",
  ActEntered = "act_entered",
  CraftMade = "craft_made",
  BuildingBuilt = "building_built",
  BossDefeated = "boss_defeated",
  BondAtLeast = "bond_at_least",
  OrderFulfilled = "order_fulfilled",
  KeeperConfronted = "keeper_confronted",
}

export const STORY_TRIGGER_TYPE_VALUES = Object.values(StoryTriggerType);
