/**
 * Canonical story beat ids (main arc + side beats in `src/story.ts`).
 * Dev Panel / `balance.json` may add presentation patches only; new beat ids
 * require a new enum member here + a row in `STORY_BEATS` / `SIDE_BEATS`.
 */

export enum StoryBeatId {
  // Main arc (act order)
  Act1Arrival = "act1_arrival",
  Act1FirstHarvest = "act1_first_harvest",
  Act1LightHearth = "act1_light_hearth",
  Act1FirstOrder = "act1_first_order",
  Act1BuildGranary = "act1_build_granary",
  Act1KeeperTrial = "act1_keeper_trial",
  Act2BramArrives = "act2_bram_arrives",
  Act2FirstHinge = "act2_first_hinge",
  Act2Frostmaw = "act2_frostmaw",
  Act2LissArrives = "act2_liss_arrives",
  Act3MineFound = "act3_mine_found",
  Act3MineOpened = "act3_mine_opened",
  Act3Caravan = "act3_caravan",
  Act3Festival = "act3_festival",
  Act3Win = "act3_win",

  // Side beats
  TutorialBeat4 = "tutorial_beat_4",
  MiraLetter1 = "mira_letter_1",
  MiraLetterSent = "mira_letter_sent",
  MiraLetterKept = "mira_letter_kept",
  MiraLetterRead = "mira_letter_read",
  FrostmawKeeper = "frostmaw_keeper",
  FrostmawKeeperCoexist = "frostmaw_keeper_coexist",
  FrostmawKeeperDriveout = "frostmaw_keeper_driveout",
}

export const STORY_BEAT_ID_VALUES = Object.values(StoryBeatId);
