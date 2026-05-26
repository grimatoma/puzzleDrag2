// ─── Story feature slice ────────────────────────────────────────────────────
// Handles STORY/BEAT_FIRED, STORY/PICK_CHOICE, and STORY/DISMISS_MODAL.
// Other slices (core) call evaluateStoryTriggers then dispatch STORY/BEAT_FIRED.

import {
  applyBeatResult,
  firedFlagKey,
  beatChoices,
  beatIsContinueOnly,
  applyChoiceOutcome,
} from "../../story.js";
import type { Beat, BeatSideEffects, ChoiceOutcome } from "../../story.js";
import { tickAchievement } from "../achievements/data.js";
import type { Action, GameState } from "../../types/state.js";

interface StorySubstate {
  beatQueue?: unknown[];
  queuedBeat?: { id?: string; [k: string]: unknown } | null;
  sandbox?: boolean;
  flags?: Record<string, boolean>;
  choiceLog?: unknown[];
  repeatCooldowns?: Record<string, unknown>;
  [k: string]: unknown;
}

interface ChoiceLogEntry {
  beatId: string;
  choiceId: string;
  ts: number;
  value?: unknown;
}

export const initial = {
  // story state is initialised in src/state.js initialState() — see
  // INITIAL_STORY_STATE in src/story.js (act, beat, flags, choiceLog) plus the
  // volatile queuedBeat / beatQueue / sandbox added there. This slice
  // contributes no extra keys; the empty object keeps the compose loop happy.
};

/**
 * Pops the current modal off the story queue. Shared by DISMISS_MODAL and
 * PICK_CHOICE. Handles the win → sandbox transition and the festival_won
 * achievement tick. Returns the new game state.
 */
function dismissCurrentModal(state: GameState): GameState {
  const story = (state.story ?? {}) as StorySubstate;
  const queue = story.beatQueue ?? [];
  const nextBeat = queue.length > 0 ? queue[0] : null;
  const remaining = queue.slice(1);

  const dismissedBeat = story.queuedBeat;
  const sandbox = dismissedBeat?.id === "act3_win" ? true : (story.sandbox ?? false);

  let after: GameState = state;
  if (dismissedBeat?.id === "act3_win") {
    const { newState } = tickAchievement(state, "festival_won", 1) as { newState: GameState };
    after = newState;
  }

  const afterStory = (after.story ?? {}) as StorySubstate;
  return {
    ...after,
    story: {
      ...afterStory,
      queuedBeat: nextBeat,
      beatQueue: remaining,
      sandbox,
    },
  };
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "STORY/BEAT_FIRED": {
      const { firedBeat, newFlags, sideEffects, repeatCooldown } = action.payload;
      const beat = firedBeat as Beat;

      // Update story state: advance flags and mark beat complete
      const flagKey = beat.onComplete?.setFlag;
      const completionFlags: Record<string, boolean> = { ...newFlags };
      if (!flagKey && !beat.repeat) {
        completionFlags[firedFlagKey(beat.id)] = true;
      }

      // Apply side effects to the rest of game state
      const afterSideEffects = applyBeatResult(state, sideEffects as BeatSideEffects) as GameState;

      // Queue the modal (or chain to existing queue)
      const story = (state.story ?? {}) as StorySubstate;
      const existingQueue = story.beatQueue ?? [];
      const isModalOpen = !!story.queuedBeat;

      const afterStory = (afterSideEffects.story ?? {}) as StorySubstate;
      const newStory: StorySubstate = {
        ...afterStory,
        flags: completionFlags,
        queuedBeat: isModalOpen ? story.queuedBeat : beat,
        beatQueue: isModalOpen ? [...existingQueue, beat] : existingQueue,
      };
      if (repeatCooldown) {
        newStory.repeatCooldowns = { ...(newStory.repeatCooldowns || {}), [beat.id]: repeatCooldown };
      }

      return { ...afterSideEffects, story: newStory };
    }

    case "STORY/PICK_CHOICE": {
      const story = (state.story ?? {}) as StorySubstate;
      const beat = story.queuedBeat as Beat | null | undefined;
      if (!beat) return state;
      const choiceId = action.payload?.choiceId ?? action.choiceId;
      const choice = beatChoices(beat).find((c: { id: string }) => c.id === choiceId) as { id: string; outcome: ChoiceOutcome } | undefined;
      if (!choice) return state;
      // `value` is optional free-text supplied by prompt-style beats (e.g. the
      // settlement name) so the finale can read it back from the log.
      const value = action.payload?.value ?? action.value;

      // Record the choice for the finale's "the Ember reads your record".
      const entry: ChoiceLogEntry = { beatId: beat.id, choiceId: choice.id, ts: Date.now() };
      if (value !== undefined) entry.value = value;
      const choiceLog = [...(story.choiceLog ?? []), entry];

      // Apply the choice's outcome (flags / bonds / resources / queued beat),
      // then dismiss the current modal.
      const afterOutcome = applyChoiceOutcome(state, choice.outcome) as GameState;
      const afterDismiss = dismissCurrentModal(afterOutcome);
      const afterStory = (afterDismiss.story ?? {}) as StorySubstate;
      return { ...afterDismiss, story: { ...afterStory, choiceLog } };
    }

    case "STORY/DISMISS_MODAL": {
      // ESC / backdrop dismissal — only for continue-only beats with no prompt
      // (a real choice, or an input prompt, needs an explicit submit).
      const story = (state.story ?? {}) as StorySubstate;
      const beat = story.queuedBeat as Beat | null | undefined;
      if (beat && (beat.prompt || !beatIsContinueOnly(beat))) return state;
      // Record it as the implicit "continue" pick so the log stays consistent.
      const choiceLog = [
        ...(story.choiceLog ?? []),
        ...(beat ? [{ beatId: beat.id, choiceId: "continue", ts: Date.now() }] : []),
      ];
      const afterDismiss = dismissCurrentModal(state);
      const afterStory = (afterDismiss.story ?? {}) as StorySubstate;
      return { ...afterDismiss, story: { ...afterStory, choiceLog } };
    }

    case "DEV/RESET_GAME": {
      // story is fully reset by coreReducer; nothing extra needed here
      return state;
    }

    default:
      return state;
  }
}
