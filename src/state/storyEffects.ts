import { INITIAL_STORY_STATE, evaluateStoryTriggers, evaluateSideBeats } from "../story.js";
import { applyFlagTriggersWithResult } from "../flags.js";
import * as storySlice from "../features/story/slice.js";
import * as boss from "../features/boss/slice.js";
import { zoneInventory, inventoryZone } from "./zoneInventory.js";
import type { GameState } from "../types/state.js";

/** Event payload accepted by the story-beat evaluator. Shape is event-type dependent. */
export interface StoryEvent {
  type: string;
  [extra: string]: unknown;
}

function tickStoryRepeatCooldowns(state: GameState): GameState {
  const story = state.story as { repeatCooldowns?: Record<string, unknown>; [k: string]: unknown } | undefined;
  const cooldowns = story?.repeatCooldowns;
  if (!cooldowns || typeof cooldowns !== "object" || Object.keys(cooldowns).length === 0) return state;

  const nextCooldowns: Record<string, number> = {};
  for (const [id, raw] of Object.entries(cooldowns)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 1) nextCooldowns[id] = Math.trunc(n) - 1;
  }

  const nextStory: Record<string, unknown> = { ...story };
  if (Object.keys(nextCooldowns).length > 0) nextStory.repeatCooldowns = nextCooldowns;
  else delete nextStory.repeatCooldowns;
  return { ...state, story: nextStory };
}

export function evaluateAndApplyStoryBeat(state: GameState, event: StoryEvent): GameState {
  let next = tickStoryRepeatCooldowns(state);
  const actBefore = next.story?.act;
  const totals = zoneInventory(next) as Record<string, number>;
  const baseStory = (next.story ?? { ...INITIAL_STORY_STATE, flags: {} }) as Parameters<typeof evaluateStoryTriggers>[0];
  const result = evaluateStoryTriggers(baseStory, event, totals);
  if (result) next = storySlice.reduce(next, { type: "STORY/BEAT_FIRED", payload: result });
  if (next.pendingBossKey) {
    const bossKey = next.pendingBossKey;
    const { pendingBossKey: _omit, ...withoutPendingBoss } = next;
    next = boss.reduce(withoutPendingBoss as GameState, {
      type: "BOSS/TRIGGER",
      bossKey,
    });
  }
  const actAfter = next.story?.act;
  if (result && actAfter !== actBefore) {
    next = evaluateAndApplyStoryBeat(next, { type: "act_entered", act: actAfter });
  }
  const sideResult = evaluateSideBeats(next, event);
  if (sideResult) next = storySlice.reduce(next, { type: "STORY/BEAT_FIRED", payload: sideResult });

  const flagResult = applyFlagTriggersWithResult(next, event);
  next = flagResult.state;
  if (flagResult.changed) {
    const storyForFlag = (next.story ?? { ...INITIAL_STORY_STATE, flags: {} }) as Parameters<typeof evaluateStoryTriggers>[0];
    const storyFlagResult = evaluateStoryTriggers(storyForFlag, event, zoneInventory(next) as Record<string, number>, { onlyFlagConditions: true });
    if (storyFlagResult) next = storySlice.reduce(next, { type: "STORY/BEAT_FIRED", payload: storyFlagResult });
    const sideFlagResult = evaluateSideBeats(next, event, { onlyFlagConditions: true });
    if (sideFlagResult) next = storySlice.reduce(next, { type: "STORY/BEAT_FIRED", payload: sideFlagResult });
  }
  return next;
}

export function maybeFireResourceBeats(stateAfter: GameState, stateBefore: GameState): GameState {
  const zone = inventoryZone(stateAfter);
  const inv = zoneInventory(stateAfter, zone) as Record<string, number>;
  const prevInv = zoneInventory(stateBefore, zone) as Record<string, number>;
  const keys = Object.keys(inv);
  let next = stateAfter;
  for (const key of keys) {
    const nowAmt = inv[key] || 0;
    const wasAmt = prevInv[key] || 0;
    if (nowAmt > wasAmt) {
      next = evaluateAndApplyStoryBeat(next, { type: "resource_total", key, amount: nowAmt });
    }
  }
  next = evaluateAndApplyStoryBeat(next, { type: "resource_total_multi" });
  return next;
}
