// Phase 38 — post-calendar cleanup. Story content re-keyed off the deleted
// season_entered trigger, and the engine surface for atmospheric in-session
// season rotation.
import { describe, it, expect } from "vitest";
import {
  STORY_BEATS,
  evaluateStoryTriggers,
  firedFlagKey,
} from "../src/story.js";
import { rootReducer, createInitialState } from "../src/state.js";
import { seasonIndexInSession } from "../src/features/zones/data.js";

describe("Phase 38 — story beats no longer use the calendar", () => {
  it("no beat uses the deleted `season_entered` trigger", () => {
    const lingering = STORY_BEATS.filter((b) => b.trigger?.type === "season_entered");
    expect(lingering).toEqual([]);
  });

  it("act2_frostmaw is now keyed on a wood_log resource_total trigger", () => {
    const frostmaw = STORY_BEATS.find((b) => b.id === "act2_frostmaw");
    expect(frostmaw).toBeTruthy();
    expect(frostmaw.trigger.type).toBe("resource_total");
    expect(frostmaw.trigger.key).toBe("wood_log");
    expect(frostmaw.trigger.amount).toBeGreaterThanOrEqual(10);
  });

  it("act2_frostmaw fires once total wood_log gathered hits the threshold", () => {
    const frostmaw = STORY_BEATS.find((b) => b.id === "act2_frostmaw");
    const need = frostmaw.trigger.amount;
    // evaluateStoryTriggers walks the queue sequentially; fast-forward by
    // marking earlier beats as already fired so Frostmaw is the next pending.
    const flags = {};
    for (const b of STORY_BEATS) {
      if (b.id === "act2_frostmaw") break;
      const explicit = b.onComplete?.setFlag;
      flags[explicit ?? firedFlagKey(b.id)] = true;
    }
    const result = evaluateStoryTriggers(
      { flags, act: 2 },
      { type: "resource_total", key: "wood_log", amount: need },
      { wood_log: need },
    );
    expect(result?.firedBeat?.id).toBe("act2_frostmaw");
  });
});

describe("Phase 38 — atmospheric in-session season rotation", () => {
  it("seasonIndexInSession spans Spring (0) -> Winter (3) across a run", () => {
    expect(seasonIndexInSession(0, 16)).toBe(0);
    expect(seasonIndexInSession(4, 16)).toBe(1);
    expect(seasonIndexInSession(8, 16)).toBe(2);
    expect(seasonIndexInSession(12, 16)).toBe(3);
  });
});

describe("Phase 38 — CLOSE_SEASON resets the session", () => {
  it("dispatch CLOSE_SEASON resets turnsUsed and returns to town", () => {
    const s0 = { ...createInitialState(), modal: "season", turnsUsed: 8 };
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.turnsUsed).toBe(0);
    expect(s1.view).toBe("town");
  });
});
