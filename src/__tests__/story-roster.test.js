import { describe, it, expect, beforeEach } from "vitest";
import { initialState, gameReducer } from "../state.js";
import { applyBeatResult } from "../story.js";
import { STORY_BUILDING_IDS } from "../features/story/data.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

function freshState() {
  global.localStorage.clear();
  return initialState();
}

// ─── 2.4 — NPC roster ────────────────────────────────────────────────────────

describe("2.4 — initial NPC roster", () => {
  beforeEach(() => global.localStorage.clear());

  it("roster starts with exactly 1 NPC", () => {
    const state = freshState();
    expect(state.npcs.roster.length).toBe(1);
  });

  it("wren is the starting NPC", () => {
    const state = freshState();
    expect(state.npcs.roster[0]).toBe("wren");
  });
});

describe("2.4 — applyBeatResult: spawnNPC", () => {
  beforeEach(() => global.localStorage.clear());

  it("adds mira to roster", () => {
    const fresh = freshState();
    const next = applyBeatResult(fresh, { spawnNPC: "mira" });
    expect(next.npcs.roster).toContain("mira");
    expect(next.npcs.roster.length).toBe(2);
  });

  it("is idempotent — duplicate spawn ignored", () => {
    const fresh = freshState();
    const s1 = applyBeatResult(fresh, { spawnNPC: "mira" });
    const s2 = applyBeatResult(s1, { spawnNPC: "mira" });
    expect(s2.npcs.roster.length).toBe(2);
  });

  it("does not mutate original state", () => {
    const fresh = freshState();
    const rosterBefore = JSON.stringify(fresh.npcs.roster);
    applyBeatResult(fresh, { spawnNPC: "tomas" });
    expect(JSON.stringify(fresh.npcs.roster)).toBe(rosterBefore);
  });
});

describe("2.4 — applyBeatResult: story flags", () => {
  beforeEach(() => global.localStorage.clear());

  it("setFlag adds a flag to story.flags", () => {
    const fresh = freshState();
    const next = applyBeatResult(fresh, { setFlag: "hearth_lit" });
    expect(next.story.flags.hearth_lit).toBe(true);
  });

  it("setFlag is idempotent", () => {
    const fresh = freshState();
    const s1 = applyBeatResult(fresh, { setFlag: "hearth_lit" });
    const s2 = applyBeatResult(s1, { setFlag: "hearth_lit" });
    expect(s2.story.flags.hearth_lit).toBe(true);
  });
});

describe("2.4 — applyBeatResult: unlockBiome", () => {
  beforeEach(() => global.localStorage.clear());

  it("unlockBiome sets the biome flag", () => {
    const fresh = freshState();
    const next = applyBeatResult(fresh, { unlockBiome: "mine" });
    expect(next.unlockedBiomes?.mine).toBe(true);
  });
});

describe("2.4 — DEV/RESET_GAME clears story state", () => {
  beforeEach(() => global.localStorage.clear());

  it("resets story.flags to empty after reset", () => {
    const fresh = freshState();
    const withFlags = applyBeatResult(fresh, { setFlag: "hearth_lit" });
    // Simulate RESET via reducer
    const reset = gameReducer(withFlags, { type: "DEV/RESET_GAME" });
    expect(Object.keys(reset.story.flags).length).toBe(0);
  });

  it("resets story.act to 1 after reset", () => {
    const fresh = freshState();
    const advanced = { ...fresh, story: { ...fresh.story, act: 3 } };
    const reset = gameReducer(advanced, { type: "DEV/RESET_GAME" });
    expect(reset.story.act).toBe(1);
  });
});

// ─── 2.5 — STORY_BUILDING_IDS ────────────────────────────────────────────────

describe("2.5 — STORY_BUILDING_IDS", () => {
  it("exports exactly 8 building IDs", () => {
    expect(STORY_BUILDING_IDS.length).toBe(8);
  });

  it("contains all required story buildings", () => {
    const required = ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge", "caravan_post"];
    for (const id of required) {
      expect(STORY_BUILDING_IDS).toContain(id);
    }
  });
});
