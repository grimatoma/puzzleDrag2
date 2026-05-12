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
import { tickAchievement } from "../achievements/data.js";

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
function dismissCurrentModal(state) {
  const queue = state.story?.beatQueue ?? [];
  const nextBeat = queue.length > 0 ? queue[0] : null;
  const remaining = queue.slice(1);

  const dismissedBeat = state.story?.queuedBeat;
  const sandbox = dismissedBeat?.id === "act3_win" ? true : (state.story?.sandbox ?? false);

  let after = state;
  if (dismissedBeat?.id === "act3_win") {
    const { newState } = tickAchievement(state, "festival_won", 1);
    after = newState;
  }

  return {
    ...after,
    story: {
      ...after.story,
      queuedBeat: nextBeat,
      beatQueue: remaining,
      sandbox,
    },
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case "STORY/BEAT_FIRED": {
      const { firedBeat, newFlags, sideEffects } = action.payload;

      // Update story state: advance flags and mark beat complete
      const flagKey = firedBeat.onComplete?.setFlag;
      const completionFlags = { ...newFlags };
      if (!flagKey) {
        completionFlags[firedFlagKey(firedBeat.id)] = true;
      }

      // Apply side effects to the rest of game state
      const afterSideEffects = applyBeatResult(state, sideEffects);

      // Queue the modal (or chain to existing queue)
      const existingQueue = state.story?.beatQueue ?? [];
      const isModalOpen = !!state.story?.queuedBeat;

      const newStory = {
        ...afterSideEffects.story,
        flags: completionFlags,
        queuedBeat: isModalOpen ? state.story.queuedBeat : firedBeat,
        beatQueue: isModalOpen ? [...existingQueue, firedBeat] : existingQueue,
      };

      return { ...afterSideEffects, story: newStory };
    }

    case "STORY/PICK_CHOICE": {
      const beat = state.story?.queuedBeat;
      if (!beat) return state;
      const choiceId = action.payload?.choiceId ?? action.choiceId;
      const choice = beatChoices(beat).find((c) => c.id === choiceId);
      if (!choice) return state;

      // Record the choice for the finale's "the Ember reads your record".
      const choiceLog = [
        ...(state.story?.choiceLog ?? []),
        { beatId: beat.id, choiceId: choice.id, ts: Date.now() },
      ];

      // Apply the choice's outcome (flags / bonds / resources / queued beat),
      // then dismiss the current modal.
      const afterOutcome = applyChoiceOutcome(state, choice.outcome);
      const afterDismiss = dismissCurrentModal(afterOutcome);
      return { ...afterDismiss, story: { ...afterDismiss.story, choiceLog } };
    }

    case "STORY/DISMISS_MODAL": {
      // ESC / backdrop dismissal — only honoured for continue-only beats.
      const beat = state.story?.queuedBeat;
      if (beat && !beatIsContinueOnly(beat)) return state;
      // Record it as the implicit "continue" pick so the log stays consistent.
      const choiceLog = [
        ...(state.story?.choiceLog ?? []),
        ...(beat ? [{ beatId: beat.id, choiceId: "continue", ts: Date.now() }] : []),
      ];
      const afterDismiss = dismissCurrentModal(state);
      return { ...afterDismiss, story: { ...afterDismiss.story, choiceLog } };
    }

    case "DEV/RESET_GAME": {
      // story is fully reset by coreReducer; nothing extra needed here
      return state;
    }

    default:
      return state;
  }
}
