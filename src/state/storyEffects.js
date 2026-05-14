import { INITIAL_STORY_STATE, evaluateStoryTriggers, evaluateSideBeats } from "../story.js";
import { applyFlagTriggersWithResult } from "../flags.js";
import * as storySlice from "../features/story/slice.js";
import * as boss from "../features/boss/slice.js";

function tickStoryRepeatCooldowns(state) {
  const cooldowns = state.story?.repeatCooldowns;
  if (!cooldowns || typeof cooldowns !== "object" || Object.keys(cooldowns).length === 0) return state;

  const nextCooldowns = {};
  for (const [id, raw] of Object.entries(cooldowns)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 1) nextCooldowns[id] = Math.trunc(n) - 1;
  }

  const nextStory = { ...state.story };
  if (Object.keys(nextCooldowns).length > 0) nextStory.repeatCooldowns = nextCooldowns;
  else delete nextStory.repeatCooldowns;
  return { ...state, story: nextStory };
}

export function evaluateAndApplyStoryBeat(state, event) {
  let next = tickStoryRepeatCooldowns(state);
  const actBefore = next.story?.act;
  const totals = next.inventory ?? {};
  const result = evaluateStoryTriggers(next.story ?? { ...INITIAL_STORY_STATE, flags: {} }, event, totals);
  if (result) next = storySlice.reduce(next, { type: "STORY/BEAT_FIRED", payload: result });
  if (next.pendingBossKey) {
    const bossKey = next.pendingBossKey;
    const withoutPendingBoss = { ...next };
    delete withoutPendingBoss.pendingBossKey;
    next = boss.reduce(withoutPendingBoss, { type: "BOSS/TRIGGER", bossKey });
  }
  if (result && next.story?.act !== actBefore) {
    next = evaluateAndApplyStoryBeat(next, { type: "act_entered", act: next.story?.act });
  }
  const sideResult = evaluateSideBeats(next, event);
  if (sideResult) next = storySlice.reduce(next, { type: "STORY/BEAT_FIRED", payload: sideResult });

  const flagResult = applyFlagTriggersWithResult(next, event);
  next = flagResult.state;
  if (flagResult.changed) {
    const storyFlagResult = evaluateStoryTriggers(next.story ?? { ...INITIAL_STORY_STATE, flags: {} }, event, next.inventory ?? {}, { onlyFlagConditions: true });
    if (storyFlagResult) next = storySlice.reduce(next, { type: "STORY/BEAT_FIRED", payload: storyFlagResult });
    const sideFlagResult = evaluateSideBeats(next, event, { onlyFlagConditions: true });
    if (sideFlagResult) next = storySlice.reduce(next, { type: "STORY/BEAT_FIRED", payload: sideFlagResult });
  }
  return next;
}

export function maybeFireResourceBeats(stateAfter, stateBefore) {
  const inv = stateAfter.inventory ?? {};
  const keys = Object.keys(inv);
  let next = stateAfter;
  for (const key of keys) {
    const nowAmt = inv[key] || 0;
    const wasAmt = (stateBefore.inventory?.[key]) || 0;
    if (nowAmt > wasAmt) {
      next = evaluateAndApplyStoryBeat(next, { type: "resource_total", key, amount: nowAmt });
    }
  }
  next = evaluateAndApplyStoryBeat(next, { type: "resource_total_multi" });
  return next;
}
