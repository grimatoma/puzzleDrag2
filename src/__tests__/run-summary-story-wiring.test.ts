import { describe, it, expect, beforeEach } from "vitest";
import { evaluateAndApplyStoryBeat } from "../state/storyEffects.js";
import { initialState } from "../state/init.js";
import { INITIAL_STORY_STATE } from "../story.js";

// Health review #3 — the run-summary "Story beats" recap was permanently empty.
// STORY/BEAT_FIRED was dispatched only into the story slice (via direct
// storySlice.reduce inside the evaluator), so it never reached the runSummary
// slice's reduce and runSummary.beatsTriggered stayed []. evaluateAndApplyStoryBeat
// now feeds the same action to BOTH slices.
//
// This guards the wiring at the INTEGRATION level on purpose: the runSummary
// slice unit test (run-summary-slice.test.ts) dispatches STORY/BEAT_FIRED
// straight into the slice and therefore passes even when the real story path is
// broken — only an end-to-end fire through the evaluator catches this class.
describe("run-summary ← story beat wiring (#3)", () => {
  beforeEach(() => global.localStorage.clear());

  // Position the story just before the hearth beat (mirrors story-triggers.test),
  // and stock the active zone so the resource_total trigger evaluates true.
  function readyForHearthBeat() {
    return {
      ...initialState(),
      story: {
        ...INITIAL_STORY_STATE,
        flags: { intro_seen: true, first_harvest: true },
        beat: "act1_light_hearth",
      },
      inventory: { home: { tile_grass_grass: 20 } },
    };
  }

  it("records a fired story beat into runSummary.beatsTriggered", () => {
    const s0 = readyForHearthBeat();
    expect(s0.runSummary.beatsTriggered).toEqual([]);

    const s1 = evaluateAndApplyStoryBeat(s0, {
      type: "resource_total",
      key: "tile_grass_grass",
      amount: 20,
    });

    expect(s1.runSummary.beatsTriggered.map((b) => b.id)).toContain("act1_light_hearth");
  });

  it("does not duplicate a beat already recorded (idempotent feed)", () => {
    const s1 = evaluateAndApplyStoryBeat(readyForHearthBeat(), {
      type: "resource_total",
      key: "tile_grass_grass",
      amount: 20,
    });
    const count = s1.runSummary.beatsTriggered.length;
    expect(count).toBeGreaterThan(0);

    // Re-fire the identical event against the post-beat state: runSummary dedupes
    // by beat id, so the recap entry count must not grow.
    const s2 = evaluateAndApplyStoryBeat(s1, {
      type: "resource_total",
      key: "tile_grass_grass",
      amount: 20,
    });
    expect(s2.runSummary.beatsTriggered.length).toBe(count);
  });
});
