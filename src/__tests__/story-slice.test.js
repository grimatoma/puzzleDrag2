import { describe, it, expect } from "vitest";
import {
  INITIAL_STORY_STATE,
  STORY_BEATS,
  isBeatComplete,
  nextPendingBeat,
  beatLines,
} from "../story.js";

describe("2.1 — INITIAL_STORY_STATE", () => {
  it("story starts at act 1", () => {
    expect(INITIAL_STORY_STATE.act).toBe(1);
  });

  it("first beat is arrival", () => {
    expect(INITIAL_STORY_STATE.beat).toBe("act1_arrival");
  });

  it("no flags set initially", () => {
    expect(Object.keys(INITIAL_STORY_STATE.flags).length).toBe(0);
  });
});

describe("2.1 — STORY_BEATS shape", () => {
  it("at least 9 beats across 3 acts", () => {
    expect(STORY_BEATS.length).toBeGreaterThanOrEqual(9);
  });

  it("every beat has required fields", () => {
    for (const b of STORY_BEATS) {
      expect(b.id, `beat ${b.id} missing id`).toBeTruthy();
      expect(b.act, `beat ${b.id} missing act`).toBeTruthy();
      expect(b.title, `beat ${b.id} missing title`).toBeTruthy();
      // A beat carries content either as a legacy `body` string or as the
      // newer `lines[]` form — `beatLines` normalises both.
      expect(beatLines(b).length, `beat ${b.id} has no dialogue lines`).toBeGreaterThan(0);
      expect(b.trigger, `beat ${b.id} missing trigger`).toBeTruthy();
    }
  });

  it("act 1 has at least 3 beats", () => {
    expect(STORY_BEATS.filter((b) => b.act === 1).length).toBeGreaterThanOrEqual(3);
  });

  it("act 3 has at least 3 beats", () => {
    expect(STORY_BEATS.filter((b) => b.act === 3).length).toBeGreaterThanOrEqual(3);
  });
});

describe("2.1 — isBeatComplete", () => {
  it("completed beat detected via flag", () => {
    const s = { ...INITIAL_STORY_STATE, flags: { hearth_lit: true } };
    expect(isBeatComplete(s, "act1_light_hearth")).toBe(true);
  });

  it("incomplete beat returns false", () => {
    expect(isBeatComplete(INITIAL_STORY_STATE, "act1_light_hearth")).toBe(false);
  });

  it("unknown beatId returns false", () => {
    expect(isBeatComplete(INITIAL_STORY_STATE, "nonexistent_beat")).toBe(false);
  });
});

describe("2.1 — nextPendingBeat", () => {
  it("next pending skips completed beats", () => {
    const s = { ...INITIAL_STORY_STATE, flags: { hearth_lit: true } };
    const next = nextPendingBeat(s);
    expect(next.id).not.toBe("act1_light_hearth");
  });

  it("returns the first uncompleted beat in act order", () => {
    // Fresh state should return the arrival beat
    const next = nextPendingBeat(INITIAL_STORY_STATE);
    expect(next.id).toBe("act1_arrival");
  });

  it("does not return beats from higher acts than current act", () => {
    // Act 1 state should not return act 2 or 3 beats
    const next = nextPendingBeat(INITIAL_STORY_STATE);
    expect(next.act).toBe(1);
  });
});
