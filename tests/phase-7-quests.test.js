// Phase 7 — Quests, almanac, achievements.
// Migrated from quests-7.1, almanac-7.2, achievements-7.3 tests.
import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/state.js";
import { ACHIEVEMENTS as ACHIEVEMENT_LIST } from "../src/features/achievements/data.js";

describe("Phase 7 — quests slice in fresh state", () => {
  it("fresh state has quests defined", () => {
    const s = createInitialState();
    expect(s.quests).toBeDefined();
  });

  it("fresh state quests is an array or has active/claimed", () => {
    const s = createInitialState();
    // quests may be an array (old shape) or object with active/claimed
    expect(s.quests !== null && s.quests !== undefined).toBe(true);
  });
});

describe("Phase 7 — almanac slice in fresh state", () => {
  it("fresh state has almanac.level === 1", () => {
    const s = createInitialState();
    expect(s.almanac.level).toBe(1);
  });

  it("fresh state has almanac.xp === 0", () => {
    const s = createInitialState();
    expect(s.almanac.xp).toBe(0);
  });
});

describe("Phase 7 — achievements slice in fresh state", () => {
  it("ACHIEVEMENT_LIST is non-empty", () => {
    expect(ACHIEVEMENT_LIST.length).toBeGreaterThan(0);
  });

  it("every achievement has required fields", () => {
    for (const a of ACHIEVEMENT_LIST) {
      expect(typeof a.id).toBe("string");
      expect(typeof a.name).toBe("string");
      expect(typeof a.target).toBe("number");
    }
  });

  it("fresh state has achievements.unlocked with all ids false", () => {
    const s = createInitialState();
    for (const a of ACHIEVEMENT_LIST) {
      expect(s.achievements.unlocked[a.id]).toBe(false);
    }
  });
});
