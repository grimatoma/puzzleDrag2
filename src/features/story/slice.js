// ─── Story feature slice ────────────────────────────────────────────────────
// Handles STORY/BEAT_FIRED and STORY/DISMISS_MODAL.
// Other slices (core) call evaluateStoryTriggers then dispatch STORY/BEAT_FIRED.

import { applyBeatResult, firedFlagKey } from "../../story.js";
import { tickAchievement } from "../achievements/data.js";

export const initial = {
  // story state is initialised in src/state.js initialState() as:
  // story: { act, beat, flags, queuedBeat: null, beatQueue: [], sandbox: false }
  // This slice provides the initial value contribution via the `initial` key below.
  // (state.js spreads this after its own story init, but story is handled entirely there)
};

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

    case "STORY/DISMISS_MODAL": {
      const queue = state.story?.beatQueue ?? [];
      const next = queue.length > 0 ? queue[0] : null;
      const remaining = queue.slice(1);

      // Check for win: if we just dismissed the act3_win beat, enter sandbox
      const dismissedBeat = state.story?.queuedBeat;
      const sandbox = dismissedBeat?.id === "act3_win" ? true : (state.story?.sandbox ?? false);

      // Tick festival_won achievement when the harvest festival win beat is dismissed
      let afterDismiss = state;
      if (dismissedBeat?.id === "act3_win") {
        const { newState } = tickAchievement(state, "festival_won", 1);
        afterDismiss = newState;
      }

      return {
        ...afterDismiss,
        story: {
          ...afterDismiss.story,
          queuedBeat: next,
          beatQueue: remaining,
          sandbox,
        },
      };
    }

    case "DEV/RESET_GAME": {
      // story is fully reset by coreReducer; nothing extra needed here
      return state;
    }

    default:
      return state;
  }
}
