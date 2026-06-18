// The write-back loop proof: an authored `/story/` edit (a draft.story override)
// must reach the in-game StoryModal — i.e. land in `state.story.queuedBeat` — when
// the triggering event fires, proven through the real runtime evaluator + reducer.
// Before this PR `applyStoryOverrides` was vaporware and this path was dead.

import { describe, it, expect, afterEach } from "vitest";
import { setStoryOverrides } from "../story.js";
import { evaluateAndApplyStoryBeat } from "../state/storyEffects.js";
import { mergeTestState } from "../testUtils/testState.js";
import type { GameState } from "../types/state.js";

// Always restore the built-ins so injected overrides never leak between tests.
afterEach(() => setStoryOverrides(null));

/** Fresh act-1 state with no flags, so `act1_arrival` is the next pending beat. */
function freshAct1State(): GameState {
  const base = mergeTestState();
  return { ...base, story: { ...base.story, flags: {} } } as GameState;
}

describe("story write-back loop — authored edits reach state.story.queuedBeat", () => {
  it("a title + lines override on act1_arrival reaches the queued modal beat", () => {
    // Baseline: no override → the shipped built-in content fires.
    setStoryOverrides(null);
    const baseline = evaluateAndApplyStoryBeat(freshAct1State(), { type: "session_start" });
    expect(baseline.story.queuedBeat?.id).toBe("act1_arrival");
    expect(baseline.story.queuedBeat?.title).toBe("A Cold Hearth");

    // With an authored override → the edited content reaches the modal queue.
    setStoryOverrides({
      beats: {
        act1_arrival: {
          title: "WRITEBACK OK",
          lines: [{ speaker: "wren", text: "Edited in the Story Editor." }],
        },
      },
    });
    const overridden = evaluateAndApplyStoryBeat(freshAct1State(), { type: "session_start" });
    expect(overridden.story.queuedBeat?.id).toBe("act1_arrival");
    expect(overridden.story.queuedBeat?.title).toBe("WRITEBACK OK");
    expect(overridden.story.queuedBeat?.lines).toEqual([
      { speaker: "wren", text: "Edited in the Story Editor." },
    ]);
  });

  it("a re-authored when: condition controls whether the beat fires", () => {
    // Override act1_arrival's firing condition so session_start no longer matches.
    setStoryOverrides({
      beats: {
        act1_arrival: {
          when: { fact: "resource.tile_grass_grass.total", op: "gte", value: 9999 },
        },
      },
    });
    const noFire = evaluateAndApplyStoryBeat(freshAct1State(), { type: "session_start" });
    // The beat is gated behind an unreachable resource total, so nothing queues.
    expect(noFire.story.queuedBeat).toBeFalsy();
  });
});
