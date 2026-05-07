// Phase 2 — Story slice: initial state, beats shape, triggers.
// Migrated from story-slice.test.js, story-triggers.test.js, story-roster.test.js.
import { describe, it, expect } from "vitest";
import {
  INITIAL_STORY_STATE,
  STORY_BEATS,
} from "../src/story.js";
import { createInitialState } from "../src/state.js";

describe("Phase 2 — INITIAL_STORY_STATE", () => {
  it("story starts at act 1", () => expect(INITIAL_STORY_STATE.act).toBe(1));
  it("first beat is act1_arrival", () => expect(INITIAL_STORY_STATE.beat).toBe("act1_arrival"));
  it("no flags set initially", () => expect(Object.keys(INITIAL_STORY_STATE.flags).length).toBe(0));
});

describe("Phase 2 — STORY_BEATS shape", () => {
  it("at least 9 beats across 3 acts", () => expect(STORY_BEATS.length).toBeGreaterThanOrEqual(9));

  it("every beat has required fields", () => {
    for (const b of STORY_BEATS) {
      expect(b.id, `beat ${b.id} missing id`).toBeTruthy();
      expect(b.act, `beat ${b.id} missing act`).toBeGreaterThanOrEqual(1);
      expect(b.trigger, `beat ${b.id} missing trigger`).toBeTruthy();
    }
  });

  it("act1_arrival triggers on session_start", () => {
    const arrival = STORY_BEATS.find(b => b.id === "act1_arrival");
    expect(arrival).toBeDefined();
    expect(arrival.trigger.type).toBe("session_start");
  });
});

describe("Phase 2 — fresh state story", () => {
  it("fresh state has story at act 1, beat act1_arrival", () => {
    const s = createInitialState();
    expect(s.story.act).toBe(1);
    expect(s.story.beat).toBe("act1_arrival");
  });

  it("fresh state has no story flags", () => {
    const s = createInitialState();
    expect(Object.keys(s.story.flags).length).toBe(0);
  });
});
