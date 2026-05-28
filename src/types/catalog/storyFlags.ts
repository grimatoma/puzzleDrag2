/**
 * Story flags on `state.story.flags` — registry in `src/flags.ts` (`STORY_FLAGS`).
 * Triggers on flags use the same vocabulary as beat triggers (`StoryTriggerType`).
 */

export enum StoryFlagId {
  IntroSeen = "intro_seen",
  HearthLit = "hearth_lit",
  FirstOrder = "first_order",
  GranaryBuilt = "granary_built",
  HomeKeeperResolved = "home_keeper_resolved",
  FirstIron = "first_iron",
  QuarryFoothold = "quarry_foothold",
  FrostmawActive = "frostmaw_active",
  MineRevealed = "mine_revealed",
  MineUnlocked = "mine_unlocked",
  CaravanOpen = "caravan_open",
  FestivalAnnounced = "festival_announced",
  IsWon = "isWon",

  MiraLetterSeen = "mira_letter_seen",
  MiraLetterResolved = "mira_letter_resolved",
  MiraLetterSent = "mira_letter_sent",
  MiraLetterKept = "mira_letter_kept",
  MiraLetterRead = "mira_letter_read",

  KeeperChoiceMade = "keeper_choice_made",
  KeeperPathCoexist = "keeper_path_coexist",
  KeeperPathDriveout = "keeper_path_driveout",
}

export const STORY_FLAG_ID_VALUES = Object.values(StoryFlagId);
