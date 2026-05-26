import { describe, it, expect } from "vitest";
import { ACTION_TYPES, type ActionType } from "../types/actions.js";

/** Slice routing sets in state.ts — must stay in sync with ACTION_TYPES. */
const SLICE_PRIMARY: ActionType[] = [
  "WORKERS/HIRE",
  "WORKERS/FIRE",
  "BUILD_DECORATION",
  "SUMMON_MAGIC_TOOL",
  "MARKET/SELL",
  "QUESTS/CLAIM_QUEST",
  "QUESTS/CLAIM_ALMANAC",
  "QUESTS/PROGRESS_QUEST",
  "BOSS/TRIGGER",
  "BOSS/RESOLVE",
  "BOSS/REJECT",
  "BOSS/MINIMIZE",
  "BOSS/EXPAND",
  "BOSS/CLOSE",
  "CARTO/TRAVEL",
  "STORY/DISMISS_MODAL",
  "STORY/PICK_CHOICE",
  "CRAFTING/QUEUE_RECIPE",
  "CRAFTING/CLAIM_CRAFT",
  "CRAFTING/SKIP_CRAFT",
  "SETTINGS/SET_TAB",
  "SETTINGS/OPEN_DEBUG",
  "SETTINGS/LEAVE_BOARD",
  "SETTINGS/TOGGLE",
  "SETTINGS/RESET_SAVE",
  "SETTINGS/SHOW_TUTORIAL",
  "TUTORIAL/START",
  "TUTORIAL/NEXT",
  "TUTORIAL/PREV",
  "TUTORIAL/SKIP",
  "CASTLE/CONTRIBUTE",
  "FISH/FORCE_TIDE_FLIP",
  "BOON/PURCHASE",
  "RUN_SUMMARY/OPEN",
  "RUN_SUMMARY/CLOSE",
];

const ALWAYS_RUN: ActionType[] = ["CRAFTING/CRAFT_RECIPE", "USE_TOOL"];

const KNOWN = new Set<ActionType>(ACTION_TYPES);

describe("ACTION_TYPES catalog", () => {
  it("includes every slice-primary and always-run action", () => {
    for (const t of [...SLICE_PRIMARY, ...ALWAYS_RUN]) {
      expect(KNOWN.has(t), `missing ActionType: ${t}`).toBe(true);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(ACTION_TYPES).size).toBe(ACTION_TYPES.length);
  });
});
