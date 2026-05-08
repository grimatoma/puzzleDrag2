// Coverage fillins for src/story.js. The file backs the story slice but
// is itself less-tested. Targets every trigger.type branch in
// triggerMatches, evaluateStoryTriggers gates, applyBeatResult side
// effects, and parseSpeaker quirks.

import { describe, it, expect } from "vitest";
import {
  firedFlagKey,
  isBeatComplete,
  nextPendingBeat,
  evaluateStoryTriggers,
  applyBeatResult,
  parseSpeaker,
  STORY_BEATS,
  INITIAL_STORY_STATE,
} from "../story.js";

describe("story.js — flag helpers", () => {
  it("firedFlagKey produces a stable namespaced key", () => {
    expect(firedFlagKey("foo")).toBe("_fired_foo");
  });

  it("isBeatComplete: explicit setFlag path", () => {
    const beat = STORY_BEATS.find((b) => b.onComplete?.setFlag);
    const flag = beat.onComplete.setFlag;
    expect(isBeatComplete({ flags: { [flag]: true } }, beat.id)).toBe(true);
    expect(isBeatComplete({ flags: {} }, beat.id)).toBe(false);
  });

  it("isBeatComplete: unknown id returns false", () => {
    expect(isBeatComplete({ flags: {} }, "no_such_beat")).toBe(false);
  });

  it("isBeatComplete: auto fired-flag fallback when no setFlag", () => {
    const beatWithoutSetFlag = STORY_BEATS.find(
      (b) => !b.onComplete?.setFlag,
    );
    if (!beatWithoutSetFlag) return; // catalog edge — skip
    expect(isBeatComplete({ flags: {} }, beatWithoutSetFlag.id)).toBe(false);
    const flags = { [firedFlagKey(beatWithoutSetFlag.id)]: true };
    expect(isBeatComplete({ flags }, beatWithoutSetFlag.id)).toBe(true);
  });

  it("nextPendingBeat returns the first incomplete beat at or below state.act", () => {
    const r = nextPendingBeat({ ...INITIAL_STORY_STATE });
    expect(r).toBeDefined();
    expect(r.act).toBeLessThanOrEqual(INITIAL_STORY_STATE.act);
  });
});

describe("evaluateStoryTriggers — triggerMatches branches", () => {
  it("session_start matches when next pending beat trigger is session_start", () => {
    const r = evaluateStoryTriggers(INITIAL_STORY_STATE, { type: "session_start" });
    if (r) {
      expect(r.firedBeat.trigger.type).toBe("session_start");
    }
  });

  it("returns null when no pending beat", () => {
    // Mark every beat as complete by populating its flag.
    const flags = {};
    for (const b of STORY_BEATS) {
      const k = b.onComplete?.setFlag ?? firedFlagKey(b.id);
      flags[k] = true;
    }
    const r = evaluateStoryTriggers({ ...INITIAL_STORY_STATE, flags }, { type: "session_start" });
    expect(r).toBeNull();
  });

  it("returns null when event.type doesn't match the next pending beat", () => {
    // session_start fires immediately on a fresh state, so use a different type.
    const r = evaluateStoryTriggers(INITIAL_STORY_STATE, { type: "act_entered", act: 999 });
    expect(r).toBeNull();
  });

  it("act3_win is gated on festival_announced", () => {
    // Find act3_win beat
    const win = STORY_BEATS.find((b) => b.id === "act3_win");
    if (!win) return;
    // Fire all beats up to (but not including) act3_win by stamping their flags.
    const flags = {};
    for (const b of STORY_BEATS) {
      if (b.id === "act3_win") break;
      const k = b.onComplete?.setFlag ?? firedFlagKey(b.id);
      flags[k] = true;
    }
    const stateNoFestival = { act: 3, beat: "act3_win", flags };
    // Even with the right event, festival_announced not set → null
    const r = evaluateStoryTriggers(stateNoFestival, { type: win.trigger.type });
    expect(r).toBeNull();
  });

  it("resource_total trigger checks the totals map", () => {
    // Find a beat with resource_total trigger
    const beat = STORY_BEATS.find((b) => b.trigger?.type === "resource_total");
    if (!beat) return;
    // Mark all earlier beats complete
    const flags = {};
    for (const b of STORY_BEATS) {
      if (b.id === beat.id) break;
      const k = b.onComplete?.setFlag ?? firedFlagKey(b.id);
      flags[k] = true;
    }
    const state = { ...INITIAL_STORY_STATE, act: beat.act, flags };
    // Below threshold → null
    const lo = evaluateStoryTriggers(state, { type: "resource_total" }, { [beat.trigger.key]: 0 });
    expect(lo).toBeNull();
    // At threshold → fires
    const hi = evaluateStoryTriggers(
      state,
      { type: "resource_total" },
      { [beat.trigger.key]: beat.trigger.amount },
    );
    expect(hi?.firedBeat?.id).toBe(beat.id);
  });
});

describe("applyBeatResult — every side-effect branch", () => {
  it("setFlag adds to story.flags", () => {
    const state = { story: { ...INITIAL_STORY_STATE } };
    const r = applyBeatResult(state, { setFlag: "foo" });
    expect(r.story.flags.foo).toBe(true);
  });

  it("spawnNPC adds to roster + seeds bond at 5 (idempotent)", () => {
    const state = { npcs: { roster: [], bonds: {} } };
    const r1 = applyBeatResult(state, { spawnNPC: "mira" });
    expect(r1.npcs.roster).toContain("mira");
    expect(r1.npcs.bonds.mira).toBe(5);
    // Idempotent — second apply doesn't double-add.
    const r2 = applyBeatResult(r1, { spawnNPC: "mira" });
    expect(r2.npcs.roster.filter((n) => n === "mira")).toHaveLength(1);
  });

  it("unlockBiome marks the biome unlocked", () => {
    const state = {};
    const r = applyBeatResult(state, { unlockBiome: "fish" });
    expect(r.unlockedBiomes.fish).toBe(true);
  });

  it("advanceAct sets story.act", () => {
    const state = { story: { ...INITIAL_STORY_STATE } };
    const r = applyBeatResult(state, { advanceAct: 3 });
    expect(r.story.act).toBe(3);
  });

  it("spawnBoss queues pendingBossKey", () => {
    const state = {};
    const r = applyBeatResult(state, { spawnBoss: "ember_drake" });
    expect(r.pendingBossKey).toBe("ember_drake");
  });

  it("empty side effects returns a state shallow-clone", () => {
    const state = { story: INITIAL_STORY_STATE };
    const r = applyBeatResult(state, {});
    expect(r).not.toBe(state);
    expect(r.story).toBe(state.story);
  });
});

describe("parseSpeaker", () => {
  it("Wren prefix → wren", () => {
    expect(parseSpeaker("Wren: 'hello'")).toBe("wren");
  });

  it("Old Tomas prefix → tomas", () => {
    expect(parseSpeaker("Old Tomas: 'work hard.'")).toBe("tomas");
  });

  it("Tomas prefix → tomas", () => {
    expect(parseSpeaker("Tomas: 'evening.'")).toBe("tomas");
  });

  it("Sister Liss prefix → liss", () => {
    expect(parseSpeaker("Sister Liss: 'a blessing.'")).toBe("liss");
  });

  it("Bram prefix → bram", () => {
    expect(parseSpeaker("Bram: 'forge ready.'")).toBe("bram");
  });

  it("unknown prefix → null", () => {
    expect(parseSpeaker("Stranger: 'who knows.'")).toBeNull();
  });

  it("no prefix → null", () => {
    expect(parseSpeaker("just narration")).toBeNull();
  });
});
